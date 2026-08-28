#!/usr/bin/env node

const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  buildManifest,
  buildProvenance,
  crossBoundaryIds,
  directMigratedAdapterIds,
  normalizeRepositoryPath,
  relatedButNotSelectedObligations,
  registryCommit,
  spatialHazardIds,
  synchronizeManifest,
} = require("./gh381-registry-path-manifest.cjs");

const obligationsPath = "plans/rules-kernel-coverage/obligations.jsonl";
const rolesPath = "plans/rules-kernel-coverage/qnt-owner-roles.jsonl";
const generatorPath = "scripts/gh381-registry-path-manifest.cjs";

function writeFile(root, repoPath, content = "fixture\n") {
  const absolute = path.join(root, repoPath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content);
}

function git(root, args) {
  return childProcess.execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function fixtureRows() {
  const relatedIds = new Set(
    relatedButNotSelectedObligations.map((row) => row.id),
  );
  const selectedActiveIds = new Set([
    ...directMigratedAdapterIds,
    ...spatialHazardIds,
  ]);
  const ids = Array.from(
    new Set([
      ...crossBoundaryIds,
      ...directMigratedAdapterIds,
      ...spatialHazardIds,
      ...relatedIds,
    ]),
  );
  const ownerId = directMigratedAdapterIds[0];
  return ids.map((id) => ({
    id,
    kind: selectedActiveIds.has(id)
      ? "active-effect-lifecycle"
      : "state-transition",
    ...(id === ownerId
      ? {
          runtimeOwners: ["fixtures//runtime.ts"],
          qntOwners: [
            "fixtures/semantic.qnt",
            "fixtures/bridge.qnt",
            "fixtures/unregistered.qnt",
          ],
          parityWitnesses: [
            {
              ownerPath: "fixtures/witness.test.ts",
              qntSpecPath: "fixtures/witness.mbt.qnt",
            },
          ],
        }
      : {}),
    ...(relatedIds.has(id) ? { kind: "state-transition" } : {}),
  }));
}

function setupFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gh381-manifest-"));
  const obligations = fixtureRows();
  const roles = [
    { ownerPath: "fixtures/semantic.qnt", role: "semantic-core" },
    { ownerPath: "fixtures/bridge.qnt", role: "bridge" },
  ];
  for (const repoPath of [
    "fixtures/runtime.ts",
    "fixtures/semantic.qnt",
    "fixtures/bridge.qnt",
    "fixtures/unregistered.qnt",
    "fixtures/witness.test.ts",
    "fixtures/witness.mbt.qnt",
    "scripts/raw-swarm/sdk-player/scenario-session.ts",
    "scripts/raw-swarm/sdk-player/scenario-setup-runtime.test.ts",
  ]) {
    writeFile(root, repoPath);
  }
  writeFile(root, generatorPath, "fixture generator\n");
  const obligationsText = `${obligations.map(JSON.stringify).join("\n")}\n`;
  const rolesText = `${roles.map(JSON.stringify).join("\n")}\n`;
  writeFile(root, obligationsPath, obligationsText);
  writeFile(root, rolesPath, rolesText);
  git(root, ["init", "--quiet"]);
  git(root, ["config", "user.email", "manifest-test@example.invalid"]);
  git(root, ["config", "user.name", "Manifest Test"]);
  git(root, ["add", "."]);
  git(root, ["commit", "--quiet", "-m", "fixture"]);
  return { obligations, obligationsText, roles, rolesText, root };
}

