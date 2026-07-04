# Quint Rule Core Proofs

This directory contains production rule-core Quint proofs. It follows the
QCORE0 composition result:

- reusable rule modules are stateless contracts/procedures;
- stateful proof modules own their state variables and import stateless
  procedures;
- integration modules stay shallow and measured;
- QNT fixtures are projection-shaped rule facts, not Surface mirrors.

QCORE proofs model reusable procedure shapes. They do not enumerate authored
Surface Unit ids or act as a catalog coverage mechanism. Concrete Unit identity
coverage belongs to `plans/unit-profile-coverage/` and runtime projection tests;
only selected representative or high-risk Unit ids should receive Specific Unit
Parity MBT.

## QCORE1: Hit Point Damage

`hit-point-damage.qnt` models the SRD 5.2.1 procedure for applying a resolved
damage amount to a creature's Hit Points and Temporary Hit Points while the
creature still has positive Hit Points. Damage at 0 Hit Points is a different
procedure because it inflicts Death Saving Throw failures.

Callers must establish `canApplyResolvedDamageToPositiveHitPoints(...)` before
using `applyResolvedDamageToPositiveHitPoints(...)`. The owned proof machine
enforces that guard before every damage transition.

Scope:

- nonnegative resolved damage;
- Temporary Hit Points are lost before Hit Points;
- Hit Points clamp at 0;
- monsters die when they drop to 0 Hit Points;
- player characters that drop to 0 Hit Points die from massive damage when the
  remaining damage equals or exceeds their Hit Point Maximum;
- player characters that drop to 0 Hit Points without instant death gain the
  Unconscious condition fact.

Out of scope for this first procedure:

- damage type Resistance, Vulnerability, and Immunity;
- damage at 0 Hit Points and Death Saving Throw failures;
- healing and revival;
- melee knock-out choice;
- broad battle action sequencing.

`hit-point-damage-inductive.qnt` is the owned proof machine. Its `step` action
has a documented branch budget and is intentionally small enough for serialized
`quint verify`.

## QCORE2: Zero-HP Lifecycle

`zero-hit-point-lifecycle.qnt` models the SRD 5.2.1 player-character procedure
for damage and Death Saving Throws after a character is already at 0 Hit Points.
It imports QCORE1's `CreatureVitals` type and keeps `dead` canonical there; the
Death Saving Throw lifecycle carries only counters plus Stable and HP-regained
facts, avoiding a second death field.

Scope:

- damage at 0 Hit Points adds one Death Saving Throw failure;
- Critical Hit damage at 0 Hit Points adds two failures;
- damage at 0 Hit Points that equals or exceeds the Hit Point Maximum kills;
- three Death Saving Throw failures kills;
- three Death Saving Throw successes makes the character Stable and resets
  counters;
- a natural 20 Death Saving Throw restores 1 Hit Point and ends this procedure's
  Unconscious fact;
- positive-Hit-Point damage from QCORE1 initializes or finalizes the Death
  Saving Throw lifecycle when it drops a player character to 0 Hit Points.

Out of scope for QCORE2:

- ordinary healing spells/features beyond the natural-20 Death Saving Throw
  result;
- positive-HP Knock Out lifecycle;
- Stable 1d4-hour recovery;
- damage type Resistance, Vulnerability, and Immunity;
- broad battle action sequencing.

`zero-hit-point-lifecycle-inductive.qnt` is the owned proof machine and shallow
composition check with QCORE1. Its `step` action records the branch budget near
the `any` action.

## QCORE3: Hit Point Recovery

`hit-point-recovery.qnt` models the SRD 5.2.1 procedures for Hit Point
recovery and Knock Out disposition over the QCORE1/QCORE2 state shapes. It
imports QCORE1's `CreatureVitals` and QCORE2's Death Saving Throw lifecycle
instead of introducing parallel Hit Point, death, Stable, or Death Saving Throw
state.

Scope:

- healing restores Hit Points up to the Hit Point Maximum;
- dead creatures do not regain Hit Points through this procedure;
- a player character that regains Hit Points resets Death Saving Throws, and
  zero-HP recovery ends the Unconscious fact from the zero-HP lifecycle;
