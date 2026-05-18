import { Match, Schema } from "effect";
import { STANDARD_ACTION_KINDS } from "@dnd/shared/game-facts";
import { SpellSlotLevel, spellSlotLevel } from "@dnd/shared/types";
import { CombatantId, SpellId, spellId as makeSpellId } from "./identity.ts";
import {
  BATTLE_REACTION_TRIGGERS,
  BATTLE_READIED_SPELL_TRIGGERS,
} from "./battle-reaction-triggers.ts";

export const BATTLE_SUBJECT_ACTIONS = [
  "attack",
  "dash",
  "disengage",
  "dodge",
  "helpAttack",
  "hide",
  "multiattack",
  "ready",
  "search",
  "grapple",
  "shove",
  "escapeGrapple",
  "escapeSpellRestraint",
  "shakeAwakeFromSleep",
] as const;
export type BattleSubjectAction = (typeof BATTLE_SUBJECT_ACTIONS)[number];

export const BATTLE_SUBJECT_BONUS_ACTIONS = [
  "offHandAttack",
  "martialArtsUnarmedStrike",
  "statBlockActionOption",
] as const;
export type BattleSubjectBonusAction =
  (typeof BATTLE_SUBJECT_BONUS_ACTIONS)[number];

export const BATTLE_RUNTIME_COMMANDS = [
  "endTurn",
  "move",
  "standFromProne",
  "releaseReadiedSpell",
  "releaseReadiedMovement",
  "castTriggeredReactionSpell",
  "castAttackHitBonusActionSpell",
  "releaseGrapple",
  "opportunityAttack",
  "greaseGroundHazardSave",
  "protectionRelevantEffectSave",
  "disperseFogCloud",
  "jumpMovementReplacement",
  "commandGrovel",
  "commandDrop",
  "commandApproach",
  "commandFlee",
  "creatureFalls",
] as const;
export type BattleRuntimeCommand = (typeof BATTLE_RUNTIME_COMMANDS)[number];
export const BATTLE_MOVEMENT_SPEED_KINDS = ["walk", "climb", "swim"] as const;
export type BattleMovementSpeedKind =
  (typeof BATTLE_MOVEMENT_SPEED_KINDS)[number];

export const BattleSubjectTextSchema = Schema.NonEmptyTrimmedString;

export const CANTRIP_SPELL_PROCEDURES = [
  "heldLight",
  "objectLight",
  "heldLightHurl",
  "dancingLightsSeparateCast",
  "dancingLightsCombinedCast",
  "dancingLightsReposition",
  "damageReduction",
  "makeStable",
  "spellAttackSequence",
  "spellHostedWeaponAttack",
  "weaponAttackOverride",
  "spellAttackDamage",
  "saveGatedDamage",
  "rollModifier",
  "thaumaturgyBoomingVoice",
] as const;
export type CantripSpellProcedure = (typeof CANTRIP_SPELL_PROCEDURES)[number];

export const SPELL_DAMAGE_PROCEDURES = [
  "spellAttackDamage",
  "saveGatedDamage",
] as const;
export type SpellDamageProcedure = (typeof SPELL_DAMAGE_PROCEDURES)[number];

export const SPELL_SLOT_PROCEDURES = [
  ...SPELL_DAMAGE_PROCEDURES,
  "attackBurstSaveDamage",
  "chainedSpellAttackDamage",
  "spellAttackSequence",
  "saveGatedCondition",
  "saveGatedAttackRollAdvantage",
  "sleepTargetAdmission",
  "hideousLaughter",
  "greaseGroundHazard",
  "fogCloudObscurement",
  "command",
  "repeatedDamageAllocation",
  "directHitPointRestoration",
  "rollModifier",
  "scalarBuff",
  "conditionImmunityAndTurnStartTemporaryHitPoints",
  "creatureTypeProtection",
  "blurAttackRollDefense",
  "weaponDamageRider",
  "afterHitDamage",
  "afterHitSaveGatedCondition",
  "afterHitTimedDamageAndSave",
  "afterHitDamageAndIllumination",
  "markedDamageRider",
  "expeditiousRetreatDash",
  "jumpMovementReplacement",
  "selfTeleport",
  "sanctuaryTargetingInterdiction",
  "persistentArmorEffect",
  "shieldReaction",
  "counterspell",
  "featherFallMitigation",
] as const;
export type SpellSlotProcedure = (typeof SPELL_SLOT_PROCEDURES)[number];

