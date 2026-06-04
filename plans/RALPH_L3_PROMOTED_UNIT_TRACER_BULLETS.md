# Ralph Lane: Level 3 Promoted Unit Tracer Bullets

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L3PUTB-01-ROGUE-STEADY-AIM-RUNTIME",
      "status": "done",
      "title": "Promote Rogue Steady Aim through battle reducer, QNT, MBT, and Unit evidence"
    },
    {
      "number": 2,
      "id": "L3PUTB-02-WARLOCK-DARK-ONES-BLESSING-RUNTIME",
      "status": "done",
      "title": "Promote Warlock Dark One's Blessing zero-HP Temporary Hit Points"
    },
    {
      "number": 3,
      "id": "L3PUTB-03-CLERIC-DISCIPLE-OF-LIFE-RUNTIME",
      "status": "done",
      "title": "Promote Cleric Disciple of Life slot-cast healing modifier"
    },
    {
      "number": 4,
      "id": "L3PUTB-04-CLERIC-PRESERVE-LIFE-RUNTIME",
      "status": "done",
      "title": "Promote Cleric Preserve Life Magic Action healing pool"
    },
    {
      "number": 5,
      "id": "L3PUTB-05-WIZARD-POTENT-CANTRIP-RUNTIME",
      "status": "done",
      "title": "Promote Wizard Potent Cantrip miss/save-success half damage"
    },
    {
      "number": 6,
      "id": "L3PUTB-06-MONK-OPEN-HAND-TECHNIQUE-RUNTIME",
      "status": "done",
      "title": "Promote Monk Open Hand Technique Flurry hit riders"
    },
    {
      "number": 7,
      "id": "L3PUTB-07-RANGER-HUNTERS-PREY-RUNTIME",
      "status": "ready-for-implementation-after-light-research",
      "title": "Promote Ranger Hunter's Prey selected attack option"
    },
    {
      "number": 8,
      "id": "L3PUTB-08-DRUID-LANDS-AID-RUNTIME",
      "status": "ready-for-implementation-after-light-research",
      "title": "Promote Druid Land's Aid level-3 area damage and healing"
    }
  ]
}
-->

## Objective

Move character-level-3 support closer to the ultra-golden ideal by converting
already-admitted level-3 `profile-subset-supported` Units into full promoted
Unit tracer bullets.

In this lane, a promoted Unit tracer bullet means:

```text
RAW scope
  -> battle-supported profile decision
  -> QNT obligation / focused MBT expectation
  -> TypeScript battle reducer implementation
  -> deterministic admission/projection evidence
  -> selected Unit identity replay/wiring
  -> MCP or equivalent production-path scenario when the scope requires it
```

The level-1 through level-3 ultra-golden aggregate gate already passes. This
lane is not blocker cleanup. It is intentional deepening of the remaining
level-3 follow-up splits that currently stop at battle-admission/profile
projection and explicitly defer reducer execution.

## Scope Selection

Prefer Units that already have:

- SRD Surface content installed in the Unit catalog;
- battle-admission profile projection evidence;
- an explicit level-3 follow-up whose owner is battle-runtime plus promoted QNT
  parity;
- no unresolved RAW contradiction or Surface repair prerequisite.

Do not start with Acid Arrow, Darkness, Druid Wild Shape, Sorcerer Metamagic,
Moonbeam residuals, Hypnotic Pattern, Haste, Fly, or Protection from Energy in
this lane. Those need RAW repair, Surface repair, or broader lifecycle splits
before they are good one-day Ralph work.

Declared Base SHA for every task in this lane:

```text
34cbf05a87d7198bacf7b2cb6c8e867705d5b8b5
```

Before starting each task, run and log:

```sh
git rev-parse HEAD
git merge-base --is-ancestor 34cbf05a87d7198bacf7b2cb6c8e867705d5b8b5 HEAD
```

If the ancestor check fails, stop and report the branch-base mismatch. Do not
repair branch state by rebasing against `master`; the Ralph runner or decider
owns branch repair.

## Global Acceptance Criteria

Every task must satisfy these criteria for its Unit or supported subset:

1. **RAW scope pinned.** Read the relevant SRD 5.2.1 passage in
   `.references/srd-5.2.1/` and the relevant `UBIQUITOUS_LANGUAGE.md` terms
   before changing behavior. Do not rely on memory.
