# PRD: Character MCP Surface

Date: 2026-04-13

Status: Draft

Owner: Core / MCP architecture

## Problem Statement

The repo now has a canonical character domain in core, but it does not yet expose an honest MCP surface for character creation, inspection, finalization, advancement, and projection.

Today:

- core owns `CharacterDraft`, `CharacterSheet`, finalization, advancement, and projection;
- the app has a thin debug-oriented character workflow shell;
- MCP has no equivalent stored character surface and still contains transitional helpers that assume MCP cannot yet accept canonical sheet state directly.

Without a dedicated PRD for the character MCP surface, the repo risks:

- inventing an MCP-only character schema that diverges from the owned core domain;
- forcing callers to resend whole draft/sheet payloads instead of working against stored server-side character state;
- re-deriving or fabricating character facts in the adapter rather than calling core-owned operations;
- repeating the same ownership mistakes the repo has already rejected for monsters, spells, and battle actions.

## Solution

Add a thin stored-server-side MCP character surface that operates on canonical core-owned `CharacterDraft` and `CharacterSheet` records.

The MCP surface should:

- persist server-side draft/sheet records for usability;
- expose narrow operations over those records;
- delegate all legality, finalization, advancement, and projection semantics to the core character domain;
- remain explicitly downstream of Quint/core ownership rather than becoming a parallel product model.

This PRD does not redefine character semantics. It defines the honest public adapter boundary for them.

## User Stories

1. As a user of the MCP server, I want to create a stored draft record, so that I can build a character incrementally without resending the whole draft each time.
2. As a user of the MCP server, I want to inspect the current stored draft, so that I can understand the canonical authored state before making changes.
3. As a user of the MCP server, I want to preview a draft update before committing it, so that destructive edits do not silently erase later authored choices.
4. As a user of the MCP server, I want to apply a previously previewed update only after accepting it, so that the server does not mutate stored state without explicit consent.
5. As a user of the MCP server, I want to assess a stored draft, so that I can see open required choices separately from illegal issues.
6. As a user of the MCP server, I want to finalize a stored draft into a canonical sheet, so that the same owned record can be used downstream without adapter-specific reconstruction.
7. As a user of the MCP server, I want to inspect the finalized sheet, so that I can review the exact owned record that core accepted.
8. As a user of the MCP server, I want to advance a stored finalized sheet through one legal level-up transition at a time, so that higher-level starts and later leveling use the same canonical path.
9. As a user of the MCP server, I want to inspect creature-facing and battle-facing projections of a finalized sheet, so that downstream execution surfaces consume the same owned facts.
10. As a developer, I want the MCP surface to use stored server-side state, so that the adapter is ergonomic without inventing a second source of truth.
11. As a developer, I want MCP operations to call core-owned domain functions directly, so that legality and projection logic do not fork in the adapter.
12. As a developer, I want MCP to store canonical `CharacterDraft` / `CharacterSheet` shapes rather than adapter-owned variants, so that persistence and transport remain aligned with the owned domain.
13. As a developer, I want MCP update operations to remain narrow and semantic, so that the public surface does not devolve into arbitrary raw mutation of internal structures without preview or validation.
14. As a developer, I want stored character records to be serializable and stable, so that MCP sessions can persist them predictably.
15. As a maintainer, I want the MCP character surface to remain clearly secondary to core ownership, so that future work does not accidentally make the adapter the semantic frontier.

## Implementation Decisions

- The primary public MCP unit will be a stored server-side character record, not a full caller-supplied character payload on every request.
- Stored character records must use canonical core-owned `CharacterDraft` and `CharacterSheet` shapes rather than adapter-owned alternate schemas.
- MCP will not become the semantic owner of character legality, finalization, advancement, or projection. It will call the owned core operations.
- The public surface should expose character operations in the same general style as the rest of the MCP adapter: narrow commands over canonical stored state rather than schema forks or bespoke registries.
- The first character MCP slice should include, at minimum:
  - create/load/inspect stored draft state;
  - preview draft update;
  - apply accepted draft update;
  - assess draft;
  - finalize draft;
  - inspect finalized sheet;
  - advance finalized sheet;
  - inspect projections.
- Preview and apply must remain separate operations so destructive edits cannot silently mutate stored draft state.
- The MCP surface should not introduce a second character registry or alternate persistence model detached from the owned domain.
- Character MCP should remain generic and character-domain-oriented. It should not collapse into app-page workflow steps or page-local assumptions.

## Testing Decisions

- A good MCP test asserts externally visible behavior: stored state, returned preview data, returned assessment/finalization/projection outputs, and mutation boundaries.
- Tests should not duplicate core legality math in the adapter. Instead, they should verify that MCP routes stored state through the same core-owned operations and returns the corresponding results.
- The first MCP tests should cover:
  - creating and retrieving a stored draft;
  - previewing a destructive change without mutating stored state;
  - applying an accepted preview and observing the stored mutation;
  - assessing a draft through MCP and seeing open choices separated from illegal issues;
  - finalizing a stored draft;
  - advancing a stored sheet;
  - projecting a finalized sheet.
- Prior art should come from the existing MCP server tests for battle and monster-facing flows, where the adapter remains narrow and core-owned semantics stay below the surface.

## Out of Scope

- Making MCP the canonical owner of player-character facts.
- Inventing an MCP-only character schema.
- Reworking the app workflow shell as part of the first MCP slice.
- Adding rollback/checkpoint history.
- Expanding non-SRD content support.
- Replacing core-owned character semantics with transport-first schemas.

## Further Notes

- This surface is downstream infrastructure, not the main feature. Core-owned character semantics remain the primary design center.
- Stored server-side state is a usability decision, not an ownership decision.
- The adapter should follow the same general ownership discipline already used elsewhere in the repo: if MCP must remember, fabricate, or re-derive a character semantic fact that core could own directly, that is an ownership bug.
