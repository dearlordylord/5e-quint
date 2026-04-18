// Closed atom types for the content surface.
//
// Widen on demand per red/green loop. Atom names trace to
// .references/xphb-srd-pairing/TAXONOMY_atoms_graph.md (v4).

// Non-empty readonly array. Use wherever an empty list is invalid
// (closed-enum option sets, list-based EffectAtom bundles, per-spell
// operation lists, etc.). The first element is typed distinctly so
// TypeScript rejects `[]` at construction sites.
export type ReadonlyNonEmptyArray<T> = readonly [T, ...T[]];

// ---------- primitives ----------

// Per SRD 5.2.1 Rules Glossary, initiative is a Dexterity check. For
// modeling convenience (feats like Alert grant "+5 to Initiative"
// only, not all Dex checks), we promote initiative to its own
// RollKind rather than re-expressing it as an ability_check with an
// ability discriminant.
export type RollKind =
  | "attack_roll"
  // Spell attacks need their own bucket for held-item and feature riders
  // that apply to spell attacks but not weapon attacks. Staff of the
  // Woodlands is the pressure case on the magic-item surface.
  | "spell_attack_roll"
  | "saving_throw"
  | "ability_check"
  | "initiative"
  // Death saves — special in 5e: no ability mod, no DC, fixed
  // 10/20 success thresholds at 0 HP. Beacon of Hope grants
  // Advantage on them; other riders may surface.
  | "death_saving_throw";

// Weapon filter for riders that only apply to certain weapons.
// Archery Fighting Style scopes by category ("Ranged weapons only");
// Staff of Power / Staff of the Magi scope by the concrete wielded
// item ("damage rolls made with it"). Gloves of Missile Snaring
// needs property-level narrowing ("Ranged or Thrown weapon"), so the
// shared filter vocabulary also admits closed weapon properties.
// Keep this as a reference to the existing item id rather than
// duplicating weapon identity fields on the effect atoms themselves.
export type WeaponProperty = "thrown";

export type WeaponFilter =
  | {
      readonly kind: "weapon_category";
      readonly category: "melee" | "ranged";
    }
  | {
      readonly kind: "weapon_property";
      readonly property: WeaponProperty;
    }
  | {
      readonly kind: "specific_item";
      readonly itemId: string;
    };

// Optional source-side narrowing for resistance atoms that only apply
// against damage from attacks with extra qualifiers. Pressure cases:
// Shield of Missile Attraction ("from attacks made with Ranged
// weapons") and Gaseous Form ("from Nonmagical Attacks"). Kept
// attack-scoped rather than introducing a wider generic damage-source
// taxonomy before another family needs it.
export type ResistanceSourceFilter = {
  readonly kind: "attack";
  readonly weaponFilter?: WeaponFilter;
  readonly magicality?: "magical" | "nonmagical";
};

export type Ability = "str" | "dex" | "con" | "int" | "wis" | "cha";

export type DamageType =
  | "acid"
  | "bludgeoning"
  | "cold"
  | "fire"
  | "force"
  | "lightning"
  | "necrotic"
  | "piercing"
  | "poison"
  | "psychic"
  | "radiant"
  | "slashing"
  | "thunder";

// "Caster picks one at cast/build time from a closed list." Generic
// primitive for build-time (Dragonborn ancestry) or cast-time
// (Chromatic Orb damage, Summon Dragon creature type) selection.
export type CastTimeChoice<T> = {
  readonly kind: "choice";
  readonly label: string;
  readonly options: ReadonlyNonEmptyArray<T>;
};

// Named cast-time picker over bundles of effect atoms. Alter Self:
// choose Aquatic Adaptation / Change Appearance / Natural Weapons at
// cast time; while the spell persists, a Magic action may replace the
// chosen option. Options may omit `effects` when the branch is purely
// caller- / DM-owned narrative with no mechanical payload.
export type CastTimeEffectModeChoice = {
  readonly label: string;
  readonly options: ReadonlyNonEmptyArray<{
    readonly id: string;
    readonly displayName: string;
    readonly effects?: ReadonlyNonEmptyArray<EffectAtom>;
  }>;
  readonly allowsMidDurationSwitchAs?: "magic_action";
};

// Damage-type reference — either a fixed type (most spells and
// weapons), or a choice resolved at build time (Dragonborn ancestry)
// or cast time (Chromatic Orb, Protection from Energy).
export type DamageTypeRef = DamageType | CastTimeChoice<DamageType>;

export type AttackKind = "ranged_spell_attack" | "melee_spell_attack";

// Closed planar / extradimensional destinations for exile-style
// transport. Kept distinct from local `teleport` destinations because
// this surface pressure is about leaving the current play space
// entirely, not repositioning within it.
export type ExileDestination =
  | "demiplane"
  | "astral_plane"
  | "ethereal_plane"
  | "plane_of_origin"
  | "different_plane";

// Passive container / storage profile for magic items whose primary
// mechanic is a persistent storage space rather than an activation.
// Bag of Holding is the pressure case: extradimensional interior,
// bounded carrying capacity, fixed external carried weight, and a
// shared finite air supply for breathing occupants.
export type ContainerStorageProfile = {
  readonly maxWeightPounds: number;
  readonly maxVolumeCubicFeet: number;
  readonly weightOverridePounds?: number;
  readonly airSupply?: {
    readonly sharedMinutes: number;
  };
  readonly extradimensional?: true;
};

// SRD 5.2.1 Playing-the-Game — the 12 standard action kinds.
export type StandardActionKind =
  | "attack"
  | "dash"
  | "disengage"
  | "dodge"
  | "help"
  | "hide"
  | "influence"
  | "magic"
  | "ready"
  | "search"
  | "study"
  | "utilize";

export type ClassName =
  | "barbarian"
  | "bard"
  | "cleric"
  | "druid"
  | "fighter"
  | "monk"
  | "paladin"
  | "ranger"
  | "rogue"
  | "sorcerer"
  | "warlock"
  | "wizard";

export type RestKind = "short" | "long";

// DiceDelta is a signed numeric delta. v4 adds source variants so content
// can express bonuses derived from character state — not just fixed dice.
//
// Variants:
//   • fixed_dice      — literal Nd(M) bonus (dieSize=1 collapses to flat N).
//                       Covers Bless (+1d4), Shield (+5 AC), +1 items, etc.
//   • proficiency_bonus — scales with PB. `scale = "half"` covers Jack of
//                         All Trades / Remarkable Athlete (half PB, rounded
//                         down per SRD).
//   • ability_modifier — +/- a specific ability modifier. Covers Sacred
//                        Weapon (+CHA mod to attack) and similar.
//   • magic_item_rarity_bonus — derive a flat bonus from the enclosing
//                               magic-item rarity (record-level for
//                               single items, variant-level for
//                               collection items) rather than
//                               hardcoding one item per rarity variant. Covers
//                               Ammunition, +1/+2/+3 and similar rarity-tiered
//                               item lines.
export type DiceDelta =
  | {
      readonly kind: "fixed_dice";
      readonly dice: number;
      readonly dieSize: number;
      readonly sign: "+" | "-";
    }
  | {
      readonly kind: "proficiency_bonus";
      readonly sign: "+" | "-";
      readonly scale?: "half";
    }
  | {
      readonly kind: "ability_modifier";
      readonly ability: Ability;
      readonly sign: "+" | "-";
    }
  | {
      readonly kind: "magic_item_rarity_bonus";
      readonly sign: "+" | "-";
      readonly byRarity: Readonly<Record<MagicItemRarity, number>>;
    };

// Upcast tier for DurationValue. Hunter's Mark: up to 1 hour at slot
// 1-2, 8 hours at slot 3-4, 24 hours at slot 5+. Each tier names the
// first slot level it activates at; the effective amount is the base
// amount below the lowest tier and the tier's amount at or above
// that slot. Unit is shared with the base (no cross-unit tiers
// observed in SRD so far — widen if one surfaces).
export type DurationUpcastTier = {
  readonly atSlot: number;
  readonly amount: number;
};

export type DurationValue = {
  readonly unit: "round" | "minute" | "hour" | "day";
  readonly amount: number;
  readonly upcastTiers?: ReadonlyNonEmptyArray<DurationUpcastTier>;
};

// ---------- SRD 5.2.1 skills (Playing-the-Game) ----------
//
// All 18 RAW skills from SRD 5.2.1. Used by ability-check narrowing:
// Pass without Trace "+10 to Dex (Stealth) checks" authors as
// `modify_roll_numeric on: ["ability_check"], skillFilter: ["stealth"]`.
// Hunter's Mark rider "Advantage on Wis (Perception or Survival)"
// authors with skillFilter: ["perception", "survival"].
//
// The ability-of-skill mapping (Stealth = Dex, Perception = Wis, etc.)
// is RAW and caller-resolved; the surface just names the skill.
export const SKILLS = [
  "acrobatics",
  "animal_handling",
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
  "sleight_of_hand",
  "stealth",
  "survival",
] as const satisfies ReadonlyArray<string>;

export type Skill = (typeof SKILLS)[number];

// SkillFilter — narrows an ability-check rider to specific skills.
//   • `fixed` — Pass without Trace (Stealth only), Hunter's Mark rider
//     (Perception or Survival).
//   • `choice` — Guidance ("you choose a skill" at cast time from any
//     of the 18 SRD skills). Parallels DamageTypeRef.choice.
export type SkillFilter =
  | { readonly kind: "fixed"; readonly skills: ReadonlyNonEmptyArray<Skill> }
  | { readonly kind: "choice"; readonly options: ReadonlyNonEmptyArray<Skill> };

// ---------- SRD 5.2.1 conditions (Rules-Glossary) ----------

// All 15 RAW conditions from SRD 5.2.1 Rules Glossary.
export const CONDITIONS = [
  "blinded",
  "charmed",
  "deafened",
  "exhaustion",
  "frightened",
  "grappled",
  "incapacitated",
  "invisible",
  "paralyzed",
  "petrified",
  "poisoned",
  "prone",
  "restrained",
  "stunned",
  "unconscious",
] as const satisfies ReadonlyArray<string>;

export type Condition = (typeof CONDITIONS)[number];

// ---------- SRD 5.2.1 area shapes (Playing-the-Game) ----------

export const AREA_SHAPES = [
  "sphere",
  "cone",
  "cube",
  "cylinder",
  "emanation",
  "line",
] as const satisfies ReadonlyArray<string>;

export type AreaShape = (typeof AREA_SHAPES)[number];

// ---------- senses (SRD 5.2.1) ----------

export type SenseKind =
  | "darkvision"
  | "blindsight"
  | "tremorsense"
  | "truesight";

// ---------- creature types (SRD 5.2.1 Rules Glossary) ----------

// All 14 SRD 5.2.1 creature types. Shared by target-side filters
// (Hold Person: "Choose a Humanoid"; Charm Person: same) and
// attacker-side filters (Protection from Evil and Good: "creatures
// that are Aberrations, Celestials, Elementals, Fey, Fiends, or
// Undead have Disadvantage on attack rolls against the target").
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
] as const satisfies ReadonlyArray<string>;

export type CreatureType = (typeof CREATURE_TYPES)[number];

// ---------- scaling (Option B: unified threshold + linear-per-level
//                      with a LevelAxis parameter) ----------

// Axis along which a scaling parameter advances. Cantrips use character
// level; upcast spells use spell-slot level; class features use class
// level; certain features use PB or subclass level.
export type LevelAxis =
  | "character"
  | "class"
  | "slot"
  | "subclass"
  | "proficiency_bonus";

// Generic linear-per-level: value at each level = base + perLevel × (level - startingAtLevel).
// Generic threshold_tiers: value jumps to the tier.value at each tier.atLevel.
export type LinearPerLevel<T> = {
  readonly kind: "linear_per_level";
  readonly axis: LevelAxis;
  readonly base: T;
  readonly perLevel: T;
  readonly startingAtLevel: number;
};

export type ThresholdTiers<T> = {
  readonly kind: "threshold_tiers";
  readonly axis: LevelAxis;
  readonly base: T;
  readonly tiers: ReadonlyNonEmptyArray<{
    readonly atLevel: number;
    readonly value: T;
  }>;
};

// Back-compat alias for the integer-count scaling used by Bless target
// count etc. Same shape as LinearPerLevel<number> with axis=slot.
export type SlotScaling<T> = {
  readonly kind: "linear";
  readonly base: T;
  readonly perSlotAboveBase: T;
  readonly baseLevel: number;
};

