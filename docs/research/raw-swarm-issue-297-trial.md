# Raw Swarm issue #297 trial report

Trial date: 2026-08-21. This report records the bounded Campaigns, retained
generation/authoring/execution evidence, and terminal workflow obstructions for
issue #297. The ignored `scripts/raw-swarm/out` files remain the evidence
authorities; this document records their paths and hashes without copying their
payloads. The report is routed to `docs/research/` under `CONTEXT-MAP.md`.

## Protocol and scope

The known-gap Campaign explicitly named open issue #279: per-test Table
circumstance Advantage/Disadvantage across the exact D20 Test. Its rules
authority was the local RAW `Playing-the-Game.md` Advantage/Disadvantage
passage, with `availableOnly` content and
`probeUnsupportedCapability` SDK intent. The rest of the requested interaction
was kept representable. The open-ended Campaign used `supportedOnly` intent,
bounded variation, and a request for material difference from the complete
admitted catalogue; no diversity claim is based on randomness.

All model-generated Scenarios, characters, setup, and player attempts were
created by the canonical scripts. No Scenario result was hand-authored to force
admission. Both player runs used instructional isolation, unique Execution and
Evidence Set IDs, and the same admitted Scenario ID. No GitHub issue state was
changed during evidence production. The confirmed runner identity defect was
subsequently published as follow-up issue #315 after a focused regression and
repair were available.

## Campaign dispositions

| Campaign                                            | Planned Scenario                                      | Intent                                         |                             Generation ledger | Disposition                                                                                                                             |
| --------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------- | --------------------------------------------: | --------------------------------------------------------------------------------------------------------------------------------------- |
| `table-d20-circumstance-gap-authoring`              | `table-d20-circumstance-advantage-probe`              | `availableOnly` + `probeUnsupportedCapability` | 3 generation, 14 candidate-review invocations | Candidate reached admission finalization, then publication failed with destination-parent `ENOENT`; no admitted Scenario was published. |
| `table-d20-circumstance-gap-authoring-retry`        | `table-d20-circumstance-advantage-probe-retry`        | `availableOnly` + `probeUnsupportedCapability` |                                          None | Interrupted before generation; only its unique Campaign manifest is retained.                                                           |
| `table-d20-circumstance-gap-authoring-repair-retry` | `table-d20-circumstance-advantage-probe-repair-retry` | `availableOnly` + `probeUnsupportedCapability` | 3 generation, 14 candidate-review invocations | Admitted after the publication repair. Character Sheets were correctly skipped; setup retained the honest #279 obstruction.             |
| `open-ended-lantern-intercept-authoring`            | `lantern-intercept-pairwise-control`                  | `availableOnly` + `supportedOnly`              | 2 generation, 10 candidate-review invocations | Admitted as materially distinct from the complete predecessor catalogue. Character Sheets were skipped; setup was ready.                |

The initial failed Campaign, interrupted retry, and all generation candidate
revisions remain under their distinct Evidence Set directories. The retry was
not overwritten or presented as a successful run.

## Complete-catalogue comparisons

Before the repaired known-gap admission, the complete predecessor catalogue was:

```text
four-way-crank-control-cycle
goblin-warrior-skeleton-tracer
mounted-dispatch-through-flooded-orchard
open-grid-wolf-skeleton-pursuit
orc-fighter-rogue-close-interception
sand-band-four-skeleton-skirmish
synthetic-beacon-eight-round-defense
table-authored-shove-then-grapple
table-authored-three-shove-cycle
two-goblins-pursue-skeleton
```

`table-d20-circumstance-advantage-probe-repair-retry` compared all 10 IDs and
was admitted with `purposefulOverlap`. Its closest match was
`open-grid-wolf-skeleton-pursuit`; the material difference was the Riding
Horse/Wolf chase and one exact Table-imposed Disadvantage on the Wolf's first
Bite D20 Test, while movement, targeting, Bite, Hooves, ordinary attack, and
damage remained the surrounding representable interaction.

The open-ended Scenario compared all 11 IDs, adding the repaired known-gap
Scenario to the list:

```text
four-way-crank-control-cycle
goblin-warrior-skeleton-tracer
mounted-dispatch-through-flooded-orchard
open-grid-wolf-skeleton-pursuit
orc-fighter-rogue-close-interception
sand-band-four-skeleton-skirmish
synthetic-beacon-eight-round-defense
table-authored-shove-then-grapple
table-authored-three-shove-cycle
table-d20-circumstance-advantage-probe-repair-retry
two-goblins-pursue-skeleton
```

