# Proposal: structural_widening — sorcerer_sorcerer_subclass_l3

## Unit

**Sorcerer Subclass (sorcerer L3)** — `class_feature`, srd-5.2.1

## Why it does not fit

The source text reads:

> "You gain a Sorcerer subclass of your choice. The Draconic Sorcery subclass is detailed after this class's description. A subclass is a specialization that grants you features at certain Sorcerer levels. For the rest of your career, you gain each of your subclass's features that are of your Sorcerer level or lower."

This is a **one-time, permanent character-progression gate**. It has:

- No activation cost (it does not fire during play)
- No consumable resource (no uses, no charges)
- No rest reset cadence
- No combat-atom effect (`grant_extra_action` and `heal_hp` are the only options; neither applies)

The only current `ClassFeatureMechanics` family is `activation`, defined as:

```ts
ClassFeatureMechanicsHeader & {
  readonly family: "activation";
  readonly effect: ClassFeatureEffect;  // grant_extra_action | heal_hp
}
```

with a required header of `activationCost + resource + resetCadence`. All three header fields and the effect field are inapplicable to subclass selection. Forcing this unit into `activation` with placeholder values would produce a dishonest trace.

## Proposed widening

A new payload family is needed — provisionally called `subclass_grant` (or `progression_gate`):

```ts
// Proposed new family for one-time subclass selection at a given level.
// No activation, no resource, no rest reset. Pure character-build gate.
export type ClassFeatureSubclassGrantMechanics = {
  readonly family: "subclass_grant";
  // No further fields needed at this level — the subclass is a player
  // choice that unlocks a feature tree; the individual subclass features
  // are encoded as separate units.
};
```

This family would pair with a new source atom `subclass_feature_root` (already listed in the v4 taxonomy) for the downstream features it unlocks, but the grant itself needs only the family tag.

## Cross-class prevalence

Every SRD class has an identical `<Class> Subclass L3` feature. The survey corpus already contains:

- `barbarian_barbarian_subclass_l3`
- `bard_bard_subclass_l3`
- `cleric_cleric_subclass_l3`
- `druid_druid_subclass_l3`
- `fighter_fighter_subclass_l3`
- `monk_monk_subclass_l3`
- `paladin_paladin_subclass_l3`
- `ranger_ranger_subclass_l3`
- `rogue_rogue_subclass_l3`
- `warlock_warlock_subclass_l3`
- `wizard_wizard_subclass_l3`

All share the same gap. A single `subclass_grant` family addition would resolve all of them.
