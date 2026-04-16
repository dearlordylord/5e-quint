# Proposal: Structural Widening for Spellcasting Class Features

**Unit:** Spellcasting (druid L1)  
**Outcome:** `structural_widening`  
**Provenance:** SRD 5.2.1, Classes/Druid#Level 1: Spellcasting

---

## Why the unit doesn't fit

The current `ClassFeatureMechanics` union has exactly one family: `activation`. That family models features that:
1. Are triggered by the player (have an `activationCost`)
2. Consume a tracked use_count resource (with a cap and a reset cadence)
3. Produce exactly one effect: `grant_extra_action` or `heal_hp`

Druid Spellcasting is a **passive infrastructure grant**. It has no activation event, no use_count, and it grants a multi-part spellcasting framework rather than a single combat effect. Encoding it as `activation` would require fabricating:
- An `activationCost` that doesn't exist
- A `use_count` cap that doesn't exist (spell slots are not a use_count)
- An `effect` of `grant_extra_action` or `heal_hp` — both wrong

This is dishonest encoding and would produce a misleading trace.

---

## Gap 1 — Missing `ClassFeatureMechanics` family: `grant_spellcasting`

A new mechanics family is needed for features that passively grant the entire spellcasting framework. This family would have no `activationCost` (it's passive) and would replace the `activation` pattern entirely for this unit class.

Sketch of the proposed shape:

```typescript
export type GrantSpellcastingMechanics = {
  readonly family: "grant_spellcasting";
  readonly spellcastingAbility: Ability;
  readonly slotTable: SpellSlotTable;           // see Gap 2
  readonly cantrips: CantripPool;              // see Gap 3
  readonly preparedSpells: PreparedSpellList;  // see Gap 4
  readonly focus?: SpellcastingFocusKind;
};
```

This covers all full-caster and half-caster Spellcasting features (druid, cleric, bard, sorcerer, wizard, paladin, ranger; warlock's Pact Magic is a variant with different slot mechanics).

---

## Gap 2 — Missing surface shape: spell slot table resource

Spell slots are a two-dimensional resource:
- **Outer dimension:** spell slot level (1–9, class-dependent)
- **Inner dimension:** count of slots at each level, scaling by class level per a class-specific table

`UseCountResource` with a `threshold_tiers` cap models a single integer that steps at class level thresholds. It cannot represent a full slot table (e.g., "at Druid L3: 4×L1, 2×L2").

Proposed shape (minimum viable):

```typescript
export type SpellSlotTable = {
  readonly kind: "class_slot_table";
  readonly axis: "class";
  readonly resetCadence: { readonly kind: "long_rest" };
  // Rows indexed by class level; each row lists slot counts per slot level.
  // Exact representation TBD (could be ThresholdTiers<ReadonlyArray<number>>).
};
```

SRD evidence: *"The Druid Features table shows how many spell slots you have to cast your level 1+ spells. You regain all expended slots when you finish a Long Rest."*

---

## Gap 3 — Missing `ClassFeatureEffect` variant: cantrip pool

Cantrips are at-will known spells. Their count is fixed at class L1 (2), then increases at class levels 4 and 10 (threshold_tiers<number> on the `class` axis). This is distinct from spell slots and from prepared spells.

The v4 taxonomy already has the atom `grant_spell_access`, but `ClassFeatureEffect` in `types.ts` has no variant for it. A new variant is needed:

```typescript
export type GrantCantripPoolEffect = {
  readonly kind: "grant_cantrip_pool";
  readonly source: "class_spell_list";
  readonly count: ThresholdTiers<number>;   // 2 base, +1 at L4, +1 at L10
};
```

SRD evidence: *"You know two cantrips of your choice from the Druid spell list. [...] When you reach Druid levels 4 and 10, you learn another cantrip of your choice."*

---

## Gap 4 — Missing surface shape: prepared spell list

Prepared spells are a distinct concept from known cantrips and from spell slots:
- A **count** of spells that can be prepared (scales by class level per the class table)
- Source: any Druid spell for which the druid has slots
- The entire list can be **replaced on a Long Rest**

This is not a `use_count`, not a cantrip pool, and not a slot table. It needs its own shape:

```typescript
export type PreparedSpellList = {
  readonly kind: "prepared_spell_list";
  readonly source: "class_spell_list";
  readonly countAxis: "class";
  // count expression referencing class table — could be LinearPerLevel<number> or ThresholdTiers<number>
  readonly replaceOn: { readonly kind: "long_rest" };
};
```

SRD evidence: *"Whenever you finish a Long Rest, you can change your list of prepared spells, replacing any of the spells with other Druid spells for which you have spell slots."*

---

## Cross-class applicability

The same `grant_spellcasting` family and associated shapes would cover:
- Cleric Spellcasting L1 (Wisdom, slot table, prepared list — same pattern)
- Bard Spellcasting L1 (Charisma, slot table, known spells — variant: known not prepared)
- Sorcerer Spellcasting L1 (Charisma, slot table, known spells)
- Wizard Spellcasting L1 (Intelligence, slot table, spellbook/prepared list)
- Paladin Spellcasting L1 (Charisma, half-caster slot table, prepared list)
- Ranger Spellcasting L1 (Wisdom, half-caster slot table, known spells)
- Warlock Pact Magic L1 (Charisma, pact slot table — different reset cadence: Short or Long Rest)

Warlock's Pact Magic differs in reset cadence and slot count mechanics; it may need a `grant_pact_magic` sibling or a variant parameter on `grant_spellcasting`.

---

## Summary of required widenings

| Kind | Name | Blocking? |
|------|------|-----------|
| `new_subgraph` | `grant_spellcasting` family under `ClassFeatureMechanics` | Yes — no family fits |
| `new_variant` | `SpellSlotTable` resource shape | Yes — `UseCountResource` can't model it |
| `new_variant` | `grant_cantrip_pool` in `ClassFeatureEffect` | Yes — no effect variant exists |
| `new_variant` | `PreparedSpellList` surface shape | Yes — no shape exists |

All four gaps must be resolved before any Spellcasting class feature can be encoded cleanly.
