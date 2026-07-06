# Selected Identity Reducer Replay Gate

`selected-identity-replay` evidence means a concrete authored Unit identity is
bound by executable replay that reaches the production runtime entrypoint for
the owner package. It is not satisfied by a driver-local action table alone.

The checker accepts two replay owner shapes:

- owner-local `selectedUnitIdentityReplays` tables with deterministic replay
  data and, when paired with QNT replay evidence, a focused QNT `step`;
- `defineSelectedIdentityReplayWitness(...)`, which creates only the
  deterministic replay test;
- `defineSelectedIdentityReplayAndQntReplay(...)`, which creates the
  deterministic replay test and the deterministic QNT parity run.

For deterministic selected-identity replay,
`scripts/unit-profile-coverage-claim-scan.cjs` checks:

- the `unit-evidence.jsonl` row has a matching `UNIT-IDENTITY-EVIDENCE` marker;
- the `UNIT-IDENTITY-REPLAY` marker actions match replay data;
- the actions are declared by the owner shape;
- the owner/import closure reaches the package's public runtime entrypoint.

For separate `UNIT-IDENTITY-QNT-REPLAY` rows, the checker also verifies that
the claimed actions are reachable from the focused QNT `step` and joined to
matching deterministic replay data by task, Unit, and actions.

For `packages/battle-runtime`, full reducer replays are recognized through
public battle runtime entrypoints such as `startBattle`, `discoverBattleActs`,
`resolveBattleSubject`, and `resolveBattleInterrupt`. Projection/admission
witnesses that do not execute a battle step must still reach package-public
runtime code exported from `src/index.ts`.

`pnpm quality` runs `pnpm unit-profile-coverage:check`, so installed Unit
inventory drift, stale owner metadata, missing deterministic replay data, and
missing reducer/runtime reachability fail the normal gate.
