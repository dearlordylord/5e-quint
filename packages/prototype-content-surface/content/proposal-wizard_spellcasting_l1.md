# Proposal: Widening for Wizard Spellcasting L1

**Unit:** `wizard_spellcasting_l1`  
**Outcome:** `structural_widening`

## Why no honest encoding exists

The current `ClassFeatureMechanics` has a single family: `activation`. That family models:

```
activate → consume use-count → produce a terminal effect
```

Examples: Action Surge (free activation, 1 use per short/long rest, grants extra action), Second Wind (bonus-action, 1 use per short rest, heals HP).

Wizard Spellcasting L1 is not this shape at all. It is a **passive infrastructure feature** — always-on from the moment it is acquired — that establishes:

1. A **multi-tier spell slot pool** (level-indexed, not a scalar use-count)
2. A **spellbook** (a physical Tiny object containing stored spells)
3. A **prepared spell list** (a dynamic subset of the spellbook, reconstitutable on Long Rest)
4. **Cantrips known** (scaling with class level)
5. **Spellcasting ability** (INT) and **spellcasting focus** options (arcane focus or spellbook)

None of these map to `GrantExtraActionEffect | HealHpEffect`, and none fit an activate/use-count/reset/effect cycle.

## Proposed widenings

### 1. New family: `spellcasting_framework`

A new `ClassFeatureMechanics` family for features that establish a spellcasting system for a class. Required fields would include at minimum:

- `spellcastingAbility: Ability` — which ability score governs spell attacks and save DCs
- `spellSource: "spellbook" | "prepared" | "known"` — how spells are accessed
- `slotTable: ThresholdTiers<SpellSlotsByLevel>` — the multi-tier slot pool by class level
- `preparedCountFormula: ...` — how many spells can be prepared (for wizard: INT mod + wizard level, scaling by class level)
- `cantripCount: ThresholdTiers<number>` — cantrips known by class level

This family would map to a `grant_spell_access` + `spell_slot_pool` subgraph in the tracer (atoms: `grant_spell_access`, `spell_slot`, `use_count` × N levels, `rest_window` (long rest)).

Other spellcasting features across the class list would use the same family with different parameters (e.g., bard and sorcerer use `"known"` instead of `"spellbook"`).

### 2. New surface shape: `spell_slot_pool`

The existing `UseCountResource` is:

```typescript
type UseCountResource = {
  kind: "use_count";
  cap: UseCountCap;  // scalar: fixed | threshold_tiers<number>
}
```

Spell slots are **not** a scalar. They are a level-indexed pool: at wizard L1 the wizard has 2 × L1 slots; at L3 they have 4 × L1 + 2 × L2; etc. Consuming a L2 slot does not affect the L1 slot count.

A `SpellSlotPool` resource would need to be a map from `SpellLevel → ThresholdTiers<number>`, or equivalently a `ThresholdTiers<SpellSlotsByLevel>` where `SpellSlotsByLevel` is `Record<SpellLevel, number>`. This is structurally different from the current scalar `use_count` and would need its own atom.

### 3. New `ClassFeatureEffect` variant: `grant_spell_access`

The v4 atom `grant_spell_access` already exists in the taxonomy. It needs a surface variant in `ClassFeatureEffect`:

```typescript
type GrantSpellAccessEffect = {
  kind: "grant_spell_access";
  source: "spellbook" | "prepared_list" | "known_list";
  cantrips: ThresholdTiers<number>;  // cantrip count by level
};
```

This would cover: wizard/cleric/druid (prepared from list), bard/sorcerer/warlock (known list), with wizard specifically using a spellbook as the source backing the prepared list.

### 4. New surface shape: `spellbook_object`

The spellbook is an `object` attachment (v4 atom) with unique properties:

- Starts with N spells at class level 1
- Gains spells on level-up (+2 Wizard spells per level above 1)
- Allows copying spells from scrolls/other books (with time+gold cost)
- Can serve as a spellcasting focus

No existing attachment or effect variant captures "mutable stored-spell repository that can grow over time and also functions as a focus." The closest existing atoms are `stored_spell` (attachment) and `item` (attachment), but neither models the growing repository + focus dual-role.

## Classification note

The `spellcasting_framework` family would be reused across bard, cleric, druid, paladin, ranger, sorcerer, warlock, and wizard — all of which have spellcasting as a Level 1 class feature with minor structural variations. This makes it higher-priority widening than single-unit pressure: **every spellcasting class requires it**.

The `spell_slot_pool` shape is similarly cross-cutting: the same level-indexed pool structure appears in every full- and half-caster.
