// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.HEROIC_INSPIRATION_REROLL
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.d20-test-natural-one-reroll
// Checks the reroll decisions on a subject's rolled D20 Test outcomes (ability
// checks, saving throws and Concentration saves) before the subject resolves.
// A roller who still has a source to decide on is asked the same hole again
// with that option. The Heroic Inspiration the admitted rolls took is spent
// once, before the subject's owners read the rolls that stand.

import {
  d20TestRollMode,
  type AttackRollMode,
} from "@dnd/shared-algebras/runtime-hole-algebra";

import type {
  AdmittedBattleResolutionInput,
  BattleConcentrationSavingThrowHole,
  BattleFill,
  BattleHole,
  BattleOrdinaryHole,
  BattleResolutionResult,
  BattleSavingThrowOutcome,
  BattleState,
} from "../battle-state-execution.ts";
import { battleSubjectActorId } from "./creature-state-execution.ts";
import {
  D20_TEST_NATURAL_ONE_REROLL_MODE_MESSAGE,
  D20_TEST_REROLL_DECISION_REQUIRED_MESSAGE,
} from "./d20-test-natural-one-reroll.ts";
import {
  d20TestAbilityCheckRerolls,
  d20TestHoleWithRerollOptions,
  d20TestOutcomeRerolls,
  type D20TestOutcomeRerollOptions,
  type D20TestOutcomeRerolls,
} from "./d20-test-outcome-rerolls.ts";
import {
  battleStateAfterHeroicInspirationRerolls,
  type HeroicInspirationUse,
} from "./heroic-inspiration-reroll.ts";
import { invalidResult } from "./result-helpers.ts";

export const D20_TEST_REROLL_ROLLER_REQUIRED_MESSAGE =
  "Concentration Saving Throw reroll decisions need the discovered hole that names the concentrating creature.";

type D20TestRerollPrefixResolver = (
  input: AdmittedBattleResolutionInput,
) => BattleResolutionResult;

const D20_TEST_REROLL_DECISION_HOLE_KINDS = [
  "abilityCheck",
  "concentrationSavingThrow",
  "savingThrowOutcome",
  "spellcastingAbilityCheck",
] as const satisfies readonly BattleOrdinaryHole["kind"][];
type D20TestRerollDecisionHoleKind =
  (typeof D20_TEST_REROLL_DECISION_HOLE_KINDS)[number];

type D20TestRerollDecisionHole = Extract<
  BattleOrdinaryHole,
  { readonly kind: D20TestRerollDecisionHoleKind }
>;

function isD20TestRerollDecisionHole(
  hole: BattleOrdinaryHole,
): hole is D20TestRerollDecisionHole {
  return D20_TEST_REROLL_DECISION_HOLE_KINDS.some((kind) => kind === hole.kind);
}

type D20TestRerollFillValidation =
  | {
      readonly tag: "ok";
      /** The state after every Heroic Inspiration the fills spend. */
      readonly state: BattleState;
    }
  | { readonly tag: "invalid"; readonly message: string }
  | {
      readonly tag: "decisionsRequired";
      readonly fillIndex: number;
      readonly holeId: BattleFill["holeId"];
      readonly holeKind: D20TestRerollDecisionHoleKind;
      readonly options: D20TestOutcomeRerollOptions;
      /** The state after the Heroic Inspiration the earlier fills spend. */
      readonly state: BattleState;
    };

type D20TestRerollAbilityCheckHole = Extract<
  BattleHole,
  { readonly kind: "abilityCheck" | "spellcastingAbilityCheck" }
>;

type D20TestRerollSavingThrowOutcomeHole = Extract<
  BattleHole,
  { readonly kind: "savingThrowOutcome" }
>;

type D20TestRerollFillContext = {
  readonly resolutionInput: AdmittedBattleResolutionInput;
  readonly fillIndex: number;
  readonly resolvePrefix: D20TestRerollPrefixResolver;
};