export const SpellInvocationRefSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("cantrip"),
    spellId: SpellId,
    procedure: Schema.Literal(...CANTRIP_SPELL_PROCEDURES),
  }),
  Schema.Struct({
    tag: Schema.Literal("spellSlot"),
    spellId: SpellId,
    slotLevel: SpellSlotLevel,
    procedure: Schema.Literal(...SPELL_SLOT_PROCEDURES),
  }),
  Schema.Struct({
    tag: Schema.Literal("classFeatureFreeCast"),
    spellId: SpellId,
    resourceUnitId: Schema.String,
    procedure: Schema.Literal("afterHitDamage", "markedDamageRider"),
  }),
  Schema.Struct({
    tag: Schema.Literal("armorOfShadows"),
    spellId: SpellId,
    procedure: Schema.Literal("persistentArmorEffect"),
  }),
  Schema.Struct({
    tag: Schema.Literal("spellEffect"),
    spellId: SpellId,
    sourceCombatantId: CombatantId,
    procedure: Schema.Literal("markedDamageRiderTransfer"),
  }),
);
export type SpellInvocationRef = typeof SpellInvocationRefSchema.Type;
export type SpellInvocationRefEncoded = typeof SpellInvocationRefSchema.Encoded;

export function cantripSpellInvocationRef(
  rawSpellId: string,
  procedure: CantripSpellProcedure,
): SpellInvocationRef {
  return {
    tag: "cantrip",
    spellId: makeSpellId(rawSpellId),
    procedure,
  };
}

export function spellSlotInvocationRef(
  rawSpellId: string,
  rawSlotLevel: number,
  procedure: SpellSlotProcedure,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: makeSpellId(rawSpellId),
    slotLevel: spellSlotLevel(rawSlotLevel),
    procedure,
  };
}

export function spellEffectInvocationRef(
  rawSpellId: string,
  sourceCombatantId: CombatantId,
  procedure: "markedDamageRiderTransfer",
): SpellInvocationRef {
  return {
    tag: "spellEffect",
    spellId: makeSpellId(rawSpellId),
    sourceCombatantId,
    procedure,
  };
}

export function classFeatureFreeCastSpellInvocationRef(
  rawSpellId: string,
  resourceUnitId: string,
  procedure: "afterHitDamage" | "markedDamageRider",
): SpellInvocationRef {
  return {
    tag: "classFeatureFreeCast",
    spellId: makeSpellId(rawSpellId),
    resourceUnitId,
    procedure,
  };
}

export function armorOfShadowsSpellInvocationRef(
  rawSpellId: string,
): SpellInvocationRef {
  return {
    tag: "armorOfShadows",
    spellId: makeSpellId(rawSpellId),
    procedure: "persistentArmorEffect",
  };
}

export const SpellSubjectModeSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("cast"),
  }),
  Schema.Struct({
    tag: Schema.Literal("ready"),
    trigger: Schema.Literal(...BATTLE_READIED_SPELL_TRIGGERS),
  }),
);
export type SpellSubjectMode = typeof SpellSubjectModeSchema.Type;

