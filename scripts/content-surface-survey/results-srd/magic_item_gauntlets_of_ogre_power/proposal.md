# Proposal: Gauntlets of Ogre Power

**Outcome:** `structural_widening`

## Why this unit cannot be encoded

The surface type system (`src/surface/types.ts`) defines:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord` variant. The taxonomy v4 lists `magic_item_root` as a valid source atom and `attune`/`attunement_slot` as procedure/resource atoms, but these have never been promoted to authored TypeScript surface types. No mechanics family for magic items exists.

## Required widenings

### 1. `MagicItemRecord` top-level kind (structural)

A new record type is needed:

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;
};
```

`UnitRecord` must be extended to include `MagicItemRecord`.

A `MagicItemMechanics` family hierarchy analogous to `SpellMechanics` / `ClassFeatureMechanics` is needed. At minimum:

- `attunement_passive` family — passive effect that applies while the item is attuned and worn. No activation, no quota consumed per use.

### 2. `modify_ability_score` effect atom (atom_widening)

The gauntlet sets Strength to 19. This is not expressible as any existing effect:

- `modify_roll_numeric` adjusts a die roll in-flight (e.g. Bless's +1d4).
- There is no atom for "set ability score to fixed value" or "floor ability score at N."

The taxonomy §12 already flags `modify_ability_score as a runtime effect` as a known weak spot deferred from v4. This item is the first direct encoding pressure to promote it.

Proposed shape:

```typescript
export type ModifyAbilityScoreEffect = {
  readonly kind: "modify_ability_score";
  readonly ability: Ability;
  readonly mode: "set_floor";   // "set_floor": score becomes max(current, value)
  readonly value: number;
};
```

`mode: "set_floor"` is accurate: the gauntlet's text "no effect if your Strength is 19 or higher" means the score is effectively `max(natural_str, 19)`, not an unconditional assignment.

### 3. Conditional suppression on attunement (surface variant)

The phrase "no effect if your Strength is 19 or higher without them" is a suppression condition evaluated against the character's base ability score (before item bonuses). This is structurally different from a simple passive rider and may require an `AttuneCondition` or `EffectGuard` variant to be expressible without embedding this logic as free text:

```typescript
export type AbilityScoreGuard = {
  readonly kind: "ability_score_below";
  readonly ability: Ability;
  readonly threshold: number;
};
```

This guard could sit on a passive magic item mechanic to express "only applies if natural score < threshold."

## Comparable items in the SRD

The following SRD magic items share the same `modify_ability_score` mechanic and would all benefit from the same widening:

- Headband of Intellect (INT → 19)
- Amulet of Health (CON → 19)
- Gauntlets of Ogre Power (STR → 19)
- Belt of Giant Strength variants (STR → 21/23/25/27/29)
- Ioun Stone of Mastery (various)

All require the same family structure + `modify_ability_score` atom.

## Classification

`structural_widening` — primary gap is the missing `magic_item` kind in `UnitRecord`. Secondary gap is the `modify_ability_score` effect atom, which the taxonomy already identifies as deferred.
