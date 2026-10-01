import { Trophy, ArrowRight } from "lucide-react";
import { useTournament } from "../state/TournamentContext";
import { teamPlayerNames } from "../logic/format";
import { computeStandings, teamsInGroup } from "../logic/standings";
import { Button } from "../components/Button";
import type { Match, Participant, SetScore, Team } from "../types/tournament";
import type { TabId } from "../types/nav";

function loserOf(match: Match | undefined): string | null {
  if (!match || match.isBye || !match.winnerTeamId || !match.teamAId || !match.teamBId) return null;
  return match.winnerTeamId === match.teamAId ? match.teamBId : match.teamAId;
}

function CourtMotif() {
  return (
    <div className="court-motif" aria-hidden="true">
      <span className="court-line-h" style={{ top: "7.5%" }} />
      <span className="court-line-h" style={{ bottom: "7.5%" }} />
      <span className="court-line-v" style={{ left: "5.7%" }} />
      <span className="court-line-v" style={{ right: "5.7%" }} />
      <span className="court-line-v" style={{ left: "35.2%" }} />
      <span className="court-line-v" style={{ right: "35.2%" }} />
      <span className="court-center-line" style={{ top: "50%", left: 0, width: "35.2%" }} />
      <span className="court-center-line" style={{ top: "50%", right: 0, width: "35.2%" }} />
      <span className="court-net" />
    </div>
  );
}

function PodiumColumn({ place, team, participants }: { place: 1 | 2 | 3; team: Team; participants: Participant[] }) {
  const [a, b] = teamPlayerNames(team, participants);
  const medalColor = place === 1 ? "var(--medal-gold)" : place === 2 ? "var(--medal-silver)" : "var(--medal-bronze)";
  const medalLabel = place === 1 ? "Emas" : place === 2 ? "Perak" : "Perunggu";
  return (
    <div className="podium-col">
      <span className="podium-medal">
        <span className="podium-medal-dot" style={{ background: medalColor }} />
        {medalLabel}
      </span>
      <p className="podium-name">
        {a} &amp; {b}
      </p>
      <p className="podium-team mono-num">Tim {team.seq}</p>
      <div className={`podium-block podium-block-${place}`}>{place}</div>
    </div>
  );
}

