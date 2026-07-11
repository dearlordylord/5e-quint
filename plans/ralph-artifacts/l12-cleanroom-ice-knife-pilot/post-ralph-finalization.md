# Post-Ralph Ice Knife finalization

After Task 4 and its source review land on the final clean output branch,
regenerate the authoritative fresh-target catalog from that commit:

```sh
pnpm cleanroom:export:l12-ice-knife -- --finalize \
  --scope plans/ralph-artifacts/l12-cleanroom-ice-knife-pilot/unit-readiness-scope.json \
  --profile plans/cleanroom-scaffolds/target-profiles/rust.json \
  --output /workspace/typescript/dnd-cleanroom-ice-knife-final
```

The export command refuses a non-ready Unit, dirty allowlisted inputs, stale
QNT closure, or a mismatched calibration. The output directory is the only
input to the fresh target `/goal`; do not add source TypeScript, calibration
artifacts, Surface records, or source planning files before launch.

The target returns its external receipt and retained evidence to source intake.
The target does not classify the source result.

After the receipt returns, derive the next transition and run source intake and
measurement with the commands in
`plans/ralph-artifacts/l12-cleanroom-ice-knife-pilot/real-experiment-handoff.md`.
That handoff also contains the fresh source-review prompt. Synthetic receipts
exercise only the intake parser; they do not claim target success.
