# Proposal: Sorcerer Spellcasting L1

**Outcome:** `structural_widening`  
**Confidence:** high

## Summary

Sorcerer Spellcasting L1 is a class spellcasting framework feature. It installs five sub-features simultaneously:

1. **Cantrips** — know N cantrips from class list; count scales at L4 and L10.
2. **Spell Slots** — table-driven slot economy keyed to class level; refill on Long Rest.
3. **Prepared Spells** — build-time list of N level-1+ Sorcerer spells; count scales by class level.
4. **Spellcasting Ability** — designates CHA as the spellcasting ability for spell attack rolls and save DCs.
5. **Spellcasting Focus** — permits Arcane Focus as a material-component substitute.

None of these map to existing EffectAtoms or mechanics families.

## Why No Honest Encoding Exists

### `passive` family is insufficient

`PassiveMechanics` carries a `grants: EffectAtom[]` list. Every EffectAtom in the current surface is a concrete mechanical effect (grant a sense, modify AC, apply a condition, etc.). There is no atom that means:

- "install a spell slot economy for this class" (`grant_spell_slots`)
- "set this ability as the class's spellcasting ability" (`set_spellcasting_ability`)
- "allow preparing N spells from the Sorcerer list, where N scales by class level" (`grant_class_spell_list_access`)

### `grant_spell_access` is too narrow

`grant_spell_access` grants access to a **specific named spell** by `spellId`. It cannot express open-ended list access ("any Sorcerer spell for which you have spell slots") or a scaling prepared-count (2 → 15 spells as class level rises).

### `use_count` / `charge_pool` resources don't model spell slots

Spell slots are a multi-tier table resource (one pool per slot level, 1–9) that refills on Long Rest and scales with class level. The existing resource atoms model single-pool use counters or charge pools with a reset cadence — they have no slot-level dimension and no class-level table lookup.

### No mechanics family captures framework installation

`activation` requires a use-count resource and activation cost. `triggered_reaction` requires a reaction trigger. `ongoing_effect` requires concentration/timed duration with ongoing operations. None of these express "install the machinery through which all Sorcerer spells are accessed".

## Proposed Widenings

### 1. `class_spellcasting_framework` — new mechanics family

A dedicated top-level family for class spellcasting infrastructure. Fields would include:

- `spellcastingAbility: Ability` — CHA for Sorcerer, WIS for Cleric/Druid, INT for Wizard.
- `spellSlotTable` — table-driven slot economy, keyed to class level.
- `cantripsKnown: ThresholdTiers<number>` — count of cantrips by level.
- `preparedSpells: ThresholdTiers<number>` — count of prepared level-1+ spells by level.
- `spellList: string` — reference to the class's spell list (e.g., `"sorcerer"`).
- `focus?: string` — permitted focus type (e.g., `"arcane_focus"`).

This family would emit `grant_spell_slots` + `set_spellcasting_ability` + `grant_class_spell_list_access` effect nodes in the trace.

### 2. `grant_spell_slots` — new EffectAtom

Represents the slot economy grant. Distinct from `use_count` because it is multi-tiered (L1–L9 slots simultaneously), class-level-keyed, and always Long-Rest-reset.

### 3. `set_spellcasting_ability` — new EffectAtom

Designates an ability as the spellcasting ability for all class spells. Distinct from `set_ability_score` (which sets the numeric value) and `modify_ability_score` (which adjusts it). This is a relational designation, not a numeric change.

### 4. `grant_class_spell_list_access` — new EffectAtom or surface type

Expresses "may prepare up to N spells from the named class list at any given level". Carries:

- `spellList: string` — the class spell list identifier.
- `preparedCount: ThresholdTiers<number> | LinearPerLevel<number>` — scaling count.
- `cantripsKnown?: ThresholdTiers<number>` — separate scaling for cantrips if unified here.

## Cross-Class Applicability

This widening applies equally to all full-caster and half-caster class spellcasting features:

- Bard, Cleric, Druid, Sorcerer, Wizard (full casters)
- Paladin, Ranger (half casters — slot table different)
- Warlock (pact magic — different slot refresh cadence)

The same `class_spellcasting_framework` family should serve all of them; the `spellSlotTable` and `resetCadence` fields carry the variation.
