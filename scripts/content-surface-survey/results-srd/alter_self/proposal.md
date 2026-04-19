# Proposal: Alter Self — surface_widening

## Outcome summary

**Overall**: `surface_widening` — one field-type widening needed on the existing `natural_weapons` atom.

Two of the three Alter Self options encode cleanly:
- **Aquatic Adaptation**: `water_breathing` + `grant_speed { speedKind: "swim", feet: { kind: "walk_speed" } }` — fully expressed with existing atoms and the §A14 `LinkedSpeed` shape.
- **Change Appearance**: purely narrative (no statistics change) — the `CastTimeEffectModeChoice` option correctly omits `effects` per the type comment.

The remaining option is partial:
- **Natural Weapons**: `natural_weapons { damageType: DamageType, damageDie: 6 }` — atom exists, die value is correct, but the `damageType` field must be fixed at one type rather than expressing the cast-time growth sub-choice.

## Proposed widening

### `natural_weapons.damageType: DamageType → DamageTypeRef`

**SRD evidence**: "You grow claws (Slashing), fangs (Piercing), horns (Piercing), or hooves (Bludgeoning). When you use your Unarmed Strike to deal damage with that new growth, it deals 1d6 damage of the type in parentheses..."

The player chooses ONE growth type at cast time. Each growth maps to a fixed damage type:
- Claws → Slashing
- Fangs → Piercing
- Horns → Piercing
- Hooves → Bludgeoning

This is a cast-time selection (like `DamageTypeRef.CastTimeChoice<DamageType>`), not a fixed property of the atom itself. Widening the field from `DamageType` to `DamageTypeRef` unblocks the correct encoding:

```typescript
// current
| {
    readonly kind: "natural_weapons";
    readonly damageType: DamageType;
    readonly damageDie: number;
  }

// proposed
| {
    readonly kind: "natural_weapons";
    readonly damageType: DamageTypeRef;  // DamageType | CastTimeChoice<DamageType>
    readonly damageDie: number;
  }
```

**Encoding with widening**:
```json
{
  "kind": "natural_weapons",
  "damageType": {
    "kind": "choice",
    "label": "Growth type",
    "options": ["slashing", "piercing", "bludgeoning"]
  },
  "damageDie": 6
}
```

Note: fangs and horns both deal piercing, so only three distinct damage types appear in the choice set.

## Mid-duration switch semantics

The top-level `allowsMidDurationSwitchAs: "magic_action"` correctly encodes the SRD's "you can take a Magic action to replace the option you chose with a different one." This is a switch between the THREE top-level options (Aquatic Adaptation, Change Appearance, Natural Weapons) — not a re-selection of the growth sub-type within Natural Weapons. The sub-choice of growth type is made once at cast time and is fixed for the duration of that option selection.

The `CastTimeEffectModeChoice` model captures this correctly: the top-level option switch is the `allowsMidDurationSwitchAs` mechanism, while the growth-type sub-choice lives inside the `natural_weapons` atom's `damageType` field.

## What is already clean

| Component | Status |
|---|---|
| `activation` family, `direct` phase, `CastTimeEffectModeChoice` | ✓ fits |
| `allowsMidDurationSwitchAs: "magic_action"` | ✓ fits |
| `water_breathing` atom | ✓ fits |
| `grant_speed { speedKind: swim, feet: { kind: walk_speed } }` (LinkedSpeed) | ✓ fits |
| Change Appearance as no-effects narrative branch | ✓ fits |
| `natural_weapons { damageDie: 6 }` structural shape | ✓ fits (damageType field type is the gap) |
| TypeScript typecheck | ✓ passes |
| Tracer | ✓ emits complete graph |
