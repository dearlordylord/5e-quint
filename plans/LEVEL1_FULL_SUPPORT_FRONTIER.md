# Level-1 Full Support Frontier

Date: 2026-05-16

This is a parallel working plan for returning the level-1 runtime lane to a
strict support target. It lives in the
`codex/level1-full-support-frontier` worktree and does not replace or edit
`plans/ACTIVE_PLAN.md`.

## Working Mode

The tasks in this file are for us to work through directly. They are not Ralph
tasks yet.

Use this file to:

- define the stricter support target;
- research and clarify ownership boundaries;
- split broad gaps into implementable slices;
- decide which rows should be implemented, excluded, or represented by a
  non-battle runtime owner;
- produce a later Ralph handoff batch only after scope, RAW evidence,
  acceptance criteria, and verification are precise enough.

Do not copy these tasks into `ACTIVE_PLAN.md` or a Ralph queue until they pass
the Ralph Promotion Gate.

## Ralph Promotion Gate

A working-plan task is ready to become a Ralph-sized implementation task only
when it has:

- a narrow rule family or support-profile boundary;
- local SRD 5.2.1 references and `UBIQUITOUS_LANGUAGE.md` terms checked;
- a named package owner and likely touched artifacts;
- explicit in-scope and out-of-scope clauses;
- acceptance criteria tied to generated coverage artifacts or executable tests;
- verification commands that do not waste MBT;
- no unresolved product or ownership decision.

Until then, tasks remain working-plan items for this session.

## Parallel Ralph Batch Discipline

The eventual Ralph handoff may run as two or three parallel implementation
loops in separate worktrees. Ralph is expected to merge shared coverage files
when needed, but planning should still keep semantic ownership clear so parallel
branches do not make contradictory claim/status changes.

Preferred split:

- Runtime/code tasks own disjoint packages or modules.
- Coverage-claim tasks may touch shared files such as `unit-claims.jsonl`,
  `profiles.jsonl`, `unit-evidence.jsonl`, `UNIT_REPORT.md`, and
  `unit-matrix.json`; that is acceptable when each task owns disjoint Unit ids
  and uses the same strict closure taxonomy.
- Generated artifact refresh can happen per task or in one integration task.
  Use an integration task when several branches have changed the taxonomy or
  generated report shape, not merely because the files are shared.

Do not send Ralph a task that says "fix level-1 support" broadly. Send narrow
tasks with:

- owned files/packages;
- exact Unit ids;
- exact closure/profile semantics;
- RAW/source references;
- acceptance criteria tied to the strict report or focused tests;
- a verification lane that avoids unnecessary MBT.

## Ownership Vocabulary

The word "table-owned" is too broad for this plan. Use these narrower terms.

### Table-Supplied Runtime Witness

A fact the table/caller/session supplies into a runtime-owned procedure through
holes/fills or typed inputs. The runtime does care about the fact, but it does
not derive it.

Examples:

- affected targets inside a spell area;
- sight, range, cover, area membership, strong wind, falling, landing, legal
  destination, movement-cost, or object-disposition facts;
- caller-supplied line-of-sight or geometry-adjacent facts consumed by a battle
  spell or action.

These facts can be part of full runtime support. The runtime owns the source
effect, validation of the witness shape, and downstream mechanical consequence.
The table owns the observation/adjudication that makes the witness true.

### Runtime-Detached Table Adjudication

A rule consequence the application does not need to model or consume at all for
the current product goal. No runtime hole, fill, durable state, support profile,
or generated battle/character outcome is expected.

Examples:

- `alarm` ward adjudication;
- `identify` information disclosure;
- language communication;
- broad detection/exploration result narration;
- illusion/social adjudication that does not feed a modeled battle or character
  procedure.

These rows close as not-applicable for strict level-1 runtime support. They
must not be counted as runtime-supported profiles.

## Goal

Reach 100% level-1 support under a stricter definition than the current
product-readiness closure:

- every in-scope level-1 class/class-feature/cantrip/level-1 spell Unit with
  executable mechanics is either fully supported by the correct runtime/profile
  owner or explicitly excluded from this target by owner decision;
- `profile-subset-supported` does not count as full support until its deferred
  mechanics are implemented, moved to a precise accepted closure kind, or split
  into later-level/out-of-scope claims that cannot block level-1 support;
- companion/familiar work is excluded while it is handled in a separate worktree;
- selected identity MBT is useful where sequencing or identity-binding risk
  justifies it, but this plan does not require 100% selected identity MBT
  coverage for every Unit.

## Current Baseline

Derived from `plans/unit-profile-coverage/srd-unit-inventory.json` and
`plans/unit-profile-coverage/unit-matrix.json`, scoped to level-1 rows,
cantrips, and level-1 spell pressure, excluding `find_familiar`:

| Metric | Count |
| --- | ---: |
| In-scope executable Unit ids | 93 |
| Fully `supported-profile` | 59 |
| `profile-subset-supported` | 12 |
| `unsupported-profile` | 17 |
| No support claim / catalog-only executable pressure | 5 |

The strict support gap is therefore 34 Unit ids today.

This differs from the current product readiness metric, which is already
367/367 through accepted and accepted-no-battle-effect closures. The purpose of
this plan is to drive the stricter support gap down, not to reopen readiness
accounting by accident.

## Pre-Research Pass 1 - Gap Groups

This pass joined the generated SRD inventory to the generated Unit matrix. The
34 strict gaps group better by owning runtime boundary than by class or spell
list.

| Group | Units | First reading |
| --- | ---: | --- |
| Character-creation choice/container profiles | 10 | Close to closure. `@dnd/character-creation-runtime` already has discovery/fill/finalization/build-projection evidence; the Unit matrix still records these as non-battle unsupported profiles. |
| Character-sheet/rest profile accounting | 1 | Close to closure. Wizard Arcane Recovery already has Character Sheet runtime and owner evidence; the Unit claim/profile evidence is stale. |
| Later-level-only residuals | 2 | Close to closure for strict level 1 if the strict metric can treat later-level-only deferred mechanics as non-blocking for level-1 support without changing the all-level Unit claim meaning. |
| Hunter's Mark finding Advantage | 2 | Close by accounting/integration. The Ability Check roll-mode projection already appears in SRDINV87C code, QNT assertions, and runtime tests; the Unit claims still carry older deferred wording. |
| Table-supplied runtime witness profile promotion | 7 | Close by accounting if the existing witness boundaries and owner docs still match the generated evidence; do not require runtime geometry inference. |
| Runtime-detached table adjudication | 12 | Closed by owner decision. These are table adjudication, not runtime support work. |

Group detail:

- Character-creation choice/container profiles:
  `fighter_fighting_style`, `barbarian_weapon_mastery`,
  `fighter_weapon_mastery`, `paladin_weapon_mastery`,
  `ranger_weapon_mastery`, `rogue_weapon_mastery`,
  `warlock_eldritch_invocations`, `cleric_divine_order`,
  `druid_primal_order`, `rogue_expertise`.
- Character-sheet/rest profile accounting: `wizard_arcane_recovery`.
- Later-level-only residuals: `bard_bardic_inspiration`,
  `monk_martial_arts`. `ranger_favored_enemy` is not pure later-level-only
  because it also depends on Hunter's Mark finding Advantage.
- Hunter's Mark finding Advantage: `hunters_mark`,
  `ranger_favored_enemy`.
- Table-supplied runtime witness profile promotion: `faerie_fire`, `light`,
  `feather_fall`, `fog_cloud`, `grease`, `jump`, `thunderwave`.
- Runtime-detached table adjudication: `alarm`,
  `comprehend_languages`, `identify`, `silent_image`, `speak_with_animals`,
  `detect_evil_and_good`, `detect_magic`, `detect_poison_and_disease`,
  `druid_druidic`, `minor_illusion`, `rogue_thieves_cant`, `charm_person`.
  `charm_person` belongs here only for the remaining social aftermath; its
  battle-owned Charmed condition subset remains normal runtime support.

Recommended order:

1. Finish L1FS1 first so every future count is generated and reproducible.
2. Then handle the close accounting/profile groups: Hunter's Mark/Favored
   Enemy claim integration, character creation, Character Sheet Arcane
   Recovery, runtime-witness profile promotion, and pure later-level-only
   residuals.
3. Treat runtime-detached table adjudication rows as closed once the strict
   report can encode that closure without calling them runtime-supported.

Open domain/product questions:

- None currently blocking the metric shape. Table-supplied runtime witness rows
  should become `supported-profile` when the owning runtime already consumes the
  witness and applies the consequence. Runtime-detached table adjudication rows
  should close through explicit runtime-detached closure claims, not supported
  profiles.

## Decisions

### Character And Sheet Runtime Count

Decision date: 2026-05-16

Character creation and Character Sheet support count as full support for the
strict level-1 goal. Full support is owned by the correct runtime/profile
boundary, not only by `@dnd/battle-runtime`.

### Runtime-Detached Table Adjudication

Decision date: 2026-05-16

`alarm`, `identify`, language/communication, detection, illusion adjudication,
and similar non-battle exploration/social facts should be handed to the table as
much as possible. The application does not need a runtime owner for those facts
unless a later product workflow explicitly introduces one.

For strict level-1 support, these rows should close automatically as
runtime-detached table adjudication. They count as done for the level-1 goal,
but they must not be mislabeled as `supported-profile` battle runtime behavior.

This decision applies beyond level 1 when the same shape appears again.

### Strict Metric Rationale

The strict metric is not a new source of truth and should not duplicate the
existing Unit matrix or SRD inventory. It is a generated view over those
artifacts plus explicit owner decisions such as
runtime-detached/not-applicable.

The reason to keep it executable is to prevent future planning loops from
confusing three different states:

- runtime-supported profile;
- strict-target closed because the row is runtime-detached/not-applicable;
- still-open support work.

Without an executable view, each review has to re-derive the 34-row gap by hand
and agents can drift back into treating 367/367 readiness, 85/117 supported
profile coverage, and strict level-1 closure as the same metric. The strict
view should be small: it answers only "is the current level-1 strict target
closed, and why?" from existing generated artifacts.

## Strict Closure Taxonomy Draft

Use these statuses for the strict level-1 report and Ralph task planning:

- `supported-profile`: full support exists at the correct runtime/profile
  boundary.
- `closed-runtime-detached-table-adjudication`: table handles the rule result
  entirely outside this product runtime; no runtime support profile is expected.
- `closed-character-fact-and-runtime-detached-split`: durable character facts are
  owned by CharacterBuild/Character Creation evidence, while only communication,
  information-disclosure, or presentation adjudication remains runtime-detached.
- `closed-companion-worktree`: excluded because companion/familiar work is owned
  by the separate companion worktree.
- `closed-later-level-only`: the level-1 behavior is complete and the remaining
  deferred mechanics occur only after level 1.
- `open-profile-accounting`: runtime behavior/evidence appears to exist, or the
  remaining executable boundary is already a table-supplied runtime witness,
  but Unit profile claims or deterministic evidence have not been updated.
- `needs-runtime-witness-audit`: likely closeable if existing table-supplied
  runtime witness boundaries cover every remaining executable consequence.
- `open-runtime-behavior`: real runtime/profile behavior still appears missing.

Pass-3 classification of the current 34 strict gaps after the runtime-witness
audit:

| Status | Count | Units |
| --- | ---: | --- |
| `closed-runtime-detached-table-adjudication` | 10 | `alarm`, `comprehend_languages`, `identify`, `silent_image`, `speak_with_animals`, `detect_evil_and_good`, `detect_magic`, `detect_poison_and_disease`, `minor_illusion`, `charm_person` |
| `closed-character-fact-and-runtime-detached-split` | 2 | `druid_druidic`, `rogue_thieves_cant` |
| `open-profile-accounting` | 20 | `fighter_fighting_style`, `barbarian_weapon_mastery`, `fighter_weapon_mastery`, `paladin_weapon_mastery`, `ranger_weapon_mastery`, `rogue_weapon_mastery`, `warlock_eldritch_invocations`, `cleric_divine_order`, `druid_primal_order`, `rogue_expertise`, `wizard_arcane_recovery`, `faerie_fire`, `light`, `feather_fall`, `fog_cloud`, `grease`, `jump`, `thunderwave`, `hunters_mark`, `ranger_favored_enemy` |
| `closed-later-level-only` candidate | 2 | `bard_bardic_inspiration`, `monk_martial_arts` |
| `needs-runtime-witness-audit` | 0 | - |
| `open-runtime-behavior` | 0 | - |

The seven former runtime-witness audit rows should not become reducer tasks.
Their remaining deferred mechanics are automatic table/presentation derivations
or table-supplied witness facts. The strict work is profile promotion and report
accounting, not geometry, pathfinding, line-of-sight, object-inventory, or
sound-propagation implementation.

Hunter's Mark and Favored Enemy should also not become reducer tasks from this
planning pass. Local SRD text, QNT assertions, and runtime tests show that the
finding Advantage behavior already exists; the remaining work is to remove stale
coverage wording and make the supported claim match SRDINV87C.

## Working Tasks

### L1FS1 - Define Strict Level-1 Support Metric

Status: `pre-researched`

Purpose: make the stricter target executable and reviewable without changing
`ACTIVE_PLAN.md`.

Implementation shape:

- Add a generated strict level-1 support view to the existing
  `unit-profile-coverage:check` pipeline, not a new authored source table.
- Suggested generated artifacts:
  - `plans/unit-profile-coverage/level1-full-support.json`
  - `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`
- Keep `scripts/unit-profile-coverage-check.cjs` as the orchestrator. Add a
  focused helper module, probably `scripts/level1-full-support-report.cjs`,
  that consumes the already-built `unit-matrix.json` shape and
  `srd-unit-inventory.json` shape.
- Extend `coveragePaths()` with the two generated artifact paths and write them
  from the normal `--write` mode. No separate command is needed.

Denominator:

- Start from unique `candidateUnitId` values in `srd-unit-inventory.json` rows
  whose `levelBand` is `level-1`, `spell-level-0`, or `spell-level-1`.
- Exclude `find_familiar` explicitly as `closed-companion-worktree`, outside
  this denominator while companion/familiar work lives in the separate worktree.
- Join those ids to `unit-matrix.json` rows.
- Count only joined rows with `executableMechanics: true`. This includes
  authored-but-not-installed SRD spell Units that are present in the matrix,
  because runtime-detached table adjudication still needs explicit closure.
- Exclude non-executable class containers from the strict support denominator.
- Report, but do not count, SRD spell pressure that has no Unit-matrix row yet.
  Current examples include `mage_hand`, `goodberry`, and `unseen_servant`;
  those are catalog/frontier expansion pressure, not this installed/authored
  Unit support frontier.

Metric families:

- **Strict runtime/profile support**: numerator is `supported-profile` rows
  only. Runtime-detached table adjudication does not count as runtime support.
- **Strict target closure**: numerator is `supported-profile` plus explicit
  accepted closures such as runtime-detached table adjudication,
  later-level-only, and companion-worktree exclusion if included as a visible
  excluded row. This is the "is level 1 fully handled?" metric.
