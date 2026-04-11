import { Match, Schema } from "effect";

import type { BattleEvent } from "@dnd/core/battle-machine-types.ts";
import {
  BATTLE_CONTROL_COMMAND_TYPES,
  BattleInitCreatureConfigSchema,
  CREATURE_CONTROL_COMMAND_TYPES,
  ControlCommandSchema,
  controlCommandSchemaForType,
  toBattleInitCreatureConfig,
  type ControlCommand,
} from "@dnd/core/available-actions.ts";
import { encodeDndContext } from "@dnd/core/context-encoding.ts";
import { CreatureId } from "@dnd/core/types.ts";

import {
  type BattleActor,
  type DndActor,
  type SupportedActionHost,
  battleSnapshotUnchanged,
  encodeBattleRuntimeState,
  errorContent,
  jsonContent,
  snapshotFingerprint,
} from "./server-shared.ts";

type DndMachineEvent = Parameters<DndActor["send"]>[0];
type BattleInitCommand = Extract<
  ControlCommand,
  { readonly scope: "battle"; readonly type: "BATTLE_INIT" }
>;

const strictCommandParseOptions = { onExcessProperty: "error" } as const;
const CONTROL_COMMAND_TYPES = [
  ...CREATURE_CONTROL_COMMAND_TYPES,
  ...BATTLE_CONTROL_COMMAND_TYPES,
] as const;
const CONTROL_COMMAND_TYPE_SET = new Set<string>(CONTROL_COMMAND_TYPES);