Its comparison conclusion was `meaningfullyDistinct`. The closest matches were
`two-goblins-pursue-skeleton`, `open-grid-wolf-skeleton-pursuit`,
`mounted-dispatch-through-flooded-orchard`, and
`four-way-crank-control-cycle`. The admitted interaction instead combines an
asymmetric Wolf/Skeleton/Hawk hostility graph, a north-wall-to-south-wall
Hawk traversal, interruption-sensitive target triage, and four pillar-derived
visibility/cover routes. The review explains each closest match and difference
and retains complete dimension evidence in the Scenario review authority.

## Publication repair and regression

The first Campaign's terminal error was:

```text
ENOENT: no such file or directory, rename <staged findings.json> -> scripts/raw-swarm/out/<evidence-set>/evidence/findings.json
```

The staged source existed. The destination parent did not. The publication
catch path then created `evidence/` while writing failure findings, which made
the late failure look like a source problem. The repaired implementation uses
one named `preparePublicationDestinationParents` operation for both admission
and rejection bundle publishers. It runs only after overwrite preflight and
before the atomic rename sequence, preserving authority and rollback rules.
Focused coverage exercises absent `evidence/` parents and rollback for both
publishers: `pnpm exec vitest run scripts/raw-swarm/scenario-campaign.test.ts`
passed 21/21.

Relevant clean revisions are:

| Commit      | Boundary                                                                                        |
| ----------- | ----------------------------------------------------------------------------------------------- |
| `1d186f8f2` | Initial unique known-gap/open-ended configs.                                                    |
| `0e1d1ca76` | Superseded diagnostic staged-findings attempt; retained in history and not treated as a repair. |
| `bc1b75948` | Unique interrupted known-gap retry config.                                                      |
| `8c6d57eb5` | Semantic destination-parent repair and admission/rejection regression.                          |
| `2f8ad14f7` | Unique post-repair known-gap retry config.                                                      |
| `1c2ea835e` | Repaired known-gap admitted Scenario bundle.                                                    |
| `a8e421cb3` | Repaired known-gap character stage.                                                             |
| `a1e3e2293` | Repaired known-gap setup stage, honestly obstructed by #279.                                    |
| `5b1bfd60a` | Open-ended admitted Scenario bundle.                                                            |
| `85e29fbc7` | Open-ended character stage.                                                                     |
| `85c94d472` | Open-ended ready setup stage.                                                                   |

## Authoring and Execution outcomes

### Repaired known-gap Scenario

Scenario `table-d20-circumstance-advantage-probe-repair-retry` was admitted;
the generated review records supplied RAW, explicit unsupported-probe SDK
intent, safe policy, ready quality, and the complete 10-ID comparison. The
canonical character command retained a zero-sheet source. The canonical setup
command retained an `obstructed` result because the public setup surface cannot
apply the Table's circumstance Disadvantage to exactly the Wolf's first Bite
attack-roll D20 Test. It does not invent a witness or silently drop the issue
#279 ruling.

Two independent executions were attempted from the clean setup revision:

| Execution / Evidence Set                                                                       | Outcome                                                                                           | Replay / review / ingest                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `table-d20-circumstance-advantage-probe-repair-retry-execution-a` / `...-execution-a-evidence` | Setup-obstructed, call-free diagnostic; setup identifies issue #279 and the exact Wolf Bite test. | Replay failed because `replay-supervisor.mjs` was not retained; independent review failed for the same unreadable artifact; ingest failed with execution-start/transcript identity mismatch. |
| `table-d20-circumstance-advantage-probe-repair-retry-execution-b` / `...-execution-b-evidence` | Same independent setup obstruction and call-free diagnostic.                                      | Same three canonical workflow attempts and same confirmed obstruction.                                                                                                                       |

The runner emitted a second deterministic SDK defect after each setup
obstruction: `run-sdk-player.ts` wrote the authority timestamp before starting
the supervisor, while `supervisor-cli.ts` independently wrote a later
transcript timestamp. Findings therefore rejected the transcript identity, and
the `finally` sequence did not reach replay-supervisor retention. This is
reported as a terminal runner obstruction, not as evidence that the #279 setup
capability is supported.

The four historical Evidence Sets remain immutable and obstructed. The boundary
was repaired after the trial in commit `a62b9cde8`: the runner now validates one
timestamp and passes it through supervisor initialization. A real CLI/handoff
regression proves execution-start/transcript identity equality, findings
checkpoint creation, replay-supervisor retention, and malformed timestamp
rejection. Follow-up issue #315 links the confirmed defect to issue #297.

