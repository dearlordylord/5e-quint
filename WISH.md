# Things I wish I knew

## Quint specifics

- `quint test` with no `--match` flag prints only the module name on success; exit code 0 means all pass. Use `--match "pattern"` to get per-test output for verification.
- Quint record types require all fields at every construction site. Adding a field to `CharConfig` means updating every literal: `TEST_CONFIG` in `dnd.qnt`, plus `TEST_WIZARD` and `TEST_FIGHTER_5` in `dndTest.qnt`. The typechecker catches these, but you need to know where all the literals are.
- Trailing commas in record literals are fine in Quint (e.g., `critRange: 20,` before the closing brace).

## Codebase structure

- `dnd.qnt` is large (~1900 lines). You cannot read it in one shot. Use Grep to find definitions, then Read with offset/limit for context.
- `dndTest.qnt` is even larger (~578 tests). Same strategy applies.
- `dnd2014.qnt` / `dnd2014Test.qnt` are archived SRD 5.1 files. Do not modify them.
- `resolveAttackRoll` is a pure function in `dnd.qnt` not called internally — it is called from tests and (presumably) from the TypeScript state machine. When changing its signature, you must update `dndTest.qnt` call sites but the TS side is a separate concern.

## Design patterns

- Pure functions like `resolveAttackRoll` accept all parameters explicitly rather than reading from config. Config stores the value; caller passes it. This keeps functions composable and testable.
- `CharConfig` is documented as "immutable for the duration of the state machine." Adding fields there is the right place for character-level parameters that don't change mid-combat.
- The `d20Roll == 20` check in `pDeathSave` is a death save mechanic (nat 20 = regain 1 HP), NOT an attack crit. Don't modify it when parameterizing attack crit range.
