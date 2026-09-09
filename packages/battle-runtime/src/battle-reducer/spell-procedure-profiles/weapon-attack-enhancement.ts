import { maybeOpenConfiguredSpellCastReactionWindow } from "../spell-active-effect-resolution.ts";
import type {
  BattleSpellAdmissionSource,
  BattleSpellExecutionSource,
} from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magic-weapon-enhancement
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
//
// The weaponAttackDamageEnhancement Spell Procedure Profile: a Bonus Action spell that
// attaches a timed magic-weapon enhancement to an exact holder-plus-item weapon
// identity supplied by the table-owned fill boundary.

import {
  PositiveInteger,
  type ReadonlyNonEmptyArray,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import type {
  Attachment,
  EffectAtom,
  OngoingEffectMechanicsOperation,
  SpellMechanics,
} from "@dnd/surface/surface/types";

import {
  WEAPON_ATTACK_DAMAGE_ENHANCEMENT_BONUSES,
  type BattleActDiscoveryCandidate,
  type BattleWeaponEnhancementTargetItemFact,
  type BattleResolutionResult,
  type BattleState,
  type WeaponAttackDamageEnhancementBonus,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import type { CombatantId } from "../../identity.ts";
import { battleWeaponItemHasWeaponAttackDamageEnhancement } from "../attack-damage-apply.ts";
import { isCharacterBattleCreatureState } from "../creature-state-execution.ts";
import { activeDruidWildShapeEffect } from "../druid-wild-shape.ts";

import { needsHolesResult } from "../needs-holes-result.ts";
import { invalidResult, resolutionFromStateResult } from "../result-helpers.ts";
import { replaceTargetActiveEffect } from "../active-effect-replacement.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { loadoutHasUsableHeldWeaponItem } from "../wild-shape-equipment.ts";
import { characterEffectiveLoadout } from "../battle-object-lifecycle.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import {
  weaponAttackDamageEnhancementTargetItemHole,
  weaponAttackDamageEnhancementTargetItemHoleId,
} from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import { spellInvocationResourceForCastOption } from "./profile.ts";
import {
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  spellDurationChildCoordinates,
  spellDurationChildFailedFact,
  spellDurationChildPath,
  spellDurationEvidencePaths,
  spellDurationValueEvidencePaths,
  spellDurationTicksFromCanonicalValue,
  isSpellCanonicalDurationValue,
  spellMechanicsFixedTableEntries,
  spellMechanicsObjectHasOnlyKeys,
  spellProcedureNonEmpty,
  spellSlotLevelFromSurface,
  spellUniqueMechanicsIssues,
  type SpellCanonicalDurationValue,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
  spellOngoingAttachmentPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";

type WeaponAttackDamageEnhancementInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "weaponAttackDamageEnhancement" }
>;

type WeaponAttackDamageEnhancementBonusSource = Extract<
  EffectAtom,
  { readonly kind: "grant_weapon_attack_enhancement" }
>["bonus"];
type WeaponAttackDamageEnhancementThresholdBonusSource = Extract<
  WeaponAttackDamageEnhancementBonusSource,
  { readonly kind: "threshold_tiers" }
>;
type WeaponAttackDamageEnhancementBonusTierSource =
  WeaponAttackDamageEnhancementThresholdBonusSource["tiers"][number];
type WeaponAttackDamageEnhancementBonusFacts = Omit<
  WeaponAttackDamageEnhancementThresholdBonusSource,
  "axis" | "base" | "sign" | "tiers"
> & {
  readonly axis: "slot";
  readonly base: WeaponAttackDamageEnhancementBonus;
  readonly sign: "+";
  readonly tiers: ReadonlyNonEmptyArray<
    Omit<WeaponAttackDamageEnhancementBonusTierSource, "atLevel" | "value"> & {
      readonly atLevel: SpellSlotLevel;
      readonly value: WeaponAttackDamageEnhancementBonus;
    }
  >;
};
type OngoingEffectMechanics = Extract<
  BattleSpellAdmissionSource["mechanics"],
  { readonly family: "ongoing_effect" }
>;
type WeaponAttackEnhancementAttachment = Extract<
  Attachment,
  { readonly kind: "hole" }
>;
type WeaponAttackEnhancementObjectAttachmentValue = Extract<
  WeaponAttackEnhancementAttachment["value"],
  { readonly kind: "object" }
>;
type WeaponAttackEnhancementObjectFilter = NonNullable<
  WeaponAttackEnhancementObjectAttachmentValue["filter"]
>;
type WeaponAttackEnhancementDuration = Extract<
  SpellMechanics["duration"],
  { readonly kind: "timed" }
>;
type WeaponAttackEnhancementDurationEnd = NonNullable<
  WeaponAttackEnhancementDuration["earlyEnd"]
>[number];
type WeaponAttackEnhancementOperation =
  OngoingEffectMechanics["operations"][number];
type WeaponAttackEnhancementTrigger = Extract<
  WeaponAttackEnhancementOperation["trigger"],
  { readonly kind: "passive" }
>;
type WeaponAttackEnhancementCastingTime = Extract<
  OngoingEffectMechanics["castingTime"],
  { readonly kind: "bonus_action" }
>;
type WeaponAttackEnhancementRange = Extract<
  SpellMechanics["range"],
  { readonly kind: "touch" }
>;
type WeaponAttackEnhancementEffect = Extract<
  EffectAtom,
  { readonly kind: "grant_weapon_attack_enhancement" }
>;
type WeaponAttackEnhancementOngoingRoot = Extract<
  BattleSpellAdmissionSource["mechanics"],
  { readonly family: "ongoing_effect" }
> & {
  readonly initialPhase?: never;
  readonly authoredConditionalMechanics?: never;
};
type WeaponAttackDamageEnhancementMechanics =
  WeaponAttackEnhancementOngoingRoot & {
    readonly duration: Extract<
      BattleSpellAdmissionSource["mechanics"]["duration"],
      { readonly kind: "timed" }
    >;
  };

type WeaponAttackDamageEnhancementMechanicsFacts = SpellDefinitionRuleFacts & {
  readonly durationValue: SpellCanonicalDurationValue;
  readonly bonus: WeaponAttackDamageEnhancementBonusFacts;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- This module-private tuple is the canonical source for WeaponAttackDamageEnhancementFailedFact.
const WEAPON_ATTACK_DAMAGE_ENHANCEMENT_FAILED_FACTS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "durationValue",
  "durationEnding",
  "durationExtension",
  "castingTime",
  "attachment",
  "initialPhase",
  "authoredConditionalMechanics",
  "operationCount",
  "operations",
  "operation",
  "enhancementEffect",
  "enhancementBonus",
] as const;
type WeaponAttackDamageEnhancementFailedFact =
  (typeof WEAPON_ATTACK_DAMAGE_ENHANCEMENT_FAILED_FACTS)[number];

type WeaponAttackDamageEnhancementMechanicsIssue = {
  readonly failedFact: WeaponAttackDamageEnhancementFailedFact;
  readonly mechanicsPath: UnitMechanicsPath;
};

const WEAPON_ENHANCEMENT_ATTACHMENT_FIELDS = [
  "kind",
  "holeId",
  "label",
  "value",
] as const satisfies ReadonlyArray<keyof WeaponAttackEnhancementAttachment>;
const WEAPON_ENHANCEMENT_ROOT_FIELDS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "castingTime",
  "family",
  "attachment",
  "initialPhase",
  "operations",
  "authoredConditionalMechanics",
] as const satisfies ReadonlyArray<keyof OngoingEffectMechanics>;
const WEAPON_ENHANCEMENT_OBJECT_FIELDS = [
  "kind",
  "count",
  "filter",
] as const satisfies ReadonlyArray<
  keyof WeaponAttackEnhancementObjectAttachmentValue
