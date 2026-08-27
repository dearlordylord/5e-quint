import { Result } from "effect";
import { describe, expect, test } from "vitest";

import {
  battleStateInitIssue,
  battleStateInitIssueMessage,
  battleStateInitIssues,
  weaponLoadoutMismatchIssue,
} from "./domain-helpers.ts";

describe("BattleStateInitIssue helpers", () => {
  test("battleStateInitIssue produces a leaf issue", () => {
    const issue = battleStateInitIssue("test message");
    expect(Result.isFailure(issue)).toBe(true);
    if (Result.isFailure(issue)) {
      expect(issue.failure).toEqual({
        tag: "battleStateInitIssue",
        message: "test message",
      });
    }
  });

  test("weaponLoadoutMismatchIssue produces a leaf issue with slot", () => {
    const issue = weaponLoadoutMismatchIssue("main-hand");
    expect(Result.isFailure(issue)).toBe(true);
    if (Result.isFailure(issue)) {
      expect(issue.failure).toEqual({
        tag: "weaponLoadoutMismatch",
        slot: "main-hand",
      });
    }
  });

  test("battleStateInitIssues requires at least two leaves and returns an aggregate", () => {
    const firstResult = weaponLoadoutMismatchIssue("main-hand");
    const secondResult = weaponLoadoutMismatchIssue("off-hand");
    const thirdResult = battleStateInitIssue("another issue");

    expect(Result.isFailure(firstResult)).toBe(true);
    expect(Result.isFailure(secondResult)).toBe(true);
    expect(Result.isFailure(thirdResult)).toBe(true);
    if (
      Result.isFailure(firstResult) &&
      Result.isFailure(secondResult) &&
      Result.isFailure(thirdResult)
    ) {
      const first = firstResult.failure;
      const second = secondResult.failure;
      const third = thirdResult.failure;
      const aggregate = battleStateInitIssues(first, second, third);

      expect(Result.isFailure(aggregate)).toBe(true);
      if (Result.isFailure(aggregate)) {
        expect(aggregate.failure).toEqual({
          tag: "battleStateInitIssues",
          issues: [first, second, third],
        });
      }
    }
  });

  test("battleStateInitIssueMessage formats leaf issues", () => {
    expect(
      battleStateInitIssueMessage({
        tag: "battleStateInitIssue",
        message: "plain issue",
      }),
    ).toBe("plain issue");
    expect(
      battleStateInitIssueMessage({
        tag: "weaponLoadoutMismatch",
        slot: "off-hand",
      }),
    ).toBe(
      "Character battle init off-hand weapon attack must match the selected loadout weapon.",
    );
  });

  test("battleStateInitIssueMessage recursively formats aggregate leaves", () => {
    const firstResult = weaponLoadoutMismatchIssue("main-hand");
    const secondResult = weaponLoadoutMismatchIssue("off-hand");
    expect(Result.isFailure(firstResult)).toBe(true);
    expect(Result.isFailure(secondResult)).toBe(true);
    if (Result.isFailure(firstResult) && Result.isFailure(secondResult)) {
      const aggregate = battleStateInitIssues(
        firstResult.failure,
        secondResult.failure,
      );
      expect(Result.isFailure(aggregate)).toBe(true);
      if (Result.isFailure(aggregate)) {
        expect(battleStateInitIssueMessage(aggregate.failure)).toBe(
          "Character battle init main-hand weapon attack must match the selected loadout weapon.; Character battle init off-hand weapon attack must match the selected loadout weapon.",
        );
      }
    }
  });
});
