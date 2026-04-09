# Architecture: ShiningSword (MaxWilson/ShiningSword)

## Snapshot

| Attribute | Value |
|---|---|
| Language | F# 8.0 (compiled to JavaScript via Fable) |
| Framework | Fable 4 + Feliz (React) + Elmish |
| Edition target | AD&D 2e (priest spells), DFRPG (character generation), generic RPG (Ribbit language) |
| License | Not specified (public GitHub repository) |
| LOC (F# source) | ~1,830 (src/) |
| LOC (tests) | ~380 (test/) |
| LOC (scratch/experiments) | ~180 (scratch/) |
| Total LOC | ~2,500 |
| Test coverage | Moderate for chargen (338 LOC of Expecto tests), minimal elsewhere |
| Active development | Low — single author, last commit March 2024, architecture-exploration project |

## Core Architecture Pattern

**Functional-reactive Elmish** with declarative menu algebra.

This is not primarily a combat engine. It is a **player utilities toolkit** for tabletop RPGs, with three modules:

1. **AD&D Priest Spells** — spell lookup/filtering by sphere and deity, backed by embedded text data parsed at runtime via a custom packrat parser
2. **DFRPG Character Generation** — template-driven chargen using a composable menu algebra (the architectural centerpiece)
3. **Ribbit** — a stub for a declarative RPG scripting language (largely unimplemented)

The project's architectural significance lies not in combat simulation but in its use of F# discriminated unions and immutable records to model **structured RPG choices** as a composable algebra. The menu system (`Menus.fs`) is the most sophisticated code in the project.

## State Model

### Elmish (Model-View-Update)

All UI follows the Elmish pattern: immutable `Model` records, `Msg` discriminated unions, pure `update` functions:

```fsharp
type Model = { selections: Map<Key, MaybeLevel> }
type Msg = SetKey of Key * MaybeLevel option

let update msg model =
    match msg with
    | SetKey(key, None) -> { model with selections = model.selections |> Map.remove key }
    | SetKey(key, Some v) -> { model with selections = model.selections |> Map.add key v }
```

State is always an immutable record. Updates produce new records. No mutation in the domain layer.

### Menu Selection State

The chargen system's state is a `Map<Key, MaybeLevel>` where `Key` is a reversed list of string segments (path through a menu tree) and `MaybeLevel` is either `Flag` (boolean) or `Level of int`:

```fsharp
type KeySegment = string
type Key = KeySegment list  // reversed
type MaybeLevel = Level of int | Flag
type OfferInput = { selected: Map<Key, MaybeLevel>; prefix: Key }
```

This flat map encodes all user choices. The menu algebra evaluates this map against a template tree to produce both a value (selected traits) and a visual representation (menu output tree).

### CQRS Module

The `CQRS.fs` module provides a generic command-query separation wrapper with undo/redo history, used as infrastructure for time-travel debugging. States are stored as a list of `(marker, (msg option, state))` tuples, enabling `Rewind` and `FastForward`:

```fsharp
type CQRS<'msg, 'state>(initialState, execute) =
    member _.Execute(msg): unit     // apply and record
    member _.Rewind(mark): unit     // restore checkpoint
    member _.FastForward(mark): unit
    member _.Log(): 'state list     // full history
```

### Delta-Driven State

`Common.fs` contains two delta-driven state structures (`Delta` and `SharedDelta`) that offer the performance of mutable state with the semantics of immutable state. They maintain a command history and lazily replay to reconstruct state, similar to event sourcing:

```fsharp
module Delta =
    type DeltaDrivenState<'t, 'msg> = { seed: Seed; current: 't; past: 'msg list }
    let execute msg state = { state with past = msg::past; current = update past msg state.current }
```

## Combat System

**There is no combat system.** This is the critical finding. Despite the project name "Shining Sword" and its RPG focus, the codebase contains zero combat simulation logic. The Ribbit playground view has hardcoded mock data (HP, AC, status) rendered in an SVG battle view, but no underlying engine:

```fsharp
// From RibbitPlaygroundView.fs — entirely static mock data
let data = [
    "Rath", [ "HP", Number 14; "maxHP", Number 53; "AC", Number 3; "Status", Text "OK" ]
    "Delsenora", [ "HP", Number 23; "maxHP", Number 23; "SP", Number 22; ... ]
    "Wild Boar", [ "HP", Number 34; "maxHP", Number 49; "AC", Number 6; ... ]
]
```

The `Coroutine.fs` module (103 LOC) defines a coroutine/behavior tree framework that could support combat AI (it models `AwaitingAction`/`Finished` execution results with continuation-passing), but it is not wired into any combat logic. The `test/Ribbit.Accept.fs` file contains a `bardsTaleSimple` string describing a hypothetical combat DSL, but it is never parsed or executed.

## Type System Usage

### Discriminated Unions

F# DUs are used throughout for domain modeling. The most interesting example is the `MenuOutput` type, which forms an algebraic tree of UI choices:

```fsharp
type MenuOutput =
    | Either of label: string option * options: MenuSelection list  // pick one (or N)
    | And of label: string option * grants: MenuOutput list         // get all of these
    | Leveled of label: string * Key * currentLevel: int * levelCount: int
    | Leaf of label: string
and MenuSelection = bool * Key * MenuOutput  // (isSelected, key, subtree)
```

This DU is both the domain model (what choices exist) and the view model (what to render). The `render` function pattern-matches exhaustively on all cases.

The `Trait` DU in chargen shows simple sum-type modeling:

```fsharp
type Trait = WeaponMaster of Weapon | CombatReflexes | Skill of string * bonus:int
```

### Immutable Records with `with` Syntax

F# record update syntax (`{ model with field = newValue }`) is used for all state transitions:

```fsharp
{ model with selections = model.selections |> Map.add key v }
```

### Pattern Matching

Heavy use of active patterns in the packrat parser, including recursive active patterns and left-recursion handling:

```fsharp
let rec (|Names|_|) = pack <| function
    | NameChunk(lhs, Names(rhs, rest)) -> Some(lhs + " " + rhs, rest)
    | NameChunk(v, rest) -> Some(v, rest)
    | _ -> None
```

### State Monad (Computation Expression)

`Common.fs` defines a full state monad via F# computation expressions:

```fsharp
type StateChange<'state, 'retval> = ('state -> 'retval * 'state)
type StateBuilder() =
    member this.Return x = fun state -> x, state
    member this.Bind(m, f) = fun s -> let (a, s') = m s in (f a) s'
    // ... While, For, Combine, Delay
```

This is used in the delta-driven state modules but not in the main application logic, which prefers direct Elmish updates.

### Constructor Algebra

The `Ctor` module defines composable constructor/extractor pairs for discriminated unions, enabling bidirectional matching:

```fsharp
type Constructor<'args, 'Type> = {
    create: 'args -> 'Type
    extract: 'Type -> 'args option
    name: string
}
```

The `=>` operator composes constructors, chaining creation and extraction. This is infrastructure for the menu system's type-safe option building.

## Spatial Model

**None.** The Ribbit playground view contains an SVG with hardcoded circles representing creatures on a battle grid, but there is no spatial logic, movement system, or line-of-sight computation.

## Content vs Engine Boundary

The project has a three-layer structure:

1. **Core** (`src/Core/`) — generic infrastructure: `Common.fs` (utilities + state monad), `CQRS.fs` (undo/redo), `Coroutine.fs` (behavior trees), `Packrat.fs` (parser combinator), `Menus.fs` (menu algebra), `Flags.fs` (flag system)
2. **Domain** (`src/Domain/`) — RPG-specific data: AD&D priest spell definitions, DFRPG chargen templates
3. **UI** (`src/UI/`) — React views via Feliz

The Core layer is genuinely game-system-agnostic. `Menus.fs` could represent choices in any template-driven system. The Domain layer is pure data and template definitions with no behavioral logic. The UI layer is thin React rendering.

The content/engine boundary is clean because there is almost no engine — the "engine" is the menu evaluation algebra, and the "content" is the template definitions.

## Verification Story

### Tests (380 LOC)

Tests use Expecto + Unquote:

- **Chargen.Accept.fs** (338 LOC) — the bulk of testing. Tests the menu algebra by evaluating templates against selection maps and comparing the resulting `MenuOutput` tree to expected structures. Also tests rendering of menu trees into pseudo-React elements. Includes several pending (`ptest`) cases for UX requirements not yet implemented.
- **Packrat.Accept.fs** (11 LOC) — smoke test that default sphere/deity data parses successfully.
- **Ribbit.Accept.fs** (25 LOC) — contains a Ribbit DSL string but no actual test logic.

### Type-Level Guarantees

F#'s type system provides:
- **Exhaustive pattern matching** on all DUs (compiler warning on missing cases)
- **Immutability by default** — records and DU values cannot be mutated
- **Generic type parameters** on the menu algebra (`Offer<'t>`, `ListOffer<'t>`, `OptionOffer<'t>`) ensure type safety through the composition chain

### CI

GitHub Actions CI runs `dotnet test` before building and deploying to GitHub Pages. Tests must pass for deployment.

### What's Missing

No property-based testing, no invariant checking, no formal verification, no combat rule verification (because there are no combat rules).

## Key Inspirations For Our Project

### High-Signal Patterns

1. **Menu algebra as composable DUs** — The `MenuOutput` type (`Either | And | Leveled | Leaf`) is a clean algebraic encoding of structured choices. The `Offer` type with `Op.either`, `Op.and'`, `Op.eitherN`, `Op.budget`, `Op.level`, and `Op.trait'` combinators forms a composable DSL for building choice trees. This pattern could inform how we model feature selection (feats, class features with sub-choices) in the TS layer — a type-safe choice tree rather than ad-hoc UI state.

2. **Evaluation = state projection** — Templates are evaluated against a flat `Map<Key, MaybeLevel>` to produce both a typed value and a visual representation simultaneously. One source of truth (the selection map), two outputs (domain value + UI tree). This is architecturally similar to how our XState context projects into both the Quint state (for MBT) and the React UI.

3. **CQRS with time-travel** — The `CQRS.fs` module's `Rewind`/`FastForward` over a message history is a clean pattern for undo/redo in an immutable-state system. If we ever need undo in the TS UI (e.g., "undo last action" in combat), this is a proven F# approach that maps directly to XState event replay.

4. **Coroutine/behavior tree as DU** — The `ExecutionResult` type (`Finished | AwaitingAction of action * continuation`) is a clean functional encoding of suspendable processes. While unused in ShiningSword itself, this pattern could model complex multi-step actions (spellcasting with concentration decisions, multi-attack sequences) as composable behaviors rather than state machine spaghetti.

5. **State monad for threading** — The `StateChange<'state, 'retval>` computation expression shows how functional state threading works in practice. This is exactly what Quint's state variables do at the spec level, confirming that our approach is well-founded in FP tradition.

6. **Delta-driven state** — The `Delta` and `SharedDelta` modules show how to get mutable-like performance with immutable semantics by maintaining a command history and lazy replay. This is relevant if we ever need to optimize XState context updates for large state trees.

### Anti-Patterns (For Us)

1. **No combat engine at all** — Despite extensive infrastructure (parsers, menu algebra, coroutines, CQRS, behavior trees, delta state), the project never builds a combat system. This is a cautionary tale about infrastructure-first development. Our project's Quint-first approach (spec the rules, then build infrastructure to match) avoids this trap.

2. **Flat key map for structured state** — Using `Map<Key, MaybeLevel>` where Key is a `string list` means the type system cannot prevent invalid key combinations. Typos in key strings are caught only at runtime. Our Quint types catch invalid states at typecheck time. The trade-off is ShiningSword's flexibility (arbitrary nesting) vs. our rigidity (fixed state shape).

3. **Mutable packrat parser state** — The packrat parser (`Packrat.fs`) uses mutable `ref` cells for memoization and left-recursion detection. While correct and well-documented, this mutable-in-a-functional-language pattern is exactly what Quint's purity avoids. The comment "DEEP MAGIC BEGINS HERE" is a red flag for maintainability.

4. **Over-generic infrastructure** — The `Ctor` module, state monad, coroutine framework, and delta state are generic to the point of being unused or underused in the actual application. The menu algebra (`Menus.fs`) is the only sophisticated piece that earns its complexity. This reinforces our CLAUDE.md principle: design for the system, not for the boundary.

5. **Multiple RPG systems without depth in any** — AD&D spell lookup, DFRPG chargen, and a stub Ribbit language spread effort across three systems. None reaches the depth needed for combat simulation. Our single-system (5e SRD) focus is the right call.

## File Index

| File | LOC | Role |
|---|---|---|
| `src/Core/Common.fs` | 467 | Utility functions, state monad, delta-driven state, memoization, trie |
| `src/Core/Menus.fs` | 280 | Menu algebra: Either/And/Leveled/Leaf + Offer combinators + rendering |
| `src/Core/Packrat.fs` | 276 | Left-recursive packrat parser combinator library |
| `src/Domain/ADND/PriestSpells.fs` | 159 | AD&D priest spell/sphere/deity data + parser rules |
| `src/UI/CommonUI.fs` | 123 | Shared React helpers, error boundary, Elmish utilities |
| `src/Core/Coroutine.fs` | 103 | Behavior tree / coroutine framework (unused in application) |
| `src/UI/ADND/PriestSpellsView.fs` | 94 | Priest spell search/filter UI |
| `src/UI/Ribbit/RibbitPlaygroundView.fs` | 82 | Mock battle view with hardcoded data |
| `src/UI/DFRPG/Chargen.fs` | 74 | Chargen model/update + sample swashbuckler template |
| `src/UI/LocalStorage.fs` | 65 | Browser localStorage persistence via Thoth.Json |
| `src/UI/DFRPG/ChargenView.fs` | 63 | Chargen React view rendering |
| `src/Domain/DFRPG/Chargen.Templates.fs` | 49 | DFRPG flag definitions + swashbuckler template |
| `src/Core/CQRS.fs` | 47 | Command-query separation with undo/redo history |
| `src/Main.fs` | 40 | Router entry point |
| `src/Core/Flags.fs` | 21 | Flag/binary-trait type definitions |
| `test/Chargen.Accept.fs` | 338 | Menu algebra + chargen integration tests |
| `test/Ribbit.Accept.fs` | 25 | Ribbit DSL string (no actual tests) |
| `test/Packrat.Accept.fs` | 11 | Parser smoke test |
| `scratch/DuneTrader.fsx` | 104 | Experimental trading game using Elmish pattern |
| `scratch/GuessNumber.fsx` | 33 | Experimental number guessing game |
