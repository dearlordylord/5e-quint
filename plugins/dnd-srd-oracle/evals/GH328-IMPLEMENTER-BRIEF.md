# GH-328 implementer brief

Remaining work for [#328](https://github.com/dearlordylord/5e-quint/issues/328)
on branch `claude/gh328-installed-evals-host-lane-split` at `b1853eb81`.

The evidence contract, artifact ownership, and connection procedure are owned by
[`../README.md`](../README.md). This brief owns only the open work items.

## Case status

| Case                        | Kind                               | Status               |
| --------------------------- | ---------------------------------- | -------------------- |
| `mcp-direct-catalog`        | `installedConnectionToolSelection` | observed, met        |
| `mcp-indirect-catalog`      | `installedConnectionToolSelection` | observed, met        |
| `mcp-follow-up-detail`      | `installedConnectionToolSelection` | observed, **missed** |
| `mcp-unsupported-history`   | `installedConnectionToolSelection` | observed, met        |
| `mcp-*` ×4                  | `apiMcpToolSelection`              | blocked              |
| `skill-*` ×5                | `installedSkillActivation`         | blocked              |
| `complete-newcomer-journey` | `installedCompleteWorkflow`        | observed, passed     |

## Work item 1 — repair the `mcp-follow-up-detail` prompt

Highest-value item, and the only one that needs no external account change.

The case in [`evaluation-inventory.json`](evaluation-inventory.json) is authored
as `after: mcp-direct-catalog` with the prompt:

> Show me the full installed record for the option I just selected.

`mcp-direct-catalog` lists the catalog and selects nothing, so "the option I
just selected" has no referent. In conversation
`6a8cd7e1-3b90-83ea-8699-1f66e50cfa55` the model ran connection resource
discovery, declined to invent a referent, and asked which option was meant. It
never reached `inspect_catalog_unit`.

The model's behavior is correct for the prompt as authored. The prompt is what
fails to exercise the follow-up capability.

Fix the inventory so a selection exists before the follow-up runs. Two shapes
work; either is acceptable:

- give `mcp-direct-catalog` a prompt that ends on a chosen option, so the
  follow-up's deixis resolves; or
- make `mcp-follow-up-detail` name the option it wants the record for, and drop
  the dependence on an unstated prior selection.

Acceptance: rerun the two cases against the installed connection, confirm
`inspect_catalog_unit` is selected, and record `conclusion: "metExpectation"`.
Do not change the conclusion without a rerun — the schema cross-checks it
against `expectedToolNames`.

## Work item 2 — unblock the Responses API lane

Four `apiMcpToolSelection` cases in
[`api-mcp-selection-evidence.json`](api-mcp-selection-evidence.json).

Blocker: `OPENAI_API_KEY` authenticates (`GET /v1/models` returns 200) and every
`POST /v1/responses` is rejected with `credit_balance_exhausted`.

To unblock: fund the OpenAI project, expose the MCP server over a public HTTPS
`/mcp` endpoint or the Secure MCP Tunnel runtime, and follow _Observe MCP tool
selection from the Responses API_ in [`../README.md`](../README.md). Note that
`tunnel-client` is not installed on the evaluating host.

Do not drive a browser for this lane. Installed-conversation observations of the
same prompts already exist under `installedConnectionToolSelection` and are not
interchangeable with API evidence.

## Work item 3 — unblock Skill activation

Five `installedSkillActivation` cases in
[`installed-chatgpt-evidence.json`](installed-chatgpt-evidence.json).

Blocker: the evaluating ChatGPT Pro account has an empty Skills surface;
`chatgpt.com/skills` directs skill creation to ChatGPT Work and its create
control is inert. No `dnd-srd-oracle` Skill can be installed, so activation and
non-activation cannot be observed.

To unblock, one of:

- an account with ChatGPT Work skill creation; or
- the ChatGPT desktop app plus a working `codex` CLI, following _Install and
  evaluate the plugin package_ in [`../README.md`](../README.md). The `codex`
  binary on the evaluating host fails to spawn with `ENOENT`.

Skill activation must not be inferred from the MCP connection's behavior. The
connection and the Skill are distinct surfaces with distinct evidence kinds.

## Reproducing the installed-connection lane

The MCP connection is published in ChatGPT developer mode as **5e SRD Oracle**
and is reachable. Attach it from the composer `+` menu for a direct case; leave
it unattached for an indirect case and let the model discover it.

Full tool names, arguments, and results are not readable from a shared ChatGPT
link. Read them from the authenticated conversation endpoint in the logged-in
page:

```js
const s = await (
  await fetch("/api/auth/session", { credentials: "include" })
).json();
const id = location.pathname.split("/c/")[1];
const j = await (
  await fetch(`/backend-api/conversation/${id}`, {
    credentials: "include",
    headers: { Authorization: `Bearer ${s.accessToken}` },
  })
).json();
```

Assistant messages whose `recipient` is `api_tool.call_tool` carry the tool path
and arguments; `create_time` supplies `observedAt`; `metadata.model_slug`
supplies `model`.

## Verification

```sh
pnpm --filter @dnd/mcp typecheck
pnpm --filter @dnd/mcp lint
pnpm --filter @dnd/mcp test
```

Aggregate `pnpm quality` invokes model-backed Raw Swarm work; coordinate with
the [#332](https://github.com/dearlordylord/5e-quint/issues/332) campaign before
running it.
