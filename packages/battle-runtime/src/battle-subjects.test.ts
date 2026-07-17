import { describe, expect, test } from "vitest";

import { NonNegativeInteger } from "@dnd/shared/types";
import {
  combatantId,
  sameAdmittedBattleSubject,
  sameBattleExecutionSubject,
  sameBattleSubject,
  type BattleSubject,
} from "./index.ts";
import {
  battleAttackExecutionScopeRef,
  battleAttackProcedureExecutionRef,
  battleCharacterExecutionScopeRef,
  battleExecutionScopeOrdinal,
  battleId,
  battleProcedureExecutionRef,
} from "./identity.ts";

describe("BattleSubject identity", () => {
  test("attack ability projections of one bound procedure remain distinct", () => {
    const actorId = combatantId("ability-choice-attacker");
    const procedureRef = battleAttackProcedureExecutionRef(
      battleAttackExecutionScopeRef(
        battleId("ability-choice-battle"),
        actorId,
        battleExecutionScopeOrdinal(0),
      ),
      NonNegativeInteger(0),
    );
    const strengthAttack = {
      tag: "action",
      actorId,
      action: "attack",
      procedureRef,
      attackAbility: "str",
      attackDamageType: "slashing",
    } satisfies BattleSubject;
    const dexterityAttack = {
      ...strengthAttack,
      attackAbility: "dex",
    } satisfies BattleSubject;
    const necroticAttack = {
      ...strengthAttack,
      attackDamageType: "necrotic",
    } satisfies BattleSubject;
    const radiantAttack = {
      ...strengthAttack,
      attackDamageType: "radiant",
    } satisfies BattleSubject;

    expect(sameBattleSubject(strengthAttack, dexterityAttack)).toBe(false);
    expect(sameBattleSubject(necroticAttack, radiantAttack)).toBe(false);
  });

  test("creature-type protection condition attempts include condition identity", () => {
    const charmedAttempt = {
      tag: "runtimeCommand",
      actorId: combatantId("protected-target"),
      command: "creatureTypeProtectionConditionAttempt",
      sourceCombatantId: combatantId("scoped-source"),
      condition: "charmed",
    } satisfies BattleSubject;
    const frightenedAttempt = {
      ...charmedAttempt,
      condition: "frightened",
    } satisfies BattleSubject;

    expect(sameBattleSubject(charmedAttempt, frightenedAttempt)).toBe(false);
  });

  test("admitted character procedures include their execution ref in subject identity", () => {
    const actorId = combatantId("procedure-subject-owner");
    const scopeRef = battleCharacterExecutionScopeRef(
      battleId("procedure-subject-battle"),
      actorId,
      battleExecutionScopeOrdinal(0),
    );
    const subject = {
      tag: "monkFocusOption",
      actorId,
      procedureRef: battleProcedureExecutionRef(
        scopeRef,
        NonNegativeInteger(0),
      ),
      resourceUnitId: "synthetic-focus-resource",
      option: "flurryOfBlows",
    } satisfies BattleSubject;
    const otherOccurrence = {
      ...subject,
      procedureRef: battleProcedureExecutionRef(
        scopeRef,
        NonNegativeInteger(1),
      ),
    } satisfies BattleSubject;

    expect(sameBattleSubject(subject, otherOccurrence)).toBe(true);
    expect(sameAdmittedBattleSubject(subject, otherOccurrence)).toBe(false);
    expect(sameBattleExecutionSubject(subject, otherOccurrence)).toBe(false);
    const { procedureRef: _procedureRef, ...authoredSelection } = subject;
    expect(sameBattleExecutionSubject(subject, authoredSelection)).toBe(true);
  });
});
