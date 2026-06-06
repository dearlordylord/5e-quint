# L3MSPELL-10 Moonbeam Shapeshift Closure

Task 10 resolved Moonbeam's shape-shift rider ownership against RAW,
ubiquitous language, the promoted battle reducer, and the current coverage
ledgers. No runtime behavior, Surface shape, QNT owner, or MBT driver was
added.

## Source Review

Local RAW sources checked:

- `.references/srd-5.2.1/Spells/Descriptions-M-P.md#Moonbeam` for the
  Constitution Saving Throw triggers, failed-save Radiant damage, conditional
  shape-shift true-form reversion, shape-shift suppression until the creature
  leaves the Cylinder, successful-save half damage only, and once-per-turn
  limit.
- `.references/srd-5.2.1/Rules-Glossary.md#Shape-Shifting` for the rule that
  the effect that lets a creature shape-shift specifies what happens, ongoing
  effects carry over unless that effect says otherwise, and death reverts the
  creature to true form.
- `.references/srd-5.2.1/Classes/Druid.md#Level 2: Wild Shape` for the
  class-feature shape-shift owner and its replacement-form facts.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md#Polymorph` for the
  spell-effect shape-shift example Moonbeam itself names.
- `UBIQUITOUS_LANGUAGE.md#Spell Ownership Terms` for Spell Definition, Spell
  Invocation, Spell Effect, and Cast ownership terms.
- `UBIQUITOUS_LANGUAGE.md#Areas of Effect` for Cylinder and Area of Effect
  terminology.

Relevant RAW facts:

- Moonbeam's true-form rider applies only on a failed save and only if the
  creature is shape-shifted.
- A successful Moonbeam save deals half damage only; it does not revert or
  suppress shape-shifting.
- Moonbeam suppression lasts until the creature leaves the Cylinder.
- Shape-shift source descriptions own their form replacement and restoration
  facts.

## Existing Evidence Chain

Surface shape:

- `packages/surface/content/moonbeam.dhall` and generated
  `packages/surface/content/moonbeam.json` record Moonbeam's Cylinder area,
  Concentration duration, Dim Light source fact, Magic-action reposition, save
  triggers, shared once-per-turn limit group, slot-scaled Radiant damage, and
  conditional `revert_shape_shift_to_true_form` plus
  `suppress_shape_shifting_while_in_area` failed-save items.
- `packages/surface/src/surface/unit-catalog.test.ts` decodes Moonbeam with the
  conditional shape-shift rider across initial, end-turn, enter-area, and
  area-moves-into-space triggers.

QNT witness/proof ownership:

- `packages/battle-runtime/battle-runtime-shape-shifting.qnt` owns the shared
  `ShapeShiftedRuntimeState` vocabulary. Its admitted executable branches are
  true form, class-feature shape-shifted state, and spell-effect shape-shifted
  state; both shifted branches are reversible to true form.
- `packages/battle-runtime/battle-runtime-moonbeam-movable-zone.qnt` consumes
  that shared shape-shift state. Failed saves call the shared reversion
  operation and enter Moonbeam-suppressed true form only after reversion.
  Successful saves preserve the current shape-shift state.
- `packages/battle-runtime/battle-runtime-moonbeam-movable-zone.mbt.qnt` and
  `packages/battle-runtime/src/moonbeam-movable-zone.mbt.test.ts` replay the
  focused movable-zone projection, including failed-save reversion and
  suppression cleanup, without adding Moonbeam-local unsupported source
  variants.

Production reducer reachability:

- `packages/battle-runtime/src/battle-reducer/shape-shifting.ts` derives
  `BattleShapeShiftedRuntimeState` from the canonical active shape-shift owner
  slot. The admitted owners are `druidWildShapeForm` and
  `spellShapeShiftedForm`, each with a typed reversion owner.
- `revertShapeShiftedCombatantToTrueForm` removes the source-owned active
  effect through that shared owner; it returns typed true-form, reverted, or
  missing-combatant results instead of dispatching on spell names, feature
  names, stat-block names, or provenance sections.
- `packages/battle-runtime/src/battle-reducer/turn-end-movement.ts` applies the
  Moonbeam rider from real Moonbeam save resolution: failed saves call the
  shared reversion operation, successful saves do not, and suppression is stored
  on the Moonbeam active effect until explicit Cylinder exit or spell cleanup.
