import type { GroupId, Match, Team } from "../types/tournament";

export interface GroupAssignment {
  teamId: string;
  groupId: GroupId;
}

/** Creates the round-robin group fixtures plus the empty knockout bracket. */
export function generateGroupTournament(
  teams: Team[],
  assignments: GroupAssignment[],
): { matches: Match[]; byes: [] } {
  const teamsByGroup: Record<GroupId, Team[]> = { A: [], B: [] };
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  for (const assignment of assignments) {
    const team = teamsById.get(assignment.teamId);
    if (team) teamsByGroup[assignment.groupId].push(team);
  }

  const sizeA = teamsByGroup.A.length;
  const sizeB = teamsByGroup.B.length;
  if (sizeA + sizeB !== teams.length || Math.abs(sizeA - sizeB) > 1) return { matches: [], byes: [] };

  const groupMatches = (Object.entries(teamsByGroup) as [GroupId, Team[]][]).flatMap(([groupId, groupTeams]) => {
    const matches: Match[] = [];
    for (let i = 0; i < groupTeams.length; i += 1) {
      for (let j = i + 1; j < groupTeams.length; j += 1) {
        matches.push({
          id: `group-${groupId}-${i + 1}-${j + 1}`,
          round: 1,
          stage: "group",
          groupId,
          teamAId: groupTeams[i].id,
          teamBId: groupTeams[j].id,
          result: null,
          winnerTeamId: null,
          nextMatchId: null,
          nextMatchSlot: null,
        });
      }
    }
    return matches;
  });

  return {
    matches: [
      ...groupMatches,
      {
        id: "semifinal-1",
        round: 2,
        stage: "semifinal",
        teamAId: null,
        teamBId: null,
        result: null,
        winnerTeamId: null,
        nextMatchId: "final",
        nextMatchSlot: "A",
        loserNextMatchId: "third-place",
        loserNextMatchSlot: "A",
      },
      {
        id: "semifinal-2",
        round: 2,
        stage: "semifinal",
        teamAId: null,
        teamBId: null,
        result: null,
        winnerTeamId: null,
        nextMatchId: "final",
        nextMatchSlot: "B",
        loserNextMatchId: "third-place",
        loserNextMatchSlot: "B",
      },
      {
        id: "final",
        round: 3,
        stage: "final",
        teamAId: null,
        teamBId: null,
        result: null,
        winnerTeamId: null,
        nextMatchId: null,
        nextMatchSlot: null,
      },
      {
        id: "third-place",
        round: 3,
        stage: "third_place",
        teamAId: null,
        teamBId: null,
        result: null,
        winnerTeamId: null,
        nextMatchId: null,
        nextMatchSlot: null,
      },
    ],
    byes: [],
  };
}
