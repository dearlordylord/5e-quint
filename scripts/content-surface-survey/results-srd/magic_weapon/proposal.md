# Proposal: Surface Widenings for Magic Weapon

**Unit:** Magic Weapon (spell, SRD 5.2.1, L2 Transmutation)
**Outcome:** `surface_widening`
**Confidence:** high

## Why this unit cannot be honestly encoded

Magic Weapon is an ongoing-effect spell that touches a nonmagical weapon and imbues it with a scaling flat bonus to both attack rolls and damage rolls for 1 hour. It does not fit the current surface for four independent reasons, each of which alone would block honest encoding.

---

## Gap 1 — Missing `weapon` attachment variant

**Type affected:** `Attachment`

The spell's target is a touched weapon (an object), not a creature. The current `Attachment` union only supports `self`, `target`, `area`, and `mark`. No object- or item-typed attachment variant exists in the surface.

V4 taxonomy (`TAXONOMY_atoms_graph.md §3. Attachment Atoms`) already lists `weapon` and `object` as valid attachment atoms. The surface needs to expose at least one of them.

**Proposed addition:**
```typescript
| { readonly kind: "weapon" }
| { readonly kind: "object" }  // more general; weapon is a subcase
```

**Evidence:** "You touch a nonmagical weapon."

---

## Gap 2 — `RollKind` missing `"damage_roll"`

**Type affected:** `RollKind`

Magic Weapon grants the bonus to *both* attack rolls and damage rolls. The current `RollKind = "attack_roll" | "saving_throw"` has no `"damage_roll"` variant, so the damage-roll half of the bonus cannot be expressed in `RollModifierOperation.on`.

**Proposed addition:**
```typescript
export type RollKind = "attack_roll" | "saving_throw" | "damage_roll";
```

**Evidence:** "...a +1 bonus to attack rolls and damage rolls."

---

## Gap 3 — `DiceDelta` cannot express flat numeric bonuses

**Type affected:** `DiceDelta`, `RollModifierOperation`

```typescript
export type DiceDelta = {
  readonly dice: number;
  readonly dieSize: number;
  readonly sign: "+" | "-";
};
```

`DiceDelta` requires a `dieSize`, making it dice-only (1d4, 1d6, etc.). Magic Weapon gives a flat integer bonus (+1/+2/+3), which has no die. Using `{ dice: 1, dieSize: 1 }` as a proxy for "+1 flat" would be dishonest.

A companion type is needed:

```typescript
export type FlatDelta = {
  readonly flat: number;
  readonly sign: "+" | "-";
};

export type RollDelta = DiceDelta | FlatDelta;
```

And `RollModifierOperation.delta` would use `RollDelta`.

**Evidence:** "...+1 bonus to attack rolls and damage rolls."

---

## Gap 4 — No scaling variant on `RollModifierOperation.delta`

**Type affected:** `RollModifierOperation`

The bonus scales by slot tier: L2=+1, L3-5=+2, L6+=+3. This is a `threshold_tiers` pattern over the `slot` axis. However, `RollModifierOperation.delta` is a fixed single value — there is no mechanism to express a scaling delta on a roll modifier.

For comparison, `DiceAmount` supports `threshold_tiers` and `linear_per_level` scaling but only on damage/heal effects. An analogous type is needed for roll-modifier bonuses:

```typescript
export type ScalableRollDelta =
  | { readonly kind: "fixed"; readonly value: RollDelta }
  | {
      readonly kind: "threshold_tiers";
      readonly axis: LevelAxis;
      readonly base: RollDelta;
      readonly tiers: ReadonlyArray<{
        readonly atLevel: number;
        readonly value: RollDelta;
      }>;
    };
```

**Evidence:** "Using a Higher-Level Spell Slot: The bonus increases to +2 with a level 3-5 spell slot. The bonus increases to +3 with a level 6+ spell slot."

---

## Gap 5 — `replace_on_recast` not in Duration (secondary)

**Type affected:** `Duration`

The spell ends early if the caster casts it again. V4 lists `replace_on_recast` as a lifecycle atom (`§6. Lifecycle Atoms`), but the surface `Duration` type only exposes `instantaneous`, `concentration`, and `timed` — no early-termination-on-recast condition.

This gap is secondary: the spell's primary 1-hour timed duration encodes correctly under `{ kind: "timed", value: { unit: "hour", amount: 1 } }`. The recast-termination is an additional lifecycle constraint that cannot currently be expressed.

**Evidence:** "The spell ends early if you cast it again."

---

## What the encoding would look like after widening

Once all gaps are resolved, the unit would fit the `ongoing_effect` family:

- `family = "ongoing_effect"`
- `castingTime = { kind: "bonus_action" }`
- `range = { kind: "touch" }`
- `duration = { kind: "timed", value: { unit: "hour", amount: 1 } }` (+ recast-end condition if Gap 5 is resolved)
- `attachment = { kind: "weapon" }` (Gap 1)
- `operation = { kind: "roll_modifier", on: ["attack_roll", "damage_roll"], delta: { kind: "threshold_tiers", axis: "slot", base: { flat: 1, sign: "+" }, tiers: [{ atLevel: 3, value: { flat: 2, sign: "+" } }, { atLevel: 6, value: { flat: 3, sign: "+" } }] } }` (Gaps 2, 3, 4)

Atoms that would be emitted after widening: `spell_root`, `activate`, `bonus_action_quota`, `spell_slot`, `persist`, `expire`, `weapon` (attachment), `modify_roll_numeric`, `scale_numeric_bonus`.

---

## Priority

Gaps 1–4 are all required for honest encoding of this unit and likely affect other spells:
- **Gap 2** (`damage_roll`) is blocked by nearly every weapon-enhancing spell (Divine Favor, Elemental Weapon, etc.)
- **Gap 3** (flat delta) is blocked by any spell granting a flat numeric bonus vs. a dice roll bonus
- **Gap 1** (weapon attachment) is blocked by any spell that targets a weapon object
- **Gap 4** (scalable roll delta) is blocked by any slot-scaled weapon enhancement

Gap 5 is low priority — it refines lifecycle semantics without blocking the core mechanic.
