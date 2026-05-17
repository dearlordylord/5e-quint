# L1K Mobility Transformation Spell Candidate Intake

Date: 2026-05-17

## Decision

Task 5 is an intake decision, not a runtime promotion. Do not add Unit claims,
catalog admission, QNT behavior, battle reducer behavior, or MBT evidence from
this task.

The six seed Spell Definitions split into:

- table-witness teleport need: `misty_step`
- special-Speed and movement-mode needs: `fly`, `spider_climb`
- movement-immunity and restraint-escape composite need:
  `freedom_of_movement`
- option-switching self-transformation need: `alter_self`
- save-gated Beast stat-block replacement need: `polymorph`

No candidate is an exact existing-profile fit. The existing `spell.scalar-buff`
profile admits flat Speed bonuses, Temporary Hit Points, and flat Armor Class
bonuses; it does not admit special Speed grants, hover, linked Speed values,
teleportation, water breathing, natural weapon overrides, movement-rule
immunity, condition-source prevention, automatic restraint escape, or
stat-block replacement.

Table geometry stays outside this intake. Future runtime slices should consume
typed destination, visibility, occupancy, surface, elevation, terrain,
restraint, falling, and landing witnesses where needed. They should not add
automatic map pathfinding, grid geometry derivation, line-of-sight drawing, or
surface traversal adjudication inside the reducer.

`polymorph` is a stat-block replacement transformation, not a companion or
summon lifecycle. It does not create a separate Initiative participant, turn
owner, command protocol, mount, or companion replacement lifecycle. Future work
should model replacement of the target creature's game statistics by a chosen
Beast stat block while preserving the RAW-retained target facts.

## Source Check

Generated coverage artifacts checked:

- `plans/unit-profile-coverage/UNIT_REPORT.md`: all six candidates are authored
  SRD spell records with `srd-candidate` catalog-admission disposition.
- `plans/unit-profile-coverage/unit-matrix.json`: all six candidates remain not
  in the installed Unit catalog.
- `plans/unit-profile-coverage/unit-claims.jsonl`: none of the six candidates
  has a supported or unsupported Unit claim.
- `plans/unit-profile-coverage/profiles.jsonl`: relevant existing promoted
  profiles include `spell.scalar-buff`,
  `spell.invocation-jump-movement-replacement`,
  `spell.invocation-feather-fall-mitigation`,
  `spell.invocation-expeditious-retreat-dash`, and
  `spell.invocation-forced-reaction-movement`.
- `packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts`: the
  scalar-buff gate accepts `grant_temp_hp`, flat `modify_speed`, and flat
  `modify_ac`; it does not accept `grant_speed`, `water_breathing`,
  `natural_weapons`, `teleport`, `transform_target`, or
  `grant_condition_immunity`.

Local RAW checked:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`: Alter Self.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`: Fly and Freedom of
  Movement.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md`: Misty Step and
  Polymorph.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md`: Spider Climb.
- `.references/srd-5.2.1/Rules-Glossary.md`: Climbing, Climb Speed, Falling,
  Flying, Fly Speed, Grappled, Hover, Paralyzed, Restrained, Shape-Shifting,
  Speed, Swimming, Swim Speed, Teleportation, Temporary Hit Points, and Stat
  Block.
- `.references/srd-5.2.1/Playing-the-Game.md`: Movement and Position,
  Difficult Terrain, Opportunity Attacks, and Temporary Hit Points.

Ubiquitous-language terms checked:

- Spell Definition, Spell Access, Spell Invocation, Spell Effect,
  Concentration, Duration, Movement, Speed, Difficult Terrain, Grappled,
  Paralyzed, Restrained, Stat Block, Character Sheet, Controlled Mount, and
  Independent Mount.

## Candidate Split

