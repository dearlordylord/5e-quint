# Proposal: Surface Widening for Ray of Sickness

## Unit

**Ray of Sickness** — Level 1 Necromancy spell (SRD 5.2.1)

## Outcome

`surface_widening` — The `activation` family and `attack_roll` phase fit. The blocker is the on-hit compound effect (damage + condition). No Dhall or JSON was authored.

## Spell text

> Make a ranged spell attack against the target. On a hit, the target takes 2d8 Poison damage and **has the Poisoned condition until the end of your next turn.**

Higher level: +1d8 per slot above 1.

## What fits

| Mechanic | Current surface | Verdict |
|---|---|---|
| Casting time: Action | `action_quota` | ✓ |
| Level 1 spell slot | `spell_slot` | ✓ |
| Duration: Instantaneous | no lifecycle atom needed | ✓ |
| Ranged spell attack, one target, 60 ft | `attack_roll` phase + `target` attachment | ✓ |
| 2d8 Poison damage, +1d8/slot above 1 | `DiceAmount.linear_per_level` axis=slot | ✓ |
| On miss: nothing | `NoneEffect` | ✓ |

## What does NOT fit

### Gap 1: `Effect` has no `apply_condition` variant

```typescript
export type Effect = DamageEffect | NoneEffect;
```

Ray of Sickness on a hit simultaneously applies damage and the Poisoned condition. The `attack_roll` phase's `onHit: Effect` accepts exactly one effect. There is no `apply_condition` variant. The spell cannot be honestly encoded with damage alone — the condition is the spell's distinguishing mechanic.

**The v4 atom `apply_condition` exists** (TAXONOMY_atoms_graph.md §9 Effect Atoms). It just isn't reachable through `ActivationPhase.onHit`.

### Gap 2: `Condition` only contains `"prone"`

```typescript
export type Condition = "prone";
```

The Topple mastery established `prone`. Ray of Sickness needs `"poisoned"`. Other spells in the corpus will need `"blinded"`, `"charmed"`, `"frightened"`, etc.

## Proposed widening

### Option A — Widen `Effect` to include `apply_condition`

```typescript
export type ApplyConditionEffect = {
  readonly kind: "apply_condition";
  readonly condition: Condition;
  readonly expiry: ConditionExpiry;   // new type, see below
};

export type Effect = DamageEffect | ApplyConditionEffect | NoneEffect;
```

Add `ConditionExpiry` (analogous to `RiderExpiry` on masteries):

```typescript
export type ConditionExpiry =
  | { readonly kind: "end_of_caster_next_turn" }
  | { readonly kind: "end_of_target_next_turn" }
  | { readonly kind: "until_dispelled" }
  | { readonly kind: "concentration" };   // handled by spell duration, may be redundant
```

Ray of Sickness uses `end_of_caster_next_turn`.

### Option B — Allow `onHit` to be a sequence

```typescript
onHit: ReadonlyArray<Effect>;
```

This allows both `DamageEffect` and `ApplyConditionEffect` in the same hit window without changing the `Effect` type's shape. Tracer would iterate and emit one node per element.

### Widen `Condition`

```typescript
export type Condition =
  | "prone"
  | "poisoned"
  | "blinded"
  | "charmed"
  | "frightened"
  | "incapacitated"
  | "paralyzed"
  | "restrained"
  | "stunned"
  | "exhaustion";  // add as pressure lands
```

Minimum for this unit: add `"poisoned"`.

## Encoding (pending widening)

Once widened, the encoding would be:

```dhall
{ kind = "spell"
, id = "ray_of_sickness"
, name = "Ray of Sickness"
, provenance = { kind = "srd-5.2.1", section = "Spells/Descriptions-R#Ray of Sickness" }
, description = "..."
, mechanics =
    { family = "activation"
    , level = 1
    , school = "necromancy"
    , castingTime = { kind = "action" }
    , range = { kind = "point", feet = 60 }
    , components = { v = True, s = True, m = False }
    , duration = { kind = "instantaneous" }
    , phases =
        [ { kind = "attack_roll"
          , attachment = { kind = "target", selection = { mode = "one" } }
          , attackKind = "ranged_spell_attack"
          , onHit =
              -- requires surface widening: compound damage + condition
              [ { kind = "damage"
                , damageType = "poison"
                , amount =
                    { kind = "linear_per_level"
                    , axis = "slot"
                    , base = { dice = 2, dieSize = 8 }
                    , perLevel = { dice = 1 }
                    , startingAtLevel = 1
                    }
                }
              , { kind = "apply_condition"
                , condition = "poisoned"
                , expiry = { kind = "end_of_caster_next_turn" }
                }
              ]
          , onMiss = { kind = "none" }
          }
        ]
    }
}
```

## Tracer atoms expected (after widening)

| Atom | Category |
|---|---|
| `spell_root` | source |
| `activate` | procedure |
| `action_quota` | resource |
| `spell_slot` | resource |
| `attack_roll` | resolution |
| `target` | attachment |
| `on_hit_window` | window |
| `damage` | effect |
| `apply_condition` | effect |
| `scale_die_count` | scaling |

Relations: `roots`, `consumes`, `grants`, `attaches_to`, `opens_window`, `branches_on_completion`, `modifies`
