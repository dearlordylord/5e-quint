# L3MSPELL-04 Continual Flame Light Projection

Task 4 consolidated Continual Flame light projection evidence against the
existing `spell.invocation-object-light` profile. No runtime behavior, Surface
shape, QNT owner, or MBT driver was added.

## Source Review

Local RAW sources checked:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md#Continual Flame` for
  Continual Flame.
- `.references/srd-5.2.1/Rules-Glossary.md#Magic [Action]` for the Magic
  action rule that maps action-casting-time spells to the Magic action.
- `UBIQUITOUS_LANGUAGE.md#Spell Ownership Terms` for Spell Definition, Spell
  Invocation, and Spell Effect ownership.
- `UBIQUITOUS_LANGUAGE.md#Vision and Light` for Illumination, Obscurement, and
  Darkvision.

Relevant RAW facts:

- Continual Flame is a level-2 Magic Action spell with Touch range and an
  until-dispelled duration.
- The target is an object touched by the caster.
- The effect casts Bright Light in a 20-foot radius and Dim Light for an
  additional 20 feet.
- Regular-flame appearance, no-heat/no-fuel presentation, covering/hiding, and
  not-smothered/not-quenched adjudication are presentation/table facts outside
  the current object-emitter reducer boundary.

## Existing Evidence Chain

Surface shape:

- `packages/surface/content/continual_flame.dhall` and generated
  `packages/surface/content/continual_flame.json` encode an activation spell,
  level 2, Action casting time, Touch range, permanent `endsOn = ["dispel"]`,
  one object hole, and a direct `emit_light` effect with Bright 20 feet plus Dim
  20 additional feet.
- `plans/unit-profile-coverage/unit-claims.jsonl` keeps `continual_flame` as
  `profile-subset-supported` under `spell.invocation-object-light`; the
  supported subset is object-light invocation/projection, while component
  legality and presentation residuals stay deferred to their proper owners.

QNT witness/proof ownership:

- `packages/battle-runtime/battle-runtime-light.qnt` is the qnt owner for
  `spell.invocation-object-light` and
  `BATTLE.SPELL.OBJECT_LIGHT_EMITTER_LIFECYCLE`.
- `packages/battle-runtime/battle-runtime-light-concentration-movement-reaction-tests.qnt`
  proves the Continual Flame object emitter records Bright/Dim 20-foot light,
  spends the Spell Slot, records no combatant active effect, preserves prior
  same-caster Continual Flame emitters, survives duration ticks through
  `UntilDispelledLightEmitterExpiration`, and exposes tracked ongoing Spell
  Effect facts for Dispel Magic.

Production reducer reachability:

- `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/object-light.ts`
  admits Continual Flame by parsed Surface shape and component/duration facts,
  not by a separate Continual Flame reducer.
- The admitted invocation uses `procedure: "objectLight"`, `resource:
  "spellSlot"`, `targeting.object.kind: "touchedObject"`, Bright/Dim 20-foot
  light, and `expiresAt: { kind: "untilDispelled" }`.
- Resolution goes through the shared object-light fill path, applies one
  `spellLightEmitter` on the selected object, records generic
  `sourceEffectId`/`sourceSpellLevel` facts for other spell-effect owners, and
  spends the Magic Action plus Spell Slot.

MBT and replay evidence:

- `packages/battle-runtime/src/unit-profile-admission-object-light-spells.test.ts`
  is the deterministic admission/projection owner for
  `L12G-SPELL-CONTINUAL-FLAME`.
- `packages/battle-runtime/src/level2-protection-spell-selected-identity.mbt.test.ts`
  includes `UNIT-IDENTITY-REPLAY:
  B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH continual_flame
  doDiscoverContinualFlameObjectLight`.
- `packages/battle-runtime/battle-runtime-level2-protection-spell-selected-identity.mbt.qnt`
  exposes `doDiscoverContinualFlameObjectLight` through `step`, and the TS
  witness asserts the production action subject is a `spellSlotInvocationRef`
  for `continual_flame`, slot level 2, procedure `objectLight`.

Coverage ledgers:

- `plans/unit-profile-coverage/profiles.jsonl` binds
  `spell.invocation-object-light` to `packages/battle-runtime/battle-runtime-light.qnt`,
  `packages/battle-runtime/src/battle-reducer.ts`, and
  `packages/battle-runtime/src/unit-profile-admission-object-light-spells.test.ts`,
  with task ref `L12G-SPELL-CONTINUAL-FLAME`.
- `plans/rules-kernel-coverage/obligations.jsonl` binds
  `BATTLE.SPELL.OBJECT_LIGHT_EMITTER_LIFECYCLE` to both Light and Continual
  Flame RAW evidence and to the same object-light QNT/runtime/MBT owners.
- `plans/unit-profile-coverage/unit-evidence.jsonl` records both deterministic
  admission projection and selected-identity replay evidence for `continual_flame`.
- `plans/unit-profile-coverage/unit-matrix.json` joins `continual_flame` to
  `spell.invocation-object-light`, the object-light owners, and both evidence
  rows.

## Boundary Decision

Continual Flame light projection is already represented by the existing
object-light implementation. Do not add a Continual Flame-specific light
reducer, remover registry, duplicate light projection state, or fresh promoted
unit tracer bullet.

The remaining deferred mechanics are unchanged from Task 3: costly consumed
Material component legality belongs to a character inventory/equipment
component legality owner, and regular-flame presentation/covering/hiding/no
heat/no fuel/not smothered/not quenched adjudication belongs to the
runtime-detached object presentation or table owner.

## Plan Impact

- L3MSPELL-04 can close as evidence consolidated.
- L3MSPELL-11 can remain in its current queue position; this task found that
  Continual Flame already has selected-identity replay through the
  production object-light subject.
- L3MSPELL-12 should include this note when consolidating spell-boundary
  evidence.

## Reviewer Loop Convergence

- Round 1: rejected adding a Continual Flame-specific reducer because Surface,
  QNT, runtime, and ledgers already route the light projection through
  `spell.invocation-object-light`.
- Round 2: retained the existing deferred component and presentation residuals.
  They are not evidence gaps in object-light projection and should not be
  converted into duplicate battle state.
