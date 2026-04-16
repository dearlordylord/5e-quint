# Proposal: Widenings for Elemental Fury (druid L7)

## Summary

**Outcome:** `structural_widening`

Elemental Fury grants a level-7 druid one of two permanent sub-features. Neither sub-feature can be honestly encoded in the current surface. Three structural gaps and two surface-level variant gaps were identified.

---

## Outer structure gap: choose-one-of sub-features

The feature reads: *"You gain one of the following options of your choice."*

`ClassFeatureMechanics` has a single `family` discriminant. There is no way to express "pick one of N mechanics payloads at level-up." This is a character-creation-time choice, not a runtime activation. The surface needs either:

- A `choose_one_of` wrapper at the `ClassFeatureRecord` level, or
- Separate sibling `ClassFeatureRecord`s under a shared parent feature with a `choice_group` link.

Until this is resolved, Elemental Fury cannot be encoded as one record — it would need to split into two records (one per option) with a linking mechanism the surface does not currently have.

---

## Gap 1 — Missing `passive` class feature family

**Unit:** Potent Spellcasting  
**Text:** *"Add your Wisdom modifier to the damage you deal with any Druid cantrip."*

This sub-feature is permanently active: no activation cost, no use count, no rest reset. The only `ClassFeatureMechanics` family is `activation`, which requires:

```typescript
{
  activationCost: ClassFeatureActivationCost;
  resource: UseCountResource;
  resetCadence: RestResetCadence;
  effect: ClassFeatureEffect;
}
```

None of these fields have any counterpart in the rule text. Encoding this as `activationCost: { kind: "free" }` with a fake `use_count` and `resetCadence` would fabricate state that the rule does not have.

**Proposed widening:** A new `passive` family for `ClassFeatureMechanics`:

```typescript
export type ClassFeaturePassiveMechanics = {
  readonly family: "passive";
  readonly effect: ClassFeaturePassiveEffect;
};
```

This parallels the existing `activation` family but with no resource/reset machinery.

---

## Gap 2 — Missing `ability_score_damage_bonus` effect type

**Unit:** Potent Spellcasting  
**Text:** *"Add your Wisdom modifier to the damage you deal with any Druid cantrip."*

The needed effect is: "add a specific ability modifier (Wis) to damage from a filtered class of actions (Druid cantrips)."

`ClassFeatureEffect` currently only includes `GrantExtraActionEffect | HealHpEffect`. `modify_roll_numeric` exists as an ongoing operation for spells (via `RollModifierOperation`), but:

1. That type uses a fixed `DiceDelta`, not an ability modifier value.
2. There is no scope filter for "Druid cantrips" on any existing operation type.

**Proposed widening:** New `ClassFeaturePassiveEffect` variant:

```typescript
export type ModifyActionDamageEffect = {
  readonly kind: "modify_action_damage";
  readonly bonus: { readonly kind: "ability_modifier"; readonly ability: Ability };
  readonly scope: { readonly kind: "cantrip"; readonly className: ClassName };
};
```

This represents "permanently add [ability] modifier to damage from [className] cantrips."

---

## Gap 3 — Missing `on_hit_trigger` family for class features

**Unit:** Primal Strike  
**Text:** *"Once on each of your turns when you hit a creature with an attack roll using a weapon or a Beast form's attack in Wild Shape, you can cause the target to take an extra 1d8 Cold, Fire, Lightning, or Thunder damage (choose when you hit)."*

This is structurally identical to mastery `OnHitTriggerMechanics` — an on-hit damage rider with a once-per-turn usage limit — but it belongs to a class feature record, not a mastery record. The mastery family cannot be used here because:

- `MasteryRecord` represents a weapon mastery property, not a class feature.
- Using `kind: "mastery"` would misrepresent the provenance (this is a Druid class feature, not a weapon mastery).

**Proposed widening:** Extend `ClassFeatureMechanics` with an `on_hit_trigger` family:

```typescript
export type ClassFeatureOnHitTriggerMechanics = {
  readonly family: "on_hit_trigger";
  readonly trigger: ClassFeatureTrigger;
  readonly optional: boolean;
  readonly effect: OnHitRiderEffect;
  readonly usageLimit?: UsageLimit;
};
```

Where `ClassFeatureTrigger` handles the weapon-or-Wild-Shape case (see Gap 5 below).

---

## Gap 4 — Missing runtime damage-type choice variant

**Unit:** Primal Strike  
**Text:** *"…extra 1d8 Cold, Fire, Lightning, or Thunder damage (choose when you hit)."*

`DamageEffect.damageType` is `DamageType`, a single fixed literal. There is no "player selects from a closed set at resolution time" variant. This is a different concept from the damage type being chosen at cast/feature-acquisition time.

**Proposed widening:** New `DamageType` surface shape for deferred choice:

```typescript
export type DamageTypeChoice =
  | DamageType  // fixed
  | { readonly kind: "choose_at_activation"; readonly options: ReadonlyArray<DamageType> };
```

Used in `DamageEffect` (and potentially `DamageOnHitOperation`) to mark that the type is resolved at the moment the effect fires.

---

## Gap 5 — Missing trigger variant for Wild Shape Beast-form attacks

**Unit:** Primal Strike  
**Text:** *"…using a weapon or a Beast form's attack in Wild Shape…"*

The existing `MasteryTrigger` has:
- `weapon_hit`
- `weapon_hit_melee_only`

Neither covers natural attacks made while in Wild Shape Beast form. A Beast form's attack is not a weapon attack. This distinction matters because Wild Shape Beast-form attacks cannot have weapon masteries applied to them.

**Proposed widening:** New trigger variant (applicable to both mastery and the new class feature `on_hit_trigger` family):

```typescript
| { readonly kind: "weapon_or_wild_shape_attack" }
```

Or more compositionally:

```typescript
| { readonly kind: "any_of"; readonly triggers: ReadonlyArray<MasteryTrigger> }
```

Combined with a new base trigger `wild_shape_beast_attack`.

---

## Encoding plan (once widenings land)

If all five widenings are accepted, Elemental Fury would encode as two sibling `ClassFeatureRecord`s under a shared `choice_group`:

**Option A — Potent Spellcasting:**
```dhall
{ family = "passive"
, effect =
    { kind = "modify_action_damage"
    , bonus = { kind = "ability_modifier", ability = "wis" }
    , scope = { kind = "cantrip", className = "druid" }
    }
}
```

**Option B — Primal Strike:**
```dhall
{ family = "on_hit_trigger"
, trigger = { kind = "weapon_or_wild_shape_attack" }
, optional = True
, effect =
    { kind = "damage"
    , damageType = { kind = "choose_at_activation", options = [ "cold", "fire", "lightning", "thunder" ] }
    , amount = { kind = "fixed", expr = { dice = 1, dieSize = 8 } }
    }
, usageLimit = { kind = "once_per_turn" }
}
```

---

## Atom inventory impact

| Gap | New atom required? | v4 candidate |
|---|---|---|
| `passive` family | No new atom — uses existing `modify_roll_numeric` or new effect variant | — |
| `modify_action_damage` effect | New effect atom: `modify_action_damage` | Not in v4 |
| `on_hit_trigger` class feature family | Reuses `on_hit_window` atom | Atom exists |
| `choose_at_activation` DamageType | Surface shape only; no new atom | — |
| `weapon_or_wild_shape_attack` trigger | No new atom — trigger shape only | — |

The primary atom pressure is `modify_action_damage` (ability-score-rooted damage modifier to a scoped action class), which is absent from v4. This is `atom_widening` pressure nested inside a broader `structural_widening`.
