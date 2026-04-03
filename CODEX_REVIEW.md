# Architecture Review: Battle Visualizer Rendering Layer

## Request

Review the proposed architecture for a D&D 5e battle visualizer that renders an SVG+Motion (animation library) scene driven by an XState state machine. Critique the abstraction layers, identify coupling risks, and suggest improvements.

---

## Project Context

This is a D&D 5e combat simulator with a formally verified Quint specification (`battle.qnt`) and a TypeScript XState state machine (`battleMachine`) validated against the spec via model-based testing (MBT). The battle machine handles multi-creature combat: attacks, spellcasting, reaction interrupts (counterspell chains), AoE resolution, concentration, legendary actions, movement with opportunity attacks.

**What exists:**
- Quint spec (`battle.qnt`) — formal model of battle rules
- XState battle machine (`battle-machine.ts`) — TS implementation, MBT-validated against Quint
- Scripted demo scenario (`fireball-selfishness.ts`) — 16-event sequence: 6 wizards, Fireball + 4-deep counterspell chain + AoE resolution
- Creature-level XState machine (`machine.ts`) — single-creature state (HP, conditions, action economy, spell slots)
- Feature layer (`features/`) — class abilities, spell catalog (pure functions)

**What we're building:**
A visual rendering of the battle — 6 wizard tokens on a grid field, spell cast bars, HP bars, AoE zones, interrupt overlays, unconscious states. Driven by stepping through `BattleEvent[]` and reading `BattleContext` snapshots.

**Chosen renderer:** SVG-in-React + Motion (Framer Motion successor) — selected for maximum testability (SVG elements are DOM nodes, RTL-testable, vitest-compatible without browser).

---

## Demo Scenario: "Fireball Selfishness"

6 wizards (A,B,C blue team vs D,E,F red team). All 25 HP casters.

1. A casts Fireball (AoE, 28 fire damage, DEX save DC 15, half on success)
2. Counterspell chain: D counterspells -> B counter-counterspells -> E counter-counterspells -> C counter-counterspells
3. Chain resolves: Fireball goes through
4. AoE resolves per-target: B,C,D,E fail saves -> 28 damage -> unconscious. F saves -> 14 damage -> alive at 11 HP.
5. F's after-damage reaction window (game engine renders as "Absorb Elements")

Visual elements needed:
- **Grid field** — 5ft per square, ~10x8 grid
- **Creature tokens** — circle/sprite per creature, team-colored
- **HP bars** — horizontal bar per token showing current/max HP ratio
- **Cast bars** — animated bar above caster's head during spell casting (Ragnarok Online style — fills up during cast, not a game-state concept, purely visual)
- **AoE zone** — circle overlay for Fireball's 20ft-radius sphere centered on a target POINT (not on creatures — AoE targets a location, creatures in the zone are affected)
- **Interrupt overlay** — full-field dimming + "INTERRUPT" text during reaction phases (counterspell chain)
- **Spell slot indicators** — per-creature pips/dots showing remaining slots
- **Unconscious state** — visual indication (greyed out, fallen token)

Key D&D distinction: **AoE vs multi-target**. Fireball targets a POINT and everything in the radius is affected. Magic Missile targets individual CREATURES. This matters for rendering — AoE shows a zone, multi-target shows individual targeting lines.

---

## Proposed Architecture: Three Abstraction Layers

### Layer 1: Scene Model (pure business logic -> testable in vitest, no DOM)

```
(BattleContext, ScenarioMeta) -> SceneState
```

Pure function. Maps battle machine state to a renderer-agnostic scene description. NO coordinates, NO pixel values. Uses grid positions (row, col) and normalized ratios (0-1).

```typescript
interface SceneState {
  creatures: ReadonlyArray<CreatureSceneState>
  phase: PhaseInfo
  aoeZones: ReadonlyArray<AoEZoneInfo>
  castBars: ReadonlyArray<CastBarInfo>
  interruptActive: boolean
  interruptLabel: string | null
}

interface CreatureSceneState {
  id: string
  name: string
  team: "blue" | "red"
  gridPos: { row: number; col: number }  // grid coordinates, NOT pixels
  hpRatio: number        // 0-1, derived from hp/maxHp
  maxHp: number
  currentHp: number
  alive: boolean
  unconscious: boolean
  reactionAvailable: boolean
  slotsRemaining: number  // total remaining across all levels
  slotsMax: number        // total max across all levels
  isActiveCreature: boolean
  conditions: ReadonlyArray<string>
}

interface PhaseInfo {
  type: "activeTurn" | "interrupt" | "aoeResolving" | "movement" | "legendaryAction"
  activeCreatureId: string
  interruptType?: string  // "counterspell", "shield", "absorb_elements", etc.
  reactorId?: string
}

interface AoEZoneInfo {
  center: { row: number; col: number }  // target POINT on grid
  radiusInSquares: number               // 4 for fireball (20ft / 5ft)
  damageType: string                    // for color: "fire" -> red/orange
  active: boolean
}

interface CastBarInfo {
  casterId: string
  spellName: string
  progress: number  // 0-1, driven by animation/playback timing
}
```

