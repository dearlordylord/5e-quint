# @dnd/mcp

`@dnd/mcp` exposes tool-facing composition and session wiring for the runtime
packages.

## Surface Runtime Composition

The Surface runtime composition path wires package APIs into tool workflows. MCP
may see content catalogs, character sessions, battle sessions, and runtime
initialization inputs because it is the composition boundary; it must not become
the owner of character-creation or battle semantics.

The current implementation modules still live under `src/green/` until CAM20
renames or internalizes that migration namespace. That subtree imports Surface
authored content boundaries plus the character-creation and battle runtimes. Its
composition root builds:

- `srdUnitCollection` through `buildUnitCatalog`;
- `srdStatBlockCollection` through `buildStatBlockCatalog`;
- an in-memory session store for character drafts, finalized character sheets,
  durable post-battle character state, selected Stat Block identity, durable
  battle state, and transient battle fills.

The green character-creation tool boundary exposes these user-facing tools:

- `create_character_draft` creates and stores a new Surface-runtime draft, then
  returns the current creation holes.
- `discover_creation_holes` returns the stored draft's current hole frontier,
  draft revision, and finalization status.
- `fill_creation_holes` submits one atomic batch of `CreationFill` values
  against the expected draft revision. Accepted batches replace the stored
  draft; rejected batches return runtime issues and leave the stored draft
  unchanged.
- `finalize_character` finalizes only when the runtime reports the supported
  minimal Fighter draft is ready. A ready result stores an available character
  session by source draft id and removes the active draft from `drafts`. The
  session owns current HP while the character is outside battle.
- `list_characters` lists durable character-session rows. It reads only the
  character-session store, so selected or battled Stat Blocks do not appear as
  characters.

These tools operate on real creation holes. MCP does not offer character
presets, does not patch draft selections directly, and does not import Core
character helpers in the Surface-runtime path.

The green battle-session path exposes these user-facing tools:

- `select_stat_block` selects a Stat Block from the Surface SRD Stat Block
  catalog and stores only that Stat Block id in the session.
- `start_battle` starts a battle session from one finalized character sheet and
  the selected Stat Block. The caller supplies the Initiative scores for both
  combatants. Starting battle moves the character session into an in-battle
  variant that has no current HP field; the stored `BattleState` owns HP until
  battle closeout.
- `read_battle_state` returns the stored `BattleState` projection and current
  battle snapshot.
- `discover_battle_acts` returns the current actor's battle acts. The current
  first-vertical slice exposes the Fighter Attack action, supported Goblin
  Warrior Stat Block attacks, and the End Turn runtime command.
- `fill_battle_hole` submits one Attack fill at a time. MCP stores transient
  target, attack-roll, and damage-result fills until `@dnd/battle-runtime`
  resolves the Attack, then stores the returned `BattleState` and clears the
  transient fills.
- `end_turn` resolves the End Turn runtime command for the current actor, stores
  the returned `BattleState`, and clears transient battle fills.
- `end_battle` finalizes the stored battle session, projects positive current
  HP from character-origin battle combatants back into the durable character
  session, clears battle state, and leaves monster combatants behind in the
  closed battle.

The current verified green vertical is Orc Soldier Fighter versus Goblin
Warrior, entirely through MCP tools:

1. create a character draft;
2. discover and fill the real creation holes for Orc, Soldier, Fighter, ability
   scores, languages, alignment, Fighter choices, purchases, and loadout;
3. finalize the Character Build;
4. select the authored SRD Goblin Warrior Stat Block;
5. start battle with explicit caller-supplied Initiative scores;
6. resolve Fighter Longsword Attack target, attack roll, and damage fills;
7. resolve End Turn;
8. resolve Goblin Warrior Scimitar or Shortbow Attack target, attack roll, and
   damage fills;
9. end the battle and list the Orc Soldier Fighter with reduced current HP.

That fixture uses the authored Surface Unit and Stat Block catalogs. It does
not use character presets, Core projections, duplicated executable stat-block
data, or reducer-owned in-progress battle fills.

Remaining first-vertical gates:

- the Surface-runtime tools are registered by the normal MCP entrypoint, but
  the implementation modules still live under `src/green/` until CAM20 removes
  that implementation namespace;
- post-battle handoff currently accepts reduced positive character HP. Zero-HP,
  Death Saving Throw, Stable, dead, rest, and broader adventuring-state handoff
  facts remain deferred to later runtime width;
- normal-path user acceptance belongs to the promoted MCP server path, not this
  green fixture;
- broader character choices, additional Stat Blocks, Multiattack, long-range
  Disadvantage, reactions, spells, and post-turn lifecycle subjects remain
  outside this first vertical.

Normal package tests cover the Surface-runtime path. The old Core-backed test
suite under `src/legacy-core/` is excluded from the normal Vitest gate because
it documents a deletion-marked path whose omitted behavior is governed by the
Restore Ledger in `plans/CORRECTION_APPLICATION_MIGRATION_PLAN.md`.

`BattleResolutionResult` may include display-facing result details for tool
responses, but `BattleState` remains authoritative. Optional display logs must
not become the source of combat truth.

Selected Stat Block state stores only the catalog Stat Block id. The full Stat
Block record is resolved through the green root's installed `statBlockCatalog`,
so MCP session state cannot drift from the SRD stat-block catalog.

Transient battle fills are MCP session state. They are kept separate from
`BattleState` so battle replay remains owned by `@dnd/battle-runtime`.

Surface-runtime session state belongs here when it is tool workflow state:
draft handles, selected content ids, durable battle ids, and transient fills.
Reducer state and rules behavior remain owned by the runtime packages.

Surface-runtime tools should use their final user-facing tool names. The
implementation boundary is the module/package registration path, not a `green_`
tool-name prefix.

This package also owns cross-runtime composition helpers. Character Build to
creature-init mapping lives in `src/green/battle-creature-init.ts`, where
finalized character facts and Surface Unit lookups are projected into
battle-owned initialization data before calling `startBattle`. This keeps
character draft/session concepts out of `@dnd/battle-runtime` without
introducing a new intermediate language. This is package ownership, not a
domain term: `@dnd/mcp` may see Character Builds, authored Units, authored Stat
Blocks, and battle creature-init APIs together because its job is wiring
runtimes for tools.

`start_battle` must receive caller-supplied Initiative scores for every
combatant. MCP must not derive Initiative as `10 + modifier` in the promoted
Surface runtime path.

`src/green/` is an implementation namespace, not the final MCP API shape. The
normal MCP entrypoint registers these tools directly, and CAM20 should remove
or internalize the green namespace once the Core-backed overlap is deleted or
rewritten. The promotion checklist belongs in the migration plans, not in this
package contract.

No file under `src/green/` may import or re-export from the legacy Core-backed
MCP modules. Check that boundary with:

```sh
rg '@dnd/core' packages/mcp/src/green packages/character-creation-runtime packages/battle-runtime
```

## Core-Backed Path

`src/legacy-core/` contains the old Core-backed MCP host, session router,
runtime input decoders, scripts, and tests. That directory is deletion-marked,
not compatibility-supported, and it is not part of the normal MCP package test
gate. Keep Surface-runtime tools out of those modules.
