# Enriched Feats Pilot

Purpose:

- start true Pass 2 enrichment for the feat family;
- move from feat-surface planning into explicit extracted benefit atoms;
- test whether feats mostly reuse the extension families already visible in spells and items.

This file is intentionally a pilot:

- it is not a duplicate of [`UNITS_feats.md`](./UNITS_feats.md);
- it is not full-family coverage;
- it uses a representative subset of feats to expose recurring benefit families.

Primary inputs:

- [`UNITS_feats.md`](./UNITS_feats.md)
- [`SURFACES_feats.md`](./SURFACES_feats.md)
- [`Feats.md`](../srd-5.2.1/Feats.md)

Representative feats:

- `Alert`
- `Magic Initiate`
- `Grappler`
- `Defense`
- `Great Weapon Fighting`
- `Boon of Combat Prowess`
- `Boon of Dimensional Travel`
- `Boon of Fate`
- `Boon of the Night Spirit`

## Why These Feats

This set covers several recurring feat shapes:

- passive modifier and initiative hook: `Alert`
- spell-grant and free-cast payload: `Magic Initiate`
- on-hit and grapple rider: `Grappler`
- passive equipment-gated defense modifier: `Defense`
- weapon-property-coupled damage rewrite: `Great Weapon Fighting`
- miss-to-hit rewrite with short reset: `Boon of Combat Prowess`
- post-action teleport rider: `Boon of Dimensional Travel`
- d20 outcome intervention with rest/initiative reset: `Boon of Fate`
- bonus-action self-buff with explicit self-expiry: `Boon of the Night Spirit`

## Enriched Records

## Alert

- Kind: `feat`
- Provenance: `srd-overlap`
- PHB location: `Chapter 5 > Origin Feats`
- Prerequisite:
  - none beyond origin-feat access
- Timing/workflow:
  - triggers on rolling `Initiative`
  - triggers immediately after initiative roll
- Resource:
  - none
- Effect:
  - adds `Proficiency Bonus` to initiative
  - allows initiative swap with one willing ally in same combat
- Target/scope:
  - self for bonus
  - self + willing ally for swap
- Legality/gating:
  - swap unavailable if either creature is `Incapacitated`
- Extension-surface pressure:
  - initiative hook family
  - post-roll reorder family

## Magic Initiate

- Kind: `feat`
- Provenance: `srd-overlap`
- PHB location: `Chapter 5 > Origin Feats`
- Prerequisite:
  - none beyond origin-feat access
- Timing/workflow:
  - persistent learned/prepared-grant payload
  - level-up replacement hook
- Resource:
  - one free cast of granted level-1 spell per `Long Rest`
  - may also cast using normal spell slots
- Effect:
  - grants two cantrips from chosen list
  - grants one always-prepared level-1 spell from same list
  - sets spellcasting ability choice for feat-granted spells
- Selection/repeatability:
  - choose among Cleric/Druid/Wizard lists
  - repeatable, but with different spell list each time
- Extension-surface pressure:
  - spell-grant family
  - prepared-spell grant family
  - free-cast-with-reset family
  - level-up replacement hook

## Grappler

- Kind: `feat`
- Provenance: `srd-overlap`
- PHB location: `Chapter 5 > General Feats`
- Prerequisite:
  - `Level 4+`
  - `Strength or Dexterity 13+`
- Timing/workflow:
  - keyed to hitting with `Unarmed Strike` as part of `Attack` action
  - once per turn rider
- Resource:
  - no pool; per-turn usage fence
- Effect:
  - ability score increase
  - allows `Damage` and `Grapple` on same unarmed hit
  - grants advantage against creatures grappled by you
  - removes extra movement cost for moving smaller/equal grappled targets
- Target/scope:
  - hit target
  - creatures grappled by you
- Extension-surface pressure:
  - on-hit rider family
  - persistent relation-scoped advantage family
  - movement-rule override family

## Defense

- Kind: `feat`
- Provenance: `srd-overlap`
- PHB location: `Chapter 5 > Fighting Style Feats`
- Prerequisite:
  - `Fighting Style Feature`
- Timing/workflow:
  - passive while wearing qualifying armor
- Resource:
  - none
- Effect:
  - `+1 Armor Class`
- Legality/gating:
  - only while wearing `Light`, `Medium`, or `Heavy` armor
- Extension-surface pressure:
  - passive equipment-gated modifier family
  - armor-state dependency

