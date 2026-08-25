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

The protocol host keeps those mutable facts in isolated **Play Sessions**.
`create_play_session` returns a branded `playSessionId`; an anonymous creation
also returns its opaque guest access grant. The agent carries both values for
every stateful operation without asking the user to manage credentials. An
authenticated creation is saved by default. Calls for one handle are
serialized; different handles have independent stores and queues while sharing
the installed catalogs and support profile.

The provider-neutral public boundary is owned by
[ADR 0007](../../docs/adr/0007-public-play-session-tenure-and-ownership.md).
The HTTP composition stores one canonical recoverable representation in
SQLite. Guest sessions expire after seven inactive days and may be removed
oldest-first under capacity pressure only after 24 inactive hours. Saving via
`save_play_session` atomically replaces guest-capability ownership with one
OAuth principal; the stale grant no longer authorizes the session. Saved
sessions expire after 90 inactive days, can be explicitly listed and resumed,
and can be permanently deleted. Absence always returns the same typed
`playSessionUnavailable` result, without a tombstone that guesses why the
session is gone.

Every result keeps the compact guest-or-saved tenure status discoverable. The
longer temporary-session guidance is emitted when a guest session is created.
When OAuth is available, `save_play_session` joins the relevant next operations
after character finalization or Battle closeout. Ordinary operations do not
repeat that guidance. When a user expresses an intention to return, the agent
can offer the same standard save operation if the projected availability says
it is available; authentication is needed only if the user accepts that offer.
OAuth-free hosts instead project that saving is unavailable.

The public HTTP composition has the first recoverable slice of that boundary.
Its SQLite record contains one format version, the Play Session's random-stream
seed, an optimistic storage revision, and the ordered non-read-only tool
commands whose calls completed without an MCP error and are needed to
reconstruct the application store. It does not store
session summaries, Character Draft presentations, Admin Mirror projections, or
other derived views. A routed operation reconstructs a candidate root from that
record, applies the operation, and commits its input only if the expected
storage revision still owns the record; a conflict reloads and retries against
the new canonical history. Admin Mirror publication is disabled during replay
and recreated from the committed current projection.

Databases created before the ownership boundary contain recoverable commands
but no principal or guest capability that can authorize them safely. On first
open, that five-column table is atomically renamed to
`retired_unowned_play_sessions_v1`; a new owned-session table is created and the
old handles become uniformly unavailable. The retired rows remain local for an
operator-controlled disposition instead of being assigned an invented owner or
silently deleted.

The first public acceptance witness creates a Guest Play Session, creates and
mutates one Character Draft, replaces the HTTP server and SQLite connection,
and continues from revision 1 through `/mcp`. The next witness finalizes that
recoverable workflow into a Character Session, replaces the HTTP server and
SQLite connection, lists and inspects the reconstructed sheet, advances its
Fighter class level, replaces those owners again, and observes the updated
canonical build. Derived Hit Points, Hit Dice, labels, and other sheet projections are
recomputed from the retained commands, installed Units, and runtime owners;
they are not session-record fields. The Battle entry witness covers both
supported entry paths: a direct-Initiative Battle
recovers as the same active Battle, and an initial-Initiative setup recovers as
the same setup before one atomic finalization makes it the sole active Battle.
Concurrent finalization returns one accepted transition and one typed
already-finalized result; it never reconstructs both lifecycle owners. Active
Battle recovery continues the same Character + Goblin Warrior workflow across
the target, attack-roll, and damage Runtime Holes: the target fill is retained
before replacement, competing attack-roll fills settle as one `needsHoles` and
one typed `invalidFill`, the server-correlated damage roll resolves after
replacement, and another replacement reconstructs the damaged combatant before
atomic closeout. A final replacement reconstructs the complete available
Character Session roster with no active Battle. The serialized random seed and
retained command prefix also have a bounded property test over arbitrary valid
dice-group sequences: two independently reconstructed owners produce identical
raw faces for every prefix without a parallel dice cursor.
The boundary stores only a digest of a guest grant, compares presented grants
in constant time, and never returns another user's session through list,
resume, save, or delete. The default limits are 1,000 retained guest sessions,
20 saved sessions per principal, 10,000 retained commands per session, and 120
stateful requests per minute per capability or principal. Limit failures are
typed and rate failures include a retry delay. HTTP bodies over 1 MiB are
rejected before MCP parsing.

