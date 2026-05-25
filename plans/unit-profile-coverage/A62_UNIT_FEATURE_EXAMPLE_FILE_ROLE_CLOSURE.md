# A62 Unit Feature Example File Role Closure

Task: `A62-UNIT-FEATURE-EXAMPLE-FILE-ROLE-CLOSURE`

Status: closed with checker evidence.

This task is metadata-only. It does not add or change D&D rule modeling, QNT
semantics, Surface admission, or reducer behavior. No SRD rule text was modeled
in this task.

## Closure Evidence

`plans/rules-kernel-coverage/generator-readiness.jsonl` is the source of truth
for generator-readiness role at the obligation boundary. The
`BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` row is `generation-subset-clean`
and keeps feature example and inductive files out of `semanticCore`; those files
are classified in the row's `proofOnly` array. The attack, spell-save damage,
and zero-Hit-Point obligation rows repeat the same split for the feature cores
they share with battle damage obligations, so example and inductive files are
not generator input through those joined rows either.

`plans/rules-kernel-coverage/qnt-owner-roles.jsonl` classifies only covered
obligation QNT owners. Adding role rows for example files would be invalid:
the checker requires every owner-role row to point at a covered obligation QNT
owner. For example and inductive files, the durable role classification is
therefore the `proofOnly` field on the generator-readiness rows.

## Verification

Run:

```sh
pnpm rules-kernel-coverage:check && pnpm unit-profile-coverage:check
```

Expected result:

- `Rules kernel coverage OK: 97 obligations.`
- `Unit profile coverage OK: 257 Units, 132 profiles.`
