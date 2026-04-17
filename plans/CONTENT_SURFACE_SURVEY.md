# Content surface coverage survey — survey plan

Decision this survey exists to answer:

> **Option A or Option B for scaling-shape encoding in the content surface?**
>
> - **A** — add `class_level_tiers` variant to both `DiceAmount` and `UseCountCap` alongside existing `cantrip_tiers`, `slot_linear`, `fixed`. Minimal, per-atom widening.
> - **B** — unify all current scaling variants under a parameterized `ThresholdTiers<T>` / `LinearPerLevel<T>` with a `LevelAxis = "character" | "class" | "spell_slot" | "proficiency_bonus"`. Bigger refactor; deletes `cantrip_tiers` and `slot_linear` as variants (they become instances).

Existing sub-agent spot-survey (~30 SRD units, inline in the prior turn) found:

- 13+ cantrips = `cantrip_tiers` shape (uniform L1/5/11/17 thresholds).
- 12+ class features = `class_level_tiers` shape (irregular thresholds: L2/L17, L5/L11/L20, every odd L1–L19 for Sneak Attack, etc.).
- 2 features = `linear_per_level` shape (Focus Points, Lay On Hands).
- 0 SRD units use `pb_linked` scaling.
- 1 unit (Eldritch Blast) scales ATTACK COUNT, not dice count — may be its own sub-variant.
- 1 unit (Shillelagh) has non-monotonic die-size progression — novel.

That spot-survey was a manual pass over ~30 units sampled for variety. Insufficient to choose between A and B with full corpus coverage. This survey extends it to the full SRD (and a targeted PHB sample) via parallel Claude instances, automatically validated.

## What the survey produces

1. A per-unit dataset: for every unit attempted, the outcome, atoms referenced, relations referenced, proposed widenings, confidence.
2. An aggregation report: atom/widening frequency distributions, outcome distribution by source root (spell vs class feature vs feat vs species trait vs mastery vs magic item).
3. A decision: A vs B, with the evidence that forced it. If a THIRD shape emerges that neither A nor B cover, we've found structural dishonesty and have to redesign.

## Scope and tiering

**Corpus source:** SRD 5.2.1 corpus in `.references/srd-5.2.1/` + XPHB JSON at `.references/5etools-src/data/spells/spells-xphb.json` and sibling files. 5etools `srd52: true` flag is the provenance gate for SRD-shippable vs PHB-only-research.

**Tiered execution:**

