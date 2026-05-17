# Fireball and Counterspell Wizard Battle Promotion Plan

## Purpose

Move the old six-wizard Fireball/Counterspell battle idea out of `packages/v0`
restore-source material and into the active Surface + `@dnd/battle-runtime`
architecture without importing `@dnd/v0` or preserving its React/runtime model.

## Current Worktree Slice

This worktree keeps the safe first step small:

1. Make Fireball's authored Surface record match the local SRD 5.2.1 passage,
   including unattended flammable-object ignition.
2. Add Fireball to the active SRD Unit catalog.
3. Record the promotion path for Fireball runtime support, recursive
   Counterspell, and the wizard battle demo.

It intentionally does not add battle-runtime Fireball execution yet. Fireball's
creature damage is simple, but full SRD promotion also needs the object ignition
clause to be executable at the runtime boundary that matters. It also
intentionally does not open a `spellCast` reaction window for save-gated damage:
Counterspell must interrupt before target/save/damage outcomes are committed.

## RAW Anchors

- Fireball:
  `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Fireball` gives the
  150-foot range, 20-foot-radius Sphere, Dexterity save, 8d6 Fire damage, half
  damage on success, unattended flammable-object ignition, and +1d6 per slot
  level above 3.
- Counterspell:
  `.references/srd-5.2.1/Spells/Descriptions-A-D.md#Counterspell` gives the
  Reaction trigger, 60-foot range, S component, Constitution save,
  negate-on-fail behavior, slot refund for the interrupted spell, and
  higher-slot automatic ending rule.
- Spell casting resource timing:
  `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`, especially spell slots,
  higher-level slots, casting time, and the SRD 5.2.1 "One Spell with a Spell
  Slot per Turn" rule.
- Edition boundary:
  the project models SRD 5.2.1 only. Archived rules corpora are reference
  material for migration/history and are not supported behavior for promoted
  Surface, battle-runtime, Quint, or demo work.
- Saving throw damage:
  `.references/srd-5.2.1/Playing-the-Game.md#Saving-Throws-and-Damage`,
  including one damage roll for all targets of the same simultaneous
  saving-throw damage effect.
- Reaction timing and Ready:
  `.references/srd-5.2.1/Playing-the-Game.md#Reactions` and
  `.references/srd-5.2.1/Rules-Glossary.md#Ready`.
- Ubiquitous language:
  `UBIQUITOUS_LANGUAGE.md` defines Spell Invocation, Cast Level, Base Spell
  Level, Spell Component, and reaction/resource terms used by the implementation
  design.

## Implementation Path

### Phase 1A: Fireball Surface Promotion

- Keep Fireball's provenance as SRD 5.2.1.
- Author Fireball as one save-gate phase and one direct object-ignition phase
  over the same point-origin Sphere attachment.
- Add `fireball.json` to `srdUnitCollection`.
- Add Surface catalog tests that prove the SRD object-ignition clause remains in
  the catalog projection.

### Phase 1B: Fireball Runtime Projection

- Update the authoritative promoted battle-runtime Quint spec before changing
  TypeScript behavior.
- Add a Fireball save-gated damage invocation with 20-foot point-origin Sphere
  targeting, 150-foot range, 8d6 Fire damage, +1d6 per slot level above 3, and
  half damage on successful Dexterity saves.
- Add a typed Fireball area projection for unattended flammable-object ignition.
  Do not silently ignore object ignition; consume caller/table supplied object
  facts and emit `objectIgnitions` outcomes, following the existing Fire Bolt
  object-ignition boundary.
- Keep the runtime shape generic where the domain permits, but keep the
  canonical SRD pattern check close to the object-ignition projection so the
  supported behavior cannot drift away from the authored Fireball clause.
- Add focused tests for catalog admission, runtime admission, one shared Fire
  damage roll, half damage on successful saves, slot spend, upcast dice, and
  object ignition outcomes.

### Phase 1C: Fireball Aliases From Magic Items

- Decide whether magic items that say they cast or detonate as Fireball consume
  the standalone Fireball projection or own a separate magic-item invocation
  projection.
