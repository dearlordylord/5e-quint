# Iroh and P2P foundations for coding-agent combat

> **Research evidence, not architecture authority.** This note records primary-source
> findings and design inferences for later Wayfinder decisions. Stable product
> structure belongs in [`ARCHITECTURE.md`](../../ARCHITECTURE.md), as routed by
> [`CONTEXT-MAP.md`](../../CONTEXT-MAP.md).

Research checked: 2026-08-08.

## Question

Should the hosted, one-to-four-agent combat MVP build on peer-to-peer foundations
immediately, possibly using Iroh, or begin with a simpler central server and retain a
credible migration path?

This note uses only the facts already established in design discussion:

- each coding Agent will use future player-facing software rather than networking
  directly; that software has not been designed and has no stable domain term;
- the existing `@dnd/mcp` package is an integration-test and debugging surface, not
  that future player-facing software;
- one to four different users each control one player creature;
- future player-facing programs exchange typed inputs, never free-form decisions;
- predefined encounters start immediately when the lobby is ready;
- server-side logic controls monsters without an LLM for MVP;
- an encounter may pause indefinitely while waiting for an Agent;
- all mechanical state is public to all participants;
- tactical-space is a separate deterministic package.

## Executive finding

**Recommendation:** use a central server to store and advance the encounter for the
MVP, but keep typed requests and fills, deterministic state transitions, snapshots,
participant identity, and permission to act for a creature independent of its network
transport.

Do **not** adopt Iroh or distributed replication merely as a “foundation.” Iroh is a
credible later transport candidate, particularly for native or Node.js software, but
P2P connectivity does not answer who orders submitted inputs, supplies monster
decisions and dice, persists a paused encounter, recovers after all peers leave, or is
trusted when participants are different users.

This need not be an irreversible centralized choice. If the Battle Runtime boundary,
serialized state, dice inputs, and persistence are not tied to the hosted transport or
storage implementation, the same encounter-processing responsibility can plausibly
move from hosted infrastructure to one participant's machine without changing the
game rules. The exact migration cost is not validated; deployment, durable transfer,
host selection, reconnects, secrets, upgrades, and trust policy would remain. Having
several participant machines jointly determine the accepted state is a different and
much larger change; choosing Iroh now would not make that work disappear.