>;
const WEAPON_ENHANCEMENT_FILTER_FIELDS = [
  "objectKind",
  "magicality",
] as const satisfies ReadonlyArray<keyof WeaponAttackEnhancementObjectFilter>;
const WEAPON_ENHANCEMENT_DURATION_FIELDS = [
  "kind",
  "value",
  "earlyEnd",
  "permanentAfter",
] as const satisfies ReadonlyArray<keyof WeaponAttackEnhancementDuration>;
const WEAPON_ENHANCEMENT_DURATION_VALUE_FIELDS = [
  "unit",
  "amount",
  "upcastTiers",
] as const satisfies ReadonlyArray<
  keyof WeaponAttackEnhancementDuration["value"]
>;
const WEAPON_ENHANCEMENT_DURATION_END_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<keyof WeaponAttackEnhancementDurationEnd>;
const WEAPON_ENHANCEMENT_OPERATION_FIELDS = [
  "trigger",
  "predicate",
  "targetLimit",
  "effect",
  "usageLimit",
] as const satisfies ReadonlyArray<keyof WeaponAttackEnhancementOperation>;
const WEAPON_ENHANCEMENT_TRIGGER_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<keyof WeaponAttackEnhancementTrigger>;
const WEAPON_ENHANCEMENT_CASTING_TIME_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<keyof WeaponAttackEnhancementCastingTime>;
const WEAPON_ENHANCEMENT_RANGE_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<keyof WeaponAttackEnhancementRange>;
const WEAPON_ENHANCEMENT_COMPONENT_FIELDS = [
  "v",
  "s",
  "m",
] as const satisfies ReadonlyArray<keyof SpellMechanics["components"]>;
const WEAPON_ENHANCEMENT_EFFECT_FIELDS = [
  "kind",
  "bonus",
] as const satisfies ReadonlyArray<keyof WeaponAttackEnhancementEffect>;
const WEAPON_ENHANCEMENT_BONUS_FIELDS = [
  "kind",
  "axis",
  "base",
  "tiers",
  "sign",
] as const satisfies ReadonlyArray<
  keyof WeaponAttackDamageEnhancementThresholdBonusSource
