# 14. Bundled SRD Data Corpus

## Idea

Keep a machine-queryable rules/content corpus in-repo so support code and tests can share canonical fixtures.

## Current Fit In This Repo

- the repo already includes `.references/srd-5.2.1/`.
- `spell-registry.ts`, class tables, and type-level arrays already encode a large amount of machine-readable SRD structure.

## Application To Our Code

The real opportunity is fixture generation, not authority replacement.

Good uses:

- derive test fixtures for modeled spells and classes
- validate registry completeness against the local SRD corpus
- improve coverage reports for what is modeled in TS versus generic in Quint

Bad use:

- turning raw content files into the semantic authority for combat rules

## Quint Impact

Low. The spec should continue to model mechanics, not bulk content.

## Domain Language Impact

Moderate. Better machine-readable SRD data can sharpen names and reduce drift between docs and code.

## Recommendation

Adopt only as support infrastructure. Helpful for tests and coverage, not a major architecture change.
