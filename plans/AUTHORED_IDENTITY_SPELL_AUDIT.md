# Authored Spell Identity Audit and Pilot Handoff

Ralph task: QRFR-C13-AUTHORED-IDENTITY-AUDIT.

## Scope

This audit covers active spell runtime identity uses in:

- `packages/battle-runtime/battle-runtime-model.qnt`
- `packages/battle-runtime/battle-runtime-spell-invocation.qnt`
- spell profile rule-core files under `packages/shared-algebras/proofs/rule-core/`
- current `pnpm check:authored-id-dispatch` output

No reducer or spec behavior changes are part of this task. The executable
handoff is for Task 14 and Task 15.

## RAW and Language Check

Checked SRD 5.2.1 local corpus:

- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`: Spell Slots, Casting
  without Slots, Using a Higher-Level Spell Slot, Casting Time, One Spell with a
  Spell Slot per Turn, Targets.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md`: Magic Missile.
- `UBIQUITOUS_LANGUAGE.md`: Spell Definition, Spell Access, Spell Invocation,
  Spell Effect, Spell Slot, and Using a Higher-Level Spell Slot.

Domain distinction used here: authored Spell Definition identity can exist at
content, selected identity, and support-profile admission boundaries. Runtime
reducers should consume Spell Invocation procedure facts such as action cost,
slot spend, target cardinality, repeated effect count, damage type, and damage
dice facts.

## Current Classification

### Content, Selection, or Admission Boundary

- `packages/surface/content/magic_missile.{dhall,json}` is SRD content
  provenance and authored catalog identity.
- Class spell-list and reference records such as `packages/surface/content/class_wizard.json`,
  `packages/surface/content/shield.json`, and magic-item `spellId` references
  are authored-record references. They are allowed content/catalog boundaries.
- `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/repeated-damage-allocation.ts`
  admits a Surface `SpellRecord` by structural mechanics shape, not by
  `spell.id` or `spell.name`. It carries `spell.id` into `SpellInvocationRef`
  and `spell.name` into labels/summaries. Those are selected-identity and UI
  projection boundaries, not runtime rule selectors.
- `packages/battle-runtime/src/battle-reducer/spells-profiles.ts` iterates
  prepared spell definitions and profile admission functions. This is the
  support-profile admission boundary.
- `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/profile.ts`
  documents the profile-level admission and dispatch shape. The
  `knownWillingTargetSpellIds` field is an explicit selected-identity
  classification boundary; it is not the pilot.

### Test or Fixture Boundary

- `packages/battle-runtime/src/rule-core-spells.mbt.test.ts` records selected
  identity evidence for SRD spell ids including `magic_missile`.
- `packages/battle-runtime/rule-core-spells.mbt.qnt` and
  `packages/battle-runtime/battle-runtime-magic-missile.mbt.qnt` are focused
  parity drivers/fixtures for the SRD Magic Missile vertical.
- Unit-profile coverage plans under `plans/unit-profile-coverage/` retain SRD
  ids as evidence. These are not runtime dispatch.

### Production Runtime Dispatch to Remove

- `packages/battle-runtime/battle-runtime-model.qnt:25` defines
  `SpellInvocation` as a union of authored spell variants. The type alone is
  selected identity vocabulary, but downstream matching turns it into rule
  dispatch.
- `packages/battle-runtime/battle-runtime-spell-invocation.qnt:74` matches on
  `SpellInvocation` variants to decide whether a spell spends a Spell Slot.
  The `MagicMissile => true` branch is the pilot production dispatch to remove.
- `packages/shared-algebras/proofs/rule-core/spell-definition-profiles.qnt:8`
  defines `SpellDefinitionProfile` as spell-named variants. Its current use is
  production profile dispatch, not just selection identity.
- `packages/shared-algebras/proofs/rule-core/spell-invocation-action-slot-core.qnt:41`
  and `:45` branch on `SpellDefinitionProfile` names to project action cost
  and minimum slot level.
