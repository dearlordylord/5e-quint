// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.metamagic-damage-type-substitution
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.METAMAGIC_TRANSMUTED_DAMAGE_TYPE_SUBSTITUTION
// UNIT-IDENTITY-QNT-REPLAY: L3META-06-TRANSMUTED-SPELL-DAMAGE-TYPE sorcerer_metamagic doResolveTransmutedSaveGatedDamage doResolveTransmutedSpellAttack
// RAW trace:
// - .references/srd-5.2.1/Classes/Sorcerer.md#Level 2: Metamagic:
//   selected Metamagic options spend Sorcery Points from the shared pool.
// - .references/srd-5.2.1/Classes/Sorcerer.md#Transmuted Spell:
//   Transmuted Spell costs 1 Sorcery Point and changes Acid, Cold, Fire,
//   Lightning, Poison, or Thunder spell damage to another type from that list.
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Burning Hands:
//   Burning Hands is an action-cast Dexterity Saving Throw Fire damage spell.
// - .references/srd-5.2.1/Spells/Descriptions-Q-R.md#Ray of Frost:
//   Ray of Frost is an action-cast ranged Spell Attack Cold damage cantrip.
// - UBIQUITOUS_LANGUAGE.md: Magic Action, Spell Invocation, Damage,
//   Damage Type, Sorcery Points as a Pool, and Spend.
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
  observeTransmutedBurningHandsToPoisonRoute,
  transmutedSorcererMetamagicBattle,
} from "./sorcerer-metamagic-selected-identity-support.ts";
import { sorcererMetamagicTransmutedSelectedIdentityQntReplay } from "./sorcerer-metamagic-transmuted-selected-identity.qnt-replay.test-support.ts";

const transmutedMetamagicRouteReplayDriverSchema = {
  init: {},
  doRouteDamageTypeSubstitution: {},
  stepRouteDamageTypeSubstitution: {},
} as const;

type TransmutedMetamagicRouteReplayProjection = {
  readonly route: readonly BattleReducerRouteEvent[];
};

defineSelectedIdentityQntReplay(
  sorcererMetamagicTransmutedSelectedIdentityQntReplay,
);

it(
  "compares Transmuted Spell damage-type substitution public reducer route to copied qRoute",
  async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-sorcerer-metamagic.route.mbt.qnt",
      ),
      init: "init",
      step: "stepRouteDamageTypeSubstitution",
      driver: createTransmutedMetamagicRouteReplayDriver(),
      backend: "typescript",
      nTraces: 1,
      maxSteps: focusedMbtMaxSteps(1),
      stateCheck: reducerRoutedMetamagicStateCheck,
    });
  },
  MBT_TEST_TIMEOUT_MS,
);

function createTransmutedMetamagicRouteReplayDriver() {
  return defineDriver(transmutedMetamagicRouteReplayDriverSchema, () => {
    let route: readonly BattleReducerRouteEvent[] =
      observeTransmutedBurningHandsInitialRoute();

    function reset(): void {
      route = observeTransmutedBurningHandsInitialRoute();
    }

    function recordResolvedRoute(): void {
      route = observeTransmutedBurningHandsToPoisonRoute(
        transmutedSorcererMetamagicBattle(),
      );
    }

    reset();

    return {
      init: reset,
      doRouteDamageTypeSubstitution: recordResolvedRoute,
      stepRouteDamageTypeSubstitution: recordResolvedRoute,
      getState: (): TransmutedMetamagicRouteReplayProjection => ({ route }),
    };
  });
}

function observeTransmutedBurningHandsInitialRoute() {
  return [battleReducerStartRouteEvent()] as const;
}
