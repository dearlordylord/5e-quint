Local battle MBT fixture for `battle-projection.mbt.test.ts`.

Purpose:
- keep local `pnpm test` stable and fast
- avoid live battle trace generation in the projection MBT path during normal local runs

Important:
- this fixture is not a substitute for randomized MBT coverage
- CI/fuzz runs should use live generation with explicit seeds/settings
- if `battle.qnt`, MBT picks, or replay decoding changes, regenerate this trace

Regenerate:
```bash
cd /workspace/typescript/dnd
rm -f packages/core/test-fixtures/battle-mbt-local/*.itf.json
MBT_TRACE_DIR=/workspace/typescript/dnd/packages/core/test-fixtures/battle-mbt-local \
QUINT_SEED=0x6f8de156 \
pnpm --filter @dnd/core exec vitest run src/battle-machine.mbt.test.ts
```