- **Open frontier**: every non-closed row grouped by the planning statuses in
  this file, with Unit ids, current claim tag/catalog status, and source reason.

Generated JSON shape sketch:

```jsonc
{
  "generatedBy": "scripts/unit-profile-coverage-check.cjs",
  "sourceArtifacts": {
    "unitMatrix": "plans/unit-profile-coverage/unit-matrix.json",
    "srdUnitInventory": "plans/unit-profile-coverage/srd-unit-inventory.json"
  },
  "scope": {
    "levelBands": ["level-1", "spell-level-0", "spell-level-1"],
    "excludedUnitIds": ["find_familiar"],
    "denominatorRule": "unique candidateUnitId rows joined to executable Unit matrix rows"
  },
  "metrics": {
    "strictRuntimeProfileSupport": {
      "numerator": "<derived supported-profile count>",
      "denominator": "<derived strict denominator>"
    },
    "strictTargetClosure": {
      "numerator": "<derived supported-profile plus strict closures>",
      "denominator": "<derived strict denominator>"
    },
    "productReadiness": {
      "numerator": "<derived existing readiness numerator>",
      "denominator": "<derived existing readiness denominator>"
    }
  },
  "groups": [
    {
      "status": "open-profile-accounting",
      "unitIds": ["..."],
      "reason": "..."
    }
  ],
  "outsideDenominator": {
    "companionWorktree": ["find_familiar"],
    "nonExecutableClassContainers": ["..."],
    "noMatrixSrdPressure": ["..."]
  }
}
```

The helper should derive all numbers from the current matrix/inventory on every
run. It must not carry a private copy of the 34-row planning table. If a closure
decision matters to the metric, encode it through the normal Unit claim/evidence
files in the task that owns that decision.

Classifier rules:

- `supported-profile` -> `supported-profile`, counts in both strict
  runtime/profile support and strict target closure.
- `profile-subset-supported` with every deferred mechanic closed by
  `later-level-only` -> `closed-later-level-only`, counts in strict target
  closure only.
- `unsupported-profile` or subset residuals closed by
  `outside-runtime-presentation-exploration` or durable social/knowledge
  closure -> `closed-runtime-detached-table-adjudication`, counts in strict
  target closure only.
- Table-supplied runtime witness rows should become `supported-profile` when
  the runtime owns the effect and consumes the typed witness. Do not count
  `table-spatial-derivation` as full strict support by itself.
- Rows with stale readiness closures that actually touch runtime behavior, such
  as the old Hunter's Mark finding Advantage wording, remain open until the
  normal Unit claim/evidence is corrected. Do not add a one-off exception list;
  fix the claim so the generated report follows the domain model.
- Missing Unit claims and authored-not-installed executable spell rows stay
  open unless a normal Unit claim encodes a runtime-detached closure. This is
  why L1FS6 exists for the five authored spell Units that currently have no
  claim.

Current baseline, recomputed from generated artifacts:

| Scope slice | Count |
| --- | ---: |
| Unique level-1/cantrip/level-1-spell candidate ids before exclusions | 120 |
| Companion-worktree exclusion: `find_familiar` | 1 |
| Non-executable class containers | 12 |
| SRD pressure with no Unit-matrix row yet | 14 |
| Strict denominator: executable authored/installed Unit rows | 93 |
| `supported-profile` | 59 |
| `profile-subset-supported` | 12 |
| `unsupported-profile` | 17 |
| No claim / authored not installed | 5 |

Acceptance:

- `pnpm unit-profile-coverage:check --write` refreshes both strict artifacts.
- `pnpm unit-profile-coverage:check` fails if either strict artifact is stale.
- The strict report shows product readiness separately from strict support:
  product readiness remains `367/367`, while initial strict runtime/profile
  support is `59/93`.
- The first generated strict report reproduces the strict denominator and the
  current 34-row non-supported frontier without hiding missing claims. As L1FS4,
  L1FS6, L1FS3, L1FS2, L1FS5, and L1FS7 encode their decisions through normal
  claims/evidence, the same report moves rows into supported or strict-closed
  groups without a second source of truth.
- The report makes the 14 no-matrix SRD spell pressures visible outside the
  denominator so later catalog-expansion work cannot be confused with this
  current level-1 support frontier.
- No MBT is needed for the metric task; verification is checker self-test,
  stale-artifact behavior, and exact generated baseline counts.

Needs before Ralph promotion:

- use `scripts/level1-full-support-report.cjs` as the helper module name unless
  implementation reveals a naming conflict;
- do not add a new authored closure table for L1FS1. The report should expose
  mechanical status from existing artifacts. Later implementation tasks should
  close rows by updating normal Unit claims/evidence whenever possible.
- do not reuse product-readiness closure blindly when it contradicts this
  stricter support target. Example: stale Hunter's Mark finding Advantage
  closure text should be fixed as supported behavior, not counted as a
  runtime-detached social closure.

### L1FS2 - Character-Owned Support Profiles For Level-1 Containers

Status: `pre-researched`

Purpose: remove false battle-runtime pressure by giving character-owned
selection/container facts real support profiles at their correct owner boundary.

Candidate Units:

- `fighter_fighting_style`
- `barbarian_weapon_mastery`
- `fighter_weapon_mastery`
- `paladin_weapon_mastery`
- `ranger_weapon_mastery`
- `rogue_weapon_mastery`
- `warlock_eldritch_invocations`
- `cleric_divine_order`
- `druid_primal_order`
- `rogue_expertise`

Current shape:

- Add shared character-creation profile records in a scaffold task before
  parallel Unit-specific claim work. Suggested profile ids:
  - `character-creation.class-feature-feat-choice`
  - `character-creation.weapon-mastery-choice`
  - `character-creation.eldritch-invocation-choice`
  - `character-creation.class-feature-option-projection`
  - `character-creation.skill-expertise-choice`
- Use `profileKind: "character-creation"`. These profiles do not need QNT
  proof ownership because they are not executable battle reducers, but they do
  need runtime owner and runtime-test owner markers.
- Suggested runtime owner marker:
  `packages/character-creation-runtime/src/index.ts`.
- Suggested verification owner marker:
  `packages/character-creation-runtime/src/index.test.ts`.
- Update `plans/unit-profile-coverage/task-claims.jsonl` with completed runtime
  parity for the new character-creation profiles in the scaffold branch.
- Add deterministic admission/projection Unit identity evidence for the ten Unit
  ids, probably on `packages/character-creation-runtime/src/index.test.ts`,
  then mirror it in `unit-evidence.jsonl`.
- Do not convert a Unit to all-level `supported-profile` unless every RAW
  lifecycle mechanic for that Unit is owned by a support profile. If only the
  level-1 character-creation slice is owned, keep the all-level claim as
  `profile-subset-supported` and let the strict level-1 report close only the
  level-1 slice.
- `fighter_fighting_style` needs an advancement/replacement owner before the
  all-level Unit claim can become `supported-profile`.
- Weapon Mastery container Units need both initial Character Creation selection
  and Character Sheet Long Rest weapon-reselection support before the all-level
  Unit claims can become `supported-profile`.
- `warlock_eldritch_invocations` needs level-up replacement/gain and
  prerequisite-retention support before the all-level Unit claim can become
  `supported-profile`.
- Keep executable child facts owned by selected feats, mastery property Units,
  selected invocation option Units, or character-sheet projection.
- Do not add battle-runtime reducer logic for these container rows.

Evidence already present:

| Unit group | Evidence source |
| --- | --- |
| `fighter_fighting_style`, `fighter_weapon_mastery` | `character-creation-owner-evidence.json` rows from `SRDINV1B`; tests include `finalizes supported Fighter 1 build`. |
| `barbarian_weapon_mastery`, `paladin_weapon_mastery`, `ranger_weapon_mastery`, `rogue_weapon_mastery` | `character-creation-owner-evidence.json` rows from `SRDINV20`; tests cover non-Fighter Weapon Mastery discovery and finalization. |
| `warlock_eldritch_invocations` | `character-creation-owner-evidence.json` row from `SRDINV18A`; tests cover invocation catalog discovery and selected invocation ownership. |
| `cleric_divine_order`, `druid_primal_order`, `rogue_expertise` | `character-creation-owner-evidence.json` rows from `SRDINV18`; tests cover supported level-1 class-feature acquisition choices and resulting build projections. |

Current generated state:

| Unit group | Current claim state |
| --- | --- |
| `fighter_fighting_style` | Installed `unsupported-profile`; reason says the selected Fighting Style feat carries executable pressure. |
| `barbarian_weapon_mastery`, `fighter_weapon_mastery`, `paladin_weapon_mastery`, `ranger_weapon_mastery`, `rogue_weapon_mastery` | Installed `unsupported-profile`; reason says the selected mastery Unit carries executable pressure. |
| `warlock_eldritch_invocations` | Installed `unsupported-profile`; reason says individual invocation options are outside this class-feature Unit profile. |
| `cleric_divine_order`, `druid_primal_order`, `rogue_expertise` | Installed `unsupported-profile`; reason says character-creation choices are authored but not represented as supported profiles. |

RAW/source reading:

| Unit group | Local RAW source | Character-runtime support meaning |
| --- | --- | --- |
| `fighter_fighting_style` | `.references/srd-5.2.1/Classes/Fighter.md#Level 1: Fighting Style` | Character Creation must expose and finalize a Fighting Style feat choice; selected feat mechanics remain owned by the feat Unit/profile. RAW also allows replacement whenever gaining a Fighter level, so all-level support needs an advancement/replacement owner. |
| Weapon Mastery containers | Fighter, Barbarian, Paladin, Ranger, and Rogue class files at `Level 1: Weapon Mastery`; `UBIQUITOUS_LANGUAGE.md` Weapon Mastery row | Character Creation must expose class-specific weapon choice count and proficiency restrictions, finalize selected weapon refs, and leave executable mastery-property behavior to mastery Units. RAW also allows changing weapon choices on a Long Rest, so level-1 strict support needs Character Sheet/rest owner evidence. |
| `warlock_eldritch_invocations` | `.references/srd-5.2.1/Classes/Warlock.md#Level 1: Eldritch Invocations` | Character Creation must expose eligible invocation choices, prerequisite gating, and selected invocation ownership; option execution belongs to selected invocation profiles. RAW replacement/gain and prerequisite-retention rules are advancement mechanics that must remain explicit residuals unless owned by a support profile. |
| `cleric_divine_order` | `.references/srd-5.2.1/Classes/Cleric.md#Level 1: Divine Order` | Character Creation must expose Protector/Thaumaturge choice and project the selected role's weapon/armor/cantrip/check facts to the build owner. |
| `druid_primal_order` | `.references/srd-5.2.1/Classes/Druid.md#Level 1: Primal Order` | Character Creation must expose Magician/Warden choice and project the selected role's weapon/armor/cantrip/check facts to the build owner. |
| `rogue_expertise` | `.references/srd-5.2.1/Classes/Rogue.md#Level 1: Expertise`; `UBIQUITOUS_LANGUAGE.md` Expertise row | Character Creation must expose eligible owned skill proficiencies, finalize two selected skills, and project Expertise to the build owner. RAW grants additional Expertise at Rogue level 6, so all-level support needs that later choice owned/evidenced. |

Needs before Ralph promotion:

- use the RAW/source table above when adding profile and claim text;
- land the shared character-creation scaffold before parallel Unit-specific
  tasks edit Unit claims/evidence;
- run `pnpm --filter @dnd/character-creation-runtime test` only if owner marker
  placement or tests are touched beyond comments;
- run `pnpm unit-profile-coverage:check --write` and then
  `pnpm unit-profile-coverage:check`.

### L1FS3 - Later-Level Residual Split

Status: `pre-researched`

Purpose: let level-1 complete when the only remaining subset is later-level
scaling.

Candidate Units:

- `bard_bardic_inspiration`
- `monk_martial_arts`
- `ranger_favored_enemy`

Current shape:

- `bard_bardic_inspiration` and `monk_martial_arts` already have
  `profile-subset-supported` claims whose only deferred mechanics are
  `battleReadinessClosure.kind: "later-level-only"`.
- For the strict level-1 metric, those two rows should close as
  `closed-later-level-only` without changing the all-level Unit claim to
  `supported-profile`.
- `ranger_favored_enemy` has one later-level-only residual, but its claim also
  still carries stale Hunter's Mark finding Advantage deferred wording. This
  task should close `ranger_favored_enemy` only after L1FS4 removes that stale
  runtime-behavior residual from the claim.
- This is a strict-metric/report semantics task, not a runtime task.

Current generated state:

| Unit | Current claim | Deferred mechanics |
| --- | --- | --- |
| `bard_bardic_inspiration` | `profile-subset-supported` with `unit-feature.bardic-inspiration-grant` and `unit-feature.bardic-inspiration-failed-d20-test` | Later-level Bardic Inspiration die size increases beyond d6, closed by `later-level-only`. |
| `monk_martial_arts` | `profile-subset-supported` with `unit-feature.martial-arts-attack-projection` | Later-level Martial Arts die size increases beyond d6, closed by `later-level-only`. |
| `ranger_favored_enemy` | `profile-subset-supported` with `spell.invocation-marked-damage-rider` | Later-level Favored Enemy free-cast count scaling plus stale Hunter's Mark finding Advantage text; L1FS4 must remove the stale text before strict closure. |

RAW/source reading:

| Unit | Local RAW source | Strict level-1 interpretation |
| --- | --- | --- |
| `bard_bardic_inspiration` | `.references/srd-5.2.1/Classes/Bard.md#Level 1: Bardic Inspiration` | Level 1 uses a d6 die; d8/d10/d12 increases start at Bard levels 5/10/15 and should not block level-1 strict support. |
| `monk_martial_arts` | `.references/srd-5.2.1/Classes/Monk.md#Level 1: Martial Arts` | Level 1 Martial Arts die is d6; later die changes are level-scaling work and should not block level-1 strict support. |
| `ranger_favored_enemy` | `.references/srd-5.2.1/Classes/Ranger.md#Level 1: Favored Enemy` | Level 1 grants two no-slot Hunter's Mark casts; increased no-slot uses are later Ranger-level scaling and should not block level-1 strict support once L1FS4 removes the stale finding Advantage residual. |

Needs before Ralph promotion:

- make the strict report count Bardic Inspiration and Martial Arts as closed
  for level 1 while keeping all-level Unit profile coverage honest;
- verify `ranger_favored_enemy` remains open until L1FS4 claim cleanup leaves
  later-level free-cast scaling as its only deferred mechanic.

### L1FS4 - Hunter's Mark Finding Advantage

Status: `pre-researched`

Purpose: close the Hunter's Mark and Ranger Favored Enemy subset caused by the
Wisdom (Perception or Survival) finding Advantage clause.

Candidate Units:

- `hunters_mark`
- `ranger_favored_enemy`

Current shape:

- This is not a fresh runtime implementation task. SRDINV87C already appears to
  have landed the runtime behavior and QNT facts.
- Local RAW: `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Hunter's Mark`
  says the caster has Advantage on Wisdom (Perception or Survival) checks made
  to find the marked target. `.references/srd-5.2.1/Classes/Ranger.md#Level 1:
  Favored Enemy` grants always-prepared Hunter's Mark and two no-slot casts at
  Ranger level 1.
