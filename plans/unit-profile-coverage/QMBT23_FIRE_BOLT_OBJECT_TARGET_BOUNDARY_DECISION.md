# QMBT23 Fire Bolt Object Target Boundary Decision

Task: QMBT23

## Decision

`fire_bolt` remains `needs-surface-widening` and is not reclassified as a
supported spell Unit in this task.

The promoted boundary for Fire Bolt must be an explicit Spell Invocation
projection for object targets and object ignition. Table-supplied facts are
still the right source for spatial and object-combat facts, but table facts
alone are not the runtime boundary. An assumption-backed unsupported closure is
also rejected: the SRD text is explicit, not ambiguous.

## RAW And Language Check

Local SRD 5.2.1 Fire Bolt says the spell targets "a creature or an object,"
uses a ranged spell attack, deals Fire damage on hit, and starts burning when a
flammable hit object is not worn or carried
(`.references/srd-5.2.1/Spells/Descriptions-E-L.md`, "Fire Bolt").

Local SRD 5.2.1 "Target" defines a target as a creature or object targeted by
an attack roll, forced to save, or selected for an effect. "Object" is a
nonliving, distinct thing, and "Breaking Objects" gives object AC, HP, damage
types, and damage-threshold rules
(`.references/srd-5.2.1/Rules-Glossary.md`, "Target", "Object", and
"Breaking Objects").

`UBIQUITOUS_LANGUAGE.md` distinguishes Spell Definition, Spell Access, Spell
Invocation, Spell Effect, and Spell Attack. Fire Bolt's blocker is in Spell
Invocation and Spell Effect projection, not in provenance or Spell Access.

## Boundary Shape

The future supported profile should make invalid target/effect states
unrepresentable:

- creature targets and object targets must be distinct Spell Invocation target
  variants, not both squeezed through `CombatantId`;
- object target facts must include the facts the runtime consumes, such as
  targetability, object AC or hit adjudication, HP/damage-threshold handling if
  runtime applies object damage, and whether the object is flammable and not
  worn or carried;
- object ignition must be an explicit Spell Effect outcome for eligible hit
  objects, not a display-only label or a duplicated flag beside creature damage;
- the supported Fire Bolt profile must cover both legal target classes from
  the same authored Spell Definition before `fire_bolt` can be counted as
  deterministic admission.

This does not require grid state, pathfinding, line-of-sight derivation, cover
derivation, or a general object simulation. Those remain caller/table supplied
or out of scope. The runtime boundary only needs the object facts required to
execute this spell profile.

## Current Evidence

`packages/surface/content/fire_bolt.json` is SRD-provenance authored data for
Fire Bolt, but promoted battle-runtime currently discovers supported spell acts
only for combatant-targeted spell profiles. Its spell target holes and
`BattleTargetSpatialFact` use combatant ids for spell targets, and spell damage
application mutates combatant HP. There is no promoted object target identity,
object HP/damage target, or object ignition result in the battle-runtime spell
projection.

The existing QMBT15 deterministic admission test therefore remains correct:
`fire_bolt` is loaded from the catalog as a Spell Definition and installed as
Spell Access, but `discoverBattleActs` does not admit it as a supported Spell
Invocation.

## Reclassification Requirements

A later task may reclassify `fire_bolt` only after all of these agree:

- QNT spell procedure profile models object-target Fire Bolt facts and object
  ignition as execution-facing facts;
- battle-runtime exposes a typed object-target Spell Invocation boundary and
  applies the object damage/ignition outcomes it claims;
- deterministic admission/projection evidence loads the authored
  `fire_bolt` Spell Definition through production catalog Spell Access and
  proves the supported invocation path;
- `unit-claims.jsonl`, generated matrix/report output, and verification-owner
  evidence all cite the same profile ids.

Until then, QMBT25 should treat `fire_bolt` as an explicit spell-boundary
blocker, not as a supported spell-admission candidate.
