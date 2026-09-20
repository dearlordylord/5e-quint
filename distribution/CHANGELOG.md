# Release notes

## 0.1.3

- Tighten battle lifecycle and attack-outcome contracts, including death-save
  and hit-point transitions, and derive multiple D20 selection from its roll
  mode and faces.
- Harden surface trace IDs, finalize dependency traces through a typed Result
  before rendering, and retain MCP character/session output validation at the
  public boundaries.

## 0.1.2

- Release the current SDK and MCP packages.

## Unreleased

- Explain the MCP player experience, client setup, and local session limits in
  the package README, and correct the example pin to published version 0.1.1.

## 0.1.1

- Add npm discovery keywords to the SDK and MCP packages.

## 0.1.0 — unreleased

- Package the existing SRD runtime APIs as `@dearlordylord/dnd-sdk`, with ESM
  JavaScript and TypeScript declarations.
- Package the existing stdio server as `@dearlordylord/dnd-mcp` with the
  `dnd-mcp` executable.
- Add isolated packed-consumer verification and a shared-repository release
  command. Existing rule-support limits remain unchanged.
