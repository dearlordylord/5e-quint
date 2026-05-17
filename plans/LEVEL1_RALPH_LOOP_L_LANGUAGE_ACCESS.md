# Level 1 Ralph Loop L - Character Language Access

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L1L-LANGUAGE-ACCESS-PRECHECK",
      "status": "done",
      "title": "Druidic And Thieves Cant Language Access Precheck"
    },
    {
      "number": 2,
      "id": "L1L-CHARACTER-BUILD-LANGUAGE-FACTS",
      "status": "ready-for-research",
      "title": "CharacterBuild Class Granted Language Facts"
    },
    {
      "number": 3,
      "id": "L1L-ROGUE-EXTRA-LANGUAGE-CHOICE",
      "status": "ready-for-research",
      "title": "Rogue Thieves Cant Extra Language Choice"
    },
    {
      "number": 4,
      "id": "L1L-CHARACTER-SHEET-LANGUAGE-PERSISTENCE",
      "status": "ready-for-research",
      "title": "Character Sheet Language Persistence"
    },
    {
      "number": 5,
      "id": "L1L-DRUIDIC-SPELL-ACCESS-EVIDENCE",
      "status": "ready-for-research",
      "title": "Druidic Speak With Animals Spell Access Evidence"
    },
    {
      "number": 6,
      "id": "L1L-COVERAGE-ACCOUNTING-REFRESH",
      "status": "ready-for-research",
      "title": "Language Access Coverage Accounting Refresh"
    }
  ]
}
-->

This lane owns the level-1 character-owned language facts behind
`druid_druidic` and `rogue_thieves_cant`. It exists because those Units are not
pure runtime-detached table adjudication: the character really knows languages,
and Druidic also grants always-prepared Speak with Animals Spell Access. The
hidden-message, deciphering, and communication-adjudication parts remain
runtime-detached table education and must not become battle/runtime behavior.

Do not edit `plans/ACTIVE_PLAN.md`.

## Authority

- RAW:
  - `.references/srd-5.2.1/Classes/Druid.md`, Level 1: Druidic.
  - `.references/srd-5.2.1/Classes/Rogue.md`, Level 1: Thieves' Cant.
  - `.references/srd-5.2.1/Character-Creation.md`, Choose Languages and the
    Standard/Rare Languages tables.
- Ubiquitous language:
  - `UBIQUITOUS_LANGUAGE.md` for Character Sheet and Spell Access.
- Surface inputs:
  - `packages/surface/content/druid_druidic.json`.
  - `packages/surface/content/rogue_thieves_cant.json`.

No companion/familiar behavior is in scope.

## Worktree Safety Prefix

