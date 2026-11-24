import { battleObjectId } from "@dnd/battle-runtime";
import {
  attackExecutionSelectionForOption,
  attackExecutionWeaponDelivery,
} from "../../../battle-runtime/src/battle-action-options.ts";
import { movementFeet, resourceCount } from "@dnd/shared/types";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import longbowInput from "../../../surface/content/weapon_longbow.json";
import { Result, Schema } from "effect";
import { expect, test } from "vitest";
import {
  attackTargetFill,
  battleId,
  battleProcedureExecutionRefForTest,
  characterSeed,
  fighterAttackSubject,
  fighterId,
  goblinAttackSubject,
  goblinId,
  startBattleSessionRight,
  statBlockCreatureInit,
  admitCharacterWeaponAttackExecutionWeapon,
  testDaggerAttack,
  testLongswordAttack,
} from "../../../battle-runtime/src/battle-runtime.test-support.ts";
import { attackActionOptionsForActor } from "../../../battle-runtime/src/battle-reducer/attack-damage-apply.ts";
import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
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
      const proximity = (fill.spatialFacts ?? []).filter(
        (f) => f.kind === "rangedAttackEnemyProximity",
      );
      expect(proximity).toHaveLength(range === "ranged" ? 1 : 0);
      expect(Array.isArray(input.fillSchema.oneOf)).toBe(true);
      expect(input.fillSchema.oneOf).toHaveLength(hole.choices.length);
      if (range === "melee") {
        // A melee target counts no supplemental fact: it needs no proximity
        // fact and refuses any thrown weapon landing.
        expect(JSON.stringify(input.fillSchema)).not.toContain('"maxContains"');
      } else {
        expect(JSON.stringify(input.fillSchema)).toContain('"maxContains":1');
        expect(validate({ ...fill, spatialFacts: [fact] }).valid).toBe(false);
        expect(
          validate({
            ...fill,
            spatialFacts: [fact, ...proximity, ...proximity],
          }).valid,
        ).toBe(false);
      }
      expect(validate(fill).valid).toBe(true);
      const empty = battleInputGuidance({ ...hole, choices: [] })[0];
      if (empty === undefined)
        throw new Error("Expected unavailable target contract");
      expect(
        createDraft2020JsonSchemaValidator().getValidator(
          requireJsonSchema(empty.fillSchema, "no offered targets"),
        )(fill).valid,
      ).toBe(false);
      expect(
        validate({ ...fill, spatialFacts: [fact, ...proximity] }).valid,
      ).toBe(true);
      expect(
        validate({
          ...fill,
          spatialFacts: [{ ...fact, distanceFeet: 0 }, ...proximity],
        }).valid,
      ).toBe(true);
      const before = root.sessionStore.snapshot();
      for (const qualification of proximity) {
        for (const change of [
          { attackerId: targetId },
          {
            procedureRef: battleProcedureExecutionRefForTest(
              "synthetic-foreign-attack",
            ),
          },
        ]) {
          const invalidFill = {
            ...fill,
            spatialFacts: [
              fact,
              qualification,
              { ...qualification, ...change },
            ],
          };
          expect(validate(invalidFill).valid).toBe(false);
          const rejected = Schema.decodeUnknownSync(
            BattleResolutionOutputSchema,
          )(
            jsonContentPayload(
              CHATGPT_EXECUTION_TOOLS.provide_battle_input.handle(root, {
                fill: invalidFill,
              }),
            ),
          );
          expect(rejected.result).toMatchObject({
            tag: "invalid",
            reason: "invalidFill",
          });
          expect(root.sessionStore.snapshot()).toEqual(before);
        }
      }
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
        const invalidFill = {
          ...fill,
          spatialFacts: [{ ...fact, ...change }, ...proximity],
        };
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
      expect(
        validate({ ...fill, spatialFacts: [fact, fact, ...proximity] }).valid,
      ).toBe(false);
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

