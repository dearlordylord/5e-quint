# L3SPELL-02 Darkness Object-Origin Decision

Task 2 reviewed Darkness's object-origin branch and closes it without reducer
or Quint changes.

## Source Review

Local RAW sources checked:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md` lines 1307-1320 for
  Darkness.
- `.references/srd-5.2.1/Rules-Glossary.md` lines 353-360 for Darkness and
  Darkvision.
- `.references/srd-5.2.1/Rules-Glossary.md` lines 430-436 for Emanation.
- `UBIQUITOUS_LANGUAGE.md` lines 295-299 and 365-366 for Illumination,
  Obscurement, Darkvision, and Heavily Obscured vocabulary.

Relevant RAW facts:

- Darkness can use a point within range, filling a 15-foot-radius Sphere.
- Alternatively, Darkness can be cast on an object that is not worn or carried,
  filling a 15-foot Emanation from that object.
- An Emanation from an object moves with that object unless the effect is
  instantaneous or stationary.
- Covering the object with something opaque blocks the Darkness.
- Darkness is Heavily Obscured; this spell's magical Darkness blocks ordinary
  sight and Darkvision, and nonmagical light cannot illuminate it.
- Overlap with Bright Light or Dim Light created by a spell of level 2 or lower
  dispels that other spell.

## Existing Facts Searched

Searched existing object, area, light, and opaque-cover facts before deciding:

- `spellObjectLightTarget` already carries object id, size, and
  worn-or-carried facts for Light's Large-or-smaller object target gate.
- `spellTouchedObjectTarget` carries touched-object identity for object-light
  spells that do not need Light's size/worn-or-carried gate.
- `BattleLightEmitterProjectionFact` carries object id, distance, and
  `opaqueCover` for projecting object-attached light emission.
- `BattleLightEmitter` already supports object attachment and
  `opaqueCoverInteraction: { kind: "blocksEmission" }`.
- `BattleMagicalDarknessZone` is currently a point-origin Sphere keyed by a
  caller-supplied area id.
- `BattleMagicalDarknessSightProjectionFact` and
  `BattleMagicalDarknessNonmagicalLightProjectionFact` consume area ids only;
  they do not carry object identity or opaque-cover state.
- `BattleSpellAreaChoice` can name table-supplied areas but does not store an
  object-origin Emanation or movement-with-object lifecycle.

## Decision

Keep the promoted Darkness profile as point-origin only and close the
object-origin branch as table/object-spatial adjudication.

The existing object-light facts can honestly validate Light's object target and
can suppress an object light emitter behind opaque cover. They do not honestly
represent Darkness's object-origin Emanation because RAW requires the Darkness
area to originate from the object and move with it. Adding a Darkness-specific
object-origin area or object movement store would duplicate object position,
object lifecycle, map geometry, and cover facts that are currently supplied by
the table/caller boundary.

This means the runtime-supported subset remains:

- Magic Action prepared spell cast with a level-2-or-higher Spell Slot.
- Caller-supplied point-origin 15-foot-radius Sphere area identity.
- Caster-owned Concentration up to 10 minutes.
- Magical Darkness zone projection for ordinary sight, Darkvision, and
  nonmagical light witness consequences.
- Caller-supplied overlapping spell-created light facts and generic tracked
  spell-light dispel.
- Concentration and duration cleanup.

The closed branch remains outside promoted battle runtime:

- selecting the unworn/un-carried object as the Darkness origin;
- deriving or tracking the 15-foot object-origin Emanation;
- moving that Emanation with the object;
- deciding whether opaque cover blocks the object-origin Darkness;
- deriving affected area membership, sight lines, and map illumination.

## No Runtime Change

No reducer code, QNT, MBT, or runtime tests were changed. A runtime promotion
would require a general object-origin area lifecycle owner, not a Darkness-only
field or adapter.

## Reviewer Loop Convergence

- Round 1 RAW/ubiquitous-language pass: the closure traces to Darkness,
  Emanation, Darkness/Darkvision, Illumination, and Obscurement terminology in
  the local SRD and ubiquitous language.
- Round 1 architecture/connascence pass: rejected a Darkness-specific
  object-origin area field because object identity, movement, cover, and area
  membership would have to change together across table, map, and runtime
  layers without a shared object-spatial owner.
- Round 2 code-review pass: no reducer behavior changed; the claim ledger now
  records the branch as a runtime-detached table-spatial closure instead of a
  live follow-up split.

## Plan Impact

- Task 2 can close as accepted runtime-detached closure.
- Later spell lifecycle tasks are unchanged.
- A future object-origin Emanation runtime task should be added only if the
  project introduces a generic object-spatial lifecycle owner shared by other
  object-origin spells such as Daylight.
