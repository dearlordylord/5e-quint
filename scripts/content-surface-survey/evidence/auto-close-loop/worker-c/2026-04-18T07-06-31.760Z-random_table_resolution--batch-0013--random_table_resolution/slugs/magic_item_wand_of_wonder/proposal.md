# Wand of Wonder

Stopped before authoring `content/magic_item_wand_of_wonder.dhall`.

## Verdict

The top-level unit kind fits: this is a `magic_item` with an `activation` shell, a `charge_pool`, dawn recharge, and last-charge destruction.

The item does **not** fit honestly in the current authored surface because the effect table mixes several payload shapes that the current `random_table` outcome grammar cannot represent without lying.

## Why It Stops

1. `random_table` outcomes are too shallow.
The current surface only lets a random-table row yield `EffectAtom[]` or another nested table. Several Wand of Wonder rows are not immediate effect atoms:

- nested spell casts chosen by sub-roll:
  - `01–20`: Darkness / Faerie Fire / Fireball / Slow / Stinking Cloud
- full save-gated timed rider:
  - `78–82`: 30-foot emanation, Con save, Blinded for 1 minute, repeat save
- temporary independent creature appearance:
  - `56–60`: Rhinoceros / Elephant / Rat appears, not under your control, disappears after 1 hour or at 0 HP

Those are subgraphs, not single effect atoms.

2. Obscured-area state is missing from the effect vocabulary.

Rows `36–40` and `41–45` create temporary obscured areas:

- `“the area of effect is Lightly Obscured”`
- `“the area of effect is Heavily Obscured”`

No current `EffectAtom` models obscurement, and the v4 taxonomy does not already contain a direct obscuration atom to surface here.

3. Nearest-creature targeting is missing.

Multiple rows resolve against the creature closest / nearest to the chosen point:

- `51–55`: closest creature is enlarged
- `73–77`: leaves grow from the creature nearest the point
- `93–97`: Polymorph targets the creature closest to the point
- `98–00`: closest creature makes a save

Current attachments support chosen targets, marks, and areas, but not deterministic proximity-based target resolution.

## Secondary Gaps

- `65–68` targets an object, not a creature, and exiles it to the Ethereal Plane.
- `88–92` divides line damage equally among all creatures in the line, which is not a current damage-shape primitive.
- The header rule `“If an effect has multiple possible subjects, the GM determines randomly which among them are affected.”` needs a random-subject selection rule beyond current target selection.

## Narrowest Honest Read

This is not missing the top-level `magic_item` kind.

It primarily needs:

- a richer `random_table` outcome payload capable of branching into full subgraphs, and
- at least one genuinely new atom for obscured-area state.

That makes the overall worker verdict `atom_widening` rather than `clean`.
