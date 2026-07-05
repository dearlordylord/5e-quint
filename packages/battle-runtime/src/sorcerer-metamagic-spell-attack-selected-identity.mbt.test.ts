// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L3META-02-SORCERER-METAMAGIC-QUICKENED-SPELL-ATTACKS sorcerer_metamagic
// UNIT-IDENTITY-MBT-REPLAY: L3META-02-SORCERER-METAMAGIC-QUICKENED-SPELL-ATTACKS sorcerer_metamagic doResolveQuickenedSpellAttack
// RAW trace:
// - .references/srd-5.2.1/Classes/Sorcerer.md#Level 2: Metamagic:
//   selected Metamagic options spend Sorcery Points from the shared pool.
// - .references/srd-5.2.1/Classes/Sorcerer.md#Quickened Spell:
//   Quickened Spell costs 2 Sorcery Points and changes an action casting time
//   to a Bonus Action for that casting.
// - .references/srd-5.2.1/Spells/Descriptions-Q-R.md#Ray of Frost:
//   Ray of Frost is an action-cast ranged Spell Attack that deals Cold damage
//   on a hit and creates a Speed-reduction Spell Effect.
// - UBIQUITOUS_LANGUAGE.md: Magic Action, Bonus Action, Spell Invocation,
//   Spell Effect, Attack Roll, Pool, and Spend.
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
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import {
  observeQuickenedRayOfFrostRoute,
  projectBattleState,
  resolveQuickenedRayOfFrost,
  sorcererMetamagicBattle,
} from "./sorcerer-metamagic-selected-identity-support.ts";

const quickenedSpellAttackRouteReplayDriverSchema = {
  init: {},
  doRouteBonusActionCastingTime: {},
  stepRouteBonusActionCastingTime: {},
} as const;

type QuickenedSpellAttackRouteReplayProjection = {
  readonly route: readonly BattleReducerRouteEvent[];
};

defineSelectedIdentityWitness({
  describeLabel: "Sorcerer Metamagic spell-attack selected identity MBT",
  taskId: "L3META-02-SORCERER-METAMAGIC-QUICKENED-SPELL-ATTACKS",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-sorcerer-metamagic-spell-attack-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "scenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: {
      Init: "init",
      QuickenedSpellAttack: "quickenedSpellAttack",
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
          actionName: "doResolveQuickenedSpellAttack",
          projectionAfter: {
            magicActionAvailable: true,
            bonusActionAvailable: false,
            sorceryPointsRemaining: 2,
            targetHp: 3,
            targetActiveEffectCount: 1,
            lastResult: "quickenedSpellAttack",
          },
          discover: () =>
            projectBattleState(
              resolveQuickenedRayOfFrost(sorcererMetamagicBattle()),
              "quickenedSpellAttack",
            ),
        },
      ],
    },
  ],
});

it(
  "compares Quickened Spell attack public reducer route to copied qRoute",
  async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-sorcerer-metamagic.route.mbt.qnt",
      ),
      init: "init",
      step: "stepRouteBonusActionCastingTime",
      driver: createQuickenedSpellAttackRouteReplayDriver(),
      backend: "typescript",
      nTraces: 1,
      maxSteps: focusedMbtMaxSteps(1),
      stateCheck: reducerRoutedMetamagicStateCheck,
    });
  },
  MBT_TEST_TIMEOUT_MS,
);

function createQuickenedSpellAttackRouteReplayDriver() {
  return defineDriver(quickenedSpellAttackRouteReplayDriverSchema, () => {
    let route: readonly BattleReducerRouteEvent[] =
      observeQuickenedRayOfFrostInitialRoute();

    function reset(): void {
      route = observeQuickenedRayOfFrostInitialRoute();
    }

    function recordResolvedRoute(): void {
      route = observeQuickenedRayOfFrostRoute(sorcererMetamagicBattle());
    }

    reset();

    return {
      init: reset,
      doRouteBonusActionCastingTime: recordResolvedRoute,
      stepRouteBonusActionCastingTime: recordResolvedRoute,
      getState: (): QuickenedSpellAttackRouteReplayProjection => ({
        route,
      }),
    };
  });
}

function observeQuickenedRayOfFrostInitialRoute() {
  return [battleReducerStartRouteEvent(sorcererMetamagicBattle())] as const;
}
