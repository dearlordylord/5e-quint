import { snapshotBattle } from "./battle-reducer/battle-snapshot.ts";
import { unitId } from "@dnd/shared/game-facts";
import { PositiveInteger } from "@dnd/shared/types";
import { StatBlockProcedureResourceOrdinalSchema } from "@dnd/surface/surface/schema";
import { Result, Schema } from "effect";
import { expect, test } from "vitest";
import { startBattle } from "./battle-reducer/api-lifecycle.ts";
import {
  spendSpellCastResources,
  spendStatBlockSpellInvocationResource,
} from "./battle-reducer/spells-resolve-resources.ts";
import {
  battleId,
  fighterVsGoblinBattle,
  statBlockCreatureInit,
  statBlockRecord,
} from "./battle-runtime.test-support.ts";
import { combatantId } from "./identity.ts";
import { statBlockSpellProcedureInvocations } from "./stat-block-spell-invocation-selection.ts";
import { syntheticSpellcastingProcedureEntry } from "./stat-block-spellcasting-procedure.test-support.ts";

function limitedCaster() {
  const actorId = combatantId("synthetic-resource-rejection-caster");
  const base = statBlockRecord();
  const entry = syntheticSpellcastingProcedureEntry();
  const group = entry.procedure.groups[1];
  if (group?.kind !== "limited") throw new Error("Expected limited group");
  const started = startBattle({
    battleId: battleId("synthetic-resource-rejection"),
    combatants: [
      statBlockCreatureInit({
        combatantId: actorId,
        initiative: 20,
        statBlock: {
          ...base,
          statBlock: {
            ...base.statBlock,
            actions: [
              {
                ...entry,
                procedure: {
                  ...entry.procedure,
                  groups: [
                    { ...group, spells: [{ spellId: unitId("false_life") }] },
                  ],
                },
              },
            ],
            resources: [
              {
                ordinal: Schema.decodeSync(
                  StatBlockProcedureResourceOrdinalSchema,
                )(1),
                ownership: "each",
                limit: { kind: "daily", uses: PositiveInteger(1) },
              },
            ],
          },
        },
      }),
    ],
  });
  if (Result.isFailure(started)) throw new Error("Expected admitted caster");
  const state = started.success.state;
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "statBlock")
    throw new Error("Expected Stat Block actor");
  const invocation = statBlockSpellProcedureInvocations(
    actor.origin.execution,
  )[0];
  if (invocation?.resource.tag !== "statBlockLimited")
    throw new Error("Expected limited executable child");
  return { state, actorId, invocation, resource: invocation.resource };
}

test("a Stat Block pool cannot be spent for a missing or character actor", () => {
  const { state, resource } = limitedCaster();
  const missing = spendStatBlockSpellInvocationResource(
    state,
    combatantId("synthetic-absent-caster"),
    resource,
    state,
  );
  expect(missing.tag).toBe("invalid");
  if (missing.tag !== "invalid")
    throw new Error("Expected missing actor rejection");
  expect(missing.snapshot).toEqual(snapshotBattle(state));
  const characterState = fighterVsGoblinBattle();
  const character = [...characterState.combatants.values()].find(
    (actor) => actor.origin.kind === "character",
  );
  if (!character) throw new Error("Expected character fixture");
  const wrongOrigin = spendStatBlockSpellInvocationResource(
    characterState,
    character.combatantId,
    resource,
    characterState,
  );
  expect(wrongOrigin.tag).toBe("invalid");
  if (wrongOrigin.tag !== "invalid")
    throw new Error("Expected source ownership rejection");
  expect(wrongOrigin.snapshot).toEqual(snapshotBattle(characterState));
});

test("an exhausted limited pool rejects another payment without mutating state", () => {
  const { state, actorId, resource } = limitedCaster();
  const paid = spendStatBlockSpellInvocationResource(
    state,
    actorId,
    resource,
    state,
  );
  if (paid.tag !== "resolved") throw new Error("Expected first pool payment");
  const rejected = spendStatBlockSpellInvocationResource(
    paid.state,
    actorId,
    resource,
    paid.state,
  );
  expect(rejected.tag).toBe("invalid");
  if (rejected.tag !== "invalid")
    throw new Error("Expected exhausted pool rejection");
  expect(rejected.snapshot).toEqual(snapshotBattle(paid.state));
  expect(state.combatants.get(actorId)).not.toBe(
    paid.state.combatants.get(actorId),
  );
});

test("failed limited cast payment preserves the available action and effects", () => {
  const { state, actorId, invocation, resource } = limitedCaster();
  const paid = spendStatBlockSpellInvocationResource(
    state,
    actorId,
    resource,
    state,
  );
  if (paid.tag !== "resolved") throw new Error("Expected first pool payment");
  const rejected = spendSpellCastResources({
    state: paid.state,
    actorId,
    invocation,
    errorState: paid.state,
  });
  expect(rejected.tag).toBe("invalid");
  if (rejected.tag !== "invalid")
    throw new Error("Expected atomic cast payment rejection");
  expect(rejected.snapshot).toEqual(snapshotBattle(paid.state));
  expect(paid.state.currentTurnResources.actionTakenThisTurn).toBe(false);
  expect(paid.state.combatants.get(actorId)?.activeEffects).toEqual([]);
});
