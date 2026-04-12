# POST3 - Formal Advancement And Higher-Level Starts

Date: 2026-04-11
Status: implemented
Depends on: CHAR7, POST1
Blocks: POST4

## RAW And Language Anchors

- `.references/srd-5.2.1/Character-Creation.md`
  - `Level Advancement`
  - `Starting at Higher Levels`
  - `Multiclassing`
- `POST1_FORMAL_CREATION_SEMANTICS.md`
- `UBIQUITOUS_LANGUAGE.md`

The relevant SRD text says:

- when a character gains a level, they choose a class and adjust hit points / Hit Point Dice;
- starting at a higher level uses the same creation steps plus the level-advancement rules;
- multiclass entry is checked when taking the new class level, not only on the terminal sheet.

## Decision

POST3 keeps higher-level starts on the same owned `CharacterSheet` boundary as level-1 creation.

- There is no bespoke higher-level-start semantic path.
- The durable explanation is:
  1. finalize a legal level-1 sheet;
  2. append one legal advancement entry at a time;
  3. re-finalize through the same canonical draft/sheet path.
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
- `/simplify` round 1: kept the helper as a thin wrapper over `finalizeCharacterDraft()` and removed any temptation to duplicate advancement legality.
- `/simplify` round 2: kept choice updates patch-shaped so callers only provide newly required advancement-owned facts instead of rebuilding the sheet.
