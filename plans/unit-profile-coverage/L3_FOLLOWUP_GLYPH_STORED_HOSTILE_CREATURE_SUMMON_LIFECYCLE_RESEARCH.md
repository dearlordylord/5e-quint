# Glyph Stored Hostile Creature Summon Lifecycle Research

Task: `L3-FOLLOWUP-GLYPH-STORED-HOSTILE-CREATURE-SUMMON-LIFECYCLE`

RAW anchors:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Glyph of Warding`
- `.references/srd-5.2.1/Classes/Bard.md#Level 3 Bard Spells`
- `.references/srd-5.2.1/Classes/Cleric.md#Level 3 Cleric Spells`
- `.references/srd-5.2.1/Classes/Wizard.md#Level 3 Wizard Spells`
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md#Animate Dead`
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md#Animate Objects`
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md#Create Undead`
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Find Familiar`
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Find Steed`
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Giant Insect`
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md#Summon Dragon`
- `UBIQUITOUS_LANGUAGE.md#Spell Ownership Terms`
- `UBIQUITOUS_LANGUAGE.md#Controlled Creatures And Companions`
- `UBIQUITOUS_LANGUAGE.md#Encounter Relationships`

## Scope

Glyph's spell-glyph release rule says a stored spell that summons Hostile
creatures makes them appear as close as possible to the intruder and attack it.
That clause cannot be promoted by adding a Glyph-local placement branch alone:
the runtime owner also needs creature identity, stat-block or creature
projection, caller/table placement, Encounter Side or hostility relationship,
command or turn protocol, attack-target fixation where RAW requires it, and
duration cleanup including Glyph's full-duration Concentration rule.

## Runtime Inventory

No Task 36 family is promotable from the current stored-spell runtime surface.
`GlyphStoredSpellInvocationCandidate` contains ordinary spell-procedure
invocations. The stored Glyph release witness has variants for ordinary
single-creature, ordinary area, represented Grease trap placement, and
represented Spiritual Weapon harmful-object placement. It has no
summoned-Hostile-creature witness variant, and the runtime hostile-placement
classifier maps only `greaseGroundHazard` to `traps` and
`spiritualWeaponAttackProxy` to `harmful_objects`.

The already-promoted harmful-object/trap behavior remains unchanged:

- Task 28 owns represented Grease trap release through the stored-spell release
  profile.
- Task 30 owns represented Spiritual Weapon harmful-object release through the
  stored summon/object placement profile.

Task 36 records no new profile id, QNT owner, runtime owner, or MBT evidence.

## Candidate Families

Current SRD creature-creation candidates are not safe Glyph stored Hostile
creature summon promotions:

| Family | RAW/runtime boundary | Task 36 decision |
| --- | --- | --- |
| `find_familiar` | Source-specific familiar lifecycle is promoted for Find Familiar, including retained companion identity, forms, replacement, temporary dismissal, telepathy, touch delivery, and Pact exceptions. | Not a Hostile stored summon branch and not a generic companion owner for Glyph. Do not reuse Find Familiar as admission evidence for other summoned creatures. |
| `animate_dead` / `create_undead` | Reanimated Undead need corpse-or-bones source facts, Skeleton/Zombie or higher-undead stat-block selection, combatant identity, command fan-out, default behavior, control-window expiry, and reassertion. | Split to the future reanimated companion lifecycle/control owner. Glyph must not create parallel Undead identity or command state. |
| `animate_objects` | Object-to-Construct creatures need object identity, object eligibility and size witnesses, Construct combatant insertion, grouped commands, 0-HP object reversion, and overflow damage. | Split to the future object-to-creature lifecycle/control owner. Glyph must not copy inventory/object state into spell-glyph placement. |
| `find_steed` | The steed is allied to the caster, uses an inline stat block, has mount/rider control branches, replacement, disappearance, caster-death cleanup, and item-drop boundaries. | Split to the future mount companion lifecycle/control owner. It is not a Hostile summon release. |
| `giant_insect` / `summon_dragon` | These summon allied stat-block creatures that share the caster's Initiative count, act immediately after the caster, obey no-action verbal commands, default to Dodge and avoid danger, and disappear at 0 HP or spell end. | Split to the future stat-block spawned-creature owner. Glyph support needs that owner before close placement and full-duration cleanup can be consumed. |
| `gate` / `planar_binding` | Gate can transport a named creature without control; Planar Binding targets an existing creature and can bind a Hostile creature to service. | Not a stored spell-glyph summon occurrence. These belong to planar travel/service-binding owners, not Glyph hostile-placement state. |
| `conjure_animals`, `conjure_elemental`, `conjure_fey`, and similar Conjure spells | Current SRD 5.2.1 Conjure spell text creates spatial manifestations, spirits, or proxy attacks rather than independent Hostile battle creatures with turns and stat blocks. | Keep with their area/spatial manifestation owners. Do not relabel them as summoned Hostile creatures for Glyph. |

## Closure

Task 36 is a runtime-closure task. There is no supported or
profile-subset-supported stored Hostile creature summon release claim to add
today. Future support must start with a concrete summon lifecycle/control owner
for one of the candidate families, then let Glyph consume that owner's typed
placement, hostility, attack-target, turn/control, and cleanup facts. A broad
Glyph support claim or generic summoned-creature placement registry would
duplicate state and make invalid ownership combinations representable.

## Reviewer Loop Notes

Round 1 RAW and ubiquitous-language pass:

- Glyph's stored spell clause was checked against the local SRD text for
  Hostile summoned creatures, close placement, attack target, and full-duration
  Concentration.
- The SRD summon/control candidates were separated by domain language:
  reanimated creature, object-to-creature, mount companion, spawned stat-block
  companion, spatial manifestation, planar transport, and service binding.
- `Encounter Side` and `Companion Control` remain runtime relationship/control
  facts, not provenance, spell authored identity, or Glyph-local metadata.

Round 2 architecture and connascence pass:

- No runtime state was added. The strong couplings stay with their missing
  owners: summon occurrence id plus combatant id, stat-block source plus
  spell-level projections, placement plus occupancy/visibility witnesses,
  Encounter Side plus attack-target fixation, command protocol plus turn order,
  and duration cleanup plus Concentration ownership.
- Existing Find Familiar support is cited only as source-specific precedent.
  It is not a generic companion adapter for Glyph.
- The Glyph claim remains a profile subset: Grease trap and Spiritual Weapon
  harmful-object placement are supported; Hostile creature summons remain
  closed until a concrete summon owner exposes typed facts for Glyph to consume.
