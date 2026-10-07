import { describe, expect, it } from "vitest";
import { generateGroupTournament } from "../logic/schedule";
import type { Participant, Team, TournamentState } from "../types/tournament";
import { migrateState, tournamentReducer } from "./tournamentReducer";

function makeTeams(count: number): Team[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `t${index + 1}`,
    seq: index + 1,
    playerAId: `p${index * 2 + 1}`,
    playerBId: `p${index * 2 + 2}`,
  }));
}

const teams = makeTeams(7);
const groupAssignments = teams.map((team, index) => ({ teamId: team.id, groupId: index < 4 ? ("A" as const) : ("B" as const) }));
const participants: Participant[] = Array.from({ length: teams.length * 2 }, (_, i) => ({ id: `p${i + 1}`, name: `Peserta ${i + 1}` }));

function makeState(): TournamentState {
  const { matches, byes } = generateGroupTournament(teams, groupAssignments);
  return { participants, pendingPairs: [], teams, pendingGroupSlots: [], groupAssignments, manualGroupRankings: [], matches, byes };
}

describe("tournamentReducer group qualification", () => {
  it("replaces the current tournament through an imported backup state", () => {
    const imported = makeState();
    const result = tournamentReducer({ ...makeState(), teams: [] }, { type: "IMPORT_TOURNAMENT", state: imported });
    expect(result).toBe(imported);
  });

  it("seeds cross-group semifinals when every group fixture has a result", () => {
    let state = makeState();
    const results = [
      ["group-A-1-2", "t1"], ["group-A-1-3", "t1"], ["group-A-1-4", "t1"],
      ["group-A-2-3", "t2"], ["group-A-2-4", "t2"], ["group-A-3-4", "t3"],
      ["group-B-1-2", "t5"], ["group-B-1-3", "t5"], ["group-B-2-3", "t6"],
    ] as const;
    for (const [matchId, winnerTeamId] of results) {
      state = tournamentReducer(state, { type: "RECORD_RESULT", matchId, result: "2-0", winnerTeamId });
    }

    const semifinal1 = state.matches.find((match) => match.id === "semifinal-1")!;
    const semifinal2 = state.matches.find((match) => match.id === "semifinal-2")!;
    expect([semifinal1.teamAId, semifinal1.teamBId]).toEqual(["t1", "t6"]);
    expect([semifinal2.teamAId, semifinal2.teamBId]).toEqual(["t5", "t2"]);

    // Playing out both semifinals routes each loser into the third-place match.
    state = tournamentReducer(state, { type: "RECORD_RESULT", matchId: "semifinal-1", result: "2-0", winnerTeamId: "t1" });
    state = tournamentReducer(state, { type: "RECORD_RESULT", matchId: "semifinal-2", result: "2-0", winnerTeamId: "t5" });
    const thirdPlace = state.matches.find((match) => match.id === "third-place")!;
    expect([thirdPlace.teamAId, thirdPlace.teamBId]).toEqual(["t6", "t2"]);
    expect(thirdPlace.isBye).toBeFalsy();
    expect(thirdPlace.result).toBeNull();

    state = tournamentReducer(state, { type: "RECORD_RESULT", matchId: "third-place", result: "2-0", winnerTeamId: "t6" });
    expect(state.matches.find((match) => match.id === "third-place")!.winnerTeamId).toBe("t6");
  });

  it("advances a group's rank-1 team by walkover when the opposing group has no runner-up", () => {
    // 3 teams -> balanced split is Group A (t1, t2) and Group B (t3 alone).
    const smallTeams = makeTeams(3);
    const smallAssignments = smallTeams.map((team, index) => ({ teamId: team.id, groupId: index < 2 ? ("A" as const) : ("B" as const) }));
    const smallParticipants: Participant[] = Array.from({ length: 6 }, (_, i) => ({ id: `p${i + 1}`, name: `Peserta ${i + 1}` }));
    const { matches, byes } = generateGroupTournament(smallTeams, smallAssignments);
    let state: TournamentState = { participants: smallParticipants, pendingPairs: [], teams: smallTeams, pendingGroupSlots: [], groupAssignments: smallAssignments, manualGroupRankings: [], matches, byes };

    // Group A's only fixture; Group B has a single team and plays no fixtures.
    state = tournamentReducer(state, { type: "RECORD_RESULT", matchId: "group-A-1-2", result: "2-0", winnerTeamId: "t1" });

    const semifinal1 = state.matches.find((match) => match.id === "semifinal-1")!;
    const semifinal2 = state.matches.find((match) => match.id === "semifinal-2")!;
    const final = state.matches.find((match) => match.id === "final")!;

    // semifinal-1 = Group A rank 1 (t1) vs Group B rank 2 (none) -> bye for t1.
    expect(semifinal1.teamAId).toBe("t1");
    expect(semifinal1.teamBId).toBeNull();
    expect(semifinal1.isBye).toBe(true);
    expect(semifinal1.winnerTeamId).toBe("t1");
    expect(final.teamAId).toBe("t1");

    // semifinal-2 = Group B rank 1 (t3) vs Group A rank 2 (t2) -> a real match.
    expect([semifinal2.teamAId, semifinal2.teamBId]).toEqual(["t3", "t2"]);
    expect(semifinal2.isBye).toBeFalsy();

    expect(state.byes).toEqual([{ round: 2, teamId: "t1" }]);

    // semifinal-1 was a bye -> it has no loser, so the third-place match can
    // never get a second team. Once semifinal-2 (the only real semifinal) is
    // played, its loser should be awarded third place by walkover too.
    state = tournamentReducer(state, { type: "RECORD_RESULT", matchId: "semifinal-2", result: "2-0", winnerTeamId: "t3" });
    const thirdPlace = state.matches.find((match) => match.id === "third-place")!;
    expect(thirdPlace.teamAId).toBeNull();
    expect(thirdPlace.teamBId).toBe("t2");
    expect(thirdPlace.isBye).toBe(true);
    expect(thirdPlace.winnerTeamId).toBe("t2");
  });

  it("keeps semifinals closed until an unresolved group tie receives an admin ranking", () => {
    let state = makeState();
    const groupDraws = ["group-A-1-2", "group-A-1-3", "group-A-1-4", "group-A-2-3", "group-A-2-4", "group-A-3-4"];
    for (const matchId of groupDraws) {
      state = tournamentReducer(state, { type: "RECORD_RESULT", matchId, result: "1-1", winnerTeamId: null });
    }
    for (const [matchId, winnerTeamId] of [["group-B-1-2", "t5"], ["group-B-1-3", "t5"], ["group-B-2-3", "t6"]] as const) {
      state = tournamentReducer(state, { type: "RECORD_RESULT", matchId, result: "2-0", winnerTeamId });
    }

    expect(state.matches.find((match) => match.id === "semifinal-1")!.teamAId).toBeNull();
    expect(state.matches.find((match) => match.id === "semifinal-2")!.teamAId).toBeNull();

    state = tournamentReducer(state, { type: "SET_MANUAL_GROUP_RANKING", groupId: "A", teamIds: ["t3", "t1", "t2", "t4"] });
    const semifinal1 = state.matches.find((match) => match.id === "semifinal-1")!;
    const semifinal2 = state.matches.find((match) => match.id === "semifinal-2")!;
    expect([semifinal1.teamAId, semifinal1.teamBId]).toEqual(["t3", "t6"]);
    expect([semifinal2.teamAId, semifinal2.teamBId]).toEqual(["t5", "t1"]);
  });

  it("saves a 0-0 score reset by returning a group match to an unplayed state", () => {
    let state = makeState();
    state = tournamentReducer(state, { type: "RECORD_RESULT", matchId: "group-A-1-2", result: "2-0", winnerTeamId: "t1" });

    state = tournamentReducer(state, { type: "RESET_MATCH_SCORES", matchId: "group-A-1-2" });
    const resetMatch = state.matches.find((match) => match.id === "group-A-1-2")!;

    expect(resetMatch.result).toBeNull();
    expect(resetMatch.winnerTeamId).toBeNull();
    expect(resetMatch.setScores).toBeNull();
    expect(resetMatch.operationalStatus).toBe("scheduled");
  });

  it("clears the knockout bracket when a completed group match is reset", () => {
    let state = makeState();
    const results = [
      ["group-A-1-2", "t1"], ["group-A-1-3", "t1"], ["group-A-1-4", "t1"],
      ["group-A-2-3", "t2"], ["group-A-2-4", "t2"], ["group-A-3-4", "t3"],
      ["group-B-1-2", "t5"], ["group-B-1-3", "t5"], ["group-B-2-3", "t6"],
    ] as const;
    for (const [matchId, winnerTeamId] of results) {
      state = tournamentReducer(state, { type: "RECORD_RESULT", matchId, result: "2-0", winnerTeamId });
    }
    expect(state.matches.find((match) => match.id === "semifinal-1")!.teamAId).toBe("t1");

    state = tournamentReducer(state, { type: "RESET_MATCH_SCORES", matchId: "group-A-1-2" });

    expect(state.matches.filter((match) => match.stage !== "group").every((match) => (
      match.teamAId === null && match.teamBId === null && match.result === null && match.winnerTeamId === null
    ))).toBe(true);
  });

  it("migrateState backfills a third-place match onto a pre-existing tournament that predates the feature", () => {
    // Simulates data saved before the third-place playoff existed: semifinals
    // and final already decided, but no loserNextMatchId wiring and no
    // "third-place" match in the array at all.
    const { matches } = generateGroupTournament(teams, groupAssignments);
    const oldShapeMatches = matches
      .filter((match) => match.id !== "third-place")
      .map((match) => {
        if (match.id === "semifinal-1") return { ...match, teamAId: "t1", teamBId: "t6", result: "2-0" as const, winnerTeamId: "t1", loserNextMatchId: undefined, loserNextMatchSlot: undefined };
        if (match.id === "semifinal-2") return { ...match, teamAId: "t5", teamBId: "t2", result: "2-0" as const, winnerTeamId: "t5", loserNextMatchId: undefined, loserNextMatchSlot: undefined };
        if (match.id === "final") return { ...match, teamAId: "t1", teamBId: "t5", result: "2-0" as const, winnerTeamId: "t1" };
        return match;
      });
    const oldState: TournamentState = { participants, pendingPairs: [], teams, pendingGroupSlots: [], groupAssignments, manualGroupRankings: [], matches: oldShapeMatches, byes: [] };
    expect(oldState.matches.some((match) => match.id === "third-place")).toBe(false);

    const migrated = migrateState(oldState);
    const thirdPlace = migrated.matches.find((match) => match.id === "third-place");
    expect(thirdPlace).toBeTruthy();
    expect([thirdPlace!.teamAId, thirdPlace!.teamBId]).toEqual(["t6", "t2"]);
    expect(thirdPlace!.result).toBeNull();

    // Idempotent: migrating an already-migrated state changes nothing further.
    expect(migrateState(migrated)).toEqual(migrated);
  });
});
