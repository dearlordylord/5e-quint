# Active Plan

Date: 2026-04-17

This is the single active planning queue.

Temporary system-level pipeline map:
- [plans/CONTENT_SURFACE_DATA_FLOW_TEMP.md](/workspace/typescript/dnd/plans/CONTENT_SURFACE_DATA_FLOW_TEMP.md)

**Batch:** Content-Surface Taxonomy Convergence + Core Rehaul To Content-Driven Execution.

**Batch goal:** two phases.
1. The `packages/prototype-content-surface/` prototype reaches taxonomy convergence (the closed atom vocabulary stops producing new widenings under SRD 5.2.1 + XPHB authoring pressure).
2. `packages/core/` is rehauled from **hardcoded ability definitions** to a **content-driven execution engine** — every spell / feat / class feature / reaction / summoning / polymorph currently hardcoded in `spell-registry.ts`, `battle.qnt`, `battle-machine.ts`, and adjacent files migrates to being defined by the surface's authored content and resolved by generic atom dispatch. When Phase D completes, `packages/core/` no longer contains per-ability execution code — it dispatches on surface atoms, and new abilities can ship as authored content alone.

**Phase D scope is a REHAUL, not a wiring-up.** Per `.references/xphb-srd-pairing/PLAN_closed_extension_surface_implementation.md` Phase 1: the surface is the execution source of truth. Currently `packages/core/src/features/spell-registry.ts` has hand-written `burning_hands`, `fireball`, `hold_person`, `counterspell`, and every other shipped spell; `battle.qnt` has per-family handlers; `battle-machine.ts` dispatches on spell IDs. All of that gets **replaced** (not supplemented) by generic atom resolution. The prior batch's "SPELL2b - Battle Spell Projection For One Generic Spell Family" shipped the first slice of this transition; Phase D finishes it across every ability in the corpus.

**Phase D size estimate:** ~40-80 hours of focused work across 9 tasks. Task sizes in Phase D are 2-6h each rather than the 1-2h target used for Phase A-C — a single family migration (save spells, attack spells, ongoing effects, triggered reactions, spawned creatures) touches types, Quint spec, XState machine, and MBT parity simultaneously and cannot credibly be scoped smaller without creating unmergeable half-migrations.

**Stop condition for Phase A-C:** ~10 consecutive new authorings land cleanly without forcing a new atom or a new surface widening. Until that holds, the red/green loop continues.

**Stop condition for Phase D:** `packages/core/src/features/spell-registry.ts` contains zero hardcoded spell mechanics (only identity / provenance remain — `SpellId` → authored content reference). `battle.qnt` has no per-family handlers; every spell-family lane is generic atom resolution. MBT Tier 3 passes. All pre-existing shipped abilities still produce byte-identical traces.

**Prior batch:** the monster database, spell ownership, monster facilities, and character convergence work (MONDB1..MONFAC2, SPELL1..SPELL2b, CHAREDIT1..CHARUI2) is all `done` on `master`. See git history and the `plans/SPELL1_SPELL_OWNERSHIP_SURFACE.md`, `plans/monster-database-plan.md`, `plans/DESIGN_C4a_spawned_companion.md`, `plans/CONTENT_SURFACE_PROTOTYPE.md`, and `plans/CONTENT_SURFACE_DEFERRED.md` ledgers for context.

The coding loop should treat this file as the active queue. Do not start a task whose status is not `ready-for-implementation-after-light-research` or `ready-for-research` unless this file is updated first.

## Status Vocabulary

- `ready-for-research`: A coding agent may pick this up now. The next step is documentation/source/RAW/code research, not implementation unless the research resolves the open decision. Write results back into this file or a task-specific plan, then update the task status.
- `ready-for-implementation-after-light-research`: The task shape is understood, but the coding agent must do the listed RAW or blast-radius check before editing code.
- `blocked`: A dependency or ownership decision must land first.
- `deferred`: Only use when the owner explicitly says to park the task for now. Do not use for queue ordering or "later batch" scheduling.
- `done`: Work completed and verification recorded.

## Ralph Task Index

The Ralph harness reads this machine-readable index for task order and status. Keep it synchronized with task sections whenever task status, order, ID, or title changes.

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    { "number": 0,  "id": "CSA1",  "status": "done", "title": "Survey Mining Rerun (Exhaustive)" },
    { "number": 1,  "id": "CSA2",  "status": "done", "title": "Rescope Post-CSA1 Clean Queue Batch 1" },
    { "number": 2,  "id": "CSA3",  "status": "done", "title": "Retire Empty Post-CSA1 Clean Queue Batch 2 Slot" },
    { "number": 3,  "id": "CSA4",  "status": "done", "title": "A14 Relative-To-Stat DiceAmount" },
    { "number": 4,  "id": "CSA5",  "status": "ready-for-research", "title": "C4e Alter Self Mode Picker And Adjacent Atoms" },
    { "number": 5,  "id": "CSA6",  "status": "ready-for-research", "title": "C4g Object-Target Attachment And True Polymorph Object Modes" },
    { "number": 6,  "id": "CSA7",  "status": "ready-for-research", "title": "Shapechange Multi-Type Filter And Form Switch" },
    { "number": 7,  "id": "CSA8",  "status": "blocked", "title": "Convergence Checkpoint A" },
    { "number": 8,  "id": "CSB1",  "status": "ready-for-implementation-after-light-research", "title": "Species Traits Batch" },
    { "number": 9,  "id": "CSB2",  "status": "ready-for-implementation-after-light-research", "title": "Feats Batch" },
    { "number": 10, "id": "CSB3",  "status": "ready-for-research", "title": "Fighter And Rogue Class Features" },
    { "number": 11, "id": "CSB4",  "status": "ready-for-research", "title": "Paladin And Cleric Class Features" },
    { "number": 12, "id": "CSB5",  "status": "ready-for-research", "title": "Barbarian And Monk Class Features" },
    { "number": 13, "id": "CSB6",  "status": "ready-for-research", "title": "Druid And Ranger Class Features" },
    { "number": 14, "id": "CSB7",  "status": "ready-for-research", "title": "Wizard And Sorcerer Class Features" },
    { "number": 15, "id": "CSB8",  "status": "ready-for-research", "title": "Warlock And Bard Class Features" },
    { "number": 16, "id": "CSB9",  "status": "ready-for-implementation-after-light-research", "title": "Magic Items Attunement-Passive Batch" },
    { "number": 17, "id": "CSB10", "status": "ready-for-implementation-after-light-research", "title": "Magic Items Charge-Wand Batch" },
    { "number": 18, "id": "CSB11", "status": "ready-for-research", "title": "Magic Items Sentient Cursed Artifact Batch" },
    { "number": 19, "id": "CSC1",  "status": "blocked", "title": "Final Mining Pass And Convergence Measurement" },
    { "number": 20, "id": "CSC2",  "status": "blocked", "title": "Surface-v1 Convergence Tag And Handoff Doc" },
    { "number": 21, "id": "CSD1",  "status": "blocked", "title": "Design Content-Driven Execution Architecture" },
    { "number": 22, "id": "CSD2",  "status": "blocked", "title": "Implement Quint-Variant Generator" },
    { "number": 23, "id": "CSD3",  "status": "blocked", "title": "Inventory Hardcoded Abilities And Migration Plan" },
    { "number": 24, "id": "CSD4",  "status": "blocked", "title": "Rehaul Save-Spell Family To Content-Driven" },
    { "number": 25, "id": "CSD5",  "status": "blocked", "title": "Rehaul Attack-Roll Spell Family To Content-Driven" },
    { "number": 26, "id": "CSD6",  "status": "blocked", "title": "Rehaul Ongoing-Effect Spell Family To Content-Driven" },
    { "number": 27, "id": "CSD7",  "status": "blocked", "title": "Rehaul Triggered-Reaction Family To Content-Driven" },
    { "number": 28, "id": "CSD8",  "status": "blocked", "title": "Rehaul Summon/Polymorph Families To Content-Driven" },
    { "number": 29, "id": "CSD9",  "status": "blocked", "title": "Rehaul Class Features And Monster Abilities To Content-Driven" },
    { "number": 30, "id": "CSD10", "status": "blocked", "title": "Tier 3 MBT Convergence And Core Hardcode Cleanup" },
    { "number": 31, "id": "CSD11", "status": "blocked", "title": "End-To-End Demo And Batch Closeout" }
  ]
}
-->

## Coding Loop Handoff Rules

- Start with the highest-priority task in the DAG table whose status is `ready-for-implementation-after-light-research` or `ready-for-research`.
- Treat the task loop as bidirectional: the plan scopes the task, and task discoveries may update the plan.
- Keep `Ralph Task Index` synchronized with task sections when changing task order, ID, title, or status.
- Every task closeout must include `Plan Impact`:
  - `Status: none` when no future planning changes are needed;
  - `Status: update-required` or `Status: applied` when the task changes downstream assumptions, status, dependencies, ordering, blockers, acceptance criteria, verification, or creates follow-up work.
- When `Plan Impact` is not `none`, update this file in the same task closeout before continuing. Record affected task IDs and the concrete planning action for each: unblock, block, defer, revise, add, or no-change.
- Only add durable planning facts to this file. Run-local failures and "next attempt must..." reminders belong in run-local artifacts, not here.
- Update the task status before ending the loop: `done`, `ready-for-implementation-after-light-research`, `blocked`, or `deferred`.
- When a task is marked `done`, inspect every task in its `Blocks` column and promote those whose dependencies are now satisfied.
- For any implementation task, read the relevant SRD text in `.references/srd-5.2.1/` and check `UBIQUITOUS_LANGUAGE.md` before editing code.
- For any implementation task, include `/simplify` convergence in the closeout: minimum two rounds unless the changeset is trivial, and continue until no important fixes remain.
- Do not run battle MBT for research-only tasks. Treat battle MBT as scarce; use deterministic unit and projection tests first.
- If broader lint/typecheck/test verification surfaces known pre-existing failures outside the touched surface, record the baseline noise and stop. Do not widen into repo-wide cleanup.

## DAG / Queue Order

