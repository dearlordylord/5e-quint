const {
  rulesKernelProfileKinds,
} = require("./unit-profile-coverage-config.cjs");

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

function percent(numerator, denominator) {
  if (denominator === 0) return "n/a";
  return `${Math.round((numerator / denominator) * 1000) / 10}%`;
}

function countCoverage(numerator, denominator) {
  return {
    numerator,
    denominator,
    percent: percent(numerator, denominator),
  };
}

function hasQntOwner(profile) {
  return (profile.qntOwners ?? []).length > 0;
}

function isRulesKernelProfileKind(profile) {
  return rulesKernelProfileKinds.has(profile.profileKind);
}

function isRulesKernelProfile(profile, profileObligationMap = new Map()) {
  return (
    isRulesKernelProfileKind(profile) &&
    (hasQntOwner(profile) || profileObligationMap.has(profile.id))
  );
}

function uniqueSorted(values) {
  return Array.from(new Set(values)).sort();
}

function buildProfileObligationMap(profileObligations) {
  return profileObligations.reduce((groups, row) => {
    const current = groups.get(row.profileId) ?? {
      followUpTaskIds: [],
      obligationIds: [],
    };
    current.obligationIds.push(...(row.obligationIds ?? []));
    current.followUpTaskIds.push(...(row.followUpTaskIds ?? []));
    if (row.reason !== undefined) current.reason = row.reason;
    groups.set(row.profileId, current);
    return groups;
  }, new Map());
}

function profileJoinStatus(obligationIds, obligationsById) {
  if (obligationIds.length === 0) return "unmapped";
  return obligationIds.every(
    (obligationId) => obligationsById.get(obligationId)?.status === "covered",
  )
    ? "covered"
    : "mapped-open";
}

function buildRulesKernelProfileJoin({
  obligations,
  profileObligations,
  profiles,
}) {
  const obligationsById = new Map(
    obligations.map((obligation) => [obligation.id, obligation]),
  );
  const obligationIdsByProfile = buildProfileObligationMap(profileObligations);
  const rows = profiles
    .filter((profile) => isRulesKernelProfile(profile, obligationIdsByProfile))
    .map((profile) => {
      const mapping = obligationIdsByProfile.get(profile.id) ?? {
        followUpTaskIds: [],
        obligationIds: [],
      };
      const obligationIds = uniqueSorted(mapping.obligationIds);
      const obligationRows = obligationIds.map((obligationId) => {
        const obligation = obligationsById.get(obligationId);
        return {
          obligationId,
          ...((obligation?.followUpTaskIds ?? []).length > 0
            ? { followUpTaskIds: obligation.followUpTaskIds }
            : {}),
          runtime: obligation?.runtime ?? "unknown",
          status: obligation?.status ?? "unknown",
          title: obligation?.title ?? "unknown obligation",
        };
      });
      return stable({
        profileId: profile.id,
        profileKind: profile.profileKind,
        qntOwners: uniqueSorted(profile.qntOwners ?? []),
        ...(mapping.followUpTaskIds.length > 0
          ? { followUpTaskIds: uniqueSorted(mapping.followUpTaskIds) }
          : {}),
        ...(mapping.reason !== undefined ? { gapReason: mapping.reason } : {}),
        joinStatus: profileJoinStatus(obligationIds, obligationsById),
        obligations: obligationRows,
      });
    });
  const mapped = rows.filter((row) => row.joinStatus !== "unmapped");
  const covered = rows.filter((row) => row.joinStatus === "covered");
  return stable({
    sourceArtifacts: {
      obligations: "plans/rules-kernel-coverage/obligations.jsonl",
      profileObligations:
        "plans/rules-kernel-coverage/profile-obligations.jsonl",
    },
    denominatorRule:
      "profile records with rules-kernel profile kinds and either QNT owners or explicit profile-obligation mappings",
    profileKinds: Array.from(rulesKernelProfileKinds).sort(),
    metrics: {
      rulesKernelProfileJoinCoverage: countCoverage(mapped.length, rows.length),
      rulesKernelCoveredProfileCoverage: countCoverage(
        covered.length,
        rows.length,
      ),
    },
    profiles: rows,
  });
}

function rulesKernelJoinByProfileId(rulesKernelProfileJoin) {
  return new Map(
    (rulesKernelProfileJoin?.profiles ?? []).map((row) => [
      row.profileId,
      row,
    ]),
  );
}

function rulesKernelUnitJoin(unit, rulesKernelProfileJoin) {
  const joinByProfileId = rulesKernelJoinByProfileId(rulesKernelProfileJoin);
  const profileRows = (unit.profiles ?? [])
    .map((profile) => joinByProfileId.get(profile.id))
    .filter((join) => join !== undefined);
  const joinStatus =
    profileRows.length === 0
      ? "no-rules-kernel-profile"
      : profileRows.every((row) => row.joinStatus === "covered")
        ? "covered"
        : profileRows.some((row) => row.joinStatus === "unmapped")
          ? "unmapped"
          : "mapped-open";
  return stable({
    unitId: unit.unitId,
    joinStatus,
    profiles: profileRows,
  });
}

function buildRulesKernelSupportedUnitJoin(units, rulesKernelProfileJoin) {
  const rows = units
    .filter((unit) => unit.claim?.tag === "supported-profile")
    .map((unit) => rulesKernelUnitJoin(unit, rulesKernelProfileJoin))
    .filter((row) => row.profiles.length > 0)
    .sort((left, right) => left.unitId.localeCompare(right.unitId));
  const covered = rows.filter((row) => row.joinStatus === "covered");
  return stable({
    denominatorRule:
      "supported Unit ids with at least one rules-kernel-applicable profile",
    metrics: {
      rulesKernelSupportedUnitCoverage: countCoverage(
        covered.length,
        rows.length,
      ),
    },
    units: rows,
  });
}

module.exports = {
  buildRulesKernelProfileJoin,
  buildRulesKernelSupportedUnitJoin,
  isRulesKernelProfile,
  isRulesKernelProfileKind,
  rulesKernelUnitJoin,
};
