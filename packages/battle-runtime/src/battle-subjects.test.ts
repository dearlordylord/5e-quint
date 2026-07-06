import { describe, expect, test } from "vitest";

import {
  combatantId,
  sameBattleSubject,
  type BattleSubject,
} from "./index.ts";

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
});
