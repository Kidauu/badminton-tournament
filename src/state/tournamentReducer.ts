import type { ByeEntry, Match, MatchOperationalStatus, MatchSetScores, Participant, SetResult, Team, TournamentState } from "../types/tournament";
import { pairsFromShuffled, shuffleParticipants } from "../logic/pairing";
import { generateGroupTournament } from "../logic/schedule";
import { computeStandings, teamsInGroup } from "../logic/standings";
import { outcomeFromScores } from "../logic/scoring";

export type TournamentAction =
  | { type: "SET_PARTICIPANTS"; names: string[] }
  | { type: "REVEAL_NEXT_TEAM" }
  | { type: "REVEAL_NEXT_GROUP" }
  | { type: "SET_MANUAL_GROUP_RANKING"; groupId: "A" | "B"; teamIds: string[] }
  | { type: "SET_MATCH_OPERATIONS"; matchId: string; court: string; scheduledAt: string; status: Exclude<MatchOperationalStatus, "completed"> }
  | { type: "RECORD_RESULT"; matchId: string; result: SetResult; winnerTeamId: string | null }
  | { type: "RECORD_SCORES"; matchId: string; setScores: MatchSetScores }
  | { type: "IMPORT_TOURNAMENT"; state: TournamentState }
  | { type: "RESET_TOURNAMENT" };

export function createInitialState(): TournamentState {
  return { participants: [], pendingPairs: [], teams: [], pendingGroupSlots: [], groupAssignments: [], manualGroupRankings: [], matches: [], byes: [] };
}

