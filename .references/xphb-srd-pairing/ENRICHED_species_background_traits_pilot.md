# Enriched Species / Background Traits Pilot

Purpose:

- start true Pass 2 enrichment for the species/background-traits family;
- test whether traits mostly reuse the same extension families as spells/items/feats or force new ones;
- extract a representative set of trait subunits from origins content.

This file is intentionally a pilot:

- it is not a duplicate of [`UNITS_species_and_background_traits.md`](./UNITS_species_and_background_traits.md);
- it is not full-family coverage;
- it focuses on representative trait subunits rather than every species/background.

Primary inputs:

- [`Character-Origins.md`](../srd-5.2.1/Character-Origins.md)
- [`SURFACES_species_background_traits.md`](./SURFACES_species_background_traits.md)

Representative roots/subunits:

- `Acolyte > Feat`
- `Dragonborn > Breath Weapon`
- `Dragonborn > Draconic Flight`
- `Elf > Elven Lineage`
- `Gnome > Gnomish Lineage`
- `Goliath > Giant Ancestry`
- `Goliath > Large Form`

## Enriched Records

## Acolyte > Feat

- Kind: `background-trait`
- Provenance: `srd-overlap`
- PHB location: `Chapter 4 > Background Descriptions > Acolyte`
- Timing/workflow:
  - no activation timing; background-build grant
- Resource:
  - none directly
- Effect:
  - grants `Magic Initiate (Cleric)`
- Extension-surface pressure:
  - grant-a-feat family
  - source-unit link into feat payload family

## Dragonborn > Breath Weapon

- Kind: `species-trait`
- Provenance: `srd-overlap`
- PHB location: `Chapter 4 > Species Descriptions > Dragonborn`
- Timing/workflow:
  - replaces one attack when you take the `Attack` action on your turn
- Resource:
  - uses equal to `Proficiency Bonus`
  - reset on `Long Rest`
- Target/area:
  - either `15-foot Cone` or `30-foot Line`
- Resolution:
  - `Dexterity saving throw`
  - DC derived from `8 + Constitution modifier + Proficiency Bonus`
- Effect:
  - typed damage by ancestry
- Scaling:
  - scales at character levels `5`, `11`, `17`
- Extension-surface pressure:
  - attack-replacement family
  - PB-per-long-rest family
  - area save-damage family
  - level-gated scaling family

## Dragonborn > Draconic Flight

- Kind: `species-trait`
- Provenance: `srd-overlap`
- PHB location: `Chapter 4 > Species Descriptions > Dragonborn`
- Timing/workflow:
  - `Bonus Action` activation
- Resource:
  - once per `Long Rest`
  - unlocked at character level `5`
- Effect:
  - temporary flight
- Duration/cleanup:
  - lasts `10 minutes`
  - ends on retraction or `Incapacitated`
- Extension-surface pressure:
  - level-gated bonus-action self-buff family
  - temporary movement-mode grant
  - condition-terminated temporary effect

## Elf > Elven Lineage

- Kind: `species-trait`
- Provenance: `srd-overlap`
- PHB location: `Chapter 4 > Species Descriptions > Elf`
- Timing/workflow:
  - persistent lineage choice at species selection
  - later level-gated grants at `3` and `5`
- Resource:
  - granted spells cast once without slot per `Long Rest`
  - may also use spell slots
- Effect:
  - grants cantrip/spells based on lineage
  - grants spellcasting ability choice
  - may modify movement or senses depending on lineage
- Extension-surface pressure:
  - lineage-choice family
  - grant-a-cantrip/spell family
  - always-prepared/free-cast family
  - level-gated growth family

## Gnome > Gnomish Lineage

- Kind: `species-trait`
- Provenance: `srd-overlap`
- PHB location: `Chapter 4 > Species Descriptions > Gnome`
- Timing/workflow:
  - persistent lineage choice
  - some subtraits grant activated construction/use behavior
- Resource:
  - PB-per-long-rest spell use for Forest Gnome branch
- Effect:
  - grants cantrips/spells
  - Rock Gnome branch creates temporary clockwork device with activation
- Duration/cleanup:
  - created device lasts `8 hours` or until dismantled
  - activation uses `Bonus Action`
  - dismantle uses `Utilize`
- Extension-surface pressure:
  - choice-of-subtrait family
  - grant-a-spell family
  - created-object payload family
  - time-limited created-item cleanup family

## Goliath > Giant Ancestry

- Kind: `species-trait`
- Provenance: `srd-overlap`
- PHB location: `Chapter 4 > Species Descriptions > Goliath`
- Timing/workflow:
  - choice among ancestry benefits
  - benefits activate on `Bonus Action`, on hit, or on taking damage depending on chosen ancestry
- Resource:
  - uses equal to `Proficiency Bonus`
  - reset on `Long Rest`
- Effect:
  - teleport
  - bonus damage
  - speed reduction
  - prone rider
  - damage reduction reaction
  - thunder retaliation reaction
- Extension-surface pressure:
  - choice-of-rider family
  - PB-per-long-rest multi-mode trait family
  - on-hit/on-damage/reaction trigger families

## Goliath > Large Form

- Kind: `species-trait`
- Provenance: `srd-overlap`
- PHB location: `Chapter 4 > Species Descriptions > Goliath`
- Timing/workflow:
  - `Bonus Action` activation
- Resource:
  - once per `Long Rest`
  - unlocked at character level `5`
- Effect:
  - change size to `Large`
  - grant advantage on `Strength` checks
  - speed increase
- Duration/cleanup:
  - lasts `10 minutes`
  - ends when ended voluntarily
- Extension-surface pressure:
  - temporary transformation family
  - level-gated bonus-action self-buff

## What Recurs Across The Pilot

Recurring surfaces already visible:

- grant families:
  - grant feat
  - grant cantrip/spell
  - grant always-prepared spell
- choice families:
  - lineage choice
  - ancestry mode choice
- timing families:
  - attack replacement
  - bonus-action activation
  - reaction trigger
  - on-hit rider
  - on-damage trigger
- reset families:
  - PB-per-long-rest
  - once-per-long-rest
  - level-gated unlock
- created-state families:
  - temporary movement mode
  - temporary transformation
  - temporary created object
  - effect ending on condition or manual end

## What This Suggests

Traits mostly reuse the same extension families already visible elsewhere:

- grants
- triggers
- bonus-action/reaction activations
- timed self-buffs
- level-gated scaling
- PB/rest reset fences

The main extra pressure from traits is:

- more explicit choice/lineage-mode families
- stronger source-root identity, because many trait payloads are tightly coupled to ancestry/background identity rather than being generic free-floating effects
