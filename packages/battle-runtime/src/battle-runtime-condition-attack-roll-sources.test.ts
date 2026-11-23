import { attackRollModeForTest } from "./attack-roll-spatial.test-support.ts";
import { requireCombatant } from "./unit-profile-admission-creature-fixture.test-support.ts";
// KERNEL-COVERAGE: parity-witness BATTLE.ATTACK.CONDITION_ROLL_MODE
import {
  applyCondition,
  removeCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import { armorClass } from "@dnd/shared-algebras/armor-class-algebra";
import type { Condition } from "@dnd/shared/types";
import { Hp, movementFeet } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";
import {
  attackRollFill,
  attackTargetDistanceSpatialFact,
  attackTargetFill,
  battleId,
  battleProcedureExecutionRefForSpellHoleForTest,
  characterSeed,
  fighterAttackSubject,
  fighterId,
  fighterVsGoblinBattle,
  goblinAttackSubject,
  goblinId,
  goblinTurnBattle,
  findAct,
  findHole,
  magicSubject,
  requireHole,
  resolveBattleSubject,
  skeletonCreatureInit,
  skeletonId,
  spellRecord,
  startBattleSessionRight,
  targetFill,
  wizardId,
  wizardSpellcasting,
  type BattleSubject,
} from "./battle-runtime.test-support.ts";
import { TARGET_ADVANTAGE_CONDITIONS } from "./d20-test-circumstance.ts";
import { battleObjectId, type CombatantId } from "./identity.ts";
import type { BattleFill, BattleState } from "./battle-state-execution.ts";
import { battleCreatureStateWithKnockOutPreservedConditions } from "./battle-reducer/creature-hit-point-state.ts";

// RAW: .references/srd-5.2.1/rules-glossary.md
// - Restrained, "Attacks Affected.": "Attack rolls against you have Advantage,
//   and your attack rolls have Disadvantage."
// - Paralyzed, "Attacks Affected.": "Attack rolls against you have Advantage."
// - Petrified, "Attacks Affected.": "Attack rolls against you have Advantage."
// - Stunned, "Attacks Affected.": "Attack rolls against you have Advantage."
// .references/srd-5.2.1/playing-the-game.md#Advantage/Disadvantage: any
// Advantage plus any Disadvantage cancels to a normal roll.

type AttackSubject = Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
>;

function withConditionChange(
  state: BattleState,
  change: typeof applyCondition,
  condition: Condition,
  ids: readonly CombatantId[],
): BattleState {
  const combatants = new Map(state.combatants);
  for (const id of ids) {
    const creature = state.combatants.get(id);
    if (creature === undefined) {
      throw new Error(`Expected combatant ${id}.`);
    }
    combatants.set(
      id,
      battleCreatureStateWithKnockOutPreservedConditions(
        creature,
        change(creature.conditions, condition),
      ),
    );
  }
  return { ...state, combatants };
}

function withCondition(
  state: BattleState,
  condition: Condition,
  ...ids: readonly CombatantId[]
): BattleState {
  return withConditionChange(state, applyCondition, condition, ids);
}

function withoutCondition(
  state: BattleState,
  condition: Condition,
  ...ids: readonly CombatantId[]
): BattleState {
  return withConditionChange(state, removeCondition, condition, ids);
}

function targetFillFor(
  state: BattleState,
  subject: AttackSubject,
  targetId: CombatantId,
) {
  return attackTargetFill(
    requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    ),
    subject.actorId,
    targetId,
  );
}

function attackRollHole(
  state: BattleState,
  subject: AttackSubject,
  targetId: CombatantId,
) {
  return requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [targetFillFor(state, subject, targetId)],
    }),
    "attackRoll",
  );
}

function fighterRollMode(state: BattleState) {
  return attackRollHole(state, fighterAttackSubject(state), goblinId).rollMode;
}

function goblinRollMode(state: BattleState) {
  return attackRollHole(
    state,
    goblinAttackSubject(state, "Scimitar"),
    fighterId,
  ).rollMode;
}

