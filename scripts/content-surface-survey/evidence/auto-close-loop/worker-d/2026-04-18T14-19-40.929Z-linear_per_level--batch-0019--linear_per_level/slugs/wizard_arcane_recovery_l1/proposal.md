## Arcane Recovery (wizard L1)

Arcane Recovery fits the existing `class_feature` top-level kind, but it does not fit the currently authored mechanics families honestly.

Why it does not fit:

- It is not an `activation` in the current surface sense. The feature does not spend an action, bonus action, reaction, or attack replacement. Its trigger is finishing a `Short Rest`.
- It is not a plain `passive` grant either. The feature performs a one-time resource recovery event after a rest, subject to a once-per-Long-Rest limit.
- The recovered thing is not HP, Temp HP, AC, or another existing effect atom. It restores expended `spell_slot` resources chosen by the player.

Missing surface pieces:

1. A rest-triggered operation variant for non-spell/class-feature mechanics.
   The current `PassiveOperation.trigger` only supports elapsed time. Arcane Recovery needs a trigger like "on finish Short Rest".

2. A spell-slot refund / restore subgraph.
   The existing surface can consume a `spell_slot`, but it cannot restore one. Arcane Recovery needs a recovery shape that:
   - restores expended spell slots;
   - lets the player choose which slots to recover;
   - enforces a combined recovered level budget;
   - caps recovered slot level below 6.

Why this is `surface_widening`, not `atom_widening`:

- The missing behavior is resource recovery composition around an existing resource kind (`spell_slot`), not pressure for a new v4 effect atom.
- The top-level source kind already exists (`class_feature`).
- What is missing is a new variant/subgraph on the authored surface and corresponding tracer support.

Evidence from the unit text:

> "When you finish a Short Rest, you can choose expended spell slots to recover."

> "The spell slots can have a combined level equal to no more than half your Wizard level (round up), and none of the slots can be level 6 or higher."

> "Once you use this feature, you can't do so again until you finish a Long Rest."
