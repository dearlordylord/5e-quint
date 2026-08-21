# @dnd/mcp

`@dnd/mcp` exposes tool-facing composition and session wiring for the runtime
packages.

## Runtime Composition

The MCP composition path wires package APIs into tool workflows. MCP
may see content catalogs, character sessions, battle sessions, and runtime
initialization inputs because it is the composition boundary; it must not become
the owner of character-creation or battle semantics.

If a tool workflow needs a stronger Surface, character-creation, or battle fact,
change the owning lower package and its tests instead of adding MCP-private
runtime registries, duplicate executable content, or shadow reducer state.

The normal MCP server route imports Surface authored content boundaries plus
the character-creation and battle runtimes. Its immutable application services
build:

- `srdUnitCollection` through `buildUnitCatalog`;
- `srdStatBlockCollection` through `buildStatBlockCatalog`;
- the Character Creation support profile and Admin Mirror publication factory.

Each registry-owned Play Session root then creates one in-memory store for
character drafts, finalized Character Builds, durable post-battle character
state, selected Stat Block identity, durable battle state, and transient battle
fills, plus its own Admin Mirror publication.

The protocol host keeps those mutable facts in isolated process-lifetime **Play
Sessions**. `create_play_session` returns a branded `playSessionId`,
`read_play_session` resumes a live session, and every character or battle tool
requires the handle. Calls for one handle are serialized; different handles
have independent stores and queues while sharing the application services'
installed catalogs and support profile. The protocol host retains only those
immutable application services, never a mutable anonymous session. A valid
handle not present in the live
process returns the single typed `playSessionUnavailable` result with guidance
to create and rebuild a new session. It intentionally does not infer whether
the handle expired, was evicted, came from another process, or was otherwise
lost.

Stateful protocol results use one contextual envelope derived from the
operation result and canonical session snapshot. It reports the typed operation
result, current projection, unresolved inputs, relevant next operations, and
restoration status. The envelope stores no workflow state and does not become a
second rules or session owner.

The character-creation tool boundary exposes these user-facing tools:

- `describe_mcp_workflow` returns the agent-facing lifecycle, accepted fill
  examples, result paths, recovery rules, and supported workflow limits. This tool
  has an Effect Schema-derived output schema and returns structured content.
- `list_catalog_units` lists installed Unit ids grouped by kind for
  discovery. These ids are catalog facts, not MCP-local support lists; legal
  character choices still come from `discover_creation_holes`.
- `list_stat_blocks` lists selectable SRD Stat Block ids, display names,
  attacks, defenses, damage modifiers, and provenance for `select_stat_block`.
- `inspect_catalog_unit` returns the canonical installed SRD Unit record as
  typed `unitRecordJson` for a Unit id returned by `list_catalog_units`. The
  three catalog calls are
  stateless and require no Play Session handle. Presence in these results does
  not claim Source-Executable support; each consuming workflow remains the
  authority for its contextual support and legal choices.

- `create_character_draft` creates and stores a new character draft, then
  returns the current creation holes.
- `discover_creation_holes` returns the stored draft's current hole frontier,
  draft revision, and finalization status.
- `fill_creation_holes` submits one atomic batch of `CreationFill` values
  against the expected draft revision. Accepted batches replace the stored
  draft; rejected batches return runtime issues and leave the stored draft
  unchanged. The `draft.progression.initial` fill is one selected Character
  Progression profile. It carries the starting class and any post-start
  advancement entries together; MCP does not expose a separate level-1 class
  entry after that fill.
- `finalize_character` finalizes only when the runtime reports a supported
  character draft is ready. Supported character-creation workflows are
  discovered from current creation holes rather than duplicated in MCP docs. A ready result returns
  `build`, stores an available in-play record by characterId, and removes
  the draft from `drafts`. The Character Build remains build-only; the
  session owns current HP while the character is outside battle. Hit Point
  Maximum, Hit Dice capacity, ordinary Spell Slot capacity, Pact Slot
  level/count, and feature-resource capacity are derived from the stored build
  when MCP needs display rows or battle handoff projections.
- `list_characters` lists durable character-session rows. It reads only the
  character-session store, so selected or battled Stat Blocks do not appear as
  characters. Its rows are display projections: Hit Point Maximum, Hit Dice
  capacity, ordinary Spell Slot count, Pact Slot level/count, and resource
  count are derived from the stored Character Build and installed Unit facts,
  then paired with mutable sheet state such as current HP, spent Hit Dice, and
  expenditures.
