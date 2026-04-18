# Proposal: Druid Elemental Fury L7

**Outcome**: `structural_widening`

## SRD Text

> **Potent Spellcasting.** Add your Wisdom modifier to the damage you deal with any Druid cantrip.
>
> **Primal Strike.** Once on each of your turns when you hit a creature with an attack roll using a weapon or a Beast form's attack in Wild Shape, you can cause the target to take an extra 1d8 Cold, Fire, Lightning, or Thunder damage (choose when you hit).

## Why It Does Not Fit

Elemental Fury has three independent encoding gaps:

### Gap 1 — Build-time one-of-N option choice (structural)

The feature grants exactly **one** of two mechanically distinct packages chosen at character level-up. The existing surface has no shape for this:

- `composite` grants **all** parts simultaneously — wrong semantics.
- `CastTimeEffectModeChoice` is cast-time — wrong scope.
- `grant_feat` is a feat-level pick — wrong abstraction level.

Many SRD class features use this "choose one of the following" pattern (Fighting Styles on some classes, Elemental Fury, Blessed Strikes, etc.). A shared `build_time_option_choice` wrapper over `ClassFeatureComponentMechanics` alternatives is needed.

### Gap 2 — `on_hit_trigger` not in `ClassFeatureMechanics` (structural)

Primal Strike's mechanic is precisely the `on_hit_trigger` / `MasteryMechanics` family:

- Trigger: weapon hit or Wild Shape (Beast form) attack hit
- Effect: `damage` (1d8, player-chosen type from {cold, fire, lightning, thunder})
- Usage limit: `once_per_turn`

`OnHitTriggerMechanics` exists and `MagicItemComponentMechanics` admits it, but `ClassFeatureComponentMechanics` is restricted to `PassiveMechanics | ActivatedAbilityMechanics`. Extending `ClassFeatureComponentMechanics` to include `OnHitTriggerMechanics` would unblock Primal Strike and likely other class features with the same pattern (Divine Strike for Clerics, Sneak Attack for Rogues when modeled as on-hit).

Additionally, the attack filter for Primal Strike spans both **weapon attacks** and **Wild Shape Beast form attacks**. The current `MasteryTrigger` (`weapon_hit` | `weapon_hit_melee_only`) has no way to express "weapon or Beast form natural weapon". A new variant such as `weapon_or_natural_weapon_hit` would be needed.

### Gap 3 — No cantrip/spell-class filter on `modify_damage_numeric` (surface)

Potent Spellcasting adds Wis modifier to damage "with any Druid cantrip". The `modify_damage_numeric` atom currently supports only `weaponFilter?: WeaponFilter` (weapon_category / weapon_property / specific_item). There is no filter for spell level (cantrip = level 0) or class origin.

A `spellFilter` variant such as `{ kind: "cantrip" }` or `{ kind: "class_cantrip", className: "druid" }` would allow honest encoding without overstating the bonus (e.g., incorrectly applying it to non-cantrip spells or non-Druid cantrips taken through multiclassing).

### Gap 4 — Hit-time damage type choice labeling (surface, minor)

The `CastTimeChoice<DamageType>` shape technically has the right structure for "choose from {cold, fire, lightning, thunder} when you hit", but its `kind: "choice"` label reads as cast-time. The semantics are hit-time. This may be acceptable with a loose reading, or may need a parallel `hit_time_choice` variant for clarity. This is minor relative to Gaps 1–3.

## Proposed Surface Changes

### 1. `build_time_option_choice` for `ClassFeatureMechanics`

```typescript
export type ClassFeatureOptionChoiceMechanics = {
  readonly family: "build_time_option_choice";
  readonly label: string;
  readonly options: ReadonlyNonEmptyArray<{
    readonly id: string;
    readonly displayName: string;
    readonly mechanics: ClassFeatureComponentMechanics;
  }>;
};

export type ClassFeatureMechanics =
  | ClassFeatureComponentMechanics
  | CompositeClassFeatureMechanics
  | ClassFeatureOptionChoiceMechanics;  // new
```

### 2. `on_hit_trigger` in `ClassFeatureComponentMechanics`

```typescript
export type ClassFeatureComponentMechanics =
  | PassiveMechanics
  | ActivatedAbilityMechanics
  | OnHitTriggerMechanics;  // admit existing type
```

And extend `MasteryTrigger`:
```typescript
export type MasteryTrigger =
  | { readonly kind: "weapon_hit" }
  | { readonly kind: "weapon_hit_melee_only" }
  | { readonly kind: "weapon_or_natural_weapon_hit" };  // new — covers Wild Shape Beast attacks
```

### 3. `spellFilter` on `modify_damage_numeric`

```typescript
export type SpellFilter =
  | { readonly kind: "cantrip" }
  | { readonly kind: "class_cantrip"; readonly className: ClassName };

// In EffectAtom:
| {
    readonly kind: "modify_damage_numeric";
    readonly delta: DiceDelta;
    readonly weaponFilter?: WeaponFilter;
    readonly spellFilter?: SpellFilter;  // new
  }
```

## Intended Encoding (post-widening)

```
ClassFeatureRecord (druid_elemental_fury_l7)
  mechanics: build_time_option_choice
    option A: "Potent Spellcasting"
      mechanics: passive
        grants:
          - modify_damage_numeric
              delta: { kind: "ability_modifier", ability: "wis", sign: "+" }
              spellFilter: { kind: "class_cantrip", className: "druid" }

    option B: "Primal Strike"
      mechanics: on_hit_trigger
        trigger: { kind: "weapon_or_natural_weapon_hit" }
        optional: true
        usageLimit: { kind: "once_per_turn" }
        effect:
          save_gate OR direct damage:
            damage
              damageType: { kind: "choice", label: "elemental type", options: ["cold","fire","lightning","thunder"] }
              amount: { kind: "fixed", expr: { dice: 1, dieSize: 8 } }
```
