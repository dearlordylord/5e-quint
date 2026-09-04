// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-weapon-attack-override
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS
//
// The weaponAttackOverride Spell Procedure Profile: a Bonus Action cantrip
// that attaches a timed spellcasting-ability attack and damage override to an
// exact held Club or Quarterstaff item.
//
// RAW anchors:
//   - SRD 5.2.1 Spells "Shillelagh": Bonus Action, Self, 1 minute; a held
//     Club or Quarterstaff can use spellcasting ability for melee attack and
//     damage rolls, changes weapon damage dice, and can deal Force or normal
//     weapon damage. The spell ends early if cast again or the weapon is let go.
//   - UBIQUITOUS_LANGUAGE.md: Bonus Action, Attack Roll, Damage Roll, Damage
//     Type, and Weapon Property.

import { PositiveInteger, type ReadonlyNonEmptyArray } from "@dnd/shared/types";
import {
  interruptWindowProgress,
  snapshotBattle,
  type BattleInterruptWindowProgress,
} from "../interrupt-execution.ts";
import {
  admitWeaponAttackOverride,
  type WeaponAttackOverrideDamageDieFacts,
  type WeaponAttackOverrideInvocation,
  type WeaponAttackOverrideMechanicsProjection,
} from "../../weapon-attack-override-admission.ts";
import { activeDruidWildShapeEffect } from "../druid-wild-shape.ts";
import { loadoutHeldWeaponSlotIsUsable } from "../wild-shape-equipment.ts";
import { battleObjectIsOnGround } from "../battle-object-lifecycle.ts";
import {
  discoverWeaponAttackOverrideCastAct,
  weaponAttackOverrideExecutor,
  WeaponAttackOverrideExecutionSchema,
} from "../../procedure-execution/weapon-attack-override.ts";
import { spellCastInterruptFrame } from "../spell-cast-interrupt-frame.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import type { SpellProcedureDeclaration } from "./profile.ts";
import { allocateBattleEffectOccurrenceForCreature } from "../../effect-execution-ref.ts";
import type {
  DiceAmount,
  DiceExpr,
  EffectAtom,
  SpellMechanics,
} from "@dnd/surface/surface/types";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import {
  spellDurationChildCoordinates,
  spellDurationChildFailedFact,
  spellDurationChildPath,
  spellDurationEvidencePaths,
  spellDurationValueEvidencePaths,
  spellMechanicsFixedTableEntries,
  spellMechanicsObjectHasOnlyKeys,
  isSpellCanonicalDurationValue,
  spellProcedureNonEmpty,
  spellUniqueMechanicsIssues,
  spellCharacterLevelFromSurface,
  spellDurationTicksFromCanonicalValue,
  type SpellCanonicalDurationValue,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureAdmissionIssue,
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

type WeaponAttackOverrideProfile = SpellProcedureDeclaration<
  "weaponAttackOverride",
  WeaponAttackOverrideInvocation,
  WeaponAttackOverrideMechanicsFacts,
  WeaponAttackOverrideAdmissionIssue
>;

type OngoingEffectMechanics = Extract<
  SpellMechanics,
  { readonly family: "ongoing_effect" }
>;
type OngoingOperation = OngoingEffectMechanics["operations"][number];
type OverrideWeaponAttackEffect = Extract<
  EffectAtom,
  { readonly kind: "override_attached_weapon_attack" }
>;
type OverrideDamageDie = Extract<
  DiceAmount,
  { readonly kind: "threshold_tiers" }
>;
type WeaponAttackOverrideMechanicsFacts = SpellDefinitionRuleFacts & {
  readonly durationValue: SpellCanonicalDurationValue;
  readonly damageDie: WeaponAttackOverrideDamageDieFacts;
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- This module-private tuple is the canonical source for WeaponAttackOverrideFailedFact.
const WEAPON_ATTACK_OVERRIDE_FAILED_FACTS = [
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
  "operation",
  "overrideEffect",
  "damageDie",
] as const;
type WeaponAttackOverrideFailedFact =
  (typeof WEAPON_ATTACK_OVERRIDE_FAILED_FACTS)[number];
type WeaponAttackOverrideMechanicsIssue = {
  readonly failedFact: WeaponAttackOverrideFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};
type WeaponAttackOverrideAdmissionIssue = SpellProcedureAdmissionIssue<
  "weaponAttackOverride",
  WeaponAttackOverrideFailedFact,
  SpellMechanicsBranchPath
>;

const WEAPON_ATTACK_OVERRIDE_ROOT_FIELDS = [
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
const WEAPON_ATTACK_OVERRIDE_RANGE_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<
  keyof Extract<SpellMechanics["range"], { readonly kind: "self" }>
>;
const WEAPON_ATTACK_OVERRIDE_COMPONENT_FIELDS = [
  "v",
  "s",
  "m",
] as const satisfies ReadonlyArray<keyof SpellMechanics["components"]>;
const WEAPON_ATTACK_OVERRIDE_DURATION_FIELDS = [
  "kind",
  "value",
  "earlyEnd",
  "permanentAfter",
] as const satisfies ReadonlyArray<
  keyof Extract<SpellMechanics["duration"], { readonly kind: "timed" }>
>;
const WEAPON_ATTACK_OVERRIDE_DURATION_VALUE_FIELDS = [
  "unit",
  "amount",
  "upcastTiers",
] as const satisfies ReadonlyArray<
  keyof Extract<SpellMechanics["duration"], { readonly kind: "timed" }>["value"]
>;
const WEAPON_ATTACK_OVERRIDE_DURATION_END_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<
  keyof NonNullable<
    Extract<SpellMechanics["duration"], { readonly kind: "timed" }>["earlyEnd"]
  >[number]
>;
const WEAPON_ATTACK_OVERRIDE_CASTING_TIME_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<
  keyof Extract<
    OngoingEffectMechanics["castingTime"],
    { readonly kind: "bonus_action" }
  >
>;
const WEAPON_ATTACK_OVERRIDE_ATTACHMENT_FIELDS = [
  "kind",
  "heldBy",
  "count",
  "weaponIds",
] as const satisfies ReadonlyArray<
  keyof Extract<
    OngoingEffectMechanics["attachment"],
    { readonly kind: "held_weapon" }
  >
>;
const WEAPON_ATTACK_OVERRIDE_OPERATION_FIELDS = [
  "trigger",
  "predicate",
  "targetLimit",
  "effect",
  "usageLimit",
] as const satisfies ReadonlyArray<keyof OngoingOperation>;
const WEAPON_ATTACK_OVERRIDE_TRIGGER_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<keyof OngoingOperation["trigger"]>;
const WEAPON_ATTACK_OVERRIDE_EFFECT_FIELDS = [
  "kind",
  "replacesAbility",
  "attackRollAbility",
  "damageRollAbility",
  "attackScope",
  "damageDie",
  "damageTypeChoice",
] as const satisfies ReadonlyArray<keyof OverrideWeaponAttackEffect>;
const WEAPON_ATTACK_OVERRIDE_DAMAGE_DIE_FIELDS = [
  "kind",
  "axis",
  "base",
  "tiers",
] as const satisfies ReadonlyArray<keyof OverrideDamageDie>;
const WEAPON_ATTACK_OVERRIDE_DICE_EXPR_FIELDS = [
  "dice",
  "dieSize",
  "flat",
  "spellcastingMod",
  "abilityModifier",
] as const satisfies ReadonlyArray<keyof DiceExpr>;
const WEAPON_ATTACK_OVERRIDE_TIER_FIELDS = [
  "atLevel",
  "override",
] as const satisfies ReadonlyArray<keyof OverrideDamageDie["tiers"][number]>;
const WEAPON_ATTACK_OVERRIDE_TIER_OVERRIDE_FIELDS = [
  "dice",
  "dieSize",
  "flat",
] as const satisfies ReadonlyArray<
  keyof OverrideDamageDie["tiers"][number]["override"]
>;
const WEAPON_ATTACK_OVERRIDE_DAMAGE_TIERS = [
  { atLevel: 5, override: { dieSize: 10 } },
  { atLevel: 11, override: { dieSize: 12 } },
  { atLevel: 17, override: { dice: 2, dieSize: 6 } },
] as const;

function weaponAttackOverrideDamageTierMatches(
  actual: OverrideDamageDie["tiers"][number]["override"],
  expected: (typeof WEAPON_ATTACK_OVERRIDE_DAMAGE_TIERS)[number]["override"],
): boolean {
  return (
    ("dice" in actual ? actual.dice : undefined) ===
      ("dice" in expected ? expected.dice : undefined) &&
    actual.dieSize === expected.dieSize &&
    ("flat" in actual ? actual.flat : undefined) ===
      ("flat" in expected ? expected.flat : undefined)
  );
}

function weaponAttackOverrideIssueResult(
  issue: WeaponAttackOverrideMechanicsIssue,
): WeaponAttackOverrideAdmissionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "weaponAttackOverride",
    failedFact: issue.failedFact,
    mechanicsPath: issue.mechanicsPath,
    message: `Unsupported weaponAttackOverride mechanics fact: ${issue.failedFact}.`,
  };
}

function weaponAttackOverrideMissingRootIssues(
  mechanics: SpellMechanics,
): ReadonlyNonEmptyArray<WeaponAttackOverrideMechanicsIssue> | undefined {
  if (mechanics.family !== "ongoing_effect") return undefined;
  const ongoing = mechanics;
  const issues: WeaponAttackOverrideMechanicsIssue[] = [];
  const push = (
    failedFact: WeaponAttackOverrideFailedFact,
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

function weaponAttackOverrideSemanticCandidate(
  mechanics: SpellMechanics,
): boolean {
  return (
    mechanics.family === "ongoing_effect" &&
    mechanics.operations.some(
      (operation) =>
        operation.effect.kind === "override_attached_weapon_attack",
    )
  );
}

function weaponAttackOverrideDistinctiveHeaderFallback(
  mechanics: SpellMechanics,
): boolean {
  return (
    mechanics.family === "ongoing_effect" &&
    mechanics.level === 0 &&
    mechanics.castingTime.kind === "bonus_action" &&
    mechanics.range.kind === "self" &&
    mechanics.duration.kind === "timed"
  );
}

function weaponAttackOverrideDurationIsSupported(
  duration: SpellMechanics["duration"],
): duration is Extract<
  SpellMechanics["duration"],
  { readonly kind: "timed" }
> & {
  readonly value: SpellCanonicalDurationValue;
} {
  if (
    duration.kind !== "timed" ||
    !spellMechanicsObjectHasOnlyKeys(
      duration,
      WEAPON_ATTACK_OVERRIDE_DURATION_FIELDS,
    ) ||
    !spellMechanicsObjectHasOnlyKeys(
      duration.value,
      WEAPON_ATTACK_OVERRIDE_DURATION_VALUE_FIELDS,
    ) ||
    duration.value.unit !== "minute" ||
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
    earlyEnd.length === 2 &&
    earlyEnd.every((ending) =>
      spellMechanicsObjectHasOnlyKeys(
        ending,
        WEAPON_ATTACK_OVERRIDE_DURATION_END_FIELDS,
      ),
    ) &&
    sameStringSet(
      earlyEnd.map(({ kind }) => kind),
      ["caster_recasts_spell", "caster_lets_go_of_attached_weapon"],
    )
  );
}

function weaponAttackOverrideAttachmentIsSupported(
  attachment: OngoingEffectMechanics["attachment"],
): attachment is Extract<
  OngoingEffectMechanics["attachment"],
  { readonly kind: "held_weapon" }
> {
  return (
    attachment.kind === "held_weapon" &&
    spellMechanicsObjectHasOnlyKeys(
      attachment,
      WEAPON_ATTACK_OVERRIDE_ATTACHMENT_FIELDS,
    ) &&
    attachment.heldBy === "caster" &&
    attachment.count === 1 &&
    sameStringSet(attachment.weaponIds, ["weapon_club", "weapon_quarterstaff"])
  );
}

function weaponAttackOverrideDamageDieFacts(
  damageDie: DiceAmount,
): WeaponAttackOverrideDamageDieFacts | undefined {
  if (
    damageDie.kind !== "threshold_tiers" ||
    !spellMechanicsObjectHasOnlyKeys(
      damageDie,
      WEAPON_ATTACK_OVERRIDE_DAMAGE_DIE_FIELDS,
    ) ||
    damageDie.axis !== "character" ||
    !spellMechanicsObjectHasOnlyKeys(
      damageDie.base,
      WEAPON_ATTACK_OVERRIDE_DICE_EXPR_FIELDS,
    ) ||
    damageDie.base.dice !== 1 ||
    damageDie.base.dieSize !== 8 ||
    damageDie.base.flat !== undefined ||
    damageDie.base.spellcastingMod !== undefined ||
    damageDie.base.abilityModifier !== undefined ||
    damageDie.tiers.length !== WEAPON_ATTACK_OVERRIDE_DAMAGE_TIERS.length
  ) {
    return undefined;
  }
  const parsedTiers = damageDie.tiers.flatMap((tier) => {
    const atLevel = spellCharacterLevelFromSurface(tier.atLevel);
    return atLevel !== undefined &&
      spellMechanicsObjectHasOnlyKeys(
        tier,
        WEAPON_ATTACK_OVERRIDE_TIER_FIELDS,
      ) &&
      spellMechanicsObjectHasOnlyKeys(
        tier.override,
        WEAPON_ATTACK_OVERRIDE_TIER_OVERRIDE_FIELDS,
      ) &&
      tier.override.flat === undefined &&
      (tier.override.dice === undefined || tier.override.dice > 0) &&
      (tier.override.dieSize === undefined || tier.override.dieSize > 0)
      ? [{ ...tier, atLevel }]
      : [];
  });
  const orderedTiers = spellMechanicsFixedTableEntries(
    parsedTiers,
    WEAPON_ATTACK_OVERRIDE_DAMAGE_TIERS,
    (actual, expected) =>
      Number(actual.atLevel) === expected.atLevel &&
      weaponAttackOverrideDamageTierMatches(actual.override, expected.override),
  );
  return orderedTiers === undefined
    ? undefined
    : {
        base: { dice: 1, dieSize: 8 },
        tiers: orderedTiers,
      };
}

function weaponAttackOverrideOperationRole(
  operation: OngoingOperation | undefined,
): operation is OngoingOperation & {
  readonly effect: OverrideWeaponAttackEffect;
} {
  if (
    operation === undefined ||
    !spellMechanicsObjectHasOnlyKeys(
      operation,
      WEAPON_ATTACK_OVERRIDE_OPERATION_FIELDS,
    ) ||
    operation.predicate !== undefined ||
    operation.targetLimit !== undefined ||
    operation.usageLimit !== undefined ||
    operation.trigger.kind !== "passive" ||
    !spellMechanicsObjectHasOnlyKeys(
      operation.trigger,
      WEAPON_ATTACK_OVERRIDE_TRIGGER_FIELDS,
    ) ||
    operation.effect.kind !== "override_attached_weapon_attack" ||
    !spellMechanicsObjectHasOnlyKeys(
      operation.effect,
      WEAPON_ATTACK_OVERRIDE_EFFECT_FIELDS,
    )
  ) {
    return false;
  }
  return (
    operation.effect.replacesAbility === "str" &&
    operation.effect.attackRollAbility === "spellcasting" &&
    operation.effect.damageRollAbility === "spellcasting" &&
    operation.effect.attackScope === "melee_attacks_using_attached_weapon" &&
    sameStringSet(operation.effect.damageTypeChoice, ["force", "weapon_normal"])
  );
}

function weaponAttackOverrideDefinitionFactsMatch(
  source: SpellMechanicsAdmissionSource,
  mechanics: OngoingEffectMechanics,
): { readonly duration: boolean; readonly components: boolean } {
  const definition = source.spellDefinitionRuleFacts;
  return {
    duration:
      definition.duration.kind === mechanics.duration.kind &&
      definition.duration.kind === "timed" &&
      mechanics.duration.kind === "timed" &&
      definition.duration.value.unit === mechanics.duration.value.unit &&
      definition.duration.value.amount === mechanics.duration.value.amount,
    components:
      definition.components.verbal === mechanics.components.v &&
      definition.components.somatic === mechanics.components.s &&
      definition.components.hasMaterial === (mechanics.components.m !== false),
  };
}

function weaponAttackOverrideMechanicsEvidence(
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

function admitWeaponAttackOverrideMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "weaponAttackOverride",
  WeaponAttackOverrideMechanicsFacts,
  WeaponAttackOverrideInvocation,
  WeaponAttackOverrideAdmissionIssue
> {
  const missingRootIssues = weaponAttackOverrideMissingRootIssues(
    source.mechanics,
  );
  if (missingRootIssues !== undefined) {
    const issues = spellProcedureNonEmpty(
      missingRootIssues.map(weaponAttackOverrideIssueResult),
    );
    if (issues === undefined) return { tag: "notRepresented" };
    return {
      tag: "unsupported",
      issues,
    };
  }
  if (
    !weaponAttackOverrideSemanticCandidate(source.mechanics) &&
    !weaponAttackOverrideDistinctiveHeaderFallback(source.mechanics)
  ) {
    return { tag: "notRepresented" };
  }
  if (source.mechanics.family !== "ongoing_effect") {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const operation = mechanics.operations[0];
  const operationRole = weaponAttackOverrideOperationRole(operation)
    ? operation
    : undefined;
  const durationSupported = weaponAttackOverrideDurationIsSupported(
    mechanics.duration,
  );
  const attachmentSupported = weaponAttackOverrideAttachmentIsSupported(
    mechanics.attachment,
  );
  const damageDie =
    operationRole?.effect === undefined
      ? undefined
      : weaponAttackOverrideDamageDieFacts(operationRole.effect.damageDie);
  const issues: WeaponAttackOverrideMechanicsIssue[] = [];
  const push = (
    failedFact: WeaponAttackOverrideFailedFact,
    mechanicsPath: SpellMechanicsBranchPath,
  ) => issues.push({ failedFact, mechanicsPath });

  if (
    mechanics.level !== 0 ||
    source.spellDefinitionRuleFacts.level !== mechanics.level
  ) {
    push("level", spellMechanicsHeaderPath("level"));
  }
  if (
    !spellMechanicsObjectHasOnlyKeys(
      mechanics,
      WEAPON_ATTACK_OVERRIDE_ROOT_FIELDS,
    )
  ) {
    push("operation", spellMechanicsHeaderPath("family"));
  }
  if (mechanics.school !== "transmutation") {
    push("school", spellMechanicsHeaderPath("school"));
  }
  if (
    mechanics.range.kind !== "self" ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.range,
      WEAPON_ATTACK_OVERRIDE_RANGE_FIELDS,
    ) ||
    source.spellDefinitionRuleFacts.range.kind !== mechanics.range.kind
  ) {
    push("range", spellMechanicsHeaderPath("range"));
  }
  if (
    mechanics.components.v !== true ||
    mechanics.components.s !== true ||
    typeof mechanics.components.m !== "string" ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.components,
      WEAPON_ATTACK_OVERRIDE_COMPONENT_FIELDS,
    )
  ) {
    push("components", spellMechanicsHeaderPath("components"));
  }
  const definitionFacts = weaponAttackOverrideDefinitionFactsMatch(
    source,
    mechanics,
  );
  if (!definitionFacts.duration) {
    push("duration", spellMechanicsHeaderPath("duration"));
  }
  if (!definitionFacts.components) {
    push("components", spellMechanicsHeaderPath("components"));
  }
  if (!durationSupported) {
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
      WEAPON_ATTACK_OVERRIDE_CASTING_TIME_FIELDS,
    )
  ) {
    push("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  if (!attachmentSupported) {
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
    push("operation", spellOngoingOperationPath(PositiveInteger(1)));
    push("overrideEffect", spellOngoingOperationEffectPath(PositiveInteger(1)));
  } else if (damageDie === undefined) {
    push("damageDie", spellOngoingOperationEffectPath(PositiveInteger(1)));
  }
  const uniqueIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (uniqueIssues !== undefined) {
    const [first, ...rest] = uniqueIssues.map(weaponAttackOverrideIssueResult);
    return { tag: "unsupported", issues: [first, ...rest] };
  }
  if (
    !durationSupported ||
    !attachmentSupported ||
    operationRole === undefined ||
    damageDie === undefined
  ) {
    const issue: WeaponAttackOverrideMechanicsIssue = {
      failedFact: !durationSupported
        ? "duration"
        : !attachmentSupported
          ? "attachment"
          : operationRole === undefined
            ? "overrideEffect"
            : "damageDie",
      mechanicsPath: !durationSupported
        ? spellMechanicsHeaderPath("duration")
        : !attachmentSupported
          ? spellOngoingAttachmentPath()
          : spellOngoingOperationEffectPath(PositiveInteger(1)),
    };
    return {
      tag: "unsupported",
      issues: [weaponAttackOverrideIssueResult(issue)],
    };
  }
  const durationValue = mechanics.duration.value;
  if (!isSpellCanonicalDurationValue(durationValue)) {
    return {
      tag: "unsupported",
      issues: [
        weaponAttackOverrideIssueResult({
          failedFact: "durationValue",
          mechanicsPath:
            spellDurationValueEvidencePaths(mechanics.duration)[0] ??
            spellMechanicsHeaderPath("duration"),
        }),
      ],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    durationValue,
    damageDie,
  } satisfies WeaponAttackOverrideMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "weaponAttackOverride",
      facts,
      evidence: weaponAttackOverrideMechanicsEvidence(mechanics),
      admit: (executionSource, ctx) =>
        admitWeaponAttackOverride(
          executionSource,
          {
            damageDie: facts.damageDie,
            durationTicks: spellDurationTicksFromCanonicalValue(
              facts.durationValue,
            ),
          } satisfies WeaponAttackOverrideMechanicsProjection,
          {
            actor: ctx.actor,
            castingSource: ctx.castingSource,
            activeDruidWildShape: activeDruidWildShapeEffect(ctx.actor),
          },
        ),
    },
  };
}

type WeaponAttackOverrideOpenedInterruptResult = Extract<
  BattleInterruptWindowProgress,
  { readonly tag: "windowOpened" }
>["result"];
type WeaponAttackOverrideCheckpointFailureResult = Extract<
  BattleInterruptWindowProgress,
  { readonly tag: "checkpointPreparationFailed" }
>["result"];

const resolveWeaponAttackOverride = weaponAttackOverrideExecutor<
  WeaponAttackOverrideOpenedInterruptResult,
  WeaponAttackOverrideCheckpointFailureResult
>();

function resolveWeaponAttackOverrideProfile(
  input: Parameters<WeaponAttackOverrideProfile["resolve"]>[0],
) {
  const continuation = {
    kind: "replay",
    subject: input.input.subject,
    fills: input.input.fills,
  } as const;
  return resolveWeaponAttackOverride(
    {
      input: {
        state: input.input.state,
        subject: input.input.subject,
        ...(input.input.handledInterruptTrigger === undefined
          ? {}
          : {
              handledInterruptTrigger: input.input.handledInterruptTrigger,
            }),
      },
      invocation: input.invocation,
      fillInput: input.fillSet,
      continuation,
    },
    {
      snapshot: snapshotBattle,
      activeDruidWildShapeEffect,
      battleObjectIsOnGround,
      loadoutHeldWeaponSlotIsUsable,
      spellCastInterruptFrame,
      interruptWindowProgress,
      commitWeaponAttackOverrideEffect: ({
        authorization,
        effect: sourcedTemplate,
      }) => {
        const { caster, state } = authorization.execution;
        const allocation = allocateBattleEffectOccurrenceForCreature({
          owner: caster,
          effect: sourcedTemplate,
        });
        return {
          ...state,
          combatants: new Map(state.combatants).set(caster.combatantId, {
            ...allocation.owner,
            activeEffects: [
              ...allocation.owner.activeEffects.filter(
                (existingEffect) =>
                  existingEffect.kind !== "spellWeaponAttackOverride" ||
                  existingEffect.sourceProcedureRef !==
                    sourcedTemplate.sourceProcedureRef ||
                  existingEffect.sourceCombatantId !==
                    sourcedTemplate.sourceCombatantId,
              ),
              allocation.effect,
            ],
          }),
        };
      },
      spendSpellCastResources: ({ state, execution, errorState }) =>
        spendSpellCastResources({
          state,
          actorId: execution.caster.combatantId,
          invocation: execution.invocation,
          errorState,
        }),
    },
  );
}

export const weaponAttackOverrideProfile: WeaponAttackOverrideProfile = {
  procedure: "weaponAttackOverride",
  executionSchema: WeaponAttackOverrideExecutionSchema,
  admitMechanics: admitWeaponAttackOverrideMechanics,
  discoverCastAct: (state, actorId, invocation) =>
    discoverWeaponAttackOverrideCastAct(state, actorId, invocation, {
      activeDruidWildShapeEffect,
      battleObjectIsOnGround,
      loadoutHeldWeaponSlotIsUsable,
    }),
  resolve: resolveWeaponAttackOverrideProfile,
};
