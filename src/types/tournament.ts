export interface Participant {
  id: string;
  name: string;
}

export interface Team {
  id: string;
  seq: number; // 1..7, formation order — this is also the scheduling team number
  playerAId: string;
  playerBId: string;
}

export type SetResult = "2-0" | "1-1" | "2-1";
export type GroupId = "A" | "B";
export type MatchStage = "group" | "semifinal" | "final" | "third_place";
export type MatchOperationalStatus = "scheduled" | "in_progress" | "completed";

export interface SetScore {
  teamAScore: number;
  teamBScore: number;
}

export type MatchSetScores = [SetScore, SetScore, SetScore | null];

export interface Match {
  id: string;
  round: number;
  stage?: MatchStage;
  groupId?: GroupId;
  /** A slot stays null until the winner of its feeder match is known. */
  teamAId: string | null;
  teamBId: string | null;
  result: SetResult | null;
  winnerTeamId: string | null;
  /** Set 1, set 2, and (only when needed) the golden set. */
  setScores?: MatchSetScores | null;
  /** Where the winner should be placed in the next round's bracket. */
  nextMatchId?: string | null;
  nextMatchSlot?: "A" | "B" | null;
  /** Where the loser should be placed (e.g. the third-place playoff). */
  loserNextMatchId?: string | null;
  loserNextMatchSlot?: "A" | "B" | null;
  /** True when the winner advanced by walkover because the opposing group had no runner-up. */
  isBye?: boolean;
  court?: string;
  scheduledAt?: string;
  operationalStatus?: MatchOperationalStatus;
}

export interface ByeEntry {
  round: number;
  teamId: string;
}

export interface TournamentState {
  participants: Participant[];
  pendingPairs: [string, string][]; // remaining shuffled pairs still to be revealed by the wheel
  teams: Team[];
  /** Randomized, as-balanced-as-possible A/B slots still waiting to be assigned to teams. */
  pendingGroupSlots: GroupId[];
  groupAssignments: { teamId: string; groupId: GroupId }[];
  /** Admin-confirmed final order for a group when automatic tie-breaks cannot separate teams. */
  manualGroupRankings: { groupId: GroupId; teamIds: string[] }[];
  matches: Match[];
  byes: ByeEntry[];
}
