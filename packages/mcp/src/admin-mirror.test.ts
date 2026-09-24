import {
  characterId as makeCharacterId,
  statBlockProcedurePresentations,
} from "@dnd/battle-runtime";
import {
  battleRuntimeContextForTest,
  battleRuntimeSessionForTest,
} from "@dnd/battle-runtime/test-support";
import {
  fighterId,
  findAct,
  goblinId,
  movementFill,
  movementFeet,
} from "../../battle-runtime/src/battle-runtime.test-support.ts";
import { attackExecutionSelectionForOption } from "../../battle-runtime/src/battle-action-options.ts";
import { armorClassBuild } from "../../character-sheet-runtime/src/test-support.test-support.ts";
import { statBlockAttackActionOptions } from "../../battle-runtime/src/stat-block-execution-state.ts";
import { Hp } from "@dnd/shared/types";
import { Effect, Result } from "effect";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  adminProjection,
  createHttpAdminMirrorPublisher,
  disabledAdminMirrorPublication,
  enabledAdminMirrorPublication,
  publishAdminProjectionBestEffort,
} from "./admin-mirror.ts";
import {
  adminMirrorPublisherInstanceId,
  adminMirrorSequence,
  adminMirrorSessionId,
  type AdminMirrorProjectionEnvelope,
} from "./admin-mirror-contract.ts";
import { createAdminMirrorPresentationTimelineEntry } from "./admin-mirror-presentation-timeline.ts";
import { createMcpPlaySessionRoot } from "./composition-root.ts";
import { handleToolCall } from "./server.ts";
import { availableCharacterSession } from "./session-store.ts";

