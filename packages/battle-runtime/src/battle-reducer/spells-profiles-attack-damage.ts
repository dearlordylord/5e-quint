// Spell attack damage profile projections extracted from spells-profiles.ts.

import {
  attackBonus,
  DAMAGE_DIE_SIZES,
  movementFeet,
  type AbilityModifier,
  type DamageDieSize,
  type ProficiencyBonus as ProficiencyBonusType,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import type {
  Attachment,
  DamageType,
  SpellRecord,
  TargetSelection,
  WeaponProficiency,
  WeaponRecord,
} from "@dnd/surface/surface/types";
import { Either, Match } from "effect";
import {
  SUPPORTED_POINT_SPHERE_SAVE_GATE_RADIUS_FEET,
  type BattleCreatureState,
  type CantripSpellAttackSequenceTargeting,
  type DamageSpellSource,
  type PreparedDamageSpellSource,
  type PreparedSpellAttackSequenceTargeting,
  type SpellActivationPhase,
  type SpellAttackDamageTargeting,
  type SpellAttackHitEffect,
  type SpellObjectHitEffect,
  type SpellTargeting,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type { CharacterBattleSpellcastingState } from "../character-battle-resources.ts";
import type { CharacterWeaponAttackActionOption } from "../battle-action-options.ts";
import {
  CHROMATIC_ORB_CONTINUATION_LIMIT_KINDS,
  CHROMATIC_ORB_DAMAGE_TYPES,
  CHROMATIC_ORB_LEAP_RANGE_FEET,
  ELDRITCH_BLAST_BEAM_COUNT_TIERS,
  scorchingRayRayCount,
  type EldritchBlastBeamCount,
  type ScorchingRayRayCount,
} from "./domain-constants.ts";
import {
  sameDiceExpr,
  sameStringSet,
} from "./spells-profile-shared.ts";
import {
  singleTargetSpellRangeFeet,
  supportedDamageAmountExpr,
  supportedSpellAttackKind,
  supportedSpellPostDamageRiders,
} from "./spells-profiles-save-gates.ts";

export function supportedCantripSpellAttackProfile(
  spell: SpellRecord,
  spellcastingAbilityModifier: AbilityModifier,
  proficiencyBonus: ProficiencyBonusType,
  characterLevel: number,
): readonly SupportedSpellInvocation[] {
  return [
    ...supportedCantripSpellAttackSequenceProfile(
      spell,
      spellcastingAbilityModifier,
      proficiencyBonus,
      characterLevel,
    ),
    ...supportedSpellAttackDamageProfile({
      spell,
      access: { tag: "classCantrip" },
      resource: { tag: "none" },
      spellcastingAbilityModifier,
      proficiencyBonus,
      characterLevel,
    }),
  ];
}

const TRUE_STRIKE_DAMAGE_TYPE_CHOICES = [
  "radiant",
  "weapon_normal",
] as const satisfies readonly string[];
const SORCEROUS_BURST_DAMAGE_TYPES = [
  "acid",
  "cold",
  "fire",
  "lightning",
  "poison",
  "psychic",
  "thunder",
] as const satisfies readonly DamageType[];
const SHILLELAGH_WEAPON_UNIT_IDS = [
  "weapon_club",
  "weapon_quarterstaff",
] as const satisfies readonly WeaponRecord["id"][];
const SCORCHING_RAY_DAMAGE_TYPE = "fire" as const satisfies DamageType;
const SCORCHING_RAY_RANGE_FEET = 120;
const SCORCHING_RAY_ATTACK_KIND = "ranged_spell_attack" as const;
const SCORCHING_RAY_BASE_LEVEL = 2;
const SCORCHING_RAY_BASE_RAY_COUNT = 3;
const SCORCHING_RAY_RAYS_PER_SLOT_ABOVE_BASE = 1;

export function supportedCantripSpellHostedWeaponAttackProfile(
  actor: BattleCreatureState,
  spell: SpellRecord,
  spellcastingAbilityModifier: AbilityModifier,
  proficiencyBonus: ProficiencyBonusType,
  characterLevel: number,
): readonly SupportedSpellInvocation[] {
  if (actor.origin.kind !== "character" || !isCanonicalSrdTrueStrike(spell)) {
    return [];
  }
  const origin = actor.origin;
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 0 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    spell.mechanics.phases.length !== 1
  ) {
    return [];
  }
  const phase = spell.mechanics.phases[0];
  const effects = phase?.kind === "direct" ? phase.effects : undefined;
  const effect = effects?.[0];
  const bonusDamage =
    effect?.kind === "make_weapon_attack" ? effect.bonusDamage : undefined;
  if (
    phase?.kind !== "direct" ||
    effects === undefined ||
    effects.length !== 1 ||
    effect?.kind !== "make_weapon_attack" ||
    effect.damageTypeChoice === undefined ||
    bonusDamage === undefined ||
    typeof bonusDamage.damageType !== "string" ||
    effect.weapon !== "material_component" ||
    effect.abilityOverride !== "spellcasting" ||
    !sameStringSet(effect.damageTypeChoice, [
      ...TRUE_STRIKE_DAMAGE_TYPE_CHOICES,
    ])
  ) {
    return [];
  }
  const bonusDamageExpr = supportedDamageAmountExpr({
    amount: bonusDamage.amount,
    spellLevel: spell.mechanics.level,
    characterLevel,
  });
  if (bonusDamageExpr === null) {
    return [];
  }
  const bonusDamageType: DamageType = bonusDamage.damageType;
  const attacks = [
    ...(origin.attack === null
      ? []
      : [
          {
            itemId:
              origin.selectedLoadout.weapon?.itemId ?? origin.attack.weapon.id,
            attack: origin.attack,
          },
        ]),
    ...(origin.offHandAttack === undefined
      ? []
      : [
          {
            itemId:
              origin.selectedLoadout.offHandWeapon?.itemId ??
              origin.offHandAttack.weapon.id,
            attack: origin.offHandAttack,
          },
        ]),
  ];
  return attacks
    .filter(
      ({ attack }) =>
        attack.weapon.costGp >= 0.01 &&
        origin.weaponProficiencies.some((proficiency) =>
          weaponMatchesProficiency(attack.weapon, proficiency),
        ),
    )
    .map(({ itemId, attack }) => ({
      access: { tag: "classCantrip" as const },
      resource: { tag: "none" as const },
      procedure: "spellHostedWeaponAttack" as const,
      spell,
      actionCost: "magicAction" as const,
      componentWeapon: { itemId, attack },
      spellcastingAbilityModifier,
      attackBonus: attackBonus(
        Number(spellcastingAbilityModifier) + Number(proficiencyBonus),
      ),
      damageTypeChoices: [
        ...new Set<DamageType>(["radiant", attack.weapon.damage.damageType]),
      ],
      bonusDamage: {
        expr: bonusDamageExpr,
        damageType: bonusDamageType,
      },
    }));
}

export function supportedCantripWeaponAttackOverrideProfile(
  actor: BattleCreatureState,
  spell: SpellRecord,
  spellcastingAbilityModifier: AbilityModifier,
  proficiencyBonus: ProficiencyBonusType,
  characterLevel: number,
): readonly SupportedSpellInvocation[] {
  if (
    actor.origin.kind !== "character" ||
    !isCanonicalSrdShillelaghSpellDefinition(spell) ||
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 0 ||
    spell.mechanics.castingTime.kind !== "bonus_action" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "minute" ||
    spell.mechanics.duration.value.amount !== 1 ||
    spell.mechanics.operations.length !== 1
  ) {
    return [];
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.value,
  );
  const operation = spell.mechanics.operations[0];
  const effect =
    operation?.trigger.kind === "passive" &&
    operation.effect.kind === "override_attached_weapon_attack"
      ? operation.effect
      : null;
  const damageExpr =
    effect === null
      ? null
      : effect.damageDie.kind === "threshold_tiers"
        ? shillelaghDamageExpr(effect.damageDie, characterLevel)
        : null;
  if (
    effect === null ||
    effect.replacesAbility !== "str" ||
    effect.attackRollAbility !== "spellcasting" ||
    effect.damageRollAbility !== "spellcasting" ||
    effect.attackScope !== "melee_attacks_using_attached_weapon" ||
    !sameStringSet(effect.damageTypeChoice, ["force", "weapon_normal"]) ||
    damageExpr === null ||
    Either.isLeft(durationTicks)
  ) {
    return [];
  }
  return shillelaghAttachedWeaponAttacks(actor).map(({ itemId, attack }) => ({
    access: { tag: "classCantrip" as const },
    resource: { tag: "none" as const },
    procedure: "weaponAttackOverride" as const,
    spell,
    actionCost: "bonusAction" as const,
    attachedWeapon: { itemId, attack },
    activeEffect: {
      kind: "spellWeaponAttackOverride" as const,
      sourceSpellId: spell.id,
      sourceCombatantId: actor.combatantId,
      weaponItemId: itemId,
      spellcastingAbilityModifier,
      attackBonus: attackBonus(
        Number(spellcastingAbilityModifier) + Number(proficiencyBonus),
      ),
      damage: { expr: damageExpr },
      damageTypeChoices: ["force", attack.weapon.damage.damageType],
      expiresAt: {
        kind: "duration" as const,
        durationTicks: durationTicks.right,
      },
    },
  }));
}

function shillelaghAttachedWeaponAttacks(actor: BattleCreatureState): readonly {
  readonly itemId: string;
  readonly attack: CharacterWeaponAttackActionOption;
}[] {
  if (actor.origin.kind !== "character") {
    return [];
  }
  const origin = actor.origin;
  return [
    ...(origin.attack === null || origin.selectedLoadout.weapon === undefined
      ? []
      : [
          {
            itemId: origin.selectedLoadout.weapon.itemId,
            attack: origin.attack,
            unitId: origin.selectedLoadout.weapon.unitId,
          },
        ]),
    ...(origin.offHandAttack === undefined ||
    origin.selectedLoadout.offHandWeapon === undefined
      ? []
      : [
          {
            itemId: origin.selectedLoadout.offHandWeapon.itemId,
            attack: origin.offHandAttack,
            unitId: origin.selectedLoadout.offHandWeapon.unitId,
          },
        ]),
  ].filter(
    (
      held,
    ): held is {
      readonly itemId: string;
      readonly attack: CharacterWeaponAttackActionOption;
      readonly unitId: WeaponRecord["id"];
    } =>
      held.attack.weapon.usage === "melee" &&
      held.unitId === held.attack.weapon.id &&
      SHILLELAGH_WEAPON_UNIT_IDS.some((unitId) => unitId === held.unitId),
  );
}

function shillelaghDamageExpr(
  damageDie: {
    readonly kind: string;
    readonly axis: string;
    readonly base: { readonly dice: number; readonly dieSize: number };
    readonly tiers: readonly {
      readonly atLevel: number;
      readonly override: {
        readonly dice?: number | undefined;
        readonly dieSize?: number | undefined;
      };
    }[];
  },
  characterLevel: number,
): {
  readonly dice: number;
  readonly dieSize: DamageDieSize;
} | null {
  if (
    damageDie.kind !== "threshold_tiers" ||
    damageDie.axis !== "character" ||
    damageDie.base.dice !== 1 ||
    damageDie.base.dieSize !== 8
  ) {
    return null;
  }
  const override = damageDie.tiers.reduce<{
    readonly dice: number;
    readonly dieSize: number;
  }>(
    (current, tier) =>
      characterLevel >= tier.atLevel
        ? {
            dice: tier.override.dice ?? current.dice,
            dieSize: tier.override.dieSize ?? current.dieSize,
          }
        : current,
    damageDie.base,
  );
  if (!isDamageDieSize(override.dieSize)) {
    return null;
  }
  return {
    dice: override.dice,
    dieSize: override.dieSize,
  };
}

function isDamageDieSize(value: number): value is DamageDieSize {
  return DAMAGE_DIE_SIZES.some((dieSize) => dieSize === value);
}

export function isCanonicalSrdShillelaghSpellDefinition(
  spell: SpellRecord,
): boolean {
  return (
    spell.name === "Shillelagh" &&
    spell.provenance.kind === "srd-5.2.1" &&
    spell.provenance.section === "Spells/Descriptions-S-Z#Shillelagh"
  );
}

export function isCanonicalSrdTrueStrike(spell: SpellRecord): boolean {
  return (
    spell.name === "True Strike" &&
    spell.provenance.kind === "srd-5.2.1" &&
    spell.provenance.section === "Spells/Descriptions-S-Z#True Strike"
  );
}

const byKind = Match.discriminator("kind");

function weaponMatchesProficiency(
  weapon: WeaponRecord,
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
        weapon.properties?.some((property) =>
          propertyProficiency.anyOfProperties.includes(property.kind),
        ) === true,
    ),
    Match.exhaustive,
  );
}

export function supportedPreparedSpellAttackProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
  spellcastingAbilityModifier: AbilityModifier,
  proficiencyBonus: ProficiencyBonusType,
): readonly SupportedSpellInvocation[] {
  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return supportedSpellAttackDamageProfile({
      spell,
      access: { tag: "prepared" },
      resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
      spellcastingAbilityModifier,
      proficiencyBonus,
      slotLevel: slot.spellLevel,
    });
  });
}

export function supportedPreparedSpellAttackSequenceProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
  spellcastingAbilityModifier: AbilityModifier,
  proficiencyBonus: ProficiencyBonusType,
): readonly SupportedSpellInvocation[] {
  const phase =
    spell.mechanics.family === "activation"
      ? spell.mechanics.phases[0]
      : undefined;
  const damageEffect = phase?.kind === "attack_roll" ? phase.onHit[0] : null;
  const range = spell.mechanics.range;
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== SCORCHING_RAY_BASE_LEVEL ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    range.kind !== "point" ||
    range.feet !== SCORCHING_RAY_RANGE_FEET ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "attack_roll" ||
    phase.attackKind !== SCORCHING_RAY_ATTACK_KIND ||
    phase.onHit.length !== 1 ||
    damageEffect?.kind !== "damage" ||
    damageEffect.damageType !== SCORCHING_RAY_DAMAGE_TYPE ||
    phase.onMiss.length !== 1 ||
    phase.onMiss[0]?.kind !== "none"
  ) {
    return [];
  }
  if (scorchingRayTargetingIsCanonical(phase.attachment) !== true) {
    return [];
  }
  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    const targeting = spellAttackSequenceSlotTargeting(
      phase.attachment,
      slot.spellLevel,
    );
    const damageExpr = supportedDamageAmountExpr({
      amount: damageEffect.amount,
      spellLevel: spell.mechanics.level,
      slotLevel: slot.spellLevel,
    });
    if (targeting === null || damageExpr === null) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
        procedure: "spellAttackSequence",
        spell,
        targeting,
        damage: {
          expr: damageExpr,
          damageType: SCORCHING_RAY_DAMAGE_TYPE,
        },
        rangeFeet: movementFeet(SCORCHING_RAY_RANGE_FEET),
        attackKind: SCORCHING_RAY_ATTACK_KIND,
        attackBonus: attackBonus(
          Number(spellcastingAbilityModifier) + Number(proficiencyBonus),
        ),
      },
    ];
  });
}

