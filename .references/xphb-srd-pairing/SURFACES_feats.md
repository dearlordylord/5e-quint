# Feat Surfaces: Pass 2

Scope:

- enrich the first-class feat inventory in [`UNITS_feats.md`](./UNITS_feats.md);
- mine feat-level mechanic surfaces from local sources only;
- use [`book-xphb.json`](../5etools-src/data/book/book-xphb.json), [`Feats.md`](../srd-5.2.1/Feats.md), and the existing pairing/research notes as inputs;
- stay at the surface level for now, not final vocabulary design.

Current feat corpus shape:

- `75` total feat units in Pass 1;
- categories visible in the PHB JSON: Origin `10`, General `43`, Fighting Style `10`, Epic Boon `12`;
- the PHB JSON gives chapter/category structure and feat links, while the SRD `Feats.md` gives the actual benefit language.

## What Looks Extractable Next

The next pass should split each feat into benefit atoms and annotate the mechanics they carry. The recurring surfaces are already visible in the local SRD feat text:

- `prerequisite`
  - category gates, level gates, ability thresholds, and feature gates;
  - examples: `Ability Score Improvement` (`Level 4+`), `Grappler` (`Level 4+, Strength or Dexterity 13+`), `Boon of Spell Recall` (`Level 19+, Spellcasting Feature`).
- `repeatable`
  - explicit repeatability and per-selection constraints;
  - examples: `Magic Initiate`, `Skilled`, `Ability Score Improvement`.
- `resource / usage`
  - once per turn, once per rest, once per initiative, once per slot, once per long rest;
  - examples: `Savage Attacker`, `Boon of Combat Prowess`, `Boon of Fate`, `Boon of Spell Recall`.
- `attack / save / check modifiers`
  - proficiency bonuses, advantage/disadvantage, AC bonuses, damage-die edits, initiative bonus, D20 test manipulation;
  - examples: `Alert`, `Archery`, `Defense`, `Great Weapon Fighting`, `Boon of Fate`, `Boon of Combat Prowess`.
- `reaction / bonus-action hooks`
  - immediately after roll initiative, when you hit, when you miss, after Attack/Magic action, as a Bonus Action;
  - examples: `Alert`, `Grappler`, `Boon of Dimensional Travel`, `Boon of the Night Spirit`.
- `condition / effect grants`
  - grants or ends named conditions, resistance, advantage, invisible state, grappled movement rider, AC rider, speed rider;
  - examples: `Boon of the Night Spirit`, `Grappler`, `Defense`, `Boon of Irresistible Offense`.
- `spell / item grant patterns`
  - learned/prepared spell grants, free casts, spell-list selection, item-use affordances, feature-backed cast permissions;
  - examples: `Magic Initiate`, `Boon of Spell Recall`.
- `movement / defense riders`
  - extra movement, no opportunity attacks, teleport, resistance, AC changes;
  - examples: `Grappler`, `Boon of Dimensional Travel`, `Defense`, `Boon of the Night Spirit`.

The important extraction rule is to treat a feat as a container for multiple mechanic atoms. `Magic Initiate` is not one surface; it is a spell-list grant, a prepared-spell grant, a free-cast resource rule, and a level-up replacement rule. `Boon of the Night Spirit` is not one surface; it is a condition-grant hook plus a resistance rider plus a self-expiry rule tied to actions.

## What The PHB JSON Exposes Cleanly Vs Poorly

Cleanly:

- chapter/category placement for feats;
- a stable first-class feat inventory to anchor Pass 1;
- inline references that make feat links machine-readable;
- the high-level feat grouping that matters for later taxonomies.

Poorly:

- no normalized per-feat schema for prerequisite, repeatable, trigger, or limit logic;
- no explicit decomposition of multi-benefit feats into subunits;
- no dedicated representation for bonus-action / reaction / once-per-turn / once-per-rest surfaces;
- no clean structured separation between passive modifiers and triggered riders;
- class/feature-style payload shape is not present as a reusable feat schema, only as prose and linked references.

So the PHB JSON is good for locating and counting feat units, but weak for direct mechanic extraction. The local SRD `Feats.md` is the better source for the actual benefit language, and the two should be paired, not treated as interchangeable.

## Competitor Cross-Checks For Taxonomy Pressure

Use competitor research only as a stress test for taxonomy pressure, not as an architecture to copy:

- [`LEARN_item_feature_scoped_runtime_payloads.md`](../LEARN_item_feature_scoped_runtime_payloads.md)
  - best cross-check for feat/spell/feature payload families and contextual bonuses;
  - useful for seeing why item-scoped or feature-scoped payloads need their own vocabulary surface.
- [`RESEARCH_foundry_effect_staging.md`](../RESEARCH_foundry_effect_staging.md)
  - useful for timing, expiry, cleanup, and reaction-window pressure;
  - not a runtime template.
- [`LEARN_explicit_effect_phase_ownership.md`](../LEARN_explicit_effect_phase_ownership.md)
  - useful for apply/remove symmetry and phase ownership;
  - especially relevant to once-per-turn / once-per-rest / bonus-action / reaction-style feat riders.
- [`RESEARCH_pf2e_rule_elements.md`](../RESEARCH_pf2e_rule_elements.md)
  - useful for closed mechanic vocabularies and contribution-style payloads;
  - architecturally poor fit because it leans hard on OOP and mutable lifecycle hooks, so use it for taxonomy pressure only.
- [`LEARN_closed_mechanic_vocabularies.md`](../LEARN_closed_mechanic_vocabularies.md)
  - useful for the "closed vocabulary" constraint itself;
  - especially relevant to feat benefit atoms that should map to a finite set of typed surfaces.
- [`LEARN_hard_provenance_package_boundaries.md`](../LEARN_hard_provenance_package_boundaries.md)
  - useful for later packaging boundaries if some feat-adjacent content becomes optional or module-provided.

## Concrete Next-Step Extraction Recipe

1. Start from the feat list already canonicalized in [`UNITS_feats.md`](./UNITS_feats.md).
2. For each feat, extract one multiline block per benefit atom instead of one block per feat.
3. For each atom, record only the surfaces we actually need next:
   - prerequisite;
   - repeatable or usage limit;
   - timing hook;
   - resource interaction;
   - target or scope;
   - modifier type;
   - condition/effect grant;
   - movement/defense rider;
   - spell/item grant.
4. Keep the output aligned to the local SRD feat wording, and use the PHB JSON only to confirm category/order/link structure.
5. Promote only the surfaces that recur across several feats into the later closed-vocabulary design.

The immediate goal is not to invent feat vocabulary yet. The goal is to find which feat subunits and surfaces recur often enough that the later vocabulary has to expose them.