Choosing Iroh now could prepay some later connection work: authenticated endpoint
connections, NAT traversal, relay fallback, and endpoint identity. Iroh's higher-level
gossip and document protocols may also help with dissemination or CRDT synchronization,
but they are outside the stable Node FFI surface and do not provide the ordered,
durable, malicious-participant-aware encounter agreement discussed here. This is useful
networking groundwork, not a substitute for the multiplayer design.
[Iroh FFI support matrix](https://github.com/n0-computer/iroh-ffi/blob/main/support-matrix.yaml),
[Iroh Gossip API](https://docs.rs/iroh-gossip/latest/iroh_gossip/api/struct.JoinOptions.html),
[Iroh Docs engine](https://docs.rs/iroh-docs/latest/iroh_docs/engine/struct.Engine.html)

## Verified facts

### What Iroh currently provides

- The current Rust crate is Iroh 1.0.3. Iroh 1.0 was released on 2026-06-15 as
  the project's first stable release, after 65 pre-1.0 releases. Version 1 asserts
  stable wire and language APIs across its minor versions and supported languages.
  Major versions receive one year of full support and minor versions three months.
  This is meaningful maturity, but the stable line is still young.
  [Iroh 1.0 announcement](https://www.iroh.computer/blog/v1),
  [release and support policy](https://docs.iroh.computer/about/release-policy)
- Its API provides peer-to-peer QUIC connections
  addressed by public-key `EndpointId`, with hole punching and relay fallback
  underneath. The official crate describes itself as connectivity and streams, not an
  application-state or multiplayer-authority system. [Iroh 1.0.3 Rust API](https://docs.rs/iroh/latest/iroh/)
- By default, Iroh usually uses a relay to assist connection establishment, attempts a
  direct path, and retains encrypted relay transport as a fallback; connections with
  known direct addresses need not begin through a relay. Iroh reports that roughly nine
  out of ten networking conditions permit a direct path. Relays are stateless and do
  not persist application data. [Iroh relay model](https://docs.iroh.computer/concepts/relays),
  [NAT traversal](https://docs.iroh.computer/concepts/nat-traversal)
- Address lookup is a separate concern from identity. By default, signed addressing
  records are published through DNS/Pkarr; local and Mainline DHT lookup are optional.
  [Iroh address lookup](https://docs.iroh.computer/concepts/address-lookup)
- Iroh tickets can bootstrap short-lived sessions without a coordination server, but
  they may reveal direct IP addresses, are reusable rather than single-use, and can go
  stale. The Iroh docs recommend endpoint IDs rather than tickets when an application
  already has a coordination service or long-lived relationships.
  [Iroh tickets](https://docs.iroh.computer/concepts/tickets)
- Connections are end-to-end encrypted and authenticate the endpoint public keys. The
  application still decides which endpoint may connect using hooks and its own policy.
  A stable endpoint identity also requires the application to persist its secret key;
  otherwise a newly bound endpoint gets a new key. Relay admission is a separate
  control from application authorization. [Creating an Iroh endpoint](https://docs.iroh.computer/connecting/creating-endpoint),
  [endpoint hooks](https://docs.iroh.computer/connecting/endpoint-hooks),
  [Iroh FAQ](https://docs.iroh.computer/about/faq),
  [Iroh relay authentication](https://docs.iroh.computer/concepts/relays#authentication)
- Official FFI bindings now expose the stabilized 1.0 connection surface to Node.js,
  Python, Swift, and Kotlin, including endpoints, connections, protocols, custom relays,
  and Iroh Services. Here, protocol support means the connection accept loop and ALPN
  dispatch plumbing; it does not mean replicated application state. Higher-level
  `iroh-docs`, `iroh-gossip`, and `iroh-blobs` protocols are explicitly outside that
  stabilized FFI surface. [Iroh FFI README](https://github.com/n0-computer/iroh-ffi),
  [FFI support matrix](https://github.com/n0-computer/iroh-ffi/blob/main/support-matrix.yaml)
- The first-party Node.js package distributes prebuilt native binaries and does not
  require a local Rust toolchain. It requires Node 20.3 or later and currently lists
  macOS ARM (not Intel), Linux, Windows, and Android targets.
  [Iroh JavaScript support](https://docs.iroh.computer/languages/javascript)
- The Rust implementation can target browser Wasm, but browsers cannot establish
  Iroh's direct hole-punched connections because they cannot send raw UDP; browser
  traffic is relay-only. There is no official Wasm npm bundle, and Iroh recommends an
  application-specific Rust `wasm-bindgen` wrapper. Future player-facing software that
  runs beside a coding Agent could potentially use the native Node binding, but that
  software has not been designed.
  [Iroh WebAssembly and browser support](https://docs.iroh.computer/languages/wasm-browser)
- Free public Iroh relays are for development and hobby use: no SLA, rate limits, and
  support only for the latest stable release. Production use requires managed or
  self-hosted relay infrastructure. [Iroh public relay policy](https://docs.iroh.computer/iroh-services/relays/public)

### What P2P connectivity does not provide

- In the replicated-state-machine design described by Raft, replicas apply the same
  noncommutative operations in the same order. Raft separates the application state
  machine from the consensus module that supplies that ordered log; leader election,
  replication, stable storage, snapshots, and membership are additional mechanisms.
  Other replicated designs, such as CRDTs, can converge under different constraints;
  this note does not establish that Battle Runtime transitions have those properties.
  [Raft paper](https://raft.github.io/raft.pdf)
- Raft's safety model explicitly covers non-Byzantine failures: servers stop and later
  recover. It does not make a participant running modified software honest. Therefore,
  ordinary replicated-state-machine consensus is not by itself an anti-cheat solution
  for mutually untrusted users. [Raft paper, section 2](https://raft.github.io/raft.pdf)
- In mainstream multiplayer architecture, a server stores the accepted state, validates
  player requests, and sends results to participants. If one player hosts this work,
  that player has extra control; a dedicated server removes that particular asymmetry.
  [Unreal dedicated-server model](https://dev.epicgames.com/documentation/unreal-engine/setting-up-dedicated-servers-in-unreal-engine),
  [Unity asynchronous authoritative-state example](https://docs.unity.com/en-us/cloud-code/game-state-management)
- Host election and state migration are separate problems. Unity's official host-
  migration documentation warns that selecting a new host does not itself migrate
  network-synchronized state. [Unity host migration](https://docs.unity.com/en-us/lobby/host-migration)

## Inferences for this game

The following statements are reasoned consequences of the verified facts and the
established product constraints; they are not claims made by Iroh.

1. **Iroh is a transport candidate, not a multiplayer architecture.** An Iroh endpoint
   can carry typed requests, fills, and snapshots, but the application must still
   define lobby membership, who may act for each combatant, ordering, stale-request
   rejection, dice, monster actions, persistence, and recovery.
2. **P2P does not require every participant's machine to advance the encounter.** One
   participant's machine could perform the same encounter-processing work that a
   central server performs while the others connect through Iroh. That reduces hosted
   game compute, but the host can tamper with the reducer, monster decisions, dice, or
   accepted history unless the other participants verify a stronger protocol.
3. **Full public state makes verification easier, but does not decide which result to
   continue from.** Participants can re-run deterministic transitions and detect some
   differences. They still need an accepted input order and a policy for a bad host,
   conflicting histories, missing dice contributions, or a participant who disappears
   during a transition.
4. **Indefinite pause raises persistence above live connectivity.** Iroh relays store no
   application data. If every peer is offline, some durable local or hosted store must
   retain the encounter. If only one peer retains it, recovery inherits that peer's
   availability and honesty; replicated recovery needs a replication and conflict
   policy.
5. **A central MVP appears cheap in the dimension Iroh optimizes.** The expected
   protocol is turn-based and uses typed messages plus public state snapshots. Rule
   execution and persistence remain necessary work. The actual workload and deployment
   cost have not been measured, so this is an estimate to validate with a spike rather
   than a proven cost claim.
6. **Rust is not required to evaluate Iroh.** Node bindings permit a later spike from
   future player-facing Node software. Embedding the Rust crate directly would
   introduce a Rust build, packaging, FFI, and observability boundary that the MVP does
   not otherwise need.

## Three different P2P designs

These must not be collapsed into one idea:

1. **Direct connections with one participant running the encounter.** Participant
   programs connect directly, but one of them orders submitted inputs and stores the
   accepted results. Moving this work from hosted infrastructure onto a participant's
   machine changes deployment and trust, not the Battle Runtime's rules.
2. **Automatic agreement among participant programs.** The software running beside
   each coding Agent—not the coding Agents themselves—can exchange inputs, select which
   participant advances the encounter, verify transitions, replicate history, and
   recover after disconnects. This need not consume any LLM turns. It is nevertheless
   substantial distributed-systems engineering: input ordering, duplicate suppression,
   partitions, membership, durable state, conflict handling, and possibly malicious
   participants still need executable protocols. Iroh supplies authenticated
   connections and streams; it does not supply this state agreement. The Raft paper
   illustrates the separate consensus machinery needed even for non-Byzantine
   replicated state machines. [Raft paper](https://raft.github.io/raft.pdf)
3. **LLM-agent negotiation.** Coding Agents could be resumed and asked to negotiate
   conflicting histories, choose a host, or approve transitions. That would consume
   Agent turns, add nondeterministic table interpretation, and couple mechanical
   progress to Agent availability. Nothing in Iroh requires or provides this design,
   and it is not implied by automatic replication among participant programs.

The second design therefore answers one concern—coordination does not inherently wake
the coding Agents—but it does not make replicated agreement cheap or automatic.

## Decision matrix

The ratings below are design estimates, not benchmark results. A workload and
deployment spike is required before using them as cost evidence.

| Option                                                      | MVP simplicity | Fairness across different users                                                         | Paused-session recovery                                      | Hosted cost                                                          | Later flexibility                                             |
| ----------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------- |
| Central TypeScript service                                  | **High**       | **High**, assuming service trust                                                        | **Straightforward** with server persistence                  | Small per turn; service and storage remain                           | **High** if messages and Battle Runtime are transport-neutral |
| One participant hosts, using conventional or Iroh transport | Medium         | Host is privileged and can cheat                                                        | Requires host persistence, export, or migration              | Lower game compute; discovery/relay may remain                       | Good for casual trusted groups                                |
| Raft-like replication with one elected writer               | Low            | Tolerates defined fail-stop failures while a quorum remains; not malicious participants | Requires replicated log, snapshots, election, and membership | Low central game compute; relay/discovery still possible             | High, but buys machinery not required by MVP                  |
| Participant programs jointly determine state                | **Very low**   | Potentially strongest, if fully designed                                                | Requires malicious-participant-aware history and recovery    | Infrastructure may fall; protocol and participant-program cost rises | Largest scope and highest research risk                       |

Iroh can implement connectivity for either participant-hosted row. It does not select
a row or supply the agreement, persistence, or trust properties shown in the table.

## Foundations to lay now

These interfaces reduce migration cost without committing to P2P infrastructure:

1. **Transport-neutral typed messages.** Network messages should carry the Battle
   Runtime request, Runtime Hole fill, or other typed input being submitted, not expose
   HTTP routes, WebSocket messages, or Iroh streams as game concepts. This does not
   decide whether the future player-facing software submits one fill or several fills
   at a time.
2. **One encounter-processing boundary.** The central server should pass authenticated
   typed input and the expected state identity through one boundary that returns a
   typed rejection, the next Runtime Hole frontier, or the next committed Battle State.
   A future participant-hosted process should be able to call that same boundary. The
   exact request granularity remains a separate design decision.
3. **Independent identities.** Keep account/participant identity, local device or
   transport endpoint identity, and controlled combatant identity distinct. An Iroh
   `EndpointId` can authenticate a connection; it must not automatically grant a lobby
   seat or control of a creature.
4. **Request identity and stale-state protection.** Give each submitted network request
   a stable ID for retry/idempotency and bind it to an expected canonical state identity
   (revision or hash). This is useful centrally and becomes important with retries and
   reconnecting participants.
5. **Canonical state and deterministic transition inputs.** State snapshots need a
   canonical serializable form. All nondeterministic results consumed by the reducer,
   including dice, must be explicit server-produced inputs or outcomes so replaying
   a transition does not silently reroll.
6. **Snapshot import/export at the encounter boundary.** A durable snapshot should be
   sufficient for compatible encounter-processing code to resume. It should not depend
   on a server ORM entity or an Iroh-specific document format.
7. **Protocol compatibility identity.** Snapshots and typed network messages must
   identify the compatible domain/protocol version or rules build. A raw state hash
   alone proves byte identity, not that two participant programs execute the same
   reducer.
8. **Participant programs treat local state as a copy.** Even though every participant
   receives the full public state and may run the same code, only the central server
   stores the result that participants continue from. This prevents a local copy from
   silently creating a competing encounter history.

These are application truths, not a request to build a generic networking abstraction.
A plain function/API boundary and serializable types are enough for the MVP.

## Safe to postpone

- choosing Iroh, WebRTC, WebSocket, SSE, long polling, or another transport;
- Rust services or native-library packaging;
- endpoint discovery, tickets, relay selection, and relay operations;
- peer-host selection and host migration;
- replicated logs, quorum rules, leader election, CRDTs, or offline merge;
- signed input chains and independent participant verification;
- resistance to a malicious host or participant;
- distributed/verifiable randomness;
- browser-to-browser connectivity;
- peer-owned durable backups and recovery after all peers go offline;
- bandwidth optimization, delta state synchronization, and gossip fan-out.

None of these is required to prove the current loop: future player-facing programs join,
submit typed inputs for their creatures, receive public state, and wait indefinitely
when no Agent is active.

## How hard is migration later?

There are two materially different migrations:

### Central server to one participant-hosted process: cost not yet validated

If the foundations above hold, the same encounter processor can plausibly run on one
participant's machine without rewriting Battle Runtime or tactical-space. Discovery,
connectivity, host authorization, durable transfer, reconnect behavior, packaging,
upgrades, secrets, and deciding whether the host's extra control is acceptable would
remain. This is substantially less machinery than replicated agreement, but its cost
must be validated by a deployment spike rather than assumed from interface design.

### Central server to replicated P2P with reduced server trust: hard

This changes the correctness and threat model. It requires an ordered replicated
history, membership changes, conflict/partition behavior, malicious-peer handling,
fair random results, recovery, compatible code verification, and a product answer for
what happens when peers disagree. Transport-independent reducers help, but no early
transport choice removes this work.

## Recommended next Wayfinder treatment

- Preserve the **central-server MVP** as the working route, not yet as permanent
  architecture authority.
- Record **one participant hosts the encounter** and **participant programs replicate
  and agree on encounter state** as two separate later possibilities. Calling both
  “P2P” hides the critical trust distinction.
- Before choosing Iroh, run a narrow later spike from future Node.js player-facing
  software: connect
  two machines behind realistic NATs, reconnect after network change, test package and
  binary distribution on supported operating systems, and measure relay fallback.
- Revisit replicated P2P only if reducing or eliminating trust in our hosted server
  becomes a real product requirement. It is not a transport-layer optimization.
