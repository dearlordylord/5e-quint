const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { buildKernelCoverage } = require("./rules-kernel-coverage-check.cjs");
const {
  generatorReadinessBlockerCatalogIssues,
  generatorReadinessScannerBlockers,
} = require("./rules-kernel-coverage-config.cjs");

const runBlockBlocker = generatorReadinessScannerBlockers.semanticCoreRunBlock;

function writeFile(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text);
}

function runSelfTest() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rules-kernel-coverage-"));
  writeFile(
    path.join(root, "plans", "unit-profile-coverage", "profiles.jsonl"),
    '{"id":"spell.sample","profileKind":"spell-invocation"}\n',
  );
  writeFile(
    path.join(root, "plans", "RALPH_LANE_SELF_TEST.md"),
    [
      "| 99 | A99-SAMPLE-FIXTURE-SPLIT - Split sample fixture | ready-for-research | none | Self-test follow-up. |",
      "",
      "### Task 99 - A99-SAMPLE-FIXTURE-SPLIT - Split sample fixture",
      "",
      "Status: `ready-for-research`",
    ].join("\n") + "\n",
  );
  writeFile(
    path.join(root, "plans", "rules-kernel-coverage", "obligations.jsonl"),
    [
      JSON.stringify({
        id: "BATTLE.SAMPLE",
        title: "sample covered obligation",
        runtime: "battle",
        kind: "state-transition",
        status: "covered",
        qntOwners: [
          "sample.qnt",
          "sample-inductive.qnt",
          "sample-examples.qnt",
          "packages/battle-runtime/battle-runtime-hole-kinds.qnt",
          "packages/battle-runtime/battle-runtime-fill-kinds.qnt",
          "packages/battle-runtime/battle-runtime-subject-kinds.qnt",
        ],
        runtimeOwners: ["sample.ts"],
        parityWitnesses: [
          {
            kind: "focused-mbt",
            ownerPath: "sample.mbt.test.ts",
            qntSpecPath: "sample.mbt.qnt",
            stepAction: "step",
          },
        ],
      }),
      JSON.stringify({
        id: "BATTLE.BOUNDARY",
        title: "sample boundary obligation",
        runtime: "battle",
        kind: "boundary-protocol",
        status: "boundary-only",
        reason: "Malformed client payload, not reducer semantics.",
      }),
    ].join("\n") + "\n",
  );
  writeFile(
    path.join(root, "packages", "battle-runtime", "src", "battle-reducer.ts"),
    [
      "export type BattleTargetChoiceHole = { readonly kind: 'targetChoice'; };",
      "export type BattleHole = BattleTargetChoiceHole;",
      "export type BattleFill = { readonly kind: 'targetChoice'; readonly holeId: string; readonly value: string; };",
    ].join("\n") + "\n",
  );
  writeFile(
    path.join(root, "packages", "battle-runtime", "src", "battle-subjects.ts"),
    [
      "import { Schema } from 'effect';",
      "export const BattleSubjectSchema = Schema.Union(",
      "  Schema.Struct({",
      "    tag: Schema.Literal('action'),",
      "    action: Schema.Literal('attack'),",
      "  }),",
      ");",
      "export type BattleSubject = typeof BattleSubjectSchema.Type;",
    ].join("\n") + "\n",
  );
  writeFile(
    path.join(
      root,
      "plans",
      "rules-kernel-coverage",
      "battle-hole-frontier.jsonl",
    ),
    [
      JSON.stringify({
        subject: "battle-hole-family",
        id: "BattleTargetChoiceHole",
        holeKind: "targetChoice",
        classification: "semantic-frontier",
        coveredByObligationIds: ["BATTLE.SAMPLE"],
        followUpTaskIds: [],
        reason: "sample semantic hole family",
      }),
      JSON.stringify({
        subject: "battle-fill-kind",
        id: "targetChoice",
        fillKind: "targetChoice",
        classification: "semantic-frontier",
        coveredByObligationIds: ["BATTLE.SAMPLE"],
        followUpTaskIds: [],
        reason: "sample semantic fill kind",
      }),
      JSON.stringify({
        subject: "battle-subject-kind",
        id: "actionAttack",
        subjectKind: "actionAttack",
        tag: "action",
        action: "attack",
        classification: "semantic-frontier",
        coveredByObligationIds: ["BATTLE.SAMPLE"],
        followUpTaskIds: [],
        reason: "sample semantic subject kind",
      }),
    ].join("\n") + "\n",
  );
  writeFile(
    path.join(
      root,
      "plans",
      "rules-kernel-coverage",
      "profile-obligations.jsonl",
    ),
    '{"profileId":"spell.sample","obligationIds":["BATTLE.SAMPLE"]}\n',
  );
  writeFile(
    path.join(root, "plans", "rules-kernel-coverage", "qnt-owner-roles.jsonl"),
    [
      JSON.stringify({
        ownerPath: "sample.qnt",
        role: "semantic-core",
        evidence:
          "sample.qnt is the qnt-owner marker source for BATTLE.SAMPLE.",
      }),
      JSON.stringify({
        ownerPath: "sample-inductive.qnt",
        role: "proof-only",
        evidence: "sample-inductive.qnt is proof-only sample evidence.",
      }),
      JSON.stringify({
        ownerPath: "sample-examples.qnt",
        role: "proof-only",
        evidence: "sample-examples.qnt is example-only sample evidence.",
      }),
      JSON.stringify({
        ownerPath: "packages/battle-runtime/battle-runtime-hole-kinds.qnt",
        role: "semantic-core",
        evidence: "battle-runtime-hole-kinds.qnt is sample protocol vocabulary.",
      }),
      JSON.stringify({
        ownerPath: "packages/battle-runtime/battle-runtime-fill-kinds.qnt",
        role: "semantic-core",
        evidence: "battle-runtime-fill-kinds.qnt is sample protocol vocabulary.",
      }),
      JSON.stringify({
        ownerPath: "packages/battle-runtime/battle-runtime-subject-kinds.qnt",
        role: "semantic-core",
        evidence:
          "battle-runtime-subject-kinds.qnt is sample protocol vocabulary.",
      }),
    ].join("\n") + "\n",
  );
  writeFile(
    path.join(
      root,
      "plans",
      "rules-kernel-coverage",
      "generator-readiness.jsonl",
    ),
    JSON.stringify({
      obligationId: "BATTLE.SAMPLE",
      status: "semantic-core-candidate",
      semanticCore: ["sample.qnt"],
      proofOnly: ["sample-inductive.qnt", "sample-examples.qnt"],
      generatorSubset: ["record", "pure-def"],
      blockedBy: [],
      dryRun: "plans/rules-kernel-coverage/SAMPLE_DRY_RUN.md",
    }) + "\n",
  );
  const sampleKernelIrBoundaries = [
    "command",
    "fill",
    "result",
    "state",
    "active-effect",
    "support-profile",
    "resource",
    "handoff",
  ].map((boundary) =>
    JSON.stringify({
      boundary,
      summary: `${boundary} sample boundary`,
      runtimeBoundaryPaths: ["sample.ts"],
      obligationIds: ["BATTLE.SAMPLE"],
      evidence: `${boundary} sample evidence`,
    }),
  );
  writeFile(
    path.join(
      root,
      "plans",
      "rules-kernel-coverage",
      "kernel-ir-boundaries.jsonl",
    ),
    `${sampleKernelIrBoundaries.join("\n")}\n`,
  );
  writeFile(
    path.join(root, "plans", "rules-kernel-coverage", "SAMPLE_DRY_RUN.md"),
    "# Sample Dry Run\n",
  );
  writeFile(
    path.join(root, "sample.qnt"),
    "// KERNEL-COVERAGE: qnt-owner BATTLE.SAMPLE\nmodule sample {}\n",
  );
  writeFile(
    path.join(
      root,
      "packages",
      "battle-runtime",
      "battle-runtime-hole-kinds.qnt",
    ),
    [
      "// KERNEL-COVERAGE: qnt-owner BATTLE.SAMPLE",
      "module battleRuntimeHoleKinds {",
      "  type BattleHoleFamilyKind =",
      "    | TargetChoiceHoleKind",
      "}",
    ].join("\n") + "\n",
  );
  writeFile(
    path.join(
      root,
      "packages",
      "battle-runtime",
      "battle-runtime-fill-kinds.qnt",
    ),
    [
      "// KERNEL-COVERAGE: qnt-owner BATTLE.SAMPLE",
      "module battleRuntimeFillKinds {",
      "  type BattleFillKind =",
      "    | TargetChoiceFillKind",
      "}",
    ].join("\n") + "\n",
  );
  writeFile(
    path.join(
      root,
      "packages",
      "battle-runtime",
      "battle-runtime-subject-kinds.qnt",
    ),
    [
      "// KERNEL-COVERAGE: qnt-owner BATTLE.SAMPLE",
      "module battleRuntimeSubjectKinds {",
      "  type BattleSubjectKind =",
      "    | ActionAttackSubjectKind",
      "}",
    ].join("\n") + "\n",
  );
  writeFile(
    path.join(root, "sample-inductive.qnt"),
    "// KERNEL-COVERAGE: qnt-owner BATTLE.SAMPLE\nmodule sampleInductive {}\n",
  );
  writeFile(
    path.join(root, "sample-examples.qnt"),
    "// KERNEL-COVERAGE: qnt-owner BATTLE.SAMPLE\nmodule sampleExamples {}\n",
  );
  writeFile(
    path.join(root, "readiness-proof-only.qnt"),
    "module readinessProofOnly {}\n",
  );
  writeFile(
    path.join(root, "sample.ts"),
    "// KERNEL-COVERAGE: runtime-owner BATTLE.SAMPLE\nexport const sample = true;\n",
  );
  writeFile(
    path.join(root, "sample.mbt.qnt"),
    "module sampleMbt { action step = any { doSample, } action doSample = true }\n",
  );
  writeFile(
    path.join(root, "sample.mbt.test.ts"),
    [
      "// KERNEL-COVERAGE: parity-witness BATTLE.SAMPLE",
      "import { run, stateCheck } from '@firfi/quint-connect';",
      "const sampleStateCheck = stateCheck(() => ({}), () => undefined);",
      "void run({",
      "  spec: path.resolve(import.meta.dirname, './sample.mbt.qnt'),",
      "  step: 'step',",
      "  stateCheck: sampleStateCheck,",
      "});",
    ].join("\n") + "\n",
  );

  const result = buildKernelCoverage({ root });
  assert.deepEqual(result.issues, []);
  assert.equal(result.matrix.summary.byStatus.covered, 1);
  assert.equal(result.matrix.summary.byStatus["boundary-only"], 1);
  assert.equal(result.matrix.qntOwnerRoles.length, 6);
  assert.equal(result.matrix.qntRegistry.length, 3);
  assert.equal(result.matrix.generatorReadiness.length, 1);
  assert.equal(result.matrix.generatorReadinessBacklog.length, 0);
  assert.equal(result.matrix.semanticCoreRunBlockFindings.length, 0);
  assert.equal(result.matrix.kernelIrBoundaries.length, 8);

  const unregisteredPackageQntPath = path.join(
    root,
    "packages",
    "battle-runtime",
    "unregistered-helper.qnt",
  );
  writeFile(unregisteredPackageQntPath, "module unregisteredHelper {}\n");
  const unregisteredPackageQntResult = buildKernelCoverage({ root });
  assert.ok(
    unregisteredPackageQntResult.issues.includes(
      "qnt registry is missing packages/battle-runtime/unregistered-helper.qnt; add a qnt-owner-roles row or a checker-owned exemption category.",
    ),
    `Expected unregistered package QNT issue, got ${JSON.stringify(unregisteredPackageQntResult.issues)}`,
  );
  fs.rmSync(unregisteredPackageQntPath, { force: true });

  const witnessShapeObligationsPath = path.join(
    root,
    "plans",
    "rules-kernel-coverage",
    "obligations.jsonl",
  );
  const initialWitnessShapeObligationsText = fs.readFileSync(
    witnessShapeObligationsPath,
    "utf8",
  );
  const [sampleObligationForWitness, boundaryObligationForWitness] =
    initialWitnessShapeObligationsText
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
  writeFile(
    witnessShapeObligationsPath,
    [
      JSON.stringify({
        ...sampleObligationForWitness,
        parityWitnesses: [
          {
            kind: "contract-test",
            ownerPath: "sample.mbt.qnt",
            qntSpecPath: "sample.mbt.qnt",
            stepAction: "step",
            deterministicReplayRationale:
              "contract tests are not deterministic QNT replays.",
          },
        ],
      }),
      JSON.stringify(boundaryObligationForWitness),
    ].join("\n") + "\n",
  );
  const invalidContractTestWitnessResult = buildKernelCoverage({ root });
  for (const issue of [
    "obligations.jsonl:1: BATTLE.SAMPLE.parityWitnesses[0].ownerPath must point to a .test.ts file.",
    "obligations.jsonl:1: BATTLE.SAMPLE.parityWitnesses[0].qntSpecPath is not valid for contract-test.",
    "obligations.jsonl:1: BATTLE.SAMPLE.parityWitnesses[0].stepAction is not valid for contract-test.",
    "obligations.jsonl:1: BATTLE.SAMPLE.parityWitnesses[0].deterministicReplayRationale is not valid for contract-test.",
  ]) {
    assert.ok(
      invalidContractTestWitnessResult.issues.includes(issue),
      `Expected invalid contract-test witness issue ${issue}, got ${JSON.stringify(invalidContractTestWitnessResult.issues)}`,
    );
  }
  writeFile(witnessShapeObligationsPath, initialWitnessShapeObligationsText);

  const sampleProfileObligationsPath = path.join(
    root,
    "plans",
    "rules-kernel-coverage",
    "profile-obligations.jsonl",
  );
  const initialProfileObligationsText = fs.readFileSync(
    sampleProfileObligationsPath,
    "utf8",
  );
  writeFile(
    sampleProfileObligationsPath,
    JSON.stringify({
      profileId: "spell.sample",
      followUpTaskIds: ["A99-SAMPLE-FIXTURE-SPLIT"],
      reason: "sample profile still needs a semantic obligation join",
    }) + "\n",
  );
  const profileGapResult = buildKernelCoverage({ root });
  assert.deepEqual(profileGapResult.issues, []);
  assert.deepEqual(profileGapResult.matrix.profileObligations, [
    {
      followUpTaskIds: ["A99-SAMPLE-FIXTURE-SPLIT"],
      profileId: "spell.sample",
      reason: "sample profile still needs a semantic obligation join",
    },
  ]);
  writeFile(sampleProfileObligationsPath, initialProfileObligationsText);

  const sampleQntOwnerRolesPath = path.join(
    root,
    "plans",
    "rules-kernel-coverage",
    "qnt-owner-roles.jsonl",
  );
  const initialQntOwnerRolesText = fs.readFileSync(
    sampleQntOwnerRolesPath,
    "utf8",
  );
  const sampleGeneratorReadinessPath = path.join(
    root,
    "plans",
    "rules-kernel-coverage",
    "generator-readiness.jsonl",
  );
  const initialGeneratorReadinessText = fs.readFileSync(
    sampleGeneratorReadinessPath,
    "utf8",
  );
  const readinessOnlyProofRole =
    JSON.stringify({
      ownerPath: "readiness-proof-only.qnt",
      role: "proof-only",
      evidence:
        "readiness-proof-only.qnt is proof-only generator-readiness evidence without being an obligation QNT owner.",
    }) + "\n";
  writeFile(
    sampleGeneratorReadinessPath,
    JSON.stringify({
      obligationId: "BATTLE.SAMPLE",
      status: "semantic-core-candidate",
      semanticCore: ["sample.qnt"],
      proofOnly: [
        "sample-inductive.qnt",
        "sample-examples.qnt",
        "readiness-proof-only.qnt",
      ],
      generatorSubset: ["record", "pure-def"],
      blockedBy: [],
    }) + "\n",
  );
  writeFile(
    sampleQntOwnerRolesPath,
    initialQntOwnerRolesText + readinessOnlyProofRole,
  );
  const readinessOnlyProofOwnerRoleResult = buildKernelCoverage({ root });
  assert.deepEqual(readinessOnlyProofOwnerRoleResult.issues, []);
  writeFile(sampleQntOwnerRolesPath, initialQntOwnerRolesText);
  const missingReadinessProofOwnerRoleResult = buildKernelCoverage({ root });
  assert.ok(
    missingReadinessProofOwnerRoleResult.issues.includes(
      "qnt-owner-roles is missing QNT owner readiness-proof-only.qnt.",
    ),
    `Expected missing readiness proof-only owner role issue, got ${JSON.stringify(missingReadinessProofOwnerRoleResult.issues)}`,
  );
  writeFile(sampleGeneratorReadinessPath, initialGeneratorReadinessText);
  writeFile(sampleQntOwnerRolesPath, "");
  const missingQntOwnerRoleResult = buildKernelCoverage({ root });
  assert.ok(
    missingQntOwnerRoleResult.issues.includes(
      "qnt-owner-roles is missing QNT owner sample.qnt.",
    ),
    `Expected missing qnt-owner role issue, got ${JSON.stringify(missingQntOwnerRoleResult.issues)}`,
  );
  for (const role of ["proof-only", "mbt-fixture"]) {
    writeFile(
      sampleQntOwnerRolesPath,
      JSON.stringify({
        ownerPath: "sample.qnt",
        role,
        evidence: `sample invalid ${role} role for readiness semanticCore check.`,
      }) + "\n",
    );
    const wrongSemanticCoreRoleResult = buildKernelCoverage({ root });
    assert.ok(
      wrongSemanticCoreRoleResult.issues.includes(
        `generator-readiness row 1.semanticCore path sample.qnt has QNT owner role ${role}; expected semantic-core.`,
      ),
      `Expected semanticCore ${role} role issue, got ${JSON.stringify(wrongSemanticCoreRoleResult.issues)}`,
    );
  }
  writeFile(sampleQntOwnerRolesPath, initialQntOwnerRolesText);

  const sampleQntPath = path.join(root, "sample.qnt");
  const initialSampleQntText = fs.readFileSync(sampleQntPath, "utf8");
  const sampleInductiveQntPath = path.join(root, "sample-inductive.qnt");
  const initialSampleInductiveQntText = fs.readFileSync(
    sampleInductiveQntPath,
    "utf8",
  );
  writeFile(
    sampleQntPath,
    [
      "// KERNEL-COVERAGE: qnt-owner BATTLE.SAMPLE",
      "module sample {",
      "  type SampleChoice = ChoiceA | ChoiceB",
      "  pure def chooseValue(choice: SampleChoice): int =",
      "    match choice {",
      "      | ChoiceA => 1",
      "      | ChoiceB => 2",
      "    }",
      "}",
    ].join("\n") + "\n",
  );
  writeFile(
    sampleGeneratorReadinessPath,
    JSON.stringify({
      obligationId: "BATTLE.SAMPLE",
      status: "semantic-core-candidate",
      semanticCore: ["sample.qnt"],
      proofOnly: ["sample-inductive.qnt", "sample-examples.qnt"],
      generatorSubset: ["pure-def", "int", "pattern-match"],
      blockedBy: [],
    }) + "\n",
  );
  const configuredGeneratorSubsetAuditResult = buildKernelCoverage({
    root,
    generatorSubsetAuditObligationIds: new Set(["BATTLE.SAMPLE"]),
  });
  assert.ok(
    configuredGeneratorSubsetAuditResult.issues.includes(
      "generator-readiness row 1.generatorSubset omits observed QNT construct(s): variant.",
    ),
    `Expected configured generator subset audit issue, got ${JSON.stringify(configuredGeneratorSubsetAuditResult.issues)}`,
  );
  writeFile(sampleQntPath, initialSampleQntText);
  writeFile(sampleGeneratorReadinessPath, initialGeneratorReadinessText);
  const unitFeatureObligationsPath = path.join(
    root,
    "plans",
    "rules-kernel-coverage",
    "obligations.jsonl",
  );
  const initialUnitFeatureObligationsText = fs.readFileSync(
    unitFeatureObligationsPath,
    "utf8",
  );
  const [sampleObligation, boundaryObligation] =
    initialUnitFeatureObligationsText
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
  const unitFeatureOwnerPath =
    "packages/shared-algebras/proofs/rule-core/unit-feature-sample.qnt";
  writeFile(
    path.join(root, unitFeatureOwnerPath),
    [
      "// KERNEL-COVERAGE: qnt-owner BATTLE.SAMPLE",
      "module unitFeatureSample {",
      "  pure def countValues(values: Set[int]): int = values.size()",
      "}",
    ].join("\n") + "\n",
  );
  writeFile(
    unitFeatureObligationsPath,
    [
      JSON.stringify({
        ...sampleObligation,
        qntOwners: [
          unitFeatureOwnerPath,
          "sample-inductive.qnt",
          "sample-examples.qnt",
        ],
      }),
      JSON.stringify(boundaryObligation),
    ].join("\n") + "\n",
  );
  writeFile(
    sampleQntOwnerRolesPath,
    [
      JSON.stringify({
        ownerPath: unitFeatureOwnerPath,
        role: "semantic-core",
        evidence:
          "unit-feature-sample.qnt is the qnt-owner marker source for BATTLE.SAMPLE.",
      }),
      JSON.stringify({
        ownerPath: "sample-inductive.qnt",
        role: "proof-only",
        evidence: "sample-inductive.qnt is proof-only sample evidence.",
      }),
      JSON.stringify({
        ownerPath: "sample-examples.qnt",
        role: "proof-only",
        evidence: "sample-examples.qnt is example-only sample evidence.",
      }),
    ].join("\n") + "\n",
  );
  writeFile(
    sampleGeneratorReadinessPath,
    JSON.stringify({
      obligationId: "BATTLE.SAMPLE",
      status: "semantic-core-candidate",
      semanticCore: [unitFeatureOwnerPath],
      proofOnly: ["sample-inductive.qnt", "sample-examples.qnt"],
      generatorSubset: ["pure-def", "int", "set"],
      blockedBy: [],
    }) + "\n",
  );
  const unitFeatureMissingSizeResult = buildKernelCoverage({ root });
  assert.ok(
    unitFeatureMissingSizeResult.issues.includes(
      "generator-readiness row 1.generatorSubset omits observed QNT construct(s): size.",
    ),
    `Expected unit-feature size construct issue, got ${JSON.stringify(unitFeatureMissingSizeResult.issues)}`,
  );

  writeFile(
    path.join(root, unitFeatureOwnerPath),
    [
      "// KERNEL-COVERAGE: qnt-owner BATTLE.SAMPLE",
      "module unitFeatureSample {",
      "  type SampleChoice = ChoiceA | ChoiceB",
      "  pure def chooseValue(choice: SampleChoice): int =",
      "    match choice {",
      "      | ChoiceA => 1",
      "      | ChoiceB => 2",
      "    }",
      "}",
    ].join("\n") + "\n",
  );
  writeFile(
    sampleGeneratorReadinessPath,
    JSON.stringify({
      obligationId: "BATTLE.SAMPLE",
      status: "semantic-core-candidate",
      semanticCore: [unitFeatureOwnerPath],
      proofOnly: ["sample-inductive.qnt", "sample-examples.qnt"],
      generatorSubset: ["pure-def", "int", "pattern-match"],
      blockedBy: [],
    }) + "\n",
  );
  const unitFeatureNullaryVariantResult = buildKernelCoverage({ root });
  assert.ok(
    unitFeatureNullaryVariantResult.issues.includes(
      "generator-readiness row 1.generatorSubset omits observed QNT construct(s): variant.",
    ),
    `Expected unit-feature nullary variant construct issue, got ${JSON.stringify(unitFeatureNullaryVariantResult.issues)}`,
  );
  writeFile(unitFeatureObligationsPath, initialUnitFeatureObligationsText);
  writeFile(sampleQntOwnerRolesPath, initialQntOwnerRolesText);
  writeFile(sampleGeneratorReadinessPath, initialGeneratorReadinessText);
  fs.rmSync(path.join(root, unitFeatureOwnerPath), { force: true });

  writeFile(
    sampleQntPath,
    [
      "// KERNEL-COVERAGE: qnt-owner BATTLE.SAMPLE",
      "// run commented_out = true",
      "module sample {",
      "",
      "  run sample_run_block = true",
      "}",
    ].join("\n") + "\n",
  );
  const semanticCoreCandidateRunBlockResult = buildKernelCoverage({ root });
  assert.ok(
    semanticCoreCandidateRunBlockResult.issues.includes(
      `generator-readiness row 1.semantic-core-candidate cannot include semanticCore run block(s) at sample.qnt:5; split the run blocks out or classify with ${runBlockBlocker}.`,
    ),
    `Expected semantic-core run-block candidate issue, got ${JSON.stringify(semanticCoreCandidateRunBlockResult.issues)}`,
  );
  assert.deepEqual(
    semanticCoreCandidateRunBlockResult.matrix.semanticCoreRunBlockFindings,
    [
      {
        blocker: runBlockBlocker,
        followUpTaskIds: [],
        obligationId: "BATTLE.SAMPLE",
        owners: [{ lines: [5], ownerPath: "sample.qnt" }],
        readinessStatus: "semantic-core-candidate",
      },
    ],
  );
  assert.ok(
    semanticCoreCandidateRunBlockResult.report.includes(
      `| \`BATTLE.SAMPLE\` | semantic-core-candidate | \`${runBlockBlocker}\` | _none_ | \`sample.qnt:5\` |`,
    ),
  );
  writeFile(sampleQntPath, initialSampleQntText);
  writeFile(
    sampleInductiveQntPath,
    [
      "// KERNEL-COVERAGE: qnt-owner BATTLE.SAMPLE",
      "module sampleInductive {",
      "  run proof_only_example = true",
      "}",
    ].join("\n") + "\n",
  );
  const proofOnlyRunBlockResult = buildKernelCoverage({ root });
  assert.deepEqual(
    proofOnlyRunBlockResult.matrix.semanticCoreRunBlockFindings,
    [],
  );
  assert.equal(
    proofOnlyRunBlockResult.issues.some((issue) =>
      issue.includes("sample-inductive.qnt:3"),
    ),
    false,
    `Expected proof-only run block exemption, got ${JSON.stringify(proofOnlyRunBlockResult.issues)}`,
  );
  writeFile(sampleInductiveQntPath, initialSampleInductiveQntText);
  writeFile(
    sampleQntPath,
    [
      "// KERNEL-COVERAGE: qnt-owner BATTLE.SAMPLE",
      "// run commented_out = true",
      "module sample {",
      "",
      "  run sample_run_block = true",
      "}",
    ].join("\n") + "\n",
  );
  writeFile(
    sampleGeneratorReadinessPath,
    JSON.stringify({
      obligationId: "BATTLE.SAMPLE",
      status: "fixture-bound",
      semanticCore: ["sample.qnt"],
      proofOnly: [],
      generatorSubset: ["record"],
      blockedBy: ["fixture-world-coupled"],
      followUpTaskIds: ["A99-SAMPLE-FIXTURE-SPLIT"],
    }) + "\n",
  );
  const fixtureBoundMissingRunBlockResult = buildKernelCoverage({ root });
  assert.ok(
    fixtureBoundMissingRunBlockResult.issues.includes(
      `generator-readiness row 1.fixture-bound has semanticCore run block(s) at sample.qnt:5 and must include blockedBy ${runBlockBlocker}.`,
    ),
    `Expected fixture-bound run-block blocker issue, got ${JSON.stringify(fixtureBoundMissingRunBlockResult.issues)}`,
  );
  writeFile(
    sampleGeneratorReadinessPath,
    JSON.stringify({
      obligationId: "BATTLE.SAMPLE",
      status: "fixture-bound",
      semanticCore: ["sample.qnt"],
      proofOnly: [],
      generatorSubset: ["record"],
      blockedBy: [runBlockBlocker],
    }) + "\n",
  );
  const fixtureBoundMissingFollowUpResult = buildKernelCoverage({ root });
  assert.ok(
    fixtureBoundMissingFollowUpResult.issues.includes(
      "generator-readiness row 1.fixture-bound requires followUpTaskIds.",
    ),
    `Expected fixture-bound follow-up issue, got ${JSON.stringify(fixtureBoundMissingFollowUpResult.issues)}`,
  );
  writeFile(
    sampleGeneratorReadinessPath,
    JSON.stringify({
      obligationId: "BATTLE.SAMPLE",
      status: "fixture-bound",
      semanticCore: ["sample.qnt"],
      proofOnly: [],
      generatorSubset: ["record"],
      blockedBy: [runBlockBlocker],
      followUpTaskIds: ["A100-MISSING-FIXTURE-SPLIT"],
    }) + "\n",
  );
  const fixtureBoundUnknownFollowUpResult = buildKernelCoverage({ root });
  assert.ok(
    fixtureBoundUnknownFollowUpResult.issues.includes(
      "generator-readiness row 1.followUpTaskIds references unknown Ralph task id A100-MISSING-FIXTURE-SPLIT.",
    ),
    `Expected fixture-bound unknown follow-up issue, got ${JSON.stringify(fixtureBoundUnknownFollowUpResult.issues)}`,
  );
  writeFile(
    sampleGeneratorReadinessPath,
    JSON.stringify({
      obligationId: "BATTLE.SAMPLE",
      status: "fixture-bound",
      semanticCore: ["sample.qnt"],
      proofOnly: [],
      generatorSubset: ["record"],
      blockedBy: [runBlockBlocker],
      followUpTaskIds: ["A99-SAMPLE-FIXTURE-SPLIT"],
    }) + "\n",
  );
  const fixtureBoundRunBlockResult = buildKernelCoverage({ root });
  assert.deepEqual(fixtureBoundRunBlockResult.issues, []);
  writeFile(sampleQntPath, initialSampleQntText);
  writeFile(sampleGeneratorReadinessPath, initialGeneratorReadinessText);
  writeFile(sampleGeneratorReadinessPath, "");
  const missingGeneratorReadinessResult = buildKernelCoverage({ root });
  assert.ok(
    missingGeneratorReadinessResult.issues.includes(
      "generator-readiness is missing row for covered obligation BATTLE.SAMPLE with semantic-core QNT owner(s): sample.qnt, packages/battle-runtime/battle-runtime-hole-kinds.qnt, packages/battle-runtime/battle-runtime-fill-kinds.qnt, packages/battle-runtime/battle-runtime-subject-kinds.qnt.",
    ),
    `Expected missing generator-readiness issue, got ${JSON.stringify(missingGeneratorReadinessResult.issues)}`,
  );
  assert.deepEqual(
    missingGeneratorReadinessResult.matrix.generatorReadinessBacklog,
    [
      {
        obligationId: "BATTLE.SAMPLE",
        ownerRoles: [
          { ownerPath: "sample.qnt", role: "semantic-core" },
          {
            ownerPath: "packages/battle-runtime/battle-runtime-hole-kinds.qnt",
            role: "semantic-core",
          },
          {
            ownerPath: "packages/battle-runtime/battle-runtime-fill-kinds.qnt",
            role: "semantic-core",
          },
          {
            ownerPath:
              "packages/battle-runtime/battle-runtime-subject-kinds.qnt",
            role: "semantic-core",
          },
        ],
        status: "missing",
      },
    ],
  );
  assert.match(
    missingGeneratorReadinessResult.report,
    /\| `BATTLE\.SAMPLE` \| missing \| `sample\.qnt`, `packages\/battle-runtime\/battle-runtime-hole-kinds\.qnt`, `packages\/battle-runtime\/battle-runtime-fill-kinds\.qnt`, `packages\/battle-runtime\/battle-runtime-subject-kinds\.qnt` \| `sample\.qnt`: semantic-core<br>`packages\/battle-runtime\/battle-runtime-hole-kinds\.qnt`: semantic-core<br>`packages\/battle-runtime\/battle-runtime-fill-kinds\.qnt`: semantic-core<br>`packages\/battle-runtime\/battle-runtime-subject-kinds\.qnt`: semantic-core \|/,
  );
  writeFile(
    sampleGeneratorReadinessPath,
    JSON.stringify({
      obligationId: "BATTLE.SAMPLE",
      status: "not-assessed",
      semanticCore: [],
      proofOnly: [],
      generatorSubset: [],
      blockedBy: [],
    }) + "\n",
  );
  const notAssessedGeneratorReadinessResult = buildKernelCoverage({ root });
  assert.ok(
    notAssessedGeneratorReadinessResult.issues.includes(
      "generator-readiness row for covered obligation BATTLE.SAMPLE with semantic-core QNT owner(s) cannot remain not-assessed: sample.qnt, packages/battle-runtime/battle-runtime-hole-kinds.qnt, packages/battle-runtime/battle-runtime-fill-kinds.qnt, packages/battle-runtime/battle-runtime-subject-kinds.qnt.",
    ),
    `Expected not-assessed generator-readiness issue, got ${JSON.stringify(notAssessedGeneratorReadinessResult.issues)}`,
  );
  assert.deepEqual(
    notAssessedGeneratorReadinessResult.matrix.generatorReadinessBacklog,
    [
      {
        obligationId: "BATTLE.SAMPLE",
        ownerRoles: [
          { ownerPath: "sample.qnt", role: "semantic-core" },
          {
            ownerPath: "packages/battle-runtime/battle-runtime-hole-kinds.qnt",
            role: "semantic-core",
          },
          {
            ownerPath: "packages/battle-runtime/battle-runtime-fill-kinds.qnt",
            role: "semantic-core",
          },
          {
            ownerPath:
              "packages/battle-runtime/battle-runtime-subject-kinds.qnt",
            role: "semantic-core",
          },
        ],
        status: "not-assessed",
      },
    ],
  );
  writeFile(sampleGeneratorReadinessPath, initialGeneratorReadinessText);

  for (const proofFile of ["sample-inductive.qnt", "sample-examples.qnt"]) {
    writeFile(
      sampleGeneratorReadinessPath,
      JSON.stringify({
        obligationId: "BATTLE.SAMPLE",
        status: "semantic-core-candidate",
        semanticCore: [proofFile],
        proofOnly: [],
        generatorSubset: ["record"],
        blockedBy: [],
      }) + "\n",
    );
    const proofFileSemanticCoreResult = buildKernelCoverage({ root });
    assert.ok(
      proofFileSemanticCoreResult.issues.includes(
        `generator-readiness row 1.semanticCore path ${proofFile} has QNT owner role proof-only; expected semantic-core.`,
      ),
      `Expected proof/example semanticCore issue, got ${JSON.stringify(proofFileSemanticCoreResult.issues)}`,
    );
  }
  writeFile(
    sampleGeneratorReadinessPath,
    JSON.stringify({
      obligationId: "BATTLE.SAMPLE",
      status: "generation-subset-clean",
    }) + "\n",
  );
  const missingGeneratorArrayResult = buildKernelCoverage({ root });
  for (const field of [
    "semanticCore",
    "proofOnly",
    "generatorSubset",
    "blockedBy",
  ]) {
    assert.ok(
      missingGeneratorArrayResult.issues.includes(
        `generator-readiness row 1.${field} must be an array.`,
      ),
      `Expected missing generator-readiness ${field} issue, got ${JSON.stringify(missingGeneratorArrayResult.issues)}`,
    );
  }
  writeFile(
    sampleGeneratorReadinessPath,
    JSON.stringify({
      obligationId: "BATTLE.SAMPLE",
      status: "semantic-core-candidate",
      semanticCore: ["sample.qnt"],
      proofOnly: ["sample.qnt"],
      generatorSubset: ["record", "record"],
      blockedBy: ["sample blocker"],
    }) + "\n",
  );
  const invalidGeneratorSemanticsResult = buildKernelCoverage({ root });
  for (const issue of [
    "generator-readiness row 1.generatorSubset repeats record.",
    "generator-readiness row 1.blockedBy has unknown generator-readiness blocker sample blocker.",
    "generator-readiness row 1.sample.qnt cannot be both semanticCore and proofOnly.",
    "generator-readiness row 1.semantic-core-candidate must have empty blockedBy.",
  ]) {
    assert.ok(
      invalidGeneratorSemanticsResult.issues.includes(issue),
      `Expected generator-readiness issue ${issue}, got ${JSON.stringify(invalidGeneratorSemanticsResult.issues)}`,
    );
  }
  writeFile(
    sampleGeneratorReadinessPath,
    JSON.stringify({
      obligationId: "BATTLE.SAMPLE",
      status: "semantic-core-candidate",
      semanticCore: ["sample.qnt"],
      proofOnly: [],
      generatorSubset: ["record"],
      blockedBy: ["fixture-world-coupled"],
    }) + "\n",
  );
  const fixtureCoupledSemanticCoreResult = buildKernelCoverage({ root });
  assert.ok(
    fixtureCoupledSemanticCoreResult.issues.includes(
      "generator-readiness row 1.semantic-core-candidate must have empty blockedBy.",
    ),
    `Expected fixture-world-coupled semanticCore issue, got ${JSON.stringify(fixtureCoupledSemanticCoreResult.issues)}`,
  );
  writeFile(
    sampleGeneratorReadinessPath,
    JSON.stringify({
      obligationId: "BATTLE.SAMPLE",
      status: "semantic-core-candidate",
      semanticCore: ["sample.qnt"],
      proofOnly: [],
      generatorSubset: ["unknown-construct"],
      blockedBy: [],
    }) + "\n",
  );
  const unknownGeneratorSubsetResult = buildKernelCoverage({ root });
  assert.ok(
    unknownGeneratorSubsetResult.issues.includes(
      "generator-readiness row 1.generatorSubset has unknown generation-subset construct unknown-construct.",
    ),
    `Expected generator-readiness unknown subset issue, got ${JSON.stringify(unknownGeneratorSubsetResult.issues)}`,
  );
  writeFile(
    sampleGeneratorReadinessPath,
    JSON.stringify({
      obligationId: "BATTLE.SAMPLE",
      status: "fixture-bound",
      semanticCore: ["sample.qnt"],
      proofOnly: [],
      generatorSubset: ["record"],
      blockedBy: ["run-block-coupledd"],
      followUpTaskIds: ["A99-SAMPLE-FIXTURE-SPLIT"],
    }) + "\n",
  );
  const misspelledBlockerResult = buildKernelCoverage({ root });
  assert.ok(
    misspelledBlockerResult.issues.includes(
      "generator-readiness row 1.blockedBy has unknown generator-readiness blocker run-block-coupledd.",
    ),
    `Expected generator-readiness misspelled blocker issue, got ${JSON.stringify(misspelledBlockerResult.issues)}`,
  );
  assert.deepEqual(
    generatorReadinessBlockerCatalogIssues({
      blockerVocabulary: { "fixture-world-coupled": "fixture blocker" },
      scannerBlockers: { semanticCoreRunBlock: "run-block-coupled" },
    }),
    [
      "generator-readiness scanner blocker semanticCoreRunBlock uses undocumented blocker token run-block-coupled.",
    ],
  );
  writeFile(sampleGeneratorReadinessPath, initialGeneratorReadinessText);

  const sampleKernelIrBoundariesPath = path.join(
    root,
    "plans",
    "rules-kernel-coverage",
    "kernel-ir-boundaries.jsonl",
  );
  const initialKernelIrBoundariesText = fs.readFileSync(
    sampleKernelIrBoundariesPath,
    "utf8",
  );
  writeFile(
    sampleKernelIrBoundariesPath,
    JSON.stringify({
      boundary: "unknown-boundary",
      summary: "",
      runtimeBoundaryPaths: ["missing.ts", "missing.ts"],
      obligationIds: ["BATTLE.MISSING"],
      evidence: "",
    }) + "\n",
  );
  const invalidKernelIrBoundaryResult = buildKernelCoverage({ root });
  for (const issue of [
    "kernel-ir-boundaries row 1.boundary has unknown value unknown-boundary.",
    "kernel-ir-boundaries row 1.runtimeBoundaryPaths repeats missing.ts.",
    "kernel-ir-boundaries row 1.summary must be a non-empty string.",
    "kernel-ir-boundaries row 1.evidence must be a non-empty string.",
    "kernel-ir-boundaries row 1.runtimeBoundaryPaths path missing.ts does not exist.",
    "kernel-ir-boundaries row 1.obligationIds references unknown obligation BATTLE.MISSING.",
    "kernel-ir-boundaries is missing boundary command.",
  ]) {
    assert.ok(
      invalidKernelIrBoundaryResult.issues.includes(issue),
      `Expected kernel IR boundary issue ${issue}, got ${JSON.stringify(invalidKernelIrBoundaryResult.issues)}`,
    );
  }
  writeFile(sampleKernelIrBoundariesPath, initialKernelIrBoundariesText);

  const initialObligationsText = fs.readFileSync(
    path.join(root, "plans", "rules-kernel-coverage", "obligations.jsonl"),
    "utf8",
  );
  const currentProfileObligationsText = fs.readFileSync(
    path.join(
      root,
      "plans",
      "rules-kernel-coverage",
      "profile-obligations.jsonl",
    ),
    "utf8",
  );
  const initialProfilesText = fs.readFileSync(
    path.join(root, "plans", "unit-profile-coverage", "profiles.jsonl"),
    "utf8",
  );
  writeFile(
    path.join(root, "plans", "unit-profile-coverage", "profiles.jsonl"),
    [
      '{"id":"spell.sample","profileKind":"spell-invocation"}',
      JSON.stringify({
        id: "spell.multi-a",
        profileKind: "spell-invocation",
        verificationOwners: [
          { kind: "qnt-proof", ownerPath: "multi.qnt" },
          { kind: "runtime-test", ownerPath: "multi-a.test.ts" },
        ],
      }),
      JSON.stringify({
        id: "spell.multi-b",
        profileKind: "spell-invocation",
        verificationOwners: [
          { kind: "qnt-proof", ownerPath: "multi.qnt" },
          { kind: "runtime-test", ownerPath: "multi-b.test.ts" },
        ],
      }),
    ].join("\n") + "\n",
  );
  writeFile(
    path.join(
      root,
      "plans",
      "rules-kernel-coverage",
      "profile-obligations.jsonl",
    ),
    [
      '{"profileId":"spell.sample","obligationIds":["BATTLE.SAMPLE"]}',
      '{"profileId":"spell.multi-a","obligationIds":["BATTLE.MULTI"]}',
      '{"profileId":"spell.multi-b","obligationIds":["BATTLE.MULTI"]}',
    ].join("\n") + "\n",
  );
  writeFile(
    path.join(root, "plans", "rules-kernel-coverage", "obligations.jsonl"),
    initialObligationsText +
      JSON.stringify({
        id: "BATTLE.MULTI",
        title: "sample multi-profile runtime-test obligation",
        runtime: "battle",
        kind: "state-transition",
        status: "covered",
        qntOwners: ["multi.qnt"],
        runtimeOwners: ["multi.ts"],
        parityWitnesses: [
          { kind: "runtime-test", ownerPath: "multi-a.test.ts" },
          { kind: "runtime-test", ownerPath: "multi-b.test.ts" },
        ],
      }) +
      "\n",
  );
  writeFile(
    sampleQntOwnerRolesPath,
    initialQntOwnerRolesText +
      JSON.stringify({
        ownerPath: "multi.qnt",
        role: "semantic-core",
        evidence: "multi.qnt is the qnt-owner marker source for BATTLE.MULTI.",
      }) +
      "\n",
  );
  writeFile(
    sampleGeneratorReadinessPath,
    initialGeneratorReadinessText +
      JSON.stringify({
        obligationId: "BATTLE.MULTI",
        status: "semantic-core-candidate",
        semanticCore: ["multi.qnt"],
        proofOnly: [],
        generatorSubset: ["record"],
        blockedBy: [],
      }) +
      "\n",
  );
  writeFile(
    path.join(root, "multi.qnt"),
    "// KERNEL-COVERAGE: qnt-owner BATTLE.MULTI\nmodule multi {}\n",
  );
  writeFile(
    path.join(root, "multi.ts"),
    "// KERNEL-COVERAGE: runtime-owner BATTLE.MULTI\nexport const multi = true;\n",
  );
  writeFile(
    path.join(root, "multi-a.test.ts"),
    "// KERNEL-COVERAGE: parity-witness BATTLE.MULTI\n",
  );
  writeFile(
    path.join(root, "multi-b.test.ts"),
    "// KERNEL-COVERAGE: parity-witness BATTLE.MULTI\n",
  );
  const multiRuntimeWitnessResult = buildKernelCoverage({ root });
  assert.deepEqual(multiRuntimeWitnessResult.issues, []);
  assert.deepEqual(
    multiRuntimeWitnessResult.matrix.generatorReadinessBacklog,
    [],
  );
  writeFile(
    path.join(root, "plans", "rules-kernel-coverage", "obligations.jsonl"),
    initialObligationsText,
  );
  writeFile(
    path.join(
      root,
      "plans",
      "rules-kernel-coverage",
      "profile-obligations.jsonl",
    ),
    currentProfileObligationsText,
  );
  writeFile(
    path.join(root, "plans", "unit-profile-coverage", "profiles.jsonl"),
    initialProfilesText,
  );
  writeFile(sampleQntOwnerRolesPath, initialQntOwnerRolesText);
  writeFile(sampleGeneratorReadinessPath, initialGeneratorReadinessText);
  for (const fileName of [
    "multi.qnt",
    "multi.ts",
    "multi-a.test.ts",
    "multi-b.test.ts",
  ]) {
    fs.rmSync(path.join(root, fileName), { force: true });
  }

  const sampleObligationsPath = path.join(
    root,
    "plans",
    "rules-kernel-coverage",
    "obligations.jsonl",
  );
  fs.appendFileSync(
    sampleObligationsPath,
    JSON.stringify({
      id: "BATTLE.PENDING",
      title: "sample pending obligation",
      runtime: "battle",
      kind: "state-transition",
      status: "needs-qnt-owner",
    }) + "\n",
  );
  const sampleBattleHoleFrontierPath = path.join(
    root,
    "plans",
    "rules-kernel-coverage",
    "battle-hole-frontier.jsonl",
  );
  const sampleBattleHoleFrontierText = fs.readFileSync(
    sampleBattleHoleFrontierPath,
    "utf8",
  );
  const sampleBattleReducerPath = path.join(
    root,
    "packages",
    "battle-runtime",
    "src",
    "battle-reducer.ts",
  );
  const sampleBattleReducerText = fs.readFileSync(
    sampleBattleReducerPath,
    "utf8",
  );
  const sampleBattleSubjectsPath = path.join(
    root,
    "packages",
    "battle-runtime",
    "src",
    "battle-subjects.ts",
  );
  const sampleBattleSubjectsText = fs.readFileSync(
    sampleBattleSubjectsPath,
    "utf8",
  );

  writeFile(
    sampleBattleReducerPath,
    [
      "export type BattleTargetChoiceHole = { readonly kind: 'targetChoice'; };",
      "export type BattleUnmappedHole = { readonly kind: 'unmappedHole'; };",
      "export type BattleHole = BattleTargetChoiceHole | BattleUnmappedHole;",
      "export type BattleFill = { readonly kind: 'targetChoice'; readonly holeId: string; readonly value: string; };",
    ].join("\n") + "\n",
  );
  const unmappedTsHoleVariantResult = buildKernelCoverage({ root });
  assert.ok(
    unmappedTsHoleVariantResult.issues.includes(
      "battle-hole-frontier is missing BattleHole family BattleUnmappedHole.",
    ),
    `Expected unmapped TS BattleHole variant issue, got ${JSON.stringify(unmappedTsHoleVariantResult.issues)}`,
  );
  writeFile(sampleBattleReducerPath, sampleBattleReducerText);

  writeFile(
    sampleBattleReducerPath,
    [
      "export type BattleTargetChoiceHole = { readonly kind: 'targetChoice'; };",
      "export type BattleHole = BattleTargetChoiceHole;",
      "export type BattleFill =",
      "  | { readonly kind: 'targetChoice'; readonly holeId: string; readonly value: string; }",
      "  | { readonly kind: 'unmappedFill'; readonly holeId: string; readonly value: string; };",
    ].join("\n") + "\n",
  );
  const unmappedTsFillVariantResult = buildKernelCoverage({ root });
  assert.ok(
    unmappedTsFillVariantResult.issues.includes(
      "battle-hole-frontier is missing BattleFill kind unmappedFill.",
    ),
    `Expected unmapped TS BattleFill variant issue, got ${JSON.stringify(unmappedTsFillVariantResult.issues)}`,
  );
  writeFile(sampleBattleReducerPath, sampleBattleReducerText);

  writeFile(
    sampleBattleSubjectsPath,
    [
      "import { Schema } from 'effect';",
      "export const BattleSubjectSchema = Schema.Union(",
      "  Schema.Struct({ tag: Schema.Literal('action'), action: Schema.Literal('attack') }),",
      "  Schema.Struct({ tag: Schema.Literal('action'), action: Schema.Literal('unmappedAction') }),",
      ");",
      "export type BattleSubject = typeof BattleSubjectSchema.Type;",
    ].join("\n") + "\n",
  );
  const unmappedTsSubjectVariantResult = buildKernelCoverage({ root });
  assert.ok(
    unmappedTsSubjectVariantResult.issues.includes(
      "battle-hole-frontier is missing BattleSubject kind actionUnmappedAction.",
    ),
    `Expected unmapped TS BattleSubject variant issue, got ${JSON.stringify(unmappedTsSubjectVariantResult.issues)}`,
  );
  writeFile(sampleBattleSubjectsPath, sampleBattleSubjectsText);

  writeFile(
    sampleBattleHoleFrontierPath,
    [
      JSON.stringify({
        subject: "battle-hole-family",
        id: "BattleTargetChoiceHole",
        holeKind: "targetChoice",
        classification: "semantic-frontier",
        coveredByObligationIds: ["BATTLE.PENDING"],
        followUpTaskIds: [],
        reason: "sample semantic hole family",
      }),
      JSON.stringify({
        subject: "battle-fill-kind",
        id: "targetChoice",
        fillKind: "targetChoice",
        classification: "semantic-frontier",
        coveredByObligationIds: ["BATTLE.SAMPLE"],
        followUpTaskIds: [],
        reason: "sample semantic fill kind",
      }),
      JSON.stringify({
        subject: "battle-subject-kind",
        id: "actionAttack",
        subjectKind: "actionAttack",
        tag: "action",
        action: "attack",
        classification: "semantic-frontier",
        coveredByObligationIds: ["BATTLE.SAMPLE"],
        followUpTaskIds: [],
        reason: "sample semantic subject kind",
      }),
    ].join("\n") + "\n",
  );
  const nonCoveredSemanticResult = buildKernelCoverage({ root });
  assert.ok(
    nonCoveredSemanticResult.issues.includes(
      "battle-hole-frontier row 1 semantic-frontier row cannot claim non-covered obligation BATTLE.PENDING with status needs-qnt-owner; use followUpTaskIds for uncovered semantic work.",
    ),
    `Expected non-covered semantic frontier issue, got ${JSON.stringify(nonCoveredSemanticResult.issues)}`,
  );
  writeFile(sampleBattleHoleFrontierPath, sampleBattleHoleFrontierText);

  writeFile(
    sampleBattleHoleFrontierPath,
    [
      JSON.stringify({
        subject: "battle-hole-family",
        id: "BattleTargetChoiceHole",
        holeKind: "missingQntKind",
        classification: "semantic-frontier",
        coveredByObligationIds: ["BATTLE.SAMPLE"],
        followUpTaskIds: [],
        reason: "sample mis-kinded semantic hole family",
      }),
      JSON.stringify({
        subject: "battle-fill-kind",
        id: "targetChoice",
        fillKind: "targetChoice",
        classification: "semantic-frontier",
        coveredByObligationIds: ["BATTLE.SAMPLE"],
        followUpTaskIds: [],
        reason: "sample semantic fill kind",
      }),
      JSON.stringify({
        subject: "battle-subject-kind",
        id: "actionAttack",
        subjectKind: "actionAttack",
        tag: "action",
        action: "attack",
        classification: "semantic-frontier",
        coveredByObligationIds: ["BATTLE.SAMPLE"],
        followUpTaskIds: [],
        reason: "sample semantic subject kind",
      }),
    ].join("\n") + "\n",
  );
  const misKindedFrontierResult = buildKernelCoverage({ root });
  assert.ok(
    misKindedFrontierResult.issues.includes(
      "battle-hole-frontier row 1.holeKind missingQntKind maps to missing BattleHoleFamilyKind variant MissingQntKindHoleKind.",
    ),
    `Expected mis-kinded frontier QNT join issue, got ${JSON.stringify(misKindedFrontierResult.issues)}`,
  );
  writeFile(sampleBattleHoleFrontierPath, sampleBattleHoleFrontierText);

  writeFile(
    sampleBattleHoleFrontierPath,
    [
      JSON.stringify({
        subject: "battle-hole-family",
        id: "BattleTargetChoiceHole",
        holeKind: "targetChoice",
        classification: "semantic-frontier",
        coveredByObligationIds: ["BATTLE.SAMPLE"],
        followUpTaskIds: [],
        reason: "sample semantic hole family",
      }),
      JSON.stringify({
        subject: "battle-fill-kind",
        id: "missingQntFill",
        fillKind: "missingQntFill",
        classification: "semantic-frontier",
        coveredByObligationIds: ["BATTLE.SAMPLE"],
        followUpTaskIds: [],
        reason: "sample mis-kinded semantic fill kind",
      }),
      JSON.stringify({
        subject: "battle-subject-kind",
        id: "actionAttack",
        subjectKind: "actionAttack",
        tag: "action",
        action: "attack",
        classification: "semantic-frontier",
        coveredByObligationIds: ["BATTLE.SAMPLE"],
        followUpTaskIds: [],
        reason: "sample semantic subject kind",
      }),
    ].join("\n") + "\n",
  );
  const misKindedFillResult = buildKernelCoverage({ root });
  assert.ok(
    misKindedFillResult.issues.includes(
      "battle-hole-frontier row 2.fillKind missingQntFill maps to missing BattleFillKind variant MissingQntFillFillKind.",
    ),
    `Expected mis-kinded fill QNT join issue, got ${JSON.stringify(misKindedFillResult.issues)}`,
  );
  writeFile(sampleBattleHoleFrontierPath, sampleBattleHoleFrontierText);

  writeFile(
    sampleBattleHoleFrontierPath,
    [
      JSON.stringify({
        subject: "battle-hole-family",
        id: "BattleTargetChoiceHole",
        holeKind: "targetChoice",
        classification: "semantic-frontier",
        coveredByObligationIds: ["BATTLE.SAMPLE"],
        followUpTaskIds: [],
        reason: "sample semantic hole family",
      }),
      JSON.stringify({
        subject: "battle-fill-kind",
        id: "targetChoice",
        fillKind: "targetChoice",
        classification: "semantic-frontier",
        coveredByObligationIds: ["BATTLE.SAMPLE"],
        followUpTaskIds: [],
        reason: "sample semantic fill kind",
      }),
      JSON.stringify({
        subject: "battle-subject-kind",
        id: "missingSubjectKind",
        subjectKind: "missingSubjectKind",
        tag: "action",
        action: "attack",
        classification: "semantic-frontier",
        coveredByObligationIds: ["BATTLE.SAMPLE"],
        followUpTaskIds: [],
        reason: "sample mis-kinded semantic subject kind",
      }),
    ].join("\n") + "\n",
  );
  const misKindedSubjectResult = buildKernelCoverage({ root });
  assert.ok(
    misKindedSubjectResult.issues.includes(
      "battle-hole-frontier row 3.subjectKind missingSubjectKind maps to missing BattleSubjectKind variant MissingSubjectKindSubjectKind.",
    ),
    `Expected mis-kinded subject QNT join issue, got ${JSON.stringify(misKindedSubjectResult.issues)}`,
  );
  writeFile(sampleBattleHoleFrontierPath, sampleBattleHoleFrontierText);

  writeFile(
    sampleBattleHoleFrontierPath,
    [
      JSON.stringify({
        subject: "battle-hole-family",
        id: "BattleTargetChoiceHole",
        holeKind: null,
        classification: "semantic-frontier",
        coveredByObligationIds: ["BATTLE.SAMPLE"],
        followUpTaskIds: [],
        reason: "sample null hole kind",
      }),
      JSON.stringify({
        subject: "battle-fill-kind",
        id: "targetChoice",
        fillKind: "targetChoice",
        classification: "semantic-frontier",
        coveredByObligationIds: ["BATTLE.SAMPLE"],
        followUpTaskIds: [],
        reason: "sample semantic fill kind",
      }),
      JSON.stringify({
        subject: "battle-subject-kind",
        id: "actionAttack",
        subjectKind: "actionAttack",
        tag: "action",
        action: "attack",
        classification: "semantic-frontier",
        coveredByObligationIds: ["BATTLE.SAMPLE"],
        followUpTaskIds: [],
        reason: "sample semantic subject kind",
      }),
    ].join("\n") + "\n",
  );
  const nullHoleKindResult = buildKernelCoverage({ root });
  assert.ok(
    nullHoleKindResult.issues.includes(
      "battle-hole-frontier row 1.holeKind must not be null.",
    ),
    `Expected null holeKind issue, got ${JSON.stringify(nullHoleKindResult.issues)}`,
  );
  writeFile(sampleBattleHoleFrontierPath, sampleBattleHoleFrontierText);

  writeFile(
    path.join(
      root,
      "packages",
      "battle-runtime",
      "battle-runtime-hole-kinds.qnt",
    ),
    [
      "// KERNEL-COVERAGE: qnt-owner BATTLE.SAMPLE",
      "module battleRuntimeHoleKinds {",
      "  type BattleHoleFamilyKind =",
      "    | TargetChoiceHoleKind",
      "    | UnmappedHoleKind",
      "}",
    ].join("\n") + "\n",
  );
  const unmappedQntVariantResult = buildKernelCoverage({ root });
  assert.ok(
    unmappedQntVariantResult.issues.includes(
      "packages/battle-runtime/battle-runtime-hole-kinds.qnt BattleHoleFamilyKind variant UnmappedHoleKind has no semantic-frontier battle-hole-frontier row for holeKind unmapped.",
    ),
    `Expected unmapped QNT variant issue, got ${JSON.stringify(unmappedQntVariantResult.issues)}`,
  );
  writeFile(
    path.join(
      root,
      "packages",
      "battle-runtime",
      "battle-runtime-hole-kinds.qnt",
    ),
    [
      "// KERNEL-COVERAGE: qnt-owner BATTLE.SAMPLE",
      "module battleRuntimeHoleKinds {",
      "  type BattleHoleFamilyKind =",
      "    | TargetChoiceHoleKind",
      "}",
    ].join("\n") + "\n",
  );

  writeFile(
    path.join(
      root,
      "packages",
      "battle-runtime",
      "battle-runtime-fill-kinds.qnt",
    ),
    [
      "// KERNEL-COVERAGE: qnt-owner BATTLE.SAMPLE",
      "module battleRuntimeFillKinds {",
      "  type BattleFillKind =",
      "    | TargetChoiceFillKind",
      "    | UnmappedFillKind",
      "}",
    ].join("\n") + "\n",
  );
  const unmappedFillQntVariantResult = buildKernelCoverage({ root });
  assert.ok(
    unmappedFillQntVariantResult.issues.includes(
      "packages/battle-runtime/battle-runtime-fill-kinds.qnt BattleFillKind variant UnmappedFillKind has no semantic-frontier battle-hole-frontier row for fillKind unmapped.",
    ),
    `Expected unmapped fill QNT variant issue, got ${JSON.stringify(unmappedFillQntVariantResult.issues)}`,
  );
  writeFile(
    path.join(
      root,
      "packages",
      "battle-runtime",
      "battle-runtime-fill-kinds.qnt",
    ),
    [
      "// KERNEL-COVERAGE: qnt-owner BATTLE.SAMPLE",
      "module battleRuntimeFillKinds {",
      "  type BattleFillKind =",
      "    | TargetChoiceFillKind",
      "}",
    ].join("\n") + "\n",
  );

  writeFile(
    path.join(
      root,
      "packages",
      "battle-runtime",
      "battle-runtime-subject-kinds.qnt",
    ),
    [
      "// KERNEL-COVERAGE: qnt-owner BATTLE.SAMPLE",
      "module battleRuntimeSubjectKinds {",
      "  type BattleSubjectKind =",
      "    | ActionAttackSubjectKind",
      "    | UnmappedSubjectKind",
      "}",
    ].join("\n") + "\n",
  );
  const unmappedSubjectQntVariantResult = buildKernelCoverage({ root });
  assert.ok(
    unmappedSubjectQntVariantResult.issues.includes(
      "packages/battle-runtime/battle-runtime-subject-kinds.qnt BattleSubjectKind variant UnmappedSubjectKind has no semantic-frontier battle-hole-frontier row for subjectKind unmapped.",
    ),
    `Expected unmapped subject QNT variant issue, got ${JSON.stringify(unmappedSubjectQntVariantResult.issues)}`,
  );
  writeFile(
    path.join(
      root,
      "packages",
      "battle-runtime",
      "battle-runtime-subject-kinds.qnt",
    ),
    [
      "// KERNEL-COVERAGE: qnt-owner BATTLE.SAMPLE",
      "module battleRuntimeSubjectKinds {",
      "  type BattleSubjectKind =",
      "    | ActionAttackSubjectKind",
      "}",
    ].join("\n") + "\n",
  );

  writeFile(
    path.join(root, "sample.mbt.test.ts"),
    [
      "// KERNEL-COVERAGE: parity-witness BATTLE.SAMPLE",
      "import { run, stateCheck } from '@firfi/quint-connect';",
      "const sampleStateCheck = stateCheck(() => ({}), () => undefined);",
      "void run({",
      "  spec: path.resolve(import.meta.dirname, './wrong.mbt.qnt'),",
      "  step: 'wrongStep',",
      "  stateCheck: sampleStateCheck,",
      "});",
    ].join("\n") + "\n",
  );
  const wrongRunTargetResult = buildKernelCoverage({ root });
  assert.ok(
    wrongRunTargetResult.issues.includes(
      "BATTLE.SAMPLE parity witness sample.mbt.test.ts does not run sample.mbt.qnt with step step and stateCheck.",
    ),
    `Expected wrong run target issue, got ${JSON.stringify(wrongRunTargetResult.issues)}`,
  );

  // A witness that delegates run()/stateCheck() to a local run-helper, naming the
  // spec it passes, must satisfy the parity checks without an inline run() call.
  writeFile(
    path.join(root, "sample-witness-helper.ts"),
    [
      "import { run, stateCheck } from '@firfi/quint-connect';",
      "export function defineSampleWitness(config) {",
      "  const helperStateCheck = stateCheck(() => ({}), () => undefined);",
      "  void run({ spec: config.specFile, step: 'step', stateCheck: helperStateCheck });",
      "}",
    ].join("\n") + "\n",
  );
  writeFile(
    path.join(root, "sample.mbt.test.ts"),
    [
      "// KERNEL-COVERAGE: parity-witness BATTLE.SAMPLE",
      "import { defineSampleWitness } from './sample-witness-helper.ts';",
      "defineSampleWitness({",
      "  specFile: path.resolve(import.meta.dirname, './sample.mbt.qnt'),",
      "});",
    ].join("\n") + "\n",
  );
  const delegatedRunHelperResult = buildKernelCoverage({ root });
  for (const fragment of [
    "does not call quint-connect run()",
    "does not define a stateCheck()",
    "does not run sample.mbt.qnt with step step and stateCheck",
  ]) {
    assert.ok(
      !delegatedRunHelperResult.issues.some((issue) =>
        issue.includes(fragment),
      ),
      `Delegated run-helper parity witness should pass (${fragment}); got ${JSON.stringify(delegatedRunHelperResult.issues)}`,
    );
  }
  // Restore the prior witness content so downstream scenarios see prior state.
  writeFile(
    path.join(root, "sample.mbt.test.ts"),
    [
      "// KERNEL-COVERAGE: parity-witness BATTLE.SAMPLE",
      "import { run, stateCheck } from '@firfi/quint-connect';",
      "const sampleStateCheck = stateCheck(() => ({}), () => undefined);",
      "void run({",
      "  spec: path.resolve(import.meta.dirname, './wrong.mbt.qnt'),",
      "  step: 'wrongStep',",
      "  stateCheck: sampleStateCheck,",
      "});",
    ].join("\n") + "\n",
  );

  writeFile(
    path.join(root, "plans", "rules-kernel-coverage", "obligations.jsonl"),
    [
      JSON.stringify({
        id: "BATTLE.SAMPLE",
        title: "sample covered obligation",
        runtime: "battle",
        kind: "state-transition",
        status: "covered",
        profiles: [],
        qntOwners: ["sample.qnt"],
        runtimeOwners: ["sample.ts"],
        parityWitnesses: [
          {
            kind: "deterministic-qnt-replay",
            ownerPath: "sample.mbt.test.ts",
            deterministicReplayRationale: "   ",
          },
        ],
      }),
      JSON.stringify({
        id: "BATTLE.BOUNDARY",
        title: "sample boundary obligation",
        runtime: "battle",
        kind: "boundary-protocol",
        status: "boundary-only",
        reason: "Malformed client payload, not reducer semantics.",
      }),
    ].join("\n") + "\n",
  );
  writeFile(
    path.join(
      root,
      "plans",
      "rules-kernel-coverage",
      "profile-obligations.jsonl",
    ),
    [
      '{"profileId":"spell.sample","obligationIds":["BATTLE.SAMPLE"]}',
      '{"profileId":"spell.sample","obligationIds":["BATTLE.SAMPLE"]}',
    ].join("\n") + "\n",
  );
  const invalidResult = buildKernelCoverage({ root });
  assert.ok(
    invalidResult.issues.includes(
      "obligations.jsonl:1: BATTLE.SAMPLE.parityWitnesses[0].deterministicReplayRationale must be a non-empty string for deterministic-qnt-replay witnesses.",
    ),
    `Expected missing deterministic replay rationale issue, got ${JSON.stringify(invalidResult.issues)}`,
  );
  assert.ok(
    invalidResult.issues.includes(
      "obligations.jsonl:1: BATTLE.SAMPLE.parityWitnesses[0].qntSpecPath must be a non-empty string for deterministic-qnt-replay witnesses.",
    ),
    `Expected missing deterministic replay QNT spec issue, got ${JSON.stringify(invalidResult.issues)}`,
  );
  assert.ok(
    invalidResult.issues.includes(
      "obligations.jsonl:1: BATTLE.SAMPLE.parityWitnesses[0].stepAction must be a non-empty string for deterministic-qnt-replay witnesses.",
    ),
    `Expected missing deterministic replay step action issue, got ${JSON.stringify(invalidResult.issues)}`,
  );
  assert.ok(
    invalidResult.issues.includes(
      "BATTLE.SAMPLE.profiles is derived from profile-obligations.jsonl; remove the field from obligations.jsonl. Derived profiles: spell.sample.",
    ),
    `Expected duplicate profiles field issue, got ${JSON.stringify(invalidResult.issues)}`,
  );
  assert.ok(
    invalidResult.issues.includes(
      "profile-obligations row 2: duplicate profile mapping for spell.sample.",
    ),
    `Expected duplicate profile mapping issue, got ${JSON.stringify(invalidResult.issues)}`,
  );
  writeFile(
    path.join(root, "plans", "unit-profile-coverage", "profiles.jsonl"),
    [
      '{"id":"spell.sample","profileKind":"spell-invocation"}',
      '{"id":"equipment.sample","profileKind":"equipment"}',
    ].join("\n") + "\n",
  );
  writeFile(
    path.join(
      root,
      "plans",
      "rules-kernel-coverage",
      "profile-obligations.jsonl",
    ),
    '{"profileId":"equipment.sample","obligationIds":["BATTLE.SAMPLE"]}\n',
  );
  const nonKernelProfileMappingResult = buildKernelCoverage({ root });
  assert.ok(
    nonKernelProfileMappingResult.issues.includes(
      "profile-obligations row 1 maps non-rules-kernel profile equipment.sample with profileKind equipment.",
    ),
    `Expected non-rules-kernel profile mapping issue, got ${JSON.stringify(nonKernelProfileMappingResult.issues)}`,
  );
  writeFile(
    path.join(root, "plans", "unit-profile-coverage", "profiles.jsonl"),
    '{"id":"spell.sample","profileKind":"spell-invocation"}\n',
  );

  writeFile(
    path.join(root, "sample.mbt.qnt"),
    [
      "module sampleMbt {",
      "  var qReplayIndex: int",
      "  action step = true",
      "}",
    ].join("\n") + "\n",
  );
  writeFile(
    path.join(root, "plans", "rules-kernel-coverage", "obligations.jsonl"),
    JSON.stringify({
      id: "BATTLE.SAMPLE",
      title: "sample covered obligation",
      runtime: "battle",
      kind: "state-transition",
      status: "covered",
      qntOwners: ["sample.qnt"],
      runtimeOwners: ["sample.ts"],
      parityWitnesses: [
        {
          kind: "focused-mbt",
          ownerPath: "sample.mbt.test.ts",
          qntSpecPath: "sample.mbt.qnt",
          stepAction: "step",
        },
      ],
    }) + "\n",
  );
  writeFile(
    path.join(
      root,
      "plans",
      "rules-kernel-coverage",
      "profile-obligations.jsonl",
    ),
    '{"profileId":"spell.sample","obligationIds":["BATTLE.SAMPLE"]}\n',
  );
  const indexGatedResult = buildKernelCoverage({ root });
  assert.ok(
    indexGatedResult.issues.includes(
      "BATTLE.SAMPLE parity QNT spec sample.mbt.qnt uses qReplayIndex, so the witness kind must be deterministic-qnt-replay with deterministicReplayRationale.",
    ),
    `Expected qReplayIndex focused-mbt issue, got ${JSON.stringify(indexGatedResult.issues)}`,
  );
  writeFile(
    path.join(root, "plans", "rules-kernel-coverage", "matrix.json"),
    "sentinel\n",
  );
  assert.throws(() =>
    childProcess.execFileSync(
      process.execPath,
      [path.join(__dirname, "rules-kernel-coverage-check.cjs"), "--write"],
      {
        env: {
          ...process.env,
          RULES_KERNEL_COVERAGE_ROOT: root,
        },
        stdio: "pipe",
      },
    ),
  );
  assert.equal(
    fs.readFileSync(
      path.join(root, "plans", "rules-kernel-coverage", "matrix.json"),
      "utf8",
    ),
    "sentinel\n",
    "Invalid rules-kernel coverage writes must not update generated artifacts.",
  );
}

module.exports = { runSelfTest };