// BattleSubject is a replay key returned by discoverBattleActs and copied back
// by callers. It identifies one discovered runtime act; it is not Surface
// authored content, provenance, or a complete taxonomy of D&D actions.
export const BattleSubjectSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("attack"),
    attackName: BattleSubjectTextSchema,
    statBlockSection: Schema.optionalWith(
      Schema.Literal(
        "actions",
        "bonusActions",
        "reactions",
        "legendaryActions",
      ),
      { exact: true },
    ),
  }),
  Schema.Struct({
    tag: Schema.Literal("pactOfTheChainFamiliarAttack"),
    actorId: CombatantId,
    familiarId: CombatantId,
    attackName: BattleSubjectTextSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("dash"),
    speedKind: Schema.Literal(...BATTLE_MOVEMENT_SPEED_KINDS),
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("disengage"),
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("dodge"),
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("helpAttack"),
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("hide"),
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("multiattack"),
    multiattackName: BattleSubjectTextSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("search"),
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("ready"),
    readyTrigger: Schema.Literal(...BATTLE_REACTION_TRIGGERS),
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("grapple"),
    attackName: Schema.optionalWith(BattleSubjectTextSchema, { exact: true }),
    statBlockSection: Schema.optionalWith(
      Schema.Literal(
        "actions",
        "bonusActions",
        "reactions",
        "legendaryActions",
      ),
      { exact: true },
    ),
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("shove"),
    attackName: Schema.optionalWith(BattleSubjectTextSchema, { exact: true }),
    statBlockSection: Schema.optionalWith(
      Schema.Literal(
        "actions",
        "bonusActions",
        "reactions",
        "legendaryActions",
      ),
      { exact: true },
    ),
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("escapeGrapple"),
    attackName: Schema.optionalWith(BattleSubjectTextSchema, { exact: true }),
    statBlockSection: Schema.optionalWith(
      Schema.Literal(
        "actions",
        "bonusActions",
        "reactions",
        "legendaryActions",
      ),
      { exact: true },
    ),
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("escapeSpellRestraint"),
    targetId: CombatantId,
    sourceSpellId: SpellId,
    sourceCombatantId: CombatantId,
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("shakeAwakeFromSleep"),
  }),
  Schema.Union(
    Schema.Struct({
      tag: Schema.Literal("bonusAction"),
      actorId: CombatantId,
      action: Schema.Literal("offHandAttack"),
      attackName: BattleSubjectTextSchema,
    }),
    Schema.Struct({
      tag: Schema.Literal("bonusAction"),
      actorId: CombatantId,
      action: Schema.Literal("martialArtsUnarmedStrike"),
      attackName: BattleSubjectTextSchema,
    }),
  ),
  Schema.Struct({
    tag: Schema.Literal("bonusAction"),
    actorId: CombatantId,
    action: Schema.Literal("statBlockActionOption"),
    optionName: BattleSubjectTextSchema,
    standardAction: Schema.Literal(...STANDARD_ACTION_KINDS),
  }),
  Schema.Struct({
    tag: Schema.Literal("bonusActionStandardAction"),
    actorId: CombatantId,
    sourceUnitId: BattleSubjectTextSchema,
    action: Schema.Literal("dash"),
    speedKind: Schema.Literal(...BATTLE_MOVEMENT_SPEED_KINDS),
  }),
  Schema.Struct({
    tag: Schema.Literal("bonusActionStandardAction"),
    actorId: CombatantId,
    sourceUnitId: BattleSubjectTextSchema,
    action: Schema.Literal("disengage", "hide"),
  }),
  Schema.Struct({
    tag: Schema.Literal("actionSpell"),
    actorId: CombatantId,
    invocation: SpellInvocationRefSchema,
    mode: SpellSubjectModeSchema,
    componentWeaponItemId: Schema.optionalWith(BattleSubjectTextSchema, {
      exact: true,
    }),
  }),
  Schema.Struct({
    tag: Schema.Literal("bonusActionSpell"),
    actorId: CombatantId,
    invocation: SpellInvocationRefSchema,
    mode: Schema.Struct({
      tag: Schema.Literal("cast"),
    }),
    componentWeaponItemId: Schema.optionalWith(BattleSubjectTextSchema, {
      exact: true,
    }),
  }),
  Schema.Struct({
    tag: Schema.Literal("bonusActionDashSpell"),
    actorId: CombatantId,
    invocation: SpellInvocationRefSchema,
    mode: Schema.Struct({
      tag: Schema.Literal("cast"),
    }),
    speedKind: Schema.Literal(...BATTLE_MOVEMENT_SPEED_KINDS),
  }),
  Schema.Struct({
    tag: Schema.Literal("unitFeature"),
    actorId: CombatantId,
    unitId: BattleSubjectTextSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("endTurn"),
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("move"),
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("standFromProne"),
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("releaseReadiedSpell"),
    readiedSpellCasterId: CombatantId,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("releaseReadiedMovement"),
    readiedMovementActorId: CombatantId,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("castTriggeredReactionSpell"),
    reactorId: CombatantId,
    invocation: SpellInvocationRefSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("castAttackHitBonusActionSpell"),
    casterId: CombatantId,
    invocation: SpellInvocationRefSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("releaseGrapple"),
    targetId: CombatantId,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("opportunityAttack"),
    reactorId: CombatantId,
    targetId: CombatantId,
    attackName: BattleSubjectTextSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("greaseGroundHazardSave"),
    sourceCombatantId: CombatantId,
    sourceSpellId: SpellId,
    areaId: BattleSubjectTextSchema,
    trigger: Schema.Literal("entersArea", "endsTurnInArea"),
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("protectionRelevantEffectSave"),
    sourceCombatantId: CombatantId,
    sourceSpellId: SpellId,
    relevantEffect: Schema.Literal("charmed", "frightened", "possession"),
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("disperseFogCloud"),
    sourceCombatantId: CombatantId,
    sourceSpellId: SpellId,
    areaId: BattleSubjectTextSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("jumpMovementReplacement"),
    sourceCombatantId: CombatantId,
    sourceSpellId: SpellId,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("commandGrovel"),
    sourceCombatantId: CombatantId,
    sourceSpellId: SpellId,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("commandDrop"),
    sourceCombatantId: CombatantId,
    sourceSpellId: SpellId,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("commandApproach"),
    sourceCombatantId: CombatantId,
    sourceSpellId: SpellId,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("commandFlee"),
    sourceCombatantId: CombatantId,
    sourceSpellId: SpellId,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("creatureFalls"),
    fallingCreatureId: CombatantId,
  }),
);
export type BattleSubject = typeof BattleSubjectSchema.Type;

