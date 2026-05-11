# Battle Runtime QNT Split Migration Research

Date: 2026-05-11

Status: historical migration note. The vertical inventory requested by this
note has been completed and retired. Current guidance lives in
`plans/BATTLE_RUNTIME_QNT_TS_CONNECTIVITY.md` and
`packages/battle-runtime/ARCHITECTURE_GRAPH.md`.

This is a temporary research and migration-orientation note. It is not the
steady-state architecture document. It records the current evidence around
`packages/battle-runtime/battle-runtime.qnt`, the likely split direction, and
questions that should be answered while the split happens.

The wording here is intentionally tentative. The migration is expected to reveal
more about which procedure seams are real, which integrations still need broad
state, and which current rule-core modules are deep enough to own semantics.

## Current Evidence

`battle-runtime.qnt` is not currently shrinking. Git history shows a broad
canonical spec that has grown quickly:

- 2026-04-30 `625db25a` chose the canonical battle QNT spec at 523 lines.
- 2026-05-06 `e0a98372` had grown it to 2,488 lines.
- 2026-05-11 `c28c5a0e` has it at 5,778 lines.
- 2026-05-11 `f10e718a` has it at 5,954 lines after the Sleep target
  admission promotion.

The commit stream is mostly restore/promote work:

- restore commits for death saves, save-gate spells, persistent concentration,
  reaction windows, movement, monster resources, grapples, hidden actions,
  active ongoing feature riders, attack riders, stat-block Multiattack, and
  Magic Missile;
- promotion commits for direct healing spells, Extra Attack, Roving, Adrenaline
  Rush, Deflect Attacks, pure spell damage, spell attacks, cones, Ice Knife,
  Chromatic Orb, scalar buffs, Produce Flame, Divine Favor, Hunter's Mark,
  Protection/Charm, Heroism, Faerie Fire, Resistance, Divine Smite, Ensnaring
  Strike, Searing Smite, True Strike, and Starry Wisp object targeting.

Rule-core and focused MBT lanes also exist and are growing. As of this note, the
rule-core proof and battle-runtime focused MBT files together are about 12K+
lines. That is useful decomposition, but it has been additive so far: broad
`battle-runtime.qnt` remains an active semantic target rather than a retired
integration shell.

The immediate risk is documentation drift. Some docs describe the intended
composition direction, but the implemented fact is that the broad package-local
battle spec is still accumulating production behavior.

## Relevant Existing Direction

Existing docs already contain the likely target shape:

- `plans/QCORE0_COMPOSITION_RESEARCH.md` recommends stateless Quint
  contract/procedure modules, one owned state machine per procedure family, and
  shallow integration modules only where adjacent procedures need composition
  checks.
- `plans/QCORE2_100_PERCENT_RAW_COVERAGE_RESEARCH.md` says QNT authority should
  cover production-executable reducer procedures through post-projection
  executable facts, not Surface catalog width.
- `packages/battle-runtime/README.md` says QNT/MBT should target
  procedure-family behavior and composition, not one trace per authored Unit,
  Spell Record, feature, or Stat Block.
- `QUINT_CONNECT_TROUBLESHOOT.md` records that broad battle simulation cost is
  driven by action branch search, snapshot/restore over battle state, and complex
  action bodies. It also records already-tried mitigations such as phase-split
  turn start, spell capability split, and rejected RAW-violating sub-phase
  splits.

Those docs are directionally consistent, but they do not yet describe a
completed implementation. Treat them as migration input, not proof that the
split has already happened.

## External Model-Checking Context

The broader Quint/TLA+ lesson is unsurprising but important: module composition
does not by itself reduce the checked state space. The checked model is the
reachable transition system from the selected `init`, `step`, and properties.
If a composed entrypoint reaches many state variables, broad `any` branches, or
large nondeterministic choices, the model checker still pays for them.

Common state-space controls that apply here:

- keep state variables to facts that actually change and matter to the property;
- verify finite, purpose-built model instances rather than the whole product
  surface;
- separate pure procedure contracts from stateful lifecycle machines;
- use shallow integration checks for adjacent procedures after their local
  invariants are proved;
- test catalog/projection width outside QNT so authored content breadth does not
  multiply proof state;
- record branch budgets near broad `any` blocks so growth is visible.

Useful references:

- Quint language basics and model entrypoints:
  https://quint.sh/docs/language-basics
- Quint model-checker overview:
  https://quint.sh/docs/model-checkers
- Quint property checking and inductive invariants:
  https://quint.sh/docs/checking-properties
- Apalache idiom on keeping minimum state variables:
  https://apalache-mc.org/docs/idiomatic/000keep-minimum-state-variables.html
