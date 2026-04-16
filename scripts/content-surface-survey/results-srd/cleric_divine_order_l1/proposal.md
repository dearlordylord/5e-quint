# Proposal: Widenings for Divine Order (cleric L1)

**Outcome:** `structural_widening`  
**Slug:** `cleric_divine_order_l1`  
**Provenance:** SRD 5.2.1 — Classes/Cleric#Level 1: Divine Order

---

## Why the unit does not fit

Divine Order is a **permanent, passive, character-creation choice** feature. The player picks one of two named packages (Protector or Thaumaturge) when they create their cleric; the chosen package modifies the character sheet for the rest of play with no further resource interaction.

The current `ClassFeatureMechanics` type has exactly one family: `ClassFeatureActivationMechanics` (`family: "activation"`). That family mandates:

- `activationCost` — how the feature is triggered each use
- `resource` — a `use_count` pool that depletes
- `resetCadence` — rest type that refills the pool

None of these apply to Divine Order. Forcing it into `activation` would require fabricating a resource that doesn't exist in the rules — a misleading trace.

Additionally, the feature's **choose-one structure** (Protector vs. Thaumaturge) has no representation in any existing `ClassFeatureMechanics` variant.

---

## Proposed widenings

### 1. New family: `passive_grant` (structural)

A `passive_grant` family for class features that grant permanent character-sheet modifications at acquisition time, with no activation cost, no use-count resource, and no rest reset.

Minimum shape:

```typescript
export type ClassFeaturePassiveGrantMechanics = {
  readonly family: "passive_grant";
  readonly effect: ClassFeatureEffect;  // widened — see below
};
```

Pressure cases beyond Divine Order: Unarmored Defense (Barbarian L1), Spellcasting (many classes), Fighting Style (Fighter L1), Weapon Mastery (multiple classes L1), Expertise (Rogue L1), Druidic (Druid L1), Thieves' Cant (Rogue L1). This is a high-frequency family.

### 2. New surface shape: `choose_one_package` within passive_grant (structural)

Divine Order requires the character to pick one of N named option bundles once, permanently. The v4 taxonomy has a `choose` procedure atom but it is not surfaced in `ClassFeatureMechanics`.

Minimum extension:

```typescript
export type NamedPackage = {
  readonly name: string;
  readonly effect: ClassFeatureEffect;  // or ReadonlyArray<ClassFeatureEffect>
};

export type ClassFeaturePassiveGrantMechanics =
  | { readonly family: "passive_grant"; readonly effect: ClassFeatureEffect }
  | { readonly family: "passive_grant_choose_one"; readonly options: ReadonlyArray<NamedPackage> };
```

### 3. New `ClassFeatureEffect` variant: `grant_proficiency` (surface widening)

The v4 atom `grant_proficiency` exists but is absent from `ClassFeatureEffect`. Both Protector (Martial weapons + Heavy armor) and many other L1 class features require it.

```typescript
export type GrantProficiencyEffect = {
  readonly kind: "grant_proficiency";
  readonly proficiencies: ReadonlyArray<{
    readonly category: "weapon" | "armor" | "skill" | "tool" | "saving_throw";
    readonly scope: string;  // "martial_weapons", "heavy_armor", etc.
  }>;
};
```

### 4. New `ClassFeatureEffect` variant: `grant_spell_access` (surface widening)

The v4 atom `grant_spell_access` exists but is absent from `ClassFeatureEffect`. Thaumaturge's extra cantrip requires it. This is also needed for Spellcasting features, Eldritch Invocations, and similar.

```typescript
export type GrantSpellAccessEffect = {
  readonly kind: "grant_spell_access";
  readonly count: number;
  readonly restriction: "cantrip" | "spell" | "any";
  readonly spellList: string;  // e.g. "cleric"
};
```

### 5. New `RollKind` + `ClassFeatureEffect` shape: ability check modifier (surface widening)

Thaumaturge grants: *bonus to Intelligence (Arcana or Religion) checks equal to Wisdom modifier (min +1)*.

Two gaps compound here:
- `RollKind` is `"attack_roll" | "saving_throw"` — no `"ability_check"` variant.
- `ClassFeatureEffect` has no roll-modifier effect shape at all.
- The source of the bonus is a derived stat (Wisdom modifier), not a fixed number — the current `DiceDelta` shape is for dice expressions, not ability-score references.

Minimum widening:

```typescript
export type AbilityRef = { readonly kind: "ability_modifier"; readonly ability: Ability; readonly minimum?: number };
export type BonusSource = number | AbilityRef;

export type ModifyRollNumericEffect = {
  readonly kind: "modify_roll_numeric";
  readonly on: ReadonlyArray<"attack_roll" | "saving_throw" | "ability_check">;
  readonly skillFilter?: ReadonlyArray<string>;  // e.g. ["arcana", "religion"]
  readonly bonus: BonusSource;
};
```

---

## Summary table

| # | Kind | Name | Blocker? |
|---|------|------|----------|
| 1 | `new_subgraph` | `passive_grant` family | Yes — unit cannot be expressed at all without it |
| 2 | `new_subgraph` | `choose_one_package` surface shape | Yes — needed to distinguish Protector vs Thaumaturge |
| 3 | `new_variant` | `grant_proficiency` in ClassFeatureEffect | Yes — needed for Protector |
| 4 | `new_variant` | `grant_spell_access` in ClassFeatureEffect | Yes — needed for Thaumaturge cantrip |
| 5 | `new_variant` | ability-check roll modifier + BonusSource | Yes — needed for Thaumaturge Wis-mod bonus |

All five are independently required. Widening 1 unblocks the family; widening 2 handles choice structure; widenings 3–5 cover the specific effect shapes needed by each option.
