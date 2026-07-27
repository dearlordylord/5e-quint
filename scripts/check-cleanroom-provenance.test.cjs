const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const fc = require("fast-check");

const auditModule = require("./srd521-surface-authored-corpus-audit.cjs");

let context;
let records;

before(() => {
  context = auditModule.createAuditContext();
  records = auditModule.readSurfaceRecords();
});

test("cleanroom provenance checker passes its production corpus", () => {
  const checker = path.join(__dirname, "check-cleanroom-provenance.cjs");
  const result = spawnSync(process.execPath, [checker], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /redistributable corpus audit passed/);
});

test("one accumulated result drives deterministic reports and rejection", () => {
  const result = auditModule.auditCorpus(context);
  assert.equal(result.status, "accepted");
  assert.equal(result.scope.kind, "corpus");
  assert.deepEqual(result.issues, []);

  const firstJson = auditModule.renderJsonReport(result);
  const secondJson = auditModule.renderJsonReport(result);
  const firstMarkdown = auditModule.renderMarkdownReport(result);
  assert.equal(firstJson, secondJson);
  assert.doesNotMatch(firstJson, /generatedAt|timestamp|digest/i);
  assert.match(firstMarkdown, /Status: accepted/);
  assert.equal(result.metrics.warningCounts["noncanonical-provenance"] ?? 0, 0);
  assert.equal(result.metrics.warningCounts["source-visible-reference"], 84);
  assert.ok(
    records
      .filter((record) => record.kind !== "statBlock")
      .every((record) => !Object.hasOwn(record.value, "description")),
  );

  const rejected = {
    ...result,
    status: "rejected",
    issues: [
      {
        code: "synthetic-test-issue",
        contentPath: "synthetic/fixture.json",
        message: "synthetic failure",
      },
    ],
  };
  rejected.issues[0].message = "synthetic | failure\ncontinued";
  assert.match(
    auditModule.renderMarkdownReport(rejected),
    /synthetic \\\| failure continued/,
  );
});

