# Disposition — compulsion

**Session:** 2026-04-16 (batch apply_condition digest, tick 2)
**Outcome:** surface_widening_landed (partial encoding)

## Landed widenings

- `TargetSelection.mode = "any_number"` — unbounded open selection. Pressure: "Each creature of your choice within range" with no numeric cap. Shared with Beacon of Hope and Divine Word (DEFERRED §A8, now resolved).

## Notes

Core WIS-save → Charmed + concentration 1 minute authors cleanly against the widened surface. Sub-agent's `Condition: charmed` and `Effect: apply_condition` proposals were stale (both already on the surface from the prior digest).

**Partial encoding.** The ongoing Bonus-Action-directed-movement rider is omitted — it needs two pieces we don't have:
1. A caster-activated per-turn ongoing operation atom (existing `OngoingOperation` variants are passive: roll modifiers or damage-on-hit riders).
2. A movement-triggered repeat-save cadence. Current `RepeatSaveSpec.cadence` is `end_of_target_turn`; Compulsion's repeat save fires "after moving in this way" — a new cadence variant distinct from both end-of-turn (DEFERRED §A9 sibling) and on-damage.

**DM agenda** per ARCHITECTURE.md §1: "that you can see", "safest route", "horizontal direction", "as much of its movement as possible". Spatial + perception resolution is caller-owned.

## Artifacts

- `packages/prototype-content-surface/content/compulsion.dhall`
- `packages/prototype-content-surface/content/compulsion.json`
- Verdict: `./verdict.json`
- Original sub-agent proposal: `./proposal.md`
