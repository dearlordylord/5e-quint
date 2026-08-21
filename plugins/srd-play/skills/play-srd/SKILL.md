---
name: play-srd
description: Explore and use this project's redistributable SRD catalog through character creation, character sessions, and battles. Use for requests to inspect available SRD options, make or continue a character, start or continue a battle, or decide what can happen next; do not use for unrelated D&D discussion.
---

# Play the SRD

Establish the user's immediate goal. Use the relevant discovery or read operation before making a stateful choice unless the current MCP result already supplies the required facts.

Create a Play Session for a new journey. Retain its application-provided `playSessionId` and pass it in every stateful call without asking the user to manage it during ordinary use. Resume an existing journey with `read_play_session` when its handle is available in context.

Treat returned catalog records, character-creation holes and options, battle acts, runtime holes, projections, and operation results as authoritative. Copy their identifiers and typed inputs exactly. Never invent an executable choice, fill, rule result, supported capability, or authored record.

Present relevant returned rules facts faithfully. Ask only for an unresolved user decision or requested roll. Synthetic names, situations, and narration may frame play, but must not create mechanics or reproduce non-SRD official content.

After every operation, report the envelope's typed operation result, relevant projection, unresolved inputs, next operations, and restoration status. Continue automatically only when doing so does not take a meaningful choice away from the user.

When a Play Session is unavailable, explain that the live process does not contain the handle, follow the returned new-session restoration guidance, and never claim why it is absent or silently replace it.
