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
import { Schema } from "effect";
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
  mechanics: SpellMechanics,
): ReadonlyNonEmptyArray<WeaponDamageRiderMechanicsIssue> | undefined {
  if (mechanics.family !== "ongoing_effect") return undefined;
  const ongoing = mechanics;
  const issues: WeaponDamageRiderMechanicsIssue[] = [];
  const push = (
    failedFact: WeaponDamageRiderFailedFact,
    mechanicsPath: SpellMechanicsBranchPath,
  ) => issues.push({ failedFact, mechanicsPath });
  if (ongoing.level === undefined)
    push("level", spellMechanicsHeaderPath("level"));
  if (ongoing.school === undefined)
    push("school", spellMechanicsHeaderPath("school"));
  if (ongoing.range === undefined)
    push("range", spellMechanicsHeaderPath("range"));
  if (ongoing.components === undefined)
    push("components", spellMechanicsHeaderPath("components"));
  if (ongoing.duration === undefined)
    push("duration", spellMechanicsHeaderPath("duration"));
  if (ongoing.castingTime === undefined)
    push("castingTime", spellMechanicsHeaderPath("castingTime"));
  if (ongoing.attachment === undefined)
    push("attachment", spellOngoingAttachmentPath());
  if (ongoing.operations === undefined)
    push("operationCount", spellOngoingOperationPath(PositiveInteger(1)));
  return spellProcedureNonEmpty(issues);
}

