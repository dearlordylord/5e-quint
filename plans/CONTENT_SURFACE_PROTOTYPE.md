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
