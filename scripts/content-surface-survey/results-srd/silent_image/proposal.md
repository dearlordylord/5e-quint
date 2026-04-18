# Proposal: Silent Image widening

## Outcome: `atom_widening`

Three of the four core mechanics encode cleanly with atoms added since the previous survey pass:

| Mechanic | Encoding |
|---|---|
| Creates visual illusion (15-ft Cube, concentration) | `ongoing_effect` + `passive` → `create_illusion { maxSize: "huge", channels: ["visual"] }` |
| Magic action to reposition | `on_caster_spends_action { kind: "standard_action", action: "magic" }` → `reposition_attachment` |
| Study action investigation check | `on_creature_studies` → `ability_check_gate { ability: "int", dc: caster_spell_save_dc }` |
| **Disbelief outcome** | ❌ **No atom** — `{ kind: "none" }` placeholder on `onPass` |

## Missing atom: illusion disbelief state

**SRD text:** "If a creature discerns the illusion for what it is, the creature can see through the image."

**Problem:** When a creature passes the Intelligence (Investigation) check, it enters a persistent per-creature state — it can now see through the illusion for the duration. This is not:
- `remove_condition` (no condition was applied)
- `apply_condition` (no standard condition names this)
- `grant_sense` (the creature already has its senses; this is a *knowledge* state)
- `none` (something real happens)

**Proposed atom:**

```typescript
| {
    readonly kind: "grant_illusion_awareness";
    // No fields needed: the illusion is the host effect's own attachment.
    // The creature that passes the check becomes aware of THAT illusion.
  }
```

**Semantics:** The target creature (the one that passed the check) gains awareness of the specific illusion they examined. While the host spell persists, the creature can see through the illusion. This is scoped to the specific illusion instance (each concentration-tracked effect would carry its own awareness set).

**Pressure:** Silent Image, Major Image, Minor Illusion, Phantasmal Force, and every other Investigation-gated illusion spell shares this pattern. One atom serves all of them.

**Note:** The `create_illusion` atom comment already acknowledges this gap: "Investigation-vs-spell-DC disbelief, mid-duration reposition, and per-instance linkage rules belong to separate surfaces, not this atom." The `reposition_attachment` atom (added recently) resolved the reposition gap. `grant_illusion_awareness` would resolve the disbelief gap.

## Other notes

- `caster_recasts_spell` earlyEnd: the types.ts `DurationEndTrigger` comment lists Silent Image as a spell with this trigger. The provided source text entries do not include this clause explicitly. Omitted from encoding pending confirmation against `.references/srd-5.2.1/Spells/`.
- The Dhall superset homogeneity trick (Optional fields, `--omit-empty`) was necessary for the three structurally distinct operation shapes. This is the same pattern used by `produce_flame.dhall` and `dancing_lights.dhall`.
