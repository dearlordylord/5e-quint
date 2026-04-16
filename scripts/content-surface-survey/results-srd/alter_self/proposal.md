# Proposal: Alter Self — surface_widening

## Unit

**Alter Self** — Level 2 Transmutation, Concentration up to 1 hour, Action, Self, V/S.

SRD 5.2.1 (`srd52: true`).

## Why it does not fit today

### Family

The spell is honestly an `ongoing_effect` spell: concentration, self-attachment, persistent operation for the duration. That family exists and is the correct choice.

### Blocking gap — `OngoingOperation` is too narrow

`OngoingEffectMechanics` requires:

```typescript
operation: OngoingOperation   // = RollModifierOperation | DamageOnHitOperation
```

Alter Self has three selectable operations. None of them is a `roll_modifier` or a `damage_on_hit`:

| Option | v4 atoms required | Current fit |
|---|---|---|
| Aquatic Adaptation | `grant_sense` (water breathing) + `modify_speed` (swim speed) | No `OngoingOperation` variant |
| Change Appearance | new atom (see below) | No `OngoingOperation` variant, no v4 atom |
| Natural Weapons | `alter_item_kind`-adjacent (natural weapon override) | No `OngoingOperation` variant |

### Blocking gap — choice-set and in-duration swap

`OngoingEffectMechanics.operation` is a single operation. Alter Self presents a menu:

> "Choose one of the following options … during which you can take a Magic action to replace the option you chose with a different one."

The required shape: a `ReadonlyArray` of options with a flag or procedure node capturing "may swap via Magic action during duration." There is no surface type or subgraph for this.

## Proposed widenings

### 1. New `OngoingOperation` variant: `grant_passive_effect`

A persistent self-effect that grants one or more of: a new sense, a new movement mode, immunity to an environmental condition.

Minimum shape to cover Aquatic Adaptation:

```typescript
export type GrantPassiveEffectOperation = {
  readonly kind: "grant_passive_effect";
  readonly effects: ReadonlyArray<
    | { readonly kind: "grant_sense"; readonly sense: string }
    | { readonly kind: "modify_speed"; readonly mode: string; readonly value: "equal_to_speed" | number }
  >;
};
```

v4 atoms emitted: `grant_sense`, `modify_speed` (both exist in taxonomy §9).

### 2. New `OngoingOperation` variant: `modify_natural_weapon`

Replaces the caster's unarmed strike damage profile for the duration.

Minimum shape to cover Natural Weapons:

```typescript
export type ModifyNaturalWeaponOperation = {
  readonly kind: "modify_natural_weapon";
  readonly damageType: DamageType;           // slashing | piercing | bludgeoning
  readonly amount: DiceAmount;               // fixed 1d6
  readonly attackAbility: "spellcasting";    // overrides Strength
};
```

v4 atom: `alter_item_kind` is the closest existing atom but is scoped to equippable items. A more precise atom would be `modify_natural_weapon`; this is a narrow single-spell pressure for now but will recur (Shapechange, Beast Shape, similar polymorph-adjacent spells). Document as a candidate new atom if the pressure widens.

### 3. New `OngoingEffectMechanics` shape: choice-set with in-duration swap

Rather than a single `operation`, a `choice_operation` variant that carries a menu and an action cost for switching:

```typescript
// Option A: widen OngoingEffectMechanics with an optional choice wrapper
export type ChoiceOngoingEffectMechanics = SpellMechanicsHeader & {
  readonly family: "ongoing_effect";
  readonly attachment: Attachment;
  readonly operationChoice: {
    readonly options: ReadonlyArray<OngoingOperation>;
    readonly swapCost: { readonly kind: "magic_action" };   // new action kind
  };
};
```

`magic_action` here corresponds to the SRD "Magic" standard action. `StandardActionKind` already includes `"magic"`, so this just adds a typed activation cost variant for mid-spell switching.

Alternatively, keep `operation` singular and add `operationChoice` as a discriminated sibling — only one is present.

### 4. Change Appearance: atom status uncertain

Change Appearance alters the caster's physical appearance (height, weight, facial features, voice, hair, coloration) within size/basic-shape constraints.

- The mechanical fact (caster's appearance has changed) is a deterministic state transition that the core engine would need to track.
- Whether observers are fooled is DM-adjudicated and stays out of core per `ARCHITECTURE.md`.

If the appearance state is needed as a runtime projection (e.g., for disguise-related checks in future), a new atom `modify_appearance` would be required. If it is purely narrative, it is `dm_agenda` for this option only and the spell would still need widenings 1–3 for the other options.

## Encoding path once widenings land

1. Add `GrantPassiveEffectOperation` and `ModifyNaturalWeaponOperation` to `OngoingOperation`.
2. Add a `choice_operation` field (or a new `choice_ongoing_effect` family variant) to `OngoingEffectMechanics`.
3. Extend the tracer with handlers for each new operation kind.
4. Author `alter_self.dhall` encoding all three options, the attachment (`self`), and the swap cost (`magic_action`).