- Stable remains a zero-HP Unconscious state until Hit Points are regained or
  another QCORE2 zero-HP event occurs;
- Knock Out disposition can replace a qualifying drop-to-zero damage result
  with 1 Hit Point and Unconscious for any creature kind;
- first aid can end the positive-Hit-Point Unconscious recovery state created by
  Knock Out without changing Hit Points.

Out of scope for QCORE3:

- damage type Resistance, Vulnerability, and Immunity;
- attack roll and melee eligibility facts for choosing Knock Out;
- Stable 1d4-hour recovery;
- broad battle action sequencing.

`hit-point-recovery-examples.qnt` contains concrete SRD example checks.
`hit-point-recovery-inductive.qnt` is the owned proof machine and shallow
composition check with QCORE1/QCORE2. Its `step` action records the branch
budget near the `any` action.

## QCORE4: Damage Component Adjustments

`damage-component-adjustments.qnt` models damage roll adjustment before Hit
Point damage is applied. It keeps authored content out of QNT by using a small
fixture damage-type set and projection-shaped facts for Immunity, Resistance,
and Vulnerability.

Scope:

- damage penalties cannot reduce a damage roll below 0;
- same-type damage components aggregate before target adjustments;
- Immunity nullifies damage of a type;
- Resistance halves damage of a type once, rounding down;
- Vulnerability doubles damage of a type once after Resistance;
- mixed typed damage is adjusted independently by type and summed;
- scalar damage reductions on mixed damage pairs use the existing A43
  proportional largest-remainder allocation before target adjustments;
- adjusted damage totals compose into QCORE1 positive-Hit-Point damage.

Out of scope for QCORE4:

- attack roll hit/critical procedures;
- spell save success/failure procedures;
- choosing Knock Out after melee attack damage;
- broad battle action sequencing.

`damage-component-adjustments-inductive.qnt` is the owned proof machine. It
keeps state to aggregate fixed reducer-derived typed-damage, scalar-reduction,
and damage-roll-floor fixtures, with the branch budget recorded near the `any`
action.

`damage-component-adjustments-examples.qnt` keeps QCORE4 run examples outside
the generator-facing semantic core.

## QCORE5: Attack Damage Composition

`attack-damage-composition.qnt` models the attack procedure facts that compose
QCORE1-QCORE4 without importing broad battle state. Attack facts are
projection-shaped: target/range legality, attack roll results, critical
threshold, damage totals, damage type, target damage adjustments, and damage
disposition.

Scope:

- natural 1 attack rolls miss regardless of total;
- natural 20 attack rolls hit and are Critical Hits;
- critical-threshold 19 is a procedure fact for weapon and Unarmed Strike
  critical-range support;
- Critical Hits require doubled damage dice count;
- legal misses spend the Attack action quota without damage;
- invalid target/quota/disposition combinations do not spend quota;
- attack damage totals compose QCORE4 target adjustments, QCORE1 Hit Point
  damage, and QCORE3 Knock Out disposition;
- melee Knock Out is legal only when the attack damage would reduce the target
  to 0 Hit Points.

Out of scope for QCORE5:

- full action-economy refresh and turn ownership;
- reaction windows, continuations, and Concentration;
- spell attack and save-damage profiles;
- class feature and stat-block authored breadth.

`attack-damage-composition-examples.qnt` owns concrete run examples for the
attack-roll and Knock Out branches so the reusable semantic core remains
generator-clean. `attack-damage-composition-inductive.qnt` is the owned proof
machine. It records fixed reducer-derived scalar attack-result fixtures that
keep the active Apalache lane bounded while still exercising
`resolveAttackProcedure`; `attack-damage-composition-inductive-tests.qnt`
provides reachability witnesses for the nontrivial fixture outcomes.

## QCORE6: Action and Turn Procedures

`action-turn-procedures.qnt` models ordinary action/turn procedure facts using
the shared `ActionQuota` from QCORE5. It keeps table-owned facts explicit for
Hide, Search, Help, and Ready; no geometry, line of sight, cover derivation, or
turn-order data structure is modeled here.

Scope:

