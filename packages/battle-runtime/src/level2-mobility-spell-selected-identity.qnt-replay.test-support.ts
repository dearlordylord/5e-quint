import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";

import { level2MobilitySpellSelectedIdentityReplay } from "./level2-mobility-spell-selected-identity.replay-data.test-support.ts";

const LEVEL2_MOBILITY_SPELL_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG = {
  Init: "init",
  AlterSelfTransformationMode: "alterSelfTransformationMode",
  FlySpeedGrant: "flySpeedGrant",
  MistyStepSelfTeleport: "mistyStepSelfTeleport",
  SpiderClimbSpeedGrant: "spiderClimbSpeedGrant",
} as const satisfies Readonly<Record<string, string>>;

export const level2MobilitySpellSelectedIdentityQntReplay = {
  ...level2MobilitySpellSelectedIdentityReplay,
  specFile: mbtSpecPath(
      import.meta.dirname,
      "battle-runtime-level2-mobility-spell-selected-identity.mbt.qnt",
    ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  witnessProtocolField: "protocol",
  quintVariantFieldTags: {
      lastResult: LEVEL2_MOBILITY_SPELL_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG,
    },
  projectionSchema: { lastResult: "variant" },
} as const;
