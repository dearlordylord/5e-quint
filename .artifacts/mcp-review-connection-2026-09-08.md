# MCP review connection investigation

Observed 2026-09-08, 02:23–02:32 UTC.

Production endpoint: https://dnd-oracle.apps.loskutoff.com/mcp
Production release: `781379abf49e27fca3d506849140f2ad97220e29`.
Diagnostic checkout base: `dd1350f81b72111d4a58fd8b8d28dbf4346db4ea`, with
the uncommitted publication-scope and smoke-test changes from this investigation.

## Evidence

- HTTPS health and version: HTTP 200.
- MCP initialize: HTTP 200, approximately 0.73 seconds.
- MCP tools/list: HTTP 200, 577,911 bytes, approximately 1.20 seconds.
- Container inspected as healthy, started August 26, zero restarts, and
  `OOMKilled=false`. This snapshot does not establish uninterrupted historical
  DNS, TLS, network, or authentication availability.
- Before this investigation's authorization smoke, production ingress showed
  four authorization requests at 01:48:55, 02:03:09, 02:03:53, and 02:04:10 UTC
  requesting only `play-sessions`, followed by successful token responses and
  four HTTP 400 user-info responses.
- The strengthened authorization smoke reproduced HTTP 400 `invalid_scope`
  from production user-info using a freshly issued resource-only token.
- The same production smoke passed with `openid email play-sessions`, including
  signed ID-token validation, user-info, authenticated MCP access, saving,
  listing, deleting, and isolation between two synthetic vaults. The separate
  refresh-token flow also passed.
- The pre-change complete authorization smoke passed against staging.
- Focused publication-package and OAuth smoke-support tests: 12 passed.
- Focused ESLint and `git diff --check`: passed.
- `pnpm --filter @dnd/mcp typecheck`: passed.
- Repeated implementation review found no remaining reasonable findings:
  scope ownership is canonical, portal input is checked at the boundary, and
  identity scopes remain separate from MCP tool permissions. No RAW, Quint,
  game-rule semantics, or saved-session ownership behavior changed.

Commands:

```sh
DND_MCP_SAVED_SESSION_URL=https://dnd-oracle.apps.loskutoff.com/mcp \
  pnpm --filter @dnd/mcp smoke:saved-session-authorization
pnpm --filter @dnd/mcp exec vitest run \
  src/plugin-publication-package.test.ts \
  src/saved-session-authorization/oauth-smoke-support.test.ts
```

The smoke used synthetic OAuth clients and vaults and deleted its saved Play
Session. It did not change the production release, portal settings, existing
users' sessions, or send an appeal or resubmission.

## Finding and remediation

There is a reproducible OAuth client-scope mismatch. Token issuance succeeds
with `play-sessions`, but OpenID user-info requires `openid`. Our supported
ChatGPT identity flow uses `openid email play-sessions`. The previous
publication handoff omitted the exact OAuth scope field even though the
authorization smoke already exercised that scope set.

The patch derives the generated portal scope field from the same canonical
scope constants as the authorization service, requires the publication
attestation to record matching portal scopes, and tests both the missing-scope
failure and the working sign-in flow. The publication-package tests now use
an isolated committed fixture so a developer's uncommitted changes cannot
invalidate the package-generation test.

The user subsequently confirmed the production MCP URL and supplied the form:
**Supported scopes** is read-only and shows `play-sessions`; **Default scope
override** and **Always requested scopes** are editable controls, alongside
**OIDC enabled**. Their selected values and the rejection timestamp have not
been supplied. The recent failures cannot yet be attributed
to the OpenAI reviewer. This is a confirmed connection defect and a plausible
explanation for the rejection, not a proven reconstruction of the review.

Remaining: set **Default scope override** to `play-sessions`, **Always requested
scopes** to `openid email`, and **OIDC enabled** on; reconnect with fresh consent, scan tools,
and re-run the review cases before resubmitting. OpenAI's
[review requirements](https://developers.openai.com/plugins/deploy/app-review)
require a reachable public endpoint and usable reviewer access.

## Post-submission checks

The user confirmed resubmission. Production ingress records a browser
authorization at 03:02:09 UTC requesting `openid email offline_access
play-sessions`, followed by HTTP 200 token exchange and successful MCP
requests. This confirms that the actual refreshed client requests identity
scopes. It does not prove every reviewer workflow or the eventual review result.

Some scan requests receive HTTP 400/406 among successful requests. Request
bodies are not logged, so these cannot be classified as regressions from status
alone. Direct valid ping, tool discovery, and catalog calls succeed; unsupported
resources/prompts listing returns the expected JSON-RPC method-not-found error.

The production container remains healthy with zero restarts and OOMKilled=false.
The HTTPS certificate expires November 23, 2026. The public demonstration video
returns HTTP 200 and video/mp4.

Commit `ca64440648baa4a933d7958a83d9ba3c34ca73bb` is published on master. It
contains the scope safeguards and the credential-free external monitoring
workflow. The server itself remains on the submitted production release.
The first [GitHub-hosted connectivity run](https://github.com/dearlordylord/5e-quint/actions/runs/34183084205)
passed. The active workflow is scheduled every 15 minutes, subject to GitHub
scheduling delays; failures use ordinary GitHub Actions notification settings.

Validation: 12 probe tests, 14 focused publication/OAuth tests, MCP package
typecheck, QNT inventory, formatting, and staged secret scan passed. The probe
also passed directly against production. The separate workspace Quality CI run
was still in progress when these observations were recorded.