- ordinary Action quota spend;
- Bonus Action quota spend for admitted alternate-cost actions;
- Dash movement bonus, coupled to spent action resources;
- Disengage and Dodge turn facts;
- Help attack caller target fact and held advantage procedure fact;
- Hide prerequisite/check facts and hidden result;
- Search hidden-target/check facts and discovery result;
- Ready movement trigger selection and start-of-turn expiry;
- Reaction spend and reset at start turn;
- End Turn as a runtime transition that releases current actor ownership and
  expires end-of-turn hooks.

Out of scope for QCORE6:

- Stand from Prone and Movement cost accounting, deferred to QCORE7;
- reaction windows, continuations, and Concentration, deferred to QCORE8;
- spell action profiles, deferred to QCORE10;
- stat-block Multiattack dispatches, deferred to QCORE11.

`action-turn-procedures-inductive.qnt` is the owned proof machine. Its invariant
links Dash bonus bounds to remaining action/bonus-action resources, keeping the
state space finite and executable.

## QCORE7: Movement, Spatial Facts, and Grapple

`movement-spatial-grapple.qnt` models turn Movement spending, table/caller
spatial facts, Stand from Prone, and bounded Grapple state on top of QCORE6's
turn procedure state.

Scope:

- Movement budget derived from current Speed plus QCORE6 Dash bonus, with
  caller-supplied distance and extra-cost facts;
- full Stand from Prone procedure: current-turn legality, positive half-Speed
  Movement cost, and Prone removal;
- Drop Prone as a no-action/no-Movement procedure gated by nonzero effective
  Speed;
- Opportunity Attack trigger facts supplied by the table/caller: hostile
  creature, visibility, leaving reach, movement resource, and Disengage;
- Grapple attempt legality over free hand, target size limit, failed save, and
  SRD-formula escape DC facts bounded by the SRD ability-score and Proficiency
  Bonus ranges;
- Escape Grapple as an Action-cost procedure, release as no action required,
  Grappled Speed 0, Grappled attack-roll disadvantage, and drag/carry extra
  Movement cost facts.

Out of scope for QCORE7:

- pathfinding, adjacency caches, line of sight, cover, or reach derivation;
- reaction-window/continuation resolution for making Opportunity Attacks,
  deferred to QCORE8;
- attack-count resources for replacing an attack with Grapple, deferred to the
  later feature/stat-block procedure profile tasks.

`movement-spatial-grapple-inductive.qnt` is the owned proof machine. It samples
bounded caller Movement costs, Opportunity Attack trigger facts, Dash/Disengage
composition, Stand/Drop Prone, and Grapple/Escape/Release transitions while
keeping spatial facts explicit rather than deriving geometry in Core.

## QCORE8: Reactions, Continuations, and Concentration

`reactions-continuations-concentration.qnt` models the reaction protocol on top
of QCORE6 turn resources and QCORE7 spatial trigger facts.
Reaction windows are implementation protocol, not authored content: the module
uses bounded active and suspended window states rather than importing Surface
features or broad battle state. Advancing a continuation is executable window
restoration, not a separate projection-only state.

Scope:

- Offer, Decline, matching Reaction spend, and Advance semantics;
- Reaction quota reuse from QCORE6, including reset through `startTurn`;
- bounded active-plus-suspended reaction-window depth, documented by
  `ASSUMPTIONS.md` A45;
- Opportunity Attack windows from QCORE7 caller-supplied trigger facts;
- guarded damage-interruption windows after positive effective damage reaches
  Hit Points through QCORE1's positive-HP damage procedure;
- Readied Movement Response release as reactor-owned Reaction spend plus
  caller-supplied Movement cost, gated by QCORE6's held Readied Movement fact;
- Readied Spell Response as a reaction-window kind consumed by QCORE10's held
  Spell Effect release integration;
- Concentration start/replace/end, incapacitated-or-dead break/prevent,
  damage-save DC `max(10, floor(damage / 2))` capped at 30, and failed-save
  break, owned separately by the interrupted actor and reactor.

Out of scope for QCORE8:

- Readied Spell Response effect release, owned by QCORE10's spell profile
  module;
- all possible reaction features, deferred to QCORE9/QCORE11 procedure
  profiles;
