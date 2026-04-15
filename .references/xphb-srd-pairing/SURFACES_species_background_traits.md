# Surfaces: Species And Background Traits

Scope:

- enrich the Pass 1 family inventory in [`UNITS_species_and_background_traits.md`](./UNITS_species_and_background_traits.md);
- stay within local sources only;
- identify what trait-level mechanic surfaces are worth extracting next from species and backgrounds;
- keep this as a family-specific surface note, not a duplicate inventory.

Primary inputs:

- [`Character-Origins.md`](../srd-5.2.1/Character-Origins.md)
- [`book-xphb.json`](../5etools-src/data/book/book-xphb.json)
- [`UNITS_species_and_background_traits.md`](./UNITS_species_and_background_traits.md)
- [`WORKFLOW_STAGE_CANDIDATES.md`](./WORKFLOW_STAGE_CANDIDATES.md)
- competitor cross-check notes:
  - [`LEARN_item_feature_scoped_runtime_payloads.md`](../LEARN_item_feature_scoped_runtime_payloads.md)
  - [`LEARN_closed_mechanic_vocabularies.md`](../LEARN_closed_mechanic_vocabularies.md)
  - [`LEARN_hard_provenance_package_boundaries.md`](../LEARN_hard_provenance_package_boundaries.md)

## What Looks Extractable Next

This family is not primarily about battle-only effects. It is about trait payload families that later force extension surfaces outside the core spell/feat/item hot spots.

The next extractable surfaces are:

- passive stat and capability grants
  - size
  - speed
  - senses
  - resistance
  - skill proficiency
  - tool proficiency
  - carrying-capacity modifiers
- feat and spell grants
  - background-granted origin feats
  - lineage-granted cantrips or spells
  - always-prepared spells
  - free casts and recharge cadence
- resource and usage surfaces
  - proficiency-bonus uses
  - long-rest reset
  - level-gated unlocks
- action/timing surfaces
  - bonus-action trait activation
  - reaction trait activation
  - attack-replacement traits
  - traits that create temporary state for a duration
- condition and movement surfaces
  - resistance or advantage against a condition
  - prone / grapple / charmed interactions
  - temporary flight
  - teleport
  - speed modification
- lifecycle and cleanup surfaces
  - lasts for X minutes
  - ends on incapacitation
  - ends early on release or loss of conditions
  - refreshed on long rest

## What The PHB/SRD Corpus Exposes Cleanly

The origins corpus is strong at exposing:

- background decomposition into fixed parts:
  - ability scores
  - feat
  - skill proficiencies
  - tool proficiency
  - equipment
- species decomposition into fixed parts:
  - creature type
  - size
  - speed
  - special traits
- trait text with clear named subunits under species entries;
- lineage and ancestry structures that already behave like typed subfamilies.

Examples visible directly in [`Character-Origins.md`](../srd-5.2.1/Character-Origins.md):

- `Dragonborn > Breath Weapon`
- `Dragonborn > Draconic Flight`
- `Elf > Elven Lineage`
- `Gnome > Gnomish Lineage`
- `Goliath > Giant Ancestry`
- background `Feat` grants such as `Acolyte -> Magic Initiate (Cleric)`

## What It Exposes Poorly

The corpus is weaker at:

- normalizing background and species traits into one machine-shaped schema;
- distinguishing "payload over a known primitive" from "new primitive" automatically;
- giving one clean bridge from narrative lineage choices to later runtime payloads;
- separating trait selection subchoices from the main unit cleanly in all cases.

So this family needs explicit subunit extraction, not just tag counting.

## Competitor Cross-Check Pressure

Use competitor research here to answer:

- which trait mechanics deserve their own payload family rather than being flattened into generic modifiers;
- which grants should be modeled as typed spell/feat/item links instead of copied effect text;
- which provenance/package boundaries will matter if non-SRD species or backgrounds arrive later.

Most relevant cross-checks:

- [`LEARN_item_feature_scoped_runtime_payloads.md`](../LEARN_item_feature_scoped_runtime_payloads.md)
  - for trait payload families and grants attached to a specific source unit;
- [`LEARN_closed_mechanic_vocabularies.md`](../LEARN_closed_mechanic_vocabularies.md)
  - for keeping ancestry/lineage/trait effects inside a closed contribution surface;
- [`LEARN_hard_provenance_package_boundaries.md`](../LEARN_hard_provenance_package_boundaries.md)
  - because non-SRD origins content is likely to arrive as optional packaged content later.

## Concrete Next-Step Extraction Recipe

1. Keep [`UNITS_species_and_background_traits.md`](./UNITS_species_and_background_traits.md) as the Pass 1 inventory of first-class roots.
2. Extract named trait subunits beneath each species and background root.
3. For each extracted trait subunit, record:
   - trait kind
   - source root
   - timing surface
   - resource/reset surface
   - grants or links to feats/spells/proficiencies
   - movement/condition/defense/effect payloads
   - expiry/cleanup if any
4. Treat these recurring trait families as the likely extension-pressure map:
   - grant-a-feat
   - grant-a-spell
   - grant-a-cantrip
   - PB-per-long-rest activated trait
   - action/reaction/bonus-action activated trait
   - temporary transformation or movement trait
   - passive resistance/sense/proficiency trait
5. Keep provenance explicit:
   - `Character-Origins.md` / SRD remain provenance for overlap units;
   - PHB-only units remain structured-input pressure for future optional packages.
