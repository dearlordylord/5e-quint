import type { BattleHole } from "../../battle-runtime/src/battle-state-execution.ts";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { battleInputGuidance } from "./chatgpt/battle-input-guidance.ts";
import { huntersPreyHordeBreakerTargetHole } from "../../battle-runtime/src/battle-reducer/attack-roll.ts";
import { attackActionOptionForSubject } from "../../battle-runtime/src/battle-reducer/attack-damage-apply.ts";
// KERNEL-COVERAGE: parity-witness BATTLE.ATTACK.RANGED_CLOSE_COMBAT_ROLL_MODE
import assert from "node:assert/strict";
import { test, expect } from "vitest";
import { Result, Schema } from "effect";
import { movementFeet, resourceCount } from "@dnd/shared/types";
import type { BattleFill } from "../../battle-runtime/src/battle-state-execution.ts";
import { combatantId } from "../../battle-runtime/src/identity.ts";
import {
  battleProcedureExecutionRefForTest,
  fighterAttackSubject,
  skeletonId,
  longbowWeaponMasterySelections,
  masteryCleaveUnitRefs,
  testRangedCleaveLongbowAttack,
  testRangedCleaveLongbowUnitRef,
  attackRollFill,
  attackTargetFill,
  battleId,
  characterSeed,
  fighterId,
  goblinAttackSubject,
  goblinId,
  startBattleSessionRight,
  statBlockCreatureInit,
} from "../../battle-runtime/src/battle-runtime.test-support.ts";
import { createMcpPlaySessionRoot } from "./composition-root.ts";
import { BattleResolutionOutputSchema } from "./battle-tool-output.ts";
import { jsonContentPayload } from "./tool-content.ts";
import { CHATGPT_EXECUTION_TOOLS } from "./chatgpt/tool-surface.ts";
import { chatGptBattleGuidance } from "../test-support/chatgpt-battle-guidance.ts";
import {
  createDraft2020JsonSchemaValidator,
  requireJsonSchema,
} from "../test-support/json-schema.ts";

const second = combatantId("synthetic-second-enemy");
const decodeOutput = Schema.decodeUnknownSync(BattleResolutionOutputSchema);

function openAttack() {
  const root = createMcpPlaySessionRoot();
  const session = startBattleSessionRight({
    battleId: battleId("synthetic-ranged-ordering-proof"),
    combatants: [
      statBlockCreatureInit({ initiative: 20 }),
      characterSeed({ initiative: 10 }),
      characterSeed({
        combatantId: second,
        displayName: "Synthetic nearby enemy",
        initiative: 9,
      }),
    ],
  });
  assert(Result.isSuccess(root.sessionStore.storeActiveBattle(session)));
  const subject = goblinAttackSubject(session.state, "Shortbow");
  const selected = decodeOutput(
    jsonContentPayload(
      CHATGPT_EXECUTION_TOOLS.attack.handle(root, { subject }),
    ),
  );
  assert.equal(selected.envelope.frontier.kind, "holes");
  const hole = selected.envelope.frontier.holes.find(
    (x) => x.kind === "targetChoice",
  );
  assert(hole?.kind === "targetChoice" && hole.attack);
  assert(hole.choices.includes(fighterId));
  const guidance = chatGptBattleGuidance(root);
  assert.equal(guidance.kind, "ordinaryContinuation");
  const contract = guidance.inputs.find((x) => x.holeId === hole.holeId);
  assert(contract);
  const validate = createDraft2020JsonSchemaValidator().getValidator(
    requireJsonSchema(contract.fillSchema, "discovered Shortbow target"),
  );
  const scope = { attackerId: goblinId, procedureRef: subject.procedureRef };
  return {
    root,
    session,
    subject,
    hole: { ...hole, attack: hole.attack },
    scope,
    validate,
  };
}

type Fill = ReturnType<typeof attackTargetFill>;
type Fact = NonNullable<Fill["spatialFacts"]>[number];
type Proximity = Extract<Fact, { kind: "rangedAttackEnemyProximity" }>;

function proximity(
  scope: Pick<Proximity, "attackerId" | "procedureRef">,
  enemies: Proximity["enemies"],
): Proximity {
  return { kind: "rangedAttackEnemyProximity", ...scope, enemies };
}

function submit(root: ReturnType<typeof openAttack>["root"], fill: BattleFill) {
  const result = CHATGPT_EXECUTION_TOOLS.provide_battle_input.handle(root, {
    fill,
  });
  assert(!("isError" in result && result.isError), JSON.stringify(result));
  return decodeOutput(jsonContentPayload(result));
}

