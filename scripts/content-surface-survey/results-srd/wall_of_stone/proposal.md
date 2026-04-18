# Proposal: Wall of Stone

## Outcome: `atom_widening`

The spell's primary mechanics encode cleanly. One secondary mechanic — the saving throw for surrounded creatures — requires a new EffectAtom for its success branch.

---

## What fits

| Mechanic | Surface coverage |
|---|---|
| Create nonmagical stone wall (AC 15, 30 HP/inch, poison + psychic immunity) | `create_object` with `durability { acValue, hpPerSection, damageImmunities }` |
| Concentration 10 min, becomes permanent if maintained full duration | `duration.kind = "concentration"`, `upTo = 10 min`, `permanentIfMaintainedFull = true` |
| Creatures in wall's path at creation are pushed to one side | `force_move { direction: "push", distanceFeet: 5 }` on `area` attachment |

The encoded trace covers the wall's creation lifecycle (concentration lock → permanence promotion) and the displacement of creatures in the footprint.

---

## What doesn't fit

### `save_gate` for surrounded creatures — onSuccess has no atom

**SRD text:** "If a creature would be surrounded on all sides by the wall (or the wall and another solid surface), that creature can make a Dexterity saving throw. On a success, it can use its Reaction to move up to its Speed so that it is no longer enclosed by the wall."

The save itself fits `save_gate { ability: "dex", dc: { kind: "caster_spell_save_dc" } }`.

The `onFail` is a geometric consequence with no explicit mechanic: `{ kind: "none" }` is reasonable (the enclosure is enforced by the wall, not a further effect atom).

The `onSuccess` is the blocking gap: **the creature consumes its Reaction and moves up to its Speed**. This is structurally:
1. **Reaction consumption** — costs the target's Reaction resource.
2. **Player-optional movement up to Speed** — a granted escape move, not a caster-driven push.

Neither `force_move` (involuntary, caster-driven) nor any existing EffectAtom captures "target may use its Reaction to move up to its Speed." Using `{ kind: "none" }` for onSuccess would falsely suggest no effect on save success, which is wrong — the creature CAN escape. The entire save_gate is therefore omitted.

---

## Proposed widening

### New atom: `grant_reaction_move`

```typescript
| {
    readonly kind: "grant_reaction_move";
    // Movement granted (always up to the target's full Speed in current RAW).
    readonly upTo: "speed";
  }
```

**Purpose:** Grants the target the option to immediately spend their Reaction to move up to their Speed. Distinct from `force_move` (which is involuntary) and `grant_extra_action` (which grants an Action, not a Reaction-triggered escape movement).

**Use site:** `save_gate.onSuccess` in Wall of Stone. Potentially reusable for any future spell or feature that grants a reactive escape movement (analogous to Cutting Words, Silvery Barbs, or similar player-option-on-save mechanics).

**v4 taxonomy classification:** New effect atom — not in the v4 inventory. The closest existing atom is `deny_opportunity_attack` (also a movement-adjacent effect), but that gates an *outgoing* event rather than granting an *ingoing* option.

---

## Additional surface gaps (non-blocking)

- **Arbitrary wall geometry:** The wall can take "any shape you desire." The encoding uses a `line { lengthFeet: 100, widthFeet: 10 }` shape as the default-configuration approximation (10 panels × 10 ft). A fully general geometry surface is out of scope.
- **Panel thickness variants:** The 3-inch thick 10×20 ft panel variant ("Alternatively, you can create 10-foot-by-20-foot panels that are only 3 inches thick") is not expressible — `create_object` has no cast-time thickness/size-choice field. Surface widening needed for a cast-time dimensional trade-off.
- **Architectural constraints:** "Must merge with and be solidly supported by existing stone" — DM-resolved, not a mechanic atom.
- **Panel collapse on destruction:** "Might cause connected panels to collapse at the DM's discretion" — DM agenda per ARCHITECTURE.md.