| Candidate | RAW mobility/transformation shape | Classification | Decision |
| --- | --- | --- | --- |
| `misty_step` | Bonus Action, Self, Instantaneous. The caster teleports up to 30 feet to an unoccupied space it can see. Teleportation does not spend Movement and never provokes Opportunity Attacks. | Table-witness teleport need | This needs a teleport Spell Invocation profile that consumes a caller-supplied visible unoccupied destination and emits a position-change outcome through the existing position/movement boundary. Do not route it through ordinary Movement, Jump, forced movement, or pathfinding. |
| `fly` | Action, touched willing creature, Concentration up to 10 minutes. The target gains a Fly Speed of 60 feet, can hover, and falls when the spell ends if still aloft unless it can stop the fall. Slot scaling adds targets. | Special-Speed and movement-mode need | The authored `grant_speed` shape is close to a future special-Speed active effect, but the promoted scalar-buff gate admits flat walking Speed deltas. Exact support also needs hover and spell-end falling integration through the fall/landing owner; map elevation and aloft status should be table-supplied facts. |
| `spider_climb` | Action, touched willing creature, Concentration up to 1 hour. The target can move up, down, and across vertical surfaces and ceilings while leaving hands free, and gains a Climb Speed equal to its Speed. Slot scaling adds targets. | Special-Speed and movement-mode need | This is not a flat Speed bonus. Admission needs linked Climb Speed plus a surface-traversal permission that leaves wall, ceiling, and hand-free movement geometry as caller-supplied table facts. |
| `freedom_of_movement` | Action, touched willing creature, 1-hour duration. Difficult Terrain does not affect the target's movement; spells and magical effects cannot reduce its Speed or cause Paralyzed or Restrained; it gains a Swim Speed equal to its Speed; and it can spend 5 feet of Movement to automatically escape nonmagical restraints, including a creature-imposed Grappled condition. Slot scaling adds targets. | Movement-immunity and restraint-escape composite need | This is a composite movement protection profile, not a condition-immunity spell. Exact support needs Difficult Terrain movement-cost immunity, magical Speed-reduction prevention, source-scoped Paralyzed/Restrained prevention, linked Swim Speed, and a 5-foot Movement escape command for nonmagical restraints. |
| `alter_self` | Action, Self, Concentration up to 1 hour. The caster chooses Aquatic Adaptation, Change Appearance, or Natural Weapons and can take a Magic action during the duration to replace the chosen option. Aquatic Adaptation grants underwater breathing and Swim Speed equal to Speed. Change Appearance changes presentation without changing statistics, size, or basic shape. Natural Weapons changes Unarmed Strike damage to `1d6` Slashing, Piercing, or Bludgeoning and uses the spellcasting ability for attack and damage rolls. | Option-switching self-transformation need | This is a self-transformation option bundle. Aquatic Adaptation overlaps with special-Speed support, but full admission needs a source-owned option state with Magic-action replacement, water breathing, linked Swim Speed, runtime-detached appearance facts, and a natural-weapon Unarmed Strike override with the chosen damage type and spellcasting ability. |
| `polymorph` | Action, one visible creature within 60 feet, Wisdom Saving Throw. On a failed save, the target shape-shifts into a Beast form with CR no greater than the target's CR or level. The chosen Beast stat block replaces the target's game statistics, while alignment, personality, creature type, Hit Points, and Hit Point Dice are retained. The target gains Temporary Hit Points equal to the Beast form's Hit Points; the spell ends early for the target when those Temporary Hit Points are gone. It cannot speak or cast spells, is limited by the new anatomy, and cannot use gear that melds into the form. | Save-gated Beast stat-block replacement need | This is broader than a scalar buff or condition profile. Future work needs a save-gated transformation effect, Beast form catalog choice and CR/level bound, stat-block replacement with retained target facts, form-derived Temporary Hit Points, depletion-triggered termination, action/speech/spellcasting/equipment restrictions, and revert cleanup. It should not be routed to companion/summon work because no separate creature or turn owner is created. |

## Structured Source Findings

The local SRD text is the authority for the decisions above. While checking the
structured Surface records, the following candidate-source gaps were found:

- `packages/surface/content/fly.json` records the Fly Speed and hover grant,
  but its mechanics do not represent the spell-end falling clause.
