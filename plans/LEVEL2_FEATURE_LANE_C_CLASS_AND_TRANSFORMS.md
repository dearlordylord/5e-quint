# Level 2 Feature Lane C - Class Resources, Metamagic, And Transformation Pressure

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L12G-FOLLOWUP-SORCERER-METAMAGIC-SAVE-OPTIONS",
      "status": "done",
      "title": "Sorcerer Metamagic Save Options"
    },
    {
      "number": 2,
      "id": "L12G-FOLLOWUP-SORCERER-METAMAGIC-CAST-PROPERTY-OPTIONS",
      "status": "done",
      "title": "Sorcerer Metamagic Cast Property Options"
    },
    {
      "number": 3,
      "id": "L12G-FOLLOWUP-SORCERER-METAMAGIC-DAMAGE-SHAPE-OPTIONS",
      "status": "done",
      "title": "Sorcerer Metamagic Damage Shape Options"
    },
    {
      "number": 4,
      "id": "L12G-FOLLOWUP-SORCERER-METAMAGIC-REROLL-OPTIONS",
      "status": "done",
      "title": "Sorcerer Metamagic Reroll Options"
    },
    {
      "number": 5,
      "id": "L12G-FOLLOWUP-MONK-STEP-OF-THE-WIND-JUMP-RUNTIME",
      "status": "done",
      "title": "Monk Step Of The Wind Jump Distance Runtime"
    },
    {
      "number": 6,
      "id": "L12G-FOLLOWUP-SORCERER-FONT-BONUS-ACTION-BATTLE-SOURCE",
      "status": "done",
      "title": "Sorcerer Font Of Magic Bonus Action And Battle Slot Source"
    },
    {
      "number": 7,
      "id": "L12G-FOLLOWUP-SORCERER-METAMAGIC-QUICKENED-ALL-ACTION-SPELLS",
      "status": "done",
      "title": "Sorcerer Metamagic Quickened All Action Spells"
    },
    {
      "number": 8,
      "id": "L12G-FOLLOWUP-DRAGONS-BREATH-INITIAL-CAST",
      "status": "done",
      "title": "Dragon's Breath Initial Cast And Effect State"
    },
    {
      "number": 9,
      "id": "L12G-FOLLOWUP-DRAGONS-BREATH-GRANTED-ACTION",
      "status": "ready-for-research",
      "title": "Dragon's Breath Granted Magic Action"
    },
    {
      "number": 10,
      "id": "L12G-FOLLOWUP-ENHANCE-ABILITY-UPCAST-PER-TARGET-ABILITIES",
      "status": "ready-for-research",
      "title": "Enhance Ability Upcast Per-Target Ability Choices"
    },
    {
      "number": 11,
      "id": "L12G-RECURSIVE-TAIL-LANE-C",
      "status": "blocked",
      "title": "Lane C Recursive Planning Tail"
    },
    {
      "number": 12,
      "id": "L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS",
      "status": "ready-for-research",
      "title": "Monk's Focus Character Facts And Resource Projection"
    },
    {
      "number": 13,
      "id": "L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS",
      "status": "blocked",
      "title": "Monk's Focus Battle Option Execution"
    },
    {
      "number": 14,
      "id": "L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-CHARACTER-FACTS",
      "status": "blocked",
      "title": "Monk Uncanny Metabolism Character Facts And Use State"
    },
    {
      "number": 15,
      "id": "L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-RUNTIME",
      "status": "blocked",
      "title": "Monk Uncanny Metabolism Initiative Recovery Runtime"
    },
    {
      "number": 16,
      "id": "L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS",
      "status": "ready-for-research",
      "title": "Sorcerer Font Of Magic Sorcery Point Resource Facts"
    },
    {
      "number": 17,
      "id": "L12G-FOLLOWUP-SORCERER-FONT-SLOT-TO-POINTS",
      "status": "blocked",
      "title": "Sorcerer Font Of Magic Spell Slot To Sorcery Points"
    },
    {
      "number": 18,
      "id": "L12G-FOLLOWUP-SORCERER-FONT-POINTS-TO-SLOTS",
      "status": "blocked",
      "title": "Sorcerer Font Of Magic Sorcery Points To Spell Slot"
    },
    {
      "number": 19,
      "id": "L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS",
      "status": "blocked",
      "title": "Sorcerer Metamagic Character Facts And Option Projection"
    },
    {
      "number": 20,
      "id": "L12G-FOLLOWUP-SORCERER-METAMAGIC-OPTION-EXECUTION",
      "status": "blocked",
      "title": "Sorcerer Metamagic Cast-Time Option Execution"
    },
    {
      "number": 21,
      "id": "L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE",
      "status": "ready-for-research",
      "title": "Alter Self Surface Option Shape"
    },
    {
      "number": 22,
      "id": "L12G-FOLLOWUP-ALTER-SELF-AQUATIC-RUNTIME",
      "status": "blocked",
      "title": "Alter Self Aquatic Adaptation Runtime"
    },
    {
      "number": 23,
      "id": "L12G-FOLLOWUP-ALTER-SELF-NATURAL-WEAPONS-RUNTIME",
      "status": "blocked",
      "title": "Alter Self Natural Weapons Runtime"
    }
  ]
}
-->

