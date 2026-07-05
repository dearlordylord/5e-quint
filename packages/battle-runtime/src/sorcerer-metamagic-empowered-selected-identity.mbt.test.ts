// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3MMETA-19-EMPOWERED-SPELL-DAMAGE-REROLL-SLICE sorcerer_metamagic
// UNIT-IDENTITY-REPLAY: L3MMETA-19-EMPOWERED-SPELL-DAMAGE-REROLL-SLICE sorcerer_metamagic doResolveEmpoweredSpellDamageReroll
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.metamagic-damage-dice-reroll
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.METAMAGIC_EMPOWERED_DAMAGE_DICE_REROLL
// RAW trace:
// - .references/srd-5.2.1/Classes/Sorcerer.md#Level 2: Metamagic:
//   selected Metamagic options spend Sorcery Points from the shared pool.
// - .references/srd-5.2.1/Classes/Sorcerer.md#Empowered Spell:
//   when rolling spell damage, spend 1 Sorcery Point to reroll damage dice up
//   to the Charisma modifier minimum-one limit, use the new rolls, and combine
//   with a different Metamagic option.
// - .references/srd-5.2.1/Spells/Descriptions-Q-R.md#Ray of Frost:
//   Ray of Frost is an action-cast ranged Spell Attack cantrip that deals
//   2d8 Cold damage at level 5.
// - UBIQUITOUS_LANGUAGE.md: Magic Action, Spell Invocation, Damage Roll,
//   Sorcery Points as a Pool, and Spend.
import { it } from "vitest";

import {
  defineDriver,
  focusedMbtMaxSteps,
  MBT_TEST_TIMEOUT_MS,
  mbtSpecPath,
  reducerRoutedMetamagicStateCheck,
  run,
} from "./battle-runtime-mbt-driver-kit.ts";
import {
  battleReducerStartRouteEvent,
  type BattleReducerRouteEvent,
} from "./index.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.ts";
import {
  empoweredSorcererMetamagicBattle,
  observeEmpoweredRayOfFrostRoute,
  projectBattleState,
  resolveEmpoweredRayOfFrost,
} from "./sorcerer-metamagic-selected-identity-support.ts";

const empoweredMetamagicRouteReplayDriverSchema = {
  init: {},
  doRouteDamageDiceReroll: {},
} as const;

type EmpoweredMetamagicRouteReplayProjection = {
  readonly route: readonly BattleReducerRouteEvent[];
};

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Sorcerer Metamagic Empowered Spell selected identity replay",
  taskId: "L3MMETA-19-EMPOWERED-SPELL-DAMAGE-REROLL-SLICE",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-sorcerer-metamagic-empowered-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "scenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: {
      Init: "init",
      EmpoweredSpellDamageReroll: "empoweredSpellDamageReroll",
    },
  },
  projectionSchema: {
    magicActionAvailable: "bool",
    bonusActionAvailable: "bool",
    sorceryPointsRemaining: "int",
    targetHp: "int",
    targetActiveEffectCount: "int",
    lastResult: "variant",
  },
  initialProjection: {
    magicActionAvailable: true,
    bonusActionAvailable: true,
    sorceryPointsRemaining: 4,
    targetHp: 10,
    targetActiveEffectCount: 0,
    lastResult: "init",
  },
  units: [
    {
      unitId: "sorcerer_metamagic",
      procedures: [
        {
          actionName: "doResolveEmpoweredSpellDamageReroll",
          projectionAfter: {
            magicActionAvailable: false,
            bonusActionAvailable: true,
            sorceryPointsRemaining: 3,
            targetHp: 1,
            targetActiveEffectCount: 1,
            lastResult: "empoweredSpellDamageReroll",
          },
          discover: () =>
            projectBattleState(
              resolveEmpoweredRayOfFrost(empoweredSorcererMetamagicBattle()),
              "empoweredSpellDamageReroll",
            ),
        },
      ],
    },
  ],
});

it(
  "compares Empowered Spell damage-reroll public reducer route to copied qRoute",
  async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-sorcerer-metamagic.route.mbt.qnt",
      ),
      init: "init",
      step: "stepRouteDamageDiceReroll",
      driver: createEmpoweredMetamagicRouteReplayDriver(),
      backend: "typescript",
      nTraces: 1,
      maxSteps: focusedMbtMaxSteps(1),
      stateCheck: reducerRoutedMetamagicStateCheck,
    });
  },
  MBT_TEST_TIMEOUT_MS,
);

function createEmpoweredMetamagicRouteReplayDriver() {
  return defineDriver(empoweredMetamagicRouteReplayDriverSchema, () => {
    let route: readonly BattleReducerRouteEvent[] =
      observeEmpoweredRayOfFrostInitialRoute();

    function reset(): void {
      route = observeEmpoweredRayOfFrostInitialRoute();
    }

    function recordResolvedRoute(): void {
      route = observeEmpoweredRayOfFrostRoute(
        empoweredSorcererMetamagicBattle(),
      );
    }

    reset();

    return {
      init: reset,
      doRouteDamageDiceReroll: recordResolvedRoute,
      getState: (): EmpoweredMetamagicRouteReplayProjection => ({ route }),
    };
  });
}

function observeEmpoweredRayOfFrostInitialRoute() {
  return [
    battleReducerStartRouteEvent(),
  ] as const;
}
