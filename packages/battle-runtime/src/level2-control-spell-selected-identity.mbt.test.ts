// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH calm_emotions charm_person darkness enthrall gust_of_wind invisibility levitate see_invisibility spike_growth web
// UNIT-IDENTITY-MBT-REPLAY: B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH calm_emotions doDiscoverCalmEmotionsConditionImmunity
// UNIT-IDENTITY-MBT-REPLAY: B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH charm_person doDiscoverCharmPersonSaveGatedCondition
// UNIT-IDENTITY-MBT-REPLAY: B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH darkness doDiscoverDarknessPointOrigin
// UNIT-IDENTITY-MBT-REPLAY: B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH enthrall doDiscoverEnthrallPerceptionPenalty
// UNIT-IDENTITY-MBT-REPLAY: B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH gust_of_wind doDiscoverGustOfWindLine
// UNIT-IDENTITY-MBT-REPLAY: B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH invisibility doDiscoverInvisibilityDirectCondition
// UNIT-IDENTITY-MBT-REPLAY: B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH levitate doDiscoverLevitateCreature
// UNIT-IDENTITY-MBT-REPLAY: B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH see_invisibility doDiscoverSeeInvisibilityObserverSight
// UNIT-IDENTITY-MBT-REPLAY: B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH spike_growth doDiscoverSpikeGrowthMovementHazard
// UNIT-IDENTITY-MBT-REPLAY: B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH web doDiscoverWebRestraintHazard
import * as path from "node:path";

import type { SpellRecord } from "@dnd/surface/surface/types";
import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { describe, expect, it } from "vitest";

import type { BattleState } from "./index.ts";
import {
  calmEmotionsUnitId,
  charmPersonUnitId,
  darknessUnitId,
  enthrallUnitId,
  gustOfWindUnitId,
  invisibilityUnitId,
  levitateUnitId,
  seeInvisibilityUnitId,
  spellCasterId,
  spikeGrowthUnitId,
  webUnitId,
} from "./unit-profile-admission-catalog-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import { spellAct } from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import { spellSlotInvocationRef } from "./unit-profile-admission-test-support.ts";

const level2ControlSpellSelectedIdentityDriverSchema = {
  init: {},
  doDiscoverCalmEmotionsConditionImmunity: {},
  doDiscoverCharmPersonSaveGatedCondition: {},
  doDiscoverDarknessPointOrigin: {},
  doDiscoverEnthrallPerceptionPenalty: {},
  doDiscoverGustOfWindLine: {},
  doDiscoverInvisibilityDirectCondition: {},
  doDiscoverLevitateCreature: {},
  doDiscoverSeeInvisibilityObserverSight: {},
  doDiscoverSpikeGrowthMovementHazard: {},
  doDiscoverWebRestraintHazard: {},
  step: {},
} as const;
type Level2ControlSpellSelectedIdentityDriverAction = Exclude<
  keyof typeof level2ControlSpellSelectedIdentityDriverSchema,
  "init" | "step"
>;

const level2ControlSpellUnitIds = [
  calmEmotionsUnitId,
  charmPersonUnitId,
  darknessUnitId,
  enthrallUnitId,
  gustOfWindUnitId,
  invisibilityUnitId,
  levitateUnitId,
  seeInvisibilityUnitId,
  spikeGrowthUnitId,
  webUnitId,
] as const;
type Level2ControlSpellUnitId = (typeof level2ControlSpellUnitIds)[number];
const level2ControlSpellSelectedIdentityResults = [
  "init",
  "calmEmotionsConditionImmunity",
  "charmPersonSaveGatedCondition",
  "darknessPointOrigin",
  "enthrallPerceptionPenalty",
  "gustOfWindLine",
  "invisibilityDirectCondition",
  "levitateCreature",
  "seeInvisibilityObserverSight",
  "spikeGrowthMovementHazard",
  "webRestraintHazard",
] as const;
type Level2ControlSpellSelectedIdentityResult =
  (typeof level2ControlSpellSelectedIdentityResults)[number];