- Update Necklace of Fireballs, Wand of Fireballs, Staff of Fire, and Staff of
  Power together so Fireball damage, level, save DC, object ignition, and
  resource spend cannot drift by item.
- Until that alias policy lands, do not use magic-item Fireball records as proof
  that standalone Fireball runtime execution is complete.

### Phase 2: Counterspell Design

Do this collaboratively before code changes. The domain design lives in
`plans/COUNTERSPELL_DOMAIN_DESIGN.md`; keep that document strict to SRD 5.2.1
and update it before runtime implementation when the model changes.

The design has to settle these domain questions before implementation:

- What does "a creature that you can see within range casts a spell with
  components" mean as a battle fact? Candidate domain facts are triggering
  creature, observer visibility, range within 60 feet, the triggering spell's
  Components, and whether the spell is being cast rather than merely taking
  effect.
- What is the target of Counterspell? RAW targets the creature casting the spell,
  not the affected creatures or area of the triggering spell. The design must
  avoid using Fireball's affected targets, save targets, or chosen point as
  Counterspell eligibility facts.
- What does "the target must succeed on a Constitution saving throw or the spell
  is countered" mean as an interrupted spell invocation? The interrupted spell
  should be present enough to be observed and countered, but not yet have applied
  target outcomes, saving throws, damage, active effects, or object outcomes.
- What does "If that spell was cast with a spell slot, the slot isn't expended"
  mean for the interrupted spell invocation? Prefer a domain model where the
  interrupted slotted spell has not committed slot expenditure yet; use
  technical spend/refund only if future spell-slot-expenditure triggers cannot
  observe a false spend. Non-slot resource refunds are not stated by the local
  SRD Counterspell text and need their own source before modeling.
- What exactly is the higher-slot Counterspell rule called? The current Surface
  `autoSuccessIfCasterSlotGte` wording may be wrong domain language because RAW
  says the spell "is automatically countered" when Counterspell is cast with a
  spell slot equal to or higher than the triggering spell's level.
- How does SRD 5.2.1 "One Spell with a Spell Slot per Turn" constrain
  same-turn reaction Counterspell? A creature that has already expended a spell
  slot on its turn cannot expend another spell slot on Counterspell during that
  same turn. Slotless spell casts remain governed by their own access/resource
  facts.
- How do multiple Counterspells form a reaction chain? The old v0 lane modeled a
  `PISpellCast` window, pushed the interrupted spell onto a spell stack when
  Counterspell was cast, and returned to the prior Counterspell window after
  resolving the nested one. Use this as inspiration only; the active promoted
  runtime needs its own SRD 5.2.1-aligned continuation model and Quint parity.
- How does Ready share the "spell is being cast" trigger without changing the
  Counterspell target? Ready may react to spell-cast timing, but Counterspell
  eligibility remains about the triggering caster and observable Components, not
  about affected targets.

### Phase 3: Counterspell Runtime Implementation

- Update the authoritative promoted battle-runtime Quint spec before changing
  TypeScript behavior.
- Project Counterspell from Surface into a triggered reaction spell invocation;
  do not branch on the authored spell id in resolution.
- Open an interruptible `spellCast` frame before the triggering spell commits
  target outcomes, saving throws, damage rolls, active effects, or slot
  expenditure.
- Put only Counterspell-relevant facts in the frame: triggering caster,
  triggering spell identity, triggering spell Components, Base Spell Level, Cast
  Level, visibility/range facts, whether the invocation is using a spell slot,
  and a continuation for the uncommitted triggering spell.
- Add Counterspell reaction choices from the same reaction-choice pipeline used
  by Shield, Hellish Rebuke, Feather Fall, and Ready.
- Resolve Counterspell as a spell cast itself, so its S component opens another
  `spellCast` frame and recursive Counterspell chains are ordinary reaction
  stack behavior.
- Commit the triggering spell only after the interrupt stack resolves.

### Phase 4: Wizard Battle Demo Projection

