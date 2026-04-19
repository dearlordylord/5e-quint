# EPT2 - Acid Splash Spell-Side Unit Confirmation

## Purpose

This file is the EPT2 checked-in confirmation that `acid_splash` is the
spell-side executable unit for the first executable-projection tracer-bullet
slice. EPT1 already froze the authored first-slice units in
[EXECUTABLE_PROJECTION_FIRST_SLICE_SCOPE.md](/workspace/typescript/dnd/plans/EXECUTABLE_PROJECTION_FIRST_SLICE_SCOPE.md).
This document records the SRD trace, the authored/traced shape, and why
`acid_splash` is the correct first spell pressure case for EPT3 and EPT5.

## Confirmed Unit

- authored source: [acid_splash.dhall](/workspace/typescript/dnd/packages/prototype-content-surface/content/acid_splash.dhall)
- generated artifact: [acid_splash.json](/workspace/typescript/dnd/packages/prototype-content-surface/content/acid_splash.json)
- provenance: `srd-5.2.1`, section `Spells/Descriptions-A-D#Acid Splash`
- RAW text: [Descriptions-A-D.md:20](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md:20)

## RAW Field Trace

| Authored field | RAW anchor |
| --- | --- |
| `mechanics.family = "activation"` | "Evocation Cantrip" |
| `mechanics.level = 0` | "Cantrip" |
| `mechanics.school = "evocation"` | "Evocation Cantrip" |
| `mechanics.castingTime = { kind = "action" }` | "Casting Time: Action" |
| `mechanics.range = { kind = "point", feet = 60 }` | "Range: 60 feet" and "at a point within range" |
| `mechanics.components = { v = True, s = True, m = False }` | "Components: V, S" |
| `mechanics.duration = { kind = "instantaneous" }` | "Duration: Instantaneous" |
| `save_gate` attachment `area.sphere radiusFeet = 5`, origin `point_within_range` | "a 5-foot-radius Sphere" at "a point within range" |
| `save_gate.ability = dex`, `dc = caster_spell_save_dc` | "succeed on a Dexterity saving throw" |
| `onFail = damage acid 1d6` with `threshold_tiers` `L5 -> 2d6`, `L11 -> 3d6`, `L17 -> 4d6` | "take 1d6 Acid damage" and "Cantrip Upgrade" |
| `onSuccess = { kind = "none" }` | success avoids the damage; no rider is stated |

No authored field goes beyond the SRD passage.

## Trace Shape

`acid_splash` traces cleanly through the existing surface tracer with this
observed shape:

```text
spell_root -> activate -> save_gate -> damage
```

The full traced output is:

- atom kinds: `action_quota`, `activate`, `area`, `damage`, `save_gate`,
  `scale_die_count`, `spell_root`
- node count: `7`
- edge count: `8`

This fits the existing authored surface vocabulary without widening the tracer
or adding new atom kinds.

## Projected Subset Fit

Under EPT1, the executable subset is closed to:

- `attack_roll`
- `save_gate`
- `direct`
- `damage`
- `heal_hp`
- `grant_extra_action`

`acid_splash` projects to exactly:

- `save_gate -> damage`

The first spell-side slice therefore stays intentionally linear while still
using node kinds and edges that are compatible with later graph-shaped widening.
EPT3 still owns the exact Quint-side representation of cantrip scaling on the
projected damage node.

## Why `acid_splash` And Not `ice_knife`

The first spell-side executable case is intentionally `acid_splash`, not
`ice_knife`.

- `acid_splash` is already authored in the owned surface corpus.
- `acid_splash` is a simpler first executable pressure case: one save gate,
  then damage.
- `ice_knife` is listed as a new spell in the 5.1 -> 5.2.1 conversion guide at
  [07-spells.md:52](/workspace/typescript/dnd/.references/srd-5.2.1-conversion/07-spells.md:52),
  so it is a worse first slice anchor for the task requirement to keep the
  initial spell-side tracer bullet SRD-safe and conservative.

This confirmation does not remove `ice_knife` as a later graph-shaped pressure
case. It only confirms that EPT2 settles the first spell-side executable unit
on the simpler authored SRD cantrip.

## Spell-Slice Adjustments Required

None.

No edits to `acid_splash.{dhall,json}`, the tracer, or the EPT1 scope freeze
were required beyond checking in this confirmation.

## Verification

- `cd packages/prototype-content-surface && pnpm typecheck` - passed.
- `cd packages/prototype-content-surface && pnpm exec tsx scripts/content-surface-survey/trace-one.ts content/acid_splash.json` - passed with the traced shape recorded above.
- Full authored-content convert-and-trace sweep was run from
  `packages/prototype-content-surface/` using the repo pattern, excluding
  `_types.dhall` and the documented `magic_item_gauntlets_of_ogre_power` skip.
  It surfaced existing failures in `find_familiar`, `find_steed`,
  `spike_growth`, and `summon_dragon`. EPT2 does not touch those units, so this
  is recorded as unrelated baseline noise rather than widened into cleanup.
- RAW traceability was checked against
  [Descriptions-A-D.md:20](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md:20)
  and [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md).
- `/simplify` convergence:
  - round 1 removed duplicated rationale that belonged in the scope freeze and
    tightened the verification record to match the live package checks.
  - round 2 re-read the document end to end; no further important simplification
    remained.

## Acceptance Questions Answered

- Is `acid_splash` the confirmed spell-side executable unit for the first
  tracer-bullet slice? Yes.
- Does the first spell-side slice stay inside the EPT1 executable subset? Yes.
- Were any narrow spell-slice widening edits required? No.
- Does this confirmation force graph-shaped spell execution into the first
  slice? No.
