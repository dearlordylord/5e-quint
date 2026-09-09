import { optionalProperty } from "../../optional-property.ts";
import { discoverTargetSavingThrowSpellCastActs } from "../saving-throw-metamagic-holes.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-hideous-laughter-repeat-save-lifecycle
//
// The saveGatedConditionWithRepeat Spell Procedure Profile: action-time Spell Slot casting
// where target-list creatures make a Wisdom Saving Throw before failed-save
// targets receive Prone and Incapacitated spell effects with repeat Saving
// Throws at end of turn and on damage.
//
// RAW anchors:
//   - SRD 5.2.1 Spells: Hideous Laughter applies Prone and Incapacitated on a
//     failed Wisdom Saving Throw, prevents the target from ending Prone on
//     itself, repeats the save at end of target turn and on damage with
//     Advantage, and adds one target per Spell Slot level above 1.
//   - UBIQUITOUS_LANGUAGE.md: Saving Throw, Advantage, Condition, Prone,
//     Incapacitated, Magic Action, and Spell Invocation.

import { MovementFeet, PositiveInteger, movementFeet } from "@dnd/shared/types";
import {
  ElapsedTimeTicksSchema,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import type {
  ActivationPhase,
  EffectAtom,
  SpellMechanics,
} from "@dnd/surface/surface/types";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
import {
  type BattleSpellExecutionSource,
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { type CombatantId } from "../../identity.ts";
import { readiedSpellAct } from "../spells-discovery.ts";
import { resolveSaveGatedConditionWithRepeatSpellAct } from "../spells-resolve-save-gates.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { spellInvocationResourceForCastOption } from "./profile.ts";
import { Match, Schema } from "effect";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  DcSourceSchema,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import { spellTargetListHole } from "../spells-holes-fills.ts";
import {
  SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS,
  SAVE_GATED_CONDITION_WITH_REPEAT_EXECUTION_FACTS,
  SAVE_GATED_CONDITION_WITH_REPEAT_FAILURE_ROLES,
  SAVE_GATED_CONDITION_WITH_REPEAT_REPEAT_ROLES,
} from "../domain-constants.ts";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";
import {
  saveGateTargetCountFactsFromSelection,
  saveGatedConditionTargetingFromFacts,
  type SaveGateConditionTargetingFacts,
} from "./_save-gate-helpers.ts";
import {
  admitSpellTargetAttachment,
  isSpellCanonicalDurationValue,
  spellConsumedMaterialEvidencePaths,
  spellDurationChildCoordinates,
  spellDurationChildPath,
  spellDurationEvidencePaths,
  spellDurationTicksFromCanonicalValue,
  spellHasOnlyNamedFields,
  spellProcedureHasRedundantSignature,
  spellProcedureNonEmpty,
  spellUniqueMechanicsIssues,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureAdmissionIssue,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellActivationRepeatPath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
  spellDurationValuePath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";

type SaveGatedConditionWithRepeatSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedConditionWithRepeat" }
>;

type SaveGatedConditionWithRepeatMechanicsFacts = SpellDefinitionRuleFacts & {
  readonly ability: typeof SAVE_GATED_CONDITION_WITH_REPEAT_EXECUTION_FACTS.ability;
  readonly dc: SaveGatedConditionWithRepeatSpellInvocation["dc"];
  readonly targeting: Extract<
    SaveGateConditionTargetingFacts,
    {
      readonly kind: typeof SAVE_GATED_CONDITION_WITH_REPEAT_EXECUTION_FACTS.targeting.kind;
    }
  >;
  readonly rangeFeet: MovementFeet;
  readonly durationTicks: ElapsedTimeTicks;
};

type SaveGatedConditionWithRepeatResolveInput =
  SpellProcedureProfileResolveInput<SaveGatedConditionWithRepeatSpellInvocation>;

type SaveGatedConditionWithRepeatFailedFact =
  | "level"
  | "castingTime"
  | "range"
  | "duration"
  | "durationValue"
  | "durationExtension"
  | "durationEnding"
  | "rootShape"
  | "phaseCount"
  | "phaseOrder"
  | "phaseShape"
  | "phaseAbility"
  | "phaseDc"
  | "phaseAttachment"
  | "successOutcome"
  | "failedSaveEffect"
  | "extraFailureEffect"
  | "missingFailureEffect"
  | "missingRepeat"
  | "extraRepeat"
  | "requiredFacts";

type SaveGatedConditionWithRepeatMechanicsIssue = SpellProcedureAdmissionIssue<
  "saveGatedConditionWithRepeat",
  SaveGatedConditionWithRepeatFailedFact,
  UnitMechanicsPath
>;

const SAVE_GATED_CONDITION_WITH_REPEAT_FAILED_FACT_MESSAGES = {
  level: "The staged save-condition procedure requires a first-level spell.",
  castingTime:
    "The staged save-condition procedure requires an action casting time.",
  range: "The staged save-condition procedure requires a 30-foot point range.",
  duration:
    "The staged save-condition procedure requires one minute of concentration.",
  durationValue:
    "The staged save-condition procedure requires a one-minute concentration value.",
  durationExtension:
    "The staged save-condition procedure has an unsupported duration extension.",
  durationEnding:
    "The staged save-condition procedure has an unsupported duration ending.",
  rootShape:
    "The staged save-condition procedure has unsupported activation root fields.",
  phaseCount:
    "The staged save-condition procedure requires exactly one activation phase.",
  phaseOrder:
    "The staged save-condition procedure's save gate must be the first phase.",
  phaseShape:
    "The staged save-condition procedure has an unsupported save-gate field.",
  phaseAbility:
    "The staged save-condition procedure requires a Wisdom Saving Throw.",
  phaseDc:
    "The staged save-condition procedure requires the caster's Spell Save DC.",
  phaseAttachment:
    "The staged save-condition procedure requires one creature target selection.",
  successOutcome:
    "The staged save-condition procedure requires no successful-save effect.",
  failedSaveEffect:
    "The staged save-condition procedure has an unsupported failed-save bundle.",
  extraFailureEffect:
    "The staged save-condition procedure has an unsupported additional failed-save effect.",
  missingFailureEffect:
    "The staged save-condition procedure is missing a required failed-save effect.",
  missingRepeat:
    "The staged save-condition procedure is missing a required repeat save.",
  extraRepeat:
    "The staged save-condition procedure has an unsupported additional repeat save.",
  requiredFacts:
    "The staged save-condition procedure's admitted mechanics did not retain required facts.",
} as const satisfies Record<SaveGatedConditionWithRepeatFailedFact, string>;

function saveGatedConditionWithRepeatIssue(
  failedFact: SaveGatedConditionWithRepeatFailedFact,
  mechanicsPath: UnitMechanicsPath,
): SaveGatedConditionWithRepeatMechanicsIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "saveGatedConditionWithRepeat",
    failedFact,
    mechanicsPath,
    message: SAVE_GATED_CONDITION_WITH_REPEAT_FAILED_FACT_MESSAGES[failedFact],
  };
}

type SaveGatePhase = Extract<
  ActivationPhase,
  {
    readonly kind: typeof SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.kind;
  }
>;

type StagedSaveConditionPhaseWitnesses = Readonly<{
  slotScaledTargeting: boolean;
  endOfTurnRepeatSave: boolean;
  damageTriggeredRepeatSave: boolean;
}>;

const EMPTY_STAGED_SAVE_CONDITION_PHASE_WITNESSES: StagedSaveConditionPhaseWitnesses =
  {
    slotScaledTargeting: false,
    endOfTurnRepeatSave: false,
    damageTriggeredRepeatSave: false,
  };

type StagedSaveConditionTargetSelection = Parameters<
  typeof saveGateTargetCountFactsFromSelection
>[0];
type StagedSaveConditionSlotScaledTargetSelection = Extract<
  StagedSaveConditionTargetSelection,
  {
    readonly mode: typeof SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.targeting.mode;
  }
>;

function stagedSaveConditionTargetCountWitness(
  selection: StagedSaveConditionSlotScaledTargetSelection,
): boolean {
  if (typeof selection.count !== "object") return false;
  const expected =
    SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.targeting.count;
  return (
    selection.count.kind === expected.kind &&
    selection.count.base === expected.base &&
    selection.count.baseLevel === expected.baseLevel &&
    selection.count.perSlotAboveBase === expected.perSlotAboveBase
  );
}

function stagedSaveConditionTargetKindsWitness(
  selection: StagedSaveConditionSlotScaledTargetSelection,
): boolean {
  const expected =
    SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.targeting.targetKinds;
  return (
    selection.targetKinds?.length === expected.length &&
    selection.targetKinds[0] === expected[0]
  );
}

function stagedSaveConditionTargetScalingWitness(
  phase: SaveGatePhase,
): boolean {
  if (phase.attachment.kind !== "hole") return false;
  const attachment = phase.attachment.value;
  if (attachment.kind !== "target") return false;
  const selection = attachment.selection;
  const expected = SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.targeting;
  if (selection.mode !== expected.mode) return false;
  return (
    stagedSaveConditionTargetCountWitness(selection) &&
    stagedSaveConditionTargetKindsWitness(selection)
  );
}

function stagedSaveConditionEndTurnRepeatWitness(
  phase: SaveGatePhase,
): boolean {
  const expected =
    SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.repeats.endOfTurn;
  return (
    phase.repeatSaves?.some(
      (repeatSave) =>
        repeatSave.cadence === expected.cadence &&
        repeatSave.onSuccess === expected.onSuccess,
    ) === true
  );
}

function stagedSaveConditionDamageRepeatWitness(phase: SaveGatePhase): boolean {
  const expected =
    SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.repeats.onDamage;
  return (
    phase.repeatSaves?.some(
      (repeatSave) =>
        repeatSave.cadence === expected.cadence &&
        repeatSave.rollMode === expected.rollMode &&
        repeatSave.onSuccess === expected.onSuccess,
    ) === true
  );
}

function stagedSaveConditionPhaseWitnesses(
  phase: ActivationPhase,
): StagedSaveConditionPhaseWitnesses {
  if (
    phase.kind !== SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.kind
  ) {
    return EMPTY_STAGED_SAVE_CONDITION_PHASE_WITNESSES;
  }
  return {
    slotScaledTargeting: stagedSaveConditionTargetScalingWitness(phase),
    endOfTurnRepeatSave: stagedSaveConditionEndTurnRepeatWitness(phase),
    damageTriggeredRepeatSave: stagedSaveConditionDamageRepeatWitness(phase),
  };
}

function stagedSaveConditionRootPhase(phase: ActivationPhase): boolean {
  const witnesses = stagedSaveConditionPhaseWitnesses(phase);
  return spellProcedureHasRedundantSignature({
    kind: "oneWitnessMayBeMissing",
    witnesses: [
      { name: "slotScaledTargeting", present: witnesses.slotScaledTargeting },
      {
        name: "endOfTurnRepeatSave",
        present: witnesses.endOfTurnRepeatSave,
      },
      {
        name: "damageTriggeredRepeatSave",
        present: witnesses.damageTriggeredRepeatSave,
      },
    ],
  });
}

function stagedSaveConditionPhaseBoundaryCompatible(
  phase: ActivationPhase | undefined,
): boolean {
  if (phase === undefined) return true;
  const witnesses = stagedSaveConditionPhaseWitnesses(phase);
  return witnesses.slotScaledTargeting || witnesses.damageTriggeredRepeatSave;
}

function stagedSaveConditionHeaderSignature(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): boolean {
  return spellProcedureHasRedundantSignature({
    kind: "oneWitnessMayBeMissing",
    witnesses: [
      {
        name: "levelAndCastingTime",
        present:
          mechanics.level ===
            SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.level &&
          mechanics.castingTime.kind ===
            SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.castingTimeKind,
      },
      {
        name: "range",
        present:
          mechanics.range.kind ===
            SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.range.kind &&
          mechanics.range.feet ===
            SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.range.feet,
      },
      {
        name: "duration",
        present: isStagedSaveConditionDuration(mechanics.duration),
      },
    ],
  });
}

function stagedSaveConditionRootShape(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): boolean {
  if (mechanics.phases.some(stagedSaveConditionRootPhase)) return true;
  if (mechanics.phases.length > 1) return false;
  return (
    stagedSaveConditionPhaseBoundaryCompatible(mechanics.phases[0]) &&
    stagedSaveConditionHeaderSignature(mechanics)
  );
}

function isStagedSaveConditionDuration(
  duration: SpellMechanics["duration"],
): duration is Extract<
  SpellMechanics["duration"],
  {
    readonly kind: typeof SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.duration.kind;
  }
> & {
  readonly upTo: Extract<
    SpellMechanics["duration"],
    {
      readonly kind: typeof SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.duration.kind;
    }
  >["upTo"] & {
    readonly amount: PositiveInteger;
  };
} {
  return (
    duration.kind ===
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.duration.kind &&
    isSpellCanonicalDurationValue(duration.upTo) &&
    duration.upTo.unit ===
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.duration.unit &&
    duration.upTo.amount ===
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.duration.amount
  );
}

function stagedSaveConditionDurationIssues(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): SaveGatedConditionWithRepeatMechanicsIssue[] {
  const issues: SaveGatedConditionWithRepeatMechanicsIssue[] = [];
  const duration = mechanics.duration;
  if (
    duration.kind !==
    SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.duration.kind
  ) {
    issues.push(
      saveGatedConditionWithRepeatIssue(
        "duration",
        spellMechanicsHeaderPath("duration"),
      ),
    );
    return issues;
  }
  if (
    !isStagedSaveConditionDuration(duration) ||
    !isSpellCanonicalDurationValue(duration.upTo) ||
    duration.upTo.unit !==
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.duration.unit ||
    duration.upTo.amount !==
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.duration.amount
  ) {
    issues.push(
      saveGatedConditionWithRepeatIssue(
        "durationValue",
        spellDurationValuePath(),
      ),
    );
  }
  for (const child of spellDurationChildCoordinates(duration)) {
    issues.push(
      saveGatedConditionWithRepeatIssue(
        child.branch === "extension" ? "durationExtension" : "durationEnding",
        spellDurationChildPath(child),
      ),
    );
  }
  return issues;
}

type StagedSaveConditionConditionName =
  | typeof SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.failureEffects.prone.condition
  | typeof SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.failureEffects.incapacitated.condition;

type StagedSaveConditionConditionEffect<
  Condition extends StagedSaveConditionConditionName,
> = Extract<
  EffectAtom,
  {
    readonly kind: typeof SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.failureEffects.prone.kind;
  }
> & { readonly condition: Condition };

type StagedSaveConditionFailureRoleEffect =
  | StagedSaveConditionConditionEffect<
      typeof SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.failureEffects.prone.condition
    >
  | StagedSaveConditionConditionEffect<
      typeof SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.failureEffects.incapacitated.condition
    >
  | Extract<
      EffectAtom,
      {
        readonly kind: typeof SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.failureEffects.suppressProne.kind;
      }
    >;

function isStagedSaveConditionConditionEffect<
  Condition extends StagedSaveConditionConditionName,
>(
  effect: EffectAtom,
  condition: Condition,
): effect is StagedSaveConditionConditionEffect<Condition> {
  return (
    effect.kind ===
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.failureEffects.prone
        .kind &&
    effect.condition === condition &&
    spellHasOnlyNamedFields(effect, ["kind", "condition"])
  );
}

function isStagedSaveConditionSuppressProneEffect(
  effect: EffectAtom,
): effect is Extract<
  EffectAtom,
  {
    readonly kind: typeof SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.failureEffects.suppressProne.kind;
  }
> {
  const expected =
    SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.failureEffects
      .suppressProne;
  return (
    effect.kind === expected.kind &&
    effect.condition === expected.condition &&
    spellHasOnlyNamedFields(effect, ["kind", "condition"])
  );
}

function stagedSaveConditionFailureRoleEffect(
  effect: EffectAtom,
): StagedSaveConditionFailureRoleEffect | undefined {
  const expected =
    SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.failureEffects;
  if (isStagedSaveConditionConditionEffect(effect, expected.prone.condition)) {
    return effect;
  }
  if (
    isStagedSaveConditionConditionEffect(
      effect,
      expected.incapacitated.condition,
    )
  ) {
    return effect;
  }
  if (isStagedSaveConditionSuppressProneEffect(effect)) {
    return effect;
  }
  return undefined;
}

function stagedSaveConditionFailureRole(
  effect: EffectAtom,
): (typeof SAVE_GATED_CONDITION_WITH_REPEAT_FAILURE_ROLES)[number] | null {
  const roleEffect = stagedSaveConditionFailureRoleEffect(effect);
  if (roleEffect === undefined) return null;
  return Match.value(roleEffect).pipe(
    Match.when(
      {
        kind: SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase
          .failureEffects.prone.kind,
      },
      (value) =>
        value.condition ===
        SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.failureEffects
          .prone.condition
          ? SAVE_GATED_CONDITION_WITH_REPEAT_FAILURE_ROLES[0]
          : SAVE_GATED_CONDITION_WITH_REPEAT_FAILURE_ROLES[1],
    ),
    Match.when(
      {
        kind: SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase
          .failureEffects.suppressProne.kind,
      },
      () => SAVE_GATED_CONDITION_WITH_REPEAT_FAILURE_ROLES[2],
    ),
    Match.exhaustive,
  );
}

type StagedSaveConditionRepeatSave = NonNullable<
  SaveGatePhase["repeatSaves"]
>[number];

function stagedSaveConditionRepeatHasNoThreshold(
  repeatSave: StagedSaveConditionRepeatSave,
): boolean {
  return (
    repeatSave.onFailAgain === undefined &&
    repeatSave.successesRequired === undefined &&
    repeatSave.failuresRequired === undefined &&
    repeatSave.onFailureThreshold === undefined
  );
}

function isStagedSaveConditionEndTurnRepeat(
  repeatSave: StagedSaveConditionRepeatSave,
): boolean {
  const expected =
    SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.repeats.endOfTurn;
  return (
    repeatSave.cadence === expected.cadence &&
    repeatSave.rollMode === undefined &&
    repeatSave.onSuccess === expected.onSuccess &&
    stagedSaveConditionRepeatHasNoThreshold(repeatSave) &&
    spellHasOnlyNamedFields(repeatSave, ["cadence", "onSuccess"])
  );
}

function isStagedSaveConditionDamageRepeat(
  repeatSave: StagedSaveConditionRepeatSave,
): boolean {
  const expected =
    SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.repeats.onDamage;
  return (
    repeatSave.cadence === expected.cadence &&
    repeatSave.rollMode === expected.rollMode &&
    repeatSave.onSuccess === expected.onSuccess &&
    stagedSaveConditionRepeatHasNoThreshold(repeatSave) &&
    spellHasOnlyNamedFields(repeatSave, ["cadence", "rollMode", "onSuccess"])
  );
}

function stagedSaveConditionRepeatRole(
  repeatSave: StagedSaveConditionRepeatSave,
): (typeof SAVE_GATED_CONDITION_WITH_REPEAT_REPEAT_ROLES)[number] | null {
  if (isStagedSaveConditionEndTurnRepeat(repeatSave)) {
    return SAVE_GATED_CONDITION_WITH_REPEAT_REPEAT_ROLES[0];
  }
  if (isStagedSaveConditionDamageRepeat(repeatSave)) {
    return SAVE_GATED_CONDITION_WITH_REPEAT_REPEAT_ROLES[1];
  }
  return null;
}

function saveGatedConditionWithRepeatMechanicsEvidence(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
  phase: SaveGatePhase,
): SpellProcedureMechanicsEvidence {
  const effects =
    phase.onFail.kind ===
    SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.failureKind
      ? phase.onFail.effects
      : [];
  const consumed: [SpellMechanicsBranchPath, ...SpellMechanicsBranchPath[]] = [
    spellMechanicsHeaderPath("level"),
    spellMechanicsHeaderPath("school"),
    spellMechanicsHeaderPath("range"),
    spellMechanicsHeaderPath("components"),
    spellMechanicsHeaderPath("duration"),
    spellMechanicsHeaderPath("castingTime"),
    spellMechanicsHeaderPath("family"),
    ...spellDurationEvidencePaths(mechanics.duration),
    spellActivationPhasePath(PositiveInteger(1)),
    spellActivationAttachmentPath(PositiveInteger(1)),
    ...effects.map((_effect, index) =>
      spellActivationEffectPath(PositiveInteger(1), PositiveInteger(index + 1)),
    ),
    ...(phase.repeatSaves ?? []).map((_repeat, index) =>
      spellActivationRepeatPath(PositiveInteger(1), PositiveInteger(index + 1)),
    ),
    ...spellConsumedMaterialEvidencePaths(mechanics.components),
  ];
  return { consumed, unowned: [] };
}

function saveGatedConditionWithRepeatInvocationsFromFacts(
  spell: BattleSpellExecutionSource,
  facts: SaveGatedConditionWithRepeatMechanicsFacts,
  castOptions: SpellAdmissionContext["spellCastOptions"],
): readonly SaveGatedConditionWithRepeatSpellInvocation[] {
  return castOptions.flatMap(
    (slot): readonly SaveGatedConditionWithRepeatSpellInvocation[] =>
      Number(slot.spellLevel) < Number(facts.level)
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "saveGatedConditionWithRepeat",
              spell,
              actionCost:
                SAVE_GATED_CONDITION_WITH_REPEAT_EXECUTION_FACTS.actionCost,
              ability: facts.ability,
              dc: facts.dc,
              targeting: saveGatedConditionTargetingFromFacts(
                facts.targeting,
                slot.spellLevel,
              ),
              rangeFeet: facts.rangeFeet,
              durationTicks: facts.durationTicks,
            },
          ],
  );
}

