# Codex Review: Spend-then-Refund Counterspell Slot Logic

## Question

We implemented a "spend-then-refund" pattern for spell slot expenditure in the battle spec (`battle.qnt`). Please review the following changes for correctness against SRD 5.2.1 rules:

### SRD 5.2.1 Rules (exact quotes)

**One Spell with a Spell Slot per Turn** (Spells/Gaining-and-Casting.md):
> On a turn, you can expend only one spell slot to cast a spell.

**Counterspell** (Spells/Descriptions-A-D.md):
> You attempt to interrupt a creature in the process of casting a spell. The creature makes a Constitution saving throw. On a failed save, the spell dissipates with no effect, and the action, Bonus Action, or Reaction used to cast it is wasted. If that spell was cast with a spell slot, the slot isn't expended.

**Reaction** (Rules-Glossary.md):
> You can take a Reaction on another creature's turn, and if you take it on your own turn, you can do so even if you also take an action, a Bonus Action, or both.

### Design Decision

**Old pattern (deferred expenditure):** Slot was not spent until the spell resolved. If countered, the slot was never spent (implicit refund). Problem: at the time the Counterspell reaction window opens, the caster's `slotExpendedThisTurn` is still `false`, allowing them to counter-counterspell on the same turn (2 slot expenditures).

**New pattern (spend-then-refund):** Slot is spent immediately when the spell is cast (sets `slotExpendedThisTurn = true`). If the spell is countered, the slot is refunded via `refundSlot` (restores slot count) but `slotExpendedThisTurn` stays `true` -- the one-slot-per-turn quota was used.

### Specific Questions

1. Is it correct that a caster who had their spell countered (slot refunded) cannot cast another leveled spell on the same turn? (We believe yes -- the "one slot per turn" quota is consumed by the act of casting, not by whether the slot remains spent.)

2. Is `refundSlot` correctly restoring only the slot count without clearing the per-turn flag? This models "the slot isn't expended" (Counterspell text) while maintaining "you can expend only one spell slot" (one-slot-per-turn rule).

3. The `spellStackDistinctCasters` invariant was weakened to exclude ritual entries. Rituals don't expend slots, so a ritual caster can Counterspell on the same turn. But ritual casting takes 10 extra minutes per SRD -- is it even possible to ritual-cast in combat? Our battle model allows `ritual: true` on cast actions, which is somewhat abstract.

4. When a Counterspell is itself countered (counter-counterspelled), the CS's slot should also be refunded per the same Counterspell text. We carry `slotLvl: csSlotLvl` on CS stack entries for this purpose. Is this correct?

---

## Changed Code (battle.qnt)

### New helper: `refundSlot`

```quint
/// Refund a spell slot without clearing slotExpendedThisTurn.
/// SRD 5.2.1 Counterspell: "If that spell was cast with a spell slot, the slot isn't expended."
/// But "One Spell with a Spell Slot per Turn" still applies -- the caster used their
/// one-slot-per-turn quota even though the slot is returned. slotExpendedThisTurn stays true.
pure def refundSlot(
  cs: CreatureId -> Combatant, id: CreatureId, level: int
): (CreatureId -> Combatant) = {
  setSlots(cs, id, pRestoreSlot(cs.get(id).slots, level))
}
```

### Cast actions (4 total, same pattern -- shown for bCastSaveSpell)

Before:
```quint
val cs1 = setTurn(bCreatures, activeId, newTurn)
// ... build spell context ...
val csElig = eligibleForCounterspell(cs1, activeId)  // cs1 has NO slot spent
if (csElig.size() > 0) {
  bCreatures' = cs1,  // enter CS window without spending
} else {
  val cs2 = expendSlot(cs1, activeId, slotLvl)  // spend only if no CS possible
}
```

After:
```quint
val cs1 = setTurn(bCreatures, activeId, newTurn)
// Spend-then-refund: expend slot immediately (sets slotExpendedThisTurn = true).
val cs2 = if (ritual) cs1 else expendSlot(cs1, activeId, slotLvl)
// ... build spell context ...
val csElig = eligibleForCounterspell(cs2, activeId)  // cs2 has slot spent
if (csElig.size() > 0) {
  bCreatures' = cs2,  // enter CS window with slot already spent
} else {
  // slot already spent, resolve immediately
}
```

### resolveSpellEntry -- no more deferred expenditure

Before:
```quint
val cs1 = if (not(isRitual) and slotLvl > 0) expendSlot(cs, casterId, slotLvl) else cs
```

After:
```quint
// Slot already spent at cast time (spend-then-refund pattern).
val cs1 = cs
```

### CS succeeds paths -- refund added

When a spell is successfully countered, the fizzled spell's slot is refunded:

```quint
// Original spell fizzled -> refund slot (SRD 5.2.1 Counterspell: "the slot isn't expended").
// slotExpendedThisTurn stays true (one-slot-per-turn quota used).
val csRefund = if (not(popped.top.ritual) and popped.top.slotLvl > 0)
  refundSlot(cs, popped.top.spellCasterId, popped.top.slotLvl) else cs
{ creatures: csRefund, phase: BPActiveTurn, stack: popped.rest }
```

Same pattern for CS-fizzled (counter-counterspelled) entries.

### CS stack entry -- slotLvl carries refund level

Before:
```quint
slotLvl: 0,  // CS slot already spent at cast time (reaction)
```

After:
```quint
slotLvl: csSlotLvl,  // CS slot spent at cast time; carried for refund if counter-counterspelled
```

### Updated invariant

```quint
/// Non-ritual spell stack entries have distinct casters.
val spellStackDistinctCasters =
  val nonRitual = listToSet(bSpellStack).filter(e => not(e.ritual))
  nonRitual.forall(e1 =>
    nonRitual.forall(e2 =>
      (e1.spellCasterId == e2.spellCasterId) implies (e1 == e2)
    )
  )
```
