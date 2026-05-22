# L3 Lightning Bolt Runtime Survey

Task: `L3-SPELL-LIGHTNING-BOLT-RUNTIME-SURVEY`

## RAW And Language Check

Local RAW exists for SRD 5.2.1 Lightning Bolt in
`.references/srd-5.2.1/Spells/Descriptions-E-L.md#Lightning Bolt`. The spell is
a level-3 Evocation spell with Action casting, Self range, Verbal, Somatic, and
Material components, and Instantaneous duration. A 100-foot-long, 5-foot-wide
Line blasts from the caster in a chosen direction. Each creature in the Line
makes a Dexterity Saving Throw, taking 8d6 Lightning damage on a failed save or
half as much damage on a successful one. Higher-level Spell Slots add 1d6
damage per slot level above 3.

The Rules Glossary says an Area of Effect has a point of origin and excludes
locations blocked by Total Cover from that point. A Line extends from a point of
origin in a straight path along its length and has a specified width; the point
of origin is excluded unless the creator decides otherwise.

`UBIQUITOUS_LANGUAGE.md` confirms the relevant terms: Spell Definition, Spell
Access, Spell Invocation, Spell Effect, Area of Effect, Saving Throw, Damage
Roll, Damage Type, Hit Points, and Spell Slot. It also keeps Area of Effect as
the shape of a spell's impact zone, so automatic Line placement, direction,
Total Cover blocking, and affected-creature derivation remain table/spatial
witness facts rather than duplicated battle map state.

## Current State

`lightning_bolt` is authored in `packages/surface/content/lightning_bolt.dhall`
and generated JSON. The record already exposes the SRD source facts: Action
casting, Self range, Instantaneous duration, a self-origin Line with
`lengthFeet: 100` and `widthFeet: 5`, Dexterity save, caster Spell Save DC,
8d6 Lightning damage, half damage on successful saves, and slot scaling.

Before this task, the active Unit matrix reported `lightning_bolt` as an
`srd-candidate` with `not-in-unit-catalog` status. The earlier
`L1K_DAMAGE_SPELL_CANDIDATE_INTAKE.md` correctly identified the missing owner:
the save-gated damage profile already handled the damage/save procedure, but
did not admit a self-origin Line target-set boundary.

Existing reusable pieces:

- `SpellTargeting` already had a `selfOriginLine` variant.
- Saving Throw outcome validation already accepts `selfOriginLine` area facts
  and requires the area origin anchor to be the caster.
- The save-gated damage resolver already consumes caller-supplied affected
  targets, applies half damage on success, performs damage adjustments, spends
  Action and Spell Slot resources, and composes with Concentration damage
  checks on damaged targets.
- Package-local Quint already models the generic area save-gated damage
  lifecycle; this task adds Lightning Bolt as another concrete profile using
  that lifecycle.

## Decision

Task 20 closes as supported. The only missing runtime boundary was admission of
Lightning Bolt's exact self-origin Line shape into the existing
`spell.invocation-damage-save-or-attack` profile. Battle runtime owns Spell
Invocation, resource spend, Saving Throw outcomes, slot-scaled Lightning
damage, half damage on successful saves, and Hit Point application; the
table/spatial owner supplies Line direction, Total Cover blocking, and the
affected target set.

No companion AI or autonomous-control behavior is involved. Runtime admission
uses the structural Surface shape and typed support profile, not authored
identity dispatch.

## Reviewer Loop

Round 1 RAW and ubiquitous-language pass:

- Preserved the SRD Line dimensions as 100 feet long and 5 feet wide.
- Kept Self range as a self-origin area with range 0 in the battle profile.
- Kept the point-of-origin, direction choice, Total Cover blocking, and
  affected-creature derivation with table/spatial witnesses.
- Kept half damage on successful Dexterity Saving Throws and slot-scaled
  Lightning damage.

Round 2 architecture and connascence pass:

- Reused the existing save-gated damage profile and `selfOriginLine` targeting
  variant instead of adding a spell-specific reducer.
- Added named Line dimension constants at the admission boundary so future
  changes to the exact supported Line shape are localized.
- Added codec support for `selfOriginLine` save-gated damage invocations so the
  narrowed runtime shape remains serializable.
- Added package-local Quint profile facts for the concrete Lightning Bolt
  invocation to keep runtime support and promoted profile modeling aligned.

## Verification Notes

This task adds runtime support plus deterministic admission, projection, and
resolution evidence for Lightning Bolt. The focused runtime test resolves a
caller-supplied Line affected-target set with one failed save and one
successful save, then verifies Spell Slot spend and full/half Hit Point damage.
Automatic geometry, direction, Total Cover, and map membership remain outside
runtime and are represented by caller-supplied area facts in the focused tests.
