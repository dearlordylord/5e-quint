import { describe, expect, it } from "vitest";

import { weaponMasteryCleaveTargetHole } from "./battle-reducer/attack-roll.ts";
import {
  battleId,
  characterSeed,
  combatantId,
  discoverBattleActs,
  fighterId,
  goblinId,
  oppositionSide,
  partySide,
  startBattleRight,
  statBlockCreatureInit,
  wizardId,
  type BattleState,
} from "./battle-runtime-test-support.ts";
import {
  helpAttackAllyChoices,
  helpAttackTargetChoices,
} from "./battle-reducer.ts";
import {
  MBT_TEST_TIMEOUT_MS,
  booleanField,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  quintStateRecord,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";

type RelationshipDiscoveryProjection = {
  readonly helpActDiscovered: boolean;
  readonly helpOppositeSideAllyDiscovered: boolean;
  readonly helpSameSideEnemyDiscovered: boolean;
  readonly helpHelperExcluded: boolean;
  readonly helpSelectedAllyExcludedFromEnemy: boolean;
  readonly helpTerminalCandidateExcluded: boolean;
  readonly helpInsufficientParticipantsRejected: boolean;
  readonly cleaveSameSideSecondTargetDiscovered: boolean;
  readonly cleaveAttackerExcluded: boolean;
  readonly cleaveFirstTargetExcluded: boolean;
};

const relationshipDiscoveryDriverSchema = {
  init: {},
  doDiscoverHelpCandidates: {},
  doDiscoverCleaveSecondTarget: {},
  step: {},
} as const;

const secondTargetId = combatantId("relationship-discovery-second-target");

describe("relationship discovery MBT", () => {
  it(
    "keeps Help and Cleave candidates independent of stored side values",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-relationship-discovery.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createRelationshipDiscoveryDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(1),
        stateCheck: relationshipDiscoveryStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function createRelationshipDiscoveryDriver() {
  return defineDriver(relationshipDiscoveryDriverSchema, () => {
    let projection = initialProjection();

    return {
      init() {
        projection = initialProjection();
      },
      doDiscoverHelpCandidates() {
        projection = helpProjection(relationshipDiscoveryBattle());
      },
      doDiscoverCleaveSecondTarget() {
        projection = cleaveProjection(relationshipDiscoveryBattle());
      },
      step() {},
      getState: () => projection,
    };
  });
}

const relationshipDiscoveryStateCheck = stateCheck(
  (raw: unknown): RelationshipDiscoveryProjection => {
    const state = quintStateRecord(raw);
    return {
      helpActDiscovered: booleanField(state, "qHelpActDiscovered"),
      helpOppositeSideAllyDiscovered: booleanField(
        state,
        "qHelpOppositeSideAllyDiscovered",
      ),
      helpSameSideEnemyDiscovered: booleanField(
        state,
        "qHelpSameSideEnemyDiscovered",
      ),
      helpHelperExcluded: booleanField(state, "qHelpHelperExcluded"),
      helpSelectedAllyExcludedFromEnemy: booleanField(
        state,
        "qHelpSelectedAllyExcludedFromEnemy",
      ),
      helpTerminalCandidateExcluded: booleanField(
        state,
        "qHelpTerminalCandidateExcluded",
      ),
      helpInsufficientParticipantsRejected: booleanField(
        state,
        "qHelpInsufficientParticipantsRejected",
      ),
      cleaveSameSideSecondTargetDiscovered: booleanField(
        state,
        "qCleaveSameSideSecondTargetDiscovered",
      ),
      cleaveAttackerExcluded: booleanField(state, "qCleaveAttackerExcluded"),
      cleaveFirstTargetExcluded: booleanField(
        state,
        "qCleaveFirstTargetExcluded",
      ),
    };
  },
  (
    spec: RelationshipDiscoveryProjection,
    impl: RelationshipDiscoveryProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);

function relationshipDiscoveryBattle(input?: {
  readonly secondTargetHp?: number;
}): BattleState {
  return startBattleRight({
    battleId: battleId("relationship-discovery-mbt"),
    combatants: [
      characterSeed({ initiative: 20, side: partySide }),
      statBlockCreatureInit({ initiative: 10, side: partySide }),
      characterSeed({
        combatantId: wizardId,
        displayName: "Wizard",
        initiative: 5,
        side: oppositionSide,
      }),
      statBlockCreatureInit({
        combatantId: secondTargetId,
        displayName: "Second Target",
        initiative: 1,
        side: partySide,
        ...(input?.secondTargetHp === undefined
          ? {}
          : { currentHp: input.secondTargetHp }),
      }),
    ],
  });
}

function helpProjection(state: BattleState): RelationshipDiscoveryProjection {
  const allyChoices = helpAttackAllyChoices(state, fighterId);
  const enemyChoices = helpAttackTargetChoices(state, fighterId, wizardId);
  const terminalCandidateState = relationshipDiscoveryBattle({
    secondTargetHp: 0,
  });
  const insufficientParticipantsState = startBattleRight({
    battleId: battleId("relationship-discovery-insufficient-participants-mbt"),
    combatants: [
      characterSeed({ initiative: 20, side: partySide }),
      characterSeed({
        combatantId: wizardId,
        displayName: "Wizard",
        initiative: 5,
        side: oppositionSide,
      }),
    ],
  });
  const helpActDiscovered = discoverBattleActs(state).some(
    (act) =>
      act.subject.tag === "action" && act.subject.action === "helpAttack",
  );
  return {
    helpActDiscovered,
    helpOppositeSideAllyDiscovered: allyChoices.includes(wizardId),
    helpSameSideEnemyDiscovered: enemyChoices.includes(goblinId),
    helpHelperExcluded: !allyChoices.includes(fighterId),
    helpSelectedAllyExcludedFromEnemy: !enemyChoices.includes(wizardId),
    helpTerminalCandidateExcluded: !helpAttackAllyChoices(
      terminalCandidateState,
      fighterId,
    ).includes(secondTargetId),
    helpInsufficientParticipantsRejected:
      helpAttackAllyChoices(insufficientParticipantsState, fighterId).length ===
        0 &&
      !discoverBattleActs(insufficientParticipantsState).some(
        (act) =>
          act.subject.tag === "action" && act.subject.action === "helpAttack",
      ),
    cleaveSameSideSecondTargetDiscovered: false,
    cleaveAttackerExcluded: false,
    cleaveFirstTargetExcluded: false,
  };
}

function cleaveProjection(state: BattleState): RelationshipDiscoveryProjection {
  const choices = weaponMasteryCleaveTargetHole(
    state,
    fighterId,
    goblinId,
  ).choices;
  return {
    ...initialProjection(),
    cleaveSameSideSecondTargetDiscovered: choices.includes(secondTargetId),
    cleaveAttackerExcluded: !choices.includes(fighterId),
    cleaveFirstTargetExcluded: !choices.includes(goblinId),
  };
}

function initialProjection(): RelationshipDiscoveryProjection {
  return {
    helpActDiscovered: false,
    helpOppositeSideAllyDiscovered: false,
    helpSameSideEnemyDiscovered: false,
    helpHelperExcluded: false,
    helpSelectedAllyExcludedFromEnemy: false,
    helpTerminalCandidateExcluded: false,
    helpInsufficientParticipantsRejected: false,
    cleaveSameSideSecondTargetDiscovered: false,
    cleaveAttackerExcluded: false,
    cleaveFirstTargetExcluded: false,
  };
}
