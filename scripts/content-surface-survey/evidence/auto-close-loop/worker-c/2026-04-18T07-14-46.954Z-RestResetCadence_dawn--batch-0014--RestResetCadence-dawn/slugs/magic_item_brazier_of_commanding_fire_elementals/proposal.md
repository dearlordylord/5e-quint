# Brazier of Commanding Fire Elementals

## Verdict

`structural_widening`

## Why It Does Not Fit

This is a `magic_item`, but its core mechanic is not a passive grant, a direct activation effect atom bundle, or a triggered reaction. Its main payload is:

- activated summon of a specific companion;
- deterministic companion control semantics;
- deterministic dismissal semantics;
- deterministic disappearance window;
- item-side dawn reset.

The surface already models that shape for spells via `spawned_creature`, including:

- inline stat block / companion attachment;
- `command_companion`;
- initiative / turn-order control;
- manual dismissal;
- disappearance on timeout or death.

But `MagicItemMechanics` cannot use `spawned_creature`, and `ActivationPhase.direct.effects` cannot express the summon honestly because `EffectAtom` has no `create_companion` or `command_companion` variant.

## Narrowest Honest Widening

Add a non-spell companion-summon variant to magic-item mechanics, preferably by allowing magic items to reuse the existing spawn family rather than duplicating it.

Candidate direction:

- add `SpawnedCreatureAbilityMechanics` to `MagicItemComponentMechanics`; or
- widen `ActivatedAbilityMechanics` to support a non-spell companion payload without routing it through `EffectAtom`.

The first option is cleaner because the tracer already knows how to emit the companion subgraph from `spawned_creature`.

## Evidence

> While you are within 5 feet of this brazier, you can take a Magic action to summon a Fire Elemental.

> The elemental appears in an unoccupied space as close to the brazier as possible, understands your languages, obeys your commands, and takes its turn immediately after you on your Initiative count.

> The elemental disappears after 1 hour, when it dies, or when you dismiss it as a Bonus Action.

> The brazier can't be used this way again until the next dawn.

## Why This Is Not Just Surface Or Atom Widening

- Not `surface_widening`: the missing piece is not just one extra field or enum case inside an existing magic-item family.
- Not `atom_widening`: v4-style summon/control atoms already exist at the tracer level (`create_companion`, `command_companion`), and the spell family already uses them.
- The gap is that the existing top-level magic-item family set cannot carry this payload honestly.
