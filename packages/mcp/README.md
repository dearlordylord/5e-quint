# @dnd/mcp

`@dnd/mcp` exposes tool-facing composition and session wiring for the runtime
packages.

## Surface Runtime Composition

The Surface runtime composition path starts at `src/green/`. The directory name
exists only in MCP because MCP still has legacy Core-backed modules beside the
new path. The broader green path is the Core-free import graph:
`@dnd/surface`, `@dnd/character-creation-runtime`, `@dnd/battle-runtime`, and
`packages/mcp/src/green/`.

The MCP green subtree imports Surface authored content boundaries plus the
character-creation and battle runtimes. Its composition root builds:

- `srdUnitCollection` through `buildUnitCatalog`;
- `srdStatBlockCollection` through `buildStatBlockCatalog`;
- an in-memory session store for character drafts, finalized Character Sheets,
  selected Stat Block identity, durable battle state, and transient
  battle fills.

Selected Stat Block state stores only the catalog Stat Block id. The full Stat
Block record is resolved through the green root's installed `statBlockCatalog`,
so MCP session state cannot drift from the SRD stat-block catalog.

Transient battle fills are MCP session state. They are kept separate from
`BattleState` so battle replay remains owned by `@dnd/battle-runtime`.

This package also owns cross-runtime composition helpers. Character Sheet to
creature-init mapping lives in `src/green/battle-creature-init.ts`, where
finalized character facts and Surface Unit lookups are projected into
battle-owned initialization data before calling `startBattle`. This keeps
character draft/session concepts out of `@dnd/battle-runtime` without
introducing a new intermediate language. This is package ownership, not a
domain term: `@dnd/mcp` may see Character Sheets, authored Units, authored Stat
Blocks, and battle creature-init APIs together because its job is wiring
runtimes for tools.

`src/green/` is a migration isolation namespace, not the final MCP API shape.
The promotion criteria live in
`plans/CORRECTION_APPLICATION_MIGRATION_PLAN.md` Phase 5 and
`plans/ACTIVE_PLAN.md` CAM20. Once the Core-backed overlap is deleted or
rewritten, these tools should move into the normal MCP server path and the
green namespace should disappear or become internal-only composition helpers.

No file under `src/green/` may import or re-export from the legacy Core-backed
MCP modules. Check that boundary with:

```sh
rg '@dnd/core' packages/mcp/src/green packages/character-creation-runtime packages/battle-runtime
```

## Core-Backed Path

`src/server.ts`, `src/session-router.ts`, `src/character-session.ts`, and
related modules use the Core-backed engine path. Keep Surface runtime tools out
of those modules unless the package ownership model is intentionally changed.