- battle-wide queue/stack policy beyond the bounded active-window protocol in
  A45;
- pathfinding, line of sight, reach derivation, or authored catalog
  enumeration.

`reactions-continuations-concentration-inductive.qnt` is the owned proof
machine. It samples bounded Opportunity Attack trigger facts, reaction choices,
Readied Movement costs, nested offers, Reaction quota reset, and Concentration
owner break paths, including the guarded damage/concentration interruption
integration with explicit damage target identity, while recording the branch
budget near the `any` action.

## QCORE9: Unit Feature Procedure Profiles

`unit-feature-action-count-core.qnt`, `unit-feature-pool-cost-core.qnt`,
`unit-feature-rage-reckless-core.qnt`,
`unit-feature-attack-rider-core.qnt`, `unit-feature-save-damage-core.qnt`,
`unit-feature-reaction-reduction-core.qnt`,
`unit-feature-passive-movement-defense-core.qnt`,
`unit-feature-martial-arts-core.qnt`, and
`unit-feature-zero-hit-point-core.qnt` model projection-shaped feature
procedure facts for character-derived battle features without importing Unit
ids, Surface records, or authored catalog enumeration. Focused `*-core.qnt`
files carry generator-facing semantic facts; matching `*-examples.qnt` files
keep run examples proof-only.

Scope:

- Action Surge spends a feature Pool, enforces once-per-turn use, and grants one
  additional non-Magic action fact;
- Extra Attack scales the attacks inside one Attack action and keeps movement
  between those attack slots as an explicit turn-procedure fact;
- Second Wind spends a Bonus Action and feature Pool use, then applies HP
  recovery through QCORE3;
- Cunning Action admits Dash, Disengage, and Hide through QCORE6's Bonus Action
  cost path;
- Rage spends a Bonus Action/use, creates an Active Ongoing Feature Occurrence,
  breaks/prevents Concentration, grants Bludgeoning/Piercing/Slashing
  Resistance facts, adds Strength weapon/Unarmed Strike damage, and models
  heavy-armor/incapacitated/unconscious early-end facts in the focused Rage and
  Reckless Attack core;
- Reckless Attack is a first-attack-roll Strength attack fact that creates a
  start-of-turn occurrence granting Strength attack-roll Advantage for the
  Barbarian and reciprocal incoming attack-roll Advantage against them;
- Frenzy uses the focused Rage and Reckless Attack core's active Rage state,
  Reckless-while-Raging fact, and first eligible hit state to admit its
  Rage-Damage-bonus d6 rider once on the Barbarian's turn;
- Champion Improved Critical is the existing QCORE5 critical-threshold-19
  attack-roll fact, with the feature-profile boundary restricted to weapon and
  Unarmed Strike attack forms;
- Sneak Attack is an optional once-per-turn Attack Damage Rider for attack-roll
  hits with Finesse or Ranged weapons, with Advantage/Disadvantage cancellation
  applied before the Advantage branch and the ally-within-5-feet branch modeled
  as caller-supplied spatial/condition facts;
- Archery adds a passive +2 attack-roll bonus to Ranged weapon attacks while
  keeping hit calculation in the shared attack-roll procedure;
- Savage Attacker admits one weapon-hit damage-dice choice per turn, carrying
  the selected weapon damage dice total separately from the ordinary weapon
  damage modifier;
- Boon of Combat Prowess admits one miss-to-hit replacement until the start of
  the next turn without making the replacement a Critical Hit;
- Evasion-style save damage replacement applies to Dexterity Saving Throw
  damage whose ordinary success result is half damage and is blocked by
  Incapacitated;
- Relentless Endurance-style zero-Hit-Point replacement spends a feature Pool
  use to replace a non-outright player-character drop to 0 Hit Points with
  1 Hit Point while preserving the shared zero-Hit-Point lifecycle for rejected
  cases;
- Defense-style passive Armor Class bonus adds 1 AC while the character is
  wearing Light, Medium, or Heavy armor;
