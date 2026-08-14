# Waiting for remote events in coding-agent clients

> **Research evidence, not architecture authority.** This note records current
> first-party behavior for a later Wayfinder decision. Stable product structure
> belongs in [`ARCHITECTURE.md`](../../ARCHITECTURE.md), as routed by
> [`CONTEXT-MAP.md`](../../CONTEXT-MAP.md).

Research checked: 2026-08-08.

## Question

How can future player-facing software wait until a remote encounter needs another
player choice, then give that information to a coding Agent such as Codex or Claude
Code?

The future player-facing software has not been designed. It might expose a CLI, MCP
tools, or another Agent integration. The existing `@dnd/mcp` package is only an
integration-test and debugging surface; this note does not treat it as the future
player-facing software.

The question contains three different interaction patterns:

1. an Agent calls a tool or CLI command which remains open until an event arrives;
2. the local program polls or listens remotely while that Agent call remains blocked;
3. after the Agent has become idle or exited, local software starts a later Agent turn
   with the event.

## Executive finding

There is no single, documented mechanism portable across Codex and Claude Code.

- **The same Agent turn can continue after one blocking typed call returns.** A local
  CLI command or MCP tool can wait, poll, or listen internally and return the next
  request to the Agent. This consumes no repeated Agent decisions while the local
  program waits. Both products impose or expose timeouts, however, and neither vendor
  promises that an arbitrary tool call can remain open indefinitely.
- **Starting a later turn is the more durable pattern.** A persistent local program
  can receive the remote event without an LLM. It can then use a product-specific
  programmatic surface to resume the conversation and submit the next prompt. Codex
  App Server, `codex exec resume`, the Codex SDK, Claude Code session resume, and the
  Claude Agent SDK all provide pieces of this pattern.
- **An ordinary MCP server is not generally a push channel into an idle Agent.** The
  Agent must first call its tool. Anthropic explicitly distinguishes standard MCP,
  which Claude queries, from Channels, which can push into an open Claude Code
  session. OpenAI does not document an arbitrary MCP server or standalone daemon
  waking a separately owned idle Codex TUI.
- **Claude Code currently has additional open-session wake mechanisms.** Its Monitor
  tool, Channels research preview, and `asyncRewake` hooks can cause an already-open,
  idle session to react to an event. These do not wake a closed session, and they are
  Claude-specific rather than a portable CLI/MCP contract.

For this product, the networking wait belongs in ordinary local code, not in an LLM
polling loop. The Agent integration can support a blocking wait where practical and a
later-turn resume path where the wait may be long. Choosing CLI versus MCP is still a
separate decision.

## Pattern A: keep one Agent call open

### Codex

Codex MCP tool calls have a default per-tool timeout of 60 seconds. The timeout is
configurable per MCP server with `mcp_servers.<id>.tool_timeout_sec`. The official
reference does not document an upper bound or guarantee that hours-long or indefinite
calls are reliable. A `wait_for_update` tool could therefore wait internally and
return into the same active Codex turn, but its required duration must fit a tested
configuration rather than an assumed indefinite wait.
[Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)

