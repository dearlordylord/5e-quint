// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt B11-LEVEL2-MOBILITY-SPELL-IDENTITY-BATCH alter_self fly misty_step spider_climb
// UNIT-IDENTITY-MBT-REPLAY: B11-LEVEL2-MOBILITY-SPELL-IDENTITY-BATCH alter_self doDiscoverAlterSelfTransformationMode
// UNIT-IDENTITY-MBT-REPLAY: B11-LEVEL2-MOBILITY-SPELL-IDENTITY-BATCH fly doDiscoverFlySpeedGrant
// UNIT-IDENTITY-MBT-REPLAY: B11-LEVEL2-MOBILITY-SPELL-IDENTITY-BATCH misty_step doDiscoverMistyStepSelfTeleport
// UNIT-IDENTITY-MBT-REPLAY: B11-LEVEL2-MOBILITY-SPELL-IDENTITY-BATCH spider_climb doDiscoverSpiderClimbSpeedGrant
import * as path from "node:path";

import type { SpellRecord } from "@dnd/surface/surface/types";
import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { describe, expect, it } from "vitest";

import type { BattleState } from "./index.ts";
import {
  alterSelfUnitId,
  flyUnitId,
  mistyStepUnitId,
  spellCasterId,
  spiderClimbUnitId,
} from "./unit-profile-admission-catalog-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  bonusSpellAct,
  spellAct,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import { spellSlotInvocationRef } from "./unit-profile-admission-test-support.ts";

const level2MobilitySpellSelectedIdentityDriverSchema = {
  init: {},
  doDiscoverAlterSelfTransformationMode: {},
  doDiscoverFlySpeedGrant: {},
  doDiscoverMistyStepSelfTeleport: {},
  doDiscoverSpiderClimbSpeedGrant: {},
  step: {},
} as const;
type Level2MobilitySpellSelectedIdentityDriverAction = Exclude<
  keyof typeof level2MobilitySpellSelectedIdentityDriverSchema,
  "init" | "step"
>;

const level2MobilitySpellUnitIds = [
  alterSelfUnitId,
  flyUnitId,
  mistyStepUnitId,
  spiderClimbUnitId,
] as const;
type Level2MobilitySpellUnitId = (typeof level2MobilitySpellUnitIds)[number];
const level2MobilitySpellSelectedIdentityResults = [
  "init",
  "alterSelfTransformationMode",
  "flySpeedGrant",
  "mistyStepSelfTeleport",
  "spiderClimbSpeedGrant",
] as const;
type Level2MobilitySpellSelectedIdentityResult =
  (typeof level2MobilitySpellSelectedIdentityResults)[number];
type Level2MobilitySpellSelectedIdentityProjection = {
  readonly lastResult: Level2MobilitySpellSelectedIdentityResult;
};
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly Level2MobilitySpellSelectedIdentityDriverAction[];
  readonly expected: Level2MobilitySpellSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "B11-LEVEL2-MOBILITY-SPELL-IDENTITY-BATCH";
  readonly unitId: Level2MobilitySpellUnitId;
  readonly actions: readonly Level2MobilitySpellSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};
type SpellActionTag = "actionSpell" | "bonusActionSpell";

