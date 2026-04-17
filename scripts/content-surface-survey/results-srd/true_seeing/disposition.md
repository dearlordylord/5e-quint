# Disposition — true_seeing

**Session:** 2026-04-16 (interactive digest)
**Outcome:** clean (stale proposal)

## Notes

Sub-agent proposed a new `GrantSenseOperation` variant on `OngoingOperation`. The proposal is now stale — `grant_sense` already exists as an `EffectAtom` variant, and the `activation` family + `direct` phase + `grant_sense` composition (See Invisibility precedent) reaches it without touching `OngoingOperation`. Same pattern as See Invisibility, with a touch-target attachment and explicit 120 ft range.

Material component encoded with `materialCostGp = 25` + `materialConsumed = True` metadata alongside Stoneskin (100 GP consumed) and Identify (100 GP non-consumed). Not wired into runtime behavior today; kept on the spell card so cost tracking can read it later without another schema change.

## Artifacts

- `packages/prototype-content-surface/content/true_seeing.dhall`
- `packages/prototype-content-surface/content/true_seeing.json`
- Verdict: `./verdict.json`
- Original sub-agent proposal: `./proposal.md`
