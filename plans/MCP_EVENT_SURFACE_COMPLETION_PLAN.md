# MCP Event Surface Completion Plan

## Status

Prepared for tonight's MCP event-surface completion push.

This plan is intended for an implementation agent to execute task by task. The agent must mark tasks done in this file one by one and commit after each completed task. Do not batch multiple completed tasks into one commit unless a task explicitly says it is an indivisible multi-file integration task.

## Goal

Complete the MCP API event surface deliberately, using an API-surface taxonomy that is clear in docs and code.

"Add everything missing to MCP" means:

- every public-worthy core event has an MCP path
- every non-public event is explicitly covered by a parent MCP path or marked as intentionally non-public
- `get_available_actions` contains suggested player/creature options only
- setup, turn, monster, and table-fact changes use separate MCP surfaces
- runtime resolution and bookkeeping events do not become public raw commands just to improve raw event-count coverage

Out of scope:

- transcript-port-to-dnd
- MCP-only state or MCP-only booleans that paper over missing domain ownership
- raw exposure of internal bookkeeping events
- broad speculative modeling beyond SRD 5.2.1

## Operating Rules

- Use `pnpm`, never `npm`.
- Before implementing any modeled rule behavior, read the relevant SRD 5.2.1 passage in `.references/srd-5.2.1/` and check [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).
- Update this plan after each task by changing exactly that task's checkbox and adding notes if scope changes.
- Commit after each task with only that task's files staged.
- Preserve unrelated worktree changes; do not revert files you did not change.
- If an MBT failure occurs, reproduce with the seed before fixing.
- Run at most one battle MBT command at a time and follow the MBT run protocol from `AGENTS.md`.

## API Surface Taxonomy

Use these names in docs and code comments. This is an MCP/API-adapter taxonomy, not a Quint or XState domain taxonomy.

| Category | Meaning | MCP surface |
| --- | --- | --- |
| `suggested_action` | A legal option that should be returned by `get_available_actions` and executable by `execute_action`. | Existing `ActionToken` / `ResolvedActionToken` path. |
| `control_command` | A deliberate session/turn/rest/monster-control command that should be callable but not mixed into ordinary player suggestions. | New explicit MCP command surface. Candidate name: `execute_control_command`. |
| `table_event` | A DM/table/world fact such as damage, healing, condition/effect application, environmental harm, or generic spell outcome. | New warning-aware MCP command surface. Candidate name: `record_table_event`. |
| `action_resolution` | A low-level event produced after a suggested action or table event needs runtime facts, dice, or branch choices. | Hidden behind `execute_action` or `record_table_event`; not directly advertised. |
| `domain_trigger` | A semantic trigger that opens an owned pending window for a later suggested action. | Usually internal; if public, expose a semantic command rather than the raw `TRIGGER_*` event. |
| `bookkeeping` | Internal state accounting behind higher-level semantics. | No public MCP surface. |

Rationale for replacing the audit taxonomy:

- `suggested_action` is clearer than `available_action` because it names the MCP behavior, not the domain event.
- `control_command` folds the old `direct_command` and `setup_or_turn_control` buckets into one API shape.
- `table_event` is shorter and clearer than `dm_or_descriptive_event`.
- `action_resolution`, `domain_trigger`, and `bookkeeping` keep the old separation that prevents leaking internals into `get_available_actions`.

## Dependency Graph

1. Task 1 must happen first because it renames the taxonomy and updates the audit baseline.
2. Task 2 must happen before new control/table surfaces so code and docs share the new API names.
3. Task 3 is the first implementation batch because it is high-confidence and does not require missing target/geometry/roll ownership.
4. Tasks 4 and 5 can happen after Task 2, but Task 5 benefits from Task 4's control-command schema pattern.
5. Tasks 6 and 7 depend on either Task 4 or Task 5 if they reuse the new command plumbing; otherwise they can only add `get_available_actions` tokens.
6. Task 8 should wait until target/roll/spatial ownership facts are in place or explicitly modeled as user/runtime holes.
7. Task 9 is a final sweep and should be last.

## Task List

### Task 1 - Rename And Lock The Taxonomy

- [ ] Update [MCP_EVENT_SURFACE_AUDIT.md](./MCP_EVENT_SURFACE_AUDIT.md) from the old category names to the API-surface taxonomy in this plan.
- [ ] Update [ARCHITECTURE.md](../ARCHITECTURE.md) section 5 to state that this taxonomy is MCP/API-adapter-only.
- [ ] Update [available-actions.md](./available-actions.md) if it still says the MCP surface is only three tools; it now has four existing tools and planned separate control/table surfaces.
- [ ] Add a short note in or near `packages/core/src/available-actions.ts` only if code comments currently use the old taxonomy; otherwise keep this docs-only.

