# SRDINV76F Pact of the Tome Spell Access Boundary Research

Task 295 reviewed Pact of the Tome's Book of Shadows spell-access boundary. No
runtime behavior was implemented in this task.

## Source Review

Local RAW sources checked:

- `.references/srd-5.2.1/Classes/Warlock.md` lines 68-90 for Pact Magic,
  Warlock prepared spells, Warlock spellcasting ability, and Arcane Focus
  facts.
- `.references/srd-5.2.1/Classes/Warlock.md` lines 288-294 for Pact of the
  Tome, Book of Shadows appearance/disappearance, selected cantrips and
  level-1 Ritual spells, the book-on-person condition, Warlock-spell function,
  and the book's Spellcasting Focus fact.
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md` lines 5-28 for spell
  access, prepared spells, and always-prepared spells.
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md` lines 52-58 and
  `.references/srd-5.2.1/Rules-Glossary.md` lines 842-844 for Ritual casting.
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md` lines 122-138 and
  `.references/srd-5.2.1/Rules-Glossary.md` lines 920-922 for Material
  components and Spellcasting Focus substitution.
- `UBIQUITOUS_LANGUAGE.md` lines 219-244 for Cantrip, Ritual, Spell Component,
  Spell Access, Spell Invocation, and Spell Effect ownership terms.

Relevant RAW facts:

- Pact of the Tome conjures a Book of Shadows in the Warlock's hand at the end
  of a Short or Long Rest. The Warlock determines its appearance.
- The book disappears if the Warlock conjures another book with the feature or
  dies.
- When the book appears, the Warlock chooses three cantrips and two level-1
  spells with the Ritual tag. The selected spells can come from any class's
  spell list and must not already be prepared.
- While the book is on the Warlock's person, the chosen spells are prepared and
  function as Warlock spells for the Warlock.
- The book can be used as a Spellcasting Focus.
- Ritual casting still follows the general Ritual rule: a prepared
  ritual-tagged spell can be cast with 10 extra minutes and no Spell Slot, and
  it cannot be cast at a higher level through the Ritual branch.
- Spellcasting Focus substitution matters only for Material components that are
  not consumed and have no specified cost, and the focus must be held unless
  its description says otherwise.

## Existing Boundary

`packages/character-creation-runtime/src/eldritch-invocations.ts` already
models `pact_of_the_tome` as a legal level-1 Eldritch Invocation choice with no
prerequisites. That is character-creation ownership of the invocation option,
not Book of Shadows spell-access support.

`CharacterBuildSpellcastingSource` already carries source-scoped `cantrips`,
`spellbook`, `preparedSpells`, and `spellcastingFocuses`. Those are the
canonical selected spell ids for a finalized character build. Pact of the Tome
should extend that spell-access source shape or add a typed source-owned
selection associated with the invocation; it should not copy selected Book of
Shadows spells into a second Warlock feature state object that can diverge from
the build's spell-access projection.

The promoted battle runtime currently accepts ordinary class cantrips,
prepared spells, feature-prepared spells that trace to `grant_spell_access`,
and the narrow Armor of Shadows invocation access. It has no generalized
conditional prepared access for "while an item is on your person" and no
general component/focus legality owner.

Wizard Ritual Adept is not the right model to reuse directly. It admits Ritual
Invocation from spellbook Spell Access without requiring preparation and
requires reading from the spellbook. Pact of the Tome instead makes the
selected Book of Shadows spells prepared while the book is on the Warlock's
person. Once present, those selected level-1 Ritual spells are ordinary
prepared Warlock spells and can be cast normally or as Rituals by the general
Ritual rule.

## Boundary Decision

Model Pact of the Tome as conditional Book of Shadows Spell Access, not as a
representative fixed spell or a new parallel prepared-spell list.

The Warlock-owned source fact is selected `pact_of_the_tome`. From that fact,
character creation should own one Book of Shadows selection record with these
domain constraints:

- exactly three selected cantrips;
- exactly two selected level-1 Spell Definitions with the Ritual tag;
- every selected spell is drawn from at least one class spell list;
- none of the five selected spells is already prepared through the Warlock's
  other current spell access when the book appears;
- the selected spells function as Warlock spells for this Warlock;
- the selected spells are prepared only while the Book of Shadows is on the
  Warlock's person.

Do not represent the book-on-person condition by eagerly copying the selected
spells into `preparedSpells`. That can represent stale access after the book is
lost, death removes the book, or a new book is conjured with different
selections. Instead, keep the selected ids in one Book of Shadows access source
and derive effective prepared Warlock spell access from `(selected
pact_of_the_tome, current Book of Shadows presence)`.

The book lifecycle has strong connascence between the selected spell ids and
the current book identity. A later runtime should keep "conjure/reconjure Book
of Shadows" as one operation that replaces both the current book instance and
its selections. Do not expose a caller protocol where the book can be replaced
without replacing selections, or selections can be replaced without the book
appearing.

The battle runtime should only project Book of Shadows access for spells whose
Spell Invocation procedure is already supported. Pact of the Tome can grant
access to spells from any class list, but that is not the same as support for
every possible spell's execution. A supported Book of Shadows spell access
profile must therefore separate:

- access legality: selected spell id, cantrip/Ritual count constraints,
  already-prepared rejection, book-on-person condition, and Warlock-spell
  ability/source projection;
- invocation support: whether the selected Spell Definition has a promoted
  battle procedure.

## Spellcasting Focus Decision

The Book of Shadows Spellcasting Focus fact should remain attached to the same
Book of Shadows presence/access source, but it is not enough by itself to
justify promoted battle-runtime work today.

The promoted battle runtime currently does not have a general component
legality procedure for Material components, hand occupancy, Component Pouches,
or Spellcasting Focus substitution. Until that exists, the focus fact is a
character-sheet or future component-legality projection, not a battle behavior
slice. A later component task can consume one focus permission from the Book of
Shadows source without duplicating the selected spell list.

## Recommended Follow-Up Task

### SRDINV76F1 - Promote Pact of the Tome Book of Shadows Spell Access

Scope:

- project selected `pact_of_the_tome` invocation ownership into one Book of
  Shadows Spell Access source;
- represent exactly three cantrip selections and exactly two level-1
  ritual-tagged spell selections from class spell lists;
- reject selections that are already prepared when the Book of Shadows appears;
- derive effective prepared Warlock spell access only while the Book of
  Shadows is on the Warlock's person;
- expose supported selected cantrips and prepared level-1 Ritual spells through
  existing Spell Invocation procedures when those Spell Definitions are already
  supported;
- preserve ordinary Ritual casting rules for selected level-1 Ritual spells;
- attach the Book of Shadows Spellcasting Focus permission to the same
  book-presence source for future component legality.

Out of scope:

- implementing unsupported selected Spell Definitions just because Pact of the
  Tome can select them;
- copying selected Book of Shadows spells into ordinary prepared spell lists;
- modeling a generic inventory system or hand-occupancy/component legality
  system;
- treating one selected spell as representative support for Pact of the Tome.

## Plan Impact

- SRDINV76F can close as research complete.
- SRDINV78 can be unblocked. The level-1 Warlock invocation research frontier
  now has explicit boundaries for Pact of the Chain and Pact of the Tome.
- Add SRDINV76F1 only if the next queue wants a narrow Book of Shadows
  Spell Access slice before a general component/focus legality owner exists.
- SRDINV78 should not classify Pact of the Tome as supported from the
  `pact_of_the_tome` invocation option alone, from one selected spell alone, or
  from generic prepared-spell support alone.

## /simplify Convergence

- Round 1: rejected copying selected Book of Shadows spell ids into ordinary
  Warlock prepared spells. The book-on-person condition would then rely on a
  separate cleanup convention and could represent stale prepared access.
- Round 2: rejected reusing Wizard Ritual Adept as the direct runtime shape.
  Wizard Ritual Adept grants ritual casting from spellbook Spell Access without
  preparation; Pact of the Tome instead makes selected spells prepared while
  the Book of Shadows is on the Warlock's person.
