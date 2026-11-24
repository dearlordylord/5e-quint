// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.HEROIC_INSPIRATION_REROLL
// Every D20 Test reroll source on one attack roll: the natural-1 reroll,
// Heroic Inspiration and, on a spell attack, Seeking Spell. The roller decides
// for each source it has, in the order it chooses, and each decision applies
// to the roll as the decisions before it left it. See ASSUMPTIONS.md A55 on
// sequential rerolls from different sources.

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
  type BattleSpellAttackRerollDecision,
  type BattleSpellAttackRollHole,
  type BattleState,
} from "../battle-state-execution.ts";
import type { BattleSubject } from "../battle-subjects.ts";
import { subjectContinuationPhaseFor } from "./subject-continuation-phase.ts";
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
export type AttackRollD20TestRerollOptions = {
  readonly [Source in AttackRollD20TestRerollSource]: boolean;
};

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

/**
 * Whether an admitted attack roll spends Heroic Inspiration. Only
 * attackRollD20TestRerolls makes one, so the spend follows a checked decision.
 */
export type AttackRollHeroicInspirationUse = Brand.Branded<
  | { readonly spends: false }
  | {
      readonly spends: true;
      readonly actorId: CombatantId;
      readonly subject: BattleSubject;
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
 * Where the attacker's Heroic Inspiration stands for this roll. A replay after
 * a reaction window resolves the subject's rolls again from the state after a
 * spend, so the roll that spent it can take it again, and an earlier roll's
 * decline still stands.
 */
function heroicInspirationRerollAvailabilityForRoll(
  input: AttackRollD20TestRerollInput,
): HeroicInspirationRerollAvailability {
  const spent = subjectContinuationPhaseFor(
    input.state,
    input.subject,
  ).acceptedHeroicInspirationReroll;
  if (
    spent?.actorId === input.attackerId &&
    spent.attackRollHoleId === input.attackRollHoleId
  )
    return "available";
  if (
    combatantHasHeroicInspiration(input.state.combatants.get(input.attackerId))
  )
    return "available";
  return spent?.actorId === input.attackerId
    ? "spentOnAnotherRoll"
    : "unavailable";
}

function heroicInspirationWasAcceptedForRoll(
  input: AttackRollD20TestRerollInput,
): boolean {
  const spent = subjectContinuationPhaseFor(
    input.state,
    input.subject,
  ).acceptedHeroicInspirationReroll;
  return (
    spent?.actorId === input.attackerId &&
    spent.attackRollHoleId === input.attackRollHoleId
  );
}

/**
 * Checks an attack roll's reroll decisions in the order the roller made them
 * and gives the roll that stands. Each decision is checked against the roll as
 * the decisions before it left it. While a source that can still reroll is
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
  const open = (source: AttackRollD20TestRerollSource): boolean =>
    !sequence.rerolled[source] && !sequence.decidedOnRoll[source];
  const options = {
    naturalOne:
      open("naturalOne") &&
      d20TestNaturalOneRerollRollDecisionRequired({
        actor: input.state.combatants.get(input.attackerId),
        originalD20TestRoll: sequence.attackRoll.d20TestRoll,
        decision: undefined,
      }),
    heroicInspiration:
      open("heroicInspiration") &&
      heroicInspirationRerollAvailability === "available",
    missedSpellAttack:
      open("missedSpellAttack") &&
      input.missedSpellAttackReroll?.offered(sequence.attackRoll) === true,
  } as const satisfies AttackRollD20TestRerollOptions;
  if (ATTACK_ROLL_D20_TEST_REROLL_SOURCES.some((source) => options[source])) {
    return { tag: "decisionsRequired", options };
  }
  return {
    tag: "resolved",
    effectiveAttackRoll: sequence.attackRoll,
    heroicInspirationUse: AttackRollHeroicInspirationUse(
      sequence.rerolled.heroicInspiration &&
        !heroicInspirationWasAcceptedForRoll(input)
        ? {
            spends: true,
            actorId: input.attackerId,
            subject: input.subject,
            attackRollHoleId: input.attackRollHoleId,
          }
        : { spends: false },
    ),
    missedSpellAttackRerollTaken: sequence.rerolled.missedSpellAttack,
  };
}

export const ATTACK_ROLL_D20_TEST_REROLL_SOURCE_REPEATED_MESSAGE =
  "A reroll source decides once on each roll and rerolls a D20 Test roll at most once; only a different source may reroll the new roll.";

type AttackRollD20TestRerollSources = {
  readonly [Source in AttackRollD20TestRerollSource]: boolean;
};

const NO_ATTACK_ROLL_D20_TEST_REROLL_SOURCES = {
  naturalOne: false,
  heroicInspiration: false,
  missedSpellAttack: false,
} as const satisfies AttackRollD20TestRerollSources;

type AttackRollD20TestRerollSequence =
  | { readonly tag: "invalid"; readonly issue: string }
  | {
      readonly tag: "applied";
      /** The roll after every decision so far. */
      readonly attackRoll: BattleAttackRollResult;
      /** Sources that rerolled the die: each rerolls it at most once. */
      readonly rerolled: AttackRollD20TestRerollSources;
      /** Sources that decided on the roll as it stands now. */
      readonly decidedOnRoll: AttackRollD20TestRerollSources;
    };

