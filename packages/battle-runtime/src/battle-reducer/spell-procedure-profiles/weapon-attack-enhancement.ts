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
  spellOngoingAttachmentPath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
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
type WeaponAttackDamageEnhancementMechanics = Extract<
  BattleSpellAdmissionSource["mechanics"],
  { readonly family: "ongoing_effect" }
> & {
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
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

const WEAPON_ENHANCEMENT_ATTACHMENT_FIELDS = [
  "kind",
  "holeId",
  "label",
  "value",
] as const satisfies ReadonlyArray<keyof WeaponAttackEnhancementAttachment>;
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
  if (
    attachment?.kind !== "hole" ||
    attachment.value === undefined ||
    attachment.value.kind !== "object" ||
    !spellMechanicsObjectHasOnlyKeys(
      attachment,
      WEAPON_ENHANCEMENT_ATTACHMENT_FIELDS,
    ) ||
    !spellMechanicsObjectHasOnlyKeys(
      attachment.value,
      WEAPON_ENHANCEMENT_OBJECT_FIELDS,
    ) ||
    attachment.value.count !== 1 ||
    attachment.value.filter === undefined ||
    !spellMechanicsObjectHasOnlyKeys(
      attachment.value.filter,
      WEAPON_ENHANCEMENT_FILTER_FIELDS,
    )
  ) {
    return false;
  }
  return (
    attachment.value.filter.objectKind === "weapon" &&
    attachment.value.filter.magicality === "nonmagical"
  );
}

