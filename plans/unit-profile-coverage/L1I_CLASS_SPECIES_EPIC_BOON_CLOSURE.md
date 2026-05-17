# L1I Class Species Epic Boon Closure

Task 3 closes the six loop-owned level-19 Epic Boon class-feature records as
later-level feat-selection containers. No runtime behavior, Surface schema,
Unit catalog admission, or selected feat implementation changed.

## RAW Sources

- `.references/srd-5.2.1/Classes/Bard.md:131-133`: Bard level-19 Epic
  Boon grants an Epic Boon feat or another qualifying feat; Boon of Spell
  Recall is recommended.
- `.references/srd-5.2.1/Classes/Cleric.md:134-136`: Cleric level-19 Epic
  Boon grants the same feat choice; Boon of Fate is recommended.
- `.references/srd-5.2.1/Classes/Druid.md:164-166`: Druid level-19 Epic
  Boon grants the same feat choice; Boon of Dimensional Travel is recommended.
- `.references/srd-5.2.1/Classes/Fighter.md:120-122`: Fighter level-19 Epic
  Boon grants the same feat choice; Boon of Combat Prowess is recommended.
- `.references/srd-5.2.1/Classes/Monk.md:176-178`: Monk level-19 Epic
  Boon grants the same feat choice; Boon of Irresistible Offense is
  recommended.
- `.references/srd-5.2.1/Classes/Paladin.md:164-166`: Paladin level-19 Epic
  Boon grants the same feat choice; Boon of Truesight is recommended.
- `.references/srd-5.2.1/Feats.md:5-17`: feat categories define Origin,
  General, Fighting Style, and Epic Boon choices, with prerequisites and
  benefits belonging to the selected feat.
- `.references/srd-5.2.1/Feats.md:117-191`: Epic Boon feats carry their own
  prerequisites and benefits.
- `UBIQUITOUS_LANGUAGE.md:336`: Epic Boon is a level-19 class feature that
  grants an Epic Boon feat or another qualifying feat.

## Surface Records Read

- `packages/surface/content/bard_epic_boon.json`
- `packages/surface/content/cleric_epic_boon.json`
- `packages/surface/content/druid_epic_boon.json`
- `packages/surface/content/fighter_epic_boon.json`
- `packages/surface/content/monk_epic_boon.json`
- `packages/surface/content/paladin_epic_boon.json`
- `packages/surface/content/feat_boon_of_combat_prowess.json`

## Current Generated State

Before this task, the six Epic Boon class-feature records were authored SRD
Surface records with `grant_feat` mechanics over all four feat categories, but
they were absent from the installed Unit catalog and had no
`unit-claims.jsonl` disposition. `UNIT_REPORT.md` therefore listed them as
`unsupported-widening-pressure`.

`feat_boon_of_combat_prowess` already has a supported selected Unit profile for
its attack-roll miss-to-hit replacement behavior. The other SRD Epic Boon feat
choices are not authored as selected Unit profiles in this repository yet, and
the Epic Boon class-feature records cannot honestly stand in for those selected
feat executions.

## Decision

Add `unsupported-profile` Unit claims for all six class-feature records:

- `bard_epic_boon`
- `cleric_epic_boon`
- `druid_epic_boon`
- `fighter_epic_boon`
- `monk_epic_boon`
- `paladin_epic_boon`

These records are not standalone promoted battle Unit profiles. Each class
feature opens a level-19 feat-selection container; selected feat Units own any
executable behavior. The existing `feat_boon_of_combat_prowess` Unit owns the
currently supported Boon of Combat Prowess execution, while any selected
Epic Boon, General, Fighting Style, or Origin feat choice must carry its own
Unit profile support and evidence.

Do not install these class-feature records in the Unit catalog or claim a
supported level-19 character-advancement profile in Task 3. If a future
all-level character-advancement lane promotes level-19 progressions, it should
batch these Epic Boon containers together and revise the claims only after
checker-readable catalog admission evidence exists.

## Follow-Up Tasks

None for Loop I. This task closes the loop-owned catalog pressure by recording
that the Epic Boon class-feature records are later-level selection containers,
not standalone promoted battle Unit profiles.

## Review Notes

- RAW and ubiquitous-language pass: the closure matches the SRD class-feature
  and feat text. The recommended boon named by each class is advisory; the
  executable rule belongs to the selected feat for which the character
  qualifies.
- Architecture/domain pass: the class-feature Unit remains a selection
  container. Selected feat Units own execution, and level-19 character
  advancement admission remains a separate owner.
- Connascence pass: the six claim rows intentionally share one closure reason
  because the SRD text differs only by class name and recommendation. If these
  records are later promoted, the batch should move together through the
  character-advancement owner and checker evidence.
- Code-review pass: no executable code, casts, assertions, parsers, schemas, or
  runtime reducers changed.

## Verification

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `git diff --check`
- MBT not run: this changes coverage/decision metadata and generated reports,
  with no promoted battle runtime behavior.
