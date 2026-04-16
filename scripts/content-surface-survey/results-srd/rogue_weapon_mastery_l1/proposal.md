# Proposal: Weapon Mastery (rogue L1) — structural_widening

## Unit

- **Slug:** `rogue_weapon_mastery_l1`
- **Kind:** `class_feature`
- **Class / Level:** Rogue L1
- **Provenance:** SRD 5.2.1 — Classes/Rogue#Level 1: Weapon Mastery

## Source text

> Your training with weapons allows you to use the mastery properties of two kinds of weapons of your choice with which you have proficiency, such as Daggers and Shortbows.
>
> Whenever you finish a Long Rest, you can change the kinds of weapons you chose. For example, you could switch to using the mastery properties of Scimitars and Shortswords.

## Why the current surface cannot encode this honestly

### 1. The only `ClassFeatureMechanics` family is `"activation"` — Weapon Mastery is passive

`ClassFeatureMechanics = ClassFeatureActivationMechanics`.

`ClassFeatureActivationMechanics` models features that fire at runtime when the player triggers them (Action Surge, Second Wind). Weapon Mastery has no trigger. It is configured once (at level-up, or changed on a Long Rest) and then passively enables mastery use whenever the chosen weapons are wielded. An `"activation"` trace would be a lie.

### 2. `ClassFeatureMechanicsHeader` requires `resource: UseCountResource` — Weapon Mastery has no use count

```typescript
type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource: UseCountResource;       // ← mandatory
  readonly resetCadence: RestResetCadence;
};
```

There is no "N uses per rest" here. The feature is permanently active for whichever weapon kinds are currently configured. Any `use_count` value would be fabricated.

### 3. `ClassFeatureEffect` has no mastery-access variant

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

The effect of Weapon Mastery is "grant the ability to invoke mastery properties for the chosen weapon kinds." Neither `GrantExtraActionEffect` nor `HealHpEffect` represents this. The closest v4 atom is `grant_proficiency`, but that atom is not in `ClassFeatureEffect`.

### 4. The Long Rest interaction is reconfiguration, not use-count replenishment

`RestResetCadence` describes how a use-count pool refills (`refill all`, `refill N`). Weapon Mastery's Long Rest interaction changes *which two weapon kinds* are covered — a structural reconfiguration, not a count refill. This is a new semantic not present in the current `RestResetCadence` union.

## Proposed widenings

### W1 — New `ClassFeatureMechanics` family: `"passive"` (or `"grant_access"`)

A passive class feature family with no activation cost, no mandatory use count, and no rest-cadence refill. Header shape:

```typescript
type PassiveClassFeatureMechanicsHeader = {
  readonly configurationType: "at_level_up" | "long_rest_reconfigurable";
};

export type ClassFeaturePassiveMechanics = PassiveClassFeatureMechanicsHeader & {
  readonly family: "passive";
  readonly effect: ClassFeatureEffect;   // widened below
};
```

### W2 — New `ClassFeatureEffect` variant: `GrantMasteryAccessEffect`

```typescript
export type GrantMasteryAccessEffect = {
  readonly kind: "grant_mastery_access";
  readonly slotCount: number;          // 2 for rogue/barbarian, 3 for fighter
  readonly restriction: "proficient_weapons_only";
};
```

Maps to the v4 atom `grant_proficiency` (granting use of a game-mechanical property rather than a skill/save proficiency) or possibly a new `grant_mastery_access` atom if the distinction is meaningful.

### W3 — Optional `resource` or `"no_resource"` variant in `ClassFeatureMechanicsHeader`

If the `activation` family is retained and extended, `resource` should become optional or gain a `{ kind: "none" }` variant to accommodate passive features that happen to have side interactions like reconfiguration.

### W4 — New `RestResetCadence` variant: `"long_rest_reconfiguration"` (or similar)

```typescript
| { readonly kind: "long_rest_reconfiguration" }
```

Semantically distinct from `long_rest` (which refills a use count): this variant marks that the feature's configuration (choice of weapon kinds, etc.) can be changed on a Long Rest, but no resource is consumed.

## Cross-class note

The same structural gap applies to every class that receives Weapon Mastery at L1:

| Slug | Class | Slots |
|---|---|---|
| `barbarian_weapon_mastery_l1` | Barbarian | 2 |
| `fighter_weapon_mastery_l1` | Fighter | 3 |
| `paladin_weapon_mastery_l1` | Paladin | 2 |
| `ranger_weapon_mastery_l1` | Ranger | 2 |
| `rogue_weapon_mastery_l1` | Rogue | 2 |

The `slotCount` field in W2 would differentiate Fighter (3) from the rest (2) without requiring separate types.

## v4 atom coverage

The proposed passive-grant subgraph would use:
- `class_feature_root` → `passive` (new) → `grant_mastery_access` (new or maps to `grant_proficiency`)
- Optional `choose` atom (v4 §2 Procedure) for the per-rest weapon-kind selection, also currently unrepresented on the surface

No new v4 atoms are strictly required if `grant_proficiency` is accepted as the carrier — this is primarily a **surface-layer** structural gap (new family + new effect variant), not a new taxonomy atom.
