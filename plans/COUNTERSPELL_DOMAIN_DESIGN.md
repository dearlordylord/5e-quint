# Counterspell Domain Design

## Scope

This design is for promoting Counterspell into the active SRD 5.2.1 Surface,
Quint, battle-runtime, and wizard battle demo architecture. It is not an
implementation plan for archived runtime code, and it does not support archived
rules text as alternate behavior.

Fireball is only the battle-demo spell that makes the Counterspell chain useful
to exercise. Fireball is not part of Counterspell's rule model.

## Local RAW Anchors

- Counterspell:
  `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1185` through `:1196`.
  The trigger is a Reaction taken when the caster sees a creature within 60 feet
  casting a spell with Verbal, Somatic, or Material components. The target
  creature makes a Constitution saving throw. On failure, the triggering spell
  dissipates with no effect, the Action, Bonus Action, or Reaction used to cast
  it is wasted, and a triggering spell slot is not expended. A higher-level
  Counterspell automatically ends a spell whose level is equal to or less than
  Counterspell's cast level.
- Spell slot timing and slotless casting:
  `.references/srd-5.2.1/Spells/Gaining-and-Casting.md:44` through `:64`.
  A Spell Invocation can be slotted or slotless. Cantrips, rituals, special
  abilities, and magic items can cast without expending a spell slot.
- One slotted spell per turn:
  `.references/srd-5.2.1/Spells/Gaining-and-Casting.md:94` through `:100`.
  On a turn, a creature can expend only one spell slot to cast a spell, and
  Reaction spells are cast in response to their own Casting Time trigger.
- Reaction timing:
  `.references/srd-5.2.1/Playing-the-Game.md:326` through `:332` and
  `.references/srd-5.2.1/Rules-Glossary.md:814` through `:816`. A Reaction can
  occur on any creature's turn, including the reactor's own turn, and the
  reactor cannot take another Reaction until the start of their next turn.
- Ready:
  `.references/srd-5.2.1/Rules-Glossary.md:818` through `:826`. A readied
  spell is cast as normal when it is readied, resources are expended then, and
  the later Reaction releases the held energy.
- Ubiquitous language:
  `UBIQUITOUS_LANGUAGE.md` defines Reaction, Ready Action, Readied Spell
  Response, Spell Component, Spell Definition, Spell Access, Spell Invocation,
  Spell Effect, Base Spell Level, and Cast Level.

## Domain Decisions

Counterspell reacts to a **Spell Invocation being cast**, not to a spell effect
already resolving. The triggering invocation must be present enough to expose
its caster, Spell Definition, Components, Base Spell Level, Cast Level,
casting-time resource, and slotted-or-slotless resource path. It must not have
committed targets, saves, damage, active effects, object outcomes, or spell-slot
inventory expenditure yet.

Counterspell targets the **creature casting the triggering spell**. A Fireball
point, Fireball area, save target, damage target, or affected object is not a
Counterspell target and must not drive Counterspell eligibility.

The trigger component condition means **any** Verbal, Somatic, or Material
component on the triggering Spell Definition qualifies. A spell with none of
those components does not qualify. Counterspell itself has a Somatic component,
so an observable Counterspell invocation can trigger another Counterspell.

The visibility and range facts are battle facts about the reactor and the
triggering caster. They are not derivable from the triggering spell's affected
targets. The runtime should consume caller/table supplied facts equivalent to
"reactor can see triggering caster within 60 feet."

The Constitution saving throw belongs to the triggering caster. On a failed
save, the triggering Spell Invocation is countered: it dissipates with no
effect, its casting-time resource is wasted, and its slot is not expended if it
was slotted. On a successful save, the triggering Spell Invocation resumes and
can commit normally.

Counterspell's higher-level rule is an **automatic counter/end outcome**, not a
saving throw auto-success. The current Surface field name
`autoSuccessIfCasterSlotGte` should be renamed or restructured before promotion,
because "success" is ambiguous and, on a save gate, can read as the target
succeeding on the Constitution save. The domain fact is:
Counterspell automatically counters the triggering spell when Counterspell's
Cast Level is at least the triggering spell's level.

Slot inventory should use pending commitment, not spend/refund, for interrupted
spells. A slotted Spell Invocation being cast claims the slot it intends to use,
but the inventory expenditure is committed only if the invocation is not
countered. This avoids a false spell-slot expenditure that future triggers could
observe.

The one-slot-per-turn rule is about the current **Turn**, not only the current
turn actor. Reactions can happen on someone else's turn, so the runtime needs a
per-current-turn spell-slot use fact for every creature that attempts to expend
a spell slot during that turn. A pending slotted invocation counts as a
turn-slot claim while it is unresolved. If the invocation is countered, the
pending claim is released without committing an inventory expenditure. If the
invocation resumes, the claim becomes the committed spell-slot expenditure for
that creature on that turn.

