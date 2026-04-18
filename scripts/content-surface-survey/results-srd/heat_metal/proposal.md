# Proposal: Heat Metal — Surface Widenings Required

**Unit**: Heat Metal (spell, level 2, Transmutation, SRD 5.2.1)
**Outcome**: `atom_widening`
**Blocker count**: 4 (1 atom_widening + 3 surface_widening)

---

## RAW Text (relevant excerpts)

> Choose a manufactured metal object … You cause the object to glow red-hot. Any creature in physical contact with the object takes 2d8 Fire damage when you cast the spell. Until the spell ends, you can take a Bonus Action on each of your later turns to deal this damage again if the object is within range.
>
> If a creature is holding or wearing the object and takes the damage from it, the creature must succeed on a Constitution saving throw or drop the object if it can. If it doesn't drop the object, it has Disadvantage on attack rolls and ability checks until the start of your next turn.
>
> Using a Higher-Level Spell Slot: The damage increases by 1d8 for each spell slot level above 2.

---

## What fits cleanly

- **Family**: `ongoing_effect` — concentration 1 minute, object attachment, per-turn repeat.
- **Attachment**: `object` with `{ material: "metal", manufactured: true }` — exactly what the `object` attachment and `ObjectFilter` support.
- **Upcast**: `+1d8` per slot above 2 → `linear_per_level` on the fire `damage` atom, `axis: "slot"`.
- **Initial damage**: `initialPhase` on `OngoingEffectMechanics` is the right hook — a one-time `direct` phase at cast time.

---

## Gap 1 — `force_drop_object` effect atom (BLOCKER, atom_widening)

**RAW**: "the creature must succeed on a Constitution saving throw or drop the object if it can"

The Con save has two branches:
- **onFail**: creature must drop the held/worn metal object
- **if doesn't drop** (can't or won't): disadvantage on attack rolls + ability checks

No v4 taxonomy atom covers "release a held or worn item." The closest candidates:
- `force_move` — positional displacement, not item release
- `apply_condition` — no "holding object" condition exists in SRD 5.2.1
- `remove_condition` — same gap; "holding" is not a condition

**Proposed atom**:
```typescript
| {
    readonly kind: "force_drop_object";
    // Which object to drop — can reference the spell's attached object
    // or be unqualified (any held object). Heat Metal is always the
    // attached object; leave unqualified for the common case.
    readonly objectRef?: "attached_object";
  }
```

**Note**: The "if it doesn't drop" branch (disadvantage) implicitly depends on the drop outcome — the disadvantage applies only when the creature retains the object despite failing the save. This conditional-on-failed-drop structure has no current surface shape either; a simple `onFail: composite[force_drop_object, disadvantage]` would over-apply the disadvantage to creatures that do drop.

---

## Gap 2 — `OngoingTrigger.on_caster_bonus_action` (surface_widening)

**RAW**: "you can take a Bonus Action on each of your later turns to deal this damage again"

The ongoing damage is player-activated: the caster optionally spends a Bonus Action each turn. The existing `OngoingTrigger` variants:

| Variant | Why it doesn't fit |
|---|---|
| `passive` | Fires automatically — no player choice, no resource spend |
| `on_caster_turn_start` | Fires unconditionally at turn start — wrong semantics |
| `on_caster_attack_hit` | Requires an attack hit, not a bonus action spend |
| others | Unrelated to caster turn economy |

**Proposed variant**:
```typescript
| {
    readonly kind: "on_caster_bonus_action";
    // The trigger fires when the caster spends their Bonus Action
    // on their turn while the effect persists.
    readonly optional: true; // always optional for this trigger
  }
```

This variant would consume a `bonus_action_quota` resource node, paralleling how spell casting times emit quota nodes. The tracer would emit a `bonus_action_quota` resource connected to the window with a `consumes` relation.

---

## Gap 3 — "creatures in contact with attached object" targeting (surface_widening)

**RAW**: "Any creature in physical contact with the object takes 2d8 Fire damage"

The spell attaches to an **object** (the metal item), but the damage recipients are **creatures touching it**. The current attachment vocabulary offers no way to express "creatures currently in physical contact with the attached object" as an effect target.

Current options and why they fail:
- `Attachment.target` — requires selecting creatures directly, not via an object intermediary
- `Attachment.area` — the "area" of contact is not a geometric shape; it's dynamic (any creature touching the object)
- `Attachment.object` — correct for the anchor, but `EffectAtom` effects then apply *to the object*, not to touching creatures

**Proposed vocabulary**:
A new `TargetSelection` mode or a new `Attachment` kind:
```typescript
| {
    readonly kind: "creatures_in_contact_with_object";
    // Effect reaches all creatures currently touching the attached object.
    // Resolves dynamically at the time the damage fires.
  }
```

Alternatively, the `object` attachment could gain an `affectsCreaturesInContact: true` flag that redirects EffectAtoms to touching creatures rather than the object itself.

---

## Gap 4 — `RiderExpiry` for "start of caster's next turn" (surface_widening)

**RAW**: "it has Disadvantage on attack rolls and ability checks until the start of your next turn"

The disadvantage rider expires at the **caster's** next turn start. The two `RiderExpiry` variants:

| Variant | Semantics |
|---|---|
| `target_uses_or_turn_start` | Sap mastery: before attacker's next turn OR when target uses a roll |
| `end_of_next_turn` | Expires at end of a creature's next turn |

Neither matches "start of the caster's turn." The caster is not the target; the target is the creature holding the metal object.

**Proposed variant**:
```typescript
| { readonly kind: "start_of_caster_next_turn" }
```

This would wire to an `on_caster_turn_start` window in the tracer, paralleling how `end_of_next_turn` wires to `turn_end_window`.

---

## Encoding plan (for when gaps are resolved)

Once all four gaps are addressed, Heat Metal encodes as an `ongoing_effect` spell:

```
ongoing_effect
  attachment: object { material: metal, manufactured: true }
  initialPhase: direct
    attachment: creatures_in_contact_with_object   ← Gap 3
    effects: [damage { fire, 2d8 + 1d8/slot linear }]
  operations:
    - trigger: on_caster_bonus_action              ← Gap 2
      effect: save_gate { con, caster_spell_save_dc
        onFail: composite [
          force_drop_object,                       ← Gap 1
          if_not_dropped: modify_roll_advantage {
            disadvantage, [attack_roll, ability_check],
            expiresOn: start_of_caster_next_turn   ← Gap 4
          }
        ]
        onSuccess: none
      }
      // + damage to creatures in contact (same Gap 3 issue)
```

The "if not dropped" conditional on the disadvantage rider has no surface shape either — it's a conditional-on-failed-action that would require a nested branch not expressible with the current `composite` atom. This may require a fifth widening if tackled precisely, but is lower priority than the four above.
