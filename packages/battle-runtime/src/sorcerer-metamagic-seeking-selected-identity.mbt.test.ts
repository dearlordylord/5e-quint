// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L3MMETA-18-SEEKING-SPELL-ATTACK-REROLL-SLICE sorcerer_metamagic
// UNIT-IDENTITY-MBT-REPLAY: L3MMETA-18-SEEKING-SPELL-ATTACK-REROLL-SLICE sorcerer_metamagic doResolveSeekingSpellAttackReroll
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.metamagic-missed-spell-attack-reroll
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.METAMAGIC_SEEKING_SPELL_ATTACK_REROLL
// RAW trace:
// - .references/srd-5.2.1/Classes/Sorcerer.md#Level 2: Metamagic:
//   selected Metamagic options spend Sorcery Points from the shared pool.
// - .references/srd-5.2.1/Classes/Sorcerer.md#Seeking Spell:
//   after a missed spell attack, spend 1 Sorcery Point to reroll the d20 and
//   use the new roll, even when another different Metamagic option was used.
// - .references/srd-5.2.1/Spells/Descriptions-Q-R.md#Ray of Frost:
//   Ray of Frost is an action-cast ranged Spell Attack cantrip.
// - UBIQUITOUS_LANGUAGE.md: Magic Action, Spell Invocation, Attack Roll,
//   Damage Roll, Sorcery Points as a Pool, and Spend.
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import {
  projectBattleState,
  resolveSeekingRayOfFrost,
  seekingSorcererMetamagicBattle,
} from "./sorcerer-metamagic-selected-identity-support.ts";

defineSelectedIdentityWitness({
  describeLabel: "Sorcerer Metamagic Seeking Spell selected identity MBT",
  taskId: "L3MMETA-18-SEEKING-SPELL-ATTACK-REROLL-SLICE",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-sorcerer-metamagic-seeking-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "scenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: {
      Init: "init",
      SeekingSpellAttackReroll: "seekingSpellAttackReroll",
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
          actionName: "doResolveSeekingSpellAttackReroll",
          projectionAfter: {
            magicActionAvailable: false,
            bonusActionAvailable: true,
            sorceryPointsRemaining: 3,
            targetHp: 3,
            targetActiveEffectCount: 1,
            lastResult: "seekingSpellAttackReroll",
          },
          discover: () =>
            projectBattleState(
              resolveSeekingRayOfFrost(seekingSorcererMetamagicBattle()),
              "seekingSpellAttackReroll",
            ),
        },
      ],
    },
  ],
});
