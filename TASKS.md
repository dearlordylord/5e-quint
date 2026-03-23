# D&D 5e — Part 2 Implementation Plan

Part 1 (Quint spec) is done. This plan covers Part 2: XState bridge + frontend.

See `PRD.md` for full domain details (types, event mappings, state regions, guards, derived values).

---

## Durable Decisions

**Stack**: XState v5, @xstate/react, TanStack Start, Tailwind 4, Paraglide i18n (EN/RU), Effect Schema (branded types), Vitest, Husky + lint-staged + gitleaks. Mirrors savage repo.

**File structure** (under `app/src/`):
```
types.ts              -- Effect Schema branded types
machine.ts            -- XState v5 parallel state machine
machine-helpers.ts    -- pure helper functions (computeDamage, AC calc, etc.)
machine-queries.ts    -- derived value functions on snapshot
machine.test.ts       -- unit tests (vitest)
machine.mbt.test.ts   -- MBT traces (@firfi/quint-connect)
components/           -- React UI components
cookbook/              -- scenario data + components
routes/               -- TanStack Start routes
paraglide/            -- i18n messages
```

**Type patterns**:
- Sum types (Quint enum -> TS string union): `type Ability = "str" | "dex" | ...`
- Bounded numerics (Effect Schema branded): `HP`, `TempHP`, `ExhaustionLevel`, `D20Roll`, etc. Each with clamping constructor.
- Record types: TS interfaces with branded fields where appropriate.
- Full list of types in PRD "D&D domain types" section.

**Machine shape**: Single parallel machine (`id="dnd"`) with 5 regions: `damageTrack`, `conditionTrack`, `exhaustionTrack`, `turnPhase`, `spellcasting`, plus `equipmentState` in context. See PRD "Parallel state regions" for full layout.

**Incapacitated**: Derived, not a state node. Computed from `incapacitatedSources` set in context (paralyzed/petrified/stunned/unconscious/direct). Same as Quint spec.

**Guard naming**: `isConscious`, `canAct`, `isDead`, etc. — mirrors Quint predicates. Full list in PRD "Guards" section.

**Harness**: ESLint flat config, Prettier, tsconfig, vitest config, husky pre-commit — all copied from savage and adapted. 420-line max, no magic numbers, functional plugin, import sorting.

---

## Phase 1: App Scaffold + Damage Vertical Slice

The smallest end-to-end proof: take damage, heal, die. Establishes the branded type pattern, machine skeleton, and test harness.

### Build
- Harness files: package.json, tsconfig, eslint, prettier, vitest config, husky — adapted from savage
- `types.ts`: Branded types for this slice only — `HP`, `TempHP`, `DamageAmount`, `HealAmount`, `DeathSaveCount`, `D20Roll`, `ExhaustionLevel`, `DamageType` union, `Condition` union (just the type, not used yet)
- `machine.ts`: Machine skeleton with `damageTrack` region only (conscious/dying/dead). Context: `hp`, `maxHp`, `tempHp`, `deathSaves`. Events: `TAKE_DAMAGE`, `HEAL`, `GRANT_TEMP_HP`, `DEATH_SAVE`, `STABILIZE`, `KNOCK_OUT`
- `machine-helpers.ts`: `computeDamage` (resistance/vulnerability/immunity ordering), `applyTempHpAbsorb`
- `machine.test.ts`: Unit tests covering the 5 death save paths, instant death, temp HP absorption, damage modifiers, healing at 0 HP

