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

test("summary prose cannot append a source-free sentence", () => {
  const record = structuredClone(
    records.find((candidate) => candidate.id === "class_bard"),
  );
  record.value.description += " Synthetic bananas.";

  const result = auditModule.auditRecordDelta(context, record);
  assert.ok(
    result.issues.some(
      (issue) =>
        issue.code === "prose-evidence-missing" &&
        issue.fieldPath === "description",
    ),
    JSON.stringify(result.issues, null, 2),
  );

  const inlineRecord = structuredClone(
    records.find((candidate) => candidate.id === "class_bard"),
  );
  inlineRecord.value.description = `${inlineRecord.value.description.replace(/\.$/, "")} synthetic bananas.`;
  const inlineResult = auditModule.auditRecordDelta(context, inlineRecord);
  assert.ok(
    inlineResult.issues.some(
      (issue) =>
        issue.code === "prose-evidence-missing" &&
        issue.fieldPath === "description",
    ),
    JSON.stringify(inlineResult.issues, null, 2),
  );

  for (const fabricatedClaim of [
    "creatures have the Invisible condition",
    "the target regains Hit Points",
    "every target takes Fire damage",
    "the target may take Fire damage",
    "the target takes more Fire damage",
  ]) {
    const spellRecord = structuredClone(
      records.find((candidate) => candidate.id === "fire_bolt"),
    );
    spellRecord.value.description = `${spellRecord.value.description.replace(/\.$/, "")}, and ${fabricatedClaim}.`;
    const fabricatedResult = auditModule.auditRecordDelta(context, spellRecord);
    assert.ok(
      fabricatedResult.issues.some(
        (issue) =>
          issue.code === "prose-evidence-missing" &&
          issue.fieldPath === "description",
      ),
      `${fabricatedClaim}\n${JSON.stringify(fabricatedResult.issues, null, 2)}`,
    );
  }
});

