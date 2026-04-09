# 12. Opportunity Attack Path Analysis

## Idea

Model movement as a sequence of discrete positional steps and detect opportunity attacks by tracking when a mover exits an opponent's threatened reach at each step — with the engine owning the grid and computing reach exits internally, rather than receiving threat sets from callers.

## Origin

### The SRD Rule (SRD 5.2.1, Rules Glossary: "Opportunity Attack")

> You can make an Opportunity Attack when a creature that you can see leaves your reach using its action, its Bonus Action, its Reaction, or its movement. [...] The attack occurs right before the creature leaves your reach.

The rule is defined in terms of **reach boundaries**: the attack fires at the instant a creature crosses from "within reach" to "outside reach." On a physical tabletop this is adjudicated visually — the DM sees the miniature leave a square. In a computational engine, this raises a design question: **who detects the boundary crossing?**

Two architectural answers exist in the wild:

1. **Path analysis** — the engine owns a grid, computes the movement path step by step, and detects reach exits itself.
2. **Abstract threat set** — the engine receives a set of threatening creatures as input (from a UI layer, a DM, or a nondeterministic model) and resolves the OA pipeline without knowing geometry.

This document analyzes pattern (1) and evaluates it against our project's choice of pattern (2).

### The Computational Problem

```
Given:
  - A mover M at position P₀ with speed S
  - A set of opponents {O₁, O₂, ...} each with reach R and position
  - A destination P_n

Determine:
  - The path P₀ → P₁ → P₂ → ... → P_n (possibly via pathfinding)
  - At each step Pᵢ → Pᵢ₊₁, which opponents' reach is exited
  - For each exit: is the opponent eligible (has reaction, not incapacitated, etc.)
  - Resolve each OA (full attack) before proceeding to the next step
  - If the mover drops to 0 HP, truncate movement at the OA location
```

This is inherently a **spatial + sequential** problem. Engines that own the grid can solve it internally; engines that abstract away space must delegate the detection to callers.

## Graphical Illustration

### Single OA — mover leaves one opponent's reach

```
    Grid (5ft squares)         Reach boundary (R=5ft)
    ┌───┬───┬───┬───┬───┐
    │   │   │   │   │   │     O₁ threatens the 8 squares
    ├───┼───┼───┼───┼───┤     adjacent to it (marked ·)
    │   │ · │ · │ · │   │
    ├───┼───┼───┼───┼───┤     M moves East: A → B → C
    │   │ · │O₁ │ · │   │
    ├───┼───┼───┼───┼───┤     Step A→B: M still in O₁'s reach
    │   │ · │ · │ · │   │       → no OA
    ├───┼───┼───┼───┼───┤
    │   │   │   │   │   │     Step B→C: M leaves O₁'s reach
    └───┴───┴───┴───┴───┘       → OA checkpoint! O₁ offered reaction

         M path: ── A ── B ──→ C
                     ↑    ↑     ↑
                   start  in   EXIT
                        reach  reach
```

### Multiple OAs — mover crosses two reach zones

```
    ┌───┬───┬───┬───┬───┬───┬───┐
    │   │   │   │   │   │   │   │
    ├───┼───┼───┼───┼───┼───┼───┤
    │   │ · │ · │ · │   │   │   │    M moves A → B → C → D → E
    ├───┼───┼───┼───┼───┼───┼───┤
    │   │ · │O₁ │ · │   │ · │ · │    Step B→C: exits O₁'s reach → OA #1
    ├───┼───┼───┼───┼───┼───┼───┤    Step D→E: exits O₂'s reach → OA #2
    │   │ · │ · │ · │ · │O₂ │ · │
    ├───┼───┼───┼───┼───┼───┼───┤    Each OA resolves before the next
    │   │   │   │   │ · │ · │ · │    step proceeds. If OA #1 kills M,
    ├───┼───┼───┼───┼───┼───┼───┤    movement truncates — OA #2 never
    │   │   │   │   │   │   │   │    fires.
    └───┴───┴───┴───┴───┴───┴───┘

         M path: ── A ── B ──[OA#1]── C ── D ──[OA#2]── E
                              ↑                   ↑
                          checkpoint           checkpoint
```

