// Divination spells — SRD 5.2.1
// Spells that reveal information or grant insight.

import type { DiceDamage } from "#/features/spell-patterns.ts"

/* eslint-disable no-magic-numbers */

/** Foresight (SRD 5.2.1): advantage on all D20 Tests, disadvantage on attacks against target. */
export const FORESIGHT_EFFECT = { advantageOnAllTests: true, attackDisadvantage: true } as const

/** Mind Spike (SRD 5.2.1): 3d8 Psychic at L2, +1d8 per slot above 2. Half on save. */
export function mindSpikeDamage(slotLevel: number): DiceDamage {
  return { dice: 3 + (slotLevel - 2), dieSize: 8 }
}

/* eslint-enable no-magic-numbers */