### Open-ended Scenario

Scenario `lantern-intercept-pairwise-control` was admitted with
`meaningfullyDistinct` complete-catalogue comparison. Its canonical character
source has no Character Sheets; its setup is `ready` with Wolf, Skeleton, and
Hawk stat-block creatures, geometry-derived 60-by-50-foot crypt placement,
four pillar boundaries, and surfaced opportunity-attack relationships.

| Execution / Evidence Set                                                      | Outcome                                                                                                                                                                                                                       | Replay / review / ingest                                                                                                            |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `lantern-intercept-pairwise-control-execution-a` / `...-execution-a-evidence` | Player concluded at continuation 2 after the surfaced Wolf Move was rejected because dim-light Opportunity Attack route projection currently supports bright-light encounters only; the Wolf used surfaced Dodge as fallback. | Replay, independent review, and ingest/index were attempted and blocked by missing replay supervisor / execution identity mismatch. |
| `lantern-intercept-pairwise-control-execution-b` / `...-execution-b-evidence` | Player concluded at continuation 19. Hawk and Wolf reached 0 HP; Skeleton remained at 13 HP with 17 arrows.                                                                                                                   | Replay, independent review, and ingest/index were attempted and blocked by the same runner finalization defects.                    |

The A and B player programs, observations, final outcomes, model event logs,
and SDK transcripts are retained. The player conclusions are concrete state
observations; they are not claims of RAW victory or proof of catalogue
diversity.

## SDK, agent, and Scenario conclusions

- The publication boundary defect was reproduced at the actual admission path,
  repaired, and covered for both admission and rejection publishers.
- The #279 per-test Table circumstance Advantage/Disadvantage capability remains
  honestly unsupported by the public setup surface. The known-gap Scenario is
  useful as a diagnostic probe, not as a supported-only result.
- Open-ended setup construction is representable. Execution A observed a
  dim-light Opportunity Attack route-projection limitation, but post-play
  review could not run; this remains an ambiguous observation rather than a
  promoted SDK defect.
- Both independent model players reached canonical terminal conclusions and
  preserved their accepted SDK traces. Post-play review/replay/index could not
  be completed because runner identity finalization failed before supervisor
  retention; no finding was fabricated to conceal that obstruction.
- Confirmed publication and runner-identity defects have focused deterministic
  regressions. Runner identity follow-up issue #315 is linked to #297. The
  dim-light observation is not promoted without the independent review that the
  historical identity obstruction prevented.

## 2026-08-21 day campaign continuation

The continuation ran serially from the clean branch
`codex/raw-swarm-day-campaign-20260821`, based on `master` revision
`58a69b01b73e812dd66314cc3c0dd1dd6bc3b90f`. It reused the preserved
schema-v3 issue-297 index explicitly; the checkout's unrelated schema-v2
`player-swarm.db` was not overwritten. Ignored Evidence Sets remain local-only.

### Scenario Campaign dispositions

| Campaign                                            | Planned Scenario                            | Disposition                                                                                                                                                                                        |
| --------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `day-synthetic-watchfire-authoring`                 | `synthetic-watchfire-saving-throw-crossing` | Rejection publication reached the wrong schema-v2 index and rolled back. The 17 invocation authorities remain; no Scenario or rejection bundle was published.                                      |
| `day-table-save-circumstance-authoring`             | `table-save-circumstance-advantage-probe`   | Admitted as an explicit unsupported-capability probe for #279; its setup later stopped first on missing Goblin arrow stock.                                                                        |
| `day-synthetic-condition-switchback-authoring`      | `synthetic-condition-switchback`            | Failed during final catalogue comparison because the model result did not retain exactly one named catalogue batch. No Scenario was admitted.                                                      |
| `day-synthetic-wake-interruption-authoring`         | `synthetic-wake-interruption`               | Admitted after three iterations. Two Executions retained deterministic evidence; review rejected the supported-only admission for its Large-reactor movement requirement.                          |
| `day-synthetic-vulnerability-exchange-authoring`    | `synthetic-vulnerability-exchange`          | Rejected: the generated Octopus could breathe only underwater, leaving sustained dry-ground suffocation/exhaustion unresolved.                                                                     |
| `day-synthetic-club-blade-vulnerability-authoring`  | `synthetic-club-blade-vulnerability`        | Rejected: Commoner exists in local RAW but is absent from the available-only shipped stat-block catalogue.                                                                                         |
| `day-synthetic-club-bearer-vulnerability-authoring` | `synthetic-club-bearer-vulnerability`       | Failed during catalogue comparison after a model child produced no new event for over an hour. Termination exposed contradictory success telemetry and a missing-output `ENOENT`, tracked by #331. |

