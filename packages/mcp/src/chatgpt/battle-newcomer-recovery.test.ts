import { Result, Schema } from "effect";
import { describe, expect, it } from "vitest";
import {
  battleId,
  characterSeed,
  fighterId,
  goblinId,
  startBattleSessionRight,
  statBlockCreatureInit,
} from "../../../battle-runtime/src/battle-runtime.test-support.ts";
import {
  BattleResolutionOutputSchema,
  BattleSessionOutputSchema,
} from "../battle-tool-output.ts";
import { createMcpPlaySessionRoot } from "../composition-root.ts";
import { jsonContentPayload } from "../tool-content.ts";
import { CHATGPT_EXECUTION_TOOLS } from "./tool-surface.ts";

describe("ChatGPT newcomer battle recovery", () => {
  it("selects a discovered goblin bow attack and corrects its missing distance without losing the action", () => {
    const root = createMcpPlaySessionRoot();
    const session = startBattleSessionRight({
      battleId: battleId("synthetic-chatgpt-newcomer-bow"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        characterSeed({ initiative: 10 }),
      ],
    });
    expect(Result.isSuccess(root.sessionStore.storeActiveBattle(session))).toBe(
      true,
    );
    const discovery = Schema.decodeUnknownSync(BattleSessionOutputSchema)(
      jsonContentPayload(
        CHATGPT_EXECUTION_TOOLS.discover_battle_acts.handle(root, {}),
      ),
    );
    if (discovery.envelope?.frontier.kind !== "acts")
      throw new Error("Expected available Battle Acts.");
    const act = discovery.envelope.frontier.acts.find(
      (candidate) =>
        candidate.presentation.kind === "attack" &&
        candidate.presentation.name === "Shortbow" &&
        candidate.subject.tag === "action" &&
        candidate.subject.action === "attack" &&
        candidate.subject.statBlockDamageSelection?.every(
          ({ notation }) => notation === "rolled",
        ),
    );
    if (act === undefined)
      throw new Error(
        `Expected a discovered Shortbow Act: ${discovery.envelope.frontier.acts.map((candidate) => candidate.label).join(", ")}`,
      );
    const selected = Schema.decodeUnknownSync(BattleResolutionOutputSchema)(
      jsonContentPayload(
        CHATGPT_EXECUTION_TOOLS.attack.handle(root, { subject: act.subject }),
      ),
    );
    expect(selected.result.tag).toBe("needsHoles");
    if (selected.envelope.frontier.kind !== "holes")
      throw new Error("Expected the selected attack's target request.");
    const target = selected.envelope.frontier.holes.find(
      (hole) => hole.kind === "targetChoice",
    );
    if (target?.kind !== "targetChoice" || target.attack === undefined)
      throw new Error(
        "Expected an attack target with its canonical selection.",
      );
    const beforeInvalid = root.sessionStore.snapshot();
    const rejected = Schema.decodeUnknownSync(BattleResolutionOutputSchema)(
      jsonContentPayload(
        CHATGPT_EXECUTION_TOOLS.provide_battle_input.handle(root, {
          fill: { kind: target.kind, holeId: target.holeId, value: fighterId },
        }),
      ),
    );
    expect(rejected.result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
    expect(JSON.stringify(rejected.result)).toContain(
      "Copy fill.holeId from the current target hole",
    );
    expect(root.sessionStore.snapshot()).toEqual(beforeInvalid);
    expect(root.sessionStore.getPendingBattleTransaction()).not.toBeNull();
    const afterTarget = Schema.decodeUnknownSync(BattleResolutionOutputSchema)(
      jsonContentPayload(
        CHATGPT_EXECUTION_TOOLS.provide_battle_input.handle(root, {
          fill: {
            kind: target.kind,
            holeId: target.holeId,
            value: fighterId,
            spatialFacts: [
              {
                kind: "attackTargetDistance",
                actorId: target.attack.actorId,
                targetId: fighterId,
                ...target.attack.selection,
                distanceFeet: 55,
              },
            ],
          },
        }),
      ),
    );
    expect(afterTarget.result.tag).toBe("needsHoles");
    if (afterTarget.envelope.frontier.kind !== "holes")
      throw new Error("Expected the selected attack's roll request.");
    const roll = afterTarget.envelope.frontier.holes.find(
      (hole) => hole.kind === "attackRoll",
    );
    if (roll?.kind !== "attackRoll")
      throw new Error("Expected an attack-roll request.");
    const afterRoll = Schema.decodeUnknownSync(BattleResolutionOutputSchema)(
      jsonContentPayload(
        CHATGPT_EXECUTION_TOOLS.provide_battle_input.handle(root, {
          fill: {
            kind: roll.kind,
            holeId: roll.holeId,
            value: { total: 6, d20TestRoll: { tag: "single", naturalD20: 2 } },
          },
        }),
      ),
    );
    expect(afterRoll.result.tag).toBe("resolved");
    expect(root.sessionStore.getPendingBattleTransaction()).toBeNull();
    expect(afterRoll.envelope.checkpoint.currentActorId).toBe(goblinId);
  });
});
