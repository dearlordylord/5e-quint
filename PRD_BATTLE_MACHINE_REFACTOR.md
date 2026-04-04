# PRD: State Machine Structural Refactor — Battle Phases & Creature Guards

## Problem Statement

84% of state machine transitions are self-transitions (context mutations with no state change). The battle machine has 3 states but 5 logical phases encoded as a discriminated union in context (`BattlePhase`), with 26 manual `if (c.phase.tag !== ...) return {}` checks scattered across action functions. The creature machine's `turnPhase.acting` state accepts 65 events with zero guards — all validation happens inside action functions as silent no-ops. This defeats the core value proposition of using a state machine: impossible states should be impossible at the machine level, not enforced by hand in imperative code.

## Solution

Three changes, ordered by impact:

1. **Battle machine: replace `context.phase` with real XState states.** The `running` state becomes 5 child states matching the 5 `BattlePhase` variants. Each state only accepts the events valid in that phase. All 26 phase-tag checks in action code are eliminated.

2. **Creature machine: add guards to `turnPhase.acting` events.** ~43 class-ability and resource-spending events gain explicit guards that check preconditions (class level, resource availability, incapacitation). Events are rejected at the machine level instead of silently no-oping.

3. **Eliminate `conditionTrack` region.** It has one state (`tracking`) with 2 self-transitions. Move `APPLY_CONDITION` and `REMOVE_CONDITION` to `rootEventHandlers`. Reduces parallel regions from 4 to 3.

## User Stories

1. As a developer reading the battle machine definition, I want each phase to be a visible XState state, so that I can see which events are valid in which phase without reading action implementation code.
2. As a developer sending events to the battle machine, I want invalid events to be rejected by the machine, so that I get immediate feedback instead of silent no-ops.
3. As a developer looking at the `/machines` visualization, I want the battle machine diagram to show the phase flow (`activeTurn -> awaitingReaction -> activeTurn`), so that the combat protocol is self-documenting.
4. As a developer adding a new battle event, I want to add it to a specific phase state, so that phase-gating is automatic and I don't need to remember to add `if (c.phase.tag !== ...) return {}`.
5. As a developer sending a class ability event (e.g., `ENTER_RAGE`) to a creature without that class, I want the machine to reject the event via a guard, so that the rejection is visible and testable.
6. As a developer reading creature machine transitions, I want guards on class abilities to indicate which class and resource they require, so that preconditions are documented in the machine definition.
7. As a developer running MBT tests, I want the Quint-XState bridge to continue passing after the refactor, so that behavioral parity is preserved.
8. As a developer maintaining the machine, I want `conditionTrack` eliminated as a parallel region, so that the machine has fewer regions to reason about and conditions are handled the same way as effects and exhaustion (via root handlers).

## Implementation Decisions

### Module 1: Battle Phase States

Replace the flat `running` state with a compound state containing 5 child states.

**Interface:** The battle machine's `.states` changes from `{idle, running, ended}` to `{idle, running: {activeTurn, awaitingReaction, resolvingAoE, resolvingMovement, awaitingLegendaryAction}, ended}`.

**Event distribution:**

| State | Events | Count |
|---|---|---|
| `activeTurn` | BATTLE_START_TURN, BATTLE_ATTACK, BATTLE_CAST_SAVE_SPELL, BATTLE_CAST_AOE, BATTLE_CAST_CONCENTRATION_SPELL, BATTLE_CONCENTRATION_CHECK, BATTLE_MOVE, BATTLE_END_TURN, BATTLE_HEAL | 9 |
| `awaitingReaction` | BATTLE_RESOLVE_HIT_REACTION, BATTLE_RESOLVE_DMG_REACTION, BATTLE_AFTER_DAMAGE_PASS, BATTLE_AFTER_DAMAGE_HELLISH_REBUKE, BATTLE_AFTER_DAMAGE_RETALIATION, BATTLE_RESOLVE_COUNTERSPELL, BATTLE_RESOLVE_SAVE_FAILED_REACTION | 7 |
| `resolvingAoE` | BATTLE_RESOLVE_AOE_TARGET | 1 |
| `resolvingMovement` | BATTLE_MOVEMENT_OA_PASS, BATTLE_MOVEMENT_OA_ATTACK | 2 |
| `awaitingLegendaryAction` | BATTLE_LEGENDARY_PASS, BATTLE_LEGENDARY_ATTACK | 2 |

**Context changes:**

- Remove `phase: BattlePhase` from `BattleContext`.
- Add flat context fields for phase-associated data: `awaitCtx: AwaitCtx | null`, `aoeCtx: AoESpellCtx | null`, `movementCtx: MovementCtx | null`, `laCtx: LAWindowCtx | null`. Set on entry to the relevant state, cleared on exit or transition back to `activeTurn`.
- The `BattlePhase` type and `BP_ACTIVE_TURN` constant are deleted.

**Transition targets:** Actions that currently mutate `context.phase` to a new variant instead return a target state. For example, `battleAttack` currently sets `phase: { tag: "BPAwaitingReaction", ctx: ... }`. After refactor, the machine definition has `BATTLE_ATTACK: { target: "awaitingReaction", actions: "battleAttack" }`, and the action sets `awaitCtx` instead of `phase`.