function pendingHolesBeforeFill(
  input: D20TestRerollFillContext,
): readonly BattleHole[] {
  const pending = input.resolvePrefix({
    ...input.resolutionInput,
    fills: input.resolutionInput.fills.slice(0, input.fillIndex),
  });
  if (pending.tag !== "needsHoles") return [];
  return pending.frontier.kind === "holes"
    ? pending.frontier.holes
    : [pending.frontier.decisionHole];
}

function abilityCheckHoleForFill(
  input: D20TestRerollFillContext & {
    readonly fill: Extract<BattleFill, { readonly kind: "abilityCheck" }>;
  },
): D20TestRerollAbilityCheckHole | undefined {
  return pendingHolesBeforeFill(input).find(
    (hole): hole is D20TestRerollAbilityCheckHole =>
      (hole.kind === "abilityCheck" ||
        hole.kind === "spellcastingAbilityCheck") &&
      hole.holeId === input.fill.holeId,
  );
}

function savingThrowOutcomeHoleForFill(
  input: D20TestRerollFillContext & {
    readonly fill: Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>;
  },
): D20TestRerollSavingThrowOutcomeHole | undefined {
  return pendingHolesBeforeFill(input).find(
    (hole): hole is D20TestRerollSavingThrowOutcomeHole =>
      hole.kind === "savingThrowOutcome" && hole.holeId === input.fill.holeId,
  );
}

function concentrationSavingThrowHoleForFill(
  input: D20TestRerollFillContext & {
    readonly fill: Extract<
      BattleFill,
      { readonly kind: "concentrationSavingThrow" }
    >;
  },
): BattleConcentrationSavingThrowHole | undefined {
  return pendingHolesBeforeFill(input).find(
    (hole): hole is BattleConcentrationSavingThrowHole =>
      hole.kind === "concentrationSavingThrow" &&
      hole.holeId === input.fill.holeId,
  );
}

function savingThrowOutcomeRollModeForTarget(
  hole: D20TestRerollSavingThrowOutcomeHole | undefined,
  targetId: BattleSavingThrowOutcome["targetId"],
): AttackRollMode | undefined {
  return hole?.targetRollModes.find(
    (projection) => projection.targetId === targetId,
  )?.rollMode;
}

function savingThrowOutcomeRollModeIssue(input: {
  readonly d20TestRoll: BattleSavingThrowOutcome["d20TestRoll"];
  readonly requiredRollMode: AttackRollMode | undefined;
}): string | null {
  if (input.d20TestRoll === undefined) return null;
  return d20TestRollMode(input.d20TestRoll) ===
    (input.requiredRollMode ?? "normal")
    ? null
    : D20_TEST_NATURAL_ONE_REROLL_MODE_MESSAGE;
}

/** One rolled D20 Test's check, in the shape the fill validation folds. */
type D20TestRollCheck =
  | { readonly tag: "admitted"; readonly use: HeroicInspirationUse }
  | Extract<D20TestRerollFillValidation, { readonly tag: "invalid" }>
  | Omit<
      Extract<
        D20TestRerollFillValidation,
        { readonly tag: "decisionsRequired" }
      >,
      "state"
    >;

function d20TestRollCheck<Roll>(
  rerolls: D20TestOutcomeRerolls<Roll>,
  hole: Pick<
    Extract<D20TestRerollFillValidation, { readonly tag: "decisionsRequired" }>,
    "fillIndex" | "holeId" | "holeKind"
  >,
): D20TestRollCheck {
  if (rerolls.tag === "resolved")
    return { tag: "admitted", use: rerolls.heroicInspirationUse };
  if (rerolls.tag === "invalid")
    return { tag: "invalid", message: rerolls.issue };
  return { tag: "decisionsRequired", ...hole, options: rerolls.options };
}

