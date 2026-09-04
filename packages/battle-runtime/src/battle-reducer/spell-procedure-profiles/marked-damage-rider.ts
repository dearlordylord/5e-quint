import { maybeOpenSpellCastReactionWindow } from "../spell-cast-reaction-window.ts";
import type {
  BattleSpellAdmissionSource,
  BattleSpellExecutionSource,
} from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-marked-damage-rider
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER
//
// The markedDamageRider Spell Procedure Profile: Bonus Action Concentration
// spells that mark one creature, add damage when the caster hits the marked
// creature with an Attack Roll, optionally affect Ability Checks, and move the
// mark after the target drops to 0 Hit Points.
//
// RAW anchors:
//   - SRD 5.2.1 Spells "Hex": Bonus Action, 90 feet, Concentration up to
//     1 hour; extra Necrotic damage on hits with Attack Rolls; chosen Ability
//     Check Disadvantage; later-turn Bonus Action transfer; longer duration
//     with higher-level Spell Slots.
//   - SRD 5.2.1 Spells "Hunter's Mark": Bonus Action, 90 feet, Concentration
//     up to 1 hour; extra Force damage on hits with Attack Rolls; Wisdom
//     (Perception or Survival) finding Advantage; Bonus Action transfer; longer
//     duration with higher-level Spell Slots.
//   - UBIQUITOUS_LANGUAGE.md: Bonus Action, Attack Roll, Ability Check, Damage
//     Roll, Concentration, Spell Slot, Spell Invocation, and Spell Effect.
//
// What lives here: admit, discoverCastAct, castSummary, resolve,
// and applyEffect helpers.
//
import { spendActivationResource } from "@dnd/shared-algebras/action-economy-algebra";
import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  PositiveInteger,
  type MovementFeet,
  type ReadonlyNonEmptyArray,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import {
  type Ability,
  type Attachment,
  type DamageType,
  type DiceAmount,
  type DiceExpr,
  type EffectAtom,
  type Skill,
  type SpellMechanics,
} from "@dnd/surface/surface/types";
import { Result, Match } from "effect";
import { allocateBattleEffectExecutionRefForCreature } from "../../effect-execution-ref.ts";
import { BattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
import { characterExecutionWithMarkedDamageRiderTransfer } from "../../character-execution-queries.ts";
import type { MarkedDamageRiderTransferSpellProcedureExecution } from "../../character-execution.ts";
import {
  type BattleActDiscoveryCandidate,
  type BattleActiveEffect,
  type BattleActiveEffectExpiration,
  type BattleResolutionResult,
  type BattleState,
  type BattleExecutableSpellInvocation,
  type MarkedDamageRiderCastAbilityCheckBehavior,
  type MarkedDamageRiderRetargetTiming,
  type MarkedDamageRiderTransferState,
  type SpellMarkedDamageRider,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { snapshotBattle } from "../interrupt-execution.ts";
import {
  BattleEffectExecutionRef,
  BattleProcedureExecutionRef,
  type CombatantId,
} from "../../identity.ts";
import { activeMarkedDamageRiderEffect } from "../damage-helpers.ts";
import { currentActorId } from "../creature-state-leaves.ts";
import { breakBattleConcentration } from "../damage-apply.ts";

import { needsHolesResult } from "../needs-holes-result.ts";
import { invalidResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { ATTACK_TARGET_HOLE_ID } from "../battle-runtime-protocol.ts";
import { battleStateAfterTargetActionEarlyEndForActor } from "../targeting-save-interdiction.ts";
import { expendSpellSlot } from "../spell-effects.ts";
import {
  spellAbilityChoiceHole,
  spellAbilityChoiceHoleId,
} from "../spells-damage-fills.ts";
import { markSpellSlotExpendedThisTurn } from "../spell-turn-resources.ts";
import {
  spendSpellAccessFreeCastResource,
  startSpellEffectConcentration,
  type SpellCastResourceSpendResult,
} from "../spells-resolve-resources.ts";
import { spellTargetHole, spellTargetIsLegal } from "../spells-targeting.ts";
import { clearPendingAttackRollMissToHitReplacementSelection } from "../statblock-attacks.ts";
import type {
  SpellAdmissionBattleTurn,
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { spellInvocationResourceForCastOption } from "./profile.ts";
import { Schema } from "effect";
import {
  AbilitySchema,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
  MovementFeet as MovementFeetSchema,
} from "../codec-building-blocks.ts";
import { DamageTypeSchema, DiceExprSchema } from "@dnd/surface/surface/schema";
import { MARKED_TARGET_FINDING_SKILLS } from "../domain-constants.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import {
  spellConsumedMaterialEvidencePaths,
  spellDefinitionPointRangeFeet,
  spellDurationChildCoordinates,
  spellDurationChildFailedFact,
  spellDurationChildPath,
  spellDurationEvidencePaths,
  spellDurationValueEvidencePaths,
  spellMechanicsFixedTableEntries,
  spellMechanicsObjectHasOnlyKeys,
  spellPositiveIntegerFromSurface,
  spellProcedureNonEmpty,
  spellSlotLevelFromSurface,
  spellUniqueMechanicsIssues,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  spellMechanicsHeaderPath,
  spellOngoingAttachmentPath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";

type MarkedDamageRiderInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "markedDamageRider" }
>;
type MarkedDamageRiderCastInvocation = Extract<
  MarkedDamageRiderInvocation,
  { readonly action: "cast" }
>;
type MarkedDamageRiderResolveInput =
  SpellProcedureProfileResolveInput<MarkedDamageRiderInvocation>;
type OngoingEffectMechanics = Extract<
  BattleSpellAdmissionSource["mechanics"],
  { readonly family: "ongoing_effect" }
>;
type OngoingEffectOperation = OngoingEffectMechanics["operations"][number];
type MarkedDamageRiderDurationTier = {
  readonly atSlot: SpellSlotLevel;
  readonly amount: PositiveInteger;
};
type MarkedDamageRiderDurationFacts = {
  readonly unit: "hour";
  readonly amount: PositiveInteger;
  readonly upcastTiers: ReadonlyNonEmptyArray<MarkedDamageRiderDurationTier>;
};

type MarkedDamageRiderHoleAttachment = Extract<
  Attachment,
  { readonly kind: "hole" }
>;
type MarkedDamageRiderMarkAttachmentValue = Extract<
  MarkedDamageRiderHoleAttachment["value"],
  { readonly kind: "mark" }
>;
type MarkedDamageRiderMarkTransfer = NonNullable<
  MarkedDamageRiderMarkAttachmentValue["transfer"]
>;
type MarkedDamageRiderAttachment = MarkedDamageRiderHoleAttachment & {
  readonly value: MarkedDamageRiderMarkAttachmentValue & {
    readonly transfer: NonNullable<
      MarkedDamageRiderMarkAttachmentValue["transfer"]
    >;
  };
};
type MarkedDamageRiderDuration = Extract<
  OngoingEffectMechanics["duration"],
  { readonly kind: "concentration" }
>;
type MarkedDamageRiderSourceDurationTier = NonNullable<
  MarkedDamageRiderDuration["upTo"]["upcastTiers"]
>[number];
type MarkedDamageRiderAbilityEffect = Extract<
  EffectAtom,
  { readonly kind: "modify_roll_advantage" }
>;
type MarkedDamageRiderSkillFilter = Extract<
  NonNullable<MarkedDamageRiderAbilityEffect["skillFilter"]>,
  { readonly kind: "fixed" }
>;
type MarkedDamageRiderAbilityFilterHole = Extract<
  NonNullable<MarkedDamageRiderAbilityEffect["abilityFilter"]>,
  { readonly kind: "hole" }
>;
type MarkedDamageRiderAbilityChoice = Extract<
  MarkedDamageRiderAbilityFilterHole["value"],
  { readonly kind: "choice" }
>;
type MarkedDamageRiderCastingTime = Extract<
  OngoingEffectMechanics["castingTime"],
  { readonly kind: "bonus_action" }
>;
type MarkedDamageRiderRange = Extract<
  SpellMechanics["range"],
  { readonly kind: "point" }
>;
type MarkedDamageRiderDamageEffect = Extract<
  EffectAtom,
  { readonly kind: "damage" }
>;
type MarkedDamageRiderFixedDamageAmount = Extract<
  DiceAmount,
  { readonly kind: "fixed" }
>;
type MarkedDamageRiderDamageAmount = MarkedDamageRiderFixedDamageAmount & {
  readonly expr: DiceExpr & {
    readonly dice: 1;
    readonly dieSize: 6;
    readonly flat?: undefined;
    readonly spellcastingMod?: undefined;
    readonly abilityModifier?: undefined;
  };
};
type MarkedDamageRiderDamageType = Extract<DamageType, "force" | "necrotic">;

type MarkedDamageRiderMechanicsFacts = SpellDefinitionRuleFacts & {
  readonly rangeFeet: MovementFeet;
  readonly durationFacts: MarkedDamageRiderDurationFacts;
  readonly damageAmount: MarkedDamageRiderDamageAmount;
  readonly damageType: MarkedDamageRiderDamageType;
  readonly abilityCheckBehavior: MarkedDamageRiderCastAbilityCheckBehavior;
  readonly retargetTiming: MarkedDamageRiderRetargetTiming;
};

export const MARKED_DAMAGE_RIDER_FAILED_FACTS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "durationValue",
  "durationExtension",
  "durationEnding",
  "castingTime",
  "attachment",
  "operationCount",
  "operations",
  "damageEffect",
  "damageAmount",
  "abilityEffect",
  "abilityScope",
] as const;
type MarkedDamageRiderFailedFact =
  (typeof MARKED_DAMAGE_RIDER_FAILED_FACTS)[number];

type MarkedDamageRiderMechanicsIssue = {
  readonly failedFact: MarkedDamageRiderFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

type MarkedDamageRiderMechanicsInspection = SpellProcedureMechanicsInspection<
  "markedDamageRider",
  MarkedDamageRiderMechanicsFacts,
  MarkedDamageRiderInvocation,
  ReturnType<typeof markedDamageRiderIssueResult>
>;

const MARKED_DAMAGE_RIDER_ATTACHMENT_FIELDS = [
  "kind",
  "holeId",
  "label",
  "value",
] as const satisfies ReadonlyArray<keyof MarkedDamageRiderHoleAttachment>;
const MARKED_DAMAGE_RIDER_MARK_VALUE_FIELDS = [
  "kind",
  "selection",
  "transfer",
] as const satisfies ReadonlyArray<keyof MarkedDamageRiderMarkAttachmentValue>;
const MARKED_DAMAGE_RIDER_SELECTION_FIELDS = [
  "mode",
  "targetKinds",
] as const satisfies ReadonlyArray<
  keyof MarkedDamageRiderMarkAttachmentValue["selection"]
>;
const MARKED_DAMAGE_RIDER_TRANSFER_FIELDS = [
  "onEvent",
  "availability",
  "cost",
] as const satisfies ReadonlyArray<keyof MarkedDamageRiderMarkTransfer>;
const MARKED_DAMAGE_RIDER_TRANSFER_EVENT_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<
  keyof MarkedDamageRiderMarkTransfer["onEvent"]
>;
const MARKED_DAMAGE_RIDER_TRANSFER_AVAILABILITY_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<
  keyof MarkedDamageRiderMarkTransfer["availability"]
>;
const MARKED_DAMAGE_RIDER_TRANSFER_COST_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<keyof MarkedDamageRiderMarkTransfer["cost"]>;
const MARKED_DAMAGE_RIDER_DURATION_FIELDS = [
  "kind",
  "upTo",
  "earlyEnd",
  "permanentIfMaintainedFull",
] as const satisfies ReadonlyArray<keyof MarkedDamageRiderDuration>;
const MARKED_DAMAGE_RIDER_DURATION_VALUE_FIELDS = [
  "unit",
  "amount",
  "upcastTiers",
] as const satisfies ReadonlyArray<keyof MarkedDamageRiderDuration["upTo"]>;
const MARKED_DAMAGE_RIDER_DURATION_TIER_FIELDS = [
  "atSlot",
  "amount",
] as const satisfies ReadonlyArray<keyof MarkedDamageRiderSourceDurationTier>;
const MARKED_DAMAGE_RIDER_DURATION_TIER_TABLES = [
  [
    { atSlot: 3, amount: 8 },
    { atSlot: 5, amount: 24 },
  ],
  [
    { atSlot: 2, amount: 4 },
    { atSlot: 3, amount: 8 },
    { atSlot: 5, amount: 24 },
  ],
] as const;
const MARKED_DAMAGE_RIDER_TRIGGER_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<keyof OngoingEffectOperation["trigger"]>;
const MARKED_DAMAGE_RIDER_CASTING_TIME_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<keyof MarkedDamageRiderCastingTime>;
const MARKED_DAMAGE_RIDER_RANGE_FIELDS = [
  "kind",
  "feet",
] as const satisfies ReadonlyArray<keyof MarkedDamageRiderRange>;
const MARKED_DAMAGE_RIDER_COMPONENT_FIELDS = [
  "v",
  "s",
  "m",
] as const satisfies ReadonlyArray<keyof SpellMechanics["components"]>;
const MARKED_DAMAGE_RIDER_ROOT_FIELDS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "castingTime",
  "family",
  "attachment",
  "operations",
] as const satisfies ReadonlyArray<keyof OngoingEffectMechanics>;
const MARKED_DAMAGE_RIDER_AMOUNT_FIELDS = [
  "kind",
  "expr",
] as const satisfies ReadonlyArray<keyof MarkedDamageRiderFixedDamageAmount>;
const MARKED_DAMAGE_RIDER_DICE_EXPR_FIELDS = [
  "dice",
  "dieSize",
  "flat",
  "spellcastingMod",
  "abilityModifier",
] as const satisfies ReadonlyArray<keyof DiceExpr>;
const MARKED_DAMAGE_RIDER_SKILL_FILTER_FIELDS = [
  "kind",
  "skills",
] as const satisfies ReadonlyArray<keyof MarkedDamageRiderSkillFilter>;
const MARKED_DAMAGE_RIDER_ABILITY_FILTER_HOLE_FIELDS = [
  "kind",
  "holeId",
  "value",
  "label",
] as const satisfies ReadonlyArray<keyof MarkedDamageRiderAbilityFilterHole>;
const MARKED_DAMAGE_RIDER_ABILITY_CHOICE_FIELDS = [
  "kind",
  "label",
  "options",
] as const satisfies ReadonlyArray<keyof MarkedDamageRiderAbilityChoice>;
const MARKED_DAMAGE_RIDER_OPERATION_FIELDS = [
  "trigger",
  "predicate",
  "targetLimit",
  "effect",
  "usageLimit",
] as const satisfies ReadonlyArray<keyof OngoingEffectOperation>;
const MARKED_DAMAGE_RIDER_DAMAGE_EFFECT_FIELDS = [
  "kind",
  "damageType",
  "amount",
] as const satisfies ReadonlyArray<keyof MarkedDamageRiderDamageEffect>;
const MARKED_DAMAGE_RIDER_ABILITY_EFFECT_FIELDS = [
  "kind",
  "mode",
  "affects",
  "on",
  "abilityFilter",
  "skillFilter",
  "abilityCheckTrigger",
  "spellSourceFilter",
  "attackerTypeFilter",
  "conditionFilter",
  "saveAbilityFilter",
  "saveSourceFilter",
  "contextRangeFeet",
  "attackRollTarget",
  "count",
  "expiresOn",
] as const satisfies ReadonlyArray<keyof MarkedDamageRiderAbilityEffect>;

function markedDamageRiderIssueResult(issue: MarkedDamageRiderMechanicsIssue) {
  return {
    tag: "spellProcedureAdmissionIssue" as const,
    procedure: "markedDamageRider" as const,
    failedFact: issue.failedFact,
    mechanicsPath: issue.mechanicsPath,
    message: `Unsupported markedDamageRider mechanics fact: ${issue.failedFact}.`,
  };
}

function markedDamageRiderIssue(
  failedFact: MarkedDamageRiderFailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
): MarkedDamageRiderMechanicsIssue {
  return { failedFact, mechanicsPath };
}

function markedDamageRiderSemanticCandidate(
  mechanics: SpellMechanics,
): boolean {
  return (
    mechanics.family === "ongoing_effect" &&
    mechanics.operations.some(
      (operation) => operation.trigger.kind === "on_caster_attack_hit",
    ) &&
    mechanics.operations.some(
      (operation) => operation.effect.kind === "modify_roll_advantage",
    )
  );
}

function markedDamageRiderDistinctiveHeaderFallback(
  mechanics: SpellMechanics,
): boolean {
  return (
    mechanics.family === "ongoing_effect" &&
    mechanics.level === 1 &&
    mechanics.castingTime.kind === "bonus_action" &&
    mechanics.range.kind === "point" &&
    mechanics.range.feet === 90 &&
    mechanics.duration.kind === "concentration"
  );
}

function markedDamageRiderAttachmentIsSupported(
  attachment: Attachment | undefined,
): attachment is MarkedDamageRiderAttachment {
  if (
    attachment?.kind !== "hole" ||
    attachment.value === undefined ||
    attachment.value.kind !== "mark" ||
    !spellMechanicsObjectHasOnlyKeys(
      attachment,
      MARKED_DAMAGE_RIDER_ATTACHMENT_FIELDS,
    ) ||
    !spellMechanicsObjectHasOnlyKeys(
      attachment.value,
      MARKED_DAMAGE_RIDER_MARK_VALUE_FIELDS,
    )
  ) {
    return false;
  }
  const selection = attachment.value.selection;
  const transfer = attachment.value.transfer;
  if (
    selection === undefined ||
    !spellMechanicsObjectHasOnlyKeys(
      selection,
      MARKED_DAMAGE_RIDER_SELECTION_FIELDS,
    )
  ) {
    return false;
  }
  return (
    selection.mode === "one" &&
    selection.targetKinds !== undefined &&
    selection.targetKinds.length === 1 &&
    selection.targetKinds[0] === "creature" &&
    transfer !== undefined &&
    transfer.onEvent !== undefined &&
    transfer.availability !== undefined &&
    transfer.cost !== undefined &&
    spellMechanicsObjectHasOnlyKeys(
      transfer,
      MARKED_DAMAGE_RIDER_TRANSFER_FIELDS,
    ) &&
    spellMechanicsObjectHasOnlyKeys(
      transfer.onEvent,
      MARKED_DAMAGE_RIDER_TRANSFER_EVENT_FIELDS,
    ) &&
    spellMechanicsObjectHasOnlyKeys(
      transfer.availability,
      MARKED_DAMAGE_RIDER_TRANSFER_AVAILABILITY_FIELDS,
    ) &&
    spellMechanicsObjectHasOnlyKeys(
      transfer.cost,
      MARKED_DAMAGE_RIDER_TRANSFER_COST_FIELDS,
    ) &&
    transfer.onEvent.kind === "target_drops_to_0_hp" &&
    transfer.cost.kind === "bonus_action" &&
    (transfer.availability.kind === "after_trigger" ||
      transfer.availability.kind === "later_turn_after_trigger")
  );
}

function markedDamageRiderDurationFacts(
  duration: OngoingEffectMechanics["duration"],
): MarkedDamageRiderDurationFacts | undefined {
  const baseAmount =
    duration.kind === "concentration"
      ? spellPositiveIntegerFromSurface(duration.upTo.amount)
      : undefined;
  if (
    duration.kind !== "concentration" ||
    !spellMechanicsObjectHasOnlyKeys(
      duration,
      MARKED_DAMAGE_RIDER_DURATION_FIELDS,
    ) ||
    !spellMechanicsObjectHasOnlyKeys(
      duration.upTo,
      MARKED_DAMAGE_RIDER_DURATION_VALUE_FIELDS,
    ) ||
    duration.upTo.unit !== "hour" ||
    duration.upTo.amount !== 1 ||
    baseAmount === undefined ||
    duration.upTo.upcastTiers === undefined ||
    duration.upTo.upcastTiers.length === 0
  ) {
    return undefined;
  }
  const tiers = duration.upTo.upcastTiers;
  if (
    duration.earlyEnd !== undefined ||
    duration.permanentIfMaintainedFull !== undefined
  ) {
    return undefined;
  }
  const parsedTiers = tiers.flatMap((tier) => {
    const atSlot = spellSlotLevelFromSurface(tier.atSlot);
    const amount = spellPositiveIntegerFromSurface(tier.amount);
    return spellMechanicsObjectHasOnlyKeys(
      tier,
      MARKED_DAMAGE_RIDER_DURATION_TIER_FIELDS,
    ) &&
      atSlot !== undefined &&
      amount !== undefined
      ? [{ ...tier, atSlot, amount }]
      : [];
  });
  if (parsedTiers.length !== tiers.length) return undefined;
  const orderedTiers = MARKED_DAMAGE_RIDER_DURATION_TIER_TABLES.flatMap(
    (expectedTiers) => {
      const matched = spellMechanicsFixedTableEntries(
        parsedTiers,
        expectedTiers,
        (actual, expected) =>
          Number(actual.atSlot) === expected.atSlot &&
          Number(actual.amount) === expected.amount,
      );
      return matched === undefined ? [] : [matched];
    },
  )[0];
  const upcastTiers =
    orderedTiers === undefined
      ? undefined
      : spellProcedureNonEmpty(orderedTiers);
  return upcastTiers === undefined
    ? undefined
    : {
        unit: duration.upTo.unit,
        amount: baseAmount,
        upcastTiers,
      };
}

function markedDamageAmountIsCanonical(
  amount: DiceAmount,
): amount is MarkedDamageRiderDamageAmount {
  return (
    amount.kind === "fixed" &&
    spellMechanicsObjectHasOnlyKeys(
      amount,
      MARKED_DAMAGE_RIDER_AMOUNT_FIELDS,
    ) &&
    spellMechanicsObjectHasOnlyKeys(
      amount.expr,
      MARKED_DAMAGE_RIDER_DICE_EXPR_FIELDS,
    ) &&
    amount.expr.dice === 1 &&
    amount.expr.dieSize === 6 &&
    amount.expr.flat === undefined &&
    amount.expr.spellcastingMod === undefined &&
    amount.expr.abilityModifier === undefined
  );
}

function markedDamageRiderDamageEffect(
  operation: OngoingEffectOperation | undefined,
): operation is OngoingEffectOperation & {
  readonly effect: Extract<EffectAtom, { readonly kind: "damage" }> & {
    readonly damageType: MarkedDamageRiderDamageType;
    readonly amount: MarkedDamageRiderDamageAmount;
  };
} {
  return (
    operation !== undefined &&
    spellMechanicsObjectHasOnlyKeys(
      operation,
      MARKED_DAMAGE_RIDER_OPERATION_FIELDS,
    ) &&
    operation.predicate === undefined &&
    operation.targetLimit === undefined &&
    operation.usageLimit === undefined &&
    operation.trigger.kind === "on_caster_attack_hit" &&
    spellMechanicsObjectHasOnlyKeys(
      operation.trigger,
      MARKED_DAMAGE_RIDER_TRIGGER_FIELDS,
    ) &&
    operation.effect.kind === "damage" &&
    spellMechanicsObjectHasOnlyKeys(
      operation.effect,
      MARKED_DAMAGE_RIDER_DAMAGE_EFFECT_FIELDS,
    ) &&
    (operation.effect.damageType === "force" ||
      operation.effect.damageType === "necrotic") &&
    markedDamageAmountIsCanonical(operation.effect.amount)
  );
}

function markedDamageRiderAbilityEffect(
  operation: OngoingEffectOperation | undefined,
): operation is OngoingEffectOperation & {
  readonly effect: Extract<
    EffectAtom,
    { readonly kind: "modify_roll_advantage" }
  >;
} {
  return (
    operation !== undefined &&
    spellMechanicsObjectHasOnlyKeys(
      operation,
      MARKED_DAMAGE_RIDER_OPERATION_FIELDS,
    ) &&
    operation.predicate === undefined &&
    operation.targetLimit === undefined &&
    operation.usageLimit === undefined &&
    operation.trigger.kind === "passive" &&
    spellMechanicsObjectHasOnlyKeys(
      operation.trigger,
      MARKED_DAMAGE_RIDER_TRIGGER_FIELDS,
    ) &&
    operation.effect.kind === "modify_roll_advantage" &&
    spellMechanicsObjectHasOnlyKeys(
      operation.effect,
      MARKED_DAMAGE_RIDER_ABILITY_EFFECT_FIELDS,
    )
  );
}

function markedDamageRiderFindingSkillsAreSupported(
  skills: readonly Skill[],
): skills is typeof MARKED_TARGET_FINDING_SKILLS {
  return (
    skills.length === MARKED_TARGET_FINDING_SKILLS.length &&
    skills[0] === MARKED_TARGET_FINDING_SKILLS[0] &&
    skills[1] === MARKED_TARGET_FINDING_SKILLS[1]
  );
}

function markedDamageRiderFindingBehavior(
  effect: Extract<EffectAtom, { readonly kind: "modify_roll_advantage" }>,
): MarkedDamageRiderCastAbilityCheckBehavior | undefined {
  const skillFilter = effect.skillFilter;
  if (
    effect.mode !== "advantage" ||
    (effect.affects ?? "self_roll") !== "self_roll" ||
    !sameStringSet(effect.on, ["ability_check"]) ||
    !Array.isArray(effect.abilityFilter) ||
    effect.abilityFilter.length !== 1 ||
    effect.abilityFilter[0] !== "wis" ||
    !markedDamageRiderAbilityEffectHasNoUnconsumedFields(effect, [
      "abilityFilter",
      "skillFilter",
    ]) ||
    skillFilter?.kind !== "fixed" ||
    !spellMechanicsObjectHasOnlyKeys(
      skillFilter,
      MARKED_DAMAGE_RIDER_SKILL_FILTER_FIELDS,
    ) ||
    !markedDamageRiderFindingSkillsAreSupported(skillFilter.skills)
  ) {
    return undefined;
  }
  return {
    kind: "findingAdvantage",
    ability: "wis",
    skills: skillFilter.skills,
  };
}

function markedDamageRiderChosenAbilityBehavior(
  effect: Extract<EffectAtom, { readonly kind: "modify_roll_advantage" }>,
): MarkedDamageRiderCastAbilityCheckBehavior | undefined {
  const abilityFilter = effect.abilityFilter;
  if (
    effect.mode !== "disadvantage" ||
    (effect.affects ?? "self_roll") !== "self_roll" ||
    !sameStringSet(effect.on, ["ability_check"]) ||
    effect.skillFilter !== undefined ||
    !markedDamageRiderAbilityEffectHasNoUnconsumedFields(effect, [
      "abilityFilter",
    ]) ||
    abilityFilter === undefined ||
    typeof abilityFilter !== "object" ||
    Array.isArray(abilityFilter) ||
    !("kind" in abilityFilter) ||
    abilityFilter.kind !== "hole" ||
    abilityFilter.value === undefined ||
    abilityFilter.value.kind !== "choice" ||
    !spellMechanicsObjectHasOnlyKeys(
      abilityFilter,
      MARKED_DAMAGE_RIDER_ABILITY_FILTER_HOLE_FIELDS,
    ) ||
    !spellMechanicsObjectHasOnlyKeys(
      abilityFilter.value,
      MARKED_DAMAGE_RIDER_ABILITY_CHOICE_FIELDS,
    )
  ) {
    return undefined;
  }
  const options = abilityFilter.value.options;
  return sameStringSet(options, ["str", "dex", "con", "int", "wis", "cha"])
    ? { kind: "chosenAbilityDisadvantage", choices: options }
    : undefined;
}

function markedDamageRiderAbilityEffectHasNoUnconsumedFields(
  effect: Extract<EffectAtom, { readonly kind: "modify_roll_advantage" }>,
  consumedFields: readonly (keyof Extract<
    EffectAtom,
    { readonly kind: "modify_roll_advantage" }
  >)[],
): boolean {
  const consumed = new Set<PropertyKey>(["kind", "mode", "affects", "on"]);
  for (const field of consumedFields) consumed.add(field);
  return (
    effect.abilityCheckTrigger === undefined &&
    effect.spellSourceFilter === undefined &&
    effect.attackerTypeFilter === undefined &&
    effect.conditionFilter === undefined &&
    effect.saveAbilityFilter === undefined &&
    effect.saveSourceFilter === undefined &&
    effect.contextRangeFeet === undefined &&
    effect.attackRollTarget === undefined &&
    effect.count === undefined &&
    effect.expiresOn === undefined &&
    Reflect.ownKeys(effect).every((field) => consumed.has(field))
  );
}

function markedDamageRiderAbilityBehavior(
  effect: Extract<EffectAtom, { readonly kind: "modify_roll_advantage" }>,
): MarkedDamageRiderCastAbilityCheckBehavior | undefined {
  return (
    markedDamageRiderFindingBehavior(effect) ??
    markedDamageRiderChosenAbilityBehavior(effect)
  );
}

function markedDamageRiderMechanicsEvidence(
  mechanics: OngoingEffectMechanics,
): SpellProcedureMechanicsEvidence {
  const consumed: [SpellMechanicsBranchPath, ...SpellMechanicsBranchPath[]] = [
    spellMechanicsHeaderPath("level"),
    spellMechanicsHeaderPath("school"),
    spellMechanicsHeaderPath("range"),
    spellMechanicsHeaderPath("components"),
    spellMechanicsHeaderPath("duration"),
    spellMechanicsHeaderPath("castingTime"),
    spellMechanicsHeaderPath("family"),
    ...spellDurationEvidencePaths(mechanics.duration),
    spellOngoingAttachmentPath(),
    ...mechanics.operations.flatMap((_operation, index) => [
      spellOngoingOperationPath(PositiveInteger(index + 1)),
      spellOngoingOperationEffectPath(PositiveInteger(index + 1)),
    ]),
    ...spellConsumedMaterialEvidencePaths(mechanics.components),
  ];
  return { consumed, unowned: [] };
}

function admitMarkedDamageRiderMechanics(
  source: SpellMechanicsAdmissionSource,
): MarkedDamageRiderMechanicsInspection {
  if (
    !markedDamageRiderSemanticCandidate(source.mechanics) &&
    !markedDamageRiderDistinctiveHeaderFallback(source.mechanics)
  ) {
    return { tag: "notRepresented" };
  }
  if (source.mechanics.family !== "ongoing_effect") {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const attachment = markedDamageRiderAttachmentIsSupported(
    mechanics.attachment,
  )
    ? mechanics.attachment
    : undefined;
  const operations = mechanics.operations;
  const damageOperationIndices = operations.flatMap((operation, index) =>
    markedDamageRiderDamageEffect(operation) ? [index] : [],
  );
  const abilityOperationIndices = operations.flatMap((operation, index) =>
    markedDamageRiderAbilityEffect(operation) ? [index] : [],
  );
  const damageIndex = damageOperationIndices[0] ?? -1;
  const abilityIndex = abilityOperationIndices[0] ?? -1;
  const damageOperation =
    damageIndex < 0 || !markedDamageRiderDamageEffect(operations[damageIndex])
      ? undefined
      : operations[damageIndex];
  const abilityOperation =
    abilityIndex < 0 ? undefined : operations[abilityIndex];
  const durationFacts = markedDamageRiderDurationFacts(mechanics.duration);
  const rangeFeet = spellDefinitionPointRangeFeet(
    source.spellDefinitionRuleFacts.range,
  );
  const abilityBehavior =
    abilityOperation !== undefined &&
    abilityOperation.effect.kind === "modify_roll_advantage"
      ? markedDamageRiderAbilityBehavior(abilityOperation.effect)
      : undefined;
  const issues: MarkedDamageRiderMechanicsIssue[] = [];
  const push = (
    failedFact: MarkedDamageRiderFailedFact,
    path: SpellMechanicsBranchPath,
  ) => issues.push(markedDamageRiderIssue(failedFact, path));

  if (mechanics.level !== 1) push("level", spellMechanicsHeaderPath("level"));
  if (
    !spellMechanicsObjectHasOnlyKeys(mechanics, MARKED_DAMAGE_RIDER_ROOT_FIELDS)
  ) {
    push("operations", spellMechanicsHeaderPath("family"));
  }
  if (mechanics.school !== "divination" && mechanics.school !== "enchantment") {
    push("school", spellMechanicsHeaderPath("school"));
  }
  if (
    mechanics.range.kind !== "point" ||
    mechanics.range.feet !== 90 ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.range,
      MARKED_DAMAGE_RIDER_RANGE_FIELDS,
    )
  ) {
    push("range", spellMechanicsHeaderPath("range"));
  }
  if (rangeFeet === undefined) {
    push("range", spellMechanicsHeaderPath("range"));
  }
  if (
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.components,
      MARKED_DAMAGE_RIDER_COMPONENT_FIELDS,
    ) ||
    mechanics.components.v !== true ||
    (mechanics.components.s !== true && mechanics.components.s !== false) ||
    (mechanics.components.m !== false &&
      typeof mechanics.components.m !== "string")
  ) {
    push("components", spellMechanicsHeaderPath("components"));
  }
  if (
    mechanics.duration.kind !== "concentration" ||
    durationFacts === undefined
  ) {
    push("duration", spellMechanicsHeaderPath("duration"));
    for (const path of spellDurationValueEvidencePaths(mechanics.duration)) {
      push("durationValue", path);
    }
    for (const child of spellDurationChildCoordinates(mechanics.duration)) {
      push(spellDurationChildFailedFact(child), spellDurationChildPath(child));
    }
  }
  if (
    mechanics.castingTime.kind !== "bonus_action" ||
    mechanics.castingTime.trigger !== undefined ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.castingTime,
      MARKED_DAMAGE_RIDER_CASTING_TIME_FIELDS,
    )
  ) {
    push("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  if (attachment === undefined) {
    push("attachment", spellOngoingAttachmentPath());
  }
  if (operations.length !== 2) {
    for (const [index] of operations.entries()) {
      if (index === damageIndex || index === abilityIndex) continue;
      push(
        "operationCount",
        spellOngoingOperationPath(PositiveInteger(index + 1)),
      );
    }
    if (operations.length < 2) {
      push(
        "operationCount",
        spellOngoingOperationPath(PositiveInteger(operations.length + 1)),
      );
    }
  }
  if (damageIndex < 0) {
    push("damageEffect", spellOngoingOperationEffectPath(PositiveInteger(1)));
  }
  if (
    damageOperation === undefined ||
    !markedDamageRiderDamageEffect(damageOperation)
  ) {
    push(
      "damageEffect",
      spellOngoingOperationEffectPath(
        PositiveInteger(Math.max(1, damageIndex + 1)),
      ),
    );
  }
  if (
    damageOperation?.effect.kind === "damage" &&
    !markedDamageAmountIsCanonical(damageOperation.effect.amount)
  ) {
    push(
      "damageAmount",
      spellOngoingOperationEffectPath(PositiveInteger(damageIndex + 1)),
    );
  }
  if (abilityIndex < 0) {
    push("abilityEffect", spellOngoingOperationEffectPath(PositiveInteger(2)));
  }
  if (
    abilityOperation?.effect.kind !== "modify_roll_advantage" ||
    abilityBehavior === undefined
  ) {
    push(
      "abilityScope",
      spellOngoingOperationEffectPath(
        PositiveInteger(Math.max(1, abilityIndex + 1)),
      ),
    );
  }
  const uniqueIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (uniqueIssues !== undefined) {
    const [first, ...rest] = uniqueIssues.map(markedDamageRiderIssueResult);
    return { tag: "unsupported", issues: [first, ...rest] };
  }
  if (
    damageOperation === undefined ||
    abilityBehavior === undefined ||
    durationFacts === undefined ||
    rangeFeet === undefined ||
    attachment === undefined
  ) {
    const issue = markedDamageRiderIssue(
      damageOperation === undefined ? "damageEffect" : "abilityScope",
      damageOperation === undefined
        ? spellOngoingOperationEffectPath(
            PositiveInteger(Math.max(1, damageIndex + 1)),
          )
        : spellOngoingOperationEffectPath(
            PositiveInteger(Math.max(1, abilityIndex + 1)),
          ),
    );
    return {
      tag: "unsupported",
      issues: [markedDamageRiderIssueResult(issue)],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    rangeFeet,
    durationFacts,
    damageAmount: damageOperation.effect.amount,
    damageType: damageOperation.effect.damageType,
    abilityCheckBehavior: abilityBehavior,
    retargetTiming:
      attachment.value.transfer.availability.kind === "after_trigger"
        ? "sameTurn"
        : "laterTurn",
  } satisfies MarkedDamageRiderMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "markedDamageRider",
      facts,
      evidence: markedDamageRiderMechanicsEvidence(mechanics),
      admit: (executionSource, ctx) =>
        admitMarkedDamageRider(executionSource, ctx, facts),
    },
  };
}

