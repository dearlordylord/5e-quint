import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";

import { sorcererMetamagicSpellAttackSequenceSelectedIdentityReplay } from "./sorcerer-metamagic-spell-attack-sequence-selected-identity.replay-data.test-support.ts";

export const sorcererMetamagicSpellAttackSequenceSelectedIdentityQntReplay = {
  ...sorcererMetamagicSpellAttackSequenceSelectedIdentityReplay,
  specFile: mbtSpecPath(
      import.meta.dirname,
      "battle-runtime-sorcerer-metamagic-spell-attack-sequence-selected-identity.mbt.qnt",
    ),
  quintStateField: "qState",
  quintFieldNames: { lastResult: "scenarioOutcome" },
  witnessProtocolField: "protocol",
  quintVariantFieldTags: {
      lastResult: {
        Init: "init",
        QuickenedSpellAttackSequence: "quickenedSpellAttackSequence",
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
} as const;
