# Character Creation Runtime Vocabulary

Technical vocabulary owned by `@dnd/character-creation-runtime`. Domain rules
language remains in [UBIQUITOUS_LANGUAGE.md](../../UBIQUITOUS_LANGUAGE.md).

## Terms

Character Draft - session-owned mutable character-creation state with holes
still to fill. It is not authored content. Draft holes may be opened by missing
draft structure or by selected Units. Filling a draft can reveal more holes.

Character Build - finalized build-only player-character boundary produced from
a complete legal Character Draft. It carries Character Progression plus selected
Unit references and non-derivable creation evidence such as selected
proficiency choices, selected class-choice grants, source-scoped spell choices,
owned equipment, and initial loadout. Derived executable facts such as HP
maximum, Hit Dice, total proficiencies, armor training, resources, granted origin
features, and battle spell slot capacity are projected from the build plus the
Unit catalog at the boundary that needs them. It is not a Stat Block and not
in-play Character Sheet state.

Creation Hole - a fillable requirement in a Character Draft. Holes can come
from draft structure or from selected authored Units. Hole ids are stable
runtime ids derived by the owning source/key isomorphism, not SRD terms.

Creation Fill - caller-submitted answer for one Creation Hole. Fills are
applied in atomic batches by `fillCreationHoles`; a rejected batch leaves the
draft unchanged.

Character Equipment Item Id - durable CharacterBuild equipment item identity.
It is a source/key isomorphism over an equipment item slot (`armor`, `shield`,
`main`, or `off`) and the selected equipment Unit id. It is not a display label
and not an inferred weapon Unit id.

Character Build Spellcasting Source - one spellcasting source retained by a
build. It records the source Unit, spellcasting ability, cantrips, spellbook
spells, prepared spells, and focus permissions for that source. It does not
merge cantrips or prepared spells across classes.

Character Build Spell Slot Pool - durable slot-capacity evidence on a build.
Ordinary `spellcasting` slots and `pactMagic` slots are separate pools because
the rules do not make them one interchangeable capacity.

Unit-backed selection - a character-creation choice whose accepted option
references a Unit. The draft records the selected Unit reference rather
than treating the submitted option id as authored truth.

Unit choice key - runtime-owned name for a fillable slot exposed by an authored
Unit. It is not the source Unit id. The source Unit id answers "which authored
thing opened this hole"; the choice key answers "which slot on that thing is
being filled."

Character Progression - durable class-level read model. It stores the parsed
starting class Unit id and ordered post-start class advancement entries. Total
character level and per-class levels are derived from that history. Class names
are derived from the Unit catalog at projection boundaries. The initial
progression fill selects this whole profile; a level-1 class entry is not a
separate promoted creation concept.

Support Profile - package-private runtime boundary that says which discovered
Unit-backed draft choices, Unit choice families, option ids, equipment
purchases, and selected-equipment loadout slots this package can currently finalize. It is not
authored provenance and not a Surface content classification. Legal choices
outside the profile can appear in holes, but fills are rejected as unsupported
until widening work adds support and projection behavior.

Finalization Gate - the readiness check after all holes are filled. The gate
keeps finalizable builds inside the current support profile: Orc/Soldier origin
facts, supported progression profiles, supported Unit choice families, and supported
equipment/loadout facts. It rejects complete drafts outside that profile before
producing a `CharacterBuild`.

Multiclass Prerequisite Check - shared-algebras rule check for adding a new
class to a character that already has at least one class. Character creation
uses this as a reusable rule algebra when it admits multiclass progressions; MCP
does not own or duplicate the prerequisite table.

Source-shaped finalization checks - finalization reconstructs expected
choice-hole families from Surface readers and support-profile entries, then
matches selected choices against those hole shapes. This avoids authored-id
semantic dispatch in finalization.

Subclass Choice - a class-owned Unit choice opened by Surface class creation
facts once the selected progression reaches the subclass level. The selected
subclass Unit ref is retained as a selected class-choice build ref; subclass
feature grants stay owned by the subclass Unit boundary.

Class-feature Ability Score Increase Choice - a follow-up Unit choice opened
when a selected feat Unit carries an executable ability-score increase choice.
Finalization applies the selected increases to `CharacterBuild.abilityScores`
and enforces the feat's SRD maximum score.
