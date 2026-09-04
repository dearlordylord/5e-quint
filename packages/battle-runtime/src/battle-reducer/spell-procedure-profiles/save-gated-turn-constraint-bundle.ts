import { optionalProperty } from "../../optional-property.ts";
import { discoverSavingThrowSpellCastActs } from "../saving-throw-metamagic-holes.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties unit-feature.metamagic-heightened-save-disadvantage unit-feature.metamagic-careful-save-protection
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE
//
// Slow active-penalties profile: action-time level-3+ Spell Slot casting,
// caller-supplied point-origin 40-foot Cube affected creatures chosen by the
// caster, Wisdom Saving Throws, source-owned Concentration effects for failed
// saves, target end-turn repeat-save cleanup, and support-profile admission for
// target-turn Action/Bonus Action choice, Attack action cap, and Somatic spell
// failure chance consumed by active-effect runtime helpers.
//
// RAW anchors:
//   - SRD 5.2.1 Spells/Descriptions-S-Z.md "Slow": Action; 120 feet;
//     Concentration up to 1 minute; up to six creatures of the caster's choice
//     in a 40-foot Cube; Wisdom Saving Throw; failed targets have Speed halved,
//     -2 AC, -2 Dexterity Saving Throws, no Reactions, target-turn limits,
//     Somatic failure chance, and an end-of-turn repeat save ending the spell on
//     itself on success.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Spell Slot, Concentration, Spell
//     Invocation, Area of Effect/Cube, Saving Throw, Speed, Armor Class,
//     Reaction, and Spell Effect.

