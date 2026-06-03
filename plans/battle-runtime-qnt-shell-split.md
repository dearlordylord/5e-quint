# Battle Runtime QNT Shell Split

## Problem

`packages/battle-runtime/battle-runtime.qnt` still behaves like a one-battle
fixture shell: it imports much of the battle-runtime QNT forest and owns
some Fighter/Goblin fixture helpers. This conflicts with the documented
forest-of-slices direction and makes the broad shell look like the active
whole-battle authority.

## Direction

Retire the full shell as an architectural center. New and migrated behavior
should live in focused modules:

- reusable SRD procedure semantics in `packages/shared-algebras/proofs/rule-core/`;
- battle-runtime projection and bridge facts in focused `*.qnt`;
- bounded fixture helpers in scenario-specific fixture modules;
- parity evidence in focused `*.mbt.qnt` and `*.mbt.test.ts` witnesses.

## First Split

Moved Fighter/Goblin Hide/Search fixture helpers from `battle-runtime.qnt` to
`battle-runtime-hide-search-fixture.qnt`. The full-shell proof module that uses
those helpers now imports the focused fixture module directly.

## Next Candidates

1. Move remaining Fighter/Goblin fixture helpers out of `battle-runtime.qnt`
   into scenario-specific fixture modules named for the obligation they witness.
2. Convert old `battle-runtime-*-tests.qnt` modules that import
   `battleRuntime.*` to direct imports of focused modules.
3. Classify any remaining full-shell-only definitions as either model
   vocabulary, bridge projection, scenario fixture, or compatibility wrapper.
4. Once no proof module needs the broad shell, delete or reduce
   `battle-runtime.qnt` to an explicitly named compatibility module.

## Verification

- Run focused `quint test --backend typescript --match ...` for touched proof
  modules after each split.
- Run `pnpm check:mbt-driver-closure` after changing any `*.mbt.qnt` imports.
- For behavior changes, run the relevant focused MBT witness; reserve integrated
  battle MBT for completed high-risk reducer behavior changes.
- Before implementing or moving rule semantics, read the relevant SRD passage in
  `.references/srd-5.2.1/` and check `UBIQUITOUS_LANGUAGE.md`; confirm modeled
  rules still trace to specific SRD text.
- After significant changes, run the reviewer loop to convergence: RAW
  traceability, ubiquitous-language/domain language, architecture/connascence,
  and code-review checks. Fix every reasonable finding, explicitly reject only
  findings with a concrete reason, and repeat until no reasonable findings
  remain.