- Build a battle-ready projection with six level-5 Wizard-like combatants,
  prepared Fireball/Counterspell, and the needed spell slots.
- Do not wait for full legal level-up UI. The projection should be a typed
  battle input until character creation can produce the same facts.
- Recreate the old v0 scenario as an active runtime demo: Fireball slingers plus
  Counterspell-capable reactors, including the recursive chain that used to be
  E -> B -> F -> C.
- Wire the React battle scene to the active `@dnd/battle-runtime` projection,
  not to v0.

### Phase 4B: Full Demo Parity

The current promoted React demo is a compact opening exchange, not the full old
script. It shows 12 authored playback beats:

- battle joined;
- Laser Wizard starts Fireball;
- four Counterspell opportunity/cast pairs for the E -> B -> F -> C chain;
- Fireball resumes;
- one saving-throw/damage resolution.

The old quarantined `packages/v0/src/demo/fireball-battle.ts`
`FIREBALL_BATTLE` script has 149 machine events:

- 1 `BATTLE_INIT`;
- 34 `BATTLE_START_TURN`;
- 34 `BATTLE_END_TURN`;
- 6 `BATTLE_CAST_AOE`;
- 14 `BATTLE_RESOLVE_COUNTERSPELL`;
- 22 `BATTLE_RESOLVE_AOE_TARGET`;
- 18 `BATTLE_RESOLVE_SAVE_FAILED_REACTION`;
- 20 `BATTLE_AFTER_DAMAGE_DECLINE`.

That 149-event count is a complete scripted duel: the opening Fireball,
Counterspell chain, a return Fireball, later Shatters and Fireballs, reaction
passes, after-damage passes, knockouts, death saves, deaths, and stabilization.
It is not equivalent to the promoted demo's current first Fireball slice.

If the promoted demo also exposes runtime holes as visible playback beats
instead of collapsing filled holes into one narrated result, the full promoted
demo should have more than 149 visible steps. The old v0 script counted one
machine event per explicit driver event; it did not separately surface every
current runtime hole such as spell-cast reaction fact fill, reaction decision,
saving throw outcome, or grouped damage roll fill.

## Verification

- RAW agent check before each modeled rule: cite the exact local SRD passage and
  confirm the Surface record, Quint spec, runtime projection, and tests all trace
  to that passage.
- Ubiquitous-language check before implementation: confirm names and runtime
  facts use `UBIQUITOUS_LANGUAGE.md` terms for Spell Invocation, Cast Level, Base
  Spell Level, Spell Component, and reaction/resource ownership.
- Architecture/domain/connascence review after implementation: check that
  Surface content, runtime projections, Quint variants, bridge mappings, tests,
  and demo projections do not duplicate spell facts or depend on distant
  same-value conventions.
- Code-review pass after implementation: run a review focused on behavioral
  regressions, missing tests, typed-failure boundaries, and project-specific
  review rules.
- Reviewer convergence: run at least one RAW/domain reviewer and one
  implementation reviewer on the diff, fix reasonable findings, and repeat the
  RAW, ubiquitous-language, architecture/domain/connascence, and code-review
  passes until no reasonable fixes remain.
- `/simplify` convergence after significant Counterspell implementation: run at
  least two rounds and continue until no important issues remain.
- Current Surface slice:
  `pnpm --filter @dnd/surface test -- src/surface/unit-catalog.test.ts`.
- Typecheck:
  `pnpm --filter @dnd/surface typecheck`.
- Fireball runtime slice:
  add focused runtime tests and run them with
  `pnpm --filter @dnd/battle-runtime exec vitest run <fireball-runtime-test>`.
- Counterspell slice:
  add focused tests for failed-save negation, successful-save no negation,
  higher-slot automatic ending, triggering spell slot refund, Counterspell's own
  slot spend/refund, recursive Counterspell chains, reaction economy, and the
  strict SRD 5.2.1 same-turn spell-slot restriction.
- MBT:
  run the promoted battle-runtime MBT only after completed behavior changes, one
  run at a time, using the repo's timing and seed protocol.