export function supportedPreparedChainedSpellAttackDamageProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
  spellcastingAbilityModifier: AbilityModifier,
  proficiencyBonus: ProficiencyBonusType,
): readonly SupportedSpellInvocation[] {
  if (!isCanonicalSrdChromaticOrbSpellDefinition(spell)) {
    return [];
  }
  const range = spell.mechanics.range;
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    range.kind !== "point" ||
    typeof range.feet !== "number" ||
    spell.mechanics.phases.length !== 1
  ) {
    return [];
  }
  const rangeFeet = movementFeet(range.feet);
  const phase = spell.mechanics.phases[0];
  const continuation = phase?.kind === "attack_roll" ? phase.continue : null;
  const leapPhase =
    continuation?.kind === "repeat" ? continuation.next[0] : undefined;
  const hitDamage = phase?.kind === "attack_roll" ? phase.onHit[0] : undefined;
  const leapHitDamage =
    leapPhase?.kind === "attack_roll" ? leapPhase.onHit[0] : undefined;
  const targeting =
    phase?.kind === "attack_roll"
      ? spellAttackDamageTargeting(phase.attachment)
      : null;
  const leapTargeting =
    leapPhase?.kind === "attack_roll"
      ? spellAttackDamageTargeting(leapPhase.attachment)
      : null;
  if (
    phase?.kind !== "attack_roll" ||
    leapPhase?.kind !== "attack_roll" ||
    !supportedSpellAttackKind(phase.attackKind) ||
    !supportedSpellAttackKind(leapPhase.attackKind) ||
    phase.attackKind !== leapPhase.attackKind ||
    targeting === null ||
    targeting.kind !== "singleCombatant" ||
    leapTargeting === null ||
    leapTargeting.kind !== "singleCombatant" ||
    phase.onHit.length !== 1 ||
    phase.onMiss.length !== 1 ||
    phase.onMiss[0]?.kind !== "none" ||
    leapPhase.onHit.length !== 1 ||
    leapPhase.onMiss.length !== 1 ||
    leapPhase.onMiss[0]?.kind !== "none" ||
    continuation?.kind !== "repeat" ||
    continuation.when.kind !== "damage_roll_has_duplicate_faces" ||
    continuation.when.minimumMultiplicity !== 2 ||
    continuation.next.length !== 1 ||
    !isCanonicalChromaticOrbContinuationLimitSet(continuation.limits) ||
    hitDamage?.kind !== "damage" ||
    leapHitDamage?.kind !== "damage" ||
    typeof hitDamage.damageType !== "object" ||
    hitDamage.damageType.kind !== "hole" ||
    typeof hitDamage.damageType.value !== "object" ||
    hitDamage.damageType.value.kind !== "choice" ||
    !sameStringSet(hitDamage.damageType.value.options, [
      ...CHROMATIC_ORB_DAMAGE_TYPES,
    ]) ||
    typeof leapHitDamage.damageType !== "object" ||
    leapHitDamage.damageType.kind !== "same_choice_as" ||
    leapHitDamage.damageType.holeId !== hitDamage.damageType.holeId
  ) {
    return [];
  }

  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    const damageExpr = supportedDamageAmountExpr({
      amount: hitDamage.amount,
      spellLevel: spell.mechanics.level,
      slotLevel: slot.spellLevel,
    });
    const leapDamageExpr = supportedDamageAmountExpr({
      amount: leapHitDamage.amount,
      spellLevel: spell.mechanics.level,
      slotLevel: slot.spellLevel,
    });
    if (
      damageExpr === null ||
      leapDamageExpr === null ||
      !sameDiceExpr(damageExpr, leapDamageExpr)
    ) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
        procedure: "chainedSpellAttackDamage",
        spell,
        targeting,
        damage: { expr: damageExpr },
        damageTypeChoices: CHROMATIC_ORB_DAMAGE_TYPES,
        rangeFeet,
        leapRangeFeet: CHROMATIC_ORB_LEAP_RANGE_FEET,
        attackKind: phase.attackKind,
        attackBonus: attackBonus(
          Number(spellcastingAbilityModifier) + Number(proficiencyBonus),
        ),
      },
    ];
  });
}

