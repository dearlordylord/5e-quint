# Proposal: `druid_druid_subclass_l3` — structural_widening

## Unit

**Name:** Druid Subclass (druid L3)  
**Kind:** class_feature  
**Provenance:** srd-5.2.1 — Classes/Druid#Level 3: Druid Subclass

## Source text

> You gain a Druid subclass of your choice. The Circle of the Land subclass is detailed after this class's description. A subclass is a specialization that grants you features at certain Druid levels. For the rest of your career, you gain each of your subclass's features that are of your Druid level or lower.

## Why this unit does not fit

The existing `ClassFeatureMechanics` type is a union with exactly one member:
`ClassFeatureActivationMechanics`, which models activated abilities with:

- `activationCost` — how the ability is triggered during play
- `resource` — a use-count pool consumed on activation
- `resetCadence` — how the pool refills on rests
- `effect` — the discrete mechanical outcome

A subclass selection feature has **none of these**. It is:

1. A one-time permanent choice made at level-up (not activated during play).
2. Not resource-gated (no use count, no reset).
3. Its "effect" is unlocking a subclass progression tree — not a discrete runtime effect like `grant_extra_action` or `heal_hp`.

Encoding it as an `activation` would require fabricating:
- An activation cost that does not exist
- A use count (e.g. `{ kind: "fixed", uses: 1 }`) that misrepresents a permanent choice as a consumable
- An effect atom that does not correspond to any real mechanic

That would produce a misleading trace and violates the "honest trace" guardrail.

## Proposed widening

### New `ClassFeatureMechanics` family: `subclass_choice`

```typescript
export type SubchoiceMechanics = {
  readonly family: "subclass_choice";
  // The level at which the choice is made (always matches acquiredAtLevel).
  readonly choiceLevel: number;
  // Closed set of available subclass ids, or open if the full list is
  // out of scope for the current encoding (e.g. only one subclass in SRD).
  readonly availableSubclasses: ReadonlyArray<string> | "open";
};
```

A new tracer branch `traceSubclassChoice` would emit:
- `subclass_feature_root` source node (already in v4 taxonomy as a source atom)
- A `choose` procedure node (already in v4 procedure atoms)
- An `activate` node or simple chain showing the subclass path is unlocked

### Scope

This same gap applies to all "XClass Subclass (L3)" features across all classes:
`barbarian_barbarian_subclass_l3`, `bard_bard_subclass_l3`,
`cleric_cleric_subclass_l3`, `fighter_fighter_subclass_l3`,
`monk_monk_subclass_l3`, `paladin_paladin_subclass_l3`,
`ranger_ranger_subclass_l3`, `rogue_rogue_subclass_l3`,
`sorcerer_sorcerer_subclass_l3`, `warlock_warlock_subclass_l3`,
`wizard_wizard_subclass_l3`, and this unit.

All twelve are the same structural shape. One `subclass_choice` family addition
resolves all of them.

## v4 atoms already available

- `subclass_feature_root` — source atom, already in v4 inventory (§1)
- `choose` — procedure atom, already in v4 inventory (§2)

No new atoms are strictly required; only the new mechanics family and a tracer
branch.
