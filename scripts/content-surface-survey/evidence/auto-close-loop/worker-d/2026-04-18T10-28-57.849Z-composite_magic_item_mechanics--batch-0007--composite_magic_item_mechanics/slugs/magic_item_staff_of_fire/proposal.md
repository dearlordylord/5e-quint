# Staff of Fire

## Verdict

`structural_widening`

## Why it does not fit honestly

`Staff of Fire` is a single magic item with two simultaneous mechanics streams:

- passive while held: fire resistance;
- activated while held: a 10-charge spellcasting suite with dawn recharge and last-charge destruction.

The current surface does not allow a `magic_item` record to carry both streams together. `MagicItemMechanics` is a closed union:

- `PassiveMechanics`
- `ActivatedAbilityMechanics`

That works for items like:

- `Ring of Resistance` — passive only
- `Wand of Magic Missiles` — activation only

It does not work for `Staff of Fire`, because choosing either branch drops real SRD mechanics:

- `passive` would lose the charge pool, dawn recharge, spell access payload, and destruction rule;
- `activation` would lose the always-on fire resistance.

Per the task guardrails, that would be a misleading trace, so no authored `content/magic_item_staff_of_fire.dhall` was produced.

## Minimal widening

Add a composite magic-item mechanics shape that can carry both:

- one passive grant bundle;
- one activated ability bundle.

For example, conceptually:

```ts
type MagicItemMechanics =
  | PassiveMechanics
  | ActivatedAbilityMechanics
  | {
      readonly family: "composite";
      readonly passive?: PassiveMechanics;
      readonly activation?: ActivatedAbilityMechanics;
    };
```

The exact shape can vary, but the key requirement is that a single `magic_item` record can express:

- `grant_resistance` to `fire` while held;
- `charge_pool` with cap 10;
- `grant_spell_access` for `burning_hands`, `fireball`, and `wall_of_fire` with fixed `charge_cast` costs;
- `dawn` recharge of `1d6 + 4`;
- `last_charge_roll` destruction on `1d20 == 1`.

## Evidence from unit text

- "You have Resistance to Fire damage while you hold this staff."
- "The staff has 10 charges."
- "While holding the staff, you can cast one of the spells on the following table from it..."
- "The staff regains 1d6 + 4 expended charges daily at dawn."
- "If you expend the last charge, roll 1d20. On a 1, the staff crumbles into cinders and is destroyed."
