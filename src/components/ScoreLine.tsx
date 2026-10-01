import { Check } from "lucide-react";
import type { Match } from "../types/tournament";

export interface ScoreLineCell {
  value: number | null;
  won: boolean;
}

/** Reads one side's per-set scores from a match, padded to `cellCount` so group (2) and knockout (3) rows line up. */
export function cellsFromMatch(match: Match | undefined, side: "A" | "B", cellCount: 2 | 3): ScoreLineCell[] {
  const scores = match?.setScores ?? [];
  return Array.from({ length: cellCount }, (_, i) => {
    const s = scores[i];
    if (!s) return { value: null, won: false };
    const mine = side === "A" ? s.teamAScore : s.teamBScore;
    const theirs = side === "A" ? s.teamBScore : s.teamAScore;
    return { value: mine, won: mine > theirs };
  });
}

interface ScoreLineProps {
  name: string;
  members?: string;
  isWinner: boolean;
  isDraw?: boolean;
  cells: ScoreLineCell[];
}

export function ScoreLine({ name, members, isWinner, isDraw, cells }: ScoreLineProps) {
  const nameClass = isDraw ? "score-line-name-draw" : isWinner ? "score-line-name-winner" : "score-line-name-loser";

  return (
    <div className="score-line">
      <div className="score-line-team">
        <div className="score-line-name-row">
          <span className={`score-line-name ${nameClass}`}>{name}</span>
          {isWinner && !isDraw && <Check className="score-line-check" size={16} aria-hidden="true" />}
        </div>
        {members && <span className="score-line-members">{members}</span>}
      </div>
      <div className="score-line-sets">
        {cells.map((cell, i) => (
          <span key={i} className={`score-line-set ${cell.won ? "score-line-set-won" : ""}`}>
            {cell.value === null ? "–" : cell.value}
          </span>
        ))}
      </div>
    </div>
  );
}
