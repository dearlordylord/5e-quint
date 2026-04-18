# Proposal: `cleric_divine_order_l1` — structural_widening

## SRD text

> You have dedicated yourself to one of the following sacred roles of your choice.
>
> **Protector.** Trained for battle, you gain proficiency with Martial weapons and training with Heavy armor.
>
> **Thaumaturge.** You know one extra cantrip from the Cleric spell list. In addition, your mystical connection to the divine gives you a bonus to your Intelligence (Arcana or Religion) checks. The bonus equals your Wisdom modifier (minimum of +1).

## What fits without changes

**Protector** encodes cleanly as `PassiveMechanics`:

```
grants: [
  { kind: "grant_proficiency", proficiency: { kind: "fixed",
      proficiencies: [
        { kind: "weapon_category", category: "martial" },
        { kind: "armor_category", category: "heavy" }
      ]
  }}
]
```

**Thaumaturge — Arcana/Religion bonus** encodes cleanly as:
```
{ kind: "modify_roll_numeric",
  on: ["ability_check"],
  skillFilter: { kind: "fixed", skills: ["arcana", "religion"] },
  delta: { kind: "ability_modifier", ability: "wis", sign: "+" }
}
```
(The `minimum of +1` floor is not representable — see Gap 3.)

## Gaps

### Gap 1 (structural — dominant): No build-time exclusive-OR between passive grant bundles

Divine Order requires the character to permanently commit to **one of two** named suborders at level 1. Once chosen, only that suborder's grants apply for the character's entire career.

No existing `ClassFeatureMechanics` family can express this:

| Family | Behavior |
|---|---|
| `PassiveMechanics` | Flat `grants[]` — all grants apply unconditionally |
| `ActivatedAbilityMechanics` | Use-count activation; wrong economy |
| `CompositeClassFeatureMechanics` | All `parts[]` apply simultaneously |

`ProficiencyGrant.choice` selects among proficiency *subjects*, not between complete feature packages.

**Proposed widening**: A new `suborder_choice` family for `ClassFeatureMechanics`:

```typescript
export type SuborderChoiceMechanics = {
  readonly family: "suborder_choice";
  // The choice is permanent and made at character creation.
  // Exactly one option is selected; its grants become the character's
  // passive for the rest of their career.
  readonly options: ReadonlyNonEmptyArray<{
    readonly id: string;
    readonly displayName: string;
    readonly mechanics: PassiveMechanics | ActivatedAbilityMechanics;
  }>;
};
```

This pattern recurs across multiple SRD classes (Druid Circle, Paladin Oath, Ranger Archetype, Sorcerer Origin, etc.) at levels other than 1, but Divine Order is the first L1 in-class suborder that shows up as a monolithic feature rather than a separate "Subclass" choice. The v4 taxonomy does not yet include a `suborder_choice` subgraph.

### Gap 2 (surface): `grant_spell_access` requires a fixed `spellId`

The Thaumaturge grants "one extra cantrip from the Cleric spell list" — a player-chosen cantrip from an open category, not a named spell. `grant_spell_access.spellId: string` requires a specific identifier.

**Proposed widening**: An open-list variant on `grant_spell_access` (parallel to `ProficiencyGrant.choice`):

```typescript
// New variant alongside the existing specific-spell form:
| {
    readonly kind: "grant_spell_access";
    readonly spellList: "cleric" | "wizard" | ...;  // or class-name union
    readonly spellLevel: SpellLevel;                  // 0 = cantrip
    readonly mode: SpellAccessMode;
    readonly count?: number;                           // default 1
  }
```

Alternatively, a `spellId` could be typed as `string | { readonly kind: "choice_from_list"; readonly className: ClassName; readonly maxLevel: SpellLevel }`.

### Gap 3 (surface): `ability_modifier` DiceDelta has no `minimum` field

The Thaumaturge bonus is "Wisdom modifier (minimum of +1)". The `ability_modifier` DiceDelta variant carries no floor constraint:

```typescript
| {
    readonly kind: "ability_modifier";
    readonly ability: Ability;
    readonly sign: "+" | "-";
    // missing: readonly minimum?: number;
  }
```

**Proposed widening**: Add optional `minimum?: number` to the `ability_modifier` variant. This covers "min +1" floors on ability-derived bonuses without requiring a separate delta kind.

## Why no encoding was produced

The dominant gap (Gap 1) is structural: there is no `ClassFeatureMechanics` family that can honestly represent a permanent build-time OR between two different passive grant bundles within a single authored unit. Encoding only one suborder would produce a misleading record; encoding both in `CompositeClassFeatureMechanics` would imply both apply simultaneously, which contradicts RAW.

A placeholder JSON was not authored because a dishonest trace is worse than no trace.
