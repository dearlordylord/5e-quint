# Proposal: Widenings Required for Hammer of Thunderbolts

**Unit:** Hammer of Thunderbolts  
**Outcome:** `structural_widening`  
**Blocker:** No `MagicItemRecord` kind exists in `UnitRecord`

---

## Primary Gap — Missing Record Kind

`types.ts` defines:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord`. The v4 taxonomy lists `magic_item_root` as a source atom and the pipeline already schedules magic items for encoding, but no corresponding surface record shape, mechanics header, or payload family exists in the schema. Until this gap is closed, no magic item can be honestly encoded.

A `MagicItemRecord` would need at minimum:

- `kind: "magic_item"`
- `attunement: boolean` (or a richer shape describing conditions)
- `weaponType?: string` (or an enum for item subtypes)
- A `mechanics` field whose family union covers the item's activation shape

The Hammer specifically uses a charge-expenditure activation with a ranged weapon attack, making the closest analogy a `ClassFeatureActivationMechanics` extended with a `charge` resource and a `ranged_weapon_attack` activation phase — but neither the record kind nor the activation family for magic items exists.

---

## Secondary Gaps (each blocking independently)

### 1. `Condition: "stunned"` missing

The thunderclap save gate inflicts Stunned on a failed CON save. `types.ts` defines:

```typescript
export type Condition = "prone";
```

`"stunned"` is not representable. This is a `surface_widening` — a new variant of an existing type.

### 2. Dawn recharge cadence

The weapon regains `1d4 + 1` charges at dawn. No existing `RestResetCadence` variant covers:
- Time-of-day (dawn) rather than a rest event
- A dice-roll quantity rather than a fixed refill

A new cadence variant is needed, e.g.:

```typescript
| { readonly kind: "daily_at_dawn"; readonly refillAmount: DiceAmount }
```

This is a `surface_widening`.

### 3. Cross-item attunement gating

Giant's Bane only activates while the wielder is attuned to this weapon **and** is wearing either the Belt of Giant Strength or Gauntlets of Ogre Power (also attuned). This is a new compositional prerequisite shape — no mechanism in the surface can express "this feature is gated on a specific other attuned item being worn." This is at least `surface_widening`; arguably `structural_widening` given it requires a new gate predicate in the mechanics header.

### 4. `crit_window` — nat-20 on attack roll against creature type

Giants' Bane fires when the wielder rolls exactly 20 on the d20 for an attack against a Giant. This is mechanically distinct from `on_hit_window` (which fires on any hit regardless of roll value) and requires:
- A roll-value gate (`rolled_exactly == 20`) 
- A creature-type filter (`target.type == "Giant"`)

The v4 taxonomy's Known Remaining Weak Spots section notes `crit_window` as single-feat pressure, not yet promoted. This specific use case adds item-pressure to the same candidate. Classification: `atom_widening`.

### 5. `modify_ability_score` as runtime item effect

Might of Giants increases the Strength score bestowed by Belt/Gauntlets by 4, to a maximum of 30. The v4 taxonomy explicitly defers `modify_ability_score` as a runtime effect:

> `modify_ability_score` as a runtime effect versus as pre-runtime character state — currently treated as out-of-scope

This widening cannot be promoted here; it awaits the taxonomy owner's decision. Recording as pressure.

### 6. Thrown-and-returns mechanic (noted, not blocking on its own)

After the ranged throw hits or misses, the weapon flies back to the wielder's hand. This "return on end" behavior is a lifecycle atom (`return_on_end` exists in v4) but the trigger is "after the attack resolves" rather than "on end of spell/effect duration." The attachment would need a `weapon` attachment kind and the `return_on_end` lifecycle triggered by attack resolution. Lower priority than the above gaps but noted for completeness.

---

## Encoding Decision

**No `.dhall`, `.json`, or `.trace.md` produced.** The structural absence of `MagicItemRecord` makes any encoding dishonest. The five secondary gaps listed above would each independently require schema changes even with the record kind present.
