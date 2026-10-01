import { scoreLabel } from "../logic/scoring";
import { MatchOperations } from "../components/MatchOperations";
import { useTournament } from "../state/TournamentContext";
import type { Match } from "../types/tournament";

function teamLabel(teamId: string | null, teamsById: Map<string, { seq: number }>, fallback: string): string {
  return teamId ? `Tim ${teamsById.get(teamId)?.seq ?? "?"}` : fallback;
}

function resultLabel(match: Match, teamsById: Map<string, { seq: number }>) {
  if (match.isBye && match.winnerTeamId) {
    return `Menang WO: Tim ${teamsById.get(match.winnerTeamId)?.seq} (grup lawan tidak punya runner-up)`;
  }
  const scores = (match.setScores ?? []).map((score) => (score ? scoreLabel(score) : null)).filter(Boolean).join(", ");
  const result = match.result === "1-1" ? "Imbang 1-1" : match.winnerTeamId ? `Menang: Tim ${teamsById.get(match.winnerTeamId)?.seq} (${match.result})` : "Belum main";
  return scores ? `${result} · ${scores}` : result;
}

function MatchList({ matches, teamsById }: { matches: Match[]; teamsById: Map<string, { seq: number }> }) {
  return (
    <ul>
      {matches.map((match) => (
        <li key={match.id} className="match-row">
          <span>{teamLabel(match.teamAId, teamsById, "-")}</span><span className="vs">vs</span><span>{teamLabel(match.teamBId, teamsById, "-")}</span>
          <span className="match-result">{resultLabel(match, teamsById)}</span>
          <MatchOperations match={match} />
        </li>
      ))}
    </ul>
  );
}

function nextMatch(matches: Match[]): Match | undefined {
  const playable = matches.filter((match) => !match.result && !match.isBye && match.teamAId && match.teamBId);
  return [...playable].sort((a, b) => {
    const statusOrder = (match: Match) => match.operationalStatus === "in_progress" ? 0 : 1;
    return statusOrder(a) - statusOrder(b) || (a.scheduledAt ?? "9999").localeCompare(b.scheduledAt ?? "9999") || a.id.localeCompare(b.id);
  })[0];
}

function formatScheduleTime(value?: string): string {
  if (!value) return "Waktu belum diatur";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "Waktu belum diatur" : new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function BracketMatch({ match, teamsById, labelA, labelB }: { match: Match; teamsById: Map<string, { seq: number }>; labelA: string; labelB: string }) {
  return (
    <div className="bracket-match">
      <div className={match.winnerTeamId === match.teamAId ? "bracket-team bracket-team-winner" : "bracket-team"}>{teamLabel(match.teamAId, teamsById, labelA)}</div>
      <div className={match.winnerTeamId === match.teamBId ? "bracket-team bracket-team-winner" : "bracket-team"}>{teamLabel(match.teamBId, teamsById, labelB)}</div>
      <span className="bracket-result">{resultLabel(match, teamsById)}</span>
      <MatchOperations match={match} />
    </div>
  );
}

export function ScheduleScreen() {
  const { state } = useTournament();
  const teamsById = new Map(state.teams.map((team) => [team.id, team]));
  const groupMatches = (groupId: "A" | "B") => state.matches.filter((match) => match.stage === "group" && match.groupId === groupId);
  const semifinal1 = state.matches.find((match) => match.id === "semifinal-1");
  const semifinal2 = state.matches.find((match) => match.id === "semifinal-2");
  const final = state.matches.find((match) => match.id === "final");
  const thirdPlace = state.matches.find((match) => match.id === "third-place");
  const upcoming = nextMatch(state.matches);

  return (
    <section className="screen">
      <h1>Jadwal &amp; Bagan Turnamen</h1>
      <p>Fase grup menentukan dua tim terbaik, lalu bagan gugur mempertemukan grup secara silang.</p>
      <div className="next-match-card" aria-live="polite">
        <span>Pertandingan berikutnya</span>
        {upcoming ? (
          <strong>
            {teamLabel(upcoming.teamAId, teamsById, "Menunggu")} vs {teamLabel(upcoming.teamBId, teamsById, "Menunggu")}
            <small>{formatScheduleTime(upcoming.scheduledAt)} · {upcoming.court || "Lapangan belum diatur"}{upcoming.operationalStatus === "in_progress" ? " · Sedang berlangsung" : ""}</small>
          </strong>
        ) : <strong>Belum ada pertandingan yang siap dimainkan.</strong>}
      </div>
      {(["A", "B"] as const).map((groupId) => (
        <div key={groupId} className="round-card card">
          <h2>Fase Grup {groupId}</h2>
          <MatchList matches={groupMatches(groupId)} teamsById={teamsById} />
        </div>
      ))}
      {semifinal1 && semifinal2 && final && (
        <div className="bracket-wrap" aria-label="Bagan semifinal dan final">
          <h2>Bagan Fase Gugur</h2>
          <div className="knockout-bracket">
            <div className="bracket-column bracket-semifinals">
              <h3>Semifinal</h3>
              <BracketMatch match={semifinal1} teamsById={teamsById} labelA="Juara Grup A" labelB="Runner-up Grup B" />
              <BracketMatch match={semifinal2} teamsById={teamsById} labelA="Juara Grup B" labelB="Runner-up Grup A" />
            </div>
            <div className="bracket-connector" aria-hidden="true">➜</div>
            <div className="bracket-column bracket-final">
              <h3>Final</h3>
              <BracketMatch match={final} teamsById={teamsById} labelA="Pemenang Semifinal 1" labelB="Pemenang Semifinal 2" />
            </div>
          </div>
        </div>
      )}
      {thirdPlace && (thirdPlace.teamAId || thirdPlace.teamBId) && (
        <div className="round-card card">
          <h2>Perebutan Juara 3</h2>
          <div className="bracket-match-standalone">
            <BracketMatch match={thirdPlace} teamsById={teamsById} labelA="Kalah Semifinal 1" labelB="Kalah Semifinal 2" />
          </div>
        </div>
      )}
    </section>
  );
}