- `UBIQUITOUS_LANGUAGE.md` uses **Ability Check**, **Skill**, and
  **Advantage/Disadvantage** for this shape; Perception and Survival are skills
  that specialize Wisdom checks.
- `packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts`
  projects Hunter's Mark as `abilityCheckBehavior:
  { kind: "findingAdvantage", ability: "wis", skills:
  HUNTERS_MARK_FINDING_SKILLS }`.
- `packages/battle-runtime/src/battle-reducer/spells-active-effects.ts`
  preserves that behavior on cast and transfer.
- `packages/battle-runtime/src/battle-reducer/hole-helpers.ts`
  applies Advantage only when the caller/table supplies the finding witness:
  actor, Wisdom ability, Perception or Survival skill, and the marked target id.
  This is a table-supplied runtime witness, not automatic social narration.
- `packages/battle-runtime/battle-runtime.qnt` has
  `huntersMarkFindingAbilityCheckRollMode` assertions for Perception/Survival
  Advantage and non-matching target/ability/skill rejection.
- `packages/battle-runtime/src/index.test.ts` covers Hunter's Mark finding
  Advantage, Search hole roll-mode projection, transfer to a new target,
  concentration cleanup, and Favored Enemy free-cast inheritance.

Implementation shape:

- Update `hunters_mark` in `unit-claims.jsonl` from
  `profile-subset-supported` to `supported-profile` and include the
  Wisdom (Perception or Survival) finding Advantage mechanic in
  `supportedMechanics`.
- Update `ranger_favored_enemy` to remove the stale Hunter's Mark
  finding-Advantage deferred mechanic. Keep it `profile-subset-supported` only
  for later-level Favored Enemy free-cast count scaling until L1FS3 closes that
  residual for strict level 1.
- Add or update `SRDINV87C` task claims for
  `spell.invocation-marked-damage-rider`, and remove stale task-claim wording
  that says finding Advantage remains deferred.
- Add `SRDINV87C` to the profile `taskRefs` if the profile task list is meant
  to enumerate all behavior-completing tasks.
- Refresh generated Unit matrix/report artifacts.

Needs before Ralph promotion:

- add a deterministic Unit identity marker for `ranger_favored_enemy`, probably
  in `packages/battle-runtime/src/index.test.ts`, because the strict report
  should have clear evidence for the level-1 free-cast path even though the
  all-level claim remains subset-supported for later scaling;
- run `pnpm unit-profile-coverage:check --write` and then
  `pnpm unit-profile-coverage:check`;
- run the focused battle-runtime tests only if the claim integration exposes a
  mismatch. Do not run MBT for this accounting-only task.

### L1FS5 - Table-Supplied Runtime Witness Profile Promotion

Status: `pre-researched`

Purpose: promote the witness-closed spell claims from subset support to strict
full support without adding runtime geometry, pathfinding, line-of-sight, broad
object inventory, sound propagation, or presentation work.

Candidate Units:

- `faerie_fire`
- `light`
- `feather_fall`
- `fog_cloud`
- `grease`
- `jump`
- `thunderwave`

Current shape:

- `faerie_fire` and `light`: runtime owns source emitters, Dim/Bright
  illumination projection, Lightly Obscured/Darkvision-adjusted sight
  consequences, and object/creature outline consequences; remaining color,
  automatic line-of-sight drawing, map geometry, and pathfinding are not runtime
  work.
- `feather_fall`: runtime owns the falling Reaction, target admission from
  caller-supplied falling/range facts, per-target mitigation effect,
  descent-rate cap projection, and caller-supplied landing cleanup; fall
  distance, elevation, and landing geometry are table-supplied runtime witnesses
  when consumed by this procedure, otherwise runtime-detached table adjudication.
- `fog_cloud`: runtime owns the source-created Heavily Obscured area,
  slot-scaled radius, Concentration duration, and table-supplied strong-wind
  dispersal; area membership, line of sight, map illumination, pathfinding, and
  wind derivation are table-supplied runtime witnesses when consumed by this
  procedure, otherwise runtime-detached table adjudication or presentation.
- `grease`: runtime owns the hazard lifecycle, on-cast/entry/end-turn Dexterity
  Saving Throws, Prone outcome, and caller-supplied Grease difficult-terrain
  movement cost; area membership, pathfinding, and grid geometry are table-supplied
  runtime witnesses when consumed by this procedure, otherwise runtime-detached
  table adjudication or presentation.
- `jump`: runtime owns target admission, one-minute active effect,
  once-per-turn use marker, 10-foot Movement spend, maximum 30-foot jump, and
  caller-supplied landing/prone consequence; jump arc, path, collision, final
  position, and landing-check derivation are table-supplied runtime witnesses
  when consumed by this procedure, otherwise runtime-detached table adjudication.
- `thunderwave`: runtime owns area Saving Throw damage, half damage on success,
  caller-supplied failed-save push disposition, object push disposition, and
  audible-boom evidence; push geometry, broad object inventory, and sound
  propagation simulation are table-supplied runtime witnesses when consumed by
  this procedure, otherwise runtime-detached table adjudication or presentation.

Planning finding: no new reducer slice is indicated by the audit. This is a
claim/profile promotion task over existing evidence and owner documents.

Current generated state:

| Unit | Current claim | Profile | Deterministic evidence |
| --- | --- | --- | --- |
| `faerie_fire` | `profile-subset-supported` | `spell.invocation-attack-roll-advantage-save` | `SRDINV58C` in `packages/battle-runtime/src/unit-profile-admission.test.ts` |
| `light` | `profile-subset-supported` | `spell.invocation-object-light` | `SRDINV70B` in `packages/battle-runtime/src/unit-profile-admission.test.ts` |
| `feather_fall` | `profile-subset-supported` | `spell.invocation-feather-fall-mitigation` | `SRDINV56A` in `packages/battle-runtime/src/feather-fall-reaction-spell.test.ts` |
| `fog_cloud` | `profile-subset-supported` | `spell.invocation-fog-cloud-obscurement` | `SRDINV84E` in `packages/battle-runtime/src/index.test.ts` |
| `grease` | `profile-subset-supported` | `spell.invocation-grease-ground-hazard` | `SRDINV40` in `packages/battle-runtime/src/unit-profile-admission.test.ts` |
| `jump` | `profile-subset-supported` | `spell.invocation-jump-movement-replacement` | `SRDINV53` in `packages/battle-runtime/src/unit-profile-admission.test.ts` |
| `thunderwave` | `profile-subset-supported` | `spell.invocation-damage-save-or-attack` | `SRDINV51` in `packages/battle-runtime/src/unit-profile-admission.test.ts` |

Implementation shape:

- Promote each Unit claim to `supported-profile` only if the implementing branch
  verifies that the existing profile owner docs still match current code and the
  per-residual witness/detached checklist passes.
- Preserve the existing profile ids; this task should not create a parallel
  "witness closure" profile family.
- Rewrite any misleading deferred wording such as "runtime-owned pathfinding" or
  "runtime-owned push geometry" into the supported boundary language:
  runtime owns the spell effect and consequence; the table/caller supplies area,
  route, landing, wind, object, sound, or legal-destination witnesses.
- Before promotion, include a per-residual checklist for each Unit: either the
  runtime already consumes a typed table-supplied runtime witness with owner/test
  evidence, or the residual is runtime-detached table adjudication/presentation
  that no runtime procedure consumes. If an executable consequence lacks an
  existing typed witness boundary, leave that Unit as `profile-subset-supported`
  and create a follow-up implementation task instead of promoting it.
- Remove the `table-spatial-derivation` deferred mechanics from these seven
  claims once the claim says the witness boundary is part of support.
- Do not add geometry/pathfinding/LOS/object-inventory/sound reducers, and do
  not add MBT for accounting-only promotion.

Needs before Ralph promotion:

- cite the existing RAW-reviewed owner docs for each Unit, especially
  `PRD_BATTLE_LIGHT_OBSCUREMENT_WITNESSES.md`,
  `plans/MOVEMENT_GEOMETRY_OWNERSHIP.md`,
  `plans/unit-profile-coverage/SRDINV54_FEATHER_FALL_FALLING_RUNTIME_BOUNDARY_RESEARCH.md`,
  `plans/unit-profile-coverage/SRDINV58B_FAERIE_FIRE_OBJECT_LIGHT_BOUNDARY_RESEARCH.md`,
  and `plans/unit-profile-coverage/SRDINV89D_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md`;
- verify the generated Unit matrix still has deterministic admission/projection
  evidence for all seven Units;
- update Unit claims/report semantics so these rows count as strict full
  support because every remaining executable consequence is either runtime-owned
  already or consumed through a table-supplied runtime witness.
- run `pnpm unit-profile-coverage:check --write` and then
  `pnpm unit-profile-coverage:check`.

### L1FS6 - Runtime-Detached Table Adjudication Closure

Status: `pre-researched`

Purpose: encode the owner decision that exploration, language, detection,
illusion/social adjudication, and similar rows are not runtime implementation
work for this product goal.

Candidate Units:

- `alarm`
- `comprehend_languages`
- `identify`
- `silent_image`
- `speak_with_animals`
- `detect_evil_and_good`
- `detect_magic`
- `detect_poison_and_disease`
- `druid_druidic`
- `minor_illusion`
- `rogue_thieves_cant`
- `charm_person`

Current shape:

- These rows should count as closed in the strict target metric only after each
  runtime-detached fact is separated from durable character-owned facts. They
  should not become battle `supported-profile` claims.
- Do not create runtime holes/fills/state just to mark them supported.
- Five authored-but-not-installed spell Units currently have no Unit claim:
  `alarm`, `comprehend_languages`, `identify`, `silent_image`,
  `speak_with_animals`. Add explicit `unsupported-profile` claims with
  `battleReadinessClosure.kind: "outside-runtime-presentation-exploration"` and
  owner/reason wording that names runtime-detached table adjudication.
- Six installed rows already have `unsupported-profile` claims with explicit
  outside-runtime closure: `detect_evil_and_good`, `detect_magic`,
  `detect_poison_and_disease`, `druid_druidic`, `minor_illusion`,
  `rogue_thieves_cant`. The task should adjust wording for the new vocabulary
  and split `druid_druidic` and `rogue_thieves_cant` so durable character facts
  are covered by CharacterBuild/Character Creation evidence instead of being
  treated as runtime-detached adjudication.
- `charm_person` is different: its battle-owned Charmed condition subset stays
  normal runtime support, while its remaining friendly-disposition/social
  aftermath stays runtime-detached. The strict report should close only that
  remaining deferred portion; it should not use this as precedent to close
  Hunter's Mark finding Advantage.
- The same closure rule should apply at later levels when equivalent
  exploration/social/detection/language/illusion-adjudication rows appear.

Current generated state:

| Unit group | Current claim/catalog state |
| --- | --- |
| `alarm`, `comprehend_languages`, `identify`, `silent_image`, `speak_with_animals` | Authored Surface spell records exist, but the Unit matrix shows `not-in-unit-catalog` and no claim. |
| `detect_evil_and_good`, `detect_magic`, `detect_poison_and_disease`, `druid_druidic`, `minor_illusion`, `rogue_thieves_cant` | Installed with `unsupported-profile` and `outside-runtime-presentation-exploration` closure. |
| `charm_person` | Installed with `profile-subset-supported`; battle Charmed mechanics are supported, while friendly/social aftermath is deferred to social/knowledge closure. |

RAW/source reading:

| Unit | Local RAW source | Runtime-detached reading |
| --- | --- | --- |
| `alarm` | `.references/srd-5.2.1/Spells/Descriptions-A-D.md#Alarm` | Warded door/window/area, designated non-triggers, audible/mental alert, sleep wake-up, and intrusion event truth are table/session adjudication for this product goal. |
| `comprehend_languages` | `.references/srd-5.2.1/Spells/Descriptions-A-D.md#Comprehend Languages` | Literal language understanding, signed/written text access, page-reading pace, and secret-message exclusion are runtime-detached information disclosure/table adjudication, not runtime state. |
| `identify` | `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Identify` | Magic item/object/creature information disclosure is runtime-detached information disclosure/table adjudication; runtime should not invent a magic-item knowledge graph for level-1 support. |
| `silent_image` | `.references/srd-5.2.1/Spells/Descriptions-S-Z.md#Silent Image` | Image content, movement appearance, physical interaction reveal, Study adjudication, and seeing-through behavior are illusion/table adjudication unless a later UI owns illusion entities. |
| `speak_with_animals` | `.references/srd-5.2.1/Spells/Descriptions-S-Z.md#Speak with Animals` | Beast conversation, Influence options, and information remembered by Beasts are social/table adjudication. |
| `detect_evil_and_good`, `detect_magic`, `detect_poison_and_disease` | `.references/srd-5.2.1/Spells/Descriptions-A-D.md#Detect Evil and Good`, `#Detect Magic`, `#Detect Poison and Disease` | Sensing locations, auras, schools, poison/disease kinds, occlusion, and Hallow discovery are runtime-detached information disclosure/table adjudication, not runtime-owned level-1 behavior. |
| `druid_druidic` | `.references/srd-5.2.1/Classes/Druid.md#Level 1: Druidic` | The Druidic known-language fact and always-prepared Speak with Animals Spell Access are creature-owned/CharacterBuild facts derived from authored Surface content; hidden-message discovery and deciphering remain runtime-detached table adjudication. |
| `rogue_thieves_cant` | `.references/srd-5.2.1/Classes/Rogue.md#Level 1: Thieves' Cant` | Thieves' Cant and one additional language choice are character-owned facts projected into the finalized CharacterBuild; communication capability remains runtime-detached table adjudication, not modeled runtime execution. |
| `minor_illusion` | `.references/srd-5.2.1/Spells/Descriptions-M-P.md#Minor Illusion` | Sound/image content, repeated sound, physical interaction reveal, faint rendering, and Study adjudication are illusion/table adjudication. |
| `charm_person` | `.references/srd-5.2.1/Spells/Descriptions-A-D.md#Charm Person`; `UBIQUITOUS_LANGUAGE.md` Charmed row | Saving Throw, Charmed condition, hostile-target Advantage, duration, damage break, and slot target scaling remain supported runtime behavior; Friendly disposition and target knowledge after the spell ends are runtime-detached social state. |

Implementation shape:

- Add explicit `unsupported-profile` claims for the five authored
  not-in-catalog spell Units: `alarm`, `comprehend_languages`, `identify`,
  `silent_image`, and `speak_with_animals`.
- Use `battleReadinessClosure.kind:
  "outside-runtime-presentation-exploration"` for those five claims unless the
  closure vocabulary is deliberately renamed across the checker. The owner
  wording should use the new plan language: runtime-detached table
  adjudication.
- Leave the six existing installed unsupported claims structurally unchanged
  unless wording updates are needed to say runtime-detached table adjudication
  instead of broad "outside battle runtime."
- Keep `charm_person` as `profile-subset-supported`; only its remaining
  social/knowledge residual closes as runtime-detached. Do not demote its
  battle-owned Charmed support.
