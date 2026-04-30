# @dnd/mcp

`@dnd/mcp` exposes tool-facing composition and session wiring for the runtime
packages.

## Surface Runtime Composition

The Surface runtime composition path wires package APIs into tool workflows. MCP
may see content catalogs, character sessions, battle sessions, and runtime
initialization inputs because it is the composition boundary; it must not become
the owner of character-creation or battle semantics.

The normal MCP server route imports Surface authored content boundaries plus
the character-creation and battle runtimes. Its composition root builds:

- `srdUnitCollection` through `buildUnitCatalog`;
- `srdStatBlockCollection` through `buildStatBlockCatalog`;
- an in-memory session store for character drafts, finalized character sheets,
  durable post-battle character state, selected Stat Block identity, durable
  battle state, and transient battle fills.

The Surface-runtime character-creation tool boundary exposes these user-facing tools:

- `describe_mcp_workflow` returns the agent-facing lifecycle, accepted fill
  examples, result paths, recovery rules, and current slice limits. This tool
  has an Effect Schema-derived output schema and returns structured content.
- `list_catalog_units` lists installed Surface Unit ids grouped by kind for
  discovery. These ids are catalog facts, not MCP-local support lists; legal
  character choices still come from `discover_creation_holes`.
- `list_stat_blocks` lists selectable SRD Stat Block ids, display names,
  attacks, defenses, damage modifiers, and provenance for `select_stat_block`.

- `create_character_draft` creates and stores a new Surface-runtime draft, then
  returns the current creation holes.
- `discover_creation_holes` returns the stored draft's current hole frontier,
  draft revision, and finalization status.
- `fill_creation_holes` submits one atomic batch of `CreationFill` values
  against the expected draft revision. Accepted batches replace the stored
  draft; rejected batches return runtime issues and leave the stored draft
  unchanged.
- `finalize_character` finalizes only when the runtime reports a supported
  Surface-runtime draft is ready. The promoted path currently supports the Orc
  Soldier Fighter 1/Fighter 2 and Orc Soldier Wizard 1 slice. A ready result
  stores an available character session by source draft id and removes the
  active draft from `drafts`. The session owns current HP while the character is
  outside battle.
- `list_characters` lists durable character-session rows. It reads only the
  character-session store, so selected or battled Stat Blocks do not appear as
  characters.

These tools operate on real creation holes. MCP does not offer character
presets, does not patch draft selections directly, and does not import Core
character helpers in the Surface-runtime path.

The Surface-runtime battle-session path exposes these user-facing tools:

- `select_stat_block` selects a Stat Block from the Surface SRD Stat Block
  catalog and stores only that Stat Block id in the session.
- `start_battle` starts a battle session from one or more finalized character
  sheets and the selected Stat Block. The caller supplies the Initiative scores
  for every combatant. Starting battle moves each character session into an
  in-battle variant that has no current HP field; the stored `BattleState` owns
  HP until battle closeout.
- `read_battle_state` returns the stored `BattleState` projection and current
  battle snapshot.
- `discover_battle_acts` returns the current actor's battle acts. The promoted
  slice exposes supported character weapon Attacks, Fighter 2 Action Surge,
  Wizard `magic_missile` and `ray_of_frost` Magic-action spell acts,
  supported Goblin Warrior/Skeleton Stat Block attacks, and End Turn.
- `fill_battle_hole` submits one fill at a time for a selected battle act
  subject. MCP stores transient target, attack-roll, and damage-result fills
  until `@dnd/battle-runtime` resolves the act, then stores the returned
  `BattleState` and clears the transient fills.
- `resolve_battle_act` resolves selected battle act subjects that need no
  holes, such as Fighter 2 Action Surge.
- `end_turn` resolves the End Turn runtime command for the current actor, stores
  the returned `BattleState`, and clears transient battle fills.
- `end_battle` finalizes the stored battle session, projects positive current
  HP from character-origin battle combatants back into the durable character
  session, clears battle state, and leaves monster combatants behind in the
  closed battle.

