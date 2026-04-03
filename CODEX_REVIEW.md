# Architecture Review: Battle Visualizer Rendering Layer (Round 2)

## Request

Review the refined 4-layer architecture for a D&D 5e battle visualizer. Round 1 feedback identified coupling risks (temporal state mixed with game state, AoE semantics, state duplication). This revision incorporates those fixes. Please critique for remaining issues.

---

## Project Context

D&D 5e combat simulator with formally verified Quint specification (`battle.qnt`) and TypeScript XState state machine (`battleMachine`) validated via model-based testing. The battle machine handles multi-creature combat: attacks, spellcasting, reaction interrupts (counterspell chains up to 4 deep), AoE resolution, concentration, legendary actions, movement with opportunity attacks.

**What exists:**
- Quint spec (`battle.qnt`) — formal model of battle rules
- XState battle machine (`battle-machine.ts`) — MBT-validated against Quint
- Scripted demo (`fireball-selfishness.ts`) — 16-event sequence: 6 wizards, Fireball + counterspell chain + AoE
- Creature-level machine (`machine.ts`) — single-creature state
- Feature/spell catalog (`features/spell-*.ts`) — pure functions for spell mechanics

**What we're building:**
Visual rendering of the demo — wizard tokens on a grid, cast bars, HP bars, AoE zones, interrupt overlays, unconscious states. Driven by stepping through `BattleEvent[]` and reading `BattleContext` snapshots. Chosen renderer: SVG-in-React + Motion (animation library) for maximum testability.

---

## Demo Scenario: "Fireball Selfishness"

6 wizards (A,B,C blue team vs D,E,F red team). All 25 HP casters.

1. A casts Fireball — AoE targets a POINT on the grid, 20ft-radius sphere, 28 fire damage, DEX save DC 15, half on success
2. Counterspell chain: D -> B -> E -> C (4 deep)
3. Chain resolves: Fireball goes through
4. AoE resolves per-target: B,C,D,E fail saves -> unconscious. F saves -> 11 HP.
5. F's after-damage reaction window (renderer shows "Absorb Elements")

Visual elements:
- **Grid field** — 5ft per square
- **Creature tokens** — team-colored circles (sprites later)
- **HP bars** — per-token, showing current/max ratio. Temp HP visually distinct from HP.
- **Cast bars** — animated bar above caster during casting (Ragnarok Online style). Purely visual — casting is instantaneous in the machine.
- **AoE zone** — circle overlay on target POINT (not on creatures). AoE targets a location; creatures in the zone are affected.
- **Interrupt overlay** — full-field dimming + "INTERRUPT" label during reaction phases
- **Spell slot indicators** — per-creature pips showing remaining slots
- **Unconscious state** — greyed out / fallen token

Key D&D distinction: **AoE targets a POINT** (Fireball). **Multi-target targets CREATURES** (Magic Missile). Visually different — AoE shows a zone, multi-target shows targeting indicators per creature.

---

## Revised Architecture: Four Layers

### Round 1 feedback incorporated:
- **Split time from state** — new Director layer owns animation timing, separate from deterministic snapshot
- **AoE target point** in scenario metadata, not derived from creatures
- **Spell visual catalog** — separate from mechanical catalog
- **No state duplication** — derive, don't copy. SceneSnapshot references BattleContext data, doesn't persist copies.

### Layer A: Domain Projection (pure, deterministic, frame-invariant)

```
(BattleContext, ScenarioMeta) -> SceneSnapshot
```

Maps battle machine output to a renderer-agnostic scene description. NO coordinates, NO time, NO animation. Grid positions and ratios only.

