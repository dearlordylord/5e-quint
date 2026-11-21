# Semantic review

Rules live in [Traits Markdown](../../.agents/traits/) and
[Hapsland JSONC](../../.hapsland/rules/custom/). Live checks send selected source
to TypeSafe/Jev; they are manual tools, outside deterministic verification.

## Traits setup

After `pnpm install`, start the MCP server with `pnpm review:traits`.
For project-scoped Codex registration, merge this into `.codex/config.toml`:

```toml
[mcp_servers.traits]
command = "node"
args = ["/absolute/checkout/scripts/semantic-review/traits-server.mjs"]
env_vars = ["TYPESAFE_API_KEY", "XDG_CONFIG_HOME", "CODEX_HOME"]
tool_timeout_sec = 600
```

Restart Codex to discover the tools and project skill. Refresh the bundled
skill when updating the Traits dependency.

The launcher preserves an existing `TYPESAFE_API_KEY`, otherwise loading it
from `${XDG_CONFIG_HOME:-$HOME/.config}/hapsland/.env`. Use `hapsland --login`
when a key is missing. The pinned CLI entry bypasses Traits' automatic
startup install so launches cannot change the checkout's dependencies.

The language provider uses authenticated `codex exec` with the ChatGPT
subscription. It supports non-streaming generation and OpenAI structured
output, runs in a disposable read-only working directory, and ignores user
configuration to prevent recursive MCP startup.

## Check code

Hapsland selects the function containing the supplied line:

```sh
hapsland rules check --path packages/battle-runtime/src/battle-reducer/attack-roll.ts --line 256 --id preserve-failure-meaning --json
```

Use Traits' `check_traits` MCP tool with explicit paths or globs. Before
restarting Codex, its local client accepts the same arguments from a JSON file:

```sh
node scripts/semantic-review/traits-client.mjs list
node scripts/semantic-review/traits-client.mjs check_traits /path/to/input.json
```

```json
{
  "include": ["scripts/semantic-review/examples/*.ts"],
  "traitNames": ["preserve-failure-meaning"]
}
```

`examples/missing-target.ts` should produce a finding; the other examples
should not. They are deliberate classifier inputs. Inspect selections and
omissions: a skipped check is untested. Hapsland exits zero even with findings;
Traits reports chunks rather than exact violation lines.

Complete responses go to ignored `.artifacts/semantic-review/`. Keep experiment
results and task history there or in the PR; keep reusable rules in the native
rule files.
