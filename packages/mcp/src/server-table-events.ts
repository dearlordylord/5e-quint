import { Match, Schema } from "effect";

import {
  type RecordTableEventResult,
  TableEventCommandSchema,
  type TableEventCommand,
  type TableEventWarning,
} from "@dnd/core/available-actions.ts";
import { encodeDndContext } from "@dnd/core/context-encoding.ts";
import type { DndEvent } from "@dnd/core/machine-types.ts";
import {
  healAmount,
  tempHp,
  type Condition,
  type DamageType,
} from "@dnd/core/types.ts";

import {
  type DndActor,
  type SupportedActionHost,
  encodeBattleRuntimeState,
  errorContent,
  jsonContent,
} from "./server-shared.ts";

const strictCommandParseOptions = { onExcessProperty: "error" } as const;

function encodeHostState(host: SupportedActionHost) {
  return Match.value(host).pipe(
    Match.when({ scope: "creature" }, ({ actor }) =>
      encodeDndContext(actor.getSnapshot().context),
    ),
    Match.when({ scope: "battle" }, ({ actor }) =>
      encodeBattleRuntimeState(actor.getSnapshot()),
    ),
    Match.exhaustive,
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

function unsupportedTableEventWarning(
  command: TableEventCommand,
): TableEventWarning {
  return tableEventWarning(
    "unsupported_domain_gap",
    `${command.type} is reserved for the warning-aware table-event surface but is not wired to domain semantics yet.`,
  );
}

export function tableEventUnsupported<State>(
  command: TableEventCommand,
  state: State,
) {
  const result: RecordTableEventResult<State> = {
    success: false,
    appliedEvent: null,
    warnings: [unsupportedTableEventWarning(command)],
    state,
    error: {
      code: "TABLE_EVENT_NOT_IMPLEMENTED",
      message: "Table event is not implemented yet",
      event: command,
    },
  };
  return { ...jsonContent(result), isError: true as const };
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
      message: "Table event is not accepted in the current creature state",
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

function buildCreatureTableEvent(
  command: Extract<TableEventCommand, { readonly scope: "creature" }>,
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
    Match.exhaustive,
  );
}

function recordCreatureTableEvent(
  actor: DndActor,
  command: Extract<TableEventCommand, { readonly scope: "creature" }>,
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

export function recordTableEvent(host: SupportedActionHost, args: unknown) {
  const decoded = Schema.decodeUnknownEither(
    TableEventCommandSchema,
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
    Match.when({ scope: "battle" }, () =>
      tableEventUnsupported(decoded.right, encodeHostState(host)),
    ),
    Match.exhaustive,
  );
}
