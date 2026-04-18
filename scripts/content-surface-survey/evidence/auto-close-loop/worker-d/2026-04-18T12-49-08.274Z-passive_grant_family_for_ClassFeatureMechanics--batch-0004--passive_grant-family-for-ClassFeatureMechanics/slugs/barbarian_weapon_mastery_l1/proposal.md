## Barbarian Weapon Mastery (L1)

Outcome: `atom_widening`

### Why it does not fit cleanly

This is still a `class_feature`, and its natural top-level family is closest to `passive`: once learned, it continuously grants access to mastery properties for a chosen set of weapons.

The blocker is the effect surface, not the record kind:

- The current surface can encode individual mastery properties as `mastery` records (`Topple`, `Sap`, `Cleave`, etc.).
- It cannot encode a class feature that grants the ability to use mastery properties for **chosen weapon kinds**.
- No existing `EffectAtom` expresses "you may use mastery properties of N chosen weapon kinds."

Because the feature's primary mechanic is missing from the atom vocabulary, creating `content/barbarian_weapon_mastery_l1.dhall` would require a knowingly false encoding.

### Missing surface

#### 1. New atom: `grant_mastery_access`

Needed shape, roughly:

- grants access to mastery properties
- scoped by weapon-kind selection
- bounded by a count
- optionally constrained by weapon categories/properties

Why:

> "Your training with weapons allows you to use the mastery properties of two kinds of Simple or Martial Melee weapons of your choice..."

This is not the same as:

- granting a mastery property directly;
- granting weapon proficiency;
- granting an attack rider;
- granting a feat.

It is a permission/entitlement that links a class feature to existing mastery-property records through chosen weapon kinds.

#### 2. New reconfiguration subgraph or passive-operation variant

The feature also says:

> "Whenever you finish a Long Rest, you can practice weapon drills and change one of those weapon choices."

Current `PassiveMechanics` supports:

- always-on grants
- elapsed-time passive operations

It does not support:

- a long-rest-triggered `choose`/`replace` flow over persistent selections.

This feels narrower than a new top-level family, but it is still real surface pressure beyond the missing atom.

### Classification rationale

I classified this as `atom_widening`, not `structural_widening`, because:

- `class_feature` is already the correct top-level kind;
- a passive-style family is still the honest structural fit;
- the primary failure is the absence of a mastery-access atom in the current vocabulary.

### Secondary pressure

The final sentence adds scaling pressure on the same concept:

> "When you reach certain Barbarian levels, you gain the ability to use the mastery properties of more kinds of weapons..."

That later-level growth should likely modify the same future `grant_mastery_access` payload rather than introducing a parallel mechanic.
