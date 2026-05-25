const {
  buildProcedureMbtEvidenceGate,
  renderProcedureMbtEvidenceGate,
} = require("./procedure-mbt-evidence-gate.cjs");

const spellProcedureProfileKind = "spell-invocation";
const metricNames = {
  supportedUnits: "supportedSpellUnits",
  procedureProfiles: "spellProcedureProfiles",
};

function buildSpellProcedureMbtEvidenceGate({
  level1FullSupport,
  level12FullSupport,
  rulesKernelMatrix,
}) {
  return buildProcedureMbtEvidenceGate({
    criteria: {
      profileKind: spellProcedureProfileKind,
      rowPolicy:
        "Every supported spell procedure profile fact must emit an obligation evidence row with QNT owners and focused MBT or deterministic QNT replay witnesses, or an explicit gap row.",
      noRuntimeBehavior:
        "This gate is checker/report evidence only and does not change spell reducers, Surface admission, or QNT semantics.",
    },
    denominatorRule:
      "supported Unit spell-invocation profile facts in the scoped level-support report",
    level1FullSupport,
    level12FullSupport,
    metricNames,
    missingProfileObligationDetail:
      "Supported spell procedure profile has no profile-obligations row.",
    rulesKernelMatrix,
    selectProfile: (profile) => profile.profileKind === spellProcedureProfileKind,
  });
}

function renderSpellProcedureMbtEvidenceGate(gate) {
  return renderProcedureMbtEvidenceGate({
    description:
      "This checker-owned report is limited to supported `spell-invocation` profile facts in the level-support scopes. It records the rules-kernel QNT owner and parity witness rows that already exist for each profile obligation, or emits an explicit gap row. It does not add or change spell behavior.",
    gate,
    heading: "Spell Procedure QNT/MBT Evidence Gate",
    metricNames,
    statusLineLabel: "Spell procedure QNT/MBT evidence gate",
    summaryProfileColumn: "Spell procedure profiles",
    summaryUnitColumn: "Supported spell Units",
  });
}

module.exports = {
  buildSpellProcedureMbtEvidenceGate,
  renderSpellProcedureMbtEvidenceGate,
};