- For `druid_druidic`, cite or add CharacterBuild/Character Creation evidence
  for the Druidic known-language fact and always-prepared Speak with Animals
  Spell Access before closing the Unit for strict level 1; close only
  hidden-message discovery/deciphering as runtime-detached.
- For `rogue_thieves_cant`, cite or add CharacterBuild/Character Creation
  evidence for Thieves' Cant and the additional language choice before closing
  the Unit for strict level 1; close only communication/adjudication as
  runtime-detached.
- Do not add battle-runtime profiles, holes/fills, reducers, QNT facts, or MBT.
  Closure is the explicit decision that these rows are not battle-runtime work
  for this goal.

Needs before Ralph promotion:

- use the RAW/source table above when writing claim reasons;
- do not close `druid_druidic` or `rogue_thieves_cant` as pure
  runtime-detached adjudication;
- run `pnpm unit-profile-coverage:check --write` and then
  `pnpm unit-profile-coverage:check`;
- confirm strict target closure gains 10 runtime-detached rows plus 2
  character-fact/runtime-detached split rows while strict runtime/profile support
  does not count them as supported profiles.

### L1FS7 - Character Sheet Rest Profile Accounting

Status: `pre-researched`

Purpose: close the strict gap for Wizard Arcane Recovery without inventing a
battle-runtime profile for Short Rest Spell Slot recovery.

Candidate Units:

- `wizard_arcane_recovery`

Current shape:

- `@dnd/character-sheet-runtime` already models Arcane Recovery during
  `completeShortRest`, including feature ownership, Short Rest trigger,
  once-per-Long-Rest use, half-Wizard-level rounded-up budget, level 6+
  exclusion, and expended-slot ceiling.
- Generated owner evidence already records this row, but
  `unit-claims.jsonl` still marks the Unit as `unsupported-profile` and
  `unit-matrix.json` has no profile/evidence.
- Add one Character Sheet profile. Suggested id:
  `character-sheet.short-rest-spell-slot-recovery`.
- Use `profileKind: "character-sheet"` with runtime owner
  `packages/character-sheet-runtime/src/index.ts` and runtime-test owner
  `packages/character-sheet-runtime/src/index.test.ts`.
- Add matching `UNIT-PROFILE-COVERAGE` markers to those files and a
  `completed-runtime-parity` task claim, probably `SRDINV24`, because the
  existing owner evidence already cites `SRDINV24`.
- Update `wizard_arcane_recovery` from `unsupported-profile` to
  `supported-profile` with the new Character Sheet profile id.
- Add deterministic admission/projection Unit identity evidence for
  `wizard_arcane_recovery`, probably in
  `packages/character-sheet-runtime/src/index.test.ts`, and mirror it in
  `unit-evidence.jsonl`.
- This should not add battle-runtime behavior. The owner is the Character Sheet
  rest lifecycle.

Current generated state:

- `wizard_arcane_recovery` is installed but still has an
  `unsupported-profile` claim saying Spell Slot recovery is outside battle.
- `character-sheet-owner-evidence.json` already records
  `Character Sheet Rest and Spell Slot Recovery runtime` evidence from
  `SRDINV24`.
- `packages/character-sheet-runtime/src/index.ts` and
  `packages/character-sheet-runtime/src/index.test.ts` currently have profile
  markers for Lay On Hands, Ritual Adept, and armor-class formula, but not for
  Arcane Recovery rest recovery.
- `packages/character-sheet-runtime/src/index.test.ts` already has focused
  tests for Arcane Recovery ordinary Spell Slot refund, once-per-Long-Rest use,
  level budget rejection, feature-ownership rejection, and Short Rest/Long Rest
  lifecycle.

RAW/source reading:

| Source | Character Sheet support meaning |
| --- | --- |
| `.references/srd-5.2.1/Classes/Wizard.md#Level 1: Arcane Recovery` | On Short Rest, a Wizard can choose expended Spell Slots to recover, total slot levels no more than half Wizard level rounded up, no slot level 6+, once per Long Rest. |
| `.references/srd-5.2.1/Classes/Wizard.md#Level 1: Spellcasting` | Ordinary Wizard Spell Slots recover on Long Rest; Arcane Recovery is a distinct Short Rest exception. |
| `UBIQUITOUS_LANGUAGE.md` Spell Slot, Pact Slot, Short Rest, Long Rest rows | Arcane Recovery must apply to ordinary Spell Slots, not Pact Slots, and its Short Rest use resets on Long Rest. |

Needs before Ralph promotion:

- use the RAW/source table above when adding profile and claim text;
- run `pnpm --filter @dnd/character-sheet-runtime test` if owner markers are
  added near tests or any runtime/test code changes;
- run `pnpm unit-profile-coverage:check --write` and then
  `pnpm unit-profile-coverage:check`;
- confirm the strict metric moves by exactly one row.

## Proposed Collaboration Order

1. Finalize the strict closure taxonomy for L1FS1 without implementing a large
   new coverage system.
2. Pre-research the close accounting/profile groups: L1FS2, L1FS7, and the
   pure later-level-only part of L1FS3.
3. Audit the table-supplied runtime witness rows for L1FS5.
4. Convert the above into Ralph-sized tasks with disjoint write ownership.
5. Keep L1FS4 as a separate coverage-integration candidate because it changes
   stale claims for a real roll-mode behavior that already appears implemented.
6. Use one integration/report task to refresh shared coverage artifacts after
   parallel task branches land.

## Dependency Map

- L1FS1/AT-L1-13 should be implemented first as the metric shell, and it must
  derive from normal coverage artifacts. It should not hard-code this plan's
  strict-gap planning table.
- L1FS4 should land before L1FS3 closes `ranger_favored_enemy`, because L1FS3
  is only valid when later-level free-cast scaling is Ranger's sole residual.
- L1FS6 should land before the strict report claims runtime-detached and
  character-fact split rows are closed, because five of those rows currently
  have no Unit claim.
- L1FS2 now requires a shared Character Creation scaffold before parallel
  Unit-specific claim/evidence tasks. L1FS5 and L1FS7 remain independent from
  that scaffold.
- Generated artifact refresh can happen per branch, but the final Ralph handoff
  should include one integration verification pass after merges.

## Ralph Parallel Batch Draft

These are not Ralph tasks yet, but this is the likely split once we promote the
work.

| Batch | Owns | Candidate tasks | Main write surface |
| --- | --- | --- | --- |
| Metric/integration | Strict report shape and generated artifact freshness | L1FS1 plus final integration refresh | `scripts/unit-profile-coverage-*.cjs`, `plans/unit-profile-coverage/level1-full-support.json`, `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md` |
| Character runtimes | Character Creation and Character Sheet profile accounting | L1FS2, L1FS7 | `profiles.jsonl`, `task-claims.jsonl`, `unit-claims.jsonl`, `unit-evidence.jsonl`, `packages/character-creation-runtime`, `packages/character-sheet-runtime` |
| Battle-runtime accounting | Existing battle/witness behavior claim promotion | L1FS4, L1FS5 | `unit-claims.jsonl`, `task-claims.jsonl`, `profiles.jsonl`, generated coverage artifacts |
| Runtime-detached closures | Non-runtime table adjudication claims | L1FS6 | `unit-claims.jsonl`, generated coverage artifacts |
| Later-level strict closure | Pure level-1 residual accounting | L1FS3 after L1FS4 | strict report logic and generated coverage artifacts |

Suggested final execution order:

1. Land L1FS1/AT-L1-13 metric infrastructure first so future counts are
   generated and reproducible.
2. Land L1FS4 claim cleanup for Hunter's Mark/Favored Enemy.
3. Land L1FS6 runtime-detached claims for the five no-claim spell Units and
   wording cleanup for existing closures.
4. Land the L1FS2 Character Creation scaffold, then its Unit-specific tasks.
5. Land L1FS5 and L1FS7 in parallel with non-conflicting work.
6. Land L1FS3 once Ranger's only residual is later-level scaling.
7. Run final L1FS1 integration refresh so `pnpm unit-profile-coverage:check`
   verifies no stale artifacts remain.

## Promotion Status

| Task | Promotion state | Notes |
| --- | --- | --- |
| L1FS1 strict metric | Ready as a draft implementation task | Helper name and non-duplication rule are decided; implementation must derive from matrix/inventory and normal claims. |
| L1FS2 character-owned profiles | Split into `AT-L1-03S` scaffold plus Unit-specific atomic tasks | RAW/source table now distinguishes level-1 creation support from all-level lifecycle support. |
| L1FS3 later-level split | Ready after L1FS4 lands | Bard/Monk can close immediately; Ranger waits until stale Hunter's Mark residual is removed. |
| L1FS4 Hunter's Mark finding Advantage | Ready as a draft implementation task | Behavior appears implemented by SRDINV87C; task is claim/evidence cleanup plus generated artifact refresh. |
| L1FS5 runtime-witness profile promotion | Ready as a draft implementation task | All seven Units have deterministic evidence; task is claim promotion and wording cleanup, not reducer work. |
| L1FS6 runtime-detached closures | Ready as a draft implementation task | Five no-claim spells need explicit unsupported closures; `druid_druidic` and `rogue_thieves_cant` need character-fact/runtime-detached split wording. |
| L1FS7 Arcane Recovery sheet profile | Ready as a draft implementation task | RAW/source table, current claim state, owner evidence, and profile shape are documented. |

## Ralph Task Briefs

Use this exact worktree safety prefix in every Ralph prompt:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`. You are not alone in the codebase:
> do not revert edits made by others, and adapt your implementation around
> existing changes. Do not edit `plans/ACTIVE_PLAN.md`.

Universal verification for every task below:

- RAW/source check: read the cited local SRD passages and
  `UBIQUITOUS_LANGUAGE.md` entries before changing claim/profile text.
- Coverage check: run `pnpm unit-profile-coverage:check --write`, then
  `pnpm unit-profile-coverage:check`.
- `/simplify` convergence: after implementation, run at least two rounds and
  continue until no important issues remain.
- MBT: do not run battle MBT for these accounting/profile tasks unless the task
  unexpectedly changes promoted battle behavior.

### Ralph L1FS4 - Hunter's Mark And Favored Enemy Claim Cleanup

Goal: make Unit claims match the SRDINV87C behavior already present for
Hunter's Mark finding Advantage.

Owned Unit ids:

- `hunters_mark`
- `ranger_favored_enemy`

Likely files:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/task-claims.jsonl`
- `plans/unit-profile-coverage/profiles.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `packages/battle-runtime/src/index.test.ts`
- generated coverage artifacts under `plans/unit-profile-coverage/`

Required changes:

- Change `hunters_mark` from `profile-subset-supported` to
  `supported-profile`.
- Add Wisdom (Perception or Survival) Advantage to find the marked target to
  `hunters_mark.supportedMechanics`.
- Remove the stale Hunter's Mark finding Advantage deferred mechanic from
  `hunters_mark`.
- Remove the stale Hunter's Mark finding Advantage deferred mechanic from
  `ranger_favored_enemy`.
- Keep `ranger_favored_enemy` as `profile-subset-supported` only for
  later-level Favored Enemy free-cast count scaling.
- Add or update `SRDINV87C` task claims for
  `spell.invocation-marked-damage-rider`.
- Add `SRDINV87C` to the profile `taskRefs` if `profiles.jsonl` task refs are
  maintained as the complete behavior history for that profile.
- Add deterministic Unit identity evidence for `ranger_favored_enemy`, probably
  beside the existing Favored Enemy tests in
  `packages/battle-runtime/src/index.test.ts`.

Out of scope:

- No reducer rewrite.
- No new ability-check model.
- No new QNT facts unless implementation discovers the existing
  `huntersMarkFindingAbilityCheckRollMode` assertions are absent on the target
  branch.

Acceptance:

- `hunters_mark` counts as `supported-profile`.
- `ranger_favored_enemy` has exactly one remaining deferred mechanic:
  later-level free-cast count scaling.
- Generated report no longer says Hunter's Mark finding Advantage is deferred.
- Focused runtime evidence remains tied to SRDINV87C.

Extra verification:

- If marker/test files are touched beyond comments, run
  `pnpm --filter @dnd/battle-runtime test`.

### Ralph L1FS6 - Runtime-Detached Table Adjudication Closures

Goal: encode the owner decision that selected exploration, language, detection,
illusion, and social rows are done for strict level 1 because they are
runtime-detached table adjudication, not runtime support.

Owned Unit ids:

- `alarm`
- `comprehend_languages`
- `identify`
- `silent_image`
- `speak_with_animals`
- `detect_evil_and_good`
- `detect_magic`
- `detect_poison_and_disease`
- `druid_druidic`
- `minor_illusion`
- `rogue_thieves_cant`
- `charm_person`

Likely files:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- generated coverage artifacts under `plans/unit-profile-coverage/`

Required changes:

- Add explicit `unsupported-profile` claims for the five authored no-claim
  spells: `alarm`, `comprehend_languages`, `identify`, `silent_image`, and
  `speak_with_animals`.
- Use `battleReadinessClosure.kind:
  "outside-runtime-presentation-exploration"` for those five unless the checker
  vocabulary is intentionally renamed in the same branch.
- Wording must name runtime-detached table adjudication and avoid implying
  missing battle-runtime work.
- Keep six existing installed unsupported closures structurally unchanged unless
  wording needs the new vocabulary.
- Split `druid_druidic` and `rogue_thieves_cant` so durable CharacterBuild facts
  are evidenced separately from runtime-detached communication/table
  adjudication.
- Keep `charm_person` as `profile-subset-supported`: battle Charmed support
  remains supported; Friendly/social aftermath remains runtime-detached.

Out of scope:

- No battle-runtime profiles.
- No runtime holes, fills, reducers, QNT, or MBT.
- Do not call these rows `supported-profile`.

Acceptance:

- The five no-claim spell Units now have explicit unsupported claims with
  runtime-detached closure.
- Strict target closure can count 10 runtime-detached rows plus 2
  character-fact/runtime-detached split rows without increasing strict
  runtime/profile support.
- Product readiness stays closed.

### Ralph L1FS2 - Character-Owned Level-1 Support Profiles

Goal: split character-owned level-1 support into a shared Character Creation
profile scaffold plus Unit-specific claim/evidence work. Do not promote
all-level Unit claims past RAW lifecycle mechanics that are not owned.

Owned Unit ids:

- `fighter_fighting_style`
- `barbarian_weapon_mastery`
- `fighter_weapon_mastery`
- `paladin_weapon_mastery`
- `ranger_weapon_mastery`
- `rogue_weapon_mastery`
- `warlock_eldritch_invocations`
- `cleric_divine_order`
- `druid_primal_order`
- `rogue_expertise`

Likely files:

- `plans/unit-profile-coverage/profiles.jsonl`
- `plans/unit-profile-coverage/task-claims.jsonl`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `packages/character-creation-runtime/src/index.ts`
- `packages/character-creation-runtime/src/index.test.ts`
- generated coverage artifacts under `plans/unit-profile-coverage/`

Required changes:

- Add character-creation profile records for:
  `character-creation.class-feature-feat-choice`,
  `character-creation.weapon-mastery-choice`,
  `character-creation.eldritch-invocation-choice`,
  `character-creation.class-feature-option-projection`, and
  `character-creation.skill-expertise-choice`.
- Use `profileKind: "character-creation"`.
- Add runtime owner and runtime-test owner markers in the character-creation
  runtime package.
- Add completed runtime parity task claims for the new profiles.
- Convert Unit claims to all-level `supported-profile` only when every RAW
  lifecycle mechanic is owned. Otherwise keep all-level claims
  `profile-subset-supported` and let the strict level-1 report close only the
  level-1 slice.
- Add deterministic admission/projection Unit identity evidence for all ten Unit
  ids.
- Keep executable child behavior owned by selected feats, selected mastery
  Units, selected invocation option Units, or Character Sheet projection.
- Treat Fighter Fighting Style advancement replacement, Weapon Mastery Long Rest
  reselection, and Warlock invocation replacement/gain/prerequisite-retention as
  explicit gates before all-level support.

Out of scope:

- No battle-runtime reducer work.
- No duplicate state for selected options.
- No new status labels that do not affect coverage/profile behavior.

Acceptance:

- Unit claims are not overpromoted: supported claims own their full RAW
  lifecycle; subset claims name their remaining lifecycle residuals and strict
  level-1 closure.
- Character Creation profiles have owner markers and runtime-test verification
  owners.
- Deterministic Unit identity coverage remains complete for supported Units.

Extra verification:

- Run `pnpm --filter @dnd/character-creation-runtime test` if marker/test files
  are touched beyond comments.

### Ralph L1FS7 - Wizard Arcane Recovery Character Sheet Profile

Goal: give Wizard Arcane Recovery a Character Sheet support profile instead of
leaving it as outside battle runtime.

Owned Unit ids:

- `wizard_arcane_recovery`

Likely files:

- `plans/unit-profile-coverage/profiles.jsonl`
- `plans/unit-profile-coverage/task-claims.jsonl`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `packages/character-sheet-runtime/src/index.ts`
- `packages/character-sheet-runtime/src/index.test.ts`
- generated coverage artifacts under `plans/unit-profile-coverage/`

Required changes:

- Add profile `character-sheet.short-rest-spell-slot-recovery` with
  `profileKind: "character-sheet"`.
- Add runtime owner marker in `packages/character-sheet-runtime/src/index.ts`.
- Add runtime-test owner marker in
  `packages/character-sheet-runtime/src/index.test.ts`.
- Add a completed runtime parity task claim, likely `SRDINV24`.
- Change `wizard_arcane_recovery` from `unsupported-profile` to
  `supported-profile`.
- Add deterministic admission/projection Unit identity evidence for
  `wizard_arcane_recovery`.

Out of scope:

- No battle-runtime behavior.
- No Pact Slot recovery under Arcane Recovery.
- No duplicate Spell Slot capacity state.

Acceptance:

- `wizard_arcane_recovery` counts as `supported-profile`.
- Strict metric moves by exactly one supported row.
- Existing Character Sheet Arcane Recovery tests still represent the support
  boundary.

Extra verification:

- Run `pnpm --filter @dnd/character-sheet-runtime test` if marker/test files are
  touched beyond comments.

### Ralph L1FS5 - Table-Supplied Runtime Witness Profile Promotion

Goal: promote existing witness-backed battle-runtime spell support from subset
claims to supported profiles without adding geometry/pathfinding/LOS/object
inventory/sound simulation.

Owned Unit ids:

- `faerie_fire`
- `light`
- `feather_fall`
- `fog_cloud`
- `grease`
- `jump`
- `thunderwave`

Likely files:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/task-claims.jsonl` if wording needs updated
  task notes
