# Proposal: Widening for `druid_druidic_l1`

## Outcome: `structural_widening`

Druidic cannot be honestly encoded in the current surface because no existing `ClassFeatureMechanics` family fits a passive always-on feature.

---

## Gap 1 — Missing `passive` family in `ClassFeatureMechanics`

**Current state:** `ClassFeatureMechanics = ClassFeatureActivationMechanics`, which is the single family `"activation"`. Every class feature record must supply `activationCost`, `resource` (use_count), and `resetCadence`.

**What Druidic requires:** Druidic is not activated. The druid simply knows the language and always has the spell prepared from the moment they acquire the feature. There is no action to take, no resource to spend, and no rest that refills anything.

**Proposed addition:**

```typescript
export type ClassFeaturePassiveMechanics = {
  readonly family: "passive";
  readonly effects: ReadonlyArray<ClassFeatureEffect>;
};

export type ClassFeatureMechanics =
  | ClassFeatureActivationMechanics
  | ClassFeaturePassiveMechanics;
```

This family handles features that are always-on grants: known languages, always-prepared spells, passive proficiency grants, passive sense grants, etc.

---

## Gap 2 — Missing `grant_spell_access` variant in `ClassFeatureEffect`

**Current state:** `ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect`. The v4 atom inventory includes `grant_spell_access` as an effect atom, but `ClassFeatureEffect` has no corresponding surface variant.

**What Druidic requires:** "you always have the *Speak with Animals* spell prepared" is a spell-access grant — the spell is added to the druid's always-prepared list without consuming a prepared-spell slot.

**Proposed addition:**

```typescript
export type GrantSpellAccessEffect = {
  readonly kind: "grant_spell_access";
  readonly spellId: string;
  readonly mode: "always_prepared";
};

export type ClassFeatureEffect =
  | GrantExtraActionEffect
  | HealHpEffect
  | GrantSpellAccessEffect;
```

---

## Components not modeled (out-of-core)

### Language knowledge
"You know Druidic, the secret language of Druids." — This is pure character-state (a known language). There is no v4 atom for language knowledge. It has no combat/resolution consequence and is appropriately out-of-core.

### Hidden message mechanic
"Others spot the message's presence with a successful DC 15 Intelligence (Investigation) check but can't decipher it without magic." — The DC check is made by OTHER creatures, not the druid. It is DM-adjudicated and has no deterministic in-combat resolution. This component is `dm_agenda` — the message-leaving has no combat consequence, and the Investigation check is outside the combat resolution graph.

---

## Tracer impact

Once the `passive` family and `grant_spell_access` effect are added, the tracer would need a new branch in `traceClassFeatureMechanics` for `"passive"` and a new case in `traceClassFeatureEffect` for `"grant_spell_access"`. The emitted graph would use:

- `class_feature_root` → `grant_spell_access` (attaches via `grants`)
- Atom kind: `grant_spell_access` (exists in v4 taxonomy)
