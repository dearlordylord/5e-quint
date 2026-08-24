---
name: play-srd
description: Explore and use this project's redistributable SRD catalog through character creation, character sessions, and battles. Use for requests to inspect available SRD options, make or continue a character, start or continue a battle, ask what can happen next in an existing SRD Play journey, or determine whether this engine can execute user-authored content; do not use for general D&D rules, history, lore, or other unrelated discussion.
---

# Play the SRD

Establish the user's immediate goal. Use the relevant discovery or read operation before making a stateful choice unless the current MCP result already supplies the required facts.

Distinguish browsing installed catalog presence from asking which choices are currently legal for a character. Use catalog tools for browsing; create or resume a Play Session and use returned character-creation holes for legal draft choices.

Create a Play Session for a new journey. Retain its application-provided `playSessionId` and pass it in every stateful call without asking the user to manage it during ordinary use. Resume an existing journey with `read_play_session` when its handle is available in context.

For a character-creation continuation, use `read_play_session` first. If its summary does not contain the detailed remaining choices, call `discover_creation_holes` with the retained draft identity before asking the user to choose.

Treat returned catalog records, character-creation holes and options, battle acts, runtime holes, projections, and operation results as authoritative. Copy their identifiers and typed inputs exactly. Never invent an executable choice, fill, rule result, supported capability, or authored record.

For Battle setup, follow the returned `battleState` variant. If the result is
`initialInitiativeSetup`, use `battle_lifecycle` for the returned setup
operations before asking for or presenting active Battle Acts. For an active
Battle, use `battle_lifecycle` for supported roster changes and keep the
returned occupancy and settlement projections authoritative.

`roll_dice` is an optional independent raw-face request. It has no Battle Hole
or modifier context and does not fill anything automatically. Copy its ordered
faces into an ordinary typed fill only when the current Runtime Hole requests
that shape; otherwise ask for the missing user/table fact.

Present relevant returned rules facts faithfully. Ask only for unresolved user decisions or requested rolls. When the current result contains multiple independent meaningful choices, present them together and let the user answer them in one reply; do not serialize independent current holes into one question per turn. Keep dependent choices for a later batch when their options have actually been returned. Apply forced single-option choices automatically and report them. Synthetic names, situations, and narration may frame play, but must not create mechanics or reproduce non-SRD official content.

After every operation, report the envelope's typed operation result, relevant projection, unresolved inputs, next operations, and restoration status. Continue automatically only when doing so does not take a meaningful choice away from the user. A pause should collect the largest currently valid batch of independent user decisions, not merely the first unresolved hole.

When a Play Session is unavailable, explain that the live process does not contain the handle, follow the returned new-session restoration guidance, and never claim why it is absent or silently replace it.

If asked to import or execute user-authored records, state that this MCP uses only its installed redistributable SRD catalogs. Do not invent an admission path or pass invented record data to a stateful tool.
