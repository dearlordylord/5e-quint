const assert = require("node:assert/strict");
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
        profiles: ["spell.sample"],
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
    path.join(root, "plans", "rules-kernel-coverage", "profile-obligations.jsonl"),
    '{"profileId":"spell.sample","obligationIds":["BATTLE.SAMPLE"]}\n',
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
      "void run({});",
      "void stateCheck(() => ({}), () => undefined);",
      "const spec = 'sample.mbt.qnt';",
    ].join("\n") + "\n",
  );

  const result = buildKernelCoverage({ root });
  assert.deepEqual(result.issues, []);
  assert.equal(result.matrix.summary.byStatus.covered, 1);
  assert.equal(result.matrix.summary.byStatus["boundary-only"], 1);
}

module.exports = { runSelfTest };
