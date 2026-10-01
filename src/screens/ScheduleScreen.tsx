import { Fragment } from "react";
import { Printer, Trophy, ArrowRight } from "lucide-react";
import { scoreLabel } from "../logic/scoring";
import { teamPlayerNames } from "../logic/format";
import { MatchOperations, MatchStatusCell } from "../components/MatchOperations";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/Button";
import { BracketMatchCard } from "../components/BracketMatchCard";
import { cellsFromMatch } from "../components/ScoreLine";
import { useTournament } from "../state/TournamentContext";
import type { TabId } from "../types/nav";
import type { Match, Team } from "../types/tournament";

function teamLabel(teamId: string | null, teamsById: Map<string, Team>, fallback: string): string {
  return teamId ? `Tim ${teamsById.get(teamId)?.seq ?? "?"}` : fallback;
}

function buildSide(
  teamId: string | null,
  teamsById: Map<string, Team>,
  participants: { id: string; name: string }[],
  match: Match,
  side: "A" | "B",
  seed?: string,
) {
  if (!teamId) return null;
  const team = teamsById.get(teamId);
  if (!team) return null;
  const [a, b] = teamPlayerNames(team, participants);
  return { seed, name: `Tim ${team.seq}`, members: `${a} & ${b}`, cells: cellsFromMatch(match, side, 3) };
}

