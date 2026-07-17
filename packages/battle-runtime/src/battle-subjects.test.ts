import { describe, expect, test } from "vitest";

import {
  combatantId,
  sameAdmittedBattleSubject,
  sameBattleExecutionSubject,
  sameBattleSubject,
  type BattleSubject,
} from "./index.ts";
import { NonNegativeInteger } from "@dnd/shared/types";
import {
  battleCharacterExecutionScopeRef,
  battleExecutionScopeOrdinal,
  battleId,
  battleProcedureExecutionRef,
} from "./identity.ts";

describe("BattleSubject identity", () => {
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
