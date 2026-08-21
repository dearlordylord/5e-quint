# Scenario authoring protocol

Use the package vocabulary in [`README.md`](README.md). This is the executable
protocol for the Raw Swarm operator, generation agent,
and scenario review agent. It authors one admitted Scenario through a bounded
Scenario Campaign. The protocol is the same for a known SDK gap and for an
open-ended exploration; the difference is only the operator's stated purpose
and the review evidence.

## Roles and hand-offs

The roles are responsibilities, not Campaign modes or runtime entities.

| Role                      | Owns                                                                                                          | Must not do                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Raw Swarm operator        | Campaign configuration, complete catalogue read, candidate selection, revision bounds, and admission hand-off | maintain a second scenario index, sample the catalogue, or silently admit repetition                         |
| Scenario generation agent | complete prose Candidates and typed stage facts for the next revision                                         | declare admission, invent a scenario DSL, prescribe SDK calls, or copy protected non-SRD identity/expression |
| Scenario review agent     | independent RAW, availability, SDK-capability, artifact-policy, quality, and catalogue-comparison evidence    | choose tactics, predict an outcome, rewrite prose, or replace missing evidence with a guess                  |
| Player/DM agent           | character/setup choices and serious tactical execution through the public SDK                                 | use Scenario labels as rules dispatch, fabricate unsupported support, or restate Table-owned facts           |
| Post-play review agent    | whole-trace review and finding classification from retained authorities                                       | treat a successful execution or player conclusion as proof of RAW correctness                                |

The generation agent's output is a Candidate. Only the operator can move a
Candidate through the existing bounded Campaign revision loop and the existing
admission boundary. The review agent supplies evidence to that decision; it is
not a voter or an admission subsystem.

## 1. Establish the authoring boundary

1. Start at [`README.md`](README.md), then read the repository instructions and
   [`docs/mushroom-playbook/AUTHORING.md`](../../docs/mushroom-playbook/AUTHORING.md).
   Use only SRD identity or visibly synthetic unsupported material in public
   prose and evidence.
2. Use a clean revision and a new Campaign, semantic planned Scenario, and
   authoring Evidence Set. A Campaign reservation is not an admitted Scenario.
3. Read the complete canonical catalogue:

   ```sh
   mise exec -- pnpm raw-swarm:catalogue -- --json
   ```

   The admitted projection is derived from `.scenario.json` records and their
   referenced authored source, final review, and stage-facts authorities.
   Current admission records also retain the exact predecessor Scenario ids
   observed at that admission boundary; catalogue rendering validates their
   retained comparison against that boundary rather than against the newly
   admitted record itself. Historical records remain readable as historical
   evidence and cannot authorize a current comparison.
   Rejected Candidates are diagnostic evidence and are not comparison targets.
   If the command fails, stop and repair the authority read; do not proceed
   with a partial, sampled, cached, or hand-written catalogue.

4. State one exploratory purpose in the Campaign configuration. It may be a
   known-gap probe (for example, a concrete SDK boundary that should be
   exercised) or an open-ended question chosen to discover an unanticipated
   gap. In both cases the Candidate remains an ordinary prose Scenario and
   uses the same catalogue comparison, review, setup, execution, and evidence
   boundaries.

## 2. Generate complete Candidates

At each configured iteration, ask for the configured number of complete,
materially different Candidate objects. Differences must affect one or more
of mechanics, encounter composition, interaction sequence, tactical purpose,
or delegated character choices; wording-only variants are not useful. Keep
prose focused on facts that can affect setup, choices, tactics, or review.

The generation agent returns prose and the existing typed `stageFacts` only.
The facts are controller-owned planning evidence, not a prose parser or a
second scenario model. The agent does not choose an expected result and does
not make a Candidate playable by inventing an unsupported operation.

The operator compares every Candidate in the returned batch before selecting
the revision to carry forward. A Candidate that is never selected is still
checked for catalogue overlap; a Candidate that is selected carries its
comparison evidence into the Campaign review. Stage-plan contradictions may
reject a Candidate before whole-scenario review, but that rejection is retained
as Candidate evidence and never promoted to the admitted catalogue.

