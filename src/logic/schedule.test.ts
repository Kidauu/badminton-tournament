import { describe, expect, it } from "vitest";
import { generateGroupTournament } from "./schedule";
import type { Team } from "../types/tournament";

const teams: Team[] = Array.from({ length: 7 }, (_, index) => ({
  id: `t${index + 1}`,
  seq: index + 1,
  playerAId: `p${index * 2 + 1}`,
  playerBId: `p${index * 2 + 2}`,
}));

describe("generateGroupTournament", () => {
  const assignments = teams.map((team, index) => ({ teamId: team.id, groupId: index < 4 ? ("A" as const) : ("B" as const) }));
  const { matches } = generateGroupTournament(teams, assignments);

  it("creates 6 Group A fixtures, 3 Group B fixtures, two semifinals, a final, and a third-place match", () => {
    expect(matches.filter((match) => match.stage === "group" && match.groupId === "A")).toHaveLength(6);
    expect(matches.filter((match) => match.stage === "group" && match.groupId === "B")).toHaveLength(3);
    expect(matches.filter((match) => match.stage === "semifinal")).toHaveLength(2);
    expect(matches.filter((match) => match.stage === "final")).toHaveLength(1);
    expect(matches.filter((match) => match.stage === "third_place")).toHaveLength(1);
  });

  it("wires each semifinal's loser into the third-place match", () => {
    const semifinal1 = matches.find((match) => match.id === "semifinal-1")!;
    const semifinal2 = matches.find((match) => match.id === "semifinal-2")!;
    expect(semifinal1.loserNextMatchId).toBe("third-place");
    expect(semifinal1.loserNextMatchSlot).toBe("A");
    expect(semifinal2.loserNextMatchId).toBe("third-place");
    expect(semifinal2.loserNextMatchSlot).toBe("B");
  });

  it("requires a balanced group split (sizes may differ by at most 1)", () => {
    expect(generateGroupTournament(teams, assignments.slice(0, 6)).matches).toHaveLength(0);
  });

  it("supports other balanced splits, e.g. 3 teams and 3 teams", () => {
    const sixTeams = teams.slice(0, 6);
    const sixAssignments = sixTeams.map((team, index) => ({ teamId: team.id, groupId: index < 3 ? ("A" as const) : ("B" as const) }));
    const { matches } = generateGroupTournament(sixTeams, sixAssignments);
    expect(matches.filter((match) => match.stage === "group" && match.groupId === "A")).toHaveLength(3);
    expect(matches.filter((match) => match.stage === "group" && match.groupId === "B")).toHaveLength(3);
    expect(matches.filter((match) => match.stage === "semifinal")).toHaveLength(2);
    expect(matches.filter((match) => match.stage === "final")).toHaveLength(1);
  });
});