export function isCanonicalSrdChromaticOrbSpellDefinition(
  spell: SpellRecord,
): boolean {
  return (
    spell.name === "Chromatic Orb" &&
    spell.provenance.kind === "srd-5.2.1" &&
    spell.provenance.section === "Spells/Descriptions-A-D#Chromatic Orb"
  );
}

export function isCanonicalChromaticOrbContinuationLimitSet(
  limits: readonly { readonly kind: string }[],
): boolean {
  return (
    limits.length === CHROMATIC_ORB_CONTINUATION_LIMIT_KINDS.length &&
    CHROMATIC_ORB_CONTINUATION_LIMIT_KINDS.every((requiredKind) =>
      limits.some((limit) => limit.kind === requiredKind),
    )
  );
}

export function supportedPreparedAttackBurstSaveDamageProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
  spellcastingAbilityModifier: AbilityModifier,
  proficiencyBonus: ProficiencyBonusType,
): readonly SupportedSpellInvocation[] {
  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return supportedAttackBurstSaveDamageProfile({
      spell,
      access: { tag: "prepared" },
      resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
      spellcastingAbilityModifier,
      proficiencyBonus,
      slotLevel: slot.spellLevel,
    });
  });
}

export function supportedAttackBurstSaveDamageProfile(
  input: {
    readonly spell: SpellRecord;
    readonly spellcastingAbilityModifier: AbilityModifier;
    readonly proficiencyBonus: ProficiencyBonusType;
    readonly slotLevel: SpellSlotLevel;
  } & PreparedDamageSpellSource,
): readonly SupportedSpellInvocation[] {
  const spell = input.spell;
  if (spell.mechanics.family !== "activation") {
    return [];
  }
  const [attackPhase, burstPhase] = spell.mechanics.phases;
  const targeting =
    attackPhase?.kind === "attack_roll"
      ? spellAttackDamageTargeting(attackPhase.attachment)
      : null;
  const burstTargeting =
    burstPhase?.kind === "save_gate"
      ? primaryTargetOriginEmanationTargeting(burstPhase.attachment)
      : null;
  const rangeFeet =
    targeting?.kind === "singleCombatant"
      ? singleTargetSpellRangeFeet(spell.mechanics.range)
      : null;
  if (
    spell.name !== "Ice Knife" ||
    spell.provenance.kind !== "srd-5.2.1" ||
    spell.provenance.section !== "Spells/Descriptions-E-L#Ice Knife" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    rangeFeet === null ||
    spell.mechanics.phases.length !== 2 ||
    attackPhase?.kind !== "attack_roll" ||
    burstPhase?.kind !== "save_gate" ||
    !supportedSpellAttackKind(attackPhase.attackKind) ||
    targeting === null ||
    targeting.kind !== "singleCombatant" ||
    burstTargeting === null ||
    attackPhase.onHit.length !== 1 ||
    attackPhase.onMiss.length !== 1 ||
    attackPhase.onMiss[0]?.kind !== "none" ||
    burstPhase.ability !== "dex" ||
    burstPhase.dc.kind !== "caster_spell_save_dc" ||
    burstPhase.onSuccess.kind !== "none" ||
    burstPhase.onFail.kind !== "damage" ||
    typeof burstPhase.onFail.damageType !== "string"
  ) {
    return [];
  }
  const hitDamage = attackPhase.onHit[0];
  if (
    hitDamage?.kind !== "damage" ||
    typeof hitDamage.damageType !== "string"
  ) {
    return [];
  }
  const hitDamageExpr = supportedDamageAmountExpr({
    amount: hitDamage.amount,
    spellLevel: spell.mechanics.level,
    slotLevel: input.slotLevel,
  });
  const burstDamageExpr = supportedDamageAmountExpr({
    amount: burstPhase.onFail.amount,
    spellLevel: spell.mechanics.level,
    slotLevel: input.slotLevel,
  });
  if (hitDamageExpr === null || burstDamageExpr === null) {
    return [];
  }

  return [
    {
      access: input.access,
      resource: input.resource,
      procedure: "attackBurstSaveDamage",
      spell,
      targeting,
      attackKind: attackPhase.attackKind,
      attackBonus: attackBonus(
        Number(input.spellcastingAbilityModifier) +
          Number(input.proficiencyBonus),
      ),
      damage: {
        expr: hitDamageExpr,
        damageType: hitDamage.damageType,
      },
      burst: {
        ability: burstPhase.ability,
        dc: burstPhase.dc,
        targeting: burstTargeting,
        damage: {
          expr: burstDamageExpr,
          damageType: burstPhase.onFail.damageType,
        },
        successDamage: "none",
      },
      rangeFeet,
    },
  ];
}

