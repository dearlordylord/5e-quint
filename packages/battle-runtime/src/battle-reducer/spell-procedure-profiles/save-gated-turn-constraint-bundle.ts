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
  type BattleSpellAreaChoice,
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
  level: "The turn-constraint procedure requires a third-level spell.",
  castingTime: "The turn-constraint procedure requires an action casting time.",
  range: "The turn-constraint procedure requires a 120-foot point range.",
  duration:
    "The turn-constraint procedure requires one minute of concentration.",
  durationValue:
    "The turn-constraint procedure requires a one-minute concentration value.",
  durationExtension:
    "The turn-constraint procedure has an unsupported duration extension.",
  durationEnding:
    "The turn-constraint procedure has an unsupported duration ending.",
  rootShape:
    "The turn-constraint procedure has unsupported activation root fields.",
  phaseCount:
    "The turn-constraint procedure requires exactly one activation phase.",
  phaseOrder:
    "The turn-constraint procedure's save gate must be the first activation phase.",
  phaseShape:
    "The turn-constraint procedure has an unsupported save-gate field.",
  phaseAbility: "The turn-constraint procedure requires a Wisdom Saving Throw.",
  phaseDc: "The turn-constraint procedure requires the caster's Spell Save DC.",
  attachment:
    "The turn-constraint procedure requires a point-origin 40-foot Cube for up to six creatures.",
  successOutcome:
    "The turn-constraint procedure requires no successful-save effect.",
  failedSaveEffect:
    "The turn-constraint procedure requires a composite failed-save effect bundle.",
  extraFailedSaveEffect:
    "The turn-constraint procedure has an unsupported additional failed-save effect.",
  missingFailedSaveEffect:
    "The turn-constraint procedure is missing a required failed-save effect.",
  repeatSave: "The turn-constraint procedure has an unsupported repeat save.",
  extraRepeatSave:
    "The turn-constraint procedure has an unsupported additional repeat save.",
  requiredFacts:
    "The turn-constraint procedure's admitted mechanics did not retain its required facts.",
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

type TurnConstraintBundleFailedEffectAdmission =
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

function turnConstraintBundleFailedEffectAdmission(
  effect: EffectAtom,
): TurnConstraintBundleFailedEffectAdmission | undefined {
  const admissions = [
    turnConstraintBundleSpeedRatioAdmission(effect),
    turnConstraintBundleArmorClassAdmission(effect),
    turnConstraintBundleDexteritySavingThrowAdmission(effect),
    turnConstraintBundleReactionRestrictionAdmission(effect),
    turnConstraintBundleActionOrBonusActionAdmission(effect),
    turnConstraintBundleAttackCapAdmission(effect),
    turnConstraintBundleSomaticFailureAdmission(effect),
  ];
  return admissions.find(
    (admission): admission is TurnConstraintBundleFailedEffectAdmission =>
      admission !== undefined,
  );
}

function turnConstraintBundleSpeedRatioAdmission(
  effect: EffectAtom,
):
  | Extract<
      TurnConstraintBundleFailedEffectAdmission,
      { readonly role: "speedRatio" }
    >
  | undefined {
  if (effect.kind !== "set_speed_ratio") return undefined;
  if (
    ![
      effect.numerator === SAVE_GATED_TURN_CONSTRAINT_SPEED_RATIO.numerator,
      effect.denominator === SAVE_GATED_TURN_CONSTRAINT_SPEED_RATIO.denominator,
      spellHasOnlyNamedFields(effect, ["kind", "numerator", "denominator"]),
    ].every(Boolean)
  ) {
    return undefined;
  }
  return {
    role: "speedRatio",
    speedRatio: {
      numerator: SaveGatedTurnConstraintSpeedNumeratorSchema.make(
        SAVE_GATED_TURN_CONSTRAINT_SPEED_RATIO.numerator,
      ),
      denominator: SaveGatedTurnConstraintSpeedDenominatorSchema.make(
        SAVE_GATED_TURN_CONSTRAINT_SPEED_RATIO.denominator,
      ),
    },
  };
}