>;
const WEAPON_ENHANCEMENT_BONUS_TIER_FIELDS = [
  "atLevel",
  "value",
] as const satisfies ReadonlyArray<
  keyof WeaponAttackDamageEnhancementThresholdBonusSource["tiers"][number]
>;
const WEAPON_ENHANCEMENT_BONUS_TIER_TABLE = [
  { atLevel: 3, value: 2 },
  { atLevel: 6, value: 3 },
] as const;

function weaponAttackDamageEnhancementIssueResult(
  issue: WeaponAttackDamageEnhancementMechanicsIssue,
) {
  return {
    tag: "spellProcedureAdmissionIssue" as const,
    procedure: "weaponAttackDamageEnhancement" as const,
    failedFact: issue.failedFact,
    mechanicsPath: issue.mechanicsPath,
    message: `Unsupported weaponAttackDamageEnhancement mechanics fact: ${issue.failedFact}.`,
  };
}

function weaponAttackEnhancementCharacteristicOperationIndex(
  mechanics: OngoingEffectMechanics,
): number {
  return mechanics.operations.findIndex(
    (operation) => operation.effect?.kind === "grant_weapon_attack_enhancement",
  );
}

function weaponAttackEnhancementCastingTimeIsSupported(
  castingTime: OngoingEffectMechanics["castingTime"],
): castingTime is WeaponAttackEnhancementCastingTime {
  return (
    castingTime.kind === "bonus_action" &&
    castingTime.trigger === undefined &&
    spellMechanicsObjectHasOnlyKeys(
      castingTime,
      WEAPON_ENHANCEMENT_CASTING_TIME_FIELDS,
    )
  );
}

function weaponAttackEnhancementRangeIsSupported(
  range: SpellMechanics["range"],
): range is WeaponAttackEnhancementRange {
  return (
    range.kind === "touch" &&
    spellMechanicsObjectHasOnlyKeys(range, WEAPON_ENHANCEMENT_RANGE_FIELDS)
  );
}

function weaponAttackEnhancementComponentsAreSupported(
  components: SpellMechanics["components"],
): boolean {
  return (
    components.v === true &&
    components.s === true &&
    components.m === false &&
    spellMechanicsObjectHasOnlyKeys(
      components,
      WEAPON_ENHANCEMENT_COMPONENT_FIELDS,
    )
  );
}

function weaponAttackEnhancementRootIsSupported(
  mechanics: OngoingEffectMechanics,
): mechanics is WeaponAttackEnhancementOngoingRoot {
  return (
    mechanics.initialPhase === undefined &&
    mechanics.authoredConditionalMechanics === undefined &&
    spellMechanicsObjectHasOnlyKeys(mechanics, WEAPON_ENHANCEMENT_ROOT_FIELDS)
  );
}

function weaponAttackEnhancementIndependentEnvelope(
  mechanics: SpellMechanics,
): boolean {
  return (
    mechanics.family === "ongoing_effect" &&
    mechanics.level === 2 &&
    mechanics.school === "transmutation" &&
    weaponAttackEnhancementCastingTimeIsSupported(mechanics.castingTime) &&
    weaponAttackEnhancementRangeIsSupported(mechanics.range) &&
    weaponAttackEnhancementComponentsAreSupported(mechanics.components) &&
    weaponAttackEnhancementDurationIsSupported(mechanics.duration) &&
    weaponAttackEnhancementAttachmentIsSupported(mechanics.attachment)
  );
}

