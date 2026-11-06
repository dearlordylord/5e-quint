---
name: state-machine-workflow
description: Execute a user-selected task through persisted state-machine transitions when the user requests this mode, including “run this task as a state machine”, and resume that authorized task. Use for execution and maintained state graphs; a request only to explain or draw a machine does not select execution mode.
---

# State Machine Workflow

Use this skill's passive XState + SQLite controller in `scripts/`.
The assistant executes work and explicitly submits transitions; the controller
stores the definition and instance and checks transition requirements. It does
not execute tasks or contact providers. Preserve a missing or incompatible
store's recovery context rather than recreating it as a fresh task.

## Select and recover the task

Identify the selected objective, acceptance criteria, scope and applicable
limits from the conversation. A bare “continue” needs a trusted task reference.
An installed skill or an existing database does not select unrelated work.

Record the database path and instance ID in the response or handoff. On resume,
inspect that instance before acting. Recover its definition identity, state,
revision, facts, stop status and unresolved operations, then inspect the linked
evidence. Keep artifacts in their existing owners; store current facts rather
than maintaining a parallel task diary.

Resolve the actual directory containing this `SKILL.md` before running commands.
Use Node 24 or newer and install this skill's pinned dependencies once with
`pnpm --dir "$SKILL_ROOT" install --frozen-lockfile`, where `SKILL_ROOT` is that
absolute directory. Keep the shell working directory in the user's project.
The wrapper preserves it, so relative database, JSON and evidence paths belong
to the project rather than the installed skill. Keep stores under a project
local-data directory, such as `.local/task-machine.sqlite`.

```sh
node "$SKILL_ROOT/run.mjs" machine --help
node "$SKILL_ROOT/run.mjs" machine <db> inspect <instance>
node "$SKILL_ROOT/run.mjs" machine <db> graph <instance>
```

The current CLI usage and `scripts/schema.ts` own accepted syntax.

The graph command produces Mermaid text from the persisted machine. Show the
current state and stopped status alongside it. A work-item dependency graph or
an editable phase label cannot substitute for the persisted transition model.

For a read-only live terminal display, run `node "$SKILL_ROOT/run.mjs" watch
<db> <instance>`; `--once` prints one snapshot. For a requested browser view,
run `node "$SKILL_ROOT/run.mjs" view <db> <instance> 5210`, then provide the
reachable URL and verify it in a browser. Read [README visualization instructions](README.md#visualization)
for SSH and container access. These views observe the same persisted instance;
they neither execute work nor submit transitions.

## Define the control decisions

For a new task, read [definition and fact binding](references/definition.md), then
express the agreed control decisions in a declarative definition:
allowed states/events, transition targets, required evidence facts and terminal
states. Repeated work traverses the same definition; iteration facts identify
its current workload and attempt. Keep definition identity distinct from the
instance and supporting artifacts. Initialize only after the definition matches
the authorized task; initialize it with the definition JSON, instance ID and
objective, then inspect the created instance and graph:

```sh
node "$SKILL_ROOT/run.mjs" machine <db> init <definition.json> <instance> <objective>
```

Separate producing a check from accepting its result. A check can finish with
failure; only inspected passing evidence may satisfy acceptance or enable the
next growth step. Bind evidence to the relevant workload/build/attempt using
stored facts and transition requirements. Literal facts are submitted claims,
not measurements or proof that work happened. The assistant must inspect the
actual artifact before submitting them.

## Execute and verify

Before each unit of work, inspect the current instance and check remaining
limits and authorization. Execute the permitted work, inspect its result, and
submit the corresponding event with the observed revision:

```sh
node "$SKILL_ROOT/run.mjs" machine <db> send <instance> <revision> <event.json>
```

Read back the instance after mutation. A refused transition or revision conflict
requires inspecting current state and evidence before deciding the next event.
Preserve failed results and take the defined repair/recheck route. Keep guards
meaningful; changing the definition to bypass a failed gate is a scope decision,
not routine recovery. Use the controller interface for mutations.

## External operations, stopping and completion

Before an authorized external effect, use the controller's operation reservation
protocol and retain the operation identity. Reservation is bookkeeping, not
execution authorization. Reconcile an unresolved operation against an actual
provider receipt or authoritative artifact before another dispatch; a restart
or absent local acknowledgement does not prove that nothing happened. If the
outcome cannot be established, keep it unresolved and stop dependent work.
SQLite and the state machine do not make a remote effect exactly once.

```sh
node "$SKILL_ROOT/run.mjs" machine <db> reserve <instance> <revision> <operation> <request.json>
node "$SKILL_ROOT/run.mjs" machine <db> resolve <instance> <revision> <operation> <receipt.json>
```

A receipt contains `outcome` (`accepted`, `not-sent` or `failed`), a nonempty
`providerReference`, an `artifact` path and its SHA-256 `sha256`. Resolution checks
artifact bytes only; inspect what the artifact establishes about this operation.
Resolution records an outcome and unblocks control; it does not establish task
acceptance, provider authenticity or permission to retry. It remains available
while stopped so an outstanding outcome can be reconciled.

On user stop, limit exhaustion or a blocking unknown outcome, persist the stop
with the current revision and report unresolved work and the next safe action.
Resume only within the user's continuing authorization and applicable limits.
Persisted limits are descriptive unless a runtime check enforces them.

```sh
node "$SKILL_ROOT/run.mjs" machine <db> stop <instance> <revision>
node "$SKILL_ROOT/run.mjs" machine <db> resume <instance> <revision>
```

Stopped status is an independent persisted flag. Resuming does not resolve an
unknown operation. A runtime-source mismatch also refuses writes; inspection
remains available. Preserve the source store, then follow the
[runtime migration procedure](references/definition.md#runtime-migration) only
when runtime rebinding is authorized and its control meaning has been checked.
Use existing session authorization where applicable; migration does not establish
compatibility, accept old evidence or change the task's requirements.

A final state is a control result. Report completion only after inspecting the
objective's acceptance evidence; reaching a deadline or exhausting a quota does
not satisfy the objective. Include the database path, instance ID, current state
and material unresolved limitations in the final handoff.