function turnConstraintBundleArmorClassAdmission(
  effect: EffectAtom,
):
  | Extract<
      TurnConstraintBundleFailedEffectAdmission,
      { readonly role: "armorClass" }
    >
  | undefined {
  if (effect.kind !== "modify_ac") return undefined;
  if (effect.delta.kind !== "fixed_number") return undefined;
  const armorClassDelta = -effect.delta.amount;
  if (
    ![
      spellHasOnlyNamedFields(effect, ["kind", "delta"]),
      effect.delta.sign === "-",
      armorClassDelta === SAVE_GATED_TURN_CONSTRAINT_ARMOR_CLASS_DELTA,
      spellHasOnlyNamedFields(effect.delta, ["kind", "amount", "sign"]),
    ].every(Boolean)
  ) {
    return undefined;
  }
  return {
    role: "armorClass",
    armorClassDelta: SaveGatedTurnConstraintArmorClassDeltaSchema.make(
      SAVE_GATED_TURN_CONSTRAINT_ARMOR_CLASS_DELTA,
    ),
  };
}

function turnConstraintBundleDexteritySavingThrowAdmission(
  effect: EffectAtom,
):
  | Extract<
      TurnConstraintBundleFailedEffectAdmission,
      { readonly role: "dexteritySavingThrow" }
    >
  | undefined {
  if (effect.kind !== "modify_roll_numeric") return undefined;
  if (effect.delta.kind !== "fixed_number") return undefined;
  const dexteritySavingThrowDelta = -effect.delta.amount;
  if (
    !turnConstraintBundleDexteritySavingThrowSupported(
      effect,
      effect.delta,
      dexteritySavingThrowDelta,
    )
  ) {
    return undefined;
  }
  return {
    role: "dexteritySavingThrow",
    dexteritySavingThrowDelta:
      SaveGatedTurnConstraintDexteritySaveDeltaSchema.make(
        SAVE_GATED_TURN_CONSTRAINT_DEX_SAVE_DELTA,
      ),
  };
}

function turnConstraintBundleDexteritySavingThrowSupported(
  effect: Extract<EffectAtom, { readonly kind: "modify_roll_numeric" }>,
  delta: Extract<
    Extract<EffectAtom, { readonly kind: "modify_roll_numeric" }>["delta"],
    { readonly kind: "fixed_number" }
  >,
  deltaAmount: number,
): boolean {
  return [
    spellHasOnlyNamedFields(effect, ["kind", "on", "delta", "abilityFilter"]),
    effect.on !== undefined,
    effect.on !== undefined &&
      sameStringSet(effect.on, SAVE_GATED_TURN_CONSTRAINT_ROLL_KINDS),
    Array.isArray(effect.abilityFilter),
    Array.isArray(effect.abilityFilter) &&
      sameStringSet(effect.abilityFilter, SAVE_GATED_TURN_CONSTRAINT_ABILITIES),
    delta.sign === "-",
    deltaAmount === SAVE_GATED_TURN_CONSTRAINT_DEX_SAVE_DELTA,
    spellHasOnlyNamedFields(delta, ["kind", "amount", "sign"]),
  ].every(Boolean);
}

function turnConstraintBundleReactionRestrictionAdmission(
  effect: EffectAtom,
):
  | Extract<
      TurnConstraintBundleFailedEffectAdmission,
      { readonly role: "reactionRestriction" }
    >
  | undefined {
  if (effect.kind !== "restrict_action_usage") return undefined;
  if (
    ![
      sameStringSet(
        effect.actions,
        SAVE_GATED_TURN_CONSTRAINT_RESTRICTED_ACTIONS,
      ),
      spellHasOnlyNamedFields(effect, ["kind", "actions"]),
    ].every(Boolean)
  ) {
    return undefined;
  }
  return { role: "reactionRestriction" };
}

function turnConstraintBundleActionOrBonusActionAdmission(
  effect: EffectAtom,
):
  | Extract<
      TurnConstraintBundleFailedEffectAdmission,
      { readonly role: "actionOrBonusAction" }
    >
  | undefined {
  if (effect.kind !== "choose_action_or_bonus_action_each_turn")
    return undefined;
  if (![spellHasOnlyNamedFields(effect, ["kind"])].every(Boolean)) {
    return undefined;
  }
  return { role: "actionOrBonusAction" };
}

