# Proposal: Befuddlement surface widenings

## Unit

- **Slug**: `befuddlement`
- **Kind**: spell
- **Level**: 8 Enchantment, Action, 150 ft, Instantaneous duration
- **Outcome**: `surface_widening`

## What fits

The spell's core structure — an Int saving throw with 10d12 Psychic damage on fail and half damage on success — encodes cleanly as an `activation` spell with a single `save_gate` phase:

```dhall
{ kind = "save_gate"
, attachment = { kind = "target", selection = { mode = "one" } }
, ability = "int"
, dc = { kind = "caster_spell_save_dc" }
, onFail = <composite: damage + restrict_action_set>
, onSuccess = { kind = "half_damage" }
, repeatSave = <30-day calendar cadence — MISSING>
}
```

The damage atom itself (`10d12 psychic`) and the `half_damage` save-success outcome are both already expressible.

## Gap 1 — `RepeatSaveSpec.cadence` missing calendar-time variant

**SRD text**: "At the end of every 30 days, the target repeats the save, ending the effect on a success."

`RepeatSaveSpec.cadence` currently supports:
- `"end_of_target_turn"` — fires at turn boundary (Hold Person family)
- `"on_target_takes_damage"` — fires on damage event (Dominate family)

**Proposed widening**: add a calendar-time cadence variant to `RepeatSaveSpec`:

```typescript
export type RepeatSaveSpec = {
  readonly cadence:
    | "end_of_target_turn"
    | "on_target_takes_damage"
    | { readonly kind: "elapsed_days"; readonly days: number };  // NEW
  readonly onSuccess: "ends_on_target";
  readonly onFailAgain?: EffectAtom;
};
```

This is a surface-level extension — no new v4 taxonomy atom is introduced; the existing `repeat_save` resolution atom covers the concept.

## Gap 2 — `restrict_action_set` not a standalone EffectAtom

**SRD text**: "the target … can't cast spells or take the Magic action"

The v4 taxonomy (TAXONOMY_atoms_graph.md §9 Effect Atoms) lists `restrict_action_set`. In `types.ts`, `ActionRestriction` is embedded inside `grant_extra_action` only — it restricts what the *caster's* extra action may be. No standalone EffectAtom applies an action restriction to the *target* creature for the duration of a persistent effect.

**Proposed widening**: promote `restrict_action_set` to a first-class EffectAtom:

```typescript
| {
    readonly kind: "restrict_action_set";
    readonly exclude: ReadonlyNonEmptyArray<StandardActionKind>;
    // optionally: also blocks spellcasting regardless of action kind
    readonly blockSpellcasting?: true;
  }
```

Befuddlement requires `exclude: ["magic"]` + `blockSpellcasting: true` (the SRD says "can't cast spells or take the Magic action" — casting spells through non-Magic-action paths, e.g. Quickened Spell, would also be blocked per RAW intent).

This is a `surface_widening` — `restrict_action_set` is already a named v4 taxonomy atom; the TS surface simply hasn't exposed it as a target-applied EffectAtom yet.

## Gap 3 — `Duration.permanent.endsOn` missing spell-dispel variant

**SRD text**: "The effect can also be ended by the Greater Restoration, Heal, or Wish spell."

The persistent action restriction has no natural duration — it lasts until a specific spell removes it. Modeling this as `duration: { kind: "permanent" }` requires an `endsOn` variant for "target receives one of these named spells":

```typescript
| {
    readonly kind: "permanent";
    readonly endsOn?: ReadonlyNonEmptyArray<
      | "dispel"
      | "damage"
      | { readonly kind: "named_spell_cast_on_target"; readonly spellId: string }  // NEW
    >;
  }
```

Alternatively, a shorthand closed list of well-known "restoration spells" (greater_restoration, heal, wish) could be a named variant without spelling out individual spell IDs.

This is again a `surface_widening` — no new v4 atom is needed; the existing `permanent` duration lifecycle atom handles it, but `endsOn` needs a new member.

## Encoding path once gaps are closed

With all three widenings in place:

```dhall
{ kind = "spell"
, id = "befuddlement"
, family = "activation"
, level = 8
, school = "enchantment"
, castingTime = { kind = "action" }
, range = { kind = "point", feet = 150 }
, components = { v = True, s = True, m = Some "a key ring with no keys" }
, duration = { kind = "instantaneous" }
, phases =
    [ { kind = "save_gate"
      , attachment = { kind = "target", selection = { mode = "one" } }
      , ability = "int"
      , dc = { kind = "caster_spell_save_dc" }
      , onFail =
          { kind = "composite"
          , effects =
              [ { kind = "damage"
                , damageType = "psychic"
                , amount = { kind = "fixed", expr = { dice = 10, dieSize = 12 } }
                }
              , { kind = "restrict_action_set"          -- Gap 2
                , exclude = [ "magic" ]
                , blockSpellcasting = True
                }
              ]
          }
      , onSuccess = { kind = "half_damage" }
      , repeatSave =
          { cadence = { kind = "elapsed_days", days = 30 }  -- Gap 1
          , onSuccess = "ends_on_target"
          }
      }
    ]
}
```

The persistent restriction would also need a `duration` wrapper on the `restrict_action_set` atom referencing `permanent.endsOn` (Gap 3). The exact attachment of the persistent effect to the save_gate phase (as a lingering effect after the instantaneous cast) may need an additional surface mechanic for "instantaneous cast but persistent target-applied debuff" — a common D&D 5e pattern (Feeblemind is the archetype for this spell family).
