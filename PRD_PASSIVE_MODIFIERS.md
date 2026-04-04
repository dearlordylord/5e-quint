# PRD 3: Passive Combat Modifier System

## Problem Statement

The battle spec (`battle.qnt`) and XState machine have no mechanism for passive combat modifiers -- class features that automatically modify saves or damage without the creature spending an action or reaction. Two correctness issues are blocked:

1. **Evasion** (Rogue L7, Monk L7): DEX save success should deal 0 damage (not half), failure should deal half (not full). Currently `bResolveAoETarget` applies standard half-on-success with no Evasion check. AoE damage against Rogue/Monk L7+ is systematically overstated.

2. **Aura of Protection** (Paladin L6): Paladin and allies add CHA mod (min +1) to all saving throws. Currently `saveSucceeds` has a `miscBonus` parameter but it's always passed `0` in battle context. Save outcomes for creatures near a Paladin are systematically understated.

Both need a pattern, not just one-off fixes. The pattern must support future passives (Danger Sense, Elusive, Aura of Courage, etc.) without changing the spec each time a new one is added.

## Solution

Add **generic modifier fields** to the battle `Combatant` type. These fields represent the *mechanic shape* ("this creature has a save bonus", "this creature has Evasion") without encoding the *source* ("because a Paladin is nearby", "because they're a Rogue 7"). The Quint spec proves the modifier pipeline is correct under all inputs. The TS layer computes the specific values from class/item/spell sources and sets the fields at battle init or via events.

This follows the project's established frontier: Quint models modifier features via generic fields; TS provides the specific computation. See `ARCHITECTURE.md` ("The Quint/TS Frontier", "Modifier features").

## User Stories

1. As a Rogue 7+ in an AoE spell, I want to take 0 damage on a successful DEX save and half damage on a failed DEX save, so that Evasion works per RAW.
2. As a Monk 7+ in an AoE spell, I want Evasion to apply identically to a Rogue's, so that the feature is class-agnostic in the spec.
3. As a creature with Evasion that is Incapacitated, I want Evasion to NOT apply, so that the Incapacitated interaction is correct per RAW.
4. As a creature near a Paladin, I want my saving throws to include the Paladin's CHA modifier as a bonus, so that Aura of Protection works per RAW.
5. As a Paladin, I want my own saving throws to include my CHA modifier bonus, so that the self-benefit works.
6. As a creature benefiting from multiple save bonuses (e.g., Paladin aura + Bless), I want them to stack additively, so that the bonus aggregation is correct.
7. As a creature whose Paladin ally becomes Incapacitated, I want the aura bonus to stop applying, so that the aura's activation condition is respected.
8. As a spec maintainer, I want to add future passives (Danger Sense, Elusive) by adding a field to Combatant and a check in the relevant pipeline, without restructuring the battle spec.
9. As an MBT test, I want Quint and XState to agree on damage/save outcomes when modifiers are present, so that parity is maintained.
10. As a TS feature developer, I want to compute the specific modifier values (which class, what level, what ability score) outside the spec, so that new content sources don't require Quint changes.
11. As a creature targeted by a single-target DEX-save spell (not just AoE), I want Evasion to apply there too, so that all DEX-save-for-half spells are covered.
12. As a creature with Evasion targeted by a non-DEX save spell, I want Evasion to NOT apply, so that the DEX-only restriction is respected.

## Implementation Decisions

### New fields on battle Combatant

Add to the `Combatant` record in `battle.qnt`:
- `hasEvasion: bool` -- creature has the Evasion feature (Rogue 7+, Monk 7+, or other source). Set at init. Quint doesn't need to know the source.
- `saveMiscBonus: int` -- flat bonus to all saving throws from external sources (Aura of Protection, Bless, magic items). Computed by TS, passed in. Quint doesn't need to know the source.

Mirror in TS `BattleCreatureState` in `battle-machine-types.ts`.

### Evasion modifier in save-damage resolution

In `bResolveAoETarget` (and `bCastSaveSpell` for single-target DEX spells), after determining save success/fail and computing damage:
- If `hasEvasion` AND NOT `isIncapacitated(creature)`:
  - Save succeeded: damage = 0 (instead of half)
  - Save failed: damage = half (instead of full)
- The check must happen AFTER Legendary Resistance (which can flip save to success)
- Add a corresponding pure function `pApplyEvasion(damage, saveSucceeded, hasEvasion, isIncapacitated): int` to `creature.qnt`

### Save bonus in save resolution

In all save-resolution paths (save spells, AoE saves, concentration checks), add `saveMiscBonus` to the creature's save roll before comparing against DC. This uses the existing `miscBonus` parameter in `saveSucceeds` -- the change is threading the value from `Combatant` to the call site.

Alternatively, since battle.qnt passes pre-resolved save rolls (the caller provides the d20 result), the bonus may need to be applied at the roll site rather than in a pure function. Decide during implementation based on where save rolls are consumed.

