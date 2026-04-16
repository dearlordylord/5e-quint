# Proposal: Widening Required for `sorcerer_metamagic_l2`

**Outcome:** `structural_widening`

## Unit

- **Name:** Metamagic (sorcerer L2)
- **Kind:** `class_feature`
- **Source:** SRD 5.2.1 — Classes/Sorcerer#Level 2: Metamagic

## Why the current surface cannot encode this unit

Metamagic is a **passive option-grant** — not an activated ability. The only existing
`ClassFeatureMechanics` family is `activation`, which requires three fields that
categorically do not apply:

| Required field | What `activation` assumes | What Metamagic actually is |
|---|---|---|
| `activationCost` | Player spends a quota (free, bonus action, etc.) to activate the feature | No activation; options are permanently known and used at spell-cast time |
| `resource: UseCountResource` | Per-feature integer pool with `cap` + `resetCadence` | Sorcery Points — a shared pool defined by a different feature (Font of Magic) |
| `resetCadence` | Pool refills on Short/Long Rest | Options are permanent knowledge; no reset |

Additionally, `ClassFeatureEffect` only covers `grant_extra_action` and `heal_hp`. The
Metamagic effect — granting access to N spell-modifying options from a menu — has no
representation.

## Gap 1 — Missing family: `option_grant` (or `passive_grant`)

**Evidence:**
> "you gain two Metamagic options of your choice from 'Metamagic Options' later in
> this class's description"

The feature grants permanent access to N choices from a closed menu. No existing
`ClassFeatureMechanics` family models this shape. A new family is required:

```typescript
// Sketch — not a final proposal
export type ClassFeatureOptionGrantMechanics = ClassFeatureOptionGrantHeader & {
  readonly family: "option_grant";
  readonly pool: string;           // reference to the point-pool resource (e.g. "sorcery_points")
  readonly optionSetId: string;    // reference to the named menu (e.g. "metamagic_options")
  readonly count: ThresholdTiers<number> | { readonly kind: "fixed"; readonly count: number };
};
```

The `option_grant` family would emit a `grant_spell_access`-adjacent atom for the
tracer — or, if the modifiers are not spells, a new v4 atom `grant_modifier_access`.

## Gap 2 — Missing resource type: `point_pool` (cross-feature shared pool)

**Evidence:**
> "To use an option, you must spend the number of Sorcery Points that it costs."

Sorcery Points are established by **Font of Magic** (sorcerer L2, a sibling feature).
Metamagic draws from that same pool. `UseCountResource` is per-feature and
self-contained: it carries its own `cap` and `resetCadence`. There is no way to
express "this feature references an externally-defined numeric pool."

A `point_pool` resource reference type is needed so that multiple features can declare
a shared pool and draw from it without duplicating cap/reset data:

```typescript
// Sketch
export type PointPoolResource = {
  readonly kind: "point_pool";
  readonly poolId: string;         // e.g. "sorcery_points" — defined by Font of Magic
};
```

This same gap will recur for other shared-pool features (Monk Focus Points,
Warlock Pact Magic charges reused by invocations, etc.).

## Gap 3 — Missing `ClassFeatureEffect` variant: `grant_option_set`

**Evidence:**
> "You gain two more options at Sorcerer level 10 and two more at Sorcerer level 17."

Even if a suitable family existed, the effect of this feature is not representable.
`ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect`. The needed variant:

```typescript
// Sketch
export type GrantOptionSetEffect = {
  readonly kind: "grant_option_set";
  readonly optionSetId: string;
  readonly count: ThresholdTiers<number>;  // 2 → 4 (L10) → 6 (L17)
};
```

This is closely related to Gap 1 but is separable: even if the family existed, the
effect type must be widened.

## Classification of each gap

| Gap | Narrowest classification |
|---|---|
| Missing `option_grant` family | `structural_widening` |
| Missing cross-feature `point_pool` resource | `structural_widening` |
| Missing `grant_option_set` effect variant | `surface_widening` (if family existed) |

The binding classification is **`structural_widening`** because the family is absent.

## Scope note

This proposal covers only the **Metamagic feature** (the L2 grant). The individual
Metamagic options (Careful Spell, Distant Spell, Empowered Spell, Extended Spell,
Heightened Spell, Quickened Spell, Subtle Spell, Twinned Spell) are separate units.
Each option's mechanic (how it modifies a spell) will require its own encoding pass and
may reveal additional surface gaps in spell-modification atoms.
