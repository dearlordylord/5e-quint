// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.HEROIC_INSPIRATION_REROLL
// Every D20 Test reroll source on one attack roll: the natural-1 reroll,
// Heroic Inspiration and, on a spell attack, Seeking Spell, taken in the order
// d20-test-decision-sequence.ts sets (ASSUMPTIONS.md A55).

import type {
  AttackRollMode,
  HoleId,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { Match } from "effect";

import {
  D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
  HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
  type BattleAttackRollD20TestRerollDecision,
  type BattleAttackRollHole,
  type BattleAttackRollResult,
  type BattleSpellAttackRerollDecision,
  type BattleSpellAttackRollHole,
  type BattleState,
} from "../battle-state-execution.ts";
import type { BattleSubject } from "../battle-subjects.ts";
import type { CombatantId } from "../identity.ts";
import {
  d20TestHoleWithNaturalOneRerollOption,
  d20TestNaturalOneRerollOffered,
  d20TestNaturalOneRerollRollIssue,
} from "./d20-test-natural-one-reroll.ts";
import {
  d20TestDecisions,
  d20TestRollAfterDecisions,
  type D20TestSourceFlags,
} from "./d20-test-decision-sequence.ts";
import { d20TestRollAfterReroll } from "./d20-test-roll-reroll.ts";
import {
  d20TestHoleWithHeroicInspirationRerollOption,
  d20TestRerollDecisionTakesReroll,
  heroicInspirationRerollAvailabilityForRoll,
  heroicInspirationRerollRollIssue,
  heroicInspirationUseForRoll,
  type HeroicInspirationUse,
} from "./heroic-inspiration-reroll.ts";
import { SEEKING_METAMAGIC_EFFECT_KIND } from "./metamagic-support.ts";
import { SEEKING_SPELL_REROLL_UNSUPPORTED_ATTACK_ROLL_OWNER_MESSAGE } from "./spell-reroll-issues.ts";

/** The sources that may reroll an attack roll's d20. */
export const ATTACK_ROLL_D20_TEST_REROLL_SOURCES = [
  "naturalOne",
  "heroicInspiration",
  "missedSpellAttack",
] as const;
type AttackRollD20TestRerollSource =
  (typeof ATTACK_ROLL_D20_TEST_REROLL_SOURCES)[number];

/** The reroll sources an attack roll is asked again with. */
export type AttackRollD20TestRerollOptions =
  D20TestSourceFlags<AttackRollD20TestRerollSource>;

/**
 * Seeking Spell on a spell attack roll: whether it may reroll a roll as it
 * stands (the roll misses and the caster can use it), and the issue with its
 * decision on that roll. Only a spell attack that Seeking Spell applies to
 * supplies one.
 */
export type MissedSpellAttackRerollSource = {
  readonly offered: (roll: BattleAttackRollResult) => boolean;
  readonly decisionIssue: (
    roll: BattleAttackRollResult,
    decision: BattleSpellAttackRerollDecision,
  ) => string | null;
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
      readonly heroicInspirationUse: HeroicInspirationUse;
      /** Whether Seeking Spell rerolled the roll, which spends its Sorcery Points. */
      readonly missedSpellAttackRerollTaken: boolean;
    };

type AttackRollD20TestRerollInput = {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly attackerId: CombatantId;
  /** The hole this attack roll fills, which names the roll within its subject. */
  readonly attackRollHoleId: HoleId;
  readonly attackRoll: BattleAttackRollResult;
  readonly requiredRollMode: AttackRollMode | undefined;
  readonly missedSpellAttackReroll?: MissedSpellAttackRerollSource;
};

/**
 * Checks an attack roll's reroll decisions in the order the roller made them
 * and gives the roll that stands. Each decision is checked against the roll as
 * the decisions before it left it. While a source that can still reroll is
 * undecided on that roll, the roll is asked again with its option.
 */
export function attackRollD20TestRerolls(
  input: AttackRollD20TestRerollInput,
): AttackRollD20TestRerolls {
  const roll = { rollerId: input.attackerId, holeId: input.attackRollHoleId };
  const scope = { kind: "subject", subject: input.subject } as const;
  const heroicInspirationAvailability =
    heroicInspirationRerollAvailabilityForRoll(input.state, scope, roll);
  const actor = input.state.combatants.get(input.attackerId);
  const rerolls = d20TestDecisions<
    BattleAttackRollResult,
    BattleAttackRollD20TestRerollDecision,
    AttackRollD20TestRerollSource
  >({
    roll: input.attackRoll,
    decisions: input.attackRoll.d20TestRerolls ?? [],
    rules: {
      sources: ATTACK_ROLL_D20_TEST_REROLL_SOURCES,
      step: (attackRoll, decision) =>
        Match.value(decision).pipe(
          Match.discriminatorsExhaustive("effectKind")({
            [D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND]: (naturalOne) => ({
              source: "naturalOne" as const,
              issue: d20TestNaturalOneRerollRollIssue({
                actor,
                total: attackRoll.total,
                originalD20TestRoll: attackRoll.d20TestRoll,
                decision: naturalOne,
                requiredRollMode: input.requiredRollMode,
              }),
            }),
            [HEROIC_INSPIRATION_REROLL_EFFECT_KIND]: (heroicInspiration) => ({
              source: "heroicInspiration" as const,
              issue: heroicInspirationRerollRollIssue({
                availability: heroicInspirationAvailability,
                total: attackRoll.total,
                originalD20TestRoll: attackRoll.d20TestRoll,
                decision: heroicInspiration,
                requiredRollMode: input.requiredRollMode,
              }),
            }),
            [SEEKING_METAMAGIC_EFFECT_KIND]: (missedSpellAttack) => ({
              source: "missedSpellAttack" as const,
              issue:
                input.missedSpellAttackReroll === undefined
                  ? SEEKING_SPELL_REROLL_UNSUPPORTED_ATTACK_ROLL_OWNER_MESSAGE
                  : input.missedSpellAttackReroll.decisionIssue(
                      attackRoll,
                      missedSpellAttack,
                    ),
            }),
          }),
        ),
      takes: d20TestRerollDecisionTakesReroll,
      rollAfter: d20TestRollAfterReroll,
      offered: {
        naturalOne: (attackRoll) =>
          d20TestNaturalOneRerollOffered(actor, attackRoll.d20TestRoll),
        heroicInspiration: () => heroicInspirationAvailability === "available",
        missedSpellAttack: (attackRoll) =>
          input.missedSpellAttackReroll?.offered(attackRoll) === true,
      },
    },
  });
  if (rerolls.tag !== "resolved") return rerolls;
  return {
    tag: "resolved",
    effectiveAttackRoll: rerolls.roll,
    heroicInspirationUse: heroicInspirationUseForRoll({
      state: input.state,
      scope,
      roll,
      rerolledWithHeroicInspiration: rerolls.taken.heroicInspiration,
    }),
    missedSpellAttackRerollTaken: rerolls.taken.missedSpellAttack,
  };
}

/**
 * The attack roll after its D20 Test reroll decisions, each applied to the
 * roll the decisions before it left.
 */
export function attackRollAfterD20TestRerolls(
  attackRoll: BattleAttackRollResult,
): BattleAttackRollResult {
  return d20TestRollAfterDecisions(
    attackRoll,
    attackRoll.d20TestRerolls ?? [],
    d20TestRollAfterReroll,
  );
}

/** The attack roll hole with the reroll options it is asked again with. */
export function attackRollHoleWithD20TestRerollOptions<
  T extends BattleAttackRollHole | BattleSpellAttackRollHole,
>(hole: T, options: AttackRollD20TestRerollOptions): T {
  const withNaturalOne: T = options.naturalOne
    ? d20TestHoleWithNaturalOneRerollOption(hole)
    : hole;
  return options.heroicInspiration
    ? d20TestHoleWithHeroicInspirationRerollOption(withNaturalOne)
    : withNaturalOne;
}