// DiceExpr is the canonical "dice roll expression": N d M + flat +
// (optional) caster's spellcasting ability modifier. Cure Wounds and
// Healing Word read "2d8 plus your spellcasting ability modifier";
// since the actual ability depends on caster context (Cleric=Wis,
// Wizard=Int, Bard=Cha, …) the surface records only that the mod is
// added, not which ability. The concrete ability is resolved at cast
// time by the engine against the caster's class spellcasting ability.
export type DiceExpr = {
  readonly dice: number;
  readonly dieSize: number;
  readonly flat?: number;
  readonly spellcastingMod?: true;
};

// Partial override for tier entries and per-level increments — any of
// dice/dieSize/flat may change per level (Shillelagh's die-size
// progression, Second Wind's flat-addend per class level, Sneak Attack's
// dice-count-only progression, etc.).
export type DiceExprDelta = {
  readonly dice?: number;
  readonly dieSize?: number;
  readonly flat?: number;
};

export type DiceAmount =
  | { readonly kind: "fixed"; readonly expr: DiceExpr }
  | {
      readonly kind: "threshold_tiers";
      readonly axis: LevelAxis;
      readonly base: DiceExpr;
      readonly tiers: ReadonlyNonEmptyArray<{
        readonly atLevel: number;
        readonly override: DiceExprDelta;
      }>;
    }
  | {
      readonly kind: "linear_per_level";
      readonly axis: LevelAxis;
      readonly base: DiceExpr;
      readonly perLevel: DiceExprDelta;
      readonly startingAtLevel: number;
    }
  // The amount equals the charges/uses spent from the activation's
  // resource this activation. Player-chosen at activation time,
  // bounded by pool remainder. SRD Lay on Hands: "restore a number
  // of Hit Points to that creature, up to the maximum amount
  // remaining in the pool." Paired with a charge_pool resource on
  // the mechanics header.
  | { readonly kind: "resource_spent" }
  // Affine resource-spend amount: base + (perResource × resource_spent),
  // optionally capped. Necklace of Fireballs is the pressure case:
  // 7d6 + (1d6 × beads spent), maximum 12d6. Kept distinct from the
  // plain `resource_spent` variant so pure pool-equals-amount cases
  // (Lay on Hands) stay simple and exact.
  | {
      readonly kind: "resource_spent_linear";
      readonly base: DiceExpr;
      readonly perResource: DiceExprDelta;
      readonly maximum?: DiceExpr;
    }
  // §A14: amount read from another atom resolved in the same phase —
  // specifically a damage instance's total. Harm: modify_max_hp.delta
  // = linked damage_taken (full) of the save-gate's damage atom.
  // Vampiric Touch: heal_hp.amount = linked damage_dealt (half) of
  // the attack_roll's damage atom. No slot or character scaling node
  // is emitted — scaling already lives on the source damage atom and
  // propagates through the link.
  | { readonly kind: "linked"; readonly link: LinkedDamage };

// §A14: linked-amount primitives. Two disjoint link families keep
// invalid cross-domain references unrepresentable: speed values link
// only to other speed stats (LinkedSpeed); HP deltas link only to a
// damage instance resolved in the same phase (LinkedDamage).
//
// Use sites:
//   • EffectAtom.grant_speed.feet widened to `number | LinkedSpeed`
//     — Spider Climb grants a Climb Speed equal to walk Speed.
//   • DiceAmount.linked variant above — Harm couples modify_max_hp
//     reduction to damage taken; Vampiric Touch couples caster
//     heal_hp to half the damage dealt.

// Link one speed value to another speed stat. Currently only walk
// speed is referenced in RAW; widen this union when a future unit
// links one mode to another (e.g., hypothetical "Fly Speed equal to
// your Climb Speed").
export type LinkedSpeed = { readonly kind: "walk_speed" };

// Link an HP / damage amount to a damage instance resolved in the
// same phase.
//
//   • damage_taken — reads the damage the target just received
//     (post-save, post-resistance). Harm: full.
//   • damage_dealt — reads the damage the caster just dealt to the
//     target. Vampiric Touch: half.
//
// `scale` is always explicit so authors don't guess default behavior
// — full = 1:1, half = round-down halved (RAW "half" idiom).
export type LinkedDamage = {
  readonly kind: "damage_taken" | "damage_dealt";
  readonly scale: "full" | "half";
};

// SpellAccessMode — how the grantee may cast the named spell.
//   • at_will / once_per_long_rest / prepared / known — simple modes
//     tied to the character's own resource pools.
//   • charge_cast — the magic-item charge idiom: each cast spends
//     charges from the item's charge_pool. Cost of casting at level K
//     is `baseCharges + perLevelCharges × (K - minLevel)`; level range
//     is [minLevel, maxLevel].
//       - Wand of Magic Missiles: baseCharges=1, perLevelCharges=1,
//         minLevel=1, maxLevel=3 → cost(1)=1, cost(2)=2, cost(3)=3.
//       - Chime of Opening: baseCharges=1, perLevelCharges=0,
//         minLevel=2, maxLevel=2 → 1 charge to cast Knock at L2.
export type SpellAccessMode =
  | "at_will"
  | "once_per_long_rest"
  | "prepared"
  | "known"
  | {
      readonly kind: "charge_cast";
      readonly baseCharges: number;
      readonly perLevelCharges: number;
      readonly minLevel: number;
      readonly maxLevel: number;
    };

// Optional narrowing applied to the spell access grant itself rather than
// the underlying spell record. Magic items like Ring of Jumping grant a
// normally broader-target spell, but restrict casts made through the item
// to the wearer only. Other items can also re-anchor targeting to an
// existing remote origin (for example, a spell sensor) instead of the
// granted spell's printed range header.
export type GrantedSpellTargetRestriction =
  | { readonly kind: "self_only" }
  | {
      readonly kind: "visible_target_within_feet";
      readonly feet: number;
      readonly origin: AttachmentRangeOrigin;
    };

// Optional duration override applied only to casts made through a
// specific spell grant. This is intentionally delta-shaped rather than
// a full replacement Duration: the underlying spell still owns the base
// time span, while the grant may remove concentration or add an extra
// linked early-end condition.
export type GrantedSpellDurationOverride = {
  // Crystal Ball of Mind Reading: the item-granted Detect Thoughts cast
  // keeps the spell's printed duration but explicitly removes the need
  // to concentrate on it.
  readonly removeConcentration?: true;
  // Some grants tie the granted spell's persistence to another granted
  // spell from the same unit without restating the granted spell's
  // entire duration.
  readonly endsWhenGrantedSpellEnds?: string;
};

// ---------- unified effect atoms (v4 taxonomy) ----------
//
// Discriminated union covering the v4 effect atoms. Replaces the
// fragmented Effect / ClassFeatureEffect / ReactionEffect /
// SaveGateRiderResult unions. Widen incrementally as more content
// lands; the rest of the 36 v4 atoms can be added later.

