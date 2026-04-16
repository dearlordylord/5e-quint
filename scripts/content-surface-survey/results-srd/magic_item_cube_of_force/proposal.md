# Proposal: Widenings Required for Cube of Force

**Unit:** Cube of Force (`magic_item_cube_of_force`)  
**Outcome:** `structural_widening`

---

## Why this unit cannot be encoded

`UnitRecord` is currently `SpellRecord | ClassFeatureRecord | MasteryRecord`. There is no `magic_item` kind. The Cube of Force cannot be placed into any existing record type without lying about its kind.

Beyond the missing record type, three additional surface/atom widenings are needed.

---

## Required widenings

### 1. `MagicItemRecord` — new structural kind (blocking)

A new top-level record type is needed, parallel to `SpellRecord` and `ClassFeatureRecord`:

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly rarity: "common" | "uncommon" | "rare" | "very_rare" | "legendary" | "artifact";
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;
};
```

`UnitRecord` would need to extend to include `MagicItemRecord`.

The v4 taxonomy already lists `magic_item_root` as a source atom (§1), confirming this was anticipated.

---

### 2. `charge_pool_dispatcher` family — new mechanics family (blocking)

The Cube of Force works as follows:

1. The item holds a **shared charge pool** (max 10, current charges vary).
2. On activation, the user selects one of six **faces**; each face maps to a specific spell and has a fixed charge cost (1–5 charges).
3. The selected spell is cast at a **fixed save DC of 17** (not the user's spell save DC).

No existing family models this:

- It is not `ongoing_effect` (no persistent operation on an attachment).
- It is not `activation` (no phases; the spell cast is selected from a menu, not a fixed sequence).
- It is not `triggered_reaction` (not a reaction; initiated on the user's turn).
- It is not `anchored_trigger` (no planted trigger released by a later event).

A new family is needed — tentatively `charge_gated_spell_dispatch`:

```typescript
export type ChargeGatedSpellDispatchMechanics = {
  readonly family: "charge_gated_spell_dispatch";
  readonly chargePool: ChargePoolResource;       // see widening 3
  readonly options: ReadonlyArray<{
    readonly spellId: string;
    readonly chargeCost: number;
    readonly dc: DcSource;                       // see widening 4
  }>;
};
```

---

### 3. `ChargePoolResource` with dice-based daily recharge — new resource shape

`UseCountResource` models a use-count pool with rest-based reset. The Cube of Force uses:

- A **charge pool** (integer, 0–10)
- Partial recharge of **1d6 charges daily at dawn** (not a rest event, not a fixed count)

This requires:

```typescript
export type ChargePoolResource = {
  readonly kind: "charge_pool";
  readonly maxCharges: number;
  readonly recharge: {
    readonly cadence: "daily_at_dawn";
    readonly amount: DiceExpr;    // e.g. { dice: 1, dieSize: 6 }
  };
};
```

`RestResetCadence` cannot express this: it covers short/long/partial-rest patterns only. A time-cadence recharge with a dice roll is structurally different.

---

### 4. `DcSource: { kind: "fixed"; value: number }` — new variant (surface widening)

Current `DcSource`:

```typescript
export type DcSource =
  | { readonly kind: "caster_spell_save_dc" }
  | { readonly kind: "weapon_attack_dc"; readonly base: number };
```

The Cube of Force specifies DC 17 regardless of the user's stats. A new variant is needed:

```typescript
| { readonly kind: "fixed"; readonly value: number }
```

This is the narrowest fix — it is a variant of an existing surface type, not a new atom.

---

## Classification summary

| Widening | Kind | Blocking? |
|---|---|---|
| `MagicItemRecord` top-level kind | `new_subgraph` | Yes |
| `charge_gated_spell_dispatch` family | `new_subgraph` | Yes |
| `ChargePoolResource` with dice daily recharge | `new_variant` | Yes |
| `DcSource: fixed` variant | `new_variant` | Secondary |

The primary classification is `structural_widening` because the record kind does not exist. The surface and atom widenings are secondary but also required before a clean trace is possible.

---

## Notes on tracer impact

Once `MagicItemRecord` and a new mechanics family exist, the tracer would need:
- A `traceMagicItemUnit` branch in `traceUnit`
- A `traceChargeGatedSpellDispatch` function
- Handling for `ChargePoolResource` in a new resource-tracing helper
- `DcSource: fixed` handling in `describeDc`

The v4 atom inventory already has `charge` (§7 Resource Atoms) and `magic_item_root` (§1 Source Atoms), so the taxonomy side is ready; only the surface types and tracer need updating.
