# Content surface coverage survey — historical record

**Status:** DONE. A-vs-B decision reached (**B wins** — parameterized `LevelAxis`). Overnight auto-close-loop session merged to master (commit `3bda25a2`). See `plans/CONTENT_SURFACE_NEXT.md` for the forward-looking resume point.

## Decision the survey answered

> **B** — unify scaling variants under parameterized `ThresholdTiers<T>` / `LinearPerLevel<T>` with a `LevelAxis = "character" | "class" | "spell_slot" | "proficiency_bonus" | "subclass" | "proficiency_bonus" | "ability_modifier"`. Deletes `cantrip_tiers` / `slot_linear` as separate variants.

**Evidence:** 11 `linear_per_level` proposals across SRD units, 2 new axes proposed, 3–4 novel shapes (verified by a cross-check agent against `survey-results-srd.jsonl` on 2026-04-18).

## What actually shipped

- `packages/surface/src/surface/types.ts` holds the B-shape `DiceAmount` (line ~369) and `UseCountCap` (line ~1845). Both use `LevelAxis` and the parameterized `ThresholdTiers<T>` / `LinearPerLevel<T>` generics.
- `scripts/content-surface-survey/` holds the mining pipeline: `unit-catalog.ts`, `run-survey.sh`, `worker.sh`, `close-loop.ts`, `auto-close-loop.ts`, `measure.sh`.
- Dataset: `scripts/content-surface-survey/survey-results-srd.jsonl` (1 row per unique slug; replaced on re-encode).
- 361 overnight batch commits landed in the 2026-04-18 merge.

## Corpus source

- **SRD 5.2.1** — `.references/srd-5.2.1/` (authoritative)
- **XPHB JSON** — `.references/5etools-src/data/spells/spells-xphb.json` and siblings (structured-data aid)
- `srd52: true` flag in XPHB is the provenance gate for SRD vs PHB-only.

## Verdict schema (in case of re-mining)

`scripts/content-surface-survey/results-srd/<slug>/{result.json,verdict.json,proposal.md}` per SRD slug. Verdicts: `clean`, `atom_widening`, `surface_widening`, `structural_widening`, `refused`, `invalid`, `dm_agenda`.

Weight for debt scoring: structural=4, atom=3, surface=2, clean=0, refused=1, invalid=2.

## What's NOT done and what to read for next steps

- Systemic staleness in the dataset means many `structural_widening` rows are obsolete (see `CONTENT_SURFACE_NEXT.md` for current re-mining plan).
- Widening design backlog and verification strategy are in `CONTENT_SURFACE_NEXT.md`.
- Tracked deferred modeling questions are in `CONTENT_SURFACE_DEFERRED.md`.
- Routing rule: SRD → main repo; PHB-only → `.references/xphb-srd-pairing/phb-survey/` (enforced by `provenance-check.sh`).
