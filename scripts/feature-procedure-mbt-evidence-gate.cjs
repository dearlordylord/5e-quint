const {
  buildProcedureMbtEvidenceGate,
  renderProcedureMbtEvidenceGate,
} = require("./procedure-mbt-evidence-gate.cjs");

const featureProcedureProfileIdPrefix = "unit-feature.";
const metricNames = {
  supportedUnits: "supportedFeatureUnits",
  procedureProfiles: "featureProcedureProfiles",
};

function buildFeatureProcedureMbtEvidenceGate({
  level1FullSupport,
  level12FullSupport,
  rulesKernelMatrix,
}) {
  return buildProcedureMbtEvidenceGate({
    criteria: {
      profileIdPrefix: featureProcedureProfileIdPrefix,
      rowPolicy:
        "Every supported unit-feature profile fact must emit an obligation evidence row with QNT owners and focused MBT or deterministic QNT replay witnesses, or an explicit gap row.",
      noRuntimeBehavior:
        "This gate is checker/report evidence only and does not change feature reducers, Surface admission, or QNT semantics.",
    },
    denominatorRule:
      "supported Unit unit-feature profile facts in the scoped level-support report",
    level1FullSupport,
    level12FullSupport,
    metricNames,
    missingProfileObligationDetail:
      "Supported feature procedure profile has no profile-obligations row.",
    rulesKernelMatrix,
    selectProfile: (profile) =>
      profile.profileId.startsWith(featureProcedureProfileIdPrefix),
  });
}

function renderFeatureProcedureMbtEvidenceGate(gate) {
  return renderProcedureMbtEvidenceGate({
    description:
      "This checker-owned report is limited to supported `unit-feature.` profile facts in the level-support scopes. It records the rules-kernel QNT owner and parity witness rows that already exist for each profile obligation, or emits an explicit gap row. It does not add or change feature behavior.",
    gate,
    heading: "Feature Procedure QNT/MBT Evidence Gate",
    metricNames,
    statusLineLabel: "Feature procedure QNT/MBT evidence gate",
    summaryProfileColumn: "Feature procedure profiles",
    summaryUnitColumn: "Supported feature Units",
  });
}

module.exports = {
  buildFeatureProcedureMbtEvidenceGate,
  renderFeatureProcedureMbtEvidenceGate,
};
