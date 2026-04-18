# Proposal: Adrenaline Rush (Orc) — `atom_widening`

## Unit

- **Slug**: `species_orc_adrenaline_rush`
- **Kind**: `species_trait`
- **Species**: Orc
- **Provenance**: srd-5.2.1

## RAW Text

> **Adrenaline Rush.** You can take the Dash action as a Bonus Action. When you do so, you gain a number of Temporary Hit Points equal to your Proficiency Bonus.
> You can use this trait a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Short or Long Rest.

## What Fits

The unit maps cleanly to `ActivatedAbilityMechanics` (family `activation`) with:

- `activationCost`: `{ kind: "bonus_action" }` ✓
- `resource`: `{ kind: "use_count", cap: { kind: "proficiency_bonus" } }` ✓ (UseCountCap already has this variant)
- `resetCadence`: `{ kind: "short_or_long_rest" }` ✓
- `grant_temp_hp` atom is present ✓

## Gap 1 — Missing EffectAtom for "take a standard action" (atom_widening)

The primary mechanic is that spending the Bonus Action lets you **take the Dash action**. The surface has no EffectAtom for this.

`grant_extra_action` is semantically wrong: it grants an *additional* full action on top of the normal action economy (Action Surge pattern). Here the Bonus Action is not granting an extra action — it is being spent *as* the Dash action.

### Proposed widening

Add a new EffectAtom variant:

```typescript
| {
    readonly kind: "perform_action";
    readonly action: StandardActionKind;
  }
```

Traces as a `procedure`-category node (the action is taken, not granted as future access). Emits a `direct_apply` with `performs: dash` edge to the self-attachment.

Alternatively, an `ActionRestriction.include_only` variant on `grant_extra_action` could approximate the shape but remains semantically wrong (extra vs. substituted), so a new atom is preferred.

**Evidence**: "You can take the Dash action as a Bonus Action."

## Gap 2 — Missing DiceAmount variant for Proficiency Bonus (surface_widening)

`grant_temp_hp.amount` must be a `DiceAmount`. The amount here is "equal to your Proficiency Bonus." `DiceAmount` currently supports:

- `fixed` — literal `DiceExpr`; `DiceExpr` has `spellcastingMod` and `abilityModifier` but not PB
- `threshold_tiers`, `linear_per_level` — scaling shapes that can approximate PB scaling but cannot express direct PB equivalence cleanly
- `resource_spent`, `resource_spent_linear`, `linked` — irrelevant

`UseCountCap` already has `{ kind: "proficiency_bonus" }` for resource caps. `DiceAmount` needs the same.

### Proposed widening

Add a new `DiceAmount` variant:

```typescript
| { readonly kind: "proficiency_bonus" }
```

This mirrors the existing `UseCountCap.proficiency_bonus` and parallels the `DiceDelta.proficiency_bonus` already used for d20-roll modifiers.

**Evidence**: "you gain a number of Temporary Hit Points equal to your Proficiency Bonus"

## Why No Content Files

The Dash action is the *primary* mechanic of the trait, not a secondary rider. Encoding only the temp HP component would produce a trace that silently omits the feature's main purpose. Per guardrails, a misleading trace is worse than no trace.

## Encoding Once Gaps Are Closed

After both widenings land, the dhall shape would be approximately:

```dhall
{ kind = "species_trait"
, id = "orc_adrenaline_rush"
, name = "Adrenaline Rush"
, species = "orc"
, provenance = { kind = "srd-5.2.1", section = "Species/Orc#Adrenaline Rush" }
, description = "..."
, mechanics =
    { family = "activation"
    , activationCost = { kind = "bonus_action" }
    , resource = { kind = "use_count", cap = { kind = "proficiency_bonus" } }
    , resetCadence = { kind = "short_or_long_rest" }
    , phases =
        [ { kind = "direct"
          , attachment = { kind = "self" }
          , effects =
              [ { kind = "perform_action", action = "dash" }
              , { kind = "grant_temp_hp"
                , amount = { kind = "proficiency_bonus" }
                }
              ]
          }
        ]
    }
}
```
