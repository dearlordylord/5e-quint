# Proposal: Dragon Scale Mail — Surface Widening

## Summary

Dragon Scale Mail encodes as a `magic_item` collection record (10 variants, one per dragon color) with `composite` mechanics: a `passive` part for always-on grants and an `activation` part for the once-per-dawn detection ability. Three of the four mechanics fit the current surface cleanly. Two gaps block honest encoding.

## What Fits

- **+1 AC** — `modify_ac` with `{ kind: "fixed_dice", dice: 1, dieSize: 1, sign: "+" }` under `condition: { kind: "wearing_item" }`. Clean.
- **Resistance to one damage type** — `grant_resistance` with a fixed `DamageType` per variant. The collection structure (one variant per dragon color/type, each with its mapped resistance from the table) fits the existing `MagicItemRecord` variants shape. Clean.
- **Reset cadence** — `{ kind: "dawn" }` for the once-per-dawn detection ability. Clean.
- **Composite mechanics structure** — `CompositeMagicItemMechanics` with passive + activated parts. Exists.

## Gap 1: SavingThrowSourceFilter — Breath Weapon Narrowing

**SRD text:** "you have Advantage on saving throws against the breath weapons of Dragons"

The `modify_roll_advantage` atom has two existing mechanisms for narrowing saving-throw advantage:
- `attackerTypeFilter?: ReadonlyNonEmptyArray<CreatureType>` — narrows to saves against attacks made BY a creature of listed types.
- `saveSourceFilter?: SavingThrowSourceFilter` — currently only `{ kind: "spell_or_other_magical_effect" }`.

Neither fits. `attackerTypeFilter: ["dragon"]` would grant advantage on **all** saving throws against dragons (including their weapon attacks, special actions, etc.), which is too broad. Breath weapons are not spells or magical effects, so `saveSourceFilter.spell_or_other_magical_effect` also doesn't apply.

**Proposed widening:** Add a new `SavingThrowSourceFilter` variant:

```typescript
type SavingThrowSourceFilter =
  | { readonly kind: "spell_or_other_magical_effect" }
  | {
      readonly kind: "creature_breath_weapon";
      readonly creatureType?: CreatureType; // optional: only when triggered by specific creature type
    };
```

This would author as:

```json
{
  "kind": "modify_roll_advantage",
  "mode": "advantage",
  "on": ["saving_throw"],
  "saveSourceFilter": { "kind": "creature_breath_weapon", "creatureType": "dragon" }
}
```

**Scope:** This is a `surface_widening` — the `modify_roll_advantage` atom and `saving_throw` roll kind both exist in v4; only the source-filter variant is missing.

## Gap 2: detect Property — Creature-Type Detection

**SRD text:** "you can focus your senses as a Magic action to discern the distance and direction to the closest dragon within 30 miles of yourself that is of the same type as the armor"

The existing `detect` atom has:
```typescript
{ kind: "detect"; property: "magic" | "evil_and_good" | "poison_and_disease" | "thoughts"; radiusFeet: number }
```

Two issues:
1. No property variant covers "creature of specific type." The detection is a directional scan for a specific creature type (same type as the armor), returning both distance and direction — not an aura-style presence detection.
2. The range is 30 miles. Using `radiusFeet: 158400` would be technically parseable but semantically wrong. The surface may need a `rangeMiles` field or a `range` with unit.

**Proposed widening:** Add a new `detect` property variant:

```typescript
readonly property:
  | "magic"
  | "evil_and_good"
  | "poison_and_disease"
  | "thoughts"
  | { readonly kind: "creature_of_type"; readonly creatureType: CreatureType };
```

And either extend `radiusFeet` to support miles, or add a parallel `rangeMiles` field on the `detect` atom for very long-range divination effects:

```typescript
| {
    readonly kind: "detect";
    readonly property: DetectProperty;
    readonly radiusFeet?: number;
    readonly rangeMiles?: number;
  }
```

This would author as:

```json
{
  "kind": "detect",
  "property": { "kind": "creature_of_type", "creatureType": "dragon" },
  "rangeMiles": 30
}
```

**Scope:** This is a `surface_widening` — the `detect` atom structure exists; the property and range unit variants are missing.

## Intended Full Encoding (for reference)

Once both gaps are filled, the item would encode as a collection record:

```
MagicItemRecord (collection)
├── id: "dragon_scale_mail"
├── defaultAttunement: { requiresAttunement: true }
└── variants: [
    { id: "dragon_scale_mail_black", name: "Dragon Scale Mail (Black Dragon)", rarity: "very_rare",
      mechanics: composite [
        passive (condition: wearing_item) grants: [
          modify_ac +1,
          modify_roll_advantage (saving_throw, advantage, saveSourceFilter: creature_breath_weapon/dragon),
          grant_resistance (acid)
        ],
        activation (standard_action: magic, use_count 1, reset: dawn) phases: [
          direct → detect (creature_of_type: dragon, rangeMiles: 30)
        ]
      ]
    },
    { id: "dragon_scale_mail_blue", … grant_resistance(lightning) … },
    … (10 variants total per the table)
  ]
```

## Classification

**`surface_widening`** — Both blocking gaps are missing variants of existing surface types (`SavingThrowSourceFilter` and `detect.property`). No new v4 atoms are required; the v4 `detect` and `modify_roll_advantage` atoms already exist in the taxonomy.