This is an active Ralph execution plan for level-2 feature/runtime coverage. It replaces the stale Loop C class-resource file.

Every Ralph prompt for this lane must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD matches. If not, run `git rebase master`.

Ralph must run the implementer, reviewer, handback, and decider loop until `accept`. The reviewer loop must include RAW traceability, ubiquitous-language/domain-language, architecture/connascence, and code-review passes. Fix every reasonable finding, explicitly reject only findings with a concrete reason, and repeat until no reasonable findings remain.

Do not implement Wild Shape in this lane. Wild Shape has had separate external ownership during this planning run.

## Verification

Every task must include:

- RAW/ubiquitous-language check before implementation, using `.references/srd-5.2.1/` and `UBIQUITOUS_LANGUAGE.md`.
- Focused runtime and/or Surface tests for the changed behavior.
- Promoted `packages/battle-runtime/battle-runtime.qnt` parity where battle behavior changes.
- `pnpm unit-profile-coverage:check -- --write`, then `pnpm unit-profile-coverage:check`.
- Relevant package typechecks and focused tests.
- Reviewer-loop convergence.

## Tasks

### Task 1 - L12G-FOLLOWUP-SORCERER-METAMAGIC-SAVE-OPTIONS - Sorcerer Metamagic Save Options

Status: `done`

Input:
- Current Metamagic character facts, battle resource bridge, and Quickened governor support.

Output:
- Support or precise closure for save-affecting Metamagic options.
- Reuse existing spell save holes/fills rather than adding parallel save state.

### Task 2 - L12G-FOLLOWUP-SORCERER-METAMAGIC-CAST-PROPERTY-OPTIONS - Sorcerer Metamagic Cast Property Options

Status: `done`

Input:
- Current Metamagic option projection and spell invocation discovery.

Output:
- Support or precise closure for cast-property options such as range, components, and targeting changes.
- Do not dispatch on authored spell identity.

### Task 3 - L12G-FOLLOWUP-SORCERER-METAMAGIC-DAMAGE-SHAPE-OPTIONS - Sorcerer Metamagic Damage Shape Options

Status: `ready-for-research`

Input:
- Current spell damage pipelines and Metamagic resource bridge.

Output:
- Support or precise closure for damage-shape Metamagic options.
- Keep damage type/dice ownership in the existing damage procedure facts.

### Task 4 - L12G-FOLLOWUP-SORCERER-METAMAGIC-REROLL-OPTIONS - Sorcerer Metamagic Reroll Options

Status: `done`

Input:
- Current roll/fill protocols and Sorcery Point resource state.

Output:
- Support or precise closure for Metamagic reroll behavior.
- Avoid storing reroll opportunity state when a typed fill boundary can carry it.

### Task 5 - L12G-FOLLOWUP-MONK-STEP-OF-THE-WIND-JUMP-RUNTIME - Monk Step Of The Wind Jump Distance Runtime

