#!/usr/bin/env node

require("tsx/cjs");
const { Schema } = require("effect");
const {
  assertSurfaceSchemaStringRoles,
  buildAudit,
  buildSurfaceSchemaFieldRoles,
  collectDecodedStringPaths,
  collectUnitReferences,
  readSurfaceRecords,
  walkDecodedSurfaceRecord,
  walkSchemaShape,
  walkSurfaceValue,
} = require("./srd521-surface-authored-corpus-audit.cjs");
const {
  surfaceSchemaRole,
} = require("../packages/surface/src/surface/schema-base.ts");
const {
  EffectAtomSchema,
  ReactionTriggerSchema,
} = require("../packages/surface/src/surface/schema-spell.ts");

const issues = [];

function expectFailure(label, action) {
  try {
    action();
    issues.push(`${label} unexpectedly passed`);
  } catch {
    return;
  }
}

function checkSchemaCompleteness() {
  assertSurfaceSchemaStringRoles();
  if (buildSurfaceSchemaFieldRoles().size === 0) {
    issues.push(
      "production schema role traversal produced no role-bearing nodes",
    );
  }
  expectFailure("unowned string schema", () =>
    walkSchemaShape(
      Schema.Struct({ unowned: Schema.String }).ast,
      "Synthetic",
      () => {},
    ),
  );
  expectFailure("role on collection schema", () =>
    surfaceSchemaRole(Schema.Array(Schema.String), {
      category: "reference",
      relation: "spell-list",
      targetKind: "unit",
    }),
  );
  expectFailure("unknown schema AST", () =>
    walkSchemaShape({ _tag: "UnknownFutureAstShape" }, "Synthetic", () => {}),
  );
  expectFailure("malformed role", () =>
    walkSchemaShape(
      surfaceSchemaRole(Schema.String, { category: "identity", kind: "bogus" })
        .ast,
      "Synthetic",
      () => {},
    ),
  );
  expectFailure("inert prose option", () =>
    walkSchemaShape(
      surfaceSchemaRole(Schema.String, { category: "prose", strict: true }).ast,
      "Synthetic",
      () => {},
    ),
  );
  expectFailure("conflicting nested roles", () =>
    walkSchemaShape(
      surfaceSchemaRole(
        Schema.Struct({
          value: surfaceSchemaRole(Schema.String, { category: "prose" }),
        }),
        { category: "identity", kind: "label" },
      ).ast,
      "Synthetic",
      () => {},
    ),
  );
  expectFailure("contradictory reference target", () =>
    walkSchemaShape(
      surfaceSchemaRole(Schema.String, {
        category: "reference",
        relation: "spell-list",
        targetKind: "statBlock",
      }).ast,
      "Synthetic",
      () => {},
    ),
  );
  expectFailure("missing reference target", () =>
    walkSchemaShape(
      surfaceSchemaRole(Schema.String, {
        category: "reference",
        relation: "monster-reference",
      }).ast,
      "Synthetic",
      () => {},
    ),
  );
  expectFailure("unknown reference target", () =>
    walkSchemaShape(
      surfaceSchemaRole(Schema.String, {
        category: "reference",
        relation: "monster-reference",
        targetKind: "bogus",
      }).ast,
      "Synthetic",
      () => {},
    ),
  );
}