export function supportedSpellAttackDamageProfile(
  input: {
    readonly spell: SpellRecord;
    readonly spellcastingAbilityModifier: AbilityModifier;
    readonly proficiencyBonus: ProficiencyBonusType;
    readonly slotLevel?: SpellSlotLevel;
    readonly characterLevel?: number;
  } & DamageSpellSource,
): readonly SupportedSpellInvocation[] {
  const spell = input.spell;
  if (spell.mechanics.family !== "activation") {
    return [];
  }
  const phase = spell.mechanics.phases[0];
  const targeting =
    phase?.kind === "attack_roll"
      ? spellAttackDamageTargeting(phase.attachment)
      : null;
  const rangeFeet = singleSpellAttackDamageRangeFeet(
    targeting,
    spell.mechanics.range,
  );
  if (
    (input.access.tag === "classCantrip"
      ? spell.mechanics.level !== 0
      : spell.mechanics.level < 1) ||
    spell.mechanics.castingTime.kind !== "action" ||
    rangeFeet === null ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "attack_roll" ||
    !supportedSpellAttackKind(phase.attackKind) ||
    targeting === null ||
    phase.onHit.length < 1 ||
    phase.onMiss.length !== 1 ||
    phase.onMiss[0]?.kind !== "none"
  ) {
    return [];
  }
  const [damageEffect, ...postDamageEffects] = phase.onHit;
  if (damageEffect?.kind !== "damage") {
    return [];
  }
  const fixedDamageType =
    typeof damageEffect.damageType === "string"
      ? damageEffect.damageType
      : null;
  const sorcerousBurstProjection = supportedSorcerousBurstProjection(
    spell,
    damageEffect,
    input.spellcastingAbilityModifier,
  );
  if (fixedDamageType === null && sorcerousBurstProjection === null) {
    return [];
  }
  const objectHitProjection = supportedSpellObjectHitEffect({
    spell,
    phase,
    targeting,
    damageEffect,
    postDamageEffects,
  });
  if (objectHitProjection === null) {
    return [];
  }
  const postDamageRiders = supportedSpellPostDamageRiders(
    spell,
    phase,
    objectHitProjection.postDamageEffects,
  );
  if (postDamageRiders === null) {
    return [];
  }
  const damageExpr = supportedDamageAmountExpr({
    amount: damageEffect.amount,
    spellLevel: spell.mechanics.level,
    slotLevel: input.slotLevel,
    characterLevel: input.characterLevel,
  });
  if (damageExpr == null) {
    return [];
  }
  const chosenDamageProjection = sorcerousBurstProjection;
  const damage =
    chosenDamageProjection === null
      ? fixedDamageType === null
        ? null
        : {
            kind: "fixedSpellAttackDamage" as const,
            expr: damageExpr,
            damageType: fixedDamageType,
          }
      : {
          kind: "sorcerousBurstDamageTypeChoice" as const,
          expr: damageExpr,
          damageTypeChoices: chosenDamageProjection.damageTypes,
          maxDieAdditionalDiceLimit: chosenDamageProjection.maxAdditionalDice,
        };
  if (damage === null) {
    return [];
  }
  const attackDamageInvocation = {
    procedure: "spellAttackDamage" as const,
    spell,
    targeting,
    damage,
    rangeFeet,
    attackKind: phase.attackKind,
    attackBonus: attackBonus(
      Number(input.spellcastingAbilityModifier) +
        Number(input.proficiencyBonus),
    ),
    postDamageRiders,
    objectHitEffect: objectHitProjection.objectHitEffect,
  };

  if (input.access.tag === "classCantrip" && input.resource.tag === "none") {
    return [
      {
        access: { tag: "classCantrip" },
        resource: { tag: "none" },
        ...attackDamageInvocation,
      } satisfies SupportedSpellInvocation,
    ];
  }
  if (input.access.tag !== "prepared" || input.resource.tag !== "spellSlot") {
    return [];
  }
  return [
    {
      access: { tag: "prepared" },
      resource: input.resource,
      ...attackDamageInvocation,
    } satisfies SupportedSpellInvocation,
  ];
}

