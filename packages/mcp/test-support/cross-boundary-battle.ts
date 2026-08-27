import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { characterDraftId } from "@dnd/character-creation-runtime";
import {
  BattlePresentedCheckpointFrontierEnvelopeSchema,
  type BattlePresentedCheckpointFrontierEnvelope,
  type BattleRuntimeSession,
} from "@dnd/battle-runtime";
import { Either, Schema } from "effect";

import { characterIdFromDraftId } from "../src/session-store.ts";
import {
  BattleResolutionOutputSchema,
  BattleSessionOutputSchema,
  StartBattleOutputSchema,
} from "../src/battle-tool-output.ts";
import { McpActiveSessionSnapshotSchema } from "../src/session-snapshot-output.ts";
import { PlaySessionIdSchema } from "../src/play-session.ts";
import { createDndMcpProtocolServer } from "../src/protocol-server.ts";
import { battlePresentationEnvelopeForSession } from "../src/battle-tool-payloads.ts";
import {
  acceptancePlaySessionCaller,
  acceptancePlaySessionId,
  acceptancePlaySessionRoutedArgs,
  attackRollFill,
  attackSubjectFromActs,
  attackTargetFill,
  createAndFinalizeElfWizardFiveWithCounterspell,
  rolledDiceFill,
} from "./mcp-acceptance-scenarios.ts";
import { battleToolWireArgs } from "./battle-tool-wire-args.ts";

type PublishedBattleEnvelope = Schema.Schema.Type<
  typeof BattlePresentedCheckpointFrontierEnvelopeSchema
>;

export type ProductionBattleConsumerSeamCase = {
  readonly kind:
    | "acts"
    | "holes"
    | "rejected"
    | "interruptDecision"
    | "resolution";
  /** The exact operation result published by the MCP boundary. */
  readonly operationResult: unknown;
  /** The exact envelope decoded from that operation result or recovery error. */
  readonly envelope: PublishedBattleEnvelope;
  /** The exact active-session projection paired with the envelope. */
  readonly session: Schema.Schema.Type<typeof McpActiveSessionSnapshotSchema>;
  /** The runtime session that produced the boundary projection. */
  readonly runtimeSession: BattleRuntimeSession;
  /** The typed runtime presentation that produced the MCP wire envelope. */
  readonly runtimeEnvelope: BattlePresentedCheckpointFrontierEnvelope;
};

/**
 * Execute one synthetic Battle through the live runtime and MCP protocol.
 * Consumers use the returned cases to verify that branch identity survives
 * the MCP projection and the React-facing model without rebuilding mechanics.
 */
export async function productionBattleConsumerSeam(): Promise<
  readonly ProductionBattleConsumerSeamCase[]