- `plans/unit-profile-coverage/profiles.jsonl` only if profile source-boundary
  wording is stale
- generated coverage artifacts under `plans/unit-profile-coverage/`

Required changes:

- Promote each Unit claim to `supported-profile` only after verifying the
  existing owner docs still match current code and the per-residual
  witness/detached checklist passes.
- Preserve existing profile ids.
- Rewrite deferred-mechanic language into support-boundary language:
  runtime owns the spell effect and mechanical consequence; table/caller
  supplies area, sight, route, landing, wind, object, sound, or legal-destination
  witnesses.
- Include a per-residual checklist proving each remaining fact is either an
  existing typed table-supplied runtime witness with owner/test evidence or
  runtime-detached table adjudication/presentation. If any executable consequence
  lacks that boundary, do not promote that Unit.
- Remove `table-spatial-derivation` deferred mechanics from these seven claims.

Out of scope:

- No geometry/pathfinding/line-of-sight reducers.
- No broad object inventory simulation.
- No sound propagation simulation.
- No MBT for claim promotion.

Acceptance:

- All seven Units count as `supported-profile`.
- The generated report no longer treats witness facts as missing runtime work.
- Supported mechanics text still makes the table-supplied witness boundary
  explicit.

### Ralph L1FS3 - Later-Level Strict Closure

Goal: let strict level-1 closure count rows whose only remaining deferred work
is later-level scaling, without changing all-level Unit support semantics.

Owned Unit ids:

- `bard_bardic_inspiration`
- `monk_martial_arts`
- `ranger_favored_enemy`

Dependency:

- Run after L1FS4. `ranger_favored_enemy` is eligible only after the stale
  Hunter's Mark finding Advantage residual is gone.

Likely files:

- `scripts/level1-full-support-report.cjs`
- `scripts/unit-profile-coverage-check.cjs`
- `scripts/unit-profile-coverage-config.cjs` only if path wiring needs it
- generated strict support artifacts under `plans/unit-profile-coverage/`

Required changes:

- Make the strict report classify `profile-subset-supported` rows with only
  `later-level-only` deferred mechanics as `closed-later-level-only`.
- Do not change Bardic Inspiration or Martial Arts all-level Unit claims to
  `supported-profile`.
- After L1FS4, allow Ranger Favored Enemy to close for strict level 1 when its
  only remaining deferred mechanic is later-level free-cast count scaling.

Out of scope:

- No Bardic Inspiration die-size scaling implementation.
- No Martial Arts die-size scaling implementation.
- No later Ranger Favored Enemy scaling implementation.

Acceptance:

- Bardic Inspiration and Martial Arts strict target rows close as
  `closed-later-level-only`.
- Ranger Favored Enemy strict target row closes only after L1FS4 claim cleanup.
- Supported-profile coverage remains honest for all-level support.

### Ralph L1FS1 - Strict Level-1 Support Metric

Goal: add an executable strict level-1 support view to the existing coverage
pipeline.

Owned scope:

- Strict level-1 report generation and generated strict artifacts.

Likely files:

- `scripts/level1-full-support-report.cjs`
- `scripts/unit-profile-coverage-check.cjs`
- `scripts/unit-profile-coverage-config.cjs`
- generated artifacts:
  - `plans/unit-profile-coverage/level1-full-support.json`
  - `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`

Required changes:

- Wire strict report generation into normal `pnpm unit-profile-coverage:check`
  and `--write`.
- Derive from `unit-matrix.json` and `srd-unit-inventory.json`; do not add a
  new authored closure table and do not copy the 34-row planning list.
- Scope to unique `candidateUnitId` values from `level-1`, `spell-level-0`, and
  `spell-level-1`.
- Exclude `find_familiar` as companion-worktree work.
- Count only executable authored/installed Unit rows in the strict denominator.
- Report non-executable class containers and no-matrix SRD spell pressure
  outside the denominator.
- Show both strict runtime/profile support and strict target closure.
- Show existing product readiness separately so `367/367` is not confused with
  strict support.

Out of scope:

- No claim status changes.
- No runtime behavior.
- No hard-coded planning classification table.

Acceptance:

- `pnpm unit-profile-coverage:check --write` writes both strict artifacts.
- `pnpm unit-profile-coverage:check` fails if either strict artifact is stale.
- Initial report shows strict runtime/profile support at the current baseline
  and exposes the 34-row non-supported frontier without hiding no-claim rows.
- After the other L1FS tasks land, the same report reflects closure through
  normal claims/evidence.

## Final Ralph Handoff Checklist

Broad task count: 7. This section is retained as the planning grouping.
Use the atomic task set below for launchable one-session work.

Ready to launch immediately:

- Ralph L1FS4 - Hunter's Mark And Favored Enemy Claim Cleanup.
- Ralph L1FS6 - Runtime-Detached Table Adjudication Closures.
- Ralph L1FS2 - Character-Owned Level-1 Support Profiles.
- Ralph L1FS7 - Wizard Arcane Recovery Character Sheet Profile.
- Ralph L1FS5 - Table-Supplied Runtime Witness Profile Promotion.
- Ralph L1FS1 - Strict Level-1 Support Metric.

Conditional task:

- Ralph L1FS3 - Later-Level Strict Closure. Launch after L1FS4 lands or include
  in the same integration branch only if L1FS4's claim cleanup is already
  present in that branch.

Suggested parallel launch:

- Worktree A: L1FS4, then L1FS3 if L1FS4 completes cleanly.
- Worktree B: L1FS6.
- Worktree C: L1FS2 and L1FS7 if one worker can own character-runtime files, or
  split them into separate worktrees if needed.
- Worktree D: L1FS5.
- Integration worktree: L1FS1 and final generated artifact refresh after the
  other branches merge.

Final merge gate:

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- Package-local tests from any branch that touched runtime/test files.
- `/simplify` convergence, minimum two rounds.

## Next Step

Next action: launch Ralph work from the atomic task set below, starting with
AT-L1-13 so strict counts are generated and reproducible. Then launch Wave 1:
AT-L1-01, AT-L1-02, AT-L1-03S, AT-L1-08, and AT-L1-09 through AT-L1-12.

## Broad Ralph Launch Prompt Pack (Superseded)

This broad prompt pack is retained for provenance. Use the atomic task set below
for actual Ralph launches. The prompts below have been partially corrected for
RAW/architecture notes, but they remain non-launchable provenance; launch from
the `AT-L1-*`, `AT-L1X-*`, and `AT-L1Y-*` atomic tasks instead.

### Prompt A - L1FS4 Hunter's Mark Claim Cleanup

Before starting, run `git log --oneline -1 master` and verify your HEAD
matches. If not, run `git rebase master`. You are not alone in the codebase:
do not revert edits made by others, and adapt your implementation around
existing changes. Do not edit `plans/ACTIVE_PLAN.md`.

Implement Ralph L1FS4 from
`plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`: Hunter's Mark and Favored Enemy claim
cleanup. Own only `hunters_mark` and `ranger_favored_enemy`.

Make Unit claims match the SRDINV87C behavior already present for Hunter's Mark
finding Advantage. Change `hunters_mark` to `supported-profile`; remove stale
finding-Advantage deferred mechanics from `hunters_mark` and
`ranger_favored_enemy`; keep Ranger subset-supported only for later-level
Favored Enemy free-cast count scaling; add/update SRDINV87C task/profile refs
and deterministic `ranger_favored_enemy` identity evidence.

Read local RAW before editing:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Hunter's Mark`
- `.references/srd-5.2.1/Classes/Ranger.md#Level 1: Favored Enemy`
- `UBIQUITOUS_LANGUAGE.md` Ability Check, Skill, Advantage/Disadvantage

Likely files:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/task-claims.jsonl`
- `plans/unit-profile-coverage/profiles.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `packages/battle-runtime/src/index.test.ts`
- generated coverage artifacts

Verification:

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `pnpm --filter @dnd/battle-runtime test` if runtime/test marker files are
  touched beyond comments
- `/simplify` convergence, minimum two rounds

Do not run MBT unless promoted battle behavior unexpectedly changes.

### Prompt B - L1FS6 Runtime-Detached Closures

Before starting, run `git log --oneline -1 master` and verify your HEAD
matches. If not, run `git rebase master`. You are not alone in the codebase:
do not revert edits made by others, and adapt your implementation around
existing changes. Do not edit `plans/ACTIVE_PLAN.md`.

Implement Ralph L1FS6 from
`plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`: runtime-detached table adjudication
closures.

Own these Unit ids:

- `alarm`
- `comprehend_languages`
- `identify`
- `silent_image`
- `speak_with_animals`
- `detect_evil_and_good`
- `detect_magic`
- `detect_poison_and_disease`
- `druid_druidic`
- `minor_illusion`
- `rogue_thieves_cant`
- `charm_person`

Add explicit `unsupported-profile` claims for the five authored no-claim
spells: `alarm`, `comprehend_languages`, `identify`, `silent_image`, and
`speak_with_animals`. Use `battleReadinessClosure.kind:
"outside-runtime-presentation-exploration"` and wording that names
runtime-detached table adjudication. Keep existing installed unsupported
closures structurally unchanged unless wording needs the same vocabulary. Split
`druid_druidic` and `rogue_thieves_cant` so durable CharacterBuild facts are
evidenced separately from runtime-detached communication/table adjudication. Keep
`charm_person` as subset-supported: battle Charmed behavior remains supported;
Friendly/social aftermath remains runtime-detached.

Read local RAW before editing:

- Alarm, Comprehend Languages, Detect spells, Charm Person in
  `.references/srd-5.2.1/Spells/Descriptions-A-D.md`
- Identify in `.references/srd-5.2.1/Spells/Descriptions-E-L.md`
- Minor Illusion in `.references/srd-5.2.1/Spells/Descriptions-M-P.md`
- Silent Image and Speak with Animals in
  `.references/srd-5.2.1/Spells/Descriptions-S-Z.md`
- Druidic and Thieves' Cant class passages
- `UBIQUITOUS_LANGUAGE.md` Charmed/social/language terms

Likely files:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- generated coverage artifacts

Verification:

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `/simplify` convergence, minimum two rounds

Do not add battle-runtime profiles, holes/fills, reducers, QNT, or MBT.

### Prompt C - L1FS2 Character-Owned Profiles

Before starting, run `git log --oneline -1 master` and verify your HEAD
matches. If not, run `git rebase master`. You are not alone in the codebase:
do not revert edits made by others, and adapt your implementation around
existing changes. Do not edit `plans/ACTIVE_PLAN.md`.

Implement Ralph L1FS2 from
`plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`: character-owned level-1 support
profiles.

Own these Unit ids:

- `fighter_fighting_style`
- `barbarian_weapon_mastery`
- `fighter_weapon_mastery`
- `paladin_weapon_mastery`
- `ranger_weapon_mastery`
- `rogue_weapon_mastery`
- `warlock_eldritch_invocations`
- `cleric_divine_order`
- `druid_primal_order`
- `rogue_expertise`

Add the shared character-creation scaffold first: profiles, owner markers,
runtime-test markers, and completed runtime parity task claims. Then add
Unit-specific deterministic identity evidence and claim updates. Convert a Unit
to all-level `supported-profile` only when every RAW lifecycle mechanic is
owned; otherwise keep the all-level claim `profile-subset-supported` and let the
strict level-1 report close only the level-1 slice. Keep selected feats, mastery
Units, invocation options, and sheet projections as the owners of child
executable behavior.