## Great Weapon Fighting

- Kind: `feat`
- Provenance: `srd-overlap`
- PHB location: `Chapter 5 > Fighting Style Feats`
- Prerequisite:
  - `Fighting Style Feature`
- Timing/workflow:
  - keyed to rolling damage for qualifying melee attack
- Resource:
  - none
- Effect:
  - treats `1` or `2` on damage die as `3`
- Legality/gating:
  - requires melee weapon held with two hands
  - weapon must have `Two-Handed` or `Versatile`
- Extension-surface pressure:
  - damage-roll rewrite family
  - item-property-coupled feat family

## Boon of Combat Prowess

- Kind: `feat`
- Provenance: `srd-overlap`
- PHB location: `Chapter 5 > Epic Boon Feats`
- Prerequisite:
  - `Level 19+`
- Timing/workflow:
  - keyed when you miss with an attack roll
  - reset at `start of your next turn`
- Resource:
  - short cooldown-like quota until next-turn boundary
- Effect:
  - ability score increase
  - turns miss into hit
- Extension-surface pressure:
  - miss-rewrite family
  - next-turn-reset family

## Boon of Dimensional Travel

- Kind: `feat`
- Provenance: `srd-overlap`
- PHB location: `Chapter 5 > Epic Boon Feats`
- Prerequisite:
  - `Level 19+`
- Timing/workflow:
  - triggers immediately after `Attack` action or `Magic` action
- Resource:
  - none
- Effect:
  - ability score increase
  - teleport up to `30 feet`
- Target/scope:
  - self to visible unoccupied space
- Extension-surface pressure:
  - post-action movement rider family
  - typed follow-up after named action families

## Boon of Fate

- Kind: `feat`
- Provenance: `srd-overlap`
- PHB location: `Chapter 5 > Epic Boon Feats`
- Prerequisite:
  - `Level 19+`
- Timing/workflow:
  - triggers when you or another creature within `60 feet` succeeds on or fails a `D20 Test`
- Resource:
  - once until you roll initiative or finish a `Short Rest` or `Long Rest`
- Effect:
  - ability score increase
  - roll `2d4` and apply as bonus or penalty to the d20 roll
- Target/scope:
  - self or another creature within `60 feet`
- Extension-surface pressure:
  - post-test intervention family
  - mixed reset family (`initiative` or `rest`)

## Boon of the Night Spirit

- Kind: `feat`
- Provenance: `srd-overlap`
- PHB location: `Chapter 5 > Epic Boon Feats`
- Prerequisite:
  - `Level 19+`
- Timing/workflow:
  - `Bonus Action` activation while in `Dim Light` or `Darkness`
  - explicit self-expiry immediately after you take an `action`, `Bonus Action`, or `Reaction`
- Resource:
  - none
- Effect:
  - ability score increase
  - grants `Invisible`
  - grants broad damage resistance exception set while in qualifying light
- Legality/gating:
  - only while within `Dim Light` or `Darkness`
- Duration/cleanup:
  - explicit self-expiry tied to later action use
- Extension-surface pressure:
  - self-buff bonus-action family
  - environment-gated condition grant family
  - action-terminated temporary effect family

## What Recurs Across The Pilot

Recurring surfaces already visible:

- prerequisite families:
  - level gate
  - ability-score gate
  - feature gate
- passive modifier families:
  - AC bonus
  - initiative bonus
  - attack/damage rewrites
- timing families:
  - on initiative
  - after named action
  - on hit
  - on miss
  - after d20 result
  - bonus-action activation
- reset families:
  - once per turn
  - until start of next turn
  - until initiative roll
  - short/long rest
- grant families:
  - grant spells/cantrips
  - grant condition
  - grant movement/teleport
  - grant resistance
- dependency families:
  - depends on equipment state
  - depends on relation state (`grappled by you`)
  - depends on environment state (`Dim Light` / `Darkness`)

## What This Suggests

Feats are not introducing a completely separate world of mechanics.

They mostly reuse and recombine extension families already visible in spells and items:

- timing hooks
- triggered riders
- short-lived effects with cleanup
- grants and unlocks
- equipment-gated modifiers
- reset/resource fences

The likely new pressure from feats is not a brand-new execution model. It is:

- denser prerequisite vocabulary
- richer trigger vocabulary around action results and d20 outcomes
- more frequent combination of multiple small typed atoms inside one source unit
