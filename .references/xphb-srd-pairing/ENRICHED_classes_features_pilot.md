# Enriched Class Features Pilot

Purpose:

- start true subunit-level enrichment for the `classes_and_features` family;
- bridge the remaining major gap in the research narrative by turning representative class/subclass features into explicit extracted surfaces;
- test whether class features mostly reuse the extension families already visible in spells, items, feats, and traits.

This file is intentionally a pilot:

- it does not replace [`UNITS_classes_and_features.md`](./UNITS_classes_and_features.md);
- it does not attempt full class-feature coverage;
- it focuses on representative class and subclass features with high surface pressure.

Primary inputs:

- [`SURFACES_classes_features.md`](./SURFACES_classes_features.md)
- SRD class files:
  - [`Fighter.md`](../srd-5.2.1/Classes/Fighter.md)
  - [`Rogue.md`](../srd-5.2.1/Classes/Rogue.md)
  - [`Wizard.md`](../srd-5.2.1/Classes/Wizard.md)
  - [`Cleric.md`](../srd-5.2.1/Classes/Cleric.md)
  - [`Monk.md`](../srd-5.2.1/Classes/Monk.md)
  - [`Warlock.md`](../srd-5.2.1/Classes/Warlock.md)

Representative features:

- `Fighter > Second Wind`
- `Fighter > Action Surge`
- `Fighter > Tactical Master`
- `Rogue > Sneak Attack`
- `Rogue > Cunning Strike`
- `Rogue > Thief > Use Magic Device`
- `Wizard > Memorize Spell`
- `Wizard > Spell Mastery`
- `Cleric > Channel Divinity > Divine Spark`
- `Cleric > Turn Undead`
- `Monk > Monk's Focus`
- `Monk > Stunning Strike`
- `Warlock > Magical Cunning`
- `Warlock > Eldritch Invocation`

## Why These Features

This set covers the main class-feature pressure families:

- resource pools and partial recharge
- bonus-action and action-time activations
- action expansion and action restriction
- attack riders and save riders
- spell preparation/replacement mechanics
- always-prepared and free-cast mechanics
- invocation/option registries
- item-attunement and magic-item interaction from class content

## Enriched Records

## Fighter > Second Wind

- Kind: `class-feature`
- Provenance: `srd-overlap`
- PHB location: `Classes > Fighter`
- Gate:
  - class level `1+`
- Timing/workflow:
  - activated as `Bonus Action`
- Resource:
  - starts with `2` uses
  - partial recharge: `1` use on `Short Rest`
  - full recharge on `Long Rest`
  - usage count scales by level table
- Effect:
  - regain `1d10 + Fighter level` hit points
- Extension-surface pressure:
  - pooled self-heal family
  - partial-rest-recharge family
  - level-scaled use-count family

## Fighter > Action Surge

- Kind: `class-feature`
- Provenance: `srd-overlap`
- PHB location: `Classes > Fighter`
- Gate:
  - class level `2+`
- Timing/workflow:
  - on your turn
  - grants one additional action except `Magic`
- Resource:
  - short/long-rest reset
  - later scales to two uses, but once per turn
- Effect:
  - action-economy expansion with explicit exclusion
- Extension-surface pressure:
  - extra-action family
  - action-type exclusion family
  - multi-use but per-turn-fenced family

## Fighter > Tactical Master

- Kind: `class-feature`
- Provenance: `srd-overlap`
- PHB location: `Classes > Fighter`
- Gate:
  - class level `9+`
  - applies only when attacking with weapon whose mastery you can use
- Timing/workflow:
  - keyed to weapon attack
- Resource:
  - none
- Effect:
  - replace weapon mastery with `Push`, `Sap`, or `Slow` for that attack
- Extension-surface pressure:
  - mastery-rewrite family
  - per-attack mode substitution on item payloads

## Rogue > Sneak Attack

- Kind: `class-feature`
- Provenance: `srd-overlap`
- PHB location: `Classes > Rogue`
- Gate:
  - attack must use `Finesse` or `Ranged` weapon
  - once per turn
  - needs advantage or qualifying nearby ally and no disadvantage
- Timing/workflow:
  - keyed to hit with attack roll
- Resource:
  - no pool; once-per-turn fence
  - damage scales by level table
- Effect:
  - extra damage of same weapon type
- Extension-surface pressure:
  - relation- and advantage-sensitive on-hit rider
  - level-scaled extra-damage family
  - item-property-coupled attack rider

## Rogue > Cunning Strike

- Kind: `class-feature`
- Provenance: `srd-overlap`
- PHB location: `Classes > Rogue`
- Gate:
  - when you deal Sneak Attack damage
- Timing/workflow:
  - immediate post-damage rider
- Resource:
  - spend Sneak Attack dice as die-cost currency
- Effect:
  - attach one of several rider effects:
    - `Poison`
    - `Trip`
    - `Withdraw`
  - later expanded by `Improved Cunning Strike` and `Devious Strikes`
- Resolution:
  - some options force saves with derived DC
- Extension-surface pressure:
  - rider-menu family
  - internal die-cost currency family
  - effect-option registry family

## Rogue > Thief > Use Magic Device

- Kind: `subclass-feature`
- Provenance: `srd-overlap`
- PHB location: `Classes > Rogue > Thief`
- Gate:
  - subclass feature
- Timing/workflow:
  - passive plus item-use specific checks
- Resource:
  - modifies attunement cap to `4`
  - charge-preservation chance on item use
- Effect:
  - attune to more items
  - chance to avoid expending charges
  - use spell scrolls with Arcana check model
- Extension-surface pressure:
  - class feature that rewrites item-system limits
  - charge-preservation family
  - cross-family item/spellscroll interaction

