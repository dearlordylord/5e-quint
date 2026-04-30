# Implementation Query 5: CharacterBuild vs In-Play CharacterSheet

## Question

Implement or resolve `FX014` from the FX research table.

`FX014` asks where Temporary Hit Points belong. The important correction is that Temporary Hit Points are not creation/build facts, but they are also not battle-only disposable facts. They persist until depleted or Long Rest, including between battles.

This means the current creation output named `CharacterSheet` is probably misnamed. If it excludes in-play mutable state, it is better modeled as `CharacterBuild`.

## RAW Context

Use the local SRD corpus, not external rules sources.

Relevant RAW:

- `.references/srd-5.2.1/Playing-the-Game.md:788-808`
- especially `.references/srd-5.2.1/Playing-the-Game.md:798`

RAW says Temporary Hit Points last until they are depleted or the creature finishes a Long Rest.

Also check:

- `UBIQUITOUS_LANGUAGE.md`
  - `Temporary Hit Points`
  - `Character Sheet`
  - `Stat Block`
  - `Battle`

## Current Finding

Current file:

- `packages/character-creation-runtime/src/index.ts`

The current type is named `CharacterSheet`, but it contains build/finalization facts and omits current adventuring facts:

```ts
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

It has a source marker near hit points:

```ts
// source marker temp hit points
readonly hitPoints: CharacterSheetHitPoints;
```

Core already models `tempHp` as runtime state and clears it on Long Rest:

- `packages/core/src/machine-types.ts`
- `packages/core/src/machine-helpers.ts`
- `packages/core/src/machine.test.ts`

## Domain Decision

Use this naming split:

```ts
CharacterBuild
// durable build/identity facts from creation and advancement:
// class, species, background, ability scores, max HP, features,
// proficiencies/training, owned equipment/default loadout, resources max/caps

CharacterSheet
// the in-play sheet a player actually uses:
// CharacterBuild plus current adventuring state:
// current HP, Temporary Hit Points, Hit Dice remaining,
// expended resources, active long-lived effects if modeled, etc.
```

The current creation-runtime output should become `CharacterBuild` unless the implementation also introduces the full in-play `CharacterSheet`.

Battle projection should eventually consume the in-play `CharacterSheet`, not the build-only object, because battle needs current HP, Temporary Hit Points, current resource state, and other mutable adventuring facts.

## Goal

Make the temporal boundary explicit.

Do not add `tempHp` to the current build-only object just to silence the source marker.

Instead:

1. Rename the current build-only `CharacterSheet` shape to `CharacterBuild` or equivalent.
2. Rename related build-only nested types where needed.
3. Reserve `CharacterSheet` for in-play/adventuring state, or introduce it now only if the package has enough current-state facts to model it honestly.
4. Document that Temporary Hit Points belong to in-play character state and persist until depleted or Long Rest.

## Research Checklist

Before editing, inspect:

- `packages/character-creation-runtime/src/index.ts`
- `packages/character-creation-runtime/src/index.test.ts`
- current consumers of `CreationFinalizationResult`
- current consumers of `CharacterSheet`
- `packages/core/src/machine-types.ts`
- `packages/core/src/machine-helpers.ts`
- `packages/core/src/character-sheet-creature-projection.ts`
- `packages/core/src/battle-machine-*` projection/start-battle code if relevant
- `UBIQUITOUS_LANGUAGE.md`
- local SRD passages listed above

Search for:

- `CharacterSheet`
- `CharacterSheetAbilityScores`
- `CharacterSheetHitPoints`
- `CharacterSheetHitDiePool`
- `CharacterSheetProficiencies`
- `CharacterSheetFeature`
- `CharacterSheetResource`
- `CharacterSheetLoadout`
- `tempHp`
- `Temporary Hit Points`

Answer these explicitly in notes or commit message:

- Is the current object build-only or an in-play sheet?
- Which fields are build facts?
- Which fields are current adventuring facts?
- Where will Temporary Hit Points persist between battles?
- What object should battle projection consume after the naming split?

## Design Guidance

Prefer this rename family if the current object remains build-only:

```ts
CharacterSheet              -> CharacterBuild
CharacterSheetAbilityScores -> CharacterBuildAbilityScores
CharacterSheetHitPoints     -> CharacterBuildHitPoints
CharacterSheetHitDiePool    -> CharacterBuildHitDiePool
CharacterSheetProficiencies -> CharacterBuildProficiencies
CharacterSheetFeature       -> CharacterBuildFeature
CharacterSheetFeatureGrant  -> CharacterBuildFeatureGrant
CharacterSheetResource      -> CharacterBuildResource
CharacterSheetLoadout       -> CharacterBuildLoadout
```

If that rename is too broad for one pass, prioritize the top-level type and exported finalization result first, then follow up for nested type names. But do not leave a top-level `CharacterSheet` that is known to exclude in-play sheet state.

If introducing an in-play sheet now, model it as a composition rather than duplicating build facts:

```ts
export type CharacterSheet = {
  readonly build: CharacterBuild;
  readonly currentHitPoints: HP;
  readonly temporaryHitPoints: TempHP;
  readonly hitDiceRemaining: readonly CharacterBuildHitDiePool[];
  readonly resources: readonly CharacterSheetResourceState[];
};
```

The exact fields may differ, but avoid redundant state. Do not store facts both on `build` and top-level `CharacterSheet` unless one is a true runtime projection.

## Possible Implementation Paths

### Path A: Rename Build-Only Output

Choose this if the package only owns creation/finalization right now.

Expected edits:

- Rename exported `CharacterSheet` to `CharacterBuild`.
- Rename `CreationFinalizationResult` ready branch from `sheet` to `build`, or decide whether keeping `sheet` as a result property is still acceptable. Prefer `build` for clarity.
- Rename `buildCharacterSheet(...)` to `buildCharacterBuild(...)`, `finalizeCharacterBuild(...)`, or another precise name.
- Update tests and docs for the new terminology.
- Replace the `FX014` source marker with a comment explaining that Temporary Hit Points are in-play `CharacterSheet` state, not build state.

### Path B: Introduce In-Play CharacterSheet

Choose this only if the package has an immediate consumer that needs post-creation state.

Expected edits:

- Add `CharacterSheet` as an in-play state object composed from `CharacterBuild`.
- Include `temporaryHitPoints: TempHP` and current HP state.
- Add a constructor such as `createCharacterSheetFromBuild(build)` that initializes current mutable state.
- Ensure Long Rest or future rest handling has a clear place to clear Temporary Hit Points.
- Keep battle projection pointed at `CharacterSheet` where available.

Do not create a partial in-play sheet if it would immediately duplicate or contradict core runtime state.

## Non-Goals

- Do not implement full rest/adventuring-state mechanics unless already needed.
- Do not change battle MBT or Quint for this naming/modeling pass.
- Do not add Temporary Hit Points to `CharacterBuild`.
- Do not duplicate current HP/temp HP in both battle state and a persistent sheet without a synchronization boundary.
- Do not solve all `FX013` `selections` cleanup here unless it naturally falls out of the rename. `FX013` remains the durable-facts reshape query.

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

- The source marker at `FX014` is resolved in code.
- The build-only creation output is no longer misleadingly named as the full in-play `CharacterSheet`.
- Temporary Hit Points are explicitly documented/modelled as in-play character state that persists until depleted or Long Rest.
- No `tempHp` field is added to `CharacterBuild`.
- Tests and exported result names reflect the chosen terminology.