test("summary prose cannot change conjunctions, conditions, or damage semantics", () => {
  const mutations = [
    {
      id: "fire_bolt",
      mutate(description) {
        return `${description} The object starts burning whether the attack hits.`;
      },
    },
    {
      id: "fire_bolt",
      mutate(description) {
        return description.replace(
          "You hurl a mote of fire",
          "You hit a mote of fire",
        );
      },
    },
    {
      id: "fire_bolt",
      mutate(description) {
        return `${description} The target takes Fire damage where the object starts burning.`;
      },
    },
    {
      id: "acid_splash",
      mutate(description) {
        return description.replace(
          "must succeed on a Dexterity saving throw or take",
          "must succeed on a Dexterity saving throw and take",
        );
      },
    },
    {
      id: "aura_of_life",
      mutate(description) {
        return description.replace(
          "starts its turn in the aura, that ally regains 1 Hit Point",
          "regains its turn in the aura, that ally starts 1 Hit Point",
        );
      },
    },
    {
      id: "aura_of_life",
      mutate(description) {
        return description.replace(
          "starts its turn in the aura, that ally regains 1 Hit Point",
          "regains the turn in the aura, that ally starts 1 Hit Point",
        );
      },
    },
    {
      id: "alarm",
      mutate(description) {
        return description
          .replace("20-foot Cube", "10-foot Cube")
          .replace("sounds for 10 seconds", "sounds for 20 seconds");
      },
    },
    {
      id: "alarm",
      mutate(description) {
        return description
          .replace(
            "sound of a handbell for 10 seconds",
            "sound of a handbell for 1 mile",
          )
          .replace(
            "within 1 mile of the warded area",
            "within 10 seconds of the warded area",
          );
      },
    },
    {
      id: "animate_dead",
      mutate(description) {
        return description
          .replace("within 60 feet", "within 24 hours")
          .replace("for 24 hours", "for 60 feet");
      },
    },
    {
      id: "acid_splash",
      mutate(description) {
        return description.replace(
          "damage increases by 1d6 when you reach",
          "damage increases by 1d6 where you reach",
        );
      },
    },
    {
      id: "acid_splash",
      mutate(description) {
        return description.replace(
          "must succeed on a Dexterity saving throw or take 1d6 Acid damage",
          "must take a Dexterity saving throw or succeed on 1d6 Acid damage",
        );
      },
    },
    {
      id: "acid_splash",
      mutate(description) {
        return description
          .replace(
            "must succeed on a Dexterity saving throw or take",
            "must succeed on a Dexterity saving throw and take",
          )
          .replace(", and 17 (4d6)", ", or 17 (4d6)");
      },
    },
    {
      id: "acid_splash",
      mutate(description) {
        return description
          .replace(
            "within range, where it explodes",
            "within range, when it explodes",
          )
          .replace(
            "damage increases by 1d6 when you reach",
            "damage increases by 1d6 where you reach",
          );
      },
    },
    {
      id: "acid_splash",
      mutate(description) {
        return description
          .replace("a Dexterity saving throw", "an Acid saving throw")
          .replace("1d6 Acid damage", "1d6 Dexterity damage");
      },
    },
    {
      id: "acid_splash",
      mutate(description) {
        return description
          .replace("5-foot-radius", "1d6-foot-radius")
          .replace("take 1d6 Acid damage", "take 5 Acid damage");
      },
    },
    {
      id: "acid_splash",
      mutate(description) {
        return description
          .replace("5-foot-radius", "2d6-foot-radius")
          .replace("levels 5 (2d6)", "levels 5 (5)");
      },
    },
    {
      id: "arcane_sword",
      mutate(description) {
        return description
          .replace("target within 5 feet", "target within 30 feet")
          .replace("sword up to 30 feet", "sword up to 5 feet");
      },
    },
    {
      id: "aid",
      mutate(description) {
        return description
          .replace(
            "increase by 5 for the duration",
            "increase by 2 for the duration",
          )
          .replace("slot level above 2", "slot level above 5");
      },
    },
    {
      id: "aura_of_life",
      mutate(description) {
        return description
          .replace("ally with 0 Hit Points", "ally with 1 Hit Points")
          .replace("regains 1 Hit Point", "regains 0 Hit Point");
      },
    },
    {
      id: "acid_splash",
      mutate(description) {
        return description
          .replace("levels 5 (2d6)", "levels 5 (4d6)")
          .replace("17 (4d6)", "17 (2d6)");
      },
    },
    {
      id: "antimagic_field",
      mutate(description) {
        return description
          .replace(
            "don't work inside the aura or on anything",
            "don't work inside the aura and on anything",
          )
          .replace(
            "can't extend into the aura, and no one",
            "can't extend into the aura, or no one",
          );
      },
    },
    {
      id: "calm_emotions",
      mutate(description) {
        return description
          .replace(
            "the Charmed and Frightened conditions",
            "the Charmed or Frightened conditions",
          )
          .replace(
            "already Charmed or Frightened",
            "already Charmed and Frightened",
          );
      },
    },
    {
      id: "fire_bolt",
      mutate(description) {
        return description.replace(
          "Make a ranged spell attack against the target",
          "Make the target attack against a ranged spell",
        );
      },
    },
    {
      id: "aura_of_life",
      mutate(description) {
        return description.replace(
          "If an ally with 0 Hit Points starts its turn in the aura, that ally regains 1 Hit Point",
          "If the aura with 0 Hit Points starts its turn in the ally, that ally regains 1 Hit Point",
        );
      },
    },
    {
      id: "fire_bolt",
      mutate(description) {
        return description.replace(
          "A flammable object hit by this spell starts burning",
          "A flammable spell hit by this object starts burning",
        );
      },
    },
    {
      id: "fire_bolt",
      mutate(description) {
        return description
          .replace("You hurl a mote of fire", "You hit a mote of fire")
          .replace(
            "A flammable object hit by this spell",
            "A flammable object hurled by this spell",
          );
      },
    },
    {
      id: "aura_of_life",
      mutate(description) {
        return description.replace(
          "If an ally with 0 Hit Points starts its turn in the aura, that ally regains 1 Hit Point",
          "If the aura with 0 Hit Points starts its turn in an ally, that aura regains 1 Hit Point",
        );
      },
    },
    {
      id: "aura_of_life",
      mutate(description) {
        return description.replace(
          "If an ally with 0 Hit Points starts its turn in the aura, that ally regains 1 Hit Point",
          "If an ally with 0 Hit Points regains its turn while in the aura, that ally starts 1 Hit Point",
        );
      },
    },
    {
      id: "cleric_channel_divinity",
      mutate(description) {
        return description.replace(
          "uses when you finish a Short Rest, and you regain all expended uses when",
          "uses and you finish a Short Rest, when you regain all expended uses when",
        );
      },
    },
    {
      id: "flame_blade",
      mutate(description) {
        return description
          .replace("equal to 3d6", "equal to 10")
          .replace("in a 10-foot radius", "in a 3d6-foot radius");
      },
    },
    {
      id: "flaming_sphere",
      mutate(description) {
        return description
          .replace("a 5-foot-diameter sphere", "a 30-foot-diameter sphere")
          .replace("sphere up to 30 feet", "sphere up to 5 feet");
      },
    },
    {
      id: "conjure_elemental",
      mutate(description) {
        return description
          .replace("takes 8d8 damage", "takes 4d8 damage")
          .replace("it takes 4d8 damage", "it takes 8d8 damage");
      },
    },
    {
      id: "acid_splash",
      mutate(description) {
        return description.replace(
          "levels 5 (2d6), 11 (3d6), and 17 (4d6)",
          "levels 2d6 (5), 11 (3d6), and 17 (4d6)",
        );
      },
    },
    {
      id: "acid_splash",
      mutate(description) {
        return description.replace(
          "levels 5 (2d6), 11 (3d6), and 17 (4d6)",
          "levels 5 (11), 2d6 (3d6), and 17 (4d6)",
        );
      },
    },
    {
      id: "blink",
      mutate(description) {
        return description.replace("On a roll of 4-6", "On a roll of 6-4");
      },
    },
    {
      id: "storm_of_vengeance",
      mutate(description) {
        return description
          .replace("On turn 2,", "On turn synthetic,")
          .replace("On turn 3,", "On turn 2,")
          .replace("On turn synthetic,", "On turn 3,");
      },
    },
    {
      id: "storm_of_vengeance",
      mutate(description) {
        return description
          .replace("On turn 2,", "On turn synthetic,")
          .replace("On turn 4,", "On turn 2,")
          .replace("On turn synthetic,", "On turn 4,");
      },
    },
    {
      id: "storm_of_vengeance",
      mutate(description) {
        return description
          .replace("takes 4d6 Acid damage", "takes synthetic Acid damage")
          .replace(
            "takes 2d6 Bludgeoning damage",
            "takes 4d6 Bludgeoning damage",
          )
          .replace("takes synthetic Acid damage", "takes 2d6 Acid damage");
      },
    },
    {
      id: "tree_stride",
      mutate(description) {
        return description.replace(
          "within 500 feet. You use 5 feet of movement",
          "within 5 feet. You use 500 feet of movement",
        );
      },
    },
    {
      id: "tree_stride",
      mutate(description) {
        return description
          .replace(
            "You use 5 feet of movement",
            "You use synthetic feet of movement",
          )
          .replace(
            "same kind within 500 feet and,",
            "same kind within 5 feet and,",
          )
          .replace(
            "You use synthetic feet of movement",
            "You use 500 feet of movement",
          );
      },
    },
    {
      id: "warlock_dark_ones_blessing",
      mutate(description) {
        return description
          .replace(
            "reduce an enemy to 0 Hit Points",
            "reduce an enemy to synthetic Hit Points",
          )
          .replace(
            "minimum of 1 Temporary Hit Point",
            "minimum of 0 Temporary Hit Point",
          )
          .replace(
            "reduce an enemy to synthetic Hit Points",
            "reduce an enemy to 1 Hit Point",
          );
      },
    },
    {
      id: "modify_memory",
      mutate(description) {
        return description.replace(
          "up to 7 days, 30 days, 365 days",
          "up to 30 days, 7 days, 365 days",
        );
      },
    },
    {
      id: "magic_item_staff_of_fire",
      mutate(description) {
        return description
          .replace("Burning Hands (1 charge)", "Burning Hands (4 charges)")
          .replace("Wall of Fire (4 charges)", "Wall of Fire (1 charge)");
      },
    },
    {
      id: "magic_item_staff_of_the_woodlands",
      mutate(description) {
        return description
          .replace(
            "Locate Animals or Plants (2 charges)",
            "Locate Animals or Plants (3 charges)",
          )
          .replace(
            "Speak with Plants (3 charges)",
            "Speak with Plants (2 charges)",
          );
      },
    },
    {
      id: "animal_messenger",
      mutate(description) {
        return description
          .replace(
            "Charisma saving throw, or it attempts",
            "Charisma saving throw, and it attempts",
          )
          .replace(
            "location you have visited and a recipient",
            "location you have visited or a recipient",
          );
      },
    },
    {
      id: "calm_emotions",
      mutate(description) {
        return `${description} The target takes Force damage.`;
      },
    },
  ];

  for (const { id, mutate } of mutations) {
    const record = structuredClone(
      records.find((candidate) => candidate.id === id),
    );
    const originalDescription = record.value.description;
    record.value.description = mutate(originalDescription);
    assert.notEqual(record.value.description, originalDescription);

    const result = auditModule.auditRecordDelta(context, record);
    assert.ok(
      result.issues.some(
        (issue) =>
          issue.code === "prose-evidence-missing" &&
          issue.fieldPath === "description",
      ),
      `${id}\n${record.value.description}\n${JSON.stringify(result.issues, null, 2)}`,
    );
  }
});

