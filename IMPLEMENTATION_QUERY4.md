# Implementation Query 4: Durable Character Sheet Facts

## Question

Implement or resolve `FX013` from the FX research table.

`FX013` asks whether `CharacterSheet.selections` is the wrong temporal concept. Ten months into a campaign, a reader should not have to ask "selections of what?" when looking at a durable character sheet.

This is a modeling task. Do not just rename `selections` to another vague noun. Reshape the sheet so durable facts are named as durable facts.

## Current Finding

Current file:

- `packages/character-creation-runtime/src/index.ts`

The current durable sheet still stores creation-finalization state as a bundle:

```ts
export type FinalizedCharacterSelections = {
  readonly primaryClass: UnitRecord["id"];
  readonly advancement: CharacterAdvancementSelection;
  readonly background: UnitRecord["id"];
  readonly abilityScoreGeneration: AbilityScoreGenerationSelection;
  readonly backgroundAbilityScoreIncrease: BackgroundAbilityScoreIncreaseSelection;
  readonly species: UnitRecord["id"];
  readonly languages: CharacterStartingLanguages;
  readonly alignment: CharacterAlignment;
  readonly choices: readonly CharacterChoiceSelection[];
  readonly equipment: CharacterEquipmentSelection;
};

export type CharacterSheet = {
  readonly selections: FinalizedCharacterSelections;
  readonly unitRefs: readonly UnitRef[];
  readonly abilityScores: CharacterSheetAbilityScores;
  readonly hitPoints: CharacterSheetHitPoints;
  readonly proficiencies: CharacterSheetProficiencies;
  readonly armorTraining: readonly ArmorTrainingCategory[];
  readonly features: readonly CharacterSheetFeature[];
  readonly resources: readonly CharacterSheetResource[];
  readonly equipment: {
    readonly ownedUnitIds: readonly UnitRecord["id"][];
    readonly loadout: CharacterSheetLoadout;
  };
};
```

Recent merged work already changed related temporal/modeling issues:

- `FX005`: `CharacterSheetAbilityScores` is now the executable `AbilityScoreAssignment`, not `{ base, backgroundIncrease, final }`.
- `FX010`: feature provenance is now explicit `grant` records, not guessed `source` labels.
- `FX012`: `sourceDraftId` was removed from durable sheet state.

Build on those changes.

## Legacy Pattern To Check

The older core character model did not use Units, so do not copy its exact field types. But it did have a useful lifecycle boundary:

- `packages/core/src/character-domain-model.ts`
  - `CharacterDraft` is an incomplete editing/workflow shape.
  - `CharacterSheet` stores named durable facts directly: `primaryClass`, `advancement`, `background`, `abilityScores`, `species`, `languages`, `choices`, `equipment`, `spellcasting`.
- `packages/core/src/character-draft-analysis.ts`
  - finalization converts draft data into durable sheet facts, not one `selections` blob.
- `packages/core/src/character-sheet-creature-projection.ts`
  - battle projection consumes durable sheet facts directly.
- `packages/core/src/character-sheet-advancement.ts`
  - when an advancement workflow needs draft mechanics, `characterDraftFromSheet(...)` reconstructs a draft-shaped workflow from the sheet and checks replay consistency.

Use this as the temporal pattern:

```ts
CharacterDraftSelections  // creation workflow, holes/fills, incomplete state
CharacterSheet            // durable facts with ten-month names
draftFromSheet(...)       // only for re-edit/advancement workflows
battleProjection(sheet)   // consumes durable facts, not creation selections
```

## Goal

Remove `CharacterSheet.selections` as durable sheet state.

Promote the facts currently hidden inside `FinalizedCharacterSelections` into appropriately named durable sheet fields, or move them into an explicitly temporal/audit/replay field only if there is a concrete workflow that needs that data.

The durable sheet should read like a character sheet months later, not like a completed form submission.

## Research Checklist

Before editing, inspect:

- `packages/character-creation-runtime/src/index.ts`
- `packages/character-creation-runtime/src/index.test.ts`
- `packages/core/src/character-domain-model.ts`
- `packages/core/src/character-draft-analysis.ts`
- `packages/core/src/character-sheet-advancement.ts`
- `packages/core/src/character-sheet-creature-projection.ts`
- `UBIQUITOUS_LANGUAGE.md`, especially `Character Sheet`, `Stat Block`, and character creation terms

Search for all uses of:

- `FinalizedCharacterSelections`
- `CharacterSheet["selections"]`
- `.selections`
- `selectedChoiceUnitIds`
- `selectedSkillProficiencies`
- `selectedToolProficiencies`

Answer these explicitly in notes or commit message:

- Which facts are durable character facts?
- Which facts are only creation workflow inputs?
- Which facts are needed for future advancement/replay?
- Which facts are executable battle/creature projection inputs?
- Does keeping a creation receipt have a known workflow, or is it just convenience?

## Design Guidance