function turnConstraintBundleAttackCapAdmission(
  effect: EffectAtom,
):
  | Extract<
      TurnConstraintBundleFailedEffectAdmission,
      { readonly role: "attackCap" }
    >
  | undefined {
  if (effect.kind !== "cap_attack_action_attacks") return undefined;
  if (
    ![
      effect.maxAttacks === SAVE_GATED_TURN_CONSTRAINT_MAX_ATTACKS,
      spellHasOnlyNamedFields(effect, ["kind", "maxAttacks"]),
    ].every(Boolean)
  ) {
    return undefined;
  }
  return {
    role: "attackCap",
    maxAttacks: SaveGatedTurnConstraintMaxAttacksSchema.make(
      SAVE_GATED_TURN_CONSTRAINT_MAX_ATTACKS,
    ),
  };
}

function turnConstraintBundleSomaticFailureAdmission(
  effect: EffectAtom,
):
  | Extract<
      TurnConstraintBundleFailedEffectAdmission,
      { readonly role: "somaticFailure" }
    >
  | undefined {
  if (effect.kind !== "somatic_spell_failure_chance") return undefined;
  if (
    ![
      effect.percent === SAVE_GATED_TURN_CONSTRAINT_SOMATIC_FAILURE_PERCENT,
      spellHasOnlyNamedFields(effect, ["kind", "percent"]),
    ].every(Boolean)
  ) {
    return undefined;
  }
  return {
    role: "somaticFailure",
    somaticFailurePercent:
      SaveGatedTurnConstraintSomaticFailurePercentSchema.make(
        SAVE_GATED_TURN_CONSTRAINT_SOMATIC_FAILURE_PERCENT,
      ),
  };
}

function turnConstraintBundleAttachmentSupported(
  attachment: Attachment,
): boolean {
  const areaAdmission = admitSpellAreaAttachment(
    attachment,
    ["mode", "count", "targetKinds"],
    ["selection"],
  );
  if (areaAdmission.tag !== "admitted") return false;
  const areaAttachment = areaAdmission.attachment;
  const areaValue =
    areaAttachment.kind === "hole" ? areaAttachment.value : areaAttachment;
  return (
    areaAttachment.kind === "hole" &&
    turnConstraintBundleAreaSupported(areaValue) &&
    turnConstraintBundleSelectionSupported(areaValue.selection)
  );
}

function turnConstraintBundleAreaSupported(
  area: Extract<Attachment, { readonly kind: "area" }>,
): boolean {
  if (area.origin.kind !== "point_within_range") return false;
  if (!spellHasOnlyNamedFields(area.origin, ["kind"])) return false;
  if (area.shape.kind !== "cube") return false;
  return [
    spellHasOnlyNamedFields(area.shape, ["kind", "sideFeet"]),
    area.shape.sideFeet === SAVE_GATED_TURN_CONSTRAINT_CUBE_SIDE_FEET,
  ].every(Boolean);
}

function turnConstraintBundleSelectionSupported(
  selection: Extract<Attachment, { readonly kind: "area" }>["selection"],
): boolean {
  if (selection === undefined) return false;
  if (selection.mode !== "choose_up_to") return false;
  if (selection.count !== SAVE_GATED_TURN_CONSTRAINT_MAX_TARGETS) return false;
  if (selection.targetKinds === undefined) return false;
  return sameStringSet(
    selection.targetKinds,
    SAVE_GATED_TURN_CONSTRAINT_TARGET_KINDS,
  );
}

type TurnConstraintBundlePhaseWitnesses = Readonly<{
  cubeMultiTargetAttachment: boolean;
  turnConstraintEffect: boolean;
  endOfTurnRepeatSave: boolean;
}>;

function turnConstraintBundlePhaseWitnesses(
  phase: ActivationPhase,
): TurnConstraintBundlePhaseWitnesses {
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
      (effect) =>
        turnConstraintBundleFailedEffectAdmission(effect) !== undefined,
    );
  const repeatSaveWitness =
    phase.repeatSaves?.some(
      (repeatSave) =>
        repeatSave.cadence === "end_of_target_turn" &&
        repeatSave.onSuccess === "ends_on_target",
    ) === true;
  return {
    cubeMultiTargetAttachment: turnConstraintBundleAttachmentSupported(
      phase.attachment,
    ),
    turnConstraintEffect: constraintEffectsWitness,
    endOfTurnRepeatSave: repeatSaveWitness,
  };
}

