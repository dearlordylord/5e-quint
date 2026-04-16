# Proposal: Widenings for Spell Mastery (Wizard L18)

## Unit

**Name:** Spell Mastery (Wizard L18)  
**Kind:** `class_feature`  
**Provenance:** srd-5.2.1 — Classes/Wizard#Level 18: Spell Mastery

## Outcome

`atom_widening` — the unit's primary mechanic (slot-free casting of chosen spells) requires a new v4 atom and a new `ClassFeatureEffect` variant. No `.dhall` or `.json` authored.

---

## What the feature does

> "You always have those spells prepared, and you can cast them at their lowest level without expending a spell slot. To cast either spell at a higher level, you must expend a spell slot."
> "Whenever you finish a Long Rest, you can study your spellbook and replace one of those spells with an eligible spell of the same level from the book."

Three distinct mechanics:

1. **Spell acquisition/selection** — choose one L1 and one L2 spell from the spellbook (constraint: casting time = action).
2. **Slot-free casting at base level** — the primary mechanic. These spells cost no spell slot when cast at their lowest level.
3. **Long-rest swap** — on each long rest, optionally replace one mastered spell with another eligible spell from the book.

---

## Why it doesn't fit

### 1. `ClassFeatureEffect` has no at-will-cast / suppress-slot-cost member

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

The core effect is: *for a specific set of player-chosen spells, suppress the spell slot cost when cast at base level*. Neither existing member comes close. Forcing this into `grant_extra_action` or `heal_hp` would produce a dishonest trace.

### 2. No v4 atom for suppress-slot-cost

The v4 taxonomy (§7 Resource Atoms, §9 Effect Atoms) has:
- `spell_slot` — the resource consumed
- `suppress` (procedure) — suppresses an ongoing *effect*, not a resource cost

There is no atom representing "this resource cost is waived for a specific spell." `grant_spell_access` covers adding a spell to the prepared/known list, but not removing its resource cost.

### 3. No surface shape for "chosen spell reference" in class features

The feature requires referencing up to two spells chosen at acquisition time from the spellbook, with level and casting-time constraints. The existing `stored_spell` attachment type lives in `SpellMechanics` (for spells like Contingency that store another spell). There is no equivalent in `ClassFeatureMechanics`.

### 4. Long-rest swap is a secondary gap

The mechanic "on long rest, optionally replace one mastered spell" needs:
- A rest-gated replace operation on a stored spell reference
- Closest atoms: `replace_on_recast`, `rest_window` — neither covers this shape

This is secondary; the primary blocker is the missing slot-suppression atom/effect.

---

## Proposed widenings

### W1 (atom_widening) — New atom: `suppress_slot_cost`

A new v4 effect atom representing: *for a named spell reference, the spell slot resource is not consumed when cast at base level.*

Graph shape:
```
class_feature_root → activate → suppress_slot_cost → stored_spell_ref
```

- Placed in §9 Effect Atoms (or possibly §7 Resource Atoms as a modifier)
- `suppress_slot_cost` carries a reference to the spell(s) and the level threshold ("at lowest level only")

### W2 (new_variant) — New `ClassFeatureEffect` variant

```typescript
export type GrantAtWillCastEffect = {
  readonly kind: "grant_at_will_cast";
  readonly spellRef: SpellSelection;   // see W3
  readonly atLevel: SpellLevel;        // base level of the chosen spell
};
```

Extends `ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect | GrantAtWillCastEffect`.

### W3 (new_variant) — New surface shape: `SpellSelection`

A typed reference to a spell chosen from the spellbook at feature acquisition, with constraints:

```typescript
export type SpellSelectionFromBook = {
  readonly kind: "from_spellbook";
  readonly spellLevel: SpellLevel;
  readonly constraint: { castingTime: "action" };  // or a closed CastingTimeConstraint type
};
```

Used as the `spellRef` field in `GrantAtWillCastEffect`. The "choose two" (one L1, one L2) is expressed by having two parallel `GrantAtWillCastEffect` records (or an array) on the feature.

### W4 (new_variant, secondary) — New `RestResetCadence`-adjacent shape for swap

The long-rest swap mechanic can be deferred — it is a preparation-phase operation (not a combat mechanic) and may belong to a different surface layer. If needed, it could be expressed as:

```typescript
export type SpellSwapOnRest = {
  readonly kind: "replace_spell_on_rest";
  readonly restKind: "long";
  readonly fromPool: SpellSelectionFromBook;
};
```

This is lower priority than W1–W3.

---

## Summary table

| Widening | Kind | Priority |
|---|---|---|
| `suppress_slot_cost` atom | `atom_widening` | Blocker |
| `GrantAtWillCastEffect` ClassFeatureEffect variant | `new_variant` | Blocker |
| `SpellSelectionFromBook` surface shape | `new_variant` | Blocker |
| Long-rest spell swap shape | `new_variant` | Secondary |
