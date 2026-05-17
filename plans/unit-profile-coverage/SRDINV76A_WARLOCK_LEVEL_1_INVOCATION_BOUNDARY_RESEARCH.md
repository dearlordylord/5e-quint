# SRDINV76A Warlock Level-1 Invocation Boundary Research

Task 285 reviewed the level-1 Warlock Eldritch Invocation runtime boundary. No
runtime behavior was implemented in this task.

## Source Review

Local RAW sources checked:

- `.references/srd-5.2.1/Classes/Warlock.md` lines 31-36 for level-1 Warlock
  feature, invocation count, Pact Magic slot count, and slot level.
- `.references/srd-5.2.1/Classes/Warlock.md` lines 56-66 for Eldritch
  Invocation choice, prerequisite, replacement, and repeatability rules.
- `.references/srd-5.2.1/Classes/Warlock.md` lines 68-90 for Pact Magic,
  Pact Slots, prepared Warlock spells, Warlock spellcasting ability, and
  Arcane Focus facts.
- `.references/srd-5.2.1/Classes/Warlock.md` lines 132-326 for Eldritch
  Invocation option prerequisites and option text.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md` lines 5-14 for Mage
  Armor.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md` lines 296-315 for Find
  Familiar.
- `UBIQUITOUS_LANGUAGE.md` lines 220-244 for Pact Slot, Concentration, Spell
  Access, Spell Invocation, and Spell Effect ownership terms.

Relevant RAW facts:

- Warlock level 1 grants one Eldritch Invocation, Pact Magic, two cantrips, two
  prepared level-1 Warlock spells, one level-1 Pact Slot, and Charisma as the
  Warlock spellcasting ability.
- Invocations with prerequisites are unavailable until every prerequisite is
  met. A level-2+ prerequisite is therefore not level-1 coverage.
- The no-prerequisite level-1-legal invocation options are Armor of Shadows,
  Eldritch Mind, Pact of the Blade, Pact of the Chain, and Pact of the Tome.
  Eldritch Mind is easy to miss because it sits between several prerequisite
  entries but has no prerequisite line.
- Agonizing Blast, Devil's Sight, Eldritch Spear, Fiendish Vigor, Lessons of
  the First Ones, Mask of Many Faces, Misty Visions, Otherworldly Leap, and
  Repelling Blast all have level-2+ prerequisites and must not count as
  level-1 invocation coverage.

## Existing Boundary

The Surface class-feature record for `warlock_eldritch_invocations` correctly
models the invocation container as a character-creation feature-choice source
fact. It owns choice count by Warlock level, prerequisite enforcement,
replacement constraints, option source, and repeatability constraints. It does
not claim execution for every invocation option.

The character-creation runtime already has a typed SRD invocation option
catalog. Its level-1 filter is based on zero prerequisites, which admits Armor
of Shadows, Eldritch Mind, Pact of the Blade, Pact of the Chain, and Pact of
the Tome and excludes level-2+ prerequisite options.

The promoted battle/runtime boundary already has spell procedures relevant to
some level-1 invocations, but those procedures are not enough by themselves to
claim invocation support:

- `mage_armor` is installed and has a promoted persistent armor spell
  procedure, but Armor of Shadows requires invocation-granted Spell Access:
  self-only Mage Armor without a Spell Slot.
- `find_familiar` is installed as Surface spawned-creature authored content,
  but Pact of the Chain changes Spell Access, allowed familiar forms, and the
  familiar attack boundary.
- Pact of the Blade is not a spell procedure; it is an invocation-specific
  bonded weapon projection.
- Pact of the Tome grants a Book of Shadows item/focus and selected Spell
  Access, not a single fixed battle effect.
- Eldritch Mind is a Concentration Saving Throw modifier, not a spell access
  rule.

## Classification

| Invocation | Level-1 legal? | Primary boundary | Follow-up treatment |
|---|---:|---|---|
| Armor of Shadows | yes | Spell Access plus existing Mage Armor Spell Invocation/Spell Effect | Add a focused spell-access task for self-only no-slot Mage Armor through the existing persistent armor procedure. Do not duplicate Mage Armor AC/effect state. |
| Eldritch Mind | yes | Battle runtime | Add a focused Concentration Saving Throw task: Advantage applies only to Constitution saving throws made to maintain Concentration. |
| Pact of the Blade | yes | Battle runtime | SRDINV76B is a valid focused implementation slice for bonded weapon proficiency, focus, Charisma attack/damage choice, alternate damage type choice, and bond lifecycle gates. |
| Pact of the Chain | yes | Spell Access plus companion runtime | Split after SRDINV76B: first model Find Familiar access/no-slot Magic action/special forms, then model forgoing one Attack action attack for familiar Reaction attack only when the companion boundary can own familiar actions. |
| Pact of the Tome | yes | Character creation / Spell Access | Defer battle support until a Book of Shadows spell-access boundary exists for three selected cantrips and two selected level-1 Ritual spells from any class. Focus facts can be represented with that access record if needed. |

## Boundary Decision

Do not promote `warlock_eldritch_invocations` as a representative supported
Unit after implementing only Pact of the Blade. The SRD invocation container is
a choice source; its selected options have different owners and runtime
shapes. Treating one option as support for the whole feature would collapse
character-creation ownership, Spell Access, Spell Invocation, Spell Effect, and
weapon/companion runtime facts into one misleading status.

