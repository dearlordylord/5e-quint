// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH dragons_breath flame_blade flaming_sphere heat_metal moonbeam ray_of_enfeeblement scorching_ray shatter spiritual_weapon
// UNIT-IDENTITY-MBT-REPLAY: B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH dragons_breath doDiscoverDragonsBreathInitial
// UNIT-IDENTITY-MBT-REPLAY: B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH flame_blade doDiscoverFlameBladeHeldObject
// UNIT-IDENTITY-MBT-REPLAY: B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH flaming_sphere doDiscoverFlamingSphereHazard
// UNIT-IDENTITY-MBT-REPLAY: B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH heat_metal doDiscoverHeatMetalObjectContact
// UNIT-IDENTITY-MBT-REPLAY: B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH moonbeam doDiscoverMoonbeamMovableZone
// UNIT-IDENTITY-MBT-REPLAY: B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH ray_of_enfeeblement doDiscoverRayOfEnfeeblementSaveGate
// UNIT-IDENTITY-MBT-REPLAY: B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH scorching_ray doDiscoverScorchingRayAttackSequence
// UNIT-IDENTITY-MBT-REPLAY: B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH shatter doDiscoverShatterSaveGatedDamage
// UNIT-IDENTITY-MBT-REPLAY: B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH spiritual_weapon doDiscoverSpiritualWeaponAttackProxy
import * as path from "node:path";

import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { describe, expect, it } from "vitest";

import dragonsBreathInput from "../../surface/content/dragons_breath.json";
import rayOfEnfeeblementInput from "../../surface/content/ray_of_enfeeblement.json";
import type { BattleState } from "./index.ts";
import {
  dragonsBreathUnitId,
  flameBladeUnitId,
  flamingSphereUnitId,
  heatMetalUnitId,
  moonbeamUnitId,
  scorchingRayUnitId,
  shatterUnitId,
  spellCasterId,
  spiritualWeaponUnitId,
} from "./unit-profile-admission-catalog-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  bonusSpellAct,
  spellAct,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import { spellSlotInvocationRef } from "./unit-profile-admission-test-support.ts";

const level2DamageSpellSelectedIdentityDriverSchema = {
  init: {},
  doDiscoverDragonsBreathInitial: {},
  doDiscoverFlameBladeHeldObject: {},
  doDiscoverFlamingSphereHazard: {},
  doDiscoverHeatMetalObjectContact: {},
  doDiscoverMoonbeamMovableZone: {},
  doDiscoverRayOfEnfeeblementSaveGate: {},
  doDiscoverScorchingRayAttackSequence: {},
  doDiscoverShatterSaveGatedDamage: {},
  doDiscoverSpiritualWeaponAttackProxy: {},
  step: {},
} as const;
type Level2DamageSpellSelectedIdentityDriverAction = Exclude<
  keyof typeof level2DamageSpellSelectedIdentityDriverSchema,
  "init" | "step"
>;

const rayOfEnfeeblementUnitId = "ray_of_enfeeblement";
const level2DamageSpellUnitIds = [
  dragonsBreathUnitId,
  flameBladeUnitId,
  flamingSphereUnitId,
  heatMetalUnitId,
  moonbeamUnitId,
  rayOfEnfeeblementUnitId,
  scorchingRayUnitId,
  shatterUnitId,
  spiritualWeaponUnitId,
] as const;
type Level2DamageSpellUnitId = (typeof level2DamageSpellUnitIds)[number];
const level2DamageSpellSelectedIdentityResults = [
  "init",
  "dragonsBreathInitial",
  "flameBladeHeldObject",
  "flamingSphereHazard",
  "heatMetalObjectContact",
  "moonbeamMovableZone",
  "rayOfEnfeeblementSaveGate",
  "scorchingRayAttackSequence",
  "shatterSaveGatedDamage",
  "spiritualWeaponAttackProxy",
] as const;
type Level2DamageSpellSelectedIdentityResult =
  (typeof level2DamageSpellSelectedIdentityResults)[number];
type Level2DamageSpellSelectedIdentityProjection = {
  readonly lastResult: Level2DamageSpellSelectedIdentityResult;
};
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly Level2DamageSpellSelectedIdentityDriverAction[];
  readonly expected: Level2DamageSpellSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH";
  readonly unitId: Level2DamageSpellUnitId;
  readonly actions: readonly Level2DamageSpellSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};
type SpellActionTag = "actionSpell" | "bonusActionSpell";

