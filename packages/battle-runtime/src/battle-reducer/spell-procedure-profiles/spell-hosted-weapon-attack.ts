import { optionalProperty } from "../../optional-property.ts";
import {
  ammunitionForAttackIsAvailable,
  spendAmmunitionForAcceptedAttack,
} from "../../battle-ammunition.ts";
import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-hosted-weapon-attack
import { DiceExprSchema } from "@dnd/surface/surface/schema";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS
//
// The spellHostedWeaponAttack Spell Procedure Profile: an action cantrip that
// hosts one existing proficient character weapon attack through the Magic
// action, replacing the attack/damage ability with the caster's spellcasting
// ability and adding spell damage at higher character levels.
//
// RAW anchors:
//   - SRD 5.2.1 Playing-the-Game "Attack Rolls": weapon attack rolls add
//     Proficiency Bonus when proficient, and features can replace the normal
//     Strength/Dexterity ability modifier.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Attack Roll, Damage Type, and
//     Spell Invocation.

import {
  attackBonus,
  PositiveInteger,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import type {
  Attachment,
  DamageType,
  DiceAmount,
  DiceExpr,
  EffectAtom,
  SpellMechanics,
  WeaponProficiency,
} from "@dnd/surface/surface/types";
import { Match } from "effect";
import type {
  BoundCharacterWeaponAttackActionOption,
  CharacterWeaponAttackActionOption,
} from "../../battle-action-options.ts";
import {
  type AttackSpellDamageAddition,
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type CharacterBattleCreatureState,
  type SpellHostedWeaponAttackInvocation,
} from "../../battle-state-execution.ts";
import { BattleObjectId, type CombatantId } from "../../identity.ts";
import { resolveSelectedAttackProcedure } from "../attack-main.ts";
import { isCharacterBattleCreatureState } from "../creature-state-execution.ts";
import { activeDruidWildShapeEffect } from "../druid-wild-shape.ts";
import { spellDamageTypeChoiceHole } from "../spells-damage-fills.ts";
import {
  sameStringSet,
  thresholdTierDamageExpr,
} from "../spells-execution-facts.ts";
import { loadoutHeldWeaponSlotIsUsable } from "../wild-shape-equipment.ts";
import { battleObjectIsOnGround } from "../battle-object-lifecycle.ts";
import { attackTargetHole } from "../hole-helpers.ts";
import { needsHolesResult } from "../needs-holes-result.ts";
import { invalidResult } from "../result-helpers.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { cantripSpellAccessFor } from "./profile.ts";
import { Schema } from "effect";
import {
  AbilityModifier,
  AttackBonus,
  CantripSpellAccessSchema,
  DamageTypeSchema,
  NoSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  spellAdmissionCharacterLevel,
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  spellConsumedMaterialEvidencePaths,
  spellMechanicsObjectHasOnlyKeys,
  spellProcedureNonEmpty,
  spellUniqueMechanicsIssues,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellMechanicsHeaderPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";

type SpellHostedWeaponAttackResolveInput =
  SpellProcedureProfileResolveInput<SpellHostedWeaponAttackInvocation>;

type SpellHostedWeaponAttackEffect = Extract<
  EffectAtom,
  { readonly kind: "make_weapon_attack" }
>;
type SpellHostedWeaponAttackBonusDamage = NonNullable<
  SpellHostedWeaponAttackEffect["bonusDamage"]
>;
type SpellHostedWeaponAttackDamageTypeChoices = NonNullable<
  SpellHostedWeaponAttackEffect["damageTypeChoice"]
>;
type SupportedSpellHostedWeaponAttackDamageTypeChoices =
  | readonly ["radiant", "weapon_normal"]
  | readonly ["weapon_normal", "radiant"];
type SpellHostedWeaponAttackMechanics = Extract<
  SpellMechanics,
  { readonly family: "activation" }
>;
type SpellHostedWeaponAttackPhase = Extract<
  SpellHostedWeaponAttackMechanics["phases"][number],
  { readonly kind: "direct" }
>;
type SpellHostedWeaponAttackSelfAttachment = Extract<
  Attachment,
  { readonly kind: "self" }
>;
type SpellHostedWeaponAttackBonusAmount = Extract<
  DiceAmount,
  { readonly kind: "threshold_tiers" }
>;
type SpellHostedWeaponAttackBonusTier =
  SpellHostedWeaponAttackBonusAmount["tiers"][number];
type SpellHostedWeaponAttackBonusOverride =
  SpellHostedWeaponAttackBonusTier["override"];
type SpellHostedWeaponAttackBonusTierIndex = 0 | 1 | 2;
type SupportedSpellHostedWeaponAttackBonusTier<
  Index extends SpellHostedWeaponAttackBonusTierIndex,
> = SpellHostedWeaponAttackBonusTier & {
  readonly atLevel: (typeof SPELL_HOSTED_BONUS_DAMAGE_TIER_TABLE)[Index]["atLevel"];
  readonly override: SpellHostedWeaponAttackBonusOverride & {
    readonly dice: (typeof SPELL_HOSTED_BONUS_DAMAGE_TIER_TABLE)[Index]["dice"];
    readonly dieSize?: undefined;
    readonly flat?: undefined;
  };
};
type SupportedSpellHostedWeaponAttackBonusAmount =
  SpellHostedWeaponAttackBonusAmount & {
    readonly axis: "character";
    readonly base: DiceExpr & {
      readonly dice: 0;
      readonly dieSize: 6;
      readonly flat?: undefined;
      readonly spellcastingMod?: undefined;
      readonly abilityModifier?: undefined;
    };
    readonly tiers: readonly [
      SupportedSpellHostedWeaponAttackBonusTier<0>,
      SupportedSpellHostedWeaponAttackBonusTier<1>,
      SupportedSpellHostedWeaponAttackBonusTier<2>,
    ];
  };
type SupportedSpellHostedWeaponAttackBonusDamage = Omit<
  SpellHostedWeaponAttackBonusDamage,
  "amount" | "damageType"
> & {
  readonly damageType: "radiant";
  readonly amount: SupportedSpellHostedWeaponAttackBonusAmount;
};
type SpellHostedWeaponAttackCastingTime = Extract<
  SpellHostedWeaponAttackMechanics["castingTime"],
  { readonly kind: "action" }
>;
type SpellHostedWeaponAttackRange = Extract<
  SpellMechanics["range"],
  { readonly kind: "self" }
>;
type SpellHostedWeaponAttackDuration = Extract<
  SpellMechanics["duration"],
  { readonly kind: "instantaneous" }
>;
const DAMAGE_TYPE_CHOICES = [
  "radiant",
  "weapon_normal",
] as const satisfies ReadonlyArray<
  SpellHostedWeaponAttackDamageTypeChoices[number]
>;
type SpellHostedWeaponAttackMechanicsFacts = SpellDefinitionRuleFacts & {
  readonly damageTypeChoices: SupportedSpellHostedWeaponAttackDamageTypeChoices;
  readonly bonusDamage: SupportedSpellHostedWeaponAttackBonusDamage;
};

export const SPELL_HOSTED_WEAPON_ATTACK_FAILED_FACTS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "castingTime",
  "phase",
  "phaseCount",
  "attachment",
  "weaponAttackEffect",
  "bonusDamage",
  "damageTypeChoice",
] as const;
type SpellHostedWeaponAttackFailedFact =
  (typeof SPELL_HOSTED_WEAPON_ATTACK_FAILED_FACTS)[number];
type SpellHostedWeaponAttackMechanicsIssue = {
  readonly failedFact: SpellHostedWeaponAttackFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

const SPELL_HOSTED_PHASE_FIELDS = [
  "kind",
  "attachment",
  "effects",
  "mode",
] as const satisfies ReadonlyArray<keyof SpellHostedWeaponAttackPhase>;
const SPELL_HOSTED_CASTING_TIME_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<keyof SpellHostedWeaponAttackCastingTime>;
const SPELL_HOSTED_RANGE_FIELDS = ["kind"] as const satisfies ReadonlyArray<
  keyof SpellHostedWeaponAttackRange
>;
const SPELL_HOSTED_COMPONENT_FIELDS = [
  "v",
  "s",
  "m",
] as const satisfies ReadonlyArray<keyof SpellMechanics["components"]>;
const SPELL_HOSTED_DURATION_FIELDS = ["kind"] as const satisfies ReadonlyArray<
  keyof SpellHostedWeaponAttackDuration
>;
const SPELL_HOSTED_ROOT_FIELDS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "castingTime",
  "family",
  "phases",
] as const satisfies ReadonlyArray<keyof SpellHostedWeaponAttackMechanics>;
const SPELL_HOSTED_SELF_ATTACHMENT_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<keyof SpellHostedWeaponAttackSelfAttachment>;
const SPELL_HOSTED_EFFECT_FIELDS = [
  "kind",
  "weapon",
  "abilityOverride",
  "damageTypeChoice",
  "bonusDamage",
] as const satisfies ReadonlyArray<keyof SpellHostedWeaponAttackEffect>;
const SPELL_HOSTED_BONUS_DAMAGE_FIELDS = [
  "damageType",
  "amount",
] as const satisfies ReadonlyArray<keyof SpellHostedWeaponAttackBonusDamage>;
const SPELL_HOSTED_BONUS_AMOUNT_FIELDS = [
  "kind",
  "axis",
  "base",
  "tiers",
] as const satisfies ReadonlyArray<keyof SpellHostedWeaponAttackBonusAmount>;
const SPELL_HOSTED_BONUS_BASE_FIELDS = [
  "dice",
  "dieSize",
  "flat",
] as const satisfies ReadonlyArray<keyof DiceExpr>;
const SPELL_HOSTED_BONUS_TIER_FIELDS = [
  "atLevel",
  "override",
] as const satisfies ReadonlyArray<keyof SpellHostedWeaponAttackBonusTier>;
const SPELL_HOSTED_BONUS_OVERRIDE_FIELDS = [
  "dice",
] as const satisfies ReadonlyArray<keyof SpellHostedWeaponAttackBonusOverride>;
const SPELL_HOSTED_BONUS_DAMAGE_TIER_TABLE = [
  { atLevel: 5, dice: 1 },
  { atLevel: 11, dice: 2 },
  { atLevel: 17, dice: 3 },
] as const;

function spellHostedWeaponAttackIssueResult(
  issue: SpellHostedWeaponAttackMechanicsIssue,
) {
  return {
    tag: "spellProcedureAdmissionIssue" as const,
    procedure: "spellHostedWeaponAttack" as const,
    failedFact: issue.failedFact,
    mechanicsPath: issue.mechanicsPath,
    message: `Unsupported spellHostedWeaponAttack mechanics fact: ${issue.failedFact}.`,
  };
}

function spellHostedWeaponAttackSemanticCandidate(
  mechanics: SpellMechanics,
): boolean {
  return (
    mechanics.family === "activation" &&
    mechanics.phases.some(
      (phase) =>
        phase.kind === "direct" &&
        phase.effects?.some(
          (effect) => effect.kind === "make_weapon_attack",
        ) === true,
    )
  );
}

function spellHostedWeaponAttackDistinctiveHeaderFallback(
  mechanics: SpellMechanics,
): boolean {
  return (
    mechanics.family === "activation" &&
    mechanics.level === 0 &&
    mechanics.castingTime.kind === "action" &&
    mechanics.range.kind === "self" &&
    mechanics.duration.kind === "instantaneous"
  );
}

function spellHostedWeaponAttackBonusTierIsCanonical<
  const Index extends SpellHostedWeaponAttackBonusTierIndex,
>(
  tier: SpellHostedWeaponAttackBonusTier | undefined,
  index: Index,
): tier is SupportedSpellHostedWeaponAttackBonusTier<Index> {
  const expected = SPELL_HOSTED_BONUS_DAMAGE_TIER_TABLE[index];
  return (
    tier !== undefined &&
    spellMechanicsObjectHasOnlyKeys(tier, SPELL_HOSTED_BONUS_TIER_FIELDS) &&
    spellMechanicsObjectHasOnlyKeys(
      tier.override,
      SPELL_HOSTED_BONUS_OVERRIDE_FIELDS,
    ) &&
    tier.atLevel === expected.atLevel &&
    tier.override.dice === expected.dice &&
    tier.override.dieSize === undefined &&
    tier.override.flat === undefined
  );
}

function spellHostedWeaponAttackBonusAmountIsCanonical(
  amount: DiceAmount,
): amount is SupportedSpellHostedWeaponAttackBonusAmount {
  if (
    amount.kind !== "threshold_tiers" ||
    !spellMechanicsObjectHasOnlyKeys(
      amount,
      SPELL_HOSTED_BONUS_AMOUNT_FIELDS,
    ) ||
    amount.axis !== "character" ||
    !spellMechanicsObjectHasOnlyKeys(
      amount.base,
      SPELL_HOSTED_BONUS_BASE_FIELDS,
    ) ||
    amount.base.dice !== 0 ||
    amount.base.dieSize !== 6 ||
    amount.base.flat !== undefined ||
    amount.base.spellcastingMod !== undefined ||
    amount.base.abilityModifier !== undefined ||
    amount.tiers.length !== SPELL_HOSTED_BONUS_DAMAGE_TIER_TABLE.length
  ) {
    return false;
  }
  return (
    spellHostedWeaponAttackBonusTierIsCanonical(amount.tiers[0], 0) &&
    spellHostedWeaponAttackBonusTierIsCanonical(amount.tiers[1], 1) &&
    spellHostedWeaponAttackBonusTierIsCanonical(amount.tiers[2], 2)
  );
}

function spellHostedWeaponAttackBonusDamageFacts(
  bonusDamage: SpellHostedWeaponAttackBonusDamage,
): SupportedSpellHostedWeaponAttackBonusDamage | undefined {
  return spellMechanicsObjectHasOnlyKeys(
    bonusDamage,
    SPELL_HOSTED_BONUS_DAMAGE_FIELDS,
  ) &&
    bonusDamage.damageType === "radiant" &&
    spellHostedWeaponAttackBonusAmountIsCanonical(bonusDamage.amount)
    ? {
        ...bonusDamage,
        damageType: bonusDamage.damageType,
        amount: bonusDamage.amount,
      }
    : undefined;
}

function spellHostedWeaponAttackEffectShapeIsSupported(
  effect: SpellHostedWeaponAttackEffect | undefined,
): effect is SpellHostedWeaponAttackEffect {
  return (
    effect !== undefined &&
    spellMechanicsObjectHasOnlyKeys(effect, SPELL_HOSTED_EFFECT_FIELDS) &&
    effect.weapon === "material_component" &&
    effect.abilityOverride === "spellcasting"
  );
}

function isSupportedSpellHostedWeaponAttackDamageTypeChoices(
  choices: SpellHostedWeaponAttackDamageTypeChoices,
): choices is SupportedSpellHostedWeaponAttackDamageTypeChoices {
  return sameStringSet(choices, DAMAGE_TYPE_CHOICES);
}

function spellHostedWeaponAttackDamageTypeChoices(
  effect: SpellHostedWeaponAttackEffect | undefined,
): SupportedSpellHostedWeaponAttackDamageTypeChoices | undefined {
  const choices = effect?.damageTypeChoice;
  return choices !== undefined &&
    isSupportedSpellHostedWeaponAttackDamageTypeChoices(choices)
    ? choices
    : undefined;
}

function spellHostedWeaponAttackSelfAttachmentIsSupported(
  attachment: Attachment | undefined,
): attachment is SpellHostedWeaponAttackSelfAttachment {
  return (
    attachment?.kind === "self" &&
    spellMechanicsObjectHasOnlyKeys(
      attachment,
      SPELL_HOSTED_SELF_ATTACHMENT_FIELDS,
    )
  );
}

function spellHostedWeaponAttackMechanicsEvidence(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
  phaseIndex: number,
  effectIndex: number,
): SpellProcedureMechanicsEvidence {
  const phaseOrdinal = PositiveInteger(phaseIndex + 1);
  const consumed: [SpellMechanicsBranchPath, ...SpellMechanicsBranchPath[]] = [
    spellMechanicsHeaderPath("level"),
    spellMechanicsHeaderPath("school"),
    spellMechanicsHeaderPath("range"),
    spellMechanicsHeaderPath("components"),
    spellMechanicsHeaderPath("duration"),
    spellMechanicsHeaderPath("castingTime"),
    spellMechanicsHeaderPath("family"),
    spellActivationPhasePath(phaseOrdinal),
    spellActivationAttachmentPath(phaseOrdinal),
    spellActivationEffectPath(phaseOrdinal, PositiveInteger(effectIndex + 1)),
    ...spellConsumedMaterialEvidencePaths(mechanics.components),
  ];
  return { consumed, unowned: [] };
}

function admitSpellHostedWeaponAttackMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "spellHostedWeaponAttack",
  SpellHostedWeaponAttackMechanicsFacts,
  SpellHostedWeaponAttackInvocation,
  ReturnType<typeof spellHostedWeaponAttackIssueResult>
> {
  if (
    !spellHostedWeaponAttackSemanticCandidate(source.mechanics) &&
    !spellHostedWeaponAttackDistinctiveHeaderFallback(source.mechanics)
  ) {
    return { tag: "notRepresented" };
  }
  if (source.mechanics.family !== "activation") {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const phaseIndex = mechanics.phases.findIndex(
    (phase) =>
      phase.kind === "direct" &&
      phase.effects?.some((effect) => effect.kind === "make_weapon_attack") ===
        true,
  );
  const inspectedPhaseIndex = phaseIndex >= 0 ? phaseIndex : 0;
  const inspectedPhase = mechanics.phases[inspectedPhaseIndex];
  const phase = inspectedPhase?.kind === "direct" ? inspectedPhase : undefined;
  const effectIndex =
    phase?.effects?.findIndex(
      (effect) => effect.kind === "make_weapon_attack",
    ) ?? -1;
  const effect =
    phase !== undefined && effectIndex >= 0
      ? phase.effects?.[effectIndex]
      : undefined;
  const weaponEffect =
    effect?.kind === "make_weapon_attack" ? effect : undefined;
  const weaponEffectShapeIsSupported =
    spellHostedWeaponAttackEffectShapeIsSupported(weaponEffect);
  const damageTypeChoices =
    spellHostedWeaponAttackDamageTypeChoices(weaponEffect);
  const bonusDamage =
    weaponEffect?.bonusDamage === undefined
      ? undefined
      : spellHostedWeaponAttackBonusDamageFacts(weaponEffect.bonusDamage);
  const issues: SpellHostedWeaponAttackMechanicsIssue[] = [];
  const push = (
    failedFact: SpellHostedWeaponAttackFailedFact,
    mechanicsPath: SpellMechanicsBranchPath,
  ) => issues.push({ failedFact, mechanicsPath });
  if (mechanics.level !== 0) push("level", spellMechanicsHeaderPath("level"));
  if (!spellMechanicsObjectHasOnlyKeys(mechanics, SPELL_HOSTED_ROOT_FIELDS)) {
    push("phase", spellMechanicsHeaderPath("family"));
  }
  if (mechanics.school !== "divination") {
    push("school", spellMechanicsHeaderPath("school"));
  }
  if (
    mechanics.range.kind !== "self" ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.range, SPELL_HOSTED_RANGE_FIELDS)
  ) {
    push("range", spellMechanicsHeaderPath("range"));
  }
  if (
    mechanics.components.v !== false ||
    mechanics.components.s !== true ||
    typeof mechanics.components.m !== "string" ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.components,
      SPELL_HOSTED_COMPONENT_FIELDS,
    )
  ) {
    push("components", spellMechanicsHeaderPath("components"));
  }
  if (
    mechanics.duration.kind !== "instantaneous" ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.duration,
      SPELL_HOSTED_DURATION_FIELDS,
    )
  ) {
    push("duration", spellMechanicsHeaderPath("duration"));
  }
  if (
    mechanics.castingTime.kind !== "action" ||
    mechanics.castingTime.ritual !== undefined ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.castingTime,
      SPELL_HOSTED_CASTING_TIME_FIELDS,
    )
  ) {
    push("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  if (mechanics.phases.length !== 1) {
    for (const [index] of mechanics.phases.entries()) {
      if (index === phaseIndex) continue;
      push("phaseCount", spellActivationPhasePath(PositiveInteger(index + 1)));
    }
    if (mechanics.phases.length === 0) {
      push("phaseCount", spellActivationPhasePath(PositiveInteger(1)));
    }
  }
  const phaseOrdinal = PositiveInteger(inspectedPhaseIndex + 1);
  if (phaseIndex < 0) {
    push("phase", spellActivationPhasePath(phaseOrdinal));
  } else if (phaseIndex !== 0) {
    push("phase", spellActivationPhasePath(phaseOrdinal));
  }
  if (
    phase === undefined ||
    !spellMechanicsObjectHasOnlyKeys(phase, SPELL_HOSTED_PHASE_FIELDS) ||
    phase.mode !== undefined ||
    !spellHostedWeaponAttackSelfAttachmentIsSupported(phase.attachment)
  ) {
    push("attachment", spellActivationAttachmentPath(phaseOrdinal));
  }
  const phaseEffects = phase?.effects ?? [];
  if (phaseEffects.length !== 1) {
    for (const [index] of phaseEffects.entries()) {
      if (index === effectIndex) continue;
      push(
        "weaponAttackEffect",
        spellActivationEffectPath(phaseOrdinal, PositiveInteger(index + 1)),
      );
    }
    if (phaseEffects.length === 0) {
      push(
        "weaponAttackEffect",
        spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
      );
    }
  }
  if (weaponEffect === undefined || !weaponEffectShapeIsSupported) {
    push(
      "weaponAttackEffect",
      spellActivationEffectPath(
        phaseOrdinal,
        PositiveInteger(Math.max(1, effectIndex + 1)),
      ),
    );
  }
  if (damageTypeChoices === undefined) {
    push(
      "damageTypeChoice",
      spellActivationEffectPath(
        phaseOrdinal,
        PositiveInteger(Math.max(1, effectIndex + 1)),
      ),
    );
  }
  if (bonusDamage === undefined) {
    push(
      "bonusDamage",
      spellActivationEffectPath(
        phaseOrdinal,
        PositiveInteger(Math.max(1, effectIndex + 1)),
      ),
    );
  }
  const uniqueIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (uniqueIssues !== undefined) {
    const [first, ...rest] = uniqueIssues.map(
      spellHostedWeaponAttackIssueResult,
    );
    return { tag: "unsupported", issues: [first, ...rest] };
  }
  if (weaponEffect === undefined || !weaponEffectShapeIsSupported) {
    return {
      tag: "unsupported",
      issues: [
        spellHostedWeaponAttackIssueResult({
          failedFact: "weaponAttackEffect",
          mechanicsPath: spellActivationEffectPath(
            phaseOrdinal,
            PositiveInteger(Math.max(1, effectIndex + 1)),
          ),
        }),
      ],
    };
  }
  if (damageTypeChoices === undefined || bonusDamage === undefined) {
    return {
      tag: "unsupported",
      issues: [
        spellHostedWeaponAttackIssueResult({
          failedFact:
            damageTypeChoices === undefined
              ? "damageTypeChoice"
              : "bonusDamage",
          mechanicsPath: spellActivationEffectPath(
            phaseOrdinal,
            PositiveInteger(Math.max(1, effectIndex + 1)),
          ),
        }),
      ],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    damageTypeChoices,
    bonusDamage,
  } satisfies SpellHostedWeaponAttackMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "spellHostedWeaponAttack",
      facts,
      evidence: spellHostedWeaponAttackMechanicsEvidence(
        mechanics,
        inspectedPhaseIndex,
        effectIndex,
      ),
      admit: (executionSource, ctx) =>
        admitSpellHostedWeaponAttack(executionSource, ctx, facts),
    },
  };
}