Codex also supports long-running command processes. Its hook documentation describes
unified execution in which a later `write_stdin` poll can deliver the original
command's completion. App Server exposes command execution with a configurable or
disabled timeout and process operations. These establish process support, but the
public CLI documentation does not promise an unlimited, unattended Agent-issued shell
call.
[Codex hooks](https://learn.chatgpt.com/docs/hooks),
[Codex App Server](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md)

### Claude Code

Claude Code's Bash tool defaults to a two-minute timeout and a ten-minute ceiling;
both bounds are configurable through environment variables. A foreground CLI command
that waits for the encounter can return into the same turn if it completes within the
effective limit. Claude can instead put a Bash command in the background, in which
case the conversation continues rather than remaining blocked.
[Claude Code tools reference](https://code.claude.com/docs/en/tools-reference)

Claude Code can call standard MCP tools. Its current changelog says MCP calls running
longer than two minutes move to the background automatically, and remote MCP calls
with no response for five minutes abort unless the idle timeout is overridden. The
reference documentation does not fully specify how an automatically backgrounded MCP
result resumes Agent work, so this note does not treat that behavior as a stable
same-turn contract.
[Claude Code changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md),
[Claude Code MCP documentation](https://code.claude.com/docs/en/mcp)

## Pattern B: local code waits while the Agent call is blocked

The remote waiting strategy is invisible to the Agent. One typed operation can:

1. be invoked by the Agent;
2. use long polling, a WebSocket, or another mechanism inside the local program;
3. wait without further LLM calls;
4. return a typed request when the encounter needs that player;
5. allow the same Agent turn to continue.

Neither OpenAI nor Anthropic prescribes which remote transport the local program must
use. The practical limit is the surrounding tool or subprocess lifetime described
above. Consequently, this pattern is plausible for a bounded wait but not yet
validated for the encounter's potentially indefinite pauses.

Codex's unified-execution polling is a different implementation: after a command has
yielded, `write_stdin` can poll it and eventually deliver its result. That requires
additional Codex tool activity; it is not evidence that the process completion itself
proactively wakes an idle Codex TUI.
[Codex hooks, tool coverage](https://learn.chatgpt.com/docs/hooks)

Claude Code has a stronger open-session option. Its Monitor tool runs a background
command or opens a WebSocket, turns each output line or incoming message into an
event, and lets Claude react when it arrives. A plugin can also declare a persistent
monitor which starts with the interactive session. Monitors stop with the session and
are not restored on resume.
[Claude Code Monitor](https://code.claude.com/docs/en/tools-reference),
[Claude Code plugin monitors](https://code.claude.com/docs/en/plugins-reference),
[Claude Code session limitations](https://code.claude.com/docs/en/scheduled-tasks)

## Pattern C: start or resume a later Agent turn

### Codex

Codex documents three programmatic ways to continue later:

- `codex exec resume --last "..."` or `codex exec resume <SESSION_ID> "..."` starts a
  later non-interactive turn in persisted conversation context;
- the Codex SDK can resume a thread and run another turn;
- a program that owns a Codex App Server connection can resume a thread and call
  `turn/start` when the remote event arrives.

App Server also has `turn/steer`, but that operation adds input only to an active turn
and rejects the request when there is no matching active turn. For an idle thread,
`turn/start` is the relevant operation. This means a local program that owns the
programmatic Codex session can start work in response to an event without the Agent
polling.
[Codex non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode),
[Codex SDK](https://learn.chatgpt.com/docs/codex-sdk),
[Codex App Server lifecycle](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md)

Codex `--json` output is an event stream from Codex to its caller. It helps a wrapper
observe `thread.started`, `turn.started`, `turn.completed`, item, and error events, but
it is not an input channel for injecting a future remote encounter event.
[Codex non-interactive JSONL output](https://learn.chatgpt.com/docs/non-interactive-mode)

Codex lifecycle hooks do not fill this gap. Current command hooks are synchronous;
the `async` option is parsed but unsupported. A `Stop` hook may cause immediate
continuation when a turn is trying to stop, but it is not a later asynchronous wake.
The older notification facility is outbound from Codex after Agent completion, not an
input into an idle Agent.
[Codex hooks](https://learn.chatgpt.com/docs/hooks),
[Codex notifications](https://learn.chatgpt.com/docs/config-file/config-advanced#notifications)

**Undocumented Codex behavior:** OpenAI does not document an arbitrary MCP server or
standalone local process attaching to and waking a separately running, idle Codex TUI.
It also does not document indefinite MCP or shell waits. A design requiring those
properties would need a prototype against pinned Codex versions.

### Claude Code

Claude Code persists sessions and supports `--continue`, `--resume <session>`, and
their non-interactive `-p` forms. The Agent SDK likewise supports resuming a specific
session. An external supervisor can therefore receive an event and launch a later
turn with the saved session identifier.
[Claude Code CLI reference](https://code.claude.com/docs/en/cli-usage),
[Claude Code sessions](https://code.claude.com/docs/en/sessions),
[Claude Agent SDK sessions](https://code.claude.com/docs/en/agent-sdk/sessions)

The Claude Agent SDK's streaming-input mode is an even closer fit for software that
owns a long-lived Agent process. Its input generator may wait for a condition and
then yield another user message into the persistent session. That is a later message
managed by the embedding program, not the completion of an earlier tool call.
[Claude Agent SDK streaming input](https://code.claude.com/docs/en/agent-sdk/streaming-vs-single-mode)

For an already-open interactive session, Claude Code also has event-specific options:

- **Channels** are MCP servers explicitly enabled as push channels. They can inject
  external events into a running session and cause Claude to react while the user is
  away. Ordinary MCP servers cannot do this. Channels are a research preview, require
  an open session, and currently require approved plugins or an explicitly dangerous
  development flag.
- **Monitor** can turn output from a local polling program or a WebSocket into events
  that Claude reacts to in the open session.
- an asynchronous command hook normally delivers context only on the next turn, but
  `asyncRewake` can wake an idle session when the hook exits with code 2. This hook
  must already have been started by a lifecycle event; it is not a general endpoint
  that arbitrary remote software can call.

[Claude Code Channels](https://code.claude.com/docs/en/channels),
[Claude Code Monitor](https://code.claude.com/docs/en/tools-reference),
[Claude Code asynchronous hooks](https://code.claude.com/docs/en/hooks)

All three mechanisms require the Claude Code session to remain running. A closed
session instead needs an external supervisor, scheduled product feature, or user to
start/resume a session.

## Comparison

| Situation                                                                 | Codex                                                                                                   | Claude Code                                                                    |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| One typed call waits and then returns in the same turn                    | Yes within the configured MCP or command lifetime; indefinite reliability is undocumented               | Yes within the effective tool lifetime; indefinite reliability is undocumented |
| Local code polls while that call remains blocked                          | Possible; the internal transport is the local program's concern                                         | Possible; additionally, Monitor can poll in the background and emit events     |
| Ordinary MCP server pushes into an idle session without a prior tool call | Not documented                                                                                          | No; Channels are the separate push-capable MCP mode                            |
| Local program starts a later turn after an event                          | Yes through App Server, SDK, or `codex exec resume`                                                     | Yes through Agent SDK or CLI resume                                            |
| Open interactive session reacts to an external event                      | No general documented TUI wake interface; App Server clients can call `turn/start` on sessions they own | Yes through Channels, Monitor, or limited `asyncRewake` hooks                  |
| Closed session wakes by itself                                            | Not documented                                                                                          | No for Channels/Monitor/hooks; an external trigger must start or resume work   |

## Consequences for Wayfinder

The player-facing integration does not need to make the coding Agent poll the game
server. Two implementation shapes remain credible:

1. **Blocking wait:** the Agent invokes one typed operation; local code waits; the
   same Agent turn continues when it returns. This gives a simple Agent experience but
   requires a bounded, tested wait lifetime for every supported Agent product.
2. **Later turn:** local code remains connected without an Agent call. When player
   input is needed, it resumes the relevant conversation and supplies a typed prompt
   through that Agent product's programmatic interface. This is better suited to long
   pauses but requires one adapter per Agent product and starts another Agent turn.

A hybrid is possible: collect consecutive player-owned fills during an active turn,
then use a later-turn wake after the encounter has waited long enough that holding the
original tool call open is undesirable.

The research does **not** decide:

- whether the product-facing interface should be CLI, MCP, an Agent SDK, or a direct
  App Server integration;
- the acceptable duration of a blocking wait;
- which Agent products the MVP promises to support;
- the exact prompt or typed operation used to present the next required player fill;
- whether a Claude-specific preview feature is acceptable for the MVP.

Before treating blocking waits as an MVP guarantee, prototype the same realistic wait
duration, cancellation, reconnect, and resume scenarios against pinned Codex and
Claude Code versions.
