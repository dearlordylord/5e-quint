# Restricted Stat Block Spell Invocation Decomposition

This note is the primary-source decomposition for
[#424](https://github.com/dearlordylord/5e-quint/issues/424). GitHub owns the
ticket, dependencies, and future status; this document owns only the durable
source and architecture findings needed to size that work.

## Conclusion

The 23-row `restrictionPresence: "present"` pressure group is not one Rule
Capability Increment. It is an identity-free **presence** grouping that joins
11 different typed restriction families, including battle effects,
initial-state projections, and table/exploration/world effects. The pressure
report explicitly says its proposals are planning pressure rather than a
support registry, and reports 23 occurrences across 21 records
([`plans/stat-block-procedure-pressure/REPORT.md:3-5`](../../plans/stat-block-procedure-pressure/REPORT.md),
[`REPORT.md:35-47`](../../plans/stat-block-procedure-pressure/REPORT.md)).

This distinction is required by RAW. A monster spell may change the referenced
spell through a special rule or restriction, and the SRD defines `self only` as
a semantic target restriction, not as a display annotation
([`Monsters/Overview.md:233-241`](../../.references/srd-5.2.1/Monsters/Overview.md)).

Therefore #424 should be retained as a **non-runnable decomposition parent**.
Its runnable children should each own one typed restriction family and its
actual execution boundary. A shared prerequisite may introduce the common
typed Surface restriction vocabulary and identity-independent invocation seam,
but it must not introduce one reducer for all 23 rows.

## Why the generated group is intentionally too coarse for execution

The current Surface schema retains `restriction` as optional exact prose beside
the referenced spell; it has no typed semantic projection
([`packages/surface/src/surface/schema-spell.ts:5454-5471`](../../packages/surface/src/surface/schema-spell.ts)).
The pressure analyzer consequently reduces every reference to only `absent` or
`present` and labels both cases `missingStatBlockSpellInvocationOwner`
([`packages/battle-runtime/src/stat-block-procedure-pressure.ts:1134-1145`](../../packages/battle-runtime/src/stat-block-procedure-pressure.ts)).
Its identity-safe normalizer removes names, ids, provenance, and `spellId`, and
replaces restriction prose with `authoredExpressionPresent`
([`stat-block-procedure-pressure.ts:1167-1194`](../../packages/battle-runtime/src/stat-block-procedure-pressure.ts)).
That is appropriate for catalog pressure and proves presence without publishing
an identity/prose crosswalk as runtime logic. It cannot prove common semantics.

The production projection has the matching runtime-owner gap. Spellcasting
procedures exhaustively return `missingSpellcastingProcedureOwner`
([`packages/battle-runtime/src/stat-block-authored-projection.ts:650-665`](../../packages/battle-runtime/src/stat-block-authored-projection.ts)),
and the runtime source contains core Stat Block facts, procedure bindings,
resource bindings, and Legendary Action uses but no typed Stat Block spell
invocation or restriction fact
([`packages/battle-runtime/src/stat-block-execution-state.ts:53-62`](../../packages/battle-runtime/src/stat-block-execution-state.ts)).
Thus local RAW is sufficient to prove that the restrictions matter and to
decompose them, while current runtime ownership is insufficient to execute any
of the 23 restricted references through the Stat Block path.

## Exact 11 families and row membership

The family names below describe typed semantic contracts, not authored spell or
Stat Block identities. The authored JSON anchors are evidence at the permitted
catalog boundary; production admission and execution must consume the eventual
typed projections instead of these ids or prose. Every full row id is a member
of the checked inventory at
[`plans/stat-block-procedure-pressure/inventory.json`](../../plans/stat-block-procedure-pressure/inventory.json).

| Typed restriction family                                             | Count | Exact inventory rows                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Primary-source witness                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------------------------------------- | ----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Form-kind limit plus Temporary Hit Point and Concentration overrides |    12 | `stat-block-128:{"kind":"spellReference","section":"actions","procedureOrdinal":5,"groupOrdinal":1,"spellOrdinal":4}`; `stat-block-129:{"kind":"spellReference","section":"actions","procedureOrdinal":5,"groupOrdinal":1,"spellOrdinal":4}`; `stat-block-132:{"kind":"spellReference","section":"actions","procedureOrdinal":5,"groupOrdinal":1,"spellOrdinal":3}`; `stat-block-133:{"kind":"spellReference","section":"actions","procedureOrdinal":5,"groupOrdinal":1,"spellOrdinal":3}`; `stat-block-148:{"kind":"spellReference","section":"actions","procedureOrdinal":5,"groupOrdinal":1,"spellOrdinal":4}`; `stat-block-149:{"kind":"spellReference","section":"actions","procedureOrdinal":5,"groupOrdinal":1,"spellOrdinal":4}`; `stat-block-150:{"kind":"spellReference","section":"actions","procedureOrdinal":3,"groupOrdinal":1,"spellOrdinal":4}`; `stat-block-156:{"kind":"spellReference","section":"actions","procedureOrdinal":3,"groupOrdinal":1,"spellOrdinal":2}`; `stat-block-189:{"kind":"spellReference","section":"actions","procedureOrdinal":4,"groupOrdinal":1,"spellOrdinal":3}`; `stat-block-190:{"kind":"spellReference","section":"actions","procedureOrdinal":4,"groupOrdinal":1,"spellOrdinal":3}`; `stat-block-281:{"kind":"spellReference","section":"actions","procedureOrdinal":5,"groupOrdinal":1,"spellOrdinal":4}`; `stat-block-282:{"kind":"spellReference","section":"actions","procedureOrdinal":5,"groupOrdinal":1,"spellOrdinal":4}` | The restriction changes three independent spell facts ([`Monsters-A-B.md:1201-1204`](../../.references/srd-5.2.1/Monsters/Monsters-A-B.md)); the canonical Surface record retains the exact expression ([`stat_block_adult_brass_dragon.json:156`](../../packages/surface/content/stat_block_adult_brass_dragon.json)).                      |
| Illumination-triggered early termination                             |     1 | `stat-block-142:{"kind":"spellReference","section":"bonusActions","procedureOrdinal":2,"groupOrdinal":1,"spellOrdinal":1}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | [`Monsters-C-D.md:220-224`](../../.references/srd-5.2.1/Monsters/Monsters-C-D.md), [`stat_block_cloaker.json:115`](../../packages/surface/content/stat_block_cloaker.json)                                                                                                                                                                   |
| Created-substance substitution                                       |     1 | `stat-block-157:{"kind":"spellReference","section":"actions","procedureOrdinal":5,"groupOrdinal":2,"spellOrdinal":1}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | [`Monsters-C-D.md:750-754`](../../.references/srd-5.2.1/Monsters/Monsters-C-D.md), [`stat_block_djinni.json:165`](../../packages/surface/content/stat_block_djinni.json)                                                                                                                                                                     |
| Duration override plus same-caster recast termination                |     1 | `stat-block-163:{"kind":"spellReference","section":"actions","procedureOrdinal":4,"groupOrdinal":1,"spellOrdinal":2}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | [`Monsters-C-D.md:961-964`](../../.references/srd-5.2.1/Monsters/Monsters-C-D.md), [`stat_block_dryad.json:125`](../../packages/surface/content/stat_block_dryad.json)                                                                                                                                                                       |
| Duration override                                                    |     1 | `stat-block-197:{"kind":"spellReference","section":"actions","procedureOrdinal":3,"groupOrdinal":1,"spellOrdinal":2}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | [`Monsters-E-G.md:1230-1232`](../../.references/srd-5.2.1/Monsters/Monsters-E-G.md), [`stat_block_green_hag.json:111`](../../packages/surface/content/stat_block_green_hag.json)                                                                                                                                                             |
| Self-target limit plus movement-trace suppression                    |     1 | `stat-block-197:{"kind":"spellReference","section":"actions","procedureOrdinal":3,"groupOrdinal":1,"spellOrdinal":3}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | [`Monsters-E-G.md:1230-1232`](../../.references/srd-5.2.1/Monsters/Monsters-E-G.md), [`stat_block_green_hag.json:115`](../../packages/surface/content/stat_block_green_hag.json)                                                                                                                                                             |
| Appearance size/form expansion                                       |     1 | `stat-block-223:{"kind":"spellReference","section":"actions","procedureOrdinal":4,"groupOrdinal":1,"spellOrdinal":1}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | [`Monsters-H-L.md:666-669`](../../.references/srd-5.2.1/Monsters/Monsters-H-L.md), [`stat_block_lamia.json:73`](../../packages/surface/content/stat_block_lamia.json)                                                                                                                                                                        |
| Already-applied Armor Class projection                               |     2 | `stat-block-226:{"kind":"spellReference","section":"actions","procedureOrdinal":3,"groupOrdinal":1,"spellOrdinal":3}`; `stat-block-227:{"kind":"spellReference","section":"actions","procedureOrdinal":3,"groupOrdinal":1,"spellOrdinal":6}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | [`Monsters-M-O.md:30-34`](../../.references/srd-5.2.1/Monsters/Monsters-M-O.md), [`Monsters-M-O.md:78-82`](../../.references/srd-5.2.1/Monsters/Monsters-M-O.md), [`stat_block_mage.json:64`](../../packages/surface/content/stat_block_mage.json), [`stat_block_archmage.json:73`](../../packages/surface/content/stat_block_archmage.json) |
| Pre-combat application                                               |     1 | `stat-block-227:{"kind":"spellReference","section":"actions","procedureOrdinal":3,"groupOrdinal":3,"spellOrdinal":2}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | [`Monsters-M-O.md:78-82`](../../.references/srd-5.2.1/Monsters/Monsters-M-O.md), [`stat_block_archmage.json:116`](../../packages/surface/content/stat_block_archmage.json)                                                                                                                                                                   |
| Self-target limit for planar transition                              |     1 | `stat-block-243:{"kind":"spellReference","section":"actions","procedureOrdinal":4,"groupOrdinal":2,"spellOrdinal":2}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | [`Monsters-M-O.md:678-681`](../../.references/srd-5.2.1/Monsters/Monsters-M-O.md), [`stat_block_night_hag.json:133`](../../packages/surface/content/stat_block_night_hag.json)                                                                                                                                                               |
| Self-target limit for a condition spell                              |     1 | `stat-block-248:{"kind":"spellReference","section":"bonusActions","procedureOrdinal":1,"groupOrdinal":1,"spellOrdinal":1}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | [`Monsters-M-O.md:856-858`](../../.references/srd-5.2.1/Monsters/Monsters-M-O.md), [`stat_block_oni.json:171`](../../packages/surface/content/stat_block_oni.json)                                                                                                                                                                           |

The counts sum to 23. The first, fourth, and sixth rows each contain multiple
typed obligations within one authored restriction; therefore even an
11-variant prose-classification enum would be insufficient. The typed payload
must make each changed spell fact explicit and permit one invocation to project
to more than one owner.

## Ownership decomposition

The following ownership is an architecture inference from the cited RAW, not a
claim that the current runtime implements it:

- **Battle execution and lifecycle:** form-kind/Temporary Hit
  Point/Concentration overrides; illumination-triggered termination;
  same-caster recast termination where the effect is present in battle; and the
  self-target admission portions of the two Invisibility restrictions and the
  planar-transition restriction. Existing generic spell owners should be
  reused where their typed procedures match: Invisibility already has direct
  condition lifecycle owners
  ([`plans/rules-kernel-coverage/obligations.jsonl:16`](../../plans/rules-kernel-coverage/obligations.jsonl)),
  and Mirror Image already has battle invocation/interception owners
  ([`obligations.jsonl:73`](../../plans/rules-kernel-coverage/obligations.jsonl)).
  The leaf adds only the restriction delta and Stat Block invocation route; it
  does not clone the base spell reducer.
- **Initial-state projection:** `included in AC` is already reflected in the
  authored scalar AC copied into runtime, but there is no typed consumed-effect
  witness; `cast before combat` requires a pre-battle active-effect projection
  rather than a runnable combat cast. The current scalar projection simply
  copies `source.ac.value`
  ([`packages/battle-runtime/src/stat-block-authored-projection.ts:253-289`](../../packages/battle-runtime/src/stat-block-authored-projection.ts)).
- **Table/exploration/world ownership:** created wine, long-duration disguise,
  appearance expansion, track suppression, and the scene/plane-transition part
  of the self-only planar spell are not battle-reducer obligations merely
  because the invocation is authored in a Stat Block action. Leaves must either
  reuse an existing non-battle owner or return a precise typed continuation for
  the table/world boundary; they must not invent battle state to represent
  these facts.

The split restriction rows demonstrate why whole-row ownership is also too
coarse: Green Hag Invisibility combines battle target admission with
exploration trace suppression, and self-only planar transition combines target
admission with world/scene movement.

## #424 parent and leaf acceptance

#424 is non-runnable until its decomposition is represented by bounded children
and honest dependencies. In addition to its existing reconciliation dependency
on [#351](https://github.com/dearlordylord/5e-quint/issues/351), runnable leaves
are blocked by the shared typed Surface restriction projection and by the base
identity-independent Stat Block spell invocation route owned with
[#418](https://github.com/dearlordylord/5e-quint/issues/418). A leaf may proceed
only when its base spell procedure and destination runtime/table owner exist;
catalog presence is not that proof.

Shared acceptance:

1. Replace opaque execution input with a closed typed restriction payload that
   can express multiple deltas for one reference, while retaining exact prose
   only at the authored/presentation boundary.
2. Project every restriction component to its actual owner and return precise
   typed unsupported or continuation states for components whose owner is
   absent; never silently discard a table/world component after executing a
   battle component.
3. Reuse existing spell procedure, lifecycle, initial-state, and world/table
   owners. Add only the missing Stat Block invocation/restriction seams and any
   genuinely absent generic semantic core.
4. Prove identity independence with equivalent visibly synthetic procedure
   shapes. Runtime dispatch must not read a Stat Block id/name, spell id/name,
   provenance, or protected restriction prose.
5. Give every executable leaf a precise RAW requirement, rules-kernel
   obligation, production owner, semantic-core Quint owner when the destination
   is executable, and focused parity witness. A table/world continuation is
   accepted by its typed boundary evidence rather than by a fake battle/QNT
   owner.
6. Reconcile only the exact rows owned by a completed leaf. The 23 rows must not
   move together merely because the pressure artifact grouped their common
   prose presence.

This keeps the repository's established boundary intact: authored Stat Blocks
remain Surface data, generic facilities own mechanics, and runtime consumes
typed procedure facts rather than authored identity
([`docs/adr/0003-monster-stat-blocks-authored-data-provenance.md:1-18`](../adr/0003-monster-stat-blocks-authored-data-provenance.md)).

## Evidence-discovery sufficiency

The mandated bounded `rg -uu` search for the expected restriction phrases was
run against `.references/srd-5.2.1/Monsters` in both the main checkout and this
linked worktree, followed by direct reads of the matching monster files and
`Monsters/Overview.md`. Both checkouts resolved the same passages. No external
rules source was needed: local RAW is sufficient for this decomposition. The
insufficiency is in the current typed Surface/runtime owner, as demonstrated by
the opaque prose schema and exhaustive `missingOwner` projection above.