test("publication excerpts require canonical locators and copy exact RAW", () => {
  const index = auditModule.buildReferenceIndex();
  const excerpt = auditModule.rulesExcerptForSection(
    "Character-Origins.md:215,227-228",
    index,
  );
  assert.equal(excerpt.tag, "ok");
  assert.match(excerpt.rulesExcerpt, /^#### Halfling/m);
  assert.match(
    excerpt.rulesExcerpt,
    /\*\*\*Luck\.\*\*\* When you roll a 1 on the d20 of a D20 Test/,
  );

  const alias = auditModule.rulesExcerptForSection(
    "MagicItems#Cloak of Protection",
    index,
  );
  assert.equal(alias.tag, "invalid-locator");
  assert.equal(alias.resolutions[0].status, "ok-heading-alias");

  const malformedRange = auditModule.rulesExcerptForSection(
    "Character-Origins.md:215,bad,227-228",
    index,
  );
  assert.equal(malformedRange.tag, "invalid-locator");
  assert.equal(malformedRange.resolutions[0].status, "bad-line-range");
});

test("feature anchors resolve to their feature instead of the parent class", () => {
  const index = auditModule.buildReferenceIndex();
  const cases = [
    {
      section: "Classes/Bard#Bardic Inspiration",
      canonical: "Classes/Bard.md#Level 1: Bardic Inspiration",
    },
    {
      section: "Classes/Druid#Druidic",
      canonical: "Classes/Druid.md#Level 1: Druidic",
    },
    {
      section: "Classes/Paladin#Paladin's Smite",
      canonical: "Classes/Paladin.md#Level 2: Paladin's Smite",
    },
  ];

  for (const expected of cases) {
    const [resolution] = auditModule.resolveSection(expected.section, index);
    assert.equal(resolution.canonical, expected.canonical);
    const excerpt = auditModule.rulesExcerptForSection(expected.section, index);
    assert.equal(excerpt.tag, "ok");
    assert.ok(excerpt.rulesExcerpt.length < 2_000);
  }
});

test("mutations cannot extend immutable identity, Unit, or Stat Block evidence", () => {
  const classRecord = structuredClone(
    records.find((record) => record.id === "class_bard"),
  );
  classRecord.value.spellcasting.cantripAccess.spellIds[0] =
    "closed_catalog_spell";
  classRecord.value.startingEquipment[0].items[1].itemName =
    "Closed Catalog Item";

  const wildShape = structuredClone(
    records.find((record) => record.id === "druid_wild_shape"),
  );
  wildShape.value.mechanics.phases[0].effects[0].newForm.recommendedFormStatBlockIds[0] =
    "closed_catalog_stat_block";
  const namespacedReference = structuredClone(
    records.find((record) => record.id === "class_bard"),
  );
  namespacedReference.value.spellcasting.cantripAccess.spellIds[0] =
    "class_dancing_lights";

  const spellIssues = auditModule.auditRecordDelta(context, classRecord).issues;
  const statBlockIssues = auditModule.auditRecordDelta(
    context,
    wildShape,
  ).issues;
  const namespacedReferenceIssues = auditModule.auditRecordDelta(
    context,
    namespacedReference,
  ).issues;
  assert.ok(
    spellIssues.some(
      (issue) =>
        issue.code === "missing-authored-reference" &&
        issue.targetRecordId === "closed_catalog_spell",
    ),
  );
  assert.ok(
    spellIssues.some(
      (issue) =>
        issue.code === "identity-evidence-missing" &&
        issue.value === "Closed Catalog Item",
    ),
  );
  assert.ok(
    statBlockIssues.some(
      (issue) =>
        issue.code === "missing-authored-reference" &&
        issue.targetRecordId === "closed_catalog_stat_block",
    ),
  );
  assert.ok(
    namespacedReferenceIssues.some(
      (issue) =>
        issue.code === "missing-authored-reference" &&
        issue.targetRecordId === "class_dancing_lights",
    ),
  );
});

test("nested authored prose remains source-checked", () => {
  const passwall = structuredClone(
    records.find((candidate) => candidate.id === "passwall"),
  );
  passwall.value.mechanics.phases[0].attachment.description =
    "synthetic impossible location";
  const alteredLocation = auditModule.auditRecordDelta(context, passwall);
  assert.ok(
    alteredLocation.issues.some(
      (issue) =>
        issue.code === "prose-evidence-missing" &&
        issue.fieldPath === "mechanics.phases[0].attachment.description",
    ),
    JSON.stringify(alteredLocation.issues, null, 2),
  );
});

test("delta records are decoded before evidence traversal", () => {
  const mutations = [
    (record) => {
      record.value.kind = "bogus";
    },
    (record) => {
      record.value.syntheticExcess = true;
    },
    (record) => {
      record.value.provenance.section = 42;
    },
  ];
  for (const mutate of mutations) {
    const record = structuredClone(
      records.find((candidate) => candidate.id === "class_bard"),
    );
    mutate(record);
    const result = auditModule.auditRecordDelta(context, record);
    assert.ok(
      result.issues.some((issue) => issue.code === "surface-decode-failure"),
      JSON.stringify(result.issues, null, 2),
    );
  }
});

test("authored catalog names cannot borrow ID namespace normalization", () => {
  const record = structuredClone(
    records.find((candidate) => candidate.id === "class_barbarian"),
  );
  record.value.startingEquipment[0].items[1].itemName = "weapon_greataxe";

  const result = auditModule.auditRecordDelta(context, record);
  assert.ok(
    result.issues.some(
      (issue) =>
        issue.code === "identity-evidence-missing" &&
        issue.value === "weapon_greataxe",
    ),
    JSON.stringify(result.issues, null, 2),
  );
  assert.equal(
    auditModule.sourceContainsIdentity(
      "class_class_leather_armor",
      "Leather Armor",
    ),
    false,
  );
});

test("authored selection references require their owning record's evidence", () => {
  const record = structuredClone(
    records.find((candidate) => candidate.id === "class_bard"),
  );
  record.value.spellcasting.cantripAccess.spellIds[0] = "fire_bolt";

  const result = auditModule.auditRecordDelta(context, record);
  assert.ok(
    result.issues.some(
      (issue) =>
        issue.code === "authored-reference-evidence-missing" &&
        issue.targetRecordId === "fire_bolt",
    ),
    JSON.stringify(result.issues, null, 2),
  );
});

test("delta records cannot supply their own source resolutions", () => {
  const record = structuredClone(
    records.find((candidate) => candidate.id === "mass_suggestion"),
  );
  record.value.mechanics.components.m = "a bit of phosphorus";
  record.sourceResolutions = auditModule.resolveSection(
    "Spells/Descriptions-A-D#Dancing Lights",
    auditModule.buildReferenceIndex(),
  );

  const result = auditModule.auditRecordDelta(context, record);
  assert.equal(result.scope.kind, "record-delta");
  assert.ok(
    result.issues.some(
      (issue) =>
        issue.code === "prose-evidence-missing" &&
        issue.fieldPath === "mechanics.components.m",
    ),
    JSON.stringify(result.issues, null, 2),
  );
});

test("delta records cannot change immutable provenance", () => {
  for (const section of [
    "Spells/Descriptions-A.md:1-2",
    "Totally/Missing.md:1",
  ]) {
    const record = structuredClone(
      records.find((candidate) => candidate.id === "acid_splash"),
    );
    record.value.provenance.section = section;

    const result = auditModule.auditRecordDelta(context, record);
    assert.ok(
      result.issues.some(
        (issue) =>
          issue.code === "delta-provenance-mismatch" &&
          issue.candidateSection === section,
      ),
      `${section}\n${JSON.stringify(result.issues, null, 2)}`,
    );
  }
});

test("context snapshots caller-owned corpus records", () => {
  const callerRecord = structuredClone(
    records.find((candidate) => candidate.id === "fire_bolt"),
  );
  const isolatedContext = auditModule.createAuditContext({
    records: [callerRecord],
  });
  callerRecord.value.name = "Closed Catalog Mutation";

  const result = auditModule.auditCorpus(isolatedContext);
  assert.equal(
    result.status,
    "accepted",
    JSON.stringify(result.issues, null, 2),
  );
});

test("one delta accumulates independent provenance, identity, and reference failures", () => {
  const record = structuredClone(
    records.find((candidate) => candidate.id === "class_bard"),
  );
  record.value.provenance = {
    kind: "synthetic-test",
    section: "synthetic-test",
  };
  record.value.name = "Closed Catalog Identity";
  record.value.spellcasting.cantripAccess.spellIds[0] = "closed_catalog_unit";

  const result = auditModule.auditRecordDelta(context, record);
  assert.equal(result.status, "rejected");
  assert.ok(result.issues.length >= 3, JSON.stringify(result.issues, null, 2));
  assert.ok(result.issues.some((issue) => issue.code === "non-srd-provenance"));
  assert.ok(
    result.issues.some((issue) => issue.code === "identity-evidence-missing"),
  );
  assert.ok(
    result.issues.some((issue) => issue.code === "missing-authored-reference"),
  );
});

test("exact short-identity matching never degrades to substring matching", () => {
  fc.assert(
    fc.property(
      fc.constantFrom("a", "an", "or", "ray", "elf"),
      fc.constantFrom("catapult", "orange", "arrayed", "shelf", "arbitrary"),
      (identity, source) => {
        assert.equal(
          auditModule.sourceContainsIdentity(identity, source),
          false,
        );
      },
    ),
    { numRuns: 25 },
  );
  assert.equal(
    auditModule.sourceContainsIdentity("Ray", "The Ray deals Cold damage."),
    true,
  );
});

test("heading and list-form prose anchors exclude sibling leaves", () => {
  const fixtureRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "srd521-source-index-"),
  );
  after(() => fs.rmSync(fixtureRoot, { recursive: true, force: true }));
  fs.writeFileSync(
    path.join(fixtureRoot, "Synthetic.md"),
    [
      "# Synthetic",
      "",
      "## Parent",
      "",
      "### First Leaf",
      "first-owned-token",
      "",
      "### Sibling Leaf",
      "sibling-only-token",
      "",
      "- **First List.** first-list-token",
      "- **Sibling List.** sibling-list-only-token",
      "",
    ].join("\n"),
  );
  fs.writeFileSync(
    path.join(fixtureRoot, "ATTRIBUTION.md"),
    "Synthetic sibling-only-token attribution.",
  );

  const index = auditModule.buildReferenceIndex(fixtureRoot);
  assert.equal(index.rawByRel.has("ATTRIBUTION.md"), false);
  const heading = auditModule.resolveSection("Synthetic#First Leaf", index)[0];
  const list = auditModule.resolveSection("Synthetic#First List", index)[0];
  const headingSource = auditModule.sourceTextForResolution(heading, index);
  const listSource = auditModule.sourceTextForResolution(list, index);

  assert.match(headingSource, /first-owned-token/);
  assert.doesNotMatch(headingSource, /sibling-only-token/);
  assert.match(listSource, /first-list-token/);
  assert.doesNotMatch(listSource, /sibling-list-only-token/);
});

