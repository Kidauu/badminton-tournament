import { describe, expect, it } from "vitest";
import { outcomeFromScores, scoreValidationMessage } from "./scoring";

describe("outcomeFromScores", () => {
  it("records a split group match as 1-1", () => {
    expect(outcomeFromScores("group", [
      { teamAScore: 21, teamBScore: 16 },
      { teamAScore: 18, teamBScore: 21 },
      null,
    ])).toEqual({ result: "1-1", winnerSide: null });
  });

  it("requires and applies a 15-point golden set after a split knockout match", () => {
    expect(outcomeFromScores("semifinal", [
      { teamAScore: 21, teamBScore: 18 },
      { teamAScore: 17, teamBScore: 21 },
      { teamAScore: 15, teamBScore: 13 },
    ])).toEqual({ result: "2-1", winnerSide: "A" });
  });

  it("does not accept an unfinished golden set", () => {
    expect(outcomeFromScores("final", [
      { teamAScore: 21, teamBScore: 19 },
      { teamAScore: 19, teamBScore: 21 },
      { teamAScore: 14, teamBScore: 12 },
    ])).toBeNull();
  });

  it("explains why an incomplete standard set is invalid", () => {
    expect(scoreValidationMessage("group", [
      { teamAScore: 21, teamBScore: 20 },
      { teamAScore: 21, teamBScore: 18 },
      null,
    ])).toBe("Set 1 harus unggul minimal 2 poin, kecuali saat mencapai 30 poin.");
  });

  it("explains that a golden set is needed after split knockout sets", () => {
    expect(scoreValidationMessage("semifinal", [
      { teamAScore: 21, teamBScore: 18 },
      { teamAScore: 18, teamBScore: 21 },
      null,
    ])).toBe("Set 1 dan 2 imbang 1-1. Masukkan skor golden set.");
  });
});
