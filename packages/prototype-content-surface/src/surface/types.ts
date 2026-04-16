// Closed atom types for the content surface.
//
// Widen on demand per red/green loop. Atom names trace to
// .references/xphb-srd-pairing/TAXONOMY_atoms_graph.md (v4).

// ---------- primitives ----------

export type RollKind = "attack_roll" | "saving_throw" | "ability_check";

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

export type DiceDelta = {
  readonly dice: number;
  readonly dieSize: number;
  readonly sign: "+" | "-";
};

export type DurationValue = {
  readonly unit: "round" | "minute" | "hour" | "day";
  readonly amount: number;
};

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

// DiceExpr is the canonical "dice roll expression": N d M + flat.
export type DiceExpr = {
  readonly dice: number;
  readonly dieSize: number;
  readonly flat?: number;
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
    };

// ---------- unified effect atoms (v4 taxonomy) ----------
//
// Discriminated union covering the v4 effect atoms. Replaces the
// fragmented Effect / ClassFeatureEffect / ReactionEffect /
// SaveGateRiderResult unions. Widen incrementally as more content
// lands; the rest of the 36 v4 atoms can be added later.

export type EffectAtom =
  // v4: damage
  | {
      readonly kind: "damage";
      readonly damageType: DamageType;
      readonly amount: DiceAmount;
    }
  // v4: heal — JSON discriminant is `heal_hp` for backward compat with
  // existing content files.
  | {
      readonly kind: "heal_hp";
      readonly amount: DiceAmount;
      readonly target: "self" | "target_creature";
    }
  // v4: modify_ac
  | {
      readonly kind: "modify_ac";
      readonly delta: number;
    }
  // v4: apply_condition
  | {
      readonly kind: "apply_condition";
      readonly condition: Condition;
    }
  // v4: remove_condition
  | {
      readonly kind: "remove_condition";
      readonly condition: Condition;
    }
  // v4: grant_resistance
  | {
      readonly kind: "grant_resistance";
      readonly damageType: DamageType;
    }
  // v4: grant_extra_action
  | {
      readonly kind: "grant_extra_action";
      readonly restriction: ActionRestriction;
    }
  // v4: modify_roll_numeric — Bless-style additive dice on roll kinds
  | {
      readonly kind: "modify_roll_numeric";
      readonly on: ReadonlyArray<RollKind>;
      readonly delta: DiceDelta;
    }
  // v4: modify_roll_advantage — advantage/disadvantage on roll kinds
  | {
      readonly kind: "modify_roll_advantage";
      readonly mode: "advantage" | "disadvantage";
      readonly on: ReadonlyArray<RollKind>;
    }
  // v4: modify_speed
  | {
      readonly kind: "modify_speed";
      readonly delta: number;
      readonly unit: "feet";
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
  | { readonly kind: "action" }
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

export type Components = {
  readonly v: boolean;
  readonly s: boolean;
  readonly m: false | string;
};

export type Duration =
  | { readonly kind: "instantaneous" }
  | { readonly kind: "concentration"; readonly upTo: DurationValue }
  | { readonly kind: "timed"; readonly value: DurationValue };

// ---------- attachment ----------

export type TargetSelection =
  | { readonly mode: "one" }
  | { readonly mode: "choose_up_to"; readonly count: SlotScaling<number> };

export type AreaOrigin =
  | { readonly kind: "point_within_range" }
  | { readonly kind: "on_primary_target" };

// Area shape descriptions. Each shape carries its own measurement.
export type AreaShapeDescriptor =
  | { readonly kind: "sphere"; readonly radiusFeet: number }
  | { readonly kind: "cone"; readonly lengthFeet: number }
  | { readonly kind: "cube"; readonly sideFeet: number }
  | { readonly kind: "cylinder"; readonly radiusFeet: number; readonly heightFeet: number }
  | { readonly kind: "emanation"; readonly radiusFeet: number }
  | { readonly kind: "line"; readonly lengthFeet: number; readonly widthFeet: number };

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
      readonly shape: AreaShapeDescriptor;
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
  | { readonly kind: "weapon_attack_dc"; readonly base: number };

// ---------- ongoing operations ----------

// Ongoing operations now use EffectAtom directly. The `operation` field
// is replaced by an array of persistent effect atoms that apply for the
// spell's duration.

// Legacy single-operation shapes kept as type aliases for backward
// compatibility with existing JSON content (bless.json uses
// `roll_modifier`, hunters_mark.json uses `damage_on_hit`).
export type RollModifierOperation = {
  readonly kind: "roll_modifier";
  readonly on: ReadonlyArray<RollKind>;
  readonly delta: DiceDelta;
};

export type DamageOnHitOperation = {
  readonly kind: "damage_on_hit";
  readonly damageType: DamageType;
  readonly amount: DiceAmount;
};

export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;

// ---------- activation phases (spells) ----------

export type ActionRestriction =
  | { readonly kind: "none" }
  | {
      readonly kind: "exclude";
      readonly actions: ReadonlyArray<StandardActionKind>;
    };

export type ActivationPhase =
  | {
      readonly kind: "attack_roll";
      readonly attachment: Attachment;
      readonly attackKind: AttackKind;
      readonly onHit: EffectAtom;
      readonly onMiss: EffectAtom;
    }
  | {
      readonly kind: "save_gate";
      readonly attachment: Attachment;
      readonly ability: Ability;
      readonly dc: DcSource;
      readonly onFail: EffectAtom;
      readonly onSuccess: EffectAtom;
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

// Activation cost for a class feature. Drives which (if any) quota
// atom the tracer emits a `consumes` edge to.
export type ClassFeatureActivationCost =
  | { readonly kind: "free" }
  | { readonly kind: "bonus_action" };

// use_count cap — fixed amount, or a threshold-tier schedule (Option B:
// uses scale by class level e.g. Action Surge 1@L2 → 2@L17, Second Wind
// 2@L1 → 3@L4 → 4@L10, Indomitable 1@L9 → 2@L13 → 3@L17).
export type UseCountCap =
  | { readonly kind: "fixed"; readonly uses: number }
  | ThresholdTiers<number>;

export type UseCountResource = {
  readonly kind: "use_count";
  readonly cap: UseCountCap;
};

// Disjoint reset cadence — SRD "Short or Long Rest" maps to either rest
// refilling the pool.
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
    };

// ---------- class-feature payload family ----------

type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource: UseCountResource;
  readonly resetCadence: RestResetCadence;
};

export type ClassFeatureActivationMechanics = ClassFeatureMechanicsHeader & {
  readonly family: "activation";
  readonly effect: EffectAtom;
};

export type ClassFeatureMechanics = ClassFeatureActivationMechanics;

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

export type MasteryUsageLimit = { readonly kind: "once_per_turn" };

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
  readonly usageLimit?: MasteryUsageLimit;
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

export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
