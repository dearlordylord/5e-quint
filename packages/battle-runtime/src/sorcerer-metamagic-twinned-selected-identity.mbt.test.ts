// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L3META-07-TWINNED-SPELL-UPCAST-TARGETING sorcerer_metamagic
// UNIT-IDENTITY-MBT-REPLAY: L3META-07-TWINNED-SPELL-UPCAST-TARGETING sorcerer_metamagic doResolveTwinnedTargetCount
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.metamagic-effective-level-extra-target
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.METAMAGIC_TWINNED_EFFECTIVE_LEVEL_EXTRA_TARGET
// RAW trace:
// - .references/srd-5.2.1/Classes/Sorcerer.md, "Twinned Spell":
//   Twinned Spell costs 1 Sorcery Point and increases a spell's effective
//   level by 1 when higher-level casting can target an additional creature.
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md, "Bless":
//   Bless targets up to three creatures and targets one additional creature
//   for each slot level above level 1.
// - UBIQUITOUS_LANGUAGE.md: Spell Level, Cast Level, Spell Slot, Spell
//   Invocation, Sorcery Points as a Pool, and Spend.
import { it } from "vitest";

import {
  battleReducerStartRouteEvent,
  type BattleReducerRouteEvent,
} from "./index.ts";
import {
  defineDriver,
  focusedMbtMaxSteps,
  MBT_TEST_TIMEOUT_MS,
  mbtSpecPath,
  reducerRoutedMetamagicStateCheck,
  run,
} from "./battle-runtime-mbt-driver-kit.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import {
  observeTwinnedBlessRoute,
  projectBattleState,
  resolveTwinnedBless,
  twinnedSorcererMetamagicBattle,
} from "./sorcerer-metamagic-selected-identity-support.ts";

const twinnedMetamagicRouteReplayDriverSchema = {
  init: {},
  doRouteEffectiveSpellLevel: {},
  stepRouteEffectiveSpellLevel: {},
} as const;

type TwinnedMetamagicRouteReplayProjection = {
  readonly route: readonly BattleReducerRouteEvent[];
};

defineSelectedIdentityWitness({
  describeLabel: "Sorcerer Metamagic Twinned Spell selected identity MBT",
  taskId: "L3META-07-TWINNED-SPELL-UPCAST-TARGETING",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-sorcerer-metamagic-twinned-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "scenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: {
      Init: "init",
      TwinnedTargetCount: "twinnedTargetCount",
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
          actionName: "doResolveTwinnedTargetCount",
          projectionAfter: {
            magicActionAvailable: false,
            bonusActionAvailable: true,
            sorceryPointsRemaining: 3,
            targetHp: 10,
            targetActiveEffectCount: 1,
            lastResult: "twinnedTargetCount",
          },
          discover: () =>
            projectBattleState(
              resolveTwinnedBless(twinnedSorcererMetamagicBattle()),
              "twinnedTargetCount",
            ),
        },
      ],
    },
  ],
});

it(
  "compares Twinned Spell effective-level public reducer route to copied qRoute",
  async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-sorcerer-metamagic.route.mbt.qnt",
      ),
      init: "init",
      step: "stepRouteEffectiveSpellLevel",
      driver: createTwinnedMetamagicRouteReplayDriver(),
      backend: "typescript",
      nTraces: 1,
      maxSteps: focusedMbtMaxSteps(1),
      stateCheck: reducerRoutedMetamagicStateCheck,
    });
  },
  MBT_TEST_TIMEOUT_MS,
);

function createTwinnedMetamagicRouteReplayDriver() {
  return defineDriver(twinnedMetamagicRouteReplayDriverSchema, () => {
    let route: readonly BattleReducerRouteEvent[] =
      observeTwinnedBlessInitialRoute();

    function reset(): void {
      route = observeTwinnedBlessInitialRoute();
    }

    function recordResolvedRoute(): void {
      route = observeTwinnedBlessRoute(twinnedSorcererMetamagicBattle());
    }

    reset();

    return {
      init: reset,
      doRouteEffectiveSpellLevel: recordResolvedRoute,
      stepRouteEffectiveSpellLevel: recordResolvedRoute,
      getState: (): TwinnedMetamagicRouteReplayProjection => ({ route }),
    };
  });
}

function observeTwinnedBlessInitialRoute() {
  return [
    battleReducerStartRouteEvent(twinnedSorcererMetamagicBattle()),
  ] as const;
}
