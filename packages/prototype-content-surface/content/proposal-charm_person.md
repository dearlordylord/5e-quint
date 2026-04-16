# Proposal: Charm Person — surface_widening

## Unit

- Slug: `charm_person`
- Kind: spell
- Level 1 Enchantment, Action, 30 ft, V/S, 1 hour (timed)

## Verdict

`surface_widening` — four variants of existing surface types are missing. No new v4 atoms required.

## Structural fit

Family: `activation` with a `save_gate` phase. The spell's shape (cast → save → apply condition on fail) maps cleanly onto the existing activation family. Slot scaling (+1 target per slot above 1) is already expressible via `SlotScaling` on `TargetSelection.choose_up_to`.

## Blocking widenings

### 1. `Condition: "charmed"` (surface_widening)

**Gap:** `Condition` is a closed string literal type currently equal to `"prone"`. The Charmed condition, which is the core on-fail effect of this spell, cannot be expressed.

**Minimum fix:** Widen `Condition` to include `"charmed"`. Subsequent pressure (Hold Person → "paralyzed", Blindness/Deafness → "blinded"/"deafened") will require further widening of this type.

**v4 atom:** `apply_condition` exists. Only the closed enum value is missing.

**Evidence:** "On a failed save, the target has the Charmed condition until the spell ends or until you or your allies damage it."

---

### 2. Conditional Advantage on the saving throw (surface_widening)

**Gap:** `ActivationPhase.save_gate` has fields `ability`, `dc`, `onFail`, `onSuccess` — but no mechanism to express that the save roll itself is made with Advantage under a specified condition.

**Minimum fix:** Add an optional field to `save_gate` phase, e.g.:

```typescript
readonly saveRollModifier?: {
  readonly kind: "advantage_if";
  readonly condition: "target_is_in_combat_with_caster_or_allies";
}
```

The condition enum can start narrow and widen on further pressure.

**Evidence:** "It does so with Advantage if you or your allies are fighting it."

---

### 3. Event-driven early expiry: damage by caster/allies (surface_widening)

**Gap:** The `Duration.timed` variant has a fixed `DurationValue` (unit + amount). There is no mechanism for the spell to terminate early when a specific runtime event occurs (here: the target receiving damage from the caster or their allies).

This is structurally different from concentration (which can break on damage to the *caster*) — here the break condition is damage to the *target* by the *caster's side*.

**Minimum fix:** Add an optional `breakOn` field to `Duration.timed`:

```typescript
| {
    readonly kind: "timed";
    readonly value: DurationValue;
    readonly breakOn?: BreakCondition;
  }
```

Where `BreakCondition` starts as:

```typescript
export type BreakCondition =
  | { readonly kind: "target_damaged_by_caster_or_allies" };
```

**Evidence:** "the target has the Charmed condition until the spell ends or until you or your allies damage it."

---

### 4. Creature type filter on TargetSelection (surface_widening)

**Gap:** `TargetSelection` (mode: `"one"` | `"choose_up_to"`) has no creature type constraint. Charm Person targets only Humanoids; casting it at a beast or undead is invalid by the spell's rules.

**Minimum fix:** Add an optional `creatureType` filter to `TargetSelection`:

```typescript
export type TargetSelection =
  | { readonly mode: "one"; readonly creatureType?: CreatureType }
  | { readonly mode: "choose_up_to"; readonly count: SlotScaling<number>; readonly creatureType?: CreatureType };

export type CreatureType =
  | "humanoid"
  | "beast"
  | "undead"
  // widen as needed
```

This will recur immediately with Charm Monster (any creature type) and Hold Person (Humanoid only).

**Evidence:** "One Humanoid you can see within range makes a Wisdom saving throw."

---

## Out of scope (not encoded)

- **"The Charmed creature is Friendly to you"** — NPC attitude/disposition is DM-adjudicated state per ARCHITECTURE.md. Not a core mechanics atom.
- **"When the spell ends, the target knows it was Charmed by you"** — narrative notification, caller-owned per ARCHITECTURE.md.

## Precedent value

These four widenings are high-reuse:

| Widening | Immediate next pressure |
|---|---|
| `Condition: "charmed"` | Charm Monster, Sleep (incapacitated), Hold Person (paralyzed) |
| Conditional save Advantage | Animal Friendship (Advantage if trained), Suggestion variants |
| Event-driven early expiry | Hunter's Mark (already has transfer-on-0HP), Hex |
| Creature type filter | Hold Person, Dominate Person, Charm Monster, Banishment |
