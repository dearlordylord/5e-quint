# Proposal: `monk_epic_boon_l19` — structural_widening

## Unit

**Name:** Epic Boon (monk L19)  
**Kind:** `class_feature` / monk / acquired at level 19  
**Source:** SRD 5.2.1 — Classes/Monk#Level 19: Epic Boon

> You gain an Epic Boon feat (see "Feats") or another feat of your choice for which you qualify. Boon of Irresistible Offense is recommended.

---

## Why the unit does not fit

The only available `ClassFeatureMechanics` family is `"activation"`, whose header shape is:

```typescript
type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;   // free | bonus_action
  readonly resource: UseCountResource;                   // use_count with a cap
  readonly resetCadence: RestResetCadence;               // short/long/partial...
};
```

Epic Boon is a **permanent one-time acquisition** at character level 19. It is not:
- activated during play (no `activationCost`)
- gated by a use pool (no `resource` / `use_count`)
- replenished by a rest (no `resetCadence`)

The header is structurally inapplicable. Encoding would require fabricating values (`use_count: fixed(0)`, arbitrary `resetCadence`) that carry no semantic content and would produce a misleading trace graph.

---

## Proposed widenings

### 1. New mechanics family: `permanent_grant`

A new `ClassFeatureMechanics` variant for features that permanently modify the character sheet at a specific class level — requiring no activation, no resource, and no rest reset.

```typescript
export type PermanentGrantMechanics = {
  readonly family: "permanent_grant";
  readonly grant: PermanentGrantEffect;
};
```

**Why not re-use `activation`:** The activation family is designed for features the player invokes during play (Action Surge, Second Wind, Channel Divinity). Epic Boon and all ASI entries are class-progression milestones — they fire exactly once at level-up and require no further player action in combat.

**Scope:** This pattern recurs for every Ability Score Improvement and Epic Boon entry across all 12 classes (barbarian L4/L8/L12/L16/L19, bard L4/L8/L12/L16/L19, …). The widening resolves a large pending backlog in a single addition.

### 2. New effect atom: `grant_feat`

The v4 effect inventory has `grant_proficiency` and `grant_spell_access` but no `grant_feat`. A `PermanentGrantEffect` would require this atom.

```typescript
export type GrantFeatEffect = {
  readonly kind: "grant_feat";
  // Category constraint (e.g. "epic_boon" restricts to Epic Boon feats).
  // null = any feat the character qualifies for.
  readonly category: "epic_boon" | null;
  // Optional recommendation (authoring hint, not a mechanical constraint).
  readonly recommended?: string;
};
```

For the feat-choice pattern the tracer would emit a `grant_feat` effect node (category: "epic_boon") hanging off a `class_feature_root` via the `permanent_grant` procedure atom.

### 3. Supporting procedure atom: `grant` (already in v4)

v4 already has the `grant` procedure atom. The `permanent_grant` family would use it to model "class feature root → grant → grant_feat effect". No new procedure atom is needed.

---

## Minimum shape for honest encoding

```typescript
export type GrantFeatEffect = {
  readonly kind: "grant_feat";
  readonly category: "epic_boon" | null;
  readonly recommended?: string;
};

export type PermanentGrantMechanics = {
  readonly family: "permanent_grant";
  readonly grant: GrantFeatEffect;   // widen to union as more grant types land
};

export type ClassFeatureMechanics =
  | ClassFeatureActivationMechanics
  | PermanentGrantMechanics;         // new
```

With this widening, `monk_epic_boon_l19.dhall` would encode as:

```dhall
{ family = "permanent_grant"
, grant =
    { kind = "grant_feat"
    , category = Some "epic_boon"
    , recommended = Some "boon_of_irresistible_offense"
    }
}
```

---

## Notes

- The recommended feat (Boon of Irresistible Offense) has its own mechanical content (attack-roll criticals, STR/DEX increase, bypassing resistance). That feat would be encoded separately as a `feat` record, not here.
- All `Ability Score Improvement` class features (which offer "feat or +2 ability score") are structurally identical to Epic Boon at the class-feature surface level — they are all `permanent_grant` + `grant_feat` (category: null). The same widening resolves all of them.
- This is not `atom_widening` alone: the missing concept requires both a new surface family shape (`permanent_grant`) and a new v4 atom (`grant_feat`), hence `structural_widening` is the correct classification.
