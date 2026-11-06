import { existsSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Result } from "effect";
import { createMcpApplicationServices } from "../src/composition-root.ts";
import { disabledAdminMirrorPublication } from "../src/admin-mirror.ts";
import { createDndMcpProtocolServer } from "../src/protocol-server.ts";
import { openSqlitePlaySessionRepository } from "../src/sqlite-play-session-repository.ts";
import {
  decodePrincipalId,
  decodeEpochMilliseconds,
} from "../src/play-session-access.ts";
import { decodePlaySessionId } from "../src/play-session.ts";
import {
  attackSubjectFromActs,
  attackTargetFill,
  attackRollFill,
  rolledDiceFill,
} from "./mcp-acceptance-scenarios.ts";

function value(result) {
  if (Result.isFailure(result)) throw new Error(JSON.stringify(result.failure));
  return result.success;
}
const principalId = value(
  decodePrincipalId("principal:synthetic-source-fixture"),
);
const fixtureSessionId = value(
  decodePlaySessionId("play-session:00000000-0000-4000-8000-000000000614"),
);
const fixtureTime = value(decodeEpochMilliseconds(1000));

async function connection(databasePath) {
  const services = {
    ...createMcpApplicationServices(),
    createAdminMirrorPublication: disabledAdminMirrorPublication,
  };
  // This entry is bundled only inside the explicitly pinned original source.
  const repository = value(openSqlitePlaySessionRepository(databasePath));
  const host = createDndMcpProtocolServer(services, undefined, {
    playSessionRepository: repository,
    toolSurface: "regular",
    requestIdentity: { tag: "authenticated", principalId },
    playSessionIdFactory: () => fixtureSessionId,
    playSessionNow: () => fixtureTime,
  });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({
    name: "synthetic-source-migration-fixture",
    version: "1",
  });
  await host.server.connect(serverTransport);
  await client.connect(clientTransport);
  return {
    async call(name, args) {
      const result = await client.callTool({
        name,
        arguments: {
          ...args,
          ...(name === "create_play_session"
            ? {}
            : { playSessionId: fixtureSessionId }),
        },
      });
      if (result.isError === true || result.structuredContent === undefined)
        throw new Error(JSON.stringify(result));
      return result.structuredContent;
    },
    async close() {
      await Promise.allSettled([client.close(), host.server.close()]);
      repository.close();
    },
  };
}
function operation(result) {
  if (result.operation?.result === undefined)
    throw new Error("Expected a source MCP operation result.");
  return result.operation.result;
}

export async function createOriginalFixture(databasePath) {
  if (existsSync(databasePath))
    throw new Error("The original fixture database must be fresh.");
  const connected = await connection(databasePath);
  try {
    const created = await connected.call("create_play_session", {});
    if (created.playSessionId !== fixtureSessionId)
      throw new Error("Source fixture allocation changed.");
    const prefix = operation(
      await connected.call("roll_dice", { groups: [{ dice: 2, dieSize: 20 }] }),
    );
    const started = operation(
      await connected.call("start_battle", {
        battleId: "synthetic-source-migration",
        initiativeMode: "direct",
        companionAdmissions: [],
        initialCombatants: ["synthetic-attacker", "synthetic-target"].map(
          (combatantId, index) => ({
            kind: "statBlock",
            statBlockId: "stat_block_goblin_warrior",
            combatantId,
            initiative: 20 - index,
            ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
            admissionSource: { kind: "encounterParticipant" },
          }),
        ),
      }),
    );
    const subject = attackSubjectFromActs(
      started,
      "synthetic-attacker",
      "Scimitar",
    );
    await connected.call("fill_battle_hole", {
      subject,
      fill: attackTargetFill(subject, "synthetic-target"),
    });
    const pending = operation(
      await connected.call("fill_battle_hole", {
        subject,
        fill: attackRollFill(20, 16),
      }),
    );
    if (
      !pending.envelope?.frontier?.holes?.some(
        (hole) => hole.kind === "rolledDice",
      )
    )
      throw new Error("Expected source damage continuation.");
    return {
      playSessionId: fixtureSessionId,
      principalId,
      subject,
      prefix,
      pending,
    };
  } finally {
    await connected.close();
  }
}

export async function continueOriginalFixture(databasePath, subject) {
  const connected = await connection(databasePath);
  try {
    const next = operation(
      await connected.call("roll_dice", { groups: [{ dice: 3, dieSize: 6 }] }),
    );
    const attack = operation(await connected.call("read_battle_state", {}));
    const damageHole = attack.envelope?.frontier?.holes?.find(
      (hole) => hole.kind === "rolledDice",
    );
    if (damageHole === undefined)
      throw new Error("Expected original pending damage.");
    const damage = operation(
      await connected.call("roll_dice", { groups: [{ dice: 1, dieSize: 6 }] }),
    );
    const faces = damage.groups?.[0]?.results;
    if (!Array.isArray(faces))
      throw new Error("Expected original damage faces.");
    const settled = operation(
      await connected.call("fill_battle_hole", {
        subject,
        fill: rolledDiceFill(damageHole.holeId, [faces]),
      }),
    );
    return { next, attack, damage, settled };
  } finally {
    await connected.close();
  }
}
