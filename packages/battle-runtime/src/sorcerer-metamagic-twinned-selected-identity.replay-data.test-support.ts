// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.metamagic-effective-level-extra-target
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.METAMAGIC_TWINNED_EFFECTIVE_LEVEL_EXTRA_TARGET
// RAW trace:
// - .references/srd-5.2.1/Classes/Sorcerer.md, "Twinned Spell":
//   Twinned Spell costs 1 Sorcery Point and increases a spell's effective
//   level by 1 when higher-level casting can target an additional creature.
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md, "Bless":
//   Bless targets up to three creatures and targets one additional creature
//   for each slot level above level 1.
// - UBIQUITOUS_LANGUAGE.md: Spell Level, Cast Level, Spell Slot, Spell
//   Invocation, Sorcery Points as a Pool, and Spend.
import {
  projectBattleState,
  resolveTwinnedBless,
  twinnedSorcererMetamagicBattle,
} from "./sorcerer-metamagic-selected-identity-support.ts";
import type { SelectedIdentityReplayWitness } from "./selected-identity-witness.ts";

export const sorcererMetamagicTwinnedSelectedIdentityReplay = {
  describeLabel: "Sorcerer Metamagic Twinned Spell selected identity replay",
  taskId: "L3META-07-TWINNED-SPELL-UPCAST-TARGETING",
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
            actionName: "doResolveTwinnedTargetCount",
            projectionAfter: {
              magicActionAvailable: false,
              bonusActionAvailable: true,
              sorceryPointsRemaining: 3,
              targetHp: 10,
              targetActiveEffectCount: 1,
              lastResult: "twinnedTargetCount",
            },
            discover: () =>
              projectBattleState(
                resolveTwinnedBless(twinnedSorcererMetamagicBattle()),
                "twinnedTargetCount",
              ),
          },
        ],
      },
    ],
} satisfies SelectedIdentityReplayWitness<Readonly<Record<string, unknown>>>;