const selectedUnitIdentityReplays = [
  {
    taskId: "B11-LEVEL2-MOBILITY-SPELL-IDENTITY-BATCH",
    unitId: "alter_self",
    actions: ["doDiscoverAlterSelfTransformationMode"],
    sequences: [
      {
        name: "magic-action-selected-self-transformation-mode",
        actions: ["doDiscoverAlterSelfTransformationMode"],
        expected: expectedProjection("alterSelfTransformationMode"),
      },
    ],
  },
  {
    taskId: "B11-LEVEL2-MOBILITY-SPELL-IDENTITY-BATCH",
    unitId: "fly",
    actions: ["doDiscoverFlySpeedGrant"],
    sequences: [
      {
        name: "magic-action-selected-fly-speed-grant",
        actions: ["doDiscoverFlySpeedGrant"],
        expected: expectedProjection("flySpeedGrant"),
      },
    ],
  },
  {
    taskId: "B11-LEVEL2-MOBILITY-SPELL-IDENTITY-BATCH",
    unitId: "misty_step",
    actions: ["doDiscoverMistyStepSelfTeleport"],
    sequences: [
      {
        name: "bonus-action-selected-self-teleport",
        actions: ["doDiscoverMistyStepSelfTeleport"],
        expected: expectedProjection("mistyStepSelfTeleport"),
      },
    ],
  },
  {
    taskId: "B11-LEVEL2-MOBILITY-SPELL-IDENTITY-BATCH",
    unitId: "spider_climb",
    actions: ["doDiscoverSpiderClimbSpeedGrant"],
    sequences: [
      {
        name: "magic-action-selected-climb-speed-grant",
        actions: ["doDiscoverSpiderClimbSpeedGrant"],
        expected: expectedProjection("spiderClimbSpeedGrant"),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Level 2 mobility spell selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<Level2MobilitySpellSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createLevel2MobilitySpellSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing level 2 mobility spell selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Level 2 mobility spell selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays level 2 mobility spell selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-level2-mobility-spell-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createLevel2MobilitySpellSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: level2MobilitySpellSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createLevel2MobilitySpellSelectedIdentityDriver() {
  return defineDriver(level2MobilitySpellSelectedIdentityDriverSchema, () => {
    let projection = expectedProjection("init");

    function reset(): void {
      projection = expectedProjection("init");
    }

    function recordDiscoveredInvocation(input: {
      readonly spellId: Level2MobilitySpellUnitId;
      readonly actionTag: SpellActionTag;
      readonly slotLevel: 2 | 3;
      readonly procedure: Parameters<typeof spellSlotInvocationRef>[2];
      readonly result: Level2MobilitySpellSelectedIdentityResult;
    }): void {
      const spell = selectedSpellRecord(input.spellId);
      const state = selectedSpellBattle(spell, input.slotLevel);
      const act =
        input.actionTag === "bonusActionSpell"
          ? bonusSpellAct({
              state,
              spellId: input.spellId,
              slotLevel: input.slotLevel,
            })
          : spellAct({
              state,
              spellId: input.spellId,
              slotLevel: input.slotLevel,
            });

      expect(act.subject).toEqual({
        tag: input.actionTag,
        actorId: spellCasterId,
        invocation: spellSlotInvocationRef(
          input.spellId,
          input.slotLevel,
          input.procedure,
        ),
        mode: { tag: "cast" },
      });
      projection = expectedProjection(input.result);
    }

    return {
      init: reset,
      doDiscoverAlterSelfTransformationMode: () => {
        recordDiscoveredInvocation({
          spellId: alterSelfUnitId,
          actionTag: "actionSpell",
          slotLevel: 2,
          procedure: "selfTransformationMode",
          result: "alterSelfTransformationMode",
        });
      },
      doDiscoverFlySpeedGrant: () => {
        recordDiscoveredInvocation({
          spellId: flyUnitId,
          actionTag: "actionSpell",
          slotLevel: 3,
          procedure: "scalarBuff",
          result: "flySpeedGrant",
        });
      },
      doDiscoverMistyStepSelfTeleport: () => {
        recordDiscoveredInvocation({
          spellId: mistyStepUnitId,
          actionTag: "bonusActionSpell",
          slotLevel: 2,
          procedure: "selfTeleport",
          result: "mistyStepSelfTeleport",
        });
      },
      doDiscoverSpiderClimbSpeedGrant: () => {
        recordDiscoveredInvocation({
          spellId: spiderClimbUnitId,
          actionTag: "actionSpell",
          slotLevel: 2,
          procedure: "scalarBuff",
          result: "spiderClimbSpeedGrant",
        });
      },
      getState: () => projection,
      step: () => {},
    };
  });
}

function expectedProjection(
  lastResult: Level2MobilitySpellSelectedIdentityResult,
): Level2MobilitySpellSelectedIdentityProjection {
  return { lastResult };
}

function selectedSpellBattle(
  spell: SpellRecord,
  slotLevel: 2 | 3,
): BattleState {
  return spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: slotLevel, count: 1 }],
  });
}

function selectedSpellRecord(unitId: Level2MobilitySpellUnitId): SpellRecord {
  if (!level2MobilitySpellUnitIds.some((candidate) => candidate === unitId)) {
    throw new Error(`Expected selected level 2 mobility spell id ${unitId}.`);
  }
  return spellRecord(unitId);
}

function normalizeLevel2MobilitySpellSelectedIdentityQuintState(
  raw: unknown,
): Level2MobilitySpellSelectedIdentityProjection {
  const state = quintStateRecord(raw);
  return {
    lastResult: mbtLastResult(state["qLastResult"]),
  };
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint state record.");
  }
  return Object.fromEntries(Object.entries(raw));
}

function mbtLastResult(
  raw: unknown,
): Level2MobilitySpellSelectedIdentityProjection["lastResult"] {
  if (
    typeof raw === "string" &&
    isLevel2MobilitySpellSelectedIdentityResult(raw)
  ) {
    return raw;
  }
  throw new Error(
    `Unexpected level 2 mobility spell MBT result ${String(raw)}.`,
  );
}

function isLevel2MobilitySpellSelectedIdentityResult(
  value: string,
): value is Level2MobilitySpellSelectedIdentityResult {
  return level2MobilitySpellSelectedIdentityResults.some(
    (result) => result === value,
  );
}

const level2MobilitySpellSelectedIdentityStateCheck = stateCheck(
  normalizeLevel2MobilitySpellSelectedIdentityQuintState,
  (
    spec: Level2MobilitySpellSelectedIdentityProjection,
    impl: Level2MobilitySpellSelectedIdentityProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
