# D&D 5e Quint Specification

Formal specification of D&D 5e PHB combat and character mechanics in [Quint](https://github.com/informalsystems/quint).

- `dnd.qnt` — spec (types, pure functions, state transitions)
- `dndTest.qnt` — unit tests
- `CLAUDE.md` — project conventions
- [`UBIQUITOUS_LANGUAGE.md`](UBIQUITOUS_LANGUAGE.md) — domain glossary (D&D 5e PHB terms used across spec, machine, and codebase)

## QA Corpus Validation

Community Q&A from RPG Stack Exchange and r/dndnext is used to generate test assertions against the spec. See [`scripts/qa/QA_README.md`](scripts/qa/QA_README.md).