Status: `done`

Input:
- Current Monk Focus battle options, movement witness boundary, and Jump spell support.

Output:
- Runtime support or closure for doubled jump distance from Step of the Wind.
- Keep pathfinding and automatic jump-route legality table-owned.

### Task 6 - L12G-FOLLOWUP-SORCERER-FONT-BONUS-ACTION-BATTLE-SOURCE - Sorcerer Font Of Magic Bonus Action And Battle Slot Source

Status: `done`

Input:
- Current Font of Magic Character Sheet resource facts and battle bridge.

Output:
- Support or closure for Bonus Action battle use/source facts without duplicating spell slot pools across runtimes.

### Task 7 - L12G-FOLLOWUP-SORCERER-METAMAGIC-QUICKENED-ALL-ACTION-SPELLS - Sorcerer Metamagic Quickened All Action Spells

Status: `done`

Input:
- Current Quickened direct Hit Point restoration subset.

Output:
- Broaden Quickened to all supported action-casting spell procedures where the procedure type proves Bonus Action rewrite is safe.
- Unsupported procedure classes must fail before Sorcery Point spending.

### Task 8 - L12G-FOLLOWUP-DRAGONS-BREATH-INITIAL-CAST - Dragon's Breath Initial Cast And Effect State

Status: `done`

Input:
- SRD Dragon's Breath text and existing spell-created active-effect patterns.

Output:
- Initial cast/effect-state support or split if the granted action makes the task too large.
- Preserve caller/table ownership for cone placement and affected creatures.

### Task 9 - L12G-FOLLOWUP-DRAGONS-BREATH-GRANTED-ACTION - Dragon's Breath Granted Magic Action

Status: `ready-for-research`

Depends on:
- Task C8.

Output:
- Runtime support for the granted breath action, damage type choice, save/damage resolution, and lifecycle cleanup.

### Task 10 - L12G-FOLLOWUP-ENHANCE-ABILITY-UPCAST-PER-TARGET-ABILITIES - Enhance Ability Upcast Per-Target Ability Choices

Status: `ready-for-research`

Input:
- Existing Enhance Ability single-target roll modifier subset.

Output:
- Support per-target ability choices and upcast target scaling, or split if the current Surface shape cannot express it safely.

### Task 11 - L12G-RECURSIVE-TAIL-LANE-C - Lane C Recursive Planning Tail

Status: `blocked`

Unblock only after all ready Lane C tasks are done or explicitly closed.

Output:
- Refresh level-2 class/resource metrics.
- Add the next concrete, Ralph-sized Lane C tasks only if real frontier remains.

## Overnight Backlog Refill

### Task 12 - L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS - Monk's Focus Character Facts And Resource Projection

Status: `ready-for-research`

Unit: `monk_monks_focus`. Follow-up split from Task 13.

Dependency: Tasks 13 (`L12G-AUTHOR-MONK-MONKS-FOCUS`), 14 (`L12G-AUTHOR-MONK-UNARMORED-MOVEMENT`), and 15 (`L12G-AUTHOR-MONK-UNCANNY-METABOLISM`) done.

Inputs:

- `packages/surface/content/monk_monks_focus.json`;
- the `monk_monks_focus` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Classes/Monk.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- character-creation and character-sheet resource/profile owner evidence.

Outputs:

- owner evidence for admitting Monk level-2 progression after the full Monk level-2 feature grant set can be retained;
- Focus Point count, Short or Long Rest reset, initial Focus feature option names, and Focus save DC projection derive from the authored Surface feature and class progression without duplicating class progression or option execution state;
- regenerated coverage artifacts.

Acceptance:

- the character-facts/resource portion of `monk_monks_focus` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no Flurry of Blows, Patient Defense, Step of the Wind battle option execution is implemented in this task;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, C; observed-statuses: deferred, ready-for-research -->

### Task 13 - L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS - Monk's Focus Battle Option Execution

Status: `blocked`

Unit: `monk_monks_focus`. Follow-up split from Task 13.