Dependencies: none.

Verification:

- `rg "available_action|direct_command|dm_or_descriptive_event|runtime_resolution|internal_trigger|setup_or_turn_control|internal_only" plans ARCHITECTURE.md packages/core/src/available-actions.ts packages/mcp/src/server.ts`
- Confirm remaining hits, if any, are historical notes or deliberately mapped old names.

Commit after this task:

- `docs: clarify MCP API taxonomy`

### Task 2 - Add MCP Surface Skeletons

- [ ] Add typed command schemas for `execute_control_command` and `record_table_event` in MCP/core-owned schema code.
- [ ] Keep the initial schemas narrow; do not accept arbitrary raw `DndEvent` or `BattleEvent`.
- [ ] Add MCP tool definitions and handlers that validate inputs and return structured unsupported/not-yet-implemented errors for commands that are not wired yet.
- [ ] Preserve existing `get_state`, `get_available_actions`, `execute_action`, and `preview_action` behavior.
- [ ] Add focused MCP tests proving the new tools exist, validate shape, and do not mutate state for unsupported commands.

Dependencies: Task 1.

Verification:

- `pnpm --filter @dnd/mcp test -- src/server.test.ts`
- `pnpm --filter @dnd/mcp typecheck`

Commit after this task:

- `feat(mcp): add control and table event command skeletons`

### Task 3 - Battle Feature Suggested Actions

- [ ] Add battle `suggested_action` support for `BATTLE_ACTION_SURGE`.
- [ ] Add battle `suggested_action` support for `BATTLE_ENTER_RAGE`.
- [ ] Add battle `suggested_action` support for `BATTLE_DECLARE_RECKLESS`.
- [ ] Use battle-owned state only: active creature, turn-started flag, action/bonus-action economy, class levels, feature charges, Rage state, and Reckless state.
- [ ] Do not add target, roll, geometry, or reaction-candidate facts in this task.
- [ ] Add focused core available-actions tests and MCP execute/preview tests.

Dependencies: Task 1. Task 2 is not required because this task uses the existing `get_available_actions` / `execute_action` path.

RAW check:

- Read Barbarian Rage and Reckless Attack in `.references/srd-5.2.1/Classes/`.
- Read Fighter Action Surge in `.references/srd-5.2.1/Classes/`.
- Check [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md) for action economy and battle terminology.

Verification:

- `pnpm --filter @dnd/core test -- src/available-actions.test.ts`
- `pnpm --filter @dnd/mcp test -- src/server.test.ts`
- If behavior changes beyond projection/exposure, run Tier 1 battle MBT after confirming no existing evaluator is running.

Commit after this task:

- `feat(core): expose battle feature actions to MCP`

### Task 4 - Control Commands

- [ ] Implement `control_command` support for battle/session lifecycle events that are not ordinary suggestions:
  - `BATTLE_INIT`
  - `BATTLE_START_TURN`
  - `BATTLE_END_TURN`
  - `BATTLE_LEGENDARY_PASS`
  - creature `END_TURN`
  - creature `LONG_REST`
- [ ] Decide whether creature `ENTER_COMBAT`, creature `START_TURN`, creature `SHORT_REST`, and creature `EXIT_COMBAT` remain in `get_available_actions`, become mirrored control commands, or move entirely to control commands; document the decision before code changes.
- [ ] Keep turn-start/end runtime facts runtime-owned; do not make MCP invent hidden state.
- [ ] Add preview or dry-run behavior only if the existing pattern makes it cheap; otherwise keep control commands execute-only.
- [ ] Add focused core/MCP tests.

Dependencies: Task 2.

RAW check:

- Read combat turn and rest rules in `.references/srd-5.2.1/Playing-the-Game.md` and `.references/srd-5.2.1/Rules-Glossary.md`.
- Check [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md) for turn, rest, and combat terms.

Verification:

- `pnpm --filter @dnd/core test -- src/available-actions.test.ts`
- `pnpm --filter @dnd/mcp test -- src/server.test.ts`
- Tier 1 battle MBT only if lifecycle behavior changed, not for handler plumbing alone.

Commit after this task:

- `feat(mcp): add session control commands`

### Task 5 - Table Event Commands

- [ ] Implement warning-aware `table_event` support for high-value creature events:
  - `TAKE_DAMAGE`
  - `HEAL`
  - `GRANT_TEMP_HP`
  - `APPLY_CONDITION`
  - `REMOVE_CONDITION`
  - `ADD_EXHAUSTION`
  - `REDUCE_EXHAUSTION`
  - `STABILIZE`
  - `KNOCK_OUT`
  - `APPLY_FALL`
