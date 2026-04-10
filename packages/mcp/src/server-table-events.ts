import { Match, Schema } from "effect";

import {
  type RecordTableEventResult,
  TableEventCommandSchema,
  type TableEventCommand,
  type TableEventWarning,
} from "@dnd/core/available-actions.ts";
import { encodeDndContext } from "@dnd/core/context-encoding.ts";

import {
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

  return tableEventUnsupported(decoded.right, encodeHostState(host));
}
