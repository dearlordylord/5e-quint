# Proposal: Widenings Required for Shapechange

## Outcome: `structural_widening`

Shapechange (level 9 transmutation) cannot be honestly encoded in the current content surface. Its core mechanic — adopting another creature's entire stat block while selectively retaining personal attributes — has no analog in any existing spell family or operation type.

---

## Gap 1: No `form_transformation` family (or equivalent operation)

### What the spell does

> *"Your game statistics are replaced by the stat block of the chosen form, but you retain your creature type; alignment; personality; Intelligence, Wisdom, and Charisma scores; Hit Points; Hit Point Dice; proficiencies; and ability to communicate. If you have the Spellcasting feature, you retain it too."*

The operative mechanic is **stat-block adoption with attribute retention**. The caster's attack statistics, AC, speed, senses, special actions, and ability scores (except Int/Wis/Cha) are replaced wholesale by the new creature's stat block. A specific closed list of personal attributes is preserved.

### Why the current surface cannot express this

- `ongoing_effect` requires an `OngoingOperation` of kind `roll_modifier` or `damage_on_hit`. Neither covers stat-block replacement.
- `activation` handles instant/phased resolution — it does not express persistent state that replaces the acting creature's capabilities.
- No existing effect atom covers stat-block adoption. The closest existing atom, `alter_item_kind`, applies to items, not creature forms.

### Proposed widening

A new spell family: `form_transformation`. Shape:

```
FormTransformationMechanics = SpellMechanicsHeader & {
  family: "form_transformation";
  attachment: Attachment;                  // self
  constraints: FormConstraints;            // CR cap, type exclusions, familiarity requirement
  retainedAttributes: RetainedAttributes;  // closed enum of preserved personal stats
  onAdopt: FormAdoptionEffect;             // what fires when a form is adopted
}
```

Where `FormAdoptionEffect` would include at minimum:
- `replace_stat_block` — adopt the chosen creature's stat block under the retention constraints
- `grant_temp_hp` — (see Gap 2 below)

This family is also needed for **Polymorph** (level 4, targets a willing creature/unwilling via save) and **True Polymorph** (level 9, permanent option). All three share the stat-block-adoption pattern.

---

## Gap 2: No `grant_temp_hp` effect atom

### What the spell does

> *"When you cast the spell, you gain a number of Temporary Hit Points equal to the Hit Points of the first form into which you shape-shift. These Temporary Hit Points vanish if any remain when the spell ends."*

Temporary Hit Points are mechanically distinct from regular HP:
- They form a separate pool and are tracked independently.
- They do not stack with other temp HP (a creature takes the higher value).
- They vanish at spell end.

### Why `heal_hp` is insufficient

The current `HealHpEffect` restores lost HP from a dice expression. It does not model temp HP because temp HP is a separate buffer, not a restoration of the HP pool. The amount is also not a fixed DiceExpr — it equals the chosen form's actual HP value (a creature-database lookup), which itself is a new surface concern.

### Proposed widening

New effect atom: `grant_temp_hp`. Distinct from `heal` in that:
- It populates the temp HP pool rather than restoring HP.
- Its amount source may be `form_hp` (a reference to the adopted form's HP total) rather than a static DiceAmount.

---

## Gap 3: No mid-spell form-change activation

### What the spell does

> *"You shape-shift into another creature for the duration or until you take a Magic action to shape-shift into a different eligible form."*

During the spell's concentration window, the caster can spend their Magic action to swap into a new eligible form. Each form swap re-applies the stat-block replacement.

### Why the current surface cannot express this

The current surface has no mechanism for ongoing spells that expose a repeatable sub-activation within the duration window. The existing families (`ongoing_effect`, `activation`, `triggered_reaction`, `anchored_trigger`) all model a single resolution at cast time. A mid-spell re-activation with a standard action cost is a new structural pattern.

### Proposed widening

A new variant on `ClassFeatureActivationCost` (or a new surface type `SpellSubActivation`) that models:
- Cost: Magic action (while the parent concentration is held)
- Effect: re-apply form_transformation to a new eligible target
- Guard: same constraints as the original cast

This pattern may generalize to other spells (Animate Objects allows commanding objects as a Bonus Action mid-spell, Spiritual Weapon allows commanding the weapon, etc.).

---

## Summary table

| Gap | Kind | Name | Classification |
|-----|------|------|----------------|
| Stat-block replacement | `new_subgraph` | `form_transformation` | structural — no existing family |
| Temporary HP grant | `new_atom` | `grant_temp_hp` | atom — distinct from `heal` |
| Mid-spell form change | `new_variant` | `mid_spell_form_change_activation` | surface — new sub-activation pattern |

All three gaps must be addressed together for an honest encoding of Shapechange. The `form_transformation` family is the highest-priority widening as it is shared across three SRD spells.
