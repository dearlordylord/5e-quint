# Available Actions Design Reference

This is the compact durable reference for the available-actions/MCP action
surface. The full historical PRD was removed from the active tree and remains
available in git history.

## Current Status

The mechanical/rulewise available-actions work is complete. The current MCP
surface exposes six tools:

- `get_state`
- `get_available_actions`
- `execute_action`
- `preview_action`
- `execute_control_command`
- `record_table_event`

Active follow-up planning now lives in [ACTIVE_PLAN.md](./ACTIVE_PLAN.md).

## Durable Decisions

- `get_available_actions` returns query-time `ActionToken` values.
- `execute_action` accepts `ResolvedActionToken` values with user-facing holes
  filled.
- Some lifecycle/control events intentionally stay on the action-token lane when
  they include user choice or runtime resolution. `SHORT_REST` remains a
  `get_available_actions` / `execute_action` token because hit-die order is a
  player choice and healing rolls are runtime-owned; do not mirror it on
  `execute_control_command`.
- Core resolves tokens into domain events; runtime-owned inputs such as dice or
  explicit table/session facts are supplied at execution time.
- MCP must not remember, fabricate, or re-derive combat facts. If an action needs
  a combat fact, battle/spec/machine state should own it or the action should
  accept an explicit runtime/session input.
- Action grouping is by resource cost, not tactical ranking.
- No confidence scoring. The system presents legal options and does not rank
  player intent.
- `packages/core/src/available-actions.ts` is the source of truth for supported
  action tokens and resolved-token schemas.
- `packages/mcp/` and `packages/app/` consume core projection logic; neither
  should duplicate legality logic.

## Current Blockers

See [MCP_EVENT_SURFACE_AUDIT.md](./MCP_EVENT_SURFACE_AUDIT.md) and
[ACTIVE_PLAN.md](./ACTIVE_PLAN.md) for the active blocker list. The main
remaining boundaries are:

- battle attack runtime/session facts;
- battle-owned Size for public grapple;
- public movement/help token contract over caller-owned spatial facts;
- monster stat-block payload ownership for legendary attacks;
- raw effect/max-HP/environmental provenance;
- later product work for `dm-override` and `transcript-port-to-dnd`.

## Historical Note

This file used to contain the full phase-by-phase rollout history. That history
is now in git. Keep this file as a compact design reference only.
