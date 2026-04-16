# Proposal: magic_item_potion_of_animal_friendship

## Outcome: `structural_widening`

## Blocking Gap

`UnitRecord` in `src/surface/types.ts` is:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord`. The v4 taxonomy lists `magic_item_root` as a valid source atom, but the surface type layer has never been extended to include a corresponding record kind. No Dhall or JSON was authored because the kind does not exist to typecheck against.

## Required Widenings

### 1. `MagicItemRecord` (structural — new kind)

A new top-level record type is needed:

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly mechanics: MagicItemMechanics;
};
```

`UnitRecord` becomes `SpellRecord | ClassFeatureRecord | MasteryRecord | MagicItemRecord`.

### 2. `stored_spell_grant` payload family (structural — new family)

The potion's core mechanic is: drinking (consuming) the item lets the drinker cast a specific spell at a fixed level. This does not fit any of the existing spell/class-feature/mastery families. A new family is needed:

```
stored_spell_grant:
  - spellId: string           — which spell
  - fixedLevel: SpellLevel    — the locked slot level (3 for this potion)
  - activation: "consume_item" | "expend_charge"
  - dc: DcSource | FixedDc    — see §3 below
```

The tracer would emit: `magic_item_root → activate (consume_item) → stored_spell → save_gate (DC 13)`.

### 3. `fixed_dc` variant on `DcSource` (surface widening)

The potion specifies DC 13 explicitly — not derived from any caster. Existing `DcSource`:

```typescript
export type DcSource =
  | { readonly kind: "caster_spell_save_dc" }
  | { readonly kind: "weapon_attack_dc"; readonly base: number };
```

A new variant is needed:

```typescript
| { readonly kind: "fixed"; readonly value: number }
```

This is also needed for future potions/scrolls/wands that hard-code a DC.

### 4. `consume_item` activation cost (surface widening)

`ClassFeatureActivationCost` has `free` and `bonus_action`. Magic items activated by consumption need:

```typescript
| { readonly kind: "consume_item" }
```

This maps to the `charge` resource atom in v4 (single charge, item destroyed on use).

## v4 Atom Coverage

The v4 taxonomy already has everything needed at the atom level:
- `magic_item_root` (source)
- `activate` (procedure)
- `charge` (resource — one use, item destroyed)
- `stored_spell` (attachment, if needed) or `target` + existing atoms
- `save_gate` (resolution)
- `apply_condition` / other effect atoms as appropriate for Animal Friendship

The gap is entirely in the **surface type layer**, not in the atom inventory.

## Animal Friendship Spell Mechanics (for reference)

Animal Friendship (level 1 base, this item casts at level 3) is a WIS save spell that causes the targeted Beast to be Charmed if it fails. At level 3, it affects 3 targets (1 additional target per slot above 1). DC 13 is fixed regardless of any caster stat. Duration: 24 hours (timed, not concentration in 5.2.1). This is a multi-target `activation` + `save_gate` → `apply_condition (charmed)` shape — all expressible in existing atoms once the item family exists.