function turnConstraintBundleRootPhase(phase: ActivationPhase): boolean {
  const witnesses = turnConstraintBundlePhaseWitnesses(phase);
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

function turnConstraintBundlePhaseBoundaryCompatible(
  phase: ActivationPhase | undefined,
): boolean {
  if (phase === undefined) return true;
  const witnesses = turnConstraintBundlePhaseWitnesses(phase);
  return (
    witnesses.cubeMultiTargetAttachment ||
    witnesses.turnConstraintEffect ||
    witnesses.endOfTurnRepeatSave
  );
}

function turnConstraintBundleDurationSupported(
  duration: SpellMechanics["duration"],
): boolean {
  return (
    duration.kind === "concentration" &&
    isSpellCanonicalDurationValue(duration.upTo) &&
    duration.upTo.unit === "minute" &&
    duration.upTo.amount === SAVE_GATED_TURN_CONSTRAINT_DURATION_MINUTES
  );
}

function turnConstraintBundleHeaderSignature(
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
      {
        name: "duration",
        present: turnConstraintBundleDurationSupported(mechanics.duration),
      },
    ],
  });
}

function turnConstraintBundleRootShape(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): boolean {
  if (mechanics.phases.some(turnConstraintBundleRootPhase)) return true;
  if (mechanics.phases.length > 1) return false;
  return (
    turnConstraintBundlePhaseBoundaryCompatible(mechanics.phases[0]) &&
    turnConstraintBundleHeaderSignature(mechanics)
  );
}