Run the provider-neutral Node HTTP entrypoint with an explicit database path:

```sh
DND_PLAY_SESSION_DATABASE_PATH=/var/lib/dnd-oracle/play-sessions.sqlite \
  pnpm --filter @dnd/mcp serve:http
```

`DND_MCP_HOST` defaults to `0.0.0.0` and `PORT` defaults to `8787`. Stdio
development continues to use `pnpm --filter @dnd/mcp dev`; Secure MCP Tunnel
continues to launch that stdio entrypoint rather than the public database.
Guest play and stateless catalog discovery need no OAuth configuration. To
enable saved-session creation, save, list, resume, and delete, set the complete
provider-neutral OAuth configuration; a partial configuration fails startup:

```sh
DND_OAUTH_RESOURCE_URL=https://oracle.example.test/mcp \
DND_OAUTH_AUTHORIZATION_SERVER=https://identity.example.test \
DND_OAUTH_ISSUER=https://identity.example.test \
DND_OAUTH_AUDIENCE=dnd-oracle \
DND_OAUTH_JWKS_URL=https://identity.example.test/.well-known/jwks.json \
DND_PLAY_SESSION_DATABASE_PATH=/var/lib/dnd-oracle/play-sessions.sqlite \
  pnpm --filter @dnd/mcp serve:http
```

The server publishes OAuth protected-resource metadata at
`/.well-known/oauth-protected-resource`. It verifies token signature, issuer,
audience, expiry, subject, and the `play-sessions` scope on every bearer
request. The OAuth provider and hosting provider are not application owners and
can be replaced without changing the session model.
When OAuth is not configured, the server advertises anonymous security only and
omits the save/list/delete tools instead of offering capabilities that cannot
run.
The executable parity test starts both real transports, compares the server
instructions and complete advertised tool contracts, compares representative
static and stateful results, and runs the complete newcomer journey through
HTTP. A live HTTPS staging smoke remains deployment evidence and is not
substituted by this local test. Once a staging endpoint exists, run that smoke
without changing the application or transport composition:

```sh
DND_MCP_STAGING_URL=https://staging.example.test/mcp \
  pnpm --filter @dnd/mcp verify:staging
```

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
- `apply_character_session_operation` is the shared durable mutation surface
  for finalized Character Sessions. Its class-level advancement variant accepts
  the existing Character Build level-gain shapes and delegates advancement to
  `@dnd/character-creation-runtime`; its Druid known-form replacement variant
  delegates Wild Shape admission and replacement to the existing runtime facts.
  Accepted progression and replacement mutations rebuild one canonical
  Character Sheet, compute the updated detail before committing it, and return
  that detail. Routed Play Session responses add the current `nextOperations`
  projection; rejected or unsupported facts are typed operation failures and
  leave the stored session unchanged.
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
- `query_character_session` exposes one discriminated, intent-oriented read
  surface for the existing Character Sheet ability/proficiency substitutions,
  jump ability, linked Speed grants, Armor Class, Spell Access, Druid known
  forms, Weapon Mastery selections, ritual access, and the existing ritual-only
  Spell Invocation projection. It returns the canonical SDK projection or a
  typed rejection, derives nothing into session state, and is unavailable while
  the Character Session is in Battle. Its spell query admits only the public
  ritual shape; it does not provide generic out-of-Battle casting, a spell
  ledger, or internal cast helpers.
