import { Schema } from "effect";
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";

import {
  BattleFillSchema,
  BattleSnapshotSchema,
  BattleSubjectSchema,
  discoverBattleActs,
  snapshotBattle,
} from "./index.ts";
import {
  attackExecutionSelectionForSubjectForTest,
  attackRollFill,
  attackTargetFill,
  battleId,
  characterBonusAttackSubjectForTest,
  fighterAttackSubject,
  fighterId,
  goblinId,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  startBattleRight,
  statBlockCreatureInit,
  testDaggerAttack,
  characterSeed,
} from "./battle-runtime-test-support.ts";
import {
  battleAttackExecutionScopeRefForProcedureRef,
  battleAttackExecutionScopeRefBelongsToBattle,
  battleAttackExecutionScopeRefBelongsToCombatant,
  battleProcedureExecutionRefBelongsToScope,
} from "./identity.ts";
import { boundAttackExecutionSelectionKey } from "./battle-action-options.ts";

function identicalDaggerBattle(name = "Dagger") {
  const attack = testDaggerAttack();
  const renamedAttack = {
    ...attack,
    weapon: { ...attack.weapon, name },
  };
  return startBattleRight({
    battleId: battleId("battle-character-attack-execution-references"),
    combatants: [
      characterSeed({
        initiative: 20,
        attack: renamedAttack,
        offHandAttack: renamedAttack,
        selectedLoadout: {
          weapon: {
            itemId: "main:weapon_dagger",
            unitId: "weapon_dagger",
            grip: "one_handed",
          },
          offHandWeapon: {
            itemId: "off:weapon_dagger",
            unitId: "weapon_dagger",
          },
        },
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}

function fighterOrigin(state: ReturnType<typeof identicalDaggerBattle>) {
  const fighter = state.combatants.get(fighterId);
  if (fighter?.origin.kind !== "character") {
    throw new Error("Expected the fighter character attack execution.");
  }
  return fighter.origin;
}

function fighterAttackScope(state: ReturnType<typeof identicalDaggerBattle>) {
  return battleAttackExecutionScopeRefForProcedureRef(
    fighterOrigin(state).unarmedStrike.procedureRef,
  );
}

describe("character attack execution references", () => {
  test("allocates deterministic, distinct references for identical attack occurrences", () => {
    const first = identicalDaggerBattle();
    const second = identicalDaggerBattle();
    const firstOrigin = fighterOrigin(first);
    const secondOrigin = fighterOrigin(second);
    const references = [
      firstOrigin.attack?.procedureRef,
      firstOrigin.unarmedStrike.procedureRef,
      firstOrigin.offHandAttack?.procedureRef,
    ];

    expect(references.every((reference) => reference !== undefined)).toBe(true);
    expect(new Set(references).size).toBe(3);
    expect(firstOrigin.attack?.weapon.id).toBe("weapon_dagger");
    expect(firstOrigin.offHandAttack?.weapon.id).toBe("weapon_dagger");
    expect(fighterAttackScope(first)).toBe(fighterAttackScope(second));
    expect(firstOrigin.attack?.procedureRef).toBe(
      secondOrigin.attack?.procedureRef,
    );
    expect(firstOrigin.offHandAttack?.procedureRef).toBe(
      secondOrigin.offHandAttack?.procedureRef,
    );
    expect(
      battleAttackExecutionScopeRefBelongsToBattle(
        fighterAttackScope(first),
        first.battleId,
      ),
    ).toBe(true);
    expect(
      battleAttackExecutionScopeRefBelongsToCombatant(
        fighterAttackScope(first),
        fighterId,
      ),
    ).toBe(true);
    for (const reference of references) {
      expect(
        reference !== undefined &&
          battleProcedureExecutionRefBelongsToScope(
            reference,
            fighterAttackScope(first),
          ),
      ).toBe(true);
    }
    expect(Number(first.executionScopeCursors.get(fighterId))).toBe(2);
  });

  test("keeps presentation names outside the reducer protocol", () => {
    const canonical = identicalDaggerBattle();
    const renamed = identicalDaggerBattle("Synthetic Needle");
    const canonicalOrigin = fighterOrigin(canonical);
    const renamedOrigin = fighterOrigin(renamed);

    expect(renamedOrigin.attack?.procedureRef).toBe(
      canonicalOrigin.attack?.procedureRef,
    );
    expect(renamedOrigin.offHandAttack?.procedureRef).toBe(
      canonicalOrigin.offHandAttack?.procedureRef,
    );

    const subject = fighterAttackSubject(renamed, "Synthetic Needle");
    expect(subject).toEqual({
      tag: "action",
      actorId: fighterId,
      action: "attack",
      procedureRef: renamedOrigin.attack?.procedureRef,
      attackAbility: "str",
      attackDamageType: "piercing",
    });
    expect(subject).not.toHaveProperty("attackName");

    const act = discoverBattleActs(renamed).find(
      (candidate) =>
        candidate.subject.tag === "action" &&
        candidate.subject.action === "attack" &&
        candidate.subject.procedureRef === subject.procedureRef,
    );
    const target = requireHole(
      resolveBattleSubject({ state: renamed, subject, fills: [] }),
      "targetChoice",
    );
    if (target.kind !== "targetChoice") {
      throw new Error("Expected target choice hole.");
    }
    expect(act?.summary).toBe("Take the Attack action with Synthetic Needle.");
    expect(target.attack?.selection).toEqual({
      procedureRef: subject.procedureRef,
      attackAbility: "str",
      attackDamageType: "piercing",
    });

    const targetChoice = attackTargetFill(
      target,
      fighterId,
      goblinId,
      attackExecutionSelectionForSubjectForTest(subject),
    );
    if (targetChoice.kind !== "targetChoice") {
      throw new Error("Expected target choice fill.");
    }
    expect(targetChoice.spatialFacts).toContainEqual(
      expect.objectContaining({ procedureRef: subject.procedureRef }),
    );
    const roll = requireHole(
      resolveBattleSubject({
        state: renamed,
        subject,
        fills: [targetChoice],
      }),
      "attackRoll",
    );
    const afterMainAttack = requireResolved(
      resolveBattleSubject({
        state: renamed,
        subject,
        fills: [
          targetChoice,
          attackRollFill(roll, { total: 1, naturalD20: 1 }),
        ],
      }),
    ).state;
    const offHandSubject = characterBonusAttackSubjectForTest(
      afterMainAttack,
      fighterId,
      "offHandAttack",
    );
    expect(offHandSubject.procedureRef).toBe(
      renamedOrigin.offHandAttack?.procedureRef,
    );
    expect(offHandSubject.procedureRef).not.toBe(subject.procedureRef);
  });

  test("round-trips character attack execution ownership in snapshots", () => {
    const state = identicalDaggerBattle();
    const snapshot = snapshotBattle(state);
    const encoded = Schema.encodeSync(BattleSnapshotSchema)(snapshot);
    const decoded = Schema.decodeUnknownSync(BattleSnapshotSchema)(encoded);
    const fighter = decoded.combatants.find(
      (combatant) => combatant.combatantId === fighterId,
    );
    const origin = fighterOrigin(state);

    expect(fighter?.origin).toEqual(
      expect.objectContaining({
        kind: "character",
        attackExecution: {
          scopeRef: fighterAttackScope(state),
          attackProcedureRef: origin.attack?.procedureRef,
          unarmedStrikeProcedureRef: origin.unarmedStrike.procedureRef,
          offHandAttackProcedureRef: origin.offHandAttack?.procedureRef,
        },
      }),
    );

    const other = startBattleRight({
      battleId: battleId("battle-other-character-attack-execution"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const otherOrigin = fighterOrigin(other);
    const forged = {
      ...encoded,
      combatants: encoded.combatants.map((combatant) =>
        combatant.combatantId !== fighterId ||
        combatant.origin.kind !== "character"
          ? combatant
          : {
              ...combatant,
              origin: {
                ...combatant.origin,
                attackExecution: {
                  ...combatant.origin.attackExecution,
                  unarmedStrikeProcedureRef:
                    otherOrigin.unarmedStrike.procedureRef,
                },
              },
            },
      ),
    };
    expect(
      Either.isLeft(Schema.decodeUnknownEither(BattleSnapshotSchema)(forged)),
    ).toBe(true);
  });

  test("rejects character attack snapshots with swapped semantic ordinals", () => {
    const encoded = Schema.encodeSync(BattleSnapshotSchema)(
      snapshotBattle(identicalDaggerBattle()),
    );
    const swapped = {
      ...encoded,
      combatants: encoded.combatants.map((combatant) =>
        combatant.combatantId !== fighterId ||
        combatant.origin.kind !== "character"
          ? combatant
          : {
              ...combatant,
              origin: {
                ...combatant.origin,
                attackExecution: {
                  ...combatant.origin.attackExecution,
                  attackProcedureRef:
                    combatant.origin.attackExecution.unarmedStrikeProcedureRef,
                  unarmedStrikeProcedureRef:
                    combatant.origin.attackExecution.attackProcedureRef,
                },
              },
            },
      ),
    };

    expect(
      Either.isLeft(Schema.decodeUnknownEither(BattleSnapshotSchema)(swapped)),
    ).toBe(true);
  });

  test("codecs preserve complete ranged and Opportunity Attack selections", () => {
    const state = identicalDaggerBattle();
    const attack = fighterOrigin(state).attack;
    if (attack === null) {
      throw new Error("Expected the bound fighter attack.");
    }
    const selection = {
      procedureRef: attack.procedureRef,
      attackAbility: attack.ability,
      attackDamageType: attack.weapon.damage.damageType,
    };

    const ranged = Schema.decodeUnknownSync(BattleFillSchema)({
      kind: "targetChoice",
      holeId: "battle:test:ranged-selection",
      value: goblinId,
      spatialFacts: [
        {
          kind: "attackTargetInRangedRange",
          actorId: fighterId,
          targetId: goblinId,
          ...selection,
          rangeBand: "normal",
        },
      ],
    });
    expect(ranged).toMatchObject({
      spatialFacts: [expect.objectContaining(selection)],
    });

    const movement = Schema.decodeUnknownSync(BattleFillSchema)({
      kind: "movement",
      holeId: "battle:test:opportunity-selection",
      value: {
        speedKind: "walk",
        movementCostFeet: 5,
        provokedOpportunityAttacks: [{ reactorId: fighterId, ...selection }],
      },
    });
    expect(movement).toMatchObject({
      value: {
        provokedOpportunityAttacks: [expect.objectContaining(selection)],
      },
    });
  });

  test("rejects partial bound character attack replay keys", () => {
    const subject = fighterAttackSubject(identicalDaggerBattle(), "Dagger");
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleSubjectSchema)({
          tag: subject.tag,
          actorId: subject.actorId,
          action: subject.action,
          procedureRef: subject.procedureRef,
          attackAbility: subject.attackAbility,
        }),
      ),
    ).toBe(true);
  });

  test("keeps projected Opportunity Attack threat identities distinct", () => {
    const procedureRef = fighterOrigin(identicalDaggerBattle()).attack
      ?.procedureRef;
    if (procedureRef === undefined) {
      throw new Error("Expected the bound fighter attack.");
    }
    expect(
      boundAttackExecutionSelectionKey({
        procedureRef,
        attackAbility: "str",
        attackDamageType: "piercing",
      }),
    ).not.toBe(
      boundAttackExecutionSelectionKey({
        procedureRef,
        attackAbility: "cha",
        attackDamageType: "necrotic",
      }),
    );
  });
});
