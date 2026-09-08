# Explicit call results

`dnd/explicit-call-results` requires calls to be consumed or explicitly discarded
with a typed `const`, such as `const _logged: void = log()`. The annotation makes
a changed return contract a TypeScript error. Ordinary unused results still fail
`@typescript-eslint/no-unused-vars`; there is no global underscore exemption.

The rule also checks discarded awaited values, optional calls, sequences, `void`
expressions, loop expressions, and callback returns whose contextual
return type erases the result to `void`. Assertion functions and `never` calls
retain statement form because TypeScript uses it for control-flow analysis.

The rollout scope is owned by [`eslint.config.mjs`](../../eslint.config.mjs).
Expand that scope as callers are migrated; do not suppress violations with casts
or dummy uses. Explicit discard does not replace semantic validation: execution
must still consume the narrowed data returned by a successful resolver.

Run `pnpm check:explicit-call-results:self-test`. The milestone gate runs these
rule tests before lint. Fixtures use an in-memory TypeScript program and check
both lint findings and compiler behavior.