function admitMarkedDamageRider(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: MarkedDamageRiderMechanicsFacts,
): readonly MarkedDamageRiderInvocation[] {
  const slotInvocations = ctx.spellCastOptions.flatMap(
    (slot): readonly MarkedDamageRiderInvocation[] => {
      const expiresAt = markedDamageRiderConcentrationExpirationForSlot(
        ctx.actor.combatantId,
        facts.durationFacts,
        slot.spellLevel,
      );
      return Number(slot.spellLevel) < facts.level || expiresAt === null
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "markedDamageRider",
              action: "cast",
              spell,
              actionCost: "bonusAction",
              targeting: { kind: "singleCombatant" },
              damage: {
                expr: facts.damageAmount.expr,
                damageType: facts.damageType,
              },
              abilityCheckBehavior: facts.abilityCheckBehavior,
              retargetTiming: facts.retargetTiming,
              rangeFeet: facts.rangeFeet,
              expiresAt,
            },
          ];
    },
  );
  return slotInvocations;
}

function markedDamageRiderTransferIsAvailableOnTurn(
  transfer: MarkedDamageRiderTransferState,
  battleTurn: SpellAdmissionBattleTurn | undefined,
): boolean {
  if (transfer.kind === "available") {
    return true;
  }
  if (transfer.kind === "awaitingTargetDrop") {
    return false;
  }
  return (
    battleTurn !== undefined &&
    (battleTurn.currentActorId !== transfer.droppedOnTurn.actorId ||
      battleTurn.round !== transfer.droppedOnTurn.round)
  );
}

