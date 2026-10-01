import { Check } from "lucide-react";
import { useTournament } from "../state/TournamentContext";
import type { Match, MatchOperationalStatus } from "../types/tournament";

interface MatchOperationsProps {
  match: Match;
}

function findConflict(match: Match, allMatches: Match[]): Match | undefined {
  const court = match.court?.trim();
  if (!court || !match.scheduledAt) return undefined;
  return allMatches.find(
    (other) =>
      other.id !== match.id &&
      !other.result &&
      !other.isBye &&
      other.court?.trim() === court &&
      other.scheduledAt === match.scheduledAt,
  );
}

/** Waktu + Lapangan inputs for one match row in the group schedule table. */
export function MatchOperations({ match }: MatchOperationsProps) {
  const { state, dispatch } = useTournament();
  const locked = Boolean(match.result || match.isBye);
  const conflict = locked ? undefined : findConflict(match, state.matches);

  function update(next: Partial<{ court: string; scheduledAt: string; status: Exclude<MatchOperationalStatus, "completed"> }>) {
    const status = match.operationalStatus === "in_progress" ? "in_progress" : "scheduled";
    dispatch({
      type: "SET_MATCH_OPERATIONS",
      matchId: match.id,
      court: next.court ?? match.court ?? "",
      scheduledAt: next.scheduledAt ?? match.scheduledAt ?? "",
      status: next.status ?? status,
    });
  }

  return (
    <div className="match-ops-inputs">
      <input
        type="datetime-local"
        className="field-input field-input-table"
        aria-label={`Waktu pertandingan`}
        value={match.scheduledAt ?? ""}
        disabled={locked}
        onChange={(event) => update({ scheduledAt: event.target.value })}
      />
      <input
        type="text"
        className="field-input field-input-table"
        aria-label={`Lapangan pertandingan`}
        placeholder="Contoh: Lapangan 1"
        value={match.court ?? ""}
        disabled={locked}
        onChange={(event) => update({ court: event.target.value })}
      />
      {conflict && <span className="match-ops-conflict">Bentrok jadwal dengan pertandingan lain</span>}
    </div>
  );
}

/** Computed status cell: an editable in-progress toggle while pending, a plain "Selesai" badge once done. */
export function MatchStatusCell({ match }: { match: Match }) {
  const { dispatch } = useTournament();
  const locked = Boolean(match.result || match.isBye);

  if (locked) {
    return (
      <span className="match-table-status match-table-status-done">
        <Check size={14} />
        Selesai
      </span>
    );
  }

  if (!match.teamAId || !match.teamBId) {
    return <span className="match-table-status match-table-status-pending">Belum main</span>;
  }

  const status = match.operationalStatus === "in_progress" ? "in_progress" : "scheduled";

  function setStatus(next: "scheduled" | "in_progress") {
    dispatch({
      type: "SET_MATCH_OPERATIONS",
      matchId: match.id,
      court: match.court ?? "",
      scheduledAt: match.scheduledAt ?? "",
      status: next,
    });
  }

  return (
    <select
      className="field-select field-input-table"
      aria-label="Status pertandingan"
      value={status}
      onChange={(event) => setStatus(event.target.value as "scheduled" | "in_progress")}
    >
      <option value="scheduled">Belum main</option>
      <option value="in_progress">Berlangsung</option>
    </select>
  );
}