type Level2ControlSpellSelectedIdentityProjection = {
  readonly lastResult: Level2ControlSpellSelectedIdentityResult;
};
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly Level2ControlSpellSelectedIdentityDriverAction[];
  readonly expected: Level2ControlSpellSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH";
  readonly unitId: Level2ControlSpellUnitId;
  readonly actions: readonly Level2ControlSpellSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH",
    unitId: "calm_emotions",
    actions: ["doDiscoverCalmEmotionsConditionImmunity"],
    sequences: [
      {
        name: "magic-action-selected-condition-immunity",
        actions: ["doDiscoverCalmEmotionsConditionImmunity"],
        expected: expectedProjection("calmEmotionsConditionImmunity"),
      },
    ],
  },
  {
    taskId: "B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH",
    unitId: "charm_person",
    actions: ["doDiscoverCharmPersonSaveGatedCondition"],
    sequences: [
      {
        name: "magic-action-selected-humanoid-charm",
        actions: ["doDiscoverCharmPersonSaveGatedCondition"],
        expected: expectedProjection("charmPersonSaveGatedCondition"),
      },
    ],
  },
  {
    taskId: "B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH",
    unitId: "darkness",
    actions: ["doDiscoverDarknessPointOrigin"],
    sequences: [
      {
        name: "magic-action-selected-magical-darkness-area",
        actions: ["doDiscoverDarknessPointOrigin"],
        expected: expectedProjection("darknessPointOrigin"),
      },
    ],
  },
  {
    taskId: "B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH",
    unitId: "enthrall",
    actions: ["doDiscoverEnthrallPerceptionPenalty"],
    sequences: [
      {
        name: "magic-action-selected-perception-penalty",
        actions: ["doDiscoverEnthrallPerceptionPenalty"],
        expected: expectedProjection("enthrallPerceptionPenalty"),
      },
    ],
  },
  {
    taskId: "B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH",
    unitId: "gust_of_wind",
    actions: ["doDiscoverGustOfWindLine"],
    sequences: [
      {
        name: "magic-action-selected-line-control",
        actions: ["doDiscoverGustOfWindLine"],
        expected: expectedProjection("gustOfWindLine"),
      },
    ],
  },
  {
    taskId: "B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH",
    unitId: "invisibility",
    actions: ["doDiscoverInvisibilityDirectCondition"],
    sequences: [
      {
        name: "magic-action-selected-invisible-condition",
        actions: ["doDiscoverInvisibilityDirectCondition"],
        expected: expectedProjection("invisibilityDirectCondition"),
      },
    ],
  },
  {
    taskId: "B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH",
    unitId: "levitate",
    actions: ["doDiscoverLevitateCreature"],
    sequences: [
      {
        name: "magic-action-selected-creature-levitation",
        actions: ["doDiscoverLevitateCreature"],
        expected: expectedProjection("levitateCreature"),
      },
    ],
  },
  {
    taskId: "B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH",
    unitId: "see_invisibility",
    actions: ["doDiscoverSeeInvisibilityObserverSight"],
    sequences: [
      {
        name: "magic-action-selected-observer-sight-effect",
        actions: ["doDiscoverSeeInvisibilityObserverSight"],
        expected: expectedProjection("seeInvisibilityObserverSight"),
      },
    ],
  },
  {
    taskId: "B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH",
    unitId: "spike_growth",
    actions: ["doDiscoverSpikeGrowthMovementHazard"],
    sequences: [
      {
        name: "magic-action-selected-movement-hazard",
        actions: ["doDiscoverSpikeGrowthMovementHazard"],
        expected: expectedProjection("spikeGrowthMovementHazard"),
      },
    ],
  },
  {
    taskId: "B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH",
    unitId: "web",
    actions: ["doDiscoverWebRestraintHazard"],
    sequences: [
      {
        name: "magic-action-selected-restraint-hazard",
        actions: ["doDiscoverWebRestraintHazard"],
        expected: expectedProjection("webRestraintHazard"),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Level 2 control spell selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<Level2ControlSpellSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createLevel2ControlSpellSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing level 2 control spell selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Level 2 control spell selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays level 2 control spell selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-level2-control-spell-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createLevel2ControlSpellSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: level2ControlSpellSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createLevel2ControlSpellSelectedIdentityDriver() {
  return defineDriver(level2ControlSpellSelectedIdentityDriverSchema, () => {
    let projection = expectedProjection("init");

    function reset(): void {
      projection = expectedProjection("init");
    }

    function recordDiscoveredInvocation(input: {
      readonly spellId: Level2ControlSpellUnitId;
      readonly slotLevel: 1 | 2;
      readonly procedure: Parameters<typeof spellSlotInvocationRef>[2];
      readonly result: Level2ControlSpellSelectedIdentityResult;
    }): void {
      const spell = selectedSpellRecord(input.spellId);
      const state = selectedSpellBattle(spell, input.slotLevel);
      const act = spellAct({
        state,
        spellId: input.spellId,
        slotLevel: input.slotLevel,
      });

      expect(act.subject).toEqual({
        tag: "actionSpell",
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
      doDiscoverCalmEmotionsConditionImmunity: () => {
        recordDiscoveredInvocation({
          spellId: calmEmotionsUnitId,
          slotLevel: 2,
          procedure: "saveGatedConditionImmunity",
          result: "calmEmotionsConditionImmunity",
        });
      },
      doDiscoverCharmPersonSaveGatedCondition: () => {
        recordDiscoveredInvocation({
          spellId: charmPersonUnitId,
          slotLevel: 2,
          procedure: "saveGatedCondition",
          result: "charmPersonSaveGatedCondition",
        });
      },
      doDiscoverDarknessPointOrigin: () => {
        recordDiscoveredInvocation({
          spellId: darknessUnitId,
          slotLevel: 2,
          procedure: "magicalDarknessPointOrigin",
          result: "darknessPointOrigin",
        });
      },
      doDiscoverEnthrallPerceptionPenalty: () => {
        recordDiscoveredInvocation({
          spellId: enthrallUnitId,
          slotLevel: 2,
          procedure: "rollModifier",
          result: "enthrallPerceptionPenalty",
        });
      },
      doDiscoverGustOfWindLine: () => {
        recordDiscoveredInvocation({
          spellId: gustOfWindUnitId,
          slotLevel: 2,
          procedure: "gustOfWindLine",
          result: "gustOfWindLine",
        });
      },
      doDiscoverInvisibilityDirectCondition: () => {
        recordDiscoveredInvocation({
          spellId: invisibilityUnitId,
          slotLevel: 2,
          procedure: "directCondition",
          result: "invisibilityDirectCondition",
        });
      },
      doDiscoverLevitateCreature: () => {
        recordDiscoveredInvocation({
          spellId: levitateUnitId,
          slotLevel: 2,
          procedure: "levitatedCreature",
          result: "levitateCreature",
        });
      },
      doDiscoverSeeInvisibilityObserverSight: () => {
        recordDiscoveredInvocation({
          spellId: seeInvisibilityUnitId,
          slotLevel: 2,
          procedure: "seeInvisibleObserverSight",
          result: "seeInvisibilityObserverSight",
        });
      },
      doDiscoverSpikeGrowthMovementHazard: () => {
        recordDiscoveredInvocation({
          spellId: spikeGrowthUnitId,
          slotLevel: 2,
          procedure: "spikeGrowthMovementHazard",
          result: "spikeGrowthMovementHazard",
        });
      },
      doDiscoverWebRestraintHazard: () => {
        recordDiscoveredInvocation({
          spellId: webUnitId,
          slotLevel: 2,
          procedure: "webRestraintHazard",
          result: "webRestraintHazard",
        });
      },
      getState: () => projection,
      step: () => {},
    };
  });
}

function expectedProjection(
  lastResult: Level2ControlSpellSelectedIdentityResult,
): Level2ControlSpellSelectedIdentityProjection {
  return { lastResult };
}

function selectedSpellBattle(
  spell: SpellRecord,
  slotLevel: 1 | 2,
): BattleState {
  return spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: slotLevel, count: 1 }],
  });
}

function selectedSpellRecord(unitId: Level2ControlSpellUnitId): SpellRecord {
  if (!level2ControlSpellUnitIds.some((candidate) => candidate === unitId)) {
    throw new Error(`Expected selected level 2 control spell id ${unitId}.`);
  }
  return spellRecord(unitId);
}

function normalizeLevel2ControlSpellSelectedIdentityQuintState(
  raw: unknown,
): Level2ControlSpellSelectedIdentityProjection {
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
): Level2ControlSpellSelectedIdentityProjection["lastResult"] {
  if (
    typeof raw === "string" &&
    isLevel2ControlSpellSelectedIdentityResult(raw)
  ) {
    return raw;
  }
  throw new Error(`Unexpected level 2 control spell MBT result ${String(raw)}.`);
}

function isLevel2ControlSpellSelectedIdentityResult(
  value: string,
): value is Level2ControlSpellSelectedIdentityResult {
  return level2ControlSpellSelectedIdentityResults.some(
    (result) => result === value,
  );
}

const level2ControlSpellSelectedIdentityStateCheck = stateCheck(
  normalizeLevel2ControlSpellSelectedIdentityQuintState,
  (
    spec: Level2ControlSpellSelectedIdentityProjection,
    impl: Level2ControlSpellSelectedIdentityProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
