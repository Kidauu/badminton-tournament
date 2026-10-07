import { Check } from "lucide-react";
import type { ScoreLineCell } from "./ScoreLine";

export interface BracketSide {
  seed?: string;
  name: string;
  members?: string;
  cells: ScoreLineCell[];
}

interface BracketMatchCardProps {
  roundLabel: string;
  done: boolean;
  sideA: BracketSide | null;
  sideB: BracketSide | null;
  winnerSide: "A" | "B" | null;
  placeholderA: string;
  placeholderB: string;
}

function BracketCardRow({ side, isWinner, placeholder }: { side: BracketSide | null; isWinner: boolean; placeholder: string }) {
  return (
    <div className={`bracket-card-row ${isWinner ? "bracket-card-row-winner" : ""}`}>
      {side?.seed && <span className="bracket-card-seed">{side.seed}</span>}
      <div className="bracket-card-team">
        <span className={`bracket-card-name ${!side ? "bracket-card-name-pending" : isWinner ? "bracket-card-name-winner" : "bracket-card-name-loser"}`}>
          {side?.members ?? (side ? side.name : placeholder)}
        </span>
        {side?.members && <span className="bracket-card-team-label">{side.name}</span>}
      </div>
      {side && (
        <div className="bracket-card-sets">
          {side.cells.map((cell, i) => (
            <span key={i} className={`bracket-card-set ${cell.won ? "bracket-card-set-won" : ""}`}>
              {cell.value === null ? "" : cell.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function BracketMatchCard({ roundLabel, done, sideA, sideB, winnerSide, placeholderA, placeholderB }: BracketMatchCardProps) {
  return (
    <div className="bracket-card">
      <div className="bracket-card-head">
        <span>{roundLabel}</span>
        {done && (
          <span className="bracket-card-done">
            <Check />
            Selesai
          </span>
        )}
      </div>
      <div className="bracket-card-body">
        <BracketCardRow side={sideA} isWinner={winnerSide === "A"} placeholder={placeholderA} />
        <BracketCardRow side={sideB} isWinner={winnerSide === "B"} placeholder={placeholderB} />
      </div>
    </div>
  );
}
