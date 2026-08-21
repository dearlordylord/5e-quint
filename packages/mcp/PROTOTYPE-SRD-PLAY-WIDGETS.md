# Throwaway prototype: SRD Play read-only widgets

This branch-only prototype answers [issue #307](https://github.com/dearlordylord/5e-quint/issues/307): do two read-only MCP Apps cards make the canonical Character-list and Battle-state results easier to inspect in ChatGPT?

It adds one plain presentation for each existing read tool:

- `list_characters` → `ui://srd-play/character-list/v1.html`
- `read_battle_state` → `ui://srd-play/battle-state/v1.html`

The cards render only each tool call's `structuredContent`. They do not call tools, send messages, store domain state, calculate rules, or replace the ordinary JSON/text result. Expand/collapse controls affect only the current iframe.

Run the existing stdio server with `pnpm --filter @dnd/mcp dev`, then connect MCP Inspector to that command. Confirm that both resources are listed, both read tools advertise `_meta.ui.resourceUri`, and normal/empty tool results render without component errors.

ChatGPT Developer mode still needs a reachable Streamable HTTP endpoint or Secure MCP Tunnel. That transport is outside this low-effort widget experiment. Do not promote this code to production; preserve the prototype branch as evidence and make the v1 widget decision in issue #310.
