# Proposal: Widening for Innate Sorcery (sorcerer L1)

## Unit

- **Slug**: `sorcerer_innate_sorcery_l1`
- **Name**: Innate Sorcery (Sorcerer Level 1)
- **Kind**: `class_feature`
- **Source**: SRD 5.2.1 — Classes/Sorcerer#Level 1: Innate Sorcery

## Outcome: `atom_widening`

The resource, activation cost, and reset cadence all encode cleanly:

- `activationCost`: `{ kind: "bonus_action" }` ✓
- `resource`: `{ kind: "use_count", cap: { kind: "fixed", uses: 2 } }` ✓
- `resetCadence`: `{ kind: "long_rest" }` ✓

Three gaps block honest encoding of the effects and duration.

---

## Gap 1 — `atom_widening`: No v4 atom for modifying spell save DC

**Evidence**: "The spell save DC of your Sorcerer spells increases by 1."

The spell save DC is a static numeric threshold (`8 + PB + spellcasting modifier`), analogous to AC on the offensive side. The closest v4 candidates do not cover it:

- `modify_roll_numeric` — modifies the numeric result of dice rolls (e.g., Bless adds +1d4 to attack rolls and saves). A spell save DC is not a roll; it is a fixed computed value.
- `modify_ac` — modifies a static defense threshold; structurally parallel, but `modify_ac` is a defensive stat. There is no offensive counterpart in v4.

**Proposed atom**: `modify_spell_dc`

| Field | Value |
|---|---|
| Category | effect |
| Semantics | Adds a numeric delta to the caster's effective spell save DC for a duration |
| Distinguishes from `modify_roll_numeric` | The DC is a fixed computed value, not the result of a die roll; it does not participate in advantage/disadvantage mechanics |
| Distinguishes from `modify_ac` | Offensive threshold vs. defensive threshold; separate tracking is needed because some features that affect one do not affect the other |

---

## Gap 2 — `surface_widening`: `ClassFeatureEffect` missing `modify_roll_advantage` variant

**Evidence**: "You have Advantage on the attack rolls of Sorcerer spells you cast."

The v4 atom `modify_roll_advantage` exists and is already used in the mastery tracer (e.g., Sap grants disadvantage on attack rolls). However, `ClassFeatureEffect` only admits:

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

A new variant is needed:

```typescript
export type ModifyRollAdvantageEffect = {
  readonly kind: "modify_roll_advantage";
  readonly mode: "advantage" | "disadvantage";
  readonly on: ReadonlyArray<RollKind>;
};
```

This also exposes a **class-scope filter** requirement: Innate Sorcery's advantage applies only to Sorcerer spell attack rolls, not to all attack rolls. The current `modify_roll_advantage` shape on masteries carries no class or spell-origin filter. The surface would need a way to express "on: attack rolls of Sorcerer spells" rather than the flat `RollKind[]` the mastery version uses. This is a secondary surface gap within the same widening.

---

## Gap 3 — `surface_widening`: `ClassFeatureActivationMechanics` lacks a `duration` field

**Evidence**: "you can unleash that magic for 1 minute, during which you gain the following benefits"

Innate Sorcery creates a 1-minute timed buff window. The current class feature schema has no duration concept:

```typescript
type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource: UseCountResource;
  readonly resetCadence: RestResetCadence;
};

export type ClassFeatureActivationMechanics = ClassFeatureMechanicsHeader & {
  readonly family: "activation";
  readonly effect: ClassFeatureEffect;
};
```

The lifecycle atoms `persist` and `expire` exist in v4 and are used by spell mechanics, but they are not wired into the class feature surface or tracer. Action Surge and Second Wind are instant-use features with no duration; Innate Sorcery persists for a full minute.

**Proposed addition**: an optional `duration?: Duration` field on `ClassFeatureActivationMechanics`, reusing the existing `Duration` type from spell mechanics. The tracer would emit `persist` → `expire` lifecycle nodes when this field is present, mirroring the spell `timed` duration path.

---

## Summary

| Gap | Classification | Blocks encoding? |
|---|---|---|
| No `modify_spell_dc` atom in v4 | `atom_widening` | Yes |
| `ClassFeatureEffect` lacks `modify_roll_advantage` variant | `surface_widening` | Yes |
| `ClassFeatureActivationMechanics` lacks `duration` field | `surface_widening` | Yes |

All three gaps must be resolved before Innate Sorcery can be honestly encoded. The dominant gap is (1), which forces the `atom_widening` classification.
