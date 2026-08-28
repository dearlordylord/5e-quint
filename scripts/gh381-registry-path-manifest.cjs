#!/usr/bin/env node

const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const obligationsPath = "plans/rules-kernel-coverage/obligations.jsonl";
const rolesPath = "plans/rules-kernel-coverage/qnt-owner-roles.jsonl";
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

function readJsonl(repoPath) {
  return fs
    .readFileSync(path.join(root, repoPath), "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line));
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

function registryHead() {
  const registryPaths = [obligationsPath, rolesPath];
  const dirty = childProcess.spawnSync(
    "git",
    ["diff", "--quiet", "--", ...registryPaths],
    { cwd: root },
  );
  if (dirty.status !== 0) {
    throw new Error(
      "Commit authored rules-kernel registry changes before generating the #381 manifest sourceHead.",
    );
  }
  return childProcess
    .execFileSync("git", ["log", "-1", "--format=%H", "--", ...registryPaths], {
      cwd: root,
      encoding: "utf8",
    })
    .trim();
}

function buildManifest({ obligations, roles, sourceHead }) {
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

  const selected = selectedObligations(obligations);
  const selectedIds = selected.map((row) => row.id);
  const activeEffects = selected
    .filter((row) => row.kind === "active-effect-lifecycle")
    .map((row) => row.id);
  const selectedInOrder = (ids) => {
    const wanted = new Set(ids);
    return selectedIds.filter((id) => wanted.has(id));
  };
  const qntRoleByPath = new Map(roles.map((row) => [row.ownerPath, row.role]));
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
    generatedFrom: [obligationsPath, rolesPath],
    sourceHead,
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
    ],
    deferredLaterIssuePaths: [
      {
        path: "scripts/raw-swarm/sdk-player/scenario-session.ts",
        issue: 385,
        reason:
          "Raw Swarm/SDK-player Effect migration owns this direct-SDK call chain.",
      },
      {
        path: "scripts/raw-swarm/sdk-player/scenario-setup-runtime.test.ts",
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

function selfTest() {
  const sample = [
    {
      id: "BATTLE.SPELL.SAMPLE",
      kind: "active-effect-lifecycle",
      runtimeOwners: ["sample.ts"],
      qntOwners: ["sample.qnt"],
      parityWitnesses: [
        {
          ownerPath: "sample.test.ts",
          qntSpecPath: "sample.mbt.qnt",
        },
      ],
    },
    { id: crossBoundaryIds[0], kind: "state-transition" },
  ];
  assert.deepEqual(
    selectedObligations(sample).map((row) => row.id),
    ["BATTLE.SPELL.SAMPLE", crossBoundaryIds[0]],
  );
  assert.deepEqual(uniqueSorted(["b", "a", "b"]), ["a", "b"]);
  console.log("#381 registry path manifest self-test OK.");
}

if (process.argv.includes("--self-test")) {
  selfTest();
  process.exit(0);
}

const manifest = buildManifest({
  obligations: readJsonl(obligationsPath),
  roles: readJsonl(rolesPath),
  sourceHead: registryHead(),
});
const rendered = `${JSON.stringify(manifest, null, 2)}\n`;
const output = path.join(root, outputPath);
if (process.argv.includes("--write")) {
  fs.writeFileSync(output, rendered);
  console.log(`Wrote ${outputPath}.`);
} else if (
  !fs.existsSync(output) ||
  fs.readFileSync(output, "utf8") !== rendered
) {
  console.error(
    `${outputPath} is stale. Run pnpm gh381-registry-path-manifest:write.`,
  );
  process.exitCode = 1;
} else {
  console.log(
    `#381 registry path manifest OK: ${manifest.obligationIds.length} obligations.`,
  );
}

module.exports = { buildManifest, selectedObligations, uniqueSorted };
