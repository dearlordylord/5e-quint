# Proposal: passive_spell_grant family for ClassFeatureMechanics

**Unit:** Draconic Spells (sorcerer L3)
**Outcome:** structural_widening

## Gap

The unit grants always-prepared spells at specific class levels. There is no player-triggered activation, no use-count resource, and no reset cadence. The only existing `ClassFeatureMechanics` family is `"activation"`, which requires all three fields (`activationCost`, `resource`, `resetCadence`). Encoding this as `"activation"` with a dummy `activationCost: { kind: "free" }` and empty resource would be a lie — the feature is not something the player activates; spells become available passively on level acquisition.

Additionally, `ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect`. Neither variant represents spell access. The v4 atom `grant_spell_access` is in the taxonomy but unreachable from any current `ClassFeatureMechanics` path.

## Recurring pattern

This is the same structural gap identified for at least four other tier-2 units:

- `warlock_fiend_spells_l3` — Fiend Spells (warlock subclass, levels 3/5/7/9)
- `cleric_life_domain_spells_l3` — Life Domain Spells (cleric subclass, levels 3/5/7/9)
- `paladin_oath_of_devotion_spells_l3` — Oath of Devotion Spells (paladin subclass, levels 3/5/7/9)
- `druid_circle_of_the_land_spells_l3` — Circle of the Land Spells (druid subclass, levels 3/5/7/9)

The widening is high-priority: it blocks encoding of all subclass expanded-spell-list features.

## Proposed shape

Add a new `ClassFeatureMechanics` family:

```typescript
export type SpellListTier = {
  readonly atLevel: number;
  readonly spellIds: ReadonlyArray<string>;
};

export type PassiveSpellGrantMechanics = {
  readonly family: "passive_spell_grant";
  // Spells available from the moment the feature is acquired
  readonly baseSpells: ReadonlyArray<string>;
  // Additional spells unlocked at higher class levels (threshold-tiers by class level)
  readonly additionalTiers?: ReadonlyArray<SpellListTier>;
};

export type ClassFeatureMechanics =
  | ClassFeatureActivationMechanics
  | PassiveSpellGrantMechanics;
```

For Draconic Spells specifically:
- `baseSpells`: `["alter_self", "chromatic_orb", "command", "dragons_breath"]` (acquired at level 3)
- `additionalTiers`: `[{ atLevel: 5, spellIds: ["fear", "fly"] }, { atLevel: 7, spellIds: ["arcane_eye", "charm_monster"] }, { atLevel: 9, spellIds: ["legend_lore", "summon_dragon"] }]`

## Tracer impact

The tracer's `traceClassFeatureMechanics` exhaustive switch would need a new `"passive_spell_grant"` case emitting:
- `class_feature_root` (source)
- `grant_spell_access` nodes (effect) — one per spell or per tier, annotated with the level gate
- `scale_die_count` or a threshold-tiers scaling node if needed to express the level-gated addition

No new v4 atoms are required: `grant_spell_access` already exists in the taxonomy. The widening is surface-only (new family in `ClassFeatureMechanics`) plus the tracer branch.

## SRD reference

SRD 5.2.1 Classes/Sorcerer.md, heading "Level 3: Draconic Spells":

> When you reach a Sorcerer level specified in the Draconic Spells table, you thereafter always have the listed spells prepared.
