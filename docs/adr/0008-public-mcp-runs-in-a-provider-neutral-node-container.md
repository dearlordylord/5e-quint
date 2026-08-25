---
status: accepted
---

# Public MCP runs in a provider-neutral Node container

The first public Oracle endpoint runs the canonical `@dnd/mcp` server as a
Node 22 OCI container on a conventional Linux host. The deployment may use the
existing Hetzner machine when its access and spare capacity are confirmed, but
neither the image nor the application contract depends on Hetzner. Moving the
same image to another container host remains an operational choice.

The public process exposes the standard MCP HTTP transport at an HTTPS `/mcp`
endpoint. It composes the same tool definitions and application services as the
stdio entrypoint. Stdio remains the local protocol-test and direct-development
boundary, and Secure MCP Tunnel remains the documented way to exercise a local
server from a remote plugin client. These are transport projections of one MCP
application, not separate catalogs or session owners.

Native Cloudflare Workers and the Pages Functions deployment shape are not the
initial production runtime. A bounded comparison using the complete canonical
24-tool catalog found that the Worker bundle fit the platform's compressed-size
limits and executed the representative stateless catalog flow under local
workerd. However, Wrangler measured startup above the platform's one-second
limit, and observed process memory for both the Worker and Node lanes was
materially above the Worker's 128 MB isolate limit. Process RSS is not isolate
heap accounting and local CPU is not production CPU, so these observations are
a failed deployment-confidence gate rather than a claim about an unperformed
remote deployment. Pages Functions uses the same Workers compute limits and did
not change that result. The reproducible prototype, measurements, formulas, and
current price references are preserved in commit `6063c9514` on the throwaway
`prototype/plugin-hosting-model` branch.

The container host owns process supervision, TLS ingress, rollout, and durable
storage availability. It does not own Play Session semantics, authentication,
tool definitions, or a host-specific state registry. `@dnd/mcp` retains the one
canonical recoverable Play Session representation required by
[ADR 0007](0007-public-play-session-tenure-and-ownership.md), and later
persistence work selects its transactional representation without exposing the
hosting provider in that contract.

The tradeoff is accepting conventional server operations and a fixed-capacity
host for the first release instead of a scale-to-zero edge runtime. This avoids
redesigning or partitioning the tool catalog and state model to satisfy one
provider's isolate limits. Workers may be reconsidered after the complete
canonical application demonstrates startup below one second and memory below
128 MB without splitting tools, catalogs, authentication, or Play Session
ownership.