- Cutting Words and Uncanny Dodge spend Reaction quota, with Cutting Words also
  spending Bardic Inspiration Pool uses. Cutting Words covers visible,
  within-60-feet attack-roll, ability-check, and damage-roll reduction facts,
  and attack-roll/ability-check reductions require an already successful roll;
  Uncanny Dodge covers visible attack-roll hit damage halving without a feature
  Pool.

Out of scope for QCORE9:

- Unit id or authored Surface feature admission breadth;
- spell procedure profiles and Readied Spell Response, deferred to QCORE10;
- stat-block controls, deferred to QCORE11;
- full ability-check procedure modeling beyond the Cutting Words roll-reduction
  fact;
- catalog-level class/subclass progression parsers.

`unit-feature-procedure-profiles-inductive.qnt` is the owned proof machine. It
samples bounded feature Pool uses, ordinary/Bonus Action and Reaction quota
spends, Rage/Reckless/Sneak occurrence state, passive Armor Class bonus facts,
zero-Hit-Point replacement facts, and representative damage or healing amounts
while keeping feature facts projection-shaped and Surface-free.

## QCORE10: Spell Procedure Profiles

`spell-save-gate.qnt` models the reusable spell Saving Throw gate atom:
Saving Throw success/failure is represented as a typed branch, failure effects
and success effects are explicit branch facts, and save-gated damage resolves
to full damage, half damage rounded down, or no damage without naming authored
spells.

`spell-slot-expenditure.qnt` models the reusable Spell Slot expenditure atom:
slotless casting leaves the ledger unchanged, leveled casting spends one
matching available Spell Slot, and a second Spell Slot expenditure on the same
turn is rejected.

`spell-invocation-resource-core.qnt` models the Spell Invocation resource core:
Magic Action or Bonus Action cost, Spell Slot expenditure through the reusable
atom, one slot-spell per turn, access admission, and target cardinality facts.

`spell-invocation-action-slot-core.qnt` projects Spell Definition profiles into
resource-facing Spell Invocation action costs, Spell Slot spend requirements,
access admission facts, and target cardinality facts.

`spell-damage-projection-core.qnt` models reusable spell damage projection
facts used by Spell Procedure Profiles without importing authored spell
definitions.

`spell-direct-damage-projection-core.qnt` projects Magic Missile direct damage
facts into the reusable direct spell damage atom: Spell Slot legality, dart
count, Force Damage Type, allocated dart bounds, and per-dart damage bounds.

`spell-save-damage-projection-core.qnt` projects save-gated damage profiles
into target shape, successful-save damage policy, Damage Type, Spell Slot and
Concentration flags, and failed-save rider effects.

`spell-attack-damage-projection-core.qnt` projects spell attack damage
profiles into Damage Type, hit-applied effects, and object-target support.

`spell-attack-burst-save-damage-core.qnt` projects attack-burst
save-damage profiles into Spell Slot requirement, spell attack Damage Type,
burst Damage Type, higher-slot burst dice, and successful-save burst damage
policy.

`spell-independent-attack-sequence-core.qnt` projects independent spell attack
sequence profiles into Damage Type, object-target support, attack counts, and
needs-targets/needs-attack-roll/needs-damage-roll/complete step states.

`spell-object-hit-point-damage-core.qnt` models object Hit Point damage:
Damage Threshold blocking, full-damage application when the threshold is met,
Hit Point clamping at 0, and destruction at 0 Hit Points.

`spell-hit-point-restoration-core.qnt` projects direct spell Hit Point
restoration facts: a restoration-specific profile union, healing dice by
restoration profile and Spell Slot level, healing die size, spellcasting
ability modifier bounds, Mass Cure Wounds area facts, and application through
the shared Hit Point recovery core.

`spell-sleep-repeat-save-lifecycle-core.qnt` models Sleep's save lifecycle:
automatic save success for targets that do not sleep or have Exhaustion
Immunity, initial failed-save pending state, repeat-save cleanup or Unconscious
transition, and target-end facts for damage or adjacent shake-awake action.

`spell-procedure-profiles.qnt` models projection-shaped Spell Invocation facts
and Spell Effects for the production spell procedures without importing Spell
Definition records, Spell Access lists, Unit ids, or Surface authored ids. The
QCORE10 spell procedure suite projects supported profiles into focused
semantic cores for invocation resources, spell damage, attack damage, scalar
buffs, damage riders, chained attacks, independent attack sequences, object
Hit Point damage, and Sleep repeat-save lifecycle facts.