2. **In reducer means in QNT.** Any new or changed battle-runtime reducer
   semantics must be represented by a QNT obligation and a parity witness in
   the same task. If the behavior cannot be represented honestly, keep the Unit
   at `profile-subset-supported` with a concrete follow-up instead of silently
   promoting it.
3. **No authored-identity dispatch.** Runtime behavior consumes typed support
   profiles, active battle state, caller-supplied facts, and Surface mechanics
   shape. It must not special-case the Unit id, class name, subclass name, or
   provenance section.
4. **No redundant state.** Reuse existing BattleState facts and existing
   resource/action/movement/attack/spell owners. Do not add a second copy of a
   resource pool, movement-spent fact, spell slot ledger, target mark, or active
   effect state when one already exists.
5. **Selected identity is connected.** If the Unit becomes battle-supported,
   add or update selected-identity evidence so a concrete Unit id reaches
   production runtime entrypoints. The evidence must not be a test-local fake.
6. **Matrix reflects truth.** The task updates `unit-claims.jsonl`,
   `unit-evidence.jsonl`, `profiles.jsonl`, and generated artifacts only to
   match the behavior actually promoted.
7. **Production path proven.** Add focused runtime evidence and, when the
   supported scope changes a user-facing flow not already covered by MCP
   scenario evidence, add or update MCP/equivalent vertical evidence.

## Global Constraints

- Use `pnpm`, never `npm`.
- Do not widen multiple Units in one task.
- Do not turn table-owned facts into battle state. If a rule depends on spatial
  geometry, visibility, relationship, item possession, or target classification
  facts the current runtime does not own, make those facts explicit caller
  inputs or leave the clause deferred.
- Keep QNT/MBT drivers focused and leaf-only. New simulated `*.mbt.qnt` drivers
  must pass the existing MBT driver closure check.
- MBT runs are expensive. Use focused unit tests while developing. Run focused
  MBT only after code changes are complete, following the repo MBT process and
  checking for existing `vitest` and `quint_evaluator` processes first.

## Verification

Every task must run:

```sh
git diff --check
pnpm unit-profile-coverage:check
pnpm check:mbt-driver-closure
```

When rules-kernel obligation rows, QNT owner roles, or profile-obligation joins
change, also run:

```sh
pnpm rules-kernel-coverage:check -- --write
pnpm rules-kernel-coverage:check
pnpm unit-profile-coverage:check -- --write
pnpm unit-profile-coverage:check
```

For battle-runtime behavior changes, run the relevant focused runtime tests and
the focused MBT/parity test added or modified by the task. Before any MBT run,
check:

```sh
ps aux | grep vitest | grep -v grep
ps aux | grep quint_evaluator | grep -v grep
```

If stale `quint_evaluator` processes exist, kill them with
`killall -9 quint_evaluator`. Parallel Ralph lanes are active, so wrap any
focused MBT command in the shared global lock:

```sh
flock /workspace/typescript/dnd/.ralph/mbt-global.lock -c 'START=$(date +%s); <cmd> 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"'
```

Inside the lock, still perform the `vitest` and `quint_evaluator` precheck
above. Never run broad exploratory MBT.

Every implementation task must include reviewer-loop convergence: RAW
traceability, ubiquitous-language/domain-language, architecture/connascence,
and code-review passes after implementation. Fix every reasonable finding,
explicitly reject only with a concrete reason, and repeat until no reasonable
findings remain. Use at least two rounds for non-trivial changes.

### Task 1 - L3PUTB-01-ROGUE-STEADY-AIM-RUNTIME

Status: `done`

Promote `rogue_steady_aim` from battle-admission projection to executable
battle-runtime behavior.

Current state:

- `plans/unit-profile-coverage/profiles.jsonl` already has
  `unit-feature.rogue-steady-aim` as a battle-admission profile.
- `packages/battle-runtime/src/unit-profile-admission-level3-attack-movement-features.test.ts`
  proves deterministic admission/projection only.
- `LEVEL1_3_FULL_SUPPORT.md` says reducer execution remains deferred under
  `L3-FOLLOWUP-ROGUE-STEADY-AIM-RUNTIME`.

Required behavior:

- discover Steady Aim as a Bonus Action only for a combatant with the admitted
  support profile;
- reject if the actor has already moved this turn;
- spend the Bonus Action;
- apply Advantage to the actor's next Attack Roll before the end of the turn;
- set Speed to 0 until the end of the current turn;
- clean up the next-attack and Speed effects at turn end;
- avoid duplicating movement history, Speed state, action economy, or attack
  roll active-effect state.

