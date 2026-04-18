# Proposal: Potion of Diminution — surface gaps

## Classification: `atom_widening`

Two distinct gaps prevent honest encoding.

---

## Gap 1 (primary): `modify_size` effect atom

### SRD text

> "you gain the 'reduce' effect of the *Enlarge/Reduce* spell"

The reduce effect (SRD 5.2.1 Spells/Descriptions-E-H#Enlarge/Reduce):

> The target's size decreases by one size category ... The target also has Disadvantage on Strength checks and Strength saving throws. Its weapon attacks also deal 1d4 less damage.

The **size category reduction** is the defining mechanic of the reduce effect. It affects:

- reach / space occupied (rules-mechanical, not just narrative)
- interactions with squeeze rules
- some creature-specific features gated on size

### Why existing atoms don't cover it

- `transform_target` — full polymorph replacing the stat block. Reduce keeps the original stat block; only the size category shifts.
- `apply_condition` — no size-change condition in the 15 SRD conditions.
- `set_ability_score` / `modify_ability_score` — unrelated.
- `modify_speed` — speed is unchanged by the reduce effect.

### Proposed atom

```typescript
| {
    readonly kind: "modify_size";
    readonly delta: -1 | 1;  // -1 = decrease one category, +1 = increase one category
  }
```

`delta: -1` covers the reduce direction (Enlarge/Reduce reduce, Potion of Diminution).  
`delta: +1` covers the enlarge direction (Enlarge/Reduce enlarge, Giant Strength-like effects).

Using an integer delta rather than a direct size enum keeps the atom composable and avoids encoding the size table into the atom itself.

### What would encode cleanly without this atom

The other two mechanics of the reduce effect are expressible today:

```json
{ "kind": "modify_roll_advantage", "mode": "disadvantage", "on": ["saving_throw"], "saveAbilityFilter": ["str"] }
{ "kind": "modify_roll_advantage", "mode": "disadvantage", "on": ["ability_check"] }
{ "kind": "modify_damage_numeric", "delta": { "kind": "fixed_dice", "dice": 1, "dieSize": 4, "sign": "-" } }
```

However, omitting `modify_size` produces a materially false trace — the trace would claim to encode the reduce effect while silently dropping its primary mechanic.

---

## Gap 2 (secondary): `DurationValue.amount` as a dice expression

### SRD text

> "for 1d4 hours (no Concentration required)"

### Current type

```typescript
export type DurationValue = {
  readonly unit: "round" | "minute" | "hour" | "day";
  readonly amount: number;
  ...
};
```

`amount` is a fixed `number`. "1d4 hours" is a random duration resolved at the moment of consumption — not a fixed value.

### Proposed widening

Widen `DurationValue.amount` to `number | DiceExpr` (or introduce a parallel `DurationDiceValue` variant). The dice-amount variant would be interpreted as "roll at activation time; result is the actual duration."

```typescript
export type DurationValue = {
  readonly unit: "round" | "minute" | "hour" | "day";
  readonly amount: number | DiceExpr;
  readonly upcastTiers?: ...;
};
```

This is surface widening on an existing type rather than a new atom.

---

## Encoding notes (for when gaps are filled)

Once both gaps are closed, the Potion of Diminution would encode as:

- `kind: "magic_item"`, no attunement
- `rarity: "rare"`
- `destruction: { kind: "permanent_on_empty" }`
- `mechanics.family: "activation"`
- `activationCost: { kind: "standard_action", action: "utilize" }`
- `resource: { kind: "use_count", cap: { kind: "fixed", uses: 1 } }`
- `resetCadence: { kind: "never" }`
- `duration: { kind: "timed", value: { unit: "hour", amount: { dice: 1, dieSize: 4 } } }` *(after gap 2 filled)*
- `phases: [ { kind: "direct", attachment: { kind: "self" }, effects: [ modify_size(-1), modify_roll_advantage(disadvantage/str saves), modify_roll_advantage(disadvantage/str checks), modify_damage_numeric(-1d4) ] } ]`

The "no Concentration required" clause is already the default for activation-family items — no special encoding needed.