### Movement truncation on OA knockout

```
    Timeline:

    M starts at A          M at B (in O₁'s reach)      M exits reach → OA fires
    ─────────────────────→────────────────────────────→─────────────────────────→
    speed: 30ft             speed: 25ft remaining         O₁ attacks, M drops to 0 HP
                                                          ╳ Movement stops at B
                                                          M never reaches C, D, E
```

### Disengage bypass — no checkpoints

```
    M uses Disengage action, then moves:

         M path: ── A ── B ── C ── D ── E
                           ↑         ↑
                    would be OA   would be OA
                    but SKIPPED   but SKIPPED

    Disengage sets a flag: all OA checkpoints suppressed for this turn.
```

### Abstract model (our approach) — no grid, caller provides threat set per 5ft step

```
    ┌─────────────────────────────────────────────────────┐
    │  UI / DM layer                                      │
    │  ┌──────────────────────────────────────────┐       │
    │  │ Grid, tokens, reach calculation          │       │
    │  │ For each 5ft step, determines:           │       │
    │  │   threatened = {O₁, O₂}                  │       │
    │  └──────────────┬───────────────────────────┘       │
    │                 │ BATTLE_MOVE { threatened }         │
    │                 │ (one event per 5ft segment)        │
    └─────────────────┼───────────────────────────────────┘
                      ▼
    ┌─────────────────────────────────────────────────────┐
    │  Engine (battle.qnt / battle-machine.ts)            │
    │                                                     │
    │  Spends 5ft of movement                             │
    │  Receives threatened set → filters by eligibility   │
    │  → enters BPResolvingMovement phase                 │
    │  → offers OA to each eligible creature              │
    │  → resolves attacks / truncates on KO               │
    │                                                     │
    │  No grid. No positions. No pathfinding.             │
    │  The "where" is someone else's problem.             │
    └─────────────────────────────────────────────────────┘
```

Note: each `BATTLE_MOVE` is already a **discrete 5ft segment** — the engine spends 5ft per call (`pUseMovement(ac.turn, 5, 1)` in Quint, `spendMovement(ac, 5, 1)` in TS). The difference from path-analysis engines is not granularity — it is **who determines reach exits**. Path-analysis engines compute that from grid positions; we receive it as caller input.

## Projects That Use Path Analysis

### natural_20 (Ruby) — The Gold Standard

**Architecture:** Full grid-based path-step OA detection.

**Key files:**
- `lib/natural_20/concerns/movement_helper.rb` (230 LOC) — budget tracking, difficult terrain, jumping, squeeze, **opportunity attack detection**
- `lib/natural_20/actions/move_action.rb` (234 LOC) — movement resolution with OA triggering
- `lib/natural_20/battle_map.rb` (1,005 LOC) — grid, distance, LOS, cover, movement validation
- `lib/natural_20/battle.rb` (574 LOC) — combat loop, `trigger_opportunity_attack`

**How it works** (from `ARCHITECTURE-natural_20.md`):

> `MovementHelper#retrieve_opportunity_attacks`:
> 1. Iterates each step of the move path
> 2. For each opponent, tracks entry into and exit from melee range
> 3. When an opponent exits melee range, records a potential OA
> 4. Filters by reaction availability and disengage status
> 5. `MoveAction#check_opportunity_attacks` calls `battle.trigger_opportunity_attack` for each qualifying enemy

**Distance metric:** Euclidean (`floor(sqrt(dx² + dy²))`), in grid squares × `@feet_per_grid` (default 5).

**OA goes through full resolve/commit cycle.** If the mover drops unconscious, movement truncates at the OA location.

**Strengths:**
- Concrete, testable, visually debuggable
- Each OA fires at the exact path step, enabling precise positioning effects
- Movement truncation is spatially accurate (the creature stops at the right square)

**Weaknesses:**
- **Tight grid coupling** — the engine is inseparable from its spatial model. Testing OA logic requires constructing maps.
- **Mutable state** — no immutable snapshots, no deterministic replay
- **srand-based determinism** — fragile, any code change shifts roll sequences
- **Scattered condition checks** — adding a new OA-blocking condition (e.g., new spell effect) means finding every reach-check site

