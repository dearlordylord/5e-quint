# Proposal: Weird — structural_widening

## Unit

**Name:** Weird  
**Slug:** weird  
**Kind:** spell (level 9, illusion, concentration up to 1 minute)  
**SRD:** srd-5.2.1

## Why it does not fit

Weird has two mechanically distinct phases that together have no honest mapping to any existing payload family.

### Phase 1 — Initial activation (area save gate + condition application)

On cast, every chosen creature in a 30-foot-sphere centered within 120 ft makes a WIS save:

- **Fail:** 10d10 Psychic damage + **Frightened condition** for the duration.
- **Success:** Half damage only; no condition.

The `activation` family's `save_gate` phase can express the save and the damage split. But the `Effect` type for spells (`DamageEffect | NoneEffect`) has no `apply_condition` variant — only the mastery surface's `SaveGateRiderResult` does. Encoding the condition application would require a fabricated `damage`-only trace that silently omits the Frightened rider, which violates the honesty guardrail.

### Phase 2 — Per-turn repeat save for each Frightened creature

For the duration of concentration, each Frightened creature makes a WIS save at **the end of each of its turns**:

- **Fail:** 5d10 Psychic damage.
- **Success:** The spell ends on *that target* (per-target expiry).

This is a `repeat_save` (v4 taxonomy) fired by a `turn_end_window`, conditioned on the Frightened status that Phase 1 applied, with a per-target `expire` on success. No existing family handles this:

- `activation` phases are sequential and one-shot; they cannot loop.
- `ongoing_effect` operations are limited to `roll_modifier` and `damage_on_hit`; they cannot express a conditional per-turn save gate that terminates per-target.
- `triggered_reaction` and `anchored_trigger` are structurally unrelated.

The cross-boundary nature — Phase 1 applies a condition; Phase 2 fires conditional save gates per condition-holder per turn — requires a new family or a structural extension.

## Gap inventory

### 1. `Condition` type is too narrow

```typescript
export type Condition = "prone";
```

Needs at minimum: `"prone" | "frightened"`. The Frightened condition is the pivot the entire ongoing mechanic turns on.

### 2. Spell `Effect` needs `apply_condition` variant

```typescript
// Current:
export type Effect = DamageEffect | NoneEffect;

// Needed:
export type ApplyConditionEffect = {
  readonly kind: "apply_condition";
  readonly condition: Condition;
};
export type Effect = DamageEffect | ApplyConditionEffect | NoneEffect;
```

This mirrors what mastery already has in `SaveGateRiderResult`. The spell surface should expose the same atom.

### 3. New spell family (or structural extension) for activation + repeat-save

The closest sketch:

```typescript
// New mechanics family:
export type RepeatSavePhase = {
  readonly kind: "repeat_save";
  readonly trigger: "turn_end";               // window atom: turn_end_window
  readonly gatedOnCondition: Condition;       // only fires while target has this condition
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly onFail: Effect;
  readonly onSuccess: "expire_on_target";     // per-target expire atom
};

export type ActivationWithRepeatSaveMechanics = SpellMechanicsHeader & {
  readonly family: "activation_with_repeat_save";
  readonly initialPhase: ActivationPhase;     // the area save gate
  readonly repeatPhase: RepeatSavePhase;      // fires each turn for condition-holders
};
```

Alternatively, a generalised `activation_ongoing` family that allows optional per-turn repeat-save phases after the initial activation phases. Either way, this is a new top-level family discriminant.

## v4 atoms involved (all already in taxonomy)

| Atom | Category | Use |
|---|---|---|
| `save_gate` | resolution | initial area save + per-turn repeat save |
| `repeat_save` | resolution | per-turn save at turn end |
| `apply_condition` | effect | Frightened applied on initial fail |
| `damage` | effect | 10d10 Psychic on initial fail; 5d10 Psychic on repeat fail |
| `turn_end_window` | window | triggers the repeat save |
| `expire` | lifecycle | per-target expiry on repeat-save success |
| `area` | attachment | initial sphere |
| `concentrate` | lifecycle | spell sustained by concentration |

All atoms are in v4. The gap is entirely in the **surface type system** (missing Effect variant, missing Condition value) and in the **family taxonomy** (no family for activation + per-turn condition-gated repeat save).

## Classification

- **Primary:** `structural_widening` — the two-phase shape (initial activation + ongoing per-turn repeat save gated on applied condition) has no honest family mapping.
- **Secondary (absorbed):** `surface_widening` for missing `apply_condition` spell effect and missing `frightened` Condition value. These are prerequisites for any encoding but do not change the primary classification since the structural gap dominates.