function checkValueTraversal() {
  const deepSchema = Schema.suspend(() =>
    Schema.Union(
      Schema.Struct({
        kind: Schema.Literal("leaf"),
        text: surfaceSchemaRole(Schema.String, { category: "prose" }),
      }),
      Schema.Struct({
        kind: Schema.Literal("next"),
        next: deepSchema,
      }),
    ),
  );
  let value = { kind: "leaf", text: "deep" };
  for (let index = 0; index < 128; index += 1) {
    value = { kind: "next", next: value };
  }
  const strings = [];
  walkSurfaceValue(deepSchema, value, (_path, text, role) => {
    if (role.category === "prose") strings.push(text);
  });
  if (strings.length !== 1 || strings[0] !== "deep") {
    issues.push("deep schema/value traversal did not reach its leaf string");
  }

  expectFailure("incompatible union roles", () =>
    walkSurfaceValue(
      Schema.Union(
        surfaceSchemaRole(Schema.String, { category: "prose" }),
        surfaceSchemaRole(Schema.String, {
          category: "identity",
          kind: "label",
        }),
      ),
      "ambiguous",
      () => {},
    ),
  );
  expectFailure("overlapping tagged union roles", () =>
    walkSurfaceValue(
      Schema.Union(
        Schema.Struct({
          kind: Schema.Literal("same"),
          text: surfaceSchemaRole(Schema.String, { category: "prose" }),
        }),
        Schema.Struct({
          kind: Schema.Literal("same"),
          text: surfaceSchemaRole(Schema.String, {
            category: "identity",
            kind: "label",
          }),
        }),
      ),
      { kind: "same", text: "ambiguous" },
      () => {},
    ),
  );

  const mixedUnion = Schema.Union(
    Schema.Struct({
      kind: Schema.Literal("tagged"),
      text: surfaceSchemaRole(Schema.String, { category: "prose" }),
    }),
    Schema.Struct({
      kind: Schema.Literal("tagged"),
      text: Schema.Number,
    }),
  );
  const untaggedRoles = [];
  walkSurfaceValue(
    mixedUnion,
    { kind: "tagged", text: "decoded by prose branch" },
    (_path, _text, role) => {
      untaggedRoles.push(role.category);
    },
  );
  if (!untaggedRoles.includes("prose")) {
    issues.push("mixed tagged/untagged union selected the wrong role");
  }
}

function checkPrimitiveReferenceArrays() {
  const records = readSurfaceRecords();
  const references = collectUnitReferences(records);
  if (!references.some((reference) => /\[\d+\]$/.test(reference.fieldPath))) {
    issues.push("primitive reference-array members were not traversed");
  }
  const audit = buildAudit();
  if (audit.metrics.failures !== 0) {
    issues.push(
      `production Surface completeness has ${audit.metrics.failures} failure(s)`,
    );
  }
  if (audit.metrics.unitReferenceFailures !== 0) {
    issues.push(
      `production Surface reference completeness has ${audit.metrics.unitReferenceFailures} failure(s)`,
    );
  }
  for (const targetRecordId of ["find_familiar", "sorcerer_font_of_magic"]) {
    if (
      !references.some(
        (reference) => reference.targetRecordId === targetRecordId,
      )
    ) {
      issues.push(
        `fixed authored reference ${targetRecordId} was not traversed`,
      );
    }
  }
}

function checkDecodedStringCoverage() {
  for (const record of readSurfaceRecords()) {
    const decodedPaths = collectDecodedStringPaths(record.value);
    const traversedPaths = new Set();
    walkDecodedSurfaceRecord(record, (path) => traversedPaths.add(path));
    for (const path of decodedPaths) {
      if (!traversedPaths.has(path)) {
        issues.push(
          `decoded Surface string was not traversed: ${record.contentPath}:${path}`,
        );
      }
    }
  }
}

function checkDeepProductionTraversal() {
  let effect = {
    kind: "condition_persists_after_full_duration",
    condition: "blinded",
    untilEndedBy: "deep effect leaf",
  };
  for (let index = 0; index < 1024; index += 1) {
    effect = {
      kind: "conditional_by_current_hp",
      threshold: 1,
      comparison: "gt",
      onMatch: effect,
    };
  }
  const effectLeaves = [];
  walkSurfaceValue(EffectAtomSchema, effect, (_path, value, role) => {
    if (role.category === "prose") effectLeaves.push(value);
  });
  if (effectLeaves.length !== 1 || effectLeaves[0] !== "deep effect leaf") {
    issues.push("deep production EffectAtom traversal missed its prose leaf");
  }

  let trigger = { kind: "targeted_by_named_spell", spellId: "find_familiar" };
  for (let index = 0; index < 1024; index += 1) {
    trigger = { kind: "any_of", triggers: [trigger] };
  }
  const triggerReferences = [];
  walkSurfaceValue(ReactionTriggerSchema, trigger, (_path, value, role) => {
    if (role.category === "reference") triggerReferences.push(value);
  });
  if (
    triggerReferences.length !== 1 ||
    triggerReferences[0] !== "find_familiar"
  ) {
    issues.push(
      "deep production ReactionTrigger traversal missed its reference leaf",
    );
  }
}

checkSchemaCompleteness();
checkValueTraversal();
checkPrimitiveReferenceArrays();
checkDecodedStringCoverage();
checkDeepProductionTraversal();

if (issues.length > 0) {
  for (const issue of issues) console.error(`cleanroom provenance: ${issue}`);
  process.exitCode = 1;
} else {
  console.log("cleanroom provenance: schema/value role traversal passed");
}
