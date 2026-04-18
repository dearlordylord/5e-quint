# Proposal: Nature's Sanctuary (Druid L14)

**Outcome:** `structural_widening`

## Unit summary

Nature's Sanctuary (Magic action, expend Wild Shape use) creates a persistent 15-ft Cube area for 1 minute within 120 ft. While creatures occupy the area: caster + allies gain Half Cover; allies gain the Nature's Ward resistance. As a Bonus Action each subsequent turn the caster may reposition the Cube up to 60 ft.

## Why the unit does not fit

### 1. Structural gap — class features have no OngoingOperation pattern

`ActivatedAbilityMechanics` (family `"activation"`) has `phases: ReadonlyNonEmptyArray<ActivationPhase>`. Phases are point-in-time resolutions (attack roll, save gate, direct apply). There is no `operations` field analogous to `OngoingEffectMechanics.operations`.

Nature's Sanctuary's area effects are **persistent while creatures occupy the area**, not fired once at activation. This requires the `{ trigger, effect }` grammar of `OngoingOperation` — specifically `passive` or `on_attached_turn_start` triggers scoped to the area attachment. That grammar is only available inside `SpellMechanics.ongoing_effect`.

The Bonus Action repositioning compounds this: it needs an `on_caster_spends_action` trigger inside an ongoing operation, again spell-only.

**Fix:** Either (a) add an optional `operations?: ReadonlyNonEmptyArray<OngoingOperation>` to `ActivatedAbilityMechanics`, or (b) introduce a new `ongoing_effect` variant of `ClassFeatureMechanics` mirroring the spell shape but using class-feature header fields (`activationCost`, `resource`, `resetCadence`) instead of spell-slot fields.

### 2. Surface gap — cross-feature resource expenditure

`ActivationResource` only models the activating feature's own `use_count` or `charge_pool`. "Expend a use of your Wild Shape" draws from Wild Shape's use pool, which belongs to a different class feature record.

**Fix:** Add a variant to `ActivationResource`:
```typescript
| {
    readonly kind: "cross_feature_pool";
    readonly featureId: string;
    readonly uses: number;
  }
```

### 3. Atom gap — runtime cross-feature resistance reference

`grant_resistance` requires a fixed `DamageTypeRef` (a concrete damage type or a cast-time choice). "The current Resistance of your Nature's Ward" is resolved at runtime by reading the active Nature's Ward state — the damage type is not known at authoring time.

**Fix:** Add a new atom variant or a new `DamageTypeRef` variant that references another feature's active resistance by `featureId`:
```typescript
// new DamageTypeRef variant:
| { readonly kind: "from_feature"; readonly featureId: string }
```

Or a dedicated effect atom:
```typescript
| {
    readonly kind: "grant_resistance_from_feature";
    readonly featureId: string;
  }
```

### 4. Surface gap — saveAbilityFilter on modify_roll_numeric

Half Cover gives +2 to AC **and** +2 to **Dexterity** saving throws. `modify_roll_numeric` can express "+2 to saving_throw" but has no `saveAbilityFilter` to restrict to a specific ability. (`modify_roll_advantage` has `saveAbilityFilter`; `modify_roll_numeric` does not.)

**Fix:** Add `saveAbilityFilter?: ReadonlyNonEmptyArray<Ability>` to `modify_roll_numeric`, paralleling the same field already on `modify_roll_advantage`.

## Atoms that would be used post-widening

- `modify_ac` — Half Cover +2 AC (existing)
- `modify_roll_numeric` — Half Cover +2 Dex saves (needs `saveAbilityFilter`)
- `grant_resistance_from_feature` — Nature's Ward runtime resistance (new)
- `reposition_attachment` — Bonus Action move (existing atom, needs `on_caster_spends_action` trigger in ongoing operations)
- `on_caster_spends_action` trigger — Bonus Action repositioning cadence (existing trigger kind)
- `passive` trigger — Half Cover and resistance while in area (existing trigger kind)

## Atoms that could NOT be faked

There is no honest encoding available. Forcing the unit into a `direct` phase with area attachment would trace the effects as firing once at activation, not persistently while creatures occupy the area. That would be a false trace.
