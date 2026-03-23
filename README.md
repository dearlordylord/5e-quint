# D&D 5e Quint Specification

Formal specification of D&D 5e PHB combat and character mechanics in [Quint](https://github.com/informalsystems/quint).

- `dnd.qnt` — spec (types, pure functions, state transitions)
- `dndTest.qnt` — unit tests
- [`UBIQUITOUS_LANGUAGE.md`](UBIQUITOUS_LANGUAGE.md) — domain glossary (D&D 5e PHB terms used across spec, machine, and codebase)

## QA Corpus Validation

Community Q&A from RPG Stack Exchange and r/dndnext is used to generate test assertions against the spec. See [`scripts/qa/QA_README.md`](scripts/qa/QA_README.md).

## License

Licensed under the [Apache License 2.0](LICENSE).

This project formalizes mechanics from the [System Reference Document 5.1](https://www.dndbeyond.com/resources/1781-systems-reference-document-srd), &copy; Wizards of the Coast LLC, available under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). See [NOTICE](NOTICE) for full attribution.
