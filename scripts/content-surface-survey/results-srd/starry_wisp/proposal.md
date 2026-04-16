# Proposal: Starry Wisp — atom_widening

## Summary

Starry Wisp is an `activation` cantrip (ranged spell attack) whose damage and scaling fit the current surface cleanly. A partial encoding was produced and traces correctly. Two on-hit riders cannot be expressed with v4 atoms and are omitted from the encoding.

## What was encoded

| Element | Shape | Fits? |
|---|---|---|
| Casting time: action | `action_quota` | ✅ |
| Range: 60 ft point | `range.point` | ✅ |
| Components: V, S | `components {v,s,m:false}` | ✅ |
| Duration: instantaneous | `instantaneous` | ✅ |
| Ranged spell attack | `attack_roll / ranged_spell_attack` | ✅ |
| On hit: 1d8 Radiant | `damage / radiant / threshold_tiers` | ✅ |
| Cantrip scaling 1d8→4d8 | `scale_die_count / axis=character` | ✅ |

## What was omitted (requires new atoms)

### 1. `emit_light` (new effect atom)

**Spell text:** "until the end of your next turn, it emits Dim Light in a 10-foot radius"

**Why it needs a new atom:** This is a timed light-emission effect applied *to the target* as a consequence of being hit. No v4 atom covers it:
- `grant_sense` grants a sense *to the recipient* (typically an ally/self), not a light-emission from a creature
- `apply_condition` applies one of the closed `Condition` variants — light emission is not a condition
- `modify_ac`, `modify_speed`, etc. are orthogonal

A new `emit_light` effect atom (or `apply_light_aura`) would be needed, parameterized by light level (bright/dim), radius, and duration. The expiry is `end_of_next_turn` which maps to the existing `RiderExpiry.end_of_next_turn` shape.

**Similar pressure:** Any spell that illuminates a creature on hit (Faerie Fire-like riders) or that creates a persistent light source on a target will require this atom.

### 2. `deny_condition_benefit` (new effect atom)

**Spell text:** "can't benefit from the Invisible condition"

**Why it needs a new atom:** This operation does not remove the Invisible condition from the target — the target may still be invisible to other observers. It specifically denies the *mechanical benefits* of invisibility (attack-roll advantage, disadvantage on attacks against the target) for the duration. No v4 atom represents this:
- `remove_condition` removes the condition entirely (not what the spell says)
- `apply_condition` is additive, not suppressive
- `negate_named_effect` negates a *spell* effect, not a condition's benefit
- `modify_roll_advantage` could approximate one half of the benefit (e.g., force disadvantage on the target's attacks) but cannot honestly capture "can't benefit from Invisible" as a whole — the invisible condition has multiple mechanical consequences

A new `deny_condition_benefit` atom parameterized by condition name and expiry would cover this case. The expiry is `end_of_next_turn`.

**Similar pressure:** Any spell that negates the benefit of invisibility, truesight-like counters, or other "see through condition" mechanics will require this atom. Faerie Fire is the canonical comparison: it makes affected creatures unable to benefit from hiding/invisibility, which is the same mechanic.

## Precedent

Chill Touch (already encoded) follows the identical pattern: the damage portion was encoded; the on-hit rider ("can't regain Hit Points") was omitted with the same `atom_widening` classification. The Starry Wisp encoding mirrors that approach.

## Recommended v4 upgrade path

Add to §9 Effect Atoms:
- `emit_light` — timed light emission applied to a creature; parameterized by light level, radius, and expiry
- `deny_condition_benefit` — temporarily negates the mechanical benefits of a named condition; parameterized by condition and expiry

Both are narrow-pressure additions forced by multiple spells in the SRD (Faerie Fire, Starry Wisp, others) and are mechanically distinct from existing atoms.
