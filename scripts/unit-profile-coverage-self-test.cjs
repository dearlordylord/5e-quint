const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  selectedIdentityMbtEvidenceTag,
} = require("./unit-profile-coverage-config.cjs");
const {
  extractDriverActionUnitIds,
  extractDriverSchemaActionNames,
  extractMbtFixtureActionSet,
} = require("./unit-profile-coverage-claim-scan.cjs");
const { fail, toRepoPath } = require("./unit-profile-coverage-io.cjs");
const {
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
      "  doReachableBareString: {},",
      "  doReachableAction: {},",
      "  doDriverOnly: {},",
      "  doReachableWrongUnit: {},",
      "} as const;",
      "function helper() {",
      '  return "other_unit";',
      "}",
      "function bareStringHelper() {",
      '  return "fixture_unit";',
      "}",
      "const driver = defineDriver(driverSchema, () => ({",
      "  doReachableBareString: () => bareStringHelper(),",
      '  doReachableAction: () => unitFeatureSubject("fixture_unit"),',
      "  doReachableWrongUnit: () => helper(),",
      "}));",
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
            driverActionUnitIds: extractDriverActionUnitIds(testText),
            stepActionNames: fixtureActionSet.actionNames,
            stepDescription: fixtureActionSet.description,
          },
          {
            ownerPath: "fixture/rule-core-features.mbt.test.ts",
            line: 2,
            taskId: "QMBT10",
            unitId: "fixture_unit",
            actionNames: ["doReachableBareString"],
            declaredActions: extractDriverSchemaActionNames(testText),
            driverActionUnitIds: extractDriverActionUnitIds(testText),
            stepActionNames: fixtureActionSet.actionNames,
            stepDescription: fixtureActionSet.description,
          },
          {
            ownerPath: "fixture/rule-core-features.mbt.test.ts",
            line: 3,
            taskId: "QMBT10",
            unitId: "fixture_unit",
            actionNames: ["doReachableAction"],
            declaredActions: extractDriverSchemaActionNames(testText),
            driverActionUnitIds: extractDriverActionUnitIds(testText),
            stepActionNames: fixtureActionSet.actionNames,
            stepDescription: fixtureActionSet.description,
          },
          {
            ownerPath: "fixture/rule-core-features.mbt.test.ts",
            line: 4,
            taskId: "QMBT10",
            unitId: "fixture_unit",
            actionNames: ["doReachableWrongUnit"],
            declaredActions: extractDriverSchemaActionNames(testText),
            driverActionUnitIds: extractDriverActionUnitIds(testText),
            stepActionNames: fixtureActionSet.actionNames,
            stepDescription: fixtureActionSet.description,
          },
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
    const wrongUnitExpected =
      "fixture/rule-core-features.mbt.test.ts:4 cites Unit identity MBT replay action doReachableWrongUnit that does not bind Unit id fixture_unit.";
    if (!issues.includes(wrongUnitExpected)) {
      fail(
        `Self-test failed: expected wrong Unit binding issue, got ${JSON.stringify(issues)}`,
      );
    }
    const bareStringExpected =
      "fixture/rule-core-features.mbt.test.ts:2 cites Unit identity MBT replay action doReachableBareString that does not bind Unit id fixture_unit.";
    if (!issues.includes(bareStringExpected)) {
      fail(
        `Self-test failed: expected bare string literal issue, got ${JSON.stringify(issues)}`,
      );
    }
    const boundaryIssue = issues.find((issue) =>
      issue.includes("doReachableAction"),
    );
    if (boundaryIssue !== undefined) {
      fail(
        `Self-test failed: expected explicit Unit boundary action to pass, got ${JSON.stringify(issues)}`,
      );
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  console.log("Unit profile coverage self-test OK.");
}

module.exports = { runSelfTest };
