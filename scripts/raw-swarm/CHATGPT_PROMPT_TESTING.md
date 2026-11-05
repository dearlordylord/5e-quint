# Test MCP through real ChatGPT conversations

This is the second swarm testing method. Give the installed ChatGPT plugin
ordinary user prompts with different stories, then inspect its tool use and
outcome. The first method uses agents against the SDK or MCP directly. These
methods find different failures. A local agent cannot certify installed
ChatGPT behavior.

This protocol owns browser-driven prompt attempts. It does not create admitted
Scenario or Execution identities. Existing Raw Swarm execution lanes and their
commands remain unchanged. For local CLI and API dialogue checks, use the
[MCP dialogue instructions](../../packages/mcp/README.md#autonomous-dialogue-checks).

## Prepare an attempt

1. Record an attempt identity, exact prompt, plugin URL and version, available
   model label, Chat or Work mode, backend `/version`, and start time in UTC.
   Also record whether this is fresh exploration or a targeted confirmation.
2. Identify what is installed. Record the published or draft Skill, and any
   unpublished tool definitions. A deployed backend, cached tool definitions,
   and installed Skill can represent different releases. Mark unknown versions
   as unknown. Do not certify a local candidate through an older installation.
   Compare the backend's actual `tools/list` with the tested candidate. When
   available, export the platform's published `live` tool snapshot and compare
   protocol names, descriptions, schemas, annotations, and server instructions.
   A deployment version or `Published` label alone does not prove that the
   installed definitions match. Keep Skill/package publication separate.
3. Set a wall-clock budget and a maximum number of user follow-ups. These are
   campaign limits, not new library acceptance gates. Start with one conversation
   at a time. A one-shot task has zero user or supervisor follow-ups: delegate
   its choices in the initial prompt and require its logical end in that turn.
   Parallel browser attempts need independent tabs and one UI writer.
4. Open the plugin page and select **Try in chat**, or select the plugin in a
   fresh conversation. Inspect the composer before typing. Preserve existing
   user drafts. Starter text may already be inserted; record the text actually
   sent and the selected plugin.
   Select the installed public or staging plugin through the actual `@` picker;
   a pasted Markdown `app://` link is not evidence of a selected plugin. Verify
   the resulting plugin link and distinguish similarly named test connections.
5. Send the task without defect hints, tool names, payload examples, expected
   rolls, or an implementation checklist. Record preceding turns if the task
   follows catalog browsing or another setup conversation.

After inserting a prompt, inspect the actual composer text before sending.
If it differs, or another person changes the shared browser, stop UI actions
and preserve their draft. A successful paste call does not prove that the
intended prompt reached the composer.

The conversation can run in the background. On a shared computer, reacquire
the active window and its state before interacting; preserve the operator's
typing and resume only in the intended test tab. Use one UI writer.

Use the session's supported computer-use tools for browser interaction. Refresh
accessibility state after actions and derive element references from that state.
Use screenshots when accessibility text cannot establish the visual result.
Browser control, tool metadata, and available models vary by environment; do not
claim a reusable browser CLI exists merely because one UI attempt worked.

## Vary the story without prescribing the solution

Keep prompts short and state the user's objective, delegated decisions, and
observable completion. Rotate journeys rather than just renaming the wizard.
Use SRD or visibly synthetic identities, following the
[authoring policy](../../docs/mushroom-playbook/AUTHORING.md).

Suggested prompts:

- "Create a wizard with Fireball and fight a balanced group of monsters.
  Choose tactics for both sides, accept the dice, calculate the geometry
  programmatically, show a live battlefield widget, and finish the battle.
  Use the Oracle for rules and mechanics."
- "Create an SRD character. Choose the build, resolve the remaining choices,
  finalize the character, and show the result without asking me to choose."
- "Continue the character from this conversation in the same saved game.
  Make the remaining build decisions yourself, finalize it, and show the result."
- "Make a small melee skirmish around a narrow bridge. Run both sides fairly,
  calculate distances, accept casualties, and finish the encounter."
- "Can this Oracle run a custom monster I wrote? Explain what it supports."

Treat these as prompt seeds, not preapproved executable mechanics. The engine's
actual support determines what can execute. Record an unsupported request as
such rather than changing rules to make a story pass.

## Observe without coaching

Let ChatGPT proceed under the user's delegation. Expand tool activity to inspect
observable operations. Retain exact requests and results when the product exposes
them; activity labels alone do not prove valid mechanics or accepted input.

Record meaningful progress, rejections, retries, requests for human decisions,
and any blocker. Do not repair a payload from the supervising agent during a
fresh attempt. If a clarification is necessary, retain the exact reply and label
the attempt assisted. A later targeted reproduction is a separate attempt.

For visualization tasks, inspect the actual widget during combat. An edited
file, a promised map, or a final replay does not prove a visible intermediate
widget. Retain a screenshot or artifact reference with the contemporaneous
battle state and conversation position. Check that displayed HP and effects
come from the engine; separate table geometry from applied state.

Stop at the declared budget, a completed response, or a concrete obstruction.
A completed response can still describe an unfinished encounter. Do not reroll,
change the prompt, or discard an unfavorable attempt to obtain a pass.

## Correlate the conversation with the server

Use read-only server access and the canonical application decoders/replay from
the recorded release. A local reconstruction checks mechanics and guidance;
it does not replace the installed-client attempt.

1. Bound each attempt with UTC timestamps and identify its saved Play Session.
   Prefer separate server-activity windows. If spans omit session/chat ids or
   other traffic overlaps, state the attribution limit.
2. Capture request spans and a consistent persisted session export into
   restricted files. Await a successful capture before parsing or replacing
   an earlier artifact; an empty failed capture is not zero server requests.
3. Count accepted and rejected calls from span outcomes and replayed domain
   results. Stored commands can include typed invalid outcomes without an
   `isError` flag; history length is not an accepted-effect count. Retain the
   exact rejected payload/result when exposed; otherwise preserve uncertainty
   about its cause.
4. Reconstruct the final state and the prefix before the relevant battle's
   closing command. Match the battle identity: recovery may have opened and
   closed an earlier battle. Compare combatants, HP, round, conditions,
   resources, remaining drafts, saved characters, and pending inputs with the
   narration and replay. Record character replacement and duplicate survivors.
5. Replay the canonical seeded sampler in command order. Check natural faces,
   allocation order, and modifiers separately. Multiple-d20 tests retain both
   ordered faces; a recovery may draw only a missing second die or reuse an
   earlier sample's prefix. Account for those links explicitly, along with
   surplus draws, repeated invalid fills, and any repeated applied effect.

Keep exported seeds and principal identifiers private. Public issues receive
the minimal reproduction and findings, not raw session exports. A model saying
"all rolls accepted" does not establish zero MCP rejections. Genuine face
provenance also does not establish correct dice counts or valid input.

## Retain and review evidence

Keep evidence in a restricted local attempt directory, outside committed public
fixtures. Include the prompt and follow-ups, final conversation URL, observed
versions, UTC times, tool exchanges when available, screenshots, final response,
and an explicit list of missing evidence. Hash retained artifacts after their
writers stop. Never archive access tokens, cookies, or unrelated private chats.
A conversation URL alone is insufficient because it can require the owner's
account and may not retain visible tool details.

Use an independent reviewer to compare the original task with retained evidence.
Separate these conclusions:

- Did ChatGPT choose and call the tools correctly, including recovery?
- Did it finish without coaching, and did it avoid confusion? Grade these
  separately: an eventual win after ten identical invalid calls is not clean
  tool use. An honestly reported unsupported request can still block the task.
- Did the engine apply the narrated effects and preserve the same game?
- Did the requested geometry and visualization actually run and appear?
- Did the encounter reach a supported logical end?

Accept the random outcome, including defeat. Victory is not the criterion.
When living opponents remain, require evidence of the actual conclusion before
the battle ends, such as accepted surrender or retreat. Do not require a specific
story ending. Separate semantic judgments from deterministic state checks.

Use `pass`, `fail`, `blocked`, or `inconclusive` per requested behavior. Missing
payloads or unavailable logs limit the conclusion; do not turn an attractive
final response into a clean-contract claim. Preserve failures even after a fix
or a separately versioned re-audit.

Group failures by their first broken contract: discovery, stale Skill or cached
tools, input validation, runtime rules/state, recovery, model decision, or visual
delivery. Record exact evidence and uncertainty. Fix the owning contract, review
the delta, and confirm it in a fresh conversation with the same task. Add other
stories only where the affected contract warrants them.

Useful independent journeys include a weapon-using rogue, a healing and
concentration cleric, and a transforming druid. Check readiness against actual
finalization, selected equipment against executable ownership/loadout, and
prepared spells against available acts. Distinguish an unavailable capability
from a supported choice the model overlooked. Preserve these as ordinary story
prompts; explicit payload hints belong only in a separate diagnostic probe.

Minimize a discovered failure to a cheap canonical replay before fixing it.
Use focused checks during repair and a fresh original-prompt conversation for
installed-client confirmation. These exploratory model runs are not new routine
heavy gates. Retain required repository qualification separately. Record geometry
execution and widget delivery as inconclusive unless their actual execution or
display was observed; source text or a final replay alone cannot prove both.

## Keep publication separate

Prompt attempts do not authorize tool rescans, Skill uploads, draft publication,
production deployment, or review submission. Follow the current operator's
release authorization and [publication procedure](../../plugins/dnd-srd-oracle/publication/README.md).
Present a concise release summary and evidence links before an authorized
submission. Browser results certify only the installation actually observed.
