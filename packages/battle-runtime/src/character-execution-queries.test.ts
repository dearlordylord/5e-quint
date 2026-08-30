import { abilityModifier, movementFeet } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";
import {
  battleId,
  characterSeed,
  spellRecord,
  startBattleRight,
  wizardId,
} from "./battle-runtime.test-support.ts";
import { characterProcedureBindingSnapshots } from "./character-execution-queries.ts";
import { characterExecutionWithSpellInvocations } from "./character-execution-admission.ts";
import { spellRecordToAdmissionSource } from "./character-battle-resources.ts";
import type {
  BattleStoredSpellProcedureExecution,
  SpawnedCompanionLifecycleExecutionFacts,
} from "./character-execution.ts";
import type { SpawnedCompanionLifecycleSpellInvocation } from "./battle-state-execution.ts";
import { spellExecutionFacts } from "./battle-reducer/spell-execution-facts.ts";

const companionExecution: SpawnedCompanionLifecycleExecutionFacts = {
  procedure: "spawnedCompanionLifecycle",
  casting: {
    kind: "ritualOrPreparedSlot",
    castingTimeMinutes: 60,
    nonRitualSlotLevel: 1,
  },
  initialPlacement: {
    kind: "unoccupiedSpaceWithinRange",
    rangeFeet: movementFeet(10),
  },
  formEligibility: {
    baseCreatureType: "beast",
    challengeRating: 0,
    creatureTypeOverrides: ["celestial", "fey", "fiend"],
  },
  lifecycle: {
    maximumCompanionsPerOwner: 1,
    recastDisposition: "adoptEligibleForm",
    zeroHitPointsDisposition: "disappearUntilRecast",
    temporaryDismissal: {
      actionCost: "magicAction",
      destination: "pocketDimension",
    },
    recall: {
      actionCost: "magicAction",
      destination: "unoccupiedSpaceWithinRange",
      rangeFeet: movementFeet(30),
    },
  },
  control: {
    initiative: "own",
    agency: "independentObeysCommands",
    canAttack: false,
  },
  telepathyRangeFeet: movementFeet(100),
  sharedSensesActionCost: "bonusAction",
  touchSpellProxy: {
    requiredSpellRange: "touch",
    companionRangeFeet: movementFeet(100),
    companionActionCost: "reaction",
    timing: "cast",
  },
};

describe("character procedure binding snapshots", () => {
  test("excludes companion lifecycle before invoking the battle spell projector", () => {
    const state = startBattleRight({
      battleId: battleId("character-procedure-binding-snapshot"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          initiative: 20,
        }),
      ],
    });
    const wizard = state.combatants.get(wizardId);
    expect(wizard?.origin.kind).toBe("character");
    if (wizard?.origin.kind !== "character") return;

    const companionInvocation: SpawnedCompanionLifecycleSpellInvocation = {
      ...companionExecution,
      spell: spellRecordToAdmissionSource(spellRecord("find_familiar"), {
        tag: "classSpellcasting",
        className: "wizard",
        abilityModifier: abilityModifier(3),
      }),
    };
    const execution = characterExecutionWithSpellInvocations(
      wizard.origin.execution,
      [companionInvocation],
    );
    expect(
      execution.procedureBindings.some(
        (binding) =>
          binding.procedure.kind === "spellInvocation" &&
          binding.procedure.execution.procedure === "spawnedCompanionLifecycle",
      ),
    ).toBe(true);

    const projectedProcedures: BattleStoredSpellProcedureExecution["procedure"][] =
      [];
    const snapshots = characterProcedureBindingSnapshots(
      execution,
      (invocation) => {
        projectedProcedures.push(invocation.procedure);
        return spellExecutionFacts(invocation);
      },
    );

    expect(projectedProcedures).toEqual([]);
    expect(snapshots).toHaveLength(execution.procedureBindings.length - 1);
  });
});
