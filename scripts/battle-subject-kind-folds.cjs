const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function camelCaseToPascalCase(value) {
  return value.length === 0
    ? value
    : `${value[0].toUpperCase()}${value.slice(1)}`;
}

function isSchemaCall(node, name) {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === "Schema" &&
    node.expression.name.text === name
  );
}

function propertyAssignment(objectLiteral, propertyName) {
  return objectLiteral.properties.find(
    (property) =>
      ts.isPropertyAssignment(property) &&
      ts.isIdentifier(property.name) &&
      property.name.text === propertyName,
  );
}

function schemaLiteralStrings(expression) {
  if (
    !isSchemaCall(expression, "Literal") &&
    !isSchemaCall(expression, "Literals")
  ) {
    return [];
  }
  const literalArguments = expression.arguments.flatMap((argument) =>
    ts.isArrayLiteralExpression(argument) ? argument.elements : [argument],
  );
  return literalArguments
    .filter((argument) => ts.isStringLiteral(argument))
    .map((argument) => argument.text);
}

function schemaLiteralPropertyStrings(objectLiteral, propertyName) {
  const property = propertyAssignment(objectLiteral, propertyName);
  return property === undefined
    ? []
    : schemaLiteralStrings(property.initializer);
}

function unknownSubjectKind(tag, discriminatorValue) {
  return discriminatorValue === undefined
    ? tag
    : `${tag}${camelCaseToPascalCase(discriminatorValue)}`;
}

function runtimeCommandSubjectKind(discriminatorValue) {
  switch (discriminatorValue) {
    case "endTurn":
      return "runtimeTurnBoundary";
    case "move":
    case "standFromProne":
    case "fixedCostMovementReplacement":
    case "creatureFalls":
      return "runtimeMovement";
    case "releaseReadiedSpell":
    case "releaseReadiedMovement":
      return "runtimeReadiedResponse";
    case "castTriggeredReactionSpell":
    case "castAttackHitBonusActionSpell":
    case "opportunityAttack":
    case "releaseReadiedAction":
    case "releaseReadiedAttack":
      return "runtimeReaction";
    case "retaliationAttack":
      return "runtimeCommandRetaliationAttack";
    case "reportReadyTrigger":
      return "runtimeTableDecision";
    case "releaseGrapple":
      return "runtimeLinkRelease";
    case "persistentAreaSaveConditionSave":
    case "persistentAreaSaveConditionEscapeSave":
    case "persistentAreaSaveCompositeSave":
    case "persistentAreaSaveDamageSave":
    case "directionalPersistentAreaSave":
    case "movableZoneSave":
    case "persistentAreaSaveDamageExit":
      return "runtimeSavingThrow";
    case "endPersistentAreaSaveConditionEscapeForDeparture":
    case "endPersistentAreaSaveConditionEscapeForAreaRemoval":
    case "endPersistentAreaTraitForEnvironment":
    case "endPersistentAreaSaveDamageForEnvironment":
    case "linkedDefenseResistanceDamageShareSeparation":
    case "endConcentration":
      return "runtimeEffectCleanup";
    case "directionalPersistentAreaDirectionChange":
    case "movableZoneReposition":
    case "movableZoneRam":
      return "runtimeEffectControl";
    case "releaseSpellCreatedHeldObject":
      return "runtimeHeldObjectRelease";
    case "protectionRelevantEffectSave":
      return "runtimeProtectionSave";
    case "creatureTypeProtectionConditionAttempt":
    case "creatureTypeProtectionPossessionAttempt":
      return "runtimeProtectionPrevention";
    case "replaceSelfTransformationMode":
      return "runtimeTransformationMode";
    case "executeCompelledGrovel":
    case "executeCompelledDrop":
    case "executeCompelledApproach":
    case "executeCompelledFlee":
      return "runtimeCompelledAction";
    case "controlledVerticalSuspensionAltitudeControl":
      return "runtimeAltitudeControl";
    case "grantedAreaSaveDamageAction":
      return "runtimeAreaEffect";
    default:
      return unknownSubjectKind("runtimeCommand", discriminatorValue);
  }
}

function subjectKindFromDiscriminators(tag, discriminator, discriminatorValue) {
  switch (tag) {
    case "action":
      switch (discriminatorValue) {
        case "attack":
        case "multiattack":
          return "actionAttack";
        case "dash":
          return "actionMovement";
        case "disengage":
        case "dodge":
          return "actionAvoidance";
        case "helpAttack":
          return "actionSupport";
        case "hide":
        case "search":
          return "actionExploration";
        case "ready":
          return "actionReady";
        case "grapple":
        case "shove":
        case "escapeGrapple":
        case "escapeSpellRestraint":
          return "actionContest";
        case "shakeAwakeFromStagedCondition":
        case "shakeAwakeFromAreaControl":
          return "actionConditionIntervention";
        default:
          return unknownSubjectKind(tag, discriminatorValue);
      }
    case "bonusAction":
      switch (discriminatorValue) {
        case "offHandAttack":
        case "martialArtsUnarmedStrike":
        case "statBlockActionOption":
          return "bonusActionAttack";
        default:
          return unknownSubjectKind(tag, discriminatorValue);
      }
    case "bonusActionStandardAction":
      switch (discriminatorValue) {
        case "dash":
        case "disengage":
        case "hide":
          return "bonusActionGrantedStandardAction";
        default:
          return unknownSubjectKind(tag, discriminatorValue);
      }
    case "monkFocusOption":
      switch (discriminatorValue) {
        case "flurryOfBlows":
        case "patientDefense":
        case "stepOfTheWind":
          return "featureOption";
        default:
          return unknownSubjectKind(tag, discriminatorValue);
      }
    case "druidWildShape":
      switch (discriminatorValue) {
        case "assumeForm":
        case "dismiss":
          return "formTransformation";
        default:
          return unknownSubjectKind(tag, discriminatorValue);
      }
    case "companionLifecycle":
      switch (discriminatorValue) {
        case "temporarilyDismiss":
        case "reappear":
        case "permanentlyDismiss":
          return "companionLifecycle";
        default:
          return unknownSubjectKind(tag, discriminatorValue);
      }
    case "runtimeCommand":
      return runtimeCommandSubjectKind(discriminatorValue);
    case "spawnedCompanionTouchSpellProxy":
      switch (discriminatorValue) {
        case "action":
        case "bonusAction":
          return "companionDeliveredMagic";
        default:
          return unknownSubjectKind(tag, discriminatorValue);
      }
    case "companionAttack":
      return "companionAttack";
    case "monkFocusFlurryOfBlowsStrike":
      return "featureAttack";
    case "actionSpell":
      return "actionMagic";
    case "bonusActionSpell":
      return "bonusActionMagic";
    case "bonusActionDashSpell":
      return "spellGrantedMovement";
    case "unitFeature":
      return "featureActivation";
    case "unitFeatureHeldWeaponActivation":
      return "featureWeaponActivation";
    case "spawnedCompanionSharedSenses":
      return "companionSenses";
    default:
      return tag;
  }
}