Dependency: Task 79 (`L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS`) done.

Inputs:

- `packages/surface/content/monk_monks_focus.json`;
- the `monk_monks_focus` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Classes/Monk.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- battle-runtime, character-battle-runtime resource handoff, Unit profile, owner-evidence, and focused tests for Monk's Focus option execution.

Outputs:

- supported runtime profile and owner evidence for Flurry of Blows, Patient Defense, and Step of the Wind option modes;
- Bonus Action economy, Focus Point spending where RAW requires it, Dodge and jump-distance effects, and later Focus spenders consume one shared Focus Point resource rather than synthetic per-feature pools;
- Quint/runtime parity updates if promoted battle-runtime behavior changes;
- regenerated coverage artifacts.

Acceptance:

- the battle-option execution portion of `monk_monks_focus` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- runtime behavior traces to SRD Monk's Focus without homebrew extensions and consumes projected Focus Point facts instead of duplicating class progression state;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, package-local promoted MBT if runtime behavior changes, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, C; observed-statuses: deferred, ready-for-research -->

### Task 14 - L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-CHARACTER-FACTS - Monk Uncanny Metabolism Character Facts And Use State

Status: `blocked`

Unit: `monk_uncanny_metabolism`. Follow-up split from Task 15.

Dependency: Task 15 (`L12G-AUTHOR-MONK-UNCANNY-METABOLISM`) and Task 79 (`L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS`) done.

Inputs:

- `packages/surface/content/monk_uncanny_metabolism.json`;
- `packages/surface/content/monk_monks_focus.json`;
- the `monk_uncanny_metabolism` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Classes/Monk.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- character-creation and character-sheet retained-feature and use-state owner evidence.

Outputs:

- owner evidence for the retained Uncanny Metabolism feature ref, once-per-Long-Rest use state, and links to the shared Focus Point resource and existing Martial Arts die source;
- use-state projection derives from the retained Surface feature and Monk progression without duplicating Focus Point, Martial Arts die, or class progression state;
- regenerated coverage artifacts.

Acceptance:

- the character-facts/use-state portion of `monk_uncanny_metabolism` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no Initiative-window choice execution, self-healing runtime, or battle-runtime Focus Point recovery is implemented in this task;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, C; observed-statuses: deferred, ready-for-research -->

### Task 15 - L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-RUNTIME - Monk Uncanny Metabolism Initiative Recovery Runtime

Status: `blocked`

Unit: `monk_uncanny_metabolism`. Follow-up split from Task 15.

Dependency: Task 80 (`L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS`) and Task 81 (`L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-CHARACTER-FACTS`) done.

Inputs:

- `packages/surface/content/monk_uncanny_metabolism.json`;
- the `monk_uncanny_metabolism` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Classes/Monk.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- battle-runtime, character-battle-runtime resource handoff, Unit profile, owner-evidence, and focused tests for Initiative-window recovery and self-healing execution.

Outputs:

- supported runtime profile and owner evidence for optional Initiative-window Focus Point recovery, self-healing, and Long Rest recharge;
- Quint/runtime parity updates if promoted battle-runtime behavior changes;
- regenerated coverage artifacts.

Acceptance:

- the runtime execution portion of `monk_uncanny_metabolism` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- runtime behavior traces to SRD Uncanny Metabolism without homebrew extensions and consumes projected shared Focus Point, once-per-Long-Rest use, and Martial Arts die facts instead of duplicating class progression or die-table state;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, package-local promoted MBT if runtime behavior changes, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, C; observed-statuses: deferred, ready-for-research -->

### Task 16 - L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS - Sorcerer Font Of Magic Sorcery Point Resource Facts

Status: `ready-for-research`

Unit: `sorcerer_font_of_magic`. Follow-up split from Task 18.

Dependency: Task 18 (`L12G-AUTHOR-SORCERER-FONT-OF-MAGIC`) and Task 19 (`L12G-AUTHOR-SORCERER-METAMAGIC`) done.

Inputs:

- `packages/surface/content/sorcerer_font_of_magic.json`;
- `packages/surface/content/class_sorcerer.json`;
- the `sorcerer_font_of_magic` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Classes/Sorcerer.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- character-creation and character-sheet retained-feature and resource owner evidence.

Outputs:

- owner evidence for retaining the Font of Magic feature ref with Sorcerer level-2 progression after the full Sorcerer level-2 feature grant set can be retained;
- shared Sorcery Point pool facts, Sorcerer-level cap, and Long Rest reset derive from the authored Surface feature and class progression without duplicating class progression or Metamagic option state;
- regenerated coverage artifacts.

Acceptance:

- the character-facts/resource portion of `sorcerer_font_of_magic` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no Spell Slot conversion execution or Metamagic option execution is implemented in this task;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, C; observed-statuses: deferred, ready-for-research -->

### Task 17 - L12G-FOLLOWUP-SORCERER-FONT-SLOT-TO-POINTS - Sorcerer Font Of Magic Spell Slot To Sorcery Points

Status: `blocked`

Unit: `sorcerer_font_of_magic`. Follow-up split from Task 18.

Dependency: Task 83 (`L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS`) done.

Inputs:

- `packages/surface/content/sorcerer_font_of_magic.json`;
- the `sorcerer_font_of_magic` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Classes/Sorcerer.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- character-battle-runtime, spellcasting resource owner, Unit profile, owner-evidence, and focused tests for Spell Slot to Sorcery Point conversion.

Outputs:

- supported runtime profile and owner evidence for the no-action conversion that expends one Spell Slot and grants Sorcery Points equal to the expended slot's level;
- conversion consumes existing Spell Slot state and the projected shared Sorcery Point resource, respecting the shared Sorcery Point cap;
- Quint/runtime parity updates if promoted battle-runtime behavior changes;
- regenerated coverage artifacts.

Acceptance:

- the Spell Slot to Sorcery Point conversion portion of `sorcerer_font_of_magic` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no Sorcery Point to temporary Spell Slot creation or Metamagic option execution is implemented in this task;
- runtime behavior traces to SRD Font of Magic without homebrew extensions and consumes projected shared Sorcery Point facts instead of duplicating class progression or spellcasting resource state;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, package-local promoted MBT if runtime behavior changes, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, C; observed-statuses: deferred, ready-for-research -->

### Task 18 - L12G-FOLLOWUP-SORCERER-FONT-POINTS-TO-SLOTS - Sorcerer Font Of Magic Sorcery Points To Spell Slot

Status: `blocked`

Unit: `sorcerer_font_of_magic`. Follow-up split from Task 18.

Dependency: Task 83 (`L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS`) done.

Inputs:

- `packages/surface/content/sorcerer_font_of_magic.json`;
- the `sorcerer_font_of_magic` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Classes/Sorcerer.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- character-battle-runtime, spellcasting resource owner, Unit profile, owner-evidence, and focused tests for Sorcery Point to temporary Spell Slot creation.

Outputs:

- supported runtime profile and owner evidence for the Bonus Action conversion that spends Sorcery Points by the Creating Spell Slots table;
- execution enforces the minimum Sorcerer level for the target slot, creates one Spell Slot no higher than level 5, and expires created slots on Long Rest;
- conversion consumes the projected shared Sorcery Point resource and existing Spell Slot state without duplicating class progression state;
- Quint/runtime parity updates if promoted battle-runtime behavior changes;
- regenerated coverage artifacts.

Acceptance:

- the Sorcery Point to temporary Spell Slot conversion portion of `sorcerer_font_of_magic` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no Spell Slot to Sorcery Point conversion or Metamagic option execution is implemented in this task;
- runtime behavior traces to SRD Font of Magic without homebrew extensions and consumes projected shared Sorcery Point facts instead of duplicating class progression or spellcasting resource state;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, package-local promoted MBT if runtime behavior changes, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, C; observed-statuses: deferred, ready-for-research -->

### Task 19 - L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS - Sorcerer Metamagic Character Facts And Option Projection

Status: `blocked`

