# Ice Knife cleanroom handoff

This handoff is source orchestration only. It does not claim a real target result.

## Finalize the source export

```sh
pnpm cleanroom:export:l12-ice-knife -- --finalize \
  --scope plans/ralph-artifacts/l12-cleanroom-ice-knife-pilot/unit-readiness-scope.json \
  --profile plans/cleanroom-scaffolds/target-profiles/rust.json \
  --output /workspace/typescript/dnd-cleanroom-ice-knife-final
```

Export location: `/workspace/typescript/dnd-cleanroom-ice-knife-final`
Target launch prompt: `/workspace/typescript/dnd-cleanroom-ice-knife-final/target-goal.md`
Expected external receipt: `/workspace/typescript/dnd-cleanroom-ice-knife-final/target-receipt.json`

## Executable source-review procedure

The procedure accepts four positional parameters: `RECEIPT_PATH`, `TARGET_ROOT`, `EVIDENCE_ROOT`, and `CATALOG_ROOT`.

```sh
RECEIPT_PATH="${1:?path to returned target-receipt.json}"
TARGET_ROOT="${2:?path to target checkout at receipt finish}"
EVIDENCE_ROOT="${3:?path to retained target evidence}"
CATALOG_ROOT="${4:?path to finalized cleanroom export}"
RESULT_PATH="plans/ralph-artifacts/l12-cleanroom-ice-knife-pilot/intake-result.json"
MEASUREMENT_PATH="plans/ralph-artifacts/l12-cleanroom-ice-knife-pilot/measurement-report.json"
PROMPT_PATH="plans/ralph-artifacts/l12-cleanroom-ice-knife-pilot/source-review-prompt.md"

pnpm cleanroom:status:l12-ice-knife -- --catalog "$CATALOG_ROOT" --target-root "$TARGET_ROOT" --evidence-root "$EVIDENCE_ROOT" --receipt "$RECEIPT_PATH" --intake-result "$RESULT_PATH"
pnpm cleanroom:source-review:l12-ice-knife -- --catalog "$CATALOG_ROOT" --target-root "$TARGET_ROOT" --evidence-root "$EVIDENCE_ROOT" --receipt "$RECEIPT_PATH" --result "$RESULT_PATH" --measurement "$MEASUREMENT_PATH" --prompt "$PROMPT_PATH" --run-id l12-ice-knife-pilot-sol-restart-20260710T213037Z
codex exec --full-auto --cd "$PWD" < "$PROMPT_PATH"
```

After those commands, run at least two convergent reviewer rounds covering RAW/ubiquitous-language, QNT/branch/parity, architecture/connascence, contamination/freshness, and code review. Do not resume either implementation agent, launch another target, or treat synthetic receipts as cleanroom evidence. Compare `plans/RALPH_L12_CLEANROOM_ICE_KNIFE_PILOT.md` and `plans/RALPH_L12_CLEANROOM_GUIDANCE_GENERATOR.md` against `plans/L12_CLEANROOM_EXPERIMENT_CONTRACT.md`; shared-rule findings update the canonical contract once, while scaling or corpus findings update only the full plan. End with exactly one derived transition: target /goal, fresh source review, or full-plan revision.
