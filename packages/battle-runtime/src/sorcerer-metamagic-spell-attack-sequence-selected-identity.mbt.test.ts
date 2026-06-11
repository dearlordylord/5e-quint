// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L3MMETA-07-QUICKENED-NEXT-PROCEDURE-SLICE sorcerer_metamagic
// UNIT-IDENTITY-MBT-REPLAY: L3MMETA-07-QUICKENED-NEXT-PROCEDURE-SLICE sorcerer_metamagic doResolveQuickenedSpellAttackSequence
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR
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
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import {
  projectBattleState,
  resolveQuickenedEldritchBlast,
  sorcererMetamagicBattle,
} from "./sorcerer-metamagic-selected-identity-support.ts";

defineSelectedIdentityWitness({
  describeLabel:
    "Sorcerer Metamagic spell attack sequence selected identity MBT",
  taskId: "L3MMETA-07-QUICKENED-NEXT-PROCEDURE-SLICE",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-sorcerer-metamagic-spell-attack-sequence-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "scenarioResult" },
  projectionSchema: {
    magicActionAvailable: "bool",
    bonusActionAvailable: "bool",
    sorceryPointsRemaining: "int",
    targetHp: "int",
    targetActiveEffectCount: "int",
    lastResult: "str",
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
          actionName: "doResolveQuickenedSpellAttackSequence",
          projectionAfter: {
            magicActionAvailable: true,
            bonusActionAvailable: false,
            sorceryPointsRemaining: 2,
            targetHp: 6,
            targetActiveEffectCount: 0,
            lastResult: "quickenedSpellAttackSequence",
          },
          discover: () =>
            projectBattleState(
              resolveQuickenedEldritchBlast(sorcererMetamagicBattle()),
              "quickenedSpellAttackSequence",
            ),
        },
      ],
    },
  ],
});
