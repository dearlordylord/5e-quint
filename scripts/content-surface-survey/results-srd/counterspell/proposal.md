# Proposal: Surface Widenings for Counterspell

**Unit:** `counterspell` (Spell, Abjuration, Level 3, SRD 5.2.1)
**Outcome:** `surface_widening`
**Family:** `triggered_reaction` (correct — Counterspell is a reaction spell with instantaneous duration)

---

## Why the unit cannot be encoded honestly

Counterspell fits the `triggered_reaction` family in structure (reaction-timed, instantaneous, uses Prepare/Prompt/Commit subgraph). However, two closed surface types — `ReactionTrigger` and `ReactionEffect` — lack the variants needed to represent Counterspell's mechanics without lying.

---

## Gap 1: `ReactionTrigger` — missing `see_creature_casting_spell` variant

### Current closed grammar

```typescript
export type ReactionTrigger =
  | { readonly kind: "hit_by_attack_roll" }
  | { readonly kind: "targeted_by_named_spell"; readonly spellId: string }
  | { readonly kind: "any_of"; readonly triggers: ReadonlyArray<ReactionTrigger> };
```

### What Counterspell needs

> *"which you take when you see a creature within 60 feet of yourself casting a spell with Verbal, Somatic, or Material components"*

This trigger is:
- **Observer-relative**, not self-relative (you see *a creature*, not a spell targeting you)
- **Range-constrained** (60 feet)
- **Open to any spell** with observable components (V, S, or M)

Neither `hit_by_attack_roll` (Shield) nor `targeted_by_named_spell` (Magic Missile shield case) nor their `any_of` combination can express this. A new variant is needed:

```typescript
| {
    readonly kind: "see_creature_casting_spell";
    readonly rangeConstraint: "within_caster_range";
  }
```

The component filter (V/S/M) is part of the SRD trigger text but can be treated as intrinsic to this variant: only spells with observable components can be Counterspelled (a spell cast with no components at all, if such a thing existed, would not satisfy the trigger).

---

## Gap 2: `ReactionEffect` — missing save-gated negate of current casting

### Current closed grammar

```typescript
export type ReactionEffect =
  | { readonly kind: "modify_ac"; readonly delta: number }
  | {
      readonly kind: "negate_named_effect";
      readonly spellId: string;
      readonly scope: "damage_only" | "all_effects";
    };
```

### What Counterspell needs

> *"The creature makes a Constitution saving throw. On a failed save, the spell dissipates with no effect, and the action, Bonus Action, or Reaction used to cast it is wasted. If that spell was cast with a spell slot, the slot isn't expended."*

Three distinct properties that neither current variant can express:

1. **Embedded Con saving throw.** The effect is gated on a Con save by the creature whose spell is being interrupted. The current `ReactionEffect` type has no save gate; effects just fire. The save outcome determines whether the spell is negated.

2. **Dynamic spell reference.** `negate_named_effect` requires a fixed `spellId` known at authoring time (e.g., `"magic_missile"`). Counterspell targets *the spell currently being cast* — a runtime reference, not a static name. There is no mechanism to express "whichever spell triggered this reaction."

3. **Slot-preservation clause.** When the save fails and the spell is negated, the spell slot used to cast the interrupted spell is NOT expended. This is explicit SRD text and represents a distinct effect on the target's resources. It must be modeled, not left implicit in a generic negate.

### Proposed new variant

```typescript
| {
    readonly kind: "save_gate_negate_current_casting";
    readonly ability: Ability;             // "con"
    readonly dc: DcSource;                 // caster_spell_save_dc
    readonly onFail: {
      readonly kind: "negate_current_casting";
      readonly preservesSpellSlot: boolean; // true
    };
    readonly onSuccess: { readonly kind: "none" };
  }
```

This variant:
- Embeds the save gate in the effect itself (rather than at the `TriggeredReactionMechanics` level)
- Uses a dynamic "current casting" reference rather than a named spellId
- Carries the slot-preservation flag explicitly

---

## Scope of atoms

All underlying v4 atoms exist and are reachable:
- `save_gate` — for the Con save
- `negate_named_effect` (or a close sibling) — for the spell negation concept
- `reaction_quota`, `reaction_window`, `prepare`, `prompt`, `commit` — already wired in `traceTriggeredReaction`
- `spell_slot` — for the slot-preservation edge (new: `preserves` relation from the negate effect back to the interrupted spell's slot)

The gap is in the surface vocabulary that *composes* these atoms into the Counterspell shape, not in the atoms themselves. This is a `surface_widening`, not an `atom_widening`.

---

## Minimal widening path

1. Add `see_creature_casting_spell` to `ReactionTrigger`.
2. Add `save_gate_negate_current_casting` to `ReactionEffect` (or alternatively add a top-level `saveGate` field to `TriggeredReactionMechanics` to gate all effects).
3. Extend `traceReactionEffect` in `tracer.ts` to handle the new variant, emitting a `save_gate` resolution node with `branches_on_save` edges leading to a `negate_current_casting` effect node.
4. Consider adding a `preserves` relation from the negate effect to a `spell_slot` node to represent the slot-preservation clause in the trace graph.

No new atoms required, no family change required. The `triggered_reaction` family is the correct home for Counterspell once these two surface variants exist.
