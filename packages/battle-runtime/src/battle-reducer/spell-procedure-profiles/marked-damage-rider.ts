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
type MarkedDamageRiderFindingDurationFacts = Omit<
  MarkedDamageRiderDurationFacts,
  "upcastTiers"
> & {
  readonly upcastTiers: readonly [
    MarkedDamageRiderDurationTier,
    MarkedDamageRiderDurationTier,
  ];
};
type MarkedDamageRiderChosenAbilityDurationFacts = Omit<
  MarkedDamageRiderDurationFacts,
  "upcastTiers"
> & {
  readonly upcastTiers: readonly [
    MarkedDamageRiderDurationTier,
    MarkedDamageRiderDurationTier,
    MarkedDamageRiderDurationTier,
  ];
};
type MarkedDamageRiderDurationVariantFacts =
  | {
      readonly kind: "findingAdvantage";
      readonly durationFacts: MarkedDamageRiderFindingDurationFacts;
    }
  | {
      readonly kind: "chosenAbilityDisadvantage";
      readonly durationFacts: MarkedDamageRiderChosenAbilityDurationFacts;
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
type MarkedDamageRiderParsedDurationTier = MarkedDamageRiderSourceDurationTier &
  MarkedDamageRiderDurationTier;
type MarkedDamageRiderMatchingDuration = {
  readonly variant: MarkedDamageRiderStructuralVariant["kind"];
  readonly orderedTiers: readonly MarkedDamageRiderParsedDurationTier[];
};
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
type MarkedDamageRiderFindingBehavior = Extract<
  MarkedDamageRiderCastAbilityCheckBehavior,
  { readonly kind: "findingAdvantage" }
>;
type MarkedDamageRiderChosenAbilityBehavior = Extract<
  MarkedDamageRiderCastAbilityCheckBehavior,
  { readonly kind: "chosenAbilityDisadvantage" }
>;
const MARKED_DAMAGE_RIDER_STRUCTURAL_VARIANTS = [
  {
    kind: "findingAdvantage",
    school: "divination",
    somatic: false,
    material: "none",
    damageType: "force",
    retargetTiming: "sameTurn",
    durationTiers: [
      { atSlot: 3, amount: 8 },
      { atSlot: 5, amount: 24 },
    ],
  },
  {
    kind: "chosenAbilityDisadvantage",
    school: "enchantment",
    somatic: true,
    material: "described",
    damageType: "necrotic",
    retargetTiming: "laterTurn",
    durationTiers: [
      { atSlot: 2, amount: 4 },
      { atSlot: 3, amount: 8 },
      { atSlot: 5, amount: 24 },
    ],
  },
] as const satisfies readonly {
  readonly kind:
    | MarkedDamageRiderFindingBehavior["kind"]
    | MarkedDamageRiderChosenAbilityBehavior["kind"];
  readonly school: Extract<
    SpellMechanics["school"],
    "divination" | "enchantment"
  >;
  readonly somatic: boolean;
  readonly material: "none" | "described";
  readonly damageType: MarkedDamageRiderDamageType;
  readonly retargetTiming: MarkedDamageRiderRetargetTiming;
  readonly durationTiers: readonly {
    readonly atSlot: number;
    readonly amount: number;
  }[];
}[];
type MarkedDamageRiderStructuralVariant =
  (typeof MARKED_DAMAGE_RIDER_STRUCTURAL_VARIANTS)[number];

type MarkedDamageRiderCommonMechanicsFacts = SpellDefinitionRuleFacts & {
  readonly rangeFeet: MovementFeet;
  readonly damageAmount: MarkedDamageRiderDamageAmount;
};
type MarkedDamageRiderMechanicsFacts =
  | (MarkedDamageRiderCommonMechanicsFacts & {
      readonly durationFacts: MarkedDamageRiderFindingDurationFacts;
      readonly damageType: Extract<MarkedDamageRiderDamageType, "force">;
      readonly abilityCheckBehavior: MarkedDamageRiderFindingBehavior;
      readonly retargetTiming: Extract<
        MarkedDamageRiderRetargetTiming,
        "sameTurn"
      >;
    })
  | (MarkedDamageRiderCommonMechanicsFacts & {
      readonly durationFacts: MarkedDamageRiderChosenAbilityDurationFacts;
      readonly damageType: Extract<MarkedDamageRiderDamageType, "necrotic">;
      readonly abilityCheckBehavior: MarkedDamageRiderChosenAbilityBehavior;
      readonly retargetTiming: Extract<
        MarkedDamageRiderRetargetTiming,
        "laterTurn"
      >;
    });

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- This module-private tuple is the canonical source for MarkedDamageRiderFailedFact.
const MARKED_DAMAGE_RIDER_FAILED_FACTS = [
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

function markedDamageRiderStructuralVariant(
  school: SpellMechanics["school"],
): MarkedDamageRiderStructuralVariant | undefined {
  return MARKED_DAMAGE_RIDER_STRUCTURAL_VARIANTS.find(
    (variant) => variant.school === school,
  );
}

function markedDamageRiderComponentsMatchVariant(
  components: SpellMechanics["components"],
  variant: MarkedDamageRiderStructuralVariant | undefined,
): boolean {
  if (
    !spellMechanicsObjectHasOnlyKeys(
      components,
      MARKED_DAMAGE_RIDER_COMPONENT_FIELDS,
    ) ||
    components.v !== true
  ) {
    return false;
  }
  const matches = (candidate: MarkedDamageRiderStructuralVariant) =>
    components.s === candidate.somatic &&
    (candidate.material === "none"
      ? components.m === false
      : typeof components.m === "string");
  return variant === undefined
    ? MARKED_DAMAGE_RIDER_STRUCTURAL_VARIANTS.some(matches)
    : matches(variant);
}

function markedDamageRiderAttachmentIsSupported(
  attachment: Attachment | undefined,
): attachment is MarkedDamageRiderAttachment {
  if (attachment?.kind !== "hole") return false;
  if (attachment.value === undefined) return false;
  if (attachment.value.kind !== "mark") return false;
  if (
    !markedDamageRiderAttachmentShapeIsSupported(attachment, attachment.value)
  )
    return false;
  const selection = attachment.value.selection;
  const transfer = attachment.value.transfer;
  return (
    markedDamageRiderSelectionIsSupported(selection) &&
    markedDamageRiderTransferIsSupported(transfer)
  );
}

function markedDamageRiderAttachmentShapeIsSupported(
  attachment: MarkedDamageRiderHoleAttachment,
  value: MarkedDamageRiderMarkAttachmentValue,
): boolean {
  return [
    spellMechanicsObjectHasOnlyKeys(
      attachment,
      MARKED_DAMAGE_RIDER_ATTACHMENT_FIELDS,
    ),
    spellMechanicsObjectHasOnlyKeys(
      value,
      MARKED_DAMAGE_RIDER_MARK_VALUE_FIELDS,
    ),
  ].every(Boolean);
}

function markedDamageRiderSelectionIsSupported(
  selection: MarkedDamageRiderMarkAttachmentValue["selection"],
): boolean {
  if (selection === undefined) return false;
  return [
    spellMechanicsObjectHasOnlyKeys(
      selection,
      MARKED_DAMAGE_RIDER_SELECTION_FIELDS,
    ),
    selection.mode === "one" && selection.targetKinds !== undefined,
    selection.targetKinds !== undefined && selection.targetKinds.length === 1,
    selection.targetKinds !== undefined &&
      selection.targetKinds[0] === "creature",
  ].every(Boolean);
}

function markedDamageRiderTransferIsSupported(
  transfer: MarkedDamageRiderMarkAttachmentValue["transfer"],
): transfer is MarkedDamageRiderMarkTransfer {
  if (transfer === undefined) return false;
  if (transfer.onEvent === undefined) return false;
  if (transfer.availability === undefined) return false;
  if (transfer.cost === undefined) return false;
  return [
    spellMechanicsObjectHasOnlyKeys(
      transfer,
      MARKED_DAMAGE_RIDER_TRANSFER_FIELDS,
    ),
    spellMechanicsObjectHasOnlyKeys(
      transfer.onEvent,
      MARKED_DAMAGE_RIDER_TRANSFER_EVENT_FIELDS,
    ),
    spellMechanicsObjectHasOnlyKeys(
      transfer.availability,
      MARKED_DAMAGE_RIDER_TRANSFER_AVAILABILITY_FIELDS,
    ),
    spellMechanicsObjectHasOnlyKeys(
      transfer.cost,
      MARKED_DAMAGE_RIDER_TRANSFER_COST_FIELDS,
    ),
    transfer.onEvent.kind === "target_drops_to_0_hp",
    transfer.cost.kind === "bonus_action",
    transfer.availability.kind === "after_trigger" ||
      transfer.availability.kind === "later_turn_after_trigger",
  ].every(Boolean);
}

function markedDamageRiderRetargetTiming(
  attachment: MarkedDamageRiderAttachment | undefined,
): MarkedDamageRiderRetargetTiming | undefined {
  return attachment === undefined
    ? undefined
    : attachment.value.transfer.availability.kind === "after_trigger"
      ? "sameTurn"
      : "laterTurn";
}

function markedDamageRiderRetargetTimingMatchesVariant(
  timing: MarkedDamageRiderRetargetTiming | undefined,
  variant: MarkedDamageRiderStructuralVariant | undefined,
): boolean {
  if (timing === undefined) return false;
  return variant === undefined || timing === variant.retargetTiming;
}

function markedDamageRiderDurationVariantFacts(
  duration: OngoingEffectMechanics["duration"],
): MarkedDamageRiderDurationVariantFacts | undefined {
  if (!markedDamageRiderDurationEnvelopeIsSupported(duration)) return undefined;
  const baseAmount = spellPositiveIntegerFromSurface(duration.upTo.amount);
  if (baseAmount === undefined) return undefined;
  const tiers = duration.upTo.upcastTiers;
  const parsedTiers = tiers.flatMap(markedDamageRiderParsedDurationTier);
  if (parsedTiers.length !== tiers.length) return undefined;
  const matchingDuration = markedDamageRiderMatchingDuration(parsedTiers);
  if (matchingDuration === undefined) return undefined;
  return markedDamageRiderDurationFacts(
    duration.upTo.unit,
    baseAmount,
    matchingDuration,
  );
}

function markedDamageRiderParsedDurationTier(
  tier: MarkedDamageRiderSourceDurationTier,
): readonly MarkedDamageRiderParsedDurationTier[] {
  const atSlot = spellSlotLevelFromSurface(tier.atSlot);
  const amount = spellPositiveIntegerFromSurface(tier.amount);
  if (
    !spellMechanicsObjectHasOnlyKeys(
      tier,
      MARKED_DAMAGE_RIDER_DURATION_TIER_FIELDS,
    ) ||
    atSlot === undefined ||
    amount === undefined
  )
    return [];
  return [{ ...tier, atSlot, amount }];
}

function markedDamageRiderMatchingDuration(
  tiers: readonly MarkedDamageRiderParsedDurationTier[],
): MarkedDamageRiderMatchingDuration | undefined {
  return MARKED_DAMAGE_RIDER_STRUCTURAL_VARIANTS.flatMap((variant) => {
    const orderedTiers = spellMechanicsFixedTableEntries(
      tiers,
      variant.durationTiers,
      (actual, expected) =>
        Number(actual.atSlot) === expected.atSlot &&
        Number(actual.amount) === expected.amount,
    );
    return orderedTiers === undefined
      ? []
      : [{ variant: variant.kind, orderedTiers }];
  })[0];
}

function markedDamageRiderDurationFacts(
  unit: "hour",
  amount: PositiveInteger,
  matching: MarkedDamageRiderMatchingDuration,
): MarkedDamageRiderDurationVariantFacts | undefined {
  if (matching.variant === "findingAdvantage") {
    const [firstTier, secondTier] = matching.orderedTiers;
    return firstTier === undefined || secondTier === undefined
      ? undefined
      : {
          kind: matching.variant,
          durationFacts: { unit, amount, upcastTiers: [firstTier, secondTier] },
        };
  }
  const [firstTier, secondTier, thirdTier] = matching.orderedTiers;
  return firstTier === undefined ||
    secondTier === undefined ||
    thirdTier === undefined
    ? undefined
    : {
        kind: matching.variant,
        durationFacts: {
          unit,
          amount,
          upcastTiers: [firstTier, secondTier, thirdTier],
        },
      };
}

type MarkedDamageRiderDurationEnvelope = MarkedDamageRiderDuration & {
  readonly upTo: MarkedDamageRiderDuration["upTo"] & {
    readonly unit: "hour";
    readonly upcastTiers: ReadonlyNonEmptyArray<MarkedDamageRiderSourceDurationTier>;
  };
};

function markedDamageRiderDurationEnvelopeIsSupported(
  duration: OngoingEffectMechanics["duration"],
): duration is MarkedDamageRiderDurationEnvelope {
  if (duration.kind !== "concentration") return false;
  if (duration.upTo.upcastTiers === undefined) return false;
  if (duration.upTo.upcastTiers.length === 0) return false;
  return [
    spellMechanicsObjectHasOnlyKeys(
      duration,
      MARKED_DAMAGE_RIDER_DURATION_FIELDS,
    ),
    spellMechanicsObjectHasOnlyKeys(
      duration.upTo,
      MARKED_DAMAGE_RIDER_DURATION_VALUE_FIELDS,
    ),
    duration.upTo.unit === "hour",
    duration.upTo.amount === 1,
    duration.earlyEnd === undefined,
    duration.permanentIfMaintainedFull === undefined,
  ].every(Boolean);
}

function markedDamageAmountIsCanonical(
  amount: DiceAmount,
): amount is MarkedDamageRiderDamageAmount {
  if (amount.kind !== "fixed") return false;
  return [
    spellMechanicsObjectHasOnlyKeys(amount, MARKED_DAMAGE_RIDER_AMOUNT_FIELDS),
    spellMechanicsObjectHasOnlyKeys(
      amount.expr,
      MARKED_DAMAGE_RIDER_DICE_EXPR_FIELDS,
    ),
    amount.expr.dice === 1,
    amount.expr.dieSize === 6,
    amount.expr.flat === undefined,
    amount.expr.spellcastingMod === undefined,
    amount.expr.abilityModifier === undefined,
  ].every(Boolean);
}

function markedDamageRiderOperationShellIsSupported(
  operation: OngoingEffectOperation,
): boolean {
  return [
    spellMechanicsObjectHasOnlyKeys(
      operation,
      MARKED_DAMAGE_RIDER_OPERATION_FIELDS,
    ),
    operation.predicate === undefined,
    operation.targetLimit === undefined,
    operation.usageLimit === undefined,
    spellMechanicsObjectHasOnlyKeys(
      operation.trigger,
      MARKED_DAMAGE_RIDER_TRIGGER_FIELDS,
    ),
  ].every(Boolean);
}

function markedDamageRiderDamageEffect(
  operation: OngoingEffectOperation | undefined,
): operation is OngoingEffectOperation & {
  readonly effect: Extract<EffectAtom, { readonly kind: "damage" }> & {
    readonly damageType: MarkedDamageRiderDamageType;
    readonly amount: MarkedDamageRiderDamageAmount;
  };
} {
  if (operation === undefined) return false;
  if (operation.trigger.kind !== "on_caster_attack_hit") return false;
  if (operation.effect.kind !== "damage") return false;
  return [
    markedDamageRiderOperationShellIsSupported(operation),
    spellMechanicsObjectHasOnlyKeys(
      operation.effect,
      MARKED_DAMAGE_RIDER_DAMAGE_EFFECT_FIELDS,
    ),
    operation.effect.damageType === "force" ||
      operation.effect.damageType === "necrotic",
    markedDamageAmountIsCanonical(operation.effect.amount),
  ].every(Boolean);
}

function markedDamageRiderAbilityEffect(
  operation: OngoingEffectOperation | undefined,
): operation is OngoingEffectOperation & {
  readonly effect: Extract<
    EffectAtom,
    { readonly kind: "modify_roll_advantage" }
  >;
} {
  if (operation === undefined) return false;
  if (operation.trigger.kind !== "passive") return false;
  if (operation.effect.kind !== "modify_roll_advantage") return false;
  return [
    markedDamageRiderOperationShellIsSupported(operation),
    spellMechanicsObjectHasOnlyKeys(
      operation.effect,
      MARKED_DAMAGE_RIDER_ABILITY_EFFECT_FIELDS,
    ),
  ].every(Boolean);
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
): MarkedDamageRiderFindingBehavior | undefined {
  const skillFilter = effect.skillFilter;
  if (skillFilter?.kind !== "fixed") return undefined;
  if (!Array.isArray(effect.abilityFilter)) return undefined;
  if (
    ![
      effect.mode === "advantage",
      (effect.affects ?? "self_roll") === "self_roll",
      sameStringSet(effect.on, ["ability_check"]),
      effect.abilityFilter.length === 1,
      effect.abilityFilter[0] === "wis",
      markedDamageRiderAbilityEffectHasNoUnconsumedFields(effect, [
        "abilityFilter",
        "skillFilter",
      ]),
      spellMechanicsObjectHasOnlyKeys(
        skillFilter,
        MARKED_DAMAGE_RIDER_SKILL_FILTER_FIELDS,
      ),
    ].every(Boolean)
  )
    return undefined;
  if (!markedDamageRiderFindingSkillsAreSupported(skillFilter.skills))
    return undefined;
  return {
    kind: "findingAdvantage",
    ability: "wis",
    skills: skillFilter.skills,
  };
}

function markedDamageRiderChosenAbilityBehavior(
  effect: Extract<EffectAtom, { readonly kind: "modify_roll_advantage" }>,
): MarkedDamageRiderChosenAbilityBehavior | undefined {
  const abilityFilter = markedDamageRiderAbilityChoiceFilter(
    effect.abilityFilter,
  );
  if (abilityFilter === undefined) return undefined;
  if (
    ![
      effect.mode === "disadvantage",
      (effect.affects ?? "self_roll") === "self_roll",
      sameStringSet(effect.on, ["ability_check"]),
      effect.skillFilter === undefined,
      markedDamageRiderAbilityEffectHasNoUnconsumedFields(effect, [
        "abilityFilter",
      ]),
    ].every(Boolean)
  )
    return undefined;
  const options = abilityFilter.value.options;
  return sameStringSet(options, ["str", "dex", "con", "int", "wis", "cha"])
    ? { kind: "chosenAbilityDisadvantage", choices: options }
    : undefined;
}

function markedDamageRiderAbilityChoiceFilter(
  abilityFilter: MarkedDamageRiderAbilityEffect["abilityFilter"],
):
  | (MarkedDamageRiderAbilityFilterHole & {
      readonly value: MarkedDamageRiderAbilityChoice;
    })
  | undefined {
  if (!markedDamageRiderObjectValue(abilityFilter)) return undefined;
  if (!("kind" in abilityFilter)) return undefined;
  if (abilityFilter.kind !== "hole") return undefined;
  if (abilityFilter.value === undefined) return undefined;
  if (abilityFilter.value.kind !== "choice") return undefined;
  return [
    spellMechanicsObjectHasOnlyKeys(
      abilityFilter,
      MARKED_DAMAGE_RIDER_ABILITY_FILTER_HOLE_FIELDS,
    ),
    spellMechanicsObjectHasOnlyKeys(
      abilityFilter.value,
      MARKED_DAMAGE_RIDER_ABILITY_CHOICE_FIELDS,
    ),
  ].every(Boolean)
    ? abilityFilter
    : undefined;
}

function markedDamageRiderObjectValue(
  value: unknown,
): value is Record<PropertyKey, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
  return [
    effect.abilityCheckTrigger === undefined,
    effect.spellSourceFilter === undefined,
    effect.attackerTypeFilter === undefined,
    effect.conditionFilter === undefined,
    effect.saveAbilityFilter === undefined,
    effect.saveSourceFilter === undefined,
    effect.contextRangeFeet === undefined,
    effect.attackRollTarget === undefined,
    effect.count === undefined,
    effect.expiresOn === undefined,
    Reflect.ownKeys(effect).every((field) => consumed.has(field)),
  ].every(Boolean);
}

function markedDamageRiderAbilityBehavior(
  effect: Extract<EffectAtom, { readonly kind: "modify_roll_advantage" }>,
): MarkedDamageRiderCastAbilityCheckBehavior | undefined {
  return (
    markedDamageRiderFindingBehavior(effect) ??
    markedDamageRiderChosenAbilityBehavior(effect)
  );
}

function markedDamageRiderAbilityBehaviorMatchesVariant(
  behavior: MarkedDamageRiderCastAbilityCheckBehavior | undefined,
  variant: MarkedDamageRiderStructuralVariant | undefined,
): boolean {
  if (behavior === undefined) return false;
  return variant === undefined || behavior.kind === variant.kind;
}

function markedDamageRiderDamageTypeMatchesVariant(
  damageType: MarkedDamageRiderDamageType | undefined,
  variant: MarkedDamageRiderStructuralVariant | undefined,
): boolean {
  if (damageType === undefined) return false;
  return variant === undefined || damageType === variant.damageType;
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

type MarkedDamageRiderIssuePush = (
  failedFact: MarkedDamageRiderFailedFact,
  path: SpellMechanicsBranchPath,
) => void;

type MarkedDamageRiderAdmissionProjection = {
  readonly structuralVariant: MarkedDamageRiderStructuralVariant | undefined;
  readonly attachment: MarkedDamageRiderAttachment | undefined;
  readonly damageIndex: number;
  readonly abilityIndex: number;
  readonly damageOperation:
    | (OngoingEffectOperation & {
        readonly effect: MarkedDamageRiderDamageEffect & {
          readonly damageType: MarkedDamageRiderDamageType;
          readonly amount: MarkedDamageRiderDamageAmount;
        };
      })
    | undefined;
  readonly abilityOperation: OngoingEffectOperation | undefined;
  readonly durationVariantFacts:
    | MarkedDamageRiderDurationVariantFacts
    | undefined;
  readonly rangeFeet: MovementFeet | undefined;
  readonly abilityBehavior:
    | MarkedDamageRiderCastAbilityCheckBehavior
    | undefined;
  readonly retargetTiming: MarkedDamageRiderRetargetTiming | undefined;
};

type CompleteMarkedDamageRiderAdmissionProjection =
  MarkedDamageRiderAdmissionProjection & {
    readonly [Field in Exclude<
      keyof MarkedDamageRiderAdmissionProjection,
      "abilityOperation"
    >]-?: NonNullable<MarkedDamageRiderAdmissionProjection[Field]>;
  };

function markedDamageRiderOperationIndices(
  mechanics: OngoingEffectMechanics,
  matches: (operation: OngoingEffectOperation) => unknown,
): readonly number[] {
  return mechanics.operations.flatMap((operation, index) =>
    matches(operation) ? [index] : [],
  );
}

function markedDamageRiderOperationAt(
  mechanics: OngoingEffectMechanics,
  index: number,
): OngoingEffectOperation | undefined {
  return index < 0 ? undefined : mechanics.operations[index];
}

function markedDamageRiderAbilityBehaviorForOperation(
  operation: OngoingEffectOperation | undefined,
): MarkedDamageRiderCastAbilityCheckBehavior | undefined {
  return operation?.effect.kind === "modify_roll_advantage"
    ? markedDamageRiderAbilityBehavior(operation.effect)
    : undefined;
}

function markedDamageRiderAdmissionProjection(
  source: SpellMechanicsAdmissionSource,
  mechanics: OngoingEffectMechanics,
): MarkedDamageRiderAdmissionProjection {
  const structuralVariant = markedDamageRiderStructuralVariant(
    mechanics.school,
  );
  const attachment = markedDamageRiderAttachmentIsSupported(
    mechanics.attachment,
  )
    ? mechanics.attachment
    : undefined;
  const damageOperationIndices = markedDamageRiderOperationIndices(
    mechanics,
    markedDamageRiderDamageEffect,
  );
  const abilityOperationIndices = markedDamageRiderOperationIndices(
    mechanics,
    markedDamageRiderAbilityEffect,
  );
  const damageIndex = damageOperationIndices[0] ?? -1;
  const abilityIndex = abilityOperationIndices[0] ?? -1;
  const damageCandidate = markedDamageRiderOperationAt(mechanics, damageIndex);
  const damageOperation = markedDamageRiderDamageEffect(damageCandidate)
    ? damageCandidate
    : undefined;
  const abilityOperation = markedDamageRiderOperationAt(
    mechanics,
    abilityIndex,
  );
  const abilityBehavior =
    markedDamageRiderAbilityBehaviorForOperation(abilityOperation);
  return {
    structuralVariant,
    attachment,
    damageIndex,
    abilityIndex,
    damageOperation,
    abilityOperation,
    durationVariantFacts: markedDamageRiderDurationVariantFacts(
      mechanics.duration,
    ),
    rangeFeet: spellDefinitionPointRangeFeet(
      source.spellDefinitionRuleFacts.range,
    ),
    abilityBehavior,
    retargetTiming: markedDamageRiderRetargetTiming(attachment),
  };
}

function markedDamageRiderRangeIsSupported(
  range: OngoingEffectMechanics["range"],
): boolean {
  return (
    range.kind === "point" &&
    range.feet === 90 &&
    spellMechanicsObjectHasOnlyKeys(range, MARKED_DAMAGE_RIDER_RANGE_FIELDS)
  );
}

function markedDamageRiderCastingTimeIsSupported(
  castingTime: OngoingEffectMechanics["castingTime"],
): boolean {
  return (
    castingTime.kind === "bonus_action" &&
    castingTime.trigger === undefined &&
    spellMechanicsObjectHasOnlyKeys(
      castingTime,
      MARKED_DAMAGE_RIDER_CASTING_TIME_FIELDS,
    )
  );
}

function appendMarkedDamageRiderDefinitionIssues(
  mechanics: OngoingEffectMechanics,
  projection: MarkedDamageRiderAdmissionProjection,
  push: MarkedDamageRiderIssuePush,
): void {
  if (mechanics.level !== 1) push("level", spellMechanicsHeaderPath("level"));
  if (
    !spellMechanicsObjectHasOnlyKeys(mechanics, MARKED_DAMAGE_RIDER_ROOT_FIELDS)
  ) {
    push("operations", spellMechanicsHeaderPath("family"));
  }
  if (markedDamageRiderStructuralVariant(mechanics.school) === undefined) {
    push("school", spellMechanicsHeaderPath("school"));
  }
  if (!markedDamageRiderRangeIsSupported(mechanics.range)) {
    push("range", spellMechanicsHeaderPath("range"));
  }
  if (projection.rangeFeet === undefined) {
    push("range", spellMechanicsHeaderPath("range"));
  }
  if (
    !markedDamageRiderComponentsMatchVariant(
      mechanics.components,
      projection.structuralVariant,
    )
  ) {
    push("components", spellMechanicsHeaderPath("components"));
  }
}

function appendMarkedDamageRiderDurationIssues(
  mechanics: OngoingEffectMechanics,
  projection: MarkedDamageRiderAdmissionProjection,
  push: MarkedDamageRiderIssuePush,
): void {
  const durationMismatch =
    mechanics.duration.kind !== "concentration" ||
    projection.durationVariantFacts === undefined ||
    (projection.structuralVariant !== undefined &&
      projection.durationVariantFacts.kind !==
        projection.structuralVariant.kind);
  if (!durationMismatch) return;
  push("duration", spellMechanicsHeaderPath("duration"));
  for (const path of spellDurationValueEvidencePaths(mechanics.duration)) {
    push("durationValue", path);
  }
  for (const child of spellDurationChildCoordinates(mechanics.duration)) {
    push(spellDurationChildFailedFact(child), spellDurationChildPath(child));
  }
}

function appendMarkedDamageRiderLifecycleIssues(
  mechanics: OngoingEffectMechanics,
  projection: MarkedDamageRiderAdmissionProjection,
  push: MarkedDamageRiderIssuePush,
): void {
  appendMarkedDamageRiderDurationIssues(mechanics, projection, push);
  if (!markedDamageRiderCastingTimeIsSupported(mechanics.castingTime)) {
    push("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  if (
    projection.attachment === undefined ||
    !markedDamageRiderRetargetTimingMatchesVariant(
      projection.retargetTiming,
      projection.structuralVariant,
    )
  ) {
    push("attachment", spellOngoingAttachmentPath());
  }
}

function appendMarkedDamageRiderOperationCountIssues(
  operations: readonly OngoingEffectOperation[],
  projection: MarkedDamageRiderAdmissionProjection,
  push: MarkedDamageRiderIssuePush,
): void {
  if (operations.length === 2) return;
  for (const [index] of operations.entries()) {
    if (index === projection.damageIndex || index === projection.abilityIndex)
      continue;
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

function appendMarkedDamageRiderDamageIssues(
  projection: MarkedDamageRiderAdmissionProjection,
  push: MarkedDamageRiderIssuePush,
): void {
  if (projection.damageIndex < 0) {
    push("damageEffect", spellOngoingOperationEffectPath(PositiveInteger(1)));
  }
  if (
    projection.damageOperation === undefined ||
    !markedDamageRiderDamageTypeMatchesVariant(
      projection.damageOperation.effect.damageType,
      projection.structuralVariant,
    )
  ) {
    push(
      "damageEffect",
      spellOngoingOperationEffectPath(
        PositiveInteger(Math.max(1, projection.damageIndex + 1)),
      ),
    );
  }
  if (
    projection.damageOperation !== undefined &&
    !markedDamageAmountIsCanonical(projection.damageOperation.effect.amount)
  ) {
    push(
      "damageAmount",
      spellOngoingOperationEffectPath(
        PositiveInteger(projection.damageIndex + 1),
      ),
    );
  }
}

function appendMarkedDamageRiderAbilityIssues(
  projection: MarkedDamageRiderAdmissionProjection,
  push: MarkedDamageRiderIssuePush,
): void {
  if (projection.abilityIndex < 0) {
    push("abilityEffect", spellOngoingOperationEffectPath(PositiveInteger(2)));
  }
  if (
    projection.abilityOperation?.effect.kind !== "modify_roll_advantage" ||
    !markedDamageRiderAbilityBehaviorMatchesVariant(
      projection.abilityBehavior,
      projection.structuralVariant,
    )
  ) {
    push(
      "abilityScope",
      spellOngoingOperationEffectPath(
        PositiveInteger(Math.max(1, projection.abilityIndex + 1)),
      ),
    );
  }
}

function markedDamageRiderProjectionIsComplete(
  projection: MarkedDamageRiderAdmissionProjection,
): projection is CompleteMarkedDamageRiderAdmissionProjection {
  return [
    projection.damageOperation !== undefined,
    projection.abilityBehavior !== undefined,
    projection.durationVariantFacts !== undefined,
    projection.rangeFeet !== undefined,
    projection.attachment !== undefined,
    projection.structuralVariant !== undefined,
    projection.retargetTiming !== undefined,
  ].every(Boolean);
}

function markedDamageRiderFacts(
  source: SpellMechanicsAdmissionSource,
  projection: CompleteMarkedDamageRiderAdmissionProjection,
): MarkedDamageRiderMechanicsFacts | undefined {
  if (projection.structuralVariant.kind === "findingAdvantage") {
    return markedDamageRiderFindingFacts(
      source,
      projection,
      projection.structuralVariant,
    );
  }
  return markedDamageRiderChosenAbilityFacts(
    source,
    projection,
    projection.structuralVariant,
  );
}

function markedDamageRiderFindingFacts(
  source: SpellMechanicsAdmissionSource,
  projection: CompleteMarkedDamageRiderAdmissionProjection,
  variant: Extract<
    MarkedDamageRiderStructuralVariant,
    { readonly kind: "findingAdvantage" }
  >,
): MarkedDamageRiderMechanicsFacts | undefined {
  if (projection.durationVariantFacts.kind !== variant.kind) return undefined;
  if (projection.damageOperation.effect.damageType !== variant.damageType)
    return undefined;
  if (projection.abilityBehavior.kind !== variant.kind) return undefined;
  if (projection.retargetTiming !== variant.retargetTiming) return undefined;
  return {
    ...source.spellDefinitionRuleFacts,
    rangeFeet: projection.rangeFeet,
    durationFacts: projection.durationVariantFacts.durationFacts,
    damageAmount: projection.damageOperation.effect.amount,
    damageType: projection.damageOperation.effect.damageType,
    abilityCheckBehavior: projection.abilityBehavior,
    retargetTiming: projection.retargetTiming,
  };
}

function markedDamageRiderChosenAbilityFacts(
  source: SpellMechanicsAdmissionSource,
  projection: CompleteMarkedDamageRiderAdmissionProjection,
  variant: Extract<
    MarkedDamageRiderStructuralVariant,
    { readonly kind: "chosenAbilityDisadvantage" }
  >,
): MarkedDamageRiderMechanicsFacts | undefined {
  if (projection.durationVariantFacts.kind !== variant.kind) return undefined;
  if (projection.damageOperation.effect.damageType !== variant.damageType)
    return undefined;
  if (projection.abilityBehavior.kind !== variant.kind) return undefined;
  if (projection.retargetTiming !== variant.retargetTiming) return undefined;
  return {
    ...source.spellDefinitionRuleFacts,
    rangeFeet: projection.rangeFeet,
    durationFacts: projection.durationVariantFacts.durationFacts,
    damageAmount: projection.damageOperation.effect.amount,
    damageType: projection.damageOperation.effect.damageType,
    abilityCheckBehavior: projection.abilityBehavior,
    retargetTiming: projection.retargetTiming,
  };
}

function markedDamageRiderIncompleteProjectionIssue(
  projection: MarkedDamageRiderAdmissionProjection,
): MarkedDamageRiderMechanicsIssue {
  if (projection.damageOperation === undefined) {
    return markedDamageRiderIssue(
      "damageEffect",
      spellOngoingOperationEffectPath(
        PositiveInteger(Math.max(1, projection.damageIndex + 1)),
      ),
    );
  }
  return markedDamageRiderIssue(
    "abilityScope",
    spellOngoingOperationEffectPath(
      PositiveInteger(Math.max(1, projection.abilityIndex + 1)),
    ),
  );
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
  const projection = markedDamageRiderAdmissionProjection(source, mechanics);
  const issues: MarkedDamageRiderMechanicsIssue[] = [];
  const push: MarkedDamageRiderIssuePush = (
    failedFact: MarkedDamageRiderFailedFact,
    path: SpellMechanicsBranchPath,
  ) => issues.push(markedDamageRiderIssue(failedFact, path));
  appendMarkedDamageRiderDefinitionIssues(mechanics, projection, push);
  appendMarkedDamageRiderLifecycleIssues(mechanics, projection, push);
  appendMarkedDamageRiderOperationCountIssues(
    mechanics.operations,
    projection,
    push,
  );
  appendMarkedDamageRiderDamageIssues(projection, push);
  appendMarkedDamageRiderAbilityIssues(projection, push);
  const uniqueIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (uniqueIssues !== undefined) {
    const [first, ...rest] = uniqueIssues.map(markedDamageRiderIssueResult);
    return { tag: "unsupported", issues: [first, ...rest] };
  }
  if (!markedDamageRiderProjectionIsComplete(projection)) {
    return {
      tag: "unsupported",
      issues: [
        markedDamageRiderIssueResult(
          markedDamageRiderIncompleteProjectionIssue(projection),
        ),
      ],
    };
  }
  const facts = markedDamageRiderFacts(source, projection);
  if (facts === undefined) {
    return {
      tag: "unsupported",
      issues: [
        markedDamageRiderIssueResult({
          failedFact: "abilityScope",
          mechanicsPath: spellOngoingOperationEffectPath(
            PositiveInteger(Math.max(1, projection.abilityIndex + 1)),
          ),
        }),
      ],
    };
  }
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