**Key principle:** SceneState is a pure data structure derived from BattleContext. It adds rendering-relevant semantic info (grid positions from scenario meta, HP ratios, phase labels) but NO layout math, NO pixel coordinates. Fully testable: assert creature positions, HP ratios, phase transitions, AoE zones.

### Layer 2: Layout (coordinate math -> testable in vitest, no DOM)

```
(SceneState, LayoutConfig) -> LayoutState
```

Pure function. Converts grid positions to pixel coordinates, computes bar dimensions, AoE circle radii. This layer knows about pixels but not about SVG or React.

```typescript
interface LayoutConfig {
  cellSize: number        // pixels per grid square (e.g., 60)
  gridCols: number
  gridRows: number
  tokenRadius: number     // pixels (e.g., 22)
  hpBarWidth: number      // pixels
  hpBarHeight: number     // pixels
  castBarWidth: number
  castBarHeight: number
}

// LayoutState: everything the SVG layer needs as pixel coordinates
interface LayoutState {
  viewBox: { width: number; height: number }
  grid: {
    lines: ReadonlyArray<{ x1: number; y1: number; x2: number; y2: number }>
  }
  creatures: ReadonlyArray<CreatureLayout>
  aoeZones: ReadonlyArray<{ cx: number; cy: number; r: number; fill: string; opacity: number }>
  interruptOverlay: { visible: boolean; label: string | null; opacity: number }
}

interface CreatureLayout {
  id: string
  // Token
  cx: number; cy: number        // center pixel coordinates
  tokenRadius: number
  teamColor: string             // "#3b82f6" (blue) or "#ef4444" (red)
  opacity: number               // 1 alive, 0.3 unconscious
  label: string
  // HP bar
  hpBar: { x: number; y: number; totalWidth: number; fillWidth: number; height: number }
  // Cast bar (null if not casting)
  castBar: { x: number; y: number; totalWidth: number; fillWidth: number; height: number } | null
  // Slot indicator
  slots: { x: number; y: number; filled: number; total: number }
}
```

**Key principle:** Pure math. `cellSize * col + cellSize/2 = cx`. No React, no SVG, no animation. Testable: assert creature at grid (3,2) with cellSize=60 has cx=210, cy=150. Assert HP bar fillWidth = totalWidth * hpRatio.

### Layer 3: SVG Components (rendering -> testable with RTL)

Thin React components. Receive LayoutState as props, return SVG + Motion elements. Minimal logic — just JSX mapping.

```tsx
<svg viewBox={`0 0 ${layout.viewBox.width} ${layout.viewBox.height}`}>
  <GridOverlay lines={layout.grid.lines} />
  {layout.aoeZones.map(z => <AoEZone key={...} {...z} />)}
  {layout.creatures.map(c => <CreatureToken key={c.id} {...c} />)}
  {layout.interruptOverlay.visible && <InterruptOverlay {...layout.interruptOverlay} />}
</svg>
```

Each sub-component uses `<motion.circle>`, `<motion.rect>`, `<motion.text>` for animated transitions. Props change -> Motion animates. RTL-testable: `getByTestId("creature-A")`, assert `cx` attribute equals expected value.

### Data Flow

```
FIREBALL_SELFISHNESS events (scripted BattleEvent[])
    | step one at a time
    v
battleMachine actor (XState)
    | snapshot subscription
    v
BattleContext
    | deriveSceneState() — pure function (Layer 1)
    v
SceneState
    | computeLayout() — pure function (Layer 2)
    v
LayoutState
    | React props
    v
<BattleField> (SVG + Motion) (Layer 3)
    | DOM
    v
Browser / RTL test
```

### File Structure

```
src/battle-scene/
  scene-state.ts           # Layer 1: (BattleContext, Meta) -> SceneState
  scene-state.test.ts      # Pure vitest tests — no DOM
  layout.ts                # Layer 2: (SceneState, LayoutConfig) -> LayoutState
  layout.test.ts           # Pure vitest tests — no DOM
  BattlePage.tsx           # Route entry — actor + stepping + timeline
  BattleField.tsx          # <svg> root — renders LayoutState
  GridOverlay.tsx          # Grid lines
  CreatureToken.tsx        # Token circle + HP bar + cast bar + name + slots
  AoEZone.tsx             # AoE circle/rect overlay
  InterruptOverlay.tsx     # Dimming rect + label text
  BattleLog.tsx            # Transition log adapted for BattleEvent
```