function formatSchemaValue(value: unknown): string {
  if (value === undefined) return "(missing)";
  if (typeof value === "string") return JSON.stringify(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function invalidControlCommandContent(args: unknown) {
  const actualType =
    typeof args === "object" && args !== null && !Array.isArray(args)
      ? Reflect.get(args, "type")
      : undefined;
  return errorContent(
    "Invalid execute_control_command input",
    `Invalid control command.${typeof actualType === "string" ? ` Received type: ${JSON.stringify(actualType)}.` : ` Received: ${formatSchemaValue(args)}.`} Valid types: ${CONTROL_COMMAND_TYPES.join(", ")}.`,
  );
}

function invalidBattleInitCreatureContent(args: unknown) {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    return null;
  }
  const creatures = Reflect.get(args, "creatures");
  if (!Array.isArray(creatures)) return null;

  for (const creature of creatures) {
    const decoded = Schema.decodeUnknownEither(
      BattleInitCreatureConfigSchema,
      strictCommandParseOptions,
    )(creature);
    if (decoded._tag === "Left") {
      return errorContent(
        "Invalid execute_control_command input",
        String(decoded.left),
      );
    }
  }

  return null;
}

function duplicateBattleCreatureIdContent() {
  return errorContent(
    "Battle creature IDs must be unique.",
    "BATTLE_INIT_DUPLICATE_CREATURE_ID",
  );
}

function hasDuplicateBattleCreatureIds(
  creatures: BattleInitCommand["creatures"],
) {
  const ids = creatures.map((creature) => creature.id);
  return new Set(ids).size !== ids.length;
}

function controlCommandNotAcceptedContent(command: ControlCommand) {
  return errorContent("Control command was not accepted by the machine", {
    code: "CONTROL_COMMAND_NOT_ACCEPTED",
    command,
  });
}

function buildCreatureControlEvent(
  command: Extract<ControlCommand, { readonly scope: "creature" }>,
): DndMachineEvent {
  return Match.value(command).pipe(
    Match.when({ type: "END_TURN" }, () => ({ type: "END_TURN" }) as const),
    Match.when({ type: "LONG_REST" }, () => ({ type: "LONG_REST" }) as const),
    Match.exhaustive,
  );
}

function buildBattleControlEvent(
  command: Extract<ControlCommand, { readonly scope: "battle" }>,
): BattleEvent {
  return Match.value(command).pipe(
    Match.when({ type: "BATTLE_INIT" }, ({ creatures }) => ({
      type: "BATTLE_INIT" as const,
      creatures: creatures.map(toBattleInitCreatureConfig),
    })),
    Match.when(
      { type: "BATTLE_ADD_CREATURE" },
      ({ creatures, insertAtIndex }) => ({
        type: "BATTLE_ADD_CREATURE" as const,
        creatures: creatures.map(toBattleInitCreatureConfig),
        insertAtIndex,
      }),
    ),
    Match.when({ type: "BATTLE_REMOVE_CREATURE" }, ({ creatureIds }) => ({
      type: "BATTLE_REMOVE_CREATURE" as const,
      creatureIds: creatureIds.map((id) => CreatureId(id)),
    })),
    Match.when({ type: "BATTLE_START_TURN" }, (c) => ({
      type: "BATTLE_START_TURN" as const,
      rechargeD6: c.rechargeD6,
      sotDmg: c.sotDmg,
      sotDt: c.sotDt,
      sotHeal: c.sotHeal,
      sotSaveResult: c.sotSaveResult,
      sotConSave: c.sotConSave,
      deathSaveRoll: c.deathSaveRoll,
    })),
    Match.when({ type: "BATTLE_END_TURN" }, (c) => ({
      type: "BATTLE_END_TURN" as const,
      eotSaveSucceeded: c.eotSaveSucceeded,
      eotDmg: c.eotDmg,
      eotDt: c.eotDt,
      eotConSave: c.eotConSave,
    })),
    Match.when({ type: "BATTLE_LEGENDARY_PASS" }, () => ({
      type: "BATTLE_LEGENDARY_PASS" as const,
    })),
    Match.exhaustive,
  );
}

function executeCreatureControlCommand(
  actor: DndActor,
  command: Extract<ControlCommand, { readonly scope: "creature" }>,
) {
  const before = actor.getSnapshot();
  actor.send(buildCreatureControlEvent(command));
  const after = actor.getSnapshot();
  if (snapshotFingerprint(before) === snapshotFingerprint(after)) {
    return controlCommandNotAcceptedContent(command);
  }
  return jsonContent({
    success: true,
    state: encodeDndContext(after.context),
  });
}

function executeBattleControlCommand(
  actor: BattleActor,
  command: Extract<ControlCommand, { readonly scope: "battle" }>,
) {
  const before = actor.getSnapshot();
  actor.send(buildBattleControlEvent(command));
  const after = actor.getSnapshot();
  if (battleSnapshotUnchanged(before, after)) {
    return controlCommandNotAcceptedContent(command);
  }
  return jsonContent({
    success: true,
    state: encodeBattleRuntimeState(after),
  });
}

export function executeControlCommand(
  host: SupportedActionHost,
  args: unknown,
) {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    return invalidControlCommandContent(args);
  }

  const type = Reflect.get(args, "type");
  if (typeof type !== "string" || !CONTROL_COMMAND_TYPE_SET.has(type)) {
    return invalidControlCommandContent(args);
  }

  if (type === "BATTLE_INIT" || type === "BATTLE_ADD_CREATURE") {
    const invalidCreature = invalidBattleInitCreatureContent(args);
    if (invalidCreature != null) return invalidCreature;
  }

  const schema = controlCommandSchemaForType(type);
  const decoded = Schema.decodeUnknownEither(
    schema ?? ControlCommandSchema,
    strictCommandParseOptions,
  )(args);
  if (decoded._tag === "Left") {
    return errorContent(
      "Invalid execute_control_command input",
      String(decoded.left),
    );
  }

  if (decoded.right.scope !== host.scope) {
    return errorContent(
      `Control command scope ${decoded.right.scope} does not match the current ${host.scope} host.`,
      "CONTROL_COMMAND_SCOPE_MISMATCH",
    );
  }

  if (
    decoded.right.scope === "battle" &&
    (decoded.right.type === "BATTLE_INIT" ||
      decoded.right.type === "BATTLE_ADD_CREATURE") &&
    hasDuplicateBattleCreatureIds(decoded.right.creatures)
  ) {
    return duplicateBattleCreatureIdContent();
  }

  return Match.value(host).pipe(
    Match.when({ scope: "creature" }, ({ actor }) =>
      executeCreatureControlCommand(
        actor,
        decoded.right as Extract<
          ControlCommand,
          { readonly scope: "creature" }
        >,
      ),
    ),
    Match.when({ scope: "battle" }, ({ actor }) =>
      executeBattleControlCommand(
        actor,
        decoded.right as Extract<ControlCommand, { readonly scope: "battle" }>,
      ),
    ),
    Match.exhaustive,
  );
}
