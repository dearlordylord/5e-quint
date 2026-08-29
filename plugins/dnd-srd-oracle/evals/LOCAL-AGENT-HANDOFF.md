# GH-328 Host-Agent Evaluation Handoff

Complete GitHub issue [#328](https://github.com/dearlordylord/5e-quint/issues/328)
from the operator's host machine. The host environment is distinct from prior
cloud or container environments and owns its own Node.js installation, pnpm
installation, native binaries, browser profile, and credentials.

## Isolation contract

- Read the repository `AGENTS.md` before acting.
- This is a pnpm workspace. Never use npm.
- Other agents and the 48-hour Raw Swarm campaign may be working concurrently.
- Do not work in the main checkout.
- Do not modify, clean, stop, rebase, or reuse an existing worktree, process,
  branch, stash, browser profile, tunnel profile, or `node_modules` directory.
- Create a uniquely named linked worktree from the latest `origin/master`, not
  from the main checkout's possibly stale `HEAD`.

Ask for the main checkout path if it is not evident. Choose a branch and
worktree suffix that no concurrent agent uses, replace all example values
below, then use absolute host paths:

```sh
repository_checkout=/absolute/path/to/dnd
evaluation_branch=claude/gh328-installed-evals-unique-suffix
evaluation_worktree=/absolute/path/to/dnd-gh328-installed-evals-unique-suffix

git -C "$repository_checkout" fetch origin master
git -C "$repository_checkout" worktree add \
  -b "$evaluation_branch" \
  "$evaluation_worktree" \
  origin/master

cd "$evaluation_worktree"
git rev-parse HEAD
git rev-parse origin/master
git merge-base --is-ancestor origin/master HEAD
```

Use the host toolchain specified by the checkout: Node 24 from `mise.toml` and
pnpm 10.29.3 from `package.json`. Install a worktree-local dependency tree:

```sh
mise install
CI=true HUSKY=0 pnpm install --frozen-lockfile

test -d node_modules
test ! -L node_modules
linked_installs="$(
  find packages -mindepth 2 -maxdepth 2 -type l -name node_modules -print
)"
test -z "$linked_installs"
```

A shared pnpm content-addressed store is acceptable. The worktree's
`node_modules` directory and workspace-package links must be independent. Never
copy or link another checkout's dependency tree or native binaries.

Do not copy the cloud/container `.env`. Supply host credentials through the
host process environment or a worktree-local ignored secret file containing
only the credentials needed for this evaluation.

## Read before execution

- `AGENTS.md`
- `docs/agents/issue-tracker.md`
- `plugins/dnd-srd-oracle/README.md`
- `plugins/dnd-srd-oracle/evals/evaluation-inventory.json`
- `plugins/dnd-srd-oracle/evals/installed-chatgpt-evidence.json`
- `packages/mcp/src/plugin-evaluation-artifacts.test.ts`
- GitHub issue #328 and every comment

## Correct the evidence ownership first

The current evidence contract routes all four MCP-selection cases through
installed ChatGPT. Split it before recording new results:

- API MCP-selection evidence and installed ChatGPT Skill-activation evidence
  must be distinct typed artifacts.
- API observations must not be stored under an `installed ChatGPT` identity.
- Update the JSON schemas, validation tests, evaluation instructions, and
  capability references consistently.
- Preserve the already-observed `complete-newcomer-journey`.
- Do not infer observations from shared ChatGPT links.

The official OpenAI procedure likewise distinguishes
[raw MCP request/response testing from complete installed-plugin testing](https://developers.openai.com/plugins/deploy/connect-chatgpt).

## Lane A: API-only MCP selection

Do not use a browser for these cases:

- `mcp-direct-catalog`
- `mcp-indirect-catalog`
- `mcp-follow-up-detail`
- `mcp-unsupported-history`

Use the OpenAI Responses API with the remote MCP server and `OPENAI_API_KEY`.
`CONTROL_PLANE_API_KEY` authorizes Secure MCP Tunnel control-plane operations;
it is not an OpenAI API credential.

For every case retain:

- exact prompt;
- model and response identifier;
- advertised MCP server and tool metadata when available;
- selected tool or confirmed absence of a tool;
- arguments;
- result or structured error;
- confirmation behavior;
- observation time;
- concise conclusion against the inventory expectation.

Do not fall back to browser automation merely for convenience. If the API is
proven incapable of producing required evidence, retain the exact failure and
stop this lane rather than silently substituting a different product surface.

## Lane B: installed ChatGPT Skill activation

Only these cases require browser control:

- `skill-direct`
- `skill-natural`
- `skill-continuation`
- `skill-unrelated-dnd`
- `skill-authoring-boundary`

Use a dedicated host browser profile authenticated interactively by the
operator. Do not use or copy the operator's everyday browser profile, password,
cookies, or exported session tokens. The dedicated profile must have:

- ChatGPT Developer Mode enabled;
- the `dnd-srd-oracle` plugin installed and enabled;
- the separately configured Secure MCP Tunnel connection enabled.

Start fresh ChatGPT conversations as required. For every case retain:

- exact prompt;
- whether the installed Skill activated;
- visible tool calls and results;
- whether the correct MCP operation was selected;
- missing or unnecessary steps;
- final visible response;
- observation time;
- redacted screenshots or equivalent reviewable evidence.

The browser-driving implementation may use Claude, Codex, Playwright, Chrome
DevTools Protocol, or another controlled mechanism. The installed ChatGPT
product surface—not the browser-driving agent—is the system under test.

## Existing newcomer evidence

The `complete-newcomer-journey` is already observed. Do not repeat it unless an
installation or evidence-contract change makes repetition necessary.

## Parallel-work and verification safety

- Do not stop or inspect unrelated agent processes beyond what is necessary to
  avoid a demonstrated collision.
- Do not prune worktrees, branches, stashes, pnpm stores, tunnel profiles, or
  browser profiles.
- Public repository verification shares locks through the linked worktrees'
  common Git directory. Do not wrap public pnpm commands in another lock.
- Reserve `pnpm quality:milestone` for stable integration revisions. Raw Swarm
  deterministic verification runs in its separate path-filtered workflow. Do
  not run either lane concurrently with another active campaign without
  explicit operator coordination. Run focused checks first and report any
  deferred aggregate verification exactly.

Minimum focused verification:

```sh
pnpm --filter @dnd/mcp typecheck
pnpm --filter @dnd/mcp exec vitest run \
  src/plugin-evaluation-artifacts.test.ts \
  src/plugin-local-connection.test.ts \
  --maxWorkers=1
```

Run every additional focused test affected by the final evidence-schema
changes. Follow the repository's required reviewer-loop convergence.

## Bookkeeping and handback

- Record exact results in the correct API and installed-ChatGPT artifacts.
- Comment on #328 with evidence links and verification.
- Close #328 only if every required case is genuinely observed.
- Commit all task changes on the uniquely named evaluation branch.
- Fetch `origin/master` again before handback and report divergence.
- Never force-push.
- Push the task branch, not `master`:

  ```sh
  git push -u origin HEAD
  ```

- Leave the task worktree clean except for explicitly documented ignored
  credentials or local evidence.
- Report the commit SHA and branch for controlled integration into the
  concurrently advancing `master`.
- Do not remove the task worktree until the operator confirms integration.
