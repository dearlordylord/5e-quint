import { maybeOpenConfiguredSpellCastReactionWindow } from "../spell-active-effect-resolution.ts";
import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-weapon-damage-rider
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS
//
// The weaponDamageRider Spell Procedure Profile: a self-targeted Bonus Action
// spell that installs a timed Attack Damage Rider on the caster's weapon hits.
//
// RAW anchors:
//   - SRD 5.2.1 Spells "Divine Favor": Bonus Action, Self, 1 minute; attacks
//     with weapons deal extra Radiant damage on a hit.
//   - UBIQUITOUS_LANGUAGE.md: Attack Damage Rider, Bonus Action, Attack Roll,
//     Damage Roll, and Spell Invocation.

import {
  type BattleActDiscoveryCandidate,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import {
  PositiveInteger,
  type DamageDieSize,
  type PositiveInteger as PositiveIntegerType,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import type { ElapsedTimeTicks } from "@dnd/shared/elapsed-time";
import { SpellWeaponDamageRiderTemplateSchema } from "../../active-effect/codecs.ts";
import { type CombatantId } from "../../identity.ts";
import { invalidResult, resolutionFromStateResult } from "../result-helpers.ts";
import { replaceTargetActiveEffect } from "../active-effect-replacement.ts";
import { spellCastCandidate } from "../spell-cast-candidate.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Match, Schema } from "effect";
import type {
  DiceAmount,
  DiceExpr,
  EffectAtom,
  SpellMechanics,
} from "@dnd/surface/surface/types";
import {
  spellConsumedMaterialEvidencePaths,
  spellDurationChildCoordinates,
  spellDurationChildFailedFact,
  spellDurationChildPath,
  spellDurationEvidencePaths,
  spellDurationValueEvidencePaths,
  spellDurationTicksFromCanonicalValue,
  isSpellCanonicalDurationValue,
  spellMechanicsObjectHasOnlyKeys,
  spellPositiveIntegerFromSurface,
  spellProcedureHasRedundantSignature,
  spellProcedureNonEmpty,
  spellUniqueMechanicsIssues,
  type SpellCanonicalDurationValue,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
  type SpellProcedureAdmissionIssue,
} from "./spell-mechanics-admission.ts";
import {
  spellMechanicsHeaderPath,
  spellOngoingAttachmentPath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import { spellInvocationResourceForCastOption } from "./profile.ts";

type WeaponDamageRiderInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "weaponDamageRider" }
>;
type WeaponDamageRiderResolveInput =
  SpellProcedureProfileResolveInput<WeaponDamageRiderInvocation>;

type OngoingEffectMechanics = Extract<
  SpellMechanics,
  { readonly family: "ongoing_effect" }
>;
type OngoingOperation = OngoingEffectMechanics["operations"][number];
type WeaponDamageRiderFixedAmount = Extract<
  DiceAmount,
  { readonly kind: "fixed" }
> & {
  readonly expr: DiceExpr & {
    readonly dice: 1;
    readonly dieSize: 4;
    readonly flat?: undefined;
    readonly spellcastingMod?: undefined;
    readonly abilityModifier?: undefined;
  };
};
type WeaponDamageRiderDamageProjection = {
  readonly dice: PositiveIntegerType & 1;
  readonly dieSize: DamageDieSize & 4;
};
type WeaponDamageRiderMechanicsFacts = SpellDefinitionRuleFacts & {
  readonly durationTicks: ElapsedTimeTicks;
  readonly damage: WeaponDamageRiderDamageProjection;
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- This module-private tuple is the canonical source for WeaponDamageRiderFailedFact.
const WEAPON_DAMAGE_RIDER_FAILED_FACTS = [
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
  "damageEffect",
  "damageAmount",
] as const;
type WeaponDamageRiderFailedFact =
  (typeof WEAPON_DAMAGE_RIDER_FAILED_FACTS)[number];
type WeaponDamageRiderMechanicsIssue = {
  readonly failedFact: WeaponDamageRiderFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};
type WeaponDamageRiderAdmissionIssue = SpellProcedureAdmissionIssue<
  "weaponDamageRider",
  WeaponDamageRiderFailedFact,
  SpellMechanicsBranchPath
>;
type WeaponDamageRiderMechanicsInspection = SpellProcedureMechanicsInspection<
  "weaponDamageRider",
  WeaponDamageRiderMechanicsFacts,
  WeaponDamageRiderInvocation,
  WeaponDamageRiderAdmissionIssue
>;
type WeaponDamageRiderUnsupportedInspection = Extract<
  WeaponDamageRiderMechanicsInspection,
  { readonly tag: "unsupported" }
>;
const WEAPON_DAMAGE_RIDER_ROOT_FIELDS = [
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
const WEAPON_DAMAGE_RIDER_RANGE_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<
  keyof Extract<SpellMechanics["range"], { readonly kind: "self" }>
>;
const WEAPON_DAMAGE_RIDER_COMPONENT_FIELDS = [
  "v",
  "s",
  "m",
] as const satisfies ReadonlyArray<keyof SpellMechanics["components"]>;
const WEAPON_DAMAGE_RIDER_DURATION_FIELDS = [
  "kind",
  "value",
  "earlyEnd",
  "permanentAfter",
] as const satisfies ReadonlyArray<
  keyof Extract<SpellMechanics["duration"], { readonly kind: "timed" }>
>;
const WEAPON_DAMAGE_RIDER_DURATION_VALUE_FIELDS = [
  "unit",
  "amount",
  "upcastTiers",
] as const satisfies ReadonlyArray<
  keyof Extract<SpellMechanics["duration"], { readonly kind: "timed" }>["value"]
>;
const WEAPON_DAMAGE_RIDER_CASTING_TIME_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<
  keyof Extract<
    OngoingEffectMechanics["castingTime"],
    { readonly kind: "bonus_action" }
  >
>;
const WEAPON_DAMAGE_RIDER_ATTACHMENT_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<
  keyof Extract<OngoingEffectMechanics["attachment"], { readonly kind: "self" }>
>;
const WEAPON_DAMAGE_RIDER_OPERATION_FIELDS = [
  "trigger",
  "predicate",
  "targetLimit",
  "effect",
  "usageLimit",
] as const satisfies ReadonlyArray<keyof OngoingOperation>;
const WEAPON_DAMAGE_RIDER_TRIGGER_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<keyof OngoingOperation["trigger"]>;
const WEAPON_DAMAGE_RIDER_DAMAGE_EFFECT_FIELDS = [
  "kind",
  "damageType",
  "amount",
] as const satisfies ReadonlyArray<
  keyof Extract<EffectAtom, { readonly kind: "damage" }>
>;
const WEAPON_DAMAGE_RIDER_AMOUNT_FIELDS = [
  "kind",
  "expr",
] as const satisfies ReadonlyArray<
  keyof Extract<DiceAmount, { readonly kind: "fixed" }>
>;
const WEAPON_DAMAGE_RIDER_DICE_EXPR_FIELDS = [
  "dice",
  "dieSize",
  "flat",
  "spellcastingMod",
  "abilityModifier",
] as const satisfies ReadonlyArray<keyof DiceExpr>;

function weaponDamageRiderIssueResult(
  issue: WeaponDamageRiderMechanicsIssue,
): WeaponDamageRiderAdmissionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "weaponDamageRider",
    failedFact: issue.failedFact,
    mechanicsPath: issue.mechanicsPath,
    message: `Unsupported weaponDamageRider mechanics fact: ${issue.failedFact}.`,
  };
}

function weaponDamageRiderMissingRootIssues(
  mechanics: OngoingEffectMechanics,
): ReadonlyNonEmptyArray<WeaponDamageRiderMechanicsIssue> | undefined {
  const issues: WeaponDamageRiderMechanicsIssue[] = [];
  const candidates: ReadonlyArray<
    WeaponDamageRiderMechanicsIssue & { readonly missing: boolean }
  > = [
    {
      missing: mechanics.level === undefined,
      failedFact: "level",
      mechanicsPath: spellMechanicsHeaderPath("level"),
    },
    {
      missing: mechanics.school === undefined,
      failedFact: "school",
      mechanicsPath: spellMechanicsHeaderPath("school"),
    },
    {
      missing: mechanics.range === undefined,
      failedFact: "range",
      mechanicsPath: spellMechanicsHeaderPath("range"),
    },
    {
      missing: mechanics.components === undefined,
      failedFact: "components",
      mechanicsPath: spellMechanicsHeaderPath("components"),
    },
    {
      missing: mechanics.duration === undefined,
      failedFact: "duration",
      mechanicsPath: spellMechanicsHeaderPath("duration"),
    },
    {
      missing: mechanics.castingTime === undefined,
      failedFact: "castingTime",
      mechanicsPath: spellMechanicsHeaderPath("castingTime"),
    },
    {
      missing: mechanics.attachment === undefined,
      failedFact: "attachment",
      mechanicsPath: spellOngoingAttachmentPath(),
    },
    {
      missing: mechanics.operations === undefined,
      failedFact: "operationCount",
      mechanicsPath: spellOngoingOperationPath(PositiveInteger(1)),
    },
  ];
  for (const { missing, failedFact, mechanicsPath } of candidates) {
    if (missing) issues.push({ failedFact, mechanicsPath });
  }
  return spellProcedureNonEmpty(issues);
}

function weaponDamageRiderStructuralCandidate(
  mechanics: SpellMechanics,
): mechanics is OngoingEffectMechanics {
  if (mechanics.family !== "ongoing_effect") return false;
  const operation = mechanics.operations?.[0];
  const operationRole = weaponDamageRiderOperationRole(operation)
    ? operation
    : undefined;
  return spellProcedureHasRedundantSignature({
    kind: "twoWitnessesMayBeMissing",
    witnesses: [
      {
        name: "header",
        present: weaponDamageRiderHeaderIsCanonical(mechanics),
      },
      {
        name: "duration",
        present: weaponDamageRiderDurationIsCanonical(mechanics.duration),
      },
      {
        name: "attachment",
        present: weaponDamageRiderAttachmentIsCanonical(mechanics.attachment),
      },
      {
        name: "operation",
        present:
          mechanics.operations?.length === 1 && operationRole !== undefined,
      },
      {
        name: "damageAmount",
        present:
          operationRole !== undefined &&
          weaponDamageRiderAmountIsCanonical(operationRole.effect.amount),
      },
    ],
  });
}

function weaponDamageRiderDurationIsCanonical(
  duration: SpellMechanics["duration"] | undefined,
): boolean {
  if (weaponDamageRiderDurationValue(duration) === undefined) return false;
  if (!weaponDamageRiderDurationExtensionsAreSupported(duration)) return false;
  return weaponDamageRiderDurationEndingsAreSupported(duration);
}

function weaponDamageRiderHeaderIsCanonical(
  mechanics: OngoingEffectMechanics,
): boolean {
  if (mechanics.level !== 1) return false;
  if (mechanics.school !== "transmutation") return false;
  if (!weaponDamageRiderRangeIsCanonical(mechanics.range)) return false;
  if (!weaponDamageRiderComponentsAreCanonical(mechanics.components)) {
    return false;
  }
  return weaponDamageRiderCastingTimeIsCanonical(mechanics.castingTime);
}

function weaponDamageRiderRangeIsCanonical(
  range: OngoingEffectMechanics["range"] | undefined,
): boolean {
  if (range?.kind !== "self") return false;
  return spellMechanicsObjectHasOnlyKeys(
    range,
    WEAPON_DAMAGE_RIDER_RANGE_FIELDS,
  );
}

function weaponDamageRiderComponentsAreCanonical(
  components: OngoingEffectMechanics["components"] | undefined,
): boolean {
  if (components?.v !== true) return false;
  if (components.s !== true) return false;
  if (components.m !== false) return false;
  return spellMechanicsObjectHasOnlyKeys(
    components,
    WEAPON_DAMAGE_RIDER_COMPONENT_FIELDS,
  );
}

function weaponDamageRiderCastingTimeIsCanonical(
  castingTime: OngoingEffectMechanics["castingTime"] | undefined,
): boolean {
  if (castingTime?.kind !== "bonus_action") return false;
  if (castingTime.trigger !== undefined) return false;
  return spellMechanicsObjectHasOnlyKeys(
    castingTime,
    WEAPON_DAMAGE_RIDER_CASTING_TIME_FIELDS,
  );
}

function weaponDamageRiderAttachmentIsCanonical(
  attachment: OngoingEffectMechanics["attachment"] | undefined,
): boolean {
  if (attachment?.kind !== "self") return false;
  return spellMechanicsObjectHasOnlyKeys(
    attachment,
    WEAPON_DAMAGE_RIDER_ATTACHMENT_FIELDS,
  );
}

function weaponDamageRiderDurationValue(
  duration: SpellMechanics["duration"] | undefined,
): SpellCanonicalDurationValue | undefined {
  if (
    duration?.kind !== "timed" ||
    !spellMechanicsObjectHasOnlyKeys(
      duration,
      WEAPON_DAMAGE_RIDER_DURATION_FIELDS,
    ) ||
    !spellMechanicsObjectHasOnlyKeys(
      duration.value,
      WEAPON_DAMAGE_RIDER_DURATION_VALUE_FIELDS,
    ) ||
    duration.value.unit !== "minute" ||
    duration.value.amount !== 1 ||
    !isSpellCanonicalDurationValue(duration.value)
  ) {
    return undefined;
  }
  return duration.value;
}

function weaponDamageRiderDurationExtensionsAreSupported(
  duration: SpellMechanics["duration"] | undefined,
): boolean {
  return duration?.kind === "timed" && duration.value.upcastTiers === undefined;
}

function weaponDamageRiderDurationEndingsAreSupported(
  duration: SpellMechanics["duration"] | undefined,
): boolean {
  return (
    duration?.kind === "timed" &&
    duration.earlyEnd === undefined &&
    duration.permanentAfter === undefined
  );
}

function weaponDamageRiderAmountIsCanonical(
  amount: DiceAmount | undefined,
): amount is WeaponDamageRiderFixedAmount {
  if (amount?.kind !== "fixed") return false;
  if (
    !spellMechanicsObjectHasOnlyKeys(amount, WEAPON_DAMAGE_RIDER_AMOUNT_FIELDS)
  ) {
    return false;
  }
  return weaponDamageRiderDiceExprIsCanonical(amount.expr);
}

function weaponDamageRiderDiceExprIsCanonical(
  expression: DiceExpr,
): expression is WeaponDamageRiderFixedAmount["expr"] {
  if (
    !spellMechanicsObjectHasOnlyKeys(
      expression,
      WEAPON_DAMAGE_RIDER_DICE_EXPR_FIELDS,
    )
  ) {
    return false;
  }
  if (expression.dice !== 1) return false;
  if (expression.dieSize !== 4) return false;
  if (expression.flat !== undefined) return false;
  if (expression.spellcastingMod !== undefined) return false;
  return expression.abilityModifier === undefined;
}

function weaponDamageRiderPositiveIntegerAt<const Expected extends number>(
  value: number,
  expected: Expected,
): (PositiveIntegerType & Expected) | undefined {
  const parsed = spellPositiveIntegerFromSurface(value);
  return parsed !== undefined &&
    weaponDamageRiderPositiveIntegerMatches(parsed, expected)
    ? parsed
    : undefined;
}

function weaponDamageRiderPositiveIntegerMatches<const Expected extends number>(
  value: PositiveIntegerType,
  expected: Expected,
): value is PositiveIntegerType & Expected {
  return Number(value) === expected;
}

function weaponDamageRiderDieSizeAt<const Expected extends DamageDieSize>(
  value: number,
  expected: Expected,
): (DamageDieSize & Expected) | undefined {
  return value === expected ? expected : undefined;
}

function weaponDamageRiderDamageProjection(
  amount: DiceAmount | undefined,
): WeaponDamageRiderDamageProjection | undefined {
  if (!weaponDamageRiderAmountIsCanonical(amount)) return undefined;
  const dice = weaponDamageRiderPositiveIntegerAt(amount.expr.dice, 1);
  const dieSize = weaponDamageRiderDieSizeAt(amount.expr.dieSize, 4);
  return dice === undefined || dieSize === undefined
    ? undefined
    : { dice, dieSize };
}

function weaponDamageRiderOperationRole(
  operation: OngoingOperation | undefined,
): operation is OngoingOperation & {
  readonly effect: Extract<EffectAtom, { readonly kind: "damage" }>;
} {
  if (operation === undefined) return false;
  if (
    !spellMechanicsObjectHasOnlyKeys(
      operation,
      WEAPON_DAMAGE_RIDER_OPERATION_FIELDS,
    )
  ) {
    return false;
  }
  if (operation.predicate !== undefined) return false;
  if (operation.targetLimit !== undefined) return false;
  if (operation.usageLimit !== undefined) return false;
  if (!weaponDamageRiderTriggerIsCanonical(operation.trigger)) return false;
  return weaponDamageRiderEffectHasCanonicalRole(operation.effect);
}

function weaponDamageRiderTriggerIsCanonical(
  trigger: OngoingOperation["trigger"],
): boolean {
  if (trigger.kind !== "on_caster_attack_hit") return false;
  return spellMechanicsObjectHasOnlyKeys(
    trigger,
    WEAPON_DAMAGE_RIDER_TRIGGER_FIELDS,
  );
}

function weaponDamageRiderEffectHasCanonicalRole(
  effect: OngoingOperation["effect"],
): effect is Extract<EffectAtom, { readonly kind: "damage" }> {
  if (effect.kind !== "damage") return false;
  if (
    !spellMechanicsObjectHasOnlyKeys(
      effect,
      WEAPON_DAMAGE_RIDER_DAMAGE_EFFECT_FIELDS,
    )
  ) {
    return false;
  }
  return effect.damageType === "radiant";
}

function weaponDamageRiderMechanicsEvidence(
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

type WeaponDamageRiderOperationProjection =
  | { readonly tag: "unsupportedOperation" }
  | { readonly tag: "unsupportedAmount" }
  | {
      readonly tag: "supported";
      readonly damage: WeaponDamageRiderDamageProjection;
    };
type WeaponDamageRiderDurationValueProjection =
  | { readonly tag: "unsupported" }
  | {
      readonly tag: "supported";
      readonly durationTicks: ElapsedTimeTicks;
    };
type WeaponDamageRiderDurationProjection = {
  readonly value: WeaponDamageRiderDurationValueProjection;
  readonly durationExtensionsSupported: boolean;
  readonly durationEndingsSupported: boolean;
};
type WeaponDamageRiderSupportedDurationProjection =
  WeaponDamageRiderDurationProjection & {
    readonly value: Extract<
      WeaponDamageRiderDurationValueProjection,
      { readonly tag: "supported" }
    >;
    readonly durationExtensionsSupported: true;
    readonly durationEndingsSupported: true;
  };
type WeaponDamageRiderMechanicsProjection = {
  readonly operation: WeaponDamageRiderOperationProjection;
  readonly duration: WeaponDamageRiderDurationProjection;
};

function weaponDamageRiderMechanicsProjection(
  mechanics: OngoingEffectMechanics,
): WeaponDamageRiderMechanicsProjection {
  return {
    operation: weaponDamageRiderOperationProjection(mechanics.operations[0]),
    duration: weaponDamageRiderDurationProjection(mechanics.duration),
  };
}

function weaponDamageRiderOperationProjection(
  operation: OngoingOperation | undefined,
): WeaponDamageRiderOperationProjection {
  if (!weaponDamageRiderOperationRole(operation)) {
    return { tag: "unsupportedOperation" };
  }
  const damage = weaponDamageRiderDamageProjection(operation.effect.amount);
  return damage === undefined
    ? { tag: "unsupportedAmount" }
    : { tag: "supported", damage };
}

function weaponDamageRiderDurationProjection(
  duration: SpellMechanics["duration"],
): WeaponDamageRiderDurationProjection {
  const durationValue = weaponDamageRiderDurationValue(duration);
  return {
    value:
      durationValue === undefined
        ? { tag: "unsupported" }
        : {
            tag: "supported",
            durationTicks: spellDurationTicksFromCanonicalValue(durationValue),
          },
    durationExtensionsSupported:
      weaponDamageRiderDurationExtensionsAreSupported(duration),
    durationEndingsSupported:
      weaponDamageRiderDurationEndingsAreSupported(duration),
  };
}

function weaponDamageRiderDurationIsSupported(
  projection: WeaponDamageRiderDurationProjection,
): projection is WeaponDamageRiderSupportedDurationProjection {
  if (!weaponDamageRiderDurationValueIsSupported(projection.value)) {
    return false;
  }
  if (!projection.durationExtensionsSupported) return false;
  return projection.durationEndingsSupported;
}

function weaponDamageRiderDurationValueIsSupported(
  projection: WeaponDamageRiderDurationValueProjection,
): projection is Extract<
  WeaponDamageRiderDurationValueProjection,
  { readonly tag: "supported" }
> {
  return Match.value(projection).pipe(
    Match.when({ tag: "unsupported" }, () => false),
    Match.when({ tag: "supported" }, () => true),
    Match.exhaustive,
  );
}

function weaponDamageRiderMechanicsIssues(
  source: SpellMechanicsAdmissionSource,
  mechanics: OngoingEffectMechanics,
  projection: WeaponDamageRiderMechanicsProjection,
): readonly WeaponDamageRiderMechanicsIssue[] {
  return [
    ...weaponDamageRiderLevelIssues(source, mechanics),
    ...weaponDamageRiderRootIssues(mechanics),
    ...weaponDamageRiderSchoolIssues(mechanics),
    ...weaponDamageRiderRangeIssues(source, mechanics),
    ...weaponDamageRiderComponentsShapeIssues(mechanics),
    ...weaponDamageRiderDurationDefinitionIssues(source, mechanics),
    ...weaponDamageRiderComponentsDefinitionIssues(source, mechanics),
    ...weaponDamageRiderDurationIssues(mechanics, projection),
    ...weaponDamageRiderCastingTimeIssues(mechanics),
    ...weaponDamageRiderAttachmentIssues(mechanics),
    ...weaponDamageRiderOperationCountIssues(mechanics),
    ...weaponDamageRiderDamageIssues(projection),
  ];
}

function weaponDamageRiderLevelIssues(
  source: SpellMechanicsAdmissionSource,
  mechanics: OngoingEffectMechanics,
): readonly WeaponDamageRiderMechanicsIssue[] {
  return weaponDamageRiderUnsupportedFactIssues(
    mechanics.level === 1 &&
      source.spellDefinitionRuleFacts.level === mechanics.level,
    "level",
    spellMechanicsHeaderPath("level"),
  );
}

function weaponDamageRiderRootIssues(
  mechanics: OngoingEffectMechanics,
): readonly WeaponDamageRiderMechanicsIssue[] {
  return weaponDamageRiderUnsupportedFactIssues(
    spellMechanicsObjectHasOnlyKeys(mechanics, WEAPON_DAMAGE_RIDER_ROOT_FIELDS),
    "operationCount",
    spellMechanicsHeaderPath("family"),
  );
}

function weaponDamageRiderSchoolIssues(
  mechanics: OngoingEffectMechanics,
): readonly WeaponDamageRiderMechanicsIssue[] {
  return weaponDamageRiderUnsupportedFactIssues(
    mechanics.school === "transmutation",
    "school",
    spellMechanicsHeaderPath("school"),
  );
}

function weaponDamageRiderRangeIssues(
  source: SpellMechanicsAdmissionSource,
  mechanics: OngoingEffectMechanics,
): readonly WeaponDamageRiderMechanicsIssue[] {
  return weaponDamageRiderUnsupportedFactIssues(
    weaponDamageRiderRangeIsCanonical(mechanics.range) &&
      source.spellDefinitionRuleFacts.range.kind === mechanics.range.kind,
    "range",
    spellMechanicsHeaderPath("range"),
  );
}

function weaponDamageRiderComponentsShapeIssues(
  mechanics: OngoingEffectMechanics,
): readonly WeaponDamageRiderMechanicsIssue[] {
  return weaponDamageRiderUnsupportedFactIssues(
    weaponDamageRiderComponentsAreCanonical(mechanics.components),
    "components",
    spellMechanicsHeaderPath("components"),
  );
}

function weaponDamageRiderDurationDefinitionIssues(
  source: SpellMechanicsAdmissionSource,
  mechanics: OngoingEffectMechanics,
): readonly WeaponDamageRiderMechanicsIssue[] {
  return weaponDamageRiderUnsupportedFactIssues(
    weaponDamageRiderDefinitionDurationMatches(
      source.spellDefinitionRuleFacts.duration,
      mechanics.duration,
    ),
    "duration",
    spellMechanicsHeaderPath("duration"),
  );
}

function weaponDamageRiderDefinitionDurationMatches(
  definitionDuration: SpellDefinitionRuleFacts["duration"],
  mechanicsDuration: SpellMechanics["duration"],
): boolean {
  if (definitionDuration.kind !== mechanicsDuration.kind) return false;
  if (definitionDuration.kind !== "timed") return false;
  if (mechanicsDuration.kind !== "timed") return false;
  if (definitionDuration.value.unit !== mechanicsDuration.value.unit) {
    return false;
  }
  return definitionDuration.value.amount === mechanicsDuration.value.amount;
}

function weaponDamageRiderComponentsDefinitionIssues(
  source: SpellMechanicsAdmissionSource,
  mechanics: OngoingEffectMechanics,
): readonly WeaponDamageRiderMechanicsIssue[] {
  const definitionComponents = source.spellDefinitionRuleFacts.components;
  return weaponDamageRiderUnsupportedFactIssues(
    definitionComponents.verbal === mechanics.components.v &&
      definitionComponents.somatic === mechanics.components.s &&
      definitionComponents.hasMaterial === (mechanics.components.m !== false),
    "components",
    spellMechanicsHeaderPath("components"),
  );
}

function weaponDamageRiderDurationIssues(
  mechanics: OngoingEffectMechanics,
  projection: WeaponDamageRiderMechanicsProjection,
): readonly WeaponDamageRiderMechanicsIssue[] {
  return weaponDamageRiderDurationIsSupported(projection.duration)
    ? []
    : [
        weaponDamageRiderMechanicsIssue(
          "duration",
          spellMechanicsHeaderPath("duration"),
        ),
        ...weaponDamageRiderDurationValueIssues(mechanics, projection),
        ...weaponDamageRiderDurationExtensionIssues(mechanics, projection),
        ...weaponDamageRiderDurationEndingIssues(mechanics, projection),
      ];
}

function weaponDamageRiderDurationValueIssues(
  mechanics: OngoingEffectMechanics,
  projection: WeaponDamageRiderMechanicsProjection,
): readonly WeaponDamageRiderMechanicsIssue[] {
  return Match.value(projection.duration.value).pipe(
    Match.when({ tag: "unsupported" }, () =>
      spellDurationValueEvidencePaths(mechanics.duration).map((path) =>
        weaponDamageRiderMechanicsIssue("durationValue", path),
      ),
    ),
    Match.when({ tag: "supported" }, () => []),
    Match.exhaustive,
  );
}

function weaponDamageRiderDurationExtensionIssues(
  mechanics: OngoingEffectMechanics,
  projection: WeaponDamageRiderMechanicsProjection,
): readonly WeaponDamageRiderMechanicsIssue[] {
  return projection.duration.durationExtensionsSupported
    ? []
    : spellDurationChildCoordinates(mechanics.duration)
        .filter((child) => child.branch === "extension")
        .map((child) =>
          weaponDamageRiderMechanicsIssue(
            spellDurationChildFailedFact(child),
            spellDurationChildPath(child),
          ),
        );
}

function weaponDamageRiderDurationEndingIssues(
  mechanics: OngoingEffectMechanics,
  projection: WeaponDamageRiderMechanicsProjection,
): readonly WeaponDamageRiderMechanicsIssue[] {
  return projection.duration.durationEndingsSupported
    ? []
    : spellDurationChildCoordinates(mechanics.duration)
        .filter((child) => child.branch === "ending")
        .map((child) =>
          weaponDamageRiderMechanicsIssue(
            spellDurationChildFailedFact(child),
            spellDurationChildPath(child),
          ),
        );
}

function weaponDamageRiderCastingTimeIssues(
  mechanics: OngoingEffectMechanics,
): readonly WeaponDamageRiderMechanicsIssue[] {
  return weaponDamageRiderUnsupportedFactIssues(
    weaponDamageRiderCastingTimeIsCanonical(mechanics.castingTime),
    "castingTime",
    spellMechanicsHeaderPath("castingTime"),
  );
}

function weaponDamageRiderAttachmentIssues(
  mechanics: OngoingEffectMechanics,
): readonly WeaponDamageRiderMechanicsIssue[] {
  return weaponDamageRiderUnsupportedFactIssues(
    weaponDamageRiderAttachmentIsCanonical(mechanics.attachment),
    "attachment",
    spellOngoingAttachmentPath(),
  );
}

function weaponDamageRiderOperationCountIssues(
  mechanics: OngoingEffectMechanics,
): readonly WeaponDamageRiderMechanicsIssue[] {
  if (mechanics.operations.length === 1) return [];
  if (mechanics.operations.length === 0) {
    return [
      weaponDamageRiderMechanicsIssue(
        "operationCount",
        spellOngoingOperationPath(PositiveInteger(1)),
      ),
    ];
  }
  return mechanics.operations
    .slice(1)
    .map((_operation, index) =>
      weaponDamageRiderMechanicsIssue(
        "operationCount",
        spellOngoingOperationPath(PositiveInteger(index + 2)),
      ),
    );
}

function weaponDamageRiderDamageIssues(
  projection: WeaponDamageRiderMechanicsProjection,
): readonly WeaponDamageRiderMechanicsIssue[] {
  const effectPath = spellOngoingOperationEffectPath(PositiveInteger(1));
  return Match.value(projection.operation).pipe(
    Match.when({ tag: "unsupportedOperation" }, () => [
      weaponDamageRiderMechanicsIssue("damageEffect", effectPath),
    ]),
    Match.when({ tag: "unsupportedAmount" }, () => [
      weaponDamageRiderMechanicsIssue("damageAmount", effectPath),
    ]),
    Match.when({ tag: "supported" }, () => []),
    Match.exhaustive,
  );
}

function weaponDamageRiderMechanicsIssue(
  failedFact: WeaponDamageRiderFailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
): WeaponDamageRiderMechanicsIssue {
  return { failedFact, mechanicsPath };
}

function weaponDamageRiderUnsupportedFactIssues(
  factIsSupported: boolean,
  failedFact: WeaponDamageRiderFailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
): readonly WeaponDamageRiderMechanicsIssue[] {
  return factIsSupported
    ? []
    : [weaponDamageRiderMechanicsIssue(failedFact, mechanicsPath)];
}

function admitWeaponDamageRiderMechanics(
  source: SpellMechanicsAdmissionSource,
): WeaponDamageRiderMechanicsInspection {
  if (!weaponDamageRiderStructuralCandidate(source.mechanics)) {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const missingRootIssues = weaponDamageRiderMissingRootIssues(mechanics);
  if (missingRootIssues !== undefined) {
    return {
      tag: "unsupported",
      issues: weaponDamageRiderIssueResults(missingRootIssues),
    };
  }
  const projection = weaponDamageRiderMechanicsProjection(mechanics);
  const issues = weaponDamageRiderMechanicsIssues(
    source,
    mechanics,
    projection,
  );
  const uniqueIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (uniqueIssues !== undefined) {
    return {
      tag: "unsupported",
      issues: weaponDamageRiderIssueResults(uniqueIssues),
    };
  }
  return Match.value(weaponDamageRiderReadiness(projection)).pipe(
    Match.when(
      { tag: "unsupported" },
      ({ issue }): WeaponDamageRiderUnsupportedInspection => ({
        tag: "unsupported",
        issues: [weaponDamageRiderIssueResult(issue)],
      }),
    ),
    Match.when({ tag: "supported" }, (readiness) =>
      supportedWeaponDamageRiderInspection(source, mechanics, readiness),
    ),
    Match.exhaustive,
  );
}

function weaponDamageRiderIssueResults(
  issues: ReadonlyNonEmptyArray<WeaponDamageRiderMechanicsIssue>,
): ReadonlyNonEmptyArray<WeaponDamageRiderAdmissionIssue> {
  const [first, ...rest] = issues;
  return [
    weaponDamageRiderIssueResult(first),
    ...rest.map(weaponDamageRiderIssueResult),
  ];
}

type WeaponDamageRiderReadiness =
  | {
      readonly tag: "unsupported";
      readonly issue: WeaponDamageRiderMechanicsIssue;
    }
  | {
      readonly tag: "supported";
      readonly durationTicks: ElapsedTimeTicks;
      readonly damage: WeaponDamageRiderDamageProjection;
    };
type WeaponDamageRiderUnsupportedReadiness = Extract<
  WeaponDamageRiderReadiness,
  { readonly tag: "unsupported" }
>;

function weaponDamageRiderReadiness(
  projection: WeaponDamageRiderMechanicsProjection,
): WeaponDamageRiderReadiness {
  return Match.value(projection.operation).pipe(
    Match.when(
      { tag: "unsupportedOperation" },
      (): WeaponDamageRiderUnsupportedReadiness => ({
        tag: "unsupported",
        issue: weaponDamageRiderOperationIssue("damageEffect"),
      }),
    ),
    Match.when(
      { tag: "unsupportedAmount" },
      (): WeaponDamageRiderUnsupportedReadiness => ({
        tag: "unsupported",
        issue: weaponDamageRiderOperationIssue("damageAmount"),
      }),
    ),
    Match.when({ tag: "supported" }, ({ damage }) =>
      weaponDamageRiderDurationReadiness(projection.duration, damage),
    ),
    Match.exhaustive,
  );
}

function weaponDamageRiderOperationIssue(
  failedFact: "damageEffect" | "damageAmount",
): WeaponDamageRiderMechanicsIssue {
  const effectPath = spellOngoingOperationEffectPath(PositiveInteger(1));
  return { failedFact, mechanicsPath: effectPath };
}

function weaponDamageRiderDurationReadiness(
  duration: WeaponDamageRiderDurationProjection,
  damage: WeaponDamageRiderDamageProjection,
): WeaponDamageRiderReadiness {
  if (!weaponDamageRiderDurationIsSupported(duration)) {
    return { tag: "unsupported", issue: weaponDamageRiderDurationIssue() };
  }
  return {
    tag: "supported",
    durationTicks: duration.value.durationTicks,
    damage,
  };
}

function weaponDamageRiderDurationIssue(): WeaponDamageRiderMechanicsIssue {
  return {
    failedFact: "duration",
    mechanicsPath: spellMechanicsHeaderPath("duration"),
  };
}

function supportedWeaponDamageRiderInspection(
  source: SpellMechanicsAdmissionSource,
  mechanics: OngoingEffectMechanics,
  readiness: Extract<WeaponDamageRiderReadiness, { readonly tag: "supported" }>,
): Extract<
  WeaponDamageRiderMechanicsInspection,
  { readonly tag: "supported" }
> {
  const facts = {
    ...source.spellDefinitionRuleFacts,
    durationTicks: readiness.durationTicks,
    damage: readiness.damage,
  } satisfies WeaponDamageRiderMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "weaponDamageRider",
      facts,
      evidence: weaponDamageRiderMechanicsEvidence(mechanics),
      admit: (executionSource, ctx) =>
        admitWeaponDamageRider(executionSource, ctx, facts),
    },
  };
}

function admitWeaponDamageRider(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: WeaponDamageRiderMechanicsFacts,
): readonly WeaponDamageRiderInvocation[] {
  const activeEffect = weaponDamageRiderActiveEffect(
    ctx.actor.combatantId,
    facts,
  );
  return ctx.spellCastOptions.flatMap(
    (slot): readonly WeaponDamageRiderInvocation[] =>
      Number(slot.spellLevel) < facts.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "weaponDamageRider",
              spell,
              actionCost: "bonusAction",
              activeEffect,
            },
          ],
  );
}

