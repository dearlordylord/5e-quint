import { Match, Schema } from "effect";

import {
  BATTLE_TABLE_EVENT_TYPES,
  CREATURE_TABLE_EVENT_TYPES,
  CREATURE_HAZARD_TABLE_EVENT_TYPES,
  type CreatureHazardTableEventType,
  type RecordTableEventResult,
  TableEventCommandSchema,
  tableEventCommandSchemaForType,
  type TableEventCommand,
  type TableEventWarning,
  type CreatureSemanticTriggerTableEventType,
} from "@dnd/core/available-actions.ts";
import type { BattleEvent } from "@dnd/core/battle-machine-events.ts";
import { encodeDndContext } from "@dnd/core/context-encoding.ts";
import {
  canUseIndomitable,
  canUseTacticalMind,
} from "@dnd/core/features/class-fighter.ts";
import type { DndEvent } from "@dnd/core/machine-types.ts";
import { isIncapacitated } from "@dnd/core/machine-queries.ts";
import {
  CreatureId,
  healAmount,
  tempHp,
  type Condition,
  type DamageType,
} from "@dnd/core/types.ts";

import {
  type BattleActor,
  type DndActor,
  type SupportedActionHost,
  battleSnapshotUnchanged,
  encodeBattleRuntimeState,
  errorContent,
  jsonContent,
} from "./server-shared.ts";

const strictCommandParseOptions = { onExcessProperty: "error" } as const;
const TABLE_EVENT_TYPES = [
  ...CREATURE_TABLE_EVENT_TYPES,
  ...BATTLE_TABLE_EVENT_TYPES,
] as const;
const TABLE_EVENT_TYPE_SET = new Set<string>(TABLE_EVENT_TYPES);

