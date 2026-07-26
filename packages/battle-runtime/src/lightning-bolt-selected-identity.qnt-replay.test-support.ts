import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.test-support.ts";

import { lightningBoltSelectedIdentityReplay } from "./lightning-bolt-selected-identity.replay-data.test-support.ts";

const LIGHTNING_BOLT_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG = {
  Init: "init",
  LightningBoltSaveGatedDamage: "lightningBoltSaveGatedDamage",
} as const satisfies Readonly<Record<string, string>>;

export const lightningBoltSelectedIdentityQntReplay = {
  ...lightningBoltSelectedIdentityReplay,
  units: lightningBoltSelectedIdentityReplay.units.map((unit) => ({
    unitId: unit.unitId,
    procedures: unit.procedures.map((procedure) => ({
      actionName: procedure.actionName,
      discover: procedure.discover,
    })),
  })),
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-lightning-bolt-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  witnessProtocolField: "protocol",
  quintVariantFieldTags: {
    lastResult: LIGHTNING_BOLT_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG,
  },
  projectionSchema: { lastResult: "variant" },
} as const;
