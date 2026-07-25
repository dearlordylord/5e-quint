import * as Either from "effect/Either";
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
    expect(Either.isLeft(issue)).toBe(true);
    if (Either.isLeft(issue)) {
      expect(issue.left).toEqual({
        tag: "battleStateInitIssue",
        message: "test message",
      });
    }
  });

  test("weaponLoadoutMismatchIssue produces a leaf issue with slot", () => {
    const issue = weaponLoadoutMismatchIssue("main-hand");
    expect(Either.isLeft(issue)).toBe(true);
    if (Either.isLeft(issue)) {
      expect(issue.left).toEqual({
        tag: "weaponLoadoutMismatch",
        slot: "main-hand",
      });
    }
  });

  test("battleStateInitIssues requires at least two leaves and returns an aggregate", () => {
    const firstEither = weaponLoadoutMismatchIssue("main-hand");
    const secondEither = weaponLoadoutMismatchIssue("off-hand");
    const thirdEither = battleStateInitIssue("another issue");

    expect(Either.isLeft(firstEither)).toBe(true);
    expect(Either.isLeft(secondEither)).toBe(true);
    expect(Either.isLeft(thirdEither)).toBe(true);
    if (
      Either.isLeft(firstEither) &&
      Either.isLeft(secondEither) &&
      Either.isLeft(thirdEither)
    ) {
      const first = firstEither.left;
      const second = secondEither.left;
      const third = thirdEither.left;
      const aggregate = battleStateInitIssues(first, second, third);

      expect(Either.isLeft(aggregate)).toBe(true);
      if (Either.isLeft(aggregate)) {
        expect(aggregate.left).toEqual({
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
    const firstEither = weaponLoadoutMismatchIssue("main-hand");
    const secondEither = weaponLoadoutMismatchIssue("off-hand");
    expect(Either.isLeft(firstEither)).toBe(true);
    expect(Either.isLeft(secondEither)).toBe(true);
    if (Either.isLeft(firstEither) && Either.isLeft(secondEither)) {
      const aggregate = battleStateInitIssues(
        firstEither.left,
        secondEither.left,
      );
      expect(Either.isLeft(aggregate)).toBe(true);
      if (Either.isLeft(aggregate)) {
        expect(battleStateInitIssueMessage(aggregate.left)).toBe(
          "Character battle init main-hand weapon attack must match the selected loadout weapon.; Character battle init off-hand weapon attack must match the selected loadout weapon.",
        );
      }
    }
  });
});
