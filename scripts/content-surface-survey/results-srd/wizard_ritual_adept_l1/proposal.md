# Proposal: Widening for Ritual Adept (wizard L1)

## Unit

- Slug: `wizard_ritual_adept_l1`
- Kind: `class_feature` (wizard, L1)
- Outcome: `structural_widening`

## Why it doesn't fit

`ClassFeatureMechanics` has exactly one family: `activation`. That family mandates:

```
activationCost + UseCountResource + RestResetCadence + ClassFeatureEffect
```

Ritual Adept has none of these properties. It is a **permanent passive rule modifier** that takes effect unconditionally once the wizard reaches level 1. It does not:
- activate (no cost, no trigger)
- consume uses (no pool, no cap)
- reset (no rest cadence, never depletes)

Forcing `activationCost: { kind: "free" }` and `resource: { kind: "use_count", cap: { kind: "fixed", uses: 999 } }` would produce a dishonest trace implying the feature fires discretely and is bounded by a quota.

## Gap 1 — Missing family: `passive`

The surface needs a `passive` family for `ClassFeatureMechanics` to cover always-on class features. Candidates from the same tier that would also use it:

- Ritual Adept (wizard L1): modify casting rules
- Unarmored Defense (barbarian/monk L1): permanent AC formula change
- Expertise (rogue L1, bard L2): permanent skill proficiency doubling
- Thieves' Cant (rogue L1): passive language/communication access

A minimal shape:

```typescript
export type ClassFeaturePassiveMechanics = {
  readonly family: "passive";
  readonly effect: ClassFeaturePassiveEffect;
};
```

where `ClassFeaturePassiveEffect` is a new union (see Gap 2).

## Gap 2 — Missing effect: `modify_casting_rule`

The current `ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect` covers activated outcomes only.

Ritual Adept's effect is: **for any spell in the wizard's spellbook that has the Ritual tag, remove the preparation requirement and allow casting without a spell slot, in exchange for a physical-book-in-hand constraint and a longer casting time**.

The closest v4 atom is `grant_spell_access`, but that atom covers expanding which spells a character can cast (learning new spells, adding spells to a list). Ritual Adept does not add new spells — it changes *how* existing spellbook entries may be cast. This is a distinct atom.

Proposed atom: `modify_casting_rule`

Shape for this instance:

```typescript
{
  kind: "modify_casting_rule";
  // The eligibility filter: which spells the rule applies to
  filter: { hasTag: "ritual"; source: "spellbook" };
  // What changes: preparation is no longer required
  removes: "preparation_requirement";
  // What is added: must physically possess and read the book
  adds: "spellbook_in_hand_requirement";
  // Slot cost is waived (implicit in ritual casting rules)
  slotCost: "waived";
}
```

## Widening classification

| Layer | Classification | Reason |
|---|---|---|
| Family | `structural_widening` | No `passive` family exists; cannot encode without inventing new family |
| Effect | `atom_widening` | `modify_casting_rule` is not in v4 atom inventory (differs from `grant_spell_access`) |

The `structural_widening` is the primary classification because the absence of a `passive` family is the blocking gap — even if the effect atom existed, there would be no family shell to put it in.

## Related units that would also benefit

Any permanently-on class feature without an activation event would require the same `passive` family:

- `barbarian_unarmored_defense_l1`: passive AC formula
- `bard_jack_of_all_trades_l2`: passive half-proficiency bonus
- `rogue_expertise_l1`: passive proficiency doubling
- `fighter_fighting_style_l1`: permanent fighting style bonus (many variants)
- `wizard_scholar_l2`: passive expertise in a skill

These are a large cohort. The `passive` family is high-priority for class-feature coverage breadth.
