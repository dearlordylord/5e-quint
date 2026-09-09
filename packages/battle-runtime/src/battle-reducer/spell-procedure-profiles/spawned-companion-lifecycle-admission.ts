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

type SpawnedCompanionMechanics = Extract<
  SpellMechanicsAdmissionSource["mechanics"],
  { readonly family: "spawned_creature" }
>;

function spawnedCompanionIssue(
  failedFact: SpawnedCompanionLifecycleFailedFact,
  mechanicsPath: SpawnedCompanionLifecycleIssue["mechanicsPath"],
  message: string,
): SpawnedCompanionLifecycleIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "spawnedCompanionLifecycle",
    failedFact,
    mechanicsPath,
    message,
  };
}

function spawnedCompanionIssueIf(
  supported: boolean,
  failedFact: SpawnedCompanionLifecycleFailedFact,
  mechanicsPath: SpawnedCompanionLifecycleIssue["mechanicsPath"],
  message: string,
): readonly SpawnedCompanionLifecycleIssue[] {
  return supported
    ? []
    : [spawnedCompanionIssue(failedFact, mechanicsPath, message)];
}

function spawnedCompanionRecognizableEnvelope(
  mechanics: SpawnedCompanionMechanics,
): boolean {
  if (mechanics.castingTime.kind !== "hours") return false;
  if (mechanics.range.kind !== "point") return false;
  if (
    !("materialCostGp" in mechanics.components) ||
    !("materialConsumed" in mechanics.components)
  ) {
    return false;
  }
  return [
    mechanics.level === 1,
    mechanics.castingTime.amount === 1,
    mechanics.castingTime.ritual,
    mechanics.range.feet === 10,
    mechanics.duration.kind === "instantaneous",
    mechanics.components.materialCostGp === 10,
    mechanics.components.materialConsumed === true,
  ].every(Boolean);
}

function spawnedCompanionCastingTimeSupported(
  mechanics: SpawnedCompanionMechanics,
): boolean {
  if (mechanics.castingTime.kind !== "hours") return false;
  return [
    mechanics.castingTime.amount === 1,
    mechanics.castingTime.ritual,
  ].every(Boolean);
}

function spawnedCompanionComponentsSupported(
  mechanics: SpawnedCompanionMechanics,
): boolean {
  return [
    mechanics.components.v === true,
    mechanics.components.s === true,
    typeof mechanics.components.m === "string",
  ].every(Boolean);
}

function spawnedCompanionControlSupported(
  mechanics: SpawnedCompanionMechanics,
): boolean {
  const control = mechanics.control;
  if (control === undefined) return false;
  return [
    control.initiative === "own_roll",
    control.defaultBehavior === "independent",
    control.oneAtATime === true,
    control.commandRangeFeet === 100,
    control.commandCost.kind === "no_action_required",
    spawnedCompanionTelepathySupported(control.telepathy),
  ].every(Boolean);
}

function spawnedCompanionTelepathySupported(
  telepathy: NonNullable<SpawnedCompanionMechanics["control"]>["telepathy"],
): boolean {
  return (
    telepathy !== undefined &&
    telepathy.rangeFeet === 100 &&
    telepathy.sharedSenses === "bonus_action"
  );
}

function spawnedCompanionLifecycleSupported(
  mechanics: SpawnedCompanionMechanics,
): boolean {
  const lifecycle = mechanics.companionLifecycle;
  if (lifecycle?.kind !== "bound_companion") return false;
  return [
    mechanics.dismissal.onZeroHp === "disappears",
    mechanics.dismissal.onSpellEnd === "persists",
    mechanics.dismissal.leavesBehind === "equipment",
    lifecycle.recast.existingCompanion === "adopt_new_eligible_form",
    lifecycle.recast.zeroHitPointDisappearance === "reappear",
    lifecycle.temporaryDismissal.cost === "magic_action",
    lifecycle.temporaryDismissal.destination === "pocket_dimension",
    lifecycle.temporaryDismissal.recall.cost === "magic_action",
    lifecycle.temporaryDismissal.recall.placement.kind ===
      "unoccupied_space_within_feet_of_caster",
    lifecycle.temporaryDismissal.recall.placement.maxDistanceFeet === 30,
    lifecycle.touchSpellDelivery.companionCost === "reaction",
    lifecycle.touchSpellDelivery.companionWithinFeetOfCaster === 100,
    lifecycle.touchSpellDelivery.spellRange === "touch",
    lifecycle.touchSpellDelivery.timing === "when_caster_casts_spell",
  ].every(Boolean);
}

type SpawnedCompanionRequiredFacts = Readonly<{
  eligibleForms: SpawnedCompanionFormEligibility;
  castingTimeHours: 1;
  initialRangeFeet: number;
  telepathyRangeFeet: number;
}>;

