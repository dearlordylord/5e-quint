# Glyph Stored Remaining Concentration Research

Task: `L3-FOLLOWUP-GLYPH-STORED-REMAINING-CONCENTRATION`

RAW anchors:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Glyph of Warding`
- `UBIQUITOUS_LANGUAGE.md#Spellcasting`

## Scope

Glyph spell storage admits prepared spells that target a single creature or an
area. If the stored spell requires Concentration, RAW says the released spell
lasts for its full duration. The battle owner therefore must not use ordinary
caster Concentration, triggering-creature Concentration, or readied-spell
cleanup as the lifetime source for the released Spell Effect.

## Promoted In This Task

`saveGatedDamage` stored Concentration releases are now admitted for
single-creature spell-glyph releases when the stored invocation is
readied-compatible and has a Concentration duration. The release path uses the
existing spell-glyph targeting witness, existing Saving Throw and damage fills,
and the existing `spellConcentrationDuration` effect shape. The glyph owner
suppresses ordinary Concentration replacement for this release, then rewrites
the new duration marker to a full-duration expiration.

The focused runtime witness uses `mind_spike` only as SRD fixture coverage for
the typed `saveGatedDamage` shape; production admission is by procedure,
duration, target shape, and active-effect shape, not by spell id, name, slug, or
provenance section.

## Remaining Follow-Up Splits

`L3-FOLLOWUP-GLYPH-STORED-AREA-ONGOING-CONCENTRATION`

Owner boundary: stored spell-glyph releases for area ongoing effects whose
current procedure reducers own ordinary Spell Slot spending and caster
Concentration setup, including represented fog, darkness, movable/ongoing
damage zones, Web restraint hazards, Spike Growth movement hazards, and Gust of
Wind line effects. These need a shared no-resource, no-ordinary-Concentration
area-release entry point before the glyph owner can reuse their existing table
area witnesses safely.

`L3-FOLLOWUP-GLYPH-STORED-AREA-CONTROL-CONCENTRATION`

Owner boundary: stored spell-glyph releases for area control effects that apply
creature condition/control state at release time, such as Hypnotic Pattern.
These need explicit area-membership and cleanup semantics that preserve full
duration without assuming an ordinary caster Concentration source.

`L3-FOLLOWUP-GLYPH-STORED-SINGLE-CREATURE-ACTIVE-EFFECT-CONCENTRATION`

Owner boundary: stored spell-glyph releases for non-damage single-creature
Concentration effects that are not save-gated conditions, such as scalar buffs,
roll modifiers, size/levitation/transformation effects, and direct
condition-like profiles. These effects have procedure-specific active-effect
cleanup and target-state promotion rules, so each family needs an executable
full-duration rewrite before storage can be admitted.

Summoned Hostile creatures and non-Spiritual-Weapon harmful object/trap
procedures stay with `L3-FOLLOWUP-GLYPH-STORED-HOSTILE-SUMMON-PLACEMENT`.
