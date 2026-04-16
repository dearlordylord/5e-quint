# Content Surface Prototype — red/green per-spell loop

## Context

The research track in `.references/xphb-srd-pairing/` has converged on a closed atom vocabulary (`TAXONOMY_atoms_graph.md` at v4, `TAXONOMY_graph_representation.md` at v1 with 18 reusable subgraphs). An adversarial counter-example hunt confirmed that every SRD 5.2.1 rule can be encoded as structured data + closed interpreter + caller-signaled open clauses; no executable-author surface is forced (`.references/xphb-srd-pairing/RESEARCH_capstone.md`).

Next step is Phase 1 of `.references/xphb-srd-pairing/PLAN_closed_extension_surface_implementation.md` — but we're approaching it red/green, one spell at a time, per option **(c)** of the three paths discussed:

- **(a) Atoms frozen at v4, start schema design directly.** Churn risk during implementation.
- **(b) Bulk-promote hunt widenings to v5 first.** Risks another cycle.
- **(c) Promote on demand per spell.** Each spell is a red/green cycle — either fits the existing surface (green) or reveals a gap that forces a surface widening (red → extend surface → green). The hunt's 6 widenings become a ranked to-do list, not blockers.

## Goal of this prototype

**Not** to run spells against the real core runtime. **Not** to implement combat mechanics. **Not** to wire Quint variants.

**Only**: exercise the authoring → surface → interpreter flow end-to-end for one spell, in isolation, so every atom dependency the spell makes on the surface is visible as a reviewable graph. User reviews the graph → either green-lights the encoding (atom vocabulary is sufficient) or flags a widening (atom missing or mis-shaped).

Concretely: tracer walks the authored spell ADT, records which surface atoms / subgraphs it touches, renders the dependency graph as mermaid. Core runtime is NOT called — the tracer is a second interpreter over the same algebra, producing a graph instead of a payload.

## Why the tracer is architecturally important

Initial-encoding-with-tagged-unions (the shape we settled on) gives us *multiple interpreters over one authored term*. The tracer is the simplest non-trivial interpreter — it produces a dependency graph, not a runtime effect. It proves two things at once:

1. **The authored surface is expressive enough.** If a spell encodes cleanly, the surface supports its shape. If not, we've found a widening event.
2. **Multiple interpretation is real.** The same Dhall-authored Bless produces (a) a dependency graph via the tracer, and later (b) a BattlePayload via the real interpreter, and later still (c) a Quint variant via the Quint-gen interpreter. Tracer-first forces the algebra to be interpreter-neutral from day 1.

## Repo layout for prototype

Main repo only. Nothing in `.references/` gets touched by implementation work.

```
/workspace/typescript/dnd/
├── plans/
│   └── CONTENT_SURFACE_PROTOTYPE.md        ← this file
├── packages/prototype-content-surface/     ← new workspace package, may be deleted wholesale
│   ├── README.md
│   ├── package.json                        ← @dnd/prototype-content-surface, no internal deps
│   ├── tsconfig.json                       ← matches @dnd/core conventions
│   ├── eslint.config.mjs                   ← matches @dnd/core conventions
│   ├── src/
│   │   ├── surface/
│   │   │   ├── types.ts                    ← closed atom types (minimum subset)
│   │   │   └── constructors.ts             ← typed helpers (optional sugar)
│   │   ├── interpreter/
│   │   │   ├── tracer.ts                   ← walks ADT, records atoms + edges
│   │   │   └── mermaid.ts                  ← renders trace as mermaid
│   │   └── run.ts                          ← CLI entry: load spell → trace → emit mermaid
│   └── content/
│       ├── bless.dhall                     ← authored source
│       └── bless.json                      ← pre-compiled (hand-written for now)
```

`packages/prototype-content-surface/` is a pnpm workspace package (`@dnd/prototype-content-surface`) but has zero internal imports — it uses no `@dnd/*` dependency. Workspace integration depth is "medium": package follows repo conventions (tsconfig / eslint / scripts mirror `@dnd/core` and `@dnd/mcp`), and `turbo typecheck` / `pnpm install` at the root pick it up automatically via `packages/*` in `pnpm-workspace.yaml`. It can be rmed at any time without breaking other packages.

## Per-spell red/green loop

For each spell, one pass:

1. **Author the Dhall.** Encode the spell's mechanics using the current `src/surface/types.ts`. If no Dhall toolchain is installed, author the JSON directly — we maintain the Dhall file as documentation of authoring intent.
2. **Run the tracer.** `tsx src/run.ts content/<spell>.json`. The tracer walks the ADT and emits a mermaid file.
3. **Review the mermaid.** User looks at the dependency graph:
   - Are all atom kinds the spell touches actually present in `src/surface/types.ts`?
   - Does the shape match the expected subgraph pattern (see `.references/xphb-srd-pairing/TAXONOMY_graph_representation.md` §5)?
   - Any atom that feels forced or mis-labeled?
