import { describe, expect, test } from "vitest";
import { Result, Schema } from "effect";
import { combatantId } from "@dnd/battle-runtime";
import { Hp } from "@dnd/shared/types";
import { unitId } from "@dnd/shared/game-facts";
import { characterSheetId } from "@dnd/character-sheet-runtime";
import type { CharacterBuild } from "@dnd/character-creation-runtime";
import {
  armorClassBuild,
  wizardBuild,
} from "../../character-sheet-runtime/src/test-support.test-support.ts";
import {
  attackSubjectFromActs,
  attackTargetFill,
  attackRollFill,
  rolledDiceFill,
} from "../test-support/mcp-acceptance-scenarios.ts";
import {
  createMcpPlaySessionRoot,
  type McpPlaySessionRoot,
} from "./composition-root.ts";
import { availableCharacterSession } from "./session-store.ts";
import { handleToolCall } from "./server.ts";
import { BattleSessionOutputSchema } from "./battle-tool-output.ts";
import {
  encodePlaySessionContinuation,
  decodePlaySessionContinuation,
  parseContinuationGraph,
} from "./play-session-continuation-codec.ts";
import { decodeDiceSeed } from "./dice-sampling-service.ts";

function value<A, E>(result: Result.Result<A, E>): A {
  if (Result.isFailure(result)) throw new Error(JSON.stringify(result.failure));
  return result.success;
}

const seed = value(
  decodeDiceSeed(["12345678", "87654321", "11223344", "55667788"]),
);

function restored(root: McpPlaySessionRoot): McpPlaySessionRoot {
  const graph = value(encodePlaySessionContinuation(root));
  return value(
    decodePlaySessionContinuation(
      root,
      seed,
      value(parseContinuationGraph(JSON.parse(JSON.stringify(graph)))),
    ),
  );
}

function tool(
  root: McpPlaySessionRoot,
  name: string,
  args: Readonly<Record<string, unknown>>,
) {
  const result = handleToolCall(root, name, args);
  if ("isError" in result) throw new Error(JSON.stringify(result));
  const current =
    name === "read_battle_state"
      ? result
      : handleToolCall(root, "read_battle_state", {});
  if ("isError" in current) throw new Error(JSON.stringify(current));
  return Schema.decodeUnknownSync(BattleSessionOutputSchema)(
    current.structuredContent,
  );
}

function envelope(root: McpPlaySessionRoot) {
  const output = tool(root, "read_battle_state", {});
  if (output.envelope === null)
    throw new Error("Expected an active Battle envelope.");
  return output.envelope;
}

function install(root: McpPlaySessionRoot, id: string, build: CharacterBuild) {
  const sheet = value(
    availableCharacterSession({
      characterId: characterSheetId(id),
      build,
      currentHp: Hp(10),
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      conditions: [],
      companion: { tag: "none" },
      unitLibrary: root.unitLibrary,
      statBlockCatalog: root.statBlockCatalog,
    }),
  );
  root.sessionStore.characters.set(sheet);
  return sheet.characterId;
}

function reactionWizard(): CharacterBuild {
  const build = wizardBuild({ wizardAdvancements: 4 });
  if (build.spellcasting === undefined)
    throw new Error("Expected Wizard spellcasting.");
  if (build.spellcasting.sources.length !== 1)
    throw new Error(
      "The single-class Wizard fixture must have one spellcasting source.",
    );
  return {
    ...build,
    spellcasting: {
      sources: [
        {
          ...build.spellcasting.sources[0],
          spellbook: [unitId("shield"), unitId("counterspell")],
          preparedSpells: [unitId("shield"), unitId("counterspell")],
        },
      ],
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: [
            { spellLevel: 1, count: 4 },
            { spellLevel: 2, count: 3 },
            { spellLevel: 3, count: 2 },
          ],
        },
      },
    },
  };
}