An empty admitted catalogue is a valid first-authoring state. It produces a
retained `noAdmittedScenarios` comparison with the required
`meaningfullyDistinct` conclusion; the first admitted Scenario does not need a
placeholder catalogue entry.

## 3. Compare against the complete admitted catalogue

Use the canonical `projectScenarioCatalogueForAuthoring` projection produced
from the catalogue command's authorities. It contains concise title, purpose,
stage requirement, spatial context, availability intent, SDK-support boundary,
and source-authority references. It does not copy scenario prose or create a
parallel registry.

The operator must preserve these comparison invariants:

1. Measure the UTF-8 JSON bytes of the projections and partition them into
   bounded batches using the existing authoring helper. Every admitted
   `scenarioId` must occur exactly once across the batches. If one projection
   cannot fit, fail explicitly. Never take a head/tail sample, silently omit a
   record, truncate a source, or treat a client display limit as a comparison
   limit.
2. Give the comparison reviewer the Candidate prose and one complete
   projection batch at a time. The complete UTF-8 payload (instructions,
   Candidate prose, batch index, and serialized batch) is measured against the
   conservative 32 KiB model-input byte bound. This is a measured transport
   bound, not a claim about an unconfigured provider tokenizer; an over-limit
   payload fails explicitly. When a concrete fact is needed, read the
   referenced authority exactly and retain its hash/length binding. A batch is
   a transport boundary, not permission to ignore an entry.
3. Compare the Candidate and each admitted Scenario on the following material
   dimensions: exploratory purpose; materially relevant mechanics; encounter
   composition; interaction sequence; tactical question; and SDK support
   boundary. Spatial information is optional supporting context. It is never a
   required difference merely because two Scenarios use different squares,
   ranges, or terrain.
4. Return exactly one closed conclusion after aggregating all batches:
   - `meaningfullyDistinct`: the Candidate adds a materially different
     exploratory question or mechanic combination.
   - `purposefulOverlap`: the Candidate overlaps an admitted Scenario but
     names at least one material differentiator that justifies retaining both.
   - `redundant`: the Candidate repeats an admitted Scenario's useful purpose
     and material behavior without a differentiator.

   A `redundant` result must identify its closest matching admitted Scenario.
   A `purposefulOverlap` result must name its material differentiator. A
   comparison that omits any admitted id, has duplicate ids, or has no required
   evidence is invalid and cannot reach admission.

The canonical final review retains `catalogueComparison` with the conclusion,
all compared Scenario ids, closest matches, differentiators, and a complete
named dimension-evidence object for every canonical batch. Later operators
inspect that existing review authority through the admitted catalogue record;
they do not consult a comparison registry or copy facts into one.

## 4. Revise bounded repetition

If a selected Candidate is `redundant`, put the closest-match explanation and
the required revision in the existing Campaign critique list. The next
generation request receives that critique and must produce a complete revision
within the configured minimum/maximum iteration bounds. The operator may not
silently select the same Candidate again or bypass comparison because a
purpose sounds useful.

If the maximum bound is reached while the Candidate remains redundant, retain
the Candidate review and rejection record under its Candidate/Evidence Set
identity. Do not write a `.scenario.json` admission record. The rejection is
valuable authoring evidence, but it is never a playable Scenario.

Other review responsibilities retain their existing independent findings:
RAW legality and coherence, content availability, SDK capability, public
artifact policy, and Scenario quality. An accidental unsupported capability or
unavailable record remains a revision critique. A deliberate known-gap probe
may be admitted only when its intent and unsupported boundary are explicit.

## 5. Finish the Campaign hand-off

Before admission, confirm that the selected prose's hash, typed stage facts,
stage plan, final review, and comparison evidence all refer to the same clean
revision. The existing generator writes the final review and stage authorities
atomically and refuses occupied paths. The catalogue command must then show one
new admitted entry, while any rejected Candidate appears only in the separate
diagnostic projection.

After admission, follow [Scenario execution](SCENARIO_EXECUTION.md). Do not
pre-author player tactics in setup or use prior execution findings as a
blacklist for future authoring. After play, follow [Evidence review](EVIDENCE_REVIEW.md).
