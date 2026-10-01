import type { TournamentState } from "../types/tournament";

const BACKUP_FORMAT = "badminton-tournament-backup";
const BACKUP_VERSION = 1;

interface BackupEnvelope {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  data: TournamentState;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

function isValidTournamentState(value: unknown): value is TournamentState {
  if (!isRecord(value)) return false;
  const { participants, pendingPairs, teams, pendingGroupSlots, groupAssignments, manualGroupRankings, matches, byes } = value;
  if (!Array.isArray(participants) || !participants.every((item) => isRecord(item) && isString(item.id) && isString(item.name))) return false;
  if (!Array.isArray(pendingPairs) || !pendingPairs.every((pair) => Array.isArray(pair) && pair.length === 2 && pair.every(isString))) return false;
  if (!Array.isArray(teams) || !teams.every((team) => isRecord(team) && isString(team.id) && typeof team.seq === "number" && isString(team.playerAId) && isString(team.playerBId))) return false;
  if (!Array.isArray(pendingGroupSlots) || !pendingGroupSlots.every((group) => group === "A" || group === "B")) return false;
  if (!Array.isArray(groupAssignments) || !groupAssignments.every((item) => isRecord(item) && isString(item.teamId) && (item.groupId === "A" || item.groupId === "B"))) return false;
  if (!Array.isArray(manualGroupRankings) || !manualGroupRankings.every((item) => isRecord(item) && (item.groupId === "A" || item.groupId === "B") && Array.isArray(item.teamIds) && item.teamIds.every(isString))) return false;
  if (!Array.isArray(byes) || !byes.every((item) => isRecord(item) && typeof item.round === "number" && isString(item.teamId))) return false;
  return Array.isArray(matches) && matches.every((match) => isRecord(match)
    && isString(match.id)
    && typeof match.round === "number"
    && isNullableString(match.teamAId)
    && isNullableString(match.teamBId)
    && (match.result === null || match.result === "2-0" || match.result === "1-1" || match.result === "2-1")
    && isNullableString(match.winnerTeamId));
}

export function createBackup(state: TournamentState): string {
  const backup: BackupEnvelope = { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data: state };
  return JSON.stringify(backup, null, 2);
}

export function parseBackup(raw: string): TournamentState | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.format !== BACKUP_FORMAT || parsed.version !== BACKUP_VERSION || !isValidTournamentState(parsed.data)) return null;
    return parsed.data;
  } catch {
    return null;
  }
}
