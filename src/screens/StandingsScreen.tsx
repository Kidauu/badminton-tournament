import { useEffect, useState } from "react";
import { computeStandings, teamsInGroup } from "../logic/standings";
import { ExportSummary } from "../components/ExportSummary";
import { useTournament } from "../state/TournamentContext";

export function StandingsScreen() {
  const { state, dispatch } = useTournament();
  const teamsById = new Map(state.teams.map((team) => [team.id, team]));
  const groupMatches = state.matches.filter((match) => match.stage === "group");

  return (
    <section className="screen">
      <h1>Klasemen Grup</h1>
      <p>Juara dan runner-up masing-masing grup melaju ke semifinal silang.</p>
      <ExportSummary />
      {(["A", "B"] as const).map((groupId) => {
        const rows = computeStandings(teamsInGroup(state.teams, state.groupAssignments, groupId), groupMatches, groupId);
        const needsManualRanking = rows.some((row) => row.needsManualDraw);
        const savedRanking = state.manualGroupRankings.find((ranking) => ranking.groupId === groupId)?.teamIds;
        const rankingForDisplay = savedRanking ?? rows.map((row) => row.teamId);
        const qualifiersLocked = !needsManualRanking || Boolean(savedRanking);
        return (
          <div key={groupId} className="round-card card">
            <h2>Grup {groupId}</h2>
            <div className="table-scroll">
              <table className="standings-table">
                <thead>
                  <tr>
                    <th>Rank</th><th>Tim</th><th>Main</th><th>M</th><th>S</th><th>K</th><th>Poin</th><th>Selisih Poin</th><th>Poin Dicetak</th><th>Poin Diterima</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingForDisplay.map((teamId, index) => {
                    const row = rows.find((item) => item.teamId === teamId)!;
                    return (
                    <tr key={row.teamId} className={qualifiersLocked && index < 2 ? "qualified-row" : undefined}>
                      <td>{savedRanking ? index + 1 : row.rank}</td>
                      <td>Tim {teamsById.get(row.teamId)?.seq}</td>
                      <td>{row.played}</td>
                      <td>{row.won}</td>
                      <td>{row.drawn}</td>
                      <td>{row.lost}</td>
                      <td><strong>{row.points}</strong></td>
                      <td>{row.pointDiff > 0 ? `+${row.pointDiff}` : row.pointDiff}</td>
                      <td>{row.matchPoints}</td>
                      <td>{row.matchPointsConceded}</td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
            {needsManualRanking && (
              <ManualRanking
                groupId={groupId}
                rows={rows}
                teamsById={teamsById}
                confirmedRanking={savedRanking}
                onSave={(teamIds) => dispatch({ type: "SET_MANUAL_GROUP_RANKING", groupId, teamIds })}
              />
            )}
          </div>
        );
      })}
    </section>
  );
}

function ManualRanking({
  groupId,
  rows,
  teamsById,
  confirmedRanking,
  onSave,
}: {
  groupId: "A" | "B";
  rows: ReturnType<typeof computeStandings>;
  teamsById: Map<string, { seq: number }>;
  confirmedRanking?: string[];
  onSave: (teamIds: string[]) => void;
}) {
  const [ranking, setRanking] = useState<string[]>(confirmedRanking ?? rows.map((row) => row.teamId));
  const defaultRankingKey = rows.map((row) => row.teamId).join(",");
  const confirmedRankingKey = confirmedRanking?.join(",") ?? "";

  useEffect(() => {
    setRanking(confirmedRanking ?? rows.map((row) => row.teamId));
  // Reset only when the source ranking changes, not on every parent render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmedRankingKey, defaultRankingKey]);

  function move(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= ranking.length) return;
    setRanking((current) => {
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  }

  return (
    <div className="manual-ranking" role="region" aria-label={`Penentuan peringkat manual Grup ${groupId}`}>
      <p className="tie-note">⚠️ Tie-break Grup {groupId} masih sama. Tetapkan urutan akhir sebelum semifinal dibuka.</p>
      <ol className="manual-ranking-list">
        {ranking.map((teamId, index) => (
          <li key={teamId}>
            <strong>#{index + 1} Tim {teamsById.get(teamId)?.seq}</strong>
            <span>
              <button className="btn btn-ghost btn-small" disabled={index === 0} onClick={() => move(index, -1)}>Naik</button>
              <button className="btn btn-ghost btn-small" disabled={index === ranking.length - 1} onClick={() => move(index, 1)}>Turun</button>
            </span>
          </li>
        ))}
      </ol>
      {confirmedRanking ? <p className="manual-ranking-confirmed">✓ Urutan manual tersimpan. Semifinal menggunakan urutan ini.</p> : <button className="btn btn-primary" onClick={() => onSave(ranking)}>Konfirmasi urutan Grup {groupId}</button>}
    </div>
  );
}
