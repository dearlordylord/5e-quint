# Proposal: `DamageTypeRef` widening for GM-determined damage type

## Unit

`magic_item_potion_of_resistance` — Potion, Uncommon

## Gap

`DamageTypeRef` is currently:

```typescript
export type DamageTypeRef = DamageType | CastTimeChoice<DamageType>;
```

`CastTimeChoice<T>` is defined as "Caster picks one at cast/build time from a closed list." The Potion of Resistance uses a **GM-determined** damage type — the player has no agency over which type is granted:

> "The GM chooses the type or determines it randomly by rolling on the following table."

This is meaningfully different from `CastTimeChoice`:
- `CastTimeChoice` → player/caster chooses from options
- Potion of Resistance → GM decides (by choice or d10 random roll)

Encoding this as `CastTimeChoice` would be dishonest: the surface would imply player agency where none exists.

## Unit encoding (all other fields fit)

The full unit would encode as:

```
MagicItemRecord {
  kind: "magic_item"
  rarity: "uncommon"
  requiresAttunement: false
  destruction: { kind: "permanent_on_empty" }
  mechanics: ActivatedAbilityMechanics {
    family: "activation"
    activationCost: { kind: "action" }
    resource: { kind: "use_count", cap: { kind: "fixed", uses: 1 } }
    resetCadence: { kind: "never" }
    duration: { kind: "timed", value: { unit: "hour", amount: 1 } }
    phases: [
      {
        kind: "direct"
        attachment: { kind: "self" }
        effects: [
          {
            kind: "grant_resistance"
            damageType: <GM_DETERMINED>   ← gap
          }
        ]
      }
    ]
  }
}
```

## Proposed widening

Add a new variant to `DamageTypeRef`:

```typescript
export type DamageTypeRef =
  | DamageType
  | CastTimeChoice<DamageType>
  | {
      readonly kind: "gm_determined_table";
      readonly options: ReadonlyNonEmptyArray<DamageType>;
    };
```

### Semantics

- `options` lists all damage types reachable from the table (the closed set).
- The actual selection is DM agenda — the surface records only that the set is closed and what it contains.
- The tracer emits a `grant_resistance` node labeled with the table contents, without implying player choice.

### SRD evidence

The d10 table covers exactly 10 damage types: Acid, Cold, Fire, Force, Lightning, Necrotic, Poison, Psychic, Radiant, Thunder. These are all members of the existing `DamageType` union — no new damage types are required.

## Classification

`surface_widening` — new variant of existing surface type `DamageTypeRef`. No new v4 taxonomy atom is required; the `grant_resistance` atom already exists and handles the effect once the damage type reference is expressible.

## Downstream impact

Any future magic item or spell effect where the damage type is randomly determined (rather than player-chosen) would use this variant. In the SRD corpus, this is the first such case observed, but the random-table damage-type idiom is common enough in published D&D content to justify closure at the type level.
