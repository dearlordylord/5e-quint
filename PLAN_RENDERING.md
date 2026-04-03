# Battle Visualizer — Rendering Architecture

**Renderer:** SVG-in-React + Motion. Selected for testability (RTL, vitest, no browser).
**Engine research:** See `ENGINE_RESEARCH.md` for full comparison.

## Four Layers

```
BattleContext (XState snapshot)
    | deriveSnapshot(ctx, meta) — Layer A
    v
SceneSnapshot (deterministic, no time, no pixels)
    | diffSnapshots(prev, curr) — pure delta
    | Director.step(event, snapshot, delta, clock) — Layer B
    v
SceneSnapshot + VisualCueState
    | computeLayout(snapshot, cues, config) — Layer C
    v
LayoutState (pixels)
    | React props — Layer D
    v
<BattleField> SVG + Motion
```

### Layer A: Scene Snapshot (pure, deterministic)

`(BattleContext, ScenarioMeta) -> SceneSnapshot`

No coordinates, no time, no animation. Grid positions and ratios only. Creatures in initiative order.

```typescript
interface ScenarioMeta {
  names: Record<string, string>
  teams: { blue: string[]; red: string[] }
  gridPositions: Record<string, { row: number; col: number }>
  aoeTargetPoints: Record<string, { row: number; col: number }>  // keyed by eventId
  spellAnnotations: Record<string, string>                        // keyed by eventId
}

interface SceneSnapshot {
  creatures: ReadonlyArray<CreatureSnapshot>  // initiative order
  phase: PhaseSnapshot
  aoeZones: ReadonlyArray<AoEZoneSnapshot>
  round: number
  activeCreatureId: string | null
}

interface CreatureSnapshot {
  id: string; name: string; team: "blue" | "red"
  gridPos: { row: number; col: number }
  hpRatio: number; currentHp: number; maxHp: number; tempHp: number
  alive: boolean; unconscious: boolean; dead: boolean
  reactionAvailable: boolean; concentrating: boolean
  totalSlotsRemaining: number; totalSlotsMax: number
  isActive: boolean
  conditions: ReadonlyArray<Condition>  // typed, labels at render edge
}

type InterruptKind = "PIAttackHit" | "PIAttackDamage" | "PISpellCast"
  | "PISaveFailed" | "PISaveFailedAoE" | "PIAfterDamage"

type PhaseSnapshot =
  | { type: "activeTurn" }
  | { type: "interrupt"; interruptKind: InterruptKind; reactorId?: string }
  | { type: "aoeResolving"; spellName: string; remainingCount: number }
  | { type: "movement" }
  | { type: "legendaryAction" }

interface AoEZoneSnapshot {
  zoneId: string
  centerGridPos: { row: number; col: number }
  radiusInSquares: number
  damageType: DamageType
  spellName: string
}
```

### Snapshot Delta (pure function)

`diffSnapshots(prev, curr) -> SnapshotDelta`

```typescript
interface SnapshotDelta {
  damageTaken: Record<string, number>      // id -> positive amount
  healingReceived: Record<string, number>  // id -> positive amount
  knockedOut: ReadonlyArray<string>
  reactionsSpent: ReadonlyArray<string>
  slotsExpended: ReadonlyArray<string>
  phaseChanged: boolean
  newAoeZones: ReadonlyArray<AoEZoneSnapshot>
}
```

### Layer B: Director (owns time, injectable clock)

`Director.step(event, snapshot, delta, clock) -> VisualCueState`

Module with injectable clock, thin `useDirector` React hook wrapper.

```typescript
interface VisualCueState {
  castBar: { casterId: string; spellName: string; progress: number } | null
  interruptOverlay: { opacity: number; label: string }
  creatureCues: Record<string, CreatureCue>
  autoAdvanceDelay: number
}

interface CreatureCue {
  damageFlash: boolean
  justKnockedOut: boolean
  castingGlow: boolean
}

interface PlaybackTiming {
  defaultDelayMs: number
  overrides: Partial<Record<BattleEvent["type"], number>>
}
```

### Layer C: Layout (pure math)

`(SceneSnapshot, VisualCueState, LayoutConfig) -> LayoutState`

```typescript
interface LayoutConfig {
  cellSize: number; gridCols: number; gridRows: number
  tokenRadius: number; barWidth: number; barHeight: number
}
```

Converts grid positions to pixels, computes bar dimensions, AoE circle radii.

### Layer D: SVG + Motion (thin rendering)

Components: `BattleField`, `GridOverlay`, `CreatureToken`, `AoEZone`, `InterruptOverlay`, `BattleLog`.

### Visual Catalog

`visual-catalog.ts` — 3 sub-catalogs: `spellVisuals`, `damageTypeVisuals`, `conditionVisuals`.

## Files

```
src/battle-scene/
  scene-snapshot.ts + test     # Layer A
  snapshot-diff.ts + test      # Delta
  director.ts + test           # Layer B (injectable clock)
  layout.ts + test             # Layer C
  visual-catalog.ts            # Spell/damage/condition visuals
  BattlePage.tsx               # Route entry
  BattleField.tsx              # <svg> root
  GridOverlay.tsx              # Grid lines
  CreatureToken.tsx            # Token + bars + slots
  AoEZone.tsx                  # Circle overlay
  InterruptOverlay.tsx         # Dimming + label
  BattleLog.tsx                # Event timeline
```

## Resolved Design Decisions (20)

| # | Decision |
|---|----------|
| 1 | 4 layers: projection / director / geometry / SVG |
| 2 | Director owns all temporal state (cast bars, flashes, delays) |
| 3 | Manual + auto-play stepping. Timing typed as `Partial<Record<BattleEvent["type"], number>>` |
| 4 | AoE target point in scenario metadata, keyed by stable eventId |
| 5 | Spell visual catalog separate from mechanical catalog |
| 6 | Grid positions in scenario metadata |
| 7 | Cast bar progress owned by Director, not scene snapshot |
| 8 | Director = module + thin useDirector hook wrapper |
| 9 | CreatureSnapshot = derived rendering-relevant subset (API boundary) |
| 10 | Visual catalog: spellVisuals + damageTypeVisuals + conditionVisuals |
| 11 | `aoeZones` as array (supports overlapping effects) |
| 12 | `diffSnapshots()` separate pure function, Director receives delta |
| 13 | Interrupt kind derived from `PendingInterrupt["tag"]`, no loose strings |
| 14 | `activeCreatureId: string \| null` |
| 15 | Metadata keyed by stable eventId, not array index |
| 16 | Damage/healing split (positive amounts, no sign confusion) |
| 17 | Creatures in initiative order (deterministic for tests) |
| 18 | Conditions typed as `Condition`, labels at render edge |
| 19 | AoE zones have `zoneId` for React keys |
| 20 | HP and temp HP visually distinct |