function admitSpellHostedWeaponAttack(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: SpellHostedWeaponAttackMechanicsFacts,
): readonly SpellHostedWeaponAttackInvocation[] {
  const origin = ctx.actor.origin;
  const spellcasting = origin.spellcasting;
  return spellHostedWeaponAttacks(ctx.actor)
    .filter(({ attack }) =>
      origin.weaponProficiencies.some((proficiency) =>
        weaponMatchesProficiency(attack.weapon, proficiency),
      ),
    )
    .map(
      ({ objectId, attack }): SpellHostedWeaponAttackInvocation => ({
        access: cantripSpellAccessFor(spell.castingSource),
        resource: { tag: "none" },
        procedure: "spellHostedWeaponAttack",
        spell,
        actionCost: "magicAction",
        componentWeapon: { objectId, attack },
        spellcastingAbilityModifier: ctx.castingSource.abilityModifier,
        attackBonus: attackBonus(
          Number(ctx.castingSource.abilityModifier) +
            Number(spellcasting.proficiencyBonus),
        ),
        damageTypeChoices: [
          ...new Set(
            facts.damageTypeChoices.map((choice) =>
              choice === "weapon_normal"
                ? attack.weapon.damage.damageType
                : "radiant",
            ),
          ),
        ],
        bonusDamage: {
          expr: thresholdTierDamageExpr(
            facts.bonusDamage.amount,
            spellAdmissionCharacterLevel(ctx),
          ),
          damageType: facts.bonusDamage.damageType,
        },
      }),
    );
}

