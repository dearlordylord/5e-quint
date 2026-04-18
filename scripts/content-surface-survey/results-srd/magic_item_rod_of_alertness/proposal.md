# Proposal: Rod of Alertness — Surface Widening

## Unit Summary

Rod of Alertness is a composite magic item (very rare, attunement) with three functional components:

1. **Alertness** (passive, while holding): Advantage on Wisdom (Perception) checks and on Initiative rolls.
2. **Spells** (passive, while holding): at-will access to Detect Evil and Good, Detect Magic, Detect Poison and Disease, and See Invisibility.
3. **Protective Aura** (activated, Magic action, once/dawn, 10 minutes): Plant the rod in the ground. The rod's head emits Bright Light 60 ft and Dim Light an additional 60 ft. While in that Bright Light, you and allies gain +1 to AC and saving throws and can sense the location of any Invisible creature also in the Bright Light. Ends after 10 minutes or when a creature uses a Magic action to pull the rod from the ground.

## What Fits Cleanly

The passive component encodes cleanly as the `passive` part of a `CompositeMagicItemMechanics`:

```
condition: { kind: "holding_item" }
grants:
  - modify_roll_advantage, mode: advantage, on: [ability_check], skillFilter: { kind: "fixed", skills: ["perception"] }
  - modify_roll_advantage, mode: advantage, on: [initiative]
  - grant_spell_access, spellId: "detect_evil_and_good", mode: "at_will"
  - grant_spell_access, spellId: "detect_magic", mode: "at_will"
  - grant_spell_access, spellId: "detect_poison_and_disease", mode: "at_will"
  - grant_spell_access, spellId: "see_invisibility", mode: "at_will"
```

The Protective Aura's activation scaffold also fits:
- `activationCost: { kind: "standard_action", action: "magic" }`
- `resource: { kind: "use_count", cap: { kind: "fixed", uses: 1 } }`
- `resetCadence: { kind: "dawn" }`
- `duration: { kind: "timed", value: { unit: "minute", amount: 10 } }`
- `emit_light` as a direct phase effect: `{ kind: "emit_light", brightRadiusFeet: 60, dimAdditionalFeet: 60 }`

## What Doesn't Fit

### Widening 1: `ActivatedAbilityMechanics` lacks ongoing operations

**Evidence:** *"While in that Bright Light, you and your allies gain a +1 bonus to Armor Class and saving throws."*

The Protective Aura creates a persistent area effect. Creatures dynamically entering or leaving the 60-foot bright light zone gain or lose the +1 AC and saving throw bonus throughout the 10-minute duration. This is an ongoing operation pattern:

```
trigger: passive (or on_creature_enters_area + on_attached_turn_start)
attachment: area (emanation 60 ft from rod, disposition: friendly_to_source)
effect: composite [modify_ac +1, modify_roll_numeric on saving_throw +1]
```

`ActivatedAbilityMechanics` only exposes `phases: ReadonlyNonEmptyArray<ActivationPhase>`. There are no `operations` for ongoing trigger-based effects. A `direct` phase encoding would apply `modify_ac` and `modify_roll_numeric` once at activation time — dishonest because the effect is dynamic (creatures who move into the light after activation would not benefit).

**Proposed fix:** Add `operations?: ReadonlyNonEmptyArray<OngoingOperation>` to `ActivatedAbilityMechanics`, parallel to `OngoingEffectMechanics.operations`. This would allow activated abilities to describe persistent area operations while the duration is active.

---

### Widening 2: `detect.property` missing `invisible_creatures` variant

**Evidence:** *"can sense the location of any Invisible creature that is also in the Bright Light"*

The existing `detect` atom covers `"magic" | "evil_and_good" | "poison_and_disease" | "thoughts"`. Sensing the location of creatures with the Invisible condition is a distinct detection property not represented.

Additionally, the spatial constraint ("also in the Bright Light") is not a simple radius from the caster — it is bounded by the emitted light footprint, which originates from the rod's planted location. The current `detect.radiusFeet` field cannot express this zone-anchored condition.

**Proposed fix:** Add `"invisible_creatures"` to the `detect.property` union. Add an optional `zoneFilter?: "within_bright_light_of_source"` qualifier (or similar closed enum) to express that the detection range is bounded by the source effect's light zone rather than a simple radius.

---

### Widening 3: `DurationEndTrigger` missing item-interaction variant

**Evidence:** *"the effect ends after 10 minutes or when a creature takes a Magic action to pull the rod from the ground"*

No `DurationEndTrigger` variant covers "a creature uses a specific action type to interact with the host item." The current set:

```
target_makes_attack_roll | target_deals_damage | target_casts_spell |
target_dons_armor | target_damaged_by_caster_or_ally |
target_takes_damage | caster_recasts_spell
```

None covers item-interaction-as-early-end. The "pull from ground" trigger is mechanically distinct: any creature (not just the attunement holder) can end the effect by using a Magic action on the planted item.

**Proposed fix:** Add `{ readonly kind: "creature_interacts_with_item"; readonly cost: StandardActionKind }` to `DurationEndTrigger`. This generalizes cleanly to other item-interaction early-end cases (e.g., extinguishing a torch, unstoppering a vial).

## Encoding Decision

Not encoded. The Protective Aura is the mechanically distinctive activated property of the rod and cannot be expressed honestly without the above widenings. Encoding only the passive component would omit the item's primary unique feature and produce a misleading trace.

## Classification

`surface_widening` — All three gaps require new variants of existing surface types (`ActivatedAbilityMechanics`, `detect.property`, `DurationEndTrigger`). The v4 atom taxonomy already contains analogous atoms (`ongoing operations`, `detect`, duration lifecycle) — the gaps are in the TS surface, not the taxonomy.
