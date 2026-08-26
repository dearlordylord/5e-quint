# Raw Swarm

Raw Swarm is an evidence-producing external-consumer workflow for finding
gaps in the public D&D adjudicator SDK. Raw Swarm does not turn catalogue
membership into a RAW-coverage or player-correctness claim.

## Vocabulary

These terms have one package-wide meaning:

- A **Scenario Campaign** (or **Campaign**) is the bounded authoring process
  that generates, compares, revises, reviews, and either admits or rejects
  Candidates. Its planned Scenario identity is a reservation until admission.
- A **Scenario Candidate** (or **Candidate**) is authored prose and typed
  planning facts under Campaign review. A rejected Candidate never becomes a
  Scenario.
- A **Scenario** is one immutable, admitted authored input with a semantic
  identity, title, purpose, retained review, and retained stage authorities.
- A **Contained Scenario authority** is an immutable admitted Scenario retained
  for historical relationship validation but excluded from future authoring
  and live catalogue comparison.
- An **Execution** is one externally identified attempt to exercise exactly
  one admitted Scenario through the public SDK, whether it reaches the first
  SDK call or is obstructed during character or setup authoring.
- A **Benchmark** is one controlled comparison whose target Execution or
  Execution Profile identities and context authorities are explicit.
- An **Evidence Set** is the immutable authority collection produced by one
  Campaign, Execution, or Benchmark. Its identifier is not a Scenario,
  Execution, Campaign, Candidate, or Benchmark identity; its filesystem path
  is only storage projection.
- **Run** is not a Raw Swarm domain term. Do not use unqualified `Run` to
  identify any of these objects. A database-local `runId` is only a row key;
  qualify any operational run by its owning protocol or use the domain term
  above.

Start with the role protocol for the work you are doing:

- [Scenario authoring](SCENARIO_AUTHORING.md) — operator-owned campaign
  workflow, complete catalogue comparison, bounded revision, and admission.
- [Scenario execution](SCENARIO_EXECUTION.md) — player/DM and setup workflow
  through the ordinary public SDK.
- [Evidence review](EVIDENCE_REVIEW.md) — independent review, retained
  authorities, exact reads, and finding disposition.

The [Raw Swarm operations reference](OPERATIONS.md) contains the detailed
prototype commands and existing MCP/direct-SDK evidence procedures. Read the
role protocol first; it owns the procedure for that role. Role protocols link
back here for vocabulary and must not redefine these terms.

Render the live, one-entry-per-admitted-Scenario catalogue before authoring:

```sh
mise exec -- pnpm raw-swarm:catalogue -- --json
```

The command emits the live admitted Scenario projection from direct
`.scenario.json` records. Contained Scenario authorities (see the vocabulary
above) remain available for historical relationship validation but are excluded
from the authoring projection and live catalogue comparison. It fails on
unreadable, mismatched, dangling, or incomplete evidence; do not replace a
failed read with a sample or a hand-maintained list.

Scenario generation is instructions-first. Do not add a novelty score,
embedding index, retrieval service, Campaign mode, scenario DSL, or automated
admission gate. Runtime behavior continues to dispatch on typed procedure
facts and state, never Scenario identity or catalogue labels. Public authored
records and examples also follow
[`docs/mushroom-playbook/AUTHORING.md`](../../docs/mushroom-playbook/AUTHORING.md).