function turnConstraintBundleDurationIssues(
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
  if (!turnConstraintBundleDurationSupported(duration)) {
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

function turnConstraintBundleFactsFromAdmissions(
  admissions: readonly TurnConstraintBundleFailedEffectAdmission[],
): SaveGatedTurnConstraintFacts | undefined {
  const speedRatio = admissions.find(
    (
      admission,
    ): admission is Extract<
      TurnConstraintBundleFailedEffectAdmission,
      { readonly role: "speedRatio" }
    > => admission.role === "speedRatio",
  );
  const armorClass = admissions.find(
    (
      admission,
    ): admission is Extract<
      TurnConstraintBundleFailedEffectAdmission,
      { readonly role: "armorClass" }
    > => admission.role === "armorClass",
  );
  const dexterity = admissions.find(
    (
      admission,
    ): admission is Extract<
      TurnConstraintBundleFailedEffectAdmission,
      { readonly role: "dexteritySavingThrow" }
    > => admission.role === "dexteritySavingThrow",
  );
  const attackCap = admissions.find(
    (
      admission,
    ): admission is Extract<
      TurnConstraintBundleFailedEffectAdmission,
      { readonly role: "attackCap" }
    > => admission.role === "attackCap",
  );
  const somaticFailure = admissions.find(
    (
      admission,
    ): admission is Extract<
      TurnConstraintBundleFailedEffectAdmission,
      { readonly role: "somaticFailure" }
    > => admission.role === "somaticFailure",
  );
  if (speedRatio === undefined) return undefined;
  if (armorClass === undefined) return undefined;
  if (dexterity === undefined) return undefined;
  if (attackCap === undefined) return undefined;
  if (somaticFailure === undefined) return undefined;
  return {
    speedRatio: speedRatio.speedRatio,
    armorClassDelta: armorClass.armorClassDelta,
    dexteritySavingThrowDelta: dexterity.dexteritySavingThrowDelta,
    maxAttacks: attackCap.maxAttacks,
    somaticFailurePercent: somaticFailure.somaticFailurePercent,
  };
}

function turnConstraintBundleMechanicsEvidence(
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

type SaveGatedTurnConstraintBundleInspection =
  SpellProcedureMechanicsInspection<
    "saveGatedTurnConstraintBundle",
    SaveGatedTurnConstraintBundleMechanicsFacts,
    SaveGatedTurnConstraintBundleSpellInvocation,
    SaveGatedTurnConstraintBundleMechanicsIssue
  >;

function turnConstraintBundleHeaderIssues(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): SaveGatedTurnConstraintBundleMechanicsIssue[] {
  const issues: SaveGatedTurnConstraintBundleMechanicsIssue[] = [];
  if (mechanics.level !== SAVE_GATED_TURN_CONSTRAINT_LEVEL)
    issues.push(
      saveGatedTurnConstraintBundleIssue(
        "level",
        spellMechanicsHeaderPath("level"),
      ),
    );
  if (
    mechanics.castingTime.kind !== "action" ||
    !spellHasOnlyNamedFields(mechanics.castingTime, ["kind"])
  )
    issues.push(
      saveGatedTurnConstraintBundleIssue(
        "castingTime",
        spellMechanicsHeaderPath("castingTime"),
      ),
    );
  if (
    mechanics.range.kind !== "point" ||
    mechanics.range.feet !== SAVE_GATED_TURN_CONSTRAINT_RANGE_FEET ||
    !spellHasOnlyNamedFields(mechanics.range, ["kind", "feet"])
  )
    issues.push(
      saveGatedTurnConstraintBundleIssue(
        "range",
        spellMechanicsHeaderPath("range"),
      ),
    );
  issues.push(...turnConstraintBundleDurationIssues(mechanics.duration));
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
  )
    issues.push(
      saveGatedTurnConstraintBundleIssue(
        "rootShape",
        spellMechanicsHeaderPath("family"),
      ),
    );
  return issues;
}

function turnConstraintBundlePhasePlacementIssues(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
  phaseIndex: number,
): SaveGatedTurnConstraintBundleMechanicsIssue[] {
  const issues: SaveGatedTurnConstraintBundleMechanicsIssue[] = [];
  if (mechanics.phases.length !== 1) {
    for (const [index] of mechanics.phases.entries()) {
      if (index === phaseIndex) continue;
      issues.push(
        saveGatedTurnConstraintBundleIssue(
          "phaseCount",
          spellActivationPhasePath(PositiveInteger(index + 1)),
        ),
      );
    }
    if (mechanics.phases.length === 0)
      issues.push(
        saveGatedTurnConstraintBundleIssue(
          "phaseCount",
          spellMechanicsRootPath(),
        ),
      );
  }
  if (phaseIndex !== 0)
    issues.push(
      saveGatedTurnConstraintBundleIssue(
        "phaseOrder",
        spellActivationPhasePath(PositiveInteger(phaseIndex + 1)),
      ),
    );
  return issues;
}

type TurnConstraintBundleSavePhase = Extract<
  ActivationPhase,
  { readonly kind: "save_gate" }
>;

function turnConstraintBundlePhaseIssues(
  phase: TurnConstraintBundleSavePhase,
  phaseOrdinal: ReturnType<typeof PositiveInteger>,
  attachmentSupported: boolean,
): SaveGatedTurnConstraintBundleMechanicsIssue[] {
  const path = spellActivationPhasePath(phaseOrdinal);
  const issues: SaveGatedTurnConstraintBundleMechanicsIssue[] = [];
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
    issues.push(saveGatedTurnConstraintBundleIssue("phaseShape", path));
  if (phase.ability !== "wis")
    issues.push(saveGatedTurnConstraintBundleIssue("phaseAbility", path));
  if (
    phase.dc.kind !== "caster_spell_save_dc" ||
    !spellHasOnlyNamedFields(phase.dc, ["kind"])
  )
    issues.push(saveGatedTurnConstraintBundleIssue("phaseDc", path));
  if (!attachmentSupported)
    issues.push(
      saveGatedTurnConstraintBundleIssue(
        "attachment",
        spellActivationAttachmentPath(phaseOrdinal),
      ),
    );
  if (
    phase.onSuccess.kind !== "none" ||
    !spellHasOnlyNamedFields(phase.onSuccess, ["kind"])
  )
    issues.push(saveGatedTurnConstraintBundleIssue("successOutcome", path));
  return issues;
}

type TurnConstraintBundleFailedEffectsInspection = Readonly<{
  admissions: readonly TurnConstraintBundleFailedEffectAdmission[];
  issues: readonly SaveGatedTurnConstraintBundleMechanicsIssue[];
}>;

function turnConstraintBundleFailedEffectsInspection(
  phase: TurnConstraintBundleSavePhase,
  phaseOrdinal: ReturnType<typeof PositiveInteger>,
): TurnConstraintBundleFailedEffectsInspection {
  const path = spellActivationPhasePath(phaseOrdinal);
  if (
    phase.onFail.kind !== "composite" ||
    !spellHasOnlyNamedFields(phase.onFail, ["kind", "effects"])
  )
    return {
      admissions: [],
      issues: [saveGatedTurnConstraintBundleIssue("failedSaveEffect", path)],
    };
  const admissions: TurnConstraintBundleFailedEffectAdmission[] = [];
  const issues: SaveGatedTurnConstraintBundleMechanicsIssue[] = [];
  const seenRoles = new Set<SaveGatedTurnConstraintFailedEffectRole>();
  for (const [index, effect] of phase.onFail.effects.entries()) {
    const admission = turnConstraintBundleFailedEffectAdmission(effect);
    if (admission === undefined || seenRoles.has(admission.role))
      issues.push(
        saveGatedTurnConstraintBundleIssue(
          "extraFailedSaveEffect",
          spellActivationEffectPath(phaseOrdinal, PositiveInteger(index + 1)),
        ),
      );
    else {
      seenRoles.add(admission.role);
      admissions.push(admission);
    }
  }
  if (
    SAVE_GATED_TURN_CONSTRAINT_FAILED_EFFECT_ROLES.some(
      (role) => !seenRoles.has(role),
    )
  )
    issues.push(
      saveGatedTurnConstraintBundleIssue("missingFailedSaveEffect", path),
    );
  return { admissions, issues };
}

function turnConstraintBundleRepeatSupported(
  repeatSave: NonNullable<TurnConstraintBundleSavePhase["repeatSaves"]>[number],
): boolean {
  return [
    repeatSave.cadence === "end_of_target_turn",
    repeatSave.onSuccess === "ends_on_target",
    spellHasOnlyNamedFields(repeatSave, ["cadence", "onSuccess"]),
  ].every(Boolean);
}

function turnConstraintBundleRepeatIssues(
  phase: TurnConstraintBundleSavePhase,
  phaseOrdinal: ReturnType<typeof PositiveInteger>,
): SaveGatedTurnConstraintBundleMechanicsIssue[] {
  const repeatSaves = phase.repeatSaves ?? [];
  const supportedIndexes = repeatSaves.flatMap((repeatSave, index) =>
    turnConstraintBundleRepeatSupported(repeatSave) ? [index] : [],
  );
  const issues: SaveGatedTurnConstraintBundleMechanicsIssue[] = [];
  for (const [index, repeatSave] of repeatSaves.entries()) {
    if (
      !turnConstraintBundleRepeatSupported(repeatSave) ||
      index !== supportedIndexes[0]
    )
      issues.push(
        saveGatedTurnConstraintBundleIssue(
          index === 0 && supportedIndexes.length === 0
            ? "repeatSave"
            : "extraRepeatSave",
          spellActivationRepeatPath(phaseOrdinal, PositiveInteger(index + 1)),
        ),
      );
  }
  if (repeatSaves.length === 0)
    issues.push(
      saveGatedTurnConstraintBundleIssue(
        "repeatSave",
        spellActivationPhasePath(phaseOrdinal),
      ),
    );
  return issues;
}

function turnConstraintBundleUnsupported(
  issues: readonly SaveGatedTurnConstraintBundleMechanicsIssue[],
  fallbackPath: UnitMechanicsPath,
): Extract<
  SaveGatedTurnConstraintBundleInspection,
  { readonly tag: "unsupported" }
> {
  const nonEmpty = spellProcedureNonEmpty(spellUniqueMechanicsIssues(issues));
  return {
    tag: "unsupported",
    issues: nonEmpty ?? [
      saveGatedTurnConstraintBundleIssue("requiredFacts", fallbackPath),
    ],
  };
}

function turnConstraintBundleSupportedInspection(
  source: SpellMechanicsAdmissionSource,
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
  phase: TurnConstraintBundleSavePhase,
  phaseOrdinal: ReturnType<typeof PositiveInteger>,
  attachmentSupported: boolean,
  failedEffectAdmissions: readonly TurnConstraintBundleFailedEffectAdmission[],
): SaveGatedTurnConstraintBundleInspection {
  if (!attachmentSupported)
    return turnConstraintBundleUnsupported(
      [],
      spellActivationPhasePath(phaseOrdinal),
    );
  if (mechanics.range.kind !== "point")
    return turnConstraintBundleUnsupported(
      [],
      spellActivationPhasePath(phaseOrdinal),
    );
  if (typeof mechanics.range.feet !== "number")
    return turnConstraintBundleUnsupported(
      [],
      spellActivationPhasePath(phaseOrdinal),
    );
  if (mechanics.duration.kind !== "concentration")
    return turnConstraintBundleUnsupported(
      [],
      spellActivationPhasePath(phaseOrdinal),
    );
  if (!isSpellCanonicalDurationValue(mechanics.duration.upTo))
    return turnConstraintBundleUnsupported(
      [],
      spellActivationPhasePath(phaseOrdinal),
    );
  const constraints = turnConstraintBundleFactsFromAdmissions(
    failedEffectAdmissions,
  );
  if (constraints === undefined)
    return turnConstraintBundleUnsupported(
      [],
      spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
    );
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
      evidence: turnConstraintBundleMechanicsEvidence(mechanics, phase),
      admit: (executionSource: BattleSpellExecutionSource, ctx) =>
        saveGatedTurnConstraintBundleInvocationsFromFacts(
          executionSource,
          facts,
          ctx.spellCastOptions,
        ),
    },
  };
}

