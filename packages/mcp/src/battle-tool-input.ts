import {
  combatantId,
  type BattleFill,
  type BattleSubject,
  type CombatantId,
} from "@dnd/battle-runtime";
import type { StatBlockId } from "@dnd/surface/surface/stat-block-catalog";
import { JSONSchema, Schema } from "effect";

import { decodeBattleFill } from "./battle-fill-input.ts";
import {
  invalidFieldContent,
  isRecord,
  isToolError,
  type ToolError,
} from "./tool-input-helpers.ts";
import {
  decodeToolArgs,
  mcpObjectJsonSchema,
  type McpObjectInputSchema,
} from "./schema-codec.ts";

const EmptyArgsSchema = Schema.Struct({});
const CombatantIdTextSchema = Schema.NonEmptyTrimmedString.annotations({
  description: "Combatant id from the current battle snapshot.",
});
const BattleSubjectArgsSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("srdAction"),
    actorId: CombatantIdTextSchema,
    action: Schema.Literal("attack"),
    attackName: Schema.NonEmptyTrimmedString.annotations({
      description:
        "Attack name from a subject returned by discover_battle_acts.",
    }),
  }),
  Schema.Struct({
    tag: Schema.Literal("srdAction"),
    actorId: CombatantIdTextSchema,
    action: Schema.Literal("magic"),
    spellId: Schema.NonEmptyTrimmedString.annotations({
      description: "Spell id from a subject returned by discover_battle_acts.",
    }),
  }),
  Schema.Struct({
    tag: Schema.Literal("unitFeature"),
    actorId: CombatantIdTextSchema,
    unitId: Schema.NonEmptyTrimmedString.annotations({
      description:
        "Feature Unit id from a no-hole subject returned by discover_battle_acts, such as fighter_action_surge.",
    }),
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantIdTextSchema,
    command: Schema.Literal("endTurn"),
  }),
);
const PositiveIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThan(0),
);
const BattleFillArgsSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("targetChoice"),
    holeId: Schema.NonEmptyTrimmedString.annotations({
      description: "Target hole id from initialHoles or result.holes.",
    }),
    value: Schema.NonEmptyTrimmedString.annotations({
      description: "Target combatantId from the battle snapshot.",
    }),
  }),
  Schema.Struct({
    kind: Schema.Literal("attackRoll"),
    holeId: Schema.NonEmptyTrimmedString.annotations({
      description: "Attack-roll hole id from initialHoles or result.holes.",
    }),
    value: Schema.Struct({
      total: Schema.Number.pipe(Schema.int()),
      naturalD20: Schema.Number.pipe(Schema.int(), Schema.between(1, 20)),
      rollMode: Schema.optionalWith(
        Schema.Literal("normal", "advantage", "disadvantage"),
        { exact: true },
      ),
    }),
  }),
  Schema.Struct({
    kind: Schema.Literal("rolledDice"),
    holeId: Schema.NonEmptyTrimmedString.annotations({
      description:
        "Exact damage-result hole id from initialHoles or result.holes.",
    }),
    value: Schema.NonEmptyArray(
      Schema.Struct({
        results: Schema.NonEmptyArray(PositiveIntegerSchema),
      }),
    ),
  }),
);
const SelectStatBlockArgsSchema = Schema.Struct({
  statBlockId: Schema.NonEmptyTrimmedString.annotations({
    description: "SRD Stat Block id from list_stat_blocks.",
  }),
});
const FillBattleHoleArgsSchema = Schema.Struct({
  subject: BattleSubjectArgsSchema.annotations({
    description:
      "Battle act subject returned by discover_battle_acts. Copy it exactly.",
  }),
  fill: BattleFillArgsSchema.annotations({
    description:
      "One BattleFill for the current act replay: targetChoice, attackRoll, or rolledDice.",
  }),
});
const ResolveBattleActArgsSchema = Schema.Struct({
  subject: BattleSubjectArgsSchema.annotations({
    description:
      "No-hole battle act subject returned by discover_battle_acts, such as Action Surge.",
  }),
});
const EndTurnArgsSchema = Schema.Struct({ actorId: CombatantIdTextSchema });

