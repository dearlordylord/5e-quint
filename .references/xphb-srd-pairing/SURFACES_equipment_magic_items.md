# Surfaces: Equipment Properties, Masteries, and Magic-Item Procedures

## Scope and Inputs

This Pass 2 note narrows the item-surface extraction to the PHB mechanics that are still procedural after Pass 1 split out the named units in `UNITS_equipment_properties_and_masteries.md` and `UNITS_magic_items.md`.

Primary inputs:

- `.references/5etools-src/data/book/book-xphb.json`
- `.references/srd-5.2.1/Equipment.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- existing pairing notes, especially `UNITS_equipment_properties_and_masteries.md`, `UNITS_magic_items.md`, and `10-first-class-consumption.md`

The source boundary matters: `book-xphb.json` is good for locating PHB prose blocks and book-level headings, but it is not a normalized item database. The SRD files provide the rule text that decides whether a surface is mechanically real or just descriptive packaging.

## What Mechanic Surfaces Seem Extractable Next

### Weapon properties

The next extractable layer is not the property names themselves, but the runtime hooks they imply:

- `Finesse`, `Heavy`, `Light`, `Loading`, `Reach`, `Thrown`, `Two-Handed`, `Versatile`, `Ammunition`
- These map to attack-selection and attack-resolution gates, not just item metadata.
- `Heavy` and `Loading` are especially useful as legality constraints on weapon use.
- `Two-Handed` and `Versatile` are paired damage-selection surfaces, not just tags.

The SRD anchor is `Equipment.md:21-84`, with the property definitions starting at `Equipment.md:38`.

### Mastery triggers and effects

Weapon masteries are a second-order surface: they are only active if the wielder has a feature that unlocks them (`Equipment.md:82-84`), and each mastery carries a trigger/effect pair rather than a passive tag.

The extractable pieces are:

- trigger condition tied to attack hit / miss / next attack / next turn windows;
- effect payload such as push, slow, sap, vex, topple, nick, graze, cleave;
- proficiency-like unlock gating on the wielder, not on the weapon alone;
- item-scoped state for "this weapon's mastery is usable" versus "the character has mastery access."

This family is where the surface becomes execution-shaped. The surface unit should carry both the textual mastery name and the combat timing payload it implies.

### Magic-item procedure units

The PHB magic-item section is procedural, not catalog-heavy in this corpus. The useful surfaces are:

- identify or discover an item’s properties;
- attunement start / interruption / completion;
- attunement cap and duplicate-copy constraint;
- ending attunement by distance, death, replacement, or voluntary rest;
- wearing and wielding constraints;
- paired-item occupancy constraints.

These correspond to `Equipment.md:1026-1062` and the book JSON block around entries `716-71c` in `book-xphb.json`.

### Optional future module-added pressure

There is also a likely future surface for item pressure from optional modules or later content:

- items that impose per-slot occupancy pressure;
- items that carry additional stateful procedures such as charges, recharge, or conditional use windows;
- magic-item activation procedures that need a runtime lifecycle even when the base PHB text is only procedural.

Do not overfit this now. Keep it as an extension point for later item-scoped payloads, not as a promise that the PHB itself already supplies a catalog model.

## What The PHB JSON Exposes Cleanly vs Poorly

### Cleanly

The PHB JSON is good at:

- preserving the exact prose blocks for properties, mastery intro text, and magic-item procedures;
- keeping the chapter/section spine stable enough to anchor extraction;
- distinguishing equipment rules text from non-equipment rules text;
- surfacing the canonical PHB wording for wear/wield/attune/identify constraints.

That makes it a good source for surface discovery and section-to-surface mapping.

### Poorly

It is weak at:

- normalizing mastery or property semantics into typed fields;
- separating "general equipment rule" from "specific item trigger";
- representing item-scoped state such as attunement, occupancy, or paired-item dependency;
- expressing provenance/package boundaries for item payloads;
- distinguishing rules text that should become runtime logic from rules text that should stay prose-only.

In other words, the JSON is a good locator and a bad runtime contract.

## What Competitor Research Should Cross-Check

Use competitor research to answer two questions: what belongs on the item payload itself, and what belongs in the package/provenance boundary.

Cross-check:

- `/.references/inspirations/ARCHITECTURE-foundryvtt-dnd5e.md` and `/.references/competitors/foundryvtt-dnd5e/dnd5e.mjs` for item-scoped ActiveEffect payloads, usage hooks, and condition-like packaging;
- `/.references/inspirations/10-first-class-consumption.md` for typed cost/consume/refund vocabulary that can carry item activation pressure;
- `/.references/inspirations/ARCHITECTURE-opencombatengine.md` for equipment-slot and attunement handling as explicit subsystem state;
- `/.references/inspirations/ARCHITECTURE-avrae.md` for effect objects with parent/child cleanup and duration ticking;
- `/.references/inspirations/ARCHITECTURE-foundryvtt-dnd5e.md` and `/.references/inspirations/dae/Readme.md` for reversible effect application and lifecycle staging.

The research question is not "where can this rule be implemented?" but "what payload must remain attached to the item, and what payload must remain outside the package because it is runtime state?"

## Concrete Next-Step Extraction Recipe

1. Split the families into three extraction bins:
   - `weapon-property`
   - `weapon-mastery`
   - `magic-item-procedure`

2. For each unit, extract a minimal payload shape:
   - source text anchor
   - unlock/gating condition
   - timing window
   - state touched
   - reversible cleanup or expiry rule
   - whether the surface is item-local, wearer-local, or wielder-local

3. Treat properties as legality and resolver surfaces first, not as flavor:
   - legality examples: can it be used, wielded, or worn right now?
   - resolver examples: does it change reach, damage dice, or attack mode?

4. Treat masteries as trigger/effect pairs:
   - trigger window on hit/miss/next turn
   - effect payload on target or wielder
   - access gate on character feature, not on weapon entry alone

5. Treat magic-item procedures as lifecycle units:
   - identify
   - attune
   - end attunement
   - wear/wield constraints
   - pair occupancy
   - duplicate-copy limit

6. Carry provenance explicitly:
   - PHB/SRD prose is provenance
   - 5etools book JSON is input material, not provenance
   - any future module/package payload must preserve that separation

7. Defer any non-PHB magic-item pressure to a later extension layer:
   - charges
   - recharge
   - consumable activation variants
   - module-specific convenience wrappers

## Avoid / Ignore

- Ignore item catalogs as a completeness target here; this note is about procedures and surfaces, not inventory coverage.
- Ignore module-specific UI or compendium packaging unless it changes item-scoped payload shape.
- Ignore effect implementation details that do not alter legal use, lifecycle, or cleanup.
- Ignore later-book magic-item catalog noise unless it introduces a new procedural unit.

