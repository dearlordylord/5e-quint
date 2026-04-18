# Hat of Many Spells

## Verdict

`surface_widening`

I did not author `content/magic_item_hat_of_many_spells.dhall` because the unit's main property cannot be expressed honestly with the current `magic_item` surface.

## Primary blocking gap

The blocking rule is **Unknown Spell**:

> While holding the hat, you can try to cast a level 1+ spell you don't know. The spell must be on the Wizard spell list, it must be of a level you can cast...
>
> Once you decide on the spell, you must expend a spell slot of the spell's level.
>
> ...make an Intelligence (Arcana) check (DC 10 plus the spell's level).
>
> On a successful check, you cast the spell using its normal casting time...

The current surface can model:

- fixed magic-item activations,
- named `grant_spell_access`,
- fixed activation costs,
- item `use_count` / `charge_pool` resources,
- fixed-number `ability_check_gate`,
- random tables.

It cannot model this combination honestly:

- choose an **arbitrary spell from an open Wizard-list filter** rather than a named `spellId`;
- consume a **spell slot** instead of an item pool;
- use a **dynamic DC** based on the chosen spell's level;
- on success, **delegate to the chosen spell's own authored mechanics and casting time**.

That is still an `activation`-family magic item, so this is narrower than `structural_widening`, but it needs new surface variants/subgraph support.

## Suggested widenings

1. Add an activation/delegation shape for **open-list spell casting**.
   This should express class-list filtering, minimum spell level, level-cap based on caster capability, and extra eligibility predicates such as the material-cost cap.

2. Add an activation-cost variant for **use the delegated spell's normal casting time**.
   The item does not always cost one Action; the cost depends on the spell chosen for that use.

3. Add a resource variant for **consume a spell slot**.
   `ActivationResource` currently only covers `use_count` and `charge_pool`.

4. Widen `ability_check_gate` so its DC can depend on chosen-spell metadata.
   Current shape is fixed `dc: number`; this item needs `10 + spell level`.

## Secondary gaps in the mishap table

Even if the primary activation were widened, several failure-table outcomes still pressure the surface:

- `01-50`: cast a random spell from a nested random table, including spell-specific mode choices like *Enlarge/Reduce* and self-only *Invisibility*.
- `61-65` and `76-80`: create a nonmagical object from a random table result.
- `81-85` and `86-90`: create a creature that is explicitly **not under your control** / hostile, which does not match the current summoned-companion framing.
- `91-95`: open a **two-way portal** to another plane at a location for a timed duration.
- `96-00`: create a temporary magic item chosen partly by rarity and partly by GM choice.

Those look like further `surface_widening` work, but the unit already fails earlier on the primary property, so I stopped before authoring a placeholder content file.

## Non-blocking note

**Spellcasting Focus** is not the core blocker. It reads as equipment/spellcasting-support text rather than a self-contained deterministic combat atom:

> While holding the hat, you can use it as a Spellcasting Focus for your Wizard spells.

That omission alone would not have stopped authoring if the main activation had fit.
