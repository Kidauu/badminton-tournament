import { describe, it, expect } from "vitest";
import { shuffleParticipants, pairsFromShuffled } from "./pairing";
import type { Participant } from "../types/tournament";

function makeParticipants(n: number): Participant[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Peserta ${i + 1}` }));
}

describe("shuffleParticipants", () => {
  it("returns every participant id exactly once", () => {
    const participants = makeParticipants(14);
    const shuffled = shuffleParticipants(participants);
    expect(shuffled).toHaveLength(14);
    expect(new Set(shuffled)).toEqual(new Set(participants.map((p) => p.id)));
  });
});

describe("pairsFromShuffled", () => {
  it("groups into 7 pairs of 2 using all ids exactly once", () => {
    const participants = makeParticipants(14);
    const shuffled = shuffleParticipants(participants);
    const pairs = pairsFromShuffled(shuffled);
    expect(pairs).toHaveLength(7);
    const flat = pairs.flat();
    expect(flat).toHaveLength(14);
    expect(new Set(flat)).toEqual(new Set(shuffled));
  });

  it("takes ids in shuffled order (top-2, top-2, ...)", () => {
    const shuffled = ["a", "b", "c", "d", "e", "f"];
    expect(pairsFromShuffled(shuffled)).toEqual([
      ["a", "b"],
      ["c", "d"],
      ["e", "f"],
    ]);
  });
});