```typescript
/** Scenario-provided data not in BattleContext (spatial, visual, identity). */
interface ScenarioMeta {
  names: Record<string, string>          // id -> display name
  teams: { blue: string[]; red: string[] }
  gridPositions: Record<string, { row: number; col: number }>  // id -> grid pos
  aoeTargetPoints: Record<number, { row: number; col: number }>  // event index -> grid point
  spellAnnotations: Record<number, string>  // event index -> spell name for renderer
}

/** Deterministic projection of BattleContext. No time, no animation. */
interface SceneSnapshot {
  creatures: ReadonlyArray<CreatureSnapshot>
  phase: PhaseSnapshot
  aoeZones: ReadonlyArray<AoEZoneSnapshot>  // array — supports overlapping effects
  round: number
  activeCreatureId: string | null  // null during init / edge transitions
}

interface CreatureSnapshot {
  id: string
  name: string
  team: "blue" | "red"
  gridPos: { row: number; col: number }
  // Derived from BattleCreatureState — NOT copied
  hpRatio: number           // hp / maxHp
  currentHp: number
  maxHp: number
  tempHp: number            // separate from HP per ubiquitous language
  alive: boolean            // !dead && !unconscious
  unconscious: boolean
  dead: boolean
  reactionAvailable: boolean
  concentrating: boolean    // concentrationSpellId !== ""
  totalSlotsRemaining: number  // sum of slotsCurrent
  totalSlotsMax: number        // sum of slotsMax
  isActive: boolean         // is it this creature's turn
  conditions: ReadonlyArray<string>  // active condition names
}

// Derived from BattlePhase + PendingInterrupt tags — no loose strings
type InterruptKind = "PIAttackHit" | "PIAttackDamage" | "PISpellCast"
  | "PISaveFailed" | "PISaveFailedAoE" | "PIAfterDamage"

type PhaseSnapshot =
  | { type: "activeTurn" }
  | { type: "interrupt"; interruptKind: InterruptKind; reactorId?: string; targetId?: string }
  | { type: "aoeResolving"; spellName: string; remainingCount: number }
  | { type: "movement" }
  | { type: "legendaryAction" }

interface AoEZoneSnapshot {
  centerGridPos: { row: number; col: number }  // from scenario metadata
  radiusInSquares: number
  damageType: string       // for visual catalog color lookup
  spellName: string
}
```

**Testing:** Pure vitest. Assert creature HP ratios, phase types, AoE zone positions. No DOM, no time.

### Layer B: Director / Playback (owns time, testable with fake timers)

```
(event, SceneSnapshot, SnapshotDelta, clock, playbackMode) -> VisualCueState
```

Delta computed by a separate pure function, NOT by the Director:
```typescript
/** Pure, deterministic, unit-testable. */
function diffSnapshots(prev: SceneSnapshot, curr: SceneSnapshot): SnapshotDelta

interface SnapshotDelta {
  hpChanges: Record<string, number>          // id -> damage dealt (negative) or healing
  knockedOut: ReadonlyArray<string>          // ids that went alive -> unconscious
  reactionsSpent: ReadonlyArray<string>      // ids that lost reaction
  slotsExpended: ReadonlyArray<string>       // ids that spent a slot
  phaseChanged: boolean
  newAoeZones: ReadonlyArray<AoEZoneSnapshot>
}
```

Director owns ALL temporal/transient state that doesn't exist in the battle machine: cast bar fill progress, interrupt fade opacity, auto-advance delays, "just took damage" flash timers.

```typescript
interface VisualCueState {
  castBar: { casterId: string; spellName: string; progress: number } | null
  interruptOverlay: { opacity: number; label: string }  // 0 = hidden, 1 = full
  creatureCues: Record<string, CreatureCue>
  autoAdvanceDelay: number  // ms until next auto-step (0 = manual mode)
}

interface CreatureCue {
  damageFlash: boolean    // briefly true after taking damage
  justKnockedOut: boolean // briefly true after going unconscious
  castingGlow: boolean    // true while casting
}

/** Per-event-type timing config. Uses BattleEvent["type"] union — can't drift. */
interface PlaybackTiming {
  defaultDelayMs: number
  overrides: Partial<Record<BattleEvent["type"], number>>
  // e.g., { BATTLE_RESOLVE_COUNTERSPELL: 800, BATTLE_RESOLVE_AOE_TARGET: 1200 }
}
```

**Testing:** `vi.useFakeTimers()`. Advance clock, assert cast bar progress, interrupt fade, auto-advance triggers. No DOM.

### Layer C: Layout / Geometry (pure math)

```
(SceneSnapshot, VisualCueState, LayoutConfig) -> LayoutState
```

Converts grid positions to pixel coordinates. Computes bar dimensions, AoE circle radii. Pure math — no React, no SVG.