- **Tier 0 (MVP, 5 units, manual):** sanity-check the harness end-to-end on pre-picked units with known shape: Fire Bolt (cantrip_tiers), Sneak Attack (class_level_tiers, 10-tier), Focus Points (linear_per_level), Lay On Hands (linear, pool), Rage (multiple scaling axes, extend-by-activity).
- **Tier 1 (strategic, ~30 units, automated):** one unit per research-predicted shape variant, plus outliers (Eldritch Blast's attack count, Shillelagh's non-monotonic die size, Magic Missile's auto-hit multi-projectile). Confirms A vs B decision might already be reachable.
- **Tier 2 (full SRD, ~500 units, automated):** all SRD spells + class features + feats + species traits + masteries + magic items. Locks A vs B.
- **Tier 3 (PHB-only sample, ~50 units, automated):** Lucky feat, Hellish Rebuke, Silvery Barbs, Battle Master Maneuvers, Wild Magic Surge, Deck of Many Things — widening-pressure exploration only. These don't ship but they influence the atom-set shape.

Each tier gates the next: Tier 0 must pass before Tier 1 runs; Tier 1 must classify N>20 units without harness bugs before Tier 2; Tier 2 should converge before Tier 3.

## Per-unit pipeline

For each unit:

1. **Worktree setup.** Harness creates a disposable git worktree from `master`, cwd at `packages/prototype-content-surface/`. Each unit gets its own worktree so parallel instances don't fight over files.
2. **Context injection.** Harness writes a prompt file referencing:
   - The unit's SRD text extract (or 5etools JSON entry for XPHB)
   - The current `src/surface/types.ts` (full text)
   - The current `src/interpreter/tracer.ts` (full text, for grounding — NOT for modification)
   - The v4 atom/relation whitelist (extracted from `.references/xphb-srd-pairing/TAXONOMY_atoms_graph.md` and `TAXONOMY_graph_representation.md`)
   - UBIQUITOUS_LANGUAGE.md pointer for naming discipline
3. **Claude run.** `claude` CLI invoked with `--model sonnet` (likely cheap enough for Tier 2/3 volume; Opus for Tier 0/1). The prompt instructs:
   - Produce `content/<slug>.json` matching `UnitRecord`.
   - Do NOT modify `src/surface/types.ts`, `src/interpreter/tracer.ts`, or any file outside `content/`. If encoding requires new variants, describe them in `proposal.md` instead.
   - Run `pnpm typecheck` and `pnpm exec tsx src/run.ts content/<slug>.json` to self-verify. Re-attempt if either fails.
   - Write a machine-readable `result.json` with the self-classification (see schema below).
4. **Harness validation** (this is where we DO NOT trust Claude). See §Validation below.
5. **Dataset row emitted** to `survey-results.jsonl` (append-only).

## Prompt template (sketch)

`scripts/content-surface-survey/prompt-template.md` — one file, substituted per unit with `{{UNIT_NAME}}`, `{{UNIT_TEXT}}`, `{{UNIT_SLUG}}`, `{{PROVENANCE}}`.

Core instructions:

```
You are encoding ONE unit into the content surface prototype. Do NOT
modify the surface types. Do NOT modify the tracer. Your only write
target is content/{{UNIT_SLUG}}.json and result.json.

## Unit to encode

Name: {{UNIT_NAME}}
Provenance: {{PROVENANCE}}   (srd-5.2.1 or xphb)
Source text:

{{UNIT_TEXT}}

## Current surface types

[full text of src/surface/types.ts]

## v4 atom vocabulary (authoritative)

Atoms:
  source:     spell_root, feat_root, class_feature_root,
              subclass_feature_root, species_trait_root,
              background_trait_root, item_property_root,
              mastery_root, magic_item_root
  procedure:  activate, respond, prepare, prompt, commit, choose,
              grant, replace, store, release, suppress, restore,
              attune, refund
  ...
Relations: roots, opens_window, requires, attaches_to, stores,
           releases, grants, consumes, refunds, suppresses, replaces,
           modifies, persists_until, branches_on_completion,
           branches_on_save, prepares, prompts, commits, transfers_to,
           returns_to

## Stage 1/2 extensions already in the prototype

Surface-level additions on top of v4 (do NOT question these, USE them):
- action_quota, bonus_action_quota, reaction_quota (Quota-shape
  resources from UBIQUITOUS_LANGUAGE §"Resource Consumption")
- concentration_lock (Lock-shape resource, ditto)
- SpellMechanicsHeader with castingTime, level, school, range,
  components, duration

## Task

1. Read the unit's source text. Read the surface types. Identify
   the payload family (ongoing_effect, activation, or the class
   feature form).
2. Produce content/{{UNIT_SLUG}}.json.
3. Run `pnpm typecheck`. If it fails, read the error, fix the JSON,
   re-run. Do NOT modify types.ts.
4. Run `pnpm exec tsx src/run.ts content/{{UNIT_SLUG}}.json`. If it
   throws "unhandled X", the surface lacks atom X for this unit —
   that is a REAL OUTCOME, not a failure. Do NOT invent X into the
   surface. Instead, record the missing atom in proposal.md.
5. Write result.json:

    {
      "unit_slug": "{{UNIT_SLUG}}",
      "outcome": "clean" | "surface_widening" | "atom_widening" |
                 "structural_widening" | "dm_agenda" | "refused",
      "atoms_used": [string, ...],    // from the mermaid trace
      "relations_used": [string, ...],
      "proposed_widenings": [
        { "kind": "new_atom" | "new_variant" | "new_relation" |
                  "new_subgraph",
          "name": string, "justification": string, "evidence": string }
      ],
      "confidence": "low" | "medium" | "high",
      "notes": string
    }

## Outcome classification

- "clean" — JSON typechecks, tracer runs with no proposals.
- "surface_widening" — a new VARIANT of an existing surface type was
  needed (e.g., a new CastingTime kind). Listed in
  proposed_widenings.
- "atom_widening" — a new ATOM from v4 or a new atom NOT in v4 is
  needed. Listed in proposed_widenings.
- "structural_widening" — the unit's shape doesn't fit any existing
  family; a new family or subgraph is forced.
- "dm_agenda" — the unit's core mechanic IS DM adjudication (Wish's
  Reshape Reality, etc.), per ARCHITECTURE.md.
- "refused" — you cannot encode this unit within the protocol.
  Explain in notes.

## Rules you must follow

- Only write to content/{{UNIT_SLUG}}.json, result.json, proposal.md.
  Don't touch src/surface/types.ts, src/interpreter/tracer.ts, or any
  .references/ file.
- DO NOT invent atoms into a JSON as if they existed in v4.
- DO NOT claim "clean" if the tracer threw.
- Describe widenings textually in proposal.md; don't implement them.

When self-classifying, be CONSERVATIVE. If you're not sure an atom
works, prefer "atom_widening" and describe the gap.
```

## Validation layer (harness, not claude)

Claude's `result.json` is a HINT, not a verdict. The harness independently validates via deterministic checks — sandbox enforcement is not needed (we're already running in a sandboxed session), and clear prompt instructions cover the guidance that "don't modify surface types" used to cover via git diff.

