# Proposal: Widening for `sorcerer_elemental_affinity_l6`

## Unit

**Elemental Affinity** — Sorcerer (Draconic Bloodline) L6  
SRD 5.2.1 § Classes/Sorcerer#Level 6: Elemental Affinity

> You have Resistance to that damage type, and when you cast a spell that deals damage of that type, you can add your Charisma modifier to one damage roll of that spell.

---

## Why the unit does not fit

### Problem 1 — No `passive_grant` class feature family (structural)

The only class feature mechanics family is `ClassFeatureActivationMechanics`, which requires:

```typescript
type ClassFeatureMechanicsHeader = {
  activationCost: ClassFeatureActivationCost;  // free | bonus_action
  resource: UseCountResource;                  // use_count with cap
  resetCadence: RestResetCadence;              // short/long rest etc.
};
```

Elemental Affinity's resistance component is **permanently active from level 6 onward** — there is nothing to activate, no uses to spend, no resource to refill. Forcing it into the `activation` family would require a fictional `use_count` with a fictional reset cadence, producing a false trace.

This is the same structural gap seen in features like Draconic Resilience (permanent HP/AC bonus), Unarmored Defense, or any always-on permanent class trait.

**Required widening:** A new class-feature mechanics family — tentatively `passive_grant` — with no activation cost, no use-count resource, and no reset cadence.

```typescript
export type ClassFeaturePassiveMechanics = {
  readonly family: "passive_grant";
  readonly effect: ClassFeaturePassiveEffect;
};
```

---

### Problem 2 — No `grant_resistance` ClassFeatureEffect variant (surface)

The v4 atom `grant_resistance` exists and is well-specified. However `ClassFeatureEffect` covers only:

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

Expressing "Resistance to [damageType]" requires a new variant:

```typescript
export type GrantResistanceEffect = {
  readonly kind: "grant_resistance";
  readonly damageType: DamageType;
};
```

The damage type here is chosen at feature acquisition (from Acid, Cold, Fire, Lightning, Poison). Modeling that choice is an additional open-choice problem (see note below), but the type shape itself is straightforward.

---

### Problem 3 — No ability-score-modifier-based spell damage bonus (surface)

The spell damage bonus mechanic is:

> when you cast a spell that deals damage of that type, you can add your **Charisma modifier** to one damage roll of that spell

This differs from all existing numeric modifiers:

- `DiceDelta` (used by `roll_modifier`) carries `dice + dieSize + sign` — it cannot reference an ability score.
- `modify_roll_numeric` emits a `DiceDelta`-shaped operation — same limitation.
- `damage_on_hit` (the ongoing-effect spell operation) applies to the caster hitting a target, not to "casting a spell of matching damage type."

A new surface shape is needed. Tentatively:

```typescript
export type AddAbilityModToDamageEffect = {
  readonly kind: "add_ability_mod_to_damage";
  readonly ability: Ability;          // "cha"
  readonly damageTypeFilter: DamageType;  // the chosen elemental type
  readonly targetsOneRoll: true;
};
```

This would be triggered by a `spell_cast_window` (v4 atom) conditioned on the spell's damage type matching `damageTypeFilter`. The tracer would need a new path for this shape.

---

## Open-choice note

Both effects reference a **damage type chosen at acquisition time** (one of Acid, Cold, Fire, Lightning, Poison). The current surface has no mechanism for encoding a player-chosen parameter at feature-acquisition time (as opposed to cast time or activation time). This is a narrower version of the open-choice problem already noted for Elven Lineage and Gnomish Lineage. It is not a blocker for the widening above — the type can carry `damageType: DamageType` and the open-choice mechanism can be layered on separately — but it is worth recording.

---

## Summary of proposed widenings

| # | Kind | Name | Scope |
|---|------|------|-------|
| 1 | `new_subgraph` | `passive_grant` class-feature family | Structural — no existing family covers permanent passive class traits |
| 2 | `new_variant` | `grant_resistance` in `ClassFeatureEffect` | Surface — v4 atom exists, no ClassFeatureEffect variant |
| 3 | `new_variant` | `add_ability_mod_to_damage` effect | Surface — ability-score reference in damage modification is new |

---

## Comparison to existing units

- **Draconic Resilience (sorcerer L3)** — similar structural gap; it grants a permanent AC baseline and permanent HP bonus, also unrepresentable in the `activation` family.
- **Dragonborn Damage Resistance** — the species-trait side of the same mechanic; not yet encoded in the prototype.
- **Bless** — the `roll_modifier` operation is the closest analog to the damage bonus, but Bless uses a `DiceDelta` (1d4) and applies on any attack/save roll, while Elemental Affinity uses CHA modifier on a specific damage roll of a specific spell type.
