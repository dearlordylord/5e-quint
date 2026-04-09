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

- [ ] The runtime can route resolved supported actions to the correct authoritative engine based on token scope.
- [ ] The MCP/tool surface remains coherent while supporting both creature and battle-backed actions.
- [ ] Existing creature-scoped action discovery and execution continue to work through the updated tooling boundary.
- [ ] The design does not require battle trigger state to be re-derived or stored in the adapter layer.
- [ ] Integration tests prove the updated tool/runtime contract still works for creature-scoped actions.

---

## Phase 3: Battle-Scoped Action Discovery

**User stories**: 1, 2, 5, 8, 10, 14, 15, 16

### What to build

Add battle-scoped action discovery on top of the unified contract. This phase should project semantic battle actions from authoritative battle state, including live interrupt windows, but it does not yet need to land every battle action family. The important result is that the supported action product can now surface battle-window actions honestly from battle-owned state.

### Acceptance criteria

- [ ] Battle-scoped actions can be discovered through the unified action surface.
- [ ] Battle-scoped discovery projects from authoritative battle state rather than parallel query-only state.
- [ ] Live interrupt windows can produce semantic battle-scoped action tokens.
- [ ] No battle-scoped action is suggested solely from coarse resource availability.
- [ ] Deterministic tests prove battle-scoped discovery reflects the actual battle window state.

---

## Phase 4: First Battle Reaction Tokens

**User stories**: 2, 5, 8, 10, 12, 13, 16, 17

### What to build

Land the first semantic battle-scoped reaction actions through the unified action surface. This phase should use the already-owned battle reaction legality to expose at least one honest reaction token, resolve it through the shared product contract, and execute it against authoritative battle state end to end.

### Acceptance criteria

- [ ] At least one semantic reaction token is exposed through the unified action surface.
- [ ] The reaction token appears only when the corresponding legal battle trigger window exists.
- [ ] Executing the resolved reaction token updates authoritative battle state correctly.
- [ ] Negative tests prove the token does not appear when only coarse reaction resources are available.
- [ ] End-to-end tests cover battle-scoped discovery, resolution, and execution for the first reaction token.

---

## Phase 5: Broader Battle-Scoped Semantic Actions

**User stories**: 1, 3, 8, 11, 14, 15, 18

### What to build

Expand the proven unified action surface beyond the first battle reaction token into a durable home for additional battle-scoped semantic actions. This phase should use the now-proven contract to absorb other interrupt-window or battle-owned semantic actions without introducing another product/API seam.

### Acceptance criteria

- [ ] The unified action surface can support more than one class of battle-scoped semantic action.
- [ ] Additional battle-scoped semantic actions reuse the same scope-aware contract and routing path.
- [ ] The action surface remains coherent from the consumer perspective across creature and battle scopes.
- [ ] The design leaves no need for a separate permanent battle-only action product.
- [ ] Regression tests prove creature-scoped and battle-scoped actions coexist safely in the unified surface.
