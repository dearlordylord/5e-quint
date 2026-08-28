#!/usr/bin/env node

const childProcess = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const obligationsPath = "plans/rules-kernel-coverage/obligations.jsonl";
const rolesPath = "plans/rules-kernel-coverage/qnt-owner-roles.jsonl";
const generatorPath = "scripts/gh381-registry-path-manifest.cjs";
const outputPath = "docs/migrations/effect-4/gh381-registry-path-manifest.json";

const crossBoundaryIds = [
  "BATTLE.SPELL.DRAGONS_BREATH_GRANTED_ACTION",
  "BATTLE.SPELL.ANTIMAGIC_FIELD_ACTION_INTERDICTION",
  "BATTLE.REACTION.OFFER_DECLINE_RESUME",
  "BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY",
  "BATTLE.PROTOCOL.CONCENTRATION_BREAK_TEARDOWN",
  "BATTLE.COMPOSITION.TURN_BOUNDARY_EFFECT_LIFECYCLE_ORDERING",
];

const directMigratedAdapterIds = [
  "BATTLE.SPELL.MIRROR_IMAGE_HIT_INTERCEPTION",
  "BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE",
  "BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE",
  "BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_DAMAGE_PENALTY",
  "BATTLE.SPELL.SEE_INVISIBILITY_OBSERVER_SIGHT",
];

const spatialHazardIds = new Set([
  "BATTLE.SPELL.SLEET_STORM_AREA_HAZARD_LIFECYCLE",
  "BATTLE.SPELL.INSECT_PLAGUE_AREA_HAZARD_LIFECYCLE",
  "BATTLE.SPELL.CLOUDKILL_AREA_HAZARD_LIFECYCLE",
  "BATTLE.SPELL.WEB_RESTRAINT_HAZARD_LIFECYCLE",
  "BATTLE.SPELL.GUST_OF_WIND_LINE_LIFECYCLE",
  "BATTLE.SPELL.SPIKE_GROWTH_MOVEMENT_HAZARD",
  "BATTLE.SPELL.GREASE_GROUND_HAZARD_LIFECYCLE",
  "BATTLE.SPELL.FOG_CLOUD_OBSCUREMENT_LIFECYCLE",
  "BATTLE.SPELL.MAGICAL_DARKNESS_POINT_ORIGIN_LIFECYCLE",
  "BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE",
  "BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE",
]);

const concentrationExclusions = new Set([
  "BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE",
  "BATTLE.SPELL.SEE_INVISIBILITY_OBSERVER_SIGHT",
  "BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE",
  "BATTLE.SPELL.DISPEL_MAGIC_ONGOING_SPELL_ENDING",
  "BATTLE.SPELL.GREASE_GROUND_HAZARD_LIFECYCLE",
  "BATTLE.SPELL.OBJECT_LIGHT_EMITTER_LIFECYCLE",
  "BATTLE.SPELL.HELD_LIGHT_EMITTER_LIFECYCLE",
  "BATTLE.SPELL.FEATHER_FALL_MITIGATION_LIFECYCLE",
  "BATTLE.SPELL.JUMP_MOVEMENT_REPLACEMENT_LIFECYCLE",
  "BATTLE.SPELL.FORCED_REACTION_MOVEMENT_LIFECYCLE",
  "BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION",
  "BATTLE.SPELL.MIRROR_IMAGE_HIT_INTERCEPTION",
  "BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING",
  "BATTLE.SPELL.ACID_ARROW_ATTACK_TIMING",
  "BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY",
  "BATTLE.COMPOSITION.TURN_BOUNDARY_EFFECT_LIFECYCLE_ORDERING",
]);

