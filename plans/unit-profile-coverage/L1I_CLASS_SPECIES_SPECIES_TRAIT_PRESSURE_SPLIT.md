# L1I Class Species Species Trait Pressure Split

Task 10 splits the eight loop-owned species-trait records into explicit
unsupported-profile lanes. No runtime behavior, Surface schema, Unit catalog
admission, character-creation species support, or broad species runtime changed.

## RAW Sources

- `.references/srd-5.2.1/Character-Origins.md:99-125`: Dragonborn Draconic
  Ancestry selects the damage type shared by Breath Weapon and Damage
  Resistance; Breath Weapon replaces one Attack-action attack with Cone or Line
  save-for-half damage, scales its dice by character level, and recharges a
  Proficiency Bonus use pool on Long Rest; Dragonborn Darkvision has a 60-foot
  range.
- `.references/srd-5.2.1/Character-Origins.md:129-139`: Dwarf Darkvision has a
  120-foot range, and Dwarven Resilience grants Poison Resistance plus
  Advantage on saving throws to avoid or end Poisoned.
- `.references/srd-5.2.1/Character-Origins.md:147-175`: Elf Darkvision has a
  60-foot base range; Drow lineage can change that range, which is not part of
  the Task 10 `elf_darkvision` Unit.
- `.references/srd-5.2.1/Character-Origins.md:194-213`: Goliath Powerful Build
  grants Advantage on ability checks to end Grappled and counts the character
  as one size larger for carrying capacity.
- `.references/srd-5.2.1/Character-Origins.md:261-285`: Tiefling Darkvision
  has a 60-foot range; Fiendish Legacy resistance and spell grants are separate
  selected lineage facts outside this task's `species_tiefling_darkvision`
  Unit.
- `.references/srd-5.2.1/Rules-Glossary.md:102-108` and
  `.references/srd-5.2.1/Playing-the-Game.md:584-588`: Attack action and attack
  resolution distinguish making an attack from replacing one attack.
- `.references/srd-5.2.1/Playing-the-Game.md:706-730` and
  `.references/srd-5.2.1/Rules-Glossary.md:828-830`: saving-throw half damage,
  Damage Type, Resistance, no-stacking, and order-of-application rules are the
  target-side damage boundary for the resistance traits.
- `.references/srd-5.2.1/Rules-Glossary.md:197-211`: carrying capacity derives
  from Size and Strength.
- `.references/srd-5.2.1/Rules-Glossary.md:357-359`: Darkvision shifts Dim
  Light and Darkness within a specified range.
- `.references/srd-5.2.1/Rules-Glossary.md:496-514`: Grappled and grapple
  escape use a Strength (Athletics) or Dexterity (Acrobatics) ability check to
  end the condition.
- `.references/srd-5.2.1/Rules-Glossary.md:674-685`: Long Rest recharges
  special features as specified by their descriptions.
- `.references/srd-5.2.1/Rules-Glossary.md:788-792`: Poisoned imposes
  Disadvantage on attack rolls and ability checks, separate from Dwarven
  Resilience's saving throw Advantage.
- `UBIQUITOUS_LANGUAGE.md:7-21`: Ability Check, Saving Throw, Advantage, and
  Disadvantage are the roll-mode vocabulary for Powerful Build and Dwarven
  Resilience.
- `UBIQUITOUS_LANGUAGE.md:40-51` and `UBIQUITOUS_LANGUAGE.md:57`: Pool, Spend,
  Long Rest reset language, and Proficiency Bonus frame Breath Weapon's
  resource.
- `UBIQUITOUS_LANGUAGE.md:86-87` and `UBIQUITOUS_LANGUAGE.md:351`: Damage Type
  and Resistance are target-side damage modifier facts.
- `UBIQUITOUS_LANGUAGE.md:102`, `UBIQUITOUS_LANGUAGE.md:175`,
  `UBIQUITOUS_LANGUAGE.md:193`, and `UBIQUITOUS_LANGUAGE.md:350`: Grappled,
  Grapple, Carrying Capacity, and the Grapple/Shove relationship frame Powerful
  Build.
- `UBIQUITOUS_LANGUAGE.md:280-286` and `UBIQUITOUS_LANGUAGE.md:354-355`:
  Illumination, Obscurement, and Darkvision are sight projection terms, not
  standalone Unit execution procedures.
- `UBIQUITOUS_LANGUAGE.md:318-321` and `UBIQUITOUS_LANGUAGE.md:359-360`:
  Character Sheet and Stat Block both produce creature-level facts; PC species
  traits feed Character Sheet projection rather than monster Stat Block source
  data.

## Surface Records Read

- `packages/surface/content/darkvision_elf.json`
- `packages/surface/content/darkvision_elf.dhall`
- `packages/surface/content/species_dragonborn_breath_weapon.json`
- `packages/surface/content/species_dragonborn_breath_weapon.dhall`
- `packages/surface/content/species_dragonborn_damage_resistance.json`
- `packages/surface/content/species_dragonborn_damage_resistance.dhall`
- `packages/surface/content/species_dragonborn_darkvision.json`
- `packages/surface/content/species_dragonborn_darkvision.dhall`
- `packages/surface/content/species_dwarf_darkvision.json`
- `packages/surface/content/species_dwarf_darkvision.dhall`
- `packages/surface/content/species_dwarf_dwarven_resilience.json`
- `packages/surface/content/species_dwarf_dwarven_resilience.dhall`
- `packages/surface/content/species_goliath_powerful_build.json`
- `packages/surface/content/species_goliath_powerful_build.dhall`
- `packages/surface/content/species_tiefling_darkvision.json`
- `packages/surface/content/species_tiefling_darkvision.dhall`