- TLA+ model vs finite TLC model instance:
  https://lamport.azurewebsites.net/tla/model-popup.html

## Historical Migration Posture

This was the pre-inventory posture used to guide the split. Do not use this
section as current architecture policy; use the connectivity and architecture
docs named in the status block above.

The migration posture was:

1. Inventory `battle-runtime.qnt` by procedure family.
2. For each family, identify whether rule-core already owns a stateless
   procedure contract and whether there is an inductive/focused state machine.
3. Pick one narrow family where the split has high confidence and low coupling.
4. Move or re-anchor semantic authority in the smaller procedure proof.
5. Keep only selected cross-procedure facts in broad battle QNT.
6. Update TypeScript parity and focused MBT around observable scalar facts.
7. Delete migrated broad-spec assertions only when another proof or parity lane
   actually owns them.

The broad battle spec may continue to have value as an integration model. The
question is which behavior belongs there after the split: likely selected
verticals that exercise replay, holes, interrupt windows, action resources, and
snapshots together, not every authored procedure's local semantics.

## Historical Inventory Axes

During inventory, each `battle-runtime.qnt` section was classified along these
axes:

- procedure family: HP lifecycle, death saves, attack damage, save-gate damage,
  spell attack damage, healing, action economy, movement, grapples, reactions,
  concentration, stat-block controls, class features, spell profiles;
- state owner: battle state, creature state, runtime hole/replay state,
  interrupt stack, retained origin/profile facts, table-supplied facts;
- existing smaller authority: shared-algebras rule-core proof, focused
  battle-runtime MBT, deterministic reducer tests, or none;
- integration pressure: no integration needed, adjacent-procedure integration
  needed, broad battle replay needed;
- deletion confidence: can remove from broad battle now, can narrow after a
  focused parity bridge, or must remain until more facts are discovered.

The inventory did not assume that every section splits cleanly. Some broad
state revealed missing procedure facts, duplicated projections, or places where
the TypeScript reducer had not yet been shaped around the smaller QNT contract.

## Historical Candidate First Splits

These were plausible candidates before implementation:

- Hit Point / zero-HP / healing lifecycle. Rule-core files already exist, and
  the invariants are deep enough to be useful. The migration work would confirm
  whether `battle-runtime.qnt` still carries local semantics that should move
  into focused parity or stay as integration.
- Movement and Grapple. There are rule-core movement and focused runtime MBT
  lanes. The table-supplied spatial-fact boundary may make this a good test of
  keeping geometry out of QNT while still proving state transitions.
- Stat-block controls. Multiattack, limited-use, Recharge, and Legendary Action
  controls have procedure-shaped behavior and focused QCORE coverage, but broad
  battle integration may still be needed for dispatch replay and stale-subject
  behavior.

Spells later received the dedicated `battle-runtime-spell-bridge.qnt` path
described in the findings below.

## Historical Documentation Strategy

Documentation changes were planned in two layers.

First, add only a factual warning to active architecture docs if needed:

> As of 2026-05-11, `packages/battle-runtime/battle-runtime.qnt` remains an
> active broad package-local spec and is still growing. Rule-core/focused lanes
> exist but do not yet replace the broad spec as the implemented authority for
> all promoted battle behavior.

Second, after split-migration changes land, update steady-state docs to describe
the implemented proof ownership. That update should be factual:

- which procedure families are owned by rule-core;
- which focused MBT lanes compare runtime replay against those procedures;
- what broad battle QNT still owns;
- when a new promoted runtime slice should touch broad battle QNT;
- when it should instead add or widen a smaller procedure proof.

Avoid writing target-state language as if it is already true. That would make
review harder, because reviewers would need to infer whether a future PR is
violating policy or simply exposing that the policy was aspirational.

## Closed Split Questions

The open questions from the original research pass were answered by the
inventory and tracer work summarized below. Current open planning work should be
tracked in `plans/ACTIVE_PLAN.md`, not by reopening this temporary note.

## 2026-05-11 First-Pass Findings

- Quint `import child.*` names are not re-exported through a facade module. A
  stable `battle-runtime.qnt` compatibility entrypoint therefore needs direct
  wrapper definitions for moved public names, or focused MBT must import the
  narrower module directly.
- A small attack-roll tracer successfully re-anchored `attackHits` and
  `attackIsCritical` to `attack-damage-composition.qnt` while preserving the
  package-local compatibility helper names in `battle-runtime.qnt`.
- The first tracer suggests the larger split should prefer "shared algebra owns
  generic procedure semantics, battle runtime owns projection/wrappers" over a
  purely mechanical file extraction.