const relatedButNotSelectedObligations = [
  {
    id: "BATTLE.SPELL.READIED_RESPONSE_PROCEDURE",
    reason:
      "Profile-procedure obligation already audited in the #380 spell-execution lane; generic Reaction/continuation evidence is selected here.",
  },
  {
    id: "BATTLE.SPELL.SPIRITUAL_WEAPON_ATTACK_PROXY",
    reason:
      "Profile-procedure obligation; not an active-effect-lifecycle row. Revisit if #381 migration diagnostics or persistent-spell ownership expands beyond the selected lifecycle family.",
  },
  {
    id: "BATTLE.SPELL.ANTIMAGIC_FIELD_MAGICAL_EFFECT_INTERDICTION",
    reason:
      "State-transition row is outside the selected active-effect lifecycle family; ongoing aura suppression is represented by the selected Antimagic rows.",
  },
  {
    id: "BATTLE.SPELL.ANTIMAGIC_FIELD_TRANSIT_BLOCKING",
    reason:
      "State-transition teleport boundary is outside the selected active-effect lifecycle family.",
  },
  {
    id: "BATTLE.SPELL.GLYPH_EXPLOSIVE_RUNE_RELEASE",
    reason:
      "State-transition release branch is downstream of the selected durable occurrence lifecycle.",
  },
  {
    id: "BATTLE.SPELL.GLYPH_STORED_SPELL_RELEASE",
    reason:
      "State-transition release branch is downstream of the selected durable occurrence lifecycle.",
  },
];

function readJsonl(rootPath, repoPath) {
  return fs
    .readFileSync(path.join(rootPath, repoPath), "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line));
}

function normalizeRepositoryPath(rootPath, candidate, label) {
  if (typeof candidate !== "string" || candidate.trim() === "") {
    throw new Error(`${label} must be a nonempty repository-relative path.`);
  }
  if (candidate.startsWith("-")) {
    throw new Error(`${label} must not be option-like: ${candidate}`);
  }
  if (path.posix.isAbsolute(candidate) || path.win32.isAbsolute(candidate)) {
    throw new Error(`${label} must be repository-relative: ${candidate}`);
  }
  const slashPath = candidate.replaceAll("\\", "/");
  if (slashPath.split("/").includes("..")) {
    throw new Error(`${label} must not contain parent traversal: ${candidate}`);
  }
  const normalized = path.posix.normalize(slashPath);
  if (normalized === "." || normalized.startsWith("../")) {
    throw new Error(`${label} must name a file below the repository root.`);
  }
  const canonicalRoot = fs.realpathSync(rootPath);
  const absolute = path.resolve(canonicalRoot, normalized);
  const relative = path.relative(canonicalRoot, absolute);
  if (
    relative === "" ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error(
      `${label} resolves outside the repository root: ${candidate}`,
    );
  }
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
    throw new Error(
      `${label} must resolve to an existing regular file: ${normalized}`,
    );
  }
  const canonicalFile = fs.realpathSync(absolute);
  const canonicalRelative = path.relative(canonicalRoot, canonicalFile);
  if (
    canonicalRelative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(canonicalRelative)
  ) {
    throw new Error(
      `${label} resolves through a link outside the repository root.`,
    );
  }
  return normalized;
}

function sha256File(rootPath, repoPath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(rootPath, repoPath)))
    .digest("hex");
}

function normalizeProvenance(rootPath, provenance) {
  if (!/^[0-9a-f]{40}(?:[0-9a-f]{24})?$/.test(provenance.registryCommit)) {
    throw new Error("provenance.registryCommit must be a Git object id.");
  }
  const normalizeHashedPath = (entry, label) => {
    const repoPath = normalizeRepositoryPath(rootPath, entry.path, label);
    if (!/^[0-9a-f]{64}$/.test(entry.sha256)) {
      throw new Error(`${label} must include a lowercase SHA-256 digest.`);
    }
    const actual = sha256File(rootPath, repoPath);
    if (entry.sha256 !== actual) {
      throw new Error(`${label} SHA-256 does not match ${repoPath}.`);
    }
    return { path: repoPath, sha256: entry.sha256 };
  };
  const generator = normalizeHashedPath(
    provenance.generator,
    "generator provenance",
  );
  if (generator.path !== generatorPath) {
    throw new Error(`generator provenance must identify ${generatorPath}.`);
  }
  const inputs = provenance.inputs.map((entry) =>
    normalizeHashedPath(entry, "registry input provenance"),
  );
  if (
    JSON.stringify(inputs.map((entry) => entry.path)) !==
    JSON.stringify([obligationsPath, rolesPath])
  ) {
    throw new Error(
      "registry input provenance must identify obligations.jsonl and qnt-owner-roles.jsonl in canonical order.",
    );
  }
  return { registryCommit: provenance.registryCommit, generator, inputs };
}

function uniqueSorted(values) {
  return Array.from(new Set(values)).sort();
}

function selectedObligations(obligations) {
  const crossBoundary = new Set(crossBoundaryIds);
  return obligations.filter(
    (row) =>
      (row.id.startsWith("BATTLE.SPELL.") &&
        ["active-effect-lifecycle", "reaction-continuation"].includes(
          row.kind,
        )) ||
      crossBoundary.has(row.id),
  );
}

