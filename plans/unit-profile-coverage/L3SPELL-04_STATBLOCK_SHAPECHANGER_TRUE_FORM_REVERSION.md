# L3SPELL-04 Stat-Block Shapechanger True-Form Reversion

Task 4 reviewed SRD stat-block Shape-Shift facts and closes the stat-block
shapechanger Moonbeam rider without reducer or Quint changes.

## Source Review

Local sources checked:

- `.references/srd-5.2.1/Spells/Descriptions-M-P.md` for Moonbeam's failed-save
  shape-shift reversion and suppression.
- `.references/srd-5.2.1/Rules-Glossary.md` for Shape-Shifting and Truesight
  true-form vocabulary.
- `UBIQUITOUS_LANGUAGE.md` for Truesight true-form terminology.
- `packages/surface/content/stat_block_find_familiar_forms.{dhall,json}` for
  SRD imp and quasit Shape-Shift special actions.
- `packages/surface/src/surface/stat-block-catalog.ts` for the SRD Stat Block
  collection boundary.
- `packages/battle-runtime/src/statblock-action-support.ts` for executable
  Stat Block action support.
- `packages/battle-runtime/src/battle-reducer/shape-shifting.ts` for the shared
  shape-shift reversion owner.

Relevant facts:

- Moonbeam says a failed save reverts a shape-shifted creature to its true form
  and prevents shape-shifting until it leaves the Cylinder.
- The local SRD stat-block records with Shape-Shift are `stat_block_imp` and
  `stat_block_quasit`.
- Both Shape-Shift entries are `actions.specials` prose. They name alternate
  forms, speed substitutions, return to true form, unchanged statistics except
  Speed, and equipment not transforming.
- The battle runtime's Stat Block action support currently rejects `specials`
  and promotes executable attack actions only.
- The shared shape-shift owner currently admits Druid Wild Shape and
  spell-effect active effects, both of which already carry canonical active-form
  state from which replacement and true-form facts are derived.

## Decision

Close the stat-block shapechanger branch as outside promoted battle runtime for
now.

The available SRD stat-block facts are not structured enough to represent an
active Shape-Shift form without inventing parallel runtime metadata. A correct
promotion needs a canonical Stat Block special-action active-form owner that
parses or authors the allowed form choices, replacement Speed facts, equipment
non-transformation, and return-to-true-form transition. Moonbeam should then
consume that shared owner exactly as it consumes Druid Wild Shape and
spell-effect shape-shift owners.

Adding a Moonbeam-local flag or registry for imp/quasit active forms would make
the invalid state representable: a combatant could carry true-form Stat Block
facts in one place and separately stored replacement-form facts or authored
identity assumptions in another. It would also teach Moonbeam to know stat-block
authored identity, which the current Moonbeam claim explicitly avoids.

## No Runtime Change

No reducer code, QNT, MBT, or runtime tests changed. There is no executable
stat-block active-form state to test for reversion parity. The existing
Moonbeam runtime claim remains honest: supported class-feature and spell-effect
shape-shift owners revert through the shared owner, while stat-block
Shape-Shift specials stay outside that owner until a generic Stat Block
special-action active-form owner exists.

## Reviewer Loop Convergence

- Round 1 RAW/ubiquitous-language pass: Moonbeam's shape-shifted true-form
  rider is traced to the local spell text; true-form vocabulary is present in
  the local Rules Glossary/ubiquitous-language sources, while imp/quasit
  Shape-Shift facts are only in the Surface SRD Stat Block records.
- Round 1 architecture/connascence pass: promotion was rejected because
  Shape-Shift form choices, speed replacement, equipment handling, and
  return-to-true-form state must change together under one Stat Block
  special-action owner, not in Moonbeam-specific metadata.
- Round 2 code-review pass: coverage ledger now classifies the deferred
  Moonbeam mechanic as a precise runtime closure with no reducer behavior
  change and no stat-block authored-identity dispatch.

## Plan Impact

- Task 4 can close as accepted runtime-detached closure.
- Later spell lifecycle tasks are unchanged.
- A future Stat Block special-action runtime task should be added only if the
  project introduces a structured active-form owner for Shape-Shift facts.
