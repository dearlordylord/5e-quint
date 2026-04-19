# Executable Projection Compiler

Date: 2026-04-19

Task: `EPT5 - Build Surface-To-Projection Compiler`

Landed:

- [packages/core/src/projected-compiler.ts](/workspace/typescript/dnd/packages/core/src/projected-compiler.ts)
- [packages/core/src/projected-compiler-fixtures.ts](/workspace/typescript/dnd/packages/core/src/projected-compiler-fixtures.ts)
- [packages/core/src/projected-compiler.test.ts](/workspace/typescript/dnd/packages/core/src/projected-compiler.test.ts)

Scope closed by this task:

- compile the four EPT1 first-slice authored JSON units into the EPT4 projected TS shapes
- fail closed for any out-of-scope unit id
- fail closed for preserved-fact drift inside the in-scope units
- keep the output inspectable through checked-in fixture constants

Supported units:

- `acid_splash`
- `mage_armor`
- `fighter_second_wind`
- `fighter_action_surge_l2`

Compiler boundary:

- unit ids are explicitly whitelisted to the EPT1 slice
- each supported unit is validated against the frozen EPT3/EPT4 facts before projection
- future runtime work must consume these projected records instead of re-deriving equivalent semantics

Verification:

- `pnpm --dir packages/core typecheck`
- `pnpm --dir packages/core exec vitest run src/projected-compiler.test.ts`

/simplify convergence:

- Round 1: tightened the candidate shape from generic pattern matching to exact unit-scoped preserved-fact validation so authored drift fails at the compiler boundary
- Round 2: extracted the projected outputs into fixture constants so the compiler and tests share one inspectable frozen record source
- Result: no further important simplifications found without widening the task into EPT6/EPT7