type SaveGatedConditionIssuePush = (
  failedFact: SaveGatedConditionWithRepeatFailedFact,
  path: UnitMechanicsPath,
) => void;

function inspectSaveGatedConditionHeader(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
  push: SaveGatedConditionIssuePush,
): void {
  if (mechanics.level !== SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.level)
    push("level", spellMechanicsHeaderPath("level"));
  if (
    mechanics.castingTime.kind !==
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.castingTimeKind ||
    !spellHasOnlyNamedFields(mechanics.castingTime, ["kind"])
  )
    push("castingTime", spellMechanicsHeaderPath("castingTime"));
}

function saveGatedConditionRangeSupported(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): boolean {
  return (
    mechanics.range.kind ===
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.range.kind &&
    mechanics.range.feet ===
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.range.feet &&
    spellHasOnlyNamedFields(mechanics.range, ["kind", "feet"])
  );
}

function inspectSaveGatedConditionEnvelope(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
  push: SaveGatedConditionIssuePush,
): void {
  if (!saveGatedConditionRangeSupported(mechanics))
    push("range", spellMechanicsHeaderPath("range"));
  for (const issue of stagedSaveConditionDurationIssues(mechanics))
    push(issue.failedFact, issue.mechanicsPath);
  if (
    !spellHasOnlyNamedFields(mechanics, [
      "level",
      "school",
      "range",
      "components",
      "duration",
      "castingTime",
      "family",
      "phases",
    ])
  )
    push("rootShape", spellMechanicsHeaderPath("family"));
}