```typescript
interface LayoutConfig {
  cellSize: number          // px per grid square (e.g., 60)
  gridCols: number
  gridRows: number
  tokenRadius: number       // px
  barWidth: number          // px (shared by HP bar and cast bar)
  barHeight: number         // px
}

interface LayoutState {
  viewBox: { width: number; height: number }
  gridLines: ReadonlyArray<{ x1: number; y1: number; x2: number; y2: number }>
  creatures: ReadonlyArray<CreatureLayout>
  aoeZones: ReadonlyArray<{ cx: number; cy: number; r: number; color: string }>
  interruptOverlay: { opacity: number; label: string | null }
}

interface CreatureLayout {
  id: string
  cx: number; cy: number          // token center px
  tokenRadius: number
  teamColor: string               // hex
  opacity: number                 // 1 alive, 0.3 unconscious, 0 dead
  label: string
  hpBar: BarLayout
  tempHpBar: BarLayout | null     // visually distinct from HP
  castBar: BarLayout | null       // null if not casting
  slotPips: { x: number; y: number; filled: number; total: number }
  damageFlash: boolean
  castingGlow: boolean
}

interface BarLayout {
  x: number; y: number
  totalWidth: number; fillWidth: number; height: number
  color: string
}
```

**Testing:** Pure vitest. Assert pixel coordinates from grid positions. Assert bar dimensions from ratios.

### Layer D: SVG + Motion Components (thin rendering)

Receives LayoutState as props, returns SVG with Motion animations. Minimal logic.

```tsx
<svg viewBox={`0 0 ${layout.viewBox.width} ${layout.viewBox.height}`}>
  <GridOverlay lines={layout.gridLines} />
  {layout.aoeZones.map(z => <AoEZone key={...} {...z} />)}
  {layout.creatures.map(c => <CreatureToken key={c.id} {...c} />)}
  {layout.interruptOverlay.opacity > 0 && <InterruptOverlay {...layout.interruptOverlay} />}
</svg>
```

**Testing:** RTL. `getByTestId("creature-A")`, assert `cx`, `opacity`. Snapshot tests for SVG structure.

### Data Flow

```
FIREBALL_SELFISHNESS events (BattleEvent[])
    | step one at a time
    v
battleMachine actor (XState)
    | snapshot
    v
BattleContext ─────────────────────────────────────┐
    | deriveSnapshot(ctx, meta) — Layer A           |
    v                                               |
SceneSnapshot (deterministic, no time)              |
    |                                               |
    + diffSnapshots(prev, curr) — pure delta          |
    + Director(event, snapshot, delta, clock) — Layer B
    |                                               |
    v                                               |
SceneSnapshot + VisualCueState                      |
    | computeLayout(snapshot, cues, config) — Layer C
    v
LayoutState (pixels)
    | React props — Layer D
    v
<BattleField> SVG + Motion
```

### File Structure

```
src/battle-scene/
  scene-snapshot.ts          # Layer A: (BattleContext, Meta) -> SceneSnapshot
  scene-snapshot.test.ts     # Pure vitest
  snapshot-diff.ts           # diffSnapshots(prev, curr) -> SnapshotDelta
  snapshot-diff.test.ts      # Pure vitest
  director.ts                # Layer B: playback timing, visual cues (injectable clock)
  director.test.ts           # Fake timers vitest
  layout.ts                  # Layer C: (Snapshot, Cues, Config) -> LayoutState
  layout.test.ts             # Pure vitest
  visual-catalog.ts          # spellName -> { color, shape, castDurationMs, aoeStyle }
  BattlePage.tsx             # Route: actor + Director + stepping
  BattleField.tsx            # <svg> root
  GridOverlay.tsx            # Grid lines
  CreatureToken.tsx          # Token + HP bar + cast bar + name + slots
  AoEZone.tsx               # Circle overlay
  InterruptOverlay.tsx       # Dimming rect + label
  BattleLog.tsx              # Event timeline (reuse TransitionLog pattern)
```

---

## Resolved Questions

| # | Round | Question | Resolution |
|---|-------|----------|------------|
| 1 | R1 | Layer boundaries | 4 layers: projection / director / geometry / SVG |
| 2 | R1 | Animation state | Director layer with injectable clock |
| 3 | R1 | Stepping model | Both manual + auto-play. Delay config typed as `Partial<Record<BattleEvent["type"], number>>` |
| 4 | R1 | AoE target point | Scenario metadata `aoeTargetPoints` |
| 5 | R1 | Spell visual catalog | `visual-catalog.ts` with sub-catalogs: spells, damageTypes, conditions |
| 6 | R1 | Grid positions | Scenario metadata `gridPositions` |
| 7 | R1 | Cast bar | Director owns progress. SceneSnapshot has casting intent only |
| 8 | R2 | Director as hook vs module | Module/core with injectable clock + thin `useDirector` React wrapper |
| 9 | R2 | Derived vs referenced | Hybrid: CreatureSnapshot is the API boundary with derived rendering-relevant fields. Layout never touches BattleCreatureState. |
| 10 | R2 | Visual catalog scope | 3 sub-catalogs: spellVisuals, damageTypeVisuals, conditionVisuals |
| 11 | R2 | Multiple AoE zones | Array now (`aoeZones: ReadonlyArray<...>`). Prevents future refactor. |
| 12 | R2 | Snapshot deltas | Separate pure `diffSnapshots(prev, curr) -> SnapshotDelta`. Director receives delta, doesn't compute it. |
| 13 | R2 | Typed timing config | `Partial<Record<BattleEvent["type"], number>>` — can't drift from event union |
| 14 | R2 | InterruptType typing | Derived from `PendingInterrupt["tag"]` — no loose strings |
| 15 | R2 | activeCreatureId | `string \| null` — null during init/edge transitions |