test("summary prose preserves modality, quantifiers, and executable location constraints", () => {
  const alert = structuredClone(
    records.find((candidate) => candidate.id === "alert"),
  );
  alert.value.description = alert.value.description.replace(
    "can't make this swap",
    "never make this swap",
  );
  const alteredModality = auditModule.auditRecordDelta(context, alert);
  assert.ok(
    alteredModality.issues.some(
      (issue) =>
        issue.code === "prose-evidence-missing" &&
        issue.fieldPath === "description",
    ),
    JSON.stringify(alteredModality.issues, null, 2),
  );

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
      delete record.value.description;
    },
    (record) => {
      record.value.description = 42;
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

test("one delta accumulates independent provenance, identity, prose, and reference failures", () => {
  const record = structuredClone(
    records.find((candidate) => candidate.id === "class_bard"),
  );
  record.value.provenance = {
    kind: "synthetic-test",
    section: "synthetic-test",
  };
  record.value.name = "Closed Catalog Identity";
  record.value.description = "Closed catalog expression absent from the SRD.";
  record.value.spellcasting.cantripAccess.spellIds[0] = "closed_catalog_unit";

  const result = auditModule.auditRecordDelta(context, record);
  assert.equal(result.status, "rejected");
  assert.ok(result.issues.length >= 4, JSON.stringify(result.issues, null, 2));
  assert.ok(result.issues.some((issue) => issue.code === "non-srd-provenance"));
  assert.ok(
    result.issues.some((issue) => issue.code === "identity-evidence-missing"),
  );
  assert.ok(
    result.issues.some((issue) => issue.code === "prose-evidence-missing"),
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
