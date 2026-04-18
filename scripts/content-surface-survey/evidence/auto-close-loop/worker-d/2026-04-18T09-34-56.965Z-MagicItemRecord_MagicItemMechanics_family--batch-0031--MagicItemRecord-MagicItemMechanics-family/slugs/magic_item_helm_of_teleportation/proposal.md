# Proposal: Widening for `magic_item_helm_of_teleportation`

## Outcome: `structural_widening`

The Helm of Teleportation cannot be encoded in the current surface. The primary blocker is that `UnitRecord` in `types.ts` has no `magic_item` kind — there is no `MagicItemRecord` or `MagicItemMechanics` type. The v4 taxonomy lists `magic_item_root` as a valid source atom, but the surface type layer has not been extended to match.

Beyond the missing record type, four secondary gaps would block honest encoding even if the kind were added.

---

## Gap 1 — Missing `UnitRecord` kind: `magic_item` (structural)

**Blocker level:** Primary / structural.

`UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord`. A `MagicItemRecord` family is needed. The v4 taxonomy source atom `magic_item_root` gives the atom name; the surface needs a corresponding record type with an appropriate mechanics union.

**Minimum shape:**
```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;
};
```

---

## Gap 2 — Missing `RestResetCadence` variant: dawn/daily recharge (surface widening)

**Evidence:** "The helm regains 1d3 expended charges daily at dawn."

The existing `RestResetCadence` union covers only rest-based resets (`short_or_long_rest`, `long_rest`, `short_rest`, `partial_short_full_long`). Dawn recharge is a distinct, non-rest cadence that appears on many magic items. It requires a new variant, e.g.:

```typescript
| { readonly kind: "daily_at_dawn" }
```

---

## Gap 3 — Missing dice-roll charge refill (surface widening)

**Evidence:** "regains 1d3 expended charges daily at dawn"

The refill amount is a dice roll (`1d3`), not a fixed integer. `UseCountResource.cap` and all existing `RestResetCadence` refill amounts are fixed integers. A `DiceExpr`-typed refill shape is needed on the charge resource, separate from the cap.

Suggested extension to the charge resource type:
```typescript
export type ChargeResource = {
  readonly kind: "charge";
  readonly max: number;
  readonly recharge: {
    readonly cadence: RestResetCadence;  // extended with daily_at_dawn
    readonly amount: DiceExpr | number;  // dice or fixed
  };
};
```

---

## Gap 4 — Missing `attunement_slot` resource in surface (surface widening)

**Evidence:** "(Requires Attunement)" on the item header.

`attunement_slot` exists in the v4 taxonomy resource atoms but has no corresponding surface type in `types.ts`. Items that require attunement must bind to this resource at equip time. The tracer has no atom to emit for it.

---

## Gap 5 — Missing cast-from-item effect (surface + atom widening)

**Evidence:** "you can expend 1 charge to cast Teleport from it"

The item's core activation effect is casting a specific named spell by expending a charge. No `MagicItemEffect` or `ClassFeatureEffect` variant covers this. The v4 taxonomy has `stored_spell` attachment and `attune` procedure atoms, and `grant_spell_access` effect atom, but the surface types have no corresponding shape.

Minimum new effect variant:
```typescript
export type CastStoredSpellEffect = {
  readonly kind: "cast_stored_spell";
  readonly spellId: string;       // "teleport"
  readonly chargesConsumed: number;  // 1
};
```

This maps to a `stored_spell` attachment in the v4 graph with an `activate` procedure that `consumes` a `charge` resource and `grants` a spell activation.

---

## Recommended Widening Priority

| Gap | Kind | Blocking? |
|-----|------|-----------|
| Missing `magic_item` UnitRecord kind | `structural_widening` | Yes — nothing can be encoded without this |
| Missing `daily_at_dawn` cadence | `surface_widening` | Yes — needed for all dawn-recharge items |
| Missing dice refill on charge resource | `surface_widening` | Yes — 1d3 refill is unrepresentable |
| Missing `attunement_slot` surface type | `surface_widening` | Yes — attunement linkage has no surface anchor |
| Missing `cast_stored_spell` effect | `surface_widening` + `atom_widening` | Yes — item's core effect is unrepresentable |

All five gaps must be addressed together; the item is not partially encodable with omissions because the primary record type is missing entirely.