SRDINV76B should remain a narrow Pact of the Blade task and can be unblocked by
this research. Its acceptance criteria should not claim Armor of Shadows,
Eldritch Mind, Pact of the Chain, Pact of the Tome, or any level-2+
invocation. It should also avoid generic item lifecycle simulation: the battle
runtime needs a typed bonded-weapon projection, not a general inventory item
conjuration model.

Armor of Shadows is the smallest spell-access follow-up because the Mage Armor
Spell Definition and persistent armor Spell Effect already exist. The missing
fact is the access/invocation resource shape: selected invocation grants a
self-targeted Mage Armor cast without spending a Spell Slot. That should thread
through Spell Access into the existing spell invocation path rather than adding
parallel Mage Armor state.

Eldritch Mind is a separate battle-runtime follow-up. It affects only
Constitution Saving Throws made to maintain Concentration. The runtime should
not model it as generic Constitution Saving Throw Advantage.

Pact of the Chain and Pact of the Tome are not good first representative
runtime slices. Pact of the Chain depends on a companion/familiar runtime owner
and a Find Familiar access shape with special form choices. Pact of the Tome is
mostly character-creation and Spell Access: selected cantrips and Ritual spells
from any class become prepared Warlock spells while the Book of Shadows is on
the Warlock's person.

## Follow-Up Runtime Slices

Existing follow-up task:

### SRDINV76B - Promote Pact of the Blade Battle Projection

Keep the current task focused on Pact of the Blade only:

- selected `pact_of_the_blade` invocation ownership;
- Bonus Action bond/conjure declaration if the battle runtime owns the active
  bond, or caller-supplied pre-bonded weapon facts if the current slice only
  needs attack projection;
- bonded Simple or Martial Melee weapon eligibility;
- bonded magic weapon rejection when already attuned to someone else or bonded
  to another Warlock if the bond declaration is in scope;
- proficiency with the bonded weapon;
- Spellcasting Focus fact for the bonded weapon if represented in battle;
- Charisma attack and damage option for bonded weapon attacks;
- normal, Necrotic, Psychic, or Radiant damage type choice for bonded weapon
  attacks;
- bond end conditions only to the extent the current runtime owns the relevant
  timing and identity facts.

Recommended future task:

### SRDINV76C - Promote Armor of Shadows Spell Access

Scope:

- project selected `armor_of_shadows` invocation ownership into Warlock Spell
  Access for Mage Armor;
- expose a self-targeted Mage Armor Spell Invocation that spends no Spell Slot;
- reuse the existing Mage Armor persistent armor procedure and early end on
  donning armor;
- reject non-self targets and armored self targets before creating the Spell
  Effect;
- update character-battle projection, package-local QNT if the spell
  invocation resource model changes, focused tests, and Unit evidence.

Out of scope:

- changing Mage Armor's AC formula or duration semantics;
- generic no-slot spell access for all invocations;
- level-2 Fiendish Vigor and other prerequisite spell-access invocations.

Recommended future task:

### SRDINV76D - Promote Eldritch Mind Concentration Save Advantage

Scope:

- project selected `eldritch_mind` invocation ownership into battle runtime;
- apply Advantage only to Constitution Saving Throws made to maintain
  Concentration;
- ensure ordinary Constitution Saving Throws and other Saving Throws are
  unaffected;
- update package-local QNT, Concentration save tests, character-battle
  projection tests, and Unit evidence.

Out of scope:

- generic Saving Throw Advantage;
- changing Concentration break triggers;
- level-2+ invocation spell or cantrip modifiers.

Recommended research task:

### SRDINV76E - Research Pact of the Chain Familiar Boundary

Scope:

- decide how selected `pact_of_the_chain` grants Find Familiar Spell Access and
  no-slot Magic action casting;
- decide whether special familiar forms are authored stat blocks, selected
  catalog entries, or a separate companion projection;
- decide how the Warlock forgoes one Attack action attack so the familiar can
  make one attack with its Reaction;
- keep familiar initiative, action ownership, disappearance, and one-familiar
  replacement in the companion runtime owner rather than duplicating companion
  state in Warlock feature state.

Recommended research task:

### SRDINV76F - Research Pact of the Tome Spell Access Boundary

Scope:

- decide how Book of Shadows selection records grant three cantrips and two
  level-1 Ritual spells from any class as prepared Warlock spells;
- model the book-on-person Spell Access condition without duplicating selected
  spell lists;
- decide whether the Book of Shadows Spellcasting Focus fact matters to the
  promoted battle runtime.

## Plan Impact

- SRDINV76A can close as research complete.
- SRDINV76B should be unblocked, but remains Pact of the Blade only.
- SRDINV78 should not treat SRDINV76B alone as closing level-1 Warlock
  invocation coverage.
- Add SRDINV76C and SRDINV76D as concrete follow-up runtime tasks if SRDINV78
  requires all level-1 battle-relevant invocation options before review.
- Keep Pact of the Chain and Pact of the Tome behind explicit companion and
  spell-access boundary research before any runtime promotion.

## reviewer loop Convergence

- Round 1: rejected treating Pact of the Blade as representative support for
  `warlock_eldritch_invocations`. The container is a character-creation choice
  source; option execution is split across weapon projection, spell access,
  spell invocation, spell effect, Concentration save, and companion boundaries.
- Round 2: rejected adding new Mage Armor or Find Familiar runtime state for
  this research. Existing spell definitions and Mage Armor execution should be
  reused by follow-up Spell Access work; Find Familiar needs companion boundary
  research before runtime promotion.
