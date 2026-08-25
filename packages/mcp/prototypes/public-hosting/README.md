# Public hosting prototype

**Throwaway prototype:** this directory answers whether the canonical MCP
protocol server can run behind web-standard HTTP on candidate hosts. It is not a
production transport or persistence owner and must not merge to `master`.

The prototype deliberately calls only stateless catalog tools. The current
process-local Play Session registry proves nothing about public durability.

## Node / Hetzner-shaped lane

```sh
pnpm exec esbuild packages/mcp/prototypes/public-hosting/node.ts \
  --bundle --platform=node --format=esm --target=node22 \
  --outfile=/tmp/public-hosting-prototype.mjs
pnpm exec tsx packages/mcp/prototypes/public-hosting/node.ts
pnpm exec tsx packages/mcp/prototypes/public-hosting/probe.ts \
  http://127.0.0.1:8787/mcp
```

## Cloudflare Worker lane

```sh
pnpm dlx wrangler@4 dev \
  --config packages/mcp/prototypes/public-hosting/wrangler.jsonc
pnpm exec tsx packages/mcp/prototypes/public-hosting/probe.ts \
  http://127.0.0.1:8788/mcp
```

`pages/functions/mcp.ts` is the corresponding Pages Functions routing shape.
Pages Functions executes on the Workers runtime, so it is not a third compute
candidate.

The captured measurements and verdict are in [`RESULTS.md`](RESULTS.md).
