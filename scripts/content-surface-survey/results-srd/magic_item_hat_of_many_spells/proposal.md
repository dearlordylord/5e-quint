# Proposal: Hat of Many Spells — Structural Widening

## Outcome

`structural_widening` — No `magic_item` kind or mechanics family exists in `UnitRecord`. The unit cannot be honestly encoded in any current form.

---

## Primary Blocker: Missing `magic_item` Kind

`UnitRecord` in `types.ts` is:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord`. The v4 taxonomy defines `magic_item_root` as a source atom, and the survey list contains dozens of magic item slugs, but the surface layer has never been widened to accommodate them. Any attempt to encode this item in the current surface would require fabricating a fake record shape (e.g., misrepresenting it as a class feature), which would produce a dishonest trace.

### Required: `MagicItemRecord`

Minimum shape:

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly rarity: MagicItemRarity;           // new type
  readonly requiresAttunement: false | string; // false = no attunement; string = restriction text
  readonly mechanics: MagicItemMechanics;
};
```

This also requires at least one `MagicItemMechanics` family and a `magic_item_root` tracer path.

---

## Secondary Blocker: Ability Check Gate

The "Unknown Spell" property is activated by expending a spell slot, then making an **Intelligence (Arcana) ability check** (DC = 10 + spell level). This is not a saving throw — it is an ability check with a variable DC rooted in the caster's own decision (spell level chosen).

The `ability_check` atom exists in v4 taxonomy but there is no surface variant in `ActivationPhase` for it. A new phase variant is needed:

```typescript
| {
    readonly kind: "ability_check";
    readonly skill: string;            // "arcana", "athletics", etc.
    readonly ability: Ability;
    readonly dc: DcSource;             // needs new variant: "spell_level_plus_flat"
    readonly onSuccess: Effect;
    readonly onFailure: Effect;
  }
```

The DC formula `10 + spell's level` requires a new `DcSource` variant since the DC is not a fixed number but depends on the slot expended:

```typescript
| { readonly kind: "spell_level_plus_flat"; readonly flat: number }
```

---

## Secondary Blocker: Grant Spell Access (Runtime-Selected)

On a successful check, the caster "casts the spell." The spell is chosen at activation time from the Wizard spell list, must be of a castable level, and is unknown to the caster. This is a runtime-determined `grant_spell_access` effect — the specific spell is not declared in the item's authoring.

The `grant_spell_access` atom exists in v4 but is absent from `ClassFeatureEffect` and no magic item effect union exists yet. A surface variant is needed for "cast any spell from [list] at [slot level], chosen at activation time."

---

## Secondary Blocker: Random Failure Table (d100 Dispatch)

On a failed ability check, a d100 table fires with 10 outcome bands. Several bands nest further sub-tables (d10 for random spell, d4 for random object or creature). The full outcome space includes:

| Band | Outcome category |
|------|-----------------|
| 01–50 | Cast a random spell (d10 sub-table: 10 specific spells) |
| 51–55 | Apply Stunned condition until end of next turn |
| 56–60 | Summon harmless butterfly swarm (10-ft cube, 1 min) |
| 61–65 | Pull nonmagical object from hat (d4: acid vial, alchemist's fire, crowbar, torch) |
| 66–70 | Apply Poisoned condition for 1 hour |
| 71–75 | Apply Petrified condition until end of next turn |
| 76–80 | Pull nonmagical object from hat (d4: dagger, rope+hook, caltrops, gem) |
| 81–85 | Summon hostile creature for 1 hour (d4: camel, constrictor snake, elephant, mule) |
| 86–90 | Hostile Swarm of Bats attacks wielder |
| 91–95 | Portal to another plane (GM determines destination) |
| 96–00 | Pull magic item of random rarity (d6 rarity, GM chooses item) |

This requires a **new `random_outcome_table` subgraph** — a stochastic dispatch atom that maps a die roll to outcome bands, each band containing its own effect (which may itself nest a sub-table).

Individual outcome atoms that already exist in v4: `apply_condition`, `create_companion` (for summoned creatures), `create_object`. Outcomes that are `dm_agenda`: portal destination (91–95), magic item selection (96–00). The dispatch mechanism itself is core mechanics regardless of what the outcomes are.

No surface type currently models stochastic dispatch. A minimal shape:

```typescript
export type RandomOutcomeTable = {
  readonly kind: "random_outcome_table";
  readonly die: number;   // d100, d10, d4, etc.
  readonly bands: ReadonlyArray<{
    readonly low: number;
    readonly high: number;
    readonly effect: Effect | "dm_agenda" | RandomOutcomeTable;  // nested sub-table
  }>;
};
```

---

## Tertiary Gap: Spellcasting Focus Property

The hat can be used as a Spellcasting Focus for Wizard spells. This is a passive item property — it grants the item the `item` attachment role for spellcasting. No existing family models passive item-as-focus grants. This would require a `passive_property` family or equivalent, or could be modeled as a metadata flag on `MagicItemRecord` once that type exists.

---

## What Does Fit

- **Use-count + Short/Long rest reset** for the Unknown Spell property: `use_count` with `kind: "fixed", uses: 1` and `resetCadence: { kind: "short_or_long_rest" }` — this is directly expressible once a `MagicItemMechanics` family exists.
- **Spell slot consumption**: `spell_slot` resource consumed at activation — fits existing vocabulary.
- **Several individual failure outcomes**: `apply_condition` (Stunned, Poisoned, Petrified), `create_companion` (summoned creatures), `create_object` (pulled items) all have v4 atoms.

---

## Widening Priority Assessment

1. **`MagicItemRecord` + `MagicItemMechanics`** — gates all magic item encoding; highest priority.
2. **`ability_check` ActivationPhase variant** — needed for Hat of Many Spells, Wand of Wonder, many check-gated items.
3. **`random_outcome_table`** — needed for Hat of Many Spells, Wand of Wonder, Bag of Tricks, Deck of Many Things-class items; complex but structurally important for this whole category.
4. **`grant_spell_access` runtime effect** — needed for Hat of Many Spells, Necklace of Prayer Beads, Ring of Spell Storing, Staff of the Magi, etc.