const selectedUnitIdentityReplays = [
  {
    taskId: "B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH",
    unitId: "dragons_breath",
    actions: ["doDiscoverDragonsBreathInitial"],
    sequences: [
      {
        name: "bonus-action-selected-target-attachment",
        actions: ["doDiscoverDragonsBreathInitial"],
        expected: expectedProjection("dragonsBreathInitial"),
      },
    ],
  },
  {
    taskId: "B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH",
    unitId: "flame_blade",
    actions: ["doDiscoverFlameBladeHeldObject"],
    sequences: [
      {
        name: "bonus-action-selected-held-object",
        actions: ["doDiscoverFlameBladeHeldObject"],
        expected: expectedProjection("flameBladeHeldObject"),
      },
    ],
  },
  {
    taskId: "B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH",
    unitId: "flaming_sphere",
    actions: ["doDiscoverFlamingSphereHazard"],
    sequences: [
      {
        name: "magic-action-selected-fire-hazard",
        actions: ["doDiscoverFlamingSphereHazard"],
        expected: expectedProjection("flamingSphereHazard"),
      },
    ],
  },
  {
    taskId: "B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH",
    unitId: "heat_metal",
    actions: ["doDiscoverHeatMetalObjectContact"],
    sequences: [
      {
        name: "magic-action-selected-object-contact-damage",
        actions: ["doDiscoverHeatMetalObjectContact"],
        expected: expectedProjection("heatMetalObjectContact"),
      },
    ],
  },
  {
    taskId: "B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH",
    unitId: "moonbeam",
    actions: ["doDiscoverMoonbeamMovableZone"],
    sequences: [
      {
        name: "magic-action-selected-movable-zone",
        actions: ["doDiscoverMoonbeamMovableZone"],
        expected: expectedProjection("moonbeamMovableZone"),
      },
    ],
  },
  {
    taskId: "B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH",
    unitId: "ray_of_enfeeblement",
    actions: ["doDiscoverRayOfEnfeeblementSaveGate"],
    sequences: [
      {
        name: "magic-action-selected-save-gated-d20-effect",
        actions: ["doDiscoverRayOfEnfeeblementSaveGate"],
        expected: expectedProjection("rayOfEnfeeblementSaveGate"),
      },
    ],
  },
  {
    taskId: "B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH",
    unitId: "scorching_ray",
    actions: ["doDiscoverScorchingRayAttackSequence"],
    sequences: [
      {
        name: "magic-action-selected-independent-attack-sequence",
        actions: ["doDiscoverScorchingRayAttackSequence"],
        expected: expectedProjection("scorchingRayAttackSequence"),
      },
    ],
  },
  {
    taskId: "B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH",
    unitId: "shatter",
    actions: ["doDiscoverShatterSaveGatedDamage"],
    sequences: [
      {
        name: "magic-action-selected-save-gated-thunder-damage",
        actions: ["doDiscoverShatterSaveGatedDamage"],
        expected: expectedProjection("shatterSaveGatedDamage"),
      },
    ],
  },
  {
    taskId: "B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH",
    unitId: "spiritual_weapon",
    actions: ["doDiscoverSpiritualWeaponAttackProxy"],
    sequences: [
      {
        name: "bonus-action-selected-attack-proxy",
        actions: ["doDiscoverSpiritualWeaponAttackProxy"],
        expected: expectedProjection("spiritualWeaponAttackProxy"),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Level 2 damage spell selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<Level2DamageSpellSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createLevel2DamageSpellSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing level 2 damage spell selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Level 2 damage spell selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays level 2 damage spell selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-level2-damage-spell-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createLevel2DamageSpellSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: level2DamageSpellSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createLevel2DamageSpellSelectedIdentityDriver() {
  return defineDriver(level2DamageSpellSelectedIdentityDriverSchema, () => {
    let projection = expectedProjection("init");

    function reset(): void {
      projection = expectedProjection("init");
    }

    function recordDiscoveredInvocation(input: {
      readonly spellId: Level2DamageSpellUnitId;
      readonly actionTag: SpellActionTag;
      readonly slotLevel: 2;
      readonly procedure: Parameters<typeof spellSlotInvocationRef>[2];
      readonly result: Level2DamageSpellSelectedIdentityResult;
    }): void {
      const spell = selectedSpellRecord(input.spellId);
      const state = selectedSpellBattle(spell);
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
      doDiscoverDragonsBreathInitial: () => {
        recordDiscoveredInvocation({
          spellId: dragonsBreathUnitId,
          actionTag: "bonusActionSpell",
          slotLevel: 2,
          procedure: "dragonsBreathInitial",
          result: "dragonsBreathInitial",
        });
      },
      doDiscoverFlameBladeHeldObject: () => {
        recordDiscoveredInvocation({
          spellId: flameBladeUnitId,
          actionTag: "bonusActionSpell",
          slotLevel: 2,
          procedure: "spellCreatedHeldObject",
          result: "flameBladeHeldObject",
        });
      },
      doDiscoverFlamingSphereHazard: () => {
        recordDiscoveredInvocation({
          spellId: flamingSphereUnitId,
          actionTag: "actionSpell",
          slotLevel: 2,
          procedure: "flamingSphere",
          result: "flamingSphereHazard",
        });
      },
      doDiscoverHeatMetalObjectContact: () => {
        recordDiscoveredInvocation({
          spellId: heatMetalUnitId,
          actionTag: "actionSpell",
          slotLevel: 2,
          procedure: "objectContactDamage",
          result: "heatMetalObjectContact",
        });
      },
      doDiscoverMoonbeamMovableZone: () => {
        recordDiscoveredInvocation({
          spellId: moonbeamUnitId,
          actionTag: "actionSpell",
          slotLevel: 2,
          procedure: "moonbeam",
          result: "moonbeamMovableZone",
        });
      },
      doDiscoverRayOfEnfeeblementSaveGate: () => {
        recordDiscoveredInvocation({
          spellId: rayOfEnfeeblementUnitId,
          actionTag: "actionSpell",
          slotLevel: 2,
          procedure: "abilityD20TestRollModeSaveGate",
          result: "rayOfEnfeeblementSaveGate",
        });
      },
      doDiscoverScorchingRayAttackSequence: () => {
        recordDiscoveredInvocation({
          spellId: scorchingRayUnitId,
          actionTag: "actionSpell",
          slotLevel: 2,
          procedure: "spellAttackSequence",
          result: "scorchingRayAttackSequence",
        });
      },
      doDiscoverShatterSaveGatedDamage: () => {
        recordDiscoveredInvocation({
          spellId: shatterUnitId,
          actionTag: "actionSpell",
          slotLevel: 2,
          procedure: "saveGatedDamage",
          result: "shatterSaveGatedDamage",
        });
      },
      doDiscoverSpiritualWeaponAttackProxy: () => {
        recordDiscoveredInvocation({
          spellId: spiritualWeaponUnitId,
          actionTag: "bonusActionSpell",
          slotLevel: 2,
          procedure: "spiritualWeaponAttackProxy",
          result: "spiritualWeaponAttackProxy",
        });
      },
      getState: () => projection,
      step: () => {},
    };
  });
}

function expectedProjection(
  lastResult: Level2DamageSpellSelectedIdentityResult,
): Level2DamageSpellSelectedIdentityProjection {
  return { lastResult };
}

function selectedSpellBattle(spell: SpellRecord): BattleState {
  return spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 2, count: 1 }],
  });
}