type Frontier = ReturnType<typeof envelope>["frontier"];
function reaction(
  frontier: Extract<Frontier, { kind: "interruptDecision" }>,
  reactor: string,
) {
  const candidate = frontier.choices.find(
    (candidate) =>
      candidate.choice.kind === "nestedProcedure" &&
      candidate.choice.subject.tag === "runtimeCommand" &&
      candidate.choice.subject.command === "castTriggeredReactionSpell" &&
      candidate.choice.subject.reactorId === reactor,
  );
  if (candidate?.choice.kind !== "nestedProcedure")
    throw new Error("Expected a nested reaction choice.");
  const subject = candidate.choice.subject;
  if (
    subject.tag !== "runtimeCommand" ||
    subject.command !== "castTriggeredReactionSpell"
  )
    throw new Error("Expected a triggered reaction Spell.");
  return { subject, initialHoles: candidate.choice.initialHoles };
}

describe("MCP continuation progress", () => {
  test("retains consumed initiative swaps before finalizing through MCP", () => {
    const root = createMcpPlaySessionRoot(undefined, undefined, seed);
    const characterId = install(root, "character:synthetic-codec-alert", {
      ...armorClassBuild({ startingClass: "class_fighter" }),
      background: unitId("background_criminal"),
    });
    tool(root, "start_battle", {
      battleId: "synthetic-codec-initiative",
      initiativeMode: "initialSetup",
      companionAdmissions: [],
      initialCombatants: [
        {
          kind: "characterSession",
          characterId,
          combatantId: "alert-source",
          initiative: 10,
          ammunitionStocks: [],
        },
        {
          kind: "statBlock",
          statBlockId: "stat_block_goblin_warrior",
          combatantId: "willing-ally",
          initiative: 8,
          ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
          admissionSource: { kind: "encounterParticipant" },
        },
      ],
    });
    const args = {
      operation: {
        kind: "applyInitiativeSwap",
        sourceId: "alert-source",
        candidateId: "willing-ally",
        candidateWitness: { tag: "willingAlly" },
      },
    };
    tool(root, "battle_lifecycle", args);
    const copy = restored(root);
    const repeat = handleToolCall(copy, "battle_lifecycle", args);
    expect("isError" in repeat && repeat.isError).toBe(true);
    expect(repeat).toEqual(handleToolCall(root, "battle_lifecycle", args));
    expect(
      tool(copy, "battle_lifecycle", {
        operation: { kind: "finalizeInitialInitiativeSetup" },
      }),
    ).toEqual(
      tool(root, "battle_lifecycle", {
        operation: { kind: "finalizeInitialInitiativeSetup" },
      }),
    );
    expect(envelope(copy).checkpoint.turnOrder).toEqual([
      "willing-ally",
      "alert-source",
    ]);
  });

  test("resumes a nested reaction and its parent damage through MCP without resetting resources", () => {
    const root = createMcpPlaySessionRoot(undefined, undefined, seed);
    const first = install(
      root,
      "character:synthetic-codec-shield",
      reactionWizard(),
    );
    const second = install(
      root,
      "character:synthetic-codec-counterspell",
      reactionWizard(),
    );
    const started = tool(root, "start_battle", {
      battleId: "synthetic-codec-nested",
      initiativeMode: "direct",
      companionAdmissions: [],
      initialCombatants: [
        {
          kind: "statBlock",
          statBlockId: "stat_block_goblin_warrior",
          combatantId: "attacker",
          initiative: 20,
          ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
          admissionSource: { kind: "encounterParticipant" },
        },
        {
          kind: "characterSession",
          characterId: first,
          combatantId: "shield-caster",
          initiative: 10,
          ammunitionStocks: [],
        },
        {
          kind: "characterSession",
          characterId: second,
          combatantId: "counter-caster",
          initiative: 5,
          ammunitionStocks: [],
        },
      ],
    });
    const subject = attackSubjectFromActs(started, "attacker", "Scimitar");
    tool(root, "fill_battle_hole", {
      subject,
      fill: attackTargetFill(subject, "shield-caster"),
    });
    tool(root, "fill_battle_hole", { subject, fill: attackRollFill(14, 10) });
    const firstFrontier = envelope(root).frontier;
    if (firstFrontier.kind !== "interruptDecision")
      throw new Error("Expected a Shield reaction frontier.");
    const shield = reaction(firstFrontier, "shield-caster");
    const factsHole = shield.initialHoles.find(
      (hole) => hole.kind === "targetSpatialFacts",
    );
    if (factsHole === undefined)
      throw new Error("Expected reaction trigger facts.");
    const counterSource = root.sessionStore.battleSession?.context.characters
      .get(combatantId("counter-caster"))
      ?.spellPresentationSources.find(
        (source) => source.invocation.spell.id === unitId("counterspell"),
      );
    if (counterSource === undefined)
      throw new Error("Expected the selected Counterspell procedure.");
    tool(root, "fill_battle_hole", {
      subject,
      fill: {
        kind: "interruptDecision",
        holeId: firstFrontier.decisionHole.holeId,
        value: {
          kind: "resolve",
          responderId: "shield-caster",
          choice: {
            kind: "castTriggeredReactionSpell",
            procedureRef: shield.subject.procedureRef,
            fills: [
              {
                kind: "targetSpatialFacts",
                holeId: factsHole.holeId,
                spatialFacts: [
                  {
                    kind: "spellCastInterruptionTriggerCasterVisibleWithinRange",
                    reactorId: "counter-caster",
                    casterId: "shield-caster",
                    sourceProcedureRef: counterSource.procedureRef,
                    rangeFeet: 60,
                  },
                ],
              },
            ],
          },
        },
      },
    });
    const nested = envelope(root).frontier;
    if (nested.kind !== "interruptDecision")
      throw new Error("Expected a nested Counterspell frontier.");
    const counter = reaction(nested, "counter-caster");
    const save = counter.initialHoles.find(
      (hole) => hole.kind === "savingThrowOutcome",
    );
    if (save === undefined)
      throw new Error("Expected a Counterspell saving throw.");
    const copy = restored(root);
    const counterFill = {
      kind: "interruptDecision",
      holeId: nested.decisionHole.holeId,
      value: {
        kind: "resolve",
        responderId: "counter-caster",
        choice: {
          kind: "castTriggeredReactionSpell",
          procedureRef: counter.subject.procedureRef,
          fills: [
            {
              kind: "savingThrowOutcome",
              holeId: save.holeId,
              value: {
                outcomes: [
                  {
                    targetId: "shield-caster",
                    succeeded: false,
                    withoutRoll: true,
                  },
                ],
              },
            },
          ],
        },
      },
    };
    expect(
      tool(copy, "fill_battle_hole", {
        subject: shield.subject,
        fill: counterFill,
      }),
    ).toEqual(
      tool(root, "fill_battle_hole", {
        subject: shield.subject,
        fill: counterFill,
      }),
    );
    const damage = envelope(copy).frontier;
    if (damage.kind !== "holes")
      throw new Error("Expected the parent damage frontier.");
    const damageHole = damage.holes.find((hole) => hole.kind === "rolledDice");
    if (damageHole === undefined)
      throw new Error("Expected parent damage dice.");
    const damageCopy = restored(copy);
    const damageArgs = {
      subject,
      fill: rolledDiceFill(damageHole.holeId, [[3]]),
    };
    expect(tool(damageCopy, "fill_battle_hole", damageArgs)).toEqual(
      tool(root, "fill_battle_hole", damageArgs),
    );
    expect(envelope(damageCopy).frontier.kind).toBe("acts");
    const counterCaster = envelope(damageCopy).checkpoint.combatants.find(
      (creature) => creature.combatantId === "counter-caster",
    );
    expect(counterCaster).toMatchObject({
      reactionAvailable: false,
      origin: {
        kind: "character",
        spellcasting: {
          spellSlots: expect.arrayContaining([
            expect.objectContaining({ spellLevel: 3, expended: 1 }),
          ]),
        },
      },
    });
  });
});
