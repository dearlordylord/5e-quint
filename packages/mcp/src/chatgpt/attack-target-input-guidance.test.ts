import { battleObjectId } from "@dnd/battle-runtime";
import { movementFeet, resourceCount } from "@dnd/shared/types";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import longbowInput from "../../../surface/content/weapon_longbow.json";
import { Result, Schema } from "effect";
import { expect, test } from "vitest";
import {
  attackTargetFill,
  battleId,
  characterSeed,
  fighterAttackSubject,
  fighterId,
  goblinAttackSubject,
  goblinId,
  startBattleSessionRight,
  statBlockCreatureInit,
  admitCharacterWeaponAttackExecutionWeapon,
  testLongswordAttack,
} from "../../../battle-runtime/src/battle-runtime.test-support.ts";
import { createMcpPlaySessionRoot } from "../composition-root.ts";
import { BattleResolutionOutputSchema } from "../battle-tool-output.ts";
import { jsonContentPayload } from "../tool-content.ts";
import { CHATGPT_EXECUTION_TOOLS } from "./tool-surface.ts";
import { battleInputGuidance } from "./battle-input-guidance.ts";
import { chatGptBattleGuidance } from "../../test-support/chatgpt-battle-guidance.ts";
import {
  createDraft2020JsonSchemaValidator,
  requireJsonSchema,
} from "../../test-support/json-schema.ts";

for (const actor of ["character", "statBlock"] as const) {
  for (const range of ["melee", "ranged"] as const) {
    test(`${actor} ${range} target has a constructive bound distance contract`, () => {
      const root = createMcpPlaySessionRoot();
      const characterRanged = actor === "character" && range === "ranged";
      const characterWeapon = characterRanged ? "Longbow" : "Longsword";
      const longbow = decodeUnitRecordSync(longbowInput);
      if (longbow.kind !== "weapon") throw new Error("Expected SRD Longbow");
      const session = startBattleSessionRight({
        battleId: battleId(`synthetic-current-target-${actor}-${range}`),
        combatants: [
          characterSeed({
            initiative: actor === "character" ? 20 : 10,
            attack: !characterRanged
              ? testLongswordAttack()
              : {
                  ...testLongswordAttack(),
                  ...admitCharacterWeaponAttackExecutionWeapon(
                    longbow,
                    battleObjectId("synthetic-longbow"),
                  ),
                  ability: "dex",
                },
            ammunitionStocks: [
              { ammunition: "arrow", remaining: resourceCount(20) },
            ],
            ...(characterRanged
              ? { characterUnitRefs: [{ unit: longbow, supportProfiles: [] }] }
              : {}),
          }),
          statBlockCreatureInit({
            initiative: actor === "statBlock" ? 20 : 10,
          }),
        ],
      });
      expect(
        Result.isSuccess(root.sessionStore.storeActiveBattle(session)),
      ).toBe(true);
      const subject =
        actor === "character"
          ? fighterAttackSubject(session.state, characterWeapon)
          : goblinAttackSubject(
              session.state,
              range === "melee" ? "Scimitar" : "Shortbow",
            );
      const selected = Schema.decodeUnknownSync(BattleResolutionOutputSchema)(
        jsonContentPayload(
          CHATGPT_EXECUTION_TOOLS.attack.handle(root, { subject }),
        ),
      );
      if (selected.envelope.frontier.kind !== "holes")
        throw new Error("Expected selected target request");
      const hole = selected.envelope.frontier.holes.find(
        (h) => h.kind === "targetChoice",
      );
      if (hole?.kind !== "targetChoice" || hole.attack === undefined)
        throw new Error("Expected canonical attack target");
      const guidance = chatGptBattleGuidance(root);
      if (guidance.kind !== "ordinaryContinuation")
        throw new Error("Expected current continuation");
      const input = guidance.inputs.find((i) => i.holeId === hole.holeId);
      if (input === undefined) throw new Error("Expected target fill contract");
      const validate = createDraft2020JsonSchemaValidator().getValidator(
        requireJsonSchema(input.fillSchema, "current attack target"),
      );
      const maximum =
        hole.attack.targetConstraint.kind === "meleeReach"
          ? hole.attack.targetConstraint.reachFeet
          : hole.attack.targetConstraint.longFeet;
      const targetId = actor === "character" ? goblinId : fighterId;
      const fill = attackTargetFill(
        hole,
        hole.attack.actorId,
        targetId,
        hole.attack.selection,
        [
          {
            kind: "attackTargetCannotSeeAttacker",
            attackerId: hole.attack.actorId,
            targetId,
          },
        ],
        movementFeet(maximum),
      );
      const fact = fill.spatialFacts?.[0];
      if (fact?.kind !== "attackTargetDistance")
        throw new Error("Expected canonical distance witness");
      expect(Array.isArray(input.fillSchema.oneOf)).toBe(true);
      expect(input.fillSchema.oneOf).toHaveLength(hole.choices.length);
      expect(JSON.stringify(input.fillSchema)).not.toContain('"contains"');
      expect(validate(fill).valid).toBe(true);
      const empty = battleInputGuidance({ ...hole, choices: [] })[0];
      if (empty === undefined)
        throw new Error("Expected unavailable target contract");
      expect(
        createDraft2020JsonSchemaValidator().getValidator(
          requireJsonSchema(empty.fillSchema, "no offered targets"),
        )(fill).valid,
      ).toBe(false);
      expect(validate({ ...fill, spatialFacts: [fact] }).valid).toBe(true);
      expect(
        validate({ ...fill, spatialFacts: [{ ...fact, distanceFeet: 0 }] })
          .valid,
      ).toBe(true);
      const before = root.sessionStore.snapshot();
      const selectionChange =
        "statBlockDamageSelection" in fact
          ? { statBlockDamageSelection: [] }
          : { attackAbility: fact.attackAbility === "str" ? "dex" : "str" };
      for (const change of [
        { kind: "attackTargetWithinReach" },
        { actorId: targetId },
        { targetId: hole.attack.actorId },
        { procedureRef: `${fact.procedureRef}:stale` },
        { distanceFeet: maximum + 1 },
        { distanceFeet: -1 },
        selectionChange,
      ]) {
        const invalidFill = { ...fill, spatialFacts: [{ ...fact, ...change }] };
        expect(validate(invalidFill).valid).toBe(false);
        const rejected = CHATGPT_EXECUTION_TOOLS.provide_battle_input.handle(
          root,
          { fill: invalidFill },
        );
        if (!("isError" in rejected && rejected.isError === true)) {
          expect(
            Schema.decodeUnknownSync(BattleResolutionOutputSchema)(
              jsonContentPayload(rejected),
            ).result.tag,
          ).toBe("invalid");
        }
        expect(root.sessionStore.snapshot()).toEqual(before);
      }
      expect(validate({ ...fill, value: "synthetic-unoffered" }).valid).toBe(
        false,
      );
      expect(validate({ ...fill, spatialFacts: [fact, fact] }).valid).toBe(
        false,
      );
      const completed = Schema.decodeUnknownSync(BattleResolutionOutputSchema)(
        jsonContentPayload(
          CHATGPT_EXECUTION_TOOLS.provide_battle_input.handle(root, { fill }),
        ),
      );
      expect(completed.result.tag).toBe("needsHoles");
      if (completed.envelope.frontier.kind !== "holes")
        throw new Error("Expected next attack roll");
      expect(
        completed.envelope.frontier.holes.some((h) => h.kind === "attackRoll"),
      ).toBe(true);
    });
  }
}
