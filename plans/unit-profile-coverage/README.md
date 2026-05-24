# Unit Profile Coverage

This directory is the content/profile coverage layer for authored Surface Units.
It is intentionally separate from `plans/raw-coverage/`, which tracks coverage
of SRD rules text spans.

The Unit profile matrix answers which authored Units instantiate supported
mechanics profiles, which installed Units are explicitly unsupported or need
widening, which authored Surface Units are not yet admitted to the Unit catalog,
and which QNT/runtime/verification owners cover each supported profile.

The current executable backlog for SRD level 1 plus level 2 full-support claim
closure is `plans/LEVEL1_2_FULL_SUPPORT_BACKLOG.md`. Older Ralph lane files for
level-2 expansion and background catalog admission were removed after their
implemented work landed or their task lists became stale.

This lane is the authored-content breadth layer. It does not by itself prove
that reducer-owned semantics are fully connected to the rules kernel. For any
supported profile whose `profileKind` carries reducer-owned behavior, the
profile must also be joined to `plans/rules-kernel-coverage/` through
`plans/rules-kernel-coverage/profile-obligations.jsonl`.

## Collection Boundaries

`srd-5.2.1` is the shipped SRD Surface Unit collection. Its records must carry
only SRD 5.2.1 provenance and Creative Commons SRD distribution policy.

`classic-2024-non-srd-mechanics` is the public renamed mechanics-only lane for
Classic 2024 mechanics that are not already covered by the SRD collection. SRD
5.2.1 is conceptually part of Classic, but it is stored separately because it
has clean SRD provenance and distribution terms. The combined Classic library is
a derived view:

```text
classic2024UnitLibrary =
  srd521UnitCollection
  + classic2024NonSrdMechanicsUnitCollection
```

The derived view is never authored directly.

## Claim Convention

Owner artifacts use a separate claim prefix from RAW coverage:

```text
<claim-prefix> <claim-kind> <profile-id> [<profile-id> ...]
```

where `<claim-prefix>` is `UNIT-PROFILE-COVERAGE:`.

Supported claim kinds are `qnt-owner`, `runtime-owner`,
`verification-owner:qnt-proof`, `verification-owner:focused-mbt`,
and `verification-owner:runtime-test`.

`unit-evidence.jsonl` records concrete Unit identity evidence. The evidence row
does not restate profile ids; the checker derives those from `unit-claims.jsonl`
so profile classification stays single-source. Rows use exactly `unitId` plus
`evidence.tag`, `evidence.taskId`, and `evidence.ownerPath`; there are no
optional evidence fields. Evidence owner paths are repo-relative source paths;
`selected-identity-mbt` owners must be `.mbt.test.ts` source tests. Evidence
owners must also carry a matching marker:

```text
UNIT-IDENTITY-EVIDENCE marker fields:
<evidence-tag> <task-id> <unit-id> [<unit-id> ...]
```

`selected-identity-mbt` is the historical evidence tag for selected Unit
identity replay through an MBT/QNT owner. The deterministic replay rows required
by this tag are identity/wiring witnesses, not MBT coverage by themselves.

Rows with this tag also require owner-local replay markers:

```text
UNIT-IDENTITY-MBT-REPLAY marker fields:
<task-id> <unit-id> <driver-action> [<driver-action> ...]
```

The checker treats these replay markers as the wiring witness for
`selected-identity-mbt`: every selected evidence row must name at least one
driver action for that Unit id, every replay action must be declared in an
owner-local driver schema, and every replay action must be reachable from a
Quint `step` action passed to an owner-local `run()` call.

Rows with this tag must also have owner-local deterministic replay data and an
owner-local deterministic replay test consumer. That replay test is the
executable witness that the named actions actually run, compare the same
projection shape, and bind the claimed Unit id at a Unit-bearing production
boundary per claimed action. The replay marker, deterministic replay data, test
consumer, and `unit-evidence.jsonl` are bidirectional. If a driver action name
changes, falls out of the executable Quint action set, stops matching
deterministic replay data, or stops binding the claimed Unit id during the
deterministic replay, the coverage check or replay test fails.

The deterministic replay consumer is an identity/wiring witness, not MBT
coverage for reusable reducer semantics. Use rules-kernel focused MBT when the
risk is sequencing, holes, reactions, resources, active-effect lifecycle, or
interleavings.

Current evidence tags are:

