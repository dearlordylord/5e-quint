import { Match, Result } from "effect";
import type {
  BattleCreatureState,
  BattleRuntimeContinuation,
  BattleState,
} from "@dnd/battle-runtime";
import { createMcpApplicationServices } from "../../../packages/mcp/src/composition-root.ts";
import { decodePlaySessionId } from "../../../packages/mcp/src/play-session.ts";
import { decodeStoredPlaySessionRecord } from "../../../packages/mcp/src/play-session-repository.ts";
import { rootFromRecord } from "../../../packages/mcp/src/recoverable-play-session-support.ts";
import { retainPlaySessionContinuation } from "../../../packages/mcp/src/play-session-continuation.ts";
import { encodeContinuationGraph } from "../../../packages/mcp/src/continuation-graph.ts";
import { disabledAdminMirrorPublication } from "../../../packages/mcp/src/admin-mirror.ts";

export function materializeStoredRow(row: unknown, id: unknown) {
  const playSessionId = decodePlaySessionId(id);
  if (Result.isFailure(playSessionId)) return issue(playSessionId.failure);
  const record = decodeStoredPlaySessionRecord(row, playSessionId.success);
  if (Result.isFailure(record)) return issue(record.failure.message);
  const services = {
    ...createMcpApplicationServices(),
    createAdminMirrorPublication: disabledAdminMirrorPublication,
  };
  const root = rootFromRecord(services, record.success);
  if (Result.isFailure(root)) return issue(root.failure.message);
  const retained = retainPlaySessionContinuation(root.success);
  if (Result.isFailure(retained)) return issue(retained.failure);
  const projected = Match.value(retained.success.battle).pipe(
    Match.when({ tag: "none" }, (battle) => Result.succeed(battle)),
    Match.when({ tag: "activeBattle" }, projectCapturedBattle),
    Match.when({ tag: "initialInitiativeSetup" }, projectCapturedBattle),
    Match.exhaustive,
  );
  if (Result.isFailure(projected)) return issue(projected.failure);
  const graph = encodeContinuationGraph(root.success, {
    ...retained.success,
    battle: projected.success,
  });
  if (Result.isFailure(graph)) return issue(graph.failure);
  return { tag: "materialized" as const, graph: graph.success };
}

function projectCapturedBattle<
  T extends { readonly battle: BattleRuntimeContinuation },
>(saved: T): Result.Result<T, string> {
  const origins = new Map<
    BattleCreatureState["origin"],
    BattleCreatureState["origin"]
  >();
  const creatures = new Map<BattleCreatureState, BattleCreatureState>();
  const combatantMaps = new Map<
    BattleState["combatants"],
    BattleState["combatants"]
  >();
  const states = new Map<BattleState, BattleState>();
  return Result.gen(function* () {
    const sessions: BattleRuntimeContinuation["sessions"][number][] = [];
    for (const session of saved.battle.sessions) {
      for (const [id, creature] of session.state.combatants) {
        if (creature.origin.kind !== "character") continue;
        const origin = creature.origin;
        if (
          !("displayName" in origin) ||
          typeof origin.displayName !== "string" ||
          origin.displayName !== session.characters.get(id)?.displayName
        ) {
          return yield* Result.fail(
            "Original character display name differs from its canonical Battle context; source conversion requires investigation.",
          );
        }
        if (!origins.has(origin)) {
          const { displayName: _displayName, ...executionOrigin } = origin;
          origins.set(origin, executionOrigin);
        }
      }
      const combatants =
        combatantMaps.get(session.state.combatants) ??
        new Map(
          [...session.state.combatants].map(([id, creature]) => {
            const projected = creatures.get(creature) ?? {
              ...creature,
              origin: origins.get(creature.origin) ?? creature.origin,
            };
            creatures.set(creature, projected);
            return [id, projected] as const;
          }),
        );
      combatantMaps.set(session.state.combatants, combatants);
      const state = states.get(session.state) ?? {
        ...session.state,
        combatants,
      };
      states.set(session.state, state);
      sessions.push({ ...session, state });
    }
    return { ...saved, battle: { ...saved.battle, sessions } };
  });
}

function issue(message: string) {
  return { tag: "issue" as const, message };
}