function inspectSaveGatedConditionPhasePosition(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
  phaseIndex: number,
  push: SaveGatedConditionIssuePush,
): void {
  if (mechanics.phases.length !== 1) {
    for (const [index] of mechanics.phases.entries())
      if (index !== phaseIndex)
        push(
          "phaseCount",
          spellActivationPhasePath(PositiveInteger(index + 1)),
        );
    if (mechanics.phases.length === 0)
      push("phaseCount", spellMechanicsRootPath());
  }
  if (phaseIndex !== 0)
    push(
      "phaseOrder",
      spellActivationPhasePath(PositiveInteger(phaseIndex + 1)),
    );
}

function inspectSaveGatedConditionPhaseHeader(
  phase: SaveGatePhase,
  phaseIndex: number,
  push: SaveGatedConditionIssuePush,
): void {
  const path = spellActivationPhasePath(PositiveInteger(phaseIndex + 1));
  if (
    !spellHasOnlyNamedFields(phase, [
      "kind",
      "attachment",
      "ability",
      "dc",
      "onFail",
      "onSuccess",
      "repeatSaves",
    ])
  )
    push("phaseShape", path);
  if (
    phase.ability !==
    SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.ability
  )
    push("phaseAbility", path);
  if (
    phase.dc.kind !==
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.dcKind ||
    !spellHasOnlyNamedFields(phase.dc, ["kind"])
  )
    push("phaseDc", path);
}