- [ ] Implement warning-aware `table_event` support for high-value battle events:
  - `BATTLE_HEAL`
  - generic damage/condition/effect application only if the battle machine already has a direct event for it; otherwise document the domain gap.
- [ ] Keep `REDUCE_MAX_HP`, `RESTORE_MAX_HP`, `ADD_EFFECT`, `REMOVE_EFFECT`, `BREAK_CONCENTRATION`, `SUFFOCATE`, `APPLY_STARVATION`, and `APPLY_DEHYDRATION` either implemented or explicitly deferred in the audit with a named reason.
- [ ] Return warnings when the command bypasses a stricter semantic action path.
- [ ] Do not expose raw `ADD_EFFECT` as an arbitrary payload dump unless provenance and warning semantics are explicit.

Dependencies: Task 2.

RAW check:

- Read damage, healing, conditions, exhaustion, falling, suffocation, food/water, and concentration passages in `.references/srd-5.2.1/Playing-the-Game.md` and `.references/srd-5.2.1/Rules-Glossary.md`.
- Check [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md) for condition/effect terminology.

Verification:

- `pnpm --filter @dnd/core test -- src/available-actions.test.ts`
- `pnpm --filter @dnd/mcp test -- src/server.test.ts`
- `npx quint test --match "inv_" dndTest.qnt` if creature invariant edge cases are affected.

Commit after this task:

- `feat(mcp): add table event commands`

### Task 6 - Remaining High-Confidence Creature Suggested Actions

- [ ] Add creature `suggested_action` support for zero- or simple-payload feature events that do not need missing target/geometry/attack ownership:
  - `USE_MAGICAL_CUNNING`
  - `USE_INNATE_SORCERY`
  - `ENTER_WILD_SHAPE`
  - `EXIT_WILD_SHAPE`
  - `USE_WILD_RESURGENCE_SLOT`
  - `USE_DIVINE_SMITE_FREE`, only if RAW/guard review confirms the existing event is enough without attack-hit ownership leakage
- [ ] For each token, verify that an existing guard/update path already owns legality.
- [ ] Do not add MCP-only booleans or duplicate state fields.
- [ ] Add focused available-actions and MCP tests.

Dependencies: Task 1. Task 2 only if any item is reclassified as `control_command`.

RAW check:

