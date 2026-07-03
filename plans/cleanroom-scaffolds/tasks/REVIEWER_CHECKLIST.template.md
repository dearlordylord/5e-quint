# Reviewer Checklist

Record each reviewer pass in `tasks/REVIEW_LOOP.json`. A single reviewer may
run multiple checklists, but each checklist result must be recorded separately.

## Required Checklists

### raw-qnt-traceability

- Every rule-bearing change cites `cleanroom-input/raw/**` or a copied `.qnt`
  definition.
- No external D&D rules source, memory, wiki, book, or forum is used.
- QNT semantics are treated as conformance authority for the selected branch
  set.

### ubiquitous-language-domain

- Names match `cleanroom-input/domain/UBIQUITOUS_LANGUAGE.md`.
- Domain names describe rules concepts, not migration status or witness
  mechanics.
- Optional fields and empty collections have distinct, documented meanings.

### architecture-connascence

- Production behavior is centralized in reusable rules modules under
  `{{enginePath}}`.
- Reducer-spine diagnostic drivers listed in
  `cleanroom-input/branch-coverage/reducer-route-inventory.json` replay through
  the shared battle reducer surface and not through slice-local replay helpers.
- Strong connascence is localized or weakened by named domain helpers.
- Magic strings, positional conventions, and caller sequencing protocols are
  rejected unless type- or gate-enforced.

### branch-coverage

- Every selected in-scope branch has passing harness-generated target replay
  evidence.
- Evidence uses {{quintBindingName}} and records observed `mbt::actionTaken`.
- Passing evidence records `stateCheck.observedProjectionSource`.
- `qRoute` evidence uses the route event-list comparator, records the target
  reducer entrypoint sequence, and names the observed reducer route-event
  source plus reducer/public API path that produced it.
- `qComponentRoute` evidence uses the component route event-list comparator,
  records the target component entrypoint sequence, and names the observed
  component route-event source plus reducer/public API path that produced it.
- Semantic projection evidence is tagged `semantic-projection`, uses neither
  route-event comparator, and names its semantic projection source plus public
  API path.
- Equal expected/observed projection hashes without the matching source record
  are rejected.
- Focused target-language tests are listed only as diagnostics.

### code-shape-depth

- The task deepens a reusable engine module or records an adapter-only paired
  engine task.
- Public production APIs are domain-facing.
- Large production accumulators are rejected unless they are raw-authored data
  boundaries, not driver witness tables.

### adapter-quarantine

- Adapter modules are recorded in `tasks/ENGINE_DEPTH_MANIFEST.json`.
- QNT action names, witness field names, trace ids, and `mbt::actionTaken`
  stay inside adapter or harness files.
- Production modules do not import from adapter modules.

### engine-depth

- `tasks/ENGINE_DEPTH_MANIFEST.json` records production modules extended,
  domain APIs introduced or reused, adapter modules touched, quarantined
  witness names, accumulator growth, and expected next reuse.
- Related drivers should reuse or deepen the same module.

### state-owner-derivability

- `tasks/STATE_OWNER_MANIFEST.json` records every durable field introduced or
  changed by the task.
- Each field has one owner: authored provenance, structured input, build
  evidence, sheet state, battle state, executable boundary projection, or
  harness witness protocol.
- Derivable facts are not stored unless they are explicit executable boundary
  projections.

### authored-identity-dispatch

- Production runtime semantics do not branch on names, ids, slugs, source
  headings, provenance sections, page references, or official catalog labels.
- Support admission uses parsed shape, support-profile readers, typed
  procedure facts, explicit selection facts, or explicit cross-record
  references.

### report-honesty

- `tasks/VALIDATION_REPORT.md` renders branch coverage from target replay
  evidence.
- `tasks/VALIDATION_REPORT.md` is a readable view only; generated report rows
  or adapter-local expected route tables cannot substitute for
  `tasks/target-replay-evidence/*.json`.
- Covered rows identify the full source obligation id:
  `<driver path>#<branch family>:<branch action>`.
- Rows with diagnostic tests but no target replay evidence are not marked
  covered.
- Remaining blockers are classified as source QNT/corpus, source scope, or
  target implementation.

## Finding Resolution

Every reasonable finding must be fixed or explicitly rejected by the decider
with a concrete rationale in `tasks/REVIEW_LOOP.json`. Open reasonable findings
block acceptance.