4. **Decide:**
   - **Green** — encoding fits, graph matches expectations. Move to next spell.
   - **Red** — widening event. The spell needs an atom the surface doesn't have, or an existing atom is wrong-shaped.
     - Extend `src/surface/types.ts` with the new atom or refined variant.
     - Update `src/interpreter/tracer.ts` to handle the new case.
     - Re-run. Confirm green.

Each red/green cycle is one PR's worth of work.

## Success criteria per iteration

- The authored Dhall/JSON validates against `src/surface/types.ts` (TypeScript compilation passes).
- The tracer exits 0 and emits a mermaid file.
- The mermaid graph is visually sensible — the atoms listed correspond to the SRD text's mechanical content, not a mis-encoding.
- If a widening was forced, the new atom has a clear SRD pressure case (follows the research repo's convention: an atom only exists if at least one SRD rule pressures it).

## Out of scope for this prototype

- Quint variant generation. Until the TS surface stabilizes, Quint parity work doesn't begin.
- Battle runtime integration. `packages/core/src/features/spell-modeled-mechanics.ts` stays unchanged.
- XState wiring.
- MBT testing.
- Full surface coverage. The prototype only grows atoms as spells demand them. Full surface = end of the red/green loop (when no new widenings surface).
- Dhall toolchain install. The Dhall files are authored-as-documentation; JSON is hand-maintained for now. If/when we standardize Dhall, the compilation step gets automated.

## First spell and first target set

Start: **Bless**. Well-studied in the research (3 rounds of spell validation, canonical pressure case for `modify_roll_numeric`). Expected green on first try.

Expected next spells (in order, each picked to exercise a fresh family):

1. Bless — `ongoing_effect` with target-count scaling. Baseline.
2. Shield — `triggered_reaction`, subgraph A (Prepare / Prompt / Commit).
3. Fireball — `activation`, save-for-half damage, no ongoing state.
4. Magic Missile — `activation`, auto-hit multi-projectile.
5. Counterspell — `triggered_reaction` interrupting a spell-cast-in-progress.
6. Hunter's Mark — `ongoing_effect` with mark/transfer (subgraph E).
7. Alarm — `anchored_trigger` (first pressure case for anchored-trigger grammar — expect §4.2 widening).
8. Death Ward — HP intercept (expect §4.4 widening, first `intercept_hp_event`).
9. Polymorph — stat-block projection (expect §4.1 widening, strongest from hunt).

Ordering: low-pressure spells first (rows 1–6 should all be green under an extended v4 surface), hunt-predicted widenings later (rows 7–9).

## Relation to the six hunt-predicted widenings

The per-spell loop is exactly the mechanism by which the hunt's §4 widenings get promoted. Each expected widening becomes a red event on a specific spell:

| Hunt §4 | Expected red on | Delivers |
| --- | --- | --- |
| 4.1 Stat-Block Projection | Polymorph (or Wild Shape if we go to class features) | New subgraph S atom + types |
| 4.2 Anchored-Trigger Grammar | Alarm, matures on Glyph of Warding + Contingency | Closed anchor/event/filter vocabulary |
| 4.3 Cross-Spell Parameter Rewrite | Metamagic options (class-feature territory) | `modify_duration`, `modify_casting_time`, `modify_damage_type`, `modify_slot_level_delta`, `modify_save_auto_success` |
| 4.4 HP-Event Intercept | Death Ward | `intercept_hp_event` atom |
| 4.5 Resource Conversion Table | Font of Magic (class-feature) | `convert_resource` atom |
| 4.6 Caster-Field Projection | Animate Objects | Subgraph D extension with typed caster-field list |

Confirming a widening in real encoding (not adversarial probing) is stronger evidence than the hunt's analysis alone. Red-greening these six ends the taxonomy track for real.

## When to stop

The red/green loop stops being the right mechanism when:

- all six hunt widenings have been confirmed or rejected under real encoding pressure;
- no new widening has surfaced across ~10 consecutive spells;
- the surface has stabilized enough that Quint variant generation and XState integration become the gating work.

At that point, Phase 1 proper begins (per the existing research-side plan).

## Artifacts this prototype produces

- `packages/prototype-content-surface/` — runnable code.
- One mermaid trace output file per spell (written next to the JSON, e.g., `content/bless.trace.md` — gitignored).

## Artifacts this prototype does NOT produce

- No changes to `packages/core/`.
- No changes to `packages/app/`.
- No changes to `.references/`.
- No changes to any `.qnt` file.
- No published npm packages.
- No touching the 5 in-flight character-creation modifications currently uncommitted in the main repo.

## Scratch/visual artifacts from this session

- `DELETE_AFTER_REVIEW_taxonomy_visuals.md` at repo root — 18 subgraph diagrams for eyeballing. Marked for deletion.

## Open questions for the user

1. **Scope of first pass.** Build just Bless end-to-end this session, or Bless + Shield (first red/green pair)? Bless alone is sufficient to prove the flow; Shield adds the first subgraph-pattern exercise.
2. **Dhall tolerance.** If you want to exercise the Dhall toolchain, we install `dhall-to-json`. If you'd prefer to stay pure JSON until the surface stabilizes, the Dhall files serve as documentation-only until then.
3. **Location of trace outputs.** Colocate next to source JSON (`content/bless.trace.md`) or separate `traces/` directory? Leaning colocated — easier to review diffs when editing a spell.

---

## Current state (as of handoff)

### Surface features shipped

- **Stage 1** — `castingTime` first-class on `SpellMechanicsHeader`; `action_quota` / `bonus_action_quota` / `reaction_quota` (Quota resources from UBIQUITOUS_LANGUAGE §"Resource Consumption"); `concentration_lock` (Lock resource).
- **Stage 2** — `SpellMechanicsHeader` carries `level`, `school`, `castingTime`, `range`, `components`, `duration`. `DiceAmount` `threshold_tiers`/`linear_per_level` axis-parameterized (character/class/slot). `UseCountCap` widens with `threshold_tiers<number>`.
- **Option B (scaling unification)** — `LevelAxis = "character" | "class" | "slot" | "subclass" | "proficiency_bonus"`; generic `ThresholdTiers<T>` and `LinearPerLevel<T>`; `DiceExpr` + `DiceExprDelta` for partial overrides.
- **Triggered-reaction family** — `family: "triggered_reaction"` on `SpellMechanics`; `CastingTime.reaction` carrying a `ReactionTrigger` grammar (`hit_by_attack_roll` / `targeted_by_named_spell` / `any_of`); `respond` procedure; Subgraph A (Prepare/Prompt/Commit) chain; `interrupt_resolution`, `modify_ac`, `negate_named_effect` effect atoms; `self` attachment.
- **Class-feature basics** — `ClassFeatureActivationCost` with `free` and `bonus_action`; `UseCountCap` class-level-tier schedule; `RestResetCadence` with `short_or_long_rest` / `long_rest` / `short_rest` / `partial_short_full_long` (Second Wind pattern); `heal_hp` and `grant_extra_action` ClassFeatureEffect variants; `restrict_action_set`.
- **Widening 1 — Mark/Transfer (Subgraph E)** — `mark` attachment kind with `MarkTransfer` (`onEvent: target_drops_to_0_hp`, `cost: bonus_action`); `damage_on_hit` operation variant on `OngoingOperation`; `bonus_action` added to `CastingTime`. Tracer emits `mark_target` + `transfer_mark` effects and a `transfers_to` edge; `damage_on_hit` opens an `on_hit_window` granting a `damage` effect attached to the mark. Pressure case: Hunter's Mark.
- **Widening 2 — On-Hit Rider (Subgraph G)** — `MasteryRecord` as a third top-level unit kind; `on_hit_trigger` family; `MasteryTrigger` (`weapon_hit` / `weapon_hit_melee_only`); closed `MasteryEffect` with `modify_roll_advantage`, `save_gate`, `grant_weapon_attack` (Cleave); `RiderExpiry`; `DcSource` extended with `weapon_attack_dc`; `Condition` narrow atlas (`prone`); `MasteryUsageLimit` (`once_per_turn`). Tracer emits `mastery_root` → `attack_roll` → `on_hit_window` with proper `branches_on_save` edges. Pressure cases: Sap, Topple, Cleave.
- **Widening 3 — Anchored-trigger (hunt §4.2)** — new `anchored_trigger` SpellMechanics family; `AnchorTarget` (`location` / `area(cube)`); closed `AnchoredEvent` (`physical_contact` / `enters_area`); closed `AnchoredFilter` (`creature_exemption_list`); `AnchoredSignal` (audible / mental) folded into the release node's label, never emitted as non-v4 atoms; `CastingTime.minutes { amount; ritual }` for long-cast / ritual spells. Tracer emits `store` / `release` procedures, `post_action_window` for each event, and keeps the atom inventory strictly v4. Pressure case: Alarm.

### Axis × shape coverage (scaling)

| axis × shape | exercised by | status |
| --- | --- | --- |
| `character` × `threshold_tiers` | Acid Splash | ✓ |
| `slot` × `linear_per_level` | Ice Knife (cold dice) | ✓ |
| `slot` × `linear` target count (Bless-style) | Bless | ✓ (legacy `scale_target_count`) |
| `class` × `threshold_tiers` (use count) | Action Surge, Second Wind | ✓ |
| `class` × `linear_per_level` (flat addend) | Second Wind (heal +Fighter level) | ✓ |
| `slot` × `threshold_tiers` | — | no SRD pressure |
| `character` × `linear_per_level` | — | no SRD pressure |

### Encoded units (11)

| Slug | Kind | Family | Surface exercise |
| --- | --- | --- | --- |
| `bless` | spell | ongoing_effect | concentration, target scaling by slot |
| `acid_splash` | spell | activation | cantrip character-level threshold tiers, AoE sphere, save_gate |
| `ice_knife` | spell | activation | 2 phases (attack + AoE save), `on_primary_target` origin, `branches_on_completion` between phases, slot-linear cold damage |
| `action_surge` | class_feature | activation | class_level_tiers on use_count (L2/L17), restrict_action_set |
| `fighter_second_wind` | class_feature | activation | bonus_action quota, class_level_tiers use_count (L1/L4/L10), partial_short_full_long reset, heal_hp with linear_per_level flat addend |
| `shield` | spell | triggered_reaction | Subgraph A (Prepare/Prompt/Commit), reaction trigger grammar, interrupt_resolution, modify_ac, negate_named_effect |
| `hunters_mark` | spell | ongoing_effect | `mark` attachment + `MarkTransfer`; `damage_on_hit` operation opens `on_hit_window` granting 1d6 Force damage; `bonus_action` casting time |
| `mastery_sap` | mastery | on_hit_trigger | `modify_roll_advantage` rider with `target_uses_or_turn_start` expiry |
| `mastery_topple` | mastery | on_hit_trigger | `save_gate` rider with `weapon_attack_dc`, `branches_on_save` → `apply_condition(prone)` |
| `mastery_cleave` | mastery | on_hit_trigger | `grant_weapon_attack` rider with adjacent-secondary target + `once_per_turn` use fence |
| `alarm` | spell | anchored_trigger | `store` / `release` pair; `area(cube ≤ 20 ft)` anchor; `post_action_window` × 2 (physical_contact, enters_area); filters + signals folded into release label; ritual 1-minute cast |

All typecheck clean. Traces under `packages/prototype-content-surface/content/<slug>.trace.md` (gitignored). Surface types in `src/surface/types.ts`; tracer in `src/interpreter/tracer.ts`.

### Survey data

- `scripts/content-surface-survey/survey-results-srd.jsonl` — 28 Tier 0+1 units classified (pre-Option-B).
- `scripts/content-surface-survey/REPORT_SRD.md` — aggregated report. Verdict: Option B (9 class_level_tiers + 3 linear_per_level, new axes forced).
- Harness bugs identified during run: result.json race between parallel workers (result: ~4 suspect `clean` verdicts where claude self-report got clobbered); monitor-tool phantom events (cosmetic). Harness works but needs per-worker workspaces before a Tier 2 at scale.

## Candidates 1–4 — status

### 1. Mark/Transfer subgraph — Hunter's Mark ✅ DELIVERED

**Scope.** Small. `mark_target` / `transfer_mark` effects, `mark` attachment (v4), `transfers_to` edge.

**Result.** `hunters_mark.json` re-encoded as `ongoing_effect` with `mark` attachment + `MarkTransfer` + `damage_on_hit` operation; previous encoding mis-modeled the 1d6 Force as a generic `roll_modifier on attack_roll`. Trace now shows the mark attachment with its transfer rule, a `mark_target` effect, a `transfer_mark` effect with `transfers_to` edge, and an `on_hit_window` hosting the damage rider. Harness-side validator verdict: `clean`.

### 2. On-Hit Rider subgraph — masteries (Sap, Topple, Cleave) ✅ DELIVERED

**Scope.** Medium. New `MasteryRecord` unit kind; `on_hit_trigger` family; rider effects `modify_roll_advantage`, `save_gate` (with attack-rooted DC), `grant_weapon_attack`; `apply_condition(prone)`; `weapon_attack_dc` DcSource variant.

**Result.** All three masteries trace green. Sap emits `modify_roll_advantage` attached to target with `persists_until turn_start_window`. Topple emits `save_gate` with `weapon_attack_dc`, branches_on_save to `apply_condition prone`. Cleave emits a nested `attack_roll` against the adjacent secondary target with `once_per_turn` use-count fence. Harness-side validator verdict: `clean` on all three.

### 3. Anchored-trigger grammar — Alarm ✅ DELIVERED

**Scope.** Large. New `anchored_trigger` payload family; closed anchor/event/filter grammar; `CastingTime.minutes` with ritual flag.

**Result.** Alarm traces via `store` + `release` procedures. Anchor modeled as `area` (cube ≤ 20 ft) with `post_action_window` nodes for each event. Filters and signals are folded into the release node's label rather than emitted as nodes, so the atom inventory stays strictly v4 (per ARCHITECTURE.md: notification surfaces are caller-owned). Harness-side validator verdict: `clean`. Glyph of Warding, Contingency remain as later pressure cases.

### 4. Re-run Tier 1 survey against the widened surface — HARNESS-SIDE ✅ / CLAUDE-SIDE DEFERRED

**Harness side** — ran the validator directly on the four new/updated units (`hunters_mark`, `mastery_sap`, `mastery_topple`, `mastery_cleave`, `alarm`) plus baseline `bless`. All six return `verdict: clean` with 0 unknown atoms and 0 unknown relations.

**Claude side** — still blocked on the harness debt documented below. The Claude-driven re-dispatch would confirm semantic cleanliness (not just structural) but requires the following fixes first:

- Per-worker prototype dir (avoid `result.json` race between parallel workers).
- Worker timeout (kill hung claude CLIs).
- Stop using Monitor tool for completion (use blocking `until grep` via `run_in_background`).

**Expected delta against last full run** (`REPORT_SRD.md`, 28 units):

- `anchored_trigger_family`, `extended_casting_time`, `ritual_casting`, `notify_caster_effect` proposals (Alarm / Counterspell / Death Ward) are now absorbed by the new family for Alarm's shape. Counterspell remains a triggered_reaction (already clean); Death Ward's HP-intercept widening (§4.4) is still open.
- `on_hit_trigger mechanics family` and `MasteryRecord + mastery unit kind` proposals (Sap, Cleave) now absorbed. `apply_condition_effect` (Topple) ships with the mastery widening.
- `bonus_action_activation` proposals (Bardic Inspiration, Second Wind already OK, Monk Focus Points, Lay on Hands) — Hunter's Mark pressured the `bonus_action` CastingTime variant which is now in place. The class-feature side already had `ClassFeatureActivationCost.bonus_action`; no further change needed from this batch.

The remaining dominant widening is `class_level_tiers` (8 units) — already addressed by the Option B scaling unification in Stage 2; the next Claude-side run should reclassify those units as clean.

## Recommended next order

1–3 done. 4 done on the harness side. Continue with:

- **A. Scan more SRD features** — the user flagged this as the next activity after 1–4. Open candidates with the widened surface: Hunter's Mark→clean, anchored-trigger pressure on Glyph of Warding / Contingency, mastery coverage for Graze (on-miss) and Vex (advantage rider with end_of_next_turn expiry), Death Ward (HP intercept §4.4), Polymorph (stat-block projection §4.1). Each is a fresh red/green cycle.
- **B. Fix the harness debt** before the Claude-side tier 1 re-run — per-worker dirs, worker timeout, remove Monitor-tool reliance.
- **C. Clean up pre-existing RED content** — `fireball.json`, `fire_bolt.json`, `eldritch_blast.json`, `magic_missile.json`, `protection_from_energy.json`, `halfling_luck.json`, `fighter_extra_attack.json`, `fighter_indomitable.json`, `monk_martial_arts.json`, `shillelagh.json` were authored against stale surface shapes and don't trace today. Each one represents either another widening event or a shape drift that needs re-encoding.

## How to resume in a fresh session

```sh
# Locate this plan
cat plans/CONTENT_SURFACE_PROTOTYPE.md

# See encoded units
ls packages/prototype-content-surface/content/*.json

# Regenerate a trace
pnpm --filter @dnd/prototype-content-surface exec tsx src/run.ts content/<slug>.json --out content/<slug>.trace.md

# Typecheck everything
pnpm --filter @dnd/prototype-content-surface typecheck

# See the aggregated survey report (last-computed)
cat scripts/content-surface-survey/REPORT_SRD.md

# View a mermaid graph — any markdown renderer that supports mermaid
cat packages/prototype-content-surface/content/shield.trace.md
```

The surface types file (`src/surface/types.ts`) and tracer (`src/interpreter/tracer.ts`) are the two files that carry the state.