The admitted catalogue grew from 12 to 14 Scenarios. The two new entries are
`table-save-circumstance-advantage-probe` and
`synthetic-wake-interruption`. Their later independent verdicts must accompany
selection: catalogue membership is not proof that setup reaches the intended
probe, that a supported-only admission was correct, or that an Execution was
scenario-faithful. Reviewer-loop demotion was rejected because retained later
Candidate comparisons bind to this exact predecessor catalogue; deleting an
entry would make those immutable relationship records invalid.

### Execution ledger

The continuation added six schema-v3 index rows and 62 deterministically
replayed SDK calls. Each imported review and final findings projection is owned
by its Evidence Set; this table is only the compact operator ledger.

| Row | Execution                                             | Calls | Replay                          |               Review | Final findings | Terminal observation                                                                                                                            |
| --: | ----------------------------------------------------- | ----: | ------------------------------- | -------------------: | -------------: | ----------------------------------------------------------------------------------------------------------------------------------------------- |
|   2 | `table-save-circumstance-advantage-probe-execution-a` |     0 | deterministic setup obstruction |           6 verdicts |              8 | Missing explicit Goblin arrow stock stopped setup before the intended #279 saving-throw probe.                                                  |
|   3 | `synthetic-wake-interruption-execution-a`             |    18 | matched                         |          12 verdicts |             24 | Player skipped the required Sting, submitted invalid routes, and encountered the geometry target-frontier recurrence linked to #329.            |
|   4 | `synthetic-wake-interruption-execution-b`             |     8 | matched                         |           9 verdicts |             15 | The required movement was rejected because Opportunity Attack route projection does not support the Large Riding Horse reactor.                 |
|   5 | `table-authored-three-shove-cycle-day-execution-a`    |    16 | matched                         |           7 verdicts |             24 | Three Shoves resolved in order; review found that the player preselected all three save outcomes rather than leaving them to normal resolution. |
|   6 | `table-authored-shove-then-grapple-day-execution-a`   |     0 | deterministic setup obstruction |           8 verdicts |             10 | Setup cannot register separate Table-authored Grapple reach witnesses for alternative future post-Shove fingerprints.                           |
|   7 | `four-way-crank-control-cycle-day-execution-a`        |    20 | matched                         | 8 verdicts, all pass |             20 | The required Shove, Grapple, Shove, Shove sequence completed with valid Table witnesses, turn order, DCs, conditions, and completion boundary.  |

The six reviews contributed 50 verdicts. The index after row 7 contains seven
Executions total, with verdict totals: 2 `adapter-defect`, 2
`corpus-ambiguity`, 39 `pass`, 6 `player-invalid`, 3 `reviewer-error`, 2
`scenario-invalid`, and 5 `unsupported-capability`.

### Promoted and deduplicated findings

- Execution row 3 reproduced the geometry-derived melee target-frontier
  defect already tracked by #329. Its new fingerprint was linked to that issue
  rather than opening a duplicate.
- #330 records that final findings cannot retain a genuine milestone replay
  envelope when later generation revises the Candidate before admission. The
  complete Executions remain trustworthy without those optional replay
  authorities.
- #331 records the stalled-model termination boundary: the ledger labeled an
  output-less terminated invocation successful while the Campaign failed on
  the absent last-message file.
- No other review produced an unlinked bug or adapter-defect fingerprint.

The strongest supported-path evidence is row 7: deterministic replay and all
eight independent verdicts passed. Rows 2, 4, and 6 preserve unsupported or
invalid admission boundaries without fabrication. Rows 3 and 5 additionally
show that an accepted player conclusion is not proof of scenario-faithful
play.

## Retained ignored evidence inventory

The following ignored authorities are retained under `scripts/raw-swarm/out`.
Hashes are SHA-256 of the exact files at this checkout. Files not listed inside
each directory remain retained as immutable generation/event/player evidence;
the directory file counts are included to make omissions visible.

### Campaign authorities

