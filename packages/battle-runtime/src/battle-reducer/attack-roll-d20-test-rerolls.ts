// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.HEROIC_INSPIRATION_REROLL
// Every D20 Test reroll source on one attack roll: the natural-1 reroll and
// Heroic Inspiration. Each source the attacker has for the roll needs an
// explicit decision, and at most one of them (or a Spell Attack reroll) takes
// the reroll. See ASSUMPTIONS.md on one reroll per roll.

import { NO_HEROIC_INSPIRATION } from "@dnd/shared/game-facts";
import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";
import { Brand, Match } from "effect";

import type { BattleInterruptTrigger } from "../battle-interrupt-triggers.ts";
import type {
  BattleAttackRollHole,
  BattleAttackRollResult,
  BattleCreatureState,
  BattleSpellAttackRollHole,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import {
  attackRollHoleWithD20TestNaturalOneRerollOption,
  d20TestNaturalOneRerollRollDecisionRequired,
  d20TestNaturalOneRerollRollIssue,
  effectiveD20TestNaturalOneRerollAttackRoll,
} from "./d20-test-natural-one-reroll.ts";
import {
  attackRollHoleWithHeroicInspirationRerollOption,
  combatantHasHeroicInspiration,
  d20TestRerollDecisionTakesReroll,
  effectiveHeroicInspirationRerollAttackRoll,
  heroicInspirationRerollRollIssue,
} from "./heroic-inspiration-reroll.ts";

/** The reroll sources an attack roll is asked again with. */
export type AttackRollD20TestRerollOptions = {
  readonly naturalOne: boolean;
  readonly heroicInspiration: boolean;
};

/**
 * Whether an admitted attack roll spends Heroic Inspiration. Only
 * attackRollD20TestRerolls makes one, so the spend follows a checked decision.
 */
export type AttackRollHeroicInspirationUse = Brand.Branded<
  { readonly spends: boolean },
  "AttackRollHeroicInspirationUse"
>;
const AttackRollHeroicInspirationUse =
  Brand.nominal<AttackRollHeroicInspirationUse>();

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
      readonly heroicInspirationUse: AttackRollHeroicInspirationUse;
    };

type AttackRollD20TestRerollInput = {
  readonly attacker: BattleCreatureState | undefined;
  readonly attackRoll: BattleAttackRollResult;
  readonly requiredRollMode: AttackRollMode | undefined;
  /** See attackRollAdmittedBeforeInterrupt. */
  readonly admittedBeforeInterrupt: boolean;
};

/**
 * Whether a replay follows a reaction window that opened after this attack
 * roll was admitted. Its reroll decisions were checked, and Heroic
 * Inspiration spent, before that window, and the replay keeps the same fill.
 */
export function attackRollAdmittedBeforeInterrupt(
  handledInterruptTrigger: BattleInterruptTrigger | undefined,
): boolean {
  return handledInterruptTrigger === undefined
    ? false
    : Match.value(handledInterruptTrigger).pipe(
        Match.when("attackHit", () => true),
        Match.when("attackDamage", () => true),
        Match.when("afterDamage", () => true),
        Match.when("saveFailed", () => true),
        Match.when("creatureFalls", () => true),
        Match.when("spellCast", () => false),
        Match.when("opportunityAttack", () => false),
        Match.when("reportedReadyTrigger", () => false),
        Match.exhaustive,
      );
}

/**
 * Checks an attack roll's reroll decisions and gives the roll that stands.
 * When a decision is missing, the roll is asked again with an option for
 * every source the attacker has for it.
 */
export function attackRollD20TestRerolls(
  input: AttackRollD20TestRerollInput,
): AttackRollD20TestRerolls {
  const { attacker, attackRoll } = input;
  const heroicInspirationRerollAvailable =
    combatantHasHeroicInspiration(attacker) ||
    (input.admittedBeforeInterrupt &&
      d20TestRerollDecisionTakesReroll(attackRoll.heroicInspirationReroll));
  const options = {
    naturalOne: d20TestNaturalOneRerollRollDecisionRequired({
      actor: attacker,
      originalD20TestRoll: attackRoll.d20TestRoll,
      decision: undefined,
    }),
    heroicInspiration: heroicInspirationRerollAvailable,
  } as const satisfies AttackRollD20TestRerollOptions;
  if (
    (options.naturalOne && attackRoll.d20TestNaturalOneReroll === undefined) ||
    (options.heroicInspiration &&
      attackRoll.heroicInspirationReroll === undefined)
  ) {
    return { tag: "decisionsRequired", options };
  }
  const issue = attackRollD20TestRerollIssue(
    input,
    heroicInspirationRerollAvailable,
  );
  if (issue !== null) {
    return { tag: "invalid", issue };
  }
  return {
    tag: "resolved",
    effectiveAttackRoll: attackRollAfterD20TestRerolls(attackRoll),
    heroicInspirationUse: AttackRollHeroicInspirationUse({
      spends: d20TestRerollDecisionTakesReroll(
        attackRoll.heroicInspirationReroll,
      ),
    }),
  };
}

/**
 * Whether a D20 Test reroll source (the natural-1 reroll or Heroic
 * Inspiration) took this roll's reroll, so no other source can.
 */
export function attackRollD20TestRerollTaken(
  attackRoll: BattleAttackRollResult,
): boolean {
  return (
    d20TestRerollDecisionTakesReroll(attackRoll.d20TestNaturalOneReroll) ||
    d20TestRerollDecisionTakesReroll(attackRoll.heroicInspirationReroll)
  );
}

/** Spends the attacker's Heroic Inspiration when the admitted attack roll took its reroll. */
export function battleStateAfterHeroicInspirationReroll(
  state: BattleState,
  actorId: CombatantId,
  use: AttackRollHeroicInspirationUse,
): BattleState {
  if (!use.spends) {
    return state;
  }
  const actor = state.combatants.get(actorId);
  /* v8 ignore next -- @preserve -- A validated Heroic Inspiration reroll belongs to a character. */
  if (actor?.origin.kind !== "character") return state;
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...actor,
      origin: { ...actor.origin, heroicInspiration: NO_HEROIC_INSPIRATION },
    }),
  };
}

/** The first issue with an attack roll's reroll decisions, if any. */
function attackRollD20TestRerollIssue(
  input: AttackRollD20TestRerollInput,
  heroicInspirationRerollAvailable: boolean,
): string | null {
  const { attacker, attackRoll } = input;
  const spellAttackRerollPresent = d20TestRerollDecisionTakesReroll(
    attackRoll.spellAttackReroll,
  );
  return (
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
      rerollAvailable: heroicInspirationRerollAvailable,
      total: attackRoll.total,
      originalD20TestRoll: attackRoll.d20TestRoll,
      decision: attackRoll.heroicInspirationReroll,
      requiredRollMode: input.requiredRollMode,
      otherD20RerollPresent:
        spellAttackRerollPresent ||
        d20TestRerollDecisionTakesReroll(attackRoll.d20TestNaturalOneReroll),
    })
  );
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