export type EffectAtom =
  // v4: damage. Optional `timing` defers the damage to a named future
  // window (Acid Arrow: "4d4 Acid damage at the end of its next turn"
  // on hit). Absent = immediate damage on the current resolution step,
  // which matches every existing authored unit. In v4 this composes as
  // persist → window → damage; the prototype surface carries the
  // deferred variant as a single atom because the deferred hit is
  // always (a) a damage instance of the same damageType and (b) gated
  // by a single named window tied to the original target.
  | {
      readonly kind: "damage";
      readonly damageType: DamageTypeRef;
      readonly amount: DiceAmount;
      readonly timing?: "end_of_next_turn";
    }
  // v4: heal — JSON discriminant is `heal_hp` for backward compat with
  // existing content files.
  | {
      readonly kind: "heal_hp";
      readonly amount: DiceAmount;
      readonly target: "self" | "target_creature";
    }
  // v4: modify_max_hp — Aid's "Hit Point maximum and current Hit
  // Points increase by 5" (increase variant); Harm's "Hit Point
  // maximum is reduced" (decrease variant). An `increase` delta
  // also heals current HP by the same amount (implicit, matches
  // RAW for every SRD unit using this shape). A `decrease` delta
  // lowers max HP; current HP is naturally capped by the new max
  // (RAW). Distinct from grant_temp_hp (separate pool) and heal_hp
  // (current-HP-only restore that can't exceed max).
  //
  // §A14: the two directions are modeled as distinct variants so
  // `floor` (minimum new max HP — Harm's "can't reduce below 1")
  // is only representable on the decrease side. Aura of Life's §A16
  // `block_max_hp_reduction` gate suppresses the decrease variant
  // while active.
  | {
      readonly kind: "modify_max_hp";
      readonly direction: "increase";
      readonly delta: DiceAmount;
    }
  | {
      readonly kind: "modify_max_hp";
      readonly direction: "decrease";
      readonly delta: DiceAmount;
      readonly floor?: number;
    }
  // v4: modify_ac. Delta is a DiceDelta to match modify_roll_numeric
  // (flat bonuses encode as dice=N, dieSize=1). This unification lets
  // multi-grant passive lists (Ring of Protection: +1 AC AND +1 saves)
  // share a single record shape in Dhall's homogeneous-list constraint.
  | {
      readonly kind: "modify_ac";
      readonly delta: DiceDelta;
    }
  // Base-AC replacement used by always-on passives (Robe of the
  // Archmagi) and ongoing spell effects (Mage Armor). Kept in the
  // shared atom surface so passive and ongoing mechanics can reuse the
  // same AC-formula primitive instead of carrying parallel shapes.
  | ModifyAcSetBaseEffect
  // Prototype extension: persistent additive modifier to the wielder's
  // spell save DC. Distinct from `grant_spell_access.dcOverride`, which
  // only changes casts made through a specific granted spell access path.
  // This atom models broad character-sheet riders such as Robe of the
  // Archmagi's "+2 to your spell save DC".
  | {
      readonly kind: "modify_save_dc";
      readonly delta: DiceDelta;
    }
  // v4: apply_condition. `condition` is one of:
  //   • a bare Condition — unconditional application
  //   • a ReadonlyArray<Condition> — ALL listed conditions applied
  //     together (Hypnotic Pattern would use this if we weren't
  //     already using composite; reserved for future multi-condition
  //     simultaneous applications)
  //   • { kind: "choose", from: [...] } — caster picks ONE at cast
  //     time (Blindness/Deafness: "blinded OR deafened, your choice")
  | {
      readonly kind: "apply_condition";
      readonly condition:
        | Condition
        | ReadonlyNonEmptyArray<Condition>
        | {
            readonly kind: "choose";
            readonly from: ReadonlyNonEmptyArray<Condition>;
          };
    }
  // v4: remove_condition. Same three-shape condition field as
  // apply_condition:
  //   • Condition — remove a specific named condition
  //   • ReadonlyArray<Condition> — remove ALL listed (Heal: "ends
  //     Blinded, Deafened, and Poisoned")
  //   • { kind: "choose", from: [...] } — caster picks one to remove
  //     (Lesser Restoration: "end one condition: Blinded, Deafened,
  //     Paralyzed, or Poisoned")
  | {
      readonly kind: "remove_condition";
      readonly condition:
        | Condition
        | ReadonlyNonEmptyArray<Condition>
        | {
            readonly kind: "choose";
            readonly from: ReadonlyNonEmptyArray<Condition>;
          };
    }
  // v4: grant_resistance
  | {
      readonly kind: "grant_resistance";
      readonly damageType: DamageTypeRef;
      readonly sourceFilter?: ResistanceSourceFilter;
    }
  // Prototype extension: subtract a rolled or fixed amount from an
  // incoming damage instance before it is applied. Distinct from
  // grant_resistance (halves damage) and modify_damage_numeric
  // (changes outgoing damage rolls you make). Optional damageType
  // narrows the reduction to qualifying incoming damage only.
  | {
      readonly kind: "reduce_damage_taken";
      readonly amount: DiceAmount;
      readonly damageType?: DamageTypeRef;
    }
  // v4: grant_extra_action
  | {
      readonly kind: "grant_extra_action";
      readonly restriction: ActionRestriction;
    }
  // v4: scale_attack_count. Increases the number of weapon attacks
  // made as part of a single Attack action (Paladin / Fighter / Ranger
  // / Barbarian Extra Attack: +1). Distinct from grant_extra_action:
  // Extra Attack does not grant a second Action, it widens the
  // existing Attack action's attack count.
  | {
      readonly kind: "scale_attack_count";
      readonly additional: number;
    }
  // v4: modify_roll_numeric — Bless-style additive dice on roll kinds.
  // Optional weaponFilter narrows the bonus to a weapon category
  // (Archery Fighting Style: +2 attack rolls with Ranged weapons).
  //
  // `skillFilter` (optional) narrows ability-check bonuses to specific
  // skills. RAW pressure: Pass without Trace ("+10 to Dex (Stealth)
  // checks") and Hunter's Mark's "Advantage on Wis (Perception or
  // Survival) checks to find it". Only meaningful when `on` contains
  // "ability_check".
  //
  // `count` (optional) limits the rider to N qualifying rolls before
  // falling off. Guidance: count=1 ("one ability check of the target's
  // choice"). Absent = unlimited (applies for the host effect's whole
  // active window). Parallel to the same field on
  // modify_roll_advantage (§A13).
  | {
      readonly kind: "modify_roll_numeric";
      readonly on: ReadonlyNonEmptyArray<RollKind>;
      readonly delta: DiceDelta;
      readonly weaponFilter?: WeaponFilter;
      readonly skillFilter?: SkillFilter;
      readonly count?: number;
    }
  // Prototype extension: persistent additive modifier to future
  // damage rolls. Needed for SRD magic weapons that grant "+N to
  // damage rolls made with this weapon". Distinct from `damage`,
  // which models a concrete dealt-damage instance, and from
  // `modify_roll_numeric`, which is limited to d20-based roll kinds.
  | {
      readonly kind: "modify_damage_numeric";
      readonly delta: DiceDelta;
      readonly weaponFilter?: WeaponFilter;
    }
  // Lowers the crit threshold on attack rolls (Improved Critical:
  // threshold 19 means attacks crit on natural 19 or 20). Always
  // applies to "attack_roll" — no other roll has a crit concept — so
  // the roll kind is implicit.
  | {
      readonly kind: "modify_crit_range";
      readonly threshold: number;
      readonly weaponFilter?: WeaponFilter;
    }
  // v4: modify_roll_advantage — advantage/disadvantage on roll kinds.
  // Optional attackerTypeFilter narrows the effect to rolls made BY a
  // creature of one of the listed types (Protection from Evil and
  // Good: "creatures that are Aberrations, Celestials, Elementals,
  // Fey, Fiends, or Undead have Disadvantage on attack rolls against
  // the target"). Omitted = applies regardless of attacker type.
  //
  // `count` + `expiresOn` (both optional) unify this atom with the
  // mastery-side `ModifyRollAdvantageRider` (Sap). They express
  // one-shot or N-shot riders with turn-scoped expiry:
  //   • count: the rider applies to at most N qualifying rolls,
  //     then falls off. Absent = unlimited (applies for the whole
  //     active window). Vicious Mockery: count=1 ("next attack roll").
  //   • expiresOn: when the rider stops listening even if unused.
  //     Reuses the existing RiderExpiry union (target_uses_or_turn_start
  //     | end_of_next_turn). Absent = rider persists until the host
  //     effect's duration ends.
  | {
      readonly kind: "modify_roll_advantage";
      readonly mode: "advantage" | "disadvantage";
      readonly on: ReadonlyNonEmptyArray<RollKind>;
      readonly attackerTypeFilter?: ReadonlyNonEmptyArray<CreatureType>;
      readonly skillFilter?: SkillFilter;
      // Beacon of Hope "Advantage on Wisdom saving throws" — narrow
      // saving_throw riders to specific abilities. Only meaningful
      // when `on` contains "saving_throw".
      readonly saveAbilityFilter?: ReadonlyNonEmptyArray<Ability>;
      readonly count?: number;
      readonly expiresOn?: RiderExpiry;
    }
  // v4: modify_speed — additive delta to Walking Speed. Blur: "Speed
  // reduced by 10 feet" encodes as delta=-10.
  | {
      readonly kind: "modify_speed";
      readonly delta: number;
      readonly unit: "feet";
    }
  // v4: set_speed — sets Walking Speed to an absolute value. Hypnotic
  // Pattern: "Speed of 0" (kept distinct from modify_speed because
  // "set to 0" and "reduce by 0" are different semantics). The
  // Incapacitated condition does NOT imply 0 speed on its own (see
  // SRD Rules Glossary), so this atom is not redundant with
  // apply_condition incapacitated.
  | {
      readonly kind: "set_speed";
      readonly feet: number;
    }
  // Multiplicative speed modifier. Spirit Guardians and Slow both
  // halve speed inside/on target. Integer fraction covers every RAW
  // case observed; Dhall encodes Naturals.
  | {
      readonly kind: "set_speed_ratio";
      readonly numerator: number;
      readonly denominator: number;
    }
  // v4: force_move — push, pull, or slide
  | {
      readonly kind: "force_move";
      readonly direction: "push" | "pull" | "slide";
      readonly distanceFeet: number;
    }
  // v4: block_targeting — Globe of Invulnerability, Sanctuary, etc.
  | {
      readonly kind: "block_targeting";
      readonly scope: string;
    }
  // v4: block_travel — Wall of Force, Forcecage, etc.
  | {
      readonly kind: "block_travel";
      readonly scope: string;
    }
  // Shield vs. Magic Missile — named-spell negation.
  | {
      readonly kind: "negate_named_effect";
      readonly spellId: string;
      readonly scope: "damage_only" | "all_effects";
    }
  // §C1 Counterspell: negate whatever spell triggered this reaction.
  // Distinct from negate_named_effect (targets a specific spellId):
  // the target here is the triggering spell, whatever it was.
  | {
      readonly kind: "negate_triggering_spell";
    }
  // Reflection idiom for post-save magic-item reactions such as Ring
  // of Spell Turning and Staff of Charming. Unlike
  // `negate_triggering_spell`, this does not just cancel the trigger:
  // it re-targets the triggering spell back at its caster and resolves
  // it using the triggering spell's own save math, as if the reactor
  // had cast it.
  | {
      readonly kind: "reflect_triggering_spell";
    }
  // Beacon of Hope: "when the target regains Hit Points, it regains
  // the maximum number possible." Dodges the normal dice roll.
  | {
      readonly kind: "maximize_healing_received";
    }
  // §C4d Polymorph family — transform target into a new form.
  // Target's stats replace with a catalog-ref stat block; named
  // fields carry over. Polymorph: Beast CR ≤ target CR/level, retain
  // alignment/personality/creature-type/HP/HD, gain Temp HP = new
  // form's HP. True Polymorph / Shapechange / Wild Shape variants
  // use the same atom with different parameters. The transform is
  // typically the onFail of a save_gate phase (Wis save for
  // Polymorph) or applied directly (willing targets / Shapechange).
  | {
      readonly kind: "transform_target";
      readonly newForm: PolymorphFormSource;
      readonly retainedFields: ReadonlyNonEmptyArray<PolymorphRetainedField>;
      readonly tempHpFromForm?: true;
      readonly actionRestriction?: PolymorphActionRestriction;
      readonly revertTriggers: ReadonlyNonEmptyArray<PolymorphRevertTrigger>;
    }
  // §C3 Dispel Magic: end ongoing spells currently on the target.
  // `maxSpellLevel` bounds the set:
  //   • `"caster_slot_level"` — Dispel Magic phase-1 direct sweep:
  //     "any ongoing spell of level ≤ slot used ends".
  //   • `"contested_spell_level"` — Dispel Magic phase-2 gate pass:
  //     the specific spell the check was contested against ends.
  //   • number — explicit bound (not yet pressured but available).
  | {
      readonly kind: "end_ongoing_spells";
      readonly maxSpellLevel:
        | number
        | "caster_slot_level"
        | "contested_spell_level";
    }
  // v4: grant_sense — darkvision, blindsight, etc.
  | {
      readonly kind: "grant_sense";
      readonly sense: SenseKind;
      readonly rangeFeet: number;
    }
  // v4: deny_opportunity_attack — Disengage, Mobile feat
  | {
      readonly kind: "deny_opportunity_attack";
    }
  // v4: grant_temp_hp — false life, Inspiring Leader, etc.
  | {
      readonly kind: "grant_temp_hp";
      readonly amount: DiceAmount;
    }
  // v4 (additive): grant_feat — Ability Score Improvement "you can take a
  // feat instead", Fighter bonus feats, etc. Records the eligibility
  // gate; the actual feat pick is build-time.
  | {
      readonly kind: "grant_feat";
      readonly category: "general" | "fighting_style" | "epic_boon" | "origin";
    }
  // v4 grant_spell_access — class features, species traits, and magic
  // items that add specific spells to the known / always-prepared pool,
  // or grant the ability to cast a named spell with specified resources.
  // Survey evidence: 4 class_feature + 2 spell/species proposals.
  | {
      readonly kind: "grant_spell_access";
      readonly spellId: string;
      readonly mode: SpellAccessMode;
      // Optional cast-time DC override applied only to casts made through
      // this grant. Needed for magic items that cast an existing spell
      // using an item-defined fixed DC instead of the spell's normal
      // caster-derived DC.
      readonly dcOverride?: DcSource;
      // Optional cast-time area override applied only to casts made
      // through this grant. Needed for item-granted casts that reuse an
      // existing spell but change its authored area, such as Cloak of
      // Arachnida's Web filling twice the spell's normal area.
      readonly areaOverride?: AreaShapeSpec;
      readonly targetRestriction?: GrantedSpellTargetRestriction;
      readonly durationOverride?: GrantedSpellDurationOverride;
    }
  // v4-adjacent: grant_condition_immunity — Mind Blank, Protection from
  // Poison, Tiefling "Hellish Resistance" style. Survey evidence: 3 hits.
  // Differentiated from apply_condition (add) and remove_condition (one-shot
  // remove) — this prevents the condition from taking hold at all.
  | {
      readonly kind: "grant_condition_immunity";
      readonly condition: Condition;
    }
  // §A16: damage-type immunity — Mind Blank (Psychic), future Holy
  // Aura, monster stat-block traits (Zombie fortitude, etc.).
  // Distinct from grant_resistance (half damage): immunity is zero
  // damage.
  | {
      readonly kind: "grant_damage_immunity";
      readonly damageType: DamageType;
    }
  // §A16: Aura of Life "your Hit Point maximums can't be reduced".
  // Gate that prevents modify_max_hp with direction="decrease" (§A14)
  // from landing while the host effect is active.
  | {
      readonly kind: "block_max_hp_reduction";
    }
  // v4-adjacent: set_ability_score — Amulet of Health "your Con becomes
  // 19"; Gauntlets of Ogre Power / Headband of Intellect / Ioun Stone of
  // X all share this shape. Semantics depend on mode: `set` forces the
  // score to `value`, `floor` only raises (no effect if current ≥ value).
  // The SRD consistently uses floor semantics ("your X score is Y while
  // you wear this item" = minimum Y).
  | {
      readonly kind: "set_ability_score";
      readonly ability: Ability;
      readonly value: number;
      readonly mode: "set" | "floor";
    }
  // v4-adjacent: modify_ability_score — Tome / Manual family and other
  // permanent ability-score riders that apply a signed delta rather than
  // replacing the score with a fixed value. Optional bounds capture RAW
  // caps such as "to a maximum of 30" without conflating this shape with
  // `set_ability_score`.
  | {
      readonly kind: "modify_ability_score";
      readonly ability: Ability;
      readonly delta: number;
      readonly minimum?: number;
      readonly maximum?: number;
    }
  // v4-adjacent: persistent modifier to the creature's proficiency
  // bonus itself. Distinct from DiceDelta.kind = proficiency_bonus,
  // which references PB as an input when modifying some other number.
  // Pressure case: Ioun Stone of Mastery.
  | {
      readonly kind: "modify_proficiency_bonus";
      readonly delta: number;
      readonly minimum?: number;
      readonly maximum?: number;
    }
  // v4: detect — divination utility. Senses the presence of a named
  // property within a radius around the caster for the spell's
  // duration (typically concentration). The property vocabulary is
  // closed: widen per unit (Detect Magic, Detect Evil and Good,
  // Detect Poison and Disease, Detect Thoughts). Does NOT overlap
  // with grant_sense — that atom is for permanent senses like
  // darkvision; `detect` is a spell-duration property scan.
  | {
      readonly kind: "detect";
      readonly property:
        | "magic"
        | "evil_and_good"
        | "poison_and_disease"
        | "thoughts";
      readonly radiusFeet: number;
    }
  // v4: grant_speed — adds a NEW speed mode (fly, swim, climb, burrow)
  // with a specified value. Distinct from modify_speed, which adjusts
  // the existing Walking Speed additively. Fly spell: grants Fly Speed
  // 60 ft with hover. The `hover` flag is fly-only in RAW; keep it
  // optional and document the coupling here rather than encoding it in
  // the type (no second "can hover" variant exists yet).
  //
  // §A14: `feet` accepts a bare number (Fly: 60) or a LinkedSpeed
  // (Spider Climb: Climb Speed equal to walk Speed). The link is
  // resolved per-target at application time.
  | {
      readonly kind: "grant_speed";
      readonly speedKind: "fly" | "swim" | "climb" | "burrow";
      readonly feet: number | LinkedSpeed;
      readonly hover?: boolean;
    }
  // Cloak of Arachnida: the bearer can't be caught in webs of any sort
  // and treats webs as only Difficult Terrain while moving through them.
  // Kept distinct from generic speed / condition atoms because the rule is
  // environment-specific and does not imply broad restraint immunity.
  | {
      readonly kind: "ignore_web_restrictions";
    }
  // v4: alter_item_kind — the targeted item/object changes into a
  // different named form or rules kind. Folding Boat switches between
  // box / rowboat / keelboat forms; glamoured armor uses the same atom
  // for appearance-level item-kind swaps once its activation/lifecycle
  // surface exists. The attachment selects WHICH item is affected; this
  // atom only records the destination form.
  | {
      readonly kind: "alter_item_kind";
      readonly newKind: string;
    }
  // Alter Self (Natural Weapons): replace the creature's default
  // Unarmed Strike damage profile while the effect persists. This is
  // distinct from a one-shot `damage` atom because it changes the
  // host creature's ongoing attack option, not a single resolution.
  // The spellcasting-ability attack/damage substitution is part of the
  // atom's semantics rather than additional fields on the payload.
  | {
      readonly kind: "natural_weapons";
      readonly damageType: DamageType;
      readonly damageDie: number;
    }
  // Alter Self (Aquatic Adaptation): simple capability flag that the
  // host creature can breathe underwater.
  | { readonly kind: "water_breathing" }
  // v4: teleport — Misty Step, Thunder Step, Dimension Door. The
  // destination is a closed descriptor; widen when a unit forces a
  // different destination shape (e.g., "a location you have seen" for
  // Teleport, "same plane" for Plane Shift).
  | {
      readonly kind: "teleport";
      readonly maxFeet: number;
      readonly destination: "unoccupied_visible_space";
    }
  // v4: transport_exile — planar / extradimensional relocation that
  // removes the subject from the current play space rather than merely
  // repositioning it nearby. Rod of Security and Robe of Stars both
  // pressure this shape. Return semantics remain separate lifecycle
  // concerns (`return_on_end`, repeat activation, etc.).
  | {
      readonly kind: "transport_exile";
      readonly destination: ExileDestination;
    }
  // Passive item/container storage profile. Encodes persistent carrying
  // capacity and related constraints without forcing passive magic items
  // through an activation family. Pressure case: Bag of Holding.
  | {
      readonly kind: "container_storage";
      readonly storage: ContainerStorageProfile;
    }
  // Composite: apply several effects as one bundle. Used to put
  // multiple atoms into a single slot (save_gate.onFail, attack
  // phase effect, etc.) without widening every consumer to arrays.
  // Hypnotic Pattern: on fail, the target gains Charmed AND
  // Incapacitated AND has Speed 0. Recursion is allowed but
  // discouraged — flatten when authoring.
  | {
      readonly kind: "composite";
      readonly effects: ReadonlyNonEmptyArray<EffectAtom>;
    }
  // Sentinel: explicit "no effect" for branches (e.g., save onSuccess)
  | { readonly kind: "none" };