Likely files:

- `plans/unit-profile-coverage/profiles.jsonl`
- `plans/unit-profile-coverage/task-claims.jsonl`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `packages/character-creation-runtime/src/index.ts`
- `packages/character-creation-runtime/src/index.test.ts`
- generated coverage artifacts

Verification:

- `pnpm --filter @dnd/character-creation-runtime test` if runtime/test marker
  files are touched beyond comments
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `/simplify` convergence, minimum two rounds

Do not add battle-runtime reducer work or duplicate selected-option state.

### Prompt D - L1FS7 Arcane Recovery Sheet Profile

Before starting, run `git log --oneline -1 master` and verify your HEAD
matches. If not, run `git rebase master`. You are not alone in the codebase:
do not revert edits made by others, and adapt your implementation around
existing changes. Do not edit `plans/ACTIVE_PLAN.md`.

Implement Ralph L1FS7 from
`plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`: Wizard Arcane Recovery Character Sheet
profile. Own only `wizard_arcane_recovery`.

Add profile `character-sheet.short-rest-spell-slot-recovery`, Character Sheet
runtime/test owner markers, completed runtime parity task claim, supported Unit
claim, and deterministic identity evidence for `wizard_arcane_recovery`.

Read local RAW before editing:

- `.references/srd-5.2.1/Classes/Wizard.md#Level 1: Arcane Recovery`
- `.references/srd-5.2.1/Classes/Wizard.md#Level 1: Spellcasting`
- `UBIQUITOUS_LANGUAGE.md` Spell Slot, Pact Slot, Short Rest, Long Rest

Verification:

- `pnpm --filter @dnd/character-sheet-runtime test` if runtime/test marker
  files are touched beyond comments
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `/simplify` convergence, minimum two rounds

Do not add battle-runtime behavior or Pact Slot recovery under Arcane Recovery.

### Prompt E - L1FS5 Runtime-Witness Profile Promotion

Before starting, run `git log --oneline -1 master` and verify your HEAD
matches. If not, run `git rebase master`. You are not alone in the codebase:
do not revert edits made by others, and adapt your implementation around
existing changes. Do not edit `plans/ACTIVE_PLAN.md`.

Implement Ralph L1FS5 from
`plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`: table-supplied runtime witness profile
promotion.

Own these Unit ids:

- `faerie_fire`
- `light`
- `feather_fall`
- `fog_cloud`
- `grease`
- `jump`
- `thunderwave`

Promote these existing witness-backed battle-runtime claims to
`supported-profile`. Preserve existing profile ids. Rewrite deferred spatial
language into support-boundary language: runtime owns the spell effect and
mechanical consequence; table/caller supplies area, sight, route, landing,
wind, object, sound, or legal-destination witnesses. Include a per-residual
checklist proving each remaining fact is either an existing typed
table-supplied runtime witness with owner/test evidence or runtime-detached
table adjudication/presentation. Remove `table-spatial-derivation` deferred
mechanics from these seven claims only when that checklist passes.

Likely files:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/task-claims.jsonl` if wording needs updated
  task notes
- `plans/unit-profile-coverage/profiles.jsonl` only if source-boundary wording
  is stale
- generated coverage artifacts

Verification:

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `/simplify` convergence, minimum two rounds

Do not add geometry, pathfinding, line-of-sight, object-inventory, or sound
propagation reducers. Do not run MBT for claim promotion.

### Prompt F - L1FS1 Strict Level-1 Metric

Before starting, run `git log --oneline -1 master` and verify your HEAD
matches. If not, run `git rebase master`. You are not alone in the codebase:
do not revert edits made by others, and adapt your implementation around
existing changes. Do not edit `plans/ACTIVE_PLAN.md`.

Implement Ralph L1FS1 from
`plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`: strict level-1 support metric.

Add `scripts/level1-full-support-report.cjs` and wire it into the existing
`unit-profile-coverage:check` pipeline. Generate:

- `plans/unit-profile-coverage/level1-full-support.json`
- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`

Derive strictly from `unit-matrix.json` and `srd-unit-inventory.json`. Do not
add a new authored closure table and do not copy the 34-row planning list.
Scope to unique `candidateUnitId` values from `level-1`, `spell-level-0`, and
`spell-level-1`; exclude `find_familiar`; count executable authored/installed
Unit rows in the strict denominator; show no-matrix SRD pressure outside the
denominator; show product readiness separately from strict runtime/profile
support and strict target closure.

Verification:

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- targeted checker self-test if added
- `/simplify` convergence, minimum two rounds

Do not change Unit claims or runtime behavior.

### Prompt G - L1FS3 Later-Level Strict Closure

Before starting, run `git log --oneline -1 master` and verify your HEAD
matches. If not, run `git rebase master`. You are not alone in the codebase:
do not revert edits made by others, and adapt your implementation around
existing changes. Do not edit `plans/ACTIVE_PLAN.md`.

Implement Ralph L1FS3 from
`plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`: later-level strict closure.

Dependency: run only after L1FS4 has landed, or in a branch that already
contains L1FS4 claim cleanup.

Own these Unit ids for strict closure classification:

- `bard_bardic_inspiration`
- `monk_martial_arts`
- `ranger_favored_enemy`

Make the strict report classify `profile-subset-supported` rows with only
`later-level-only` deferred mechanics as `closed-later-level-only`. Do not
change Bardic Inspiration or Martial Arts all-level Unit claims to
`supported-profile`. Close Ranger Favored Enemy for strict level 1 only after
its Hunter's Mark finding Advantage residual is gone.

Likely files:

- `scripts/level1-full-support-report.cjs`
- generated strict support artifacts

Verification:

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `/simplify` convergence, minimum two rounds

Do not implement later-level Bardic Inspiration, Martial Arts, or Favored Enemy
scaling.

## Total Prepared Work Portfolio

Total prepared one-session work items: 35.

- `AT-L1-01` through `AT-L1-14` plus `AT-L1-03S`: strict support closure,
  scaffold, and metric work.
- `AT-L1X-01` through `AT-L1X-14`: no-matrix spell expansion decisions.
- `AT-L1Y-01` through `AT-L1Y-06`: non-executable class/profile expansion
  decisions.

The strict closure set is implementation-ready. The `L1X` and `L1Y` sets are
pre-researched research/decision tasks. Their required output is a decision
artifact; they must not perform implementation unless they first produce a
follow-up implementation atom that passes the same owner, provenance, RAW, and
no-redundant-state gates.

## Strict Closure Atomic Task Set

Strict closure atomic task count: 15.

- Wave 0: 1 metric/integration task (`AT-L1-13`).
- Wave 1: 8 tasks after the metric shape exists.
- Wave 2: 6 tasks after the character-creation scaffold or claim cleanup lands.

Every atomic task below is intended to fit in one coding session with clear
inputs and outputs. All prompts must include the worktree safety prefix from the
Ralph Task Briefs section.

Universal verification for every atomic task:

- Read cited local RAW and `UBIQUITOUS_LANGUAGE.md` before changing
  claims/profile text.
- Run `pnpm unit-profile-coverage:check --write`.
- Run `pnpm unit-profile-coverage:check`.
- All generated coverage artifacts are integration-owned unless a task
  explicitly names them as primary outputs. Non-metric atoms may run `--write`
  for verification, but their branches should not claim ownership of generated
  reports such as `unit-matrix.json`, `UNIT_REPORT.md`, strict support JSON, or
  strict support Markdown.
- Run package-local tests only when touching runtime/test marker files beyond
  comments.
- Run `/simplify` to convergence, minimum two rounds.
- Do not run MBT unless promoted battle behavior unexpectedly changes.

| Atomic task | Inputs | Outputs | Primary files | Dependencies |
| --- | --- | --- | --- | --- |
| `AT-L1-01` Hunter's Mark / Favored Enemy claim cleanup | `hunters_mark`, `ranger_favored_enemy`; SRDINV87C evidence | `hunters_mark` supported; Ranger only later-level residual; SRDINV87C evidence/refs current | `unit-claims.jsonl`, `task-claims.jsonl`, `profiles.jsonl`, `unit-evidence.jsonl`, battle-runtime test marker | none |
| `AT-L1-02` Runtime-detached and character-fact split claims | 12 mixed/runtime-detached Units | Five no-claim spell Units get explicit unsupported closures; Druidic/Thieves' Cant durable character facts are evidenced separately from detached adjudication; charm wording aligned | `unit-claims.jsonl`, optional character-creation evidence rows | none |
| `AT-L1-03S` Character Creation support scaffold | shared character-creation profile ids and owner markers | Shared profiles, task claims, runtime owner markers, and test owner markers exist; no Unit claim conversion | character-creation markers, `profiles.jsonl`, `task-claims.jsonl` | after `AT-L1-13` |
| `AT-L1-03` Fighter Fighting Style character profile | `fighter_fighting_style` | Level-1 Fighting Style choice is evidenced; all-level claim becomes supported only if advancement replacement is owned, otherwise strict level-1 closure keeps all-level subset residual | `unit-claims.jsonl`, `unit-evidence.jsonl` | after `AT-L1-03S` |
| `AT-L1-04` Weapon Mastery character/rest profile | five Weapon Mastery container Units | Initial choices and Long Rest weapon reselection are evidenced before supported-profile conversion | character-sheet rest markers if needed, coverage claim/evidence files | after `AT-L1-03S` |
| `AT-L1-05` Warlock Eldritch Invocations profile | `warlock_eldritch_invocations` | Level-1 invocation choice is evidenced; all-level claim becomes supported only if replacement/gain/prerequisite-retention lifecycle is owned, otherwise strict level-1 closure keeps all-level subset residual | `unit-claims.jsonl`, `unit-evidence.jsonl` | after `AT-L1-03S` |
| `AT-L1-06` Cleric/Druid order profile | `cleric_divine_order`, `druid_primal_order` | Divine/Primal Order option projection supported at Character Creation owner | coverage claim/evidence files | after `AT-L1-03S` |
| `AT-L1-07` Rogue Expertise profile | `rogue_expertise` | Level-1 Expertise two-skill choice is evidenced; all-level claim becomes supported only if the level 6 additional Expertise grant is owned, otherwise strict level-1 closure keeps all-level subset residual | coverage claim/evidence files | after `AT-L1-03S` |
| `AT-L1-08` Wizard Arcane Recovery sheet profile | `wizard_arcane_recovery` | Character Sheet short-rest spell-slot recovery profile and supported claim | character-sheet markers, coverage claim/evidence files | none |
| `AT-L1-09` Light/outline witness promotion | `faerie_fire`, `light` | Both Units promoted to supported only if the residual checklist passes with explicit light/outline witness boundary | `unit-claims.jsonl`; generated coverage is integration-owned | none |
| `AT-L1-10` Falling/jump witness promotion | `feather_fall`, `jump` | Both Units promoted to supported only if the residual checklist passes with explicit falling/landing/jump witness boundary | `unit-claims.jsonl`; generated coverage is integration-owned | none |
| `AT-L1-11` Area hazard/obscurement witness promotion | `fog_cloud`, `grease` | Both Units promoted to supported only if the residual checklist passes with explicit area/wind/movement witness boundary | `unit-claims.jsonl`; generated coverage is integration-owned | none |
| `AT-L1-12` Thunderwave witness promotion | `thunderwave` | Thunderwave promoted to supported only if the residual checklist passes with explicit push/object/sound witness boundary | `unit-claims.jsonl`; generated coverage is integration-owned | none |
| `AT-L1-13` Strict level-1 metric infrastructure | matrix and SRD inventory | Generated strict JSON/Markdown reports wired into coverage check | `scripts/level1-full-support-report.cjs`, checker/config, strict generated artifacts | none |
| `AT-L1-14` Later-level strict closure classifier | Bard, Monk, Ranger subset rows | Strict report closes only later-level residuals without changing all-level claims | strict report helper and generated artifacts | after `AT-L1-01` and `AT-L1-13` |

### Atomic Launch Wave

Wave 0:

- `AT-L1-13`

Wave 1, parallel after `AT-L1-13` establishes the strict report shape:

- `AT-L1-01`
- `AT-L1-02`
- `AT-L1-03S`
- `AT-L1-08`
- `AT-L1-09`
- `AT-L1-10`
- `AT-L1-11`
- `AT-L1-12`

Wave 2:

- `AT-L1-03`, after `AT-L1-03S`
- `AT-L1-04`, after `AT-L1-03S`
- `AT-L1-05`, after `AT-L1-03S`
- `AT-L1-06`, after `AT-L1-03S`
- `AT-L1-07`, after `AT-L1-03S`
- `AT-L1-14`, after `AT-L1-01` and `AT-L1-13`.

### Atomic Prompt AT-L1-01

Implement `AT-L1-01` from
`plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`: Hunter's Mark / Favored Enemy claim
cleanup.

Inputs:

- Unit ids: `hunters_mark`, `ranger_favored_enemy`.
- RAW: Hunter's Mark spell, Ranger Favored Enemy, UBIQUITOUS_LANGUAGE Ability
  Check / Skill / Advantage.
- Existing SRDINV87C implementation evidence in battle-runtime QNT/runtime
  tests.

Outputs:

- `hunters_mark` is `supported-profile` and includes Wisdom (Perception or
  Survival) Advantage to find the marked target.
- `ranger_favored_enemy` has only later-level free-cast scaling deferred.
- SRDINV87C task/profile refs and deterministic `ranger_favored_enemy`
  identity evidence are current.

Primary files:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/task-claims.jsonl`
- `plans/unit-profile-coverage/profiles.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `packages/battle-runtime/src/index.test.ts`

Extra verification:

- `pnpm --filter @dnd/battle-runtime test` if runtime/test marker files are
  touched beyond comments.

### Atomic Prompt AT-L1-02

Implement `AT-L1-02` from
`plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`: runtime-detached closure and
character-fact split claims.

Inputs:

- Unit ids: `alarm`, `comprehend_languages`, `identify`, `silent_image`,
  `speak_with_animals`, `detect_evil_and_good`, `detect_magic`,
  `detect_poison_and_disease`, `druid_druidic`, `minor_illusion`,
  `rogue_thieves_cant`, `charm_person`.
- RAW table in L1FS6.
- Runtime-detached table adjudication vocabulary.

Outputs:

- Five no-claim spell Units have explicit `unsupported-profile` claims with
  `outside-runtime-presentation-exploration` closure.
- Existing installed closure wording is aligned if needed.
- `druid_druidic` separates Druidic known-language and always-prepared Speak
  with Animals Spell Access as CharacterBuild/Character Creation facts from
  hidden-message table adjudication.
- `rogue_thieves_cant` separates Thieves' Cant plus the additional language
  choice as CharacterBuild/Character Creation facts from communication table
  adjudication.
- `charm_person` remains subset-supported for battle Charmed behavior with
  runtime-detached social aftermath.

