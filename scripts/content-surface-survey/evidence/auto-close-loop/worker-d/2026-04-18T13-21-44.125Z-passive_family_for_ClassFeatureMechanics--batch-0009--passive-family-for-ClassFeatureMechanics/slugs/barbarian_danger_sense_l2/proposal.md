# Proposal: Widening for Danger Sense (Barbarian L2)

## Outcome: `structural_widening`

Danger Sense cannot be honestly encoded in the current surface. Three gaps block it, all requiring resolution together.

---

## Unit text (SRD 5.2.1, Classes/Barbarian#Level 2: Danger Sense)

> You gain an uncanny sense of when things aren't as they should be, giving you an edge when you dodge perils. You have Advantage on Dexterity saving throws unless you have the Incapacitated condition.

---

## Gap 1 (primary, structural): No `passive` family for `ClassFeatureMechanics`

The current surface defines:

```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
```

The only family is `activation`, which mandates:
- `activationCost` — something the player spends (free, bonus action, etc.)
- `resource` — a use-count pool
- `resetCadence` — when the pool refills (short rest, long rest, etc.)

Danger Sense has **none of these**. It is not activated; it is not consumed; it does not reset. It is a permanent property of the barbarian's creature state — always on as long as the creature is alive and not Incapacitated.

Forcing it into `activation` with `{ kind: "free" }` cost and a fixed use-count of 1 would produce a trace that claims the barbarian activates Danger Sense once per reset, which is false.

**Proposed widening:** A `passive` family for `ClassFeatureMechanics`:

```typescript
export type ClassFeaturePassiveMechanics = {
  readonly family: "passive";
  readonly effect: ClassFeaturePassiveEffect;
};
```

No `activationCost`, `resource`, or `resetCadence` — the effect applies continuously from the level the feature is acquired.

---

## Gap 2 (surface): No `modify_roll_advantage` variant in `ClassFeatureEffect`

The current `ClassFeatureEffect` is:

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

Danger Sense needs an effect that grants advantage on a specific ability's saving throws. The v4 taxonomy includes the atom `modify_roll_advantage` (used in mastery effects via `ModifyRollAdvantageRider`), but this atom is not surfaced in `ClassFeatureEffect`.

**Proposed widening:** A new `ClassFeatureEffect` variant:

```typescript
export type ModifyRollAdvantageEffect = {
  readonly kind: "modify_roll_advantage";
  readonly mode: "advantage" | "disadvantage";
  readonly on: ReadonlyArray<RollKind>;          // e.g. ["saving_throw"]
  readonly abilityFilter?: Ability;               // e.g. "dex" (null = all abilities)
};
```

No new v4 atom is needed — `modify_roll_advantage` already exists. This is a surface encoding gap only.

---

## Gap 3 (surface): No condition-gated suppressor on passive effects

The SRD text explicitly gates the benefit: "**unless you have the Incapacitated condition**." This is not a corner case or implicit assumption — it is part of the rule text that must be representable.

There is no current surface type for "this passive effect is suppressed while the creature has condition X active." The v4 taxonomy includes the `suppress` procedure atom and the `condition_progression` resolution atom, but neither is wired into a surface grammar for class feature passives.

**Proposed widening:** A `suppressedWhen` field on the passive effect, expressing condition-based suppression:

```typescript
export type ConditionSuppressor = {
  readonly kind: "condition_active";
  readonly condition: Condition;   // e.g. "incapacitated"
};

// On ModifyRollAdvantageEffect or on the passive mechanics header:
readonly suppressedWhen?: ConditionSuppressor;
```

This would also require widening the `Condition` type (currently `"prone"` only) to include at least `"incapacitated"`.

---

## Proposed atom graph (if widened)

```
class_feature_root
  └─ roots ──> passive
                └─ grants ──> modify_roll_advantage
                              (mode: advantage, on: [saving_throw], abilityFilter: dex)
                              └─ suppressedWhen: condition_active(incapacitated)
```

The `modify_roll_advantage` effect attaches to `self` (the barbarian). There is no window, no resource, no reset — the effect persists as character state until the feature is lost or the creature is Incapacitated.

---

## Relation to existing units

- `halfling_luck` similarly grants advantage on rolls passively (re-roll, not full advantage — different shape but same passive pattern)
- `rogue_evasion_l7` is another saving-throw rider (half damage on successful DEX save) — also passive, also blocked by the same family gap

The `passive` family is expected to be high-pressure across multiple class features and species traits.
