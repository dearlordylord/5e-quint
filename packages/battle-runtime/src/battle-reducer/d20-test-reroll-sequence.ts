// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.HEROIC_INSPIRATION_REROLL
// The order every D20 Test reroll list follows, whatever the roll: an attack
// roll's total, an ability check's total, a saving throw's ruled outcome or a
// Death Saving Throw's bare d20. The roller decides for each source it has,
// in the order it chooses, and each decision applies to the roll as the
// decisions before it left it. See ASSUMPTIONS.md A55 on sequential rerolls
// from different sources.

/** Every source that may reroll a D20 Test's d20. */
export const D20_TEST_REROLL_SOURCES = [
  "naturalOne",
  "heroicInspiration",
  "missedSpellAttack",
  "failedSavingThrow",
] as const;
/** One of {@link D20_TEST_REROLL_SOURCES}. */
export type D20TestRerollSource = (typeof D20_TEST_REROLL_SOURCES)[number];

/** One flag for each source a roll can be rerolled by. */
export type D20TestRerollSourceFlags<Source extends D20TestRerollSource> = {
  readonly [S in Source]: boolean;
};

export const D20_TEST_REROLL_SOURCE_REPEATED_MESSAGE =
  "A reroll source decides once on each roll and rerolls a D20 Test roll at most once; only a different source may reroll the new roll.";

/** One decision's source, checked against the roll as it stands. */
export type D20TestRerollStep<Source extends D20TestRerollSource> = {
  readonly source: Source;
  readonly issue: string | null;
};

/** How one kind of roll takes its reroll decisions. */
export type D20TestRerollRules<
  Roll,
  Decision,
  Source extends D20TestRerollSource,
> = {
  /** The sources this roll can be rerolled by. */
  readonly sources: readonly Source[];
  /** The decision's source, and its issue against the roll as it stands. */
  readonly step: (roll: Roll, decision: Decision) => D20TestRerollStep<Source>;
  /** Whether the decision rerolls (as opposed to declining). */
  readonly takesReroll: (decision: Decision) => boolean;
  /** The roll after the decision's reroll. */
  readonly rollAfter: (roll: Roll, decision: Decision) => Roll;
  /** Whether a source that hasn't decided on the roll as it stands is asked to. */
  readonly offered: { readonly [S in Source]: (roll: Roll) => boolean };
};

/** Where one roll's D20 Test rerolls stand. */
export type D20TestRerolls<Roll, Source extends D20TestRerollSource> =
  | {
      readonly tag: "decisionsRequired";
      /** The sources the roll is asked again with. */
      readonly options: D20TestRerollSourceFlags<Source>;
    }
  | { readonly tag: "invalid"; readonly issue: string }
  | {
      readonly tag: "resolved";
      /** The roll that stands after every decision. */
      readonly roll: Roll;
      /** Sources that rerolled the die. */
      readonly rerolled: D20TestRerollSourceFlags<Source>;
    };

type D20TestRerollSequence<Roll, Source extends D20TestRerollSource> =
  | { readonly tag: "invalid"; readonly issue: string }
  | {
      readonly tag: "applied";
      /** The roll after every decision so far. */
      readonly roll: Roll;
      /** Sources that rerolled the die: each rerolls it at most once. */
      readonly rerolled: D20TestRerollSourceFlags<Source>;
      /** Sources that decided on the roll as it stands now. */
      readonly decidedOnRoll: D20TestRerollSourceFlags<Source>;
    };

/**
 * Checks a roll's reroll decisions in the order the roller made them and gives
 * the roll that stands. Each decision is checked against the roll as the
 * decisions before it left it. A decline decides only for the roll it was made
 * on; a reroll uses its source and gives a new roll the other sources may
 * decide on again. While an offered source is undecided on the roll as it
 * stands, the roll is asked again with its option.
 */
export function d20TestRerolls<
  Roll,
  Decision,
  Source extends D20TestRerollSource,
>(input: {
  readonly roll: Roll;
  readonly decisions: readonly Decision[];
  readonly rules: D20TestRerollRules<Roll, Decision, Source>;
}): D20TestRerolls<Roll, Source> {
  const sequence = d20TestRerollSequence(input);
  if (sequence.tag === "invalid") {
    return sequence;
  }
  const options = sourceFlags(
    input.rules.sources,
    (source) =>
      !sequence.rerolled[source] &&
      !sequence.decidedOnRoll[source] &&
      input.rules.offered[source](sequence.roll),
  );
  if (input.rules.sources.some((source) => options[source])) {
    return { tag: "decisionsRequired", options };
  }
  return {
    tag: "resolved",
    roll: sequence.roll,
    rerolled: sequence.rerolled,
  };
}

/** The roll after its reroll decisions, each applied to the roll the ones before it left. */
export function d20TestRollAfterRerolls<Roll, Decision>(
  roll: Roll,
  decisions: readonly Decision[],
  rollAfter: (roll: Roll, decision: Decision) => Roll,
): Roll {
  return decisions.reduce(rollAfter, roll);
}

function d20TestRerollSequence<
  Roll,
  Decision,
  Source extends D20TestRerollSource,
>(input: {
  readonly roll: Roll;
  readonly decisions: readonly Decision[];
  readonly rules: D20TestRerollRules<Roll, Decision, Source>;
}): D20TestRerollSequence<Roll, Source> {
  const none = sourceFlags(input.rules.sources, () => false);
  const initial: D20TestRerollSequence<Roll, Source> = {
    tag: "applied",
    roll: input.roll,
    rerolled: none,
    decidedOnRoll: none,
  };
  return input.decisions.reduce(
    (sequence: D20TestRerollSequence<Roll, Source>, decision) => {
      if (sequence.tag === "invalid") {
        return sequence;
      }
      const step = input.rules.step(sequence.roll, decision);
      if (
        sequence.rerolled[step.source] ||
        sequence.decidedOnRoll[step.source]
      ) {
        return {
          tag: "invalid",
          issue: D20_TEST_REROLL_SOURCE_REPEATED_MESSAGE,
        };
      }
      if (step.issue !== null) {
        return { tag: "invalid", issue: step.issue };
      }
      return input.rules.takesReroll(decision)
        ? {
            tag: "applied",
            roll: input.rules.rollAfter(sequence.roll, decision),
            rerolled: { ...sequence.rerolled, [step.source]: true },
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

function sourceFlags<Source extends D20TestRerollSource>(
  sources: readonly Source[],
  flag: (source: Source) => boolean,
): D20TestRerollSourceFlags<Source> {
  // One entry for each source the roll can be rerolled by, which is every key
  // of the flags type.
  return Object.fromEntries(
    sources.map((source) => [source, flag(source)]),
  ) as D20TestRerollSourceFlags<Source>;
}
