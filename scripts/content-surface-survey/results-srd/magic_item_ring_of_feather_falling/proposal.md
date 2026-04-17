# Proposal: Ring of Feather Falling

**Outcome:** `atom_widening`

## Unit

> When you fall while wearing this ring, you descend 60 feet per round and take no damage from falling.

The record shape fits cleanly: `MagicItemRecord`, `PassiveMechanics`, rarity `rare`, `requiresAttunement: true`. The two mechanics are the problem.

---

## Gap 1 — Fall speed (new variant of existing atom)

**Needed:** A way to set the wearer's falling speed to 60 ft/round.

**Why existing atoms don't work:**

- `grant_speed { speedKind: "fly" | "swim" | "climb" | "burrow", feet }` — the speedKind enum doesn't include `"fall"`. Falling is a distinct movement mode in 5e: it is involuntary, governed by gravity, not tied to the creature's own movement, and adjudicated separately from walking/flying speed.
- `set_speed { feet }` — sets Walking Speed only.
- `modify_speed { delta, unit }` — also Walking Speed only.
- `set_speed_ratio` — multiplicative on Walking Speed.

**Proposed widening:**

```typescript
// in grant_speed.speedKind:
readonly speedKind: "fly" | "swim" | "climb" | "burrow" | "fall";
```

Feather Falling sets fall speed to 60 ft/round; a fixed `feet` value on `grant_speed` with `speedKind: "fall"` models this honestly. The `LinkedSpeed` union does not need widening for this case.

**Alternative:** A dedicated `set_fall_speed { feetPerRound: number }` atom, if fall speed semantics are sufficiently distinct from the grant_speed subgraph (e.g., it overrides rather than adds). Either approach works; widening the existing enum is narrower.

---

## Gap 2 — Fall damage immunity (new atom)

**Needed:** Immunity to damage specifically from the falling source.

**Why existing atoms don't work:**

- `grant_damage_immunity { damageType: "bludgeoning" }` — fall damage is bludgeoning per RAW, but this atom grants immunity to ALL bludgeoning (attacks, area effects, weapon hits). Using it here would be dishonestly broad.
- `grant_resistance { damageType: "bludgeoning" }` — same problem, and resistance (half damage) is weaker than immunity anyway.
- No source-filtered damage immunity variant exists.

**Proposed widening (option A — new atom):**

```typescript
| {
    readonly kind: "grant_fall_damage_immunity";
  }
```

Single-purpose, zero parameters needed. Traces to the v4 effect atom inventory as a peer of `grant_damage_immunity`.

**Proposed widening (option B — source filter on grant_damage_immunity):**

```typescript
| {
    readonly kind: "grant_damage_immunity";
    readonly damageType: DamageType;
    readonly sourceFilter?: "fall_only";   // new optional field
  }
```

More compositional but adds conditional logic to an otherwise simple atom. The `sourceFilter` vocabulary is thin (only `"fall_only"` is pressured so far) — a dedicated atom is more conservative.

Option A is recommended.

---

## Encoding (once atoms land)

```dhall
{ kind = "magic_item"
, id = "magic_item_ring_of_feather_falling"
, name = "Ring of Feather Falling"
, rarity = "rare"
, requiresAttunement = True
, provenance = { kind = "srd-5.2.1", section = "MagicItems#Ring of Feather Falling" }
, description = "When you fall while wearing this ring, you descend 60 feet per round and take no damage from falling."
, mechanics =
    { family = "passive"
    , grants =
        [ { kind = "grant_speed", speedKind = "fall", feet = 60 }      -- Gap 1
        , { kind = "grant_fall_damage_immunity" }                       -- Gap 2
        ]
    }
, destruction = { kind = "none" }
}
```

Both grants are unconditional (no `EquipmentPredicate` gate needed — the ring is always worn when attuned).
