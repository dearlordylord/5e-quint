# Proposal: Widening for Expertise (Ranger L9)

## Unit

- Slug: `ranger_expertise_l9`
- Kind: `class_feature`
- Source: SRD 5.2.1, Classes/Ranger#Level 9: Expertise

## Rule Text

> Choose two of your skill proficiencies with which you lack Expertise. You gain Expertise in those skills.

## Why It Does Not Fit

The current `ClassFeatureMechanics` has exactly one family: `activation`. That family requires:

- `activationCost` — how the player spends an action economy resource to trigger it
- `resource` — a `use_count` with a cap
- `resetCadence` — a rest window that refills the pool

Expertise has none of these. It is a **permanent, passive upgrade** granted once at level 9. It does not activate. It does not deplete. It does not reset. Encoding it as `activation` would require inventing phantom fields (a `use_count` cap of 0? a reset cadence that never fires?) and would produce a trace claiming quota consumption and rest windows that do not exist in the rules.

The secondary gap: even if a passive family existed, the effect — doubling the proficiency bonus on two skills — maps to the v4 atom `grant_proficiency`, which is absent from `ClassFeatureEffect`. That union currently contains only `grant_extra_action` and `heal_hp`.

## Proposed Widenings

### 1. New family: `passive` for `ClassFeatureMechanics`

A passive class feature family with no activation cost, no resource pool, and no reset cadence. Shape sketch:

```typescript
export type ClassFeaturePassiveMechanics = {
  readonly family: "passive";
  readonly effect: ClassFeaturePassiveEffect;
};
```

This would cover Expertise (Ranger, Rogue, Bard), Unarmored Defense, weapon proficiencies, and similar one-time permanent grants that fire at level-up and persist indefinitely.

### 2. New variant: `grant_proficiency` in `ClassFeatureEffect`

The v4 atom `grant_proficiency` is already in the taxonomy but missing from the surface `ClassFeatureEffect` union. For Expertise specifically, the variant needs to express:

- which proficiency domain: `skill`
- at what level: `expertise` (double PB) vs plain proficiency
- how many: `count: 2` (player chooses from existing skill proficiencies)

Shape sketch:

```typescript
export type GrantProficiencyEffect = {
  readonly kind: "grant_proficiency";
  readonly domain: "skill" | "tool" | "saving_throw" | "weapon" | "armor";
  readonly tier: "proficiency" | "expertise";
  readonly count: number;
  readonly restriction?: "must_have_proficiency"; // Expertise: must already be proficient
};
```

## Classification

**`structural_widening`** — no honest family exists for passive class features.

## Related Units

The same family gap affects:
- `rogue_expertise_l1` — Rogue L1 Expertise (same mechanic)
- `bard_expertise_l2` — Bard L2 Expertise (same mechanic)
- `barbarian_unarmored_defense_l1`, `monk_unarmored_defense_l1` — permanent passive AC calculation overrides
- Any spellcasting feature that simply adds spells known/prepared without activation
