# Proposal: feat_alert — Initiative Swap atom

## Classification

`atom_widening` — one of the two named benefits (Initiative Swap) requires a new v4 atom with no existing equivalent.

## Encoded

**Initiative Proficiency** fits the current surface without modification:

```json
{
  "kind": "modify_roll_numeric",
  "on": ["initiative"],
  "delta": { "kind": "proficiency_bonus", "sign": "+" }
}
```

Passive grant, no equipment predicate, no reset cadence. Tracer emits `feat_root → grant → modify_roll_numeric` with `roots` and `grants` edges. Clean.

## Missing: Initiative Swap

**Source text:**
> Immediately after you roll Initiative, you can swap your Initiative with the Initiative of one willing ally in the same combat. You can't make this swap if you or the ally has the Incapacitated condition.

**Why no existing atom fits:**

- `modify_roll_numeric` — modifies the die roll itself, not the final initiative value after it is set. Cannot express a post-roll exchange between two creatures.
- `force_move`, `modify_speed`, `grant_extra_action` — wrong domain entirely.
- No v4 atom addresses mutating the initiative order after values are established.

This is **not DM agenda**: the swap has a deterministic mechanical definition (exchange two numbers in the encounter initiative order, conditional on neither creature being Incapacitated). It is a player-exercised optional effect, like many other "you can" passive grants.

## Proposed atom: `swap_initiative_order`

| Field | Value |
|---|---|
| Category | `effect` |
| Trigger | immediately after rolling initiative (new `post_initiative_roll` window, or inline on the effect atom) |
| Target | one willing ally in the same combat |
| Constraint | neither self nor ally has Incapacitated condition |
| Effect | exchange the two creatures' initiative values in the encounter order |

### Minimal schema sketch

```typescript
| {
    readonly kind: "swap_initiative_order";
    readonly target: "one_willing_ally";
    readonly constraint: "neither_incapacitated";
  }
```

The `target: "one_willing_ally"` value could be an alias for `{ mode: "one", willing: true }` if target selection is later typed more finely. The `constraint` field would reference the `Condition` type ("incapacitated") rather than a free string in a production schema.

### Graph subgraph sketch

```
feat_root
  → grant (passive)
    → modify_roll_numeric [+PB on initiative]      ← encoded
    → swap_initiative_order                          ← missing atom
        target: one willing ally
        constraint: neither incapacitated
```

The two grants are independent; either can be exercised without the other.

## Relation to old Alert encoding

`content/alert.dhall` encodes the **SRD 5.1 / old PHB** version: "+5 flat bonus to Initiative" (`fixed_dice { dice: 5, dieSize: 1 }`). That encoding was clean because it omitted both the surprise clause and the swap clause as "DM agenda."

The **2024 SRD 5.2.1** version changes the mechanic:
- Removes the +5 flat bonus.
- Adds Initiative Proficiency (add PB) — fits.
- Adds Initiative Swap — does not fit; needs `swap_initiative_order`.

The old encoding in `content/alert.dhall` should be superseded by `content/feat_alert.json` once the swap atom is resolved.
