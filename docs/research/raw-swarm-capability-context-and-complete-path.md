# Raw Swarm capability context and complete-path evidence

Research date: 2026-08-19. This report records the bounded capability
projection, the retained complete-003 measurement for #292, and the paired
coherent/rejected evidence for #293. Ignored `scripts/raw-swarm/out` artifacts
remain the evidence authorities; this document does not copy their payloads.

## Canonical capability projection

`scripts/raw-swarm/capability-projection.ts` is the sole owner of the v1
capability projection. Generation, character authoring, setup authoring,
player execution, and review receive role views derived from that value. The
projection describes public operations and experiment boundaries; it is not a
second D&D schema or declaration tree. Declarations emitted into authoring
scratch directories are compilation support only.

The checked-in `capabilityContextSizeEstimate()` result is a bounded-context
regression, not first-party model usage. Its token figures are estimates of
`ceil(UTF-8 bytes / 4)`:

| Role                | UTF-8 bytes | Estimated tokens |
| ------------------- | ----------: | ---------------: |
| generation          |       2,481 |              621 |
| character authoring |       1,719 |              430 |
| setup authoring     |       2,810 |              703 |
| player              |       2,898 |              725 |
| review              |       2,662 |              666 |
| total role views    |      12,570 |            3,145 |

Generation and review include concise setup/play boundary summaries because
those roles must select and assess representable scenarios. The projection
states that geometry-derived and Table-authored sessions are exclusive and
that a Table decision is bound to one exact situation. The estimate must not
be described as a live token saving.

## Retained complete-003 measurement

The assembled measurement is
`scripts/raw-swarm/out/generated-battle-015-complete-003-measurement.json`
(schema version 2, path id `generated-battle-015-complete-003`, SHA-256
`3cc174428148c7c559159c256ebd5511a1945dca16ba962b8cac8ed82ec8cb92`). It
validates the admitted stage plan, v2 invocation ledgers, every invocation
event, replay/findings authorities, and the completed terminal outcome.

The stage plan records three generation invocations with two interleaved
composite reviews (milestone review, revised generation, final review). This
is the real campaign order, not a duplicate ledger. Character Sheet authoring
was skipped because the admitted scenario contains only three canonical
stat-block creatures. Neutral setup, controller setup, player execution, and
post-play review were required. The phase ledger has nine model invocations:

| Phase                      | Invocations | Model / effort         |         Input | Cached input\* |     Output | Reasoning output |    Elapsed ms |
| -------------------------- | ----------: | ---------------------- | ------------: | -------------: | ---------: | ---------------: | ------------: |
| scenario generation        |           3 | `gpt-5.6-sol` / medium |        59,218 |              0 |      4,295 |            1,103 |        94,664 |
| scenario composite review  |           2 | `gpt-5.6-luna` / max   |       886,024 |        683,776 |     31,054 |           24,748 |       743,345 |
| neutral setup authoring    |           1 | `gpt-5.6-sol` / medium |       263,518 |        191,744 |      2,711 |              934 |        92,649 |
| controller setup authoring |           1 | `gpt-5.6-sol` / medium |       427,897 |        331,520 |      7,262 |            1,956 |       195,964 |
| player                     |           1 | `gpt-5.6-sol` / medium |     1,444,107 |      1,354,752 |     10,943 |            2,059 |       283,508 |
| post-play review           |           1 | `gpt-5.6-luna` / max   |        87,872 |              0 |     33,079 |           31,596 |       601,446 |
| **total**                  |       **9** | —                      | **3,168,636** |  **2,561,792** | **89,344** |       **62,396** | **2,011,576** |

\* Cached input is a subset of input, not an additional population. The
uncached input remainder is 606,844 by subtraction; it is not added to the
input total. Elapsed time is the sum of invocation elapsed fields, not a claim
about critical-path wall time. No engineering-agent tokens or unrelated
harness populations are included.

