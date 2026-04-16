# Proposal: Widening Required for Boon of Irresistible Offense

## Outcome: `structural_widening`

The unit cannot be honestly encoded. Three independent blockers prevent it, with the structural gap being the primary one.

---

## Blocker 1: No `feat` kind in `UnitRecord` (structural)

`UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord`. There is no `FeatRecord`.

Feats are a distinct D&D 5e unit type:
- They have prerequisites (level, ability score) that are not `acquiredAtLevel` on a class
- They contain multiple independent benefit buckets that do not share a single mechanics family
- This feat combines: a stat increase, a passive damage modifier, and a conditional on-hit rider — no existing family covers this

Encoding as `ClassFeatureRecord` would be dishonest: it requires `className` and `acquiredAtLevel`, both inapplicable, and `ClassFeatureMechanics` only supports `activation` with a single `ClassFeatureEffect`.

**Required addition:** `FeatRecord` kind and a feat mechanics family that supports multi-bucket benefits.

---

## Blocker 2: `crit_window` atom is missing (atom widening)

**Overwhelming Strike** fires "when you roll a 20 on the d20 for an attack roll." This is a natural-20 (critical hit) trigger — not a general on-hit trigger.

TAXONOMY v4 §12 (Known Remaining Weak Spots) explicitly records this pressure:

> `crit_window` as a distinct trigger from `on_hit_window` (Boon of Irresistible Offense's Overwhelming Strike). Not promoted; single-feat pressure.

Using `on_hit_window` would produce a mechanically incorrect trace: it would fire on all hits, not only on natural 20s.

**Required addition:** `crit_window` Window atom.

---

## Blocker 3: Ability-score-as-damage-value has no `DiceAmount` shape (surface widening)

**Overwhelming Strike's** damage is "equal to the ability score increased by this feat" — a flat integer equal to the character's current STR or DEX score. No existing `DiceAmount` variant can express this:

| Variant | Why it fails |
|---|---|
| `fixed` | Requires a known `DiceExpr` at author time |
| `threshold_tiers` | Requires axis-based tier schedule with explicit values |
| `linear_per_level` | Requires a base + per-level delta |

None can reference a runtime character stat.

**Required addition:** A new `DiceAmount` variant, e.g.:
```typescript
{ kind: "ability_score_value"; ability: Ability }
```
Meaning: "flat damage equal to the character's current score in this ability."

---

## Secondary: Overcome Defenses needs a passive benefit carrier (surface widening)

`bypass_resistance` exists as a v4 effect atom. The gap is the *carrier*: the current surface has no way to express an always-on, passive, no-activation-cost feat benefit. Every `ClassFeatureEffect` variant requires an activation procedure.

Whatever `FeatRecord` family is introduced will need a passive benefit slot (alongside activated riders) to host effects like "your BPS damage always ignores Resistance."

---

## Summary

| Blocker | Classification | Required addition |
|---|---|---|
| No `feat` kind / `FeatRecord` | `structural_widening` | New UnitRecord kind + feat mechanics family |
| No `crit_window` atom | `atom_widening` | New Window atom |
| No ability-score-as-damage DiceAmount | `surface_widening` | New `DiceAmount` variant |
| No passive benefit carrier | `surface_widening` | Needed by feat family design |
| `modify_ability_score` (ASI sub-benefit) | out-of-scope | Deferred per TAXONOMY v4 §12 |
