import type { GroupId, Match, Team } from "../types/tournament";

export interface StandingsRow {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  matchPoints: number;
  matchPointsConceded: number;
  pointDiff: number;
  setsWon: number;
  setsLost: number;
  rank: number;
  /** Other teamIds this row is unresolved-tied with after every automatic
   * tiebreak tier — never silently ordered, must be surfaced in the UI. */
  tiedWith: string[];
  needsManualDraw: boolean;
}

interface TieKeys {
  pointDiff: number;
}

/** Filters a roster down to the teams assigned to one group. */
export function teamsInGroup(teams: Team[], groupAssignments: { teamId: string; groupId: GroupId }[], groupId: GroupId): Team[] {
  const idsInGroup = new Set(groupAssignments.filter((a) => a.groupId === groupId).map((a) => a.teamId));
  return teams.filter((t) => idsInGroup.has(t.id));
}

/**
 * `teams` must already be the full roster to rank — pre-filter with {@link teamsInGroup} when `groupId` is given.
 * Ranks teams by points, then applies the tiebreak order:
 *   1. point difference (points scored minus points conceded across all matches)
 *   2. if still tied: flagged for manual admin draw, never guessed at.
 */
export function computeStandings(teams: Team[], matches: Match[], groupId?: GroupId): StandingsRow[] {
  const rows = new Map<string, StandingsRow>();
  for (const t of teams) {
    rows.set(t.id, {
      teamId: t.id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      points: 0,
      matchPoints: 0,
      matchPointsConceded: 0,
      pointDiff: 0,
      setsWon: 0,
      setsLost: 0,
      rank: 0,
      tiedWith: [],
      needsManualDraw: false,
    });
  }

  for (const m of matches) {
    if (!m.result) continue;
    if (groupId && (m.stage !== "group" || m.groupId !== groupId)) continue;
    if (!m.teamAId || !m.teamBId) continue;
    const a = rows.get(m.teamAId);
    const b = rows.get(m.teamBId);
    if (!a || !b) continue;

    a.played += 1;
    b.played += 1;
    for (const score of m.setScores ?? []) {
      if (!score) continue;
      a.matchPoints += score.teamAScore;
      b.matchPoints += score.teamBScore;
      a.matchPointsConceded += score.teamBScore;
      b.matchPointsConceded += score.teamAScore;
    }

    if (m.result === "2-0") {
      const winner = m.winnerTeamId === m.teamAId ? a : b;
      const loser = winner === a ? b : a;
      winner.won += 1;
      loser.lost += 1;
      winner.points += 3;
      winner.setsWon += 2;
      loser.setsLost += 2;
    } else if (m.result === "1-1") {
      a.drawn += 1;
      b.drawn += 1;
      a.points += 1;
      b.points += 1;
      a.setsWon += 1;
      a.setsLost += 1;
      b.setsWon += 1;
      b.setsLost += 1;
    }
  }

  for (const row of rows.values()) {
    row.pointDiff = row.matchPoints - row.matchPointsConceded;
  }

  const pointGroups = new Map<number, StandingsRow[]>();
  for (const row of rows.values()) {
    const group = pointGroups.get(row.points) ?? [];
    group.push(row);
    pointGroups.set(row.points, group);
  }

  const orderedPointCounts = [...pointGroups.keys()].sort((a, b) => b - a);
  const ordered: StandingsRow[] = [];

  for (const pointCount of orderedPointCounts) {
    const group = pointGroups.get(pointCount);
    if (!group) continue;

    if (group.length === 1) {
      ordered.push(group[0]);
      continue;
    }

    const keyed = group.map((row) => ({ row, key: tieKeysFor(row) }));
    keyed.sort((x, y) => compareTieKeys(y.key, x.key));

    for (let i = 0; i < keyed.length; ) {
      let j = i + 1;
      while (j < keyed.length && compareTieKeys(keyed[j].key, keyed[i].key) === 0) {
        j += 1;
      }
      if (j - i > 1) {
        const clique = keyed.slice(i, j);
        const ids = clique.map((c) => c.row.teamId);
        for (const c of clique) {
          c.row.needsManualDraw = true;
          c.row.tiedWith = ids.filter((id) => id !== c.row.teamId);
        }
      }
      i = j;
    }

    for (const k of keyed) ordered.push(k.row);
  }

  let rank = 1;
  for (let i = 0; i < ordered.length; i++) {
    if (i > 0 && ordered[i].points === ordered[i - 1].points && ordered[i].tiedWith.includes(ordered[i - 1].teamId)) {
      ordered[i].rank = ordered[i - 1].rank;
    } else {
      ordered[i].rank = rank;
    }
    rank += 1;
  }

  return ordered;
}