type SaveGatedConditionTargetProjection = Readonly<{
  admission: ReturnType<typeof admitSpellTargetAttachment>;
  countFacts: ReturnType<typeof saveGateTargetCountFactsFromSelection>;
  supported: boolean;
}>;

function saveGatedConditionTargetSupported(input: {
  readonly selection:
    | Extract<
        ReturnType<typeof admitSpellTargetAttachment>,
        { readonly tag: "admitted" }
      >["attachment"]["value"]["selection"]
    | undefined;
  readonly countFacts: ReturnType<typeof saveGateTargetCountFactsFromSelection>;
}): boolean {
  return (
    input.selection !== undefined &&
    input.selection.mode ===
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.targeting.mode &&
    input.selection.targetKinds?.length ===
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.targeting.targetKinds
        .length &&
    input.selection.targetKinds[0] ===
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.targeting
        .targetKinds[0] &&
    input.countFacts !== null
  );
}

function saveGatedConditionTargetProjection(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
  phase: SaveGatePhase,
  phaseIndex: number,
  push: SaveGatedConditionIssuePush,
): SaveGatedConditionTargetProjection {
  const admission = admitSpellTargetAttachment(phase.attachment, [
    "mode",
    "count",
    "targetKinds",
  ]);
  const selection =
    admission.tag === "admitted"
      ? admission.attachment.value.selection
      : undefined;
  const countFacts =
    selection === undefined
      ? null
      : saveGateTargetCountFactsFromSelection(
          selection,
          Number(mechanics.level),
        );
  const supported = saveGatedConditionTargetSupported({
    selection,
    countFacts,
  });
  if (!supported)
    push(
      "phaseAttachment",
      spellActivationAttachmentPath(PositiveInteger(phaseIndex + 1)),
    );
  return { admission, countFacts, supported };
}

