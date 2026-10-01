import { useEffect, useState } from "react";
import { computeStandings, teamsInGroup } from "../logic/standings";
import { teamPlayerNames } from "../logic/format";
import { ExportSummary } from "../components/ExportSummary";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/Button";
import { useTournament } from "../state/TournamentContext";
import type { Team } from "../types/tournament";

function RankBadge({ rank, qualified }: { rank: number; qualified: boolean }) {
  return <span className={`rank-badge ${qualified ? "rank-badge-qualified" : ""}`}>{rank}</span>;
}

export function StandingsScreen() {
  const { state, dispatch } = useTournament();
  const teamsById = new Map(state.teams.map((team) => [team.id, team]));
  const groupMatches = state.matches.filter((match) => match.stage === "group");

  return (
    <section>
      <PageHeader
        title="Klasemen"
        description="Juara dan runner-up tiap grup lolos ke semifinal silang."
        actions={<ExportSummary />}
      />

      {(["A", "B"] as const).map((groupId) => {
        const teams = teamsInGroup(state.teams, state.groupAssignments, groupId);
        const matches = groupMatches.filter((m) => m.groupId === groupId);
        const rows = computeStandings(teams, matches, groupId);
        const needsManualRanking = rows.some((row) => row.needsManualDraw);
        const savedRanking = state.manualGroupRankings.find((ranking) => ranking.groupId === groupId)?.teamIds;
        const rankingForDisplay = savedRanking ?? rows.map((row) => row.teamId);
        const qualifiersLocked = !needsManualRanking || Boolean(savedRanking);
        const playedCount = matches.filter((m) => m.result !== null).length;

        return (
          <div key={groupId} className="card standings-card">
            <div className="standings-card-head">
              <h2 className="text-h2-card">Grup {groupId}</h2>
              <span className="standings-card-meta mono-num">
                {teams.length} tim · {playedCount} pertandingan
              </span>
            </div>
            <div className="table-scroll">
              <table className="standings-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Tim</th>
                    <th>Main</th>
                    <th>M</th>
                    <th>S</th>
                    <th>K</th>
                    <th>Skor</th>
                    <th>Selisih</th>
                    <th>Poin</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingForDisplay.map((teamId, index) => {
                    const row = rows.find((item) => item.teamId === teamId)!;
                    const team = teamsById.get(row.teamId) as Team;
                    const [a, b] = teamPlayerNames(team, state.participants);
                    const rank = savedRanking ? index + 1 : row.rank;
                    return (
                      <tr key={row.teamId} className={index === 1 && qualifiersLocked ? "qualify-divider" : undefined}>
                        <td>
                          <RankBadge rank={rank} qualified={qualifiersLocked && index < 2} />
                        </td>
                        <td className="standings-cell-team">
                          <p className="standings-team-name">Tim {team.seq}</p>
                          <p className="standings-team-members">
                            {a} &amp; {b}
                          </p>
                        </td>
                        <td className="mono-num">{row.played}</td>
                        <td className="mono-num">{row.won}</td>
                        <td className="mono-num">{row.drawn}</td>
                        <td className="mono-num">{row.lost}</td>
                        <td className="mono-num">
                          {row.matchPoints}–{row.matchPointsConceded}
                        </td>
                        <td className="mono-num">{row.pointDiff > 0 ? `+${row.pointDiff}` : row.pointDiff}</td>
                        <td className="standings-points mono-num">{row.points}</td>
                      </tr>
                    );
                  })}
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

      <p className="standings-legend">
        <span>
          <strong>Lolos ke semifinal</strong>
        </span>
        <span>· Batas lolos</span>
        <span>· M menang</span>
        <span>· S seri</span>
        <span>· K kalah</span>
        <span>· Skor = poin dicetak–diterima</span>
        <span>· Peringkat: poin, lalu selisih poin</span>
      </p>
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
  teamsById: Map<string, Team>;
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
      <p className="tie-note">Tie-break Grup {groupId} masih sama. Tetapkan urutan akhir sebelum semifinal dibuka.</p>
      <ol className="manual-ranking-list">
        {ranking.map((teamId, index) => (
          <li key={teamId}>
            <strong>
              #{index + 1} Tim {teamsById.get(teamId)?.seq}
            </strong>
            <span>
              <Button small disabled={index === 0} onClick={() => move(index, -1)}>
                Naik
              </Button>
              <Button small disabled={index === ranking.length - 1} onClick={() => move(index, 1)}>
                Turun
              </Button>
            </span>
          </li>
        ))}
      </ol>
      {confirmedRanking ? (
        <p className="manual-ranking-confirmed">Urutan manual tersimpan. Semifinal menggunakan urutan ini.</p>
      ) : (
        <Button variant="primary" onClick={() => onSave(ranking)}>
          Konfirmasi urutan Grup {groupId}
        </Button>
      )}
    </div>
  );
}
