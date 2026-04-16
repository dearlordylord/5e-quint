# Proposal: Conjure Celestial — structural_widening

## Unit

- **Name**: Conjure Celestial
- **Kind**: spell (level 7, Conjuration)
- **Source**: srd-5.2.1

## Why it does not fit

Conjure Celestial cannot be encoded honestly in any existing `SpellMechanics` family. Five gaps prevent it:

---

### Gap 1 — No `heal` variant in spell `Effect` (surface_widening)

`Effect = DamageEffect | NoneEffect`. Healing Light restores HP equal to `4d12 + spellcasting ability modifier`. There is no heal branch in the spell Effect type. `heal_hp` exists only in `ClassFeatureEffect` and cannot be reused without a new union variant.

**Evidence**: *"The target regains Hit Points equal to 4d12 plus your spellcasting ability modifier."*

**Fix**: Add `HealEffect` to the spell `Effect` union, parallel to `HealHpEffect` in class features.

---

### Gap 2 — No cylinder area shape (surface_widening)

`Attachment.area.shape` only models `{ kind: "sphere"; radiusFeet: number }`. Conjure Celestial occupies a cylinder (10-ft radius, 40-ft high), which differs geometrically and cannot be approximated as a sphere without falsifying the rule.

**Evidence**: *"a pillar of light in a 10-foot-radius, 40-foot-high Cylinder"*

**Fix**: Add `{ kind: "cylinder"; radiusFeet: number; heightFeet: number }` to the area shape union.

---

### Gap 3 — No moveable area attachment (surface_widening / structural_widening)

The cylinder can be moved up to 30 ft per turn as part of the caster's movement. No `Attachment` type models a repositionable area. A static area attachment misrepresents the rule because the trigger population changes each turn as the cylinder moves.

**Evidence**: *"when you move on your turn, you can also move the Cylinder up to 30 feet"*

**Fix**: Extend `Attachment.area` with an optional `moveable` field (e.g., `{ maxFeet: number; cost: "movement" }`), or introduce a `moveable_area` attachment kind.

---

### Gap 4 — No enter-area / end-turn-in-area window (surface_widening)

The spell fires on three distinct triggers: (a) cylinder moves into a creature's space, (b) a creature enters the cylinder, (c) a creature ends its turn in the cylinder. The closest existing atom is `post_action_window`, but it models "after a creature acts on an anchor" (Alarm-style), not position-based entry or turn-end-in-area. A dedicated window variant is needed.

**Evidence**: *"Whenever the Cylinder moves into the space of a creature you can see and whenever a creature you can see enters the Cylinder or ends its turn there"*

**Fix**: Add `area_enter_window` and/or `area_turn_end_window` to the Window atom inventory, or generalize `post_action_window` with a discriminant for the trigger kind.

---

### Gap 5 — No per-target player-choice between two effects (structural_widening)

This is the primary structural gap. Conjure Celestial offers a caster-selected branch per creature: Healing Light (heal) **or** Searing Light (save-gate damage). The `ongoing_effect` family holds a single `operation` field — it cannot represent a player choice. The `activation` family has phases but no persistent area. No existing family supports:

> "for each creature, choose one of {heal, save_gate_damage}, applied now and whenever the area triggers"

The v4 taxonomy includes a `choose` procedure atom, but it is not wired into any spell family's mechanics type.

**Evidence**: *"For each creature you can see in the Cylinder, choose which of these lights shines on it: [Healing Light | Searing Light]"*

**Fix**: Introduce a new spell mechanics family — tentatively `area_dual_effect` or generalize `ongoing_effect` to allow `{ kind: "player_choice"; options: ReadonlyArray<OngoingOperation> }` as an operation variant. The family also needs to express the moveable area and the enter/end-turn triggers described above.

---

## Proposed new family sketch

```
AreaDualEffectMechanics = SpellMechanicsHeader & {
  family: "area_dual_effect"
  areaShape: AreaShape              // cylinder | sphere | ...
  moveable: { maxFeet: number; cost: "movement" } | null
  triggerWindows: ReadonlyArray<AreaTriggerWindow>  // enters_area | end_turn_in_area | area_enters_creature
  options: ReadonlyArray<AreaEffectOption>          // player chooses per creature per trigger
  oncePerCreaturePerTurn: boolean
}

type AreaEffectOption =
  | { label: string; effect: HealEffect }
  | { label: string; effect: SaveGateEffect }
```

This sketch is illustrative. The actual widening should be designed in coordination with other moveable-area pressure cases (Moonbeam, Spirit Guardians) to avoid premature specificity.

---

## Scaling note

Higher-slot scaling applies uniformly to both options: `+1d12 healing` and `+1d12 damage` per slot above 7. Once the family exists, this maps to `linear_per_level` with `axis: "slot"` on both the heal and damage amounts.

---

## Related pressure cases

- **Moonbeam** (level 2) — moveable cylinder, save-gate damage, radiant/shape-changer effect; same moveable area gap.
- **Spirit Guardians** (level 3) — persistent moving area, save-gate damage; overlapping structural pressure.
- **Call Lightning** (level 3) — repositionable point, recurring activation; related but different family.

The moveable-area widening should be designed across all three together.
