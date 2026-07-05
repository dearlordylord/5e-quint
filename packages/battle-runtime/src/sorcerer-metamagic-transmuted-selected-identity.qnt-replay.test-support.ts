import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";

import { sorcererMetamagicTransmutedSelectedIdentityReplay } from "./sorcerer-metamagic-transmuted-selected-identity.replay-data.test-support.ts";

export const sorcererMetamagicTransmutedSelectedIdentityQntReplay = {
  ...sorcererMetamagicTransmutedSelectedIdentityReplay,
  specFile: mbtSpecPath(
      import.meta.dirname,
      "battle-runtime-sorcerer-metamagic-transmuted-selected-identity.mbt.qnt",
    ),
  quintStateField: "qState",
  quintFieldNames: { lastResult: "scenarioOutcome" },
  witnessProtocolField: "protocol",
  quintVariantFieldTags: {
      lastResult: {
        Init: "init",
        TransmutedSaveGatedDamage: "transmutedSaveGatedDamage",
        TransmutedSpellAttack: "transmutedSpellAttack",
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
