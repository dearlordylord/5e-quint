# Proposal: Hat of Many Spells — atom_widening

## Summary

The Hat of Many Spells cannot be honestly authored in the current surface. Both of its properties require atoms or surface variants that do not exist. Six distinct gaps are identified.

---

## Property 1: Spellcasting Focus

> *"While holding the hat, you can use it as a Spellcasting Focus for your Wizard spells."*

**Gap:** No atom exists for "grant spellcasting focus capability." The passive `grants` array accepts `EffectAtom` values, but there is no `grant_spellcasting_focus` atom in the v4 taxonomy or in `types.ts`.

**Proposed atom:**
```typescript
| {
    readonly kind: "grant_spellcasting_focus";
    readonly classFilter?: ClassName; // "wizard" here
  }
```

This atom is scoped by an optional class (the item's text specifies "your Wizard spells"). Multiple SRD items serve as spellcasting foci — Arcane Focus, various wands, staffs, rods — so this atom has broad surface pressure beyond this item.

The somatic component flavor ("reach into the hat and pull the spell out") is roleplay/DM-owned and requires no atom.

---

## Property 2: Unknown Spell

This property has three independent gaps that collectively prevent honest authoring.

### Gap A: Open-ended class-list spell selection

> *"you can try to cast a level 1+ spell you don't know. The spell must be on the Wizard spell list, it must be of a level you can cast, and it can't have Material components costing more than 1,000 GP."*

`grant_spell_access` requires a fixed `spellId`. The Unknown Spell mechanic selects from the entire Wizard spell list at activation time, subject to level and material-cost constraints. This is not a grant of any specific spell — it is an open-ended bounded selection from a class list.

**Proposed atom or subgraph:**

A new atom `attempt_class_list_spell` (or equivalent subgraph) that expresses:
- Which class spell list the selection draws from
- The level bounds (1 to caster's maximum castable level)
- An optional material-component cost ceiling

The spell slot expenditure comes from the caster's own pool matching the chosen spell's level — this is distinct from `charge_cast` (which draws from the item's charge pool).

### Gap B: Dynamic DC

> *"make an Intelligence (Arcana) check (DC 10 plus the spell's level)"*

`DcSource` has four variants: `caster_spell_save_dc`, `fixed`, `weapon_attack_dc`, `innate_dc`. None expresses a DC derived from the chosen spell's level at activation time.

**Proposed variant:**
```typescript
| {
    readonly kind: "spell_level_plus_base";
    readonly base: number; // 10 here
  }
```

This DC source is uniquely tied to a spell-selection mechanic — it resolves against whatever spell level was chosen in the same activation phase.

### Gap C: "Cast the chosen spell" on check success

On a successful check, the spell is cast normally. There is no existing atom for "cast the spell selected in the preceding step." The success branch of `ability_check_gate` accepts an `EffectAtom`, but no atom expresses "resolve the open-ended spell selection made earlier in this activation."

This likely needs to be modeled as a distinct resolution node — either an extension of the `attempt_class_list_spell` atom or a new relation (`triggers_spell_cast`) that completes the open-ended selection.

---

## Failure Table Issues

The 1d100 failure table is conceptually reachable via the existing `random_table` phase shape with nested `random_table` phases for the 1d10 sub-roll (outcomes 01-50). However, several entries inside the table require atoms or are dm_agenda:

### Uncontrolled creature spawn (81–85, 86–90)

> *"The creature isn't under your control and acts as it normally would"*

`SpawnedCreaturePayload` requires a `CreatureControl` block. There is no valid `control` value for an uncontrolled hostile spawn. A new variant is needed:

```typescript
export type SpawnedCreatureControl = CreatureControl | { readonly kind: "uncontrolled" };
```

The 86-90 entry (Hostile Swarm of Bats) additionally spawns the creature in the caster's own space targeting the caster — a hostile-disposition spawn distinct from a neutral uncontrolled creature.

### Conditions with standalone timed durations (51–55, 66–70, 71–75)

> *"Poisoned condition for 1 hour" / "Petrified condition until the end of your next turn"*

`apply_condition` has no duration field. In a spell's `ongoing_effect` family the condition lasts until the spell ends; in an `activation` family the duration is instantaneous and conditions must carry their own expiry. A duration field on `apply_condition` (or a wrapper atom) is needed:

```typescript
| {
    readonly kind: "apply_condition";
    readonly condition: Condition | ...;
    readonly duration?: Duration; // standalone timed duration for activation context
  }
```

### Plane portal (91–95)

> *"A two-way portal to another plane of existence opens ... The GM determines where it leads."*

`transport_exile` moves the caster to another plane. This outcome creates an environmental portal object — a world-space artifact distinct from creature relocation. The GM determines the destination, making this partly `dm_agenda`. A new atom (`create_plane_portal`) would be needed for the portal-creation side; the destination remains caller/GM-owned.

### GM-chosen magic item (96–00)

> *"The GM chooses the item"*

This is `dm_agenda`. The item's rarity is rolled (1d6), but selection is GM-determined and cannot be expressed as a mechanical atom.

### Harmless butterfly swarm (56–60) and pulled nonmagical objects (61–65, 76–80)

The butterfly swarm is narrative/dm_agenda. The nonmagical objects could potentially use `create_object` with a nested 1d4 random_table, but the specific items (vial of Acid, flask of Alchemist's Fire, Dagger, gem worth 50 GP, etc.) are catalog-references to equipment, not generic shaped objects — stretching `create_object` to cover them would be dishonest.

---

## Summary of Required Widenings

| # | Kind | Name | Pressure |
|---|------|------|----------|
| 1 | new_atom | `grant_spellcasting_focus` | Spellcasting Focus property |
| 2 | new_atom | `attempt_class_list_spell` (or subgraph) | Unknown Spell core mechanic |
| 3 | new_variant | `DcSource.spell_level_plus_base` | Dynamic DC tied to chosen spell level |
| 4 | new_variant | Uncontrolled `spawned_creature` | Failure table creature spawns |
| 5 | new_variant | `apply_condition` with standalone `duration` | Failure table timed conditions |
| 6 | new_atom | `create_plane_portal` (partial dm_agenda) | Failure table 91-95 |

Items 1, 2, 3 each independently block authoring. Items 4–6 affect the failure table only.
