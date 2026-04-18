# Proposal: Silent Image widening gaps

## Classification: `surface_widening`

The structural shell for Silent Image fits the existing surface cleanly:

- Family: `ongoing_effect`
- Duration: `concentration`, up to 10 minutes
- `earlyEnd`: `caster_recasts_spell` (already in surface; types.ts explicitly cites Silent Image)
- Attachment: `area` / `cube` 15 ft side at `point_within_range` 60 ft
- Range: `{ kind: "point", feet: 60 }`
- School: `illusion`, Level 1

Three mechanics cannot be encoded with the current surface.

---

## Gap 1 — `create_object` effect atom (primary blocker)

**Classification:** `surface_widening` — atom exists in v4 taxonomy (§9 effect atoms), absent from `types.ts`.

**RAW text:**
> "You create the image of an object, a creature, or some other visible phenomenon that is no larger than a 15-foot Cube."

**types.ts comment (existing):**
> "Targets existing world objects. Distinct from object CREATION (Fabricate, Instant Fortress) — that is a forthcoming `create_object` atom, not an Attachment kind."

**Proposed shape:**

```typescript
| {
    readonly kind: "create_object";
    readonly description: string;       // authoring-time label, DM-owned narrative
    readonly maxSize?: Size;            // bounding constraint on the created object
    readonly sensoryCoverage?: ReadonlyNonEmptyArray<"visual" | "auditory" | "olfactory" | "tactile">;
    // "purely visual" → sensoryCoverage: ["visual"]
    // Real objects default to all senses (absent = unrestricted)
  }
```

Silent Image encoding of operations:

```
operations:
  [ { trigger: { kind: "passive" }
    , effect:
        { kind: "create_object"
        , description: "illusory image"
        , maxSize: "large"   -- 15-ft cube fits "large" or needs a new Size variant "15ft_cube"
        , sensoryCoverage: [ "visual" ]
        }
    }
  ]
```

Note: the `maxSize` field uses the existing `Size` enum which tops out at `gargantuan`. A 15-ft cube may warrant a dimensional descriptor rather than a creature-size label. The simplest approach is a free-text `maxDimensions` field or reusing the `AreaShapeDescriptor` type to describe the object's bounding volume.

---

## Gap 2 — Mid-duration reposition (Magic action cost)

**Classification:** `surface_widening` — new trigger/cost variant needed for recurring player-initiated repositioning during an ongoing effect.

**RAW text:**
> "As a Magic action, you can cause the image to move to any spot within range."

**Problem:** `OngoingOperation` has a `trigger` field from `OngoingTrigger`, which covers passive, caster-attack-hit, turn-start, creature-damaged, creature-moves, and creature-enters-area. None of these represent "player voluntarily spends a Magic action to reposition the area attachment."

**Proposed surface shape:**

Add a new `OngoingTrigger` variant:

```typescript
| {
    readonly kind: "on_caster_spends_action";
    readonly action: StandardActionKind;
  }
```

And a corresponding new `OngoingEffect` variant (or reuse an existing one) that repositions the attachment:

```typescript
| {
    readonly kind: "reposition_attachment";
    readonly range: Range;
  }
```

Encoding:

```
operations:
  [ { trigger: { kind: "on_caster_spends_action", action: "magic" }
    , effect: { kind: "reposition_attachment", range: { kind: "point", feet: 60 } }
    }
  ]
```

This is a bounded surface widening — the atom concept ("move an area effect to a new point") is deterministic and not DM-agenda.

---

## Gap 3 — Investigation check to see through

**Classification:** `surface_widening` — no `OngoingTrigger` variant covers "creature takes Study action targeting this attachment."

**RAW text:**
> "A creature that takes a Study action to examine the image can determine that it is an illusion with a successful Intelligence (Investigation) check against your spell save DC."

**Problem:** The closest existing trigger is `on_creature_enters_area` or turn-start save gates. The Study action is a player-chosen standard action, not an automatic trigger. The check resolves as an ability check (not a saving throw), and success grants "can see through the image" (a perception/concealment effect with no clear v4 atom).

**Proposed trigger variant:**

```typescript
| { readonly kind: "on_creature_takes_action"; readonly action: StandardActionKind }
```

With `action: "study"` to scope it correctly.

**The save_gate analog:** The existing `OngoingEffect.save_gate` variant is close but uses `saving_throw` semantics. The check here is an `ability_check` (INT Investigation). An `ability_check_gate` variant of `OngoingEffect` would be needed, paralleling the existing `ability_check_gate` ActivationPhase.

**The "see through" effect:** On a successful Investigation check the creature "can see through the image." This is a concealment-state change with no existing v4 atom. It is arguably DM-agenda (the DM tracks who has seen through the illusion), but the mechanic is deterministic (check passes → creature gains see-through state). This may be a candidate for a `grant_see_through` atom or a narrower `remove_concealment_for_creature` atom — deferring to the surface designer.

---

## Summary table

| Gap | Blocking? | Classification | v4 atom exists? |
|-----|-----------|----------------|-----------------|
| `create_object` atom | Yes | surface_widening | Yes (§9) |
| Mid-duration reposition | No (secondary) | surface_widening | No trigger variant |
| Investigation-check trigger | No (secondary) | surface_widening | No trigger variant |
| "See through" effect on check pass | No (secondary) | atom_widening | Not in v4 |

The primary blocker is `create_object`. Once that atom lands in `types.ts`, Silent Image's core mechanic can be encoded. The move and see-through mechanics are secondary surface gaps that can be handled in later widening passes.
