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
  if (!isSchemaCall(expression, "Literal")) return [];
  return expression.arguments
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
    case "jumpMovementReplacement":
    case "creatureFalls":
      return "runtimeMovement";
    case "releaseReadiedSpell":
    case "releaseReadiedMovement":
      return "runtimeReadiedResponse";
    case "castTriggeredReactionSpell":
    case "castAttackHitBonusActionSpell":
    case "opportunityAttack":
      return "runtimeReaction";
    case "releaseGrapple":
      return "runtimeLinkRelease";
    case "greaseGroundHazardSave":
    case "webRestraintSave":
    case "sleetStormAreaHazardSave":
    case "gustOfWindLineSave":
    case "movableZoneSave":
    case "moonbeamCylinderExit":
      return "runtimeSavingThrow";
    case "webRestrainedNoLongerInArea":
    case "webAreaRemoved":
    case "disperseFogCloud":
    case "wardingBondSeparation":
    case "endConcentration":
      return "runtimeEffectCleanup";
    case "gustOfWindLineDirectionChange":
    case "movableZoneReposition":
    case "movableZoneRam":
      return "runtimeEffectControl";
    case "releaseSpellCreatedHeldObject":
      return "runtimeHeldObjectRelease";
    case "protectionRelevantEffectSave":
      return "runtimeProtectionSave";
    case "replaceSelfTransformationMode":
      return "runtimeTransformationMode";
    case "commandGrovel":
    case "commandDrop":
    case "commandApproach":
    case "commandFlee":
      return "runtimeCompelledAction";
    case "levitateAltitudeControl":
      return "runtimeAltitudeControl";
    case "dragonsBreathExhale":
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
        case "shakeAwakeFromSleep":
        case "shakeAwakeFromHypnoticPattern":
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
    case "findFamiliarTouchSpell":
      switch (discriminatorValue) {
        case "action":
        case "bonusAction":
          return "companionDeliveredMagic";
        default:
          return unknownSubjectKind(tag, discriminatorValue);
      }
    case "pactOfTheChainFamiliarAttack":
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
    case "findFamiliarSharedSenses":
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
    case "findFamiliarTouchSpell":
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
  function collectStruct(callExpression) {
    if (!isSchemaCall(callExpression, "Struct")) return;
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
  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      node.name.getText(sourceFile) === "BattleSubjectSchema"
    ) {
      function visitSchema(schemaNode) {
        if (ts.isCallExpression(schemaNode)) collectStruct(schemaNode);
        ts.forEachChild(schemaNode, visitSchema);
      }
      if (node.initializer !== undefined) visitSchema(node.initializer);
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
