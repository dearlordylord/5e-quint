# @dnd/mcp

`@dnd/mcp` exposes tool-facing composition and session wiring for the runtime
packages.

Use this package to expose character creation, character-sheet operations, and
Battle through MCP. Clients discover the next available operations and supply
choices or table facts; the underlying runtime packages apply the rules.
HTTP Play Sessions can recover across server restarts, while stdio provides a
process-lifetime development host.

## Start here

- [Run the server](#run-the-server) for HTTP configuration and the stdio command.
- [Tool workflows](#tool-workflows) for discovery, character creation, and Battle.
- [Play Session ownership](#play-session-ownership) and
  [recovery](#recovery-and-persistence) for persistence and authorization.
- [Output contracts](#output-contracts-and-projections) for client projections.
- [Plugin connection runbook](../../plugins/dnd-srd-oracle/README.md) for client setup;
  [operations](../../operations/public-mcp/README.md) for deployment.

The [root README](../../README.md) introduces the SDK. The
[Battle runtime protocol](../battle-runtime/README.md#runtime-protocol) owns
rule execution, fill replay, and interrupts. MCP owns tool routing, Play Session
storage, and optional dice sampling; it calls those core operations.

## Play through an agent

Connect an MCP client using the [plugin runbook](../../plugins/dnd-srd-oracle/README.md).
Ask the agent to create a character or continue an encounter. The agent can call
`describe_mcp_workflow` for the workflow contract, create a Play Session, and
retain its handle for subsequent stateful calls. Hosted stateful play requires
OAuth; local stdio play is process-lifetime and requires no credential.

For character creation, the agent calls `create_character_draft`, presents the
returned choices, submits `fill_creation_holes`, and repeats discovery until
`finalize_character` succeeds. The player's answers determine the choices;
the runtime checks them.

During an active Battle, the interaction in the [root example](../../README.md#use-it)
maps to these operations:

| Player or agent step                            | MCP operation                                                 |
| ----------------------------------------------- | ------------------------------------------------------------- |
| Ask what the character can do                   | `discover_battle_acts`                                        |
| Select an Act and answer its required questions | `fill_battle_hole`, using the returned hole and fill contract |
| Select an Act with no required holes            | `resolve_battle_act`                                          |
| Inspect the resulting battle                    | `read_battle_state`                                           |

Continue from the returned frontier and relevant next operations, including any
interrupt decision. The example is illustrative dialogue, not a fixed tool script
or a promise that every attack needs the same inputs. Dice may come from the
player's table or the host's sampling tools. Battle Runtime owns resolution and
interrupt sequencing; the agent conveys choices and reports results.

## Runtime Composition

Immutable application services share the Surface Unit/Stat Block catalogs and
creation support profile. Each Play Session owns its mutable store and Admin
Mirror publication. Character creation, progression, sheet projection, Battle
admission, and settlement stay in their runtime packages; MCP supplies tool
arguments, catalog lookups, and atomic session commits.

Use [composition-root.ts](src/composition-root.ts) and
[session-store.ts](src/session-store.ts) when changing that boundary.
Do not introduce MCP-private catalogs, support lists, rules tables, or parallel
runtime state.

## Play Session ownership

`create_play_session` returns a branded correlation handle. On the public HTTP
host, creation and every stateful call require the `play-sessions` OAuth scope;
authenticated creation is saved by default. The local stdio host creates an
ephemeral session owned by that server process and advertises no OAuth or saved-
session management tools. Calls serialize per handle; independent sessions
share only immutable services.

[ADR 0007](../../docs/adr/0007-public-play-session-tenure-and-ownership.md) owns tenure:

- Saved sessions expire after 90 inactive days and support listing, resuming, and
  permanent deletion.
- Local stdio sessions are held only in memory and disappear when that process
  exits; they cannot be promoted into public saved sessions.
- Unavailable sessions always return `playSessionUnavailable`, without guessing
  why they disappeared.

Results expose compact tenure status. Authorization isolates principal-owned
create/list/resume/delete operations. A missing or invalid hosted identity fails
closed with the OAuth challenge and never creates durable anonymous state.

## Recovery and persistence

HTTP persists tenure, format version, random-stream configuration, revision, and
ordered successful reconstructive commands. Each operation reconstructs a root,
applies the command, and commits against the expected revision; conflicts reload
and retry. Disable Admin Mirror publication during reconstruction, then publish
committed projections. Never persist derived summaries or another dice cursor.

DRDice recovery retains the Seed, Dice Group Semantic Profile, PRNG Sequence
Profile, and State Schema Identity. Incompatible databases are retained in
`retired_unowned_play_sessions_v1` or `retired_effect_random_play_sessions_v2`;
old handles do not acquire invented ownership or replay under new dice semantics.
See [SQLite repository](src/sqlite-play-session-repository.ts) and
[schema](src/sqlite-play-session-schema.ts) before changing storage.

Default limits: 20 saved sessions per principal, 10,000 commands per session,
and 120 stateful requests/minute per principal. Legacy guest rows from an older
release remain bounded by their original expiry and are not publicly reachable.
Typed rate/limit failures include retry guidance. Bodies over 1 MiB fail before
MCP parsing.

[Recovery protocol tests](src/recoverable-play-session-protocol.test.ts) cover
restart and concurrent-operation behavior;
[property tests](src/recoverable-play-session.property.test.ts) cover reconstruction.

## Run the server

Run the provider-neutral Node HTTP entrypoint with explicit application and
authorization state paths:

```sh
DND_MCP_PUBLIC_ORIGIN=https://oracle.example.test \
DND_PLAY_SESSION_DATABASE_PATH=/var/lib/dnd-oracle/play-sessions.sqlite \
DND_SAVED_SESSION_AUTHORIZATION_DATABASE_PATH=/var/lib/dnd-oracle/saved-session-authorization.sqlite \
DND_SAVED_SESSION_AUTHORIZATION_SECRET=replace-with-at-least-32-random-characters \
  pnpm --filter @dnd/mcp serve:http
```

`DND_MCP_HOST` defaults to `0.0.0.0` and `PORT` defaults to `8787`. Stdio
development continues to use `pnpm --filter @dnd/mcp dev`; Secure MCP Tunnel
continues to launch that stdio entrypoint rather than the public database. To
exercise the same public composition during development, expose `serve:http`
through an HTTPS tunnel and set `DND_MCP_PUBLIC_ORIGIN` to that tunnel origin.

Stateless catalog discovery remains anonymous. The same public
process owns credential-free saved-session authorization under `/api/auth`;
there is no external identity-provider configuration and no provider-specific
hosting dependency. The public origin canonically derives the MCP resource,
OAuth issuer, audience, and JWKS URLs. The server publishes protected-resource
metadata at
`/.well-known/oauth-protected-resource`. It verifies token signature, issuer,
audience, expiry, subject, and the `play-sessions` scope on every bearer
request. The OAuth provider and hosting provider are not application owners and
can be replaced without changing the session model.
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

For a private Glama Gateway, set its connection-profile token in
`DND_MCP_STAGING_GATEWAY_TOKEN` for the duration of this smoke. The token gates
the Gateway; the smoke still requires the application to reject that token as
an application `play-sessions` credential before any stateful operation.

The provider-neutral OCI image, isolated staging/production Compose boundary,
deploy/rollback automation, redacted observability contract, budget dimensions,
and incident procedures live in the
[public MCP operations runbook](../../operations/public-mcp/README.md).

## Tool workflows

### ChatGPT plugin surface

Set `DND_MCP_TOOL_SURFACE=chatgpt` on the HTTP host to expose the 126 named
ChatGPT tools. The default is `regular`; stdio continues to expose the regular
MCP contract. Choose the surface for the host, rather than per model request.
The two surfaces use the same catalogs, Play Session ownership, reducers,
transactions, and storage.

The ChatGPT surface replaces the five generic execution/query entry points with
named character mutations, queries, roster/setup operations, Battle actions,
spell operations, feature procedures, event reports, and Reaction decisions.
Each registration owns a description, input schema, and all four annotations.
Tools remain advertised when an operation is unavailable in the current state;
canonical discovery and engine admission determine whether it can run now.

Advertised ChatGPT schemas share repeated constraints, factor common object-union
fields, and [inline definitions](src/json-schema-definition-inlining.ts) when
references cost more bytes than the constraints themselves. Inlining preserves
closed objects, required fields, literal data, and tuple constraints. Definitions
with reference siblings, suffix references, recursion, or unproved URI/resource
scopes remain intact. These transformations run only at schema advertisement.
They also [simplify singleton literals](src/json-schema-literals.ts) to `const`
and remove primitive types already implied by that literal. Contradictory type
constraints, instance data, descriptions, and reference scopes remain intact.

Battle results and `read_play_session` include the typed
`chatGptBattleOperations` field in structured content and its matching JSON text. Its acts, ordinary continuation, and Reaction
choices carry `routing`: an available named-tool list or an explicit unavailable
issue. Select an Act with its named tool and canonical subject, without `fill`;
the tool opens any initial holes as a pending transaction. Supply ordinary
facts through `answer_battle_hole`, with `fill` and no subject. The runtime-owned
transaction supplies the subject and rejects stale or foreign-session facts.
Select each Reaction through its own named operation, including
`decline_reaction`, with an `interruptDecision` fill, no subject, and an empty
`choice.fills` array. The transaction owns the parent; subsequent ordinary holes
also use `answer_battle_hole`. That tool cannot select an Act or Reaction.
Regular MCP retains its existing fill-first and inline Reaction answer contracts.
Initial `report_creature_fall` calls require `reactionSpellTargetFacts`, including
an explicit `[]` when the table confirms no qualifying target facts. That field
is absent on other operations.

Saved ChatGPT commands retain `toolSurface: "chatgpt"`, their named operation,
and canonical inputs. Reconstruction uses that surface, preserving overlapping
names such as `end_turn` when a saved session is accessed through either host.
The regular MCP keeps its existing argument shapes and command history.

The following workflow tables describe the regular surface. On the ChatGPT host,
`describe_mcp_workflow` describes the named-operation workflow.

`describe_mcp_workflow` returns lifecycle guidance, fill examples, result paths,
and limits. The contextual result envelope derives the current projection,
unresolved inputs, next operations, and restoration status from canonical state;
it stores no workflow state.

### Catalog and character

| Intent                   | Tools / contract                                                                                                        |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Browse installed content | `list_catalog_units`, `list_stat_blocks`, `inspect_catalog_unit`; stateless, no Play Session required                   |
| Build a character        | `create_character_draft`, `discover_creation_holes`, `fill_creation_holes`, `finalize_character`                        |
| Read characters          | `list_characters`, `inspect_character_session`, `query_character_session`                                               |
| Change a sheet           | `apply_character_session_operation` delegates supported advancement, rest, calendar, companion, and resource operations |

Catalog presence does not imply executable support. Legal choices come from
runtime discovery; no presets or direct draft patches. Accepted fills replace
the draft atomically; finalization stores an available Character Sheet and removes
the draft only after `ready`.

The default creation support profile exposes every selectable Standard Language,
all nine alignments, and every Fighter skill option returned by the SRD class
record. Common is automatic and is not a language fill option. A host that
injects a narrower profile owns that product decision and must make the reduced
boundary visible to clients; the runtime reports unsupported choices as typed
fill issues.

Before starting a Battle, use `apply_character_session_operation` with the
`setEquipmentLoadout` operation. Pass item references returned in the
character's `build.equipment.owned` collection; omit a slot to retain it and
use `null` to clear it. The operation rejects unknown, unowned, conflicting, or
incompatible selections atomically and returns the updated character detail.
This transition validates equipment and loadout compatibility; Battle admission
remains authoritative for executable weapon mechanics. A successful loadout
update does not guarantee that `start_battle` accepts a roster when a selected
weapon references a battle-unsupported mastery; Battle rejects that roster
atomically until the corresponding Battle owner exists.

Finalization stores canonical weapon references in the `main:<unitId>` slot.
To move one to the off hand, pass that returned main-slot reference as
`offHandWeapon.itemId`; the MCP adapter rekeys it to `off:<unitId>` before
owner and loadout validation. Main/off aliases are accepted only for weapons;
armor and shield references must retain their own slots.

Stored sheets contain mutable state and selections. Derive capacities through
Character Sheet projections. During Battle, character reads expose the
`inBattle` ownership variant, not stale pre-Battle HP or expenditures. Stat Block
combatants never become character-list rows.

Specialized contracts:

- [Queries](src/character-session-query.ts) return canonical derived facts;
  they are unavailable in Battle. The public spell query admits ritual invocation,
  not arbitrary out-of-Battle casting.
- [Rest timing](src/character-session-rest-timing.ts) uses strictly increasing
  `cumulativeRestedTicks`; derive adjacent intervals so time cannot count twice.
  Interrupted Long Rest includes its interruption history and final resumed
  segment in one atomic call, with no resumable MCP intermediate.
- [Rest operations](src/character-session-rest-operation.ts) delegate recovery
  and reselection rules. [Healing targets](src/character-session-healing-targets.ts)
  validate all affected sessions before any multi-recipient commit.
- [Resource operations](src/character-session-resource-operation.ts) delegate
  expenditure/conversion to sheet reducers without a second resource store.

### Battle

| Intent                      | Tools                                                |
| --------------------------- | ---------------------------------------------------- |
| Choose a catalog origin     | `select_stat_block` retains its id                   |
| Enter Battle                | `start_battle`                                       |
| Manage setup/roster         | `battle_lifecycle`                                   |
| Discover and inspect        | `discover_battle_acts`, `read_battle_state`          |
| Answer or resolve           | `fill_battle_hole`, `resolve_battle_act`, `end_turn` |
| Settle characters and close | `end_battle`                                         |

`start_battle` accepts a non-empty mixed roster of available characters and SRD
Stat Blocks. Callers supply final Initiative scores, including companions;
MCP performs no Initiative arithmetic or roll-mode interpretation. When
`list_stat_blocks` exposes authored Size alternatives, the corresponding
Stat Block combatant must include one of those values as `size`.
`initiativeMode: initialSetup` retains the SDK setup and currently excludes
companion admission. The workflow is exactly one of `none`,
`initialInitiativeSetup`, or `activeBattle`.

Roster changes commit prospective Battle state and character occupancy atomically.
[Character Battle](../character-battle-runtime/README.md) owns admission and
settlement; MCP must not duplicate its projection helpers.

`fill_battle_hole` supplies one answer to the selected subject. Continue from the
runtime-owned checkpoint/frontier; clear accepted fills on successful commit.
[Battle transactions](src/battle-tool-transaction.ts) own tool-level result
storage; [Battle Runtime](../battle-runtime/README.md#runtime-protocol) owns
ordinary replay and durable interrupt continuation.

`end_battle` computes every character settlement before one atomic roster commit.
Rejection preserves all sessions. Success clears Battle and returns the complete
character list and SDK-derived Initiative position, without inferring elapsed
seconds or a RAW ending condition. Preserve typed zero-HP/death/stability state;
positive-HP Knock Out must be explicitly supplied by Battle and is valid at 1 HP.
Do not infer it from an Unconscious condition or retain a second combat HP total.

### Dice

`roll_dice` is an optional bounded raw-face sampler. Each accepted call advances
the owning Play Session's dice sequence; repeated calls are not deduplicated and
may produce another roll, so a caller should not automatically retry after an
uncertain result. Successful calls in recoverable sessions are retained as
separate operations. Sampling is reproducible and non-cryptographic, but it
provides no commit/reveal fairness. The tool returns raw faces only: it never
derives modifiers or outcomes and never inspects or auto-fills Battle holes. See
[dice tools](src/dice-tools.ts) and [sampling service](src/dice-sampling-service.ts).

## Output contracts and projections

Effect Schema codecs own input parsing and output encoding. Responses provide
both `structuredContent` and encoded text. Generated JSON Schema derives from
those codecs; do not author a parallel result model.

Output schemas use content-addressed identities and shared `$defs`.
Capacity-rich outputs derive their facts from runtime projections; storage schemas
must not accept those capacities as independent state. Character-tool outputs
omit accepted Battle subjects/fills. Model-facing projections preserve canonical
root branches, fields, requiredness, and outer types; exact codecs remain the
encoding authority.

Protocol tests enforce the complete tool catalog's 2 MB app-version limit and
the named 700,000-byte largest routed-schema cold-discovery budget, alongside
malformed operation/result/next-operation rejection. See
[model-facing schemas](src/play-session-model-facing-schema.ts) and
[output schema tests](src/model-output-json-schema.test.ts).

## Verification

Use production tools and catalog-backed discovery in acceptance tests.

- [End-user acceptance](src/end-user-vertical.acceptance.test.ts): creation,
  Battle interaction, and character closeout.
- [MCP protocol](src/mcp-protocol.test.ts): registered contracts and encoding.
- [Play Session protocol](src/play-session-protocol.test.ts): routed session behavior.
- [Recovery protocol](src/recoverable-play-session-protocol.test.ts): persistence and retry.

```sh
pnpm --filter @dnd/mcp typecheck
pnpm --filter @dnd/mcp test
```

Local transport/parity tests do not establish live HTTPS deployment health.
Use the staging smoke in [Run the server](#run-the-server) for that evidence.

## npm distribution

The stdio entrypoint is packaged as `@dearlordylord/dnd-mcp` in the same
repository. See [consumer setup](../../distribution/mcp/README.md) and the
[distribution workflow](../../scripts/distribution/README.md) for build,
packed-protocol verification, and release instructions.

## Operation accounting

Run `pnpm --filter @dnd/mcp check:operation-accounting`. The script derives
finite operation domains from the types consumed by execution, checks exhaustive
[decisions](scripts/operation-accounting-decisions.ts), resolves implemented
function owners, verifies canonical spell profile callbacks, and compares public
entry points with the actual hosted/local tool builder. It also runs before
`check:submission-fast`. A new member requires an explicit decision; there is no
fallback bucket or snapshot regeneration step.

Generate a complete report when needed:

```sh
pnpm --filter @dnd/mcp exec tsx scripts/operation-accounting.ts --report /tmp/dnd-operation-accounting.md
```

`--json PATH` provides the same accounting as machine-readable output. Generated
reports are not committed sources of truth. The
[execution contract](src/chatgpt/execution-domains.ts) names the audited
families and their canonical types. It preserves compound subject discriminants
and spell operations behind references, including persistent-effect follow-ups.
Each member is classified as a caller operation, reference dispatch,
continuation, internal composition, or unavailable binding, with source evidence.
Reports also derive each implemented owner's finite return tags from its TypeScript
signature. The gate rejects compiler errors in the loaded production source graph
before accepting these type-derived facts. Unclassified return shapes are reported
explicitly. An owner's absence
of `needsHoles` describes that function alone: interrupt dispatch, replay, and
caller composition must also be accounted for before narrowing a tool's continuation
schema.

[Owner frontier analysis](scripts/execution-owner-frontiers.ts) projects ordinary
hole kinds and replay-subject carriers from each implemented owner's declared
result type, retaining their association within each frontier branch. Terminal owners
report an empty set; unresolved signatures, tags, and frontier shapes report an
explicit unclassified result. Narrow Ready and Help result contracts retain their
constructor-derived hole types and their initiating subject types. These are owner declarations, not a transitive
proof across dispatch, callbacks, interrupts, or replay, and do not alone narrow
a tool's continuation schema.

The report also projects instantiated return types at calls to named generic
ordinary-frontier producers. This preserves subject and hole associations through
forwarding helpers, including spatial procedures and spell selection. The scope
includes direct needs-holes branches and the `result` of a resolution wrapper;
each row records its result path. Indirect calls and other result shapes remain
outside this evidence. These call-site facts do not establish transitive
operation reachability.

The report records symbol-resolved calls to the canonical ordinary-hole result
helpers, whose return types preserve the supplied hole tuple and subject. Each call reports
its inferred hole kinds and the subject carriers supplied at that call; broad
inputs remain broad and unclassified carriers remain explicit. Accounting checks
the structural carrier projection against the complete canonical subject-key
domain before accepting the report. It also reports shortest
named-caller ancestor distances in a symbol-resolved graph, deduplicating cycles
by declaration identity. Anonymous callbacks are attributed to their enclosing
named declaration, and indirect calls remain unresolved. These requests are evidence
for a continuation analysis, and require the same caller/interrupt/replay proof
before they can narrow a named tool schema.

The report also inventories typed hole-shaped object constructions in the loaded
runtime graph, with source owners, symbol-resolved direct calls to named owners,
and explicit unclassified discriminants. Empty caller lists do not establish
unreachability; indirect calls and transitive operation reachability remain outside
this construction evidence.

Families overlap; their counts are not unique action or required tool totals.
This checks completeness of the named typed execution domains, not reachability
or arbitrary semantic changes within an unchanged discriminant. Adding an
entirely new execution pathway requires extending the audited families during
architecture review. Existing RAW, runtime, and formal checks still apply.
The accounting verifies the implemented ChatGPT tool split against the typed
execution domains and actual advertised registrations. It does not establish
review approval. Content record
identities and state-dependent act availability do not create additional tools.
Internal admin and HTTP/OAuth methods are outside the model-callable surface.

The [ChatGPT tool plan](src/chatgpt/operation-tool-plan.ts) is a strongly typed
consumer of that execution contract. Each execution member has a concrete tool
route, a refinement into a named family or specific operation subset, a bound
continuation, internal composition, or an unavailable decision. Common Battle
and Unit procedure decisions are referenced by their overlapping families.
The accounting generator checks every mapping key against its live execution
analysis, validates referenced operations and tool names, rejects refinement
cycles and hidden caller operations, and verifies the implemented tool count.
The generated report lists every named tool and its execution selections.

`ChatGptToolSelection<Name>` and `ChatGptToolInvocation` preserve the correlation
between a tool name and its concrete execution selectors.
`chatGptToolAcceptsSelection` supplies a guard for typed selection consumers;
reference gateways must first resolve to a concrete procedure or retained action.
Ordinary continuation inputs route to `answer_battle_hole`, which derives the
selected subject from the pending transaction. Nested Reaction choices use the
explicit tool that owns that operation. Engine admission,
ownership, timing and resource checks remain necessary. The selection contract is
routing metadata, not a replacement for canonical parsed engine inputs.

Reaction navigation entries contain `selection` and routing information. The
selection schema derives from every canonical Reaction-choice branch with its
`initialHoles` field removed; the complete choices and their holes remain in the
Battle frontier at `choices[].choice`. Navigation does not copy those execution
facts or change the declared operation inputs.

The [ChatGPT registrations](src/chatgpt/tool-surface.ts) exhaustively implement
the plan's tool names. The generator compares their actual hosted definitions
with its execution analysis and checks descriptions, closed root inputs, and
annotations. The HTTP host selects them explicitly; regular MCP registration
remains the default. Generated reports are evidence, not a second configuration
source.

The submission fast gate scans the hosted ChatGPT definitions and their canonical
codec owners. Candidate evidence fingerprints the same 126-tool host and exercises
named Battle attacks and Reaction decisions. Canonical output review derives from
execution/replay grammar owners even where an advertised output schema is omitted;
it does not add those review schemas to tool discovery. The shared pending-procedure
codec also owns recovery-envelope continuations returned by non-Battle operations;
the scanner follows local references while retaining their property ownership.
