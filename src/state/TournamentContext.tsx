import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { Dispatch, ReactNode } from "react";
import type { TournamentState } from "../types/tournament";
import { createInitialState, migrateState, tournamentReducer } from "./tournamentReducer";
import type { TournamentAction } from "./tournamentReducer";
import { loadSyncMeta, loadTournamentState, saveSyncMeta, saveTournamentState } from "./persistence";
import { fetchRemote, loadAdminAuth, makeBasicAuth, pushRemote, saveAdminAuth } from "./remoteSync";
import { RETRY_MS, nextPollDelay } from "./pollSchedule";
import { CONFLICT_MESSAGE, decideConflict, decidePull } from "./syncDecision";

/** admin: boleh ubah & tersinkron · viewer: hanya lihat · local: tanpa server (dev) */
export type TournamentRole = "admin" | "viewer" | "local";
export type SyncStatus = "synced" | "saving" | "offline";
export type LoginResult = "ok" | "invalid" | "blocked" | "error";

const PUSH_DEBOUNCE_MS = 500;

type PullOutcome = "changed" | "unchanged" | "failed";

/** Dialog konfirmasi sering diblokir di tab latar belakang (dianggap "Batal"), jadi tunggu sampai tab terlihat. */
function whenVisible(): Promise<void> {
  if (document.visibilityState === "visible") return Promise.resolve();
  return new Promise((resolve) => {
    const onChange = () => {
      if (document.visibilityState !== "visible") return;
      document.removeEventListener("visibilitychange", onChange);
      resolve();
    };
    document.addEventListener("visibilitychange", onChange);
  });
}

interface TournamentContextValue {
  state: TournamentState;
  dispatch: Dispatch<TournamentAction>;
  role: TournamentRole;
  syncStatus: SyncStatus;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  loginOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
}

