# PRD: Character Draft Editability And Change Preview

Date: 2026-04-13

Status: Draft

Owner: Core / character-domain UX architecture

## Problem Statement

The repo now supports editing canonical `CharacterDraft` state, but destructive upstream edits can silently invalidate later authored choices.

Today:

- `applyCharacterDraftUpdate()` computes the next draft and sanitizes dependent invalid state;
- callers can assess the resulting draft after the fact;
- there is no first-class domain operation that previews the consequences before mutation is accepted;
- there is no explicit domain contract for which authored facts were dropped, which required choices reopened, or which new illegal issues were introduced.

From the user's perspective, this is not good enough. If a user changes an earlier authored choice such as class, background, species, or advancement, the system should explain the downstream impact before committing the change.

## Solution

Introduce explicit draft-edit impact semantics with mandatory preview before destructive draft mutations are committed.

The system should support this flow:

1. start from stored current draft state;
2. request a proposed change;
3. compute the candidate next draft and the impact of the change;
4. show the user what would be lost, reopened, or newly invalid;
5. commit the update only after explicit acceptance.

This PRD does not require full undo/redo or checkpoint history. It requires preview-of-loss and deliberate commit boundaries.

## User Stories

1. As a user, I want to change an earlier authored choice without immediately committing it, so that I can understand the consequences first.
2. As a user, I want the system to tell me which later authored choices would be dropped if I accept a change, so that destructive edits are explicit rather than silent.
3. As a user, I want the system to tell me which required choices would reopen after a change, so that I understand the new holes I will need to fill.
4. As a user, I want the system to tell me which illegal issues would newly appear after a change, so that I can distinguish missing work from newly contradictory state.
5. As a user, I want the system to show me the candidate next draft before commit, so that I can review the resulting authored state as a whole.
6. As a user, I want to accept or reject the previewed change explicitly, so that the system does not mutate my stored draft without consent.
7. As a user, I want changing one authored fact to preserve unrelated later choices whenever they remain valid, so that the system respects prior intent instead of erasing everything downstream.
8. As a developer, I want preview-of-loss to be a core-domain operation rather than a page-local behavior, so that app and MCP surfaces share the same authored-edit semantics.
9. As a developer, I want preview-of-loss to describe changes in canonical domain language, so that later surfaces do not invent their own interpretation of what was lost or reopened.
10. As a developer, I want commit to remain separate from preview, so that destructive edits are always deliberate.
11. As a developer, I want rollback and checkpoints to remain explicitly deferred for now, so that the first slice stays focused and honest.
12. As a maintainer, I want the deferred rollback/checkpoint path called out explicitly in the docs, so that future work does not rediscover the same open question from scratch.

## Implementation Decisions

- The repo should add a first-class preview operation for draft edits instead of relying only on post-change sanitization.
- Preview is mandatory before commit for any draft update that can drop authored state or reopen required choices.
- Preview should compute, at minimum:
  - the candidate next `CharacterDraft`;
  - authored facts that would be dropped;
  - open choices that would newly appear or remain open;
  - illegal issues that would newly appear or remain.
- The core semantic source remains the canonical current draft plus the candidate next draft. The preview API should expose the difference in a stable, domain-language form rather than forcing every caller to diff raw JSON ad hoc.
- `applyCharacterDraftUpdate()` as it exists today remains useful as the canonical “compute the sanitized next draft” operation, but it is not sufficient as the final user-facing mutation boundary.
- Commit must be a separate step after preview acceptance.
- The first slice does not add rollback, undo, redo, or checkpoints.
- The docs must record rollback/checkpoints as intentional future work rather than leaving that expectation ambiguous.

## Testing Decisions

- A good test asserts externally visible editability behavior: what preview reports, what commit changes, and what remains unchanged when the preview is rejected.
- Tests should focus on domain outcomes, not UI mechanics.
- The first tests should cover:
  - changing primary class and seeing reopened advancement-related holes before commit;
  - changing background and seeing invalidated background-derived authored choices before commit;
  - changing species and seeing species-specific choice loss before commit;
  - preserving unrelated later choices when they remain valid;
  - refusing to mutate stored draft state during preview;
  - mutating stored draft state only after acceptance.
- Prior art should come from the existing character-domain tests that already verify selective sanitization and open-choice versus illegal-issue behavior.

## Out of Scope

- Full undo/redo.
- Checkpoints or versioned draft sessions.
- Multi-user collaboration semantics.
- UI-specific rendering details.
- MCP transport details beyond the fact that preview and commit must stay distinct.

## Further Notes

- TODO for later: checkpoint and rollback semantics over stored draft state.
- The preview contract should be designed so that future rollback/checkpoint features can build on it instead of replacing it.
- This PRD is about authored editing semantics, not about workflow page navigation.