The phase revisions are retained in the ledger: generation/review ran at
`790613016870add5fb313f7f2e39c77e897f4d19`, setup authoring at
`2f5e624b353a56cce0fcca40084a1a76bf73bd5b`, and player/post-play review at
`2f8f54cb31b3c783850871fdb5e24f89eb695434`. A phase authority is accepted by
its own revision, event hash, model, effort, and stage binding; the measurement
does not pretend these were one unchanging source revision.

### Execution and findings

The admitted `generated-battle-015` player run is ordinary public SDK
TypeScript. It made 16 accepted SDK calls, and the standalone replay matched
all 16 (`status: succeeded`). The transcript authority is
`scripts/raw-swarm/out/generated-battle-015-complete-003-sdk-player/evidence/sdk-calls.jsonl`
(SHA-256
`20e8326bc51119e2792daf91fb69ed20a0bfe30f4d749e2db9fb51a5a0539f6f`), and the replay
result is retained at
`scripts/raw-swarm/out/generated-battle-015-complete-003-sdk-player/evidence/replay-result.json`
(SHA-256
`46f89344056cb844d44819c58db0e6967bf4c5749186f83de3c14d9cc6875c94`).

The canonical findings projection is
`scripts/raw-swarm/out/generated-battle-015-complete-003-sdk-player/evidence/findings.json`
(SHA-256
`766c31b23f1b23d92e97a0072d931e78ff3e3570ac8c9ac21d98042749c01621`). It
contains 20 findings:

- 8 pre-call compilation failures and 4 successful corrections;
- 1 informational finding for the skipped Character Sheet stage; and
- 7 independent post-play verdicts: 5 pass and 2 `player-invalid`.

The two invalid verdicts are retained, not hidden. The player summary claimed
three Prone results although the accepted outcomes were three successful
Shove saves with no applied effect. Its random d20-like outcome generator is
also not a RAW-faithful or sufficiently specified normal-resolution procedure
for the final Shove. Deterministic authored randomness is explicitly owned by
#281 and remains a limitation/out-of-scope item here. These findings limit the
claim about player-authored resolution fidelity; they do not invalidate the
ordinary SDK transcript, replay, Table-decision evidence, or phase accounting.

## Historical comparison and evidence boundary

The retained #287 `generated-battle-009` report is historical context: 7.94
million input tokens for four accepted SDK calls, including 7.00 million
cached input tokens; its report partitions input as 5.01 million for
generation/repeated review, 2.47 million for character/setup authoring,
361.7 thousand for player execution, and 97.5 thousand for post-play review.
Those numbers are not reconstructed from current output files.

They cannot form a formal complete-path baseline for complete-003. The 009
record has no typed stage plan, v2 invocation ledger, hash-linked replay
witness, findings projection, or retained phase/event authorities matching the
current measurement. It also does not establish the same scenario identity,
stage decisions, model/effort sequence, or terminal/review responsibilities.
Accordingly:

| Comparison dimension                             | Status                                                 |
| ------------------------------------------------ | ------------------------------------------------------ |
| Scenario/path identity and terminal equivalence  | incomparable                                           |
| Stage plan and phase/invocation counts           | incomparable                                           |
| Input, cached input, output, and reasoning usage | incomparable; 009 has no equivalent typed authorities  |
| Phase elapsed time                               | incomparable; 009 has no equivalent typed phase ledger |
| Complete-path percentage saving                  | unavailable; no saving is claimed                      |

Complete-003 does demonstrate bounded role context, stat-block-only stage
skipping, retained failures/corrections, independent review, transcript
replay, and searchable findings. Its drawbacks are also measurable: nine model
invocations remain, the two composite reviews account for 886,024 input tokens,
player execution accounts for 1,444,107, and the summed phase elapsed time is
2,011,576 ms. The historical 009 figures may show scale, but no cached,
uncached, output, reasoning, engineering-agent, or harness-model populations
are combined across runs. A future formal performance claim requires a
same-scenario, same-responsibility baseline with the same typed authorities.

## Rejected incoherent candidate

