# Play Session migrations

Design and testing seam agreed through grill-me and to-spec. Implementation
is not claimed.

## Problem Statement

A player can lose the ability to continue a saved game after a catalog correction
or internal representation change. Reconstructing recorded commands with the
latest handlers may require choices that were never recorded. The demonstrated
case in #610 is a saved Cleric whose corrected equipment bundle introduces new
loadout choices and prevents its recorded battle from starting.

The operator needs simple, predictable upgrades without historical gameplay
branches, user-request migrations, or unbounded storage costs.

## Solution

Persist canonical continuation state and upgrade all saved Play Sessions during
a maintenance deployment, before opening the latest runtime to traffic. Keep
only latest-version contracts in the serving application. Investigate ambiguous
conversions and recovery incidents ad hoc with AI assistance and operator
approval. Check battle histories through replay with original recorded rolls.

## User Stories

1. As a player, I want my saved character to remain usable after an update, so that I can continue playing.
2. As a player, I want an active battle to resume at its saved point, so that an update does not restart my encounter.
3. As a player, I want my recorded rolls reused during replay, so that verification does not change my luck.
4. As a player, I want spent resources retained, so that updating the server does not reset my game.
5. As a player, I want accepted pending inputs preserved, so that interrupted actions can continue.
6. As a player, I want updates completed before I reconnect, so that my request does not trigger a migration.
7. As an operator, I want one serving format and gameplay implementation, so that historical branches do not accumulate.
8. As an operator, I want existing compatibility readers removed, so that they do not remain a maintenance burden.
9. As an operator, I want all saves converted before traffic resumes, so that the runtime never serves a partially migrated database.
10. As an operator, I want missing data reported for ad hoc resolution, so that the system does not silently invent past choices.
11. As an operator, I want AI to propose concrete repairs for my approval, so that exceptional cases do not require a generic migration service.
12. As an operator, I want rollback decisions made ad hoc, so that automated recovery cannot silently discard subsequent gameplay.
13. As an operator, I want complete save and deployment disk usage measured, so that upgrades fit the available storage.
14. As a maintainer, I want one current snapshot per session, so that full state is not duplicated for every action.
15. As a maintainer, I want catalog references reused, so that each save does not contain a copied catalog.
16. As a maintainer, I want existing recovery and replay checks reused, so that verification stays small and focused on observable behavior.

## Implementation Decisions

- The rules authority remains SRD 5.2.1. Supported evolution covers feature
  additions and internal representations. Incorrect assumptions receive explicit
  ad hoc operator decisions.
- Canonical continuation state becomes the persistence authority. Retained
  history supports replay; it must not silently reinterpret the saved current
  game under changed handlers.
- Measure the complete restorable encoding before settling its storage budget.
  Store one current snapshot per session and reference shared catalog content.
  Account for replay history, temporary conversion files, SQLite journal/WAL,
  and any backup. Avoid unbounded copies.
- Remove historical-format readers, historical command-admission branches and
  obsolete compatibility-only tests from the serving application. This does
  not authorize deleting saved games or dropping current behavior safeguards.
- Stop admission, finish in-flight operations, stop writers, convert all saves,
  validate the target representation, then open the latest runtime to traffic.
  A deployment lock alone does not stop application writes.
- Include active battles in deployment-time conversion. Do not finish battles
  under old behavior or migrate when a user requests data.
- Keep source-format conversion in release-specific deployment tooling outside
  the serving runtime. Materialize the initial snapshots with the proven source
  implementation before removing command-based reconstruction.
- Preserve Battle Runtime ownership and exact reaction/interrupt continuation.
  Procedure requests remain derived. Preserve session ownership, random-source
  state and accepted-input cancellation protections.
- Missing information or ambiguous semantics stop the conversion for ad hoc
  investigation. AI may propose filling choices or repair code; the operator
  approves concrete decisions. No special pending-migration workflow for players.
- Handle failed upgrades and rollback ad hoc. Do not automatically restore a
  pre-upgrade database after players have made further progress.
- Keep format identity explicit, but do not claim a version number or successful
  replay proves unchanged semantics. No universal schema fingerprint or semantic
  state-diff enforcement framework is part of this scope.

## Testing Decisions

Agreed primary seam: the existing MCP recovery
protocol boundary backed by SQLite, with the deployment converter invoked while
the application is stopped. Persist a game through MCP, convert it, reopen the
application, and continue it through MCP. Exercise the actual converter rather
than mocking conversion or inspecting private implementation fields.

Reuse the existing restart/recovery protocol coverage, including continuation
through reaction and damage frontiers, and the existing recorded-roll replay
coverage. Extend at that boundary rather than creating a parallel test harness.
Check externally observable continuation and ownership, conversion failure
preventing readiness, and reuse of original recorded rolls.

Replay available recorded battle histories without fresh random rolls. Treat
replay failures or unavailable historical inputs as ad hoc investigation, not
permission to fabricate history. Replay is useful execution evidence, not a
universal proof of identical historical outcomes.

Measure actual full encoding and conversion disk costs. Sampled projections do
not establish a complete save budget. Use focused existing checks; do not build
a new fact-by-fact migration verification system or introduce unjustified broad
verification stages. Existing applicable acceptance obligations remain in force.

## Out of Scope

- Request-time migration, parallel historical gameplay, and old-format serving.
- Zero-downtime expand-contract deployment or dual writes.
- A general AI migration service, automatic invented player choices, or special
  player-facing migration-choice UI.
- Automatic rollback/restore policy or a generic semantic state-diff framework.
- Fresh rolls during replay or promises to recover missing historical truth.
- Rules changes beyond SRD 5.2.1, plugin listing/Skill changes, publication,
  npm release, or deployment as part of specification authoring.
- The separately deferred dice-recovery work in #612; this spec does not claim
  that missing historical samples have been recovered.

## Further Notes

This specification addresses the design decision raised by #610. The existing
MCP recovery documentation owns implemented persistence behavior; accepted
continuation and derived-request ADRs still apply. Update those implementation
owners when the feature ships, without duplicating their contracts here.

An illustrative exceptional case is newly supported druid mechanics requiring
form choices absent from a save. AI proposes concrete choices, the operator
approves them, and that migration fills the data before traffic resumes.

No runtime implementation, production rollout, or migration qualification is
claimed by publishing this specification.
