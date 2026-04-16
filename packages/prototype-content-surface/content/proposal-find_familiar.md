# Proposal: Find Familiar — structural_widening

## Outcome

`structural_widening` — no existing `SpellMechanics` family can honestly encode this spell.

## Why no existing family fits

Find Familiar (Conjuration 1, Instantaneous duration, 1-hour Ritual cast) creates a **persistent autonomous companion** with multiple ongoing capabilities and lifecycle management mechanics.

| Family | Why it fails |
|---|---|
| `ongoing_effect` | Duration is Instantaneous, not concentration or timed. `OngoingOperation` only supports `roll_modifier` and `damage_on_hit`. Neither applies. |
| `activation` | `ActivationPhase` is limited to `attack_roll \| save_gate`. No phase type for companion creation. |
| `triggered_reaction` | Wrong activation shape; spell is a proactive cast, not a reaction to a trigger. |
| `anchored_trigger` | Alarm's shape (plant a trigger → fires a signal) is structurally different from creating an autonomous actor with its own action economy. |

## v4 Atom Coverage

All required v4 atoms **already exist**:

| Mechanic | v4 Atom |
|---|---|
| Summon the familiar | `create_companion` |
| Familiar as an attachment target | `companion` |
| Passive telepathic link | `telepathic_link` |
| Touch-spell delivery via Reaction | `deliver_touch_spell` |
| Dismiss to pocket dimension | `transport_exile` |
| Senses sharing (see/hear through familiar) | `grant_sense` (scoped to caster while active) |

The structural gap is entirely at the `SpellMechanics` family level, not at the atom level.

## Proposed Widening: `companion_summon` family

A new `SpellMechanics` family is required. Draft shape:

```typescript
export type CompanionCapability =
  | { readonly kind: "telepathic_link"; readonly rangeInFeet: number }
  | {
      readonly kind: "sense_sharing";
      readonly cost: "bonus_action";
      readonly durationType: "until_start_of_next_turn";
    }
  | {
      readonly kind: "touch_spell_delivery";
      readonly companionCost: "reaction";
      readonly rangeInFeet: number;
    };

export type CompanionLifecycle =
  | { readonly kind: "disappears_at_0hp"; readonly restoreOn: "recast" }
  | {
      readonly kind: "dismissible";
      readonly temporary: true;
      readonly destination: "pocket_dimension";
      readonly recallCost: "magic_action";
    }
  | { readonly kind: "dismissible"; readonly temporary: false };

export type CompanionSummonMechanics = SpellMechanicsHeader & {
  readonly family: "companion_summon";
  // The companion is not persistent state on the spell record; its stats
  // are governed by the chosen form (chosen at cast time). The surface
  // records only the structural constraints, not the creature stat block.
  readonly companionKind: "familiar";  // future: "steed", "beast", etc.
  readonly capabilities: ReadonlyArray<CompanionCapability>;
  readonly lifecycle: ReadonlyArray<CompanionLifecycle>;
  readonly oneFamilyOnly: boolean;
};
```

`CompanionSummonMechanics` would extend `SpellMechanics` as a fifth variant.

## Scope Note

Find Familiar is the canonical pressure case for summoning/companion spells. The `companion_summon` family would directly serve at minimum:
- Find Familiar
- Find Steed
- Animate Dead (with modifications — undead rather than familiar)
- Conjure Animals / Conjure Elemental / Conjure Celestial family (multi-companion variant)

The surface type design above is deliberately narrow (shaped to Find Familiar). Widening to cover multi-companion summons, concentration-duration summons, and stat-block-parameterized summons (Summon Beast, Summon Aberration, etc.) would require further iterations.
