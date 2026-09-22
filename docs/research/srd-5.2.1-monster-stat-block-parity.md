# SRD 5.2.1 monster Stat Block parity

Research date: 2026-08-25.

## Conclusion

Monster Stat Block parity is **partially implemented**. The installed SRD
catalog contains 21 of 330 distinct standalone Stat Blocks, or **6.36%**.
Catalog infrastructure, provenance homogeneity, battle initialization, and a
useful generic attack/control slice exist, but the repository has neither full
SRD catalog membership nor a schema capable of preserving every authored Stat
Block fact. Issue #337 now owns the source-to-catalog outcome with scoped
structural fidelity; full authored fidelity remains a separately named claim.

This report keeps three claims separate, as required by
[ADR-0003](../adr/0003-monster-stat-blocks-authored-data-provenance.md):

1. **Authored membership parity** — every distinct standalone SRD Stat Block is
   present in the SRD collection.
2. **Canonical structural fidelity** — each installed record can represent the
   authored facts in the claimed fidelity scope rather than only its current
   combat projection.
3. **Runtime execution parity** — each represented procedure family is admitted
   and executed through generic typed mechanics.

The current answer is no on (1), no on full fidelity in (2), and partial on
(3). The accepted catalog program deliberately defers HP Hit Dice notation, so
its completion may establish catalog parity and scoped fidelity without
claiming full authored Stat Block fidelity.

## Evidence and denominator