const TournamentContext = createContext<TournamentContextValue | null>(null);

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(
    tournamentReducer,
    undefined,
    () => {
      const loaded = loadTournamentState();
      return loaded ? migrateState(loaded) : createInitialState();
    },
  );
  const [role, setRole] = useState<TournamentRole>(() => (loadAdminAuth() ? "admin" : "viewer"));
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("saving");
  const [ready, setReady] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [loginOpen, setLoginOpen] = useState(false);

  const authRef = useRef<string | null>(loadAdminAuth());
  const pulledRef = useRef(false);
  // Catatan sinkronisasi admin bertahan setelah reload, sehingga perubahan yang belum terkirim tidak ditimpa data server.
  const [initialMeta] = useState(() => (loadAdminAuth() ? loadSyncMeta() : null));
  const remoteVersionRef = useRef<string | null>(initialMeta?.baseVersion ?? null);
  const syncedJsonRef = useRef<string | null>(initialMeta?.syncedJson ?? null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
    saveTournamentState(state);
  }, [state]);

  /** Catat bahwa data lokal identik dengan server pada versi tertentu (admin: juga disimpan di HP). */
  const rememberSync = useCallback((version: string | null, json: string) => {
    remoteVersionRef.current = version;
    syncedJsonRef.current = json;
    saveSyncMeta(authRef.current ? { baseVersion: version, syncedJson: json } : null);
  }, []);

  const adopt = useCallback((data: TournamentState, updatedAt: string | null) => {
    const migrated = migrateState(data);
    const json = JSON.stringify(migrated);
    rememberSync(updatedAt, json);
    if (json !== JSON.stringify(stateRef.current)) rawDispatch({ type: "IMPORT_TOURNAMENT", state: migrated });
  }, [rememberSync]);

  const pull = useCallback(async (): Promise<PullOutcome> => {
    const result = await fetchRemote(authRef.current);
    if (result.kind === "unavailable") {
      setRole("local");
      setReady(true);
      return "unchanged";
    }
    if (result.kind === "offline" || result.kind === "blocked") {
      setSyncStatus("offline");
      return "failed";
    }
    if (authRef.current && !result.isAdmin) {
      authRef.current = null;
      saveAdminAuth(null);
      saveSyncMeta(null);
    }
    setRole(authRef.current ? "admin" : "viewer");
    let outcome: PullOutcome = "unchanged";
    if (result.data) {
      const localJson = JSON.stringify(stateRef.current);
      const decision = decidePull({
        alreadyPulled: pulledRef.current,
        localJson,
        // Penonton tidak punya perubahan lokal: hanya admin yang boleh dianggap "belum terkirim".
        syncedJson: authRef.current ? syncedJsonRef.current : null,
        baseVersion: remoteVersionRef.current,
        serverJson: JSON.stringify(migrateState(result.data)),
        serverVersion: result.updatedAt,
      });
      if (decision === "adopt") {
        adopt(result.data, result.updatedAt);
        outcome = "changed";
      } else if (decision === "mark-synced") {
        rememberSync(result.updatedAt, localJson);
      } else if (decision === "ask") {
        await whenVisible();
        if (window.confirm(CONFLICT_MESSAGE)) {
          // Timpa server: data lokal tetap, dikirim dengan versi server terbaru sebagai dasar.
          remoteVersionRef.current = result.updatedAt;
        } else {
          adopt(result.data, result.updatedAt);
          outcome = "changed";
        }
      }
      // "keep-local": server belum berubah, perubahan lokal dikirim oleh efek pengiriman di bawah.
    } else {
      // Server masih kosong: data lokal admin menjadi data awal bersama.
      remoteVersionRef.current = null;
      syncedJsonRef.current = null;
      saveSyncMeta(null);
    }
    pulledRef.current = true;
    setSyncStatus("synced");
    setReady(true);
    return outcome;
  }, [adopt, rememberSync]);

  // Tarik data saat dibuka (ulangi sampai berhasil), lalu polling untuk penonton.
  // Hemat kuota: berhenti saat tab tersembunyi, melambat saat data tidak berubah,
  // dan jeda dilipatgandakan saat server bermasalah (lihat pollSchedule.ts).
  useEffect(() => {
    if (role === "local") return;
    if (ready && role !== "viewer") return; // admin hanya menarik ulang saat tab kembali aktif (efek di bawah)

    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let inFlight = false;
    let failures = 0;
    let unchanged = 0;

    const schedule = () => {
      clearTimeout(timer);
      if (stopped || document.visibilityState !== "visible") return;
      timer = setTimeout(() => void tick(), nextPollDelay({ ready, failures, unchanged }));
    };
    const tick = async () => {
      if (inFlight) return;
      inFlight = true;
      const outcome = await pull();
      inFlight = false;
      if (stopped) return;
      failures = outcome === "failed" ? failures + 1 : 0;
      unchanged = outcome === "unchanged" ? unchanged + 1 : 0;
      schedule();
    };
    const onVisibility = () => {
      clearTimeout(timer);
      if (document.visibilityState === "visible") {
        unchanged = 0;
        void tick();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    if (ready) schedule();
    else void tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pull, ready, role]);

  // Admin di perangkat lain bisa saja sudah mengubah data: tarik ulang saat tab kembali aktif.
  useEffect(() => {
    if (role !== "admin") return;
    const onVisible = () => {
      if (document.visibilityState === "visible" && JSON.stringify(stateRef.current) === syncedJsonRef.current) void pull();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [pull, role]);

  // Admin: kirim perubahan ke server (debounce, ulang otomatis kalau gagal).
  useEffect(() => {
    if (role !== "admin" || !ready) return;
    const json = JSON.stringify(state);
    if (json === syncedJsonRef.current) return;
    setSyncStatus("saving");
    const timer = setTimeout(async () => {
      const auth = authRef.current;
      if (!auth) return;
      const result = await pushRemote(auth, state, remoteVersionRef.current);
      if (result.kind === "ok") {
        rememberSync(result.updatedAt, json);
        setSyncStatus(JSON.stringify(stateRef.current) === json ? "synced" : "saving");
        // ada perubahan baru selama request berjalan: picu efek ini lagi
        setRetryTick((tick) => tick + 1);
      } else if (result.kind === "conflict") {
        if (decideConflict(json, JSON.stringify(migrateState(result.data))) === "mark-synced") {
          rememberSync(result.updatedAt, json);
          setSyncStatus(JSON.stringify(stateRef.current) === json ? "synced" : "saving");
          setRetryTick((tick) => tick + 1);
          return;
        }
        await whenVisible();
        if (window.confirm(CONFLICT_MESSAGE)) {
          // Timpa server: kirim ulang dengan versi server terbaru sebagai dasar.
          remoteVersionRef.current = result.updatedAt;
          setRetryTick((tick) => tick + 1);
        } else {
          adopt(result.data, result.updatedAt);
          setSyncStatus("synced");
        }
      } else if (result.kind === "unauthorized") {
        authRef.current = null;
        saveAdminAuth(null);
        saveSyncMeta(null);
        setRole("viewer");
      } else {
        setSyncStatus("offline");
        setTimeout(() => setRetryTick((tick) => tick + 1), RETRY_MS);
      }
    }, PUSH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [state, role, ready, retryTick, adopt, rememberSync]);

  const dispatch = useCallback<Dispatch<TournamentAction>>(
    (action) => {
      if (role === "viewer") return;
      rawDispatch(action);
    },
    [role],
  );

  const login = useCallback(async (username: string, password: string): Promise<LoginResult> => {
    const auth = makeBasicAuth(username, password);
    const result = await fetchRemote(auth);
    if (result.kind === "blocked") return "blocked";
    if (result.kind !== "ok") return "error";
    if (!result.isAdmin) return "invalid";
    authRef.current = auth;
    saveAdminAuth(auth);
    pulledRef.current = false;
    setReady(false);
    setRole("admin");
    setLoginOpen(false);
    return "ok";
  }, []);

  const openLogin = useCallback(() => setLoginOpen(true), []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);

  const logout = useCallback(() => {
    authRef.current = null;
    saveAdminAuth(null);
    saveSyncMeta(null);
    setRole("viewer");
  }, []);

  const value = useMemo(
    () => ({ state, dispatch, role, syncStatus, login, logout, loginOpen, openLogin, closeLogin }),
    [state, dispatch, role, syncStatus, login, logout, loginOpen, openLogin, closeLogin],
  );

  return <TournamentContext.Provider value={value}>{children}</TournamentContext.Provider>;
}

export function useTournament(): TournamentContextValue {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error("useTournament must be used within a TournamentProvider");
  return ctx;
}