- `deterministic-admission-projection`: a focused catalog/runtime test loads the
  authored Unit through the production Unit catalog, or loads a public
  mechanics-only Classic fixture through its policy fixture boundary, and proves
  the production support/projection boundary admits it.
- `selected-identity-mbt`: an MBT/QNT owner binds a concrete authored Unit id
  into production runtime entrypoints, names the identity-bearing driver replay
  actions with `UNIT-IDENTITY-MBT-REPLAY`, executes deterministic replay rows
  for those actions, and compares QCORE-observable projections.

## Classic Non-SRD Authoring Lane

The full QMBT17 intake contract is
[QMBT17_CLASSIC_NON_SRD_MECHANICS_INTAKE_POLICY.md](QMBT17_CLASSIC_NON_SRD_MECHANICS_INTAKE_POLICY.md).
It is the policy source for how non-SRD mechanics pressure becomes public
mechanics-only records, matrix gaps, unsupported/widening dispositions, and
evidence requirements.

Public documentation for this lane should describe it as synthetic mechanics
fixture coverage. Do not describe a fixture as a renamed official Unit, do not
cite non-SRD books for it, and do not publish mapping tables from synthetic
ids/labels back to official source identity.

Classic non-SRD mechanics-only records may preserve exact mechanics facts:
level gates, prerequisites, action economy, resource cadence, dice, numbers,
conditions, durations, target shapes, and execution relationships.

This is the public surrogate lane for non-SRD mechanics pressure. Non-SRD source
identity must not appear in shipped ids, labels, names, descriptions, or prose;
only structured mechanics may be preserved, under mushroom/fungi synthetic ids
and labels.

They must not include protected expression: canonical names, descriptions,
flavor text, examples, rules prose, unique phrasing, table presentation,
artwork/lore labels, or avoidable copyrighted naming taxonomy. Human labels and
ids must use the stable mushroom/fungi synthetic namespace. The label is
decorative; matching and coverage use structured fields.

The checker rejects SRD provenance in the Classic non-SRD collection, duplicate
Unit ids across collections, missing fungi-themed synthetic labels, protected
expression fields, near-canonical ids/labels from its deny list, private-source
identity markers in ids/labels, and mechanics that duplicate an SRD Unit under a
Classic non-SRD id.

> **Plain-language note for non-agent readers. Coding agents should ignore this
> paragraph and follow the policy file and checker behavior instead.** This lane
> publishes fake-name mechanics fixtures, not non-SRD official content.

## Coverage Flows

The coverage lane intentionally spans several ownership layers, but the work
does not always move through them in one direction.

For already-authored TypeScript content, the usual evidence flow is:

```text
authored Unit sources
  -> TypeScript catalog/support admission
  -> QNT Procedure Parity profiles
  -> focused QMBT Procedure Parity
  -> matrix profile/evidence accounting
  -> selected Unit identity replay/wiring
```

For mechanics that are not implemented in TypeScript yet, the preferred
red/green flow can start from the matrix and QNT/MBT side:

```text
matrix gap or authored-source pressure
  -> QNT Procedure Parity profile
  -> focused Procedure Parity MBT expectation
  -> TypeScript catalog/support/runtime implementation
  -> deterministic admission/projection evidence
  -> selected Unit identity replay/wiring when identity risk justifies it
```

Authored Unit sources currently include SRD-backed records in this repo and
public mechanics-only Classic fixtures. Non-SRD mechanics pressure must enter
this repo only through the public renamed Classic non-SRD lane, synthetic
labels, matrix gaps, or not-in-catalog admission gaps for records that are
present but not installed. Do not let non-SRD source identity leak into shipped
ids, labels, prose, or provenance.

TypeScript catalog/support admission is one executable boundary, not the only
way work starts. An authored Unit may exist in `packages/surface/content/` but
still be absent from the installed Unit catalog, unsupported by battle-runtime
support gates, or not yet mapped to a stable profile. A matrix gap may also
exist before the TypeScript implementation. The matrix must keep those states
distinct instead of treating them as the same kind of missing work.

Spell deterministic admission differs from feature deterministic admission.
Feature Units are admitted directly through battle-runtime feature support
profiles. Spell Units are first loaded as Spell Definitions from the production
Unit catalog, then installed as creature-owned Spell Access, and finally
projected by `discoverBattleActs` into runtime Spell Invocation subjects,
initial holes, and spell-act ids. Evidence for a spell Unit should exercise
that full catalog/access/invocation path rather than call a spell-shape helper
or copy a parallel list of supported spell ids.