test("accepted resolutions with empty source evidence fail closed", () => {
  const fixtureRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "srd521-empty-source-"),
  );
  after(() => fs.rmSync(fixtureRoot, { recursive: true, force: true }));
  const fixtureSource = path.join(fixtureRoot, ".references/srd-5.2.1");
  fs.mkdirSync(fixtureSource, { recursive: true });
  fs.writeFileSync(path.join(fixtureSource, "Empty.md"), "");
  const record = structuredClone(
    records.find((candidate) => candidate.id === "fire_bolt"),
  );
  record.value.provenance.section = "Empty.md";
  const emptyContext = auditModule.createAuditContext({
    root: fixtureRoot,
    records: [record],
  });
  const result = auditModule.auditRecordDelta(emptyContext, record);
  assert.ok(
    result.issues.some((issue) => issue.code === "empty-source-evidence"),
  );
});

test("malformed and non-record corpus files accumulate in the production result", () => {
  const fixtureRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "srd521-malformed-corpus-"),
  );
  after(() => fs.rmSync(fixtureRoot, { recursive: true, force: true }));
  const fixtureContent = path.join(fixtureRoot, "packages/surface/content");
  fs.mkdirSync(fixtureContent, { recursive: true });
  fs.writeFileSync(path.join(fixtureContent, "first.json"), "{");
  fs.writeFileSync(path.join(fixtureContent, "second.json"), "[");
  fs.writeFileSync(path.join(fixtureContent, "object.json"), "{}");
  fs.writeFileSync(path.join(fixtureContent, "empty.json"), "[]");

  const result = auditModule.auditCorpus(
    auditModule.createAuditContext({ root: fixtureRoot }),
  );
  const corpusShapeIssues = result.issues.filter(
    (issue) =>
      issue.code === "surface-content-unreadable" ||
      issue.code === "surface-decode-failure" ||
      issue.code === "surface-content-empty",
  );
  assert.equal(result.status, "rejected");
  assert.equal(
    corpusShapeIssues.length,
    4,
    JSON.stringify(result.issues, null, 2),
  );
});

test("an empty production corpus fails closed", () => {
  const fixtureRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "srd521-empty-corpus-"),
  );
  after(() => fs.rmSync(fixtureRoot, { recursive: true, force: true }));
  fs.mkdirSync(path.join(fixtureRoot, "packages/surface/content"), {
    recursive: true,
  });

  const result = auditModule.auditCorpus(
    auditModule.createAuditContext({ root: fixtureRoot }),
  );
  assert.equal(result.status, "rejected");
  assert.ok(
    result.issues.some((issue) => issue.code === "surface-corpus-empty"),
    JSON.stringify(result.issues, null, 2),
  );
});

test("exact prose cannot borrow unrelated words from its source section", () => {
  const record = structuredClone(
    records.find((candidate) => candidate.id === "mass_suggestion"),
  );
  record.value.mechanics.components.m =
    "a snake's tongue and a visibly synthetic token";

  const result = auditModule.auditRecordDelta(context, record);
  assert.ok(
    result.issues.some(
      (issue) =>
        issue.code === "prose-evidence-missing" &&
        issue.fieldPath === "mechanics.components.m",
    ),
    JSON.stringify(result.issues, null, 2),
  );
});
