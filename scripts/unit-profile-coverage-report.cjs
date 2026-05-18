const {
  catalogAdmissionDispositionCategories,
  catalogAdmissionDispositionCategory,
} = require("./unit-profile-coverage-config.cjs");
const {
  hasVariantMagicMechanics,
} = require("./unit-profile-coverage-discovery.cjs");
const { fail } = require("./unit-profile-coverage-io.cjs");
const {
  buildRulesKernelProfileJoin,
  buildRulesKernelSupportedUnitJoin,
} = require("./rules-kernel-profile-join.cjs");

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

const metricDefinitions = [
  {
    key: "collectionInventoryCount",
    label: "Installed collection inventory count",
    kind: "count",
    planningQuestion:
      "How many Unit records did the checker discover in the configured installed coverage collections?",
    value: "installed Unit records discovered from configured collections",
    denominator: "n/a; no independent expected-inventory boundary exists",
  },
  {
    key: "authoredSurfaceUnitCatalogAdmissionCoverage",
    label: "Authored Surface Unit catalog admission",
    kind: "coverage",
    planningQuestion:
      "How much authored Surface Unit-shaped content is admitted to an installed Unit collection?",
    numerator: "authored Surface records whose source path is installed",
    denominator: "all authored Surface Unit-shaped records discovered",
  },
  {
    key: "authoredSurfaceExecutableCatalogAdmissionCoverage",
    label: "Authored Surface executable catalog admission",
    kind: "coverage",
    planningQuestion:
      "How much authored Surface content with executable mechanics is admitted to an installed Unit collection?",
    numerator:
      "authored Surface executable records whose source path is installed",
    denominator:
      "authored Surface Unit-shaped records with executable mechanics",
  },
  {
    key: "profileClassificationCoverage",
    label: "Installed Unit profile classification coverage",
    kind: "coverage",
    planningQuestion:
      "Does every installed Unit have exactly one supported, unsupported, widening, or assumption disposition?",
    numerator: "installed Unit records with a profile disposition claim",
    denominator:
      "installed Unit records discovered from configured collections",
  },
  {
    key: "supportedProfileCoverage",
    label: "Supported executable Unit coverage",
    kind: "coverage",
    planningQuestion:
      "How much installed executable Unit pressure is mapped to supported mechanics profiles?",
    numerator: "installed Units with supported-profile claims",
    denominator: "installed Units with executable mechanics",
  },
  {
    key: "qntProfileModelingCoverage",
    label: "QNT profile modeling coverage",
    kind: "coverage",
    planningQuestion:
      "Do supported rule profiles that require executable semantics have QNT model owners?",
    numerator: "executable profile records with at least one QNT owner",
    denominator: "profile records whose kind requires executable evidence",
  },
  {
    key: "qntProofCoverage",
    label: "QNT proof coverage",
    kind: "coverage",
    planningQuestion: "Do supported executable profiles have proof evidence?",
    numerator: "executable profile records with qnt-proof verification owners",
    denominator: "profile records whose kind requires executable evidence",
  },
  {
    key: "runtimeMappingCoverage",
    label: "Runtime mapping coverage",
    kind: "coverage",
    planningQuestion:
      "Do supported executable profiles have production runtime owners?",
    numerator: "executable profile records with runtime owners",
    denominator: "profile records whose kind requires executable evidence",
  },
  {
    key: "runtimeParityCoverage",
    label: "Runtime parity coverage",
    kind: "coverage",
    planningQuestion:
      "Do supported executable profiles have focused MBT or runtime-test parity evidence?",
    numerator:
      "executable profile records with focused-mbt or runtime-test verification owners",
    denominator: "profile records whose kind requires executable evidence",
  },
  {
    key: "rulesKernelProfileJoinCoverage",
    label: "Rules-kernel profile join coverage",
    kind: "coverage",
    planningQuestion:
      "Do reducer-owned mechanics profiles point to rules-kernel semantic obligations?",
    numerator:
      "rules-kernel-applicable profile records with at least one profile-obligation mapping",
    denominator:
      "profile records whose kind carries reducer-owned semantics",
  },
  {
    key: "rulesKernelCoveredProfileCoverage",
    label: "Rules-kernel covered profile coverage",
    kind: "coverage",
    planningQuestion:
      "Do reducer-owned mechanics profiles point to covered rules-kernel obligations?",
    numerator:
      "rules-kernel-applicable profile records whose mapped obligations are all covered",
    denominator:
      "profile records whose kind carries reducer-owned semantics",
  },
  {
    key: "rulesKernelSupportedUnitCoverage",
    label: "Supported Unit rules-kernel chain coverage",
    kind: "coverage",
    planningQuestion:
      "Do supported Unit identities have every reducer-owned profile connected to covered rules-kernel obligations?",
    numerator:
      "supported Unit ids whose rules-kernel-applicable profiles all map to covered obligations",
    denominator:
      "installed Units with supported-profile claims and at least one rules-kernel-applicable profile",
  },
  {
    key: "deterministicAdmissionProjectionCoverage",
    label: "Deterministic admission/projection coverage",
    kind: "coverage",
    planningQuestion:
      "Which supported Unit identities have deterministic production catalog/support/projection evidence?",
    numerator:
      "supported Unit ids with deterministic-admission-projection evidence",
    denominator: "installed Units with supported-profile claims",
  },
  {
    key: "selectedIdentityMbtCoverage",
    label: "Selected identity replay coverage",
    kind: "coverage",
    planningQuestion:
      "Which supported Unit identities have intentionally selected concrete identity replay evidence?",
    numerator: "supported Unit ids with selected-identity-mbt evidence",
    denominator: "installed Units with supported-profile claims",
  },
  {
    key: "classicNonSrdExpressionGate",
    label: "Classic non-SRD expression gate",
    kind: "coverage",
    planningQuestion:
      "Did every installed Classic non-SRD mechanics-only Unit pass the public-expression gate?",
    numerator: "installed Classic non-SRD records passing validation",
    denominator: "installed Classic non-SRD records",
  },
];

