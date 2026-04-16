# Proposal: Magic Missile encoding gap

## Unit

- **Slug**: `magic_missile`
- **Kind**: spell (srd-5.2.1)
- **Outcome**: `surface_widening`

## What the spell does

Magic Missile (Level 1 Evocation, Action, 120 ft, Instantaneous, V/S):

> You create three glowing darts of magical force. Each dart strikes a creature of your choice that you can see within range. A dart deals 1d4 + 1 Force damage to its target. The darts all strike simultaneously, and you can direct them to hit one creature or several.

Upcast: +1 dart per slot level above 1.

## Why it does not fit

The `activation` spell family exists and is structurally correct for Magic Missile (instantaneous, one-shot, action cast). However, `ActivationPhase` is defined as:

```typescript
export type ActivationPhase =
  | { readonly kind: "attack_roll"; ... }
  | { readonly kind: "save_gate"; ... };
```

Magic Missile's darts **automatically hit** — no attack roll, no saving throw. There is no phase variant that delivers damage unconditionally. Encoding this spell honestly requires a third `ActivationPhase` variant.

## Proposed widenings

### 1. `auto_hit` ActivationPhase variant (primary)

Add a new `ActivationPhase` variant that delivers an effect with no resolution step:

```typescript
| {
    readonly kind: "auto_hit";
    readonly attachment: Attachment;
    readonly onHit: Effect;
  }
```

This maps to the "guaranteed hit" subgraph: no `attack_roll` or `save_gate` resolution node, just `attaches_to` → effect delivery. The tracer would emit:

```
activate → attaches_to → target
activate → grants → damage(1d4+1 Force)
damage → attaches_to → target
```

No `on_hit_window` or `on_miss_window` is needed — there is no window because there is no conditional.

All v4 atoms used: `spell_root`, `activate`, `action_quota`, `spell_slot`, `target`, `damage`, `scale_die_count` (for dart-count scaling). Only the phase shape is missing.

### 2. Dart-count modeling (secondary design question)

Magic Missile produces N darts (3 + 1/slot above 1) which may all target the same creature. The existing `TargetSelection.choose_up_to` with `SlotScaling<number>` models "up to N distinct creatures." It does not represent "N applications, repeatable on one target."

Two options:

**Option A**: Reuse `choose_up_to` with the semantics loosened to "N applications (may repeat)." This keeps the surface narrow and is probably sufficient for most consumers.

**Option B**: Add a `dart_count` parameter to the `auto_hit` phase variant, distinct from `attachment.selection`. This is more precise but adds surface complexity.

Recommendation: Option A for now. The dart-count is naturally expressed as a `SlotScaling<number>` on the `choose_up_to` selection field, and the per-dart damage is fixed at 1d4+1. The "can repeat targets" nuance is notable in `notes` but does not require a new atom — it is a semantic annotation on `choose_up_to`.

## Resulting encoding sketch (contingent on widening)

```json
{
  "kind": "spell",
  "mechanics": {
    "family": "activation",
    "level": 1,
    "school": "evocation",
    "castingTime": { "kind": "action" },
    "range": { "kind": "point", "feet": 120 },
    "components": { "v": true, "s": true, "m": false },
    "duration": { "kind": "instantaneous" },
    "phases": [
      {
        "kind": "auto_hit",
        "attachment": {
          "kind": "target",
          "selection": {
            "mode": "choose_up_to",
            "count": { "kind": "linear", "base": 3, "perSlotAboveBase": 1, "baseLevel": 1 }
          }
        },
        "onHit": {
          "kind": "damage",
          "damageType": "force",
          "amount": { "kind": "fixed", "expr": { "dice": 1, "dieSize": 4, "flat": 1 } }
        }
      }
    ]
  }
}
```

Note: The `onHit` damage above is per-dart (1d4+1). The scaling of dart count is captured in the `choose_up_to` selection count, not in the damage amount.

## Atoms used (projected)

- `spell_root`
- `activate`
- `action_quota`
- `spell_slot` (≥ level 1)
- `target` (choose_up_to)
- `scale_die_count` or `scale_numeric_bonus` for dart count (SlotScaling)
- `damage` (1d4+1 Force, per dart)

All exist in v4. No atom widening required.

## Classification rationale

This is `surface_widening`, not `atom_widening`:

- The `activation` family and all needed v4 atoms exist.
- The gap is purely in the `ActivationPhase` union type — a new variant is needed, not a new atom concept.
- `structural_widening` would be incorrect: the activation family is the right shape. Only one phase-variant is missing.