import type { ElapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { MovementFeet, PositiveInteger, movementFeet } from "@dnd/shared/types";
import type {
  ActivationPhase,
  Attachment,
  EffectAtom,
  SpellMechanics,
} from "@dnd/surface/surface/types";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
import { Schema } from "effect";
import {
  type BattleActDiscoveryCandidate,
  type BattleResolutionResult,
  type BattleSpellSavingThrowOutcomeValue,
  type BattleSpellExecutionSource,
  type BattleState,
  type BattleExecutableSpellInvocation,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import {
  maybeOpenInterruptWindow,
  snapshotBattle,
} from "../interrupt-execution.ts";
import { spellReplayContinuation } from "../spell-reaction-continuation.ts";
import { battleCreatureWithSpellActiveEffects } from "../../active-effect/lifecycle.ts";
import { allocateBattleEffectOccurrenceForCreature } from "../../effect-execution-ref.ts";
import { type CombatantId } from "../../identity.ts";
import {
  SAVE_GATED_TURN_CONSTRAINT_ARMOR_CLASS_DELTA,
  SAVE_GATED_TURN_CONSTRAINT_DEX_SAVE_DELTA,
  SAVE_GATED_TURN_CONSTRAINT_MAX_ATTACKS,
  SAVE_GATED_TURN_CONSTRAINT_SOMATIC_FAILURE_PERCENT,
  SAVE_GATED_TURN_CONSTRAINT_SPEED_RATIO,
  SaveGatedTurnConstraintMaxAttacksSchema,
} from "../domain-constants.ts";
import { extendSavingThrowOngoingFeatures } from "../attack-roll.ts";
import { resolveAreaSaveMetamagicFills } from "../spells-resolve-save-gates.ts";
import {
  spendSpellCastResources,
  startSpellEffectConcentration,
} from "../spells-resolve-resources.ts";
import { invalidResult } from "../result-helpers.ts";
import {
  DcSourceSchema,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import { failedSavingThrowTargetIds } from "../saving-throw-outcomes.ts";
import { currentActorId } from "../creature-state-leaves.ts";
import { saveGatedTurnConstraintActionOrBonusActionTurnResources } from "../save-gated-turn-constraint-turn-resources.ts";
import { sameStringSet } from "../../same-string-set.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { spellInvocationResourceForCastOption } from "./profile.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";
import type { SaveGatedTurnConstraintFacts } from "../../procedure-execution/spell-procedure-execution.ts";
import {
  admitSpellAreaAttachment,
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
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";

const SaveGatedTurnConstraintSpeedNumeratorSchema = Schema.Literal(
  SAVE_GATED_TURN_CONSTRAINT_SPEED_RATIO.numerator,
).pipe(Schema.brand("PositiveInteger"));
const SaveGatedTurnConstraintSpeedDenominatorSchema = Schema.Literal(
  SAVE_GATED_TURN_CONSTRAINT_SPEED_RATIO.denominator,
).pipe(Schema.brand("PositiveInteger"));
const SaveGatedTurnConstraintArmorClassDeltaSchema = Schema.Literal(
  SAVE_GATED_TURN_CONSTRAINT_ARMOR_CLASS_DELTA,
).pipe(Schema.brand("Integer"));
const SaveGatedTurnConstraintDexteritySaveDeltaSchema = Schema.Literal(
  SAVE_GATED_TURN_CONSTRAINT_DEX_SAVE_DELTA,
).pipe(Schema.brand("Integer"));
const SaveGatedTurnConstraintSomaticFailurePercentSchema = Schema.Literal(
  SAVE_GATED_TURN_CONSTRAINT_SOMATIC_FAILURE_PERCENT,
).pipe(Schema.brand("PositiveInteger"));

type SaveGatedTurnConstraintBundleSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedTurnConstraintBundle" }
>;

type SaveGatedTurnConstraintBundleResolveInput =
  SpellProcedureProfileResolveInput<SaveGatedTurnConstraintBundleSpellInvocation>;

type SaveGatedTurnConstraintBundleMechanicsFacts = SpellDefinitionRuleFacts & {
  readonly ability: "wis";
  readonly dc: SaveGatedTurnConstraintBundleSpellInvocation["dc"];
  readonly targeting: SaveGatedTurnConstraintBundleSpellInvocation["targeting"];
  readonly maxTargets: SaveGatedTurnConstraintBundleSpellInvocation["maxTargets"];
  readonly rangeFeet: MovementFeet;
  readonly durationTicks: ElapsedTimeTicks;
  readonly constraints: SaveGatedTurnConstraintFacts;
};

type SaveGatedTurnConstraintBundleFailedFact =
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
  | "attachment"
  | "successOutcome"
  | "failedSaveEffect"
  | "extraFailedSaveEffect"
  | "missingFailedSaveEffect"
  | "repeatSave"
  | "extraRepeatSave"
  | "requiredFacts";

type SaveGatedTurnConstraintBundleMechanicsIssue = SpellProcedureAdmissionIssue<
  "saveGatedTurnConstraintBundle",
  SaveGatedTurnConstraintBundleFailedFact,
  UnitMechanicsPath
>;

const SAVE_GATED_TURN_CONSTRAINT_LEVEL = 3;
const SAVE_GATED_TURN_CONSTRAINT_RANGE_FEET = 120;
const SAVE_GATED_TURN_CONSTRAINT_DURATION_MINUTES = 1;
const SAVE_GATED_TURN_CONSTRAINT_CUBE_SIDE_FEET = 40;
const SAVE_GATED_TURN_CONSTRAINT_MAX_TARGETS: SaveGatedTurnConstraintBundleSpellInvocation["maxTargets"] = 6;
const SAVE_GATED_TURN_CONSTRAINT_ROLL_KINDS = ["saving_throw"] as const;
const SAVE_GATED_TURN_CONSTRAINT_ABILITIES = ["dex"] as const;
const SAVE_GATED_TURN_CONSTRAINT_RESTRICTED_ACTIONS = ["reaction"] as const;
const SAVE_GATED_TURN_CONSTRAINT_TARGET_KINDS = ["creature"] as const;
const SAVE_GATED_TURN_CONSTRAINT_FAILED_EFFECT_ROLES = [
  "speedRatio",
  "armorClass",
  "dexteritySavingThrow",
  "reactionRestriction",
  "actionOrBonusAction",
  "attackCap",
  "somaticFailure",
] as const;
type SaveGatedTurnConstraintFailedEffectRole =
  (typeof SAVE_GATED_TURN_CONSTRAINT_FAILED_EFFECT_ROLES)[number];

const SAVE_GATED_TURN_CONSTRAINT_FAILED_FACT_MESSAGES = {
  level: "Slow requires a third-level spell.",
  castingTime: "Slow requires an action casting time.",
  range: "Slow requires a 120-foot point range.",
  duration: "Slow requires one minute of concentration.",
  durationValue: "Slow requires a one-minute concentration value.",
  durationExtension: "Slow has an unsupported duration extension.",
  durationEnding: "Slow has an unsupported duration ending.",
  rootShape: "Slow has unsupported activation root fields.",
  phaseCount: "Slow requires exactly one activation phase.",
  phaseOrder: "Slow's save gate must be the first activation phase.",
  phaseShape: "Slow has an unsupported save-gate field.",
  phaseAbility: "Slow requires a Wisdom Saving Throw.",
  phaseDc: "Slow requires the caster's Spell Save DC.",
  attachment:
    "Slow requires a point-origin 40-foot Cube for up to six creatures.",
  successOutcome: "Slow requires no successful-save effect.",
  failedSaveEffect: "Slow requires a composite failed-save effect bundle.",
  extraFailedSaveEffect:
    "Slow has an unsupported additional failed-save effect.",
  missingFailedSaveEffect: "Slow is missing a required failed-save effect.",
  repeatSave: "Slow has an unsupported repeat save.",
  extraRepeatSave: "Slow has an unsupported additional repeat save.",
  requiredFacts: "Slow's admitted mechanics did not retain its required facts.",
} as const satisfies Record<SaveGatedTurnConstraintBundleFailedFact, string>;

function saveGatedTurnConstraintBundleIssue(
  failedFact: SaveGatedTurnConstraintBundleFailedFact,
  mechanicsPath: UnitMechanicsPath,
): SaveGatedTurnConstraintBundleMechanicsIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "saveGatedTurnConstraintBundle",
    failedFact,
    mechanicsPath,
    message: SAVE_GATED_TURN_CONSTRAINT_FAILED_FACT_MESSAGES[failedFact],
  };
}

type SlowFailedEffectAdmission =
  | {
      readonly role: "speedRatio";
      readonly speedRatio: SaveGatedTurnConstraintFacts["speedRatio"];
    }
  | {
      readonly role: "armorClass";
      readonly armorClassDelta: SaveGatedTurnConstraintFacts["armorClassDelta"];
    }
  | {
      readonly role: "dexteritySavingThrow";
      readonly dexteritySavingThrowDelta: SaveGatedTurnConstraintFacts["dexteritySavingThrowDelta"];
    }
  | { readonly role: "reactionRestriction" }
  | { readonly role: "actionOrBonusAction" }
  | {
      readonly role: "attackCap";
      readonly maxAttacks: SaveGatedTurnConstraintFacts["maxAttacks"];
    }
  | {
      readonly role: "somaticFailure";
      readonly somaticFailurePercent: SaveGatedTurnConstraintFacts["somaticFailurePercent"];
    };

function slowFailedEffectAdmission(
  effect: EffectAtom,
): SlowFailedEffectAdmission | undefined {
  if (
    effect.kind === "set_speed_ratio" &&
    effect.numerator === SAVE_GATED_TURN_CONSTRAINT_SPEED_RATIO.numerator &&
    effect.denominator === SAVE_GATED_TURN_CONSTRAINT_SPEED_RATIO.denominator &&
    spellHasOnlyNamedFields(effect, ["kind", "numerator", "denominator"])
  ) {
    return {
      role: "speedRatio",
      speedRatio: {
        numerator: SaveGatedTurnConstraintSpeedNumeratorSchema.make(
          effect.numerator,
        ),
        denominator: SaveGatedTurnConstraintSpeedDenominatorSchema.make(
          effect.denominator,
        ),
      },
    };
  }
  const armorClassDelta =
    effect.kind === "modify_ac" && effect.delta.kind === "fixed_number"
      ? -effect.delta.amount
      : undefined;
  if (
    effect.kind === "modify_ac" &&
    spellHasOnlyNamedFields(effect, ["kind", "delta"]) &&
    effect.delta.kind === "fixed_number" &&
    effect.delta.sign === "-" &&
    armorClassDelta === SAVE_GATED_TURN_CONSTRAINT_ARMOR_CLASS_DELTA &&
    spellHasOnlyNamedFields(effect.delta, ["kind", "amount", "sign"])
  ) {
    return {
      role: "armorClass",
      armorClassDelta:
        SaveGatedTurnConstraintArmorClassDeltaSchema.make(armorClassDelta),
    };
  }
  const dexteritySavingThrowDelta =
    effect.kind === "modify_roll_numeric" &&
    effect.delta.kind === "fixed_number"
      ? -effect.delta.amount
      : undefined;
  if (
    effect.kind === "modify_roll_numeric" &&
    spellHasOnlyNamedFields(effect, ["kind", "on", "delta", "abilityFilter"]) &&
    effect.on !== undefined &&
    sameStringSet(effect.on, SAVE_GATED_TURN_CONSTRAINT_ROLL_KINDS) &&
    Array.isArray(effect.abilityFilter) &&
    sameStringSet(effect.abilityFilter, SAVE_GATED_TURN_CONSTRAINT_ABILITIES) &&
    effect.delta.kind === "fixed_number" &&
    effect.delta.sign === "-" &&
    dexteritySavingThrowDelta === SAVE_GATED_TURN_CONSTRAINT_DEX_SAVE_DELTA &&
    spellHasOnlyNamedFields(effect.delta, ["kind", "amount", "sign"])
  ) {
    return {
      role: "dexteritySavingThrow",
      dexteritySavingThrowDelta:
        SaveGatedTurnConstraintDexteritySaveDeltaSchema.make(
          dexteritySavingThrowDelta,
        ),
    };
  }
  if (
    effect.kind === "restrict_action_usage" &&
    sameStringSet(
      effect.actions,
      SAVE_GATED_TURN_CONSTRAINT_RESTRICTED_ACTIONS,
    ) &&
    spellHasOnlyNamedFields(effect, ["kind", "actions"])
  ) {
    return { role: "reactionRestriction" };
  }
  if (
    effect.kind === "choose_action_or_bonus_action_each_turn" &&
    spellHasOnlyNamedFields(effect, ["kind"])
  ) {
    return { role: "actionOrBonusAction" };
  }
  if (
    effect.kind === "cap_attack_action_attacks" &&
    effect.maxAttacks === SAVE_GATED_TURN_CONSTRAINT_MAX_ATTACKS &&
    spellHasOnlyNamedFields(effect, ["kind", "maxAttacks"])
  ) {
    return {
      role: "attackCap",
      maxAttacks: SaveGatedTurnConstraintMaxAttacksSchema.make(
        effect.maxAttacks,
      ),
    };
  }
  if (
    effect.kind === "somatic_spell_failure_chance" &&
    effect.percent === SAVE_GATED_TURN_CONSTRAINT_SOMATIC_FAILURE_PERCENT &&
    spellHasOnlyNamedFields(effect, ["kind", "percent"])
  ) {
    return {
      role: "somaticFailure",
      somaticFailurePercent:
        SaveGatedTurnConstraintSomaticFailurePercentSchema.make(effect.percent),
    };
  }
  return undefined;
}

function slowAttachmentSupported(attachment: Attachment): boolean {
  const areaAdmission = admitSpellAreaAttachment(
    attachment,
    ["mode", "count", "targetKinds"],
    ["selection"],
  );
  const areaAttachment =
    areaAdmission.tag === "admitted" ? areaAdmission.attachment : null;
  const areaValue =
    areaAttachment === null
      ? null
      : areaAttachment.kind === "hole"
        ? areaAttachment.value
        : areaAttachment;
  const selection = areaValue?.selection;
  return (
    areaAttachment?.kind === "hole" &&
    areaValue !== null &&
    areaValue.origin.kind === "point_within_range" &&
    spellHasOnlyNamedFields(areaValue.origin, ["kind"]) &&
    areaValue.shape.kind === "cube" &&
    spellHasOnlyNamedFields(areaValue.shape, ["kind", "sideFeet"]) &&
    areaValue.shape.sideFeet === SAVE_GATED_TURN_CONSTRAINT_CUBE_SIDE_FEET &&
    selection !== undefined &&
    selection.mode === "choose_up_to" &&
    selection.count === SAVE_GATED_TURN_CONSTRAINT_MAX_TARGETS &&
    selection.targetKinds !== undefined &&
    sameStringSet(
      selection.targetKinds,
      SAVE_GATED_TURN_CONSTRAINT_TARGET_KINDS,
    )
  );
}

type SlowPhaseWitnesses = Readonly<{
  cubeMultiTargetAttachment: boolean;
  turnConstraintEffect: boolean;
  endOfTurnRepeatSave: boolean;
}>;

function slowPhaseWitnesses(phase: ActivationPhase): SlowPhaseWitnesses {
  if (phase.kind !== "save_gate") {
    return {
      cubeMultiTargetAttachment: false,
      turnConstraintEffect: false,
      endOfTurnRepeatSave: false,
    };
  }
  const constraintEffectsWitness =
    phase.onFail.kind === "composite" &&
    phase.onFail.effects.some(
      (effect) => slowFailedEffectAdmission(effect) !== undefined,
    );
  const repeatSaveWitness =
    phase.repeatSaves?.some(
      (repeatSave) =>
        repeatSave.cadence === "end_of_target_turn" &&
        repeatSave.onSuccess === "ends_on_target",
    ) === true;
  return {
    cubeMultiTargetAttachment: slowAttachmentSupported(phase.attachment),
    turnConstraintEffect: constraintEffectsWitness,
    endOfTurnRepeatSave: repeatSaveWitness,
  };
}

function slowRootPhase(phase: ActivationPhase): boolean {
  const witnesses = slowPhaseWitnesses(phase);
  return spellProcedureHasRedundantSignature({
    kind: "oneWitnessMayBeMissing",
    witnesses: [
      {
        name: "cubeMultiTargetAttachment",
        present: witnesses.cubeMultiTargetAttachment,
      },
      {
        name: "turnConstraintEffect",
        present: witnesses.turnConstraintEffect,
      },
      {
        name: "endOfTurnRepeatSave",
        present: witnesses.endOfTurnRepeatSave,
      },
    ],
  });
}

function slowPhaseBoundaryCompatible(
  phase: ActivationPhase | undefined,
): boolean {
  if (phase === undefined) return true;
  const witnesses = slowPhaseWitnesses(phase);
  return (
    witnesses.cubeMultiTargetAttachment ||
    witnesses.turnConstraintEffect ||
    witnesses.endOfTurnRepeatSave
  );
}

function slowDurationSupported(duration: SpellMechanics["duration"]): boolean {
  return (
    duration.kind === "concentration" &&
    isSpellCanonicalDurationValue(duration.upTo) &&
    duration.upTo.unit === "minute" &&
    duration.upTo.amount === SAVE_GATED_TURN_CONSTRAINT_DURATION_MINUTES
  );
}

function slowHeaderSignature(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): boolean {
  return spellProcedureHasRedundantSignature({
    kind: "oneWitnessMayBeMissing",
    witnesses: [
      {
        name: "levelAndCastingTime",
        present:
          mechanics.level === SAVE_GATED_TURN_CONSTRAINT_LEVEL &&
          mechanics.castingTime.kind === "action",
      },
      {
        name: "range",
        present:
          mechanics.range.kind === "point" &&
          mechanics.range.feet === SAVE_GATED_TURN_CONSTRAINT_RANGE_FEET,
      },
      { name: "duration", present: slowDurationSupported(mechanics.duration) },
    ],
  });
}

function slowRootShape(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): boolean {
  if (mechanics.phases.some(slowRootPhase)) return true;
  if (mechanics.phases.length > 1) return false;
  return (
    slowPhaseBoundaryCompatible(mechanics.phases[0]) &&
    slowHeaderSignature(mechanics)
  );
}

function slowDurationIssues(
  duration: SpellMechanics["duration"],
): SaveGatedTurnConstraintBundleMechanicsIssue[] {
  const issues: SaveGatedTurnConstraintBundleMechanicsIssue[] = [];
  if (duration.kind !== "concentration") {
    issues.push(
      saveGatedTurnConstraintBundleIssue(
        "duration",
        spellMechanicsHeaderPath("duration"),
      ),
    );
    return issues;
  }
  if (!slowDurationSupported(duration)) {
    issues.push(
      saveGatedTurnConstraintBundleIssue(
        "durationValue",
        spellDurationValuePath(),
      ),
    );
  }
  for (const child of spellDurationChildCoordinates(duration)) {
    issues.push(
      saveGatedTurnConstraintBundleIssue(
        child.branch === "extension" ? "durationExtension" : "durationEnding",
        spellDurationChildPath(child),
      ),
    );
  }
  return issues;
}

function slowFactsFromAdmissions(
  admissions: readonly SlowFailedEffectAdmission[],
): SaveGatedTurnConstraintFacts | undefined {
  const byRole = new Map<
    SaveGatedTurnConstraintFailedEffectRole,
    SlowFailedEffectAdmission
  >();
  for (const admission of admissions) {
    if (byRole.has(admission.role)) continue;
    byRole.set(admission.role, admission);
  }
  const speedRatio = byRole.get("speedRatio");
  const armorClass = byRole.get("armorClass");
  const dexterity = byRole.get("dexteritySavingThrow");
  const attackCap = byRole.get("attackCap");
  const somaticFailure = byRole.get("somaticFailure");
  if (
    speedRatio?.role !== "speedRatio" ||
    armorClass?.role !== "armorClass" ||
    dexterity?.role !== "dexteritySavingThrow" ||
    attackCap?.role !== "attackCap" ||
    somaticFailure?.role !== "somaticFailure"
  ) {
    return undefined;
  }
  return {
    speedRatio: speedRatio.speedRatio,
    armorClassDelta: armorClass.armorClassDelta,
    dexteritySavingThrowDelta: dexterity.dexteritySavingThrowDelta,
    maxAttacks: attackCap.maxAttacks,
    somaticFailurePercent: somaticFailure.somaticFailurePercent,
  };
}

function slowMechanicsEvidence(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
  phase: Extract<ActivationPhase, { readonly kind: "save_gate" }>,
): SpellProcedureMechanicsEvidence {
  const failedEffects =
    phase.onFail.kind === "composite" ? phase.onFail.effects : [];
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
    ...failedEffects.map((_effect, index) =>
      spellActivationEffectPath(PositiveInteger(1), PositiveInteger(index + 1)),
    ),
    ...(phase.repeatSaves ?? []).map((_repeat, index) =>
      spellActivationRepeatPath(PositiveInteger(1), PositiveInteger(index + 1)),
    ),
    ...spellConsumedMaterialEvidencePaths(mechanics.components),
  ];
  return { consumed, unowned: [] };
}

function admitSaveGatedTurnConstraintBundleMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "saveGatedTurnConstraintBundle",
  SaveGatedTurnConstraintBundleMechanicsFacts,
  SaveGatedTurnConstraintBundleSpellInvocation,
  SaveGatedTurnConstraintBundleMechanicsIssue
> {
  if (source.mechanics.family !== "activation")
    return { tag: "notRepresented" };
  const mechanics = source.mechanics;
  if (!slowRootShape(mechanics)) return { tag: "notRepresented" };
  const representedPhaseIndex = mechanics.phases.findIndex(slowRootPhase);
  const phaseIndex = representedPhaseIndex < 0 ? 0 : representedPhaseIndex;
  const phase = mechanics.phases[phaseIndex];
  const issues: SaveGatedTurnConstraintBundleMechanicsIssue[] = [];
  const push = (
    failedFact: SaveGatedTurnConstraintBundleFailedFact,
    path: UnitMechanicsPath,
  ): void => {
    issues.push(saveGatedTurnConstraintBundleIssue(failedFact, path));
  };
  if (mechanics.level !== SAVE_GATED_TURN_CONSTRAINT_LEVEL) {
    push("level", spellMechanicsHeaderPath("level"));
  }
  if (
    mechanics.castingTime.kind !== "action" ||
    !spellHasOnlyNamedFields(mechanics.castingTime, ["kind"])
  ) {
    push("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  if (
    mechanics.range.kind !== "point" ||
    mechanics.range.feet !== SAVE_GATED_TURN_CONSTRAINT_RANGE_FEET ||
    !spellHasOnlyNamedFields(mechanics.range, ["kind", "feet"])
  ) {
    push("range", spellMechanicsHeaderPath("range"));
  }
  issues.push(...slowDurationIssues(mechanics.duration));
  if (
    !spellHasOnlyNamedFields(mechanics, [
      "level",
      "school",
      "castingTime",
      "range",
      "components",
      "duration",
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
  if (phase?.kind !== "save_gate") {
    const nonEmptyIssues = spellProcedureNonEmpty(
      spellUniqueMechanicsIssues(issues),
    );
    return {
      tag: "unsupported",
      issues: nonEmptyIssues ?? [
        saveGatedTurnConstraintBundleIssue(
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
  if (phase.ability !== "wis") {
    push(
      "phaseAbility",
      spellActivationPhasePath(PositiveInteger(phaseIndex + 1)),
    );
  }
  if (
    phase.dc.kind !== "caster_spell_save_dc" ||
    !spellHasOnlyNamedFields(phase.dc, ["kind"])
  ) {
    push("phaseDc", spellActivationPhasePath(PositiveInteger(phaseIndex + 1)));
  }
  const attachmentSupported = slowAttachmentSupported(phase.attachment);
  if (!attachmentSupported) {
    push(
      "attachment",
      spellActivationAttachmentPath(PositiveInteger(phaseIndex + 1)),
    );
  }
  if (
    phase.onSuccess.kind !== "none" ||
    !spellHasOnlyNamedFields(phase.onSuccess, ["kind"])
  ) {
    push(
      "successOutcome",
      spellActivationPhasePath(PositiveInteger(phaseIndex + 1)),
    );
  }
  const failedEffects =
    phase.onFail.kind === "composite" ? phase.onFail.effects : [];
  const failedEffectAdmissions: SlowFailedEffectAdmission[] = [];
  if (
    phase.onFail.kind !== "composite" ||
    !spellHasOnlyNamedFields(phase.onFail, ["kind", "effects"])
  ) {
    push(
      "failedSaveEffect",
      spellActivationPhasePath(PositiveInteger(phaseIndex + 1)),
    );
  } else {
    const seenRoles = new Set<SaveGatedTurnConstraintFailedEffectRole>();
    for (const [index, effect] of failedEffects.entries()) {
      const admission = slowFailedEffectAdmission(effect);
      if (admission === undefined || seenRoles.has(admission.role)) {
        push(
          "extraFailedSaveEffect",
          spellActivationEffectPath(
            PositiveInteger(phaseIndex + 1),
            PositiveInteger(index + 1),
          ),
        );
      } else {
        seenRoles.add(admission.role);
        failedEffectAdmissions.push(admission);
      }
    }
    if (
      SAVE_GATED_TURN_CONSTRAINT_FAILED_EFFECT_ROLES.some(
        (role) => !seenRoles.has(role),
      )
    ) {
      push(
        "missingFailedSaveEffect",
        spellActivationPhasePath(PositiveInteger(phaseIndex + 1)),
      );
    }
  }
  const repeatSaves = phase.repeatSaves ?? [];
  const supportedRepeatIndexes = repeatSaves.flatMap((repeatSave, index) =>
    repeatSave.cadence === "end_of_target_turn" &&
    repeatSave.onSuccess === "ends_on_target" &&
    spellHasOnlyNamedFields(repeatSave, ["cadence", "onSuccess"])
      ? [index]
      : [],
  );
  for (const [index, repeatSave] of repeatSaves.entries()) {
    if (
      repeatSave.cadence !== "end_of_target_turn" ||
      repeatSave.onSuccess !== "ends_on_target" ||
      !spellHasOnlyNamedFields(repeatSave, ["cadence", "onSuccess"]) ||
      index !== supportedRepeatIndexes[0]
    ) {
      push(
        index === 0 && supportedRepeatIndexes.length === 0
          ? "repeatSave"
          : "extraRepeatSave",
        spellActivationRepeatPath(
          PositiveInteger(phaseIndex + 1),
          PositiveInteger(index + 1),
        ),
      );
    }
  }
  if (repeatSaves.length === 0) {
    push(
      "repeatSave",
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
      issues: [first, ...rest],
    };
  }
  if (
    !attachmentSupported ||
    mechanics.range.kind !== "point" ||
    typeof mechanics.range.feet !== "number" ||
    mechanics.duration.kind !== "concentration" ||
    !isSpellCanonicalDurationValue(mechanics.duration.upTo)
  ) {
    return {
      tag: "unsupported",
      issues: [
        saveGatedTurnConstraintBundleIssue(
          "requiredFacts",
          spellActivationPhasePath(PositiveInteger(phaseIndex + 1)),
        ),
      ],
    };
  }
  const constraints = slowFactsFromAdmissions(failedEffectAdmissions);
  if (constraints === undefined) {
    return {
      tag: "unsupported",
      issues: [
        saveGatedTurnConstraintBundleIssue(
          "requiredFacts",
          spellActivationEffectPath(
            PositiveInteger(phaseIndex + 1),
            PositiveInteger(1),
          ),
        ),
      ],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    ability: "wis" as const,
    dc: phase.dc,
    targeting: {
      kind: "pointOriginCube" as const,
      sideFeet: movementFeet(SAVE_GATED_TURN_CONSTRAINT_CUBE_SIDE_FEET),
    },
    maxTargets: SAVE_GATED_TURN_CONSTRAINT_MAX_TARGETS,
    rangeFeet: movementFeet(mechanics.range.feet),
    durationTicks: spellDurationTicksFromCanonicalValue(
      mechanics.duration.upTo,
    ),
    constraints,
  } satisfies SaveGatedTurnConstraintBundleMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "saveGatedTurnConstraintBundle",
      facts,
      evidence: slowMechanicsEvidence(mechanics, phase),
      admit: (executionSource: BattleSpellExecutionSource, ctx) =>
        saveGatedTurnConstraintBundleInvocationsFromFacts(
          executionSource,
          facts,
          ctx.spellCastOptions,
        ),
    },
  };
}

function saveGatedTurnConstraintBundleInvocationsFromFacts(
  spell: BattleSpellExecutionSource,
  facts: SaveGatedTurnConstraintBundleMechanicsFacts,
  castOptions: SpellAdmissionContext["spellCastOptions"],
): readonly SaveGatedTurnConstraintBundleSpellInvocation[] {
  return castOptions.flatMap(
    (slot): readonly SaveGatedTurnConstraintBundleSpellInvocation[] =>
      Number(slot.spellLevel) < Number(facts.level)
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "saveGatedTurnConstraintBundle",
              spell,
              actionCost: "magicAction",
              ability: facts.ability,
              dc: facts.dc,
              targeting: facts.targeting,
              maxTargets: facts.maxTargets,
              rangeFeet: facts.rangeFeet,
              durationTicks: facts.durationTicks,
              constraints: facts.constraints,
            },
          ],
  );
}

function discoverSaveGatedTurnConstraintBundleCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<SaveGatedTurnConstraintBundleSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  return discoverSavingThrowSpellCastActs(state, actorId, invocation);
}

function resolveSaveGatedTurnConstraintBundle(
  input: SaveGatedTurnConstraintBundleResolveInput,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "turn-hindering effect uses an area Saving Throw outcome fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const areaSave = resolveAreaSaveMetamagicFills({
    state: input.input.state,
    subject: input.input.subject,
    actorId: input.actorId,
    invocation: input.invocation,
    fills: input.input.fills,
    metamagicApplications: input.metamagicApplications,
    savingThrowOutcomes: input.fillSet.savingThrowOutcomes,
  });
  if (areaSave.tag !== "ready") {
    return areaSave;
  }
  const savingThrowOutcomes = areaSave.savingThrowOutcomes;
  const areaWitnessValidation = validateTurnConstraintAreaWitness(
    savingThrowOutcomes,
    input.invocation.targeting.sideFeet,
    input.invocation.maxTargets,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (areaWitnessValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      areaWitnessValidation,
    );
  }
  /* v8 ignore stop -- @preserve */
  const affectedTargetIds = savingThrowOutcomes.outcomes.map(
    (outcome) => outcome.targetId,
  );
  const failedTargets = failedSavingThrowTargetIds(
    savingThrowOutcomes.outcomes,
  );
  if (failedTargets.length > 0) {
    const saveFailedReactionWindow = maybeOpenInterruptWindow(
      input.input.state,
      {
        trigger: "saveFailed",
        targetId: failedTargets[0]!,
        sourceProcedureRef: input.invocation.sourceProcedureRef,
        continuation: spellReplayContinuation(input.input),
      },
      input.input.handledInterruptTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }
  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    startConcentration: false,
    ...optionalProperty("metamagicApplications", input.metamagicApplications),
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const effected = applyTurnHinderingActivePenaltyEffects(
    resourced.state,
    input.actorId,
    failedTargets,
    input.invocation,
  );
  const concentrationState =
    effected.appliedTargetIds.length === 0
      ? effected.state
      : startSpellEffectConcentration(
          effected.state,
          input.actorId,
          input.invocation,
        );
  const nextState = extendSavingThrowOngoingFeatures(
    concentrationState,
    input.actorId,
    affectedTargetIds,
    input.fillSet.savingThrowRelationshipFacts,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function applyTurnHinderingActivePenaltyEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: BattleExecutableSpellInvocation<SaveGatedTurnConstraintBundleSpellInvocation>,
): {
  readonly state: BattleState;
  readonly appliedTargetIds: readonly CombatantId[];
} {
  const combatants = new Map(state.combatants);
  const appliedTargetIds: CombatantId[] = [];
  for (const targetId of targetIds) {
    const target = combatants.get(targetId);
    if (target === undefined) {
      continue;
    }
    const allocation = allocateBattleEffectOccurrenceForCreature({
      owner: target,
      effect: {
        kind: "saveGatedTurnConstraintBundle" as const,
        sourceProcedureRef: invocation.sourceProcedureRef,
        sourceCombatantId: actorId,
        expiresAt: {
          kind: "concentration" as const,
          combatantId: actorId,
          durationTicks: invocation.durationTicks,
        },
      },
    });
    const activeEffects = [
      ...allocation.owner.activeEffects.filter(
        (effect) =>
          !(
            effect.kind === "saveGatedTurnConstraintBundle" &&
            effect.sourceProcedureRef === invocation.sourceProcedureRef &&
            effect.sourceCombatantId === actorId
          ),
      ),
      allocation.effect,
    ];
    combatants.set(
      targetId,
      battleCreatureWithSpellActiveEffects(allocation.owner, activeEffects),
    );
    appliedTargetIds.push(targetId);
  }
  const currentTurnActorId = currentActorId(state);
  const currentTurnResources = appliedTargetIds.includes(currentTurnActorId)
    ? saveGatedTurnConstraintActionOrBonusActionTurnResources(
        { ...state, combatants },
        state.currentTurnResources,
        combatants.get(currentTurnActorId),
      )
    : state.currentTurnResources;
  return {
    state: { ...state, combatants, currentTurnResources },
    appliedTargetIds,
  };
}

/* v8 ignore start -- @preserve -- Malformed area-witness validator: Slow discovery supplies the typed Cube geometry, unique chosen targets, and matching outcomes; admitted Slow execution remains measured. */
function validateTurnConstraintAreaWitness(
  savingThrowOutcomes: BattleSpellSavingThrowOutcomeValue,
  cubeSideFeet: MovementFeet,
  maxTargets: SaveGatedTurnConstraintBundleSpellInvocation["maxTargets"],
): string | null {
  if (!("area" in savingThrowOutcomes)) {
    return "turn-hindering effect requires a point-origin Cube area witness.";
  }
  const area = savingThrowOutcomes.area;
  if (area.kind !== "saveGatedTurnConstraintBundleArea") {
    return "The turn-constraint procedure requires explicit Cube membership and caster-choice witnesses.";
  }
  if (Number(area.cubeSideFeet) !== Number(cubeSideFeet)) {
    return "The turn-constraint procedure requires the admitted Cube geometry.";
  }
  if (area.affectedTargetIds.length > maxTargets) {
    return "The turn-constraint Cube must not exceed six affected creatures.";
  }
  const outcomeTargetIds = savingThrowOutcomes.outcomes.map(
    (outcome) => outcome.targetId,
  );
  const affectedTargetIds = new Set(area.affectedTargetIds);
  if (
    affectedTargetIds.size !== outcomeTargetIds.length ||
    outcomeTargetIds.some((targetId) => !affectedTargetIds.has(targetId))
  ) {
    return "The turn-constraint Cube targets must match its Saving Throw outcomes.";
  }
  const witnessTargetIds = new Set<CombatantId>();
  for (const witness of area.affectedCreatureWitnesses) {
    if (witnessTargetIds.has(witness.targetId)) {
      return "Turn-constraint Cube witnesses must not duplicate a target.";
    }
    witnessTargetIds.add(witness.targetId);
    if (witness.inCube !== true || witness.chosenByCaster !== true) {
      return "Affected-creature witnesses must prove Cube membership and source choice.";
    }
  }
  if (
    witnessTargetIds.size !== outcomeTargetIds.length ||
    outcomeTargetIds.some((targetId) => !witnessTargetIds.has(targetId))
  ) {
    return "The turn-constraint procedure requires a Cube and source-choice witness for every affected target.";
  }
  return null;
}
/* v8 ignore stop -- @preserve */

const SaveGatedTurnConstraintBundleInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("saveGatedTurnConstraintBundle"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("magicAction"),
      ability: Schema.Literal("wis"),
      dc: DcSourceSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("pointOriginCube"),
        sideFeet: MovementFeet,
      }),
      maxTargets: Schema.Literal(SAVE_GATED_TURN_CONSTRAINT_MAX_TARGETS),
      rangeFeet: MovementFeet,
      durationTicks: ElapsedTimeTicksSchema,
      constraints: Schema.Struct({
        speedRatio: Schema.Struct({
          numerator: SaveGatedTurnConstraintSpeedNumeratorSchema,
          denominator: SaveGatedTurnConstraintSpeedDenominatorSchema,
        }),
        armorClassDelta: SaveGatedTurnConstraintArmorClassDeltaSchema,
        dexteritySavingThrowDelta:
          SaveGatedTurnConstraintDexteritySaveDeltaSchema,
        maxAttacks: SaveGatedTurnConstraintMaxAttacksSchema,
        somaticFailurePercent:
          SaveGatedTurnConstraintSomaticFailurePercentSchema,
      }),
    }),
  );

export const saveGatedTurnConstraintBundleProfile = {
  procedure: "saveGatedTurnConstraintBundle",
  executionSchema: SaveGatedTurnConstraintBundleInvocationSchema,
  admitMechanics: admitSaveGatedTurnConstraintBundleMechanics,
  discoverCastAct: discoverSaveGatedTurnConstraintBundleCastAct,
  resolve: resolveSaveGatedTurnConstraintBundle,
} satisfies SpellProcedureDeclaration<
  "saveGatedTurnConstraintBundle",
  SaveGatedTurnConstraintBundleSpellInvocation
>;