function inspectSaveGatedConditionSuccess(
  phase: SaveGatePhase,
  phaseIndex: number,
  push: SaveGatedConditionIssuePush,
): void {
  if (
    phase.onSuccess.kind !==
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.successKind ||
    !spellHasOnlyNamedFields(phase.onSuccess, ["kind"])
  )
    push(
      "successOutcome",
      spellActivationPhasePath(PositiveInteger(phaseIndex + 1)),
    );
}

function inspectSaveGatedConditionFailureEffects(
  phase: SaveGatePhase,
  phaseIndex: number,
  push: SaveGatedConditionIssuePush,
): void {
  const path = spellActivationPhasePath(PositiveInteger(phaseIndex + 1));
  if (
    phase.onFail.kind !==
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.failureKind ||
    !spellHasOnlyNamedFields(phase.onFail, ["kind", "effects"])
  ) {
    push("failedSaveEffect", path);
    return;
  }
  const roles = new Set<string>();
  for (const [index, effect] of phase.onFail.effects.entries()) {
    const role = stagedSaveConditionFailureRole(effect);
    if (role === null || roles.has(role))
      push(
        "extraFailureEffect",
        spellActivationEffectPath(
          PositiveInteger(phaseIndex + 1),
          PositiveInteger(index + 1),
        ),
      );
    else roles.add(role);
  }
  if (
    SAVE_GATED_CONDITION_WITH_REPEAT_FAILURE_ROLES.some(
      (role) => !roles.has(role),
    )
  )
    push("missingFailureEffect", path);
}

