# Implementation Query 2: Hole/Fill Error Vocabulary Review

## Question

Implement or resolve `FX004` from `FIXME_RESPONSES.md`.

`FX004` asks whether character creation hole/fill errors should share vocabulary with battle/combat hole errors, likely in `@dnd/shared-algebras`.

This is a design-and-implementation task, not a mechanical rename. First determine whether the protocols are actually the same domain. Only extract shared code if the shape is genuinely common.

## Current Finding

Character creation currently has local issue types in:

- `packages/character-creation-runtime/src/index.ts`

Current creation issue vocabulary:

- Fill issues:
  - `unknownHole`
  - `duplicateFill`
  - `wrongFillKind`
  - `invalidChoice`
  - `tooFewChoices`
  - `tooManyChoices`
  - `unsupportedChoice`
- Batch issues:
  - `staleRevision`
- Finalization issues:
  - `illegalFinalization`

Battle/combat has different error surfaces:

- `packages/core/src/available-actions.ts`
  - `ACTION_NOT_AVAILABLE`
  - `ACTION_NOT_SUPPORTED`
  - `RUNTIME_INPUT_MISMATCH`
  - `INVALID_RUNTIME_INPUT`
- `packages/battle-runtime/src/index.ts`
  - battle resolution invalid results such as `invalidFill`, `unsupportedSurfaceShape`, etc.
- `packages/shared-algebras/src/runtime-hole-algebra.ts`
  - shared runtime hole/fill *shape* types, but no shared fill-error vocabulary.
- `packages/shared-algebras/src/validation-algebra.ts`
  - shared `traverseValidation` for accumulating per-item validation failures.

## Goal

Make the error vocabulary intentional and clear.

Acceptable outcomes:

1. Extract a shared fill/hole validation vocabulary into `@dnd/shared-algebras` if creation and battle/runtime correction are using the same protocol.
2. Keep creation-specific issue codes local if creation holes are a different protocol, but document or rename enough that future readers do not assume accidental divergence.

Do not create a shared abstraction only because words like "hole", "fill", or "invalid" appear in multiple places.

## Research Checklist

Before editing, inspect:

- `packages/character-creation-runtime/src/index.ts`
- `packages/shared-algebras/src/runtime-hole-algebra.ts`
- `packages/shared-algebras/src/validation-algebra.ts`
- `packages/surface-runtime-correction/src/reducer-hole-refilling.ts`
- `packages/surface-runtime-correction/src/reducer-hole-resolution.ts`
- `packages/core/src/available-actions.ts`
- `packages/battle-runtime/src/index.ts`

Answer these explicitly in your notes or commit message:

- Are creation fills and runtime/battle fills the same protocol or only analogous?
- Do they share hole identity semantics?
- Do they share cardinality semantics?
- Do they share stale revision / optimistic concurrency semantics?
- Are battle errors action-resolution errors rather than fill-validation errors?
- Would a shared type reduce duplication, or would it force unrelated domains into a vague common enum?

## Design Guidance

Prefer shared vocabulary only for common algebraic facts, for example:

- unknown/unexpected hole id;
- duplicate fill for one hole;
- fill kind mismatch;
- invalid filled value;
- arity/cardinality mismatch;
- unsupported option under current support slice.

Keep domain-specific concepts local:

- creation draft revision / `staleRevision`;
- creation finalization / `illegalFinalization`;
- battle action availability / `ACTION_NOT_AVAILABLE`;
- battle feature support / `ACTION_NOT_SUPPORTED`;
- runtime input mode mismatch / `RUNTIME_INPUT_MISMATCH`.

If extracting shared code, avoid a weak catch-all enum. Prefer a small algebra whose field names match the common protocol:

```ts
type HoleFillIssueCode =
  | "unknownHole"
  | "duplicateFill"
  | "wrongFillKind"
  | "invalidFillValue"
  | "tooFewValues"
  | "tooManyValues"
  | "unsupportedFillValue";
```

Names can differ, but avoid leaking creation-specific names into battle or battle-specific names into creation.

## Possible Implementation Paths

### Path A: Keep Local, Document Boundary

Choose this if creation and battle/runtime holes are only analogous.

Expected edits:

- Remove or replace the FIXME in `packages/character-creation-runtime/src/index.ts`.
- Add a short comment near `CREATION_FILL_ISSUE_CODES` explaining that creation batch validation is local because it validates durable draft mutation, while combat errors validate action resolution/runtime inputs.
- Optionally rename overly generic local types if needed, e.g. keep `CreationFillIssueCode` clearly creation-owned.
- Add or adjust tests only if names/behavior change.

### Path B: Extract Shared Fill Validation Algebra

Choose this only if `surface-runtime-correction` and creation can use the same fill-validation concepts without losing domain precision.

Expected edits:

- Add shared type(s) in `packages/shared-algebras`, probably near `runtime-hole-algebra.ts` or a new `hole-fill-validation-algebra.ts`.
- Re-export if local package patterns require it.
- Update creation issue codes to use or map from the shared code type.
- Update `surface-runtime-correction` only if it genuinely benefits and does not distort its current error model.
- Keep creation batch/finalization issue types local.

## Non-Goals

- Do not redesign all battle action errors.
- Do not merge action-resolution errors with fill-validation errors.
- Do not change behavior unless needed for clearer typing.
- Do not run MBT for this exploratory/refactor work.

## Verification

Run focused checks for touched packages.

For creation runtime changes:

```sh
pnpm --filter @dnd/character-creation-runtime exec vitest run src/index.test.ts
```

Note: full `@dnd/character-creation-runtime` typecheck/test may currently fail if `@firfi/quint-connect` / `zod` are unavailable for the MBT file. Do not treat that as caused by this task unless your changes touch the MBT setup.

For shared-algebras changes:

```sh
pnpm --filter @dnd/shared-algebras typecheck
pnpm --filter @dnd/shared-algebras test
```

For surface-runtime-correction changes:

```sh
pnpm --filter @dnd/surface-runtime-correction typecheck
pnpm --filter @dnd/surface-runtime-correction test
```

If only comments/types in creation are changed, the focused `src/index.test.ts` run is enough.

## Acceptance Criteria

- The FIXME at `FX004` is resolved in code.
- The final state makes it obvious whether creation issue codes are deliberately local or intentionally shared.
- No vague shared enum is introduced unless at least two packages actually consume it.
- Tests for changed behavior or changed type exports are updated.