export type ActionHideSubject = {
  readonly tag: "action";
  readonly actorId: CombatantId;
  readonly action: "hide";
};
export type ActionSearchSubject = {
  readonly tag: "action";
  readonly actorId: CombatantId;
  readonly action: "search";
};
export type BonusActionStandardActionSubject = {
  readonly tag: "bonusActionStandardAction";
  readonly actorId: CombatantId;
  readonly sourceUnitId: string;
} & (
  | {
      readonly action: "dash";
      readonly speedKind: BattleMovementSpeedKind;
    }
  | {
      readonly action: "disengage" | "hide";
    }
);

export function sameBattleSubject(
  left: BattleSubject,
  right: BattleSubject,
): boolean {
  return battleSubjectKey(left) === battleSubjectKey(right);
}

function spellInvocationRefKey(ref: SpellInvocationRef): readonly unknown[] {
  return Match.value(ref).pipe(
    Match.when({ tag: "cantrip" }, (cantrip) => [
      cantrip.tag,
      cantrip.spellId,
      cantrip.procedure,
    ]),
    Match.when({ tag: "spellSlot" }, (slot) => [
      slot.tag,
      slot.spellId,
      slot.slotLevel,
      slot.procedure,
    ]),
    Match.when({ tag: "classFeatureFreeCast" }, (freeCast) => [
      freeCast.tag,
      freeCast.spellId,
      freeCast.resourceUnitId,
      freeCast.procedure,
    ]),
    Match.when({ tag: "armorOfShadows" }, (armorOfShadows) => [
      armorOfShadows.tag,
      armorOfShadows.spellId,
      armorOfShadows.procedure,
    ]),
    Match.when({ tag: "spellEffect" }, (effect) => [
      effect.tag,
      effect.spellId,
      effect.sourceCombatantId,
      effect.procedure,
    ]),
    Match.exhaustive,
  );
}

function spellSubjectModeKey(mode: SpellSubjectMode): readonly unknown[] {
  return mode.tag === "cast" ? [mode.tag] : [mode.tag, mode.trigger];
}

