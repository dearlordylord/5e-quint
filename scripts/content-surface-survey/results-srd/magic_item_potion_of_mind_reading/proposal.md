# Proposal: Potion of Mind Reading — Surface Widening

## Unit

**Name:** Potion of Mind Reading  
**Kind:** magic_item  
**Rarity:** rare  
**SRD source:** MagicItems#Potion of Mind Reading

> When you drink this potion, you gain the effect of the *Detect Thoughts* spell (save DC 13) for 10 minutes (no Concentration required).

---

## What fits today

- **Record kind**: `magic_item` ✓
- **Mechanics family**: `activation` ✓ (same skeleton as Potion of Flying, Potion of Invisibility)
- **Single-use pattern**: `resource: use_count cap=1`, `resetCadence: never`, `destruction: permanent_on_empty` ✓
- **Timed duration**: `duration: { kind: "timed", value: { unit: "minute", amount: 10 } }` ✓ (no concentration)
- **Passive detection aspect**: `EffectAtom.detect { property: "thoughts", radiusFeet: 30 }` ✓

---

## What does NOT fit

### Gap 1: `ActivatedAbilityMechanics` has no `operations` field

The core mechanic of Detect Thoughts (and therefore this potion) is an **on-demand interactive operation** available throughout the 10-minute window:

1. The drinker can spend an action to focus on one creature within 30 feet.
2. That creature makes a Wisdom saving throw (DC 13).
3. On a failed save, the drinker learns the creature's surface thoughts.
4. On a successful save, the creature notices the probe and the effect ends.
5. The drinker can then spend another action to probe deeper thoughts (another Wis save).

This is an `OngoingOperation` shape: `trigger: on_caster_action` (or similar) → `effect: save_gate`.

`OngoingEffectMechanics` (spell family) has `operations: ReadonlyNonEmptyArray<OngoingOperation>`. `ActivatedAbilityMechanics` (magic item / class feature family) has only `phases: ReadonlyNonEmptyArray<ActivationPhase>` — one-time resolution steps fired at activation, not repeatable operations during the duration.

There is no way to express "during the 10-minute window, the holder may as an action trigger a save-gated effect" in the current magic-item surface.

**Proposed fix:** Add an optional `operations` field to `ActivatedAbilityHeader`:

```typescript
type ActivatedAbilityHeader = {
  // ... existing fields ...
  readonly duration?: Duration;
  readonly operations?: ReadonlyNonEmptyArray<OngoingOperation>; // NEW
};
```

This mirrors the pattern already established in `OngoingEffectMechanics` and would allow magic items (and class features) that grant timed interactive effects to express their ongoing mechanics without forcing a structural split into a new family.

### Gap 2: DurationEndTrigger missing `save_succeeded` variant

Detect Thoughts ends early when the target **succeeds on the Wisdom save** during the thought probe. The existing `DurationEndTrigger` variants cover actions taken by the drinker (`target_makes_attack_roll`, `target_deals_damage`, `target_casts_spell`) but not "a creature in the effect succeeds on the periodic save."

**Proposed fix:** Add a new variant to `DurationEndTrigger`:

```typescript
| { readonly kind: "target_succeeds_on_probe_save" }
```

Or, more generally, allow the `save_gate` within an `OngoingOperation` to signal effect end on success (which `RepeatSaveSpec.onSuccess: "ends_on_target"` already does for spells — so this gap may be covered automatically if Gap 1 is resolved via the `operations` approach).

---

## Classification

**`surface_widening`** — the `activation` family and `magic_item` record kind exist. The deficit is a missing field on `ActivatedAbilityMechanics` (`operations`) that would allow ongoing interactive mechanics during the activation's duration window. All needed atoms (`detect`, `save_gate`, `apply_condition`) already exist in v4.

---

## Encoding (pending widening)

Once `ActivatedAbilityMechanics.operations` is available, the full encoding would be:

```dhall
{ kind = "magic_item"
, id = "magic_item_potion_of_mind_reading"
, name = "Potion of Mind Reading"
, rarity = "rare"
, requiresAttunement = False
, provenance = { kind = "srd-5.2.1", section = "MagicItems#Potion of Mind Reading" }
, description = "When you drink this potion, you gain the effect of the Detect Thoughts spell (save DC 13) for 10 minutes (no Concentration required)."
, mechanics =
    { family = "activation"
    , activationCost = { kind = "action" }
    , resource = { kind = "use_count", cap = { kind = "fixed", uses = 1 } }
    , resetCadence = { kind = "never" }
    , duration = { kind = "timed", value = { unit = "minute", amount = 10 } }
    , phases =
        [ { kind = "direct"
          , attachment = { kind = "self" }
          , effects = [ { kind = "detect", property = "thoughts", radiusFeet = 30 } ]
          }
        ]
    -- NEW field (pending widening):
    , operations =
        [ { trigger = { kind = "on_caster_action_probe" }  -- new trigger variant
          , effect =
              { kind = "save_gate"
              , ability = "wis"
              , dc = { kind = "weapon_attack_dc", base = 13 }  -- fixed DC 13
              , onFail = { kind = "none" }   -- caster reads surface thoughts (DM agenda)
              , onSuccess = { kind = "none" } -- effect ends (DurationEndTrigger)
              }
          }
        ]
    }
, destruction = { kind = "permanent_on_empty" }
}
```

Note: "reading thoughts" itself is DM agenda (informational, narrative outcome) per ARCHITECTURE.md §1. The mechanical atoms are: the save gate, the early-end trigger on save success, and the ongoing detection. The content of the thoughts is out of core scope.
