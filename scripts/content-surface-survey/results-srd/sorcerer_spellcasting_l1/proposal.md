# Proposal: Spellcasting (sorcerer L1) — structural_widening

## Why the unit cannot be encoded honestly

The current `ClassFeatureMechanics` surface has exactly one family: `activation`. Its header mandates:

```typescript
type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;  // free | bonus_action
  readonly resource: UseCountResource;                   // use_count with fixed/tiered cap
  readonly resetCadence: RestResetCadence;
};
```

Spellcasting (sorcerer L1) is not an activated feature. There is no "use Spellcasting" action. The feature is a **passive framework** that permanently grants three distinct things:

| Sub-feature | What it grants | Existing atoms | Missing surface |
|---|---|---|---|
| Cantrips | Access to 4 cantrips, scaling to 5@L4, 6@L10 | `grant_spell_access` (v4 effect) | No `ClassFeatureEffect` variant |
| Spell Slots | Leveled slot pool (table-driven) resetting on long rest | `spell_slot` (v4 resource) | No surface type for leveled slot pool |
| Prepared Spells | Scaling prepared list (2@L1 → 15@L20) | `grant_spell_access` (v4 effect) | No `ClassFeatureEffect` variant |
| Spellcasting Ability | CHA designates spell save DC / attack | — | No surface type for ability designation |
| Spellcasting Focus | Arcane Focus substitutes material components | — | Out-of-core per ARCHITECTURE.md |

Forcing this into the `activation` family would require fabricating an `activationCost`, a `UseCountResource`, and a `resetCadence` — none of which correspond to real mechanics. That would produce a misleading trace.

---

## Proposed widenings

### 1. New `ClassFeatureMechanics` family: `passive_grant` (structural)

A new family for class features that are always-on grants rather than activated abilities:

```typescript
export type ClassFeaturePassiveGrantMechanics = {
  readonly family: "passive_grant";
  readonly grants: ReadonlyArray<ClassFeaturePassiveGrant>;
};

export type ClassFeatureMechanics =
  | ClassFeatureActivationMechanics
  | ClassFeaturePassiveGrantMechanics;
```

This family has no `activationCost`, no `resource`, no `resetCadence` at the top level — those belong to the individual grants when relevant.

**Pressure:** Every spellcasting class feature (bard, cleric, druid, paladin, ranger, sorcerer, warlock, wizard spellcasting) lands here. This is not a narrow case.

---

### 2. New `ClassFeatureEffect` variant: `grant_spell_access`

Model the cantrip known count and prepared spell list grant:

```typescript
export type GrantSpellAccessEffect = {
  readonly kind: "grant_spell_access";
  readonly spellKind: "cantrip" | "leveled";
  readonly source: "class_spell_list";
  readonly initialCount: number;
  readonly scaling?: ThresholdTiers<number>;  // axis=class, for cantrip count growth
  readonly preparationMode: "known" | "prepared";
};
```

The v4 taxonomy already lists `grant_spell_access` as an effect atom. This is a surface gap only in `ClassFeatureEffect`.

---

### 3. New resource shape: `spell_slot_pool`

The slot table is not a simple `use_count` — it is a **leveled pool** where casting a level-3 spell consumes a level-3 slot, not an arbitrary use. A dedicated resource shape is needed:

```typescript
export type SpellSlotPool = {
  readonly kind: "spell_slot_pool";
  readonly resetCadence: RestResetCadence;
  // Slot counts are defined by class level table; the surface records
  // that this feature grants the standard class slot progression.
  readonly progression: "class_table";
};
```

Alternatively, if the slot pool is treated as a systemic character resource rather than a per-feature grant, the surface needs a `ClassFeaturePassiveGrant` variant that references it:

```typescript
export type GrantSpellSlotPoolGrant = {
  readonly kind: "grant_spell_slot_pool";
  readonly resetCadence: RestResetCadence;
};
```

---

### 4. Spellcasting ability designation

`"Charisma is your spellcasting ability"` determines spell save DC and spell attack bonus. This is runtime-relevant (affects combat resolution) but is arguably pre-runtime character state (set once at character creation, not updated during combat). Two options:

**Option A** — Model as a `ClassFeaturePassiveGrant` variant:
```typescript
export type SetSpellcastingAbilityGrant = {
  readonly kind: "set_spellcasting_ability";
  readonly ability: Ability;  // "cha"
};
```

**Option B** — Treat as pre-runtime character state (per ARCHITECTURE.md §"out-of-scope for the core mechanics graph") and omit from the surface. Record in the description only.

Option B is defensible; the ability designation does not change during play and is already captured in the character's stat block. The tracer does not need to model it as a graph atom unless a downstream use case requires it.

---

## Scope of the gap

This structural gap affects **all 9 full-caster spellcasting features** in the SRD 5.2.1 class list, plus half-caster (paladin, ranger) and the warlock's `pact_magic` variant. Any encoding pass over these units will hit this same wall until the `passive_grant` family is added.

The `activation` family should remain unchanged — it correctly models Second Wind, Action Surge, Channel Divinity, etc.

---

## Recommended sequencing

1. Add `ClassFeaturePassiveGrantMechanics` family with a `grants` array.
2. Add `grant_spell_access` as a `ClassFeatureEffect`/grant variant.
3. Add `grant_spell_slot_pool` (or `spell_slot_pool` resource shape).
4. Decide Option A vs B for spellcasting ability designation.
5. Re-run this worker — the unit should encode cleanly after those changes.
