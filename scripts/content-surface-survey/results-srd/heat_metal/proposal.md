# Proposal: Heat Metal — surface widening

**Outcome**: `atom_widening`
**Unit**: Heat Metal (spell, level 2, transmutation, SRD 5.2.1)

## What fits

The structural shape of Heat Metal maps cleanly onto the existing surface:

- **Family**: `ongoing_effect` — persistent state (concentration, 1 minute) with a recurring optional cost is exactly what `on_caster_spends_action` was designed for.
- **Attachment**: `{ kind: "object", count: 1, filter: { manufactured: true, material: "metal" } }` — the manufactured metal object constraint is fully expressible with the existing `ObjectFilter`.
- **Bonus Action trigger**: `{ kind: "on_caster_spends_action", cost: { kind: "bonus_action" } }` — this was added for Heat Metal-style "each later turn, optionally spend a Bonus Action" patterns.
- **Damage atom**: `{ kind: "damage", damageType: "fire", amount: ... }` — fire damage is in the vocabulary.
- **Upcast scaling**: `{ kind: "linear_per_level", axis: "slot", base: { dice: 2, dieSize: 8 }, perLevel: { dice: 1 }, startingAtLevel: 2 }` — slot-linear scaling from level 2 is representable.

## What blocks clean encoding

### Gap 1 — Missing atom: `force_drop_item`

**Evidence**: "the creature must succeed on a Constitution saving throw or **drop the object** if it can"

The fail branch of the save gate causes the creature to release a held item. No atom in v4 or the current `EffectAtom` union models forcibly dropping/releasing a held or worn object. This is distinct from:
- `force_move` — repositions the creature, not an item
- `apply_condition` — no SRD condition models "must release item"
- `alter_item_kind` — changes the item's form, not its holder relationship

**Proposed atom**:
```typescript
| {
    readonly kind: "force_drop_item";
    // No fields needed beyond the kind discriminant for the basic case.
    // Future widening: filter to specific item categories (wielded weapon,
    // worn armor) if needed by other units.
  }
```

### Gap 2 — Missing surface variant: object-contact propagation

**Evidence**: "Any creature **in physical contact** with the object takes 2d8 Fire damage"

The object is the attachment anchor. The effect recipients are creatures touching the object, not the object itself. The current surface has no mechanism for an ongoing operation on an `object` attachment to nominate "creatures currently in physical contact with this object" as the effect target.

Every existing `EffectAtom` that deals damage (`damage`, `heal_hp`, etc.) assumes the effect applies to the "attached subject." For creature attachments (`target`, `mark`), the attached subject is a creature, so damage is unambiguous. For an `object` attachment, the surface is silent about how damage propagates to interacting creatures.

**Proposed surface variant**: A new propagation concept on `object` attachments — either an implicit "affects creatures in contact" rule for damage atoms, or an explicit field:
```typescript
// On ObjectAttachment or OngoingOperation:
readonly propagatesTo?: "creatures_in_contact";
```

This would allow the tracer to emit a correct `attaches_to` edge from the damage effect to the object, with an implied secondary propagation to touching creatures.

### Gap 3 — Missing surface variant: conditional OR within save_gate onFail

**Evidence**: "the creature must succeed on a Constitution saving throw or drop the object if it can. **If it doesn't drop the object**, it has Disadvantage on attack rolls and ability checks"

The fail outcome is not a single effect but a conditional sequence:
1. Attempt to drop the object.
2. If the creature dropped the object → outcome complete.
3. If the creature did NOT drop the object (because it chose not to, or cannot) → apply Disadvantage.

The current `save_gate.onFail: EffectAtom` accepts a single effect atom (or a `composite`). A `composite` applies all children unconditionally — it cannot express "apply A; if A succeeded, skip B; otherwise apply B." This conditional branching within a fail outcome needs a new surface shape:

```typescript
// Proposed variant for save_gate onFail:
| {
    readonly kind: "try_or_fallback";
    readonly try: EffectAtom;      // force_drop_item
    readonly fallback: EffectAtom; // modify_roll_advantage (disadvantage)
  }
```

### Gap 4 — Missing surface variant: `RiderExpiry.caster_turn_start`

**Evidence**: "it has Disadvantage on attack rolls and ability checks **until the start of your next turn**"

"Your next turn" refers to the **caster's** next turn start. The existing `RiderExpiry` variants are:
- `target_uses_or_turn_start` — target's turn start
- `end_of_next_turn` — presumably the target's or the attacker's next turn END

Neither variant covers a caster-scoped turn-start boundary. A new variant is needed:

```typescript
| { readonly kind: "caster_turn_start" }
```

This surfaces in other spells that grant short-duration riders scoped to the caster's initiative (e.g., Vicious Mockery's disadvantage "on the next attack roll it makes before the end of its turn" is target-scoped, but other spells explicitly tie expiry to the caster's turn).

## Encoding recommendation

Do not attempt partial encoding. The save mechanic (drop or disadvantage) is Heat Metal's core mechanical identity — not a minor rider. The damage loop alone would produce a misleadingly simple trace that omits the spell's primary combat function.

Once all four gaps are resolved:
1. Add `force_drop_item` to `EffectAtom`.
2. Clarify how `object` attachment operations propagate to touching creatures (implicit rule or explicit `propagatesTo` field).
3. Add `try_or_fallback` (or equivalent) to the save_gate onFail shape.
4. Add `RiderExpiry.caster_turn_start`.

The dhall encoding would then follow the `ongoing_effect` family with:
- `object` attachment (manufactured metal, range 60 ft)
- `initialPhase`: `direct` phase → `damage` (2d8 fire) with contact-propagation to touching creatures
- `operations[0]`: `on_caster_spends_action: bonus_action` → `save_gate` (Con, caster spell save DC):
  - `onFail`: `try_or_fallback { try: force_drop_item, fallback: composite [modify_roll_advantage disadvantage on attack_roll + ability_check, expiresOn: caster_turn_start] }`
  - `onSuccess`: `none`
- Slot scaling: `linear_per_level` axis=slot, +1d8 per slot above 2
