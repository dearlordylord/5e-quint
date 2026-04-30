# Implementation Query 3: Ability Score Derivation Shape

## Question

Implement or resolve `FX005` from the FX research table.

`FX005` asks whether `CharacterSheetAbilityScores` should store `base`, `backgroundIncrease`, and `final` side by side, or whether `final` should be derived from the source facts so contradictory sheet states are unrepresentable.

This is a modeling task. Do not just rename fields or add a comment. The end state should make the ability score relationship explicit in the type shape.

## Current Finding

The current type is in:

- `packages/character-creation-runtime/src/index.ts`

Current shape:

```ts
export type CharacterSheetAbilityScores = {
  readonly base: AbilityScoreAssignment;
  readonly backgroundIncrease: BackgroundAbilityScoreIncreaseSelection;
  readonly final: AbilityScoreAssignment;
};
```

`final` is currently computed in `finalizeSelections` by applying the selected background ability score increase to the base scores:

```ts
const finalScores = applyBackgroundAbilityScoreIncrease(
  baseScores,
  input.selections.backgroundAbilityScoreIncrease,
  backgroundFacts.abilityScoreIncrease.abilities,
);
```

The stored sheet then keeps both the derivation inputs and the result:

```ts
abilityScores: {
  base: baseScores,
  backgroundIncrease: input.selections.backgroundAbilityScoreIncrease,
  final: finalScores,
}
```

That can represent an impossible character sheet: `final` may disagree with `base + backgroundIncrease`.

## RAW Context

Use the local SRD corpus, not external rules sources.

Relevant SRD passages:

- `.references/srd-5.2.1/Character-Origins.md:11-13`
- `.references/srd-5.2.1/Character-Creation.md:185-187`

RAW says a background lists three ability scores; increase one by 2 and another by 1, or increase all three by 1, and none can exceed 20.

Also check:

- `UBIQUITOUS_LANGUAGE.md`, especially the entries for `Ability Score`, `Character Sheet`, and `Ability Score Improvement`.

## Goal

Make illegal ability-score states unrepresentable.

The durable character sheet should not store a derived `final` score beside source facts unless the type or constructor makes divergence impossible.

Acceptable outcomes:

1. Store final executable ability scores as the canonical durable field, and move derivation inputs into creation/audit/provenance state if they are still needed.
2. Store source facts and derive final executable scores through a function/projection, without persisting `final` beside them.
3. Introduce a smart constructor/opaque type only if callers cannot construct inconsistent values directly.

Do not keep the current public object shape with only a comment explaining the invariant.

## Research Checklist

Before editing, inspect:

- `packages/character-creation-runtime/src/index.ts`
- `packages/character-creation-runtime/src/index.test.ts`
- any consumers of `CharacterSheetAbilityScores`
- core character sheet / ability score shapes in `packages/core`
- shared ability score/domain types, if any
- `UBIQUITOUS_LANGUAGE.md`
- the RAW files listed above

Answer these explicitly in notes or commit message:

- Is this sheet field meant to be a durable ten-month character fact, a creation audit record, or an executable combat projection?
- Does any runtime consumer need base scores after finalization, or only final executable scores?
- Does any workflow need to replay exactly how the character was created?
- If replay/audit is needed, should it live under `selections`, a creation receipt, or another explicitly temporal field rather than under executable ability scores?
- How will future Ability Score Improvements, feats, or other score changes compose with this model without adding more parallel `final` fields?

## Design Guidance

Prefer a shape that separates durable executable facts from creation provenance.

Good directions:

- `abilityScores: AbilityScoreAssignment` if the sheet only needs executable scores.
- `abilityScoreOrigin: { base, backgroundIncrease }` or a better domain name only if creation provenance is intentionally retained.
- a projection helper such as `deriveCharacterAbilityScores(origin, backgroundFacts)` if final scores are derived on demand.
- a constructor such as `characterSheetAbilityScoresFromOrigin(...)` only if direct inconsistent construction is impossible outside the module.

Avoid:

- storing `base`, `backgroundIncrease`, and `final` in the same freely constructible object;
- adding another validation pass while leaving the invalid state representable;
- generic names like `final` if future advancement can later change the score again;
- hiding creation-time facts inside a durable field whose name sounds like current executable state.

## Possible Implementation Paths

### Path A: Canonical Executable Scores

Choose this if finalized sheets only need current executable ability scores.

Expected edits:

- Change `CharacterSheetAbilityScores` to represent the current executable scores only, or remove it in favor of `AbilityScoreAssignment`.
- Update `CharacterSheet.abilityScores` and tests accordingly.
- Keep `base` and `backgroundAbilityScoreIncrease` in `FinalizedCharacterSelections` or another explicit creation/audit location only if that temporal data is intentionally retained.
- Update HP derivation to use the canonical current scores.

### Path B: Source Facts Plus Projection

Choose this if the sheet intentionally stores derivation inputs and should compute executable scores when needed.

Expected edits:

- Rename the stored shape so it is clearly an origin/derivation input, not current executable scores.
- Remove the stored `final`.
- Add a helper that derives current starting ability scores from source facts and background facts.
- Update consumers/tests to call the helper where executable scores are needed.

### Path C: Opaque Constructed Value

Choose this only if both source facts and final scores must travel together for performance or boundary reasons.

Expected edits:

- Make direct construction impossible or tightly localized.
- Provide a constructor that computes `final`.
- Do not export a plain object type that callers can forge with contradictory values.
- Prefer this only if Path A or B creates real friction.

## Non-Goals

- Do not model level-up Ability Score Improvements unless needed to make the starting-score shape future-proof.
- Do not redesign all `CharacterSheet` temporal issues from `FX013`/`FX021`.
- Do not introduce a new validation-only invariant while leaving invalid states representable.
- Do not run MBT for this character-creation modeling change.

## Verification

Run the focused creation-runtime tests:

```sh
pnpm --filter @dnd/character-creation-runtime exec vitest run src/index.test.ts
```

If changed exports affect TypeScript across packages, also run focused typechecks for touched packages:

```sh
pnpm --filter @dnd/character-creation-runtime typecheck
```

Note: full `@dnd/character-creation-runtime` typecheck/test may currently fail if `@firfi/quint-connect` / `zod` are unavailable for the MBT file. Do not treat that as caused by this task unless your changes touch the MBT setup.

## Acceptance Criteria

- The source marker at `FX005` is resolved in code.
- `CharacterSheetAbilityScores` or its replacement cannot represent `final` disagreeing with `base + backgroundIncrease`.
- Durable executable ability scores are clearly separated from creation-time derivation/provenance.
- Tests are updated to assert the new sheet shape or derivation behavior.
- The implementation cites the local SRD passages in code comments only where the rule mapping is not obvious from names/types.
