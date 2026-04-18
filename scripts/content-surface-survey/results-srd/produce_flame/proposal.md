# Proposal: `OngoingTrigger.on_caster_action` variant

**Unit:** Produce Flame (cantrip, conjuration)
**Outcome:** `surface_widening`

## What fits

The `ongoing_effect` family is the right structural home. Three of the four mechanic layers encode cleanly today:

| Layer | Current surface coverage |
|---|---|
| Passive light | `emit_light { brightRadiusFeet: 20, dimAdditionalFeet: 20 }` under `trigger: { kind: "passive" }` |
| Early end on recast | `DurationEndTrigger { kind: "caster_recasts_spell" }` on the timed duration |
| Cantrip damage scaling | `DiceAmount.threshold_tiers { axis: "character", base: 1d8, tiers: [L5→2d8, L11→3d8, L17→4d8] }` |

The mechanics header also fits cleanly: Bonus Action cast, Self range, V/S components, 10-minute timed duration (no concentration), conjuration school, level 0.

## What doesn't fit

The **optional Magic-action attack** has no honest `OngoingTrigger` encoding:

> "Until the spell ends, you can take a Magic action to hurl fire at a creature or an object within 60 feet of you. Make a ranged spell attack. On a hit, the target takes 1d8 Fire damage."

This is an optional, repeatable, per-action-expenditure attack made while the spell persists. The existing `OngoingTrigger` variants are:

- `passive` — unconditionally always-on while the spell persists. Does not model optionality or action cost.
- `on_caster_attack_hit` — fires when the caster hits with an *existing* attack. Does not grant a new attack.
- `on_attached_turn_start` / `on_caster_turn_start` — automatic per-turn events; no action cost; no optionality.
- `on_attached_damaged` / `on_creature_moves` / `on_creature_enters_area` — world-event triggers; unrelated shape.

None expresses "the caster voluntarily spends a named action kind to trigger this effect."

The v4 taxonomy already names `action_window` and `bonus_action_window` as Window Atoms (§4), so the concept is recognized in v4. The gap is in the `OngoingTrigger` surface, which doesn't expose an action-expenditure variant.

## Proposed widening

Add a new variant to `OngoingTrigger`:

```typescript
| {
    readonly kind: "on_caster_action";
    readonly actionKind: StandardActionKind;
    // Optional: whether the action replaces or supplements normal usage
    readonly optional?: true;
  }
```

**Semantics:** While the host ongoing effect is active, if the caster spends the named action kind (`actionKind`), the associated effect fires. `optional: true` signals the caster may choose not to spend it (the default for all `OngoingTrigger` variants is implicit optionality when expressed as player choice, but making it explicit aids authoring clarity).

**Tracer rendering:** Emits an `action_window` node (v4 Window Atom, §4) connected to the procedure via `opens_window`. The effect hangs off the window via `grants`.

**Produce Flame encoding with this widening:**

```dhall
operations =
  [ { trigger = { kind = "passive" }
    , effect = { kind = "emit_light", brightRadiusFeet = 20, dimAdditionalFeet = 20 }
    }
  , { trigger = { kind = "on_caster_action", actionKind = "magic", optional = True }
    , effect =
        { kind = "attack_roll"           -- OngoingEffect.save_gate already exists; attack_roll phase inline needs thought
        , ... 
        }
    }
  ]
```

## Secondary note: attack-in-ongoing encoding

Beyond the trigger variant, `OngoingEffect` also needs to accommodate an `attack_roll` resolution inline. Currently `OngoingEffect` supports `EffectAtom | save_gate | modify_ac_set_floor`. An `attack_roll` shape (parallel to `save_gate` but for ranged spell attacks) would be needed, or alternatively, the `on_caster_action` trigger could allow the effect to be a full `ActivationPhase` (which already has `attack_roll` as a variant).

The cleanest route may be to allow `ActivationPhase` as an `OngoingEffect` variant, since `ActivationPhase.attack_roll` already carries `attachment`, `attackKind`, `onHit`, and `onMiss` — exactly the shape needed for the Produce Flame throw.

This is a secondary surface gap that the primary `on_caster_action` trigger widening would need to accompany.

## Generality

The `on_caster_action` trigger would cover other SRD units with the same "while persists, spend action to do X" pattern, such as:
- Spiritual Weapon (bonus action to attack while the spell persists — though Spiritual Weapon is `ongoing_effect` with a companion; same trigger shape)
- Any cantrip or feature that grants a repeatable attack or effect while an ongoing spell is maintained
