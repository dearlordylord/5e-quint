// Every D20 Test reroll source on one attack roll: the natural-1 reroll and
// Heroic Inspiration. Each source the attacker has for the roll needs an
// explicit decision, and at most one of them (or a Spell Attack reroll) takes
// the reroll. See ASSUMPTIONS.md on one reroll per roll.

import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";

import type {
  BattleAttackRollHole,
  BattleAttackRollResult,
  BattleCreatureState,
  BattleSpellAttackRollHole,
} from "../battle-state-execution.ts";
import {
  attackRollHoleWithD20TestNaturalOneRerollOption,
  d20TestNaturalOneRerollRollDecisionRequired,
  d20TestNaturalOneRerollRollIssue,
  effectiveD20TestNaturalOneRerollAttackRoll,
} from "./d20-test-natural-one-reroll.ts";
import {
  attackRollHoleWithHeroicInspirationRerollOption,
  d20TestRerollDecisionTakesReroll,
  effectiveHeroicInspirationRerollAttackRoll,
  heroicInspirationRerollRollDecisionRequired,
  heroicInspirationRerollRollIssue,
} from "./heroic-inspiration-reroll.ts";

/** The reroll sources an attack roll is asked again with. */
export type AttackRollD20TestRerollOptions = {
  readonly naturalOne: boolean;
  readonly heroicInspiration: boolean;
};

/** Where an attack roll's D20 Test rerolls stand. */
export type AttackRollD20TestRerolls =
  | {
      readonly tag: "decisionsRequired";
      readonly options: AttackRollD20TestRerollOptions;
    }
  | { readonly tag: "invalid"; readonly issue: string }
  | {
      readonly tag: "resolved";
      readonly effectiveAttackRoll: BattleAttackRollResult;
    };

/**
 * Checks an attack roll's reroll decisions and gives the roll that stands.
 * When a decision is missing, the roll is asked again with an option for
 * every source the attacker has for it.
 */
export function attackRollD20TestRerolls(input: {
  readonly attacker: BattleCreatureState | undefined;
  readonly attackRoll: BattleAttackRollResult;
  readonly requiredRollMode: AttackRollMode | undefined;
}): AttackRollD20TestRerolls {
  const { attacker, attackRoll } = input;
  const options = {
    naturalOne: d20TestNaturalOneRerollRollDecisionRequired({
      actor: attacker,
      originalD20TestRoll: attackRoll.d20TestRoll,
      decision: undefined,
    }),
    heroicInspiration: heroicInspirationRerollRollDecisionRequired({
      actor: attacker,
      originalD20TestRoll: attackRoll.d20TestRoll,
      decision: undefined,
    }),
  } as const satisfies AttackRollD20TestRerollOptions;
  if (
    (options.naturalOne && attackRoll.d20TestNaturalOneReroll === undefined) ||
    (options.heroicInspiration &&
      attackRoll.heroicInspirationReroll === undefined)
  ) {
    return { tag: "decisionsRequired", options };
  }
  const spellAttackRerollPresent = attackRoll.spellAttackReroll !== undefined;
  const issue =
    d20TestNaturalOneRerollRollIssue({
      actor: attacker,
      total: attackRoll.total,
      originalD20TestRoll: attackRoll.d20TestRoll,
      decision: attackRoll.d20TestNaturalOneReroll,
      requiredRollMode: input.requiredRollMode,
      otherD20RerollPresent:
        spellAttackRerollPresent ||
        d20TestRerollDecisionTakesReroll(attackRoll.heroicInspirationReroll),
    }) ??
    heroicInspirationRerollRollIssue({
      actor: attacker,
      total: attackRoll.total,
      originalD20TestRoll: attackRoll.d20TestRoll,
      decision: attackRoll.heroicInspirationReroll,
      requiredRollMode: input.requiredRollMode,
      otherD20RerollPresent:
        spellAttackRerollPresent ||
        d20TestRerollDecisionTakesReroll(attackRoll.d20TestNaturalOneReroll),
    });
  if (issue !== null) {
    return { tag: "invalid", issue };
  }
  return {
    tag: "resolved",
    effectiveAttackRoll: attackRollAfterD20TestRerolls(attackRoll),
  };
}

/**
 * The attack roll after its D20 Test reroll decisions. At most one of them
 * takes the reroll, so the order doesn't change the result.
 */
export function attackRollAfterD20TestRerolls(
  attackRoll: BattleAttackRollResult,
): BattleAttackRollResult {
  return effectiveHeroicInspirationRerollAttackRoll(
    effectiveD20TestNaturalOneRerollAttackRoll(attackRoll),
  );
}

/** The attack roll hole with the reroll options it is asked again with. */
export function attackRollHoleWithD20TestRerollOptions<
  T extends BattleAttackRollHole | BattleSpellAttackRollHole,
>(hole: T, options: AttackRollD20TestRerollOptions): T {
  const withNaturalOne: T = options.naturalOne
    ? attackRollHoleWithD20TestNaturalOneRerollOption(hole)
    : hole;
  return options.heroicInspiration
    ? attackRollHoleWithHeroicInspirationRerollOption(withNaturalOne)
    : withNaturalOne;
}
