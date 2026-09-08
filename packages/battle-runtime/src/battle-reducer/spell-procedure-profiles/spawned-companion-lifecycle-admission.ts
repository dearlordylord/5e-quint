import { movementFeet } from "@dnd/shared/types";
import {
  spawnedCompanionFormEligibilityForSpell,
  type SpawnedCompanionFormEligibility,
} from "@dnd/surface/surface/find-familiar-forms";
import {
  spellMaterialComponentPath,
  spellMechanicsHeaderPath,
  spellSpawnedCreatureControlPath,
  spellSpawnedCreatureDismissalPath,
  spellSpawnedCreaturePath,
} from "@dnd/surface/surface/spell-mechanics-path";

import type { SpawnedCompanionLifecycleExecutionFacts } from "../../character-execution.ts";
import {
  type SpellMechanicsAdmissionSource,
  type SpellProcedureAdmissionIssue,
  type StaticSpellMechanicsAdmissionDeclaration,
  type StaticSpellMechanicsInspection,
} from "./spell-mechanics-admission.ts";

export type SpawnedCompanionLifecycleMechanicsFacts = {
  readonly execution: SpawnedCompanionLifecycleExecutionFacts;
  readonly eligibleForms: SpawnedCompanionFormEligibility;
};

export const SPAWNED_COMPANION_LIFECYCLE_FAILED_FACTS = [
  "level",
  "castingTime",
  "range",
  "duration",
  "materialCost",
  "materialConsumption",
  "components",
  "control",
  "dismissalAndLifecycle",
  "creature",
] as const;
type SpawnedCompanionLifecycleFailedFact =
  (typeof SPAWNED_COMPANION_LIFECYCLE_FAILED_FACTS)[number];
export type SpawnedCompanionLifecycleIssue = SpellProcedureAdmissionIssue<
  "spawnedCompanionLifecycle",
  SpawnedCompanionLifecycleFailedFact
>;

export function admitSpawnedCompanionLifecycleMechanics(
  source: SpellMechanicsAdmissionSource,
): StaticSpellMechanicsInspection<
  "spawnedCompanionLifecycle",
  SpawnedCompanionLifecycleMechanicsFacts,
  SpawnedCompanionLifecycleIssue
