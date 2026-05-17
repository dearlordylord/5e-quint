# L1I Class Species Ability Score Improvement Closure

Task 2 closes the nine loop-owned level-4 Ability Score Improvement
class-feature records as character-advancement feat-selection containers. No
runtime behavior, Surface schema, Unit catalog admission, or level-1 D
advancement/container work changed.

## RAW Sources

- `.references/srd-5.2.1/Classes/Barbarian.md:108-110`: Barbarian level-4
  Ability Score Improvement grants the Ability Score Improvement feat or
  another qualifying feat, repeating at Barbarian levels 8, 12, and 16.
- `.references/srd-5.2.1/Classes/Bard.md:109-111`: Bard level-4 Ability Score
  Improvement has the same feat-selection text and repeats at Bard levels 8,
  12, and 16.
- `.references/srd-5.2.1/Classes/Cleric.md:106-108`: Cleric level-4 Ability
  Score Improvement has the same feat-selection text and repeats at Cleric
  levels 8, 12, and 16.
- `.references/srd-5.2.1/Classes/Druid.md:134-136`: Druid level-4 Ability
  Score Improvement has the same feat-selection text and repeats at Druid
  levels 8, 12, and 16.
- `.references/srd-5.2.1/Classes/Monk.md:112-114`: Monk level-4 Ability Score
  Improvement has the same feat-selection text and repeats at Monk levels 8,
  12, and 16.
- `.references/srd-5.2.1/Classes/Ranger.md:106-108`: Ranger level-4 Ability
  Score Improvement has the same feat-selection text and repeats at Ranger
  levels 8, 12, and 16.
- `.references/srd-5.2.1/Classes/Rogue.md:93-95`: Rogue level-4 Ability Score
  Improvement has the same feat-selection text and repeats at Rogue levels 8,
  10, 12, and 16.
- `.references/srd-5.2.1/Classes/Sorcerer.md:123-125`: Sorcerer level-4
  Ability Score Improvement has the same feat-selection text and repeats at
  Sorcerer levels 8, 12, and 16.
- `.references/srd-5.2.1/Classes/Wizard.md:112-114`: Wizard level-4 Ability
  Score Improvement has the same feat-selection text and repeats at Wizard
  levels 8, 12, and 16.
- `.references/srd-5.2.1/Feats.md:65-71`: the Ability Score Improvement feat
  increases one Ability Score by 2 or two Ability Scores by 1, capped at 20,
  and is repeatable.
- `UBIQUITOUS_LANGUAGE.md:335`: Ability Score Improvement is class progression
  that grants the Ability Score Improvement feat or another qualifying feat.
- `UBIQUITOUS_LANGUAGE.md:360`: Ability Score Improvement is Character
  Sheet-only, while Stat Blocks do not carry class-level ASI state.

## Surface Records Read

- `packages/surface/content/barbarian_ability_score_improvement_l4.json`
- `packages/surface/content/bard_ability_score_improvement_l4.json`
- `packages/surface/content/cleric_ability_score_improvement_l4.json`
- `packages/surface/content/druid_ability_score_improvement_l4.json`
- `packages/surface/content/monk_ability_score_improvement_l4.json`
- `packages/surface/content/ranger_ability_score_improvement_l4.json`
- `packages/surface/content/rogue_ability_score_improvement_l4.json`
- `packages/surface/content/sorcerer_ability_score_improvement_l4.json`
- `packages/surface/content/wizard_ability_score_improvement_l4.json`
- `packages/surface/content/feat_ability_score_improvement.json`

## Current Generated State

Before this task, the nine class-feature records were authored SRD Surface
records with mechanics payloads, but they were absent from the installed Unit
catalog and had no `unit-claims.jsonl` disposition. `UNIT_REPORT.md` therefore
listed them as `unsupported-widening-pressure`.

`feat_ability_score_improvement` already has an `unsupported-profile` claim:
its ability-score mutation is character-creation state outside promoted battle
Unit profile scope. Character Creation also has a generic class-feature
feat-choice boundary and tests showing that a selected ASI feat choice can be
projected into final `CharacterBuild.abilityScores` when a level-4 ASI
class-feature Unit is admitted by a supported progression.

## Decision

Add `unsupported-profile` Unit claims for all nine class-feature records:

- `barbarian_ability_score_improvement_l4`
- `bard_ability_score_improvement_l4`
- `cleric_ability_score_improvement_l4`
- `druid_ability_score_improvement_l4`
- `monk_ability_score_improvement_l4`
- `ranger_ability_score_improvement_l4`
- `rogue_ability_score_improvement_l4`
- `sorcerer_ability_score_improvement_l4`
- `wizard_ability_score_improvement_l4`

These records are not standalone promoted battle Unit profiles. Each class
feature opens a level-4 feat-selection container; selected feat Units own any
executable behavior, and the selected Ability Score Improvement feat's
ability-score mutation is Character Sheet state owned by character creation or
later character advancement.

Do not install these records in the Unit catalog or claim a supported
character-advancement profile in Task 2. If a future all-level
character-advancement lane promotes level-4 progressions, it should batch these
ASI containers together and revise the claims only after checker-readable
catalog admission evidence exists.

## Follow-Up Tasks

None for Loop I. This task closes the loop-owned catalog pressure by recording
that the ASI class-feature records are selection containers, not standalone
promoted battle Unit profiles.

## Review Notes

- RAW and ubiquitous-language pass: the closure matches the SRD class-feature
  and feat text and keeps ASI as Character Sheet progression, not Stat Block or
  battle state.
- Architecture/domain pass: the class-feature Unit remains a selection
  container; selected feat Units and the existing ASI feat record own the
  downstream effect. No duplicate ability-score state or parallel ASI rule
  table was added.
- Connascence pass: the nine claim rows intentionally share one closure reason
  because the SRD text differs only by class name and repeat levels, with
  Rogue's extra level-10 ASI preserved in the authored Surface record and this
  decision artifact. If these class-feature records are later promoted, the
  batch should move together through the character-advancement owner and
  checker evidence.
- Code-review pass: no executable code, casts, assertions, parsers, schemas, or
  runtime reducers changed.

## Verification

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `git diff --check`
- MBT not run: this changes coverage/decision metadata and generated reports,
  with no promoted battle runtime behavior.