- The HP lifecycle tracer strengthened that shape. `battle-runtime.qnt` now
  projects package-local `Combatant` state into rule-core `CreatureVitals`,
  `DeathSavingThrowLifecycle`, and positive-HP Unconscious recovery values, then
  delegates damage, healing, zero-HP damage, Knock Out recovery, and start-turn
  Death Saving Throw transitions to the shared HP algebras. Concentration and
  active-effect cleanup remain package-local integration wrappers.
- The HP tracer exposed a missing rule-core helper:
  `applyDamageToZeroHitPointCreature` now models Temporary Hit Points absorbing
  damage before Death Saving Throw failures at 0 HP. That helper prevents
  battle QNT from keeping a parallel zero-HP damage algorithm.
- The movement/action tracer introduced `battle-runtime-movement-bridge.qnt`.
  Broad battle QNT now projects package-local turn and movement facts into
  `action-turn-procedures.qnt` and `movement-spatial-grapple.qnt` for
  Dash/Bonus Action Dash/Disengage/Dodge/Ready Movement/Help Attack, movement
  budget, stand from Prone, movement spend, Hide/Search checks, Grapple
  admission, Escape Grapple, Grappled attack-roll Disadvantage, and Opportunity
  Attack trigger facts. Battle still owns hand/link state, recorded Hidden
  discovery DCs, feature use counts, Temporary Hit Point projection, and
  interrupt-frame composition.
- The bridge now also exposes generic Attack-action, Magic-action, and
  Bonus-action spend helpers. Broad battle uses those for Extra Attack's
  ordinary Attack-action spend and for direct healing/scalar-buff/Heroism spell
  action costs; feature-specific extra slots, Spell Slot ledger state, Rage
  gates, concentration effects, and target projection remain package-local.
- The stat-block controls tracer introduced
  `battle-runtime-stat-block-bridge.qnt`. Broad battle now delegates Recharge
  roll availability, Legendary Action resource spend/admission, and Goblin
  Multiattack dispatch counts to `stat-block-controls.qnt`; the broad spec keeps
  concrete attack resolution, end-turn composition, and the package-local
  representative Goblin fields.
- The unit-feature tracer introduced `battle-runtime-feature-bridge.qnt` for
  Rage and Reckless Attack projections. Broad battle now delegates Rage damage
  bonus, physical resistance facts, spellcasting block, Reckless Attack
  activation, and incoming attack Advantage to `unit-feature-procedure-profiles`;
  the broad spec keeps package-local occurrence storage and turn-hook expiry.
- The same feature bridge now covers reaction/modifier helpers for Cutting
  Words, Uncanny Dodge, and Deflect Attacks. Broad battle keeps representative
  reaction composition tests, but no longer owns the feature-local arithmetic or
  basic admission facts for those helpers.
- Champion Improved Critical threshold projection also routes through the
  feature bridge; broad battle keeps only the package-local flag that says the
  representative Fighter has the improved range.
- Extra Attack slot lifecycle now routes through the feature bridge as well:
  the broad spec delegates slot-open after the Attack action, slot spend, and
  end-turn close to `unit-feature-procedure-profiles`; attack mutation and the
  focused runtime MBT lane remain package-owned.
- The spell tracer introduced `battle-runtime-spell-bridge.qnt` for direct
  hit-point restoration profile facts. Broad battle now delegates Healing
  Word/Cure Wounds/Mass Healing Word action profile, target-count, and healing
  amount facts to the spell bridge. The broad helper does not carry selected
  slot level, so slot-level dice legality remains out of that projection;
  scalar buff active-effect projection remains package-local.
- The Light-property tracer moved Off-Hand Attack admission out of broad battle:
  `action-turn-procedures.qnt` owns the prior Light Attack action plus different
  Light weapon Bonus Action spend rule, while `attack-damage-composition.qnt`
  owns the rule that the extra attack omits a positive ability modifier but
  keeps a negative one. Broad battle still owns the representative off-hand
  replay and delegates admission, spend, and damage amount through
  `battle-runtime-movement-bridge.qnt`.
- The spell-attack damage tracer added SRD spell-attack profiles to
  `spell-procedure-profiles.qnt` for damage type, hit rider, and object-target
  capability facts. Broad battle now maps package-local invocations to those
  profiles through `battle-runtime-spell-bridge.qnt`; concrete attack replay,
  Shield reaction composition, object damage disposition, and `ActiveEffect`
  storage remain package-local.
- The save-gated spell tracer extended the same spell bridge to save-damage,
  save-condition, and save-granted-attack-advantage families. Rule-core now owns
  targeting shape, save-success damage policy, damage type, slot requirement,
  failed-save effect identity/duration, target-list scaling, creature-type
  admissibility for Animal Friendship/Charm Person, and Charm Person's hostile
  target save Advantage. Broad battle still owns replay holes, concrete target
  mutation, source-actor projection, and concentration cleanup.