// ---------- spell-card header ----------

export type SpellLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type SpellSchool =
  | "abjuration"
  | "conjuration"
  | "divination"
  | "enchantment"
  | "evocation"
  | "illusion"
  | "necromancy"
  | "transmutation";

// Shield / Counterspell-like reactions. Trigger is part of the spell
// card text ("Reaction, which you take when you are hit by an attack
// roll or targeted by Magic Missile"). SRD trigger language maps to a
// closed grammar of condition variants.
export type ReactionTrigger =
  | {
      readonly kind: "hit_by_attack_roll";
      // Gloves of Missile Snaring: "hit by an attack roll made with a
      // Ranged or Thrown weapon." Reuse the shared weapon filter
      // vocabulary rather than introducing a reaction-only trigger
      // variant for weapon-kind narrowing.
      readonly weaponFilter?: WeaponFilter;
    }
  | { readonly kind: "targeted_by_named_spell"; readonly spellId: string }
  // §C1: Counterspell — trigger fires when a creature within range
  // casts a spell using any of the listed components. Parameters of
  // the triggering spell (level, caster) are exposed to downstream
  // phases via the reaction's resolution context (used by
  // autoSuccessIfCasterSlotGte).
  | {
      readonly kind: "creature_casts_spell";
      readonly components: ReadonlyNonEmptyArray<"V" | "S" | "M">;
      // Some reaction riders narrow the generic spellcasting trigger to
      // visible casters only and/or to triggering spells up to a stated
      // level. Pressure case: Ioun Stone of Absorption / Greater
      // Absorption ("cast by a creature you can see", "level 4 or lower"
      // / "level 8 or lower"). Keep this on the shared trigger variant
      // rather than inventing item-specific reaction families.
      readonly spellLevelAtMost?: SpellLevel;
      readonly requiresVisibleCaster?: true;
    }
  // Post-save spell reflection / conversion window. The trigger fires
  // only after the reacting creature finishes a saving throw against a
  // spell, with optional predicates on the triggering spell's school,
  // level, and targeting shape.
  | {
      readonly kind: "spell_save_outcome";
      readonly outcome: "success" | "failure";
      readonly spellLevelAtMost?: SpellLevel;
      readonly spellSchool?: SpellSchool;
      readonly spellTargetsOnlySelf?: true;
      readonly spellHasNoAreaOfEffect?: true;
    }
  | {
      readonly kind: "any_of";
      readonly triggers: ReadonlyNonEmptyArray<ReactionTrigger>;
    };

export type CastingTime =
  // Normal action cast. Optional `ritual` flag marks spells whose
  // header reads "Action or Ritual" — Detect Magic, Comprehend
  // Languages, Identify, Find Familiar, Silence, and friends. When
  // present the spell can ALTERNATIVELY be cast as a 10-minute ritual;
  // the ritual branch does not expend a spell slot. The normal-action
  // branch is unchanged.
  | { readonly kind: "action"; readonly ritual?: true }
  | { readonly kind: "bonus_action" }
  | { readonly kind: "reaction"; readonly trigger: ReactionTrigger }
  // Long-cast spells such as Alarm (1 minute, optionally as a Ritual).
  | {
      readonly kind: "minutes";
      readonly amount: number;
      readonly ritual: boolean;
    };

export type Range =
  | { readonly kind: "self" }
  | { readonly kind: "touch" }
  | { readonly kind: "point"; readonly feet: number };

// Components — V/S/M presence is always encoded unambiguously by the
// v/s booleans and m (false = absent, string = descriptive text).
// materialCostGp and materialConsumed are metadata ONLY: recorded
// when present on the spell's card (e.g., Chain Lightning's "three
// silver pins", Protection from Evil and Good's "a flask of Holy
// Water worth 25+ GP, which the spell consumes"), but not wired into
// any behavior. Future cost/resource tracking can read these without
// another schema change.
export type Components = {
  readonly v: boolean;
  readonly s: boolean;
  readonly m: false | string;
  readonly materialCostGp?: number;
  readonly materialConsumed?: true;
};

// Target-driven early-end trigger for concentration / timed durations.
// Invisibility: "The spell ends early immediately after the target
// makes an attack roll, deals damage, or casts a spell." Each spell
// lists zero or more triggers; ANY match ends the spell. Keep the
// trigger vocabulary closed — widen only when a second spell demands
// a new variant. Known future widenings: "target dons armor" (Mage
// Armor), "target attacks a creature other than the marked one"
// (Sanctuary), "target takes damage" (Sleep's wake-on-damage clause).
export type DurationEndTrigger =
  | { readonly kind: "target_makes_attack_roll" }
  | { readonly kind: "target_deals_damage" }
  | { readonly kind: "target_casts_spell" }
  // Mage Armor: "The spell ends early if the target dons armor."
  // Single SRD instance in our corpus, but worth closing the taxonomy
  // around rather than deferring — Mage Armor's RAW text now
  // round-trips, and the closed enum stays explicit about which
  // triggers are modeled.
  | { readonly kind: "target_dons_armor" }
  // Charm Person: "the target has the Charmed condition until the
  // spell ends or until you or your allies damage it." The "caster
  // or ally" side of the trigger is DM agenda (who counts as an ally
  // is session-resolved); the surface only records that damage from a
  // friendly source ends the spell early.
  | { readonly kind: "target_damaged_by_caster_or_ally" }
  // Hypnotic Pattern: "The spell ends for an affected creature if it
  // takes any damage." Distinct from target_deals_damage (which
  // watches damage OUTGOING from the target) and from
  // target_damaged_by_caster_or_ally (which narrows the source). This
  // variant ends on damage from ANY source.
  | { readonly kind: "target_takes_damage" };

export type Duration =
  | { readonly kind: "instantaneous" }
  | {
      readonly kind: "concentration";
      readonly upTo: DurationValue;
      readonly earlyEnd?: ReadonlyNonEmptyArray<DurationEndTrigger>;
      // §C4h: True Polymorph "if you maintain Concentration on this
      // spell for the full duration, the spell lasts until dispelled."
      // Promotes the concentration window into a permanent effect on
      // maintenance.
      readonly permanentIfMaintainedFull?: true;
    }
  | {
      readonly kind: "timed";
      readonly value: DurationValue;
      readonly earlyEnd?: ReadonlyNonEmptyArray<DurationEndTrigger>;
    }
  // §A10: "Until Dispelled" / permanent spells (Sequester, Magic Jar,
  // Magnificent Mansion, Geas at L9, True Polymorph concentrate-full
  // → permanent). `endsOn` names the closed set of triggers that can
  // end the effect (empty = truly permanent — rare but the SRD has a
  // few).
  | {
      readonly kind: "permanent";
      readonly endsOn?: ReadonlyNonEmptyArray<"dispel" | "damage">;
    };

// ---------- attachment ----------

// Recurring save-to-end attached to an initial save_gate phase. Hold
// Person (and the paralyze/charm/etc. family broadly): "At the end of
// each of its turns, the target repeats the save, ending the spell on
// itself on a success." The recurring save reuses the initial save's
// ability and DC — this spec only names the cadence and success
// semantics. `ends_on_target` means the spell ends on the succeeding
// target only, not globally (important for multi-target upcasts).
export type RepeatSaveSpec = {
  // "on_target_takes_damage" — Dominate family (Beast, Person,
  // Monster): the Charmed target repeats the save whenever it takes
  // damage.
  readonly cadence: "end_of_target_turn" | "on_target_takes_damage";
  readonly onSuccess: "ends_on_target";
  // §C2 Sleep: on the repeat save's failure, escalate to a further
  // effect instead of keeping the onFail effect active. Sleep's
  // chain: first fail → Incapacitated; repeat fail → Unconscious.
  // Absent = repeat save simply keeps the original onFail applied
  // until success (the Hold Person pattern).
  readonly onFailAgain?: EffectAtom;
};

// Target-side creature-type filter. Hold Person: "Choose a Humanoid".
// When present, only creatures of one of the listed types are
// eligible targets. Omitted = no type restriction.
export type TargetTypeFilter = ReadonlyNonEmptyArray<CreatureType>;

// Area-occupant disposition filter for self-centered auras and similar
// area effects whose footprint is geometric but whose affected
// creatures are narrowed by relationship to the source.
export type AreaOccupantDispositionFilter =
  | "friendly_to_source"
  | "hostile_to_source";

export type TargetSelection =
  | { readonly mode: "one"; readonly typeFilter?: TargetTypeFilter }
  | {
      readonly mode: "choose_up_to";
      // A bare `number` is a fixed cap with no upcast (Aid: "up to
      // three creatures" — the 3 doesn't scale; the per-target HP
      // bonus scales instead). A SlotScaling<number> scales the cap
      // itself (Bless / Hold Person: +1 target per slot).
      readonly count: number | SlotScaling<number>;
      // Magic Missile: "you can direct them to hit one creature or
      // several" — the same creature may be chosen by more than one
      // dart. Default (absent) = distinct targets, matching Chain
      // Lightning's "a target can be targeted by only one of the
      // bolts" rule. When `true` the selection is a multiset.
      readonly repeatsAllowed?: true;
      readonly typeFilter?: TargetTypeFilter;
    }
  // "Choose any number of creatures within range" — unbounded open
  // selection at cast time. Beacon of Hope, Compulsion, Divine Word,
  // Mass Suggestion and similar multi-target spells that don't scale
  // their cap with slot level. Distinct from `choose_up_to`: there is
  // no count field because no cap exists in RAW.
  | { readonly mode: "any_number"; readonly typeFilter?: TargetTypeFilter };