Every Ralph prompt for this loop must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`. You are not alone in the codebase:
> do not revert edits made by others, and adapt your implementation around
> existing changes. Do not edit `plans/ACTIVE_PLAN.md`.

## Review Loop

Use implementer, reviewer, handback until `accept`, then decider. The reviewer
loop must include RAW traceability, ubiquitous-language/domain-language,
architecture/connascence, and code-review passes. Fix every reasonable finding,
explicitly reject only findings with a concrete reason, and repeat until no
reasonable findings remain.

Reviewers should reject:

- adding Druidic or Thieves' Cant into `originLanguages`;
- modeling hidden-message spotting, deciphering, or Cant communication content
  as runtime behavior;
- broad battle-runtime changes;
- duplicate language state when one source/projection can be derived;
- support claims that outpace character-creation and character-sheet evidence.

## Owned Surface

Primary write scope:

- `packages/character-creation-runtime/src/types.ts`;
- `packages/character-creation-runtime/src/discovery.ts`;
- `packages/character-creation-runtime/src/fill-reducer.ts`;
- `packages/character-creation-runtime/src/draft.ts`;
- `packages/character-creation-runtime/src/finalization.ts`;
- focused `packages/character-creation-runtime/src/*.test.ts` coverage;
- `packages/character-sheet-runtime/src/index.ts`;
- focused `packages/character-sheet-runtime/src/*.test.ts` coverage;
- `packages/shared/src/game-facts.ts` only if a canonical language id/display
  bridge is needed;
- `packages/surface/src/surface/*` only if a narrow typed language grant parser
  is needed;
- `plans/unit-profile-coverage/*` evidence and generated reports.

Avoid D's recursive frontier files except generated coverage artifacts shared by
the checker. Avoid battle-runtime/QNT work unless a test proves a narrow
character-sheet Spell Access projection already depends on it.

## Verification

Every implementation task runs:

- relevant focused package tests;
- package typecheck for touched packages when dependencies are available;
- `pnpm unit-profile-coverage:check --write`;
- `pnpm unit-profile-coverage:check`;
- `git diff --check`;
- reviewer-loop convergence.

Do not run battle-runtime MBT for this lane unless the implementation actually
changes battle-runtime behavior. This lane should normally not do that.

## Task 1 Precheck Result

`plans/unit-profile-coverage/L1L_LANGUAGE_ACCESS_PRECHECK.md` is the durable
Task 1 output. It concludes that no battle-runtime behavior is needed for
`druid_druidic` or `rogue_thieves_cant`.

Later tasks should keep `originLanguages` as only Common plus two Standard
Languages and add a required `classFeatureLanguages` projection for
class-feature language facts. The projection should distinguish fixed grants
from feature choices, keep `sourceUnitId`, use shared `Language` values, and
centralize a closed Surface `languageId` to `Language` parser/codec before
finalization or stored-build parsing consumes authored grants.

## Task Table

| Order | Task | Status | Blocks On | Output |
| ---: | --- | --- | --- | --- |
| 1 | L1L-LANGUAGE-ACCESS-PRECHECK - Druidic And Thieves Cant Language Access Precheck | done | none | `plans/unit-profile-coverage/L1L_LANGUAGE_ACCESS_PRECHECK.md` records the exact implementation shape and gap list for class-granted languages, extra language choice, Druidic Spell Access, and runtime-detached residuals |
| 2 | L1L-CHARACTER-BUILD-LANGUAGE-FACTS - CharacterBuild Class Granted Language Facts | ready-for-research | 1 | class-granted language facts represented separately from origin languages and derived from authored feature grants |
| 3 | L1L-ROGUE-EXTRA-LANGUAGE-CHOICE - Rogue Thieves Cant Extra Language Choice | ready-for-research | 1-2 | one additional language choice from Character Creation language tables, without duplicating fixed or origin languages |
| 4 | L1L-CHARACTER-SHEET-LANGUAGE-PERSISTENCE - Character Sheet Language Persistence | ready-for-research | 2-3 | stored CharacterBuild parser/sheet creation preserves origin and class-granted language facts distinctly |
| 5 | L1L-DRUIDIC-SPELL-ACCESS-EVIDENCE - Druidic Speak With Animals Spell Access Evidence | ready-for-research | 2,4 | Druidic always-prepared Speak with Animals Spell Access has focused character-sheet evidence or a precise missing-owner fix |
| 6 | L1L-COVERAGE-ACCOUNTING-REFRESH - Language Access Coverage Accounting Refresh | ready-for-research | 2-5 | `druid_druidic` and `rogue_thieves_cant` coverage wording matches implemented character-owned facts plus detached residuals |

## Task Details

### Task 1 - L1L-LANGUAGE-ACCESS-PRECHECK - Druidic And Thieves Cant Language Access Precheck

Status: `done`

Inputs:

- RAW and ubiquitous-language sources listed in Authority.
- `packages/shared/src/game-facts.ts`.
- `packages/surface/content/druid_druidic.json`.
- `packages/surface/content/rogue_thieves_cant.json`.
- `packages/character-creation-runtime/src/types.ts`.
- `packages/character-creation-runtime/src/finalization.ts`.
- `packages/character-sheet-runtime/src/index.ts`.
- current coverage rows for `druid_druidic` and `rogue_thieves_cant`.

Outputs:

- create `plans/unit-profile-coverage/L1L_LANGUAGE_ACCESS_PRECHECK.md`;
- state the exact CharacterBuild field shape or derivation strategy before
  implementation;
- prove `originLanguages` remains only Common plus two standard creation
  languages;
- list which Surface grants are character-owned and which residuals are
  runtime-detached table adjudication;
- list focused tests to add in later tasks.

Acceptance:

- the precheck identifies no battle-runtime behavior to implement;
- the proposed type shape makes duplicate/contradictory language ownership
  unrepresentable or locally rejected at parse/finalization boundaries;
- RAW anchors and ubiquitous-language terms are cited.

Result:

- `plans/unit-profile-coverage/L1L_LANGUAGE_ACCESS_PRECHECK.md` records the
  accepted RAW/domain precheck output for later implementation tasks.

### Task 2 - L1L-CHARACTER-BUILD-LANGUAGE-FACTS - CharacterBuild Class Granted Language Facts

Status: `ready-for-research`

Add durable class-granted language facts to finalized CharacterBuild output
without changing `originLanguages`. The implementation should derive fixed
language facts from installed class-feature grants such as `grant_language`
for `druid_druidic` and `rogue_thieves_cant`, preserving source Unit identity
where that prevents ambiguous ownership.

Inputs:

- Task 1 precheck output:
  `plans/unit-profile-coverage/L1L_LANGUAGE_ACCESS_PRECHECK.md`.
- `packages/character-creation-runtime/src/types.ts`.
- `packages/character-creation-runtime/src/finalization.ts`.
- Surface `grant_language` records.

Outputs:

- CharacterBuild exposes class-granted language facts separately from
  `originLanguages`;
- Druid level 1 finalization includes Druidic from `druid_druidic`;
- Rogue level 1 finalization includes Thieves' Cant from
  `rogue_thieves_cant`;
- focused character-creation tests prove both facts and prove origin languages
  stay unchanged.

Acceptance:

- no duplicate field stores the same source fact twice;
- unsupported/malformed authored language grants fail through typed issues or
  are excluded by an explicit supported gate, not silently ignored;
- no hidden-message or communication adjudication state is added.

Task 1 shape to consume:

- add a required `classFeatureLanguages` field on `CharacterBuild`;
- represent fixed `grant_language` facts as `classFeatureLanguageGrant` and
  later chosen feature languages as `classFeatureLanguageChoice`;
- keep `sourceUnitId` and canonical shared `Language` values;
- centralize Surface `languageId` parsing so unsupported ids become typed
  issues rather than silently skipped facts.

### Task 3 - L1L-ROGUE-EXTRA-LANGUAGE-CHOICE - Rogue Thieves Cant Extra Language Choice

Status: `ready-for-research`

Implement the additional Thieves' Cant language choice as a real character
creation choice sourced from the Character Creation language tables. Do not
reuse the top-level `draft.languages` hole; that hole is only Common plus two
standard origin languages.

Inputs:

- Task 1 precheck output:
  `plans/unit-profile-coverage/L1L_LANGUAGE_ACCESS_PRECHECK.md`.
- Task 2 language fact shape.
- `packages/character-creation-runtime/src/discovery.ts`.
- `packages/character-creation-runtime/src/fill-reducer.ts`.
- `packages/character-creation-runtime/src/finalization.ts`.
- `packages/shared/src/game-facts.ts`.

Outputs:

- a unit-choice hole for the Rogue extra language when the selected class owns
  `rogue_thieves_cant`;
- options from the Character Creation language tables, excluding invalid
  duplicates such as fixed Thieves' Cant and already-known final languages;
- finalized CharacterBuild includes the selected extra language as a
  class-feature-owned language fact;
- focused tests cover discovery, fill rejection, finalization, and no pollution
  of `originLanguages`.

Acceptance:

- no second spelling for an empty language list;
- option ids are typed/canonical and not ad hoc strings if the repo already has
  a usable language vocabulary;
- final known-language duplicates are rejected or made unrepresentable.

### Task 4 - L1L-CHARACTER-SHEET-LANGUAGE-PERSISTENCE - Character Sheet Language Persistence

Status: `ready-for-research`

Teach the Character Sheet stored-build parser and sheet creation path to retain
the new CharacterBuild language facts distinctly from `originLanguages`.

Inputs:

- Tasks 2-3 implementation.
- `packages/character-sheet-runtime/src/index.ts`.

Outputs:

- stored CharacterBuild parsing accepts valid class-granted language facts;
- invalid class-granted language facts fail with typed Character Sheet issues;
- sheet creation preserves origin and class-granted language facts separately;
- focused character-sheet tests cover Druid and Rogue examples.

Acceptance:

- parser does not accept contradictory language source facts;
- no table-adjudication fields are introduced;
- existing CharacterBuild fixtures are updated only where required by the new
  non-optional/empty-state semantics.

### Task 5 - L1L-DRUIDIC-SPELL-ACCESS-EVIDENCE - Druidic Speak With Animals Spell Access Evidence

Status: `ready-for-research`

Prove or repair the Druidic always-prepared Speak with Animals Spell Access at
the character-sheet boundary. This is Spell Access evidence, not battle-runtime
execution of Speak with Animals' social conversation.

Inputs:

- Tasks 2 and 4.
- `packages/character-sheet-runtime/src/index.ts`.
- `packages/surface/content/druid_druidic.json`.
- existing feature-prepared spell access helpers/tests.

Outputs:

- focused evidence that a Druid build owning `druid_druidic` has
  feature-prepared `speak_with_animals` Spell Access;
- evidence that this does not create a battle-runtime profile for the
  conversation/adjudication part of Speak with Animals;
- narrow parser/projection fix only if current code lacks the character-sheet
  Spell Access.

Acceptance:

- Spell Access source remains tied to the feature Unit;
- no broad spellcasting or battle-runtime behavior is added;
- Book of Shadows/duplicate prepared-spell checks still treat feature-prepared
  access correctly.

### Task 6 - L1L-COVERAGE-ACCOUNTING-REFRESH - Language Access Coverage Accounting Refresh

Status: `ready-for-research`

Refresh the coverage/evidence wording after the implementation proves the
character-owned facts.

Inputs:

- Tasks 2-5 implementation.
- `plans/unit-profile-coverage/unit-claims.jsonl`.
- `plans/unit-profile-coverage/unit-evidence.jsonl`.
- generated coverage reports.

Outputs:

- `druid_druidic` remains
  `closed-character-fact-and-runtime-detached-split`, with evidence for
  Druidic known-language and Speak with Animals Spell Access;
- `rogue_thieves_cant` remains
  `closed-character-fact-and-runtime-detached-split`, with evidence for
  Thieves' Cant and the extra language choice;
- generated coverage artifacts are refreshed.

Acceptance:

- coverage wording no longer overclaims character-owned facts that tests do not
  prove;
- strict level-1 target closure remains at 100%;
- `pnpm unit-profile-coverage:check` passes after `--write`.