function weaponAttackEnhancementAttachmentIsSupported(
  attachment: Attachment | undefined,
): attachment is WeaponAttackEnhancementAttachment & {
  readonly value: WeaponAttackEnhancementObjectAttachmentValue & {
    readonly filter: WeaponAttackEnhancementObjectFilter;
  };
} {
  if (attachment?.kind !== "hole") return false;
  if (attachment.value.kind !== "object") return false;
  if (
    !spellMechanicsObjectHasOnlyKeys(
      attachment,
      WEAPON_ENHANCEMENT_ATTACHMENT_FIELDS,
    )
  )
    return false;
  return weaponAttackEnhancementObjectValueIsSupported(attachment.value);
}

function weaponAttackEnhancementObjectValueIsSupported(
  value: WeaponAttackEnhancementObjectAttachmentValue,
): value is WeaponAttackEnhancementObjectAttachmentValue & {
  readonly filter: WeaponAttackEnhancementObjectFilter;
} {
  const filter = value.filter;
  if (filter === undefined) return false;
  return [
    spellMechanicsObjectHasOnlyKeys(value, WEAPON_ENHANCEMENT_OBJECT_FIELDS),
    value.count === 1,
    spellMechanicsObjectHasOnlyKeys(filter, WEAPON_ENHANCEMENT_FILTER_FIELDS),
    filter.objectKind === "weapon",
    filter.magicality === "nonmagical",
  ].every(Boolean);
}

function weaponAttackEnhancementDurationIsSupported(
  duration: SpellMechanics["duration"],
): duration is WeaponAttackDamageEnhancementMechanics["duration"] & {
  readonly value: SpellCanonicalDurationValue;
} {
  if (duration.kind !== "timed") return false;
  if (!weaponAttackEnhancementTimedDurationIsSupported(duration)) return false;
  const earlyEnd = duration.earlyEnd;
  return (
    earlyEnd !== undefined &&
    earlyEnd.length === 1 &&
    earlyEnd[0]?.kind === "caster_recasts_spell" &&
    spellMechanicsObjectHasOnlyKeys(
      earlyEnd[0],
      WEAPON_ENHANCEMENT_DURATION_END_FIELDS,
    )
  );
}

function weaponAttackEnhancementTimedDurationIsSupported(
  duration: WeaponAttackEnhancementDuration,
): duration is WeaponAttackEnhancementDuration & {
  readonly value: SpellCanonicalDurationValue;
} {
  return [
    spellMechanicsObjectHasOnlyKeys(
      duration,
      WEAPON_ENHANCEMENT_DURATION_FIELDS,
    ),
    spellMechanicsObjectHasOnlyKeys(
      duration.value,
      WEAPON_ENHANCEMENT_DURATION_VALUE_FIELDS,
    ),
    duration.value.unit === "hour",
    duration.value.amount === 1,
    isSpellCanonicalDurationValue(duration.value),
    duration.value.upcastTiers === undefined,
    duration.permanentAfter === undefined,
  ].every(Boolean);
}

function weaponAttackEnhancementBonusFacts(
  bonus: WeaponAttackDamageEnhancementBonusSource,
): WeaponAttackDamageEnhancementBonusFacts | undefined {
  if (bonus.kind !== "threshold_tiers") return undefined;
  if (!weaponAttackEnhancementBonusHeaderIsSupported(bonus)) return undefined;
  const base = weaponAttackDamageEnhancementBonusFromNumber(bonus.base);
  const parsedTiers = bonus.tiers.flatMap(
    weaponAttackEnhancementBonusTierFacts,
  );
  const orderedTiers = spellMechanicsFixedTableEntries(
    parsedTiers,
    WEAPON_ENHANCEMENT_BONUS_TIER_TABLE,
    (tier, expected) =>
      Number(tier.atLevel) === expected.atLevel &&
      tier.value === expected.value,
  );
  const tiers =
    parsedTiers.length === bonus.tiers.length && orderedTiers !== undefined
      ? spellProcedureNonEmpty(orderedTiers)
      : undefined;
  return base === null || tiers === undefined
    ? undefined
    : { ...bonus, base, tiers };
}

function weaponAttackEnhancementBonusHeaderIsSupported(
  bonus: WeaponAttackDamageEnhancementThresholdBonusSource,
): boolean {
  return [
    spellMechanicsObjectHasOnlyKeys(bonus, WEAPON_ENHANCEMENT_BONUS_FIELDS),
    bonus.axis === "slot",
    bonus.base === 1,
    bonus.sign === "+",
    bonus.tiers.length === WEAPON_ENHANCEMENT_BONUS_TIER_TABLE.length,
  ].every(Boolean);
}

