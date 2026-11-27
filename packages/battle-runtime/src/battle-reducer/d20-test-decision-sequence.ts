// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.HEROIC_INSPIRATION_REROLL
// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.FAILED_D20_TEST_ADDED_DIE
// The order every D20 Test's after-roll decisions follow, whatever the roll:
// an attack roll's total, an ability check's total, a saving throw's ruled
// outcome or a Death Saving Throw's bare d20. The roller decides for each
// source it has, in the order it chooses, and each decision applies to the
// roll as the decisions before it left it. See ASSUMPTIONS.md A55 on
// sequential rerolls from different sources.
//
// A roll takes two such sequences: its rerolls, and then the dice added to
// the roll the rerolls leave (ASSUMPTIONS.md A68).

/** Every source that may reroll a D20 Test's d20. */
export const D20_TEST_REROLL_SOURCES = [
  "naturalOne",
  "heroicInspiration",
  "missedSpellAttack",
  "failedSavingThrow",
] as const;
/** One of {@link D20_TEST_REROLL_SOURCES}. */
export type D20TestRerollSource = (typeof D20_TEST_REROLL_SOURCES)[number];

/**
 * Every source that may add a die to a D20 Test that stands failed, once its
 * rerolls are decided.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Canonical source for D20TestAddedDieSource.
const D20_TEST_ADDED_DIE_SOURCES = [
  "bardicInspiration",
  "failedAbilityCheckResourceBoost",
] as const;
/** One of {@link D20_TEST_ADDED_DIE_SOURCES}. */
export type D20TestAddedDieSource = (typeof D20_TEST_ADDED_DIE_SOURCES)[number];

/** A source that decides on a D20 Test after the roll. */
export type D20TestDecisionSource = D20TestRerollSource | D20TestAddedDieSource;

/** One flag for each source a roll can take. */
export type D20TestSourceFlags<Source extends D20TestDecisionSource> = {
  readonly [S in Source]: boolean;
};

export const D20_TEST_SOURCE_REPEATED_MESSAGE =
  "A D20 Test source decides once on each roll and changes a roll at most once; only a different source may decide on the changed roll.";

/** One decision's source, checked against the roll as it stands. */
export type D20TestDecisionStep<Source extends D20TestDecisionSource> = {
  readonly source: Source;
  readonly issue: string | null;
};

/** How one kind of roll takes one sequence of after-roll decisions. */
export type D20TestDecisionRules<
  Roll,
  Decision,
  Source extends D20TestDecisionSource,
> = {
  /** The sources this roll can take in the sequence. */
  readonly sources: readonly Source[];
  /** The decision's source, and its issue against the roll as it stands. */
  readonly step: (
    roll: Roll,
    decision: Decision,
  ) => D20TestDecisionStep<Source>;
  /** Whether the decision changes the roll (as opposed to declining). */
  readonly takes: (decision: Decision) => boolean;
  /** The roll after the decision. */
  readonly rollAfter: (roll: Roll, decision: Decision) => Roll;
  /** Whether a source that hasn't decided on the roll as it stands is asked to. */
  readonly offered: { readonly [S in Source]: (roll: Roll) => boolean };
};

/** Where one roll's sequence of after-roll decisions stands. */
export type D20TestDecisions<Roll, Source extends D20TestDecisionSource> =
  | {
      readonly tag: "decisionsRequired";
      /** The sources the roll is asked again with. */
      readonly options: D20TestSourceFlags<Source>;
    }
  | { readonly tag: "invalid"; readonly issue: string }
  | {
      readonly tag: "resolved";
      /** The roll that stands after every decision. */
      readonly roll: Roll;
      /** Sources that changed the roll. */
      readonly taken: D20TestSourceFlags<Source>;
    };

type D20TestDecisionSequence<Roll, Source extends D20TestDecisionSource> =
  | { readonly tag: "invalid"; readonly issue: string }
  | {
      readonly tag: "applied";
      /** The roll after every decision so far. */
      readonly roll: Roll;
      /** Sources that changed the roll: each changes it at most once. */
      readonly taken: D20TestSourceFlags<Source>;
      /** Sources that decided on the roll as it stands now. */
      readonly decidedOnRoll: D20TestSourceFlags<Source>;
    };

/**
 * Checks a roll's decisions in the order the roller made them and gives the
 * roll that stands. Each decision is checked against the roll as the
 * decisions before it left it. A decline decides only for the roll it was
 * made on; a taken decision uses its source and gives a new roll the other
 * sources may decide on again. While an offered source is undecided on the
 * roll as it stands, the roll is asked again with its option.
 */
export function d20TestDecisions<
  Roll,
  Decision,
  Source extends D20TestDecisionSource,
>(input: {
  readonly roll: Roll;
  readonly decisions: readonly Decision[];
  readonly rules: D20TestDecisionRules<Roll, Decision, Source>;
}): D20TestDecisions<Roll, Source> {
  const sequence = d20TestDecisionSequence(input);
  if (sequence.tag === "invalid") {
    return sequence;
  }
  const options = sourceFlags(
    input.rules.sources,
    (source) =>
      !sequence.taken[source] &&
      !sequence.decidedOnRoll[source] &&
      input.rules.offered[source](sequence.roll),
  );
  if (input.rules.sources.some((source) => options[source])) {
    return { tag: "decisionsRequired", options };
  }
  return {
    tag: "resolved",
    roll: sequence.roll,
    taken: sequence.taken,
  };
}

/** The roll after its decisions, each applied to the roll the ones before it left. */
export function d20TestRollAfterDecisions<Roll, Decision>(
  roll: Roll,
  decisions: readonly Decision[],
  rollAfter: (roll: Roll, decision: Decision) => Roll,
): Roll {
  return decisions.reduce(rollAfter, roll);
}

function d20TestDecisionSequence<
  Roll,
  Decision,
  Source extends D20TestDecisionSource,
>(input: {
  readonly roll: Roll;
  readonly decisions: readonly Decision[];
  readonly rules: D20TestDecisionRules<Roll, Decision, Source>;
}): D20TestDecisionSequence<Roll, Source> {
  const none = sourceFlags(input.rules.sources, () => false);
  const initial: D20TestDecisionSequence<Roll, Source> = {
    tag: "applied",
    roll: input.roll,
    taken: none,
    decidedOnRoll: none,
  };
  return input.decisions.reduce(
    (sequence: D20TestDecisionSequence<Roll, Source>, decision) => {
      if (sequence.tag === "invalid") {
        return sequence;
      }
      const step = input.rules.step(sequence.roll, decision);
      if (sequence.taken[step.source] || sequence.decidedOnRoll[step.source]) {
        return {
          tag: "invalid",
          issue: D20_TEST_SOURCE_REPEATED_MESSAGE,
        };
      }
      if (step.issue !== null) {
        return { tag: "invalid", issue: step.issue };
      }
      return input.rules.takes(decision)
        ? {
            tag: "applied",
            roll: input.rules.rollAfter(sequence.roll, decision),
            taken: { ...sequence.taken, [step.source]: true },
            decidedOnRoll: none,
          }
        : {
            ...sequence,
            decidedOnRoll: { ...sequence.decidedOnRoll, [step.source]: true },
          };
    },
    initial,
  );
}

function sourceFlags<Source extends D20TestDecisionSource>(
  sources: readonly Source[],
  flag: (source: Source) => boolean,
): D20TestSourceFlags<Source> {
  // One entry for each source the roll can take, which is every key of the
  // flags type.
  return Object.fromEntries(
    sources.map((source) => [source, flag(source)]),
  ) as D20TestSourceFlags<Source>;
}
