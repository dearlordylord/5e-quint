import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.test-support.ts";

import { shiningSmiteSelectedIdentityReplay } from "./shining-smite-selected-identity.replay-data.test-support.ts";

export const shiningSmiteSelectedIdentityQntReplay = {
  ...shiningSmiteSelectedIdentityReplay,
  units: shiningSmiteSelectedIdentityReplay.units.map((unit) => ({
    unitId: unit.unitId,
    procedures: unit.procedures.map((procedure) => ({
      actionName: procedure.actionName,
      discover: procedure.discover,
    })),
  })),
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
      ShiningSmiteAfterHitDamageIllumination:
        "shiningSmiteAfterHitDamageIllumination",
    },
  },
  projectionSchema: { lastResult: "variant" },
} as const;
