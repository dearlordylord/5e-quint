# Proposal: True Polymorph widening gaps

**Outcome:** `atom_widening`  
**Unit:** True Polymorph (9th-level transmutation, SRD 5.2.1)

---

## Why no encoding was produced

True Polymorph cannot be honestly encoded in any existing `SpellMechanics` family. The `activation` family with a `save_gate` phase is the closest structural fit (unwilling creature makes a Wisdom save), but the `Effect` union consumed by `onFail`/`onSuccess` is `DamageEffect | NoneEffect`. The actual effect on failure is stat-block replacement — a transformation, not damage.

Forcing this into a `NoneEffect` would produce a tracer that lies about the spell. Forcing it into a `DamageEffect` with arbitrary values would be worse. Neither is acceptable per the guardrails.

---

## Gap 1 — Missing atom: `alter_creature_kind`

**Severity:** Atom widening (concept absent from v4 taxonomy)

True Polymorph has three mutually exclusive transformation modes, all requiring the same underlying concept: replacing or converting a creature's or object's type at the stat-block level.

| Mode | Input | Output |
|---|---|---|
| Creature → Creature | creature | different creature (stat block swapped, HP/alignment/personality retained) |
| Object → Creature | nonmagical object | creature (Friendly, obeys commands) |
| Creature → Object | creature | nonmagical object (creature stats become object stats) |

The v4 taxonomy has `alter_item_kind` (for item kind changes) but no parallel atom for creature/cross-type polymorphism. A new atom `alter_creature_kind` is required, carrying at minimum:
- the target type class (creature or object) as input and output
- CR/level constraints as authoring metadata (not runtime — the constraint is checked at cast time by the caster)

**Evidence:** *"The creature shape-shifts into a different creature or a nonmagical object... The target's game statistics are replaced by the stat block of the new form"*

---

## Gap 2 — Missing atom: `grant_temp_hp`

**Severity:** Atom widening (concept absent from v4 taxonomy)

The Creature→Creature mode grants Temporary Hit Points equal to the new form's HP maximum:

> *"The target gains a number of Temporary Hit Points equal to the Hit Points of the new form. These Temporary Hit Points vanish if any remain when the spell ends."*

The current `Effect` union has `heal_hp` (for ClassFeatureEffect) and `damage`, but no THP grant. The v4 taxonomy lists `modify_max_hp` (a different operation) but not `grant_temp_hp`. Temporary HP that expire on spell-end is semantically distinct from both healing and max-HP modification. A new atom is needed.

---

## Gap 3 — Missing `Duration` variant: `concentration_then_permanent`

**Severity:** Surface widening (new variant of existing type)

True Polymorph's duration escalates:
> *"The transformation lasts for the duration or until the target dies or is destroyed, but if you maintain Concentration on this spell for the full duration, the spell lasts until dispelled."*

No existing `Duration` variant can express this. The current variants are:
- `instantaneous`
- `concentration { upTo: DurationValue }` — ends on concentration break OR timer
- `timed { value: DurationValue }` — fixed duration, no concentration

A new variant is needed, e.g.:
```typescript
| {
    readonly kind: "concentration_then_permanent";
    readonly upTo: DurationValue;
  }
```
This models: concentration maintained for `upTo` → becomes permanent until dispelled; concentration broken before `upTo` → spell ends immediately.

---

## Gap 4 — `create_companion` surface gap (v4 atom, not in `types.ts`)

**Severity:** Surface widening (v4 atom exists, not yet implemented in surface)

The Object→Creature mode produces a controlled companion:
> *"The creature is Friendly to you and your allies. In combat, it takes its turns immediately after yours, and it obeys your commands."*

`create_companion` appears in the v4 atom inventory (§9 Effect Atoms) but is absent from `types.ts`. This is separate from the primary `atom_widening` gaps — it could be added without touching the v4 taxonomy.

---

## Structural note

Once the above gaps are filled, True Polymorph would fit the `activation` family with:
- A `save_gate` phase (Wisdom save, DC: caster spell save DC, for unwilling creatures)
- `onFail` → `alter_creature_kind` effect
- `onSuccess` → `none`
- Secondary `grant_temp_hp` effect hanging off the `alter_creature_kind` (Creature→Creature mode only)

The three transformation modes would likely need a `choose` or branching mechanism at the attachment level — the caster declares the mode at cast time. This is a DM/caster-choice branch, not a random resolution, so it may require a new `TargetSelection` or casting-time-branch shape.
