# Publication handoff

This directory owns the portal-ready listing facts for 5.5e SRD Oracle. The
runtime and public pages remain provider-neutral: the production origin serves
`/mcp`, `/`, `/support`, `/privacy`, and `/terms` from the same Node OCI image.

The checked-in development package intentionally does not name a registered
production MCP application. That keeps local stdio and Secure MCP Tunnel
development usable and prevents a placeholder domain or unverified publisher
identity from being presented as real. Once DNS, TLS, publisher identity, and
remote MCP registration exist, build the exact package to upload from the same
production environment file used by deployment:

```sh
node plugins/dnd-srd-oracle/publication/prepare-package.mjs \
  --environment-file /etc/dnd-oracle/production.env \
  --publication-attestation /secure/dnd-oracle/publication-attestation.json \
  --registered-app-id plugin_asdk_app_REPLACE_WITH_REGISTERED_ID \
  --output .artifacts/dnd-srd-oracle-public
```

The command runs the deployment-owned `verify-config.sh` against the environment
file before parsing it for publication facts. It requires production publication
mode, rejects reserved/placeholder domains, publisher placeholders, malformed
registered application ids, endpoint paths that escape the configured origin,
source-package targets, and non-empty output directories. It copies the manifest,
Skill, brand assets, package README,
LICENSE, and NOTICE; emits the registered remote-MCP `.app.json` mapping and
public URLs; and writes `portal-submission.json` with listing copy, the exact
empty MCP CSP, optional-auth rationale, availability proposal, release notes,
and the canonical five positive and three negative review cases.

The attestation is an external, non-secret handoff artifact and must not be
committed. It records facts already completed in the OpenAI portal; it does not
turn a configured name into a verified identity. Its exact shape is:

```json
{
  "publisherIdentity": {
    "status": "verifiedInOpenAiPortal",
    "name": "Exact verified publisher name",
    "verifiedAt": "2026-08-25T20:00:00Z",
    "attestedBy": "operator identity"
  },
  "reviewerAccess": {
    "status": "provisionedInOpenAiPortal",
    "mfaRequired": false,
    "attestedAt": "2026-08-25T20:01:00Z",
    "attestedBy": "operator identity"
  }
}
```

Do not put credentials or tokens in this file; its closed shape has no field for
them. Provision review credentials only in the secure portal field. Preparation
fails unless the identity name exactly matches `DND_MCP_PUBLISHER_NAME`, both
portal statuses are attested, and reviewer access needs no MFA.

Before portal submission, validate the generated directory with the
plugin-creator validator, deploy the matching release, run the public smoke,
and manually verify the exact public pages, `/version` publisher identity, and
domain challenge. `DND_MCP_PUBLISHER_NAME` must exactly match the verified
OpenAI developer or business identity. The publisher must also confirm the
proposed country availability.
Portal upload/submission, identity verification, domain verification, OAuth
issuer configuration, and live review-case execution require that external
access; local tests do not claim them.

The current submission fields follow the [OpenAI plugin submission
documentation](https://developers.openai.com/plugins/deploy/submission) and the
[OpenAI plugin packaging documentation](https://developers.openai.com/plugins/build/plugins).
