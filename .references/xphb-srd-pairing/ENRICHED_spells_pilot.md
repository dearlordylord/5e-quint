# Enriched Spells Pilot

Purpose:

- start true Pass 2 enrichment for the spell family;
- move beyond planning notes into explicit extracted surfaces;
- use a representative subset of spells to discover recurring payload families before attempting all `391` spell units.

This file is intentionally a pilot:

- it is not a duplicate of [`UNITS_spells.md`](./UNITS_spells.md);
- it is not full-family coverage;
- it is the first concrete bridge from corpus mining to extension-surface design.

Primary inputs:

- [`UNITS_spells.md`](./UNITS_spells.md)
- [`SURFACES_spells.md`](./SURFACES_spells.md)
- SRD spell procedure anchors in [`Gaining-and-Casting.md`](../srd-5.2.1/Spells/Gaining-and-Casting.md)
- representative spell descriptions:
  - [`Bless`](../srd-5.2.1/Spells/Descriptions-A-D.md)
  - [`Conjure Animals`](../srd-5.2.1/Spells/Descriptions-A-D.md)
  - [`Counterspell`](../srd-5.2.1/Spells/Descriptions-A-D.md)
  - [`Fireball`](../srd-5.2.1/Spells/Descriptions-E-L.md)
  - [`Magic Missile`](../srd-5.2.1/Spells/Descriptions-M-P.md)
  - [`Polymorph`](../srd-5.2.1/Spells/Descriptions-M-P.md)
  - [`Shield`](../srd-5.2.1/Spells/Descriptions-S-Z.md)

## Why These Spells

This set covers several recurring spell shapes:

- buff with concentration and scaling: `Bless`
- area damage with save and scaling: `Fireball`
- auto-hit multi-target damage: `Magic Missile`
- reaction defensive spell with short-lived cleanup: `Shield`
- reaction interrupt spell with slot-preservation side effect: `Counterspell`
- ongoing movable summoned hazard/control zone: `Conjure Animals`
- full-form transformation with replacement semantics and early-end rule: `Polymorph`

These are enough to start seeing which surfaces recur and which are special.

## Enriched Records

## Bless

- Kind: `spell`
- Provenance: `srd-overlap`
- PHB location: `Chapter 7 > Spell Descriptions`
- Timing/workflow:
  - cast with `Action`
  - creates ongoing effect for `Concentration, up to 1 minute`
  - applies to targets' later `attack roll` and `saving throw` events
- Resource:
  - consumes spell slot level `1+`
  - scaling: one additional target per slot level above 1
- Target/area:
  - up to `three creatures` within `30 feet`
- Resolution:
  - no attack roll
  - no saving throw on application
  - automatic beneficial effect on chosen targets
- Effect:
  - ongoing bonus rider to `attack roll`
  - ongoing bonus rider to `saving throw`
- Duration/cleanup:
  - tied to concentration ownership
  - all granted bonuses end when spell ends
- Extension-surface pressure:
  - concentration-owned beneficial aura/buff
  - ongoing roll-modifier payload
  - scalable target count

## Fireball

- Kind: `spell`
- Provenance: `srd-overlap`
- PHB location: `Chapter 7 > Spell Descriptions`
- Timing/workflow:
  - cast with `Action`
  - instantaneous resolution
- Resource:
  - consumes spell slot level `3+`
  - scaling: damage increases by `1d6` per slot level above 3
- Target/area:
  - point within `150 feet`
  - `20-foot-radius Sphere`
- Resolution:
  - `Dexterity saving throw`
- Effect:
  - area `Fire` damage
  - ignites flammable unattended objects
- Duration/cleanup:
  - instantaneous; no ongoing cleanup
- Extension-surface pressure:
  - point-targeted area spell
  - save-for-half damage family
  - environmental rider separate from creature damage

## Magic Missile

- Kind: `spell`
- Provenance: `srd-overlap`
- PHB location: `Chapter 7 > Spell Descriptions`
- Timing/workflow:
  - cast with `Action`
  - instantaneous resolution
- Resource:
  - consumes spell slot level `1+`
  - scaling: one extra dart per slot level above 1
- Target/area:
  - one or more visible creatures within `120 feet`
- Resolution:
  - no attack roll
  - no save
  - automatic hit
- Effect:
  - three simultaneous force-damage darts by default
  - darts can split across targets
- Duration/cleanup:
  - instantaneous
- Extension-surface pressure:
  - auto-hit multi-projectile damage family
  - target-splitting payload
  - explicit interaction surface for `Shield`

## Shield

- Kind: `spell`
- Provenance: `srd-overlap`
- PHB location: `Chapter 7 > Spell Descriptions`
- Timing/workflow:
  - cast with `Reaction`
  - trigger: `when you are hit by an attack roll or targeted by Magic Missile`
  - lasts until `start of your next turn`
