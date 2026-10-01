import { describe, expect, it } from "vitest";
import { scoreEditorMessage } from "./scoreEditorMessage";
import type { MatchSetScores } from "../types/tournament";

const EMPTY: MatchSetScores = [
  { teamAScore: NaN, teamBScore: NaN },
  { teamAScore: NaN, teamBScore: NaN },
  null,
];

function scores(set1: [number, number] | null, set2: [number, number] | null, set3: [number, number] | null = null): MatchSetScores {
  return [
    set1 ? { teamAScore: set1[0], teamBScore: set1[1] } : { teamAScore: NaN, teamBScore: NaN },
    set2 ? { teamAScore: set2[0], teamBScore: set2[1] } : { teamAScore: NaN, teamBScore: NaN },
    set3 ? { teamAScore: set3[0], teamBScore: set3[1] } : null,
  ];
}

describe("scoreEditorMessage", () => {
  it("flags a half-filled set", () => {
    const half: MatchSetScores = [{ teamAScore: 21, teamBScore: NaN }, EMPTY[1], null];
    expect(scoreEditorMessage("group", half, "Tim 1", "Tim 2")).toEqual({ tone: "invalid", text: "Lengkapi kedua skor di tiap set." });
  });

  it("flags an equal set score", () => {
    expect(scoreEditorMessage("group", scores([20, 20], null), "Tim 1", "Tim 2")).toEqual({ tone: "invalid", text: "Skor satu set tidak boleh sama." });
  });

  it("requires exactly 2 sets for a group match", () => {
    expect(scoreEditorMessage("group", scores([21, 10], null), "Tim 1", "Tim 2")).toEqual({ tone: "invalid", text: "Fase grup dimainkan tepat 2 set." });
  });

  it("reports a group draw as valid", () => {
    expect(scoreEditorMessage("group", scores([21, 15], [15, 21]), "Tim 1", "Tim 2")).toEqual({ tone: "valid", text: "Imbang 1–1 · masing-masing 1 poin" });
  });

  it("reports a group 2-0 win as valid", () => {
    expect(scoreEditorMessage("group", scores([21, 15], [21, 10]), "Tim 1", "Tim 2")).toEqual({ tone: "valid", text: "Tim 1 menang 2–0 · 3 poin" });
  });

  it("requires at least 2 sets for a knockout match", () => {
    expect(scoreEditorMessage("semifinal", scores([21, 10], null), "Tim 1", "Tim 2")).toEqual({ tone: "invalid", text: "Isi minimal 2 set." });
  });

  it("requires set 3 when a knockout match splits 1-1", () => {
    expect(scoreEditorMessage("semifinal", scores([21, 15], [15, 21]), "Tim 1", "Tim 2")).toEqual({ tone: "invalid", text: "Imbang 1–1 — isi set ke-3 sebagai penentu." });
  });

  it("rejects a set 3 when the match was already decided 2-0", () => {
    expect(scoreEditorMessage("semifinal", scores([21, 15], [21, 10], [15, 5]), "Tim 1", "Tim 2")).toEqual({ tone: "invalid", text: "Set ke-3 hanya dimainkan bila 1–1." });
  });

  it("reports a knockout 2-0 win as valid", () => {
    expect(scoreEditorMessage("final", scores([21, 15], [21, 10]), "Tim 1", "Tim 2")).toEqual({ tone: "valid", text: "Tim 1 menang 2–0" });
  });

  it("reports a knockout 2-1 win as valid", () => {
    expect(scoreEditorMessage("final", scores([21, 15], [15, 21], [15, 10]), "Tim 1", "Tim 2")).toEqual({ tone: "valid", text: "Tim 1 menang 2–1" });
  });

  it("treats the third-place match the same as other knockout matches", () => {
    expect(scoreEditorMessage("third_place", scores([21, 15], [21, 10]), "Tim 4", "Tim 2")).toEqual({ tone: "valid", text: "Tim 4 menang 2–0" });
  });
});
