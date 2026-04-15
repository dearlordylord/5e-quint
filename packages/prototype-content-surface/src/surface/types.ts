// Closed atom types for the content surface.
//
// Minimum subset needed to encode Bless. Widen on demand as new spells
// produce "red" events in the red/green per-spell loop described in
// /plans/CONTENT_SURFACE_PROTOTYPE.md.
//
// Source of truth for atom names: .references/xphb-srd-pairing/TAXONOMY_atoms_graph.md (v4).

// ---------- primitives ----------

export type RollKind = "attack_roll" | "saving_throw";

export type DiceDelta = {
  readonly dice: number;
  readonly dieSize: number;
  readonly sign: "+" | "-";
};

export type Duration = {
  readonly unit: "round" | "minute" | "hour" | "day";
  readonly amount: number;
};

export type DistanceFeet = { readonly feet: number };

// ---------- scaling ----------

// Linear-per-slot scaling. Widen with `table` and `threshold` variants when
// a spell pressures them (e.g., Dominate's piecewise duration).
export type SlotScaling<T> = {
  readonly kind: "linear";
  readonly base: T;
  readonly perSlotAboveBase: T;
  readonly baseLevel: number;
};

// ---------- envelopes (shared across payload families) ----------

// Casting Time — SRD spell-card field. Mirrors the spell-card text literally:
// "Casting Time: Action" → { kind: "action" }.
//
// UBIQUITOUS_LANGUAGE §Spellcasting line 216: "How long it takes to cast a
// spell: 1 action, 1 bonus action, 1 reaction, or extended (minutes/hours)".
//
// Each variant implicitly consumes the corresponding Quota resource (per
// UBIQUITOUS_LANGUAGE §"Resource Consumption"). The tracer handles the
// mapping CastingTime → Quota atom; authors never write `action_quota`
// explicitly.
//
// Narrow to `action` for now. Widen with `bonus_action`, `reaction` (with
// `trigger`), `extended` (with `duration`) per red/green spell demand.
export type CastingTime = { readonly kind: "action" };

// `target` only for now. Widen with `self`, `area`, `object`, `location`
// attachment kinds as spells demand.
export type Attachment = {
  readonly kind: "target";
  readonly selection: {
    readonly mode: "choose_up_to";
    readonly count: SlotScaling<number>;
    readonly range: DistanceFeet;
  };
};

// `spell_slot` only for now. Widen with `charge`, `use_count`, `attunement_slot`
// as other roots (classes, items) enter encoding.
export type Resource = {
  readonly kind: "spell_slot";
  readonly minLevel: number;
};

// `concentration` only for now. Widen with `timed_non_concentration`,
// `instantaneous`, `permanent` as spells demand.
export type Lifecycle = {
  readonly kind: "concentration";
  readonly maxDuration: Duration;
};

// `concentration_end` only for now. Widen with `manual_end`, `action_end`,
// `turn_boundary`, `self_break`, `attunement_end`.
export type Cleanup = { readonly kind: "concentration_end" };

// ---------- operations (closed vocabulary) ----------

// `roll_modifier` only for now. Widen with `damage`, `heal`, `apply_condition`,
// `remove_condition`, `modify_ac`, `grant_temp_hp`, etc. as spells demand.
export type Operation = {
  readonly kind: "roll_modifier";
  readonly on: ReadonlyArray<RollKind>;
  readonly delta: DiceDelta;
};

// ---------- payload families ----------

// Spell-card header fields shared across every spell payload family —
// mirrors the top of a D&D 5e spell card (Casting Time, Components,
// Range, Duration, Level, ...). `castingTime` is the first one landed;
// others join here as spells pressure them.
//
// This lifts spell-level facts ABOVE the family discriminant so that
// `activation` / `triggered_reaction` / `anchored_trigger` / etc. don't
// each redeclare them. Tracers extract header fields once regardless of
// family.
type SpellMechanicsHeader = {
  readonly castingTime: CastingTime;
};

export type OngoingEffectMechanics = SpellMechanicsHeader & {
  readonly family: "ongoing_effect";
  readonly attachment: Attachment;
  readonly resource: Resource;
  readonly operation: Operation;
  readonly lifecycle: Lifecycle;
  readonly cleanup: Cleanup;
};

// Widen this union as new families land: | ActivationMechanics |
// TriggeredReactionMechanics | AnchoredTriggerMechanics | ...
// Every new family intersects with SpellMechanicsHeader, so header
// fields stay uniform across the union.
export type SpellMechanics = OngoingEffectMechanics;

// ---------- spell record ----------

export type Provenance = {
  readonly kind: "srd-5.2.1";
  readonly section: string;
};

export type SpellRecord = {
  readonly id: string;
  readonly name: string;
  readonly provenance: Provenance;
  readonly description: string;
  readonly mechanics: SpellMechanics;
};
