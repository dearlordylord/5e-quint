const {
  catalogAdmissionDispositionCategories,
  catalogAdmissionDispositionCategory,
} = require("./unit-profile-coverage-config.cjs");
const {
  hasVariantMagicMechanics,
} = require("./unit-profile-coverage-discovery.cjs");
const { fail } = require("./unit-profile-coverage-io.cjs");

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, stable(entry)]),
    );
  }
  return value;
}

function percent(numerator, denominator) {
  if (denominator === 0) return "n/a";
  return `${Math.round((numerator / denominator) * 1000) / 10}%`;
}

function groupUnitEvidence(unitEvidence) {
  const grouped = new Map();
  for (const row of unitEvidence) {
    const current = grouped.get(row.unitId) ?? [];
    current.push(row);
    grouped.set(row.unitId, current);
  }
  return grouped;
}

function metrics({
  inventory,
  authoredSurfaceUnits,
  profiles,
  unitClaims,
  unitEvidence,
  executableProfiles,
  deterministicAdmissionProjectionEvidenceTag,
  selectedIdentityMbtEvidenceTag,
}) {
  const classified = unitClaims.length;
  const supportedUnitClaims = unitClaims.filter(
    (claim) => claim.claim.tag === "supported-profile",
  );
  const deterministicAdmissionProjection = new Set(
    unitEvidence
      .filter(
        (row) =>
          row.evidence.tag === deterministicAdmissionProjectionEvidenceTag,
      )
      .map((row) => row.unitId),
  );
  const selectedIdentityMbt = new Set(
    unitEvidence
      .filter((row) => row.evidence.tag === selectedIdentityMbtEvidenceTag)
      .map((row) => row.unitId),
  );
  const executableUnits = inventory.filter((unit) => unit.executableMechanics);
  const classicUnits = inventory.filter(
    (unit) => unit.collectionId === "classic-2024-non-srd-mechanics",
  );
  const installedSurfaceSourcePaths = new Set(
    inventory
      .filter((unit) =>
        unit.sourceRecordPath.startsWith("packages/surface/content/"),
      )
      .map((unit) => unit.sourceRecordPath),
  );
  const authoredSurfaceAdmitted = authoredSurfaceUnits.filter((unit) =>
    installedSurfaceSourcePaths.has(unit.sourceRecordPath),
  );
  const authoredSurfaceExecutable = authoredSurfaceUnits.filter(
    (unit) => unit.executableMechanics,
  );
  const authoredSurfaceExecutableAdmitted = authoredSurfaceExecutable.filter(
    (unit) => installedSurfaceSourcePaths.has(unit.sourceRecordPath),
  );
  const qntModeled = executableProfiles.filter(
    (profile) => (profile.qntOwners ?? []).length > 0,
  );
  const qntProved = executableProfiles.filter((profile) =>
    (profile.verificationOwners ?? []).some(
      (owner) => owner.kind === "qnt-proof",
    ),
  );
  const runtimeMapped = executableProfiles.filter(
    (profile) => (profile.runtimeOwners ?? []).length > 0,
  );
  const runtimeParity = executableProfiles.filter((profile) =>
    (profile.verificationOwners ?? []).some(
      (owner) => owner.kind === "focused-mbt" || owner.kind === "runtime-test",
    ),
  );
  return {
    collectionInventoryCoverage: {
      numerator: inventory.length,
      denominator: inventory.length,
      percent: percent(inventory.length, inventory.length),
    },
    authoredSurfaceUnitCatalogAdmissionCoverage: {
      numerator: authoredSurfaceAdmitted.length,
      denominator: authoredSurfaceUnits.length,
      percent: percent(
        authoredSurfaceAdmitted.length,
        authoredSurfaceUnits.length,
      ),
    },
    authoredSurfaceExecutableCatalogAdmissionCoverage: {
      numerator: authoredSurfaceExecutableAdmitted.length,
      denominator: authoredSurfaceExecutable.length,
      percent: percent(
        authoredSurfaceExecutableAdmitted.length,
        authoredSurfaceExecutable.length,
      ),
    },
    profileClassificationCoverage: {
      numerator: classified,
      denominator: inventory.length,
      percent: percent(classified, inventory.length),
    },
    supportedProfileCoverage: {
      numerator: supportedUnitClaims.length,
      denominator: executableUnits.length,
      percent: percent(supportedUnitClaims.length, executableUnits.length),
    },
    qntProfileModelingCoverage: {
      numerator: qntModeled.length,
      denominator: executableProfiles.length,
      percent: percent(qntModeled.length, executableProfiles.length),
    },
    qntProofCoverage: {
      numerator: qntProved.length,
      denominator: executableProfiles.length,
      percent: percent(qntProved.length, executableProfiles.length),
    },
    runtimeMappingCoverage: {
      numerator: runtimeMapped.length,
      denominator: executableProfiles.length,
      percent: percent(runtimeMapped.length, executableProfiles.length),
    },
    runtimeParityCoverage: {
      numerator: runtimeParity.length,
      denominator: executableProfiles.length,
      percent: percent(runtimeParity.length, executableProfiles.length),
    },
    deterministicAdmissionProjectionCoverage: {
      numerator: deterministicAdmissionProjection.size,
      denominator: supportedUnitClaims.length,
      percent: percent(
        deterministicAdmissionProjection.size,
        supportedUnitClaims.length,
      ),
    },
    selectedIdentityMbtCoverage: {
      numerator: selectedIdentityMbt.size,
      denominator: supportedUnitClaims.length,
      percent: percent(selectedIdentityMbt.size, supportedUnitClaims.length),
    },
    classicNonSrdExpressionGate: {
      numerator: classicUnits.length,
      denominator: classicUnits.length,
      percent: percent(classicUnits.length, classicUnits.length),
    },
  };
}

