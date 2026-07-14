# Context Map

This repository has more than one documentation context. Route each fact to its
single authority instead of copying it between documents.

## Contexts

- [D&D/SRD language](UBIQUITOUS_LANGUAGE.md) — rules and game-domain terms.
- [Cleanroom SDK](docs/cleanroom/CONTEXT.md) — terms for deploying and evaluating
  independent Target SDK work.

## Related authorities

- [Architecture](ARCHITECTURE.md) and accepted ADRs own stable system structure
  and ownership.
- [Modeling assumptions](ASSUMPTIONS.md) own choices where RAW is silent or
  ambiguous.
- The owning package's `README.md`, `VOCABULARY.md`, or architecture document
  owns package-local technical vocabulary and boundaries.
- The accepted specification owns work-specific requirements and acceptance.
  Cleanroom Harness instructions tell the AI agent how to act on that contract.

## Relationships

- D&D/SRD language and modeling assumptions supply rules meaning to the
  Cleanroom Core.
- Cleanroom SDK terms name how the Harness, Core, Adapter, Oracle, and Target
  relate without redefining D&D rules or Target architecture.
- Architecture implements and constrains those relationships without becoming
  a second glossary or RAW-assumption owner.

`docs/cleanroom/CONTEXT.md` is a glossary, not an architecture document, task
ledger, specification, or acceptance checklist. Wayfinder decision artifacts
remain historical evidence after their accepted facts are promoted to the owner
above; they are not updated as a second authority.
