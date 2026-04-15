# Enriched Equipment / Magic-Item Pilot

Purpose:

- start true Pass 2 enrichment for the equipment-properties, masteries, and magic-item-procedure families;
- turn named units and procedure notes into explicit extracted surfaces;
- build the second concrete bridge from corpus mining to extension-surface design.

This file is intentionally a pilot:

- it is not a duplicate of [`UNITS_equipment_properties_and_masteries.md`](./UNITS_equipment_properties_and_masteries.md) or [`UNITS_magic_items.md`](./UNITS_magic_items.md);
- it is not full-family coverage;
- it captures representative recurring shapes from equipment and magic-item procedures.

Primary inputs:

- [`SURFACES_equipment_magic_items.md`](./SURFACES_equipment_magic_items.md)
- [`Equipment.md`](../srd-5.2.1/Equipment.md)
- [`LEARN_item_feature_scoped_runtime_payloads.md`](../LEARN_item_feature_scoped_runtime_payloads.md)
- [`LEARN_hard_provenance_package_boundaries.md`](../LEARN_hard_provenance_package_boundaries.md)

## Why These Units

This pilot uses a representative set that already shows multiple item-surface families:

- `Light`
- `Loading`
- `Reach`
- `Versatile`
- `Nick`
- `Topple`
- `Attunement`
- `Wearing and Wielding Items`

That covers:

- attack-legality modifiers
- attack-resolution modifiers
- action-economy interactions
- save-rider masteries
- item-local lifecycle procedures
- occupancy and wear/wield constraints

## Enriched Records

## Light

- Kind: `item-property`
- Provenance: `srd-overlap`
- PHB location: `Chapter 6 > Equipment > Weapons > Properties`
- Timing/workflow:
  - keyed to taking the `Attack` action on your turn
  - creates a later `Bonus Action` attack window on the same turn
- Resource:
  - spends bonus-action capacity if used in the normal way
- Target/area:
  - requires a different `Light` weapon for the extra attack
- Resolution:
  - modifies action economy rather than hit resolution directly
- Effect:
  - grants extra off-hand-like attack with restricted damage-modifier rule
- Duration/cleanup:
  - same-turn window only
- Extension-surface pressure:
  - item property that grants a typed follow-up attack window
  - action-economy modifier attached to weapon payload, not creature-global state

## Loading

- Kind: `item-property`
- Provenance: `srd-overlap`
- PHB location: `Chapter 6 > Equipment > Weapons > Properties`
- Timing/workflow:
  - keyed to using an `action`, `Bonus Action`, or `Reaction` to fire the weapon
- Resource:
  - imposes a one-piece-of-ammunition cap per triggering action window
- Target/area:
  - applies to the weapon firing process
- Resolution:
  - legality / throughput constraint, not hit-effect logic
- Effect:
  - caps number of shots regardless of normal attack count
- Duration/cleanup:
  - no persistent state beyond the current fire window
- Extension-surface pressure:
  - per-window firing cap
  - property-level legality guard that competes with extra-attack style payloads

## Reach

- Kind: `item-property`
- Provenance: `srd-overlap`
- PHB location: `Chapter 6 > Equipment > Weapons > Properties`
- Timing/workflow:
  - applies when you attack with the weapon
  - also applies when determining reach for `Opportunity Attacks`
- Resource:
  - none
- Target/area:
  - extends attack and OA distance by 5 feet
- Resolution:
  - modifies targeting legality and reaction-window geometry inputs
- Effect:
  - extends weapon-based reach
- Duration/cleanup:
  - active while using that weapon
- Extension-surface pressure:
  - item-local targeting modifier
  - weapon payload must be able to influence OA reach separately from creature base reach

## Versatile

- Kind: `item-property`
- Provenance: `srd-overlap`
- PHB location: `Chapter 6 > Equipment > Weapons > Properties`
- Timing/workflow:
  - keyed to making a melee attack with one or two hands
- Resource:
  - changes hand-occupancy choice, not pool/quota resource
- Target/area:
  - same target shape as the base weapon
- Resolution:
  - damage-die selection surface
- Effect:
  - swaps to alternate damage value when used with two hands
- Duration/cleanup:
  - no persistent effect; choice resolved per attack mode
