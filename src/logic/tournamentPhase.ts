import type { TournamentState } from "../types/tournament";

/** Read-only label for the header's StatusChip, derived entirely from existing state. */
export function tournamentPhaseLabel(state: TournamentState): string | null {
  if (state.participants.length === 0) return null;
  const totalTeams = state.participants.length / 2;

  if (state.teams.length < totalTeams) return `Undian · ${state.teams.length}/${totalTeams} tim`;
  if (state.groupAssignments.length < totalTeams) return `Undian · ${state.groupAssignments.length}/${totalTeams} tim`;

  const groupMatches = state.matches.filter((m) => m.stage === "group");
  if (!groupMatches.every((m) => m.result !== null)) return "Fase grup";

  const semifinals = state.matches.filter((m) => m.stage === "semifinal");
  if (!semifinals.every((m) => m.result !== null)) return "Semifinal";

  const allDone = state.matches.length > 0 && state.matches.every((m) => m.result !== null || (!m.teamAId && !m.teamBId));
  if (allDone) return "Turnamen selesai";

  return "Final";
}
