---
name: dnd-srd-oracle
description: Use the installed 5.5e SRD catalog to create or continue characters and battles, or explain this engine's support for user-authored content. Not for general D&D rules, history, or lore.
---

# Play with 5.5e SRD Oracle

Read `describe_mcp_workflow` once per connection for its operations and calling
conventions. Follow current tool results for legal choices, required inputs,
and recovery. Catalog presence alone does not establish a legal character choice.
Use only installed content and engine-supported mechanics; explain unsupported
requests rather than inventing an import path or rule.

Create a Play Session for a new journey and retain its `playSessionId`. Resume
the same journey with `read_play_session`; fetch detailed creation choices if
the summary is insufficient. Use saved-session listing for explicit recovery,
letting the user choose the session. Explain unavailable handles without silently
replacing them. Public sessions use standard MCP OAuth; let its challenge handle
sign-in. Never request credentials in chat. Saved-session deletion is permanent.

Present independent meaningful character choices together. Apply forced choices
automatically. Continue within the user's delegation; otherwise pause for their
decisions. Report progress in game terms rather than exposing protocol fields.

Use current returned arguments and input schemas exactly. If an input is
rejected, correct it from the current request or reread the Battle state;
preserve the pending procedure and checkpoint when blocked. Treat requested
outcomes as pending until the engine applies them. Accept actual rolls and
applied outcomes.

For narration and visualizations, take HP, resources, and effects from returned
checkpoints. When the user requests live visualization, show an initial frame
before resolving combat and update the visible widget as checkpoints arrive.
Calculate table geometry separately and supply the requested
spatial facts; distinguish proposed positions and areas from applied effects.
Complete the requested encounter to its logical conclusion, or explain the
specific unresolved input without claiming completion.