- `apply_character_session_operation` also composes atomic rest and calendar
  operations. `completeShortRest` and `completeLongRest` receive the caller's
  elapsed-rest facts and recovery selections. `interruptLongRest` receives a
  non-empty interruption history plus the final resumed-rest segment, applies
  any permitted Short Rest benefits at each interruption, and finishes the
  composed rest in that same call; it does not expose a resumable intermediate.
  Every segment and the final completion use `cumulativeRestedTicks`, which
  must strictly increase. The MCP replay derives each interval from adjacent
  boundaries, so no elapsed interval can qualify twice.
  `interruptShortRest` receives its activity fact and returns no benefit.
  `completeLongRest` passes Weapon Mastery reselections to the Character Sheet
  runtime, while `passCalendarTime` delegates Stable recovery and returns its
  resolved, unresolved-hole, or invalid outcome. Start and finish validation
  occurs inside each call, so MCP retains no branded rest intermediate or
  separate rest state machine. A resumed Long Rest's required duration includes
  one additional hour for every interruption; the final cumulative boundary
  must also provide that full required duration.
  The same atomic operation surface routes Lay On Hands and supported spell
  rest benefits across available Character Sessions; multi-recipient healing
  validates every affected session before committing any of them.
  It also routes Spell Access free-cast expenditure, Monk Uncanny Metabolism,
  and both Font of Magic conversion directions through the Character Sheet
  resource reducers without duplicating resource state in MCP.

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
  session or from an SRD Stat Block id. The caller supplies the final Initiative
  score for every combatant, including retained companions admitted alongside
  the initial roster. Set `initiativeMode` to `initialSetup` to retain the
  SDK-owned initial-Initiative setup instead of immediately creating an active
  Battle. Initial setup currently excludes retained companion admissions because
  the SDK exposes no setup-time companion admission operation; use the direct
  final-Initiative path when retained companions are required. Character and
  Stat Block projections are validated before the canonical Battle workflow and
  every included Character Session are committed.
- `battle_lifecycle` is one discriminated Battle-lifecycle surface. Its
  `applyInitiativeSwap` and `finalizeInitialInitiativeSetup` variants operate
  on the SDK-owned initial-Initiative setup. Its active-Battle-only
  `addCombatant` and `removeCombatant` variants use the existing Character
  Session or SRD Stat Block admission projections and Battle removal semantics;
  Character occupancy and settlement are computed with the prospective Battle
  result and committed atomically with typed retry guidance on failure. MCP
  reports each combatant's SDK-required roll mode and forwards caller-supplied
  Initiative facts through existing SDK contracts; it performs no Initiative
  arithmetic or roll-mode interpretation.
- `read_battle_state` returns the canonical stored `BattleState` projection and
  current battle snapshot. The Play Session projection has exactly one Battle
  workflow state: `none`, `initialInitiativeSetup`, or `activeBattle`.
  Character occupancy remains visible through the Character Session read models
  while the SDK setup object or active Battle owns the combat facts.
- `roll_dice` is an optional independent bounded raw-face roller. It returns
  server-correlated results, but never derives modifiers or outcomes, inspects
  or auto-fills Battle holes, retains history, or provides caller idempotency;
  calculations must use canonical returned facts.
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
- `end_battle` computes every character-origin settlement first, then commits
  the whole Character Session roster in one atomic registry operation. On
  success it returns the complete Character Session list, the SDK-derived
  Initiative position at closure, and clears battle state; monster combatants
  never become Character Session rows. A rejected settlement leaves both the
  Battle Session and every Character Session unchanged. The closure projection
  does not infer elapsed seconds or assert a RAW ending condition.

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

`list_characters`, `inspect_character_session`, and `query_character_session`
are the supported list, selected-detail, and derived-fact read models for this
vertical.
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

- revival workflows remain deferred beyond the typed closeout state;
- broader character choices, monster spellcasting, Multiattack, reactions,
  casting spells with higher-level Spell Slots, persistent spell effects such as
  Mage Armor, and post-turn lifecycle subjects remain outside this workflow.

Normal package tests cover the MCP server route.

The developer-mode `plugins/dnd-srd-oracle` connection, local installation, and
Secure MCP Tunnel runbook lives in [`plugins/dnd-srd-oracle/README.md`](../../plugins/dnd-srd-oracle/README.md).
The plugin retains returned handles and sequences canonical MCP facts; it
contains no catalog, rules inventory, executable choices, or shadow session
state. Its evaluation artifacts record external observations separately from
the automated MCP protocol evidence.

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
separate session state. The model-facing schemas for capacity-rich battle
results retain each canonical result's root branches, fields, requiredness, and
outer value types without repeating nested snapshot, subject, hole, fill, and
supported-procedure definitions in every tool registration. The exact Effect
Schema remains the response encoder and runtime boundary authority. The
projection is derived from it and does not add a parallel result model or
shadow session state.

The complete registered tool catalog must remain below ChatGPT's 2 MB app-version
storage limit. Protocol tests enforce that external constraint alongside schema
validity, while the normal MCP acceptance suite verifies exact response
encoding.

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
`10 + modifier`; raw dice faces belong to the separate generic roller and can
only enter a battle through a canonical SDK fill/initialization contract.
