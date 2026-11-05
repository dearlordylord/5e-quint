import { Result, Schema } from "effect";
import { describe, expect, it } from "vitest";
import {
  fireballUnitId,
  spellTargetId,
} from "../../../battle-runtime/src/unit-profile-admission-catalog.test-support.ts";
import { spellBattle } from "../../../battle-runtime/src/unit-profile-admission-spell-battle.test-support.ts";
import { spellRecord } from "../../../battle-runtime/src/unit-profile-admission-spell-record.test-support.ts";
import {
  BattleResolutionOutputSchema,
  BattleSessionOutputSchema,
} from "../battle-tool-output.ts";
import { createMcpPlaySessionRoot } from "../composition-root.ts";
import { jsonContentPayload } from "../tool-content.ts";
import { CHATGPT_EXECUTION_TOOLS } from "./tool-surface.ts";

function selectedSphere() {
  const root = createMcpPlaySessionRoot();
  expect(
    Result.isSuccess(
      root.sessionStore.storeActiveBattle(
        spellBattle({
          preparedSpells: [spellRecord(fireballUnitId)],
          casterClassLevels: [{ className: "wizard", level: 5 }],
          spellSlots: [{ spellLevel: 3, count: 1 }],
          targetHp: 50,
          targetMaxHp: 50,
        }),
      ),
    ),
  ).toBe(true);
  const discovery = Schema.decodeUnknownSync(BattleSessionOutputSchema)(
    jsonContentPayload(
      CHATGPT_EXECUTION_TOOLS.discover_battle_acts.handle(root, {}),
    ),
  );
  if (discovery.envelope?.frontier.kind !== "acts")
    throw new Error("Expected available spell acts.");
  const act = discovery.envelope.frontier.acts.find(
    (candidate) =>
      candidate.presentation.kind === "spell" &&
      candidate.presentation.invocation.spellId === fireballUnitId,
  );
  if (act === undefined) throw new Error("Expected the prepared spell.");
  const selected = Schema.decodeUnknownSync(BattleResolutionOutputSchema)(
    jsonContentPayload(
      CHATGPT_EXECUTION_TOOLS.cast_spell.handle(root, { subject: act.subject }),
    ),
  );
  if (selected.envelope.frontier.kind !== "holes")
    throw new Error("Expected spell saving throws.");
  const hole = selected.envelope.frontier.holes.find(
    (candidate) => candidate.kind === "savingThrowOutcome",
  );
  if (hole === undefined) throw new Error("Expected the saving throw hole.");
  return { root, hole };
}

describe("Point-origin sphere input", () => {
  it("rejects a combatant origin absent from the battle without changing its checkpoint", () => {
    const { root, hole } = selectedSphere();
    const checkpoint = root.sessionStore.battleSession?.state;
    const result = jsonContentPayload(
      CHATGPT_EXECUTION_TOOLS.provide_battle_input.handle(root, {
        fill: {
          kind: hole.kind,
          holeId: hole.holeId,
          value: {
            area: {
              kind: "pointOriginSphereSaveDamageArea",
              originAnchor: {
                kind: "combatant",
                combatantId: "absent-creature",
              },
              affectedTargetIds: [spellTargetId],
              objectIgnitionFacts: [],
            },
            outcomes: [
              {
                targetId: spellTargetId,
                succeeded: false,
                d20TestRoll: { tag: "single", naturalD20: 6 },
              },
            ],
          },
        },
      }),
    );
    expect(result).toMatchObject({ result: { tag: "invalid" } });
    expect(root.sessionStore.battleSession?.state).toBe(checkpoint);
  });

  it("resolves a table-selected point without inventing a combatant", () => {
    const { root, hole } = selectedSphere();
    const saved = jsonContentPayload(
      CHATGPT_EXECUTION_TOOLS.provide_battle_input.handle(root, {
        fill: {
          kind: hole.kind,
          holeId: hole.holeId,
          value: {
            area: {
              kind: "pointOriginSphereSaveDamageArea",
              originAnchor: { kind: "tableSelectedPoint" },
              affectedTargetIds: [spellTargetId],
              objectIgnitionFacts: [],
            },
            outcomes: [
              {
                targetId: spellTargetId,
                succeeded: false,
                d20TestRoll: { tag: "single", naturalD20: 6 },
              },
            ],
          },
        },
      }),
    );
    expect(saved).toMatchObject({ result: { tag: "needsHoles" } });
    const decoded = Schema.decodeUnknownSync(BattleResolutionOutputSchema)(
      saved,
    );
    if (decoded.envelope.frontier.kind !== "holes")
      throw new Error("Expected damage dice.");
    const damage = decoded.envelope.frontier.holes.find(
      (candidate) => candidate.kind === "rolledDice",
    );
    if (damage === undefined)
      throw new Error("Expected the spell damage request.");
    const completed = Schema.decodeUnknownSync(BattleResolutionOutputSchema)(
      jsonContentPayload(
        CHATGPT_EXECUTION_TOOLS.provide_battle_input.handle(root, {
          fill: {
            kind: damage.kind,
            holeId: damage.holeId,
            value: [{ results: [4, 4, 4, 4, 4, 4, 4, 4] }],
          },
        }),
      ),
    );
    expect(completed.result.tag).toBe("resolved");
    expect(
      completed.envelope.checkpoint.combatants.find(
        (c) => c.combatantId === spellTargetId,
      )?.hp,
    ).toBe(18);
  });
});
