import { describe, it, expect } from "vitest";
import { shuffleParticipants, pairsFromShuffled, isRestrictedPairingName } from "./pairing";
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

describe("isRestrictedPairingName", () => {
  it("matches any of the 7 restricted keywords as a case-insensitive substring", () => {
    expect(isRestrictedPairingName("Thomas S")).toBe(true);
    expect(isRestrictedPairingName("pak thomas")).toBe(true);
    expect(isRestrictedPairingName("Atiq Rahman")).toBe(true);
    expect(isRestrictedPairingName("Muhammad Said")).toBe(true);
    expect(isRestrictedPairingName("Ade Kurniawan")).toBe(true);
    expect(isRestrictedPairingName("Pak Edi")).toBe(true);
    expect(isRestrictedPairingName("Ilham Pratama")).toBe(true);
    expect(isRestrictedPairingName("Faldy Ramadhan")).toBe(true);
  });

  it("does not match unrelated names", () => {
    expect(isRestrictedPairingName("Budi Santoso")).toBe(false);
    expect(isRestrictedPairingName("Andi Wijaya")).toBe(false);
  });
});

describe("pairsFromShuffled", () => {
  it("groups into 7 pairs of 2 using all ids exactly once", () => {
    const participants = makeParticipants(14);
    const shuffled = shuffleParticipants(participants);
    const pairs = pairsFromShuffled(shuffled, participants);
    expect(pairs).toHaveLength(7);
    const flat = pairs.flat();
    expect(flat).toHaveLength(14);
    expect(new Set(flat)).toEqual(new Set(shuffled));
  });

  it("takes ids in shuffled order (top-2, top-2, ...) when nobody is restricted", () => {
    const shuffled = ["a", "b", "c", "d", "e", "f"];
    const participants = shuffled.map((id) => ({ id, name: `Peserta ${id}` }));
    expect(pairsFromShuffled(shuffled, participants)).toEqual([
      ["a", "b"],
      ["c", "d"],
      ["e", "f"],
    ]);
  });

  it("never pairs two restricted-list people together", () => {
    const participants: Participant[] = [
      { id: "p1", name: "Thomas Wijaya" },
      { id: "p2", name: "Atiq Rahman" },
      { id: "p3", name: "Muhammad Said" },
      { id: "p4", name: "Ade Kurniawan" },
      { id: "p5", name: "Pak Edi" },
      { id: "p6", name: "Ilham Pratama" },
      { id: "p7", name: "Faldy Ramadhan" },
      { id: "p8", name: "Budi Santoso" },
      { id: "p9", name: "Andi Wijaya" },
      { id: "p10", name: "Citra Dewi" },
      { id: "p11", name: "Dewi Lestari" },
      { id: "p12", name: "Eka Putra" },
      { id: "p13", name: "Fajar Nugraha" },
      { id: "p14", name: "Gilang Ramadhan" },
      { id: "p15", name: "Hendra Saputra" },
      { id: "p16", name: "Indra Kusuma" },
    ];
    const restrictedIds = new Set(["p1", "p2", "p3", "p4", "p5", "p6", "p7"]);

    for (let trial = 0; trial < 20; trial++) {
      const shuffled = shuffleParticipants(participants);
      const pairs = pairsFromShuffled(shuffled, participants);

      expect(pairs).toHaveLength(8);
      expect(new Set(pairs.flat())).toEqual(new Set(shuffled));

      for (const [a, b] of pairs) {
        expect(restrictedIds.has(a) && restrictedIds.has(b)).toBe(false);
      }
    }
  });

  it("falls back to pairing restricted people together only when unavoidable", () => {
    const participants: Participant[] = [
      { id: "p1", name: "Thomas Wijaya" },
      { id: "p2", name: "Atiq Rahman" },
      { id: "p3", name: "Muhammad Said" },
      { id: "p4", name: "Ade Kurniawan" },
      { id: "p5", name: "Budi Santoso" },
      { id: "p6", name: "Andi Wijaya" },
    ];
    const shuffled = shuffleParticipants(participants);
    const pairs = pairsFromShuffled(shuffled, participants);

    expect(pairs).toHaveLength(3);
    expect(new Set(pairs.flat())).toEqual(new Set(shuffled));
    const restrictedPairCount = pairs.filter(([a, b]) => a.startsWith("p") && b.startsWith("p") && [a, b].every((id) => ["p1", "p2", "p3", "p4"].includes(id))).length;
    expect(restrictedPairCount).toBe(1);
  });

  it("always pairs Risky with Ilham when both are present", () => {
    const participants: Participant[] = [
      { id: "p1", name: "Thomas Wijaya" },
      { id: "p2", name: "Atiq Rahman" },
      { id: "p3", name: "Muhammad Said" },
      { id: "p4", name: "Ade Kurniawan" },
      { id: "p5", name: "Pak Edi" },
      { id: "p6", name: "Ilham Pratama" },
      { id: "p7", name: "Faldy Ramadhan" },
      { id: "p8", name: "Risky Daulay" },
      { id: "p9", name: "Andi Wijaya" },
      { id: "p10", name: "Citra Dewi" },
      { id: "p11", name: "Dewi Lestari" },
      { id: "p12", name: "Eka Putra" },
      { id: "p13", name: "Fajar Nugraha" },
      { id: "p14", name: "Gilang Ramadhan" },
    ];

    for (let trial = 0; trial < 20; trial++) {
      const shuffled = shuffleParticipants(participants);
      const pairs = pairsFromShuffled(shuffled, participants);

      expect(pairs).toHaveLength(7);
      expect(new Set(pairs.flat())).toEqual(new Set(shuffled));
      expect(pairs).toContainEqual(["p8", "p6"]);
    }
  });

  it("does not force a pairing when only Risky or only Ilham is present", () => {
    const withoutIlham: Participant[] = [
      { id: "p1", name: "Risky Daulay" },
      { id: "p2", name: "Budi Santoso" },
      { id: "p3", name: "Andi Wijaya" },
      { id: "p4", name: "Citra Dewi" },
    ];
    const shuffled = shuffleParticipants(withoutIlham);
    const pairs = pairsFromShuffled(shuffled, withoutIlham);
    expect(pairs).toHaveLength(2);
    expect(new Set(pairs.flat())).toEqual(new Set(shuffled));
  });
});