Expected outputs:

- focused QNT obligation and parity witness for Steady Aim action, rejection,
  next attack Advantage, Speed 0, and cleanup;
- production reducer implementation through existing battle-runtime entrypoints;
- selected-identity replay evidence for `rogue_steady_aim`;
- updated Unit profile claims/evidence and generated matrix artifacts;
- focused runtime tests and focused MBT/parity test.

Out of scope:

- generic advantage-on-next-attack redesign;
- other Rogue features;
- table movement geometry;
- Steady Aim interactions beyond the current turn cleanup and next attack roll.

### Task 2 - L3PUTB-02-WARLOCK-DARK-ONES-BLESSING-RUNTIME

Status: `done`

Promote `warlock_dark_ones_blessing` zero-Hit-Point Temporary Hit Points.

Required behavior:

- consume the admitted `enemy_zero_hit_point_temporary_hit_points` support
  profile;
- trigger when the Warlock reduces an enemy to 0 Hit Points;
- trigger when another creature within 10 feet reduces an enemy to 0 Hit
  Points, using caller-supplied range/enemy facts rather than inferring map
  geometry;
- reject non-enemy or out-of-range cases;
- apply Temporary Hit Points equal to Charisma modifier plus Warlock level,
  minimum 1;
- avoid authored-identity dispatch and avoid a parallel zero-HP event ledger.

Expected outputs:

- focused QNT/parity for self kill, nearby-other kill, enemy/range rejection,
  minimum Temporary Hit Points, and ordinary Temporary Hit Point replacement
  behavior;
- runtime reducer consumption through damage/zero-Hit-Point owners;
- selected-identity evidence for `warlock_dark_ones_blessing`;
- updated Unit profile artifacts.

Out of scope:

- generic grid/range derivation;
- kill attribution outside the existing damage event boundary;
- non-battle social/enemy adjudication.

### Task 3 - L3PUTB-03-CLERIC-DISCIPLE-OF-LIFE-RUNTIME

Status: `done`

Promote `cleric_disciple_of_life` slot-cast healing modifier.

Required behavior:

- consume the admitted `spell_slot_healing_modifier` support profile;
- apply `2 + Spell Slot level` to each creature healed by a spell the Cleric
  casts with a Spell Slot on that turn;
- exclude non-slot casts, non-spell healing, and unsupported healing procedures;
- reuse existing Spell Slot spend and spell Hit Point restoration facts;
- avoid dispatching on Cleric or Disciple of Life authored identity.

Expected outputs:

- QNT/parity for slot-cast healing modifier application and non-slot exclusion;
- focused runtime tests around at least one already-supported healing spell;
- selected-identity evidence for `cleric_disciple_of_life`;
- updated Unit profile artifacts.

Out of scope:

- new healing spell admission;
- generic metamagic or item healing modifiers;
- Character Sheet durable HP persistence beyond existing owners.

### Task 4 - L3PUTB-04-CLERIC-PRESERVE-LIFE-RUNTIME

Status: `done`

Promote `cleric_preserve_life` Magic Action healing pool.

Required behavior:

- discover/resolve Preserve Life as a Magic Action from the admitted support
  profile;
- spend one `cleric_channel_divinity` use;
- accept a caller-supplied distribution among Bloodied creatures within 30 feet,
  including self;
- enforce pool size `5 * Cleric level`;
- cap each target at half Hit Point maximum;
- reject non-Bloodied targets, over-pool allocations, over-cap allocations, and
  missing resource cases.

Expected outputs:

- QNT/parity for resource spend, pool distribution, target validation, cap
  enforcement, and rejection cases;
- runtime reducer tests through production battle entrypoints;
- selected-identity evidence for `cleric_preserve_life`;
- updated Unit profile artifacts.

Out of scope:

- table geometry derivation for the 30-foot range;
- other Channel Divinity options;
- generic healing pool abstraction unless needed by existing local patterns.

### Task 5 - L3PUTB-05-WIZARD-POTENT-CANTRIP-RUNTIME

Status: `done`

Promote `wizard_potent_cantrip` half damage on missed cantrip attacks and
successful cantrip saves.

Required behavior:

- consume the admitted `potent_cantrip` profile;
- apply half cantrip damage to creature targets on attack miss or successful
  target save for supported damaging cantrips;
