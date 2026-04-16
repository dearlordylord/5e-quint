# Proposal: Widenings required for Eyes of Minute Seeing

## Unit

**Eyes of Minute Seeing** — Wondrous Item, Uncommon  
Provenance: SRD 5.2.1, Magic-Items/Items-A-H#Eyes of Minute Seeing

> While wearing them, your vision improves significantly out to a range of 1 foot, granting you Darkvision within that range and Advantage on Intelligence (Investigation) checks made to examine something within that range.

## Outcome: `structural_widening`

Two independent structural gaps prevent encoding. The unit cannot be forced into any existing record shape without producing a dishonest trace.

---

## Gap 1 — Missing `magic_item` kind in `UnitRecord` (structural)

`types.ts` defines:
```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord`. The tracer's `traceUnit` switch handles `"spell"`, `"class_feature"`, and `"mastery"` — any `kind: "magic_item"` input would fall through to the exhaustive `never` branch and throw.

The v4 taxonomy (§1 Source Atoms) lists `magic_item_root` as a source atom with its own validation stream (24 items, 2 rounds). The surface type system must grow a `MagicItemRecord` shape and a corresponding tracer branch before any magic item can be encoded.

**Minimum shape:**
```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;
};
```

---

## Gap 2 — Missing `passive_equip` mechanics family (structural)

Eyes of Minute Seeing has:
- No activation cost
- No use count / resource
- No reset cadence
- No casting time
- No trigger

Its effects are **unconditionally active while the item is worn**. This is the dominant magic item pattern for wondrous items (Goggles of Night, Boots of Elvenkind, Cloak of Protection, etc.).

No existing mechanics family models this:
- `activation` requires activationCost + resource + resetCadence
- `ongoing_effect` / `activation` (spell) require level + school + castingTime + …
- `triggered_reaction` requires a reaction trigger
- `on_hit_trigger` is weapon-mastery shaped

A new family is needed — tentatively `passive_equip` or `worn_effect`:

```typescript
export type MagicItemPassiveMechanics = {
  readonly family: "passive_equip";
  readonly effects: ReadonlyArray<MagicItemEffect>;
};
```

---

## Gap 3 — `grant_sense` missing from surface effect vocabulary (atom_widening)

The v4 taxonomy (§9 Effect Atoms) lists `grant_sense`. It is not exposed in `types.ts` as a surface effect type. The Darkvision-within-1-foot effect maps directly to `grant_sense`, but there is no `GrantSenseEffect` variant the tracer can emit.

**Evidence:** "granting you Darkvision within that range"

**Proposed surface type:**
```typescript
export type GrantSenseEffect = {
  readonly kind: "grant_sense";
  readonly sense: "darkvision" | "blindsight" | "tremorsense" | "truesight";
  readonly rangeFeet: number;
};
```

---

## Gap 4 — `ability_check` missing from `RollKind` (surface_widening)

`RollKind = "attack_roll" | "saving_throw"` covers two of the three core roll categories. Intelligence (Investigation) checks are ability checks — the third category — and cannot be expressed with the current enum.

**Evidence:** "Advantage on Intelligence (Investigation) checks made to examine something within that range"

**Proposed extension:**
```typescript
export type RollKind = "attack_roll" | "saving_throw" | "ability_check";
```

A finer-grained variant (e.g. `{ kind: "ability_check"; ability: Ability; skill?: string }`) may be warranted when more items are encoded, but the flat string is sufficient for classification purposes.

---

## Summary of proposed widenings

| # | Kind | Name | Classification |
|---|------|------|----------------|
| 1 | new_subgraph | `MagicItemRecord` + `magic_item` UnitRecord kind | structural_widening |
| 2 | new_subgraph | `passive_equip` mechanics family for always-on wearable effects | structural_widening |
| 3 | new_atom | `grant_sense` exposed as a surface effect type | atom_widening |
| 4 | new_variant | `ability_check` added to `RollKind` | surface_widening |

Gaps 1 and 2 are blocking. Gaps 3 and 4 are additional widenings that would be required once the structural gaps are resolved.