function spellHostedWeaponAttacks(
  actor: CharacterBattleCreatureState,
): readonly {
  readonly objectId: BattleObjectId;
  readonly attack: BoundCharacterWeaponAttackActionOption;
}[] {
  const origin = actor.origin;
  const activeWildShape = activeDruidWildShapeEffect(actor);
  return [
    ...(origin.attack === null ||
    (activeWildShape !== null &&
      !loadoutHeldWeaponSlotIsUsable({
        loadout: origin.selectedLoadout,
        activeWildShape,
        objectKind: "mainWeapon",
        itemId: origin.attack.weaponObjectId,
      }))
      ? []
      : [
          {
            objectId: origin.attack.weaponObjectId,
            attack: origin.attack,
          },
        ]),
    ...(origin.offHandAttack === undefined ||
    (activeWildShape !== null &&
      !loadoutHeldWeaponSlotIsUsable({
        loadout: origin.selectedLoadout,
        activeWildShape,
        objectKind: "offHandWeapon",
        itemId: origin.offHandAttack.weaponObjectId,
      }))
      ? []
      : [
          {
            objectId: origin.offHandAttack.weaponObjectId,
            attack: origin.offHandAttack,
          },
        ]),
  ].filter(({ attack }) => attack.weapon.costGp >= 0.01);
}

