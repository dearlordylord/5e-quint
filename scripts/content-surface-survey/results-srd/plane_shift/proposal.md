# Proposal: Widenings required for Plane Shift

## Outcome: `structural_widening`

Plane Shift cannot be honestly encoded. Two gaps compound each other.

---

## Gap 1 — No unconditional phase kind in `ActivationPhase`

`ActivationMechanics` requires every phase to be `attack_roll | save_gate`. Plane Shift has neither: it fires on willing targets with no resolution gate of any kind.

The missing shape is a phase that unconditionally applies an effect to a target selection — call it `unconditional` or model it as a new sibling family `direct_effect`. This gap affects every instantaneous spell that targets willing creatures without a roll: Misty Step, Dimension Door, Teleport, Revivify, etc.

**Proposed surface widening:**

```typescript
export type ActivationPhase =
  | { readonly kind: "attack_roll"; ... }
  | { readonly kind: "save_gate"; ... }
  | {
      readonly kind: "unconditional";
      readonly attachment: Attachment;
      readonly effect: Effect;
    };
```

Or alternatively, a new sibling mechanics family:

```typescript
export type DirectEffectMechanics = SpellMechanicsHeader & {
  readonly family: "direct_effect";
  readonly attachment: Attachment;
  readonly effect: Effect;
};
```

The `direct_effect` family is arguably cleaner because Plane Shift is not really "activating phases" — it is casting once and the effect fires immediately on all willing targets in the circle.

---

## Gap 2 — `transport_exile` absent from `Effect` union

The v4 atom inventory lists `transport_exile` as a canonical effect atom but `types.ts` does not define it. The current `Effect` union is `DamageEffect | NoneEffect` — neither covers any movement or exile.

Even if Gap 1 were closed (by adding an unconditional phase or direct-effect family), the effect itself has no type.

**Proposed atom addition:**

```typescript
export type TransportExileEffect = {
  readonly kind: "transport_exile";
  readonly destination:
    | { readonly kind: "plane"; readonly description: string }
    | { readonly kind: "teleportation_circle"; readonly knownSigil: true };
  readonly targetSelection: TargetSelection;
  readonly destinationPrecision: "dm_determined" | "sigil_exact";
};

export type Effect = DamageEffect | NoneEffect | TransportExileEffect;
```

The `destinationPrecision: "dm_determined"` field records the DM-agenda aspect without collapsing it into the core mechanic. The transport still fires deterministically; only the exact landing coordinates are DM-owned.

---

## Full honest encoding (if both gaps were closed)

With the two widenings above, Plane Shift would encode as:

```
family: "direct_effect"
level: 7, school: "conjuration"
castingTime: { kind: "action" }
range: { kind: "touch" }
duration: { kind: "instantaneous" }
attachment: { kind: "target", selection: { mode: "choose_up_to", count: { kind: "fixed", uses: 9 } } }
effect: {
  kind: "transport_exile",
  destination: { kind: "plane", description: "caster-specified plane" },
  targetSelection: ...,
  destinationPrecision: "dm_determined"
}
```

The alternative sigil-circle mode would be a second `direct_effect` phase or a variant field on the destination.

---

## Scope note

The same two gaps block encoding of: Misty Step, Dimension Door, Teleport, Teleportation Circle, Word of Recall, Transport via Plants, Tree Stride, Etherealness, and others. Closing Gap 1 (unconditional phase / direct_effect family) + Gap 2 (transport_exile effect) unlocks the entire movement-spell cluster.