function weaponAttackEnhancementDurationIsSupported(
  duration: SpellMechanics["duration"],
): duration is WeaponAttackDamageEnhancementMechanics["duration"] & {
  readonly value: SpellCanonicalDurationValue;
} {
  if (
    duration.kind !== "timed" ||
    !spellMechanicsObjectHasOnlyKeys(
      duration,
      WEAPON_ENHANCEMENT_DURATION_FIELDS,
    ) ||
    !spellMechanicsObjectHasOnlyKeys(
      duration.value,
      WEAPON_ENHANCEMENT_DURATION_VALUE_FIELDS,
    ) ||
    duration.value.unit !== "hour" ||
    duration.value.amount !== 1 ||
    !isSpellCanonicalDurationValue(duration.value) ||
    duration.value.upcastTiers !== undefined ||
    duration.permanentAfter !== undefined
  ) {
    return false;
  }
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

function weaponAttackEnhancementBonusFacts(
  bonus: WeaponAttackDamageEnhancementBonusSource,
): WeaponAttackDamageEnhancementBonusFacts | undefined {
  if (
    bonus.kind !== "threshold_tiers" ||
    !spellMechanicsObjectHasOnlyKeys(bonus, WEAPON_ENHANCEMENT_BONUS_FIELDS) ||
    bonus.axis !== "slot" ||
    bonus.base !== 1 ||
    bonus.sign !== "+" ||
    bonus.tiers.length !== WEAPON_ENHANCEMENT_BONUS_TIER_TABLE.length
  ) {
    return undefined;
  }
  const base = weaponAttackDamageEnhancementBonusFromNumber(bonus.base);
  const parsedTiers = bonus.tiers.flatMap((tier) => {
    const atLevel = spellSlotLevelFromSurface(tier.atLevel);
    const value = weaponAttackDamageEnhancementBonusFromNumber(tier.value);
    return atLevel === undefined ||
      value === null ||
      !spellMechanicsObjectHasOnlyKeys(
        tier,
        WEAPON_ENHANCEMENT_BONUS_TIER_FIELDS,
      )
      ? []
      : [{ ...tier, atLevel, value }];
  });
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
  effect: EffectAtom | undefined,
): effect is Extract<
  EffectAtom,
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

function admitWeaponAttackDamageEnhancementMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "weaponAttackDamageEnhancement",
  WeaponAttackDamageEnhancementMechanicsFacts,
  WeaponAttackDamageEnhancementInvocation,
  ReturnType<typeof weaponAttackDamageEnhancementIssueResult>
> {
  const semanticCandidate =
    source.mechanics.family === "ongoing_effect" &&
    weaponAttackEnhancementCharacteristicOperationIndex(source.mechanics) >= 0;
  if (
    !semanticCandidate &&
    !weaponAttackEnhancementIndependentEnvelope(source.mechanics)
  ) {
    return { tag: "notRepresented" };
  }
  if (source.mechanics.family !== "ongoing_effect") {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
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
  const issues: WeaponAttackDamageEnhancementMechanicsIssue[] = [];
  const push = (
    failedFact: WeaponAttackDamageEnhancementFailedFact,
    mechanicsPath: SpellMechanicsBranchPath,
  ) => issues.push({ failedFact, mechanicsPath });

  if (mechanics.level !== 2) push("level", spellMechanicsHeaderPath("level"));
  if (mechanics.school !== "transmutation") {
    push("school", spellMechanicsHeaderPath("school"));
  }
  if (!weaponAttackEnhancementRangeIsSupported(mechanics.range)) {
    push("range", spellMechanicsHeaderPath("range"));
  }
  if (!weaponAttackEnhancementComponentsAreSupported(mechanics.components)) {
    push("components", spellMechanicsHeaderPath("components"));
  }
  if (!weaponAttackEnhancementDurationIsSupported(mechanics.duration)) {
    push("duration", spellMechanicsHeaderPath("duration"));
    for (const path of spellDurationValueEvidencePaths(mechanics.duration)) {
      push("durationValue", path);
    }
    for (const child of spellDurationChildCoordinates(mechanics.duration)) {
      push(spellDurationChildFailedFact(child), spellDurationChildPath(child));
    }
  }
  if (!weaponAttackEnhancementCastingTimeIsSupported(mechanics.castingTime)) {
    push("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  if (!weaponAttackEnhancementAttachmentIsSupported(mechanics.attachment)) {
    push("attachment", spellOngoingAttachmentPath());
  }
  if (mechanics.operations.length !== 1) {
    for (const [index] of mechanics.operations.entries()) {
      if (index === operationIndex) continue;
      push(
        "operationCount",
        spellOngoingOperationPath(PositiveInteger(index + 1)),
      );
    }
    if (mechanics.operations.length === 0) {
      push("operationCount", spellOngoingOperationPath(PositiveInteger(1)));
    }
  }
  if (!weaponAttackEnhancementOperationIsSupported(operation)) {
    push(
      "operation",
      spellOngoingOperationPath(
        PositiveInteger(Math.max(1, operationIndex + 1)),
      ),
    );
  }
  if (!weaponAttackEnhancementOperationHasSupportedEffect(operation)) {
    push(
      "enhancementEffect",
      spellOngoingOperationEffectPath(
        PositiveInteger(Math.max(1, operationIndex + 1)),
      ),
    );
  }
  if (bonus === undefined) {
    push(
      "enhancementBonus",
      spellOngoingOperationEffectPath(
        PositiveInteger(Math.max(1, operationIndex + 1)),
      ),
    );
  }
  const uniqueIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (uniqueIssues !== undefined) {
    const [first, ...rest] = uniqueIssues.map(
      weaponAttackDamageEnhancementIssueResult,
    );
    return { tag: "unsupported", issues: [first, ...rest] };
  }
  if (
    operation === undefined ||
    !weaponAttackEnhancementOperationIsSupported(operation) ||
    !weaponAttackEnhancementOperationHasSupportedEffect(operation) ||
    bonus === undefined ||
    !weaponAttackEnhancementDurationIsSupported(mechanics.duration)
  ) {
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
  const durationValue =
    mechanics.duration.kind === "timed" &&
    isSpellCanonicalDurationValue(mechanics.duration.value)
      ? mechanics.duration.value
      : undefined;
  if (durationValue === undefined) {
    return {
      tag: "unsupported",
      issues: [
        weaponAttackDamageEnhancementIssueResult({
          failedFact: "durationValue",
          mechanicsPath: spellMechanicsHeaderPath("duration"),
        }),
      ],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    durationValue,
    bonus,
  } satisfies WeaponAttackDamageEnhancementMechanicsFacts;
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