const byKind = Match.discriminator("kind");

function weaponMatchesProficiency(
  weapon: CharacterWeaponAttackActionOption["weapon"],
  proficiency: WeaponProficiency,
): boolean {
  return Match.value(proficiency).pipe(
    byKind(
      "weapon_category",
      (categoryProficiency) => weapon.category === categoryProficiency.category,
    ),
    byKind(
      "weapon_category_with_properties",
      (propertyProficiency) =>
        weapon.category === propertyProficiency.category &&
        weapon.properties.some((property) =>
          propertyProficiency.anyOfProperties.includes(property.kind),
        ) === true,
    ),
    Match.exhaustive,
  );
}

function discoverSpellHostedWeaponAttackCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: import("../../battle-state-execution.ts").BattleExecutableSpellInvocation<SpellHostedWeaponAttackInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const componentWeapon = spellHostedWeaponAttackForExecution(
    state,
    actorId,
    invocation.componentWeaponObjectId,
  );
  if (componentWeapon === undefined) {
    return [];
  }
  if (
    !ammunitionForAttackIsAvailable(
      state.combatants.get(actorId),
      componentWeapon.attack,
    )
  ) {
    return [];
  }
  const targetHole = attackTargetHole(state, actorId, componentWeapon.attack);
  return targetHole.choices.length === 0
    ? []
    : [
        {
          subject: {
            tag: "actionSpell",
            actorId,
            procedureRef: invocation.sourceProcedureRef,
            mode: { tag: "cast" },
          },
          initialHoles: [spellDamageTypeChoiceHole(invocation), targetHole],
        },
      ];
}

