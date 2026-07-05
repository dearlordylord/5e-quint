// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L3META-05-HEIGHTENED-SPELL-SAVE-PROFILES sorcerer_metamagic
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L3MMETA-22-HEIGHTENED-SAVE-GATED-CONDITION-MULTITARGET-REPEAT-SAVE-SLICE sorcerer_metamagic
// UNIT-IDENTITY-MBT-REPLAY: L3META-05-HEIGHTENED-SPELL-SAVE-PROFILES sorcerer_metamagic doResolveHeightenedSaveGatedDamage doResolveHeightenedHideousLaughter doResolveHeightenedGreaseEntrySave doResolveHeightenedGustOfWindEndTurnSave doResolveHeightenedSaveGatedConditionEndTurnSave
// UNIT-IDENTITY-MBT-REPLAY: L3MMETA-22-HEIGHTENED-SAVE-GATED-CONDITION-MULTITARGET-REPEAT-SAVE-SLICE sorcerer_metamagic doResolveHeightenedSaveGatedConditionEndTurnSave
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.metamagic-heightened-save-disadvantage
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.METAMAGIC_HEIGHTENED_SAVE_DISADVANTAGE
// RAW trace:
// - .references/srd-5.2.1/Classes/Sorcerer.md#Level 2: Metamagic:
//   selected Metamagic options spend Sorcery Points from the shared pool.
// - .references/srd-5.2.1/Classes/Sorcerer.md#Heightened Spell:
//   Heightened Spell costs 2 Sorcery Points and gives one target of the spell
//   Disadvantage on saves against the spell.
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Burning Hands:
//   Burning Hands is an action-cast Dexterity Saving Throw spell with half
//   damage on a successful save.
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Hideous Laughter:
//   Hideous Laughter applies failed-save conditions and repeats Wisdom Saving
//   Throws against the spell.
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Grease:
//   Grease creates a ground hazard with entry and end-turn Dexterity Saving
//   Throws against the spell.
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Gust of Wind:
//   Gust of Wind creates a Line with end-turn Strength Saving Throws against
//   the spell.
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Blindness/Deafness:
//   Blindness/Deafness repeats the selected condition's Saving Throw at the
//   end of each target's turns.
// - UBIQUITOUS_LANGUAGE.md: Magic Action, Spell Invocation, Saving Throw,
//   Disadvantage, Sorcery Points as a Pool, and Spend.
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
  heightenedSorcererMetamagicBattle,
  observeHeightenedHideousLaughterRoute,
  projectBattleState,
  resolveHeightenedBurningHands,
  resolveHeightenedGreaseEntrySave,
  resolveHeightenedGustOfWindEndTurnSave,
  resolveHeightenedHideousLaughter,
  resolveHeightenedSaveGatedConditionEndTurnSave,
} from "./sorcerer-metamagic-selected-identity-support.ts";

const heightenedMetamagicRouteReplayDriverSchema = {
  init: {},
  doRouteSavingThrowRollMode: {},
  stepRouteSavingThrowRollMode: {},
} as const;

type HeightenedMetamagicRouteReplayProjection = {
  readonly route: readonly BattleReducerRouteEvent[];
};

