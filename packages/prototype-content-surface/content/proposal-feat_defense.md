# Proposal: Defense (feat_defense)

## Unit

**Defense** — Fighting Style Feat (Prerequisite: Fighting Style Feature)
*While you're wearing Light, Medium, or Heavy armor, you gain a +1 bonus to Armor Class.*

## Outcome: `clean`

This unit encodes cleanly. No widening is needed.

---

## Encoding

```dhall
{ kind = "feat"
, id = "feat_defense"
, name = "Defense"
, category = "fighting_style"
, mechanics =
    { family = "passive"
    , condition = { kind = "wearing_armor", categories = [ "light", "medium", "heavy" ] }
    , grants = [ { kind = "modify_ac", delta = { kind = "fixed_dice", dice = 1, dieSize = 1, sign = "+" } } ]
    }
}
```

## History

An earlier draft (pre-EquipmentPredicate) classified this as `surface_widening` because `PassiveMechanics` had no conditional gate field. The `EquipmentPredicate` type (`wearing_armor` variant) was subsequently added to the surface, resolving the gap. The unit now encodes and traces without any lies.

## Trace atoms

- `feat_root → grant (passive) → [requires] wearing_armor [light, medium, heavy]`
- `grant (passive) → [grants] modify_ac +1`
