# Plan: Unified Action Surface Across Creature and Battle Scopes

> Source PRD: [PRD_UNIFIED_ACTION_SURFACE.md](../PRD_UNIFIED_ACTION_SURFACE.md)

## Architectural decisions

Durable decisions that apply across all phases:

- **One product surface**: the supported action product remains one conceptual surface across discovery and execution. The redesign must not create a permanent separate battle-only action product.
- **Explicit scope**: supported actions are scope-aware. The contract must distinguish creature-scoped actions from battle-scoped actions.
- **Authoritative ownership**: legality projects from the state that truly owns it:
  - creature-scoped actions from creature-owned state
  - battle-scoped actions from battle-owned state and interrupt windows
- **No duplicate trigger state**: battle trigger windows such as reaction legality must not be copied into creature state just to satisfy the current action-query pipeline.
- **Semantic tokens only**: the unified surface continues exposing semantic user-facing actions, not raw machine events or generic plumbing actions.
- **Stable grouping model**: action grouping remains by resource cost (`action`, `bonusAction`, `reaction`, `free` / movement-style free actions) across both scopes.
- **Shared contract, staged migration**: the current creature action surface is a migration source. The redesign should generalize the contract first, then adapt creature and battle implementations onto it.
- **Battle reactions first**: battle-scoped semantic reactions are the first forcing function for the generalized surface because they require live interrupt-window ownership.
- **Parity boundary**: if battle semantics change, Quint and battle runtime must stay aligned and Tier 1 battle MBT remains the correctness check.

---

## Phase 1: Generalized Action Contract

**User stories**: 1, 3, 4, 6, 7, 8, 9, 15

### What to build

Define the unified supported action contract so the product can represent both creature-scoped and battle-scoped actions without changing its basic user-facing workflow. This phase should establish the shared token language, explicit scope model, and execution-routing contract while preserving the current creature action behavior end to end.

### Acceptance criteria

- [x] The supported action contract can represent both creature-scoped and battle-scoped actions.
- [x] Token scope is explicit in the contract rather than inferred from adapter logic.
- [x] The current creature-scoped action surface still behaves correctly through the generalized contract.
- [x] Discovery, resolution, and execution remain one coherent product flow from the consumer perspective.
- [x] Regression tests prove the creature action surface still works after the contract generalization.

### Phase 1 notes

- The public supported action contract is now explicitly scope-aware:
  - query tokens now include `scope`
  - resolved execute tokens now include `scope`
- The current creature pipeline is preserved as `scope: "creature"` throughout the existing supported action surface.
- The resolved-token schema can now represent both:
  - creature-scoped semantic actions
  - battle-scoped placeholders for future routing work
- Battle-scoped execution is intentionally not implemented yet in the creature pipeline; creature resolution now rejects battle-scoped tokens explicitly instead of relying on implicit assumptions.
- This phase kept the action registry authoring model stable. Existing creature action specs still build unscoped internal tokens, and the public contract adds creature scope at the boundary.
- Verification passed:
  - `pnpm --filter @dnd/core typecheck`
  - `pnpm --filter @dnd/mcp exec tsc --noEmit`
  - `pnpm --filter @dnd/core exec vitest run src/available-actions.test.ts`
  - `pnpm --filter @dnd/mcp test -- server.test.ts`

### Next implementation notes

- Phase 2 should keep the explicit scope model but move the runtime/tool boundary onto it, rather than hardcoding creature-machine execution assumptions in MCP.
- The next slice should preserve the current tool family while introducing scope-aware routing inputs and result handling.
- Do not add battle discovery yet in Phase 2. First make the tooling/runtime seam capable of carrying a battle-scoped token to the correct engine.

---

## Phase 2: Unified Tooling and Runtime Routing

**User stories**: 4, 6, 7, 8, 9, 11, 15

### What to build

Extend the runtime and MCP/tooling boundary so the unified action contract can route execution to the correct authoritative engine. This phase should make the supported action tools capable of serving both creature and battle contexts without forcing consumers to learn separate tool families or product vocabularies.

### Acceptance criteria

- [x] The runtime can route resolved supported actions to the correct authoritative engine based on token scope.
- [x] The MCP/tool surface remains coherent while supporting both creature and battle-backed actions.
- [x] Existing creature-scoped action discovery and execution continue to work through the updated tooling boundary.
- [x] The design does not require battle trigger state to be re-derived or stored in the adapter layer.
- [x] Integration tests prove the updated tool/runtime contract still works for creature-scoped actions.

### Phase 2 notes

