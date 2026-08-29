// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3META-04-SORCERER-METAMAGIC-CAREFUL-SAVE-PROFILES sorcerer_metamagic
// UNIT-IDENTITY-REPLAY: L3META-04-SORCERER-METAMAGIC-CAREFUL-SAVE-PROFILES sorcerer_metamagic doResolveCarefulSaveGatedDamage doResolveCarefulSaveGatedNoEffect
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.metamagic-careful-save-protection
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.METAMAGIC_CAREFUL_SAVE_PROTECTION
// RAW trace:
// - .references/srd-5.2.1/Classes/Sorcerer.md#Level 2: Metamagic:
//   selected Metamagic options spend Sorcery Points from the shared pool.
// - .references/srd-5.2.1/Classes/Sorcerer.md#Careful Spell:
//   Careful Spell costs 1 Sorcery Point, chooses protected creatures up to the
//   caster's Charisma modifier minimum one, makes them succeed, and prevents
//   half damage on a successful save.
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Burning Hands:
//   Burning Hands is an action-cast Dexterity Saving Throw spell with half
//   damage on a successful save.
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Command:
//   Command is an action-cast Wisdom Saving Throw spell with no effect on a
//   successful save.
// - UBIQUITOUS_LANGUAGE.md: Magic Action, Spell Invocation, Saving Throw,
//   Sorcery Points as a Pool, and Spend.
import { expect, it } from "vitest";

import {
  defineDriver,
  focusedMbtMaxSteps,
  MBT_TEST_TIMEOUT_MS,
  mbtSpecPath,
  reducerRoutedMetamagicStateCheck,
  run,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";
import {
  battleReducerStartRouteEvent,
  type BattleReducerRouteEvent,
} from "./index.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.test-support.ts";
import {
  observeCarefulCommandNoEffectRoute,
  carefulSorcererMetamagicBattle,
  observeCarefulSavingThrowProtectionRoute,
  projectBattleState,
  resolveCarefulBurningHands,
  resolveCarefulCommand,
} from "./sorcerer-metamagic-selected-identity.test-support.ts";

const carefulMetamagicRouteReplayDriverSchema = {
  init: {},
  doRouteSavingThrowProtectionSaveGatedDamage: {},
  stepRouteSavingThrowProtectionSaveGatedDamage: {},
  doRouteSavingThrowProtectionNoEffect: {},
  stepRouteSavingThrowProtectionNoEffect: {},
} as const;

type CarefulMetamagicRouteReplayProjection = {
  readonly route: readonly BattleReducerRouteEvent[];
};

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Sorcerer Metamagic Careful Spell selected identity replay",
  taskId: "L3META-04-SORCERER-METAMAGIC-CAREFUL-SAVE-PROFILES",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-sorcerer-metamagic-careful-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "scenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: {
      Init: "init",
      CarefulSaveGatedDamage: "carefulSaveGatedDamage",
      CarefulSaveGatedNoEffect: "carefulSaveGatedNoEffect",
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
          actionName: "doResolveCarefulSaveGatedDamage",
          discover: () =>
            projectBattleState(
              resolveCarefulBurningHands(carefulSorcererMetamagicBattle()),
              "carefulSaveGatedDamage",
            ),
        },
        {
          actionName: "doResolveCarefulSaveGatedNoEffect",
          discover: () =>
            projectBattleState(
              resolveCarefulCommand(carefulSorcererMetamagicBattle()),
              "carefulSaveGatedNoEffect",
            ),
        },
      ],
    },
  ],
});

it(
  "compares Careful Spell save-gated damage public reducer route to copied qRoute",
  async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-sorcerer-metamagic.route.mbt.qnt",
      ),
      init: "init",
      step: "stepRouteSavingThrowProtectionSaveGatedDamage",
      driver: createCarefulMetamagicRouteReplayDriver(),
      backend: "typescript",
      nTraces: 1,
      maxSteps: focusedMbtMaxSteps(1),
      stateCheck: reducerRoutedMetamagicStateCheck,
    });
  },
  MBT_TEST_TIMEOUT_MS,
);

