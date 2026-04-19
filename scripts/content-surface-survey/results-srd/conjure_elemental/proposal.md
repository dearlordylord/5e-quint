# Proposal: Conjure Elemental — surface_widening

## Intended encoding

**Family**: `ongoing_effect`  
**Attachment**: `area` with a point-within-range origin at 60 ft, encompassing the spirit's space and a 5-ft emanation around it.  
**Cast-time element choice**: `CastTimeChoice<DamageType>` selecting from `["lightning", "thunder", "fire", "cold"]` (already in surface).  
**Upcast scaling**: `linear_per_level` with `axis="slot"`, `+1d8` to both damage tiers per slot above 5 (already in surface).

The spirit is intangible and produces no stat block, companion control, or independent action — it is a persistent area hazard, not a spawned creature.

## Why honest encoding is blocked

Five surface type variants are absent. None is a missing v4 taxonomy atom; all are new variants of existing surface types.

---

### Gap 1 — `OngoingPredicate`: no mutex-condition variant

**Missing**: `{ kind: "no_condition_active_on_any_target"; condition: Condition }`

The trigger is guarded by the state of the spell's own effect: it only fires **if no creature is currently Restrained by this effect instance**. This is a stateful mutex — at most one creature can be held at a time.

`OngoingPredicate` only provides `{ kind: "at_hp_threshold", threshold, comparison }`. There is no variant for "this condition is not currently held on any target by this effect."

**SRD text**: *"you can force that creature to make a Dexterity saving throw if the spirit has no creature Restrained"*

**Proposed shape**:
```typescript
| {
    readonly kind: "no_condition_active_on_any_target";
    readonly condition: Condition;
  }
```

---

### Gap 2 — `RepeatSaveSpec.cadence`: no `start_of_target_turn`

**Missing**: `"start_of_target_turn"` as a cadence option.

The repeat save fires at the **start** of the Restrained target's turn. The existing cadences are `"end_of_target_turn"` and `"on_target_takes_damage"`. Start-of-turn is distinct: it fires before the creature can move or act, which matters for ongoing area hazards (Cloudkill uses end-of-turn; Conjure Elemental explicitly uses start-of-turn for the repeat).

**SRD text**: *"At the start of each of its turns, the Restrained target repeats the save."*

**Proposed addition**:
```typescript
readonly cadence: "end_of_target_turn" | "on_target_takes_damage" | "start_of_target_turn";
```

---

### Gap 3 — `RepeatSaveSpec.onSuccess`: semantics mismatch

**Missing**: a `remove_condition` outcome for repeat save success.

The current `onSuccess: "ends_on_target"` terminates the spell on the succeeding target. Conjure Elemental has different semantics: success removes the Restrained condition but **the spell continues on the target**. The spirit can Restrain that creature again on a future turn. Encoding as `"ends_on_target"` would make the spell appear to terminate when the target breaks free, which is false.

**SRD text**: *"On a successful save, the target isn't Restrained by the spirit."*

**Proposed addition** to `RepeatSaveSpec.onSuccess`:
```typescript
readonly onSuccess:
  | "ends_on_target"
  | { readonly kind: "remove_condition"; readonly condition: Condition };
```

---

### Gap 4 — `OngoingTrigger`: no caster-optional flag

**Missing**: a flag indicating the trigger fires only if the caster chooses to invoke it.

"You **can** force" is a player decision at each qualifying event — the caster may choose not to use the save gate on a given creature entering the area. All existing `OngoingTrigger` kinds fire unconditionally when their event fires (passive, on_creature_enters_area, on_attached_turn_start, etc.).

This is distinct from `optional: boolean` on `OnHitTriggerMechanics` (mastery), which gates the whole mastery family. Here, the caster decides per-firing whether to invoke the save gate.

**SRD text**: *"you can force that creature to make a Dexterity saving throw"*

**Proposed approach**: Add an optional `casterActivated?: true` flag to `OngoingOperation` (or to the affected trigger variants) signaling that the caster must actively elect to trigger the effect each time.

---

### Gap 5 — `OngoingTrigger`: no compound "any_of" trigger

**Missing**: a compound trigger that fires on either of two distinct event kinds.

The effect fires when a creature **enters the spirit's space** (≈ `on_creature_enters_area`) OR **starts its turn within 5 feet** (≈ `on_attached_turn_start` scoped to the 5-ft area). These are two different mechanical events. Splitting into two operations would duplicate the save gate and the mutex predicate, diverging authoring and creating implicit coupling. `ReactionTrigger` already has `{ kind: "any_of", triggers: [...] }` for exactly this pattern at the reaction level; the same shape is needed for `OngoingTrigger`.

**SRD text**: *"enters the spirit's space or starts its turn within 5 feet of the spirit"*

**Proposed addition**:
```typescript
| {
    readonly kind: "any_of";
    readonly triggers: ReadonlyNonEmptyArray<OngoingTrigger>;
  }
```

---

## Elements that do fit the current surface

| Element | Surface support |
|---|---|
| `CastTimeChoice<DamageType>` for element selection | ✅ exists |
| `linear_per_level` upcast scaling on `DiceAmount` (axis="slot") | ✅ exists |
| `on_creature_enters_area` trigger | ✅ exists |
| `on_attached_turn_start` trigger | ✅ exists |
| `apply_condition restrained` on fail | ✅ exists |
| `damage` atom (8d8 / 4d8 spirit-type) | ✅ exists |
| `composite` effect for fail branch (damage + restrained) | ✅ exists |
| `save_gate` with `caster_spell_save_dc` | ✅ exists |
| Concentration duration, 10 minutes | ✅ exists |

## Encoding verdict

**Do not author** `content/conjure_elemental.dhall` or `content/conjure_elemental.json`. The five missing variants collectively misrepresent the spell's core mechanic (the mutex restraint gate, the start-of-turn repeat, and the condition-remove-not-spell-end success semantics). A forced encoding would produce a misleading trace.