function markedDamageRiderConcentrationExpirationForSlot(
  actorId: CombatantId,
  duration: MarkedDamageRiderDurationFacts,
  slotLevel: SpellSlotLevel,
): Extract<
  BattleActiveEffectExpiration,
  { readonly kind: "concentration" }
> | null {
  const amount = duration.upcastTiers.reduce(
    (currentAmount, tier) =>
      Number(slotLevel) >= tier.atSlot ? tier.amount : currentAmount,
    duration.amount,
  );
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration({
    unit: "hour",
    amount,
  });
  if (Result.isFailure(durationTicks)) {
    return null;
  }
  return {
    kind: "concentration",
    combatantId: actorId,
    durationTicks: durationTicks.success,
  };
}

function discoverMarkedDamageRiderCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<MarkedDamageRiderInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  if (
    invocation.action === "transfer" &&
    !markedDamageRiderTransferIsAvailable(state, invocation.activeEffect)
  ) {
    return [];
  }
  const targetHole = spellTargetHole(state, actorId, invocation);
  const initialHoles =
    invocation.action === "cast" &&
    invocation.abilityCheckBehavior.kind === "chosenAbilityDisadvantage"
      ? [targetHole, spellAbilityChoiceHole(invocation)]
      : [targetHole];
  return targetHole.choices.length === 0
    ? []
    : [
        {
          subject: {
            tag: "bonusActionSpell" as const,
            actorId,
            procedureRef: invocation.sourceProcedureRef,
            mode: { tag: "cast" as const },
          },
          initialHoles,
        },
      ];
}