- Resource:
  - consumes spell slot level `1`
- Target/area:
  - self
- Resolution:
  - no attack roll
  - no save
  - triggered defensive response
- Effect:
  - `+5 AC`
  - includes protection against the triggering attack
  - nullifies `Magic Missile` damage
- Duration/cleanup:
  - short-lived timed defensive effect
  - explicit expiry at next-turn boundary
- Extension-surface pressure:
  - reaction defensive spell family
  - trigger-conditioned application
  - explicit short-lived cleanup phase
  - spell-to-spell interaction override

## Counterspell

- Kind: `spell`
- Provenance: `srd-overlap`
- PHB location: `Chapter 7 > Spell Descriptions`
- Timing/workflow:
  - cast with `Reaction`
  - trigger: seeing a creature within `60 feet` cast a spell with components
- Resource:
  - consumes spell slot level `3+`
  - special scaling: auto-end if target spell level is <= counterspell slot level
- Target/area:
  - one creature in process of casting a spell
- Resolution:
  - target makes `Constitution saving throw`
- Effect:
  - on failed save: spell dissipates
  - casting action / bonus action / reaction is wasted
  - target spell slot is not expended
- Duration/cleanup:
  - instantaneous interrupt
- Extension-surface pressure:
  - reaction interrupt spell family
  - cast-in-progress interception
  - spell-cancellation payload
  - resource refund / preserve side effect

## Conjure Animals

- Kind: `spell`
- Provenance: `srd-overlap`
- PHB location: `Chapter 7 > Spell Descriptions`
- Timing/workflow:
  - cast with `Action`
  - concentration-owned ongoing effect for up to `10 minutes`
  - movable effect on caster's turns
  - triggers when pack moves near a creature, or creature enters/ends turn near pack
- Resource:
  - consumes spell slot level `3+`
  - scaling: damage increases by `1d10` per slot level above 3
- Target/area:
  - summoned pack appears in visible unoccupied space within `60 feet`
  - trigger radius around pack
- Resolution:
  - triggered `Dexterity saving throw`
  - once per turn limit per creature
- Effect:
  - summons persistent spectral pack
  - grants caster advantage on `Strength saving throws` while nearby
  - pack deals ongoing `Slashing` damage as a movable hazard
- Duration/cleanup:
  - concentration cleanup removes summoned pack and all nearby benefits
- Extension-surface pressure:
  - summoned persistent zone family
  - moveable ongoing hazard
  - aura/adjacency rider tied to summoned entity
  - concentration-linked cleanup

## Polymorph

- Kind: `spell`
- Provenance: `srd-overlap`
- PHB location: `Chapter 7 > Spell Descriptions`
- Timing/workflow:
  - cast with `Action`
  - concentration-owned transformation lasting up to `1 hour`
- Resource:
  - consumes spell slot level `4`
- Target/area:
  - one visible creature within `60 feet`
- Resolution:
  - `Wisdom saving throw`
- Effect:
  - transforms target into chosen Beast form
  - replaces most game statistics with chosen form
  - preserves alignment, personality, creature type, Hit Points, and Hit Point Dice
  - grants temporary hit points equal to Beast-form HP
  - restricts actions by anatomy
  - prevents speech and spellcasting
  - melds gear into form
- Duration/cleanup:
  - ends on concentration loss
  - ends early if temporary hit points are depleted
  - cleanup requires restoring pre-transform state
- Extension-surface pressure:
  - full-form replacement family
  - partial-stat-preservation transform
  - early-end rule tied to temporary-hit-point depletion
  - equipment suppression payload

## What Recurs Across The Pilot

Recurring surfaces already visible:

- cast timing:
  - `Action`
  - `Reaction`
- resolution families:
  - automatic
  - attack
  - save
  - interrupt
- effect families:
  - damage
  - defensive modifier
  - ongoing buff
  - summoned ongoing zone
  - full transformation
- duration families:
  - instantaneous
  - concentration with timed maximum
  - fixed short-lived duration until next-turn boundary
- scaling families:
  - add targets
  - add damage dice
  - add extra projectiles
  - auto-counter threshold
- cleanup families:
  - no cleanup
  - concentration cleanup
  - next-turn expiry
  - transform reversion

## What This Forces For Extension Surface Thinking

This pilot already suggests the extension surface will need typed support for at least:

- action-cast and reaction-cast spells as separate timing families;
- save-based, attack-based, auto-hit, and interrupt resolution families;
- concentration-owned ongoing effects;
- explicit cleanup/expiry semantics;
- summoned persistent entities or zones;
- transformation payloads that replace and preserve different subsets of state;
- scaling modes that are not all the same shape.

That is enough signal to justify continuing spell enrichment before trying to finalize a closed vocabulary.