function d20TestRollChecksForFill(
  input: D20TestRerollFillContext & { readonly fill: BattleFill },
): readonly D20TestRollCheck[] {
  const fill = input.fill;
  if (fill.kind === "abilityCheck") {
    return abilityCheckRollChecks({ ...input, fill });
  }
  if (fill.kind === "savingThrowOutcome") {
    return savingThrowOutcomeRollChecks({ ...input, fill });
  }
  if (fill.kind === "concentrationSavingThrow") {
    return concentrationSavingThrowRollChecks({ ...input, fill });
  }
  return [];
}

function abilityCheckRollChecks(
  input: D20TestRerollFillContext & {
    readonly fill: Extract<BattleFill, { readonly kind: "abilityCheck" }>;
  },
): readonly D20TestRollCheck[] {
  const { state, subject } = input.resolutionInput;
  const scope = { kind: "subject", subject } as const;
  const fill = input.fill;
  const hole = abilityCheckHoleForFill({ ...input, fill });
  return [
    d20TestRollCheck(
      d20TestAbilityCheckRerolls({
        state,
        scope,
        roll: {
          rollerId: battleSubjectActorId(subject),
          holeId: fill.holeId,
        },
        value: fill.value,
        requiredRollMode:
          hole?.kind === "abilityCheck" ? hole.rollMode : undefined,
      }),
      {
        fillIndex: input.fillIndex,
        holeId: fill.holeId,
        holeKind: hole?.kind ?? "abilityCheck",
      },
    ),
  ];
}

function savingThrowOutcomeRollChecks(
  input: D20TestRerollFillContext & {
    readonly fill: Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>;
  },
): readonly D20TestRollCheck[] {
  const { state, subject } = input.resolutionInput;
  const scope = { kind: "subject", subject } as const;
  const fill = input.fill;
  const hole = savingThrowOutcomeHoleForFill({ ...input, fill });
  return fill.value.outcomes.map((outcome) => {
    const rollModeIssue = savingThrowOutcomeRollModeIssue({
      d20TestRoll: outcome.d20TestRoll,
      requiredRollMode: savingThrowOutcomeRollModeForTarget(
        hole,
        outcome.targetId,
      ),
    });
    /* v8 ignore start -- @preserve -- Malformed resolution input: a saving-throw roll whose mode contradicts the discovered target's D20 Test mode. */
    if (rollModeIssue !== null)
      return { tag: "invalid", message: rollModeIssue };
    /* v8 ignore stop -- @preserve */
    return d20TestRollCheck(
      d20TestOutcomeRerolls({
        state,
        scope,
        roll: { rollerId: outcome.targetId, holeId: fill.holeId },
        outcome,
      }),
      {
        fillIndex: input.fillIndex,
        holeId: fill.holeId,
        holeKind: "savingThrowOutcome",
      },
    );
  });
}

function concentrationSavingThrowRollChecks(
  input: D20TestRerollFillContext & {
    readonly fill: Extract<
      BattleFill,
      { readonly kind: "concentrationSavingThrow" }
    >;
  },
): readonly D20TestRollCheck[] {
  const { state, subject } = input.resolutionInput;
  const scope = { kind: "subject", subject } as const;
  const fill = input.fill;
  const hole = concentrationSavingThrowHoleForFill({ ...input, fill });
  if (hole === undefined) {
    /* v8 ignore start -- @preserve -- Malformed resolution input: reroll decisions on a Concentration save that the subject never asked for. */
    return fill.value.d20TestRerolls === undefined
      ? []
      : [
          {
            tag: "invalid",
            message: D20_TEST_REROLL_ROLLER_REQUIRED_MESSAGE,
          },
        ];
    /* v8 ignore stop -- @preserve */
  }
  return [
    d20TestRollCheck(
      d20TestOutcomeRerolls({
        state,
        scope,
        roll: { rollerId: hole.combatantId, holeId: fill.holeId },
        outcome: fill.value,
      }),
      {
        fillIndex: input.fillIndex,
        holeId: fill.holeId,
        holeKind: "concentrationSavingThrow",
      },
    ),
  ];
}

