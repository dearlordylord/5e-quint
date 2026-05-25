const {
  deterministicQntReplayWitnessKind,
  focusedMbtWitnessKind,
} = require("./evidence-witness-kind-config.cjs");

const passStatus = "pass";
const blockedStatus = "blocked";
const coveredStatus = "covered";
const spellProcedureProfileKind = "spell-invocation";
const qntMbtWitnessKinds = new Set([
  deterministicQntReplayWitnessKind,
  focusedMbtWitnessKind,
]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stable(entry)]),
    );
  }
  return value;
}

function uniqueSorted(values) {
  return Array.from(new Set(values)).sort();
}

function percent(numerator, denominator) {
  if (denominator === 0) return "n/a";
  return `${Math.round((numerator / denominator) * 1000) / 10}%`;
}

function countCoverage(numerator, denominator) {
  return {
    denominator,
    numerator,
    percent: percent(numerator, denominator),
  };
}

function indexRulesKernelMatrix(rulesKernelMatrix) {
  return {
    obligationsById: new Map(
      (rulesKernelMatrix.obligations ?? []).map((obligation) => [
        obligation.id,
        obligation,
      ]),
    ),
    qntOwnerRolesByPath: new Map(
      (rulesKernelMatrix.qntOwnerRoles ?? []).map((ownerRole) => [
        ownerRole.ownerPath,
        ownerRole.role,
      ]),
    ),
  };
}

function qntOwnerRows(obligation, qntOwnerRolesByPath) {
  return (obligation?.qntOwners ?? []).map((ownerPath) => ({
    ownerPath,
    role: qntOwnerRolesByPath.get(ownerPath) ?? "missing-role",
  }));
}

function parityWitnessRows(obligation) {
  return (obligation?.parityWitnesses ?? []).map((witness) =>
    stable({
      deterministicReplayRationale: witness.deterministicReplayRationale,
      kind: witness.kind,
      ownerPath: witness.ownerPath,
      qntSpecPath: witness.qntSpecPath,
      stepAction: witness.stepAction,
    }),
  );
}

function qntMbtWitnessRows(parityWitnesses) {
  return parityWitnesses.filter((witness) =>
    qntMbtWitnessKinds.has(witness.kind),
  );
}

function otherParityWitnessRows(parityWitnesses) {
  return parityWitnesses.filter(
    (witness) => !qntMbtWitnessKinds.has(witness.kind),
  );
}

function obligationGaps({
  obligation,
  obligationId,
  parityWitnesses,
  qntMbtWitnesses,
  qntOwners,
}) {
  if (obligation === undefined) {
    return [
      {
        kind: "missing-obligation",
        detail: `No rules-kernel obligation row exists for ${obligationId}.`,
      },
    ];
  }
  return [
    ...(obligation.status === coveredStatus
      ? []
      : [
          {
            kind: "obligation-not-covered",
            detail: `Rules-kernel obligation status is ${obligation.status}.`,
          },
        ]),
    ...(qntOwners.length === 0
      ? [
          {
            kind: "missing-qnt-owner",
            detail: "Rules-kernel obligation has no QNT owner path.",
          },
        ]
      : []),
    ...qntOwners
      .filter((owner) => owner.role === "missing-role")
      .map((owner) => ({
        kind: "missing-qnt-owner-role",
        detail: `${owner.ownerPath} has no qnt-owner-roles row.`,
      })),
    ...(parityWitnesses.length === 0
      ? [
          {
            kind: "missing-parity-witness",
            detail: "Rules-kernel obligation has no parity witness.",
          },
        ]
      : []),
    ...(parityWitnesses.length > 0 && qntMbtWitnesses.length === 0
      ? [
          {
            kind: "missing-qnt-mbt-witness",
            detail:
              "Rules-kernel obligation has parity witnesses, but none are focused-mbt or deterministic-qnt-replay evidence.",
          },
        ]
      : []),
  ];
}

function spellProcedureProfiles(levelReport) {
  return (levelReport.rulesKernelSupportedUnitJoin?.units ?? []).flatMap(
    (unit) =>
      unit.profiles
        .filter((profile) => profile.profileKind === spellProcedureProfileKind)
        .map((profile) => ({ unit, profile })),
  );
}

