#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const ts = require("typescript");

const REPO_ROOT = path.resolve(__dirname, "..");
const PACKAGES_ROOT = path.join(REPO_ROOT, "packages");
const SURFACE_CONTENT_ROOT = path.join(PACKAGES_ROOT, "surface", "content");

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts"];
const SOURCE_EXTENSION_SET = new Set(SOURCE_EXTENSIONS);

const EXCLUDED_PATH_RULES = [
  {
    reason: "test-fixture-boundary",
    pattern:
      /(?:\.test\.[cm]?tsx?$|\.mbt\.test\.[cm]?tsx?$|\/test-support\/|\/__tests__\/|\/[^/]*(?:test|fixture)-support\.[cm]?tsx?$)/,
  },
  {
    reason: "non-source-artifact",
    pattern: /\/(?:node_modules|dist|coverage)\//,
  },
];

const ALLOWLIST_PATH_RULES = [
  {
    reason: "catalog-boundary",
    pattern:
      /^packages\/surface\/src\/surface\/(?:unit-catalog|stat-block-catalog|schema-nonspell|types)\.ts$/,
  },
  {
    reason: "composition-selection-boundary",
    pattern: /^packages\/mcp\/src\/(?:composition-root|content-tools)\.ts$/,
  },
  {
    reason: "fixture-boundary",
    pattern: /^packages\/app\/src\/components\/trace-visualizer\//,
  },
  {
    reason: "character-creation-support-profile-boundary",
    pattern:
      /^packages\/character-creation-runtime\/src\/(?:phase1-manifest|support-gates)\.ts$/,
  },
  {
    reason: "character-sheet-retained-companion-support-admission-boundary",
    pattern: /^packages\/character-sheet-runtime\/src\/companions\.ts$/,
  },
  {
    reason: "battle-runtime-unit-profile-admission-test-support-boundary",
    pattern:
      /^packages\/battle-runtime\/src\/unit-profile-admission-spell-fill-support\.ts$/,
  },
];

const INLINE_ALLOWLIST_PATH_RULES = [
  {
    reason: "rule-named-cross-record-reference-boundary",
    pattern: /^packages\/character-sheet-runtime\/src\/wall-of-force\.ts$/,
  },
  {
    reason: "battle-runtime-mbt-fixture-boundary",
    pattern:
      /^packages\/battle-runtime\/src\/battle-runtime-mbt-driver-kit\.test-support\.ts$/,
  },
  {
    reason: "battle-runtime-unit-feature-support-profile-boundary",
    pattern: /^packages\/battle-runtime\/src\/unit-feature-support\.ts$/,
  },
  {
    reason: "character-creation-selected-choice-runtime-projection-boundary",
    pattern: /^packages\/character-creation-runtime\/src\/finalization\.ts$/,
  },
  {
    reason: "character-sheet-resource-support-admission-boundary",
    pattern: /^packages\/character-sheet-runtime\/src\/sheet-types\.ts$/,
  },
];

const INLINE_ALLOWLIST_COMMENT = /\bauthored-id-dispatch-allow:\s*([a-z0-9-]+)/;
const IDENTIFIER_EXPRESSION_PATTERN = String.raw`[A-Za-z_$][\w$]*(?:(?:\.|\?\.)[A-Za-z_$][\w$]*)*`;
const AUTHORED_SPELL_RUNTIME_KEY_PATTERN = /\b[A-Za-z_$][\w$]*\.spell\.id\b/;
const SPELL_INVOCATION_PRESENTATION_REF_PROJECTION =
  "packages/battle-runtime/src/battle-reducer/spells-invocation-ref.ts";
const POSITIONAL_DAMAGE_DIE_IDENTITY_PATTERN =
  /BattleSpellDamageDieExecutionRef|groupOrdinal|dieOrdinal|selectedDieOrdinal/;
