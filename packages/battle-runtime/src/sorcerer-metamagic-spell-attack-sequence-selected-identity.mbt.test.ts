// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR
// UNIT-IDENTITY-QNT-REPLAY: L3MMETA-07-QUICKENED-NEXT-PROCEDURE-SLICE sorcerer_metamagic doResolveQuickenedSpellAttackSequence
// RAW trace:
// - .references/srd-5.2.1/Classes/Sorcerer.md#Level 2: Metamagic:
//   selected Metamagic options spend Sorcery Points from the shared pool.
// - .references/srd-5.2.1/Classes/Sorcerer.md#Quickened Spell:
//   Quickened Spell costs 2 Sorcery Points and changes an action casting time
//   to a Bonus Action for that casting.
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Eldritch Blast:
//   Eldritch Blast is an action-cast ranged Spell Attack sequence cantrip.
// - UBIQUITOUS_LANGUAGE.md: Magic Action, Bonus Action, Spell Invocation,
//   Attack Roll, Damage Roll, Sorcery Points as a Pool, and Spend.
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
import { defineSelectedIdentityQntReplay } from "./selected-identity-witness.ts";
import {
  observeQuickenedEldritchBlastRoute,
  sorcererMetamagicBattle,
} from "./sorcerer-metamagic-selected-identity-support.ts";
import { sorcererMetamagicSpellAttackSequenceSelectedIdentityQntReplay } from "./sorcerer-metamagic-spell-attack-sequence-selected-identity.qnt-replay.test-support.ts";

const quickenedSpellAttackSequenceRouteReplayDriverSchema = {
  init: {},
  doRouteBonusActionCastingTime: {},
  stepRouteBonusActionCastingTime: {},
} as const;

type QuickenedSpellAttackSequenceRouteReplayProjection = {
  readonly route: readonly BattleReducerRouteEvent[];
};

defineSelectedIdentityQntReplay(
  sorcererMetamagicSpellAttackSequenceSelectedIdentityQntReplay,
);

it(
  "compares Quickened Spell attack sequence public reducer route to copied qRoute",
  async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-sorcerer-metamagic.route.mbt.qnt",
      ),
      init: "init",
      step: "stepRouteBonusActionCastingTime",
      driver: createQuickenedSpellAttackSequenceRouteReplayDriver(),
      backend: "typescript",
      nTraces: 1,
      maxSteps: focusedMbtMaxSteps(1),
      stateCheck: reducerRoutedMetamagicStateCheck,
    });
  },
  MBT_TEST_TIMEOUT_MS,
);

function createQuickenedSpellAttackSequenceRouteReplayDriver() {
  return defineDriver(
    quickenedSpellAttackSequenceRouteReplayDriverSchema,
    () => {
      let route: readonly BattleReducerRouteEvent[] =
        observeQuickenedEldritchBlastInitialRoute();

      function reset(): void {
        route = observeQuickenedEldritchBlastInitialRoute();
      }

      function recordResolvedRoute(): void {
        route = observeQuickenedEldritchBlastRoute(sorcererMetamagicBattle());
      }

      reset();

      return {
        init: reset,
        doRouteBonusActionCastingTime: recordResolvedRoute,
        stepRouteBonusActionCastingTime: recordResolvedRoute,
        getState: (): QuickenedSpellAttackSequenceRouteReplayProjection => ({
          route,
        }),
      };
    },
  );
}

function observeQuickenedEldritchBlastInitialRoute() {
  return [battleReducerStartRouteEvent()] as const;
}
