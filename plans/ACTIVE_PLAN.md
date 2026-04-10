# Active Plan

Date: 2026-04-10

This is the single active planning queue. It replaces the previous dated APR10
batch plan and folds in the useful follow-up notes from the deleted one-off
plan files.

## Batch Objective

Pick one or more bounded implementation slices that improve the D&D rules engine and MCP action surface without adding MCP-only state, duplicating owned facts, or widening into a geometry/grid engine.

The coding loop should treat each task below as independently schedulable. Do not start a task marked "research first" until its research output is written back into this file or a task-specific plan.

## Current Integrated Baseline

Already wired on `master`:

- `BATTLE_HIDE`, `BATTLE_SEARCH`, `BATTLE_ESCAPE_GRAPPLE`, and `BATTLE_RELEASE_GRAPPLE` through `get_available_actions`.
- `BATTLE_ACTION_SURGE`, `BATTLE_ENTER_RAGE`, and `BATTLE_DECLARE_RECKLESS` through `get_available_actions`.
- Warlock `USE_MAGICAL_CUNNING`, Sorcerer `USE_INNATE_SORCERY`, and Druid `ENTER_WILD_SHAPE`, `EXIT_WILD_SHAPE`, `USE_WILD_RESURGENCE_SLOT`.
- Creature damage/recovery, condition/exhaustion, falling, voluntary concentration break, failed-save/check semantic triggers, and battle `BATTLE_HEAL` through `record_table_event`.

Still explicitly deferred in `MCP_EVENT_SURFACE_AUDIT.md`:

- `BATTLE_ATTACK`, `BATTLE_OFF_HAND_ATTACK`, `BATTLE_LEGENDARY_ATTACK`.
- Attack riders: `USE_BRUTAL_STRIKE`, `STUNNING_STRIKE`, `USE_CUNNING_STRIKE`, `USE_ELDRITCH_SMITE`, `USE_DIVINE_SMITE_FREE`.
- `BATTLE_HELP_ATTACK`, `BATTLE_MOVE`, `BATTLE_GRAPPLE`.
- Generic battle spell table events, raw effect/max-HP table events, environmental blockers such as `SUFFOCATE`, and monster-command blockers such as raw monster `USE_LEGENDARY_ACTION`.

## Task Selection Guidance

Recommended first coding-loop task:

1. **Task A: Condition Consequence Table Completion Research** if the goal is competitor-research follow-through and spec auditability.
2. **Task B: Battle Size Ownership For Grapple** if the goal is a concrete implementation slice that unblocks a public battle action.

Do not start with `BATTLE_ATTACK` implementation. Its public runtime/session contract is the main unresolved API boundary and can easily absorb off-hand attacks, hit reactions, legendary actions, and riders.

## Task A - Condition Consequence Table Completion Research

Status: research first.

Purpose:

- Convert the under-documented competitor-derived condition-table gap into an implementation-ready scope.
- Decide whether to finish the full Quint+TS condition consequence table or only document why the current narrower TS table is sufficient.

Context:

- Competitor inspiration: `.references/inspirations/05-condition-effects-table.md`.
- Current TS table: `CANONICAL_CONDITION_CONSEQUENCES` in `packages/core/src/types.ts`.
- Current TS query usage: `packages/core/src/machine-queries.ts`.
- Current authoritative predicates: `creature.qnt` (`pOwnAttackModifiers`, `pDefenseModifiers`, `pCheckModifiers`, `pSaveModifiers`, `pCanSpeak`, `pApplyCondition`, `pComputeEffectiveSpeed`, `pTakeDamageAsCreature`).
- `plans/DAG.md` marks `canonical-condition-effects` complete, but current implementation is only partial relative to the inspiration design.

Known findings:

- Current TS table columns:
  - `ownAttackDisadvantage`
  - `defenseAdvantage`
  - `defenseAutoCritWithin5ft`
  - `checkDisadvantage`
  - `saveDexDisadvantage`
  - `saveStrDexAutoFail`
  - `speedZero`
  - `blocksActions`
  - `blocksSpeech`
