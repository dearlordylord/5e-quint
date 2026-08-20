# SRD Play MCP Apps widget prototype envelope

> **Research evidence, not architecture authority.** This note resolves a
> Wayfinder research question. Stable product structure belongs in the owning
> architecture or accepted specification, as routed by
> [`CONTEXT-MAP.md`](../../CONTEXT-MAP.md).

Research checked: 2026-08-20.

## Question

What is the smallest supported MCP Apps experiment that can render read-only
character-list and current-battle projections beside a ChatGPT conversation,
while keeping all choices in the conversation and deriving every displayed fact
from canonical tool results?

## Finding

Build **two inline, read-only cards**, each attached directly to one existing
read tool:

| Existing data tool | UI resource | Display responsibility |
| --- | --- | --- |
| `list_characters` | `ui://srd-play/character-list/v1.html` | The returned character-session rows, including their existing derived Character Sheet display facts |
| `read_battle_state` | `ui://srd-play/battle-state/v1.html` | The returned current Battle State projection and battle snapshot |

This is the smallest useful experiment because these tools already return the
canonical read projections that the proposed cards need. Attaching UI to these
two selected read tools does not require a second query model, a UI-owned store,
or a render copy of battle and Character Sheet semantics. OpenAI recommends that
tools remain useful without UI and that UI be attached only to selected tools;
it also recommends separating data work from rendering when attaching a widget
to every data call would cause excessive iframe re-renders. Here, each card is
the intentional result of an explicit read, so separate render tools would add
another caller protocol without improving this bounded experiment.
[Add UI to your MCP server](https://developers.openai.com/plugins/build/chatgpt-ui)

The complete Character Creation and battle workflow remains in the ChatGPT
conversation. The cards inspect state only. They do not select Units or Stat
Blocks, fill Creation Holes or Runtime Holes, choose Battle Acts, roll dice,
start or end battles, or send follow-up messages.

## Resource and tool association

Register each card as an MCP resource with MIME type
`text/html;profile=mcp-app`. Associate only `list_characters` with the
character-list resource and only `read_battle_state` with the battle-state
resource through the standard `_meta.ui.resourceUri` descriptor field. The
ChatGPT-specific `_meta["openai/outputTemplate"]` alias is not needed for new
UI. Treat each versioned resource URI as a cache key and change `v1` when a
breaking HTML, CSS, or JavaScript change is made.
[Add UI to your MCP server](https://developers.openai.com/plugins/build/chatgpt-ui),
[Plugin UI reference](https://developers.openai.com/plugins/reference)

Both tool descriptors should declare their current exact `outputSchema` and
the annotations:

```json
{
  "readOnlyHint": true,
  "destructiveHint": false,
  "openWorldHint": false
}
```

These annotations describe read operations to the host. The stronger
read-only guarantee comes from the component itself: it does not issue
`tools/call`, `ui/message`, or `ui/update-model-context`, and it contains no
control that performs a domain action. Ordinary local disclosure controls,
such as accessible expand/collapse sections, may change ephemeral presentation
state without changing application state.
[Plugin UI reference](https://developers.openai.com/plugins/reference)

## Iframe and bridge lifecycle

For either tool, the supported lifecycle is:

1. ChatGPT calls the existing tool and receives its model-readable result.
2. The tool's `resourceUri` identifies the registered HTML resource.
3. ChatGPT mounts that resource in an isolated iframe beside the conversation.
4. The component initializes the MCP Apps JSON-RPC bridge by sending
   `ui/initialize`, then announces readiness with
   `ui/notifications/initialized`.
5. The host sends the tool input through
   `ui/notifications/tool-input` and the result through
   `ui/notifications/tool-result`.
6. The component parses the latest `structuredContent` as untrusted input and
   renders it. A later result notification replaces the displayed authoritative
   snapshot.
7. Unmount ends that UI instance and its ephemeral state.

The bridge uses JSON-RPC over `postMessage`. Message handlers must accept only
JSON-RPC messages from `window.parent`; they must remove listeners on component
cleanup. The prototype needs no `window.openai` extension. Compatibility
aliases such as `window.openai.toolOutput` exist, but new UI should use the MCP
Apps bridge when the standard covers the capability.
[MCP server and UI quickstart](https://developers.openai.com/plugins/build/app-quickstart),
[Add UI to your MCP server](https://developers.openai.com/plugins/build/chatgpt-ui)

## Receiving and displaying tool results

Render only `structuredContent` that passed the tool's declared output schema.
The same `structuredContent` is visible to ChatGPT and to the component, so the
conversation remains understandable if the card does not load. `content` can
continue to provide the short model-readable summary. Tool-result `_meta` is
component-only and is not needed for domain data in this experiment.
[Plugin UI reference](https://developers.openai.com/plugins/reference)

Do not reshape or recalculate domain facts in the component. In particular:

- the character card displays the returned `list_characters` projection; it
  does not recompute Hit Point Maximum, Hit Dice, Spell Slots, Pact Slots, or
  feature resources;
- the battle card displays the returned `read_battle_state` projection; it
  does not determine the current actor, available Battle Acts, conditions,
  Hit Points, or handoff state;
- labels are projections of returned typed facts or fixed interface copy, not
  a second authored-content or mechanics registry;
- an empty character list and the absence of an active battle use the tool's
  existing result or typed-error contract. The component must not translate
  `undefined` into a second spelling of either state.

If the existing result is too large or lacks a display fact, strengthen the
owning SDK/MCP projection rather than create UI-private state or mechanics.

## State rules

OpenAI distinguishes authoritative business data, ephemeral UI state, and
durable cross-session state. Authoritative data belongs on the MCP server or an
external service; widget state belongs to one rendered UI instance and is not
a business-data store.
[Add UI to your MCP server](https://developers.openai.com/plugins/build/chatgpt-ui)

For this experiment:

- `list_characters` and `read_battle_state` results are the only authoritative
  inputs to their cards;
- the cards persist no character, battle, selection, hole, fill, roll, or
  session fact;
- optional expand/collapse state stays in component memory and may be lost on
  unmount;
- do not use `window.openai.widgetState`, `localStorage`, cookies, or a remote
  store;
- after ChatGPT changes application state through a conversation-owned tool,
  ChatGPT explicitly calls the corresponding read tool to render a fresh card.

This prototype therefore supplies no evidence for cross-conversation
persistence or shared Plugin/Sites storage. Those are separate decisions.

## Hosting and CSP

Serve the HTML resources through the MCP server and inline the prototype's CSS
and JavaScript. Load no remote scripts, fonts, images, APIs, or nested iframes.
The resource can therefore declare empty `connectDomains` and
`resourceDomains`, omit `frameDomains`, and avoid the ChatGPT-only redirect
allowlist. Nested frames are blocked by default. If the experiment later adds
external resources, every exact origin must be declared in `_meta.ui.csp`.
[Add UI to your MCP server](https://developers.openai.com/plugins/build/chatgpt-ui),
[Plugin UI reference](https://developers.openai.com/plugins/reference)

The MCP server itself must be reachable in developer mode through either a
public HTTPS Streamable HTTP endpoint or Secure MCP Tunnel. A separately hosted
web application is not required for this experiment. A dedicated component
origin is required for public plugin submission, but public submission is
outside this prototype envelope.
[Connect and test your plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt),
[Plugin UI reference](https://developers.openai.com/plugins/reference)

## Developer-mode test procedure

1. Use MCP Inspector to list both tools and both UI resources, then call each
   tool with normal, empty, and no-active-battle cases. Verify annotations,
   resource URIs, declared output schemas, schema-valid `structuredContent`,
   and useful model-readable `content`.
2. Make the server reachable through Secure MCP Tunnel or a public HTTPS
   Streamable HTTP `/mcp` endpoint.
3. Enable ChatGPT **Developer mode** under **Settings → Security and login**,
   add the MCP connection on the Plugins page, and inspect the discovered tools
   and metadata. Availability can depend on account and workspace policy.
4. Start a new conversation with the connection enabled. Ask ChatGPT to show
   the character list and then the current battle. Confirm that it selects the
   corresponding read tool and renders the matching inline card.
5. Perform Character Creation and battle changes only through conversation
   tool calls. Ask ChatGPT to read the projection again and confirm that the
   newly returned snapshot, not the prior iframe, determines the next card.
6. Test with component rendering disabled or unavailable and confirm that the
   same read tools still let ChatGPT explain the result.
7. After metadata or UI-resource changes, restart or deploy the server, refresh
   the developer-mode connection, start a new conversation, and rerun the
   affected cases.

OpenAI's test guidance requires representative and edge-case direct tool calls,
evaluation prompts, recorded tool selection and results, component and
model-readable-result testing, metadata refresh after UI changes, and no
component console errors.
[Connect and test your plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt)

## Prototype acceptance evidence

Accept the experiment only when one captured test run contains:

- MCP Inspector output proving both resource registrations, the two exact
  tool-to-resource associations, read-only annotations, and successful
  schema-valid calls;
- ChatGPT developer-mode screenshots or a screen recording showing the
  character-list card and battle-state card inline with the conversation;
- the recorded tool name, arguments, `structuredContent`, and model-readable
  response for each card;
- one before/after sequence in which a conversation-owned operation changes
  canonical state and a later explicit read renders the changed projection;
- an empty character-list case and a no-active-battle case with no invented
  state;
- browser console evidence with no component errors or CSP violations;
- network or bridge instrumentation showing that the cards make no tool calls,
  send no follow-up messages, and contact no external origin;
- a no-UI run proving that ChatGPT can still inspect and explain both tool
  results.

The experiment succeeds if these facts show that a card improves inspection
without becoming a second interaction or state system. It fails—and should not
expand—if users cannot understand the projections, ChatGPT must use the card to
complete the workflow, the component needs domain calculations, or keeping the
card fresh requires implicit UI-owned session state.

## Explicitly outside the experiment

- Character Creation or battle controls in the widget;
- widget-originated tool calls or conversation messages;
- dice controls, animation, picture-in-picture, fullscreen, or navigation;
- durable widget, account, character, or battle storage;
- Sites integration or shared Plugin/Sites storage;
- user-authored Stat Blocks;
- public plugin submission and marketplace review;
- any change to SRD mechanics, Surface support, or PHB+ content policy.
