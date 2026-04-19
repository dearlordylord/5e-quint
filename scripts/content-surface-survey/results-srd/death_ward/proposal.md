# Widening Proposal: Death Ward

**Outcome:** `atom_widening`  
**Family:** `ongoing_effect` (fits — timed 8h, no concentration, single target attachment)

## Summary

Death Ward fits the `ongoing_effect` spell family cleanly. The spell header, duration, range, and attachment all express without new surface shapes. The gap is entirely in missing trigger/effect atoms and a missing one-shot operation semantic.

## Missing Pieces

### 1. `OngoingTrigger.on_attached_would_reach_zero_hp`

**RAW:** "The first time the target would drop to 0 Hit Points before the spell ends..."

The existing `on_attached_damaged` trigger fires whenever the creature receives damage, with no predicate for "damage that would reduce HP to exactly 0 or below." Death Ward's trigger is an interception point *before* the 0-HP state is applied — semantically different from responding to any damage event. A threshold-predicate variant (`at_hp_threshold: 0, comparison: lte`) on `on_attached_damaged` could potentially cover this, but the current `OngoingPredicate` only handles `at_hp_threshold` comparisons on current HP, not on *resulting* HP after a damage instance. A dedicated trigger variant is cleaner and unambiguous.

### 2. `EffectAtom: stabilize_at_one_hp`

**RAW:** "...the target instead drops to 1 Hit Point, and the spell ends."

No existing effect atom covers this:
- `heal_hp` — restores HP after-the-fact, cannot intercept a death event
- `reduce_damage_taken` — reduces an incoming damage roll; doesn't model the resulting-HP floor
- `modify_max_hp` — changes maximum HP, not current HP
- `grant_temp_hp` — adds a separate HP pool, doesn't prevent the current-HP drop

This is a death-interception atom: "replace the 0-HP outcome with a 1-HP outcome." Proposed shape:
```typescript
| { readonly kind: "stabilize_at_one_hp" }
```
Semantics: when the triggering death-threshold event fires, the creature's HP is set to 1 instead of 0, and the host operation is consumed.

### 3. `EffectAtom: negate_instant_kill`

**RAW:** "If the spell is still in effect when the target is subjected to an effect that would kill it instantly without dealing damage, that effect is negated against the target, and the spell ends."

No existing effect atom covers open-ended instant-kill negation:
- `negate_named_effect` requires a specific `spellId`
- `negate_triggering_spell` is reaction-only (triggered_reaction family)
- `grant_condition_immunity` / `grant_damage_immunity` don't address the non-damage-kill pattern

Proposed shape:
```typescript
| { readonly kind: "negate_instant_kill" }
```
Semantics: while the host operation is active, negate any effect applied to the attached target that would kill it without dealing damage (Power Word Kill, Disintegrate at 0 HP, certain monster traits).

### 4. `OngoingOperation.count` (one-shot operations)

**RAW:** Both protective clauses fire exactly once and then the spell ends.

`OngoingOperation` currently has no `count` limiter — it fires for the full duration on every matching trigger event. The "spell ends" behavior for Death Ward is not a target-action `earlyEnd` trigger (the existing `DurationEndTrigger` variants watch for target attacks, damage, spells cast, armor donning, etc.) — it is the *operation itself* that consumes the spell when it resolves.

Proposed addition to `OngoingOperation`:
```typescript
readonly count?: number;  // absent = unlimited; 1 = one-shot (spell ends after first firing)
```

This parallels the existing `count` field on `modify_roll_numeric` and `modify_roll_advantage`, which use the same one-shot pattern for single-use roll riders.

## Encoding Sketch (blocked pending surface widening)

```dhall
{ kind = "spell"
, id = "death_ward"
, name = "Death Ward"
, mechanics =
    { family = "ongoing_effect"
    , level = 4
    , school = "abjuration"
    , castingTime = { kind = "action" }
    , range = { kind = "touch" }
    , components = { v = True, s = True, m = False }
    , duration =
        { kind = "timed"
        , value = { unit = "hour", amount = 8 }
        }
    , attachment =
        { kind = "target"
        , selection = { mode = "one" }
        }
    , operations =
        [ { trigger = { kind = "on_attached_would_reach_zero_hp" }  -- MISSING
          , count = 1                                               -- MISSING
          , effect = { kind = "stabilize_at_one_hp" }             -- MISSING
          }
        , { trigger = { kind = "passive" }
          , count = 1                                               -- MISSING
          , effect = { kind = "negate_instant_kill" }             -- MISSING
          }
        ]
    }
}
```

## Classification

All missing pieces are effect atoms and trigger/operation variants — none require a new top-level family or UnitRecord kind. This is `atom_widening` (new atoms) plus `surface_widening` (new variant on `OngoingTrigger` and new field on `OngoingOperation`). The dominant classification is `atom_widening` since the effect concepts (`stabilize_at_one_hp`, `negate_instant_kill`) are not in the v4 taxonomy.