function evidenceRowsForProfile({
  obligationsById,
  profile,
  qntOwnerRolesByPath,
  unit,
}) {
  if (profile.obligations.length === 0) {
    return [
      stable({
        tag: "profile-gap",
        evidenceStatus: "gap",
        unitId: unit.unitId,
        profileId: profile.profileId,
        profileKind: profile.profileKind,
        followUpTaskIds: profile.followUpTaskIds ?? [],
        gapReason: profile.gapReason,
        gaps: [
          {
            kind: "missing-profile-obligation-mapping",
            detail:
              "Supported spell procedure profile has no profile-obligations row.",
          },
        ],
        joinStatus: profile.joinStatus,
      }),
    ];
  }

  return profile.obligations.map((obligationRef) => {
    const obligation = obligationsById.get(obligationRef.obligationId);
    const qntOwners = qntOwnerRows(obligation, qntOwnerRolesByPath);
    const parityWitnesses = parityWitnessRows(obligation);
    const qntMbtWitnesses = qntMbtWitnessRows(parityWitnesses);
    const gaps = obligationGaps({
      obligation,
      obligationId: obligationRef.obligationId,
      parityWitnesses,
      qntMbtWitnesses,
      qntOwners,
    });
    return stable({
      tag: "obligation-evidence",
      evidenceStatus: gaps.length === 0 ? "evidence-present" : "gap",
      unitId: unit.unitId,
      profileId: profile.profileId,
      profileKind: profile.profileKind,
      obligationId: obligationRef.obligationId,
      obligationStatus: obligation?.status ?? "missing",
      obligationTitle: obligation?.title ?? obligationRef.title,
      runtime: obligation?.runtime ?? obligationRef.runtime,
      qntOwners,
      qntMbtWitnesses,
      parityWitnesses,
      gaps,
      joinStatus: profile.joinStatus,
    });
  });
}

function buildScope({ levelReport, rulesKernelMatrix, scopeId }) {
  const { obligationsById, qntOwnerRolesByPath } =
    indexRulesKernelMatrix(rulesKernelMatrix);
  const profileFacts = spellProcedureProfiles(levelReport);
  const rows = profileFacts
    .flatMap(({ unit, profile }) =>
      evidenceRowsForProfile({
        obligationsById,
        profile,
        qntOwnerRolesByPath,
        unit,
      }),
    )
    .sort(
      (left, right) =>
        left.unitId.localeCompare(right.unitId) ||
        left.profileId.localeCompare(right.profileId) ||
        (left.obligationId ?? "").localeCompare(right.obligationId ?? ""),
    );
  const openGapRows = rows.filter((row) => row.gaps.length > 0);
  const uniqueProfileIds = uniqueSorted(
    profileFacts.map(({ profile }) => profile.profileId),
  );
  const supportedUnitIds = uniqueSorted(
    profileFacts.map(({ unit }) => unit.unitId),
  );
  return stable({
    scopeId,
    title: levelReport.scope.title,
    status: openGapRows.length === 0 ? passStatus : blockedStatus,
    denominatorRule:
      "supported Unit spell-invocation profile facts in the scoped level-support report",
    metrics: {
      supportedSpellUnits: countCoverage(
        supportedUnitIds.length,
        supportedUnitIds.length,
      ),
      spellProcedureProfiles: countCoverage(
        uniqueProfileIds.length,
        uniqueProfileIds.length,
      ),
      evidenceRows: countCoverage(rows.length - openGapRows.length, rows.length),
      openGapRows: countCoverage(openGapRows.length, rows.length),
    },
    openGapRows,
    rows,
  });
}

function buildSpellProcedureMbtEvidenceGate({
  level1FullSupport,
  level12FullSupport,
  rulesKernelMatrix,
}) {
  const scopes = [
    buildScope({
      levelReport: level1FullSupport,
      rulesKernelMatrix,
      scopeId: "level-1",
    }),
    buildScope({
      levelReport: level12FullSupport,
      rulesKernelMatrix,
      scopeId: "level-1-2",
    }),
  ];
  const blockedScopes = scopes.filter((scope) => scope.status !== passStatus);
  return stable({
    generatedBy: "scripts/unit-profile-coverage-check.cjs",
    sourceArtifacts: {
      level1FullSupport: "plans/unit-profile-coverage/level1-full-support.json",
      level12FullSupport:
        "plans/unit-profile-coverage/level1-2-full-support.json",
      rulesKernelMatrix: "plans/rules-kernel-coverage/matrix.json",
      profileObligations:
        "plans/rules-kernel-coverage/profile-obligations.jsonl",
    },
    criteria: {
      profileKind: spellProcedureProfileKind,
      qntMbtWitnessKinds: Array.from(qntMbtWitnessKinds).sort(),
      rowPolicy:
        "Every supported spell procedure profile fact must emit an obligation evidence row with QNT owners and focused MBT or deterministic QNT replay witnesses, or an explicit gap row.",
      noRuntimeBehavior:
        "This gate is checker/report evidence only and does not change spell reducers, Surface admission, or QNT semantics.",
    },
    status: blockedScopes.length === 0 ? passStatus : blockedStatus,
    blockedScopeIds: blockedScopes.map((scope) => scope.scopeId),
    scopes,
  });
}

function md(value) {
  return String(value ?? "")
    .replace(/\n/g, " ")
    .replace(/\|/g, "\\|");
}

function code(value) {
  return `\`${md(value)}\``;
}

