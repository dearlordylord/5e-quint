# Proposal: `fighter_fighter_subclass_l3` — structural_widening

## Unit

**Name:** Fighter Subclass (fighter L3)
**Kind:** `class_feature`
**Provenance:** `srd-5.2.1`, section `Classes/Fighter#Level 3: Fighter Subclass`

## Source text

> You gain a Fighter subclass of your choice. The Champion subclass is detailed after this class's description. A subclass is a specialization that grants you features at certain Fighter levels. For the rest of your career, you gain each of your subclass's features that are of your Fighter level or lower.

## Why no existing family fits

`ClassFeatureMechanics` currently has one family: `activation`, represented by `ClassFeatureActivationMechanics`. That family requires:

| Field | Required shape | Does this feature have it? |
|---|---|---|
| `activationCost` | `free` or `bonus_action` | No — feature is not activated |
| `resource` | `UseCountResource` | No — no use count |
| `resetCadence` | `RestResetCadence` | No — no rest reset |
| `effect` | `GrantExtraActionEffect \| HealHpEffect` | No — no action grant, no heal |

The feature has none of these components. Its entire purpose is a **build-time branching instruction**: at level 3, the player selects a subclass, and from that point forward gains subclass features as they level up. This is a character-progression choice recorded at character creation/level-up, not a runtime mechanic fired during play.

Forcing it into `activation` would require inventing a fake effect (e.g., `grant_extra_action` with no restriction, or `heal_hp` of zero) — which would produce a dishonest trace that doesn't represent the rule.

## Proposed widening

### New `ClassFeatureMechanics` family: `subclass_grant`

```typescript
export type SubclassGrantMechanics = {
  readonly family: "subclass_grant";
  // The class that owns this subclass gate. Subclass features
  // are acquired at the class level referenced by this feature
  // and at subsequent levels.
  readonly className: ClassName;
};
```

**Source atom:** `subclass_feature_root` already exists in the v4 taxonomy. The `subclass_grant` family represents the base-class node that roots that subgraph — the "unlock" gate that routes the character into a subclass feature tree.

**Tracer handling:** The tracer would emit a `class_feature_root` → `choose` → `subclass_feature_root` subgraph, using the existing `choose` procedure atom and `subclass_feature_root` source atom. No new atoms are required; the gap is in the surface mechanics family.

## Scope

This structural gap applies identically to all *_subclass_l3 features across all SRD 5.2.1 classes:

- `barbarian_barbarian_subclass_l3`
- `bard_bard_subclass_l3`
- `cleric_cleric_subclass_l3`
- `druid_druid_subclass_l3`
- `fighter_fighter_subclass_l3` (this unit)
- `monk_monk_subclass_l3`
- `paladin_paladin_subclass_l3`
- `ranger_ranger_subclass_l3`
- `rogue_rogue_subclass_l3`
- `sorcerer_sorcerer_subclass_l3`
- `warlock_warlock_subclass_l3`
- `wizard_wizard_subclass_l3`

One widening resolves all twelve.

## Classification

`structural_widening` — no existing `ClassFeatureMechanics` family can encode a build-time subclass selection. The missing concept is a new family, not a new variant of an existing surface shape or a new v4 atom.
