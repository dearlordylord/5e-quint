# Raw Swarm issue #296 cold-context audit

Audit date: 2026-08-24. This record supersedes the earlier goal-only
attestation in this file. It records one fresh cold-context run under the
canonical task `/root/gh296_cold_context_fresh`.

The run was an audit of navigation and protocol understanding. It was not an
authorized Campaign execution. The exact prompt and response blocks below are
preserved verbatim. Their SHA-256 values are over the UTF-8 bytes inside each
fenced block, excluding the Markdown fence delimiters and the separator newline
before the closing fence.

## Initial exchange

### Exact prompt

```text
Create a materially useful, non-duplicate Raw Swarm Scenario.
```

SHA-256: `1dfc9a9320a3f462c2f1b59db7c9b886809574c8088b2c38a23a35cf66d84cd3`

### Exact response

```text
Added and validated `spider-poison-fork`, a new admitted Raw Swarm Scenario focused on Spider Bite’s separate Piercing/Poison components against Poison-immune Skeleton vs nonimmune Goblin Warrior.

Changed:

- Scenario prose, review, stage facts, and admitted record
- Zero-sheet character source
- Ready canonical setup with matched adjacent geometry and rolled damage

Validation:

- Canonical catalogue passes with all 13 predecessor comparisons and 14 admitted scenarios.
- SDK setup evaluator returns a ready session.
- Spider Bite target choices are surfaced for both branches.
- Typecheck, Prettier, diff check, and 5 Raw Swarm test files pass: 53 tests.

No execution transcript was added; the Scenario is ready for later paired Executions.
```

SHA-256: `fb4b025fa5c599df677ab6e0befd40a6df3e7e4e03335e087188211f225a002b`

The initial response was not a valid protocol output for this audit. It
claimed direct Scenario admission and validation instead of returning the
repository-required operator plan, and it did not establish an authorized
clean-revision Campaign boundary. The directly created Scenario artifacts were
hashed for this record and then removed from the main checkout; they must not
be treated as a valid admitted Scenario or as executable protocol evidence.

## Correction exchange

### Exact correction prompt

```text
Your result did not provide the repository-required operator execution plan. Re-read the repository instructions and return the corrected plan. Do not edit files, run commands, invoke models, or add/remove anything; respond with the plan only.
```

SHA-256: `e5d8ef43bf0b198ee2c7df467039ece1d3aad4360411fe508669be3eeb2d6bdc`

### Exact correction response

```text
Operator execution plan for GH-296 (`spider-poison-fork`):

1. Establish a clean revision boundary. Preserve unrelated dirty files outside the campaign scope. Read `scripts/raw-swarm/README.md`, `SCENARIO_AUTHORING.md`, `SCENARIO_EXECUTION.md`, `EVIDENCE_REVIEW.md`, and the authoring policy. Record the clean Git SHA.

2. Render the complete canonical catalogue with:

   `mise exec -- pnpm raw-swarm:catalogue -- --json`

   Treat all 13 current admitted Scenario ids as predecessors. Verify Spider, Skeleton, and Goblin Warrior are available SRD stat blocks and that the supported SDK exposes canonical setup, bright-grid adjacency, rolled stat-block damage, typed targeting, damage components, interrupts, and End Turn continuation.

3. Configure one new Campaign for `spider-poison-fork`:

   - `availableOnly`
   - `supportedOnly`
   - bounded 2–4 iterations
   - at least 4 complete Candidates per iteration
   - exploratory purpose: compare Spider Bite’s separate Piercing/Poison components against a Poison-immune Skeleton and nonimmune Goblin Warrior under matched reach and lighting

   Do not prescribe attack rolls, hit results, damage totals, or expected immunity outcomes.

4. Run generation through the existing Campaign runner. For every Candidate, compare against every catalogue projection in measured UTF-8 batches. Retain all 13 ids, complete dimension evidence, closest matches, and material differentiators. If a Candidate is redundant, retain the critique and require bounded revision; if it remains redundant at the limit, retain rejection evidence and do not admit it.

5. At final review, independently retain RAW, content availability, SDK capability, artifact policy, and quality assessments. Admit only a `meaningfullyDistinct` or justified `purposefulOverlap` result with complete comparison evidence. Publish the prose, review, stage facts, stage plan, findings, and `.scenario.json` atomically through the existing admission boundary; do not fabricate hashes or manually bypass Campaign publication.

6. Follow the retained stage plan:

   - stat-block-only character stage produces and evaluates the zero-sheet character source;
   - neutral setup authoring composes the three canonical creatures and fixed bright-grid adjacency;
   - controller setup authoring supplies only delegated initiative/ammunition/pre-battle facts;
   - validate the ready session before play.

7. Attempt two fresh Executions with the same admitted Scenario id and distinct Execution/Evidence Set ids. Use one first Bite against Skeleton and one against Goblin Warrior, without sharing state, rolls, or conclusions. Retain every public SDK call and response. Preserve any character, setup, player, or review obstruction precisely rather than substituting content.

8. Replay each exact transcript verbatim, review bounded audit packets independently against local RAW, import and classify findings, resolve any promoted issue fingerprints, and finalize immutable findings and evidence manifests.

9. Re-render the catalogue and run the targeted Raw Swarm checks. Repeat RAW traceability, ubiquitous-language/domain, architecture/connascence, and code-review passes until no reasonable findings remain.
```

