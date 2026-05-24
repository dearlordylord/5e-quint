// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH aid barkskin blur continual_flame enhance_ability enlarge_reduce magic_weapon mirror_image pass_without_trace warding_bond
// UNIT-IDENTITY-MBT-REPLAY: B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH aid doDiscoverAidHitPointBuff
// UNIT-IDENTITY-MBT-REPLAY: B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH barkskin doDiscoverBarkskinArmorClassFloor
// UNIT-IDENTITY-MBT-REPLAY: B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH blur doDiscoverBlurAttackRollDefense
// UNIT-IDENTITY-MBT-REPLAY: B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH continual_flame doDiscoverContinualFlameObjectLight
// UNIT-IDENTITY-MBT-REPLAY: B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH enhance_ability doDiscoverEnhanceAbilityRollModifier
// UNIT-IDENTITY-MBT-REPLAY: B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH enlarge_reduce doDiscoverEnlargeReduceSizeIncrease
// UNIT-IDENTITY-MBT-REPLAY: B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH magic_weapon doDiscoverMagicWeaponEnhancement
// UNIT-IDENTITY-MBT-REPLAY: B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH mirror_image doDiscoverMirrorImageHitInterception
// UNIT-IDENTITY-MBT-REPLAY: B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH pass_without_trace doDiscoverPassWithoutTraceStealthModifier
// UNIT-IDENTITY-MBT-REPLAY: B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH warding_bond doDiscoverWardingBondLinkedEffect
import * as path from "node:path";

import type { SpellRecord } from "@dnd/surface/surface/types";
import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { describe, expect, it } from "vitest";

import type { BattleState } from "./index.ts";
import {
  aidUnitId,
  barkskinUnitId,
  blurUnitId,
  continualFlameUnitId,
  enhanceAbilityUnitId,
  enlargeReduceUnitId,
  magicWeaponUnitId,
  mirrorImageUnitId,
  passWithoutTraceUnitId,
  spellCasterId,
  wardingBondUnitId,
} from "./unit-profile-admission-catalog-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  bonusSpellAct,
  spellAct,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import { spellSlotInvocationRef } from "./unit-profile-admission-test-support.ts";

const level2ProtectionSpellSelectedIdentityDriverSchema = {
  init: {},
  doDiscoverAidHitPointBuff: {},
  doDiscoverBarkskinArmorClassFloor: {},
  doDiscoverBlurAttackRollDefense: {},
  doDiscoverContinualFlameObjectLight: {},
  doDiscoverEnhanceAbilityRollModifier: {},
  doDiscoverEnlargeReduceSizeIncrease: {},
  doDiscoverMagicWeaponEnhancement: {},
  doDiscoverMirrorImageHitInterception: {},
  doDiscoverPassWithoutTraceStealthModifier: {},
  doDiscoverWardingBondLinkedEffect: {},
  step: {},
} as const;
type Level2ProtectionSpellSelectedIdentityDriverAction = Exclude<
  keyof typeof level2ProtectionSpellSelectedIdentityDriverSchema,
  "init" | "step"
>;

const level2ProtectionSpellUnitIds = [
  aidUnitId,
  barkskinUnitId,
  blurUnitId,
  continualFlameUnitId,
  enhanceAbilityUnitId,
  enlargeReduceUnitId,
  magicWeaponUnitId,
  mirrorImageUnitId,
  passWithoutTraceUnitId,
  wardingBondUnitId,
] as const;
type Level2ProtectionSpellUnitId =
  (typeof level2ProtectionSpellUnitIds)[number];
const level2ProtectionSpellSelectedIdentityResults = [
  "init",
  "aidHitPointBuff",
  "barkskinArmorClassFloor",
  "blurAttackRollDefense",
  "continualFlameObjectLight",
  "enhanceAbilityRollModifier",
  "enlargeReduceSizeIncrease",
  "magicWeaponEnhancement",
  "mirrorImageHitInterception",
  "passWithoutTraceStealthModifier",
  "wardingBondLinkedEffect",
] as const;
type Level2ProtectionSpellSelectedIdentityResult =
  (typeof level2ProtectionSpellSelectedIdentityResults)[number];
type Level2ProtectionSpellSelectedIdentityProjection = {
  readonly lastResult: Level2ProtectionSpellSelectedIdentityResult;
};
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly Level2ProtectionSpellSelectedIdentityDriverAction[];
  readonly expected: Level2ProtectionSpellSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH";
  readonly unitId: Level2ProtectionSpellUnitId;
  readonly actions: readonly Level2ProtectionSpellSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};
type SpellActionTag = "actionSpell" | "bonusActionSpell";

