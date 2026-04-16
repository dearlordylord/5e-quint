# Proposal: Widening for Regenerate

## Outcome: `structural_widening`

No honest encoding is possible. No dhall or JSON authored.

---

## Spell mechanics (source text)

- **Level 7 Transmutation** | Casting Time: 1 minute | Range: Touch | Duration: 1 hour (timed, no concentration)
- **Effect A (activation):** "A creature you touch regains 4d8 + 15 Hit Points."
- **Effect B (ongoing):** "For the duration, the target regains 1 Hit Point at the start of each of its turns."
- **Effect C (rider):** "any severed body parts regrow after 2 minutes."

---

## Why each existing family fails

### `activation`
Models a one-shot resolution at cast time. Could carry Effect A (if a `heal` variant existed in the spell `Effect` type), but Effect B — the ongoing 1-HP-per-turn regeneration that persists for 1 hour — cannot be expressed. Dropping Effect B is dishonest; it is the spell's defining mechanic.

### `ongoing_effect`
Models a persistent operation on a target while the spell lasts. Could theoretically carry Effect B, but `OngoingOperation` has no `periodic_heal` variant (only `roll_modifier` and `damage_on_hit`). And Effect A — the immediate 4d8+15 heal that fires the moment the spell is cast — cannot be expressed in the `ongoing_effect` family at all. Dropping Effect A is also dishonest.

### `triggered_reaction`, `anchored_trigger`
Wrong structural shape; Regenerate is not reaction-triggered and does not plant an armed trigger.

---

## Required widenings

### 1. New compound family (structural)

A new spell family — call it `compound_spell` or `activation_with_ongoing` — is needed to express:
- An **activation phase** that fires immediately on cast (consumes the casting-time quota, applies an instant effect)
- A **persistent ongoing operation** that continues for the spell's duration

This is analogous to how a spell can have both an immediate effect and a sustained rider, but the current surface has no composition mechanism for this. The family header is the same (`SpellMechanicsHeader`); what changes is the payload:

```typescript
export type CompoundSpellMechanics = SpellMechanicsHeader & {
  readonly family: "compound_spell";
  readonly onCast: ReadonlyArray<ActivationPhase>;   // immediate phases
  readonly ongoing: {                                  // persistent operation
    readonly attachment: Attachment;
    readonly operation: OngoingOperation;
  };
};
```

### 2. Heal variant in spell `Effect` (surface)

`Effect` is currently `DamageEffect | NoneEffect`. A heal effect is needed for spell-triggered restoration:

```typescript
export type HealEffect = {
  readonly kind: "heal";
  readonly amount: DiceAmount;
  readonly target: "self" | "target_creature";
};
```

The class-feature layer already has `HealHpEffect` with the same shape. Spell-level healing needs the same variant so the tracer can emit a `heal` atom.

### 3. `periodic_heal` variant in `OngoingOperation` (surface)

`OngoingOperation` is currently `RollModifierOperation | DamageOnHitOperation`. A periodic heal is needed:

```typescript
export type PeriodicHealOperation = {
  readonly kind: "periodic_heal";
  readonly amount: DiceAmount;
  readonly trigger: { readonly kind: "turn_start" };  // start of target's turn
};
```

This would emit `heal` (atom) chained from a `turn_start_window` in the tracer.

### 4. Body part regrowth (possible dm_agenda / atom gap)

Effect C ("severed body parts regrow after 2 minutes") is a physical restoration effect with no counterpart in the v4 atom inventory. The closest atom is `return_on_end` (restores state at spell end), but regrowth:
- fires mid-duration (after 2 in-spell minutes, not at spell end)
- restores physical anatomy, not a mechanical state variable

This may legitimately be `dm_agenda` under ARCHITECTURE.md — physical anatomy restoration is a narrative outcome with no deterministic combat mechanic. Recorded here as a gap for the project owner to classify. If it is to be modeled, a new `restore_body` atom or an extension to `persist` + `expire` with a sub-timer shape would be needed.

---

## Tracer impact

Once the compound family and the two surface widenings land:
- Tracer needs a new `traceCompoundSpell` branch in `traceSpellMechanics`
- The `heal` atom would be emitted from both the on-cast phase and the ongoing per-turn operation
- The `turn_start_window` atom (already in v4) would be the window that `opens_window` → `heal`
- The `persist` + `expire` lifecycle chain (already in tracer) handles the 1-hour duration

No new v4 atoms are required for Effects A and B once the surface types are widened; `heal` and `turn_start_window` are both already in the v4 inventory.