function inspectSaveGatedConditionRepeats(
  phase: SaveGatePhase,
  phaseIndex: number,
  push: SaveGatedConditionIssuePush,
): void {
  const roles = new Set<string>();
  for (const [index, repeat] of (phase.repeatSaves ?? []).entries()) {
    const role = stagedSaveConditionRepeatRole(repeat);
    if (role === null || roles.has(role))
      push(
        "extraRepeat",
        spellActivationRepeatPath(
          PositiveInteger(phaseIndex + 1),
          PositiveInteger(index + 1),
        ),
      );
    else roles.add(role);
  }
  if (
    SAVE_GATED_CONDITION_WITH_REPEAT_REPEAT_ROLES.some(
      (role) => !roles.has(role),
    )
  )
    push(
      "missingRepeat",
      spellActivationPhasePath(PositiveInteger(phaseIndex + 1)),
    );
}

type SaveGatedConditionRepresentation = Readonly<{
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>;
  phaseIndex: number;
  phase: Extract<SaveGatePhase, { readonly kind: "save_gate" }> | undefined;
}>;

function saveGatedConditionRepresentation(
  source: SpellMechanicsAdmissionSource,
): SaveGatedConditionRepresentation | undefined {
  if (source.mechanics.family !== "activation") return undefined;
  if (!stagedSaveConditionRootShape(source.mechanics)) return undefined;
  const representedPhaseIndex = source.mechanics.phases.findIndex(
    stagedSaveConditionRootPhase,
  );
  const phaseIndex = representedPhaseIndex < 0 ? 0 : representedPhaseIndex;
  const candidate = source.mechanics.phases[phaseIndex];
  return {
    mechanics: source.mechanics,
    phaseIndex,
    phase:
      candidate?.kind ===
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.kind
        ? candidate
        : undefined,
  };
}