**Self-transitions that remain in `activeTurn`:** BATTLE_START_TURN (initializes turn resources), BATTLE_HEAL (simple context mutation), BATTLE_CONCENTRATION_CHECK (checks concentration save). These are genuinely stateless operations.

**Complex transitions:** Some actions conditionally change phase. For example, `battleAttack` goes to `awaitingReaction` only if the attack hits and there are eligible reactors, otherwise stays in `activeTurn`. These become guarded transitions:
```
BATTLE_ATTACK: [
  { guard: "attackTriggersReaction", target: "awaitingReaction", actions: "battleAttack" },
  { actions: "battleAttack" }  // miss or no reactors — stay in activeTurn
]
```

### Module 2: Creature Ability Guards

Add guards to ~43 events in `turnPhase.acting` that currently validate inside action functions.

**Interface:** Each guarded event changes from `{ actions: ["x"] }` to `{ guard: "canX", actions: ["x"] }`. The guard functions are added to `machine-guards.ts`.

**Guard groupings:**

| Guard name | Events it covers | Checks |
|---|---|---|
| `canEnterRage` | ENTER_RAGE | barbarianLevel > 0, !raging, !bonusActionUsed, !incapacitated, rageCharges > 0 |
| `canExtendRage` | EXTEND_RAGE_BA | barbarianLevel > 0, raging, !bonusActionUsed |
| `canDeclareReckless` | DECLARE_RECKLESS | barbarianLevel >= 2, !recklessThisTurn |
| `canBrutalStrike` | USE_BRUTAL_STRIKE | barbarianLevel >= 9 |
| `canIntimidatingPresence` | USE_INTIMIDATING_PRESENCE | barbarianLevel >= 10, !intimidatingPresenceUsed |
| `canRelentlessRage` | USE_RELENTLESS_RAGE | barbarianLevel >= 11, relentlessRageCharges > 0 |
| `canFlurryOfBlows` | FLURRY_OF_BLOWS | monkLevel >= 2, focusPoints > 0, !bonusActionUsed |
| `canPatientDefense` | PATIENT_DEFENSE_FREE, PATIENT_DEFENSE_FOCUS | monkLevel >= 2, !bonusActionUsed |
| `canStepOfTheWind` | STEP_OF_THE_WIND_FREE, STEP_OF_THE_WIND_FOCUS | monkLevel >= 2, !bonusActionUsed |
| `canStunningStrike` | STUNNING_STRIKE | monkLevel >= 5, focusPoints > 0 |
| `canWholenessOfBody` | WHOLENESS_OF_BODY | monkLevel >= 6 |
| `canUncannyMetabolism` | UNCANNY_METABOLISM | monkLevel >= 10 |
| `canSecondWind` | USE_SECOND_WIND | fighterLevel >= 1, secondWindCharges > 0, !bonusActionUsed |
| `canActionSurge` | USE_ACTION_SURGE | fighterLevel >= 2, actionSurgeCharges > 0 |
| `canIndomitable` | USE_INDOMITABLE | fighterLevel >= 9, indomitableCharges > 0 |
| `canTacticalMind` | USE_TACTICAL_MIND | fighterLevel >= 2 |
| `canSneakAttack` | USE_SNEAK_ATTACK | rogueLevel >= 1, !sneakAttackUsed |
| `canSteadyAim` | USE_STEADY_AIM | rogueLevel >= 3, !bonusActionUsed |
| `canCunningAction` | CUNNING_ACTION_DASH, CUNNING_ACTION_DISENGAGE, CUNNING_ACTION_HIDE | rogueLevel >= 2, !bonusActionUsed |
| `canUncannyDodge` | USE_UNCANNY_DODGE | rogueLevel >= 5, reactionAvailable |
| `canCunningStrike` | USE_CUNNING_STRIKE | rogueLevel >= 5 |
| `hasAction` | USE_ACTION | actionsRemaining > 0 |
| `hasBonusAction` | USE_BONUS_ACTION, MARK_BONUS_ACTION_SPELL | !bonusActionUsed |
| `hasReaction` | USE_REACTION | reactionAvailable |
| `hasMovement` | USE_MOVEMENT | movementRemaining > 0 |
| `hasBonusMovement` | USE_BONUS_MOVEMENT | bonusMovementRemaining > 0 |
| `hasExtraAttack` | USE_EXTRA_ATTACK | extraAttacksRemaining > 0 |
| `canExpendSlot` | EXPEND_SLOT | (already exists) |
| `canArcaneRecovery` | USE_ARCANE_RECOVERY | wizardLevel >= 1, !arcaneRecoveryUsed |
| `canOverchannel` | USE_OVERCHANNEL | wizardLevel >= 14 |
| `canClericCD` | USE_CLERIC_CHANNEL_DIVINITY | clericLevel >= 2, cdCharges > 0 |
| `canLayOnHands` | USE_LAY_ON_HANDS | paladinLevel >= 1, lohPool > 0 |
| `canPaladinCD` | USE_PALADIN_CHANNEL_DIVINITY | paladinLevel >= 3, cdCharges > 0 |
| `canDivineSmite` | USE_DIVINE_SMITE, USE_DIVINE_SMITE_FREE | paladinLevel >= 2 |
| `canBardicInspiration` | USE_BARDIC_INSPIRATION | bardLevel >= 1, bardicInspirationCharges > 0 |
| `canCuttingWords` | USE_CUTTING_WORDS | bardLevel >= 3, bardicInspirationCharges > 0 |
| `canFontSlotRestore` | USE_FONT_SLOT_RESTORE | bardLevel >= 5, !fontSlotRestoreUsed |
| `canPeerlessSkill` | USE_PEERLESS_SKILL | bardLevel >= 14, bardicInspirationCharges > 0 |

