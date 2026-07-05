import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";

import { shiningSmiteSelectedIdentityReplay } from "./shining-smite-selected-identity.replay-data.test-support.ts";

export const shiningSmiteSelectedIdentityQntReplay = {
  ...shiningSmiteSelectedIdentityReplay,
  specFile: mbtSpecPath(
      import.meta.dirname,
      "battle-runtime-shining-smite-selected-identity.mbt.qnt",
    ),
  quintStateField: "qState",
  quintFieldNames: { lastResult: "scenarioOutcome" },
  witnessProtocolField: "protocol",
  quintVariantFieldTags: {
      lastResult: {
        Init: "init",
        ShiningSmiteAfterHitDamageIllumination: "shiningSmiteAfterHitDamageIllumination",
      },
    },
  projectionSchema: { lastResult: "variant" },
} as const;
