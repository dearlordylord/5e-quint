# Disposition — ray_of_sickness

**Session:** 2026-04-16 (batch apply_condition digest)
**Outcome:** clean (stale proposal)

## Notes

Three stale proposals:
- `ApplyConditionEffect` — `apply_condition` is already an `EffectAtom` variant.
- `Condition: poisoned` — `poisoned` is in the 15-condition `CONDITIONS` enum.
- `RiderExpiry: end_of_attacker_next_turn` — not needed; Duration scopes the rider.

Encoded as `activation` family with an `attack_roll` phase. `onHit` is already a `ReadonlyArray<EffectAtom>` (Shocking Grasp precedent: damage + deny_opportunity_attack), so layering damage + apply_condition on hit works directly. The Dhall homogeneous-list constraint is handled with the Optional-fields-unified `HitRider` record type (see `shocking_grasp.dhall` / `protection_from_poison.dhall` templates).

**Turn-scoped expiry modeling.** RAW says Poisoned lasts "until the end of your next turn" — a turn-scoped rider. `apply_condition` has no per-atom expiry field. Per the session convention for turn-scoped riders on attack-roll phases, the spell's Duration is modeled as `timed, 1 round` so the atom's window bounds to approximately "end of caster's next turn". SRD header reads "Instantaneous"; the 1-round modeling is a minimal-widening RAW bend in exchange for correct condition bounding.

Expect the same pattern for Ray of Enfeeblement, Inflict Wounds variants, and similar "Instantaneous with lingering condition" units. Worth a line in ASSUMPTIONS.md if not already captured.

## Artifacts

- `packages/prototype-content-surface/content/ray_of_sickness.dhall`
- `packages/prototype-content-surface/content/ray_of_sickness.json`
- Verdict: `./verdict.json`
- Original sub-agent proposal: `./proposal.md`