function notInCatalogDisposition(unit, duplicateCount) {
  const srdCandidate = {
    category: catalogAdmissionDispositionCategory.srdCandidate,
    planningLane: "QMBT14-QMBT16",
    reason: "SRD spell Unit with executable mechanics; spell admission evidence needs a dedicated tracer and expansion lane.",
  };
  const magicItemBacklog = {
    category: catalogAdmissionDispositionCategory.intentionalBacklog,
    planningLane: "future magic item profile intake",
    reason: "SRD magic item mechanics are authored, but this QMBT lane is focused on Unit feature and spell admission.",
  };

  if (duplicateCount > 1) {
    return {
      category: catalogAdmissionDispositionCategory.duplicateContentIssue,
      planningLane: "content cleanup",
      reason: "More than one authored Surface record declares this Unit id; clean up the duplicate before treating it as catalog pressure.",
    };
  }

  if (unit.provenance?.kind !== "srd-5.2.1") {
    return {
      category: catalogAdmissionDispositionCategory.classicPrivatePressure,
      planningLane: "QMBT17",
      reason: "Non-SRD authored mechanics pressure must enter through the Classic non-SRD policy lane before catalog admission.",
    };
  }

  if (!unit.executableMechanics) {
    return {
      category: catalogAdmissionDispositionCategory.nonRuntimeAuthoredData,
      planningLane: "no promoted runtime lane",
      reason: "Authored SRD data has no mechanics payload, so catalog absence is not promoted runtime execution pressure.",
    };
  }

  if (unit.kind === "spell") return srdCandidate;

  if (unit.kind === "magic_item" || hasVariantMagicMechanics(unit.rawRecord)) {
    return magicItemBacklog;
  }

  return {
    category: catalogAdmissionDispositionCategory.unsupportedWideningPressure,
    planningLane: "QMBT18",
    reason: "Executable SRD authored data is absent from the catalog and needs an explicit unsupported profile or surface-widening slice.",
  };
}