function formatSchemaValue(value: unknown): string {
  if (value === undefined) return "(missing)";
  if (typeof value === "string") return JSON.stringify(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function invalidTableEventContent(args: unknown) {
  const actualType =
    typeof args === "object" && args !== null && !Array.isArray(args)
      ? Reflect.get(args, "type")
      : undefined;
  return errorContent(
    "Invalid record_table_event input",
    `Invalid table event.${typeof actualType === "string" ? ` Received type: ${JSON.stringify(actualType)}.` : ` Received: ${formatSchemaValue(args)}.`} Valid types: ${TABLE_EVENT_TYPES.join(", ")}.`,
  );
}

export function tableEventWarning(
  code: TableEventWarning["code"],
  message: string,
): TableEventWarning {
  return { code, message };
}

export function tableEventSuccess<State>(
  appliedEvent: TableEventCommand,
  warnings: ReadonlyArray<TableEventWarning>,
  state: State,
) {
  const result: RecordTableEventResult<State> = {
    success: true,
    appliedEvent,
    warnings,
    state,
  };
  return jsonContent(result);
}

function tableEventNotAccepted<State>(
  command: TableEventCommand,
  warnings: ReadonlyArray<TableEventWarning>,
  state: State,
) {
  const result: RecordTableEventResult<State> = {
    success: false,
    appliedEvent: null,
    warnings,
    state,
    error: {
      code: "TABLE_EVENT_NOT_ACCEPTED",
      message: "Table event is not accepted in the current host state",
      event: command,
    },
  };
  return { ...jsonContent(result), isError: true as const };
}

function externalTableFactWarning(
  command: TableEventCommand,
): TableEventWarning {
  return tableEventWarning(
    "external_table_fact",
    `${command.type} records a table fact rather than an ordinary suggested action.`,
  );
}

function semanticBypassWarnings(
  command: TableEventCommand,
): ReadonlyArray<TableEventWarning> {
  if (!("semanticAction" in command) || command.semanticAction == null) {
    return [];
  }
  return [
    tableEventWarning(
      "bypasses_semantic_action",
      `${command.type} bypasses the stricter ${command.semanticAction.kind} action path for ${command.semanticAction.name}. Prefer a modeled action token when one exists.`,
    ),
  ];
}

function tableEventWarnings(
  command: TableEventCommand,
): ReadonlyArray<TableEventWarning> {
  return [
    externalTableFactWarning(command),
    ...semanticBypassWarnings(command),
  ];
}

function damageTypeSet(
  values: ReadonlyArray<DamageType> | undefined,
): ReadonlySet<DamageType> {
  return new Set(values ?? []);
}

function conditionSet(
  values: ReadonlyArray<Condition> | undefined,
): ReadonlySet<Condition> | undefined {
  return values == null ? undefined : new Set(values);
}

type CreatureDirectTableEventCommand = Exclude<
  Extract<TableEventCommand, { readonly scope: "creature" }>,
  {
    readonly type:
      | CreatureSemanticTriggerTableEventType
      | CreatureHazardTableEventType;
  }
>;

type CreatureSemanticTriggerCommand = Extract<
  TableEventCommand,
  {
    readonly scope: "creature";
    readonly type: CreatureSemanticTriggerTableEventType;
  }
>;

type CreatureHazardCommand = Extract<
  TableEventCommand,
  {
    readonly scope: "creature";
    readonly type: CreatureHazardTableEventType;
  }
>;

const CREATURE_HAZARD_TYPE_SET = new Set<string>(
  CREATURE_HAZARD_TABLE_EVENT_TYPES,
);

function buildCreatureTableEvent(
  command: CreatureDirectTableEventCommand,
): DndEvent {
  return Match.value(command).pipe(
    Match.when({ type: "TAKE_DAMAGE" }, (c) => ({
      type: "TAKE_DAMAGE" as const,
      amount: c.amount,
      damageType: c.damageType,
      resistances: damageTypeSet(c.resistances),
      vulnerabilities: damageTypeSet(c.vulnerabilities),
      immunities: damageTypeSet(c.immunities),
      isCritical: c.isCritical ?? false,
    })),
    Match.when({ type: "HEAL" }, (c) => ({
      type: "HEAL" as const,
      amount: healAmount(c.amount),
    })),
    Match.when({ type: "GRANT_TEMP_HP" }, (c) => ({
      type: "GRANT_TEMP_HP" as const,
      amount: tempHp(c.amount),
      keepOld: c.keepOld,
    })),
    Match.when({ type: "STABILIZE" }, () => ({ type: "STABILIZE" }) as const),
    Match.when({ type: "KNOCK_OUT" }, () => ({ type: "KNOCK_OUT" }) as const),
    Match.when({ type: "APPLY_CONDITION" }, (c) => ({
      type: "APPLY_CONDITION" as const,
      condition: c.condition,
      conditionImmunities: conditionSet(c.conditionImmunities),
    })),
    Match.when({ type: "REMOVE_CONDITION" }, (c) => ({
      type: "REMOVE_CONDITION" as const,
      condition: c.condition,
    })),
    Match.when({ type: "ADD_EXHAUSTION" }, (c) => ({
      type: "ADD_EXHAUSTION" as const,
      levels: c.levels,
      exhaustionImmune: c.exhaustionImmune ?? false,
    })),
    Match.when({ type: "REDUCE_EXHAUSTION" }, (c) => ({
      type: "REDUCE_EXHAUSTION" as const,
      levels: c.levels,
    })),
    Match.when({ type: "APPLY_FALL" }, (c) => ({
      type: "APPLY_FALL" as const,
      damageRoll: c.damageRoll,
      resistances: damageTypeSet(c.resistances),
      vulnerabilities: damageTypeSet(c.vulnerabilities),
      immunities: damageTypeSet(c.immunities),
    })),
    Match.when({ type: "BREAK_CONCENTRATION" }, () => ({
      type: "BREAK_CONCENTRATION" as const,
    })),
    Match.exhaustive,
  );
}

function semanticTriggerEvent(
  actor: DndActor,
  command: CreatureSemanticTriggerCommand,
) {
  const ctx = actor.getSnapshot().context;
  const fs = ctx.classStates.fighter;
  if (!fs || ctx.pendingResolution != null) return null;

  if (
    command.type === "RECORD_FAILED_SAVING_THROW" &&
    canUseIndomitable(fs.level, fs.indomitableCharges)
  ) {
    return { type: "TRIGGER_INDOMITABLE" } as const;
  }

  if (
    command.type === "RECORD_FAILED_ABILITY_CHECK" &&
    !isIncapacitated(ctx) &&
    canUseTacticalMind(fs.secondWindCharges, fs.level, true)
  ) {
    return { type: "TRIGGER_TACTICAL_MIND" } as const;
  }

  return null;
}

function recordCreatureSemanticTrigger(
  actor: DndActor,
  command: CreatureSemanticTriggerCommand,
) {
  const warnings = tableEventWarnings(command);
  const trigger = semanticTriggerEvent(actor, command);
  if (trigger) actor.send(trigger);

  return tableEventSuccess(
    command,
    warnings,
    encodeDndContext(actor.getSnapshot().context),
  );
}

function recordCreatureDirectTableEvent(
  actor: DndActor,
  command: CreatureDirectTableEventCommand,
) {
  const event = buildCreatureTableEvent(command);
  const before = actor.getSnapshot();
  const warnings = tableEventWarnings(command);
  if (!before.can(event)) {
    return tableEventNotAccepted(
      command,
      warnings,
      encodeDndContext(before.context),
    );
  }

  actor.send(event);
  return tableEventSuccess(
    command,
    warnings,
    encodeDndContext(actor.getSnapshot().context),
  );
}

function hazardEvents(command: CreatureHazardCommand): ReadonlyArray<DndEvent> {
  return Match.value(command).pipe(
    Match.when({ type: "RECORD_HOLD_BREATH_EXPIRED" }, () => [
      { type: "SUFFOCATE" } as const,
    ]),
    Match.when({ type: "RECORD_DAILY_FOOD_INTAKE" }, (c) => {
      if (c.intake === "full" || c.intake === "atLeastHalf") return [];
      if (c.intake === "lessThanHalf" && c.conSaveSucceeded === true) return [];
      return [{ type: "APPLY_STARVATION" } as const];
    }),
    Match.when({ type: "RECORD_DAILY_WATER_INTAKE" }, (c) => {
      if (c.intake === "full" || c.intake === "atLeastHalf") return [];
      return [{ type: "APPLY_DEHYDRATION" } as const];
    }),
    Match.exhaustive,
  );
}

function recordCreatureHazardTableEvent(
  actor: DndActor,
  command: CreatureHazardCommand,
) {
  const events = hazardEvents(command);
  const warnings = tableEventWarnings(command);
  for (const event of events) {
    if (actor.getSnapshot().can(event)) actor.send(event);
  }
  return tableEventSuccess(
    command,
    warnings,
    encodeDndContext(actor.getSnapshot().context),
  );
}

function recordCreatureTableEvent(
  actor: DndActor,
  command: Extract<TableEventCommand, { readonly scope: "creature" }>,
) {
  if (
    command.type === "RECORD_FAILED_SAVING_THROW" ||
    command.type === "RECORD_FAILED_ABILITY_CHECK"
  ) {
    return recordCreatureSemanticTrigger(actor, command);
  }

  if (CREATURE_HAZARD_TYPE_SET.has(command.type)) {
    return recordCreatureHazardTableEvent(
      actor,
      command as CreatureHazardCommand,
    );
  }

  return recordCreatureDirectTableEvent(
    actor,
    command as CreatureDirectTableEventCommand,
  );
}

function buildBattleTableEvent(
  command: Extract<TableEventCommand, { readonly scope: "battle" }>,
): BattleEvent {
  return Match.value(command).pipe(
    Match.when({ type: "BATTLE_HEAL" }, (c) => ({
      type: "BATTLE_HEAL" as const,
      targetId: CreatureId(c.targetId),
      amount: c.amount,
    })),
    Match.exhaustive,
  );
}

function recordBattleTableEvent(
  actor: BattleActor,
  command: Extract<TableEventCommand, { readonly scope: "battle" }>,
) {
  const targetId = CreatureId(command.targetId);
  const before = actor.getSnapshot();
  const warnings = tableEventWarnings(command);
  if (!before.context.creatures.has(targetId)) {
    return tableEventNotAccepted(
      command,
      warnings,
      encodeBattleRuntimeState(before),
    );
  }

  actor.send(buildBattleTableEvent(command));
  const after = actor.getSnapshot();
  if (battleSnapshotUnchanged(before, after)) {
    return tableEventNotAccepted(
      command,
      warnings,
      encodeBattleRuntimeState(after),
    );
  }
  return tableEventSuccess(command, warnings, encodeBattleRuntimeState(after));
}

export function recordTableEvent(host: SupportedActionHost, args: unknown) {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    return invalidTableEventContent(args);
  }

  const type = Reflect.get(args, "type");
  if (typeof type !== "string" || !TABLE_EVENT_TYPE_SET.has(type)) {
    return invalidTableEventContent(args);
  }

  const schema = tableEventCommandSchemaForType(type);
  const decoded = Schema.decodeUnknownEither(
    schema ?? TableEventCommandSchema,
    strictCommandParseOptions,
  )(args);
  if (decoded._tag === "Left") {
    return errorContent(
      "Invalid record_table_event input",
      String(decoded.left),
    );
  }

  if (decoded.right.scope !== host.scope) {
    return errorContent(
      `Table event scope ${decoded.right.scope} does not match the current ${host.scope} host.`,
      "TABLE_EVENT_SCOPE_MISMATCH",
    );
  }

  return Match.value(host).pipe(
    Match.when({ scope: "creature" }, ({ actor }) =>
      recordCreatureTableEvent(
        actor,
        decoded.right as Extract<
          TableEventCommand,
          { readonly scope: "creature" }
        >,
      ),
    ),
    Match.when({ scope: "battle" }, ({ actor }) =>
      recordBattleTableEvent(
        actor,
        decoded.right as Extract<
          TableEventCommand,
          { readonly scope: "battle" }
        >,
      ),
    ),
    Match.exhaustive,
  );
}
