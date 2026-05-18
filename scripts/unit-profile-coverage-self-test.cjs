const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  selectedIdentityMbtEvidenceTag,
} = require("./unit-profile-coverage-config.cjs");
const {
  extractDriverSchemaActionNames,
  extractMbtFixtureActionSet,
  extractSelectedUnitIdentityReplays,
} = require("./unit-profile-coverage-claim-scan.cjs");
const {
  hasExecutableMechanics,
  hasVariantMagicMechanics,
} = require("./unit-profile-coverage-discovery.cjs");
const { fail, toRepoPath } = require("./unit-profile-coverage-io.cjs");
const {
  validateCollections,
  validateCoverageInputs,
  validateOwnerClaims,
} = require("./unit-profile-coverage-validation.cjs");

function runSelfTest(root) {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "unit-profile-coverage-self-test-"),
  );
  try {
    const specPath = path.join(tempDir, "fixture.mbt.qnt");
    const testPath = path.join(tempDir, "fixture.mbt.test.ts");
    fs.writeFileSync(
      specPath,
      [
        "module fixture {",
        "  action doReachableBareString = true",
        "  action doReachableAction = true",
        "  action doReachableWrongUnit = true",
        "  action step = any {",
        "    doReachableBareString,",
        "    doReachableAction,",
        "    doReachableWrongUnit,",
        "  }",
        "}",
        "",
      ].join("\n"),
    );
    const testText = [
      "const driverSchema = {",
      "  doReachableAction: {},",
      "  doDriverOnly: {},",
      "} as const;",
      "const selectedUnitIdentityReplays = [",
      "  {",
      '    taskId: "QMBT10",',
      '    unitId: "fixture_unit",',
      '    actions: ["doReachableAction"],',
      "    sequences: [],",
      "  },",
      "] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;",
      "const driver = defineDriver(driverSchema, () => ({",
      '  doReachableAction: () => unitFeatureSubject("fixture_unit"),',
      "}));",
      'it("replays selected Unit identities deterministically", () => {',
      "  for (const replay of selectedUnitIdentityReplays) {",
      "    for (const sequence of replay.sequences) {",
      "      void sequence;",
      "    }",
      "  }",
      "});",
      "await run({",
      '  spec: path.resolve(import.meta.dirname, "./fixture.mbt.qnt"),',
      '  step: "step",',
      "});",
      "",
    ].join("\n");
    const fixtureActionSet = extractMbtFixtureActionSet(
      root,
      testText,
      testPath,
    );
    const issues = validateOwnerClaims(
      [],
      [],
      [],
      {
        unitEvidence: [],
        unitIdentityMbtReplays: [
          {
            ownerPath: "fixture/rule-core-features.mbt.test.ts",
            line: 1,
            taskId: "QMBT10",
            unitId: "fixture_unit",
            actionNames: ["doDriverOnly"],
            declaredActions: extractDriverSchemaActionNames(testText),
            stepActionNames: fixtureActionSet.actionNames,
            stepDescription: fixtureActionSet.description,
          },
          {
            ownerPath: "fixture/rule-core-features.mbt.test.ts",
            line: 2,
            taskId: "QMBT10",
            unitId: "fixture_unit",
            actionNames: ["doReachableAction"],
            declaredActions: extractDriverSchemaActionNames(testText),
            stepActionNames: fixtureActionSet.actionNames,
            stepDescription: fixtureActionSet.description,
          },
          {
            ownerPath: "fixture/rule-core-features.mbt.test.ts",
            line: 3,
            taskId: "QMBT10",
            unitId: "fixture_unit",
            actionNames: ["doReachableAction", "doDriverOnly"],
            declaredActions: extractDriverSchemaActionNames(testText),
            stepActionNames: fixtureActionSet.actionNames,
            stepDescription: fixtureActionSet.description,
          },
        ],
        selectedUnitIdentityReplays: extractSelectedUnitIdentityReplays(
          testText,
        ).map((replay) => ({
          ownerPath: "fixture/rule-core-features.mbt.test.ts",
          ...replay,
        })),
        selectedUnitIdentityReplayConsumers: [
          { ownerPath: "fixture/rule-core-features.mbt.test.ts" },
        ],
      },
      [
        {
          unitId: "fixture_unit",
          evidence: {
            ownerPath: "fixture/rule-core-features.mbt.test.ts",
            tag: selectedIdentityMbtEvidenceTag,
            taskId: "QMBT10",
          },
        },
      ],
    );
    const expected = `fixture/rule-core-features.mbt.test.ts:1 cites Unit identity MBT replay action doDriverOnly that is not reachable from ${toRepoPath(root, specPath)} step.`;
    if (!issues.includes(expected)) {
      fail(
        `Self-test failed: expected unreachable Quint step action issue, got ${JSON.stringify(issues)}`,
      );
    }
    const actionMismatchExpected =
      "fixture/rule-core-features.mbt.test.ts:3 claims selected identity MBT replay actions for fixture_unit that do not match deterministic replay data.";
    if (!issues.includes(actionMismatchExpected)) {
      fail(
        `Self-test failed: expected deterministic replay action mismatch issue, got ${JSON.stringify(issues)}`,
      );
    }
    const boundaryIssue = issues.find(
      (issue) =>
        issue ===
        "fixture/rule-core-features.mbt.test.ts:2 claims selected identity MBT replay actions for fixture_unit that do not match deterministic replay data.",
    );
    if (boundaryIssue !== undefined) {
      fail(
        `Self-test failed: expected matching deterministic replay action marker to pass, got ${JSON.stringify(issues)}`,
      );
    }
    const taskClaimDriftIssues = validateOwnerClaims(
      [
        {
          id: "fixture.profile",
          qntOwners: [],
          runtimeOwners: [],
          verificationOwners: [
            { kind: "qnt-proof", ownerPath: "fixture/proof.qnt" },
            { kind: "focused-mbt", ownerPath: "fixture/parity.test.ts" },
          ],
          taskRefs: ["QCORE_FIXTURE", "QMBT_FIXTURE"],
        },
      ],
      [
        {
          taskId: "QCORE_FIXTURE",
          claimKind: "qnt-proof",
          profileIds: [],
        },
        {
          taskId: "QMBT_FIXTURE",
          claimKind: "completed-runtime-parity",
          profileIds: [],
        },
      ],
      [
        {
          ownerPath: "fixture/proof.qnt",
          claimKind: "verification-owner:qnt-proof",
          profileIds: ["fixture.profile"],
        },
        {
          ownerPath: "fixture/parity.test.ts",
          claimKind: "verification-owner:focused-mbt",
          profileIds: ["fixture.profile"],
        },
      ],
      {
        unitEvidence: [],
        unitIdentityMbtReplays: [],
        selectedUnitIdentityReplays: [],
        selectedUnitIdentityReplayConsumers: [],
      },
      [],
    );
    for (const expectedIssue of [
      "fixture.profile has qnt-proof verification ownership but no qnt-proof task claim.",
      "fixture.profile has runtime parity verification ownership but no completed runtime parity task claim.",
      "fixture.profile taskRefs includes QCORE_FIXTURE but no matching task claim includes the profile.",
      "fixture.profile taskRefs includes QMBT_FIXTURE but no matching task claim includes the profile.",
    ]) {
      if (!taskClaimDriftIssues.includes(expectedIssue)) {
        fail(
          `Self-test failed: expected task claim drift issue ${JSON.stringify(expectedIssue)}, got ${JSON.stringify(taskClaimDriftIssues)}`,
        );
      }
    }
    const reverseTaskClaimDriftIssues = validateOwnerClaims(
      [
        {
          id: "fixture.profile",
          qntOwners: [],
          runtimeOwners: [],
          verificationOwners: [
            { kind: "qnt-proof", ownerPath: "fixture/proof.qnt" },
            { kind: "focused-mbt", ownerPath: "fixture/parity.test.ts" },
          ],
          taskRefs: [],
        },
      ],
      [
        {
          taskId: "QCORE_STRAY",
          claimKind: "qnt-proof",
          profileIds: ["fixture.profile"],
        },
        {
          taskId: "QMBT_STRAY",
          claimKind: "completed-runtime-parity",
          profileIds: ["fixture.profile"],
        },
      ],
      [
        {
          ownerPath: "fixture/proof.qnt",
          claimKind: "verification-owner:qnt-proof",
          profileIds: ["fixture.profile"],
        },
        {
          ownerPath: "fixture/parity.test.ts",
          claimKind: "verification-owner:focused-mbt",
          profileIds: ["fixture.profile"],
        },
      ],
      {
        unitEvidence: [],
        unitIdentityMbtReplays: [],
        selectedUnitIdentityReplays: [],
        selectedUnitIdentityReplayConsumers: [],
      },
      [],
    );
    for (const expectedIssue of [
      "Task claim QCORE_STRAY includes fixture.profile but the profile taskRefs do not include the task.",
      "Task claim QMBT_STRAY includes fixture.profile but the profile taskRefs do not include the task.",
    ]) {
      if (!reverseTaskClaimDriftIssues.includes(expectedIssue)) {
        fail(
          `Self-test failed: expected reverse task claim drift issue ${JSON.stringify(expectedIssue)}, got ${JSON.stringify(reverseTaskClaimDriftIssues)}`,
        );
      }
    }
    const copiedJoinFieldIssues = validateCoverageInputs({
      root: tempDir,
      collections: {
        collections: [{ id: "srd-5.2.1", policy: { tag: "srd" } }],
      },
      inventory: [
        {
          unitId: "fixture_unit",
          collectionId: "srd-5.2.1",
          sourceRecordPath: "fixture/unit.json",
          provenance: { kind: "srd-5.2.1" },
          rawRecord: {},
        },
      ],
      profiles: [
        {
          id: "fixture.profile",
          profileKind: "equipment",
          qntOwners: [],
          runtimeOwners: [],
          verificationOwners: [],
          obligationIds: ["BATTLE.SAMPLE"],
        },
      ],
      unitClaims: [
        {
          unitId: "fixture_unit",
          collectionId: "srd-5.2.1",
          claim: {
            tag: "supported-profile",
            profileIds: ["fixture.profile"],
            rulesKernelObligations: ["BATTLE.SAMPLE"],
          },
        },
      ],
      unitEvidence: [],
      taskClaims: [],
      authoredSurfaceUnits: [],
      scannedClaims: {
        profileClaims: [],
        unitEvidence: [],
        unitIdentityMbtReplays: [],
        selectedUnitIdentityReplays: [],
        selectedUnitIdentityReplayConsumers: [],
      },
    });
    for (const expectedIssue of [
      "fixture.profile profile row must not copy rules-kernel join field obligationIds; use plans/rules-kernel-coverage/profile-obligations.jsonl.",
      "Unit fixture_unit claim row.claim must not copy rules-kernel join field rulesKernelObligations; use plans/rules-kernel-coverage/profile-obligations.jsonl.",
    ]) {
      if (!copiedJoinFieldIssues.includes(expectedIssue)) {
        fail(
          `Self-test failed: expected copied rules-kernel join field issue ${JSON.stringify(expectedIssue)}, got ${JSON.stringify(copiedJoinFieldIssues)}`,
        );
      }
    }
    if (
      !hasVariantMagicMechanics({
        id: "fixture_magic_template",
        kind: "weapon_template",
        variants: [{ magic: { mechanics: { family: "passive" } } }],
      })
    ) {
      fail(
        "Self-test failed: expected variant magic mechanics to count as executable mechanics.",
      );
    }
    if (
      !hasExecutableMechanics({
        id: "fixture_magic_template",
        kind: "weapon_template",
        variants: [{ magic: { mechanics: { family: "passive" } } }],
      })
    ) {
      fail(
        "Self-test failed: expected variant magic mechanics to count toward executable mechanics.",
      );
    }
    const policyIssues = validateCollections(
      [
        {
          id: "classic-2024-non-srd-mechanics",
          policy: { tag: "classic-non-srd-mechanics" },
        },
      ],
      [
        {
          unitId: "phb_action_surge",
          collectionId: "classic-2024-non-srd-mechanics",
          syntheticLabel: "Action Surge",
          sourceRecordPath: "fixture/private-pressure.json",
          provenance: { kind: "xphb" },
          rawRecord: {
            id: "phb_action_surge",
            syntheticLabel: "Action Surge",
            canonicalName: "Action Surge",
            provenance: { kind: "xphb" },
            mechanics: { family: "extra_action" },
          },
        },
        {
          unitId: "mycelium_step",
          collectionId: "srd-5.2.1",
          sourceRecordPath: "fixture/srd-overlap.json",
          provenance: { kind: "srd-5.2.1" },
          rawRecord: {
            id: "mycelium_step",
            provenance: { kind: "srd-5.2.1" },
            mechanics: { family: "extra_action" },
          },
        },
      ],
    );
    for (const expectedIssue of [
      "phb_action_surge must use classic-2024-mechanics-source-lane provenance.",
      "phb_action_surge must use fungi-themed synthetic id and label.",
      "phb_action_surge contains protected-expression field canonicalName.",
      "phb_action_surge uses near-canonical protected label/id text: phb.",
      "phb_action_surge duplicates SRD Unit mechanics from mycelium_step.",
    ]) {
      if (!policyIssues.includes(expectedIssue)) {
        fail(
          `Self-test failed: expected Classic non-SRD policy issue ${JSON.stringify(expectedIssue)}, got ${JSON.stringify(policyIssues)}`,
        );
      }
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  console.log("Unit profile coverage self-test OK.");
}

module.exports = { runSelfTest };
