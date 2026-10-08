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

const SYNC_META_KEY = "badminton-tournament:sync-meta";

/** Catatan sinkronisasi admin: bertahan setelah halaman di-reload. */
export interface SyncMeta {
  /** Versi dokumen server (updatedAt) yang menjadi dasar data lokal. */
  baseVersion: string | null;
  /** JSON data lokal terakhir yang diketahui sama dengan server. */
  syncedJson: string;
}

export function loadSyncMeta(): SyncMeta | null {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SyncMeta>;
    if (typeof parsed.syncedJson !== "string") return null;
    return { baseVersion: typeof parsed.baseVersion === "string" ? parsed.baseVersion : null, syncedJson: parsed.syncedJson };
  } catch {
    return null;
  }
}

export function saveSyncMeta(meta: SyncMeta | null): void {
  try {
    if (meta) localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
    else localStorage.removeItem(SYNC_META_KEY);
  } catch {
    // Storage full or disabled — sinkronisasi tetap jalan selama halaman tidak di-reload.
  }
}
