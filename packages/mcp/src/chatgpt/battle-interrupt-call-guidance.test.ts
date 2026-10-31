import {
  BattleFillSchema,
  BattleInterruptDecisionFrontierSchema,
} from "@dnd/battle-runtime";
import { Result, Schema } from "effect";
import { describe, expect, it } from "vitest";
import {
  battleId,
  battleProcedureExecutionRefForTest,
  characterSeed,
  statBlockCreatureInit,
  startBattleSessionRight,
  fighterId,
  goblinId,
  fighterAttackSubject,
  goblinAttackSubject,
  attackExecutionSelectionForSubjectForTest,
  findAct,
  readyDeclarationFillForTest,
  resolveBattleSubject,
} from "../../../battle-runtime/src/battle-runtime.test-support.ts";
import { CHATGPT_EXECUTION_TOOLS } from "./tool-surface.ts";
import { ChatGptBattleExecutionArgsSchema } from "./battle-execution-schema.ts";
import { readyBattleInterruptCalls } from "./battle-interrupt-call-guidance.ts";
import {
  createDraft2020JsonSchemaValidator,
  requireJsonSchema,
} from "../../test-support/json-schema.ts";

function readiedDodgeState() {
  const session = startBattleSessionRight({
    battleId: battleId("synthetic-reaction-projection"),
    combatants: [
      characterSeed({ initiative: 20 }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
  const subject = {
    tag: "action",
    action: "ready",
    actorId: fighterId,
  } as const;
  const declaration = findAct(session, subject).initialHoles.find(
    (hole) => hole.kind === "readyDeclaration",
  );
  if (declaration === undefined) throw new Error("Expected Ready declaration.");
  const response = declaration.responseChoices.find(
    (choice) =>
      choice.kind === "action" &&
      choice.subject.tag === "action" &&
      choice.subject.action === "dodge",
  );
  if (response === undefined) throw new Error("Expected Dodge response.");
  const readied = resolveBattleSubject({
    state: session.state,
    subject,
    fills: [
      readyDeclarationFillForTest(declaration, "a synthetic signal", response),
    ],
  });
  if (readied.tag !== "resolved")
    throw new Error("Expected declared readied Dodge.");
  return readied.state;
}

describe("Interrupt-decision call projection input contracts", () => {
  it("projects every nested command to arguments accepted by its advertised tool and canonical decoder", () => {
    const state = readiedDodgeState();
    const procedureRef = battleProcedureExecutionRefForTest("synthetic-spell");
    const attack = fighterAttackSubject(state);
    const characterSelection =
      attackExecutionSelectionForSubjectForTest(attack);
    const statBlockSelection = attackExecutionSelectionForSubjectForTest(
      goblinAttackSubject(state, "Scimitar"),
    );
    const common = { tag: "runtimeCommand", actorId: fighterId } as const;
    const fixtures = [
      {
        subject: {
          ...common,
          command: "releaseReadiedSpell",
          readiedSpellCasterId: fighterId,
          procedureRef,
        },
        tool: "release_readied_spell",
      },
      {
        subject: {
          ...common,
          command: "releaseReadiedMovement",
          readiedMovementActorId: fighterId,
        },
        tool: "move",
      },
      {
        subject: {
          ...common,
          command: "releaseReadiedAction",
          reactorId: fighterId,
        },
        tool: "dodge",
      },
      {
        subject: {
          ...common,
          command: "releaseReadiedAttack",
          reactorId: fighterId,
          targetId: goblinId,
          procedureRef: characterSelection.procedureRef,
        },
        tool: "attack",
      },
      {
        subject: {
          ...common,
          command: "castTriggeredReactionSpell",
          reactorId: fighterId,
          procedureRef,
        },
        tool: "cast_spell",
      },
      {
        subject: {
          ...common,
          command: "castAttackHitBonusActionSpell",
          casterId: fighterId,
          procedureRef,
        },
        tool: "cast_spell",
      },
      {
        subject: {
          ...common,
          command: "opportunityAttack",
          reactorId: fighterId,
          targetId: goblinId,
          distanceFeet: 5,
          ...characterSelection,
        },
        tool: "attack",
      },
      {
        subject: {
          ...common,
          command: "retaliationAttack",
          reactorId: fighterId,
          targetId: goblinId,
          ...characterSelection,
        },
        tool: "attack",
      },
      {
        subject: {
          ...common,
          command: "opportunityAttack",
          reactorId: goblinId,
          targetId: fighterId,
          distanceFeet: 5,
          ...statBlockSelection,
        },
        tool: "attack",
      },
      {
        subject: {
          ...common,
          command: "retaliationAttack",
          reactorId: goblinId,
          targetId: fighterId,
          ...statBlockSelection,
        },
        tool: "attack",
      },
    ] as const;
    const validator = createDraft2020JsonSchemaValidator();
    for (const fixture of fixtures) {
      const frontier = Schema.decodeUnknownSync(
        BattleInterruptDecisionFrontierSchema,
      )({
        kind: "interruptDecision",
        trigger: "reportedReadyTrigger",
        stackDepth: 1,
        decisionHole: {
          kind: "interruptDecision",
          trigger: "reportedReadyTrigger",
          holeId: "synthetic-decision",
          holeInstanceKey: "synthetic-instance",
          label: "Synthetic projection fixture",
          eligibleResponders: [fighterId, goblinId],
        },
        choices: [
          {
            kind: "nestedProcedure",
            subject: fixture.subject,
            initialHoles: [],
          },
        ],
      });
      const call = readyBattleInterruptCalls(state, frontier).find(
        (entry) => entry.tool !== "decline_reaction",
      );
      if (call === undefined)
        throw new Error(`Expected ${fixture.subject.command} route.`);
      expect(call.tool).toBe(fixture.tool);
      const validate = validator.getValidator(
        requireJsonSchema(
          CHATGPT_EXECUTION_TOOLS[call.tool].definition.inputSchema,
          "nested interrupt tool",
        ),
      );
      expect(validate(call.arguments).valid, fixture.subject.command).toBe(
        true,
      );
      expect(
        Result.isSuccess(
          Schema.decodeUnknownResult(ChatGptBattleExecutionArgsSchema)(
            call.arguments,
          ),
        ),
        fixture.subject.command,
      ).toBe(true);
      expect(
        Result.isSuccess(
          Schema.decodeUnknownResult(BattleFillSchema, {
            onExcessProperty: "error",
          })(call.arguments.fill),
        ),
        fixture.subject.command,
      ).toBe(true);
    }
  });

  it("does not invent a route for a readied action without its retained response", () => {
    const state = readiedDodgeState();
    const frontier = Schema.decodeUnknownSync(
      BattleInterruptDecisionFrontierSchema,
    )({
      kind: "interruptDecision",
      trigger: "reportedReadyTrigger",
      stackDepth: 1,
      decisionHole: {
        kind: "interruptDecision",
        trigger: "reportedReadyTrigger",
        holeId: "synthetic-decision",
        holeInstanceKey: "synthetic-instance",
        label: "Synthetic unavailable fixture",
        eligibleResponders: [goblinId],
      },
      choices: [
        {
          kind: "nestedProcedure",
          subject: {
            tag: "runtimeCommand",
            actorId: fighterId,
            command: "releaseReadiedAction",
            reactorId: goblinId,
          },
          initialHoles: [],
        },
      ],
    });
    expect(
      readyBattleInterruptCalls(state, frontier).map((call) => call.tool),
    ).toEqual(["decline_reaction"]);
  });
});
