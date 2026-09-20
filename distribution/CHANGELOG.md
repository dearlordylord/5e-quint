# Release notes

## 0.2.0 — unreleased

- Publish the breaking Battle frontier contract: ordinary hole results expose
  the `replaySubject` that must be replayed and a required `pendingProcedure`.
  Turn-boundary procedures identify their ending actor, source turn, and
  requested occurrence, including incoming Death Saving Throw metadata.
- Extend the packed SDK and MCP consumers to exercise the public frontier
  contract through the character and Stat Block battle paths.

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
