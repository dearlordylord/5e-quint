import { movementFeet } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";

import { openCreatureFallsRuntimeInterruptWindow } from "../index.ts";
import { spellSlotInvocationRef } from "../battle-subjects.ts";
import {
  characterSpellInvocationRefForProcedureRefForTest,
  requireCharacterSpellProcedureRefForTest,
} from "../battle-runtime.test-support.ts";
import {
  spellCasterId,
  spellTargetId,
} from "../unit-profile-admission-catalog.test-support.ts";
import { spellBattle } from "../unit-profile-admission-spell-battle.test-support.ts";
import { spellRecord } from "../unit-profile-admission-spell-record.test-support.ts";
import { currentInterruptCheckpoint } from "./battle-snapshot.ts";
import { reactionSpellRouteSubjectForInterruptFrame } from "./reaction-spell-routes.ts";

describe("Reaction spell route subjects", () => {
  test("projects a Feather Fall creature-falls checkpoint to the generic Reaction spell subject", () => {
    const featherFallInvocation = spellSlotInvocationRef(
      "feather_fall",
      1,
      "fallingCreatureMitigationReaction",
    );
    const session = spellBattle({
      preparedSpells: [spellRecord("feather_fall")],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const awaitingReaction = openCreatureFallsRuntimeInterruptWindow({
      session,
      fallingCreatureId: spellTargetId,
      reactionSpellTargetFacts: [
        {
          kind: "fallingCreatureMitigationTrigger",
          reactorId: spellCasterId,
          sourceProcedureRef: requireCharacterSpellProcedureRefForTest(
            session,
            spellCasterId,
            featherFallInvocation,
          ),
          witness: {
            kind: "visibleCreatureFalls",
            fallingCreatureId: spellTargetId,
            distanceFeet: movementFeet(60),
          },
        },
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected a creature-falls Reaction checkpoint.");
    }
    const frame = currentInterruptCheckpoint(awaitingReaction.session.state);
    if (frame?.trigger !== "creatureFalls") {
      throw new Error("Expected a typed creature-falls checkpoint.");
    }
    const choice = frame.choices.find(
      (candidate) =>
        candidate.kind === "nestedProcedure" &&
        candidate.subject.command === "castTriggeredReactionSpell" &&
        candidate.subject.reactorId === spellCasterId,
    );
    if (
      choice?.kind !== "nestedProcedure" ||
      choice.subject.command !== "castTriggeredReactionSpell"
    ) {
      throw new Error("Expected a Feather Fall Reaction spell choice.");
    }
    expect(
      characterSpellInvocationRefForProcedureRefForTest(
        awaitingReaction.session,
        choice.subject.reactorId,
        choice.subject.procedureRef,
      ),
    ).toEqual(featherFallInvocation);

    expect(
      reactionSpellRouteSubjectForInterruptFrame(
        awaitingReaction.session.state,
        frame,
      ),
    ).toBe("reactionSpell");
  });
});