| Order | Task | Status | Depends on | Blocks | Next action | Handoff readiness |
|---|---|---|---|---|---|---|
| 0 | CSA1 - Survey Mining Rerun (Exhaustive) | done | none | CSA2, CSA3, CSA8, CSC1 | Landed refreshed `survey-results-srd.jsonl` + `REPORT_SRD.md` + [plans/SURVEY_RERUN_2026-04-17.md](/workspace/typescript/dnd/plans/SURVEY_RERUN_2026-04-17.md). The current SRD catalog baseline is 882 queue rows, not the older 504-unit snapshot. | Landed on 2026-04-17. Use the refreshed queue for downstream authoring picks. |
| 1 | CSA2 - Rescope Post-CSA1 Clean Queue Batch 1 | done | CSA1 | none | Verified the rerun's 116 `clean` rows all already exist under `packages/prototype-content-surface/content/`, so there is no remaining post-CSA1 clean-queue authoring batch to publish. The magic-item-heavy rerun note is still useful for family ownership, but it does not create runnable CSA2 work. | Landed on 2026-04-17. Use `plans/SURVEY_RERUN_2026-04-17.md` only as queue context; do not schedule a clean-batch authoring task without re-checking authored overlap first. |
| 2 | CSA3 - Retire Empty Post-CSA1 Clean Queue Batch 2 Slot | done | CSA2 | none | Retired. After CSA2's overlap check proved the clean queue is already fully authored, there is no second post-CSA1 clean batch to author. If a future rerun creates un-authored `clean` rows, add a new task instead of reusing this stale slot. | Landed on 2026-04-17. |
| 3 | CSA4 - A14 Relative-To-Stat DiceAmount | done | none | CSA8 | Land a `LinkedAmount` variant (walk-speed / damage-taken / damage-dealt) on `DiceAmount`; author Vampiric Touch, Harm, and Spider Climb. | Landed in 9bd63c8b; 134/134 regression. |
| 4 | CSA5 - C4e Alter Self Mode Picker And Adjacent Atoms | ready-for-research | none | CSA8 | Pressure case: Alter Self picks one of three modes at cast + can switch mid-duration. Needs effect-mode picker + `natural_weapons` + `water_breathing` atoms. | Ready. RAW text available. |
| 5 | CSA6 - C4g Object-Target Attachment And True Polymorph Object Modes | ready-for-research | none | CSA8 | Add `Attachment.object` kind; extend `transform_target` to cover object-to-creature and creature-to-object; author the True Polymorph object branches. | Ready. True Polymorph already partial-authored (creature branch only). |
| 6 | CSA7 - Shapechange Multi-Type Filter And Form Switch | ready-for-research | CSA6 | CSA8 | Widen `PolymorphFormSource.creatureTypeFilter` to support "any except X"; add `Duration.concentration.allowsFormSwitchAs: "magic_action"`; author Shapechange. | Blocked on CSA6 for shared PolymorphFormSource shape review. |
| 7 | CSA8 - Convergence Checkpoint A | blocked | CSA4, CSA5, CSA6, CSA7 | CSB1..CSB11 | Run the isolated auto-close loop against the remaining widening queue; use its weighted-debt history, failed-attempt log, and per-batch reruns to prove the remaining pressure is collapsing. Convergence declared for Phase A when the loop shows sustained downward weighted debt and the follow-up authoring streak resumes without new widenings. | Blocked on upstream widenings, but now measured by the auto loop rather than a manual random sample. |
| 8 | CSB1 - Species Traits Batch | ready-for-implementation-after-light-research | none | CSC1 | Author the 17 SRD 5.2.1 species traits (Dragonborn, Elf, Dwarf, Halfling, etc.); most are `grant_sense` / `grant_resistance` / size / speed. | Ready. Existing grammar covers the common cases; any outliers become flagged partials. |
| 9 | CSB2 - Feats Batch | ready-for-implementation-after-light-research | none | CSC1 | Author origin feats, epic boons, remaining fighting styles. ~10-15 units. | Ready. FeatMechanics already covers passive + activated patterns. |
| 10 | CSB3 - Fighter And Rogue Class Features | ready-for-research | none | CSC1 | Research both classes; author ~20 class_feature units. Simplest martial classes; no new widenings expected beyond Sneak Attack dice scaling (already covered). | Ready for research. |
| 11 | CSB4 - Paladin And Cleric Class Features | ready-for-research | CSB3 | CSC1 | Channel Divinity resource, Lay on Hands pool, Divine Smite (reuses damage atom), Destroy Undead, Aura of Protection. ~25 units. | Blocked on CSB3 to confirm class-feature patterns hold for half-caster martials. |
| 12 | CSB5 - Barbarian And Monk Class Features | ready-for-research | CSB3 | CSC1 | Rage (state-flag resource — may need widening), Reckless Attack, Martial Arts, Ki/Focus Points, Flurry, Stunning Strike. ~25 units. | Blocked on CSB3. Likely surfaces a "state-flag resource" or "once-per-rage" widening. |
| 13 | CSB6 - Druid And Ranger Class Features | ready-for-research | CSB5 | CSC1 | Wild Shape (reuses `transform_target`), Favored Enemy, Natural Explorer, druid spell prep. ~20 units. | Blocked on CSB5 for shared resource patterns. |
| 14 | CSB7 - Wizard And Sorcerer Class Features | ready-for-research | CSB3 | CSC1 | Full spellcasting progression, Arcane Recovery, Font of Magic, Metamagic, Sorcerous Origin. ~25 units. Metamagic is the risky piece — effect-modifier widening. | Blocked on CSB3. Metamagic likely forces a new "spell-effect modifier" surface. |
| 15 | CSB8 - Warlock And Bard Class Features | ready-for-research | CSB7 | CSC1 | Pact Magic, Eldritch Invocations, Pact Boon, Bardic Inspiration (already uses `UseCountCap.ability_modifier`), Jack of All Trades, Magical Secrets. ~20 units. | Blocked on CSB7 for spellcasting scaffold reuse. |
| 16 | CSB9 - Magic Items Attunement-Passive Batch | ready-for-implementation-after-light-research | none | CSC1 | 20 attunement-gated passive items (Cloak of Protection family). `PassiveMechanics` + `EquipmentPredicate` already covers this. | Ready. |
| 17 | CSB10 - Magic Items Charge-Wand Batch | ready-for-implementation-after-light-research | none | CSC1 | 15 charge-pool wands (Wand of Magic Missiles family). `ChargePoolResource` + `grant_spell_access.charge_cast` already covers this. | Ready. |
| 18 | CSB11 - Magic Items Sentient Cursed Artifact Batch | ready-for-research | CSB9, CSB10 | CSC1 | 10 complex items. Sentience / curse / artifact tiers likely need widenings. | Blocked on CSB9, CSB10. |
| 19 | CSC1 - Final Mining Pass And Convergence Measurement | blocked | CSA8, CSB1..CSB11 | CSC2 | Finish the isolated auto-close-loop pass, snapshot its weighted-debt / per-cluster telemetry, then run the second exhaustive mining pass against the fully-authored post-Phase-B surface. Regenerate `REPORT_SRD.md`; measure the consecutive-clean streak; confirm zero `surface_widening` or `atom_widening` verdicts outside already-DEFERRED structural carveouts. If not converged, spawn follow-up widening tasks and rerun. | Blocked on all Phase A + Phase B tasks; auto-loop telemetry is now part of the acceptance evidence. |
| 20 | CSC2 - Surface-v1 Convergence Tag And Handoff Doc | blocked | CSC1 | CSD1 | If CSC1 shows convergence: tag the commit as `surface-v1-converged`, write a short handoff doc summarizing the frozen atom vocabulary + authored corpus + known partial carveouts, then hand off to Phase D. | Blocked on CSC1. |
| 21 | CSD1 - Design Content-Driven Execution Architecture | blocked | CSC2 | CSD2, CSD3 | Design the rehaul: contract between surface content and core runtime, generic atom dispatch in battle.qnt, XState machine action shape, how MBT stays valid across the transition. Produce `plans/CORE_REHAUL_DESIGN.md`. | Blocked on CSC2 (frozen surface). Critical design task; all migration sub-tasks depend on this. |
| 22 | CSD2 - Implement Quint-Variant Generator | blocked | CSD1 | CSD3 | Build generator from frozen types.ts → `.qnt` variant definitions. Lands in `packages/quint-gen/`. | Blocked on CSD1. |
| 23 | CSD3 - Inventory Hardcoded Abilities And Migration Plan | blocked | CSD1, CSD2 | CSD4, CSD5, CSD6, CSD7, CSD8, CSD9 | Catalog every hardcoded ability in `packages/core/` (spell-registry.ts entries, battle.qnt handlers, battle-machine.ts actions, action-discovery routes). Map each to its surface-content migration path. Produce `plans/CORE_REHAUL_INVENTORY.md` with per-ability migration tickets. | Blocked on CSD1 design + CSD2 generator. Pure research task; no runtime changes. |
| 24 | CSD4 - Rehaul Save-Spell Family To Content-Driven | blocked | CSD3 | CSD10 | Migrate save-spell family (Burning Hands, Fireball, Hold Person, Cone of Cold, Cloudkill, Sleep, Dominate Person/Monster/Beast, Banishment, etc.) from hardcoded spell-registry entries to content-driven dispatch. Remove hardcoded handlers; add generic save-resolution lane consuming surface `save_gate` phases. MBT parity per migrated spell. ~6-8h. | Blocked on CSD3 inventory. Start with this family; it's the largest and sets the migration pattern. |
| 25 | CSD5 - Rehaul Attack-Roll Spell Family To Content-Driven | blocked | CSD4 | CSD10 | Migrate attack-roll spells (Fire Bolt, Ray of Frost, Acid Splash, Chromatic Orb, Inflict Wounds, etc.) from hardcoded to generic attack-resolution lane consuming surface `attack_roll` phases. MBT parity. ~4-6h. | Blocked on CSD4 (shares resolution-lane refactor pattern). |
| 26 | CSD6 - Rehaul Ongoing-Effect Spell Family To Content-Driven | blocked | CSD4 | CSD10 | Migrate ongoing-effect spells (Bless, Bane, Hunter's Mark, Hex, Faerie Fire, Divine Favor, Barkskin, Mage Armor, etc.) to consume surface `OngoingOperation` atoms. Most complex family due to multi-op + trigger grammar. ~6-8h. | Blocked on CSD4 (save-gate lane) + CSD5 (attack-roll lane) because ongoing effects that grant riders need both lanes available. |
| 27 | CSD7 - Rehaul Triggered-Reaction Family To Content-Driven | blocked | CSD4 | CSD10 | Migrate Shield + Counterspell + any other reaction spell. Counterspell's hardcoded timing currently lives battle-local per prior SPELL2b closeout; migrate to surface-driven `ReactionTrigger.creature_casts_spell` + `save_gate.autoSuccessIfCasterSlotGte`. ~4h. | Blocked on CSD4. |
| 28 | CSD8 - Rehaul Summon/Polymorph Families To Content-Driven | blocked | CSD5, CSD6 | CSD10 | Migrate spawned_creature / reanimated_creature / templated_multi_spawn / transform_target families. This is mostly NEW execution code — no hardcoded prior entries to delete, but net-new runtime support for summon companion state, catalog-ref lookup, polymorph stat-block-replacement with retained fields, temp-HP-from-new-form, revert triggers. ~8-10h. | Blocked on CSD5 + CSD6 (attack + ongoing families available for companion actions to reuse). |
| 29 | CSD9 - Rehaul Class Features And Monster Abilities To Content-Driven | blocked | CSD4, CSD5, CSD6 | CSD10 | Migrate hardcoded class-feature execution (Second Wind, Action Surge, Rage, Ki, Channel Divinity, Lay on Hands, Divine Smite, Sneak Attack, etc.) and monster-ability execution (Magic Resistance, Pack Tactics, Recharge, Multiattack dispatch) to consume surface content. Most are already surface-authored after Phase B; this task wires the consumption. ~6-8h. | Blocked on the spell-family rehauls (classes use spell resolution). |
| 30 | CSD10 - Tier 3 MBT Convergence And Core Hardcode Cleanup | blocked | CSD4, CSD5, CSD6, CSD7, CSD8, CSD9 | CSD11 | Run Tier 3 MBT (`MBT_STEPS=10 ./scripts/mbt-fuzz.sh 50`, ~15min). Fix any parity regressions across the corpus. Delete dead hardcoded-ability code paths (the per-family handlers, per-spell handlers, dispatch tables). Confirm `packages/core/src/features/spell-registry.ts` retains only identity + provenance — no mechanics. ~4-6h. | Blocked on all family migrations. |
| 31 | CSD11 - End-To-End Demo And Batch Closeout | blocked | CSD10 | none | Pick 5-10 authored abilities spanning every family; script a demo pipeline that loads them, dispatches through content-driven core, and produces a trace. Write `plans/CSD11_DEMO.md` + batch retrospective. Tag commit as `phase-d-converged`. | Blocked on CSD10. |

## Current Integrated Baseline

### Two "content" directories — do not confuse

The repo has two parallel per-unit directories that both look like "content" but serve different purposes. Read this first.

| Path | What it is | Unit granularity | Produced by | Consumed by |
|---|---|---|---|---|
| `packages/prototype-content-surface/content/<slug>.{dhall,json,trace.md}` | **Authored corpus.** One entry per actually-authored unit (131 entries currently). `.dhall` is the source-of-truth mechanics authoring in Dhall; `.json` is `dhall-to-json --omit-empty` output; `.trace.md` is the tracer's mermaid-renderable dependency graph (gitignored). | Only authored units (subset of all SRD units). | Human author writes `.dhall`; regression sweep produces `.json`; `src/run.ts` produces `.trace.md`. | The tracer validates the atom graph; downstream (Phase D) the `.json` is consumed by the content-driven runtime. |
| `scripts/content-surface-survey/results-srd/<slug>/{prompt.md,result.json,codex-out.json,verdict.json}` | **Survey mining outputs.** One subdir per SRD unit SCANNED. Not content — proposals and verdicts from the LLM-sub-agent mining pipeline. | Every SRD unit in the current queue (882 distinct SRD rows as of the 2026-04-17 rerun), plus re-run history. | `run-survey.sh` + `worker.sh` orchestrate; each worker feeds the SRD text to an LLM sub-agent with `prompt-template.md`, records the proposal + verdict. | `aggregate.ts` rolls up into `survey-results-srd.jsonl` + `REPORT_SRD.md`; planners read the report to decide what to author or widen next. |

One-liner: **`packages/prototype-content-surface/content/`** is what we have authored. **`scripts/content-surface-survey/results-srd/`** is what the machine suggests we COULD author + whether the current surface supports it. The mining pipeline is the "what's missing" oracle; the authored corpus is the "what's shipped" artifact.

A unit typically flows: mining proposes → verdict flags a widening needed → we land the widening in `types.ts` → we author the unit in `content/<slug>.dhall` → regression passes → we re-mine and the verdict goes `clean`.

### Files and conventions

Already wired on `master` and relevant to this batch:

- `packages/prototype-content-surface/src/surface/types.ts` is the closed atom vocabulary (currently ~1650 lines). Authoring pressure drives widenings here.
- `packages/prototype-content-surface/src/interpreter/tracer.ts` emits a mermaid-renderable dependency graph per unit. Every new EffectAtom variant, phase kind, or family needs a new switch arm here plus exhaustive-check compliance.
- `packages/prototype-content-surface/content/<slug>.{dhall,json,trace.md}` is the authored corpus. The Dhall file is the authored source; JSON is `dhall-to-json --omit-empty` output; trace.md is tracer output for visual review. **trace.md files are gitignored — do not commit them.**
- `scripts/content-surface-survey/atom-whitelist.ts` gates what atom strings the survey validator accepts. When a new `EffectAtom.kind` lands in types.ts, add the kind string to `STAGE_3_EXTENSIONS` in this file, or the validator falsely flags `atom_widening` on all units using that atom.
- `scripts/content-surface-survey/` holds the Stage-1/2 survey pipeline: `run-survey.sh` for the initial parallel survey, `worker.sh` per-unit, `aggregate.ts` to build `REPORT_SRD.md`, `validate.ts` for the verdict computation. Per-unit outputs live in `results-srd/<slug>/{prompt.md, result.json, verdict.json}`.
- `packages/prototype-content-surface/scripts/content-surface-survey/trace-one.ts` is the single-unit tracer runner used for spot-checking an authored file.
- Regression sweep pattern (run from `packages/prototype-content-surface/`):
  ```sh
  for f in content/*.dhall; do
    name=$(basename "$f" .dhall)
    [ "$name" = "magic_item_gauntlets_of_ogre_power" ] && continue
    dhall-to-json --omit-empty --file "$f" > /tmp/$name.json 2>/dev/null \
      && npx tsx scripts/content-surface-survey/trace-one.ts /tmp/$name.json > /dev/null 2>&1 \
      || echo "FAIL: $name"
  done
  ```
- `pnpm typecheck` (from the package) is required before regression. Both must be clean.
- Current state: 131 content files authored, 0 regression failures. Widenings RESOLVED up through §A17b per `plans/CONTENT_SURFACE_DEFERRED.md`.
- `plans/CONTENT_SURFACE_DEFERRED.md` is the living widening ledger. Every new widening gets a new §A / §C section with RESOLVED date; every partial gets a DEFERRED note with pressure cases.
- `plans/CONTENT_SURFACE_PROTOTYPE.md` defines the red/green loop and the stop-condition (~10 consecutive clean authorings).
- `plans/CONTENT_SURFACE_SURVEY.md` + `scripts/content-surface-survey/BATCH_DIGEST_PROMPT.md` document the Stage-1 and Stage-2 pipelines including DM-agenda hard-rules. Sub-agents proposing widenings must consult the DM-agenda rejection list.

Current architecture decisions for this batch:

- Closed-atom taxonomy lives in `types.ts` under `EffectAtom`, `ActivationPhase`, `Attachment`, `Duration`, `CastingTime`, and the payload families (`OngoingEffectMechanics`, `ActivationMechanics`, `TriggeredReactionMechanics`, `AnchoredTriggerMechanics`, `SpawnedCreatureMechanics`, `ReanimatedCreatureMechanics`, `TemplatedMultiSpawnMechanics`).
- Dhall's homogeneous-list constraint forces an Optional-field trick for heterogeneous lists of records. Every record in the list carries every variant-specific field as `Optional`, with `None T` on records that don't use it; `dhall-to-json --omit-empty` strips the `None`s in JSON output. See `content/dispel_magic.dhall` and `content/aura_of_life.dhall` for canonical examples.
- `ReadonlyNonEmptyArray<T>` is used for list fields where an empty list is unambiguously invalid; ~20 propagated sites already.
- DM-agenda is caller-owned per `ARCHITECTURE.md` §1: spatial geometry, perception, language / allegiance, narrative-mutation, time-of-day / weather are NOT encoded in the surface. Survey sub-agents must reject type-sound but architecture-unsound widening proposals.
- Provenance distinction: SRD 5.2.1 is provenance for authored content; XPHB is research input only (never checked in); 5e-tools is structured input only. Content files must cite the SRD 5.2.1 section in the `provenance` field.
- Partial authoring is encouraged. A unit whose core mechanics are encodable but whose rider is deferred gets a `PARTIAL` note in its Dhall comment + a DEFERRED entry naming the missing widening.
- Convergence is measured on the post-CSA8 timeline using the isolated closure-loop telemetry plus the final exhaustive survey rerun: weighted debt trend, per-batch improvement rate, and the final clean-streak / widening distribution.

Planning notes:

- Prior-batch completion notes remain in git history. Do not re-open monster/spell/character work in this file.
- The surface owns the vocabulary; Quint integration follows in Phase D. Do not start Phase D work before `CSC2` ships a frozen surface tag — the generator must be driven by a stable types.ts.
- Tasks are sized for 1-2h clean input/output where possible. Class-design tasks (CSB3..CSB8) may legitimately take 3-4h including research; if a task overruns, split into a `-design` sub-task (research + shape) and a `-implement` sub-task rather than widening the single task.
- Magic-items and feats batches can be parallelized with class tasks if the implementer has agent capacity; they have no inter-batch dependencies.
- The unattended convergence loop now runs in `.worktrees/auto-close-loop` on branch `auto-close-loop`. Treat its `.output/content-surface-closure/` telemetry and per-batch commits as the operational driver for convergence work; this file remains the roadmap and freeze gate, not the runner control surface.

## Recommended Coding Loop

1. Start with `plans/CONTENT_SURFACE_PROTOTYPE.md` (red/green loop), `plans/CONTENT_SURFACE_DEFERRED.md` (current widening ledger), `packages/prototype-content-surface/README.md` (package scope), and `ARCHITECTURE.md` §1 (DM-agenda rejection rules).
2. For any widening task, re-read the pressure-case SRD sections in `.references/srd-5.2.1/` and check `UBIQUITOUS_LANGUAGE.md` before editing types.ts.
3. For any authoring task, follow the author → convert → trace → regression pattern:
   - write `content/<slug>.dhall`;
   - `dhall-to-json --omit-empty --file content/<slug>.dhall > content/<slug>.json`;
   - `npx tsx scripts/content-surface-survey/trace-one.ts content/<slug>.json` to verify no error;
   - `npx tsx src/run.ts content/<slug>.json --out content/<slug>.trace.md` to generate the (gitignored) trace;
   - `pnpm typecheck` from the package root;
   - regression sweep over all `content/*.dhall`.
4. For any widening that adds a new `EffectAtom.kind`, update `scripts/content-surface-survey/atom-whitelist.ts` `STAGE_3_EXTENSIONS` or the validator flags false `atom_widening`.
5. For any widening, add a RESOLVED entry in `plans/CONTENT_SURFACE_DEFERRED.md` with date + shape summary + validation refs authored.
6. For convergence work, prefer the isolated auto loop (`scripts/content-surface-survey/run-auto-close-loop.sh`) over ad hoc reruns. The loop owns candidate selection, bounded surface edits, reruns, weighted-debt snapshots, failed-attempt logs, and per-batch commits on `auto-close-loop`.
7. `/simplify` convergence is mandatory per the Coding Loop Handoff Rules: minimum two rounds.
8. Commit after each task with a message naming the widening(s) + content files landed.

## Task Bodies

### Task 0 - CSA1 - Survey Mining Rerun (Exhaustive)

Status: `done`

Depends on: none

Blocks: `CSA2`, `CSA3`, `CSA8`, `CSC1`

Scope:

- **Exhaustive** re-run of the Stage-1 survey pipeline against the current surface. "Exhaustive" means every SRD unit gets a fresh verdict — not a spot-check, not just previously-failing units. The older plan snapshot referenced 504 SRD units, but the current queue-backed baseline is 882 SRD rows. This task refreshes to ONE latest verdict per queued SRD unit against the current surface.
- The vocabulary has grown substantially since the last mining run (15+ new widenings landed, including `spawned_creature`, `reanimated_creature`, `templated_multi_spawn`, `transform_target`, `ability_check_gate`, multi-op `operations`, `ReadonlyNonEmptyArray<T>`, `saveAppliesIf`, `autoSuccessIfCasterSlotGte`, `death_saving_throw` RollKind, etc.). A large share of units previously verdict'd `surface_widening` or `atom_widening` are now cleanly encodable.
- Refresh `scripts/content-surface-survey/survey-results-srd.jsonl` + `scripts/content-surface-survey/REPORT_SRD.md`.
- Publish the delta — how many units shifted clean / surface / atom / dm-agenda / structural — into a one-page summary note committed under `plans/`.
- **Iteration model reminder:** this is the FIRST of two scheduled mining passes. CSC1 does the SECOND (post-Phase-B authoring, pre-freeze). A THIRD pass is not scheduled in this plan because Phase D's rehaul should run against a frozen surface; if Phase D runtime exposes new atom pressure, the Phase D Preamble guardrail spawns a CSA-variant fixup task with its own re-mine.

Input:

- Current state of `packages/prototype-content-surface/src/surface/types.ts` and `scripts/content-surface-survey/atom-whitelist.ts`.
- Prior run dataset at `scripts/content-surface-survey/survey-results-srd.jsonl`.
- Pipeline scripts: `scripts/content-surface-survey/run-survey.sh`, `worker.sh`, `prompt-template.md`, `BATCH_DIGEST_PROMPT.md`.

Output:

- Refreshed JSONL + REPORT_SRD.md.
- A short note (e.g., `plans/SURVEY_RERUN_2026-04-17.md`) listing: verdict distribution delta vs. prior run; the top-20 units newly `clean` that should be first-authored targets; the top-5 remaining widening clusters by count.
- No code changes in `types.ts`.

Next action:

- Run `./scripts/content-surface-survey/run-survey.sh` (expect ~30-60min on a single machine; read the script's env flags for parallelism). Regenerate report via `npx tsx scripts/content-surface-survey/aggregate.ts`. Write the delta note.

Research note:

- The survey pipeline uses LLM sub-agents to propose encodings; read `scripts/content-surface-survey/prompt-template.md` and `BATCH_DIGEST_PROMPT.md` before running so you understand the DM-agenda rejection rules the sub-agents are primed with.
- The pipeline has a `survey-results-srd.jsonl.lock` file — ensure nothing else is running before invoking.

Verification requirements:

- Confirm the JSONL row count matches the current SRD queue unit count (882 rows as of the 2026-04-17 rerun).
- Confirm the REPORT_SRD.md regenerates cleanly (no mismatched atom-whitelist entries — if `validate.ts` throws `unknown atomKind`, that atom needs a `STAGE_3_EXTENSIONS` entry first).
- `/simplify` not applicable — this is a pipeline-execution task.

Handoff readiness:

- Ready. Pipeline is idempotent; if a run fails mid-flight, rerun.

### Task 1 - CSA2 - Rescope Post-CSA1 Clean Queue Batch 1

Status: `done`

Depends on: `CSA1`

Blocks: none

Scope:

- Re-read `plans/SURVEY_RERUN_2026-04-17.md` and correct the stale "newly-clean spells" assumption from the pre-rerun task draft.
- Check the current `clean` queue against both existing batch ownership (`CSB9`, `CSB10`) and the authored corpus under `packages/prototype-content-surface/content/`.
- Decide whether a runnable post-CSA1 clean-queue authoring batch still exists.

Input:

- `plans/SURVEY_RERUN_2026-04-17.md`.
- The current batch queue in this file, especially `CSB9` and `CSB10`.
- Current authored corpus under `packages/prototype-content-surface/content/` for overlap checks.

Output:

- Plan update recording that the rerun's `clean` rows are already fully represented in the authored corpus, so no post-CSA1 clean authoring batch remains to define.
- CSA3 retired as a stale follow-on slot rather than left blocked behind a nonexistent batch.

Next action:

- Continue with the remaining widening queue (`CSA5`-`CSA7`) and the standing implementation batches (`CSB1`, `CSB2`, `CSB9`, `CSB10`); do not open a new "clean queue batch" task unless a later rerun produces un-authored `clean` rows.

Research note:

- `plans/SURVEY_RERUN_2026-04-17.md` reports that the prior 504-unit overlap had no non-clean→clean transitions; the immediate clean targets are newly-added queue rows and are magic-item-heavy.
- The durable follow-up fact from this task is stronger: every current `clean` row already has a matching authored content file, so the rerun exposed no runnable "easy authoring" backlog at all.

Verification requirements:

- Verified `scripts/content-surface-survey/survey-results-srd.jsonl` currently contains 116 `clean` rows.
- Verified every one of those 116 slugs already exists under `packages/prototype-content-surface/content/*.dhall`, leaving zero un-authored clean units to assign to CSA2 or CSA3.
- Confirmed the stale rerun note's magic-item examples fall under the existing magic-item family ownership, but they do not create runnable work because those slugs are already authored.
- `/simplify` not applicable while this task remains plan research rather than authoring.

Handoff readiness:

- Complete. The rerun output is already committed, and the overlap check closed out the stale clean-batch slots.

### Task 2 - CSA3 - Retire Empty Post-CSA1 Clean Queue Batch 2 Slot

Status: `done`

Depends on: `CSA2`

Blocks: none

Scope:

- No-op closeout. CSA2 established that the post-CSA1 `clean` queue is already fully authored, so there is no second batch to schedule.

Input / Output / Next action / Research note / Verification / Handoff readiness:

- Input: CSA2's authored-overlap check.
- Output: This stale slot is retired.
- Next action: If a future rerun surfaces un-authored `clean` rows, add a fresh task with an explicit slug list instead of reviving CSA3.
- Research note: none.
- Verification: none beyond CSA2's overlap check.
- Handoff readiness: complete.

### Task 3 - CSA4 - A14 Relative-To-Stat DiceAmount

Status: `ready-for-research`

Depends on: none

Blocks: `CSA8`

Scope:

- Add a `LinkedAmount` variant to `DiceAmount` covering: `equal_to_walk_speed`, `equal_to_damage_taken`, `equal_to_damage_dealt`. Design sketch is in `plans/CONTENT_SURFACE_DEFERRED.md` §A14.
- Author Vampiric Touch, Harm, and Spider Climb as validation refs (each exercises one variant).
- Add tracer dispatch arms + STAGE_3_EXTENSIONS whitelist entries if new atom strings land (likely not — this is a DiceAmount extension, not a new EffectAtom kind).

Input:

- `plans/CONTENT_SURFACE_DEFERRED.md` §A14.
- SRD sections:
  - Vampiric Touch: `.references/srd-5.2.1/Spells/Descriptions-S-Z.md` (search "Vampiric Touch").
  - Harm: `.references/srd-5.2.1/Spells/Descriptions-E-L.md` (or check with `grep "^## Harm"`).
  - Spider Climb: `.references/srd-5.2.1/Spells/Descriptions-S-Z.md`.
- Current DiceAmount shape at `packages/prototype-content-surface/src/surface/types.ts` near the `DiceAmount` definition.

Output:

- `DiceAmount` extended with a new variant (likely `| { kind: "linked"; link: LinkedAmount }`).
- `LinkedAmount` type: `"walk_speed" | "damage_taken" | "damage_dealt"` or equivalent.
- Tracer arm in `describeDiceAmount`.
- 3 authored Dhall files.
- `CONTENT_SURFACE_DEFERRED.md` §A14 marked RESOLVED.

Next action:

- Research: read the 3 SRD passages. Confirm whether `equal_to_damage_taken` (Harm) needs the damage instance's total or per-damage-kind. Confirm Vampiric Touch's self-heal is exactly `half damage dealt` or `equal damage dealt`.
- Decide the shape: generic `LinkedAmount` variant with 3 enum cases, or separate atoms per relationship. Design sketch favors the unified variant.
- Implement.

Research note:

- `grant_speed.feet` is a fixed `number` currently. Spider Climb's "Climb Speed equal to walk speed" pressures this field too, not just `DiceAmount`. Consider whether `grant_speed.feet` should accept `number | LinkedAmount` or a new sentinel.
- Harm's "HP maximum reduced by damage taken" couples `modify_max_hp.delta` with the same `LinkedAmount` shape.

Verification requirements:

- `pnpm typecheck` clean.
- Regression: 3 new units trace; all 131+ existing units still pass.
- RAW citations on each new Dhall.
- `/simplify`: minimum 2 rounds. Watch for duplication between `DiceAmount.linked` and any new grant_speed/modify_max_hp hooks.

Handoff readiness:

- Ready for research. Design sketch is 80% complete in DEFERRED §A14; research step is confirming RAW per the 3 validation refs and picking between the unified-variant and per-hook approaches.

### Task 4 - CSA5 - C4e Alter Self Mode Picker And Adjacent Atoms

Status: `ready-for-research`

Depends on: none

Blocks: `CSA8`

Scope:

- Land the three coupled widenings Alter Self pressures:
  - cast-time effect-mode picker (pick ONE of three modes; each mode has different EffectAtoms);
  - `natural_weapons { damageType: DamageType; damageDie: number }` EffectAtom — grants a specific unarmed-strike profile;
  - `water_breathing` EffectAtom — simple boolean grant.
- Author Alter Self as the sole validation ref. Two of its modes are mechanical (Aquatic Adaptation, Natural Weapons); Change Appearance is pure narrative / DM.

Input:

- SRD: `.references/srd-5.2.1/Spells/Descriptions-A-D.md` `## Alter Self`.
- Current `EffectAtom` union in types.ts.
- The existing `CastTimeChoice<T>` primitive; see if it generalizes to choice-of-EffectAtom-bundle or needs a sibling type.

Output:

- New `natural_weapons` + `water_breathing` EffectAtom variants in types.ts.
- A new `CastTimeEffectModeChoice` type (or extension of existing `CastTimeChoice`) that covers "pick one bundle of effects".
- Tracer arms for the two new atoms + the mode picker.
- STAGE_3_EXTENSIONS entries for both.
- `content/alter_self.dhall`.
- `CONTENT_SURFACE_DEFERRED.md` §C4e marked RESOLVED.

Next action:

- Research: read the RAW passage. Confirm the mode picker has 3 options; confirm mid-duration switch is a Magic action (caller-owned resource spend).
- Design: choose between (a) `CastTimeChoice<EffectAtom[]>` reused, (b) new `ModePicker<EffectAtomBundle[]>` type, (c) a new phase kind `mode_gated` sitting under ActivationPhase. Prefer (a) if `CastTimeChoice<T>` already accepts `T = ReadonlyArray<EffectAtom>`.
- Implement.

Research note:

- Spirit Guardians' "radiant vs necrotic by caster alignment" is a sibling pressure case (damage-type choice coupled to caster state). Already encoded via `DamageTypeRef.choice`. Alter Self's choice is over effect bundles, not damage types — different shape.
- Mid-duration mode switch pressures a new Duration / phase shape ("you can take a Magic action to replace the option you chose with a different one"). Consider whether to encode this as a property of the mode picker (`allowsMidDurationSwitchAs: "magic_action"`) or defer.

Verification requirements:

- `pnpm typecheck`; regression clean.
- `/simplify`: minimum 2 rounds. Watch for collapsing natural_weapons into the existing damage atom; it's distinct because it replaces the creature's unarmed-strike default, not one-shot damage.

Handoff readiness:

- Ready for research.

### Task 5 - CSA6 - C4g Object-Target Attachment And True Polymorph Object Modes

Status: `ready-for-research`

Depends on: none

Blocks: `CSA7`, `CSA8`

Scope:

- Add `Attachment.object { size: StatBlockSize; worn_or_carried: boolean }` variant.
- Extend `EffectAtom.transform_target.newForm` to accept an object-form variant (currently `PolymorphFormSource` is catalog-ref with creatureType — object form needs its own shape).
- Author True Polymorph's object-into-creature and creature-into-object branches; currently the file is PARTIAL (creature-into-creature only).

Input:

- Current `Attachment` union in types.ts (`self | target | area | mark` kinds).
- `content/true_polymorph.dhall` PARTIAL version (creature branch only).
- SRD: `.references/srd-5.2.1/Spells/Descriptions-S-Z.md` `## True Polymorph` — §"Object into Creature" and §"Creature into Object" sub-sections.

Output:

- New `Attachment.object` variant.
- Extended `PolymorphFormSource` (likely a new variant `kind: "object_ref"` or a sibling `ObjectFormSource` type).
- Tracer arm updates in `traceAttachment` + `describeTransformTarget`.
- Updated `content/true_polymorph.dhall` with a second phase or a mode picker covering all three branches.
- `CONTENT_SURFACE_DEFERRED.md` §C4g marked RESOLVED.

Next action:

- Research: re-read the True Polymorph RAW. Note that "Object into Creature" caps creature CR at 9 and creates a Friendly-to-caster creature (allegiance is DM). Note that "Creature into Object" requires the new object to be the "same size or smaller" as the original creature (size coupling).
- Design: pick between (a) one big mode picker at cast time selecting creature-creature / creature-object / object-creature, (b) three separate `transform_target` variants. Prefer (a) to keep the save_gate shape uniform.
- Implement.

Research note:

- Sequester already authors `Attachment.target` with `selection: { mode: "one" }` for object targets narratively — the RAW says "object or willing creature". The current type is creature-only; that's a prior partial that this task also closes.
- Polymorph (L4) is Beast-only and doesn't hit object modes; only True Polymorph does.

Verification requirements:

- `pnpm typecheck`; regression clean.
- Sequester should also upgrade to use `Attachment.object` if the new variant subsumes its current partial encoding.
- `/simplify`: 2 rounds.

Handoff readiness:

- Ready for research.

### Task 6 - CSA7 - Shapechange Multi-Type Filter And Form Switch

Status: `ready-for-research`

Depends on: `CSA6`

Blocks: `CSA8`

Scope:

- Widen `PolymorphFormSource.creatureType` from a single `CreatureType` to a filter supporting "any except X" semantics. Shapechange allows any creature type EXCEPT Construct and Undead.
- Add a mid-duration form-switch field (`Duration.concentration.allowsFormSwitchAs?: "magic_action"`), gated by spell. Shapechange allows "Magic action to shape-shift into a different eligible form".
- Author Shapechange as validation ref.

Input:

- Current `PolymorphFormSource` after CSA6 lands (depends on how CSA6 shapes it).
- SRD: `.references/srd-5.2.1/Spells/Descriptions-S-Z.md` `## Shapechange`.

Output:

- `PolymorphFormSource.creatureTypeFilter` as a variant union (`{ kind: "single"; type: CreatureType }` | `{ kind: "any_except"; exclude: ReadonlyNonEmptyArray<CreatureType> }` | `{ kind: "any" }`).
- `Duration.concentration.allowsFormSwitchAs?: "magic_action"` field.
- Tracer dispatch arm for the filter variants.
- `content/shapechange.dhall`.
- `CONTENT_SURFACE_DEFERRED.md` new §C4i (or appended under §C4d) entry RESOLVED.

Next action:

- Blocked on CSA6 shape.

Research note:

- Shapechange retains Int/Wis/Cha scores, HP, HD, proficiencies, creature type, alignment, personality, communication, and Spellcasting feature if the caster has it. The `retainedFields` enum in CSA6's partial may need sibling entries for "intelligence", "wisdom", "charisma", "skill_proficiencies", "languages", "spellcasting_feature". The first 5 are already in the enum; `spellcasting_feature` is new.
- "You must have seen the sort of creature before" is DM / caller-owned knowledge — not encoded.

Verification requirements:

- `pnpm typecheck`; regression clean. `/simplify` 2 rounds.

Handoff readiness:

- Blocked on CSA6. Ready for research in parallel.

### Task 7 - CSA8 - Convergence Checkpoint A

Status: `blocked`

Depends on: `CSA2`, `CSA3`, `CSA4`, `CSA5`, `CSA6`, `CSA7`

Blocks: `CSB1`..`CSB11`

Scope:

- Use the isolated auto-close loop to work down the remaining non-structural widening queue in bounded batches.
- Let the loop pick one reusable gap at a time, attempt one bounded TS/package change, rerun the affected batch, and record weighted-debt deltas.
- Use the loop's telemetry to decide whether the surface is actually converging: per-batch improvement counts, clean flips, global weighted-debt trend, and failed-attempt backlog.
- Once the residual queue is materially smaller, resume manual authoring from the cleaned queue and record the current consecutive-clean streak.

Input:

- Current `survey-results-srd.jsonl`.
- Current `content/` corpus (now larger after CSA2 + CSA3).
- Auto-loop telemetry under `.output/content-surface-closure/`.

Output:

- Updated auto-loop history / latest snapshot / failed-attempt log showing whether weighted debt is dropping.
- A short checkpoint note summarizing: top clusters improved, net weighted-debt change, remaining residual widenings, current consecutive-clean authoring streak.
- If the loop shows sustained downward debt and resumed authoring lands with ≤1 new widening across the next 10 authored units: Phase A convergence achieved → unblock Phase B. Otherwise keep the loop running and spawn follow-up CSA-variant widening tasks for the residual gaps.

Next action:

- Blocked.

Research note:

- The old random-sample approach is superseded. The loop is allowed to pick targeted clusters so long as it records before/after evidence and failed attempts; the acceptance question is whether debt collapses, not whether a random sample happened to be easy.

Verification requirements:

- The loop must keep TS typecheckable after every accepted surface change.
- Full regression clean before declaring the checkpoint passed.
- `/simplify` 1 round per new authored file and normal convergence requirements for any manual widening task.

Handoff readiness:

- Blocked on CSA2..CSA7.

### Task 7.5 - CSA9 - DM-Agenda And Residual Nonsense Cull

Status: `blocked`

Depends on: `CSA8`

Blocks: `CSC1`

Scope:

- Run a deliberate review pass over the residual widening queue after the closure loop has harvested the obvious reusable wins.
- Reclassify product-useless and architecture-unsound residuals into explicit DM-agenda / carveout buckets instead of continuing to widen the executable surface for them.
- Focus especially on world-object-state, narrative-mutation, persistent environment, adhesive/bonding, and similar mechanics that are technically real rules pressure but not worth encoding for this app.
- Record which residuals stay as real widening work versus which residuals are now intentionally excluded.

Input:

- Current closure-loop telemetry under `.output/content-surface-closure/`.
- Current residual widening clusters from `REPORT_SRD.md` and the latest survey artifacts.
- `ARCHITECTURE.md` §1 DM-agenda rules.

Output:

- A checked-in residual-cull note listing:
  - DM-agenda carveouts accepted by this pass;
  - residual widenings that remain legitimate executable-surface work;
  - representative examples for each bucket.
- Updated convergence interpretation for CSA8/CSC1 so the loop is no longer judged against product-useless residue.

Next action:

- Blocked.

Research note:

- This is where items like `bond_objects` should be decided explicitly instead of silently remaining in the widening queue forever. The goal is not to deny that the rule exists; the goal is to stop paying convergence cost for mechanics that the app should intentionally leave outside the executable surface.

Verification requirements:

- Every carveout must be justified against `ARCHITECTURE.md` §1, not only by "low value".
- Do not collapse legitimate reusable mechanics into DM-agenda merely because they are inconvenient.

Handoff readiness:

- Blocked on CSA8.

### Task 8 - CSB1 - Species Traits Batch

Status: `ready-for-implementation-after-light-research`

Depends on: none

Blocks: `CSC1`

Scope:

- Author the 17 SRD 5.2.1 species traits as `species_trait` records. SRD chapter: `.references/srd-5.2.1/Species/` (check `ls .references/srd-5.2.1/Species/` for the exact file layout).
- Most traits fit the existing `PassiveMechanics` + `EquipmentPredicate { kind: "always" }` shape: `grant_sense` (darkvision, blindsight), `grant_resistance` (damage type), size, speed.
- A minority use `ActivatedAbilityMechanics` (Dragonborn Breath Weapon already has a precedent; see `content/` for any pre-existing species_trait file).

Input:

- `.references/srd-5.2.1/Species/*.md`.
- Existing `PassiveMechanics`, `SpeciesTraitMechanics`, `ActivatedAbilityMechanics` types.
- Any pre-existing species_trait content files to match style.

Output:

- ~17 `content/species_<name>_<trait>.dhall` files.
- 0 new widenings expected. If one surfaces (e.g., a trait with a never-before-seen shape), flag as PARTIAL + DEFERRED.
- Regression clean.

Next action:

- List the 17 traits from the SRD Species chapter. Group by shape (passive grant / activated ability). Author in batches of 5.

Research note:

- Dragonborn Breath Weapon uses `innate_dc { base: 8, ability: "con" }` + `replace_attack` cost. Sibling traits may share shape.
- Half-Elf / Tiefling / etc. have multi-grant passives (proficiencies + resistance + senses); use `composite` EffectAtom to bundle.

Verification requirements:

- `pnpm typecheck`; regression; `/simplify` 2 rounds.

Handoff readiness:

- Ready. Mechanical authoring task; existing grammar expected to cover all 17.

### Task 9 - CSB2 - Feats Batch

Status: `ready-for-implementation-after-light-research`

Depends on: none

Blocks: `CSC1`

Scope:

- Author remaining SRD feats: origin feats, epic boons, general feats, remaining Fighting Styles. ~10-15 units.
- `FeatRecord` type already covers passive + activated patterns via `PassiveMechanics | ActivatedAbilityMechanics`.

Input:

- `.references/srd-5.2.1/Feats.md` (or `Feats/` directory — check with ls).
- Existing `content/` feat files for style.

Output:

- ~10-15 new content files.

Next action:

- List remaining feats. Group by category (general / origin / epic_boon / fighting_style). Author.

Research note:

- Epic Boons (level 19+ feats) include some with unusual shapes (Boon of the Night Spirit, Boon of Irresistible Offense). Flag PARTIAL if they hit a widening.

Verification requirements:

- `pnpm typecheck`; regression; `/simplify` 2 rounds.

Handoff readiness:

- Ready. Existing FeatMechanics expected to cover.

### Task 10 - CSB3 - Fighter And Rogue Class Features

Status: `ready-for-research`

Depends on: none

Blocks: `CSB4`, `CSB5`, `CSB7`, `CSC1`

Scope:

- Research both Fighter and Rogue classes.
- Author ~20 class_feature records covering: Fighter (Second Wind, Action Surge, Extra Attack, Indomitable, ASI, Champion subclass at level 3) + Rogue (Sneak Attack, Cunning Action, Expertise, Uncanny Dodge, Evasion, Reliable Talent, Stroke of Luck, Thief subclass).
- Both are martial-only classes; no spellcasting progression. Simplest class-design slice and therefore the pathfinder for later class tasks.

Input:

- `.references/srd-5.2.1/Classes/Fighter.md` + `.references/srd-5.2.1/Classes/Rogue.md`.
- Existing `ClassFeatureMechanics = ActivatedAbilityMechanics | PassiveMechanics`.
- Existing `UseCountCap`, `ChargePoolResource`, `RestResetCadence` types for resource patterns.
- Any pre-existing Fighter/Rogue class_feature content files.

Output:

- ~20 content files.
- A short design doc at `plans/CSB3_FIGHTER_ROGUE_DESIGN.md` capturing: any new widenings needed; the naming convention for class_feature slugs (e.g., `class_fighter_action_surge.dhall`); how subclass dispatch is encoded (likely as separate records with a subclass flag).
- 0-2 new widenings expected.

Next action:

- Research: read both class chapters.
- Design: decide subclass naming. Sneak Attack uses `linear_per_level` DiceAmount already (existing widening covers).

Research note:

- Second Wind already has a `partial_short_full_long` RestResetCadence precedent.
- Action Surge L17: "twice before a rest but only once on a turn" — existing `UsageLimit { kind: "once_per_turn" }` covers.
- Fighting Style ownership: already covered by `EquipmentPredicate`.
- Rogue Sneak Attack triggers on specific conditions (advantage OR ally within 5 ft of target) — caller-owned predicate; encode as a passive bonus with a note that the predicate is DM/caller.

Verification requirements:

- `pnpm typecheck`; regression; `/simplify` 2 rounds per authoring batch.
- Task may reach 3-4h. If so, split closeout into a CSB3-design (research + design doc) and CSB3-implement (authoring) subtask.

Handoff readiness:

- Ready for research.

### Task 11 - CSB4 - Paladin And Cleric Class Features

Status: `ready-for-research`

Depends on: `CSB3`

Blocks: `CSC1`

Scope:

- Author Paladin (Lay on Hands, Divine Smite, Aura of Protection, Channel Divinity, Divine Sense, Divine Health, subclass at L3) + Cleric (Channel Divinity, Destroy Undead, Divine Intervention, Divine Domain subclass, Spellcasting). ~25 units.

Input:

- `.references/srd-5.2.1/Classes/Paladin.md` + `.references/srd-5.2.1/Classes/Cleric.md`.
- CSB3 design doc (naming, subclass dispatch).

Output:

- ~25 content files.
- 0-3 new widenings (Channel Divinity's options-per-subclass may pressure a generalized mode picker).

Next action:

- Blocked on CSB3.

Research note:

- Lay on Hands pool: already has `LinearPerLevel<number>` cap (5 × paladin level).
- Divine Smite: damage rider on attack hits — reuses damage atoms + slot-scaled DiceAmount.
- Aura of Protection: reach-based passive that grants a save bonus to allies — caller-owned geometry; encode as a passive grant with a note.

Verification: as CSB3.

Handoff readiness: blocked on CSB3.

### Task 12 - CSB5 - Barbarian And Monk Class Features

Status: `ready-for-research`

Depends on: `CSB3`

Blocks: `CSC1`

Scope:

- Author Barbarian (Rage, Reckless Attack, Danger Sense, Brutal Critical, Primal Path subclass) + Monk (Martial Arts, Ki/Focus Points, Flurry of Blows, Patient Defense, Step of the Wind, Stunning Strike, Deflect Missiles, Slow Fall, Extra Attack, Unarmored Movement, subclass). ~25 units.
- Rage is a state-flag resource (an "active/inactive" boolean during combat). Current grammar has `UseCountResource` (counter per rest) but not an explicit "is this state-flag active right now" atom. This task likely lands a `state_flag_resource` widening or expands UseCountResource semantics.
- Ki / Focus Points use a pool (`UseCountResource` with `LinearPerLevel<number>` cap = monk level).

Input:

- `.references/srd-5.2.1/Classes/Barbarian.md` + `.references/srd-5.2.1/Classes/Monk.md`.
- CSB3 design doc.

Output:

- ~25 content files.
- 1-2 new widenings likely (state-flag resource; Rage's damage bonus ability-scale).

Next action:

- Blocked on CSB3.

Research note:

- Rage duration: 10 minutes, ends if incapacitated / knocked unconscious / doesn't attack-or-take-damage on a turn (three concurrent end conditions — sibling case for Duration.earlyEnd grammar extension).
- Martial Arts: Dex-or-Str for unarmed, 1d6 → 1d8 → 1d10 die progression — uses `ThresholdTiers<DiceExpr>`.
- Stunning Strike: Con save on attack hit → stunned — uses existing `SaveGateRider` from mastery grammar.

Verification: as CSB3.

Handoff readiness: blocked on CSB3.

### Task 13 - CSB6 - Druid And Ranger Class Features

Status: `ready-for-research`

Depends on: `CSB5`

Blocks: `CSC1`

Scope:

- Author Druid (Spellcasting, Wild Shape using `transform_target`, Druid Circle subclass) + Ranger (Favored Enemy, Natural Explorer, Fighting Style, Spellcasting, Extra Attack, Ranger Conclave subclass). ~20 units.

Input:

- `.references/srd-5.2.1/Classes/Druid.md` + `.references/srd-5.2.1/Classes/Ranger.md`.
- CSB5 resource widenings if landed.

Output:

- ~20 content files.

Next action:

- Blocked on CSB5.

Research note:

- Wild Shape caps CR by "1/2 Druid level, rounded down" — pressures `CRBound` sentinel widening (currently `target_cr_or_level | caster_level | fixed`; need `caster_level_div_2` or similar).
- Ranger Spellcasting preparation count: `prepared = INT + half ranger level` — another linked-amount sibling (§A14 coverage).

Verification: as CSB3.

Handoff readiness: blocked on CSB5.

### Task 14 - CSB7 - Wizard And Sorcerer Class Features

Status: `ready-for-research`

Depends on: `CSB3`

Blocks: `CSB8`, `CSC1`

Scope:

- Author Wizard (Spellcasting, Arcane Recovery, Arcane Tradition subclass) + Sorcerer (Spellcasting, Sorcerous Origin, Font of Magic, Metamagic). ~25 units.
- Metamagic is the risky piece — effects that modify other spells (Twinned Spell, Quickened Spell, Heightened Spell). This is a spell-effect modifier surface that doesn't currently exist. Likely needs a new EffectAtom or a new `spell_modifier` family.

Input:

- `.references/srd-5.2.1/Classes/Wizard.md` + `.references/srd-5.2.1/Classes/Sorcerer.md`.
- CSB3 design doc.

Output:

- ~25 content files.
- 1-3 new widenings likely: Metamagic modifier surface; Sorcerer Font of Magic (sorcery points ↔ slot conversion).

Next action:

- Blocked on CSB3.

Research note:

- Metamagic options apply to a SPELL CAST, modifying its parameters (double targets, bonus-action cast, raise save DC, etc.). Consider: is this a new family `spell_cast_modifier`, or an extension of `TriggeredReactionMechanics` with `ReactionTrigger.own_spell_cast`?
- Font of Magic lets the caster convert sorcery points → spell slots or vice versa. A new resource-transform atom, or a pair of `consumes`/`grants` edges on the tracer?

Verification: as CSB3. Ship CSB7 cautiously — this is where the spellcasting pattern gets pressure-tested for all future caster classes.

Handoff readiness: blocked on CSB3.

### Task 15 - CSB8 - Warlock And Bard Class Features

Status: `ready-for-research`

Depends on: `CSB7`

Blocks: `CSC1`

Scope:

- Author Warlock (Pact Magic — short-rest slot recharge, Eldritch Invocations, Pact Boon, Mystic Arcanum, Otherworldly Patron subclass) + Bard (Spellcasting, Bardic Inspiration using `UseCountCap.ability_modifier`, Jack of All Trades, Expertise, Song of Rest, Countercharm, Magical Secrets, Bardic College subclass). ~20 units.

Input:

- `.references/srd-5.2.1/Classes/Warlock.md` + `.references/srd-5.2.1/Classes/Bard.md`.
- CSB7 spellcasting scaffold.

Output:

- ~20 content files.

Next action:

- Blocked on CSB7.

Research note:

- Warlock Mystic Arcanum: caster knows 1 spell of levels 6/7/8/9, castable once per long rest without a slot. Pressures `SpellAccessMode.once_per_long_rest` (already landed) + a per-level slot-less cast grammar.
- Bardic Inspiration: die progression d6→d8→d10→d12 by Bard level (existing `ThresholdTiers<DiceExpr>` pattern).
- Eldritch Invocations are build-time feat-like picks; encode as separate passive/activated records rather than as Warlock subtable entries.

Verification: as CSB3.

Handoff readiness: blocked on CSB7.

### Task 16 - CSB9 - Magic Items Attunement-Passive Batch

Status: `ready-for-implementation-after-light-research`

Depends on: none

Blocks: `CSB11`, `CSC1`

Scope:

- Author 20 SRD attunement-gated passive magic items (Cloak of Protection pattern). `PassiveMechanics` + `MagicItemRecord.requiresAttunement: true` already covers this family.

Input:

- `.references/srd-5.2.1/MagicItems.md` (or directory).
- Existing Cloak of Protection / Amulet of Health / Headband of Intellect content files.

Output:

- 20 content files.

Next action:

- List attunement-passive items. Author 5 at a time, regression after each batch.

Research note:

- Rings of Protection, Resistance, Swimming, Warmth all fit this slot. Ability-score setters (Gauntlets of Ogre Power, Headband of Intellect, Amulet of Health) use `set_ability_score`.

Verification: `pnpm typecheck`; regression; `/simplify` 1-2 rounds.

Handoff readiness: ready.

### Task 17 - CSB10 - Magic Items Charge-Wand Batch

Status: `ready-for-implementation-after-light-research`

Depends on: none

Blocks: `CSB11`, `CSC1`

Scope:

- Author 15 charge-pool magic items (Wand of Magic Missiles pattern). `ChargePoolResource` + `grant_spell_access.charge_cast` + `ItemDestructionPolicy.last_charge_roll` already covers.

Input:

- `.references/srd-5.2.1/MagicItems.md`.
- Existing Wand of Magic Missiles content file.

Output:

- 15 content files.

Next action:

- List charge-wand items. Author 5 at a time.

Research note:

- Wand of Fireballs, Wand of Lightning, Wand of Web, Chime of Opening (`permanent_on_empty` destruction), Staff of Healing, etc.

Verification: as CSB9.

Handoff readiness: ready.

### Task 18 - CSB11 - Magic Items Sentient Cursed Artifact Batch

Status: `ready-for-research`

Depends on: `CSB9`, `CSB10`

Blocks: `CSC1`

Scope:

- Author ~10 complex items. Sentience, curse, artifact tier likely need widenings.

Input:

- `.references/srd-5.2.1/MagicItems.md` — artifacts section + sentient items rules.

Output:

- ~10 content files + new widenings if needed.

Next action:

- Blocked on CSB9, CSB10 (confirm simpler items fit existing grammar before tackling complex ones).

Research note:

- Sentient items have their own "alignment + ego score + communication" — caller-owned narrative? Or mechanical?
- Cursed items bind on attunement and resist unattunement — pressures attunement lifecycle grammar.
- Artifacts have tiered properties (Minor Beneficial, Major Beneficial, Minor Detrimental, Major Detrimental) — tabled random selection at gain time.

Verification: as CSB9 + 2 rounds `/simplify`.

Handoff readiness: blocked.

### Task 19 - CSC1 - Final Mining Pass And Convergence Measurement

Status: `blocked`

Depends on: `CSA8`, `CSB1`, `CSB2`, `CSB3`, `CSB4`, `CSB5`, `CSB6`, `CSB7`, `CSB8`, `CSB9`, `CSB10`, `CSB11`

Blocks: `CSC2`

Scope:

- **Final convergence closeout.** First snapshot the isolated auto-close-loop output: weighted-debt history, per-batch improvements, clean flips, and failed-attempt backlog. Then re-run the Stage-1 survey pipeline against the fully-authored post-Phase-B surface. This is the pre-freeze checkpoint — if this pass surfaces new widening pressure, we land those widenings (spawn CSA-variant tasks) and re-run this task before CSC2.
- Full regression sweep across the complete authored corpus.
- Regenerate `REPORT_SRD.md`.
- Measure the consecutive-clean streak over the post-CSA8 timeline (i.e., across all Phase B authoring).
- Write `plans/CONVERGENCE_REPORT_FINAL.md` summarizing: total authored count, verdict distribution, closure-loop weighted-debt trend, per-cluster improvement rates, consecutive-clean streak, remaining partials + DM-agenda carveouts, and the frozen atom-vocabulary list (EffectAtom variants, phase kinds, payload families).
- **Convergence criterion for this task:** ≥10 consecutive clean authorings over the Phase B timeline AND the fresh mining pass shows no `surface_widening` or `atom_widening` verdicts other than already-DEFERRED structural carveouts. If either fails, the task is NOT `done` — spawn follow-up widening tasks and rerun.

Input:

- Full `content/` corpus post-Phase B.
- Current `types.ts` and atom whitelist.
- Closure-loop telemetry under `.output/content-surface-closure/`.

Output:

- Refreshed JSONL + REPORT_SRD.md.
- `plans/CONVERGENCE_REPORT_FINAL.md`.
- Closure-loop telemetry snapshot archived alongside the report.
- Regression sweep log.

Next action:

- Blocked.

Research note:

- If the consecutive-clean streak hits ≥10 over the post-CSA8 timeline and the loop telemetry shows no meaningful remaining downward pressure, declare convergence. Otherwise, list the remaining widenings needed, keep the loop running or restart it on the residual queue, and spawn follow-up tasks before CSC2.

Verification requirements:

- Regression: 0 failures mandatory. If any fail, fix before declaring convergence.

Handoff readiness: blocked.

### Task 20 - CSC2 - Surface-v1 Convergence Tag And Handoff Doc

Status: `blocked`

Depends on: `CSC1`

Blocks: `CSD1`

Scope:

- If CSC1 declares convergence: tag the current commit as `surface-v1-converged`.
- Write `plans/SURFACE_V1_HANDOFF.md` — the handoff to Phase D:
  - frozen types.ts SHA;
  - authored-corpus summary (count by kind);
  - DM-agenda + structural carveouts explicitly listed;
  - how the generator should handle the Dhall Optional-field trick in upstream content;
  - Quint integration order (which types.ts sections become Quint variants first).

Input:

- CSC1 output.

Output:

- Git tag.
- `plans/SURFACE_V1_HANDOFF.md`.

Next action:

- Blocked.

Research note:

- The handoff doc is the single input Phase D operates from. Make it self-contained.

Verification requirements:

- Tag is annotated (`git tag -a`) with a message pointing to the handoff doc.

Handoff readiness: blocked.

---

### Phase D Preamble — Core Rehaul Scope

Phase D converts `packages/core/` from a **hardcoded execution engine** (each spell / class feature / monster ability has bespoke runtime code) into a **content-driven execution engine** (a generic atom-dispatch runtime consuming surface-authored content). This is a rewrite of core, not a wiring task. Before starting any Phase D task, read `CSD1` (design) and `CSD3` (inventory); those establish the contract every migration task conforms to.

Implementers: budget this phase at 40-80h across the 9 migration/cleanup tasks. Do NOT ship half-migrations (where some abilities are content-driven and others still hardcoded) unless behind an explicit feature flag — mixed state breaks MBT parity.

**Surface-pressure guardrail.** Phase D may expose atom-vocabulary pressure that the surface-level mining + authoring (Phase A/B) did not — runtime dispatch exposes gaps that static tracing misses. When a migration task hits a genuine surface gap (not a pure runtime bug), the protocol is:

1. Halt the migration task.
2. Open a `CSA9+` variant task: specify the new widening, land it in `types.ts`, update the tracer, author 1-2 validation refs in the surface, run `pnpm typecheck` + regression + targeted mining on the affected SRD slice.
3. Re-run the final mining pass (CSC1-style) if the widening is substantive.
4. Resume the migration task.

Do NOT paper over surface gaps with Phase-D-local runtime workarounds. The content-driven model only works if the surface is the single source of truth for mechanics.

A third exhaustive mining pass AFTER Phase D is intentionally not scheduled in this plan. The rationale: after CSC2 freezes the surface, any runtime-exposed pressure triggers a surgical CSA9+ fixup (per the guardrail above) rather than another full mining sweep. If end-of-batch review shows multiple widenings landed during Phase D, owner may schedule a post-batch mining sweep as a separate follow-up.

---

### Task 21 - CSD1 - Design Content-Driven Execution Architecture

Status: `blocked`

Depends on: `CSC2`

Blocks: `CSD2`, `CSD3`

Scope:

- Design the contract between surface content and core runtime. Surface content is the source of truth; core is a generic engine that dispatches on atoms.
- Decide the runtime representation of authored content: is Dhall/JSON loaded at boot and compiled to a live registry? Is the surface-ingestion step a build-time codegen (TS-to-TS) that produces typed content-resolution tables? Mix?
- Decide Quint-side: does `battle.qnt` gain a generic `resolveEffectAtom(atom, ctx)` operator that dispatches on atom kind, replacing all current per-family handlers? How do ongoing operations compose?
- Decide XState-side: does `battle-machine.ts` actions become `applyEffectAtom(atom, ctx)` dispatchers instead of the current per-action handlers? What changes to the MBT bridge?
- Decide the MBT migration strategy: do we migrate family-by-family with intermediate MBT parity runs, or flip the whole engine in one commit? Family-by-family is safer; commit to that.
- Define the "zero hardcoded mechanics" end state concretely: what code must be deleted from `packages/core/src/features/spell-registry.ts`, `battle.qnt`'s spell-family handlers, `battle-machine.ts` action modules, `packages/core/src/battle-discovery.ts` (or wherever action-discovery lives).

Input:

- `plans/SURFACE_V1_HANDOFF.md` (from CSC2) — the frozen types.ts SHA + authored corpus summary.
- `packages/prototype-content-surface/src/surface/types.ts` at the frozen SHA.
- `packages/core/src/features/spell-registry.ts` — the current hardcoded spell registry.
- `packages/core/battle.qnt` + `packages/core/creature.qnt` — the existing spec.
- `packages/core/src/battle-machine.ts` + adjacent files — the XState machine.
- `.references/xphb-srd-pairing/PLAN_closed_extension_surface_implementation.md` Phase 1 notes.
- Prior batch's `SPELL1_SPELL_OWNERSHIP_SURFACE.md` + SPELL2b closeout — established the first content-driven spell family.

Output:

- `plans/CORE_REHAUL_DESIGN.md` covering:
  - ingestion strategy (runtime load vs. build-time codegen);
  - Quint generic atom-dispatch shape;
  - XState generic action-dispatch shape;
  - MBT migration strategy (family-by-family checkpoints);
  - concrete code-deletion targets (the "what must no longer exist" list);
  - per-family migration order with justification.
- No code.

Next action:

- Blocked. Highest-leverage task in the phase — the design here governs all migration tasks.

Research note:

- The prior batch shipped `SPELL2b` which is the first slice of this same rehaul (save-spell family: burning_hands, fireball, hold_person). Read its closeout notes to understand what pattern is already established and where it stopped.
- Do not redesign what SPELL2b already committed to; extend its pattern uniformly across all families.
- `battle.qnt` is the authoritative correctness target. Design the rehaul so the spec stays valid during migration — each family-migration task must include MBT parity at its close.

Verification requirements:

- Design doc is reviewed; no code yet.
- `/simplify` not applicable (design task).

Handoff readiness: blocked.

### Task 22 - CSD2 - Implement Quint-Variant Generator

Status: `blocked`

Depends on: `CSD1`

Blocks: `CSD3`

Scope:

- Build the Quint-variant generator per CSD1's design. Reads the frozen `types.ts` + emits Quint variant / type definitions for the closed atom vocabulary.
- Land in `packages/quint-gen/` (new package) or `packages/core/scripts/gen-quint.ts` depending on CSD1's decision.
- Unit tests covering the main type families: `EffectAtom`, `Attachment`, `ActivationPhase`, `Duration`, `CastingTime`, the payload families, `ReadonlyNonEmptyArray<T>`, `CastTimeChoice<T>`.
- Generator CLI or pnpm script.

Input:

- `plans/CORE_REHAUL_DESIGN.md`.
- Frozen `types.ts`.
- Existing `packages/core/*.qnt` for style reference.

Output:

- `packages/quint-gen/` or equivalent + tests.
- Generator output committed to `packages/core/generated/*.qnt` (or as an on-demand artifact depending on CSD1's call).

Next action: blocked.

Research note:

- Quint has no native NonEmpty type. Choose: `List[T]` with an `assume(length(x) > 0)` in consumers, or a custom `NonEmptyList[T]` helper type.
- Quint's Rust evaluator may have performance implications around wide records — benchmark on the largest generated variant (likely `EffectAtom`, ~30+ cases).

Verification requirements:

- Unit tests pass.
- Hand-inspect generator output on the frozen `types.ts`.
- `npx quint typecheck` on the generated files passes.
- `/simplify` 2 rounds.

Handoff readiness: blocked.

### Task 23 - CSD3 - Inventory Hardcoded Abilities And Migration Plan

Status: `blocked`

Depends on: `CSD1`, `CSD2`

Blocks: `CSD4`, `CSD5`, `CSD6`, `CSD7`, `CSD8`, `CSD9`

Scope:

- Full code audit: every place `packages/core/` hardcodes an ability.
- Produce `plans/CORE_REHAUL_INVENTORY.md` with one row per hardcoded ability. Each row names: the ability ID (spell or class-feature slug), the location in code (file + function), the target surface-content file that will drive it post-migration, and the target family-migration task (CSD4..CSD9).
- Cross-check against the authored surface corpus: every hardcoded ability should have a surface-authored counterpart by now (Phase A/B authored 130+ units). Flag any gaps — those are units that must be authored before their migration task can start.

Input:

- CSD1 design doc (defines what "hardcoded" means concretely).
- CSD2 generator output.
- `packages/core/src/` — full source tree.
- `packages/core/battle.qnt` + `creature.qnt`.
- `packages/core/src/features/spell-registry.ts` — the main spell-hardcoding site.
- `packages/prototype-content-surface/content/` — authored corpus.

Output:

- `plans/CORE_REHAUL_INVENTORY.md`.
- No runtime changes.

Next action: blocked.

Research note:

- Use `grep` / `rg` to enumerate hardcoded sites. Key patterns: `SpellId` case statements, per-spell handler functions, per-feature effect dispatchers in battle-machine actions.
- Expected site count: ~40-60 hardcoded abilities across spells + class features + monster abilities + masteries.
- If the inventory shows unmigratable abilities (e.g., something that needs a surface widening not yet landed), STOP and open a CSA-variant task to land the widening + author the unit before CSD4 starts.

Verification requirements:

- Inventory cross-checks against authored corpus. Every hardcoded ability maps to a target content file. Gaps are explicit.

Handoff readiness: blocked.

### Task 24 - CSD4 - Rehaul Save-Spell Family To Content-Driven

Status: `blocked`

Depends on: `CSD3`

Blocks: `CSD5`, `CSD6`, `CSD7`, `CSD9`, `CSD10`

Scope:

- First family migration. Save-spell family includes everything currently authored with a `save_gate` ActivationPhase: Burning Hands, Fireball, Cone of Cold, Cloudkill, Sleep, Hold Person, Dominate Person/Beast/Monster, Banishment, Polymorph, True Polymorph, Dispel Magic, etc.
- Remove hardcoded entries for these spells from `packages/core/src/features/spell-registry.ts` (keep identity + provenance; strip mechanics).
- Add a generic save-gate resolution lane in `battle.qnt` that consumes surface `save_gate` phases: ability + DC + onFail + onSuccess + repeatSave?.
- Update `battle-machine.ts` to dispatch save-spell casts through the generic lane instead of per-spell handlers.
- MBT parity per migrated spell: every hardcoded spell's existing battle trace must be byte-identical after migration.
- Runs Tier 1 MBT after each spell; Tier 3 at task closeout.

Input:

- `plans/CORE_REHAUL_INVENTORY.md` (the per-ability checklist for this family).
- CSD1 design doc (generic atom-dispatch contract).
- Prior SPELL2b closeout — first slice of this work; extend its pattern.
- Every save-spell surface content file in `packages/prototype-content-surface/content/`.

Output:

- `spell-registry.ts` stripped of save-spell mechanics.
- `battle.qnt` with a generic save-gate resolution lane.
- `battle-machine.ts` updated.
- MBT Tier 1 clean per spell + Tier 3 clean at closeout.
- Code deletion diff should be net-negative (hardcoded removed > content-dispatch added).

Next action: blocked.

Research note:

- Budget 6-8h. If you exceed 10h, the design is wrong — pause and revisit CSD1.
- Expect parity regressions during migration. Use the MBT seed replay pattern from `CLAUDE.md`.
- The generic save-gate lane must handle: DcSource variants (spell save DC / innate DC / weapon attack DC), half-damage sentinel on success, repeatSave cadences (`end_of_target_turn`, `on_target_takes_damage`, `onFailAgain` chain), `autoSuccessIfCasterSlotGte` DC bypass, `saveAppliesIf: unwilling_target`.

Verification requirements:

- `npx quint test --match "inv_"` passes.
- Tier 1 MBT (per spell) passes.
- Tier 3 MBT at closeout passes (50 seeds × 10 steps).
- `pnpm typecheck` repo-root passes.
- `/simplify` 2 rounds.

Handoff readiness: blocked.

### Task 25 - CSD5 - Rehaul Attack-Roll Spell Family To Content-Driven

Status: `blocked`

Depends on: `CSD4`

Blocks: `CSD6`, `CSD10`

Scope:

- Migrate attack-roll spells: Fire Bolt, Ray of Frost, Acid Splash, Chromatic Orb, Inflict Wounds, Eldritch Blast (if authored), Ray of Sickness, etc.
- Remove hardcoded entries; add generic attack-roll lane consuming surface `attack_roll` ActivationPhase.
- The generic lane must handle: `attackKind` (melee/ranged spell attack), `onHit` / `onMiss` NonEmpty effect arrays, composite effects, attack-side riders (Divine Favor damage rider, Hunter's Mark damage rider — these come in via `OngoingOperation.on_caster_attack_hit` from CSD6).

Input:

- CSD3 inventory (attack-spell rows).
- CSD4 generic-dispatch pattern.
- Attack-spell surface content.

Output:

- `spell-registry.ts` attack-spell entries stripped.
- `battle.qnt` generic attack-roll lane.
- `battle-machine.ts` updated.
- MBT parity.

Next action: blocked.

Research note:

- 4-6h. Smaller than CSD4 because attack-roll resolution is simpler than save resolution (no DC source variants, no repeat saves).

Verification requirements: as CSD4.

Handoff readiness: blocked.

### Task 26 - CSD6 - Rehaul Ongoing-Effect Spell Family To Content-Driven

Status: `blocked`

Depends on: `CSD4`, `CSD5`

Blocks: `CSD8`, `CSD9`, `CSD10`

Scope:

- Migrate ongoing-effect spells: Bless, Bane, Hunter's Mark, Hex, Faerie Fire, Divine Favor, Barkskin, Mage Armor, Heroism, Aura of Life, Spirit Guardians, Web, Spike Growth, Cloudkill, Moonbeam, Beacon of Hope, Pass without Trace, Guidance, etc.
- Most complex family. Each spell has: an attachment, an `operations: ReadonlyNonEmptyArray<OngoingOperation>`, each operation has trigger + predicate + effect.
- Generic resolution lane must dispatch on: OngoingTrigger variants (passive, on_caster_attack_hit, on_attached_turn_start, on_caster_turn_start, on_attached_damaged, on_creature_moves, on_creature_enters_area), OngoingPredicate (at_hp_threshold), OngoingEffect (plain EffectAtom or save_gate or modify_ac_set_base/floor).
- Some spells also have `initialPhase` (Cloudkill, Moonbeam): fire-once activation phase at cast.

Input:

- CSD3 inventory.
- CSD4 + CSD5 generic-dispatch patterns.
- Ongoing-effect surface content.

Output:

- `spell-registry.ts` ongoing-effect entries stripped.
- `battle.qnt` generic ongoing-operation dispatch lane.
- `battle-machine.ts` updated for ongoing-effect lifecycle.
- MBT parity.

Next action: blocked.

Research note:

- 6-8h. Biggest family. Ongoing effects require new runtime state — tracking attachments, scheduling trigger evaluations per turn, composing multiple operations per spell.
- The `on_caster_attack_hit` trigger couples with CSD5's attack-roll lane — attack-roll completion must publish an event the ongoing-effect lane subscribes to. Design this carefully.

Verification requirements: as CSD4.

Handoff readiness: blocked.

### Task 27 - CSD7 - Rehaul Triggered-Reaction Family To Content-Driven

Status: `blocked`

Depends on: `CSD4`

Blocks: `CSD10`

Scope:

- Migrate Shield + Counterspell + any other authored reaction spell.
- Per prior SPELL2b closeout, Counterspell timing is currently battle-owned (hardcoded in battle.qnt). Migrate it to consume `TriggeredReactionMechanics.phases[save_gate]` with `ReactionTrigger.creature_casts_spell` and `autoSuccessIfCasterSlotGte`.
- Shield migration is straightforward — it's a `direct` phase with modify_ac + negate_named_effect.
- Generic reaction-window resolution lane in battle.qnt.

Input:

- CSD3 inventory.
- CSD4 save-gate dispatch lane (Counterspell uses it).
- `content/counterspell.dhall`, `content/shield.dhall`.

Output:

- Battle.qnt hardcoded counterspell timing removed.
- Generic reaction-window lane consuming surface content.
- MBT parity including the nested-counterspell case.

Next action: blocked.

Research note:

- 4h. Counterspell-counterspelling works naturally in the grammar (Counterspell's S-component cast is itself a `creature_casts_spell` trigger); make sure the runtime honors the 1-reaction-per-round constraint as caller-owned.

Verification requirements: as CSD4.

Handoff readiness: blocked.

### Task 28 - CSD8 - Rehaul Summon/Polymorph Families To Content-Driven

Status: `blocked`

Depends on: `CSD5`, `CSD6`

Blocks: `CSD10`

Scope:

- This is mostly NEW execution code — the core currently has no runtime support for spawned creatures, polymorph, or templated multi-spawn. Add it.
- Families to support: `spawned_creature` (Find Familiar, Find Steed, Summon Dragon), `reanimated_creature` (Animate Dead, Create Undead), `templated_multi_spawn` (Animate Objects), `transform_target` EffectAtom (Polymorph, True Polymorph).
- Runtime support needs:
  - companion state (stat block projection, HP, attacks, current mode selection);
  - catalog-ref lookup (Animate Dead → monster catalog Skeleton/Zombie entry);
  - polymorph stat-block replacement with retained fields (alignment, HP, creature type, etc.);
  - temp-HP-from-new-form on transform;
  - revert triggers (zero_hp, spell_ends, temp_hp_depleted, dismissed_by_caster);
  - 24h reassert cycle for reanimation;
  - capacity-budgeted templated spawning (Animate Objects weight × caster ability mod).

Input:

- CSD3 inventory.
- CSD5 + CSD6 patterns (companion attack/save actions reuse those lanes).
- Summon / polymorph surface content.
- Current monster catalog (`packages/core/src/monster-catalog.ts`) — companion stat blocks come from here post-migration, not from hardcoded spell entries.

Output:

- New runtime support in battle.qnt + battle-machine.ts for companion state + transform state.
- Monster catalog integration for catalog-ref spawns.
- MBT covers spawn → companion action → dismiss lifecycle.

Next action: blocked.

Research note:

- 8-10h. Biggest new-code task. Plan carefully.
- Polymorph's "stats replace except retained fields" is the tricky piece — the creature's current HP is retained but the replacement has its own temp-HP pool. Handle this as a stacked-state: original creature state + transform overlay with temp-HP pool.
- Transform revert on `temp_hp_depleted` requires the runtime to track temp HP separately from normal HP.

Verification requirements: as CSD4 + new scenarios for summon/polymorph in MBT.

Handoff readiness: blocked.

### Task 29 - CSD9 - Rehaul Class Features And Monster Abilities To Content-Driven

Status: `blocked`

Depends on: `CSD4`, `CSD5`, `CSD6`

Blocks: `CSD10`

Scope:

- Migrate hardcoded class-feature execution: Second Wind, Action Surge, Rage, Ki/Focus Points, Channel Divinity, Lay on Hands, Divine Smite (damage rider), Sneak Attack (damage rider), Extra Attack (attack-count modifier), etc.
- Migrate hardcoded monster-ability execution: Magic Resistance, Pack Tactics, Recharge, Multiattack dispatch.
- Most of these already have surface content from Phase B. Wire the consumption.
- Class-feature activation dispatches through the generic activation lane (CSD4/CSD5); ongoing effects dispatch through CSD6; class-feature passive grants resolve at rest-reset or on-advance.

Input:

- CSD3 inventory (class-feature + monster-ability rows).
- CSD4 / CSD5 / CSD6 generic-dispatch lanes.
- Phase B authored content.

Output:

- Hardcoded class-feature + monster-ability execution stripped.
- Resource pool state (rage uses, ki points, bardic inspiration dice, etc.) dispatched through generic UseCountResource + ChargePoolResource lanes.
- MBT parity.

Next action: blocked.

Research note:

- 6-8h. Much of this is bookkeeping; the hard piece is resource-pool lifecycle (rest resets, per-turn limits, pool conversion like Sorcery Points ↔ Slots).
- Divine Smite's damage rider is an on-hit modifier — wires into CSD6's ongoing-effect trigger lane as `on_caster_attack_hit`.

Verification requirements: as CSD4.

Handoff readiness: blocked.

### Task 30 - CSD10 - Tier 3 MBT Convergence And Core Hardcode Cleanup

Status: `blocked`

Depends on: `CSD4`, `CSD5`, `CSD6`, `CSD7`, `CSD8`, `CSD9`

Blocks: `CSD11`

Scope:

- After all family migrations: run Tier 3 MBT (`MBT_STEPS=10 ./scripts/mbt-fuzz.sh 50`, ~15min). Fix any parity regressions across the full corpus.
- Delete dead code: the hardcoded-ability paths, per-family handlers, per-spell dispatch tables. `packages/core/src/features/spell-registry.ts` should now contain only identity + provenance per spell — no mechanics.
- Confirm `battle.qnt` has only generic atom-dispatch lanes, no per-spell or per-family handlers remaining.
- Run Tier 4 overnight (`MBT_STEPS=640 MBT_TIMEOUT=150 ./scripts/mbt-fuzz.sh` with `MBT_SAVE_TRACES=1`) against a representative seed set; log results.

Input:

- All CSD4..CSD9 outputs.

Output:

- Net-negative code diff (substantial deletions).
- `plans/CSD10_CLEANUP_LOG.md` with the diff summary, Tier 3 + Tier 4 run logs.
- MBT Tier 3 clean.

Next action: blocked.

Research note:

- 4-6h cleanup + fuzz-run time.
- If Tier 3 surfaces a subtle family-interaction bug, file it as a follow-up task under Phase D rather than widening CSD10 into further refactoring.

Verification requirements:

- Tier 3 clean.
- Tier 4 overnight clean (or logged seed failures with fixes queued).
- `grep -r "case \"spell_id\"" packages/core/src/` returns zero hits (sanity: no per-spell dispatch remains).
- `/simplify` 2 rounds on the cleanup diff.

Handoff readiness: blocked.

### Task 31 - CSD11 - End-To-End Demo And Batch Closeout

Status: `blocked`

Depends on: `CSD10`

Blocks: none

Scope:

- Pick 5-10 authored abilities spanning every family: one save-spell, one attack-spell, one ongoing-effect spell, one reaction, one summon, one polymorph, one class feature, one monster ability. Script a demo pipeline that loads each, dispatches through the now-content-driven core, and captures a trace.
- Write `plans/CSD11_DEMO.md`: pipeline diagram, per-ability trace transcripts, before/after code-size comparison, batch retrospective (what went well, what was harder than expected, what the next batch should address).
- Tag commit as `phase-d-converged`.
- Update this ACTIVE_PLAN.md to mark the batch complete. Next batch (broader MCP content-casting surface, Quint XPHB-lane authoring, engine UX) is outside this plan; name it in a new batch header when the owner starts it.

Input:

- Complete Phase D.

Output:

- Demo script.
- `plans/CSD11_DEMO.md`.
- Git tag + batch retrospective.

Next action: blocked.

Research note:

- This is the "it all works" moment. If the demo surfaces a bug in a specific migration, fix it here and note in the demo doc — don't punt.

Verification requirements:

- Demo runs cleanly on all selected abilities.
- Retrospective is concrete (specific numbers: code lines deleted, MBT runtime delta, content files authored).

Handoff readiness: blocked.

---

**End of active plan.** When all 31 tasks are `done`, surface-v1 is converged and `packages/core/` is fully content-driven. Next batch (Phase 2+: MCP public casting surface, XPHB authoring lane, engine UX, app integration) is outside this plan's scope — name it in a new batch header when reached.
