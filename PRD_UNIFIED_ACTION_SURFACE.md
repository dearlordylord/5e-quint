# PRD: Unified Action Surface Across Creature and Battle Scopes

## Problem Statement

The supported action-query and execution surface is currently split by architecture rather than by product meaning.

Today the project has a mature creature-scoped action surface:

- `get_available_actions`
- `execute_action`
- `ActionToken`
- `ResolvedActionToken`

That surface works for actions whose legality and execution can be derived honestly from a single creature's owned state. It now covers a broad set of semantic actions.

But the next important class of supported actions is battle-owned:

- reaction actions such as `USE_UNCANNY_DODGE` and `USE_CUTTING_WORDS`
- future battle-window actions such as reaction spells and other interrupt-bound responses
- any action whose legality depends on a live trigger window, responder set, or battle interrupt context

The battle redesign work now owns those trigger windows correctly in battle state. The problem is that the supported action product still cannot consume that ownership honestly because it is creature-only:

- the current action query runs on `DndContext`, not `BattleContext`
- the current MCP server instantiates `creatureMachine`, not `battleMachine`
- the current supported action contract has no first-class way to say whether a token comes from a creature-local turn state or a battle interrupt window

As a result, reaction actions remain blocked even though the battle layer now knows when they are legal.

This is not just a missing token batch. It is a product and API architecture gap:

- either the system grows separate creature and battle action surfaces that will drift over time
- or it gains a single unified action surface that can represent both scopes honestly

The long-term reliable direction is the unified surface.

## Solution

Redesign the supported action product into a unified action surface that works across both creature and battle scopes.

The user-facing concepts remain the same:

- discover currently available actions
- inspect their costs and outcomes
- fill any user-facing holes
- execute the resolved action

What changes is the authoritative source and the contract shape behind those actions.

The unified action surface should:

- keep one family of product concepts:
  - `ActionToken`
  - `ResolvedActionToken`
  - available action query
  - action execution
- make action scope explicit:
  - creature-scoped actions from creature state
  - battle-scoped actions from battle state
- let battle interrupt windows project semantic reactions directly from owned battle legality
- avoid duplicating battle trigger state into creature state
- avoid growing a permanent parallel battle-only action API with divergent token language

This should be implemented as a foundational redesign with staged migration:

1. define the generalized action-surface contract
2. adapt the existing creature action surface onto that contract
3. add battle-scoped action discovery and execution
4. land reaction tokens as the first battle-scoped semantic actions

That sequence preserves long-term architectural reliability while keeping the migration controllable.

## User Stories

1. As a player, I want all supported actions to be discoverable through one conceptual interface, so that I do not have to think about whether an action is creature-local or battle-window-based.
2. As a player in combat, I want reaction options such as `Uncanny Dodge` or `Cutting Words` to appear only when the exact trigger window exists, so that the system never over-suggests illegal responses.
3. As a player, I want action tokens for turn actions and reaction-window actions to use the same broad vocabulary and grouping style, so that the product feels like one coherent action surface.
4. As a developer, I want the query/execute contract to work across both `DndContext` and `BattleContext`, so that new supported actions do not force parallel APIs.
5. As a developer, I want battle-window actions to project directly from owned battle state such as `awaitCtx`, so that legality is not re-derived or duplicated in adapters.
6. As a developer, I want the existing creature action pipeline to remain usable during migration, so that unifying the surface does not require a risky big-bang rewrite.
7. As a developer, I want resolved action tokens to remain user-facing contracts rather than low-level machine events, so that MCP and UI consumers stay decoupled from engine plumbing.
8. As a developer, I want the same grouping concepts to apply across scopes, so that cost buckets such as action, bonus action, reaction, and free remain stable at the product level.
9. As a developer, I want execution to be routed to the correct authoritative machine based on token scope, so that creature actions hit the creature engine and battle actions hit the battle engine without guesswork.
10. As a developer, I want battle reactions to be the first forcing function for the redesign, so that the new contract proves it can express live interrupt-window semantics.
11. As a developer, I want the MCP layer to expose one coherent action-tool family rather than separate creature and battle feature silos, so that consumers do not need special-case orchestration for different combat phases.
12. As a developer, I want the redesign to preserve the current “no fake generic action” rule, so that the system still exposes semantic actions rather than plumbing events.
13. As a developer, I want the action surface to remain grounded in authoritative owned state, so that no action token appears only because a coarse resource guard passed.
14. As a developer, I want the design to support future battle-scoped semantic actions beyond reactions, such as other trigger-window or interrupt-bound actions, so that this redesign is not reaction-specific.
15. As a developer, I want battle and creature action projection to share a common contract but not forced duplicate state, so that the architecture remains reliable over time.
16. As a test author, I want deterministic tests that prove reaction tokens appear only in real battle windows, so that supported action discovery is validated at the external behavior level.
17. As a test author, I want end-to-end tests that prove a discovered battle reaction token can be resolved and executed through the supported action contract, so that the new product seam is exercised fully.
18. As a maintainer, I want future semantic action work such as `USE_INDOMITABLE`, `USE_OVERCHANNEL`, and `USE_SNEAK_ATTACK` to have a clear home when they depend on battle-owned trigger state, so that ownership decisions remain consistent.