function requireKnownIds(obligations, ids, label) {
  const known = new Set(obligations.map((row) => row.id));
  const missing = ids.filter((id) => !known.has(id));
  if (missing.length > 0) {
    throw new Error(
      `${label} references unknown obligations: ${missing.join(", ")}`,
    );
  }
}

function registryCommit(rootPath) {
  const registryPaths = [obligationsPath, rolesPath];
  const hasRegistryDiff = (args) =>
    childProcess.spawnSync("git", [...args, "--", ...registryPaths], {
      cwd: rootPath,
    }).status !== 0;
  if (
    hasRegistryDiff(["diff", "--quiet"]) ||
    hasRegistryDiff(["diff", "--cached", "--quiet"])
  ) {
    throw new Error(
      "Commit authored rules-kernel registry changes before generating #381 registry provenance.",
    );
  }
  return childProcess
    .execFileSync("git", ["log", "-1", "--format=%H", "--", ...registryPaths], {
      cwd: rootPath,
      encoding: "utf8",
    })
    .trim();
}

function buildProvenance(rootPath) {
  const inputPaths = [obligationsPath, rolesPath].map((repoPath) =>
    normalizeRepositoryPath(rootPath, repoPath, "provenance input"),
  );
  const normalizedGeneratorPath = normalizeRepositoryPath(
    rootPath,
    generatorPath,
    "generator provenance path",
  );
  return {
    registryCommit: registryCommit(rootPath),
    generator: {
      path: normalizedGeneratorPath,
      sha256: sha256File(rootPath, normalizedGeneratorPath),
    },
    inputs: inputPaths.map((repoPath) => ({
      path: repoPath,
      sha256: sha256File(rootPath, repoPath),
    })),
  };
}

