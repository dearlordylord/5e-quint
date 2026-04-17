## Cloak of the Manta Ray

`Cloak of the Manta Ray` structurally fits the existing `magic_item` + `passive` family:

- `grant_speed` can encode "you have a Swim Speed of 60 feet"
- `water_breathing` exists in `EffectAtom` and can encode "you can breathe underwater"

The problem is verification: the current tracer implementation does not fully handle `water_breathing`.

## Evidence

Source text:

> While wearing this cloak, you can breathe underwater, and you have a Swim Speed of 60 feet.

Observed failure during `pnpm typecheck`:

```text
src/interpreter/tracer.ts(...): error TS2322: Type ... | { readonly kind: "water_breathing"; } is not assignable to type 'never'.
```

That failure comes from the tracer's exhaustive handling for effect-atom scaling, which omits the existing `water_breathing` variant.

## Narrowest Honest Classification

`atom_widening`

Reason:

- the unit needs a dedicated underwater-breathing capability atom;
- the current repo surface includes `water_breathing`, but the atom is not cleanly integrated through tracing/verification;
- producing authored content would leave the worker in a non-typechecking state, so the honest outcome is to stop and record the gap.

## Suggested Fix

Integrate `water_breathing` end-to-end in the tracer, including the exhaustive non-scaling branch, so passive magic items like this can typecheck and trace cleanly.
