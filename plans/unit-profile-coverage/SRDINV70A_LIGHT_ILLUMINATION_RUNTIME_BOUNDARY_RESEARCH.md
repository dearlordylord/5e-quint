# SRDINV70A Light and Illumination Runtime Boundary Research

Task 274 reviewed the shared boundary for authored light emitters. No runtime
behavior was implemented in this task.

## Source Review

Local RAW sources checked:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md` lines 1577-1588 for
  Light.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md` lines 841-852 for
  Produce Flame.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md` lines 219-230 for
  Faerie Fire.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md` lines 529-538 for Starry
  Wisp.
- `.references/srd-5.2.1/Rules-Glossary.md` lines 177-179 for Bright Light,
  353-359 for Darkness and Darkvision, 412-414 for Dim Light, 524-526 for
  Heavily Obscured, 656-658 for Lightly Obscured, 730-732 for Object, and line
  898 for object size categories.
- `UBIQUITOUS_LANGUAGE.md` lines 280-286 and 354-355 for Illumination,
  Obscurement, and Darkvision terminology.

Relevant RAW facts:

- Light targets one Large or smaller object that is not being worn or carried
  by someone else. The object sheds Bright Light in a 20-foot radius and Dim
  Light for an additional 20 feet for 1 hour. Opaque covering blocks the light.
  The spell ends if the caster casts it again.
- Produce Flame creates a held flame for 10 minutes. While held, it sheds
  Bright Light in a 20-foot radius and Dim Light for an additional 20 feet,
  emits no heat, ignites nothing, and ends if the caster casts the spell again.
- Faerie Fire makes objects and failed-save creatures shed Dim Light in a
  10-foot radius for the Concentration duration, and its object/creature attack
  Advantage remains gated by the attacker being able to see the target.
- Starry Wisp makes a hit target emit Dim Light in a 10-foot radius and prevents
  Invisible benefits until the end of the caster's next turn.
- Bright Light, Dim Light, and Darkness are illumination levels. Dim Light makes
  an area Lightly Obscured, and Darkness is Heavily Obscured. Darkvision changes
  how a creature sees Dim Light and Darkness within its Darkvision range.

## Existing Boundary

Surface content already stores authored light facts as structured input.
`light` and `produce_flame` use `emit_light` effects with Bright and additional
Dim radii. `faerie_fire` and `starry_wisp` preserve their full SRD text, while
their promoted executable claims defer light emission.

The battle runtime already owns Produce Flame's held-flame lifecycle as a
caster active effect with source spell id, source combatant id, Bright radius,
Dim additional radius, duration, and same-caster recast replacement. That state
records that a spell-created emitter exists; it does not derive affected spaces,
obscurement, Perception modifiers, line of sight, or whether another creature
can see by Darkvision.

The promoted object-target boundary already uses caller-supplied `BattleObjectId`
and object facts for attack targeting and object damage disposition. The runtime
does not own a general object inventory, object position store, map geometry,
area membership derivation, light-blocking cover state, or visibility graph.

## Boundary Decision

Battle runtime may own source-owned light emitter projections when a promoted
spell needs executable lifecycle semantics: application, duration, Concentration
or turn-bound expiry, same-caster recast cleanup, and attachment to a combatant
or caller-supplied object id. Those projections are execution facts, not a map
illumination engine.

A light emitter projection should carry only facts that cannot be recovered
later without losing spell semantics:

- source spell id and source combatant id;
- attachment identity, either a combatant id or a caller-supplied object id;
- Bright radius and Dim additional radius, or just Dim radius for Dim-only
  emitters;
- expiration ownership such as timed duration, Concentration, or end-of-next-
  turn cleanup;
- recast replacement key when RAW says casting the same spell again ends the
  prior one.

