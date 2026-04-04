# Plan: Passive Combat Modifiers

> Source PRD: `PRD_PASSIVE_MODIFIERS.md`

## Architectural decisions

- **Combatant schema**: Add `hasEvasion: bool` and `saveMiscBonus: int` to `Combatant` in battle.qnt and `BattleCreatureState` in TS. Default values: `false` / `0`.
- **Pure function**: `pApplyEvasion(damage, saveSucceeded, hasEvasion, isIncapacitated): int` in creature.qnt. Reused in battle.qnt AoE and save-spell resolution.
- **Init**: New fields set via `InitCreatureConfig` (TS provides values). `bInit` nondets assign `hasEvasion` and `saveMiscBonus` to some creatures.
- **No class-specific logic in Quint**: Quint doesn't know about Rogue/Monk/Paladin. Fields are generic.

---

## Phase 1: Evasion in AoE

**User stories**: 1, 2, 3, 8, 9

### What to build

Add `hasEvasion: bool` to Combatant and BattleCreatureState. Add `pApplyEvasion` pure function to creature.qnt. In `bResolveAoETarget`, after save resolution and damage computation, apply Evasion: save success + hasEvasion + not incapacitated = 0 damage; save fail + hasEvasion + not incapacitated = half damage. Update `bInit` to nondeterministically assign `hasEvasion: true` to some creatures. Mirror in TS. Update MBT bridge to map the new field.

### Acceptance criteria

- [ ] `hasEvasion: bool` on Combatant (battle.qnt) and BattleCreatureState (TS)
- [ ] `pApplyEvasion` pure function with unit tests in dndTest.qnt (success=0, fail=half, incapacitated=no effect, no evasion=no change)
- [ ] `bResolveAoETarget` applies Evasion after LR resolution
- [ ] TS `battleResolveAoETarget` mirrors the check
- [ ] MBT bridge maps `hasEvasion`
- [ ] `quint typecheck battle.qnt` passes
- [ ] `quint test --match "inv_" dndTest.qnt` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `vitest run machine.test.ts` passes

---

## Phase 2: Save misc bonus

**User stories**: 4, 5, 6, 7, 8, 9, 10

### What to build

Add `saveMiscBonus: int` to Combatant and BattleCreatureState. In all save-resolution paths (save spells, AoE saves, concentration checks), add the creature's `saveMiscBonus` to the effective save. Since battle.qnt receives pre-resolved d20 rolls, the bonus should be added to the roll before comparison against DC. Update `bInit` to nondeterministically assign small bonuses (0-5). Mirror in TS. Update MBT bridge.

### Acceptance criteria

- [ ] `saveMiscBonus: int` on Combatant and BattleCreatureState
- [ ] All save-resolution paths in battle.qnt add `saveMiscBonus` to the save roll
- [ ] TS mirrors the bonus application
- [ ] MBT bridge maps `saveMiscBonus`
- [ ] A creature with `saveMiscBonus: 3` and save roll 8 vs DC 10 succeeds (8+3=11 >= 10)
- [ ] All verification passes (typecheck, invariants, tsc, vitest)

---

## Phase 3: Single-target DEX-save Evasion

**User stories**: 11, 12

### What to build

Extend the Evasion check from Phase 1 to `bCastSaveSpell` for single-target DEX-save spells. Add a `saveAbility` field to `SaveSpellCtx` (or pass as a parameter) so the resolution can distinguish DEX saves from other saves. Evasion only applies to DEX saves per RAW.

### Acceptance criteria

- [ ] `bCastSaveSpell` applies Evasion when the save is DEX-based
- [ ] Non-DEX saves (CON, WIS, etc.) are unaffected by Evasion
- [ ] TS mirrors the check
- [ ] All verification passes
