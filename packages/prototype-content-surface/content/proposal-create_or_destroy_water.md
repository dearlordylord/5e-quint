# Widening Proposal: Create or Destroy Water

## Outcome: `structural_widening`

No honest encoding is possible with the current surface. Three distinct gaps are identified below, ordered by severity.

---

## Gap 1 — No instantaneous unconditional activation family (structural)

**The problem.**
Every existing spell family requires one of:
- a duration to persist into (`ongoing_effect`, `anchored_trigger`)
- at least one `ActivationPhase` — `attack_roll` or `save_gate` — for the effect to be gated on (`activation`)
- a reaction trigger (`triggered_reaction`)

Create or Destroy Water is instantaneous and has **no resolution gate**. The effect fires unconditionally when cast: no roll, no save. Forcing it into `activation` would require either inventing a fake attack roll / saving throw (dishonest) or leaving `phases` empty (the tracer produces no effect nodes — also dishonest).

**Proposed fix.**
Widen the `activation` family to allow a `phases: []` empty path, or introduce a new `instant_effect` family:

```typescript
export type InstantEffectMechanics = SpellMechanicsHeader & {
  readonly family: "instant_effect";
  readonly attachment: Attachment;
  readonly effects: ReadonlyArray<InstantEffect>;
};
```

This family would emit `activate → attaches_to → [effect atoms]` with no `attack_roll` or `save_gate` node.

---

## Gap 2 — No cast-time player choice between mutually exclusive sub-effects (structural)

**The problem.**
The spell text reads:

> "You do one of the following: **Create Water** … **Destroy Water** …"

This is a player-facing mode selection at cast time — the caster permanently chooses which half of the spell fires. Neither the activation `phases` array nor any other surface shape models a top-level "choose one branch" at activation. The v4 `choose` procedure atom exists in the taxonomy but is not wired into any spell family in the current surface.

**Proposed fix.**
Either:
- Add a `choice` layer inside `instant_effect` (or whatever new family is used): `choices: ReadonlyArray<{ label: string; effects: ReadonlyArray<InstantEffect> }>`
- Or add a new top-level `choice_activation` family with a `branches` field each carrying its own effect list

---

## Gap 3 — Missing v4 atoms: `destroy_object` and `extinguish_environmental`

**destroy_object**

v4 has `create_object` but no corresponding `destroy_object`. The Destroy Water mode:
- removes up to 10 gallons of water from a container
- removes fog from a 30-ft cube

This is distinct from `damage` (reduces HP), `remove_condition` (creature state), and `force_move` (displacement). It is literal destruction / removal of a physical substance from the world.

**Evidence:** "You destroy up to 10 gallons of water in an open container within range. Alternatively, you destroy fog in a 30-foot Cube within range."

**extinguish_environmental**

The Create Water (rain) mode extinguishes exposed flames in the cube's area. Exposed flames are an environmental hazard, not a creature condition, not an object with HP. No v4 atom covers suppression of environmental fire.

**Evidence:** "the water falls as rain in a 30-foot Cube within range, extinguishing exposed flames there"

These two atoms have independent pressure and may be needed for other spells (Create Food and Water, Control Water, etc.).

---

## Scaling note

The higher-level scaling ("10 additional gallons per slot above 1, or +5 ft cube") would need either:
- A new scaling axis/shape for "quantity of substance" (gallons are not dice expressions)
- Or a `scale_numeric_bonus` on a quantity field

This is a tertiary gap not blocking the structural analysis above.

---

## What was NOT attempted

No `.dhall` or `.json` file was authored. Forcing the spell into a closest-valid shape would have required:
- Fabricating a save_gate or attack_roll that does not exist in the rules
- Silently dropping the Destroy Water mode
- Silently dropping the extinguish-flames and destroy-fog effects

Any of these would produce a misleading trace. Per the guardrails, no encoding was produced.
