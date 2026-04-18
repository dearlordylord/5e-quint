# Proposal: Widening for Headband of Intellect

## Outcome: `structural_widening`

The Headband of Intellect cannot be honestly encoded. Three gaps must be closed before any magic item of this pattern can be authored.

---

## Gap 1 — Missing `MagicItemRecord` kind (structural)

`UnitRecord` in `types.ts` is:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `magic_item` kind. The v4 taxonomy lists `magic_item_root` as a source atom, and `attune` / `attunement_slot` as procedure/resource atoms, but no corresponding record type or mechanics family exists in the surface. A `MagicItemRecord` and at least one `MagicItemMechanics` family would need to be added.

Minimal shape (for passive-while-attuned items like this one):

```typescript
export type MagicItemPassiveMechanics = {
  readonly family: "passive_while_attuned";
  readonly effects: ReadonlyArray<MagicItemEffect>;
};

export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;
};
```

---

## Gap 2 — Missing `modify_ability_score` effect atom (atom-level, out-of-scope)

The headband's sole effect is: while worn and attuned, the wearer's Intelligence becomes 19. This is a passive ability-score override — not covered by any existing effect atom.

TAXONOMY v4 §12 explicitly records this as out-of-scope:

> `modify_ability_score` as a runtime effect versus as pre-runtime character state (currently treated as out-of-scope)

This atom would be required to encode the Headband of Intellect and the full family of ability-score items (Belt of Giant Strength variants, Amulet of Health, Gauntlets of Ogre Power, etc.).

Proposed atom:

```
modify_ability_score
  ability: Ability          // "int", "str", "con", etc.
  mode: "set" | "add"       // set → value replaces score; add → value adds to score
  value: number
```

The no-op guard ("no effect if INT ≥ 19 without it") is a comparison predicate on the pre-item score vs. the set value — this is a filter condition on the effect, also unrepresented.

---

## Gap 3 — Attunement lifecycle (surface variant, partially supported)

The v4 taxonomy has `attunement_slot` (resource) and `attune` (procedure), but the surface has no type for the attunement lifecycle: equip + attune session → effect becomes active; break attunement / unequip → effect becomes inactive. The `passive_while_attuned` family above implicitly encodes this, but the lifecycle nodes (attune procedure, persist while attuned, expire on break) would need tracer support.

---

## Pressure class

This unit is the lightest possible magic item: one passive effect, one conditional no-op guard, attunement. The three gaps above will recur for the overwhelming majority of magic items in the SRD catalog. Closing them is prerequisite to encoding any magic item.
