# Implementation Query 1: Generalize `start_battle` Initial Roster

## Question

Implement `FX001` and the related initial-roster part of `FX002` from the FX research table.

Short answer on relationship: `FX002` is related to `FX001`. `FX001` asks why `start_battle` only accepts one fighter. `FX002` explains that the tool shape also wrongly bakes in "fighter vs monster" as if those were the battle-domain slots. Treat them together for the `start_battle` initial roster API.

Do not mix this with mid-fight dynamic roster work. The battle system already has `BATTLE_ADD_CREATURE` / `BATTLE_REMOVE_CREATURE` through `execute_control_command`; this query is about the initial `BATTLE_INIT` roster built by `start_battle`.

## Current State

Current file:

- `packages/mcp/src/start-battle.ts`

Current tool input is hard-coded:

- `fighterId`
- `monsterId`
- fighter initiative/surprise fields
- monster initiative/surprise fields
- one optional `monsterStatBlockId`
- optional `useDemoHost`

Current output is a `BATTLE_INIT` command with exactly two creatures:

- one PC projected from the active Fighter host or stored Fighter sheet
- one Monster projected from a stat block id, defaulting to `goblinMinion`

Core battle initialization already supports multiple creatures in `BATTLE_INIT`. Mid-fight addition is separately handled by `BATTLE_ADD_CREATURE`.

## Goal

Change `start_battle` so its initial roster is a list of participants/creatures instead of two hard-coded slots.

The public tool shape should express "battle participants" rather than "fighter plus monster". The handler can still support only the currently available projection sources, but the input should not encode a two-slot battle domain.

## Suggested Shape

Use a roster-like input:

```ts
{
  participants: [
    {
      id: string,
      source: "activeHost" | "storedSheet" | "monsterStatBlock" | "raw",
      initiativeRoll?: number,
      initiativeRollB?: number,
      surprised?: boolean,
      ...
    }
  ],
  useDemoHost?: boolean
}
```

The exact discriminants can differ if the existing code suggests better names, but keep these concepts separate:

- authored/source identity: active host, stored character sheet, monster stat block, raw config;
- battle participant id;
- initiative/surprise inputs;
- projection to `BATTLE_INIT` creature config.

If `start_battle` currently cannot truly start from arbitrary stored sheets, keep the supported source set narrow, but model it as a list from the start.

## Important Constraints

- Use `pnpm`, never `npm`.
- Do not change battle rules or Quint for this unless you discover the MCP layer cannot express existing battle capabilities.
- Do not merge this with `BATTLE_ADD_CREATURE`; dynamic additions already exist and should remain a separate operation.
- Keep "creature existence/authorship" separate from "battle participation". Starting a battle promotes already-authored/projectable creatures into battle.
- Keep source-specific projection at the boundary. Do not make battle itself care about "fighter slot" versus "monster slot".
- Search before adding fields; avoid redundant state.

## Likely Files

Primary:

- `packages/mcp/src/start-battle.ts`

Likely tests/docs:

- `packages/mcp/src/server.test.ts`
- `packages/mcp/README.md`
- Any tests that call `decodeStartBattleInput`, `buildStartBattleCommand`, or `buildStartBattleCommandFromSheet`

Potentially relevant, but avoid changing unless necessary:

- `packages/mcp/src/server.ts`
- `packages/mcp/src/session-router.ts`
- `packages/core/available-actions.ts`

## Acceptance Criteria

- `start_battle` accepts more than two initial participants.
- It can start PC-vs-PC, monster-vs-monster, PC-vs-monster, and larger mixed rosters to the extent the current projection sources support those inputs.
- Duplicate participant ids are rejected before building `BATTLE_INIT`.
- Initiative/surprise fields are per participant, not per hard-coded fighter/monster slot.
- Existing active-host or sheet projection still works.
- Monster stat-block projection still works.
- Documentation/examples no longer describe `start_battle` as exactly one fighter plus one monster.
- Tests cover at least:
  - multiple initial PCs or PC-like raw participants;
  - multiple monsters/stat blocks if supported by the chosen schema;
  - duplicate ids;
  - per-participant initiative ordering.

## Verification

Run focused tests first:

```sh
pnpm --filter @dnd/mcp test
```

If core command schemas are touched, also run the relevant core tests:

```sh
pnpm --filter @dnd/core test -- --runInBand
```

Do not run battle MBT for exploratory validation. This is an MCP adapter/API shape change unless implementation uncovers a real battle-engine behavior change.

## Notes For Reviewer

This query addresses:

- `FX001`: one-fighter start-battle limitation.
- The start-battle API-shape part of `FX002`: avoid modeling battle as "fighter vs monster".

It does not address:

- Full dynamic roster semantics during an ongoing fight. Use existing `BATTLE_ADD_CREATURE` / `BATTLE_REMOVE_CREATURE`.
- Reworking all battle participant source types across the repo.