export type AreaOrigin =
  | { readonly kind: "point_within_range" }
  | { readonly kind: "on_primary_target" }
  // "self" — the shape originates from the caster's square (no range
  // target). Used by abilities like Dragonborn Breath Weapon ("15-foot
  // Cone or 30-foot Line from you") and emanation-style monk / druid
  // abilities.
  | { readonly kind: "self" };

// Area shape descriptions. Each shape carries its own measurement.
export type AreaShapeDescriptor =
  | { readonly kind: "sphere"; readonly radiusFeet: number }
  | { readonly kind: "cone"; readonly lengthFeet: number }
  | { readonly kind: "cube"; readonly sideFeet: number }
  | {
      readonly kind: "cylinder";
      readonly radiusFeet: number;
      readonly heightFeet: number;
    }
  | { readonly kind: "emanation"; readonly radiusFeet: number }
  | {
      readonly kind: "line";
      readonly lengthFeet: number;
      readonly widthFeet: number;
    };

// Area shape specification — either a fixed shape, or a use-time
// choice among candidate shapes. Dragonborn Breath Weapon: "15-foot
// Cone or 30-foot Line (choose the shape each time)." The choice is
// shallow: options must be plain AreaShapeDescriptors (no nested
// choice-of-choice).
export type AreaShapeSpec =
  | AreaShapeDescriptor
  | {
      readonly kind: "choice";
      readonly options: ReadonlyNonEmptyArray<AreaShapeDescriptor>;
    };

// Mark-transfer grammar (v4 Subgraph E). Hunter's Mark: if the target
// drops to 0 HP before the spell ends, the caster can take a Bonus
// Action to move the mark to a new creature in range.
export type MarkTransferEvent = { readonly kind: "target_drops_to_0_hp" };

export type MarkTransferCost = { readonly kind: "bonus_action" };

export type MarkTransfer = {
  readonly onEvent: MarkTransferEvent;
  readonly cost: MarkTransferCost;
};

// Most effects measure range from the caster. A few remote-sensor
// effects instead measure from an existing spell sensor or similar
// projected point in space. Keep the origin grammar closed and
// attachment-local so the authored unit can say "30 feet from the
// sensor" without inventing a new top-level mechanics family.
export type AttachmentRangeOrigin = "caster" | "spell_sensor";

export type Attachment =
  | { readonly kind: "self" }
  | {
      readonly kind: "target";
      readonly selection: TargetSelection;
      readonly rangeOrigin?: AttachmentRangeOrigin;
    }
  | {
      readonly kind: "area";
      readonly shape: AreaShapeSpec;
      readonly origin: AreaOrigin;
      readonly occupantDispositionFilter?: AreaOccupantDispositionFilter;
      readonly rangeOrigin?: AttachmentRangeOrigin;
    }
  // v4 `mark` attachment — stateful binding on a creature that effects
  // latch onto, and that can be transferred on a configured event.
  | {
      readonly kind: "mark";
      readonly selection: TargetSelection;
      readonly rangeOrigin?: AttachmentRangeOrigin;
      readonly transfer?: MarkTransfer;
    };

// ---------- resolution DC ----------

// Save DC source: spell save DC (from caster), or weapon-attack DC
// (Topple mastery: DC 8 + attack ability mod + Proficiency Bonus).
export type DcSource =
  | { readonly kind: "caster_spell_save_dc" }
  | { readonly kind: "fixed"; readonly dc: number }
  | { readonly kind: "weapon_attack_dc"; readonly base: number }
  // Innate-ability DC: `base + ability-mod + proficiency-bonus`.
  // Used by abilities that pin the DC to a specific ability
  // (not the caster's chosen spellcasting ability). SRD examples:
  // Dragonborn Breath Weapon (base 8, ability "con"), Monk Stunning
  // Strike (base 8, ability "wis"). The caller specifies the base
  // (always 8 in SRD 5.2.1 to our knowledge, but left explicit for
  // future content).
  | {
      readonly kind: "innate_dc";
      readonly base: number;
      readonly ability: Ability;
    };

// ---------- ongoing operations (unified trigger grammar, §A15) ----------
//
// An ongoing operation is { trigger, predicate?, effect } — when the
// trigger event fires on the attached subject and the predicate (if
// any) holds, the effect resolves. This grammar unifies the passive
// riders (Bless-style roll modifiers, Mage Armor / Barkskin AC
// replacements), the attack-rider riders (Divine Favor, Hunter's Mark
// damage_on_hit), the per-turn-trigger riders that pressured §A15
// (Heroism temp-HP refresh, Aura of Life conditional heal, Spirit
// Guardians save-gate-on-turn-start), and §A9 damage-triggered repeat
// saves (Dominate family).
//
// The trigger is implicitly scoped by the spell's Attachment:
//   • self-attachment → trigger fires around the caster;
//   • target/mark-attachment → trigger fires around the attached target;
//   • area-attachment → trigger fires for creatures in the area.

export type OngoingTrigger =
  // Always active while the spell persists (Bless, Mage Armor,
  // Barkskin, Pass without Trace, Guidance, most legacy roll-modifier
  // spells).
  | { readonly kind: "passive" }
  // Caster makes an attack that hits. Scope derived from attachment:
  //   • self → any attack hit (Divine Favor);
  //   • mark / target → caster's attack against the attached creature
  //     (Hunter's Mark).
  | { readonly kind: "on_caster_attack_hit" }
  // At the start of the attached creature's turn (for area: each
  // creature inside the area at start of its turn). Heroism, Aura of
  // Life, Spirit Guardians, Web escape check, Cloudkill save.
  | { readonly kind: "on_attached_turn_start" }
  // At the start of the caster's turn.
  | { readonly kind: "on_caster_turn_start" }
  // Attached creature takes damage. Pressure: Dominate family (save
  // with advantage, spell ends on success). Absorbs §A9.
  | { readonly kind: "on_attached_damaged" }
  // Creature moves within the area attachment; per-5-ft damage
  // (Spike Growth). `perFeet` defines the damage granularity.
  | {
      readonly kind: "on_creature_moves";
      readonly perFeet?: number;
    }
  // Creature enters the area attachment (or starts turn in it —
  // typically combined with on_attached_turn_start via multi-operation).
  // Web, Moonbeam entry, Grease area.
  | { readonly kind: "on_creature_enters_area" };

// Optional predicate gating the trigger.
export type OngoingPredicate = {
  readonly kind: "at_hp_threshold";
  readonly threshold: number;
  readonly comparison: "lte" | "eq" | "gte";
};

export type ModifyAcSetBaseEffect = {
  readonly kind: "modify_ac_set_base";
  readonly const: number;
  readonly abilityMod: Ability;
};

export type ModifyAcSetFloorEffect = {
  readonly kind: "modify_ac_set_floor";
  readonly const: number;
};

// What fires when the trigger+predicate hold. Most effects are plain
// EffectAtoms. `modify_ac_set_floor` remains ongoing-specific because
// the current surface pressure for AC-floor replacement is spell-only
// (Barkskin). `modify_ac_set_base` is shared with passive mechanics.
// A save_gate variant absorbs §A9's damage-triggered repeat-save pattern.
export type OngoingEffect =
  | EffectAtom
  | {
      readonly kind: "save_gate";
      readonly ability: Ability;
      readonly dc: DcSource;
      readonly onFail: EffectAtom;
      readonly onSuccess: SaveSuccessOutcome;
    }
  | ModifyAcSetFloorEffect;

export type OngoingOperation = {
  readonly trigger: OngoingTrigger;
  readonly predicate?: OngoingPredicate;
  readonly effect: OngoingEffect;
};

// Passive / equipped recurring operation — bounded non-spell analogue of
// spell ongoing operations for "while worn/orbiting, this repeats on a
// fixed cadence" idioms. Pressure case: Ioun Stone (Regeneration)
// "regain 15 Hit Points at the end of each hour if you have at least
// 1 Hit Point while this stone orbits your head."
//
// Keep this separate from spell OngoingOperation rather than reusing the
// spell trigger grammar wholesale: non-spell passives do not have caster /
// attached-turn semantics or spell headers, and the only surfaced timing
// pressure here is a fixed elapsed-time cadence.
export type PassiveOperation = {
  readonly trigger: {
    readonly kind: "elapsed_time";
    readonly unit: "hour" | "day";
    readonly amount: number;
  };
  readonly predicate?: OngoingPredicate;
  readonly effect: EffectAtom;
};

// ---------- activation phases (spells) ----------

export type ActionRestriction =
  | { readonly kind: "none" }
  | {
      readonly kind: "exclude";
      readonly actions: ReadonlyNonEmptyArray<StandardActionKind>;
    };

// Outcome on a successful saving throw inside a save_gate phase. The
// `half_damage` sentinel expresses the Fireball-family "half damage
// on success" rule without duplicating the onFail damage amount at
// half — the tracer/interpreter links back to onFail.damage. For any
// other effect on success, use a raw EffectAtom. `none` is modeled as
// EffectAtom { kind: "none" }.
export type SaveSuccessOutcome = { readonly kind: "half_damage" } | EffectAtom;

// Closed roll-driven branch selection. Used for percentile / d20 tables
// whose outcome is chosen nondeterministically at resolution time
// rather than by player choice. Branches may recurse into further
// activation phases for nested random rolls.
export type RandomTableRoll = {
  readonly die: number;
  readonly modifier?: number;
};

export type RandomTableOutcome = {
  readonly min: number;
  readonly max: number;
  readonly label: string;
  readonly phases?: ReadonlyNonEmptyArray<ActivationPhase>;
};

export type ActivationPhase =
  | {
      readonly kind: "attack_roll";
      readonly attachment: Attachment;
      readonly attackKind: AttackKind;
      // onHit / onMiss accept an ARRAY of effect atoms so spells like
      // Shocking Grasp can layer damage + deny_opportunity_attack, and
      // Ray of Frost can stack damage + modify_speed on the same hit.
      // Single-effect spells pass a singleton array.
      readonly onHit: ReadonlyNonEmptyArray<EffectAtom>;
      readonly onMiss: ReadonlyNonEmptyArray<EffectAtom>;
    }
  | {
      readonly kind: "save_gate";
      readonly attachment: Attachment;
      readonly ability: Ability;
      readonly dc: DcSource;
      readonly onFail: EffectAtom;
      readonly onSuccess: SaveSuccessOutcome;
      readonly repeatSave?: RepeatSaveSpec;
      // §C1/§C3 slot-auto-success bypass. Counterspell / Dispel
      // Magic "You automatically end a spell on the target if the
      // spell's level is equal to or less than the level of the
      // spell slot you use." The only pressure case is a comparison
      // against the triggering spell's level; the field is a
      // sentinel (not a numeric slot threshold) to keep the
      // dependency on reaction-context explicit.
      readonly autoSuccessIfCasterSlotGte?: "triggering_spell_level";
      // §C4d True Polymorph: "An unwilling creature can make a
      // Wisdom saving throw". Willing targets skip the save and
      // auto-fail (the onFail effect applies). Distinct from the
      // general 5e "voluntary fail" rule because the save is GATED
      // by willingness — unwilling targets get the save at all;
      // willing targets don't.
      readonly saveAppliesIf?: "unwilling_target";
    }
  // §C3 Dispel Magic — caster rolls an ability check (spellcasting
  // ability vs fixed DC) to resolve the phase. Distinct from
  // save_gate (target rolls) and attack_roll (caster d20+mod vs AC).
  // `autoSuccessIfCasterSlotGte` shares the Counterspell-style DC
  // bypass for "auto-end if slot level ≥ target spell level".
  | {
      readonly kind: "ability_check_gate";
      readonly attachment: Attachment;
      readonly ability: Ability;
      readonly dc: number;
      readonly onPass: EffectAtom;
      readonly onFail?: EffectAtom;
      readonly autoSuccessIfCasterSlotGte?: "target_spell_level";
    }
  // Mandatory roll on a closed outcome table. Used for effects such as
  // percentile-driven magic-item mishaps and other nondeterministic
  // branches that don't fit attack/save/check resolution shapes.
  | {
      readonly kind: "random_table";
      readonly roll: RandomTableRoll;
      readonly outcomes: ReadonlyNonEmptyArray<RandomTableOutcome>;
    }
  // Direct application — spells that just apply effects with no
  // resolution gate (no attack roll, no saving throw).
  | {
      readonly kind: "direct";
      readonly attachment: Attachment;
      // Direct application can grant a fixed effect bundle, prompt for
      // one of several named effect bundles, or both. At least one of
      // `effects` / `mode` should be present at authoring sites.
      readonly effects?: ReadonlyNonEmptyArray<EffectAtom>;
      readonly mode?: CastTimeEffectModeChoice;
    };

// ---------- spell payload families ----------

