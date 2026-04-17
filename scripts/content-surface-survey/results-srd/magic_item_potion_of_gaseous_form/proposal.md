# Proposal: Potion of Gaseous Form — atom_widening

## Unit

Magic item, rare. Consumable (one-shot, no recharge). When drunk, grants the effect of the *Gaseous Form* spell for 1 hour without Concentration; ends early if the bearer spends a Bonus Action to dismiss it.

## Structural frame (fits)

| Layer | Encoding | Status |
|---|---|---|
| Record kind | `magic_item` | ✓ |
| Mechanics family | `activation` | ✓ |
| Activation cost | `bonus_action` (drinking a potion in 5e 2024 is a Bonus Action) | ✓ |
| Resource | `charge_pool` cap 1, or `use_count` cap 1 | ✓ |
| Reset cadence | `never` + `permanent_on_empty` destruction | ✓ |
| Duration | `timed`, 1 hour (no concentration — timed is correct) | ✓ |

## Blocking gaps (why no dhall was authored)

### 1. `transform_target` requires a catalog_ref — not applicable here

`transform_target.newForm` is typed as `PolymorphFormSource`, which has exactly one variant:

```typescript
{ kind: "catalog_ref"; creatureType: CreatureType; crBound: ... }
```

This presupposes the new form is an external monster catalog entry (Polymorph → Beast, True Polymorph → any creature, etc.). Gaseous Form does not transform the target into a catalog creature. It transforms them into a named spell-defined form with its own fixed stat block properties (speed 10 fly/hover, specific action restrictions, movement-through-openings). A second variant is needed:

```typescript
| { kind: "named_spell_form"; spellId: string }
```

This variant would instruct the engine to look up the form's stat block from the spell's own definition rather than from the monster catalog. Reverts on spell end / Bonus Action dismiss.

### 2. No atom for movement through tiny openings

Gaseous Form's signature trait ("can move through a space as small as 1 inch") has no v4 atom and no v4 taxonomy entry. It is not:
- `grant_speed` (a speed mode, not a movement constraint relaxation)
- `force_move` (an involuntary push/pull)
- any existing `EffectAtom`

A new atom is needed, tentatively:

```typescript
{ kind: "grant_movement_through_openings"; minWidthInches?: number }
```

Or folded into a broader `grant_movement_trait` atom with a closed set of trait kinds.

### 3. `grant_resistance` has no "nonmagical" qualifier

Gaseous Form grants resistance to Bludgeoning, Piercing, and Slashing **from Nonmagical Attacks**. The current `grant_resistance` atom takes a `DamageTypeRef` (a damage type or choice thereof). There is no field for filtering by the source's magical/nonmagical status.

Without this qualifier, granting three `grant_resistance` atoms for bludgeoning, piercing, and slashing would be incorrect — it would make the bearer resistant to magical versions of those damage types as well.

Proposed surface widening:

```typescript
| {
    readonly kind: "grant_resistance";
    readonly damageType: DamageTypeRef;
    readonly qualifier?: "nonmagical_only";   // new optional field
  }
```

### 4. No `DurationEndTrigger` for caster-initiated Bonus Action dismiss (secondary)

The potion ends "until you end the effect as a Bonus Action." All current `DurationEndTrigger` variants are passive (target takes damage, makes attack roll, casts a spell, etc.). A player-initiated, action-economy-costed dismiss is absent.

Proposed addition:

```typescript
| { readonly kind: "caster_dismisses_as_bonus_action" }
```

This is a secondary gap — the duration could be encoded as `timed / 1 hour` with the early-end omitted and a note, but the other three gaps are blocking.

## Minimum widening to unlock encoding

| Priority | Gap | Required change |
|---|---|---|
| Blocking | `transform_target` / Gaseous Form form | Add `named_spell_form` variant to `PolymorphFormSource`, OR author a separate `self_transform_named_form` atom |
| Blocking | Movement through openings | Add `grant_movement_through_openings` to `EffectAtom` |
| Blocking | Nonmagical resistance qualifier | Add `qualifier?: "nonmagical_only"` to `grant_resistance` |
| Secondary | Bonus Action dismiss | Add `caster_dismisses_as_bonus_action` to `DurationEndTrigger` |

## Alternative encoding path (if named_spell_form is preferred)

Rather than introducing `grant_movement_through_openings` as a standalone atom, the `named_spell_form` PolymorphFormSource variant could implicitly carry the full Gaseous Form stat block (including movement traits) by reference to the spell definition. The engine would look up `spellId: "gaseous_form"` and apply its form properties. This collapses all three blocking gaps into one variant addition, at the cost of requiring the spell itself to be authored in the surface before this item can be traced.

## Classification

`atom_widening` — the mechanics family and structural frame are correct; the effect-layer atoms needed for honest encoding are absent from both `types.ts` and the v4 taxonomy.
