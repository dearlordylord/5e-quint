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
4. Task 4 can happen after Task 2 and establishes the control-command implementation pattern.
5. Task 5 defines the shared `record_table_event` contract and must happen before table-event implementation slices.
6. Tasks 6-11 all depend on Task 5 because they use the warning-aware table-event contract.
7. Tasks 6-11 are ordered from least domain-specific to most domain-specific; keep that order unless a blocker makes a later table-event slice safer to do first.
8. Tasks 12-14 can happen after Task 1; they use `get_available_actions` and should stay independent of table-event work unless a feature is reclassified.
9. Tasks 15-17 depend on Task 2 because they use semantic commands rather than raw `TRIGGER_*` events.
10. Task 18 is the battle suggested-action ownership audit and must happen before Tasks 19-23.
11. Task 20 should happen after Task 3 because `BATTLE_DECLARE_RECKLESS` changes attack-context meaning.
12. Task 21 depends on Task 20 and cross-references Task 14 for `USE_DIVINE_SMITE_FREE` so it is not implemented twice at creature and battle scope.
13. Task 23 depends on Task 4 because legendary attack UX depends on monster/session-control decisions.
14. Task 24 is a final sweep and should be last.

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

### Task 5 - Table Event Shared Contract

- [ ] Define the shared `record_table_event` result shape: applied event, warnings, resulting state, and unsupported/error cases.
- [ ] Add the minimum warning vocabulary: bypasses semantic action, external table fact, unsupported domain gap.
- [ ] Keep the schema narrow and avoid arbitrary raw `DndEvent` / `BattleEvent` passthrough.
- [ ] Add tests for validation, warnings, unsupported events, and no mutation on invalid input.

Dependencies: Task 2.

Verification:

- `pnpm --filter @dnd/mcp test -- src/server.test.ts`
- `pnpm --filter @dnd/mcp typecheck`

Commit after this task:

- `feat(mcp): add table event contract`

### Task 6 - Creature Damage And Recovery Table Events

- [ ] Implement warning-aware `record_table_event` support for creature `TAKE_DAMAGE`.
- [ ] Implement warning-aware `record_table_event` support for creature `HEAL`.
- [ ] Implement warning-aware `record_table_event` support for creature `GRANT_TEMP_HP`.
- [ ] Implement warning-aware `record_table_event` support for creature `STABILIZE`.
- [ ] Implement warning-aware `record_table_event` support for creature `KNOCK_OUT`.
- [ ] Return warnings when the table event bypasses a stricter semantic action path such as a spell/feature token.
- [ ] Do not include conditions, exhaustion, max-HP changes, or environmental events in this task.

Dependencies: Task 5.

RAW check:

- Read damage, healing, temporary HP, dying, stabilization, and knocking a creature out in `.references/srd-5.2.1/Playing-the-Game.md` and `.references/srd-5.2.1/Rules-Glossary.md`.
- Check [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md) for HP, death save, and damage terminology.

Verification:

- `pnpm --filter @dnd/core test -- src/available-actions.test.ts`
- `pnpm --filter @dnd/mcp test -- src/server.test.ts`
- `npx quint test --match "inv_" dndTest.qnt` if damage/death-state invariant behavior is affected.

Commit after this task:

- `feat(mcp): add creature damage table events`

### Task 7 - Creature Condition And Exhaustion Table Events

- [ ] Implement warning-aware `record_table_event` support for creature `APPLY_CONDITION`.
- [ ] Implement warning-aware `record_table_event` support for creature `REMOVE_CONDITION`.
- [ ] Implement warning-aware `record_table_event` support for creature `ADD_EXHAUSTION`.
- [ ] Implement warning-aware `record_table_event` support for creature `REDUCE_EXHAUSTION`.
- [ ] Keep condition immunity and exhaustion immunity facts domain-owned or explicit table-event inputs; do not invent adapter state.
- [ ] Do not include effect payload insertion/removal in this task.

Dependencies: Task 5.

RAW check:

- Read conditions and exhaustion in `.references/srd-5.2.1/Rules-Glossary.md` and any relevant condition passages in `.references/srd-5.2.1/Playing-the-Game.md`.
- Check [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md) for condition/effect terminology.

Verification:

- `pnpm --filter @dnd/core test -- src/available-actions.test.ts`
- `pnpm --filter @dnd/mcp test -- src/server.test.ts`
- `npx quint test --match "inv_" dndTest.qnt` if condition or exhaustion invariants are affected.

Commit after this task:

- `feat(mcp): add condition table events`

### Task 8 - Creature Environmental Table Events

- [ ] Implement warning-aware `record_table_event` support for creature `APPLY_FALL`.
- [ ] Decide whether `SUFFOCATE`, `APPLY_STARVATION`, and `APPLY_DEHYDRATION` are ready for public table-event commands or should remain named blockers.
- [ ] If implemented, keep environmental runtime facts explicit in the table-event input and avoid hidden MCP state.
- [ ] If deferred, update [MCP_EVENT_SURFACE_AUDIT.md](./MCP_EVENT_SURFACE_AUDIT.md) with the exact ownership blocker.
- [ ] Do not include generic damage or condition events already handled by Tasks 6-7.

Dependencies: Task 5.

RAW check:

- Read falling, suffocation, food, and water rules in `.references/srd-5.2.1/Playing-the-Game.md` and `.references/srd-5.2.1/Rules-Glossary.md`.
- Check [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

Verification:

- `pnpm --filter @dnd/core test -- src/available-actions.test.ts`
- `pnpm --filter @dnd/mcp test -- src/server.test.ts`
- `npx quint test --match "inv_" dndTest.qnt` if environmental edge-case invariants are affected.

Commit after this task:

- `feat(mcp): add environmental table events`

### Task 9 - Creature Max-HP Effect And Concentration Table Events

- [ ] Decide whether `REDUCE_MAX_HP` and `RESTORE_MAX_HP` are ready for public `table_event` commands or should remain named blockers.
- [ ] Decide whether `ADD_EFFECT` and `REMOVE_EFFECT` can be exposed without becoming arbitrary payload dumps.
- [ ] Decide whether `BREAK_CONCENTRATION` needs a public table-event command or should stay generated by owned damage/condition semantics.
- [ ] Keep `CONCENTRATION_CHECK` classified as `action_resolution` unless a parent table event needs to supply a runtime save result.
- [ ] Implement only the items whose provenance, warning semantics, and owned facts are clear; update the audit with named blockers for the rest.

Dependencies: Task 5. Best after Tasks 6 and 7 because damage, condition, and exhaustion semantics inform concentration/effect handling.

RAW check:

- Read concentration and max-HP/effect-relevant passages in `.references/srd-5.2.1/Playing-the-Game.md`, `.references/srd-5.2.1/Rules-Glossary.md`, and relevant local spell/class files when applicable.
- Check [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md) for effect and concentration terminology.

Verification:

- `pnpm --filter @dnd/core test -- src/available-actions.test.ts`
- `pnpm --filter @dnd/mcp test -- src/server.test.ts`
- `npx quint test --match "inv_" dndTest.qnt` if concentration or effect invariants are affected.

Commit after this task:

- `feat(mcp): handle effect table event blockers`

### Task 10 - Battle Table Events And Generic Spell Blockers

- [ ] Implement warning-aware `record_table_event` support for battle `BATTLE_HEAL`.
- [ ] Re-check `BATTLE_CAST_SAVE_SPELL`, `BATTLE_CAST_CONCENTRATION_SPELL`, `BATTLE_CAST_AOE`, and `BATTLE_CONCENTRATION_CHECK`.
- [ ] Implement only the battle table/spell items whose payload, target, save, and runtime facts are already owned by the domain or explicit table-event input.
- [ ] Prefer modeled spell `suggested_action` tokens over generic raw spell events whenever the spell can be modeled semantically.
- [ ] Update [MCP_EVENT_SURFACE_AUDIT.md](./MCP_EVENT_SURFACE_AUDIT.md) with named blockers for generic spell events that are still unsafe to expose.

Dependencies: Task 5.

RAW check:

- Read healing, spellcasting, saving throw, concentration, and AoE-related passages in `.references/srd-5.2.1/Playing-the-Game.md` and `.references/srd-5.2.1/Rules-Glossary.md`.
- Check [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

Verification:

- `pnpm --filter @dnd/core test -- src/available-actions.test.ts`
- `pnpm --filter @dnd/mcp test -- src/server.test.ts`
- Tier 1 battle MBT only if battle behavior/spec/bridge semantics change.

Commit after this task:

- `feat(mcp): add battle table event coverage`

### Task 11 - Table Event Audit Wrap

- [ ] Update [MCP_EVENT_SURFACE_AUDIT.md](./MCP_EVENT_SURFACE_AUDIT.md) to reflect implemented vs blocked `table_event` items.
- [ ] Confirm no `table_event` implementation accepts arbitrary raw events.
- [ ] Confirm all manual table-event paths return warning metadata.
- [ ] Confirm all unsupported public-worthy table events have named blockers.

Dependencies: Tasks 6-10, or explicitly skipped subtasks with documented blockers.

Verification:

- `rg "table_event|record_table_event" plans packages/core/src packages/mcp/src`
- `pnpm --filter @dnd/mcp test -- src/server.test.ts`
- Inventory check from Task 24 if audit rows changed.

Commit after this task:

- `docs: update table event audit status`

### Task 12 - Warlock And Sorcerer Creature Suggested Actions

- [ ] Add creature `suggested_action` support for `USE_MAGICAL_CUNNING`.
- [ ] Add creature `suggested_action` support for `USE_INNATE_SORCERY`.
- [ ] Verify each token uses an existing guard/update path and does not duplicate state.
- [ ] Add focused available-actions and MCP tests.

Dependencies: Task 1. Task 2 only if either item is reclassified as `control_command`.

RAW check:

- Read relevant Warlock and Sorcerer SRD 5.2.1 class passages.
- Check [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

Verification:

- `pnpm --filter @dnd/core test -- src/available-actions.test.ts`
- `pnpm --filter @dnd/mcp test -- src/server.test.ts`
- Tier 1b creature MBT if Quint-visible semantics or bridge fields change.

Commit after this task:

- `feat(core): expose warlock sorcerer MCP actions`

### Task 13 - Druid Creature Suggested Actions

- [ ] Add creature `suggested_action` support for `ENTER_WILD_SHAPE`.
- [ ] Add creature `suggested_action` support for `EXIT_WILD_SHAPE`.
- [ ] Add creature `suggested_action` support for `USE_WILD_RESURGENCE_SLOT`.
- [ ] Verify token legality from existing guard/update paths and do not add duplicate state.
- [ ] Add focused available-actions and MCP tests.

Dependencies: Task 1. Task 2 only if any item is reclassified as `control_command`.

RAW check:

- Read relevant Druid SRD 5.2.1 class passages.
- Check [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

Verification:

- `pnpm --filter @dnd/core test -- src/available-actions.test.ts`
- `pnpm --filter @dnd/mcp test -- src/server.test.ts`
- Tier 1b creature MBT if Quint-visible semantics or bridge fields change.

Commit after this task:

- `feat(core): expose druid MCP actions`

### Task 14 - Paladin Free Smite Decision

- [ ] Re-check `USE_DIVINE_SMITE_FREE` against RAW and the current guard/update path.
- [ ] If the existing event is enough without attack-hit ownership leakage, add creature `suggested_action` support.
- [ ] If it needs hit/target/attack ownership, do not expose it as a creature token; move it to the battle-action blocker list in [MCP_EVENT_SURFACE_AUDIT.md](./MCP_EVENT_SURFACE_AUDIT.md).
- [ ] Add focused tests for the implemented path or audit-only blocker update.

Dependencies: Task 1.

RAW check:

- Read relevant Paladin Divine Smite SRD 5.2.1 class passages.
- Check [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

Verification:

- `pnpm --filter @dnd/core test -- src/available-actions.test.ts`
- `pnpm --filter @dnd/mcp test -- src/server.test.ts` if exposed through MCP.
- Tier 1b creature MBT if Quint-visible semantics or bridge fields change.

Commit after this task:

- `feat(core): decide free divine smite MCP surface`

### Task 15 - Save And Check Semantic Trigger Commands

- [ ] Do not expose raw `TRIGGER_INDOMITABLE` or `TRIGGER_TACTICAL_MIND`.
- [ ] Add semantic command shapes for recording a failed save that can open Indomitable and a failed ability check that can open Tactical Mind.
- [ ] If either trigger needs facts the domain does not own, stop and add a blocker to the audit instead of inventing MCP-only state.
- [ ] Add tests proving the semantic command opens the expected suggested action and resolution clears the pending state.

Dependencies: Task 2.

RAW check:

- Read Fighter Indomitable and Fighter Tactical Mind SRD 5.2.1 class passages.
- Check [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

Verification:

- `pnpm --filter @dnd/core test -- src/available-actions.test.ts`
- `pnpm --filter @dnd/mcp test -- src/server.test.ts`
- Tier 1b creature MBT if pending-resolution state or MBT bridge semantics change.

Commit after this task:

- `feat(mcp): add save check trigger commands`

### Task 16 - Attack Rider Semantic Trigger Commands

- [ ] Do not expose raw `TRIGGER_SNEAK_ATTACK` or `TRIGGER_PEERLESS_SKILL_ATTACK_ROLL`.
- [ ] Add semantic command shapes only if MCP/session users need to record an attack hit or failed attack roll outside the battle action path.
- [ ] If attack-hit facts are better owned by battle attack resolution, update the audit blocker instead of adding a creature command.
- [ ] Add tests proving any implemented command opens the expected suggested action and resolution clears the pending state.

Dependencies: Task 2.

RAW check:

- Read Rogue Sneak Attack and Bard Peerless Skill SRD 5.2.1 class passages.
- Check [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

Verification:

- `pnpm --filter @dnd/core test -- src/available-actions.test.ts`
- `pnpm --filter @dnd/mcp test -- src/server.test.ts`
- Tier 1b creature MBT if pending-resolution state or MBT bridge semantics change.

Commit after this task:

- `feat(mcp): add attack rider trigger commands`

### Task 17 - Spell Damage Semantic Trigger Commands

- [ ] Do not expose raw `TRIGGER_OVERCHANNEL`.
- [ ] Add a semantic command shape for spell-damage context only if MCP/session users need to record it outside a modeled spell action.
- [ ] If the spell-damage trigger belongs behind `CAST_PREPARED_SPELL` or battle spell resolution, update the audit blocker instead of adding a raw command.
- [ ] Add tests proving any implemented command opens `USE_OVERCHANNEL` and resolution clears the pending state.

Dependencies: Task 2.

RAW check:

- Read Wizard Overchannel SRD 5.2.1 class passages and relevant spellcasting damage passages.
- Check [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

Verification:

- `pnpm --filter @dnd/core test -- src/available-actions.test.ts`
- `pnpm --filter @dnd/mcp test -- src/server.test.ts`
- Tier 1b creature MBT if pending-resolution state or MBT bridge semantics change.

Commit after this task:

- `feat(mcp): add spell damage trigger command`

### Task 18 - Battle Suggested Action Ownership Audit

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
- [ ] Classify each missing fact as one of: already battle-owned, user choice hole, runtime-owned input, table/session fact, or missing domain/spec ownership.
- [ ] Update [MCP_EVENT_SURFACE_AUDIT.md](./MCP_EVENT_SURFACE_AUDIT.md) with precise blockers and first safe implementation candidates.

Dependencies: Task 1.

RAW check:

- Read attack, movement, opportunity attack, Help, Hide, Search, Grapple, and legendary-action passages in `.references/srd-5.2.1/Playing-the-Game.md` and `.references/srd-5.2.1/Rules-Glossary.md`.
- Check [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

Verification:

- Inventory check from Task 24 if audit rows changed.

Commit after this task:

- `docs: audit blocked battle action ownership`

### Task 19 - Battle Non-Attack First Slice

- [ ] Implement the smallest non-attack suggested action from Task 18 that does not require speculative geometry or MCP-only state.
- [ ] Candidate order, if Task 18 confirms ownership:
  - `BATTLE_RELEASE_GRAPPLE`, if battle state already owns the actor's grapple state strongly enough.
  - `BATTLE_ESCAPE_GRAPPLE`, if the only missing fact is an escape result that can be runtime-owned.
  - `BATTLE_SEARCH`, if target choice and perception total can follow existing user-hole/runtime conventions.
- [ ] Do not include `BATTLE_MOVE` unless provocation/threat ownership is explicit.
- [ ] Do not include `BATTLE_HIDE` unless cover/obscurement and line-of-sight facts are explicitly owned or user/runtime holes.

Dependencies: Task 18. Task 2 only if this slice uses new control/table plumbing.

RAW check:

- Read the relevant action passage for the chosen slice in `.references/srd-5.2.1/Playing-the-Game.md` and `.references/srd-5.2.1/Rules-Glossary.md`.
- Check [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

Verification:

- `pnpm --filter @dnd/core test -- src/available-actions.test.ts`
- `pnpm --filter @dnd/mcp test -- src/server.test.ts`
- Tier 1 battle MBT only if behavior/spec/bridge semantics change.

Commit after this task:

- `feat(core): expose first non-attack battle action`

### Task 20 - Battle Basic Attack Research Slice

- [ ] Split `BATTLE_ATTACK` into its token choices and runtime-owned inputs.
- [ ] Decide whether these are battle-owned, user holes, runtime inputs, or blockers:
  - `targetId`
  - weapon payload / damage type / damage qualifiers
  - attack roll
  - damage roll / final damage
  - crit
  - target AC
  - knockout choice
  - melee/ranged and weapon properties
  - visibility/fear/sneak-attack adjacency facts
  - `hitReactionCandidates`
- [ ] If implementable, add only the smallest token path for one default weapon attack shape.
- [ ] If not implementable, document the exact missing ownership facts and stop.

Dependencies: Task 18. Prefer after Task 3 because `BATTLE_DECLARE_RECKLESS` changes attack-context meaning.

RAW check:

- Read attack rules and any relevant attack-modifier rules in `.references/srd-5.2.1/Playing-the-Game.md` and `.references/srd-5.2.1/Rules-Glossary.md`.
- Check [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

Verification:

- `pnpm --filter @dnd/core test -- src/available-actions.test.ts`
- `pnpm --filter @dnd/mcp test -- src/server.test.ts`
- Tier 1 battle MBT if attack behavior or battle projection changes.

Commit after this task:

- `docs: specify battle attack MCP blockers`
- or, if implemented: `feat(core): expose basic battle attack action`

### Task 21 - Battle Rider And Off-Hand Slice

- [ ] Reassess `BATTLE_OFF_HAND_ATTACK` after `BATTLE_ATTACK` ownership is resolved.
- [ ] Reassess creature attack riders that likely need battle ownership:
  - `USE_BRUTAL_STRIKE`
  - `STUNNING_STRIKE`
  - `USE_CUNNING_STRIKE`
  - `USE_ELDRITCH_SMITE`
  - `USE_DIVINE_SMITE_FREE`, if Task 14 did not include it
- [ ] Implement only one rider/off-hand slice if all ownership facts are clear.
- [ ] Otherwise update blockers.

Dependencies: Task 20. Also depends on Task 14 if `USE_DIVINE_SMITE_FREE` is evaluated there.

RAW check:

- Read the relevant class feature and attack-rider SRD 5.2.1 passages.
- Check [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

Verification:

- `pnpm --filter @dnd/core test -- src/available-actions.test.ts`
- `pnpm --filter @dnd/mcp test -- src/server.test.ts`
- Tier 1 battle MBT for any battle/spec/bridge semantic change.

Commit after this task:

- `docs: refine battle attack rider blockers`
- or, if implemented: `feat(core): expose battle attack rider action`

### Task 22 - Battle Spatial Actions Slice

- [ ] Reassess movement/spatial actions together:
  - `BATTLE_MOVE`
  - `BATTLE_HELP_ATTACK`
  - `BATTLE_HIDE`
  - `BATTLE_SEARCH`, if not already handled
  - `BATTLE_GRAPPLE`
  - `BATTLE_ESCAPE_GRAPPLE`, if not already handled
- [ ] Identify what needs a future session/geometry owner:
  - positions
  - distance
  - path
  - cover/obscurement
  - line of sight
  - threatened creatures
  - opportunity attack provocation
- [ ] Implement only actions whose spatial facts are already battle-owned or cleanly represented as explicit user/runtime holes.
- [ ] Before exposing `BATTLE_GRAPPLE`, fold in the Size ownership cleanup from [BATTLE_SIZE_OWNERSHIP.md](./BATTLE_SIZE_OWNERSHIP.md): battle should own combatant Size and derive `attackerSize`/`targetSize` instead of accepting them as public command payload.
- [ ] For the rest, update blockers instead of adding MCP-only state.

Pre-research result, 2026-04-10:

- `BATTLE_ESCAPE_GRAPPLE` is a clean candidate after `BATTLE_RELEASE_GRAPPLE`: battle owns the active creature's `grappledBy` state and action availability; the token needs one explicit runtime result, `escapeSucceeded`, for the Strength (Athletics) or Dexterity (Acrobatics) check against the escape DC.
- `BATTLE_SEARCH` is a clean candidate if the token treats the check total as runtime-owned: battle owns action spend and the target's `hiddenDiscoveryDc`; user chooses `targetId`; runtime supplies `perceptionTotal` or the applicable Wisdom-check total. Do not invent perception/proficiency state in MCP.
- `BATTLE_HIDE` is implementable only if MCP explicitly accepts session facts as inputs: `stealthTotal`, `hasCoverOrObscurement`, and `outOfEnemyLineOfSight`. Battle can own action spend and `hiddenDiscoveryDc` projection after those facts are supplied, but it does not own cover, obscurement, or enemy line of sight.
- `BATTLE_HELP_ATTACK` and `BATTLE_MOVE` remain blocked on geometry/session ownership: visibility, reach, path, threatened creatures, and opportunity-attack provocation are not battle-owned.

Dependencies: Task 18. `BATTLE_MOVE` should wait until either a geometry/session owner exists or the plan explicitly accepts caller-supplied provocation/threat facts.

RAW check:

- Read movement, opportunity attack, Help, Hide, Search, and Grapple passages in `.references/srd-5.2.1/Playing-the-Game.md` and `.references/srd-5.2.1/Rules-Glossary.md`.
- Check [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

Verification:

- `pnpm --filter @dnd/core test -- src/available-actions.test.ts`
- `pnpm --filter @dnd/mcp test -- src/server.test.ts`
- Tier 1 battle MBT if battle movement or grapple semantics change.

Commit after this task:

- `docs: refine battle spatial action blockers`
- or, if implemented: `feat(core): expose battle spatial action`

### Task 23 - Monster Legendary Attack Slice

- [ ] Reassess `BATTLE_LEGENDARY_ATTACK` after control-command support for `BATTLE_LEGENDARY_PASS` and monster control exists.
- [ ] Decide whether legendary attack should be a `suggested_action` in `get_available_actions`, a `control_command`, or both depending on active monster host UX.
- [ ] Identify missing monster stat-block payload ownership for target, attack roll, damage, damage type, AC, crit, knockout, weapon properties, and reaction candidates.
- [ ] Implement only if the monster payload is already battle-owned; otherwise document blockers.

Pre-research result, 2026-04-10:

- Keep `BATTLE_LEGENDARY_ATTACK` blocked for now. Battle owns the legendary-action window (`laCtx.eligibleMonsters`) and each monster's `legendaryActionsRemaining`, but it does not own the specific legendary action payload/name/cost.
- The public surface should probably be a monster-host `suggested_action` only after stat-block action payloads exist. A `control_command` could still be useful for fully external monster automation, but it should use the same stat-block payload validation rather than accepting arbitrary attack payloads.
- Reuse the Task 20 attack runtime boundary once it exists: user/runtime inputs still include target, attack roll, damage, crit, target AC, knockout choice, visibility/range/adjacency facts, and `hitReactionCandidates`; battle/stat-block ownership should provide damage type, damage qualifiers, weapon properties, melee/ranged shape, and action cost.
- Do not expose caller-supplied `weaponProperties`, `isFinesse`, `laDt`, or `damageQualifiers` as arbitrary public payloads before monster stat-block action ownership exists.

Dependencies: Task 4 and Task 18. May also depend on Task 20 if it reuses the regular attack token/runtime design.

RAW check:

- Read legendary action and attack passages in `.references/srd-5.2.1/`.
- Check [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

Verification:

- `pnpm --filter @dnd/core test -- src/available-actions.test.ts`
- `pnpm --filter @dnd/mcp test -- src/server.test.ts`
- Tier 1 battle MBT if legendary-action behavior changes.

Commit after this task:

- `docs: specify legendary attack MCP blockers`
- or, if implemented: `feat(mcp): expose legendary attack control`

### Task 24 - Final Surface Audit And Docs Wrap

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
