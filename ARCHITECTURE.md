# Architecture Guide

Quick-reference for understanding the codebase, the verification pipeline, and how the pieces fit.

## The big picture

```mermaid
graph LR
    SRD[SRD 5.2.1 text] --> SPEC[dnd.qnt — Quint spec]
    SRD --> FEATURES[class-*.ts — pure functions]
    SPEC --> TESTS[dndTest.qnt — hand-written tests]
    SPEC --> TRACES[quint run — random traces]
    QA[community Q&A corpus] --> GEN[generate_assertions.py]
    SPEC --> GEN
    GEN --> QA_QNT[qa_generated.qnt]
    TRACES --> MBT[machine.mbt.test.ts]
    MBT -->|field-by-field comparison| XSTATE[machine.ts — XState]
    XSTATE --> BRIDGE[feature-bridge.ts]
    BRIDGE --> STORE[feature-store.ts — reducer]
    STORE --> HOOKS[useFeatures.ts — React hooks]
    HOOKS --> UI[React UI]
    FEATURES --> BRIDGE
```

Three verification layers catch bugs at different stages:
1. **Quint typechecker** catches bad spec code (including LLM-generated assertions)
2. **MBT traces** catch XState divergence from spec
3. **QA assertions** catch spec bugs against community rulings

---

## Layer 1: Quint spec (`dnd.qnt`)

The source of truth. Pure functions modeling D&D 5e core combat rules.

### Key types

```quint
type CreatureState = {
  hp: int, maxHp: int, tempHp: int,
  deathSaves: { successes: int, failures: int },
  stable: bool, dead: bool,
  exhaustion: int,
  // 14 condition booleans
  blinded: bool, charmed: bool, ..., unconscious: bool,
  incapacitatedSources: Set[IncapSource],
  activeEffects: List[ActiveEffect],
  prone: bool, grappled: bool, ...
}

type TurnState = {
  movementRemaining: int, effectiveSpeed: int,
  actionsRemaining: int, bonusActionUsed: bool,
  reactionAvailable: bool, extraAttacksRemaining: int,
  disengaged: bool, dodging: bool, readiedAction: bool,
  // spell-turn flags
  bonusActionSpellCast: bool, nonCantripActionSpellCast: bool,
  attackActionUsed: bool, freeInteractionUsed: bool
}

type FighterState = {
  secondWindCharges: int, secondWindMax: int,
  actionSurgeCharges: int, actionSurgeMax: int,
  actionSurgeUsedThisTurn: bool,
  indomitableCharges: int, indomitableMax: int,
  heroicInspiration: bool
}
```

### How the spec reads

Most logic is pure functions prefixed `p` (for "pure"):

```quint
// stand from prone: costs half your speed
pure def pStandFromProne(t: TurnState): TurnState = {
  val cost = t.effectiveSpeed / 2
  if (t.movementRemaining >= cost and cost > 0)
    t.with("movementRemaining", t.movementRemaining - cost)
     .with("prone", false)  // not in TurnState, simplified here
  else t
}

// movement cost per foot — climb/swim costs extra without matching speed
pure def pMovementCost(isDifficultTerrain: bool, isCrawling: bool,
                        isClimbingOrSwimming: bool, hasRelevantSpeed: bool): int = {
  val base = 1
  val terrainExtra = if (isDifficultTerrain) 1 else 0
  val crawlExtra = if (isCrawling) 1 else 0
  val climbSwimExtra = if (isClimbingOrSwimming and not(hasRelevantSpeed)) 1 else 0
  base + terrainExtra + crawlExtra + climbSwimExtra
}
```

Fighter features live in the same file (section 17.6), e.g.:

```quint
pure def pUseSecondWind(f: FighterState, d10Roll: int, fighterLevel: int): FighterState = {
  f.with("secondWindCharges", f.secondWindCharges - 1)
}

pure def pFighterStartTurn(f: FighterState, championLevel: int): FighterState = {
  val withInspiration =
    if (championLevel >= 10 and not(f.heroicInspiration))
      f.with("heroicInspiration", true)
    else f
  withInspiration.with("actionSurgeUsedThisTurn", false)
}
```

### Spec organization

The file is ~3000 lines, organized by SRD chapter:
- Sections 1-5: types, ability checks, d20 resolution
- Sections 6-10: conditions, action economy, attack resolution
- Sections 11-14: grapple/shove, spellcasting, HP/death, rest
- Sections 15-17: character construction, combat mode, Fighter features
- Section 18: state machine transitions (`do*` actions)
- Section 19: invariants for Apalache model checker

---

## Layer 2: XState machine (`machine.ts`)