function weaponAttackEnhancementBonusTierFacts(
  tier: WeaponAttackDamageEnhancementBonusTierSource,
): readonly WeaponAttackDamageEnhancementBonusFacts["tiers"][number][] {
  const atLevel = spellSlotLevelFromSurface(tier.atLevel);
  const value = weaponAttackDamageEnhancementBonusFromNumber(tier.value);
  if (atLevel === undefined) return [];
  if (value === null) return [];
  if (
    !spellMechanicsObjectHasOnlyKeys(tier, WEAPON_ENHANCEMENT_BONUS_TIER_FIELDS)
  )
    return [];
  return [{ ...tier, atLevel, value }];
}

function weaponAttackEnhancementOperationIsSupported(
  operation:
    | WeaponAttackDamageEnhancementMechanics["operations"][number]
    | undefined,
): operation is WeaponAttackDamageEnhancementMechanics["operations"][number] {
  return (
    operation !== undefined &&
    spellMechanicsObjectHasOnlyKeys(
      operation,
      WEAPON_ENHANCEMENT_OPERATION_FIELDS,
    ) &&
    operation.trigger.kind === "passive" &&
    spellMechanicsObjectHasOnlyKeys(
      operation.trigger,
      WEAPON_ENHANCEMENT_TRIGGER_FIELDS,
    ) &&
    operation.predicate === undefined &&
    operation.targetLimit === undefined &&
    operation.usageLimit === undefined
  );
}

function weaponAttackEnhancementEffectIsSupported(
  effect: OngoingEffectMechanicsOperation["effect"] | undefined,
): effect is Extract<
  OngoingEffectMechanicsOperation["effect"],
  { readonly kind: "grant_weapon_attack_enhancement" }
> {
  return (
    effect?.kind === "grant_weapon_attack_enhancement" &&
    spellMechanicsObjectHasOnlyKeys(effect, WEAPON_ENHANCEMENT_EFFECT_FIELDS)
  );
}

function weaponAttackEnhancementOperationHasSupportedEffect(
  operation:
    | WeaponAttackDamageEnhancementMechanics["operations"][number]
    | undefined,
): operation is WeaponAttackDamageEnhancementMechanics["operations"][number] & {
  readonly effect: Extract<
    EffectAtom,
    { readonly kind: "grant_weapon_attack_enhancement" }
  >;
} {
  return (
    operation !== undefined &&
    weaponAttackEnhancementEffectIsSupported(operation.effect)
  );
}

function weaponAttackDamageEnhancementMechanicsEvidence(
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
  ];
  return { consumed, unowned: [] };
}

function weaponAttackEnhancementIsRepresented(
  mechanics: SpellMechanics,
): boolean {
  const semanticCandidate =
    mechanics.family === "ongoing_effect" &&
    weaponAttackEnhancementCharacteristicOperationIndex(mechanics) >= 0;
  return (
    semanticCandidate || weaponAttackEnhancementIndependentEnvelope(mechanics)
  );
}

function weaponAttackEnhancementIssueIf(
  supported: boolean,
  failedFact: WeaponAttackDamageEnhancementFailedFact,
  mechanicsPath: UnitMechanicsPath,
): readonly WeaponAttackDamageEnhancementMechanicsIssue[] {
  return supported ? [] : [{ failedFact, mechanicsPath }];
}

function weaponAttackEnhancementHeaderIssues(
  mechanics: OngoingEffectMechanics,
): readonly WeaponAttackDamageEnhancementMechanicsIssue[] {
  return [
    ...weaponAttackEnhancementIssueIf(
      mechanics.level === 2,
      "level",
      spellMechanicsHeaderPath("level"),
    ),
    ...weaponAttackEnhancementIssueIf(
      mechanics.school === "transmutation",
      "school",
      spellMechanicsHeaderPath("school"),
    ),
    ...weaponAttackEnhancementIssueIf(
      weaponAttackEnhancementRangeIsSupported(mechanics.range),
      "range",
      spellMechanicsHeaderPath("range"),
    ),
    ...weaponAttackEnhancementIssueIf(
      weaponAttackEnhancementComponentsAreSupported(mechanics.components),
      "components",
      spellMechanicsHeaderPath("components"),
    ),
    ...weaponAttackEnhancementIssueIf(
      weaponAttackEnhancementCastingTimeIsSupported(mechanics.castingTime),
      "castingTime",
      spellMechanicsHeaderPath("castingTime"),
    ),
    ...weaponAttackEnhancementIssueIf(
      spellMechanicsObjectHasOnlyKeys(
        mechanics,
        WEAPON_ENHANCEMENT_ROOT_FIELDS,
      ),
      "operations",
      spellMechanicsHeaderPath("family"),
    ),
    ...weaponAttackEnhancementIssueIf(
      mechanics.initialPhase === undefined,
      "initialPhase",
      spellOngoingInitialPhasePath(),
    ),
    ...weaponAttackEnhancementIssueIf(
      mechanics.authoredConditionalMechanics === undefined,
      "authoredConditionalMechanics",
      spellMechanicsRootPath(),
    ),
    ...weaponAttackEnhancementIssueIf(
      weaponAttackEnhancementAttachmentIsSupported(mechanics.attachment),
      "attachment",
      spellOngoingAttachmentPath(),
    ),
  ];
}

