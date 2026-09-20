import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client({ name: "distribution-smoke", version: "1.0.0" });
const transport = new StdioClientTransport({
  command: "./node_modules/.bin/dnd-mcp",
  args: [],
  stderr: "inherit",
});
const deadline = setTimeout(() => {
  void transport.close().finally(() => process.exit(1));
}, 60_000);

function operationResult(response, name) {
  assert.notEqual(response.isError, true, `${name} must succeed`);
  const payload = response.structuredContent;
  assert(
    payload && typeof payload === "object",
    `${name} must return structured content`,
  );
  assert.equal(payload.tag, "playSessionAvailable");
  assert.equal(payload.operation?.name, name);
  const result = payload.operation?.result;
  assert(
    result && typeof result === "object",
    `${name} must return an operation result`,
  );
  return result;
}

try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  assert(tools.length > 0);
  assert(tools.some((tool) => tool.name === "create_play_session"));

  const created = await client.callTool({
    name: "create_play_session",
    arguments: {},
  });
  assert.notEqual(created.isError, true);
  const createdPayload = created.structuredContent;
  assert(
    createdPayload && typeof createdPayload === "object",
    "create_play_session must return structured content",
  );
  const playSessionId = createdPayload.playSessionId;
  assert.equal(typeof playSessionId, "string");
  const routed = { playSessionId };

  const started = await client.callTool({
    name: "start_battle",
    arguments: {
      ...routed,
      battleId: "battle:distribution-smoke",
      initiativeMode: "direct",
      companionAdmissions: [],
      initialCombatants: [
        {
          kind: "statBlock",
          ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
          statBlockId: "stat_block_goblin_warrior",
          combatantId: "goblin",
          initiative: 20,
          admissionSource: { kind: "encounterParticipant" },
        },
        {
          kind: "statBlock",
          ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
          statBlockId: "stat_block_skeleton",
          combatantId: "skeleton",
          initiative: 10,
          admissionSource: { kind: "encounterParticipant" },
        },
      ],
    },
  });
  const startedResult = operationResult(started, "start_battle");
  assert.deepEqual(startedResult.envelope.checkpoint.turnOrder, [
    "goblin",
    "skeleton",
  ]);

  const discovered = await client.callTool({
    name: "discover_battle_acts",
    arguments: routed,
  });
  const discoveredResult = operationResult(discovered, "discover_battle_acts");
  const acts = discoveredResult.envelope.frontier.acts;
  assert(Array.isArray(acts));
  const attackAct = acts.find((candidate) => {
    const subject = candidate.subject;
    const selection = subject?.statBlockDamageSelection;
    return (
      candidate.summary === "Take the Attack action with Scimitar." &&
      subject?.tag === "action" &&
      subject.action === "attack" &&
      subject.actorId === "goblin" &&
      Array.isArray(selection) &&
      selection.length > 0 &&
      selection.every((component) => component?.notation === "rolled")
    );
  });
  assert(attackAct, "expected the rolled Goblin Scimitar act");
  const subject = attackAct.subject;
  const targetHole = attackAct.initialHoles.find(
    (hole) => hole.kind === "targetChoice",
  );
  assert(targetHole, "expected the attack target hole");
  assert.equal(typeof subject.procedureRef, "string");
  assert(Array.isArray(subject.statBlockDamageSelection));
  const attackSelection = targetHole.attack?.selection;
  assert(
    attackSelection &&
      typeof attackSelection.procedureRef === "string" &&
      Array.isArray(attackSelection.statBlockDamageSelection),
    "expected the Stat Block attack selection on the target hole",
  );
  assert.deepEqual(
    attackSelection.statBlockDamageSelection,
    subject.statBlockDamageSelection,
  );

  const target = await client.callTool({
    name: "fill_battle_hole",
    arguments: {
      ...routed,
      subject,
      fill: {
        kind: "targetChoice",
        holeId: targetHole.holeId,
        value: "skeleton",
        spatialFacts: [
          {
            kind: "attackTargetDistance",
            actorId: subject.actorId,
            targetId: "skeleton",
            distanceFeet: 5,
            procedureRef: attackSelection.procedureRef,
            statBlockDamageSelection: attackSelection.statBlockDamageSelection,
          },
        ],
      },
    },
  });
  const targetResult = operationResult(target, "fill_battle_hole");
  assert.equal(targetResult.result.tag, "needsHoles");
  const attackRollFrontier = targetResult.envelope.frontier;
  assert.equal(attackRollFrontier.kind, "holes");
  assert.deepEqual(attackRollFrontier.replaySubject, subject);
  assert.deepEqual(attackRollFrontier.pendingProcedure, {
    kind: "subjectResolution",
  });
  assert.deepEqual(attackRollFrontier.continuation, {
    kind: "ordinaryReplay",
  });
  assert(
    attackRollFrontier.holes.some((hole) => hole.kind === "attackRoll"),
    "expected the attack-roll hole",
  );

  const read = await client.callTool({
    name: "read_battle_state",
    arguments: routed,
  });
  const readResult = operationResult(read, "read_battle_state");
  assert.equal(readResult.envelope.frontier.kind, "holes");
  assert.deepEqual(readResult.envelope.frontier.replaySubject, subject);
  assert.deepEqual(
    readResult.envelope.frontier.pendingProcedure,
    attackRollFrontier.pendingProcedure,
  );
  assert.deepEqual(
    readResult.envelope.frontier.continuation,
    attackRollFrontier.continuation,
  );
} finally {
  clearTimeout(deadline);
  await client.close();
}