function buildManifest({ obligations, provenance, roles, rootPath }) {
  requireKnownIds(obligations, crossBoundaryIds, "crossBoundaryIds");
  requireKnownIds(
    obligations,
    directMigratedAdapterIds,
    "directMigratedAdapters",
  );
  requireKnownIds(obligations, Array.from(spatialHazardIds), "spatialHazards");
  requireKnownIds(
    obligations,
    relatedButNotSelectedObligations.map((row) => row.id),
    "relatedButNotSelectedObligations",
  );

  const normalizePath = (candidate, label) =>
    normalizeRepositoryPath(rootPath, candidate, label);
  const normalizedProvenance = normalizeProvenance(rootPath, provenance);
  const selected = selectedObligations(obligations).map((row) => ({
    ...row,
    qntOwners: (row.qntOwners ?? []).map((ownerPath) =>
      normalizePath(ownerPath, `${row.id} qntOwner`),
    ),
    runtimeOwners: (row.runtimeOwners ?? []).map((ownerPath) =>
      normalizePath(ownerPath, `${row.id} runtimeOwner`),
    ),
    parityWitnesses: (row.parityWitnesses ?? []).map((witness) => ({
      ...witness,
      ownerPath: normalizePath(
        witness.ownerPath,
        `${row.id} parity witness owner`,
      ),
      ...(witness.qntSpecPath === undefined
        ? {}
        : {
            qntSpecPath: normalizePath(
              witness.qntSpecPath,
              `${row.id} parity witness QNT spec`,
            ),
          }),
    })),
  }));
  const selectedIds = selected.map((row) => row.id);
  const activeEffects = selected
    .filter((row) => row.kind === "active-effect-lifecycle")
    .map((row) => row.id);
  const selectedInOrder = (ids) => {
    const wanted = new Set(ids);
    return selectedIds.filter((id) => wanted.has(id));
  };
  const qntRoleByPath = new Map();
  for (const row of roles) {
    const ownerPath = normalizePath(row.ownerPath, "QNT owner role path");
    if (qntRoleByPath.has(ownerPath)) {
      throw new Error(`Duplicate QNT owner role path: ${ownerPath}.`);
    }
    qntRoleByPath.set(ownerPath, row.role);
  }
  const qntOwnerPaths = uniqueSorted(
    selected.flatMap((row) => row.qntOwners ?? []),
  );
  const unregistered = qntOwnerPaths.filter(
    (ownerPath) => !qntRoleByPath.has(ownerPath),
  );
  const rolePaths = (role) =>
    qntOwnerPaths.filter((ownerPath) => qntRoleByPath.get(ownerPath) === role);
  const semanticCorePaths = rolePaths("semantic-core");
  const bridgePaths = rolePaths("bridge");
  const mbtFixturePaths = rolePaths("mbt-fixture");
  const proofOnlyPaths = rolePaths("proof-only");
  const selectedIdentityTracePaths = rolePaths("selected-identity-trace");
  const nonAuthorityQntPaths = uniqueSorted([
    ...bridgePaths,
    ...mbtFixturePaths,
    ...proofOnlyPaths,
    ...selectedIdentityTracePaths,
    ...unregistered,
  ]);
  const sourceOrPurePaths = uniqueSorted([
    ...selected.flatMap((row) => row.runtimeOwners ?? []),
    ...semanticCorePaths,
  ]);
  const parityOrFixturePaths = uniqueSorted([
    ...selected.flatMap((row) =>
      (row.parityWitnesses ?? []).map((witness) => witness.ownerPath),
    ),
    ...nonAuthorityQntPaths,
  ]);
  const qntFixtureSpecPaths = uniqueSorted(
    selected.flatMap((row) =>
      (row.parityWitnesses ?? []).flatMap((witness) =>
        witness.qntSpecPath === undefined ? [] : [witness.qntSpecPath],
      ),
    ),
  );

  const grantedActions = selectedInOrder([
    "BATTLE.SPELL.DRAGONS_BREATH_INITIAL_EFFECT_STATE",
    "BATTLE.SPELL.DRAGONS_BREATH_GRANTED_ACTION",
    "BATTLE.SPELL.HASTE_POSITIVE_EFFECTS",
  ]);
  const spellReactionsAndInterruption = selectedInOrder([
    "BATTLE.REACTION.OFFER_DECLINE_RESUME",
    "BATTLE.SPELL.FEATHER_FALL_MITIGATION_LIFECYCLE",
    "BATTLE.SPELL.FORCED_REACTION_MOVEMENT_LIFECYCLE",
    "BATTLE.SPELL.REACTION_CASTING_TIME",
    "BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY",
    "BATTLE.PROTOCOL.CONCENTRATION_BREAK_TEARDOWN",
  ]);
  const suppression = selectedInOrder([
    "BATTLE.SPELL.ANTIMAGIC_FIELD_ONGOING_SUPPRESSION",
    "BATTLE.SPELL.ANTIMAGIC_FIELD_ACTION_INTERDICTION",
  ]);
  const expirationAndCleanup = selectedInOrder([
    ...activeEffects,
    "BATTLE.SPELL.REACTION_CASTING_TIME",
    "BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY",
    "BATTLE.COMPOSITION.TURN_BOUNDARY_EFFECT_LIFECYCLE_ORDERING",
    "BATTLE.PROTOCOL.CONCENTRATION_BREAK_TEARDOWN",
  ]);

  return {
    generatedFrom: [obligationsPath, rolesPath].map((repoPath) =>
      normalizePath(repoPath, "generatedFrom path"),
    ),
    provenance: normalizedProvenance,
    issue: 381,
    selectionRule:
      "All BATTLE.SPELL active-effect-lifecycle and reaction-continuation obligations, plus the explicit granted-action, suppression, reaction/interruption, concentration-teardown, and turn-boundary cross-boundary rows listed in crossBoundaryIds.",
    crossBoundaryIds,
    obligationIds: selectedIds,
    obligationGroups: {
      directMigratedAdapters: selectedInOrder(directMigratedAdapterIds),
      concentrationAndContinuation: selectedIds.filter(
        (id) => !concentrationExclusions.has(id),
      ),
      ongoingPersistentAndActiveEffects: activeEffects,
      activeEffects,
      spatialHazards: selectedInOrder(Array.from(spatialHazardIds)),
      grantedActions,
      spellReactionsAndInterruption,
      suppression,
      expirationAndCleanup,
    },
    sourceOrPurePaths,
    parityOrFixturePaths,
    qntFixtureSpecPaths,
    qntOwnerAccounting: {
      unit: "Unique qntOwners resolved through qnt-owner-roles.jsonl; semantic-core is the only QNT authority class.",
      counts: {
        semanticCore: semanticCorePaths.length,
        bridge: bridgePaths.length,
        mbtFixture: mbtFixturePaths.length,
        proofOnly: proofOnlyPaths.length,
        selectedIdentityTrace: selectedIdentityTracePaths.length,
        unregistered: unregistered.length,
        totalResolvedOwnerPaths: qntOwnerPaths.length,
      },
      semanticCorePaths,
      nonAuthorityPaths: {
        bridge: bridgePaths,
        mbtFixture: mbtFixturePaths,
        proofOnly: proofOnlyPaths,
        selectedIdentityTrace: selectedIdentityTracePaths,
      },
      unregisteredObligations: selected
        .filter((row) =>
          (row.qntOwners ?? []).some((ownerPath) =>
            unregistered.includes(ownerPath),
          ),
        )
        .map((row) => ({
          id: row.id,
          status: "needs-qnt-owner",
          ownerRole: "unregistered",
          reason:
            "Registry qntOwners include a path absent from qnt-owner-roles.jsonl; it is not treated as QNT authority until a role-backed owner is added.",
        })),
    },
    deferredScriptPaths: [
      "scripts/raw-swarm/sdk-player/scenario-session.ts",
      "scripts/raw-swarm/sdk-player/scenario-setup-runtime.test.ts",
    ].map((repoPath) => normalizePath(repoPath, "deferred script path")),
    deferredLaterIssuePaths: [
      {
        path: normalizePath(
          "scripts/raw-swarm/sdk-player/scenario-session.ts",
          "deferred later-issue path",
        ),
        issue: 385,
        reason:
          "Raw Swarm/SDK-player Effect migration owns this direct-SDK call chain.",
      },
      {
        path: normalizePath(
          "scripts/raw-swarm/sdk-player/scenario-setup-runtime.test.ts",
          "deferred later-issue path",
        ),
        issue: 385,
        reason:
          "Downstream script consumer evidence is migrated with the scenario-session call chain.",
      },
    ],
    relatedButNotSelectedObligations,
    pathCounts: {
      obligationCount: selectedIds.length,
      sourceOrPure: sourceOrPurePaths.length,
      parityOrFixture: parityOrFixturePaths.length,
      qntFixtureSpec: qntFixtureSpecPaths.length,
      deferredLaterIssue: 2,
    },
    staticScopeNotes: {
      authority:
        "Tests, MBT fixtures, bridge QNT, proof-only QNT, and selected-identity traces are retained as parity/non-authority evidence; they are not semantic-core authority.",
      registryGaps:
        unregistered.length === 0
          ? "Every selected qntOwner has an authored role; no selected #381 obligation is unregistered."
          : `${unregistered.length} selected qntOwner path(s) lack an authored role and remain non-authority.`,
      authoredIdentity:
        "The #381 manifest accounts for registry-selected source and evidence paths only; it does not authorize production execution dispatch by authored spell identity.",
      concurrency:
        "No Fiber, Scope, Layer, Stream, PubSub, Queue, Deferred, or Ref ownership change is implied by registry path accounting.",
    },
  };
}

