# Proposal: Widenings for Body and Mind (Monk L20)

## Unit

- **Name:** Body and Mind (Monk L20)
- **Slug:** `monk_body_and_mind_l20`
- **Source:** SRD 5.2.1, Classes/Monk#Level 20: Body and Mind
- **Text:** "Your Dexterity and Wisdom scores increase by 4, to a maximum of 25."

## Outcome

`structural_widening`

Body and Mind does not fit any existing `ClassFeatureMechanics` family. No `.dhall`, `.json`, or `.trace.md` were produced.

---

## Gap 1 — Missing mechanics family: `passive`

### Problem

`ClassFeatureMechanics` is currently a single-variant union:

```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
```

`ClassFeatureActivationMechanics` requires three fields that are meaningless for Body and Mind:

| Required field | What it means | Why it doesn't apply |
|---|---|---|
| `activationCost` | How the feature is triggered (free / bonus_action) | Body and Mind is never "triggered" — it takes effect permanently at level acquisition |
| `resource` | A use-count pool | There are no uses to count |
| `resetCadence` | When uses refill (short rest / long rest) | No uses means no reset |

Forcing Body and Mind into `activation` would require fabricating a `{ kind: "free" }` activation cost and a `{ kind: "fixed", uses: 1 }` resource with no meaningful reset — a misleading trace that describes the wrong model.

### Proposed widening

Add a `passive` family to `ClassFeatureMechanics`:

```typescript
export type ClassFeaturePassiveMechanics = {
  readonly family: "passive";
  readonly effect: ClassFeaturePassiveEffect;  // see Gap 2
};

export type ClassFeatureMechanics =
  | ClassFeatureActivationMechanics
  | ClassFeaturePassiveMechanics;
```

A `passive` family covers features whose effect is a permanent state change applied when the feature is acquired at a specific class level. There is no action taken by the player to "use" the feature; it is simply always in effect.

### Pressure

At minimum, every class has one or more capstone passive features in SRD 5.2.1:
- Barbarian L20: Primal Champion (Str +4, Con +4)
- Monk L20: Body and Mind (Dex +4, Wis +4)

These form a natural family of "permanent ability score capstone" features. Additional passive features exist at other levels (e.g., passive movement or sense grants).

---

## Gap 2 — Missing atom: `modify_ability_score`

### Problem

The only `ClassFeatureEffect` variants are:

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

Body and Mind's sole mechanical content is permanently increasing Dexterity and Wisdom by 4 (capped at 25). Neither existing variant can represent this:

- `grant_extra_action` — action economy; wrong domain entirely
- `heal_hp` — HP restoration; wrong domain entirely

### Proposed atom

Add `modify_ability_score` to the effect atom inventory and to `ClassFeatureEffect` (or the new `ClassFeaturePassiveEffect`):

```typescript
export type ModifyAbilityScoreEffect = {
  readonly kind: "modify_ability_score";
  readonly ability: Ability;           // "dex" | "wis" | etc.
  readonly delta: number;              // +4
  readonly maximum?: number;           // 25
};
```

Two instances would represent Body and Mind (one for Dex, one for Wis).

### v4 taxonomy note

The taxonomy (section 12, Known Remaining Weak Spots) already acknowledges this gap:

> `modify_ability_score` as a runtime effect versus as pre-runtime character state (currently treated as out-of-scope)

Body and Mind applies at a discrete character-level milestone (L20) and the modified score feeds into downstream computations (AC via Unarmored Defense, Stunning Strike save DC via Wis, etc.). For the engine to be correct, it must track the modified scores — which makes this a core-mechanics concern, not merely a narrative label.

---

## Proposed surface shape (illustrative — requires both gaps closed)

```typescript
// Hypothetical — illustrates the shape once gaps are closed:
{
  kind: "class_feature",
  id: "monk_body_and_mind_l20",
  name: "Body and Mind",
  className: "monk",
  acquiredAtLevel: 20,
  provenance: { kind: "srd-5.2.1", section: "Classes/Monk#Level 20: Body and Mind" },
  description: "...",
  mechanics: {
    family: "passive",  // Gap 1
    effects: [
      { kind: "modify_ability_score", ability: "dex", delta: 4, maximum: 25 },  // Gap 2
      { kind: "modify_ability_score", ability: "wis", delta: 4, maximum: 25 }   // Gap 2
    ]
  }
}
```

---

## Classification

| Gap | Classification |
|---|---|
| No `passive` family for `ClassFeatureMechanics` | `structural_widening` |
| No `modify_ability_score` atom/effect variant | `atom_widening` |

Overall verdict: **`structural_widening`** (the family gap is the blocking issue; the atom gap is a co-requisite).