- Extension-surface pressure:
  - per-attack mode selection attached to weapon payload
  - hand-occupancy and damage-mode coupling

## Nick

- Kind: `item-mastery`
- Provenance: `srd-overlap`
- PHB location: `Chapter 6 > Equipment > Weapons > Mastery Properties`
- Timing/workflow:
  - keyed to making the extra attack granted by `Light`
  - changes that extra attack from later `Bonus Action` timing to part of the `Attack` action
- Resource:
  - preserves bonus-action capacity by relocating the extra attack
- Target/area:
  - same targeting as the Light-property extra attack
- Resolution:
  - modifies action-timing of an existing extra-attack window
- Effect:
  - folds extra Light attack into the `Attack` action
  - limited to once per turn
- Duration/cleanup:
  - same-turn only
- Extension-surface pressure:
  - mastery that rewrites action placement rather than adding a new effect
  - property/mastery interaction surface

## Topple

- Kind: `item-mastery`
- Provenance: `srd-overlap`
- PHB location: `Chapter 6 > Equipment > Weapons > Mastery Properties`
- Timing/workflow:
  - keyed to hitting a creature with the weapon
- Resource:
  - requires mastery-unlock feature on wielder
- Target/area:
  - target creature hit by the weapon
- Resolution:
  - follow-up `Constitution saving throw`
  - DC uses attack ability modifier plus proficiency bonus
- Effect:
  - on failed save, target gains `Prone`
- Duration/cleanup:
  - condition lifecycle handled by broader condition rules
- Extension-surface pressure:
  - on-hit mastery rider with derived save DC
  - item-scoped trigger plus condition application payload

## Attunement

- Kind: `magic-item-procedure`
- Provenance: `srd-overlap`
- PHB location: `Chapter 6 > Equipment > Magic Items`
- Timing/workflow:
  - requires focused `Short Rest`
  - interrupted rest fails attempt
  - completion at end of rest
- Resource:
  - attunement slot cap of `3`
  - duplicate-copy restriction
- Target/area:
  - item-local bond between creature and item
- Resolution:
  - no attack/save/check resolution
  - lifecycle gate to unlock magical properties
- Effect:
  - enables magical properties of attunement-required items
- Duration/cleanup:
  - ends on failed prerequisite, long distance over time, death, replacement by another creature, or voluntary short-rest ending
- Extension-surface pressure:
  - bond/lock family
  - item-local capability unlock with explicit lifecycle and cleanup

## Wearing and Wielding Items

- Kind: `magic-item-procedure`
- Provenance: `srd-overlap`
- PHB location: `Chapter 6 > Equipment > Magic Items`
- Timing/workflow:
  - item properties may depend on being worn or wielded in the intended fashion
- Resource:
  - competes for occupancy slots:
    - footwear
    - gloves/gauntlets
    - bracers
    - armor
    - headwear
    - cloak
  - paired-item requirement for some benefits
- Target/area:
  - wearer/wielder-local
- Resolution:
  - legality and benefit-eligibility surface
- Effect:
  - determines whether magical properties are active
- Duration/cleanup:
  - benefits end when wear/wield prerequisites cease to hold
- Extension-surface pressure:
  - occupancy-slot family
  - paired-item constraint family
  - item benefit gating separate from attunement gating

## What Recurs Across The Pilot

Recurring surfaces already visible:

- legality gates:
  - can fire
  - can attack this way
  - can benefit from item
- action-economy rewrites:
  - later bonus attack
  - move attack into attack action
  - one-shot-per-window cap
- target/range modifiers:
  - extend reach
  - change valid target or mode
- on-hit riders:
  - save rider
  - condition rider
- lifecycle procedures:
  - attunement start
  - attunement end
  - wear/wield benefit gating
  - paired occupancy requirements

## What This Forces For Extension Surface Thinking

This pilot suggests the extension surface needs typed support for:

- legality constraints attached to weapon/item payloads;
- action-economy modifiers attached to item properties/masteries;
- on-hit rider payloads with derived save DCs;
- hand/occupancy mode selection for item use;
- item-local lifecycle locks such as attunement;
- benefit gating by wear/wield/paired-item state.

That is enough to justify treating item properties and magic-item procedures as first-class extension-pressure sources rather than background metadata.