### Init and update

- `bInit`: set `hasEvasion` and `saveMiscBonus` from `InitCreatureConfig` (TS provides the values)
- `saveMiscBonus` is static for now (set at init). Future work could add events to update it mid-battle (e.g., Bless starts/ends, Paladin becomes incapacitated).

### Combatant constructors

Update `mkCombatant`, `mkCaster`, `mkMonster` in `battle.qnt` with default values (`hasEvasion: false`, `saveMiscBonus: 0`).

### Frame conditions

New fields on `Combatant` are nested inside `bCreatures` map -- no new top-level state variables, no frame condition changes needed.

### creature.qnt pure function

Add `pApplyEvasion` as a pure function in creature.qnt alongside the existing damage modifier functions. This enables unit testing in `dndTest.qnt` independently of the battle layer.

### No `paladinLevel` / `chaMod` in Combatant

The spec does NOT need to know about Paladins. `saveMiscBonus: int` is the generic field. The TS layer computes "Paladin L6, CHA 16, not incapacitated, allies in 10ft range -> +3 bonus" and passes it in. Multiple Paladins? SRD says pick the best aura -- TS resolves this and passes the single highest bonus.

## Testing Decisions

### What makes a good test

Tests should verify external behavior (save outcomes, damage amounts) given specific modifier states, not implementation details (which function was called). Tests should cover:
- Boundary conditions (Evasion + Incapacitated, save bonus of 0, save bonus pushing a fail to success)
- Interaction with existing mechanics (Evasion + Legendary Resistance, save bonus + concentration check DC)

### Quint tests (dndTest.qnt)

Add `inv_` and `run test_` cases for `pApplyEvasion`:
- Evasion + save success = 0 damage
- Evasion + save fail = half damage (round down)
- Evasion + Incapacitated = no modification
- No Evasion = standard behavior
- Evasion + 0 damage = still 0

### Battle invariants (battle.qnt)

Add or verify:
- `hasEvasion` only modifies damage when creature is not incapacitated
- `saveMiscBonus` is additive (doesn't replace other bonuses)
- No new invariants needed for the fields themselves (they're just booleans/ints with no bounds constraints)

### MBT parity (battle-machine.mbt.test.ts)

The MBT bridge must map `hasEvasion` and `saveMiscBonus` from ITF traces to XState state. The existing field-by-field comparison will catch any divergence. No new MBT test structure needed -- the existing 50-trace x 10-step runs will exercise the new fields via nondeterministic init.

### TS unit tests

- `pApplyEvasion` equivalent in TS (probably in `battle-machine-creature.ts`) with vitest
- Existing `evasionDamage` in `features/class-rogue.ts` already has tests -- verify compatibility

### Prior art

- `dndTest.qnt` invariant tests (`inv_*` pattern)
- `battle-machine.mbt.test.ts` trace replay
- `features/class-rogue.test.ts` for Evasion unit tests
- `features/class-paladin.test.ts` for Aura of Protection unit tests

## Out of Scope

- **Aura of Courage** (Paladin L10, Frightened immunity): Would use a `conditionImmunities: Set[Condition]` field on Combatant. Deferred until the modifier pattern is validated by this PRD. Tracked in `ARCHITECTURE.md` ("Deferred Design Work") and `PLAN_AUDIT.md`.
- **Additional passive modifiers**: Danger Sense (DEX save advantage), Elusive (no attack advantage), etc. Each follows the same pattern (new field on Combatant + check in pipeline). Deferred. Tracked in `ARCHITECTURE.md`.
- **Dynamic modifier updates**: Aura bonus changing mid-battle (Paladin drops unconscious, Bless ends). `saveMiscBonus` is static for this PRD. Dynamic updates are a future extension.
- **Spatial modeling**: Aura range (10ft / 30ft) is a TS concern. Quint sees the computed bonus, not the distance.
- **Class state in battle Combatant**: Adding `FighterState`, `BarbarianState`, etc. is PRD 1 scope, not this PRD.

## Further Notes

- This PRD validates the **modifier features** category defined in `ARCHITECTURE.md`. If the pattern works for Evasion and save bonuses, it becomes the template for every future passive. If it doesn't, we learn before building 15 class features.
- The `hasEvasion` field is a boolean because Evasion is binary (you have it or you don't). Future passives that are graduated (e.g., a damage reduction amount) would use an `int` field instead. The pattern accommodates both.
- The `saveMiscBonus` field is an `int` (not a per-ability-score map) because Aura of Protection applies to ALL saves. If a future modifier applies only to DEX saves (like Danger Sense's advantage), it needs a separate field. This is expected -- each mechanic shape gets its own field.
- `bInit`'s hardcoded 4-creature setup needs updating to set the new fields. The nondeterministic init should randomly assign `hasEvasion: true` to some creatures and `saveMiscBonus` in a small range (0-5) to test the pipeline under varied configurations.
