# Proposal: Greater Invisibility — Surface Widening

## Unit

- **Name**: Greater Invisibility
- **Kind**: spell (level 4, Illusion, Concentration up to 1 minute)
- **SRD text**: "A creature you touch has the Invisible condition until the spell ends."

## Family Fit

`ongoing_effect` is the correct structural family:

- Casting time: Action
- Range: Touch
- Attachment: single target (`{ kind: "target", selection: { mode: "one" } }`)
- Duration: concentration up to 1 minute
- Operation: apply a condition to the target for the duration

Everything maps cleanly except the operation itself.

## Blockers

### 1. `OngoingOperation` missing `apply_condition` variant

`types.ts` defines:

```typescript
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

Neither existing variant represents "target has condition X until the spell ends." The `apply_condition` v4 atom exists but has no surface path through `OngoingOperation`.

**Proposed addition:**

```typescript
export type ApplyConditionOperation = {
  readonly kind: "apply_condition";
  readonly condition: Condition;
};

export type OngoingOperation =
  | RollModifierOperation
  | DamageOnHitOperation
  | ApplyConditionOperation;
```

The tracer case for this operation would emit:
- an `apply_condition` effect node
- `procId --grants--> effId --attaches_to--> attId`

### 2. `Condition` type missing `"invisible"`

`types.ts` currently defines:

```typescript
export type Condition = "prone";
```

Greater Invisibility requires `"invisible"`. Immediate candidates for the next widening round include all SRD conditions that any spell or feature inflicts: `blinded`, `charmed`, `deafened`, `frightened`, `grappled`, `incapacitated`, `invisible`, `paralyzed`, `petrified`, `poisoned`, `prone`, `restrained`, `stunned`, `unconscious`.

**Proposed addition (minimal for this unit):**

```typescript
export type Condition = "prone" | "invisible";
```

## Encoding (once widened)

```dhall
let greaterInvisibility =
      { kind = "spell"
      , id = "greater_invisibility"
      , name = "Greater Invisibility"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-G-H#Greater Invisibility"
          }
      , description =
          "A creature you touch has the Invisible condition until the spell ends."
      , mechanics =
          { family = "ongoing_effect"
          , level = 4
          , school = "illusion"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , attachment =
              { kind = "target"
              , selection = { mode = "one" }
              }
          , operation =
              { kind = "apply_condition"
              , condition = "invisible"
              }
          }
      }

in  greaterInvisibility
```

## Expected Trace Atoms (post-widening)

| Atom | Category | Notes |
|---|---|---|
| `spell_root` | source | root |
| `activate` | procedure | casting time action |
| `action_quota` | resource | consumes |
| `spell_slot` | resource | level ≥ 4 |
| `concentration_lock` | resource | consumes |
| `concentrate` | lifecycle | grants |
| `expire` | lifecycle | ≤ 1 minute |
| `target` | attachment | one, Touch |
| `apply_condition` | effect | invisible |

## Classification

`surface_widening` — two new variants of existing surface types; no new v4 atoms needed.
