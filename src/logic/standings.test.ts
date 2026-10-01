import { describe, it, expect } from "vitest";
import { computeStandings } from "./standings";
import type { Match, Team } from "../types/tournament";

function team(id: string, seq: number): Team {
  return { id, seq, playerAId: `${id}-a`, playerBId: `${id}-b` };
}

function played2_0(id: string, round: number, teamAId: string, teamBId: string, winnerTeamId: string): Match {
  return { id, round, teamAId, teamBId, result: "2-0", winnerTeamId };
}

function drawn1_1(id: string, round: number, teamAId: string, teamBId: string): Match {
  return { id, round, teamAId, teamBId, result: "1-1", winnerTeamId: null };
}

describe("computeStandings", () => {
  it("breaks a 2-way tie on points using point difference", () => {
    const teams = [team("t1", 1), team("t2", 2), team("t3", 3), team("t4", 4)];
    const matches: Match[] = [
      { ...played2_0("m1", 1, "t1", "t2", "t1"), setScores: [{ teamAScore: 21, teamBScore: 10 }, { teamAScore: 21, teamBScore: 10 }, null] },
      { ...played2_0("m2", 1, "t1", "t3", "t3"), setScores: [{ teamAScore: 19, teamBScore: 21 }, { teamAScore: 19, teamBScore: 21 }, null] },
      { ...played2_0("m3", 2, "t2", "t4", "t2"), setScores: [{ teamAScore: 21, teamBScore: 15 }, { teamAScore: 21, teamBScore: 15 }, null] },
      { ...played2_0("m4", 2, "t2", "t3", "t2"), setScores: [{ teamAScore: 21, teamBScore: 19 }, { teamAScore: 21, teamBScore: 19 }, null] },
      { ...played2_0("m5", 3, "t1", "t4", "t1"), setScores: [{ teamAScore: 21, teamBScore: 5 }, { teamAScore: 21, teamBScore: 5 }, null] },
    ];
    const rows = computeStandings(teams, matches);
    const byId = new Map(rows.map((r) => [r.teamId, r]));

    expect(byId.get("t1")!.won).toBe(2);
    expect(byId.get("t2")!.won).toBe(2);
    expect(byId.get("t1")!.points).toBe(byId.get("t2")!.points);

    // Same wins and points, but t1 won by wider margins -> better point difference.
    expect(byId.get("t1")!.pointDiff).toBeGreaterThan(byId.get("t2")!.pointDiff);
    expect(byId.get("t1")!.rank).toBeLessThan(byId.get("t2")!.rank);
    expect(byId.get("t1")!.needsManualDraw).toBe(false);
    expect(byId.get("t2")!.needsManualDraw).toBe(false);
  });

  it("flags a genuine 3-way cyclic tie for manual draw", () => {
    // t1 beat t2, t2 beat t3, t3 beat t1: each has 1 win, 1 loss, 3 points,
    // identical head-to-head, set differential, match points, and sets won
    // within the tied trio -> irreducibly tied, must never be silently ordered.
    const teams = [team("t1", 1), team("t2", 2), team("t3", 3), team("t4", 4)];
    const matches: Match[] = [
      played2_0("m1", 1, "t1", "t2", "t1"),
      played2_0("m2", 2, "t2", "t3", "t2"),
      played2_0("m3", 3, "t3", "t1", "t3"),
    ];
    const rows = computeStandings(teams, matches);
    const byId = new Map(rows.map((r) => [r.teamId, r]));

    expect(byId.get("t1")!.won).toBe(1);
    expect(byId.get("t2")!.won).toBe(1);
    expect(byId.get("t3")!.won).toBe(1);

    expect(byId.get("t1")!.rank).toBe(byId.get("t2")!.rank);
    expect(byId.get("t2")!.rank).toBe(byId.get("t3")!.rank);
    expect(byId.get("t1")!.needsManualDraw).toBe(true);
    expect(byId.get("t2")!.needsManualDraw).toBe(true);
    expect(byId.get("t3")!.needsManualDraw).toBe(true);
    expect(byId.get("t1")!.tiedWith.sort()).toEqual(["t2", "t3"]);
    expect(byId.get("t2")!.tiedWith.sort()).toEqual(["t1", "t3"]);
    expect(byId.get("t3")!.tiedWith.sort()).toEqual(["t1", "t2"]);

    // t4 didn't play — 0 points, ranked separately below the tied trio.
    expect(byId.get("t4")!.needsManualDraw).toBe(false);
    expect(byId.get("t4")!.rank).toBeGreaterThan(byId.get("t1")!.rank);
  });

  it("counts played/won/drawn/lost correctly, including draws", () => {
    const teams = [team("t1", 1), team("t2", 2)];
    const matches: Match[] = [drawn1_1("m1", 1, "t1", "t2")];
    const rows = computeStandings(teams, matches);
    for (const row of rows) {
      expect(row.played).toBe(1);
      expect(row.won).toBe(0);
      expect(row.drawn).toBe(1);
      expect(row.lost).toBe(0);
    }
  });

  it("ranks a 3-way points tie by point difference", () => {
    const teams = [team("t1", 1), team("t2", 2), team("t3", 3)];
    const matches: Match[] = [
      {
        ...played2_0("m1", 1, "t1", "t2", "t1"),
        setScores: [{ teamAScore: 21, teamBScore: 5 }, { teamAScore: 21, teamBScore: 5 }, null],
      },
      {
        ...played2_0("m2", 1, "t2", "t3", "t2"),
        setScores: [{ teamAScore: 21, teamBScore: 5 }, { teamAScore: 21, teamBScore: 5 }, null],
      },
      {
        ...played2_0("m3", 1, "t3", "t1", "t3"),
        setScores: [{ teamAScore: 21, teamBScore: 19 }, { teamAScore: 21, teamBScore: 19 }, null],
      },
    ];
    const rows = computeStandings(teams, matches);

    // All three are tied on points (one win, one loss each) -> ranked by point difference.
    expect(rows[0].teamId).toBe("t1");
    expect(rows[0].pointDiff).toBeGreaterThan(rows[1].pointDiff);
    expect(rows[1].pointDiff).toBeGreaterThan(rows[2].pointDiff);
  });
});