function battleSubjectKindDiscriminator(tag) {
  switch (tag) {
    case "action":
    case "bonusAction":
    case "bonusActionStandardAction":
    case "druidWildShape":
    case "companionLifecycle":
      return "action";
    case "monkFocusOption":
      return "option";
    case "runtimeCommand":
      return "command";
    case "spawnedCompanionTouchSpellProxy":
      return "spellAction";
    default:
      return undefined;
  }
}

function dedupeSubjectKindCases(cases) {
  const seen = new Set();
  return cases.filter((subjectKindCase) => {
    const key = JSON.stringify(subjectKindCase);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractBattleSubjectKindCases(rootPath) {
  const battleSubjectsPath = path.join(
    rootPath,
    "packages",
    "battle-runtime",
    "src",
    "battle-subjects.ts",
  );
  const text = fs.readFileSync(battleSubjectsPath, "utf8");
  const sourceFile = ts.createSourceFile(
    battleSubjectsPath,
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  const cases = [];
  const schemaBindings = new Map();
  function collectSchemaBindings(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer !== undefined
    ) {
      schemaBindings.set(node.name.text, node.initializer);
    }
    ts.forEachChild(node, collectSchemaBindings);
  }
  collectSchemaBindings(sourceFile);

  function collectStruct(callExpression) {
    const isStruct = isSchemaCall(callExpression, "Struct");
    const isInterruptSelection =
      ts.isIdentifier(callExpression.expression) &&
      callExpression.expression.text ===
        "battleInterruptAttackExecutionSelectionWithFields";
    if (!isStruct && !isInterruptSelection) return;
    const [shape] = callExpression.arguments;
    if (!ts.isObjectLiteralExpression(shape)) return;
    const tags = schemaLiteralPropertyStrings(shape, "tag");
    if (tags.length !== 1 || tags[0] === "cast") return;
    const tag = tags[0];
    const discriminator = battleSubjectKindDiscriminator(tag);
    if (discriminator === undefined) {
      cases.push({
        tag,
        subjectKind: subjectKindFromDiscriminators(tag, undefined, undefined),
      });
      return;
    }
    const discriminatorValues = schemaLiteralPropertyStrings(
      shape,
      discriminator,
    );
    for (const discriminatorValue of discriminatorValues) {
      cases.push({
        tag,
        discriminator,
        discriminatorValue,
        subjectKind: subjectKindFromDiscriminators(
          tag,
          discriminator,
          discriminatorValue,
        ),
      });
    }
  }
  function visitSchema(node, resolvingBindings) {
    if (ts.isArrayLiteralExpression(node)) {
      for (const element of node.elements) {
        visitSchema(element, resolvingBindings);
      }
      return;
    }
    if (ts.isIdentifier(node)) {
      const binding = schemaBindings.get(node.text);
      if (binding === undefined || resolvingBindings.has(node.text)) return;
      resolvingBindings.add(node.text);
      visitSchema(binding, resolvingBindings);
      resolvingBindings.delete(node.text);
      return;
    }
    if (ts.isArrayLiteralExpression(node)) {
      for (const element of node.elements) {
        visitSchema(element, resolvingBindings);
      }
      return;
    }
    if (!ts.isCallExpression(node)) return;
    if (
      isSchemaCall(node, "Struct") ||
      (ts.isIdentifier(node.expression) &&
        node.expression.text ===
          "battleInterruptAttackExecutionSelectionWithFields")
    ) {
      collectStruct(node);
      return;
    }
    if (isSchemaCall(node, "Union")) {
      for (const argument of node.arguments) {
        visitSchema(argument, resolvingBindings);
      }
      return;
    }
    if (isSchemaCall(node, "extend")) {
      const [base] = node.arguments;
      if (base !== undefined) visitSchema(base, resolvingBindings);
    }
  }
  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      node.name.getText(sourceFile) === "BattleSubjectSchema"
    ) {
      if (node.initializer !== undefined) {
        visitSchema(node.initializer, new Set());
      }
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return dedupeSubjectKindCases(cases);
}

function extractBattleSubjectKinds(rootPath) {
  return new Set(
    extractBattleSubjectKindCases(rootPath).map(
      (subjectKindCase) => subjectKindCase.subjectKind,
    ),
  );
}

module.exports = {
  extractBattleSubjectKindCases,
  extractBattleSubjectKinds,
};