SHA-256: `f9c27af30459117c144a66e79130147bc44b250fad4bea40f6fb8a0c445b1cab`

Root-run observations accompanying the correction (not part of the agent’s
response):

Side effects from initial run (all untracked, removed afterward via apply_patch):

- spider-poison-fork.characters.ts sha256 817c3ab48d96751f4afe46982bce066ef7e2d109c14353c456c64ae17889473c
- spider-poison-fork.md sha256 ee95c8020c2aa21512fcea7b1ce3f111924566f63e7ef8af7d2247b33e146f22
- spider-poison-fork.md.scenario-review.json sha256 1d2d506d5c95096c7e8ed6112adb5b1505d47de03bcfb255044bcce184fa2fbc
- spider-poison-fork.md.stage-facts.json sha256 255c66c49aa8a1a58bd02963792a2c2650038f469d15b880f2f96bf545f2d13f
- spider-poison-fork.scenario.json sha256 d7ffd2503aaa7e6277de94425ce843563d7aae087ee075d2dc9ed90882204889
- spider-poison-fork.setup.ts sha256 de02b0a609cbe4c842c36d9d98062749455a9e78c2787cac80363e02d2803a9e

No matching ignored output directory existed; repeated process scans found no main-checkout model runner/Codex process; master HEAD remained ccea09fec. Be precise that this is observational evidence, not absolute proof of all historical process state.

## Second correction exchange

### Exact second-correction prompt

```text
The corrected plan still does not state whether catalogue comparison happens before or after Candidate selection. Re-read the repository instructions and return a corrected Step 4 only. Do not edit files, run commands, invoke models, or add/remove anything.
```

SHA-256: `be3988e7a6fc6db8b08c1f99025d6df923954aa30146b736da2c043e1d56cffd`

### Exact second-correction response

```text
4. At each generation iteration, receive the complete Candidate batch first. Before selecting any Candidate to carry forward, compare every Candidate—including candidates that will not be selected—against every admitted catalogue projection in measured UTF-8 batches. Retain each Candidate’s complete comparison evidence, then select one revision using those results. If the selected Candidate is redundant, add its closest-match critique and require bounded revision; never silently reselect it or bypass comparison.
```

SHA-256: `27df44d26191252d466ba815c2190aa78f20d639b10836bdc5a5a54bb0ce0a0f`

After that response, main status remained only the two pre-existing unrelated
research files and no matching ignored output existed. This is a root-run
observation, not part of the agent’s response.

## Audit assessment

The correction repaired the most important navigation failure: it returned a
repository-specific operator plan and explicitly prohibited further edits,
commands, model calls, and artifact mutation. The plan is evidence of
understanding, not evidence that Campaign generation, admission, setup, play,
replay, or review occurred.

The first corrected plan had a protocol-timing ambiguity: its Step 4 said to
compare every Candidate against every catalogue projection, but did not
explicitly state that this comparison must complete before selector choice or
revision selection. The owning authoring protocol requires every Candidate in
the returned batch to be compared before selecting the revision. The second
correction resolves that ambiguity by requiring the complete batch first,
comparison of selected and unselected Candidates, retained evidence, and only
then revision selection. This is corrected plan evidence, not evidence that a
Campaign was executed.

Because the checkout already contained the superseded audit naming
`spider-poison-fork`, this fresh run proves goal-only navigation and protocol
correction, not independent invention of that Candidate identity. That
limitation does not invalidate the goal-only correction criterion.

## Navigation failures and correction

The initial navigation failure was an incorrect output shape: it claimed a
directly admitted Scenario and validation instead of returning the
repository-required operator execution plan. The first correction required a
fresh reading of the repository instructions and a plan-only response; the
second correction made the catalogue-comparison-before-selection ordering
explicit. Neither correction authorized edits, commands, model calls, or
artifact mutation.

## Side-effect and process evidence

The direct-created Scenario artifacts listed in the root-run observations above
were removed from the main checkout after their exact bytes were hashed. No
execution transcript was retained. No matching ignored output directory was
observed. The main checkout was restored to only the two pre-existing unrelated
research files. Repeated process scans found no main-checkout model runner or
Codex process, and master remained at `ccea09fec`. These are bounded
observations of the fresh run, not absolute proof about every historical
process state.