function synchronizeManifest({ output, rendered, write }) {
  if (write) {
    fs.writeFileSync(output, rendered);
    return "written";
  }
  return fs.existsSync(output) && fs.readFileSync(output, "utf8") === rendered
    ? "current"
    : "stale";
}

function main() {
  const provenance = buildProvenance(root);
  const manifest = buildManifest({
    obligations: readJsonl(root, obligationsPath),
    provenance,
    roles: readJsonl(root, rolesPath),
    rootPath: root,
  });
  const rendered = `${JSON.stringify(manifest, null, 2)}\n`;
  const status = synchronizeManifest({
    output: path.join(root, outputPath),
    rendered,
    write: process.argv.includes("--write"),
  });
  if (status === "written") {
    console.log(`Wrote ${outputPath}.`);
  } else if (status === "stale") {
    console.error(
      `${outputPath} is stale. Run pnpm gh381-registry-path-manifest:write.`,
    );
    process.exitCode = 1;
  } else {
    console.log(
      `#381 registry path manifest OK: ${manifest.obligationIds.length} obligations.`,
    );
  }
}

if (require.main === module) main();

module.exports = {
  buildManifest,
  buildProvenance,
  crossBoundaryIds,
  directMigratedAdapterIds,
  normalizeRepositoryPath,
  relatedButNotSelectedObligations,
  registryCommit,
  selectedObligations,
  spatialHazardIds,
  synchronizeManifest,
  uniqueSorted,
};