type SpellMechanicsHeader = {
  readonly level: SpellLevel;
  readonly school: SpellSchool;
  readonly castingTime: CastingTime;
  readonly range: Range;
  readonly components: Components;
  readonly duration: Duration;
};

export type OngoingEffectMechanics = SpellMechanicsHeader & {
  readonly family: "ongoing_effect";
  readonly attachment: Attachment;
  // Optional initial resolution that fires once at cast, before the
  // ongoing operations take effect. Cloudkill and Moonbeam both have
  // an initial Con save on entry-at-cast that shares damage with the
  // per-turn ongoing save; Sleep has its initial Wis save authored
  // via activation family (which is a second valid encoding).
  readonly initialPhase?: ActivationPhase;
  readonly operations: ReadonlyNonEmptyArray<OngoingOperation>;
};

export type ActivationMechanics = SpellMechanicsHeader & {
  readonly family: "activation";
  readonly phases: ReadonlyNonEmptyArray<ActivationPhase>;
};

// Triggered-reaction spell (Shield, Counterspell, Silvery Barbs). The
// trigger is specified on the CastingTime (see `ReactionTrigger`). The
// effects fire through the Prepare/Prompt/Commit subgraph (subgraph A
// from the research): reaction window opens, player decides, effects
// commit (or don't — declining does not consume reaction per
// UBIQUITOUS_LANGUAGE §Triggers line 31).
// §C1 unified shape: phases mirror ActivationMechanics. Shield is a
// single `direct` phase; Counterspell is a single `save_gate` phase
// with `autoSuccessIfCasterSlotGte` for the slot-auto-success rule.
// Silvery Barbs-style future units compose additional phases.
export type TriggeredReactionMechanics = SpellMechanicsHeader & {
  readonly family: "triggered_reaction";
  readonly interruptsTrigger: boolean;
  readonly phases: ReadonlyNonEmptyArray<ActivationPhase>;
};

// ---------- anchored-trigger family (hunt §4.2 widening) ----------
//
// Pressure case: Alarm. Future: Glyph of Warding, Contingency. Spell
// plants a trigger on an anchor; when a matching event occurs (gated
// by closed filter predicates) the stored spell releases a signal
// effect.

// Where the trigger is planted. Matches v4 attachment atoms `location`
// and `area`, kept distinct from Attachment since the choice is
// mutually exclusive at cast time.
export type AnchorTarget =
  | { readonly kind: "location"; readonly description: "door_or_window" }
  | {
      readonly kind: "area";
      readonly shape: { readonly kind: "cube"; readonly maxSideFeet: number };
    };

// Closed enum of event kinds (v4 anchored-trigger widening). Widen as
// more pressure cases land (step_on, approach_within, see_glyph,
// named_event_signal).
export type AnchoredEvent =
  | { readonly kind: "physical_contact" }
  | { readonly kind: "enters_area" };

// Closed filter predicates. Alarm uses a creature exemption list
// ("designate creatures that won't set off the alarm") that is chosen
// at cast time.
export type AnchoredFilter = {
  readonly kind: "creature_exemption_list";
  readonly chosenAtCast: true;
};

// Signal emitted on release. Audible and mental are the two Alarm
// modes; caller is the consumer of the signal (ARCHITECTURE.md keeps
// narrative notifications out of core, but the signal shape is still
// closed so the trace has somewhere to point).
export type AnchoredSignal =
  | {
      readonly kind: "audible";
      readonly sound: string;
      readonly durationSeconds: number;
      readonly audibleRadiusFeet: number;
    }
  | {
      readonly kind: "mental";
      readonly rangeFeet: number;
      readonly awakensIfAsleep: boolean;
    };

export type AnchoredTriggerMechanics = SpellMechanicsHeader & {
  readonly family: "anchored_trigger";
  readonly anchor: AnchorTarget;
  readonly events: ReadonlyArray<AnchoredEvent>;
  readonly filters: ReadonlyArray<AnchoredFilter>;
  readonly signals: ReadonlyArray<AnchoredSignal>;
};

// ---------- spawned-creature family (§C4a) ----------
//
// Allegiance is DM-agenda (table-owned), not a property of the spell
// grammar — XPHB Summon Greater Demon and similar hostile-control
// summons fit the same shape with no loyalty-gate typing.

// Numeric field in a spawned-creature stat block. Literal,
// linear-per-slot formula ("AC 14 + spell's level" — reuses the
// shared LinearPerLevel<number> primitive with axis="slot"), or a
// value derived from the caster (spell attack mod, spell save DC,
// PB, spellcasting ability mod).
export type StatBlockValue =
  | { readonly kind: "literal"; readonly value: number }
  | LinearPerLevel<number>
  | {
      readonly kind: "caster_derived";
      readonly source:
        | "spell_attack_mod"
        | "spell_save_dc"
        | "proficiency_bonus"
        | "spellcasting_ability_mod";
    };

export type StatBlockSize =
  | "tiny"
  | "small"
  | "medium"
  | "large"
  | "huge"
  | "gargantuan";

export type SixAbilityScores = {
  readonly str: number;
  readonly dex: number;
  readonly con: number;
  readonly int: number;
  readonly wis: number;
  readonly cha: number;
};

export type CreatureSpeed = {
  readonly kind: "walk" | "fly" | "swim" | "climb" | "burrow";
  readonly feet: StatBlockValue;
  // Otherworldly Steed: Fly speed unlocks only at slot 4+.
  readonly requiresSlotLevel?: number;
};

export type CreatureResistanceList =
  | {
      readonly kind: "fixed";
      readonly damageTypes: ReadonlyNonEmptyArray<DamageType>;
    }
  | {
      readonly kind: "choose_one_from";
      readonly options: ReadonlyNonEmptyArray<DamageType>;
    };

export type CreatureImmunityList = {
  readonly damageTypes?: ReadonlyNonEmptyArray<DamageType>;
  readonly conditions?: ReadonlyNonEmptyArray<Condition>;
};

export type CreatureSense = {
  readonly kind: SenseKind;
  readonly rangeFeet: number;
};

// Creature actions split into four parallel homogeneous lists (one
// per kind) rather than a single tagged-union list. Dhall requires
// homogeneous list element types, and nesting a tagged union in one
// list forces Optional gymnastics through the entire type tree
// including EffectAtom. Multiattack dispatches reference other
// actions by name; the tracer validates name resolution at emit.

export type CreatureNamedAttackRoll = {
  readonly name: string;
  readonly attackType: "melee" | "ranged";
  readonly attackBonus: StatBlockValue;
  readonly reachFeet?: number;
  readonly rangeFeet?: { readonly normal: number; readonly long: number };
  readonly onHit: ReadonlyNonEmptyArray<EffectAtom>;
  readonly multiattackCount?: StatBlockValue;
};

export type CreatureNamedSaveGate = {
  readonly name: string;
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly area: AreaShapeDescriptor;
  readonly onFail: EffectAtom;
  readonly onSuccess: SaveSuccessOutcome;
  readonly multiattackCount?: StatBlockValue;
};

export type CreatureNamedSupport = {
  readonly name: string;
  readonly target: "self" | "ally_in_range";
  readonly rangeFeet?: number;
  readonly effect: EffectAtom;
  readonly multiattackCount?: StatBlockValue;
};

export type CreatureNamedMultiattack = {
  readonly name: string;
  readonly dispatches: ReadonlyNonEmptyArray<{
    readonly name: string;
    readonly count: StatBlockValue;
  }>;
};

export type CreatureActions = {
  readonly multiattacks?: ReadonlyNonEmptyArray<CreatureNamedMultiattack>;
  readonly attacks?: ReadonlyNonEmptyArray<CreatureNamedAttackRoll>;
  readonly saves?: ReadonlyNonEmptyArray<CreatureNamedSaveGate>;
  readonly supports?: ReadonlyNonEmptyArray<CreatureNamedSupport>;
};

export type CreatureTraitEffect =
  | {
      readonly kind: "caster_shared_resistance";
      readonly chosenFrom: "resistances_list";
    }
  | {
      readonly kind: "caster_heal_link";
      readonly rangeFeet: number;
    };

export type CreatureTrait = {
  readonly name: string;
  readonly description: string;
  readonly effect?: CreatureTraitEffect;
};

export type CreatureStatBlock = {
  readonly displayName: string;
  readonly size: StatBlockSize | CastTimeChoice<StatBlockSize>;
  readonly creatureType: CreatureType | CastTimeChoice<CreatureType>;
  readonly ac: StatBlockValue;
  readonly hp: StatBlockValue;
  readonly speeds: ReadonlyNonEmptyArray<CreatureSpeed>;
  readonly abilityScores: SixAbilityScores;
  readonly saveProficiencies?: ReadonlyNonEmptyArray<Ability>;
  readonly resistances?: CreatureResistanceList;
  readonly immunities?: CreatureImmunityList;
  readonly senses?: ReadonlyNonEmptyArray<CreatureSense>;
  readonly languages?: "caster_languages" | ReadonlyNonEmptyArray<string>;
  readonly actions?: CreatureActions;
  readonly bonusActions?: CreatureActions;
  readonly reactions?: CreatureActions;
  readonly traits?: ReadonlyNonEmptyArray<CreatureTrait>;
};

// Partial stat-block updates applied by a CreatureMode option.
export type CreatureStatBlockOverrides = {
  readonly creatureType?: CreatureType;
  readonly speeds?: ReadonlyNonEmptyArray<CreatureSpeed>;
  readonly resistances?: CreatureResistanceList;
  readonly immunities?: CreatureImmunityList;
  readonly traits?: ReadonlyNonEmptyArray<CreatureTrait>;
  readonly actions?: CreatureActions;
  readonly bonusActions?: CreatureActions;
};

export type CreatureMode = {
  readonly label: string;
  readonly options: ReadonlyNonEmptyArray<{
    readonly id: string;
    readonly displayName: string;
    readonly overrides: CreatureStatBlockOverrides;
  }>;
};

export type CreatureControl = {
  readonly initiative: "shared_with_caster" | "own_roll";
  readonly turnOrder?: "immediately_after_caster";
  readonly commandCost:
    | { readonly kind: "no_action_required" }
    | { readonly kind: "bonus_action" }
    | { readonly kind: "action" };
  readonly commandRangeFeet: number;
  readonly defaultBehavior: "dodge_and_avoid" | "independent";
  readonly telepathy?: {
    readonly rangeFeet: number;
    readonly sharedSenses?: "bonus_action";
  };
  readonly oneAtATime?: true;
};

export type CreatureDismissal = {
  readonly onZeroHp: "disappears";
  readonly onSpellEnd: "disappears";
  readonly caster0Hp?: "disappears";
  readonly manualDismiss?: "magic_action" | "bonus_action" | "never";
  readonly leavesBehind?: "equipment" | "nothing";
};

// ---------- polymorph / transform (§C4d) ----------

// Catalog-ref form source with a CR / level constraint. Polymorph:
// Beast, CR ≤ target's CR-or-level. Shapechange: any creature, CR ≤
// caster level. Wild Shape: Beast roster from the Druid's known
// forms (caller-owned).
export type PolymorphFormSource = {
  readonly kind: "catalog_ref";
  readonly creatureType: CreatureType;
  readonly crBound:
    | { readonly kind: "target_cr_or_level" }
    | { readonly kind: "caster_level" }
    | { readonly kind: "fixed"; readonly cr: number };
};

export type PolymorphRetainedField =
  | "alignment"
  | "personality"
  | "creature_type"
  | "hit_points"
  | "hit_point_dice"
  | "intelligence"
  | "wisdom"
  | "charisma"
  | "skill_proficiencies"
  | "languages";

export type PolymorphActionRestriction = "no_speech_no_spells";

export type PolymorphRevertTrigger =
  | { readonly kind: "zero_hp" }
  | { readonly kind: "spell_ends" }
  | { readonly kind: "temp_hp_depleted" }
  | { readonly kind: "dismissed_by_caster" };

// ---------- templated multi-spawn family (§C4c) ----------
//
// Animate Objects — caster spends capacity points (= spellcasting
// ability modifier) across a menu of size tiers. Each object becomes
// a size-specific Animated Object; shared stat block on the
// mechanics, per-tier HP + Slam damage override.

export type TemplatedCapacity = {
  readonly kind: "caster_ability_modifier";
  readonly ability: Ability;
};

export type TemplatedSizeTier = {
  readonly size: StatBlockSize;
  readonly weight: number;
  readonly hp: StatBlockValue;
  readonly slamDamage: DiceAmount;
};

