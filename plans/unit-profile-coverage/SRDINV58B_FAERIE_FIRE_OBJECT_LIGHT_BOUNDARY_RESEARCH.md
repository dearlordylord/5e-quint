# SRDINV58B Faerie Fire Object and Light Boundary Research

Task 258 reviewed Faerie Fire's noncreature object outline and Dim Light
emission clauses. No runtime behavior was implemented in this task.

## Source Review

Local RAW sources checked:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md` lines 219-230 for
  Faerie Fire.
- `.references/srd-5.2.1/Rules-Glossary.md` lines 79-90 and 299-303 for Area
  of Effect and Cube placement.
- `.references/srd-5.2.1/Rules-Glossary.md` lines 412-414 and 656-658 for Dim
  Light and Lightly Obscured.
- `.references/srd-5.2.1/Rules-Glossary.md` lines 430-436 for Emanation.
- `.references/srd-5.2.1/Rules-Glossary.md` lines 730-732 and 1020-1022 for
  Object and Target.
- `UBIQUITOUS_LANGUAGE.md` lines 268-286 for Duration, Area of Effect,
  Illumination, Obscurement, and Darkvision vocabulary.

Relevant RAW facts:

- Faerie Fire is a level-1 Action spell with 60-foot range and Concentration,
  up to 1 minute.
- Objects in the 20-foot Cube are outlined unconditionally. Creature outlines
  are gated by a failed Dexterity save.
- Objects and affected creatures shed Dim Light in a 10-foot radius and cannot
  benefit from the Invisible condition for the duration.
- Attack rolls against an affected creature or object have Advantage if the
  attacker can see it.
- Dim Light is an illumination level that makes an area Lightly Obscured, which
  affects Wisdom (Perception) checks to see something in that space.
- An object is a nonliving, distinct thing, and a target may be a creature or
  object selected by an attack roll, saving throw, spell, or other phenomenon.

## Existing Boundary

SRDINV58A promoted the creature failed-save subset. The promoted runtime admits
Faerie Fire as a point-origin Cube save-gated spell, applies one
concentration-owned `faerieFireOutline` effect to failed-save creatures, and
uses that effect for sight-gated attack-roll Advantage plus Invisible-benefit
denial.

The Surface definition already records the whole SRD text and explicitly notes
that object outlining is not gated by the saving throw. It also records the
current Dim Light clause as a visibility predicate rather than a promoted
battle-runtime effect.

The battle runtime now has typed object target facts for selected spell attack
object targets, but it does not own a general object inventory, area object
enumeration, object-attached ongoing effects, object visibility derivation, or
illumination map.

## Boundary Decision

Faerie Fire's object outline is an executable battle-runtime fact only at an
object-target attack boundary. It should not be treated as Surface-only, because
RAW gives affected objects a direct attack-roll consequence: attacks against an
affected object have Advantage if the attacker can see it. It should also not
be implemented as a generic environmental object scan. The table/caller must
supply object identities in the Cube and sight facts for object-target attacks.

The future object-outline slice should use one concentration-owned object
outline projection keyed by `BattleObjectId` and caster identity. That
projection should feed object-target attack-roll mode and Invisible-benefit
denial for affected objects. It must not duplicate object position, object
inventory, Cube membership, or object visibility state; those facts remain
caller/table supplied at the object-selection and object-attack boundary.

Faerie Fire's Dim Light emission is not a Faerie-Fire-specific battle-runtime
fact in the current promoted runtime. Dim Light is illumination that creates
Lightly Obscured spaces and mostly affects sight-based Perception and broader
environmental visibility. A Faerie-specific active-effect flag would duplicate
or pre-empt the shared illumination model needed by Light, Produce Flame,
Starry Wisp, Daylight, Continual Flame, and similar rules. Until SRDINV70A
decides the shared light and illumination runtime boundary, Dim Light emission
should remain an environmental projection outside this battle runtime's
executable Faerie Fire subset.

This splits the omitted clauses cleanly:

- Object outline attack Advantage and object Invisible-benefit denial:
  battle-runtime executable, but only through caller-supplied object identities
  and object sight facts.
- Dim Light emission: shared illumination/environment projection, not a
  Faerie-specific runtime state field.
- Color choice: narrative only; no executable consequence.

## Follow-Up Runtime Slice

Recommended future task:

### SRDINV58C - Promote Faerie Fire Object Outline Runtime

Scope:

- accept caller/table-supplied object ids for objects in the Faerie Fire Cube;
- store a concentration-owned object outline projection keyed by object id and
  caster;
- apply attack-roll Advantage against affected objects when the attacker can
  see the object, using caller/table-supplied object sight facts;
- deny Invisible-condition benefits for affected objects if an object-target
  Invisible-benefit boundary exists in the same slice or already exists;
- clear object outline projections when the caster's Concentration ends;
- update package-local QNT, runtime projection, focused tests, and Unit
  evidence before claiming the object outline branch as supported.

Out of scope:

- deriving which objects are in the Cube from a grid or map;
- adding a general object inventory or object location store;
- deriving object visibility, cover, or line of sight;
- implementing Dim Light or Lightly Obscured area propagation;
- generic object attacks not needed by admitted object-target spell profiles.

## Plan Impact

- SRDINV58B can close as research complete.
- SRDINV66 should treat SRDINV58B as unblocked/done for the current deferred
  clause batch, while remaining blocked by the other incomplete batch tasks.
- SRDINV58C tracks the follow-up object outline runtime slice.
- SRDINV59A is blocked on SRDINV70A so Starry Wisp Dim Light cannot run ahead
  of the shared illumination boundary.
- SRDINV59B remains a later Starry Wisp rider task and no longer blocks
  SRDINV66 while its prerequisite is behind SRDINV70A.
- SRDINV70A should retain Faerie Fire and Starry Wisp as inputs to the shared
  light and illumination boundary decision.

## reviewer loop Convergence

- Round 1: rejected a Faerie-specific Dim Light active effect. It would create
  duplicate illumination state beside the future shared light model and would
  not execute the full Lightly Obscured/Perception boundary.
- Round 2: rejected storing Cube object membership or object visibility in
  battle state. Object identities and sight facts should enter at the caller
  supplied object-outline and object-attack boundaries, matching the existing
  table-owned spatial fact pattern.
