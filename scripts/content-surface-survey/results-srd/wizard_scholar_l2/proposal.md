# Proposal: wizard_scholar_l2 — structural widening

## Unit

**Scholar (Wizard L2)** — SRD 5.2.1, `Classes/Wizard#Level 2: Scholar`

> While studying magic, you also specialized in another field of study. Choose one of the following skills in which you have proficiency: Arcana, History, Investigation, Medicine, Nature, or Religion. You have Expertise in the chosen skill.

## Why encoding was blocked

Scholar is a **passive, permanent class feature**. It fires once at feature acquisition and persists indefinitely. It has no activation cost, no use-count resource, and no rest-reset cadence.

The current surface type `ClassFeatureMechanics` is a single-family union:

```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
```

`ClassFeatureActivationMechanics` requires:
- `activationCost` — Scholar has none (it is not activated)
- `resource: UseCountResource` — Scholar has no quota
- `resetCadence: RestResetCadence` — Scholar never expires or recharges
- `effect: ClassFeatureEffect` — no eligible variant (see below)

Forcing Scholar into `activation` with invented values (`activationCost: free`, `uses: 1`, `resetCadence: long_rest`) would produce a false trace: the tracer would emit `use_count` and `rest_window` atoms that do not represent any real mechanic of Scholar.

## Proposed widenings

### 1. `passive_grant` family for `ClassFeatureMechanics` (structural)

A new mechanics family for class features that are conferred permanently at acquisition:

```typescript
export type ClassFeaturePassiveGrantMechanics = {
  readonly family: "passive_grant";
  readonly effect: ClassFeatureEffect;  // or a wider union
};
```

**Pressure cases:** Scholar, Expertise (bard L2, ranger L9, rogue L1), Jack of All Trades, Unarmored Defense, Fighting Style passive bonuses, species traits (Darkvision, Keen Senses), and many feat passive effects. This is a high-recurrence pattern.

**Graph shape:** `class_feature_root → activate (or a new "grant" procedure atom) → effect`. No `use_count`, no `rest_window`, no quota atoms.

### 2. `GrantExpertiseEffect` variant of `ClassFeatureEffect` (surface widening)

```typescript
export type GrantExpertiseEffect = {
  readonly kind: "grant_expertise";
  readonly skill: SkillName;  // or "chosen_at_acquisition" for player-choice features
};
```

The v4 atom inventory already contains `grant_proficiency`; this is a direct surface-layer wiring of that atom. The tracer would emit `grant_proficiency` (or a new `grant_expertise` atom if Expertise is modeled as distinct from base proficiency — it doubles the bonus rather than adding it from scratch).

### 3. Acquisition-time choice grammar (surface widening)

Scholar requires the player to select one skill at acquisition. No current surface type captures "choose one from a closed enumerated list at feature-acquisition time."

Analogous existing grammar: `AnchoredFilter { kind: "creature_exemption_list"; chosenAtCast: true }` for Alarm. A parallel structure for class features:

```typescript
export type AcquisitionChoice = {
  readonly kind: "one_from_list";
  readonly options: ReadonlyArray<SkillName>;
  readonly chosenAtAcquisition: true;
};
```

This is separate from the runtime effect — it governs what the feature is parameterized with at character-building time, not what happens during play.

## Recurrence

All three widenings have strong multi-unit pressure:

| Widening | Other units requiring it |
|---|---|
| `passive_grant` family | Expertise (bard, ranger, rogue), Fighting Style, Unarmored Defense, Darkvision, Keen Senses, Jack of All Trades, Alert feat, countless others |
| `GrantExpertiseEffect` | Expertise (bard L2), Expertise (ranger L9), Expertise (rogue L1), Reliable Talent (adjacent), Jack of All Trades (adjacent) |
| Acquisition-time choice | Magic Initiate feat (spell choice), Fighting Style (fighting style choice), any feature with a permanent menu selection |

## Recommendation

Implement `passive_grant` family first — it unblocks the broadest set of features. Wire `grant_proficiency`/`grant_expertise` into `ClassFeatureEffect` second. Acquisition-time choice grammar can be deferred unless a feature whose core mechanic depends on parameterization is encountered.