`scripts/content-surface-survey/validate.ts`:

1. **Schema check.** Run `tsc --noEmit` in the worktree. The surface's `UnitRecord` is the schema; JSON that doesn't match fails the check.
2. **Tracer run.** Invoke `tsx src/run.ts content/<slug>.json --out <slug>.trace.md`. Capture exit code, stdout, stderr.
3. **Atom whitelist check.** Parse the trace output for `atomKind` values. Cross-check against the v4 atom list + Stage 1/2 known extensions. Any value not in the union is flagged as `atom_widening` (regardless of what claude's result.json claims).
4. **Relation whitelist check.** Same as atoms but for edge relations.
5. **Self-report reconciliation.** Compare `result.json.atoms_used` against the trace output. Discrepancies flag the unit for manual review.
6. **Emit dataset row** (to the provenance-correct results file; see §Provenance routing below):

```
{
  "unit_slug": "...",
  "unit_name": "...",
  "source": "srd-5.2.1|xphb",
  "anchor": "...",
  "verdict": "clean|surface_widening|atom_widening|structural|dm_agenda|invalid|drift",
  "harness_atoms": [...],
  "harness_relations": [...],
  "claude_self_verdict": "...",
  "claude_proposed_widenings": [...],
  "claude_confidence": "...",
  "discrepancies": [...],
  "typecheck_exit": 0|n,
  "tracer_exit": 0|n,
  "worker_id": "...",
  "wall_seconds": n,
}
```

The harness `verdict` is authoritative; `claude_self_verdict` is a comparison point.

## Provenance routing — PHB content NEVER enters the main repo

Hard rule: the main repo is SRD-shippable content only. Any PHB-only unit (where 5etools `srd52` is false, or the unit doesn't appear in `.references/srd-5.2.1/`) must keep its artifacts inside the research repo at `.references/xphb-srd-pairing/` (which has its own git and is gitignored from the main repo's perspective).

Concrete split:

| Artifact | SRD unit | PHB-only unit |
| --- | --- | --- |
| `content/<slug>.json` (encoded mechanics) | `packages/prototype-content-surface/content/<slug>.json` (main repo) | `.references/xphb-srd-pairing/phb-survey/content/<slug>.json` |
| `<slug>.trace.md` (mermaid dependency graph) | colocated with JSON in main repo | colocated with JSON in research repo |
| `result.json` + `proposal.md` (claude self-report) | `scripts/content-surface-survey/results-srd/<slug>/` | `.references/xphb-srd-pairing/phb-survey/results/<slug>/` |
| Dataset row | appended to `scripts/content-surface-survey/survey-results-srd.jsonl` (main repo, committed per user request) | appended to `.references/xphb-srd-pairing/phb-survey/survey-results-phb.jsonl` (research repo only) |
| Aggregate report | `scripts/content-surface-survey/REPORT_SRD.md` | `.references/xphb-srd-pairing/phb-survey/REPORT_PHB.md` |

Harness enforces routing at dispatch time, not after. The worker script reads the unit's `source` field from `unit-queue.jsonl`:

- `source: "srd-5.2.1"` → worktree cwd = main repo prototype package; all outputs under main repo paths.
- `source: "xphb"` (PHB-only) → worktree cwd = a copy of the prototype package placed under `.references/xphb-srd-pairing/phb-survey/workspace/`; all outputs under the research repo paths.

The prototype package itself (source code) is copied read-only to the research-repo workspace — the PHB worker uses the same surface types and tracer, but writes its derivative artifacts into the research repo's tree, never into the main one.

The unit text for PHB units is loaded at runtime from `.references/5etools-src/data/spells/spells-xphb.json` (in the research repo area already). It's never embedded into `unit-queue.jsonl` directly — the queue only references the source path and JSON key.

Cross-check on every harness run: a final sweep does `grep -rL "source.*xphb"` on the main repo's scripts/survey/ and prototype/content/ trees to confirm no PHB strings leaked. If a match surfaces, the harness fails the run and points at the offending file.

## Concurrency model

Bash script `scripts/content-surface-survey/run-survey.sh`:

- Queue of units (line-delimited JSONL in `unit-queue.jsonl`, produced by `unit-catalog.ts`).
- Semaphore of N workers (default N=5). Implementation: flock(1) on N slot files, or `xargs -P N`, or simple background-wait loop.
- Each worker:
  1. Claims the next queue line (atomic).
  2. Creates a worktree: `git worktree add /tmp/survey/<slug> master`.
  3. Copies `unit-queue.jsonl` row to worktree as `unit.json`.
  4. Copies prompt template with substitutions.
  5. Invokes: `claude --model sonnet -p @prompt.md --output-format json > claude-out.json` (matching `.ralphrc` conventions).
  6. Runs `validate.ts` against the worktree.
  7. Appends dataset row to `survey-results.jsonl` (shared, flock-guarded).
  8. Removes the worktree (`--keep-worktrees` flag for debugging).
- Honors `.ralphrc` rate limit (`MAX_CALLS_PER_HOUR=100`). Worker sleeps if over.
- Checkpoint-resumable: re-running the script skips units already in `survey-results.jsonl`.
- Circuit breaker: N consecutive `invalid` verdicts pauses the run for inspection (defeats runaway failures).

## Unit catalog construction

`scripts/content-surface-survey/unit-catalog.ts`:

- Parse `.references/5etools-src/data/spells/spells-phb.json` for SRD spells (filter `srd52===true`).
- Parse `.references/5etools-src/data/spells/spells-xphb.json` for XPHB — split by `srd52===true` (→ SRD provenance) vs false (→ xphb provenance).
- Parse `.references/srd-5.2.1/Classes/*.md` for class features: heading-level parse for "Level N:" entries.
- Parse `.references/srd-5.2.1/Feats.md` for SRD feats.
- Parse `.references/srd-5.2.1/Character-Origins.md` for species traits (grouped by species).
- Emit `unit-queue.jsonl` with `{slug, name, source, anchor, text}` rows.
- Slug convention: lowercase name, spaces → underscores, strip punctuation.

## Decision rubric — A vs B

After Tier 2 completes:

```
N_class_level_tiers = count(verdict includes class_level_tiers widening)
N_linear_per_level  = count(verdict includes linear_per_level widening)
N_new_axes          = count(verdict includes axis not in {character,class,slot})
N_novel_scaling     = count(verdict includes novel scaling shape)

A wins if:
  N_class_level_tiers > 0
  AND N_linear_per_level == 0
  AND N_new_axes == 0
  AND N_novel_scaling == 0

B wins if:
  N_class_level_tiers >= 3
  AND (N_linear_per_level >= 2  OR  N_new_axes >= 1  OR  N_novel_scaling >= 1)

Neither clear → tier 3 + manual review required.
```

In practice: if `linear_per_level` appears at all in SRD (Focus Points, Lay On Hands already indicate yes), B wins. The unified threshold shape handles both tier-based and linear-per-level with no duplication.

## Files to build

```
scripts/content-surface-survey/
├── run-survey.sh              orchestrator (bash, reads unit-queue.jsonl)
├── worker.sh                   per-unit invoker (bash; called by run-survey.sh)
├── prompt-template.md          claude input template
├── unit-catalog.ts             builds unit-queue.jsonl from corpus
├── validate.ts                 harness validator (runs in worktree)
├── aggregate.ts                builds report from survey-results-*.jsonl
├── atom-whitelist.ts           extracted v4 atom list + Stage 1/2 extensions
├── provenance-check.sh         final sweep: fails if PHB leaked to main repo
├── README.md                   how to run, how to read results
├── unit-queue.jsonl            input (main repo; PHB rows only reference
│                               XPHB JSON key, no PHB text inlined)
├── results-srd/                per-SRD-unit claude outputs (committed)
├── survey-results-srd.jsonl    SRD dataset rows (committed per user)
└── REPORT_SRD.md               SRD aggregate report

.references/xphb-srd-pairing/phb-survey/         (research repo only)
├── workspace/                  copy of prototype package for PHB worker
├── content/                    PHB JSON encodings
├── results/                    per-PHB-unit claude outputs
├── survey-results-phb.jsonl    PHB dataset rows
└── REPORT_PHB.md               PHB aggregate report
```

Build order if proceeding:

1. `unit-catalog.ts` + hand-test with one unit.
2. `atom-whitelist.ts` from the taxonomy source.
3. `validate.ts` + unit-test with a known-good JSON (Bless, already in prototype).
4. `prompt-template.md` + Tier 0 manual run (5 units, eyeball results).
5. `worker.sh` + `run-survey.sh` + Tier 0 automated run.
6. Tier 1 (30 units).
7. Decision checkpoint.

## Wall-clock estimate

Runs on a Claude subscription (not token-priced). Only constraints are per-call latency and the subscription's weekly usage quota.

Per-unit wall-clock: ~3-8 min (claude run + validation). First real run on Fire Bolt: 193 seconds, 15 turns.

- Tier 0 (5 units): ~15 min wall with 5 parallel.
- Tier 1 (~23 units): ~45 min wall.
- Tier 2 (~900 SRD units): ~10-12 hr wall with 5 parallel. Overnight-friendly.
- Tier 3 (69 PHB research units): ~2-3 hr.

Weekly subscription quota caps total effective session time (Max 5x ≈ 140-280 hr Sonnet/week). Tier 2 should fit; the CLI will refuse new calls if the weekly cap is reached, and the harness will pause.

## Risks

- **Claude invents atoms.** Harness catches via whitelist check.
- **Claude modifies files outside sandbox.** Harness catches via git diff check.
- **Tracer throws cleanly but claude rewrites JSON to paper over.** Harness emits trace-log; manual review flag set.
- **Classification drift between runs.** Deterministic inputs; if claude gives different verdicts for same unit twice, that's signal, not noise.
- **Rate limit.** Respect `.ralphrc` `MAX_CALLS_PER_HOUR=100`. 5 parallel × 4 runs/hour each = 20/hour, well under.
- **Worktree conflicts.** Each worker's worktree is isolated; no shared state.
- **Weekly quota exhaustion.** Subscription weekly cap applies. CLI self-refuses when reached; harness pauses until reset.

## Non-goals for this survey

- NOT implementing A or B. That comes AFTER the survey gives its verdict.
- NOT encoding PHB-only units into shippable content. Tier 3 outputs stay in the research dataset; they never flow into the main repo's content/ directory.
- NOT redesigning the surface types based on tier 1/2 results during the run. Freeze the surface before the run starts; any in-run widenings are DATA, not live changes.
- NOT covering monsters, adventure content, downtime activities, or non-mechanical text. Only mechanical rule units.

## Resolved decisions (locked)

Per user:

- Dataset files: **SRD results committed** in main repo (`survey-results-srd.jsonl`). **PHB results isolated** under `.references/xphb-srd-pairing/phb-survey/` (research repo only; never enters main repo).
- Model selection: **Opus for Tier 0–1 (~35 units), Sonnet for Tier 2–3 (bulk).**
- **Tier 3 runs in a separate phase** after Tier 2 converges; only if Tier 2 hasn't given a clear verdict.
- Early-stop: **Tier 2 halts if Tier 1 decisively resolves A vs B** (per the rubric). Otherwise full Tier 2.
- Build order: **catalog → validator → prompt → Tier 0 manual → Tier 0 automated → Tier 1 checkpoint → Tier 2**.
- **Sandboxing dropped.** Prompt instructions cover file boundaries; the session is already sandboxed.
- **PHB-in-main-repo = failure.** Dedicated provenance sweep (`provenance-check.sh`) runs before any Tier 2 commit; run aborts if any PHB string leaks into main repo paths.

## Appendix: v4 atom whitelist

Pulled from `.references/xphb-srd-pairing/TAXONOMY_atoms_graph.md` (v4) and `TAXONOMY_graph_representation.md` (v1). `atom-whitelist.ts` exports these as const arrays; the harness references them for validation.

- 9 source atoms
- 14 procedure atoms
- 11 attachment atoms
- 13 window atoms
- 7 resolution atoms
- 9 lifecycle atoms
- 4 resource atoms (v4; Stage 1 adds 3 quota atoms + 1 lock atom)
- 5 scaling atoms
- 37 effect atoms
- 20 relation types

Total: 129 atoms, 20 relations. Whitelist is the union of these + documented Stage 1/2 extensions.
