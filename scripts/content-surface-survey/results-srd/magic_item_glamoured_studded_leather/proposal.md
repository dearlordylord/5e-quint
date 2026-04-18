# Proposal: Glamoured Studded Leather — Surface Widenings

## Unit

**Glamoured Studded Leather** (`magic_item_glamoured_studded_leather`)  
Armor (Studded Leather Armor), Rare — SRD 5.2.1

## What fits

The +1 AC passive encodes cleanly as a `composite` magic item's first part:

```dhall
{ family = "passive"
, condition = { kind = "wearing_item" }
, grants = [ { kind = "modify_ac", delta = { kind = "fixed_dice", dice = 1, dieSize = 1, sign = "+" } } ]
}
```

The effect atom for the glamour activation also exists: `alter_item_kind`. The comment in `types.ts` explicitly notes "glamoured armor uses the same atom for appearance-level item-kind swaps once its activation/lifecycle surface exists." So the atom is the right one; the gaps are entirely in the activation lifecycle.

## What doesn't fit: three surface gaps

### Gap 1 — Unlimited-use `UseCountCap`

`ActivationResource` requires either a `use_count` (with a `UseCountCap`) or a `charge_pool`. Every `UseCountCap` variant represents a finite depletable pool:

| Variant | Pool |
|---|---|
| `fixed` | hardcoded number |
| `threshold_tiers` | scales by level |
| `linear_per_level` | scales by level |
| `proficiency_bonus` | scales with PB |
| `ability_modifier` | scales with ability |

None express "unlimited — the only cost is the action economy." The glamour can be triggered arbitrarily many times; there is no charge pool. A new variant is needed:

```typescript
| { readonly kind: "unlimited" }
```

This would also apply to other always-available item activations (e.g., items that let you cast a cantrip-equivalent at will without a separate charge pool).

### Gap 2 — `DurationEndTrigger.target_doffs_item`

The glamour lasts "until you use this property again **or doff the armor**." `DurationEndTrigger` already includes `target_dons_armor` (added for Mage Armor). The inverse is needed:

```typescript
| { readonly kind: "target_doffs_item" }
```

This end trigger is logically natural: the item leaves the worn state, which collapses any persistent effect tied to its worn status.

### Gap 3 — Replace-on-reactivation end condition

"The illusory appearance lasts until **you use this property again**" means each new activation replaces the prior persistent effect rather than stacking. For spells this is expressed via `caster_recasts_spell` in `DurationEndTrigger`, but that trigger is spell-specific. Non-spell activated abilities that produce persistent effects have no replace-on-reuse lifecycle available.

Two possible fixes:
1. Extend `DurationEndTrigger` with `activation_reused` (mirrors `caster_recasts_spell` for item activations).
2. Add a `replaceOnReuse: true` flag to `ActivatedAbilityMechanics` / `ActivationPhase.direct`.

Option 1 is narrower and consistent with the existing trigger vocabulary.

## Proposed encoding (blocked until gaps resolved)

```dhall
{ kind = "magic_item"
, id = "magic_item_glamoured_studded_leather"
, name = "Glamoured Studded Leather"
, rarity = "rare"
, requiresAttunement = False
, provenance = { kind = "srd-5.2.1", section = "MagicItems#Glamoured Studded Leather" }
, description = "..."
, mechanics =
    { family = "composite"
    , parts =
        [ -- Part 1: always-on +1 AC
          { family = "passive"
          , condition = { kind = "wearing_item" }
          , grants = [ { kind = "modify_ac", delta = { kind = "fixed_dice", dice = 1, dieSize = 1, sign = "+" } } ]
          }
        , -- Part 2: bonus-action glamour (BLOCKED — needs gaps 1–3)
          { family = "activation"
          , activationCost = { kind = "bonus_action" }
          , resource = { kind = "use_count", cap = { kind = "unlimited" } }  -- Gap 1
          , resetCadence = { kind = "never" }
          , duration =
              { kind = "permanent"
              , endsOn = [ "activation_reused", "target_doffs_item" ]  -- Gaps 2 & 3
              }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "object", count = 1 }
                , effects = [ { kind = "alter_item_kind", newKind = "player_chosen_appearance" } ]
                }
              ]
          }
        ]
    }
, destruction = { kind = "none" }
}
```

## Classification

`surface_widening` — all needed atoms exist (`modify_ac`, `alter_item_kind`); the blockers are three missing variants in the activation lifecycle surface.