function weaponAttackEnhancementDurationIssues(
  mechanics: OngoingEffectMechanics,
): readonly WeaponAttackDamageEnhancementMechanicsIssue[] {
  if (weaponAttackEnhancementDurationIsSupported(mechanics.duration)) return [];
  return [
    {
      failedFact: "duration",
      mechanicsPath: spellMechanicsHeaderPath("duration"),
    },
    ...spellDurationValueEvidencePaths(mechanics.duration).map(
      (mechanicsPath): WeaponAttackDamageEnhancementMechanicsIssue => ({
        failedFact: "durationValue",
        mechanicsPath,
      }),
    ),
    ...spellDurationChildCoordinates(mechanics.duration).map(
      (child): WeaponAttackDamageEnhancementMechanicsIssue => ({
        failedFact: spellDurationChildFailedFact(child),
        mechanicsPath: spellDurationChildPath(child),
      }),
    ),
  ];
}

function weaponAttackEnhancementOperationCountIssues(
  mechanics: OngoingEffectMechanics,
  operationIndex: number,
): readonly WeaponAttackDamageEnhancementMechanicsIssue[] {
  if (mechanics.operations.length === 1) return [];
  const extraIssues = mechanics.operations.flatMap(
    (
      _operation,
      index,
    ): readonly WeaponAttackDamageEnhancementMechanicsIssue[] =>
      index === operationIndex
        ? []
        : [
            {
              failedFact: "operationCount",
              mechanicsPath: spellOngoingOperationPath(
                PositiveInteger(index + 1),
              ),
            },
          ],
  );
  return mechanics.operations.length === 0
    ? [
        {
          failedFact: "operationCount",
          mechanicsPath: spellOngoingOperationPath(PositiveInteger(1)),
        },
      ]
    : extraIssues;
}

function weaponAttackEnhancementOperationIssues(
  operation:
    | WeaponAttackDamageEnhancementMechanics["operations"][number]
    | undefined,
  operationIndex: number,
  bonus: WeaponAttackDamageEnhancementBonusFacts | undefined,
): readonly WeaponAttackDamageEnhancementMechanicsIssue[] {
  const operationOrdinal = PositiveInteger(Math.max(1, operationIndex + 1));
  return [
    ...weaponAttackEnhancementIssueIf(
      weaponAttackEnhancementOperationIsSupported(operation),
      "operation",
      spellOngoingOperationPath(operationOrdinal),
    ),
    ...weaponAttackEnhancementIssueIf(
      weaponAttackEnhancementOperationHasSupportedEffect(operation),
      "enhancementEffect",
      spellOngoingOperationEffectPath(operationOrdinal),
    ),
    ...weaponAttackEnhancementIssueIf(
      bonus !== undefined,
      "enhancementBonus",
      spellOngoingOperationEffectPath(operationOrdinal),
    ),
  ];
}

function weaponAttackEnhancementFacts(
  source: SpellMechanicsAdmissionSource,
  mechanics: OngoingEffectMechanics,
  operation:
    | WeaponAttackDamageEnhancementMechanics["operations"][number]
    | undefined,
  bonus: WeaponAttackDamageEnhancementBonusFacts | undefined,
): WeaponAttackDamageEnhancementMechanicsFacts | undefined {
  if (!weaponAttackEnhancementOperationIsSupported(operation)) return undefined;
  if (!weaponAttackEnhancementOperationHasSupportedEffect(operation)) {
    return undefined;
  }
  if (bonus === undefined) return undefined;
  if (!weaponAttackEnhancementRootIsSupported(mechanics)) return undefined;
  if (!weaponAttackEnhancementDurationIsSupported(mechanics.duration)) {
    return undefined;
  }
  return {
    ...source.spellDefinitionRuleFacts,
    durationValue: mechanics.duration.value,
    bonus,
  };
}

