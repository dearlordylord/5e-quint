# Context Map

This repository has more than one documentation context. Route each fact to its
single authority instead of copying it between documents.

## Contexts

- [D&D/SRD language](UBIQUITOUS_LANGUAGE.md) — rules and game-domain terms.
- [Cleanroom SDK](docs/cleanroom/CONTEXT.md) — terms for deploying and evaluating
  independent Target SDK work.
- [Mushroom Playbook](docs/mushroom-playbook/CONTEXT.md) — terms for the public
  Mushroom corpus and its private authoring relationships.
- [Ralph tooling](docs/tooling/ralph/CONTEXT.md) — terms for repository delivery
  orchestration, separate from the main application.

## Related authorities

- [Main-application architecture](ARCHITECTURE.md) and accepted ADRs own stable
  product-system structure and ownership.
- [Ralph tooling architecture](docs/tooling/ralph/ARCHITECTURE.md) owns stable
  delivery-orchestration structure and ownership.
- [Modeling assumptions](ASSUMPTIONS.md) own choices where RAW is silent or
  ambiguous.
- [Mushroom Playbook authoring policy](docs/mushroom-playbook/AUTHORING.md) owns
  the standing public/private identity, fidelity, and expression boundary.
- The owning package's `README.md`, `VOCABULARY.md`, or architecture document
  owns package-local technical vocabulary and boundaries.
- The accepted specification owns work-specific requirements and acceptance.
  Cleanroom Harness instructions tell the AI agent how to act on that contract.

## Relationships

- D&D/SRD language and modeling assumptions supply rules meaning to the
  Cleanroom Core.
- Cleanroom SDK terms name how the Harness, Core, Adapter, Oracle, and Target
  relate without redefining D&D rules or Target architecture.
- Main-application architecture implements and constrains those relationships
  without becoming a second glossary or RAW-assumption owner.
- Mechanical Correspondence is private Mushroom authoring evidence; it is not
  D&D/SRD language, public provenance, or a Cleanroom runtime relationship.
- Ralph tooling may inspect and change the repository while delivering work,
  but it does not define D&D rules, product runtime semantics, authored content,
  or main-application architecture.

Context documents are glossaries, not architecture documents, task ledgers,
specifications, or acceptance checklists. Wayfinder decision artifacts remain
historical evidence after their accepted facts are promoted to the relevant
application or tooling owner above; they are not updated as a second authority.