function resolveSpellHostedWeaponAttack(
  input: SpellHostedWeaponAttackResolveInput,
): BattleResolutionResult {
  const componentWeapon = spellHostedWeaponAttackForExecution(
    input.input.state,
    input.actorId,
    input.invocation.componentWeaponObjectId,
  );
  if (componentWeapon === undefined) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Spell-hosted weapon attack component weapon is no longer available.",
    );
  }
  if (
    !ammunitionForAttackIsAvailable(
      input.input.state.combatants.get(input.actorId),
      componentWeapon.attack,
    )
  ) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Spell-hosted weapon attack requires available matching ammunition.",
    );
  }
  if (input.fillSet.damageTypeChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellDamageTypeChoiceHole(input.invocation),
    ]);
  }
  const selectedDamageType = input.fillSet.damageTypeChoice.value;
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!input.invocation.damageTypeChoices.includes(selectedDamageType)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell-hosted weapon attack damage type must be Radiant or the selected weapon's normal damage type.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const attack = spellHostedWeaponAttack(
    input.invocation,
    componentWeapon.attack,
    selectedDamageType,
  );
  const attackFills = input.input.fills.filter(
    (fill) => fill.kind !== "damageTypeChoice",
  );
  const hostedWeaponDamageAdditions =
    spellHostedWeaponAttackBonusDamageAdditions(
      input.invocation,
      input.actorId,
    );
  const pendingAttackDamageAdditions = combinedAttackDamageAdditions(
    input.input.pendingAttackDamageAdditions,
    hostedWeaponDamageAdditions,
  );
  const {
    replayingInterruptedProcedure: _replayingInterruptedProcedure,
    handledInterruptTrigger: _handledInterruptTrigger,
    pendingAttackDamageReductions: _pendingAttackDamageReductions,
    pendingAttackDamageAdditions: _pendingAttackDamageAdditions,
    ...baseInput
  } = input.input;
  const replayOptions = {
    ...(input.input.replayingInterruptedProcedure === undefined
      ? {}
      : {
          replayingInterruptedProcedure:
            input.input.replayingInterruptedProcedure,
        }),
    ...optionalProperty(
      "handledInterruptTrigger",
      input.input.handledInterruptTrigger,
    ),
    ...(input.input.pendingAttackDamageReductions === undefined
      ? {}
      : {
          pendingAttackDamageReductions:
            input.input.pendingAttackDamageReductions,
        }),
  };
  return resolveSelectedAttackProcedure(
    {
      ...baseInput,
      ...replayOptions,
      subject: baseInput.subject,
      fills: attackFills,
      ...optionalProperty(
        "pendingAttackDamageAdditions",
        pendingAttackDamageAdditions,
      ),
    },
    attack,
    (state, actorId, acceptedAttack, timing) =>
      spendSpellCastResources({
        state:
          timing.kind === "acceptedAttack"
            ? spendAmmunitionForAcceptedAttack({
                state,
                actorId,
                attack: acceptedAttack,
              })
            : state,
        actorId,
        invocation: input.invocation,
        errorState: input.input.state,
        startConcentration: false,
      }),
  );
}

