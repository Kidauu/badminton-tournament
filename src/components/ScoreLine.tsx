import { Check } from "lucide-react";

export interface ScoreLineCell {
  value: number | null;
  won: boolean;
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
