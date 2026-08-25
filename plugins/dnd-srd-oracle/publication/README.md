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
  --deployment-attestation .artifacts/dnd-srd-oracle/deployment-attestation.json \
  --publication-attestation /secure/dnd-oracle/publication-attestation.json \
  --registered-app-id plugin_asdk_app_REPLACE_WITH_REGISTERED_ID \
  --output .artifacts/dnd-srd-oracle-public
```

Generate the deployment attestation from the live production adapter. For the
current Dokku host, run `pnpm verify:mcp:dokku-publication OUTPUT` as documented
in the [public MCP operations runbook](../../../operations/public-mcp/README.md).
The verifier writes no credentials. The package command requires a successful
live production attestation whose release exactly matches the source checkout,
and rejects reserved/placeholder origins, publisher placeholders, malformed
registered application ids, endpoint paths that escape the verified origin,
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
  },
  "domainVerification": {
    "status": "verifiedInOpenAiPortal",
    "origin": "https://dnd-oracle.apps.loskutoff.com",
    "verifiedAt": "2026-08-25T20:02:00Z",
    "attestedBy": "operator identity"
  }
}
```

Do not put credentials or tokens in this file; its closed shape has no field for
them. Provision review credentials only in the secure portal field. Preparation
fails unless the identity name exactly matches `DND_MCP_PUBLISHER_NAME`, both
portal statuses are attested, the verified domain exactly matches the live
production origin, and reviewer access needs no MFA.

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