### dnd_engine (Python) — Event Handler Pattern

**Architecture:** Tile-based grid with event-driven OA detection.

**Key files:**
- `dnd/reactions.py` (53 LOC) — OA event handler
- `dnd/core/dijkstra.py` — pathfinding for movement cost
- `dnd/core/shadowcast.py` — field-of-view computation

**How it works** (from `ARCHITECTURE-dnd_engine.md`):

> Opportunity attack: handler on `(MOVEMENT, EFFECT)` checks if moving entity leaves threatened squares, fires a child Attack action.

**Pattern:** The 4-phase event pipeline (`DECLARATION → EXECUTION → EFFECT → COMPLETION`) fires events at each phase. An OA handler subscribes to the `EFFECT` phase of movement events and checks reach-exit. This is more extensible than natural_20's hard-coded path loop but less explicit — handler ordering is insertion-order with no priority system.

**Strengths:**
- Extensible — any code can register OA-like handlers
- Closest external analog to our Quint interrupt points

**Weaknesses:**
- No formal analysis of handler interaction ordering
- No tests — architecture is interesting but unverified
- Global mutable registries

### OpenCombatEngine (C#) — Optional Grid with Reach-Leaving Events

**Architecture:** A* pathfinding on an optional grid; OA via C# event subscription.

**Key files:**
- `src/.../Spatial/StandardGridManager.cs` (510 LOC) — A* pathfinding, LOS, flanking, AoE, **OA triggers**
- `src/.../Reactions/OpportunityAttackReaction.cs` (95 LOC) — reach-leaving detection, reaction consumption, attack execution

**How it works:**

```
GridManager.CreatureMoved  →  StandardReactionManager.OnCreatureMoved  →  OA check
```

The `IGridManager?` interface is **nullable throughout** — when no grid is present, movement works but OA detection degrades gracefully (no reach-leaving events fire). This confirms that spatial OA detection is a separable concern.

**Distance metric:** Chebyshev (`max(|dx|, |dy|) × 5ft`).

**Strengths:**
- **Optional grid validates spatial abstraction** — the engine works without it
- Highest test-to-source ratio among competitors (~75%)
- Clean `IReaction.CanReact() + React()` trigger-check-execute pattern

**Weaknesses:**
- Dual-path condition effects (hard-coded checks AND effects pipeline) create divergence risk
- Mutable state, no snapshots, no replay

### DnDSimulator (Python) — Abstract Line Bands (No Real Path Analysis)

**Architecture:** Front/middle/back positional bands, no grid.

OA is handled via `AI.do_opportunity_attack()` — a heuristic callback, not a geometric detection. The simulator estimates whether movement "would provoke" an OA based on line positions and speed thresholds, not step-by-step path analysis.

**Not a true path analysis engine**, but included for contrast: it shows the opposite extreme from natural_20, where OA is essentially a probability estimate.

### foundryvtt-dnd5e (JavaScript) — No Engine OA

The dnd5e system for Foundry VTT has **no OA detection at all**. `Combat5e` (172 LOC) handles only initiative sorting and turn lifecycle. Spatial concerns including OA are left entirely to the VTT canvas and GM adjudication. Mentioned for completeness — this is the "fully delegate to humans" endpoint.

## Competitor Comparison Matrix

| Aspect | natural_20 | dnd_engine | OpenCombatEngine | DnDSimulator | foundryvtt | **Ours** |
|---|---|---|---|---|---|---|
| **OA detection** | Step-by-step path | Event handler | Grid event | AI heuristic | GM manual | Abstract threat set |
| **Spatial model** | Grid (5ft squares) | Tile grid | Optional A* grid | Line bands | Canvas only | None (caller input) |
| **Pathfinding** | BFS/manual | Dijkstra | A* | None | Canvas | None |
| **Distance metric** | Euclidean | — | Chebyshev | Heuristic | Canvas | N/A |
| **LOS / Cover** | Bresenham rays | Shadowcasting | Bresenham | None | Canvas | Caller input |
| **Grid required?** | Yes | Yes | **No** | No | Foundry core | **No** |
| **OA testable without map?** | No | No | Yes (degrades) | N/A | N/A | **Yes** |
| **Formal verification** | No | No | No | No | No | **Yes (MBT)** |
| **Immutable state** | No | No | No | No | No | **Yes** |