Unit: `sorcerer_metamagic`. Follow-up split from Task 19.

Dependency: Task 19 (`L12G-AUTHOR-SORCERER-METAMAGIC`) and Task 83 (`L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS`) done.

Inputs:

- `packages/surface/content/sorcerer_metamagic.json`;
- `packages/surface/content/class_sorcerer.json`;
- `packages/surface/content/sorcerer_font_of_magic.json`;
- the `sorcerer_metamagic` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Classes/Sorcerer.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- character-creation and character-sheet retained-feature, choice, and resource-reference owner evidence.

Outputs:

- owner evidence for retaining the Metamagic feature ref with Sorcerer level-2 progression;
- chosen Metamagic option count, Sorcerer-level replacement lifecycle, unique known-option roster, option costs, stacking facts, and source link to the shared Font of Magic Sorcery Point resource derive from authored Surface records without duplicating class progression or Sorcery Point pool state;
- regenerated coverage artifacts.

Acceptance:

- the character-facts and option-projection portion of `sorcerer_metamagic` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no cast-time Metamagic option execution or Font of Magic Spell Slot conversion execution is implemented in this task;
- owner evidence links Metamagic option facts to the shared Font of Magic Sorcery Point resource instead of creating a Metamagic-local point pool;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, C; observed-statuses: deferred, ready-for-research -->

### Task 20 - L12G-FOLLOWUP-SORCERER-METAMAGIC-OPTION-EXECUTION - Sorcerer Metamagic Cast-Time Option Execution

Status: `blocked`

Unit: `sorcerer_metamagic`. Follow-up split from Task 19.

Dependency: Task 86 (`L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS`) and Task 83 (`L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS`) done.

Inputs:

- `packages/surface/content/sorcerer_metamagic.json`;
- `packages/surface/content/sorcerer_font_of_magic.json`;
- the `sorcerer_metamagic` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Classes/Sorcerer.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- character-battle-runtime, battle-runtime spell invocation hooks, Unit profile, owner-evidence, and focused tests for known Metamagic option execution.

Outputs:

- supported runtime profile and owner evidence for known Metamagic option execution at spell-cast time;
- execution spends the shared Sorcery Point resource projected from Font of Magic, enforces the one-option-per-spell rule plus Empowered Spell and Seeking Spell stacking exceptions, enforces Quickened Spell level-1-plus spell turn limits, and applies the option-specific spell modifications for Careful, Distant, Empowered, Extended, Heightened, Quickened, Seeking, Subtle, Transmuted, and Twinned Spell;
- Quint/runtime parity updates if promoted battle-runtime behavior changes;
- regenerated coverage artifacts.

Acceptance:

- the cast-time execution portion of `sorcerer_metamagic` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- runtime behavior traces to SRD Metamagic without homebrew extensions and consumes projected shared Sorcery Point facts instead of duplicating Font of Magic resource state;
- no Font of Magic Spell Slot conversion behavior is implemented in this task;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, package-local promoted MBT if runtime behavior changes, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A; observed-statuses: ready-for-research -->

### Task 21 - L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE - Alter Self Surface Option Shape

Status: `ready-for-research`

Unit: `alter_self`. Follow-up split from Task 23.

Dependency: Task 23 (`L12G-SPELL-ALTER-SELF`) done.

Inputs:

- `packages/surface/content/alter_self.json`;
- `packages/surface/content/alter_self.dhall`;
- the `alter_self` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-A-D.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- Surface spell schema, Dhall generation, tracer, and focused tests for spell option/effect shapes.

Outputs:

- Alter Self authored content represents Aquatic Adaptation, Change Appearance, and Natural Weapons as lossless executable Spell Definition option facts;
- Natural Weapons preserves the claws, fangs, horns, and hooves choice, the Slashing/Piercing/Bludgeoning damage-type mapping, the 1d6 damage die, and spellcasting-ability attack and damage replacement facts without duplicating Unarmed Strike state;
- Aquatic Adaptation preserves water breathing and Swim Speed equal to Speed as linked projection facts, and Change Appearance remains a no-statistics-change presentation option;
- schema/tracer support is updated only if the current Surface shape cannot represent those facts;
- regenerated coverage artifacts.