The runtime must not store derived visibility beside those emitters. It should
not store illuminated squares, current Bright/Dim/Darkness at a location,
Lightly Obscured or Heavily Obscured outcomes, `can see` facts, Darkvision-
adjusted sight results, object positions, or opaque-cover state unless a later
task promotes a concrete runtime operation that owns those facts. Those remain
caller/table-supplied facts at the boundary where a rule needs them.

Surface/display metadata remains separate from runtime execution. Authored
`emit_light` records, spell prose, and color choices are Surface facts. Color is
narrative/display-only for the reviewed spells. A UI may render known emitter
radii from runtime projections, but display rendering does not become the source
of turn cleanup, spell ownership, object eligibility, or visibility rules.

Darkvision is a creature sense and an illumination-to-obscurement adjustment,
not an emitter property. Until a sight or Perception profile is promoted, any
runtime rule that depends on seeing a target should continue to consume a
caller-supplied sight fact that has already accounted for illumination,
Darkvision, cover, blindness, invisibility, and table geometry as appropriate.

## Follow-Up Runtime Shape

SRDINV70B can promote Light by adding an object-attached spell emitter projection
using the existing object boundary:

- accept a caller-supplied object id plus target legality facts for Large-or-
  smaller size and not being worn or carried by someone else;
- apply a source-owned object light emitter with Bright 20 feet and Dim
  additional 20 feet, expiring after 1 hour;
- when the same caster casts Light again, remove that caster's prior Light
  emitter before applying the new one;
- clear the emitter on duration expiry;
- keep opaque covering as caller-supplied suppression at any future
  illumination query boundary unless a later task promotes a cover/uncover
  operation;
- do not derive map illumination, Lightly Obscured, Heavily Obscured, or
  Darkvision-adjusted sight inside SRDINV70B.

Produce Flame's existing held-light active effect already matches the source-
owned emitter lifecycle side of this boundary. A later cleanup may rename or
project that effect through a shared light-emitter helper, but it should not add
separate duplicate illumination state.

Faerie Fire and Starry Wisp light riders should reuse the same emitter
projection rule only when their deferred light slices are promoted. For Faerie
Fire, the creature outline effect already carries source and Concentration
ownership, so a future Dim Light projection should be derived from the outline
effect rather than stored as a second independent creature state. For Starry
Wisp, a future hit rider may add a hit-target emitter with end-of-next-turn
expiry alongside the Invisible-benefit denial rider. Object variants must use
caller-supplied object ids and must not introduce object inventory or area
geometry derivation.

## Plan Impact

- SRDINV70A can close as research complete.
- SRDINV70B should be unblocked to promote Light's object-attached emitter
  lifecycle only, not map illumination or Darkvision behavior.
- SRDINV59A should be unblocked to promote Starry Wisp's Dim Light rider through
  the same source-owned emitter projection boundary. It should not wait for
  Light object implementation if it can introduce the shared projection cleanly.
- SRDINV58C can continue independently for Faerie Fire object outline attack
  Advantage and Invisible-benefit denial; its Dim Light clause remains a later
  shared emitter projection unless that task explicitly adopts this boundary.
- SRDINV78 remains blocked until its listed implementation tasks complete.

## Verification

- RAW/source review completed for Light, Produce Flame, Faerie Fire, Starry
  Wisp, Bright Light, Dim Light, Darkness, Darkvision, Object, and
  `UBIQUITOUS_LANGUAGE.md`.
- `plans/ACTIVE_PLAN.md` synchronized across the task index, DAG table, and
  task detail sections for SRDINV59A, SRDINV70A, and SRDINV70B.
- `pnpm quality` passed for the final changeset.
- MBT was not run because this task only changes research and plan
  documentation.

## Simplify Check

- Rejected a generic `illuminationLevel` field on combatants or objects. It
  would duplicate derived map/table state and could not represent overlapping
  light sources, Darkness, Darkvision range, opaque covering, or line of sight.
- Rejected storing both spell-specific light fields and a separate shared light
  list for the same source. Future implementation should derive emitter
  projections from the owned active effect or make the active effect itself the
  shared emitter owner.