The paired rejection run is `generated-battle-014-incoherent`. Its campaign
configuration is
`scripts/raw-swarm/out/generated-battle-014-incoherent-campaign.json`
(SHA-256
`a335a5fe23f55ddeeb216ada347b444776e92bb470c66cc8b22565c01e5a8078`). It
retains two generation invocations and no composite-review invocation. The
candidate was rejected before whole-scenario review because, for the same
Skeleton, northern Goblin Warrior, and unchanged situation, the target was
asserted both within Shove reach and beyond 30 feet. Character authoring, setup,
player, and post-play stages were skipped with no model invocation.

The rejection authorities are:

- `scripts/raw-swarm/out/rejected-scenarios/generated-battle-014-incoherent.md`
  — SHA-256 `27a1959c73bfd2ab0cf9a5328a00e1a60a02384b0b3ea9cec1dc63370f84dd5b`;
- `scripts/raw-swarm/out/rejected-scenarios/generated-battle-014-incoherent.md.stage-plan.json`
  — SHA-256 `d7637eb4703c540add7c40ba855148e914b8b78b5404dc3ff502f8c63ac7d349`;
- `scripts/raw-swarm/out/rejected-scenarios/generated-battle-014-incoherent.md.stage-plan-findings.json`
  — SHA-256 `8716372a2276485b9145cf07e865b6527f5aa6d7e72768588eff13f424c3d2c5`;
- `scripts/raw-swarm/out/generated-battle-014-incoherent-generation-invocations.jsonl`
  — SHA-256 `45317188d1adb0cbafaa52cc263a931cd744b0169700c94039c629a8a37799ee`;
- `scripts/raw-swarm/out/generated-battle-014-incoherent-generation-run-audit.md`
  — SHA-256 `8cd866a2cc079e48ac4ba45a83424f903d89244d1918feafe369fe2412b134e9`.

The stage plan and findings both state that the contradiction must be rejected
as incoherent rather than delegated to geometry or the Table. This is the
cheap-rejection half of #293, not a geometry implementation test.

## Final joint review: geometry obligation

The coherent and rejected authorities jointly establish the product boundary.
For coherent 015, the admitted scenario and setup authorities are:

- `scripts/raw-swarm/out/generated-battle-015-complete-003-sdk-player/SCENARIO.md`
  — SHA-256 `6309153a4148436af5968fe3a269827d5222c7c563465c0610c38a64df656dff`;
- `scripts/raw-swarm/out/generated-battle-015-complete-003-sdk-player/SCENARIO_REVIEW.json`
  — SHA-256 `e91fd34e8001c871aba40b0cdc42b820a2f08b078c2b8510fb0e06d7d881a6ef`;
- `scripts/raw-swarm/out/generated-battle-015-complete-003-sdk-player/evidence/setup.ts`
  — SHA-256 `ceb47db12da59fbd664805c5e35a1919d612a5f2696d7baccb48281c45e1fc1f`;
- `scripts/raw-swarm/out/generated-battle-015-complete-003-sdk-player/evidence/stage-plan.json`
  — SHA-256 `c132659481eeb2d0b8244f3c38407951b8c33d7568537090d40d5e9ff0ccfd3b`;
- `scripts/raw-swarm/out/generated-battle-015-complete-003-sdk-review.json`
  — SHA-256 `dcb319e637cddec221a08025b4e044637541f4fdf590b32b3c87435712dad7ed`.

015 uses one exclusive `tableAuthored` spatial boundary with exactly three
reach decisions at one unchanged fingerprint. It has no arena, coordinates,
placements, geometry-derived question, or movement route. The independent
scenario review says no geometry, movement, or controller override is
required; the post-play review accepts the typed reach and action path. Its
two `player-invalid` findings concern the player’s outcome generator and
summary, not spatial representation.

For incoherent 014, the exact contradiction is rejected before whole-scenario
review, with no Table adjudication and no geometry request. Thus the joint
conclusion is bounded and explicit: coherent 015 proves that this interaction
can execute through a Table-authored witness without a geometry engine, while
rejected 014 proves that contradictory facts are rejected rather than rescued
by geometry. Neither candidate creates an obligation to implement, extend, or
make tactical-space part of Battle Runtime or the Target SDK. Geometry remains
an auxiliary experiment boundary; the evidence asks for coherent typed
admission and precise rejection, not geometry expansion.