Mirrors the Quint spec as a parallel-region XState machine. Four independent tracks:

```mermaid
stateDiagram-v2
    state "dnd (parallel)" as dnd {
        state "damageTrack" as dt {
            [*] --> alive
            alive --> dying: hp drops to 0
            alive --> dead: instant death (overflow >= maxHp)
            dying --> alive: nat 20 death save
            dying --> dead: 3 failures or nat 1
            state dying {
                [*] --> unstable
                unstable --> stable: 3 successes
                stable --> unstable: take damage
            }
        }

        state "turnPhase" as tp {
            [*] --> outOfCombat
            outOfCombat --> waitingForTurn: ENTER_COMBAT
            waitingForTurn --> acting: START_TURN
            acting --> waitingForTurn: END_TURN
            acting --> outOfCombat: LEAVE_COMBAT
        }

        state "conditionTrack" as ct {
            [*] --> tracking
            tracking --> tracking: APPLY/REMOVE_CONDITION
        }

        state "spellcasting" as sc {
            [*] --> idle
            idle --> concentrating: START_CONCENTRATION
            concentrating --> idle: break/end
        }
    }
```

### File split

`machine.ts` is capped at 420 lines (eslint). Logic lives in satellite files:

| File | What it does |
|------|-------------|
| `machine-types.ts` | `DndContext`, `DndEvent` (50+ event variants), branded types |
| `machine-states.ts` | State configs for all 4 parallel regions |
| `machine-guards.ts` | Boolean predicates (`canStandFromProne`, `instantDeathFromAlive`, ...) |
| `machine-helpers.ts` | Pure math: damage modifiers, death saves, speed calc, exhaustion |
| `machine-combat.ts` | Attack rolls, AC calc, grapple/shove resolution |
| `machine-damage.ts` | Damage/death-save resolver composition |
| `machine-startturn.ts` | START_TURN processing: speed, effect expiry, Heroic Rally |
| `machine-endturn.ts` | END_TURN processing: saves, damage, effect expiry |
| `machine-spells.ts` | Slot expenditure, long rest recovery, pact magic |
| `machine-queries.ts` | Derived state predicates (`isIncapacitated`) |

### Context shape (abbreviated)

```typescript
interface DndContext {
  // HP
  hp: HP, maxHp: HP, tempHp: TempHP,
  deathSaves: { successes: DeathSaveCount, failures: DeathSaveCount },
  stable: boolean, dead: boolean, exhaustion: ExhaustionLevel,

  // 14 conditions (boolean each)
  blinded, charmed, deafened, frightened, grappled, incapacitated,
  invisible, paralyzed, petrified, poisoned, prone, restrained,
  stunned, unconscious,
  incapacitatedSources: Set<IncapSource>,

  // action economy
  actionsRemaining: number, bonusActionUsed: boolean,
  reactionAvailable: boolean, movementRemaining: MovementFeet,
  effectiveSpeed: number, extraAttacksRemaining: number,

  // spells
  slotsMax: number[], slotsCurrent: number[],
  concentrationSpellId: string, activeEffects: ActiveEffect[],

  // fighter (MBT-bridged fields)
  secondWindCharges: number, actionSurgeCharges: number,
  actionSurgeUsedThisTurn: boolean, indomitableCharges: number,
  fighterLevel: number, heroicInspiration: boolean,
}
```

### Branded types

`types.ts` uses branded types for runtime validation:

```typescript
type HP = number & { readonly HP: unique symbol }
type D20Roll = 1 | 2 | ... | 20
type DeathSaveCount = 0 | 1 | 2 | 3
type ExhaustionLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6
```

---

## Layer 3: MBT bridge (`machine.mbt.test.ts`)

The correctness proof. Quint generates random traces, the bridge replays them against XState.

```mermaid
sequenceDiagram
    participant Q as Quint (quint run)
    participant B as MBT Bridge
    participant X as XState Machine

    Q->>B: trace = [{state, action}, {state, action}, ...]
    loop each step
        B->>B: parse Quint state (Zod schema)
        B->>B: translate event (QuintEventMap)
        B->>X: actor.send(translated event)
        B->>X: actor.getSnapshot()
        B->>B: normalize both states
        B->>B: assert deep equality
    end
```

### What gets compared

Every field of `CreatureState`, `TurnState`, and `FighterState` is compared after each step. The bridge translates Quint enums to TS strings:

```typescript
const QUINT_CONDITION_MAP = {
  CBlinded: "blinded", CCharmed: "charmed", ...
}
const QUINT_DAMAGE_TYPE_MAP = {
  Acid: "acid", Fire: "fire", ...
}
```