- `packages/battle-runtime/src/battle-reducer/unit-features.ts` consults
  Moonbeam suppression as a runtime fact when admitting shape-shifting, so the
  suppression consequence is executable instead of a status label.

Runtime and replay evidence:

- `packages/battle-runtime/src/shape-shifting.test.ts` covers spell-effect
  shape-shift projection, replacement-owner uniqueness, true-form reversion,
  and cleanup of the whole active owner slot.
- `packages/battle-runtime/src/battle-runtime-druid-wild-shape.test.ts` covers
  shared projection and reversion for active Druid Wild Shape.
- `packages/battle-runtime/src/unit-profile-admission-moonbeam.test.ts` covers
  Moonbeam admission, failed-save reversion and suppression for Wild Shape,
  successful-save non-reversion, spell-effect shape-shift reversion,
  spell-effect successful-save preservation, full owner-slot cleanup before
  suppression, duplicate same-turn save behavior, Cylinder-exit cleanup, and
  spell cleanup.
- `packages/battle-runtime/src/moonbeam-movable-zone.mbt.test.ts` records the
  promoted focused MBT replay for admitted shape-shift reversion and
  suppression cleanup.

Coverage ledgers:

- `plans/unit-profile-coverage/unit-claims.jsonl` records `moonbeam` as
  `profile-subset-supported` under
  `spell.invocation-moonbeam-movable-zone`.
- The supported mechanics include the failed-save shape-shift rider through the
  shared runtime state for class-feature and spell-effect shape-shifted
  targets, successful-save non-reversion, Moonbeam-owned shape-shift
  suppression, explicit Cylinder-exit cleanup, and spell cleanup.
- `plans/unit-profile-coverage/task-claims.jsonl` records completed runtime
  parity and QNT proof evidence for
  `L12G-FOLLOWUP-MOONBEAM-SHAPESHIFT-AREA-SUPPRESSION` and
  `L12G-FOLLOWUP-SPELL-SHAPESHIFT-TRUE-FORM-REVERSION`.
- The stat-block Shape-Shift gap is already closed as
  `L12G-FOLLOWUP-STATBLOCK-SHAPECHANGER-TRUE-FORM-REVERSION`: the current SRD
  stat-block catalog exposes imp and quasit Shape-Shift as prose-only special
  actions, while battle stat-block execution admits attacks and rejects
  specials.

## Boundary Decision

Moonbeam shape-shift support is resolved for the current battle runtime. The
promoted profile owns the spell's executable rider after the table/spatial
owner supplies the area-triggered save: failed saves deal Radiant damage,
revert admitted class-feature and spell-effect shape-shifted targets through
the shared restoration owner, and suppress supported shape-shifting until the
target leaves the Cylinder or the spell is cleaned up. Successful saves deal
half damage only and do not change the shared shape-shift state.

No Moonbeam authored-identity dispatch is needed or allowed. Runtime behavior
does not branch on the Moonbeam description's example spell name, on SRD spell
ids, on Druid feature names, on stat-block names, or on provenance sections.
Admission flows through parsed Surface shape, support-profile facts, active
effect kinds, and typed restoration owners.

Stat-block Shape-Shift special actions remain outside this runtime profile.
Promoting them would require a structured Stat Block special-action active-form
owner that stores the current form choice, speed replacement, equipment
non-transformation consequence, and true-form restoration operation. Adding
Moonbeam-local stat-block shapechanger metadata would duplicate true-form Stat
Block facts and create authored-identity coupling, because the current catalog
stores the relevant imp and quasit Shape-Shift facts only as prose named
specials.

## Plan Impact

- L3MSPELL-10 can close as boundary resolved.
- L3MSPELL-11 should audit Moonbeam's selected-identity replay like the other
  promoted spells, but this task did not find a Moonbeam selected-identity or
  production reachability gap.
- L3MSPELL-12 should include this note and the existing Moonbeam ledger claim
  when consolidating spell-boundary evidence.
- Future stat-block shapechanger work should be a generic Stat Block
  special-action active-form owner, not a Moonbeam-specific branch.

## Reviewer Loop Convergence

- Round 1: rejected adding Moonbeam-local shapechanger state or source ids.
  Those would duplicate shared shape-shift runtime facts and make unsupported
  stat-block true-form restoration appear executable without an owner.
- Round 2: retained the existing shared runtime-owner model. Class-feature and
  spell-effect shifted states are admitted only with typed reversion owners;
  stat-block special-action shifted states remain unadmitted until the Stat
  Block runtime owns structured active-form facts.
