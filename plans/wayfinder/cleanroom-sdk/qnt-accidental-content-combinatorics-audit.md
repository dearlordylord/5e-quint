# QNT Accidental Content Combinatorics Audit

Wayfinder research for [Audit QNT semantics for accidental content
combinatorics](https://github.com/dearlordylord/5e-quint/issues/15), investigated
at source commit `06e2428abcf63dc3b407b1840bccaf3f4532c68d`.

The continuation inventory in this audit is reproducible with read-only
commands:

```sh
rg -n 'type ReactionContinuation|Resume[A-Z]|reactionContinuationKind' \
  packages/battle-runtime packages/shared-algebras/proofs/rule-core \
  -g '*.qnt'
rg -n 'IceKnife|ShieldReactionProcedure|ResumeIceKnife' \
  packages/battle-runtime packages/shared-algebras/proofs/rule-core \
  -g '*.qnt'
rg -n 'BATTLE.REACTION.OFFER_DECLINE_RESUME|BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS' \
  plans/rules-kernel-coverage/{obligations,generator-readiness}.jsonl
```

## Scope and classification

This audit locates source facts and decides what kind of evidence each current
artifact supplies. It does not repair QNT, change TypeScript, choose the final
portable continuation representation, or expand the Cleanroom Core.

The classifications are:

- **reusable domain semantics**: identity-independent rules over typed facts,
  suitable for reuse by every authored record with that shape;
- **authored content projection**: a formal statement of one record's RAW facts;
  content-specific but not by itself accidental combinatorics;
- **accidental combinatorics**: a special path for a pair of otherwise reusable
  capabilities when RAW defines no rule for that pair;
- **literal-only evidence**: a QNT action that records an expected projection
  without deriving it from rule semantics; useful as a reachability or
  selected-identity witness, but not a semantic oracle;
- **missing semantics**: behavior production TypeScript performs for which the
  active cleanroom-eligible QNT owner cannot derive the corresponding transition.

Authored identity in a catalog, selected-identity witness, provenance record, or
true RAW cross-record reference is not automatically a defect. The deciding
question is whether changing a record's mechanics while retaining synthetic
identity would preserve the old behavior because QNT or a reducer dispatched on
the identity or on a pair-specific continuation.

## Result at a glance

| Area                                                           | Current evidence                                                                                                                                                                                                  | Classification                                                | Required disposition                                                                                |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Reaction offer, decline, spend, nested-window restoration      | `reactions-continuations-concentration.qnt` and `battle-runtime-reaction-window.qnt`                                                                                                                              | Reusable domain semantics                                     | Preserve and compose with an explicit interrupted-procedure model                                   |
| Ice Knife attack, burst, save-success policy, and slot scaling | `spell-attack-burst-save-damage-core.qnt` plus the focused battle slice                                                                                                                                           | Authored content projection over partly reusable functions    | Separate mechanics input from procedure algorithm; do not make the spell id the reducer rule        |
| Shield applied to an Ice Knife hit                             | `ResumeIceKnife` plus `resolveIceKnife(...literal fills...)`                                                                                                                                                      | Accidental combinatorics                                      | Replace with capability/procedure continuation and calibrate it through production TypeScript       |
| Other spell-specific Reaction continuations                    | `ResumeRayOfFrost`, `ResumePoisonSpray`, `ResumeChillTouch`, `ResumeTrueStrikeWeaponAttack`, `ResumeProduceFlameHurl`, `ResumeFlameBladeAttack`, and the Acid Splash implementation behind `ResumeSaveGateDamage` | Accidental combinatorics                                      | Remove the identity matrix; replay or resume a typed procedure state                                |
| Magic Missile immunity from Shield                             | Shield's explicit Magic Missile trigger and immunity                                                                                                                                                              | RAW-defined cross-record exception                            | Preserve as a typed trigger/effect or explicit authored cross-record reference                      |
| Hellish Rebuke after-damage payload                            | `ResumeHellishRebukeAfterDamage`                                                                                                                                                                                  | Content-specific procedure semantics, not an accidental pair  | Admit from typed trigger and procedure facts; avoid authored-id dispatch                            |
| Movement/Command/Dissonant Whispers continuation variants      | content/procedure-named continuations around Opportunity Attacks                                                                                                                                                  | Legitimate rule composition represented with high connascence | Model the post-interrupt procedure phase, not a matrix of feature names                             |
| Level-1 damage-spell selected-identity QNT                     | literal `recordProjection` actions, including Ice Knife hit and miss                                                                                                                                              | Literal-only evidence                                         | Retain as selected-identity reachability evidence, never promote it as the semantic owner           |
| Ice Knife attack and burst damage lifecycle                    | QNT and TypeScript use separate damage phases but one combined Concentration decision                                                                                                                             | Undocumented modeling choice                                  | Trace the combined check to RAW or settle it in `ASSUMPTIONS.md` before portable admission          |
| Shield × arbitrary interrupted attack/spell parity             | generic rule-core MBT covers window protocol but not payload replay                                                                                                                                               | Missing semantics/calibration                                 | Add a focused computed semantic owner and QNT-connected TypeScript parity at the production reducer |

## Findings

### 1. RAW composes Shield with attack resolution; it does not define an Ice Knife–Shield rule

Ice Knife requires a ranged spell attack, applies Piercing damage only on a hit,
and explodes hit or miss
(`.references/srd-5.2.1/Spells/Descriptions-E-L.md:1307-1318`). Shield triggers
when its caster is hit by an attack roll, adds +5 AC including against the
triggering attack, and separately names Magic Missile
(`.references/srd-5.2.1/Spells/Descriptions-S-Z.md:215-224`). The general
Reaction rule says the interrupted creature continues after the Reaction
(`.references/srd-5.2.1/Playing-the-Game.md:326-332`).

Therefore the required composition is:

```text
attack roll provisionally hits
  -> generic attack-hit Reaction window
  -> Shield may change the triggering attack's AC result
  -> resume the same interrupted procedure
  -> Ice Knife's hit-only attack damage follows the final hit result
  -> Ice Knife's hit-or-miss burst still follows
```

Nothing in RAW makes that sequence part of Ice Knife's identity or creates a
distinct `IceKnifeShield` procedure. Magic Missile is the important
counterexample: RAW really does name that record, so a typed Shield trigger and
immunity for Magic Missile is an authored cross-record rule rather than
accidental combinatorics.

### 2. Active focused QNT implements the pair by naming Ice Knife in the continuation

`ReactionContinuation` contains `ResumeIceKnife` beside six other spell-named
attack continuations (`packages/battle-runtime/battle-runtime-model.qnt:445-462`).
The Ice Knife resolver opens Shield's Reaction window with that variant
(`packages/battle-runtime/battle-runtime-save-gated-spell.qnt:1649-1681`).
The central resume function then maps the variant back to Ice Knife and supplies
ten representative literal inputs, including the original attack roll, both
Saving Throw outcomes, burst membership, both Concentration outcomes, and both
damage rolls
(`packages/battle-runtime/battle-runtime-reaction-resolution.qnt:180-199`).

The behavior is executable, but the representation is not a reusable rule:

- the continuation does not carry the interrupted procedure or its supplied
  facts;
- the resume dispatcher must know the authored spell variant;
- changing the Ice Knife scenario inputs requires coordinated edits to the
  resolver, resume literal, tests, continuation-kind mapping, and any bridge;
- adding another attack-roll spell creates another Shield-pair branch even when
  no new Reaction rule exists;
- a target implementation could reproduce this QNT by writing one branch per
  content pair, exactly the architecture the Cleanroom effort is intended to
  prevent.

This is strong connascence of identity, meaning, value, and execution across
distant files. The comment that these are "representative deterministic fills"
accurately describes the bounded fixture, but representative fills do not make
an authored continuation a domain abstraction.

### 3. Ice Knife is one member of a broader continuation matrix

The same union and dispatcher couple Shield/reaction resumption to these
content paths:

| Continuation                   | Resume implementation                                  | Assessment                                                               |
| ------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------ |
| `ResumeRayOfFrost`             | `resolveRayOfFrost(state, 15, 10, 4, true)`            | Spell identity plus fixed attack, damage, and Concentration facts        |
| `ResumePoisonSpray`            | `resolvePoisonSpray(state, 15, 10, 7, true)`           | Spell identity plus fixed facts                                          |
| `ResumeChillTouch`             | `resolveChillTouch(state, 15, 10, 6, true)`            | Spell identity plus fixed facts                                          |
| `ResumeTrueStrikeWeaponAttack` | `resolveTrueStrikeWeaponAttack(...)`                   | Spell/weapon composition plus eight fixed facts                          |
| `ResumeProduceFlameHurl`       | `resolveProduceFlameHurl(state, 15, 10, 5, true)`      | Spell mode identity plus fixed facts                                     |
| `ResumeFlameBladeAttack`       | `resolveFlameBladeAttack(state, 15, 10, 6, true)`      | Spell-created weapon identity plus fixed facts                           |
| `ResumeIceKnife`               | `resolveIceKnife(...)`                                 | Spell identity plus ten fixed attack/burst facts                         |
| `ResumeSaveGateDamage`         | `resolveAcidSplash(state, false, true, 4, true, true)` | Generic-sounding name whose implementation is one authored spell fixture |

`reactionContinuationKind` maps all seven named attack continuations to the same
`BattleRuntimeSpellAttackContinuation` category
(`packages/battle-runtime/battle-runtime-model.qnt:505-520`). That mapping is
direct evidence that the domain already recognizes one shared continuation
kind while the executable resume representation retains the accidental content
matrix.

The movement side has the same structural smell at lower degree:
`ResumeMovement`, `ResumeCommandFleeMovement`, and
`ResumeDissonantWhispersMovementThenAfterDamage` encode which originating
procedure resumes after an Opportunity Attack. Command's end-turn behavior and
Dissonant Whispers' after-damage sequence are real procedure differences, so
they cannot all collapse to bare movement. They should be states of typed
interrupted procedures, however, rather than rules dispatched by authored
feature name. `ResumeHellishRebukeAfterDamage` is also procedure-specific, but
Hellish Rebuke itself defines the after-damage Reaction; it is not evidence of
an accidental pair with the damaging content.

### 4. The reusable Reaction core stops before interrupted-procedure semantics

The rule-core Reaction slice models window kinds, one-Reaction spending,
bounded nested windows, decline, and restoration of a suspended window.
`advanceContinuation` only restores the suspended window; the state contains no
typed interrupted procedure or replay payload
(`packages/shared-algebras/proofs/rule-core/reactions-continuations-concentration.qnt:211-265`).
Its focused MBT adds a fixture-local movement increment after decline, rather
than asking the semantic core to resume an arbitrary procedure
(`packages/battle-runtime/rule-core-reactions.mbt.qnt:168-192`).

The coverage registry nevertheless describes
`BATTLE.REACTION.OFFER_DECLINE_RESUME` as covering "bounded continuation resume"
and points only to the reaction-window/core owners and that focused MBT
(`plans/rules-kernel-coverage/obligations.jsonl:7`). Generator readiness likewise
marks those files `generation-subset-clean`
(`plans/rules-kernel-coverage/generator-readiness.jsonl:6`). Those statements are
true for window progression and the bounded movement fixture, but they do not
establish that an arbitrary interrupted production procedure resumes with its
original inputs or that Shield composes with attack-roll procedures without
identity branches.

The missing semantic seam is not "more Ice Knife." It is a typed relationship
among an interrupt checkpoint, the Reaction's state change, and the suspended
procedure's next phase.

### 5. Production TypeScript already demonstrates the more general boundary

TypeScript's `BattleInterruptedProcedure` has a `replay` variant carrying the
original `BattleSubject` and `BattleFill[]`, plus separate variants for actual
post-interrupt procedure phases
(`packages/battle-runtime/src/battle-reducer.ts:977-1035`). Interrupt checkpoints
carry that continuation independently of their trigger
(`packages/battle-runtime/src/battle-reducer.ts:1328-1365`). The Ice Knife
attack/burst resolver opens both spell-cast and attack-hit checkpoints with
`{ kind: "replay", subject, fills }`
(`packages/battle-runtime/src/battle-reducer/spells-resolve-attack-burst.ts:246-264`
and the later attack-hit branch in the same file). Resumption exhaustively
handles domain continuation variants and otherwise replays the original subject
with the original fills and a handled-trigger guard
(`packages/battle-runtime/src/battle-reducer/dispatcher.ts:4808-4971`).

This does not make TypeScript the authority over QNT, and the replay shape is
not automatically the final formal design. It proves that the production
runtime is not forced to maintain the QNT's spell-name matrix. The final
specification must choose whether QNT models replay data, explicit procedure
phase state, or a smaller observational abstraction, then calibrate TypeScript
to that source model. It must not preserve the QNT matrix merely to avoid
changing a lower layer.

### 6. Ice Knife's rule-core profile mixes a reusable algorithm with a singleton authored table

`spell-attack-burst-save-damage-core.qnt` provides reusable functions for burst
dice scaling and save-success damage. Its `AttackBurstSaveDamageProfile` has
only `IceKnifeAttackBurstSaveDamageProfile`, and every mechanics fact is selected
by matching that authored profile
(`packages/shared-algebras/proofs/rule-core/spell-attack-burst-save-damage-core.qnt:16-85`).

This is not pairwise Shield coupling. It is an authored content projection plus
an algorithm. It is still a source-design decision for portability: a Target
SDK is supposed to admit parsed Surface mechanics, so the final specification
must state whether cleanroom-eligible QNT consumes a record of mechanics facts,
whether an authored projection module constructs that record, and how the
Surface-to-QNT relationship is checked. A singleton identity enum cannot by
itself prove that synthetic identity with the same mechanics follows the same
procedure.

The same distinction applies to other content-named spell profile tables and
active-effect variants. A name in a QNT example or authored projection is not a
reason to erase the artifact. A production semantic function that accepts only
that name when it could accept the typed facts is the calibration risk.

The focused Ice Knife battle slice also contains a separate modeling-decision gap. It
applies attack damage and burst damage, sums them, and makes one Concentration
decision against the total
(`packages/battle-runtime/battle-runtime-save-gated-spell.qnt:1590-1603`). Its
run-block test explicitly describes the behavior as combining the two damage
events for Concentration
(`packages/battle-runtime/battle-runtime-save-spell-tests.qnt:582-589`). RAW
requires a Constitution Saving Throw when a creature takes damage
(`.references/srd-5.2.1/Rules-Glossary.md:239-247`). Production TypeScript
matches the combined Concentration projection when both damages affect the
primary target (`packages/battle-runtime/src/battle-runtime-ice-knife.test.ts:247-415`),
while separately exposing attack and burst zero-HP replacement checkpoints and
a burst-only Concentration checkpoint
(`packages/battle-runtime/src/battle-runtime-ice-knife.test.ts:427-698`,
`779-904`).

No Ice Knife entry in `ASSUMPTIONS.md` explains why the two ordered damage
applications yield one combined Concentration check. The audit does not select
one or two checks from ambiguous evidence. Before this behavior becomes a
portable conformance obligation, source work must either trace the combined
check to specific RAW or record the required interpretation in
`ASSUMPTIONS.md`, then keep QNT and TypeScript calibrated to that decision. The
decision belongs in the shared damage lifecycle, not in an Ice-Knife-specific
copy.

### 7. The selected-identity driver is literal evidence, not the missing semantic owner

`battle-runtime-level1-damage-spell-selected-identity.mbt.qnt` defines a state
projection and records fixed end states. Its Ice Knife hit and miss actions do
not call the attack/burst core, attack-roll rules, Shield, damage adjustment, or
Concentration semantics; they call `recordProjection` with literal booleans and
hit points
(`packages/battle-runtime/battle-runtime-level1-damage-spell-selected-identity.mbt.qnt:3-65`,
`95-121`). The paired TypeScript test executes the production reducer and
compares the result with this QNT projection.

That is useful selected-identity evidence: the real SRD record can be selected,
admitted, and executed through production. It also gives a literal projection
witness appropriate to a deterministic scenario under ADR-0001. It does not
derive the expected result, distinguish a correct implementation from one that
memorized the same fixture, exercise Shield interruption, or provide reusable
Ice Knife semantics to another language.

The two `replayIceKnife*Branch` entrypoints added for source calibration improve
branch addressability, not semantic strength. Source readiness must retain this
artifact's `selected-identity-trace`/literal-witness role and must not count it
as the repair for missing procedure composition.

### 8. Existing coverage joins conflate adjacent green obligations with the missing composition

The coverage registry separately marks the general Reaction protocol and the
spell procedure-profile family covered
(`plans/rules-kernel-coverage/obligations.jsonl:7-9`). The latter owns Ice
Knife's attack/burst projection core but its focused parity witnesses cover
other rule-core spell subsets; the former owns Reaction windows but not the
interrupted spell payload. Joining two green rows by prose does not create an
executable composition edge.

For source readiness, the following are distinct evidence claims:

1. Reaction windows offer, decline, spend, and restore correctly.
2. Attack/burst/save/damage functions compute Ice Knife facts correctly.
3. A Shield Reaction mutates Armor Class and the same interrupted attack-burst
   procedure resumes exactly once with the original facts.
4. The production TypeScript reducer matches that QNT transition.
5. The selected SRD identity reaches the admitted production procedure.

Current active artifacts provide evidence for 1 and 2, broader runtime evidence
for 4, and selected-identity evidence for 5. The combined Concentration
interpretation still needs a source-side RAW/assumption decision, and no
identity-independent QNT semantic owner plus focused QNT-connected TypeScript
parity currently closes 3.

## Final-specification decisions

The final Cleanroom SDK specification must require the source-side repair to
make these decisions before the affected QNT enters the Cleanroom Core:

1. **Continuation domain.** Define the formal interrupted-procedure state by
   capability and phase. An authored spell id or spell-named variant may remain
   selection/provenance, but must not choose the resume algorithm.
2. **Captured facts.** Decide which original attack, target, fill, area,
   damage, save, slot, and continuation facts are stored versus recomputed.
   The representation must make it impossible to resume with a different set
   of representative literals.
3. **Trigger handling.** Encode that Shield can revise the triggering attack's
   final hit result, that resumption does not reopen the already handled
   attack-hit window, and that nested interrupts preserve stack order.
4. **Procedure continuation.** Encode Ice Knife's hit-only attack damage and
   hit-or-miss burst as phases of the admitted attack/burst procedure. Shield
   changes the attack result; it does not suppress the later burst.
5. **Shared damage lifecycle.** Attack damage and burst damage must flow through
   shared damage, zero-HP, after-damage, and Concentration semantics rather than
   Ice-Knife-specific copies. Decide from RAW or `ASSUMPTIONS.md` whether the
   primary target's ordered attack and burst damage require one combined or two
   Concentration checks; do not let a fixture literal choose silently.
6. **RAW cross-record exceptions.** Preserve Shield's Magic Missile trigger and
   immunity as an explicit typed rule. Do not generalize it away merely because
   most content pairs are accidental.
7. **Authored projection boundary.** Decide how Surface mechanics construct the
   QNT procedure facts and how synthetic-identity metamorphic cases prove that
   equal mechanics receive equal behavior. Singleton profile enums alone are
   insufficient for this connection.
8. **Focused semantic driver.** Add a leaf-bounded computed-oracle driver for
   the mutable Reaction/procedure composition. A literal witness must not
   reimplement or replace the reducer that is supposed to be the QNT oracle.
9. **TypeScript calibration.** Drive the production reducer through attack-hit
   offer, Shield take/decline, final hit/miss, burst continuation, damage, and
   Concentration branches. Use the same QNT actions/projection and compare state
   after each relevant transition.
10. **Evidence roles and gates.** Update obligation owners, QNT owner roles,
    generator readiness, branch calibration, and Unit joins so semantic core,
    focused MBT, literal projection witness, and selected-identity reachability
    remain separate executable claims.
11. **Matrix-removal acceptance.** Fail source readiness if adding a synthetic
    attack-roll spell with the already-admitted procedure shape requires a new
    Shield-specific continuation variant or resume branch.

These decisions should apply to the whole continuation inventory, not only to
`ResumeIceKnife`. The first implementation tracer can use Shield × Ice Knife
because it exposes attack-result revision followed by a mandatory hit-or-miss
phase, but completion requires removing or reclassifying every authored
continuation in the same domain.

## Map impact

This audit makes no implementation choice and adds no new ticket. Its decision
inputs are already owned by:

- [Trace QNT conformance through reducers and SDK workflows](https://github.com/dearlordylord/5e-quint/issues/16),
  which must distinguish semantic owners, focused parity, literal witnesses,
  and selected-identity reachability along the production path;
- [Define comprehensive QNT conformance](https://github.com/dearlordylord/5e-quint/issues/19),
  which must turn the source-repair and evidence-role decisions above into
  source-readiness and Target Adapter acceptance criteria; and
- the final specification synthesized by
  [Wayfinder: Language-neutral Cleanroom SDK readiness](https://github.com/dearlordylord/5e-quint/issues/12).

The audit does not require a new per-spell conformance matrix. Its central
acceptance rule is the opposite: composition follows typed domain capabilities,
and authored identity is exercised separately at catalog/selection boundaries.
