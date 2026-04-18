# Proposal: Portable Hole — surface_widening

## Unit

**Portable Hole** — Magic Item, Rare (SRD 5.2.1, MagicItems#Portable Hole)

## Outcome

`surface_widening` — all required v4 atoms exist; the gaps are at the surface/family level.

## Why this unit cannot be encoded honestly

### 1. No toggle-activation family (primary blocker)

The Portable Hole has two activations that form a paired open/close toggle:

- **Open**: Magic action to unfold and place the cloth → creates an extradimensional hole 10 ft deep
- **Close**: Magic action to fold the cloth → seals the hole, trapping contents inside

This is mechanically distinct from every existing mechanics family:

| Family | Portable Hole | Why it doesn't fit |
|---|---|---|
| `passive` | No — requires explicit activation to open | Passive grants are always-on |
| `activation` (single) | No — the "open" state must persist | Standard activations are instantaneous or expire on a fixed duration |
| `composite` of two `activation` parts | No — the close activation ends the open activation's state | There's no lifecycle coupling between two activation parts; neither can express "deactivates the sibling part" |

What's needed is a variant of `Duration` (or a new mechanics family) that expresses **"active until a second paired activation ends it"**. This is the Folding Boat pattern extended to container lifecycle — the Folding Boat also has multiple item forms but the surface currently uses `alter_item_kind` for each transition without tracking which form is currently active or what persists between activations.

### 2. `ContainerStorageProfile` requires `maxWeightPounds` — SRD gives none

The `ContainerStorageProfile` type has `maxWeightPounds: number` as a required field. The Portable Hole's SRD text states no weight limit for contents — only physical dimensions (6 ft diameter × 10 ft deep = ~282 cubic feet). Writing any number for `maxWeightPounds` would be inventing data not in the source text, violating the no-fabrication rule.

A variant with optional weight capacity (or a size/geometry-only profile) is needed.

### 3. Escape mechanic: creature inside container takes action

The escape rule fires when a creature **inside the closed hole** spends its action:

> "a creature within the hole's extradimensional space can take an action to make a DC 10 Strength (Athletics) check. On a successful check, the creature forces its way out."

This is an `ability_check_gate` (DC 10, STR, Athletics) with an `on_creature_inside_spends_action` trigger. No existing `OngoingTrigger` variant covers "creature contained within this item's storage space spends an action." The closest, `on_creature_studies`, applies to creatures studying the attachment from outside, not creatures trapped inside it.

### 4. Extradimensional interaction destruction

> "Placing a Portable Hole inside an extradimensional space created by a Bag of Holding, Handy Haversack, or similar item instantly destroys both items and opens a gate to the Astral Plane."

This rule requires:
1. A trigger that fires when one extradimensional item is placed inside another
2. Simultaneous destruction of both items
3. A `transport_exile` effect (destination: `astral_plane`) for creatures within 10 feet (no cover)
4. The gate's origin being the placement point (not the caster's position)

No existing trigger, phase, or item-lifecycle atom covers item-item extradimensional collision. `transport_exile` exists and would cover the creature relocation; the interaction trigger and simultaneous item destruction are the gaps.

## Proposed widenings (narrowest honest classification)

### W1 — `surface_widening`: `Duration.until_reactivated` variant

Add `{ kind: "until_reactivated" }` to `Duration`. Semantics: the effect persists until the activating item/ability is re-triggered by the same bearer to end it. This covers:

- Portable Hole open/close toggle
- Any future items with explicit on/off activation (e.g., hypothetical "activate to ignite, activate to extinguish")

### W2 — `surface_widening`: optional `maxWeightPounds` in `ContainerStorageProfile`

Make `maxWeightPounds` optional (or add a `maxWeightPounds?: number` variant). Items whose capacity is physically constrained (anything that fits inside the cylinder can go inside) but not weight-limited should be representable without fabricating a number.

### W3 — `surface_widening`: `OngoingTrigger.on_creature_inside_spends_action`

Add a trigger variant for "a creature stored inside this container's extradimensional space spends an action." Pairs naturally with the existing `ability_check_gate` ongoing effect to model escape mechanics.

### W4 — `surface_widening`: extradimensional collision trigger + item lifecycle

The interaction destruction rule needs:
- A new `InteractionTrigger` variant: `{ kind: "placed_inside_extradimensional_space" }` (fires when this item enters an extradimensional container)
- A new `ItemLifecycleEffect`: `{ kind: "destroy_self_and_container" }` — destroys both this item and the host extradimensional container
- Pairing with `transport_exile` to the Astral Plane for nearby creatures

`transport_exile` (destination: `astral_plane`) already exists and covers the creature relocation half. The trigger and item-destruction atoms are the gaps.

## What would fit if the gaps were filled

With the above widenings, the honest encoding would be:

```
composite {
  // Open activation
  activation {
    activationCost: { kind: "standard_action", action: "magic" }
    resource: { kind: "use_count", cap: { kind: "fixed", uses: 1 } }  // conceptual — no reset; toggle
    resetCadence: ???  // doesn't consume/reset; it's a toggle
    duration: { kind: "until_reactivated" }  // W1
    phases: [
      direct { attachment: self, effects: [
        container_storage {
          maxVolumeCubicFeet: 282,  // π × 3² × 10
          // maxWeightPounds: absent  (W2)
          airSupply: { sharedMinutes: 60 },
          extradimensional: true
        }
      ]}
    ]
  }
  // Close activation
  activation {
    activationCost: { kind: "standard_action", action: "magic" }
    resource: ...  // ends the paired open activation
    phases: [
      direct { attachment: self, effects: [alter_item_kind("closed")] }
    ]
    // ongoing: escape mechanic via on_creature_inside_spends_action + ability_check_gate  (W3)
  }
  // Extradimensional interaction trigger
  triggered_reaction {
    // trigger: on_placed_inside_extradimensional_space  (W4)
    phases: [
      direct { effects: [
        destroy_self_and_container,  // W4
        transport_exile { destination: "astral_plane" }  // for creatures within 10 ft, no cover
      ]}
    ]
  }
}
```

The resource model for a toggle (open/close, no reset cadence) is also a surface gap — the current `ActivationResource + ResetCadence` model assumes activations are consumed and refilled, not toggled.
