# Plan: Attack Pipeline Unification + Class Features

> Source PRD: `PRD_ATTACK_PIPELINE.md`

## Architectural decisions

- **Shared resolution**: A pure function in battle.qnt parameterized by attacker, target, damage, crit range, and `AfterDamageReturn`. Called by all four attack entry points (bAttack, bMovementOAAttack, bLegendaryAttack, bReadyRelease).
- **FighterState on Combatant**: Full `FighterState` record from creature.qnt, reusing existing pure functions (`canUseActionSurge`, `pUseActionSurge`, `pFighterStartTurn`). Non-fighters carry `freshFighterState(0)`. `fighterLevel` stored for `pFighterStartTurn`.
- **Generic modifier fields for Barbarian**: `meleeDamageBonus: int`, `recklessThisTurn: bool`, `ragingBlocksSpells: bool`, `combatantResistances: Set[DamageType]`, `barbarianLevel: int` on Combatant. NOT full BarbarianState. Rage bonus derived from `rageDamageBonus(barbarianLevel)`.
- **critRange on Combatant**: `critRange: int` (default 20, Champion 19/18). Static, set at init.
- **New AfterDamageReturn variants**: `ADRAwaitingLegendaryAction(LAWindowCtx)` for LA attacks.

---

## Phase 1: Shared attack resolution + crit range

**User stories**: 9, 12

### What to build

Extract the hit-resolution logic shared between `bAttack` and `bMovementOAAttack` into a pure function. Add `critRange: int` to Combatant (default 20). The shared function takes attacker/target IDs, attack roll, target AC, damage parameters, crit range, and return point. It returns `{ creatures, phase }` — either entering the reaction chain or resolving damage directly. Refactor `bAttack` and `bMovementOAAttack` to call it. Both become thin wrappers: validate guards, select parameters, call shared function. No behavioral change — this is a refactor. Mirror in TS.

### Acceptance criteria

- [x] Pure function extracted, called by both `bAttack` and `bMovementOAAttack`
- [x] `critRange: int` on Combatant, used in hit determination (replaces hardcoded nat-20 check)
- [x] `bInit` sets `critRange` (default 20, nondeterministically 19 for some creatures)
- [x] No behavioral change — MBT traces produce identical results
- [x] All verification passes

---

## Phase 2: Legendary attacks through reaction chain

**User stories**: 1, 2, 3, 9

### What to build

Add `ADRAwaitingLegendaryAction(LAWindowCtx)` to `AfterDamageReturn`. Refactor `bLegendaryAttack` to use the shared attack resolution from Phase 1, parameterized with the new return variant. After the reaction chain resolves, return to the LA window (or advance turn if no more LA eligible). LA attacks now trigger Shield, Uncanny Dodge, Hellish Rebuke, etc.

### Acceptance criteria

- [x] `bLegendaryAttack` enters the hit-reaction -> damage-reaction -> after-damage chain
- [x] After resolution, control returns to `BPAwaitingLegendaryAction` (not `BPActiveTurn`)
- [x] Creatures can Shield/Uncanny Dodge/Hellish Rebuke against legendary attacks
- [x] MBT bridge handles the new return variant
- [x] All verification passes

---

## Phase 3: Action Surge

**User stories**: 4, 5, 6, 10

### What to build

Add `fighterState: FighterState` to Combatant. Add `bActionSurge` battle action (guard on `canUseActionSurge`, call `pUseActionSurge`). Update `bStartTurn` to call `pFighterStartTurn` (resets `actionSurgeUsedThisTurn`). Update `bInit` to create at least one fighter creature. The existing 4 `actionSurgeActionPending` guards on spell actions become active (they were phantom infrastructure — now they gate real Action Surge usage). Mirror in TS.

### Acceptance criteria

- [x] `fighterState: FighterState` on Combatant, defaulting to `freshFighterState(0)`
- [x] `bActionSurge` action: spends charge, increments `actionsRemaining`, sets `actionSurgeActionPending`
- [x] Magic actions blocked when `actionSurgeActionPending` (existing guards now functional)
- [x] `bStartTurn` resets fighter per-turn state
- [x] `bInit` includes a fighter creature in the nondeterministic setup
- [x] MBT bridge maps `fighterState` fields
- [x] All verification passes

---

## Phase 4: Rage + Reckless Attack

**User stories**: 7, 8, 11

### What to build

Add `meleeDamageBonus: int`, `recklessThisTurn: bool`, `ragingBlocksSpells: bool` to Combatant. Add `bEnterRage` action (costs BA, sets `meleeDamageBonus` to `rageDamageBonus(barbarianLevel)`, sets `ragingBlocksSpells: true`). Add `bDeclareReckless` action (sets `recklessThisTurn: true`). In the shared attack resolution, add `meleeDamageBonus` to damage for melee attacks. `ragingBlocksSpells` gates spell actions. `recklessThisTurn` feeds into advantage aggregation. Update `bInit` with at least one barbarian creature. `bStartTurn` resets `recklessThisTurn`. Mirror in TS.

### Acceptance criteria

- [x] `meleeDamageBonus`, `recklessThisTurn`, `ragingBlocksSpells` on Combatant
- [x] `bEnterRage` sets damage bonus, spell block, and resistance flags
- [x] `bDeclareReckless` sets advantage flag (resets at start of next turn)
- [x] Shared attack resolution applies `meleeDamageBonus`
- [x] Spell actions guarded by `not(ragingBlocksSpells)` — including bonus-action spells
- [x] `bInit` includes a barbarian creature (B, barbarianLevel 5)
- [x] MBT bridge maps new fields
- [x] All verification passes

**Note:** `meleeDamageBonus` currently applies to all attacks unconditionally — no melee/ranged distinction in spec yet. See PLAN_AUDIT.md D1.
