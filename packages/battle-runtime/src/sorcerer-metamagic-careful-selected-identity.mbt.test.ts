// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L3META-04-SORCERER-METAMAGIC-CAREFUL-SAVE-PROFILES sorcerer_metamagic
// UNIT-IDENTITY-MBT-REPLAY: L3META-04-SORCERER-METAMAGIC-CAREFUL-SAVE-PROFILES sorcerer_metamagic doResolveCarefulSaveGatedDamage doResolveCarefulSaveGatedNoEffect
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

import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import {
  observeCarefulCommandNoEffectRoute,
  carefulSorcererMetamagicBattle,
  observeCarefulSavingThrowProtectionRoute,
  projectBattleState,
  resolveCarefulBurningHands,
  resolveCarefulCommand,
} from "./sorcerer-metamagic-selected-identity-support.ts";

defineSelectedIdentityWitness({
  describeLabel: "Sorcerer Metamagic Careful Spell selected identity MBT",
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
          projectionAfter: {
            magicActionAvailable: false,
            bonusActionAvailable: true,
            sorceryPointsRemaining: 3,
            targetHp: 10,
            targetActiveEffectCount: 0,
            lastResult: "carefulSaveGatedDamage",
          },
          discover: () =>
            projectBattleState(
              resolveCarefulBurningHands(carefulSorcererMetamagicBattle()),
              "carefulSaveGatedDamage",
            ),
        },
        {
          actionName: "doResolveCarefulSaveGatedNoEffect",
          projectionAfter: {
            magicActionAvailable: false,
            bonusActionAvailable: true,
            sorceryPointsRemaining: 3,
            targetHp: 10,
            targetActiveEffectCount: 0,
            lastResult: "carefulSaveGatedNoEffect",
          },
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
      subject: "commandEffect",
      holes: ["commandOptionChoice", "spellTargetList"],
      owner: "battleSpellSlotAndActionEconomy",
    },
    {
      kind: "resolveBattleSubject",
      subject: "commandEffect",
      fill: "commandOptionChoice",
      holes: ["savingThrowOutcome"],
      owner: "battleHoleFrontier",
    },
    {
      kind: "resolveBattleSubject",
      subject: "commandEffect",
      fill: "savingThrowOutcome",
      holes: [],
      owner: "battleActiveEffect",
    },
  ]);
});
