# QMBT65 SRD Class Catalog Admission and Widening Backlog Plan

## Decision

QMBT65 creates a durable catalog-admission lane for SRD class and class-feature
coverage. This lane is distinct from the narrow QMBT feature-widening slices:
it tells us what work exists, what priority it has, and what generated backlog
row owns each gap.

The backlog must be Ralph-executable without becoming too granular. It should
produce coarse task batches by level band and mechanics family, not one task
per Unit id.

## Current Facts

The broad content survey and the Unit profile matrix answer different
questions. The content survey inventories SRD pressure. The Unit profile matrix
tracks authored Surface Unit-shaped records, catalog admission, support
profiles, and evidence.

Current matrix metrics are recorded in
[UNIT_REPORT.md](UNIT_REPORT.md). At the time this task was added, the report
shows:

- installed collection inventory count: 59 Units;
- authored Surface Unit catalog admission: 58/391;
- authored Surface executable catalog admission: 44/334;
- supported executable Unit coverage: 32/45;
- deterministic admission/projection coverage: 32/32.

Class catalog admission is visibly incomplete. The SRD has 12 class files under
`.references/srd-5.2.1/Classes/`, while only `class_fighter` and
`class_wizard` are currently authored as installed `kind: "class"` container
Units. The missing class container records are Barbarian, Bard, Cleric, Druid,
Monk, Paladin, Ranger, Rogue, Sorcerer, and Warlock.

The current matrix already exposes 32 authored `class_feature` records as
`unsupported-widening-pressure` because they are executable SRD-authored data
absent from the installed Unit catalog. That generated pressure must not be
lost when future narrow slices keep promoting individual features.

## Backlog Shape

QMBT65 should add or refine a generated class/catalog backlog with stable rows.
The backlog should be derived from existing sources rather than maintained as a
parallel hand-written registry:

- SRD class files under `.references/srd-5.2.1/Classes/`;
- authored Surface records under `packages/surface/content/`;
- installed Unit catalog state;
- `unit-claims.jsonl`, `unit-evidence.jsonl`, and generated matrix
  dispositions;
- private PHB/XPHB pressure only after it has been translated into the public
  Classic non-SRD mechanics lane or an allowed matrix gap.

Each backlog row should have enough data to choose work without reading every
source file manually:

- stable row id;
- class name or owning content family;
- Unit id when an authored Unit exists;
- SRD source path and local anchor if available;
- kind, such as `class`, `class_feature`, `species_trait`, `mastery`, `spell`,
  or `magic_item`;
- level or level band when the SRD gives one;
- current status: missing authored record, authored not in catalog, installed
  unsupported, needs surface widening, supported with deterministic evidence,
  selected identity MBT, non-runtime data, or needs assumption;
- next action category: author Surface record, install catalog record, add
  unsupported disposition, widen Surface shape, add QNT profile/MBT expectation,
  implement TS/runtime support, add deterministic admission evidence, or choose
  selected identity MBT.

## Priority Rule

Use level as the first ordering signal for class-driven work:

- priority 1: level 1 class records, level 1 class features, starting-character
  pressure, and spell access needed by level 1 characters;
- priority 2: level 2 class features;
- priority 3: level 3 class/subclass pressure;
- continue with the same level-number priority for later levels;
- put rows whose level cannot be derived into `needs-level-indexing` until the
  checker can recover the level from SRD text or authored structured fields.

Within a level, prefer work that unblocks several Units or a reusable profile
family over isolated one-off work. QMBT implementation tasks should be sized as
coarse batches such as "level-1 class catalog admission", "level-2 resource
features", or "reaction reduction features", not one task per Unit id.

## Red/Green Direction

The implementation order is not fixed.

For already-authored TypeScript content, work often flows from TS admission to
QNT/MBT and then matrix evidence. For not-yet-implemented mechanics, the flow
may deliberately start from matrix pressure and QNT/MBT expectations before TS
runtime support. QMBT65 should preserve both directions in generated statuses
and next-action labels.

## Acceptance Criteria

- All 12 SRD classes appear in the generated class/catalog backlog.
- The 10 missing class container records are explicit rows, not prose-only
  memory.
- Every authored SRD `class_feature` record is represented with class owner,
  level or `needs-level-indexing`, current admission/support status, and next
  action.
- Existing `needs-surface-widening` and `unsupported-widening-pressure` rows
  remain durable and cannot silently disappear without becoming supported,
  closed by assumption, non-runtime, or deliberately removed as content cleanup.
- The backlog exposes level-priority ordering and a coarse Ralph batching
  recommendation.
- QNT remains procedure/profile-shaped; no plan asks QNT to enumerate all Unit
  ids.
- The generated report or checker gives a clear "how much is done" number for
  class/catalog admission and for executable widening pressure.

## Verification

- Read the relevant local SRD class files under `.references/srd-5.2.1/Classes/`
  and check `UBIQUITOUS_LANGUAGE.md` before modeling class, feature, level,
  catalog, or support statuses.
- Run `pnpm unit-profile-coverage:check` after any checker, generated report,
  matrix, or claim/evidence changes.
- Do not run MBT for catalog planning alone. Use MBT only if the task also
  promotes runtime behavior.
- Run `/simplify` for at least two rounds unless the final changeset is
  trivial.
