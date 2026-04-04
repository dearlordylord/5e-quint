# Plan: State Machine Structural Refactor

**PRD:** `PRD_BATTLE_MACHINE_REFACTOR.md`

**Goal:** Replace shadow state machines (context.phase, silent no-ops) with real XState states and guards. 84% self-transition rate → ~40%. Machine-level enforcement of impossible states.

> **NOTE — Suggestive, not prescriptive.** Function names and signatures below are illustrative. The implementer decides the actual design.

---

## Phase 0: conditionTrack Elimination (trivial, do first) ✅ DONE

**Vertical slice:** Remove an empty parallel region. End-to-end: delete config → move events → update machine → update viz → pass MBT.

### Tasks

**[R0.1] Move APPLY_CONDITION / REMOVE_CONDITION to rootEventHandlers**
- In `machine-states.ts`: delete `conditionTrackConfig`. Add the 2 events to `rootEventHandlers`.
- In `machine.ts`: remove `conditionTrack` from the parallel region object.
- Test: creature MBT passes (`MBT_DEV=1`). APPLY_CONDITION and REMOVE_CONDITION work from all states (alive, dying, outOfCombat, acting, etc.).

**[R0.2] Update visualizations**
- In `MachineVizPage.tsx` and `FullMachineVizPage.tsx`: remove `conditionTrack` from `REGIONS`.
- MBT bridge: confirm `conditionTrack` state value is not checked anywhere (research shows it isn't — `mbt-shared.ts:743` only checks `turnPhase`).

**Verification:** creature MBT (dev mode). `/machines` page renders 3 regions.

---

## Phase 1: Battle Machine — Phase States ✅ DONE

**Vertical slice:** Refactor the flat `running` state into 5 child states. One phase at a time, each delivering a testable state boundary. End-to-end per slice: add state to machine definition → move events into it → update action functions to remove phase check → update MBT bridge → pass battle MBT.

**Architecture decision:** `context.phase: BattlePhase` is replaced by XState state hierarchy. Phase-associated data moves to nullable context fields (`awaitCtx`, `aoeCtx`, `movementCtx`, `laCtx`), set on transition entry. The `BattlePhase` discriminated union and `BP_ACTIVE_TURN` constant are deleted at the end.

**Implementation notes:** All 5 child states extracted in one pass using `always` transitions driven by nullable context fields. Actions set the relevant field; the machine follows via `always`. Phase constructors (`phaseAwaitReaction`, `phaseResolvingAoE`, etc.) ensure mutual exclusivity. MBT bridge validates Quint `bPhase` ↔ XState state value. `/simplify` converged in 2 rounds.

**Key complexity:** 14 action functions conditionally set different phase targets. These become guarded transition arrays in the machine definition. The three helper functions (`returnToPhase`, `advanceFromHitPhase`, `dealDamageWithAfterReactions`) currently return `BattlePhase` values — they must return target state strings instead.

### Tasks

**[R1.0] Scaffold compound `running` state with `activeTurn` as initial**
- Change `running` from a flat state to a compound state: `running: { initial: "activeTurn", states: { activeTurn: { ... } } }`.
- Move all 21 events from `running.on` into `running.states.activeTurn.on`.
- No behavioral change — everything is still in one state, just nested one level deeper.
- `context.phase` still exists, untouched.
- Test: battle MBT passes with no changes to actions or bridge.

**[R1.1] Extract `awaitingReaction` state**
- Add `awaitingReaction` state under `running.states`.
- Move 7 reaction events (BATTLE_RESOLVE_HIT_REACTION, BATTLE_RESOLVE_DMG_REACTION, BATTLE_AFTER_DAMAGE_PASS, BATTLE_AFTER_DAMAGE_HELLISH_REBUKE, BATTLE_AFTER_DAMAGE_RETALIATION, BATTLE_RESOLVE_COUNTERSPELL, BATTLE_RESOLVE_SAVE_FAILED_REACTION) into it.
- Add `awaitCtx: AwaitCtx | null` to BattleContext (initially null).
- Update action functions that transition to `BPAwaitingReaction`:
  - `battleAttack`: guarded transition `{ guard: "attackTriggersReaction", target: "awaitingReaction", actions: "battleAttack" }` + fallthrough self-transition.
  - `battleCastSaveSpell`, `battleCastConcentrationSpell`, `battleCastAoE`: similar conditional targets for counterspell eligibility.
  - `battleResolveAoETarget`: when AoE target has save-failed reaction.
- Update action functions that transition FROM awaitingReaction:
  - `battleResolveHitReaction`, `battleResolveDmgReaction`, `battleAfterDamage*`: return target `"activeTurn"` or stay in `"awaitingReaction"` (next eligible reactor).
  - `battleResolveCounterspell`, `battleResolveSaveFailedReaction`: return to appropriate state.
- Refactor `returnToPhase()` → `returnToState()`: returns state path string instead of BattlePhase object.
- Refactor `advanceFromHitPhase()` and `dealDamageWithAfterReactions()` to return `{ target: string, context: Partial<BattleContext> }`.
- Remove `if (c.phase.tag !== "BPAwaitingReaction") return {}` from all 7 action functions.
- Test: battle MBT (dev mode). Verify events sent in wrong phase are rejected (don't reach action code).

**[R1.2] Extract `resolvingAoE` state**
- Add `resolvingAoE` state under `running.states`.
- Move BATTLE_RESOLVE_AOE_TARGET into it.
- Add `aoeCtx: AoESpellCtx | null` to BattleContext.
- Update `battleCastAoE` to target `"resolvingAoE"` and set `aoeCtx`.
- Update `battleResolveAoETarget` to target `"activeTurn"` (all targets resolved), `"resolvingAoE"` (more targets), or `"awaitingReaction"` (save-failed reaction).
- Remove phase check from `battleResolveAoETarget`.
- Test: battle MBT (dev mode).

**[R1.3] Extract `resolvingMovement` state**
- Add `resolvingMovement` state under `running.states`.
- Move BATTLE_MOVEMENT_OA_PASS and BATTLE_MOVEMENT_OA_ATTACK into it.
- Add `movementCtx: MovementCtx | null` to BattleContext.
- Update `battleMove` to target `"resolvingMovement"` when threatened.
- Update OA resolution actions to target `"activeTurn"` or `"resolvingMovement"` (more threateners) or `"awaitingReaction"` (OA hit triggers reactions).
- Remove phase checks from movement actions.
- Test: battle MBT (dev mode).

**[R1.4] Extract `awaitingLegendaryAction` state**
- Add `awaitingLegendaryAction` state under `running.states`.
- Move BATTLE_LEGENDARY_PASS and BATTLE_LEGENDARY_ATTACK into it.
- Add `laCtx: LAWindowCtx | null` to BattleContext.
- Update `battleEndTurn` to target `"awaitingLegendaryAction"` when eligible monsters exist.
- Update legendary actions to target `"activeTurn"` (advance to next turn).
- Remove phase checks from legendary action functions.
- Test: battle MBT (dev mode).

**[R1.5] Delete BattlePhase and clean up**
- Remove `phase: BattlePhase` from BattleContext.
- Delete `BattlePhase` type, `BP_ACTIVE_TURN` constant, `AfterDamageReturn` type.
- Delete `returnToPhase()` helper (replaced by `returnToState()`).
- Remove all remaining `c.phase.tag` checks (should be zero by now — grep to confirm).
- Update `INITIAL_CONTEXT` to remove `phase` field.
- Update battle MBT bridge: add `bPhase` → XState state.value comparison (currently `bPhase` is parsed but ignored — now validate it matches the XState hierarchical state).
- Test: full battle MBT run (not dev mode). `/machines` page shows 5-state compound `running`.

**Verification:**
1. Full battle MBT pass (50 traces x 30 steps).
2. `grep -r "phase.tag" app/src/battle-machine` returns zero hits.
3. `/machines` page shows battle machine with `activeTurn → awaitingReaction → activeTurn` transitions visible.
4. `/simplify` convergence (minimum 2 rounds).

---

## Phase 2: Creature Machine — Ability Guards ✅ DONE

**Vertical slice:** Add guards to one class at a time. Each class is independently testable via creature MBT. End-to-end per slice: extract guard from action function → add to machine-guards.ts → wire into machine-states.ts → creature MBT passes.

**Architecture decision:** Guards mirror Quint preconditions exactly. After a guard is wired, the `if (!valid) return {}` in the action function is replaced with `assert(valid, "guard: canX should have prevented this")` — converting silent no-ops into loud assertion failures that indicate a guard/spec mismatch. Uses existing `assert` from `#/assert.ts`.

**Implementation notes:** ~45 guards added covering all class abilities + resource economy. Duplicate guards merged during `/simplify` convergence: `isRaging` (shared by END_RAGE + MARK_ATTACK_OR_FORCED_SAVE), `canCunningAction` (shared by 3 cunning action events), `canMonkFreeBA`/`canMonkFocusBA` (shared by patient defense + step of the wind variants). Battle MBT passes. Creature MBT has pre-existing `innateSorceryCharges` init parity bug (see Known Issues).

### Tasks

**[R2.0] Resource guards (action economy)**
- Guards: `hasAction`, `hasBonusAction`, `hasReaction`, `hasMovement`, `hasBonusMovement`, `hasExtraAttack`.
- Events: USE_ACTION, USE_BONUS_ACTION, MARK_BONUS_ACTION_SPELL, USE_REACTION, USE_MOVEMENT, USE_BONUS_MOVEMENT, USE_EXTRA_ATTACK.
- These are the simplest guards (single field checks) and affect the most events.
- Test: creature MBT (dev mode). Send USE_ACTION with actionsRemaining=0 → rejected.

**[R2.1] Fighter guards**
- Guards: `canSecondWind`, `canActionSurge`, `canIndomitable`, `canTacticalMind`.
- Events: USE_SECOND_WIND, USE_ACTION_SURGE, USE_INDOMITABLE, USE_TACTICAL_MIND.
- Read Quint preconditions from `creature.qnt` fighter section to verify guard logic.
- Test: creature MBT (dev mode).

**[R2.2] Barbarian guards**
- Guards: `canEnterRage`, `canExtendRage`, `canDeclareReckless`, `canBrutalStrike`, `canIntimidatingPresence`, `canRelentlessRage`.
- Events: ENTER_RAGE, EXTEND_RAGE_BA, DECLARE_RECKLESS, USE_BRUTAL_STRIKE, USE_INTIMIDATING_PRESENCE, USE_RELENTLESS_RAGE, END_RAGE.
- Test: creature MBT (dev mode).

**[R2.3] Monk guards**
- Guards: `canFlurryOfBlows`, `canPatientDefense`, `canStepOfTheWind`, `canStunningStrike`, `canWholenessOfBody`, `canUncannyMetabolism`.
- Events: FLURRY_OF_BLOWS, PATIENT_DEFENSE_FREE, PATIENT_DEFENSE_FOCUS, STEP_OF_THE_WIND_FREE, STEP_OF_THE_WIND_FOCUS, STUNNING_STRIKE, WHOLENESS_OF_BODY, UNCANNY_METABOLISM.
- Test: creature MBT (dev mode).

**[R2.4] Rogue guards**
- Guards: `canSneakAttack`, `canSteadyAim`, `canCunningAction`, `canUncannyDodge`, `canCunningStrike`.
- Events: USE_SNEAK_ATTACK, USE_STEADY_AIM, CUNNING_ACTION_DASH, CUNNING_ACTION_DISENGAGE, CUNNING_ACTION_HIDE, USE_UNCANNY_DODGE, USE_CUNNING_STRIKE.
- Test: creature MBT (dev mode).

**[R2.5] Spellcaster guards (Wizard, Cleric, Paladin, Bard, Warlock, Sorcerer, Druid, Ranger)**
- Guards: `canArcaneRecovery`, `canOverchannel`, `canClericCD`, `canLayOnHands`, `canPaladinCD`, `canDivineSmite`, `canBardicInspiration`, `canCuttingWords`, `canFontSlotRestore`, `canPeerlessSkill`, `canMagicalCunning`, `canMysticArcanum`, `canEldritchSmite`, `canConvertSlotToPoints`, `canConvertPointsToSlot`, `canInnateSorcery`, `canMetamagic`, `canWildShape`, `canWildResurgence`, `canFreeHuntersMark`, `canTireless`, `canNaturesVeil`.
- Events: all remaining class-specific events in `turnPhase.acting`.
- Largest batch — can be split further by class if needed.
- Test: creature MBT (dev mode).

**[R2.6] Full MBT validation and cleanup**
- Run full creature MBT (50 traces x 30 steps, not dev mode).
- Run full battle MBT (not dev mode).
- Grep for remaining `return {}` patterns in action functions that should now be assertions.
- Convert confirmed guard-protected `return {}` to `invariant()` calls.

**Verification:**
1. Full creature MBT pass. **Blocked by:** pre-existing `innateSorceryCharges` init parity bug — Quint expects `2`, XState produces `0` at step 0 for any sorcerer creature. Not caused by Phase 2.
2. Full battle MBT pass (guards don't affect battle machine, but confirm nothing broke). ✅
3. `grep -rn "return {}" app/src/machine-*.ts` — remaining hits are only genuinely unconditional actions (DROP_PRONE, etc.) or root handlers.
4. `/simplify` convergence (minimum 2 rounds). ✅

---

## Phase 3: XState Inspector Integration ✅ DONE

**Vertical slice:** Add `@statelyai/inspect` as a tab on `/battle` for live state observation during battle playback. End-to-end: install package → wire inspector to battle actor → add tab UI → verify live state diagram appears.

### Tasks

**[R3.0] Install `@statelyai/inspect` and wire to battle actor**
- `pnpm add @statelyai/inspect` in the app package.
- In `BattlePage.tsx` (or wherever the battle actor is created): add `inspect` option via `createBrowserInspector({ iframe: iframeRef.current })`.
- The inspector iframe loads `https://stately.ai/inspect` and receives state transitions via `postMessage`.
- Test: inspector iframe renders and shows the battle machine's state diagram.

**[R3.1] Tab layout on `/battle`**
- Add two tabs to the battle page: "Battle" (existing visualizer) and "Inspector" (iframe).
- The inspector tab renders the iframe; the battle tab renders the existing `BattlePage` content.
- Optional: gate inspector behind `?inspect=true` query param or a UI toggle to avoid iframe overhead in normal usage.
- Test: tab switching works, inspector shows live state transitions during battle playback. After R1 (battle phase states), the inspector shows the 5-state compound `running` hierarchy.

**Verification:** Inspector iframe loads, shows state diagram, highlights active state during battle step-through.

---

## Phase 4: State Tags for UI Decoupling ✅ DONE (R4.0 + R4.1; R4.2 hasTag() adoption deferred)

**Vertical slice:** Add semantic tags to creature and battle machine states. End-to-end: define tag type → add tags to state configs → use `hasTag()` in battle UI → verify tags visible in inspector.

### Tasks

**[R4.0] Add tags to creature machine states**
- In `machine.ts` `setup()`: add `types: { tags: {} as CreatureTag }` with tag union.
- In `machine-states.ts`: add `tags` arrays to state definitions:
  - `damageTrack.alive`: `['alive']`
  - `damageTrack.dying`: `['incapacitated', 'dying']`
  - `damageTrack.dying.unstable`: `['unstable']`
  - `damageTrack.dying.stable`: `['stable']`
  - `damageTrack.dead`: `['dead']`
  - `turnPhase.acting`: `['canAct']`
  - `turnPhase.waitingForTurn`: `['inCombat']`
  - `turnPhase.outOfCombat`: `['outOfCombat']`
  - `spellcasting.concentrating`: `['concentrating']`
- No behavioral change — tags are read-side metadata.
- Test: unit test that creates actor, transitions to dying, verifies `snapshot.hasTag('incapacitated')`.

**[R4.1] Add tags to battle machine states (depends on R1)**
- After R1 completes, add tags to battle phase states:
  - `running.activeTurn`: `['playerTurn']`
  - `running.awaitingReaction`: `['reactionWindow']`
  - `running.resolvingAoE`: `['resolving']`
  - `running.resolvingMovement`: `['resolving']`
  - `running.awaitingLegendaryAction`: `['legendaryWindow']`
- Test: unit test that verifies `snapshot.hasTag('reactionWindow')` when in awaitingReaction.

**[R4.2] Adopt `hasTag()` in battle UI components**
- Replace `state.matches()` checks in battle scene React components with `snapshot.hasTag()` where semantic tags exist.
- Example: creature sprite opacity for unconscious/dead → `hasTag('incapacitated')` or `hasTag('dead')` instead of enumerating state paths.
- Test: battle visualizer renders correctly after migration.

**Verification:** Tags visible in inspector. `hasTag()` used in at least one UI component. No behavioral change to machine logic.

---

## Phase dependencies

```
[R0.1] conditionTrack elimination
  └── [R0.2] viz update
        (independent of R1/R2/R3/R4)

[R1.0] scaffold compound running
  ├── [R1.1] awaitingReaction
  ├── [R1.2] resolvingAoE
  ├── [R1.3] resolvingMovement
  └── [R1.4] awaitingLegendaryAction
        └── [R1.5] delete BattlePhase + cleanup

[R2.0] resource guards
  ├── [R2.1] fighter guards
  ├── [R2.2] barbarian guards
  ├── [R2.3] monk guards
  ├── [R2.4] rogue guards
  └── [R2.5] spellcaster guards
        └── [R2.6] full validation + cleanup

[R3.0] install inspector + wire to actor
  └── [R3.1] tab layout on /battle

[R4.0] creature machine tags (independent)
[R4.1] battle machine tags (depends on R1)
  └── [R4.2] adopt hasTag() in UI
```

R0, R1, R2, R3 are independent tracks. R4.0 is independent; R4.1 depends on R1 (needs phase states to exist before tagging them). R4.2 depends on R4.0 + R4.1.

---

## Risks

| Risk | Mitigation |
|---|---|
| Guard is stricter than Quint precondition → MBT fails (Quint allows action, XState blocks) | Each guard must be derived from reading the Quint `requires` clause. Run MBT after each guard addition. |
| Conditional phase transitions are complex (14 action functions with branching targets) | Extract one phase at a time (R1.1-R1.4). Each extraction is independently testable. |
| `returnToPhase` / `advanceFromHitPhase` / `dealDamageWithAfterReactions` return nested phase logic | Refactor these helpers first in R1.1 (they're used across all phases). Once helpers return target strings, remaining phases are mechanical. |
| Battle MBT currently doesn't validate phase → refactored machine could have phase bugs MBT misses | R1.5 adds explicit phase↔state validation to MBT bridge. Until then, rely on the action-level behavioral tests (same events, same context changes). |
| Large guard count (~35) increases machine-guards.ts size | Guards are small (1-3 line checks). Group by class. Consider splitting into `machine-guards-barbarian.ts` etc. if file exceeds lint limit. |
| Inspector iframe loads `stately.ai/inspect` at runtime — requires network | Gate behind toggle/query param. Dev-only tool, not critical path. |
| Tag assignments drift from actual state semantics after future refactors | Tags are co-located with state definitions in `machine-states.ts`. Any state change forces reviewing tags in the same file. |