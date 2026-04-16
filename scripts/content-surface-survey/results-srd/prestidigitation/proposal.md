# Proposal: Widenings required for Prestidigitation

**Unit:** Prestidigitation (cantrip, Transmutation)
**Outcome:** `structural_widening`
**No dhall/JSON authored.** No existing payload family can honestly encode this spell.

---

## Why no existing family fits

Prestidigitation's structure is: *"At cast time, choose one of six distinct options."* Each option has its own effect type, attachment target, and duration. This is a **menu-dispatch spell** — structurally different from all four current families:

| Family | Problem |
|---|---|
| `ongoing_effect` | Requires a single operation (roll_modifier or damage_on_hit); Prestidigitation has neither |
| `activation` | Phases must be `attack_roll` or `save_gate`; Prestidigitation has no rolls or saves |
| `triggered_reaction` | Requires a reaction trigger; Prestidigitation is a standard Action |
| `anchored_trigger` | Plants a deferred release; Prestidigitation options are not event-gated |

---

## Required widenings

### 1. New spell payload family: `choice_spell` (structural)

A family for "choose one of N options at cast time." Shape sketch:

```typescript
export type ChoiceSpellMechanics = SpellMechanicsHeader & {
  readonly family: "choice_spell";
  readonly maxActiveNonInstantaneous?: number; // Prestidigitation: 3
  readonly options: ReadonlyArray<ChoiceSpellOption>;
};

export type ChoiceSpellOption = {
  readonly name: string;
  readonly attachment: Attachment;
  readonly duration: Duration;        // per-option, may differ from header
  readonly effect: ChoiceSpellEffect; // new effect union (see below)
};
```

The `maxActiveNonInstantaneous: 3` field captures the "up to three non-instantaneous effects active at a time" constraint.

---

### 2. New Effect variants (or new `ChoiceSpellEffect` union)

The existing `Effect = DamageEffect | NoneEffect` union has no coverage for cosmetic/environmental effects. Required additions (or a parallel union for choice_spell):

| Effect kind | Prestidigitation option | Description |
|---|---|---|
| `create_sensory_effect` | Sensory Effect | Instantaneous harmless phenomenon (sparks, wind, sound, odor) |
| `toggle_fire` | Fire Play | Light or extinguish a small fire source |
| `alter_object_state` | Clean or Soil | Toggle object between two states (clean ↔ soiled) |
| `modify_material_property` | Minor Sensation | Change temperature or flavor of nonliving material |
| `apply_visual_mark` | Magic Mark | Place a color/mark/symbol on an object or surface |
| `create_object` | Minor Creation | Create a physical object or illusory image (v4 atom exists but absent from surface) |

All of these are **deterministic** (not DM-adjudicated). They just operate outside the combat-engine scope (no HP, conditions, or roll modifiers).

---

### 3. New Attachment kinds: `object` and `surface`

Several options target objects or surfaces, not creatures:

- `Clean or Soil` → object (≤ 1 cubic foot)
- `Minor Sensation` → material (nonliving, ≤ 1 cubic foot)
- `Magic Mark` → object or surface

The v4 taxonomy has `object` and `location` attachment atoms, but `Attachment` in the surface type only covers `self`, `target`, `area`, `mark`.

---

## Scope note

`create_object` is already in the v4 atom taxonomy but absent from `surface/types.ts`. The other effect kinds are genuinely new and may require new v4 atom additions. Minimum promotion to surface vocabulary before Prestidigitation can be encoded:

1. `choice_spell` family (structural)
2. At least the cosmetic effect variants needed (surface_widening × 5–6)
3. `object` attachment kind (surface_widening)

---

## Effects that might qualify as `dm_agenda` in a narrower model

If a future design chose to model only a subset (e.g., `Minor Creation`'s trinket constraints are deterministic; `Minor Sensation`'s duration is deterministic), the sensory/narrative effects (Sensory Effect, Fire Play, Clean or Soil) could be `dm_agenda` within a partial encoding. However, forcing a partial encoding while omitting options would misrepresent the spell's structure, so the whole unit is correctly `structural_widening`.
