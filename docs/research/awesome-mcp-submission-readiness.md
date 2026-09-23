# Awesome MCP submission readiness

Research snapshot: 2026-09-21. No fork, upstream edit, or pull request was
created. This note is the local preparation record for a possible submission of
`dearlordylord/5e-quint` to
[`punkpeye/awesome-mcp-servers`](https://github.com/punkpeye/awesome-mcp-servers).

## What the list currently requires

The repository's contributor instructions require a public GitHub repository
that can be installed and run, a repository-linked name, a concise functional
description, the appropriate category, one entry per line, and alphabetical
ordering. Remote-only servers belong in the separate remote-server list. See
[`CONTRIBUTING.md`](https://github.com/punkpeye/awesome-mcp-servers/blob/main/CONTRIBUTING.md).

The current submission check is stricter than the older prose in that file. For
new entries it checks all of the following:

- the primary link is GitHub and is not already listed;
- the link text contains `owner/repository`;
- the line contains at least one permitted language/runtime or hosting emoji,
  and no unknown emoji; and
- the line contains a Glama **score badge**, not merely a plain Glama link.

Those checks are implemented in the repository's
[current `check-glama.yml`](https://github.com/punkpeye/awesome-mcp-servers/blob/main/.github/workflows/check-glama.yml).
The bot's missing-Glama guidance says to list the server on Glama, ensure it
starts and answers introspection requests, and add this badge shape:

```markdown
[![OWNER/REPO MCP server](https://glama.ai/mcp/servers/OWNER/REPO/badges/score.svg)](https://glama.ai/mcp/servers/OWNER/REPO)
```

The README's current legend defines `📇` as TypeScript/JavaScript, `☁️` as a
cloud server, and `🏠` as a local server. The Gaming section is the natural
category for a rules-and-battle MCP: it is described as integrations with
gaming data, game engines, and services. The section is alphabetized by the
repository link, so `dearlordylord/5e-quint` belongs after `ddsky/gamebrain-api-clients`
and before `DiegoLopez0208/RpgMakerMVUltimate-MCP` in the current README.
See the [Gaming section](https://github.com/punkpeye/awesome-mcp-servers/blob/main/README.md#-gaming).

## What Huly teaches us (and what has changed)

The merged Huly submission was PR [#1807](https://github.com/punkpeye/awesome-mcp-servers/pull/1807),
merged on 2026-03-05. Its actual change was one README line under Workplace &
Productivity, with a GitHub link, a plain `[glama]` link, language/platform
emojis, and a short capability description. That was sufficient at the time,
but the current workflow now looks specifically for the Glama score-badge URL;
the old Huly line is therefore a historical example, not a current template.

Recent merged submissions show a stable current pattern:

- one concise README line, usually with a Glama score badge and permitted
  emojis;
- a description that names the distinctive capabilities, tool count or
  install command when useful, and whether the service is local, hosted, or
  both; and
- a PR body that records the public repository, license, Glama listing/check,
  category/alphabetical placement, and basic validation.

Examples are [L2 Calendar #14661](https://github.com/punkpeye/awesome-mcp-servers/pull/14661),
[port-keeper #14635](https://github.com/punkpeye/awesome-mcp-servers/pull/14635),
[Mi Fitness Data Bridge #14504](https://github.com/punkpeye/awesome-mcp-servers/pull/14504),
and [mundane-mcp #14470](https://github.com/punkpeye/awesome-mcp-servers/pull/14470).
Several of these added the score badge in a follow-up commit after the bot
commented; including it initially avoids that round trip. The optional
automated-agent fast path is a `🤖🤖🤖` suffix in the PR title, per
[`CONTRIBUTING.md`](https://github.com/punkpeye/awesome-mcp-servers/blob/main/CONTRIBUTING.md),
but it is not needed for a human submission.

## Our readiness

| Requirement                   | Evidence                                                                                                                                                                                                          | Status         |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Public GitHub repository      | [`dearlordylord/5e-quint`](https://github.com/dearlordylord/5e-quint)                                                                                                                                             | Ready          |
| Installable/runnable server   | Published [`@dearlordylord/dnd-mcp`](https://www.npmjs.com/package/@dearlordylord/dnd-mcp), with `pnpm dlx @dearlordylord/dnd-mcp` documented in [`distribution/mcp/README.md`](../../distribution/mcp/README.md) | Ready          |
| Glama listing and score badge | [Glama profile](https://glama.ai/mcp/servers/dearlordylord/5e-quint) and [score badge](https://glama.ai/mcp/servers/dearlordylord/5e-quint/badges/score.svg)                                                      | Ready          |
| Glama build/start path        | [`operations/public-mcp/Dockerfile`](../../operations/public-mcp/Dockerfile) and the repository's [Glama evaluation instructions](../../operations/public-mcp/README.md#glama-evaluation)                         | Ready          |
| Current category              | Gaming                                                                                                                                                                                                            | Ready          |
| Current tool quality          | Individual Glama tool checks are A; the profile-level aggregate remains B, so this is not a blocker but is worth monitoring                                                                                       | Ready, monitor |
| Persistence claim             | The proposed wording says session-scoped/stateful workflows, not durable persistence; the Glama deployment can be used without promising persistent sessions                                                      | Ready          |

## Draft line (not submitted)

This is the candidate line only. It has not been added to Awesome MCP:

```markdown
- [dearlordylord/5e-quint](https://github.com/dearlordylord/5e-quint) [![dearlordylord/5e-quint MCP server](https://glama.ai/mcp/servers/dearlordylord/5e-quint/badges/score.svg)](https://glama.ai/mcp/servers/dearlordylord/5e-quint) 📇 ☁️ 🏠 - D&D 5e SRD 5.2.1 rules engine and MCP server for character creation, character sheets, and turn-based battles, with session-scoped Play Sessions, discovery/fill workflows, dice witnesses, and formal Quint/TypeScript execution. Install: `pnpm dlx @dearlordylord/dnd-mcp`.
```

Why this shape:

- `📇 ☁️ 🏠` matches the TypeScript implementation, Glama-hosted deployment,
  and local stdio package without asserting unverified OS support;
- the first link is the required public GitHub link and the second is the
  current score badge path;
- “session-scoped” avoids implying that the Awesome entry guarantees durable
  sessions on every host; and
- the package command gives local users a concrete starting point while the
  Glama link gives hosted users a direct path.

Before submitting, re-check the published package version and Glama profile,
then paste this line at the calculated alphabetical position. The only
upstream action required by the list is a one-line README change plus a normal
PR; no code change in this repository is required for list membership.

## Existing D&D/SRD entries to differentiate from

The current Awesome Gaming section already includes:

- [`chaoz23/srdcheck`](https://github.com/chaoz23/srdcheck), a Python/local
  deterministic SRD 5.2.1 rules-verdict server with cited legality checks and
  state lineage;
- [`gregario/dnd-oracle`](https://github.com/gregario/dnd-oracle), a
  TypeScript/local D&D 5e SRD reference and analysis server with monster,
  spell, encounter, and loadout tools; and
- [`yanjingzhaisun/cozyvtt-mcp`](https://github.com/yanjingzhaisun/cozyvtt-mcp),
  a local VTT bridge with dice, chat, maps, initiative, sheets, and rulebook
  documents.

The proposed entry should therefore emphasize the differentiator that is true
of this repository: an executable SRD 5.2.1 rules engine spanning character
creation plus turn-based Battle workflows, where the agent discovers legal
next actions and fills runtime questions. It should not claim that this server
is the only SRD implementation or that its sessions are durable on every
deployment.

### Broader current landscape

The parallel inventory checked current Awesome/Glama listings and the linked
project repositories. The closest overlaps are:

| Project                                                                               | Current positioning                                                                                    | Distinction from `5e-quint`                                                      |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| [`gregario/dnd-oracle`](https://github.com/gregario/dnd-oracle)                       | Bundled SRD reference and analysis for monsters, spells, encounters, and loadouts                      | Lookup/analysis rather than the same executable creation/session/Battle workflow |
| [`chaoz23/srdcheck`](https://github.com/chaoz23/srdcheck)                             | Cited SRD 5.2.1 legality verdicts with explicit refusal outside scope                                  | Stateless rules-verdict rail, not character-and-Battle state                     |
| [`Terranslayer/dnd5e-tool-server`](https://github.com/Terranslayer/dnd5e-tool-server) | 27-tool Python DM utility for dice, rules, encounters, reference lookup, and campaign notes            | Broader DM utility and 2014 SRD 5.1 data                                         |
| [`heffrey78/dnd-mcp`](https://github.com/heffrey78/dnd-mcp)                           | Open5e search, character-build, and encounter helpers across several sources                           | Reference/build helpers, not the formal SRD-only execution surface               |
| [`jazzsequence/5eMCP`](https://github.com/jazzsequence/5eMCP)                         | Live 5etools reference, calculators, prompts, and instructions                                         | Reference/calculator server rather than a character/Battle state machine         |
| [`asinkLuno/dnd-5e-mcp`](https://github.com/asinkLuno/dnd-5e-mcp)                     | Small 2014 community-wiki search/fetch server                                                          | Documentation retrieval only                                                     |
| [`frap129/lorekeeper-mcp`](https://github.com/frap129/lorekeeper-mcp)                 | Cached Open5e lookup/search across spells, creatures, options, equipment, and rules                    | Lookup/search with no Battle state                                               |
| [`Linell/grimoire-mcp`](https://github.com/Linell/grimoire-mcp)                       | Spell search, details, class lists, and schools                                                        | Spellbook-only                                                                   |
| [`Mnehmos/rpg-mcp`](https://github.com/Mnehmos/mnehmos.rpg.mcp)                       | Persistent, rules-enforced D&D-compatible RPG backend with combat, worlds, dice, inventory, and quests | Broad 5e-compatible game engine, not limited to the redistributable SRD corpus   |

Adjacent listings include a minimal multiplayer text TRPG
([`Akatsuki-SAYO/DnD-WebMCP`](https://github.com/Akatsuki-SAYO/DnD-WebMCP)), a
D&D Beyond account reader ([`jacoscha/dnd-beyond-mcp`](https://github.com/jacoscha/dnd-beyond-mcp)),
and campaign/world managers such as
[`slambdi99-cyber/dnd-universe`](https://github.com/slambdi99-cyber/dnd-universe)
and [`study-flamingo/gamemaster-mcp`](https://github.com/study-flamingo/gamemaster-mcp).
The inventory found stale or inconsistent documentation in some of these
listings, so their Glama summaries should not be treated as authoritative
implementation claims. It also found adjacent projects outside the current
Awesome/first-page Glama set, including
[`andreasmaurer0210/VECNA`](https://github.com/andreasmaurer0210/VECNA) and
[`cpuchip/dnd-tools`](https://github.com/cpuchip/dnd-tools); these are useful
competitive context, not evidence that an Awesome entry is required.

The competitive positioning is consequently clear: do not submit this as a
generic D&D lookup server. Lead with executable SRD 5.2.1 character creation,
character-sheet management, discovery/fill interaction, and turn-based Battle
resolution grounded in the formal runtime.

## Decision

We are technically ready to submit. The recommended next action is a human
review of the draft line and a submission PR to Awesome MCP when desired. This
research task intentionally stopped before creating a fork, branch, commit, or
PR upstream.
