# Proposal: Widenings required for Monk Martial Arts

**Unit:** Martial Arts (monk L1)
**Outcome:** `structural_widening`
**Confidence:** high

---

## Why it does not fit

Martial Arts is a permanently-active conditional feature. While the monk is unarmed or wielding only Monk weapons and is not wearing armor or wielding a Shield, three distinct benefits apply automatically — no activation, no resource expenditure, no rest reset.

The current `ClassFeatureMechanics` union has only one member: `ClassFeatureActivationMechanics`, which structurally requires:

```ts
{ family: "activation"; activationCost; resource: UseCountResource; resetCadence; effect }
```

None of these fields apply to Martial Arts. There is no use count, no reset cadence, and the three sub-mechanics are permanently granted under a condition — not activated on demand.

---

## Required widenings

### 1. Passive/permanent class feature family (structural)

A `passive` (or `permanent_grant`) family is needed for class features that:
- are always active under a condition, OR
- are always active unconditionally (passive static grants)

Martial Arts satisfies the conditional form: benefits apply only while unarmed/monk-weapon and no armor/shield.

**Suggested shape (sketch):**

```ts
export type ClassFeaturePassiveMechanics = ClassFeatureMechanicsHeader_Passive & {
  readonly family: "passive";
  readonly condition?: PassiveCondition;   // new type: "unarmed_or_monk_weapon_unarmored" etc.
  readonly grants: ReadonlyArray<PassiveGrant>;
};
```

The `PassiveCondition` type would encode the equipment-state guard. The `PassiveGrant` union would carry each sub-mechanic.

---

### 2. Damage substitution surface (surface widening)

The Martial Arts Die says "roll 1d6 **in place of** the normal damage." This is a damage *override*, not a bonus. No existing `ClassFeatureEffect` or `OngoingOperation` covers substitution.

The die scales by Monk class level: d6 → d8 (L5) → d10 (L11) → d12 (L17). This maps cleanly to the v4 `scale_die_size` atom (already in the taxonomy) once a substitution surface exists.

**Suggested shape (sketch):**

```ts
export type SubstituteDamageDieEffect = {
  readonly kind: "substitute_damage_die";
  readonly targetWeaponKind: "unarmed_or_monk_weapon";
  readonly amount: DiceAmount;   // threshold_tiers, axis=class, base={dice:1,dieSize:6}, tiers: [L5→d8, L11→d10, L17→d12]
};
```

---

### 3. Ability-score substitution surface (surface widening)

Dexterous Attacks allows using DEX instead of STR for attack rolls, damage rolls, and Grapple/Shove save DCs on Unarmed Strikes and Monk weapons.

The v4 taxonomy names `modify_roll_substitute` as an existing atom. However, `types.ts` has no surface shape that maps to it. `modify_roll_numeric` handles numeric deltas; `modify_roll_advantage` handles advantage state. Neither captures "which ability modifier feeds this roll."

**Suggested shape (sketch):**

```ts
export type SubstituteAbilityEffect = {
  readonly kind: "substitute_ability";
  readonly replace: Ability;          // "str"
  readonly withAbility: Ability;      // "dex"
  readonly on: ReadonlyArray<"attack_roll" | "damage_roll" | "save_dc">;
  readonly weaponKind: "unarmed_or_monk_weapon";
};
```

---

### 4. Unlimited / per-turn use cap (surface widening)

The Bonus Unarmed Strike can be used every turn, unlimited times per day. `UseCountCap` currently only supports `fixed` (a specific number) and `ThresholdTiers<number>`. `RestResetCadence` has no `per_turn` or `unlimited` variant.

If the bonus-action unarmed strike is eventually modeled via an `activation`-adjacent family, the cap and cadence types need one of:

- A `{ kind: "unlimited" }` variant of `UseCountCap`, OR
- A `per_turn` entry in `RestResetCadence` that resets the quota at each turn start

Note: if a `passive` family is introduced (widening #1) with a dedicated `grant_bonus_action_attack` passive grant, this widening may become unnecessary — the grant is simply always available rather than tracked as a depleting resource.

---

## Atom inventory check

All three sub-mechanic atoms are already named in the v4 taxonomy:

| Sub-mechanic | v4 atom | Gap |
|---|---|---|
| Bonus Unarmed Strike | `grant_extra_action` (approximate) | Not quite — it's a per-turn unarmed-only bonus action, not a full extra action |
| Martial Arts Die | `scale_die_size` (scaling), but no substitution atom | Surface shape missing |
| Dexterous Attacks | `modify_roll_substitute` | Surface shape missing in `types.ts` |

The `modify_roll_substitute` atom is already listed in the v4 taxonomy (§9 Effect Atoms). It simply has no surface encoding yet.

---

## Recommended classification rationale

The primary gap is **structural** (no passive family), not merely surface-level. Even if widenings 2–4 were added today, Martial Arts still could not be encoded without widening #1. Hence `structural_widening` is the correct top-level outcome, with the secondary surface gaps documented above.
