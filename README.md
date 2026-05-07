# D&D 5e SRD Runtime Workspace

D&D 5e SRD 5.2.1 runtime packages, Surface-authored content, MCP tools, and a
React frontend.

## What this is

A package workspace for the active runtimes:

```mermaid
graph TD
    SRD["SRD 5.2.1"] -.-> SURFACE["@dnd/surface authored Units and Stat Blocks"]
    SURFACE --> CCR["@dnd/character-creation-runtime"]
    SURFACE --> BR["@dnd/battle-runtime + battle-runtime.qnt"]
    CCR --> CSR["@dnd/character-sheet-runtime"]
    CSR --> CBR["@dnd/character-battle-runtime"]
    BR --> MCP["@dnd/mcp"]
    CCR --> MCP
    CSR --> APP["@dnd/app"]
    BR --> APP
```

> **Rules Aren't Physics.** The rules of the game are meant to provide a fun game experience, not to describe the laws of physics in the worlds of D&D. — _Dungeon Master's Guide_

## What's covered

**Battle runtime:** Unit/StatBlock-backed action resources, attack
flows, selected spells, Death Saving Throws, Knock Out lifecycle, battle
snapshots, and caller-owned hole/fill replay.

**Character runtimes:** character-creation choices, progression, sheet-session
projection, and character battle-entry projection.

**Also:** Surface-authored content records, shared reducer algebras, MCP
session workflows, React app routes, and QA corpus
([`scripts/qa/QA_README.md`](scripts/qa/QA_README.md)).

## How the layers work

**Surface** (`packages/surface`) — source-authored records and projection
contracts for Units, Stat Blocks, spells, class features, and related content.

**Battle runtime** (`packages/battle-runtime`) — Unit/StatBlock-backed battle
reducer behavior. `packages/battle-runtime/battle-runtime.qnt` is the active
battle proof/spec authority.

**Character runtimes** (`packages/character-creation-runtime`,
`packages/character-sheet-runtime`, `packages/character-battle-runtime`) —
package-owned character build, sheet-session, and battle-entry projections.

**MCP and app** (`packages/mcp`, `packages/app`) — user-facing workflows over
the runtime packages.

**QA pipeline** (`scripts/qa/`) — community Q&A turned into Quint test assertions by LLM. See [`scripts/qa/QA_README.md`](scripts/qa/QA_README.md).

## Running It

```sh
pnpm quality                    # workspace lint, circular checks, and typecheck
pnpm test                       # workspace package tests
pnpm dev                        # React UI
```

## Archived v0

`packages/v0` is archived restore-source material and is intentionally outside
the active workspace. See `packages/v0/README.md`.

## SRD parity

The spec formalizes the SRD and nothing else — no homebrew, no licensed content. Where the formalization requires choices the SRD doesn't prescribe, those are documented in [`ASSUMPTIONS.md`](ASSUMPTIONS.md).

## License

Licensed under the [Apache License 2.0](LICENSE).

This project formalizes mechanics from the [System Reference Document 5.2.1](https://www.dndbeyond.com/resources/1781-systems-reference-document-srd), &copy; Wizards of the Coast LLC, available under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). See [NOTICE](NOTICE) for full attribution.

The `.references/srd/` directory contains SRD text in Markdown from [DND.SRD.Wiki](https://github.com/OldManUmby/DND.SRD.Wiki) by OldManUmby, also under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). See [`.references/srd/ATTRIBUTION.md`](.references/srd/ATTRIBUTION.md).
