import { Result, Schema } from "effect";
import { describe, expect, it } from "vitest";
import {
  battleId,
  characterSeed,
  fighterId,
  goblinId,
  startBattleSessionRight,
  statBlockCreatureInit,
} from "../../../battle-runtime/src/battle-runtime.test-support.ts";
import {
  BattleResolutionOutputSchema,
  BattleSessionOutputSchema,
} from "../battle-tool-output.ts";
import { createMcpPlaySessionRoot } from "../composition-root.ts";
import { jsonContentPayload } from "../tool-content.ts";
import { CHATGPT_EXECUTION_TOOLS } from "./tool-surface.ts";
import { chatGptBattleGuidance } from "../../test-support/chatgpt-battle-guidance.ts";
import {
  fireBoltUnitId,
  spellTargetId,
} from "../../../battle-runtime/src/unit-profile-admission-catalog.test-support.ts";
import { spellBattle } from "../../../battle-runtime/src/unit-profile-admission-spell-battle.test-support.ts";
import { spellRecord } from "../../../battle-runtime/src/unit-profile-admission-spell-record.test-support.ts";
import {
  createDraft2020JsonSchemaValidator,
  requireJsonSchema,
} from "../../test-support/json-schema.ts";

describe("ChatGPT newcomer battle recovery", () => {
  it("selects a discovered goblin bow attack and corrects its missing distance without losing the action", () => {
    const root = createMcpPlaySessionRoot();
    const session = startBattleSessionRight({
      battleId: battleId("synthetic-chatgpt-newcomer-bow"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        characterSeed({ initiative: 10 }),
      ],
    });
    expect(Result.isSuccess(root.sessionStore.storeActiveBattle(session))).toBe(
      true,
    );
    const discovery = Schema.decodeUnknownSync(BattleSessionOutputSchema)(
      jsonContentPayload(
        CHATGPT_EXECUTION_TOOLS.discover_battle_acts.handle(root, {}),
      ),
    );
    if (discovery.envelope?.frontier.kind !== "acts")
      throw new Error("Expected available Battle Acts.");
    const act = discovery.envelope.frontier.acts.find(
      (candidate) =>
        candidate.presentation.kind === "attack" &&
        candidate.presentation.name === "Shortbow" &&
        candidate.subject.tag === "action" &&
        candidate.subject.action === "attack" &&
        candidate.subject.statBlockDamageSelection?.every(
          ({ notation }) => notation === "rolled",
        ),
    );
    if (act === undefined)
      throw new Error(
        `Expected a discovered Shortbow Act: ${discovery.envelope.frontier.acts.map((candidate) => candidate.label).join(", ")}`,
      );
    const selected = Schema.decodeUnknownSync(BattleResolutionOutputSchema)(
      jsonContentPayload(
        CHATGPT_EXECUTION_TOOLS.attack.handle(root, { subject: act.subject }),
      ),
    );
    expect(selected.result.tag).toBe("needsHoles");
    if (selected.envelope.frontier.kind !== "holes")
      throw new Error("Expected the selected attack's target request.");
    const target = selected.envelope.frontier.holes.find(
      (hole) => hole.kind === "targetChoice",
    );
    if (target?.kind !== "targetChoice" || target.attack === undefined)
      throw new Error(
        "Expected an attack target with its canonical selection.",
      );
    const beforeInvalid = root.sessionStore.snapshot();
    const rejected = Schema.decodeUnknownSync(BattleResolutionOutputSchema)(
      jsonContentPayload(
        CHATGPT_EXECUTION_TOOLS.provide_battle_input.handle(root, {
          fill: { kind: target.kind, holeId: target.holeId, value: fighterId },
        }),
      ),
    );
    expect(rejected.result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
    expect(JSON.stringify(rejected.result)).toContain(
      "Copy fill.holeId from the current target hole",
    );
    expect(root.sessionStore.snapshot()).toEqual(beforeInvalid);
    expect(root.sessionStore.getPendingBattleTransaction()).not.toBeNull();
    const guidance = chatGptBattleGuidance(root);
    if (guidance.kind !== "ordinaryContinuation")
      throw new Error("Expected the pending target contract.");
    const input = guidance.inputs.find(
      (request) => request.holeId === target.holeId,
    );
    if (input === undefined)
      throw new Error("Expected a complete target fill contract.");
    const validFill = {
      kind: target.kind,
      holeId: target.holeId,
      value: fighterId,
      spatialFacts: [
        {
          kind: "attackTargetDistance",
          actorId: target.attack.actorId,
          targetId: fighterId,
          ...target.attack.selection,
          distanceFeet: 55,
        },
      ],
    };
    const validateFill = createDraft2020JsonSchemaValidator().getValidator(
      requireJsonSchema(input.fillSchema, "pending target fill"),
    );
    expect(
      validateFill({
        kind: target.kind,
        holeId: target.holeId,
        value: fighterId,
      }).valid,
    ).toBe(false);
    expect(validateFill({ ...validFill, spatialFacts: [] }).valid).toBe(false);
    expect(
      validateFill({
        ...validFill,
        spatialFacts: [{ ...validFill.spatialFacts[0], actorId: fighterId }],
      }).valid,
    ).toBe(false);
    expect(
      validateFill({
        ...validFill,
        spatialFacts: [{ ...validFill.spatialFacts[0], targetId: goblinId }],
      }).valid,
    ).toBe(false);
    expect(
      validateFill({
        ...validFill,
        spatialFacts: [
          { ...validFill.spatialFacts[0], statBlockDamageSelection: [] },
        ],
      }).valid,
    ).toBe(false);
    expect(
      validateFill({
        ...validFill,
        value: "synthetic-unoffered-target",
      }).valid,
    ).toBe(false);
    expect(
      validateFill({
        ...validFill,
        spatialFacts: [
          {
            ...validFill.spatialFacts[0],
            procedureRef: `${target.attack.selection.procedureRef}:foreign`,
          },
        ],
      }).valid,
    ).toBe(false);
    if (target.attack.selection.statBlockDamageSelection === undefined)
      throw new Error("Expected the monster attack's damage selection.");
    const distance = validFill.spatialFacts[0];
    if (distance === undefined)
      throw new Error("Expected the attack distance witness.");
    const duplicateDistanceFill = {
      ...validFill,
      spatialFacts: [
        distance,
        {
          ...distance,
          statBlockDamageSelection:
            target.attack.selection.statBlockDamageSelection.map(
              (component) => ({
                ...component,
                notation: "static",
              }),
            ),
        },
      ],
    };
    const duplicateDistanceRejected = Schema.decodeUnknownSync(
      BattleResolutionOutputSchema,
    )(
      jsonContentPayload(
        CHATGPT_EXECUTION_TOOLS.provide_battle_input.handle(root, {
          fill: duplicateDistanceFill,
        }),
      ),
    );
    expect(duplicateDistanceRejected.result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Attack target distance facts must contain at most one distance for each actor, target, and attack.",
    });
    expect(root.sessionStore.snapshot()).toEqual(beforeInvalid);
    expect(validateFill(duplicateDistanceFill).valid).toBe(false);
    expect(validateFill(validFill).valid).toBe(true);
    expect(
      validateFill({
        ...validFill,
        relationshipFacts: [
          {
            kind: "attackRollTargetIsEnemy",
            attackerId: goblinId,
            targetId: fighterId,
            targetIsEnemy: true,
          },
        ],
      }).valid,
    ).toBe(false);
    const afterTarget = Schema.decodeUnknownSync(BattleResolutionOutputSchema)(
      jsonContentPayload(
        CHATGPT_EXECUTION_TOOLS.provide_battle_input.handle(root, {
          fill: validFill,
        }),
      ),
    );
    expect(afterTarget.result.tag).toBe("needsHoles");
    if (afterTarget.envelope.frontier.kind !== "holes")
      throw new Error("Expected the selected attack's roll request.");
    const roll = afterTarget.envelope.frontier.holes.find(
      (hole) => hole.kind === "attackRoll",
    );
    if (roll?.kind !== "attackRoll")
      throw new Error("Expected an attack-roll request.");
    const afterRoll = Schema.decodeUnknownSync(BattleResolutionOutputSchema)(
      jsonContentPayload(
        CHATGPT_EXECUTION_TOOLS.provide_battle_input.handle(root, {
          fill: {
            kind: roll.kind,
            holeId: roll.holeId,
            value: { total: 6, d20TestRoll: { tag: "single", naturalD20: 2 } },
          },
        }),
      ),
    );
    expect(afterRoll.result.tag).toBe("resolved");
    expect(root.sessionStore.getPendingBattleTransaction()).toBeNull();
    expect(afterRoll.envelope.checkpoint.currentActorId).toBe(goblinId);
  });
  it("requires the exact current spell-target witness before accepting a cantrip target", () => {
    const root = createMcpPlaySessionRoot();
    expect(
      Result.isSuccess(
        root.sessionStore.storeActiveBattle(
          spellBattle({ cantrips: [spellRecord(fireBoltUnitId)] }),
        ),
      ),
    ).toBe(true);
    const discovery = Schema.decodeUnknownSync(BattleSessionOutputSchema)(
      jsonContentPayload(
        CHATGPT_EXECUTION_TOOLS.discover_battle_acts.handle(root, {}),
      ),
    );
    if (discovery.envelope?.frontier.kind !== "acts")
      throw new Error("Expected spell acts.");
    const act = discovery.envelope.frontier.acts.find(
      (candidate) =>
        candidate.presentation.kind === "spell" &&
        candidate.presentation.invocation.spellId === fireBoltUnitId,
    );
    if (act === undefined) throw new Error("Expected the prepared cantrip.");
    const selected = Schema.decodeUnknownSync(BattleResolutionOutputSchema)(
      jsonContentPayload(
        CHATGPT_EXECUTION_TOOLS.cast_spell.handle(root, {
          subject: act.subject,
        }),
      ),
    );
    if (selected.envelope.frontier.kind !== "holes")
      throw new Error("Expected the spell target.");
    const target = selected.envelope.frontier.holes.find(
      (hole) => hole.kind === "targetChoice",
    );
    if (
      target?.kind !== "targetChoice" ||
      target.spellTargetSpatialFactRequest === undefined
    )
      throw new Error("Expected a spell spatial request.");
    const request = target.spellTargetSpatialFactRequest;
    expect(request.requiresExactDistance).toBe(true);
    const guidance = chatGptBattleGuidance(root);
    if (guidance.kind !== "ordinaryContinuation")
      throw new Error("Expected current spell continuation.");
    const input = guidance.inputs.find(
      (candidate) => candidate.holeId === target.holeId,
    );
    if (input === undefined)
      throw new Error("Expected current spell fill schema.");
    const validate = createDraft2020JsonSchemaValidator().getValidator(
      requireJsonSchema(input.fillSchema, "spell target fill"),
    );
    const spatialFact = {
      kind: "spellTarget",
      casterId: request.casterId,
      sourceProcedureRef: request.sourceProcedureRef,
      targetId: spellTargetId,
      distanceFeet: 30,
    };
    const qualification = {
      kind: "rangedSpellAttackEnemyProximity",
      casterId: request.casterId,
      sourceProcedureRef: request.sourceProcedureRef,
      enemies: [],
    };
    const fill = {
      kind: target.kind,
      holeId: target.holeId,
      value: spellTargetId,
      spatialFacts: [spatialFact, qualification],
    };
    expect(
      validate({
        kind: target.kind,
        holeId: target.holeId,
        value: spellTargetId,
      }).valid,
    ).toBe(false);
    expect(
      validate({
        ...fill,
        spatialFacts: [
          {
            kind: spatialFact.kind,
            casterId: spatialFact.casterId,
            sourceProcedureRef: spatialFact.sourceProcedureRef,
            targetId: spatialFact.targetId,
          },
          qualification,
        ],
      }).valid,
    ).toBe(false);
    expect(
      validate({
        ...fill,
        spatialFacts: [
          { ...spatialFact, casterId: spellTargetId },
          qualification,
        ],
      }).valid,
    ).toBe(false);
    expect(
      validate({
        ...fill,
        spatialFacts: [
          { ...spatialFact, targetId: request.casterId },
          qualification,
        ],
      }).valid,
    ).toBe(false);
    expect(
      validate({
        ...fill,
        spatialFacts: [
          { ...spatialFact, distanceFeet: request.rangeFeet + 1 },
          qualification,
        ],
      }).valid,
    ).toBe(false);
    expect(validate({ ...fill, spatialFacts: [spatialFact] }).valid).toBe(
      false,
    );
    expect(validate(fill).valid).toBe(true);
    const optionalSightAndSenseFacts = [
      {
        kind: "reactionSpellDamagerVisibleWithinRange",
        reactorId: spellTargetId,
        damageSourceId: request.casterId,
        sourceProcedureRef: request.sourceProcedureRef,
        rangeFeet: 60,
      },
      {
        kind: "retaliationDamagerWithinFiveFeet",
        damagedId: spellTargetId,
        damageSourceId: request.casterId,
      },
      {
        kind: "enemyZeroHitPointTemporaryHitPointsBeneficiaryWithinRange",
        beneficiaryId: spellTargetId,
        damageSourceId: request.casterId,
        targetId: spellTargetId,
        sourceProcedureRef: request.sourceProcedureRef,
        rangeFeet: 10,
      },
      {
        kind: "attackTargetCannotSeeAttacker",
        attackerId: request.casterId,
        targetId: spellTargetId,
      },
      {
        kind: "attackerPerceivesObscuredTargetWithSense",
        attackerId: request.casterId,
        targetId: spellTargetId,
        sense: "blindsight",
      },
      {
        kind: "attackerUnaffectedByDuplicateHitInterceptionWithSense",
        attackerId: request.casterId,
        targetId: spellTargetId,
        sense: "truesight",
      },
    ];
    expect(
      validate({
        ...fill,
        spatialFacts: [...fill.spatialFacts, ...optionalSightAndSenseFacts],
      }).valid,
    ).toBe(true);
    expect(JSON.stringify(input.fillSchema)).not.toContain(
      "spellTargetsInPointOriginSphere",
    );
    expect(JSON.stringify(input.fillSchema)).not.toContain(
      "stagedConditionShakeAwakeActorWithin5Feet",
    );
    const objectHole = selected.envelope.frontier.holes.find(
      (hole) => hole.kind === "objectTargetChoice",
    );
    const objectInput = guidance.inputs.find(
      (candidate) => candidate.holeId === objectHole?.holeId,
    );
    if (objectHole === undefined || objectInput === undefined)
      throw new Error("Expected the alternative object-target schema.");
    const validateObject = createDraft2020JsonSchemaValidator().getValidator(
      requireJsonSchema(objectInput.fillSchema, "spell object target fill"),
    );
    const objectFact = {
      kind: "spellObjectTarget",
      casterId: request.casterId,
      sourceProcedureRef: request.sourceProcedureRef,
      objectId: "practice-object",
      rangeFeet: request.rangeFeet,
      distanceFeet: 30,
      armorClass: 13,
      damageDisposition: { kind: "hitPoints", hitPoints: 5 },
    };
    const objectIgnition = {
      kind: "spellObjectIgnition",
      casterId: request.casterId,
      sourceProcedureRef: request.sourceProcedureRef,
      objectId: "practice-object",
      disposition: { kind: "notFlammable" },
    };
    const objectFill = {
      kind: objectHole.kind,
      holeId: objectHole.holeId,
      value: "practice-object",
      spatialFacts: [objectFact, objectIgnition, qualification],
    };
    expect(validateObject(objectFill).valid).toBe(true);
    expect(
      validateObject({
        ...objectFill,
        spatialFacts: [objectFact, objectIgnition],
      }).valid,
    ).toBe(false);
    expect(
      validateObject({ ...objectFill, spatialFacts: [qualification] }).valid,
    ).toBe(false);
    expect(JSON.stringify(objectInput.fillSchema)).not.toContain(
      "spellObjectLightTarget",
    );

    const accepted = Schema.decodeUnknownSync(BattleResolutionOutputSchema)(
      jsonContentPayload(
        CHATGPT_EXECUTION_TOOLS.provide_battle_input.handle(root, { fill }),
      ),
    );
    expect(accepted.result.tag).toBe("needsHoles");
    expect(
      accepted.envelope.frontier.kind === "holes" &&
        accepted.envelope.frontier.holes.some(
          (hole) => hole.kind === "attackRoll",
        ),
    ).toBe(true);
  });
});