## Workflow

This matrix has two verification layers:

- **Procedure parity**: focused QMBT lanes prove structural QCORE profiles
  through production reducers. These are representative semantics tests for
  the profile, not a catalog loop over every authored Unit id.
- **Specific Unit parity**: Unit claims prove that each authored Unit id is
  classified into supported profiles or an explicit unsupported/widening
  disposition. Deterministic catalog/projection tests should cover supported
  Unit claims; focused MBT should be added only for representative or high-risk
  Unit identities.

Deterministic admission/projection coverage counts supported Unit ids with
`unit-evidence.jsonl` evidence tagged `deterministic-admission-projection`.
Selected identity replay coverage counts supported Unit ids with evidence
tagged `selected-identity-mbt`. Both denominators are the supported Unit claims
in this matrix; unsupported and widening rows remain closure dispositions, not
test omissions.

## Rules-Kernel Join

The coverage stack is intentionally layered:

```text
authored Surface Unit
  -> Unit catalog/support admission
  -> supported mechanics profile
  -> rules-kernel semantic obligation
  -> QNT owner
  -> executable TS parity witness
```

`profiles.jsonl` remains the Unit-profile source for profile definitions and
profile-local QNT/runtime evidence. `profile-obligations.jsonl` in the
rules-kernel lane is the only source for the profile-to-obligation join. Do not
copy that mapping into Unit claims, profile rows, or obligation rows.

The generated Unit reports include rules-kernel join metrics so authored-content
support and reducer-kernel coverage can be read together without merging their
denominators. A `supported-profile` Unit claim means the authored Unit is
admitted to a typed support profile; it counts as full rules-kernel chain
coverage only when every reducer-owned profile for that Unit maps to covered
rules-kernel obligations.

## Done-State Gate

Any task that adds or changes `UNIT-IDENTITY-EVIDENCE`, `unit-claims.jsonl`,
`unit-evidence.jsonl`, `profiles.jsonl`, Surface catalog admission, or profile
owner markers must run `pnpm unit-profile-coverage:check --write` before the
task can be marked `done`. The generated inventory and matrix artifacts in this
directory are part of the task output and must agree with `ACTIVE_PLAN.md`.
Any task that changes `plans/rules-kernel-coverage/profile-obligations.jsonl`,
rules-kernel obligations, or rules-kernel covered status must run both
`pnpm rules-kernel-coverage:check --write` and
`pnpm unit-profile-coverage:check --write`, because Unit reports derive their
rules-kernel join view from the rules-kernel lane.

The checker-visible disposition is the source of truth for support status.
When a Unit supports only an executable subset of the SRD text, use
`profile-subset-supported` and list both `supportedMechanics` and
`deferredMechanics` with follow-up task ids. Do not hide omitted SRD clauses
behind a full `supported-profile` claim just because catalog admission passes.

The generated report includes a `Metric Semantics` section, and
`unit-matrix.json` includes the same definitions under `metricSemantics`.
Those definitions are the local authority for each metric's planning question,
measure, and denominator. The installed collection inventory row is a
report-health count, not coverage, because the checker has no independent
expected-inventory boundary. Passive profiles count in the executable profile
evidence denominator when they have production runtime semantics, even though
they do not create a player-selectable action.

For level-1 planning, the default progress metric is not the broad Unit profile
coverage percentage in `UNIT_REPORT.md`. Use `SRD_UNIT_INVENTORY.md`'s
`Default Progress Metric: Level-1 Battle Readiness`: a row counts only when the
Unit/source fact is loaded, character-creation availability is covered where
applicable, and battle-relevant behavior is fully usable in battle. Rows with no
battle effect count as accepted only through explicit non-runtime or
catalog-only closure.

## SRDINV31 Attack-Rider Profile Policy

`spell.invocation-weapon-damage-rider` is the Divine Favor procedure shape: a
Bonus Action self spell creates a timed active effect on the caster, and later
weapon-hit resolution adds the spell's damage dice. It does not cover spells
whose casting time is immediately after a hit.

