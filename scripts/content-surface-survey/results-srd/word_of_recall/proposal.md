# Proposal: Word of Recall — structural_widening

## Unit

- **Slug**: word_of_recall
- **Kind**: spell (level 6, Conjuration)
- **SRD text**: "You and up to five willing creatures within 5 feet of you instantly teleport to a previously designated sanctuary. You must designate a location, such as a temple, as a sanctuary by casting this spell there."

## Why this is structural_widening

Word of Recall cannot be honestly encoded in any existing `SpellMechanics` family because it has **two categorically different cast behaviors** packaged in one spell card:

### Cast mode 1 — Designation

When cast at a location the caster wishes to designate:
- No effect on any creature or area at cast time
- Stores the current location permanently in a caster-level character state ("my sanctuary is here")
- No duration limit — the designation persists indefinitely
- No trigger, no attachment, no effect in the surface sense

This is not representable as `activation` (no effect), `ongoing_effect` (no persistent operation on an attachment), `anchored_trigger` (not a location-based event trigger), or `triggered_reaction`.

### Cast mode 2 — Recall

When cast from any location after a sanctuary has been designated:
- Teleports caster + up to 5 willing creatures within 5 feet to the stored sanctuary
- Instantaneous
- No roll, no save

This requires:
1. A `transport` effect variant not in the current `Effect` type
2. A group-including-caster attachment not in the current `Attachment` type
3. A reference to the stored sanctuary anchor (not representable as a range or target)

### The structural gap

The dual-mode pattern is the core blocker. Both the `anchored_trigger` family and the concept of two-phase spells (designation → recall) are thematically related, but:

- `anchored_trigger` anchors to a **location** and fires when an **environmental event** occurs (physical contact, entering area). Word of Recall's recall phase fires when the **caster casts the spell again** from **any location** — the stored state is on the **caster**, not the location.
- There is no existing family for "spell whose first cast records a caster-level anchor and whose subsequent casts consume that anchor."

## Required widenings

### 1. New subgraph / family: `designation_recall`

A two-phase spell family:
- **Phase A** (`store_caster_anchor`): cast at a location → records `{ location: current_position }` as a caster-level persistent state. Procedure atom: `store` (v4 has this). New lifecycle: no expiry (designation persists until overwritten by a new designation cast).
- **Phase B** (`recall`): cast from anywhere → consumes the stored anchor, applies transport effect to the attachment group. Procedure atom: `activate`. New prerequisite check: `requires` the caster to have a stored anchor.

### 2. New surface `Effect` variant: `transport`

```typescript
export type TransportEffect = {
  readonly kind: "transport";
  readonly destination: "caster_sanctuary_anchor";
};
```

v4 has `transport_exile` (involuntary exile to demiplane/home plane). This spell uses voluntary, willing teleportation to a player-designated location — a semantically distinct effect. The v4 taxonomy should add `transport` as a distinct atom from `transport_exile`.

### 3. New surface `Attachment` variant: `self_and_nearby`

```typescript
// Caster + willing creatures within radius
| {
    readonly kind: "self_and_nearby";
    readonly withinFeet: number;
    readonly filter: "willing";
    readonly maxCount: number;
  }
```

The recall cast targets "you and up to five willing creatures within 5 feet." This is not:
- `self` — caster only
- `target { mode: "one" }` — excludes caster
- `area` — doesn't capture willingness or the "including caster" semantic
- `mark` — no stateful binding

### 4. Caster-level persistent anchor concept

The designation mechanic stores a `{ location }` fact on the caster that:
- Persists indefinitely (no `expire` atom needed)
- Can be overwritten by a subsequent designation cast
- Is a prerequisite for the recall cast

This likely needs a new lifecycle atom (`persist_on_caster`) or a `character_state` resource atom — currently not in v4.

## Narrowest classification

`structural_widening` — the dual-mode cast pattern (designation + recall) doesn't map to any existing `SpellMechanics` family. Even with the `transport` effect and `self_and_nearby` attachment added as surface widenings, the designation cast still has no honest family.

If the recall cast were modeled in isolation (pretending no designation mechanic exists), the classification would be `surface_widening` (needs `transport` in `Effect` + `self_and_nearby` in `Attachment`). But doing so would be dishonest — the designation cast is the primary mechanical innovation of the spell and cannot be omitted without misrepresenting the rule.