function renderMetric(metric) {
  return `${metric.numerator}/${metric.denominator} (${metric.percent})`;
}

function renderOwners(qntOwners) {
  if (qntOwners.length === 0) return "_none_";
  return qntOwners
    .map((owner) => `${code(owner.ownerPath)} (${md(owner.role)})`)
    .join("<br>");
}

function renderWitnesses(parityWitnesses) {
  if (parityWitnesses.length === 0) return "_none_";
  return parityWitnesses
    .map((witness) => `${md(witness.kind)}: ${code(witness.ownerPath)}`)
    .join("<br>");
}

function renderWitnessKinds(kinds) {
  return kinds.map(code).join(", ");
}

function renderGaps(gaps) {
  if (gaps.length === 0) return "_none_";
  return gaps.map((gap) => `${md(gap.kind)}: ${md(gap.detail)}`).join("<br>");
}

function renderFollowUpTaskIds(taskIds) {
  if ((taskIds ?? []).length === 0) return "_none_";
  return taskIds.map(code).join("<br>");
}

function renderScopeSummaryRow(scope) {
  const metrics = scope.metrics;
  return `| ${scope.scopeId} | ${scope.status} | ${renderMetric(metrics.evidenceRows)} | ${metrics.openGapRows.numerator} | ${metrics.supportedSpellUnits.denominator} | ${metrics.spellProcedureProfiles.denominator} |`;
}

function renderOpenGapRow(scope, row) {
  const obligation = code(row.obligationId ?? "_profile_");
  return `| ${scope.scopeId} | ${code(row.unitId)} | ${code(row.profileId)} | ${obligation} | ${renderFollowUpTaskIds(row.followUpTaskIds)} | ${md(row.gapReason ?? "_none_")} | ${renderGaps(row.gaps)} |`;
}

function renderEvidenceRow(scope, row) {
  const parityWitnesses = row.parityWitnesses ?? [];
  const obligation = code(row.obligationId ?? "_profile_");
  const qntMbtWitnesses = renderWitnesses(row.qntMbtWitnesses ?? []);
  const otherParityWitnesses = renderWitnesses(
    otherParityWitnessRows(parityWitnesses),
  );
  return `| ${scope.scopeId} | ${code(row.unitId)} | ${code(row.profileId)} | ${obligation} | ${md(row.evidenceStatus)} | ${renderOwners(row.qntOwners ?? [])} | ${qntMbtWitnesses} | ${otherParityWitnesses} | ${renderGaps(row.gaps)} |`;
}

function renderSpellProcedureMbtEvidenceGate(gate) {
  const openGapRows = gate.scopes.flatMap((scope) =>
    scope.openGapRows.map((row) => renderOpenGapRow(scope, row)),
  );
  return `${[
    "# Spell Procedure QNT/MBT Evidence Gate",
    "",
    "Generated by `scripts/unit-profile-coverage-check.cjs`.",
    "",
    `Spell procedure QNT/MBT evidence gate: **${gate.status}**.`,
    "",
    "This checker-owned report is limited to supported `spell-invocation` profile facts in the level-support scopes. It records the rules-kernel QNT owner and parity witness rows that already exist for each profile obligation, or emits an explicit gap row. It does not add or change spell behavior.",
    "",
    "## Criteria",
    "",
    "| Field | Value |",
    "| --- | --- |",
    `| Profile kind | ${code(gate.criteria.profileKind)} |`,
    `| QNT/MBT witness kinds | ${renderWitnessKinds(gate.criteria.qntMbtWitnessKinds)} |`,
    `| Row policy | ${md(gate.criteria.rowPolicy)} |`,
    `| Runtime behavior | ${md(gate.criteria.noRuntimeBehavior)} |`,
    "",
    "## Scope Summary",
    "",
    "| Scope | Status | Evidence rows | Open gap rows | Supported spell Units | Spell procedure profiles |",
    "| --- | --- | ---: | ---: | ---: | ---: |",
    ...gate.scopes.map(renderScopeSummaryRow),
    "",
    "## Open Gap Rows",
    "",
    "| Scope | Unit | Profile | Obligation | Follow-up tasks | Reason | Gap detail |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...(openGapRows.length === 0
      ? ["| _none_ | _none_ | _none_ | _none_ | _none_ | _none_ | _none_ |"]
      : openGapRows),
    "",
    "## Evidence Rows",
    "",
    "| Scope | Unit | Profile | Obligation | Evidence status | QNT owners | QNT/MBT witnesses | Other parity witnesses | Gaps |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...gate.scopes.flatMap((scope) =>
      scope.rows.map((row) => renderEvidenceRow(scope, row)),
    ),
    "",
  ].join("\n")}`;
}

module.exports = {
  buildSpellProcedureMbtEvidenceGate,
  renderSpellProcedureMbtEvidenceGate,
};