---

## Questions for Review

1. **Layer boundaries:** Is the 3-layer split (scene model / layout / SVG) the right granularity? Should layout be folded into scene-state, or split further?

2. **Animation state:** Cast bars and interrupt overlays are temporal (fill over 500ms, fade in/out). These don't correspond to game state — casting is instantaneous in the machine. Should animation timing live in:
   - The scene model (explicit progress values)?
   - A separate animation controller between layout and SVG?
   - Purely in the SVG components (Motion handles it via prop transitions)?

3. **Stepping model:** The demo steps through events one at a time. Visually, some events should auto-advance (the 4 CS chain events play as a rapid sequence). Should stepping logic be manual (click), auto-play with delays, or both? Where does the delay-per-event-type mapping live?

4. **AoE target point:** Fireball targets a POINT, not creatures. Our `BATTLE_CAST_AOE` event doesn't carry a target point (the machine doesn't model space). For rendering, should we:
   - Add `targetPoint` to scenario metadata?
   - Derive it (center of all affected creatures)?
   - Add it to `BATTLE_CAST_AOE` event as an optional field?

5. **Spell visual catalog:** The machine knows `spellName: "fireball"` but not its visual properties (color, shape, icon). Where should the mapping `spellName -> visual properties` live?

6. **Grid positions:** BattleContext has no spatial state (by design — Quint spec decision O2). Initial creature positions must come from somewhere for rendering. Options:
   - Scenario metadata (hardcoded per demo)
   - A separate spatial state managed alongside the battle actor
   - Derived from team assignment (blue team left side, red team right side)

7. **Cast bar semantics:** In D&D, some spells have "1 action" casting time, others "1 minute." In the battle machine, all casts are one event. The cast bar is purely visual feedback. Should it be modeled in scene state at all, or entirely in the animation layer?

---

## Appendix: Key Types

### BattleContext (state machine output)

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

### BattleCreatureState (68 fields, key subset)

```typescript
interface BattleCreatureState {
  hp: number; maxHp: number; tempHp: number
  dead: boolean; unconscious: boolean
  // 14 condition booleans (blinded, charmed, etc.)
  reactionAvailable: boolean
  actionsRemaining: number; bonusActionUsed: boolean
  slotsCurrent: ReadonlyArray<number>  // 9 levels
  slotsMax: ReadonlyArray<number>
  concentrationSpellId: string
  slotExpendedThisTurn: boolean
  creatureKind: "PC" | "Monster"
  preparedSpells: ReadonlySet<string>
}
```

### Demo Scenario Event Types Used

```typescript
BATTLE_INIT          — creates 6 creatures with InitCreatureConfig[]
BATTLE_START_TURN    — begins A's turn
BATTLE_CAST_AOE      — A casts Fireball (spellName, dmg, dt, saveDC, halfOnSave)
BATTLE_RESOLVE_COUNTERSPELL — D/B/E/C counterspell chain + null to resolve
BATTLE_RESOLVE_AOE_TARGET   — per-target save resolution (saveRoll vs saveDC)
BATTLE_AFTER_DAMAGE_PASS    — F's after-damage reaction window
```

### AoE Rules (SRD 5.2.1)

Six shapes: Cone, Cube, Cylinder, Emanation, Line, Sphere. Grid = 5ft squares. Fireball = 20ft-radius Sphere ~ 48 squares. Grid discretization not in SRD — we use "center of square within radius." Medium creatures = 1 square.

### Ubiquitous Language (excerpt)

- **Hit Points (HP)** — current health, 0 to max. NOT the same as Temporary Hit Points (separate buffer).
- **Condition** — one of 14 named status effects (Blinded, Charmed, ..., Unconscious). Each has specific mechanical and visual implications.
- **Incapacitated** — meta-condition: can't take actions/reactions. Implied by Paralyzed, Petrified, Stunned, Unconscious.
- **AoE (Area of Effect)** — targets a POINT or area. Distinct from multi-target spells (which target individual creatures).
- **Reaction** — one per round (refreshes on your turn). Used for Counterspell, Opportunity Attack, Shield, etc.
- **Concentration** — maintaining a spell. One at a time. Broken by damage (CON save), incapacitation, or casting another concentration spell.

### Project Conventions (from CLAUDE.md)

- No external consumers — greenfield project, any layer can change
- No redundant state — never duplicate data across layers
- SRD feature parity — every rule traces to specific SRD text
- Quint parity — XState must match Quint spec, validated by MBT
- TypeScript: `as const satisfies ReadonlyArray<T>` for typed constant arrays
- ESLint max-lines: 420 per file