The accepted first end-user Surface-runtime vertical is Orc Soldier Fighter
versus Goblin Warrior, entirely through MCP tools:

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

The first post-acceptance widened workflow is also covered through promoted MCP
tools. It creates and finalizes an Orc Soldier Fighter 2 and an Orc Soldier
Wizard 1 through real creation holes, selects the authored SRD Skeleton Stat
Block, starts battle from both finalized character identities plus the selected
Stat Block id, applies Skeleton Bludgeoning vulnerability through a Flail hit,
resolves Fighter Action Surge, casts Wizard `ray_of_frost` as a cantrip without
spending a Spell Slot, lets Skeleton apply authored Shortsword attack pressure,
casts prepared `magic_missile` with a level-1 Spell Slot spend, and closes the
battle back to `list_characters`.
The supported Wizard creation choices in this slice are catalog-backed SRD
Spell Definitions; battle start fails at the MCP boundary rather than dropping
selected spell or feature Unit refs that are not in the Surface catalog.

`list_characters` is the supported post-battle read model for this vertical.
After `end_battle`, it reads the durable character session directly. Character
current HP is handed back from the battle-owned character combatant to that
session during closeout; Goblin Warrior remains a closed battle combatant and
never becomes a character-list row.

Remaining first-vertical gates:

- post-battle handoff currently accepts reduced positive character HP. Zero-HP,
  Death Saving Throw, Stable, dead, rest, and broader adventuring-state handoff
  facts remain deferred to later runtime width;
- broader character choices, monster spellcasting, Multiattack, long-range
  Disadvantage, reactions, casting spells with higher-level Spell Slots,
  persistent spell effects such as Mage Armor, and post-turn lifecycle subjects
  remain outside this widened slice.

Normal package tests cover the promoted Surface-runtime MCP server route. The
old Core-backed MCP route has been removed from this package; omitted behavior
is governed by the Restore Ledger in
`plans/CORRECTION_APPLICATION_MIGRATION_PLAN.md`.

`BattleResolutionResult` may include display-facing result details for tool
responses, but `BattleState` remains authoritative. Optional display logs must
not become the source of combat truth.

Selected Stat Block state stores only the catalog Stat Block id. The full Stat
Block record is resolved through the MCP root's installed `statBlockCatalog`,
so MCP session state cannot drift from the SRD stat-block catalog.

Transient battle fills are MCP session state. They are kept separate from
`BattleState` so battle replay remains owned by `@dnd/battle-runtime`.

Surface-runtime session state belongs here when it is tool workflow state:
draft handles, selected content ids, durable battle ids, and transient fills.
Reducer state and rules behavior remain owned by the runtime packages.

Surface-runtime tools should use their final user-facing tool names. The
implementation boundary is the module/package registration path, not a
migration-prefixed tool name.

MCP input and output contracts are authored as Effect Schema codecs and exported
to MCP as generated JSON Schema. Boundary handlers decode tool arguments through
those schemas before converting to branded runtime ids. Tool responses include
JSON text content plus `structuredContent`; success responses are encoded
through their output schemas.

This package also owns cross-runtime composition helpers. Character Build to
creature-init mapping lives in `src/battle-creature-init.ts`, where finalized
character facts and Surface Unit lookups are projected into battle-owned
initialization data before calling `startBattle`. This keeps character
draft/session concepts out of `@dnd/battle-runtime` without introducing a new
intermediate language. This is package ownership, not a domain term:
`@dnd/mcp` may see Character Builds, authored Units, authored Stat Blocks, and
battle creature-init APIs together because its job is wiring runtimes for
tools.

`start_battle` must receive caller-supplied Initiative scores for every
combatant. MCP must not derive Initiative as `10 + modifier` in the promoted
Surface runtime path.

No promoted MCP/runtime path may import `@dnd/core`. Check that boundary with:

```sh
rg '@dnd/core' packages/mcp/src packages/character-creation-runtime packages/battle-runtime
```
