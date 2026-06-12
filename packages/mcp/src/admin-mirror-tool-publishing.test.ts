import { Effect } from "effect";
import { describe, expect, test } from "vitest";

import { enabledAdminMirrorPublication } from "./admin-mirror.ts";
import {
  adminMirrorPublisherInstanceId,
  adminMirrorSessionId,
  type AdminMirrorProjectionEnvelope,
} from "./admin-mirror-contract.ts";
import { createMcpCompositionRoot } from "./composition-root.ts";
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
      initialCombatants: [
        {
          admissionSource: { kind: "encounterParticipant" },
          combatantId: "goblin",
          initiative: 12,
          kind: "statBlock",
          side: "demo",
          statBlockId: "stat_block_goblin_warrior",
        },
        {
          admissionSource: { kind: "encounterParticipant" },
          combatantId: "skeleton",
          initiative: 8,
          kind: "statBlock",
          side: "demo",
          statBlockId: "stat_block_skeleton",
        },
      ],
    });
    await waitForPublished(published, 1);

    handleToolCall(root, "start_battle", {
      battleId: "battle:mirror-rejected",
      initialCombatants: [
        {
          admissionSource: { kind: "encounterParticipant" },
          combatantId: "second-goblin",
          initiative: 10,
          kind: "statBlock",
          side: "demo",
          statBlockId: "stat_block_goblin_warrior",
        },
      ],
    });
    await settleForkedEffects();

    expect(published).toHaveLength(1);
    expect(published[0]?.projection.battle?.battleId).toBe(
      "battle:mirror-publish",
    );
  });
});

function rootWithMirrorPublisher() {
  const published: AdminMirrorProjectionEnvelope[] = [];
  const root = {
    ...createMcpCompositionRoot(),
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
