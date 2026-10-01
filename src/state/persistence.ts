import type { TournamentState } from "../types/tournament";

const STORAGE_KEY = "badminton-tournament:v4";

interface StoredEnvelope {
  schemaVersion: 4;
  savedAt: string;
  data: TournamentState;
}

export function loadTournamentState(): TournamentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredEnvelope;
    if (parsed.schemaVersion !== 4 || !parsed.data) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function saveTournamentState(state: TournamentState): void {
  try {
    const envelope: StoredEnvelope = { schemaVersion: 4, savedAt: new Date().toISOString(), data: state };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // Storage full or disabled — the app keeps working in-memory for the session.
  }
}

export function clearTournamentState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
