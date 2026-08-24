# Raw Swarm 48-hour operation

Status: prepared, not launched.

Accepted specification owner:
[`#332`](https://github.com/dearlordylord/5e-quint/issues/332).

This document is the accepted work-specific plan for one 48-hour Raw Swarm
operation. It does not define another Raw Swarm domain object or procedure.
Each authoring unit remains one Scenario Campaign, and the role procedures stay
owned by [`scripts/raw-swarm/README.md`](../scripts/raw-swarm/README.md).

## Objective and bounds

The operation will use the public SDK to author and execute materially distinct
Scenarios for 48 hours. It will retain replayable evidence, independently review
every completed Execution, and deduplicate confirmed defects through the
existing GitHub issue lifecycle.

- Begin with two calibration waves and adjust throughput from their measured
  completion time. Thirty to sixty completed Executions is a planning range,
  not an acceptance claim.
- Use three concurrent execution lanes. One current player invocation controls
  all combatants in one Execution; this operation does not claim true
  multi-controller battles.
- Stop new Scenario Campaigns three hours before the deadline. Use the remaining
  time to settle active work, replay, review, index, export, and summarize.
- Queue ordinary SDK and adapter defects until the operation ends. Repair only
  an evidence-integrity or infrastructure defect that makes later evidence
  untrustworthy or prevents the operation from continuing.

## Prepared boundary

- Preparation base: `56f3e1a0ba2f9c7484b8727904486294ab44cd88`
- Coordinator branch: `codex/raw-swarm-48h-campaign`
- Coordinator worktree:
  `/workspace/typescript/.codex-worktrees/dnd-raw-swarm-48h-campaign`
- Durable archive root:
  `/workspace/typescript/.codex-evidence/dnd-raw-swarm-48h`
- Live ignored evidence: `scripts/raw-swarm/out/` in the coordinator worktree
- Searchable index: `scripts/raw-swarm/out/player-swarm.db`

The launch timestamp supplies the operation directory name, Execution IDs, and
every identity in a launch-instantiated or later-wave Campaign configuration.
The checked-in first-wave configurations are immutable first-attempt inputs;
their identities may be used only after confirming that no matching Campaign,
Scenario, or Evidence Set exists. No identity in a failed or completed artifact
is reused.

## Roles and non-overlap

| Role                    | Ownership                                                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Coordinator             | Deadline, work assignment, Git integration, single SQLite writer, issue deduplication, archive checkpoints, and status reports.     |
| Scenario authoring      | One Scenario Campaign at a time against the complete canonical catalogue.                                                           |
| Execution lanes 1–3     | One distinct admitted Scenario and Evidence Set per lane at the wave's frozen Git revision.                                         |
| Post-play reviewer      | One immutable Execution transcript at a time through the canonical bounded review path.                                             |
| Remediation implementer | One defect and one dedicated worktree. Use Luna at maximum reasoning for substantial fixes.                                         |
| Review loop             | Use an independent Luna maximum-reasoning review, then an outer Sol review. Neither reviewer edits the implementation under review. |

The coordinator records ownership before delegation. Two agents must never
implement the same defect, edit the same Scenario authority, share an Execution
Evidence Set, or write the SQLite index concurrently.

## Wave protocol

One wave contains three Scenario Campaigns and up to three Executions.

1. Confirm a clean coordinator revision and render the complete canonical
   catalogue.
2. Strictly decode and preserve each Campaign configuration before invocation.
   Run the three Scenario Campaign configurations serially. Commit each
   admission or retain each rejection before starting the next Campaign.
3. For each admitted Scenario, author and commit the character source, then
   author and commit the setup source. Follow
   [`SCENARIO_AUTHORING.md`](../scripts/raw-swarm/SCENARIO_AUTHORING.md) and
   [`SCENARIO_EXECUTION.md`](../scripts/raw-swarm/SCENARIO_EXECUTION.md).
4. Freeze the wave revision. Create one clean linked worktree per admitted
   Scenario at that revision. Preserve the expected full Git SHA in the
   launch's durable `operator/waves/<wave>/expected-git-sha` record. Record lane
   ownership before starting players.
5. Execute up to three Scenarios concurrently with unique Execution and
   Evidence Set identities. Every runner invocation must pass the preserved
   wave SHA through `--implementation-git-sha`. Do not run two players against
   one Evidence Set.
6. Before replay, require each lane's
   `evidence/execution-start.json.gitSha` to equal the preserved wave SHA. A
   mismatch stops the wave and cannot be reviewed, indexed, or exported as
   campaign evidence. Replay each completed or diagnostic Execution before
   review. Run independent review against the bounded packet and exact named
   sequence reads.
7. After each lane is idle, copy its complete Evidence Set into the same
   repository-relative path under the coordinator's ignored `out/` directory.
   Verify the copied authority hashes before removing the lane worktree.
8. Stop all index writers. The coordinator serially ingests transcripts,
   imports reviews, links confirmed fingerprints, finalizes findings, and
   renders audits according to
   [`EVIDENCE_REVIEW.md`](../scripts/raw-swarm/EVIDENCE_REVIEW.md).
9. At a quiescent boundary, synchronize the complete ignored `out/` directory
   to the durable archive and create a portable `report.ts export` after the
   index and artifacts are stable.
10. Remove settled lane worktrees. Begin the next wave from the coordinator
    branch, whose catalogue includes every prior admission.

Wave revisions, rather than one revision for all 48 hours, are the comparison
boundary. Every Execution in one wave uses the same frozen implementation SHA.
Later authoring may advance the catalogue while earlier Execution worktrees
remain pinned to their recorded wave revision.

## Calibration waves

Calibration keeps the three-lane capacity but does not increase concurrency.
The first wave uses these three ordinary Scenario Campaign configurations:

1. `scenario-campaign-48h-riverstone-relief.json` — supported delegated rescue
   and resource-pressure exploration.
2. `scenario-campaign-48h-watchfire-rotation.json` — supported stat-block
   target-priority, movement, and reaction exploration.
3. `scenario-campaign-48h-causeway-recovery.json` — supported zero-Hit-Point
   recovery under attack pressure.

The canonical generator may revise or reject a Candidate. A configured title or
purpose does not authorize admission, expected behavior, or a fabricated SDK
operation.

The second calibration wave is the next wave of exactly three Scenario
Campaigns. After the first wave is fully replayed, reviewed, indexed, and
archived, render the then-current complete catalogue and read its retained
findings. Author three materially distinct configurations from that evidence,
with fresh launch-prefixed Campaign, planned Scenario, and authoring Evidence
Set identities. Strictly decode and preserve those configurations before
invocation. Keep at most three execution lanes through this second wave. Only
after its quiescent checkpoint may the coordinator reduce active lanes or keep
all three, based on observed completion time, resource headroom, and provider
health.

For the first wave, verify that every checked-in identity is unused immediately
before invocation. If one is occupied or an invocation must be retried, do not
edit or reuse that configuration. Copy its semantic inputs to a new immutable
configuration under the repository-owned ignored
`scripts/raw-swarm/out/<operation>/operator/configs/` directory and replace
`campaignId`, `plannedScenarioId`, and `evidenceSetId` with fresh
launch-prefixed identities. Strictly decode the copy and use that contained
path as the new invocation input. Preserve it in the next durable archive
checkpoint; the external archive remains storage, never an authoring input.
Apply the same procedure to every later-wave configuration.

## Durability and recovery

- Allocate at least 2 GiB for retained output and additional scratch headroom.
  Inspect filesystem capacity and stale Raw Swarm temporary roots before each
  wave.
- Synchronize evidence only when the player, reviewer, and index writer are
  idle. A live SQLite database is not copied without its WAL and shared-memory
  files.
- Use the canonical portable export for stable indexed snapshots. The archive
  is storage, not a second transcript, catalogue, or lifecycle authority.
- Derive status from Campaign manifests, Execution manifests, transcripts,
  replay results, reviews, findings, and the SQLite index. An operator journal
  may point to those authorities but must not replace their state.
- A failed invocation or occupied Evidence Set is preserved. Retry with a new
  identity. Do not edit a frozen call prefix, replay result, review, or findings
  projection.
- A process failure with no published Evidence Set requires scratch forensics
  or a fresh Execution identity; there is no attach command.

## Stop and escalation conditions

Stop new work immediately for an identity/hash/containment/replay defect,
unreadable canonical catalogue, credential loss, disk exhaustion, or the
resource-emergency conditions in `AGENTS.md`. Preserve the exact failure before
repair. Do not describe a partial execution, replay, review, or broad test as
complete.

For a substantial integrity repair:

1. assign one Luna maximum-reasoning implementer to one dedicated worktree;
2. keep all other agents away from that owner and defect;
3. converge an independent Luna maximum-reasoning review;
4. run an outer Sol review;
5. integrate only verified work into the coordinator branch; and
6. start new evidence at the repaired revision without rewriting history.

## Launch and completion gates

Launch requires:

- an explicit start instruction;
- a clean coordinator branch pushed to the remote;
- all calibration configs strictly decoded;
- the complete catalogue rendered successfully;
- the durable archive root present with at least 2 GiB free;
- no active conflicting Raw Swarm player, reviewer, or index writer; and
- a recorded UTC deadline and three fresh lane identity prefixes.

Completion requires every started Scenario Campaign and Execution to have a
retained terminal disposition or precise obstruction, every published
transcript to have a replay result and independent review, every promoted
fingerprint to be linked, a stable portable export, and a final report that
separates completed Executions, diagnostic obstructions, player failures,
review classifications, confirmed defects, and untested limits. After durable
outcomes have been promoted to their owning documents, tests, or issues, close
issue `#332`, delete this one-off plan in the cleanup commit required by
`plans/README.md`, and integrate that cleanup before declaring the operation
administratively complete.