- Read relevant Warlock, Sorcerer, Druid, and Paladin SRD 5.2.1 class passages.
- Check [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

Verification:

- `pnpm --filter @dnd/core test -- src/available-actions.test.ts`
- `pnpm --filter @dnd/mcp test -- src/server.test.ts`
- Tier 1b creature MBT if Quint-visible semantics or bridge fields change.

Commit after this task:

- `feat(core): expose remaining creature feature actions`

### Task 7 - Semantic Domain Triggers

- [ ] Do not expose raw `TRIGGER_*` events.
- [ ] Add semantic command shapes only where MCP/session users need to record a triggering failure or hit:
  - failed save for `TRIGGER_INDOMITABLE`
  - failed ability check for `TRIGGER_TACTICAL_MIND`
  - spell damage context for `TRIGGER_OVERCHANNEL`
  - attack hit context for `TRIGGER_SNEAK_ATTACK`
  - failed ability check or attack roll for `TRIGGER_PEERLESS_SKILL_*`
- [ ] If the semantic trigger needs facts the domain does not own, stop and add a blocker to the audit instead of inventing MCP-only state.
- [ ] Add tests proving the semantic command opens the expected suggested action and that resolution clears the pending state.

Dependencies: Task 2.

RAW check:

- Read the SRD passages for the corresponding class features.
- Check [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

Verification:

- `pnpm --filter @dnd/core test -- src/available-actions.test.ts`
- `pnpm --filter @dnd/mcp test -- src/server.test.ts`
- Tier 1b creature MBT if pending-resolution state or MBT bridge semantics change.

Commit after this task:

- `feat(mcp): add semantic trigger commands`

### Task 8 - Blocked Battle Suggested Actions Research And First Slice

- [ ] For each currently blocked battle `suggested_action`, decide whether the missing facts are already in battle state, should be a user choice hole, should be runtime-owned, or require a domain/spec change:
  - `BATTLE_ATTACK`
  - `BATTLE_HELP_ATTACK`
  - `BATTLE_MOVE`
  - `BATTLE_HIDE`
  - `BATTLE_SEARCH`
  - `BATTLE_OFF_HAND_ATTACK`
  - `BATTLE_GRAPPLE`
  - `BATTLE_RELEASE_GRAPPLE`
  - `BATTLE_ESCAPE_GRAPPLE`
  - `BATTLE_LEGENDARY_ATTACK`
- [ ] Choose the smallest implementable first slice from that research.
- [ ] Implement only that first slice if it does not require speculative geometry or MCP-only state.
- [ ] Update [MCP_EVENT_SURFACE_AUDIT.md](./MCP_EVENT_SURFACE_AUDIT.md) with precise blockers for the remaining blocked items.

Dependencies: Task 1. Task 2 if the first slice uses control/table command plumbing.

RAW check:

- Read attack, movement, opportunity attack, Help, Hide, Search, Grapple, and legendary-action passages in `.references/srd-5.2.1/Playing-the-Game.md` and `.references/srd-5.2.1/Rules-Glossary.md`.
- Check [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

Verification:

- `pnpm --filter @dnd/core test -- src/available-actions.test.ts`
- `pnpm --filter @dnd/mcp test -- src/server.test.ts`
- Tier 1 battle MBT after any battle behavior/spec/bridge change.

Commit after this task:

- `feat(core): add first blocked battle action slice`

### Task 9 - Final Surface Audit And Docs Wrap

- [ ] Regenerate/check the inventory: all 112 `DndEvent` and 42 `BattleEvent` variants must appear exactly once in [MCP_EVENT_SURFACE_AUDIT.md](./MCP_EVENT_SURFACE_AUDIT.md).
- [ ] Confirm every event is classified with the new API-surface taxonomy.
- [ ] Confirm every `suggested_action` is either implemented in `get_available_actions` or has a named blocker.
- [ ] Confirm every `control_command` has a command path or a named blocker.
- [ ] Confirm every `table_event` has a command path or a named blocker.
- [ ] Confirm every `action_resolution`, `domain_trigger`, and `bookkeeping` item is intentionally hidden or covered by a parent semantic surface.
- [ ] Update [ARCHITECTURE.md](../ARCHITECTURE.md) section 5 if the final MCP tool list changed.
- [ ] Update [available-actions.md](./available-actions.md) if implementation history or durable decisions changed.

Dependencies: all implemented tasks.

Verification:

- Inventory script:
  ```bash
  node - <<'NODE'
  const fs = require("fs");
  const doc = fs.readFileSync("plans/MCP_EVENT_SURFACE_AUDIT.md", "utf8");
  function srcTypes(file) {
    const s = fs.readFileSync(file, "utf8");
    return [...new Set([...s.matchAll(/readonly type: "([A-Z0-9_]+)"/g)].map((m) => m[1]))];
  }
  const rows = [...doc.matchAll(/^\| `([A-Z0-9_]+)` \| (creature|battle) \|/gm)].map((m) => ({ event: m[1], scope: m[2] }));
  for (const [scope, file] of [["creature", "packages/core/src/machine-types.ts"], ["battle", "packages/core/src/battle-machine-events.ts"]]) {
    const types = srcTypes(file);
    const scopedRows = rows.filter((r) => r.scope === scope).map((r) => r.event);
    const missing = types.filter((t) => !scopedRows.includes(t));
    const extra = scopedRows.filter((t) => !types.includes(t));
    const dup = scopedRows.filter((t, i) => scopedRows.indexOf(t) !== i);
    console.log(scope, { source: types.length, rows: scopedRows.length, missing, extra, dup });
  }
  NODE
  ```
- `pnpm --filter @dnd/core typecheck`
- `pnpm --filter @dnd/mcp typecheck`
- `pnpm --filter @dnd/core test -- src/available-actions.test.ts`
- `pnpm --filter @dnd/mcp test -- src/server.test.ts`

Commit after this task:

- `docs: finalize MCP event surface plan`

## Final Verification

Before marking this plan complete:

- Run two `/simplify` rounds minimum and continue until convergence. Start `/simplify` immediately after implementation; do not wait for user confirmation.
- Run the RAW check for every implemented rule-facing action or command: cite the exact local SRD 5.2.1 files consulted and confirm terminology against [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).
- Run focused core and MCP tests named in each completed task.
- Run MBT only for tasks that change Quint-visible behavior or bridge mappings, using the lowest sufficient tier.
- Run `pnpm --filter @dnd/core typecheck` and `pnpm --filter @dnd/mcp typecheck`.
- Confirm no unrelated files are staged before the final commit.

## Completion Definition

This plan is complete when:

- the taxonomy is clear in docs and code comments as MCP/API-surface-only
- all public-worthy events have either `get_available_actions`, `execute_control_command`, or `record_table_event` coverage
- every intentionally hidden event is documented as `action_resolution`, `domain_trigger`, or `bookkeeping`
- every remaining unimplemented public-worthy event has a named domain ownership blocker
- the plan checkboxes are updated
- each task has its own commit
