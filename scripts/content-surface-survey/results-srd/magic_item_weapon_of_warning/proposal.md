# Proposal: magic_item_weapon_of_warning — structural_widening

## Unit

**Weapon of Warning** (Magic Item, uncommon, requires attunement)

> As long as this weapon is within your reach and you are attuned to it, you and allies within 30 feet of you gain the following benefits.
>
> **Alarm.** The weapon magically awakens each subject who is sleeping naturally when combat begins. This benefit doesn't wake a subject from magically induced sleep.
>
> **Supernatural Readiness.** Each subject has Advantage on its Initiative rolls.

## Why this unit cannot be encoded honestly

### Gap 1 — no honest magic-item family for a persistent ally aura

`MagicItemMechanics = PassiveMechanics | ActivatedAbilityMechanics`.

`PassiveMechanics` is only `{ family = "passive", grants = EffectAtom[] }`, optionally gated by an `EquipmentPredicate`. It has no attachment, radius, subject selection, or ally-targeting shape. Weapon of Warning is not just "you gain X while wielding/wearing/attuned"; it is a persistent aura centered on the wielder:

- self is affected;
- allies within 30 feet are affected;
- the effect turns off when the weapon is no longer within reach.

The current passive family can encode the initiative rider only by lying about scope and pretending the benefit applies to the attuned wielder alone.

Proposed widening:

```typescript
// one possible direction
type AuraPassiveMechanics = {
  readonly family: "passive_aura";
  readonly attachment: {
    readonly kind: "area";
    readonly shape: { readonly kind: "emanation"; readonly radiusFeet: number };
    readonly origin: { readonly kind: "self" };
  };
  readonly subject: "self_and_allies";
  readonly condition?: PassiveGate;
  readonly grants: ReadonlyArray<EffectAtom>;
  readonly operations?: ReadonlyArray<OngoingOperation>;
};
```

This is a **structural** gap, not just a single missing atom: no existing mechanics family can express a non-spell continuous aura.

### Gap 2 — passive gate missing `weapon_within_reach`

Even with an aura-capable family, the item's enable condition is not covered by `EquipmentPredicate`.

Current predicates:

- `always`
- `wearing_armor`
- `wielding_weapon`

Weapon of Warning requires:

> As long as this weapon is within your reach ...

That is stricter and different from the current coarse `wielding_weapon` gate. The item can be active while merely within reach; it is not an armor predicate and not a weapon-category style gate.

Proposed widening:

```typescript
| { readonly kind: "weapon_within_reach" }
```

This is a **surface_widening** sub-gap.

### Gap 3 — no trigger for `when combat begins`

The Alarm rider is not a continuous modifier. It is a triggered effect that fires at combat start:

> The weapon magically awakens each subject who is sleeping naturally when combat begins.

`OngoingTrigger` has:

- `passive`
- `on_caster_attack_hit`
- `on_attached_turn_start`
- `on_caster_turn_start`
- `on_attached_damaged`
- `on_creature_moves`
- `on_creature_enters_area`

There is no combat-start / initiative-start trigger. Even if a non-spell aura family existed, the trigger vocabulary cannot represent this rider yet.

Proposed widening:

```typescript
| { readonly kind: "on_combat_start" }
```

This is a **surface_widening** sub-gap.

### Gap 4 — no atom for waking naturally sleeping subjects

The wake rider is not equivalent to removing a standard SRD condition currently in the surface:

- there is no authored "sleeping naturally" state;
- the rule explicitly excludes magically induced sleep;
- `remove_condition` cannot express "wake natural sleep only, not magical sleep."

Proposed new atom:

```typescript
| {
    readonly kind: "wake_sleep";
    readonly scope: "natural_sleep_only";
  }
```

Evidence:

> The weapon magically awakens each subject who is sleeping naturally when combat begins. This benefit doesn't wake a subject from magically induced sleep.

This is an **atom_widening** sub-gap.

## Classification

| Gap | Category |
|-----|----------|
| No persistent ally-aura magic-item family | `structural_widening` |
| Missing passive gate for `weapon_within_reach` | `surface_widening` |
| Missing `on_combat_start` trigger | `surface_widening` |
| Missing wake-from-natural-sleep effect | `atom_widening` |

Overall: **`structural_widening`**.

The top-level blocker is family fit. `Weapon of Warning` is a passive aura with a triggered combat-start rider, and the current magic-item mechanics union has no honest place to put that shape.

## What would already fit if the family existed

The `Supernatural Readiness` rider itself maps cleanly to an existing atom:

```typescript
{ kind: "modify_roll_advantage", mode: "advantage", on: ["initiative"] }
```

The problem is not the initiative atom. The problem is the delivery context: who gets it, when they get it, and when the other rider fires.
