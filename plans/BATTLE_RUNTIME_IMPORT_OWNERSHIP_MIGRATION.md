# Battle Runtime Import Ownership Migration

## Goal

Make every battle procedure execution closure structurally unable to import
authored admission or presentation owners. The stable ownership rule lives in
[`packages/battle-runtime/README.md`](../packages/battle-runtime/README.md#admission-execution-and-presentation-ownership);
this file owns only the bounded migration queue derived from the executable
import graph.

Generate current shortest paths with:

```sh
node scripts/check-battle-runtime-import-ownership.cjs --audit-candidates
```

Do not begin generic primitive or reference branding in these tasks. Revisit
nominal hardening only after the import closure is clean and remaining invalid
constructions are concrete.

## Task 1 — Clean and protect weapon-attack-override admission

Extract the narrow admission actor/context and admitted-invocation contracts
currently imported through `battle-reducer.ts` and the mixed profile contract.
Thread the existing facts; do not duplicate battle state or create a second
profile registry. Add an admission-root gate mode that rejects presentation
owners while allowing dependencies on protected execution facts.

Done when `procedure-admission/weapon-attack-override.ts` has no path to
`battle-runtime-context.ts`, and the gate protects that admission root.

## Task 2 — Finish weapon-attack-override orchestration extraction

The tracer now isolates admission, its execution codec, and its procedure-owned
active-effect replacement transition. Move `discoverWeaponAttackOverrideCastAct`,
`resolveWeaponAttackOverride`, and its fill-set check from the mixed profile
module into the execution owner.
Extract only the narrow reducer state/result/interrupt interfaces needed to
avoid `battle-reducer.ts`; do not introduce adapters or parallel procedure
registries. Keep the existing admission function and profile registry entry as
the composition seam.

Done when the full weapon-attack-override execution implementation is under the
enforced root and the focused weapon override/rider test remains green.

## Task 3 — Isolate shared spell and active-effect execution vocabulary

Remove the direct authored-`Record` imports and the
`character-execution.ts -> battle-reducer.ts` edge by moving authored
invocation-derived shapes to admission and procedure-family execution facts to
execution owners. Move `persistent-armor-effect-facts.ts` out of the mixed
profile directory so `battle-init.ts -> character-battle-resources.ts` no
longer enters admission. Split the remaining execution types and codecs in
`active-effect/types.ts` and `active-effect/codecs.ts` away from their
`battle-reducer.ts`, registry, and runtime-context imports; keep the extracted
expiration and weapon-override leaves canonical rather than copying them.
Preserve canonical Surface mechanical vocabulary imports.

Done when `character-execution.ts`, `active-effect/types.ts`, and
`active-effect/codecs.ts` have no shortest path to an admission, presentation,
or legacy mixed owner and all three can be added as protected execution roots.

## Task 4 — Split spell admission and execution registries

Separate the current registry's `SpellRecord` admission traversal from its
execution classification, codec, discovery, and resolution lookups. Derive both
views from one procedure-keyed declaration so procedure strings and
completeness cannot diverge. Move the shared profile contract pieces to the zone
that owns them.

Done when `spells-resolve.ts` no longer imports `spell-procedure-profiles/profile.ts`
or reaches the authored admission registry, and its focused spell resolution
tests pass.

## Task 5 — Split state execution from session orchestration

Move session/context admission and presentation orchestration out of
`dispatcher.ts`, project its remaining `battle-action-options.ts` inputs at
admission, and leave a state-only reducer interface behind. Remove remaining
execution imports of the `battle-reducer.ts` compatibility aggregation module.

Done when the audit candidates no longer reach `battle-reducer.ts`,
`battle-composition-admission.ts`, or `battle-runtime-context.ts` through the
dispatcher/aggregation seam. This task blocks Task 6.

## Task 6 — Cut the creature-state fan-out

Split execution-only creature state queries from admission and presentation
joins. In particular, project authored `battle-action-options.ts` facts before
discovery and remove the `creature-state.ts` paths to the mixed spell registry
and `battle-runtime-context.ts` without duplicating retained state.

Done when `battle-discovery.ts`, `reducer-route.ts`, and `spells-resolve.ts`
have clean audited closures; add all three directories/files to the enforced
execution roots in the same change.

After Task 6, protect the clean `battle-discovery.ts`, `reducer-route.ts`,
`spells-resolve.ts`, and state-only dispatcher roots in the same change. Done
when the gate has no legacy mixed-owner rule left to enforce.

## Verification for every task

1. Trace every rules-facing behavior to the exact local SRD passage and confirm
   terminology against `UBIQUITOUS_LANGUAGE.md`; architecture-only moves must
   explicitly record that behavior was unchanged.
2. Run the import-ownership gate and its synthetic self-test, the focused package
   typecheck, and the smallest relevant deterministic runtime tests. Run focused
   MBT only after a behavior-changing implementation is complete.
3. Run RAW/ubiquitous-language, architecture/domain/connascence, and strict code
   review passes. Fix every reasonable finding and repeat until the loop
   converges; use at least two rounds for non-trivial changes.
4. Run the resource-bounded root `pnpm quality` and `pnpm test` before merge.