- `inspect_character_session` reads one selected Character Session without
  copying it into another store. The result contains the canonical stored
  available Character Sheet and one `sheetProjection` for Hit Point Maximum,
  Hit Dice, ordinary Spell Slots, Pact Slots, and supported resources. While a
  character is in Battle, the exact `inBattle` variant contains only the stable
  Character Build and Battle ownership identifiers; it never serializes the
  pre-Battle sheet's mutable Hit Points, conditions, or expenditures as current.
- `apply_character_session_operation` applies supported out-of-battle healing
  and rest-benefit variants through the owning Character Sheet SDK, including
  Lay On Hands and spell-defined rest benefits. For a multi-recipient result,
  the MCP boundary computes every recipient result before atomically committing
  the affected Character Sessions; a rejected operation leaves them unchanged
  and returns the affected ids with retry guidance.

These tools operate on real creation holes. MCP does not offer character
presets, does not patch draft selections directly, and does not import Core
character helpers in the runtime path.

Character Progression and multiclass prerequisites are not MCP-owned facts.
`@dnd/character-creation-runtime` owns the progression shape and support gate,
while `@dnd/shared-algebras/multiclass-prerequisite-algebra` owns the SRD
prerequisite table and check. MCP may project finalized progression class
levels into battle initialization for supported finalized builds.

The battle-session tool boundary exposes these user-facing tools:

- `select_stat_block` selects a Stat Block from the SRD Stat Block
  catalog and stores only that Stat Block id in the session.
- `start_battle` starts a battle session from a non-empty initial combatant
  roster. A combatant can currently come from an available finalized character
  session or from an SRD Stat Block id. The caller supplies the Initiative score
  for every combatant. Starting battle moves each included character session
  into an in-battle variant that has no current HP field; the stored
  `BattleState` owns HP until battle closeout.
- `read_battle_state` returns the stored `BattleState` projection and current
  battle snapshot.
- `discover_battle_acts` returns the current actor's battle acts. The battle
  runtime is the source of truth for which acts are currently available.
- `fill_battle_hole` submits one fill at a time for a selected battle act
  subject. MCP stores transient target, spell target allocation, attack-roll,
  damage-result, and feature-roll fills until `@dnd/battle-runtime` resolves the
  act, then stores the returned `BattleState` and clears the transient fills.
- `resolve_battle_act` resolves selected battle act subjects that need no
  holes, such as Fighter 2 Action Surge.
- `end_turn` resolves the End Turn runtime command for the current actor, stores
  the returned `BattleState`, and clears transient battle fills.
- `end_battle` finalizes the stored battle session, projects positive current
  HP from character-origin battle combatants back into the durable character
  session, returns the SDK-derived Initiative position at closure, clears battle
  state, and leaves monster combatants behind in the closed battle. The closure
  projection does not infer elapsed seconds or assert a RAW ending condition.

The accepted first end-user MCP vertical is Orc Soldier Fighter
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

That fixture uses the authored Unit and Stat Block catalogs. It does
not use character presets, Core projections, duplicated executable stat-block
data, or reducer-owned in-progress battle fills.

The mixed character-and-Stat-Block battle workflow is also covered through MCP tools. It
creates and finalizes an Orc Soldier Fighter 2 and an Elf Soldier Wizard 2
through real creation holes, selects the authored SRD Skeleton Stat Block,
starts battle from both finalized character identities plus multiple selected
Stat Block ids, applies Skeleton Bludgeoning vulnerability through Flail hits,
resolves Fighter Second Wind and Action Surge, casts Wizard `ray_of_frost` as a
cantrip without spending a Spell Slot, lets Skeleton apply authored Shortsword
attack pressure, casts prepared `magic_missile` with a level-1 Spell Slot spend
and explicit dart target allocation, and closes the battle back to
`list_characters`.
The supported Wizard creation choices in this workflow are catalog-backed SRD
Spell Definitions; battle start fails at the MCP boundary rather than dropping
selected spell or feature Unit refs that are not in the Surface catalog.

`list_characters` and `inspect_character_session` are the supported list and
selected-detail read models for this vertical.
After `end_battle`, it reads the durable character session directly. Character
current HP is handed back from the battle-owned character combatant to that
session during closeout; Goblin Warrior remains a closed battle combatant and
never becomes a character-list row.

Zero-HP handoff:

- `end_battle` persists Character-session HP as either positive HP or typed
  zero-HP lifecycle state. The zero-HP branch distinguishes unstable Death
  Saving Throw counters, Stable recovery after `1d4` hours, and dead state.
- Positive-HP Knocked Out state is persisted only when the battle runtime
  supplies it explicitly. MCP does not infer Knock Out from a positive-HP
  Unconscious condition.