| Path                                                                                                            | SHA-256                                                            |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `scripts/raw-swarm/out/table-d20-circumstance-gap-authoring-evidence/campaign.json`                             | `b7ad216dcae3233e15065547a6857a808f08194960a898f54558a941eabe7f44` |
| `scripts/raw-swarm/out/table-d20-circumstance-gap-authoring-evidence/evidence/findings.json`                    | `faf3c9412279b2c4d149f9d64425f3777ea953dd77846998a7ce947b51f54307` |
| `scripts/raw-swarm/out/table-d20-circumstance-gap-authoring-evidence/generation-invocations.jsonl`              | `1d1623219b0594822bddd2420984cee51be26e3fc413bcf64bb971b7cefaab10` |
| `scripts/raw-swarm/out/table-d20-circumstance-gap-authoring-retry-evidence/campaign.json`                       | `8db02360c1ac4b791852f9f484bcb1356231095f879fad01792105ba64d21027` |
| `scripts/raw-swarm/out/table-d20-circumstance-gap-authoring-repair-retry-evidence/campaign.json`                | `a8da6f68683466a77cf83d96dbb7074f09a043830bab4312a9e57e1f965f7666` |
| `scripts/raw-swarm/out/table-d20-circumstance-gap-authoring-repair-retry-evidence/evidence/findings.json`       | `15f9cce9a2665610bacb71333a3e266b9d2b6779f6144420c718f5530a5dac65` |
| `scripts/raw-swarm/out/table-d20-circumstance-gap-authoring-repair-retry-evidence/generation-invocations.jsonl` | `e3a8f29388cb8a1d55c62acc2d418fd66d0edc6fc21c870a93e34a5699e02f45` |
| `scripts/raw-swarm/out/open-ended-lantern-intercept-authoring-evidence/campaign.json`                           | `dadbbf0f591716a6180102004931e762649016dfb37a6e1564bdae7deaf1d7c3` |
| `scripts/raw-swarm/out/open-ended-lantern-intercept-authoring-evidence/evidence/findings.json`                  | `38557e097284995e85aa1d60353635a8569fcafad6bdebb1166a62cf9b0b3cbb` |
| `scripts/raw-swarm/out/open-ended-lantern-intercept-authoring-evidence/generation-invocations.jsonl`            | `58562428949c8db928126d24033ec0e9eac7cec253aa04ea73e120028a755637` |

The campaign directories contain, respectively, 22, 1, 22, and 17 files.
The first Campaign's findings explicitly retain the publication `ENOENT`; the
interrupted retry's one-file directory is intentional.

### Execution authorities

| Evidence Set                                                               | `execution.json`                                                   | `execution-start.json`                                             | `sdk-calls.jsonl`                                                  | `final.json`                                                       |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `table-d20-circumstance-advantage-probe-repair-retry-execution-a-evidence` | `b2a9b917411400a14170a7d743a7a736e969a4ba4262ef116c1502fd865c2789` | `9a6be5dab50721992fbf90805a7b5abbc6ef3124986dbe833c07e7a91638c646` | `6ce0dff8fcdf9d991453f76e210b23bcda6db4898ad3fbae9df61590098fe194` | not produced: setup-obstructed, call-free                          |
| `table-d20-circumstance-advantage-probe-repair-retry-execution-b-evidence` | `c4497d993528812fb8159c3ed935c060d9071c1e238b6d102c409633b1398d24` | `a9fea2fa27667d604f992cc0a65dbc5000c3cf3b1a9ef1beaa658dd16beeb1d8` | `5876ae76da7a143a3495f304be234a53793f237db638d0118069e262f1616f29` | not produced: setup-obstructed, call-free                          |
| `lantern-intercept-pairwise-control-execution-a-evidence`                  | `cd86bd26e1d94b0ebed8c3457d7a7aa6f1db42701a34f4f656ce7104a2be2ec8` | `0d122d87bc54f6d4193e09ba36774a93fffa329ec11e2f39bc36346bfe4930be` | `c10edd65b1855cc9292a8284b830de277219c98239edb2f619f3be6f8ba79202` | `6605e1b6590283a9739b6745194339e25f55a6f7df7abe42412fd1eea32afcfa` |
| `lantern-intercept-pairwise-control-execution-b-evidence`                  | `6ea6c0e3646272bbce283b51568b6d77abfcf96904fae2dd9d161c4d62f4f5a3` | `005ecd20d9c0b45d4feb56f50519bb70f8982ed97a86ae576720b55d330c86be` | `4cf9e18f67f454b8f18e36c3299e8c0eb421fbe273ae4ddbb738bb52cb919f8b` | `879e21c8c10b5849d86d1245d5283d28b81f5f66307e9e05433cd137b4fa707f` |

Each execution directory contains 11 files for the known-gap runs and 21 for
each open-ended run. Replay-result, findings, review, and retained
`replay-supervisor.mjs` authorities are absent exactly where the terminal
runner obstruction prevented their creation; the failed canonical commands
and their errors are recorded above rather than replaced with synthetic files.
