import { battleObjectId } from "./identity.ts";
import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { Schema } from "effect";
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";

import {
  BattleFillSchema,
  BattleSnapshotSchema,
  BattleSubjectSchema,
  discoverBattleActs,
  emptyBattleRuntimeContext,
  snapshotBattle,
  startBattle,
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
  startBattleSessionRight,
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
import { unitLibrary } from "./unit-profile-admission-catalog-support.ts";
import { attackActionOptionPresentationName } from "./stat-block-presentation.ts";

function identicalDaggerSession(name = "Dagger") {
  const attack = testDaggerAttack();
  const dagger = unitLibrary.requireUnit("weapon_dagger");
  if (dagger.kind !== "weapon") {
    throw new Error("Expected Dagger weapon Unit.");
  }
  return startBattleSessionRight({
    battleId: battleId("battle-character-attack-execution-references"),
    combatants: [
      characterSeed({
        initiative: 20,
        attack,
        offHandAttack: attack,
        characterUnitRefs: [{ unit: { ...dagger, name }, supportProfiles: [] }],
        selectedLoadout: {
          weapon: {
            itemId: battleObjectId("main:weapon_dagger"),
            unitId: parseSharedUnitId("weapon_dagger"),
            grip: "one_handed",
          },
          offHandWeapon: {
            itemId: battleObjectId("off:weapon_dagger"),
            unitId: parseSharedUnitId("weapon_dagger"),
          },
        },
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}

function identicalDaggerBattle(name = "Dagger") {
  return identicalDaggerSession(name).state;
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
  test("battle admission rejects a weapon without an authored presentation source", () => {
    const character = characterSeed({ initiative: 20 });
    if (character.creatureInit.kind !== "character") {
      throw new Error("Expected character fixture.");
    }
    const result = startBattle({
      battleId: battleId("missing-weapon-presentation-source"),
      combatants: [
        {
          ...character,
          creatureInit: {
            ...character.creatureInit,
            characterUnitRefs: [],
          },
        },
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(result).toEqual(
      Either.left({
        tag: "battleStateInitIssue",
        message:
          "Character fighter weapon weapon_longsword has missing authored presentation source.",
      }),
    );
  });

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
    expect(firstOrigin.attack?.weapon.weaponUnitId).toBe("weapon_dagger");
    expect(firstOrigin.offHandAttack?.weapon.weaponUnitId).toBe(
      "weapon_dagger",
    );
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
    expect(
      Number(first.executionScopeCursors.get(fighterId)?.nextScopeOrdinal),
    ).toBe(2);
  });

  test("keeps presentation names outside the reducer protocol", () => {
    const canonicalSession = identicalDaggerSession();
    const renamedSession = identicalDaggerSession("Synthetic Needle");
    const canonical = canonicalSession.state;
    const renamed = renamedSession.state;
    const canonicalOrigin = fighterOrigin(canonical);
    const renamedOrigin = fighterOrigin(renamed);

    expect(renamedOrigin.attack?.procedureRef).toBe(
      canonicalOrigin.attack?.procedureRef,
    );
    expect(renamedOrigin.offHandAttack?.procedureRef).toBe(
      canonicalOrigin.offHandAttack?.procedureRef,
    );

    const procedureRef = renamedOrigin.attack?.procedureRef;
    if (procedureRef === undefined) {
      throw new Error("Expected renamed attack procedure reference.");
    }
    const subject = {
      tag: "action" as const,
      actorId: fighterId,
      action: "attack" as const,
      procedureRef,
      attackAbility: "str" as const,
      attackDamageType: "piercing" as const,
    };
    expect(subject).toEqual({
      tag: "action",
      actorId: fighterId,
      action: "attack",
      procedureRef: renamedOrigin.attack?.procedureRef,
      attackAbility: "str",
      attackDamageType: "piercing",
    });
    expect(subject).not.toHaveProperty("attackName");

    const act = discoverBattleActs(renamedSession).find(
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
    if (renamedOrigin.attack === null) {
      throw new Error("Expected renamed attack execution.");
    }
    expect(
      attackActionOptionPresentationName(
        renamed,
        emptyBattleRuntimeContext(),
        fighterId,
        renamedOrigin.attack,
      ),
    ).toEqual(
      Either.left({
        tag: "attackPresentationJoinIssue",
        reason: "characterContextMissing",
      }),
    );
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

  test("rejects snapshot Acts whose attack holes use another combatant's bound procedure", () => {
    const state = identicalDaggerBattle();
    const encoded = Schema.encodeSync(BattleSnapshotSchema)(
      snapshotBattle(state),
    );
    const goblin = state.combatants.get(goblinId);
    const wrongOwnerProcedureRef =
      goblin?.origin.kind === "statBlock"
        ? goblin.origin.execution.procedureBindings.find(
            (binding) => binding.procedure.kind === "attack",
          )?.procedureRef
        : undefined;
    if (wrongOwnerProcedureRef === undefined) {
      throw new Error("Expected the other combatant's attack procedure ref.");
    }
    const actWithHole = encoded.acts.find((act) =>
      act.initialHoles.some(
        (hole) => hole.kind === "targetChoice" && hole.attack !== undefined,
      ),
    );
    if (actWithHole === undefined) {
      throw new Error("Expected an Act with an initial hole.");
    }
    const forged = {
      ...encoded,
      acts: encoded.acts.map((act) =>
        act !== actWithHole
          ? act
          : {
              ...act,
              initialHoles: act.initialHoles.map((hole) =>
                hole.kind !== "targetChoice" || hole.attack === undefined
                  ? hole
                  : {
                      ...hole,
                      attack: {
                        ...hole.attack,
                        selection: {
                          ...hole.attack.selection,
                          procedureRef: wrongOwnerProcedureRef,
                        },
                      },
                    },
              ),
            },
      ),
    };

    expect(
      Either.isLeft(Schema.decodeUnknownEither(BattleSnapshotSchema)(forged)),
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
