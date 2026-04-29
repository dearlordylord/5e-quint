# @dnd/mcp

`@dnd/mcp` exposes tool-facing composition and session wiring for the runtime
packages.

## Surface Runtime Composition

The Surface runtime composition path wires `@dnd/surface`,
`@dnd/character-creation-runtime`, and `@dnd/battle-runtime` for tool-facing
workflows. Its implementation lives under `src/green/` while MCP also contains
the older Core-backed tool path.

The `src/green/` subtree imports Surface authored content boundaries plus the
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

Surface-runtime tools should use their final user-facing tool names. The
implementation boundary is the module/package registration path, not a `green_`
tool-name prefix.

This package also owns cross-runtime composition helpers. Character Sheet to
creature-init mapping lives in `src/green/battle-creature-init.ts`, where
finalized character facts and Surface Unit lookups are projected into
battle-owned initialization data before calling `startBattle`. This keeps
character draft/session concepts out of `@dnd/battle-runtime` without
introducing a new intermediate language. This is package ownership, not a
domain term: `@dnd/mcp` may see Character Sheets, authored Units, authored Stat
Blocks, and battle creature-init APIs together because its job is wiring
runtimes for tools.

`start_battle` must receive caller-supplied Initiative scores for every
combatant. MCP must not derive Initiative as `10 + modifier` in the promoted
Surface runtime path.

`src/green/` is an isolation namespace, not the final MCP API shape. Once the
Core-backed overlap is deleted or rewritten, these tools should move into the
normal MCP server path and the green namespace should disappear or become
internal-only composition helpers. The promotion checklist belongs in the
migration plans, not in this package contract.

No file under `src/green/` may import or re-export from the legacy Core-backed
MCP modules. Check that boundary with:

```sh
rg '@dnd/core' packages/mcp/src/green packages/character-creation-runtime packages/battle-runtime
```

## Core-Backed Path

`src/server.ts`, `src/session-router.ts`, `src/character-session.ts`, and
related modules use the Core-backed engine path. Keep Surface runtime tools out
of those modules unless the package ownership model is intentionally changed.