describe("battle runtime: condition attack-roll sources", () => {
  test("a Restrained attacker has Disadvantage against a creature", () => {
    expect(fighterRollMode(fighterVsGoblinBattle())).toBeUndefined();
    expect(
      fighterRollMode(
        withCondition(fighterVsGoblinBattle(), "restrained", fighterId),
      ),
    ).toBe("disadvantage");
    expect(
      goblinRollMode(withCondition(goblinTurnBattle(), "restrained", goblinId)),
    ).toBe("disadvantage");
  });

  test("a Restrained attacker has Disadvantage against an object", () => {
    const state = withCondition(
      fighterVsGoblinBattle(),
      "restrained",
      fighterId,
    );
    const subject = fighterAttackSubject(state);
    const targetHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const objectId = battleObjectId("synthetic_restrained_attacker_target");
    const target = {
      kind: "objectTargetChoice",
      holeId: targetHole.holeId,
      value: objectId,
      spatialFacts: [
        {
          kind: "attackObjectTarget",
          actorId: fighterId,
          objectId,
          range: { kind: "meleeReach" },
          attackerCanSeeObject: true,
          cover: "none",
          armorClass: armorClass(15),
          damageDisposition: { kind: "hitPoints", hitPoints: Hp(30) },
        },
      ],
    } as const satisfies BattleFill;
    expect(
      requireHole(
        resolveBattleSubject({ state, subject, fills: [target] }),
        "attackRoll",
      ),
    ).toMatchObject({ rollMode: "disadvantage" });
  });

  test.each(TARGET_ADVANTAGE_CONDITIONS)(
    "attack rolls against a %s creature have Advantage",
    (condition) => {
      expect(
        fighterRollMode(
          withCondition(fighterVsGoblinBattle(), condition, goblinId),
        ),
      ).toBe("advantage");
      expect(
        goblinRollMode(withCondition(goblinTurnBattle(), condition, fighterId)),
      ).toBe("advantage");
    },
  );

  test("compose before cancellation: Restrained attacker against a Restrained target is normal", () => {
    expect(
      fighterRollMode(
        withCondition(
          fighterVsGoblinBattle(),
          "restrained",
          fighterId,
          goblinId,
        ),
      ),
    ).toBe("normal");
  });

  test("removing the condition leaves no stale source", () => {
    const restrained = withCondition(
      fighterVsGoblinBattle(),
      "restrained",
      fighterId,
      goblinId,
    );
    expect(
      fighterRollMode(withoutCondition(restrained, "restrained", goblinId)),
    ).toBe("disadvantage");
    expect(
      fighterRollMode(
        withoutCondition(restrained, "restrained", fighterId, goblinId),
      ),
    ).toBeUndefined();
  });

  test("the attack-roll hole requires Advantage and rejects a normal fill", () => {
    const state = withCondition(fighterVsGoblinBattle(), "paralyzed", goblinId);
    const subject = fighterAttackSubject(state);
    const target = targetFillFor(state, subject, goblinId);
    const attackRoll = requireHole(
      resolveBattleSubject({ state, subject, fills: [target] }),
      "attackRoll",
    );
    expect(attackRoll).toMatchObject({ rollMode: "advantage" });
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          target,
          attackRollFill(attackRoll, {
            total: 16,
            naturalD20: 14,
            rollMode: "normal",
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Attack roll mode does not match the current attack-roll rule.",
    });
  });
  test("apply to a ranged Spell Attack against a creature", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-condition-sources-fire-bolt"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("fire_bolt")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = findAct(session, magicSubject("fire_bolt")).subject;
    const targetHole = findHole(
      findAct(session, subject).initialHoles,
      "targetChoice",
    );
    const sourceProcedureRef =
      battleProcedureExecutionRefForSpellHoleForTest(targetHole);
    const target = targetFill(targetHole, skeletonId, [
      {
        kind: "spellTarget",
        casterId: wizardId,
        targetId: skeletonId,
        sourceProcedureRef,
        distanceFeet: movementFeet(30),
      },
      {
        kind: "rangedAttackEnemyProximity",
        attackerId: wizardId,
        procedureRef: sourceProcedureRef,
        enemies: [],
      },
    ]);
    const fireBoltRollMode = (state: BattleState) =>
      requireHole(
        resolveBattleSubject({ state, subject, fills: [target] }),
        "attackRoll",
      ).rollMode;

    expect(fireBoltRollMode(session.state)).toBeUndefined();
    expect(
      fireBoltRollMode(withCondition(session.state, "restrained", wizardId)),
    ).toBe("disadvantage");
    for (const condition of TARGET_ADVANTAGE_CONDITIONS) {
      expect(
        fireBoltRollMode(withCondition(session.state, condition, skeletonId)),
      ).toBe("advantage");
    }
  });

  test("apply to an Opportunity Attack's roll", () => {
    const opportunityRollMode = (state: BattleState) => {
      const fighter = state.combatants.get(fighterId);
      if (
        fighter?.origin.kind !== "character" ||
        fighter.origin.attack === null
      ) {
        throw new Error("Expected the fighter attack fixture.");
      }
      const targetHole = requireHole(
        resolveBattleSubject({
          state,
          subject: fighterAttackSubject(state),
          fills: [],
        }),
        "targetChoice",
      );
      if (targetHole.attack === undefined) {
        throw new Error("Expected the attack target selection.");
      }
      return attackRollModeForTest(
        state,
        fighterId,
        requireCombatant(state, goblinId),
        fighter.origin.attack,
        [
          attackTargetDistanceSpatialFact(
            fighterId,
            goblinId,
            targetHole.attack.selection,
            movementFeet(5),
          ),
        ],
        true,
      );
    };
    expect(opportunityRollMode(fighterVsGoblinBattle())).toBeUndefined();
    expect(
      opportunityRollMode(
        withCondition(fighterVsGoblinBattle(), "restrained", fighterId),
      ),
    ).toBe("disadvantage");
    expect(
      opportunityRollMode(
        withCondition(fighterVsGoblinBattle(), "stunned", goblinId),
      ),
    ).toBe("advantage");
  });
});
