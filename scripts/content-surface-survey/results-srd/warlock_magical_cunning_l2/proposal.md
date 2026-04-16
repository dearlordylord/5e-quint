# Proposal: surface widening for Magical Cunning (warlock L2)

## Unit

**Name:** Magical Cunning (Warlock L2)  
**Kind:** `class_feature`  
**Provenance:** `srd-5.2.1`, section `Classes/Warlock#Level 2: Magical Cunning`

## Source text

> You can perform an esoteric rite for 1 minute. At the end of it, you regain expended Pact Magic spell slots but no more than a number equal to half your maximum (round up). Once you use this feature, you can't do so again until you finish a Long Rest.

## Outcome: `surface_widening`

The `activation` class-feature family is the right family. The unit has a use-count resource (1 use), a long-rest reset cadence, and a single one-shot effect. Two surface gaps prevent honest encoding.

---

## Gap 1 — `ClassFeatureActivationCost` missing a `minutes` variant

### Current type

```typescript
export type ClassFeatureActivationCost =
  | { readonly kind: "free" }
  | { readonly kind: "bonus_action" };
```

### Problem

The rite takes **1 minute** to perform. This is neither free nor a bonus action — it is a real out-of-combat time cost that locks the warlock into the rite for its duration. Encoding it as `"free"` would be dishonest.

### Proposed addition

```typescript
| { readonly kind: "minutes"; readonly amount: number }
```

### v4 atom backing

No new atom is needed. A `minutes` activation cost is a variant of the existing `action_quota` resource model — it consumes the caster's time rather than an in-combat economy slot. The tracer would emit an `action_quota`-family node labeled with the duration.

---

## Gap 2 — `ClassFeatureEffect` missing a slot-refill variant

### Current type

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

### Problem

The effect is: **regain expended Pact Magic spell slots, capped at ⌈max/2⌉**. This is a resource-refill operation. Neither `grant_extra_action` nor `heal_hp` represents this honestly.

### Proposed addition

```typescript
export type RefillSpellSlotsEffect = {
  readonly kind: "refill_spell_slots";
  readonly pool: "pact_magic" | "standard";
  readonly cap: "half_max_round_up" | { readonly kind: "fixed"; readonly uses: number };
};
```

The `pool` discriminator is required because Pact Magic slots (short-rest-recharging, limited count, uniform level) are a distinct pool from standard spell slots. Collapsing them would misrepresent the rule.

### v4 atom backing

No new atom is needed. The v4 taxonomy already has:
- `refund` — procedure atom for returning consumed resources
- `spell_slot` — resource atom

The tracer would emit a `refund` node that targets the `spell_slot` resource, with the pool and cap encoded in the node label.

---

## Secondary modeling note — Pact Magic pool identity

Warlock Pact Magic slots have a distinct identity from standard spell slots: they recharge on a short rest (normally), are always cast at their highest available level, and occupy a separate pool. Magical Cunning is the warlock's mid-rest recovery for this specific pool.

A `pool` field on the new effect variant is the minimum required to prevent the surface from representing a state where Magical Cunning appears to refill wizard spell slots. The surface should make this irrepresentable at the type level.

---

## Classification rationale

Both gaps are **new variants of existing surface types** (`ClassFeatureActivationCost` and `ClassFeatureEffect`). No new v4 atom category is needed — `refund` and `spell_slot` already exist in the taxonomy. Classification is therefore `surface_widening`, not `atom_widening`.
