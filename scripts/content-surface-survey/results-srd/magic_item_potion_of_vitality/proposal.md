# Proposal: Potion of Vitality — atom_widening

## Unit

**Name:** Potion of Vitality  
**Kind:** magic_item  
**Rarity:** Very Rare  
**Provenance:** SRD 5.2.1 — MagicItems#Potion of Vitality

## SRD Text

> When you drink this potion, it removes any Exhaustion levels you have and ends the Poisoned condition on you. For the next 24 hours, you regain the maximum number of Hit Points for any Hit Point Die you spend.

## Mechanic Decomposition

| Effect | Timing | Candidate Atom | Status |
|--------|--------|----------------|--------|
| Remove all Exhaustion | Immediate, permanent | `remove_condition` "exhaustion" | ✓ Fits |
| End Poisoned condition | Immediate, permanent | `remove_condition` "poisoned" | ✓ Fits |
| Maximize HP from Hit Die spending | Timed 24h, ongoing | ??? | ✗ Missing |

## Blocking Gap: `maximize_hit_die_recovery`

### Closest existing atom

```typescript
| { readonly kind: "maximize_healing_received" }
// Beacon of Hope: "when the target regains Hit Points, it regains
// the maximum number possible." Dodges the normal dice roll.
```

### Why it does not fit

`maximize_healing_received` applies to **all sources of HP regain** — healing spells (Cure Wounds, Healing Word), class features (Second Wind), magic items, and Hit Dice alike.

The Potion of Vitality scopes maximization exclusively to **Hit Point Dice spending** during a Short Rest. Using `maximize_healing_received` would imply that for 24 hours, the drinker also maximizes healing received from spells and other features, which is not what the SRD text says.

Using the existing atom would produce a dishonest trace.

### Proposed widening

Add a new `EffectAtom` variant:

```typescript
| {
    readonly kind: "maximize_hit_die_recovery";
    // No additional fields needed — the scope (Hit Die spending only)
    // is the semantic content of this atom. Duration lives on the
    // ActivatedAbilityMechanics header.
  }
```

This parallels the existing `maximize_healing_received` but with a narrower scope matching the SRD text. The v4 taxonomy does not contain this atom — the closest entry in § 9 Effect Atoms is the generic `heal` atom, which covers the HP gain itself but not the maximize-the-die-roll rider.

## Secondary Gap: Mixed-Duration Phase Effects

The potion has **three simultaneous effects with different lifetimes**:

1. `remove_condition` exhaustion — permanent (exhaustion does not re-apply after 24h)
2. `remove_condition` poisoned — permanent
3. `maximize_hit_die_recovery` — timed 24h

The `ActivatedAbilityMechanics.duration` field (an `ActivatedAbilityHeader` field) applies to the activation as a whole. There is no per-effect duration in the current surface.

If we set `duration = { kind = "timed", value = { unit = "hour", amount = 24 } }` and put all three effects in a single `direct` phase, the trace would (incorrectly) imply that the `remove_condition` effects expire after 24h.

Note: the tracer currently does not emit duration nodes for `ActivatedAbilityMechanics` (only for spells), so this structural ambiguity would be silent in the trace rather than an error. The dishonesty is semantic, not structural.

### Potential resolution

One approach: add an `operations` field to `ActivatedAbilityMechanics` (mirroring `OngoingEffectMechanics.operations`) so an activation can express a timed sub-window with its own trigger and effect, distinct from the phases that apply immediately.

Another approach: encode the 24h effect in a separate `direct` phase with a local duration annotation on the effect atom itself. This would require adding `duration?: Duration` to the `EffectAtom` union or to specific effect atom variants.

## Verdict

- **Outcome:** `atom_widening`
- **Primary blocker:** `maximize_hit_die_recovery` atom missing from `EffectAtom` and from the v4 taxonomy
- **Secondary issue:** No per-effect duration granularity in `ActivatedAbilityMechanics`
- No dhall/json/trace authored — the unit cannot be encoded honestly with the current surface