function groupUnitEvidence(unitEvidence) {
  const grouped = new Map();
  for (const row of unitEvidence) {
    const current = grouped.get(row.unitId) ?? [];
    current.push(row);
    grouped.set(row.unitId, current);
  }
  return grouped;
}

function assertMetricDefinitionCoverage(matrixMetrics) {
  const metricKeys = new Set(Object.keys(matrixMetrics));
  const definitionKeys = new Set(
    metricDefinitions.map((definition) => definition.key),
  );
  const missingDefinitions = Array.from(metricKeys)
    .filter((key) => !definitionKeys.has(key))
    .sort();
  const missingMetrics = Array.from(definitionKeys)
    .filter((key) => !metricKeys.has(key))
    .sort();
  if (missingDefinitions.length > 0 || missingMetrics.length > 0) {
    fail(
      [
        missingDefinitions.length > 0
          ? `Metric definitions missing for: ${missingDefinitions.join(", ")}.`
          : undefined,
        missingMetrics.length > 0
          ? `Metrics missing for definitions: ${missingMetrics.join(", ")}.`
          : undefined,
      ]
        .filter(Boolean)
        .join(" "),
    );
  }
}

function metrics({
  inventory,
  authoredSurfaceUnits,
  profiles,
  unitClaims,
  unitEvidence,
  executableProfiles,
  deterministicAdmissionProjectionEvidenceTag,
  rulesKernelProfileJoin,
  rulesKernelSupportedUnitJoin,
  selectedIdentityMbtEvidenceTag,
}) {
  const inventoryIds = new Set(inventory.map((unit) => unit.unitId));
  const installedUnitClaims = unitClaims.filter((claim) =>
    inventoryIds.has(claim.unitId),
  );
  const classified = installedUnitClaims.length;
  const supportedUnitClaims = unitClaims.filter(
    (claim) =>
      inventoryIds.has(claim.unitId) && claim.claim.tag === "supported-profile",
  );
  const supportedUnitIds = new Set(
    supportedUnitClaims.map((claim) => claim.unitId),
  );
  const deterministicAdmissionProjection = new Set(
    unitEvidence
      .filter(
        (row) =>
          row.evidence.tag === deterministicAdmissionProjectionEvidenceTag &&
          supportedUnitIds.has(row.unitId),
      )
      .map((row) => row.unitId),
  );
  const selectedIdentityMbt = new Set(
    unitEvidence
      .filter(
        (row) =>
          row.evidence.tag === selectedIdentityMbtEvidenceTag &&
          supportedUnitIds.has(row.unitId),
      )
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
    collectionInventoryCount: {
      value: inventory.length,
      unit: "Units",
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
    rulesKernelProfileJoinCoverage:
      rulesKernelProfileJoin.metrics.rulesKernelProfileJoinCoverage,
    rulesKernelCoveredProfileCoverage:
      rulesKernelProfileJoin.metrics.rulesKernelCoveredProfileCoverage,
    rulesKernelSupportedUnitCoverage:
      rulesKernelSupportedUnitJoin.metrics.rulesKernelSupportedUnitCoverage,
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
    reason:
      "SRD spell Unit with executable mechanics; spell admission evidence needs a dedicated tracer and expansion lane.",
  };
  const magicItemBacklog = {
    category: catalogAdmissionDispositionCategory.intentionalBacklog,
    planningLane: "future magic item profile intake",
    reason:
      "SRD magic item mechanics are authored, but this QMBT lane is focused on Unit feature and spell admission.",
  };

  if (duplicateCount > 1) {
    return {
      category: catalogAdmissionDispositionCategory.duplicateContentIssue,
      planningLane: "content cleanup",
      reason:
        "More than one authored Surface record declares this Unit id; clean up the duplicate before treating it as catalog pressure.",
    };
  }

  if (unit.provenance?.kind !== "srd-5.2.1") {
    return {
      category: catalogAdmissionDispositionCategory.classicPrivatePressure,
      planningLane: "QMBT17",
      reason:
        "Non-SRD authored mechanics pressure must enter through the Classic non-SRD policy lane before catalog admission.",
    };
  }

  if (!unit.executableMechanics) {
    return {
      category: catalogAdmissionDispositionCategory.nonRuntimeAuthoredData,
      planningLane: "no promoted runtime lane",
      reason:
        "Authored SRD data has no mechanics payload, so catalog absence is not promoted runtime execution pressure.",
    };
  }

  if (unit.kind === "spell") return srdCandidate;

  if (unit.kind === "magic_item" || hasVariantMagicMechanics(unit.rawRecord)) {
    return magicItemBacklog;
  }

  return {
    category: catalogAdmissionDispositionCategory.unsupportedWideningPressure,
    planningLane: "QMBT18",
    reason:
      "Executable SRD authored data is absent from the catalog and needs an explicit unsupported profile or surface-widening slice.",
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

function claimProfiles(claim, profileMap) {
  if (
    claim?.tag !== "supported-profile" &&
    claim?.tag !== "profile-subset-supported"
  ) {
    return [];
  }
  return claim.profileIds.map((profileId) => profileMap.get(profileId));
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
    rulesKernelObligations,
    rulesKernelProfileObligations,
  },
  {
    executableProfileKinds,
    deterministicAdmissionProjectionEvidenceTag,
    selectedIdentityMbtEvidenceTag,
  },
) {
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const rulesKernelProfileJoin = buildRulesKernelProfileJoin({
    obligations: rulesKernelObligations,
    profileObligations: rulesKernelProfileObligations,
    profiles,
  });
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
        profiles: claimProfiles(claim?.claim, profileMap),
        evidence: (evidenceByUnit.get(unit.unitId) ?? []).map(
          (row) => row.evidence,
        ),
      });
    })
    .concat(
      authoredSurfaceUnits
        .filter((unit) => !installedSourcePaths.has(unit.sourceRecordPath))
        .map((unit) => {
          const claim = claimsByUnit.get(unit.unitId);
          return stable({
            unitId: unit.unitId,
            collectionId: claim?.collectionId,
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
            claim: claim?.claim,
            profiles: claimProfiles(claim?.claim, profileMap),
            evidence: [],
          });
      }),
    );
  const executableProfiles = profiles.filter((profile) =>
    executableProfileKinds.has(profile.profileKind),
  );
  const rulesKernelSupportedUnitJoin = buildRulesKernelSupportedUnitJoin(
    units,
    rulesKernelProfileJoin,
  );
  const matrixMetrics = metrics({
    inventory,
    authoredSurfaceUnits,
    profiles,
    unitClaims,
    unitEvidence,
    executableProfiles,
    deterministicAdmissionProjectionEvidenceTag,
    rulesKernelProfileJoin,
    rulesKernelSupportedUnitJoin,
    selectedIdentityMbtEvidenceTag,
  });
  assertMetricDefinitionCoverage(matrixMetrics);
  return stable({
    generatedBy: "scripts/unit-profile-coverage-check.cjs",
    collectionBoundaryNote:
      "SRD 5.2.1 is conceptually part of Classic, but stored separately for SRD provenance and distribution policy; the Classic 2024 library is a derived view.",
    collections: collections.collections,
    derivedViews: collections.derivedViews,
    metrics: matrixMetrics,
    metricSemantics: metricDefinitions,
    rulesKernelProfileJoin: {
      ...rulesKernelProfileJoin,
      supportedUnitJoin: rulesKernelSupportedUnitJoin,
    },
    units,
    profiles,
    taskClaims,
  });
}

