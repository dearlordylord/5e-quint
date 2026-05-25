const {
  isUnitFeatureProfileId,
} = require("./unit-profile-coverage-config.cjs");

const coveredStatus = "covered";

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

function profileQntOwnerRows(profile, qntOwnerRolesByPath) {
  return (profile?.qntOwners ?? []).map((ownerPath) => ({
    ownerPath,
    role: qntOwnerRolesByPath.get(ownerPath) ?? "missing-role",
  }));
}

function parityWitnessRows(obligation) {
  return (obligation?.parityWitnesses ?? []).map((witness) =>
    stable({
      kind: witness.kind,
      ownerPath: witness.ownerPath,
      qntSpecPath: witness.qntSpecPath,
      stepAction: witness.stepAction,
      deterministicReplayRationale: witness.deterministicReplayRationale,
    }),
  );
}

function obligationGaps({
  obligation,
  obligationId,
  qntOwners,
  parityWitnesses,
  qntOwnerEvidenceLabel,
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
            detail: `${qntOwnerEvidenceLabel} has no QNT owner path.`,
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
  ];
}

function evidenceRowsForProfile({
  obligationSummary,
  profile,
  qntOwnerRolesByPath,
  unitId,
  obligationsById,
}) {
  if (profile.obligations.length === 0) {
    return [
      stable({
        tag: "profile-gap",
        unitId,
        profileId: profile.profileId,
        profileKind: profile.profileKind,
        ...((profile.followUpTaskIds ?? []).length > 0
          ? { followUpTaskIds: profile.followUpTaskIds }
          : {}),
        ...(profile.gapReason !== undefined
          ? { gapReason: profile.gapReason }
          : {}),
        joinStatus: profile.joinStatus,
        gaps: [
          {
            kind: "missing-profile-obligation-mapping",
            detail:
              "Rules-kernel applicable profile has no profile-obligations row.",
          },
        ],
      }),
    ];
  }

  return profile.obligations.map((obligationRef) => {
    const obligation = obligationsById.get(obligationRef.obligationId);
    obligationSummary.obligationIds.add(obligationRef.obligationId);
    const qntOwners = isUnitFeatureProfileId(profile.profileId)
      ? profileQntOwnerRows(profile, qntOwnerRolesByPath)
      : qntOwnerRows(obligation, qntOwnerRolesByPath);
    const parityWitnesses = parityWitnessRows(obligation);
    const gaps = obligationGaps({
      obligation,
      obligationId: obligationRef.obligationId,
      qntOwners,
      parityWitnesses,
      qntOwnerEvidenceLabel: isUnitFeatureProfileId(profile.profileId)
        ? "Unit profile owner evidence"
        : "Rules-kernel obligation",
    });
    if (obligation !== undefined) {
      if (obligation.status === coveredStatus) {
        obligationSummary.coveredObligationIds.add(obligationRef.obligationId);
      }
      if (qntOwners.length > 0) {
        obligationSummary.qntOwnedObligationIds.add(obligationRef.obligationId);
      }
      if (parityWitnesses.length > 0) {
        obligationSummary.parityWitnessedObligationIds.add(
          obligationRef.obligationId,
        );
      }
    }
    return stable({
      tag: "obligation-evidence",
      unitId,
      profileId: profile.profileId,
      profileKind: profile.profileKind,
      joinStatus: profile.joinStatus,
      obligationId: obligationRef.obligationId,
      obligationStatus: obligation?.status ?? "missing",
      obligationTitle: obligation?.title ?? obligationRef.title,
      ...((obligation?.followUpTaskIds ?? []).length > 0
        ? { followUpTaskIds: obligation.followUpTaskIds }
        : {}),
      runtime: obligation?.runtime ?? obligationRef.runtime,
      qntOwners,
      parityWitnesses,
      gaps,
    });
  });
}