function runSelfTest() {
  const fixture = setupFixture();
  const expectedCommit = git(fixture.root, ["rev-parse", "HEAD"]).trim();
  const provenance = buildProvenance(fixture.root);
  assert.equal(provenance.registryCommit, expectedCommit);
  assert.deepEqual(
    provenance.inputs.map((input) => input.path),
    [obligationsPath, rolesPath],
  );
  assert.equal(
    provenance.generator.sha256,
    sha256(fs.readFileSync(path.join(fixture.root, generatorPath))),
  );

  const input = {
    obligations: fixture.obligations,
    provenance,
    roles: fixture.roles,
    rootPath: fixture.root,
  };
  const manifest = buildManifest(input);
  assert.equal(JSON.stringify(buildManifest(input)), JSON.stringify(manifest));
  assert.ok(manifest.sourceOrPurePaths.includes("fixtures/runtime.ts"));
  assert.ok(manifest.sourceOrPurePaths.includes("fixtures/semantic.qnt"));
  assert.ok(manifest.parityOrFixturePaths.includes("fixtures/bridge.qnt"));
  assert.ok(
    manifest.parityOrFixturePaths.includes("fixtures/unregistered.qnt"),
  );
  assert.deepEqual(manifest.qntOwnerAccounting.counts, {
    semanticCore: 1,
    bridge: 1,
    mbtFixture: 0,
    proofOnly: 0,
    selectedIdentityTrace: 0,
    unregistered: 1,
    totalResolvedOwnerPaths: 3,
  });
  assert.equal(manifest.qntOwnerAccounting.unregisteredObligations.length, 1);
  assert.throws(
    () =>
      buildManifest({
        ...input,
        provenance: {
          ...provenance,
          generator: { ...provenance.generator, sha256: "0".repeat(64) },
        },
      }),
    /SHA-256 does not match/,
  );
  assert.throws(
    () =>
      buildManifest({ ...input, roles: [...fixture.roles, fixture.roles[0]] }),
    /Duplicate QNT owner role path/,
  );

  assert.equal(
    normalizeRepositoryPath(
      fixture.root,
      "fixtures\\runtime.ts",
      "normalized fixture",
    ),
    "fixtures/runtime.ts",
  );
  for (const unsafePath of [
    path.join(fixture.root, "fixtures/runtime.ts"),
    "C:\\fixtures\\runtime.ts",
    "-runtime.ts",
    "../runtime.ts",
    "fixtures/missing.ts",
    "fixtures",
  ]) {
    assert.throws(() =>
      normalizeRepositoryPath(fixture.root, unsafePath, "unsafe fixture"),
    );
  }
  const outside = path.join(path.dirname(fixture.root), "outside-file.ts");
  fs.writeFileSync(outside, "outside\n");
  fs.symlinkSync(outside, path.join(fixture.root, "fixtures", "outside.ts"));
  assert.throws(() =>
    normalizeRepositoryPath(
      fixture.root,
      "fixtures/outside.ts",
      "outside link",
    ),
  );

  const unsafeObligations = fixture.obligations.map((row, index) =>
    index === 0 ? { ...row, runtimeOwners: ["../outside.ts"] } : row,
  );
  assert.throws(
    () => buildManifest({ ...input, obligations: unsafeObligations }),
    /parent traversal/,
  );
  const missingObligations = fixture.obligations.map((row, index) =>
    index === 0 ? { ...row, runtimeOwners: ["fixtures/missing.ts"] } : row,
  );
  assert.throws(
    () => buildManifest({ ...input, obligations: missingObligations }),
    /existing regular file/,
  );

  const output = path.join(fixture.root, "manifest.json");
  const rendered = `${JSON.stringify(manifest, null, 2)}\n`;
  assert.equal(
    synchronizeManifest({ output, rendered, write: true }),
    "written",
  );
  assert.equal(
    synchronizeManifest({ output, rendered, write: false }),
    "current",
  );
  fs.appendFileSync(output, "stale\n");
  assert.equal(
    synchronizeManifest({ output, rendered, write: false }),
    "stale",
  );

  fs.appendFileSync(path.join(fixture.root, obligationsPath), "dirty\n");
  assert.throws(() => registryCommit(fixture.root), /Commit authored/);
  fs.writeFileSync(
    path.join(fixture.root, obligationsPath),
    fixture.obligationsText,
  );
  fs.appendFileSync(path.join(fixture.root, rolesPath), "staged\n");
  git(fixture.root, ["add", "--", rolesPath]);
  assert.throws(() => registryCommit(fixture.root), /Commit authored/);
  git(fixture.root, ["restore", "--staged", "--worktree", "--", rolesPath]);
  assert.equal(registryCommit(fixture.root), expectedCommit);

  fs.appendFileSync(path.join(fixture.root, generatorPath), "revision two\n");
  const changedGenerator = buildProvenance(fixture.root);
  assert.equal(changedGenerator.registryCommit, expectedCommit);
  assert.notEqual(
    changedGenerator.generator.sha256,
    provenance.generator.sha256,
  );
  console.log("#381 registry path manifest self-test OK.");
}

runSelfTest();