const EXECUTION_SUBJECT_ATTACK_PRESENTATION_PATTERN = /subject\.attackName/;
const REDUNDANT_SPELL_TARGET_LIST_PROCEDURE_PATTERN =
  /kind:\s*Schema\.Literal\("spellTargetList"\)[\s\S]{0,160}procedure:(?!\s*Schema\.optionalWith\(Schema\.Never)/;
const REDUNDANT_SPELL_TARGET_LIST_TYPE_PROCEDURE_PATTERN =
  /type BattleSpellTargetListHole[\s\S]{0,500}\bprocedure:/;
const POSITIONAL_DAMAGE_DIE_REROLL_FIELD_PATTERN =
  /type BattleSpellDamageDieReroll[\s\S]{0,300}\b(?:dieRef|groupOrdinal|dieOrdinal):/;
const GENERIC_SPELL_EXECUTION_PROJECTION_PATTERN = /\b(?:Omit|Pick)</;
const SHALLOW_UNIT_EXECUTION_PROJECTION_PATTERN =
  /([A-Za-z_$][\w$]*) extends SupportedUnitFeatureProfile\s*\?\s*Omit<\1,\s*"unit">/;

function escapeForRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function listFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(fullPath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (SOURCE_EXTENSION_SET.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function listSurfaceContentFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSurfaceContentFiles(fullPath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (path.extname(entry.name) === ".json") {
      files.push(fullPath);
    }
  }

  return files;
}

function classifyPath(relativePath, rules) {
  for (const rule of rules) {
    if (rule.pattern.test(relativePath)) {
      return rule.reason;
    }
  }

  return null;
}

function hasAuthoredIdentitySelector(text) {
  return (
    /\b(?:id|[A-Za-z_$][\w$]*Id|name|[A-Za-z_$][\w$]*Name|section|[A-Za-z_$][\w$]*Section)\b/.test(
      text,
    ) ||
    isAuthoredIdentityFieldExpression(text) ||
    isGenericSelectedAuthoredIdentityExpression(text)
  );
}

function isAuthoredIdentityFieldExpression(text) {
  const expression = expressionWithoutOptionalChaining(text);
  return (
    /(?:^|\.)(?:spell|unit)\.name$/.test(expression) ||
    /(?:^|\.)(?:spell|unit)\.provenance\.section$/.test(expression)
  );
}

function isGenericSelectedAuthoredIdentityExpression(text) {
  const expression = expressionWithoutOptionalChaining(text);
  return (
    /(?:^|\.)(?:fill|choiceFill|decision)\.value$/.test(expression) ||
    /(?:^|\.)(?:selected|selectedChoice|selectedOption|choice|option)\.value$/.test(
      expression,
    )
  );
}

function expressionWithoutOptionalChaining(text) {
  return text.trim().replace(/\?\./g, ".");
}

function transformedIdentityLiteralsFor(literal) {
  const transformed = new Set();
  const words = literal
    .split(/[^A-Za-z0-9]+/)
    .filter((word) => word.length > 0);

  if (words.length > 1) {
    const [head, ...tail] = words;
    transformed.add(
      `${head.toLowerCase()}${tail
        .map((word) => `${word[0].toUpperCase()}${word.slice(1)}`)
        .join("")}`,
    );
    transformed.add(
      words.map((word) => `${word[0].toUpperCase()}${word.slice(1)}`).join(""),
    );
  }

  return transformed;
}

function addAuthoredIdentityLiteral(identityLiterals, literal) {
  if (typeof literal !== "string" || literal.length === 0) {
    return;
  }

  identityLiterals.add(literal);
  for (const transformed of transformedIdentityLiteralsFor(literal)) {
    identityLiterals.add(transformed);
  }
}

function lineNumberForIndex(content, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (content.charCodeAt(i) === 10) {
      line += 1;
    }
  }
  return line;
}

function assertBattleReplayExecutionBoundary() {
  const checks = [
    ...listFiles(
      path.join(PACKAGES_ROOT, "battle-runtime", "src", "battle-reducer"),
    )
      .map((filePath) => path.relative(REPO_ROOT, filePath))
      .filter(
        (relativePath) =>
          relativePath.endsWith(".ts") &&
          !relativePath.endsWith(".test.ts") &&
          relativePath !== SPELL_INVOCATION_PRESENTATION_REF_PROJECTION,
      )
      .map((relativePath) => ({
        relativePath,
        patterns: [AUTHORED_SPELL_RUNTIME_KEY_PATTERN],
      })),
    ...listFiles(
      path.join(PACKAGES_ROOT, "battle-runtime", "src", "battle-reducer"),
    )
      .map((filePath) => path.relative(REPO_ROOT, filePath))
      .filter(
        (relativePath) =>
          relativePath !==
          "packages/battle-runtime/src/battle-reducer/creature-state.ts",
      )
      .map((relativePath) => ({
        relativePath,
        patterns: [/origin\.characterUnitRefs/],
      })),
    {
      relativePath: "packages/battle-runtime/src/battle-subjects.ts",
      patterns: [
        /invocation:\s*SpellInvocationRefSchema/,
        /unitId:\s*BattleSubjectTextSchema/,
        /sourceUnitId:\s*BattleSubjectTextSchema/,
        /resourceUnitId:\s*BattleSubjectTextSchema/,
        /componentWeaponItemId:\s*BattleSubjectTextSchema/,
        /sourceSpellId:\s*SpellId/,
        /formStatBlockId:\s*BattleSubjectTextSchema/,
        /(?:subject|command)\.sourceSpellId/,
        /subject\.formStatBlockId/,
      ],
      sliceStart: "export const BattleSubjectSchema",
      sliceEnd: "type BattleSubjectWireValue",
    },
    {
      relativePath: "packages/shared-algebras/src/action-economy-algebra.ts",
      patterns: [
        /readonly sourceUnitId:/,
        /readonly sourceSpellId:/,
        /resource\.sourceUnitId/,
        /resource\.sourceSpellId/,
      ],
    },
    {
      relativePath: "packages/battle-runtime/src/active-effect/types.ts",
      patterns: [
        /readonly effectRef\?:/,
        /type SpellObjectContactDamageActiveEffect[\s\S]{0,250}readonly effectId:/,
        /type SpiritualWeaponActiveEffect[\s\S]{0,250}readonly sourceEffectId:/,
      ],
    },
    {
      relativePath:
        "packages/battle-runtime/src/battle-reducer/attack-damage-apply.ts",
      patterns: [/exceptSourceSpellId/, /sourceSpellId/],
    },
    {
      relativePath:
        "packages/battle-runtime/src/battle-reducer/battle-discovery.ts",
      patterns: [
        /BattleActPresentation/,
        /characterProcedurePresentation/,
        /battleActSpellPresentation/,
        /battleStateWithCharacterExecutionBindings/,
      ],
    },
    {
      relativePath: "packages/battle-runtime/src/battle-state-execution.ts",
      patterns: [/readonly unitId: UnitRecord\["id"\];/],
      sliceStart: "export type BattleCharacterResourceSnapshot",
      sliceEnd: "export type CharacterBattleCreatureState",
    },
    {
      relativePath: "packages/battle-runtime/src/battle-state-execution.ts",
      patterns: [/readonly (?:spell|unit|unitFeature):/],
      sliceStart: "export type BattleSpellAreaChoiceHole",
      sliceEnd: "export type BattleFill =",
    },
    {
      relativePath: "packages/battle-runtime/src/battle-state-execution.ts",
      patterns: [
        /BattleActDiscoveryText/,
        /readonly (?:label|summary|presentation):/,
      ],
      sliceStart: "type BattleActExecution<",
      sliceEnd: "export type BattleActExecutionCandidate",
    },
    {
      relativePath: "packages/battle-runtime/src/battle-state-execution.ts",
      patterns: [/readonly (?:invocation|spell|unit):/],
      sliceStart: "export type BattleReadiedSpell =",
      sliceEnd: "export type BattleAttackDamageCriticalConsequence =",
    },
    {
      relativePath:
        "packages/battle-runtime/src/battle-reducer/battle-codecs.ts",
      patterns: [/unitId:\s*Schema\.String/],
      sliceStart: "const BattleCharacterResourceSnapshotSchema",
      sliceEnd: "const StatBlockResourcePoolStateSchema",
    },
    {
      relativePath:
        "packages/battle-runtime/src/battle-reducer/battle-codecs.ts",
      patterns: [
        /as unknown as Schema\.Schema<BattleHole>/,
        /(?:spell|unit):(?!\s*Schema\.optionalWith\(Schema\.Never)/,
        /unitFeature:/,
      ],
      sliceStart: "const BattleHoleBaseSchema",
      sliceEnd: "const BattleDieRollResultSchema",
    },
    {
      relativePath:
        "packages/battle-runtime/src/battle-reducer/battle-codecs.ts",
      patterns: [/(?:label|summary|presentation):\s*Schema\./],
      sliceStart: "const BattleActExecutionCandidateSchema",
      sliceEnd: "const BattleReadiedSpellSnapshotSchema",
    },
    {
      relativePath:
        "packages/battle-runtime/src/character-execution-admission.ts",
      patterns: [/readonly (?:unitId|invocation|occurrence):/],
      sliceStart: "export type CharacterProcedureBindingSnapshot =",
      sliceEnd: "type CharacterExecutionStateData =",
    },
    {
      relativePath:
        "packages/battle-runtime/src/character-execution-admission.ts",
      patterns: [
        GENERIC_SPELL_EXECUTION_PROJECTION_PATTERN,
        SHALLOW_UNIT_EXECUTION_PROJECTION_PATTERN,
      ],
      sliceStart: "export type SpellProcedureExecution",
      sliceEnd: "export type UnitSupportProcedureExecutionContext",
    },
    {
      relativePath:
        "packages/battle-runtime/src/character-execution-admission.ts",
      patterns: [
        /readonly unitId:/,
        /readonly unit:/,
        /readonly execution:\s*(?:BattleUnitSupportProfile|SupportedUnitFeatureProfile)/,
        /readonly invocation:\s*SupportedSpellInvocation/,
        /readonly spell:\s*SpellRecord/,
        /readonly occurrence:/,
      ],
      sliceStart: "export type CharacterProcedureBinding =",
      sliceEnd: "export type CharacterUnitProcedureBinding =",
    },
    {
      relativePath:
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/profile.ts",
      patterns: [/knownWillingTargetSpellIds/],
    },
    {
      relativePath:
        "packages/battle-runtime/src/battle-runtime-mbt-driver-kit.test-support.ts",
      patterns: [/BattleActDiscoverySubject as BattleSubject/],
    },
    {
      relativePath:
        "packages/battle-runtime/src/character-execution-admission.ts",
      patterns: [
        /Object\.entries\([^)]*\)[\s\S]{0,500}sourceProcedureRef/,
        /sourceProcedureRef:\s*(?:spell|invocation\.spell)\.id/,
        /kind: "activeEffect"; readonly effectId:/,
        /spellInvocationEffectOccurrenceId/,
      ],
    },
    {
      relativePath:
        "packages/battle-runtime/src/battle-reducer/spells-active-effects.ts",
      patterns: [
        /spiritualWeaponSpellEffectOccurrenceId/,
        /nextOrdinal[\s\S]{0,500}spiritualWeapon/,
      ],
    },
    {
      relativePath:
        "packages/battle-runtime/src/battle-reducer/spells-active-effects.ts",
      patterns: [AUTHORED_SPELL_RUNTIME_KEY_PATTERN],
      sliceStart: "function dancingLightsForCastPlacement",
      sliceEnd: "function dancingLightsForReposition",
    },
    {
      relativePath:
        "packages/battle-runtime/src/battle-reducer/spells-damage-fills.ts",
      patterns: [AUTHORED_SPELL_RUNTIME_KEY_PATTERN],
      sliceStart: "const HEIGHTENED_SPELL_TARGET_CHOICE_HOLE_ID_PREFIX",
      sliceEnd: "export function spellSavingThrowAbility",
    },
    {
      relativePath: "packages/battle-runtime/src/battle-reducer/metamagic.ts",
      patterns: [POSITIONAL_DAMAGE_DIE_IDENTITY_PATTERN],
      sliceStart: "export function effectiveEmpoweredSpellDamageRoll",
      sliceEnd: "export function seekingSpellRerollApplicationForAttackRoll",
    },
    {
      relativePath: "packages/battle-runtime/src/battle-state-execution.ts",
      patterns: [REDUNDANT_SPELL_TARGET_LIST_TYPE_PROCEDURE_PATTERN],
      sliceStart: "export type BattleSpellTargetListHole",
      sliceEnd: "export type BattleAttackRollHole",
    },
    {
      relativePath: "packages/battle-runtime/src/battle-state-execution.ts",
      patterns: [POSITIONAL_DAMAGE_DIE_REROLL_FIELD_PATTERN],
      sliceStart: "export type BattleSpellDamageDieReroll",
      sliceEnd: "export type BattleSpellDamageRerollDecision",
    },
    {
      relativePath:
        "packages/battle-runtime/src/battle-reducer/spells-resolve-object-contact-damage.ts",
      patterns: [/objectContactDamageEffectId/],
    },
    {
      relativePath: "packages/battle-runtime/src/battle-act-composition.ts",
      patterns: [
        /characterProcedurePresentationText[\s\S]{0,1500}\bfallback\b/,
        /characterProcedurePresentationText[\s\S]{0,1500}characterSpellProcedure\(/,
      ],
    },
    {
      relativePath: "packages/battle-runtime/src/battle-runtime-transaction.ts",
      patterns: [
        /export type BattlePendingTransactionView[\s\S]{0,300}readonly label:/,
        /export type BattlePendingTransactionView[\s\S]{0,300}readonly summary:/,
      ],
    },
    {
      relativePath: "packages/mcp/src/session-store-types.ts",
      patterns: [
        /export type McpSessionSnapshot[\s\S]{0,500}readonly label:/,
        /export type McpSessionSnapshot[\s\S]{0,500}readonly summary:/,
      ],
    },
    {
      relativePath: "packages/mcp/src/session-snapshot-output.ts",
      patterns: [
        /transientBattleFills:[\s\S]{0,300}label:/,
        /transientBattleFills:[\s\S]{0,300}summary:/,
      ],
    },
    {
      relativePath: "packages/battle-runtime/src/identity.ts",
      patterns: [
        /BattleActiveEffectExecutionRef\s*=\s*Schema\.NonEmptyTrimmedString\.pipe\(\s*Schema\.brand/,
        /BattleSpellDamageDieExecutionRef\s*=\s*Schema\.NonEmptyTrimmedString\.pipe\(\s*Schema\.brand/,
        POSITIONAL_DAMAGE_DIE_IDENTITY_PATTERN,
      ],
    },
    {
      relativePath:
        "packages/battle-runtime/src/battle-reducer/battle-codecs.ts",
      patterns: [
        REDUNDANT_SPELL_TARGET_LIST_PROCEDURE_PATTERN,
        /executionReferenceFieldName/,
        /battleExecutionReferencesIn/,
        /serializedSourceProcedureRefsAreOwned/,
        /EXECUTION_REFERENCE_COLLECTION_FIELD_NAMES/,
        /\/Ref\(\?:s\)\?\$\//,
      ],
      sliceStart: "const BattleHolePayloadSchema",
      sliceEnd: "export const BattleHoleSchema",
    },
    {
      relativePath: "packages/mcp/src/admin-mirror-presentation-timeline.ts",
      patterns: [EXECUTION_SUBJECT_ATTACK_PRESENTATION_PATTERN],
    },
    {
      relativePath:
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/profile.ts",
      patterns: [
        /invocationSchema:/,
        /readonly invocationRef:/,
        /castSummary:/,
        /as unknown as/,
      ],
    },
    {
      relativePath: "packages/battle-runtime/src/battle-state-execution.ts",
      patterns: [
        /export type AttackDamageRider[\s\S]{0,90}readonly unitId:/,
        /export type BattleCunningStrikeSelectedOption[\s\S]{0,500}readonly unitId:/,
        /export type BattleCunningStrikeOptionSelection[\s\S]{0,180}readonly unitId:/,
      ],
    },
    {
      relativePath:
        "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
      patterns: [/as unknown as/, /new Proxy\(/],
    },
  ];
  const failures = [];
  for (const check of checks) {
    const content = fs.readFileSync(
      path.join(REPO_ROOT, check.relativePath),
      "utf8",
    );
    const start =
      check.sliceStart == null ? 0 : content.indexOf(check.sliceStart);
    const end =
      check.sliceEnd == null ? content.length : content.indexOf(check.sliceEnd);
    const inspected = content.slice(start, end);
    for (const pattern of check.patterns) {
      const match = pattern.exec(inspected);
      if (match == null) continue;
      failures.push({
        relativePath: check.relativePath,
        line: lineNumberForIndex(content, start + match.index),
        pattern: pattern.source,
      });
    }
  }
  if (failures.length === 0) return;
  console.error("Battle replay authored-key violation(s) found:");
  for (const failure of failures) {
    console.error(
      `  - ${failure.relativePath}:${failure.line} matches ${failure.pattern}`,
    );
  }
  process.exit(1);
}

function presentationReturningHelperNames(source) {
  const helpers = new Set();
  const visit = (node) => {
    if (
      ts.isFunctionDeclaration(node) &&
      node.name !== undefined &&
      node.body !== undefined &&
      /\b(?:label|summary)\s*:/.test(node.body.getText(source))
    ) {
      helpers.add(node.name.text);
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer !== undefined &&
      (ts.isArrowFunction(node.initializer) ||
        ts.isFunctionExpression(node.initializer)) &&
      /\b(?:label|summary)\s*:/.test(node.initializer.body.getText(source))
    ) {
      helpers.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return helpers;
}

function assertNoReducerOwnedActPresentation(options = {}) {
  const reducerRoot = path.join(
    REPO_ROOT,
    "packages/battle-runtime/src/battle-reducer",
  );
  const files = [
    ...(options.includeRepository === false
      ? []
      : [
          path.join(
            REPO_ROOT,
            "packages/battle-runtime/src/battle-state-execution.ts",
          ),
          ...listFiles(reducerRoot),
        ]),
    ...(options.sources ?? []).map((source) => source.file),
  ];
  const violations = [];

  for (const file of files) {
    const content =
      options.sources?.find((source) => source.file === file)?.content ??
      fs.readFileSync(file, "utf8");
    const source = ts.createSourceFile(
      file,
      content,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const presentationHelpers = presentationReturningHelperNames(source);
    const presentationBindings = new Set();
    const presentationNamePattern = /(?:label|summary|presentation|text)/i;
    const initializerMayOwnPresentationText = (initializer) => {
      if (ts.isObjectLiteralExpression(initializer)) {
        return initializer.properties.some(
          (property) =>
            (ts.isPropertyAssignment(property) ||
              ts.isShorthandPropertyAssignment(property)) &&
            (ts.isIdentifier(property.name) ||
              ts.isStringLiteral(property.name)) &&
            (property.name.text === "label" ||
              property.name.text === "summary"),
        );
      }
      if (ts.isConditionalExpression(initializer)) {
        return (
          initializerMayOwnPresentationText(initializer.whenTrue) ||
          initializerMayOwnPresentationText(initializer.whenFalse)
        );
      }
      if (ts.isCallExpression(initializer)) {
        const callee = initializer.expression.getText(source);
        return (
          presentationNamePattern.test(callee) ||
          presentationHelpers.has(callee)
        );
      }
      return (
        ts.isIdentifier(initializer) &&
        (presentationBindings.has(initializer.text) ||
          presentationNamePattern.test(initializer.text))
      );
    };
    const declarations = [];
    const collectPresentationBindings = (node) => {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer !== undefined
      ) {
        declarations.push(node);
      }
      ts.forEachChild(node, collectPresentationBindings);
    };
    collectPresentationBindings(source);
    let changed = true;
    while (changed) {
      changed = false;
      for (const declaration of declarations) {
        if (
          !presentationBindings.has(declaration.name.text) &&
          initializerMayOwnPresentationText(declaration.initializer)
        ) {
          presentationBindings.add(declaration.name.text);
          changed = true;
        }
      }
    }
    const visit = (node) => {
      if (ts.isObjectLiteralExpression(node)) {
        const properties = new Map();
        for (const property of node.properties) {
          if (
            (ts.isPropertyAssignment(property) ||
              ts.isShorthandPropertyAssignment(property)) &&
            (ts.isIdentifier(property.name) ||
              ts.isStringLiteral(property.name))
          ) {
            properties.set(property.name.text, property);
          }
        }
        const spreadsPresentationText = node.properties.some(
          (property) =>
            ts.isSpreadAssignment(property) &&
            ((ts.isIdentifier(property.expression) &&
              (presentationBindings.has(property.expression.text) ||
                presentationNamePattern.test(property.expression.text))) ||
              (ts.isCallExpression(property.expression) &&
                (presentationNamePattern.test(
                  property.expression.expression.getText(source),
                ) ||
                  presentationHelpers.has(
                    property.expression.expression.getText(source),
                  )))),
        );
        if (
          properties.has("subject") &&
          ((properties.has("initialHoles") &&
            (properties.has("label") || properties.has("summary"))) ||
            spreadsPresentationText)
        ) {
          const position = source.getLineAndCharacterOfPosition(
            node.getStart(),
          );
          violations.push(
            `${path.relative(REPO_ROOT, file)}:${position.line + 1}`,
          );
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }

  assert.deepEqual(
    violations,
    options.expectedViolations ?? [],
    `reducer discovery owns act label/summary at ${violations.join(", ")}`,
  );
}

function assertActPresentationGateSelfTests() {
  const file = path.join(REPO_ROOT, "synthetic-presentation-bypass.ts");
  const content = `
      function detailsFor() { return { label: "Legacy", summary: "Legacy" }; }
      const conditional = true ? detailsFor() : { label: "Other", summary: "Other" };
      const direct = { ...detailsFor(), subject: {}, initialHoles: [] };
      const indirect = { ...conditional, subject: {}, initialHoles: [] };
    `;
  assertNoReducerOwnedActPresentation({
    includeRepository: false,
    sources: [{ file, content }],
    expectedViolations: [
      "synthetic-presentation-bypass.ts:4",
      "synthetic-presentation-bypass.ts:5",
    ],
  });
}

function assertBattleReplayPatternSelfTests() {
  const authoredSpellIdOwners = listFiles(
    path.join(PACKAGES_ROOT, "battle-runtime", "src", "battle-reducer"),
  )
    .map((filePath) => path.relative(REPO_ROOT, filePath))
    .filter(
      (relativePath) =>
        relativePath.endsWith(".ts") &&
        !relativePath.endsWith(".test.ts") &&
        AUTHORED_SPELL_RUNTIME_KEY_PATTERN.test(
          fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8"),
        ),
    );
  assert.deepEqual(
    authoredSpellIdOwners,
    [SPELL_INVOCATION_PRESENTATION_REF_PROJECTION],
    "Self-test failed: authored spell identity must be owned only by the explicit invocation presentation-ref projection.",
  );
  assert.match(
    "battleDancingLightId(`${invocation.spell.id}:1`)",
    AUTHORED_SPELL_RUNTIME_KEY_PATTERN,
  );
  assert.match(
    "type DieRef = { groupOrdinal: number; dieOrdinal: number }",
    POSITIONAL_DAMAGE_DIE_IDENTITY_PATTERN,
  );
  assert.match(
    "const name = subject.attackName",
    EXECUTION_SUBJECT_ATTACK_PRESENTATION_PATTERN,
  );
  assert.match(
    'kind: Schema.Literal("spellTargetList"), sourceProcedureRef: Ref, procedure: Procedure',
    REDUNDANT_SPELL_TARGET_LIST_PROCEDURE_PATTERN,
  );
  assert.match(
    "type BattleSpellTargetListHole = { procedure: Procedure }",
    REDUNDANT_SPELL_TARGET_LIST_TYPE_PROCEDURE_PATTERN,
  );
  assert.match(
    "type BattleSpellDamageDieReroll = { dieRef: Ref }",
    POSITIONAL_DAMAGE_DIE_REROLL_FIELD_PATTERN,
  );
  assert.match(
    'type SpellExecution<I> = Pick<I["spell"], "mechanics">',
    GENERIC_SPELL_EXECUTION_PROJECTION_PATTERN,
  );
  assert.match(
    'type SpellExecution<I> = Omit<I, "spell">',
    GENERIC_SPELL_EXECUTION_PROJECTION_PATTERN,
  );
  assert.match(
    'type UnitExecution<P> = P extends SupportedUnitFeatureProfile ? Omit<P, "unit"> : never',
    SHALLOW_UNIT_EXECUTION_PROJECTION_PATTERN,
  );
}

function propertyNameText(name) {
  return ts.isIdentifier(name) || ts.isStringLiteral(name)
    ? name.text
    : undefined;
}

function propertyAccessPath(node) {
  if (
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node) ||
    ts.isParenthesizedExpression(node) ||
    ts.isNonNullExpression(node) ||
    ts.isTypeAssertionExpression(node)
  ) {
    return propertyAccessPath(node.expression);
  }
  if (ts.isIdentifier(node)) return [node.text];
  if (ts.isPropertyAccessExpression(node)) {
    const owner = propertyAccessPath(node.expression);
    return owner === null ? null : [...owner, node.name.text];
  }
  if (
    ts.isElementAccessExpression(node) &&
    node.argumentExpression !== undefined &&
    (ts.isStringLiteral(node.argumentExpression) ||
      ts.isNoSubstitutionTemplateLiteral(node.argumentExpression))
  ) {
    const owner = propertyAccessPath(node.expression);
    return owner === null ? null : [...owner, node.argumentExpression.text];
  }
  return null;
}

function nodeHasAncestor(node, predicate) {
  let current = node.parent;
  while (current !== undefined && !ts.isFunctionLike(current)) {
    if (predicate(current)) return true;
    current = current.parent;
  }
  return false;
}

const CHARACTER_EXECUTION_AUTHORED_ID_KEYS = new Set([
  "optionId",
  "resourceUnitId",
  "sourceUnitId",
  "spellId",
  "unitId",
]);

function unwrapExpression(node) {
  let current = node;
  while (
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isParenthesizedExpression(current) ||
    ts.isNonNullExpression(current) ||
    ts.isTypeAssertionExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function schemaNeverRejectsExpression(node) {
  return /^Schema\.optionalWith\(Schema\.Never,\s*\{\s*exact:\s*true\s*\}\)$/.test(
    node.getText(),
  );
}

function schemaLiteralIncludes(node, literal) {
  const expression = unwrapExpression(node);
  return (
    ts.isCallExpression(expression) &&
    expression.expression.getText() === "Schema.Literal" &&
    expression.arguments.some(
      (argument) => ts.isStringLiteral(argument) && argument.text === literal,
    )
  );
}

function authoredIdentityPathKind(pathSegments) {
  if (pathSegments === null || pathSegments.length === 0) return null;
  const last = pathSegments.at(-1);
  const owner = pathSegments.at(-2);
  if (last === "id" && owner === "spell") return "spell";
  if (last === "id" && owner === "unit") return "unit";
  if (last === "spellId") return "spell";
  if (
    last === "unitId" ||
    last === "resourceUnitId" ||
    last === "sourceUnitId"
  ) {
    return "unit";
  }
  return null;
}

function pathComesFromReducerExecution(pathSegments) {
  return pathSegments.some((segment) =>
    ["execution", "invocation", "procedure", "subject"].includes(segment),
  );
}

function isOutermostPropertyPath(node) {
  return !(
    (ts.isPropertyAccessExpression(node.parent) &&
      node.parent.expression === node) ||
    (ts.isElementAccessExpression(node.parent) &&
      node.parent.expression === node)
  );
}

function nodeConstructsRuntimeKey(node) {
  return nodeHasAncestor(
    node,
    (ancestor) =>
      ts.isTemplateExpression(ancestor) ||
      ts.isNoSubstitutionTemplateLiteral(ancestor) ||
      (ts.isBinaryExpression(ancestor) &&
        ancestor.operatorToken.kind === ts.SyntaxKind.PlusToken) ||
      (ts.isVariableDeclaration(ancestor) &&
        ts.isIdentifier(ancestor.name) &&
        /(?:id|key|prefix|ref)$/i.test(ancestor.name.text)) ||
      (ts.isCallExpression(ancestor) &&
        /(?:holeId|holeInstanceKey|battle[A-Za-z]+(?:Id|Ref))$/.test(
          ancestor.expression.getText(),
        )),
  );
}

function nodeDispatchesOnIdentity(node) {
  return nodeHasAncestor(
    node,
    (ancestor) =>
      (ts.isBinaryExpression(ancestor) &&
        [
          ts.SyntaxKind.EqualsEqualsEqualsToken,
          ts.SyntaxKind.ExclamationEqualsEqualsToken,
          ts.SyntaxKind.EqualsEqualsToken,
          ts.SyntaxKind.ExclamationEqualsToken,
        ].includes(ancestor.operatorToken.kind)) ||
      (ts.isSwitchStatement(ancestor) && ancestor.expression === node) ||
      (ts.isElementAccessExpression(ancestor) &&
        ancestor.argumentExpression === node) ||
      (ts.isCallExpression(ancestor) &&
        /\.(?:get|has)$/.test(ancestor.expression.getText()) &&
        ancestor.arguments.includes(node)),
  );
}

function battleReplayAstViolations(sourceText, relativePath) {
  const source = ts.createSourceFile(
    relativePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const violations = [];
  const aliasScopes = [new Map()];
  const valueDeclarations = new Map();
  const positionalIdentityNames = new Set([
    "BattleSpellDamageDieExecutionRef",
    "battleSpellDamageDieExecutionRef",
    "groupOrdinal",
    "dieOrdinal",
    "selectedDieOrdinal",
  ]);

  function collectValueDeclarations(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer !== undefined
    ) {
      const declarations = valueDeclarations.get(node.name.text) ?? [];
      declarations.push(node.initializer);
      valueDeclarations.set(node.name.text, declarations);
    }
    ts.forEachChild(node, collectValueDeclarations);
  }
  collectValueDeclarations(source);

  function uniqueDeclaredValue(identifier) {
    const declarations = valueDeclarations.get(identifier.text);
    return declarations?.length === 1 ? declarations[0] : undefined;
  }

  function topLevelSchemaProperties(node, visited = new Set()) {
    const expression = unwrapExpression(node);
    if (visited.has(expression)) return [];
    visited.add(expression);
    if (ts.isIdentifier(expression)) {
      const declaration = uniqueDeclaredValue(expression);
      return declaration === undefined
        ? []
        : topLevelSchemaProperties(declaration, visited);
    }
    if (!ts.isObjectLiteralExpression(expression)) return [];
    return expression.properties.flatMap((property) => {
      if (ts.isSpreadAssignment(property)) {
        return topLevelSchemaProperties(property.expression, visited);
      }
      if (ts.isShorthandPropertyAssignment(property)) {
        const declaration = uniqueDeclaredValue(property.name);
        return declaration === undefined
          ? []
          : [{ name: property.name.text, value: declaration, node: property }];
      }
      if (ts.isPropertyAssignment(property)) {
        const name = propertyNameText(property.name);
        return name === undefined
          ? []
          : [{ name, value: property.initializer, node: property }];
      }
      return [];
    });
  }

  function reachableSchemaAcceptsProperty(
    node,
    propertyName,
    visited = new Set(),
  ) {
    const expression = unwrapExpression(node);
    if (visited.has(expression)) return false;
    visited.add(expression);
    if (ts.isIdentifier(expression)) {
      const declaration = uniqueDeclaredValue(expression);
      return (
        declaration !== undefined &&
        reachableSchemaAcceptsProperty(declaration, propertyName, visited)
      );
    }
    if (ts.isPropertyAssignment(expression)) {
      if (
        propertyNameText(expression.name) === propertyName &&
        !schemaNeverRejectsExpression(expression.initializer)
      ) {
        return true;
      }
      return reachableSchemaAcceptsProperty(
        expression.initializer,
        propertyName,
        visited,
      );
    }
    let accepts = false;
    ts.forEachChild(expression, (child) => {
      if (
        !accepts &&
        reachableSchemaAcceptsProperty(child, propertyName, visited)
      ) {
        accepts = true;
      }
    });
    return accepts;
  }

  function add(node, message) {
    const position = source.getLineAndCharacterOfPosition(
      node.getStart(source),
    );
    violations.push(`${relativePath}:${position.line + 1}: ${message}`);
  }

  function resolvedPropertyAccessPath(node) {
    const path = propertyAccessPath(node);
    if (path === null) return null;
    const resolved = [...path];
    const visited = new Set();
    while (resolved.length > 0) {
      const alias = resolved[0];
      if (visited.has(alias)) break;
      let aliasPath;
      let found = false;
      for (let index = aliasScopes.length - 1; index >= 0; index -= 1) {
        if (aliasScopes[index].has(alias)) {
          aliasPath = aliasScopes[index].get(alias);
          found = true;
          break;
        }
      }
      if (!found || aliasPath === null) break;
      visited.add(alias);
      resolved.splice(0, 1, ...aliasPath);
    }
    return resolved;
  }

  function setAlias(name, path) {
    aliasScopes.at(-1).set(name, path);
  }

  function invalidateBindingName(name) {
    if (ts.isIdentifier(name)) {
      setAlias(name.text, null);
      return;
    }
    if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
      for (const element of name.elements) {
        if (ts.isBindingElement(element)) invalidateBindingName(element.name);
      }
    }
  }

  function recordAliases(node) {
    if (!ts.isVariableDeclaration(node)) return;
    if (node.initializer === undefined) {
      invalidateBindingName(node.name);
      return;
    }
    const initializerPath = resolvedPropertyAccessPath(node.initializer);
    if (initializerPath === null) {
      invalidateBindingName(node.name);
      return;
    }
    if (ts.isIdentifier(node.name)) {
      setAlias(node.name.text, initializerPath);
      return;
    }
    if (!ts.isObjectBindingPattern(node.name)) {
      invalidateBindingName(node.name);
      return;
    }
    for (const element of node.name.elements) {
      if (!ts.isIdentifier(element.name)) {
        invalidateBindingName(element.name);
        continue;
      }
      const property = propertyNameText(element.propertyName ?? element.name);
      if (property !== undefined) {
        setAlias(element.name.text, [...initializerPath, property]);
      }
    }
  }

  function recordAssignment(node) {
    if (
      !ts.isBinaryExpression(node) ||
      node.operatorToken.kind !== ts.SyntaxKind.EqualsToken ||
      !ts.isIdentifier(node.left)
    ) {
      return;
    }
    const path = resolvedPropertyAccessPath(node.right);
    for (let index = aliasScopes.length - 1; index >= 0; index -= 1) {
      if (aliasScopes[index].has(node.left.text)) {
        aliasScopes[index].set(node.left.text, path);
        return;
      }
    }
    setAlias(node.left.text, path);
  }

  function visit(node) {
    const createsScope =
      node !== source &&
      (ts.isFunctionLike(node) || ts.isBlock(node) || ts.isCatchClause(node));
    if (createsScope) aliasScopes.push(new Map());
    if (ts.isFunctionLike(node)) {
      for (const parameter of node.parameters) {
        invalidateBindingName(parameter.name);
      }
    }
    if (ts.isCatchClause(node) && node.variableDeclaration !== undefined) {
      invalidateBindingName(node.variableDeclaration.name);
    }
    recordAliases(node);
    recordAssignment(node);
    const pathSegments = resolvedPropertyAccessPath(node);
    if (
      pathSegments !== null &&
      pathSegments.length >= 2 &&
      pathSegments.at(-2) === "subject" &&
      pathSegments.at(-1) === "attackName"
    ) {
      add(node, "execution subject owns attack presentation");
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isObjectBindingPattern(node.name) &&
      node.initializer !== undefined &&
      resolvedPropertyAccessPath(node.initializer)?.at(-1) === "subject" &&
      node.name.elements.some(
        (element) =>
          propertyNameText(element.propertyName ?? element.name) ===
          "attackName",
      )
    ) {
      add(node, "execution subject destructures attack presentation");
    }
    const authoredIdentityKind = authoredIdentityPathKind(pathSegments);
    const checksReducerAuthoredIdentity =
      relativePath.includes("/battle-reducer/") &&
      pathComesFromReducerExecution(pathSegments ?? []) &&
      isOutermostPropertyPath(node);
    if (
      authoredIdentityKind !== null &&
      checksReducerAuthoredIdentity &&
      nodeConstructsRuntimeKey(node)
    ) {
      add(node, `authored ${authoredIdentityKind} id constructs a runtime key`);
    }
    if (
      authoredIdentityKind !== null &&
      checksReducerAuthoredIdentity &&
      nodeDispatchesOnIdentity(node)
    ) {
      add(node, `reducer dispatches on authored ${authoredIdentityKind} id`);
    }
    if (
      ts.isTypeAliasDeclaration(node) &&
      node.name.text === "BattleSpellTargetListHole" &&
      ts.isTypeLiteralNode(node.type) &&
      node.type.members.some(
        (member) =>
          ts.isPropertySignature(member) &&
          member.name !== undefined &&
          propertyNameText(member.name) === "procedure",
      )
    ) {
      add(node, "spellTargetList type retains redundant procedure");
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.getText() === "Schema.Struct" &&
      node.arguments[0] !== undefined
    ) {
      const properties = topLevelSchemaProperties(node.arguments[0]);
      const isSpellTargetList = properties.some(
        (property) =>
          property.name === "kind" &&
          schemaLiteralIncludes(property.value, "spellTargetList"),
      );
      const procedure = properties.find(
        (property) => property.name === "procedure",
      );
      if (
        isSpellTargetList &&
        procedure !== undefined &&
        !schemaNeverRejectsExpression(procedure.value)
      ) {
        add(
          procedure.node,
          "spellTargetList codec retains redundant procedure",
        );
      }
    }
    if (
      (ts.isPropertyAssignment(node) ||
        ts.isShorthandPropertyAssignment(node)) &&
      propertyNameText(node.name) === "spellDamageReroll"
    ) {
      const value = ts.isPropertyAssignment(node)
        ? node.initializer
        : uniqueDeclaredValue(node.name);
      if (
        value !== undefined &&
        reachableSchemaAcceptsProperty(value, "dieRef")
      ) {
        add(node, "Empowered Spell codec accepts removed dieRef");
      }
    }
    if (
      ts.isPropertySignature(node) &&
      node.name !== undefined &&
      CHARACTER_EXECUTION_AUTHORED_ID_KEYS.has(propertyNameText(node.name)) &&
      nodeHasAncestor(
        node,
        (ancestor) =>
          ts.isTypeAliasDeclaration(ancestor) &&
          ancestor.name.text === "CharacterProcedureBinding",
      )
    ) {
      add(
        node,
        `CharacterProcedureBinding execution retains authored id ${propertyNameText(node.name)}`,
      );
    }
    if (ts.isIdentifier(node) && positionalIdentityNames.has(node.text)) {
      add(node, "damage-die replay identity is positional");
    }
    ts.forEachChild(node, visit);
    if (createsScope) aliasScopes.pop();
  }
  visit(source);
  return violations;
}

function assertBattleReplayAstBoundary() {
  const roots = [
    "packages/battle-runtime/src/identity.ts",
    "packages/battle-runtime/src/character-execution-admission.ts",
    "packages/battle-runtime/src/battle-state-execution.ts",
    "packages/battle-runtime/src/battle-reducer",
    "packages/mcp/src/admin-mirror-presentation-timeline.ts",
  ];
  const files = roots.flatMap((relativePath) => {
    const absolutePath = path.join(REPO_ROOT, relativePath);
    return fs.statSync(absolutePath).isDirectory()
      ? listFiles(absolutePath)
      : [absolutePath];
  });
  const violations = files.flatMap((absolutePath) => {
    const relativePath = path
      .relative(REPO_ROOT, absolutePath)
      .replaceAll(path.sep, "/");
    return battleReplayAstViolations(
      fs.readFileSync(absolutePath, "utf8"),
      relativePath,
    );
  });
  if (violations.length > 0) {
    throw new Error(
      `Battle replay AST boundary violations:\n${violations.join("\n")}`,
    );
  }
}

function assertBattleReplayAstSelfTests() {
  const fixture = `
    type BattleSpellTargetListHole = { procedure: "saveGatedDamage" }
    const codec = Schema.Struct({
      kind: Schema.Literal("spellTargetList"),
      sourceProcedureRef: Ref,
      padding: "${"x".repeat(240)}",
      procedure: Procedure,
    })
    const rerollCodec = Schema.Struct({
      spellDamageReroll: Schema.optionalWith(Schema.Struct({
        dice: Schema.Array(Schema.Struct({ dieRef: Ref })),
      })),
    })
    const key = \`${'${invocation["spell"].id}'}:effect\`
    const { attackName } = pending.subject
    type Die = { groupOrdinal: number }
    const s = pending.subject
    const aliasedAttackName = s.attackName
    const spell = invocation.spell
    const aliasedKey = \`${"${spell.id}"}:effect\`
  `;
  const strictRemovedFieldFixture = `
    const codec = Schema.Struct({
      kind: Schema.Literal("spellTargetList"),
      sourceProcedureRef: Ref,
      procedure: Schema.optionalWith(Schema.Never, { exact: true }),
    })
    const rerollCodec = Schema.Struct({
      spellDamageReroll: Schema.optionalWith(Schema.Struct({
        dice: Schema.Array(Schema.Struct({
          dieRef: Schema.optionalWith(Schema.Never, { exact: true }),
        })),
      })),
    })
  `;
  const extractedSchemaFixture = `
    const legacyTargetFields = { procedure: Procedure }
    const targetListFields = {
      kind: Schema.Literal("spellTargetList"),
      sourceProcedureRef: Ref,
      ...legacyTargetFields,
    }
    const targetListCodec = Schema.Struct(targetListFields)
    const legacyDieFields = { dieRef: Ref }
    const rerollDieCodec = Schema.Struct({ ...legacyDieFields })
    const rerollPayloadCodec = Schema.Struct({
      dice: Schema.Array(rerollDieCodec),
    })
    const spellDamageReroll = Schema.optionalWith(rerollPayloadCodec)
    const fillCodec = Schema.Struct({ spellDamageReroll })
  `;
  const strictExtractedSchemaFixture = `
    const removedTargetFields = {
      procedure: Schema.optionalWith(Schema.Never, { exact: true }),
    }
    const targetListFields = {
      kind: Schema.Literal("spellTargetList"),
      ...removedTargetFields,
    }
    const targetListCodec = Schema.Struct(targetListFields)
    const removedDieFields = {
      dieRef: Schema.optionalWith(Schema.Never, { exact: true }),
    }
    const rerollDieCodec = Schema.Struct({ ...removedDieFields })
    const spellDamageReroll = Schema.optionalWith(
      Schema.Struct({ dice: Schema.Array(rerollDieCodec) }),
    )
    const fillCodec = Schema.Struct({ spellDamageReroll })
  `;
  const violations = battleReplayAstViolations(
    fixture,
    "packages/battle-runtime/src/battle-reducer/metamagic.ts",
  );
  for (const expected of [
    "authored spell id constructs a runtime key",
    "execution subject destructures attack presentation",
    "spellTargetList type retains redundant procedure",
    "spellTargetList codec retains redundant procedure",
    "Empowered Spell codec accepts removed dieRef",
    "damage-die replay identity is positional",
  ]) {
    assert.ok(
      violations.some((violation) => violation.endsWith(expected)),
      `Battle replay AST self-test missed ${expected}.`,
    );
  }
  assert.ok(
    violations.filter((violation) =>
      violation.endsWith("execution subject owns attack presentation"),
    ).length >= 1,
    "Battle replay AST self-test missed aliased subject presentation.",
  );
  assert.deepEqual(
    battleReplayAstViolations(
      strictRemovedFieldFixture,
      "packages/battle-runtime/src/battle-reducer/battle-codecs.ts",
    ),
    [],
    "Battle replay AST gate must allow explicit strict rejection of a removed field.",
  );
  const extractedSchemaViolations = battleReplayAstViolations(
    extractedSchemaFixture,
    "packages/battle-runtime/src/battle-reducer/extracted-codecs.ts",
  );
  for (const expected of [
    "spellTargetList codec retains redundant procedure",
    "Empowered Spell codec accepts removed dieRef",
  ]) {
    assert.ok(
      extractedSchemaViolations.some((violation) =>
        violation.endsWith(expected),
      ),
      `Battle replay AST self-test missed extracted schema violation ${expected}.`,
    );
  }
  assert.deepEqual(
    battleReplayAstViolations(
      strictExtractedSchemaFixture,
      "packages/battle-runtime/src/battle-reducer/extracted-strict-codecs.ts",
    ),
    [],
    "Battle replay AST gate must follow extracted strict-rejection schemas.",
  );
  assert.ok(
    violations.filter((violation) =>
      violation.endsWith("authored spell id constructs a runtime key"),
    ).length >= 2,
    "Battle replay AST self-test missed aliased authored spell identity.",
  );
  const positionalFixture = `type Die = { dieOrdinal: number }`;
  assert.ok(
    battleReplayAstViolations(
      positionalFixture,
      "packages/battle-runtime/src/battle-reducer/battle-codecs.ts",
    ).some((violation) =>
      violation.endsWith("damage-die replay identity is positional"),
    ),
    "Battle replay AST self-test missed positional identity outside metamagic.ts.",
  );
  const scopedAliasFixture = `
    function runtimeKey(invocation: Invocation) {
      const spell = invocation.spell as Spell
      return \`${"${spell.id}"}:effect\`
    }
    function presentation(spell: SelectedSpell, s: Selection) {
      return [spell.id, s.attackName]
    }
  `;
  assert.equal(
    battleReplayAstViolations(
      scopedAliasFixture,
      "packages/battle-runtime/src/battle-reducer/alias-scope.ts",
    ).filter((violation) =>
      violation.endsWith("authored spell id constructs a runtime key"),
    ).length,
    1,
    "Battle replay AST aliases must respect function parameter shadowing and type wrappers.",
  );
  const reassignedAliasFixture = `
    let spell = invocation.spell
    spell = selectedSpell
    const key = \`${"${spell.id}"}:effect\`
  `;
  assert.equal(
    battleReplayAstViolations(
      reassignedAliasFixture,
      "packages/battle-runtime/src/battle-reducer/alias-assignment.ts",
    ).filter((violation) =>
      violation.endsWith("authored spell id constructs a runtime key"),
    ).length,
    0,
    "Battle replay AST aliases must invalidate on reassignment.",
  );
  const authoredRuntimeIdentityFixture = `
    type CharacterProcedureBinding = {
      readonly procedure: {
        readonly execution: {
          readonly resourceUnitId: string
          readonly sourceUnitId: string
        }
      }
    }
    function resolve(binding: Binding, resource: Resource, table: Map<string, unknown>) {
      const key = \`${"${binding.procedure.execution.spellId}"}:effect\`
      const source = binding.procedure.execution.sourceUnitId
      if (binding.procedure.execution.resourceUnitId === resource.unit.id) return key
      return table.get(source)
    }
  `;
  const authoredRuntimeIdentityViolations = battleReplayAstViolations(
    authoredRuntimeIdentityFixture,
    "packages/battle-runtime/src/battle-reducer/authored-runtime-identity.ts",
  );
  for (const expected of [
    "authored spell id constructs a runtime key",
    "reducer dispatches on authored unit id",
    "CharacterProcedureBinding execution retains authored id resourceUnitId",
    "CharacterProcedureBinding execution retains authored id sourceUnitId",
  ]) {
    assert.ok(
      authoredRuntimeIdentityViolations.some((violation) =>
        violation.includes(expected),
      ),
      `Battle replay AST self-test missed authored runtime identity violation ${expected}.`,
    );
  }
}

function countChar(text, char) {
  let count = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === char) {
      count += 1;
    }
  }
  return count;
}

function extractParenthesizedExpression(text, openIndex) {
  if (openIndex < 0 || text[openIndex] !== "(") {
    return null;
  }

  const closeIndex = findMatchingParenIndex(text, openIndex);
  return closeIndex == null ? null : text.slice(openIndex + 1, closeIndex);
}

function findMatchingParenIndex(text, openIndex) {
  if (openIndex < 0 || text[openIndex] !== "(") {
    return null;
  }

  let depth = 0;
  for (let i = openIndex; i < text.length; i += 1) {
    const char = text[i];
    if (char === "(") {
      depth += 1;
      continue;
    }
    if (char === ")") {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }

  return null;
}

function collectAuthoredIdentityLiterals() {
  if (!fs.existsSync(SURFACE_CONTENT_ROOT)) {
    throw new Error(
      "authored-id boundary check: surface content directory not found",
    );
  }

  const identityLiterals = new Set();
  const malformedContentFiles = [];

  function collectReferenceIdsFromValue(value) {
    if (Array.isArray(value)) {
      for (const item of value) {
        collectReferenceIdsFromValue(item);
      }
      return;
    }

    if (value == null || typeof value !== "object") {
      return;
    }

    for (const [key, nestedValue] of Object.entries(value)) {
      const isAuthoredReferenceId =
        (key === "id" || key.endsWith("Id")) && key !== "holeId";

      if (
        isAuthoredReferenceId &&
        typeof nestedValue === "string" &&
        nestedValue.length > 0
      ) {
        addAuthoredIdentityLiteral(identityLiterals, nestedValue);
      }

      collectReferenceIdsFromValue(nestedValue);
    }
  }

  for (const filePath of listSurfaceContentFiles(SURFACE_CONTENT_ROOT)) {
    const relativePath = path
      .relative(REPO_ROOT, filePath)
      .replaceAll(path.sep, "/");

    const content = fs.readFileSync(filePath, "utf8");
    try {
      const parsed = JSON.parse(content);
      if (parsed != null && typeof parsed === "object") {
        if (typeof parsed.id === "string" && parsed.id.length > 0) {
          addAuthoredIdentityLiteral(identityLiterals, parsed.id);
        }
        if (typeof parsed.name === "string" && parsed.name.length > 0) {
          addAuthoredIdentityLiteral(identityLiterals, parsed.name);
        }
        if (
          parsed.provenance != null &&
          typeof parsed.provenance === "object" &&
          typeof parsed.provenance.section === "string" &&
          parsed.provenance.section.length > 0
        ) {
          addAuthoredIdentityLiteral(
            identityLiterals,
            parsed.provenance.section,
          );
        }
      }
      collectReferenceIdsFromValue(parsed);
    } catch {
      malformedContentFiles.push(relativePath);
    }
  }

  return {
    identityLiterals,
    malformedContentFiles,
  };
}

function collectDispatchContainerUsages(content) {
  const usages = [];
  const source = ts.createSourceFile(
    "authored-id-dispatch.ts",
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const membershipMethods = new Set([
    "includes",
    "has",
    "indexOf",
    "get",
    "some",
    "find",
    "findIndex",
  ]);
  const predicateMembershipMethods = new Set(["some", "find", "findIndex"]);
  const containerName = (expression) => {
    const text = expression.getText(source);
    return /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?$/.test(text)
      ? text
      : undefined;
  };
  const predicateComparesElementToAuthoredSelector = (argument) => {
    if (
      argument === undefined ||
      (!ts.isArrowFunction(argument) && !ts.isFunctionExpression(argument))
    ) {
      return false;
    }
    const parameter = argument.parameters[0]?.name;
    if (parameter === undefined || !ts.isIdentifier(parameter)) return false;
    let found = false;
    const visitPredicate = (node) => {
      if (found) return;
      if (ts.isBinaryExpression(node)) {
        const left = node.left.getText(source);
        const right = node.right.getText(source);
        if (
          (left === parameter.text && hasAuthoredIdentitySelector(right)) ||
          (right === parameter.text && hasAuthoredIdentitySelector(left))
        ) {
          found = true;
          return;
        }
      }
      ts.forEachChild(node, visitPredicate);
    };
    visitPredicate(argument.body);
    return found;
  };

  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      membershipMethods.has(node.expression.name.text)
    ) {
      const container = containerName(node.expression.expression);
      const method = node.expression.name.text;
      const argumentNode = node.arguments[0];
      const argument = argumentNode?.getText(source) ?? "";
      const selectsAuthoredIdentity = predicateMembershipMethods.has(method)
        ? predicateComparesElementToAuthoredSelector(argumentNode)
        : hasAuthoredIdentitySelector(argument);
      if (container !== undefined && selectsAuthoredIdentity) {
        usages.push({
          container,
          index: node.getStart(source),
          detail: node.getText(source),
        });
      }
    }
    if (ts.isElementAccessExpression(node)) {
      const container = containerName(node.expression);
      const indexExpression = node.argumentExpression?.getText(source) ?? "";
      if (
        container !== undefined &&
        hasAuthoredIdentitySelector(indexExpression)
      ) {
        usages.push({
          container,
          index: node.getStart(source),
          detail: node.getText(source),
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  return usages;
}

function collectDispatchContainerNamesFromUsages(dispatchContainerUsages) {
  const names = new Set();

  for (const usage of dispatchContainerUsages) {
    names.add(usage.container);
    names.add(usage.container.split(".")[0]);
  }

  return names;
}

function collectLiteralAliasMap(content, authoredAlternation) {
  const aliases = new Map();
  const aliasRegex = new RegExp(
    `\\b(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*(["'\\x60])(${authoredAlternation})\\2`,
    "g",
  );

  for (;;) {
    const match = aliasRegex.exec(content);
    if (match == null) {
      break;
    }

    const aliasName = match[1];
    const literal = match[3];
    if (aliasName == null || literal == null) {
      continue;
    }
    aliases.set(aliasName, literal);
  }

  return aliases;
}

function collectLocalAuthoredContainerMap(
  content,
  authoredAlternation,
  literalAliases,
) {
  const authoredTokenRegex = new RegExp(
    `(["'\\x60])(${authoredAlternation})\\1`,
  );
  const declarationRegex =
    /\b(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([\s\S]*?)(?=;|\n\s*(?:(?:export\s+)?(?:const|let|var|function|class|type|interface|enum)\b)|$)/g;
  const localContainers = new Map();

  for (;;) {
    const declarationMatch = declarationRegex.exec(content);
    if (declarationMatch == null) {
      break;
    }

    const variableName = declarationMatch[1];
    const initializer = declarationMatch[2] ?? "";
    if (variableName == null) {
      continue;
    }

    const initializerStart =
      declarationMatch.index + declarationMatch[0].indexOf(initializer);

    const authoredMatch = authoredTokenRegex.exec(initializer);
    if (authoredMatch != null) {
      const literal = authoredMatch[2] ?? "";
      localContainers.set(variableName, {
        literal,
        index: initializerStart + authoredMatch.index + 1,
        source: "literal",
      });
      continue;
    }

    for (const [aliasName, aliasLiteral] of literalAliases.entries()) {
      const aliasUsageRegex = new RegExp(`\\b${escapeForRegExp(aliasName)}\\b`);
      const aliasUsage = aliasUsageRegex.exec(initializer);
      if (aliasUsage == null) {
        continue;
      }

      localContainers.set(variableName, {
        literal: aliasLiteral,
        index: initializerStart + aliasUsage.index,
        source: `alias ${aliasName}`,
      });
      break;
    }
  }

  return localContainers;
}

function collectExportedAuthoredContainers(content, localAuthoredContainers) {
  const exported = new Map();

  const directExportRegex =
    /\bexport\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g;
  for (;;) {
    const match = directExportRegex.exec(content);
    if (match == null) {
      break;
    }

    const localName = match[1];
    if (localName == null) {
      continue;
    }

    const info = localAuthoredContainers.get(localName);
    if (info != null) {
      exported.set(localName, info);
    }
  }

  const namedExportRegex =
    /\bexport\s*{\s*([^}]+)\s*}(?:\s*from\s*(["'\x60])([^"'\x60]+)\2)?/g;
  for (;;) {
    const match = namedExportRegex.exec(content);
    if (match == null) {
      break;
    }

    const fromSpecifier = match[3] ?? null;
    if (fromSpecifier != null) {
      // Re-exports are intentionally ignored here to keep resolution local.
      continue;
    }

    const entriesRaw = match[1] ?? "";
    for (const rawEntry of entriesRaw.split(",")) {
      const entry = rawEntry.trim();
      if (entry.length === 0) {
        continue;
      }

      const entryMatch =
        /^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/.exec(entry);
      if (entryMatch == null) {
        continue;
      }

      const localName = entryMatch[1];
      const exportName = entryMatch[2] ?? localName;
      if (localName == null || exportName == null) {
        continue;
      }

      const info = localAuthoredContainers.get(localName);
      if (info != null) {
        exported.set(exportName, info);
      }
    }
  }

  return exported;
}

function resolveImportSpecifier(relativePath, specifier, sourceFilesSet) {
  if (!specifier.startsWith(".")) {
    return null;
  }

  const importerDir = path.dirname(relativePath);
  const moduleBase = path
    .normalize(path.join(importerDir, specifier))
    .replaceAll(path.sep, "/");

  const candidates = [moduleBase];
  for (const extension of SOURCE_EXTENSIONS) {
    candidates.push(`${moduleBase}${extension}`);
  }
  for (const extension of SOURCE_EXTENSIONS) {
    candidates.push(`${moduleBase}/index${extension}`);
  }

  for (const candidate of candidates) {
    if (sourceFilesSet.has(candidate)) {
      return candidate;
    }
  }

  return null;
}

function collectImportedAuthoredBindings(
  content,
  relativePath,
  sourceFilesSet,
  authoredExportsByFile,
) {
  const importedLiteralAliases = new Map();
  const importedContainers = new Map();
  const importedNamespaceContainers = new Map();

  const importRegex =
    /\bimport\s+([\s\S]*?)\s+from\s*(["'\x60])([^"'\x60]+)\2/g;
  for (;;) {
    const match = importRegex.exec(content);
    if (match == null) {
      break;
    }

    const clause = (match[1] ?? "").trim();
    const specifier = match[3] ?? "";
    const resolvedImport = resolveImportSpecifier(
      relativePath,
      specifier,
      sourceFilesSet,
    );
    if (resolvedImport == null) {
      continue;
    }

    const exportedContainers = authoredExportsByFile.get(resolvedImport);
    if (exportedContainers == null || exportedContainers.size === 0) {
      continue;
    }

    const namespaceMatch =
      /(?:^|,)\s*\*\s+as\s+([A-Za-z_$][\w$]*)\s*(?:,|$)/.exec(clause);
    if (namespaceMatch != null) {
      const namespaceName = namespaceMatch[1];
      if (namespaceName != null) {
        importedNamespaceContainers.set(namespaceName, exportedContainers);
      }
    }

    const namedBlockMatch = /{([\s\S]+)}/.exec(clause);
    if (namedBlockMatch == null) {
      continue;
    }

    const namedEntries = namedBlockMatch[1] ?? "";
    for (const rawEntry of namedEntries.split(",")) {
      const entry = rawEntry.trim();
      if (entry.length === 0) {
        continue;
      }

      const entryMatch =
        /^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/.exec(entry);
      if (entryMatch == null) {
        continue;
      }

      const importedName = entryMatch[1];
      const localName = entryMatch[2] ?? importedName;
      if (importedName == null || localName == null) {
        continue;
      }

      const exportedInfo = exportedContainers.get(importedName);
      if (exportedInfo == null) {
        continue;
      }

      importedLiteralAliases.set(localName, exportedInfo.literal);
      importedContainers.set(localName, {
        literal: exportedInfo.literal,
        sourceFile: resolvedImport,
        sourceExportName: importedName,
      });
    }
  }

  return {
    importedLiteralAliases,
    importedContainers,
    importedNamespaceContainers,
  };
}

function collectComparisonViolations(
  content,
  relativePath,
  authoredAlternation,
  literalAliases,
) {
  const violations = [];

  const authoredOnRight = new RegExp(
    `\\b(${IDENTIFIER_EXPRESSION_PATTERN})\\s*(===|==|!==|!=)\\s*(["'\\x60])(${authoredAlternation})\\3`,
    "g",
  );
  for (;;) {
    const match = authoredOnRight.exec(content);
    if (match == null) {
      break;
    }

    const identifierExpression = match[1] ?? "";
    const literal = match[4] ?? "";
    if (!hasAuthoredIdentitySelector(identifierExpression)) {
      continue;
    }

    violations.push({
      relativePath,
      line: lineNumberForIndex(content, match.index),
      literal,
      context: {
        kind: "id-comparison",
        detail: match[0],
      },
    });
  }

  const authoredOnLeft = new RegExp(
    `(["'\\x60])(${authoredAlternation})\\1\\s*(===|==|!==|!=)\\s*(${IDENTIFIER_EXPRESSION_PATTERN})`,
    "g",
  );
  for (;;) {
    const match = authoredOnLeft.exec(content);
    if (match == null) {
      break;
    }

    const literal = match[2] ?? "";
    const identifierExpression = match[4] ?? "";
    if (!hasAuthoredIdentitySelector(identifierExpression)) {
      continue;
    }

    violations.push({
      relativePath,
      line: lineNumberForIndex(content, match.index),
      literal,
      context: {
        kind: "id-comparison",
        detail: match[0],
      },
    });
  }

  const aliasOnRight = new RegExp(
    `\\b(${IDENTIFIER_EXPRESSION_PATTERN})\\s*(===|==|!==|!=)\\s*([A-Za-z_$][\\w$]*)\\b`,
    "g",
  );
  for (;;) {
    const match = aliasOnRight.exec(content);
    if (match == null) {
      break;
    }

    const identifierExpression = match[1] ?? "";
    const aliasName = match[3] ?? "";
    const literal = literalAliases.get(aliasName);
    if (literal == null || !hasAuthoredIdentitySelector(identifierExpression)) {
      continue;
    }

    violations.push({
      relativePath,
      line: lineNumberForIndex(content, match.index),
      literal,
      context: {
        kind: "id-comparison-alias",
        detail: `${match[0]} -> ${aliasName}="${literal}"`,
      },
    });
  }

  const aliasOnLeft = new RegExp(
    `\\b([A-Za-z_$][\\w$]*)\\s*(===|==|!==|!=)\\s*(${IDENTIFIER_EXPRESSION_PATTERN})\\b`,
    "g",
  );
  for (;;) {
    const match = aliasOnLeft.exec(content);
    if (match == null) {
      break;
    }

    const aliasName = match[1] ?? "";
    const identifierExpression = match[3] ?? "";
    const literal = literalAliases.get(aliasName);
    if (literal == null || !hasAuthoredIdentitySelector(identifierExpression)) {
      continue;
    }

    violations.push({
      relativePath,
      line: lineNumberForIndex(content, match.index),
      literal,
      context: {
        kind: "id-comparison-alias",
        detail: `${match[0]} -> ${aliasName}="${literal}"`,
      },
    });
  }

  return violations;
}

function collectAuthoredIdentityFieldComparisonViolations(
  content,
  relativePath,
) {
  const violations = [];
  const lines = content.split("\n");
  const identifierExpression = IDENTIFIER_EXPRESSION_PATTERN;
  const stringLiteral = String.raw`(?:"[^"\n]*"|'[^'\n]*'|\x60[^\x60\n]*\x60)`;
  const comparableExpression = String.raw`(?:${identifierExpression}|${stringLiteral})`;
  const comparison = new RegExp(
    String.raw`\b(${identifierExpression}|${stringLiteral})\s*(===|==|!==|!=)\s*(${comparableExpression})`,
    "g",
  );

  for (const [index, line] of lines.entries()) {
    comparison.lastIndex = 0;
    for (;;) {
      const match = comparison.exec(line);
      if (match == null) {
        break;
      }

      const left = match[1] ?? "";
      const right = match[3] ?? "";
      const leftIsAuthoredIdentity = isAuthoredIdentityFieldExpression(left);
      const rightIsAuthoredIdentity = isAuthoredIdentityFieldExpression(right);
      if (!leftIsAuthoredIdentity && !rightIsAuthoredIdentity) {
        continue;
      }

      violations.push({
        relativePath,
        line: index + 1,
        literal: leftIsAuthoredIdentity ? left : right,
        context: {
          kind: "authored-identity-field-comparison",
          detail: match[0],
        },
      });
    }
  }

  return violations;
}

function switchExpressionBeforeCase(content, caseIndex) {
  const switchSearchWindow = content.slice(
    Math.max(0, caseIndex - 5000),
    caseIndex,
  );
  const switchLocalIndex = switchSearchWindow.lastIndexOf("switch");

  if (switchLocalIndex < 0) {
    return null;
  }

  const switchIndex = Math.max(0, caseIndex - 5000) + switchLocalIndex;
  const switchSnippet = content.slice(switchIndex, caseIndex);

  if (countChar(switchSnippet, "{") <= countChar(switchSnippet, "}")) {
    return null;
  }

  const openParenIndex = switchSnippet.indexOf("(");
  return extractParenthesizedExpression(switchSnippet, openParenIndex);
}

function collectSwitchViolations(
  content,
  relativePath,
  authoredAlternation,
  literalAliases,
) {
  const violations = [];
  const caseRegex = new RegExp(
    `case\\s*(["'\\x60])(${authoredAlternation})\\1\\s*:`,
    "g",
  );

  for (;;) {
    const match = caseRegex.exec(content);
    if (match == null) {
      break;
    }

    const literal = match[2] ?? "";
    const caseIndex = match.index;
    const expression = switchExpressionBeforeCase(content, caseIndex);
    if (expression == null || !hasAuthoredIdentitySelector(expression)) {
      continue;
    }

    violations.push({
      relativePath,
      line: lineNumberForIndex(content, caseIndex),
      literal,
      context: {
        kind: "switch-id-branch",
        detail: `switch(${expression.trim()})`,
      },
    });
  }

  const caseAliasRegex = /case\s*([A-Za-z_$][\w$]*)\s*:/g;
  for (;;) {
    const match = caseAliasRegex.exec(content);
    if (match == null) {
      break;
    }

    const aliasName = match[1] ?? "";
    const literal = literalAliases.get(aliasName);
    if (literal == null) {
      continue;
    }

    const caseIndex = match.index;
    const expression = switchExpressionBeforeCase(content, caseIndex);
    if (expression == null || !hasAuthoredIdentitySelector(expression)) {
      continue;
    }

    violations.push({
      relativePath,
      line: lineNumberForIndex(content, caseIndex),
      literal,
      context: {
        kind: "switch-id-branch-alias",
        detail: `switch(${expression.trim()}) case ${aliasName}`,
      },
    });
  }

  return violations;
}

function collectEffectMatchViolations(
  content,
  relativePath,
  authoredAlternation,
  literalAliases,
) {
  const violations = [];
  const matchValueRegex = /\bMatch\s*\.\s*value\s*\(/g;

  for (;;) {
    const matchValue = matchValueRegex.exec(content);
    if (matchValue == null) {
      break;
    }

    const valueOpenIndex = content.indexOf("(", matchValue.index);
    const valueExpression = extractParenthesizedExpression(
      content,
      valueOpenIndex,
    );
    if (
      valueExpression == null ||
      !hasAuthoredIdentitySelector(valueExpression)
    ) {
      continue;
    }

    const valueCloseIndex = findMatchingParenIndex(content, valueOpenIndex);
    if (valueCloseIndex == null) {
      continue;
    }

    const afterValue = content.slice(valueCloseIndex + 1);
    const pipeMatch = /^\s*\.\s*pipe\s*\(/.exec(afterValue);
    if (pipeMatch == null) {
      continue;
    }

    const pipeOpenIndex = valueCloseIndex + 1 + pipeMatch[0].lastIndexOf("(");
    const pipeCloseIndex = findMatchingParenIndex(content, pipeOpenIndex);
    if (pipeCloseIndex == null) {
      continue;
    }

    const pipeBody = content.slice(pipeOpenIndex + 1, pipeCloseIndex);
    const pipeBodyStart = pipeOpenIndex + 1;

    const whenLiteralRegex = new RegExp(
      `\\bMatch\\s*\\.\\s*when\\s*\\(\\s*(["'\\x60])(${authoredAlternation})\\1`,
      "g",
    );
    for (;;) {
      const whenMatch = whenLiteralRegex.exec(pipeBody);
      if (whenMatch == null) {
        break;
      }

      const literal = whenMatch[2] ?? "";
      violations.push({
        relativePath,
        line: lineNumberForIndex(content, pipeBodyStart + whenMatch.index),
        literal,
        context: {
          kind: "effect-match-identity-branch",
          detail: `Match.value(${valueExpression.trim()}).pipe(Match.when("${literal}", ...))`,
        },
      });
    }

    const whenAliasRegex = /\bMatch\s*\.\s*when\s*\(\s*([A-Za-z_$][\w$]*)\b/g;
    for (;;) {
      const whenMatch = whenAliasRegex.exec(pipeBody);
      if (whenMatch == null) {
        break;
      }

      const aliasName = whenMatch[1] ?? "";
      const literal = literalAliases.get(aliasName);
      if (literal == null) {
        continue;
      }

      violations.push({
        relativePath,
        line: lineNumberForIndex(content, pipeBodyStart + whenMatch.index),
        literal,
        context: {
          kind: "effect-match-identity-branch-alias",
          detail: `Match.value(${valueExpression.trim()}).pipe(Match.when(${aliasName}, ...)) -> ${aliasName}="${literal}"`,
        },
      });
    }
  }

  return violations;
}

function collectDispatchContainerViolations(
  content,
  relativePath,
  dispatchContainerUsages,
  dispatchContainerNames,
  localAuthoredContainers,
  importedContainers,
  importedNamespaceContainers,
) {
  if (
    dispatchContainerUsages.length === 0 &&
    dispatchContainerNames.size === 0
  ) {
    return [];
  }

  const violations = [];

  for (const [variableName, info] of localAuthoredContainers.entries()) {
    if (!dispatchContainerNames.has(variableName)) {
      continue;
    }

    violations.push({
      relativePath,
      line: lineNumberForIndex(content, info.index),
      literal: info.literal,
      context: {
        kind: "dispatch-container",
        detail: `${variableName} (${info.source})`,
      },
    });
  }

  for (const usage of dispatchContainerUsages) {
    const containerRoot = usage.container.split(".")[0];
    if (containerRoot == null) {
      continue;
    }

    const importedContainer = importedContainers.get(containerRoot);
    if (importedContainer != null) {
      violations.push({
        relativePath,
        line: lineNumberForIndex(content, usage.index),
        literal: importedContainer.literal,
        context: {
          kind: "dispatch-imported-container",
          detail: `${usage.detail} via ${containerRoot} from ${importedContainer.sourceFile}:${importedContainer.sourceExportName}`,
        },
      });
      continue;
    }

    const namespaceExports = importedNamespaceContainers.get(containerRoot);
    const containerSegments = usage.container.split(".");
    const namespaceMember =
      containerSegments.length > 1 ? containerSegments[1] : null;
    if (namespaceExports == null || namespaceMember == null) {
      continue;
    }

    const namespaceContainerInfo = namespaceExports.get(namespaceMember);
    if (namespaceContainerInfo == null) {
      continue;
    }

    violations.push({
      relativePath,
      line: lineNumberForIndex(content, usage.index),
      literal: namespaceContainerInfo.literal,
      context: {
        kind: "dispatch-imported-namespace-container",
        detail: `${usage.detail} via ${containerRoot}.${namespaceMember}`,
      },
    });
  }

  return violations;
}

function dedupeViolations(violations) {
  const unique = new Map();

  for (const violation of violations) {
    const key = `${violation.relativePath}:${violation.line}:${violation.literal}:${violation.context.kind}:${violation.context.detail}`;
    if (!unique.has(key)) {
      unique.set(key, violation);
    }
  }

  return Array.from(unique.values()).sort((left, right) => {
    if (left.relativePath !== right.relativePath) {
      return left.relativePath.localeCompare(right.relativePath);
    }
    if (left.line !== right.line) {
      return left.line - right.line;
    }
    if (left.literal !== right.literal) {
      return left.literal.localeCompare(right.literal);
    }
    return left.context.kind.localeCompare(right.context.kind);
  });
}

function findViolationsForFile(
  relativePath,
  content,
  authoredAlternation,
  sourceFilesSet,
  authoredExportsByFile,
) {
  const dispatchContainerUsages = collectDispatchContainerUsages(content);
  const dispatchContainerNames = collectDispatchContainerNamesFromUsages(
    dispatchContainerUsages,
  );

  const localLiteralAliases = collectLiteralAliasMap(
    content,
    authoredAlternation,
  );
  const {
    importedLiteralAliases,
    importedContainers,
    importedNamespaceContainers,
  } = collectImportedAuthoredBindings(
    content,
    relativePath,
    sourceFilesSet,
    authoredExportsByFile,
  );

  const allLiteralAliases = new Map(localLiteralAliases);
  for (const [aliasName, literal] of importedLiteralAliases.entries()) {
    allLiteralAliases.set(aliasName, literal);
  }

  const localAuthoredContainers = collectLocalAuthoredContainerMap(
    content,
    authoredAlternation,
    allLiteralAliases,
  );

  return dedupeViolations([
    ...collectComparisonViolations(
      content,
      relativePath,
      authoredAlternation,
      allLiteralAliases,
    ),
    ...collectAuthoredIdentityFieldComparisonViolations(content, relativePath),
    ...collectSwitchViolations(
      content,
      relativePath,
      authoredAlternation,
      allLiteralAliases,
    ),
    ...collectEffectMatchViolations(
      content,
      relativePath,
      authoredAlternation,
      allLiteralAliases,
    ),
    ...collectDispatchContainerViolations(
      content,
      relativePath,
      dispatchContainerUsages,
      dispatchContainerNames,
      localAuthoredContainers,
      importedContainers,
      importedNamespaceContainers,
    ),
  ]).filter((violation) => !isInlineAllowlistedViolation(content, violation));
}

function inlineAllowlistReasonForLine(content, line) {
  const lines = content.split("\n");
  const lineIndexes = [line - 1, line - 2];

  for (const lineIndex of lineIndexes) {
    if (lineIndex < 0 || lineIndex >= lines.length) {
      continue;
    }

    const match = INLINE_ALLOWLIST_COMMENT.exec(lines[lineIndex] ?? "");
    if (match != null && match[1] != null) {
      return match[1];
    }
  }

  return null;
}

function isInlineAllowlistedViolation(content, violation) {
  const boundaryReason = classifyPath(
    violation.relativePath,
    INLINE_ALLOWLIST_PATH_RULES,
  );
  if (boundaryReason == null) {
    return false;
  }

  return (
    inlineAllowlistReasonForLine(content, violation.line) === boundaryReason
  );
}

function formatCountMapEntries(map) {
  return Array.from(map.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([reason, count]) => ({ reason, count }));
}

function buildAuthoredExportIndex(
  sourceFiles,
  sourceFilesSet,
  authoredAlternation,
) {
  const exportedByFile = new Map();

  for (const relativePath of sourceFiles) {
    const content = fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
    const localAliases = collectLiteralAliasMap(content, authoredAlternation);
    const localContainers = collectLocalAuthoredContainerMap(
      content,
      authoredAlternation,
      localAliases,
    );

    if (localContainers.size === 0) {
      continue;
    }

    const exported = collectExportedAuthoredContainers(
      content,
      localContainers,
    );
    if (exported.size > 0) {
      exportedByFile.set(relativePath, exported);
    }
  }

  return exportedByFile;
}

function buildAuthoredAlternation(identityLiterals) {
  return Array.from(identityLiterals)
    .sort(
      (left, right) => right.length - left.length || left.localeCompare(right),
    )
    .map((id) => escapeForRegExp(id))
    .join("|");
}

function runSelfTest() {
  const selfTestLiterals = new Set();
  for (const literal of [
    "magic_missile",
    "Magic Missile",
    "Spells/Descriptions-M-P#Magic Missile",
    "Hunter's Prey",
    "Classes/Ranger.md:243-249",
    "colossus_slayer",
    "addle",
    "push",
    "topple",
  ]) {
    addAuthoredIdentityLiteral(selfTestLiterals, literal);
  }
  const authoredAlternation = buildAuthoredAlternation(selfTestLiterals);

  const productionBranch = [
    "export function productionSpellDispatch(invocation) {",
    '  if (invocation.spell.name === "Magic Missile") return "spell-name-comparison";',
    "  switch (invocation.spell.name) {",
    '    case "Magic Missile": return "spell-name-switch";',
    "  }",
    '  const spellNames = ["Magic Missile"];',
    '  if (spellNames.includes(invocation.spell.name)) return "spell-name-container";',
    '  if (spellNames.some((spellName) => spellName === invocation.spell.name)) return "spell-name-some";',
    "  Match.value(invocation.spell.name).pipe(",
    '    Match.when("Magic Missile", () => "spell-name-effect-match"),',
    "    Match.exhaustive,",
    "  );",
    '  if (invocation.spell.provenance.section === "Spells/Descriptions-M-P#Magic Missile") return "section-comparison";',
    "  return null;",
    "}",
  ].join("\n");

  const productionViolations = findViolationsForFile(
    "packages/battle-runtime/src/battle-reducer/representative-spell-dispatch.ts",
    productionBranch,
    authoredAlternation,
    new Set(),
    new Map(),
  );
  const productionKinds = new Set(
    productionViolations.map((violation) => violation.context.kind),
  );
  assert(
    collectDispatchContainerUsages(productionBranch).some((usage) =>
      usage.detail.includes("spellNames.some"),
    ),
    "Self-test failed: authored identity dispatch through Array.some was not caught.",
  );

  assert(
    productionKinds.has("authored-identity-field-comparison"),
    `Self-test failed: spell.name comparison was not caught. Got ${JSON.stringify(productionViolations)}`,
  );
  assert(
    productionKinds.has("switch-id-branch"),
    `Self-test failed: spell.name switch branch was not caught. Got ${JSON.stringify(productionViolations)}`,
  );
  assert(
    productionKinds.has("dispatch-container"),
    `Self-test failed: spell.name container dispatch was not caught. Got ${JSON.stringify(productionViolations)}`,
  );
  assert(
    productionKinds.has("effect-match-identity-branch"),
    `Self-test failed: effect/Match spell.name branch was not caught. Got ${JSON.stringify(productionViolations)}`,
  );

  const someOnlyBranch = [
    'const spellIds = ["magic_missile"];',
    "export function someOnlyDispatch(invocation) {",
    "  return spellIds.some((spellId) => spellId === invocation.spell.id);",
    "}",
  ].join("\n");
  const someOnlyViolations = findViolationsForFile(
    "packages/battle-runtime/src/battle-reducer/some-only-spell-dispatch.ts",
    someOnlyBranch,
    authoredAlternation,
    new Set(),
    new Map(),
  );
  assert(
    someOnlyViolations.some(
      (violation) => violation.context.kind === "dispatch-container",
    ),
    `Self-test failed: Array.some authored-ID dispatch did not reach the public violation gate. Got ${JSON.stringify(someOnlyViolations)}`,
  );

  for (const predicateMethod of ["find", "findIndex"]) {
    const predicateOnlyBranch = [
      'const spellIds = ["magic_missile"];',
      `export function predicateOnlyDispatch(invocation) {`,
      `  return spellIds.${predicateMethod}((spellId) => spellId === invocation.spell.id);`,
      "}",
    ].join("\n");
    const predicateOnlyViolations = findViolationsForFile(
      `packages/battle-runtime/src/battle-reducer/${predicateMethod}-only-spell-dispatch.ts`,
      predicateOnlyBranch,
      authoredAlternation,
      new Set(),
      new Map(),
    );
    assert(
      predicateOnlyViolations.some(
        (violation) => violation.context.kind === "dispatch-container",
      ),
      `Self-test failed: Array.${predicateMethod} authored-ID dispatch did not reach the public violation gate. Got ${JSON.stringify(predicateOnlyViolations)}`,
    );
  }

  const objectLookupBranch = [
    'const combatants = [{ combatantId: "synthetic", spellId: "magic_missile" }];',
    "export function lookupCombatant(combatantId) {",
    "  return combatants.find((candidate) => candidate.combatantId === combatantId);",
    "}",
  ].join("\n");
  assert.equal(
    collectDispatchContainerUsages(objectLookupBranch).length,
    0,
    "Self-test failed: object lookup was mistaken for authored-ID membership dispatch.",
  );

  const nonSpellUnitIdentityBranch = [
    'const unitNames = ["Hunter\'s Prey"];',
    "export function nonSpellUnitDispatch(unit) {",
    "  switch (unit.name) {",
    '    case "Hunter\'s Prey": return "unit-name-switch";',
    "  }",
    '  if (unitNames.includes(unit.name)) return "unit-name-container";',
    "  return Match.value(unit.provenance.section).pipe(",
    '    Match.when("Classes/Ranger.md:243-249", () => "unit-section-match"),',
    "    Match.exhaustive,",
    "  );",
    "}",
  ].join("\n");
  const nonSpellUnitViolations = findViolationsForFile(
    "packages/battle-runtime/src/battle-reducer/non-spell-unit-dispatch.ts",
    nonSpellUnitIdentityBranch,
    authoredAlternation,
    new Set(),
    new Map(),
  );
  assert(
    nonSpellUnitViolations.some(
      (violation) =>
        violation.literal === "Hunter's Prey" &&
        violation.context.kind === "switch-id-branch",
    ),
    `Self-test failed: non-spell unit.name switch branch was not caught. Got ${JSON.stringify(nonSpellUnitViolations)}`,
  );
  assert(
    nonSpellUnitViolations.some(
      (violation) =>
        violation.literal === "Hunter's Prey" &&
        violation.context.kind === "dispatch-container",
    ),
    `Self-test failed: non-spell unit.name container dispatch was not caught. Got ${JSON.stringify(nonSpellUnitViolations)}`,
  );
  assert(
    nonSpellUnitViolations.some(
      (violation) =>
        violation.literal === "Classes/Ranger.md:243-249" &&
        violation.context.kind === "effect-match-identity-branch",
    ),
    `Self-test failed: non-spell unit provenance section Match branch was not caught. Got ${JSON.stringify(nonSpellUnitViolations)}`,
  );

  const transformedSelectedOptionBranch = [
    "export function selectedOptionDispatch(selectedOption) {",
    "  return Match.value(selectedOption.optionId).pipe(",
    '    Match.when("colossusSlayer", () => "old-runtime-id-branch"),',
    "    Match.exhaustive,",
    "  );",
    "}",
  ].join("\n");
  const transformedSelectedOptionViolations = findViolationsForFile(
    "packages/battle-runtime/src/battle-reducer/selected-option-dispatch.ts",
    transformedSelectedOptionBranch,
    authoredAlternation,
    new Set(),
    new Map(),
  );
  assert(
    transformedSelectedOptionViolations.some(
      (violation) =>
        violation.literal === "colossusSlayer" &&
        violation.context.kind === "effect-match-identity-branch",
    ),
    `Self-test failed: transformed selected option authored ID branch was not caught. Got ${JSON.stringify(transformedSelectedOptionViolations)}`,
  );

  const selectedFillValueBranch = [
    "export function selectedFillValueDispatch(fill) {",
    '  if (fill.value === "push") return "old-runtime-fill-branch";',
    "  return null;",
    "}",
  ].join("\n");
  const selectedFillValueViolations = findViolationsForFile(
    "packages/battle-runtime/src/battle-reducer/selected-fill-value-dispatch.ts",
    selectedFillValueBranch,
    authoredAlternation,
    new Set(),
    new Map(),
  );
  assert(
    selectedFillValueViolations.some(
      (violation) =>
        violation.literal === "push" &&
        violation.context.kind === "id-comparison",
    ),
    `Self-test failed: generic fill.value authored ID branch was not caught. Got ${JSON.stringify(selectedFillValueViolations)}`,
  );

  const optionalSelectedValueBranch = [
    "export function optionalSelectedValueDispatch(input, fill) {",
    '  if (fill?.value === "push") return "old-optional-fill-branch";',
    "  return Match.value(input.decision?.value).pipe(",
    '    Match.when("push", () => "old-optional-decision-branch"),',
    "    Match.exhaustive,",
    "  );",
    "}",
  ].join("\n");
  const optionalSelectedValueViolations = findViolationsForFile(
    "packages/battle-runtime/src/battle-reducer/optional-selected-value-dispatch.ts",
    optionalSelectedValueBranch,
    authoredAlternation,
    new Set(),
    new Map(),
  );
  assert(
    optionalSelectedValueViolations.some(
      (violation) =>
        violation.literal === "push" &&
        violation.context.kind === "id-comparison",
    ),
    `Self-test failed: optional fill?.value authored ID branch was not caught. Got ${JSON.stringify(optionalSelectedValueViolations)}`,
  );
  assert(
    optionalSelectedValueViolations.some(
      (violation) =>
        violation.literal === "push" &&
        violation.context.kind === "effect-match-identity-branch",
    ),
    `Self-test failed: optional decision?.value authored ID branch was not caught. Got ${JSON.stringify(optionalSelectedValueViolations)}`,
  );

  const openHandDecisionBranch = [
    "export function openHandDecisionDispatch(input) {",
    "  return Match.value(input.decision.value).pipe(",
    '    Match.when("addle", () => "old-addle-branch"),',
    '    Match.when("push", () => "old-push-branch"),',
    '    Match.when("topple", () => "old-topple-branch"),',
    "    Match.exhaustive,",
    "  );",
    "}",
  ].join("\n");
  const openHandDecisionViolations = findViolationsForFile(
    "packages/battle-runtime/src/battle-reducer/open-hand-technique.ts",
    openHandDecisionBranch,
    authoredAlternation,
    new Set(),
    new Map(),
  );
  assert(
    ["addle", "push", "topple"].every((literal) =>
      openHandDecisionViolations.some(
        (violation) =>
          violation.literal === literal &&
          violation.context.kind === "effect-match-identity-branch",
      ),
    ),
    `Self-test failed: Open Hand decision.value authored choice branch was not caught. Got ${JSON.stringify(openHandDecisionViolations)}`,
  );

  const selectedIdentityProjection = [
    "export function selectedIdentityProjection(invocation) {",
    "  return {",
    "    spellId: invocation.spell.id,",
    "    label: invocation.spell.name,",
    "  };",
    "}",
  ].join("\n");

  const selectedIdentityViolations = findViolationsForFile(
    "packages/battle-runtime/src/battle-reducer/selected-identity-projection.ts",
    selectedIdentityProjection,
    authoredAlternation,
    new Set(),
    new Map(),
  );
  assert.deepEqual(
    selectedIdentityViolations,
    [],
    `Self-test failed: selected identity projection should not be a dispatch violation. Got ${JSON.stringify(selectedIdentityViolations)}`,
  );

  const battleRuntimeMbtFixtureProjection = [
    "export function fixtureProjection(usage) {",
    "  return {",
    "      // authored-id-dispatch-allow: battle-runtime-mbt-fixture-boundary",
    '    sneakAttackUsed: usage.unitId === "magic_missile",',
    "  };",
    "}",
  ].join("\n");

  const fixtureProjectionViolations = findViolationsForFile(
    "packages/battle-runtime/src/battle-runtime-mbt-driver-kit.test-support.ts",
    battleRuntimeMbtFixtureProjection,
    authoredAlternation,
    new Set(),
    new Map(),
  );
  assert.deepEqual(
    fixtureProjectionViolations,
    [],
    `Self-test failed: inline fixture-boundary allowlist should suppress only marked kit violations. Got ${JSON.stringify(fixtureProjectionViolations)}`,
  );

  const misplacedFixtureProjectionViolations = findViolationsForFile(
    "packages/battle-runtime/src/battle-reducer/runtime.ts",
    battleRuntimeMbtFixtureProjection,
    authoredAlternation,
    new Set(),
    new Map(),
  );
  assert(
    misplacedFixtureProjectionViolations.length > 0,
    "Self-test failed: inline fixture-boundary allowlist should not apply outside the driver kit.",
  );

  assert.equal(
    classifyPath(
      "packages/battle-runtime/src/unit-profile-admission-spell-fill-support.ts",
      ALLOWLIST_PATH_RULES,
    ),
    "battle-runtime-unit-profile-admission-test-support-boundary",
  );
  assert.equal(
    classifyPath(
      "packages/battle-runtime/src/unit-feature-support.ts",
      ALLOWLIST_PATH_RULES,
    ),
    null,
  );
  assert.equal(
    classifyPath(
      "packages/battle-runtime/src/battle-reducer/spells-discovery.test.ts",
      EXCLUDED_PATH_RULES,
    ),
    "test-fixture-boundary",
  );
}

function main() {
  assertBattleReplayExecutionBoundary();
  assertActPresentationGateSelfTests();
  assertBattleReplayPatternSelfTests();
  assertBattleReplayAstSelfTests();
  assertBattleReplayAstBoundary();
  assertNoReducerOwnedActPresentation();
  runSelfTest();

  if (!fs.existsSync(PACKAGES_ROOT)) {
    console.error("authored-id boundary check: packages directory not found");
    process.exit(1);
  }

  const { identityLiterals: authoredIdentityLiterals, malformedContentFiles } =
    collectAuthoredIdentityLiterals();
  if (malformedContentFiles.length > 0) {
    console.error(
      "authored-id boundary check: malformed surface content file(s):",
    );
    for (const file of malformedContentFiles) {
      console.error(`  - ${file}`);
    }
    process.exit(1);
  }

  if (authoredIdentityLiterals.size === 0) {
    console.error(
      "authored-id boundary check: no authored identity literals discovered from surface content",
    );
    process.exit(1);
  }

  const authoredAlternation = buildAuthoredAlternation(
    authoredIdentityLiterals,
  );

  const sourceFiles = listFiles(PACKAGES_ROOT)
    .map((filePath) =>
      path.relative(REPO_ROOT, filePath).replaceAll(path.sep, "/"),
    )
    .sort();

  const sourceFilesSet = new Set(sourceFiles);
  const authoredExportsByFile = buildAuthoredExportIndex(
    sourceFiles,
    sourceFilesSet,
    authoredAlternation,
  );

  const stats = {
    excluded: new Map(),
    allowlisted: new Map(),
    checked: 0,
  };

  const violations = [];

  for (const relativePath of sourceFiles) {
    const excludedReason = classifyPath(relativePath, EXCLUDED_PATH_RULES);
    if (excludedReason != null) {
      stats.excluded.set(
        excludedReason,
        (stats.excluded.get(excludedReason) ?? 0) + 1,
      );
      continue;
    }

    const allowlistReason = classifyPath(relativePath, ALLOWLIST_PATH_RULES);
    if (allowlistReason != null) {
      stats.allowlisted.set(
        allowlistReason,
        (stats.allowlisted.get(allowlistReason) ?? 0) + 1,
      );
      continue;
    }

    stats.checked += 1;
    const content = fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
    violations.push(
      ...findViolationsForFile(
        relativePath,
        content,
        authoredAlternation,
        sourceFilesSet,
        authoredExportsByFile,
      ),
    );
  }

  const uniqueViolations = dedupeViolations(violations);

  if (uniqueViolations.length > 0) {
    console.error("authored-identity dispatch boundary violation(s) found:");
    for (const violation of uniqueViolations) {
      console.error(
        `  - ${violation.relativePath}:${violation.line} dispatches on authored identity "${violation.literal}" (${violation.context.kind}: ${violation.context.detail})`,
      );
    }
    console.error("");
    console.error(
      "If this usage is a valid boundary (catalog/composition/fixture/legacy/support-profile admission), add an explicit allowlist rule in scripts/check-authored-id-dispatch-boundary.cjs.",
    );
    process.exit(1);
  }

  const excludedTotal = Array.from(stats.excluded.values()).reduce(
    (sum, count) => sum + count,
    0,
  );
  const allowlistedTotal = Array.from(stats.allowlisted.values()).reduce(
    (sum, count) => sum + count,
    0,
  );

  console.log("authored-identity dispatch boundary check passed");
  console.log(
    `authored identity literals discovered: ${authoredIdentityLiterals.size}`,
  );
  console.log(`checked source files: ${stats.checked}`);
  console.log(`excluded files: ${excludedTotal}`);
  console.log(`allowlisted files: ${allowlistedTotal}`);

  const allowlistEntries = formatCountMapEntries(stats.allowlisted);
  if (allowlistEntries.length > 0) {
    console.log("allowlist usage by boundary:");
    for (const entry of allowlistEntries) {
      console.log(`  - ${entry.reason}: ${entry.count}`);
    }
  }
}

main();
