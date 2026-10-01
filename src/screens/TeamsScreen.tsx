import { useTournament } from "../state/TournamentContext";
import { teamPlayerNames } from "../logic/format";
import type { TabId } from "../types/nav";

export function TeamsScreen({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { state } = useTournament();
  const totalTeams = state.participants.length / 2;
  const complete = state.teams.length === totalTeams;
  const groupsComplete = state.groupAssignments.length === totalTeams;
  const groupByTeamId = new Map(state.groupAssignments.map((assignment) => [assignment.teamId, assignment.groupId]));

  return (
    <section className="screen">
      <h1>Tim</h1>
      {!complete && <p>{state.teams.length} dari {totalTeams} tim terbentuk. Lanjutkan undian untuk membentuk tim lainnya.</p>}
      <ul className="teams-grid">
        {state.teams.map((team) => {
          const [a, b] = teamPlayerNames(team, state.participants);
          return (
            <li key={team.id} className="team-card">
              <span className="team-card-label">Tim {team.seq}</span>
              {groupsComplete && <span>Grup {groupByTeamId.get(team.id)}</span>}
              <span>
                {a} &amp; {b}
              </span>
            </li>
          );
        })}
      </ul>
      {complete && !groupsComplete && (
        <div className="spin-wheel-actions">
          <button className="btn btn-primary" onClick={() => onNavigate("undian")}>
            Lanjut Undian Grup
          </button>
        </div>
      )}
      {groupsComplete && (
        <div className="spin-wheel-actions">
          <button className="btn btn-primary" onClick={() => onNavigate("jadwal")}>
            Lihat Jadwal Grup
          </button>
        </div>
      )}
    </section>
  );
}
