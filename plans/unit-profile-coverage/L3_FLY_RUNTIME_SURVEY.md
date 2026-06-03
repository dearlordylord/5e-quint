# L3 Fly Runtime Survey

Task: `L3-SPELL-FLY-RUNTIME-SURVEY`

## RAW And Language Check

Local RAW exists for SRD 5.2.1 Fly in
`.references/srd-5.2.1/Spells/Descriptions-E-L.md#Fly`. The spell is a
level-3 Transmutation spell with Action casting, Touch range, Verbal, Somatic,
and Material components, Concentration up to 10 minutes, and a touched willing
creature target. For the duration, the target gains a Fly Speed of 60 feet and
can hover. When the spell ends, the target falls if it is still aloft unless it
can stop the fall. Using a higher-level Spell Slot adds one target per slot
level above 3.

`UBIQUITOUS_LANGUAGE.md` confirms the relevant terms: Spell Definition, Spell
Access, Spell Invocation, Spell Effect, Spell Slot, Concentration, Speed,
Movement, and Fly Speed. It also distinguishes Speed from Movement: Fly grants
a Speed capacity, not spent Movement, and map elevation, aloft status, and
landing legality are spatial/table facts rather than duplicate battle-local
position state.

The Rules Glossary confirms the broader flying rules:

- while flying, a creature falls if it has the Incapacitated or Prone condition
  or its Fly Speed is reduced to 0;
- hover lets a creature stay aloft in those circumstances;
- while a creature has a Fly Speed, it can stay aloft until it lands, falls, or
  dies;
- switching between special Speeds subtracts already-spent movement from the
  newly chosen Speed;
- changes to Speed also change special Speeds by the same amount.

## Current State

`fly` is authored in `packages/surface/content/fly.dhall` and generated JSON.
The record already exposes the static spell facts and a direct `grant_speed`
effect with `speedKind: "fly"`, fixed `feet: 60`, `hover: true`, and
slot-scaled target count.

The Surface target hole is not as operationally precise as sibling touched
willing-creature spells such as Jump and Spider Climb: it has a target
selection, but does not encode `targetKinds: ["creature"]` or
`disposition: "willing"`. A runtime support task should repair that target
shape before admission so the reducer consumes typed target eligibility rather
than recovering it from spell identity or prose.

The active Unit matrix still reports `fly` as an `srd-candidate` with
`not-in-unit-catalog` status. It has no Unit claim, deterministic
admission/projection evidence, selected-identity evidence, focused runtime test,
or promoted Quint parity witness.

Existing reusable pieces:

- `packages/shared-algebras/src/speed-algebra.ts` already models fixed special
  Speed candidates and applies global Speed changes to fixed special Speeds.
- Battle runtime has `specialSpeedGrant` active effects, shared active-effect
  expiration, Concentration cleanup, target-list scalar spell invocation, Dash
  and Movement budget projection, and caller-supplied movement path facts.
- Feather Fall already establishes that falling triggers and landing outcomes
  are table-supplied facts consumed by battle runtime rather than automatically
  derived from map elevation.

Non-reusable or incomplete pieces:

- `BattleMovementSpeedKind` and the `MovementSpeedKind` Quint type
  currently include Walk, Climb, and Swim only. There is no promoted Fly
  movement kind.
- `BattleSpecialSpeedKind` likewise excludes Fly, so the existing
  `specialSpeedGrant` active effect cannot represent Fly without widening the
  movement kind vocabulary.
- `spell.scalar-buff` supports flat walking-Speed deltas and linked
  special-Speed grants such as "Climb Speed equal to Speed"; it does not admit a
  fixed 60-foot special Speed or hover.
- The existing active effect stores only `speedKind`, not a fixed Speed value or
  hover permission.
- No promoted runtime owner automatically tracks "aloft" state, elevation,
  whether a creature can stop a fall, or landing geometry.

## Decision

Task 19 should close as a follow-up split, not as support and not as
runtime-detached closure. Fly has an executable battle-facing core: Action and
Spell Slot spend, Concentration, target-list admission, fixed Fly Speed, hover,
and cleanup. That core is broader than the current scalar-buff profile because
it requires a new movement kind and a fixed special-Speed active effect. The
spell-end fall clause also depends on aloft/can-stop-fall witnesses and should
use the existing falling reaction/landing owner rather than adding map geometry
or duplicated position state.

