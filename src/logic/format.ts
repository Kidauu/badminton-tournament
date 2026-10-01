import type { Participant, Team } from "../types/tournament";

export function participantName(participants: Participant[], id: string): string {
  return participants.find((p) => p.id === id)?.name ?? "?";
}

export function teamPlayerNames(team: Team, participants: Participant[]): [string, string] {
  return [participantName(participants, team.playerAId), participantName(participants, team.playerBId)];
}