> {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const host = createDndMcpProtocolServer();
  const { server } = host;
  const client = new Client({
    name: "cross-boundary-battle-seam",
    version: "0.1.0",
  });
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  try {
    const playSessionId = await acceptancePlaySessionId(client);
    const decodedPlaySessionId =
      Schema.decodeUnknownSync(PlaySessionIdSchema)(playSessionId);
    const playSessionCaller = await acceptancePlaySessionCaller(client);
    const draftId = "draft:cross-boundary-battle-seam-wizard";
    await createAndFinalizeElfWizardFiveWithCounterspell(client, draftId);
    const wizardCharacterId = String(
      characterIdFromDraftId(characterDraftId(draftId)),
    );
    const startResponse = await call(client, "start_battle", {
      playSessionId,
      battleId: "battle:cross-boundary-seam",
      initiativeMode: "direct",
      companionAdmissions: [],
      initialCombatants: [
        {
          kind: "statBlock",
          ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
          statBlockId: "stat_block_goblin_warrior",
          combatantId: "seam-goblin",
          initiative: 20,
          admissionSource: { kind: "encounterParticipant" },
        },
        {
          kind: "characterSession",
          ammunitionStocks: [],
          characterId: wizardCharacterId,
          combatantId: "seam-wizard",
          initiative: 10,
        },
      ],
    });
    const startOperationResult = operationResult(startResponse);
    const started = Schema.decodeUnknownSync(StartBattleOutputSchema)(
      startOperationResult,
    );
    if (
      started.envelope === null ||
      started.session.battleState.tag !== "activeBattle"
    ) {
      throw new Error("Expected an active Battle from the seam start.");
    }
    const discoveredResponse = await call(client, "discover_battle_acts", {
      playSessionId,
    });
    const discoveredOperationResult = operationResult(discoveredResponse);
    const discovered = Schema.decodeUnknownSync(BattleSessionOutputSchema)(
      discoveredOperationResult,
    );
    if (
      discovered.envelope === null ||
      discovered.session.battleState.tag !== "activeBattle"
    ) {
      throw new Error("Expected an active Battle act frontier.");
    }
    const cases: ProductionBattleConsumerSeamCase[] = [
      seamCase(
        "acts",
        discoveredOperationResult,
        discovered.envelope,
        discovered.session,
        await runtimeProjection(host, decodedPlaySessionId, playSessionCaller),
      ),
    ];
    const attackSubject = attackSubjectFromActs(
      jsonObject(discoveredOperationResult),
      "seam-goblin",
      "Scimitar",
    );
    const targetResponse = await call(client, "fill_battle_hole", {
      playSessionId,
      subject: attackSubject,
      fill: attackTargetFill(attackSubject, "seam-wizard"),
    });
    const targetOperationResult = operationResult(targetResponse);
    const target = Schema.decodeUnknownSync(BattleResolutionOutputSchema)(
      targetOperationResult,
    );
    if (
      target.result.tag !== "needsHoles" ||
      target.envelope.frontier.kind !== "holes" ||
      target.session.battleState.tag !== "activeBattle"
    ) {
      throw new Error("Expected an ordinary Battle Holes frontier.");
    }
    cases.push(
      seamCase(
        "holes",
        targetOperationResult,
        target.envelope,
        target.session,
        await runtimeProjection(host, decodedPlaySessionId, playSessionCaller),
      ),
    );

    const rejectedResponse = await call(client, "fill_battle_hole", {
      playSessionId,
      subject: attackSubject,
      fill: {
        kind: "attackRoll",
        holeId: "battle:cross-boundary-seam:wrong-hole",
        value: { total: 20, naturalD20: 20 },
      },
    });
    if (rejectedResponse.isError !== true) {
      throw new Error("Expected the seam's stale fill to be rejected.");
    }
    const rejectedPayload = jsonObject(toolPayload(rejectedResponse));
    const rejectedOperationResult = jsonObject(
      rejectedPayload.operation,
    ).result;
    const rejectedDetails = jsonObject(rejectedOperationResult).details;
    const rejectedEnvelope = Schema.decodeUnknownSync(
      BattlePresentedCheckpointFrontierEnvelopeSchema,
    )(jsonObject(rejectedDetails).battleEnvelope);
    const rejectedSession = Schema.decodeUnknownSync(
      McpActiveSessionSnapshotSchema,
    )(rejectedPayload.projection);
    cases.push(
      seamCase(
        "rejected",
        rejectedOperationResult,
        rejectedEnvelope,
        rejectedSession,
        await runtimeProjection(host, decodedPlaySessionId, playSessionCaller),
      ),
    );

    const attackResponse = await call(client, "fill_battle_hole", {
      playSessionId,
      subject: attackSubject,
      fill: attackRollFill(20, 20),
    });
    const attackOperationResult = operationResult(attackResponse);
    const attack = Schema.decodeUnknownSync(BattleResolutionOutputSchema)(
      attackOperationResult,
    );
    if (
      attack.result.tag !== "needsHoles" ||
      attack.envelope.frontier.kind !== "interruptDecision" ||
      attack.session.battleState.tag !== "activeBattle"
    ) {
      throw new Error("Expected a durable interrupt decision frontier.");
    }
    cases.push(
      seamCase(
        "interruptDecision",
        attackOperationResult,
        attack.envelope,
        attack.session,
        await runtimeProjection(host, decodedPlaySessionId, playSessionCaller),
      ),
    );

    const interruptResponse = await call(client, "fill_battle_hole", {
      playSessionId,
      subject: attackSubject,
      fill: {
        kind: "interruptDecision",
        holeId: attack.envelope.frontier.decisionHole.holeId,
        value: { kind: "decline", responderId: "seam-wizard" },
      },
    });
    const interruptOperationResult = operationResult(interruptResponse);
    const interrupt = Schema.decodeUnknownSync(BattleResolutionOutputSchema)(
      interruptOperationResult,
    );
    if (
      interrupt.result.tag !== "needsHoles" ||
      interrupt.envelope.frontier.kind !== "holes" ||
      interrupt.session.battleState.tag !== "activeBattle"
    ) {
      throw new Error("Expected a damage-hole frontier after the interrupt.");
    }
    const damageHole = interrupt.envelope.frontier.holes.find(
      (hole) => hole.kind === "rolledDice",
    );
    if (damageHole === undefined) {
      throw new Error("Expected a damage hole after declining the interrupt.");
    }
    const resolutionResponse = await call(client, "fill_battle_hole", {
      playSessionId,
      subject: attackSubject,
      fill: rolledDiceFill(damageHole.holeId, [[5, 5]]),
    });
    const resolutionOperationResult = operationResult(resolutionResponse);
    const resolved = Schema.decodeUnknownSync(BattleResolutionOutputSchema)(
      resolutionOperationResult,
    );
    if (
      resolved.result.tag !== "resolved" ||
      resolved.envelope.frontier.kind !== "acts" ||
      resolved.session.battleState.tag !== "activeBattle"
    ) {
      throw new Error("Expected a resolved Acts frontier after the interrupt.");
    }
    cases.push(
      seamCase(
        "resolution",
        resolutionOperationResult,
        resolved.envelope,
        resolved.session,
        await runtimeProjection(host, decodedPlaySessionId, playSessionCaller),
      ),
    );
    return cases;
  } finally {
    await Promise.allSettled([client.close(), server.close()]);
  }
}

