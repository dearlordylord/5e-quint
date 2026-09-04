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
  level: "Hideous Laughter requires a first-level spell.",
  castingTime: "Hideous Laughter requires an action casting time.",
  range: "Hideous Laughter requires a 30-foot point range.",
  duration: "Hideous Laughter requires one minute of concentration.",
  durationValue: "Hideous Laughter requires a one-minute concentration value.",
  durationExtension: "Hideous Laughter has an unsupported duration extension.",
  durationEnding: "Hideous Laughter has an unsupported duration ending.",
  rootShape: "Hideous Laughter has unsupported activation root fields.",
  phaseCount: "Hideous Laughter requires exactly one activation phase.",
  phaseOrder: "Hideous Laughter's save gate must be the first phase.",
  phaseShape: "Hideous Laughter has an unsupported save-gate field.",
  phaseAbility: "Hideous Laughter requires a Wisdom Saving Throw.",
  phaseDc: "Hideous Laughter requires the caster's Spell Save DC.",
  phaseAttachment: "Hideous Laughter requires one creature target selection.",
  successOutcome: "Hideous Laughter requires no successful-save effect.",
  failedSaveEffect: "Hideous Laughter has an unsupported failed-save bundle.",
  extraFailureEffect:
    "Hideous Laughter has an unsupported additional failed-save effect.",
  missingFailureEffect:
    "Hideous Laughter is missing a required failed-save effect.",
  missingRepeat: "Hideous Laughter is missing a required repeat save.",
  extraRepeat: "Hideous Laughter has an unsupported additional repeat save.",
  requiredFacts:
    "Hideous Laughter's admitted mechanics did not retain required facts.",
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

function hideousLaughterPhaseWitnesses(
  phase: ActivationPhase,
): readonly [boolean, boolean, boolean] {
  if (
    phase.kind !== SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.kind
  ) {
    return [false, false, false];
  }
  const attachmentValue =
    phase.attachment.kind === "hole" ? phase.attachment.value : null;
  const selection =
    attachmentValue?.kind === "target" ? attachmentValue.selection : null;
  const targetScalingWitness =
    selection?.mode ===
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.targeting.mode &&
    typeof selection.count === "object" &&
    selection.count.kind ===
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.targeting.count.kind &&
    selection.count.base ===
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.targeting.count.base &&
    selection.count.baseLevel ===
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.targeting.count
        .baseLevel &&
    selection.count.perSlotAboveBase ===
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.targeting.count
        .perSlotAboveBase &&
    selection.targetKinds?.length ===
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.targeting.targetKinds
        .length &&
    selection.targetKinds[0] ===
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.targeting.targetKinds[0];
  const endTurnRepeatWitness =
    phase.repeatSaves?.some(
      (repeatSave) =>
        repeatSave.cadence ===
          SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.repeats
            .endOfTurn.cadence &&
        repeatSave.onSuccess ===
          SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.repeats
            .endOfTurn.onSuccess,
    ) === true;
  const damageRepeatWitness =
    phase.repeatSaves?.some(
      (repeatSave) =>
        repeatSave.cadence ===
          SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.repeats.onDamage
            .cadence &&
        repeatSave.rollMode ===
          SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.repeats.onDamage
            .rollMode &&
        repeatSave.onSuccess ===
          SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.repeats.onDamage
            .onSuccess,
    ) === true;
  return [targetScalingWitness, endTurnRepeatWitness, damageRepeatWitness];
}

function hideousLaughterRootPhase(phase: ActivationPhase): boolean {
  return spellProcedureHasRedundantSignature({
    kind: "oneWitnessMayBeMissing",
    witnesses: hideousLaughterPhaseWitnesses(phase),
  });
}

function hideousLaughterHeaderSignature(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): boolean {
  return spellProcedureHasRedundantSignature({
    kind: "oneWitnessMayBeMissing",
    witnesses: [
      mechanics.level ===
        SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.level &&
        mechanics.castingTime.kind ===
          SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.castingTimeKind,
      mechanics.range.kind ===
        SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.range.kind &&
        mechanics.range.feet ===
          SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.range.feet,
      isHideousLaughterDuration(mechanics.duration),
    ],
  });
}

function hideousLaughterRootShape(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): boolean {
  if (mechanics.phases.some(hideousLaughterRootPhase)) return true;
  if (mechanics.phases.length > 1) return false;
  const phase = mechanics.phases[0];
  const phaseWitnesses =
    phase === undefined ? null : hideousLaughterPhaseWitnesses(phase);
  const phaseBoundaryCompatible =
    phaseWitnesses === null || phaseWitnesses[0] || phaseWitnesses[2];
  return phaseBoundaryCompatible && hideousLaughterHeaderSignature(mechanics);
}

