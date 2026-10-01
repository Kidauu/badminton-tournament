import type { Participant } from "../types/tournament";

/**
 * These 6 people must never end up as each other's doubles partner — any
 * participant whose name CONTAINS one of these words (case-insensitive, so
 * "Thomas S", "Pak Thomas", etc. all still match) counts as that restricted
 * person, no matter how their name is actually typed in the roster.
 */
const RESTRICTED_PAIRING_KEYWORDS = ["thomas", "atiq", "said", "ade", "edi", "ilham"];

export function isRestrictedPairingName(name: string): boolean {
  const lower = name.toLowerCase();
  return RESTRICTED_PAIRING_KEYWORDS.some((keyword) => lower.includes(keyword));
}

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

/**
 * Groups a shuffled id list into consecutive pairs, except no two
 * restricted-list people may land in the same pair: each restricted person is
 * matched with the next available non-restricted person instead, preserving
 * the shuffle's randomness. Only pairs two restricted people together if
 * there are literally more restricted people than non-restricted partners
 * left to go around (mathematically unavoidable at that point).
 */
export function pairsFromShuffled(shuffledIds: string[], participants: Participant[]): [string, string][] {
  const nameById = new Map(participants.map((p) => [p.id, p.name]));
  const isRestricted = (id: string) => isRestrictedPairingName(nameById.get(id) ?? "");

  const restricted = shuffledIds.filter(isRestricted);
  const unrestricted = shuffledIds.filter((id) => !isRestricted(id));

  const pairs: [string, string][] = [];
  const strandedRestricted: string[] = [];

  for (const id of restricted) {
    const partner = unrestricted.shift();
    if (partner) pairs.push([id, partner]);
    else strandedRestricted.push(id);
  }

  while (strandedRestricted.length >= 2) {
    pairs.push([strandedRestricted.shift()!, strandedRestricted.shift()!]);
  }

  while (unrestricted.length >= 2) {
    pairs.push([unrestricted.shift()!, unrestricted.shift()!]);
  }

  return pairs;
}
