import { CHATGPT_APP_VERSION_STORAGE_LIMIT_BYTES } from "../../test-support/tool-catalog-budget.ts";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Result, Schema } from "effect";
import { BattleFillSchema } from "@dnd/battle-runtime";
import { describe, expect, it } from "vitest";
import {
  createDraft2020JsonSchemaValidator,
  requireJsonSchema,
} from "../../test-support/json-schema.ts";
import { createMcpPlaySessionRoot } from "../composition-root.ts";
import {
  buildAdvertisedToolDefinitions,
  buildCanonicalToolDefinitions,
  buildCanonicalCodecToolDefinitions,
  createDndMcpProtocolServer,
} from "../protocol-server.ts";
import { CHATGPT_TOOL_PLAN } from "./operation-tool-plan.ts";
import {
  CHATGPT_EXECUTION_TOOLS,
  chatGptExecutionToolDefinitions,
} from "./tool-surface.ts";
import {
  battleId,
  characterSeed,
  statBlockCreatureInit,
  startBattleSessionRight,
  fighterAttackSubject,
  attackInitialTargetHole,
  targetFill,
  goblinId,
  battleProcedureExecutionRefForTest,
} from "../../../battle-runtime/src/battle-runtime.test-support.ts";

import { chatGptBattleGuidance } from "./battle-guidance.ts";
import { jsonContentPayload } from "../tool-content.ts";
import { BattleResolutionOutputSchema } from "../battle-tool-output.ts";
import { resolveBattleActInputSchema } from "../battle-tool-input.ts";
import { ChatGptBattleExecutionArgsSchema } from "./battle-execution-schema.ts";
import {
  fighterId,
  findAct,
  readyDeclarationFillForTest,
  movementFill,
} from "../../../battle-runtime/src/battle-runtime.test-support.ts";

const PlaySessionHandleSchema = Schema.Struct({ playSessionId: Schema.String });
const JsonTextContentSchema = Schema.Tuple([
  Schema.Struct({ type: Schema.Literal("text"), text: Schema.String }),
]);