## Wizard > Memorize Spell

- Kind: `class-feature`
- Provenance: `srd-overlap`
- PHB location: `Classes > Wizard`
- Gate:
  - class level `5+`
- Timing/workflow:
  - on `Short Rest`
- Resource:
  - no pool, but tied to rest event
- Effect:
  - replace one prepared level 1+ spell with another from spellbook
- Extension-surface pressure:
  - prepared-spell replacement family
  - short-rest reconfiguration family

## Wizard > Spell Mastery

- Kind: `class-feature`
- Provenance: `srd-overlap`
- PHB location: `Classes > Wizard`
- Gate:
  - class level `18+`
  - choose eligible level 1 and 2 action-cast spells from spellbook
- Timing/workflow:
  - persistent spell-selection feature
  - can replace one chosen spell on `Long Rest`
- Resource:
  - chosen spells cast at lowest level without expending slot
  - higher-level casts still spend slot
- Effect:
  - always prepared
  - at-will low-level cast for chosen spells
- Extension-surface pressure:
  - always-prepared family
  - no-slot cast family
  - rest-based replacement family

## Cleric > Channel Divinity > Divine Spark

- Kind: `class-feature-option`
- Provenance: `srd-overlap`
- PHB location: `Classes > Cleric`
- Gate:
  - Channel Divinity usage
- Timing/workflow:
  - `Magic` action
- Resource:
  - shared Channel Divinity pool
  - short-rest partial recharge / long-rest full recharge
- Target/area:
  - another creature within `30 feet`
- Resolution:
  - either heal automatically or force `Constitution save` for necrotic/radiant damage
- Effect:
  - menu choice between healing and damage
  - scales by level with extra `d8`
- Extension-surface pressure:
  - shared-pool option family
  - dual-mode heal-or-harm family
  - action-bound class power family

## Cleric > Turn Undead

- Kind: `class-feature-option`
- Provenance: `srd-overlap`
- PHB location: `Classes > Cleric`
- Gate:
  - Channel Divinity usage
- Timing/workflow:
  - `Magic` action
- Target/area:
  - chosen Undead within `30 feet`
- Resolution:
  - `Wisdom saving throw`
- Effect:
  - inflicts `Frightened` and `Incapacitated`
  - forced movement away from source
- Duration/cleanup:
  - lasts `1 minute`
  - ends early on damage, caster incapacitation, or caster death
- Extension-surface pressure:
  - typed condition-bundle family
  - early-end cleanup family
  - creature-type-targeted action family

## Monk > Monk's Focus

- Kind: `class-feature`
- Provenance: `srd-overlap`
- PHB location: `Classes > Monk`
- Gate:
  - class level `2+`
- Timing/workflow:
  - unlocks multiple named option features
- Resource:
  - `Focus Points` pool by level
  - short/long-rest full recharge
- Effect:
  - shared pool fuels `Flurry of Blows`, `Patient Defense`, `Step of the Wind`
  - some features use save DC derived from Wisdom + proficiency
- Extension-surface pressure:
  - named pool family
  - shared resource across option registry
  - class-specific save DC family

## Monk > Stunning Strike

- Kind: `class-feature`
- Provenance: `srd-overlap`
- PHB location: `Classes > Monk`
- Gate:
  - once per turn when hitting with Monk weapon or Unarmed Strike
- Timing/workflow:
  - on-hit rider
- Resource:
  - expend `1 Focus Point`
- Resolution:
  - target makes `Constitution saving throw`
- Effect:
  - on failed save: `Stunned` until start of your next turn
  - on successful save: speed halved and next attack against target has advantage until same boundary
- Duration/cleanup:
  - start-of-next-turn boundary
- Extension-surface pressure:
  - save-rider family with success/failure split
  - pool-spending on-hit rider

## Warlock > Magical Cunning

- Kind: `class-feature`
- Provenance: `srd-overlap`
- PHB location: `Classes > Warlock`
- Gate:
  - class level `2+`
- Timing/workflow:
  - `1 minute` rite
- Resource:
  - regain expended Pact Magic slots up to half maximum
  - long-rest reset
- Effect:
  - partial slot recovery
- Extension-surface pressure:
  - non-rest ritual recharge family
  - partial slot-restoration family

## Warlock > Eldritch Invocation

- Kind: `class-feature-system`
- Provenance: `srd-overlap`
- PHB location: `Classes > Warlock`
- Gate:
  - invocation-specific prerequisites
  - replacement constraints
- Timing/workflow:
  - persistent option registry chosen on level-up
- Resource:
  - some options create always-on benefits
  - some grant no-slot spell casts
  - some are repeatable with constrained different-choice logic
- Effect:
  - closed option system containing many typed subfamilies
- Extension-surface pressure:
  - feature-option registry family
  - prerequisite vocabulary family
  - repeatable-with-constraint family
  - class-local plugin pressure without open scripting

## What Recurs Across The Pilot

Recurring surfaces already visible:

- shared resource pools
- partial recharge vs full recharge
- level-scaled counters and tables
- option registries
- on-hit riders
- post-failure or post-roll rewrites
- prepared-spell and no-slot cast rewrites
- class features that rewrite item or mastery systems
- multi-feature bundles tied to one source system

## What This Suggests

Class features still mostly reuse the extension-surface families already seen elsewhere.

What they add more strongly is:

- resource-table pressure
- progression-table pressure
- option-registry pressure
- replacement/retraining pressure
- cross-family rewrites, where one class feature modifies spell, item, mastery, or attack systems instead of only adding a self-contained effect

So class features do not force a separate execution model, but they do force the extension surface to handle:

- registries of typed options
- table-scaled pools and quotas
- rest/ritual/resource recovery variants
- explicit cross-family rewrites
