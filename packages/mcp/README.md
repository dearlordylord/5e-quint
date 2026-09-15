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
retain its handle and any guest grant for subsequent stateful calls.

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

`create_play_session` returns a branded handle and, for anonymous creation, a
guest grant. Clients retain both for stateful calls. Authenticated creation is
saved by default. Calls serialize per handle; independent sessions share only
immutable services.

[ADR 0007](../../docs/adr/0007-public-play-session-tenure-and-ownership.md) owns tenure:

- Guest sessions expire after seven inactive days; capacity eviction may remove
  oldest-first only after 24 inactive hours.
- `save_play_session` atomically replaces guest-capability ownership with one
  OAuth principal. The old grant stops authorizing access.
- Saved sessions expire after 90 inactive days and support listing, resuming, and
  permanent deletion.
- Unavailable sessions always return `playSessionUnavailable`, without guessing
  why they disappeared.

Results expose compact tenure status. Emit longer guest guidance on creation;
offer saving after finalization/closeout when available. OAuth-free hosts report
saving unavailable. Authorization stores guest-grant digests, compares in
constant time, and isolates principal-owned list/resume/save/delete operations.

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

Default limits: 1,000 guest sessions, 20 saved sessions per principal, 10,000
commands per session, and 120 stateful requests/minute per capability or principal.
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

Guest play and stateless catalog discovery remain anonymous. The same public
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

The provider-neutral OCI image, isolated staging/production Compose boundary,
deploy/rollback automation, redacted observability contract, budget dimensions,
and incident procedures live in the
[public MCP operations runbook](../../operations/public-mcp/README.md).

## Tool workflows

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

`roll_dice` is an optional bounded raw-face sampler. A caller UUID v4 makes retries
idempotent; conflicting reuse is rejected. It returns sampling profiles, never
derives modifiers/outcomes, and never inspects or auto-fills Battle holes.
Sampling is reproducible and non-cryptographic; it provides no commit/reveal
fairness. See [dice tools](src/dice-tools.ts) and
[sampling service](src/dice-sampling-service.ts).

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
