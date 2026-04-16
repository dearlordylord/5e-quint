# Proposal: feat_magic_initiate — Structural Widening

## Outcome: `structural_widening`

Magic Initiate cannot be encoded. The unit is a feat; `UnitRecord` has no `feat` kind.

---

## Gap 1 (structural): No `FeatRecord` in `UnitRecord`

`UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord`.

The v4 taxonomy defines `feat_root` as a source atom (§1), but `types.ts` has no corresponding record shape. The tracer `traceUnit` switch is exhaustive over `spell | class_feature | mastery` — a feat record would fall through to the `never` branch and throw.

**Required addition:** A `FeatRecord` type in `UnitRecord` and a corresponding `FeatMechanics` family, parallel to `ClassFeatureMechanics`. The family would need at minimum a `grant_spell_access` activation variant (see Gap 2).

---

## Gap 2 (surface): No `grant_spell_access` effect

`ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect`.

The v4 atom inventory includes `grant_spell_access` (§9 Effect Atoms), but it is not surfaced in any typed effect union. Magic Initiate's primary mechanic — granting two cantrips and a prepared level-1 spell from a chosen class list — requires this effect.

**Shape sketch:**

```typescript
export type GrantSpellAccessEffect = {
  readonly kind: "grant_spell_access";
  readonly spellLevel: SpellLevel;          // 0 for cantrips
  readonly count: number;                   // how many spells granted
  readonly listConstraint: SpellListConstraint; // e.g. "cleric | druid | wizard"
  readonly prepared: boolean;               // true = always prepared
};
```

`SpellListConstraint` is itself a new surface type (a union of `ClassName` values from a chosen subset, chosen at feat acquisition).

---

## Gap 3 (surface): No `free_cast_once_per_rest` resource pattern

The Level 1 Spell benefit has a dual-access pattern:

1. One free cast per Long Rest (a `use_count` pool with `cap=1`, `resetCadence=long_rest`).
2. Unlimited casts using owned spell slots.

`UseCountResource` models a single consumable pool. The surface has no way to express "this spell may also be cast through the normal spell-slot pathway independently of the use-count." A new resource variant or a `dual_access` wrapper is needed.

**Evidence:** *"You can cast it once without a spell slot, and you regain the ability to cast it in that way when you finish a Long Rest. You can also cast the spell using any spell slots you have."*

---

## Gap 4 (surface): No build-time spellcasting ability choice

The feat requires choosing Int, Wis, or Cha as the spellcasting ability at acquisition, binding that choice to the feat's granted spells. No surface type encodes this build-time choice. `ClassFeatureActivationCost` does not carry an ability-choice; there is no analogous concept anywhere in `types.ts`.

**Evidence:** *"Intelligence, Wisdom, or Charisma is your spellcasting ability for this feat's spells (choose when you select this feat)."*

---

## Out of scope (not widenings)

- **Spell Change** — Swapping a feat spell on level-up is character-progression metadata, not a deterministic in-combat mechanic. Authoring annotation only.
- **Repeatable** — Taking the feat multiple times with different lists is also build-time metadata. Authoring annotation only.

---

## Suggested widening order

1. Add `FeatRecord` + `FeatMechanics` (structural — blocks everything else).
2. Add `grant_spell_access` to `FeatMechanicsEffect` (required for this feat and any spell-granting feat).
3. Add `free_cast_once_per_rest` resource variant (required for the Level 1 Spell benefit).
4. Add `spellcasting_ability_choice` build-time binding (required for spellcasting-ability feats).
