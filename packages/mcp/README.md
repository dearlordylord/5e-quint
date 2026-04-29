# @dnd/mcp

`@dnd/mcp` currently contains two MCP paths during the Correction Application
Migration.

## Green Composition Root

The green path starts at `src/green/`. It imports only the Surface catalog
boundary and the new character-creation and battle runtimes. Its composition
root builds:

- `srdUnitCollection` through `buildUnitCatalog`;
- `srdStatBlockCollection` through `buildStatBlockCatalog`;
- an in-memory session store for character drafts, finalized Character Sheets,
  selected monster Stat Block identity, durable battle state, and transient
  battle fills.

Selected monster state stores only the catalog Stat Block id. The full Stat
Block record is resolved through the green root's installed `statBlockCatalog`,
so MCP session state cannot drift from the SRD stat-block catalog.

Transient battle fills are MCP session state. They are kept separate from
`BattleState` so battle replay remains owned by `@dnd/battle-runtime`.

No file under `src/green/` may import or re-export from the legacy Core-backed
MCP modules. Check that boundary with:

```sh
rg '@dnd/core' packages/mcp/src/green packages/character-creation-runtime packages/battle-runtime
```

## Legacy Core Path

The existing `src/server.ts`, `src/session-router.ts`, `src/character-session.ts`,
and related modules are legacy-only while the migration is in progress. They may
keep using `@dnd/core` until the old path is intentionally deleted or isolated by
a later task, but green tools must not be threaded through those modules.
