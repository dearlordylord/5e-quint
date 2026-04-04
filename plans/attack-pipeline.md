# Plan: Attack Pipeline Unification + Class Features

> Source PRD: `PRD_ATTACK_PIPELINE.md`

## Architectural decisions

- **Shared resolution**: A pure function in battle.qnt parameterized by attacker, target, damage, crit range, and `AfterDamageReturn`. Called by all three attack entry points.
- **FighterState on Combatant**: Full `FighterState` record from creature.qnt, reusing existing pure functions (`canUseActionSurge`, `pUseActionSurge`, `pFighterStartTurn`). Non-fighters carry `freshFighterState(0)`.
- **Generic modifier fields for Barbarian**: `meleeDamageBonus: int`, `recklessThisTurn: bool`, `ragingBlocksSpells: bool` on Combatant. NOT full BarbarianState.
- **critRange on Combatant**: `critRange: int` (default 20, Champion 19/18). Static, set at init.
- **New AfterDamageReturn variants**: `ADRAwaitingLegendaryAction(LAWindowCtx)` for LA attacks.

---

## Phase 1: Shared attack resolution + crit range

**User stories**: 9, 12

### What to build

Extract the hit-resolution logic shared between `bAttack` and `bMovementOAAttack` into a pure function. Add `critRange: int` to Combatant (default 20). The shared function takes attacker/target IDs, attack roll, target AC, damage parameters, crit range, and return point. It returns `{ creatures, phase }` — either entering the reaction chain or resolving damage directly. Refactor `bAttack` and `bMovementOAAttack` to call it. Both become thin wrappers: validate guards, select parameters, call shared function. No behavioral change — this is a refactor. Mirror in TS.

### Acceptance criteria

- [ ] Pure function extracted, called by both `bAttack` and `bMovementOAAttack`
- [ ] `critRange: int` on Combatant, used in hit determination (replaces hardcoded nat-20 check)
- [ ] `bInit` sets `critRange` (default 20, nondeterministically 19 for some creatures)
- [ ] No behavioral change — MBT traces produce identical results
- [ ] All verification passes

---

## Phase 2: Legendary attacks through reaction chain

**User stories**: 1, 2, 3, 9

### What to build

Add `ADRAwaitingLegendaryAction(LAWindowCtx)` to `AfterDamageReturn`. Refactor `bLegendaryAttack` to use the shared attack resolution from Phase 1, parameterized with the new return variant. After the reaction chain resolves, return to the LA window (or advance turn if no more LA eligible). LA attacks now trigger Shield, Uncanny Dodge, Hellish Rebuke, etc.

### Acceptance criteria

- [ ] `bLegendaryAttack` enters the hit-reaction -> damage-reaction -> after-damage chain
- [ ] After resolution, control returns to `BPAwaitingLegendaryAction` (not `BPActiveTurn`)
- [ ] Creatures can Shield/Uncanny Dodge/Hellish Rebuke against legendary attacks
- [ ] MBT bridge handles the new return variant
- [ ] All verification passes

---

## Phase 3: Action Surge

**User stories**: 4, 5, 6, 10

### What to build

Add `fighterState: FighterState` to Combatant. Add `bActionSurge` battle action (guard on `canUseActionSurge`, call `pUseActionSurge`). Update `bStartTurn` to call `pFighterStartTurn` (resets `actionSurgeUsedThisTurn`). Update `bInit` to create at least one fighter creature. The existing 4 `actionSurgeActionPending` guards on spell actions become active (they were phantom infrastructure — now they gate real Action Surge usage). Mirror in TS.

### Acceptance criteria

- [ ] `fighterState: FighterState` on Combatant, defaulting to `freshFighterState(0)`
- [ ] `bActionSurge` action: spends charge, increments `actionsRemaining`, sets `actionSurgeActionPending`
- [ ] Magic actions blocked when `actionSurgeActionPending` (existing guards now functional)
- [ ] `bStartTurn` resets fighter per-turn state
- [ ] `bInit` includes a fighter creature in the nondeterministic setup
- [ ] MBT bridge maps `fighterState` fields
- [ ] All verification passes

---

## Phase 4: Rage + Reckless Attack

**User stories**: 7, 8, 11

### What to build

Add `meleeDamageBonus: int`, `recklessThisTurn: bool`, `ragingBlocksSpells: bool` to Combatant. Add `bEnterRage` action (costs BA, sets `meleeDamageBonus` to `rageDamageBonus(barbarianLevel)`, sets `ragingBlocksSpells: true`). Add `bDeclareReckless` action (sets `recklessThisTurn: true`). In the shared attack resolution, add `meleeDamageBonus` to damage for melee attacks. `ragingBlocksSpells` gates spell actions. `recklessThisTurn` feeds into advantage aggregation. Update `bInit` with at least one barbarian creature. `bStartTurn` resets `recklessThisTurn`. Mirror in TS.

### Acceptance criteria

- [ ] `meleeDamageBonus`, `recklessThisTurn`, `ragingBlocksSpells` on Combatant
- [ ] `bEnterRage` sets damage bonus, spell block, and resistance flags
- [ ] `bDeclareReckless` sets advantage flag (resets at start of next turn)
- [ ] Shared attack resolution applies `meleeDamageBonus`
- [ ] Spell actions guarded by `not(ragingBlocksSpells)`
- [ ] `bInit` includes a barbarian creature
- [ ] MBT bridge maps new fields
- [ ] All verification passes
