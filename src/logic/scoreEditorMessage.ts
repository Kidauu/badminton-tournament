import type { MatchSetScores, MatchStage, SetScore } from "../types/tournament";
import { outcomeFromScores } from "./scoring";

export interface ScoreEditorMessage {
  tone: "valid" | "invalid";
  text: string;
}

type SetFillState = "empty" | "half" | "filled";

function setFillState(score: SetScore | null): SetFillState {
  if (!score) return "empty";
  const aFilled = Number.isInteger(score.teamAScore);
  const bFilled = Number.isInteger(score.teamBScore);
  if (!aFilled && !bFilled) return "empty";
  if (aFilled && bFilled) return "filled";
  return "half";
}

function winnerSideOf(score: SetScore): "A" | "B" {
  return score.teamAScore > score.teamBScore ? "A" : "B";
}

/**
 * User-facing copy for the inline score editor, matching the Court Line
 * redesign's validation table exactly. This never decides whether a score
 * can actually be saved — `outcomeFromScores` (scoring.ts) remains the only
 * source of truth for that; this just explains the current input state.
 */
export function scoreEditorMessage(
  stage: MatchStage | undefined,
  scores: MatchSetScores,
  teamALabel: string,
  teamBLabel: string,
): ScoreEditorMessage {
  const isGroup = stage === "group";
  const [set1, set2, set3] = scores;
  const s1 = setFillState(set1);
  const s2 = setFillState(set2);

  if (s1 === "half" || s2 === "half") {
    return { tone: "invalid", text: "Lengkapi kedua skor di tiap set." };
  }
  if (s1 === "filled" && set1.teamAScore === set1.teamBScore) {
    return { tone: "invalid", text: "Skor satu set tidak boleh sama." };
  }
  if (s2 === "filled" && set2.teamAScore === set2.teamBScore) {
    return { tone: "invalid", text: "Skor satu set tidak boleh sama." };
  }

  if (isGroup) {
    if (s1 !== "filled" || s2 !== "filled") {
      return { tone: "invalid", text: "Fase grup dimainkan tepat 2 set." };
    }
    const outcome = outcomeFromScores(stage, scores);
    if (!outcome) return { tone: "invalid", text: "Fase grup dimainkan tepat 2 set." };
    if (outcome.result === "1-1") return { tone: "valid", text: "Imbang 1–1 · masing-masing 1 poin" };
    const winnerLabel = outcome.winnerSide === "A" ? teamALabel : teamBLabel;
    return { tone: "valid", text: `${winnerLabel} menang 2–0 · 3 poin` };
  }

  // Babak gugur: semifinal, final, perebutan juara 3.
  if (s1 !== "filled" || s2 !== "filled") {
    return { tone: "invalid", text: "Isi minimal 2 set." };
  }

  const s3 = setFillState(set3);
  if (s3 === "half") {
    return { tone: "invalid", text: "Lengkapi kedua skor di tiap set." };
  }
  if (s3 === "filled" && set3 && set3.teamAScore === set3.teamBScore) {
    return { tone: "invalid", text: "Skor satu set tidak boleh sama." };
  }

  const isSplit = winnerSideOf(set1) !== winnerSideOf(set2);

  if (!isSplit) {
    if (s3 === "filled") {
      return { tone: "invalid", text: "Set ke-3 hanya dimainkan bila 1–1." };
    }
    const outcome = outcomeFromScores(stage, scores);
    if (!outcome) return { tone: "invalid", text: "Isi minimal 2 set." };
    const winnerLabel = outcome.winnerSide === "A" ? teamALabel : teamBLabel;
    return { tone: "valid", text: `${winnerLabel} menang 2–0` };
  }

  if (s3 !== "filled") {
    return { tone: "invalid", text: "Imbang 1–1 — isi set ke-3 sebagai penentu." };
  }
  const outcome = outcomeFromScores(stage, scores);
  if (!outcome) return { tone: "invalid", text: "Imbang 1–1 — isi set ke-3 sebagai penentu." };
  const winnerLabel = outcome.winnerSide === "A" ? teamALabel : teamBLabel;
  return { tone: "valid", text: `${winnerLabel} menang 2–1` };
}
