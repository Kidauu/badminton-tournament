import { describe, expect, it } from "vitest";
import { tournamentPhaseLabel } from "./tournamentPhase";
import { createInitialState } from "../state/tournamentReducer";
import type { TournamentState } from "../types/tournament";

function withParticipants(count: number): TournamentState {
  return {
    ...createInitialState(),
    participants: Array.from({ length: count }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` })),
  };
}

describe("tournamentPhaseLabel", () => {
  it("returns null before any participant is set", () => {
    expect(tournamentPhaseLabel(createInitialState())).toBeNull();
  });

  it("shows draw progress while teams are still forming", () => {
    const state = { ...withParticipants(14), teams: [{ id: "t1", seq: 1, playerAId: "p1", playerBId: "p2" }] };
    expect(tournamentPhaseLabel(state)).toBe("Undian · 1/7 tim");
  });

  it("falls back to 'Fase grup' once teams and groups are set but matches are unplayed", () => {
    const teams = Array.from({ length: 7 }, (_, i) => ({ id: `t${i + 1}`, seq: i + 1, playerAId: `p${i}`, playerBId: `p${i}` }));
    const groupAssignments = teams.map((t, i) => ({ teamId: t.id, groupId: i < 4 ? ("A" as const) : ("B" as const) }));
    const state: TournamentState = {
      ...withParticipants(14),
      teams,
      groupAssignments,
      matches: [{ id: "group-A-1-2", round: 1, stage: "group", groupId: "A", teamAId: "t1", teamBId: "t2", result: null, winnerTeamId: null }],
    };
    expect(tournamentPhaseLabel(state)).toBe("Fase grup");
  });

  it("reports 'Turnamen selesai' once every reachable match has a result", () => {
    const state: TournamentState = {
      ...withParticipants(4),
      teams: [
        { id: "t1", seq: 1, playerAId: "p1", playerBId: "p2" },
        { id: "t2", seq: 2, playerAId: "p3", playerBId: "p4" },
      ],
      groupAssignments: [{ teamId: "t1", groupId: "A" }, { teamId: "t2", groupId: "B" }],
      matches: [
        { id: "semifinal-1", round: 2, stage: "semifinal", teamAId: "t1", teamBId: null, result: "2-0", winnerTeamId: "t1", isBye: true },
        { id: "semifinal-2", round: 2, stage: "semifinal", teamAId: "t2", teamBId: null, result: "2-0", winnerTeamId: "t2", isBye: true },
        { id: "final", round: 3, stage: "final", teamAId: "t1", teamBId: "t2", result: "2-0", winnerTeamId: "t1" },
        { id: "third-place", round: 3, stage: "third_place", teamAId: null, teamBId: null, result: null, winnerTeamId: null },
      ],
    };
    expect(tournamentPhaseLabel(state)).toBe("Turnamen selesai");
  });
});