function validateD20TestRerollFills(input: {
  readonly resolutionInput: AdmittedBattleResolutionInput;
  readonly resolvePrefix: D20TestRerollPrefixResolver;
}): D20TestRerollFillValidation {
  // Each fill is checked against the state after the Heroic Inspiration the
  // earlier fills spend, so a later roll is not offered a spent reroll.
  let resolutionInput = input.resolutionInput;
  for (const [fillIndex, fill] of input.resolutionInput.fills.entries()) {
    const fillUses: HeroicInspirationUse[] = [];
    for (const check of d20TestRollChecksForFill({
      resolutionInput,
      resolvePrefix: input.resolvePrefix,
      fillIndex,
      fill,
    })) {
      if (check.tag === "decisionsRequired") {
        return { ...check, state: resolutionInput.state };
      }
      if (check.tag !== "admitted") return check;
      fillUses.push(check.use);
    }
    resolutionInput = {
      ...resolutionInput,
      state: battleStateAfterHeroicInspirationRerolls(
        resolutionInput.state,
        fillUses,
      ),
    };
  }
  return { tag: "ok", state: resolutionInput.state };
}

function resolveD20TestRerollDecisionHole(input: {
  readonly resolutionInput: AdmittedBattleResolutionInput;
  readonly decision: Extract<
    D20TestRerollFillValidation,
    { readonly tag: "decisionsRequired" }
  >;
  readonly resolvePrefix: D20TestRerollPrefixResolver;
}): BattleResolutionResult {
  const pending = input.resolvePrefix({
    ...input.resolutionInput,
    state: input.decision.state,
    fills: input.resolutionInput.fills.slice(0, input.decision.fillIndex),
  });
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (pending.tag !== "needsHoles" || pending.frontier.kind !== "holes") {
    return invalidResult(
      input.resolutionInput.state,
      "invalidFill",
      D20_TEST_REROLL_DECISION_REQUIRED_MESSAGE,
    );
  }
  /* v8 ignore stop -- @preserve */
  let matched = false;
  const holes = pending.frontier.holes.map((hole): BattleOrdinaryHole => {
    if (
      isD20TestRerollDecisionHole(hole) &&
      hole.kind === input.decision.holeKind &&
      hole.holeId === input.decision.holeId
    ) {
      matched = true;
      return d20TestHoleWithRerollOptions(hole, input.decision.options);
    }
    return hole;
  });
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!matched) {
    return invalidResult(
      input.resolutionInput.state,
      "invalidFill",
      D20_TEST_REROLL_DECISION_REQUIRED_MESSAGE,
    );
  }
  /* v8 ignore stop -- @preserve */
  return {
    ...pending,
    frontier: {
      ...pending.frontier,
      holes: [holes[0], ...holes.slice(1)],
    },
  };
}

/** Where a subject's rolled D20 Test outcomes stand before it resolves. */
export type D20TestRerollFills =
  | { readonly tag: "settled"; readonly result: BattleResolutionResult }
  | {
      readonly tag: "admitted";
      /** The input state after the Heroic Inspiration the admitted rolls took. */
      readonly state: BattleState;
    };

/**
 * Checks the reroll decisions on every rolled D20 Test outcome in the fills.
 * Settles with the hole asked again while a roller has a source to decide on,
 * or with an invalid result; otherwise admits the fills and gives the state
 * after the Heroic Inspiration they spend.
 */
export function resolveD20TestRerollFills(input: {
  readonly resolutionInput: AdmittedBattleResolutionInput;
  readonly resolvePrefix: D20TestRerollPrefixResolver;
}): D20TestRerollFills {
  const validation = validateD20TestRerollFills(input);
  if (validation.tag === "invalid") {
    return {
      tag: "settled",
      result: invalidResult(
        input.resolutionInput.state,
        "invalidFill",
        validation.message,
      ),
    };
  }
  if (validation.tag === "decisionsRequired") {
    return {
      tag: "settled",
      result: resolveD20TestRerollDecisionHole({
        ...input,
        decision: validation,
      }),
    };
  }
  return { tag: "admitted", state: validation.state };
}