Scope:

- Spell Invocation spends the Magic Action for action-time profiles and Bonus
  Action for Healing Word, consumes a same-level Spell Slot for leveled spells,
  leaves Cantrip invocations slot-free, and rejects a second slot spell in the
  same turn;
- direct damage profile facts for Magic Missile live in
  `spell-direct-damage-projection-core.qnt`; they project `3 + slot level - 1`
  Force-damage darts, with caller-provided allocation to one target bounded by
  the dart count;
- Ray of Frost uses QCORE5 spell attack-roll and critical-damage dice-count
  facts, deals Cold damage on a hit, and produces a
  start-of-caster-next-turn Speed-reduction Spell Effect;
- Acid Splash uses a Dexterity save-gated Acid-damage profile with no
  successful-save damage;
- Healing Word spends a Bonus Action/slot and applies QCORE3 HP recovery,
  including zero-HP Death Saving Throw reset and Unconscious removal;
- Mage Armor defensive-effect facts live in
  `spell-defensive-effect-core.qnt`; they admit a willing unarmored target,
  derive base AC as `13 + Dexterity modifier`, project the active defensive
  Spell Effect, and end it when the target dons armor;
- scalar buff profile facts for False Life, Longstrider, Shield of Faith,
  Spider Climb, Fly, Barkskin, Heroism, and Aid live in
  `spell-scalar-buff-projection-core.qnt`; they project action timing, maximum
  target count, Concentration requirement, Temporary Hit Points, Hit Point
  Maximum increases, Speed and special Speed effects, and Armor Class effects
  without importing authored Spell Definition records;
- damage-rider profile facts for Divine Favor, Divine Smite, Hunter's Mark,
  Ensnaring Strike, Searing Smite, and Shining Smite live in
  `spell-damage-rider-projection-core.qnt`; they project action timing,
  Concentration requirement, damage dice and Damage Types, durations, range,
  Bright Light radius, and save-advantage facts without importing authored
  Spell Definition records;
- independent attack sequence profile facts for Eldritch Blast and Scorching
  Ray live in `spell-independent-attack-sequence-core.qnt`; they project
  Damage Type, object-target support, Cantrip Upgrade or higher-slot attack
  counts, and the next required sequence step without importing authored Spell
  Definition records;
- attack-burst save-damage profile facts for Ice Knife live in
  `spell-attack-burst-save-damage-core.qnt`; they project Spell Slot
  requirement, Piercing attack Damage Type, Cold burst Damage Type,
  higher-slot burst dice scaling, and no burst damage on a successful save
  without importing authored Spell Definition records;
- spell turn-hook facts live in `spell-turn-hook-core.qnt`; they project
  turn-start Temporary Hit Points, once-per-turn reset, one-round Shield expiry,
  and timed duration ticking without importing authored Spell Definition
  records;
- object Hit Point damage facts live in
  `spell-object-hit-point-damage-core.qnt`; they project Damage Threshold
  blocking, whole-instance damage once the threshold is met, Hit Point
  clamping at 0, and destruction at 0 Hit Points without importing authored
  Spell Definition records;
- direct Hit Point restoration facts for Healing Word, Cure Wounds, Mass
  Healing Word, and Mass Cure Wounds live in
  `spell-hit-point-restoration-core.qnt`; they use a restoration-specific
  profile union that cannot represent non-restoration spell profiles, then
  project healing dice, die size, Mass Cure Wounds area facts, legal healing
  rolls, and QCORE3 Hit Point recovery application;
- Sleep repeat-save lifecycle facts live in
  `spell-sleep-repeat-save-lifecycle-core.qnt`; they project automatic save
  success for targets that do not sleep or have Exhaustion Immunity, initial
  pending repeat-save state, successful-repeat cleanup, failed-repeat
  Unconscious transition, and target-end facts for damage or adjacent
  shake-awake action without importing authored Spell Definition records;
