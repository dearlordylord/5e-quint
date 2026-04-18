# Proposal: Arcane Lock — atom_widening

## Unit

**Arcane Lock** — Level 2 Abjuration (SRD 5.2.1)

> You touch a closed door, window, gate, container, or hatch and magically lock it for the duration. This lock can't be unlocked by any nonmagical means. You and any creatures you designate when you cast the spell can open and close the object despite the lock. You can also set a password that, when spoken within 5 feet of the object, unlocks it for 1 minute.

## Why it doesn't fit

The spell is structurally an `activation` spell with a `permanent` duration (ended only by `dispel`), applied via a `direct` phase to an `object` attachment. All of that fits cleanly. The gap is the **effect atom**.

### Gap 1 — No `lock_object` atom

The core mechanic is: "this object cannot be opened or unlocked by nonmagical means." The only existing atom with adjacent semantics is `block_travel` (`scope: string`), which is documented as covering Wall of Force and Forcecage — absolute planar/geometric barriers that block creature movement through space. Arcane Lock is categorically different:

- It targets a specific openable object, not a space.
- Authorized creatures can bypass it freely (open and close the object normally).
- It prevents *opening/unlocking* by nonmagical means, not *passage* through space.
- Magical means (knock, dispel magic) can still overcome it.

Using `block_travel` here would emit a trace saying "block_travel (scope: ...)" which misrepresents the mechanics. A creature walking up to a locked door has not had their travel blocked — they just can't open the door.

### Gap 2 — Authorized-bypass list

"You and any creatures you designate when you cast the spell can open and close the object despite the lock."

The authorized-bypass list is cast-time-determined and mechanically deterministic (a creature either is or isn't on the list). No existing effect atom carries a bypass-exemption list as a parameter. This is not DM-agenda: there is a crisp yes/no answer at runtime.

### Gap 3 — Password mechanic

"You can also set a password that, when spoken within 5 feet of the object, unlocks it for 1 minute."

The password content is DM-agenda (what the password is, how it's detected). But the *mechanical consequence* (the object is unlocked for 1 minute) is deterministic. This is an anchored-trigger-like shape (event: password spoken within 5 ft → unlock for 1 minute) applied to the object. The closest existing family is `anchored_trigger`, but that spell family plants a trigger in a location and emits a signal — it doesn't apply a timed unlock to an object. The temporary unlock effect itself has no atom.

### Gap 4 — ObjectFilter precision

The spell targets "a closed door, window, gate, container, or hatch" — closeable architectural/containment elements. The existing `ObjectFilter` offers:
- `material`: `"metal" | "flammable"` — does not cover wood, stone, etc.
- `heldOrWorn`: `"required" | "forbidden"` — not relevant
- `manufactured: boolean` — true but vastly over-broad (covers weapons, furniture, etc.)

A `closeable_element` filter variant (or an open-string enum for object category) would express this honestly.

## Proposed widening

### 1. New atom: `lock_object`

```typescript
| {
    readonly kind: "lock_object";
    // Authorized creatures bypass the lock entirely (can open/close normally).
    readonly authorizedBypass: "caster_and_designated_at_cast";
    // What means are blocked from overcoming the lock.
    readonly blockedMeans: "nonmagical";
  }
```

Emits as an `effect` atom. Connected via `direct_apply → lock_object → object attachment`.

### 2. Password secondary effect (optional widening)

The password mechanic could be a secondary `AnchoredTrigger`-like gate layered on the locked object — a keyword spoken within 5 ft temporarily suspends the lock for 1 minute. This is lower priority and could be modeled as DM-agenda at the prototype stage (which password, who speaks it). Consider deferred until a second SRD unit forces the trigger.

### 3. Surface widening: `ObjectFilter.elementKind`

```typescript
export type ObjectElementKind = "door_or_window_or_gate" | "container" | "hatch";

// Extend ObjectFilter:
export type ObjectFilter = {
  readonly material?: ObjectMaterial;
  readonly heldOrWorn?: "required" | "forbidden";
  readonly manufactured?: boolean;
  readonly elementKind?: ObjectElementKind;  // new
};
```

This parallels the existing `AnchorTarget.description = "door_or_window"` already in the surface, showing the taxonomy already recognizes this architectural category.

## Reference encoding (pending atom widening)

```dhall
-- NOT YET AUTHORABLE — requires lock_object atom and ObjectFilter.elementKind

let arcaneLock =
      { kind = "spell"
      , id = "arcane_lock"
      , name = "Arcane Lock"
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components = { v = True, s = True, m = Some "gold dust worth 25+ GP", materialConsumed = True }
          , duration = { kind = "permanent", endsOn = [ "dispel" ] }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "object"
                    , count = 1
                    -- , filter = { elementKind = "door_or_window_or_gate" }  -- NEEDS WIDENING
                    }
                , effects =
                    [ { kind = "lock_object"  -- NEEDS NEW ATOM
                      , authorizedBypass = "caster_and_designated_at_cast"
                      , blockedMeans = "nonmagical"
                      }
                    ]
                }
              ]
          }
      }
```

## Priority

**Medium.** Arcane Lock is a common utility spell (level 2, core SRD). The `lock_object` atom pattern likely recurs for Leomund's Tiny Hut, Forbiddance, and other "ward/seal a location/object" spells. The authorized-bypass list is the key new semantic — other sealing spells may share it.
