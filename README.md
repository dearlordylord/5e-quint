# D&D 5e SRD rules engine

A TypeScript workspace for executable D&D 5e rules based on SRD 5.2.1. It
includes authored content, character and battle reducers, Quint specifications,
MCP tools, and a React app.

The reducers consume typed rules facts and return the next state, explicit
caller decisions, or typed rejections. Focused Quint models, proofs, and
model-based tests check the same rule procedures without treating one
whole-game model as the verification boundary.

## Get started

The workspace pins Node.js 24 in [`mise.toml`](mise.toml) and pnpm 10.29.3 in
[`package.json`](package.json).

```sh
pnpm install
pnpm dev
```

The app runs at <http://localhost:3000>.

## Packages

- Content and rules: [`@dnd/surface`](packages/surface/README.md),
  [`@dnd/shared`](packages/shared/README.md), and
  [`@dnd/shared-algebras`](packages/shared-algebras/README.md).
- Runtimes:
  [`@dnd/character-creation-runtime`](packages/character-creation-runtime/README.md),
  [`@dnd/character-sheet-runtime`](packages/character-sheet-runtime/README.md),
  [`@dnd/character-battle-runtime`](packages/character-battle-runtime/README.md),
  and [`@dnd/battle-runtime`](packages/battle-runtime/README.md).
- Interfaces: [`@dnd/mcp`](packages/mcp/README.md) and
  [`@dnd/app`](packages/app/README.md).
- Standalone geometry:
  [`@dnd/tactical-space`](packages/tactical-space/README.md).

See [Architecture](ARCHITECTURE.md) for package responsibilities, dependency
direction, and runtime boundaries.

## Verify changes

```sh
pnpm test       # workspace tests
pnpm typecheck  # TypeScript checks
pnpm proof:qnt  # Quint proof and parity lanes
pnpm quality    # complete repository quality gate
```

The complete quality gate also checks builds, authored-content boundaries, the
rules-kernel and Unit-profile registries, lint, complexity, duplication,
circular dependencies, and test coverage.

Coverage has three separate views:

- [RAW coverage](plans/raw-coverage/README.md) classifies local SRD spans and
  traces covered requirements to executable owners. Check it separately with
  `pnpm raw-coverage:check`.
- [Rules-kernel coverage](plans/rules-kernel-coverage/README.md) tracks reducer
  semantics and their Quint/runtime witnesses.
- [Unit-profile coverage](plans/unit-profile-coverage/README.md) tracks authored
  content supported by those procedures.

## Documentation

- [Context map](CONTEXT-MAP.md) — find the document that owns a domain fact.
- [Ubiquitous language](UBIQUITOUS_LANGUAGE.md) — D&D and SRD terminology.
- [Modeling assumptions](ASSUMPTIONS.md) — choices where the SRD is silent or
  ambiguous.
- [Contributor instructions](AGENTS.md) — implementation and verification
  rules.
- [QNT and MBT guide](docs/agents/QNT-MBT.md) — safe proof and model-based test
  workflows.

## Content and license

Public content is redistributable SRD 5.2.1 material or original synthetic
content. This repository does not publish non-SRD official identity or book
text. See the [content architecture](ARCHITECTURE.md#content-scope-and-licensing)
and [Mushroom authoring policy](docs/mushroom-playbook/AUTHORING.md).

Code is licensed under the [Apache License 2.0](LICENSE). SRD 5.2.1 content is
available under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/),
&copy; Wizards of the Coast LLC. See [NOTICE](NOTICE) and the
[local corpus attribution](.references/srd-5.2.1/ATTRIBUTION.md).
