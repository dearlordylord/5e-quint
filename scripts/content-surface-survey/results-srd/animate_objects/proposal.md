# Proposal: Animate Objects — surface_widening

## Unit

**Animate Objects** — Level 5 Transmutation spell, `templated_multi_spawn` family.

## What fits

The `templated_multi_spawn` family was designed for this spell and covers it well:

- **Size tier menu**: five tiers (tiny/small/medium weight=1, large weight=2, huge weight=3) with per-tier HP and Slam damage.
- **Concentration 1 minute**, Level 5, 120 ft range — all encoded cleanly.
- **Bonus Action command within 500 ft**, default Dodge behavior → `control.commandCost: bonus_action`, `commandRangeFeet: 500`, `defaultBehavior: dodge_and_avoid`.
- **Shared initiative / immediately after caster** → `control.initiative: shared_with_caster`, `control.turnOrder: immediately_after_caster`.
- **Revert on 0 HP** → `revertOnZeroHp: true`.
- **Upcast slam damage** encoded per tier as `linear_per_level` with `axis: slot`, `startingAtLevel: 5`, `perLevel: { dice: 1 }` — correctly adds 1d4/1d6/1d12 per slot above 5 for each size tier.
- **Large/Huge slam adds spellcasting ability mod** → `DiceExpr.spellcastingMod: true` on those tiers' base expressions.

Typecheck passes, tracer produces a valid graph.

## Gap: TemplatedCapacity requires a specific Ability

### SRD text

> "The maximum number of objects is equal to your spellcasting ability modifier"

### Current schema

```typescript
export type TemplatedCapacity = {
  readonly kind: "caster_ability_modifier";
  readonly ability: Ability;
};
```

`ability` is a required `Ability` enum (`"str" | "dex" | "con" | "int" | "wis" | "cha"`). There is no variant for "whichever ability the class uses for spellcasting."

### Problem

Animate Objects appears on the Bard, Sorcerer, and Wizard spell lists. The spellcasting ability differs by class:
- Bard: CHA
- Sorcerer: CHA
- Wizard: INT

A single hardcoded ability is wrong for at least one primary user. The encoded workaround uses `"cha"` (correct for Bard/Sorcerer, incorrect for Wizard).

### Proposed widening

Add a new variant to `TemplatedCapacity`:

```typescript
export type TemplatedCapacity =
  | {
      readonly kind: "caster_ability_modifier";
      readonly ability: Ability;
    }
  | {
      readonly kind: "spellcasting_ability_modifier";
      // no ability field — resolved at runtime from the caster's class
    };
```

The tracer would render this as `choose (capacity = spellcasting mod)` instead of `choose (capacity = CHA mod)`.

### Scope

This is a narrow, one-variant addition to an existing type. No other type or atom is affected. The rest of the encoding is accurate.
