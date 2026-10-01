import type { Participant } from "../types/tournament";

/** Fisher-Yates shuffle. The result is the ONLY random moment — everything
 * downstream (which 2 names a given wheel spin reveals) is derived from this
 * fixed order. The wheel animation itself must never introduce randomness. */
export function shuffleParticipants(participants: Participant[]): string[] {
  const ids = participants.map((p) => p.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

/** Groups a shuffled id list into consecutive pairs: [0,1], [2,3], ... */
export function pairsFromShuffled(shuffledIds: string[]): [string, string][] {
  const pairs: [string, string][] = [];
  for (let i = 0; i < shuffledIds.length; i += 2) {
    pairs.push([shuffledIds[i], shuffledIds[i + 1]]);
  }
  return pairs;
}
