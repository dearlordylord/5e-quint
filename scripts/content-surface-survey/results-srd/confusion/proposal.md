# Proposal: Widenings Required for Confusion

**Unit:** Confusion (spell, level 4, enchantment, srd-5.2.1)
**Outcome:** `atom_widening`

---

## Why Confusion Cannot Be Encoded Honestly

The closest payload family is `ongoing_effect` (area attachment, concentration 1 minute, initial WIS save per creature in the sphere). However, five blocking gaps prevent honest encoding.

---

## Blocking Gap 1 — Missing Atom: `random_behavior_table` (primary)

**Evidence:** "must roll 1d10 at the start of each of its turns to determine its behavior for that turn, consulting the table below"

Confusion's defining mechanic is a per-turn stochastic dispatch. At the start of each affected creature's turn, it rolls 1d10 and consults a 4-row table:

| Roll | Behavior |
|------|----------|
| 1    | Use all movement in a random direction; no action |
| 2–6  | No movement, no action |
| 7–8  | No movement; Attack action against a random creature within reach (if any) |
| 9–10 | Act normally |

No v4 atom covers "roll a die and pick a behavior from a probability table." This is not `modify_roll_advantage`, not `apply_condition`, not `restrict_action_set` — it is a fundamentally different operational shape: a weighted stochastic behavior selector that replaces the creature's autonomous decision with a random draw.

**Proposed atom:** `random_behavior_table` (new v4 Effect atom)
- Carries a table of `(range: [min, max], behavior: BehaviorOutcome)` entries
- `BehaviorOutcome` would itself need a small closed enum: `random_movement | do_nothing | random_melee_attack | normal`

**Classification:** `atom_widening` — this atom does not exist in v4.

---

## Blocking Gap 2 — Missing Surface Variant: `OngoingOperation.random_behavior_table`

**Evidence:** same as Gap 1

The surface type `OngoingOperation = RollModifierOperation | DamageOnHitOperation` has two variants. A third variant is needed to carry the random behavior table as an ongoing per-target operation.

**Proposed variant:**
```typescript
export type RandomBehaviorTableOperation = {
  readonly kind: "random_behavior_table";
  readonly dieSize: number;            // 10 for Confusion
  readonly rows: ReadonlyArray<{
    readonly min: number;
    readonly max: number;
    readonly behavior: BehaviorOutcome;
  }>;
};
```

**Classification:** `surface_widening` (depends on new atom from Gap 1).

---

## Blocking Gap 3 — `repeat_save` Not Surfaced in `types.ts`

**Evidence:** "At the end of each of its turns, an affected target repeats the save, ending the spell on itself on a success."

The v4 taxonomy (§5 Resolution Atoms) lists `repeat_save` as an existing atom. However, `types.ts` has no type that expresses a per-turn repeat save attached to an ongoing_effect. The `Duration` type only encodes global spell expiry; there is no per-attachment or per-target repeat-save mechanism.

**Proposed surface addition:** A new optional field on `OngoingEffectMechanics` (or a new lifecycle atom reference):
```typescript
repeatSave?: {
  readonly timing: "end_of_affected_turn";
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly onSuccess: "remove_from_self";
};
```

**Classification:** `surface_widening` (v4 atom exists; surface representation missing).

---

## Blocking Gap 4 — `StandardActionKind` Missing `bonus_action` and `reaction`

**Evidence:** "the target can't take Bonus Actions or Reactions"

`ActionRestriction.exclude` references `StandardActionKind`, which covers the 12 standard action types. Neither `bonus_action` nor `reaction` appear in that enum. Without them, `restrict_action_set` cannot express the Bonus Action / Reaction denial that Confusion imposes on failing creatures.

**Proposed surface change:** Extend `StandardActionKind` (or create a parallel `ActionResourceKind`) to include `bonus_action` and `reaction`.

**Classification:** `surface_widening`.

---

## Blocking Gap 5 — Area Attachment Has No Slot-Scaling for Radius

**Evidence:** "The Sphere's radius increases by 5 feet for each spell slot level above 4."

The `area` Attachment variant carries a fixed `radiusFeet`. There is no slot-scaling mechanism on area dimensions analogous to the `SlotScaling<number>` used for target counts. This is a surface gap independent of the other blockers.

**Proposed surface change:** Add an optional `radiusScaling` field to the area attachment:
```typescript
radiusScaling?: SlotScaling<number>;  // feet added per slot above baseLevel
```

**Classification:** `surface_widening`.

---

## Encoding Path (Once Gaps Are Closed)

Family: `ongoing_effect`
- Area attachment: sphere, 10 ft radius (+ 5 ft/slot above 4)
- Initial per-creature WIS save gate (on fail → enter confused state)
- Operation: `random_behavior_table` (1d10 at turn start)
- Ongoing state also: `restrict_action_set` (bonus_action, reaction) on failing creatures
- Repeat save: end-of-affected-turn WIS save, on success remove from self
- Duration: concentration, up to 1 minute
