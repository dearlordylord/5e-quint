# Proposal: Brutal Strike (Barbarian L9) — structural_widening

## Unit

- **Slug**: `barbarian_brutal_strike_l9`
- **Kind**: `class_feature` / Barbarian L9
- **SRD section**: `Classes/Barbarian#Level 9: Brutal Strike`

## Why the unit does not fit

### Primary blocker: no `on_hit_trigger` family for `class_feature`

`ClassFeatureMechanics` is a union of exactly one member:

```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
```

`ClassFeatureActivationMechanics` requires:

| Field | Required shape | Brutal Strike reality |
|---|---|---|
| `activationCost` | `free` or `bonus_action` | Neither — the feature modifies a weapon attack in progress, not a separate activation |
| `resource` | `UseCountResource` with a cap | No cap — fires on every eligible Reckless Attack hit |
| `effect` | `GrantExtraActionEffect \| HealHpEffect` | None of these — needs damage, force_move, modify_speed |

Encoding the feature as an `activation` would be a lie on all three axes.

### Secondary blockers

**2. ClassFeatureEffect union is too narrow**

The union contains only `grant_extra_action` and `heal_hp`. Brutal Strike needs:
- `damage` — +1d10 weapon-type extra damage on hit
- `force_move` — push target 15 ft (Forceful Blow)
- `modify_speed` — reduce target speed −15 ft (Hamstring Blow)

All three atoms exist in the v4 taxonomy. They are simply not wired into `ClassFeatureEffect`.

**3. "Choose one of N effects" has no surface shape**

At resolution time the barbarian picks exactly one of two effect options. This is not a multi-phase sequence (ordered `phases[]`) nor a parallel grant. The surface has no `choose_one_of` mechanism anywhere.

**4. Prerequisite link to another feature**

The feature is conditional on Reckless Attack being used this turn. No surface shape models cross-feature prerequisites at resolution time.

**5. Attacker-movement rider**

Forceful Blow additionally allows the attacker to move up to half Speed toward the (now-pushed) target without provoking Opportunity Attacks. The v4 atoms `move` and `deny_opportunity_attack` exist but there is no surface shape for "caster self-move post-hit without OA."

**6. No resource / unlimited use**

`ClassFeatureMechanicsHeader` unconditionally requires `resource: UseCountResource`. Brutal Strike has no per-rest cap. The surface would need an `unlimited` variant or an optional resource field.

## Proposed widenings

### W1 — New family: `on_hit_trigger` for `ClassFeatureMechanics`

Add an `on_hit_trigger` family parallel to the existing mastery `OnHitTriggerMechanics`:

```typescript
export type ClassFeatureOnHitTriggerMechanics = {
  readonly family: "on_hit_trigger";
  readonly trigger: MasteryTrigger;           // reuse existing
  readonly prerequisite?: FeaturePrerequisite; // new — see W6
  readonly optional: boolean;
  readonly effects: ReadonlyArray<ClassFeatureEffect>; // widened union
  readonly chooseCount?: number;              // how many effects to pick (W3)
};

export type ClassFeatureMechanics =
  | ClassFeatureActivationMechanics
  | ClassFeatureOnHitTriggerMechanics;        // new
```

### W2 — Widen `ClassFeatureEffect`

```typescript
export type ClassFeatureDamageEffect = {
  readonly kind: "damage";
  readonly damageType: "weapon_type";  // new variant: inherit from weapon
  readonly amount: DiceAmount;
};

export type ClassFeatureForceMove = {
  readonly kind: "force_move";
  readonly distanceFeet: number;
  readonly direction: "away_from_attacker" | "toward_attacker";
};

export type ClassFeatureModifySpeed = {
  readonly kind: "modify_speed";
  readonly delta: number;              // negative = reduction
  readonly expiresOn: RiderExpiry;     // reuse existing
  readonly stackRule?: "most_recent_wins";
};

export type ClassFeatureAttackerMove = {
  readonly kind: "attacker_move";
  readonly maxFeet: "half_speed";
  readonly direction: "toward_target";
  readonly denyOpportunityAttacks: true;
};

export type ClassFeatureEffect =
  | GrantExtraActionEffect
  | HealHpEffect
  | ClassFeatureDamageEffect    // new
  | ClassFeatureForceMove       // new
  | ClassFeatureModifySpeed     // new
  | ClassFeatureAttackerMove;   // new
```

### W3 — `choose_one_of` composition

When `chooseCount: 1` and `effects` is an array, the player picks one effect at resolution time. The tracer would emit a `choose` procedure node (already in v4 procedure atoms).

### W4 — `damage_type: "weapon_type"` variant

The extra damage inherits the weapon's damage type ("same type dealt by the weapon or Unarmed Strike"). This is not any fixed `DamageType` literal. A new `"weapon_type"` pseudo-variant is needed in the damage effect shape for class features, or a new `WeaponTypedDamage` surface type.

### W5 — `unlimited` resource or optional resource

```typescript
export type UseCountResource =
  | { readonly kind: "use_count"; readonly cap: UseCountCap }
  | { readonly kind: "unlimited" };           // new
```

Or simply make `resource` optional in `ClassFeatureOnHitTriggerMechanics` (not required for on-hit triggers).

### W6 — `FeaturePrerequisite` link

```typescript
export type FeaturePrerequisite = {
  readonly kind: "requires_feature_used_this_turn";
  readonly featureId: string;
};
```

Allows Brutal Strike to declare it requires Reckless Attack to have been used on the same turn.

## v4 atom coverage

All atoms needed exist in TAXONOMY_atoms_graph.md v4:

| Atom | Category | Status |
|---|---|---|
| `attack_roll` | resolution | exists |
| `on_hit_window` | window | exists |
| `damage` | effect | exists |
| `force_move` | effect | exists |
| `modify_speed` | effect | exists |
| `move` | effect | exists |
| `deny_opportunity_attack` | effect | exists |
| `choose` | procedure | exists |

No new v4 atoms are required. All gaps are at the surface type layer.

## Recommended encoding shape (if widened)

```dhall
{ kind = "class_feature"
, id = "barbarian_brutal_strike_l9"
, name = "Brutal Strike"
, className = "barbarian"
, acquiredAtLevel = 9
, provenance = { kind = "srd-5.2.1", section = "Classes/Barbarian#Level 9: Brutal Strike" }
, description = "..."
, mechanics =
    { family = "on_hit_trigger"
    , trigger = { kind = "weapon_hit" }
    , prerequisite = Some { kind = "requires_feature_used_this_turn", featureId = "barbarian_reckless_attack_l2" }
    , optional = True
    , chooseCount = 1
    , effects =
        [ { kind = "damage", damageType = "weapon_type", amount = { kind = "fixed", expr = { dice = 1, dieSize = 10 } } }
        , { kind = "force_move", distanceFeet = 15, direction = "away_from_attacker" }  -- Forceful Blow (with attacker_move rider)
        , { kind = "modify_speed", delta = -15, expiresOn = { kind = "target_uses_or_turn_start" }, stackRule = "most_recent_wins" }  -- Hamstring Blow
        ]
    }
}
```

Note: The damage rider fires unconditionally on hit; the choice is between Forceful Blow and Hamstring Blow. A two-level effect structure (unconditional damage + choose-one secondary) would also need to be expressible.