function supportedSorcerousBurstProjection(
  spell: SpellRecord,
  damageEffect: SpellAttackHitEffect,
  spellcastingAbilityModifier: AbilityModifier,
): {
  readonly damageTypes: readonly [DamageType, ...DamageType[]];
  readonly maxAdditionalDice: number;
} | null {
  if (
    damageEffect.kind !== "damage" ||
    !isCanonicalSrdSorcerousBurstSpellDefinition(spell) ||
    typeof damageEffect.damageType !== "object" ||
    damageEffect.damageType.kind !== "hole" ||
    typeof damageEffect.damageType.value !== "object" ||
    damageEffect.damageType.value.kind !== "choice" ||
    !sameStringSet(damageEffect.damageType.value.options, [
      ...SORCEROUS_BURST_DAMAGE_TYPES,
    ]) ||
    damageEffect.amount.kind !== "threshold_tiers_exploding_max_die" ||
    damageEffect.amount.axis !== "character" ||
    damageEffect.amount.baseDice !== 1 ||
    damageEffect.amount.dieSize !== 8 ||
    damageEffect.amount.maxAdditionalDice !== "spellcasting_ability_modifier"
  ) {
    return null;
  }
  return {
    damageTypes: SORCEROUS_BURST_DAMAGE_TYPES,
    maxAdditionalDice: Math.max(0, Number(spellcastingAbilityModifier)),
  };
}

