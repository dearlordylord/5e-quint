# Publication handoff

This directory owns the portal-ready listing facts for 5.5e SRD Oracle. The
runtime and public pages remain provider-neutral: the production origin serves
`/mcp`, `/`, `/support`, `/privacy`, and `/terms` from the same Node OCI image.

The checked-in development package intentionally contains no production MCP
dependency reference. That keeps local stdio and Secure MCP Tunnel development
usable and prevents a placeholder domain or unverified publisher identity from
being presented as real. Once the HTTPS MCP endpoint is deployed and verified,
and the portal identity, domain, and reviewer-access facts are resolved, build
the exact package for the **With MCP** draft from the same production facts used
by deployment:

```sh
pnpm check:plugin-submission-fast
pnpm check:plugin-submission-candidate
DND_MCP_PUBLISHER_NAME='IGOR LOSKUTOV' \
DND_MCP_HOSTING_RECIPIENTS='Hetzner Online GmbH' \
DND_MCP_STDERR_RETENTION='size-capped at 10 MiB per container; no fixed time window' \
DND_MCP_INGRESS_ACCESS_LOG_RETENTION='14 days' \
DND_MCP_BUDGET_MONITORING='disabled' \
DND_MCP_BUDGET_ALERT_RECIPIENT='notApplicable' \
  pnpm evidence:plugin-submission-candidate -- \
  --output .artifacts/dnd-srd-oracle/submission-candidate.json
```

The fast gate walks the complete canonical codec inventory as well as the
advertised projection. Its measured scan and definition-build work was about
0.57 seconds and 0.12 seconds respectively on the shared development host on
2026-09-19. The end-to-end cold command did not meet the plan's sub-ten-second
target: observed wall time ranged from 11.8 seconds to 51.5 seconds under host
load, with one instrumented run spending about 16.6 seconds importing the
existing MCP/server module graph. Treat ten seconds as an unmet optimization
target, not an acceptance claim; correctness gates remain mandatory.

The candidate command requires a clean checkout. Candidate schema v2 binds only
facts that exist before deployment: the Git release, hosted tool contract,
deterministic representative results, public pages, review policy, final Skill
source, local Skill forward-test results, and the selected portal-case
inventory. The tracked `evals/installed-chatgpt-evidence.json` is historical
product evidence. Its `partiallyObserved` status does not block a new release
candidate and does not certify one.

Follow this one-way release sequence. No step depends on evidence produced by a
later step:

1. Generate the candidate evidence from the clean reviewed commit using the
   command above.
2. Deploy that exact commit and generate the deployment attestation:

   ```sh
   pnpm verify:mcp:dokku-publication \
     .artifacts/dnd-srd-oracle/deployment-attestation.json \
     .artifacts/dnd-srd-oracle/submission-candidate.json
   ```

3. Create the external publication attestation with the identity, reviewer,
   domain, requirements-review, and operator-data facts shown below. Do not add
   `portalScan` or `submissionTests` yet. Prepare the immutable upload package:

   ```sh
   node plugins/dnd-srd-oracle/publication/prepare-package.mjs \
     --deployment-attestation .artifacts/dnd-srd-oracle/deployment-attestation.json \
     --publication-attestation /secure/dnd-oracle/publication-attestation.json \
     --output .artifacts/dnd-srd-oracle-public
   ```

   The command prints `outputDirectory` and `packageDigest`. Keep the generated
   directory unchanged after this point.

4. Upload and install that exact directory in the ChatGPT app draft. Configure
   OAuth, choose **Scan Tools**, and compare the imported surface with
   `portal-submission.json`. Exercise the five positive cases in the installed
   draft. The two behavior-boundary negatives are certified by the
   candidate-bound independent static evaluation; the unauthenticated mutation
   negative is certified by the candidate-bound deployment authorization smoke.
   Do not repeat those automated checks manually or describe them as installed
   ChatGPT observations. Save reviewable evidence references outside Git; never
   put credentials or user content in the attestation.
5. Verify the existing hosted review recording at
   `https://dnd-oracle.apps.loskutoff.com/plugin-demo.mp4`, and add
   `demoRecording`, `portalScan`, and `submissionTests` to
   `submissionEvidence`. Copy the
   candidate fingerprint and `components.submissionCaseInventory` from the
   candidate file, and copy the package digest printed in step 3. Record one
   `metExpectation` result for every listed case.

   The production smoke already requires that recording to be served as a
   public MP4 from the verified publisher origin. Use its HTTPS URL in both the
   portal and `demoRecording.url`; do not record or upload a duplicate merely
   for the resubmission.

6. Run the final live gate against the unchanged package:

   ```sh
   pnpm check:plugin-submission-live \
     --origin https://dnd-oracle.apps.loskutoff.com \
     --candidate .artifacts/dnd-srd-oracle/submission-candidate.json \
     --deployment-attestation .artifacts/dnd-srd-oracle/deployment-attestation.json \
     --publication-attestation /secure/dnd-oracle/publication-attestation.json \
     --package .artifacts/dnd-srd-oracle-public \
     --output .artifacts/dnd-srd-oracle/submission-evidence-packet.json
   ```

The final command fails if the deployed release, normalized tool contract,
public pages, candidate fingerprint, package bytes, exact case inventory,
operator retention facts, requirement freshness, or post-deployment portal
observations disagree. Its output contains hashes and attestations only.

