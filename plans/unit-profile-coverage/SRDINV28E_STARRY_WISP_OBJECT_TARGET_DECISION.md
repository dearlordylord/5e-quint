# SRDINV28E Starry Wisp Object Target Decision

Task: SRDINV28E

## Decision

`starry_wisp` remains `needs-surface-widening` and is not reclassified as a
supported spell Unit in this task.

The promoted battle-runtime spell target boundary is still combatant-oriented:
spell target holes select `CombatantId`s, spatial target facts are keyed to
combatants, and damage application mutates combatant HP. Starry Wisp's SRD text
requires one creature or object target, and supporting that honestly needs a
typed object target branch rather than metadata that the fill path cannot select
or validate.

## RAW And Language Check

Local SRD 5.2.1 Starry Wisp says the spell targets "one creature or object
within range," uses a ranged spell attack, deals Radiant damage on a hit, and
then makes the target emit Dim Light and prevents it from benefiting from the
Invisible condition until the end of the caster's next turn
(`.references/srd-5.2.1/Spells/Descriptions-S-Z.md`, "Starry Wisp").

Local SRD 5.2.1 Chill Touch says to make a melee spell attack "against a target
within reach," deals Necrotic damage on a hit, and prevents the target from
regaining Hit Points until the end of the caster's next turn
(`.references/srd-5.2.1/Spells/Descriptions-A-D.md`, "Chill Touch").

`UBIQUITOUS_LANGUAGE.md` distinguishes Spell Definition, Spell Invocation,
Spell Effect, Spell Attack, Target, Creature, Armor Class, and Hit Points. The
unsupported Starry Wisp branch belongs to Spell Invocation target selection and
Spell Effect execution, not provenance or Spell Access.

## Current Evidence

`packages/surface/content/starry_wisp.dhall` now makes the authored target scope
explicit with `targetKinds = [ "creature", "object" ]`. Starry Wisp remains out
of `SrdUnitCollection`; the generated SRD inventory and unit matrix classify it
as `needs-surface-widening` until object targeting and its riders are
executable. The
`spellAttackDamageTargeting` admission gate in
`packages/battle-runtime/src/battle-reducer.ts` accepts omitted target kinds or
the exact creature-only set as `singleCombatant`; it rejects mixed
creature/object target kinds. The SRDINV28E deterministic admission test imports
the authored Starry Wisp definition directly and proves that even if supplied as
cantrip spell access, it does not produce a supported battle act.

Chill Touch remains a profile subset: the current runtime supports its
combatant-target melee spell attack damage, cantrip scaling, and hit-applied
healing-suppression rider. The SRD generic "target" wording is not widened to
non-combatant targets by this task.

## Reclassification Requirements

A later task may reclassify `starry_wisp` only after all of these agree:

- battle-runtime exposes a typed object-target Spell Invocation branch with
  object identity and caller-supplied spatial/range targetability facts;
- ranged spell attack hit/miss adjudication works for object targets without
  passing object identity through `CombatantId`;
- object damage disposition is executable for the supported claim, including
  the boundary for object Armor Class, HP, and any omitted object-damage facts;
- the Dim Light emission and Invisible-benefit denial riders are represented as
  executable spell effects or are explicitly modeled as a supported subset that
  cannot be mistaken for full Starry Wisp support;
- deterministic admission/projection evidence, `unit-claims.jsonl`, generated
  matrix/report output, and verification-owner evidence cite the same profile
  ids.

Until then, Starry Wisp is an explicit object-target and rider blocker, while
Chill Touch stays limited to the combatant-target subset.
