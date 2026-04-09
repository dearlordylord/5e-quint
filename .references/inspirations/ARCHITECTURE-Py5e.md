# Architecture: Py5e (Carbsta/Py5e)

## Snapshot

| Attribute | Value |
|---|---|
| Language | Python 3.x |
| Framework | None (stdlib only) |
| Edition target | D&D 5e (loosely) |
| License | MIT |
| LOC (total) | 292 (single file) |
| Test coverage | None |
| Active development | Inactive |

## Core Architecture Pattern

**Flat procedural helpers in a single file.**

The entire project is `revision.py` — a collection of dice-rolling utilities, ability score helpers, and basic character data structures. There is no combat engine, no action system, no condition tracking, no turn management.

## State Model

A `Character` dataclass holds:
- Ability scores (6 ints)
- Race, class, level
- HP, AC, speed
- Proficiency bonus
- Skills (dict)
- Inventory (list)

State is plain mutable Python objects. No registry, no events, no snapshots.

## Event/Action System

None. There is no action pipeline. The code provides `Roll`, `Die`, `DK` (drop/keep) classes for dice expression evaluation, and helper functions for ability modifier calculation. No attack resolution, no save mechanics, no damage pipeline.

## Condition/Effect System

None.

## Spatial Model

None.

## Content vs Engine Boundary

No meaningful boundary — the single file mixes dice utilities, character data, and basic stat helpers.

## Verification Story

No tests. No verification of any kind.

## Key Inspirations For Our Project

### High-Signal Patterns

None. The project is too incomplete to provide architectural inspiration.

### Anti-Patterns (For Us)

1. **Single-file flat design** — demonstrates what happens without any architectural boundary
2. **No separation of concerns** — dice, character data, and helpers all in one namespace
3. **No combat model** — the gap between "character sheet" and "combat engine" is exactly what our project fills

## File Index

| File | LOC | Role |
|---|---|---|
| `revision.py` | 292 | Everything: dice, character, ability scores |

## Why This Entry Exists

Included only for completeness as a baseline contrast. This is what a minimal D&D helper library looks like before any real engine architecture appears. It demonstrates the floor of the competitor space.
