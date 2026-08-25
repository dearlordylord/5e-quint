# Public MCP operations

This directory owns the provider-neutral production boundary selected by
[ADR 0008](../../docs/adr/0008-public-mcp-runs-in-a-provider-neutral-node-container.md).
It runs the canonical Node 22 OCI image behind Caddy on any conventional Linux
container host. It has no Hetzner, Cloudflare, or other provider API dependency.

Staging and production must use different Compose project names, host names,
absolute state directories, TLS state volumes, environment files, and image
release records. `verify-config.sh` enforces the named environment suffixes and
immutable image digest before Compose reads the deployment.

## Deploy and smoke

Copy the matching `.env.example` outside Git, replace every placeholder, and
restrict it to the operator (`root:root`, mode `0600`). Create the selected
state directory independently, mode `0700`, and make it writable by container
UID 1000. Configure one host Caddy 2.10.2 with
`import /etc/caddy/conf.d/*.caddy`; staging and production then use distinct
loopback ports while sharing only this TLS ingress process. Build and publish
the image from the repository root, recording the
digest rather than a mutable tag:

```sh
docker build --build-arg DND_MCP_RELEASE=COMMIT \
  -f operations/public-mcp/Dockerfile -t registry.example/dnd-oracle:COMMIT .
docker push registry.example/dnd-oracle:COMMIT
operations/public-mcp/deploy.sh /etc/dnd-oracle/production.env
```

The release is baked into the image and `/version`; Compose cannot replace it,
so the smoke detects an image/release mismatch. The deploy verifies
configuration, installs and reloads the environment-specific Caddy route, pulls
the exact digest, waits for container health, checks the release and optional exact OpenAI challenge token, and runs
the complete guest newcomer journey through HTTPS `/mcp`. The official OpenAI
submission contract requires the challenge response to contain only the token
([OpenAI submission documentation](https://developers.openai.com/plugins/deploy/submission#domain-verification));
the application exposes it at `/.well-known/openai-apps-challenge` only when
`DND_OPENAI_APPS_CHALLENGE` is configured.

The same origin serves the provider-neutral publisher site at `/`, `/support`,
`/privacy`, and `/terms`. Keeping those pages beside `/mcp` makes the verified
publisher origin, public policy, and runtime release one deployment. The smoke
checks all four pages and requires `/version` to report the exact
`DND_MCP_PUBLISHER_NAME` configured for those pages. In publication mode that
name must be the verified publisher identity, not the development placeholder.
Their response Content Security Policy permits no script, style, image, font,
frame, form, or network source.

## Current Dokku host

The current host uses two isolated Dokku applications. `dnd-oracle-staging`
serves <https://dnd-oracle-staging.apps.loskutoff.com> for ordinary deployment
and development checks. `dnd-oracle` serves the production origin at
<https://dnd-oracle.apps.loskutoff.com> only after its publication prerequisites
pass. Each application has its own host storage directory mounted at the
container's canonical `/var/lib/dnd-oracle` path. Both use the same Node
container boundary through `operations/public-mcp/Dockerfile`; Dokku is a
deployment adapter, not an application dependency.

Deploy a checked-out `master` release from the repository root with:

```sh
pnpm deploy:mcp:dokku-staging
pnpm deploy:mcp:dokku-production
```

The commands create their local `dokku-oracle-staging` or
`dokku-oracle-production` remote when absent, update the release build argument,
push `HEAD` to the dedicated application, and require live HTTPS health,
release, publisher pages, and the complete guest newcomer journey to pass. They
ignore untracked files but refuse uncommitted tracked changes or a branch other
than `master`. Production additionally refuses to deploy until the application
reports `production`, publication mode is enabled, the publisher is no longer
the development placeholder, and the OpenAI domain challenge is configured.

After a production deployment, create the non-secret live-deployment evidence
consumed by the plugin package builder:

```sh
pnpm verify:mcp:dokku-publication \
  .artifacts/dnd-srd-oracle/deployment-attestation.json
```

The verifier checks the exact challenge response, protected-resource metadata,
authorization-server discovery, PKCE S256 and client registration support,
JWKS, release/publisher identity, public pages, and guest journey before writing
the attestation. It never writes the challenge, tokens, or OAuth credentials.
The operator needs an SSH key accepted by `dokku@49.13.172.86` and a trusted
host key. Metrics and publication credentials remain server configuration and
must not be copied into Git.

## Rollback

`deploy.sh` atomically promotes one release-history file only after the
candidate and its monitoring schedule pass smoke, and retains the preceding
immutable image, release, and storage format in that history. Roll back application code without
copying or relabeling Play Session state:

```sh
operations/public-mcp/rollback.sh /etc/dnd-oracle/production.env
```

Automatic rollback refuses a different storage format, waits for health, and
repeats the same smoke. Before a release that
changes the SQLite format, stop the MCP container and take a storage snapshot
with the host's normal volume/snapshot facility; document restoration testing
for that release. Never restore an old database merely to roll back compatible
application code.

## Observe and respond

The process emits one redacted JSON span per request with a generated trace and
span id, bounded route, canonical tool name when known, HTTP status, outcome,
duration, release, and environment. It never records request arguments,
response content, bearer tokens, guest grants, Play Session ids, principal ids,
or challenge tokens. Caddy emits JSON access logs. `/metrics` requires the
constant-time-compared bearer token and exposes bounded request/outcome/tool
counters plus duration, process CPU, RSS, and uptime. Collect host filesystem
usage and ingress/egress byte counters beside these process metrics; do not copy
application session facts into the telemetry system.

For an incident, first record `/version`, the failing trace id, health, container
restart count, CPU/RSS, state-volume free space, SQLite size, ingress bandwidth,
and the bounded error outcome. Roll back when the failure follows a release and
the prior image can read the current storage format. Preserve the database and
redacted logs; never paste session bodies or credentials into an incident.

## Budget alert

After a candidate passes smoke, `deploy.sh` installs the versioned budget
scripts and environment file beneath a deployment-unique, environment-specific
release path,
atomically advances only that environment's operations symlink, installs the
checked-in environment-specific systemd unit/timer, reloads systemd, and enables
that timer. If installation fails, deployment restores both the serving image and
the environment's monitor symlink to the recorded last-known-good release. The
timer runs `collect-budget-measurement.mjs` every five minutes. It
accumulates process request/CPU counters across restarts, peak container memory,
state-directory bytes, container ingress+egress bytes, and the configured fixed
monthly host cost into a calendar-month record. `budget-monitor.sh` validates
that record against the policy and delivers a redacted JSON email through the
host's standard `sendmail` interface. The deployment contract test exercises
the idempotent installation paths without requiring a live systemd host.
Deploy and rollback hold the same environment-scoped operation lock for their
complete transaction, so two operators cannot race the history or monitor
pointer. After history promotion, deploy removes the exact operations snapshot
that fell outside the current-and-previous rollback window, including its stale
credential copy. A post-commit cleanup failure emits an explicit warning without
misreporting the already-committed deployment as failed; correct the directory
permissions and remove only the warned retired path.

The checked-in thresholds are initial caps, not provider prices. Replace them
with measured capacity and the actual fixed-host invoice before production.
Set `DND_MCP_PUBLICATION_MODE=enabled` only with the exact challenge and complete
OAuth configuration; validation then fails closed if either publication
boundary is missing. DNS/TLS deployment, live
smokes, storage snapshots, the recipient, and alert delivery require operator
access and cannot be evidenced from this checkout.
