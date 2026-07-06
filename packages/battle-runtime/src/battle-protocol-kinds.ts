// KERNEL-COVERAGE: runtime-owner BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY

import { Match } from "effect";
import type { BattleSubject } from "./battle-subjects.ts";
import type { BattleFill } from "./battle-reducer.ts";

const byBattleFillKind = Match.discriminator("kind");
const byBattleSubjectTag = Match.discriminator("tag");
const byAction = Match.discriminator("action");
const byCommand = Match.discriminator("command");
const byOption = Match.discriminator("option");

export type BattleFillKind = BattleFill["kind"];

export function battleFillKind(fill: BattleFill): BattleFillKind {
  return Match.value(fill)
    .pipe(
      byBattleFillKind("abilityCheck", () => "abilityCheck" as const),
      byBattleFillKind("abilityChoice", () => "abilityChoice" as const),
      byBattleFillKind(
        "attackDamageDisposition",
        () => "attackDamageDisposition" as const,
      ),
      byBattleFillKind("attackRoll", () => "attackRoll" as const),
      byBattleFillKind(
        "commandOptionChoice",
        () => "commandOptionChoice" as const,
      ),
      byBattleFillKind(
        "companionReappearanceInitiative",
        () => "companionReappearanceInitiative" as const,
      ),
      byBattleFillKind(
        "companionReappearancePlacement",
        () => "companionReappearancePlacement" as const,
      ),
      byBattleFillKind(
        "concentrationSavingThrow",
        () => "concentrationSavingThrow" as const,
      ),
      byBattleFillKind("conditionChoice", () => "conditionChoice" as const),
      byBattleFillKind("damageTypeChoice", () => "damageTypeChoice" as const),
      byBattleFillKind(
        "dancingLightsPlacement",
        () => "dancingLightsPlacement" as const,
      ),
      byBattleFillKind("deathSavingThrow", () => "deathSavingThrow" as const),
      byBattleFillKind(
        "findFamiliarConnection",
        () => "findFamiliarConnection" as const,
      ),
      byBattleFillKind("grappleOutcome", () => "grappleOutcome" as const),
      byBattleFillKind(
        "gustOfWindLineDirectionChoice",
        () => "gustOfWindLineDirectionChoice" as const,
      ),
      byBattleFillKind("heldObjectFacts", () => "heldObjectFacts" as const),
    )
    .pipe(
      byBattleFillKind(
        "hitPointHealingDistribution",
        () => "hitPointHealingDistribution" as const,
      ),
      byBattleFillKind("interruptDecision", () => "interruptDecision" as const),
      byBattleFillKind(
        "levitateAltitudeChange",
        () => "levitateAltitudeChange" as const,
      ),
      byBattleFillKind(
        "levitateInitialRise",
        () => "levitateInitialRise" as const,
      ),
      byBattleFillKind(
        "magicWeaponTargetItem",
        () => "magicWeaponTargetItem" as const,
      ),
      byBattleFillKind(
        "movableZoneRamMovement",
        () => "movableZoneRamMovement" as const,
      ),
      byBattleFillKind(
        "movableZoneRepositionMovement",
        () => "movableZoneRepositionMovement" as const,
      ),
      byBattleFillKind("movement", () => "movement" as const),
      byBattleFillKind(
        "objectContactTargets",
        () => "objectContactTargets" as const,
      ),
      byBattleFillKind(
        "objectDropResolution",
        () => "objectDropResolution" as const,
      ),
      byBattleFillKind(
        "objectTargetChoice",
        () => "objectTargetChoice" as const,
      ),
      byBattleFillKind(
        "ongoingSpellTargetChoice",
        () => "ongoingSpellTargetChoice" as const,
      ),
      byBattleFillKind("rolledDice", () => "rolledDice" as const),
      byBattleFillKind(
        "sanctuaryInterdictionOutcome",
        () => "sanctuaryInterdictionOutcome" as const,
      ),
      byBattleFillKind(
        "savingThrowOutcome",
        () => "savingThrowOutcome" as const,
      ),
      byBattleFillKind(
        "selfTransformationModeChoice",
        () => "selfTransformationModeChoice" as const,
      ),
      byBattleFillKind(
        "slowSomaticSpellFailureOutcome",
        () => "slowSomaticSpellFailureOutcome" as const,
      ),
    )
    .pipe(
      byBattleFillKind("shoveOutcome", () => "shoveOutcome" as const),
      byBattleFillKind("skillChoice", () => "skillChoice" as const),
      byBattleFillKind("spellAreaChoice", () => "spellAreaChoice" as const),
      byBattleFillKind(
        "spellTargetAllocation",
        () => "spellTargetAllocation" as const,
      ),
      byBattleFillKind("spellTargetList", () => "spellTargetList" as const),
      byBattleFillKind(
        "spiritualWeaponForcePosition",
        () => "spiritualWeaponForcePosition" as const,
      ),
      byBattleFillKind(
        "statBlockRechargeRoll",
        () => "statBlockRechargeRoll" as const,
      ),
      byBattleFillKind(
        "targetAbilityChoices",
        () => "targetAbilityChoices" as const,
      ),
      byBattleFillKind("targetChoice", () => "targetChoice" as const),
      byBattleFillKind(
        "targetSpatialFacts",
        () => "targetSpatialFacts" as const,
      ),
      byBattleFillKind(
        "teleportDestination",
        () => "teleportDestination" as const,
      ),
      byBattleFillKind(
        "thaumaturgyActiveOneMinuteEffectCount",
        () => "thaumaturgyActiveOneMinuteEffectCount" as const,
      ),
      byBattleFillKind(
        "toolPossessionFacts",
        () => "toolPossessionFacts" as const,
      ),
      byBattleFillKind(
        "unitFeatureDecision",
        () => "unitFeatureDecision" as const,
      ),
      byBattleFillKind(
        "wildShapeEquipmentDisposition",
        () => "wildShapeEquipmentDisposition" as const,
      ),
      Match.exhaustive,
    );
}