The local RAW says a Stat Block contains all rules necessary to use a monster
and enumerates general details, combat highlights, ability scores, optional
details, Traits, Actions, Bonus Actions, Reactions, and Legendary Actions
([Monster overview](../../.references/srd-5.2.1/monsters.md#stat-block-overview)).
The repository's ubiquitous language likewise includes HP with Hit Dice,
Saving Throws, Skills, defenses, Senses, Languages, CR, and all action sections
([UBIQUITOUS_LANGUAGE.md](../../UBIQUITOUS_LANGUAGE.md#creatures-and-stat-blocks)).

A bounded `rg -uu` discovery for `Stat Block`, `**AC**`, `Multiattack`, and
limited-use headings was followed by direct inspection of
[monsters.md](../../.references/srd-5.2.1/monsters.md),
[rules-glossary.md](../../.references/srd-5.2.1/rules-glossary.md#stat-block),
and representative bestiary files. Counting the invariant `**AC**` row in the
standalone bestiary gives:

| RAW owner                                                   | Source rows | Distinct names |
| ----------------------------------------------------------- | ----------: | -------------: |
| [animals.md](../../.references/srd-5.2.1/animals.md)        |          95 |             95 |
| [Monsters A–B](../../.references/srd-5.2.1/monsters-A-Z.md) |          41 |             41 |
| [Monsters C–D](../../.references/srd-5.2.1/monsters-A-Z.md) |          27 |             27 |
| [Monsters E–G](../../.references/srd-5.2.1/monsters-A-Z.md) |          40 |             40 |
| [Monsters H–L](../../.references/srd-5.2.1/monsters-A-Z.md) |          22 |             22 |
| [Monsters M–O](../../.references/srd-5.2.1/monsters-A-Z.md) |          25 |             25 |
| [Monsters P–S](../../.references/srd-5.2.1/monsters-A-Z.md) |          48 |             48 |
| [Monsters T–Z](../../.references/srd-5.2.1/monsters-A-Z.md) |          36 |             36 |
| **Total**                                                   |     **334** |        **330** |

The row and identity denominators differ because Stone Giant, Stone Golem,
Storm Giant, and Succubus occur in both P–S and T–Z. A completeness gate must
retain both source occurrences as evidence, compare their normalized facts,
and publish one identity only when they agree. This report excludes the five
additional `**AC**` rows found in spell and magic-item descriptions; those are
inline created-entity/object shapes, not standalone Animals/Monsters entries,
and need a separately named scope decision.

The installed collection is assembled from only five generated JSON imports
([stat-block-catalog.ts](../../packages/surface/src/surface/stat-block-catalog.ts#L4-L10),
[collection assembly](../../packages/surface/src/surface/stat-block-catalog.ts#L112-L124)).
Their decoded membership is 21 unique records: 14 sourced from `animals.md`
and 7 from `monsters-A-Z.md`.

| Membership           | Installed | Distinct RAW | Missing |    Parity |
| -------------------- | --------: | -----------: | ------: | --------: |
| Animals              |        14 |           95 |      81 |    14.74% |
| Monsters files       |         7 |          235 |     228 |     2.98% |
| **Standalone total** |    **21** |      **330** | **309** | **6.36%** |

Catalog construction does correctly reject duplicate ids and mixed provenance
([stat-block-catalog.ts](../../packages/surface/src/surface/stat-block-catalog.ts#L126-L178)).
The aggregate test, however, checks only that both collections are non-empty
and provenance-homogeneous; it has no source-derived membership denominator
([schema.test.ts](../../packages/surface/src/surface/schema.test.ts#L321-L338)).

The generated corpus audit has the same boundary. It scans records already
present under `packages/surface/content`
([srd521-surface-authored-corpus-audit.cjs](../../scripts/srd521-surface-authored-corpus-audit.cjs#L808-L824))
and then describes that discovered set as the complete generated corpus
([same script](../../scripts/srd521-surface-authored-corpus-audit.cjs#L3222-L3231)).
Its accepted 622-record result therefore proves consistency of authored Surface
inputs, not completeness against RAW
([audit report](../../plans/srd-corpus-audit/surface-authored-corpus-audit.md#L1-L9)).

## Structural fidelity

Architecture defines `StatBlockRecord` as the full authored monster record, not
only numeric battle data
([ARCHITECTURE.md](../../ARCHITECTURE.md#authored-content)); ADR-0003 also
requires an executable/text-only typed distinction with a
`nonExecutableReason`
([ADR-0003](../adr/0003-monster-stat-blocks-authored-data-provenance.md#considered-options)).

The current `MonsterStatBlockSchema` is merely an alias of the reusable
`CreatureStatBlockSchema`
([schema.ts](../../packages/surface/src/surface/schema.ts#L481-L506)). The
underlying shape covers Size, base Creature Type, AC, fixed/projected HP,
speeds, ability scores, selected modifiers and defenses, special senses,
languages, actions, and traits
([schema-spell.ts](../../packages/surface/src/surface/schema-spell.ts#L5548-L5580)).
It cannot structurally preserve several fields required by the standalone
monster Stat Block grammar:

- alignment and descriptive Creature Type tags;
- Initiative score as distinct from its modifier;
- HP Hit Dice notation;
- AC source annotations such as Natural Armor or gear;
- Gear;
- Passive Perception as distinct from special senses; and
- monster spellcasting as typed spell access/casting facts.

HP Hit Dice notation is intentionally deferred by the accepted catalog scope
in #337. Its absence remains visible, but it is not a blocker for the current
330-record catalog-parity increment.

Some complex action prose can be retained as `specials`, but no schema branch
contains the ADR's required `nonExecutableReason`; repository search finds that
field only in the ADR. The current Goblin Warrior demonstrates the difference:
RAW includes its tag, alignment, Hit Dice, Stealth, Gear, and Passive Perception
([Monsters-E-G.md](../../.references/srd-5.2.1/monsters-A-Z.md#goblin-warrior)),
while its normalized record keeps selected battle facts and omits several of
those authored facts
([stat_block_goblin_warrior.json](../../packages/surface/content/stat_block_goblin_warrior.json)).
The focused test correspondingly asserts selected combat fields rather than a
whole-record correspondence
([stat-block-catalog.test.ts](../../packages/surface/src/surface/stat-block-catalog.test.ts#L224-L245)).

The publication layer can derive an exact `rulesExcerpt` from the provenance
locator for reading, but Surface documents that excerpt as presentation rather
than canonical mechanics or runtime input
([Surface README](../../packages/surface/README.md#raw-locator-and-publication-prose-boundary)).
It therefore does not close the structural-fidelity gap.

## Runtime and formal parity

The runtime has meaningful generic coverage. Stat Block combatant admission
projects AC, HP, Size, Creature Type, movement, abilities, modifiers, defenses,
and special senses from typed Surface facts
([stat-block-combatant-admission.ts](../../packages/battle-runtime/src/stat-block-combatant-admission.ts#L22-L36),
[projection](../../packages/battle-runtime/src/stat-block-combatant-admission.ts#L72-L123)).
Execution admission supports structurally admitted attacks, Multiattack whose
named dispatches all resolve, selected standard-action Bonus Actions, limited
uses and recharge, and attack-shaped Legendary Actions
([stat-block-execution.ts](../../packages/battle-runtime/src/stat-block-execution.ts#L187-L278)).
Generic attack support requires a literal attack bonus, supported damage and
condition riders, and the applicable reach/range
([statblock-attack-execution-mechanics.ts](../../packages/battle-runtime/src/statblock-attack-execution-mechanics.ts#L7-L17)).

This is not whole-record execution. Unsupported attacks, Multiattacks, and
Bonus Action options are skipped during admission rather than returned as typed
issues (`continue`/`null` paths at
[stat-block-execution.ts](../../packages/battle-runtime/src/stat-block-execution.ts#L194-L260)).
There is no admission branch there for Surface save actions, support actions,
special actions, spellcasting, or special Reactions. The 21 installed records
already exercise that frontier: all have Actions; 1 has Multiattack, 1 a save
action, 3 special actions, 1 a Bonus Action section, 1 a Reaction, and none a
Legendary Action section. Catalog presence consequently must not be described
as full executable support.

The reusable Quint control slice and runtime/MBT witnesses are real, but the RAW
coverage registry is stale or too broad: QCORE11 and QMBT6 are recorded done
(historical `plans/raw-coverage/task-claims.jsonl`, no longer present), while the generated
report still gives `RAW-QCORE11-STAT-BLOCK-CONTROLS-001` no runtime or parity
mapping
([REPORT.md](../../plans/raw-coverage/REPORT.md#L3210-L3214)). The seven
Monsters authored-data requirements also have no owner or task
([REPORT.md](../../plans/raw-coverage/REPORT.md#L3194-L3201)). Future work should
split this catch-all by procedure family instead of making a blanket parity
claim.

## Existing task state

GitHub issue state was re-read and repaired on 2026-08-25, including native
dependency edges. [#337](https://github.com/dearlordylord/5e-quint/issues/337)
now owns all 330 distinct standalone SRD Stat Blocks plus scoped structural
fidelity. Its children #338–#352 own the denominator, two schema slices,
21-record pilot, eight source-file population leaves, complete-catalog
procedure inventory, execution bookkeeping reconciliation, and aggregate
acceptance.

- [#49 Drive Stat Block mechanics from typed support profiles](https://github.com/dearlordylord/5e-quint/issues/49)
  is a non-runnable outcome parent.
- [#53 Admit complete Stat Block Authored Mechanics Graphs](https://github.com/dearlordylord/5e-quint/issues/53)
  defines a runnable implementation leaf but is not currently runnable because
  native dependency #51 is open. Its “complete” scope is complete graphs for
  decoded records, not missing RAW catalog membership.
- [#113 Project Stat Block mechanics into typed creatures and available Acts](https://github.com/dearlordylord/5e-quint/issues/113)
  is runnable again and explicitly owns generic projection/discovery for
  represented shapes, not catalog membership.
- [#114 Execute typed Stat Block attack and multi-part Act procedures](https://github.com/dearlordylord/5e-quint/issues/114)
  is retained as a non-runnable broad outcome. It is blocked by #113 and by
  #351, which will split, retain, supersede, or close it from complete-catalog
  pressure evidence.
- [#283 Surface ordinary-object targeting for stat-block attacks](https://github.com/dearlordylord/5e-quint/issues/283)
  and [#286 Make the stat-block attack spatial witness shape canonical](https://github.com/dearlordylord/5e-quint/issues/286)
  are unblocked runtime/API bugs. They are actionable now but do not increase
  catalog breadth.
- Closed #44 and #98 made discovery/publication complete over canonical Surface
  sources; they did not establish a RAW-to-Surface Stat Block bijection.

## Implementation pre-research

The dependency-safe implementation runway is:

1. **Own the denominator.** Add a source-derived standalone-Stat-Block
   discovery operation over `animals.md` and `monsters-A-Z.md`. It must
   retain source anchors, detect missing/extra identities, compare the four
   duplicate source occurrences, and derive the expected catalog denominator
   without a handwritten manifest or completion ledger. Keep inline
   spell/item stat blocks as an explicit separate scope.
2. **Repair the scoped authored domain shape before bulk data.** Split the
   standalone authored `StatBlock` schema from the reusable spawned-creature
   projection. Represent the catalog facts owned by #339 and the procedure
   distinction owned by #340, derive rather than duplicate CR consequences
   such as PB/XP, and preserve the existing one-way runtime projection. Defer
   HP Hit Dice notation explicitly rather than adding placeholder state.
3. **Use the current 21 records as a scoped-fidelity pilot.** Upgrade them from
   selected battle projections to the accepted normalized scope, add direct
   RAW correspondence tests, and make the new bijection gate report the
   remaining 309 distinct identities.
4. **Populate the remaining catalog from local RAW only.** Batch canonical
   authoring by `animals.md` and the seven Monsters files, preserving exact SRD
   provenance and the Dhall → JSON → trace derivation boundary. Do not block
   catalog/presentation completeness on runtime automation.
5. **Mine procedure pressure from the complete catalog.** Derive a structural
   frequency inventory, then create generic capability leaves for save-effect
   actions, attack riders and forced movement, Multiattack alternatives and
   replacements, monster spellcasting, Bonus Actions, Reactions, Legendary
   non-attack actions, and complex/shared limited-use pools. Unsupported
   abilities remain visible as typed text-only entries instead of disappearing.
6. **Reconcile acceptance and delivery tasks.** Split QCORE11 into precise RAW
   procedure requirements, map the actual TypeScript/QNT/tests, and align
   #53/#113/#114 with the repaired schema. Keep #283/#286 as independent bug
   fixes. Add catalog list/select/presentation and per-record structural
   acceptance over the source-derived denominator.
7. **Converge reviews.** For each significant slice, repeat RAW traceability and
   PHB+ safety, ubiquitous-language/domain, architecture/connascence, and code
   review passes at least twice and until no reasonable findings remain. Run
   the repository's public `pnpm` verification commands directly and use the
   mandated MBT lock only for focused Stat Block MBT.

## Discovery verification

The mandated workflow was verified in both the checkout and linked worktree
`/workspace/typescript/.codex-worktrees/dnd-stat-block-route-lane-20260705`:
first a separate bounded `rg -uu` search against the local SRD corpus, then
direct `sed` inspection of the discovered `monsters.md` passages. The
same headings and rule text resolved in both locations. No external rules source
or non-primary content source was used.
