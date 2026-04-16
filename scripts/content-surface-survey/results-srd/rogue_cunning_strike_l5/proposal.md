# Proposal: Cunning Strike (rogue L5) — `structural_widening`

## Unit

- **Name:** Cunning Strike (rogue L5)
- **Slug:** `rogue_cunning_strike_l5`
- **Kind:** `class_feature` / `rogue` / L5
- **Provenance:** SRD 5.2.1 — `Classes/Rogue#Level 5: Cunning Strike`

## Why no `.dhall` / `.json` were authored

Cunning Strike cannot be honestly encoded under any existing `ClassFeatureMechanics` family. The sole current family is `activation`, which requires:

| Field | Required shape | Cunning Strike |
|---|---|---|
| `activationCost` | `free` or `bonus_action` | Triggered by Sneak Attack hit — neither |
| `resource` | `UseCountResource` (use_count + cap) | No use count; fires per Sneak Attack, unlimited |
| `resetCadence` | Some `RestResetCadence` | No rest reset |
| `effect` | `GrantExtraActionEffect \| HealHpEffect` | None of the three effects map to these |

Forcing any of these fields with a placeholder value would produce a misleading trace (e.g., encoding as `{ kind: "free" }` for cost, `{ kind: "fixed", uses: 99 }` for resource — both lies about the actual mechanic).

## Structural gap: missing class-feature trigger family

The feature's trigger is **"when you deal Sneak Attack damage"** — an on-hit event, not a standalone activation. The mastery surface already has `on_hit_trigger` for weapon-hit riders, but that family belongs to `MasteryRecord` and cannot be used for `ClassFeatureRecord`.

A parallel family for class features is needed:

```typescript
// Proposed new family
export type ClassFeatureOnHitTriggerMechanics = {
  readonly family: "on_hit_trigger";
  readonly trigger: ClassFeatureHitTrigger;  // e.g. "sneak_attack_hit"
  readonly cost: ClassFeatureHitCost;        // e.g. dice_cost
  readonly effects: ReadonlyArray<ClassFeatureHitEffect>;  // menu
};
```

## Secondary gaps (each independently blocking, even if the family existed)

### 1. Dice-cost resource — new variant

> "Each effect has a die cost, which is the number of Sneak Attack damage dice you must forgo to add the effect."

No surface type represents "forgo N damage dice to activate". Not `use_count`, not `action_quota`. This needs a new cost variant, tentatively:

```typescript
{ readonly kind: "sneak_attack_dice"; readonly diceCount: number }
```

### 2. Menu-of-effects — new subgraph

> "you can add **one of the following** Cunning Strike effects"

The rogue picks one effect per Sneak Attack. Neither `ClassFeatureActivationMechanics.effect` (singular) nor any existing mechanic models a player-choice-at-activation-time selection from a closed list of N effects.

### 3. `Condition: "poisoned"` — surface widening

```typescript
// current
export type Condition = "prone";

// needed
export type Condition = "prone" | "poisoned";
```

Evidence: "the target has the Poisoned condition for 1 minute"

### 4. Repeat-save lifecycle — surface widening

> "At the end of each of its turns, the Poisoned target repeats the save, ending the effect on itself on a success."

The current `save_gate` resolution atom models a single save. The Poison rider needs a **persist + repeat_save** lifecycle — the condition persists until the target succeeds on a repeated end-of-turn save. No current atom covers this (closest residue candidate in v4 taxonomy: `repeat_save`, not yet promoted).

### 5. Size constraint on save gate — surface widening

> "If the target is **Large or smaller**..."

The Trip effect is gated by target size. No current surface type allows a size predicate on a `save_gate` or effect attachment.

### 6. Movement + deny-OA for `ClassFeatureEffect` — atom widening

> "you move up to half your Speed without provoking Opportunity Attacks"

The v4 taxonomy has `move` and `deny_opportunity_attack` effect atoms, but neither appears in the `ClassFeatureEffect` union. They need to be added to cover the Withdraw option.

## Proposed widening priority

| Priority | Gap | Kind |
|---|---|---|
| P0 | New `on_hit_trigger` family for class features | `structural_widening` |
| P1 | Dice-cost resource variant | `surface_widening` |
| P1 | Menu-of-effects pattern | `surface_widening` |
| P2 | `Condition: "poisoned"` | `surface_widening` |
| P2 | Repeat-save lifecycle | `surface_widening` |
| P3 | Size constraint on save gate | `surface_widening` |
| P3 | `move` + `deny_opportunity_attack` in `ClassFeatureEffect` | `atom_widening` |

## Notes

- All three Cunning Strike options (Poison, Trip, Withdraw) were assessed independently. Each requires at least one secondary widening beyond the structural gap.
- The primary structural gap (on-hit trigger for class features) is also required for other features such as Monk's Stunning Strike (`on_hit_trigger` + Focus cost) — this widening has multi-unit value.
- The Withdraw option's movement mechanic is the mildest secondary gap (atoms exist in v4, just not in `ClassFeatureEffect`).
- The Poison option's repeat-save is the most novel secondary gap; `repeat_save` is a residue atom in the v4 taxonomy, not yet promoted.
