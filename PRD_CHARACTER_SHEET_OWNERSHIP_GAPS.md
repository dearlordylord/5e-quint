# PRD: Character Sheet Ownership Gaps

Date: 2026-04-13

Status: Draft

Owner: Core / character architecture

## Problem Statement

The repo has landed the canonical `CharacterDraft` / `CharacterSheet` boundary and the formal character-side projection boundary, but a small number of ownership gaps and migration leftovers remain.

These gaps matter because they blur the line between:

- authored facts that belong on the character side;
- runtime projections that should only consume those authored facts;
- stale helper structure that no longer matches the current ownership model.

If these gaps are left undocumented, later work risks:

- normalizing placeholder projection behavior as if it were complete;
- keeping stale validators alive after their owned data moved elsewhere;
- adding new adapter or projection workarounds instead of fixing the missing authored owner directly.

## Solution

Document and close the remaining character-sheet ownership gaps explicitly.

This PRD covers two initial categories:

- **stale ownership leftovers** that should be removed or rewritten to match the current architecture;
- **missing authored sheet facts** that currently force placeholder projection behavior.

## User Stories

1. As a developer, I want stale side-channel validators removed once their owned facts move elsewhere, so that the codebase reflects one clear semantic owner.
2. As a developer, I want projection-relevant authored choices to exist on `CharacterDraft` / `CharacterSheet` before projection, so that runtime layers do not carry placeholder data for missing authored facts.
3. As a developer, I want the remaining ownership gaps documented explicitly, so that follow-on tasks are architectural completion work rather than archaeology.
4. As a tester, I want ownership-gap fixes to be regression-covered through the canonical domain and projection APIs, so that cleanup does not reintroduce parallel owners.
5. As a maintainer, I want the repo to use the same domain language through Quint and TypeScript, so that missing authored state is solved at the character boundary rather than papered over downstream.

## Implementation Decisions

- The repo should distinguish cleanup work from missing-semantics work.
- The initial cleanup gap is **subclass validation residue**:
  - subclass ownership used to live in a draft-side side channel;
  - it now lives in ordered `advancement` entries;
  - legality is now owned by advancement replay;
  - any remaining stub validator should be removed or rewritten to reflect that current owner.
- The initial missing-semantics gap is **Fighting Style authored ownership**:
  - projection currently exposes `fightingStyles`;
  - both TypeScript and Quint currently project an empty set because the character side does not yet own Fighting Style selections;
  - the correct fix is to add authored character-side ownership, validation, sanitization, and projection for those choices rather than teaching runtime or adapters to guess.
- The second missing-semantics gap is **expertise ownership**:
  - projection currently exposes `expertiseSkills`;
  - both TypeScript and Quint currently project the empty set;
  - unlike Fighting Style, this gap is currently under-documented in code comments and planning artifacts even though the projection shape already anticipated it;
  - the correct fix is to add explicit character-side ownership and derivation for expertise-granting class features rather than leaving the projection field permanently placeholder-shaped.
- Ownership-gap work should prefer changing the character-side model and its formal mirror directly rather than adding projection-side registries or adapter-side patches.

## Testing Decisions

- A good test proves that authored ownership moved or was added in the canonical place and that downstream projections now consume it without extra adapters.
- Cleanup tests should verify that subclass legality still surfaces correctly through advancement replay and assessment after any dead helper path is removed.
- Fighting Style tests should verify:
  - authored choice persistence on draft/sheet;
  - class-level legality and timing;
  - sanitization when upstream choices invalidate the selection;
  - projection into character-creature/runtime surfaces;
  - Quint parity where applicable.
- Expertise tests should verify:
  - explicit character-side ownership or derivation of expertise-granting class features;
  - class-level legality and timing where relevant;
  - projection into `expertiseSkills`;
  - parity where the expertise fact crosses the formal boundary.

## Out of Scope

- General backlog capture for every possible future character feature.
- MCP-specific transport design.
- UI-specific rendering details.
- Non-SRD content expansion.

## Further Notes

- This document is intentionally narrow. It exists to prevent “temporary” ownership gaps from becoming permanent architecture.
- Future gaps of the same kind should be added here only if they are true character-side ownership problems, not general feature backlog items.
- At the moment, both Fighting Style and expertise are in the same architectural category: projection fields that already exist, but whose authored owners have not yet been completed on the character side.
