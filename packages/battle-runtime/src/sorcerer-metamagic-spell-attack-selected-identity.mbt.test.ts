// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L3META-02-SORCERER-METAMAGIC-QUICKENED-SPELL-ATTACKS sorcerer_metamagic
// UNIT-IDENTITY-MBT-REPLAY: L3META-02-SORCERER-METAMAGIC-QUICKENED-SPELL-ATTACKS sorcerer_metamagic doResolveQuickenedSpellAttack
// RAW trace:
// - .references/srd-5.2.1/Classes/Sorcerer.md#Level 2: Metamagic:
//   selected Metamagic options spend Sorcery Points from the shared pool.
// - .references/srd-5.2.1/Classes/Sorcerer.md#Quickened Spell:
//   Quickened Spell costs 2 Sorcery Points and changes an action casting time
//   to a Bonus Action for that casting.
// - .references/srd-5.2.1/Spells/Descriptions-Q-R.md#Ray of Frost:
//   Ray of Frost is an action-cast ranged Spell Attack cantrip.
// - UBIQUITOUS_LANGUAGE.md: Magic Action, Bonus Action, Spell Invocation,
//   Attack Roll, Damage Roll, Sorcery Points as a Pool, and Spend.
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import {
  projectBattleState,
  resolveQuickenedRayOfFrost,
  sorcererMetamagicBattle,
} from "./sorcerer-metamagic-selected-identity-support.ts";

defineSelectedIdentityWitness({
  describeLabel: "Sorcerer Metamagic spell attack selected identity MBT",
  taskId: "L3META-02-SORCERER-METAMAGIC-QUICKENED-SPELL-ATTACKS",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-sorcerer-metamagic-spell-attack-selected-identity.mbt.qnt",
  ),
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
