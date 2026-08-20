# Raw Swarm

Raw Swarm is an evidence-producing external-consumer workflow for finding
gaps in the public D&D adjudicator SDK. A Scenario is an admitted, immutable
authored input; an Execution exercises one Scenario; an Evidence Set retains
the authoring or execution authorities. Raw Swarm does not turn catalogue
membership into a RAW-coverage or player-correctness claim.

Start with the role protocol for the work you are doing:

- [Scenario authoring](SCENARIO_AUTHORING.md) — operator-owned campaign
  workflow, complete catalogue comparison, bounded revision, and admission.
- [Scenario execution](SCENARIO_EXECUTION.md) — player/DM and setup workflow
  through the ordinary public SDK.
- [Evidence review](EVIDENCE_REVIEW.md) — independent review, retained
  authorities, exact reads, and finding disposition.

The [Raw Swarm operations reference](OPERATIONS.md) contains the detailed
prototype commands and existing MCP/direct-SDK evidence procedures. Read the
role protocol first; it owns the procedure for that role. The package-local
vocabulary above owns Scenario Campaign, Scenario Candidate, Scenario,
Execution, Benchmark, and Evidence Set; the operations reference should not
introduce alternate names for them.

Render the one-entry-per-admitted-Scenario catalogue before authoring:

```sh
mise exec -- pnpm raw-swarm:catalogue -- --json
```

The command reads the canonical admission records and their referenced
authorities. It fails on unreadable, mismatched, dangling, or incomplete
evidence; do not replace a failed read with a sample or a hand-maintained list.

Scenario generation is instructions-first. Do not add a novelty score,
embedding index, retrieval service, Campaign mode, scenario DSL, or automated
admission gate. Runtime behavior continues to dispatch on typed procedure
facts and state, never Scenario identity or catalogue labels. Public authored
records and examples also follow
[`docs/mushroom-playbook/AUTHORING.md`](../../docs/mushroom-playbook/AUTHORING.md).
