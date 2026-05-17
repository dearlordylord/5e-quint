# L1I Class Species Bard Knowledge Feature Closure

Task 4 closes the three loop-owned Bard knowledge feature records as explicit
unsupported-profile dispositions. No runtime behavior, Surface schema, Unit
catalog admission, or selected spell implementation changed.

## RAW Sources

- `.references/srd-5.2.1/Classes/Bard.md:99-103`: Jack of All Trades adds
  half Proficiency Bonus, rounded down, to an Ability Check that uses a skill
  proficiency the Bard lacks and that otherwise does not use Proficiency Bonus.
- `.references/srd-5.2.1/Classes/Bard.md:135-137`: Words of Creation always
  prepares Power Word Heal and Power Word Kill and lets either spell target a
  second creature within 10 feet of the first target.
- `.references/srd-5.2.1/Classes/Bard.md:328-330`: College of Lore Bonus
  Proficiencies grants proficiency with three skills of the character's choice.
- `UBIQUITOUS_LANGUAGE.md:7`: Ability Check is the canonical d20 roll term;
  "skill check" is not a separate roll type.
- `UBIQUITOUS_LANGUAGE.md:57-68`: Proficiency Bonus, Proficiency Level, and
  Skill define the proficiency facts Jack of All Trades and Bonus
  Proficiencies depend on.
- `UBIQUITOUS_LANGUAGE.md:320-321`: Character Sheet is the durable PC owner for
  class-derived proficiencies and spell access, distinct from authored Stat
  Blocks.

## Surface Records Read

- `packages/surface/content/bard_bonus_proficiencies.json`
- `packages/surface/content/bard_jack_of_all_trades.json`
- `packages/surface/content/bard_words_of_creation.json`
- `packages/surface/content/power_word_heal.json`
- `packages/surface/content/power_word_kill.json`

## Existing Owners Read

- `packages/surface/src/surface/unit-catalog.ts:8-18` and
  `packages/surface/src/surface/unit-catalog.ts:251-282`: the installed SRD
  Unit catalog includes `class_bard`, `bard_bardic_inspiration`, and
  `bard_cutting_words`, but not the three Task 4 records.
- `packages/character-creation-runtime/src/discovery.ts:1284-1286` and
  `packages/character-creation-runtime/src/discovery.ts:1438-1495`: generic
  class-feature proficiency grants already discover character-creation choice
  holes.
- `packages/character-creation-runtime/src/finalization.ts:659-686`: finalized
  builds derive selected proficiency choices and selected class-choice feature
  facts from supported selections.
- `packages/character-creation-runtime/src/index.test.ts:4890-5060`: focused
  coverage proves a class-feature skill proficiency grant can be discovered,
  filled, finalized, and projected into CharacterBuild proficiencies.
- `packages/v0/src/features/class-bard.ts:49-55`,
  `packages/v0/src/features/class-bard.ts:114-127`: legacy helpers expose
  Jack of All Trades, Words of Creation, and Lore Bonus Proficiencies level
  predicates, but these are not checker-readable promoted Unit profile owners.

## Current Generated State

Before this task, the three Bard records were authored SRD Surface records with
mechanics payloads, but they were absent from the installed Unit catalog and had
no `unit-claims.jsonl` disposition. `UNIT_REPORT.md` therefore listed them as
`unsupported-widening-pressure`.

`power_word_heal` and `power_word_kill` are authored spell records, but
`UNIT_REPORT.md` still classifies them as `srd-candidate` spell pressure rather
than supported Power Word invocation profiles. Words of Creation cannot
honestly claim execution for its second-target rider until those spell
invocation boundaries exist.

## Decision

Add `unsupported-profile` Unit claims for:

- `bard_bonus_proficiencies`
- `bard_jack_of_all_trades`
- `bard_words_of_creation`

`bard_bonus_proficiencies` is a College of Lore subclass proficiency-choice
fact. Character creation already has the generic proficiency-grant discovery
and finalization owner, but this specific absent level-3 subclass feature is
not a standalone promoted battle Unit profile.

`bard_jack_of_all_trades` is a level-2 passive Ability Check proficiency
supplement. Its authored Surface mechanics are not precise enough for a
supported profile because the RAW gate depends on lacking the relevant skill
proficiency and not otherwise using Proficiency Bonus. Do not admit it as a
generic `modify_roll_numeric` Ability Check modifier.

`bard_words_of_creation` is level-20 Character Sheet spell access plus a
Power Word casting rider. The always-prepared spell facts belong to future
level-20 spell-access support, and the second-target rider belongs with future
Power Word spell invocation support. The class-feature record should not stand
in for either spell's execution.

## Follow-Up Tasks

- Add a future supported-profile task for `bard_jack_of_all_trades` only after
  the owner can model a skill-proficiency-aware Ability Check half-Proficiency
  Bonus projection. The smallest task should decide whether this belongs in
  Character Sheet ability-check projection, battle-runtime roll-mode
  projection, or a shared algebra consumed by both.
- Add a deferred high-level spell task for `bard_words_of_creation` after
  `power_word_heal` and `power_word_kill` have supported spell invocation
  profiles. That task should model the second-target rider as spell-casting
  behavior, not as duplicate state on the Bard feature record.

No Loop I follow-up is needed for `bard_bonus_proficiencies`; future subclass
progression/catalog admission can reuse the existing class-feature
proficiency-choice owner.

## Review Notes

- RAW and ubiquitous-language pass: the closure uses Ability Check rather than
  "skill check", preserves Proficiency Bonus/Skill terminology, and keeps
  Character Sheet facts separate from Stat Block facts.
- Architecture/domain pass: no lower-layer workaround or parallel state was
  added. The three records stay authored Surface facts with checker-readable
  Unit dispositions, while runtime promotion is deferred to the correct owner.
- Connascence pass: the repeated Unit ids are localized to `unit-claims.jsonl`,
  this decision artifact, and generated coverage output. The three claim
  reasons are intentionally distinct because the records represent different
  domain shapes: proficiency choice, passive Ability Check formula, and
  high-level spell access plus spell rider.
- Code-review pass: no executable code, casts, assertions, parsers, schemas, or
  runtime reducers changed.

## Verification

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `git diff --check`
- MBT not run: this changes coverage/decision metadata and generated reports,
  with no promoted battle runtime behavior.