/** Splits teams into two groups as evenly as possible (sizes differ by at most 1). */
function shuffledGroupSlots(numTeams: number): ("A" | "B")[] {
  const sizeA = Math.ceil(numTeams / 2);
  const sizeB = numTeams - sizeA;
  const slots: ("A" | "B")[] = [...Array(sizeA).fill("A"), ...Array(sizeB).fill("B")];
  for (let i = slots.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  return slots;
}

/**
 * When a group is too small to produce a runner-up, its rank-1 team has no
 * one to face in its cross-group semifinal — that team advances to the final
 * by walkover instead. Mutates the semifinal/final matches in place.
 */
function resolveKnockoutByes(knockoutMatches: Match[]): ByeEntry[] {
  const byes: ByeEntry[] = [];
  const final = knockoutMatches.find((m) => m.id === "final");
  for (const match of knockoutMatches) {
    if (match.stage !== "semifinal") continue;
    const hasA = Boolean(match.teamAId);
    const hasB = Boolean(match.teamBId);
    if (hasA === hasB) continue;
    const winnerTeamId = (match.teamAId ?? match.teamBId)!;
    match.result = "2-0";
    match.winnerTeamId = winnerTeamId;
    match.isBye = true;
    match.operationalStatus = "completed";
    byes.push({ round: match.round, teamId: winnerTeamId });
    if (final && match.nextMatchId === final.id && match.nextMatchSlot) {
      if (match.nextMatchSlot === "A") final.teamAId = winnerTeamId;
      else final.teamBId = winnerTeamId;
    }
  }
  return byes;
}

/**
 * The third-place match is fed by the LOSER of each semifinal. If one
 * semifinal was itself a bye (no real loser), the other semifinal's loser
 * cannot ever be matched against anyone — award them third place by walkover
 * once both semifinals are settled (including by bye) and the slot is clearly
 * unreachable. Never resolves early while a real semifinal is still pending,
 * since that looks identical (one slot filled, one still null) mid-tournament.
 */
function resolveThirdPlaceBye(matches: Match[]): void {
  const thirdPlace = matches.find((m) => m.id === "third-place");
  if (!thirdPlace || thirdPlace.result) return;
  const semifinal1 = matches.find((m) => m.id === "semifinal-1");
  const semifinal2 = matches.find((m) => m.id === "semifinal-2");
  const settled = (m: Match | undefined) => !m || m.result !== null;
  if (!settled(semifinal1) || !settled(semifinal2)) return;

  const hasA = Boolean(thirdPlace.teamAId);
  const hasB = Boolean(thirdPlace.teamBId);
  if (hasA === hasB) return;
  const winnerTeamId = (thirdPlace.teamAId ?? thirdPlace.teamBId)!;
  thirdPlace.result = "2-0";
  thirdPlace.winnerTeamId = winnerTeamId;
  thirdPlace.isBye = true;
  thirdPlace.operationalStatus = "completed";
}

function orderedGroupTeamIds(
  state: TournamentState,
  groupMatches: Match[],
  groupId: "A" | "B",
  manualGroupRankings: TournamentState["manualGroupRankings"],
): string[] | null {
  const rows = computeStandings(teamsInGroup(state.teams, state.groupAssignments, groupId), groupMatches, groupId);
  const needsManualRanking = rows.some((row) => row.needsManualDraw);
  const savedRanking = manualGroupRankings.find((ranking) => ranking.groupId === groupId);
  if (!needsManualRanking) return rows.map((row) => row.teamId);
  if (!savedRanking || savedRanking.teamIds.length !== rows.length) return null;
  const expected = new Set(rows.map((row) => row.teamId));
  if (new Set(savedRanking.teamIds).size !== rows.length || savedRanking.teamIds.some((teamId) => !expected.has(teamId))) return null;
  return savedRanking.teamIds;
}

function seedKnockoutFromGroups(
  state: TournamentState,
  matches: Match[],
  manualGroupRankings: TournamentState["manualGroupRankings"],
): ByeEntry[] {
  const groupMatches = matches.filter((match) => match.stage === "group");
  if (!groupMatches.every((match) => match.result !== null)) return [];
  const groupA = orderedGroupTeamIds(state, groupMatches, "A", manualGroupRankings);
  const groupB = orderedGroupTeamIds(state, groupMatches, "B", manualGroupRankings);
  if (!groupA || !groupB) return [];

  const semifinal1 = matches.find((match) => match.id === "semifinal-1");
  const semifinal2 = matches.find((match) => match.id === "semifinal-2");
  if (!semifinal1 || !semifinal2) return [];
  semifinal1.teamAId = groupA[0] ?? null;
  semifinal1.teamBId = groupB[1] ?? null;
  semifinal2.teamAId = groupB[0] ?? null;
  semifinal2.teamBId = groupA[1] ?? null;
  const byes = resolveKnockoutByes(matches.filter((match) => match.stage !== "group"));
  resolveThirdPlaceBye(matches);
  return byes;
}

/**
 * Backfills the third-place playoff onto a tournament whose matches were
 * generated before that feature existed (loaded from localStorage or an
 * older backup file) — otherwise it has no "third-place" match and no
 * loserNextMatchId wiring on its semifinals, so the playoff can never appear.
 */
export function migrateState(state: TournamentState): TournamentState {
  const hasFinal = state.matches.some((m) => m.id === "final");
  const hasThirdPlace = state.matches.some((m) => m.id === "third-place");
  if (!hasFinal || hasThirdPlace) return state;

  const matches = state.matches.map((m) => ({ ...m }));
  const semifinal1 = matches.find((m) => m.id === "semifinal-1");
  const semifinal2 = matches.find((m) => m.id === "semifinal-2");
  if (semifinal1) {
    semifinal1.loserNextMatchId = "third-place";
    semifinal1.loserNextMatchSlot = "A";
  }
  if (semifinal2) {
    semifinal2.loserNextMatchId = "third-place";
    semifinal2.loserNextMatchSlot = "B";
  }

  function loserOf(m: Match | undefined): string | null {
    if (!m || m.isBye || !m.winnerTeamId || !m.teamAId || !m.teamBId) return null;
    return m.winnerTeamId === m.teamAId ? m.teamBId : m.teamAId;
  }

  matches.push({
    id: "third-place",
    round: 3,
    stage: "third_place",
    teamAId: loserOf(semifinal1),
    teamBId: loserOf(semifinal2),
    result: null,
    winnerTeamId: null,
    nextMatchId: null,
    nextMatchSlot: null,
  });
  resolveThirdPlaceBye(matches);
  return { ...state, matches };
}

export function tournamentReducer(state: TournamentState, action: TournamentAction): TournamentState {
  switch (action.type) {
    case "SET_PARTICIPANTS": {
      const participants: Participant[] = action.names.map((name) => ({
        id: crypto.randomUUID(),
        name,
      }));
      const shuffled = shuffleParticipants(participants);
      const pendingPairs = pairsFromShuffled(shuffled);
      return { participants, pendingPairs, teams: [], pendingGroupSlots: [], groupAssignments: [], manualGroupRankings: [], matches: [], byes: [] };
    }

    case "REVEAL_NEXT_TEAM": {
      if (state.pendingPairs.length === 0) return state;
      const [pair, ...rest] = state.pendingPairs;
      const newTeam: Team = {
        id: crypto.randomUUID(),
        seq: state.teams.length + 1,
        playerAId: pair[0],
        playerBId: pair[1],
      };
      const teams = [...state.teams, newTeam];

      const totalTeams = state.participants.length / 2;
      if (teams.length === totalTeams) {
        return { ...state, pendingPairs: rest, teams, pendingGroupSlots: shuffledGroupSlots(totalTeams) };
      }
      return { ...state, pendingPairs: rest, teams };
    }

    case "REVEAL_NEXT_GROUP": {
      if (state.pendingGroupSlots.length === 0 || state.groupAssignments.length >= state.teams.length) return state;
      const team = state.teams[state.groupAssignments.length];
      const [groupId, ...pendingGroupSlots] = state.pendingGroupSlots;
      const groupAssignments = [...state.groupAssignments, { teamId: team.id, groupId }];
      if (groupAssignments.length === state.teams.length) {
        const { matches, byes } = generateGroupTournament(state.teams, groupAssignments);
        return { ...state, pendingGroupSlots, groupAssignments, manualGroupRankings: [], matches, byes };
      }
      return { ...state, pendingGroupSlots, groupAssignments };
    }

    case "RECORD_RESULT":
    case "RECORD_SCORES": {
      const matchId = action.matchId;
      const match = state.matches.find((m) => m.id === matchId);
      if (!match) return state;
      if (!match.teamAId || !match.teamBId) return state;
      let result: SetResult;
      let winnerTeamId: string | null;
      let setScores: MatchSetScores | undefined;
      if (action.type === "RECORD_SCORES") {
        const outcome = outcomeFromScores(match.stage, action.setScores);
        if (!outcome) return state;
        result = outcome.result;
        winnerTeamId = outcome.winnerSide === "A" ? match.teamAId : outcome.winnerSide === "B" ? match.teamBId : null;
        setScores = action.setScores;
      } else {
        result = action.result;
        winnerTeamId = action.winnerTeamId;
      }
      if (match.stage === "group") {
        if (result !== "2-0" && result !== "1-1") return state;
        if (result === "2-0" && winnerTeamId !== match.teamAId && winnerTeamId !== match.teamBId) return state;
        if (result === "1-1" && winnerTeamId !== null) return state;

        const matches = state.matches.map((m) => (m.id === matchId ? { ...m, result, winnerTeamId, operationalStatus: "completed" as const, ...(setScores && { setScores }) } : { ...m }));
        const knockoutMatches = matches.filter((m) => m.stage !== "group");
        for (const knockoutMatch of knockoutMatches) {
          knockoutMatch.teamAId = null;
          knockoutMatch.teamBId = null;
          knockoutMatch.result = null;
          knockoutMatch.winnerTeamId = null;
          knockoutMatch.setScores = null;
          knockoutMatch.isBye = false;
          knockoutMatch.operationalStatus = "scheduled";
        }

        const manualGroupRankings: TournamentState["manualGroupRankings"] = [];
        const byes = seedKnockoutFromGroups(state, matches, manualGroupRankings);
        return { ...state, manualGroupRankings, matches, byes };
      }

      // Semifinal and final must have a single winner.
      if ((result !== "2-0" && result !== "2-1") || (winnerTeamId !== match.teamAId && winnerTeamId !== match.teamBId)) return state;

      const matches = state.matches.map((m) => ({ ...m }));
      const matchIndex = matches.findIndex((m) => m.id === matchId);
      if (matchIndex === -1) return state;

      // Editing an earlier result invalidates every already-played downstream
      // match (via either the winner's or the loser's bracket path), then the
      // newly selected winner/loser are advanced into their bracket slots.
      function clearTarget(target: Match | undefined): void {
        if (!target) return;
        if (target.result || target.winnerTeamId) {
          target.result = null;
          target.winnerTeamId = null;
          target.setScores = null;
          target.isBye = false;
          target.operationalStatus = "scheduled";
          clearDescendants(target);
        }
      }

      function clearDescendants(source: Match): void {
        if (source.nextMatchId && source.nextMatchSlot) {
          const target = matches.find((m) => m.id === source.nextMatchId);
          if (target) {
            if (source.nextMatchSlot === "A") target.teamAId = null;
            else target.teamBId = null;
            clearTarget(target);
          }
        }
        if (source.loserNextMatchId && source.loserNextMatchSlot) {
          const loserTarget = matches.find((m) => m.id === source.loserNextMatchId);
          if (loserTarget) {
            if (source.loserNextMatchSlot === "A") loserTarget.teamAId = null;
            else loserTarget.teamBId = null;
            clearTarget(loserTarget);
          }
        }
      }

      clearDescendants(matches[matchIndex]);
      matches[matchIndex] = { ...matches[matchIndex], result, winnerTeamId, operationalStatus: "completed", ...(setScores && { setScores }) };
      const updatedMatch = matches[matchIndex];
      if (updatedMatch.nextMatchId && updatedMatch.nextMatchSlot) {
        const target = matches.find((m) => m.id === updatedMatch.nextMatchId);
        if (target) {
          if (updatedMatch.nextMatchSlot === "A") target.teamAId = winnerTeamId;
          else target.teamBId = winnerTeamId;
        }
      }
      if (updatedMatch.loserNextMatchId && updatedMatch.loserNextMatchSlot) {
        const loserTeamId = winnerTeamId === updatedMatch.teamAId ? updatedMatch.teamBId : updatedMatch.teamAId;
        const loserTarget = matches.find((m) => m.id === updatedMatch.loserNextMatchId);
        if (loserTarget) {
          if (updatedMatch.loserNextMatchSlot === "A") loserTarget.teamAId = loserTeamId;
          else loserTarget.teamBId = loserTeamId;
        }
      }
      resolveThirdPlaceBye(matches);
      return { ...state, matches };
    }

    case "SET_MATCH_OPERATIONS": {
      const match = state.matches.find((item) => item.id === action.matchId);
      if (!match || match.result !== null || match.isBye) return state;
      const court = action.court.trim();
      return {
        ...state,
        matches: state.matches.map((item) => item.id === action.matchId ? {
          ...item,
          court,
          scheduledAt: action.scheduledAt,
          operationalStatus: action.status,
        } : item),
      };
    }

    case "SET_MANUAL_GROUP_RANKING": {
      const groupMatches = state.matches.filter((match) => match.stage === "group");
      if (!groupMatches.every((match) => match.result !== null)) return state;
      const rows = computeStandings(teamsInGroup(state.teams, state.groupAssignments, action.groupId), groupMatches, action.groupId);
      if (!rows.some((row) => row.needsManualDraw)) return state;
      const validIds = new Set(rows.map((row) => row.teamId));
      if (action.teamIds.length !== rows.length || new Set(action.teamIds).size !== rows.length || action.teamIds.some((teamId) => !validIds.has(teamId))) return state;

      const matches = state.matches.map((match) => ({ ...match }));
      for (const match of matches.filter((item) => item.stage !== "group")) {
        match.teamAId = null;
        match.teamBId = null;
        match.result = null;
        match.winnerTeamId = null;
        match.setScores = null;
        match.isBye = false;
        match.operationalStatus = "scheduled";
      }
      const manualGroupRankings = [...state.manualGroupRankings.filter((ranking) => ranking.groupId !== action.groupId), { groupId: action.groupId, teamIds: action.teamIds }];
      const byes = seedKnockoutFromGroups(state, matches, manualGroupRankings);
      return { ...state, manualGroupRankings, matches, byes };
    }

    case "RESET_TOURNAMENT":
      return createInitialState();

    case "IMPORT_TOURNAMENT":
      return migrateState(action.state);

    default:
      return state;
  }
}
