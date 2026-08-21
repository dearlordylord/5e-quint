# SRD Play Plugin Skill and MCP guidance ownership

> **Research evidence, not architecture authority.** This note records current
> platform facts and implementation evidence for Wayfinder issue
> [#313](https://github.com/dearlordylord/5e-quint/issues/313). Stable product
> structure belongs in the owner routed by
> [`CONTEXT-MAP.md`](../../CONTEXT-MAP.md).

Research checked: 2026-08-21.

## Question

Which guidance belongs in the ChatGPT Plugin Skill, MCP server instructions,
tool metadata, and tool results for the SRD Play workflows? Which rules and
support facts must remain canonical in the SDK/runtime and MCP instead of being
copied into the Skill?

## Decision-ready finding

Use one focused SRD Play Skill as the **ChatGPT conversation workflow layer**.
It should recognize the user's goal, sequence existing MCP operations, present
the returned rules facts and choices, retain the `PlaySessionId`, stop for a
real user choice or roll, and report the result and next step. It must not
contain a second catalog, rules manual, list of supported mechanics, or
hard-coded executable choices.

The Skill is not a universal server pre-prompt. ChatGPT first sees Skill name
and description, then loads the complete `SKILL.md` only when the request
matches or the user invokes it. By contrast, MCP initialization instructions
and tool metadata are available with the server connection. OpenAI assigns
repeatable sequences, decision points, output requirements, and examples to a
Skill, while the MCP server continues to own live data and controlled actions.
[Skills](https://developers.openai.com/plugins/concepts/skills),
[Build Skills](https://developers.openai.com/plugins/build/skills)

This distinction preserves the accepted product boundary: `@dnd/mcp` remains
usable by ChatGPT and by other MCP clients. A non-ChatGPT client must still be
able to discover the operations, supply valid inputs, interpret results, and
recover from failures without the Plugin Skill. The Skill improves ChatGPT's
orchestration and presentation; it cannot repair an incomplete MCP contract or
missing SDK/MCP capability. This follows accepted issues
[#302](https://github.com/dearlordylord/5e-quint/issues/302),
[#305](https://github.com/dearlordylord/5e-quint/issues/305), and
[#306](https://github.com/dearlordylord/5e-quint/issues/306).

## Ownership matrix

| Owner | Guidance and facts it should own | It must not own |
| --- | --- | --- |
| SDK/runtime and Surface presentation owners | Canonical SRD catalog facts; legal Character Creation choices and cardinalities; Character Sheet and Battle state; available Battle Acts; Runtime Holes and valid fill shapes; rules derivations, labels, summaries, roll requirements, outcomes, and typed runtime failures. | ChatGPT phrasing, Plugin activation, MCP tool names, or a conversation script. |
| MCP application operations | Atomic application semantics, Play Session lookup and mutation, capability parity, and the consistent contextual report: what happened, current projection, unresolved choices, available next operations, and restoration requirements. | Plugin-owned shadow state or rules inferred from names and prose. |
| MCP server instructions | A short, cross-tool invariant for every MCP client: create or retain an explicit `PlaySessionId`; copy current identifiers, subjects, holes, and options from results; do not invent executable mechanics; rediscover after stale-state failures. Put the most important guidance in the first 512 characters. | A long workflow, every tool description, a personality, or a copied SRD rules summary. |
| MCP tool metadata | Stable action-oriented name and title; a description of the user intent and exact call conditions; explicit input and output schemas; parameter provenance; side effects and accurate annotations; typed failure behavior. | Broad conversational choreography or hidden assumptions that are absent from the schemas/results. |
| MCP tool result | `structuredContent` containing the model-reusable operation result, stable identifiers, canonical projections, the contextual report, and structured failures; concise model-readable `content` sufficient to answer without UI. Use `_meta` only for client/widget-only data because it is hidden from the model. | Secrets, a widget-only copy of required workflow facts, or narrative invented by ChatGPT. |
| Plugin Skill | Activation for SRD exploration/play goals; conversation sequencing across catalog exploration, Character Creation, Character Sessions, Battle handoff, Battle operations, dice, closeout, and recovery; when to ask, stop, or continue; how to present MCP facts and synthetic narrative framing; final response requirements. | Legal options, current acts, rule derivations, supported-capability lists, authored Stat Block Records, state, authorization, or a fallback implementation of missing MCP behavior. |
| Optional UI | A secondary projection of the same tool result when it materially helps inspection. | Required workflow guidance, canonical state, or an operation that the conversation cannot perform without the widget. |

OpenAI's server guidance supports this split. Server initialization
`instructions` are for shared sequencing or limits and should not repeat every
description. Tool names, descriptions, schemas, annotations, and handlers are
part of user-facing behavior. Tool results may contain model-visible
`structuredContent` and `content`; `_meta` is client-specific and hidden from
the model. UI is optional, and tools must remain useful without it.
[Build an MCP server](https://developers.openai.com/plugins/build/mcp-server),
[Define tools](https://developers.openai.com/plugins/plan/tools),
[Add UI to your MCP server](https://developers.openai.com/plugins/build/chatgpt-ui)

## Minimal Skill contract for issue #309

The Skill description should name one recognizable user goal: explore and use
the repository's redistributable SRD Surface through Character Creation,
Character Sessions, and Battle. It should activate for both direct requests
and natural requests such as making a character, inspecting available SRD
options, starting or continuing a Battle, or asking what can happen next. It
should not activate merely because a user mentions D&D in an unrelated task.
OpenAI says the description controls consideration and detailed procedure
belongs in the body.
[Build Skills](https://developers.openai.com/plugins/build/skills)

The body needs only these durable instructions:

1. Establish the user's current goal and use the relevant discovery/read tool
   before making a stateful choice when the current result is not already in
   context.
2. Create or retain the application-provided `PlaySessionId` and pass it in
   every stateful call. Do not ask the user to manage it during ordinary use.
3. Treat returned catalog records, Character Creation Holes, options,
   cardinalities, Battle Acts, Runtime Holes, presentation facts, and next
   operations as authoritative. Never manufacture an identifier, executable
   choice, fill, rule result, or user-authored Stat Block Record.
4. Present relevant rules facts faithfully, then ask only for an unresolved
   user decision or a roll. Synthetic names, situations, and narration may make
   the scenario engaging, but they cannot create mechanics or PHB+ content.
5. For dice, present the SDK/MCP-projected roll requirement, explicitly call
   the generic structured bulk roller when requested, show the returned faces
   and calculation, then submit the ordinary typed fill. Physical dice use the
   same fill path.
6. After each operation, report the MCP-provided outcome, current Play Session
   projection, unresolved choices, available next operations, and any recovery
   or restoration requirement. Continue automatically only when no meaningful
   user choice is being taken away.
7. On Battle closeout, use the canonical whole-roster operation and then read
   the Character list. On an unknown or expired Play Session, explain the typed
   loss and guide creation of a new Play Session; never silently replace it.

These instructions compose the accepted decisions in
[#304](https://github.com/dearlordylord/5e-quint/issues/304),
[#305](https://github.com/dearlordylord/5e-quint/issues/305),
[#306](https://github.com/dearlordylord/5e-quint/issues/306), and
[#308](https://github.com/dearlordylord/5e-quint/issues/308). Exact journey
examples may live in a Skill `references/` file, but they should copy result
shapes only for testing and must never become the authority for current legal
choices. OpenAI recommends concise `SKILL.md` instructions and supporting
references for detailed policies, schemas, and examples.
[Build Skills](https://developers.openai.com/plugins/build/skills)

## Developer-mode behavior that affects the design

Testing the MCP connection and testing the Plugin Skill are two distinct
stages. Developer mode can register the public HTTPS or Secure MCP Tunnel
connection, expose server instructions and tool metadata, and test tool
selection. To test Skill activation and combined workflows, the complete
Plugin must package the Skill and registered connection, be installed from a
local marketplace, and be exercised in a new conversation. A connection alone
does not prove the Skill.
[Connect and test your Plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt),
[Package your Plugin](https://developers.openai.com/plugins/build/plugins)

Metadata changes are not assumed to appear live. In developer mode, restart or
deploy the server, refresh the connection, confirm the discovered metadata,
and start a new conversation. Published Plugin metadata and MCP-imported Skills
are snapshots: changed server metadata or Skill resources require a new scan
and Plugin version. ChatGPT and Codex do not fetch an imported Skill from the
MCP server at runtime.
[Connect and test your Plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt),
[Build Skills](https://developers.openai.com/plugins/build/skills)

Use two small evaluation sets:

- **MCP set:** direct and indirect tool intents, follow-ups reusing returned
  identifiers, invalid/stale identifiers, state-changing calls, and unsupported
  requests. Record selected tool, arguments, structured result, error, and any
  confirmation.
- **Plugin set:** direct and indirect Skill activation, incomplete requests,
  full Character-to-Battle-to-Character journeys, physical and generated dice,
  expired-session restoration, negative activation, and an attempt to invent
  an executable Stat Block.

Run the conversation without UI as the required case. Test optional components
separately and verify the same model-readable result remains sufficient. OpenAI
explicitly requires testing both Skill activation/output quality and the
combined Skill/tool workflow, and recommends golden prompt sets for tool
metadata iteration.
[Build Skills](https://developers.openai.com/plugins/build/skills),
[Optimize metadata](https://developers.openai.com/plugins/guides/optimize-metadata),
[Connect and test your Plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt)

## Current `@dnd/mcp` evidence

The current server has useful canonical projections already:

- Character Creation results return current Holes, option labels,
  cardinalities, finalization state, and a session summary
  ([`character-tool-output.ts`](../../packages/mcp/src/character-tool-output.ts)).
- Battle results return SDK-owned presentation facts, available acts with
  labels/summaries, Runtime Holes, the current snapshot, and pending fills
  ([`battle-tool-output.ts`](../../packages/mcp/src/battle-tool-output.ts)).
- Successful responses are encoded once and exposed as both JSON `content` and
  `structuredContent`
  ([`schema-codec.ts`](../../packages/mcp/src/schema-codec.ts),
  [`tool-content.ts`](../../packages/mcp/src/tool-content.ts)).
- The MCP-level workflow guide tells agents to copy discovered identifiers and
  subjects, use current revisions, and follow the Character-to-Battle-to-
  Character lifecycle
  ([`content-tools.ts`](../../packages/mcp/src/content-tools.ts)). This portable
  guide is valuable for non-Plugin MCP clients, but its exact rules and
  capability claims must be derived from canonical owners or kept narrow enough
  not to drift.

The current implementation does not yet satisfy the accepted v1 guidance
contract:

1. `protocol-server.ts` creates one process-global composition root and
   advertises tools only. It supplies no MCP initialization instructions and no
   Play Session registry or `PlaySessionId`
   ([`protocol-server.ts`](../../packages/mcp/src/protocol-server.ts)).
2. Tool definitions have names, descriptions, and schemas, but no human titles
   or safety annotations. Several descriptions describe implementation rather
   than beginning with a precise user intent, and `read_battle_state` and
   `discover_battle_acts` currently return the same payload
   ([`character-tools.ts`](../../packages/mcp/src/character-tools.ts),
   [`battle-tool-definitions.ts`](../../packages/mcp/src/battle-tool-definitions.ts)).
3. Results contain substantial current state, but there is no consistent
   contextual-report shape for what happened, unresolved choices, next
   operations, and restoration. The existing `session` projection has draft
   ids, character ids, selected Stat Block, active Battle, and sometimes
   pending fills, but no Play Session handle
   ([`session-snapshot-output.ts`](../../packages/mcp/src/session-snapshot-output.ts)).
4. Failure responses set `isError` and return JSON text, but they do not return
   `structuredContent` or conform to a declared structured error/report schema
   ([`tool-content.ts`](../../packages/mcp/src/tool-content.ts)). This is below
   the accepted typed and contextual unknown/expired-session recovery contract.
5. `describe_mcp_workflow` contains copied fill examples and capability claims.
   Its current statement that MCP does not roll dice contradicts the accepted
   v1 generic-roller target and will become stale when that target is
   implemented, demonstrating the drift risk
   ([`content-tools.ts`](../../packages/mcp/src/content-tools.ts)). The Skill
   must not copy this material again; implementation should establish one
   derived MCP source for exact operation guidance.
6. Battle fill inputs require the model to JSON-stringify canonical structured
   `subject` and `fill` values into string fields. The runtime decodes them back
   to typed schemas, but this adds an avoidable serialization protocol for an
   agent to remember
   ([`battle-tool-input.ts`](../../packages/mcp/src/battle-tool-input.ts)). This
   should be assessed during contract implementation, not documented as a
   Plugin Skill ritual.
7. The broader SDK/MCP parity gaps remain exactly those audited in #302. A
   Skill must report a missing capability; it must not approximate it with
   narrative or a private workflow.

## Recommendation for #309

Specify one focused, conversation-first SRD Play Skill with the seven durable
instructions above. Keep exact executable facts in SDK-derived MCP results;
keep concise portable invariants in MCP server instructions; make every tool
self-describing through metadata and a typed contextual result; retain a
portable MCP workflow guide only where it is derived and useful to non-Plugin
clients. Do not put catalog contents, supported-mechanics inventories, fill
schemas, rule prose, or mutable state in the Skill.

Implementation ordering should therefore be:

1. close the accepted SDK/MCP parity and Play Session/reporting contract gaps;
2. make server instructions, tool metadata, structured success, and structured
   failure results sufficient for a headless MCP client;
3. package the focused Skill as ChatGPT orchestration around that complete MCP;
4. evaluate MCP selection and Plugin Skill activation separately, then run the
   complete headless journeys in a new ChatGPT conversation;
5. treat widgets as optional evidence, never as the workflow owner.

No additional product decision is needed for user-authored Stat Blocks,
persistence, dice ownership, MCP-versus-SDK ownership, or widget priority.
Those boundaries are already settled by #304, #305, #306, and #308.