function tieKeysFor(row: StandingsRow): TieKeys {
  return { pointDiff: row.pointDiff };
}

function compareTieKeys(a: TieKeys, b: TieKeys): number {
  return a.pointDiff - b.pointDiff;
}

export interface ClinchedPositions {
  /** Tim yang pasti juara grup, apa pun hasil sisa pertandingan; null jika belum pasti. */
  first: string | null;
  /** Tim yang pasti runner-up grup, apa pun hasil sisa pertandingan; null jika belum pasti. */
  second: string | null;
}

const MAX_REMAINING_MATCHES = 10;

/**
 * Posisi grup yang sudah pasti walau sisa pertandingan belum dimainkan.
 * Semua kemungkinan hasil sisa pertandingan (menang 2–0, imbang 1–1, kalah 0–2) dicoba.
 * Posisi dianggap pasti hanya jika poinnya SELALU lebih tinggi secara ketat dari tim lain
 * (selisih poin tidak diperhitungkan karena nilainya tidak terbatas), sehingga tidak pernah salah menebak.
 */
export function clinchedPositions(teams: Team[], matches: Match[], groupId: GroupId): ClinchedPositions {
  const ids = teams.map((t) => t.id);
  const idSet = new Set(ids);
  const base = new Map(ids.map((id) => [id, 0]));
  const remaining: [string, string][] = [];

  for (const m of matches) {
    if (m.stage !== "group" || m.groupId !== groupId || !m.teamAId || !m.teamBId) continue;
    if (!idSet.has(m.teamAId) || !idSet.has(m.teamBId)) continue;
    if (!m.result) {
      remaining.push([m.teamAId, m.teamBId]);
    } else if (m.result === "2-0") {
      const winner = m.winnerTeamId === m.teamAId ? m.teamAId : m.teamBId;
      base.set(winner, (base.get(winner) ?? 0) + 3);
    } else if (m.result === "1-1") {
      base.set(m.teamAId, (base.get(m.teamAId) ?? 0) + 1);
      base.set(m.teamBId, (base.get(m.teamBId) ?? 0) + 1);
    }
  }
  if (ids.length < 2 || remaining.length > MAX_REMAINING_MATCHES) return { first: null, second: null };

  const alwaysFirst = new Set(ids);
  const alwaysSecond = new Set(ids);

  function visit(index: number, points: Map<string, number>): void {
    if (index === remaining.length) {
      for (const id of ids) {
        const mine = points.get(id) ?? 0;
        let above = 0;
        let tied = 0;
        for (const other of ids) {
          if (other === id) continue;
          const theirs = points.get(other) ?? 0;
          if (theirs > mine) above += 1;
          else if (theirs === mine) tied += 1;
        }
        if (!(above === 0 && tied === 0)) alwaysFirst.delete(id);
        if (!(above === 1 && tied === 0)) alwaysSecond.delete(id);
      }
      return;
    }
    if (alwaysFirst.size === 0 && alwaysSecond.size === 0) return;
    const [a, b] = remaining[index];
    for (const [pa, pb] of [[3, 0], [1, 1], [0, 3]] as const) {
      const next = new Map(points);
      next.set(a, (next.get(a) ?? 0) + pa);
      next.set(b, (next.get(b) ?? 0) + pb);
      visit(index + 1, next);
    }
  }
  visit(0, base);

  return { first: [...alwaysFirst][0] ?? null, second: [...alwaysSecond][0] ?? null };
}
