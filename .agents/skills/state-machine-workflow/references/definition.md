# Definition and fact binding

Read this when creating a definition. `scripts/schema.ts` owns the
runtime schema. This example handles one fixed review target; it introduces no
performance workload or automatic execution.

The complete runnable example is [examples/review.json](../examples/review.json).
It routes `CHECK_PASS` to `awaitingAcceptance`, `CHECK_FAIL` to `repair`,
`RECHECK` back to `checking`, and `ACCEPT` from `awaitingAcceptance` to final
`done`. Failure therefore has no acceptance edge. The example handles one fixed
review target; adapt its identities and evidence to the selected task.

An event is `{"type":"CHECK_PASS","facts":{...}}`. Each `requires` key reads
that key from the submitted event facts. A string requires literal equality;
`{"fact":"build"}` requires equality with the instance's stored `build` before
the transition. Missing fields or missing referenced facts refuse the event.
On acceptance of an event, **every submitted fact patches the stored facts**,
including keys not named by the guard. Self-transitions also patch facts.

For `CHECK_PASS`, submit the matching workload/build, `verdict: "pass"`, and the
path and SHA-256 of the evidence actually inspected. Then `ACCEPT` must name the
same evidence hash and identity. Separate CHECK_FAIL routes preserve failure
without enabling acceptance. A submitted pass verdict still requires the
assistant's examination; the runtime compares strings, not evidence truth.

Treat workload/build identity facts as immutable within this fixed-target
instance. Require their existing values on each event that can patch facts and
submit those matching values. The store has no separate immutable-key feature.
If a task legitimately changes the workload or build, explicitly model that
boundary with distinct current/next identity facts and clear or replace old
evidence; design its guards before running the change. Do not reuse the example's
fixed-target definition for an unmodeled iteration change.

Definitions are immutable stored documents bound to the controller source hash.
Source edits can leave inspection available while writes refuse for runtime
incompatibility. Preserve the existing instance and inspect the difference;
use the controlled runtime migration below when authorized and appropriate.

The [event fixtures](../examples/) contain synthetic evidence for a smoke test.
`check-pass.json` adds an evidence path and SHA-256; `accept.json` references the
same hash. These fixtures demonstrate control flow only. Replace their verdicts,
identities and evidence when operating on real work. In another project, use
absolute paths for the installed example JSON files or copy and adapt them into
that project's existing artifact owner; relative evidence paths resolve from
the caller's working directory.

## Runtime migration

Use migration for an authorized runtime rebinding of the **same task definition**,
not to change requirements, bypass a failed check or treat unverified work as
accepted. Compare source and target transition rules, guard/fact interpretation,
operation handling and runtime changes. The command validates structure and
identities; it cannot establish semantic compatibility. Existing session
authorization can cover this work; the plan is an explicit record of the selected
source and reason, not an authorization grant by itself.

The source must already be stopped. If its runtime still matches, stop through
its normal `machine ... stop` command first. If a mismatch prevents stopping,
preserve the source and recover the matching runtime to stop it; migration has
no force option. Inspect outstanding operations and retain the actual evidence
needed to reconcile them.

Read the source identities without mutating it:

```sh
node "$SKILL_ROOT/run.mjs" migrate describe <source.sqlite> <instance>
```

The result reports source and target runtime/definition hashes, the source
revision, stopped status and unresolved operation IDs. It describes a possible
rebinding, not a compatibility or authorization verdict. Keep other drivers
quiescent while preparing and applying the migration.

The plan JSON contains:

```json
{
  "sourceRuntime": "<source runtime SHA-256>",
  "sourceDefinitionHash": "<source definition SHA-256>",
  "sourceRevision": 3,
  "reason": "Rebind the unchanged definition after inspecting the runtime changes"
}
```

Use actual hashes and the exact current revision from read-only migration
inspection. `sourceRevision` is a nonnegative integer. Store the plan with the
task's existing recovery artifacts, preserving the source's evidence ownership.

After checking the identities, control meaning and existing authorization, apply
the plan:

```sh
node "$SKILL_ROOT/run.mjs" migrate <source.sqlite> <new-destination.sqlite> <instance> <plan.json>
node "$SKILL_ROOT/run.mjs" machine <new-destination.sqlite> inspect <instance>
```

Migration creates a **new destination SQLite store**, refuses to overwrite an
existing destination, and leaves the source unchanged. It preserves the selected
instance ID, objective, state, facts, stopped status and operations, increments
its revision once, binds its unchanged definition to the target runtime, and
records `runtime_migrations` lineage. Both sides must use XState 5.33.3; an already compatible source is refused. It does
not migrate a changed definition, resolve an unknown operation, resume a stopped
task or copy/authenticate external evidence artifacts.

After migration, inspect the destination and compare its definition, objective,
state, facts and operations with the source. Record the new database path and
revision in the task handoff. Keep the source as recovery evidence and explicitly
select the destination for further work; two stores are not synchronized.
Reconcile outstanding outcomes before advancement, and resume only within the
continuing task authorization and limits.
