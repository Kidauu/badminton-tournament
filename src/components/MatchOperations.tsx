import { useTournament } from "../state/TournamentContext";
import type { Match } from "../types/tournament";

interface MatchOperationsProps {
  match: Match;
}

function statusLabel(match: Match): string {
  if (match.isBye) return "Bye";
  if (match.result) return "Selesai";
  return match.operationalStatus === "in_progress" ? "Berlangsung" : "Terjadwal";
}

function findConflict(match: Match, allMatches: Match[]): Match | undefined {
  const court = match.court?.trim();
  if (!court || !match.scheduledAt) return undefined;
  return allMatches.find((other) =>
    other.id !== match.id &&
    !other.result &&
    !other.isBye &&
    other.court?.trim() === court &&
    other.scheduledAt === match.scheduledAt,
  );
}

export function MatchOperations({ match }: MatchOperationsProps) {
  const { state, dispatch } = useTournament();
  const status = match.operationalStatus === "in_progress" ? "in_progress" : "scheduled";
  const locked = Boolean(match.result || match.isBye);
  const conflict = locked ? undefined : findConflict(match, state.matches);

  function update(next: Partial<{ court: string; scheduledAt: string; status: "scheduled" | "in_progress" }>) {
    dispatch({
      type: "SET_MATCH_OPERATIONS",
      matchId: match.id,
      court: next.court ?? match.court ?? "",
      scheduledAt: next.scheduledAt ?? match.scheduledAt ?? "",
      status: next.status ?? status,
    });
  }

  return (
    <div className="match-operations">
      <span className={`match-status match-status-${locked ? "completed" : status}`}>{statusLabel(match)}</span>
      <label>
        Waktu
        <input type="datetime-local" value={match.scheduledAt ?? ""} disabled={locked} onChange={(event) => update({ scheduledAt: event.target.value })} />
      </label>
      <label>
        Lapangan
        <input type="text" value={match.court ?? ""} disabled={locked} placeholder="Contoh: Lapangan 1" onChange={(event) => update({ court: event.target.value })} />
      </label>
      {!locked && (
        <label>
          Status
          <select value={status} disabled={!match.teamAId || !match.teamBId} onChange={(event) => update({ status: event.target.value as "scheduled" | "in_progress" })}>
            <option value="scheduled">Terjadwal</option>
            <option value="in_progress">Berlangsung</option>
          </select>
        </label>
      )}
      {conflict && (
        <p className="tie-note">⚠️ Bentrok jadwal: lapangan &amp; jam yang sama dipakai pertandingan lain.</p>
      )}
    </div>
  );
}