- The MCP/runtime seam is now host-scoped rather than implicitly creature-scoped:
  - `handleToolCall` accepts a supported action host
  - the host carries the authoritative execution scope (`creature` or `battle`)
- The current creature path remains intact, but it now runs through the generalized routing layer rather than direct creature-only assumptions.
- The MCP server entrypoint now boots a creature host instead of handing a raw creature actor to the tool adapter.
- Battle hosts are now first-class at the tooling boundary:
  - `get_state` returns a battle runtime summary
  - `get_available_actions` returns an empty grouped result until battle discovery lands
  - `execute_action` routes battle-scoped tokens to a dedicated battle execution lane
- Scope mismatches are now explicit product errors rather than accidental routing through the wrong engine.
- This phase deliberately did not add battle action discovery or battle execution semantics yet. It only made the tool/runtime seam scope-aware and battle-capable.
- Verification passed:
  - `pnpm --filter @dnd/core typecheck`
  - `pnpm --filter @dnd/mcp exec tsc --noEmit`
  - `pnpm --filter @dnd/mcp test -- server.test.ts`

### Next implementation notes

- Phase 3 should keep using the new battle host and tool family rather than introducing a parallel battle-only MCP surface.
- The next slice is battle-scoped discovery, not battle execution:
  - project semantic battle actions from authoritative `BattleContext`
  - keep `execute_action` minimal until at least one discovered battle token exists
- The first discovered battle tokens should come from already-owned battle windows, not from coarse battle resources or inferred trigger state.
- Prefer one narrow discovery family first, likely live reaction windows, so discovery and execution can meet on a real end-to-end token in Phase 4.

---

## Phase 3: Battle-Scoped Action Discovery

**User stories**: 1, 2, 5, 8, 10, 14, 15, 16

### What to build

Add battle-scoped action discovery on top of the unified contract. This phase should project semantic battle actions from authoritative battle state, including live interrupt windows, but it does not yet need to land every battle action family. The important result is that the supported action product can now surface battle-window actions honestly from battle-owned state.

### Acceptance criteria

- [x] Battle-scoped actions can be discovered through the unified action surface.
- [x] Battle-scoped discovery projects from authoritative battle state rather than parallel query-only state.
- [x] Live interrupt windows can produce semantic battle-scoped action tokens.
- [x] No battle-scoped action is suggested solely from coarse resource availability.
- [x] Deterministic tests prove battle-scoped discovery reflects the actual battle window state.

### Phase 3 notes

- Battle discovery is now live for authoritative hit and damage reaction windows owned in `BattleContext.awaitCtx`.
- The unified action contract had to become actor-scoped for battle tokens:
  - battle discovery now returns semantic tokens with `scope: "battle"` and `actorId`
  - this is required because a single battle host can surface legal reactions for multiple responders at once
- Battle discovery currently projects only from owned named reaction legality on:
  - `PIAttackHit`
  - `PIAttackDamage`
- The first discovered semantic battle tokens are:
  - `CAST_SHIELD`
  - `USE_PARRY`
  - `USE_CUTTING_WORDS`
  - `USE_UNCANNY_DODGE`
  - `USE_DEFLECT_ATTACKS`
- Discovery intentionally remains narrow:
  - no battle action is surfaced outside a live interrupt window
  - no discovery yet for spell-cast, save-failed, movement, legendary, or ready windows
- MCP battle hosts now surface those discovered reaction tokens through the same `get_available_actions` tool family.
- Verification passed:
  - `pnpm --filter @dnd/core typecheck`
  - `pnpm --filter @dnd/core exec vitest run src/available-actions.test.ts`
  - `pnpm --filter @dnd/mcp exec tsc --noEmit`
  - `pnpm --filter @dnd/mcp test -- server.test.ts`

### Next implementation notes

- Phase 4 should execute the first discovered battle token end to end rather than broadening discovery further.
- The cleanest first execution slice is `USE_UNCANNY_DODGE`:
  - already discovered
  - zero user-facing holes
  - no engine-owned numeric parameter beyond the existing battle semantics
  - maps directly to `BATTLE_RESOLVE_DMG_REACTION`
- Phase 4 should treat `actorId` as the authoritative responder selector for battle execution tokens.
- After the first zero-hole battle token works end to end, the next likely follow-up token is `CAST_SHIELD`, because it also has no user-facing holes and already uses owned battle legality.

---

## Phase 4: First Battle Reaction Tokens

**User stories**: 2, 5, 8, 10, 12, 13, 16, 17

### What to build

Land the first semantic battle-scoped reaction actions through the unified action surface. This phase should use the already-owned battle reaction legality to expose at least one honest reaction token, resolve it through the shared product contract, and execute it against authoritative battle state end to end.