const selectedUnitIdentityReplays = [
  {
    taskId: "B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH",
    unitId: "aid",
    actions: ["doDiscoverAidHitPointBuff"],
    sequences: [
      {
        name: "magic-action-selected-hit-point-buff",
        actions: ["doDiscoverAidHitPointBuff"],
        expected: expectedProjection("aidHitPointBuff"),
      },
    ],
  },
  {
    taskId: "B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH",
    unitId: "barkskin",
    actions: ["doDiscoverBarkskinArmorClassFloor"],
    sequences: [
      {
        name: "bonus-action-selected-armor-class-floor",
        actions: ["doDiscoverBarkskinArmorClassFloor"],
        expected: expectedProjection("barkskinArmorClassFloor"),
      },
    ],
  },
  {
    taskId: "B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH",
    unitId: "blur",
    actions: ["doDiscoverBlurAttackRollDefense"],
    sequences: [
      {
        name: "magic-action-selected-attack-roll-defense",
        actions: ["doDiscoverBlurAttackRollDefense"],
        expected: expectedProjection("blurAttackRollDefense"),
      },
    ],
  },
  {
    taskId: "B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH",
    unitId: "continual_flame",
    actions: ["doDiscoverContinualFlameObjectLight"],
    sequences: [
      {
        name: "magic-action-selected-object-light",
        actions: ["doDiscoverContinualFlameObjectLight"],
        expected: expectedProjection("continualFlameObjectLight"),
      },
    ],
  },
  {
    taskId: "B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH",
    unitId: "enhance_ability",
    actions: ["doDiscoverEnhanceAbilityRollModifier"],
    sequences: [
      {
        name: "magic-action-selected-ability-check-modifier",
        actions: ["doDiscoverEnhanceAbilityRollModifier"],
        expected: expectedProjection("enhanceAbilityRollModifier"),
      },
    ],
  },
  {
    taskId: "B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH",
    unitId: "enlarge_reduce",
    actions: ["doDiscoverEnlargeReduceSizeIncrease"],
    sequences: [
      {
        name: "magic-action-selected-size-increase-mode",
        actions: ["doDiscoverEnlargeReduceSizeIncrease"],
        expected: expectedProjection("enlargeReduceSizeIncrease"),
      },
    ],
  },
  {
    taskId: "B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH",
    unitId: "magic_weapon",
    actions: ["doDiscoverMagicWeaponEnhancement"],
    sequences: [
      {
        name: "bonus-action-selected-item-enhancement",
        actions: ["doDiscoverMagicWeaponEnhancement"],
        expected: expectedProjection("magicWeaponEnhancement"),
      },
    ],
  },
  {
    taskId: "B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH",
    unitId: "mirror_image",
    actions: ["doDiscoverMirrorImageHitInterception"],
    sequences: [
      {
        name: "magic-action-selected-hit-interception",
        actions: ["doDiscoverMirrorImageHitInterception"],
        expected: expectedProjection("mirrorImageHitInterception"),
      },
    ],
  },
  {
    taskId: "B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH",
    unitId: "pass_without_trace",
    actions: ["doDiscoverPassWithoutTraceStealthModifier"],
    sequences: [
      {
        name: "magic-action-selected-stealth-modifier",
        actions: ["doDiscoverPassWithoutTraceStealthModifier"],
        expected: expectedProjection("passWithoutTraceStealthModifier"),
      },
    ],
  },
  {
    taskId: "B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH",
    unitId: "warding_bond",
    actions: ["doDiscoverWardingBondLinkedEffect"],
    sequences: [
      {
        name: "magic-action-selected-linked-effect",
        actions: ["doDiscoverWardingBondLinkedEffect"],
        expected: expectedProjection("wardingBondLinkedEffect"),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Level 2 protection spell selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<Level2ProtectionSpellSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createLevel2ProtectionSpellSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing level 2 protection spell selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Level 2 protection spell selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays level 2 protection spell selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-level2-protection-spell-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createLevel2ProtectionSpellSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: level2ProtectionSpellSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createLevel2ProtectionSpellSelectedIdentityDriver() {
  return defineDriver(
    level2ProtectionSpellSelectedIdentityDriverSchema,
    () => {
      let projection = expectedProjection("init");

      function reset(): void {
        projection = expectedProjection("init");
      }

      function recordDiscoveredInvocation(input: {
        readonly spellId: Level2ProtectionSpellUnitId;
        readonly actionTag: SpellActionTag;
        readonly procedure: Parameters<typeof spellSlotInvocationRef>[2];
        readonly result: Level2ProtectionSpellSelectedIdentityResult;
      }): void {
        const spell = selectedSpellRecord(input.spellId);
        const state = selectedSpellBattle(spell);
        const act =
          input.actionTag === "bonusActionSpell"
            ? bonusSpellAct({
                state,
                spellId: input.spellId,
                slotLevel: 2,
              })
            : spellAct({
                state,
                spellId: input.spellId,
                slotLevel: 2,
              });

        expect(act.subject).toEqual({
          tag: input.actionTag,
          actorId: spellCasterId,
          invocation: spellSlotInvocationRef(
            input.spellId,
            2,
            input.procedure,
          ),
          mode: { tag: "cast" },
        });
        projection = expectedProjection(input.result);
      }

      return {
        init: reset,
        doDiscoverAidHitPointBuff: () => {
          recordDiscoveredInvocation({
            spellId: aidUnitId,
            actionTag: "actionSpell",
            procedure: "scalarBuff",
            result: "aidHitPointBuff",
          });
        },
        doDiscoverBarkskinArmorClassFloor: () => {
          recordDiscoveredInvocation({
            spellId: barkskinUnitId,
            actionTag: "bonusActionSpell",
            procedure: "scalarBuff",
            result: "barkskinArmorClassFloor",
          });
        },
        doDiscoverBlurAttackRollDefense: () => {
          recordDiscoveredInvocation({
            spellId: blurUnitId,
            actionTag: "actionSpell",
            procedure: "blurAttackRollDefense",
            result: "blurAttackRollDefense",
          });
        },
        doDiscoverContinualFlameObjectLight: () => {
          recordDiscoveredInvocation({
            spellId: continualFlameUnitId,
            actionTag: "actionSpell",
            procedure: "objectLight",
            result: "continualFlameObjectLight",
          });
        },
        doDiscoverEnhanceAbilityRollModifier: () => {
          recordDiscoveredInvocation({
            spellId: enhanceAbilityUnitId,
            actionTag: "actionSpell",
            procedure: "rollModifier",
            result: "enhanceAbilityRollModifier",
          });
        },
        doDiscoverEnlargeReduceSizeIncrease: () => {
          recordDiscoveredInvocation({
            spellId: enlargeReduceUnitId,
            actionTag: "actionSpell",
            procedure: "creatureSizeIncrease",
            result: "enlargeReduceSizeIncrease",
          });
        },
        doDiscoverMagicWeaponEnhancement: () => {
          recordDiscoveredInvocation({
            spellId: magicWeaponUnitId,
            actionTag: "bonusActionSpell",
            procedure: "magicWeaponEnhancement",
            result: "magicWeaponEnhancement",
          });
        },
        doDiscoverMirrorImageHitInterception: () => {
          recordDiscoveredInvocation({
            spellId: mirrorImageUnitId,
            actionTag: "actionSpell",
            procedure: "mirrorImageHitInterception",
            result: "mirrorImageHitInterception",
          });
        },
        doDiscoverPassWithoutTraceStealthModifier: () => {
          recordDiscoveredInvocation({
            spellId: passWithoutTraceUnitId,
            actionTag: "actionSpell",
            procedure: "rollModifier",
            result: "passWithoutTraceStealthModifier",
          });
        },
        doDiscoverWardingBondLinkedEffect: () => {
          recordDiscoveredInvocation({
            spellId: wardingBondUnitId,
            actionTag: "actionSpell",
            procedure: "wardingBond",
            result: "wardingBondLinkedEffect",
          });
        },
        getState: () => projection,
        step: () => {},
      };
    },
  );
}

function expectedProjection(
  lastResult: Level2ProtectionSpellSelectedIdentityResult,
): Level2ProtectionSpellSelectedIdentityProjection {
  return { lastResult };
}

function selectedSpellBattle(spell: SpellRecord): BattleState {
  return spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 2, count: 1 }],
  });
}

