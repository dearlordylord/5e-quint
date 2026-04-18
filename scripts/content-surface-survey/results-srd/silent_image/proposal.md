# Proposal: Silent Image widenings

## Status: atom_widening

The core mechanic encodes cleanly. Two secondary mechanics require widenings.

---

## 1. `reposition_attachment` atom (new_atom)

**Evidence:** "As a Magic action, you can cause the image to move to any spot within range."

**Gap:** The `on_caster_spends_action` trigger with `{ kind: "standard_action", action: "magic" }` exists and fits perfectly. But the resulting effect — moving the illusion's spatial anchor to a new point within range — has no atom. `force_move` and `teleport` apply to creatures; `alter_item_kind` applies to item forms. No atom repositions a non-creature effect attachment.

**Precedents:** Same gap in Dancing Lights (`reposition_attachment`) and Major Image.

**Proposed shape:**
```typescript
| {
    readonly kind: "reposition_attachment";
    readonly destination: "any_spot_within_range";
  }
```

Used as the `effect` of an `OngoingOperation` with `on_caster_spends_action` trigger.

---

## 2. `OngoingTrigger.on_creature_studies` (new_variant)

**Evidence:** "A creature that takes a Study action to examine the image can determine that it is an illusion with a successful Intelligence (Investigation) check against your spell save DC."

**Gap:** No `OngoingTrigger` variant covers "a creature spends a Study action examining the attachment." The closest existing triggers (`on_attached_turn_start`, `on_creature_enters_area`) are unconditional. This trigger is volitional — a creature actively chooses to study the illusion.

**Proposed shape:**
```typescript
| { readonly kind: "on_creature_studies_attachment" }
```

The `effect` would be a `save_gate` (or `ability_check_gate`) with `ability: "int"` and `dc: { kind: "caster_spell_save_dc" }`, `onFail: { kind: "none" }`, `onPass: <see_through_illusion atom or dm_agenda>`.

Note: the "see through" outcome may itself be DM-agenda (the illusion becomes transparent to the discerning creature — a rendering/visibility concern beyond core mechanics).

---

## What encodes cleanly

```
ongoing_effect
  attachment: area { cube 15ft, origin: point_within_range }
  operations:
    - passive → create_illusion { maxSize: "huge", channels: ["visual"] }
```

Duration: concentration, up to 10 minutes. Typecheck passes; tracer output is valid.
