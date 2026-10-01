import { useTournament } from "../state/TournamentContext";
import { teamPlayerNames } from "../logic/format";
import { Confetti } from "../components/Confetti";
import type { Match } from "../types/tournament";

function loserOf(match: Match | undefined): string | null {
  if (!match || match.isBye || !match.winnerTeamId || !match.teamAId || !match.teamBId) return null;
  return match.winnerTeamId === match.teamAId ? match.teamBId : match.teamAId;
}

export function ChampionScreen() {
  const { state } = useTournament();
  const teamsById = new Map(state.teams.map((t) => [t.id, t]));
  const final = state.matches.find((match) => match.id === "final");
  const championTeam = final?.winnerTeamId ? teamsById.get(final.winnerTeamId) : undefined;
  const names = championTeam ? teamPlayerNames(championTeam, state.participants) : null;

  const runnerUpId = loserOf(final);
  const runnerUpTeam = runnerUpId ? teamsById.get(runnerUpId) : undefined;

  const thirdPlace = state.matches.find((match) => match.id === "third-place");
  const thirdPlaceTeam = thirdPlace?.winnerTeamId ? teamsById.get(thirdPlace.winnerTeamId) : undefined;

  return (
    <section className="screen champion-screen">
      <Confetti trigger={1} />
      <p className="champion-label">🏆 JUARA 🏆</p>
      <h1 className="champion-name">{championTeam ? `Tim ${championTeam.seq}` : "-"}</h1>
      {names && (
        <p className="champion-players">
          {names[0]} &amp; {names[1]}
        </p>
      )}
      <p className="champion-players">Menang di final dan menjadi juara turnamen.</p>
      {(runnerUpTeam || thirdPlaceTeam) && (
        <div className="champion-secondary">
          {runnerUpTeam && (
            <div className="champion-secondary-card">
              <p className="champion-secondary-label">🥈 Juara 2</p>
              <p className="champion-secondary-name">Tim {runnerUpTeam.seq}</p>
              <p className="champion-secondary-players">{teamPlayerNames(runnerUpTeam, state.participants).join(" & ")}</p>
            </div>
          )}
          {thirdPlaceTeam && (
            <div className="champion-secondary-card">
              <p className="champion-secondary-label">🥉 Juara 3</p>
              <p className="champion-secondary-name">Tim {thirdPlaceTeam.seq}</p>
              <p className="champion-secondary-players">{teamPlayerNames(thirdPlaceTeam, state.participants).join(" & ")}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
