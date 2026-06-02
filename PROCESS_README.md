# QA Validation Pipeline

This document used to describe the root-QNT community Q&A assertion pipeline.
That lane is retired.

The old pipeline generated Quint assertions from classified community Q&A and
ran them against archived root restore material. Those root QNT files and the
generated root artifact have been removed from the worktree to keep active
search and review focused on package-local specs.

Active verification is documented in:

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [docs/adr/0001-forest-of-qnt-slices.md](docs/adr/0001-forest-of-qnt-slices.md)
- [scripts/qa/QA_README.md](scripts/qa/QA_README.md)

The Q&A corpus download, parse, and classification scripts remain available for
research. The assertion generator and runner intentionally reject normal use
until a future task rewires them to package-local QNT authority.

Historical details are available from git history.
