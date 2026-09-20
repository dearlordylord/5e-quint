# ChatGPT Plugin submission rejection audit

> Research evidence, not architecture authority. Stable product and operational
> decisions belong in the documents routed by
> [`CONTEXT-MAP.md`](../../CONTEXT-MAP.md).

Research checked: 2026-09-19
Rejected submission: `asdk_app_6a8f28a11de481918efefc92418d3f00`, 5.5e SRD
Oracle v1.0.0
Production endpoint: `https://dnd-oracle.apps.loskutoff.com/mcp`

## Executive conclusion

The submission should not be resubmitted unchanged. The rejection is supported
by confirmed defects in the deployed release, even though OpenAI did not identify
the exact tool and field behind every bullet:

1. The four-paragraph privacy notice does not disclose the required data
   categories, purposes, recipient categories, retention periods, and user
   controls. It also does not inventory the authorization database or operational
   logs.
2. The 27-tool surface exposes runtime phases and internal terminology rather
   than a focused set of user-goal actions. Several names and descriptions are
   difficult to select without repository-specific knowledge.
3. `guestAccessGrant` is an authorization secret returned to the model and then
   accepted by most stateful tools. This is independently disallowed regardless
   of whether a privacy policy discloses it.
4. `roll_dice` returns the caller's `requestId`, and its tests require that echo.
   OpenAI explicitly names request, trace, session, and diagnostic identifiers as
   fields to remove unless strictly required.

The sensitive-data allegation is not fully reconstructable from the rejection
email. No input named for real medical, biometric, government-ID, or payment-card
data was found. Game fields and descriptions use `currentHp`, `tempHp`, “Hit
Points,” “healing,” and “health”; an automated classifier may have read those as
human health data. That is a plausible trigger, not a confirmed cause. Open-ended
caller-selected identifiers are a separate confirmed minimization defect because
they accept arbitrary strings, including personal data, without needing to.

Evidence labels used below:

- **Confirmed defect**: the deployed contract or repository directly conflicts
  with current official review guidance.
- **Plausible reviewer trigger**: the evidence can explain the rejection but the
  reviewer did not identify the exact field.
- **Unresolved**: the available evidence cannot establish the fact.

## Governing OpenAI requirements

The current official requirements are unusually specific:

- A privacy policy must cover categories of personal data, purposes, recipient
  categories, retention timelines, and user controls. Tool input and response
  collection must be minimized, and diagnostic or internal identifiers such as
  session, trace, request IDs, and timestamps must not be returned unless strictly
  required. Authentication secrets are restricted data.
  [Plugin guidelines](https://developers.openai.com/plugins/app-guidelines)
- Before submission, the developer must review actual MCP responses against the
  policy and remove unnecessary personal data, authentication secrets, debug
  payloads, internal identifiers, and undisclosed user-related fields. The portal
  scan must be rerun after deployment changes.
  [Submit plugins](https://developers.openai.com/plugins/deploy/submission)
- Output testing must include nested and debug fields; personal data, internal
  identifiers, timestamps, account IDs, logs, and authentication secrets should
  be removed unless requested and necessary for the user goal.
  [MCP server review requirements](https://developers.openai.com/plugins/deploy/app-review)
- Every tool should complete a user goal, not mirror an internal API. Names should
  be action-oriented, descriptions should state the user goal and trigger
  conditions, internal terminology should be avoided, and results must keep
  secrets, access tokens, internal diagnostics, and unnecessary personal data out.
  [Define tools](https://developers.openai.com/plugins/plan/tools)
- Metadata should be evaluated with representative “golden” prompts. OpenAI's
  recommended description shape begins with “Use this when...” and explains
  selection boundaries.
  [Optimize metadata](https://developers.openai.com/plugins/guides/optimize-metadata)
- Logs should avoid raw prompts and personal data, publish retention, use least
  privilege, and undergo a security review before launch.
  [Security and privacy](https://developers.openai.com/plugins/guides/security-privacy)

These are current requirements as of the research date. They may not be identical
to the wording in force for the first August implementation, which is why a
freshness check is itself an acceptance requirement.

## Exact deployed snapshot

Read-only production checks on 2026-09-19 established:

- `/version` reports release
  `781379abf49e27fca3d506849140f2ad97220e29`, publisher `IGOR LOSKUTOV`, and
  storage format 3.
- `/privacy` serves the same four paragraphs encoded in
  [`public-publisher-site.ts`](../../packages/mcp/src/public-publisher-site.ts#L40-L45).
- `tools/list` returns 27 tools and 577,867 bytes for the normalized `tools` array,
  SHA-256 `d4fe545c1108571b1ab246c5fa026afdcee799d78b84348017415c2b47540de3`.
  Two consecutive fetches produced the same normalized hash.
- The deployed names include `describe_mcp_workflow`,
  `discover_creation_holes`, `fill_creation_holes`,
  `apply_character_session_operation`, `battle_lifecycle`, and
  `fill_battle_hole`. None of the 27 deployed descriptions begins with “Use this
  when”. That phrase is recommended guidance, not by itself a hard syntactic rule.
- The checked-in deployment attestation records the same release and an August 26
  verification time
  ([attestation](../../.artifacts/dnd-srd-oracle/deployment-attestation.json#L1-L10)).
  The September investigation explicitly says the server remained on that release
  even after newer safeguards reached `master`
  ([investigation](../../.artifacts/mcp-review-connection-2026-09-08.md#L97-L105)).

The current checkout has changed substantially since that release. Current-source
improvements are not evidence about the submitted or deployed contract. A future
review must bind a live response hash to the exact reviewed commit.

## Rejection finding 1: incomplete privacy policy

**Status: confirmed defect.**

The notice says only that session state is stored, content is not used for
advertising, telemetry is “bounded and redacted,” guest sessions normally expire
after seven inactive days, saved sessions after 90 inactive days, and an
individual saved session may be deleted
([source](../../packages/mcp/src/public-publisher-site.ts#L40-L45)). It does not
provide the five disclosure classes OpenAI requires.

| Required class  | What the implementation actually does                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Gap                                                                                                                                                                                                                                                                                                                                        |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Data categories | Stores play-session ID, dice seed and random-source profiles, serialized operations, tenure, a guest-grant digest or principal ID, activity time, and rate-limit keys/counts ([schema](../../packages/mcp/src/sqlite-play-session-repository.ts#L40-L67)). The OAuth store retains user, session, verification, OAuth client/resource/token/consent/assertion records ([inventory](../../packages/mcp/src/saved-session-authorization/capacity.ts#L22-L32)).                                              | The notice reduces these to “character and battle state” and “telemetry.” It does not inventory pseudonymous identity, OAuth, security, rate-limit, or log data.                                                                                                                                                                           |
| Purposes        | Data supports continuation, ownership, authorization, idempotency/replay, rate limiting, diagnostics, and capacity controls.                                                                                                                                                                                                                                                                                                                                                                              | Only session continuation and “not advertising” are stated. A negative advertising statement is not a purpose inventory.                                                                                                                                                                                                                   |
| Recipients      | ChatGPT/OpenAI receives model-visible tool results and synthetic OIDC claims. The service is hosted and ingress is handled by infrastructure that emits logs.                                                                                                                                                                                                                                                                                                                                             | No recipient or processor category is named.                                                                                                                                                                                                                                                                                               |
| Retention       | Play-session policy has 7-day guest, 24-hour pressure protection, and 90-day saved-session periods ([constants](../../packages/mcp/src/play-session-access.ts#L26-L35)). OAuth pruning deletes expired access/refresh tokens, sessions, verifications, and client assertions ([pruning](../../packages/mcp/src/saved-session-authorization/capacity.ts#L104-L137)); the code shown does not time-prune users, OAuth clients/resources, or consents. Caddy and application log retention is not specified. | Session periods do not cover authorization records, rate-limit records, or logs. The retention of unpruned authorization tables is unresolved and appears capacity-bounded rather than time-bounded from this repository evidence.                                                                                                         |
| User controls   | A user can delete one saved Play Session. Losing a guest secret prevents access.                                                                                                                                                                                                                                                                                                                                                                                                                          | No access/export/correction mechanism, authorization-vault/account deletion, OAuth consent/client cleanup, telemetry control, or private support path is disclosed. The support page directs users to a public issue tracker and warns them not to post secrets ([support page](../../packages/mcp/src/public-publisher-site.ts#L35-L38)). |

The authorization flow generates a synthetic email address containing a UUID
([generator](../../packages/mcp/src/saved-session-authorization/vault-identity.ts#L1-L8)),
requests `openid` and `email`
([scopes](../../packages/mcp/src/oauth-scopes.ts#L1-L12)), and asserts that ChatGPT
receives exactly `email`, `email_verified`, and `sub`
([smoke check](../../packages/mcp/src/saved-session-authorization/oauth-smoke-support.ts#L170-L198)).
The email is synthetic, not a user's real email, but it remains a pseudonymous
identifier disclosed to another recipient. It is absent from the notice. The
current implementation sets `email_verified: false`; OpenAI's current submission
guide says workspace-domain restriction support requires a real email claim with
`email_verified: true`. The synthetic email therefore does not satisfy that
optional feature and its necessity should be re-proved rather than assumed.

Application telemetry writes a timestamp, generated trace/span IDs, HTTP method,
route, status, outcome, duration, tool name, release, environment, and bounded
diagnostic to stderr
([observation type and generator](../../packages/mcp/src/public-service-operations.ts#L73-L109),
[serialized log](../../packages/mcp/src/public-service-operations.ts#L131-L150)).
Caddy separately emits JSON access logs
([configuration](../../operations/public-mcp/Caddyfile#L1-L7)); operations docs
confirm both streams but define no normal retention period
([operations](../../operations/public-mcp/README.md#L246-L262)). The exact Caddy
field set and infrastructure recipients are unresolved; that uncertainty must be
resolved for the policy, not silently omitted.

### Required remediation

Create a field-level data inventory first, then write the policy from it. The
policy must explicitly cover collected and generated categories, each purpose,
ChatGPT/OpenAI and hosting/logging recipient categories, retention for every
store/log class, deletion and other controls, a private contact route, and the
effect of guest versus authenticated use. Remove any field or store for which the
team cannot establish a necessary purpose and bounded retention. Do not describe
an authentication secret as merely “private session content.”

## Rejection finding 2: tool naming and description quality

**Status: confirmed architectural quality defect; exact rejected names unresolved.**

The names are unique, so uniqueness is not the problem found in this audit. No
explicit competitor comparison was found, so the email's comparative/biased
wording may state the rule rather than identify a particular phrase.

The stronger defect is that the public surface mirrors internal runtime phases:

| Deployed tool                                     | Problem                                                                                                                                       | User-goal direction                                                                                                                                               |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `describe_mcp_workflow`                           | Agent-facing MCP and result-path guidance is not a user goal; initialization instructions and the Plugin Skill already own workflow guidance. | Remove it from the public tool surface; keep necessary guidance in server instructions/Skill.                                                                     |
| `discover_creation_holes` / `fill_creation_holes` | “Hole” is repository/runtime vocabulary, not a phrase a user would use. Read and write intent is obscured.                                    | `get_character_creation_choices` and `choose_character_options`, or another tested user vocabulary.                                                               |
| `apply_character_session_operation`               | A generic dispatcher hides many materially different actions and selection conditions.                                                        | Split by coherent user action where permissions/side effects differ; otherwise give the bounded action a user-facing name and explicit discriminant descriptions. |
| `battle_lifecycle`                                | Groups unrelated setup mutations behind implementation terminology.                                                                           | Separate or rename around the actual goal: add/remove/swap/finalize participants as appropriate.                                                                  |
| `fill_battle_hole` / `resolve_battle_act`         | Exposes engine frontier/checkpoint mechanics and requires the model to understand internal phases.                                            | Name tools for listing available game actions and submitting the user's selected action.                                                                          |

OpenAI's tool-planning guidance says not to mirror an internal API, to group one
coherent action, and to describe user intent rather than implementation. The
current surface instead projects the engine's “holes,” lifecycle, operation,
checkpoint, and frontier concepts. That is the architectural root cause; editing
adjectives in the existing descriptions is insufficient.

Every retained description should state, in plain user language, the user goal,
when to use the tool, prerequisites, material side effects, how it differs from
nearby tools, and when not to select it. Avoid claims such as “best,”
“authoritative,” “preferred,” or selection instructions unrelated to factual
capability. Validate selection precision and recall against golden prompts and
near-miss prompts after the surface is redesigned.

## Rejection finding 3: sensitive personal data

### Model-visible authentication secret

**Status: confirmed defect and likely direct rejection trigger.**

`GuestAccessGrantSchema` is a `guest-access:` bearer-style value followed by 64
hex characters, generated from 32 random bytes
([schema and generation](../../packages/mcp/src/play-session-access.ts#L38-L43),
[generation](../../packages/mcp/src/play-session-access.ts#L109-L126)). The code
itself tells the agent to keep it private. The deployed release's creation output
schema includes `guestAccessGrant`, and routed stateful inputs accept it; the same
shape remains visible in the current schema setup
([inputs](../../packages/mcp/src/play-session-tool-schema.ts#L32-L60),
[creation output](../../packages/mcp/src/play-session-tool-schema.ts#L107-L140)). This is an
authorization secret, which OpenAI says to keep out of model-visible results.

Disclosure or consent does not cure this defect. Redesign guest authorization so
the client/server transport holds the capability outside model-visible tool
content. If the platform cannot supply a safe opaque credential channel, remove
anonymous stateful persistence from the public Plugin rather than exposing a
bearer secret to the model.

### Open-ended identifiers

**Status: confirmed overbroad schemas; reviewer attribution plausible.**

`create_character_draft` accepts an arbitrary caller-provided `draftId`
([schema](../../packages/mcp/src/character-tool-input.ts#L59-L66)). Battle setup
accepts caller-chosen nonempty strings for `combatantId`
([schema](../../packages/mcp/src/start-battle-tool-input.ts#L41-L58),
[second branch](../../packages/mcp/src/start-battle-tool-input.ts#L71-L93)) and
also exposes owner, companion, position, and battle handles. A nonempty trimmed
string permits names, emails, medical statements, or any other text even though
the operation needs only an opaque game identifier.

Generate new identifiers server-side. For references, use constrained opaque
handles issued by a prior tool, with explicit length/pattern schemas and no free
text. Do not solicit a caller-selected ID unless a user goal truly requires it.

### Game-health terminology

**Status: plausible automated-review trigger, not a confirmed policy violation.**

The battle schema uses `currentHp`, `tempHp`, and “Temporary Hit Points”
([schema](../../packages/mcp/src/start-battle-tool-input.ts#L105-L118)); other
descriptions mention healing and health. These are fictional game-state numbers,
not a person's health information. No production schema field expressly requesting
real health, biometric, Social Security/government-ID, or payment-card information
was identified.

After removing the real minimization and secret defects, ask OpenAI which exact
tool/path triggered the sensitive-data result. If it was HP terminology, explain
the fictional game semantics with the schema and representative output. A clear
name such as `gameCurrentHitPoints` can reduce ambiguity if it remains accurate,
but renaming solely to evade a classifier is not a substitute for a correct data
contract.

## Rejection finding 4: unnecessary personal identifier in a response

**Status: confirmed defect; additional candidate fields require necessity review.**

`roll_dice` requires a caller-generated UUID v4 `requestId`
([input](../../packages/mcp/src/dice-tool-input.ts#L47-L68)) and returns the same
identifier plus random-source implementation profiles
([output](../../packages/mcp/src/dice-tool-output.ts#L59-L77)). Unit and MCP tests
positively require the echo
([unit test](../../packages/mcp/src/dice-tools.test.ts#L125-L140),
[protocol test](../../packages/mcp/src/mcp-protocol.test.ts#L920-L941)). This is
the clearest match for OpenAI's explicit warning about request IDs and for the
email's singular “app call.” The model does not need its own submitted UUID echoed
back to understand the dice faces.

Remove `requestId` from model-visible output. Re-prove whether model-supplied
idempotency is needed at all; if it is, place it in a transport mechanism or use a
server-generated, non-model-visible idempotency record. The random-source profile
fields are also internal compatibility diagnostics for most user requests and
should be omitted unless a specific user goal needs them.

Stateful envelopes also return `playSessionId`, draft/character/battle/combatant
handles and exact inactivity timestamps. Some stable handles are necessary for
follow-up calls, and OpenAI's tool guidance explicitly permits stable identifiers
for that purpose. Therefore this audit does **not** classify all identifiers as
defects. Each leaf still needs an individual necessity decision. Exact expiry and
pressure-eligibility timestamps, for example, should not appear in every response
merely because the runtime computes them
([tenure output](../../packages/mcp/src/play-session-tool-schema.ts#L335-L345)).

## Why the prior work did not catch this

### Evidence

1. The initial research was explicitly scoped to a “ChatGPT developer-mode
   contract,” personal-marketplace testing, transport, identity, and continuity.
   It said public submission was a later concern. In commit `704d8233c`, inspect
   `docs/research/srd-play-plugin-platform-contract.md` lines 1–23, 65–93, and
   179–216 with `git show`. It did not audit the Plugin guidelines or build a
   privacy/data-flow inventory.
2. That research recommended returning an explicit application `SessionId` in
   every stateful result (same historical file, lines 27–31, 151–175, and
   202–209). The continuity concern was real, but the recommendation was not
   reconciled later with response minimization. A context-specific recommendation
   became an unreviewed public-contract invariant.
3. Commit `b3263d705` (“prepare ChatGPT app submission”) added a 404-line portal
   submission artifact and per-tool test material, but no field-level privacy
   inventory. The artifact concentrated on annotations and portal cases.
4. The privacy acceptance test only asserts six phrases: the three session timing
   statements, permanent deletion, one-account ownership, and bounded/redacted
   telemetry
   ([test](../../packages/mcp/src/public-http-boundary.test.ts#L85-L93)). It never
   tests the five required disclosure classes or maps policy statements to
   collected/returned fields.
5. Existing dice tests make `requestId` part of the expected contract rather than
   challenge its necessity. Passing tests therefore reinforced a policy defect.
6. The September 8 investigation was scoped to OAuth connectivity and portal
   scopes. Its “no remaining reasonable findings” statement concerns canonical
   scope ownership and identity-scope separation, and it expressly says the
   production server was unchanged
   ([scope](../../.artifacts/mcp-review-connection-2026-09-08.md#L51-L78),
   [deployment](../../.artifacts/mcp-review-connection-2026-09-08.md#L97-L105)).
   The wording was broader than the actual review scope and could be mistaken for
   whole-submission assurance.
7. External monitoring checks health, discovery, OAuth metadata, `tools/list`, and
   one catalog call
   ([probe](../../operations/public-mcp/check-connectivity.mjs#L92-L199)); CI labels
   this “transport and catalog”
   ([workflow](../../.github/workflows/public-mcp-connectivity.yml#L29-L38)). It
   does not inspect privacy coverage, metadata semantics, or actual stateful
   output leaves.
8. The privacy notice has not changed since public-package commit `e265abd56`, as
   `git log --follow -- packages/mcp/src/public-publisher-site.ts` shows. The
   deployed release and current checkout still use the same notice despite the
   later OAuth subsystem.

### Root causes

- **Scope transition without a new threat/compliance model.** A developer-mode
  prototype was promoted to public submission work without re-baselining against
  public-directory privacy and data-minimization requirements.
- **Runtime-first tool design.** The public MCP contract was projected from engine
  phases and handles rather than designed from user goals. This created internal
  terminology, umbrella dispatchers, large schemas, and leaked compatibility
  metadata.
- **Assertions checked consistency, not acceptability.** Tests proved that policy
  numbers match runtime constants and that identifiers round-trip. They did not
  ask whether the policy was complete or the identifier should exist.
- **No single source of truth for data handling.** Schemas, database tables,
  telemetry, OAuth, policy prose, and portal attestations can evolve independently.
- **Review scope was not encoded.** Subsystem review language was easy to read as
  full-product review because findings were not labeled by explicit exclusions.
- **Source/deployment drift.** The reviewed checkout, `master`, portal snapshot,
  and production release were not cryptographically bound into one submission
  artifact.
- **Policy freshness was assumed.** The current OpenAI guidance is more explicit
  than the original narrow research, yet no gate requires an official-doc refresh
  immediately before submission.

There is no evidence that one individual omission alone caused all four bullets.
The systemic failure was the absence of an enforceable public-contract review
boundary.

## Enforceable pre-resubmission gate

A checklist-only assertion is insufficient. The gate should consume the exact
deployed endpoint and fail mechanically when possible.

### 1. Deployed-schema data inventory

Fetch production `tools/list` after deployment and recursively enumerate every
leaf in every input and output schema. Require a reviewed record for each leaf:

- tool, JSON path, direction, type, constraints, and whether arbitrary text is
  accepted;
- user-goal necessity and the prompt/flow that proves it;
- category: game state, stable follow-up handle, pseudonymous identifier,
  personal data, sensitive/restricted data, authentication secret, operational
  metadata, or diagnostic;
- source/generator, persistence location, recipient categories, retention and
  deletion/control;
- exact privacy-policy section anchor; and
- disposition: allowed, removed, redacted, or moved outside model-visible data.

Fail on any unclassified leaf, secret output, unrestricted human string used as
an ID, internal ID/timestamp without an approved necessity case, or retained
category without a policy anchor and retention rule.

### 2. Actual-output fixtures

Exercise every deployed tool across success, invalid, unauthorized, guest, and
authenticated paths. Recursively compare actual `structuredContent`, text
content, errors, nested envelopes, and debug variants with an approved leaf
allowlist. Add detectors for guest grants/tokens, email-like strings, UUIDs,
timestamps, high-entropy secrets, trace/request/session identifiers, and raw
diagnostics. A detector finding requires an explicit approved classification;
it cannot be suppressed with a generic “false positive.”

### 3. User-goal and metadata review

Maintain an inventory of supported user goals before defining tools. For every
deployed tool, require one goal and representative selection prompts. Automated
lint should enforce unique action-oriented IDs, required descriptions, side
effect/prerequisite/non-use statements, and ban unexplained internal terms such
as `hole`, `frontier`, `checkpoint`, generic `operation`, and MCP implementation
language. Then run an independent semantic review and golden-prompt precision /
recall evaluation; lint alone cannot prove clarity.

### 4. Policy generated from approved facts

Generate or validate the served policy against the approved inventory. The build
must fail unless all five OpenAI disclosure classes are present and every
persisted, logged, or returned user-related category maps to purpose, recipients,
retention, controls, and policy text. Verify that documented deletion mechanisms
actually delete all promised stores. Phrase-presence tests are not sufficient.

### 5. Live release and portal attestation

After deployment, capture and bind:

- `/version` release and reviewed Git commit;
- privacy-page content hash;
- normalized `initialize` and `tools/list` hashes, tool count, and names;
- actual-output fixture results;
- authorization discovery and reviewer-access results; and
- the portal Scan Tools snapshot identifier/time.

The submission package must fail if production is old, any hash drifts, or Scan
Tools ran before the final deployment. Re-run the scan after every schema,
description, Skill, policy, or authorization change.

### 6. Requirement freshness and independent sign-off

Within seven days of submission, re-read the official URLs cited above, record the
review date and changed requirements, and update the requirement-to-test map.
Require independent sign-off for (a) privacy/data minimization, (b) tool UX and
metadata, (c) authentication/security, and (d) live-deployment evidence. Each
review report must state its scope and exclusions; “no findings” without them is
not acceptable.

The checked-in listing currently uses category `Lifestyle`
([source](../../plugins/dnd-srd-oracle/publication/submission-source.json#L1-L8)).
The current public submission documentation does not enumerate that category.
Confirm the live portal's allowed category set and select an available accurate
category before resubmission. This is a current preflight item, not an established
cause of the September rejection.

## Prioritized remediation and resubmission order

1. **Stop model-visible guest secrets.** Redesign guest state authorization or
   remove anonymous stateful persistence from the public surface.
2. **Minimize response and input data.** Remove the `requestId` echo and internal
   random-source metadata; remove/generate caller-chosen IDs; classify every
   remaining identifier and timestamp.
3. **Redesign the public tools from user goals.** Remove the meta-workflow tool,
   replace internal phase vocabulary, and split incoherent dispatchers where
   permissions or side effects differ.
4. **Resolve actual retention and recipients.** Determine OAuth table lifetimes,
   Caddy/application-log fields and retention, infrastructure processors, and a
   complete deletion path. Change implementation where a defensible policy cannot
   be written.
5. **Publish the complete privacy notice** from the approved data inventory, with
   the five required disclosure classes and usable controls/contact.
6. **Implement the live gates above**, including actual responses rather than
   TypeScript schemas alone.
7. **Deploy the exact reviewed commit**, attest live hashes, run Scan Tools again,
   inspect the imported metadata, and run all reviewer cases against production.
8. **Reply to the rejection email** requesting the exact tool, input/output JSON
   paths, and sample call for the sensitive-data and unnecessary-identifier
   findings. Include the fictional Hit Point explanation only if OpenAI confirms
   that was the trigger. Do not wait for that answer before fixing the confirmed
   defects.
9. **Resubmit only after independent convergence** on privacy, tool UX, auth,
   runtime output, and deployment evidence.

## Unresolved questions for OpenAI or the operator

- Which exact tool and JSON path triggered each sensitive-data category?
- Which app call and returned identifier produced the fourth bullet? `roll_dice`
  `requestId` is the strongest repository match, but only OpenAI can confirm it.
- Which exact names/descriptions were rejected, and was comparative-language
  feedback tied to a phrase or generic guidance?
- What fields and normal retention apply to production Caddy and host-platform
  logs?
- What are the deletion and retention rules for anonymous user, OAuth client,
  client resource, and consent records?
- Is OIDC `email` required for this Plugin's intended availability, given the
  current synthetic, unverified email cannot support workspace domain restriction?
- What exact production snapshot did the portal retain at submission time? Compare
  it with the live release and the portal's Scan Tools timestamp.

Until these are answered, they must remain recorded unknowns rather than
assumptions in an attestation.