function saveGatedConditionMissingPhaseInspection(
  issues: readonly SaveGatedConditionWithRepeatMechanicsIssue[],
): Extract<
  SpellProcedureMechanicsInspection<
    "saveGatedConditionWithRepeat",
    SaveGatedConditionWithRepeatMechanicsFacts,
    SaveGatedConditionWithRepeatSpellInvocation,
    SaveGatedConditionWithRepeatMechanicsIssue
  >,
  { readonly tag: "unsupported" }
> {
  const nonEmptyIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  return {
    tag: "unsupported",
    issues: nonEmptyIssues ?? [
      saveGatedConditionWithRepeatIssue(
        "requiredFacts",
        spellMechanicsRootPath(),
      ),
    ],
  };
}

function saveGatedConditionUnsupportedInspection(
  issues: readonly [
    SaveGatedConditionWithRepeatMechanicsIssue,
    ...SaveGatedConditionWithRepeatMechanicsIssue[],
  ],
): Extract<
  SpellProcedureMechanicsInspection<
    "saveGatedConditionWithRepeat",
    SaveGatedConditionWithRepeatMechanicsFacts,
    SaveGatedConditionWithRepeatSpellInvocation,
    SaveGatedConditionWithRepeatMechanicsIssue
  >,
  { readonly tag: "unsupported" }
> {
  const [first, ...rest] = issues;
  return {
    tag: "unsupported",
    issues: [
      saveGatedConditionWithRepeatIssue(first.failedFact, first.mechanicsPath),
      ...rest.map((issue) =>
        saveGatedConditionWithRepeatIssue(
          issue.failedFact,
          issue.mechanicsPath,
        ),
      ),
    ],
  };
}

type SaveGatedConditionExecutionProjection =
  | {
      readonly tag: "supported";
      readonly targetCount: NonNullable<
        SaveGatedConditionTargetProjection["countFacts"]
      >;
      readonly rangeFeet: ReturnType<typeof movementFeet>;
      readonly durationTicks: SaveGatedConditionWithRepeatMechanicsFacts["durationTicks"];
    }
  | { readonly tag: "unsupported" };

function saveGatedConditionExecutionProjection(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
  target: SaveGatedConditionTargetProjection,
): SaveGatedConditionExecutionProjection {
  if (!isStagedSaveConditionDuration(mechanics.duration))
    return { tag: "unsupported" };
  if (target.admission.tag !== "admitted") return { tag: "unsupported" };
  if (!target.supported) return { tag: "unsupported" };
  if (target.countFacts === null) return { tag: "unsupported" };
  if (
    mechanics.range.kind !==
    SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.range.kind
  )
    return { tag: "unsupported" };
  if (typeof mechanics.range.feet !== "number") return { tag: "unsupported" };
  return {
    tag: "supported",
    targetCount: target.countFacts,
    rangeFeet: movementFeet(mechanics.range.feet),
    durationTicks: spellDurationTicksFromCanonicalValue(
      mechanics.duration.upTo,
    ),
  };
}

function admitSaveGatedConditionWithRepeatMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "saveGatedConditionWithRepeat",
  SaveGatedConditionWithRepeatMechanicsFacts,
  SaveGatedConditionWithRepeatSpellInvocation,
  SaveGatedConditionWithRepeatMechanicsIssue
