# Selected Identity Reducer Replay Gate

`selected-identity-mbt` evidence means a concrete authored Unit identity is
bound by executable replay that reaches the production runtime entrypoint for
the owner package. It is not satisfied by a driver-local action table alone.

The checker accepts two replay owner shapes:

- owner-local `selectedUnitIdentityReplays` tables with a matching local
  `*DriverSchema` and focused QNT `step`;
- `defineSelectedIdentityWitness(...)`, whose helper creates the deterministic
  replay test and the focused MBT parity run.

For either shape, `scripts/unit-profile-coverage-claim-scan.cjs` checks:

- the `unit-evidence.jsonl` row has a matching `UNIT-IDENTITY-EVIDENCE` marker;
- the `UNIT-IDENTITY-MBT-REPLAY` marker actions match replay data;
- the actions are declared by the owner shape;
- the actions are reachable from the focused QNT `step`;
- the owner/import closure reaches the package's public runtime entrypoint.

For `packages/battle-runtime`, full reducer replays are recognized through
public battle runtime entrypoints such as `startBattle`, `discoverBattleActs`,
`resolveBattleSubject`, and `resolveBattleInterrupt`. Projection/admission
witnesses that do not execute a battle step must still reach package-public
runtime code exported from `src/index.ts`.

`pnpm quality` runs `pnpm unit-profile-coverage:check`, so installed Unit
inventory drift, stale owner metadata, missing deterministic replay data, and
missing reducer/runtime reachability fail the normal gate.