it(
  "compares Careful Command no-effect public reducer route to copied qRoute",
  async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-sorcerer-metamagic.route.mbt.qnt",
      ),
      init: "init",
      step: "stepRouteSavingThrowProtectionNoEffect",
      driver: createCarefulMetamagicRouteReplayDriver(),
      backend: "typescript",
      nTraces: 1,
      maxSteps: focusedMbtMaxSteps(1),
      stateCheck: reducerRoutedMetamagicStateCheck,
    });
  },
  MBT_TEST_TIMEOUT_MS,
);

function createCarefulMetamagicRouteReplayDriver() {
  return defineDriver(carefulMetamagicRouteReplayDriverSchema, () => {
    let route: readonly BattleReducerRouteEvent[] =
      observeCarefulMetamagicInitialRoute();

    function reset(): void {
      route = observeCarefulMetamagicInitialRoute();
    }

    function recordSaveGatedDamageRoute(): void {
      route = observeCarefulSavingThrowProtectionRoute(
        carefulSorcererMetamagicBattle(),
      );
    }

    function recordNoEffectRoute(): void {
      route = observeCarefulCommandNoEffectRoute(
        carefulSorcererMetamagicBattle(),
      );
    }

    reset();

    return {
      init: reset,
      doRouteSavingThrowProtectionSaveGatedDamage: recordSaveGatedDamageRoute,
      stepRouteSavingThrowProtectionSaveGatedDamage: recordSaveGatedDamageRoute,
      doRouteSavingThrowProtectionNoEffect: recordNoEffectRoute,
      stepRouteSavingThrowProtectionNoEffect: recordNoEffectRoute,
      getState: (): CarefulMetamagicRouteReplayProjection => ({ route }),
    };
  });
}

function observeCarefulMetamagicInitialRoute() {
  return [battleReducerStartRouteEvent()] as const;
}

it("observes Careful Spell save-protection route through public reducer entrypoints", () => {
  expect(
    observeCarefulSavingThrowProtectionRoute(carefulSorcererMetamagicBattle()),
  ).toEqual([
    { kind: "startBattle", owner: "battleActionEconomy" },
    {
      kind: "discoverBattleActs",
      subject: "metamagicSavingThrowProtection",
      holes: ["spellTargetList"],
      owner: "battleFeatureResource",
    },
    {
      kind: "resolveBattleSubject",
      subject: "metamagicSavingThrowProtection",
      fill: "spellTargetList",
      holes: ["savingThrowOutcome"],
      owner: "battleFeatureResource",
    },
    {
      kind: "resolveBattleSubject",
      subject: "metamagicSavingThrowProtection",
      fill: "savingThrowOutcome",
      holes: ["rolledDice"],
      owner: "battleSavingThrowOutcome",
    },
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "metamagicSavingThrowProtection",
      holes: ["rolledDice"],
      owner: "battleDamageAdjustment",
    },
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "metamagicSavingThrowProtection",
      holes: [],
      owner: "battleFeatureResource",
    },
  ]);
});

it("observes Careful Command no-effect route through public reducer entrypoints", () => {
  expect(
    observeCarefulCommandNoEffectRoute(carefulSorcererMetamagicBattle()),
  ).toEqual([
    { kind: "startBattle", owner: "battleActionEconomy" },
    {
      kind: "discoverBattleActs",
      subject: "compelledBehaviorEffect",
      holes: ["compelledBehaviorOptionChoice", "spellTargetList"],
      owner: "battleSpellSlotAndActionEconomy",
    },
    {
      kind: "resolveBattleSubject",
      subject: "compelledBehaviorEffect",
      fill: "compelledBehaviorOptionChoice",
      holes: ["savingThrowOutcome"],
      owner: "battleHoleFrontier",
    },
    {
      kind: "resolveBattleSubject",
      subject: "compelledBehaviorEffect",
      fill: "savingThrowOutcome",
      holes: [],
      owner: "battleActiveEffect",
    },
  ]);
});
