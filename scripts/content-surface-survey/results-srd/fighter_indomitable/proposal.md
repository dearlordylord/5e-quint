# Proposal: Surface Widenings for Fighter — Indomitable

## Unit

- **Name**: Indomitable
- **Kind**: class_feature / fighter / L9
- **Outcome**: `surface_widening`

## SRD Text

> If you fail a saving throw, you can reroll it with a bonus equal to your Fighter level. You must use the new roll, and you can't use this feature again until you finish a Long Rest.
>
> You can use this feature twice before a Long Rest starting at level 13 and three times before a Long Rest starting at level 17.

---

## What fits cleanly

| Mechanic | Surface shape | Status |
|---|---|---|
| Use count (1@L9, 2@L13, 3@L17) | `ThresholdTiers<number>` with `axis="class"` | ✅ |
| Long rest reset | `RestResetCadence { kind: "long_rest" }` | ✅ |
| Activation cost family (reaction) | `ClassFeatureActivationCost { kind: "reaction" }` | ✅ |
| Mechanics family | `ActivatedAbilityMechanics` (activation) | ✅ |

---

## Gap 1 — `modify_roll_reroll` effect atom missing from TS surface

**Status**: `surface_widening` — atom is in v4 taxonomy but absent from `types.ts`.

The v4 Effect Atom `modify_roll_reroll` (TAXONOMY_atoms_graph.md §9) is the correct atom here. It is mechanically distinct from:

- `modify_roll_advantage` — rolls two dice simultaneously before the result is known; Indomitable fires *after* the failure is established.
- `modify_roll_numeric` — adds a delta to an existing roll value; does not replace the roll.

### Proposed shape

```typescript
| {
    readonly kind: "modify_roll_reroll";
    readonly on: ReadonlyNonEmptyArray<RollKind>;
    readonly delta?: DiceDelta;   // optional bonus applied to the reroll
    readonly keepNew: true;       // "must use the new roll" — always true in SRD; field makes it explicit
  }
```

`delta` carries the bonus to the reroll. When absent, the reroll is unmodified (standard Advantage-lite reroll pattern). Here it carries the Fighter-level bonus (see Gap 3).

---

## Gap 2 — `ReactionTrigger` has no general "fail a saving throw" variant

**Status**: `surface_widening` — new variant of existing `ReactionTrigger` type.

`spell_save_outcome` is described as a "Post-save spell reflection / conversion window" narrowed to saves caused by spells. Indomitable fires on **any** saving throw (a dragon's breath weapon Con save, a trap Dex save, a spell Wis save — all qualify).

### Proposed variant

```typescript
| {
    readonly kind: "saving_throw_outcome";
    readonly outcome: "failure";
    // Optional narrowing if future units need ability/source scoping:
    // readonly abilityFilter?: ReadonlyNonEmptyArray<Ability>;
  }
```

This fires in the same window as `spell_save_outcome` but without a spell-source constraint.

---

## Gap 3 — `DiceDelta` has no `class_level` variant

**Status**: `surface_widening` — new variant of existing `DiceDelta` type.

Current DiceDelta variants: `fixed_dice`, `proficiency_bonus`, `ability_modifier`, `magic_item_rarity_bonus`. The bonus here is "equal to your Fighter level" — a raw class level, not PB and not an ability modifier.

### Proposed variant

```typescript
| {
    readonly kind: "class_level";
    readonly className: ClassName;
    readonly sign: "+" | "-";
  }
```

Resolved at runtime as the character's current level in the named class.

---

## How the full encoding would look (when surface is widened)

```
family: "activation"
activationCost: { kind: "reaction", trigger: { kind: "saving_throw_outcome", outcome: "failure" } }
resource: {
  kind: "use_count",
  cap: {
    kind: "threshold_tiers",
    axis: "class",
    base: 1,
    tiers: [
      { atLevel: 13, value: 2 },
      { atLevel: 17, value: 3 }
    ]
  }
}
resetCadence: { kind: "long_rest" }
phases: [
  {
    kind: "direct",
    attachment: { kind: "self" },
    effects: [
      {
        kind: "modify_roll_reroll",
        on: ["saving_throw"],
        delta: { kind: "class_level", className: "fighter", sign: "+" },
        keepNew: true
      }
    ]
  }
]
```

All three widenings are variants of existing surface types (no new v4 atom family; `modify_roll_reroll` is already in the v4 taxonomy). The structural skeleton (activation family, threshold-tiered use count, long-rest reset) fits entirely with today's surface.
