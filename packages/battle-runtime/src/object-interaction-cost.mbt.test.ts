// KERNEL-COVERAGE: parity-witness BATTLE.ACTION.OBJECT_INTERACTION_COST
// RAW: .references/srd-5.2.1/playing-the-game.md "Your Turn", Interacting with
// Things; .references/srd-5.2.1/rules-glossary.md "Utilize [Action]".
import { spendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { Result } from "effect";
import { describe, expect, it } from "vitest";
import {
  MBT_TEST_TIMEOUT_MS,
  booleanField,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  quintField,
  quintStateRecord,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";
import {
  fighterId,
  fighterVsGoblinBattle,
  goblinId,
} from "./battle-runtime.test-support.ts";
import type { BattleState } from "./battle-state-execution.ts";
import { currentActorId } from "./battle-reducer/creature-state-leaves.ts";
import { objectInteractionRulingHole } from "./battle-reducer/object-interaction.ts";
import type { CombatantId } from "./identity.ts";
import { resolveBattleSubject } from "./index.ts";

const LAST_CHARGES = ["none", "free", "utilize", "refused"] as const;
type LastCharge = (typeof LAST_CHARGES)[number];

type ObjectInteractionProjection = {
  readonly ownTurn: boolean;
  readonly freeInteractionAvailable: boolean;
  readonly actionAvailable: boolean;
  readonly lastCharge: LastCharge;
};

const objectInteractionDriverSchema = {
  init: {},
  doInteractFree: {},
  doInteractNeedingUtilize: {},
  doEndOwnTurn: {},
  doEndOtherTurn: {},
  step: {},
} as const;

/**
 * The Fighter's side of the turn: off its own turn the turn resources belong
 * to another creature, so the Fighter has neither its free interaction nor its
 * action.
 */
function projectObjectInteraction(
  state: BattleState,
  lastCharge: LastCharge,
): ObjectInteractionProjection {
  const ownTurn = currentActorId(state) === fighterId;
  const resources = state.currentTurnResources;
  return {
    ownTurn,
    freeInteractionAvailable:
      ownTurn && resources.objectInteraction === "available",
    actionAvailable:
      ownTurn && Result.isSuccess(spendAction(resources, "utilize")),
    lastCharge,
  };
}

function createObjectInteractionDriver() {
  return defineDriver(objectInteractionDriverSchema, () => {
    let state = fighterVsGoblinBattle();
    let lastCharge: LastCharge = "none";

    function interact(requiresUtilize: boolean): void {
      const result = resolveBattleSubject({
        state,
        subject: {
          tag: "runtimeCommand",
          actorId: fighterId,
          command: "interactWithObject",
        },
        fills: [
          {
            kind: "objectInteractionRuling",
            holeId: objectInteractionRulingHole(state, fighterId).holeId,
            value: { requiresUtilize },
          },
        ],
      });
      if (result.tag !== "resolved") {
        lastCharge = "refused";
        return;
      }
      lastCharge =
        state.currentTurnResources.objectInteraction === "available" &&
        result.state.currentTurnResources.objectInteraction === "spent"
          ? "free"
          : "utilize";
      state = result.state;
    }

    function endTurn(actorId: CombatantId): void {
      const result = resolveBattleSubject({
        state,
        subject: { tag: "runtimeCommand", actorId, command: "endTurn" },
        fills: [],
      });
      if (result.tag !== "resolved") {
        throw new Error(`Expected ${String(actorId)} to end its turn.`);
      }
      state = result.state;
      lastCharge = "none";
    }

    return {
      init: () => {
        state = fighterVsGoblinBattle();
        lastCharge = "none";
      },
      doInteractFree: () => interact(false),
      doInteractNeedingUtilize: () => interact(true),
      doEndOwnTurn: () => endTurn(fighterId),
      doEndOtherTurn: () => endTurn(goblinId),
      step: () => {},
      getState: () => projectObjectInteraction(state, lastCharge),
    };
  });
}

function lastChargeValue(raw: unknown): LastCharge {
  const charge = LAST_CHARGES.find((candidate) => candidate === raw);
  if (charge === undefined) {
    throw new Error(`Unexpected qLastCharge ${String(raw)}.`);
  }
  return charge;
}

function normalizeObjectInteractionQuintState(
  raw: unknown,
): ObjectInteractionProjection {
  const state = quintStateRecord(raw);
  const turn = quintStateRecord(quintField(state, "qTurn"));
  return {
    ownTurn: booleanField(turn, "ownTurn"),
    freeInteractionAvailable: booleanField(turn, "freeInteractionAvailable"),
    actionAvailable: booleanField(turn, "actionAvailable"),
    lastCharge: lastChargeValue(quintField(state, "qLastCharge")),
  };
}

const objectInteractionStateCheck = stateCheck(
  normalizeObjectInteractionQuintState,
  (spec: ObjectInteractionProjection, impl: ObjectInteractionProjection) => {
    expect(impl).toEqual(spec);
    return true;
  },
);

describe("Object interaction cost MBT", () => {
  it(
    "charges the free interaction, then the Utilize action, across turns",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-object-interaction.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createObjectInteractionDriver(),
        backend: "typescript",
        seed: process.env["QUINT_SEED"],
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(8),
        stateCheck: objectInteractionStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});
