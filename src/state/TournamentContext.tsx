import { createContext, useContext, useEffect, useReducer } from "react";
import type { Dispatch, ReactNode } from "react";
import type { TournamentState } from "../types/tournament";
import { createInitialState, migrateState, tournamentReducer } from "./tournamentReducer";
import type { TournamentAction } from "./tournamentReducer";
import { loadTournamentState, saveTournamentState } from "./persistence";

interface TournamentContextValue {
  state: TournamentState;
  dispatch: Dispatch<TournamentAction>;
}

const TournamentContext = createContext<TournamentContextValue | null>(null);

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    tournamentReducer,
    undefined,
    () => {
      const loaded = loadTournamentState();
      return loaded ? migrateState(loaded) : createInitialState();
    },
  );

  useEffect(() => {
    saveTournamentState(state);
  }, [state]);

  return <TournamentContext.Provider value={{ state, dispatch }}>{children}</TournamentContext.Provider>;
}

export function useTournament(): TournamentContextValue {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error("useTournament must be used within a TournamentProvider");
  return ctx;
}