That rule blocks the common self-recursive case under strict SRD 5.2.1: a
creature casting a slotted Fireball on its own turn already has a pending
slotted invocation, so it cannot expend another slot to Counterspell an enemy's
Counterspell during that same turn. A slotless triggering spell does not create
that slot claim, but Counterspell's own resource path still must be legal.

Counterspell does not state that non-slot resources are restored. If a slotless
special ability, magic item, or other non-slot resource needs restoration on a
countered Spell Invocation, that must come from that resource's own SRD text or
an explicit assumption. It is not part of Counterspell itself.

The casting-time resource is different from the spell slot. On a failed
Counterspell save, the triggering spell's Action, Bonus Action, or Reaction is
wasted even though the spell effect and spell-slot inventory expenditure do not
commit. For Counterspell itself, if it is countered by a nested Counterspell, its
Reaction is wasted and its slot is not expended.

Ready must be modeled at the SRD timing boundary. A readied spell is cast as
normal when the Ready Action is taken, so Counterspell can interrupt the spell at
that time if its trigger facts are present. The later Readied Spell Response
releases held energy with a Reaction; it is not a second casting of the spell
for Counterspell eligibility unless another SRD rule says so.

## Domain Objects

These are conceptual names for the spec and runtime design. The exact TypeScript
or Quint names can differ if they express the same domain facts.

`SpellBeingCast`

- triggering caster
- Spell Definition identity
- Spell Access/resource path used for this invocation
- Components from the Spell Definition
- Base Spell Level and Cast Level
- casting-time resource: Action, Bonus Action, Reaction, or longer casting
- slotted or slotless claim
- uncommitted invocation payload and continuation
- observer facts supplied by the battle/table projection

`CounterspellOpportunity`

- reactor
- triggering caster
- triggering `SpellBeingCast`
- reactor sees triggering caster
- triggering caster is within 60 feet of reactor
- triggering spell has at least one Verbal, Somatic, or Material component
- reactor has Reaction available
- reactor has Counterspell access and legal resource spend
- reactor has no current-turn slot claim that would make a slotted Counterspell
  illegal

`CounterspellInvocation`

- reactor as Counterspell caster
- triggering caster as save target
- Counterspell Cast Level
- Counterspell resource path
- save DC from the Counterspell caster
- automatic counter/end predicate from Counterspell Cast Level versus triggering
  spell level
- outcome: countered triggering invocation or resumed triggering invocation

`CurrentTurnSpellSlotUse`

- current turn identity
- creature with a pending or committed slot claim on that turn
- status: pending slotted invocation or committed spell-slot expenditure

The implementation should first search for an existing equivalent before adding
this state. The important domain invariant is that every creature's slot claim
on the current turn is represented once, whether the creature is the current
turn actor or an off-turn reactor.

`CounterspellChain`

- stack of interrupted `SpellBeingCast` invocations
- currently resolving Counterspell invocation
- continuation for resuming or dissipating each interrupted invocation

Prototype work used a spell-cast pending-interrupt window plus a spell stack
and returned to the prior window after resolving the nested Counterspell. That
is useful as shape inspiration only. The active model must be SRD 5.2.1 first
and must keep Quint and TypeScript in parity.

## Sequence Semantics

1. A creature starts casting a spell. The runtime creates `SpellBeingCast` with
   the chosen Spell Invocation and its uncommitted continuation.
2. The runtime records any pending slot claim needed for current-turn legality.
   This is not an inventory expenditure yet.
3. The runtime opens Counterspell opportunities for eligible observers of the
   triggering caster.
4. If every eligible reactor declines or has no legal choice, the triggering
   Spell Invocation commits: casting-time resource is spent, slot inventory is
   expended if slotted, effects resolve, and the current-turn slot claim becomes
   committed.
5. If a reactor casts Counterspell, the reactor spends its Reaction and creates
   a Counterspell `SpellBeingCast`. Because Counterspell has a Somatic
   component, that invocation can open another Counterspell opportunity before
   its own effect commits. If the Counterspell invocation is slotted, it also
   creates its own pending slot claim before nested opportunities are offered.
6. The chain resolves inward to outward. A Counterspell that is itself countered
   wastes its caster's Reaction, does not expend its slot, and has no effect on
   the spell it tried to interrupt.
7. An uncanceled Counterspell resolves against its triggering caster. If the
   automatic counter/end predicate applies, the triggering spell is countered
   without requesting the Constitution save. Otherwise, the triggering caster
   makes the Constitution save.
