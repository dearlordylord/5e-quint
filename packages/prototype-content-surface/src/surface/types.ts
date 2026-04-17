// Closed atom types for the content surface.
//
// Widen on demand per red/green loop. Atom names trace to
// .references/xphb-srd-pairing/TAXONOMY_atoms_graph.md (v4).

// ---------- primitives ----------

// Per SRD 5.2.1 Rules Glossary, initiative is a Dexterity check. For
// modeling convenience (feats like Alert grant "+5 to Initiative"
// only, not all Dex checks), we promote initiative to its own
// RollKind rather than re-expressing it as an ability_check with an
// ability discriminant.
export type RollKind =
  | "attack_roll"
  | "saving_throw"
  | "ability_check"
  | "initiative";

// Weapon filter for roll modifiers that only apply to certain weapon
// categories. Archery Fighting Style: +2 to attack rolls with Ranged
// weapons only. Minimal melee/ranged split — extend if finer-grained
// weapon-category filters (e.g., "finesse", "simple") prove necessary.
export type WeaponFilter = {
  readonly kind: "weapon_category";
  readonly category: "melee" | "ranged";
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

// Damage-type reference — either a fixed type (most spells and
// weapons), or a build-time choice from a named option set. Dragonborn
// Breath Weapon: "damage of the type determined by your Draconic
// Ancestry trait" — the author provides the candidate list (10
// subspecies options) and a human-readable label. The choice is
// resolved once, at character creation; it is not re-rolled per use.
// DamageTypeRef — a specific damage type, a choice resolved when the
// owning construct is instantiated (character creation for species
// traits — Dragonborn ancestry; cast time for spells — Protection
// from Energy / Chromatic Orb), or a simultaneous-multiple set
// (Flame Strike: "5d6 Fire damage and 5d6 Radiant damage" is modeled
// as two separate damage atoms via composite, but some spells specify
// the union inline — kept available for future pressure).
export type DamageTypeRef =
  | DamageType
  | {
      readonly kind: "choice";
      readonly label: string;
      readonly options: ReadonlyArray<DamageType>;
    };

export type AttackKind = "ranged_spell_attack" | "melee_spell_attack";

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
  readonly upcastTiers?: ReadonlyArray<DurationUpcastTier>;
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
  | { readonly kind: "fixed"; readonly skills: ReadonlyArray<Skill> }
  | { readonly kind: "choice"; readonly options: ReadonlyArray<Skill> };

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

export type SenseKind = "darkvision" | "blindsight" | "tremorsense" | "truesight";

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
  readonly tiers: ReadonlyArray<{
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
      readonly tiers: ReadonlyArray<{
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
  | { readonly kind: "resource_spent" };

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
  // Points increase by 5". Positive delta also heals current HP by
  // the same amount (implicit, matches RAW for every SRD unit using
  // this shape). Distinct from grant_temp_hp (separate pool) and
  // heal_hp (current-HP-only restore that can't exceed max).
  | {
      readonly kind: "modify_max_hp";
      readonly delta: DiceAmount;
    }
  // v4: modify_ac. Delta is a DiceDelta to match modify_roll_numeric
  // (flat bonuses encode as dice=N, dieSize=1). This unification lets
  // multi-grant passive lists (Ring of Protection: +1 AC AND +1 saves)
  // share a single record shape in Dhall's homogeneous-list constraint.
  | {
      readonly kind: "modify_ac";
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
        | ReadonlyArray<Condition>
        | { readonly kind: "choose"; readonly from: ReadonlyArray<Condition> };
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
        | ReadonlyArray<Condition>
        | { readonly kind: "choose"; readonly from: ReadonlyArray<Condition> };
    }
  // v4: grant_resistance
  | {
      readonly kind: "grant_resistance";
      readonly damageType: DamageTypeRef;
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
      readonly on: ReadonlyArray<RollKind>;
      readonly delta: DiceDelta;
      readonly weaponFilter?: WeaponFilter;
      readonly skillFilter?: SkillFilter;
      readonly count?: number;
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
      readonly on: ReadonlyArray<RollKind>;
      readonly attackerTypeFilter?: ReadonlyArray<CreatureType>;
      readonly skillFilter?: SkillFilter;
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
  // v4: negate_named_effect — Counterspell, Shield vs. Magic Missile
  | {
      readonly kind: "negate_named_effect";
      readonly spellId: string;
      readonly scope: "damage_only" | "all_effects";
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
    }
  // v4-adjacent: grant_condition_immunity — Mind Blank, Protection from
  // Poison, Tiefling "Hellish Resistance" style. Survey evidence: 3 hits.
  // Differentiated from apply_condition (add) and remove_condition (one-shot
  // remove) — this prevents the condition from taking hold at all.
  | {
      readonly kind: "grant_condition_immunity";
      readonly condition: Condition;
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
  | {
      readonly kind: "grant_speed";
      readonly speedKind: "fly" | "swim" | "climb" | "burrow";
      readonly feet: number;
      readonly hover?: boolean;
    }
  // v4: teleport — Misty Step, Thunder Step, Dimension Door. The
  // destination is a closed descriptor; widen when a unit forces a
  // different destination shape (e.g., "a location you have seen" for
  // Teleport, "same plane" for Plane Shift).
  | {
      readonly kind: "teleport";
      readonly maxFeet: number;
      readonly destination: "unoccupied_visible_space";
    }
  // Composite: apply several effects as one bundle. Used to put
  // multiple atoms into a single slot (save_gate.onFail, attack
  // phase effect, etc.) without widening every consumer to arrays.
  // Hypnotic Pattern: on fail, the target gains Charmed AND
  // Incapacitated AND has Speed 0. Recursion is allowed but
  // discouraged — flatten when authoring.
  | {
      readonly kind: "composite";
      readonly effects: ReadonlyArray<EffectAtom>;
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
  | { readonly kind: "hit_by_attack_roll" }
  | { readonly kind: "targeted_by_named_spell"; readonly spellId: string }
  | {
      readonly kind: "any_of";
      readonly triggers: ReadonlyArray<ReactionTrigger>;
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
      readonly earlyEnd?: ReadonlyArray<DurationEndTrigger>;
    }
  | {
      readonly kind: "timed";
      readonly value: DurationValue;
      readonly earlyEnd?: ReadonlyArray<DurationEndTrigger>;
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
  readonly cadence: "end_of_target_turn";
  readonly onSuccess: "ends_on_target";
};

// Target-side creature-type filter. Hold Person: "Choose a Humanoid".
// When present, only creatures of one of the listed types are
// eligible targets. Omitted = no type restriction.
export type TargetTypeFilter = ReadonlyArray<CreatureType>;

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
  | { readonly kind: "cylinder"; readonly radiusFeet: number; readonly heightFeet: number }
  | { readonly kind: "emanation"; readonly radiusFeet: number }
  | { readonly kind: "line"; readonly lengthFeet: number; readonly widthFeet: number };

// Area shape specification — either a fixed shape, or a use-time
// choice among candidate shapes. Dragonborn Breath Weapon: "15-foot
// Cone or 30-foot Line (choose the shape each time)." The choice is
// shallow: options must be plain AreaShapeDescriptors (no nested
// choice-of-choice).
export type AreaShapeSpec =
  | AreaShapeDescriptor
  | {
      readonly kind: "choice";
      readonly options: ReadonlyArray<AreaShapeDescriptor>;
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

export type Attachment =
  | { readonly kind: "self" }
  | { readonly kind: "target"; readonly selection: TargetSelection }
  | {
      readonly kind: "area";
      readonly shape: AreaShapeSpec;
      readonly origin: AreaOrigin;
    }
  // v4 `mark` attachment — stateful binding on a creature that effects
  // latch onto, and that can be transferred on a configured event.
  | {
      readonly kind: "mark";
      readonly selection: TargetSelection;
      readonly transfer?: MarkTransfer;
    };

// ---------- resolution DC ----------

// Save DC source: spell save DC (from caster), or weapon-attack DC
// (Topple mastery: DC 8 + attack ability mod + Proficiency Bonus).
export type DcSource =
  | { readonly kind: "caster_spell_save_dc" }
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
export type OngoingPredicate =
  | {
      readonly kind: "at_hp_threshold";
      readonly threshold: number;
      readonly comparison: "lte" | "eq" | "gte";
    };

// What fires when the trigger+predicate hold. Most effects are plain
// EffectAtoms. Two ongoing-specific variants remain because they
// REPLACE AC (not additive like EffectAtom.modify_ac):
// modify_ac_set_base (Mage Armor) and modify_ac_set_floor (Barkskin).
// A save_gate variant absorbs §A9's damage-triggered repeat-save
// pattern.
export type OngoingEffect =
  | EffectAtom
  | {
      readonly kind: "save_gate";
      readonly ability: Ability;
      readonly dc: DcSource;
      readonly onFail: EffectAtom;
      readonly onSuccess: SaveSuccessOutcome;
    }
  | {
      readonly kind: "modify_ac_set_base";
      readonly const: number;
      readonly abilityMod: Ability;
    }
  | {
      readonly kind: "modify_ac_set_floor";
      readonly const: number;
    };

export type OngoingOperation = {
  readonly trigger: OngoingTrigger;
  readonly predicate?: OngoingPredicate;
  readonly effect: OngoingEffect;
};

// ---------- activation phases (spells) ----------

export type ActionRestriction =
  | { readonly kind: "none" }
  | {
      readonly kind: "exclude";
      readonly actions: ReadonlyArray<StandardActionKind>;
    };

// Outcome on a successful saving throw inside a save_gate phase. The
// `half_damage` sentinel expresses the Fireball-family "half damage
// on success" rule without duplicating the onFail damage amount at
// half — the tracer/interpreter links back to onFail.damage. For any
// other effect on success, use a raw EffectAtom. `none` is modeled as
// EffectAtom { kind: "none" }.
export type SaveSuccessOutcome =
  | { readonly kind: "half_damage" }
  | EffectAtom;

export type ActivationPhase =
  | {
      readonly kind: "attack_roll";
      readonly attachment: Attachment;
      readonly attackKind: AttackKind;
      // onHit / onMiss accept an ARRAY of effect atoms so spells like
      // Shocking Grasp can layer damage + deny_opportunity_attack, and
      // Ray of Frost can stack damage + modify_speed on the same hit.
      // Single-effect spells pass a singleton array.
      readonly onHit: ReadonlyArray<EffectAtom>;
      readonly onMiss: ReadonlyArray<EffectAtom>;
    }
  | {
      readonly kind: "save_gate";
      readonly attachment: Attachment;
      readonly ability: Ability;
      readonly dc: DcSource;
      readonly onFail: EffectAtom;
      readonly onSuccess: SaveSuccessOutcome;
      readonly repeatSave?: RepeatSaveSpec;
    }
  // Direct application — spells that just apply effects with no
  // resolution gate (no attack roll, no saving throw).
  | {
      readonly kind: "direct";
      readonly attachment: Attachment;
      readonly effects: ReadonlyArray<EffectAtom>;
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
  readonly operation: OngoingOperation;
};

export type ActivationMechanics = SpellMechanicsHeader & {
  readonly family: "activation";
  readonly phases: ReadonlyArray<ActivationPhase>;
};

// Triggered-reaction spell (Shield, Counterspell, Silvery Barbs). The
// trigger is specified on the CastingTime (see `ReactionTrigger`). The
// effects fire through the Prepare/Prompt/Commit subgraph (subgraph A
// from the research): reaction window opens, player decides, effects
// commit (or don't — declining does not consume reaction per
// UBIQUITOUS_LANGUAGE §Triggers line 31).
export type TriggeredReactionMechanics = SpellMechanicsHeader & {
  readonly family: "triggered_reaction";
  readonly attachment: Attachment;
  readonly interruptsTrigger: boolean;
  readonly effects: ReadonlyArray<EffectAtom>;
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

export type SpellMechanics =
  | OngoingEffectMechanics
  | ActivationMechanics
  | TriggeredReactionMechanics
  | AnchoredTriggerMechanics;

// ---------- class-feature atoms ----------

// Activation cost for an activated ability (class feature / magic item /
// species trait). Drives which (if any) quota atom the tracer emits a
// `consumes` edge to. `action` is the "use this as your Action" case
// (magic-item activations, many class features like Channel Divinity).
// `reaction` covers reactive uses that consume the reaction quota.
// `replace_attack` is the Extra-Attack-economy cost: the ability is
// triggered by spending one of the attacks you would otherwise make
// during the Attack action (Breath Weapon, some smite-like species
// abilities). It consumes an attack-slot rather than an action quota.
export type ClassFeatureActivationCost =
  | { readonly kind: "free" }
  | { readonly kind: "action" }
  | { readonly kind: "bonus_action" }
  | { readonly kind: "reaction" }
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
  | { readonly kind: "proficiency_bonus" };

export type UseCountResource = {
  readonly kind: "use_count";
  readonly cap: UseCountCap;
};

// Charge pool — a numeric pool where each activation may consume a
// variable number of charges (player choice at activation time). The
// magic-item wand idiom: "expend 1-3 charges to cast Magic Missile,
// 1 charge per spell level". `cap` is the pool size; the per-activation
// cost schedule lives on the effect atom that spends them
// (grant_spell_access.mode = charge_cast).
export type ChargePoolResource = {
  readonly kind: "charge_pool";
  readonly cap: UseCountCap;
};

// Activated-ability resource — either a discrete use counter (each
// activation costs 1) or a charge pool (variable cost per activation).
export type ActivationResource = UseCountResource | ChargePoolResource;

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
      // null = regains all; DiceAmount for e.g. "1d6 + 4" style partial.
      readonly regain: null | DiceAmount;
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
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource: ActivationResource;
  readonly resetCadence: RestResetCadence;
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
  readonly phases: ReadonlyArray<ActivationPhase>;
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
// Cloak of Protection, etc.). `wearing_armor` carries a category list
// because Defense's SRD text enumerates three allowed categories.
// `wielding_weapon` carries a coarse weapon-kind enum sufficient to
// scope the Fighting Style pool; finer discrimination (specific
// weapon types, versatile-used-two-handed, dual-wielding off-hand) can
// be added as new Fighting-Style-adjacent units surface it.
export type EquipmentPredicate =
  | { readonly kind: "always" }
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
    };

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
  readonly kind: "srd-5.2.1";
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
export type SpeciesTraitMechanics = PassiveMechanics | ActivatedAbilityMechanics;

export type SpeciesTraitRecord = UnitMetadata & {
  readonly kind: "species_trait";
  readonly species: string;
  readonly mechanics: SpeciesTraitMechanics;
};

// MagicItemMechanics: attunement-gated passive (Cloak of Protection) or
// charge-based activation (Wand of Magic Missiles). The attunement gate
// is carried on the record, not the mechanics, since any mechanics shape
// can be gated.
export type MagicItemMechanics = PassiveMechanics | ActivatedAbilityMechanics;

export type MagicItemRarity =
  | "common"
  | "uncommon"
  | "rare"
  | "very_rare"
  | "legendary"
  | "artifact";

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

export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly rarity: MagicItemRarity;
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;
  readonly destruction: ItemDestructionPolicy;
};

export type UnitRecord =
  | SpellRecord
  | ClassFeatureRecord
  | MasteryRecord
  | FeatRecord
  | SpeciesTraitRecord
  | MagicItemRecord;
