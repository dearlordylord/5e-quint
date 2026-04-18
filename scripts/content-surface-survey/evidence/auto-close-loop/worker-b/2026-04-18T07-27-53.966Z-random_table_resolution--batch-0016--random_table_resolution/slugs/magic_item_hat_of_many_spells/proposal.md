## Hat of Many Spells

Outcome: `structural_widening`

### Why it does not fit honestly

The item's core mechanic is not "cast one named spell from the item." It is:

1. Choose an arbitrary level 1+ Wizard spell you do not know, subject to predicates:
   - on the Wizard spell list
   - of a level you can cast
   - no Material components costing more than 1,000 GP
2. Spend a spell slot matching that chosen spell's level.
3. Make an Intelligence (Arcana) check against `10 + spell level`.
4. On success, cast the chosen spell using that spell's normal casting time.
5. On failure, do not cast it and instead branch into a random-effect table.

The existing magic-item surface cannot express step 4 honestly:

- `grant_spell_access` only grants a named spell by `spellId`.
- `ActivatedAbilityMechanics.activationCost` must be fixed on the item itself; here the activation inherits the chosen spell's own casting time.
- `ActivationPhase` can branch to authored phases already present on the item, but it cannot delegate to an arbitrary chosen spell from the spell catalog.

That makes this a family-shape problem, not just a missing atom.

### Minimum widening that would solve the core mechanic

Add a delegated spell-cast subgraph for magic items, something in the shape of:

- choose a spell from a constrained catalog selector
- spend the matching spell slot
- resolve a gate (`ability_check_gate` here)
- on success, invoke the chosen spell's own authored procedure with its native casting time/range/components
- on failure, continue into authored fallback phases such as the d100 random table

This could be surfaced either as:

- a new activation-phase variant that delegates to a chosen spell record, or
- a new effect/subgraph specifically for "cast chosen spell from constrained catalog"

### Secondary gaps exposed by the failure table

Even after the core delegated-cast problem is solved, the random-failure table still pressures additional surface growth:

- object/item creation:
  - mundane objects pulled from the hat
  - temporary magic item pulled from the hat
- uncontrolled creature appearance from the table result
- two-way temporary portal creation

Those are secondary to the main blocker and were not enough reason on their own to coerce a placeholder encoding.

### Omitted non-core / caller-owned detail

`Spellcasting Focus` is mostly equipment/casting qualification text. It is not the reason this unit failed. The honest blocker is the delegated arbitrary-spell cast on the `Unknown Spell` property.