- `packages/shared-algebras/proofs/rule-core/spell-invocation-target-cardinality-core.qnt:16`
  branches on `SpellDefinitionProfile`; the `MagicMissileSpellProfile` branch
  starts at `:21` and
  derives target cardinality from `magicMissileDartCount(slotLevel)`.

The checker baseline does not currently expose these QNT findings. Running
`pnpm check:authored-id-dispatch` on this worktree fails on unrelated
character-creation fixture support:

- `packages/character-creation-runtime/src/background-fixture.test-support.ts:16`
- `packages/character-creation-runtime/src/background-fixture.test-support.ts:22`

Those are outside the spell pilot.

## Pilot Selection

Pilot vertical: Magic Missile repeated-damage-allocation Spell Invocation.

Reason:

- It has a small SRD rule surface: action-time level-1 slot spell, 120-foot
  range, repeated Force-damage darts, one or several creature targets, and one
  additional dart per slot level above 1.
- The TS runtime already admits it by structural procedure facts in
  `repeated-damage-allocation.ts` rather than by `magic_missile` dispatch.
- Rule-core already has reusable pieces: `SpellInvocationResourceFacts`,
  `SpellInvocationTargetCardinality`, `MagicMissileDirectDamageFacts`, and
  `DirectSpellDamageFacts`.
- It has focused QNT and TS coverage through `rule-core-spells.mbt.qnt`,
  `rule-core-spells.mbt.test.ts`, `battle-runtime-magic-missile.mbt.qnt`, and
  `battle-runtime-spellcasting-actions-and-slots.test.ts`.
- It removes at least one concrete production dispatch:
  `MagicMissile => true` in `spellInvocationSpendsSpellSlot`.

Bounded non-goals for the pilot:

- Do not rewrite every `SpellInvocation` or `SpellDefinitionProfile` branch.
- Do not make the authored-id checker enforce QNT in Task 14; Task 16 owns the
  guardrail after the pilot proves the pattern.
- Do not broaden Magic Missile behavior beyond the checked SRD text.

## Task 14 QNT Handoff

Target shape:

- Define procedure facts for the repeated-damage-allocation invocation rather
  than routing Magic Missile through `SpellDefinitionProfile`.
- Reuse the existing `SpellInvocationResourceFacts` record from
  `spell-invocation-resource-core.qnt` as the executable boundary. Do not add a
  parallel copy of action cost, slot spend, selected slot level, or target
  cardinality state.
- A repeated-damage-allocation fact should carry only the facts that are not
  otherwise derivable at the boundary: access/admission, selected slot level,
  target count, target validity, and repeated effect count. Project these into:
  `ActionTimeSpellInvocation`, `SpellInvocationWithSlot({ minimumSlotLevel: 1 })`,
  and `SpellInvocationBoundedTargets({ minimumTargetCount: 1, maximumTargetCount: repeatedEffectCount })`.
- Feed Magic Missile's repeated effect count from
  `magicMissileDartCount(slotLevel)` at the Magic Missile proof/example
  boundary. Runtime reducers should consume `repeatedEffectCount`, not
  `MagicMissileSpellProfile`.
- Preserve `MagicMissileDirectDamageFacts` in
  `spell-direct-damage-projection-core.qnt`; it is the spell-specific damage
  projection fact already tied to the SRD Magic Missile rule. The pilot is about
  removing authored identity from invocation/resource dispatch, not erasing
  every SRD-named proof fact.

QNT files to touch or inspect:

