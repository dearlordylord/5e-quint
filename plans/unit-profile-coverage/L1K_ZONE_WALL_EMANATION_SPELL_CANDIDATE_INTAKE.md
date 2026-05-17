# L1K Zone Wall Emanation Spell Candidate Intake

Date: 2026-05-17

## Decision

Task 6 is an intake decision, not a runtime promotion. Do not add Unit claims,
catalog admission, QNT behavior, battle reducer behavior, or MBT evidence from
this task.

The nine seed Spell Definitions split into:

- composite zone hazard needs: `web`, `stinking_cloud`
- recurring area-damage lifecycle needs: `moonbeam`, `wall_of_fire`,
  `conjure_woodland_beings`
- movement-metered terrain damage need: `spike_growth`
- self-origin Emanation attack-rider terrain need: `conjure_minor_elementals`
- barrier and wall object lifecycle needs: `wall_of_force`, `wall_of_stone`

No candidate is an exact existing-profile fit. Existing Grease, Fog Cloud,
Faerie Fire, Entangle, save-gated damage, condition-save, and damage-rider
profiles are useful precedent, but these candidates combine ongoing area
identity, table-triggered enter/end-turn/movement facts, obscurement,
Difficult Terrain, repeated saves, attack-rider area membership, wall geometry,
object durability, or wall traversal blocking in shapes not admitted by the
promoted profiles.

Table geometry stays outside this intake. Future runtime slices should consume
typed area identities, table-triggered membership/entry/end-turn/movement facts,
wall-side or enclosure witnesses, and Total Cover/blocking facts where needed.
They should not add automatic area membership, grid geometry derivation,
pathfinding, line-of-sight drawing, wall placement solving, or map automation
inside the reducer.

`conjure_minor_elementals` and `conjure_woodland_beings` are self-origin
Emanation candidates under SRD 5.2.1. They do not create a separate creature,
stat block, Initiative participant, mount, command protocol, or companion
lifecycle.

## Source Check

Generated coverage artifacts checked:

- `plans/unit-profile-coverage/UNIT_REPORT.md`: all nine candidates are
  authored SRD spell records with `srd-candidate` catalog-admission
  disposition.
- `plans/unit-profile-coverage/unit-matrix.json`: all nine candidates remain
  not in the installed Unit catalog.
- `plans/unit-profile-coverage/unit-claims.jsonl`: none of the nine candidates
  has a supported or unsupported Unit claim.
- `plans/unit-profile-coverage/profiles.jsonl`: relevant existing promoted
  profiles include `spell.invocation-grease-ground-hazard`,
  `spell.invocation-fog-cloud-obscurement`,
  `spell.invocation-attack-roll-advantage-save`,
  `spell.invocation-condition-save`,
  `spell.invocation-damage-save-or-attack`,
  `spell.invocation-marked-damage-rider`, and
  `spell.invocation-expeditious-retreat-dash`.
- `packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts`:
  save-gated damage currently admits limited point-origin Sphere/Cube and
  self-origin Cone shapes, while condition-save admits fixed cases such as
  Entangle rather than a general ongoing zone hazard profile.
- `packages/battle-runtime/src/battle-reducer/spells-resolve-area-effects.ts`:
  Fog Cloud owns one caller-supplied area identity and Heavily Obscured
  projection, not recurring save, damage, or wall object behavior.

