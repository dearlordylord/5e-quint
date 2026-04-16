# Proposal: structural_widening — Ability Score Improvement (Rogue L4)

## Unit

- **Slug:** `rogue_ability_score_improvement_l4`
- **Kind:** `class_feature`
- **SRD text:** "You gain the Ability Score Improvement feat (see "Feats") or another feat of your choice for which you qualify. You gain this feature again at Rogue levels 8, 10, 12, and 16."

## Why the unit does not fit

### Gap 1 — Missing `ClassFeatureMechanics` family

The current surface defines only one `ClassFeatureMechanics` family:

```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
// requires: activationCost + resource (use_count) + resetCadence + effect
```

Ability Score Improvement is **not an activation**. It is a permanent passive grant that fires exactly once at level acquisition and is never expended, consumed, or reset. There is no activation cost (not a bonus action, not a free action during combat), no use count, and no rest reset. Encoding it as `{ family: "activation", activationCost: { kind: "free" }, resource: { kind: "use_count", cap: { kind: "fixed", uses: 1 } }, resetCadence: ... }` would be structurally dishonest: a fixed-1-use feature that resets on long rest is a completely different semantic from "permanently acquired at level 4."

**Proposed widening:** A new `ClassFeatureMechanics` family, tentatively `passive_grant` or `level_up_grant`, that carries no `activationCost`, no `resource`, and no `resetCadence` — only an `effect` describing what is permanently acquired.

### Gap 2 — Missing `ClassFeatureEffect` variant

The current surface defines:

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

Neither variant covers feat grants. A feat grant is a character-advancement effect: at level acquisition the character permanently gains access to a feat (with a player choice among qualifying feats). The TAXONOMY v4 explicitly defers `modify_ability_score` as out-of-scope for the core mechanics graph ("modify_ability_score as a runtime effect — out-of-scope for the core mechanics graph"). The feat-grant framing is broader: the player may choose any qualifying feat, of which the ASI feat is just one option.

**Proposed widening:** A new `ClassFeatureEffect` variant, tentatively `GrantFeatChoiceEffect`, that records the feat grant at character-advancement time. This does not model runtime combat mechanics and would be a character-progression concern rather than a combat atom. Whether it belongs in the core mechanics graph at all is a design question — the TAXONOMY v4 residue section suggests it remains deferred.

## Cross-cutting impact

All 12 classes in SRD 5.2.1 grant Ability Score Improvement at level 4 (and again at later levels). The structural gap identified here applies identically to:

- `barbarian_ability_score_improvement_l4`
- `bard_ability_score_improvement_l4`
- `cleric_ability_score_improvement_l4`
- `druid_ability_score_improvement_l4`
- `fighter_ability_score_improvement_l4`
- `monk_ability_score_improvement_l4`
- `paladin_ability_score_improvement_l4`
- `ranger_ability_score_improvement_l4`
- `rogue_ability_score_improvement_l4` ← this unit
- `sorcerer_ability_score_improvement_l4`
- `warlock_ability_score_improvement_l4`
- `wizard_ability_score_improvement_l4`

A single widening decision resolves all of them.

## Atoms not yet needed

No new v4 atom is required for the graph shape itself — the structural gap is at the `ClassFeatureMechanics` family level and the `ClassFeatureEffect` variant level, not at the atom taxonomy level. If/when a `grant_feat_choice` effect is introduced, it would map to the existing `grant_proficiency` or a new `grant_feat_access` atom in v4 (neither currently present in the closed atom inventory).