Primary files:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl` if character-fact evidence is
  missing
- generated coverage artifacts owned by integration refresh

Do not add battle-runtime profiles, reducers, QNT, or MBT. Do not close
`druid_druidic` or `rogue_thieves_cant` as pure runtime-detached adjudication.

### Atomic Prompt AT-L1-03S

Implement `AT-L1-03S`: Character Creation support scaffold.

Inputs:

- Shared profile ids from L1FS2:
  `character-creation.class-feature-feat-choice`,
  `character-creation.weapon-mastery-choice`,
  `character-creation.eldritch-invocation-choice`,
  `character-creation.class-feature-option-projection`, and
  `character-creation.skill-expertise-choice`.
- Existing character-creation owner evidence from `SRDINV1B`, `SRDINV18`,
  `SRDINV18A`, and `SRDINV20`.

Outputs:

- Add or reuse the shared Character Creation profile rows.
- Add Character Creation runtime/test owner markers if absent.
- Add shared completed-runtime-parity task claims for the profile ids.
- Do not edit Unit claims for individual Units in this scaffold task.

Primary files:

- `plans/unit-profile-coverage/profiles.jsonl`
- `plans/unit-profile-coverage/task-claims.jsonl`
- `packages/character-creation-runtime/src/index.ts`
- `packages/character-creation-runtime/src/index.test.ts`

Extra verification:

- `pnpm --filter @dnd/character-creation-runtime test` if runtime/test marker
  files are touched beyond comments.

### Atomic Prompt AT-L1-03

Implement `AT-L1-03`: Fighter Fighting Style character profile.

Inputs:

- Unit id: `fighter_fighting_style`.
- RAW: Fighter Level 1 Fighting Style.
- Existing character-creation owner evidence from `SRDINV1B`.

Outputs:

- Reuse `character-creation.class-feature-feat-choice` from `AT-L1-03S`.
- Evidence the level-1 Fighting Style choice/finalization boundary.
- Convert `fighter_fighting_style` to all-level `supported-profile` only if an
  advancement/replacement owner is also evidenced.
- Otherwise keep the all-level claim `profile-subset-supported` and make the
  strict level-1 report close only the level-1 character-creation slice.
- Add deterministic identity evidence for `fighter_fighting_style`.

Primary files:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`

Extra verification:

- `pnpm --filter @dnd/character-creation-runtime test` if runtime/test marker
  files are touched beyond comments.

### Atomic Prompt AT-L1-04

Implement `AT-L1-04`: Weapon Mastery character profile.

Inputs:

- Unit ids: `fighter_weapon_mastery`, `barbarian_weapon_mastery`,
  `paladin_weapon_mastery`, `ranger_weapon_mastery`, `rogue_weapon_mastery`.
- RAW: each class's Level 1 Weapon Mastery passage.
- UBIQUITOUS_LANGUAGE Weapon Mastery row.
- Existing character-creation owner evidence from `SRDINV1B` and `SRDINV20`.

Outputs:

- Reuse `character-creation.weapon-mastery-choice` from `AT-L1-03S`.
- Add or cite Character Sheet/rest support for Long Rest weapon-choice
  reselection.
- Convert all five Weapon Mastery container Units to `supported-profile` only
  after both initial choice and Long Rest reselection are evidenced.
- Add deterministic identity evidence for all five.
- Keep mastery property execution owned by selected mastery Units.

Primary files:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `packages/character-sheet-runtime/src/index.ts` if Long Rest reselection owner
  markers are absent
- `packages/character-sheet-runtime/src/index.test.ts` if Long Rest reselection
  test markers are absent

Extra verification:

- `pnpm --filter @dnd/character-sheet-runtime test` if Character Sheet
  runtime/test marker files are touched beyond comments.

### Atomic Prompt AT-L1-05

Implement `AT-L1-05`: Warlock Eldritch Invocations character profile.

Inputs:

- Unit id: `warlock_eldritch_invocations`.
- RAW: Warlock Level 1 Eldritch Invocations.
- Existing character-creation owner evidence from `SRDINV18A`.

Outputs:

- Reuse `character-creation.eldritch-invocation-choice` from `AT-L1-03S`.
- Evidence the level-1 invocation choice and prerequisite-gating boundary.
- Convert `warlock_eldritch_invocations` to all-level `supported-profile` only
  if replacement/gain and prerequisite-retention lifecycle support is also
  evidenced.
- Otherwise keep the all-level claim `profile-subset-supported` and make the
  strict level-1 report close only the level-1 character-creation slice.
- Add deterministic identity evidence for `warlock_eldritch_invocations`.
- Keep individual invocation execution owned by selected invocation profiles.

Primary files and extra verification match `AT-L1-03`.

### Atomic Prompt AT-L1-06

Implement `AT-L1-06`: Cleric/Druid order character profile.

Inputs:

- Unit ids: `cleric_divine_order`, `druid_primal_order`.
- RAW: Cleric Divine Order, Druid Primal Order.
- Existing character-creation owner evidence from `SRDINV18`.

Outputs:

- Reuse `character-creation.class-feature-option-projection` from `AT-L1-03S`.
- Convert both order Units to `supported-profile`.
- Add deterministic identity evidence for both.
- Preserve build projection as the runtime-owned output.

Primary files and extra verification match `AT-L1-03`.

### Atomic Prompt AT-L1-07

Implement `AT-L1-07`: Rogue Expertise character profile.

Inputs:

- Unit id: `rogue_expertise`.
- RAW: Rogue Level 1 Expertise.
- UBIQUITOUS_LANGUAGE Expertise row.
- Existing character-creation owner evidence from `SRDINV18`.

Outputs:

- Reuse `character-creation.skill-expertise-choice` from `AT-L1-03S`.
- Evidence the level-1 two-skill Expertise choice boundary.
- Convert `rogue_expertise` to all-level `supported-profile` only if the Rogue
  level 6 additional Expertise grant is also owned/evidenced.
- Otherwise keep the all-level claim `profile-subset-supported` and make the
  strict level-1 report close only the initial two-skill Expertise slice.
- Add deterministic identity evidence for `rogue_expertise`.

Primary files and extra verification match `AT-L1-03`.

### Atomic Prompt AT-L1-08

Implement `AT-L1-08`: Wizard Arcane Recovery Character Sheet profile.

Inputs:

- Unit id: `wizard_arcane_recovery`.
- RAW: Wizard Arcane Recovery and Wizard Spellcasting.
- UBIQUITOUS_LANGUAGE Spell Slot, Pact Slot, Short Rest, Long Rest.
- Existing Character Sheet owner evidence from `SRDINV24`.

Outputs:

- Add `character-sheet.short-rest-spell-slot-recovery`.
- Add Character Sheet runtime/test owner markers.
- Convert `wizard_arcane_recovery` to `supported-profile`.
- Add deterministic identity evidence for `wizard_arcane_recovery`.

Primary files:

- `plans/unit-profile-coverage/profiles.jsonl`
- `plans/unit-profile-coverage/task-claims.jsonl`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `packages/character-sheet-runtime/src/index.ts`
- `packages/character-sheet-runtime/src/index.test.ts`

Extra verification:

- `pnpm --filter @dnd/character-sheet-runtime test` if runtime/test marker files
  are touched beyond comments.

### Atomic Prompt AT-L1-09

Implement `AT-L1-09`: Light/outline witness promotion.

Inputs:

- Unit ids: `faerie_fire`, `light`.
- Existing deterministic evidence: `SRDINV58C`, `SRDINV70B`.
- Owner docs: light/obscurement witness PRD and SRDINV89D.

Outputs:

- Promote both Units to `supported-profile`.
- Preserve existing profile ids.
- Replace deferred spatial/presentation wording with explicit
  table-supplied-runtime-witness support boundary.
- Include a residual checklist proving each remaining fact is either an existing
  typed table-supplied runtime witness with owner/test evidence or
  runtime-detached table adjudication/presentation. If the checklist fails, do
  not promote the Unit.

Primary files:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- generated coverage artifacts

Do not add light propagation, LOS, geometry, or pathfinding reducers.

### Atomic Prompt AT-L1-10

Implement `AT-L1-10`: Falling/jump witness promotion.

Inputs:

- Unit ids: `feather_fall`, `jump`.
- Existing deterministic evidence: `SRDINV56A`, `SRDINV53`.
- Owner docs: SRDINV54, movement geometry ownership, SRDINV89D.

Outputs:

- Promote both Units to `supported-profile`.
- Preserve existing profile ids.
- Express falling, landing, legal destination, Difficult Terrain landing, and
  jump path facts as table-supplied runtime witnesses where appropriate.
- Include a residual checklist proving each remaining fact is either an existing
  typed table-supplied runtime witness with owner/test evidence or
  runtime-detached table adjudication/presentation. If the checklist fails, do
  not promote the Unit.

Primary files:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- generated coverage artifacts

Do not add elevation, pathfinding, collision, or final-position derivation.

### Atomic Prompt AT-L1-11

Implement `AT-L1-11`: Area hazard/obscurement witness promotion.

Inputs:

- Unit ids: `fog_cloud`, `grease`.
- Existing deterministic evidence: `SRDINV84E`, `SRDINV40`.
- Owner docs: light/obscurement witness PRD, movement geometry ownership,
  SRDINV89D.

Outputs:

- Promote both Units to `supported-profile`.
- Preserve existing profile ids.
- Express area membership, wind, movement-cost, and grid/path facts as
  table-supplied runtime witnesses when consumed by the claim, or
  runtime-detached table adjudication/presentation when no runtime procedure
  consumes them.
- Include a residual checklist proving each remaining fact is either an existing
  typed table-supplied runtime witness with owner/test evidence or
  runtime-detached table adjudication/presentation. If the checklist fails, do
  not promote the Unit.

Primary files:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- generated coverage artifacts

Do not add automatic area membership, wind derivation, line-of-sight, or
pathfinding.

### Atomic Prompt AT-L1-12

Implement `AT-L1-12`: Thunderwave witness promotion.

Inputs:

- Unit id: `thunderwave`.
- Existing deterministic evidence: `SRDINV51`.
- Owner docs: movement geometry ownership and SRDINV89D.

Outputs:

- Promote `thunderwave` to `supported-profile`.
- Preserve existing profile id.
- Express push destination/blockage, object disposition, and audible-boom facts
  as table-supplied runtime witnesses when consumed by the claim, or
  runtime-detached table adjudication/presentation when no runtime procedure
  consumes them.
- Include a residual checklist proving each remaining fact is either an existing
  typed table-supplied runtime witness with owner/test evidence or
  runtime-detached table adjudication/presentation. If the checklist fails, do
  not promote the Unit.

Primary files:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- generated coverage artifacts

Do not add push geometry, object inventory simulation, or sound propagation.

### Atomic Prompt AT-L1-13

Implement `AT-L1-13`: strict level-1 metric infrastructure.

Inputs:

- `plans/unit-profile-coverage/unit-matrix.json`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- strict metric shape in L1FS1.

Outputs:

- `scripts/level1-full-support-report.cjs`.
- Coverage checker writes and stale-checks:
  `plans/unit-profile-coverage/level1-full-support.json` and
  `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`.
- Report shows strict runtime/profile support, strict target closure, product
  readiness, open frontier, and outside-denominator pressure.

Primary files:

- `scripts/level1-full-support-report.cjs`
- `scripts/unit-profile-coverage-check.cjs`
- `scripts/unit-profile-coverage-config.cjs`
- generated strict artifacts

Do not change Unit claims or runtime behavior.

### Atomic Prompt AT-L1-14

Implement `AT-L1-14`: later-level strict closure classifier.

Dependency:

- Requires `AT-L1-13`.
- Ranger part requires `AT-L1-01`; Bard/Monk can be verified without Ranger.

Inputs:

- Unit ids: `bard_bardic_inspiration`, `monk_martial_arts`,
  `ranger_favored_enemy`.
- Existing `later-level-only` deferred mechanics.

Outputs:

- Strict report classifies subset-supported rows with only later-level residuals
  as `closed-later-level-only`.
- Bard and Monk close for strict level 1.
- Ranger closes only when its only remaining deferred mechanic is later-level
  Favored Enemy scaling.

Primary files:

- `scripts/level1-full-support-report.cjs`
- generated strict artifacts

Do not change all-level Unit claims to `supported-profile` and do not implement
later-level scaling.

## Why The Strict Atom Set Is 15, Not The Whole Larger Batch

The 15 atomic tasks above are the current **strict support closure** tasks. They
operate on rows that already have an authored/installed Unit-matrix footprint in
the strict level-1 support denominator, plus the strict metric and shared
Character Creation scaffold needed to make that closure executable.

They intentionally do not include the next larger frontier: SRD level-1/cantrip
spell pressure that is visible in `srd-unit-inventory.json` but has no
Unit-matrix row yet. Those rows are outside the current denominator so the
current closure metric does not mix "support the installed/authored Unit" with
"expand the catalog/runtime surface to new Units."

Current larger-batch split:

| Batch | Count | Purpose |
| --- | ---: | --- |
| Strict support closure atoms | 15 | Close the current 34-row strict support frontier and add the executable metric. |
| No-matrix spell expansion research atoms | 14 | Decide whether missing SRD spell pressures should become runtime-supported Units, runtime-detached closures, Character Sheet tasks, future-owner tasks, companion/helper tasks, or stay catalog-only. |
| Non-executable class/profile expansion atoms | 6 | Decide whether accepted character-creation/source rows should become first-class support profiles or remain owner-evidence-only. |
| Total planned atomic work items | 35 | Closure plus the next expansion frontier. |

All 35 tasks below are pre-researched to the same minimum bar: known input rows,
current generated state, local RAW/source references, owner classification, and
expected output. The `AT-L1X` and `AT-L1Y` tasks are new larger-frontier tasks,
not further splits of the original strict closure atoms.

## No-Matrix Spell Expansion Research Batch

Status: pre-researched.

These 14 atomic tasks are **research/decision tasks**, not immediate support
implementation tasks. Each should be resolvable in one coding session by
confirming the cited RAW/current state and producing a ready
implementation/closure recommendation.

Shared current generated state:

- `surface.state`: `outside-surface-runtime-mechanics`.
- `authoredContent.state`: `missing-authored-record`.
- `catalogAdmission.state`: `not-installed`.
- `finalDisposition`: `catalog-only/no-runtime-profile`.
- `battleReadinessStatus`: `accepted-no-battle-effect`.

That means these rows are intentionally outside the current strict denominator
until a task first authors/adopts a real Surface UnitRecord through the normal
provenance path. A missing-authored-record task must not add Unit claims,
runtime-detached closures, support profiles, or evidence for a Unit that does
not yet exist. Its output is a candidate pressure disposition and, if needed, a
follow-up implementation atom to author/admit the Unit first.

Universal output for each `AT-L1X` task:

- local RAW passage references;
- current Surface authored record/catalog/matrix state;
- `packageOwner`: an existing package owner such as `@dnd/battle-runtime`,
  `@dnd/character-sheet-runtime`, or `@dnd/character-creation-runtime`, or
  `null` when no current package owns the row;
- `closureKind`: `table-supplied-runtime-witness`,
  `runtime-detached-table-adjudication`, `catalog-only/no-runtime-profile`, or
  `owner-decision-required`;
- owner-decision notes when `packageOwner` is `null`;
- proposed Unit claim/profile shape only if the task first proposes a real
  authored/admitted UnitRecord path;