## What We Use Instead

### Current Architecture

Our project uses **pattern (2): abstract threat set as caller input.**

**Quint spec** (`battle.qnt`, lines 2308–2343):

```
action bMove = {
    nondet threatened = allIds.exclude(Set(activeId)).powerset().oneOf()
    // ...
    if (ac.turn.disengaged) {
        // skip OA entirely
    } else {
        val oaEligible = threatened.filter(id =>
            hasReaction(cs1, id)
            and not(cs1.get(id).creature.dead)
            and not(isIncapacitated(cs1.get(id).creature))
            and not(blocksOpportunityAttacks(cs1.get(id).creature.activeEffects))
        )
        // enter BPResolvingMovement if any eligible
    }
}
```

The `nondet threatened = allIds.powerset().oneOf()` is the key line: the spec tests that **for any possible set of threatening creatures**, the OA pipeline is correct. It never asks "who is actually in reach?" — that question belongs to the spatial layer above.

**TypeScript implementation** (`battle-machine-actions-movement.ts`, lines 24–49):

```typescript
function battleMove(args: BattleActionArgs<"BATTLE_MOVE">) {
    // e.threatened comes from the caller (UI / DM)
    const oaEligible = new Set(
        [...e.threatened].filter((tid) => {
            const t = cs.get(tid);
            return t != null && canMakeOpportunityAttack(t);
        }),
    );
    // ...
}
```

**Types** (`battle-machine-types.ts`, lines 275–279):

```typescript
export interface MovementCtx {
    readonly mover: CreatureId;
    readonly threatenedBy: ReadonlySet<CreatureId>;  // caller-provided
    readonly processed: ReadonlySet<CreatureId>;      // engine-managed
}
```

### Why This Design Was Chosen

From `ARCHITECTURE.md` (lines 92–106):

> The spec abstracts away [...] **spatial concerns** (cover, distance, line of sight, movement geometry). These are treated as caller-provided inputs. For example, `bMove`'s threatened set is a nondeterministic powerset — the spec tests "given any set of threatening creatures, does the OA pipeline work correctly?" without knowing *which* creatures are actually in reach.
>
> **Threatened creatures for OA**: The DM determines who is in reach (the spec receives the set nondeterministically).

The design separates **"which creatures threaten?"** (spatial concern, modeled as caller input per `ARCHITECTURE.md`) from **"given threatening creatures, what happens?"** (mechanical rules, formally verifiable).

### Flow Comparison

```
    Path analysis (natural_20):          Abstract threat set (ours):

    Grid + positions                     Caller provides threatened set
         │                                        │
         ▼                                        ▼
    Compute path A→B→...→N              Receive BATTLE_MOVE { threatened }
    For each step:                       (one 5ft segment per call)
      compute reach exit from grid              │
         │                                        ▼
         ▼                                Filter by eligibility:
    Fire OA at exit step                   canMakeOpportunityAttack()
    (engine knows exact square)                  │
         │                                        ▼
         ▼                               Enter BPResolvingMovement
    Resolve attack                       Offer OA to each eligible creature
         │                                        │
         ▼                                        ▼
    Truncate if KO                       Resolve attack (via resolveAttack)
    (stop at exact grid position)        Truncate if KO (via ADR return path)
```

The **purpose is analogous** — both engines resolve OAs once threats are identified. But the mechanisms differ: path-analysis engines own positions and can stop movement at an exact grid square; our engine has no spatial state and delegates truncation to the generic attack-resolution return path (`ADRResolvingMovement`). The difference is not just "who detects the reach exit" — it is whether the engine has any concept of *where* the creature is.

## Viability Assessment

### Could we adopt full path analysis?

**Technically possible** but architecturally misaligned. Here is the honest evaluation:

#### What we would gain

1. **Self-contained OA detection** — the engine wouldn't need callers to compute threatened sets
2. **Step-precise movement** — the engine could enforce movement costs (difficult terrain, squeeze, dash budget) per square
3. **Spatial debugging** — OA triggers could be visualized on a grid trace

#### What we would lose