- apply no additional non-damage effect on that miss/save-success branch;
- reject non-creature targets and unsupported/non-damaging cantrips;
- avoid cantrip identity dispatch.

Expected outputs:

- QNT/parity for attack-miss half damage, save-success half damage,
  non-creature rejection, and no-additional-effect restriction;
- focused runtime tests through existing spell attack/save reducers;
- selected-identity evidence for `wizard_potent_cantrip`;
- updated Unit profile artifacts.

Out of scope:

- new cantrip support;
- cantrip-specific behavior not already admitted by typed spell profiles;
- broader spell save redesign.

### Task 6 - L3PUTB-06-MONK-OPEN-HAND-TECHNIQUE-RUNTIME

Status: `done`

Promote `monk_open_hand_technique` after supported Flurry of Blows hits.

Required behavior:

- consume the admitted Open Hand Technique option facts;
- apply Addle after an eligible Flurry hit;
- apply Push only on failed Strength save;
- apply Topple only on failed Dexterity save;
- reject non-Flurry hits, stale hit windows, successful saves for Push/Topple,
  and unsupported target states;
- reuse existing attack-hit, saving-throw, forced-movement, and Prone owners.

Expected outputs:

- QNT/parity for Addle, Push save success/failure, Topple save success/failure,
  and stale/non-Flurry rejection;
- focused runtime tests through production attack/hit resolution;
- selected-identity evidence for `monk_open_hand_technique`;
- updated Unit profile artifacts.

Out of scope:

- new Monk Focus/Flurry resource modeling;
- automatic map collision/path derivation for Push;
- generic rider framework redesign.

### Task 7 - L3PUTB-07-RANGER-HUNTERS-PREY-RUNTIME

Status: `ready-for-implementation-after-light-research`

Promote `ranger_hunters_prey` selected attack option execution.

Required behavior:

- consume retained selected-option state and admitted Hunter's Prey facts;
- execute Colossus Slayer only once per turn when a hit target is below its Hit
  Point maximum;
- execute Horde Breaker only once per turn when caller supplies a different
  creature within 5 feet of the original target and the same weapon attack can
  be reused;
- reject missing selected option, invalid target predicates, same target, and
  repeated use in the same turn;
- avoid parallel weapon/target state.

Expected outputs:

- QNT/parity for Colossus Slayer and Horde Breaker choices plus rejection cases;
- focused runtime tests through existing attack owners;
- selected-identity evidence for `ranger_hunters_prey`;
- updated Unit profile artifacts.

Out of scope:

- Hunter's Lore table/stat-block knowledge;
- map-derived 5-foot adjacency;
- broader extra-attack sequencing redesign.

### Task 8 - L3PUTB-08-DRUID-LANDS-AID-RUNTIME

Status: `ready-for-implementation-after-light-research`

Promote the level-3 execution subset of `druid_lands_aid`.

Required behavior:

- consume the admitted level-3 `magic_action_area_save_damage_healing` profile;
- spend one Wild Shape use;
- consume caller-supplied Sphere area membership rather than deriving geometry;
- resolve Constitution saves;
- apply `2d6` Necrotic damage, half on success;
- heal one chosen creature in the area for `2d6`;
- reject missing resource, invalid area membership, invalid save fills, and
  invalid healing target.

Expected outputs:

- QNT/parity for resource spend, area membership fills, save outcomes, damage,
  healing, and rejection cases;
- focused runtime tests through production battle entrypoints;
- selected-identity evidence for `druid_lands_aid`;
- updated Unit profile artifacts.

Out of scope:

- Druid level 10 and 14 dice scaling;
- automatic area geometry;
- broader Wild Shape runtime work.

## Ralph Handoff Prompt

Every Ralph task prompt for this lane must include the task-base check above.
Ralph must run the implementer, reviewer, handback, and decider loop until
`accept`. The reviewer loop must include RAW traceability,
ubiquitous-language/domain-language, architecture/connascence, and code-review
passes. Fix every reasonable finding, explicitly reject only findings with a
concrete reason, and repeat until no reasonable findings remain.

For ordinary launches, start with the next runnable task and proceed in task
order. Do not rerun tasks already marked `done` unless the user explicitly asks.
If a task uncovers a blocker in shared action/active-effect infrastructure,
record the blocker in this lane and move to the next runnable task rather than
silently widening the blocked task.