function checkDistance(distance: number, enemy: string, enemyDistance: number) {
  const { root, hole, scope, validate } = openAttack();
  const qualification = proximity(scope, [
    {
      enemyId: combatantId(enemy),
      distanceFeet: movementFeet(enemyDistance),
      enemyCanSeeAttacker: true,
    },
  ]);
  const fill = attackTargetFill(
    hole,
    goblinId,
    fighterId,
    hole.attack.selection,
    [qualification],
    movementFeet(distance),
  );
  assert(validate(fill).valid);
  const output = submit(root, fill);
  assert.equal(output.result.tag, "needsHoles");
  assert.equal(output.envelope.frontier.kind, "holes");
  const roll = output.envelope.frontier.holes.find(
    (x) => x.kind === "attackRoll",
  );
  assert(roll?.kind === "attackRoll");
  const normalRoll = submit(
    root,
    attackRollFill(roll, { total: 19, naturalD20: 15 }),
  );
  const damageRequested =
    normalRoll.envelope.frontier.kind === "holes" &&
    normalRoll.envelope.frontier.holes.some(
      (next) => next.kind === "rolledDice",
    );
  return {
    mode: roll.rollMode ?? "normal",
    normalRoll: normalRoll.result.tag,
    damageRequested,
  };
}

test.each([
  [5, 30],
  [30, 5],
  [5, 6],
  [6, 5],
])(
  "rejects contradictory target/proximity distances %s/%s before requesting a roll",
  (targetDistance, enemyDistance) => {
    const { root, hole, scope } = openAttack();
    const fill = attackTargetFill(
      hole,
      goblinId,
      fighterId,
      hole.attack.selection,
      [
        proximity(scope, [
          {
            enemyId: fighterId,
            distanceFeet: movementFeet(enemyDistance),
            enemyCanSeeAttacker: true,
          },
        ]),
      ],
      movementFeet(targetDistance),
    );
    const before = root.sessionStore.snapshot();
    const output = submit(root, fill);
    expect(root.sessionStore.snapshot()).toEqual(before);
    expect(output.result.tag).toBe("invalid");
    expect(JSON.stringify(output.result)).toMatch(/distance/i);
    expect(
      output.envelope.frontier.kind === "holes" &&
        output.envelope.frontier.holes.some((h) => h.kind === "attackRoll"),
    ).toBe(false);
  },
);

test.each([
  [5, fighterId, 5, "disadvantage"],
  [30, fighterId, 30, "normal"],
  [30, second, 5, "disadvantage"],
  [6, fighterId, 6, "normal"],
])(
  "preserves coherent ranged roll mode %s/%s/%s",
  (distance, enemy, enemyDistance, mode) => {
    const result = checkDistance(
      Number(distance),
      String(enemy),
      Number(enemyDistance),
    );
    expect(result.mode).toBe(mode);
  },
);

test("Horde Breaker's emitted target contract requires its own scoped proximity qualification", () => {
  const session = startBattleSessionRight({
    battleId: battleId("synthetic-horde-target-contract"),
    combatants: [
      characterSeed({
        initiative: 20,
        characterUnitRefs: [
          ...masteryCleaveUnitRefs(),
          testRangedCleaveLongbowUnitRef(),
        ],
        weaponMasteries: longbowWeaponMasterySelections(),
        attack: testRangedCleaveLongbowAttack(),
        ammunitionStocks: [
          { ammunition: "arrow", remaining: resourceCount(20) },
        ],
      }),
      statBlockCreatureInit({ initiative: 10 }),
      statBlockCreatureInit({ combatantId: skeletonId, initiative: 9 }),
    ],
  });
  const subject = fighterAttackSubject(session.state, "Longbow");
  const attack = attackActionOptionForSubject(session.state, subject);
  assert(attack?.kind === "weapon");
  const sourceProcedureRef = battleProcedureExecutionRefForTest(
    "synthetic-secondary-feature",
  );
  const hole = huntersPreyHordeBreakerTargetHole(
    session.state,
    fighterId,
    goblinId,
    sourceProcedureRef,
    attack,
  );
  const input = battleInputGuidance(hole)[0];
  assert(input);
  const validate = createDraft2020JsonSchemaValidator().getValidator(
    requireJsonSchema(input.fillSchema, "Horde Breaker target"),
  );
  const fill = attackTargetFill(
    hole,
    fighterId,
    skeletonId,
    hole.attack?.selection,
    [
      {
        kind: "hordeBreakerSecondTargetEligible",
        attackerId: fighterId,
        sourceProcedureRef,
        originalTargetId: goblinId,
        secondTargetId: skeletonId,
      },
    ],
    movementFeet(30),
  );
  assert(validate(fill).valid);
  const facts = fill.spatialFacts ?? [];
  const qualification = facts.find(
    (fact) => fact.kind === "rangedAttackEnemyProximity",
  );
  assert(qualification?.kind === "rangedAttackEnemyProximity");
  expect(
    validate({
      ...fill,
      spatialFacts: facts.filter(
        (fact) => fact.kind !== "rangedAttackEnemyProximity",
      ),
    }).valid,
  ).toBe(false);
  expect(
    validate({ ...fill, spatialFacts: [...facts, qualification] }).valid,
  ).toBe(false);
  expect(
    validate({
      ...fill,
      spatialFacts: facts.map((fact) =>
        fact.kind === "rangedAttackEnemyProximity"
          ? { ...fact, procedureRef: sourceProcedureRef }
          : fact,
      ),
    }).valid,
  ).toBe(false);
});