function buildLevel12QntMbtJoin({ level12FullSupport, rulesKernelMatrix }) {
  const { obligationsById, qntOwnerRolesByPath } =
    indexRulesKernelMatrix(rulesKernelMatrix);
  const obligationSummary = {
    coveredObligationIds: new Set(),
    obligationIds: new Set(),
    parityWitnessedObligationIds: new Set(),
    qntOwnedObligationIds: new Set(),
  };
  const rows = (level12FullSupport.rulesKernelSupportedUnitJoin?.units ?? [])
    .flatMap((unit) =>
      unit.profiles.flatMap((profile) =>
        evidenceRowsForProfile({
          obligationSummary,
          profile,
          qntOwnerRolesByPath,
          unitId: unit.unitId,
          obligationsById,
        }),
      ),
    )
    .sort(
      (left, right) =>
        left.unitId.localeCompare(right.unitId) ||
        left.profileId.localeCompare(right.profileId) ||
        (left.obligationId ?? "").localeCompare(right.obligationId ?? ""),
    );
  const openGapRows = rows.filter((row) => row.gaps.length > 0);
  const rulesKernelProfileIds = uniqueSorted(rows.map((row) => row.profileId));
  const supportedUnitIds = uniqueSorted(rows.map((row) => row.unitId));
  return stable({
    generatedBy: "scripts/unit-profile-coverage-check.cjs",
    sourceArtifacts: {
      level12FullSupport:
        "plans/unit-profile-coverage/level1-2-full-support.json",
      rulesKernelMatrix: "plans/rules-kernel-coverage/matrix.json",
      profileObligations:
        "plans/rules-kernel-coverage/profile-obligations.jsonl",
    },
    scope: {
      id: "level-1-2",
      title: level12FullSupport.scope.title,
      denominatorRule:
        "supported level 1-2 Unit profiles whose profile kind is rules-kernel applicable",
    },
    metrics: {
      supportedUnits: countCoverage(
        supportedUnitIds.length,
        supportedUnitIds.length,
      ),
      rulesKernelProfiles: countCoverage(
        rulesKernelProfileIds.length,
        rulesKernelProfileIds.length,
      ),
      obligationJoinRows: countCoverage(
        rows.length - openGapRows.length,
        rows.length,
      ),
      uniqueCoveredObligations: countCoverage(
        obligationSummary.coveredObligationIds.size,
        obligationSummary.obligationIds.size,
      ),
      uniqueQntOwnedObligations: countCoverage(
        obligationSummary.qntOwnedObligationIds.size,
        obligationSummary.obligationIds.size,
      ),
      uniqueParityWitnessedObligations: countCoverage(
        obligationSummary.parityWitnessedObligationIds.size,
        obligationSummary.obligationIds.size,
      ),
    },
    openGapRows,
    rows,
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

function renderGapKinds(gaps) {
  if (gaps.length === 0) return "_none_";
  return gaps.map((gap) => md(gap.kind)).join("<br>");
}

function renderGapDetails(gaps) {
  if (gaps.length === 0) return "_none_";
  return gaps.map((gap) => md(gap.detail)).join("<br>");
}

function renderFollowUpTaskIds(taskIds, { planUpdateRequired = false } = {}) {
  if ((taskIds ?? []).length === 0) {
    return planUpdateRequired ? "_plan-update-required_" : "_none_";
  }
  return taskIds.map(code).join("<br>");
}

function renderOpenGapRow(row) {
  return `| ${code(row.unitId)} | ${code(row.profileId)} | ${code(row.obligationId ?? "_profile_")} | ${renderGapKinds(row.gaps)} | ${renderFollowUpTaskIds(row.followUpTaskIds, { planUpdateRequired: true })} | ${md(row.gapReason ?? "_none_")} | ${renderGapDetails(row.gaps)} |`;
}

function renderEvidenceRow(row) {
  return `| ${code(row.unitId)} | ${code(row.profileId)} | ${code(row.obligationId ?? "_profile_")} | ${md(row.obligationStatus ?? row.joinStatus)} | ${renderOwners(row.qntOwners ?? [])} | ${renderWitnesses(row.parityWitnesses ?? [])} | ${renderGapKinds(row.gaps)} |`;
}

function renderLevel12QntMbtJoin(report) {
  return `${[
    "# Level 1-2 QNT/MBT Evidence Join",
    "",
    "Generated by `scripts/unit-profile-coverage-check.cjs`.",
    "",
    "This report joins the level 1-2 supported Unit profiles to rules-kernel obligations, QNT owners, and parity witnesses. Unit-feature rows use profile-scoped QNT owners so broad obligation owners are not credited to unrelated profiles. Open evidence gaps are emitted as explicit rows before the full join table.",
    "",
    "## Metrics",
    "",
    "| Metric | Result |",
    "| --- | ---: |",
    `| Supported Units in join | ${renderMetric(report.metrics.supportedUnits)} |`,
    `| Rules-kernel profiles in join | ${renderMetric(report.metrics.rulesKernelProfiles)} |`,
    `| Obligation join rows without open gaps | ${renderMetric(report.metrics.obligationJoinRows)} |`,
    `| Unique covered obligations | ${renderMetric(report.metrics.uniqueCoveredObligations)} |`,
    `| Unique QNT-owned obligations | ${renderMetric(report.metrics.uniqueQntOwnedObligations)} |`,
    `| Unique parity-witnessed obligations | ${renderMetric(report.metrics.uniqueParityWitnessedObligations)} |`,
    "",
    "## Open Evidence Gaps",
    "",
    "| Unit | Profile | Obligation | Gap | Follow-up tasks | Reason | Detail |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...(report.openGapRows.length === 0
      ? ["| _none_ | _none_ | _none_ | _none_ | _none_ | _none_ | _none_ |"]
      : report.openGapRows.map(renderOpenGapRow)),
    "",
    "## Full Join Rows",
    "",
    "| Unit | Profile | Obligation | Obligation status | QNT owners | Parity witnesses | Gaps |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...report.rows.map(renderEvidenceRow),
    "",
  ].join("\n")}`;
}

module.exports = {
  buildLevel12QntMbtJoin,
  renderLevel12QntMbtJoin,
};
