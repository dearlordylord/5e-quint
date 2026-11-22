// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.HEROIC_INSPIRATION_REROLL
// Every D20 Test reroll source on one attack roll: the natural-1 reroll and
// Heroic Inspiration. The roller decides for each source it has, in the order
// it chooses, and each decision applies to the roll as the decisions before it
// left it. See ASSUMPTIONS.md A55 on sequential rerolls from different sources.

import { NO_HEROIC_INSPIRATION } from "@dnd/shared/game-facts";
import type {
  AttackRollMode,
  HoleId,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { Brand, Match } from "effect";

import {
  D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
  HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
  type BattleAttackRollD20TestRerollDecision,
  type BattleAttackRollHole,
  type BattleAttackRollResult,
  type BattleSpellAttackRollHole,
  type BattleState,
  type BattleTurnResources,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import {
  attackRollHoleWithD20TestNaturalOneRerollOption,
  d20TestNaturalOneRerollRollDecisionRequired,
  d20TestNaturalOneRerollRollIssue,
} from "./d20-test-natural-one-reroll.ts";
import { attackRollAfterD20TestRollReroll } from "./d20-test-roll-reroll.ts";
import {
  attackRollHoleWithHeroicInspirationRerollOption,
  combatantHasHeroicInspiration,
  d20TestRerollDecisionTakesReroll,
  heroicInspirationRerollRollIssue,
  type HeroicInspirationRerollAvailability,
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
  | { readonly spends: false }
  | {
      readonly spends: true;
      readonly actorId: CombatantId;
      readonly attackRollHoleId: HoleId;
    },
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
  readonly state: BattleState;
  readonly attackerId: CombatantId;
  /** The hole this attack roll fills, which names the roll within its subject. */
  readonly attackRollHoleId: HoleId;
  readonly attackRoll: BattleAttackRollResult;
  readonly requiredRollMode: AttackRollMode | undefined;
};

/**
 * Where the attacker's Heroic Inspiration stands for this roll. A replay after
 * a reaction window resolves the subject's rolls again from the state after a
 * spend, so the roll that spent it can take it again, and an earlier roll's
 * decline still stands.
 */
function heroicInspirationRerollAvailabilityForRoll(
  input: AttackRollD20TestRerollInput,
): HeroicInspirationRerollAvailability {
  if (
    combatantHasHeroicInspiration(input.state.combatants.get(input.attackerId))
  ) {
    return "available";
  }
  const spent =
    input.state.currentTurnResources.heroicInspirationAttackRollReroll;
  if (spent?.actorId !== input.attackerId) {
    return "unavailable";
  }
  return spent.attackRollHoleId === input.attackRollHoleId
    ? "available"
    : "spentOnAnotherRoll";
}

/**
 * Checks an attack roll's reroll decisions in the order the roller made them
 * and gives the roll that stands. Each decision is checked against the roll as
 * the decisions before it left it. While a source the attacker has is still
 * undecided on that roll, the roll is asked again with its option.
 */
export function attackRollD20TestRerolls(
  input: AttackRollD20TestRerollInput,
): AttackRollD20TestRerolls {
  const heroicInspirationRerollAvailability =
    heroicInspirationRerollAvailabilityForRoll(input);
  const sequence = attackRollD20TestRerollSequence(
    input,
    heroicInspirationRerollAvailability,
  );
  if (sequence.tag === "invalid") {
    return sequence;
  }
  const options = {
    naturalOne:
      !sequence.decided.naturalOne &&
      d20TestNaturalOneRerollRollDecisionRequired({
        actor: input.state.combatants.get(input.attackerId),
        originalD20TestRoll: sequence.attackRoll.d20TestRoll,
        decision: undefined,
      }),
    heroicInspiration:
      !sequence.decided.heroicInspiration &&
      heroicInspirationRerollAvailability === "available",
  } as const satisfies AttackRollD20TestRerollOptions;
  if (options.naturalOne || options.heroicInspiration) {
    return { tag: "decisionsRequired", options };
  }
  return {
    tag: "resolved",
    effectiveAttackRoll: sequence.attackRoll,
    heroicInspirationUse: AttackRollHeroicInspirationUse(
      sequence.heroicInspirationTaken
        ? {
            spends: true,
            actorId: input.attackerId,
            attackRollHoleId: input.attackRollHoleId,
          }
        : { spends: false },
    ),
  };
}

export const ATTACK_ROLL_D20_TEST_REROLL_SOURCE_REPEATED_MESSAGE =
  "A reroll source decides only once on a D20 Test roll; only a different source may reroll the new roll.";

/** Which reroll sources have decided on a roll. Each decides at most once. */
type AttackRollD20TestRerollSourcesDecided = {
  readonly [Source in keyof AttackRollD20TestRerollOptions]: boolean;
};

type AttackRollD20TestRerollSequence =
  | { readonly tag: "invalid"; readonly issue: string }
  | {
      readonly tag: "applied";
      /** The roll after every decision so far. */
      readonly attackRoll: BattleAttackRollResult;
      readonly decided: AttackRollD20TestRerollSourcesDecided;
      readonly heroicInspirationTaken: boolean;
    };

type AttackRollD20TestRerollStep = {
  readonly source: keyof AttackRollD20TestRerollOptions;
  readonly issue: string | null;
};

/** Applies an attack roll's reroll decisions in order, checking each one. */
function attackRollD20TestRerollSequence(
  input: AttackRollD20TestRerollInput,
  heroicInspirationRerollAvailability: HeroicInspirationRerollAvailability,
): AttackRollD20TestRerollSequence {
  const initial: AttackRollD20TestRerollSequence = {
    tag: "applied",
    attackRoll: input.attackRoll,
    decided: { naturalOne: false, heroicInspiration: false },
    heroicInspirationTaken: false,
  };
  return (input.attackRoll.d20TestRerolls ?? []).reduce(
    (sequence: AttackRollD20TestRerollSequence, decision) => {
      if (sequence.tag === "invalid") {
        return sequence;
      }
      const step = attackRollD20TestRerollStep(
        input,
        heroicInspirationRerollAvailability,
        sequence.attackRoll,
        decision,
      );
      if (sequence.decided[step.source]) {
        return {
          tag: "invalid",
          issue: ATTACK_ROLL_D20_TEST_REROLL_SOURCE_REPEATED_MESSAGE,
        };
      }
      if (step.issue !== null) {
        return { tag: "invalid", issue: step.issue };
      }
      return {
        tag: "applied",
        attackRoll: attackRollAfterD20TestRollReroll(
          sequence.attackRoll,
          decision,
        ),
        decided: { ...sequence.decided, [step.source]: true },
        heroicInspirationTaken:
          sequence.heroicInspirationTaken ||
          (step.source === "heroicInspiration" &&
            d20TestRerollDecisionTakesReroll(decision)),
      };
    },
    initial,
  );
}

/** One decision's source, checked against the roll as it stands. */
function attackRollD20TestRerollStep(
  input: AttackRollD20TestRerollInput,
  heroicInspirationRerollAvailability: HeroicInspirationRerollAvailability,
  roll: BattleAttackRollResult,
  decision: BattleAttackRollD20TestRerollDecision,
): AttackRollD20TestRerollStep {
  return Match.value(decision).pipe(
    Match.discriminatorsExhaustive("effectKind")({
      [D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND]: (naturalOne) => ({
        source: "naturalOne" as const,
        issue: d20TestNaturalOneRerollRollIssue({
          actor: input.state.combatants.get(input.attackerId),
          total: roll.total,
          originalD20TestRoll: roll.d20TestRoll,
          decision: naturalOne,
          requiredRollMode: input.requiredRollMode,
        }),
      }),
      [HEROIC_INSPIRATION_REROLL_EFFECT_KIND]: (heroicInspiration) => ({
        source: "heroicInspiration" as const,
        issue: heroicInspirationRerollRollIssue({
          availability: heroicInspirationRerollAvailability,
          total: roll.total,
          originalD20TestRoll: roll.d20TestRoll,
          decision: heroicInspiration,
          requiredRollMode: input.requiredRollMode,
        }),
      }),
    }),
  );
}

/**
 * Spends the attacker's Heroic Inspiration when the admitted attack roll took
 * its reroll, and records the roll for the rest of the subject. On a replay
 * of the subject the same roll finds it already spent and changes nothing.
 */
export function battleStateAfterHeroicInspirationReroll(
  state: BattleState,
  use: AttackRollHeroicInspirationUse,
): BattleState {
  if (!use.spends) {
    return state;
  }
  const actor = state.combatants.get(use.actorId);
  /* v8 ignore next -- @preserve -- A validated Heroic Inspiration reroll belongs to a character. */
  if (actor?.origin.kind !== "character") return state;
  if (actor.origin.heroicInspiration.tag === "none") {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(use.actorId, {
      ...actor,
      origin: { ...actor.origin, heroicInspiration: NO_HEROIC_INSPIRATION },
    }),
    currentTurnResources: {
      ...state.currentTurnResources,
      heroicInspirationAttackRollReroll: {
        actorId: use.actorId,
        attackRollHoleId: use.attackRollHoleId,
      },
    },
  };
}

/**
 * Turn resources once no subject is pending: the record of the roll that spent
 * Heroic Inspiration belongs to the subject that made it.
 */
export function turnResourcesWithoutHeroicInspirationAttackRollReroll(
  resources: BattleTurnResources,
): BattleTurnResources {
  const {
    heroicInspirationAttackRollReroll: _completedSubjectReroll,
    ...withoutReroll
  } = resources;
  return withoutReroll;
}

/**
 * The attack roll after its D20 Test reroll decisions, each applied to the
 * roll the decisions before it left.
 */
export function attackRollAfterD20TestRerolls(
  attackRoll: BattleAttackRollResult,
): BattleAttackRollResult {
  return (attackRoll.d20TestRerolls ?? []).reduce(
    attackRollAfterD20TestRollReroll,
    attackRoll,
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
