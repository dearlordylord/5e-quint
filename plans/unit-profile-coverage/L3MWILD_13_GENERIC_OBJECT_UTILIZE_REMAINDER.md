# L3MWILD-13 Generic Object And Utilize Remainder

Task: `L3MWILD-13-GENERIC-OBJECT-UTILIZE-REMAINDER`

Status: closed to existing boundaries; no new battle-runtime owner promoted.

## RAW And Language Check

- `.references/srd-5.2.1/Classes/Druid.md`, Level 2 Wild Shape, Objects:
  object handling is determined by the form's limbs; equipment can fall, merge,
  or be worn; worn equipment functions normally when practical; equipment does
  not resize or reshape; equipment the form cannot wear falls or merges; merged
  equipment has no effect.
- `.references/srd-5.2.1/Playing-the-Game.md`, Actions and Interacting with
  Objects: Utilize uses a nonmagical object, ordinary combat object interaction
  is one free interaction during movement or action, later interactions require
  Utilize, and object outcomes are often GM-described table facts.
- `UBIQUITOUS_LANGUAGE.md`: use Creature, Character Sheet, Stat Block, Free
  Hand, Action, Utilize, Holding / Wielding, and loadout language. Do not derive
  form object handling from Beast authored identity.

## Current Promoted Boundary

Task 12 and its prerequisites already promote the Wild Shape branches that have
an execution owner independent of generic table-object state:

- selected-loadout equipment disposition holes and fills;
- exact selected-loadout object refs for armor, Shield, main weapon, and
  off-hand weapon;
- all-merged no-effect active-effect storage;
- fallen-equipment `droppedObjects` boundary outcomes;
- not-practical-to-wear fallback to fall or merge;
- practical worn armor and Shield Armor Class / hand-use projection;
- practical worn selected-loadout weapon attacks and held-weapon spell/feature
  consumers, gated by the active `formLimbs` witness;
- active-effect storage of the caller/GM form-limb object-handling witness.

These facts derive from Character Battle selected loadout, the active Wild Shape
effect, and caller/GM witnesses. They do not add Wild Shape inventory or table
placement state.

## Remainder Decision

No additional generic non-weapon object or Utilize consumer is promoted in this
task.

The remaining generic non-weapon held-object cases have no current source of
canonical held-object identity in battle state. Command Drop can consume narrow
caller/table held-object facts, and Wild Shape can consume selected loadout
object refs, but neither is a durable generic carried-object inventory. Adding a
Wild Shape-local list for torches, tools, gear, or other non-weapon objects would
duplicate Character Sheet inventory or table-held object state.

Downstream use of Wild Shape `droppedObjects` also has no independent battle
runtime owner. The current drop result is a transient boundary outcome carrying
the actor, source, form, and object id. Map placement, object retrieval, object
contact, object use, and later table-position lifecycle belong to a future
generic table/object-placement owner, not to Wild Shape.

The non-resizing/non-reshaping rule is already represented at the promoted
selected-loadout boundary that matters today: object ids and Unit ids are
preserved, practical wearing requires a caller/GM witness, impossible wearing is
forced to fall or merge, and no code creates resized or reshaped equipment facts.
A durable object lifecycle for loose table objects would need the same generic
object owner as dropped-object placement and Utilize.

## Future Owner Conditions

A future generic object / Utilize / table-placement owner may consume the stored
Wild Shape `formLimbs` witness. It must still:

- avoid Beast form authored-identity dispatch;
- avoid a Wild Shape-local inventory or copied equipment list;
- use table/caller object identity, position, reach, and procedure facts at the
  boundary;
- derive selected-loadout facts from the existing Character Battle loadout.

Until that owner exists, the remaining Wild Shape object work is closed as
outside current battle-runtime scope rather than blocked on another Wild
Shape-specific implementation task.
