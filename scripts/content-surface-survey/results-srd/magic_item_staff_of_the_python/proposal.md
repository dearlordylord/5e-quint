## Staff of the Python

Outcome: `structural_widening`

`Staff of the Python` does not fit the current `MagicItemRecord` mechanics families honestly.

The core mechanic is:

- activated item use;
- that creates a controllable companion creature (`Giant Constrictor Snake`);
- with shared initiative / immediate-after turn order;
- with a no-action command channel gated by range and by the wielder not being Incapacitated;
- with a bonus-action revert command;
- with special lifecycle rules on revert, death, and a 1-hour lockout before reuse.

The current surface can represent companion creation only in spell-only families:

- `spawned_creature`
- `reanimated_creature`
- `templated_multi_spawn`

But `MagicItemMechanics` is closed to:

- `PassiveMechanics`
- `ActivatedAbilityMechanics`

`ActivatedAbilityMechanics` can run `ActivationPhase`s, but it cannot honestly express a companion payload. `create_companion` / `command_companion` are tracer atoms for spell creature families, not authorable `EffectAtom`s for magic-item activations.

### Why this is structural

This is not just one missing field or atom. The missing shape is a top-level mechanics family available to magic items, or a shared creature-summon payload reusable across spells and magic items.

The narrowest honest widening is one of:

1. Allow `MagicItemMechanics` to include a companion-creation family equivalent to spell `spawned_creature`.
2. Extract a shared non-spell/spell creature-companion mechanics family that both spells and magic items can use.

### Secondary pressure after the structural fix

If the family existed, the item would still pressure a few additional shapes:

- a cooldown/reset shape for "you can't use the staff's property again for 1 hour";
- an explicit revert-to-item command / dismissal path on bonus action;
- a lifecycle path combining:
  - snake at 0 HP -> revert to staff form;
  - then item destroyed (`shatters and is destroyed`);
- optional representation of "if it reverts before losing all HP, it regains all of them."

Those are subordinate to the primary blocker: there is no honest magic-item companion family to author into.

### Evidence

> "As a Magic action, you can throw this staff ... causing the staff to become a Giant Constrictor Snake in that space."

> "The snake is under your control and shares your Initiative count, taking its turn immediately after yours."

> "On your turn, you can mentally command the snake (no action required) ..."

> "As a Bonus Action, you can command the snake to revert to staff form ..."

> "If the snake is reduced to 0 Hit Points, it dies and reverts to its staff form; the staff then shatters and is destroyed."
