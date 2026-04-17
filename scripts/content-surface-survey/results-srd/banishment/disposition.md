# Disposition — banishment

**Session:** 2026-04-16 (batch apply_condition digest)
**Outcome:** clean (stale proposal)

## Notes

Sub-agent proposed four widenings: `Effect.transport_exile`, `Effect.apply_condition`, `Condition.incapacitated`, and a `creature_type_conditional_expiry` subgraph. The first three are stale — the previous session landed `apply_condition` as an `EffectAtom` (reachable from `save_gate.onFail`) and filled the 15-condition `CONDITIONS` enum, including `incapacitated`. Core mechanics (CHA save → apply Incapacitated + concentration 1 min + slot-scaled target count via `choose_up_to` + `SlotScaling`) author cleanly against the current surface using the Bane precedent.

The remaining proposals are correctly classified as DM agenda per ARCHITECTURE.md §1:
- **Demiplane transport** — location change, caller-owned.
- **"Reappears in the nearest unoccupied space"** — spatial, caller-owned.
- **Creature-type permanent-exile branch** — RAW is explicit: "a random location on a plane (DM's choice)". The creature-type predicate is encodable, but its consequence (DM-picked planar destination) is narrative/GM agenda, so the branch is omitted from the encoding as a whole.

## Artifacts

- `packages/prototype-content-surface/content/banishment.dhall`
- `packages/prototype-content-surface/content/banishment.json`
- Verdict: `./verdict.json`
- Original sub-agent proposal: `./proposal.md`