function selectedSpellRecord(unitId: Level2DamageSpellUnitId): SpellRecord {
  if (unitId === dragonsBreathUnitId) {
    return decodedSpellRecord(dragonsBreathInput, unitId);
  }
  if (unitId === rayOfEnfeeblementUnitId) {
    return decodedSpellRecord(rayOfEnfeeblementInput, unitId);
  }
  return spellRecord(unitId);
}

function decodedSpellRecord(
  input: unknown,
  unitId: Level2DamageSpellUnitId,
): SpellRecord {
  const unit = decodeUnitRecordSync(input);
  if (unit.kind !== "spell" || unit.id !== unitId) {
    throw new Error(`Expected ${unitId} spell record.`);
  }
  return unit;
}

function normalizeLevel2DamageSpellSelectedIdentityQuintState(
  raw: unknown,
): Level2DamageSpellSelectedIdentityProjection {
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
): Level2DamageSpellSelectedIdentityProjection["lastResult"] {
  if (
    typeof raw === "string" &&
    isLevel2DamageSpellSelectedIdentityResult(raw)
  ) {
    return raw;
  }
  throw new Error(`Unexpected level 2 damage spell MBT result ${String(raw)}.`);
}

function isLevel2DamageSpellSelectedIdentityResult(
  value: string,
): value is Level2DamageSpellSelectedIdentityResult {
  return level2DamageSpellSelectedIdentityResults.some(
    (result) => result === value,
  );
}

const level2DamageSpellSelectedIdentityStateCheck = stateCheck(
  normalizeLevel2DamageSpellSelectedIdentityQuintState,
  (
    spec: Level2DamageSpellSelectedIdentityProjection,
    impl: Level2DamageSpellSelectedIdentityProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
