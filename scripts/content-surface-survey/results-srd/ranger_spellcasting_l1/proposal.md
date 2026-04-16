# Proposal: Widening for Spellcasting (Ranger L1)

## Outcome: `structural_widening`

No existing `ClassFeatureMechanics` family can honestly encode this unit.

---

## Why the `activation` family fails

The only existing `ClassFeatureMechanics` family is `activation`
(`ClassFeatureActivationMechanics`). It requires:

| Field | What it needs | What Ranger Spellcasting provides |
|---|---|---|
| `activationCost` | A discrete activation trigger (`free` or `bonus_action`) | None — the feature is always-on and passive |
| `resource: UseCountResource` | A per-use integer cap | Not applicable — spell slots are a separate pool, not a use-count on the feature itself |
| `effect: ClassFeatureEffect` | `grant_extra_action` or `heal_hp` | Neither — the effect is unlocking a spellcasting system |

Forcing this into `activation` would require fabricating all three fields. The
resulting trace would misrepresent the feature's actual mechanics.

---

## What the unit actually requires

### 1. New `ClassFeatureMechanics` family: `spellcasting_grant`

Spellcasting class features are **passive system grants** — they permanently
unlock a spellcasting system on the character. They do not have:
- A discrete activation trigger
- A per-use quota

They do have:
- A spell slot schedule (class-level → slot counts per spell level)
- A prepared-spell list (class-specific, size scales by class level)
- A spellcasting ability
- A spellcasting focus option
- A slot reset cadence (Long Rest for Ranger)

A `spellcasting_grant` family would carry these fields and produce atom traces
involving `spell_slot` (resource), `grant_spell_access` (effect), and `persist`
+ `expire` (lifecycle — slot pool persists until exhausted and refreshes on
Long Rest).

### 2. New `ClassFeatureEffect` variant: `grant_spell_access`

The v4 atom `grant_spell_access` exists in the Effect Atoms section of the
taxonomy (TAXONOMY_atoms_graph.md §9) but has no corresponding variant in
`ClassFeatureEffect` in `types.ts`. A new variant is needed:

```typescript
export type GrantSpellAccessEffect = {
  readonly kind: "grant_spell_access";
  readonly spellList: ClassName;          // "ranger" — the class spell list
  readonly spellcastingAbility: Ability;  // "wis"
  readonly preparedCountSchedule: ...;   // scales by class level (see below)
  readonly focus?: string;               // "Druidic Focus"
};
```

### 3. New surface type: `SpellSlotSchedule`

Spell slot allocation is a **2D table**: for each class level, a count of slots
at each spell level (L1, L2, ..., L5 for Ranger). This cannot be expressed as
`UseCountResource` (a single integer cap) or `ThresholdTiers<number>` (a single
value per tier).

```typescript
// Illustrative shape — not a proposal for the exact field names
export type SpellSlotSchedule = {
  readonly axis: "class";
  readonly tiers: ReadonlyArray<{
    readonly atLevel: number;
    readonly slots: ReadonlyArray<number>; // index = spell level - 1
  }>;
};
```

The Ranger slot schedule (SRD 5.2.1 Ranger Features table) starts at L1 with
[2] (two 1st-level slots) and adds higher-level slots at L5 (L2), L9 (L3),
L13 (L4), L17 (L5).

---

## Scope of the gap

All class-level spellcasting features share this structural gap:

- `bard_spellcasting_l1`
- `cleric_spellcasting_l1`
- `druid_spellcasting_l1`
- `paladin_spellcasting_l1`
- `ranger_spellcasting_l1`
- `sorcerer_spellcasting_l1`
- `wizard_spellcasting_l1`

(Warlock's `pact_magic_l1` is similar but uses a different slot recovery
mechanic — Short or Long Rest — and may warrant a variant.)

A single `spellcasting_grant` family addition would unlock all of these.

---

## Atom graph sketch for this unit

```
class_feature_root (ranger_spellcasting_l1)
  └─roots─> [spellcasting_grant procedure]
               ├─grants─> spell_slot (L1 ×2, scales by class level)
               │             └─persists_until─> rest_window (long)
               ├─grants─> grant_spell_access
               │             (list: ranger, ability: wis, focus: Druidic Focus)
               │             └─persists_until─> rest_window (long, for prepared-spell swap)
               └─[no activation cost, no use_count on the feature itself]
```

---

## SRD evidence

> **Spell Slots.** The Ranger Features table shows how many spell slots you
> have to cast your level 1+ spells. You regain all expended slots when you
> finish a Long Rest.

> **Prepared Spells of Level 1+.** You prepare the list of level 1+ spells
> that are available for you to cast with this feature. To start, choose two
> level 1 Ranger spells.

> **Spellcasting Ability.** Wisdom is your spellcasting ability for your
> Ranger spells.

> **Spellcasting Focus.** You can use a Druidic Focus as a Spellcasting Focus
> for your Ranger spells.

Provenance: SRD 5.2.1, `Classes/Ranger.md`, heading "Level 1: Spellcasting".
