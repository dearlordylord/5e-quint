const {
  buildProcedureMbtEvidenceGate,
  renderProcedureMbtEvidenceGate,
} = require("./procedure-mbt-evidence-gate.cjs");
const {
  isUnitFeatureProfileId,
  unitFeatureProfileIdPrefix,
} = require("./unit-profile-coverage-config.cjs");

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
      profileIdPrefix: unitFeatureProfileIdPrefix,
      rowPolicy:
        "Every supported unit-feature profile fact must emit an obligation evidence row with profile-scoped QNT owners and obligation-scoped focused MBT or deterministic QNT replay witnesses, or an explicit gap row.",
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
    ownerEvidence: "profile",
    rulesKernelMatrix,
    selectProfile: (profile) => isUnitFeatureProfileId(profile.profileId),
  });
}

function renderFeatureProcedureMbtEvidenceGate(gate) {
  return renderProcedureMbtEvidenceGate({
    description:
      "This checker-owned report is limited to supported `unit-feature.` profile facts in the level-support scopes. It records each profile's scoped QNT owner evidence plus obligation-scoped rules-kernel parity witness rows for each profile obligation, or emits an explicit gap row. The QNT/MBT witness column is obligation evidence, not a claim that every listed split driver witnesses the specific profile. It does not add or change feature behavior.",
    gate,
    heading: "Feature Procedure QNT/MBT Evidence Gate",
    includeQntSpecPath: true,
    metricNames,
    statusLineLabel: "Feature procedure QNT/MBT evidence gate",
    summaryProfileColumn: "Feature procedure profiles",
    summaryUnitColumn: "Supported feature Units",
    witnessColumnLabel: "Obligation QNT/MBT witnesses",
  });
}

module.exports = {
  buildFeatureProcedureMbtEvidenceGate,
  renderFeatureProcedureMbtEvidenceGate,
};
