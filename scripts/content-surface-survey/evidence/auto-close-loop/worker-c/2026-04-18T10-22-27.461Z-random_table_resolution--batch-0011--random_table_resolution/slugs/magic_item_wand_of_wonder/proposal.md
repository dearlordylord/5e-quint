# Wand of Wonder

## Verdict

`Wand of Wonder` does not fit the current surface honestly. The record kind exists (`magic_item`), and the outer shell exists (`activation` with `charge_pool`, `dawn` recharge, `last_charge_roll`, `random_table`), but the table's rows force a broader branch payload than `random_table` currently allows.

## Primary blocker: heterogeneous table branches

`ActivationPhase.random_table` can only branch to more `ActivationPhase` values.

That is too narrow for `Wand of Wonder`, whose rows include:

- granted spell casts from the chosen point;
- persistent non-spell environmental fields:
  - heavy rain making a cylinder Lightly Obscured;
  - butterflies making a cylinder Heavily Obscured;
- uncontrolled creature creation with dismissal timing:
  - Rhinoceros / Elephant / Rat appears, is not under your control, acts normally, disappears after 1 hour or at 0 HP;
- staged save-driven petrification;
- target-selection logic tied to proximity, random subject choice, and invalid-target fallback.

The clean widening is a generic random-table branch payload or cross-family composition that can dispatch into more than plain activation phases.

## Secondary gaps exposed by the table

Even with a broader branch payload, several rows still pressure missing shapes:

- `create_obscurement_field`
  - Evidence: "the area of effect is Lightly Obscured" / "the area of effect is Heavily Obscured"
  - Current atoms do not model temporary obscuring weather/swarms honestly.

- target-selection widening
  - Evidence: "the creature closest to the chosen point of origin"
  - Evidence: "If an effect has multiple possible subjects, the GM determines randomly which among them are affected."
  - Evidence: "If the target isn't you and can't be affected by that spell, you become the target instead."
  - Current `TargetSelection` does not express nearest-to-point selection, random subject selection, or fallback-to-self on invalidity.

## Why I did not author a placeholder

Encoding only the spell-cast rows and omitting the rest would misrepresent the unit's core mechanic. The random table is the item. A partial trace would be worse than no trace.