**Validation migration:** After adding a guard, the corresponding `if (!valid) return {}` in the action function can be removed (or kept as a defensive assertion). The guard becomes the source of truth; the action can assume preconditions hold.

**Quint parity:** Each guard must mirror the corresponding Quint precondition. The MBT bridge already tests behavioral equivalence — if a guard is wrong, MBT will catch the divergence (Quint allows an action that XState blocks, or vice versa).

### Module 3: Eliminate conditionTrack Region

- Delete `conditionTrackConfig` from `machine-states.ts`.
- Move `APPLY_CONDITION` and `REMOVE_CONDITION` to `rootEventHandlers`.
- Remove `conditionTrack` from the parallel region list in `machine.ts`.
- Update `MachineVizPage` and `FullMachineVizPage` to remove the `conditionTrack` region.
- Update MBT bridge state mapping if it references `conditionTrack` state.

## Testing Decisions

**Primary correctness proof: MBT parity tests.** All three modules must pass the existing MBT bridge (`machine.mbt.test.ts`) — 50 traces x 30 steps comparing Quint and XState field-by-field. If MBT passes, behavioral parity is preserved.

**Battle machine module:**
- Existing battle MBT (`battle.mbt.test.ts`) must pass. The bridge maps Quint actions to XState events — the event types don't change, only which machine state accepts them.
- The bridge's state comparison needs updating: instead of checking `context.phase.tag`, check the XState state value (e.g., `state.matches("running.activeTurn")`).
- Write focused unit tests for conditional transitions (attack that hits vs misses → different target states).

**Creature guards module:**
- Existing creature MBT must pass. Guards should reject exactly the same events that action functions currently no-op on.
- Risk: a guard that is stricter than the Quint spec will cause MBT failures (Quint allows an action, XState blocks it). Always verify against the Quint precondition.
- Write focused unit tests for each guard group (e.g., send ENTER_RAGE to non-barbarian → rejected, to exhausted barbarian with no charges → rejected, to valid barbarian → accepted).

**conditionTrack module:**
- MBT bridge state comparison must be updated to not check `conditionTrack` state (since it's always `tracking`, this may already be a no-op).
- Verify `APPLY_CONDITION` and `REMOVE_CONDITION` still work from any machine state (they should, since root handlers are state-agnostic).

## Out of Scope

- **Splitting `turnPhase.acting` into sub-states.** D&D turns are free-form (interleave actions, movement, bonus actions in any order). Forcing sequential sub-states would fight the domain. Guards are the right tool here; sub-states are not.
- **Spawning `dndMachine` actors per creature in battle.** The battle machine manages creature state as context (`Map<CreatureId, BattleCreatureState>`), not as child actors. Changing this would be a much larger architectural change affecting the MBT bridge, creature state extraction, and event routing. The phase-to-states refactor is independent of this.
- **Refactoring creature state out of battle context.** Related to the above — creature fields are flattened into `BattleCreatureState`, not modeled as running `dndMachine` instances. This is a separate, larger discussion.
- **Adding guards to battle machine events.** Battle events don't have the same "wrong class" problem — each event is already scoped to a phase. The phase-to-state refactor handles the gating; further guards within a phase are a future consideration.
- **Quint spec changes.** This refactor is XState-only. The Quint spec remains the source of truth; we're aligning XState structure to better match what Quint already enforces.

## Further Notes

- **Migration order matters.** Module 1 (battle phases) and Module 2 (creature guards) are independent and can be done in parallel. Module 3 (conditionTrack elimination) is trivial and can be done with either.
- **MBT bridge is the safety net.** Every change must pass MBT before merging. Run with `MBT_DEV=1` during development for faster feedback, full runs for final validation.
- **Visualization benefit.** After Module 1, the `/machines` page will show the battle machine as a real statechart with 7 states and visible phase transitions — instead of one `running` box with 21 self-transitions. This is a significant documentation win.
- **Guard extraction is incremental.** Module 2 can be done one class at a time (barbarian guards, then monk, then fighter, etc.). Each class's guards are independent. This makes it reviewable and low-risk.
- **The `return {}` pattern in actions becomes assertions.** After guards are in place, the `if (!valid) return {}` lines in action functions can be converted to `invariant(valid, "guard should have prevented this")` — turning silent bugs into loud failures.
