import type { MatchSetScores, MatchStage, SetScore, SetResult } from "../types/tournament";

export interface MatchOutcome {
  result: SetResult;
  winnerSide: "A" | "B" | null;
}

function winnerOfStandardSet(score: SetScore): "A" | "B" | null {
  const { teamAScore: a, teamBScore: b } = score;
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a === b || a > 30 || b > 30) return null;
  if (a === 30 && b <= 29) return "A";
  if (b === 30 && a <= 29) return "B";
  if (a >= 21 && a - b >= 2) return "A";
  if (b >= 21 && b - a >= 2) return "B";
  return null;
}

function standardSetError(score: SetScore, setNumber: number): string | null {
  const { teamAScore: a, teamBScore: b } = score;
  if (!Number.isInteger(a) || !Number.isInteger(b)) return `Masukkan skor lengkap untuk Set ${setNumber}.`;
  if (a < 0 || b < 0 || a > 30 || b > 30) return `Skor Set ${setNumber} harus antara 0 sampai 30.`;
  if (a === b) return `Set ${setNumber} tidak boleh berakhir imbang.`;
  if (winnerOfStandardSet(score)) return null;
  if (a < 21 && b < 21) return `Set ${setNumber} belum selesai: pemenang harus mencapai minimal 21 poin.`;
  return `Set ${setNumber} harus unggul minimal 2 poin, kecuali saat mencapai 30 poin.`;
}

function winnerOfGoldenSet(score: SetScore | null): "A" | "B" | null {
  if (!score) return null;
  const { teamAScore: a, teamBScore: b } = score;
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a === b) return null;
  if (a === 15 && b < 15) return "A";
  if (b === 15 && a < 15) return "B";
  return null;
}

function goldenSetError(score: SetScore | null): string | null {
  if (!score || !Number.isInteger(score.teamAScore) || !Number.isInteger(score.teamBScore)) return "Set 1 dan 2 imbang 1-1. Masukkan skor golden set.";
  const { teamAScore: a, teamBScore: b } = score;
  if (a < 0 || b < 0 || a > 15 || b > 15) return "Skor golden set harus antara 0 sampai 15.";
  if (a === b) return "Golden set tidak boleh berakhir imbang.";
  if (winnerOfGoldenSet(score)) return null;
  return "Golden set belum selesai: pemenang harus mencapai 15 poin.";
}

/** Explains why a score cannot be saved, or returns null when it is valid. */
export function scoreValidationMessage(stage: MatchStage | undefined, scores: MatchSetScores): string | null {
  const firstError = standardSetError(scores[0], 1);
  if (firstError) return firstError;
  const secondError = standardSetError(scores[1], 2);
  if (secondError) return secondError;
  if (stage !== "group" && winnerOfStandardSet(scores[0]) !== winnerOfStandardSet(scores[1])) return goldenSetError(scores[2]);
  return null;
}

/** True only when two valid regular sets have different winners. */
export function goldenSetRequired(scores: MatchSetScores): boolean {
  const firstWinner = winnerOfStandardSet(scores[0]);
  const secondWinner = winnerOfStandardSet(scores[1]);
  return firstWinner !== null && secondWinner !== null && firstWinner !== secondWinner;
}

/** Returns a result only when the full score is valid for the match stage. */
export function outcomeFromScores(stage: MatchStage | undefined, scores: MatchSetScores): MatchOutcome | null {
  if (scoreValidationMessage(stage, scores)) return null;
  const firstWinner = winnerOfStandardSet(scores[0]);
  const secondWinner = winnerOfStandardSet(scores[1]);
  if (!firstWinner || !secondWinner) return null;

  if (stage === "group") {
    return firstWinner === secondWinner
      ? { result: "2-0", winnerSide: firstWinner }
      : { result: "1-1", winnerSide: null };
  }

  if (firstWinner === secondWinner) return { result: "2-0", winnerSide: firstWinner };
  const goldenWinner = winnerOfGoldenSet(scores[2]);
  return goldenWinner ? { result: "2-1", winnerSide: goldenWinner } : null;
}

export function scoreLabel(score: SetScore): string {
  return `${score.teamAScore}-${score.teamBScore}`;
}