function renderMetric(definition, metric) {
  return `| ${definition.label} | ${metric.numerator}/${metric.denominator} | ${metric.percent} |`;
}

function renderCountMetric(definition, metric) {
  return `| ${definition.label} | ${metric.value} ${metric.unit} |`;
}

function renderMetricSemantics(definition) {
  const measure =
    definition.kind === "count" ? definition.value : definition.numerator;
  return `| ${definition.label} | ${definition.planningQuestion} | ${measure} | ${definition.denominator} |`;
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

function renderProfileSubsetDeferredMechanics(claim) {
  return claim.deferredMechanics
    .map((entry) => {
      if (entry.followUpTaskId !== undefined) {
        return `${entry.mechanic} (${entry.followUpTaskId})`;
      }
      if (entry.battleReadinessClosure !== undefined) {
        return `${entry.mechanic} (closed: ${entry.battleReadinessClosure.kind})`;
      }
      return entry.mechanic;
    })
    .join("; ");
}

function renderFollowUpTasks(claim) {
  const tasks = Array.isArray(claim?.followUpTasks) ? claim.followUpTasks : [];
  return tasks
    .map(
      (task) =>
        `${task.id}: ${task.mechanic} (owner: ${task.owner}; output: ${task.requiredOutput})`,
    )
    .join("; ");
}

const installedNonRuntimeAuthoredDataKinds = new Set([
  "armor",
  "shield",
  "weapon",
]);

function installedNonRuntimeAuthoredDataDisposition(unit) {
  if (unit.collectionId !== "srd-5.2.1") return undefined;
  if (unit.catalogAdmission?.status !== "installed") return undefined;
  if (unit.claim?.tag !== "unsupported-profile") return undefined;
  if (unit.executableMechanics !== false) return undefined;
  if (!installedNonRuntimeAuthoredDataKinds.has(unit.kind)) return undefined;
  return {
    disposition: catalogAdmissionDispositionCategory.nonRuntimeAuthoredData,
    futureProfileOwner: "no promoted runtime lane",
  };
}

function renderClaimPressureDetail(claim) {
  if (claim?.tag === "profile-subset-supported") {
    return `supported subset: ${claim.supportedMechanics.join("; ")}; deferred: ${renderProfileSubsetDeferredMechanics(claim)}`;
  }
  const followUpTasks = renderFollowUpTasks(claim);
  if (followUpTasks.length > 0) {
    return `${claim?.reason ?? ""} Follow-up split: ${followUpTasks}`.trim();
  }
  return claim?.reason ?? claim?.issue ?? claim?.assumptionId ?? "";
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
  const unsupported = matrix.units.filter(
    (unit) =>
      (unit.catalogAdmission?.status === "installed" ||
        unit.claim !== undefined) &&
      unit.claim?.tag !== "supported-profile",
  );
  const supported = installedUnits.filter(
    (unit) => unit.claim?.tag === "supported-profile",
  );
  const profileSubsetSupported = installedUnits.filter(
    (unit) => unit.claim?.tag === "profile-subset-supported",
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
        const nonRuntimeDisposition =
          installedNonRuntimeAuthoredDataDisposition(unit);
        const futureProfileOwner =
          nonRuntimeDisposition?.futureProfileOwner ??
          unit.claim?.futureProfileOwner ??
          "unassigned";
        const disposition =
          nonRuntimeDisposition?.disposition ?? unit.claim?.tag ?? "missing";
        const key = [unit.collectionId, futureProfileOwner, disposition].join(
          "\u0000",
        );
        const current = groups.get(key) ?? {
          collectionId: unit.collectionId,
          futureProfileOwner,
          disposition,
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
  const countMetricDefinitions = matrix.metricSemantics.filter(
    (definition) => definition.kind === "count",
  );
  const coverageMetricDefinitions = matrix.metricSemantics.filter(
    (definition) => definition.kind === "coverage",
  );
  const rulesKernelJoin = matrix.rulesKernelProfileJoin ?? {
    profiles: [],
    supportedUnitJoin: { units: [] },
  };
  const rulesKernelProfileGroups = Array.from(
    rulesKernelJoin.profiles
      .reduce((groups, row) => {
        const current = groups.get(row.joinStatus) ?? [];
        current.push(row.profileId);
        groups.set(row.joinStatus, current);
        return groups;
      }, new Map())
      .entries(),
  ).sort(([leftStatus], [rightStatus]) => leftStatus.localeCompare(rightStatus));
  const rulesKernelUnitGroups = Array.from(
    rulesKernelJoin.supportedUnitJoin.units
      .reduce((groups, row) => {
        const current = groups.get(row.joinStatus) ?? [];
        current.push(row.unitId);
        groups.set(row.joinStatus, current);
        return groups;
      }, new Map())
      .entries(),
  ).sort(([leftStatus], [rightStatus]) => leftStatus.localeCompare(rightStatus));
  const rulesKernelProfileGaps = rulesKernelJoin.profiles.filter(
    (row) => row.joinStatus !== "covered",
  );
  const rulesKernelUnitGaps = rulesKernelJoin.supportedUnitJoin.units.filter(
    (row) => row.joinStatus !== "covered",
  );

  return `${[
    "# Unit Profile Coverage Report",
    "",
    "Generated by `scripts/unit-profile-coverage-check.cjs`.",
    "",
    "SRD 5.2.1 is conceptually part of Classic, but it is stored separately because the SRD collection has Creative Commons SRD provenance and distribution policy. The Classic 2024 library is a derived view from the SRD collection plus the Classic non-SRD mechanics-only collection; mixed authored provenance is not a valid collection state.",
    "",
    "## Report Health",
    "",
    "| Metric | Value |",
    "| --- | ---: |",
    ...countMetricDefinitions.map((definition) =>
      renderCountMetric(definition, matrix.metrics[definition.key]),
    ),
    "",
    "## Coverage Metrics",
    "",
    "| Metric | Covered | Percent |",
    "| --- | ---: | ---: |",
    ...coverageMetricDefinitions.map((definition) =>
      renderMetric(definition, matrix.metrics[definition.key]),
    ),
    "",
    "## Metric Semantics",
    "",
    "| Metric | Planning question | Measure | Denominator |",
    "| --- | --- | --- | --- |",
    ...matrix.metricSemantics.map(renderMetricSemantics),
    "",
    "## Rules-Kernel Join",
    "",
    "The Unit matrix owns authored-content breadth. `plans/rules-kernel-coverage/profile-obligations.jsonl` owns the reducer-semantic join from supported mechanics profiles to QNT-connected rules-kernel obligations.",
    "",
    "| Join status | Profile count | Profiles |",
    "| --- | ---: | --- |",
    ...(rulesKernelProfileGroups.length === 0
      ? ["| _none_ | 0 | _none_ |"]
      : rulesKernelProfileGroups.map(
          ([status, profileIds]) =>
            `| ${status} | ${profileIds.length} | ${profileIds.map((id) => `\`${id}\``).join(", ")} |`,
        )),
    "",
    "| Supported Unit join status | Unit count | Units |",
    "| --- | ---: | --- |",
    ...(rulesKernelUnitGroups.length === 0
      ? ["| _none_ | 0 | _none_ |"]
      : rulesKernelUnitGroups.map(
          ([status, unitIds]) =>
            `| ${status} | ${unitIds.length} | ${unitIds.map((id) => `\`${id}\``).join(", ")} |`,
        )),
    "",
    "### Rules-Kernel Profile Join Gaps",
    "",
    "| Profile | Kind | Status | Obligations |",
    "| --- | --- | --- | --- |",
    ...(rulesKernelProfileGaps.length === 0
      ? ["| _none_ | _none_ | _none_ | _none_ |"]
      : rulesKernelProfileGaps.map((row) => {
          const obligations =
            row.obligations.length === 0
              ? "no obligation mapping"
              : row.obligations
                  .map(
                    (obligation) =>
                      `\`${obligation.obligationId}\` (${obligation.status})`,
                  )
                  .join(", ");
          return `| \`${row.profileId}\` | ${row.profileKind} | ${row.joinStatus} | ${obligations} |`;
        })),
    "",
    "### Supported Unit Rules-Kernel Chain Gaps",
    "",
    "| Unit | Status | Profiles |",
    "| --- | --- | --- |",
    ...(rulesKernelUnitGaps.length === 0
      ? ["| _none_ | _none_ | _none_ |"]
      : rulesKernelUnitGaps.map((row) => {
          const profiles = row.profiles
            .filter((profile) => profile.joinStatus !== "covered")
            .map((profile) => `\`${profile.profileId}\` (${profile.joinStatus})`)
            .join(", ");
          return `| \`${row.unitId}\` | ${row.joinStatus} | ${profiles} |`;
        })),
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
    "## Profile Subset Supported Unit Claims",
    "",
    "| Unit | Collection | Profiles | Supported Mechanics | Deferred Mechanics |",
    "| --- | --- | --- | --- | --- |",
    ...(profileSubsetSupported.length === 0
      ? ["| _none_ | _none_ | _none_ | _none_ | _none_ |"]
      : profileSubsetSupported.map((unit) => {
          const supportedMechanics = unit.claim.supportedMechanics.join("; ");
          const deferredMechanics = renderProfileSubsetDeferredMechanics(
            unit.claim,
          );
          return `| \`${unit.unitId}\` | ${unit.collectionId} | ${unit.claim.profileIds.map((id) => `\`${id}\``).join(", ")} | ${supportedMechanics} | ${deferredMechanics} |`;
        })),
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
    "## Profile Subset Deterministic Admission/Projection Evidence",
    "",
    "| Unit | Profiles | Task | Owner | Deferred Mechanics |",
    "| --- | --- | --- | --- | --- |",
    ...(profileSubsetSupported.length === 0
      ? ["| _none_ | _none_ | _none_ | _none_ | _none_ |"]
      : profileSubsetSupported.flatMap((unit) =>
          (unit.evidence ?? [])
            .filter(
              (evidence) =>
                evidence.tag === deterministicAdmissionProjectionEvidenceTag,
            )
            .map((evidence) => {
              const deferredMechanics = renderProfileSubsetDeferredMechanics(
                unit.claim,
              );
              return `| \`${unit.unitId}\` | ${unit.claim.profileIds.map((id) => `\`${id}\``).join(", ")} | ${evidence.taskId} | \`${evidence.ownerPath}\` | ${deferredMechanics} |`;
            }),
        )),
    "",
    "## Selected Identity Replay Evidence",
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
        `| \`${unit.unitId}\` | ${unit.claim?.tag ?? "missing"} | ${renderClaimPressureDetail(unit.claim)} |`,
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
  percent,
  renderReport,
  stable,
};