defineSelectedIdentityWitness({
  describeLabel: "Sorcerer Metamagic Heightened Spell selected identity MBT",
  taskId: "L3META-05-HEIGHTENED-SPELL-SAVE-PROFILES",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-sorcerer-metamagic-heightened-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "scenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: {
      Init: "init",
      HeightenedSaveGatedDamage: "heightenedSaveGatedDamage",
      HeightenedHideousLaughter: "heightenedHideousLaughter",
      HeightenedGreaseEntrySave: "heightenedGreaseEntrySave",
      HeightenedGustOfWindEndTurnSave: "heightenedGustOfWindEndTurnSave",
      HeightenedSaveGatedConditionEndTurnSave: "heightenedSaveGatedConditionEndTurnSave",
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
          actionName: "doResolveHeightenedSaveGatedDamage",
          projectionAfter: {
            magicActionAvailable: false,
            bonusActionAvailable: true,
            sorceryPointsRemaining: 2,
            targetHp: 1,
            targetActiveEffectCount: 0,
            lastResult: "heightenedSaveGatedDamage",
          },
          discover: () =>
            projectBattleState(
              resolveHeightenedBurningHands(
                heightenedSorcererMetamagicBattle(),
              ),
              "heightenedSaveGatedDamage",
            ),
        },
        {
          actionName: "doResolveHeightenedHideousLaughter",
          projectionAfter: {
            magicActionAvailable: false,
            bonusActionAvailable: true,
            sorceryPointsRemaining: 2,
            targetHp: 10,
            targetActiveEffectCount: 1,
            lastResult: "heightenedHideousLaughter",
          },
          discover: () =>
            projectBattleState(
              resolveHeightenedHideousLaughter(
                heightenedSorcererMetamagicBattle(),
              ),
              "heightenedHideousLaughter",
            ),
        },
        {
          actionName: "doResolveHeightenedGreaseEntrySave",
          projectionAfter: {
            magicActionAvailable: true,
            bonusActionAvailable: true,
            sorceryPointsRemaining: 2,
            targetHp: 10,
            targetActiveEffectCount: 0,
            lastResult: "heightenedGreaseEntrySave",
          },
          discover: () =>
            projectBattleState(
              resolveHeightenedGreaseEntrySave(
                heightenedSorcererMetamagicBattle(),
              ),
              "heightenedGreaseEntrySave",
            ),
        },
        {
          actionName: "doResolveHeightenedGustOfWindEndTurnSave",
          projectionAfter: {
            magicActionAvailable: true,
            bonusActionAvailable: true,
            sorceryPointsRemaining: 2,
            targetHp: 10,
            targetActiveEffectCount: 0,
            lastResult: "heightenedGustOfWindEndTurnSave",
          },
          discover: () =>
            projectBattleState(
              resolveHeightenedGustOfWindEndTurnSave(
                heightenedSorcererMetamagicBattle(),
              ),
              "heightenedGustOfWindEndTurnSave",
            ),
        },
        {
          actionName: "doResolveHeightenedSaveGatedConditionEndTurnSave",
          projectionAfter: {
            magicActionAvailable: true,
            bonusActionAvailable: true,
            sorceryPointsRemaining: 2,
            targetHp: 10,
            targetActiveEffectCount: 0,
            lastResult: "heightenedSaveGatedConditionEndTurnSave",
          },
          discover: () =>
            projectBattleState(
              resolveHeightenedSaveGatedConditionEndTurnSave(
                heightenedSorcererMetamagicBattle(),
              ),
              "heightenedSaveGatedConditionEndTurnSave",
            ),
        },
      ],
    },
  ],
});

it(
  "compares Heightened Spell saving-throw roll-mode public reducer route to copied qRoute",
  async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-sorcerer-metamagic.route.mbt.qnt",
      ),
      init: "init",
      step: "stepRouteSavingThrowRollMode",
      driver: createHeightenedMetamagicRouteReplayDriver(),
      backend: "typescript",
      nTraces: 1,
      maxSteps: focusedMbtMaxSteps(1),
      stateCheck: reducerRoutedMetamagicStateCheck,
    });
  },
  MBT_TEST_TIMEOUT_MS,
);

function createHeightenedMetamagicRouteReplayDriver() {
  return defineDriver(heightenedMetamagicRouteReplayDriverSchema, () => {
    let route: readonly BattleReducerRouteEvent[] =
      observeHeightenedHideousLaughterInitialRoute();

    function reset(): void {
      route = observeHeightenedHideousLaughterInitialRoute();
    }

    function recordResolvedRoute(): void {
      route = observeHeightenedHideousLaughterRoute(
        heightenedSorcererMetamagicBattle(),
      );
    }

    reset();

    return {
      init: reset,
      doRouteSavingThrowRollMode: recordResolvedRoute,
      stepRouteSavingThrowRollMode: recordResolvedRoute,
      getState: (): HeightenedMetamagicRouteReplayProjection => ({ route }),
    };
  });
}

function observeHeightenedHideousLaughterInitialRoute() {
  return [battleReducerStartRouteEvent(heightenedSorcererMetamagicBattle())];
}