- one or more follow-up implementation tasks only if implementation is needed;
- a task-local decision artifact under
  `plans/unit-profile-coverage/frontier-decisions/<unit-id>.md`. The frontier
  plan summary is integration-owned and should not be edited by individual
  `AT-L1X` worktrees.

Universal verification:

- Do not run MBT.
- Run `pnpm unit-profile-coverage:check` if coverage files are edited.
- Run `/simplify` only if the task changes generated code or claim/profile
  structure; pure research notes do not need it.

| Research task | Unit id | RAW source | RAW mechanics summary | Pre-researched owner classification | Expected output |
| --- | --- | --- | --- | --- | --- |
| `AT-L1X-01` | `create_or_destroy_water` | `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1213` | Create/destroy 10 gallons, rain in a Cube extinguishes exposed flames, destroy fog in a Cube, slot scaling. | `packageOwner: null`; decide between future environment subsystem, table-supplied runtime witness if fog removal touches runtime Fog Cloud state, or runtime-detached table adjudication. | Produce decision artifact; do not add a Unit claim until a real UnitRecord path exists. |
| `AT-L1X-02` | `disguise_self` | `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1490` | Self appearance illusion, physical inspection failure, Study/Investigation detection. | `packageOwner: null`; runtime-detached illusion/social adjudication unless a future UI owns disguise state. | Produce decision artifact with closure recommendation; no battle runtime profile. |
| `AT-L1X-03` | `druidcraft` | `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1729` | Weather sensor, bloom, harmless sensory effect, light/snuff small flames. | `packageOwner: null`; runtime-detached noncombat utility unless a future environment subsystem owns persistence. | Produce catalog-only/no-runtime-profile decision artifact. |
| `AT-L1X-04` | `elementalism` | `.references/srd-5.2.1/Spells/Descriptions-E-L.md:45` | Breeze, dust/sand word, embers/smoke, mist/water, crude element shape. | `packageOwner: null`; runtime-detached utility unless future environment/object persistence owner exists. | Produce decision artifact: closure or follow-up environment/object Unit authoring task. |
| `AT-L1X-05` | `floating_disk` | `.references/srd-5.2.1/Spells/Descriptions-E-L.md:552` | Carrying disk, 500 lb limit, follows within 20 ft, terrain/elevation limits, 100 ft expiry. | `packageOwner: null`; decide between future object/inventory movement subsystem and runtime-detached table adjudication. | Produce decision artifact; no claim until package owner and UnitRecord path exist. |
| `AT-L1X-06` | `goodberry` | `.references/srd-5.2.1/Spells/Descriptions-E-L.md:871` | Ten 24-hour berries, Bonus Action eat, 1 HP, nourishment, expiry. | `packageOwner: null` unless Character Sheet owns inventory consumables; decide whether HP/nourishment/expiry need `@dnd/character-sheet-runtime` support. | Produce Character Sheet follow-up task if inventory consumables are in scope; otherwise decision artifact with explicit owner-decision closure. |
| `AT-L1X-07` | `illusory_script` | `.references/srd-5.2.1/Spells/Descriptions-E-L.md:1354` | Writing illusion, designated readers, altered meaning/handwriting/language, dispel cleanup, Truesight. | `packageOwner: null`; runtime-detached document/illusion adjudication unless a future document subsystem exists. | Produce decision artifact; no runtime profile. |
| `AT-L1X-08` | `mage_hand` | `.references/srd-5.2.1/Spells/Descriptions-M-P.md:18` | Spectral hand, object/container manipulation, later Magic action control, 30 ft move, cannot attack/activate magic items/carry >10 lb. | `packageOwner: null`; decide between future object-control subsystem and runtime-detached table adjudication. | Produce decision artifact; no claim until package owner and UnitRecord path exist. |
| `AT-L1X-09` | `mending` | `.references/srd-5.2.1/Spells/Descriptions-M-P.md:264` | Repair one object break/tear up to 1 foot; can repair magic item physically but not restore magic. | `packageOwner: null`; decide between future equipment/object subsystem and runtime-detached table adjudication. | Produce closure or future owner task recommendation. |
| `AT-L1X-10` | `message` | `.references/srd-5.2.1/Spells/Descriptions-M-P.md:279` | Private whisper/reply, range, familiar-target-through-barrier rule, silence/material blocking. | `packageOwner: null`; runtime-detached communication adjudication. | Produce decision artifact; no battle profile. |
| `AT-L1X-11` | `prestidigitation` | `.references/srd-5.2.1/Spells/Descriptions-M-P.md:733` | Minor sensory/fire/cleaning/warming/mark/trinket effects, up to three non-instantaneous effects. | `packageOwner: null`; runtime-detached utility/presentation adjudication unless future object/presentation owner exists. | Produce decision artifact: closure or future owner task recommendation. |
| `AT-L1X-12` | `purify_food_and_drink` | `.references/srd-5.2.1/Spells/Descriptions-M-P.md:933` | Remove poison/rot from nonmagical food/drink in 5-foot radius Sphere. | `packageOwner: null`; decide between future item/inventory subsystem and runtime-detached table adjudication. | Produce decision artifact; no claim until package owner and UnitRecord path exist. |
| `AT-L1X-13` | `thaumaturgy` | `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:848` | Minor wonders; Booming Voice gives Advantage on Charisma (Intimidation); fire/door/sound/tremor/cosmetic effects. | Mixed: `packageOwner: null` for utility effects; owner-decision required for Booming Voice Advantage on Charisma (Intimidation). | Decide whether Booming Voice requires a battle-owned Spell Effect, a Character Sheet temporary-effect owner, or a battle/runtime Ability Check witness; close remaining utility effects as runtime-detached table adjudication. |
| `AT-L1X-14` | `unseen_servant` | `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:1058` | Invisible Medium force, AC/HP/Str, cannot attack, Bonus Action command, object interaction, distance expiry. | `packageOwner: null`; decide between separate helper/object-control owner, companion worktree exclusion, or runtime-detached table adjudication. | Produce decision artifact; do not fold into Find Familiar companion work without explicit owner decision. |

### Expansion Launch Order

After the 15 strict closure atoms are underway, launch the expansion research in
three groups:

- Utility/runtime-detached candidates: `AT-L1X-02`, `AT-L1X-03`,
  `AT-L1X-04`, `AT-L1X-07`, `AT-L1X-10`, `AT-L1X-11`.
- Item/environment candidates: `AT-L1X-01`, `AT-L1X-05`, `AT-L1X-06`,
  `AT-L1X-08`, `AT-L1X-09`, `AT-L1X-12`.
- Mixed/owner-decision candidates: `AT-L1X-13`, `AT-L1X-14`.

Do not merge these into the current strict denominator until each has a normal
Unit claim/catalog disposition that says whether it is supported,
runtime-detached, or intentionally outside this product goal.

## Non-Executable Class/Profile Expansion Batch

Status: pre-researched.

These six atomic tasks add the next layer of "full support" planning without
splitting the existing strict closure atoms. They target level-1 rows that are
already accepted through owner evidence but are not part of the executable Unit
strict denominator.

The point is not to force all of them into `supported-profile`. The point is to
make an explicit domain decision for each row family:

- reject profile additions by default unless the task identifies a concrete
  runtime API, parser, support gate, hole/fill, finalization behavior, or
  CharacterBuild projection that is not already represented by existing owner
  evidence;
- if the row represents an actual character-creation/profile capability after
  that promotion gate, give it a first-class profile and evidence;
- if the row is only a source-table summary, keep it as an
  owner-evidence-only closure and make the strict report explain that;
- if adding a profile would duplicate already-derived facts, reject it and
  document why.

Universal output for each `AT-L1Y` task:

- row family and row count from `srd-unit-inventory.json`;
- local SRD source references;
- existing owner evidence summary;
- decision: profile it, keep owner-evidence-only, or classify as
  runtime-detached table adjudication when table adjudication is actually the
  closure;
- explicit promotion-gate result: name the concrete runtime API, parser,
  support gate, hole/fill, finalization behavior, or CharacterBuild projection
  that justifies any new profile, or state that no new profile is justified;
- if profiled, exact profile id(s), owner markers, Unit claim/evidence changes,
  and verification commands;
- if not profiled, exact strict-report wording so future agents do not reopen
  it as missing support;
- task-local decision artifact under
  `plans/unit-profile-coverage/frontier-decisions/<row-family>.md`. The frontier
  plan summary is integration-owned and should not be edited by individual
  `AT-L1Y` worktrees.

Shared current generated state:

- `class-container`: 12 rows, `catalog-installed-owner-evidence-present`,
  `accepted`.
- `core-trait`: 76 rows, `catalog-installed-owner-evidence-present`,
  `accepted`.
- `equipment-pressure`: 12 rows,
  `catalog-installed-owner-evidence-present`, `accepted`.
- `multiclass-entry`: 12 rows,
  `catalog-installed-owner-evidence-present`, `accepted`.
- `spell-access`: 7 rows, `catalog-installed-owner-evidence-present`,
  `accepted`.
- `class-table-summary`: 12 rows, generated state currently says
  `non-runtime`, `accepted-no-battle-effect`.

Relevant source/evidence:

- Local RAW lives in the 12 class files under
  `.references/srd-5.2.1/Classes/`.
- Existing row-level owner evidence lives in
  `plans/unit-profile-coverage/character-creation-owner-evidence.json` and, for
  shared algebra facts, `plans/unit-profile-coverage/shared-algebra-owner-evidence.json`.
- Existing generated row state is in
  `plans/unit-profile-coverage/srd-unit-inventory.json`.

| Research task | Row family | Count | Local RAW source | Current state | Pre-researched owner classification | Expected output |
| --- | --- | ---: | --- | --- | --- | --- |
| `AT-L1Y-01` | `class-container` | 12 | Class introduction and level-1 feature table in each class file. | Accepted via character-creation owner evidence. | Character Creation class progression admission/finalization. | Decide profile id `character-creation.class-progression-container` vs owner-evidence-only closure. |
| `AT-L1Y-02` | `core-trait` | 76 | Class "Core ... Traits" tables and level-1 class facts. | Accepted via character-creation owner evidence. | Character Creation projection from one class source record; shared algebra for prerequisites where applicable. | Pure no-edit research spike using the promotion gate; decide whether follow-up atoms are needed for armor/weapon/tool proficiencies, HP/Hit Die, ability/save/skill choices, or prerequisite/shared-algebra facts. |
| `AT-L1Y-03` | `equipment-pressure` | 12 | Starting Equipment row in each class source. | Accepted via character-creation owner evidence. | Character Creation/equipment projection. | Decide starting-equipment profile vs source projection closure. |
| `AT-L1Y-04` | `multiclass-entry` | 12 | Multiclass prerequisites/entry traits in class source and shared algebra evidence. | Accepted via character-creation owner evidence. | Shared-algebra prerequisite checks plus Character Creation entry trait projection. | Decide explicit multiclass profile(s) vs owner-evidence-only closure. |
| `AT-L1Y-05` | `spell-access` | 7 | Spellcasting sections for Bard, Cleric, Druid, Paladin, Ranger, Sorcerer, Wizard. | Accepted via character-creation owner evidence. | Character Creation spell access/preparation source facts; executable spell Units remain separate. | Decide first-class spell-access profile vs derived CharacterBuild evidence. |
| `AT-L1Y-06` | `class-table-summary` | 12 | Level table row in each class file. | Accepted as source/navigation owner evidence with no battle effect. | Owner-evidence-only source/navigation summary row. | Confirm owner-evidence-only closure and strict-report wording; avoid profiles. |

### Atomic Prompt AT-L1Y-01

Research `AT-L1Y-01`: class container profile decision.

Inputs:

- Row family: `class-container`.
- Unit ids: all 12 `class_*` level-1 class containers.
- Existing owner evidence in `character-creation-owner-evidence.json`.

Outputs:

- Decide whether class progression admission/finalization gets a first-class
  character-creation profile.
- If yes, propose exact profile id, owner markers, Unit claim/evidence changes,
  and verification commands.
- If no, add strict-report wording that class containers remain
  owner-evidence-only because profile state would duplicate class source facts.

### Atomic Prompt AT-L1Y-02

Research `AT-L1Y-02`: core trait profile decision.

Inputs:

- Row family: `core-trait`.
- Current count: 76 level-1 rows.
- Traits include armor training, Hit Point Die, Primary Ability, Saving Throws,
  skills, tools, and weapon proficiencies.

Outputs:

- Produce a task-local decision artifact only; do not edit claims/profiles in
  this task.
- Decide whether these traits need grouped profiles, such as
  `character-creation.class-core-trait-projection`, or should remain derived
  owner evidence.
- Apply the promotion gate separately to armor/weapon/tool proficiencies, HP/Hit
  Die, ability/Saving Throw/skill choices, and prerequisite/shared-algebra facts.
- Check no redundant state would be introduced.
- Produce exact follow-up implementation tasks only if grouped profiles are
  justified.

### Atomic Prompt AT-L1Y-03

Research `AT-L1Y-03`: starting equipment profile decision.

Inputs:

- Row family: `equipment-pressure`.
- Current count: 12 level-1 rows.
- Character Creation and equipment source records.

Outputs:

- Decide whether starting equipment selection/projection needs a
  character-creation/equipment support profile.
- If yes, define profile owner, Unit claim shape, deterministic evidence, and
  package tests.
- If no, document why source projection evidence is enough and how strict
  report should close it.

### Atomic Prompt AT-L1Y-04

Research `AT-L1Y-04`: multiclass entry trait profile decision.

Inputs:

- Row family: `multiclass-entry`.
- Current count: 12 level-1 rows.
- Character Creation and shared-algebra prerequisite/trait evidence.

Outputs:

- Decide whether multiclass entry prerequisites and proficiency grants need
  first-class support profiles.
- If yes, split follow-up implementation by owner only after this decision.
- If no, document owner-evidence-only closure and strict-report wording.

### Atomic Prompt AT-L1Y-05

Research `AT-L1Y-05`: spell access profile decision.

Inputs:

- Row family: `spell-access`.
- Current count: 7 level-1 rows: Bard, Cleric, Druid, Paladin, Ranger,
  Sorcerer, Wizard spellcasting.
- Character Creation spell access/preparation evidence.

Outputs:

- Decide whether class spell access/prepared-spell source facts need explicit
  character-creation profiles separate from executable spell Units.
- Avoid duplicating spell-list or prepared-spell state already represented in
  CharacterBuild.
- Produce profile/task/evidence shape only if it improves executable coverage.

### Atomic Prompt AT-L1Y-06

Research `AT-L1Y-06`: class table summary closure decision.

Inputs:

- Row family: `class-table-summary`.
- Current count: 12 level-1 rows.

Outputs:

- Confirm class table summary rows are source/navigation rows, not runtime
  support pressure.
- Add strict-report wording or taxonomy mapping so these rows stay
  owner-evidence-only and cannot be mistaken for missing profile work.
- Do not add profiles unless the research finds a real runtime or
  character-creation consequence not already covered by class containers,
  feature rows, or core traits.