> {
  const representation = saveGatedConditionRepresentation(source);
  if (representation === undefined) return { tag: "notRepresented" };
  const { mechanics, phaseIndex, phase } = representation;
  const issues: SaveGatedConditionWithRepeatMechanicsIssue[] = [];
  const push = (
    failedFact: SaveGatedConditionWithRepeatFailedFact,
    path: UnitMechanicsPath,
  ): void => {
    issues.push(saveGatedConditionWithRepeatIssue(failedFact, path));
  };
  inspectSaveGatedConditionHeader(mechanics, push);
  inspectSaveGatedConditionEnvelope(mechanics, push);
  inspectSaveGatedConditionPhasePosition(mechanics, phaseIndex, push);
  if (phase === undefined)
    return saveGatedConditionMissingPhaseInspection(issues);
  inspectSaveGatedConditionPhaseHeader(phase, phaseIndex, push);
  const target = saveGatedConditionTargetProjection(
    mechanics,
    phase,
    phaseIndex,
    push,
  );
  inspectSaveGatedConditionSuccess(phase, phaseIndex, push);
  inspectSaveGatedConditionFailureEffects(phase, phaseIndex, push);
  inspectSaveGatedConditionRepeats(phase, phaseIndex, push);
  const nonEmptyIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (nonEmptyIssues !== undefined)
    return saveGatedConditionUnsupportedInspection(nonEmptyIssues);
  const execution = saveGatedConditionExecutionProjection(mechanics, target);
  if (execution.tag === "unsupported") {
    return {
      tag: "unsupported",
      issues: [
        saveGatedConditionWithRepeatIssue(
          "requiredFacts",
          spellActivationPhasePath(PositiveInteger(phaseIndex + 1)),
        ),
      ],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    ability: SAVE_GATED_CONDITION_WITH_REPEAT_EXECUTION_FACTS.ability,
    dc: phase.dc,
    targeting: {
      kind: SAVE_GATED_CONDITION_WITH_REPEAT_EXECUTION_FACTS.targeting.kind,
      count: execution.targetCount,
    },
    rangeFeet: execution.rangeFeet,
    durationTicks: execution.durationTicks,
  } satisfies SaveGatedConditionWithRepeatMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "saveGatedConditionWithRepeat",
      facts,
      evidence: saveGatedConditionWithRepeatMechanicsEvidence(mechanics, phase),
      admit: (executionSource: BattleSpellExecutionSource, ctx) =>
        saveGatedConditionWithRepeatInvocationsFromFacts(
          executionSource,
          facts,
          ctx.spellCastOptions,
        ),
    },
  };
}

function discoverSaveGatedConditionWithRepeatCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<SaveGatedConditionWithRepeatSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return [];
  }

  const targetHole = spellTargetListHole(state, actorId, invocation);
  if (targetHole.choices.length === 0) {
    return [];
  }

  const castActs = discoverTargetSavingThrowSpellCastActs({
    state,
    actorId,
    actor,
    invocation,
    targetHole,
  });
  return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
}

function resolveSaveGatedConditionWithRepeat(
  input: SaveGatedConditionWithRepeatResolveInput,
): BattleResolutionResult {
  return resolveSaveGatedConditionWithRepeatSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
    ...optionalProperty("metamagicApplications", input.metamagicApplications),
  });
}

const SaveGatedConditionWithRepeatInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("saveGatedConditionWithRepeat"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal(
        SAVE_GATED_CONDITION_WITH_REPEAT_EXECUTION_FACTS.actionCost,
      ),
      ability: Schema.Literal(
        SAVE_GATED_CONDITION_WITH_REPEAT_EXECUTION_FACTS.ability,
      ),
      dc: DcSourceSchema,
      durationTicks: ElapsedTimeTicksSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal(
          SAVE_GATED_CONDITION_WITH_REPEAT_EXECUTION_FACTS.targeting.kind,
        ),
        minTargets: Schema.Literal(
          SAVE_GATED_CONDITION_WITH_REPEAT_EXECUTION_FACTS.targeting.minTargets,
        ),
        maxTargets: Schema.Number.pipe(
          Schema.check(Schema.isInt(), Schema.isGreaterThan(0)),
          Schema.brand("PositiveInteger"),
        ),
      }),
      rangeFeet: MovementFeet,
    }),
  );
export const saveGatedConditionWithRepeatProfile = {
  procedure: "saveGatedConditionWithRepeat",
  executionSchema: SaveGatedConditionWithRepeatInvocationSchema,
  admitMechanics: admitSaveGatedConditionWithRepeatMechanics,
  discoverCastAct: discoverSaveGatedConditionWithRepeatCastAct,
  resolve: resolveSaveGatedConditionWithRepeat,
} satisfies SpellProcedureDeclaration<
  "saveGatedConditionWithRepeat",
  SaveGatedConditionWithRepeatSpellInvocation
>;