- `packages/surface/content/spider_climb.json` records the linked Climb Speed,
  but its mechanics do not represent the vertical-surface, ceiling, and
  hands-free movement permission separately from the Speed grant.
- `packages/surface/content/freedom_of_movement.json` records Paralyzed and
  Restrained condition immunities plus Swim Speed, but omits Difficult Terrain
  movement immunity, magical Speed-reduction prevention, and the 5-foot
  Movement automatic escape from nonmagical restraints. Its condition immunity
  shape is also broader than RAW unless future source modeling scopes it to
  spells and magical effects.
- `packages/surface/content/alter_self.json` records Natural Weapons as only
  Slashing damage. RAW also allows Piercing fangs or horns and Bludgeoning
  hooves, and the chosen natural weapon uses the spellcasting ability for both
  attack and damage rolls.
- `packages/surface/content/polymorph.json` records the save-gated
  transformation, retained facts, form Temporary Hit Points, and no-speech or
  no-spellcasting restriction, but its mechanics do not separately represent
  anatomy-limited actions or gear melding/no-equipment-benefit restrictions.

Do not add Unit claims for these candidates until the structured source facts
needed by the chosen runtime profile are executable or explicitly documented as
subset deferrals.

## Follow-Up Shape

Recommended future slices, in increasing runtime scope:

1. Add a Misty Step teleport profile that consumes typed table-supplied
   destination visibility and occupancy facts, spends a Bonus Action and Spell
   Slot, emits a teleport position-change outcome, and preserves the
   no-Movement/no-Opportunity-Attack boundary from Teleportation.
2. Add a special-Speed spell active-effect profile for `fly`, `spider_climb`,
   and the Aquatic Adaptation option of `alter_self`, including fixed Fly
   Speed, linked Climb or Swim Speed, hover, duration cleanup, and existing
   Speed-change composition without duplicating creature Speed state.
3. Add Spider Climb's surface-traversal permission as a table-witnessed
   movement mode, not automatic wall/ceiling pathfinding.
4. Add Freedom of Movement as a composite movement protection profile:
   Difficult Terrain cost immunity, magical Speed-reduction prevention,
   source-scoped Paralyzed/Restrained prevention, linked Swim Speed, and a
   5-foot Movement escape command for nonmagical restraints or Grappled.
5. Add Alter Self's self-owned option state with Magic-action replacement,
   water breathing, runtime-detached appearance facts, and a natural-weapon
   Unarmed Strike override that carries the chosen damage type and
   spellcasting ability.
6. Add Polymorph through a dedicated save-gated stat-block replacement design
   that references the existing creature/stat-block projection boundary rather
   than copying replacement statistics into parallel active-effect state.

## Reviewer Loop

Round 1 RAW and ubiquitous-language pass:

- Split `misty_step` from Movement profiles because SRD Teleportation does not
  spend Movement and never provokes Opportunity Attacks.
- Split `freedom_of_movement` from generic condition immunity because RAW
  scopes Paralyzed and Restrained prevention to spells and magical effects and
  also includes Difficult Terrain, Speed-reduction, Swim Speed, and restraint
  escape mechanics.
- Kept `polymorph` out of companion/summon lifecycle work because it replaces
  the target creature's game statistics but creates no separate Stat Block
  actor, Initiative participant, or command protocol.

Round 2 architecture and connascence pass:

- No checker-visible state was added. Candidate ids are repeated only as local
  planning boundaries; generated coverage artifacts remain the source of truth
  for catalog and claim state.
- Existing profile ids are cited from `profiles.jsonl`; this artifact does not
  create parallel support metadata or duplicate runtime gates.
- Strong remaining coupling is local to the candidate table, source findings,
  and follow-up list: if a candidate moves buckets, those sections must change
  together.

## Verification For This Intake

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `git diff --check`

MBT is not required because this task changes only a planning artifact and does
not modify QNT, runtime behavior, catalog admission, Unit claims, or evidence.
