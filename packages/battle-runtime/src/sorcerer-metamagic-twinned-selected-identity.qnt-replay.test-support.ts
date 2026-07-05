import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";

import { sorcererMetamagicTwinnedSelectedIdentityReplay } from "./sorcerer-metamagic-twinned-selected-identity.replay-data.test-support.ts";

export const sorcererMetamagicTwinnedSelectedIdentityQntReplay = {
  ...sorcererMetamagicTwinnedSelectedIdentityReplay,
  specFile: mbtSpecPath(
      import.meta.dirname,
      "battle-runtime-sorcerer-metamagic-twinned-selected-identity.mbt.qnt",
    ),
  quintStateField: "qState",
  quintFieldNames: { lastResult: "scenarioOutcome" },
  witnessProtocolField: "protocol",
  quintVariantFieldTags: {
      lastResult: {
        Init: "init",
        TwinnedTargetCount: "twinnedTargetCount",
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
