# Proposal: Amulet of Health — structural_widening

## Unit

**Amulet of Health** — Wondrous Item, Rare (Requires Attunement)

> Your Constitution is 19 while you wear this amulet. It has no effect on you if your Constitution is 19 or higher without it.

## Outcome

`structural_widening` — two independent blocking gaps, neither solvable by widening an existing type variant.

---

## Gap 1: No `magic_item` kind in `UnitRecord` (primary blocker)

`types.ts` defines:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

The v4 taxonomy includes `magic_item_root` as a source atom, but there is no `MagicItemRecord` type and no corresponding mechanics family. The tracer's `traceUnit` switch is exhaustive over `unit.kind`; a `magic_item` value would immediately throw.

### Required widening

Add a new top-level record kind:

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;
};

export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord | MagicItemRecord;
```

`MagicItemMechanics` needs at minimum one payload family. Given the survey corpus of 24+ items at tier 2, the following families are likely needed:

| Family | Pressure example |
|---|---|
| `passive_effect` | Amulet of Health (always-on while worn/attuned) |
| `activation` | Chime of Opening, Gem of Brightness (use-count consumable) |
| `charged` | Wand of Fireballs, Staff of Fire (charge-based) |

Amulet of Health is `passive_effect` — no activation cost, no quota, effect persists while worn and attuned.

---

## Gap 2: `modify_ability_score` effect atom (secondary blocker)

The item's mechanic is a **floor-set** on Constitution: `CON = max(CON, 19)` effectively, though the SRD phrases it as "your Constitution is 19." This is not a numeric delta (`modify_roll_numeric`) nor a resistance grant — it is a direct override of an ability score value.

v4 TAXONOMY section 12 explicitly records this as out-of-scope:

> `modify_ability_score` as a runtime effect versus as pre-runtime character state (currently treated as out-of-scope).

### Required widening

Promote `modify_ability_score` from deferred residue to a v4 effect atom:

```
modify_ability_score
  ability: Ability          -- which score is affected
  mode: "set" | "add"       -- floor-set (amulet) vs additive
  value: number             -- 19 for this item
```

The `"set"` mode with a no-effect guard ("if your Constitution is 19 or higher without it") is the minimal shape. The guard is a comparison against current character state — it may need a `condition_guard` subfield or be left as authoring prose.

---

## Gap 3: Attunement mechanics (dependent on Gap 1)

The item requires attunement. The v4 taxonomy has `attune` (procedure atom) and `attunement_slot` (resource atom) but they are not surfaced in any mechanics type.

Once `MagicItemRecord` exists, attuned items need:
- An `attune` procedure node rooted from `magic_item_root`
- An `attunement_slot` resource consumed by `attune`
- The passive effect gated behind attunement (i.e., the effect is only active while attuned)

This could be a field on the record header rather than a mechanics family variant:

```typescript
type MagicItemMechanicsHeader = {
  readonly attunement: false | { readonly classes?: ReadonlyArray<ClassName> };
};
```

---

## Proposed graph shape (once gaps are filled)

```
magic_item_root (Amulet of Health)
  → attune (procedure)
      consumes → attunement_slot (resource)
  → passive_effect (family)
      attachment: self (worn)
      effect: modify_ability_score (CON = 19, mode=set)
```

---

## Classification rationale

- **Not `atom_widening`** — the first blocker is the absence of an entire record kind and mechanics family, not just a missing atom.
- **Not `surface_widening`** — adding a new variant of an existing `UnitRecord` member won't help; the `magic_item` kind itself is absent.
- **`structural_widening`** is correct: a new top-level family/kind is required before any atom-level encoding can proceed.
