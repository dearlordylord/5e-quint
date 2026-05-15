# SRDINV84I Find Familiar Companion Runtime Split Research

Task 315 reviewed Find Familiar's companion boundary. No runtime behavior was
implemented in this task.

## Source Review

Local RAW sources checked:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md` lines 296-315 for Find
  Familiar's casting facts, chosen form, type override, telepathic connection,
  touch-spell delivery, combat participation, disappearance, and one-familiar
  replacement.
- `.references/srd-5.2.1/Classes/Warlock.md` lines 280-286 for Pact of the
  Chain's Spell Access, special forms, and attack exception.
- `.references/srd-5.2.1/Rules-Glossary.md` lines 53-61 for Action, 75-77 for
  Ally, 102-112 for Attack action and Attack Roll, 138-140 for Bonus Action,
  630-634 for Initiative, 698-702 for Magic action, 814-816 for Reaction, and
  1024-1030 for Telepathy.
- `UBIQUITOUS_LANGUAGE.md` lines 23-32 for action lifecycle and Magic Action,
  151-166 for turn structure and Reaction, 227-244 for Spell Definition,
  Spell Access, Spell Invocation, and Spell Effect ownership, and 314-323 for
  Creature, Monster, Stat Block, Creature Type, and Challenge Rating.
- `plans/unit-profile-coverage/SRDINV76E_PACT_OF_THE_CHAIN_FAMILIAR_BOUNDARY_RESEARCH.md`
  for the prior Pact of the Chain Spell Access versus companion runtime split.

Relevant RAW facts:

- Find Familiar is a level-1 Wizard Spell Definition with 1 hour or Ritual
  casting time, 10-foot range, consumed material components worth 10+ GP, and
  instantaneous duration.
- The spell creates a familiar in an unoccupied space within range. The
  familiar is a spirit taking a chosen animal form: Bat, Cat, Frog, Hawk,
  Lizard, Octopus, Owl, Rat, Raven, Spider, Weasel, or another CR 0 Beast.
- The familiar uses the chosen form's statistics from Monsters, but its
  Creature Type is the caster's choice of Celestial, Fey, or Fiend instead of
  Beast.
- The familiar acts independently, obeys the caster's commands, is an ally to
  the caster and the caster's allies, rolls its own Initiative, and acts on its
  own turn.
- A familiar cannot attack, but can take other actions normally.
- Within 100 feet, the caster can communicate telepathically with the familiar.
  As a Bonus Action, the caster can see and hear through the familiar's senses
  until the start of the caster's next turn and gains the benefits of the
  familiar's special senses.
- When the caster casts a spell with range Touch, the familiar can deliver the
  touch if within 100 feet and if the familiar takes a Reaction when the spell
  is cast.
- At 0 Hit Points the familiar disappears and reappears only after the caster
  casts Find Familiar again. The caster can use a Magic action to temporarily
  dismiss the familiar to a pocket dimension, dismiss it forever, or cause a
  temporarily dismissed familiar to reappear in an unoccupied space within 30
  feet. When the familiar drops to 0 Hit Points or disappears into the pocket
  dimension, it leaves behind anything it was wearing or carrying.
- The caster cannot have more than one familiar. Recasting while the caster
  has a familiar changes that familiar into a new eligible form.
- Pact of the Chain is Spell Access plus form widening and an attack exception:
  the Warlock learns Find Familiar, can cast it as a Magic action without
  expending a Spell Slot, can choose normal or listed special forms, and can
  forgo one attack from the Attack action so the familiar makes one attack of
  its own with its Reaction.

## Existing Boundary

`packages/surface/content/find_familiar.dhall` and the generated JSON install
Find Familiar as a `spawned_creature` Spell Definition. The Dhall source states
that RAW does not inline a stat block and that the current inline Owl-like
values are a placeholder needed by the existing shape. That placeholder must
not become promoted runtime evidence for familiar AC, HP, Speed, senses,
actions, attacks, or Initiative.

`packages/character-battle-runtime/src/battle-character-build-projection.ts`
and `packages/battle-runtime/src/character-battle-resources.ts` already project
selected Pact of the Chain into a `pactOfTheChainFindFamiliar` Spell Access
state with no-slot Magic-action invocation mode and normal plus special form
eligibility. Existing battle-runtime tests assert that this Spell Access does
not discover a Find Familiar battle act. That is the correct current boundary:
Spell Access exists, companion lifecycle execution does not.

The promoted battle runtime already has combatants, caller-supplied
Initiative, action and Reaction resources, spell invocation state, and
Stat-Block-backed attacks. It does not yet have a Find Familiar companion
owner that can attach a creature instance to a caster while preserving the
companion's own stat source, turn, action economy, Reaction, disappearance
state, and one-familiar replacement invariant.

## Boundary Decision

Do not implement Find Familiar as a regular spell effect attached to the
caster, and do not store familiar runtime facts in Warlock invocation state.
The spell invocation creates or changes a companion creature. The companion
owner owns familiar identity, form statistics, Creature Type override,
presence, Initiative, turn ownership, action and Reaction availability, and
replacement lifecycle.

Represent the familiar form as a reference to a typed creature-stat source,
not as copied spell data:

- normal named forms are the eleven named Monster/Stat Block references;
- "another CR 0 Beast" is an eligibility rule over the same stat-block catalog,
  not an open untyped string;
- Pact of the Chain special forms are additional eligible Stat Block
  references, not a separate copied form table;
- the Celestial/Fey/Fiend choice is an invocation-time Creature Type override
  on the companion instance, not a mutation of the canonical Stat Block.

Mixed support should be unrepresentable at the supported collection boundary.
A runtime slice may support only a closed subset of named forms, but any
claimed supported form must resolve to exactly one SRD Stat Block or a typed
CR-0-Beast catalog entry. Do not claim support from the current inline
placeholder.

Represent familiar lifecycle as one discriminated companion state owned by the
companion runtime only while there is an active familiar record:

- `present`: has battle participant identity, owner link, chosen form
  reference, Creature Type override, Hit Points, Initiative, turn/action
  resources, and location facts supplied by the caller/table;
- `temporarilyDismissed`: keeps owner link and chosen form but has no battle
  participant space, turn, actions, or Reaction until reappearing;
- `zeroHitPointDisappeared`: records that reappearance requires recasting Find
  Familiar rather than a Magic-action return.

Permanent dismissal should clear the active familiar record. Do not retain a
forever-dismissed companion state; absence is represented by no active
familiar, and only the three states above carry executable lifecycle facts.

Recasting while the caster has a familiar should be one operation that replaces
the existing companion's eligible form and Creature Type override. It should
not create a second familiar and then clean up the first.

The item-drop rule should be modeled as a boundary event emitted when a present
familiar drops to 0 Hit Points or enters the pocket dimension. The promoted
runtime should not invent generic inventory execution for this task; it only
needs to preserve the executable fact that worn/carried items are left in the
familiar's space when disappearance occurs.

## Runtime Slices

### SRDINV84I1 - Promote Find Familiar Form Catalog Boundary

Scope:

- replace runtime use of the inline placeholder with typed form references;
- define the normal named forms and CR-0-Beast eligibility against the
  Stat Block/monster catalog boundary;
- include the Celestial/Fey/Fiend Creature Type override as invocation input;
- keep Pact of the Chain special forms as additional references where their
  SRD Stat Blocks exist.

Out of scope:

- creating a familiar in battle state;
- companion turns, actions, Reaction, dismissal, or item-drop execution;
- generic summon/pet architecture for other spells.

### SRDINV84I2 - Promote Find Familiar Lifecycle and Replacement

Scope:

- cast Find Familiar into a companion-owned familiar state with owner link,
  chosen form reference, Creature Type override, unoccupied-space placement
  facts, and caller-supplied Initiative;
- enforce one familiar per caster;
- implement recast form replacement as one atomic transition;
- implement 0-HP disappearance, temporary dismissal, permanent dismissal as
  active-record removal, Magic-action reappearance within 30 feet, and
  item-drop boundary events.

Out of scope:

- telepathic communication, shared senses, touch-spell delivery, and Pact of
  the Chain attack exception;
- deriving unoccupied spaces, carrying inventory, or movement geometry.

### SRDINV84I3 - Promote Familiar Turn and No-Attack Action Gate

Scope:

- make a present familiar an ally combatant with its own Initiative and turn;
- give it ordinary action and Reaction resources owned by the familiar, not the
  caster;
- allow non-attack actions where the promoted runtime already supports them;
- reject ordinary familiar attacks from Find Familiar.

Out of scope:

- Pact of the Chain's forgo-one-attack exception;
- adding generic command AI or automatic behavior from "obeys your commands";
- deriving target legality from map geometry.

### SRDINV84I4 - Promote Telepathic Connection and Touch-Spell Delivery

Scope:

- project the 100-foot telepathic communication fact without requiring shared
  language;
- implement the caster Bonus Action that shares the familiar's sight, hearing,
  and special-sense benefits until the start of the caster's next turn;
- implement Touch-range spell delivery as one spell-invocation procedure that
  requires a present familiar within 100 feet and atomically spends the
  familiar's Reaction when the caster casts the Touch spell.

Out of scope:

- full perception, map visibility, or sensory rendering;
- delivering non-Touch spells;
- a caller protocol where the caster cast and familiar Reaction spend can
  diverge.

### SRDINV84I5 - Promote Pact of the Chain Familiar Reaction Attack

Scope:

- require selected Pact of the Chain, a present owned familiar, and a supported
  familiar attack option from the chosen form;
- while resolving the Warlock's Attack action, atomically forgo one of the
  Warlock's own Attack-action attacks and spend the familiar's Reaction;
- resolve the familiar's attack through the existing Stat Block attack
  machinery.

Out of scope:

- making non-Pact Find Familiar familiars attack-capable;
- spending the familiar's action or requiring the familiar's turn;
- copying familiar attacks into Warlock feature state.

## Connascence Checks

- Form names, CR eligibility, and special-form references must change together
  with the Stat Block catalog. Keep them in one form-resolution module or typed
  catalog boundary.
- Recasting and one-familiar replacement are identity/lifecycle connascence:
  the transition must replace the existing familiar atomically rather than
  relying on separate create and cleanup operations.
- Touch-spell delivery couples caster spell invocation, 100-foot table fact,
  and familiar Reaction spend. Keep this in one procedure.
- Pact of the Chain's attack exception couples the Warlock Attack-action attack
  count and the familiar Reaction spend. Keep this in one companion-command
  operation.
- Dismissal and item-drop facts must be colocated so a present familiar cannot
  disappear without emitting the drop boundary event.

## Plan Impact

- SRDINV84I can close as research complete.
- SRDINV85 should be unblocked and should decide whether the next queue
  promotes the form catalog boundary first or starts with a narrower lifecycle
  slice.
- Future implementation must not treat the existing Surface `find_familiar`
  inline placeholder as battle-runtime support evidence.
- Future implementation should preserve SRDINV81's Pact of the Chain Spell
  Access result and attach companion execution beneath Find Familiar
  invocation, not beneath Warlock invocation state.

## /simplify Convergence

- Round 1: split the Find Familiar gap into form catalog, lifecycle,
  independent familiar turn/action ownership, telepathy/touch delivery, and
  Pact of the Chain attack exception. This rejected a single broad "summon pet"
  task because most required facts are Find-Familiar-specific.
- Round 2: rejected storing familiar state in Spell Access or Warlock feature
  state. Spell Access only explains how the caster may invoke Find Familiar;
  the familiar itself is a companion creature with its own stat source,
  Initiative, turn, action resources, Reaction, presence state, and lifecycle.
