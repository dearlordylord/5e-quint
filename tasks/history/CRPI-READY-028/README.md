# CRPI-READY-028 History

Task 70 restores and replays the required aggregate feature driver:

- Driver: `packages/battle-runtime/rule-core-features.mbt.qnt`
- Component connector: `packages/battle-runtime/rule-core-features.mbt.qnt`
- Durable owner: `RuleCoreFeatureProfileSemanticsOwner`
- Accepted projection: `qComponentRoute`
- Harness: `packages/battle-runtime/src/rule-core-features.mbt.test.ts`
- Evidence: `tasks/target-replay-evidence/CRPI-READY-028.json`

The aggregate driver is a self-contained literal projection witness over the
existing feature-family action set. It imports only leaf vocabulary/protocol
modules and does not import the focused split feature drivers.

The task-specific `rogue_second_story_work` owner-evidence row is also resolved:

- Character sheet linked Speed grant projection records Climb Speed equal to
  Speed.
- Character sheet jump-distance projection records Dexterity replacing Strength.
- Battle-runtime admission accepts the single linked Climb Speed grant.
- Battle-runtime movement projection derives Climb Speed from current walk Speed
  without storing duplicate climb or jump state.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-READY-028.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The focused split rule-core feature drivers remain available as backlog
inventory, but this artifact does not claim them as separate Ralph plan tasks:

- `packages/battle-runtime/rule-core-feature-action-economy.mbt.qnt`
- `packages/battle-runtime/rule-core-feature-attack-riders.mbt.qnt`
- `packages/battle-runtime/rule-core-feature-passive-zero-hp.mbt.qnt`
- `packages/battle-runtime/rule-core-feature-save-reactions.mbt.qnt`

The aggregate MBT evidence is sampled route replay evidence. It does not claim
that one six-step trace covered every `step` alternative in the aggregate
driver.

Verification:

- `pnpm exec quint typecheck packages/battle-runtime/rule-core-features.mbt.qnt` passed.
- `pnpm check:mbt-driver-closure` passed.
- `MBT_TRACES=1 MBT_STEPS=6 pnpm exec vitest run src/rule-core-features.mbt.test.ts -t "aggregate feature family"` passed in 11s.
- `pnpm --filter @dnd/character-sheet-runtime exec vitest run src/ability-checks.test.ts -t "Second-Story Work"` passed.
- `pnpm --filter @dnd/battle-runtime exec vitest run src/unit-profile-admission-extra-attack-and-speed-features.test.ts -t "Second-Story Work|Roving"` passed.
- `pnpm --filter @dnd/battle-runtime exec tsc --noEmit` passed.
- `pnpm cleanroom-branch-coverage:check` passed.
- `pnpm quality` passed.

Plan Impact:

- Status: `none`
- Affected task: `CRPI-READY-028` should be unblocked/accepted.
- Affected backlog entries: split feature driver backlog entries are left
  unchanged and are not represented as Ralph plan task IDs by this artifact.
- Observations: aggregate MBT replay is sampled route evidence, not
  branch-complete evidence.
- Required plan edits: none.