export function battleSubjectKind(subject: BattleSubject) {
  return Match.value(subject)
    .pipe(
      byBattleSubjectTag("action", actionSubjectKind),
      byBattleSubjectTag(
        "pactOfTheChainFamiliarAttack",
        () => "companionAttack" as const,
      ),
      byBattleSubjectTag("bonusAction", bonusActionSubjectKind),
      byBattleSubjectTag(
        "bonusActionStandardAction",
        bonusActionStandardActionSubjectKind,
      ),
      byBattleSubjectTag("monkFocusOption", monkFocusOptionSubjectKind),
      byBattleSubjectTag(
        "monkFocusFlurryOfBlowsStrike",
        () => "featureAttack" as const,
      ),
      byBattleSubjectTag("actionSpell", () => "actionMagic" as const),
      byBattleSubjectTag("bonusActionSpell", () => "bonusActionMagic" as const),
      byBattleSubjectTag(
        "bonusActionDashSpell",
        () => "spellGrantedMovement" as const,
      ),
      byBattleSubjectTag("unitFeature", () => "featureActivation" as const),
      byBattleSubjectTag(
        "unitFeatureHeldWeaponActivation",
        () => "featureWeaponActivation" as const,
      ),
      byBattleSubjectTag("druidWildShape", druidWildShapeSubjectKind),
      byBattleSubjectTag("companionLifecycle", companionLifecycleSubjectKind),
      byBattleSubjectTag(
        "findFamiliarSharedSenses",
        () => "companionSenses" as const,
      ),
      byBattleSubjectTag(
        "findFamiliarTouchSpell",
        findFamiliarTouchSpellSubjectKind,
      ),
    )
    .pipe(
      byBattleSubjectTag("runtimeCommand", runtimeCommandSubjectKind),
      Match.exhaustive,
    );
}
export type BattleSubjectKind = ReturnType<typeof battleSubjectKind>;

function actionSubjectKind(
  subject: Extract<BattleSubject, { readonly tag: "action" }>,
) {
  return Match.value(subject).pipe(
    byAction("attack", () => "actionAttack" as const),
    byAction("dash", () => "actionMovement" as const),
    byAction("disengage", () => "actionAvoidance" as const),
    byAction("dodge", () => "actionAvoidance" as const),
    byAction("helpAttack", () => "actionSupport" as const),
    byAction("hide", () => "actionExploration" as const),
    byAction("multiattack", () => "actionAttack" as const),
    byAction("search", () => "actionExploration" as const),
    byAction("ready", () => "actionReady" as const),
    byAction("grapple", () => "actionContest" as const),
    byAction("shove", () => "actionContest" as const),
    byAction("escapeGrapple", () => "actionContest" as const),
    byAction("escapeSpellRestraint", () => "actionContest" as const),
    byAction(
      "shakeAwakeFromSleep",
      () => "actionConditionIntervention" as const,
    ),
    byAction(
      "shakeAwakeFromHypnoticPattern",
      () => "actionConditionIntervention" as const,
    ),
    Match.exhaustive,
  );
}

function bonusActionSubjectKind(
  subject: Extract<BattleSubject, { readonly tag: "bonusAction" }>,
) {
  return Match.value(subject).pipe(
    byAction("offHandAttack", () => "bonusActionAttack" as const),
    byAction("martialArtsUnarmedStrike", () => "bonusActionAttack" as const),
    byAction("statBlockActionOption", () => "bonusActionAttack" as const),
    Match.exhaustive,
  );
}

function bonusActionStandardActionSubjectKind(
  subject: Extract<
    BattleSubject,
    { readonly tag: "bonusActionStandardAction" }
  >,
) {
  return Match.value(subject.action).pipe(
    Match.when("dash", () => "bonusActionGrantedStandardAction" as const),
    Match.when("disengage", () => "bonusActionGrantedStandardAction" as const),
    Match.when("hide", () => "bonusActionGrantedStandardAction" as const),
    Match.exhaustive,
  );
}

