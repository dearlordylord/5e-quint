# SRD Play developer-mode runbook

This directory contains the `srd-play` Skill and evaluation artifacts. The MCP
server remains the runtime composition owner in
[`packages/mcp/README.md`](../../packages/mcp/README.md); this document owns
the developer-mode connection procedure.

## Verify the local connection

From the repository root, install the workspace with pnpm and run the existing
source-checkout protocol seam:

```sh
pnpm install
pnpm --filter @dnd/mcp exec vitest run src/plugin-local-connection.test.ts \
  --pool=threads --maxWorkers=1
```

The source-only descriptor at
[`packages/mcp/test-support/srd-play-local-mcp.json`](../../packages/mcp/test-support/srd-play-local-mcp.json)
starts `@dnd/mcp` through its stdio entrypoint. It is used only by the
source-checkout test; it is not part of the installed plugin package and is
not a ChatGPT developer-mode endpoint.

## Connect the MCP server in ChatGPT developer mode

ChatGPT developer mode requires an account/workspace that permits developer
mode. Follow the current [OpenAI plugin connection guide](https://developers.openai.com/plugins/deploy/connect-chatgpt):

1. In ChatGPT, open **Settings → Security and login** and enable **Developer
   mode**.
2. Start the MCP server through a public HTTPS endpoint with a streamable HTTP
   `/mcp` route, or use the Secure MCP Tunnel procedure below. The current
   repository server exposes stdio only, so do not enter its local stdio
   command as a public URL.
3. Open **Plugins**, choose **+**, enter the user-facing name and description,
   select the connection method, and create the connection. For a public
   endpoint, enter the full `/mcp` URL; for a tunnel, select **Tunnel** and
   choose or enter its `tunnel_id`.
4. Review the discovered tool names, descriptions, schemas, and annotations.
   Resolve transport, initialization, schema, or authentication errors before
   evaluating selection.
5. Start a new conversation, add the separately created MCP connection from
   the tools menu, and run the MCP cases in
   [`evals/evaluation-inventory.json`](evals/evaluation-inventory.json).
   Record selected tools, arguments, results, errors, and confirmation behavior
   in the installed-evidence artifact; local tests do not establish these
   account/workspace observations.

## Secure MCP Tunnel for the private local server

Secure MCP Tunnel keeps a private MCP server off the public internet. It is a
developer-mode testing path, not a public-plugin submission path. The
[official tunnel guide](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)
owns current permissions, releases, networking, and command details.

1. In Platform tunnel settings, create or select a tunnel and record its
   `tunnel_id`. The operator needs Platform Tunnels **Read + Use**; creating or
   editing a tunnel also needs **Manage**. The target ChatGPT workspace must be
   associated with the tunnel, and ChatGPT developer-mode access is a separate
   workspace permission.
2. Download `tunnel-client` from the Platform tunnel settings download link or
   the latest public release. Keep the client on a host that can reach the
   private server and permit outbound HTTPS to `api.openai.com:443` (or the
   configured mTLS endpoint). No inbound firewall port is required.
3. Start the repository's stdio MCP server through a named tunnel profile. Use
   the actual absolute repository path for the working directory; the command
   below is a template and does not contain a project-specific tunnel id or
   secret:

   ```sh
   export CONTROL_PLANE_API_KEY="<runtime-api-key>"
   tunnel-client init \
     --sample sample_mcp_stdio_local \
     --profile srd-play-local \
     --tunnel-id "<tunnel-id>" \
     --mcp-command "pnpm --dir <repository-root> --filter @dnd/mcp dev"

   tunnel-client doctor --profile srd-play-local --explain
   tunnel-client run --profile srd-play-local
   ```

   Keep `tunnel-client run` running while ChatGPT discovers tools and executes
   calls. Confirm the client is healthy and ready with its local health/admin
   surfaces before creating the ChatGPT connection. If the profile forwards a
   shell command with a separate working-directory option in the installed
   client version, use that option to set `<repository-root>` rather than
   relying on the caller's current directory.

4. In ChatGPT Plugins, create a developer-mode connection, choose **Tunnel**,
   and select the associated tunnel or enter its `tunnel_id`. Review discovered
   metadata, then run the MCP evaluation cases.

The tunnel is transport only: it does not change the MCP protocol, runtime
state ownership, or the installed-evidence record. If the tunnel is not listed,
check workspace association and Tunnels **Read + Use**, then run
`tunnel-client doctor --profile srd-play-local --explain` again.

## Install and evaluate the plugin package

After the MCP connection works, package the Skill-only plugin from this
directory (`plugins/srd-play`) with its manifest and Skill using the current
ChatGPT plugin packaging flow. The manifest intentionally has no `mcpServers`
entry: a checkout-relative `pnpm` command cannot survive an installed plugin's
cache location. Keep the separately created MCP connection available in the
conversation, add the Skill package to a local marketplace, and install it
from the Plugins Directory. Start a new conversation with both the Skill and
MCP connection enabled. Run the direct, natural, follow-up, negative, and
authoring boundary prompts in the evaluation inventory. For a combined
workflow, retain the Play Session handle, use only returned Creation Hole
options and Battle Acts/Holes, stop at meaningful choices, and record the
final Character Session list.

Record those observations in
[`evals/installed-chatgpt-evidence.json`](evals/installed-chatgpt-evidence.json)
only after an authorized installation and conversation run. Its initial
`pending` state is intentional when no authorized ChatGPT account/workspace is
available; automated local MCP and static Skill-forward tests must not be
promoted to installed evidence.
