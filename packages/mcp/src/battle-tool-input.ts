import {
  combatantId,
  type BattleFill,
  type BattleSubject,
  type CombatantId,
} from "@dnd/battle-runtime";
import type { StatBlockId } from "@dnd/surface/surface/stat-block-catalog";

import { decodeBattleFill } from "./battle-fill-input.ts";
import {
  invalidFieldContent,
  isRecord,
  isToolError,
  readToolArgsRecord,
  type ToolError,
} from "./tool-input-helpers.ts";

type McpObjectInputSchema = Readonly<Record<string, unknown>> & {
  readonly type: "object";
};

export const selectStatBlockInputSchema = {
  type: "object",
  required: ["statBlockId"],
  properties: {
    statBlockId: {
      type: "string",
      description: "SRD Stat Block id from the Surface Stat Block catalog.",
    },
  },
  additionalProperties: false,
} satisfies McpObjectInputSchema;

export const readBattleStateInputSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
} satisfies McpObjectInputSchema;

export const discoverBattleActsInputSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
} satisfies McpObjectInputSchema;

export const fillBattleHoleInputSchema = {
  type: "object",
  required: ["subject", "fill"],
  properties: {
    subject: {
      type: "object",
      description:
        "Battle act subject returned by discover_battle_acts. Attack subjects use action=attack plus attackName; Magic subjects use action=magic plus spellId.",
    },
    fill: {
      type: "object",
      description:
        "One BattleFill for the current act replay: targetChoice, attackRoll, or rolledDice. attackRoll values may include rollMode: normal, advantage, or disadvantage.",
    },
  },
  additionalProperties: false,
} satisfies McpObjectInputSchema;

export const resolveBattleActInputSchema = {
  type: "object",
  required: ["subject"],
  properties: {
    subject: {
      type: "object",
      description:
        "Battle act subject returned by discover_battle_acts. Used for acts that do not need holes, such as Action Surge.",
    },
  },
  additionalProperties: false,
} satisfies McpObjectInputSchema;

export const endTurnInputSchema = {
  type: "object",
  required: ["actorId"],
  properties: {
    actorId: { type: "string" },
  },
  additionalProperties: false,
} satisfies McpObjectInputSchema;

export const endBattleInputSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
} satisfies McpObjectInputSchema;

export type BattleActorToolInput = {
  readonly actorId: CombatantId;
};

export type FillBattleHoleToolInput = {
  readonly subject: BattleSubject;
  readonly fill: BattleFill;
};

export type ResolveBattleActToolInput = {
  readonly subject: BattleSubject;
};

export function decodeSelectStatBlockArgs(
  args: unknown,
  toolName: string,
): StatBlockId | ToolError {
  const record = readToolArgsRecord(args, toolName, ["statBlockId"]);
  if (isToolError(record)) return record;
  if (typeof record.statBlockId !== "string") {
    return invalidFieldContent(toolName, "statBlockId", "string");
  }
  return record.statBlockId;
}

export function decodeReadBattleStateArgs(
  args: unknown,
  toolName: string,
): Record<string, never> | ToolError {
  const record = readToolArgsRecord(args, toolName, []);
  return isToolError(record) ? record : {};
}

export function decodeDiscoverBattleActsArgs(
  args: unknown,
  toolName: string,
): Record<string, never> | ToolError {
  const record = readToolArgsRecord(args, toolName, []);
  return isToolError(record) ? record : {};
}

export function decodeFillBattleHoleArgs(
  args: unknown,
  toolName: string,
): FillBattleHoleToolInput | ToolError {
  const record = readToolArgsRecord(args, toolName, ["subject", "fill"]);
  if (isToolError(record)) return record;
  const subject = decodeBattleSubject(record.subject, toolName, "subject");
  if (isToolError(subject)) return subject;
  const fill = decodeBattleFill(record.fill, toolName);
  if (isToolError(fill)) return fill;

  return {
    subject,
    fill,
  };
}

export function decodeResolveBattleActArgs(
  args: unknown,
  toolName: string,
): ResolveBattleActToolInput | ToolError {
  const record = readToolArgsRecord(args, toolName, ["subject"]);
  if (isToolError(record)) return record;
  const subject = decodeBattleSubject(record.subject, toolName, "subject");
  return isToolError(subject) ? subject : { subject };
}

export function decodeEndTurnArgs(
  args: unknown,
  toolName: string,
): BattleActorToolInput | ToolError {
  const record = readToolArgsRecord(args, toolName, ["actorId"]);
  if (isToolError(record)) return record;
  if (typeof record.actorId !== "string") {
    return invalidFieldContent(toolName, "actorId", "string");
  }

  return { actorId: combatantId(record.actorId) };
}

export function decodeEndBattleArgs(
  args: unknown,
  toolName: string,
): Record<string, never> | ToolError {
  const record = readToolArgsRecord(args, toolName, []);
  return isToolError(record) ? record : {};
}

export function isBattleToolError(value: unknown): value is ToolError {
  return isToolError(value);
}

function decodeBattleSubject(
  value: unknown,
  toolName: string,
  field: string,
): BattleSubject | ToolError {
  if (!isRecord(value)) {
    return invalidFieldContent(toolName, field, "BattleSubject object");
  }
  const actorId = decodeSubjectActorId(value, toolName, field);
  if (isToolError(actorId)) return actorId;

  if (value.tag === "unitFeature") {
    if (typeof value.unitId !== "string" || value.unitId.trim() === "") {
      return invalidFieldContent(
        toolName,
        `${field}.unitId`,
        "non-empty string",
      );
    }
    return { tag: "unitFeature", actorId, unitId: value.unitId };
  }

  if (value.tag === "srdAction") {
    if (value.action === "attack") {
      if (
        typeof value.attackName !== "string" ||
        value.attackName.trim() === ""
      ) {
        return invalidFieldContent(
          toolName,
          `${field}.attackName`,
          "non-empty string",
        );
      }
      return {
        tag: "srdAction",
        actorId,
        action: "attack",
        attackName: value.attackName,
      };
    }
    if (value.action === "magic") {
      if (typeof value.spellId !== "string" || value.spellId.trim() === "") {
        return invalidFieldContent(
          toolName,
          `${field}.spellId`,
          "non-empty string",
        );
      }
      return {
        tag: "srdAction",
        actorId,
        action: "magic",
        spellId: value.spellId,
      };
    }
    return invalidFieldContent(toolName, `${field}.action`, "attack or magic");
  }

  return invalidFieldContent(
    toolName,
    `${field}.tag`,
    "srdAction or unitFeature",
  );
}

function decodeSubjectActorId(
  record: Readonly<Record<string, unknown>>,
  toolName: string,
  field: string,
): CombatantId | ToolError {
  if (typeof record.actorId !== "string" || record.actorId.trim() === "") {
    return invalidFieldContent(
      toolName,
      `${field}.actorId`,
      "non-empty string",
    );
  }
  return combatantId(record.actorId);
}