## Implementation Decisions

- One unified supported action family will replace the implicit creature-only assumption behind the current action surface.
- The action contract should become explicitly scope-aware. A supported action must declare whether it is creature-scoped or battle-scoped.
- Creature-scoped and battle-scoped actions should continue to share the same product vocabulary:
  - query for available actions
  - resolve user-facing holes
  - execute the resolved token
- Token scope is a contract property, not an adapter inference. Consumers should not have to guess which engine a token belongs to.
- The authoritative legality source remains whatever machine owns the state:
  - creature-scoped actions project from creature-owned state and guards
  - battle-scoped actions project from battle-owned state and interrupt windows
- Battle-scoped reaction tokens must project from owned battle trigger windows such as `awaitCtx`, including named legal reactions already carried by the battle model.
- The redesign must not duplicate battle trigger state into creature state just to satisfy the existing action pipeline.
- The redesign must not create a permanently separate battle-only action product with divergent token naming, grouping, or execution semantics.
- Migration should be staged:
  - first define the generalized action contract
  - then adapt the current creature action pipeline to it
  - then add battle-scoped discovery/execution
  - then land the first battle reaction tokens
- Resolved tokens remain semantic user-facing commands, not raw machine events.
- Execution routing should be based on token scope and active engine ownership, not on ad hoc event-type checks.
- MCP should evolve toward one coherent tool family over the unified contract, even if the implementation temporarily routes to different underlying actors during migration.
- Battle reactions are the first required battle-scoped actions:
  - `USE_UNCANNY_DODGE`
  - `USE_CUTTING_WORDS`
  - later candidates can include other named hit/damage/spell reactions once their windows are modeled
- The redesign should preserve the current rule that no semantic token is exposed unless:
  - legality is owned by current authoritative state
  - execution is fully wired end-to-end
  - tests cover both discovery and execution
- The design should treat current `available-actions.ts` as a migration source, not as the permanent boundary. The generalized surface may reorganize modules if that yields a deeper, more stable core abstraction.
- The generalized surface should be designed so future trigger-window work, including battle-owned coarse-guard fixes, does not require inventing another product/API seam.

## Testing Decisions

- Good tests must validate external behavior of the action surface, not internal helper structure.
- The most important new tests are:
  - battle-scoped action discovery tests that prove tokens appear only in live legal windows
  - end-to-end execution tests that prove a resolved battle token executes through the supported action contract and changes authoritative state
  - negative tests that prove no reaction token appears when only coarse resource availability exists
- Creature action regression tests should stay in place during migration to prove the unified surface does not break the existing supported creature catalog.
- Battle deterministic scenario tests remain prior art for proving the trigger-window legality that battle-scoped tokens will project from.
- MCP/server integration tests should cover the unified tool behavior from a consumer perspective, including discovery grouping and successful execution.
- Where battle semantics change, Tier 1 battle MBT remains part of verification because battle-owned legality is authoritative.
- Where the redesign changes only product routing and projection over already-owned battle semantics, focused unit/integration tests should lead, with MBT reserved for actual semantic shifts.

## Out of Scope

- Do not expose reaction tokens through the current creature-only surface by duplicating trigger state.
- Do not add fake generic tokens such as bare `USE_REACTION`.
- Do not redesign unrelated transcript or audio pipeline work here.
- Do not solve every future blocked semantic action in this PRD; the first forcing function is battle-scoped reactions.
- Do not require one giant rewrite that replaces every existing creature-action module in one step.
- Do not rank actions by tactical value or confidence.
- Do not add UI-only helper state to battle or creature models.

## Further Notes

- This PRD is downstream of [battle/PRD-reaction-eligibility.md](battle/PRD-reaction-eligibility.md). That PRD solved authoritative battle ownership of reaction legality. This PRD solves how the supported action product consumes that ownership.
- This PRD also extends the deferred reaction work in [plans/available-actions.md](plans/available-actions.md). That plan correctly identified missing owned trigger state as a blocker. The remaining blocker is now the product/API seam between battle-owned trigger windows and the supported action surface.
- The preferred implementation style is a foundational redesign with migration, not a permanent split into separate creature and battle action products.
