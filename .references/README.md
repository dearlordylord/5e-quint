# Public Reference Corpus

This directory contains redistributable or explicitly approved public reference
material used by the project. Presence here does not make a structured input the
canonical rules source or establish provenance for shipped content; each owning
package and collection boundary must state its own provenance.

The local SRD 5.2.1 corpus is the working RAW authority for rules-facing work.
Other tracked research inputs are non-runtime references and must retain their
own license and source constraints.

The spell-markdown audit requires an untracked Open5e API checkout at
`.references/structured-inputs/open5e-api/`. Its expected input is
`data/v2/wizards-of-the-coast/srd-2024/Spell.json`. This is structured input for
normalization and cross-checking only; it is not provenance or RAW authority.

PHB+ structured input, Mechanical Correspondence, and non-public authoring or
review evidence are owned exclusively by the access-controlled Private
Authoring Repository. They must not be copied into this directory, linked as a
submodule, or read by public builds and runtime code. The standing boundary is
owned by
[`docs/mushroom-playbook/AUTHORING.md`](../docs/mushroom-playbook/AUTHORING.md).

Untracked downloads and local checkouts are ignored by default. Ignoring a path
is not permission to place private authoring material in the public worktree.
