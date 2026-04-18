# Proposal: Deck of Illusions — structural_widening

## Unit

**Deck of Illusions** — Wondrous Item, Uncommon (SRD 5.2.1, MagicItems#Deck of Illusions)

## Mechanics summary

1. **Activation**: Magic action → draw a random card (1d100 table) → throw to a point within 30 feet → creates a persistent creature illusion anchored to the card on the ground.
2. **Illusion duration**: Lasts until the card is physically moved or the illusion is dispelled (Dispel Magic or similar). No concentration, no timed window.
3. **Mid-duration repositioning**: The wielder may take a Magic action (while within 120 ft and can see the illusion) to move the illusion up to 30 feet from its card.
4. **Disbelief check**: Any creature that takes the Study action to inspect it makes DC 15 Intelligence (Investigation). On pass: identifies as illusion (no further mechanical atom in the current surface).
5. **Card resource**: Up to 34 cards (usually missing 1d20−1), each single-use — when the illusion ends, the card becomes unusable.
6. **Random table**: 32 specific creature entries (01–96 in three-row bands) plus "the card drawer" (97–00).

## Why honest encoding is blocked

### Primary gap: no `operations` on `ActivatedAbilityMechanics`

The mechanics of this item are structurally identical to **Silent Image** (spell), which encodes as:

```
ongoing_effect family → operations:
  passive        → create_illusion
  on_caster_spends_action (Magic action) → reposition_attachment
  on_creature_studies → ability_check_gate (Int vs DC)
```

Silent Image encodes correctly today (`content/silent_image.dhall`). The Deck of Illusions does the same thing but it is a **magic item**, not a spell. Magic items use `ActivatedAbilityMechanics` (or `CompositeMagicItemMechanics` over the component families), none of which carry an `operations` field. Only `OngoingEffectMechanics` (spell-only) exposes `operations: ReadonlyNonEmptyArray<OngoingOperation>`.

No honest workaround exists:
- The `direct` activation phase can emit `create_illusion` for the initial draw, but cannot express the recurring `on_caster_spends_action → reposition_attachment` and `on_creature_studies → ability_check_gate` triggers.
- `CompositeMagicItemMechanics` composes existing magic-item families — none of which have `operations`.
- Omitting those two ongoing triggers would produce a misleading trace (the card could never be re-positioned and the disbelief check would never fire).

### Secondary gap: `DurationEndTrigger` missing "card/attachment physically moved"

The illusion ends when "its card is moved." This maps to a new `DurationEndTrigger` variant — call it `attachment_moved` or `card_physically_moved`. The existing variants are:

- `target_makes_attack_roll`
- `target_deals_damage`
- `target_casts_spell`
- `target_dons_armor`
- `target_damaged_by_caster_or_ally`
- `target_takes_damage`
- `caster_recasts_spell`

None covers "a world object (the card) is physically interacted with and relocated." This is an object-interaction trigger scoped to the attachment anchor itself.

## What does encode cleanly

- **Resource model**: `charge_pool`, cap = `fixed 34`, `resetCadence = never`, `destruction = permanent_on_empty`, `initialCount` approximation.
- **Random table activation**: `random_table` phase (1d100, modifier 0), 33 outcome ranges → each a `direct` phase with `create_illusion`.
- **create_illusion atom**: exists; `maxSize` and `channels` are parameterizable per creature. The "card drawer" (97–00) entry creates a self-illusion — an authoring note, not a surface gap (the creature identity is caller-owned narrative for the illusion atom).
- **reposition_attachment atom**: exists.
- **on_creature_studies + ability_check_gate**: both exist in the ongoing operation surface for spells.
- **dispel end trigger**: `permanent` duration with `endsOn: ["dispel"]` covers Dispel Magic. Only the "card moved" trigger is missing.

## Proposed widening

### 1. `operations` field on `ActivatedAbilityMechanics` (structural widening)

Add an optional `operations?: ReadonlyNonEmptyArray<OngoingOperation>` field to `ActivatedAbilityMechanics`. This lets activated magic-item abilities declare ongoing triggers within their duration window, mirroring what `OngoingEffectMechanics` provides for spells.

Pressure evidence: Deck of Illusions (reposition + disbelief check). Likely future pressure: any magic item that activates a persistent effect with per-turn or per-action triggers.

### 2. `attachment_moved` variant in `DurationEndTrigger` (surface widening)

```typescript
| { readonly kind: "attachment_physically_moved" }
```

Semantics: the host effect ends when the physical object anchoring the attachment (e.g., the thrown card) is physically picked up or relocated by any creature. Distinct from `target_takes_damage` (which watches incoming HP events) and `caster_recasts_spell` (which watches the caster's action).

Scope is narrow: SRD pressure so far is this single item, but the pattern generalizes to any effect anchored to a physical object that ends on disturbance.

## Encoding path once widened

With both widenings in place, the Deck of Illusions would encode as a `magic_item` with `activation` family + `operations`:

```
ActivatedAbilityMechanics {
  activationCost: { kind: "standard_action", action: "magic" }
  resource: charge_pool { cap: fixed 34, initialCount: ..., resetCadence: never }
  destruction: permanent_on_empty
  duration: permanent { endsOn: ["dispel", "attachment_physically_moved"] }
  phases: [
    random_table { die: 100, outcomes: [...33 entries → direct → create_illusion...] }
  ]
  operations: [
    { trigger: on_caster_spends_action (Magic action), effect: reposition_attachment { maxMoveFeet: 30 } }
    { trigger: on_creature_studies, effect: ability_check_gate { ability: "int", dc: { kind: "fixed", dc: 15 }, onPass: { kind: "none" } } }
  ]
}
```

The `create_illusion` atoms in the random table outcomes each parameterize `maxSize` per creature type; channels default to `["visual"]` (the SRD text says the illusion "looks and behaves like" the creature — auditory/other channels are implied but not enumerated explicitly, so `visual` is the safe conservative encoding).
