# Proposal: species_gnome_gnomish_cunning

## Outcome: structural_widening

## Unit

**Gnomish Cunning (Gnome)** — SRD 5.2.1 §Character-Origins / Gnome

> You have Advantage on Intelligence, Wisdom, and Charisma saving throws.

## Why it doesn't fit

### Gap 1 — No `species_trait` kind in `UnitRecord`

`UnitRecord` is currently:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

`SpeciesTraitRecord` does not exist. The v4 taxonomy defines `species_trait_root` as a valid source atom, but the surface has never been widened to include it. This is the primary structural gap.

### Gap 2 — No passive mechanics family

The only class-feature family is `activation`, which requires:

```typescript
type ClassFeatureMechanicsHeader = {
  activationCost: ClassFeatureActivationCost;
  resource: UseCountResource;
  resetCadence: RestResetCadence;
};
```

Gnomish Cunning has none of these: it is not activated, it has no use count, and it does not reset because it never depletes. Forcing it into `activation` with `{ kind: "free" }` cost and a dummy use-count resource would be a dishonest trace — the tracer would emit `activate → use_count → rest_window` atoms that have no basis in the rule text.

### Gap 3 — `modify_roll_advantage` not reachable as a passive self effect

The v4 atom `modify_roll_advantage` exists and is already in the surface (`MasteryEffect.ModifyRollAdvantageRider`). However it is scoped inside the mastery on-hit rider pipeline:

```
attack_roll → on_hit_window → modify_roll_advantage → [expiry]
```

Gnomish Cunning needs this atom as an **unconditional, always-on** effect attached to `self` with no triggering window and no expiry. That subgraph shape does not exist.

## Proposed widenings

### 1. New kind: `SpeciesTraitRecord`

```typescript
export type SpeciesTraitRecord = UnitMetadata & {
  readonly kind: "species_trait";
  readonly mechanics: SpeciesTraitMechanics;
};
```

Add to `UnitRecord`:
```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord | SpeciesTraitRecord;
```

### 2. New mechanics family: `passive_modifier`

```typescript
export type PassiveModifierMechanics = {
  readonly family: "passive_modifier";
  readonly effect: SpeciesTraitEffect;
};

export type SpeciesTraitMechanics = PassiveModifierMechanics;
```

This family has no activation cost, no resource, and no reset — matching the always-on nature of most species traits.

### 3. New effect type: `AlwaysOnRollAdvantageEffect`

```typescript
export type AlwaysOnRollAdvantageEffect = {
  readonly kind: "always_on_roll_advantage";
  readonly mode: "advantage" | "disadvantage";
  readonly on: ReadonlyArray<RollKind>;           // existing: "saving_throw" | "attack_roll"
  readonly filter?: { readonly abilities: ReadonlyArray<Ability> }; // Gnomish Cunning: int/wis/cha
};

export type SpeciesTraitEffect = AlwaysOnRollAdvantageEffect; // extend as more traits land
```

The `filter.abilities` field is needed because Gnomish Cunning scopes advantage to three specific ability saves, not all saving throws. Without it the effect would over-state the rule.

### 4. Tracer extension

The tracer needs a `traceSpeciesTraitUnit` function paralleling `traceClassFeatureUnit`, emitting `species_trait_root → passive_modifier → modify_roll_advantage (always-on, self)` with no window or expiry nodes.

## Atom inventory impact

All atoms are in v4:
- `species_trait_root` — already in v4 §1
- `modify_roll_advantage` — already in v4 §9

No new v4 atoms required. The widening is surface-structural only: a new `UnitRecord` kind, a new mechanics family, and a new effect variant.

## Scope note

Darkvision (Gnome) and other passive sensor traits will need a second effect variant (`grant_sense`), which is also already in v4 §9. This proposal covers only the saving-throw advantage shape needed for Gnomish Cunning.
