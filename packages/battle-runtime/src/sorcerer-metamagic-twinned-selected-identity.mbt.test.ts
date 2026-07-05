// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.metamagic-effective-level-extra-target
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.METAMAGIC_TWINNED_EFFECTIVE_LEVEL_EXTRA_TARGET
// UNIT-IDENTITY-QNT-REPLAY: L3META-07-TWINNED-SPELL-UPCAST-TARGETING sorcerer_metamagic doResolveTwinnedTargetCount
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
  observeTwinnedBlessRoute,
  twinnedSorcererMetamagicBattle,
} from "./sorcerer-metamagic-selected-identity-support.ts";
import { sorcererMetamagicTwinnedSelectedIdentityQntReplay } from "./sorcerer-metamagic-twinned-selected-identity.qnt-replay.test-support.ts";

const twinnedMetamagicRouteReplayDriverSchema = {
  init: {},
  doRouteEffectiveSpellLevel: {},
  stepRouteEffectiveSpellLevel: {},
} as const;

type TwinnedMetamagicRouteReplayProjection = {
  readonly route: readonly BattleReducerRouteEvent[];
};

defineSelectedIdentityQntReplay(
  sorcererMetamagicTwinnedSelectedIdentityQntReplay,
);

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
  return [battleReducerStartRouteEvent()] as const;
}
