# Proposal: Cloak of Protection

## Outcome: `structural_widening`

## Unit

> *Wondrous Item, Uncommon (Requires Attunement)*
> You gain a +1 bonus to Armor Class and saving throws while you wear this cloak.

## Why It Doesn't Fit

### 1. No `magic_item` kind in `UnitRecord`

`types.ts` defines:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord`. The v4 taxonomy (`TAXONOMY_atoms_graph.md`) lists `magic_item_root` as a source atom, but no corresponding record type, mechanics family, or tracer branch has been added to the surface schema.

The unit cannot be coerced into any existing kind:
- Not `SpellRecord` — no casting time, no spell slot, no school, no spell family.
- Not `ClassFeatureRecord` — no class, no `acquiredAtLevel`, no activation trigger.
- Not `MasteryRecord` — no weapon-hit trigger, no `on_hit_trigger` family.

### 2. No passive modifier mechanics family

The item's core mechanic is an **always-on passive bonus** — +1 AC and +1 to all saving throws — that applies unconditionally while the item is worn and attuned. No existing mechanics family covers this shape:

| Family | Why it doesn't fit |
|---|---|
| `ongoing_effect` (spell) | Requires casting time, spell slot, school, duration — item has none |
| `activation` (spell / class feature) | Requires an activation event; this item has no activation |
| `triggered_reaction` (spell) | Requires a reaction trigger; this item is always on |
| `anchored_trigger` (spell) | Plants a trigger to fire later; item effect is immediate and permanent |
| `on_hit_trigger` (mastery) | Fires on weapon hit; no hit event here |

A new `passive_modifier` mechanics family is needed for items (and traits/feats) that apply stat modifiers unconditionally while the item is worn/attuned.

### 3. No attunement modeling

The item requires attunement. The v4 atoms `attune` (procedure) and `attunement_slot` (resource) exist in the taxonomy but are absent from `types.ts` and the tracer. There is no surface type for the attunement lifecycle.

### Atoms Available but Not Surfaced in Applicable Context

Both effect atoms that *would* be used are already in v4 and `types.ts`, but only in incompatible contexts:

- `modify_ac` — present as a `ReactionEffect` inside `TriggeredReactionMechanics` only (e.g., Shield spell)
- `modify_roll_numeric` — present as an `OngoingOperation` inside `OngoingEffectMechanics` only (e.g., Bless)

Neither is accessible from a magic item passive modifier context.

## Proposed Widenings

### A. `MagicItemRecord` — new top-level record kind

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;
};

export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord | MagicItemRecord;
```

Also requires a new `traceUnit` branch in `tracer.ts`.

### B. `passive_modifier` mechanics family — new magic item family

```typescript
export type PassiveModifierEffect =
  | { readonly kind: "modify_ac"; readonly delta: number }
  | { readonly kind: "modify_roll_numeric"; readonly on: ReadonlyArray<RollKind>; readonly delta: DiceDelta };

export type PassiveModifierMechanics = {
  readonly family: "passive_modifier";
  readonly effects: ReadonlyArray<PassiveModifierEffect>;
};

export type MagicItemMechanics = PassiveModifierMechanics; // extend union as more families land
```

For the Cloak of Protection specifically:
- `modify_ac` with `delta: 1` (passive +1 AC)
- `modify_roll_numeric` with `on: ["saving_throw"]`, `delta: { dice: 0, dieSize: 0, sign: "+" }` — or a flat numeric variant

Note: the current `DiceDelta` type only models dice (`dice`, `dieSize`, `sign`), not flat integers. A `+1` to saving throws is a flat numeric bonus, not a dice expression. This may require a `flat` field on `DiceDelta` or a separate `FlatDelta` type.

### C. Attunement surface

```typescript
export type AttunementRequirement =
  | { readonly kind: "none" }
  | { readonly kind: "required" };
```

Or fold into the boolean `requiresAttunement` on `MagicItemRecord` (sufficient for Cloak of Protection; richer class restrictions can be added later under pressure from items like Berserker Axe).

The tracer would emit:
- `attune` procedure node (from `magic_item_root`)
- `attunement_slot` resource node consumed by `attune`

## v4 Atoms That Would Be Used (Given the Widening)

| Atom | Category | Status |
|---|---|---|
| `magic_item_root` | source | v4 ✓, not in surface |
| `attune` | procedure | v4 ✓, not in surface |
| `attunement_slot` | resource | v4 ✓, not in surface |
| `modify_ac` | effect | v4 ✓, in surface (wrong context) |
| `modify_roll_numeric` | effect | v4 ✓, in surface (wrong context) |

No new v4 atoms are required — all needed atoms exist. This is a **structural widening** (missing record kind + mechanics family), not an atom widening.

## Classification Rationale

`structural_widening` rather than `surface_widening` or `atom_widening` because:
- The top-level `kind: "magic_item"` is absent from `UnitRecord` — this is a missing record kind, not a missing variant of an existing shape.
- The `passive_modifier` mechanics family does not exist at all — no family in any existing kind can honestly represent always-on passive item modifiers.
- Attunement has no surface representation.

All three gaps require adding new types to `types.ts` and new code paths to `tracer.ts`.
