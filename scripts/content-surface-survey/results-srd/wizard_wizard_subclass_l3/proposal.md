# Proposal: `subclass_acquisition` family for ClassFeatureRecord

## Unit

**Wizard Subclass (wizard L3)** — `wizard_wizard_subclass_l3`

## Gap

The content surface currently models `ClassFeatureMechanics` with a single family:

```
family: "activation"
  activationCost: ClassFeatureActivationCost
  resource: UseCountResource
  resetCadence: RestResetCadence
  effect: ClassFeatureEffect   // GrantExtraActionEffect | HealHpEffect
```

The Wizard Subclass feature has none of these fields:

- **No activation cost** — the subclass is not activated, it is permanently gained at L3.
- **No resource** — there is no use count, no quota, no slot consumed.
- **No reset cadence** — the subclass is not a renewable resource.
- **No concrete effect** — the "effect" is entirely delegated to whatever subclass the player chooses; the L3 feature itself does nothing except mark that a subclass has been acquired.

## Rule Text

> "You gain a Wizard subclass of your choice. The Evoker subclass is detailed after this class's description. A subclass is a specialization that grants you features at certain Wizard levels. For the rest of your career, you gain each of your subclass's features that are of your Wizard level or lower."

There is no activation, no cost, no roll, no resource expenditure. The entire sentence is a delegation: "from this point on, also have a subclass."

## Affected Units

This gap is **class-universal**. Every SRD class has a subclass-acquisition feature at L3:

| Slug | Class |
|---|---|
| `barbarian_barbarian_subclass_l3` | Barbarian |
| `bard_bard_subclass_l3` | Bard |
| `cleric_cleric_subclass_l3` | Cleric |
| `druid_druid_subclass_l3` | Druid |
| `fighter_fighter_subclass_l3` | Fighter |
| `monk_monk_subclass_l3` | Monk |
| `paladin_paladin_subclass_l3` | Paladin |
| `ranger_ranger_subclass_l3` | Ranger |
| `rogue_rogue_subclass_l3` | Rogue |
| `sorcerer_sorcerer_subclass_l3` | Sorcerer |
| `warlock_warlock_subclass_l3` | Warlock |
| `wizard_wizard_subclass_l3` | Wizard |

Any widening that solves this unit solves all twelve.

## Proposed Widening

### Option A: New `subclass_acquisition` family

Add a new `ClassFeatureMechanics` family variant:

```typescript
export type SubclassAcquisitionMechanics = {
  readonly family: "subclass_acquisition";
  // No resource, no activation cost, no effect.
  // The subclass itself is the content; it is not modeled here.
};
```

The tracer would emit a minimal graph:

```
class_feature_root → subclass_feature_root (via "grants")
```

This matches the v4 `subclass_feature_root` source atom (already in TAXONOMY_atoms_graph.md §1).

### Option B: New `passive` family (broader)

A more general `passive` family covering all one-time, no-cost, no-resource grants that delegate mechanics entirely to referenced units. This would also cover features like "you gain a Fighting Style" (Paladin L2) and similar delegation-only features, though those introduce their own selection pressure.

### Recommendation

**Option A** is narrower and more honest. The subclass acquisition pattern is categorically distinct from other passive grants: it references an entire parallel feature tree (`subclass_feature_root`) rather than a single atom. Model it separately.

## Classification

`structural_widening` — no existing `ClassFeatureMechanics` family can encode a feature whose entire content is "you now have a subclass." No workaround using `activation` + a fabricated effect is acceptable under the guardrails.
