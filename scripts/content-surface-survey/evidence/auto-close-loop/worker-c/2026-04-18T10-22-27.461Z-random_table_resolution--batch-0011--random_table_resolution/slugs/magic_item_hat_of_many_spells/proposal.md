# Hat of Many Spells

## Verdict

`surface_widening`

I did not author `content/magic_item_hat_of_many_spells.dhall`. The item's main mechanic cannot be represented honestly with the current magic-item surface.

## Why It Does Not Fit

The current `magic_item` activation family assumes:

- one declared activation resource on the header;
- that resource is consumed by the activation itself;
- the activation's phases are authored up front against fixed spell/effect payloads.

Hat of Many Spells breaks that shape in three ways.

1. The success branch is not a fixed granted spell.

The item does not grant one named spell or a closed spell list. It lets the wielder choose any qualifying Wizard spell they do not know, provided:

- it is level 1+;
- it is on the Wizard spell list;
- it is of a level they can cast;
- its Material components do not cost more than 1,000 GP.

After that choice, the item asks for an Arcana check and, only on success, delegates to the chosen spell's own normal casting-time procedure.

That is not expressible with current `grant_spell_access`, which requires a fixed `spellId`.

2. The resource semantics are success-gated.

The spell slot is spent before the Arcana check. The short-rest lockout only applies on success.

Current `ActivatedAbilityMechanics` has a single header resource and reset cadence, consumed by the activation as a whole. That would force a false trace:

- either the short-rest use gets consumed even on failure, which is wrong;
- or the spell-slot spend is omitted, which is also wrong.

3. The failure table needs branch payloads the surface cannot currently express inside an activation.

The failure table includes:

- random spell casting from a nested random list;
- condition application with different durations;
- summoning catalog creatures not under your control;
- creating nonmagical objects;
- creating a temporary magic item chosen by the GM.

Some of those branches are representable individually in other parts of the surface, but not honestly as branch outcomes here:

- spawned creatures exist only as top-level spawned-creature mechanics families, not as branchable effect atoms inside a `random_table` outcome;
- object / temporary item creation is not surfaced in `types.ts`;
- the portal and GM-chosen magic-item destination are partly caller-owned.

## Narrowest Widenings

### 1. New subgraph: `unknown_spell_cast_attempt`

Needed shape:

- choose a spell from a rules-defined catalog subset;
- consume a spell slot matching that chosen spell's level;
- make an ability check whose DC depends on the chosen spell's level;
- on success, dispatch into the chosen spell's normal authored procedure;
- on failure, continue into a random-table branch.

Evidence:

> "While holding the hat, you can try to cast a level 1+ spell you don't know..."

> "Once you decide on the spell, you must expend a spell slot of the spell's level."

> "On a successful check, you cast the spell using its normal casting time"

### 2. New activation-resource variant: success-gated cooldown

Needed because the current header resource model cannot say:

- spend spell slot before resolution;
- start the short-rest lockout only if the check succeeds.

Evidence:

> "On a successful check, you cast the spell ... and you can't use this property again until you finish a Short or Long Rest."

### 3. New branchable effect variants for random-table outcomes

Needed for:

- summon random creature from catalog with dismissal and hostility/control fields;
- create a random nonmagical object;
- create a temporary magic item.

Evidence:

> "A creature appears in an unoccupied space as close to you as possible. The creature isn't under your control..."

> "You pull a nonmagical object out of the hat."

> "You pull a magic item out of the hat... The GM chooses the item, which disappears after 1 hour"

## Non-Blocking Note

`Spellcasting Focus` is not the primary blocker, but it also does not have a current authored-surface encoding. It reads like equipment/component-routing metadata rather than a combat-runtime effect atom.
