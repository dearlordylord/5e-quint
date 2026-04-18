# Proposal: Improved Blessed Strikes (Cleric L14)

**Outcome**: `structural_widening`

## Unit Summary

Level 14 upgrade to the Blessed Strikes feature. Grants one of two improvements depending on which path the character chose earlier:

- **Divine Strike** path: extra weapon-hit damage increases from 1d8 to 2d8.
- **Potent Spellcasting** path: after dealing damage with a cleric cantrip, the caster may grant Temporary Hit Points equal to twice their Wisdom modifier to themselves or a creature within 60 feet.

## Why the Unit Does Not Fit

### 1. `on_hit_trigger` absent from `ClassFeatureComponentMechanics`

Divine Strike is an on-weapon-hit rider — when the cleric hits with a weapon, they deal extra damage. `OnHitTriggerMechanics` already exists on the surface (used by masteries and magic items), but `ClassFeatureComponentMechanics` is constrained to `PassiveMechanics | ActivatedAbilityMechanics`. Neither can express "when you hit with a weapon attack, also deal Nd8 damage." Admitting `OnHitTriggerMechanics` to `ClassFeatureComponentMechanics` (and by extension `ClassFeatureMechanics`) would resolve this.

### 2. Missing `OngoingTrigger` variant: cantrip-deals-damage

Potent Spellcasting's upgrade fires when the caster casts a cleric cantrip and deals damage. The existing trigger vocabulary covers `on_caster_attack_hit`, `on_caster_turn_start`, `on_caster_spends_action`, etc. — but not "caster's cantrip resolved and dealt damage to a creature." Many cantrips (Toll the Dead, Sacred Flame, Word of Radiance) deal damage without an attack roll, so `on_caster_attack_hit` would be a misrepresentation.

**Proposed variant**:
```typescript
| { readonly kind: "on_caster_cantrip_deals_damage" }
```

This trigger fires once per cantrip cast that results in damage to at least one creature.

### 3. Missing coefficient on ability modifier in `DiceExpr`

The temp HP amount is "twice your Wisdom modifier." `DiceExpr` supports:
- `spellcastingMod: true` — adds the spellcasting ability modifier (×1)
- `abilityModifier: Ability` — adds a named ability modifier (×1)

There is no multiplier/coefficient field. "2 × WIS mod" requires either:

**Option A**: Add an optional `abilityModifierCoefficient` field to `DiceExpr`:
```typescript
type DiceExprBase = { dice: number; dieSize: number; flat?: number };
type DiceExpr = DiceExprBase & (
  | { ... }
  | { abilityModifier: Ability; abilityModifierCoefficient?: number; ... }
);
```

**Option B**: Encode as `DiceDelta` with a new `kind: "ability_modifier_scaled"` variant:
```typescript
| { readonly kind: "ability_modifier_scaled"; readonly ability: Ability; readonly coefficient: number; readonly sign: "+" | "-" }
```

Option A is narrower and keeps the existing DiceExpr shape intact; Option B is more general. The coefficient is always a small positive integer in SRD (1, 2, 5 observed).

### 4. No encoding for prior-choice-conditional class feature upgrades

The feature's entire premise is "whichever option you chose for Blessed Strikes now upgrades." The surface has no way to express "this mechanic is active only if the character previously selected path X from an earlier feature." This is a structural gap that would require either:

- A `condition` variant on class feature mechanics referencing a prior feature choice, or
- Encoding the two upgrade paths as two distinct class feature records, each authored independently, with the link to the prior choice recorded only in provenance/description.

The second approach (two separate records) is the lower-cost encoding and avoids inventing a cross-feature reference mechanism. The tracer would simply emit two separate graphs; the relation to Blessed Strikes would be prose-level only.

## Minimum Widenings Required

| # | Change | Scope |
|---|--------|-------|
| 1 | Admit `OnHitTriggerMechanics` to `ClassFeatureComponentMechanics` | `types.ts` |
| 2 | Add `on_caster_cantrip_deals_damage` variant to `OngoingTrigger` | `types.ts` |
| 3 | Add `abilityModifierCoefficient?: number` to `DiceExpr` (or new `DiceDelta` variant) | `types.ts` |
| 4 | Split unit into two conditional records OR add prior-choice condition encoding | authoring convention or `types.ts` |

Items 1–3 together unblock encoding both paths independently. Item 4 is needed only if the feature must remain a single authored unit.
