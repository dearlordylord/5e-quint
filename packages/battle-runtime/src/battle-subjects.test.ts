import { describe, expect, test } from "vitest";

import { combatantId, sameBattleSubject, type BattleSubject } from "./index.ts";
import {
  battleAttackExecutionScopeRef,
  battleAttackProcedureExecutionRef,
  battleExecutionScopeOrdinal,
  battleId,
} from "./identity.ts";
import { NonNegativeInteger } from "@dnd/shared/types";

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
});
