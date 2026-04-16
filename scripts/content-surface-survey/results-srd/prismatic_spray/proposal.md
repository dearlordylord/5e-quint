# Proposal: Prismatic Spray — structural_widening

## Unit

**Prismatic Spray** — Level 7 Evocation spell, SRD 5.2.1  
Slug: `prismatic_spray`

## Why the unit does not fit

Prismatic Spray cannot be encoded in any existing payload family. The dominant blocker is structural: the spell's core mechanic is a **per-target random dispatch table** — for each creature in the cone, the caster rolls 1d8 and the result selects one of 8 mutually exclusive effect outcomes. No existing family models this shape.

---

## Gap 1 — Missing subgraph: random dispatch table (structural_widening)

**Text:** *"For each target, roll 1d8 to determine which color ray affects it, consulting the Prismatic Rays table."*

The `activation` family's `phases` array is ordered and sequential — all phases execute in sequence for all targets. The `save_gate` phase has fixed `onFail`/`onSuccess` branches. Neither expresses **stochastic branch selection** where the active effect is chosen by a die roll at resolution time.

A new subgraph is needed: something like a `random_dispatch` phase or family that carries:
- a die expression (1d8)
- a table of `(result_range, effect_subgraph)` entries
- possibly a reroll predicate (see Gap 5)

This is the minimum structural addition. Without it, any encoding of Prismatic Spray would be a lie about what branch fires.

---

## Gap 2 — Missing area shape: cone (surface_widening)

**Text:** *"Eight rays of light flash from you in a 60-foot Cone."*

`Attachment.area` currently only supports `shape: { kind: "sphere"; radiusFeet: number }`. A cone shape is needed:

```typescript
| { readonly kind: "cone"; readonly lengthFeet: number }
```

This is a `surface_widening` — the attachment category and area atom both exist; only the shape variant is missing.

---

## Gap 3 — Missing surface shape: repeat_save with condition progression (surface_widening + atom_widening)

**Text (Indigo ray):** *"The target has the Restrained condition and makes a Constitution saving throw at the end of each of its turns. If it successfully saves three times, the condition ends. If it fails three times, it has the Petrified condition until it is freed by an effect like the Greater Restoration spell. The successes and failures needn't be consecutive; keep track of both until the target collects three of a kind."*

The v4 atom `condition_progression` exists and is the right atom for this. However, the surface has no `ActivationPhase` variant or effect shape that exposes it. The current `save_gate` phase is a one-shot binary: `onFail`/`onSuccess`. It cannot model:
- a repeating save (fires at end of each of the target's turns)
- non-consecutive counting of successes and failures toward independent thresholds
- a state machine with two terminal outcomes (Restrained ends vs. Petrified applies)

A new phase variant or embedded lifecycle subgraph is needed. Proposed shape sketch:

```typescript
{
  readonly kind: "repeat_save";
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly successThreshold: number;       // 3
  readonly failureThreshold: number;       // 3
  readonly consecutiveRequired: boolean;   // false
  readonly onSuccessThresholdMet: Effect;  // none (condition ends naturally)
  readonly onFailureThresholdMet: Effect;  // apply_condition: petrified
  readonly initialCondition: Condition;   // restrained (applied before tracking begins)
}
```

---

## Gap 4 — Missing surface effect: transport_exile (surface_widening)

**Text (Violet ray):** *"On a failed save, the condition ends, and the creature teleports to another plane of existence (DM's choice)."*

The v4 atom `transport_exile` exists but there is no `Effect` variant on the surface that maps to it. This is a `surface_widening` — add:

```typescript
export type TransportExileEffect = {
  readonly kind: "transport_exile";
  readonly destination: "dm_choice" | { readonly kind: "named_plane"; readonly planeName: string };
};
```

Note: `dm_choice` as a destination is itself a DM-agenda element. The plane selection is not deterministic. This edge case may warrant a note in `ARCHITECTURE.md` on whether transport_exile with `dm_choice` destination counts as a core mechanic or caller-owned.

---

## Gap 5 — Missing subgraph: recursive table dispatch with reroll filter (structural_widening)

**Text (Ray 8):** *"The target is struck by two rays. Roll twice, rerolling any 8."*

Ray 8 is a meta-outcome that: (a) invokes the dispatch table twice, (b) filters out result 8 from subsequent rolls, and (c) applies both selected effects. This is a recursive/compound dispatch with a reroll predicate that cannot be expressed even with Gaps 1–4 solved. It requires:

- A way for one table entry to be "invoke this table N times with a reroll predicate"
- Composition of independently-selected effects on the same target

This may be the hardest gap to close cleanly. One option: make result 8 a special `compound_dispatch` result kind with `count: 2, rerollOn: [8]`.

---

## Summary table

| Gap | Classification | Blocking? |
|-----|---------------|-----------|
| Random dispatch table (1d8 → N effects) | structural_widening | Yes — dominant blocker |
| Cone area shape | surface_widening | Yes — needed for any honest AoE encoding |
| Repeat save with condition progression | surface_widening (+ atom_widening for surface exposure) | Yes — for Indigo ray |
| transport_exile effect | surface_widening | Yes — for Violet ray |
| Recursive dispatch with reroll filter | structural_widening | Yes — for Ray 8 |

All five gaps must be resolved before Prismatic Spray can receive a clean trace. The random dispatch table (Gap 1) and the recursive meta-outcome (Gap 5) are the hardest — they require new structural concepts with no existing analogue in the surface vocabulary.
