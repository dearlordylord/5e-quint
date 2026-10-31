import { Result, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { settleBattleRuntimeTransaction } from "@dnd/battle-runtime";
import { classLevel } from "@dnd/shared/types";
import {
  armorClass,
  defaultArmorClassState,
  defaultUnarmoredArmorClassBase,
} from "@dnd/shared-algebras/armor-class-algebra";
import {
  battleId,
  characterBattleFeatureInitForTest,
  characterSeed,
  cuttingWordsAttackOnlyUnit,
  cuttingWordsResource,
  fighterId,
  goblinScimitarHitReactionSetup,
  reactionModifierChoice,
  reactionModifierUnitRef,
  startBattleSessionRight,
  statBlockCreatureInit,
  uncannyDodgeUnit,
} from "../../../battle-runtime/src/battle-runtime.test-support.ts";
import { createMcpPlaySessionRoot } from "../composition-root.ts";
import { BattleResolutionOutputSchema } from "../battle-tool-output.ts";
import { jsonContentPayload } from "../tool-content.ts";
import { chatGptBattleGuidance } from "./battle-guidance.ts";
import { CHATGPT_EXECUTION_TOOLS } from "./tool-surface.ts";
import { ChatGptBattleExecutionArgsSchema } from "./battle-execution-schema.ts";
import {
  createDraft2020JsonSchemaValidator,
  requireJsonSchema,
} from "../../test-support/json-schema.ts";

function openedModifier(input: {
  readonly unit: ReturnType<typeof cuttingWordsAttackOnlyUnit>;
  readonly className: "bard" | "rogue";
  readonly level: number;
  readonly resources: ReturnType<typeof cuttingWordsResource>[];
}) {
  const session = startBattleSessionRight({
    battleId: battleId("synthetic-chatgpt-reduction"),
    combatants: [
      statBlockCreatureInit({ initiative: 20 }),
      characterSeed({
        initiative: 10,
        displayName: "Synthetic responder",
        classLevels: [{ className: input.className, level: input.level }],
        attack: null,
        armorClass: {
          ...defaultArmorClassState(),
          base: { ...defaultUnarmoredArmorClassBase(), base: armorClass(16) },
        },
        resources: input.resources,
        ...(input.resources.length === 0
          ? {
              unitFeatures: [
                characterBattleFeatureInitForTest(input.unit, [
                  {
                    className: input.className,
                    level: classLevel(input.level),
                  },
                ]),
              ],
            }
          : {}),
        characterUnitRefs: [
          { ...reactionModifierUnitRef(input.unit.id), unit: input.unit },
        ],
      }),
    ],
  });
  const setup = goblinScimitarHitReactionSetup(session.state);
  const root = createMcpPlaySessionRoot();
  expect(Result.isSuccess(root.sessionStore.storeActiveBattle(session))).toBe(
    true,
  );
  const outer = settleBattleRuntimeTransaction({
    session,
    transaction: null,
    operation: {
      kind: "ordinarySubject",
      subject: setup.subject,
      fills: setup.prefixFills,
    },
  });
  if (
    outer.tag !== "needsHoles" ||
    outer.resolution.envelope.frontier.kind !== "interruptDecision"
  )
    throw new Error("Expected an attack Reaction window.");
  expect(
    Result.isSuccess(
      root.sessionStore.storeBattleTransactionResult(session, outer),
    ),
  ).toBe(true);
  return { root, frontier: outer.resolution.envelope.frontier };
}

describe("ChatGPT atomic Reaction modifier input", () => {
  it("keeps nested Reactions staged and rejects unrelated modifier answers", () => {
    const nested = {
      fill: {
        kind: "interruptDecision",
        holeId: "synthetic-reaction",
        value: {
          kind: "resolve",
          responderId: fighterId,
          choice: { kind: "releaseReadiedMovement", fills: [] },
        },
      },
    };
    const validate = createDraft2020JsonSchemaValidator().getValidator(
      requireJsonSchema(
        CHATGPT_EXECUTION_TOOLS.move.definition.inputSchema,
        "nested Reaction input",
      ),
    );
    expect(validate(nested).valid).toBe(true);
    const inline = {
      ...nested,
      fill: {
        ...nested.fill,
        value: {
          ...nested.fill.value,
          choice: {
            ...nested.fill.value.choice,
            fills: [
              {
                kind: "rolledDice",
                holeId: "synthetic-roll",
                value: [{ results: [2] }],
              },
            ],
          },
        },
      },
    };
    expect(validate(inline).valid).toBe(false);
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(ChatGptBattleExecutionArgsSchema)(inline),
      ),
    ).toBe(true);
  });

  it("accepts the offered reduction roll with the named Reaction and changes the hit to a miss", () => {
    const unit = cuttingWordsAttackOnlyUnit();
    const { root, frontier } = openedModifier({
      unit,
      className: "bard",
      level: 3,
      resources: [cuttingWordsResource({ unit })],
    });
    const choice = reactionModifierChoice(
      frontier.choices,
      unit.id,
      "attackRollReduction",
    );
    const guidance = chatGptBattleGuidance(root);
    expect(guidance.kind).toBe("reactionDecision");
    if (guidance.kind !== "reactionDecision")
      throw new Error("Expected Reaction guidance.");
    expect(
      guidance.choices.some(
        (entry) => entry.selection.kind === "reactionModifier",
      ),
    ).toBe(true);
    expect(guidance.readyCalls.map((call) => call.tool)).toEqual([
      "decline_reaction",
    ]);
    const roll = choice.initialHoles.find((hole) => hole.kind === "rolledDice");
    if (roll === undefined) throw new Error("Expected a reduction roll.");
    const input = {
      fill: {
        kind: "interruptDecision",
        holeId: frontier.decisionHole.holeId,
        value: {
          kind: "resolve",
          responderId: choice.responderId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            procedureRef: choice.modifier.procedureRef,
            modifierKind: choice.modifier.kind,
            fills: [
              {
                kind: "rolledDice",
                holeId: roll.holeId,
                value: [{ results: [6] }],
              },
            ],
          },
        },
      },
    };
    const validate = createDraft2020JsonSchemaValidator().getValidator(
      requireJsonSchema(
        CHATGPT_EXECUTION_TOOLS.reduce_attack_roll.definition.inputSchema,
        "Reaction modifier input",
      ),
    );
    expect(validate(input).valid).toBe(true);
    const beforeMissingRoll = root.sessionStore.snapshot();
    const missingRoll = CHATGPT_EXECUTION_TOOLS.reduce_attack_roll.handle(
      root,
      {
        ...input,
        fill: {
          ...input.fill,
          value: {
            ...input.fill.value,
            choice: { ...input.fill.value.choice, fills: [] },
          },
        },
      },
    );
    expect(jsonContentPayload(missingRoll)).toMatchObject({
      result: { tag: "invalid", reason: "invalidFill" },
    });
    expect(root.sessionStore.snapshot()).toEqual(beforeMissingRoll);
    const unrelated = {
      ...input,
      fill: {
        ...input.fill,
        value: {
          ...input.fill.value,
          choice: {
            ...input.fill.value.choice,
            fills: [
              { kind: "targetChoice", holeId: roll.holeId, value: fighterId },
            ],
          },
        },
      },
    };
    expect(validate(unrelated).valid).toBe(false);
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(ChatGptBattleExecutionArgsSchema)(unrelated),
      ),
    ).toBe(true);
    const raw = CHATGPT_EXECUTION_TOOLS.reduce_attack_roll.handle(root, input);
    expect("isError" in raw && raw.isError, JSON.stringify(raw)).not.toBe(true);
    const result = Schema.decodeUnknownSync(BattleResolutionOutputSchema)(
      jsonContentPayload(raw),
    );
    expect(result.result.tag).toBe("resolved");
    expect(
      root.sessionStore.battleSession?.state.combatants.get(fighterId)?.hp,
    ).toBe(12);
    expect(root.sessionStore.getPendingBattleTransaction()).toBeNull();
  });

  it("still accepts a half-damage modifier without a roll", () => {
    const unit = uncannyDodgeUnit();
    const { root, frontier } = openedModifier({
      unit,
      className: "rogue",
      level: 5,
      resources: [],
    });
    const choice = reactionModifierChoice(
      frontier.choices,
      unit.id,
      "attackDamageReduction",
    );
    expect(choice.initialHoles).toEqual([]);
    const result = CHATGPT_EXECUTION_TOOLS.reduce_attack_damage.handle(root, {
      fill: {
        kind: "interruptDecision",
        holeId: frontier.decisionHole.holeId,
        value: {
          kind: "resolve",
          responderId: choice.responderId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            procedureRef: choice.modifier.procedureRef,
            modifierKind: choice.modifier.kind,
            fills: [],
          },
        },
      },
    });
    expect(
      "isError" in result && result.isError,
      JSON.stringify(result),
    ).not.toBe(true);
    expect(JSON.stringify(result)).not.toContain("invalidFill");
  });
});
