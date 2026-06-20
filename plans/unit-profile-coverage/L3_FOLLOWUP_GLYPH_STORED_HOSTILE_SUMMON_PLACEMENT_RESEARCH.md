# Glyph Stored Hostile Summon Placement Research

Task: `L3-FOLLOWUP-GLYPH-STORED-HOSTILE-SUMMON-PLACEMENT`

RAW anchors:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Glyph of Warding`
- `UBIQUITOUS_LANGUAGE.md#Controlled Creatures And Companions`
- `UBIQUITOUS_LANGUAGE.md#Encounter Relationships`

## Scope

Glyph spell storage admits prepared spells that target a single creature or an
area. At release time, RAW says Hostile summoned creatures and harmful objects
or traps appear as close as possible to the intruder and attack it. The battle
owner therefore needs a concrete occurrence owner for the summoned creature or
harmful object before Glyph can consume a placement witness safely.

## Runtime Inventory

Task 30 already promoted the represented harmful-object subset for stored
`spiritualWeaponAttackProxy` releases. Task 28 already covers the represented
stored `greaseGroundHazard` trap branch.

No additional family is promotable in this task. The stored invocation
candidate type admits readied-compatible invocations plus Grease,
save-gated-condition, and Spiritual Weapon procedures. The hostile-placement
classifier returns a placement subject only for Grease traps and
Spiritual Weapon harmful objects, and the stored release witness has no
summoned-Hostile-creature variant. Adding one at the Glyph boundary would
create summon identity, placement, hostility, attack routing, and duration state
without an owning summon procedure.

## Remaining Follow-Up Splits

`L3-FOLLOWUP-GLYPH-STORED-HOSTILE-CREATURE-SUMMON-LIFECYCLE`

Owner boundary: stored spell-glyph releases whose stored invocation creates one
or more Hostile battle creatures. This needs a summon occurrence owner for
creature identity, stat-block or creature projection, caller/table placement in
an unoccupied space as close as possible to the triggering creature, Encounter
Side or hostility relationship, command or turn protocol, attack-target
fixation to the triggering creature when RAW requires it, and duration cleanup
including the Glyph full-duration Concentration rule.

`L3-FOLLOWUP-GLYPH-STORED-HARMFUL-OBJECT-OCCURRENCE-ROUTING`

Owner boundary: stored spell-glyph releases for non-Spiritual-Weapon harmful
object procedures. This needs an object or proxy occurrence owner for stable
identity, close-as-possible placement, target/routing facts for attacking the
triggering creature, object or proxy lifecycle, and cleanup. It must reuse the
procedure's own object state instead of adding a Glyph-local object registry.

Area ongoing Concentration hazards, area control Concentration, and
single-creature active-effect Concentration remain with Tasks 33-35. Those
families are not promoted here by relabeling area or target witnesses as
harmful-object placement.

## Reviewer Loop Notes

- RAW traceability: the split rows map to the spell-glyph release sentence for
  Hostile summons, harmful objects, close placement, attack target, and
  full-duration Concentration.
- Ubiquitous language: summoned creatures are modeled as Creatures or
  Companions with explicit control/relationship facts, not as authored spell
  identity.
- Architecture and connascence: the Glyph owner keeps the already-promoted
  Grease and Spiritual Weapon subjects local and refuses a generic placement
  bypass until summon/object occurrence owners can carry the required state.
