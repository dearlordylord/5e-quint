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
  "escapeGrapple",
  "escapeSpellRestraint",
] as const;
export type BattleSubjectAction = (typeof BATTLE_SUBJECT_ACTIONS)[number];

export const BATTLE_SUBJECT_BONUS_ACTIONS = [
  "offHandAttack",
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
  "releaseGrapple",
  "opportunityAttack",
] as const;
export type BattleRuntimeCommand = (typeof BATTLE_RUNTIME_COMMANDS)[number];
export const BATTLE_MOVEMENT_SPEED_KINDS = ["walk", "climb", "swim"] as const;
export type BattleMovementSpeedKind =
  (typeof BATTLE_MOVEMENT_SPEED_KINDS)[number];

export const BattleSubjectTextSchema = Schema.NonEmptyTrimmedString;

export const CANTRIP_SPELL_PROCEDURES = [
  "spellAttackDamage",
  "saveGatedDamage",
] as const;
export type CantripSpellProcedure = (typeof CANTRIP_SPELL_PROCEDURES)[number];

export const SPELL_DAMAGE_PROCEDURES = [
  "spellAttackDamage",
  "saveGatedDamage",
] as const;
export type SpellDamageProcedure = (typeof SPELL_DAMAGE_PROCEDURES)[number];

export const SPELL_SLOT_PROCEDURES = [
  ...SPELL_DAMAGE_PROCEDURES,
  "saveGatedCondition",
  "repeatedDamageAllocation",
  "directHitPointRestoration",
  "persistentArmorEffect",
  "shieldReaction",
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
    sourceSpellId: SpellId,
    sourceCombatantId: CombatantId,
  }),
  Schema.Struct({
    tag: Schema.Literal("bonusAction"),
    actorId: CombatantId,
    action: Schema.Literal("offHandAttack"),
    attackName: BattleSubjectTextSchema,
  }),
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
  }),
  Schema.Struct({
    tag: Schema.Literal("bonusActionSpell"),
    actorId: CombatantId,
    invocation: SpellInvocationRefSchema,
    mode: Schema.Struct({
      tag: Schema.Literal("cast"),
    }),
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
  return ref.tag === "cantrip"
    ? [ref.tag, ref.spellId, ref.procedure]
    : [ref.tag, ref.spellId, ref.slotLevel, ref.procedure];
}

function spellSubjectModeKey(mode: SpellSubjectMode): readonly unknown[] {
  return mode.tag === "cast" ? [mode.tag] : [mode.tag, mode.trigger];
}

function battleSubjectKey(subject: BattleSubject): string {
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
        action.sourceSpellId,
        action.sourceCombatantId,
      ]),
    ),
    Match.when({ tag: "bonusAction", action: "offHandAttack" }, (attack) =>
      JSON.stringify([
        attack.tag,
        attack.actorId,
        attack.action,
        attack.attackName,
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
      ]),
    ),
    Match.when({ tag: "bonusActionSpell" }, (spell) =>
      JSON.stringify([
        spell.tag,
        spell.actorId,
        spellInvocationRefKey(spell.invocation),
        spellSubjectModeKey(spell.mode),
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
        "targetId" in command ? command.targetId : null,
        "invocation" in command
          ? spellInvocationRefKey(command.invocation)
          : null,
        "attackName" in command ? command.attackName : null,
      ]),
    ),
    Match.exhaustive,
  );
}
