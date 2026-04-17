# Proposal: Ring of Spell Turning — atom_widening

## Unit

**Ring of Spell Turning** — `magic_item`, legendary, requires attunement.  
Provenance: SRD 5.2.1 §MagicItems#Ring of Spell Turning

## Summary

The ring has three mechanically distinct effects, none of which can be honestly encoded with the current atom vocabulary:

1. Advantage on saving throws **against spells** (spell-source filter missing from `modify_roll_advantage`)
2. Spell nullification on save success for spells of level ≤ 7 (no existing atom)
3. Reaction to deflect the spell back at its caster (no existing atom; also needs reaction trigger condition on `ActivatedAbilityMechanics`)

## Mechanics Analysis

### Mechanic 1: Advantage on saves against spells

> *"you have Advantage on saving throws against spells"*

The existing `modify_roll_advantage` atom supports `saveAbilityFilter` (narrow to specific abilities) and `attackerTypeFilter` (narrow by creature type) but has no mechanism to narrow the bonus to saving throws triggered by **spell sources** specifically. Encoding without this filter would grant advantage on all saving throws — a material over-grant.

**Proposed widening:** Add an optional `sourceFilter: "spell"` (or equivalent) field to `modify_roll_advantage`. This is a `surface_widening` in isolation.

### Mechanic 2: Spell nullification on save success (level ≤ 7)

> *"If you succeed on the save for a spell of level 7 or lower, the spell has no effect on you"*

This is a passive conditional nullification: any spell of level ≤ 7 whose saving throw the wearer succeeds on is fully negated. The closest existing atoms are:

- `negate_named_effect` — requires a specific `spellId`; doesn't apply to arbitrary spells by level
- `negate_triggering_spell` — fires on a reaction trigger, cancels whatever triggered the reaction; not a passive save-success gate

Neither fits. What's needed is a new passive atom that interposes on save-success outcomes: if the spell level is below a threshold, the wearer's success results in full nullification rather than the normal "succeed means half damage / partial effect" outcome.

**Proposed atom:** `negate_spell_on_save_success` with `maxSpellLevel: number` parameter.

```
{
  kind: "negate_spell_on_save_success",
  maxSpellLevel: 7
}
```

This is an `atom_widening`. The v4 taxonomy has no equivalent.

### Mechanic 3: Reaction to deflect spell at caster

> *"If that spell targeted only you and didn't create an area of effect, you can take a Reaction to deflect the spell back at the spell's caster; the caster must make a saving throw against the spell using their own spell save DC."*

This is the most novel mechanic:

- It is a **reaction ability** on a magic item (not a spell)
- Its trigger condition is compound: (a) the spell succeeded at Mechanic 2's nullification, AND (b) the spell targeted only the wearer, AND (c) the spell had no area of effect
- The effect is **spell reflection**: the spell resolves against the original caster, using *the caster's own spell save DC*, not the wearer's
- The caster must make a saving throw as if they were the original target

This is distinct from:
- `negate_triggering_spell` — that cancels the spell; this one redirects it
- Any existing `save_gate` — the target is the original caster, and the DC is their own DC (a self-referential context unavailable in the current DC source vocabulary)

**Proposed atom:** `reflect_spell` — redirect a triggering spell back at its source caster, forcing a save against the caster's own spell save DC.

**Also needed:** A `DcSource` variant `caster_own_spell_save_dc` for the unusual case where the caster is forced to save against their own spell save DC (distinct from `caster_spell_save_dc`, which is the *wearer's* spellcasting DC).

### Mechanic 3b: Reaction trigger condition gap on ActivatedAbilityMechanics

`ActivatedAbilityMechanics` supports `activationCost: { kind: "reaction" }` but has no field for a trigger predicate. Spell reactions specify their trigger via `CastingTime.reaction.trigger` (a `ReactionTrigger` union). Magic item reaction abilities currently cannot express when the reaction may be triggered.

For this ring's deflect ability, the trigger is: "you just succeeded on a save against a qualifying spell (level ≤ 7, single-target, no AoE)." This compound condition is entirely absent from the surface.

**Proposed widening:** Add an optional `reactionTrigger: ReactionTrigger` field to `ActivatedAbilityMechanics` (or a new `reactionCost` variant of `ClassFeatureActivationCost` that bundles trigger + reaction).

## Classification

| Gap | Kind | Atoms/v4 |
|---|---|---|
| Spell-source filter on `modify_roll_advantage` | `new_variant` | Atom exists; field missing |
| Level-gated save-success nullification | `new_atom` | No v4 equivalent |
| Spell reflection (`reflect_spell`) | `new_atom` | No v4 equivalent |
| `caster_own_spell_save_dc` DC source | `new_variant` | `DcSource` exists; variant missing |
| Reaction trigger on `ActivatedAbilityMechanics` | `new_variant` | Field missing |

**Overall outcome: `atom_widening`** — multiple missing atoms and variants; the `magic_item` kind and `passive`/`activation` families exist but cannot express any of the three core mechanics honestly.
