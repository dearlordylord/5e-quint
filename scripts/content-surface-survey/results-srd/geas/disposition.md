# Disposition — geas

**Session:** 2026-04-16 (batch apply_condition digest)
**Outcome:** clean (stale proposal, with one deferred edge)

## Notes

Sub-agent proposed two widenings: `ApplyConditionEffect in spell Effect` and a `Slot-threshold Duration` variant. The first is stale — `apply_condition` is already an `EffectAtom` reachable from `save_gate.onFail`. The second is partially covered by the existing `DurationValue.upcastTiers`: base 30 days with a tier at slot 7 jumping to 365 days encodes L5–L8 correctly.

**Partial deferral (known):** the L9 "until it is ended by Remove Curse / Greater Restoration / Wish" slot path requires a `permanent` / `until_dispelled` Duration variant that does not yet exist. The authored `upcastTiers[{atSlot:7, amount:365}]` applies at slot 7 and above, so at slot 9 it incorrectly reports 365 days instead of until-dispelled. Coalesces with Sequester's permanent-Duration pressure (also in this batch, classified `needs_widening`).

**DM agenda per ARCHITECTURE.md §1:**
- "5d10 Psychic damage if it acts in a manner directly counter to your command" — behavior judgment. Same class as Charm Person's "fighting" predicate and Suggestion's commanded-behavior enforcement.
- "Automatically succeeds if it can't understand your command" — language/comprehension predicate.
- "Should you issue a suicidal command, the spell ends" — DM-adjudicated termination.
- "Remove Curse / Greater Restoration / Wish ends this spell" — named-spell dispel; those spells' mechanics are authored separately; caller wires the termination.

## Artifacts

- `packages/prototype-content-surface/content/geas.dhall`
- `packages/prototype-content-surface/content/geas.json`
- Verdict: `./verdict.json`
- Original sub-agent proposal: `./proposal.md`