test.each(["contradictory", "coherentCannotSee", "differentEnemy"] as const)(
  "ranged target sight consistency: %s",
  (scenario) => {
    const { root, hole, scope } = openAttack();
    const fill = attackTargetFill(
      hole,
      goblinId,
      fighterId,
      hole.attack.selection,
      [
        proximity(scope, [
          {
            enemyId: scenario === "differentEnemy" ? second : fighterId,
            distanceFeet: movementFeet(5),
            enemyCanSeeAttacker: scenario !== "coherentCannotSee",
          },
        ]),
        {
          kind: "attackTargetCannotSeeAttacker",
          attackerId: goblinId,
          targetId: fighterId,
        },
      ],
      movementFeet(5),
    );
    const before = root.sessionStore.snapshot();
    const output = submit(root, fill);
    if (scenario === "contradictory") {
      expect(output.result).toMatchObject({
        tag: "invalid",
        reason: "invalidFill",
        message: expect.stringMatching(/sight/i),
      });
      expect(root.sessionStore.snapshot()).toEqual(before);
    } else {
      assert(output.envelope.frontier.kind === "holes");
      expect(
        output.envelope.frontier.holes.find((h) => h.kind === "attackRoll")
          ?.rollMode,
      ).toBe(scenario === "coherentCannotSee" ? "advantage" : "normal");
    }
  },
);

test.each(["weapon", "spell"] as const)(
  "ranged %s replacement schema requires fresh scoped proximity only for newTarget",
  (kind) => {
    const { hole, scope } = openAttack();
    const request: Extract<
      BattleHole,
      {
        readonly kind: "targetingSaveInterdictionOutcome";
        readonly replacementTargetKind: "attackRoll";
      }
    > = {
      kind: "targetingSaveInterdictionOutcome",
      holeId: holeId("synthetic-replacement"),
      holeInstanceKey: holeInstanceKey("synthetic-replacement"),
      label: "Synthetic replacement",
      sourceProcedureRef: battleProcedureExecutionRefForTest("synthetic-ward"),
      triggeringProcedureRef: scope.procedureRef,
      sourceCombatantId: second,
      wardedCombatantId: fighterId,
      triggeringCombatantId: goblinId,
      triggeringTargetEventId: hole.holeId,
      ability: "wis",
      dc: { kind: "fixed", dc: 13 },
      choices: [second],
      replacementTargetKind: "attackRoll",
      ...(kind === "weapon"
        ? { attack: hole.attack }
        : {
            spellTargetSpatialFactRequest: {
              casterId: goblinId,
              sourceProcedureRef: scope.procedureRef,
              rangeFeet: movementFeet(60),
              visibility: "notSpecifiedByProcedure",
              requiresExactDistance: true,
              requiresEnemyProximityQualification: true,
            },
          }),
    };
    const guidance = battleInputGuidance(request)[0];
    assert(guidance);
    const validate = createDraft2020JsonSchemaValidator().getValidator(
      requireJsonSchema(guidance.fillSchema, "replacement target"),
    );
    const targetFacts =
      kind === "weapon"
        ? (
            attackTargetFill(
              hole,
              goblinId,
              second,
              hole.attack.selection,
              [],
              movementFeet(30),
            ).spatialFacts ?? []
          ).filter((f) => f.kind !== "rangedAttackEnemyProximity")
        : [
            {
              kind: "spellTarget",
              casterId: goblinId,
              targetId: second,
              sourceProcedureRef: scope.procedureRef,
              distanceFeet: movementFeet(30),
            },
          ];
    const makeFill = (facts: readonly object[]) => ({
      kind: request.kind,
      holeId: request.holeId,
      value: {
        saveSucceeded: false,
        outcome: {
          kind: "newTarget",
          targetId: second,
          replacementTargetKind: "attackRoll",
          spatialFacts: facts,
        },
      },
    });
    const qualification = proximity(scope, []);
    expect(validate(makeFill([...targetFacts, qualification])).valid).toBe(
      true,
    );
    expect(validate(makeFill(targetFacts)).valid).toBe(false);
    expect(
      validate(makeFill([...targetFacts, qualification, qualification])).valid,
    ).toBe(false);
    expect(
      validate(
        makeFill([
          ...targetFacts,
          { ...qualification, procedureRef: request.sourceProcedureRef },
        ]),
      ).valid,
    ).toBe(false);
    expect(
      validate({
        kind: request.kind,
        holeId: request.holeId,
        value: { saveSucceeded: true },
      }).valid,
    ).toBe(true);
    expect(
      validate({
        kind: request.kind,
        holeId: request.holeId,
        value: { saveSucceeded: false, outcome: { kind: "loseAttackOrSpell" } },
      }).valid,
    ).toBe(true);
  },
);