1. **Formal verification scope** — the Quint spec currently proves correctness for *any* threatened set (nondeterministic powerset). Adding grid logic to the spec would either:
   - Massively increase state space (grid positions × creature count → combinatorial explosion for MBT)
   - Force us to split the spec into spatial + mechanical layers, duplicating the boundary we already manage in TS

2. **Caller-input abstraction** — the current design treats "who is in reach" as a caller-provided input (per `ARCHITECTURE.md`). The SRD defines the trigger but not the spatial computation. Path analysis hard-codes one spatial interpretation. This is fine for a VTT engine; it narrows the modeling frontier for a rules-verification engine that deliberately abstracts spatial concerns.

3. **Test isolation** — currently, OA tests run without any grid setup. Every MBT trace tests the OA pipeline without spatial fixtures. Adding grid dependency would make tests slower and more brittle.

4. **UI flexibility** — the project could support grid, hex, theater-of-mind, or any spatial model. The engine doesn't care. Path analysis locks us to one.

#### What OpenCombatEngine teaches us

OpenCombatEngine's `IGridManager?` being **nullable throughout** is the most relevant precedent. It proves that even engines with path analysis benefit from making the spatial layer optional. Our architecture already sits at the "no grid" endpoint of their design spectrum — we didn't need to build the grid to decide it should be optional.

### Verdict: Do NOT adopt path analysis in the engine core

The current abstract-threat-set architecture is **the correct design for this project.**

Reasons:

| Concern | Path analysis | Abstract threat set (current) |
|---|---|---|
| Formal verification | Grid state explodes MBT state space | Powerset nondeterminism is tractable |
| SRD fidelity | Encodes one spatial interpretation | Treats reach membership as caller input (per ARCHITECTURE.md) |
| Test isolation | Requires grid fixtures | No spatial dependencies |
| UI coupling | Locked to grid | Supports any spatial model |
| Mechanical correctness | Same OA pipeline | Same OA pipeline |

The **OA pipeline itself** (eligibility filtering, reaction offering, attack resolution, movement truncation) is already well-modeled and MBT-verified. Path analysis only changes **who detects the threat** — and for our project, that detection correctly lives outside the engine.

### What IS worth adopting

The path analysis pattern contributes **vocabulary and documentation improvements** that strengthen our existing design without changing architecture:

1. **Movement segment** — a unit of movement between OA checkpoints. Each `BATTLE_MOVE` call is one 5ft segment; a `MovementCtx` instance represents the OA window for that segment. Naming this explicitly improves domain language.

2. **Leave-threat boundary** — the instant a creature exits reach. The SRD defines OA in terms of this boundary. Our `threatened` parameter represents "creatures whose leave-threat boundary the mover is crossing."

3. **OA checkpoint** — a point in movement where the engine pauses to offer OA. Our `BPResolvingMovement` phase IS this checkpoint; the name makes it more discoverable.

4. **Movement truncation** — movement stops if the mover drops to 0 HP during an OA. Neither `bMovementOAAttack` nor `battleMovementOAAttack` contains the truncation logic directly — they delegate to `resolveAttack()` with an `ADRResolvingMovement` return context, and truncation happens downstream when the generic attack-resolution pipeline resumes that return path and finds the mover is dead. Worth calling out explicitly in domain docs.

These terms already exist informally in the codebase. Naming them in `UBIQUITOUS_LANGUAGE.md` or `battle/DOMAIN.md` would improve both spec readability and onboarding.

## Recommendation

**Keep the current architecture.** Adopt the vocabulary — not the geometry.

The abstract threat set is a validated design choice, not a gap. It is confirmed by:
- OpenCombatEngine's optional grid proving that even grid-aware engines benefit from spatial abstraction
- The Quint spec's nondeterministic powerset providing stronger coverage than any fixed grid test could
- natural_20's tight grid coupling being listed as a weakness in their own architecture analysis
- This project's modeling boundary (per `ARCHITECTURE.md` lines 92–103) treating "who is in reach" as a caller-provided input — the SRD defines the OA trigger as "leaves your reach" but does not prescribe how reach membership is determined, so this project models it as a spatial concern outside the formal core

