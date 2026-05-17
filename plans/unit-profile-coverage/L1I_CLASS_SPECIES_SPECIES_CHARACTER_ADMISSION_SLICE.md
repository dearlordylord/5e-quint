# L1I Class Species Character Admission Slice

Task 16 installs the non-Orc SRD species container records needed for level-1
character creation admission. It admits Dragonborn, Dwarf, Elf, Goliath, and
Tiefling as species choices, retains their currently authored species-trait
Unit refs in `CharacterBuild`, and keeps each species container as
`unsupported-profile` because executable pressure belongs to narrower trait
Units.

## RAW Sources

- `.references/srd-5.2.1/Character-Creation.md:87-91`: character creation
  chooses a species and records the species traits, Size, and Speed.
- `.references/srd-5.2.1/Character-Origins.md:67-97`: species records carry
  Creature Type, Size, Speed, and Special Traits.
- `.references/srd-5.2.1/Character-Origins.md:99-127`: Dragonborn are
  Humanoid, Medium, have Speed 30, and provide Draconic Ancestry, Breath
  Weapon, Damage Resistance, Darkvision, and Draconic Flight.
- `.references/srd-5.2.1/Character-Origins.md:129-145`: Dwarves are Humanoid,
  Medium, have Speed 30, and provide Darkvision, Dwarven Resilience, Dwarven
  Toughness, and Stonecunning.
- `.references/srd-5.2.1/Character-Origins.md:147-175`: Elves are Humanoid,
  Medium, have Speed 30, and provide Darkvision, Elf Lineage, Fey Ancestry,
  Keen Senses, and Trance.
- `.references/srd-5.2.1/Character-Origins.md:194-213`: Goliaths are
  Humanoid, Medium, have Speed 35, and provide Giant Ancestry, Large Form, and
  Powerful Build.
- `.references/srd-5.2.1/Character-Origins.md:261-285`: Tieflings are
  Humanoid, choose Medium or Small, have Speed 30, and provide Darkvision,
  Fiendish Legacy, and Otherworldly Presence.
- `UBIQUITOUS_LANGUAGE.md`: Ability Check, Saving Throw, Advantage,
  Resistance, Grappled, Carrying Capacity, Darkvision, Character Sheet, and
  Stat Block terms keep trait behavior split from species admission.

## Surface Records Added

- `packages/surface/content/species_dragonborn.json`
- `packages/surface/content/species_dwarf.json`
- `packages/surface/content/species_elf.json`
- `packages/surface/content/species_goliath.json`
- `packages/surface/content/species_tiefling.json`

Each record keeps SRD provenance on the species container. The aggregate
records reference only already-authored trait Units from Task 10; they do not
duplicate trait mechanics into the species container.

## Decision

Add exact Surface species schemas for Dragonborn, Dwarf, Elf, Goliath, Orc, and
Tiefling. Exact schemas make mixed-species trait aggregates unrepresentable at
the content decode boundary, while Unit catalog validation also checks that
species trait refs are installed and belong to the same species as their
container.

Character creation support is widened from Orc-only admission to the SRD
species admission set:

- `species_dragonborn`
- `species_dwarf`
- `species_elf`
- `species_goliath`
- `species_orc`
- `species_tiefling`

Tiefling's Medium-or-Small source fact is represented as a species-size draft
choice because silently projecting Medium would erase an SRD character creation
choice. Fixed-size species do not store a parallel selected size. Finalization
checks that a selected size is present only for choice-sized species and that
the selected size is one of the Surface options.

Character battle initialization derives creature Size from the selected species
Surface record and the optional finalized species-size choice. This keeps
battle projection from hard-coding Orc or duplicating fixed species sizes.

## Deferred Trait Coverage

This task does not promote broad species runtime support or executable profiles
for the non-Orc traits. Unauthored SRD traits such as Dragonborn Draconic
Flight, Dwarf Stonecunning, Elf Lineage, Goliath Giant Ancestry, and Tiefling
Fiendish Legacy remain future Surface/content work. The admitted species
records retain only currently authored trait Unit refs.

## Review Notes

- RAW and ubiquitous-language pass: checked species selection, species record
  parts, each admitted species' Size and Speed, and the domain vocabulary for
  currently authored trait behavior.
- Architecture/domain pass: provenance remains on SRD species and trait Surface
  records. Character creation retains source facts and refs; battle derives
  Size at projection time instead of carrying duplicated species-size state.
- Connascence pass: exact species trait ref schemas and catalog same-species
  validation localize the coupling between a species container and its trait
  Unit ids.
- Code-review pass: runtime/domain failures added in this task are represented
  as decode errors, catalog issues, or `Either` invalid/finalization issues.
  No exception-based ordinary failure path was added.
- Round 1: added explicit finalization coverage that Tiefling's size choice is
  required and that stale species-size state is rejected for fixed-size species.
- Round 2: rechecked RAW/domain/code-review concerns after the test addition;
  no further task-owned findings remained.

## Verification

- Focused Surface tests and typecheck.
- Focused character-creation runtime tests and typecheck.
- Focused character-battle runtime typecheck.
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `git diff --check`
- MBT not run: this task changes Surface catalog admission, character creation
  selection/finalization, and character-to-battle size projection. It does not
  change promoted battle-runtime Quint behavior or Unit feature execution.