function combinedAttackDamageAdditions(
  pending: ReadonlyNonEmptyArray<AttackSpellDamageAddition> | undefined,
  hosted: ReadonlyNonEmptyArray<AttackSpellDamageAddition> | undefined,
): ReadonlyNonEmptyArray<AttackSpellDamageAddition> | undefined {
  if (pending === undefined) return hosted;
  if (hosted === undefined) return pending;
  return [pending[0], ...pending.slice(1), ...hosted];
}

function spellHostedWeaponAttack(
  invocation: SpellHostedWeaponAttackResolveInput["invocation"],
  attack: BoundCharacterWeaponAttackActionOption,
  damageType: DamageType,
): BoundCharacterWeaponAttackActionOption {
  return {
    ...attack,
    abilityModifier: invocation.spellcastingAbilityModifier,
    attackBonus: invocation.attackBonus,
    damageAbilityModifier: invocation.spellcastingAbilityModifier,
    weapon: {
      ...attack.weapon,
      damage:
        attack.weapon.damage.damageType === damageType
          ? attack.weapon.damage
          : { ...attack.weapon.damage, damageType },
    },
  };
}

function spellHostedWeaponAttackForExecution(
  state: BattleState,
  actorId: CombatantId,
  componentWeaponObjectId: BattleObjectId,
):
  | {
      readonly objectId: BattleObjectId;
      readonly attack: BoundCharacterWeaponAttackActionOption;
    }
  | undefined {
  const actor = state.combatants.get(actorId);
  if (actor === undefined || !isCharacterBattleCreatureState(actor)) {
    return undefined;
  }
  return battleObjectIsOnGround(state, actorId, componentWeaponObjectId)
    ? undefined
    : spellHostedWeaponAttacks(actor).find(
        ({ objectId }) => objectId === componentWeaponObjectId,
      );
}

