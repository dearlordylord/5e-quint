// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L3META-01-SORCERER-METAMAGIC-QUICKENED-SAVE-DAMAGE sorcerer_metamagic
// UNIT-IDENTITY-MBT-REPLAY: L3META-01-SORCERER-METAMAGIC-QUICKENED-SAVE-DAMAGE sorcerer_metamagic doResolveQuickenedSaveGatedDamage
// RAW trace:
// - .references/srd-5.2.1/Classes/Sorcerer.md#Level 2: Metamagic:
//   selected Metamagic options spend Sorcery Points from the shared pool.
// - .references/srd-5.2.1/Classes/Sorcerer.md#Quickened Spell:
//   Quickened Spell costs 2 Sorcery Points and changes an action casting time
//   to a Bonus Action for that casting.
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Burning Hands:
//   Burning Hands is an action-cast Dexterity Saving Throw damage spell.
// - UBIQUITOUS_LANGUAGE.md: Magic Action, Bonus Action, Spell Invocation,
//   Saving Throw, Sorcery Points as a Pool, and Spend.
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import {
  projectBattleState,
  resolveQuickenedBurningHands,
  sorcererMetamagicBattle,
} from "./sorcerer-metamagic-selected-identity-support.ts";

defineSelectedIdentityWitness({
  describeLabel: "Sorcerer Metamagic selected identity MBT",
  taskId: "L3META-01-SORCERER-METAMAGIC-QUICKENED-SAVE-DAMAGE",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-sorcerer-metamagic-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "scenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: {
      Init: "init",
      QuickenedSaveGatedDamage: "quickenedSaveGatedDamage",
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
          actionName: "doResolveQuickenedSaveGatedDamage",
          projectionAfter: {
            magicActionAvailable: true,
            bonusActionAvailable: false,
            sorceryPointsRemaining: 2,
            targetHp: 1,
            targetActiveEffectCount: 0,
            lastResult: "quickenedSaveGatedDamage",
          },
          discover: () =>
            projectBattleState(
              resolveQuickenedBurningHands(sorcererMetamagicBattle()),
              "quickenedSaveGatedDamage",
            ),
        },
      ],
    },
  ],
});
