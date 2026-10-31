import { Result, Schema } from "effect";
import { describe, expect, it } from "vitest";
import {
  fireballUnitId,
  spellCasterId,
  spellTargetId,
} from "../../../battle-runtime/src/unit-profile-admission-catalog.test-support.ts";
import { spellBattle } from "../../../battle-runtime/src/unit-profile-admission-spell-battle.test-support.ts";
import { spellRecord } from "../../../battle-runtime/src/unit-profile-admission-spell-record.test-support.ts";
import {
  createDraft2020JsonSchemaValidator,
  requireJsonSchema,
} from "../../test-support/json-schema.ts";
import {
  BattleResolutionOutputSchema,
  BattleSessionOutputSchema,
} from "../battle-tool-output.ts";
import { createMcpPlaySessionRoot } from "../composition-root.ts";
import { jsonContentPayload } from "../tool-content.ts";
import { chatGptBattleGuidance } from "./battle-guidance.ts";
import { CHATGPT_EXECUTION_TOOLS } from "./tool-surface.ts";

const areaCases = [
  { name: "no objects", objectIgnitionFacts: [], expectedIgnitions: undefined },
  {
    name: "an unattended flammable object",
    objectIgnitionFacts: [
      {
        objectId: "synthetic-courtyard-crate",
        disposition: { kind: "flammableUnattended" },
      },
    ],
    expectedIgnitions: [
      {
        kind: "startsBurning",
        objectId: "synthetic-courtyard-crate",
        sourceCombatantId: spellCasterId,
      },
    ],
  },
];