Prefer a durable `CharacterSheet` shape along these lines, using Unit ids where this package already uses Units:

```ts
export type CharacterSheet = {
  readonly primaryClass: UnitRecord["id"];
  readonly advancement: CharacterAdvancementSelection;
  readonly background: UnitRecord["id"];
  readonly species: UnitRecord["id"];
  readonly originLanguages: CharacterStartingLanguages;
  readonly alignment: CharacterAlignment;
  readonly choices: readonly CharacterChoiceSelection[];
  readonly unitRefs: readonly UnitRef[];
  readonly abilityScores: CharacterSheetAbilityScores;
  readonly hitPoints: CharacterSheetHitPoints;
  readonly proficiencies: CharacterSheetProficiencies;
  readonly armorTraining: readonly ArmorTrainingCategory[];
  readonly features: readonly CharacterSheetFeature[];
  readonly resources: readonly CharacterSheetResource[];
  readonly equipment: CharacterSheetEquipment;
};
```

The exact names can differ, but avoid `selections` for durable sheet state.

Use domain names:

- `primaryClass`, not `selectedClass`;
- `background`, not `selectedBackground`;
- `species`, not `selectedSpecies`;
- `originLanguages` or `startingLanguages` if the field is only the origin language choice, not total known languages;
- `choices` only if it means durable build choices that remain meaningful after creation. If not, rename/split it.

Keep `FinalizedCharacterSelections` only if it remains useful as an internal finalization boundary. If retained, it should not be a public durable sheet field.

## Important Temporal Decisions

`abilityScoreGeneration` and `backgroundAbilityScoreIncrease` are not executable ability scores after `FX005`; they are creation/origin derivation facts.

Decide whether to:

1. Keep them as explicit durable origin facts with precise names, for example `abilityScoreOrigin`, if future advancement/replay needs them.
2. Keep them only inside an explicitly named creation receipt/audit field.
3. Drop them from `CharacterSheet` if no durable workflow uses them.

Do not hide them inside a vague `selections` blob.

Similarly, `choices` may include durable build choices such as skill choices, fighting style choices, tool choices, and equipment choices. Keep them only if they remain meaningful as build facts, and consider a clearer type/name if the current `CharacterChoiceSelection` is too hole/fill-shaped.

## Possible Implementation Paths

### Path A: Promote Durable Fields Directly

Expected edits:

- Remove `readonly selections: FinalizedCharacterSelections` from `CharacterSheet`.
- Add direct durable fields for class/background/species/advancement/languages/alignment and any retained build-choice facts.
- Update `buildCharacterSheet` to construct those fields directly from the finalized selections input.
- Update helper functions that currently take `FinalizedCharacterSelections` if they now should read from `CharacterSheet` or from local finalization input.
- Update tests to assert the durable field names.

This is likely the best first step.

### Path B: Split Durable Sheet And Creation Receipt

Choose this if replay/audit is a first-class workflow now.

Expected edits:

- Remove `selections` from the executable sheet facts.
- Add a clearly named field such as `creationReceipt` or `creationOrigin`, with a type that says it is audit/replay data.
- Keep executable/durable facts as direct fields.
- Ensure battle/projection helpers do not consume the receipt when they should consume durable facts.

Use this only if there is a concrete workflow that needs a receipt. Do not add audit metadata "just in case."

### Path C: Add Draft Reconstruction Later

If advancement/re-editing is not currently needed in this package, do not build a full `characterDraftFromSheet(...)` now. Leave the sheet shape ready for it.

If implementation uncovers an immediate need, follow the legacy pattern:

- construct a draft-shaped workflow from durable facts;
- replay/finalize it;
- compare with the existing sheet before applying advancement.

## Non-Goals

- Do not port the legacy non-Unit character model into this package.
- Do not redesign all advancement rules.
- Do not solve `FX014` temporary HP here.
- Do not reintroduce `sourceDraftId`.
- Do not run MBT for this modeling refactor.
- Do not keep `selections` only because it is convenient for helper functions.

## Verification

Run the focused creation-runtime tests:

```sh
pnpm --filter @dnd/character-creation-runtime exec vitest run src/index.test.ts
```

If exported types changed broadly, also run:

```sh
pnpm --filter @dnd/character-creation-runtime typecheck
```

Note: full `@dnd/character-creation-runtime` typecheck/test may currently fail if `@firfi/quint-connect` / `zod` are unavailable for the MBT file. Do not treat that as caused by this task unless your changes touch the MBT setup.

## Acceptance Criteria

- The source marker at `FX013` is resolved in code.
- `CharacterSheet` no longer has a durable field named `selections`.
- Durable sheet fields use names that remain meaningful ten months after character creation.
- Creation workflow state remains in `CharacterDraft` / finalization internals unless a concrete audit/replay field is intentionally introduced.
- Battle/creature-facing data can be read from durable sheet facts, not from a creation-form blob.
- Tests assert the new sheet shape.
