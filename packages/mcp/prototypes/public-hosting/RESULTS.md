# Public hosting prototype results

Measured 2026-08-25 on Linux arm64 with 12 logical CPUs and Node 22.22.2 for
the server. These are bounded compatibility measurements, not production load
tests. The exact prototype is captured only on branch
`prototype/plugin-hosting-model`.

## Common protocol result

Both the Node and local Cloudflare Workers lanes initialized the canonical
protocol server, advertised all 24 tools, and called `list_catalog_units`.
The advertised tool catalog was 539,517 bytes and the representative catalog
result was 58,995 bytes. No stateful Play Session operation was used.

The web-standard SDK transport requires a new stateless transport per HTTP
request. The prototype shares immutable application services, then creates a
fresh protocol server and transport for each request; it does not treat MCP
transport state or the current in-memory Play Session registry as durable.

## Node 22 / container-shaped lane

The esbuild output contained 1,773 source inputs and measured:

| Measurement                      |          Result |
| -------------------------------- | --------------: |
| Bundle                           | 7,996,518 bytes |
| Bundle gzip                      | 1,297,086 bytes |
| Cached start to listening socket |        3,207 ms |
| Resident memory after a probe    |      309-317 MB |
| Warm three-request server CPU    |    550-1,270 ms |
| Warm initialize wall time        |      285-375 ms |
| Warm `tools/list` wall time      |  1,001-1,406 ms |
| Warm catalog-call wall time      |       89-139 ms |

The Dockerfile is a standard Node 22 slim packaging shape. No container engine
was installed in the environment, so the same bundle was executed directly
under the installed Node 22.22.2 runtime rather than claiming an unobserved OCI
run. The intended Hetzner SSH target was visible but the environment denied the
connection; live deployment access remains an operator prerequisite in #354.

## Cloudflare Worker lane

Wrangler 4.125.0 produced an 8,410.82 KiB upload and 1,343.10 KiB gzip bundle.
The bundle fits both the current 3 MB compressed Free limit and 10 MB compressed
Paid limit. `wrangler check startup` measured a 1,696.0 ms local startup window,
including 1,608.2 ms active CPU and 278.6 ms garbage collection. Cloudflare's
limit is 1 second; Wrangler warns that local and production CPUs differ, so this
is a failed confidence gate rather than a claim about an unobserved production
deployment error.

The local workerd proof completed initialization, `tools/list`, and the catalog
call in 1,879 ms, 4,649 ms, and 460 ms respectively. The workerd process reached
approximately 368 MB RSS after the probe, while Workers allow 128 MB per
isolate. Process RSS is not identical to isolate heap accounting, but both it
and the 309-317 MB Node process are materially above the platform ceiling. A
remote deploy was not attempted because no Cloudflare credential was present.

These limits and prices were checked against Cloudflare's current
[Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
and [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/).

## Pages Functions lane

`wrangler pages functions build` compiled the same handler successfully. Its
generated Worker was 10,014,951 bytes (1,518,382 bytes gzip). Pages Functions is
Workers compute with the same billing and isolate limits; its value here is only
website routing/co-location, and its wrapper does not improve startup or memory.

## Traffic and cost model

One measured probe makes three MCP HTTP requests: initialize, list tools, and
one catalog call. The two warm Node runs consumed 0.55-1.27 CPU seconds in the
server, or approximately 0.18-0.42 CPU seconds per measured request. The listed
response bodies total about 599 KB per three-request probe before HTTP
compression.

| Monthly MCP requests |   Approx. server CPU | Approx. uncompressed response traffic |
| -------------------: | -------------------: | ------------------------------------: |
|               10,000 |   0.5-1.2 core-hours |                                  2 GB |
|            1,000,000 |    51-118 core-hours |                                200 GB |
|           10,000,000 | 509-1,176 core-hours |                                  2 TB |

These figures are deliberately formulas from the measured request mix, not a
capacity promise. Production caching, persistent transport sessions, protocol
construction, concurrency, and the stateful workload need their own load test.

The existing Hetzner machine has an operator-known fixed monthly bill, so its
incremental hosting cost is zero while spare CPU, memory, disk, and included
traffic remain available; the allocated cost is that bill or an agreed share of
it. As a replacement-price reference, Hetzner's 2026 adjustment lists a CAX11
(2 shared ARM vCPU, 4 GB RAM, 40 GB disk) at EUR 5.99/month excluding VAT and
IPv4, and a CAX21 (4 vCPU, 8 GB) at EUR 10.49/month. EU cloud instances include
at least 20 TB traffic. See the official
[2026 price adjustment](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/)
and [current cloud shape](https://www.hetzner.com/cloud/cost-optimized).

Workers would start at USD 5/month on Paid, including 10 million requests and
30 million CPU milliseconds, then charge USD 0.30 per additional million
requests and USD 0.02 per additional million CPU milliseconds. That attractive
request pricing does not override the measured startup and memory hard-gate
risk.

## Verdict

Select a conventional Node 22 container on a provider-neutral Linux host for
the first public release, using the existing Hetzner machine if #354 confirms
capacity and deployment access. This is the only candidate that passed the
canonical-server compatibility proof without a platform hard-limit conflict.
It also gives the durable-state work a conventional transactional store and
keeps local development aligned with stdio and Secure MCP Tunnel.

Do not select native Workers or Pages Functions for the current server shape.
They may be reconsidered only after a production change demonstrates startup
below one second and isolate memory below 128 MB using the complete canonical
tool catalog. Such a future optimization must not split tools, catalogs,
authentication, or Play Session ownership merely to fit a host.
