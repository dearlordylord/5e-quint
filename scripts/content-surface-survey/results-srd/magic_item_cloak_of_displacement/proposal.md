# Proposal: Cloak of Displacement — structural_widening

## Unit

**Cloak of Displacement** — Wondrous Item, Rare (Requires Attunement)  
Provenance: SRD 5.2.1, Magic-Items/Items-A-H § Cloak of Displacement

## Rule text

> While you wear this cloak, it magically projects an illusion that makes you appear to be standing in a place near your actual location, causing any creature to have Disadvantage on attack rolls against you. If you take damage, the property ceases to function until the start of your next turn. This property is suppressed while your Speed is 0.

## Why this unit cannot be encoded

### Gap 1 — No `magic_item` kind in `UnitRecord` (structural)

`UnitRecord` is currently:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord`. The taxonomy has a `magic_item_root` source atom and an `attune` procedure atom, but neither the record type nor any mechanics family for magic items is defined in `types.ts`. This is the primary blocker: the unit cannot be expressed in the authored surface at all.

### Gap 2 — No passive-wear mechanics family (structural)

The cloak's effect is always active while worn and attuned. It has no casting time, no spell slot, no activation cost, and no use-count resource. The existing mechanics families are:

| Family | Fits? |
|---|---|
| `ongoing_effect` (spell) | No — requires `SpellMechanicsHeader` (level, school, castingTime, …) |
| `activation` (spell) | No — same header requirement |
| `triggered_reaction` (spell) | No |
| `anchored_trigger` (spell) | No |
| `activation` (class feature) | No — requires `ClassFeatureMechanicsHeader` (activationCost, resource, resetCadence) |
| `on_hit_trigger` (mastery) | No — weapon-mastery rider only |

A `passive_property` family (or equivalent) is needed for items whose effect is always active while equipped. Candidate header fields: attunement requirement (boolean), item type, suppression conditions.

### Gap 3 — No `on_damage_taken_window` atom (atom widening)

The displacement property is suppressed until the bearer's next turn start if they take damage. This requires a window that opens when the bearer receives damage. The v4 window inventory provides `on_hit_window` (the attacker's side) but nothing that fires on the defender's side when they take damage. A new `on_damage_taken_window` atom is needed to drive the `suppress` → `restore` subgraph.

Proposed subgraph shape:

```
passive_property
  --grants--> modify_roll_advantage (disadvantage, incoming attack rolls)
  --suppressed_by--> on_damage_taken_window
    --grants--> suppress (property)
      --persists_until--> turn_start_window (bearer)
        --grants--> restore (property)
```

### Gap 4 — No condition-gate atom for Speed = 0 (surface widening)

The cloak is additionally suppressed whenever the bearer's Speed is 0. This is a continuous runtime-state predicate (not an event trigger). None of the existing window or resource atoms represent "currently in state where Speed = 0." A `condition_gate` or `state_predicate` variant is needed to model this suppression condition.

### Gap 5 — Attachment direction for incoming-attack disadvantage (surface widening)

The `modify_roll_advantage` effect in the current schema applies advantage/disadvantage to rolls made *by* the bearer (outgoing). The cloak's effect targets rolls made *against* the bearer (incoming — i.e., every attacker's attack roll has disadvantage while targeting the cloaked creature). The attachment grammar has no "self as target" direction. The surface would need either:

- A new attachment variant `self_as_target` (the effect modifies rolls against self), or
- A separate surface type for incoming-roll modifiers.

## Required widenings (prioritized)

| Priority | Kind | Name | Blocking? |
|---|---|---|---|
| 1 | `new_subgraph` | `MagicItemRecord` + `passive_property` family | Yes — primary structural gap |
| 2 | `new_atom` | `on_damage_taken_window` | Yes — suppression trigger |
| 3 | `new_variant` | Condition-gate for Speed = 0 | Yes — suppression gate |
| 4 | `new_variant` | `modify_roll_advantage` on incoming attacks | Yes — core effect direction |

All four are needed before this unit can be encoded honestly. Gap 1 alone is sufficient to block encoding.