function monkFocusOptionSubjectKind(
  subject: Extract<BattleSubject, { readonly tag: "monkFocusOption" }>,
) {
  return Match.value(subject).pipe(
    byOption("flurryOfBlows", () => "featureOption" as const),
    byOption("patientDefense", () => "featureOption" as const),
    byOption("stepOfTheWind", () => "featureOption" as const),
    Match.exhaustive,
  );
}

function druidWildShapeSubjectKind(
  subject: Extract<BattleSubject, { readonly tag: "druidWildShape" }>,
) {
  return Match.value(subject).pipe(
    byAction("assumeForm", () => "formTransformation" as const),
    byAction("dismiss", () => "formTransformation" as const),
    Match.exhaustive,
  );
}

function companionLifecycleSubjectKind(
  subject: Extract<BattleSubject, { readonly tag: "companionLifecycle" }>,
) {
  return Match.value(subject.action).pipe(
    Match.when("temporarilyDismiss", () => "companionLifecycle" as const),
    Match.when("reappear", () => "companionLifecycle" as const),
    Match.when("permanentlyDismiss", () => "companionLifecycle" as const),
    Match.exhaustive,
  );
}

function findFamiliarTouchSpellSubjectKind(
  subject: Extract<BattleSubject, { readonly tag: "findFamiliarTouchSpell" }>,
) {
  return Match.value(subject.spellAction).pipe(
    Match.when("action", () => "companionDeliveredMagic" as const),
    Match.when("bonusAction", () => "companionDeliveredMagic" as const),
    Match.exhaustive,
  );
}

function runtimeCommandSubjectKind(
  subject: Extract<BattleSubject, { readonly tag: "runtimeCommand" }>,
) {
  return Match.value(subject)
    .pipe(
      byCommand("endTurn", () => "runtimeTurnBoundary" as const),
      byCommand("move", () => "runtimeMovement" as const),
      byCommand("standFromProne", () => "runtimeMovement" as const),
      byCommand("releaseReadiedSpell", () => "runtimeReadiedResponse" as const),
      byCommand(
        "releaseReadiedMovement",
        () => "runtimeReadiedResponse" as const,
      ),
      byCommand("castTriggeredReactionSpell", () => "runtimeReaction" as const),
      byCommand(
        "castAttackHitBonusActionSpell",
        () => "runtimeReaction" as const,
      ),
      byCommand("releaseGrapple", () => "runtimeLinkRelease" as const),
      byCommand("opportunityAttack", () => "runtimeReaction" as const),
      byCommand("greaseGroundHazardSave", () => "runtimeSavingThrow" as const),
      byCommand("webRestraintSave", () => "runtimeSavingThrow" as const),
      byCommand(
        "sleetStormAreaHazardSave",
        () => "runtimeSavingThrow" as const,
      ),
      byCommand(
        "webRestrainedNoLongerInArea",
        () => "runtimeEffectCleanup" as const,
      ),
      byCommand("webAreaRemoved", () => "runtimeEffectCleanup" as const),
      byCommand("gustOfWindLineSave", () => "runtimeSavingThrow" as const),
      byCommand(
        "gustOfWindLineDirectionChange",
        () => "runtimeEffectControl" as const,
      ),
    )
    .pipe(
      byCommand("movableZoneSave", () => "runtimeSavingThrow" as const),
      byCommand("moonbeamCylinderExit", () => "runtimeSavingThrow" as const),
      byCommand("movableZoneReposition", () => "runtimeEffectControl" as const),
      byCommand("movableZoneRam", () => "runtimeEffectControl" as const),
      byCommand(
        "releaseSpellCreatedHeldObject",
        () => "runtimeHeldObjectRelease" as const,
      ),
      byCommand(
        "protectionRelevantEffectSave",
        () => "runtimeProtectionSave" as const,
      ),
      byCommand("disperseFogCloud", () => "runtimeEffectCleanup" as const),
      byCommand("wardingBondSeparation", () => "runtimeEffectCleanup" as const),
      byCommand("jumpMovementReplacement", () => "runtimeMovement" as const),
      byCommand("dragonsBreathExhale", () => "runtimeAreaEffect" as const),
      byCommand(
        "replaceSelfTransformationMode",
        () => "runtimeTransformationMode" as const,
      ),
      byCommand("commandGrovel", () => "runtimeCompelledAction" as const),
      byCommand("commandDrop", () => "runtimeCompelledAction" as const),
      byCommand("commandApproach", () => "runtimeCompelledAction" as const),
      byCommand("commandFlee", () => "runtimeCompelledAction" as const),
      byCommand("endConcentration", () => "runtimeEffectCleanup" as const),
    )
    .pipe(
      byCommand(
        "levitateAltitudeControl",
        () => "runtimeAltitudeControl" as const,
      ),
      byCommand("creatureFalls", () => "runtimeMovement" as const),
      Match.exhaustive,
    );
}