function isHideousLaughterDuration(
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

function hideousLaughterDurationIssues(
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
    !isHideousLaughterDuration(duration) ||
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

type HideousLaughterFailureRoleEffect =
  | Extract<
      EffectAtom,
      {
        readonly kind: typeof SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.failureEffects.prone.kind;
      }
    >
  | Extract<
      EffectAtom,
      {
        readonly kind: typeof SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.failureEffects.suppressProne.kind;
      }
    >;

function hideousLaughterFailureRoleEffect(
  effect: EffectAtom,
): HideousLaughterFailureRoleEffect | undefined {
  if (
    effect.kind ===
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.failureEffects.prone
        .kind &&
    effect.condition ===
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.failureEffects.prone
        .condition &&
    spellHasOnlyNamedFields(effect, ["kind", "condition"])
  ) {
    return effect;
  }
  if (
    effect.kind ===
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.failureEffects
        .incapacitated.kind &&
    effect.condition ===
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.failureEffects
        .incapacitated.condition &&
    spellHasOnlyNamedFields(effect, ["kind", "condition"])
  ) {
    return effect;
  }
  if (
    effect.kind ===
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.failureEffects
        .suppressProne.kind &&
    effect.condition ===
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.failureEffects
        .suppressProne.condition &&
    spellHasOnlyNamedFields(effect, ["kind", "condition"])
  ) {
    return effect;
  }
  return undefined;
}

function hideousLaughterFailureRole(
  effect: EffectAtom,
): (typeof SAVE_GATED_CONDITION_WITH_REPEAT_FAILURE_ROLES)[number] | null {
  const roleEffect = hideousLaughterFailureRoleEffect(effect);
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

function hideousLaughterRepeatRole(
  repeatSave: NonNullable<SaveGatePhase["repeatSaves"]>[number],
): (typeof SAVE_GATED_CONDITION_WITH_REPEAT_REPEAT_ROLES)[number] | null {
  if (
    repeatSave.cadence ===
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.repeats.endOfTurn
        .cadence &&
    repeatSave.rollMode === undefined &&
    repeatSave.onSuccess ===
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.repeats.endOfTurn
        .onSuccess &&
    repeatSave.onFailAgain === undefined &&
    repeatSave.successesRequired === undefined &&
    repeatSave.failuresRequired === undefined &&
    repeatSave.onFailureThreshold === undefined &&
    spellHasOnlyNamedFields(repeatSave, ["cadence", "onSuccess"])
  ) {
    return SAVE_GATED_CONDITION_WITH_REPEAT_REPEAT_ROLES[0];
  }
  if (
    repeatSave.cadence ===
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.repeats.onDamage
        .cadence &&
    repeatSave.rollMode ===
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.repeats.onDamage
        .rollMode &&
    repeatSave.onSuccess ===
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.repeats.onDamage
        .onSuccess &&
    repeatSave.onFailAgain === undefined &&
    repeatSave.successesRequired === undefined &&
    repeatSave.failuresRequired === undefined &&
    repeatSave.onFailureThreshold === undefined &&
    spellHasOnlyNamedFields(repeatSave, ["cadence", "rollMode", "onSuccess"])
  ) {
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

function admitSaveGatedConditionWithRepeatMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "saveGatedConditionWithRepeat",
  SaveGatedConditionWithRepeatMechanicsFacts,
  SaveGatedConditionWithRepeatSpellInvocation,
  SaveGatedConditionWithRepeatMechanicsIssue
> {
  if (source.mechanics.family !== "activation") {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  if (!hideousLaughterRootShape(mechanics)) return { tag: "notRepresented" };
  const representedPhaseIndex = mechanics.phases.findIndex(
    hideousLaughterRootPhase,
  );
  const phaseIndex = representedPhaseIndex < 0 ? 0 : representedPhaseIndex;
  const phase = mechanics.phases[phaseIndex];
  const issues: SaveGatedConditionWithRepeatMechanicsIssue[] = [];
  const push = (
    failedFact: SaveGatedConditionWithRepeatFailedFact,
    path: UnitMechanicsPath,
  ): void => {
    issues.push(saveGatedConditionWithRepeatIssue(failedFact, path));
  };
  if (
    mechanics.level !== SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.level
  ) {
    push("level", spellMechanicsHeaderPath("level"));
  }
  if (
    mechanics.castingTime.kind !==
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.castingTimeKind ||
    !spellHasOnlyNamedFields(mechanics.castingTime, ["kind"])
  ) {
    push("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  if (
    mechanics.range.kind !==
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.range.kind ||
    mechanics.range.feet !==
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.range.feet ||
    !spellHasOnlyNamedFields(mechanics.range, ["kind", "feet"])
  ) {
    push("range", spellMechanicsHeaderPath("range"));
  }
  issues.push(...hideousLaughterDurationIssues(mechanics));
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
  ) {
    push("rootShape", spellMechanicsHeaderPath("family"));
  }
  if (mechanics.phases.length !== 1) {
    for (const [index] of mechanics.phases.entries()) {
      if (index !== phaseIndex) {
        push(
          "phaseCount",
          spellActivationPhasePath(PositiveInteger(index + 1)),
        );
      }
    }
    if (mechanics.phases.length === 0) {
      push("phaseCount", spellMechanicsRootPath());
    }
  }
  if (phaseIndex !== 0) {
    push(
      "phaseOrder",
      spellActivationPhasePath(PositiveInteger(phaseIndex + 1)),
    );
  }
  if (
    phase?.kind !== SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.kind
  ) {
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
  ) {
    push(
      "phaseShape",
      spellActivationPhasePath(PositiveInteger(phaseIndex + 1)),
    );
  }
  if (
    phase.ability !==
    SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.ability
  ) {
    push(
      "phaseAbility",
      spellActivationPhasePath(PositiveInteger(phaseIndex + 1)),
    );
  }
  if (
    phase.dc.kind !==
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.dcKind ||
    !spellHasOnlyNamedFields(phase.dc, ["kind"])
  ) {
    push("phaseDc", spellActivationPhasePath(PositiveInteger(phaseIndex + 1)));
  }
  const targetAdmission = admitSpellTargetAttachment(phase.attachment, [
    "mode",
    "count",
    "targetKinds",
  ]);
  const targetSelection =
    targetAdmission.tag === "admitted"
      ? targetAdmission.attachment.value.selection
      : undefined;
  const targetCountFacts =
    targetSelection === undefined
      ? null
      : saveGateTargetCountFactsFromSelection(
          targetSelection,
          Number(mechanics.level),
        );
  const targetSupported =
    targetSelection !== undefined &&
    targetSelection.mode ===
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.targeting.mode &&
    targetSelection.targetKinds?.length ===
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.targeting.targetKinds
        .length &&
    targetSelection.targetKinds[0] ===
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.targeting
        .targetKinds[0] &&
    targetCountFacts !== null;
  if (!targetSupported) {
    push(
      "phaseAttachment",
      spellActivationAttachmentPath(PositiveInteger(phaseIndex + 1)),
    );
  }
  if (
    phase.onSuccess.kind !==
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.successKind ||
    !spellHasOnlyNamedFields(phase.onSuccess, ["kind"])
  ) {
    push(
      "successOutcome",
      spellActivationPhasePath(PositiveInteger(phaseIndex + 1)),
    );
  }
  const failureEffects =
    phase.onFail.kind ===
    SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.failureKind
      ? phase.onFail.effects
      : [];
  if (
    phase.onFail.kind !==
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.failureKind ||
    !spellHasOnlyNamedFields(phase.onFail, ["kind", "effects"])
  ) {
    push(
      "failedSaveEffect",
      spellActivationPhasePath(PositiveInteger(phaseIndex + 1)),
    );
  } else {
    const roles = new Set<string>();
    for (const [index, effect] of failureEffects.entries()) {
      const role = hideousLaughterFailureRole(effect);
      if (role === null || roles.has(role)) {
        push(
          "extraFailureEffect",
          spellActivationEffectPath(
            PositiveInteger(phaseIndex + 1),
            PositiveInteger(index + 1),
          ),
        );
      } else {
        roles.add(role);
      }
    }
    const missingRoles = SAVE_GATED_CONDITION_WITH_REPEAT_FAILURE_ROLES.filter(
      (role) => !roles.has(role),
    );
    if (missingRoles.length > 0) {
      push(
        "missingFailureEffect",
        spellActivationPhasePath(PositiveInteger(phaseIndex + 1)),
      );
    }
  }
  const repeatSaves = phase.repeatSaves ?? [];
  const roles = new Set<string>();
  for (const [index, repeat] of repeatSaves.entries()) {
    const role = hideousLaughterRepeatRole(repeat);
    if (role === null || roles.has(role)) {
      push(
        "extraRepeat",
        spellActivationRepeatPath(
          PositiveInteger(phaseIndex + 1),
          PositiveInteger(index + 1),
        ),
      );
    } else {
      roles.add(role);
    }
  }
  const missingRepeatRoles =
    SAVE_GATED_CONDITION_WITH_REPEAT_REPEAT_ROLES.filter(
      (role) => !roles.has(role),
    );
  if (missingRepeatRoles.length > 0) {
    push(
      "missingRepeat",
      spellActivationPhasePath(PositiveInteger(phaseIndex + 1)),
    );
  }
  const nonEmptyIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (nonEmptyIssues !== undefined) {
    const [first, ...rest] = nonEmptyIssues;
    return {
      tag: "unsupported",
      issues: [
        saveGatedConditionWithRepeatIssue(
          first.failedFact,
          first.mechanicsPath,
        ),
        ...rest.map((issue) =>
          saveGatedConditionWithRepeatIssue(
            issue.failedFact,
            issue.mechanicsPath,
          ),
        ),
      ],
    };
  }
  if (
    !isHideousLaughterDuration(mechanics.duration) ||
    targetAdmission.tag !== "admitted" ||
    !targetSupported ||
    targetCountFacts === null ||
    mechanics.range.kind !==
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.range.kind ||
    typeof mechanics.range.feet !== "number"
  ) {
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
      count: targetCountFacts,
    },
    rangeFeet: movementFeet(mechanics.range.feet),
    durationTicks: spellDurationTicksFromCanonicalValue(
      mechanics.duration.upTo,
    ),
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
