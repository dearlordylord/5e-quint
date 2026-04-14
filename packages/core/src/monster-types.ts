/**
 * Monster-related types mirroring the Quint spec (creature.qnt).
 * SRD 5.2.1: Stat blocks contain the game statistics of a monster.
 */

import type {
  Ability,
  AbilityModifier,
  ArmorClass,
  AdvantageDamageDice,
  Condition,
  DamageType,
  ResourceCount,
  Size,
  SpellId,
  WeaponProperty,
} from "./types";

// --- Phase L: Legendary / Recharge / X-Day types ---

export interface LegendaryActionDef {
  readonly name: string;
  readonly cost: number;
}

export interface RechargeAbilityDef {
  readonly name: string;
  readonly rechargeMin: number; // min d6 roll to recharge (e.g., 5 for "Recharge 5-6")
}

export interface RechargeRollEvent {
  readonly abilityName: string;
  readonly d6Roll: number;
}

export const CANONICAL_MONSTER_SOURCE_KINDS = [
  "canonicalRulesText",
  "licensedPack",
] as const;

export type CanonicalMonsterSourceKind =
  (typeof CANONICAL_MONSTER_SOURCE_KINDS)[number];

export const SUPPORTING_MONSTER_SOURCE_KINDS = [
  "supportingStructuredInput",
] as const;

export type SupportingMonsterSourceKind =
  (typeof SUPPORTING_MONSTER_SOURCE_KINDS)[number];

export const SUPPORTING_SOURCE_CITATION_ROLES = [
  "normalizationInput",
  "crossCheck",
] as const;

export type SupportingSourceCitationRole =
  (typeof SUPPORTING_SOURCE_CITATION_ROLES)[number];

export interface CanonicalSourceCitation {
  readonly sourceName: string;
  readonly sourceKind: CanonicalMonsterSourceKind;
  readonly license: string;
  readonly citation: {
    readonly document: string;
    readonly section: string;
  };
}

export interface SupportingSourceCitation {
  readonly sourceName: string;
  readonly sourceKind: SupportingMonsterSourceKind;
  readonly license: string;
  readonly role: SupportingSourceCitationRole;
  readonly citation: {
    readonly document: string;
    readonly section: string;
  };
}

export interface StatBlockProvenance {
  readonly provenance: CanonicalSourceCitation;
  readonly supportingInputs?: ReadonlyArray<SupportingSourceCitation>;
}

export interface MonsterResourceState {
  readonly legendaryActionsRemaining: ResourceCount;
  readonly legendaryResistancesRemaining: ResourceCount;
  readonly rechargeAvailable: Readonly<Record<string, boolean>>;
  readonly dailyUsesRemaining: Readonly<Record<string, number>>;
}

// --- SRD 5.2.1 Creature Types (14 types, Monsters > Overview) ---

export const CREATURE_TYPES = [
  "aberration",
  "beast",
  "celestial",
  "construct",
  "dragon",
  "elemental",
  "fey",
  "fiend",
  "giant",
  "humanoid",
  "monstrosity",
  "ooze",
  "plant",
  "undead",
] as const;

export type CreatureType = (typeof CREATURE_TYPES)[number];

// --- SRD 5.2.1 Senses ---

export const SENSE_TYPES = [
  "blindsight",
  "darkvision",
  "tremorsense",
  "truesight",
] as const;

export type SenseType = (typeof SENSE_TYPES)[number];

// --- Challenge Rating (sum type: fractional CRs are special cases) ---

export type ChallengeRating =
  | { readonly type: "CR0" }
  | { readonly type: "CR_Eighth" }
  | { readonly type: "CR_Quarter" }
  | { readonly type: "CR_Half" }
  | { readonly type: "CRN"; readonly value: number };

export const MONSTER_BATTLE_BONUS_ACTION_OPTIONS = [
  "disengage",
  "hide",
] as const;

export type MonsterBattleBonusActionOption =
  (typeof MONSTER_BATTLE_BONUS_ACTION_OPTIONS)[number];

export const MONSTER_BATTLE_REACTION_OPTIONS = ["redirectAttack"] as const;

export type MonsterBattleReactionOption =
  (typeof MONSTER_BATTLE_REACTION_OPTIONS)[number];

export const MONSTER_SAVE_TRIGGER_KINDS = ["spell", "magicalEffect"] as const;