describe("Admin Mirror publisher", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  test("coalesces slow publishes to the latest pending snapshot", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: unknown, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new Error("aborted"));
        });
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const publisher = createHttpAdminMirrorPublisher({
      endpoint: new URL("http://mirror.local"),
      timeoutMs: 50,
    });

    const first = Effect.runPromise(
      publisher.publish(envelope({ sequence: 0 })),
    );
    await Promise.resolve();
    await Effect.runPromise(publisher.publish(envelope({ sequence: 1 })));
    await Effect.runPromise(publisher.publish(envelope({ sequence: 2 })));

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(50);
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(
      JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)),
    ).toMatchObject({
      sequence: 2,
    });
    await vi.advanceTimersByTimeAsync(50);
    await first;
  });

  test("publishes successful requests and exposes explicit publication states", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    const publisher = createHttpAdminMirrorPublisher({
      endpoint: new URL("http://mirror.local/base"),
    });
    await Effect.runPromise(publisher.publish(envelope({ sequence: 0 })));
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("http://mirror.local/admin-projections"),
      expect.objectContaining({ method: "POST" }),
    );

    const disabled = disabledAdminMirrorPublication();
    expect(disabled.tag).toBe("disabled");
    await Effect.runPromise(
      disabled.publisher.publish(envelope({ sequence: 1 })),
    );

    const enabled = enabledAdminMirrorPublication({
      mirrorSessionId: adminMirrorSessionId("enabled"),
      publisher,
      publisherInstanceId: adminMirrorPublisherInstanceId("publisher"),
    });
    expect(enabled.nextSequence()).toBe(0);
    expect(enabled.nextSequence()).toBe(1);
  });

  test("keeps authored presentation out of timeline state", () => {
    const pendingProjection = projectionWithoutBattle();

    expect(JSON.stringify(pendingProjection)).not.toContain("Hunter's Mark");

    const pendingEntry = createAdminMirrorPresentationTimelineEntry(
      envelope({ sequence: 3, projection: pendingProjection }),
      100,
      envelope({
        sequence: 2,
        projection: projectionWithoutBattle(),
      }),
    );
    const resolvedEntry = createAdminMirrorPresentationTimelineEntry(
      envelope({
        sequence: 4,
        projection: projectionWithoutBattle(),
      }),
      101,
      envelope({ sequence: 3, projection: pendingProjection }),
    );

    expect(pendingEntry.actionSummary).toBeNull();
    expect(resolvedEntry.actionSummary).toBeNull();
  });

  test("does not reconstruct authored attack names from mechanical execution selectors", () => {
    const pendingProjection = projectionWithoutBattle();

    expect(JSON.stringify(pendingProjection)).not.toContain("attackName");
    const pendingEntry = createAdminMirrorPresentationTimelineEntry(
      envelope({ sequence: 5, projection: pendingProjection }),
      102,
      envelope({
        sequence: 4,
        projection: projectionWithoutBattle(),
      }),
    );
    const resolvedEntry = createAdminMirrorPresentationTimelineEntry(
      envelope({
        sequence: 6,
        projection: projectionWithoutBattle(),
      }),
      103,
      envelope({ sequence: 5, projection: pendingProjection }),
    );

    expect(pendingEntry.actionSummary).toBeNull();
    expect(resolvedEntry.actionSummary).toBeNull();
    expect(String(pendingEntry.actionSummary)).not.toContain("undefined");
    expect(String(resolvedEntry.actionSummary)).not.toContain("undefined");
  });

  test("presents ordinary pending and resolved subject fills at the public seam", () => {
    const root = createMcpPlaySessionRoot();
    handleToolCall(root, "start_battle", {
      battleId: "battle:admin-mirror-ordinary-frontier",
      initiativeMode: "direct",
      companionAdmissions: [],
      initialCombatants: [
        {
          admissionSource: { kind: "encounterParticipant" },
          ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
          combatantId: "goblin",
          initiative: 10,
          kind: "statBlock",
          statBlockId: "stat_block_goblin_warrior",
        },
        {
          admissionSource: { kind: "encounterParticipant" },
          ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
          combatantId: "skeleton",
          initiative: 5,
          kind: "statBlock",
          statBlockId: "stat_block_skeleton",
        },
      ],
    });

    const before = envelope({
      sequence: 0,
      projection: projectionFor(root),
    });
    const acts = readToolPayload(
      handleToolCall(root, "discover_battle_acts", {}),
    );
    const attack = acts.envelope.frontier.acts.find(
      (candidate: {
        readonly subject: { readonly action?: string };
        readonly initialHoles: readonly { readonly kind: string }[];
      }) =>
        candidate.subject.action === "attack" &&
        candidate.initialHoles.some((hole) => hole.kind === "targetChoice"),
    );
    if (attack === undefined) {
      throw new Error("Expected a public attack act with a target hole.");
    }
    const targetHole = attack.initialHoles.find(
      (hole: {
        readonly kind: string;
        readonly holeId: string;
        readonly attack?: {
          readonly actorId: string;
          readonly selection: Record<string, unknown>;
        };
      }) => hole.kind === "targetChoice",
    );
    if (targetHole?.attack === undefined) {
      throw new Error("Expected the public attack target selection witness.");
    }

    const invalidTarget = readToolPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: attack.subject,
        fill: {
          kind: "targetChoice",
          holeId: targetHole.holeId,
          value: "skeleton",
        },
      }),
    );
    expect(invalidTarget).toMatchObject({
      result: { tag: "invalid" },
      envelope: {
        frontier: {
          kind: "holes",
          pendingProcedure: { kind: "subjectResolution" },
        },
      },
    });

    const pending = envelope({
      sequence: 1,
      projection: projectionFor(root),
    });
    const pendingEntry = createAdminMirrorPresentationTimelineEntry(
      pending,
      101,
      before,
    );
    expect(pendingEntry).toMatchObject({
      actionSummary: "Battle action pending",
      actionDetail: "Goblin Warrior is resolving action.",
      debug: {
        eventKind: "pendingBattleFills",
        derivedInput: {
          pendingProcedure: { kind: "subjectResolution" },
          subject: attack.subject,
        },
        derivedOutcome: {
          resultTag: "needsHoles",
          actionSummary: "Battle action pending",
        },
      },
    });

    const target = readToolPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: attack.subject,
        fill: {
          kind: "targetChoice",
          holeId: targetHole.holeId,
          value: "skeleton",
          spatialFacts: [
            {
              kind: "attackTargetDistance",
              actorId: targetHole.attack.actorId,
              targetId: "skeleton",
              distanceFeet: 5,
              ...targetHole.attack.selection,
            },
          ],
        },
      }),
    );
    const attackRoll = target.envelope.frontier.holes.find(
      (hole: { readonly kind: string }) => hole.kind === "attackRoll",
    );
    if (attackRoll === undefined) {
      throw new Error("Expected an attack roll after selecting a target.");
    }
    const afterRoll = readToolPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: target.envelope.frontier.replaySubject,
        fill: {
          kind: "attackRoll",
          holeId: attackRoll.holeId,
          value: {
            total: 20,
            d20TestRoll:
              "rollMode" in attackRoll
                ? {
                    tag: "multiple",
                    first: 10,
                    second: 10,
                    rollMode: attackRoll.rollMode,
                  }
                : { tag: "single", naturalD20: 10 },
          },
        },
      }),
    );
    const damage = afterRoll.envelope.frontier.holes.find(
      (hole: { readonly kind: string }) => hole.kind === "rolledDice",
    );
    if (damage === undefined) {
      throw new Error("Expected a damage roll after a successful attack.");
    }
    const resolved = readToolPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: afterRoll.envelope.frontier.replaySubject,
        fill: {
          kind: "rolledDice",
          holeId: damage.holeId,
          value: [{ results: [1] }],
        },
      }),
    );
    expect(resolved.result).toEqual({ tag: "resolved" });

    const resolvedEntry = createAdminMirrorPresentationTimelineEntry(
      envelope({ sequence: 2, projection: projectionFor(root) }),
      102,
      pending,
    );
    expect(resolvedEntry).toMatchObject({
      actionSummary: "Battle action resolved",
      actionDetail: "Goblin Warrior resolved action.",
      debug: {
        eventKind: "resolvedBattleFills",
        derivedInput: {
          pendingProcedure: { kind: "subjectResolution" },
          subject: attack.subject,
        },
        derivedOutcome: {
          resultTag: "resolved",
          actionSummary: "Battle action resolved",
        },
      },
    });
  });

  test("does not project an interrupt decision as an ordinary pending action", () => {
    const root = startCharacterBattleForMirror();
    const before = envelope({ sequence: 0, projection: projectionFor(root) });
    const session = root.sessionStore.battleSession;
    if (session === null) {
      throw new Error("Expected the Admin Mirror interrupt battle.");
    }
    const movement = findAct(session, {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    });
    if (
      movement.subject.tag !== "runtimeCommand" ||
      movement.subject.command !== "move"
    ) {
      throw new Error("Expected the fixture's Move subject.");
    }
    const movementHole = movement.initialHoles.find(
      (hole) => hole.kind === "movement",
    );
    if (movementHole?.kind !== "movement") {
      throw new Error("Expected the fixture's movement hole.");
    }
    const goblin = session.state.combatants.get(goblinId);
    const goblinPresentation = session.context.statBlocks.get(goblinId);
    if (
      goblin?.origin.kind !== "statBlock" ||
      goblinPresentation === undefined
    ) {
      throw new Error("Expected the admitted Goblin Stat Block.");
    }
    const goblinAttackProcedureRef = Result.getOrThrow(
      statBlockProcedurePresentations({
        execution: goblin.origin.execution,
        presentation: goblinPresentation,
      }),
    ).find(
      (procedure) =>
        procedure.kind === "attack" && procedure.name === "Scimitar",
    )?.procedureRef;
    const goblinAttack = statBlockAttackActionOptions(
      goblin.origin.execution,
    ).find((attack) => attack.procedureRef === goblinAttackProcedureRef);
    if (goblinAttack === undefined) {
      throw new Error("Expected the Goblin's admitted Scimitar attack.");
    }
    const pending = readToolPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: movement.subject,
        fill: movementFill(movementHole, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [
            {
              reactorId: goblinId,
              distanceFeet: movementFeet(5),
              ...attackExecutionSelectionForOption(goblinAttack),
            },
          ],
        }),
      }),
    );
    expect(pending).toMatchObject({
      result: { tag: "needsHoles" },
      envelope: { frontier: { kind: "interruptDecision" } },
    });

    const pendingEntry = createAdminMirrorPresentationTimelineEntry(
      envelope({ sequence: 1, projection: projectionFor(root) }),
      103,
      before,
    );
    expect(pendingEntry).toMatchObject({
      actionSummary: null,
      debug: {
        eventKind: "projectionUpdated",
        derivedInput: {},
        derivedOutcome: { resultTag: "projection", actionSummary: null },
      },
    });
  });

  test("skips projections when an active battle lacks presentation context", () => {
    const publish = vi.fn(() => Effect.void);
    const root = {
      ...createMcpPlaySessionRoot(),
      adminMirrorPublication: enabledAdminMirrorPublication({
        mirrorSessionId: adminMirrorSessionId("invalid-projection"),
        publisher: { publish },
        publisherInstanceId: adminMirrorPublisherInstanceId(
          "invalid-projection-publisher",
        ),
      }),
    };
    handleToolCall(root, "start_battle", {
      battleId: "battle:invalid-admin-projection",
      initiativeMode: "direct",
      companionAdmissions: [],
      initialCombatants: [
        {
          admissionSource: { kind: "encounterParticipant" },
          ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
          combatantId: "goblin",
          initiative: 10,
          kind: "statBlock",
          statBlockId: "stat_block_goblin_warrior",
        },
      ],
    });
    const session = root.sessionStore.battleSession;
    if (session === null) {
      throw new Error("Expected an active Admin Mirror test battle.");
    }
    root.sessionStore.storeActiveBattle(
      battleRuntimeSessionForTest({
        state: session.state,
        context: battleRuntimeContextForTest(session.context.characters),
      }),
    );

    publish.mockClear();
    expect(Result.isFailure(adminProjection(root))).toBe(true);
    publishAdminProjectionBestEffort(root);
    expect(publish).not.toHaveBeenCalled();
  });
});