> {
  const mechanics = source.mechanics;
  if (mechanics.family !== "spawned_creature") {
    return { tag: "notRepresented" };
  }
  if (mechanics.creature.kind !== "familiar_form_catalog") {
    const recognizableFamiliarEnvelope =
      mechanics.level === 1 &&
      mechanics.castingTime.kind === "hours" &&
      mechanics.castingTime.amount === 1 &&
      mechanics.castingTime.ritual &&
      mechanics.range.kind === "point" &&
      mechanics.range.feet === 10 &&
      mechanics.duration.kind === "instantaneous" &&
      "materialCostGp" in mechanics.components &&
      mechanics.components.materialCostGp === 10 &&
      "materialConsumed" in mechanics.components &&
      mechanics.components.materialConsumed === true;
    return recognizableFamiliarEnvelope
      ? {
          tag: "unsupported",
          issues: [
            {
              tag: "spellProcedureAdmissionIssue",
              procedure: "spawnedCompanionLifecycle",
              failedFact: "creature",
              mechanicsPath: spellSpawnedCreaturePath(),
              message:
                "Spawned companion lifecycle requires the complete familiar-form catalog projection.",
            },
          ],
        }
      : { tag: "notRepresented" };
  }

  const issues: SpawnedCompanionLifecycleIssue[] = [];
  const issue = (
    failedFact: SpawnedCompanionLifecycleFailedFact,
    mechanicsPath: SpawnedCompanionLifecycleIssue["mechanicsPath"],
    message: string,
  ): void => {
    issues.push({
      tag: "spellProcedureAdmissionIssue",
      procedure: "spawnedCompanionLifecycle",
      failedFact,
      mechanicsPath,
      message,
    });
  };

  if (mechanics.level !== 1) {
    issue(
      "level",
      spellMechanicsHeaderPath("level"),
      "Spawned companion lifecycle requires a level-1 Spell Definition.",
    );
  }
  if (
    mechanics.castingTime.kind !== "hours" ||
    mechanics.castingTime.amount !== 1 ||
    !mechanics.castingTime.ritual
  ) {
    issue(
      "castingTime",
      spellMechanicsHeaderPath("castingTime"),
      "Spawned companion lifecycle requires its ritual-capable one-hour casting time.",
    );
  }
  if (mechanics.range.kind !== "point" || mechanics.range.feet !== 10) {
    issue(
      "range",
      spellMechanicsHeaderPath("range"),
      "Spawned companion lifecycle requires initial placement within 10 feet.",
    );
  }
  if (mechanics.duration.kind !== "instantaneous") {
    issue(
      "duration",
      spellMechanicsHeaderPath("duration"),
      "Spawned companion lifecycle requires an instantaneous duration.",
    );
  }
  if (
    mechanics.components.v !== true ||
    mechanics.components.s !== true ||
    typeof mechanics.components.m !== "string"
  ) {
    issue(
      "components",
      spellMechanicsHeaderPath("components"),
      "Spawned companion lifecycle requires its verbal, somatic, and material component signature.",
    );
  }
  if (
    !("materialCostGp" in mechanics.components) ||
    mechanics.components.materialCostGp !== 10
  ) {
    issue(
      "materialCost",
      spellMaterialComponentPath("cost"),
      "Spawned companion lifecycle has an unsupported material-cost signature.",
    );
  }
  if (
    !("materialConsumed" in mechanics.components) ||
    mechanics.components.materialConsumed !== true
  ) {
    issue(
      "materialConsumption",
      spellMaterialComponentPath("consumption"),
      "Spawned companion lifecycle has an unsupported material-consumption signature.",
    );
  }
  if (
    mechanics.control === undefined ||
    mechanics.control.initiative !== "own_roll" ||
    mechanics.control.defaultBehavior !== "independent" ||
    mechanics.control.oneAtATime !== true ||
    mechanics.control.commandRangeFeet !== 100 ||
    mechanics.control.commandCost.kind !== "no_action_required" ||
    mechanics.control.telepathy?.rangeFeet !== 100 ||
    mechanics.control.telepathy?.sharedSenses !== "bonus_action"
  ) {
    issue(
      "control",
      spellSpawnedCreatureControlPath(),
      "Spawned companion lifecycle has unsupported control facts.",
    );
  }
  if (
    mechanics.dismissal.onZeroHp !== "disappears" ||
    mechanics.dismissal.onSpellEnd !== "persists" ||
    mechanics.dismissal.leavesBehind !== "equipment" ||
    mechanics.companionLifecycle?.kind !== "bound_companion" ||
    mechanics.companionLifecycle.recast.existingCompanion !==
      "adopt_new_eligible_form" ||
    mechanics.companionLifecycle.recast.zeroHitPointDisappearance !==
      "reappear" ||
    mechanics.companionLifecycle.temporaryDismissal.cost !== "magic_action" ||
    mechanics.companionLifecycle.temporaryDismissal.destination !==
      "pocket_dimension" ||
    mechanics.companionLifecycle.temporaryDismissal.recall.cost !==
      "magic_action" ||
    mechanics.companionLifecycle.temporaryDismissal.recall.placement.kind !==
      "unoccupied_space_within_feet_of_caster" ||
    mechanics.companionLifecycle.temporaryDismissal.recall.placement
      .maxDistanceFeet !== 30 ||
    mechanics.companionLifecycle.touchSpellDelivery.companionCost !==
      "reaction" ||
    mechanics.companionLifecycle.touchSpellDelivery
      .companionWithinFeetOfCaster !== 100 ||
    mechanics.companionLifecycle.touchSpellDelivery.spellRange !== "touch" ||
    mechanics.companionLifecycle.touchSpellDelivery.timing !==
      "when_caster_casts_spell"
  ) {
    issue(
      "dismissalAndLifecycle",
      spellSpawnedCreatureDismissalPath(),
      "Spawned companion lifecycle has unsupported dismissal or retained-companion facts.",
    );
  }

  const eligibleForms = spawnedCompanionFormEligibilityForSpell({
    mechanics,
  });
  if (eligibleForms === null) {
    issue(
      "creature",
      spellSpawnedCreaturePath(),
      "Spawned companion lifecycle requires the complete familiar-form catalog projection.",
    );
  }

  const [firstIssue, ...remainingIssues] = issues;
  if (firstIssue !== undefined) {
    return {
      tag: "unsupported",
      issues: [firstIssue, ...remainingIssues],
    };
  }
  if (
    eligibleForms === null ||
    mechanics.castingTime.kind !== "hours" ||
    mechanics.castingTime.amount !== 1 ||
    mechanics.control === undefined ||
    mechanics.control.telepathy === undefined ||
    mechanics.range.kind !== "point" ||
    typeof mechanics.range.feet !== "number"
  ) {
    return { tag: "notRepresented" };
  }

  return {
    tag: "supported",
    admitted: {
      binding: "static",
      procedure: "spawnedCompanionLifecycle",
      facts: {
        eligibleForms,
        execution: {
          procedure: "spawnedCompanionLifecycle",
          casting: {
            kind: "ritualOrPreparedSlot",
            castingTimeMinutes: oneHourCastingTimeMinutes(
              mechanics.castingTime.amount,
            ),
            nonRitualSlotLevel: 1,
          },
          initialPlacement: {
            kind: "unoccupiedSpaceWithinRange",
            rangeFeet: movementFeet(mechanics.range.feet),
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
          telepathyRangeFeet: movementFeet(
            mechanics.control.telepathy.rangeFeet,
          ),
          sharedSensesActionCost: "bonusAction",
          touchSpellProxy: {
            requiredSpellRange: "touch",
            companionRangeFeet: movementFeet(100),
            companionActionCost: "reaction",
            timing: "cast",
          },
        },
      },
      evidence: {
        consumed: [
          spellMechanicsHeaderPath("level"),
          spellMechanicsHeaderPath("range"),
          spellMechanicsHeaderPath("components"),
          spellMechanicsHeaderPath("duration"),
          spellMechanicsHeaderPath("castingTime"),
          spellMechanicsHeaderPath("family"),
          spellMaterialComponentPath("cost"),
          spellMaterialComponentPath("consumption"),
          spellSpawnedCreaturePath(),
          spellSpawnedCreatureControlPath(),
          spellSpawnedCreatureDismissalPath(),
        ],
        unowned: [spellMechanicsHeaderPath("school")],
      },
    },
  };
}

function oneHourCastingTimeMinutes(hours: 1): 60 {
  // The exact one-hour admission guard immediately above proves this fixed
  // conversion; the execution contract intentionally carries minutes.
  return (hours * 60) as 60;
}

export const spawnedCompanionLifecycleAdmission = {
  admitMechanics: admitSpawnedCompanionLifecycleMechanics,
} satisfies StaticSpellMechanicsAdmissionDeclaration<
  "spawnedCompanionLifecycle",
  SpawnedCompanionLifecycleMechanicsFacts,
  SpawnedCompanionLifecycleIssue
>;
