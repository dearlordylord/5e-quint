# L1I Class Species Barbarian Later Feature Closure

Task 5 closes the two loop-owned Barbarian later-feature records as explicit
unsupported-profile dispositions. No runtime behavior, Surface schema, Unit
catalog admission, or D-owned Weapon Mastery work changed.

## RAW Sources

- `.references/srd-5.2.1/Classes/Barbarian.md:90-94`: Danger Sense grants
  Advantage on Dexterity Saving Throws unless the Barbarian has the
  Incapacitated condition.
- `.references/srd-5.2.1/Classes/Barbarian.md:168-170`: Primal Champion
  increases Strength and Constitution scores by 4, to a maximum of 25.
- `UBIQUITOUS_LANGUAGE.md:7-20`: Saving Throw and Advantage are the canonical
  d20 roll and roll-mode terms for Danger Sense.
- `UBIQUITOUS_LANGUAGE.md:61-68`: Ability Score and Ability define the
  Strength and Constitution facts changed by Primal Champion.
- `UBIQUITOUS_LANGUAGE.md:103-127`: Incapacitated is the condition named by
  Danger Sense and the condition consequence index keeps that gate
  centralized.
- `UBIQUITOUS_LANGUAGE.md:320-321` and
  `UBIQUITOUS_LANGUAGE.md:359-360`: Character Sheet facts produce
  creature-level combat statistics, while class level is a Character
  Sheet-only fact rather than a Stat Block fact.

## Surface Records Read

- `packages/surface/content/barbarian_danger_sense.json`
- `packages/surface/content/barbarian_primal_champion.json`

## Existing Owners Read

- `packages/surface/src/surface/unit-catalog.ts:10-19` and
  `packages/surface/src/surface/unit-catalog.ts:251-280`: the installed SRD
  Unit catalog includes `class_barbarian`, `barbarian_weapon_mastery`,
  `barbarian_rage`, `barbarian_reckless_attack`, and
  `barbarian_fast_movement`, but not the two Task 5 records.
- `packages/character-creation-runtime/src/finalization.ts:2288-2374` and
  `packages/character-creation-runtime/src/index.test.ts:3085-3315`: current
  character creation support applies selected class-feature ability-score
  increases into `CharacterBuild.abilityScores` for supported lower-level
  choices, but there is no level-20 Primal Champion admission profile.

## Current Generated State

Before this task, the two Barbarian records were authored SRD Surface records
with passive mechanics payloads, but they were absent from the installed Unit
catalog and had no `unit-claims.jsonl` disposition. `UNIT_REPORT.md` therefore
listed them as `unsupported-widening-pressure`.

## Decision

Add `unsupported-profile` Unit claims for:

- `barbarian_danger_sense`
- `barbarian_primal_champion`

`barbarian_danger_sense` is a level-2 passive Saving Throw roll-mode feature.
It should not be admitted as a generic action, resource, or spell rider. A
future supported profile needs to consume the existing authored passive
`modify_roll_advantage` grant for Dexterity Saving Throws and the
Incapacitated suppression gate.

`barbarian_primal_champion` is a level-20 durable Character Sheet
ability-score projection. Battle runtime should receive the resulting creature
statistics after Character Sheet derivation rather than store duplicate
class-feature ability-score state.

## Follow-Up Tasks

- `L1I-BARBARIAN-DANGER-SENSE-ROLL-MODE` keeps the future supported-profile
  work visible for Danger Sense. It should decide whether the passive Saving
  Throw Advantage projection belongs in a shared d20 roll-mode algebra
  consumed by battle runtime or in a narrower battle-runtime Saving Throw
  projection owner.
- No Loop I follow-up is added for Primal Champion. It is a level-20 durable
  Character Sheet ability-score projection, not a standalone battle Unit
  profile. A future character-advancement plan can promote later-level
  permanent ability-score increases with caps above 20 if that owner is
  expanded.

## Review Notes

- RAW and ubiquitous-language pass: the closure uses Saving Throw, Advantage,
  Ability Score, Strength, Constitution, Incapacitated, Character Sheet, and
  creature-stat projection terms from the local corpus.
- Architecture/domain pass: no lower-layer workaround or duplicate state was
  added. The authored Surface facts remain the source records, with explicit
  unsupported Unit dispositions and future owners recorded at the profile
  boundary.
- Connascence pass: the two claim rows intentionally use distinct reasons
  because Danger Sense is passive d20 roll-mode pressure and Primal Champion is
  durable Character Sheet ability-score projection pressure. The repeated Unit
  ids are localized to `unit-claims.jsonl`, this decision artifact, and
  generated coverage output.
- Code-review pass: no executable code, casts, assertions, parsers, schemas,
  or runtime reducers changed.

## Verification

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `git diff --check`
- MBT not run: this changes coverage/decision metadata and generated reports,
  with no promoted battle runtime behavior.