/** A fighter's Dagger target fill and its advertised fill schema validator. */
function daggerTargetContract(delivery: "thrown" | "melee") {
  const root = createMcpPlaySessionRoot();
  const dagger = testDaggerAttack();
  const session = startBattleSessionRight({
    battleId: battleId(`synthetic-${delivery}-target-contract`),
    combatants: [
      characterSeed({
        initiative: 20,
        attack: dagger,
        selectedLoadout: {
          weapon: {
            itemId: dagger.weaponObjectId,
            unitId: parseSharedUnitId("weapon_dagger"),
            grip: "one_handed",
          },
        },
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
  expect(Result.isSuccess(root.sessionStore.storeActiveBattle(session))).toBe(
    true,
  );
  const option = attackActionOptionsForActor(session.state, fighterId).find(
    (attack) =>
      attack.kind === "weapon" &&
      (attackExecutionWeaponDelivery(attack) ?? "melee") === delivery,
  );
  if (option?.kind !== "weapon") throw new Error(`Expected ${delivery} Dagger`);
  const subject = {
    tag: "action" as const,
    actorId: fighterId,
    action: "attack" as const,
    ...attackExecutionSelectionForOption(option),
  };
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
    requireJsonSchema(input.fillSchema, `${delivery} attack target`),
  );
  const fill = attackTargetFill(
    hole,
    hole.attack.actorId,
    goblinId,
    hole.attack.selection,
    [],
    movementFeet(delivery === "thrown" ? 20 : 5),
  );
  return { hole, attack: hole.attack, fill, validate };
}

test("a thrown weapon target requires one landing fact scoped to its attack", () => {
  const { attack, fill, validate } = daggerTargetContract("thrown");
  expect(attack.requiresThrownWeaponLanding).toBe(true);
  const facts = fill.spatialFacts ?? [];
  const landing = facts.filter((f) => f.kind === "thrownWeaponLanding");
  const others = facts.filter((f) => f.kind !== "thrownWeaponLanding");
  expect(landing).toHaveLength(1);

  expect(validate(fill).valid).toBe(true);
  expect(validate({ ...fill, spatialFacts: others }).valid).toBe(false);
  expect(
    validate({ ...fill, spatialFacts: [...others, ...landing, ...landing] })
      .valid,
  ).toBe(false);
  expect(
    validate({
      ...fill,
      spatialFacts: [
        ...others,
        ...landing.map((f) => ({
          ...f,
          procedureRef: `${f.procedureRef}:stale`,
        })),
      ],
    }).valid,
  ).toBe(false);
  expect(
    validate({
      ...fill,
      spatialFacts: [
        ...others,
        ...landing.map((f) => ({ ...f, attackerId: goblinId })),
      ],
    }).valid,
  ).toBe(false);
  // The runtime takes exactly one landing fact in all, so a second one for
  // another attacker is refused beside the scoped one.
  expect(
    validate({
      ...fill,
      spatialFacts: [
        ...others,
        ...landing,
        ...landing.map((f) => ({ ...f, attackerId: goblinId })),
      ],
    }).valid,
  ).toBe(false);
});

test("a melee weapon target refuses a thrown weapon landing fact", () => {
  const { attack, fill, validate } = daggerTargetContract("melee");
  expect(attack.requiresThrownWeaponLanding).toBeUndefined();
  const facts = fill.spatialFacts ?? [];
  expect(facts.some((f) => f.kind === "thrownWeaponLanding")).toBe(false);
  const thrown = daggerTargetContract("thrown").fill.spatialFacts ?? [];
  const landing = thrown
    .filter((f) => f.kind === "thrownWeaponLanding")
    .map((f) => ({ ...f, procedureRef: attack.selection.procedureRef }));
  expect(landing).toHaveLength(1);

  expect(validate(fill).valid).toBe(true);
  expect(
    validate({ ...fill, spatialFacts: [...facts, ...landing] }).valid,
  ).toBe(false);
});
