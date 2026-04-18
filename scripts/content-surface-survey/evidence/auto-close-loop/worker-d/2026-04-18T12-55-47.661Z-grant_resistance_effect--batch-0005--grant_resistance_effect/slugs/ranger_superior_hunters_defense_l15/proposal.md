# Proposal: surface_widening for `ranger_superior_hunters_defense_l15`

## Unit

- Name: `Superior Hunter's Defense`
- Kind: `class_feature`
- Class: `ranger`
- Level: `15`

## Honest fit

The unit fits the existing `ClassFeatureRecord` kind and the existing
`activation` mechanics family.

The underlying shape is:

- activated class feature
- activation cost: `reaction`
- attachment: `self`
- effect: `grant_resistance`

The resistance payload itself already fits the current effect surface
honestly:

- `grant_resistance` already exists in `EffectAtom`
- the damage type can be authored as
  `{ kind = "triggering_damage_type" }`

That covers:

> give yourself Resistance to that damage and any other damage of the
> same type

## Blocking gaps

### 1. Missing reaction trigger variant

The current reaction-trigger grammar is spell-centric:

- `hit_by_attack_roll`
- `targeted_by_named_spell`
- `creature_casts_spell`
- `spell_save_outcome`
- `any_of`

This feature needs a generic non-spell trigger for incoming damage:

> When you take damage, you can take a Reaction

That is narrower than a new family and should be a new variant on the
existing `ReactionTrigger` union, for example:

```ts
{ readonly kind: "takes_damage" }
```

Optionally this could widen later with source qualifiers, but this unit
only forces the base trigger.

### 2. Missing duration variant for current-turn expiry

The rider lasts:

> until the end of the current turn

Current `Duration` variants can express:

- instantaneous
- concentration up to X
- timed for rounds/minutes/hours/days
- permanent

None of those encode a turn-local duration anchored to the current turn.
Using `timed { unit = "round", amount = 1 }` would be dishonest because a
reaction can occur during another creature's turn, and a full round lasts
past the end of the current turn.

This needs a new duration-side variant or equivalent closed expiry shape,
for example:

```ts
{ readonly kind: "until_end_of_current_turn" }
```

## Why this is `surface_widening`

This is not `structural_widening`:

- `class_feature` already exists
- `activation` already exists
- `reaction` activation cost already exists

This is not `atom_widening`:

- the effect atom is already present as `grant_resistance`
- the damage-type reference is already present as `triggering_damage_type`

The blockage is the authored surface missing:

1. a reaction trigger variant for taking damage
2. a duration / expiry variant for end-of-current-turn timing

## Classification

`surface_widening`