function selectedSpellRecord(unitId: Level2ProtectionSpellUnitId): SpellRecord {
  if (!level2ProtectionSpellUnitIds.some((candidate) => candidate === unitId)) {
    throw new Error(
      `Expected selected level 2 protection spell id ${unitId}.`,
    );
  }
  return spellRecord(unitId);
}

function normalizeLevel2ProtectionSpellSelectedIdentityQuintState(
  raw: unknown,
): Level2ProtectionSpellSelectedIdentityProjection {
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
): Level2ProtectionSpellSelectedIdentityProjection["lastResult"] {
  if (
    typeof raw === "string" &&
    isLevel2ProtectionSpellSelectedIdentityResult(raw)
  ) {
    return raw;
  }
  throw new Error(
    `Unexpected level 2 protection spell MBT result ${String(raw)}.`,
  );
}

function isLevel2ProtectionSpellSelectedIdentityResult(
  value: string,
): value is Level2ProtectionSpellSelectedIdentityResult {
  return level2ProtectionSpellSelectedIdentityResults.some(
    (result) => result === value,
  );
}

const level2ProtectionSpellSelectedIdentityStateCheck = stateCheck(
  normalizeLevel2ProtectionSpellSelectedIdentityQuintState,
  (
    spec: Level2ProtectionSpellSelectedIdentityProjection,
    impl: Level2ProtectionSpellSelectedIdentityProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
