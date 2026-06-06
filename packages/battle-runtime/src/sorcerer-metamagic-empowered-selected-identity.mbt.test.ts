// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L3MMETA-19-EMPOWERED-SPELL-DAMAGE-REROLL-SLICE sorcerer_metamagic
// UNIT-IDENTITY-MBT-REPLAY: L3MMETA-19-EMPOWERED-SPELL-DAMAGE-REROLL-SLICE sorcerer_metamagic doResolveEmpoweredSpellDamageReroll
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.metamagic-damage-dice-reroll
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.METAMAGIC_EMPOWERED_DAMAGE_DICE_REROLL
// RAW trace:
// - .references/srd-5.2.1/Classes/Sorcerer.md#Level 2: Metamagic:
//   selected Metamagic options spend Sorcery Points from the shared pool.
// - .references/srd-5.2.1/Classes/Sorcerer.md#Empowered Spell:
//   when rolling spell damage, spend 1 Sorcery Point to reroll damage dice up
//   to the Charisma modifier minimum-one limit, use the new rolls, and combine
//   with a different Metamagic option.
// - .references/srd-5.2.1/Spells/Descriptions-Q-R.md#Ray of Frost:
//   Ray of Frost is an action-cast ranged Spell Attack cantrip that deals
//   2d8 Cold damage at level 5.
// - UBIQUITOUS_LANGUAGE.md: Magic Action, Spell Invocation, Damage Roll,
//   Sorcery Points as a Pool, and Spend.
import * as path from "node:path";

import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import {
  empoweredSorcererMetamagicBattle,
  projectBattleState,
  resolveEmpoweredRayOfFrost,
} from "./sorcerer-metamagic-selected-identity-support.ts";

defineSelectedIdentityWitness({
  describeLabel: "Sorcerer Metamagic Empowered Spell selected identity MBT",
  taskId: "L3MMETA-19-EMPOWERED-SPELL-DAMAGE-REROLL-SLICE",
  specFile: path.resolve(
    import.meta.dirname,
    "../battle-runtime-sorcerer-metamagic-empowered-selected-identity.mbt.qnt",
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
          actionName: "doResolveEmpoweredSpellDamageReroll",
          projectionAfter: {
            magicActionAvailable: false,
            bonusActionAvailable: true,
            sorceryPointsRemaining: 3,
            targetHp: 1,
            targetActiveEffectCount: 1,
            lastResult: "empoweredSpellDamageReroll",
          },
          discover: () =>
            projectBattleState(
              resolveEmpoweredRayOfFrost(empoweredSorcererMetamagicBattle()),
              "empoweredSpellDamageReroll",
            ),
        },
      ],
    },
  ],
});
