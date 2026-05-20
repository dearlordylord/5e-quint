const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { buildKernelCoverage } = require("./rules-kernel-coverage-check.cjs");

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
    path.join(root, "plans", "rules-kernel-coverage", "obligations.jsonl"),
    [
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
      proofOnly: [],
      generatorSubset: ["record", "pure-def"],
      blockedBy: [],
      dryRun: "plans/rules-kernel-coverage/SAMPLE_DRY_RUN.md",
    }) + "\n",
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
  assert.equal(result.matrix.generatorReadiness.length, 1);

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