- `packages/shared-algebras/proofs/rule-core/spell-invocation-resource-core.qnt`
- `packages/shared-algebras/proofs/rule-core/spell-invocation-action-slot-core.qnt`
- `packages/shared-algebras/proofs/rule-core/spell-invocation-target-cardinality-core.qnt`
- `packages/shared-algebras/proofs/rule-core/spell-direct-damage-projection-core.qnt`
- `packages/shared-algebras/proofs/rule-core/spell-readied-spell-response-core.qnt`
- `packages/shared-algebras/proofs/rule-core/spell-procedure-profiles-examples.qnt`
- `packages/shared-algebras/proofs/rule-core/spell-procedure-profiles-inductive.qnt`
- `packages/battle-runtime/battle-runtime-spell-invocation.qnt`
- `packages/battle-runtime/battle-runtime-spell-bridge.qnt`
- `packages/battle-runtime/rule-core-spells.mbt.qnt`
- `packages/battle-runtime/battle-runtime-magic-missile.mbt.qnt`
- `packages/battle-runtime/battle-runtime-core-combat-tests.qnt`
- `packages/battle-runtime/battle-runtime-spell-facts-tests.qnt`

Task 14 focused verification:

- `pnpm --filter @dnd/shared-algebras test:qnt-proofs`
- `pnpm --filter @dnd/battle-runtime test:qnt-proofs`
- Focused `rule-core-spells.mbt.test.ts` only after QNT changes are complete,
  using the MBT protocol from `CLAUDE.md` if run as MBT.

## Task 15 TS Handoff

TS files and reducer paths for the same vertical:

- `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/repeated-damage-allocation.ts`
  owns admission, discovery, invocation ref, codec, and profile dispatch for the
  repeated-damage-allocation procedure.
- `packages/battle-runtime/src/battle-reducer/spells-resolve-prepared-slot.ts`
  owns runtime resolution for repeated damage allocation, Shield negation,
  Sanctuary replacement, resource spend, and after-damage reactions.
- `packages/battle-runtime/src/battle-reducer/spells-targeting.ts` owns
  `spellTargetAllocationHole` and allocation validation.
- `packages/battle-runtime/src/battle-reducer/spells-holes-fills.ts` owns
  damage holes, fill parsing, prepared-slot damage validation, and
  `supportedSpellInvocationMatchesRef`.
- `packages/battle-runtime/src/battle-reducer/spell-turn-resources.ts` owns
  one-slot-per-turn and turn-resource availability.
- `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts`
  registers the profile.
- `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/profile.ts`
  owns the profile interface.

TS tests to keep focused:

- `packages/battle-runtime/src/battle-runtime-spellcasting-actions-and-slots.test.ts`
- `packages/battle-runtime/src/rule-core-spells.mbt.test.ts`
- `packages/battle-runtime/src/reaction-spell-selected-identity.mbt.test.ts`
- `packages/battle-runtime/src/reaction-casting-time.mbt.test.ts`
- `packages/battle-runtime/src/battle-runtime.mbt.test.ts` only if the change
  affects the integrated MBT surface and focused checks are already green.

TS implementation note:

- The TS profile already admits by Surface shape and carries selected spell id
  only for `SpellInvocationRef`, labels, selected-identity evidence, and
  spell-effect ownership. Task 15 should mostly align the TS bridge and tests
  with the Task 14 QNT fact shape, not introduce a new `magic_missile` runtime
  dispatch.

## Connascence Notes

Strong current coupling:

- `SpellDefinitionProfile` variants and the action/slot/cardinality projection
  functions must change together.
- `MagicMissileSpellProfile`, `magicMissileDartCount`, target allocation bounds,
  and direct damage allocation tests currently change together across rule-core
  examples and MBT.
- `SpellInvocation` authored variants and `spellInvocationSpendsSpellSlot`
  branches currently change together in battle-runtime QNT.

Pilot refactor goal:

- Localize the Magic Missile-specific SRD fact to dart-count/damage projection.
- Make runtime invocation-resource logic depend on procedure facts:
  action cost, slot-spend request, selected slot level, target cardinality, and
  target validity.
- Keep selected identity for refs/evidence only.

## Verification Baseline

Commands run for this audit:

- `pnpm check:authored-id-dispatch`

Result:

- Failed with the two unrelated character-creation fixture-support findings
  listed above.
- No QNT/TS runtime behavior was changed in this task, so MBT and proof lanes
  were intentionally not run.
