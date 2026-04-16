# Proposal: Necklace of Adaptation encoding gaps

## Outcome: `structural_widening`

The Necklace of Adaptation cannot be encoded in the current surface. The primary blocker is that `magic_item` is not a member of `UnitRecord` in `types.ts`. Three secondary gaps also exist at the surface/atom level.

---

## Gap 1 — Structural: `MagicItemRecord` missing from `UnitRecord` (PRIMARY BLOCKER)

`UnitRecord` is currently:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

The v4 taxonomy includes `magic_item_root` as a source atom, but no corresponding record kind or mechanics family exists in the surface type layer. No encoding — honest or otherwise — is possible without:

- A `MagicItemRecord` top-level type (with `kind: "magic_item"`)
- A `MagicItemMechanics` union (at minimum a `passive_while_attuned` family for always-on effects)
- `attunement_slot` resource representation (v4 lists this atom but the surface has no type for it)

**Proposed shape (sketch):**

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;
};

// Minimum family needed for this item:
export type PassiveWhileAttunedMechanics = {
  readonly family: "passive_while_attuned";
  readonly effects: ReadonlyArray<MagicItemPassiveEffect>;
};
```

---

## Gap 2 — Atom: environmental immunity / passive breathing

The text says "you can breathe normally in any environment." This is a passive world-state bypass — it suppresses suffocation regardless of environment (underwater, vacuum, toxic gas). It has no deterministic resolution gate.

Closest existing atoms:
- `grant_resistance` — covers damage type resistance, not environmental hazards
- `block_travel` — movement restriction, not applicable
- No atom covers passive environmental immunity

**Proposed widening:** A new effect atom `grant_environmental_immunity` (or a variant of an existing suppression atom) with a closed enum of `EnvironmentalHazard` values (e.g., `"suffocation"`). Alternatively, a broader `suppress_hazard` atom with a hazard type field.

**Evidence:** "you can breathe normally in any environment"

---

## Gap 3 — Surface: condition-scoped saving throw advantage

The text says "Advantage on saving throws made to avoid or end the Poisoned condition." The v4 atom `modify_roll_advantage` exists, and `saving_throw` is a valid `RollKind`. However, the `ModifyRollAdvantageRider` shape in `types.ts` has no filter predicate for the condition being saved against:

```typescript
export type ModifyRollAdvantageRider = {
  readonly kind: "modify_roll_advantage";
  readonly mode: "advantage" | "disadvantage";
  readonly on: ReadonlyArray<RollKind>;  // ← no condition filter here
  readonly count: number;
  readonly expiresOn: RiderExpiry;
};
```

For a magic item passive, `count` and `expiresOn` also don't apply (the effect is always-on while attuned, not per-use with expiry).

**Proposed widening:** Add an optional `conditionFilter` field to `ModifyRollAdvantageRider` (or to the magic item passive effect variant):

```typescript
conditionFilter?: ReadonlyArray<Condition>;  // saves targeting these conditions
```

The `Condition` type currently only includes `"prone"` — would need `"poisoned"` added.

**Evidence:** "you have Advantage on saving throws made to avoid or end the Poisoned condition"

---

## Gap 4 — Surface: attunement representation

The item requires attunement. The v4 taxonomy lists `attunement_slot` as a resource atom, but `types.ts` has no surface type for it. For the tracer to emit a correct graph, the `MagicItemRecord` needs an `attunement_slot` resource node. This is a surface gap (atom exists in taxonomy but has no type).

---

## Summary

| Gap | Kind | Blocks encoding? |
|-----|------|-----------------|
| No `MagicItemRecord` in `UnitRecord` | structural | Yes (primary) |
| No environmental immunity atom | atom_widening | Yes |
| No condition-scoped save advantage filter | surface_widening | Yes |
| No attunement_slot surface type | surface_widening | Yes |

All four gaps must be resolved before this unit can yield a clean trace.