export type TemplatedMultiSpawnMechanics = SpellMechanicsHeader & {
  readonly family: "templated_multi_spawn";
  readonly capacity: TemplatedCapacity;
  readonly baseStatBlock: CreatureStatBlock;
  readonly sizeTiers: ReadonlyNonEmptyArray<TemplatedSizeTier>;
  readonly control: CreatureControl;
  // Animate Objects "When the creature drops to 0 Hit Points, it
  // reverts to its object form, and any remaining damage carries
  // over to that form."
  readonly revertOnZeroHp: true;
};

// ---------- reanimated-creature family (§C4b) ----------
//
// Pattern B: reference-the-catalog reanimation. Spell references
// external monster stat blocks (Skeleton, Zombie, Ghoul, Ghast,
// Wight, Mummy) rather than shipping an inline stat block. Animate
// Dead + Create Undead. The monster catalog itself is not modeled
// by this package yet — `monsterId` is a stable string key that the
// monster-database plan will resolve later.

// Valid reanimation targets per RAW.
export type ReanimationTargetKind =
  | "corpse_or_bones_of_small_or_medium_humanoid"
  | "corpse_of_small_or_medium_humanoid";

// Per-slot menu entry. Each slot level the spell may be cast at
// lists the options the caster picks from. Each option names a
// monster catalog id + the count of creatures that option spawns /
// reasserts control over.
export type ReanimationSlotOption = {
  readonly monsterId: string;
  readonly count: number;
};

export type ReanimationSlotEntry = {
  readonly slotLevel: number;
  // "animate" = create new from corpses; "reassert" = reassert
  // control over previously-animated creatures. Both share the
  // same count per RAW ("animate or reassert control"). Keep the
  // single `options` list; the distinction happens at table time.
  readonly options: ReadonlyNonEmptyArray<ReanimationSlotOption>;
};

export type ReanimationMenu = ReadonlyNonEmptyArray<ReanimationSlotEntry>;

export type ReanimationReassertWindow = {
  readonly hours: number;
  // "you must cast this spell on the creature again before the
  // current 24-hour period ends" — reassert uses the same cast slot;
  // this field names only the cadence the caller tracks.
  readonly maxReassertPerCast: number;
};

export type ReanimatedCreatureMechanics = SpellMechanicsHeader & {
  readonly family: "reanimated_creature";
  readonly targetKind: ReanimationTargetKind;
  readonly menu: ReanimationMenu;
  readonly control: CreatureControl;
  readonly reassertWindow: ReanimationReassertWindow;
  // "You can cast this spell only at night" — Create Undead's
  // time-of-day gate. Caller-resolved; recorded here so the trace
  // surfaces the constraint.
  readonly nightOnly?: true;
};

// Spawned-creature payloads are usually authored with an inline stat
// block (Find Steed, Find Familiar), but some item lines summon a
// named SRD creature by catalog identity instead of shipping a custom
// derived block. Keep the reference grammar aligned with
// reanimated-creature rather than inventing item-only summon fields.
export type SpawnedCreatureStatBlock =
  | {
      readonly kind: "inline";
      readonly statBlock: CreatureStatBlock;
    }
  | {
      readonly kind: "catalog_ref";
      readonly monsterId: string;
      readonly displayName: string;
    };

export type SpawnedCreaturePayload = {
  readonly creature: SpawnedCreatureStatBlock;
  readonly mode?: CreatureMode;
  readonly control: CreatureControl;
  readonly dismissal: CreatureDismissal;
};

export type SpawnedCreatureMechanics = SpellMechanicsHeader &
  SpawnedCreaturePayload & {
    readonly family: "spawned_creature";
  };

export type SpellMechanics =
  | OngoingEffectMechanics
  | ActivationMechanics
  | TriggeredReactionMechanics
  | AnchoredTriggerMechanics
  | SpawnedCreatureMechanics
  | ReanimatedCreatureMechanics
  | TemplatedMultiSpawnMechanics;

// ---------- class-feature atoms ----------

// Activation cost for an activated ability (class feature / magic item /
// species trait). Drives which (if any) quota atom the tracer emits a
// `consumes` edge to. Most activations spend one of the 12 standard
// action kinds; `magic` is the main pressure from item and feature text,
// but the surface keeps the full SRD action vocabulary reusable rather
// than introducing item-specific cost variants. `action_plus_bonus_action`
// is the bounded compound-economy case where the same activation requires
// both quotas in sequence, without modeling a new nested procedure family.
// `reaction` covers reactive uses that consume the reaction quota. It may
// also carry the same closed trigger grammar spell reactions use, so
// non-spell abilities can declare what opens the reaction window without
// inventing a parallel trigger surface.
// `replace_attack` is the Extra-Attack-economy cost: the ability is
// triggered by spending one of the attacks you would otherwise make
// during the Attack action (Breath Weapon, some smite-like species
// abilities). It consumes an attack-slot rather than an action quota.
export type ClassFeatureActivationCost =
  | { readonly kind: "free" }
  | { readonly kind: "standard_action"; readonly action: StandardActionKind }
  // Back-compat alias for already-authored content that used the coarse
  // "action" bucket before standard-action labels were surfaced.
  | { readonly kind: "action" }
  | { readonly kind: "action_plus_bonus_action" }
  | { readonly kind: "bonus_action" }
  | { readonly kind: "reaction"; readonly trigger?: ReactionTrigger }
  // Downtime study gate for tome/manual items: spend a fixed number of
  // study hours within a bounded day window before the effect resolves.
  | {
      readonly kind: "study";
      readonly hours: number;
      readonly withinDays: number;
    }
  | { readonly kind: "replace_attack" };

// use_count cap — fixed amount, a threshold-tier schedule (Option B:
// uses scale by class level e.g. Action Surge 1@L2 → 2@L17, Second Wind
// 2@L1 → 3@L4 → 4@L10, Indomitable 1@L9 → 2@L13 → 3@L17), pegged to
// proficiency bonus (Dragonborn Breath Weapon, Dwarven Stonecunning:
// "a number of times equal to your Proficiency Bonus"), or a linear
// class-level scaling (Paladin Lay on Hands: "5 × your Paladin level"
// — reuses the shared LinearPerLevel<number> primitive).
export type UseCountCap =
  | { readonly kind: "fixed"; readonly uses: number }
  | ThresholdTiers<number>
  | LinearPerLevel<number>
  | { readonly kind: "proficiency_bonus" }
  // §A12: cap scales with the caster's ability modifier. Bardic
  // Inspiration uses: "a number of times equal to your Charisma
  // modifier". The ability is authored with the feature; the
  // resolved mod is taken at rest-reset time.
  | { readonly kind: "ability_modifier"; readonly ability: Ability };

export type UseCountResource = {
  readonly kind: "use_count";
  readonly cap: UseCountCap;
};

// Charge pool — a numeric pool where each activation may consume a
// variable number of charges (player choice at activation time). The
// magic-item wand idiom: "expend 1-3 charges to cast Magic Missile,
// 1 charge per spell level". `cap` is the pool size; the per-activation
// cost schedule lives on the effect atom that spends them
// (grant_spell_access.mode = charge_cast). Some items also randomize
// their initial stock when found/created ("has 1d6 + 3 beads hanging
// from it"). Keep that separate from `cap`: `cap` remains the maximum
// pool size, while `initialCount` captures the one-time starting roll.
// Some absorption items also have a non-resetting lifetime intake cap:
// they may currently store up to `cap`, but once they have absorbed
// `lifetimeAbsorptionCap` total charges over the course of their
// existence, they cannot take in more.
export type ChargePoolResource = {
  readonly kind: "charge_pool";
  readonly cap: UseCountCap;
  readonly initialCount?: DiceAmount;
  readonly lifetimeAbsorptionCap?: number;
};

// Activated-ability resource — either a discrete use counter (each
// activation costs 1) or a charge pool (variable cost per activation).
export type ActivationResource = UseCountResource | ChargePoolResource;

export type RelativeDayResetTrigger = "resource_spent" | "resource_empty";

// Disjoint reset cadence — SRD "Short or Long Rest" maps to either rest
// refilling the pool. `dawn` is the magic-item recharge idiom.
export type RestResetCadence =
  | { readonly kind: "short_or_long_rest" }
  | { readonly kind: "long_rest" }
  | { readonly kind: "short_rest" }
  // SRD "You regain one expended use when you finish a Short Rest, and
  // you regain all expended uses when you finish a Long Rest." — Second
  // Wind, Monk Focus partial-refill pattern.
  | {
      readonly kind: "partial_short_full_long";
      readonly shortRestRefill: number;
    }
  // Magic-item idiom: "regains 1dX charges daily at dawn" /
  // "regains all expended charges daily at dawn". Survey evidence:
  // 4 magic-item proposals.
  | {
      readonly kind: "dawn";
      // null/omitted = regains all; DiceAmount for e.g. "1d6 + 4" style
      // partial. `dhall-to-json --omit-empty` drops `None`, so the JSON
      // authoring flow naturally serializes the full-refill case by
      // omitting the field.
      readonly regain?: null | DiceAmount;
    }
  // Tome/manual family idiom: the item loses its magic after use and
  // regains it in a century. Keep this first-class rather than
  // encoding a magic number day count at each call site.
  | { readonly kind: "century" }
  // Relative calendar-time cooldown. Covers item text like "can't be
  // used again until 5 days have passed" and pool-based recharge that
  // starts only once the pool is empty.
  | {
      readonly kind: "elapsed_days";
      readonly days: number;
      // null/omitted = regains all after the cooldown elapses. Omission is
      // the stable JSON form produced by `dhall-to-json --omit-empty`.
      readonly regain?: null | DiceAmount;
      readonly startsWhen: RelativeDayResetTrigger;
    }
  // Relative sub-day cooldown. Covers item text like "can't be used
  // again for 1 hour" where the lockout starts immediately after use
  // and then refills fully/partially once the duration elapses.
  | {
      readonly kind: "elapsed_hours";
      readonly hours: number;
      // null/omitted = regains all after the cooldown elapses. Omission is
      // the stable JSON form produced by `dhall-to-json --omit-empty`.
      readonly regain?: null | DiceAmount;
    }
  // Single-shot or bounded-use items that never refill — Chime of
  // Opening "can be used 10 times. After the tenth time, it cracks
  // and becomes useless." Typically paired with
  // ItemDestructionPolicy.permanent_on_empty on MagicItemRecord.
  | { readonly kind: "never" };

// ---------- activated-ability + passive families ----------
//
// Shared across non-spell kinds (class_feature, magic_item, species_trait,
// feat). An "activated ability" spends a resource on activation and runs
// an effect. A "passive" unit grants effects continuously while it's in
// play (class feature acquired, feat taken, species trait innate, magic
// item attuned / held).

type ActivatedAbilityHeader = {
  // Optional equipment-state gate for activation-shaped units. This
  // covers held / worn / wielded item requirements on magic-item
  // activations (for example, wand-family "While holding it, you can
  // cast..." text) without inventing a parallel item-only predicate
  // surface. When absent, the activation has no equipment gate.
  readonly condition?: EquipmentPredicate;
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource: ActivationResource;
  readonly resetCadence: RestResetCadence;
  // §A11: effect duration for class-feature-scoped conditions.
  // Ranger Nature's Veil: Invisible until end of next turn. Omitted
  // when the ability has no outlasting effect window.
  readonly duration?: Duration;
  // Action Surge L17: "twice before a rest but only once on a turn."
  // The per-turn cap is vacuous while the feature has only one use
  // per rest (L2-L16), so the field can be set uniformly — the cap
  // just doesn't bind until the resource provides ≥ 2 uses.
  readonly usageLimit?: UsageLimit;
};

// Activated non-spell ability — runs a sequence of ActivationPhases
// (unified with spells) so save-gate abilities (e.g., Dragonborn
// Breath Weapon) and multi-step abilities are expressible. Class
// abilities are self-originated; the tracer threads { kind: "self" }
// as the resolution ctx range. Most current content is a single
// `direct` phase wrapping what was previously `effect: EffectAtom`.
export type ActivatedAbilityMechanics = ActivatedAbilityHeader & {
  readonly family: "activation";
  readonly phases: ReadonlyNonEmptyArray<ActivationPhase>;
};

// Trigger-bound activated ability for non-spell units. This keeps the
// richer respond/prepare/prompt/commit reaction structure available to
// magic items without forcing them through spell-only header fields
// like level/school/spell-slot consumption.
export type TriggeredReactionAbilityMechanics = Omit<
  ActivatedAbilityHeader,
  "activationCost"
> & {
  readonly family: "triggered_reaction";
  readonly activationCost: Extract<
    ClassFeatureActivationCost,
    { readonly kind: "reaction" }
  >;
  readonly range: Range;
  readonly interruptsTrigger: boolean;
  readonly phases: ReadonlyNonEmptyArray<ActivationPhase>;
};

