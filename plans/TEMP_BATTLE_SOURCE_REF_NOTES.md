# Temporary Battle Source Ref Notes

This note snapshots the review findings and follow-up direction discussed during
the surface-runtime-correction walkthrough.

## Current Fixes And Follow-Ups

1. `SRC8` left a temporary architectural compromise in `core`.
   The bounded `acid_splash` integration works, but it still routes through
   `projected-compiler.ts` / `projected-executable.ts` /
   `projected-action-bridge.ts` instead of landing the correction pattern
   directly.

2. That temporary bridge must be removed, not normalized.
   `ACTIVE_PLAN.md` now contains `SRC9`, which explicitly requires replacing the
   migrated branch with direct correction-pattern code and forbids preserving
   the projected bridge as the steady-state architecture.

3. `packages/surface-runtime-correction/README.md` was stale.
   It now states that one bounded core integration already landed and that the
   remaining follow-up is to remove the temporary projected bridge from that
   migrated path.

4. `RuntimeUnitAccess.ownerId` + `RuntimeUnitAccess.sourceKind` is a weak model.
   It names a real domain distinction but still allows contradictory states.

5. `characterSheet` vs `statBlock` must remain first-class domain language.
   This distinction is not just an implementation detail; it is a real
   source-to-battle projection boundary.

6. That distinction should not be modeled as a parallel field pair.
   The better direction is one qualified source reference value rather than
   separate `ownerId` and `sourceKind` fields.

7. A closed typed isomorphism fits this source boundary well.
   Since the source partition is stable and closed, a qualified ref such as
   `characterSheet:...` / `statBlock:...` is a good fit, with helpers for
   construction and narrowing.

8. The concept is broader than `RuntimeUnitAccess`.
   It belongs to the battle projection boundary more generally, not just to the
   unit wrapper.

9. The preferred concept name is `BattleSourceRef`.
   It reads better than `RuntimeOwnerRef` and matches the architecture language
   around source-specific projectors and battle-facing projections.

10. Unit access likely also needs a concrete `accessId`.
    This mirrors the same split already present in core spell access:
    - authored identity: `unit.id`
    - projection/source identity: `BattleSourceRef`
    - runtime/access-path identity: `accessId`

11. Unit resource state should key by `accessId`, not `unit.id`.
    Otherwise distinct runtime access paths to the same authored unit collapse
    incorrectly.
