Archived battle MBT fixture for `battle-projection.mbt.test.ts`.

Purpose:

- keep the archived battle-projection MBT path stable and fast
- avoid live battle trace generation in the projection driver during normal
  explicit legacy runs

Important:

- this fixture is not a substitute for randomized MBT coverage
- CI/fuzz runs should use live generation with explicit seeds/settings
- if `battle.qnt`, MBT picks, or replay decoding changes, regenerate this trace
- this fixture is not an active `@dnd/battle-runtime` verification gate

Regenerate:

```bash
cd /workspace/typescript/dnd
rm -f packages/v0/test-fixtures/battle-mbt-local/*.itf.json
MBT_TRACE_DIR=/workspace/typescript/dnd/packages/v0/test-fixtures/battle-mbt-local \
QUINT_SEED=0x6f8de156 \
RUN_LEGACY_CORE_BATTLE_MBT=1 pnpm --filter @dnd/v0 exec vitest run src/battle-projection.mbt.test.ts
```