Local RAW checked:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`: Conjure Minor Elementals
  and Conjure Woodland Beings.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md`: Moonbeam.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md`: Spike Growth, Stinking
  Cloud, Wall of Fire, Wall of Force, Wall of Stone, and Web.
- `.references/srd-5.2.1/Rules-Glossary.md`: Area of Effect, Cube, Cylinder,
  Difficult Terrain, Disengage, Emanation, Heavily Obscured, Lightly Obscured,
  Poisoned, Restrained, Sphere, Cover, Total Cover, Saving Throw, and
  Concentration.
- `.references/srd-5.2.1/Playing-the-Game.md`: Movement and Position, Actions,
  Damage Rolls, Saving Throws, and Objects.

Ubiquitous-language terms checked:

- Spell Definition, Spell Access, Spell Invocation, Spell Effect,
  Concentration, Duration, Area of Effect, Movement, Speed, Difficult Terrain,
  Cover, Obscurement, Illumination, Condition, Poisoned, Restrained, Saving
  Throw, Damage Type, Disengage, Stat Block, Controlled Mount, and Independent
  Mount.

## Candidate Split

| Candidate | RAW zone/wall/Emanation shape | Classification | Decision |
| --- | --- | --- | --- |
| `web` | Action, point-origin 20-foot Cube within 60 feet, Concentration up to 1 hour. Webs are Difficult Terrain and Lightly Obscured, can collapse without anchors, restrain on first entry on a turn or turn start after a Dexterity save, allow Strength (Athletics) escape, and burn 5-foot Cubes with Fire damage. | Composite zone hazard need | This combines Grease-like area identity and recurring table-triggered saves, Entangle-like Restrained and escape behavior, Fog/Faerie-Fire-like obscurement projection, anchoring collapse, and flammable area deletion/damage. Do not admit a subset that drops the anchor, escape, enter-area, Lightly Obscured, Difficult Terrain, or fire clauses without an explicit subset decision. |
| `moonbeam` | Action, point-origin 5-foot-radius 40-foot-high Cylinder within 120 feet, Concentration up to 1 minute, Dim Light, Magic-action movement up to 60 feet, initial and recurring Constitution saves for Radiant damage, shape-shift reversion and shape-shift prevention while in the Cylinder, once per turn. | Recurring area-damage lifecycle need | The save-for-half damage core resembles damage profiles, but the ongoing movable Cylinder, Dim Light area, movement-triggered save, once-per-turn gate, and shape-shift reversion/prevention make this a dedicated zone lifecycle. It should not be admitted as plain damage until those attached effects are executable or explicitly deferred. |
| `spike_growth` | Action, point-origin 20-foot-radius Sphere within 150 feet, Concentration up to 10 minutes. The ground is Difficult Terrain, creatures take `2d4` Piercing damage for every 5 feet moved into or within the area, and hidden natural-looking terrain can require Search against spell save DC before entry. | Movement-metered terrain damage need | This is not Grease: there is no save and the damage is proportional to table-supplied Movement distance through the area. Future support needs an active ground-area identity, Difficult Terrain movement-cost facts, per-5-foot movement damage, and recognition/Search state without deriving path distance inside the reducer. |
| `wall_of_fire` | Action, wall on a solid surface within 120 feet, either up to 60 feet long by 20 feet high by 1 foot thick or ringed wall up to 20 feet diameter by 20 feet high by 1 foot thick, Concentration up to 1 minute. The wall is opaque, deals initial Dexterity save Fire damage in its area, and one caster-chosen side deals recurring Fire damage inside the wall, on first entry each turn, or at end turn within 10 feet of that side. | Recurring area-damage lifecycle need | This needs a wall/ring area choice, solid-surface witness, opacity projection, initial save damage, selected damaging-side state, and side-specific recurring damage. It should not be routed through generic save-gated damage or Fog Cloud because wall-side geometry and recurring damage are core SRD mechanics. |
| `wall_of_force` | Action, Invisible force wall within 120 feet, Concentration up to 10 minutes, free-floating or surface-resting orientation, hemisphere/globe up to 10-foot radius or ten contiguous 10-foot panels, 1/4 inch thick. It pushes creatures if it cuts through their spaces, blocks physical and ethereal travel, is immune to all damage, resists Dispel Magic, and is destroyed by Disintegrate. | Barrier and wall object lifecycle need | This is a barrier object profile, not an obscuring or damage zone. Future support needs panel/dome/globe placement witnesses, push-side choice, physical and ethereal travel blocking, damage immunity, Dispel Magic immunity, and Disintegrate destruction without adding automatic wall placement or path solving. |
| `wall_of_stone` | Action, nonmagical stone wall within 120 feet, Concentration up to 10 minutes, ten contiguous stone panels with thickness choices, arbitrary supported shape, possible enclosing Dexterity save plus Reaction movement, object AC/HP/immunities/collapse, and permanence if Concentration is maintained for the full duration. | Barrier and wall object lifecycle need | This is an object-creation and barrier lifecycle with durability and permanence. Exact support needs panel topology, support/merge witnesses, enclosure escape facts, Reaction movement integration, object durability and collapse handling, and Concentration-to-permanent transition. Do not collapse it into a generic line area or force-move effect. |
| `stinking_cloud` | Action, point-origin 20-foot-radius Sphere within 90 feet, Concentration up to 1 minute. The cloud is Heavily Obscured, disperses in strong wind, and each creature starting its turn in the Sphere makes a Constitution save or is Poisoned until the end of the current turn and cannot take an Action or Bonus Action while Poisoned this way. | Composite zone hazard need | Fog Cloud covers Heavily Obscured area precedent, but this spell adds start-turn save triggers, a source-scoped Poisoned effect with same-turn cleanup, Action and Bonus Action restriction, and strong-wind dispersal. It needs a composite cloud hazard profile rather than a plain Fog Cloud or condition-save admission. |
| `conjure_minor_elementals` | Action, Self, 15-foot Emanation, Concentration up to 10 minutes. Any attack the caster makes deals extra Acid, Cold, Fire, or Lightning damage, chosen when the attack is made, when it hits a creature in the Emanation. Ground in the Emanation is Difficult Terrain for the caster's enemies. Slot scaling adds `1d8` per slot level above 4. | Self-origin Emanation attack-rider terrain need | This is not a companion spell and not a fixed mark. Future support needs self-origin Emanation area identity, per-attack damage-type choice, target-in-Emanation witness, attack-hit rider integration across eligible attacks, enemy-only Difficult Terrain facts, and Concentration cleanup. |
| `conjure_woodland_beings` | Action, Self, 10-foot Emanation, Concentration up to 10 minutes. The caster can force visible creatures to make Wisdom saves when the Emanation enters their spaces, when they enter it, or when they end turns there; damage is Force, half on success, once per turn. The caster can take Disengage as a Bonus Action for the duration. Slot scaling adds `1d8` per slot level above 4. | Recurring area-damage lifecycle need | This is a self-origin moving Emanation damage zone with visibility, optional forcing, once-per-turn gating, and a Bonus Action Disengage permission. It should be kept separate from companion/summon lifecycle work and from one-shot area save damage. |

## Structured Source Findings

The local SRD text is the authority for the decisions above. While checking the
structured Surface records, the following candidate-source gaps were found:

- `packages/surface/content/web.json` records the Cube and a turn-start
  Restrained save, but its mechanics omit Difficult Terrain, Lightly Obscured,
  first-entry saves, anchoring collapse, Strength (Athletics) escape, and
  flammable 5-foot Cube burn-away damage.
- `packages/surface/content/moonbeam.json` records the Cylinder and damage
  saves, but its mechanics omit Dim Light, Magic-action movement, area-moves
  trigger, enter/end-turn trigger precision, once-per-turn gating, and
  shape-shift reversion/prevention.
- `packages/surface/content/spike_growth.json` records Difficult Terrain and
  movement damage, but its mechanics omit the camouflaged terrain recognition
  and Search action clause.
- `packages/surface/content/wall_of_fire.json` records initial and recurring
  Fire damage, but its mechanics do not represent the opaque wall projection,
  solid-surface requirement, wall height/thickness for the line option, ringed
  wall semantics, selected damaging side, or the within-10-feet-of-that-side
  end-turn trigger.
- `packages/surface/content/wall_of_force.json` records barrier creation and
  several passive effects, but future admission still needs exact panel or
  dome/globe topology, orientation/resting facts, push-side choice, and
  Disintegrate destruction semantics before claiming full support.
- `packages/surface/content/wall_of_stone.json` records a simplified line
  object, durability, push, and permanence flag, but its mechanics omit panel
  thickness choices, arbitrary supported shape, enclosure save plus Reaction
  movement, object-occupancy prohibition, support/span constraints, and collapse
  discretion.
- `packages/surface/content/stinking_cloud.json` records Heavily Obscured and
  the Poisoned/action-restriction save, but its mechanics omit strong-wind
  dispersal.
- `packages/surface/content/conjure_minor_elementals.json` records the attack
  damage rider, but its mechanics omit target-in-Emanation membership and
  enemy-only Difficult Terrain in the Emanation.
- `packages/surface/content/conjure_woodland_beings.json` records one
  enter-area damage save, but its mechanics omit Emanation-moves-into-space and
  end-turn triggers, visible-creature gating, the optional "can force" branch,
  once-per-turn gating, Bonus Action Disengage, and its slot-scaling start level
  is `5` even though RAW increases damage for slots above 4.

Do not add Unit claims for these candidates until the structured source facts
needed by the chosen runtime profile are executable or explicitly documented as
subset deferrals.

## Follow-Up Shape

Recommended future slices, in increasing runtime scope:

1. Add a shared ongoing area occurrence boundary that owns spell source,
   duration, Concentration cleanup, caller-supplied area identity, and
   table-triggered enter/end-turn/movement witnesses without deriving area
   membership or path distance.
2. Add cloud/zone obscurement composition for `stinking_cloud` and `web`,
   reusing Fog Cloud and light/obscurement projections while keeping strong
   wind, Lightly Obscured, and Heavily Obscured semantics source-specific.
3. Add Web's full hazard lifecycle: Difficult Terrain, Lightly Obscured,
   anchored collapse, enter/start-turn Restrained save, escape action, and
   flammable 5-foot Cube burn-away damage.
4. Add Spike Growth through a movement-metered ground hazard that consumes
   table-supplied movement distance through the area and applies per-5-foot
   damage, with recognition/Search facts kept at the table boundary.
5. Add Stinking Cloud through a start-turn cloud hazard profile with
   source-scoped Poisoned, same-turn Action and Bonus Action restriction,
   same-turn cleanup, and strong-wind dispersal.
6. Add Moonbeam as a movable Cylinder damage zone with Dim Light, Magic-action
   repositioning, recurring once-per-turn saves, and shape-shift
   reversion/prevention while inside the Cylinder.
7. Add self-origin Emanation support for `conjure_minor_elementals` and
   `conjure_woodland_beings`, including origin movement, origin inclusion
   choice, target membership witnesses, once-per-turn gates where RAW requires
   them, attack-rider or save-damage resolution, enemy-only Difficult Terrain,
   and Bonus Action Disengage permission.
8. Add Wall of Fire as a damaging wall/ring zone with solid-surface witnesses,
   opacity, selected damaging side, initial save damage, and side-specific
   recurring damage.
9. Add wall object creation for Wall of Force and Wall of Stone through a
   barrier/object owner that consumes panel, dome, globe, support, enclosure,
   and side-choice witnesses; integrates travel blocking, durability,
   Disintegrate or damage destruction, and Wall of Stone permanence; and does
   not derive wall placement or path blocking from map geometry.

## Reviewer Loop

Round 1 RAW and ubiquitous-language pass:

- Split `web` and `stinking_cloud` from existing Fog Cloud, Grease, and
  Entangle precedents because each combines multiple SRD effects that no single
  promoted profile owns.
- Split `moonbeam`, `wall_of_fire`, and `conjure_woodland_beings` from one-shot
  save-gated damage because their recurring area triggers, movement of the
  area, wall-side state, or Emanation movement are core Spell Effects.
- Kept `conjure_minor_elementals` and `conjure_woodland_beings` out of
  companion/summon lifecycle work because SRD 5.2.1 creates self-origin
  Emanations, not separate actors or stat blocks.

Round 2 architecture and connascence pass:

- No checker-visible state was added. Candidate ids are repeated only as local
  planning boundaries; generated coverage artifacts remain the source of truth
  for catalog and claim state.
- Existing profile ids are cited from `profiles.jsonl`; this artifact does not
  create parallel support metadata or duplicate runtime gates.
- Strong remaining coupling is local to the candidate table, source findings,
  and follow-up list: if a candidate moves buckets, those sections must change
  together.
- Runtime ownership remains source lifecycle and typed witnesses. Area
  membership, path distance, wall geometry solving, sight-line drawing, and map
  automation stay table-owned.

## Verification For This Intake

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `git diff --check`

MBT is not required because this task changes only a planning artifact and does
not modify QNT, runtime behavior, catalog admission, Unit claims, or evidence.