function battleSubjectKey(subject: BattleSubject): string {
  if (subject.tag === "action" && subject.action === "shakeAwakeFromSleep") {
    return JSON.stringify([subject.tag, subject.actorId, subject.action]);
  }
  if (subject.tag === "action" && subject.action === "shove") {
    return JSON.stringify([
      subject.tag,
      subject.actorId,
      subject.action,
      subject.attackName ?? null,
      subject.statBlockSection ?? null,
    ]);
  }
  if (subject.tag === "bonusActionDashSpell") {
    return JSON.stringify([
      subject.tag,
      subject.actorId,
      spellInvocationRefKey(subject.invocation),
      spellSubjectModeKey(subject.mode),
      subject.speedKind,
    ]);
  }
  if (
    subject.tag === "bonusAction" &&
    (subject.action === "offHandAttack" ||
      subject.action === "martialArtsUnarmedStrike")
  ) {
    return JSON.stringify([
      subject.tag,
      subject.actorId,
      subject.action,
      subject.attackName,
    ]);
  }
  return Match.value(subject).pipe(
    Match.when({ tag: "action", action: "attack" }, (attack) =>
      JSON.stringify([
        attack.tag,
        attack.actorId,
        attack.action,
        attack.attackName,
        attack.statBlockSection ?? null,
      ]),
    ),
    Match.when({ tag: "pactOfTheChainFamiliarAttack" }, (attack) =>
      JSON.stringify([
        attack.tag,
        attack.actorId,
        attack.familiarId,
        attack.attackName,
      ]),
    ),
    Match.when({ tag: "action", action: "dash" }, (action) =>
      JSON.stringify([
        action.tag,
        action.actorId,
        action.action,
        action.speedKind,
      ]),
    ),
    Match.when({ tag: "action", action: "disengage" }, (action) =>
      JSON.stringify([action.tag, action.actorId, action.action]),
    ),
    Match.when({ tag: "action", action: "dodge" }, (action) =>
      JSON.stringify([action.tag, action.actorId, action.action]),
    ),
    Match.when({ tag: "action", action: "helpAttack" }, (action) =>
      JSON.stringify([action.tag, action.actorId, action.action]),
    ),
    Match.when({ tag: "action", action: "hide" }, (action) =>
      JSON.stringify([action.tag, action.actorId, action.action]),
    ),
    Match.when({ tag: "action", action: "multiattack" }, (action) =>
      JSON.stringify([
        action.tag,
        action.actorId,
        action.action,
        action.multiattackName,
      ]),
    ),
    Match.when({ tag: "action", action: "ready" }, (action) =>
      JSON.stringify([
        action.tag,
        action.actorId,
        action.action,
        "readyTrigger" in action ? action.readyTrigger : null,
      ]),
    ),
    Match.when({ tag: "action", action: "search" }, (action) =>
      JSON.stringify([action.tag, action.actorId, action.action]),
    ),
    Match.when({ tag: "action", action: "grapple" }, (action) =>
      JSON.stringify([
        action.tag,
        action.actorId,
        action.action,
        action.attackName ?? null,
        action.statBlockSection ?? null,
      ]),
    ),
    Match.when({ tag: "action", action: "escapeGrapple" }, (action) =>
      JSON.stringify([
        action.tag,
        action.actorId,
        action.action,
        action.attackName ?? null,
        action.statBlockSection ?? null,
      ]),
    ),
    Match.when({ tag: "action", action: "escapeSpellRestraint" }, (action) =>
      JSON.stringify([
        action.tag,
        action.actorId,
        action.action,
        action.targetId,
        action.sourceSpellId,
        action.sourceCombatantId,
      ]),
    ),
    Match.when(
      { tag: "bonusAction", action: "statBlockActionOption" },
      (action) =>
        JSON.stringify([
          action.tag,
          action.actorId,
          action.action,
          action.optionName,
          action.standardAction,
        ]),
    ),
    Match.when({ tag: "bonusActionStandardAction" }, (action) =>
      JSON.stringify([
        action.tag,
        action.actorId,
        action.sourceUnitId,
        action.action,
        "speedKind" in action ? action.speedKind : null,
      ]),
    ),
    Match.when({ tag: "actionSpell" }, (spell) =>
      JSON.stringify([
        spell.tag,
        spell.actorId,
        spellInvocationRefKey(spell.invocation),
        spellSubjectModeKey(spell.mode),
        spell.componentWeaponItemId ?? null,
      ]),
    ),
    Match.when({ tag: "bonusActionSpell" }, (spell) =>
      JSON.stringify([
        spell.tag,
        spell.actorId,
        spellInvocationRefKey(spell.invocation),
        spellSubjectModeKey(spell.mode),
        spell.componentWeaponItemId ?? null,
      ]),
    ),
    Match.when({ tag: "unitFeature" }, (feature) =>
      JSON.stringify([feature.tag, feature.actorId, feature.unitId]),
    ),
    Match.when({ tag: "runtimeCommand" }, (command) =>
      JSON.stringify([
        command.tag,
        command.actorId,
        command.command,
        "readiedSpellCasterId" in command ? command.readiedSpellCasterId : null,
        "readiedMovementActorId" in command
          ? command.readiedMovementActorId
          : null,
        "targetId" in command ? command.targetId : null,
        "reactorId" in command ? command.reactorId : null,
        "invocation" in command
          ? spellInvocationRefKey(command.invocation)
          : null,
        "attackName" in command ? command.attackName : null,
        "sourceCombatantId" in command ? command.sourceCombatantId : null,
        "sourceSpellId" in command ? command.sourceSpellId : null,
        "areaId" in command ? command.areaId : null,
        "trigger" in command ? command.trigger : null,
        "relevantEffect" in command ? command.relevantEffect : null,
      ]),
    ),
    Match.exhaustive,
  );
}
