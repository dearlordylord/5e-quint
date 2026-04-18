# Proposal: Telekinesis surface widenings

**Unit**: Telekinesis (spell, Level 5, Transmutation, Concentration 10 min)
**Outcome**: `surface_widening`
**SRD section**: Spells/Descriptions-T#Telekinesis

---

## Why it doesn't fit today

The payload family is `ongoing_effect`: Concentration, and on each later turn the caster spends a Magic action to reactivate the telekinetic grip on a new or the same target. The trigger `on_caster_spends_action { kind: "standard_action", action: "magic" }` exists. The blocking gaps are four surface shapes that don't yet exist.

---

## Widening 1 — `force_move.direction: "any_direction"`

### Current surface

```typescript
readonly direction: "push" | "pull" | "slide";
```

- `push` = away from caster
- `pull` = toward caster
- `slide` = lateral (perpendicular)

### What the spell needs

Telekinetic movement is freely directed by the caster: horizontal in any compass direction, or vertical (lifting a creature/object into the air and suspending it). None of the existing variants covers upward or arbitrary-direction movement.

### Proposed addition

```typescript
readonly direction: "push" | "pull" | "slide" | "any_direction";
```

`any_direction` means the caster chooses the exact direction and axis at resolution time. This is already present in the grammar semantically (the SRD says "any direction within the spell's range") and is what distinguishes telekinesis from a knockback or a pull.

### Evidence

> "you move it up to 30 feet **in any direction** within the spell's range"
> "if you lift it into the air, it is suspended there"

---

## Widening 2 — `apply_condition.expiresOn?: RiderExpiry`

### Current surface

```typescript
| {
    readonly kind: "apply_condition";
    readonly condition: Condition | ReadonlyNonEmptyArray<Condition> | { kind: "choose"; ... };
  }
```

No duration field. An applied condition is assumed to persist for the spell's full concentration window.

### What the spell needs

The Restrained condition from the creature option lasts only **"until the end of your next turn"** — a sub-window of the 10-minute concentration duration. After one full turn cycle the condition lifts, regardless of whether the spell is still active. To re-impose it, the caster must spend the Magic action again on the same target and the target must fail again.

The `end_of_next_turn` variant of `RiderExpiry` already exists (used on `modify_roll_advantage`). The same variant is needed on `apply_condition`.

### Proposed addition

```typescript
| {
    readonly kind: "apply_condition";
    readonly condition: Condition | ReadonlyNonEmptyArray<Condition> | { kind: "choose"; ... };
    readonly expiresOn?: RiderExpiry;   // <-- new optional field
  }
```

When absent: condition persists for the spell's remaining duration (existing semantics preserved).
When `{ kind: "end_of_next_turn" }`: condition ends at the end of the caster's next turn.

The "suspended in air / falls at turn end" consequence is a natural gravity outcome once the Restrained condition expires — no new `fall` atom is required.

### Evidence

> "Until **the end of your next turn**, the creature has the Restrained condition, and if you lift it into the air, it is suspended there. It falls at the end of your next turn **unless you use this option on it again and it fails the save**."

---

## Widening 3 — per-activation target-mode branching in `OngoingEffectMechanics`

### Current surface

```typescript
export type OngoingEffectMechanics = SpellMechanicsHeader & {
  readonly family: "ongoing_effect";
  readonly attachment: Attachment;          // single, fixed at cast time
  readonly initialPhase?: ActivationPhase;
  readonly operations: ReadonlyNonEmptyArray<OngoingOperation>;
};
```

The `attachment` is established once at cast and applies to all operations. `CastTimeEffectModeChoice` allows switching modes mid-duration via a Magic action, but the choice is made once (and re-chosen later); it is not per-activation.

### What the spell needs

Each time the caster spends the Magic action, they independently choose to target either:
- **A creature** (Huge or smaller) → `target` attachment with Str save + force_move + Restrained
- **An object** (Huge or smaller) → `object` attachment, with or without Str save depending on whether the object is worn/carried

This is not "choose a mode once then optionally change it." It is a fresh choice on every activation, picking from two structurally different attachment kinds. The caster can also "choose a new one at any time", meaning the prior target's effects end immediately.

### Proposed addition

An optional `perActivationMode` field on `OngoingOperation` (or equivalently a per-activation branching structure on `OngoingEffectMechanics`) that lets a single trigger open a choice among multiple sub-operations with different attachment kinds:

```typescript
// Sketch only — exact shape TBD by schema designer
export type OngoingOperation = {
  readonly trigger: OngoingTrigger;
  readonly predicate?: OngoingPredicate;
  readonly effect: OngoingEffect;
} | {
  readonly trigger: OngoingTrigger;
  readonly activationChoice: ReadonlyNonEmptyArray<{
    readonly label: string;
    readonly attachment: Attachment;
    readonly effect: OngoingEffect;
  }>;
};
```

This unlocks spells where each use of the ongoing action has a first-class branching structure across different target kinds.

### Evidence

> "you can exert your will on **one creature or object** that you can see within range, causing the **appropriate effect below**. You can affect the same target round after round or **choose a new one at any time**. If you switch targets, the prior target is no longer affected by the spell."

---

## Widening 4 — object-state predicate on `save_gate` in ongoing operations

### Current surface

`save_gate` inside an `OngoingOperation.effect` has no predicate for the physical state of the targeted object. Every `save_gate` always requires the save.

### What the spell needs

For the object option, the save is **conditional**:
- Object **not worn or carried** → automatic force_move, no save at all
- Object **worn or carried** by a creature → Str save; on fail, force_move

The worn/carried state of an object at resolution time is not a character-level predicate (not HP threshold, not a condition) — it is a world-state fact about the object. No existing `OngoingPredicate` covers this.

### Proposed addition

A new `OngoingPredicate` variant (or an optional `requiresCondition` on `save_gate`) that gates the save on whether the targeted object is held/worn:

```typescript
// Existing OngoingPredicate
export type OngoingPredicate = {
  readonly kind: "at_hp_threshold";
  ...
};

// New variant
| {
    readonly kind: "object_is_worn_or_carried";
  }
```

When this predicate is absent (failing), the effect fires as a direct force_move. When it holds, the save_gate fires normally.

### Evidence

> "If the object **isn't being worn or carried**, you **automatically** move it up to 30 feet in any direction within the spell's range."
> "If the object **is worn or carried** by a creature, that creature **must succeed on a Strength saving throw**..."

---

## Omitted mechanics (DM-agenda / narrative)

The "fine control" clause ("manipulating a simple tool, opening a door or a container, stowing or retrieving an item from an open container, or pouring the contents from a vial") describes qualitative narrative capability with no deterministic mechanical outcome. It is correctly out of the core mechanics surface per ARCHITECTURE.md.

---

## Encoding path once widenings land

With all four above in place, the encoding would be:

- Family: `ongoing_effect`
- Attachment: per-activation choice (Widening 3) between `target` (Huge-or-smaller creature) and `object` (Huge-or-smaller object)
- Trigger: `on_caster_spends_action { kind: "standard_action", action: "magic" }`
- Creature branch: `save_gate` (Str, caster spell save DC) → on fail: `composite` [ `force_move { direction: "any_direction", distanceFeet: 30 }`, `apply_condition { condition: "restrained", expiresOn: { kind: "end_of_next_turn" } }` ]
- Object branch (uncarried): direct `force_move { direction: "any_direction", distanceFeet: 30 }`
- Object branch (worn/carried): `save_gate` with object-state predicate (Widening 4) → on fail: `force_move { direction: "any_direction", distanceFeet: 30 }`
