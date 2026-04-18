# Proposal: `dissolve_adhesive` atom — Universal Solvent

**Unit:** `magic_item_universal_solvent` (Legendary, no attunement)  
**Outcome:** `atom_widening`  
**Blocking gap:** no effect atom for dissolving adhesive bonds

---

## What fits

The item frame encodes cleanly with existing surface primitives:

| Field | Encoding |
|---|---|
| kind | `magic_item` |
| rarity | `legendary` |
| requiresAttunement | `false` |
| mechanics family | `activation` |
| activationCost | `{ kind: "standard_action", action: "utilize" }` |
| resource | `charge_pool`, cap `fixed(uses: 6)` ← upper bound; real cap is initial stock |
| initialCount | `{ kind: "fixed", expr: { dice: 1, dieSize: 6, flat: 1 } }` |
| resetCadence | `never` (consumable; no refill) |
| destruction | `permanent_on_empty` |
| attachment | `{ kind: "object", count: 1 }` (adhesive surface within reach) |
| range | `{ kind: "touch" }` |

The charge pool idiom fits: 1+ ounces are spent per Utilize, and `charge_pool` + variable-cost activation is the established pattern.

---

## What is missing

### `dissolve_adhesive` (new effect atom)

**Evidence:**  
> "Each ounce instantly dissolves up to 1 square foot of adhesive it touches, including *Sovereign Glue*."

**Why no existing atom covers this:**

- `end_ongoing_spells` — only ends spell effects; Sovereign Glue is a magic item effect (`bond_objects`), not an ongoing spell. Mundane adhesive is not a spell at all.
- `negate_named_effect` / `negate_triggering_spell` — reactive grammar (fires in a reaction window); Universal Solvent acts proactively via Utilize action.
- `remove_condition` — bonds are not conditions.
- `alter_item_kind` — changes form, not bond state.
- `block_reanimation` — unrelated.

The `bond_objects` atom in `types.ts` explicitly anticipates this gap:
> "The 'broken only by Universal Solvent / Oil of Etherealness / Wish' clause is a property of the resulting bond — **those counter-items carry the dispelling semantics in their own content**, not this atom."

### Proposed atom shape

```typescript
| {
    readonly kind: "dissolve_adhesive";
    // Square feet of adhesive coverage dissolved per unit of resource spent.
    // Universal Solvent: 1 sq ft per ounce (= per charge spent).
    readonly sqFeetPerCharge: number;
    // Explicitly names the bond_objects effects this dissolves, so the tracer
    // can emit a named counter-relation. Absent = dissolves any adhesive.
    readonly counters?: ReadonlyNonEmptyArray<"bond_objects">;
  }
```

**Semantics:**  
- On activation, the caster spends N charges (N ≥ 1, player choice).  
- Dissolves N × `sqFeetPerCharge` square feet of adhesive contact at the attachment object.  
- If the object has an active `bond_objects` effect (e.g., from Sovereign Glue), that bond is ended.  
- Mundane adhesive (non-magical glue, paste, etc.) is also affected — purely narrative, no additional atom needed.

**Coverage area as DM agenda:**  
The "1 square foot per ounce" is a physical coverage cap, not a tracked game-state number. The tracer emits it as metadata on the atom label; the engine surfaces it as a DM-resolved constraint (how much of the bonded surface is covered).

---

## Impact on other units

- **Oil of Etherealness** — SRD text lists it alongside Universal Solvent as a Sovereign Glue counter. Same atom would apply.
- **Wish** — The Wish spell's "break Sovereign Glue" is one instance of Wish's general "duplicate any spell or produce any effect" power, which is already DM-agenda. No separate atom needed.

---

## Classification rationale

`atom_widening` (not `structural_widening`): the `activation` family with `charge_pool` resource is an exact fit. Only the leaf effect atom is missing. Adding `dissolve_adhesive` to `EffectAtom` in `types.ts` and a corresponding case to the tracer's `traceEffectAtom` switch would make this unit encodable with no family changes.