function spellHostedWeaponAttackBonusDamageAdditions(
  invocation: BattleExecutableSpellInvocation<SpellHostedWeaponAttackInvocation>,
  actorId: CombatantId,
): ReadonlyNonEmptyArray<AttackSpellDamageAddition> | undefined {
  return invocation.bonusDamage === null ||
    invocation.bonusDamage.expr.dice <= 0
    ? undefined
    : [
        {
          kind: "attackSpellDamageAddition",
          sourceProcedure: "spellHostedWeaponAttack",
          sourceProcedureRef: invocation.sourceProcedureRef,
          sourceCombatantId: actorId,
          damage: invocation.bonusDamage,
        },
      ];
}

export const SpellHostedWeaponAttackInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: CantripSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("spellHostedWeaponAttack"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("magicAction"),
      componentWeaponObjectId: BattleObjectId,
      spellcastingAbilityModifier: AbilityModifier,
      attackBonus: AttackBonus,
      damageTypeChoices: Schema.Array(DamageTypeSchema),
      bonusDamage: Schema.NullOr(
        Schema.Struct({
          expr: DiceExprSchema,
          damageType: DamageTypeSchema,
        }),
      ),
    }),
  );
export const spellHostedWeaponAttackProfile: SpellProcedureDeclaration<
  "spellHostedWeaponAttack",
  SpellHostedWeaponAttackInvocation
> = {
  procedure: "spellHostedWeaponAttack",
  executionSchema: SpellHostedWeaponAttackInvocationSchema,
  admitMechanics: admitSpellHostedWeaponAttackMechanics,
  discoverCastAct: discoverSpellHostedWeaponAttackCastAct,
  resolve: resolveSpellHostedWeaponAttack,
};