### Acceptance
- [x] `npm run check-all` passes (build + typecheck + lint + test)
- [x] Branded type constructors clamp values (HP can't go negative, DeathSaveCount 0-3, D20Roll 1-20)
- [x] TAKE_DAMAGE: temp HP absorbs first, overflow to real HP, instant death if overflow >= maxHp
- [x] TAKE_DAMAGE at 0 HP: +1 death save failure (crit = +2)
- [x] DEATH_SAVE: nat 1 = +2 failures, nat 20 = regain 1 HP, >= 10 = success, < 10 = failure
- [x] 3 successes -> stable, 3 failures -> dead
- [x] HEAL at 0 HP resets death saves, transitions conscious
- [x] STABILIZE resets death saves, transitions to stable
- [x] KNOCK_OUT -> unconscious + stable at 0 HP
- [x] Dead is absorbing (no events transition out)
- [x] Resistance then vulnerability applied sequentially (halve 7 = 3, double 3 = 6)

---

## Phase 2: Conditions + Exhaustion

Adds the conditionTrack (14 parallel sub-regions) and exhaustionTrack. Wires condition implications (paralyzed -> incapacitated). Connects exhaustion level 6 -> dead.

### Build
- `types.ts`: Add `Condition` union (14 values), `IncapSource` union, `AbilityScore`, `ProficiencyBonus`
- `machine.ts`: Add `conditionTrack` (14 parallel boolean regions) + `exhaustionTrack` (sequential level0-level6). Context additions: `incapacitatedSources` set, `exhaustion` level. Events: `APPLY_CONDITION`, `REMOVE_CONDITION`, `ADD_EXHAUSTION`, `REDUCE_EXHAUSTION`
- `machine-helpers.ts`: Condition implication logic (apply/remove with source tracking)
- `machine-queries.ts`: `isIncapacitated(snap)`, `ownAttackMods(snap)`, `defenseMods(snap)`, `checkMods(snap)`, `saveMods(snap)`, `canAct(snap)`, `canSpeak(snap)` — all aggregating from condition state
- Cross-region wiring: exhaustion 6 -> damageTrack.dead; unconscious -> prone (in conditionTrack); TAKE_DAMAGE at 0 HP when unconscious -> auto-crit (2 failures)
- `machine.test.ts`: Tests for condition implications, exhaustion ladder, modifier aggregation, condition+damage interactions

### Acceptance
- [x] APPLY_CONDITION(paralyzed) sets incapacitated; REMOVE while stunned active -> incapacitated remains
- [x] Unconscious implies incapacitated AND prone
- [x] Exhaustion 6 transitions to dead
- [x] Exhaustion 4 halves maxHp (derived, not stored)
- [x] Modifier aggregation: blinded gives disadv on own attacks + adv to attackers
- [x] Prone: attacker within 5ft = adv, beyond 5ft = disadv
- [x] Auto-crit: paralyzed or unconscious + attacker within 5ft
- [x] Frightened: disadv on checks/attacks only when source in LOS (parameterized)
- [x] `canAct` = not incapacitated; `canSpeak` = not paralyzed/petrified/unconscious

---

## Phase 3: Turn Structure + Action Economy

Adds the turnPhase region. Models a creature's turn: movement budget, action/bonus/reaction tracking, extra attacks.

### Build
- `types.ts`: Add `ActionType` union, `MovementFeet`, `SpeedType` union
- `machine.ts`: Add `turnPhase` region (outOfCombat/acting/surprised). Context: movementRemaining, effectiveSpeed, actionUsed, bonusActionUsed, reactionAvailable, freeInteractionUsed, extraAttacksRemaining, disengaged, dodging, readiedAction, bonusActionSpellCast, nonCantripActionSpellCast. Events: `START_TURN`, `USE_ACTION`, `USE_BONUS_ACTION`, `USE_REACTION`, `USE_MOVEMENT`, `USE_EXTRA_ATTACK`, `STAND_FROM_PRONE`, `DROP_PRONE`, `END_SURPRISE_TURN`, `MARK_BONUS_ACTION_SPELL`, `MARK_NON_CANTRIP_ACTION_SPELL`
- `machine-helpers.ts`: `calculateEffectiveSpeed` (armor penalty, exhaustion, grappled/restrained), `movementCost` (difficult terrain, crawling, climbing/swimming multipliers)
- Guards: `actionAvailable`, `bonusActionAvailable`, `reactionAvailable`, `hasExtraAttacks`, `canCastBonusActionSpell`, `canCastNonCantripAction`
- Cross-region: incapacitated blocks actions; dodging cleared at turn start; standing costs half speed
- `machine.test.ts`: Turn lifecycle, action budget enforcement, bonus action spell rule, surprised creature restrictions, movement splitting, speed modifiers from conditions

### Acceptance
- [x] START_TURN resets movement, action/bonus/reaction flags, extra attacks from config
- [x] At most 1 action, 1 bonus action per turn; at most 1 reaction per round
- [x] Movement can split (before/after action, between attacks)
- [x] Bonus action spell -> action restricted to cantrip only (and vice versa)
- [x] Incapacitated creature cannot take actions or reactions
- [x] Dodge: attacks against have disadv until next turn start; ends if incapacitated
- [x] Standing from prone costs half effective speed; fails if insufficient
- [x] Surprised: can't move or act first turn, reaction available after turn ends
- [x] Speed 0 when grappled or restrained; halved at exhaustion 2+; 0 at exhaustion 5+

---

## Phase 4: Attack Resolution + Combat Actions

Full attack pipeline: roll -> hit/miss -> damage -> application. Plus grapple, shove, opportunity attacks, two-weapon fighting.

### Build
- `types.ts`: Add `CoverType`, `ArmorCategory`, `WeaponProperty`, `Size`, `ContestResult`, `ShoveChoice`, `AttackContext` record type
- `machine-helpers.ts`: `resolveAttack` (nat 1/20, AC comparison, cover), `calculateDamage` (crit doubles dice not modifiers), `calculateAC` (all armor formulas + unarmored defense), `calculateCoverBonus`
- `machine-queries.ts`: `calculateAC(snap, config)`, full attack modifier aggregation (adv/disadv from conditions, dodging, cover, underwater, heavy weapon + small creature, etc.)
- Events: `GRAPPLE`, `RELEASE_GRAPPLE`, `ESCAPE_GRAPPLE`, `SHOVE`
- Context additions for grapple state if needed
- `machine.test.ts`: Nat 1/20 edges, cover on AC and DEX saves, adv/disadv cancellation, crit damage calc, AC calculation for all armor types + unarmored defense variants, grapple size constraints, shove prone/push, two-weapon fighting preconditions

### Acceptance
- [x] Nat 20 always hits regardless of AC; nat 1 always misses
- [x] Critical hit doubles dice only, not flat modifiers
- [x] Resistance/vulnerability sequential: halve then double, not cancelled
- [x] Cover: half +2 AC/DEX saves, three-quarters +5, total = can't target
- [x] AC calculation correct for all armor categories + shield + unarmored defense
- [x] Grapple: target <= 1 size larger, free hand required, contest resolution, auto-success if incapacitated
- [x] Shove: prone or push 5ft, same size constraint
- [x] Attack modifier aggregation matches Quint pure functions for all condition combinations
- [x] Underwater combat modifiers applied correctly

---

## Phase 5: Spellcasting + Rest

Adds spellcasting region (idle/concentrating) with slot management, concentration checks, and rest recovery.

### Build
- `types.ts`: Add `SpellSlotLevel`
- `machine.ts`: Add `spellcasting` region (idle/concentrating). Context: slotsMax, slotsCurrent, pactSlotsMax, pactSlotsCurrent, pactSlotLevel, concentrationSpellId. Events: `EXPEND_SLOT`, `EXPEND_PACT_SLOT`, `START_CONCENTRATION`, `BREAK_CONCENTRATION`, `CONCENTRATION_CHECK`, `SHORT_REST`, `LONG_REST`, `SPEND_HIT_DIE`
- `machine-helpers.ts`: `concentrationDC` (max(10, floor(damage/2))), `calculateMulticlassSlots`
- Cross-region: concentration broken by incapacitation or death; armor proficiency check blocks casting; short rest restores pact slots + spend hit dice; long rest restores all HP/slots/hit dice + reduces exhaustion
- `machine.test.ts`: Slot expenditure/validation, concentration save DC, concentration broken by new spell/incap/death, ritual casting (no slot, can't upcast), short rest HD spending, long rest full recovery, multiclass slot calculation

### Acceptance
- [x] At most one concentration spell active
- [x] Concentration DC = max(10, floor(damage/2)); separate save per damage source
- [x] Concentration broken by: new concentration spell, incapacitation, death, failed save
- [x] Ritual: no slot, +10 min, can't upcast, requires canRitualCast config flag
- [x] Armor without proficiency -> cannot cast at all
- [x] Short rest: spend hit dice (roll + CON mod, min 0), restore pact slots
- [x] Long rest: full HP, restore half HD (min 1), all slots, -1 exhaustion if ate, clear temp HP
- [x] Can't long rest more than once per 24h; requires >= 1 HP
- [x] Multiclass slot calculation matches PHB table for full/half/third caster combos
- [x] Pact slots separate from regular slots but interchangeable for casting

---

## Phase 6: Environmental + Equipment Events

Adds remaining events: falling, suffocation, starvation, dehydration, equipment state. Completes the machine.

### Build
- `types.ts`: Add `Illumination`, `TravelPace`, remaining branded types if any
- `machine.ts`: Add `equipmentState` context (armorState, hasShield). Events: `APPLY_FALL`, `SUFFOCATE`, `APPLY_STARVATION`, `APPLY_DEHYDRATION`
- `machine-helpers.ts`: `fallDamage` (min(height/10, 20) d6), suffocation timing, starvation/dehydration exhaustion rules
- `machine.test.ts`: Fall damage + land prone, suffocation -> 0 HP, food/water exhaustion (including doubled dehydration when already exhausted), equipment don/doff timing, armor STR requirement speed penalty

### Acceptance
- [x] Fall: correct d6 count, land prone unless damage avoided
- [x] Suffocation: hold breath = 1 + CON mod minutes (min 30s), then CON mod rounds, then 0 HP
- [x] Starvation: 1 exhaustion/day after (3 + CON mod) days
- [x] Dehydration: already exhausted -> 2 levels instead of 1 (water only, not food)
- [x] Equipment context tracks armor state and shield
- [x] All 30+ events from PRD event table are implemented
- [x] Full `npm run check-all` passes with complete machine

---

## Phase 7: Quint Actions + Invariants (MBT Prerequisite)

Makes the Quint spec MBT-ready. Adds thin actions, nondeterministic `step`, and formal invariants to `dnd.qnt`.

### Build
- `dnd.qnt`: Add `var state`, `var turnState`, `var spellSlots`. Add `action init` with nondeterministic creature creation. Add thin `action doX(...)` wrappers for each pure function. Add `action step` = `any { doTakeDamage(...), doHeal(...), ... }` with nondeterministic params.
- Safety invariants: `hpBounded`, `deadImpliesHp0`, `paralyzedImpliesIncap`, `exhaustion6ImpliesDead`, `deadIsAbsorbing`, `stableImpliesDeathSavesReset`, `atMostOneConcentration`, etc.
- `dndTest.qnt`: Verify invariants hold across random traces

### Acceptance
- [x] `quint run dnd.qnt --invariant=allInvariants` passes (1000+ steps, no violations)
- [x] Every pure function has a corresponding thin action
- [x] `step` action covers all actions nondeterministically
- [x] All invariants from PRD listed and verified

---

## Phase 8: MBT Bridge

Connects Quint traces to XState via `@firfi/quint-connect`. The critical correctness proof.

### Build
- `machine.mbt.test.ts`: MBT driver following savage pattern. `EventActionMap` type for compile-time completeness (every Quint action maps to an XState event). `snapshotToQuintState()` converts hierarchical XState snapshot to flat Quint state for field-by-field comparison.
- Zod schemas for ITF parsing (required by quint-connect)
- Sync enforcement test: parse Quint AST, detect state fields not covered by driver

### Acceptance
- [x] `EventActionMap` covers every Quint action — missing one is a compile error
- [x] `snapshotToQuintState()` maps all 5 XState regions to flat Quint fields
- [x] 50+ MBT traces x 30 steps pass (Quint state matches XState state after every step)
- [x] Sync test detects new Quint fields not yet mapped

---

## Phase 9: Frontend — Interactive Simulator

React UI for stepping through creature state changes. Same as savage's simulator.

### Build
- TanStack Start app scaffold (routes, server, router)
- `components/`: Machine provider, state display panel (HP bar, condition badges, exhaustion gauge, turn resources, spell slots, concentration indicator), event dispatch panel (forms for each event with branded-type inputs)
- Paraglide i18n setup (EN/RU message files)
- Tailwind 4 styling

### Acceptance
- [ ] Dev server runs, renders creature state
- [ ] Can dispatch any event via UI and see state update
- [ ] All 14 conditions visually indicated
- [ ] Death save tracker visible in dying state
- [ ] Turn resource panel shows action/bonus/reaction/movement/extra attacks
- [ ] Spell slot grid with expenditure
- [ ] i18n toggle switches EN/RU

---

## Phase 10: Frontend — Scenario Cookbook

Step-by-step walkthroughs of D&D mechanics, replayable in the UI.

### Build
- `cookbook/scenarios.ts`: `ScenarioStep = { event, label, expect[] }`. Scenarios grouped by category (damage paths, death saves, condition interactions, combat round, spellcasting, rest recovery, environmental)
- `cookbook/components/`: ScenarioBrowser (sidebar), ScenarioPlayer (step-through with assertions)
- Route: `/cookbook`

### Acceptance
- [ ] At least 15 scenarios covering priority test cases from PRD "Testing Strategy"
- [ ] Each scenario step shows event dispatched, expected state, pass/fail assertion
- [ ] Can step forward/backward through scenario
- [ ] Category sidebar navigation works
- [ ] All scenarios pass their assertions

---

## Dependency Summary

```
Phase 1 ── scaffold + damage (proves architecture)
Phase 2 ── conditions + exhaustion (wires cross-region)
Phase 3 ── turns + action economy
Phase 4 ── attacks + combat actions
Phase 5 ── spellcasting + rest
Phase 6 ── environmental + equipment (completes machine)
Phase 7 ── Quint actions + invariants (independent of 1-6, but logically after machine is complete)
Phase 8 ── MBT bridge (needs 6 + 7)
Phase 9 ── frontend simulator (needs 6)
Phase 10 ── scenario cookbook (needs 9)
```

Phases 7 and 1-6 are independent tracks. Phase 7 can start anytime. Phases 9-10 can start after Phase 6. Phase 8 requires both tracks complete.
