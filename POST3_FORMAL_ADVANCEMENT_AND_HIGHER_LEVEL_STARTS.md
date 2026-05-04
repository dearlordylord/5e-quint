# POST3 - Formal Advancement And Higher-Level Starts

Date: 2026-04-11
Status: archived implementation note; superseded as the primary implementation brief by [PRD_CHARACTER_FORMALIZATION.md](./PRD_CHARACTER_FORMALIZATION.md) and the landed formal surface in [character.qnt](./character.qnt)
Depends on: CHAR7, POST1
Blocks: POST4

## RAW And Language Anchors

## Status Note

This note remains the historical closeout for the landed TypeScript advancement helper.

Use [PRD_CHARACTER_FORMALIZATION.md](./PRD_CHARACTER_FORMALIZATION.md) for the current formalization program. That newer PRD preserves this document's core advancement decision while placing it in the newer split architecture:

- `character-creation.qnt` owns level-1 creation and finalized-sheet production;
- `character.qnt` owns advancement semantics over finalized sheets.

Task `CQ2` has now landed the formal advancement owner in [character.qnt](./character.qnt):

- `pIsLegalSheet`
- `pCanAdvance`
- `pAdvanceLevel`

Task `CQ3` then landed the downstream character-to-creature handoff in the same module:

- `pCharacterCreatureProjection`
- `pProjectionToCharConfig`

The existing TypeScript helper in [packages/core/src/character-sheet-advancement.ts](./packages/core/src/character-sheet-advancement.ts) remains a thin adapter over the shared finalized-sheet boundary, and the runtime-side handoff now routes through `packages/core/src/character-sheet-creature-projection.ts:characterSheetCreatureProjection()`.

- `.references/srd-5.2.1/Character-Creation.md`
  - `Level Advancement`
  - `Starting at Higher Levels`
  - `Multiclassing`
- `POST1_FORMAL_CREATION_SEMANTICS.md`
- `UBIQUITOUS_LANGUAGE.md`

The relevant SRD text says:

- when a character gains a level, they choose a class and adjust hit points / Hit Point Dice;
- starting at a higher level uses the same creation steps plus the
  level-advancement rules, with separate RAW setup for starting XP and
  higher-level starting equipment;
- multiclass entry is checked when taking the new class level, not only on the terminal sheet.

## Decision

POST3 keeps higher-level starts on the same owned `CharacterSheet` boundary as level-1 creation.

- There is no bespoke higher-level-start semantic path.
- The durable explanation is:
  1. finalize a legal level-1 sheet;
  2. append one legal advancement entry at a time;
  3. re-finalize through the same canonical draft/sheet path;
  4. apply higher-level-start XP and starting-equipment policy at that boundary.
- Ordered `advancement` remains the single legality history for multiclass entry, subclass timing, feat / ASI timing, and Epic Boon timing.

## Landed Surface

- Added `packages/core/src/character-sheet-advancement.ts`.
- Added `advanceCharacterSheet(sheet, transition)`.
- Kept the implementation thin: it projects the existing finalized sheet back through the owned draft boundary, appends one advancement entry, merges any newly required advancement-owned choices, and reuses `finalizeCharacterDraft()`.
- Did not add a second advancement validator or a higher-level-start-only builder.

This preserves the POST1 boundary:

- `CharacterSheet` remains the canonical authored record.
- Runtime remains downstream projection from the finalized sheet.
- Advancing a character reuses the same legality path as direct finalization instead of creating a parallel semantic model.

## Verification Notes

- Focused tests prove repeated legal advancement reaches the same sheet as direct higher-level authorship.
- Focused tests prove illegal subclass timing is still rejected through the advancement helper.
- Focused tests prove multiclass continuation uses the same sheet-to-sheet transition path.
- Focused tests prove contradictory finalized sheets are rejected when replayed finalized semantics disagree with sheet-owned fields.
- Focused tests prove spellcasting level-ups succeed only when the transition supplies newly required spellcasting choices.
- `/simplify` round 1: removed the stale `classLevels` carry-forward from sheet-to-transition replay and derived the transition draft's class levels directly from the appended ordered advancement list.
- `/simplify` round 2: tightened finalized-sheet legality so `pIsLegalSheet` replays the canonical finalization path and compares the resulting `CharacterSheet` against the input instead of checking draft completeness alone.
