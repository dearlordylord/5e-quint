// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.attack-action-attack-count-scaling
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay extra-attack-count-scaling barbarian_extra_attack fighter_extra_attack monk_extra_attack paladin_extra_attack ranger_extra_attack
// UNIT-IDENTITY-REPLAY: extra-attack-count-scaling barbarian_extra_attack doResolveFirstExtraAttackMiss doResolveSecondExtraAttackMiss
// UNIT-IDENTITY-REPLAY: extra-attack-count-scaling fighter_extra_attack doResolveFirstExtraAttackMiss doResolveSecondExtraAttackMiss
// UNIT-IDENTITY-REPLAY: extra-attack-count-scaling monk_extra_attack doResolveFirstExtraAttackMiss doResolveSecondExtraAttackMiss
// UNIT-IDENTITY-REPLAY: extra-attack-count-scaling paladin_extra_attack doResolveFirstExtraAttackMiss doResolveSecondExtraAttackMiss
// UNIT-IDENTITY-REPLAY: extra-attack-count-scaling ranger_extra_attack doResolveFirstExtraAttackMiss doResolveSecondExtraAttackMiss
import { describe, expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  createExtraAttackDriver,
  extraAttackMbtAdditionalAttackCounts,
  extraAttackMbtInitAction,
  extraAttackStateCheck,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  run,
  runSelectedUnitIdentityReplay,
  type ExtraAttackDriverAction,
  type ExtraAttackMbtProjection,
  type ExtraAttackSelectedUnitIdentityReplay,
  type SelectedUnitIdentityReplaySequence,
} from "./battle-runtime-mbt-driver-kit.ts";

const extraAttackDriverSchema = {
  init: {},
  initOneAdditionalAttack: {},
  initTwoAdditionalAttacks: {},
  initThreeAdditionalAttacks: {},
  doResolveFirstExtraAttackMiss: {},
  doMoveBetweenExtraAttackSlots: {},
  doResolveSecondExtraAttackMiss: {},
  doRejectThirdExtraAttack: {},
  doEndTurnClosesExtraAttackSlot: {},
  step: {},
} as const;

const extraAttackSelectedIdentitySequences = [
  {
    name: "attack-action-opens-extra-attack-slot",
    actions: ["doResolveFirstExtraAttackMiss"],
    expected: {
      skeletonHp: 13,
      actionAvailable: false,
      extraAttackSlotsAvailable: 1,
      movementSpentFeet: 0,
      lastResult: "resolved",
      lastInvalidReason: "",
    },
  },
  {
    name: "extra-attack-slot-spent-without-action-cost",
    actions: [
      "doResolveFirstExtraAttackMiss",
      "doResolveSecondExtraAttackMiss",
    ],
    expected: {
      skeletonHp: 13,
      actionAvailable: false,
      extraAttackSlotsAvailable: 0,
      movementSpentFeet: 0,
      lastResult: "resolved",
      lastInvalidReason: "",
    },
  },
] as const satisfies readonly SelectedUnitIdentityReplaySequence<
  ExtraAttackDriverAction,
  ExtraAttackMbtProjection
>[];

const selectedUnitIdentityReplays = [
  {
    taskId: "extra-attack-count-scaling",
    unitId: "barbarian_extra_attack",
    driver: "extraAttack",
    actions: [
      "doResolveFirstExtraAttackMiss",
      "doResolveSecondExtraAttackMiss",
    ],
    sequences: [...extraAttackSelectedIdentitySequences],
  },
  {
    taskId: "extra-attack-count-scaling",
    unitId: "fighter_extra_attack",
    driver: "extraAttack",
    actions: [
      "doResolveFirstExtraAttackMiss",
      "doResolveSecondExtraAttackMiss",
    ],
    sequences: [...extraAttackSelectedIdentitySequences],
  },
  {
    taskId: "extra-attack-count-scaling",
    unitId: "monk_extra_attack",
    driver: "extraAttack",
    actions: [
      "doResolveFirstExtraAttackMiss",
      "doResolveSecondExtraAttackMiss",
    ],
    sequences: [...extraAttackSelectedIdentitySequences],
  },
  {
    taskId: "extra-attack-count-scaling",
    unitId: "paladin_extra_attack",
    driver: "extraAttack",
    actions: [
      "doResolveFirstExtraAttackMiss",
      "doResolveSecondExtraAttackMiss",
    ],
    sequences: [...extraAttackSelectedIdentitySequences],
  },
  {
    taskId: "extra-attack-count-scaling",
    unitId: "ranger_extra_attack",
    driver: "extraAttack",
    actions: [
      "doResolveFirstExtraAttackMiss",
      "doResolveSecondExtraAttackMiss",
    ],
    sequences: [...extraAttackSelectedIdentitySequences],
  },
] as const satisfies ReadonlyArray<ExtraAttackSelectedUnitIdentityReplay>;

describe("Extra Attack count MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      for (const sequence of replay.sequences) {
        expect(sequence.actions.length).toBeGreaterThan(0);
      }
      await runSelectedUnitIdentityReplay(replay);
    }
  });

  it.each(extraAttackMbtAdditionalAttackCounts)(
    "replays Extra Attack count %i slot spending",
    async (additionalAttacks) => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-extra-attack.mbt.qnt",
        ),
        init: extraAttackMbtInitAction(additionalAttacks),
        step: "stepSpendAllSlots",
        driver: createExtraAttackDriver(
          "fighter_extra_attack",
          extraAttackDriverSchema,
        ),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(additionalAttacks + 3),
        stateCheck: extraAttackStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it.each(extraAttackMbtAdditionalAttackCounts)(
    "replays Extra Attack count %i end-turn slot closure",
    async (additionalAttacks) => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-extra-attack.mbt.qnt",
        ),
        init: extraAttackMbtInitAction(additionalAttacks),
        step: "stepEndTurnAfterOpeningSlots",
        driver: createExtraAttackDriver(
          "fighter_extra_attack",
          extraAttackDriverSchema,
        ),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(2),
        stateCheck: extraAttackStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});