function weaponAttackEnhancementOperationProjection(
  mechanics: OngoingEffectMechanics,
): Readonly<{
  operationIndex: number;
  operation:
    | WeaponAttackDamageEnhancementMechanics["operations"][number]
    | undefined;
  bonus: WeaponAttackDamageEnhancementBonusFacts | undefined;
}> {
  const characteristicOperationIndex =
    weaponAttackEnhancementCharacteristicOperationIndex(mechanics);
  const operationIndex =
    characteristicOperationIndex >= 0
      ? characteristicOperationIndex
      : mechanics.operations.length === 1
        ? 0
        : -1;
  const operation =
    operationIndex < 0 ? undefined : mechanics.operations[operationIndex];
  const bonus = weaponAttackEnhancementOperationHasSupportedEffect(operation)
    ? weaponAttackEnhancementBonusFacts(operation.effect.bonus)
    : undefined;
  return { operationIndex, operation, bonus };
}

function admitWeaponAttackDamageEnhancementMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "weaponAttackDamageEnhancement",
  WeaponAttackDamageEnhancementMechanicsFacts,
  WeaponAttackDamageEnhancementInvocation,
  ReturnType<typeof weaponAttackDamageEnhancementIssueResult>
> {
  if (!weaponAttackEnhancementIsRepresented(source.mechanics)) {
    return { tag: "notRepresented" };
  }
  if (source.mechanics.family !== "ongoing_effect") {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const { operationIndex, operation, bonus } =
    weaponAttackEnhancementOperationProjection(mechanics);
  const issues = [
    ...weaponAttackEnhancementHeaderIssues(mechanics),
    ...weaponAttackEnhancementDurationIssues(mechanics),
    ...weaponAttackEnhancementOperationCountIssues(mechanics, operationIndex),
    ...weaponAttackEnhancementOperationIssues(operation, operationIndex, bonus),
  ];
  const uniqueIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (uniqueIssues !== undefined) {
    const [first, ...rest] = uniqueIssues.map(
      weaponAttackDamageEnhancementIssueResult,
    );
    return { tag: "unsupported", issues: [first, ...rest] };
  }
  const facts = weaponAttackEnhancementFacts(
    source,
    mechanics,
    operation,
    bonus,
  );
  if (facts === undefined) {
    const issue = {
      failedFact: "enhancementEffect" as const,
      mechanicsPath: spellOngoingOperationEffectPath(
        PositiveInteger(Math.max(1, operationIndex + 1)),
      ),
    };
    return {
      tag: "unsupported",
      issues: [weaponAttackDamageEnhancementIssueResult(issue)],
    };
  }
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "weaponAttackDamageEnhancement",
      facts,
      evidence: weaponAttackDamageEnhancementMechanicsEvidence(mechanics),
      admit: (executionSource, ctx) =>
        admitWeaponAttackDamageEnhancement(executionSource, ctx, facts),
    },
  };
}

function admitWeaponAttackDamageEnhancement(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: WeaponAttackDamageEnhancementMechanicsFacts,
): readonly WeaponAttackDamageEnhancementInvocation[] {
  const durationTicks = spellDurationTicksFromCanonicalValue(
    facts.durationValue,
  );
  return ctx.spellCastOptions.flatMap(
    (slot): readonly WeaponAttackDamageEnhancementInvocation[] => {
      if (Number(slot.spellLevel) < facts.level) return [];
      const bonus = weaponAttackDamageEnhancementBonusForSlot(
        facts.bonus,
        slot.spellLevel,
      );
      return [
        {
          access: { tag: "prepared" },
          resource: spellInvocationResourceForCastOption(slot),
          procedure: "weaponAttackDamageEnhancement",
          spell,
          actionCost: "bonusAction",
          bonus,
          durationTicks,
        },
      ];
    },
  );
}

function weaponAttackDamageEnhancementBonusForSlot(
  bonus: WeaponAttackDamageEnhancementBonusFacts,
  slotLevel: SpellSlotLevel,
): WeaponAttackDamageEnhancementBonus {
  const applicableTier = bonus.tiers.reduce<
    (typeof bonus.tiers)[number] | undefined
  >((current, tier) => {
    if (
      Number(slotLevel) < Number(tier.atLevel) ||
      (current !== undefined && Number(current.atLevel) >= Number(tier.atLevel))
    ) {
      return current;
    }
    return tier;
  }, undefined);
  return applicableTier === undefined ? bonus.base : applicableTier.value;
}

function weaponAttackDamageEnhancementBonusFromNumber(
  value: number,
): WeaponAttackDamageEnhancementBonus | null {
  return isWeaponAttackDamageEnhancementBonus(value) ? value : null;
}

