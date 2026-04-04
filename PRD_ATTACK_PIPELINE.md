# PRD 1: Attack Pipeline Unification + Class Features in Battle

## Problem Statement

The battle spec has three attack paths (`bAttack`, `bMovementOAAttack`, `bLegendaryAttack`) that model the same domain phenomenon -- an attack roll -- but diverge in implementation. Regular and OA attacks share the hit/damage/after-damage reaction chain; legendary attacks bypass it entirely, meaning creatures can't Shield, Uncanny Dodge, or Hellish Rebuke against legendary attacks. This violates domain language: an attack is an attack regardless of entry point.

Additionally, the battle layer has no class features that modify combat. Action Surge's guards exist (4 `actionSurgeActionPending` checks preventing Magic) but no action triggers it. Barbarian rage damage bonus and Reckless Attack are modeled in creature.qnt but disconnected from battle. The battle layer fights with generic attacks producing nondeterministic damage, with no class-feature-driven modifications.

## Solution

1. **Unify the attack resolution** into a shared pure function parameterized by entry point (who attacks), return point (where control goes after), and crit range (Champion's improved critical). All three attack paths call this function. Legendary attacks gain the full reaction chain.

2. **Add Action Surge** as a battle action, using `FighterState` from creature.qnt directly on `Combatant`. This validates the pattern of carrying class resource records on Combatant and reusing creature.qnt's pure functions without adapter code.

3. **Add Rage and Reckless Attack** as battle actions with corresponding modifier fields on `Combatant`. Rage uses `meleeDamageBonus: int` (generic modifier, follows PRD 3 pattern) applied in the shared attack resolution. Reckless uses `recklessThisTurn: bool` applied in advantage aggregation.

This PRD validates two patterns:
- **Flow feature pattern**: class resource records (`FighterState`) on Combatant, reusing creature.qnt pure functions (Action Surge)
- **Dynamic modifier pattern**: generic modifier fields toggled by battle actions, consumed by the attack pipeline (rage bonus, reckless)

If MBT becomes too slow from the added state, we learn before adding more class features. Moving backward means removing the fields from Combatant and the actions from battle -- creature.qnt's pure functions remain untouched.

## User Stories

1. As a creature hit by a legendary attack, I want to use Shield to increase my AC, so that legendary attacks follow the same reaction rules as all other attacks.
2. As a creature damaged by a legendary attack, I want to use Uncanny Dodge to halve the damage, so that defensive reactions work against legendary attacks per RAW.
3. As a creature damaged by a legendary attack, I want to use Hellish Rebuke as an after-damage reaction, so that retaliatory reactions are available.
4. As a Fighter with Action Surge charges, I want to gain an additional action during my battle turn, so that Action Surge works in multi-creature combat.
5. As a Fighter using Action Surge, I want to be prevented from using the extra action for Magic, so that the SRD restriction is enforced.
6. As a Fighter, I want my Action Surge charges to decrement when used and reset on short rest, so that the resource tracking is correct.
7. As a Barbarian entering rage, I want my melee damage to increase by +2/+3/+4 (by level) for the duration, so that rage damage bonus applies in battle.
8. As a Barbarian, I want to declare Reckless Attack at the start of my turn, gaining advantage on STR-based attacks while giving enemies advantage on attacks against me, so that the trade-off works per RAW.
9. As an MBT test, I want the attack resolution to produce identical results for regular, OA, and legendary attacks (same roll, same AC, same modifiers), so that the unified pipeline has parity.
10. As an MBT test, I want Action Surge + spell casting + one-spell-per-turn + concentration to be fuzzed across all combinations, so that interaction bugs are caught.
11. As a spec maintainer, I want to add future attack modifiers (Sneak Attack, Divine Smite) by adding fields to Combatant and checks in the shared resolution, without restructuring the attack pipeline.
12. As a Champion Fighter, I want critical hits on 19-20 (L3) or 18-20 (L15) to work in the shared attack resolution, so that crit range is parameterized, not hardcoded to nat 20.

## Implementation Decisions

### Shared attack resolution

Extract a pure function from the common logic in `bAttack` and `bMovementOAAttack`. The function takes:
- Creatures map, attacker ID, target ID
- Attack roll, target AC, damage, damage type, crit flag
- Crit range (default 20, Champion can lower it)
- Return point (`AfterDamageReturn` -- `ADRActiveTurn`, `ADRResolvingMovement`, or new `ADRAwaitingLegendaryAction`)

It returns `{ creatures, phase }` -- either entering `BPAwaitingReaction(PIAttackHit(...))` if reactors exist, or resolving damage directly.

`bAttack`, `bMovementOAAttack`, and `bLegendaryAttack` become thin wrappers: validate guards, compute entry-specific parameters, call the shared function.

A new `AfterDamageReturn` variant `ADRAwaitingLegendaryAction(LAWindowCtx)` handles the LA return path.

### FighterState on Combatant

Add `fighterState: FighterState` to the `Combatant` record, using the type defined in creature.qnt. This reuses `canUseActionSurge(fs, s)` and `pUseActionSurge(ts, fs)` directly -- no adapter code, no field translation.

Non-fighter creatures carry a default `freshFighterState(0)` (all zeros, all guards fail). This is the same pattern as `monsterResources: MonsterResourceState` -- every creature carries it, non-monsters have zeroed defaults.

`bInit` sets `fighterState` from init config. `bStartTurn` calls `pFighterStartTurn` to reset per-turn flags.

### BarbarianState on Combatant (partial)

Rage and Reckless need a subset of `BarbarianState`. Two options were considered:

- **Full `barbarianState: BarbarianState`**: Same approach as FighterState. Reuses creature.qnt pure functions. But BarbarianState has ~12 fields (many irrelevant to battle: `frenzyUsedThisTurn`, `intimidatingPresenceUsed`, `brutalStrikeUsedThisTurn`, etc.)
- **Generic modifier fields**: `meleeDamageBonus: int` and `recklessThisTurn: bool` on Combatant, with `bEnterRage`/`bDeclareReckless` actions that set them.

Decision: **use generic modifier fields** for this PRD. Rage's battle-relevant effects are: (1) +N melee damage, (2) BPS resistance, (3) can't cast spells. The damage bonus is `meleeDamageBonus: int`. The resistance is already modeled via `dealDamage`'s R/V/I sets. The spellcasting block can be a `ragingBlocksSpells: bool` guard on spell actions. Reckless is `recklessThisTurn: bool` in advantage aggregation.

Full `BarbarianState` on Combatant is deferred until we need rage duration tracking, maintenance checks, or the full lifecycle in battle. The generic fields validate the dynamic modifier pattern now; the full record can replace them later if needed.

### Crit range parameterization

Add `critRange: int` to `Combatant` (default 20, Champion L3 sets 19, Champion L15 sets 18). The shared attack resolution uses it instead of hardcoded `attackRoll == 20`. This is a static modifier field -- set at init, same pattern as PRD 3.

### meleeDamageBonus in attack resolution

The shared attack resolution adds `meleeDamageBonus` to the damage amount for melee attacks before passing it through `dealDamage`. This happens BEFORE resistance/vulnerability/immunity (matching RAW's "order of application": adjustments -> resistance -> vulnerability).

### New battle actions

- `bActionSurge`: Guard on `canUseActionSurge(ac.fighterState, ac.creature)`. Call `pUseActionSurge(ac.turn, ac.fighterState)`. Update turn + fighterState on Combatant.
- `bEnterRage`: Guard on active creature, BA available, not already raging. Set `meleeDamageBonus` to `rageDamageBonus(barbarianLevel)`, add BPS to creature's resistances (via `rageResistances`), set `ragingBlocksSpells: true`.
- `bDeclareReckless`: Guard on active creature, first attack of turn. Set `recklessThisTurn: true`.

### Frame conditions

`FighterState` is nested inside `Combatant` inside `bCreatures` map. No new top-level state variables. No frame condition changes needed. Same for the modifier fields.

### MBT bridge updates

Map the new Combatant fields in the MBT bridge. `fighterState` maps to the existing `FighterState` type (creature.qnt and XState share the same structure). Modifier fields map to their XState equivalents on `BattleCreatureState`.

## Testing Decisions

### What makes a good test

Tests verify observable outcomes: after an attack with modifiers, is the damage correct? After Action Surge, are actions available? After a legendary attack, did the reaction chain fire? Tests should NOT verify which internal function was called or which branch was taken.

### Quint tests (dndTest.qnt)

Existing `inv_` tests for fighter resource bounds (`actionSurgeBounded`, `secondWindBounded`) already cover creature-level invariants. New battle-level tests:
- Attack with `meleeDamageBonus > 0` produces higher damage
- `recklessThisTurn` flag resets at start of next turn
- `fighterState.actionSurgeCharges` decrements on use
- LA attack enters reaction chain (reactors get offered)

### Battle invariants (battle.qnt)

- `fighterState` resource bounds (charges within max, per-turn flags consistent)
- `meleeDamageBonus >= 0`
- `recklessThisTurn` only true during acting phase

### MBT parity

The existing 50-trace x 10-step MBT runs will exercise the new actions via nondeterministic dispatch. The field-by-field comparison catches any Quint/XState divergence. New actions need MBT bridge mappings (schema + dispatch handlers).

### Prior art

- `battle-machine.mbt.test.ts` for bridge mapping patterns
- `dndTest.qnt` for invariant test patterns
- Existing `bDash`/`bDisengage`/`bDodge` for thin battle action patterns
- `bResolveHitReaction` / `bResolveDmgReaction` for reaction chain testing

## Out of Scope

- **Stunning Strike**: Flow feature (save -> condition interrupt). Needs `monkState` or `focusPoints` on Combatant. Deferred -- see PLAN_AUDIT.md F4 categorization.
- **Divine Smite**: The spell (not the class feature). Flow feature (BA spell cast -> Counterspell window -> slot economy). Note: SRD 5.2.1 distinguishes *Paladin's Smite* (class feature granting the spell + 1 free cast/LR) from *Divine Smite* (the spell itself, Counterspellable). Deferred.
- **Sneak Attack**: Modifier feature (extra damage, once/turn, eligibility partly spatial). Can be added as `sneakAttackEligible: bool` + extra damage via a generic field. Deferred.
- **Grapple/Shove in battle**: Alternative attack types creating save -> condition flow. Depend on the unified attack pipeline. Deferred.
- **TWF in battle**: BA extra attack modifying action economy. Deferred.
- **Brutal Strike / Cunning Strike**: Modifier features (forgo dice for effects). Deferred.
- **Second Wind in battle**: BA heal using fighter resources. No attack pipeline impact. Deferred.
- **Rage lifecycle** (duration tracking, maintenance checks, end conditions): Only rage's combat effects (damage bonus, resistance, spell block) are in scope. Full lifecycle (10-minute duration, turn-by-turn maintenance, Persistent Rage) is deferred.
- **Full BarbarianState on Combatant**: Generic modifier fields used instead. If the full lifecycle is needed later, the modifier fields can be replaced by `barbarianState: BarbarianState`.

## Further Notes

- This PRD validates two patterns simultaneously. If either causes problems (state space explosion, MBT slowdown), we can identify which pattern is responsible and revert independently.
- The `FighterState` approach (full class record on Combatant) is chosen for Action Surge because the pure functions require it. The generic-modifier approach is chosen for Barbarian rage/reckless because the battle-relevant effects are simpler (just a bonus and flags). This asymmetry is intentional -- use the lightest representation that avoids adapter code.
- `bInit` will need updating: nondeterministically assign some creatures as fighters (with `fighterState`) and barbarians (with `meleeDamageBonus`, `recklessThisTurn`). The existing fixed 4-creature setup (A=rogue, B=caster, C=monster, D=caster) should be expanded to include at least one fighter and one barbarian to exercise the new paths.
- The shared attack resolution function should be a pure def in battle.qnt, not an action. It takes and returns data. The calling actions (`bAttack`, `bMovementOAAttack`, `bLegendaryAttack`) remain actions that handle guards and nondeterministic parameter selection.