## Existing Owners Read

- `packages/surface/src/surface/unit-catalog.ts`: the installed SRD Unit
  catalog includes Orc species and Orc trait records, but not the eight Task 10
  records. This task does not install non-Orc species records.
- `packages/character-creation-runtime/src/index.test.ts`: current character
  creation evidence retains Orc trait Unit refs in finalized CharacterBuilds;
  there is no supported character-creation owner for Elf, Dragonborn, Dwarf,
  Goliath, or Tiefling species admission in this task.
- `packages/character-battle-runtime/src/battle-creature-init.ts`: character
  battle initialization can pass retained class-feature or species-trait Unit
  refs downstream, but only for Units already retained by CharacterBuild
  projection.
- `packages/battle-runtime/src/battle-reducer/spells-active-effects.ts` and
  `packages/battle-runtime/src/unit-profile-admission.test.ts`: promoted sight
  logic can consume Darkvision observer facts while resolving illumination and
  obscurement, but it does not install absent species trait Units as executable
  profiles.
- `packages/battle-runtime/src/unit-feature-support.ts`: current feature
  support can parse some active-effect resistances and active feature profiles,
  but not passive species trait resistance, Draconic Ancestry selection, Dwarven
  Resilience's Poisoned saving throw Advantage, or Powerful Build's grapple
  escape Ability Check Advantage.

## Current Generated State

Before this task, the eight records were authored SRD Surface records with
mechanics payloads, but they were absent from the installed Unit catalog and had
no `unit-claims.jsonl` disposition. `UNIT_REPORT.md` therefore listed them as
`unsupported-widening-pressure`.

`orc_darkvision` is installed and already has an unsupported-profile claim, but
it is not a precedent for installing the remaining species catalog. This task
keeps the species work split at the Unit profile boundary.

## Decision

Add `unsupported-profile` Unit claims for all eight records:

- `elf_darkvision`
- `species_dragonborn_breath_weapon`
- `species_dragonborn_damage_resistance`
- `species_dragonborn_darkvision`
- `dwarf_darkvision`
- `dwarf_dwarven_resilience`
- `species_goliath_powerful_build`
- `species_tiefling_darkvision`

No Task 10 Unit is promoted as runtime-supported. The split is:

- Runtime-detached sense facts: `elf_darkvision`,
  `species_dragonborn_darkvision`, `dwarf_darkvision`, and
  `species_tiefling_darkvision`. These are authored Darkvision sense/range
  facts. Sight execution consumes observer, illumination, distance, and
  visibility projections rather than executing these absent species trait Units
  directly.
- Future Breath Weapon widening: `species_dragonborn_breath_weapon`. The
  feature needs an explicit species attack-replacement profile spanning
  Attack-action attack replacement, area membership, Dexterity save-for-half
  damage, Draconic Ancestry damage-type selection, character-level dice
  scaling, and Proficiency Bonus Long Rest resource tracking.
- Future target-side resistance and roll-mode widening:
  `species_dragonborn_damage_resistance` and `dwarf_dwarven_resilience`.
  Dragonborn Damage Resistance must share one Draconic Ancestry source fact
  with Breath Weapon. Dwarven Resilience must preserve its single trait identity
  while splitting Poison Resistance from Advantage on saving throws to avoid or
  end Poisoned.
- Character fact plus future roll-mode widening:
  `species_goliath_powerful_build`. Carrying capacity is durable Character
  Sheet or inventory projection; Advantage on ability checks to end Grappled
  remains a condition-scoped Ability Check roll-mode follow-up.

Do not install the remaining species records, add a broad species runtime, or
claim the existing generic active-effect resistance paths as support for
species Damage Resistance.

## Follow-Up Tasks

- Future species support should add a small species character-creation
  admission slice before any runtime support relies on non-Orc species trait
  refs in CharacterBuilds.
- Add an atomic Breath Weapon profile only after its source facts can reuse one
  Draconic Ancestry selection for both Breath Weapon damage type and Damage
  Resistance.
- Add a target-side passive Resistance profile that handles passive
  character-derived damage modifiers without duplicating Stat Block
  resistances, active spell effects, or active feature state.
- Add a condition-scoped Ability Check and Saving Throw roll-mode profile
  family before claiming Powerful Build or Dwarven Resilience roll-mode
  support.

## Review Notes

- RAW and ubiquitous-language pass: every lane traces to SRD species text and
  uses the local Ability Check, Saving Throw, Advantage, Resistance,
  Darkvision, Grappled, Carrying Capacity, Character Sheet, and Stat Block
  vocabulary.
- Architecture/domain pass: provenance stays on the authored SRD Surface
  records. The claims do not duplicate Draconic Ancestry, Darkvision range,
  carrying capacity, Resistance, or Grappled roll-mode state in a second
  runtime structure. Powerful Build stays in a future widening lane because its
  Grappled escape Advantage is not runtime-detached.
- Connascence pass: repeated Darkvision closure text is localized to the four
  Darkvision Unit claims and this artifact because the same sense projection
  invariant applies with different authored ranges. Draconic Ancestry coupling
  is called out explicitly so Breath Weapon and Dragonborn Damage Resistance
  move together in future support.
- Code-review pass: no executable code, casts, assertions, parsers, schemas, or
  runtime reducers changed.
- Round 1: confirmed the task does not touch D-owned selected identity files,
  companion/familiar work, or the installed Orc species lane.
- Round 2: rechecked the split against generated report output after `--write`;
  the task-owned generated changes are the eight new unsupported-profile claim
  projections.

## Verification

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `git diff --check`
- MBT not run: this changes coverage/decision metadata and generated reports,
  with no promoted battle runtime behavior.