- Inspiration-proposed extra columns:
  - `breaksConc`
  - `initDisadv`
  - `allDamageResist`
  - `blocksPoisonApp`
  - `impliesProne`
  - `impliesIncap`
- There is no authoritative Quint `CONDITION_EFFECTS` table.
- The inspiration note flags `pCanSpeak`/`canSpeak` and initiative disadvantage as possible gaps; those must be rechecked against SRD 5.2.1 before changing code.

Inputs:

- `.references/srd-5.2.1/Rules-Glossary.md` condition entries.
- `UBIQUITOUS_LANGUAGE.md` condition/effect terminology.
- `.references/inspirations/05-condition-effects-table.md`.
- `creature.qnt`, `packages/core/src/types.ts`, `packages/core/src/machine-queries.ts`, `packages/core/src/machine-helpers.ts`, `packages/core/src/battle-machine-creature.ts`.

Research output:

- Add a "Condition Table Delta" section to this file with:
  - exact SRD-backed columns to adopt or reject;
  - list of current behavior gaps, if any;
  - list of contextual effects that must remain outside the table;
  - implementation order and verification plan.

Implementation output, only after research:

- If adopted, add a Quint `ConditionEffects` table and align TS table naming/columns.
- Rewrite only unconditional condition consequences to table lookups.
- Keep contextual effects explicit: prone distance, frightened LOS, invisible attacker/defender role, deafened hearing checks, blinded sight checks, charmed source-specific effects, grappled non-grappler attack effects, and movement/path effects.

Acceptance criteria for research:

- Every proposed table column has a RAW citation or is explicitly rejected.
- The plan states whether `breaksConc`, `initDisadv`, `allDamageResist`, `blocksPoisonApp`, `impliesProne`, and `impliesIncap` should be implemented now, deferred, or rejected.
- The plan reconciles the `plans/DAG.md` "complete" status with current partial implementation.

Acceptance criteria for implementation:

- Quint and TS represent the same intended unconditional consequence set.
- Existing contextual behavior is not collapsed into incorrect booleans.
- Any behavior change is explicitly tied to RAW and noted in the plan.
- No new redundant condition state is introduced.

Verification:

- `npx quint test --match "inv_" dndTest.qnt`.
- Tier 1b creature MBT if only creature-level parity changes.
- Tier 1 battle MBT if battle-facing behavior changes.

Extra research needed:

- Yes. RAW condition reread required before code changes.

## Task B - Battle Size Ownership For Grapple

Status: implementation-ready after RAW check.

Purpose:

- Move creature Size into battle-owned combatant state so `BATTLE_GRAPPLE` can stop accepting `attackerSize` and `targetSize` as public/raw event payload facts.

Context:

- Folded-in ownership note: battle Size ownership must be fixed before public
  `BATTLE_GRAPPLE` exposure.
- Audit row: `plans/MCP_EVENT_SURFACE_AUDIT.md`.
- Current problem: `BATTLE_GRAPPLE` needs size, but `BattleCreatureState` and `battle.qnt` `Combatant` do not store size.
- Current raw payload locations to inspect: `packages/core/src/battle-machine-events.ts` `BATTLE_GRAPPLE` and `packages/core/src/battle-machine-actions-turn.ts` grapple handling.

Inputs:

- `.references/srd-5.2.1/Rules-Glossary.md` Grapple and Size text.
- `UBIQUITOUS_LANGUAGE.md`.
- `battle.qnt`.
- `packages/core/src/battle-machine-types.ts`.
- `packages/core/src/battle-machine-events.ts` if event payload shape changes.
- `packages/core/src/battle-machine-actions-turn.ts`.
- `packages/core/src/available-actions.ts`.
- Battle MBT projection files.

Implementation output:

- Add `creatureSize` to Quint `Combatant`.
- Add `creatureSize` to `BattleCreatureState`.
- Add optional `creatureSize` to `InitCreatureConfig`; default PCs to `"medium"` unless a better owned source is available.
- Add `creatureSize` to MCP `BATTLE_INIT` creature schema if battle init remains the public combatant config source.
- Update `BATTLE_GRAPPLE` handling to derive attacker and target size from battle state.
- Reassess whether public `BATTLE_GRAPPLE` token can be exposed after size is owned. If save/free-hand/target facts are still clean, expose; otherwise update blocker precisely.