function envelope(input: {
  readonly sequence: number;
  readonly projection?: AdminMirrorProjectionEnvelope["projection"];
}): AdminMirrorProjectionEnvelope {
  return {
    mirrorSessionId: adminMirrorSessionId("demo"),
    projection: input.projection ?? {
      battle: null,
      characters: [],
      session: {
        battleState: { tag: "none" },
        draftIds: [],
        selectedStatBlockId: null,
      },
    },
    publisherInstanceId: adminMirrorPublisherInstanceId("publisher-a"),
    sequence: adminMirrorSequence(input.sequence),
    sourceProcessId: 1,
  };
}

function projectionWithoutBattle(): AdminMirrorProjectionEnvelope["projection"] {
  return {
    battle: null,
    characters: [],
    session: {
      battleState: { tag: "none" },
      draftIds: [],
      selectedStatBlockId: null,
    },
  };
}

function projectionFor(root: ReturnType<typeof createMcpPlaySessionRoot>) {
  const projection = adminProjection(root);
  if (Result.isFailure(projection)) {
    throw new Error(
      `Expected an Admin Mirror projection: ${String(projection.failure)}`,
    );
  }
  return projection.success;
}

function readToolPayload(response: ReturnType<typeof handleToolCall>) {
  const text = response.content[0]?.text;
  if (text === undefined) throw new Error("Expected a tool response payload.");
  return JSON.parse(text);
}

