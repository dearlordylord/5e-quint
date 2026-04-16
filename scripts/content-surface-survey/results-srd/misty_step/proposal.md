# Proposal: surface_widening for Misty Step

## Unit

**Misty Step** — level 2 conjuration spell, Bonus Action, instantaneous, V only.
> "Briefly surrounded by silvery mist, you teleport up to 30 feet to an unoccupied space you can see."

## Why the unit does not fit

Misty Step is a one-shot activation (no concentration, no persistence) with a Bonus Action cost and a spell-slot resource. The `activation` family is the honest structural fit. However, encoding the unit hits two hard walls:

### 1. `ActivationPhase` has no `unconditional` variant

Every `ActivationPhase` requires a resolution gate:

```typescript
export type ActivationPhase =
  | { readonly kind: "attack_roll"; ... }   // requires roll vs AC
  | { readonly kind: "save_gate"; ... };    // requires Con/Dex/etc. save
```

Misty Step has neither. The caster spends the bonus action, spends the slot, and the teleport happens — no intermediary roll. Forcing it into `save_gate` or `attack_roll` would be a lie.

**Required widening:**

```typescript
// New variant of ActivationPhase
| {
    readonly kind: "unconditional";
    readonly attachment: Attachment;
    readonly onActivate: Effect;
  }
```

This variant fires its effect unconditionally on cast resolution. It serves all spells that have no roll and no save: teleportation spells, utility transmutations, buffs applied directly to self, etc.

### 2. `Effect` has no `move`/`teleport` variant

The teleport itself has no representation in the `Effect` union:

```typescript
export type Effect = DamageEffect | NoneEffect;
```

There is no `MoveEffect` or `TeleportEffect`. The v4 atom inventory already contains `move` (positional displacement) and `transport_exile` (forced planar exile), but neither made it into `types.ts`.

**Required widening:**

```typescript
export type MoveEffect = {
  readonly kind: "move";
  readonly mode: "teleport" | "forced";
  readonly maxFeet: number;
  readonly constraint?: "unoccupied_visible_space";
  readonly target: "self" | "target_creature";
};

export type Effect = DamageEffect | NoneEffect | MoveEffect;
```

The `constraint` field encodes the "unoccupied space you can see" predicate. For forced movement (Thunderwave push, Topple knock) this would be a different constraint or absent.

## Intended shape (if both widenings land)

```dhall
let mistyStep =
  { kind = "spell"
  , id = "misty_step"
  , name = "Misty Step"
  , provenance = { kind = "srd-5.2.1", section = "Spells/Descriptions-M-R#Misty Step" }
  , description = "Briefly surrounded by silvery mist, you teleport up to 30 feet to an unoccupied space you can see."
  , mechanics =
      { family = "activation"
      , level = 2
      , school = "conjuration"
      , castingTime = { kind = "bonus_action" }
      , range = { kind = "self" }
      , components = { v = True, s = False, m = False }
      , duration = { kind = "instantaneous" }
      , phases =
          [ { kind = "unconditional"
            , attachment = { kind = "self" }
            , onActivate =
                { kind = "move"
                , mode = "teleport"
                , maxFeet = 30
                , constraint = Some "unoccupied_visible_space"
                , target = "self"
                }
            }
          ]
      }
  }
in mistyStep
```

## Atom inventory impact

Both `move` and the concept of unconditional activation are already present in v4 taxonomy — this is purely a surface-layer gap (types.ts doesn't yet expose what v4 recognizes). No new atoms need to be added to the taxonomy graph.

## Pressure count

Misty Step is one of the most commonly cast spells in the game. Many other teleportation and direct-effect spells will hit the same two walls:
- `unconditional` phase: Misty Step, Feather Fall (reaction variant aside), Jump, Longstrider, Expeditious Retreat, countless buffs
- `move` effect: Misty Step, Dimension Door, Teleport, Teleportation Circle, Thunder Step, etc.

These widenings unlock a large slice of the spell corpus.