Acceptance criteria:

- Public API no longer accepts caller-supplied `attackerSize`/`targetSize` for grapple.
- Battle machine and `battle.qnt` derive grapple size legality from combatant state.
- MBT bridge maps the new size field.
- No MCP-only size state is introduced.
- Existing release/escape grapple behavior remains unchanged.

Verification:

- Focused battle scenario tests for size-blocked and size-allowed grapples.
- `pnpm --filter @dnd/core typecheck`.
- Tier 1 battle MBT after Quint and bridge changes.

Extra research needed:

- Light. RAW Grapple/Size reread required, but the ownership design is already documented.

## Task C - ResourceCost Typed Refactor

Status: implementation-ready after scope confirmation.

Purpose:

- Promote shallow action costs into a typed, self-describing support-layer representation without adding a generic consumption engine.

Context:

- Competitor inspiration: `.references/inspirations/10-first-class-consumption.md`.
- Current type: `ResourceCost` in `packages/core/src/available-actions.ts`.
- Current shape:
  - `action?: true`
  - `bonusAction?: true`
  - `reaction?: true`
  - `movement?: number`
  - `charge?: ResourceCostCharge`
  - `shape?: "spend" | "grant" | "reserve" | "refund"`
- Missing domain language: `UBIQUITOUS_LANGUAGE.md` and `battle/DOMAIN.md` do not currently define Pool/Quota/Lock/Timer or Spend/Grant/Reserve/Refund.

Inputs:

- `.references/inspirations/10-first-class-consumption.md`.
- `packages/core/src/available-actions.ts`.
- `packages/mcp/src/server.ts`.
- Any app/MCP consumers of token `cost`.
- `UBIQUITOUS_LANGUAGE.md`, `battle/DOMAIN.md`.

Implementation output:

- Add resource consumption vocabulary to docs:
  - Pool, Quota, Lock, Timer.
  - Spend, Grant, Reserve, Refund.
- Confirm `ResourceCost` means immediate up-front selectable/displayable costs only.
- Replace shallow `ResourceCost` with typed cost items, likely `ReadonlyArray<QuotaCost | PoolCost>`.
- Update token builders and cost grouping/rendering consumers.
- Do not add a generic Quint `Cost` record or generic `consume()` function.

Acceptance criteria:

- Cost representation is typed enough for MCP/UI consumers to distinguish quotas from pools.
- Ready spell and Counterspell refund semantics are documented as resource-shape examples without moving their actual semantics into a generic engine.
- Existing token execution behavior is unchanged.
- All cost consumers compile without stringly matching old shallow fields.

Verification:

- `pnpm --filter @dnd/core typecheck`.
- Focused available-actions tests if token snapshots/shape tests exist.
- MCP tests if JSON schema or grouping output changes.

Extra research needed:

- Light. Confirm consumer blast radius before code changes.

## Task D - Battle Attack Runtime/Session Boundary

Status: research/design first.

Purpose:

- Define the public resolved-token/runtime input contract for a first-slice main-hand `BATTLE_ATTACK` without letting MCP fabricate table/session facts.

Context:

- Main audit row: `plans/MCP_EVENT_SURFACE_AUDIT.md` `BATTLE_ATTACK`.
- Audit row: `plans/MCP_EVENT_SURFACE_AUDIT.md` `BATTLE_ATTACK`.
- Architectural rule: `ARCHITECTURE.md` says MCP must not remember, fabricate, or re-derive combat facts.

Known split:

- Battle-owned/derivable:
  - active attacker;
  - action/extra-attack spend;
  - `attackActionUsed`;
  - `lightAttackUsedThisTurn`;
  - help consumption;
  - crit range;
  - main-hand weapon profile;
  - melee/ranged flag;
  - damage type;
  - default damage qualifiers;
  - weapon properties;
  - Sneak Attack state.
- User holes:
  - `targetId`;
  - `knockOut`.
