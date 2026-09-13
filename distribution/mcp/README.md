# D&D MCP

Run the SRD 5.2.1 MCP server over stdio with Node 22.19 or later:

```sh
pnpm dlx @dearlordylord/dnd-mcp
```

For reproducible agent configuration, pin an explicitly released version:

```json
{
  "mcpServers": {
    "dnd": {
      "command": "pnpm",
      "args": ["dlx", "@dearlordylord/dnd-mcp@0.1.0"]
    }
  }
}
```

The package bundles the existing stdio server; pnpm installs its external Redis
dependency. Bundled dependency licenses are included in
`dist/THIRD-PARTY-NOTICES.txt`.
See [MCP usage](https://github.com/dearlordylord/5e-quint/blob/master/packages/mcp/README.md)
for tools and supported journeys. Hosted HTTP deployment and OAuth configuration
have a separate operational workflow in the repository.

Code: Apache 2.0. Included SRD material: CC BY 4.0. See LICENSE and NOTICE.
