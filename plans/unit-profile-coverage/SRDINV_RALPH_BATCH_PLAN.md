# SRD Inventory Ralph Batch Plan

This plan turns the generated SRD Unit inventory into a Ralph-executable task
sequence. It is SRD-only and starts with level-1 class pressure.

Source artifacts:

- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`
- `.references/srd-5.2.1/Classes/`

The SRD inventory lane is independent from QMBT. QMBT is used only if a later
task promotes battle-runtime behavior that needs QNT/runtime parity.

## Batch Shape

The generator emits `recommendedBatches` and the Markdown report renders them
under `Recommended Ralph Batches`. `ACTIVE_PLAN.md` mirrors those generated
batches so Ralph can execute them.

Current sequence:

- `SRDINV1`: classify installed level-1 owner evidence.
- `SRDINV2`: author or explicitly close missing level-1 class containers.
- `SRDINV3`: classify missing level-1 class feature rows.
- `SRDINV4`: classify level-1 character-creation/progression rows.
- `SRDINV5A`: classify level-1 class Spellcasting/access rows.
- `SRDINV5B`: classify missing cantrip and level-1 Spell Unit rows.
- `SRDINV5C`: classify installed cantrip and level-1 Spell Unit owner
  evidence.
- `SRDINV5D`: review catalog-only cantrip and level-1 Spell Unit rows.
- `SRDINV6`: review nonspell catalog-only/dead-for-now and Surface-widening
  rows.
- `SRDINV7`: recursive review and append the next concrete multi-task batch,
  or explicitly close level-1 with final metrics.

The spell-pressure rows are split into `SRDINV5A` through `SRDINV5D` because
class spell access, missing Spell Unit records, installed Spell Unit evidence,
and catalog-only Spell Unit closure are different decisions with different
acceptance criteria.

Each generated task should have one coherent decision shape. Do not combine
unrelated authoring, admission, runtime-support, and closure decisions just
because they all mention spells.

`SRDINV1` is intentionally first because installed/catalog-loaded rows should
not imply full support. It must decide which installed rows need operational
owner evidence and which can be explicitly closed as catalog-only/dead-for-now.

QMBT68/QMBT69 are deliberately deferred while this lane is active. The next
Ralph-ready task should be `SRDINV1`, not the older QMBT projection-cleanup
queue.

## Acceptance Model

Each batch should keep the generated inventory measurable:

- stable row ids remain stable;
- rows do not disappear silently;
- every row has one final disposition;
- `needs-surface-widening` rows name the missing Surface construct;
- supported operational behavior has owner-specific evidence;
- catalog-only/dead-for-now rows are allowed when explicitly counted.
- recursive review never appends only one recursive continuation task. If
  level-1 is not complete, it must append a concrete batch set with at least
  three specific follow-up tasks, grouped by mechanics family, owner boundary,
  or Surface-widening blocker.

Run:

```sh
pnpm unit-profile-coverage:check
```

Regenerate after intentional inventory changes:

```sh
node scripts/unit-profile-coverage-check.cjs --write
```
