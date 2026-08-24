import { Effect } from "effect";
import { describe, expect, test } from "vitest";

import { enabledAdminMirrorPublication } from "./admin-mirror.ts";
import {
  adminMirrorPublisherInstanceId,
  adminMirrorSequence,
  adminMirrorSessionId,
  type AdminMirrorProjectionEnvelope,
} from "./admin-mirror-contract.ts";
import { createAdminMirrorPresentationTimelineEntry } from "./admin-mirror-presentation-timeline.ts";
import { createMcpPlaySessionRoot } from "./composition-root.ts";
import { handleToolCall } from "./server.ts";

describe("Admin Mirror MCP tool publishing", () => {
  test("publishes accepted character draft mutations only", async () => {
    const { root, published } = rootWithMirrorPublisher();

    handleToolCall(root, "create_character_draft", {
      draftId: "draft:mirror-publish",
    });
    await waitForPublished(published, 1);

    handleToolCall(root, "create_character_draft", {
      draftId: "draft:mirror-publish",
    });
    await settleForkedEffects();

    expect(published).toHaveLength(1);
    expect(published[0]?.projection.session.draftIds).toEqual([
      "draft:mirror-publish",
    ]);
  });

  test("publishes accepted stat block selection but not same-value no-ops", async () => {
    const { root, published } = rootWithMirrorPublisher();

    handleToolCall(root, "select_stat_block", {
      statBlockId: "stat_block_goblin_warrior",
    });
    await waitForPublished(published, 1);

    handleToolCall(root, "select_stat_block", {
      statBlockId: "stat_block_goblin_warrior",
    });
    handleToolCall(root, "select_stat_block", {
      statBlockId: "missing-stat-block",
    });
    await settleForkedEffects();

    expect(published).toHaveLength(1);
    expect(published[0]?.projection.session.selectedStatBlockId).toBe(
      "stat_block_goblin_warrior",
    );
  });

  test("publishes accepted battle starts but not rejected starts", async () => {
    const { root, published } = rootWithMirrorPublisher();

    handleToolCall(root, "start_battle", {
      battleId: "battle:mirror-publish",
      initiativeMode: "direct",
      companionAdmissions: [],
      initialCombatants: [
        {
          admissionSource: { kind: "encounterParticipant" },
          ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
          combatantId: "goblin",
          initiative: 12,
          kind: "statBlock",
          statBlockId: "stat_block_goblin_warrior",
        },
        {
          admissionSource: { kind: "encounterParticipant" },
          ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
          combatantId: "skeleton",
          initiative: 8,
          kind: "statBlock",
          statBlockId: "stat_block_skeleton",
        },
      ],
    });
    await waitForPublished(published, 1);

    handleToolCall(root, "start_battle", {
      battleId: "battle:mirror-rejected",
      initiativeMode: "direct",
      companionAdmissions: [],
      initialCombatants: [
        {
          admissionSource: { kind: "encounterParticipant" },
          ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
          combatantId: "second-goblin",
          initiative: 10,
          kind: "statBlock",
          statBlockId: "stat_block_goblin_warrior",
        },
      ],
    });
    await settleForkedEffects();

    expect(published).toHaveLength(1);
    expect(published[0]?.projection.battle?.battleId).toBe(
      "battle:mirror-publish",
    );

    const startedEnvelope = published[0];
    if (startedEnvelope?.projection.battle === null) {
      throw new Error("Expected the accepted start to publish a battle.");
    }
    if (startedEnvelope === undefined) {
      throw new Error("Expected the accepted start to publish a projection.");
    }
    const battle = startedEnvelope.projection.battle;
    if (battle === null) {
      throw new Error("Expected the accepted start to publish a battle.");
    }
    const beforeStart: AdminMirrorProjectionEnvelope = {
      ...startedEnvelope,
      projection: {
        ...startedEnvelope.projection,
        battle: null,
        session: {
          ...startedEnvelope.projection.session,
          battleState: { tag: "none" },
        },
      },
      sequence: adminMirrorSequence(0),
    };
    const startedEntry = createAdminMirrorPresentationTimelineEntry(
      startedEnvelope,
      1,
      beforeStart,
    );
    expect(startedEntry).toMatchObject({
      actionSummary: "Battle started: Goblin Warrior's turn",
      currentActorDisplayName: "Goblin Warrior",
      debug: { eventKind: "battleStarted", previousBattle: null },
    });

    const nextActorId = battle.turnOrder[1];
    const damagedCombatant = battle.combatants[0];
    if (nextActorId === undefined || damagedCombatant === undefined) {
      throw new Error("Expected the test battle to contain two combatants.");
    }
    const advancedEnvelope: AdminMirrorProjectionEnvelope = {
      ...startedEnvelope,
      projection: {
        ...startedEnvelope.projection,
        battle: {
          ...battle,
          combatants: battle.combatants.map((combatant) =>
            combatant.combatantId === damagedCombatant.combatantId
              ? { ...combatant, hp: 1 }
              : combatant,
          ),
          currentActorId: nextActorId,
        },
      },
      sequence: adminMirrorSequence(1),
    };
    const advancedEntry = createAdminMirrorPresentationTimelineEntry(
      advancedEnvelope,
      2,
      startedEnvelope,
    );
    expect(advancedEntry).toMatchObject({
      actionSummary: "Round 1: Skeleton's turn",
      debug: {
        derivedInput: { command: "endTurn" },
        eventKind: "turnAdvanced",
      },
      hpChanges: [
        {
          combatantId: damagedCombatant.combatantId,
          nextHp: 1,
          previousHp: damagedCombatant.hp,
        },
      ],
    });
  });
});

function rootWithMirrorPublisher() {
  const published: AdminMirrorProjectionEnvelope[] = [];
  const root = {
    ...createMcpPlaySessionRoot(),
    adminMirrorPublication: enabledAdminMirrorPublication({
      mirrorSessionId: adminMirrorSessionId("tool-test"),
      publisher: {
        publish: (envelope) =>
          Effect.sync(() => {
            published.push(envelope);
          }),
      },
      publisherInstanceId: adminMirrorPublisherInstanceId("test-publisher"),
    }),
  };
  return { published, root };
}

async function waitForPublished(
  published: readonly AdminMirrorProjectionEnvelope[],
  count: number,
): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (published.length >= count) return;
    await settleForkedEffects();
  }
  expect(published).toHaveLength(count);
}

async function settleForkedEffects(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}
