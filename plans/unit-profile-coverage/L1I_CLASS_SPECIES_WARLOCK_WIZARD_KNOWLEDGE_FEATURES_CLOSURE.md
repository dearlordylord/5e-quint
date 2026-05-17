# L1I Class Species Warlock Wizard Knowledge Feature Closure

Task 9 closes the loop-owned Warlock and Wizard knowledge-feature records as
explicit unsupported-profile dispositions. No runtime behavior, Surface schema,
Unit catalog admission, Warlock Eldritch Invocation work, or Wizard Arcane
Recovery selected-identity work changed.

## RAW Sources

- `.references/srd-5.2.1/Classes/Warlock.md:31-43`: the Warlock Features
  table places Contact Patron at Warlock level 9.
- `.references/srd-5.2.1/Classes/Warlock.md:104-108`: Contact Patron always
  prepares Contact Other Plane, grants one no-slot cast to contact the patron
  until Long Rest, and makes the Warlock automatically succeed on that spell's
  Intelligence Saving Throw when cast through the feature.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1057-1069`: Contact Other
  Plane is a level-5 Spell Definition with table-mediated answers, an
  Intelligence Saving Throw, Psychic damage, and Incapacitated fallout on a
  failed save.
- `.references/srd-5.2.1/Classes/Warlock.md:464-475`: Fiend Spells grants
  always-prepared Spell Access in four Warlock-level tiers: 3, 5, 7, and 9.
- `.references/srd-5.2.1/Classes/Wizard.md:31-36`: the Wizard Features table
  places Scholar at Wizard level 2.
- `.references/srd-5.2.1/Classes/Wizard.md:104-106`: Scholar chooses one
  listed skill in which the Wizard has proficiency and grants Expertise in the
  chosen skill.
- `.references/srd-5.2.1/Rules-Glossary.md:462-466`: Expertise doubles
  Proficiency Bonus for an ability check with a skill proficiency and can be
  gained only in a skill in which the character has proficiency.
- `.references/srd-5.2.1/Rules-Glossary.md:798-802` and
  `.references/srd-5.2.1/Rules-Glossary.md:900-902`: Proficiency and Skill
  define the Character Sheet facts Scholar must consume.
- `UBIQUITOUS_LANGUAGE.md:55-68`: Proficiency Bonus, Proficiency Level,
  Expertise, Skill, and Ability Check vocabulary keep Scholar as a proficiency
  projection rather than a generic roll modifier.
- `UBIQUITOUS_LANGUAGE.md:220-244`: Pact Slot, Spell Definition, Spell Access,
  Spell Invocation, and Spell Effect keep Warlock spell-access grants separate
  from spell execution and spell-created runtime state.

## Surface Records Read

- `packages/surface/content/warlock_contact_patron.json`
- `packages/surface/content/warlock_contact_patron.dhall`
- `packages/surface/content/warlock_fiend_spells.json`
- `packages/surface/content/warlock_fiend_spells.dhall`
- `packages/surface/content/wizard_scholar.json`
- `packages/surface/content/wizard_scholar.dhall`

## Existing Owners Read

- `packages/surface/src/surface/unit-catalog.ts:251-299`: the installed SRD
  Unit catalog includes `class_warlock`, `class_wizard`,
  `warlock_eldritch_invocations`, `wizard_ritual_adept`, and
  `wizard_arcane_recovery`, but not the three Task 9 records.
- `packages/character-battle-runtime/src/battle-character-build-projection.ts:1059-1099`
  and `packages/character-battle-runtime/src/index.test.ts:562-577`: the
  promoted feature-prepared Spell Access projection is currently the narrower
  Favored Enemy Hunter's Mark owner.
- `packages/character-battle-runtime/src/index.test.ts:810-819`: unrelated
  passive prepared Spell Access is intentionally not promoted by the Favored
  Enemy owner.
- `packages/surface/src/surface/schema-spell.ts:2283-2288`: the existing
  `grant_expertise` Surface atom only admits owned skill proficiencies without
  Expertise, with no fixed allowed-skill intersection.
- `packages/character-creation-runtime/src/discovery.ts:1287-1319` and
  `packages/character-creation-runtime/src/finalization.ts:2577-2588`:
  Character Creation discovers and finalizes generic owned-skill Expertise
  choices, which supports Rogue Expertise but is not precise enough for
  Scholar's six-skill prerequisite.
- `packages/surface/content/rogue_expertise.json`: Rogue Expertise is the
  existing supported `grant_expertise` record and remains a separate owner.

## Current Generated State

Before this task, the three records were authored SRD Surface records with
executable mechanics payloads, but they were absent from the installed Unit
catalog and had no explicit `unit-claims.jsonl` disposition. `UNIT_REPORT.md`
therefore listed them as `unsupported-widening-pressure`.

`warlock_contact_patron.json` encodes always-prepared and once-per-Long-Rest
Contact Other Plane Spell Access, but the Dhall source records that the
feature-scoped automatic Saving Throw success is intentionally omitted from the
current grant shape.

`warlock_fiend_spells.json` encodes only the level-3 Fiend Spells row. The
Dhall source records that the level-5, level-7, and level-9 table rows require
a per-grant class-level threshold mechanism.

`wizard_scholar.json` encodes a passive Ability Check Proficiency Bonus delta
over a skill choice, but the Dhall source records that the acquisition-time
choice and owned-proficiency prerequisite are not represented by that shape.

## Decision

Add `unsupported-profile` Unit claims for:

- `warlock_contact_patron`
- `warlock_fiend_spells`
- `wizard_scholar`

`warlock_contact_patron` is a level-9 Spell Access plus patron-contact no-slot
cast feature whose no-slot cast also changes Contact Other Plane by
automatically succeeding on its Intelligence Saving Throw. The Contact Other
Plane spell procedure itself is table-mediated divination with failure fallout.
This should not be claimed through the narrower Favored Enemy free-cast owner or
through selected Eldritch Invocation Spell Access.

`warlock_fiend_spells` is a level-3 subclass Spell Access progression. The
authored record only carries the first tier, so admitting it as a supported
profile would make the missing level-threshold tiers invisible.

`wizard_scholar` is a level-2 build-time Expertise choice constrained to
Arcana, History, Investigation, Medicine, Nature, or Religion in which the
Wizard already has proficiency. Existing Rogue Expertise support proves the
owned-skill Expertise owner, but Scholar needs a constrained intersection of
owned skill proficiencies and a fixed allowed-skill list.

This task deliberately does not touch `warlock_eldritch_invocations` or
`wizard_arcane_recovery`.

## Follow-Up Tasks

- No Loop I battle-runtime follow-up is added for Contact Patron. A future
  later-level Warlock spell-access task should first decide how class-feature
  no-slot casts attach feature-scoped spell overrides and patron-contact
  restrictions, then carry Contact Other Plane's table-mediated Spell
  Invocation facts without duplicating Spell Access state.
- No Loop I battle-runtime follow-up is added for Fiend Spells. Future subclass
  spell-access support should model level-threshold prepared Spell Access from
  one source Unit rather than promote only the level-3 row.
- A future Character Creation task can extend the supported Expertise profile
  with a constrained owned-skill filter and then migrate Scholar to that owner.
  That task should reuse the Rogue Expertise path rather than create a
  Wizard-only proficiency adapter.

## Review Notes

- RAW and ubiquitous-language pass: the closure uses Spell Definition, Spell
  Access, Spell Invocation, Saving Throw, Proficiency Bonus, Proficiency Level,
  Skill, Expertise, and Character Sheet terminology from the local corpus.
- Architecture/domain pass: no workaround adapter or duplicate state was
  added. The authored Surface records remain source facts with explicit
  unsupported Unit dispositions at the profile boundary.
- Connascence pass: the repeated Unit ids are localized to `unit-claims.jsonl`,
  this decision artifact, and generated coverage output. The three claim
  reasons are intentionally distinct because Contact Patron is feature-scoped
  spell-override pressure, Fiend Spells is level-threshold Spell Access
  progression pressure, and Scholar is constrained build-time Expertise choice
  pressure.
- Code-review pass: no executable code, casts, assertions, parsers, schemas, or
  runtime reducers changed.
- Round 1: confirmed the claims do not install the three records and do not
  touch the D-owned `warlock_eldritch_invocations` or `wizard_arcane_recovery`
  records.
- Round 2: rechecked generated report and matrix output after `--write`; the
  task-owned generated changes are the three new unsupported-profile claim
  projections.

## Verification

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `git diff --check`
- MBT not run: this changes coverage/decision metadata and generated reports,
  with no promoted battle runtime behavior.