function resolveMarkedDamageRider(
  input: MarkedDamageRiderResolveInput,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !fillsBelongToSpellCastHoles(input.input.fills, [
      ATTACK_TARGET_HOLE_ID,
      ...(input.invocation.action === "cast"
        ? [spellAbilityChoiceHoleId(input.invocation)]
        : []),
    ])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Marked damage rider spells use one target fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (input.fillSet.targetId === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellTargetHole(input.input.state, input.actorId, input.invocation),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !spellTargetIsLegal(
      input.input.state,
      input.actorId,
      input.fillSet.targetId,
      input.invocation,
      input.fillSet.targetSpatialFacts,
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Marked spell target must be a combatant within the selected spell's supported range.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (input.invocation.action === "transfer") {
    const activeMark = activeMarkedDamageRiderEffect(
      input.input.state.combatants.get(input.actorId),
      input.invocation.activeEffect.effectRef,
    );
    if (
      activeMark === null ||
      !markedDamageRiderTransferIsAvailable(input.input.state, activeMark)
    ) {
      return invalidResult(
        input.input.state,
        "staleSubject",
        "Marked damage rider spells can move only after the marked target drops to 0 Hit Points and any later-turn timing is satisfied.",
      );
    }
  }
  if (
    input.invocation.action === "cast" &&
    input.invocation.abilityCheckBehavior.kind === "chosenAbilityDisadvantage"
  ) {
    if (input.fillSet.abilityChoice === undefined) {
      return needsHolesResult(input.input.state, input.input.subject, [
        spellAbilityChoiceHole(input.invocation),
      ]);
    }
    /* v8 ignore start -- @preserve -- Parsed fill invariant: a chosen-ability cast is the only admitted invocation whose hole contract can supply an ability choice. */
  } else if (input.fillSet.abilityChoice !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "This marked damage rider spell does not choose an ability.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (input.invocation.action === "cast") {
    const spellCastReactionWindow = maybeOpenSpellCastReactionWindow(
      input,
      [input.fillSet.targetId],
      { kind: "bonusAction" },
      undefined,
    );
    if (spellCastReactionWindow !== null) {
      return spellCastReactionWindow;
    }
  }

  const spent = spendActivationResource(
    input.input.state.currentTurnResources,
    {
      kind: "bonusAction",
    },
  );
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Bonus Action spell is no longer available for the current actor.",
    );
  }
  if (input.invocation.action === "transfer") {
    const nextState = applyMarkedDamageRiderSpellEffect(
      {
        ...input.input.state,
        currentTurnResources:
          clearPendingAttackRollMissToHitReplacementSelection(
            spent.success,
            input.actorId,
          ),
      },
      input.actorId,
      input.fillSet.targetId,
      input.invocation,
      input.fillSet.abilityChoice,
    );
    return {
      tag: "resolved",
      state: nextState,
      snapshot: snapshotBattle(nextState),
    };
  }
  const concentrationBase = breakBattleConcentration(
    input.input.state,
    input.actorId,
  );
  const turnResources = clearPendingAttackRollMissToHitReplacementSelection(
    spent.success,
    input.actorId,
  );
  const resourced = Match.value(input.invocation.resource).pipe(
    Match.when({ tag: "spellAccessFreeCast" }, ({ resourcePoolRef }) =>
      spendSpellAccessFreeCastResource(
        {
          ...concentrationBase,
          currentTurnResources: turnResources,
        },
        input.actorId,
        resourcePoolRef,
        input.invocation,
        input.input.state,
      ),
    ),
    Match.when({ tag: "spellSlot" }, ({ slotLevel }) =>
      spendMarkedDamageRiderSpellSlot(
        {
          ...concentrationBase,
          currentTurnResources: turnResources,
        },
        input.actorId,
        slotLevel,
        input.input.state,
      ),
    ),
    Match.exhaustive,
  );
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const effected = applyMarkedDamageRiderSpellEffect(
    resourced.state,
    input.actorId,
    input.fillSet.targetId,
    input.invocation,
    input.fillSet.abilityChoice,
  );
  const nextState = startSpellEffectConcentration(
    effected,
    input.actorId,
    input.invocation,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function spendMarkedDamageRiderSpellSlot(
  state: BattleState,
  actorId: CombatantId,
  slotLevel: Extract<
    MarkedDamageRiderCastInvocation["resource"],
    { readonly tag: "spellSlot" }
  >["slotLevel"],
  errorState: BattleState,
): SpellCastResourceSpendResult {
  const spellCastState = battleStateAfterTargetActionEarlyEndForActor(
    state,
    actorId,
  );
  const slotTurnResources = markSpellSlotExpendedThisTurn(
    spellCastState.currentTurnResources,
    actorId,
  );
  if (Result.isFailure(slotTurnResources)) {
    return invalidResult(
      errorState,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  return {
    tag: "resolved",
    state: expendSpellSlot(
      {
        ...spellCastState,
        currentTurnResources: slotTurnResources.success,
      },
      actorId,
      slotLevel,
    ),
  };
}

function markedDamageRiderTransferIsAvailable(
  state: BattleState,
  activeMark: SpellMarkedDamageRider,
): boolean {
  return markedDamageRiderTransferIsAvailableOnTurn(activeMark.transfer, {
    currentActorId: currentActorId(state),
    round: state.initiative.round,
  });
}

function applyMarkedDamageRiderSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: BattleExecutableSpellInvocation<MarkedDamageRiderInvocation>,
  selectedAbility?: Ability,
): BattleState {
  const caster = state.combatants.get(actorId);
  /* v8 ignore start -- @preserve -- Resolver invariant: spell procedure dispatch establishes the acting combatant before this effect helper is called. */
  if (caster === undefined) {
    return state;
  }
  /* v8 ignore stop -- @preserve */
  const existingExpiresAt =
    invocation.action === "transfer"
      ? invocation.activeEffect.expiresAt
      : invocation.expiresAt;
  const occurrence =
    invocation.action === "transfer"
      ? {
          effectRef: invocation.activeEffect.effectRef,
          owner: caster,
        }
      : allocateBattleEffectExecutionRefForCreature({ owner: caster });
  const transfer: MarkedDamageRiderTransferState = {
    kind: "awaitingTargetDrop",
    retargetTiming:
      invocation.action === "transfer"
        ? invocation.activeEffect.transfer.retargetTiming
        : invocation.retargetTiming,
  };
  const activeEffect = {
    kind: "spellMarkedDamageRider" as const,
    effectRef: occurrence.effectRef,
    sourceProcedureRef:
      invocation.action === "transfer"
        ? invocation.activeEffect.sourceProcedureRef
        : invocation.sourceProcedureRef,
    sourceCombatantId: actorId,
    targetCombatantId: targetId,
    transfer,
    abilityCheckBehavior:
      invocation.action === "transfer"
        ? invocation.activeEffect.abilityCheckBehavior
        : markedDamageRiderActiveAbilityCheckBehavior(
            invocation.abilityCheckBehavior,
            selectedAbility,
          ),
    damage:
      invocation.action === "transfer"
        ? invocation.activeEffect.damage
        : invocation.damage,
    expiresAt: existingExpiresAt,
  } satisfies SpellMarkedDamageRider;
  const activeEffects = [
    ...caster.activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "spellMarkedDamageRider" &&
          (invocation.action === "transfer"
            ? effect.effectRef === invocation.activeEffect.effectRef
            : effect.sourceProcedureRef === invocation.sourceProcedureRef) &&
          effect.sourceCombatantId === actorId
        ),
    ),
    activeEffect,
  ];
  const owner = occurrence.owner;
  /* v8 ignore start -- @preserve -- Admission invariant: authored spell executions are installed only for character-origin combatants. */
  if (owner.origin.kind !== "character") return state;
  /* v8 ignore stop -- @preserve */
  const transferExecution = {
    procedure: "markedDamageRider" as const,
    action: "transfer" as const,
    activeEffectRef: activeEffect.effectRef,
    activeEffectSourceProcedureRef: activeEffect.sourceProcedureRef,
  } satisfies MarkedDamageRiderTransferSpellProcedureExecution;
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...owner,
      activeEffects,
      origin: {
        ...owner.origin,
        execution: characterExecutionWithMarkedDamageRiderTransfer(
          owner.origin.execution,
          transferExecution,
        ),
      },
    }),
  };
}