function isWeaponAttackDamageEnhancementBonus(
  value: number,
): value is WeaponAttackDamageEnhancementBonus {
  return WEAPON_ATTACK_DAMAGE_ENHANCEMENT_BONUSES.some(
    (bonus) => bonus === value,
  );
}

function discoverWeaponAttackDamageEnhancementCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: import("../../battle-state-execution.ts").BattleExecutableSpellInvocation<WeaponAttackDamageEnhancementInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  return [
    {
      subject: {
        tag: "bonusActionSpell",
        actorId,
        procedureRef: invocation.sourceProcedureRef,
        mode: { tag: "cast" },
      },
      initialHoles: [weaponAttackDamageEnhancementTargetItemHole(invocation)],
    },
  ];
}

function resolveWeaponAttackDamageEnhancement(
  input: SpellProcedureProfileResolveInput<WeaponAttackDamageEnhancementInvocation>,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !fillsBelongToSpellCastHoles(input.input.fills, [
      weaponAttackDamageEnhancementTargetItemHoleId(input.invocation),
    ])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "weapon attack enhancement uses one nonmagical weapon item target fill and spell-cast Reaction facts only.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (input.fillSet.weaponAttackDamageEnhancementTargetItem === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      weaponAttackDamageEnhancementTargetItemHole(input.invocation),
    ]);
  }
  const targetItem =
    input.fillSet.weaponAttackDamageEnhancementTargetItem.value;
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !battleWeaponAttackDamageEnhancementTargetItemIsHeldWeapon(
      input.input.state,
      targetItem,
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "weapon attack enhancement target item must identify a held nonmagical weapon item.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    battleWeaponItemHasWeaponAttackDamageEnhancement(
      input.input.state,
      targetItem.holderCombatantId,
      targetItem.itemId,
      {
        exceptSourceCombatantId: input.actorId,
        exceptSourceProcedureRef: input.invocation.sourceProcedureRef,
      },
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "weapon attack enhancement target item is already magical from an active weapon attack enhancement effect.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const spellCastReactionWindow = maybeOpenConfiguredSpellCastReactionWindow({
    resolution: input,
    targetIds: [],
  });
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const actor = input.input.state.combatants.get(input.actorId);
  /* v8 ignore start -- @preserve -- Admitted spell-resolution invariant: the bound Magic Weapon procedure and its caster are resolved together before profile dispatch. */
  if (actor === undefined) {
    return invalidResult(
      input.input.state,
      "missingCombatant",
      "weapon attack enhancement caster is not in this battle.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const effected = replaceTargetActiveEffect(
    input.input.state,
    input.actorId,
    (effect) =>
      effect.kind === "weaponAttackDamageEnhancement" &&
      effect.sourceProcedureRef === input.invocation.sourceProcedureRef &&
      effect.sourceCombatantId === input.actorId,
    {
      kind: "weaponAttackDamageEnhancement",
      sourceProcedureRef: input.invocation.sourceProcedureRef,
      sourceCombatantId: input.actorId,
      holderCombatantId: targetItem.holderCombatantId,
      weaponItemId: targetItem.itemId,
      expiresAt: {
        kind: "duration",
        durationTicks: input.invocation.durationTicks,
      },
    },
  );
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resolutionFromStateResult(resourced);
}

function battleWeaponAttackDamageEnhancementTargetItemIsHeldWeapon(
  state: BattleState,
  targetItem: BattleWeaponEnhancementTargetItemFact,
): boolean {
  const holder = state.combatants.get(targetItem.holderCombatantId);
  if (!isCharacterBattleCreatureState(holder)) {
    return false;
  }
  const loadout = characterEffectiveLoadout(state, holder);
  return loadoutHasUsableHeldWeaponItem({
    loadout,
    activeWildShape: activeDruidWildShapeEffect(holder),
    itemId: targetItem.itemId,
  });
}

export const WeaponAttackDamageEnhancementInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("weaponAttackDamageEnhancement"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("bonusAction"),
      bonus: Schema.Literals([1, 2, 3]),
      durationTicks: ElapsedTimeTicksSchema,
    }),
  );
export const weaponAttackDamageEnhancementProfile: SpellProcedureDeclaration<
  "weaponAttackDamageEnhancement",
  WeaponAttackDamageEnhancementInvocation
> = {
  procedure: "weaponAttackDamageEnhancement",
  executionSchema: WeaponAttackDamageEnhancementInvocationSchema,
  admitMechanics: admitWeaponAttackDamageEnhancementMechanics,
  discoverCastAct: discoverWeaponAttackDamageEnhancementCastAct,
  resolve: resolveWeaponAttackDamageEnhancement,
};