function admitSaveGatedTurnConstraintBundleMechanics(
  source: SpellMechanicsAdmissionSource,
): SaveGatedTurnConstraintBundleInspection {
  if (source.mechanics.family !== "activation")
    return { tag: "notRepresented" };
  const mechanics = source.mechanics;
  if (!turnConstraintBundleRootShape(mechanics))
    return { tag: "notRepresented" };
  const representedPhaseIndex = mechanics.phases.findIndex(
    turnConstraintBundleRootPhase,
  );
  const phaseIndex = representedPhaseIndex < 0 ? 0 : representedPhaseIndex;
  const phase = mechanics.phases[phaseIndex];
  const issues = [
    ...turnConstraintBundleHeaderIssues(mechanics),
    ...turnConstraintBundlePhasePlacementIssues(mechanics, phaseIndex),
  ];
  const phaseOrdinal = PositiveInteger(phaseIndex + 1);
  if (phase?.kind !== "save_gate") {
    return turnConstraintBundleUnsupported(issues, spellMechanicsRootPath());
  }
  const attachmentSupported = turnConstraintBundleAttachmentSupported(
    phase.attachment,
  );
  const failedEffects = turnConstraintBundleFailedEffectsInspection(
    phase,
    phaseOrdinal,
  );
  issues.push(
    ...turnConstraintBundlePhaseIssues(
      phase,
      phaseOrdinal,
      attachmentSupported,
    ),
    ...failedEffects.issues,
    ...turnConstraintBundleRepeatIssues(phase, phaseOrdinal),
  );
  const nonEmptyIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (nonEmptyIssues !== undefined)
    return { tag: "unsupported", issues: nonEmptyIssues };
  return turnConstraintBundleSupportedInspection(
    source,
    mechanics,
    phase,
    phaseOrdinal,
    attachmentSupported,
    failedEffects.admissions,
  );
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

function turnConstraintBundleHasInvalidFill(
  input: SaveGatedTurnConstraintBundleResolveInput,
): boolean {
  const { fillSet } = input;
  return [
    fillSet.targetId !== undefined,
    fillSet.targetList !== undefined,
    fillSet.attackRoll !== undefined,
    fillSet.damageRoll !== undefined,
    fillSet.concentrationSavingThrows.length > 0,
    fillSet.damageDispositions.length > 0,
  ].some(Boolean);
}

function turnConstraintBundleAreaValidationResult(
  input: SaveGatedTurnConstraintBundleResolveInput,
  savingThrowOutcomes: BattleSpellSavingThrowOutcomeValue,
): BattleResolutionResult | undefined {
  const areaWitnessValidation = validateTurnConstraintAreaWitness(
    savingThrowOutcomes,
    input.invocation.targeting.sideFeet,
    input.invocation.maxTargets,
  );
  if (areaWitnessValidation === null) return undefined;
  return invalidResult(input.input.state, "invalidFill", areaWitnessValidation);
}

function turnConstraintBundleReactionWindowResult(
  input: SaveGatedTurnConstraintBundleResolveInput,
  failedTargets: readonly CombatantId[],
): BattleResolutionResult | undefined {
  if (failedTargets.length === 0) return undefined;
  return (
    maybeOpenInterruptWindow(
      input.input.state,
      {
        trigger: "saveFailed",
        targetId: failedTargets[0]!,
        sourceProcedureRef: input.invocation.sourceProcedureRef,
        continuation: spellReplayContinuation(input.input),
      },
      input.input.handledInterruptTrigger,
    ) ?? undefined
  );
}

function resolveSaveGatedTurnConstraintBundle(
  input: SaveGatedTurnConstraintBundleResolveInput,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (turnConstraintBundleHasInvalidFill(input)) {
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
  const areaValidationResult = turnConstraintBundleAreaValidationResult(
    input,
    savingThrowOutcomes,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (areaValidationResult !== undefined) return areaValidationResult;
  /* v8 ignore stop -- @preserve */
  const affectedTargetIds = savingThrowOutcomes.outcomes.map(
    (outcome) => outcome.targetId,
  );
  const failedTargets = failedSavingThrowTargetIds(
    savingThrowOutcomes.outcomes,
  );
  const saveFailedReactionWindow = turnConstraintBundleReactionWindowResult(
    input,
    failedTargets,
  );
  if (saveFailedReactionWindow !== undefined) return saveFailedReactionWindow;
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

type TurnConstraintArea = Extract<
  BattleSpellAreaChoice,
  { readonly kind: "saveGatedTurnConstraintBundleArea" }
>;

function turnConstraintAreaGeometryError(
  area: TurnConstraintArea,
  cubeSideFeet: MovementFeet,
  maxTargets: SaveGatedTurnConstraintBundleSpellInvocation["maxTargets"],
): string | null {
  if (Number(area.cubeSideFeet) !== Number(cubeSideFeet))
    return "The turn-constraint procedure requires the admitted Cube geometry.";
  if (area.affectedTargetIds.length > maxTargets)
    return "The turn-constraint Cube must not exceed six affected creatures.";
  return null;
}

function turnConstraintAreaTargetError(
  area: TurnConstraintArea,
  outcomeTargetIds: readonly CombatantId[],
): string | null {
  const affectedTargetIds = new Set(area.affectedTargetIds);
  if (
    affectedTargetIds.size !== outcomeTargetIds.length ||
    outcomeTargetIds.some((targetId) => !affectedTargetIds.has(targetId))
  )
    return "The turn-constraint Cube targets must match its Saving Throw outcomes.";
  return null;
}

type TurnConstraintAreaWitnessInspection = Readonly<{
  targetIds: ReadonlySet<CombatantId>;
  error: string | null;
}>;

function turnConstraintAreaWitnessInspection(
  area: TurnConstraintArea,
): TurnConstraintAreaWitnessInspection {
  const targetIds = new Set<CombatantId>();
  for (const witness of area.affectedCreatureWitnesses) {
    if (targetIds.has(witness.targetId))
      return {
        targetIds,
        error: "Turn-constraint Cube witnesses must not duplicate a target.",
      };
    targetIds.add(witness.targetId);
    if (witness.inCube !== true || witness.chosenByCaster !== true)
      return {
        targetIds,
        error:
          "Affected-creature witnesses must prove Cube membership and source choice.",
      };
  }
  return { targetIds, error: null };
}

function turnConstraintAreaWitnessCoverageError(
  witnessTargetIds: ReadonlySet<CombatantId>,
  outcomeTargetIds: readonly CombatantId[],
): string | null {
  if (
    witnessTargetIds.size !== outcomeTargetIds.length ||
    outcomeTargetIds.some((targetId) => !witnessTargetIds.has(targetId))
  )
    return "The turn-constraint procedure requires a Cube and source-choice witness for every affected target.";
  return null;
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
  const geometryError = turnConstraintAreaGeometryError(
    area,
    cubeSideFeet,
    maxTargets,
  );
  if (geometryError !== null) return geometryError;
  const outcomeTargetIds = savingThrowOutcomes.outcomes.map(
    (outcome) => outcome.targetId,
  );
  const targetError = turnConstraintAreaTargetError(area, outcomeTargetIds);
  if (targetError !== null) return targetError;
  const witnessInspection = turnConstraintAreaWitnessInspection(area);
  if (witnessInspection.error !== null) return witnessInspection.error;
  return turnConstraintAreaWitnessCoverageError(
    witnessInspection.targetIds,
    outcomeTargetIds,
  );
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