export const selectStatBlockInputSchema = JSONSchema.make(
  SelectStatBlockArgsSchema,
) as unknown as McpObjectInputSchema;
export const readBattleStateInputSchema = mcpObjectJsonSchema(EmptyArgsSchema);
export const discoverBattleActsInputSchema =
  mcpObjectJsonSchema(EmptyArgsSchema);
export const fillBattleHoleInputSchema = JSONSchema.make(
  FillBattleHoleArgsSchema,
) as unknown as McpObjectInputSchema;
export const resolveBattleActInputSchema = JSONSchema.make(
  ResolveBattleActArgsSchema,
) as unknown as McpObjectInputSchema;
export const endTurnInputSchema = JSONSchema.make(
  EndTurnArgsSchema,
) as unknown as McpObjectInputSchema;
export const endBattleInputSchema = mcpObjectJsonSchema(EmptyArgsSchema);

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
  const record = decodeToolArgs(SelectStatBlockArgsSchema, args, toolName);
  if (isToolError(record)) return record;
  return record.statBlockId;
}

export function decodeReadBattleStateArgs(
  args: unknown,
  toolName: string,
): Record<string, never> | ToolError {
  return decodeEmptyArgs(args, toolName);
}

export function decodeDiscoverBattleActsArgs(
  args: unknown,
  toolName: string,
): Record<string, never> | ToolError {
  return decodeEmptyArgs(args, toolName);
}

export function decodeFillBattleHoleArgs(
  args: unknown,
  toolName: string,
): FillBattleHoleToolInput | ToolError {
  const record = decodeToolArgs(FillBattleHoleArgsSchema, args, toolName);
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
  const record = decodeToolArgs(ResolveBattleActArgsSchema, args, toolName);
  if (isToolError(record)) return record;
  const subject = decodeBattleSubject(record.subject, toolName, "subject");
  return isToolError(subject) ? subject : { subject };
}

export function decodeEndTurnArgs(
  args: unknown,
  toolName: string,
): BattleActorToolInput | ToolError {
  const record = decodeToolArgs(EndTurnArgsSchema, args, toolName);
  if (isToolError(record)) return record;
  return { actorId: combatantId(record.actorId) };
}

export function decodeEndBattleArgs(
  args: unknown,
  toolName: string,
): Record<string, never> | ToolError {
  return decodeEmptyArgs(args, toolName);
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
    const exact = assertExactFields(value, toolName, field, [
      "tag",
      "actorId",
      "unitId",
    ]);
    if (isToolError(exact)) return exact;
    if (typeof value.unitId !== "string" || value.unitId.trim() === "") {
      return invalidFieldContent(
        toolName,
        `${field}.unitId`,
        "non-empty string",
      );
    }
    return { tag: "unitFeature", actorId, unitId: value.unitId };
  }

  if (value.tag === "runtimeCommand") {
    const exact = assertExactFields(value, toolName, field, [
      "tag",
      "actorId",
      "command",
    ]);
    if (isToolError(exact)) return exact;
    if (value.command !== "endTurn") {
      return invalidFieldContent(toolName, `${field}.command`, "endTurn");
    }
    return { tag: "runtimeCommand", actorId, command: "endTurn" };
  }

  if (value.tag === "srdAction") {
    if (value.action === "attack") {
      const exact = assertExactFields(value, toolName, field, [
        "tag",
        "actorId",
        "action",
        "attackName",
      ]);
      if (isToolError(exact)) return exact;
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
      const exact = assertExactFields(value, toolName, field, [
        "tag",
        "actorId",
        "action",
        "spellId",
      ]);
      if (isToolError(exact)) return exact;
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
    "srdAction, unitFeature, or runtimeCommand",
  );
}

function assertExactFields(
  record: Readonly<Record<string, unknown>>,
  toolName: string,
  field: string,
  allowedFields: readonly string[],
): ToolError | null {
  for (const key of Object.keys(record)) {
    if (!allowedFields.includes(key)) {
      return invalidFieldContent(toolName, `${field}.${key}`, "no field");
    }
  }
  return null;
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

function decodeEmptyArgs(args: unknown, toolName: string) {
  const decoded = decodeToolArgs(EmptyArgsSchema, args, toolName);
  return isToolError(decoded) ? decoded : {};
}
