# Proposal: `lightning_bolt` — surface_widening

## Gap

Lightning Bolt cannot be encoded because the `area` attachment in `types.ts` only supports a `sphere` shape. Lightning Bolt uses a **Line** area of effect (100 ft long, 5 ft wide).

## Evidence

> "A stroke of lightning forming a 100-foot-long, 5-foot-wide Line blasts out from you in a direction you choose. Each creature in the Line makes a Dexterity saving throw, taking 8d6 Lightning damage on a failed save or half as much damage on a successful one."

## What fits today

| Component | Status |
|---|---|
| Family: `activation` | ✓ fits |
| Phase: `save_gate` (DEX save, caster spell save DC) | ✓ fits |
| Effect `damage` with `damageType: "lightning"` | ✓ fits |
| Slot-axis scaling: `linear_per_level`, +1d6/slot above 3 | ✓ fits |
| Half damage on success (4d6 lightning, +1d6/slot above 3) | ✓ fits via circle_of_death precedent |
| Range: `self` | ✓ fits |
| Area attachment kind `area` | ✓ kind exists |
| **Area shape: `line`** | **✗ missing** |

## Proposed widening

Add a `line` variant to the `area` attachment shape union in `types.ts`:

```typescript
// Current (only sphere):
readonly shape: { readonly kind: "sphere"; readonly radiusFeet: number };

// Proposed (add line):
readonly shape:
  | { readonly kind: "sphere"; readonly radiusFeet: number }
  | { readonly kind: "line"; readonly lengthFeet: number; readonly widthFeet: number };
```

The tracer's `traceAttachment` function would then need a branch for `kind: "line"` in its `area` case label.

## AreaOrigin note

Lightning Bolt uses range `self` — the Line originates from the caster. `AreaOrigin` `point_within_range` is serviceable: with range=self, the only point "within range" is the caster's position. No new AreaOrigin variant is strictly required, though a `from_self` variant would be more precise.

## What the trace would look like (if widening were in place)

```
spell_root → activate → [action_quota, spell_slot ≥ 3]
activate → area (line 100×5 ft, from self)
activate → save_gate (DEX, caster spell save DC) → area
  save_gate →[branches_on_save fail]→ damage (8d6 lightning, scale_die_count slot axis)
  save_gate →[branches_on_save success]→ damage (4d6 lightning, scale_die_count slot axis)
spell_slot → scale_die_count → damage (both branches)
```

Expected atoms: `action_quota`, `activate`, `area`, `damage`, `save_gate`, `scale_die_count`, `spell_root`, `spell_slot`  
Expected relations: `attaches_to`, `branches_on_save`, `consumes`, `grants`, `modifies`, `roots`
