# Proposal: Charm Person surface widenings

## Outcome: `surface_widening`

The core mechanic typechecks and traces cleanly. Three mechanics from the spell text cannot be expressed in the current surface types.

---

## What fits

| Mechanic | How encoded |
|---|---|
| Action casting time | `castingTime: { kind: "action" }` |
| 30 ft point range | `range: { kind: "point", feet: 30 }` |
| V/S components, no material | `components: { v: true, s: true, m: false }` |
| 1 hour timed duration | `duration: { kind: "timed", value: { unit: "hour", amount: 1 } }` |
| WIS saving throw | `save_gate` phase with `ability: "wis"` |
| Charmed condition on fail | `onFail: { kind: "apply_condition", condition: "charmed" }` |
| Nothing on success | `onSuccess: { kind: "none" }` |
| Slot-scaled target count (+1/slot above 1) | `TargetSelection.choose_up_to` with `SlotScaling<number>` |

---

## Gap 1: Conditional advantage on saving throw

**Rule text:** "It does so with Advantage if you or your allies are fighting it."

**Problem:** The `save_gate` `ActivationPhase` has no field for a conditional advantage modifier on the target's throw. The v4 atom `modify_roll_advantage` exists in the effect category, but here it modifies an *input* to the resolution (the save roll itself), not an output effect. There is no `saveAdvantageIf` or similar predicate on `save_gate`.

**Proposed widening:** Add an optional field to the `save_gate` phase shape:

```typescript
export type SaveGateAdvantageCondition =
  | { readonly kind: "if_caster_or_allies_in_combat" };

// In ActivationPhase save_gate variant:
readonly saveAdvantageCondition?: SaveGateAdvantageCondition;
```

This is a `new_variant` on an existing surface type. All v4 atoms involved already exist.

---

## Gap 2: Damage-triggered early break on timed duration

**Rule text:** "...the Charmed condition until the spell ends **or until you or your allies damage it**."

**Problem:** The `Duration` type supports `timed` (fixed expiry) and `concentration` (ends on break). There is no way to attach a secondary break trigger to a `timed` duration. The v4 lifecycle atom `break` exists but is not surfaced in the TS types. The charmed condition in this spell ends on a specific in-combat event (any damage from the caster's side), which is mechanically distinct from concentration loss.

**Proposed widening:** Extend the `timed` duration variant with an optional break condition, or add a new `break_trigger` surface shape:

```typescript
export type BreakCondition =
  | { readonly kind: "damaged_by_caster_or_allies" };

// Option A — extend timed Duration:
// { kind: "timed"; value: DurationValue; breakIf?: BreakCondition }

// Option B — separate break_trigger EffectAtom:
// { kind: "break_trigger"; condition: BreakCondition }
```

Option A keeps the expiry logic co-located with the duration. Option B allows break conditions to be reused across spell families. Either is a `new_variant` of an existing surface shape; the v4 `break` atom covers it.

---

## Gap 3: Creature-type filter on target attachment

**Rule text:** "One **Humanoid** you can see within range..."

**Problem:** The `target` Attachment variant has no `creatureTypeFilter` field. The Humanoid-only restriction cannot be expressed; it is silently dropped. Charm Monster (the higher-level version targeting any creature type) encodes identically to Charm Person under the current surface — the distinction between them is lost.

**Proposed widening:** Add an optional filter field to the `target` Attachment:

```typescript
export type CreatureTypeFilter = ReadonlyArray<CreatureType>;
// In target Attachment variant:
readonly creatureTypeFilter?: CreatureTypeFilter;
```

where `CreatureType` covers the SRD 5.2.1 creature types (humanoid, beast, undead, …). This is a `new_variant` on the target attachment shape.

---

## Dropped narrative / DM-agenda

- **"The Charmed creature is Friendly to you."** — This restates the mechanical consequence of the `charmed` condition (regarding the charmer as a Friendly creature per SRD Rules Glossary). No additional atom is needed; `apply_condition: charmed` encodes it.
- **"When the spell ends, the target knows it was Charmed by you."** — Pure narrative. No mechanical resolution. Correctly omitted.
