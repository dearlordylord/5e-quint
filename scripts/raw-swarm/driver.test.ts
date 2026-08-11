import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, test } from "vitest";

import { repoRoot } from "./transcript.ts";

describe("RAW swarm scripted driver", () => {
  test("rejects a meleeAttackHit scenario whose roll misses", () => {
    const directory = mkdtempSync(join(tmpdir(), "raw-swarm-driver-"));
    try {
      const scenarioPath = join(directory, "miss.json");
      const transcriptPath = join(directory, "miss.jsonl");
      writeFileSync(
        scenarioPath,
        JSON.stringify({
          id: "miss",
          kind: "scripted-probe",
          rawCitations: [],
          setup: {
            battleId: "battle:miss",
            participants: [
              {
                combatantId: "goblin",
                statBlockId: "stat_block_goblin_warrior",
                initiative: 15,
              },
              {
                combatantId: "skeleton",
                statBlockId: "stat_block_skeleton",
                initiative: 10,
              },
            ],
          },
          script: [
            {
              kind: "meleeAttackHit",
              actor: "goblin",
              actSelector: {
                labelContains: "Scimitar",
                subjectKind: "attack",
              },
              resolution: {
                targetChoice: "skeleton",
                attackRoll: 1,
                attackNaturalD20: 2,
                damage: {
                  kind: "retainsPositiveHitPoints",
                  rolledDice: [[1]],
                },
              },
              then: "continue",
            },
          ],
          expectations: [],
        }),
        "utf8",
      );

      expect(() =>
        execFileSync(
          "mise",
          [
            "exec",
            "--",
            "pnpm",
            "exec",
            "tsx",
            resolve(repoRoot, "scripts/raw-swarm/driver.ts"),
            scenarioPath,
            "--transcript",
            transcriptPath,
          ],
          { cwd: repoRoot, stdio: "pipe" },
        ),
      ).toThrow(/resolved before the required damage roll/);
    } finally {
      rmSync(directory, { recursive: true });
    }
  }, 30_000);
});
