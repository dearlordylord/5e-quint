import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  battleHoleFamilyKind,
  type BattleHole,
  type BattleHoleFamilyKind,
} from "./index.ts";

type BattleHoleFrontierRow = {
  readonly subject: string;
  readonly id: string;
  readonly holeKind?: string | null;
};

const battleHoleFrontierPath = new URL(
  "../../../plans/rules-kernel-coverage/battle-hole-frontier.jsonl",
  import.meta.url,
);

function battleHoleFamilyRows(): readonly BattleHoleFrontierRow[] {
  return readFileSync(battleHoleFrontierPath, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as BattleHoleFrontierRow)
    .filter((row) => row.subject === "battle-hole-family");
}

describe("battle hole family kind vocabulary", () => {
  test("BattleHole mapping matches the frontier registry", () => {
    for (const row of battleHoleFamilyRows()) {
      expect(row.holeKind, `${row.id} must have a hole kind`).toEqual(
        expect.any(String),
      );
      const hole = { kind: row.holeKind } as BattleHole;
      expect(battleHoleFamilyKind(hole), row.id).toBe(
        row.holeKind as BattleHoleFamilyKind,
      );
    }
  });
});