- Readied Spell Response holds only action-time spell profiles as a readied
  spell held effect, expends the spell's casting resources at the hold
  boundary, starts Concentration while held, opens QCORE8's Readied Spell
  reaction window, spends Reaction on release, carries the released spell
  profile forward after clearing held state, and dissipates without effect if
  Concentration is gone.

Out of scope for QCORE10:

- authored Spell Definition parsing, prepared-list admission, or full spell
  catalog enumeration;
- non-production spell profiles beyond Magic Missile, Ray of Frost, Acid
  Splash, Healing Word, and Mage Armor;
- pathfinding, area geometry, line of sight, cover derivation, or target
  discovery;
- broad battle reducer sequencing beyond shallow QCORE8/QCORE6/QCORE3/QCORE5
  composition.

`spell-procedure-profiles-inductive.qnt` is the owned proof machine. It samples
bounded slot/action resources, cantrip and leveled invocation paths, direct
damage, spell attack damage, save-gated damage, healing, Mage Armor effects,
and Readied Spell Response hold/release while tracking only scalar outputs plus
ordinary and Mage Armor Spell Effect fixtures and one readied spell held-effect
fixture.

## QCORE11: Stat-Block Controls

`stat-block-controls.qnt` models projection-shaped Stat Block control facts
after authored `StatBlockRecord` projection. The module uses fixture attack
names and bounded resources rather than importing Surface records, monster ids,
or catalog entries.

Scope:

- Stat Block Actions-section attack options spend the Attack action;
- Multiattack is a named dispatch procedure inside the Attack action: the first
  listed attack spends the Attack action, remaining named dispatch attacks stay
  pending, Movement and End Turn may interleave, and End Turn closes unspent
  dispatches;
- admitted Stat Block Bonus Action options spend the shared Bonus Action
  resource;
- Stat Block Reaction options use QCORE8's shared offered trigger window and
  spend Reaction quota only when taken;
- Legendary Action windows open after another creature's turn, spend one
  Legendary Action use, close after one action, refresh at the monster's start
  turn, and leave per-action-name cooldowns to the caller;
- X/Day, Recharge, Recharge after Short or Long Rest, and start-turn keyed d6
  Recharge rolls mutate only executable resource state.

Out of scope for QCORE11:

- authored Stat Block catalog breadth or parser admission;
- monster-specific tactics or action priority guidance;
- per-Legendary-Action identity cooldown tracking, left to the caller;
- broad battle reducer replay beyond the reusable control procedure facts.

`stat-block-controls-inductive.qnt` is the owned proof machine. It samples
bounded action/Bonus Action/Reaction resources, two fixture named attacks,
daily use, Recharge, rest recharge, start-turn recharge rolls, Legendary Action
windows, and Multiattack dispatch closure while keeping projection state
Surface-free.

## Focused Runtime MBT Contract

Rule-core runtime parity uses focused QMBT lanes rather than widening the
full battle MBT into the full battle state space.

- QNT action names should mirror the owned proof action names: `init`, the
  procedure action, and optional `step`.
- Runtime drivers must call production reducers/procedure modules, not
  duplicate reducer logic in test code.
- Projections should compare only QCORE-observable facts: scalar resources,
  holes, flags, and one discriminated last outcome. Derivable facts are
  projected, not stored as independent MBT variables. Full battle snapshots,
  authored Surface records, and catalog breadth are outside these lanes.
- Fixture bounds must be explicit and small. State-space growth belongs to the
  procedure under test, not authored content discovery.
- Battle-runtime-focused lanes live in `packages/battle-runtime` when the
  stable production entrypoint is `resolveBattleSubject` or
  `resolveBattleReaction`.

The focused runtime lanes currently include
`packages/battle-runtime/rule-core-movement.mbt.qnt` with
`packages/battle-runtime/src/rule-core-movement.mbt.test.ts` for QCORE7
Movement/Grapple/OA-decline parity, and
`packages/battle-runtime/rule-core-reactions.mbt.qnt` with
`packages/battle-runtime/src/rule-core-reactions.mbt.test.ts` for QCORE8
Reaction offer/decline/spend, continuation resume, Readied Movement release,
and Concentration damage-save parity.