export type MonsterSaveTriggerKind =
  (typeof MONSTER_SAVE_TRIGGER_KINDS)[number];

export const MONSTER_CATALOG_BLOCKER_FAMILIES = [
  "attackProjectionGap",
  "attackRider",
  "combatModifierTrait",
  "controlAction",
  "creatureCoordinationTrait",
  "environmentalTrait",
  "mobilityAction",
  "reactiveDefense",
  "saveEffectAction",
  "saveEffectActionWithPrerequisite",
  "skillUtilityTrait",
  "spellReferenceGap",
] as const;

export type MonsterCatalogBlockerFamily =
  (typeof MONSTER_CATALOG_BLOCKER_FAMILIES)[number];

export interface MonsterAttackStockWeaponProjection {
  readonly kind: "stockWeapon";
}

export interface MonsterAttackNaturalWeaponProjection {
  readonly kind: "naturalWeapon";
  readonly damageDie: number;
  readonly diceCount?: number;
  readonly versatileDie?: number;
  readonly properties: ReadonlyArray<WeaponProperty>;
}

export type MonsterAttackBattleProfile =
  | MonsterAttackStockWeaponProjection
  | MonsterAttackNaturalWeaponProjection;

// --- Monster Attack ---

export interface MonsterAttack {
  readonly name: string;
  readonly attackBonus: number;
  readonly reach: number; // 0 for ranged-only
  readonly rangeNormal: number; // 0 for melee-only
  readonly rangeLong: number;
  readonly damageAmount: number; // average damage
  readonly damageType: DamageType;
  readonly isRanged: boolean;
  /**
   * Optional disambiguation for dual-mode attacks such as
   * "Melee or Ranged Attack Roll".
   *
   * When omitted, existing consumers should continue to infer mode from the
   * legacy `isRanged`/reach/range fields.
   */
  readonly attackMode?: "melee" | "ranged" | "meleeOrRanged";
  /**
   * Extra same-type damage from the stat block when the attack roll had
   * Advantage, e.g. Goblin Warrior/Boss "plus 2 (1d4) ... if the attack roll
   * had Advantage."
   */
  readonly extraDamageOnAdvantageHit?: AdvantageDamageDice;
  /**
   * Optional authored projection into battle weapon state.
   *
   * Keep this on the stat block attack itself so compatible monster attacks
   * project generically without runtime attack-name special cases.
   */
  readonly battleProfile?: MonsterAttackBattleProfile;
}

// --- Multiattack Slot ---

export type MultiattackSlot =
  | { readonly type: "MAttack"; readonly name: string }
  | { readonly type: "MSpecialAbility"; readonly name: string };

export interface MonsterAbilityBase {
  readonly id: string;
  readonly name: string;
  readonly text: string;
}

export interface MonsterTextAbility extends MonsterAbilityBase {
  readonly kind: "text";
  readonly blockerFamily: Exclude<
    MonsterCatalogBlockerFamily,
    "spellReferenceGap"
  >;
  readonly nonExecutableReason: string;
}

export interface MonsterExecutableAbility extends MonsterAbilityBase {
  readonly kind: "executable";
  readonly mechanic: string;
}

export interface MonsterSaveAdvantageModifier {
  readonly kind: "advantage";
  readonly appliesTo: ReadonlySet<MonsterSaveTriggerKind>;
}

export interface MonsterSaveModifierTrait extends MonsterAbilityBase {
  readonly kind: "saveModifierTrait";
  readonly saveModifier: MonsterSaveAdvantageModifier;
}

export interface MonsterAttackAbility extends MonsterAbilityBase {
  readonly kind: "attack";
  readonly attack: MonsterAttack;
}

export interface MonsterMultiattackAbility extends MonsterAbilityBase {
  readonly kind: "multiattack";
  readonly slots: ReadonlyArray<MultiattackSlot>;
}

export interface MonsterBattleBonusActionAbility extends MonsterAbilityBase {
  readonly kind: "battleBonusAction";
  readonly options: ReadonlyArray<MonsterBattleBonusActionOption>;
}

export interface MonsterBattleReactionAbility extends MonsterAbilityBase {
  readonly kind: "battleReaction";
  readonly option: MonsterBattleReactionOption;
}

export interface MonsterLegendaryActionAbility extends MonsterAbilityBase {
  readonly kind: "legendaryAction";
  readonly cost: number;
  readonly attackId?: string;
}

