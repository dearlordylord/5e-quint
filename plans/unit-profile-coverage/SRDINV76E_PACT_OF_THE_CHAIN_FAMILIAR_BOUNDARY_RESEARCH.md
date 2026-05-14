# SRDINV76E Pact of the Chain Familiar Boundary Research

Task 294 reviewed Pact of the Chain's Find Familiar and familiar attack
boundary. No runtime behavior was implemented in this task.

## Source Review

Local RAW sources checked:

- `.references/srd-5.2.1/Classes/Warlock.md` lines 280-286 for Pact of the
  Chain.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md` lines 296-315 for Find
  Familiar.
- `.references/srd-5.2.1/Rules-Glossary.md` lines 53-61 for Action, 75-77 for
  Ally, 102-112 for Attack action and Attack Roll, 138-140 for Bonus Action,
  630-634 for Initiative, 698-702 for Magic action, and 814-816 for Reaction.
- `UBIQUITOUS_LANGUAGE.md` lines 220-244 for Spell Access, Spell Invocation,
  Spell Effect, Pact Slot, Ritual, and spell ownership terms.
- `UBIQUITOUS_LANGUAGE.md` lines 359-369 for Character Sheet, Stat Block,
  monster, creature, and battle-state ownership terms.

Relevant RAW facts:

- Pact of the Chain teaches Find Familiar and lets the Warlock cast it as a
  Magic action without expending a Spell Slot.
- Find Familiar's printed Spell Definition is a level-1 Wizard conjuration
  with 1 hour or Ritual casting time, 10-foot range, consumed material
  components worth 10+ GP, and instantaneous duration.
- Find Familiar creates a familiar in an unoccupied space within range. The
  familiar uses the chosen form's statistics from Monsters, but its creature
  type is Celestial, Fey, or Fiend by the caster's choice.
- The normal familiar forms are Bat, Cat, Frog, Hawk, Lizard, Octopus, Owl,
  Rat, Raven, Spider, Weasel, or another Beast with Challenge Rating 0. Pact of
  the Chain additionally permits Imp, Pseudodragon, Quasit, Skeleton, Sphinx of
  Wonder, Sprite, or Venomous Snake.
- A Find Familiar familiar is an ally, rolls its own Initiative, acts on its
  own turn, obeys commands, cannot attack, but can take other actions normally.
- Find Familiar owns telepathic communication, shared senses as the caster's
  Bonus Action, touch-spell delivery using the familiar's Reaction, temporary
  or permanent dismissal, reappearance after a Magic action, equipment left
  behind on disappearance, and the one-familiar replacement rule.
- Pact of the Chain adds a specific exception to the no-attack rule: when the
  Warlock takes the Attack action, the Warlock can forgo one of their own
  attacks to allow the familiar to make one attack of its own with its Reaction.

## Existing Boundary

`packages/character-creation-runtime/src/eldritch-invocations.ts` already
models `pact_of_the_chain` as a legal level-1 Eldritch Invocation choice with
no prerequisites. That is character-creation ownership only; it does not make
the invocation battle-supported.

`packages/surface/content/find_familiar.{dhall,json}` already installs
`find_familiar` as a `spawned_creature` Spell Definition. The Dhall source
explicitly marks the inlined stat block as a placeholder because RAW points to
the chosen form's monster statistics. That warning is the important boundary:
Pact of the Chain must not add a second Warlock-owned copy of familiar AC, HP,
speeds, senses, attacks, initiative, or action resources.

The promoted battle runtime already has creature state, caller-supplied
Initiative, action economy, Reaction availability, Stat Block attacks, and
selected character Unit projection. It does not yet have a generic companion
owner that can attach a summoned creature to a summoner while preserving the
companion's own turn, Reaction, action list, disappearance, and replacement
lifecycle.

## Boundary Decision

Split Pact of the Chain into Spell Access plus companion runtime. Do not model
it as a Warlock feature state object that stores a familiar.

The Warlock-owned fact is selected `pact_of_the_chain`. From that fact, project
one Spell Access record for Find Familiar with a Pact-of-the-Chain invocation
mode:

- Spell Definition id: `find_familiar`.
- Access owner: the Warlock.
- Invocation cost override: Magic action, no Spell Slot spend.
- Component requirements: still use Find Familiar's Spell Definition
  components, including the consumed material component, unless a future RAW
  source explicitly removes them.
- Form eligibility override: normal Find Familiar forms plus the seven Pact of
  the Chain special forms.

The companion owner, not the Warlock invocation state, must own the familiar
instance created by the Spell Invocation:

- familiar identity and owner/summoner link;
- chosen form reference to a monster/stat-block catalog entry or other typed
  creature-stat source;
- Celestial, Fey, or Fiend creature-type override chosen at invocation time;
- ally side relationship;
- caller-supplied Initiative and independent turn ownership;
- familiar action and Reaction availability;
- temporary dismissal, reappearance, 0-HP disappearance, permanent dismissal,
  carried/worn item drop, and one-familiar replacement.

The special forms should be modeled as eligible form references, not as copied
stat blocks on the invocation. Mixed support must be unrepresentable at the
collection boundary: if a supported Pact of the Chain form set is claimed, each
form in that set must resolve to the exact SRD Stat Block or chosen normal-form
CR-0 Beast projection required by the companion owner. Today the Surface
content appears to include a Skeleton Stat Block but not the other named
special forms, so a runtime promotion should not claim full special-form
support until those entries have a typed catalog boundary.

## Familiar Attack Boundary

The Attack-action exception is not ordinary Find Familiar behavior. It should
be a Pact of the Chain companion-command procedure discovered while resolving
the Warlock's Attack action.

Required executable facts:

- the actor has selected `pact_of_the_chain`;
- the actor is taking the Attack action and has at least one own attack from
  that Attack action that can be forgone;
- the actor has a present familiar owned by the companion runtime;
- the familiar can take a Reaction;
- the familiar has a supported attack option from its chosen form;
- caller/table target facts satisfy that familiar attack's own reach/range and
  targeting requirements.

Resolution should spend exactly one Warlock Attack-action attack opportunity
and the familiar's Reaction, then resolve the familiar's own attack through the
same attack machinery used by other creature/stat-block attacks. The attack
does not spend the familiar's action and does not happen on the familiar's
turn. This is the narrow RAW exception to "A familiar can't attack"; it should
not make Find Familiar familiars generally attack-capable.

This procedure has strong connascence between the Warlock Attack-action attack
count and the familiar Reaction spend. Keep those facts in one companion-command
operation. Do not expose a caller protocol where one reducer first subtracts a
Warlock attack and a later independent reducer optionally spends the familiar
Reaction; that can represent invalid half-completed states.

## Recommended Follow-Up Task

### SRDINV76E1 - Promote Pact of the Chain Find Familiar Access Boundary

Scope:

- project selected `pact_of_the_chain` into Find Familiar Spell Access;
- expose a Magic-action, no-Spell-Slot Find Familiar Spell Invocation;
- preserve Find Familiar's material component and consumed-cost facts;
- represent familiar form selection as references to normal Find Familiar forms
  plus Pact of the Chain special forms;
- keep created familiar instance state behind the companion runtime boundary;
- reject full special-form support unless the referenced SRD Stat Blocks or
  chosen normal-form CR-0 Beast projections are present in the companion
  catalog boundary.

Out of scope:

- implementing generic companion lifecycle;
- implementing familiar turns, disappearance, dismissal, shared senses, or
  touch-spell delivery;
- implementing the Pact of the Chain Attack-action exception.

### SRDINV76E2 - Promote Pact of the Chain Familiar Reaction Attack

Scope:

- after a companion owner exists, add the Warlock Attack-action forgo-one-attack
  procedure;
- require a present owned familiar with Reaction availability and a supported
  attack option;
- resolve the familiar's attack through existing creature/stat-block attack
  machinery;
- atomically spend the Warlock's forgone Attack-action attack and the
  familiar's Reaction.

Out of scope:

- making all Find Familiar familiars generally attack-capable;
- duplicating familiar action, Initiative, HP, form, or disappearance state on
  the Warlock;
- deriving target legality, reach, or range from map geometry rather than
  caller/table-supplied facts.

## Plan Impact

- SRDINV76E can close as research complete.
- SRDINV78 should remain blocked until SRDINV76F also completes, but it can use
  this note to classify Pact of the Chain as unresolved companion/spell-access
  work rather than as support from the authored `find_familiar` record alone.
- Add SRDINV76E1 only if the next queue wants a narrow Spell Access and form
  eligibility slice before a full companion runtime exists.
- Add SRDINV76E2 only after a companion owner can represent familiar turns,
  present/dismissed state, Reaction availability, and stat-block attacks.

## /simplify Convergence

- Round 1: rejected treating Surface `find_familiar` catalog admission as Pact
  of the Chain support. Pact of the Chain changes Spell Access, casting
  resource, form eligibility, and the attack boundary.
- Round 2: rejected storing familiar runtime facts in Warlock feature state.
  Familiar identity, form stats, Initiative, actions, Reaction, disappearance,
  and one-familiar replacement must live in the companion owner.