- The scalar-buff tracer extended `spell-procedure-profiles.qnt` and
  `battle-runtime-spell-bridge.qnt` for False Life, Longstrider, Shield of
  Faith, and Heroism profile facts: action cost, maximum targets, temporary HP
  scaling, active-effect identity, and concentration requirement. Broad battle
  keeps target mutation, temporary-HP replacement, and caster concentration
  cleanup.
- The damage-rider tracer added profile facts for Divine Favor, Divine Smite,
  Hunter's Mark, Ensnaring Strike, and Searing Smite. Rule-core now owns the
  shared Bonus Action profile, concentration requirement, damage type, duration,
  Hunter's Mark range, slot-level damage dice, Divine Smite Fiend/Undead bonus
  dice, and Ensnaring Strike Large+ save Advantage. Broad battle still owns the
  after-hit timing, mark transfer state, target mutation, repeated damage ticks,
  and concentration cleanup.
- The chained-spell tracer moved Chromatic Orb's pure chain math into
  `spell-procedure-profiles.qnt`: damage choices, damage type, base slot level,
  d8 scaling, critical doubled dice count, d8 face accounting, duplicate-face
  detection, and leap-budget admission. Broad battle keeps the ordered replay
  holes, target history, and target-admission integration through
  `battle-runtime-spell-bridge.qnt`.
- The attack-burst tracer added Ice Knife profile facts to the spell bridge:
  slot requirement, attack damage type, burst damage type, slot-scaled burst
  dice, and no-damage-on-success burst policy. Broad battle keeps the combined
  attack/save resolver, hit reaction ordering, primary-target inclusion, and
  single concentration check composition.
- The object-damage tracer moved object HP damage threshold, clamped next HP,
  and destruction arithmetic into `spell-procedure-profiles.qnt` with a
  projection through `battle-runtime-spell-bridge.qnt`. Broad battle keeps the
  object identity, spell damage type wrapping, and table/disposition protocol.
- The active-effect hook tracer moved reusable Heroism turn-start Temporary Hit
  Points replacement, Resistance once-per-turn reset, Shield start-of-next-turn
  expiry, and timed duration decrement/removal facts into the spell bridge.
  Broad battle still schedules concrete `ActiveEffect` variants.
- The public trace tracer added `battle-runtime-public-trace-contract.qnt` and
  `battle-trace-contract.ts` for weapon Attack hit/miss checkpoint projection.
  QNT owns the representative semantic checkpoint order; TypeScript owns public
  reducer fill payload width and concrete snapshots.
- After merging `master` at `48151511`, the Eldritch Blast and Sleep promotions
  were brought forward into the split architecture. Rule-core now owns Eldritch
  Blast beam count scaling, Force damage type, object-target support, and beam
  replay step classification, plus Sleep initial-save pending lifecycle,
  repeat-save escalation/removal, and end-on-damage/adjacent-shake facts. Broad
  battle keeps concrete beam replay state, target mutation, Sleep condition
  restoration, and concentration cleanup.
- The same movement/action bridge now carries the projected start-turn resource
  reset for action, Bonus Action, Reaction, Dash movement bonus, movement spent,
  Dodge, Disengage, Help, and Ready Movement facts. Broad battle still owns
  initiative rotation, spell-slot-per-turn reset, readied spell expiry,
  feature/effect hooks, Death Saving Throw wrappers, and recharge wrappers.
- The damage-adjustment tracer widened `damage-component-adjustments.qnt` to
  the full SRD damage-type set and re-anchored broad battle
  resistance/vulnerability/immunity math through `DamageAdjustmentFacts`.
  Resistance spell use-once state remains package-local.
- The concentration tracer added a tiny bridge for Concentration damage-save DC
  arithmetic. Spell-effect cleanup and concentration interrupt frames remain
  package-local because they depend on active-effect projection and replay
  continuation shape.
- The interrupt tracer introduced `battle-runtime-interrupt-bridge.qnt`.
  Broad battle QNT now classifies package-local reaction triggers, reaction
  procedures, and replay continuation kinds, and routes take/decline admission
  through the rule-core reaction-window contract. Concrete state mutation,
  Shield/readied-spell effects, Opportunity Attack resolution, and continuation
  resume remain package-local integration responsibilities.

## Completion Status

This temporary note has served its purpose. The durable outcome is:

- `battle-runtime.qnt` no longer grows by default for every promoted procedure;
- new procedure semantics land first in a smaller QNT authority or an explicit
  reason is recorded for broad ownership;
- broad battle QNT has an explicit, limited integration role;
- architecture docs describe the implemented state, not the desired future.