If a future UI layer needs grid-based OA detection, it should compute the `threatened` set and pass it to `BATTLE_MOVE` — exactly as the current interface expects. The engine's OA pipeline is ready; the spatial layer is a caller concern.

## Implementation Plan

**Scope: vocabulary and documentation ONLY.** No types, no functions, no behavior, no spatial logic. If you are reading this and thinking about grid positions, pathfinding, or reach geometry — stop. That is a UI/caller concern. See "Verdict" above.

### Vocabulary to formalize

| Term | Already implicit in | Definition |
|---|---|---|
| **Movement segment** | `MovementCtx` lifecycle (one instance = one segment) | A unit of movement between OA checkpoints |
| **Leave-threat boundary** | `MovementCtx.threatenedBy` field | The instant a creature exits an enemy's reach — the SRD trigger for OA |
| **OA checkpoint** | `BPResolvingMovement` phase | A pause in movement where the engine offers OA to each eligible reactor |
| **Movement truncation** | `ADRResolvingMovement` return path + generic attack resolution | Movement stops if the mover drops to 0 HP during an OA |

### Changes by file

**1. `UBIQUITOUS_LANGUAGE.md`** — expand Movement section (after existing "Opportunity Attack" entry, line ~94). Add the four terms with one-sentence definitions. ~12 lines.

**2. `battle/DOMAIN.md`** — expand Spatial Concepts section (after existing `Reach` and `Threatened` entries, line ~80). Add the four terms, cross-referencing the code sites where they already live. ~15 lines.

**3. `battle.qnt`** — comments only, three sites:
- `bMove` (line ~2308): name "leave-threat boundary" and "OA checkpoint" in existing comment block.
- `bMovementOAPass` (line ~2346): add "OA checkpoint: reactor declines."
- `bMovementOAAttack` (line ~2363): note that `ADRResolvingMovement` return context enables movement truncation downstream (the truncation itself happens in the generic attack-resolution return path, not here).

**4. `packages/core/src/battle-machine-actions-movement.ts`** — comments only, three sites:
- `battleMove()` (line ~24): note that `phaseResolvingMovement` entry is an "OA checkpoint."
- `battleMovementOAPass()` (line ~51): note "checkpoint: reactor declines."
- `battleMovementOAAttack()` (line ~67): note that `ADRResolvingMovement` return context enables movement truncation downstream (truncation happens in the generic attack-resolution return path, not in this function).

**5. `packages/core/src/battle-machine-types.ts`** — JSDoc on `MovementCtx` (line ~275). Three lines: `threatenedBy` = creatures whose leave-threat boundary was crossed; `processed` = reactors already offered/handled in this OA window (includes both those who declined and those who attacked).

### What does NOT change

- No type renames. `MovementCtx`, `threatenedBy`, `processed`, `BPResolvingMovement`, `ADRResolvingMovement` — all fine.
- No function renames. `battleMove`, `battleMovementOAPass`, `battleMovementOAAttack`, `canMakeOpportunityAttack`, `blocksOpportunityAttacks` — all clear.
- No MBT bridge changes. Action names `bMove`, `bMovementOAPass`, `bMovementOAAttack` unchanged.
- No behavioral changes. Zero tests to run.
- No new files. Everything fits into existing files.
- **No spatial logic.** No grid. No positions. No pathfinding. No reach geometry. The engine receives threat sets from callers. That boundary does not move.

## Quint Impact

None required. The spec correctly models OA as a mechanical pipeline receiving threat membership as input. Path analysis is a spatial concern that lives outside the Quint modeling frontier.

## Domain Language Impact

Moderate. The vocabulary contributions (movement segment, leave-threat boundary, OA checkpoint, movement truncation) should be documented in `UBIQUITOUS_LANGUAGE.md` to make the implicit explicit.

## Cross-References

- **09-optional-spatial-model.md** — validates the spatial abstraction choice from a different angle
- **03-resolve-commit.md** — the OA pipeline follows resolve/commit: Quint resolves the OA outcome, XState commits it
- **COMPARISON.md** — competitor spatial model comparison (lines 131–141), OA pattern comparison (lines 243–300)
- **ARCHITECTURE.md** (lines 92–106) — modeling frontier: spatial concerns as caller inputs
