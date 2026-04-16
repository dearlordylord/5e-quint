# Proposal: Open Hand Technique (monk L3)

## Outcome: `structural_widening`

Open Hand Technique cannot be honestly encoded under any existing `ClassFeatureMechanics` family. Four distinct gaps must be resolved.

---

## Unit summary

> Whenever you hit a creature with an attack granted by your **Flurry of Blows**, you can impose **one of the following effects** on that target.
>
> - **Addle.** The target can't make Opportunity Attacks until the start of its next turn.
> - **Push.** The target must succeed on a Strength saving throw or be pushed up to 15 feet away from you.
> - **Topple.** The target must succeed on a Dexterity saving throw or have the Prone condition.

---

## Gap 1 — Missing class-feature on-hit-trigger family (structural)

`ClassFeatureMechanics` is defined as:

```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
```

`ClassFeatureActivationMechanics` requires `activationCost` (free | bonus_action) and a `use_count` resource with a rest reset cadence. Open Hand Technique has none of these:

- No explicit activation — the feature rides on Flurry of Blows hits.
- No use-count pool — it fires on every qualifying hit.
- No rest reset — nothing to reset.

The mastery `on_hit_trigger` family covers exactly this shape for `MasteryRecord`, but `MasteryMechanics` is not available on `ClassFeatureRecord`. A new family is needed:

```typescript
export type ClassFeatureOnHitTriggerMechanics = {
  readonly family: "on_hit_trigger";
  readonly trigger: ClassFeatureTrigger;       // see Gap 2
  readonly optional: boolean;
  readonly effect: ClassFeatureOnHitEffect;    // see Gaps 3 & 4
};
```

This family follows the same Subgraph G pattern as mastery on-hit riders (attack_roll resolution → on_hit_window → rider effect → target).

---

## Gap 2 — Missing trigger variant: action-source-constrained hit

`MasteryTrigger` (the closest existing type) has:

```typescript
export type MasteryTrigger =
  | { readonly kind: "weapon_hit" }
  | { readonly kind: "weapon_hit_melee_only" };
```

Both variants filter by weapon kind. Open Hand Technique constrains by **action source** — only hits from attacks granted by Flurry of Blows qualify. A new variant is needed:

```typescript
| { readonly kind: "action_source_hit"; readonly actionSourceId: string }
// e.g. actionSourceId: "flurry_of_blows"
```

Alternatively, a separate `ClassFeatureTrigger` union could be introduced for class features, rather than extending `MasteryTrigger`.

---

## Gap 3 — Missing player-choice-menu composition

The feature presents three candidate effects and the player chooses one per trigger invocation. No surface type models this. The v4 taxonomy lists `choose` as a procedure atom, but there is no `ChooseEffect` wrapper:

```typescript
// proposed
export type ChooseOneEffect<T> = {
  readonly kind: "choose_one";
  readonly options: ReadonlyArray<T>;
};
```

This would sit between the on-hit window and the individual effect atoms in the graph:
`on_hit_window → choose → [Addle branch | Push branch | Topple branch]`

---

## Gap 4 — Missing effect atoms in save-gate results

### 4a. Addle — `deny_opportunity_attack`, unsave-gated

Addle is an **automatic** on-hit effect (no save). The effect atom `deny_opportunity_attack` is in v4's effect inventory but is absent from `SaveGateRiderResult` and `ClassFeatureEffect`. Moreover, since Addle has no save gate, `SaveGateRider` is the wrong wrapper entirely. The on-hit-trigger effect type needs a direct `deny_opportunity_attack` variant alongside save-gated options.

Evidence: *"The target can't make Opportunity Attacks until the start of its next turn."*

### 4b. Push — `force_move`, save-gated

Push applies `force_move` (15 ft) on a failed STR save. `force_move` is in v4 but absent from `SaveGateRiderResult`:

```typescript
export type SaveGateRiderResult =
  | { readonly kind: "apply_condition"; readonly condition: Condition }
  | { readonly kind: "none" };
  // needed: | { readonly kind: "force_move"; readonly maxFeet: number }
```

Evidence: *"The target must succeed on a Strength saving throw or be pushed up to 15 feet away from you."*

### 4c. Topple — already representable

Topple (DEX save → Prone) is the one sub-effect that maps cleanly to existing atoms: a `SaveGateRider` with `apply_condition: prone` on fail, exactly like the Topple mastery. This sub-effect is **not** a blocking gap; it confirms the save-gate pattern is right and just needs the surrounding structure to exist.

---

## Summary of proposed widenings

| # | Kind | Name | Blocking? |
|---|------|------|-----------|
| 1 | `new_subgraph` | `ClassFeatureOnHitTriggerMechanics` (family `on_hit_trigger` for class features) | yes |
| 2 | `new_variant` | `ClassFeatureTrigger :: action_source_hit` | yes |
| 3 | `new_variant` | `ChooseOneEffect<T>` (player picks one of N effects) | yes |
| 4a | `new_variant` | on-hit effect: `deny_opportunity_attack` (no save required) | yes |
| 4b | `new_variant` | `SaveGateRiderResult :: force_move` | yes |

All five gaps are blocking. No partial encoding is possible without misrepresenting the rule.

---

## Encoding sketch (after widening)

```dhall
{ kind = "class_feature"
, id = "monk_open_hand_technique_l3"
, name = "Open Hand Technique"
, className = "monk"
, acquiredAtLevel = 3
, provenance = { kind = "srd-5.2.1", section = "Classes/Monk#Level 3: Open Hand Technique" }
, description = "..."
, mechanics =
    { family = "on_hit_trigger"
    , trigger = { kind = "action_source_hit", actionSourceId = "flurry_of_blows" }
    , optional = True
    , effect =
        { kind = "choose_one"
        , options =
            [ -- Addle
              { kind = "deny_opportunity_attack"
              , expiresOn = { kind = "turn_start_window" }
              }
            , -- Push
              { kind = "save_gate"
              , ability = "str"
              , dc = { kind = "caster_spell_save_dc" }
              , onFail = { kind = "force_move", maxFeet = 15 }
              , onSuccess = { kind = "none" }
              }
            , -- Topple
              { kind = "save_gate"
              , ability = "dex"
              , dc = { kind = "caster_spell_save_dc" }
              , onFail = { kind = "apply_condition", condition = "prone" }
              , onSuccess = { kind = "none" }
              }
            ]
        }
    }
}
```

(Dhall shape is illustrative; actual surface types must be widened first.)