### Acceptance criteria

- [x] At least one semantic reaction token is exposed through the unified action surface.
- [x] The reaction token appears only when the corresponding legal battle trigger window exists.
- [x] Executing the resolved reaction token updates authoritative battle state correctly.
- [x] Negative tests prove the token does not appear when only coarse reaction resources are available.
- [x] End-to-end tests cover battle-scoped discovery, resolution, and execution for the first reaction token.

### Phase 4 notes

- `USE_UNCANNY_DODGE` is now the first fully wired battle-scoped semantic reaction token.
- The end-to-end path now exists through the unified action surface:
  - battle discovery exposes the token only in a real `PIAttackDamage` window
  - core battle resolution validates the token against current authoritative battle discovery
  - MCP routes the resolved token to the battle engine and returns updated battle state
- `actorId` is now the authoritative responder selector for battle execution, not just battle discovery.
- This phase kept the runtime scope intentionally narrow:
  - `USE_UNCANNY_DODGE` executes end to end
  - other discovered battle reaction tokens still return an explicit not-implemented error instead of silently doing nothing
- Verification passed:
  - `pnpm --filter @dnd/core typecheck`
  - `pnpm --filter @dnd/core exec vitest run src/available-actions.test.ts`
  - `pnpm --filter @dnd/mcp exec tsc --noEmit`
  - `pnpm --filter @dnd/mcp test -- server.test.ts`

### Next implementation notes

- Phase 5 should broaden battle execution by adding the next zero-hole reaction token on the same path.
- The best next target is `CAST_SHIELD`:
  - already discovered
  - already battle-owned and honest
  - no user-facing holes
  - a good second tracer bullet for battle hit-reaction execution
- After `CAST_SHIELD`, the next candidates are:
  - `USE_CUTTING_WORDS`
  - `USE_PARRY`
  - `USE_DEFLECT_ATTACKS`
- Those later reactions will need engine-owned numeric runtime inputs or owned fixed capability values, so `CAST_SHIELD` is the cleanest immediate continuation.

---

## Phase 5: Broader Battle-Scoped Semantic Actions

**User stories**: 1, 3, 8, 11, 14, 15, 18

### What to build

Expand the proven unified action surface beyond the first battle reaction token into a durable home for additional battle-scoped semantic actions. This phase should use the now-proven contract to absorb other interrupt-window or battle-owned semantic actions without introducing another product/API seam.

### Acceptance criteria

- [x] The unified action surface can support more than one class of battle-scoped semantic action.
- [x] Additional battle-scoped semantic actions reuse the same scope-aware contract and routing path.
- [x] The action surface remains coherent from the consumer perspective across creature and battle scopes.
- [x] The design leaves no need for a separate permanent battle-only action product.
- [x] Regression tests prove creature-scoped and battle-scoped actions coexist safely in the unified surface.

### Phase 5 notes

- The unified action surface now supports battle-scoped actions across more than one interrupt family:
  - damage reaction execution with `USE_UNCANNY_DODGE`
  - hit reaction execution with `CAST_SHIELD`
- Both battle tokens reuse the same architectural path:
  - battle discovery from authoritative `awaitCtx`
  - actor-scoped battle resolved token
  - core battle resolution
  - MCP routing to the battle machine
- This confirms the redesign does not need a separate permanent battle-only action product. The same tool family now handles:
  - creature discovery/execution
  - battle discovery
  - battle execution for the first two semantic reaction tokens
- The contract remains coherent from the consumer side:
  - one `get_available_actions`
  - one `execute_action`
  - explicit `scope`
  - explicit `actorId` only when multi-responder battle state makes it necessary
- Verification passed:
  - `pnpm --filter @dnd/core typecheck`
  - `pnpm --filter @dnd/core exec vitest run src/available-actions.test.ts`
  - `pnpm --filter @dnd/mcp exec tsc --noEmit`
  - `pnpm --filter @dnd/mcp test -- server.test.ts`

### Next implementation notes

- The next honest extensions on this same surface are the remaining discovered battle reactions:
  - `USE_PARRY`
  - `USE_CUTTING_WORDS`
  - `USE_DEFLECT_ATTACKS`
- Recommended implementation order:
  1. `USE_PARRY`
     - no user-facing holes
     - fixed bonus already owned in battle state
  2. `USE_CUTTING_WORDS`
     - runtime-owned Bardic Inspiration die roll
  3. `USE_DEFLECT_ATTACKS`
     - runtime-owned reduction amount
- The foundational unified-action-surface redesign itself is now proven. Follow-on work is breadth on top of the established contract, not another architecture phase.