export function ChampionScreen({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { state } = useTournament();
  const teamsById = new Map(state.teams.map((t) => [t.id, t]));
  const final = state.matches.find((match) => match.id === "final");
  const championTeam = final?.winnerTeamId ? teamsById.get(final.winnerTeamId) : undefined;

  if (!championTeam || !final) {
    return (
      <section>
        <div className="champion-empty">
          <p className="champion-empty-title">Juara belum ditentukan</p>
          <p>Juara muncul setelah final selesai.</p>
          <div style={{ marginTop: 16 }}>
            <Button variant="secondary" icon={<ArrowRight size={16} />} onClick={() => onNavigate("jadwal")}>
              Lihat Bagan
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const names = teamPlayerNames(championTeam, state.participants);
  const runnerUpId = loserOf(final);
  const runnerUpTeam = runnerUpId ? teamsById.get(runnerUpId) : undefined;
  const thirdPlace = state.matches.find((match) => match.id === "third-place");
  const thirdPlaceTeam = thirdPlace?.winnerTeamId ? teamsById.get(thirdPlace.winnerTeamId) : undefined;

  const isChampionSideA = final.winnerTeamId === final.teamAId;
  const playedSets = Array.from(final.setScores ?? []).filter((s): s is SetScore => s !== null);

  const championGroupId = state.groupAssignments.find((a) => a.teamId === championTeam.id)?.groupId;
  const groupMatches = state.matches.filter((m) => m.stage === "group" && m.groupId === championGroupId);
  const groupRows = championGroupId
    ? computeStandings(teamsInGroup(state.teams, state.groupAssignments, championGroupId), groupMatches, championGroupId)
    : [];
  const championGroupRow = groupRows.find((r) => r.teamId === championTeam.id);

  const championSemifinal = state.matches.find(
    (m) => m.stage === "semifinal" && (m.teamAId === championTeam.id || m.teamBId === championTeam.id),
  );
  const semifinalOpponentId = championSemifinal
    ? championSemifinal.teamAId === championTeam.id
      ? championSemifinal.teamBId
      : championSemifinal.teamAId
    : null;

  return (
    <section>
      <div className="champion-hero">
        <CourtMotif />
        <span className="champion-pill">
          <Trophy size={16} />
          Juara turnamen
        </span>
        <h1 className="text-display champion-display-name">
          {names[0]} &amp; {names[1]}
        </h1>
        <p className="champion-subline">
          Tim {championTeam.seq} · menang {final.result?.replace("-", "–")} atas Tim {runnerUpTeam?.seq ?? "?"} di final
        </p>
        {playedSets.length > 0 && (
          <div className="champion-score-chips">
            {playedSets.map((s, i) => {
              const mine = isChampionSideA ? s.teamAScore : s.teamBScore;
              const theirs = isChampionSideA ? s.teamBScore : s.teamAScore;
              return (
                <span className="champion-score-chip mono-num" key={i}>
                  <span className={mine > theirs ? "champion-score-chip-won" : "champion-score-chip-lost"}>{mine}</span>
                  <span aria-hidden="true">–</span>
                  <span className={theirs > mine ? "champion-score-chip-won" : "champion-score-chip-lost"}>{theirs}</span>
                </span>
              );
            })}
          </div>
        )}

        <div className="podium-grid">
          {runnerUpTeam && <PodiumColumn place={2} team={runnerUpTeam} participants={state.participants} />}
          <PodiumColumn place={1} team={championTeam} participants={state.participants} />
          {thirdPlaceTeam && <PodiumColumn place={3} team={thirdPlaceTeam} participants={state.participants} />}
        </div>
      </div>

      <div className="journey-section">
        <h2 className="text-h2">Perjalanan Tim {championTeam.seq}</h2>
        <div className="journey-cards">
          <div className="card journey-card">
            <p className="journey-card-title">Fase Grup</p>
            {championGroupRow && (
              <>
                <div className="journey-card-row">
                  <span>Peringkat</span>
                  <span>#{championGroupRow.rank}</span>
                </div>
                <div className="journey-card-row">
                  <span>M-S-K</span>
                  <span>
                    {championGroupRow.won}-{championGroupRow.drawn}-{championGroupRow.lost}
                  </span>
                </div>
                <div className="journey-card-row">
                  <span>Poin</span>
                  <span>{championGroupRow.points}</span>
                </div>
              </>
            )}
          </div>
          <div className="card journey-card">
            <p className="journey-card-title">Semifinal</p>
            {championSemifinal ? (
              <>
                <div className="journey-card-row">
                  <span>Lawan</span>
                  <span>{semifinalOpponentId ? `Tim ${teamsById.get(semifinalOpponentId)?.seq}` : "–"}</span>
                </div>
                <div className="journey-card-row">
                  <span>Hasil</span>
                  <span>{championSemifinal.isBye ? "Menang WO" : `Menang ${championSemifinal.result?.replace("-", "–")}`}</span>
                </div>
              </>
            ) : (
              <p className="journey-card-row">
                <span>Langsung ke final</span>
              </p>
            )}
          </div>
          <div className="card journey-card">
            <p className="journey-card-title">Final</p>
            <div className="journey-card-row">
              <span>Lawan</span>
              <span>Tim {runnerUpTeam?.seq ?? "?"}</span>
            </div>
            <div className="journey-card-row">
              <span>Hasil</span>
              <span>Menang {final.result?.replace("-", "–")}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 40 }}>
        <Button variant="secondary" icon={<ArrowRight size={16} />} onClick={() => onNavigate("jadwal")}>
          Lihat bagan lengkap
        </Button>
      </div>
    </section>
  );
}
