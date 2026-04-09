# Actual-Play Combat Traces

Combat traces adapted from real D&D 2024 actual play, used to validate the XState
machine against scenarios grounded in real games.

## Architecture

```
EncounterDef          ActualPlayStep[]          replayActualPlayTrace()
┌─────────────┐      ┌──────────────────┐      ┌─────────────────────┐
│ title       │      │ round: number    │      │ validates kills     │
│ source      │─────▶│ source: orig/fab │─────▶│ sums damage budget  │
│ enemies{}   │      │ kills?: string[] │      │ replays via XState  │
│ machineInput│      │ ...TraceEventDef │      │ returns summary     │
└─────────────┘      └──────────────────┘      └─────────────────────┘
```

**What's machine-verified:** HP, conditions, action economy, charges — the
`expectedQuintState` at every step is compared field-by-field against the real
XState machine output.

**What's annotation-verified:** Kill counts (validated against `enemies` + optional
`refKills`), damage budget (auto-summed from `TAKE_DAMAGE` events, broken down by
round and type), provenance (`source: "original" | "fabricated"`). These were
previously hardcoded in comments and drifted — now they're derived from structured
data.

**What's still free-text:** Step `description` strings — the human-readable
narrative. These tell the story for the demo and are not programmatically validated.

## Trace files

### `actual-play-roll20.ts` — PHB 2024 Combat Example (19 steps)

| Field            | Detail                                               |
| ---------------- | ---------------------------------------------------- |
| **Source**       | Roll20 Compendium / 2024 PHB                         |
| **Perspective**  | Shreeve (Barbarian → Champion Fighter L5)            |
| **Rounds**       | 2 (R1 original, R2 fabricated)                       |
| **Kills**        | 3 (by Shreeve; 7 others off-screen)                  |
| **Damage taken** | 14 piercing (R1: 9, R2: 5)                           |
| **Exports**      | `ROLL20_TRACE`, `ROLL20_SUMMARY`, `ROLL20_ENCOUNTER` |

### `actual-play-cr-c4e04.ts` — CR C4E04 "Stone-Faced" (40 steps)

| Field            | Detail                                                                  |
| ---------------- | ----------------------------------------------------------------------- |
| **Source**       | Omen Archive (107 dealt, 46 taken, 6 kills)                             |
| **Perspective**  | Sir Julien Davinos (Rogue/Fighter → Champion Fighter L5)                |
| **Rounds**       | 5                                                                       |
| **Kills**        | 6 (matches Omen Archive `refKills`)                                     |
| **Damage taken** | 55 (R1: 8, R2: 12, R3: 12, R4: 23) — piercing 16, necrotic 27, force 12 |
| **Exports**      | `CR_C4E04_TRACE`, `CR_C4E04_SUMMARY`, `CR_C4E04_ENCOUNTER`              |

## Validation

`replayActualPlayTrace()` in `actual-play-types.ts` does three things at import time:

1. **Kill validation** — every `kills` entry references a real enemy from the
   encounter definition, no enemy is killed twice, total matches `refKills` if set
2. **Damage summary** — auto-computed from `TAKE_DAMAGE` events, broken down by
   round and damage type
3. **XState replay** — events replayed through the real machine, states compared
   field-by-field

If validation fails, the module throws at import time with a clear error message.

## Adding new traces

1. Define an `EncounterDef` with enemies and source reference stats
2. Write `ActualPlayStep[]` with `round`, `source`, and `kills` annotations
3. Call `replayActualPlayTrace(encounter, steps)` — it validates and replays
4. Export the `trace`, `summary`, and `encounter`
5. The validator enforces kill consistency; damage is auto-summed