No companion AI or autonomous-control behavior is involved. Fly grants movement
capacity to selected targets; it does not create a companion, choose actions for
the target, or introduce an autonomous controller. Runtime admission must use
typed spell procedure facts and support profiles, not `spell.id === "fly"`.

## Follow-Up Split

`L3-FOLLOWUP-FLY-SURFACE-TARGET-REPAIR`

Repair the Fly Surface target shape before runtime admission. Required Surface
work: keep the existing SRD spell definition, fixed 60-foot Fly Speed grant,
hover flag, Concentration up to 10 minutes, and slot-scaled target count, but
make the target hole structurally encode a touched willing creature target with
`targetKinds: ["creature"]` and `disposition: "willing"` using the same
selection vocabulary as Jump and Spider Climb. Required output: updated Dhall
and JSON content plus focused Surface/unit-catalog tests proving the record
round-trips without representing spell-end falling as prose-only support.

`L3-FOLLOWUP-FLY-SPECIAL-SPEED-RUNTIME`

Promote Fly's active Speed grant after Surface target repair. Required runtime
work: admit the repaired Surface record into the Unit catalog; add a spell
invocation profile for Action level-3+ Spell Slot casting, touched willing
target-list targeting, caster-owned Concentration up to 10 minutes, fixed
60-foot Fly Speed, hover capability, slot-scaled target count, and cleanup on
Concentration or duration end. Widen the promoted movement kind vocabulary and
Quint model to include Fly Speed, and make effective movement and
Dash budget projection consume the fixed special Speed without duplicating walk
Speed or spent Movement state. Required output: supported-profile or
profile-subset-supported Unit claim, deterministic admission/projection
evidence, focused runtime tests, generated coverage artifacts, and promoted
Quint/runtime parity. Automatic pathfinding, map elevation, aloft status, and
landing legality remain caller/table-supplied facts.

`L3-FOLLOWUP-FLY-END-FALL-WITNESS`

Promote the spell-end falling boundary after the active Fly effect exists.
Required runtime work: connect Fly effect cleanup to a caller-supplied
still-aloft/can-stop-fall witness boundary that either opens the existing
`creatureFalls` reaction window for affected targets or records why the target
can stop the fall. The implementation must preserve Feather Fall's existing
falling-trigger and landing owner, avoid battle-owned elevation simulation, and
avoid treating hover as a generic immunity to every fall source. Required
output: focused tests for Concentration break, duration expiration, recast or
replacement cleanup, hover-relevant fall prevention, and handoff to the existing
falling reaction/landing pipeline, plus promoted Quint/runtime parity.

## Reviewer Loop

Round 1 RAW and ubiquitous-language pass:

- Kept the SRD target exact: touched willing creature, not arbitrary creature or
  object.
- Kept Fly Speed as Speed capacity rather than spent Movement.
- Preserved the spell-end falling clause instead of burying it in prose-only
  closure.
- Left aloft state, can-stop-fall judgment, pathfinding, elevation, and landing
  legality with caller/table witnesses.

Round 2 architecture and connascence pass:

- Did not add Unit claims or runtime support from catalog admission alone.
- Split Surface target repair from runtime promotion so the reducer does not
  infer willing-creature eligibility from authored identity.
- Split fixed Fly Speed and hover from spell-end falling because the former is
  an active movement projection and the latter is a falling witness/lifecycle
  boundary.
- Reused existing speed algebra and falling reaction concepts in the follow-up
  shape rather than proposing a parallel position or elevation store.
- The remaining strong coupling is intentional and should be made type-visible
  in the follow-up: `BattleMovementSpeedKind`, `BattleSpecialSpeedKind`, codecs,
  Quint `MovementSpeedKind`, and movement/Dash discovery must all
  widen together when Fly Speed is promoted.

## Verification Notes

This survey records a Unit claim only to make the follow-up split
checker-visible. It does not add Surface catalog admission, runtime reducers,
or promoted Quint behavior. The appropriate verification is coverage
consistency and whitespace checking, not MBT.
