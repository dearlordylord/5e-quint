# Proposal: Widening for Relentless Rage (Barbarian L11)

## Outcome: `structural_widening`

The unit cannot be honestly encoded. The core blocker is that no `ClassFeatureMechanics` family exists for features that fire passively in response to a game-state event. All four gaps below must be addressed together; they are interdependent.

---

## Gap 1 — Missing class-feature family: `passive_trigger`

**Blocker severity: structural.**

The only available family is `activation`, which models a player choosing to spend an action resource on their turn. Relentless Rage has no such cost — it fires automatically when the barbarian drops to 0 HP while raging. This can happen during any creature's turn (e.g., on an enemy's attack). There is no `activationCost` value that honestly represents "fires in response to an external game-state event."

**Proposed shape (sketch):**

```typescript
export type ClassFeaturePassiveTriggerMechanics = ClassFeatureHeader & {
  readonly family: "passive_trigger";
  readonly trigger: PassiveTriggerCondition;
  readonly playerChoice: "optional_save" | "mandatory" | "optional_activation";
  readonly resource: EscalatingSaveDcResource | UseCountResource | null;
  readonly resetCadence: RestResetCadence;
  readonly effect: ClassFeatureEffect;
};
```

The `trigger` field describes the compound condition under which the passive fires.

---

## Gap 2 — Missing trigger condition type: compound HP + active-effect condition

The trigger is `(HP drops to 0) AND (Rage is active)`. No existing surface type models compound state-based trigger conditions. A new type is needed:

```typescript
export type PassiveTriggerCondition =
  | { readonly kind: "hp_drops_to_zero"; readonly requiresActiveEffect?: string }
  | { readonly kind: "takes_damage" }
  // ...extend as pressure cases arrive
```

The `requiresActiveEffect` field gates the trigger on another class feature being active (in this case, Rage). This is a closed enum of feature IDs or effect categories.

---

## Gap 3 — Missing resource type: `escalating_save_dc`

The DC is not a fixed number of uses — it is a mutable integer that:
- Starts at a base value (10)
- Increments by a fixed amount per use (+5 per use)
- Resets to the base on Short or Long Rest

This is mechanically distinct from `UseCountResource`. A new resource shape is needed:

```typescript
export type EscalatingSaveDcResource = {
  readonly kind: "escalating_save_dc";
  readonly baseDc: number;
  readonly incrementPerUse: number;
  readonly ability: Ability;  // CON for this feature
};
```

The reset cadence would be carried by the enclosing mechanics header (Short or Long Rest → DC resets to `baseDc`).

---

## Gap 4 — Missing effect atom: `set_hp`

On a successful save, HP is **set to** `2 × Barbarian level`. This is not a heal (which *adds* to current HP) — it is an HP-set-to-derived-value operation. The existing `heal_hp` effect is the wrong shape.

A new effect is needed:

```typescript
export type SetHpEffect = {
  readonly kind: "set_hp";
  readonly value: SetHpValue;
  readonly target: "self" | "target_creature";
};

export type SetHpValue =
  | { readonly kind: "fixed"; readonly amount: number }
  | { readonly kind: "class_level_multiplier"; readonly multiplier: number; readonly className: ClassName };
```

For Relentless Rage: `{ kind: "class_level_multiplier", multiplier: 2, className: "barbarian" }`.

The v4 taxonomy does not include a `set_hp` atom (only `heal`, `modify_max_hp`). This is a new effect atom.

---

## Summary table

| Gap | Classification | Proposed name | Urgency |
|---|---|---|---|
| No passive-trigger family | `structural_widening` | `passive_trigger` (family) | Blocker |
| No compound trigger condition | `surface_widening` | `PassiveTriggerCondition` (type) | Blocker |
| No escalating DC resource | `surface_widening` | `EscalatingSaveDcResource` (type) | Blocker |
| No set_hp effect | `atom_widening` | `set_hp` (atom + effect type) | Blocker |

All four must be resolved together. There are no optional omissions — each is load-bearing for an honest encoding of this feature.

---

## Comparison: similar patterns in the SRD

The Orc species trait **Relentless Endurance** has a structurally similar shape (0 HP trigger → once per Long Rest, HP set to 1). If that unit is eventually encoded, it will need the same `passive_trigger` family and `set_hp` atom. The `passive_trigger` family should be designed with both cases in mind.

The Fighter's **Indomitable** (reroll a failed saving throw, once per Long Rest) is player-initiated with a resource cap — it fits `activation`. Relentless Rage explicitly does not.
