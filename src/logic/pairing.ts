import type { Participant } from "../types/tournament";

/**
 * These 7 people must never end up as each other's doubles partner — any
 * participant whose name CONTAINS one of these words (case-insensitive, so
 * "Thomas S", "Pak Thomas", etc. all still match) counts as that restricted
 * person, no matter how their name is actually typed in the roster.
 */
const RESTRICTED_PAIRING_KEYWORDS = ["thomas", "atiq", "said", "ade", "edi", "ilham", "faldy"];

export function isRestrictedPairingName(name: string): boolean {
  const lower = name.toLowerCase();
  return RESTRICTED_PAIRING_KEYWORDS.some((keyword) => lower.includes(keyword));
}

/**
 * Risky and Ilham must always be partners whenever both are entered — this
 * overrides the restricted list above (Ilham is in it, but pairing with Risky
 * specifically is the one case that's required rather than forbidden).
 */
const FORCED_PAIR_KEYWORDS: [string, string] = ["risky", "ilham"];

function findForcedPair(shuffledIds: string[], nameById: Map<string, string>): [string, string] | null {
  const [keywordA, keywordB] = FORCED_PAIR_KEYWORDS;
  const matching = (keyword: string) => shuffledIds.find((id) => (nameById.get(id) ?? "").toLowerCase().includes(keyword));
  const idA = matching(keywordA);
  const idB = matching(keywordB);
  if (!idA || !idB || idA === idB) return null;
  return [idA, idB];
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
 *
 * If a Risky/Ilham forced pair exists, it's slotted into the middle of the
 * reveal order (never the first or last spin) so the wheel doesn't give it
 * away immediately or make it an anticlimactic final reveal.
 */
export function pairsFromShuffled(shuffledIds: string[], participants: Participant[]): [string, string][] {
  const nameById = new Map(participants.map((p) => [p.id, p.name]));
  const isRestricted = (id: string) => isRestrictedPairingName(nameById.get(id) ?? "");

  const forcedPair = findForcedPair(shuffledIds, nameById);
  const pool = forcedPair ? shuffledIds.filter((id) => id !== forcedPair[0] && id !== forcedPair[1]) : shuffledIds;

  const restricted = pool.filter(isRestricted);
  const unrestricted = pool.filter((id) => !isRestricted(id));

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

  if (forcedPair) {
    // With N other pairs, a true middle slot (neither index 0 nor the last
    // index once inserted) only exists when N >= 2. Below that there's no
    // middle to put it in, so it falls back to going last.
    const insertAt = pairs.length >= 2 ? Math.min(Math.max(Math.floor(pairs.length / 2), 1), pairs.length - 1) : pairs.length;
    pairs.splice(insertAt, 0, forcedPair);
  }

  return pairs;
}