Generate the deployment attestation from the live production adapter. For the
current Dokku host, run
`pnpm verify:mcp:dokku-publication DEPLOYMENT_OUTPUT CANDIDATE_EVIDENCE` as documented
in the [public MCP operations runbook](../../../operations/public-mcp/README.md).
The verifier writes no credentials. The package command requires a successful
live production attestation whose release exactly matches the source checkout,
and rejects reserved/placeholder origins, publisher placeholders, endpoint paths
that escape the verified origin, source-package targets, and non-empty output
directories. It copies the manifest, Skill, brand assets, package README,
LICENSE, and NOTICE; emits the public URLs; and writes
`portal-submission.json` with listing copy, the exact empty MCP CSP, OAuth
rationale, availability proposal, release notes, and the canonical five
positive and three negative review cases. Directory submissions use **With
MCP** and submit the production MCP server directly; the package intentionally
contains no `.app.json` reference to an existing local or workspace integration.

The attestation is an external, non-secret handoff artifact and must not be
committed. Identity, domain, and reviewer-access statuses record facts already
completed in the OpenAI portal; text in this file cannot make them true. Before
package preparation its shape is:

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
    "oauthScopes": "openid email play-sessions",
    "attestedAt": "2026-08-25T20:01:00Z",
    "attestedBy": "operator identity"
  },
  "domainVerification": {
    "status": "verifiedInOpenAiPortal",
    "origin": "https://dnd-oracle.apps.loskutoff.com",
    "verifiedAt": "2026-08-25T20:02:00Z",
    "attestedBy": "operator identity"
  },
  "submissionEvidence": {
    "requirementsReview": {
      "officialUrls": [
        "https://developers.openai.com/plugins/deploy/app-review",
        "https://developers.openai.com/plugins/deploy/submission",
        "https://developers.openai.com/plugins/deploy/submission-errors"
      ],
      "reviewedAt": "2026-09-19T20:00:00Z",
      "reviewedBy": "operator identity",
      "changes": []
    },
    "operatorDataHandling": {
      "hostingRecipients": ["Hetzner Online GmbH"],
      "stderrRetention": "size-capped at 10 MiB per container; no fixed time window",
      "ingressAccessLogRetention": "14 days",
      "budgetMonitoring": "disabled",
      "alertRecipient": "notApplicable",
      "attestedAt": "2026-09-19T20:01:00Z",
      "attestedBy": "operator identity"
    },
    "demoRecording": { "status": "notRecorded" }
  }
}
```

After installing and testing the generated package, replace `demoRecording`
and add the other two members under `submissionEvidence`:

```json
{
  "demoRecording": {
    "status": "available",
    "url": "https://dnd-oracle.apps.loskutoff.com/plugin-demo.mp4",
    "reviewedAt": "2026-09-19T20:25:00Z",
    "reviewedBy": "operator identity"
  },
  "portalScan": {
    "candidateFingerprint": "candidate fingerprint",
    "packageDigest": "digest printed by prepare-package.mjs",
    "importedSurfaceMatches": true,
    "scannedAt": "2026-09-19T20:10:00Z",
    "scannedBy": "operator identity"
  },
  "submissionTests": {
    "candidateFingerprint": "candidate fingerprint",
    "packageDigest": "digest printed by prepare-package.mjs",
    "origin": "https://dnd-oracle.apps.loskutoff.com",
    "submissionCaseInventory": "candidate components.submissionCaseInventory",
    "status": "passedWithReleaseBoundEvidence",
    "completedAt": "2026-09-19T20:30:00Z",
    "completedBy": "operator identity",
    "caseResults": [
      {
        "caseId": "submission-browse-catalog",
        "kind": "positive",
        "outcome": "metExpectation",
        "evidenceKind": "installedChatGpt",
        "evidenceReference": "secure evidence reference"
      }
    ]
  }
}
```

The example shows one result for shape only. The live gate requires the exact
eight unique cases from `portal-submission.json`: all five positives with
`installedChatGpt` evidence, the unrelated-history and unsupported-authored-
content negatives with `candidateStaticEvaluation` evidence, and the stateful-
without-OAuth negative with `deploymentAuthorizationSmoke` evidence. Missing,
duplicated, renamed, incorrectly classified, or incorrectly sourced cases fail
the gate.

Do not put credentials or tokens in this file; its closed shape has no field for
them. Provision review credentials only in the secure portal field. Preparation
fails unless the identity name exactly matches `DND_MCP_PUBLISHER_NAME`, both
portal statuses are attested, the verified domain exactly matches the live
production origin, and reviewer access needs no MFA.

In the MCP tab's advanced OAuth settings, leave the read-only **Supported
scopes** display alone. Set **Default scope override** to `play-sessions`,
**Always requested scopes** to `openid email`, and **OIDC enabled** on.
Record the resulting requested scope set, `openid email play-sessions`, in
`reviewerAccess.oauthScopes`; confirm it during a fresh authorization attempt.
The package builder requires exactly the authorization service's canonical
ChatGPT scope set; missing or additional scopes fail preparation. It emits the
required set as `mcp.oauthScopes` in
`portal-submission.json`. The resource permission `play-sessions` alone does
not authorize OpenID user-info: a client that requests only that permission
can exchange a token successfully and then fail to connect at user-info with
HTTP 400 `invalid_scope`. Keep tool permission scopes distinct from this
client sign-in scope set. After saving the overrides, reconnect so the
client receives a newly consented token, then scan tools again.

The enterprise domain-restriction warning concerns verified real email claims.
Saved Session Vaults use synthetic identities with `email_verified: false`;
do not mark them verified to suppress that warning. The generated
`portal-submission.json` is our operator handoff, not the portal's separately
specified `chatgpt-app-submission.json` import format.

The hosted ownership model and the reason `save_play_session` is not a public
tool are owned by
[ADR 0007](../../../docs/adr/0007-public-play-session-tenure-and-ownership.md).

Before resubmitting, execute the authorization smoke described in the
[operations runbook](../../../operations/public-mcp/README.md#review-connection-check).
Anonymous catalog discovery and the expected anonymous stateful denial cannot
certify authenticated reviewer access.

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
