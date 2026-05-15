# PRD: Battle Light, Obscurement, And Sight Witnesses

Date: 2026-05-15

Status: Draft

Owner: Battle runtime / table boundary architecture

## Problem Statement

Battle runtime is starting to model RAW light-related spell effects such as
Produce Flame, Faerie Fire, and Fog Cloud. These rules touch illumination,
obscurement, hiding, invisibility, cover, target visibility, spell ranges, and
table geometry.

The risk is collapsing those concepts into one vague "visibility" field or
making battle runtime own map geometry that belongs to the table. RAW does not
make the battle reducer responsible for knowing whether a torch shines around a
corner, whether a wall grants Total Cover, whether a creature is inside a fog
bank, or whether a particular viewer can see a particular target. RAW does give
precise consequences once those table facts are established.

From the user's perspective, the system should support level-1 battle features
and spells with their real RAW consequences without turning the promoted
battle runtime into a map engine.

## Solution

Introduce an explicit battle boundary for light, obscurement, cover, and sight:

1. Runtime stores durable source-owned facts created by spells, features, or
   items.
2. The table or caller supplies projection witnesses at the point where a rule
   needs table knowledge.
3. Runtime applies RAW consequences from those source facts and witnesses.

The first implementation should harden existing light-emitter support and add
source-owned obscurement-zone support. It should not attempt full geometry,
line-of-sight computation, or magical Darkness interactions.

## User Stories

1. As a player, I want Produce Flame to create a held light source while active,
   so that the battle state reflects the spell's Bright and Dim Light effect.
2. As a player, I want Faerie Fire to record affected targets as dim-light
   emitters and deny Invisible benefits, so that attacks and object targeting
   use the spell's RAW consequences.
3. As a player, I want Fog Cloud to create a Heavily Obscured source area, so
   that the table can reason from a canonical runtime fact rather than free
   text.
4. As a GM or table adapter, I want battle runtime to expose light emitters and
   obscurement zones as source facts, so that I can project them onto my map
   without the reducer owning my map.
5. As a GM or table adapter, I want to provide witnesses such as target sight,
   Total Cover, range, or Hide eligibility only when a rule needs them, so that
   I am not forced to maintain redundant derived state every turn.
6. As a user, I want an attack against an unseen target to use RAW
   Disadvantage only when the table has established that the target cannot be
   seen, so that battle outcomes match the table state.
7. As a user, I want an unseen attacker to gain RAW Advantage only when the
   table has established that the target cannot see the attacker, so that
   hidden and invisible combatants behave correctly.
8. As a user, I want Hide to depend on explicit table-established
   circumstances, so that runtime does not guess whether terrain, foliage,
   cover, or line of sight makes hiding legal.
9. As a developer, I want light, obscurement, cover, and sight to remain
   separately named concepts, so that later Darkness, Darkvision, Blindsight,
   and Truesight work does not require undoing a collapsed model.
10. As a developer, I want rule holes to carry reducer-derived requirements
    and fills to carry only table facts, so that callers cannot accidentally
    restate or disagree with authored RAW constants.
11. As a developer, I want source facts to be durable only when runtime owns
    their lifetime, so that battle state does not duplicate table projection
    facts such as "A can see B right now."
12. As a maintainer, I want Darkness called out as a deferred pressure case, so
    that the first slice does not falsely claim to cover magical Darkness.

## Implementation Decisions

- Use RAW domain nouns: Illumination, LightEmitter, Obscurement,
  ObscurementZone, Cover, Total Cover, Sight, Hidden, and Invisible. Avoid a
  generic "visibility" state bucket.
- Keep `LightEmitter` and `ObscurementZone` separate but parallel source facts.
  They may share helper shapes such as source identity, area shape, attachment,
  and expiration, but they are not the same domain concept.
- Runtime-owned light facts describe what a source emits: Dim Light or Bright
  plus additional Dim Light, attachment, source, shape/radius, and expiration.
- Runtime-owned obscurement facts describe what a source creates: Lightly
  Obscured or Heavily Obscured area, source, area id, shape/radius, and
  expiration.
- A spell-created `ObscurementZone` does not automatically impose attack
  Disadvantage, Blinded consequences, or targeting failure on a combatant. The
  table must provide a witness that projects the zone into the specific
  viewer-target or actor-area fact required by the rule.
- Cover is not modeled as obscurement. Obstacles such as walls, trees, doors,
  corners, and creatures may create Cover, Total Cover, or sight failure, but
  that remains table projection unless RAW specifically creates an
  obscurement area.
- Dense foliage, heavy fog, heavy rain, falling snow, mist, Web, Insect
  Plague, Fog Cloud, and similar RAW text can create Lightly or Heavily
  Obscured areas. Runtime should store source-created obscurement zones when
  the source is a modeled spell or feature.
