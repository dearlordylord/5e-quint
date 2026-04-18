# Proposal: Arcane Lock — surface_widening

## Unit

- **Name:** Arcane Lock
- **Slug:** arcane_lock
- **Kind:** spell / level 2 / Abjuration
- **Provenance:** srd-5.2.1

## Why the unit does not fit

Arcane Lock is structurally closest to `ongoing_effect` — it applies persistent state to a target with no combat resolution and no concentration. However, it requires three new variants of existing surface types before it can be encoded honestly. Writing a `content/arcane_lock.dhall` with the current surface would require fabricating a false duration, a false attachment, and a false operation — all three guardrail violations.

---

## Widening 1 — `Duration: permanent`

**Surface type:** `Duration`

**Current variants:** `instantaneous` | `concentration` | `timed`

**Missing variant:**
```typescript
{ readonly kind: "permanent"; readonly endsOn: "dispel" }
```

**Evidence:** The 5etools source encodes `"type": "permanent", "ends": ["dispel"]`. The spell's lock persists indefinitely; only *Dispel Magic* (or similar) removes it. This is mechanically distinct from `timed` (which expires on a clock) and from `concentration` (which the caster can drop and which breaks on damage).

**Scope:** narrow — only spells with permanent-until-dispelled duration. Alarm used `timed` for its 8-hour ward, but Arcane Lock has no time bound at all. Other candidates with this duration shape: Forbiddance, Glyph of Warding, Symbol.

---

## Widening 2 — `Attachment: object`

**Surface type:** `Attachment`

**Current variants:** `self` | `target` (creature) | `area` | `mark`

**Missing variant:**
```typescript
| {
    readonly kind: "object";
    readonly description: string;  // "door_window_gate_container_or_hatch" etc.
  }
```

**Evidence:** `"You touch a closed door, window, gate, container, or hatch"`. The attachment target is a physical object, not a creature. The v4 taxonomy already includes `object` as an attachment atom (§3 Attachment Atoms), so this is a surface exposure of an existing v4 concept, not a new atom.

**Scope:** narrow for combat-relevant spells; broader for utility/abjuration spells that affect the environment (Arcane Lock, Continual Flame, Magic Mouth, Glyph of Warding, Guards and Wards).

---

## Widening 3 — `OngoingOperation: lock_object` (maps to v4 `block_travel`)

**Surface type:** `OngoingOperation`

**Current variants:** `roll_modifier` | `damage_on_hit`

**Missing variant:**
```typescript
| {
    readonly kind: "lock_object";
    readonly exemptions?: "caster_and_designated_creatures";
  }
```

Or more generically, a `block_access` operation with a closed filter enum.

**Evidence:** `"This lock can't be unlocked by any nonmagical means."` The mechanical effect is access-blocking on the attached object. The v4 atom `block_travel` covers this. Neither `roll_modifier` nor `damage_on_hit` is honest — the spell has no roll, no damage, and no ongoing hit condition.

**Scope:** covers all spells that apply persistent access/movement restrictions to objects or areas (Arcane Lock, Forcecage, Wall of Force).

---

## Secondary omission — password mechanic

The spell also includes: `"You can also set a password that, when spoken within 5 feet of the object, unlocks it for 1 minute."`

This is a **secondary, conditional suppression trigger** — a spoken-word event within range temporarily suppresses the lock. It would require:
- A new event kind in some trigger grammar (spoken word / password match)
- A `suppress` procedure (v4 has `suppress` as a procedure atom) that temporarily suspends the lock operation
- A `timed` sub-duration (1 minute) on the suppression

This is not the primary encoding blocker (the three widenings above are) but it represents additional surface work beyond them. The password mechanic is a pure runtime/adjudication concern in many interpretations, but the 1-minute suppression is deterministic enough to belong in core.

---

## Recommended encoding shape (after widenings)

```
ongoing_effect family:
  castingTime: { kind: "action" }
  range: { kind: "touch" }
  duration: { kind: "permanent", endsOn: "dispel" }   ← widening 1
  attachment: { kind: "object", description: "door_window_gate_container_or_hatch" }  ← widening 2
  operation: { kind: "lock_object", exemptions: "caster_and_designated_creatures" }   ← widening 3
```

Password mechanic would add a sub-trigger on the operation, deferred to a later widening pass.