// Magic-item companion summon — same controllable-creature payload as
// spell summons, but gated by item activation cost/resource/reset
// rather than spell-slot headers.
export type MagicItemSpawnedCreatureMechanics = ActivatedAbilityHeader &
  SpawnedCreaturePayload & {
    readonly family: "spawned_creature";
    readonly range: Range;
  };

// Back-compat alias: content files historically referenced this name.
export type ClassFeatureActivationMechanics = ActivatedAbilityMechanics;

// EquipmentPredicate — gate for PassiveMechanics grants. When the
// predicate doesn't hold, none of the grants apply. Survey evidence
// (reshape-validate batch 1): all four Fighting Style feats (Defense,
// Archery, Great Weapon Fighting, Two-Weapon Fighting) depend on a
// wearing / wielding gate. Defense is the pure case — "+1 AC while
// wearing Light, Medium, or Heavy armor".
//
// `always` is the sentinel for unconditional grants (darkvision,
// some always-on item passives, etc.). `holding_item` covers held-item
// gates on non-weapon equipment such as Sentinel Shield and wand-family
// magic items. `peering_through_item` is the narrower held-item gate
// for optics-like items whose benefit applies only while the bearer is
// actively looking through the item (Gem of Seeing). `wearing_item`
// covers worn-item gates on generic magic items such as gauntlets,
// rings, cloaks, and orbiting Ioun Stones (which the SRD explicitly
// treats as worn objects while orbiting).
// `unarmored` covers inverse armor gates on passive benefits such as
// Robe of the Archmagi's AC formula while not wearing armor.
// `wearing_armor` carries a category list because Defense's SRD text
// enumerates three allowed categories. `wielding_weapon` carries a
// coarse weapon-kind enum sufficient to scope the Fighting Style pool;
// finer discrimination (specific weapon types,
// versatile-used-two-handed, dual-wielding off-hand) can be added as
// new Fighting-Style-adjacent units surface it.
//
// `all_of` is the bounded composition form for passive / activation
// equipment gates that require multiple simultaneous equipment states
// (for example, "while wearing this robe and not wearing armor").
type NonAlwaysEquipmentPredicate =
  | { readonly kind: "holding_item" }
  | { readonly kind: "peering_through_item" }
  | { readonly kind: "wearing_item" }
  | { readonly kind: "unarmored" }
  | {
      readonly kind: "wearing_armor";
      readonly categories: ReadonlyArray<"light" | "medium" | "heavy">;
    }
  | {
      readonly kind: "wielding_weapon";
      readonly weaponKind:
        | "ranged"
        | "melee_two_handed"
        | "melee_one_handed"
        | "two_weapons";
    }
  | {
      readonly kind: "all_of";
      readonly predicates: ReadonlyNonEmptyArray<NonAlwaysEquipmentPredicate>;
    };

export type EquipmentPredicate =
  | { readonly kind: "always" }
  | NonAlwaysEquipmentPredicate;

// PassiveMechanics — "always on" while the unit is in effect. Survey
// evidence: 9+9+6 class_feature + 2 species + 2 magic_item proposals
// converged on this shape as the dominant non-spell family. The
// optional `condition` gate narrows when the grants apply (e.g.,
// Fighting Style: Defense applies +1 AC only while wearing armor).
// When absent, grants are unconditional.
export type PassiveMechanics = {
  readonly family: "passive";
  readonly condition?: EquipmentPredicate;
  readonly grants: ReadonlyArray<EffectAtom>;
  readonly operations?: ReadonlyNonEmptyArray<PassiveOperation>;
};

export type ClassFeatureMechanics =
  | ActivatedAbilityMechanics
  | PassiveMechanics;

// ---------- mastery (weapon mastery property) ----------

// Mastery rider expiry — Sap: "before the start of your next turn" OR
// when the target uses its next attack roll. Vex-style would be
// "before the end of your next turn". Closed enum for now.
export type RiderExpiry =
  | { readonly kind: "target_uses_or_turn_start" }
  | { readonly kind: "end_of_next_turn" };

// Trigger for on-hit masteries. Cleave restricts to melee weapon
// attacks; other masteries (Sap, Topple) accept any weapon hit.
export type MasteryTrigger =
  | { readonly kind: "weapon_hit" }
  | { readonly kind: "weapon_hit_melee_only" };

// Secondary-target selection for Cleave: the nested attack must target
// a creature within 5 feet of the first and within the attacker's reach.
export type SecondaryTargetSelection = {
  readonly kind: "adjacent_to_primary";
  readonly constraint: "within_5ft_and_reach";
};

// Nested attack-roll rider granted by Cleave. Ability modifier is only
// applied to damage if it is negative (per SRD).
export type GrantWeaponAttackRider = {
  readonly kind: "grant_weapon_attack";
  readonly attackKind: "melee_weapon_attack";
  readonly secondaryTarget: SecondaryTargetSelection;
  readonly onHit: {
    readonly kind: "weapon_damage";
    readonly abilityModifier: "negative_only";
  };
};

// Sap — target's next attack roll has disadvantage. Generalized as
// advantage/disadvantage rider with a count + expiry.
export type ModifyRollAdvantageRider = {
  readonly kind: "modify_roll_advantage";
  readonly mode: "advantage" | "disadvantage";
  readonly on: ReadonlyArray<RollKind>;
  readonly count: number;
  readonly expiresOn: RiderExpiry;
};

// Topple — on-hit rider opens a save_gate with attack-rooted DC; on
// failure, apply a condition.
export type SaveGateRiderResult =
  | { readonly kind: "apply_condition"; readonly condition: Condition }
  | { readonly kind: "none" };

export type SaveGateRider = {
  readonly kind: "save_gate";
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly onFail: SaveGateRiderResult;
  readonly onSuccess: SaveGateRiderResult;
};

export type MasteryEffect =
  | ModifyRollAdvantageRider
  | SaveGateRider
  | GrantWeaponAttackRider;

// Shared usage-limit taxonomy. Used by masteries (Topple / Cleave —
// once_per_turn) and by activated class features with a per-turn cap
// (Action Surge at L17: two uses per rest but only once on a turn).
// Single variant today; closed to be widened per unit.
export type UsageLimit = { readonly kind: "once_per_turn" };

// on_hit_trigger — the one mastery family modeled so far. Maps to
// Subgraph G (On-Hit Rider): attack_roll resolution opens on_hit_window
// which grants the mastery's rider effect.
export type OnHitTriggerMechanics = {
  readonly family: "on_hit_trigger";
  readonly trigger: MasteryTrigger;
  // "optional" means the wielder chooses whether to invoke (Topple,
  // Cleave); Sap and Push are always-on on hit.
  readonly optional: boolean;
  readonly effect: MasteryEffect;
  readonly usageLimit?: UsageLimit;
};

export type MasteryMechanics = OnHitTriggerMechanics;

// ---------- records ----------

export type Provenance = {
  readonly kind: "srd-5.2.1" | "xphb";
  readonly section: string;
};

type UnitMetadata = {
  readonly id: string;
  readonly name: string;
  readonly provenance: Provenance;
  readonly description: string;
};

export type SpellRecord = UnitMetadata & {
  readonly kind: "spell";
  readonly mechanics: SpellMechanics;
};

export type ClassFeatureRecord = UnitMetadata & {
  readonly kind: "class_feature";
  readonly className: ClassName;
  readonly acquiredAtLevel: number;
  readonly mechanics: ClassFeatureMechanics;
};

export type MasteryRecord = UnitMetadata & {
  readonly kind: "mastery";
  readonly mechanics: MasteryMechanics;
};

// ---------- feat / species / magic-item records ----------

// FeatMechanics: overwhelmingly passive (feats give proficiencies, senses,
// resistances, ability score floors). Activation cases exist (once-per-X
// triggered abilities) and reuse ActivatedAbilityMechanics.
export type FeatMechanics = PassiveMechanics | ActivatedAbilityMechanics;

export type FeatRecord = UnitMetadata & {
  readonly kind: "feat";
  readonly category: "general" | "fighting_style" | "epic_boon" | "origin";
  readonly mechanics: FeatMechanics;
};

// SpeciesTraitMechanics: passive for most traits (e.g., Darkvision);
// activation for trait-as-ability (e.g., Dragonborn Breath Weapon).
export type SpeciesTraitMechanics =
  | PassiveMechanics
  | ActivatedAbilityMechanics;

export type SpeciesTraitRecord = UnitMetadata & {
  readonly kind: "species_trait";
  readonly species: string;
  readonly mechanics: SpeciesTraitMechanics;
};

export type MagicItemComponentMechanics =
  | PassiveMechanics
  | ActivatedAbilityMechanics
  | TriggeredReactionAbilityMechanics
  | MagicItemSpawnedCreatureMechanics;

// Composite magic-item mechanics — a single SRD item can combine
// always-on passive grants with a distinct activated ability while
// remaining one authored unit. Keep this bounded to existing
// magic-item families, including trigger-bound reactions that still
// spend item resources and reset on item cadence.
export type CompositeMagicItemMechanics = {
  readonly family: "composite";
  readonly parts: ReadonlyNonEmptyArray<MagicItemComponentMechanics>;
};

// MagicItemMechanics: attunement-gated passive (Cloak of Protection) or
// charge-based activation (Wand of Magic Missiles). Some staffs combine
// passive held bonuses and separate activated spellcasting in one item,
// so the surface also admits a bounded composite over those existing
// families. The attunement gate is carried on the record, not the
// mechanics, since any mechanics shape can be gated.
export type MagicItemMechanics =
  | MagicItemComponentMechanics
  | CompositeMagicItemMechanics;

export type MagicItemRarity =
  | "common"
  | "uncommon"
  | "rare"
  | "very_rare"
  | "legendary"
  | "artifact";

// Attunement eligibility gate on magic items. Keep this on the record,
// not mechanics, because the restriction scopes who may attune to the
// item regardless of whether the item is passive, activated, or
// composite.
export type MagicItemAttunementRestriction =
  | { readonly kind: "spellcaster" }
  | {
      readonly kind: "class_list";
      readonly classes: ReadonlyNonEmptyArray<ClassName>;
    };

// ItemDestructionPolicy — lifecycle trigger that removes the item from
// play. SRD wand idiom: "If you expend the wand's last charge, roll
// 1d20. On a 1, the wand crumbles into ashes and is destroyed." The
// trigger ("last charge expended") is universal across SRD charge-based
// wands; the die and threshold parametrize.
//
// `none` is the default for items that are never destroyed by use (all
// attunement-gated passives, non-charge items).
export type ItemDestructionPolicy =
  | { readonly kind: "none" }
  | {
      readonly kind: "last_charge_roll";
      readonly die: number;
      readonly destroyOn: number;
    }
  // Deterministic destruction on pool exhaustion — Chime of Opening
  // "cracks and becomes useless" after the 10th use; no roll. Distinct
  // from last_charge_roll which has a probabilistic gate (1 in 20 for
  // SRD wands).
  | { readonly kind: "permanent_on_empty" };

export type MagicItemAttunement =
  | {
      readonly requiresAttunement: false;
    }
  | {
      readonly requiresAttunement: true;
      readonly attunementRestriction?: MagicItemAttunementRestriction;
    };

// Some SRD magic-item slugs are collection records rather than a single
// mechanical payload: one shared item header with several named
// variants, each carrying its own rarity/mechanics/destruction. The
// collection itself also carries the default attunement gate so
// Ioun-Stone / Potion-of-Giant-Strength style records don't need to
// duplicate identical attunement metadata on every variant while still
// allowing a variant to override the default when a mixed collection
// eventually surfaces.
export type MagicItemVariant = {
  readonly id: string;
  readonly name: string;
  // Collection records still need one shared top-level description for
  // provenance, but many SRD variant lines also carry variant-specific
  // rules text that doesn't belong on the collection wrapper.
  readonly description?: string;
  readonly rarity: MagicItemRarity;
  readonly mechanics: MagicItemMechanics;
  readonly destruction: ItemDestructionPolicy;
  readonly attunementOverride?: MagicItemAttunement;
};

export type MagicItemRecord = UnitMetadata &
  { readonly kind: "magic_item" } & (
    | ({
        readonly rarity: MagicItemRarity;
        readonly mechanics: MagicItemMechanics;
        readonly destruction: ItemDestructionPolicy;
      } & MagicItemAttunement)
    | {
        readonly defaultAttunement: MagicItemAttunement;
        readonly variants: ReadonlyNonEmptyArray<MagicItemVariant>;
      }
  );

export type UnitRecord =
  | SpellRecord
  | ClassFeatureRecord
  | MasteryRecord
  | FeatRecord
  | SpeciesTraitRecord
  | MagicItemRecord;