export function isCanonicalSrdSorcerousBurstSpellDefinition(
  spell: SpellRecord,
): boolean {
  return (
    spell.name === "Sorcerous Burst" &&
    spell.provenance.kind === "srd-5.2.1" &&
    spell.provenance.section === "Spells/Descriptions-S-Z#Sorcerous Burst"
  );
}

export function supportedCantripSpellAttackSequenceProfile(
  spell: SpellRecord,
  spellcastingAbilityModifier: AbilityModifier,
  proficiencyBonus: ProficiencyBonusType,
  characterLevel: number,
): readonly SupportedSpellInvocation[] {
  const phase =
    spell.mechanics.family === "activation"
      ? spell.mechanics.phases[0]
      : undefined;
  const targeting =
    phase?.kind === "attack_roll"
      ? spellAttackSequenceTargeting(phase.attachment, characterLevel)
      : null;
  const damageEffect = phase?.kind === "attack_roll" ? phase.onHit[0] : null;
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 0 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 120 ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "attack_roll" ||
    phase.attackKind !== "ranged_spell_attack" ||
    targeting === null ||
    phase.onHit.length !== 1 ||
    damageEffect?.kind !== "damage" ||
    damageEffect.damageType !== "force" ||
    phase.onMiss.length !== 1 ||
    phase.onMiss[0]?.kind !== "none"
  ) {
    return [];
  }
  const damageExpr = supportedDamageAmountExpr({
    amount: damageEffect.amount,
    spellLevel: spell.mechanics.level,
    characterLevel,
  });
  if (damageExpr === null) {
    return [];
  }
  return [
    {
      access: { tag: "classCantrip" },
      resource: { tag: "none" },
      procedure: "spellAttackSequence",
      spell,
      targeting,
      damage: {
        expr: damageExpr,
        damageType: damageEffect.damageType,
      },
      rangeFeet: movementFeet(spell.mechanics.range.feet),
      attackKind: phase.attackKind,
      attackBonus: attackBonus(
        Number(spellcastingAbilityModifier) + Number(proficiencyBonus),
      ),
    },
  ];
}

function spellAttackSequenceTargeting(
  attachment: Attachment,
  characterLevel: number,
): CantripSpellAttackSequenceTargeting | null {
  if (
    attachment.kind !== "hole" ||
    attachment.value.kind !== "target" ||
    !sameStringSet(attachment.value.selection.targetKinds ?? [], [
      "creature",
      "object",
    ])
  ) {
    return null;
  }
  const beamCount = eldritchBlastBeamCount(
    attachment.value.selection,
    characterLevel,
  );
  return beamCount === null
    ? null
    : {
        kind: "spellAttackSequenceCreatureOrObject",
        countSource: "characterLevel",
        attackCount: beamCount,
      };
}

function spellAttackSequenceSlotTargeting(
  attachment: Attachment,
  slotLevel: SpellSlotLevel,
): PreparedSpellAttackSequenceTargeting | null {
  if (
    attachment.kind !== "hole" ||
    attachment.value.kind !== "target" ||
    !sameStringSet(attachment.value.selection.targetKinds ?? [], [
      "creature",
      "object",
    ])
  ) {
    return null;
  }
  const attackCount = scorchingRayAttackCount(
    attachment.value.selection,
    slotLevel,
  );
  return attackCount === null
    ? null
    : {
        kind: "spellAttackSequenceCreatureOrObject",
        countSource: "spellSlotLevel",
        attackCount,
      };
}

function scorchingRayTargetingIsCanonical(attachment: Attachment): boolean {
  if (
    attachment.kind !== "hole" ||
    attachment.value.kind !== "target" ||
    !sameStringSet(attachment.value.selection.targetKinds ?? [], [
      "creature",
      "object",
    ])
  ) {
    return false;
  }
  return scorchingRaySelectionIsCanonical(attachment.value.selection);
}

function scorchingRaySelectionIsCanonical(selection: TargetSelection): boolean {
  if (selection.mode !== "choose_up_to" || selection.repeatsAllowed !== true) {
    return false;
  }
  const count = selection.count;
  return (
    typeof count === "object" &&
    count.kind === "linear" &&
    count.base === SCORCHING_RAY_BASE_RAY_COUNT &&
    count.baseLevel === SCORCHING_RAY_BASE_LEVEL &&
    count.perSlotAboveBase === SCORCHING_RAY_RAYS_PER_SLOT_ABOVE_BASE
  );
}

function scorchingRayAttackCount(
  selection: TargetSelection,
  slotLevel: SpellSlotLevel,
): ScorchingRayRayCount | null {
  if (!scorchingRaySelectionIsCanonical(selection)) {
    return null;
  }
  const slotOffset = Number(slotLevel) - SCORCHING_RAY_BASE_LEVEL;
  if (slotOffset < 0) {
    return null;
  }
  return scorchingRayRayCount(
    SCORCHING_RAY_BASE_RAY_COUNT +
      slotOffset * SCORCHING_RAY_RAYS_PER_SLOT_ABOVE_BASE,
  );
}