function formatScheduleTime(value?: string): string {
  if (!value) return "Waktu belum diatur";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "Waktu belum diatur" : new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function nextMatch(matches: Match[]): Match | undefined {
  const playable = matches.filter((match) => !match.result && !match.isBye && match.teamAId && match.teamBId);
  return [...playable].sort((a, b) => {
    const statusOrder = (match: Match) => (match.operationalStatus === "in_progress" ? 0 : 1);
    return statusOrder(a) - statusOrder(b) || (a.scheduledAt ?? "9999").localeCompare(b.scheduledAt ?? "9999") || a.id.localeCompare(b.id);
  })[0];
}

function MatchResultCell({ match, teamsById }: { match: Match; teamsById: Map<string, Team> }) {
  if (!match.result) return <span className="match-table-status-pending">Belum main</span>;
  const scores = (match.setScores ?? []).map((score) => (score ? scoreLabel(score) : null)).filter(Boolean).join(" · ");
  if (match.result === "1-1") {
    return (
      <div>
        <span className="match-table-result-main">1–1</span>
        <p className="match-table-result-draw">Imbang{scores ? ` · ${scores}` : ""}</p>
      </div>
    );
  }
  const winnerLabel = teamLabel(match.winnerTeamId, teamsById, "-");
  return (
    <div>
      <span className="match-table-result-main">
        {match.isBye ? `Menang WO · ${winnerLabel}` : `${match.result} · ${winnerLabel}`}
      </span>
      {scores && !match.isBye && <p className="match-table-result-sets">{scores}</p>}
    </div>
  );
}

function GroupMatchRow({ match, teamsById, code }: { match: Match; teamsById: Map<string, Team>; code: string }) {
  const isDraw = match.result === "1-1";
  const nameClass = (side: "A" | "B") => {
    if (!match.result) return "";
    if (isDraw) return "score-line-name-draw";
    const teamId = side === "A" ? match.teamAId : match.teamBId;
    return match.winnerTeamId === teamId ? "score-line-name-winner" : "score-line-name-loser";
  };

  return (
    <tr>
      <td className="match-table-no">{code}</td>
      <td>
        <div className="match-table-teams">
          <span className={`match-table-team ${nameClass("A")}`}>{teamLabel(match.teamAId, teamsById, "-")}</span>
          <span className={`match-table-team ${nameClass("B")}`}>{teamLabel(match.teamBId, teamsById, "-")}</span>
        </div>
      </td>
      <td>
        <MatchResultCell match={match} teamsById={teamsById} />
      </td>
      <td colSpan={2}>
        <MatchOperations match={match} />
      </td>
      <td>
        <MatchStatusCell match={match} />
      </td>
    </tr>
  );
}

export function ScheduleScreen({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { state } = useTournament();
  const teamsById = new Map(state.teams.map((team) => [team.id, team]));
  const groupMatches = (groupId: "A" | "B") => state.matches.filter((match) => match.stage === "group" && match.groupId === groupId);
  const semifinal1 = state.matches.find((match) => match.id === "semifinal-1");
  const semifinal2 = state.matches.find((match) => match.id === "semifinal-2");
  const final = state.matches.find((match) => match.id === "final");
  const thirdPlace = state.matches.find((match) => match.id === "third-place");
  const upcoming = nextMatch(state.matches);

  const allMatchesCount = state.matches.filter((m) => !(m.stage === "third_place" && !m.teamAId && !m.teamBId)).length;
  const doneCount = state.matches.filter((m) => m.result !== null).length;
  const everythingDone = allMatchesCount > 0 && doneCount === allMatchesCount;

  const sf1Done = Boolean(semifinal1?.result);
  const sf2Done = Boolean(semifinal2?.result);
  const championDone = Boolean(final?.winnerTeamId);

  const championTeam = final?.winnerTeamId ? teamsById.get(final.winnerTeamId) : undefined;
  const championNames = championTeam ? teamPlayerNames(championTeam, state.participants) : null;

  return (
    <section>
      <PageHeader
        title="Jadwal & Bagan"
        description="Fase grup menentukan dua tim terbaik, lalu bagan gugur mempertemukan grup secara silang."
        actions={
          <Button variant="secondary" icon={<Printer size={16} />} onClick={() => window.print()}>
            Cetak bagan
          </Button>
        }
      />

      <div className="next-match-strip" aria-live="polite">
        {everythingDone ? (
          <div>
            <p className="next-match-strip-label">Status</p>
            <p className="next-match-strip-main">Semua {allMatchesCount} pertandingan selesai</p>
          </div>
        ) : (
          <div>
            <p className="next-match-strip-label">Pertandingan berikutnya</p>
            {upcoming ? (
              <>
                <p className="next-match-strip-main">
                  {teamLabel(upcoming.teamAId, teamsById, "Menunggu")} vs {teamLabel(upcoming.teamBId, teamsById, "Menunggu")}
                </p>
                <p className="next-match-strip-meta mono-num">
                  {formatScheduleTime(upcoming.scheduledAt)} · {upcoming.court || "Lapangan belum diatur"}
                  {upcoming.operationalStatus === "in_progress" ? " · Sedang berlangsung" : ""}
                </p>
              </>
            ) : (
              <p className="next-match-strip-main">Belum ada pertandingan yang siap dimainkan.</p>
            )}
          </div>
        )}
        {everythingDone && (
          <Button variant="secondary" icon={<ArrowRight size={16} />} onClick={() => onNavigate("juara")}>
            Lihat juara
          </Button>
        )}
      </div>

      {semifinal1 && semifinal2 && final && (
        <div className="bracket-scroll">
          <div className="bracket-grid">
            <div className="bracket-col-semis">
              <BracketMatchCard
                roundLabel="Semifinal 1"
                done={sf1Done}
                sideA={buildSide(semifinal1.teamAId, teamsById, state.participants, semifinal1, "A", "A1")}
                sideB={buildSide(semifinal1.teamBId, teamsById, state.participants, semifinal1, "B", "B2")}
                winnerSide={semifinal1.winnerTeamId ? (semifinal1.winnerTeamId === semifinal1.teamAId ? "A" : "B") : null}
                placeholderA="Juara Grup A"
                placeholderB="Runner-up Grup B"
              />
              <BracketMatchCard
                roundLabel="Semifinal 2"
                done={sf2Done}
                sideA={buildSide(semifinal2.teamAId, teamsById, state.participants, semifinal2, "A", "B1")}
                sideB={buildSide(semifinal2.teamBId, teamsById, state.participants, semifinal2, "B", "A2")}
                winnerSide={semifinal2.winnerTeamId ? (semifinal2.winnerTeamId === semifinal2.teamAId ? "A" : "B") : null}
                placeholderA="Juara Grup B"
                placeholderB="Runner-up Grup A"
              />
            </div>

            <div className="bracket-connector-1" aria-hidden="true">
              <div className={`bracket-connector-1-top ${sf1Done ? "bracket-connector-1-active" : ""}`} />
              <div className={`bracket-connector-1-bottom ${sf2Done ? "bracket-connector-1-active" : ""}`} />
              <div className={`bracket-connector-1-line ${sf1Done && sf2Done ? "bracket-connector-1-active" : ""}`} />
            </div>

            <BracketMatchCard
              roundLabel="Final"
              done={championDone}
              sideA={buildSide(final.teamAId, teamsById, state.participants, final, "A")}
              sideB={buildSide(final.teamBId, teamsById, state.participants, final, "B")}
              winnerSide={final.winnerTeamId ? (final.winnerTeamId === final.teamAId ? "A" : "B") : null}
              placeholderA="Pemenang Semifinal 1"
              placeholderB="Pemenang Semifinal 2"
            />

            <div className={`bracket-connector-2 ${championDone ? "bracket-connector-2-active" : ""}`} aria-hidden="true" />

            {championTeam && championNames ? (
              <div className="champion-slot">
                <span className="champion-slot-label">
                  <Trophy size={14} />
                  Juara
                </span>
                <p className="champion-slot-name">
                  {championNames[0]} &amp; {championNames[1]}
                </p>
                <p className="champion-slot-sub mono-num">Tim {championTeam.seq}</p>
              </div>
            ) : (
              <div className="champion-slot-empty">Menunggu final</div>
            )}
          </div>
        </div>
      )}

      {thirdPlace && (thirdPlace.teamAId || thirdPlace.teamBId) && (
        <div className="third-place-wrap">
          <p className="bracket-col-label third-place-label">Perebutan Juara 3</p>
          <BracketMatchCard
            roundLabel="Perebutan Juara 3"
            done={Boolean(thirdPlace.result)}
            sideA={buildSide(thirdPlace.teamAId, teamsById, state.participants, thirdPlace, "A")}
            sideB={buildSide(thirdPlace.teamBId, teamsById, state.participants, thirdPlace, "B")}
            winnerSide={thirdPlace.winnerTeamId ? (thirdPlace.winnerTeamId === thirdPlace.teamAId ? "A" : "B") : null}
            placeholderA="Kalah Semifinal 1"
            placeholderB="Kalah Semifinal 2"
          />
        </div>
      )}

      <div className="group-table-section">
        <div className="card group-table-wrap">
          <table className="match-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Pertandingan</th>
                <th>Hasil</th>
                <th colSpan={2}>Waktu &amp; Lapangan</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(["A", "B"] as const).map((groupId) => (
                <Fragment key={groupId}>
                  <tr className="match-table-group-row">
                    <td colSpan={6}>Fase Grup {groupId}</td>
                  </tr>
                  {groupMatches(groupId).map((match, i) => (
                    <GroupMatchRow key={match.id} match={match} teamsById={teamsById} code={`${groupId}${i + 1}`} />
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