function weaponDamageRiderStructuralCandidate(
  mechanics: SpellMechanics,
): boolean {
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
        present:
          mechanics.level === 1 &&
          mechanics.school === "transmutation" &&
          mechanics.range?.kind === "self" &&
          spellMechanicsObjectHasOnlyKeys(
            mechanics.range,
            WEAPON_DAMAGE_RIDER_RANGE_FIELDS,
          ) &&
          mechanics.components?.v === true &&
          mechanics.components.s === true &&
          mechanics.components.m === false &&
          spellMechanicsObjectHasOnlyKeys(
            mechanics.components,
            WEAPON_DAMAGE_RIDER_COMPONENT_FIELDS,
          ) &&
          mechanics.castingTime?.kind === "bonus_action" &&
          mechanics.castingTime.trigger === undefined &&
          spellMechanicsObjectHasOnlyKeys(
            mechanics.castingTime,
            WEAPON_DAMAGE_RIDER_CASTING_TIME_FIELDS,
          ),
      },
      {
        name: "duration",
        present:
          weaponDamageRiderDurationValue(mechanics.duration) !== undefined &&
          weaponDamageRiderDurationExtensionsAreSupported(mechanics.duration) &&
          weaponDamageRiderDurationEndingsAreSupported(mechanics.duration),
      },
      {
        name: "attachment",
        present:
          mechanics.attachment?.kind === "self" &&
          spellMechanicsObjectHasOnlyKeys(
            mechanics.attachment,
            WEAPON_DAMAGE_RIDER_ATTACHMENT_FIELDS,
          ),
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
  return (
    amount?.kind === "fixed" &&
    spellMechanicsObjectHasOnlyKeys(
      amount,
      WEAPON_DAMAGE_RIDER_AMOUNT_FIELDS,
    ) &&
    spellMechanicsObjectHasOnlyKeys(
      amount.expr,
      WEAPON_DAMAGE_RIDER_DICE_EXPR_FIELDS,
    ) &&
    amount.expr.dice === 1 &&
    amount.expr.dieSize === 4 &&
    amount.expr.flat === undefined &&
    amount.expr.spellcastingMod === undefined &&
    amount.expr.abilityModifier === undefined
  );
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
  return (
    operation !== undefined &&
    spellMechanicsObjectHasOnlyKeys(
      operation,
      WEAPON_DAMAGE_RIDER_OPERATION_FIELDS,
    ) &&
    operation.predicate === undefined &&
    operation.targetLimit === undefined &&
    operation.usageLimit === undefined &&
    operation.trigger.kind === "on_caster_attack_hit" &&
    spellMechanicsObjectHasOnlyKeys(
      operation.trigger,
      WEAPON_DAMAGE_RIDER_TRIGGER_FIELDS,
    ) &&
    operation.effect.kind === "damage" &&
    spellMechanicsObjectHasOnlyKeys(
      operation.effect,
      WEAPON_DAMAGE_RIDER_DAMAGE_EFFECT_FIELDS,
    ) &&
    operation.effect.damageType === "radiant"
  );
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

function admitWeaponDamageRiderMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "weaponDamageRider",
  WeaponDamageRiderMechanicsFacts,
  WeaponDamageRiderInvocation,
  WeaponDamageRiderAdmissionIssue
> {
  if (!weaponDamageRiderStructuralCandidate(source.mechanics)) {
    return { tag: "notRepresented" };
  }
  const missingRootIssues = weaponDamageRiderMissingRootIssues(
    source.mechanics,
  );
  if (missingRootIssues !== undefined) {
    const issues = spellProcedureNonEmpty(
      missingRootIssues.map(weaponDamageRiderIssueResult),
    );
    if (issues === undefined) return { tag: "notRepresented" };
    return {
      tag: "unsupported",
      issues,
    };
  }
  if (source.mechanics.family !== "ongoing_effect") {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const operation = mechanics.operations[0];
  const operationRole = weaponDamageRiderOperationRole(operation)
    ? operation
    : undefined;
  const durationValue = weaponDamageRiderDurationValue(mechanics.duration);
  const durationExtensionsSupported =
    weaponDamageRiderDurationExtensionsAreSupported(mechanics.duration);
  const durationEndingsSupported = weaponDamageRiderDurationEndingsAreSupported(
    mechanics.duration,
  );
  const durationSupported =
    durationValue !== undefined &&
    durationExtensionsSupported &&
    durationEndingsSupported;
  const durationTicks =
    durationValue === undefined
      ? undefined
      : spellDurationTicksFromCanonicalValue(durationValue);
  const damage =
    operationRole === undefined
      ? undefined
      : weaponDamageRiderDamageProjection(operationRole.effect.amount);
  const issues: WeaponDamageRiderMechanicsIssue[] = [];
  const push = (
    failedFact: WeaponDamageRiderFailedFact,
    mechanicsPath: SpellMechanicsBranchPath,
  ) => issues.push({ failedFact, mechanicsPath });

  if (
    mechanics.level !== 1 ||
    source.spellDefinitionRuleFacts.level !== mechanics.level
  )
    push("level", spellMechanicsHeaderPath("level"));
  if (
    !spellMechanicsObjectHasOnlyKeys(mechanics, WEAPON_DAMAGE_RIDER_ROOT_FIELDS)
  ) {
    push("operationCount", spellMechanicsHeaderPath("family"));
  }
  if (mechanics.school !== "transmutation") {
    push("school", spellMechanicsHeaderPath("school"));
  }
  if (
    mechanics.range.kind !== "self" ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.range,
      WEAPON_DAMAGE_RIDER_RANGE_FIELDS,
    ) ||
    source.spellDefinitionRuleFacts.range.kind !== mechanics.range.kind
  ) {
    push("range", spellMechanicsHeaderPath("range"));
  }
  if (
    mechanics.components.v !== true ||
    mechanics.components.s !== true ||
    mechanics.components.m !== false ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.components,
      WEAPON_DAMAGE_RIDER_COMPONENT_FIELDS,
    )
  ) {
    push("components", spellMechanicsHeaderPath("components"));
  }
  const definitionFacts = source.spellDefinitionRuleFacts;
  if (
    definitionFacts.duration.kind !== mechanics.duration.kind ||
    definitionFacts.duration.kind !== "timed" ||
    mechanics.duration.kind !== "timed" ||
    definitionFacts.duration.value.unit !== mechanics.duration.value.unit ||
    definitionFacts.duration.value.amount !== mechanics.duration.value.amount
  ) {
    push("duration", spellMechanicsHeaderPath("duration"));
  }
  if (
    definitionFacts.components.verbal !== mechanics.components.v ||
    definitionFacts.components.somatic !== mechanics.components.s ||
    definitionFacts.components.hasMaterial !==
      (mechanics.components.m !== false)
  ) {
    push("components", spellMechanicsHeaderPath("components"));
  }
  if (!durationSupported) {
    push("duration", spellMechanicsHeaderPath("duration"));
    if (durationValue === undefined)
      for (const path of spellDurationValueEvidencePaths(mechanics.duration))
        push("durationValue", path);
    if (!durationExtensionsSupported)
      for (const child of spellDurationChildCoordinates(mechanics.duration))
        if (child.branch === "extension")
          push(
            spellDurationChildFailedFact(child),
            spellDurationChildPath(child),
          );
    if (!durationEndingsSupported)
      for (const child of spellDurationChildCoordinates(mechanics.duration))
        if (child.branch === "ending")
          push(
            spellDurationChildFailedFact(child),
            spellDurationChildPath(child),
          );
  }
  if (
    mechanics.castingTime.kind !== "bonus_action" ||
    mechanics.castingTime.trigger !== undefined ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.castingTime,
      WEAPON_DAMAGE_RIDER_CASTING_TIME_FIELDS,
    )
  ) {
    push("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  if (
    mechanics.attachment.kind !== "self" ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.attachment,
      WEAPON_DAMAGE_RIDER_ATTACHMENT_FIELDS,
    )
  ) {
    push("attachment", spellOngoingAttachmentPath());
  }
  if (mechanics.operations.length !== 1) {
    for (const [index] of mechanics.operations.entries()) {
      if (index === 0) continue;
      push(
        "operationCount",
        spellOngoingOperationPath(PositiveInteger(index + 1)),
      );
    }
    if (mechanics.operations.length === 0) {
      push("operationCount", spellOngoingOperationPath(PositiveInteger(1)));
    }
  }
  if (operationRole === undefined) {
    push("damageEffect", spellOngoingOperationEffectPath(PositiveInteger(1)));
  } else if (damage === undefined) {
    push("damageAmount", spellOngoingOperationEffectPath(PositiveInteger(1)));
  }

  const uniqueIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (uniqueIssues !== undefined) {
    const [first, ...rest] = uniqueIssues.map(weaponDamageRiderIssueResult);
    return { tag: "unsupported", issues: [first, ...rest] };
  }
  if (
    operationRole === undefined ||
    damage === undefined ||
    !durationSupported ||
    durationTicks === undefined
  ) {
    return {
      tag: "unsupported",
      issues: [
        weaponDamageRiderIssueResult({
          failedFact:
            operationRole === undefined
              ? "damageEffect"
              : damage === undefined
                ? "damageAmount"
                : "duration",
          mechanicsPath:
            operationRole === undefined
              ? spellOngoingOperationEffectPath(PositiveInteger(1))
              : damage === undefined
                ? spellOngoingOperationEffectPath(PositiveInteger(1))
                : spellMechanicsHeaderPath("duration"),
        }),
      ],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    durationTicks,
    damage,
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