function markedDamageRiderActiveAbilityCheckBehavior(
  behavior: MarkedDamageRiderCastInvocation["abilityCheckBehavior"],
  selectedAbility: Ability | undefined,
): Extract<
  BattleActiveEffect,
  { readonly kind: "spellMarkedDamageRider" }
>["abilityCheckBehavior"] {
  return Match.value(behavior).pipe(
    Match.when({ kind: "none" }, () => ({ kind: "none" as const })),
    Match.when({ kind: "findingAdvantage" }, (findingAdvantage) => ({
      kind: "findingAdvantage" as const,
      ability: findingAdvantage.ability,
      skills: findingAdvantage.skills,
    })),
    Match.when({ kind: "chosenAbilityDisadvantage" }, () =>
      /* v8 ignore next -- @preserve -- Resolver invariant: this invocation cannot reach effect application until its required ability-choice hole is filled. */
      selectedAbility === undefined
        ? { kind: "none" as const }
        : { kind: "abilityDisadvantage" as const, ability: selectedAbility },
    ),
    Match.exhaustive,
  );
}

const MarkedDamageRiderInvocationSchema = spellProcedureExecutionSchema(
  Schema.Union([
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("markedDamageRider"),
      action: Schema.Literal("cast"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("bonusAction"),
      targeting: Schema.Struct({ kind: Schema.Literal("singleCombatant") }),
      damage: Schema.Struct({
        expr: DiceExprSchema,
        damageType: DamageTypeSchema,
      }),
      abilityCheckBehavior: Schema.Union([
        Schema.Struct({ kind: Schema.Literal("none") }),
        Schema.Struct({
          kind: Schema.Literal("chosenAbilityDisadvantage"),
          choices: Schema.Array(AbilitySchema),
        }),
        Schema.Struct({
          kind: Schema.Literal("findingAdvantage"),
          ability: Schema.Literal("wis"),
          skills: Schema.Tuple([
            Schema.Literal(MARKED_TARGET_FINDING_SKILLS[0]),
            Schema.Literal(MARKED_TARGET_FINDING_SKILLS[1]),
          ]),
        }),
      ]),
      retargetTiming: Schema.Literals(["sameTurn", "laterTurn"]),
      rangeFeet: MovementFeetSchema,
      expiresAt: BattleActiveEffectExpirationSchema,
    }),
    Schema.Struct({
      procedure: Schema.Literal("markedDamageRider"),
      action: Schema.Literal("transfer"),
      spellRuleFacts: Schema.optionalKey(Schema.Never),
      activeEffectRef: BattleEffectExecutionRef,
      activeEffectSourceProcedureRef: BattleProcedureExecutionRef,
    }),
  ]),
);
export const markedDamageRiderProfile: SpellProcedureDeclaration<
  "markedDamageRider",
  MarkedDamageRiderInvocation
> = {
  procedure: "markedDamageRider",
  executionSchema: MarkedDamageRiderInvocationSchema,
  admitMechanics: admitMarkedDamageRiderMechanics,
  discoverCastAct: discoverMarkedDamageRiderCastAct,
  resolve: resolveMarkedDamageRider,
};