Acceptance:

- the Surface option-shape portion of `alter_self` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no battle-runtime Alter Self invocation, option switching, Aquatic Adaptation execution, or Natural Weapons Unarmed Strike execution is implemented in this task;
- authored facts trace to SRD Alter Self without duplicating Spell Invocation, Spell Effect, creature Speed, or Unarmed Strike state;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: D; observed-statuses: ready-for-research -->

### Task 22 - L12G-FOLLOWUP-ALTER-SELF-AQUATIC-RUNTIME - Alter Self Aquatic Adaptation Runtime

Status: `blocked`

Unit: `alter_self`. Follow-up split from Task 23.

Dependency: Task 90 (`L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE`) done.

Inputs:

- `packages/surface/content/alter_self.json`;
- the `alter_self` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-A-D.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- battle-runtime self-transformation spell invocation/effect lifecycle, Unit profile, owner-evidence, and focused tests for Alter Self mode state and Aquatic Adaptation execution.

Outputs:

- profile-subset-supported runtime profile and owner evidence for Alter Self casting, spell-owned option state, Magic Action mode replacement, and Concentration cleanup;
- Aquatic Adaptation grants water breathing and a Swim Speed equal to current Speed through linked Speed projection rather than copied spell-local Speed state;
- Change Appearance is closed as runtime-detached presentation with no statistics mutation;
- Natural Weapons remains visible as a separate runtime follow-up instead of being partially implemented here;
- Quint/runtime parity updates if promoted battle-runtime behavior changes;
- regenerated coverage artifacts.

Acceptance:

- the Aquatic Adaptation and shared mode-lifecycle portion of `alter_self` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no Natural Weapons Unarmed Strike attack, damage, damage-type, or spellcasting-ability replacement behavior is implemented in this task;
- runtime behavior traces to SRD Alter Self without homebrew extensions and consumes projected Spell Definition facts rather than duplicating creature Speed or option state;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, package-local promoted MBT if runtime behavior changes, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: D; observed-statuses: ready-for-research -->

### Task 23 - L12G-FOLLOWUP-ALTER-SELF-NATURAL-WEAPONS-RUNTIME - Alter Self Natural Weapons Runtime

Status: `blocked`

Unit: `alter_self`. Follow-up split from Task 23.

Dependency: Tasks 90 (`L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE`) and 91 (`L12G-FOLLOWUP-ALTER-SELF-AQUATIC-RUNTIME`) done.

Inputs:

- `packages/surface/content/alter_self.json`;
- the `alter_self` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-A-D.md` and `.references/srd-5.2.1/Rules-Glossary.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- battle-runtime self-transformation spell invocation/effect lifecycle, character-battle-runtime Unarmed Strike projection, Unit profile, owner-evidence, and focused tests for Natural Weapons execution.

Outputs:

- supported runtime profile and owner evidence for Natural Weapons as a spell-owned Unarmed Strike override;
- execution uses the chosen claws, fangs, horns, or hooves damage type, deals 1d6 damage instead of normal Unarmed Strike damage, uses the caster's spellcasting ability for attack and damage rolls, and cleans up on Concentration end;
- runtime consumes the repaired Natural Weapons Spell Definition facts and shared Alter Self mode-lifecycle support instead of duplicating Unarmed Strike or spell option state;
- Quint/runtime parity updates if promoted battle-runtime behavior changes;
- regenerated coverage artifacts.

Acceptance:

- the Natural Weapons runtime portion of `alter_self` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no unrelated Aquatic Adaptation, Change Appearance, or level-1 Loop D/L spell frontier work is implemented in this task;
- runtime behavior traces to SRD Alter Self and Unarmed Strike terminology without homebrew extensions and consumes projected Spell Definition facts rather than storing redundant Unarmed Strike formulas;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, package-local promoted MBT if runtime behavior changes, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: D; observed-statuses: ready-for-research -->
