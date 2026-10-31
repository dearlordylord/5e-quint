---
name: dnd-srd-oracle
description: Explore and use this project's redistributable 5.5e SRD catalog through character creation, character sessions, and battles. Use for requests to inspect available SRD options, make or continue a character, start or continue a battle, ask what can happen next in an existing 5.5e SRD Oracle journey, or determine whether this engine can execute user-authored content; do not use for general D&D rules, history, lore, or other unrelated discussion.
---

# Consult 5.5e SRD Oracle

Establish the user's immediate goal. Use the relevant discovery or read operation before making a stateful choice unless the current MCP result already supplies the required facts.

Read `describe_mcp_workflow` for this connection's tool names and argument patterns; reuse a guide already returned by the same connection. Select operations from that guide and the current response's routing information.

Distinguish browsing installed catalog presence from asking which choices are currently legal for a character. Use catalog tools for browsing; create or resume a Play Session and use returned character-creation holes for legal draft choices.

Create a Play Session for a new journey. Retain its application-provided `playSessionId` and pass it in every stateful call without asking the user to manage it during ordinary use. Resume an existing journey with `read_play_session` when its handle is available in context.

Public Play Sessions require standard MCP OAuth and are saved from creation.
Let the tool's OAuth challenge start account linking; never request a password,
API key, token, or unrelated permission in conversation. Local stdio Play
Sessions need no sign-in and last only for that server process. Use
`list_saved_play_sessions` for explicit public recovery and never silently
select a saved session. Treat `delete_saved_play_session` as immediate and
permanent.

For a character-creation continuation, use `read_play_session` first. If its summary does not contain the detailed remaining choices, call `get_character_creation_choices` with the retained draft identity before asking the user to choose.

Treat returned catalog records, character-creation holes and options, battle acts, runtime holes, projections, and operation results as authoritative. Copy their identifiers and typed inputs exactly. Never invent an executable choice, fill, rule result, supported capability, or authored record.

For Battle setup, follow the returned `battleState` variant. If the result is
`initialInitiativeSetup`, use the exposed Initiative-swap and setup-finalization
operations before asking for or presenting active Battle Acts. For an active
Battle, use the exposed add/remove-combatant operations for supported roster
changes and keep the returned occupancy and settlement projections authoritative.

For Battle Acts, use `chatGptBattleOperations` when the response supplies it to
select the named operation for the current subject or Reaction. Copy the current
subject into its named Act tool, without a fill, to select it and open any holes.
When `presentation.kind` is `attack`, show `presentation.name` and distinguish
the returned damage selections. Copy the complete subject, including
`statBlockDamageSelection` when present. An attack name alone does not identify
an executable option.
Answer ordinary holes through `provide_battle_input` with a fill and no subject.
Select a Reaction through its named operation with an `interruptDecision` fill
and no subject. For a `reactionRollOrDamageReduction` choice, include the
`rolledDice` fill requested by that choice's `initialHoles` in `choice.fills`;
use `[]` when it requests no roll. Other Reaction choices use `choice.fills: []`
and request any later ordinary inputs through `provide_battle_input`.
The pending transaction owns the parent.

Use the current hole's fact request to construct its answer. For an area request,
follow its `areaInput` kind and the returned `areaInputs` schema for `fill.value.area`.
Supply an explicit
empty collection only when the table confirms there are no requested facts to
report. After a rejected fill, correct the input and retry the returned hole.
If the response lacks an actionable request, read the Battle state again. Use
`cancel_battle_action` only when the returned availability permits it, copying its
`arguments` with `expectedSelectionId`. Cancellation
is limited to an unanswered player Act before accepted input or committed effects.
Respect a cancellation refusal and continue from the returned request. If recovery
remains blocked, explain the missing input and preserve the saved checkpoint.

`roll_dice` is an optional independent raw-face request. It has no Battle Hole
or modifier context and never updates Battle state by itself. Copy its ordered
faces into an ordinary typed fill only when the current Runtime Hole requests
that shape; otherwise ask for the missing user/table fact.

Use the returned Battle checkpoint for HP, resources, and applied effects. A
`needsHoles` result leaves a procedure unfinished. Report changes already in its
checkpoint, including committed Reactions, and describe the requested outcome
as pending until the engine applies it. Keep any external simulation separate
from saved Battle progress. A narrated victory is not a stored result.

Build map HP and event displays from returned checkpoints and applied outcomes.
Label table-supplied positions as table facts, and distinguish proposed movement
or spell areas from engine-confirmed changes. Preserve that distinction when the
engine does not store coordinates.

Present relevant returned rules facts faithfully. Ask only for unresolved user decisions or requested rolls. When the current result contains multiple independent meaningful choices, present them together and let the user answer them in one reply; do not serialize independent current holes into one question per turn. Keep dependent choices for a later batch when their options have actually been returned. Apply forced single-option choices automatically and report them. Synthetic names, situations, and narration may frame play, but must not create mechanics or reproduce non-SRD official content.

After every operation, report the returned result and relevant state. For Play Session operations, also report the projection, unresolved inputs, next operations, and restoration status from the envelope. Continue automatically only when doing so does not take a meaningful choice away from the user. A pause should collect the largest currently valid batch of independent user decisions, not merely the first unresolved hole.

When a Play Session is unavailable, explain that the service cannot access the handle, follow the returned new-session restoration guidance, and never claim why it is absent or silently replace it.

If asked to import or execute user-authored records, state that this MCP uses only its installed redistributable SRD catalogs. Do not invent an admission path or pass invented record data to a stateful tool.
