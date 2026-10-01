import { ArrowRight } from "lucide-react";
import { useTournament } from "../state/TournamentContext";
import { teamPlayerNames } from "../logic/format";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/Button";
import { AvatarStack } from "../components/Avatar";
import type { TabId } from "../types/nav";
import type { GroupId, Team } from "../types/tournament";

function TeamCard({ team, names }: { team: Team; names: [string, string] }) {
  return (
    <div className="team-card">
      <span className="team-card-badge">{String(team.seq).padStart(2, "0")}</span>
      <div className="team-card-info">
        <p className="team-card-name">
          {names[0]} &amp; {names[1]}
        </p>
        <p className="team-card-sub">Tim {team.seq}</p>
      </div>
      <AvatarStack names={names} />
    </div>
  );
}

export function TeamsScreen({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { state } = useTournament();
  const totalTeams = state.participants.length / 2;
  const complete = state.teams.length === totalTeams;
  const groupsComplete = state.groupAssignments.length === totalTeams;
  const groupByTeamId = new Map(state.groupAssignments.map((assignment) => [assignment.teamId, assignment.groupId]));

  return (
    <section>
      <PageHeader
        title="Tim"
        countPill={`${state.teams.length} tim`}
        description="Pasangan hasil undian, dibagi ke dua grup. Dua tim teratas tiap grup lolos ke semifinal."
        actions={
          groupsComplete ? (
            <Button variant="primary" icon={<ArrowRight size={16} />} onClick={() => onNavigate("jadwal")}>
              Lihat jadwal
            </Button>
          ) : complete ? (
            <Button variant="primary" icon={<ArrowRight size={16} />} onClick={() => onNavigate("undian")}>
              Lanjut undian grup
            </Button>
          ) : undefined
        }
      />

      {!complete && (
        <p className="page-header-desc" style={{ marginBottom: 24 }}>
          {state.teams.length} dari {totalTeams} tim terbentuk. Lanjutkan undian untuk membentuk tim lainnya.
        </p>
      )}

      {groupsComplete ? (
        <div className="teams-columns">
          {(["A", "B"] as const).map((groupId) => {
            const teamsInGroup = state.teams.filter((team) => groupByTeamId.get(team.id) === (groupId as GroupId));
            return (
              <div key={groupId}>
                <div className="team-group-head">
                  <h2 className="text-h2">Grup {groupId}</h2>
                  <span className="team-group-count mono-num">{teamsInGroup.length} tim</span>
                </div>
                <div className="team-list">
                  {teamsInGroup.map((team) => (
                    <TeamCard key={team.id} team={team} names={teamPlayerNames(team, state.participants)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="team-list">
          {state.teams.map((team) => (
            <TeamCard key={team.id} team={team} names={teamPlayerNames(team, state.participants)} />
          ))}
        </div>
      )}
    </section>
  );
}