function assertCatalogAdmissionDisposition(disposition) {
  if (!catalogAdmissionDispositionCategories.has(disposition.category)) {
    fail(
      `Unknown catalog admission disposition category: ${disposition.category}`,
    );
  }
  return disposition;
}

function buildMatrix(
  {
    collections,
    inventory,
    authoredSurfaceUnits,
    profiles,
    unitClaims,
    unitEvidence,
    taskClaims,
  },
  {
    executableProfileKinds,
    deterministicAdmissionProjectionEvidenceTag,
    selectedIdentityMbtEvidenceTag,
  },
) {
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const claimsByUnit = new Map(
    unitClaims.map((claim) => [claim.unitId, claim]),
  );
  const evidenceByUnit = groupUnitEvidence(unitEvidence);
  const installedSourcePaths = new Set(
    inventory.map((unit) => unit.sourceRecordPath),
  );
  const authoredUnitIdCounts = authoredSurfaceUnits.reduce((counts, unit) => {
    counts.set(unit.unitId, (counts.get(unit.unitId) ?? 0) + 1);
    return counts;
  }, new Map());
  const units = inventory
    .map((unit) => {
      const claim = claimsByUnit.get(unit.unitId);
      return stable({
        unitId: unit.unitId,
        collectionId: unit.collectionId,
        catalogAdmission: {
          status: "installed",
          collectionId: unit.collectionId,
        },
        sourceRecordPath: unit.sourceRecordPath,
        syntheticLabel: unit.syntheticLabel ?? claim?.syntheticLabel,
        kind: unit.kind,
        executableMechanics: unit.executableMechanics,
        authoredSurfaceDuplicateIdCount:
          authoredUnitIdCounts.get(unit.unitId) ?? undefined,
        claim: claim?.claim,
        profiles:
          claim?.claim?.tag === "supported-profile"
            ? claim.claim.profileIds.map((profileId) =>
                profileMap.get(profileId),
              )
            : [],
        evidence: (evidenceByUnit.get(unit.unitId) ?? []).map(
          (row) => row.evidence,
        ),
      });
    })
    .concat(
      authoredSurfaceUnits
        .filter((unit) => !installedSourcePaths.has(unit.sourceRecordPath))
        .map((unit) =>
          stable({
            unitId: unit.unitId,
            collectionId: undefined,
            catalogAdmission: {
              disposition: assertCatalogAdmissionDisposition(
                notInCatalogDisposition(
                  unit,
                  authoredUnitIdCounts.get(unit.unitId) ?? 1,
                ),
              ),
              status: "not-in-unit-catalog",
              expectedCollectionId:
                unit.provenance?.kind === "srd-5.2.1" ? "srd-5.2.1" : undefined,
            },
            sourceRecordPath: unit.sourceRecordPath,
            kind: unit.kind,
            executableMechanics: unit.executableMechanics,
            authoredSurfaceDuplicateIdCount:
              authoredUnitIdCounts.get(unit.unitId) ?? undefined,
            claim: undefined,
            profiles: [],
            evidence: [],
          }),
        ),
    );
  const executableProfiles = profiles.filter((profile) =>
    executableProfileKinds.has(profile.profileKind),
  );
  return stable({
    generatedBy: "scripts/unit-profile-coverage-check.cjs",
    collectionBoundaryNote:
      "SRD 5.2.1 is conceptually part of Classic, but stored separately for SRD provenance and distribution policy; the Classic 2024 library is a derived view.",
    collections: collections.collections,
    derivedViews: collections.derivedViews,
    metrics: metrics({
      inventory,
      authoredSurfaceUnits,
      profiles,
      unitClaims,
      unitEvidence,
      executableProfiles,
      deterministicAdmissionProjectionEvidenceTag,
      selectedIdentityMbtEvidenceTag,
    }),
    units,
    profiles,
    taskClaims,
  });
}

function renderMetric(label, metric) {
  return `| ${label} | ${metric.numerator}/${metric.denominator} | ${metric.percent} |`;
}