`spell.invocation-marked-damage-rider` is the Hunter's Mark combat procedure
shape: a Bonus Action Concentration spell marks one combatant target, later
Attack Roll hits against that mark add spell damage, caller-supplied Wisdom
(Perception or Survival) Ability Check holes to find the marked target get
Advantage from the existing mark identity, and a Bonus Action transfer is
available only after the marked target drops to 0 Hit Points. SRDINV62 added
slot-scaled maximum duration to this profile. SRDINV87C added the finding
Advantage roll-mode projection without adding duplicate Hunter's Mark tracking
state: the runtime consumes the existing mark plus caller-supplied actor,
ability, skill, and target facts.

`spell.invocation-after-hit-damage` is the Divine Smite procedure shape: the
spell is not an ordinary turn spell act; it is offered only from an eligible
already-hit melee weapon or Unarmed Strike window, spends the current turn Bonus
Action and Spell Slot, and splices its damage dice into the interrupted attack
damage roll.

Future SRDINV31 tasks must introduce distinct profiles when the executable
procedure shape changes. Ensnaring Strike and Searing Smite are after-hit
ongoing lifecycles with start-turn and save/end procedures, and True Strike is a
spell-hosted weapon attack. Reusing existing rider profiles for those shapes
would conflate different SRD triggers.

Package-local QNT should be updated whenever the runtime adds or changes a
promoted state fact, active-effect lifecycle, resource/turn sequencing rule, or
cross-event damage calculation for these profiles. Focused reducer/admission
tests are sufficient for deterministic catalog projection and narrow support
gates. Add battle-runtime MBT only when the risk is sequencing or state-space
interaction across turns, transfers, concentration breaks, recurring triggers,
or after-hit windows.

## SRD Unit Inventory

`srd-unit-inventory.json` and `SRD_UNIT_INVENTORY.md` are generated backlog
artifacts for SRD text-derived Unit/catalog rows. They are intentionally a
separate denominator from RAW span coverage and from model-based tests: the
rows answer what class/class-feature/spell-access/equipment/mastery pressure
exists, whether current Surface can author it, whether authored Surface content
exists, whether it is installed in the SRD Unit catalog, and what explicit
disposition closes the row for planning.

The generated report also emits `Recommended Ralph Batches`. These are mirrored
in `plans/ACTIVE_PLAN.md` as the `SRDINV*` queue when the SRD inventory frontier
is active. This lane is not QMBT unless a later batch deliberately promotes
battle-runtime behavior.

Installed SRD inventory rows distinguish catalog admission from operational
owner evidence. Battle-runtime owner evidence is derived from the durable Unit
profile matrix: `unit-claims.jsonl` must classify the Unit as an SRD
`supported-profile`, and `unit-evidence.jsonl` must carry deterministic
admission/projection evidence for the same Unit id. Character-creation rows
must not be promoted to owner-evidence-present until a checker-readable
character-creation evidence artifact maps SRD inventory row ids to discovery,
fill, finalization, and build projection coverage; executable tests alone are
not a row-level evidence manifest for this generator.

The first generated scope inventories all SRD class files under
`.references/srd-5.2.1/Classes/`, with level-1 class rows prioritized first and
cantrip/level-1 spell-list entries tracked as Spell Unit pressure. Regenerate
these artifacts with:

```sh
node scripts/unit-profile-coverage-check.cjs --write
```

QMBT16 decided not to add selected spell identity MBT rows for the currently
supported spell Units. The rationale is recorded in
[QMBT16_SELECTED_SPELL_IDENTITY_MBT_DECISION.md](QMBT16_SELECTED_SPELL_IDENTITY_MBT_DECISION.md):
QMBT5 already replays the supported spell procedures with concrete spell ids,
and QMBT14 covers catalog/access/invocation admission for those identities.

QMBT23 decided that `fire_bolt` still needs an explicit object-target Spell
Invocation and object-ignition Spell Effect projection before it can be counted
as a supported spell Unit. The decision is recorded in
[QMBT23_FIRE_BOLT_OBJECT_TARGET_BOUNDARY_DECISION.md](QMBT23_FIRE_BOLT_OBJECT_TARGET_BOUNDARY_DECISION.md).

QMBT28 selected the next spell admission batch after Shield and Healing Word:
direct Hit Point restoration for `cure_wounds` and `mass_healing_word`. The
triage is recorded in
[QMBT28_SPELL_ADMISSION_TRIAGE.md](QMBT28_SPELL_ADMISSION_TRIAGE.md), and
keeps `fire_bolt` excluded until the QMBT23 object-target boundary lands.

