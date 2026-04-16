# Proposal: Goodberry — structural_widening

## Unit

**Goodberry** — Level 1 Transmutation spell (SRD 5.2.1)

> Ten berries appear in your hand and are infused with magic for the duration. A creature can take a Bonus Action to eat one berry. Eating a berry restores 1 Hit Point, and the berry provides enough nourishment to sustain a creature for one day. Uneaten berries disappear when the spell ends.

Header: Action | Touch | V S M (sprig of mistletoe) | 24 hours (timed, not concentration)

## Why no existing family applies

### `ongoing_effect` — hard blocked by operation type

`OngoingOperation = RollModifierOperation | DamageOnHitOperation`. The per-berry effect is `heal_hp`. There is no heal variant in `OngoingOperation`.

Even if the operation type were widened, the attachment model would still fail: `ongoing_effect` attaches to a target/area/mark at cast time. Goodberry's items are handed out later to any creature — the "attachment" is to the item holder, not to a creature chosen at cast time.

### `activation` — wrong temporal shape

`activation` models instantaneous one-shot effects (possibly multi-phase). Goodberry has a 24-hour timed duration with 10 independently-triggered sub-effects, one per berry consumed.

### `triggered_reaction` — not a reaction spell

N/A.

### `anchored_trigger` — location-bound, not item-bound

`anchored_trigger` plants a trigger on a location or area (Alarm pattern). Goodberry's berries are portable consumable items held by creatures. Location-binding does not model item-in-hand.

## Missing subgraph: consumable-object pool

The core pattern Goodberry requires does not exist in v4:

```
spell_root
  → activate (caster pays action_quota + spell_slot)
  → create_object_pool (10 berries, timed: 24h)
     each berry:
       → [any holder] pays bonus_action_quota
       → heal_hp (1 HP, target: consumer)
  → expire (timed: 24h, or when all berries consumed)
```

Key structural differences from all existing families:

1. **Created objects, not creature/location attachment** — The spell produces items that exist independently and can be picked up, distributed, and consumed by any creature. No `Attachment` kind models this.

2. **Consumer pays their own quota** — The activating creature (the one eating the berry) expends their Bonus Action. All existing quota nodes represent the *caster's* action economy. This is a different actor.

3. **Heal as an ongoing-spell operation** — `OngoingOperation` has no heal variant. The v4 taxonomy includes `heal` as an effect atom, but the surface types have not exposed it in a path that a timed spell can reach.

4. **N independent uses depleting a pool** — The 10-berry count is a finite shared pool where each berry is consumed once. This is distinct from `use_count` on a class feature (which is a single resource that refills on rest) and from `charge` (which is an item-level resource). It is closer to "N single-use objects created at cast time."

## Proposed widening (minimum to encode Goodberry)

### 1. New `Attachment` variant: `consumable_pool`

```typescript
| {
    readonly kind: "consumable_pool";
    readonly count: number;           // 10 berries
    readonly activationCost: { readonly kind: "bonus_action" };  // paid by holder
    readonly activatingActor: "holder";   // not caster
  }
```

Or more generally, a new attachment axis for "created items held by creatures."

### 2. New `OngoingOperation` variant: `heal_on_activate`

```typescript
| {
    readonly kind: "heal_on_activate";
    readonly amount: DiceAmount;      // fixed 1 HP
    readonly target: "activating_actor";   // the creature eating the berry
  }
```

### 3. Quota model must support `activating_actor` as the quota source

The existing tracer always emits a `bonus_action_quota` node wired to the caster's procedure. A "holder-pays" model requires either:
- A flag on the quota node indicating which actor pays, or
- A new relation type `actor_consumes` distinct from the caster-pays `consumes`.

## Scope of widening

This widening is **not cosmetic**. The "create consumable objects with per-use effects activated by any holder" pattern appears in at least:

- **Goodberry** (1 HP heal per berry, 10 berries)
- **Tasha's Bubbling Cauldron** (XPHB; creates an elixir with randomized effects)
- **Heroes' Feast** (creates a meal; effects on consuming creatures; more complex rider)
- **Create Food and Water** (creates food/water; no per-item mechanical effect — might omit)

The pattern warrants a proper subgraph in v4 before encoding these units. The nourishment/survival effect on Goodberry is DM-agenda and would be excluded from core mechanics regardless.

## Classification

`structural_widening` — no existing `SpellMechanics` family can model the "create N consumable objects, each activatable by any holder at the holder's action cost, each triggering a heal on the consumer" pattern without dishonesty.
