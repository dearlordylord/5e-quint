# D&D 5e PHB — project notes

## SRD feature parity (CRITICAL)

The spec (`dnd.qnt`) is a **direct formalization of the SRD** — nothing more, nothing less. Every modeled rule must trace to a specific SRD passage. Do not invent mechanics, add interpretive extensions, or go beyond what the SRD text says. The only sanctioned deviations from RAW (Rules As Written) are documented in `ASSUMPTIONS.md`, curated by the project owner.

- **Model what the SRD says.** If the SRD doesn't define it, don't model it.
- **No homebrew, no "reasonable extensions."** If a rule is ambiguous or the formalization requires a choice the SRD doesn't prescribe, document it in `ASSUMPTIONS.md` — don't silently pick an interpretation.
- **ASSUMPTIONS.md is the sole record of modeling decisions** where the spec makes explicit what the SRD leaves implicit (e.g., turn boundaries, implied constraints, architecture-driven choices). Curated by the project owner, kept minimal and close to RAW.

## Quint parity (CRITICAL)

The XState machine (`machine.ts`, `machine-helpers.ts`) MUST maintain full parity with the Quint spec (`dnd.qnt`). The MBT bridge (`machine.mbt.test.ts`) via `@firfi/quint-connect` is the correctness proof — 50 traces × 30 steps comparing Quint and XState state field-by-field.

- **Never** add logic to the XState machine that diverges from the Quint spec without updating the spec first.
- **Never** "fix" XState behavior that the Quint spec models differently — update the spec or accept it as spec-level intentional.
- **Never** remove or rename context fields that the MBT bridge maps — check `machine.mbt.test.ts` before removing anything from `DndContext`.
- If a simplify/refactor changes behavior, the MBT tests MUST still pass. If they don't, the refactor is wrong.

## /simplify convergence

After significant changes, run `/simplify` repeatedly until it converges — i.e., each round finds fewer issues until no important fixes remain. Typical progression: round 1 catches dead code and obvious duplication; round 2 catches subtler issues (bugs, tautological invariants, missed dedup); round 3 should find nothing significant. If round N still finds real issues, keep going.

## Rules reference

**Current edition: SRD 5.2.1 (2024).** Archived: SRD 5.1 (2014) in `.references/srd/`.

`.references/srd-5.2.1/` — SRD 5.2.1 full text (Playing-the-Game.md, Rules-Glossary.md, Equipment.md, Classes/, Spells/, etc.)
`.references/srd-5.2.1-conversion/` — official 5.1→5.2.1 conversion guide (delta manifest)
`.references/srd/` — SRD 5.1 (2014, archived)
`.references/rules/` — D&D 5e PHB chapters as markdown (5.1 era)