---

## Appendix: Key Types (unchanged from Round 1)

### BattleContext

```typescript
interface BattleContext {
  readonly creatures: ReadonlyMap<CreatureId, BattleCreatureState>
  readonly initiative: ReadonlyArray<CreatureId>
  readonly turnIndex: number
  readonly round: number
  readonly turnStarted: boolean
  readonly phase: BattlePhase
  readonly spellStack: ReadonlyArray<SpellStackEntry>
}

type BattlePhase =
  | { tag: "BPActiveTurn" }
  | { tag: "BPAwaitingReaction"; ctx: AwaitCtx }
  | { tag: "BPResolvingAoE"; aoe: AoESpellCtx }
  | { tag: "BPResolvingMovement"; mv: MovementCtx }
  | { tag: "BPAwaitingLegendaryAction"; la: LAWindowCtx }

type PendingInterrupt =
  | { tag: "PIAttackHit"; ctx: AttackHitCtx }
  | { tag: "PIAttackDamage"; ctx: AttackDamageCtx }
  | { tag: "PISpellCast"; ctx: SpellCastCtx }
  | { tag: "PISaveFailed"; ctx: SaveFailedCtx }
  | { tag: "PISaveFailedAoE"; sf: SaveFailedCtx; aoe: AoESpellCtx }
  | { tag: "PIAfterDamage"; ctx: AfterDamageCtx }
```

### BattleCreatureState (key rendering-relevant fields)

```typescript
interface BattleCreatureState {
  hp: number; maxHp: number; tempHp: number
  dead: boolean; unconscious: boolean
  blinded: boolean; charmed: boolean; frightened: boolean
  paralyzed: boolean; petrified: boolean; poisoned: boolean
  prone: boolean; restrained: boolean; stunned: boolean
  // ... more conditions
  reactionAvailable: boolean
  slotsCurrent: ReadonlyArray<number>  // 9 levels
  slotsMax: ReadonlyArray<number>
  concentrationSpellId: string
  slotExpendedThisTurn: boolean
  creatureKind: "PC" | "Monster"
}
```

### Demo Events Used

```
BATTLE_INIT                   — 6 creatures via InitCreatureConfig[]
BATTLE_START_TURN             — begins A's turn
BATTLE_CAST_AOE               — Fireball (spellName, dmg, dt, saveDC, halfOnSave)
BATTLE_RESOLVE_COUNTERSPELL   — CS chain (4 deep) + null to resolve
BATTLE_RESOLVE_AOE_TARGET     — per-target save (saveRoll vs saveDC)
BATTLE_AFTER_DAMAGE_PASS      — F's reaction window
```

### AoE (SRD 5.2.1)

Shapes: Cone, Cube, Cylinder, Emanation, Line, Sphere. Grid = 5ft squares. Fireball = 20ft-radius Sphere ~ 48 squares. Grid discretization: "center of square within radius."

### Ubiquitous Language (rendering-relevant)

- **HP** and **Temporary HP** are distinct (separate bars/indicators)
- **Condition** — 14 named status effects, each with visual implications
- **Incapacitated** — implied by Paralyzed, Petrified, Stunned, Unconscious
- **Reaction** — one per round, refreshes on your turn
- **Concentration** — one spell at a time, broken by damage/incapacitation
- **AoE** — targets a POINT/area, not creatures. Distinct from multi-target.

### Project Conventions

- No redundant state across layers — derive, don't copy
- SRD feature parity — every rule traces to SRD text
- TypeScript: `as const satisfies ReadonlyArray<T>` for typed constant arrays
- ESLint max-lines: 420 per file
- Existing routing: pathname-based (`/simulator`, `/machine-viz`, `/`). Battle viz = new route.