QMBT31 promoted `feat_savage_attacker` as
`unit-feature.weapon-damage-dice-roll-choice`. QMBT32 promoted `cure_wounds`
and `mass_healing_word` as `spell.hit-point-restoration`. QMBT33 reviewed
those closeouts and appended QMBT34-QMBT36 because the matrix lane is not
complete; the next spell implementation target is `mass_cure_wounds`, whose
new boundary over QMBT32 is point-origin Sphere target selection.

QMBT37 promoted level-5 Fighter, Paladin, and Ranger Extra Attack as
`unit-feature.attack-action-attack-count-scaling`. QMBT38 selected
`barbarian_fast_movement` as the next feature widening slice under
`unit-feature.passive-speed-bonus`. QMBT39 reviewed those closeouts and
appended QMBT40-QMBT42 because the matrix lane is not complete.

QMBT40 promoted `barbarian_fast_movement` as
`unit-feature.passive-speed-bonus`. QMBT41 selected `ranger_roving` as the next
feature widening slice under `unit-feature.passive-speed-kind-grants`. QMBT42
split Shield runtime behavior tests out of Unit profile admission. QMBT43
reviewed those closeouts and appended QMBT44-QMBT46 because the matrix lane is
not complete.

QMBT44 promoted `ranger_roving` as
`unit-feature.passive-speed-kind-grants`. QMBT45 selected
`orc_relentless_endurance` as the next feature widening slice under
`unit-feature.zero-hit-point-replacement`. QMBT46 reviewed those closeouts and
appended QMBT47-QMBT49 because the matrix lane is not complete.

Run:

```sh
pnpm unit-profile-coverage:check
```

The check command keeps `scripts/unit-profile-coverage-check.cjs` as the CLI
orchestrator and splits the matrix pipeline into owned modules:
`unit-profile-coverage-discovery.cjs` for installed/authored Unit discovery,
`unit-profile-coverage-claim-scan.cjs` for owner marker scanning,
`unit-profile-coverage-validation.cjs` for claim/evidence gates,
`unit-profile-coverage-report.cjs` for matrix metrics and Markdown rendering,
and `unit-profile-coverage-config.cjs` for shared coverage vocabulary. Add new
rules to the module that owns that boundary instead of growing the CLI script.

When intentionally changing claims or installed collection inventory, regenerate
the matrix and report with:

```sh
node scripts/unit-profile-coverage-check.cjs --write
```

New Unit authoring tasks must add or update `unit-claims.jsonl`. New QCORE work
that proves Unit-facing mechanics must cite profile ids. New QMBT work that
adds runtime parity must cite the same profile ids.

The generated matrix also audits every authored Unit-shaped JSON record under
`packages/surface/content/`. Records that are not installed through
`packages/surface/src/surface/unit-catalog.ts` are retained in the matrix with
`catalogAdmission.status = "not-in-unit-catalog"` so the gap between authored
content and shipped catalog inventory is explicit. Those rows also carry a
single generated `catalogAdmission.disposition` so the raw inventory remains
separate from planning pressure:

- `srd-candidate` for SRD spell records with executable mechanics that belong
  in the spell admission evidence lane.
- `unsupported-widening-pressure` for executable SRD feature-style records that
  need an explicit unsupported profile or widening slice.
- `intentional-backlog` for authored executable data outside the active QMBT
  feature/spell lane, such as magic items.
- `classic-private-pressure` for non-SRD pressure that must enter through the
  Classic non-SRD policy lane.
- `non-runtime-authored-data` for records without a mechanics payload.
- `duplicate-content-issue` for repeated authored Surface Unit ids that should
  be cleaned up before admission planning.

## Class Catalog Admission

The broad content survey and this Unit profile matrix are intentionally not the
same artifact. The survey inventories SRD pressure; this matrix tracks authored
Surface Unit records, installed catalog admission, support profiles, and
evidence. Class coverage therefore needs an explicit catalog-admission backlog,
not a memory of having surveyed class text once.

QMBT65 owns the next planning step:
[QMBT65_SRD_CLASS_CATALOG_ADMISSION_PLAN.md](QMBT65_SRD_CLASS_CATALOG_ADMISSION_PLAN.md).
That task should preserve generated `needs-surface-widening` and
`unsupported-widening-pressure` rows, make all 12 SRD class containers
trackable, attach class-feature gaps to class/level priority, and recommend
coarse Ralph batches rather than one task per Unit id.