type AttackRollD20TestRerollStep = {
  readonly source: AttackRollD20TestRerollSource;
  readonly issue: string | null;
};

/**
 * Applies an attack roll's reroll decisions in order, checking each one. A
 * decline decides only for the roll it was made on; a reroll uses its source
 * and gives a new roll the other sources may decide on again.
 */
function attackRollD20TestRerollSequence(
  input: AttackRollD20TestRerollInput,
  heroicInspirationRerollAvailability: HeroicInspirationRerollAvailability,
): AttackRollD20TestRerollSequence {
  const initial: AttackRollD20TestRerollSequence = {
    tag: "applied",
    attackRoll: input.attackRoll,
    rerolled: NO_ATTACK_ROLL_D20_TEST_REROLL_SOURCES,
    decidedOnRoll: NO_ATTACK_ROLL_D20_TEST_REROLL_SOURCES,
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
      if (
        sequence.rerolled[step.source] ||
        sequence.decidedOnRoll[step.source]
      ) {
        return {
          tag: "invalid",
          issue: ATTACK_ROLL_D20_TEST_REROLL_SOURCE_REPEATED_MESSAGE,
        };
      }
      if (step.issue !== null) {
        return { tag: "invalid", issue: step.issue };
      }
      return d20TestRerollDecisionTakesReroll(decision)
        ? {
            tag: "applied",
            attackRoll: attackRollAfterD20TestRollReroll(
              sequence.attackRoll,
              decision,
            ),
            rerolled: { ...sequence.rerolled, [step.source]: true },
            decidedOnRoll: NO_ATTACK_ROLL_D20_TEST_REROLL_SOURCES,
          }
        : {
            ...sequence,
            decidedOnRoll: { ...sequence.decidedOnRoll, [step.source]: true },
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
      [SEEKING_METAMAGIC_EFFECT_KIND]: (missedSpellAttack) => ({
        source: "missedSpellAttack" as const,
        issue:
          input.missedSpellAttackReroll === undefined
            ? SEEKING_SPELL_REROLL_UNSUPPORTED_ATTACK_ROLL_OWNER_MESSAGE
            : input.missedSpellAttackReroll.decisionIssue(
                roll,
                missedSpellAttack,
              ),
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
    subjectResolutionPhase: {
      ...subjectContinuationPhaseFor(state, use.subject),
      acceptedHeroicInspirationReroll: {
        actorId: use.actorId,
        attackRollHoleId: use.attackRollHoleId,
      },
    },
  };
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