- The persisted Knocked Out state is the handoff fact needed for later rest or
  first-aid recovery workflows; it is valid only at `1` current HP.
- Battle runtime remains the HP mutation authority during combat. The character
  session stores the closeout fact needed for `list_characters`, rest/recovery,
  or revival workflows; it does not keep a second combat HP total.

Deferred workflow gates:

- broader rest/revival workflows remain deferred beyond the typed closeout
  state;
- broader character choices, monster spellcasting, Multiattack, reactions,
  casting spells with higher-level Spell Slots, persistent spell effects such as
  Mage Armor, and post-turn lifecycle subjects remain outside this workflow.

Normal package tests cover the MCP server route.

The developer-mode `plugins/srd-play` package connects this application to one
focused conversation Skill. The Skill retains returned handles and sequences
canonical MCP facts; it contains no catalog, rules inventory, executable
choices, or shadow session state. Its repo-owned evaluation inventory separates
automated local MCP startup/inspection evidence from installed-ChatGPT Skill
activation evidence. The latter requires developer-mode execution and is owned
by #328; local tests must not claim that UI evidence.

`BattleResolutionResult` may include display-facing result details for tool
responses, but `BattleState` remains authoritative. Optional display logs must
not become the source of combat truth.

Selected Stat Block state stores only the catalog Stat Block id. The full Stat
Block record is resolved through the MCP root's installed `statBlockCatalog`,
so MCP session state cannot drift from the SRD stat-block catalog.

Transient battle fills are MCP session state. They are kept separate from
`BattleState` so battle replay remains owned by `@dnd/battle-runtime`.

MCP session state belongs here when it is tool workflow state:
draft handles, selected content ids, durable battle ids, and transient fills.
Reducer state and rules behavior remain owned by the runtime packages.

MCP tools should use their final user-facing tool names. The implementation
boundary is the module/package registration path.

MCP input and output contracts are authored as Effect Schema codecs and exported
to MCP as generated JSON Schema. Boundary handlers decode tool arguments through
those schemas before converting to branded runtime ids. Tool responses include
JSON text content plus `structuredContent`; success responses are encoded
through their output schemas.

Generated output schemas carry content-addressed root identities. Identical
output codecs therefore share one generated schema in the server and one AJV
validator in clients that honor JSON Schema `$id`; changing a schema shape
changes its identity automatically.

Character-tool session outputs omit transient battle subjects and fills. That
wire projection is derived from the canonical session snapshot; it does not add
separate session state. Battle tool schemas remain wider than necessary because
they repeat large snapshot, subject, hole, fill, and supported-procedure
definitions. A future deepening may give battle-session and battle-resolution
tools projections specific to their workflows, derived from existing canonical
session and runtime state. It must not add shadow session state, weaken
structured-output validation, or replace typed runtime facts with generic JSON.
Measure that work against cold default-client `listTools()` schema-compilation
time as well as the normal MCP acceptance suite.

Play Session envelopes content-address repeated generated subtrees into local
`$defs` while preserving exact nested validation. The largest routed schema is
kept below the named 700,000-byte cold-discovery budget and protocol tests guard
that limit alongside malformed operation-name, result, and next-operation
rejection.

Character-session input/store schemas are mutable state and selections only.
They may carry current HP, Temporary Hit Points, Hit Point Maximum reduction,
zero-HP lifecycle, conditions, spent Hit Dice, ordinary Spell Slot
expenditures, Pact Slot expenditure, class-feature resource expenditures,
retained companion state, and creation selections such as Wild Shape known-form
ids. They must not accept normal HP capacity, Hit Dice capacity, ordinary Spell
Slot capacity, Pact Slot capacity, or feature-resource capacity as stored
session facts.

Character-session output/display schemas are allowed to be capacity-rich read
models. Those capacities must come from projections such as
`characterSheetHitPointMaximum`, `characterSheetHitDice`,
`characterSheetSpellSlots`, `characterSheetPactSlots`, and
`characterSheetResources`; MCP must not maintain a parallel capacity table.

This package also owns cross-runtime composition helpers. Character Build to
creature-init mapping lives in `src/battle-creature-init.ts`, where finalized
character facts and Unit lookups are projected into battle-owned
initialization data before calling `startBattle`. This keeps character
draft/session concepts out of `@dnd/battle-runtime` without introducing a new
intermediate language. This is package ownership, not a domain term:
`@dnd/mcp` may see Character Builds, authored Units, authored Stat Blocks, and
battle creature-init APIs together because its job is wiring runtimes for
tools.

`start_battle` must receive caller-supplied Initiative scores for every
combatant in `initialCombatants`. MCP must not derive Initiative as
`10 + modifier`.
