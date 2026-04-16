# Surface Widening Proposal — Alarm

**Unit:** `alarm` (SRD 5.2.1, Level 1 Abjuration)
**Outcome:** `surface_widening`
**Confidence:** high

---

## What fits

The `anchored_trigger` family was designed with Alarm as the pressure case, and it handles the spell's core mechanics cleanly:

- **Store/release lifecycle** — `store` (consumes `action_quota` + `spell_slot`, grants `persist`→`expire`, attaches_to `area`) and `release` (the alarm firing) are both v4 atoms.
- **Area anchor** — `AnchorTarget { kind: "area"; shape: CubeShape }` with `maxSideFeet: 20` encodes the 20-foot-cube option.
- **Event triggers** — `physical_contact` and `enters_area` both present in the `TriggerEvent` union.
- **Creature exemption filter** — `creature_exemption_list` with `chosenAtCast: true` encodes the "designate creatures that won't set off the alarm" mechanic.
- **Signals (cast-time menu)** — Both `audible` (handbell, 10 s, 60 ft radius) and `mental` (1 mile, awakens if asleep) fit the `AnchoredSignal` union. The existing `signals: ReadonlyArray<AnchoredSignal>` field carries both as a cast-time choice menu using the Optional-field trick (Dhall `None T` → field omitted → exact discriminated-union JSON shape). Typecheck passes; tracer handles both `kind` values without unhandled branches.
- **Duration/ritual** — 8-hour timed duration and 1-minute ritual casting time are fully representable.

No new atoms or relations are needed. All nine atoms referenced (`action_quota`, `area`, `expire`, `persist`, `post_action_window`, `release`, `spell_root`, `spell_slot`, `store`) are in the v4 closed inventory.

---

## The surface gap

### Primary: `anchor` is singular — cast-time choice is unrepresentable

The SRD text:

> "Choose a door, a window, or an area within range that is no larger than a 20-foot Cube."

Alarm offers two mechanically distinct anchor kinds at cast time:

| Option | Current surface type | Representable? |
|--------|---------------------|----------------|
| `{ kind: "location"; description: "door_or_window" }` | `AnchorTarget` | Yes (variant exists) |
| `{ kind: "area"; shape: { kind: "cube"; maxSideFeet: 20 } }` | `AnchorTarget` | Yes (variant exists) |
| "pick one of the above at cast time" | `AnchoredTriggerMechanics.anchor` | **No** |

`AnchoredTriggerMechanics.anchor` is typed as a singular `AnchorTarget`:

```typescript
interface AnchoredTriggerMechanics {
  // ...
  anchor: AnchorTarget   // singular — only one anchor type per record
  // ...
}
```

The current encoding uses `area` as canonical and silently omits the `location` option. This is correct enough to pass typecheck and the tracer, but it fails to represent the actual spell: a caster targeting a door gets a mechanically different anchor than one targeting a cube area.

---

## Proposed widenings

### Option A — Widen `anchor` to `ReadonlyArray<AnchorTarget>` (preferred)

Follow the existing pattern for `events`, `filters`, and `signals`, all of which are arrays carrying the menu of available options:

```typescript
interface AnchoredTriggerMechanics {
  anchor: ReadonlyArray<AnchorTarget>  // cast-time choice from this menu
  events: ReadonlyArray<TriggerEvent>
  filters: ReadonlyArray<TriggerFilter>
  signals: ReadonlyArray<AnchoredSignal>
}
```

The Alarm Dhall encoding then becomes:

```dhall
, anchor =
    [ { kind = "location"
      , description = Some "door_or_window"
      , shape = None { kind : Text, maxSideFeet : Natural }
      }
    , { kind = "area"
      , description = None Text
      , shape = Some { kind = "cube", maxSideFeet = 20 }
      }
    ]
```

**Advantages:** consistent with the surface's array-as-choice-menu pattern; no new type variants; Dhall Optional-field trick applies directly; the tracer's existing array-walk logic handles it without changes.

**Risk:** semantics of a single-element `anchor` array vs. a two-element array need to be documented (single = no choice; two = pick one). This is already implicit in `signals` — same semantics, same documentation need.

### Option B — Add a `choice_at_cast` wrapper variant

```typescript
type AnchorTarget =
  | { kind: "location"; description: string }
  | { kind: "area"; shape: CubeShape }
  | { kind: "choice_at_cast"; options: ReadonlyArray<Exclude<AnchorTarget, { kind: "choice_at_cast" }>> }
```

**Advantages:** makes the cast-time choice semantically explicit at the type level; `anchor` field stays singular.

**Risk:** recursive type reference; adds a new variant to the `AnchorTarget` union; tracer needs a new branch for `choice_at_cast`; more surface complexity for a pattern that arrays already handle elsewhere.

---

## Secondary observation — signals array semantics

The `signals` array currently means "the caster picks one of these at cast time." That interpretation works for Alarm because signals are entirely caller-owned (no engine-level branching on which signal fires). If a future spell has mechanically distinct outcome branches keyed on signal type (e.g., different durations, different resolution steps), the array-as-menu semantics may not be sufficient and a proper `choice_at_cast` encoding at the signal level would be needed. This is not a gap for Alarm — noting it here for surface evolution tracking.

---

## Recommendation

Implement **Option A** (widen `anchor` to `ReadonlyArray<AnchorTarget>`). It is consistent with the existing surface design, requires no new type variants, and the Dhall Optional-field trick applies without modification. Update `AnchoredTriggerMechanics` in `types.ts`, update the tracer's anchor-walk path to iterate the array, and re-encode `alarm.dhall` with both anchor options.
