# Proposal: Bardic Inspiration widening gaps

**Unit:** Bardic Inspiration (bard L1)  
**Outcome:** `atom_widening`

## Summary

Bardic Inspiration has three distinct widenings. The first two are blockers that prevent honest encoding; the third is a secondary surface gap.

---

## 1. Missing atom: `grant_die_token`

**Gap:** No v4 atom represents "grant a held die to a third-party creature."

The bard's Bonus Action hands a Bardic Inspiration die to another creature. That creature then *owns* the die — it is not an ongoing effect that the caster maintains, not a buff that attaches to the target from the caster's scope, and not a spell slot. It is a discrete token that:

- Belongs to the recipient (not the caster)
- Persists for up to 1 hour
- Is a specific die size (d6 at level 1, scaling upward)
- Is consumed when rolled

`ClassFeatureEffect` currently holds only `GrantExtraActionEffect` and `HealHpEffect`. Neither can represent this grant. The closest v4 atom in the taxonomy, `mark_target`, is directional from the caster and not a held die resource. There is no "hand off a single-use die token" atom in v4.

**Proposed atom:** `grant_die_token`

Minimal shape:
```
{
  kind: "grant_die_token"
  dieAmount: DiceAmount        // size and scaling of the die
  expiresAfter: DurationValue  // 1 hour
  maxPerHolder: number         // 1 — "A creature can have only one"
  target: "target_creature"
}
```

---

## 2. Missing subgraph: die-token activation (two-actor post-roll)

**Gap:** No subgraph models a held-token reactive use by the *recipient* on their own rolls.

Once the token is held, the recipient activates it on their own turn/resolution:

> "Once within the next hour when the creature fails a D20 Test, the creature can roll the Bardic Inspiration die and add the number rolled to the d20."

This requires a subgraph rooted on the *holder*, not the caster:

```
die_token → [holder's post_roll_window: D20 Test failed]
           → holder chooses to expend token
           → modify_roll_numeric (add die result to d20)
           → expire (token consumed)
```

v4 has `post_roll_window` and `modify_roll_numeric`, but no way to express:
- A window owned by a creature *other* than the feature's activator
- A token-gated activation (the holder decides; the token is consumed on use)
- Cross-actor resource ownership (bard granted it, holder uses it)

This two-actor pattern is fundamentally different from all existing subgraphs (Bless's caster-side `roll_modifier`, Halfling Luck's self-owned reroll, etc.).

---

## 3. Missing surface variant: `UseCountCap: ability_score_derived`

**Gap:** Uses = Charisma modifier (minimum 1). `UseCountCap` only supports `fixed` and `ThresholdTiers<number>`.

The ability-score-derived count is a per-character value that changes with character build. It cannot be expressed as a fixed integer without hardcoding, and there is no class-level threshold schedule involved.

**Proposed variant:**
```typescript
| {
    readonly kind: "ability_score_derived";
    readonly ability: Ability;
    readonly minimum: number;
  }
```

This same pattern will likely recur for other features (Paladin's Lay On Hands pool scales with paladin level, Monk Focus points scale, etc.) so widening `UseCountCap` here pays forward.

---

## What fits without widening

- **Activation cost:** `bonus_action` ✓
- **Reset cadence:** `long_rest` ✓
- **Die-size scaling** (d6→d8→d10→d12 at bard levels 5/10/15): expressible as `ThresholdTiers<DiceExprDelta>` with `dieSize` overrides → `scale_die_size` atom. This part has no gap.

---

## Encoding path once gaps are filled

With these three widenings in place, the unit would encode as `class_feature / activation` with:

```
activationCost: { kind: "bonus_action" }
resource: {
  kind: "use_count",
  cap: { kind: "ability_score_derived", ability: "cha", minimum: 1 }
}
resetCadence: { kind: "long_rest" }
effect: {
  kind: "grant_die_token",
  dieAmount: {
    kind: "threshold_tiers",
    axis: "class",
    base: { dice: 1, dieSize: 6 },
    tiers: [
      { atLevel: 5,  override: { dieSize: 8  } },
      { atLevel: 10, override: { dieSize: 10 } },
      { atLevel: 15, override: { dieSize: 12 } }
    ]
  },
  expiresAfter: { unit: "hour", amount: 1 },
  maxPerHolder: 1,
  target: "target_creature"
}
```

The recipient-side activation subgraph would be a separate authored node rooted on the token itself (analogous to how the mark-transfer subgraph is attached to the `mark` attachment).
