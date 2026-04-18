# Proposal: Luck Blade (`magic_item_luck_blade`)

**Outcome:** `atom_widening`  
**Confidence:** high

---

## What encodes cleanly

The Luck Blade has a three-part composite structure that fits the existing surface families:

1. **Passive bonuses** (`PassiveMechanics`):
   - `modify_roll_numeric` on `["attack_roll"]`, delta `+1`, `weaponFilter: { kind: "specific_item", itemId: "magic_item_luck_blade" }` — wielded attack bonus.
   - `modify_damage_numeric` delta `+1`, same weapon filter — damage bonus.
   - `modify_roll_numeric` on `["saving_throw"]`, delta `+1` — saving throw bonus while weapon is on person (modeled as always-on during attunement, no finer predicate required).

2. **Wish charges** (`ActivatedAbilityMechanics`):
   - `activationCost: { kind: "standard_action", action: "magic" }` (casting a spell).
   - `resource: { kind: "charge_pool", cap: { kind: "fixed", uses: 3 }, initialCount: { kind: "fixed", expr: { dice: 1, dieSize: 3 } } }`.
   - `resetCadence: { kind: "dawn" }`.
   - Phase: `direct` → `grant_spell_access` with `spellId: "wish"`, `mode: { kind: "charge_cast", baseCharges: 1, perLevelCharges: 0, minLevel: 9, maxLevel: 9 }`.

Both of these would typecheck and trace cleanly.

---

## Blocker 1: `modify_roll_reroll` atom missing from TS surface

### SRD text
> If the weapon is on your person, you can call on its luck (no action required) to reroll one failed D20 Test if you don't have the Incapacitated condition. You must use the second roll. Once used, this property can't be used again until the next dawn.

### Why existing atoms don't cover it

- **`modify_roll_advantage`** grants advantage before a die is rolled (two dice, pick the higher). It fires during roll setup, not after a result is known.
- **`modify_roll_numeric`** adds a signed bonus to the die result. It does not re-execute the roll.
- **`modify_roll_reroll`** is named in the v4 taxonomy (`TAXONOMY_atoms_graph.md §9`) but is absent from `types.ts` `EffectAtom`.

A reroll fires *after* the roll result is known (the test failed), discards the result, and re-rolls the die. This is a distinct phase-of-resolution that neither advantage nor a numeric modifier can represent.

### Proposed widening

Add `modify_roll_reroll` to `EffectAtom` in `types.ts`:

```typescript
| {
    readonly kind: "modify_roll_reroll";
    // Which roll kinds are eligible for the reroll.
    readonly on: ReadonlyNonEmptyArray<RollKind>;
    // Predicate: only reroll if the roll failed (result < DC/target).
    readonly trigger: "on_failure";
    // The wielder must use the new result (forced, not optional keep).
    readonly mustUseNewResult: true;
    // Number of times this reroll may be invoked per reset.
    // Absent = unlimited (rare; Luck Blade is once per dawn via resource).
    readonly count?: number;
  }
```

The Luck Blade encodes the reroll as a use-count activation (1 use, `dawn` reset, `free` cost) rather than baking the count into the atom payload — this matches how other once-per-X features are modeled.

**Note on "D20 Test"**: SRD 5.2.1 "D20 Test" is a superset covering attack rolls, ability checks, and saving throws simultaneously. The existing `RollKind` union covers all three individually, so `on: ["attack_roll", "ability_check", "saving_throw"]` maps the "D20 Test" scope correctly without a new RollKind variant.

---

## Blocker 2: `ItemDestructionPolicy` has no partial-property-loss variant

### SRD text
> The weapon loses this property if it has no charges.

### Why existing variants don't cover it

The `ItemDestructionPolicy` discriminated union currently has:
- `none` — item is never destroyed.
- `last_charge_roll` — probabilistic full-item destruction on last charge.
- `permanent_on_empty` — deterministic full-item destruction when pool is empty.

All three variants act on the **entire item**. The Luck Blade loses only the Wish activation when charges are depleted; the weapon itself (with its passive bonuses and Luck property) persists. The composite parts structure does not expose per-part lifecycle gating.

### Proposed widening

Add a `property_loss_on_empty` variant to `ItemDestructionPolicy`:

```typescript
| {
    readonly kind: "property_loss_on_empty";
    // The item persists; only this charge pool's associated part
    // becomes inert when depleted.
  }
```

Alternatively, this could be modeled as a per-part destruction annotation on `CompositeMagicItemMechanics` parts rather than on the top-level `ItemDestructionPolicy`. The tradeoff: top-level is simpler to trace; per-part is more general (an item could theoretically shed multiple independent charge pools at different times).

---

## Encoding plan (once widenings are in place)

```
CompositeMagicItemMechanics {
  family: "composite",
  parts: [
    PassiveMechanics {         -- +1 attack, +1 damage, +1 saves
      family: "passive",
      grants: [
        modify_roll_numeric (attack_roll, +1, weaponFilter=specific_item),
        modify_damage_numeric (+1, weaponFilter=specific_item),
        modify_roll_numeric (saving_throw, +1),
      ]
    },
    ActivatedAbilityMechanics { -- Luck: reroll one failed D20 Test
      family: "activation",
      activationCost: { kind: "free" },
      resource: { kind: "use_count", cap: { kind: "fixed", uses: 1 } },
      resetCadence: { kind: "dawn" },
      phases: [
        direct → self →
          modify_roll_reroll (on: [attack_roll, ability_check, saving_throw],
                              trigger: "on_failure", mustUseNewResult: true)
      ]
    },
    ActivatedAbilityMechanics { -- Wish: charge-cast
      family: "activation",
      activationCost: { kind: "standard_action", action: "magic" },
      resource: {
        kind: "charge_pool",
        cap: { kind: "fixed", uses: 3 },
        initialCount: { kind: "fixed", expr: { dice: 1, dieSize: 3 } }
      },
      resetCadence: { kind: "dawn" },
      phases: [
        direct → self →
          grant_spell_access (spellId: "wish", mode: charge_cast L9, 1 charge)
      ]
      -- destruction: property_loss_on_empty (once widenings applied)
    }
  ]
}
```