function startCharacterBattleForMirror() {
  const root = createMcpPlaySessionRoot();
  const characterId = makeCharacterId("character:admin-mirror-interrupt");
  const available = availableCharacterSession({
    characterId,
    build: armorClassBuild({
      startingClass: "class_fighter",
      armor: "armor_chain_mail",
      shield: true,
      weapon: "weapon_longsword",
    }),
    currentHp: Hp(10),
    tempHp: Hp(0),
    hitPointMaximumReduction: Hp(0),
    conditions: [],
    companion: { tag: "none" },
    unitLibrary: root.unitLibrary,
  });
  if (Result.isFailure(available)) {
    throw new Error(available.failure.message);
  }
  root.sessionStore.characters.set(available.success);
  handleToolCall(root, "start_battle", {
    battleId: "battle:admin-mirror-interrupt",
    initiativeMode: "direct",
    companionAdmissions: [],
    initialCombatants: [
      {
        kind: "characterSession",
        characterId,
        combatantId: "fighter",
        initiative: 18,
        ammunitionStocks: [],
      },
      {
        kind: "statBlock",
        statBlockId: "stat_block_goblin_warrior",
        combatantId: "goblin",
        initiative: 7,
        ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
        admissionSource: { kind: "encounterParticipant" },
      },
    ],
  });
  return root;
}