function eldritchBlastBeamCount(
  selection: TargetSelection,
  characterLevel: number,
): EldritchBlastBeamCount | null {
  if (selection.mode !== "choose_up_to" || selection.repeatsAllowed !== true) {
    return null;
  }
  const count = selection.count;
  if (
    typeof count !== "object" ||
    count.kind !== "threshold_tiers" ||
    count.axis !== "character"
  ) {
    return null;
  }
  if (
    count.base !== 1 ||
    count.tiers.length !== ELDRITCH_BLAST_BEAM_COUNT_TIERS.length ||
    !count.tiers.every((tier, index) => {
      const expected = ELDRITCH_BLAST_BEAM_COUNT_TIERS[index];
      return (
        expected !== undefined &&
        tier.atLevel === expected.atLevel &&
        tier.value === expected.value
      );
    })
  ) {
    return null;
  }
  return ELDRITCH_BLAST_BEAM_COUNT_TIERS.reduce<EldritchBlastBeamCount>(
    (current, tier) => (characterLevel >= tier.atLevel ? tier.value : current),
    count.base,
  );
}

function supportedSpellObjectHitEffect(input: {
  readonly spell: SpellRecord;
  readonly phase: Extract<
    SpellActivationPhase,
    { readonly kind: "attack_roll" }
  >;
  readonly targeting: SpellAttackDamageTargeting;
  readonly damageEffect: SpellAttackHitEffect;
  readonly postDamageEffects: readonly SpellAttackHitEffect[];
}): {
  readonly objectHitEffect: SpellObjectHitEffect;
  readonly postDamageEffects: readonly SpellAttackHitEffect[];
} | null {
  if (
    input.targeting.kind === "singleCreatureOrObject" &&
    isCanonicalSrdFireBoltObjectIgnition(input)
  ) {
    return {
      objectHitEffect: { kind: "igniteFlammableUnattended" },
      postDamageEffects: [],
    };
  }
  return {
    objectHitEffect: { kind: "none" },
    postDamageEffects: input.postDamageEffects,
  };
}

function isCanonicalSrdFireBoltObjectIgnition(input: {
  readonly spell: SpellRecord;
  readonly phase: Extract<
    SpellActivationPhase,
    { readonly kind: "attack_roll" }
  >;
  readonly damageEffect: SpellAttackHitEffect;
  readonly postDamageEffects: readonly SpellAttackHitEffect[];
}): boolean {
  return (
    input.spell.name === "Fire Bolt" &&
    input.spell.provenance.kind === "srd-5.2.1" &&
    input.spell.provenance.section === "Spells/Descriptions-E-L#Fire Bolt" &&
    input.spell.mechanics.level === 0 &&
    input.spell.mechanics.duration.kind === "instantaneous" &&
    input.phase.attackKind === "ranged_spell_attack" &&
    input.damageEffect.kind === "damage" &&
    input.damageEffect.damageType === "fire" &&
    input.postDamageEffects.length === 1 &&
    input.postDamageEffects[0]?.kind === "ignite_objects" &&
    input.postDamageEffects[0].filter.material === "flammable" &&
    input.postDamageEffects[0].filter.targetRelation === "not_worn_or_carried"
  );
}

export function spellAttackDamageTargeting(
  attachment: Attachment,
): SpellAttackDamageTargeting | null {
  if (
    attachment.kind !== "hole" ||
    attachment.value.kind !== "target" ||
    attachment.value.selection.mode !== "one"
  ) {
    return null;
  }
  const targetKinds = attachment.value.selection.targetKinds;
  if (targetKinds === undefined || sameStringSet(targetKinds, ["creature"])) {
    return { kind: "singleCombatant" };
  }
  if (sameStringSet(targetKinds, ["creature", "object"])) {
    return { kind: "singleCreatureOrObject" };
  }
  return null;
}

export function singleSpellAttackDamageRangeFeet(
  targeting: SpellAttackDamageTargeting | null,
  range: SpellRecord["mechanics"]["range"],
): ReturnType<typeof singleTargetSpellRangeFeet> {
  if (targeting === null) {
    return null;
  }
  return singleTargetSpellRangeFeet(range);
}

export function primaryTargetOriginEmanationTargeting(
  attachment: Attachment,
): Extract<
  SpellTargeting,
  { readonly kind: "primaryTargetOriginEmanation" }
> | null {
  const value = attachment.kind === "hole" ? attachment.value : attachment;
  if (
    value.kind === "area" &&
    value.origin.kind === "on_primary_target" &&
    value.shape.kind === "emanation" &&
    value.shape.radiusFeet === SUPPORTED_POINT_SPHERE_SAVE_GATE_RADIUS_FEET
  ) {
    return {
      kind: "primaryTargetOriginEmanation",
      radiusFeet: movementFeet(value.shape.radiusFeet),
    };
  }
  return null;
}
