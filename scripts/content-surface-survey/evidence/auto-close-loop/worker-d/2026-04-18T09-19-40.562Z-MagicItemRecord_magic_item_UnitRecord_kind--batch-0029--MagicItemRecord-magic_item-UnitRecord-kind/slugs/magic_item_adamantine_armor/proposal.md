## Adamantine Armor

Outcome: `surface_widening`

Adamantine Armor clearly fits the existing `magic_item` top-level kind and the `passive` mechanics family:

- it is an always-on benefit while worn;
- it does not use charges, rests, or an activation procedure;
- it is not DM-agenda.

The gap is narrower than a new family: the current effect vocabulary has no honest way to express **incoming critical-hit suppression**.

### Why the current surface is insufficient

The closest existing effect is `modify_crit_range`, but that atom means:

- changing the natural-roll threshold on attack rolls that crit;
- traced today as an outgoing attack-roll modifier (`crits on 19-20`, etc.).

That is not Adamantine Armor's rule. The item does **not** change what number an attacker needs to roll to crit. It changes the **resolution outcome after a critical hit already exists**:

> "While you're wearing it, any Critical Hit against you becomes a normal hit."

Encoding Adamantine Armor with `modify_crit_range` would therefore create a false trace.

### Narrowest honest widening

Add a new `EffectAtom` variant for wearer-side critical-hit negation / downgrade, for example:

```ts
{ readonly kind: "downgrade_incoming_critical_hit" }
```

or equivalently named:

```ts
{ readonly kind: "grant_critical_hit_immunity" }
```

This should mean:

- while the host effect is active on the wearer;
- if an attack against that wearer would be a Critical Hit;
- resolve it as a normal hit instead.

### Classification rationale

- `surface_widening`, not `structural_widening`: the unit already fits `magic_item` + `passive`.
- not `atom_widening`: this is best understood as a missing effect-surface variant for an already-valid family, not a new top-level source/procedure/attachment/subgraph shape.

### Authoring decision

No `content/magic_item_adamantine_armor.dhall` was authored. A fake passive record using `modify_crit_range` would have been misleading.
