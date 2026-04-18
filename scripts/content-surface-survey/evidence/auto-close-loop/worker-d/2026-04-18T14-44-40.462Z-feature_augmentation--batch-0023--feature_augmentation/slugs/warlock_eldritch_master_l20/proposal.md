# Proposal: Eldritch Master (warlock L20)

Outcome: `structural_widening`

## Why It Does Not Fit

RAW:

> When you use your Magical Cunning feature, you regain all your expended Pact Magic spell slots.

`Eldritch Master` is not:

- a passive always-on grant;
- a standalone activated feature with its own action cost and resource;
- a spell-shaped payload;
- a mastery on-hit rider.

Instead, it augments another named class feature's activation. The current surface has no family for "when you use feature X, replace or extend its effect with Y."

## Required Widenings

### 1. New subgraph: `feature_augmentation`

Needed to express feature-chained behavior:

- trigger on use of a named feature;
- attach an additional or replacement effect to that feature's resolution.

Pressure case:

> When you use your Magical Cunning feature...

Without this, any authored encoding would be dishonest. Modeling `Eldritch Master` as a passive grant loses the trigger. Modeling it as its own activation invents a separate use event that the RAW does not have.

### 2. New variant: `refund_spell_slots`

Needed to express the actual payload:

- refund a named slot pool;
- here specifically the `Pact Magic` spell-slot pool;
- with a "regain all expended slots" mode.

Pressure case:

> ...you regain all your expended Pact Magic spell slots.

This is not `grant_spell_access`, `grant_extra_action`, `heal_hp`, or any existing effect atom in the current surface.

## Honest Verdict

The unit mostly depends on an already-missing shape from `Magical Cunning`: slot-pool refund. But `Eldritch Master` adds a larger gap on top of that by requiring feature-to-feature augmentation semantics. That structural gap dominates, so the correct outcome is `structural_widening`.
