# Proposal: Ring of Evasion — atom_widening

## Unit

**Ring of Evasion** — `magic_item`, rare, requires attunement.

> This ring has 3 charges, and it regains 1d3 expended charges daily at dawn. When you fail a Dexterity saving throw while wearing the ring, you can take a Reaction to expend 1 charge to succeed on that save instead.

## What fits today

- `MagicItemRecord` kind with `requiresAttunement: true` — fits.
- `rarity: "rare"` — fits.
- `destruction: { kind: "none" }` — fits (no destruction mechanic).
- `ActivatedAbilityMechanics` family — fits the charge-based activation shape.
- `activationCost: { kind: "reaction" }` — fits.
- `resource: { kind: "charge_pool", cap: { kind: "fixed", uses: 3 } }` — fits.
- `resetCadence: { kind: "dawn", regain: { kind: "fixed", expr: { dice: 1, dieSize: 3 } } }` — fits (dawn reset with 1d3 partial regain).

## Gap 1 — Missing atom: `succeed_on_save` (post-roll save-failure override)

The ring's payload is: **turn a just-failed Dexterity save into a success**. This is a post-resolution override applied after the d20 is rolled and compared to the DC.

No `EffectAtom` captures this. The candidates and why they fail:

| Candidate | Why it fails |
|---|---|
| `modify_roll_numeric` | Adds a delta before resolution; cannot retroactively guarantee success |
| `modify_roll_advantage` | Applies before rolling; does not override a resolved failure |
| `negate_named_effect` | Negates a named spell's effect, not a save outcome |
| `negate_triggering_spell` | Reaction-context only, targets the spell being cast, not the save result |
| `none` (sentinel) | Produces a false trace — the mechanic has a real effect |

**Proposed atom**: `succeed_on_save`

```typescript
| {
    readonly kind: "succeed_on_save";
    // The save ability this override applies to.
    // Narrows the atom to the specific save type the item or feature covers.
    readonly ability: Ability;
  }
```

This atom should be valid inside `ActivationPhase.direct.effects` (and potentially as an `EffectAtom` more broadly for future units). It represents a post-roll override: the creature is treated as having succeeded on the named saving throw, regardless of the roll result.

**SRD pressure**: Ring of Evasion is the primary instance. The Monk's Diamond Soul (proficiency on all saves) + Evasion features approach this domain but from the pre-roll side. Ring of Evasion is the only confirmed SRD 5.2.1 item with a post-roll override.

## Gap 2 — Missing surface variant: reaction trigger condition on `ActivatedAbilityMechanics`

Spell reactions express their trigger via `ReactionTrigger` on `CastingTime`:

```typescript
| { readonly kind: "reaction"; readonly trigger: ReactionTrigger }
```

`ActivatedAbilityMechanics` has `activationCost: ClassFeatureActivationCost` where `{ kind: "reaction" }` carries no trigger condition. The Ring of Evasion's reaction is legally triggered only when the wearer **fails a Dexterity saving throw** — this pre-condition is currently not expressible on non-spell activations.

**Proposed extension**: Add an optional `reactionTrigger` field to `ActivatedAbilityMechanics` (or equivalently widen `ClassFeatureActivationCost.reaction` to carry a trigger):

```typescript
// Option A: widen ClassFeatureActivationCost
| {
    readonly kind: "reaction";
    readonly trigger?: NonSpellReactionTrigger;
  }

// NonSpellReactionTrigger initial variants:
export type NonSpellReactionTrigger =
  | { readonly kind: "on_save_failed"; readonly ability: Ability }
  | { readonly kind: "on_hit_by_attack_roll" };
```

`on_save_failed` with `ability: "dex"` precisely captures "when you fail a Dexterity saving throw."

## Encoding that would become possible

With both widenings, the unit encodes as:

```dhall
{ kind = "magic_item"
, id = "magic_item_ring_of_evasion"
, name = "Ring of Evasion"
, rarity = "rare"
, requiresAttunement = True
, provenance = { kind = "srd-5.2.1", section = "MagicItems#Ring of Evasion" }
, description = "..."
, mechanics =
    { family = "activation"
    , activationCost = { kind = "reaction", trigger = { kind = "on_save_failed", ability = "dex" } }
    , resource = { kind = "charge_pool", cap = { kind = "fixed", uses = 3 } }
    , resetCadence = { kind = "dawn", regain = Some { kind = "fixed", expr = { dice = 1, dieSize = 3, flat = None, spellcastingMod = None } } }
    , phases =
        [ { kind = "direct"
          , attachment = { kind = "self" }
          , effects = [ { kind = "succeed_on_save", ability = "dex" } ]
          }
        ]
    }
, destruction = { kind = "none" }
}
```

## Classification

**`atom_widening`** — primary blocker is the missing `succeed_on_save` effect atom. The trigger condition gap on `ActivatedAbilityMechanics` is a secondary `surface_widening`; both are required for an honest encoding.
