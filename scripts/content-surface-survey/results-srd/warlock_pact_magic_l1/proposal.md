# Proposal: Widening for `warlock_pact_magic_l1`

## Outcome: `structural_widening`

## Why the unit cannot be encoded honestly

Pact Magic is a spellcasting framework grant, not an activation feature. The current `ClassFeatureMechanics` surface has only one family — `activation` — which requires:

- `activationCost: ClassFeatureActivationCost`
- `resource: UseCountResource`
- `resetCadence: RestResetCadence`
- `effect: ClassFeatureEffect` (`grant_extra_action | heal_hp`)

Pact Magic's core mechanics are:

| Mechanic | Current surface status |
|---|---|
| Grant cantrip access (2 at L1, scales to 4) | No `grant_spell_access` in `ClassFeatureEffect` |
| Grant prepared spell list (2 at L1, scales by class level) | No spell-list grant in `ClassFeatureEffect` |
| Grant pact magic slot pool (count + level both scale by class level, all slots same level) | No slot pool resource; `UseCountResource` only scales one scalar |
| Slot reset on Short or Long Rest | `short_or_long_rest` cadence exists, but applies to the slot pool not a use-count |
| Spellcasting ability = Charisma | No spellcasting-ability field anywhere in the surface |

No honest coercion exists. `grant_extra_action` and `heal_hp` are both wrong. Encoding this as `activation { effect: grant_extra_action }` would produce a false trace.

## Proposed widenings

### 1. New family: `spellcasting_grant` for `ClassFeatureMechanics`

A new mechanics family distinct from `activation`. It would describe:

- Cantrip grant: known count (threshold_tiers on class axis)
- Spell list: prepared count (threshold_tiers on class axis), maximum spell level (threshold_tiers on class axis)
- Slot pool: see below
- Spellcasting ability: `Ability`
- Spellcasting focus: (optional — may stay prose-only)

### 2. New resource shape: `PactMagicSlotPool` (or parameterized `SpellSlotPool`)

The current `UseCountResource` is a single-scalar quota. Pact Magic slots have two co-scaling dimensions:

```
warlock level → (slot count, slot level)
L1:  (1, 1)
L2:  (2, 1)
L3:  (2, 2)
L4:  (2, 2)
L5:  (3, 3)
...
```

This requires a resource shape like:

```typescript
type PactMagicSlotPool = {
  readonly kind: "pact_magic_slot_pool";
  readonly slots: ThresholdTiers<{ count: number; level: SpellLevel }>;
  readonly resetCadence: RestResetCadence; // short_or_long_rest for Pact Magic
};
```

Standard spellcasting classes (cleric, wizard, etc.) use a different table (slots per level, not all same level) and would need a separate `PreparedSpellcasterSlotPool` shape.

### 3. New effect variant: `grant_spell_access`

For `ClassFeatureEffect` — represents granting access to a spell list with cantrip and prepared spell counts. Example:

```typescript
type GrantSpellAccessEffect = {
  readonly kind: "grant_spell_access";
  readonly spellList: ClassName; // "warlock"
  readonly cantripCount: ThresholdTiers<number>; // by class level
  readonly preparedCount: ThresholdTiers<number>; // by class level
  readonly spellcastingAbility: Ability; // "cha"
};
```

## Scope note

This gap affects **all spellcasting classes**. The survey list includes:

- `bard_spellcasting_l1`, `cleric_spellcasting_l1`, `druid_spellcasting_l1`
- `paladin_spellcasting_l1`, `ranger_spellcasting_l1`, `sorcerer_spellcasting_l1`
- `warlock_pact_magic_l1` (this unit), `wizard_spellcasting_l1`

A `spellcasting_grant` family would close this gap for all of them. Pact Magic adds one extra dimension (the unified-level slot pool vs. per-level slot tables used by other casters), but the family shape would accommodate both with a variant on the slot pool resource.

## Atoms that would be emitted (if encoded)

Using existing v4 vocabulary:

- `class_feature_root`
- `activate` (or new `grant` procedure)
- `spell_slot` (resource, with new pool shape)
- `rest_window` (short + long)
- `grant_spell_access` (new effect atom)
- `scale_die_count` or `scale_numeric_bonus` (for cantrip/spell count scaling)

Relations: `roots`, `grants`, `consumes`, `persists_until`, `modifies`
