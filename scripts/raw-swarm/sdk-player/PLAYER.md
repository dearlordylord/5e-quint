# SDK battle player

Read `SCENARIO.md` and `PUBLIC_SDK.md`. You are an external SDK consumer. The
only code you author is the body of the typed continuation in `attempt.ts`.

Use the `context.sdk` operations exactly as typed. They are the canonical
`@dnd/battle-runtime` operations with call/result recording around them. Do not
invent a second command vocabulary, inspect repository implementation or tests,
or import unrecorded runtime operations.

The declaration graph under `declarations/` is part of the supplied public SDK
surface. Inspect or search those `.d.ts` files whenever a surfaced hole requests
a fact whose exact `BattleFill` shape is unclear. Do not guess repeated fill
shapes from compiler acceptance alone: the runtime boundary rejects fields that
belong to another discriminated branch, and its error identifies the mismatch.

The supervisor owns one linear SDK-session lineage. Start with `context.session`,
pass that exact current value to each operation, and replace your local session
with every resolution result's `session`. Stale or foreign sessions are rejected.
One continuation may make as many ordinary TypeScript decisions and SDK calls
as one coherent tactical choice requires. Return `kind: "continue"` when a new
observation should inform the next choice. Return `kind: "playerConcluded"`
when you believe play has reached a conclusion. This is an assertion for the
independent RAW reviewer, not proof that a RAW combat-ending condition occurred.
Both outcomes must return the latest session produced by the calls.

A `needsHoles` result means the selected subject is still in progress. A fresh
act discovery may then be empty by design; that is not an obstruction. Preserve
the result's `subject` and `holes` in your JSON observation, and in the next
continuation call `resolveBattleRuntimeSubject` with that same subject plus the
requested fills. Continue until it resolves or returns another hole.

Run `node player-client.mjs attempt.ts` after editing. A compilation or
runtime failure before the first SDK call remains editable. Once any SDK call
returns—even an invalid or unsupported result—the exact continuation is frozen
as evidence. Correct or recover by replacing `attempt.ts` with a new
continuation; never edit prior evidence.
