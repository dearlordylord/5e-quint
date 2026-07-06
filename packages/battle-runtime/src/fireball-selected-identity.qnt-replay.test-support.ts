import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";

import { fireballSelectedIdentityReplay } from "./fireball-selected-identity.replay-data.test-support.ts";

const FIREBALL_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG = {
  Init: "init",
  FireballSaveGatedDamage: "fireballSaveGatedDamage",
} as const satisfies Readonly<Record<string, string>>;

export const fireballSelectedIdentityQntReplay = {
  ...fireballSelectedIdentityReplay,
  units: fireballSelectedIdentityReplay.units.map((unit) => ({
    unitId: unit.unitId,
    procedures: unit.procedures.map((procedure) => ({
      actionName: procedure.actionName,
      discover: procedure.discover,
    })),
  })),
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-fireball-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  witnessProtocolField: "protocol",
  quintVariantFieldTags: {
    lastResult: FIREBALL_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG,
  },
  projectionSchema: { lastResult: "variant" },
} as const;