describe("ChatGPT spell area recovery", () => {
  it.each(areaCases)(
    "recovers the pending spell using returned area facts for $name",
    ({ objectIgnitionFacts, expectedIgnitions }) => {
      const root = createMcpPlaySessionRoot();
      const session = spellBattle({
        preparedSpells: [spellRecord(fireballUnitId)],
        casterClassLevels: [{ className: "wizard", level: 5 }],
        spellSlots: [{ spellLevel: 3, count: 1 }],
        targetHp: 50,
        targetMaxHp: 50,
      });
      expect(
        Result.isSuccess(root.sessionStore.storeActiveBattle(session)),
      ).toBe(true);
      const discovery = Schema.decodeUnknownSync(BattleSessionOutputSchema)(
        jsonContentPayload(
          CHATGPT_EXECUTION_TOOLS.discover_battle_acts.handle(root, {}),
        ),
      );
      if (discovery.envelope?.frontier.kind !== "acts")
        throw new Error("Expected available spell Acts.");
      const act = discovery.envelope.frontier.acts.find(
        (candidate) =>
          candidate.presentation.kind === "spell" &&
          candidate.presentation.invocation.spellId === fireballUnitId,
      );
      if (act === undefined)
        throw new Error("Expected the prepared spell Act.");
      const selected = Schema.decodeUnknownSync(BattleResolutionOutputSchema)(
        jsonContentPayload(
          CHATGPT_EXECUTION_TOOLS.cast_spell.handle(root, {
            subject: act.subject,
          }),
        ),
      );
      expect(selected.result.tag).toBe("needsHoles");
      if (selected.envelope.frontier.kind !== "holes")
        throw new Error("Expected the spell's Saving Throw request.");
      const hole = selected.envelope.frontier.holes.find(
        (candidate) => candidate.kind === "savingThrowOutcome",
      );
      if (hole?.kind !== "savingThrowOutcome")
        throw new Error("Expected a Saving Throw outcome hole.");
      const outcomes = [
        { targetId: spellTargetId, succeeded: false, withoutRoll: true },
      ];
      const commonArea = {
        originAnchorId: spellTargetId,
        affectedTargetIds: [spellTargetId],
      };
      const beforeInvalid = root.sessionStore.snapshot();
      const rejected = Schema.decodeUnknownSync(BattleResolutionOutputSchema)(
        jsonContentPayload(
          CHATGPT_EXECUTION_TOOLS.provide_battle_input.handle(root, {
            fill: {
              kind: hole.kind,
              holeId: hole.holeId,
              value: { area: commonArea, outcomes },
            },
          }),
        ),
      );
      expect(rejected.result).toMatchObject({
        tag: "invalid",
        reason: "invalidFill",
      });
      expect(root.sessionStore.snapshot()).toEqual(beforeInvalid);
      expect(root.sessionStore.getPendingBattleTransaction()).not.toBeNull();
      const guidance = chatGptBattleGuidance(root);
      if (guidance.kind !== "ordinaryContinuation")
        throw new Error("Expected the retained spell continuation.");
      const areaRequest = guidance.areaInputs.find(
        (request) => request.holeId === hole.holeId,
      );
      expect(areaRequest).toBeDefined();
      if (areaRequest === undefined)
        throw new Error("Expected an actionable area input contract.");
      if (!("areaInput" in hole) || hole.areaInput === undefined)
        throw new Error("Expected the spell's canonical area requirement.");
      expect(areaRequest.valuePath).toBe("fill.value.area");
      expect(areaRequest.instructions.join(" ")).toContain(
        "objectIgnitionFacts: []",
      );
      const validateArea = createDraft2020JsonSchemaValidator().getValidator(
        requireJsonSchema(areaRequest.areaSchema, "requested spell area"),
      );
      expect(validateArea(commonArea).valid).toBe(false);
      const area = {
        ...commonArea,
        kind: hole.areaInput.kind,
        objectIgnitionFacts,
      };
      expect(validateArea(area).valid).toBe(true);
      const afterSavingThrow = Schema.decodeUnknownSync(
        BattleResolutionOutputSchema,
      )(
        jsonContentPayload(
          CHATGPT_EXECUTION_TOOLS.provide_battle_input.handle(root, {
            fill: {
              kind: hole.kind,
              holeId: hole.holeId,
              value: { area, outcomes },
            },
          }),
        ),
      );
      expect(afterSavingThrow.result.tag).toBe("needsHoles");
      if (afterSavingThrow.envelope.frontier.kind !== "holes")
        throw new Error("Expected the spell damage request.");
      const damage = afterSavingThrow.envelope.frontier.holes.find(
        (candidate) => candidate.kind === "rolledDice",
      );
      if (damage?.kind !== "rolledDice")
        throw new Error("Expected the spell damage dice hole.");
      const afterDamage = Schema.decodeUnknownSync(
        BattleResolutionOutputSchema,
      )(
        jsonContentPayload(
          CHATGPT_EXECUTION_TOOLS.provide_battle_input.handle(root, {
            fill: {
              kind: damage.kind,
              holeId: damage.holeId,
              value: [{ results: [4, 4, 4, 4, 4, 4, 4, 4] }],
            },
          }),
        ),
      );
      expect(afterDamage.result.tag).toBe("resolved");
      if (afterDamage.result.tag !== "resolved")
        throw new Error("Expected the spell to finish in the saved Battle.");
      expect(afterDamage.result.objectIgnitions).toEqual(
        expectedIgnitions === undefined
          ? undefined
          : expectedIgnitions.map((ignition) => ({
              ...ignition,
              sourceProcedureRef: hole.sourceProcedureRef,
            })),
      );
      expect(
        afterDamage.envelope.checkpoint.combatants.find(
          (combatant) => combatant.combatantId === spellTargetId,
        )?.hp,
      ).toBe(18);
      const caster = afterDamage.envelope.checkpoint.combatants.find(
        (combatant) => combatant.combatantId === spellCasterId,
      );
      if (caster?.origin.kind !== "character")
        throw new Error("Expected the spellcaster's committed checkpoint.");
      expect(caster.origin.spellcasting?.spellSlots).toEqual([
        { spellLevel: 3, count: 1, expended: 1 },
      ]);
      expect(root.sessionStore.getPendingBattleTransaction()).toBeNull();
    },
  );
});
