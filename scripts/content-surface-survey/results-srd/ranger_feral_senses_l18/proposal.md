# Proposal: Feral Senses (Ranger L18)

## Outcome: `structural_widening`

Feral Senses cannot be encoded honestly in the current surface.

---

## Unit

> **Level 18: Feral Senses**
> Your connection to the forces of nature grants you Blindsight with a range of 30 feet.

This is a **permanent passive sense** — it takes effect at level 18 and remains active with no activation event, no quota consumed, no use count tracked, and no rest that refills anything.

---

## Gap 1 — Missing family: `passive_grant`

`ClassFeatureMechanics` has exactly one valid family: `ClassFeatureActivationMechanics` (`family: "activation"`). That family structurally requires:

- `activationCost` — an action or bonus action consumed to trigger the feature
- `resource` — a `UseCountResource` tracking charges
- `resetCadence` — a rest event that refills those charges
- `effect` — what fires when activated

None of these fields have any meaning for Feral Senses. There is no activation event, no charges, no refill cadence. Populating them with placeholder values (e.g., `activationCost: { kind: "free" }`, `resource: { kind: "use_count", cap: { kind: "fixed", uses: 1 } }`, `resetCadence: { kind: "long_rest" }`) would produce a trace that lies about the rule.

**Proposed addition:**

```typescript
export type ClassFeaturePassiveMechanics = {
  readonly family: "passive_grant";
  readonly effect: ClassFeatureEffect;  // or a dedicated PassiveEffect union
};

export type ClassFeatureMechanics =
  | ClassFeatureActivationMechanics
  | ClassFeaturePassiveMechanics;
```

The `passive_grant` family needs no activation cost, no resource, and no reset cadence. It represents features that are permanently active from the level they are acquired. The tracer subgraph for this family would be:

```
class_feature_root → roots → passive_grant (procedure atom)
passive_grant → grants → <effect>
<effect> → attaches_to → self
```

---

## Gap 2 — Missing variant: `grant_sense` in `ClassFeatureEffect`

Even with a `passive_grant` family, the current `ClassFeatureEffect` union offers only:

- `grant_extra_action` — wrong
- `heal_hp` — wrong

Blindsight is a **sense** with a typed range. The v4 atom inventory already names `grant_sense` as an Effect atom (§9. Effect Atoms), so the atom is not novel — it simply has no corresponding surface type variant.

**Proposed addition:**

```typescript
export type SenseKind = "blindsight" | "darkvision" | "tremorsense" | "truesight";

export type GrantSenseEffect = {
  readonly kind: "grant_sense";
  readonly sense: SenseKind;
  readonly rangeFeet: number;
};

export type ClassFeatureEffect =
  | GrantExtraActionEffect
  | HealHpEffect
  | GrantSenseEffect;
```

---

## Precedent / related pressure

Several other features in the pipeline will likely hit the same two gaps:

- **Blindsight/Darkvision from species traits** (Dragonborn Darkvision, Dwarf Darkvision, Elf Darkvision, etc.) — these are passive permanent senses acquired at character creation; they would need `passive_grant` + `grant_sense` for any species-trait encoding pass.
- **Proficiency grants** (also passive, permanent) — suggest `passive_grant` is the right family for a broad class of always-on trait mechanics.

---

## Summary of required widenings

| # | Kind | Name | Blocker level |
|---|------|------|---------------|
| 1 | `new_subgraph` | `passive_grant` family in `ClassFeatureMechanics` | outer (structural) |
| 2 | `new_variant` | `grant_sense` in `ClassFeatureEffect` | inner (surface) |

Classification: **`structural_widening`** — the family gap is the outer blocker; the effect variant gap is a secondary dependency that would need to be resolved alongside it.