describe("ChatGPT tool surface", () => {
  it("keeps Battle tools discoverable while rejecting execution without an active Battle", () => {
    const root = createMcpPlaySessionRoot();
    const before = root.sessionStore.snapshot();
    const otherBattle = startBattleSessionRight({
      battleId: battleId("synthetic-other-battle"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const attack = CHATGPT_EXECUTION_TOOLS.attack.handle(root, {
      subject: fighterAttackSubject(otherBattle.state),
    });
    const answer = CHATGPT_EXECUTION_TOOLS.answer_battle_hole.handle(root, {
      fill: {
        kind: "rolledDice",
        holeId: "synthetic-hole",
        value: [{ results: [1] }],
      },
    });
    expect(JSON.stringify(attack)).toContain("NO_ACTIVE_BATTLE");
    expect(JSON.stringify(answer)).toContain("NO_ACTIVE_BATTLE");
    expect(root.sessionStore.snapshot()).toEqual(before);
  });

  it("requires explicit falling-creature target facts only on the initial report", () => {
    const validate = createDraft2020JsonSchemaValidator().getValidator(
      requireJsonSchema(
        CHATGPT_EXECUTION_TOOLS.report_creature_fall.definition.inputSchema,
        "creature-fall input",
      ),
    );
    const subject = {
      tag: "runtimeCommand",
      command: "creatureFalls",
      actorId: fighterId,
      fallingCreatureId: goblinId,
    } as const;
    const fill = {
      kind: "rolledDice",
      holeId: "synthetic-continuation-roll",
      value: [{ results: [5] }],
    };
    for (const [input, accepted] of [
      [{ subject }, false],
      [{ subject, reactionSpellTargetFacts: [] }, true],
      [{ subject, fill }, false],
      [{ subject, fill, reactionSpellTargetFacts: [] }, false],
    ] as const) {
      expect(validate(input).valid).toBe(accepted);
      expect(
        Result.isSuccess(
          Schema.decodeUnknownResult(ChatGptBattleExecutionArgsSchema, {
            onExcessProperty: "error",
          })(input),
        ),
      ).toBe(accepted);
    }
    const regularValidate = createDraft2020JsonSchemaValidator().getValidator(
      requireJsonSchema(
        resolveBattleActInputSchema,
        "regular fall-report input",
      ),
    );
    expect(regularValidate({ subject }).valid).toBe(true);
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(ChatGptBattleExecutionArgsSchema)({
          subject: { tag: "action", action: "dodge", actorId: fighterId },
          reactionSpellTargetFacts: [],
        }),
      ),
    ).toBe(false);
    const root = createMcpPlaySessionRoot();
    const session = startBattleSessionRight({
      battleId: battleId("synthetic-chatgpt-fall-facts"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(Result.isSuccess(root.sessionStore.storeActiveBattle(session))).toBe(
      true,
    );
    const before = root.sessionStore.snapshot();
    expect(
      JSON.stringify(
        CHATGPT_EXECUTION_TOOLS.report_creature_fall.handle(root, { subject }),
      ),
    ).toContain("INVALID_ARGUMENTS");
    expect(root.sessionStore.snapshot()).toEqual(before);
    // Neither combatant has a falling-creature mitigation Reaction, so the table can confirm an empty fact list.
    expect(
      jsonContentPayload(
        CHATGPT_EXECUTION_TOOLS.report_creature_fall.handle(root, {
          subject,
          reactionSpellTargetFacts: [],
        }),
      ),
    ).toMatchObject({ result: { tag: "resolved" } });
  });

  it("restricts Reaction modifiers and selects them before supplying any hole answers", () => {
    const validate = createDraft2020JsonSchemaValidator().getValidator(
      requireJsonSchema(
        CHATGPT_EXECUTION_TOOLS.reduce_attack_roll.definition.inputSchema,
        "attack-roll reduction input",
      ),
    );
    const choice = {
      kind: "reactionRollOrDamageReduction",
      procedureRef: battleProcedureExecutionRefForTest("synthetic-reduction"),
      modifierKind: "attackRollReduction",
      fills: [],
    };
    const inputForChoice = (selected: typeof choice) => ({
      fill: {
        kind: "interruptDecision",
        holeId: "synthetic-hole",
        value: {
          kind: "resolve",
          responderId: "synthetic-responder",
          choice: selected,
        },
      },
    });
    expect(validate(inputForChoice(choice)).valid).toBe(true);
    expect(
      validate(
        inputForChoice({ ...choice, modifierKind: "abilityCheckReduction" }),
      ).valid,
    ).toBe(false);
    const input = inputForChoice(choice);
    const root = createMcpPlaySessionRoot();
    const session = startBattleSessionRight({
      battleId: battleId("synthetic-chatgpt-reaction-batch"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(Result.isSuccess(root.sessionStore.storeActiveBattle(session))).toBe(
      true,
    );
    const before = root.sessionStore.snapshot();
    for (const fills of [
      [input.fill],
      [
        {
          kind: "rolledDice",
          holeId: "synthetic-roll",
          value: [{ results: [5] }],
        },
      ],
    ]) {
      const batched = {
        ...input,
        fill: {
          ...input.fill,
          value: {
            ...input.fill.value,
            choice: { ...choice, fills },
          },
        },
      };
      expect(
        Result.isSuccess(
          Schema.decodeUnknownResult(BattleFillSchema)(batched.fill),
        ),
      ).toBe(true);
      expect(validate(batched).valid).toBe(false);
      expect(
        JSON.stringify(
          CHATGPT_EXECUTION_TOOLS.reduce_attack_roll.handle(root, batched),
        ),
      ).toContain("INVALID_ARGUMENTS");
      expect(root.sessionStore.snapshot()).toEqual(before);
    }
  });

  it("selects a readied movement Reaction, then settles its separately returned hole", () => {
    const root = createMcpPlaySessionRoot();
    const initial = startBattleSessionRight({
      battleId: battleId("synthetic-chatgpt-readied-movement"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(Result.isSuccess(root.sessionStore.storeActiveBattle(initial))).toBe(
      true,
    );
    const readySubject = {
      tag: "action",
      action: "ready",
      actorId: fighterId,
    } as const;
    const readyAct = findAct(initial, readySubject);
    const declaration = readyAct.initialHoles.find(
      (hole) => hole.kind === "readyDeclaration",
    );
    if (declaration?.kind !== "readyDeclaration")
      throw new Error("Expected a Ready declaration.");
    const response = declaration.responseChoices.find(
      (choice) => choice.kind === "movement",
    );
    if (response === undefined)
      throw new Error("Expected a readied movement choice.");
    expect(
      jsonContentPayload(
        CHATGPT_EXECUTION_TOOLS.ready_action.handle(root, {
          subject: readySubject,
        }),
      ),
    ).toMatchObject({ result: { tag: "needsHoles" } });
    expect(
      jsonContentPayload(
        CHATGPT_EXECUTION_TOOLS.answer_battle_hole.handle(root, {
          fill: readyDeclarationFillForTest(
            declaration,
            "the goblin moves",
            response,
          ),
        }),
      ),
    ).toMatchObject({ result: { tag: "resolved" } });
    expect(
      jsonContentPayload(
        CHATGPT_EXECUTION_TOOLS.end_turn.handle(root, {
          subject: {
            tag: "runtimeCommand",
            command: "endTurn",
            actorId: fighterId,
          },
        }),
      ),
    ).toMatchObject({ result: { tag: "resolved" } });
    const reportSubject = {
      tag: "runtimeCommand",
      command: "reportReadyTrigger",
      actorId: goblinId,
      readiedActorId: fighterId,
    } as const;
    const reported = Schema.decodeUnknownSync(BattleResolutionOutputSchema)(
      jsonContentPayload(
        CHATGPT_EXECUTION_TOOLS.report_ready_trigger.handle(root, {
          subject: reportSubject,
        }),
      ),
    );
    if (reported.envelope.frontier.kind !== "interruptDecision")
      throw new Error("Expected the readied Reaction offer.");
    const reactionFill = {
      kind: "interruptDecision",
      holeId: reported.envelope.frontier.decisionHole.holeId,
      value: {
        kind: "resolve",
        responderId: fighterId,
        choice: { kind: "releaseReadiedMovement", fills: [] },
      },
    } as const;
    const pendingReaction = root.sessionStore.snapshot();
    expect(
      JSON.stringify(
        CHATGPT_EXECUTION_TOOLS.answer_battle_hole.handle(root, {
          fill: reactionFill,
        }),
      ),
    ).toContain("INVALID_ARGUMENTS");
    expect(
      JSON.stringify(
        CHATGPT_EXECUTION_TOOLS.answer_battle_hole.handle(root, {
          fill: {
            kind: "rolledDice",
            holeId: "synthetic-not-current",
            value: [{ results: [1] }],
          },
        }),
      ),
    ).toContain("BATTLE_ORDINARY_HOLE_REQUIRED");
    expect(
      JSON.stringify(
        CHATGPT_EXECUTION_TOOLS.attack.handle(root, { fill: reactionFill }),
      ),
    ).toContain("CHATGPT_TOOL_OPERATION_MISMATCH");
    expect(
      JSON.stringify(
        CHATGPT_EXECUTION_TOOLS.move.handle(root, {
          subject: reportSubject,
          fill: reactionFill,
        }),
      ),
    ).toContain("INVALID_ARGUMENTS");
    expect(root.sessionStore.snapshot()).toEqual(pendingReaction);
    const selected = Schema.decodeUnknownSync(BattleResolutionOutputSchema)(
      jsonContentPayload(
        CHATGPT_EXECUTION_TOOLS.move.handle(root, {
          fill: {
            kind: "interruptDecision",
            holeId: reported.envelope.frontier.decisionHole.holeId,
            value: {
              kind: "resolve",
              responderId: fighterId,
              choice: { kind: "releaseReadiedMovement", fills: [] },
            },
          },
        }),
      ),
    );
    expect(selected.result.tag).toBe("needsHoles");
    if (selected.envelope.frontier.kind !== "holes")
      throw new Error("Expected the readied movement hole.");
    const hole = selected.envelope.frontier.holes.find(
      (candidate) => candidate.kind === "movement",
    );
    if (hole?.kind !== "movement") throw new Error("Expected a movement hole.");
    expect(chatGptBattleGuidance(root)).toMatchObject({
      kind: "ordinaryContinuation",
      routing: { kind: "available", tools: ["answer_battle_hole"] },
    });
    expect(
      jsonContentPayload(
        CHATGPT_EXECUTION_TOOLS.answer_battle_hole.handle(root, {
          fill: movementFill(hole, {
            movementCostFeet: 5,
            provokedOpportunityAttacks: [],
          }),
        }),
      ),
    ).toMatchObject({
      result: { tag: "resolved" },
      envelope: { frontier: { kind: "acts" } },
    });
    expect(root.sessionStore.getPendingBattleTransaction()).toBeNull();
  });

  it("limits decline to its owned Reaction decision schema", () => {
    const validator = createDraft2020JsonSchemaValidator().getValidator(
      requireJsonSchema(
        CHATGPT_EXECUTION_TOOLS.decline_reaction.definition.inputSchema,
        "decline Reaction input",
      ),
    );
    expect(
      validator({
        fill: {
          kind: "interruptDecision",
          holeId: "synthetic-hole",
          value: { kind: "decline", responderId: "synthetic-responder" },
        },
      }).valid,
    ).toBe(true);
    expect(validator({}).valid).toBe(false);
    for (const fill of [
      {
        kind: "targetChoice",
        holeId: "synthetic-hole",
        value: "synthetic-target",
      },
      {
        kind: "interruptDecision",
        holeId: "synthetic-hole",
        value: {
          kind: "resolve",
          responderId: "synthetic-responder",
          choice: {
            kind: "reactionRollOrDamageReduction",
            procedureRef: battleProcedureExecutionRefForTest(
              "synthetic-reduction",
            ),
            modifierKind: "attackRollReduction",
            fills: [],
          },
        },
      },
    ]) {
      expect(
        Result.isSuccess(Schema.decodeUnknownResult(BattleFillSchema)(fill)),
      ).toBe(true);
      expect(validator({ fill }).valid).toBe(false);
    }
  });

  it("advertises the complete static 126-tool contract with annotations", () => {
    const definitions = buildAdvertisedToolDefinitions(
      chatGptExecutionToolDefinitions,
      "hosted",
      "chatgpt",
    );
    expect(definitions.map((tool) => tool.name).sort()).toEqual(
      Object.keys(CHATGPT_TOOL_PLAN).sort(),
    );
    expect(definitions).toHaveLength(126);
    const validator = createDraft2020JsonSchemaValidator();
    for (const tool of definitions) {
      expect(
        typeof validator.getValidator(
          requireJsonSchema(tool.inputSchema, `${tool.name} input`),
        ),
      ).toBe("function");
      for (const hidden of [
        "resolve_battle_act",
        "fill_battle_hole",
        "battle_lifecycle",
        "query_character_session",
        "apply_character_session_operation",
      ])
        expect(tool.description).not.toContain(hidden);
      if (tool.outputSchema !== undefined)
        expect(
          typeof validator.getValidator(
            requireJsonSchema(tool.outputSchema, `${tool.name} output`),
          ),
        ).toBe("function");
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.annotations).toEqual(
        expect.objectContaining({
          readOnlyHint: expect.any(Boolean),
          destructiveHint: expect.any(Boolean),
          idempotentHint: expect.any(Boolean),
          openWorldHint: expect.any(Boolean),
        }),
      );
    }
    expect(buildAdvertisedToolDefinitions()).toHaveLength(26);
  });

  it("reviews the named surface with canonical routed and codec inputs", () => {
    const canonical = buildCanonicalToolDefinitions(
      chatGptExecutionToolDefinitions,
      "hosted",
      "chatgpt",
    );
    const codecs = buildCanonicalCodecToolDefinitions(
      chatGptExecutionToolDefinitions,
      "hosted",
      "chatgpt",
    );
    for (const definitions of [canonical, codecs]) {
      expect(definitions.map((definition) => definition.name).sort()).toEqual(
        Object.keys(CHATGPT_TOOL_PLAN).sort(),
      );
      for (const definition of definitions)
        expect(definition.outputSchema).toBeDefined();
    }
    const query = {
      characterId: "synthetic-character",
      query: { kind: "armorClass" },
    };
    const validator = createDraft2020JsonSchemaValidator();
    const forQuery = (definitions: typeof canonical) => {
      const definition = definitions.find(
        (candidate) => candidate.name === "query_armor_class",
      );
      expect(definition).toBeDefined();
      return validator.getValidator(
        requireJsonSchema(
          definition?.inputSchema,
          "canonical armor class query",
        ),
      );
    };
    const routed = forQuery(canonical);
    const codec = forQuery(codecs);
    expect(codec(query).valid).toBe(true);
    expect(routed(query).valid).toBe(false);
    expect(
      routed({
        ...query,
        playSessionId: "play-session:00000000-0000-4000-8000-000000000901",
      }).valid,
    ).toBe(true);
    expect(codec({ ...query, query: { kind: "spellAccess" } }).valid).toBe(
      false,
    );
    expect(buildCanonicalToolDefinitions()).toHaveLength(26);
    expect(buildCanonicalCodecToolDefinitions()).toHaveLength(26);
  });

  it("fits the repository's ChatGPT app-version tool catalog budget", () => {
    const definitions = buildAdvertisedToolDefinitions(
      chatGptExecutionToolDefinitions,
      "hosted",
      "chatgpt",
    );
    expect(Buffer.byteLength(JSON.stringify(definitions), "utf8")).toBeLessThan(
      CHATGPT_APP_VERSION_STORAGE_LIMIT_BYTES,
    );
  });

  it("routes named tools through Play Session authorization and hides generic execution tools", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const host = createDndMcpProtocolServer(undefined, undefined, {
      toolSurface: "chatgpt",
    });
    const client = new Client({ name: "chatgpt-test", version: "1" });
    try {
      await host.server.connect(serverTransport);
      await client.connect(clientTransport);
      const tools = (await client.listTools()).tools.map((tool) => tool.name);
      expect(tools).toContain("attack");
      expect(tools).toContain("cast_spell");
      expect(tools).not.toContain("resolve_battle_act");
      expect(tools).not.toContain("fill_battle_hole");
      const workflow = await client.callTool({
        name: "describe_mcp_workflow",
        arguments: {},
      });
      const guide = JSON.stringify(workflow);
      expect(guide).toContain("chatGptBattleOperations");
      for (const hidden of [
        "resolve_battle_act",
        "fill_battle_hole",
        "battle_lifecycle",
        "query_character_session",
        "apply_character_session_operation",
      ])
        expect(guide).not.toContain(hidden);
      const created = await client.callTool({
        name: "create_play_session",
        arguments: {},
      });
      expect(created.content).toHaveLength(1);
      expect(created.structuredContent).toMatchObject({
        chatGptBattleOperations: { kind: "noBattle" },
      });
      const content = Schema.decodeUnknownSync(JsonTextContentSchema)(
        created.content,
      );
      expect(JSON.parse(content[0].text)).toEqual(created.structuredContent);
      const handle = Schema.decodeUnknownSync(PlaySessionHandleSchema)(
        created.structuredContent,
      );
      const wrong = await client.callTool({
        name: "query_spell_access",
        arguments: {
          playSessionId: handle.playSessionId,
          characterId: "synthetic-character",
          query: { kind: "knownForms" },
        },
      });
      expect(JSON.stringify(wrong)).toContain("INVALID_ARGUMENTS");
      const missing = await client.callTool({
        name: "query_spell_access",
        arguments: {
          playSessionId: handle.playSessionId,
          characterId: "synthetic-character",
          query: { kind: "spellAccess" },
        },
      });
      expect(JSON.stringify(missing)).toContain("UNKNOWN_CHARACTER_SESSION");
      expect(JSON.stringify(missing)).toContain("query_spell_access");
    } finally {
      await Promise.allSettled([client.close(), host.server.close()]);
    }
  });

  it("selects a named operation before admitting facts to its pending transaction", () => {
    const root = createMcpPlaySessionRoot();
    const session = startBattleSessionRight({
      battleId: battleId("synthetic-chatgpt-battle"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(Result.isSuccess(root.sessionStore.storeActiveBattle(session))).toBe(
      true,
    );
    const guidance = chatGptBattleGuidance(root);
    expect(guidance.kind).toBe("acts");
    if (guidance.kind !== "acts") throw new Error("Expected discovered acts.");
    expect(guidance.acts.length).toBeGreaterThan(0);
    for (const act of guidance.acts) {
      expect(act.routing.kind).toBe("available");
      if (act.routing.kind === "available")
        expect(act.routing.tools.length).toBeGreaterThan(0);
    }
    const subject = fighterAttackSubject(session.state);
    const fill = targetFill(
      attackInitialTargetHole(session.state, subject),
      goblinId,
    );
    const before = root.sessionStore.snapshot();
    const wrong = CHATGPT_EXECUTION_TOOLS.dash.handle(root, { subject });
    expect(JSON.stringify(wrong)).toContain("CHATGPT_TOOL_OPERATION_MISMATCH");
    expect(root.sessionStore.snapshot()).toEqual(before);
    expect(
      JSON.stringify(
        CHATGPT_EXECUTION_TOOLS.answer_battle_hole.handle(root, { fill }),
      ),
    ).toContain("BATTLE_CONTINUATION_REQUIRED");
    expect(root.sessionStore.snapshot()).toEqual(before);
    expect(
      jsonContentPayload(
        CHATGPT_EXECUTION_TOOLS.attack.handle(root, { subject }),
      ),
    ).toMatchObject({ result: { tag: "needsHoles" } });
    const selected = root.sessionStore.snapshot();
    expect(
      JSON.stringify(
        CHATGPT_EXECUTION_TOOLS.attack.handle(root, { subject, fill }),
      ),
    ).toContain("INVALID_ARGUMENTS");
    expect(
      JSON.stringify(
        CHATGPT_EXECUTION_TOOLS.answer_battle_hole.handle(root, {
          subject,
          fill,
        }),
      ),
    ).toContain("INVALID_ARGUMENTS");
    expect(
      JSON.stringify(
        CHATGPT_EXECUTION_TOOLS.answer_battle_hole.handle(root, {
          fill: { ...fill, holeId: "synthetic-stale-target" },
        }),
      ),
    ).toContain("BATTLE_FILL_HOLE_MISMATCH");
    expect(
      JSON.stringify(
        CHATGPT_EXECUTION_TOOLS.answer_battle_hole.handle(root, {
          fill: {
            kind: "attackRoll",
            holeId: fill.holeId,
            value: {
              total: 12,
              d20TestRoll: { tag: "single", naturalD20: 10 },
            },
          },
        }),
      ),
    ).toContain("BATTLE_FILL_KIND_MISMATCH");
    expect(root.sessionStore.snapshot()).toEqual(selected);
    const correct = CHATGPT_EXECUTION_TOOLS.answer_battle_hole.handle(root, {
      fill,
    });
    expect(JSON.stringify(correct)).toContain("needsHoles");
    expect(root.sessionStore.getPendingBattleTransaction()).not.toBeNull();
    expect(chatGptBattleGuidance(root)).toMatchObject({
      kind: "ordinaryContinuation",
      subject,
      routing: { kind: "available", tools: ["answer_battle_hole"] },
    });
    const after = root.sessionStore.snapshot();
    expect(
      JSON.stringify(
        CHATGPT_EXECUTION_TOOLS.cast_spell.handle(root, { subject }),
      ),
    ).toContain("CHATGPT_TOOL_OPERATION_MISMATCH");
    expect(root.sessionStore.snapshot()).toEqual(after);
  });

  it("publishes schema constraints that distinguish attack from unrelated actions", () => {
    const validate = createDraft2020JsonSchemaValidator().getValidator(
      requireJsonSchema(
        CHATGPT_EXECUTION_TOOLS.attack.definition.inputSchema,
        "attack input",
      ),
    );
    expect(
      validate({
        subject: { tag: "action", action: "dodge", actorId: "synthetic-actor" },
      }).valid,
    ).toBe(false);
    const session = startBattleSessionRight({
      battleId: battleId("synthetic-attack-schema"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(
      validate({ subject: fighterAttackSubject(session.state) }).valid,
    ).toBe(true);
  });
  it("preserves canonical mode fields and narrows multi-valued operation discriminants", () => {
    const validator = (
      name: "cast_spell" | "ready_spell" | "dismiss_companion" | "disengage",
    ) =>
      createDraft2020JsonSchemaValidator().getValidator(
        requireJsonSchema(
          CHATGPT_EXECUTION_TOOLS[name].definition.inputSchema,
          name,
        ),
      );
    const cast = {
      tag: "actionSpell",
      actorId: "synthetic-caster",
      procedureRef: "synthetic-procedure",
      mode: { tag: "cast" },
    };
    expect(validator("cast_spell")({ subject: cast }).valid).toBe(true);
    expect(validator("ready_spell")({ subject: cast }).valid).toBe(false);
    const disengage = validator("disengage");
    const bonusOption = {
      tag: "bonusAction",
      action: "statBlockActionOption",
      actorId: "synthetic-actor",
      procedureRef: "synthetic-procedure",
    };
    expect(
      disengage({ subject: { ...bonusOption, standardAction: "disengage" } })
        .valid,
    ).toBe(true);
    expect(
      disengage({ subject: { ...bonusOption, standardAction: "hide" } }).valid,
    ).toBe(false);
    const dismiss = validator("dismiss_companion");
    expect(
      dismiss({
        subject: {
          tag: "companionLifecycle",
          actorId: "synthetic-actor",
          action: "permanentlyDismiss",
        },
      }).valid,
    ).toBe(true);
    expect(
      dismiss({
        subject: {
          tag: "companionLifecycle",
          actorId: "synthetic-actor",
          action: "reappear",
        },
      }).valid,
    ).toBe(false);
  });
});