A single field mismatch fails the test. This is what keeps the two implementations in sync.

---

## Layer 4: QA pipeline (`scripts/qa/`)

Community Q&A from Reddit and Stack Exchange, turned into Quint test assertions by LLM.

```mermaid
flowchart LR
    CORPUS[".references/qa/<br>Reddit, SE, Sage Advice"] --> CLASSIFY["classify (Haiku)<br>is this a RAW question?"]
    CLASSIFY --> GENERATE["generate (Sonnet)<br>write a Quint run block"]
    GENERATE --> TYPECHECK["quint typecheck<br>reject bad output"]
    TYPECHECK --> CACHE[".references/qa/cache/assertions/"]
    CACHE --> ASSEMBLE["--rebuild<br>assemble qa_generated.qnt"]
    ASSEMBLE --> RUN["quint test qa_generated.qnt"]
```

### How it works

1. **Classify**: Haiku reads each Q&A, decides if it's a testable RAW mechanics question
2. **Generate**: Sonnet gets the full `dnd.qnt` spec as context, writes `run qa_*` blocks
3. **Typecheck**: every fragment wrapped in a temp module and typechecked before caching
4. **Cache**: results stored by content hash; reruns skip cached entries
5. **Assemble**: `--rebuild` stitches cached fragments into `qa_generated.qnt`

The LLM has zero tool access. Output is validated mechanically. A high generation failure rate is expected and fine; the pipeline retries.

### What a generated test looks like

```quint
// Source: https://reddit.com/r/onednd/comments/1esxwou/
run qa_prone_and_grappled_cannot_stand = {
  val target = freshCreature(30)
  val grappled = pGrapple(Medium, Medium, target, true, true).targetState
  val grappledAndProne = pApplyCondition(grappled, CProne)
  val t = pStartTurn(TEST_CONFIG, grappledAndProne, Unarmored, 0, false, false)
  val tAfterStandAttempt = pStandFromProne(t)
  assert(
    grappledAndProne.prone and grappledAndProne.grappled and
    t.effectiveSpeed == 0 and
    tAfterStandAttempt.movementRemaining == t.movementRemaining
  )
}
```

---

## Layer 5: Feature system (`app/src/features/`)

Class abilities as pure TypeScript functions, separate from the formally-specified core.

### Three sub-layers

```mermaid
graph TD
    PURE["class-fighter.ts<br>class-barbarian.ts<br>...<br><b>pure functions</b>"] --> BRIDGE["feature-bridge.ts<br>feature-bridge-barbarian.ts<br>...<br><b>can/execute adapters</b>"]
    BRIDGE --> STORE["feature-store.ts<br><b>reducer (useReducer)</b>"]
    STORE --> HOOKS["useFeatures.ts<br><b>React hooks</b>"]
    HOOKS --> UI["FeaturePanel<br>MonkPanel<br>..."]

    BRIDGE -->|BridgeResult.machineEvents| MACHINE[XState machine]
    BRIDGE -->|BridgeResult.featureAction| STORE
```

### Pure functions (`class-fighter.ts`)

Every feature follows the same pattern: separate precondition check + execution.

```typescript
export function canUseSecondWind(state: SecondWindState): boolean {
  return state.secondWindCharges > 0 && !state.bonusActionUsed
}

export function useSecondWind(
  state: SecondWindState,
  config: SecondWindConfig,
  effectiveSpeed: number
): SecondWindResult {
  const healAmount = config.d10Roll + config.fighterLevel
  return {
    hp: Math.min(state.hp + healAmount, state.maxHp),
    secondWindCharges: state.secondWindCharges - 1,
    bonusActionUsed: true,
    healAmount,
    tacticalShiftDistance: config.fighterLevel >= 5
      ? Math.floor(effectiveSpeed / 2) : 0
  }
}
```

Rules: no XState imports, no side effects, no new Quint state. Input in, output out.

### Bridge (`feature-bridge.ts`)

Adapts pure functions to the dual-state system. Returns a `BridgeResult`:

```typescript
interface BridgeResult {
  readonly featureAction: FeatureAction       // -> feature reducer
  readonly machineEvents: ReadonlyArray<DndEvent>  // -> XState actor
}

function executeSecondWind(featureState, ctx, d10Roll, fighterLevel): BridgeResult {
  const result = applySecondWind(/* extract fields from featureState + ctx */)
  return {
    featureAction: { type: "FIGHTER_USE_SECOND_WIND" },
    machineEvents: [
      { type: "USE_BONUS_ACTION" },
      { type: "HEAL", amount: healAmount(result.healAmount) }
    ]
  }
}
```

Two tracks of state update from a single user action. Feature state and machine state stay in sync without tight coupling.