- Runtime dice/result inputs:
  - `attackRoll`;
  - damage dice/final damage;
  - possibly `crit`;
  - possibly `saDmg`.
- Table/session facts still missing from the public contract:
  - target AC;
  - `attackerWithin5ft`;
  - optional `attackerWithin60ft`;
  - `hostileWithin5ft`;
  - `targetCanSeeAttacker`;
  - `attackerCanSeeTarget`;
  - `frightSourceInLOS`;
  - `hasAllyAdjacentToTarget`;
  - `hitReactionCandidates`.

Inputs:

- `.references/srd-5.2.1/Playing-the-Game.md` Attack rules.
- `.references/srd-5.2.1/Rules-Glossary.md` relevant attack/visibility/cover/condition entries.
- `UBIQUITOUS_LANGUAGE.md`.
- `battle.qnt`.
- `packages/core/src/battle-machine-actions-attack.ts`.
- `packages/core/src/available-actions.ts`.
- `packages/mcp/src/server-runtime.ts`.
- `plans/MCP_EVENT_SURFACE_AUDIT.md`.

Research output:

- A contract proposal in this file or a task-specific plan:
  - exact resolved token shape;
  - exact runtime input shape;
  - explicit table/session facts allowed;
  - facts forbidden because battle already owns them;
  - stop conditions.

Implementation output, only after research:

- Add only one active-creature main-hand weapon `BATTLE_ATTACK` token.
- Do not include unarmed, off-hand, legendary, spell attack, custom weapon payloads, or attack riders.
- Do not accept caller-supplied `weaponProperties`, `isFinesse`, `dt`, or `damageQualifiers` for the first slice.

Acceptance criteria for research:

- The contract can execute without MCP inventing AC, geometry, visibility, adjacency, or hit-reaction candidates.
- The plan says whether `crit` is runtime-supplied or derived from `attackRoll` and `critRange`.
- The plan says whether damage aggregation is runtime-owned or battle-owned.

Acceptance criteria for implementation:

- Token appears only when active creature has an owned main-hand weapon and attack budget.
- Event construction derives weapon payload facts from battle state.
- Missing table/session facts are explicit inputs, not sampled or hidden in MCP.
- Off-hand, legendary, unarmed, and rider paths remain blocked.

Verification:

- Focused available-actions tests.
- MCP tests if schema/runtime handling changes.
- Tier 1 battle MBT if battle/spec/bridge semantics change.

Extra research needed:

- Yes. API contract design and RAW attack reread required.

## Task E - Movement And Help Geometry/Session Ownership

Status: research/design only.

Purpose:

- Decide whether to introduce a session geometry owner or keep `BATTLE_MOVE` and `BATTLE_HELP_ATTACK` deferred.

Context:

- `BATTLE_MOVE` is blocked on position, path/destination, difficult terrain beyond a fixed step, reach exit, threatened creature set, and OA provocation.
- `BATTLE_HELP_ATTACK` is blocked on helper/ally/target visibility and range/reach facts.
- `ARCHITECTURE.md` and `battle/DOMAIN.md` intentionally keep formal geometry out of the core.
- `.references/inspirations/12-opportunity-attack-path-analysis.md` recommends adopting vocabulary but not adding grid/pathfinding.

Inputs:

- `ARCHITECTURE.md`.
- `battle/DOMAIN.md`.
- `.references/inspirations/12-opportunity-attack-path-analysis.md`.
- `plans/MCP_EVENT_SURFACE_AUDIT.md`.

Research output:

- Decision note:
  - continue deferring;
  - accept explicit caller/session facts for a narrow action;
  - or define a future session geometry owner.

Acceptance criteria:

- The note must not add a grid/geometry engine by accident.
- The note must identify the owner of visibility, reach, threat, path, and provocation facts.

Verification:

- Docs-only unless implementation is explicitly scheduled later.

Extra research needed:

- Yes. This is product/session boundary design, not ready implementation.

## Task F - Legendary Attack Payload Ownership

Status: research/design only; blocked by Task D.

Purpose:

- Define what entity owns monster Legendary Action option payloads before exposing `BATTLE_LEGENDARY_ATTACK`.

Context:

- `BATTLE_LEGENDARY_PASS` is already wired as a control command.
- `BATTLE_LEGENDARY_ATTACK` remains blocked because battle owns the legendary-action window and charges, but not the specific stat-block Legendary Action option payload/name/cost.
- It also needs the same attack runtime/session contract as `BATTLE_ATTACK`.

Inputs:

- `plans/MCP_EVENT_SURFACE_AUDIT.md`.
- Monster stat-block files/types.
- `battle.qnt` legendary action handling.
- Task D research output.

Research output:

- A monster stat-block action payload ownership proposal.
- Decide whether legendary attack is a suggested action, monster-control command, or both.

Acceptance criteria:

- MCP does not accept arbitrary damage type, damage qualifier, weapon property, action cost, or melee/ranged facts.
- The plan reuses the Task D attack boundary where possible.

Verification:

- Docs-only until implementation.

Extra research needed:

- Yes. Depends on attack boundary and monster payload ownership review.

## Task G - Attack Rider Ownership

Status: research/design only; blocked by Task D.

Purpose:

- Keep attack riders out of creature-level MCP and prepare them as battle-owned rider windows after attack ownership exists.

Context:

- Blocked riders:
  - `USE_BRUTAL_STRIKE`;
  - `STUNNING_STRIKE`;
  - `USE_CUNNING_STRIKE`;
  - `USE_ELDRITCH_SMITE`;
  - `USE_DIVINE_SMITE_FREE`.
- Each requires specific attack timing and qualifying-hit facts.

Inputs:

- `plans/MCP_EVENT_SURFACE_AUDIT.md` rider rows.
- `.references/srd-5.2.1/Classes/` relevant class passages.
- Task D research output.

Research output:

- For each rider, classify:
  - pre-roll choice;
  - post-hit/pre-damage choice;
  - post-damage effect;
  - runtime save/target facts;
  - battle-owned feature state.

Acceptance criteria:

- No creature-level token is added for a hit-qualified rider.
- Rider timing is explicit and maps to battle attack resolution phases.

Verification:

- Docs-only until Task D is implemented.

Extra research needed:

- Yes. Depends on attack boundary and RAW class feature reread.

## Task H - PassiveModifiers Sub-Record

Status: defer unless a passive-modifier implementation batch is selected.

Purpose:

- Reduce flat modifier field boilerplate by grouping explicit named fields into a closed `PassiveModifiers` record.

Context:

- Competitor inspiration: `.references/inspirations/11-modifier-algebra.md`.
- The repo intentionally rejects open modifier registries in favor of explicit Quint fields.
- Current flat fields include `hasEvasion`, `saveMiscBonus`, `critRange`, `rangedWeaponAttackRollBonus`, `defenseArmorClassBonus`, `greatWeaponFightingDamageFloor`, `meleeDamageBonus`, `recklessThisTurn`, and related fields.
- `ARCHITECTURE.md` lists planned future passive fields: `conditionImmunities`, `dexSaveAdvantage`, `attacksCannotHaveAdvantage`.

Inputs:

- `.references/inspirations/11-modifier-algebra.md`.
- `ARCHITECTURE.md`.
- `battle.qnt`.
- `packages/core/src/battle-machine-types.ts`.
- Battle MBT bridge.

Implementation output:

- Add `PassiveModifiers`/`FRESH_MODS` in Quint and TS only if this batch is deliberately selected.
- Mechanically nest existing passive modifier fields.
- Do not add a generic modifier resolver unless there is a real multi-source stacking case.

Acceptance criteria:

- Behavior unchanged.
- Field grouping reduces boilerplate without hiding semantics in an open registry.
- MBT bridge remains explicit and parity-tested.

Verification:

- Typecheck.
- Focused battle tests if setup types change.
- Tier 1 battle MBT because the bridge/spec shape changes.

Extra research needed:

- Moderate. Not urgent; best paired with adding new passive modifier fields.

## Task I - Build-Map / Hole Metadata

Status: defer.

Purpose:

- Enrich action-token holes with metadata such as domain name, legality source, and whether filling one hole narrows later holes.

Context:

- Competitor inspiration: `.references/inspirations/15-build-map-parameterization.md`.
- Current implementation already has `ActionToken` -> `ResolvedActionToken` -> `ResolutionRequest` -> event.
- Current `Hole<T>` is just `{ options: ReadonlyArray<T> }`.

Inputs:

- `.references/inspirations/15-build-map-parameterization.md`.
- `packages/core/src/available-actions.ts`.
- `plans/available-actions.md`.
- Task D research output if this is used for battle attacks.

Research output:

- Decide whether the first user is attack boundary, transcript disambiguation, or a future UI.

Acceptance criteria:

- Metadata is not added speculatively without a consumer.
- No UI-specific abstraction leaks into core action legality.

Verification:

- Docs-only unless a consumer is selected.

Extra research needed:

- Yes, but defer until a concrete consumer exists.

## Task J - Generic Table Events, Environmental Hazards, And Monster Commands

Status: research/design only.

Purpose:

- Decide whether to schedule a table-event provenance or monster-command ownership batch.

Context:

- Max-HP reduction/restoration needs source-specific provenance and caps.
- Raw effect add/remove needs source, duration, dependency, and payload ownership.
- Generic battle spell table events are blocked on multi-phase reaction resolution and spell payload ownership.
- `SUFFOCATE` is blocked because the current raw event is a terminal drop-to-0 shortcut, not a public SRD suffocation-progress hazard event.
- Raw monster `USE_LEGENDARY_ACTION` is blocked because named monster legendary actions need action-name legality and stat-block ownership; `BATTLE_LEGENDARY_PASS` is already the safe control command for passing a legendary-action window.

Inputs:

- `plans/MCP_EVENT_SURFACE_AUDIT.md`.
- Relevant SRD spell/effect examples if a specific table event is selected.
- Monster stat-block/action data if a monster command is selected.

Research output:

- Pick one narrow table-event or monster-command family, or keep all deferred.
- For max-HP work, distinguish `REDUCE_MAX_HP` and `RESTORE_MAX_HP` provenance and caps.
- For effect work, distinguish raw `ADD_EFFECT` payloads from modeled semantic spell/feature effects.
- For environmental work, decide whether to model a source-specific hazard like suffocation rather than exposing the raw terminal event.
- For monster commands, decide whether a command owns a named stat-block action or must wait for monster action payload ownership.

Acceptance criteria:

- No raw payload command is exposed without source/provenance constraints.
- Prefer modeled semantic spell/action tokens when possible.
- Public monster commands do not accept arbitrary action names, damage, damage types, or payload facts without stat-block validation.

Verification:

- Docs-only until implementation.

Extra research needed:

- Yes. Needs source-by-source provenance review.

## Extra Research Summary

Needs extra research before coding:

- Task A: Condition table completion. RAW condition reread and column decision required.
- Task D: Battle attack boundary. API contract and RAW attack reread required.
- Task E: Movement/help geometry. Session/product ownership decision required.
- Task F: Legendary attack payload. Monster stat-block action payload ownership required, and it depends on Task D.
- Task G: Attack riders. RAW class feature reread and Task D dependency.
- Task I: Build-map metadata. Needs a concrete consumer.
- Task J: Generic table events. Needs source/provenance review.

Light research only:

- Task B: Battle size ownership. RAW Grapple/Size reread required, but design is already documented.
- Task C: ResourceCost typed refactor. Confirm consumer blast radius and immediate-cost scope.
- Task H: PassiveModifiers. Research only if selected; otherwise defer.

## Recommended APR10 Coding Loop

If choosing one implementation batch:

1. Task B: Battle Size Ownership For Grapple.

If choosing one research-first batch:

1. Task A: Condition Consequence Table Completion Research.

If choosing a support-layer cleanup:

1. Task C: ResourceCost Typed Refactor.

Avoid in the first APR10 implementation loop:

- `BATTLE_ATTACK` implementation.
- `BATTLE_MOVE` / `BATTLE_HELP_ATTACK` implementation.
- `BATTLE_LEGENDARY_ATTACK` implementation.
- Attack riders.
- Build-map metadata without a consumer.