- Durable battle state should not store pairwise `canSee` values. Sight is a
  projection witness supplied for a specific action, reaction, search, Hide, or
  targeting resolution.
- Runtime may store Hidden and Invisible state because those are battle
  mechanical facts with runtime-owned lifetimes and consequences.
- Hide eligibility should be a table-supplied basis, not a runtime geometry
  computation. Supported bases should be named in RAW terms such as Heavily
  Obscured, sufficient Cover, out of enemy line of sight, or a modeled trait
  override.
- A table witness should contain only the table fact. If runtime asks whether a
  target is within 60 feet, the hole owns the maximum distance and the fill
  supplies the witnessed distance or yes/no fact.
- Use precise witness names rather than a single generic
  `visibilityWitness`. Candidate witness families include sight, cover,
  distance/range, area membership, and Hide prerequisite witnesses.
- Do not add a broad sight algebra initially. If a pure helper becomes useful,
  keep it small and consequence-oriented, such as computing attack-roll mode
  from caller-supplied sight and condition facts.
- Keep general lengths out of durable pairwise state. Use lengths as rule
  requirements, source radii, special-sense ranges, and action-specific
  distance witnesses.
- Magical Darkness is intentionally deferred from the first slice. The model
  must leave room for magical Darkness, nonmagical light suppression,
  Darkvision blocking, spell-overlap dispels, and Daylight reciprocity, but the
  first implementation should not pretend those are solved.

## Testing Decisions

- Tests should assert externally visible behavior: source facts recorded,
  source facts expiring, witnesses accepted or rejected, and RAW consequences
  applied after witnesses are supplied.
- Do not test internal geometry. There should be no test that expects runtime
  to infer whether a creature is inside a fog cloud or whether a torch
  illuminates a square around a corner.
- Light emitter tests should cover:
  - Produce Flame held-light creation and cleanup;
  - Produce Flame hurl/dismiss/recast paths not leaving stale emitters;
  - Faerie Fire target/object dim-light emitters where supported;
  - Starry Wisp and existing object light behavior remaining compatible.
- Obscurement-zone tests should cover:
  - Fog Cloud recording a Heavily Obscured source zone with source, area,
    shape, and expiration;
  - concentration or duration cleanup removing the zone;
  - no attack-roll consequence occurring without a sight witness.
- Witness tests should cover:
  - unseen target imposes attack Disadvantage when witnessed;
  - unseen attacker grants attack Advantage when witnessed;
  - Total Cover blocks direct targeting where the modeled rule requires it;
  - Hide eligibility succeeds only with an accepted prerequisite witness;
  - fills cannot restate or override reducer-owned RAW constants.
- Prior art should come from current battle-runtime target spatial facts,
  Hide prerequisite handling, light emitter tests, and the spawned-companion
  holes/witnesses research.
- Add focused deterministic tests first. Add package-local QNT coverage only
  where the reducer owns a state transition or reusable consequence algebra.
  Do not spend integrated MBT on broad geometry exploration.

## RAW References

- SRD 5.2.1 "Vision and Light" defines Lightly Obscured, Heavily Obscured,
  Bright Light, Dim Light, Darkness, and special senses.
- SRD 5.2.1 "Hide [Action]" requires appropriate circumstances and grants the
  Invisible condition while hidden on success.
- SRD 5.2.1 "Making an Attack" has the GM determine Cover and attack
  modifiers after the target is chosen.
- SRD 5.2.1 "Unseen Attackers and Targets" defines unseen-target
  Disadvantage, unseen-attacker Advantage, and hidden-location reveal after an
  attack.
- Produce Flame, Faerie Fire, Starry Wisp, Light, Dancing Lights, Continual
  Flame, Fog Cloud, Web, Insect Plague, Sleet Storm, and Stinking Cloud are the
  initial pressure examples for emitters and obscurement zones.

## Out of Scope

- Full map geometry.
- Line-of-sight or line-of-effect computation.
- Automatic projection from light emitters to illuminated squares or
  viewer-specific obscurement.
- Pairwise durable visibility state.
- Full Cover algebra beyond consuming table-supplied Cover/Total Cover facts
  where a modeled rule needs them.
- Magical Darkness and Daylight overlap/dispelling mechanics.
- Darkvision, Blindsight, Truesight, Tremorsense, Devil's Sight, and other
  special-sense projection beyond preserving clean extension points.
- Wood Elf Mask of the Wild implementation. It is a later Hide eligibility
  override pressure case, not part of the first runtime light slice.
- MCP map rendering or visual presentation.

## Further Notes

- The spawned-companion admission research provides the preferred
  hole/witness pattern: reducer-derived requirements belong in holes; table
  facts belong in fills.
- Source facts are executable for runtime cleanup, snapshots, diagnostics, and
  table display. They are not sufficient by themselves to answer who can see
  whom.
- If future work adds a sight algebra, it should be a small pure consequence
  helper over already-established facts, not a geometry owner.
