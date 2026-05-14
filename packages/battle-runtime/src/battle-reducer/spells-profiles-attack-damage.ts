// Spell attack damage profile projections extracted from spells-profiles.ts.

import {
  attackBonus,
  movementFeet,
  type AbilityModifier,
  type ProficiencyBonus as ProficiencyBonusType,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import type {
  Attachment,
  DamageType,
  SpellRecord,
  TargetSelection,
  WeaponProficiency,
  WeaponRecord,
} from "@dnd/surface/surface/types";
import { Match } from "effect";
import {
  SUPPORTED_POINT_SPHERE_SAVE_GATE_RADIUS_FEET,
  damageSpellSource,
  type BattleCreatureState,
  type DamageSpellSource,
  type PreparedDamageSpellSource,
  type SpellActivationPhase,
  type SpellAttackBeamSequenceTargeting,
  type SpellAttackDamageTargeting,
  type SpellAttackHitEffect,
  type SpellTargeting,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type { CharacterBattleSpellcastingState } from "../character-battle-resources.ts";
import {
  CHROMATIC_ORB_CONTINUATION_LIMIT_KINDS,
  CHROMATIC_ORB_DAMAGE_TYPES,
  CHROMATIC_ORB_LEAP_RANGE_FEET,
  ELDRITCH_BLAST_BEAM_COUNT_TIERS,
  type EldritchBlastBeamCount,
} from "./domain-constants.ts";
import { sameDiceExpr, sameStringSet } from "./spells-profile-shared.ts";
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
    ...supportedCantripSpellAttackBeamSequenceProfile(
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
  if (
    damageEffect?.kind !== "damage" ||
    typeof damageEffect.damageType !== "string"
  ) {
    return [];
  }
  if (
    spellAttackDamageHasUnprojectedObjectHitEffect({
      spell,
      phase,
      targeting,
      damageEffect,
      postDamageEffects,
    })
  ) {
    return [];
  }
  const postDamageRiders = supportedSpellPostDamageRiders(
    spell,
    phase,
    postDamageEffects,
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
  if (damageExpr == null || typeof damageEffect.damageType !== "string") {
    return [];
  }

  const attackDamageInvocation = {
    procedure: "spellAttackDamage" as const,
    spell,
    targeting,
    damage: {
      expr: damageExpr,
      damageType: damageEffect.damageType,
    },
    rangeFeet,
    attackKind: phase.attackKind,
    attackBonus: attackBonus(
      Number(input.spellcastingAbilityModifier) +
        Number(input.proficiencyBonus),
    ),
    postDamageRiders,
  };

  return [{ ...damageSpellSource(input), ...attackDamageInvocation }];
}

export function supportedCantripSpellAttackBeamSequenceProfile(
  spell: SpellRecord,
  spellcastingAbilityModifier: AbilityModifier,
  proficiencyBonus: ProficiencyBonusType,
  characterLevel: number,
): readonly SupportedSpellInvocation[] {
  if (!isCanonicalSrdEldritchBlastSpellDefinition(spell)) {
    return [];
  }
  const phase =
    spell.mechanics.family === "activation"
      ? spell.mechanics.phases[0]
      : undefined;
  const targeting =
    phase?.kind === "attack_roll"
      ? spellAttackBeamSequenceTargeting(phase.attachment, characterLevel)
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
      procedure: "spellAttackBeamSequence",
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

export function isCanonicalSrdEldritchBlastSpellDefinition(
  spell: SpellRecord,
): boolean {
  return (
    spell.name === "Eldritch Blast" &&
    spell.provenance.kind === "srd-5.2.1" &&
    spell.provenance.section === "Spells/Descriptions-E-L#Eldritch Blast"
  );
}

function spellAttackBeamSequenceTargeting(
  attachment: Attachment,
  characterLevel: number,
): SpellAttackBeamSequenceTargeting | null {
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
    : { kind: "beamSequenceCreatureOrObject", beamCount };
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

function spellAttackDamageHasUnprojectedObjectHitEffect(input: {
  readonly spell: SpellRecord;
  readonly phase: Extract<
    SpellActivationPhase,
    { readonly kind: "attack_roll" }
  >;
  readonly targeting: SpellAttackDamageTargeting;
  readonly damageEffect: SpellAttackHitEffect;
  readonly postDamageEffects: readonly SpellAttackHitEffect[];
}): boolean {
  return (
    input.targeting.kind === "singleCreatureOrObject" &&
    isCanonicalSrdFireBoltWithDeferredObjectIgnition(input)
  );
}

function isCanonicalSrdFireBoltWithDeferredObjectIgnition(input: {
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
    input.postDamageEffects.length === 0
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
