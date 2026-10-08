import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { Dispatch, ReactNode } from "react";
import type { TournamentState } from "../types/tournament";
import { createInitialState, migrateState, tournamentReducer } from "./tournamentReducer";
import type { TournamentAction } from "./tournamentReducer";
import { loadTournamentState, saveTournamentState } from "./persistence";
import { fetchRemote, loadAdminPin, pushRemote, saveAdminPin } from "./remoteSync";

/** admin: boleh ubah & tersinkron · viewer: hanya lihat · local: tanpa server (dev) */
export type TournamentRole = "admin" | "viewer" | "local";
export type SyncStatus = "synced" | "saving" | "offline";

const VIEWER_POLL_MS = 10_000;
const RETRY_MS = 5_000;
const PUSH_DEBOUNCE_MS = 500;

interface TournamentContextValue {
  state: TournamentState;
  dispatch: Dispatch<TournamentAction>;
  role: TournamentRole;
  syncStatus: SyncStatus;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
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
  const [role, setRole] = useState<TournamentRole>(() => (loadAdminPin() ? "admin" : "viewer"));
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("saving");
  const [ready, setReady] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  const pinRef = useRef<string | null>(loadAdminPin());
  const pulledRef = useRef(false);
  const remoteVersionRef = useRef<string | null>(null);
  const syncedJsonRef = useRef<string | null>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
    saveTournamentState(state);
  }, [state]);

  const adopt = useCallback((data: TournamentState, updatedAt: string | null) => {
    const migrated = migrateState(data);
    remoteVersionRef.current = updatedAt;
    syncedJsonRef.current = JSON.stringify(migrated);
    if (syncedJsonRef.current !== JSON.stringify(stateRef.current)) rawDispatch({ type: "IMPORT_TOURNAMENT", state: migrated });
  }, []);

  const pull = useCallback(async () => {
    const result = await fetchRemote(pinRef.current);
    if (result.kind === "unavailable") {
      setRole("local");
      setReady(true);
      return;
    }
    if (result.kind === "offline") {
      setSyncStatus("offline");
      return;
    }
    if (pinRef.current && !result.isAdmin) {
      pinRef.current = null;
      saveAdminPin(null);
    }
    setRole(pinRef.current ? "admin" : "viewer");
    if (result.data) {
      if (!pulledRef.current || result.updatedAt !== remoteVersionRef.current) adopt(result.data, result.updatedAt);
    } else {
      // Server masih kosong: data lokal admin menjadi data awal bersama.
      remoteVersionRef.current = null;
      syncedJsonRef.current = null;
    }
    pulledRef.current = true;
    setSyncStatus("synced");
    setReady(true);
  }, [adopt]);

  // Tarik data saat dibuka, ulangi sampai berhasil, lalu polling untuk penonton.
  useEffect(() => {
    if (role === "local") return;
    if (!ready) {
      void pull();
      const retry = setInterval(() => void pull(), RETRY_MS);
      return () => clearInterval(retry);
    }
    if (role === "viewer") {
      const poll = setInterval(() => void pull(), VIEWER_POLL_MS);
      return () => clearInterval(poll);
    }
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
      const pin = pinRef.current;
      if (!pin) return;
      const result = await pushRemote(pin, state, remoteVersionRef.current);
      if (result.kind === "ok") {
        remoteVersionRef.current = result.updatedAt;
        syncedJsonRef.current = json;
        setSyncStatus(JSON.stringify(stateRef.current) === json ? "synced" : "saving");
        // ada perubahan baru selama request berjalan: picu efek ini lagi
        setRetryTick((tick) => tick + 1);
      } else if (result.kind === "conflict") {
        adopt(result.data, result.updatedAt);
        setSyncStatus("synced");
      } else if (result.kind === "unauthorized") {
        pinRef.current = null;
        saveAdminPin(null);
        setRole("viewer");
      } else {
        setSyncStatus("offline");
        setTimeout(() => setRetryTick((tick) => tick + 1), RETRY_MS);
      }
    }, PUSH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [state, role, ready, retryTick, adopt]);

  const dispatch = useCallback<Dispatch<TournamentAction>>(
    (action) => {
      if (role === "viewer") return;
      rawDispatch(action);
    },
    [role],
  );

  const login = useCallback(async (pin: string) => {
    const result = await fetchRemote(pin);
    if (result.kind !== "ok" || !result.isAdmin) return false;
    pinRef.current = pin;
    saveAdminPin(pin);
    pulledRef.current = false;
    setReady(false);
    setRole("admin");
    return true;
  }, []);

  const logout = useCallback(() => {
    pinRef.current = null;
    saveAdminPin(null);
    setRole("viewer");
  }, []);

  const value = useMemo(
    () => ({ state, dispatch, role, syncStatus, login, logout }),
    [state, dispatch, role, syncStatus, login, logout],
  );

  return <TournamentContext.Provider value={value}>{children}</TournamentContext.Provider>;
}

export function useTournament(): TournamentContextValue {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error("useTournament must be used within a TournamentProvider");
  return ctx;
}