function weaponDamageRiderActiveEffect(
  actorId: CombatantId,
  facts: WeaponDamageRiderMechanicsFacts,
): WeaponDamageRiderInvocation["activeEffect"] {
  return {
    kind: "spellWeaponDamageRider",
    sourceCombatantId: actorId,
    damage: {
      expr: facts.damage,
      damageType: "radiant",
    },
    expiresAt: {
      kind: "duration",
      durationTicks: facts.durationTicks,
    },
  };
}

function discoverWeaponDamageRiderCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: import("../../battle-state-execution.ts").BattleExecutableSpellInvocation<WeaponDamageRiderInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  return [
    spellCastCandidate(
      "bonusActionSpell",
      actorId,
      invocation.sourceProcedureRef,
      [],
    ),
  ];
}

function resolveWeaponDamageRider(
  input: WeaponDamageRiderResolveInput,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!fillsBelongToSpellCastHoles(input.input.fills)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Weapon damage rider spells do not use target, roll, damage, or save fills.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const spellCastReactionWindow = maybeOpenConfiguredSpellCastReactionWindow({
    resolution: input,
    targetIds: [input.actorId],
  });
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const actor = input.input.state.combatants.get(input.actorId);
  if (actor === undefined) {
    return invalidResult(
      input.input.state,
      "missingCombatant",
      "Bonus Action spell actor is not in this battle.",
    );
  }
  const effected = replaceTargetActiveEffect(
    input.input.state,
    input.actorId,
    (effect) =>
      effect.kind === "spellWeaponDamageRider" &&
      effect.sourceProcedureRef === input.invocation.sourceProcedureRef &&
      effect.sourceCombatantId === input.actorId,
    {
      ...input.invocation.activeEffect,
      sourceProcedureRef: input.invocation.sourceProcedureRef,
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

const WeaponDamageRiderInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("weaponDamageRider"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("bonusAction"),
    activeEffect: SpellWeaponDamageRiderTemplateSchema,
  }),
);
export const weaponDamageRiderProfile: SpellProcedureDeclaration<
  "weaponDamageRider",
  WeaponDamageRiderInvocation
> = {
  procedure: "weaponDamageRider",
  executionSchema: WeaponDamageRiderInvocationSchema,
  admitMechanics: admitWeaponDamageRiderMechanics,
  discoverCastAct: discoverWeaponDamageRiderCastAct,
  resolve: resolveWeaponDamageRider,
};
