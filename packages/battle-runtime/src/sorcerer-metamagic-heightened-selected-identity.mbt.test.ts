// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L3META-05-HEIGHTENED-SPELL-SAVE-PROFILES sorcerer_metamagic
// UNIT-IDENTITY-MBT-REPLAY: L3META-05-HEIGHTENED-SPELL-SAVE-PROFILES sorcerer_metamagic doResolveHeightenedSaveGatedDamage
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.metamagic-heightened-save-disadvantage
// RAW trace:
// - .references/srd-5.2.1/Classes/Sorcerer.md#Level 2: Metamagic:
//   selected Metamagic options spend Sorcery Points from the shared pool.
// - .references/srd-5.2.1/Classes/Sorcerer.md#Heightened Spell:
//   Heightened Spell costs 2 Sorcery Points and gives one target of the spell
//   Disadvantage on saves against the spell.
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Burning Hands:
//   Burning Hands is an action-cast Dexterity Saving Throw spell with half
//   damage on a successful save.
// - UBIQUITOUS_LANGUAGE.md: Magic Action, Spell Invocation, Saving Throw,
//   Disadvantage, Sorcery Points as a Pool, and Spend.
import * as path from "node:path";

import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import {
  heightenedSorcererMetamagicBattle,
  projectBattleState,
  resolveHeightenedBurningHands,
} from "./sorcerer-metamagic-selected-identity-support.ts";

defineSelectedIdentityWitness({
  describeLabel: "Sorcerer Metamagic Heightened Spell selected identity MBT",
  taskId: "L3META-05-HEIGHTENED-SPELL-SAVE-PROFILES",
  specFile: path.resolve(
    import.meta.dirname,
    "../battle-runtime-sorcerer-metamagic-heightened-selected-identity.mbt.qnt",
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
      ],
    },
  ],
});
