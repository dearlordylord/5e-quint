# Proposal: Widening for Potion of Diminution

## Outcome: structural_widening

The Potion of Diminution cannot be encoded in the current surface. Three gaps must be closed.

---

## Gap 1 — Structural: No `MagicItemRecord` kind (primary blocker)

`UnitRecord` is currently `SpellRecord | ClassFeatureRecord | MasteryRecord`. Magic items are a distinct source-root in the v4 TAXONOMY (`magic_item_root`) but have no corresponding record type in the schema.

A `MagicItemRecord` needs at minimum:

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly rarity: "common" | "uncommon" | "rare" | "very_rare" | "legendary" | "artifact";
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;
};
```

`MagicItemMechanics` needs at least one family. Potions are single-use consumables with an activation pattern distinct from class features (no class level, no rest-reset cadence, no use-count in the class-feature sense). A `consumable` family is the minimal addition.

---

## Gap 2 — Surface: No rolled/random duration

`DurationValue` is `{ unit: "round" | "minute" | "hour" | "day"; amount: number }` — a fixed integer. The potion's duration is **1d4 hours**, which requires a `DiceExpr` amount.

A rolled duration variant is needed:

```typescript
export type DurationValue =
  | { readonly unit: "round" | "minute" | "hour" | "day"; readonly amount: number }
  | { readonly unit: "round" | "minute" | "hour" | "day"; readonly amount: DiceExpr };
```

Or equivalently, a discriminated union so the two shapes are unambiguous:

```typescript
export type DurationValue =
  | { readonly kind: "fixed"; readonly unit: ...; readonly amount: number }
  | { readonly kind: "rolled"; readonly unit: ...; readonly amount: DiceExpr };
```

This is a surface widening (new variant of `DurationValue`), not a new atom.

---

## Gap 3 — Atom: No `alter_size` effect

The "reduce" effect of Enlarge/Reduce simultaneously:
1. Reduces the creature's size category by one
2. Reduces weapon damage dice by one die size
3. Applies disadvantage on Strength checks and Strength saving throws

This is not expressible as any existing effect atom:
- `apply_condition` — "reduced" is not an SRD condition
- `modify_roll_advantage` — covers only the Strength-roll component
- `scale_die_size` — is a scaling atom for spell/feature progression, not a runtime effect

A new `alter_size` effect atom is needed:

```
alter_size — applies a creature-size change (grow or shrink by N categories) 
             as a runtime effect; may carry secondary riders per SRD (damage die 
             reduction for shrink, damage die increase for grow)
```

This is one of the `v4` residue items recorded in `TAXONOMY_atoms_graph.md §12` as a known weak spot (`modify_ability_score` as a runtime effect is adjacent but distinct; `alter_size` is its own mechanical operation).

---

## What a future `consumable` family encoding might look like

Once all three gaps are closed, the mechanic maps cleanly:

- Source: `magic_item_root`
- Family: `consumable` (drink / apply)
- Activation: drink (no action-economy cost listed → action to drink per SRD potion rules, or bonus action with specific feats — could model as `action` activation)
- Resource: single use (no recharge)
- Duration: `{ kind: "rolled", unit: "hour", amount: { dice: 1, dieSize: 4 } }`
- Effect: `alter_size` (shrink, 1 category) + `modify_roll_advantage` (disadvantage on STR checks and STR saves)
- Concentration: none (explicitly waived by item text)

The "no Concentration required" rider is notable — it makes the item more valuable than the spell because it frees the caster's concentration slot. This is an item-level property modifier on the duration that the surface would want to track (`requiresConcentration: false` override vs. the base spell's `concentration` duration kind).
