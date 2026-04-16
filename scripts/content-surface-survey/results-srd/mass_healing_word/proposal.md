# Proposal: Surface Widenings for Mass Healing Word

## Unit

**Mass Healing Word** — Level 3 Abjuration, Bonus Action, Instantaneous, 60 ft, V only.  
SRD 5.2.1 (`srd52: true`).

## Why the Unit Cannot Be Encoded Honestly

Mass Healing Word is an instantaneous bonus-action spell that heals up to six creatures in range for `2d4 + spellcasting ability modifier` HP, scaling by `+1d4` per slot above 3. It has no attack roll and no saving throw.

The surface has no honest path for this mechanic:

1. **`ActivationPhase` lacks a `direct_effect` kind.** The `ActivationMechanics` family requires phases, and `ActivationPhase` is limited to `attack_roll` and `save_gate`. A heal spell with no resolution gate fits neither. Encoding it as a `save_gate` with an empty success branch or as an `attack_roll` with on-miss=none would produce a false trace.

2. **Spell `Effect` has no `heal` variant.** The spell-side `Effect` union is `DamageEffect | NoneEffect`. The `heal_hp` type exists in `ClassFeatureEffect` only. Mass Healing Word's output is HP recovery — using `damage` with a negative value or `none` would be dishonest.

3. **`DiceExpr` cannot express "2d4 + spellcasting ability modifier".** The `flat` field is `number | undefined` — a literal integer. The spellcasting ability modifier is a runtime value derived from the caster's ability scores. There is no field or variant in `DiceExpr` / `DiceAmount` to encode `abilityModifier: "spellcasting"` or `abilityModifier: "wis"` as part of the damage/heal formula.

4. **Fixed multi-target count has no native expression.** `TargetSelection.choose_up_to` requires `SlotScaling<number>`. A fixed `choose_up_to: 6` (no slot scaling of target count) would need either a `choose_up_to_fixed` mode or an explicit convention that `SlotScaling` with `perSlotAboveBase: 0` is the idiom.

## Proposed Widenings

### 1. `ActivationPhase.direct_effect`

```typescript
export type ActivationPhase =
  | { readonly kind: "attack_roll"; ... }
  | { readonly kind: "save_gate"; ... }
  | {
      readonly kind: "direct_effect";
      readonly attachment: Attachment;
      readonly effect: Effect;            // heal or damage with no resolution gate
    };
```

This covers instantaneous heal/damage spells where effects fire unconditionally on every target. The existing `attachment` + `Effect` composition handles both healing and damage variants once (2) is resolved.

### 2. `Effect.heal` (spell-side)

```typescript
export type HealEffect = {
  readonly kind: "heal";
  readonly amount: DiceAmount;
};

export type Effect = DamageEffect | NoneEffect | HealEffect;
```

The v4 atom `heal` already exists. The spell `Effect` union simply needs to include it, mirroring the existing `HealHpEffect` in `ClassFeatureEffect`. The tracer already handles `heal` atom emission for class features — the same path can be reused.

### 3. Ability modifier addend in `DiceExpr`

```typescript
export type DiceExpr = {
  readonly dice: number;
  readonly dieSize: number;
  readonly flat?: number;
  readonly abilityModifier?: "spellcasting" | Ability;  // NEW
};
```

`"spellcasting"` means "the caster's spellcasting ability modifier" (resolved at runtime). `Ability` covers explicit cases like `"wis"` or `"cha"`. This field is relevant to virtually all heal spells in the SRD. It is also needed for damage spells whose formula includes an ability mod (e.g., Toll the Dead, Shillelagh, some cantrips).

### 4. Fixed multi-target selection (minor)

Either:
- Add `{ mode: "choose_up_to_fixed"; count: number }` to `TargetSelection`, or
- Document explicitly that `SlotScaling<number>` with `perSlotAboveBase: 0` encodes a fixed count.

The second option requires no type change and matches the existing idiom used for base-only scaling.

## Widening Category

`surface_widening` — all required v4 atoms (`heal`, `activate`, `spell_slot`, `scale_die_count`, `target`, `bonus_action_quota`) exist in the taxonomy. Every gap is a missing variant of an existing surface type.

## Blast Radius

These four widenings would unblock a large category of SRD spells:
- **Healing word / Cure Wounds / Prayer of Healing / Mass Cure Wounds / Heal / Regenerate** — all require the `direct_effect` phase, `heal` Effect variant, and ability-modifier DiceExpr field.
- **Cantrips with ability-modifier addend** (True Strike, Shillelagh) — need the DiceExpr modifier field.
- **Multi-target fixed spells** (Thunderwave at area, other fixed-count effects) — may benefit from a `choose_up_to_fixed` TargetSelection mode.