8. On a failed save, the interrupted spell dissipates with no effect, its
   casting-time resource is wasted, and its slot claim is released without
   inventory expenditure.
9. On a successful save, the interrupted spell resumes and commits normally.

## Existing Active-Runtime Implications

The current `spellCast` reaction frame is too target-oriented for Counterspell.
It carries `casterId`, `spellId`, and `targetIds`; Counterspell needs observer
facts about the triggering caster and the spell being cast. It cannot derive
eligible reactors from `targetIds`.

The current triggered reaction discovery treats `spellCast` reactors as the
frame's `targetIds`. That works for target-triggered reactions such as Shield's
Magic Missile case, but it is the wrong domain boundary for Counterspell.
Counterspell reactors are observers of the caster.

The runtime and promoted Quint spec should use a current-turn slot-use ledger
keyed by creature, with pending and committed states. Strict Counterspell needs
that fact to cover off-turn reactors as well as the current turn actor; a
single turn-wide boolean cannot express the domain rule.

The existing Surface Counterspell content is already useful for provenance,
trigger Components, range, save ability, and failure outcome, but the
higher-slot field name needs domain cleanup before runtime promotion.

## Implementation Order

1. Update `packages/battle-runtime/battle-runtime.qnt` first with
   `SpellBeingCast`, current-turn per-creature slot claims, and recursive
   Counterspell chain semantics.
2. Add package-local Quint tests for the domain cases below before translating
   the behavior into TypeScript.
3. Update battle-runtime TypeScript types and codecs to match the promoted
   Quint state and reaction frame shape.
4. Update reaction discovery so Counterspell opportunities come from observer
   facts about the triggering caster, while existing target-triggered reaction
   spells keep their own target facts.
5. Update Surface Counterspell projection language so the higher-slot rule is
   automatic counter/end, not saving throw auto-success.
6. Add focused TypeScript tests against the reducer.
7. Run battle-runtime MBT only after the behavior slice is complete.

## Required Test Cases

- Counterspell can interrupt a slotted Action spell cast by another creature
  when the reactor sees the caster within 60 feet and has a legal Reaction and
  resource spend.
- On failed Constitution save, the triggering spell has no effect, its
  casting-time resource is wasted, and its spell slot is not expended.
- On successful Constitution save, the triggering spell resumes and commits its
  normal effects and spell-slot expenditure.
- A higher-level Counterspell automatically counters a triggering spell whose
  level is equal to or lower than Counterspell's Cast Level, without requesting
  the Constitution save.
- Counterspell itself opens a `SpellBeingCast` opportunity because it has a
  Somatic component, allowing a recursive chain.
- If a nested Counterspell counters an outer Counterspell, the outer
  Counterspell's Reaction is wasted, its slot is not expended, and the spell it
  tried to interrupt resumes.
- A creature casting a slotted Fireball on its own turn cannot spend another
  spell slot to Counterspell an enemy Counterspell during that same turn.
- An off-turn reactor can cast a slotted Counterspell during the current turn if
  that creature has no current-turn slot claim, even if it expended a slot on a
  previous turn.
- The same off-turn reactor cannot create a second slotted Counterspell claim
  during the same current turn. Reaction economy should normally block this too,
  but the slot rule must remain independently true.
- A slotless triggering Spell Invocation can be countered; Counterspell produces
  no spell-slot inventory restoration for that triggering invocation.
- A non-slot resource is not restored by Counterspell unless that resource has
  its own SRD-backed restoration rule.
- A readied spell opens the Counterspell opportunity when it is readied, because
  that is when it is cast as normal. The later held-energy release is not a
  second Counterspell trigger.

## Verification

- RAW check: every Counterspell behavior above must trace to the local SRD
  anchors in this document before implementation.
- Ubiquitous-language check: implementation names should keep Spell Definition,
  Spell Access, Spell Invocation, Spell Effect, Base Spell Level, Cast Level,
  Spell Component, Reaction, Ready Action, and Readied Spell Response distinct.
- No-redundant-state check: before adding current-turn slot-use state, search
  Surface, battle-runtime, Quint, and bridge code for an equivalent fact. If an
  equivalent exists, thread or project it instead of duplicating it.
- Connascence check: the reaction frame shape, Quint variants, TypeScript
  codecs, reaction discovery, and MBT bridge mappings must change together.
- Reviewer check: run RAW/domain and implementation reviewers on the
  Counterspell implementation diff, fix reasonable findings, and repeat until no
  reasonable fixes remain.
- `/simplify` convergence: after significant implementation, run at least two
  rounds and continue until no important issues remain.