function seamCase(
  kind: ProductionBattleConsumerSeamCase["kind"],
  operationResult: unknown,
  envelope: PublishedBattleEnvelope,
  session: Schema.Schema.Type<typeof McpActiveSessionSnapshotSchema>,
  runtime: RuntimeBattleProjection,
): ProductionBattleConsumerSeamCase {
  return {
    kind,
    operationResult,
    envelope,
    session,
    runtimeEnvelope: runtime.runtimeEnvelope,
    runtimeSession: runtime.session,
  };
}

type RuntimeBattleProjection = {
  readonly session: BattleRuntimeSession;
  readonly publishedEnvelope: PublishedBattleEnvelope;
  readonly runtimeEnvelope: BattlePresentedCheckpointFrontierEnvelope;
};

async function call(
  client: Client,
  name: string,
  args: Record<string, unknown>,
) {
  const routed = await acceptancePlaySessionRoutedArgs(client, name, args);
  return client.callTool({
    name,
    arguments: battleToolWireArgs(name, routed),
  });
}

function operationResult(value: unknown): unknown {
  const payload = jsonObject(toolPayload(value));
  return jsonObject(payload.operation).result;
}

function toolPayload(value: unknown): unknown {
  const result = jsonObject(value);
  if (result.structuredContent !== undefined) return result.structuredContent;
  const content = result.content;
  if (!Array.isArray(content)) {
    throw new Error("Expected MCP tool content at the seam.");
  }
  const first = jsonObject(content[0]);
  if (typeof first.text !== "string") {
    throw new Error("Expected text MCP tool content at the seam.");
  }
  return JSON.parse(first.text) as unknown;
}

function jsonObject(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected an object seam payload.");
  }
  return value as Readonly<Record<string, unknown>>;
}

async function runtimeProjection(
  host: ReturnType<typeof createDndMcpProtocolServer>,
  playSessionId: Schema.Schema.Type<typeof PlaySessionIdSchema>,
  caller: Awaited<ReturnType<typeof acceptancePlaySessionCaller>>,
): Promise<RuntimeBattleProjection> {
  const result = await host.playSessions.run(playSessionId, caller, (root) => {
    const session = root.sessionStore.battleSession;
    if (session === null) return null;
    const envelope = battlePresentationEnvelopeForSession(root, session);
    if (Either.isLeft(envelope)) {
      throw new Error("Expected the live Battle to have a presentation.");
    }
    return { session, envelope: envelope.right };
  });
  if (Either.isLeft(result) || result.right.value === null) {
    throw new Error("Expected the live MCP Play Session to contain a Battle.");
  }
  const { session, envelope } = result.right.value;
  const publishedEnvelope = Schema.decodeUnknownSync(
    BattlePresentedCheckpointFrontierEnvelopeSchema,
  )(
    Schema.encodeSync(BattlePresentedCheckpointFrontierEnvelopeSchema)(
      envelope,
    ),
  );
  return { session, publishedEnvelope, runtimeEnvelope: envelope };
}