function groupAuthoredNotInCatalogByDisposition(units) {
  return Array.from(
    units
      .reduce((groups, unit) => {
        const disposition = unit.catalogAdmission.disposition;
        const current = groups.get(disposition.category) ?? {
          category: disposition.category,
          planningLane: disposition.planningLane,
          reason: disposition.reason,
          units: [],
        };
        current.units.push(unit);
        groups.set(disposition.category, current);
        return groups;
      }, new Map())
      .values(),
  ).sort(
    (a, b) =>
      b.units.length - a.units.length || a.category.localeCompare(b.category),
  );
}

function summarizeKindCounts(units) {
  return Array.from(
    units
      .reduce((counts, unit) => {
        counts.set(unit.kind, (counts.get(unit.kind) ?? 0) + 1);
        return counts;
      }, new Map())
      .entries(),
  )
    .sort(([kindA, countA], [kindB, countB]) => {
      return countB - countA || kindA.localeCompare(kindB);
    })
    .map(([kind, count]) => `${kind}: ${count}`)
    .join(", ");
}

function renderReport(
  matrix,
  {
    executableProfileKinds,
    deterministicAdmissionProjectionEvidenceTag,
    selectedIdentityMbtEvidenceTag,
  },
) {
  const installedUnits = matrix.units.filter(
    (unit) => unit.catalogAdmission?.status === "installed",
  );
  const authoredNotInCatalog = matrix.units.filter(
    (unit) => unit.catalogAdmission?.status === "not-in-unit-catalog",
  );
  const unsupported = installedUnits.filter(
    (unit) => unit.claim?.tag !== "supported-profile",
  );
  const supported = installedUnits.filter(
    (unit) => unit.claim?.tag === "supported-profile",
  );
  const authoredNotInCatalogByKind = Array.from(
    authoredNotInCatalog
      .reduce((groups, unit) => {
        const current = groups.get(unit.kind) ?? [];
        current.push(unit.unitId);
        groups.set(unit.kind, current);
        return groups;
      }, new Map())
      .entries(),
  ).sort(
    ([kindA, unitsA], [kindB, unitsB]) =>
      unitsB.length - unitsA.length || kindA.localeCompare(kindB),
  );
  const authoredNotInCatalogByDisposition =
    groupAuthoredNotInCatalogByDisposition(authoredNotInCatalog);
  const deterministicEvidence = supported.flatMap((unit) =>
    (unit.evidence ?? [])
      .filter(
        (evidence) =>
          evidence.tag === deterministicAdmissionProjectionEvidenceTag,
      )
      .map((evidence) => ({ unit, evidence })),
  );
  const selectedIdentityMbtEvidence = supported.flatMap((unit) =>
    (unit.evidence ?? [])
      .filter((evidence) => evidence.tag === selectedIdentityMbtEvidenceTag)
      .map((evidence) => ({ unit, evidence })),
  );
  const unsupportedPressure = Array.from(
    unsupported
      .reduce((groups, unit) => {
        const key = [
          unit.collectionId,
          unit.claim?.futureProfileOwner ?? "unassigned",
          unit.claim?.tag ?? "missing",
        ].join("\u0000");
        const current = groups.get(key) ?? {
          collectionId: unit.collectionId,
          futureProfileOwner: unit.claim?.futureProfileOwner ?? "unassigned",
          disposition: unit.claim?.tag ?? "missing",
          units: [],
        };
        current.units.push(unit.unitId);
        groups.set(key, current);
        return groups;
      }, new Map())
      .values(),
  ).sort(
    (a, b) =>
      b.units.length - a.units.length ||
      a.collectionId.localeCompare(b.collectionId) ||
      a.futureProfileOwner.localeCompare(b.futureProfileOwner) ||
      a.disposition.localeCompare(b.disposition),
  );
  const supportedProfilesWithoutParity = matrix.profiles.filter(
    (profile) =>
      executableProfileKinds.has(profile.profileKind) &&
      !(profile.verificationOwners ?? []).some(
        (owner) =>
          owner.kind === "focused-mbt" || owner.kind === "runtime-test",
      ),
  );
  const taskLines = matrix.taskClaims.map((claim) => {
    const profiles =
      (claim.profileIds ?? []).length > 0
        ? claim.profileIds.map((id) => `\`${id}\``).join(", ")
        : "_none_";
    return `| ${claim.taskId} | ${claim.claimKind} | ${profiles} |`;
  });

  return `${[
    "# Unit Profile Coverage Report",
    "",
    "Generated by `scripts/unit-profile-coverage-check.cjs`.",
    "",
    "SRD 5.2.1 is conceptually part of Classic, but it is stored separately because the SRD collection has Creative Commons SRD provenance and distribution policy. The Classic 2024 library is a derived view from the SRD collection plus the Classic non-SRD mechanics-only collection; mixed authored provenance is not a valid collection state.",
    "",
    "## Metrics",
    "",
    "| Metric | Covered | Percent |",
    "| --- | ---: | ---: |",
    renderMetric(
      "Collection inventory coverage",
      matrix.metrics.collectionInventoryCoverage,
    ),
    renderMetric(
      "Authored Surface Unit catalog admission",
      matrix.metrics.authoredSurfaceUnitCatalogAdmissionCoverage,
    ),
    renderMetric(
      "Authored Surface executable catalog admission",
      matrix.metrics.authoredSurfaceExecutableCatalogAdmissionCoverage,
    ),
    renderMetric(
      "Profile classification coverage",
      matrix.metrics.profileClassificationCoverage,
    ),
    renderMetric(
      "Supported profile coverage",
      matrix.metrics.supportedProfileCoverage,
    ),
    renderMetric(
      "QNT profile modeling coverage",
      matrix.metrics.qntProfileModelingCoverage,
    ),
    renderMetric("QNT proof coverage", matrix.metrics.qntProofCoverage),
    renderMetric(
      "Runtime mapping coverage",
      matrix.metrics.runtimeMappingCoverage,
    ),
    renderMetric(
      "Runtime parity coverage",
      matrix.metrics.runtimeParityCoverage,
    ),
    renderMetric(
      "Deterministic admission/projection coverage",
      matrix.metrics.deterministicAdmissionProjectionCoverage,
    ),
    renderMetric(
      "Selected identity MBT coverage",
      matrix.metrics.selectedIdentityMbtCoverage,
    ),
    renderMetric(
      "Classic non-SRD expression gate",
      matrix.metrics.classicNonSrdExpressionGate,
    ),
    "",
    "## Supported Unit Claims",
    "",
    "| Unit | Collection | Profiles |",
    "| --- | --- | --- |",
    ...supported.map(
      (unit) =>
        `| \`${unit.unitId}\` | ${unit.collectionId} | ${unit.claim.profileIds.map((id) => `\`${id}\``).join(", ")} |`,
    ),
    "",
    "## Authored Surface Units Not In Unit Catalog",
    "",
    "This raw inventory lists authored Surface records that are absent from the installed Unit catalog. The triage section below is the planning-pressure view; non-runtime data and duplicate content issues are not counted as runtime implementation pressure.",
    "",
    "| Kind | Count | Units |",
    "| --- | ---: | --- |",
    ...(authoredNotInCatalogByKind.length === 0
      ? ["| _none_ | 0 | _none_ |"]
      : authoredNotInCatalogByKind.map(
          ([kind, units]) =>
            `| ${kind} | ${units.length} | ${units.map((unitId) => `\`${unitId}\``).join(", ")} |`,
        )),
    "",
    "## Authored Catalog Admission Triage",
    "",
    "| Disposition | Planning lane | Count | Kind counts | Reason |",
    "| --- | --- | ---: | --- | --- |",
    ...(authoredNotInCatalogByDisposition.length === 0
      ? ["| _none_ | _none_ | 0 | _none_ | _none_ |"]
      : authoredNotInCatalogByDisposition.map(
          (group) =>
            `| ${group.category} | ${group.planningLane} | ${group.units.length} | ${summarizeKindCounts(group.units)} | ${group.reason} |`,
        )),
    "",
    "| Unit | Disposition | Planning lane | Kind | Mechanics | Source |",
    "| --- | --- | --- | --- | --- | --- |",
    ...(authoredNotInCatalog.length === 0
      ? ["| _none_ | _none_ | _none_ | _none_ | _none_ | _none_ |"]
      : authoredNotInCatalog.map((unit) => {
          const disposition = unit.catalogAdmission.disposition;
          return `| \`${unit.unitId}\` | ${disposition.category} | ${disposition.planningLane} | ${unit.kind} | ${unit.executableMechanics ? "yes" : "no"} | \`${unit.sourceRecordPath}\` |`;
        })),
    "",
    "## Authored Catalog Admission Raw Inventory",
    "",
    "| Unit | Kind | Mechanics | Source |",
    "| --- | --- | --- | --- |",
    ...(authoredNotInCatalog.length === 0
      ? ["| _none_ | _none_ | _none_ | _none_ |"]
      : authoredNotInCatalog.map(
          (unit) =>
            `| \`${unit.unitId}\` | ${unit.kind} | ${unit.executableMechanics ? "yes" : "no"} | \`${unit.sourceRecordPath}\` |`,
        )),
    "",
    "## Deterministic Admission/Projection Evidence",
    "",
    "| Unit | Profiles | Task | Owner |",
    "| --- | --- | --- | --- |",
    ...(deterministicEvidence.length === 0
      ? ["| _none_ | _none_ | _none_ | _none_ |"]
      : deterministicEvidence.map(
          ({ unit, evidence }) =>
            `| \`${unit.unitId}\` | ${unit.claim.profileIds.map((id) => `\`${id}\``).join(", ")} | ${evidence.taskId} | \`${evidence.ownerPath}\` |`,
        )),
    "",
    "## Selected Identity MBT Evidence",
    "",
    "| Unit | Profiles | Task | Owner |",
    "| --- | --- | --- | --- |",
    ...(selectedIdentityMbtEvidence.length === 0
      ? ["| _none_ | _none_ | _none_ | _none_ |"]
      : selectedIdentityMbtEvidence.map(
          ({ unit, evidence }) =>
            `| \`${unit.unitId}\` | ${unit.claim.profileIds.map((id) => `\`${id}\``).join(", ")} | ${evidence.taskId} | \`${evidence.ownerPath}\` |`,
        )),
    "",
    "## Unsupported And Widening Pressure",
    "",
    "| Unit | Disposition | Detail |",
    "| --- | --- | --- |",
    ...unsupported.map(
      (unit) =>
        `| \`${unit.unitId}\` | ${unit.claim?.tag ?? "missing"} | ${unit.claim?.reason ?? unit.claim?.issue ?? unit.claim?.assumptionId ?? ""} |`,
    ),
    "",
    "## Unsupported Pressure Summary",
    "",
    "| Collection | Future owner | Disposition | Count | Units |",
    "| --- | --- | --- | ---: | --- |",
    ...unsupportedPressure.map(
      (group) =>
        `| ${group.collectionId} | ${group.futureProfileOwner} | ${group.disposition} | ${group.units.length} | ${group.units.map((unitId) => `\`${unitId}\``).join(", ")} |`,
    ),
    "",
    "## Profile Claims By Task",
    "",
    "| Task | Claim | Profiles |",
    "| --- | --- | --- |",
    ...taskLines,
    "",
    "## Supported Profiles Lacking Runtime Parity",
    "",
    ...(supportedProfilesWithoutParity.length === 0
      ? [
          "All executable supported profiles currently have focused MBT or runtime-test owners.",
        ]
      : supportedProfilesWithoutParity.map((profile) => `- \`${profile.id}\``)),
    "",
  ].join("\n")}`;
}

module.exports = {
  buildMatrix,
  renderReport,
  stable,
};