function spawnedCompanionRequiredFacts(
  mechanics: SpawnedCompanionMechanics,
  eligibleForms: SpawnedCompanionFormEligibility | null,
): SpawnedCompanionRequiredFacts | undefined {
  if (eligibleForms === null) return undefined;
  if (mechanics.castingTime.kind !== "hours") return undefined;
  if (mechanics.castingTime.amount !== 1) return undefined;
  if (mechanics.control === undefined) return undefined;
  if (mechanics.control.telepathy === undefined) return undefined;
  if (mechanics.range.kind !== "point") return undefined;
  if (typeof mechanics.range.feet !== "number") return undefined;
  return {
    eligibleForms,
    castingTimeHours: mechanics.castingTime.amount,
    initialRangeFeet: mechanics.range.feet,
    telepathyRangeFeet: mechanics.control.telepathy.rangeFeet,
  };
}

function spawnedCompanionMechanicsIssues(
  mechanics: SpawnedCompanionMechanics,
  eligibleForms: SpawnedCompanionFormEligibility | null,
): readonly SpawnedCompanionLifecycleIssue[] {
  return [
    ...spawnedCompanionIssueIf(
      mechanics.level === 1,
      "level",
      spellMechanicsHeaderPath("level"),
      "Spawned companion lifecycle requires a level-1 Spell Definition.",
    ),
    ...spawnedCompanionIssueIf(
      spawnedCompanionCastingTimeSupported(mechanics),
      "castingTime",
      spellMechanicsHeaderPath("castingTime"),
      "Spawned companion lifecycle requires its ritual-capable one-hour casting time.",
    ),
    ...spawnedCompanionIssueIf(
      mechanics.range.kind === "point" && mechanics.range.feet === 10,
      "range",
      spellMechanicsHeaderPath("range"),
      "Spawned companion lifecycle requires initial placement within 10 feet.",
    ),
    ...spawnedCompanionIssueIf(
      mechanics.duration.kind === "instantaneous",
      "duration",
      spellMechanicsHeaderPath("duration"),
      "Spawned companion lifecycle requires an instantaneous duration.",
    ),
    ...spawnedCompanionIssueIf(
      spawnedCompanionComponentsSupported(mechanics),
      "components",
      spellMechanicsHeaderPath("components"),
      "Spawned companion lifecycle requires its verbal, somatic, and material component signature.",
    ),
    ...spawnedCompanionIssueIf(
      "materialCostGp" in mechanics.components &&
        mechanics.components.materialCostGp === 10,
      "materialCost",
      spellMaterialComponentPath("cost"),
      "Spawned companion lifecycle has an unsupported material-cost signature.",
    ),
    ...spawnedCompanionIssueIf(
      "materialConsumed" in mechanics.components &&
        mechanics.components.materialConsumed === true,
      "materialConsumption",
      spellMaterialComponentPath("consumption"),
      "Spawned companion lifecycle has an unsupported material-consumption signature.",
    ),
    ...spawnedCompanionIssueIf(
      spawnedCompanionControlSupported(mechanics),
      "control",
      spellSpawnedCreatureControlPath(),
      "Spawned companion lifecycle has unsupported control facts.",
    ),
    ...spawnedCompanionIssueIf(
      spawnedCompanionLifecycleSupported(mechanics),
      "dismissalAndLifecycle",
      spellSpawnedCreatureDismissalPath(),
      "Spawned companion lifecycle has unsupported dismissal or retained-companion facts.",
    ),
    ...spawnedCompanionIssueIf(
      eligibleForms !== null,
      "creature",
      spellSpawnedCreaturePath(),
      "Spawned companion lifecycle requires the complete familiar-form catalog projection.",
    ),
  ];
}

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
    return spawnedCompanionRecognizableEnvelope(mechanics)
      ? {
          tag: "unsupported",
          issues: [
            spawnedCompanionIssue(
              "creature",
              spellSpawnedCreaturePath(),
              "Spawned companion lifecycle requires the complete familiar-form catalog projection.",
            ),
          ],
        }
      : { tag: "notRepresented" };
  }
  const eligibleForms = spawnedCompanionFormEligibilityForSpell({
    mechanics,
  });
  const issues = spawnedCompanionMechanicsIssues(mechanics, eligibleForms);

  const [firstIssue, ...remainingIssues] = issues;
  if (firstIssue !== undefined) {
    return {
      tag: "unsupported",
      issues: [firstIssue, ...remainingIssues],
    };
  }
  const requiredFacts = spawnedCompanionRequiredFacts(mechanics, eligibleForms);
  if (requiredFacts === undefined) {
    return { tag: "notRepresented" };
  }

  return {
    tag: "supported",
    admitted: {
      binding: "static",
      procedure: "spawnedCompanionLifecycle",
      facts: {
        eligibleForms: requiredFacts.eligibleForms,
        execution: {
          procedure: "spawnedCompanionLifecycle",
          casting: {
            kind: "ritualOrPreparedSlot",
            castingTimeMinutes: oneHourCastingTimeMinutes(
              requiredFacts.castingTimeHours,
            ),
            nonRitualSlotLevel: 1,
          },
          initialPlacement: {
            kind: "unoccupiedSpaceWithinRange",
            rangeFeet: movementFeet(requiredFacts.initialRangeFeet),
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
          telepathyRangeFeet: movementFeet(requiredFacts.telepathyRangeFeet),
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
