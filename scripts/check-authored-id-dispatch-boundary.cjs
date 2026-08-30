#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const ts = require("typescript");
const {
  battleRuntimeExecutionImportClosure,
  battleRuntimePublicExportOwnerFiles,
} = require("./check-battle-runtime-import-ownership.cjs");

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
    reason: "character-creation-support-profile-boundary",
    pattern:
      /^packages\/character-creation-runtime\/src\/(?:phase1-manifest|support-gates)\.ts$/,
  },
  {
    reason: "character-sheet-retained-companion-support-admission-boundary",
    pattern: /^packages\/character-sheet-runtime\/src\/companions\.ts$/,
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
  /kind:\s*Schema\.Literal\("spellTargetList"\)[\s\S]{0,160}procedure:(?!\s*(?:Schema\.optionalWith\(Schema\.Never|Schema\.optionalKey\(Schema\.Never\)))/;
const REDUNDANT_SPELL_TARGET_LIST_TYPE_PROCEDURE_PATTERN =
  /type BattleSpellTargetListHole[\s\S]{0,500}\bprocedure:/;
const POSITIONAL_DAMAGE_DIE_REROLL_FIELD_PATTERN =
  /type BattleSpellDamageDieReroll[\s\S]{0,300}\b(?:dieRef|groupOrdinal|dieOrdinal):/;
const GENERIC_SPELL_EXECUTION_PROJECTION_PATTERN = /\b(?:Omit|Pick)</;
const SHALLOW_UNIT_EXECUTION_PROJECTION_PATTERN =
  /([A-Za-z_$][\w$]*) extends SupportedUnitFeatureProfile\s*\?\s*Omit<\1,\s*"unit">/;

const EXECUTION_IDENTITY_ROLE_FIELDS = new Set([
  "action",
  "checkpoint",
  "checkpointKind",
  "command",
  "effectKind",
  "fillKind",
  "holeKind",
  "kind",
  "procedure",
  "protocolKind",
  "tag",
]);
const EXECUTION_IDENTITY_ARRAY_NAME_PATTERN =
  /(?:ACTION|CHECKPOINT|COMMAND|EFFECT|FILL|HOLE|KIND|PROCEDURE|PROTOCOL|REGISTRY|SUBJECT|TAG)(?:S|_KINDS|_KEYS|_REGISTRY)?$/i;
const EXECUTION_DECLARATION_NAME_PATTERN =
  /(?:Checkpoint|Command|Effect|Execution|Fill|Hole|Invocation|Procedure|Profile|Protocol|Registry|Route|Schema|Subject|Template)/;
const EXECUTION_PROTOCOL_DECLARATION_NAME_PATTERN =
  /_(?:HOLE_ID|HOLE_INSTANCE|HOLE_INSTANCE_PREFIX)$/;
const EXECUTION_DIAGNOSTIC_CALL_PATTERN =
  /(?:^|\.)(?:fail|failure|invalid|invalidResult|invalidWitness|issue|error|validation|validate)$/i;
const EXECUTION_DIAGNOSTIC_FIELDS = new Set([
  "detail",
  "label",
  "message",
  "reason",
  "summary",
]);
const EXECUTION_IDENTITY_BOUNDARIES = [
  {
    reason: "surface-authored-content-boundary",
    pattern: /^packages\/surface\/(?:content|src\/surface)\//,
  },
  {
    reason: "battle-procedure-admission-boundary",
    pattern:
      /^packages\/battle-runtime\/src\/(?:procedure-admission\/|character-execution-admission\.ts$|battle-composition-admission\.ts$|character-battle-resources\.ts$|unit-feature-support\.ts$)/,
  },
  {
    reason: "battle-presentation-boundary",
    pattern:
      /^packages\/battle-runtime\/src\/(?:battle-act-composition\.ts$|stat-block-presentation\.ts$|battle-snapshot-presentation\.ts$)/,
  },
  {
    reason: "registered-proof-instantiation-boundary",
    pattern: /\.(?:mbt\.)?qnt$/,
  },
];

// These are mechanics words which happen to be complete authored spell names.
// Each semantic exemption is an exact AST role + identifier collision. The
// finite site-count certificate below additionally binds those collisions to
// their reviewed source paths, normalized owning statements, and cardinalities.
// A new occurrence therefore fails even when it copies an otherwise legitimate
// identifier.
function exactCollision(spellId, identifier, roles, reason) {
  return roles.map((role) => ({ spellId, role, identifier, reason }));
}

const DISCRIMINANT_ROLES = [
  "discriminant-literal",
  "protocol-array-member",
  "registry-key",
  "schema-discriminant-literal",
];

const EXECUTION_IDENTITY_COLLISION_EXEMPTIONS = [
  ...exactCollision(
    "command",
    "runtimeCommand",
    DISCRIMINANT_ROLES,
    "command is the runtime protocol category",
  ),
  ...exactCollision(
    "command",
    "command",
    ["registry-key"],
    "command is the discriminant field name",
  ),
  ...exactCollision(
    "darkness",
    "magicalDarknessPointOrigin",
    DISCRIMINANT_ROLES,
    "darkness is a visibility trait projected from generic area facts",
  ),
  ...exactCollision(
    "fly",
    "fly",
    ["protocol-array-member"],
    "fly is a movement mode",
  ),
  ...exactCollision(
    "knock",
    "knockOut",
    ["discriminant-literal"],
    "knock out is the zero-hit-point combat choice",
  ),
  ...["heldLight", "heldLightHurl", "objectLight"].flatMap((identifier) =>
    exactCollision(
      "light",
      identifier,
      DISCRIMINANT_ROLES,
      "light is an illumination or weapon-property mechanic",
    ),
  ),
  ...exactCollision(
    "light",
    "lightEmission",
    ["discriminant-literal", "schema-discriminant-literal"],
    "light is an illumination mechanic",
  ),
  ...exactCollision(
    "light",
    "lightEmitter",
    ["discriminant-literal"],
    "light is an illumination mechanic",
  ),
  ...exactCollision(
    "light",
    "spellLightEmitter",
    ["discriminant-literal"],
    "light is an illumination mechanic",
  ),
  ...exactCollision(
    "resistance",
    "chosenDamageResistance",
    DISCRIMINANT_ROLES,
    "resistance is a damage relationship",
  ),
  ...exactCollision(
    "resistance",
    "damageResistance",
    [
      "discriminant-literal",
      "protocol-array-member",
      "schema-discriminant-literal",
    ],
    "resistance is a damage relationship",
  ),
  ...exactCollision(
    "shield",
    "shield",
    ["discriminant-literal", "protocol-array-member"],
    "shield is an equipment category",
  ),
  ...exactCollision(
    "sleep",
    "doesNotSleep",
    ["discriminant-literal", "schema-discriminant-literal"],
    "sleep is a creature-state predicate",
  ),
  ...exactCollision(
    "command",
    "command",
    ["protocol-array-member"],
    "command is the generic runtime protocol category",
  ),
  ...exactCollision(
    "darkvision",
    "darkvision",
    ["discriminant-literal"],
    "darkvision is a creature sense",
  ),
  ...exactCollision(
    "sleep",
    "does_not_sleep",
    ["discriminant-literal"],
    "sleep is a creature-state predicate",
  ),
  ...[
    "AttackHitBonusActionSpellCommandInput",
    "AttackHitBonusActionSpellCommandSubject",
    "BattleRuntimeCommand",
    "CompelledBehaviorFollowUpCommand",
    "PersistentSpatialSpellProcedureCommand",
    "ReactionAttackCommandContext",
    "RuntimeCommandSubject",
  ].flatMap((identifier) =>
    exactCollision(
      "command",
      identifier,
      ["declaration-identifier"],
      "command names the generic runtime request protocol",
    ),
  ),
  ...[
    "MagicalDarknessPointOriginProfileShape",
    "MagicalDarknessPointOriginSpellInvocation",
    "MagicalDarknessPointOriginSpellProcedureExecution",
    "magicalDarknessPointOriginProfile",
  ].flatMap((identifier) =>
    exactCollision(
      "darkness",
      identifier,
      ["declaration-identifier"],
      "darkness is the projected visibility mechanic",
    ),
  ),
  ...exactCollision(
    "darkness",
    "magicalDarknessArea",
    ["discriminant-literal"],
    "darkness is the projected visibility mechanic",
  ),
  ...exactCollision(
    "darkness",
    "spellMagicalDarknessZone",
    ["discriminant-literal"],
    "darkness is the projected visibility mechanic",
  ),
  ...exactCollision(
    "darkness",
    "magical-darkness-point-origin",
    ["execution-filename"],
    "darkness is the projected visibility mechanic",
  ),
  ...[
    "AllocatedStoredLightEmitterForTemplate",
    "BattleLightEmitterOpaqueCoverInteraction",
    "BattleMovableLightPlacementHole",
    "BattleStoredLightEmitterTemplate",
    "CombinedMovableLightManifestationSpellProcedureExecution",
    "ExecutableMovableLightCastInvocation",
    "ExecutableMovableLightManifestationInvocation",
    "ExecutableMovableLightRepositionInvocation",
    "HeldLightHurlInvocation",
    "HeldLightHurlSpellInvocation",
    "HeldLightHurlSpellProcedureExecution",
    "HeldLightInvocation",
    "HeldLightSpellInvocation",
    "HeldLightSpellProcedureExecution",
    "LightExtraAttackDamageAbilityModifierProcedureExecutionSchema",
    "MovableLightActiveEffect",
    "MovableLightCastInvocation",
    "MovableLightCombinedCastInvocation",
    "MovableLightEffect",
    "MovableLightEffectShape",
    "MovableLightManifestationSpellInvocation",
    "MovableLightRepositionInvocation",
    "MovableLightSeparateCastInvocation",
    "MovableLightSpellProfile",
    "ObjectLightClassCantripSpellProcedureExecution",
    "ObjectLightInvocation",
    "ObjectLightPreparedSpellProcedureExecution",
    "ObjectLightSpellInvocation",
    "ObjectLightSpellInvocationBase",
    "RepositionMovableLightManifestationSpellProcedureExecution",
    "SeparateMovableLightManifestationSpellProcedureExecution",
    "heldLightHurlProfile",
    "heldLightProfile",
    "movableLightManifestationProfile",
    "objectLightProfile",
  ].flatMap((identifier) =>
    exactCollision(
      "light",
      identifier,
      ["declaration-identifier"],
      "light names an illumination or weapon-property mechanic",
    ),
  ),
  ...["emit_light", "movableLightManifestation"].flatMap((identifier) =>
    exactCollision(
      "light",
      identifier,
      [
        "discriminant-literal",
        "protocol-array-member",
        ...(identifier === "emit_light"
          ? []
          : ["registry-key", "schema-discriminant-literal"]),
      ],
      "light names an illumination mechanic",
    ),
  ),
  ...[
    "BattleLightEmitterAttachmentSchema",
    "BattleLightEmitterEndOfTurnExpirationSchema",
    "BattleLightEmitterSchema",
    "BattleMovableLightCastPlacementSchema",
    "BattleMovableLightPlacementValueSchema",
    "BattleMovableLightRepositionPlacementSchema",
    "BattleObjectInvisibleRevealLightEmitterFacts",
    "BattleProjectedObjectInvisibleRevealLightEmitterSchema",
    "BattleProjectedSpellLightEmitterFields",
    "BattleProjectedSpellLightEmitterSchema",
    "BattleSpellLightEmitterFacts",
    "BattleSpellLightEmitterMechanicalFields",
    "BattleSpellLightEmitterVariantFacts",
    "BattleStoredLightEmitterSchema",
    "BattleStoredObjectInvisibleRevealLightEmitterSchema",
    "BattleStoredSpellLightEmitterFields",
    "BattleStoredSpellLightEmitterSchema",
    "BattleTrackedOngoingSpellLightEmitterFacts",
    "EncodedBattleStoredLightEmitter",
    "ExecutableMovableLightCastResolveInput",
    "ExecutableMovableLightRepositionResolveInput",
    "HeldLightHurlInvocationSchema",
    "HeldLightHurlResolveInput",
    "HeldLightInvocationSchema",
    "LIGHT_EXTRA_ATTACK_DAMAGE_ABILITY_MODIFIER_SUPPORT_PROFILE",
    "LIGHT_OBJECT_MAX_SIZE",
    "LightCantripObjectLightDirectPhase",
    "LightCantripObjectTargetFact",
    "MOVABLE_LIGHT_DIM_LIGHT_RADIUS_FEET",
    "MOVABLE_LIGHT_DURATION_MINUTES",
    "MOVABLE_LIGHT_RANGE_FEET",
    "MOVABLE_LIGHT_REPOSITION_MAX_FEET",
    "MOVABLE_LIGHT_SPACING_FEET",
    "MovableLightCastResolveInput",
    "MovableLightCombinedCastInvocationSchema",
    "MovableLightExpirationSchema",
    "MovableLightRepositionInvocationSchema",
    "MovableLightRepositionResolveInput",
    "MovableLightSeparateCastInvocationSchema",
    "OBJECT_LIGHT_TARGET_FACT_KINDS",
    "ObjectLightInvocationSchema",
    "ObjectLightSpellCantripSource",
    "ObjectLightSpellSlotSource",
    "ObjectLightSpellSource",
    "ObjectLightTargetSize",
    "RAM_MOVABLE_PERSISTENT_AREA_LIGHT_BRIGHT_RADIUS_FEET",
    "RAM_MOVABLE_PERSISTENT_AREA_LIGHT_DIM_ADDITIONAL_FEET",
    "SerializedLightEmitterSource",
    "SpellCreatedHeldObjectLightOperation",
    "SpellLightEmitterTargetAttachment",
    "TouchedObjectLightDirectPhase",
    "activeLightIds",
    "admitCantripObjectLight",
    "admitHeldLight",
    "admitMovableLightCombinedCast",
    "admitMovableLightSeparateCast",
    "admitObjectLight",
    "admitPreparedObjectLight",
    "battleMovableLightId",
    "boundCombatantIlluminationLightEmitter",
    "boundObjectIlluminationLightEmitter",
    "currentMovableLightIds",
    "dimLightOperation",
    "discoverHeldLightCastAct",
    "discoverHeldLightHurlCastAct",
    "discoverMovableLightCastAct",
    "discoverMovableLightRepositionAct",
    "discoverObjectLightCastAct",
    "dispelledLightEffectRefs",
    "dispelledSpellCreatedLightMaxSpellLevel",
    "heldLight",
    "heldLightHurl",
    "isExecutableMovableLightCastResolveInput",
    "isExecutableMovableLightRepositionResolveInput",
    "isLightObjectSpell",
    "isObjectLightDirectPhase",
    "isSpellLightEmissionPostDamageRider",
    "isTouchedObjectLightDirectPhase",
    "light",
    "lightAttachment",
    "lightEffect",
    "lightEffects",
    "lightEmitterAttachmentMatchesTarget",
    "lightEmitterFromPostDamageRider",
    "lightEmitterMatchesTarget",
    "lightEmitterOpaqueCoverBlocksEmission",
    "lightEmitterRefs",
    "lightEmitters",
    "lightEmittersAfterDurationTick",
    "lightEmittersAfterEndEffects",
    "lightFact",
    "lightId",
    "lightOperation",
    "lightOperations",
    "lightPhase",
    "lightPropertyAbilityChoice",
    "lightPropertyAlternateAbilityChoices",
    "lightPropertyAttackDamageAbilityModifierChoice",
    "lightPropertyAttackDamageAbilityModifierChoiceForAbilityChoice",
    "lightPropertyDamageAbilityModifier",
    "lightPropertyDamageAbilityModifierForAbilityChoice",
    "lightPropertyDamageAbilityModifierForAttack",
    "lightPropertyOffHand",
    "lightRiders",
    "lightWeaponAttackMade",
    "movableLight",
    "movableLightCantripBase",
    "movableLightCastPlacementPlan",
    "movableLightManifestation",
    "movableLightPlacement",
    "movableLightRepositionPlacementPlan",
    "movableLightSeparatePlacementError",
    "movableLightSpell",
    "objectInvisibleRevealLightEmitterWasAdded",
    "objectLight",
    "objectLightEmitterDeniesInvisibleBenefit",
    "objectLightTargetFactKinds",
    "outlineLightEmitters",
    "paladinSacredWeaponLightEmitters",
    "placedLightIds",
    "priorLightAttack",
    "projectBoundIlluminationLightEmitter",
    "projectStoredLightEmitter",
    "resolveHeldLight",
    "resolveHeldLightHurl",
    "resolveMovableLightCast",
    "resolveMovableLightReposition",
    "resolveObjectLight",
    "serializedLightEmitterOwnsSource",
    "serializedLightEmitterSource",
    "sourceHeldLightProcedureRef",
    "spellCreatedLightOverlaps",
    "spellLightEmitterMatchesOngoingTarget",
    "storedLightEmitters",
  ].flatMap((identifier) =>
    exactCollision(
      "light",
      identifier,
      ["declaration-identifier"],
      "light names the illumination or weapon-property mechanic",
    ),
  ),
  ...[
    "MagicalDarknessPointOriginInvocationSchema",
    "MagicalDarknessPointOriginResolveInput",
    "admitMagicalDarknessPointOrigin",
    "magicalDarknessAreaChoiceInvalidReason",
    "magicalDarknessPointOrigin",
    "magicalDarknessPointOriginSpell",
    "resolveMagicalDarknessPointOrigin",
  ].flatMap((identifier) =>
    exactCollision(
      "darkness",
      identifier,
      ["declaration-identifier"],
      "darkness names the magical obscurement mechanic",
    ),
  ),
  ...[
    "movableLight",
    "movableLightPlacement",
    "objectInvisibleRevealLightEmitter",
    "spellCreatedLightOverlapsArea",
    "spellDistantObjectLightTarget",
    "spellLightEmitter",
    "spellObjectLightTarget",
    "unitFeatureLightEmitter",
  ].flatMap((identifier) =>
    exactCollision(
      "light",
      identifier,
      ["schema-discriminant-literal"],
      "light names the illumination mechanic",
    ),
  ),
  ...[
    "objectInvisibleRevealLightEmitter",
    "spellLightEmitter",
    "storedLightEmitter",
    "unitFeatureLightEmitter",
  ].flatMap((identifier) =>
    exactCollision(
      "light",
      identifier,
      ["registry-key"],
      "light names the illumination mechanic",
    ),
  ),
  ...exactCollision(
    "light",
    "movableLightPlacement",
    ["protocol-array-member"],
    "light names the illumination mechanic",
  ),
  ...["magicalDarknessArea", "spellMagicalDarknessZone"].flatMap((identifier) =>
    exactCollision(
      "darkness",
      identifier,
      ["schema-discriminant-literal"],
      "darkness names the magical obscurement mechanic",
    ),
  ),
  ...exactCollision(
    "darkness",
    "spellMagicalDarknessZone",
    ["registry-key"],
    "darkness names the magical obscurement mechanic",
  ),
  ...exactCollision(
    "light",
    "movableLightPlacement",
    ["discriminant-literal", "registry-key"],
    "light names an illumination mechanic",
  ),
  ...exactCollision(
    "light",
    "movableLight",
    ["discriminant-literal"],
    "light names an illumination mechanic",
  ),
  ...exactCollision(
    "light",
    "nonmagicalLightInArea",
    ["discriminant-literal"],
    "light names an illumination mechanic",
  ),
  ...["objectInvisibleRevealLightEmitter", "unitFeatureLightEmitter"].flatMap(
    (identifier) =>
      exactCollision(
        "light",
        identifier,
        ["discriminant-literal"],
        "light names an illumination mechanic",
      ),
  ),
  ...exactCollision(
    "light",
    "spellCreatedLightOverlapsArea",
    ["discriminant-literal"],
    "light names an illumination mechanic",
  ),
  ...["spellDistantObjectLightTarget", "spellObjectLightTarget"].flatMap(
    (identifier) =>
      exactCollision(
        "light",
        identifier,
        ["discriminant-literal", "protocol-array-member"],
        "light names an illumination mechanic",
      ),
  ),
  ...exactCollision(
    "light",
    "storedLightEmitter",
    ["discriminant-literal"],
    "light names an illumination mechanic",
  ),
  ...exactCollision(
    "light",
    "lightCantripObject",
    ["discriminant-literal", "schema-discriminant-literal"],
    "light names the object-illumination execution shape",
  ),
  ...exactCollision(
    "light",
    "lightExtraAttackDamageAbilityModifier",
    ["schema-discriminant-literal"],
    "light names the weapon-property mechanic",
  ),
  ...exactCollision(
    "light",
    "weaponWithLightProperty",
    ["schema-discriminant-literal"],
    "light names the weapon-property mechanic",
  ),
  ...["held-light", "held-light-hurl", "object-light"].flatMap((identifier) =>
    exactCollision(
      "light",
      identifier,
      ["execution-filename"],
      "light names an illumination mechanic",
    ),
  ),
  ...[
    "Light Property Bonus Action Attack",
    "movable-light manifestation placement does not match this spell act.",
    "movable-light manifestation placement must use the selected spell act placement hole.",
    "movable-light manifestation placement was filled twice.",
  ].flatMap((identifier) =>
    exactCollision(
      "light",
      identifier,
      ["execution-diagnostic"],
      "light names an illumination or weapon-property mechanic",
    ),
  ),
  ...[
    "ChosenDamageResistanceInvocationSchema",
    "ChosenDamageResistanceSpellInvocation",
    "ChosenDamageResistanceSpellProcedureExecution",
    "LinkedDefenseResistanceDamageShareEffect",
    "LinkedDefenseResistanceDamageShareSpellInvocation",
    "LinkedDefenseResistanceDamageShareSpellProcedureExecution",
    "LinkedDefenseResistanceDamageShareTemplate",
    "LinkedDefenseResistanceDamageShareTemplateSchema",
    "PassiveDamageResistanceProcedureExecutionSchema",
    "chosenDamageResistanceProfile",
    "linkedDefenseResistanceDamageShareProfile",
  ].flatMap((identifier) =>
    exactCollision(
      "resistance",
      identifier,
      ["declaration-identifier"],
      "resistance names a damage relationship mechanic",
    ),
  ),
  ...[
    "linkedDefenseResistanceDamageShare",
    "linkedDefenseResistanceDamageShareSeparation",
  ].flatMap((identifier) =>
    exactCollision(
      "resistance",
      identifier,
      DISCRIMINANT_ROLES,
      "resistance names a damage relationship mechanic",
    ),
  ),
  ...exactCollision(
    "resistance",
    "passiveDamageResistance",
    ["schema-discriminant-literal"],
    "resistance names a damage relationship mechanic",
  ),
  ...exactCollision(
    "resistance",
    "chosen-damage-resistance",
    ["execution-filename"],
    "resistance names a damage relationship mechanic",
  ),
  ...exactCollision(
    "resistance",
    "Resistance damage reduction (1d4)",
    ["execution-diagnostic"],
    "resistance names a damage relationship mechanic",
  ),
  ...exactCollision(
    "fly",
    "Druid Wild Shape battle forms cannot have a Fly Speed at this Druid level.",
    ["execution-diagnostic"],
    "Fly Speed is a creature movement mode and Wild Shape admission fact",
  ),
  ...exactCollision(
    "shield",
    "Character battle loadout cannot wield shield and off-hand weapon.",
    ["execution-diagnostic"],
    "shield is an equipment category",
  ),
  ...[
    "runtimeCommandSubjectKind",
    "resolveControlledVerticalSuspensionAltitudeControlCommand",
    "resolveReplaceSelfTransformationModeCommand",
    "resolveCastAttackHitBonusActionSpellCommand",
    "resolveReleaseGrappleCommand",
    "resolveExecuteCompelledGrovelCommand",
    "resolveExecuteCompelledDropCommand",
    "resolveCompelledApproachCommand",
    "resolveCompelledFleeCommand",
    "resolveEndConcentrationCommand",
    "resolveGrantedAreaSaveDamageActionCommand",
    "runtimeCommandSubjectSpendsMagicAction",
    "resolveMoveCommand",
    "resolveFixedCostMovementReplacementCommand",
    "resolveStandFromProneCommand",
    "resolveOpportunityAttackCommand",
    "resolveReactionAttackCommand",
    "resolvePersistentSpatialSpellProcedureCommand",
    "resolvePersistentAreaSaveConditionSaveCommand",
    "resolvePersistentAreaSaveConditionEntrySaveCommand",
    "resolvePersistentAreaSaveConditionEscapeSaveCommand",
    "resolvePersistentAreaSaveCompositeSaveCommand",
    "resolvePersistentAreaSaveDamageCommand",
    "resolvePersistentAreaSaveConditionEscapeRestrainedNoLongerInAreaCommand",
    "resolvePersistentAreaSaveConditionEscapeAreaRemovedCommand",
    "resolveDirectionalPersistentAreaSaveCommand",
    "resolveDirectionalPersistentAreaDirectionChangeCommand",
    "resolveRamMovablePersistentAreaSaveCommand",
    "resolveRamMovablePersistentAreaRepositionCommand",
    "resolveRamMovablePersistentAreaRamCommand",
    "resolveMovablePersistentAreaSaveCommand",
    "resolveMovablePersistentAreaCylinderExitCommand",
    "resolveMovablePersistentAreaRepositionCommand",
    "resolvePersistentAreaSaveConditionEndTurnSaveCommand",
    "resolveProtectionRelevantEffectSaveCommand",
    "resolveCreatureTypeProtectionConditionAttemptCommand",
    "resolveCreatureTypeProtectionPossessionAttemptCommand",
    "resolveReleaseReadiedActionCommand",
    "resolveReleaseReadiedSpellCommand",
    "resolveReleaseReadiedMovementCommand",
    "resolveReportReadyTriggerCommand",
    "resolveDispersePersistentAreaTraitCommand",
    "resolveDisperseTranslatingPersistentAreaCommand",
    "resolveLinkedDefenseResistanceDamageShareSeparationCommand",
    "resolveReleaseSpellCreatedHeldObjectCommand",
    "resolveCastTriggeredReactionSpellCommand",
    "resolveDirectTriggeredReactionSpellCommand",
    "resolveEndTurnCommand",
    "resolveDelegatedEndTurnCommand",
    "resolveStagedDelegatedEndTurnCommand",
    "resolveDelegatedEndTurnCommandWithReplayState",
    "resolveEndTurnCommandForParent",
    "battleRuntimeCommandProcedureRefs",
    "battleRuntimeCommandBoundExecutionReferences",
    "runtimeCommandEffectOccurrenceKey",
    "runtimeCommandAreaMembershipTrigger",
  ].flatMap((identifier) =>
    exactCollision(
      "command",
      identifier,
      ["declaration-identifier"],
      "command names the generic runtime request protocol",
    ),
  ),
  ...[
    "characterLightExtraAttackDamageAbilityModifierSupportProcedureRefs",
    "isObjectLightDiscoverySubject",
    "applyHeldLightEffect",
    "activeMovableLightEffect",
    "applyObjectLightEffect",
    "objectLightSpellEffectOccurrenceId",
    "applySpellLightEmitterEffects",
    "applyMovableLightSpellEffect",
    "repositionMovableLightSpellEffect",
    "movableLightFromEffect",
    "endHeldLightSpellEffect",
    "trackedOngoingSpellLightEmittersByEffectRef",
    "movableLightFillSetHasUnrelatedFills",
    "spellMovableLightPlacementHole",
    "spellMovableLightPlacementHoleId",
    "characterExecutionWithMovableLightReposition",
    "characterExecutionWithHeldLightHurl",
  ].flatMap((identifier) =>
    exactCollision(
      "light",
      identifier,
      ["declaration-identifier"],
      "light names the illumination mechanic",
    ),
  ),
  ...[
    "linkedDefenseResistanceDamageShareConcentrationSavingThrowHoles",
    "linkedDefenseResistanceDamageShareSaveGatedConditionWithRepeatRepeatSaveHoles",
    "characterExecutionGrantsPassiveDamageResistance",
    "isLinkedDefenseResistanceDamageShareEffect",
    "applyLinkedDefenseResistanceDamageShareSpellEffect",
    "linkedDefenseResistanceDamageShareSeparationFactsHole",
    "battleStateWithoutLinkedDefenseResistanceDamageShareEffects",
    "linkedDefenseResistanceDamageShareEffectIsConnectedToAny",
    "resolveLinkedDefenseResistanceDamageShareSeparationCommand",
    "applyChosenDamageResistanceEffect",
  ].flatMap((identifier) =>
    exactCollision(
      "resistance",
      identifier,
      ["declaration-identifier"],
      "resistance names the damage relationship mechanic",
    ),
  ),
  ...[
    "Chosen damage Resistance spells use one target fill and one damage type choice.",
  ].flatMap((identifier) =>
    exactCollision(
      "resistance",
      identifier,
      ["execution-diagnostic"],
      "resistance names the damage relationship mechanic",
    ),
  ),
  ...exactCollision(
    "darkness",
    "applyMagicalDarknessPointOriginCastEffect",
    ["declaration-identifier"],
    "darkness names a visibility trait projected from generic area facts",
  ),
  ...[
    "Darkness uses one table-supplied magical Darkness area fill.",
    "Darkness area id must be a non-empty magical Darkness area.",
    "Darkness spell-light overlap must reference a tracked ongoing spell light.",
    "Darkness can only dispel overlapping spell-created light at or below its supported spell level limit.",
  ].flatMap((identifier) =>
    exactCollision(
      "darkness",
      identifier,
      ["execution-diagnostic"],
      "darkness names a visibility trait projected from generic area facts",
    ),
  ),
  ...exactCollision(
    "knock",
    "Knock Out can only be chosen for melee attack damage.",
    ["execution-diagnostic"],
    "knock out names the zero-hit-point combat choice",
  ),
  ...[
    "Fly Speed end-fall witness must be resolved before other battle subjects.",
  ].flatMap((identifier) =>
    exactCollision(
      "fly",
      identifier,
      ["execution-diagnostic"],
      "fly names the movement mode",
    ),
  ),
  ...[
    "BattleMovableLight",
    "BattleMovableLightList",
    "isLightMeleeWeapon",
    "isTrackedOngoingSpellLightEmitter",
    "heldLightHurlMechanicalFacts",
    "movableLightResolutionSubjectMatchesOperation",
    "battleLightEmitters",
    "battleLightEmitterProjection",
    "battleIlluminationFromLightEmitters",
    "battleMagicalDarknessNonmagicalLightIllumination",
    "expireBattleLightEmitters",
    "tickDurationBattleLightEmitters",
    "MovableLightCastPlan",
    "MovableLightRepositionPlan",
    "isDimLightEmissionRiderShape",
    "stateAfterResolvedHeldLightHurl",
    "resolveMovableLightCastSpellAct",
    "resolveMovableLightRepositionSpellAct",
    "ObjectLightTargetFact",
    "spellObjectLightTargetFact",
    "BattleLightEmitterAttachment",
    "BattleTrackedOngoingSpellLightEmitterMechanicalFacts",
    "BattleProjectedSpellLightEmitter",
    "BattleTrackedOngoingSpellLightEmitter",
    "BattleSpellLightEmitter",
    "BattleUnitFeatureLightEmitter",
    "BattleObjectInvisibleRevealLightEmitter",
    "BattleStoredLightEmitter",
    "BattleLightEmitterMechanicalFacts",
    "BattleLightEmitter",
    "BattleMovableLightForm",
    "BattleLightEmitterProjectionFact",
    "BattleLightEmitterProjection",
    "BattleMagicalDarknessNonmagicalLightProjectionFact",
    "BattleSpellCreatedLightAreaOverlap",
    "SpellLightEmissionPostDamageRider",
    "BattleMovableLightCastPlacement",
    "BattleMovableLightRepositionPlacement",
    "BattleMovableLightCastPlacementList",
    "BattleMovableLightRepositionPlacementList",
    "BattleMovableLightPlacementValue",
    "allocateBattleStoredLightEmitterForCreature",
    "BattleMovableLightId",
    "BattleLightEmission",
    "HeldLightHurlMechanicalFacts",
  ].flatMap((identifier) =>
    exactCollision(
      "light",
      identifier,
      ["declaration-identifier"],
      "light names the illumination or weapon-property mechanic",
    ),
  ),
  ...[
    "magicalDarknessPointOriginRadiusFeet",
    "battleMagicalDarknessSightObscurement",
    "battleMagicalDarknessNonmagicalLightIllumination",
    "resolveMagicalDarknessPointOriginSpellAct",
    "BattleMagicalDarknessZone",
    "BattleMagicalDarknessSightProjectionFact",
    "BattleMagicalDarknessNonmagicalLightProjectionFact",
    "BattleMagicalDarknessAreaChoice",
  ].flatMap((identifier) =>
    exactCollision(
      "darkness",
      identifier,
      ["declaration-identifier"],
      "darkness names the visibility mechanic",
    ),
  ),
  ...[
    "combatantHasLinkedDefenseResistanceDamageShareResistance",
    "linkedDefenseResistanceDamageShareSavingThrowFlatBonusProjectionsForTarget",
    "linkedDefenseResistanceDamageShareCastFactsAreSatisfied",
    "battleStateWithoutLinkedDefenseResistanceDamageShareConnectedToCombatants",
    "battleStateAfterLinkedDefenseResistanceDamageShareCasterZeroHitPoints",
    "linkedDefenseResistanceDamageShareSeparationFactsAreSatisfied",
    "battleStateAfterLinkedDefenseResistanceDamageShareSeparation",
  ].flatMap((identifier) =>
    exactCollision(
      "resistance",
      identifier,
      ["declaration-identifier"],
      "resistance names the damage relationship mechanic",
    ),
  ),
  ...[
    "battleCreatureStateWithKnockOutPreservedConditions",
    "nonKnockOutLifecycleFields",
    "battleCreatureStateWithoutKnockOut",
    "damageAllowsKnockOut",
    "attackCanCarryKnockOutChoice",
    "KnockOutEligibleBattleCreatureState",
    "BattleCreatureKnockOutLifecycle",
  ].flatMap((identifier) =>
    exactCollision(
      "knock",
      identifier,
      ["declaration-identifier"],
      "knock out names the zero-hit-point combat choice",
    ),
  ),
  ...[
    "FlySpeedGrantEndFallCleanupFramesResult",
    "battleStateWithFlySpeedGrantEndFallCleanupFrames",
    "isEndedFlySpeedGrant",
    "EndedFlySpeedGrant",
    "BattleFlySpeedGrantEndFallCleanupFrame",
  ].flatMap((identifier) =>
    exactCollision(
      "fly",
      identifier,
      ["declaration-identifier"],
      "fly names the movement mode",
    ),
  ),
  ...["BattleJumpLandingFact", "BattleJumpDistanceMultiplier"].flatMap(
    (identifier) =>
      exactCollision(
        "jump",
        identifier,
        ["declaration-identifier"],
        "jump names the movement operation",
      ),
  ),
  ...["HealAmount", "healAmount"].flatMap((identifier) =>
    exactCollision(
      "heal",
      identifier,
      ["declaration-identifier"],
      "heal names hit-point restoration",
    ),
  ),
  ...exactCollision(
    "shield",
    "combatantWieldingShield",
    ["declaration-identifier"],
    "shield names the equipment category",
  ),
  ...exactCollision(
    "slow",
    "applyWeaponMasterySlowAfterDamage",
    ["declaration-identifier"],
    "slow names the weapon-mastery property",
  ),
  ...exactCollision(
    "shield",
    "unarmored_no_shield",
    ["discriminant-literal"],
    "shield names the equipment category",
  ),
  ...exactCollision(
    "light",
    "light_dex",
    ["discriminant-literal"],
    "light names the armor category",
  ),
  ...exactCollision(
    "light",
    "Light Property Bonus Action Attack requires a prior Attack action attack with a different Light weapon.",
    ["execution-diagnostic"],
    "Light Property is the canonical weapon-property mechanic",
  ),
  ...exactCollision(
    "shield",
    "Acrobatic Movement requires the mover to be unarmored and not wielding a Shield.",
    ["execution-diagnostic"],
    "Shield is the canonical equipment category",
  ),
  ...[
    "Chosen damage Resistance spell target must be a willing combatant within the selected spell's supported range.",
    "Chosen damage Resistance spell damage type must be one of the selected spell's choices.",
  ].flatMap((identifier) =>
    exactCollision(
      "resistance",
      identifier,
      ["execution-diagnostic"],
      "Resistance is the canonical damage relationship",
    ),
  ),
  ...["shield", "magic_missile"].flatMap((spellId) =>
    exactCollision(
      spellId,
      "SHIELD_MAGIC_MISSILE_SPELL_ID",
      ["declaration-identifier"],
      "the authored rule names this exact cross-record interaction",
    ),
  ),
  ...exactCollision(
    "magic_missile",
    "magic_missile",
    ["execution-diagnostic"],
    "the authored rule names this exact cross-record interaction",
  ),
  ...[
    "COMPELLED_HALT_SUPPRESSES_RUNTIME_COMMAND",
    "EncodedRuntimeCommandBattleSubject",
    "SerializedRuntimeCommandReferencePolicy",
    "byCommand",
    "command",
    "commandLabel",
    "commandRoute",
    "commandSpell",
    "CommandInvocationSchema",
    "runtimeCommandSubject",
    "serializedRuntimeCommandOwnsBoundProcedure",
    "serializedRuntimeCommandReferencePolicy",
    "serializedRuntimeCommandTargetIsLive",
  ].flatMap((identifier) =>
    exactCollision(
      "command",
      identifier,
      ["declaration-identifier"],
      "command names the generic runtime request protocol",
    ),
  ),
  ...[
    "RAGE_RESISTANCE_DAMAGE_TYPES",
    "CHOSEN_ENERGY_RESISTANCE_DAMAGE_TYPES",
    "ChosenDamageResistanceResolveInput",
    "LinkedDefenseResistanceDamageShareInvocationSchema",
    "afterLinkedDefenseResistanceDamageShareDamageShare",
    "afterResistance",
    "admitChosenDamageResistance",
    "admitLinkedDefenseResistanceDamageShare",
    "applyLinkedDefenseResistanceDamageShareDamageShare",
    "chosenDamageResistance",
    "chosenDamageResistanceSpellProjection",
    "damageResistance",
    "discoverChosenDamageResistanceCastAct",
    "discoverLinkedDefenseResistanceDamageShareCastAct",
    "linkedDefenseResistanceDamageShare",
    "linkedDefenseResistanceDamageShareCaster",
    "linkedDefenseResistanceDamageShareCasters",
    "linkedDefenseResistanceDamageShareConcentrationSavingThrows",
    "linkedDefenseResistanceDamageShareArmorClassOperationIsSupported",
    "linkedDefenseResistanceDamageShareDamageShareOperationIsSupported",
    "linkedDefenseResistanceDamageShareEarlyEndsAreSupported",
    "linkedDefenseResistanceDamageShareMaterialComponentIsSupported",
    "linkedDefenseResistanceDamageShareOperationHasAttachedBondWithinRangePredicate",
    "linkedDefenseResistanceDamageShareOperationsAreSupported",
    "linkedDefenseResistanceDamageShareResistanceOperationIsSupported",
    "linkedDefenseResistanceDamageShareSavingThrowOperationIsSupported",
    "linkedDefenseResistanceDamageShareSeparationAct",
    "linkedDefenseResistanceDamageShareSeparationActs",
    "linkedDefenseResistanceDamageShareSpellProjection",
    "resolveChosenDamageResistance",
    "resolveLinkedDefenseResistanceDamageShare",
    "suppressLinkedDefenseResistanceDamageShareDamageShare",
    "targetHasRuntimeDamageResistance",
  ].flatMap((identifier) =>
    exactCollision(
      "resistance",
      identifier,
      ["declaration-identifier"],
      "resistance names the generic damage relationship mechanic",
    ),
  ),
  ...exactCollision(
    "sleep",
    "doesNotSleep",
    ["declaration-identifier"],
    "sleep names a generic creature-state predicate",
  ),
  ...[
    "WildShapeShieldLoadoutObjectRefSchema",
    "characterBattleLoadoutShieldOffhandIssues",
    "shield",
    "shieldAvailable",
    "shieldGrounded",
    "shieldWorn",
    "usesShield",
    "wieldingShield",
  ].flatMap((identifier) =>
    exactCollision(
      "shield",
      identifier,
      ["declaration-identifier"],
      "shield names the generic equipment category",
    ),
  ),
  ...exactCollision(
    "shield",
    "shield",
    ["registry-key", "schema-discriminant-literal"],
    "shield names the generic equipment category",
  ),
  ...[
    "FlyEndCanStopFallReason",
    "FlySpeedGrantEndFallWitness",
    "FlySpeedGrantEndFallWitnessResult",
    "expireConcentrationDurationSourceWithFlySpeedGrantEndFallCleanupFrames",
    "expireConcentrationDurationSourcesWithFlySpeedGrantEndFallCleanupFrames",
    "flySpeed",
    "resolveFlySpeedGrantEndFallCleanup",
    "resolveFlySpeedGrantEndFallCleanupStateOnly",
  ].flatMap((identifier) =>
    exactCollision(
      "fly",
      identifier,
      ["declaration-identifier"],
      "fly names the generic movement mode",
    ),
  ),
  ...[
    "applyStepOfTheWindJumpDistanceMultiplier",
    "jumpDistanceMultiplier",
    "jumpMovementValidation",
    "maxJumpDistanceFeet",
    "withJumpDistanceMultiplier",
  ].flatMap((identifier) =>
    exactCollision(
      "jump",
      identifier,
      ["declaration-identifier"],
      "jump names the generic movement operation",
    ),
  ),
  ...[
    "KnockOutEligibleZeroHpLifecycle",
    "applyKnockOut",
    "hpDamageProjectionAllowsKnockOut",
    "initialKnockOutLifecycleFields",
  ].flatMap((identifier) =>
    exactCollision(
      "knock",
      identifier,
      ["declaration-identifier"],
      "knock out names the generic zero-hit-point combat choice",
    ),
  ),
  ...exactCollision(
    "knock",
    "knockOut",
    ["schema-discriminant-literal"],
    "knock out names the generic zero-hit-point combat choice",
  ),
  ...exactCollision(
    "slow",
    "WEAPON_MASTERY_SLOW_SUPPORT_PROFILE",
    ["declaration-identifier"],
    "slow names the distinct weapon-mastery support profile",
  ),
  ...exactCollision(
    "creation",
    "creationBoundary",
    ["declaration-identifier"],
    "creation names the generic completed-inscription lifecycle boundary",
  ),
];

const EXECUTION_IDENTITY_COLLISION_SITE_EVIDENCE = {
  sha256: "46585beff3f09f77c710171858cc579983e56fc1bbd3cae4e4d73bb3949d5c78",
  siteCount: 1205,
  violationCount: 1336,
};

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

function assertEveryPathRuleMatches(relativePaths, rules, label) {
  const unmatched = rules.filter(
    (rule) =>
      !relativePaths.some((relativePath) => rule.pattern.test(relativePath)),
  );
  assert.deepEqual(
    unmatched.map((rule) => rule.reason),
    [],
    `${label} contains rule(s) which match no repository file`,
  );
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
        /(?:spell|unit):(?!\s*(?:Schema\.optionalWith\(Schema\.Never|Schema\.optionalKey\(Schema\.Never\)))/,
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
      relativePath: "packages/mcp/src/session-store.ts",
      patterns: [
        /export type BattleFillSession[\s\S]{0,300}readonly label:/,
        /export type BattleFillSession[\s\S]{0,300}readonly summary:/,
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
        /BattleEffectExecutionRef\s*=\s*Schema\.NonEmptyTrimmedString\.pipe\(\s*Schema\.brand/,
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
  return /^(?:Schema\.optionalWith\(Schema\.Never,\s*\{\s*exact:\s*true\s*\}\)|Schema\.optionalKey\(Schema\.Never\))$/.test(
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
  const nativeStrictSchemaFixture = `
    const targetListCodec = Schema.Struct({
      kind: Schema.Literal("spellTargetList"),
      procedure: Schema.optionalKey(Schema.Never),
    })
    const rerollDieCodec = Schema.Struct({
      dieRef: Schema.optionalKey(Schema.Never),
    })
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
  assert.deepEqual(
    battleReplayAstViolations(
      nativeStrictSchemaFixture,
      "packages/battle-runtime/src/battle-reducer/native-strict-codecs.ts",
    ),
    [],
    "Battle replay AST gate must recognize native v4 optionalKey Never rejection schemas.",
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

function lexicalWords(text) {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function collectSurfaceSpellLexicon(records) {
  const spellRecords =
    records ??
    listSurfaceContentFiles(SURFACE_CONTENT_ROOT).map((filePath) => {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
      return { ...parsed, sourceFile: path.relative(REPO_ROOT, filePath) };
    });
  const malformed = [];
  const lexicon = [];
  const seenIds = new Set();

  for (const record of spellRecords) {
    if (record?.kind !== "spell") continue;
    if (
      typeof record.id !== "string" ||
      record.id.length === 0 ||
      typeof record.name !== "string" ||
      record.name.length === 0
    ) {
      malformed.push(record?.sourceFile ?? "<synthetic-record>");
      continue;
    }
    if (seenIds.has(record.id)) {
      malformed.push(
        `${record.sourceFile ?? "<synthetic-record>"}:duplicate:${record.id}`,
      );
      continue;
    }
    seenIds.add(record.id);
    const idWords = lexicalWords(record.id);
    const nameWords = lexicalWords(record.name);
    const phraseKeys = new Set([idWords.join(" "), nameWords.join(" ")]);
    lexicon.push({
      id: record.id,
      name: record.name,
      phraseWords: [...phraseKeys].map((phrase) => phrase.split(" ")),
    });
  }

  return {
    malformed,
    lexicon: lexicon.sort((left, right) => left.id.localeCompare(right.id)),
  };
}

function collectSurfaceSpellHoleIds() {
  const holeIds = new Set();
  const visit = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (value == null || typeof value !== "object") return;
    for (const [key, nestedValue] of Object.entries(value)) {
      if (key === "holeId" && typeof nestedValue === "string") {
        holeIds.add(nestedValue);
      }
      visit(nestedValue);
    }
  };

  for (const filePath of listSurfaceContentFiles(SURFACE_CONTENT_ROOT)) {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (parsed?.kind === "spell") visit(parsed);
  }
  return holeIds;
}

function wordsContainPhrase(words, phrase) {
  if (phrase.length === 0 || phrase.length > words.length) return false;
  for (let start = 0; start <= words.length - phrase.length; start += 1) {
    if (phrase.every((word, offset) => words[start + offset] === word)) {
      return true;
    }
  }
  return false;
}

const SPELL_LEXICON_MATCHER_CACHE = new WeakMap();

function spellLexiconMatcher(spellLexicon) {
  const cached = SPELL_LEXICON_MATCHER_CACHE.get(spellLexicon);
  if (cached !== undefined) return cached;
  const phrasesByFirstWord = new Map();
  for (const spell of spellLexicon) {
    for (const phrase of spell.phraseWords) {
      const first = phrase[0];
      const bucket = phrasesByFirstWord.get(first) ?? [];
      bucket.push({ phrase, spell });
      phrasesByFirstWord.set(first, bucket);
    }
  }
  const matcher = { phrasesByFirstWord, results: new Map() };
  SPELL_LEXICON_MATCHER_CACHE.set(spellLexicon, matcher);
  return matcher;
}

function spellLexiconMatches(text, spellLexicon) {
  const matcher = spellLexiconMatcher(spellLexicon);
  const cached = matcher.results.get(text);
  if (cached !== undefined) return cached;
  const words = lexicalWords(text);
  const matched = new Map();
  for (const word of new Set(words)) {
    for (const candidate of matcher.phrasesByFirstWord.get(word) ?? []) {
      if (wordsContainPhrase(words, candidate.phrase)) {
        matched.set(candidate.spell.id, candidate.spell);
      }
    }
  }
  const matches = [...matched.values()];
  matcher.results.set(text, matches);
  return matches;
}

function textContainsExactAuthoredTitle(text, spell) {
  return new RegExp(
    `(?:^|[^A-Za-z0-9])${escapeForRegExp(spell.name)}(?:$|[^A-Za-z0-9])`,
  ).test(text);
}

function executionIdentityBoundaryReason(relativePath) {
  if (
    /(?:\.test\.[cm]?tsx?$|\.mbt\.test\.[cm]?tsx?$|\.test-support\.[cm]?tsx?$|\/test-support\/|\/fixtures?\/)/.test(
      relativePath,
    )
  ) {
    return "test-or-fixture-boundary";
  }
  return classifyPath(relativePath, EXECUTION_IDENTITY_BOUNDARIES);
}

function isExecutionIdentitySource(relativePath, executionImportClosure) {
  return (
    executionImportClosure.has(relativePath) &&
    executionIdentityBoundaryReason(relativePath) === null
  );
}

function executionDiagnosticViolationsForFile(
  relativePath,
  content,
  spellLexicon,
) {
  if (
    !relativePath.startsWith("packages/battle-runtime/src/") ||
    executionIdentityBoundaryReason(relativePath) !== null
  ) {
    return [];
  }
  return executionIdentityViolationsForFile(
    relativePath,
    content,
    spellLexicon,
    new Set([relativePath]),
  ).filter((violation) => violation.role === "execution-diagnostic");
}

function declarationName(node) {
  const hasExportModifier = (candidate) =>
    candidate.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    ) === true;
  const variableStatement = ts.isVariableDeclaration(node)
    ? node.parent?.parent
    : undefined;
  const variableIsExported =
    variableStatement !== undefined &&
    ts.isVariableStatement(variableStatement) &&
    hasExportModifier(variableStatement);
  const isExportedDeclaration =
    !ts.isVariableDeclaration(node) && hasExportModifier(node);
  const isExecutionContractDeclaration =
    ts.isClassDeclaration(node) ||
    ts.isEnumDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isFunctionDeclaration(node) ||
    (ts.isVariableDeclaration(node) && variableIsExported);
  if (
    isExecutionContractDeclaration &&
    node.name !== undefined &&
    ts.isIdentifier(node.name) &&
    (isExportedDeclaration ||
      EXECUTION_DECLARATION_NAME_PATTERN.test(node.name.text) ||
      EXECUTION_IDENTITY_ARRAY_NAME_PATTERN.test(node.name.text) ||
      EXECUTION_PROTOCOL_DECLARATION_NAME_PATTERN.test(node.name.text))
  ) {
    return node.name.text;
  }
  return undefined;
}

function exportedVariableAuthoredValue(node, spellLexicon) {
  if (!ts.isVariableDeclaration(node) || node.initializer === undefined) {
    return false;
  }
  const variableStatement = node.parent?.parent;
  if (
    variableStatement === undefined ||
    !ts.isVariableStatement(variableStatement) ||
    variableStatement.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    ) !== true
  ) {
    return false;
  }
  let hasAuthoredValue = false;
  const visit = (candidate) => {
    if (hasAuthoredValue) return;
    const text = runtimeTextExpression(candidate);
    if (
      text !== undefined &&
      !isNestedRuntimeTextExpression(candidate) &&
      spellLexiconMatches(text, spellLexicon).some(
        (spell) =>
          spell.phraseWords.some((phrase) => phrase.length > 1) ||
          textContainsExactAuthoredTitle(text, spell),
      )
    ) {
      hasAuthoredValue = true;
      return;
    }
    ts.forEachChild(candidate, visit);
  };
  visit(node.initializer);
  return hasAuthoredValue;
}

function coupledExecutionIdentifier(node) {
  if (
    (ts.isVariableDeclaration(node) ||
      ts.isParameter(node) ||
      ts.isPropertyDeclaration(node) ||
      ts.isPropertySignature(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isFunctionDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isClassDeclaration(node)) &&
    node.name !== undefined &&
    ts.isIdentifier(node.name)
  ) {
    return node.name;
  }
  if (ts.isImportSpecifier(node)) return node.name;
  if (ts.isImportClause(node) && node.name !== undefined) return node.name;
  return undefined;
}

function runtimeTextExpression(node) {
  if (ts.isTaggedTemplateExpression(node)) {
    return runtimeTextExpression(node.template);
  }
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (ts.isTemplateExpression(node)) {
    return [
      node.head.text,
      ...node.templateSpans.map((span) => span.literal.text),
    ].join(" ");
  }
  if (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    const left = runtimeTextExpression(node.left);
    const right = runtimeTextExpression(node.right);
    if (left === undefined && right === undefined) return undefined;
    return `${left ?? ""} ${right ?? ""}`;
  }
  return undefined;
}

function isNestedRuntimeTextExpression(node) {
  const parent = node.parent;
  return (
    ts.isTaggedTemplateExpression(parent) ||
    ts.isTemplateExpression(parent) ||
    (ts.isTemplateSpan(parent) && parent.literal === node) ||
    (ts.isBinaryExpression(parent) &&
      parent.operatorToken.kind === ts.SyntaxKind.PlusToken)
  );
}

function runtimeTextExpressionHasExecutionRole(node) {
  let current = node;
  while (
    ts.isParenthesizedExpression(current.parent) ||
    ts.isAsExpression(current.parent) ||
    ts.isSatisfiesExpression(current.parent) ||
    ts.isArrayLiteralExpression(current.parent)
  ) {
    current = current.parent;
  }
  const parent = current.parent;
  return (
    (ts.isVariableDeclaration(parent) && parent.initializer === current) ||
    (ts.isPropertyAssignment(parent) && parent.initializer === current) ||
    (ts.isReturnStatement(parent) && parent.expression === current) ||
    (ts.isArrowFunction(parent) && parent.body === current) ||
    ((ts.isCallExpression(parent) || ts.isNewExpression(parent)) &&
      parent.arguments?.some((argument) => argument === current) === true)
  );
}

function nearestNamedFunction(node) {
  let current = node.parent;
  while (current !== undefined && !ts.isSourceFile(current)) {
    if (
      (ts.isFunctionDeclaration(current) ||
        ts.isFunctionExpression(current) ||
        ts.isMethodDeclaration(current)) &&
      current.name !== undefined
    ) {
      return propertyNameText(current.name);
    }
    if (
      ts.isVariableDeclaration(current) &&
      ts.isIdentifier(current.name) &&
      (ts.isArrowFunction(current.initializer) ||
        ts.isFunctionExpression(current.initializer))
    ) {
      return current.name.text;
    }
    current = current.parent;
  }
  return undefined;
}

function isPositionalDiagnosticString(node) {
  let current = node.parent;
  while (current !== undefined && !ts.isStatement(current)) {
    if (ts.isCallExpression(current)) {
      return EXECUTION_DIAGNOSTIC_CALL_PATTERN.test(
        current.expression.getText(),
      );
    }
    if (
      ts.isNewExpression(current) &&
      ts.isIdentifier(current.expression) &&
      current.expression.text === "Error"
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function isReturnedValidationString(node) {
  let current = node.parent;
  while (current !== undefined && !ts.isSourceFile(current)) {
    if (ts.isReturnStatement(current)) {
      const functionName = nearestNamedFunction(current);
      return (
        functionName !== undefined &&
        /(?:fail|invalid|issue|error|validat)/i.test(functionName)
      );
    }
    if (ts.isFunctionLike(current)) return false;
    current = current.parent;
  }
  return false;
}

function propertyDeclaresExecutionRegistryKey(node) {
  if (
    ts.isPropertySignature(node) ||
    ts.isMethodSignature(node) ||
    ts.isMethodDeclaration(node)
  ) {
    let owner = node.parent;
    while (owner !== undefined && !ts.isSourceFile(owner)) {
      if (
        (ts.isInterfaceDeclaration(owner) ||
          ts.isTypeAliasDeclaration(owner)) &&
        owner.name !== undefined
      ) {
        return /(?:Map|Registry|Procedures|Protocol|Variants)/.test(
          owner.name.text,
        );
      }
      owner = owner.parent;
    }
    return false;
  }
  if (!ts.isPropertyAssignment(node)) return false;
  let owner = node.parent;
  for (let depth = 0; owner !== undefined && depth < 5; depth += 1) {
    if (ts.isCallExpression(owner)) {
      return /(?:discriminator|match|registry)/i.test(
        owner.expression.getText(),
      );
    }
    if (ts.isVariableDeclaration(owner) && ts.isIdentifier(owner.name)) {
      return EXECUTION_IDENTITY_ARRAY_NAME_PATTERN.test(owner.name.text);
    }
    owner = owner.parent;
  }
  return false;
}

function nearestPropertyRole(node) {
  let current = node.parent;
  for (let depth = 0; current !== undefined && depth < 7; depth += 1) {
    if (
      ts.isPropertyAssignment(current) ||
      ts.isPropertySignature(current) ||
      ts.isMethodDeclaration(current) ||
      ts.isMethodSignature(current)
    ) {
      return propertyNameText(current.name);
    }
    if (ts.isStatement(current) || ts.isSourceFile(current)) break;
    current = current.parent;
  }
  return undefined;
}

function nearestVariableName(node) {
  let current = node.parent;
  while (current !== undefined && !ts.isStatement(current)) {
    if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name)) {
      return current.name.text;
    }
    current = current.parent;
  }
  return undefined;
}

function isSchemaLiteralNode(node) {
  let current = node.parent;
  for (let depth = 0; current !== undefined && depth < 5; depth += 1) {
    if (
      ts.isCallExpression(current) &&
      /(?:^|\.)Schema\.(?:Literal|Literals)$/.test(current.expression.getText())
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

const collisionSitePrinter = ts.createPrinter({ removeComments: true });
const collisionSiteFingerprintCache = new WeakMap();

function collisionSiteFingerprint(source, node) {
  let current = node;
  let site = node;
  while (!ts.isSourceFile(current)) {
    if (ts.isStatement(current)) site = current;
    current = current.parent;
  }
  const cached = collisionSiteFingerprintCache.get(site);
  if (cached !== undefined) return cached;
  const normalizedSource = collisionSitePrinter
    .printNode(ts.EmitHint.Unspecified, site, source)
    .replace(/\s+/g, " ")
    .trim();
  const fingerprint = `${ts.SyntaxKind[site.kind]}:${createHash("sha256")
    .update(normalizedSource)
    .digest("hex")}`;
  collisionSiteFingerprintCache.set(site, fingerprint);
  return fingerprint;
}

function executionIdentityViolation(
  source,
  relativePath,
  node,
  role,
  identifier,
  spell,
) {
  const location = source.getLineAndCharacterOfPosition(node.getStart(source));
  return {
    relativePath,
    line: location.line + 1,
    column: location.character + 1,
    spellId: spell.id,
    spellName: spell.name,
    role,
    identifier,
    siteFingerprint: collisionSiteFingerprint(source, node),
  };
}

function executionIdentityViolationsForFile(
  relativePath,
  content,
  spellLexicon,
  executionImportClosure = new Set([relativePath]),
) {
  if (!isExecutionIdentitySource(relativePath, executionImportClosure)) {
    return [];
  }
  const source = ts.createSourceFile(
    relativePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    relativePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const violations = [];
  const addMatches = (node, role, identifier) => {
    for (const spell of spellLexiconMatches(identifier, spellLexicon)) {
      violations.push(
        executionIdentityViolation(
          source,
          relativePath,
          node,
          role,
          identifier,
          spell,
        ),
      );
    }
  };
  const addAuthoredTitleTextMatches = (node, identifier) => {
    for (const spell of spellLexiconMatches(identifier, spellLexicon)) {
      if (
        !spell.phraseWords.some((phrase) => phrase.length > 1) &&
        !textContainsExactAuthoredTitle(identifier, spell)
      ) {
        continue;
      }
      violations.push(
        executionIdentityViolation(
          source,
          relativePath,
          node,
          "execution-diagnostic",
          identifier,
          spell,
        ),
      );
    }
  };
  const visit = (node) => {
    const declared = declarationName(node);
    if (declared !== undefined) {
      addMatches(node.name, "declaration-identifier", declared);
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      exportedVariableAuthoredValue(node, spellLexicon)
    ) {
      addMatches(node.name, "declaration-identifier", node.name.text);
    }
    const coupledIdentifier = coupledExecutionIdentifier(node);
    if (coupledIdentifier !== undefined) {
      addMatches(
        coupledIdentifier,
        "declaration-identifier",
        coupledIdentifier.text,
      );
    }

    if (
      (ts.isPropertyAssignment(node) ||
        ts.isPropertySignature(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isMethodSignature(node)) &&
      node.name !== undefined
    ) {
      const key = propertyNameText(node.name);
      if (key !== undefined && propertyDeclaresExecutionRegistryKey(node)) {
        addMatches(node.name, "registry-key", key);
      }
    }

    const runtimeText = runtimeTextExpression(node);
    if (runtimeText !== undefined && !isNestedRuntimeTextExpression(node)) {
      const propertyRole = nearestPropertyRole(node);
      if (
        propertyRole !== undefined &&
        EXECUTION_IDENTITY_ROLE_FIELDS.has(propertyRole)
      ) {
        addMatches(
          node,
          isSchemaLiteralNode(node)
            ? "schema-discriminant-literal"
            : "discriminant-literal",
          runtimeText,
        );
      } else if (
        propertyRole !== undefined &&
        EXECUTION_DIAGNOSTIC_FIELDS.has(propertyRole)
      ) {
        addMatches(node, "execution-diagnostic", runtimeText);
      } else {
        const containerName = nearestVariableName(node);
        if (
          containerName !== undefined &&
          (EXECUTION_IDENTITY_ARRAY_NAME_PATTERN.test(containerName) ||
            EXECUTION_PROTOCOL_DECLARATION_NAME_PATTERN.test(containerName))
        ) {
          addMatches(node, "protocol-array-member", runtimeText);
        } else if (
          isPositionalDiagnosticString(node) ||
          isReturnedValidationString(node) ||
          runtimeTextExpressionHasExecutionRole(node)
        ) {
          addAuthoredTitleTextMatches(node, runtimeText);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  const basename = path.basename(relativePath).replace(/\.[^.]+$/, "");
  for (const spell of spellLexiconMatches(basename, spellLexicon)) {
    violations.push({
      relativePath,
      line: 1,
      column: 1,
      spellId: spell.id,
      spellName: spell.name,
      role: "execution-filename",
      identifier: basename,
      siteFingerprint: `execution-filename:${basename}`,
    });
  }
  return violations;
}

function collisionSiteCountEvidence(violations) {
  const counts = new Map();
  for (const violation of violations) {
    const site = JSON.stringify({
      relativePath: violation.relativePath,
      spellId: violation.spellId,
      role: violation.role,
      identifier: violation.identifier,
      siteFingerprint: violation.siteFingerprint,
    });
    counts.set(site, (counts.get(site) ?? 0) + 1);
  }
  const sites = [...counts.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([site, count]) => ({ site: JSON.parse(site), count }));
  const canonicalSites = JSON.stringify(sites);
  return {
    sha256: createHash("sha256").update(canonicalSites).digest("hex"),
    siteCount: sites.length,
    violationCount: violations.length,
  };
}

function sameCollisionSiteEvidence(left, right) {
  return (
    left.sha256 === right.sha256 &&
    left.siteCount === right.siteCount &&
    left.violationCount === right.violationCount
  );
}

function applyExecutionIdentityCollisionExemptions(
  violations,
  exemptions,
  expectedSiteEvidence,
) {
  const usage = new Map(exemptions.map((exemption) => [exemption, 0]));
  const matched = [];
  const remaining = violations.filter((violation) => {
    const matches = exemptions.filter(
      (exemption) =>
        exemption.spellId === violation.spellId &&
        exemption.role === violation.role &&
        exemption.identifier === violation.identifier,
    );
    assert.ok(
      matches.length <= 1,
      `duplicate authored-identity collision exemption for ${violation.spellId}/${violation.role}/${violation.identifier}`,
    );
    if (matches.length === 0) return true;
    usage.set(matches[0], (usage.get(matches[0]) ?? 0) + 1);
    matched.push(violation);
    return false;
  });
  const stale = exemptions.filter((exemption) => usage.get(exemption) === 0);
  const siteEvidence = collisionSiteCountEvidence(matched);
  return {
    remaining,
    stale,
    usage,
    siteEvidence,
    siteEvidenceMatches: sameCollisionSiteEvidence(
      siteEvidence,
      expectedSiteEvidence,
    ),
  };
}

function dedupeExecutionIdentityViolations(violations) {
  const unique = new Map();
  for (const violation of violations) {
    const key = `${violation.relativePath}:${violation.line}:${violation.column}:${violation.spellId}:${violation.role}:${violation.identifier}`;
    if (!unique.has(key)) unique.set(key, violation);
  }
  return [...unique.values()].sort(
    (left, right) =>
      left.relativePath.localeCompare(right.relativePath) ||
      left.line - right.line ||
      left.column - right.column ||
      left.role.localeCompare(right.role) ||
      left.spellId.localeCompare(right.spellId),
  );
}

function runExecutionIdentityCohortSelfTest() {
  const { lexicon, malformed } = collectSurfaceSpellLexicon([
    { kind: "spell", id: "cloudkill", name: "Cloudkill" },
    { kind: "spell", id: "magic_missile", name: "Magic Missile" },
    { kind: "spell", id: "mirror_image", name: "Mirror Image" },
    { kind: "spell", id: "find_familiar", name: "Find Familiar" },
    { kind: "spell", id: "feather_fall", name: "Feather Fall" },
    { kind: "spell", id: "sanctuary", name: "Sanctuary" },
    { kind: "spell", id: "light", name: "Light" },
    { kind: "spell", id: "command", name: "Command" },
    { kind: "spell", id: "shield", name: "Shield" },
    { kind: "unit", id: "cloudkill_unit", name: "Cloudkill Unit" },
  ]);
  assert.deepEqual(malformed, []);
  const fixturePath =
    "packages/battle-runtime/src/battle-reducer/synthetic-procedure.ts";
  const fixture = `
    export type CloudkillAreaHazardEffect = { readonly kind: "cloudkillAreaHazard" }
    export function resolveCloudkillProcedure() { return true }
    export function resolveCloudkillMechanic() { return true }
    export const CLOUDKILL_SAVE_HOLE_ID = holeId("battle:cloudkill:save")
    export const RUNTIME_COMMAND_KINDS = ["magicMissileDamage", "nearMissile"] as const
    export const Registry = { magicMissile: Schema.Struct({
      command: Schema.Literal("magicMissileDamage"),
    }) }
    const invalid = { message: "Cloudkill movement could not continue." }
    function validateReplay() { return "Cloudkill replay is invalid." }
    invalidResult(state, "invalidFill", "Cloudkill positional diagnostic.")
    throw new Error("Cloudkill constructor diagnostic.")
    export const MIRROR_IMAGE_HOLE_PREFIX = "battle:mirror-image:duplicate:"
    export function occurrenceMessage() { return "Find Familiar lifecycle failed." }
    const lifecycleConfig = { emptyRosterMessage: "Find Familiar admission requires combatants." }
    export function resolve(input) {
      const sanctuaryCheck = input
      return invalidTransition("invalidFill", \`Spell \${input.part} Mirror Image duplicate roll is invalid.\`)
    }
  `;
  const fixtureViolations = executionIdentityViolationsForFile(
    fixturePath,
    fixture,
    lexicon,
  );
  const roles = new Set(fixtureViolations.map((violation) => violation.role));
  for (const expected of [
    "declaration-identifier",
    "discriminant-literal",
    "schema-discriminant-literal",
    "protocol-array-member",
    "registry-key",
    "execution-diagnostic",
  ]) {
    assert.ok(roles.has(expected), `cohort self-test missed ${expected}`);
  }
  for (const identifier of [
    "resolveCloudkillProcedure",
    "resolveCloudkillMechanic",
    "CLOUDKILL_SAVE_HOLE_ID",
    "battle:cloudkill:save",
    "Cloudkill replay is invalid.",
    "Cloudkill positional diagnostic.",
    "Cloudkill constructor diagnostic.",
    "MIRROR_IMAGE_HOLE_PREFIX",
    "battle:mirror-image:duplicate:",
    "Find Familiar lifecycle failed.",
    "Find Familiar admission requires combatants.",
    "sanctuaryCheck",
    "Spell   Mirror Image duplicate roll is invalid.",
  ]) {
    assert.ok(
      fixtureViolations.some(
        (violation) => violation.identifier === identifier,
      ),
      `cohort self-test missed ${identifier}`,
    );
  }
  assert.ok(
    executionDiagnosticViolationsForFile(
      "packages/battle-runtime/src/companion-lifecycle.ts",
      `const lifecycle = { emptyRosterMessage: "Find Familiar admission requires combatants." }`,
      lexicon,
    ).some(
      (violation) =>
        violation.role === "execution-diagnostic" &&
        violation.identifier === "Find Familiar admission requires combatants.",
    ),
    "cohort scanner did not inspect arbitrary diagnostic fields in battle runtime production outside the declared execution closure",
  );
  assert.throws(
    () =>
      assertEveryPathRuleMatches(
        [fixturePath],
        [{ reason: "missing-boundary", pattern: /^packages\/missing\.ts$/ }],
        "synthetic allowlist",
      ),
    /missing-boundary/,
    "cohort self-test accepted an allowlist rule matching no repository file",
  );
  assert.equal(
    executionIdentityViolationsForFile(
      fixturePath,
      `const message = "nearMissile"`,
      lexicon,
    ).length,
    0,
    "cohort scanner treated a synthetic near miss as authored identity",
  );
  assert.equal(
    executionIdentityViolationsForFile(
      "packages/battle-runtime/src/procedure-admission/cloudkill.ts",
      fixture,
      lexicon,
    ).length,
    0,
    "cohort scanner rejected the explicit admission boundary",
  );
  const executionFacingSharedPath =
    "packages/shared-algebras/src/synthetic-cloudkill-mechanics.ts";
  const executionClosure = new Set([fixturePath, executionFacingSharedPath]);
  assert.ok(
    executionIdentityViolationsForFile(
      executionFacingSharedPath,
      `export const cloudkillMechanic = { kind: "cloudkillAreaHazard" }`,
      lexicon,
      executionClosure,
    ).length > 0,
    "cohort scanner did not inspect an execution-reachable shared-package module",
  );
  assert.equal(
    executionIdentityViolationsForFile(
      "packages/shared-algebras/src/unreachable-cloudkill-mechanics.ts",
      `export const cloudkillMechanic = { kind: "cloudkillAreaHazard" }`,
      lexicon,
      executionClosure,
    ).length,
    0,
    "cohort scanner inspected a module outside the execution import closure",
  );
  for (const [sourceText, identifier] of [
    ["function featherFallLanding() { return true }", "featherFallLanding"],
    [
      'import { resolveLanding as featherFallLanding } from "./landing.ts";',
      "featherFallLanding",
    ],
  ]) {
    assert.ok(
      executionIdentityViolationsForFile(fixturePath, sourceText, lexicon).some(
        (violation) =>
          violation.role === "declaration-identifier" &&
          violation.identifier === identifier,
      ),
      `cohort scanner missed authored declaration/import identifier ${identifier} without a same-file authored string`,
    );
  }
  assert.ok(
    battleRuntimePublicExportOwnerFiles().includes(
      "packages/battle-runtime/src/battle-reducer/environmental-fall-procedures.ts",
    ),
    "cohort scanner public-owner discovery missed a re-export outside the former execution roots",
  );
  const collisionSource =
    "export type HeldLightSpellProcedureExecution = { readonly value: true }";
  const collision = executionIdentityViolationsForFile(
    fixturePath,
    collisionSource,
    lexicon,
  );
  const collisionExemption = {
    spellId: "light",
    role: "declaration-identifier",
    identifier: "HeldLightSpellProcedureExecution",
    reason: "synthetic exact collision",
  };
  const collisionEvidence = collisionSiteCountEvidence(collision);
  const applied = applyExecutionIdentityCollisionExemptions(
    collision,
    [collisionExemption],
    collisionEvidence,
  );
  assert.deepEqual(applied.remaining, []);
  assert.deepEqual(applied.stale, []);
  assert.equal(applied.siteEvidenceMatches, true);

  const unrelatedCollision = executionIdentityViolationsForFile(
    "packages/battle-runtime/src/battle-reducer/unrelated-procedure.ts",
    collisionSource,
    lexicon,
  );
  assert.equal(
    applyExecutionIdentityCollisionExemptions(
      unrelatedCollision,
      [collisionExemption],
      collisionEvidence,
    ).siteEvidenceMatches,
    false,
    "cohort scanner accepted an exempt identifier copied into an unrelated production file",
  );

  const runtimeCommandCollisionSource =
    "export function executeRuntime(command: unknown) { return command }";
  const runtimeCommandCollision = executionIdentityViolationsForFile(
    fixturePath,
    runtimeCommandCollisionSource,
    lexicon,
  ).filter(
    (violation) =>
      violation.spellId === "command" &&
      violation.role === "declaration-identifier" &&
      violation.identifier === "command",
  );
  const runtimeCommandExemption = {
    spellId: "command",
    role: "declaration-identifier",
    identifier: "command",
    reason: "synthetic generic runtime command collision",
  };
  const runtimeCommandEvidence = collisionSiteCountEvidence(
    runtimeCommandCollision,
  );
  assert.equal(
    applyExecutionIdentityCollisionExemptions(
      runtimeCommandCollision,
      [runtimeCommandExemption],
      runtimeCommandEvidence,
    ).siteEvidenceMatches,
    true,
    "cohort scanner rejected a reviewed generic runtime command collision",
  );
  const launderedRuntimeCommandCollision = executionIdentityViolationsForFile(
    "packages/battle-runtime/src/battle-reducer/unrelated-command.ts",
    runtimeCommandCollisionSource,
    lexicon,
  ).filter(
    (violation) =>
      violation.spellId === "command" &&
      violation.role === "declaration-identifier" &&
      violation.identifier === "command",
  );
  assert.equal(
    applyExecutionIdentityCollisionExemptions(
      launderedRuntimeCommandCollision,
      [runtimeCommandExemption],
      runtimeCommandEvidence,
    ).siteEvidenceMatches,
    false,
    "cohort scanner accepted a generic command exemption copied into an unrelated production file",
  );

  const surplusCollision = executionIdentityViolationsForFile(
    fixturePath,
    `${collisionSource}\nexport interface HeldLightSpellProcedureExecution { readonly value: true }`,
    lexicon,
  );
  assert.equal(
    applyExecutionIdentityCollisionExemptions(
      surplusCollision,
      [collisionExemption],
      collisionEvidence,
    ).siteEvidenceMatches,
    false,
    "cohort scanner accepted surplus exempt occurrences at an allowed site",
  );

  const triggeredArmorDefensePath =
    "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/triggered-armor-defense.ts";
  const triggeredArmorDefenseSource =
    'const SHIELD_MAGIC_MISSILE_SPELL_ID = unitId("magic_missile");';
  const triggeredArmorDefenseCollisions = dedupeExecutionIdentityViolations(
    executionIdentityViolationsForFile(
      triggeredArmorDefensePath,
      triggeredArmorDefenseSource,
      lexicon,
    ),
  );
  const triggeredArmorDefenseExemptions = [
    ...["shield", "magic_missile"].map((spellId) => ({
      spellId,
      role: "declaration-identifier",
      identifier: "SHIELD_MAGIC_MISSILE_SPELL_ID",
      reason: "synthetic authored cross-record interaction",
    })),
    {
      spellId: "magic_missile",
      role: "execution-diagnostic",
      identifier: "magic_missile",
      reason: "synthetic authored cross-record interaction",
    },
  ];
  const triggeredArmorDefenseEvidence = collisionSiteCountEvidence(
    triggeredArmorDefenseCollisions,
  );
  assert.equal(
    applyExecutionIdentityCollisionExemptions(
      triggeredArmorDefenseCollisions,
      triggeredArmorDefenseExemptions,
      triggeredArmorDefenseEvidence,
    ).siteEvidenceMatches,
    true,
    "cohort scanner rejected the exact triggered-defense admission owner",
  );
  const relocatedTriggeredArmorDefenseCollisions =
    dedupeExecutionIdentityViolations(
      executionIdentityViolationsForFile(
        triggeredArmorDefensePath,
        `function unrelatedProcedure() {
          const SHIELD_MAGIC_MISSILE_SPELL_ID = unitId("magic_missile");
          return SHIELD_MAGIC_MISSILE_SPELL_ID;
        }`,
        lexicon,
      ),
    );
  assert.equal(
    applyExecutionIdentityCollisionExemptions(
      relocatedTriggeredArmorDefenseCollisions,
      triggeredArmorDefenseExemptions,
      triggeredArmorDefenseEvidence,
    ).siteEvidenceMatches,
    false,
    "cohort scanner accepted a same-file substitution outside the reviewed triggered-defense declaration",
  );

  const staleCollision = applyExecutionIdentityCollisionExemptions(
    [],
    [collisionExemption],
    collisionEvidence,
  );
  assert.equal(
    staleCollision.stale.length,
    1,
    "cohort scanner accepted a stale collision exemption",
  );
  assert.equal(
    staleCollision.siteEvidenceMatches,
    false,
    "cohort scanner accepted absent reviewed collision-site evidence",
  );
  const augmented = collectSurfaceSpellLexicon([
    { kind: "spell", id: "cloudkill", name: "Cloudkill" },
    { kind: "spell", id: "synthetic_procedure", name: "Synthetic Procedure" },
  ]).lexicon;
  assert.ok(
    executionIdentityViolationsForFile(
      fixturePath,
      `export const syntheticProcedure = { procedure: "syntheticProcedure" }`,
      augmented,
    ).length > 0,
    "cohort scanner did not incorporate a newly added Surface spell",
  );
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
    "flaming_sphere_area",
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

  const authoredHoleIdBranch = [
    "export function authoredHoleSelection(attachment) {",
    '  return attachment.holeId === "flaming_sphere_area";',
    "}",
  ].join("\n");
  const authoredHoleIdViolations = findViolationsForFile(
    "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/synthetic-area.ts",
    authoredHoleIdBranch,
    authoredAlternation,
    new Set(),
    new Map(),
  );
  assert(
    authoredHoleIdViolations.some(
      (violation) =>
        violation.literal === "flaming_sphere_area" &&
        violation.context.kind === "id-comparison",
    ),
    `Self-test failed: authored hole-ID dispatch was not caught. Got ${JSON.stringify(authoredHoleIdViolations)}`,
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
  runExecutionIdentityCohortSelfTest();
  if (process.argv.includes("--self-test")) {
    console.log("authored-identity dispatch boundary self-test passed");
    return;
  }

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
  const battleAuthoredAlternation = buildAuthoredAlternation(
    new Set([...authoredIdentityLiterals, ...collectSurfaceSpellHoleIds()]),
  );
  const { lexicon: surfaceSpellLexicon, malformed: malformedSpellRecords } =
    collectSurfaceSpellLexicon();
  if (malformedSpellRecords.length > 0) {
    console.error(
      "authored-id boundary check: malformed or duplicate Surface spell record(s):",
    );
    for (const malformed of malformedSpellRecords) {
      console.error(`  - ${malformed}`);
    }
    process.exit(1);
  }
  if (surfaceSpellLexicon.length === 0) {
    console.error(
      "authored-id boundary check: no decoded Surface spell records discovered",
    );
    process.exit(1);
  }

  const sourceFiles = listFiles(PACKAGES_ROOT)
    .map((filePath) =>
      path.relative(REPO_ROOT, filePath).replaceAll(path.sep, "/"),
    )
    .sort();

  assertEveryPathRuleMatches(
    sourceFiles,
    ALLOWLIST_PATH_RULES,
    "whole-file allowlist",
  );

  const sourceFilesSet = new Set(sourceFiles);
  const executionImportClosure = new Set([
    ...battleRuntimeExecutionImportClosure(),
    ...battleRuntimePublicExportOwnerFiles(),
  ]);
  const missingExecutionSources = [...executionImportClosure].filter(
    (relativePath) =>
      executionIdentityBoundaryReason(relativePath) === null &&
      !sourceFilesSet.has(relativePath),
  );
  assert.deepEqual(
    missingExecutionSources,
    [],
    "execution import closure contains production source outside the authored-identity scanner input",
  );
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
  const executionIdentityViolations = [];

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
    executionIdentityViolations.push(
      ...executionIdentityViolationsForFile(
        relativePath,
        content,
        surfaceSpellLexicon,
        executionImportClosure,
      ),
      ...executionDiagnosticViolationsForFile(
        relativePath,
        content,
        surfaceSpellLexicon,
      ),
    );
    violations.push(
      ...findViolationsForFile(
        relativePath,
        content,
        relativePath.startsWith("packages/battle-runtime/")
          ? battleAuthoredAlternation
          : authoredAlternation,
        sourceFilesSet,
        authoredExportsByFile,
      ),
    );
  }

  const uniqueViolations = dedupeViolations(violations);
  const uniqueExecutionIdentityViolations = dedupeExecutionIdentityViolations(
    executionIdentityViolations,
  );
  const executionIdentityExemptionResult =
    applyExecutionIdentityCollisionExemptions(
      uniqueExecutionIdentityViolations,
      EXECUTION_IDENTITY_COLLISION_EXEMPTIONS,
      EXECUTION_IDENTITY_COLLISION_SITE_EVIDENCE,
    );

  if (
    uniqueViolations.length > 0 ||
    executionIdentityExemptionResult.remaining.length > 0 ||
    executionIdentityExemptionResult.stale.length > 0 ||
    !executionIdentityExemptionResult.siteEvidenceMatches
  ) {
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
    }
    if (executionIdentityExemptionResult.remaining.length > 0) {
      const byRole = new Map();
      const bySpell = new Map();
      for (const violation of executionIdentityExemptionResult.remaining) {
        byRole.set(violation.role, (byRole.get(violation.role) ?? 0) + 1);
        bySpell.set(
          violation.spellId,
          (bySpell.get(violation.spellId) ?? 0) + 1,
        );
      }
      console.error(
        "authored spell identity remains in production execution roles:",
      );
      for (const violation of executionIdentityExemptionResult.remaining) {
        console.error(
          `  - ${violation.relativePath}:${violation.line}:${violation.column} [${violation.role}] ${violation.identifier} <- ${violation.spellId} (${violation.spellName})`,
        );
      }
      console.error(
        `execution identity violation count: ${executionIdentityExemptionResult.remaining.length}`,
      );
      console.error(
        `by role: ${formatCountMapEntries(byRole)
          .map(({ reason, count }) => `${reason}=${count}`)
          .join(", ")}`,
      );
      console.error(
        `by authored spell: ${formatCountMapEntries(bySpell)
          .map(({ reason, count }) => `${reason}=${count}`)
          .join(", ")}`,
      );
    }
    if (executionIdentityExemptionResult.stale.length > 0) {
      console.error("stale authored-identity collision exemption(s):");
      for (const exemption of executionIdentityExemptionResult.stale) {
        console.error(
          `  - ${exemption.spellId}/${exemption.role}/${exemption.identifier}: ${exemption.reason}`,
        );
      }
    }
    if (!executionIdentityExemptionResult.siteEvidenceMatches) {
      console.error("authored-identity collision site evidence changed:");
      console.error(
        `  - expected ${JSON.stringify(EXECUTION_IDENTITY_COLLISION_SITE_EVIDENCE)}`,
      );
      console.error(
        `  - observed ${JSON.stringify(executionIdentityExemptionResult.siteEvidence)}`,
      );
      console.error(
        "Every exempt occurrence is bound to its reviewed relative path, normalized owning statement, and count; review the added, removed, or copied collision before updating this certificate.",
      );
    }
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
  console.log(`decoded Surface spell records: ${surfaceSpellLexicon.length}`);
  console.log(
    `exact execution collision exemptions exercised: ${EXECUTION_IDENTITY_COLLISION_EXEMPTIONS.length}`,
  );
  console.log(
    `reviewed execution collision sites exercised: ${executionIdentityExemptionResult.siteEvidence.siteCount} sites / ${executionIdentityExemptionResult.siteEvidence.violationCount} occurrences`,
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