export interface MonsterSpellReference {
  readonly spellId: SpellId;
  readonly usage: string;
  readonly castLevel?: number;
  readonly notes?: string;
}

export interface MonsterSpellcastingAbility extends MonsterAbilityBase {
  readonly kind: "spellcasting";
  readonly spellcastingAbility: Ability;
  readonly saveDc?: number;
  readonly attackBonus?: number;
  readonly spells: ReadonlyArray<MonsterSpellReference>;
}

export type MonsterTrait =
  | MonsterExecutableAbility
  | MonsterSaveModifierTrait
  | MonsterTextAbility
  | MonsterSpellcastingAbility;
export type MonsterAction =
  | MonsterAttackAbility
  | MonsterExecutableAbility
  | MonsterMultiattackAbility
  | MonsterTextAbility
  | MonsterSpellcastingAbility;
export type MonsterBonusAction =
  | MonsterBattleBonusActionAbility
  | MonsterExecutableAbility
  | MonsterTextAbility
  | MonsterSpellcastingAbility;
export type MonsterReaction =
  | MonsterBattleReactionAbility
  | MonsterExecutableAbility
  | MonsterTextAbility
  | MonsterSpellcastingAbility;
export type MonsterLegendaryAction =
  | MonsterLegendaryActionAbility
  | MonsterExecutableAbility
  | MonsterTextAbility
  | MonsterSpellcastingAbility;

// --- Speed Types ---

export const SPEED_TYPES = ["walk", "fly", "swim", "climb", "burrow"] as const;

export type SpeedType = (typeof SPEED_TYPES)[number];

// --- Skill (18 SRD skills) ---

export const SKILLS = [
  "acrobatics",
  "animalHandling",
  "arcana",
  "athletics",
  "deception",
  "history",
  "insight",
  "intimidation",
  "investigation",
  "medicine",
  "nature",
  "perception",
  "performance",
  "persuasion",
  "religion",
  "sleightOfHand",
  "stealth",
  "survival",
] as const;

export type Skill = (typeof SKILLS)[number];

// --- Stat Block (SRD 5.2.1: "contains the game statistics of a monster") ---

export interface StatBlock {
  readonly provenance: StatBlockProvenance;
  readonly name: string;
  readonly creatureType: CreatureType;
  /** SRD descriptive tags that follow the creature type, e.g. "(Goblinoid)". */
  readonly descriptiveTags?: ReadonlyArray<string>;
  readonly creatureSize: Size;
  readonly ac: ArmorClass;
  readonly initiativeMod: AbilityModifier;
  readonly maxHp: number;
  readonly hitDice: number;
  readonly hitDieType: number;
  readonly speeds: Readonly<Record<SpeedType, number>>;
  readonly abilityScores: Readonly<Record<Ability, number>>;
  readonly saveProficiencies: ReadonlySet<Ability>;
  readonly skillBonuses: Readonly<Record<Skill, number>>;
  readonly cr: ChallengeRating;
  readonly proficiencyBonus: number;
  readonly resistances: ReadonlySet<DamageType>;
  readonly vulnerabilities: ReadonlySet<DamageType>;
  readonly damageImmunities: ReadonlySet<DamageType>;
  readonly conditionImmunities: ReadonlySet<Condition>;
  readonly exhaustionImmune: boolean;
  readonly senses: Readonly<Record<SenseType, number>>;
  readonly passivePerception?: number;
  readonly languages?: ReadonlyArray<string>;
  readonly gear?: ReadonlyArray<string>;
  readonly traits: ReadonlyArray<MonsterTrait>;
  readonly actions: ReadonlyArray<MonsterAction>;
  readonly bonusActions: ReadonlyArray<MonsterBonusAction>;
  readonly reactions: ReadonlyArray<MonsterReaction>;
  // Phase L: Legendary / Recharge / X-Day
  readonly legendaryActionUses: number; // 0 = no legendary actions
  readonly legendaryResistanceUses: number; // 0 = no LR
  readonly legendaryActions: ReadonlyArray<MonsterLegendaryAction>;
  readonly rechargeAbilities: Readonly<Record<string, RechargeAbilityDef>>;
  readonly dailyAbilities: Readonly<Record<string, number>>; // name -> max uses/day
  readonly inLair: boolean;
}