### Reducer (`feature-store.ts`)

Standard `useReducer` pattern. Each class gets its own sub-reducer:

```typescript
function featureReducer(state: FeatureState, action: FeatureAction, config): FeatureState {
  let result = state
  result = reduceFighter(result, action, config)
  result = reduceBarbarian(result, action, config)
  result = reduceMonk(result, action, config)
  result = reducePaladin(result, action, config)
  result = reduceRogue(result, action, config)
  return result
}
```

Feature state includes per-class charge tracking:

```typescript
interface FighterFeatureState {
  secondWindCharges: number, secondWindMax: number,
  actionSurgeCharges: number, actionSurgeMax: number,
  actionSurgeUsedThisTurn: boolean,
  indomitableCharges: number, indomitableMax: number,
}

interface BarbarianFeatureState {
  raging: boolean, rageCharges: number,
  rageTurnsRemaining: number,
  recklessThisTurn: boolean, frenzyUsedThisTurn: boolean,
  relentlessRageTimesUsed: number, ...
}
```

Machine events like `SHORT_REST`, `LONG_REST`, `START_TURN` get forwarded to the reducer via `NOTIFY_*` actions so feature state stays in sync with combat phases.

---

## React UI

```mermaid
graph TD
    APP[App.tsx] --> ACTOR[XState actor]
    APP --> HOOKS[useFeatures hook]
    APP --> SP[StatePanel]
    APP --> EP[EventPanel]
    APP --> FP[FeaturePanel]
    APP --> TL[TransitionLog]

    HOOKS --> STORE[feature reducer]
    HOOKS --> BRIDGE[feature bridge]

    TL -->|jumpTo| REPLAY[replay: re-send all events from index 0]
```

The UI is a debugging/exploration tool. You send events to the machine and watch state update. Key feature: **time travel** via event log replay. Jumping to an earlier point stops the actor, creates a fresh one, replays events up to that index, and resyncs feature state in lockstep.

---

## Fighter: the showcase class

Fighter is the only class that spans all layers. It demonstrates the full pipeline depth.

```mermaid
graph LR
    SPEC["dnd.qnt<br>FighterState type<br>pUseSecondWind<br>pFighterStartTurn<br>..."] --> MBT["machine.mbt.test.ts<br>QuintFighterState schema<br>field-by-field comparison"]
    MBT --> MACHINE["machine.ts<br>useSecondWind action<br>useActionSurge action<br>fighterStartTurn action"]
    MACHINE --> PURE["class-fighter.ts<br>canUseSecondWind<br>useSecondWind<br>championCritRange<br>..."]
    PURE --> BRIDGE["feature-bridge.ts<br>canExecuteSecondWind<br>executeSecondWind<br>..."]
    BRIDGE --> UI_HOOK["useFeatures +<br>useFighterExtras"]
```

**Implemented (L1-L18, Champion subclass):**
- Second Wind (L1), Tactical Mind (L2), Tactical Shift (L5)
- Action Surge (L2), Extra Attack (L5/L11/L20)
- Indomitable (L9)
- Improved Critical (L3), Remarkable Athlete (L3)
- Heroic Warrior (L10), Superior Critical (L15)
- Survivor / Defy Death (L18)

All formally specified in Quint, MBT-verified, and wired through the full stack.

---

## Key patterns to know

**Guard-action**: XState transitions check a guard predicate, then run assign actions. Guards in `machine-guards.ts`, actions in `machine.ts`.

**Condition implication**: applying Paralyzed also implies Incapacitated. `incapacitatedSources` is a set tracking *why* a creature is incapacitated, so removing Paralyzed only removes incapacitation if no other source remains.

**`always` transitions**: damageTrack uses `always` guards to enforce invariants. If `hp === 0 && !dead`, the machine transitions to `dying` without any event.

**Branded types**: `HP`, `TempHP`, `D20Roll` are branded numbers. Factory functions (`hp()`, `d20Roll()`) clamp/validate at creation time. Prevents passing raw numbers where validated ones are expected.

**`p`-prefix convention**: Quint pure functions use `p` prefix (`pStartTurn`, `pUseMovement`, `pGrapple`). `do`-prefix for state machine actions that compose multiple `p`-functions.

---

## Running things

```bash
# Quint spec tests
quint test dndTest.qnt
quint test qa_generated.qnt

# XState + MBT tests (needs Quint Rust evaluator)
cd app && npm test

# React UI
cd app && npm run dev

# QA pipeline (needs API keys)
python3 scripts/qa/generate_assertions.py --agent claude --limit 50
python3 scripts/qa/generate_assertions.py --rebuild
```
