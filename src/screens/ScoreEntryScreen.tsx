import { useTournament } from "../state/TournamentContext";
import { MatchScoreRow } from "./MatchScoreRow";
import type { Match } from "../types/tournament";

function ScoreList({ matches, teamsById, waitingMessage }: { matches: Match[]; teamsById: Map<string, { seq: number }>; waitingMessage?: string }) {
  const playableMatches = matches.filter((match) => match.teamAId && match.teamBId);
  return (
    <ul className="match-score-list">
      {playableMatches.map((match) => (
        <MatchScoreRow
          key={match.id}
          match={match}
          teamALabel={`Tim ${teamsById.get(match.teamAId!)?.seq}`}
          teamBLabel={`Tim ${teamsById.get(match.teamBId!)?.seq}`}
        />
      ))}
      {playableMatches.length === 0 && waitingMessage && <li className="match-waiting">{waitingMessage}</li>}
    </ul>
  );
}

export function ScoreEntryScreen() {
  const { state } = useTournament();
  const teamsById = new Map(state.teams.map((team) => [team.id, team]));
  const groupMatches = (groupId: "A" | "B") => state.matches.filter((match) => match.stage === "group" && match.groupId === groupId);
  const semifinals = state.matches.filter((match) => match.stage === "semifinal");
  const final = state.matches.filter((match) => match.stage === "final");
  const thirdPlace = state.matches.filter((match) => match.stage === "third_place");

  return (
    <section className="screen">
      <h1>Input Skor</h1>
      <p>Fase grup dimainkan 2 set: menang 2-0 mendapat 3 poin, imbang 1-1 mendapat 1 poin untuk masing-masing tim.</p>
      {(["A", "B"] as const).map((groupId) => (
        <div key={groupId} className="round-card">
          <h2>Fase Grup {groupId}</h2>
          <ScoreList matches={groupMatches(groupId)} teamsById={teamsById} />
        </div>
      ))}
      <div className="round-card">
        <h2>Semifinal</h2>
        <p>Karena harus ada tim yang lolos, pilih pemenang semifinal.</p>
        <ScoreList matches={semifinals} teamsById={teamsById} waitingMessage="Semifinal terbuka setelah semua pertandingan grup selesai." />
      </div>
      <div className="round-card">
        <h2>Final</h2>
        <p>Pilih pemenang final untuk menetapkan juara.</p>
        <ScoreList matches={final} teamsById={teamsById} waitingMessage="Menunggu pemenang kedua semifinal." />
      </div>
      <div className="round-card">
        <h2>Perebutan Juara 3</h2>
        <p>Pilih pemenang untuk menetapkan juara 3.</p>
        <ScoreList matches={thirdPlace} teamsById={teamsById} waitingMessage="Menunggu kedua tim yang kalah di semifinal." />
      </div>
    </section>
  );
}
