import {
  canSpendAction,
  canSpendBonusAction,
  canSpendUnarmedStrikeActionResource,
} from "@dnd/shared-algebras/action-economy-algebra";
import type { StandardActionKind } from "@dnd/shared/game-facts";
import { Match } from "effect";
import { characterProcedureBinding } from "../character-execution-queries.ts";
import type { UnitFeatureProcedureExecution } from "../character-execution-vocabulary.ts";
import type { BattleSubject } from "../battle-subjects.ts";
import type {
  BattleState,
  BattleTurnResources,
} from "../battle-state-execution.ts";
import { isPresentFindFamiliarCombatant } from "../spawned-companion-state.ts";
import { canSpendEscapeGrappleActionResource } from "./action-resource-kinds.ts";
import {
  combatantCanTakeActions,
  isLegendaryAttackSubject,
} from "./creature-state-execution.ts";

const ACTION_ELIGIBILITY_ISSUES = {
  unavailable:
    "The selected action is no longer available for the current actor.",
  familiarCannotAttack: "Find Familiar familiars can't attack.",
  heldWeaponActivationUnavailable:
    "Attack action feature is no longer available for the current actor.",
  bonusActionUnavailable:
    "Bonus Action is no longer available for the current actor.",
  magicActionUnavailable:
    "Magic action is no longer available for the current actor.",
  bonusActionSpellUnavailable:
    "Bonus Action spell is no longer available for the current actor.",
  unitFeatureUnavailable:
    "Unit feature is no longer available for the current actor.",
  wildShapeUnavailable: "Druid Wild Shape Bonus Action is no longer available.",
} as const;
type BattleSubjectActionEligibilityIssue =
  (typeof ACTION_ELIGIBILITY_ISSUES)[keyof typeof ACTION_ELIGIBILITY_ISSUES];
type ActionEligibilityFacts =
  | { readonly tag: "notApplicable" }
  | { readonly tag: "actorEligibilityOnly" }
  | { readonly tag: "unitFeatureActor" }
  | { readonly tag: "bonusAction" }
  | { readonly tag: "bonusActionSpell" }
  | { readonly tag: "wildShapeBonusAction" }
  | { readonly tag: "magicAction" }
  | { readonly tag: "familiarForbiddenActorEligibilityOnly" }
  | { readonly tag: "standardAction"; readonly action: StandardActionKind }
  | { readonly tag: "familiarForbiddenAttackAction" }
  | { readonly tag: "familiarForbiddenUnarmedStrike" }
  | { readonly tag: "escapeGrappleAction" }
  | { readonly tag: "heldWeaponActivation" };

const byTag = Match.discriminator("tag");

const BONUS_ACTION_UNIT_FEATURE_KINDS = new Set<
  UnitFeatureProcedureExecution["kind"]
>(["selfBonusActionHealing", "bardicInspirationGrant", "rogueSteadyAim"]);

export function battleSubjectBeginsBonusAction(
  state: BattleState,
  subject: BattleSubject,
): boolean {
  return Match.value(subject).pipe(
    byTag("action", () => false),
    byTag("monkFocusOption", () => true),
    byTag("monkFocusFlurryOfBlowsStrike", () => false),
    byTag("unitFeatureHeldWeaponActivation", () => false),
    byTag("companionAttack", () => false),
    byTag("actionSpell", () => false),
    byTag("bonusAction", () => true),
    byTag("bonusActionDashSpell", () => true),
    byTag("bonusActionSpell", () => true),
    byTag("bonusActionStandardAction", () => true),
    byTag("companionLifecycle", () => false),
    byTag("druidWildShape", () => true),
    byTag("spawnedCompanionSharedSenses", () => true),
    byTag("spawnedCompanionTouchSpellProxy", () => false),
    byTag("runtimeCommand", () => false),
    byTag("unitFeature", (unitFeatureSubject) => {
      const actor = state.combatants.get(unitFeatureSubject.actorId);
      if (actor?.origin.kind !== "character") return false;
      const binding = characterProcedureBinding(
        actor.origin.execution,
        unitFeatureSubject.procedureRef,
      );
      if (binding?.procedure.kind !== "unitFeature") return false;
      const execution = binding.procedure.execution;
      return execution.kind === "ongoingFeature"
        ? execution.activationTrigger === "bonusAction"
        : BONUS_ACTION_UNIT_FEATURE_KINDS.has(execution.kind);
    }),
    Match.exhaustive,
  );
}

export function battleSubjectActionEligibilityIssue(
  state: BattleState,
  subject: BattleSubject,
): BattleSubjectActionEligibilityIssue | null {
  const facts = actionEligibilityFacts(state, subject);
  if (facts.tag === "notApplicable") {
    return null;
  }
  const actorId = subject.actorId;
  if (!combatantCanTakeActions(state.combatants.get(actorId))) {
    return actorUnavailableIssue(facts);
  }
  if (
    isPresentFindFamiliarCombatant(state, actorId) &&
    familiarCannotUseActionFacts(facts)
  ) {
    return ACTION_ELIGIBILITY_ISSUES.familiarCannotAttack;
  }
  return actionResourceEligibilityIssue(
    state.currentTurnResources,
    facts,
    actorId,
  );
}

function actionEligibilityFacts(
  state: BattleState,
  subject: BattleSubject,
): ActionEligibilityFacts {
  return Match.value(subject).pipe(
    byTag("action", (actionSubject) =>
      actionSubjectEligibilityFacts(state, actionSubject),
    ),
    byTag("monkFocusOption", () => ({ tag: "actorEligibilityOnly" }) as const),
    byTag(
      "monkFocusFlurryOfBlowsStrike",
      () => ({ tag: "actorEligibilityOnly" }) as const,
    ),
    byTag(
      "unitFeatureHeldWeaponActivation",
      () => ({ tag: "heldWeaponActivation" }) as const,
    ),
    byTag(
      "companionAttack",
      () => ({ tag: "standardAction", action: "attack" }) as const,
    ),
    byTag("actionSpell", () => ({ tag: "magicAction" }) as const),
    byTag("bonusAction", () => ({ tag: "bonusAction" }) as const),
    byTag("bonusActionDashSpell", () => ({ tag: "bonusActionSpell" }) as const),
    byTag("bonusActionSpell", () => ({ tag: "bonusActionSpell" }) as const),
    byTag("bonusActionStandardAction", () => ({ tag: "bonusAction" }) as const),
    byTag("companionLifecycle", () => ({ tag: "notApplicable" }) as const),
    byTag("druidWildShape", () => ({ tag: "wildShapeBonusAction" }) as const),
    byTag(
      "spawnedCompanionSharedSenses",
      () => ({ tag: "notApplicable" }) as const,
    ),
    byTag(
      "spawnedCompanionTouchSpellProxy",
      () => ({ tag: "notApplicable" }) as const,
    ),
    byTag("runtimeCommand", () => ({ tag: "notApplicable" }) as const),
    byTag("unitFeature", () => ({ tag: "unitFeatureActor" }) as const),
    Match.exhaustive,
  );
}

function familiarCannotUseActionFacts(facts: ActionEligibilityFacts): boolean {
  return Match.value(facts).pipe(
    byTag("familiarForbiddenActorEligibilityOnly", () => true),
    byTag("familiarForbiddenAttackAction", () => true),
    byTag("familiarForbiddenUnarmedStrike", () => true),
    byTag("notApplicable", () => false),
    byTag("actorEligibilityOnly", () => false),
    byTag("unitFeatureActor", () => false),
    byTag("bonusAction", () => false),
    byTag("bonusActionSpell", () => false),
    byTag("wildShapeBonusAction", () => false),
    byTag("magicAction", () => false),
    byTag("standardAction", () => false),
    byTag("escapeGrappleAction", () => false),
    byTag("heldWeaponActivation", () => false),
    Match.exhaustive,
  );
}

function actionResourceEligibilityIssue(
  resources: BattleTurnResources,
  facts: Exclude<ActionEligibilityFacts, { readonly tag: "notApplicable" }>,
  actorId: BattleSubject["actorId"],
): BattleSubjectActionEligibilityIssue | null {
  return Match.value(facts).pipe(
    byTag("actorEligibilityOnly", () => null),
    byTag("unitFeatureActor", () => null),
    byTag("bonusAction", () =>
      canSpendBonusAction(resources)
        ? null
        : ACTION_ELIGIBILITY_ISSUES.bonusActionUnavailable,
    ),
    byTag("bonusActionSpell", () =>
      canSpendBonusAction(resources)
        ? null
        : ACTION_ELIGIBILITY_ISSUES.bonusActionSpellUnavailable,
    ),
    byTag("wildShapeBonusAction", () =>
      canSpendBonusAction(resources)
        ? null
        : ACTION_ELIGIBILITY_ISSUES.wildShapeUnavailable,
    ),
    byTag("magicAction", () =>
      canSpendAction(resources, "magic")
        ? null
        : ACTION_ELIGIBILITY_ISSUES.magicActionUnavailable,
    ),
    byTag("familiarForbiddenActorEligibilityOnly", () => null),
    byTag("standardAction", ({ action }) =>
      canSpendAction(resources, action)
        ? null
        : ACTION_ELIGIBILITY_ISSUES.unavailable,
    ),
    byTag("familiarForbiddenAttackAction", () =>
      canSpendAction(resources, "attack")
        ? null
        : ACTION_ELIGIBILITY_ISSUES.unavailable,
    ),
    byTag("familiarForbiddenUnarmedStrike", () =>
      canSpendUnarmedStrikeActionResource(resources)
        ? null
        : ACTION_ELIGIBILITY_ISSUES.unavailable,
    ),
    byTag("escapeGrappleAction", () =>
      canSpendEscapeGrappleActionResource(resources, actorId)
        ? null
        : ACTION_ELIGIBILITY_ISSUES.unavailable,
    ),
    byTag("heldWeaponActivation", () =>
      canSpendAction(resources, "attack")
        ? null
        : ACTION_ELIGIBILITY_ISSUES.heldWeaponActivationUnavailable,
    ),
    Match.exhaustive,
  );
}

function actorUnavailableIssue(
  facts: Exclude<ActionEligibilityFacts, { readonly tag: "notApplicable" }>,
): BattleSubjectActionEligibilityIssue {
  return Match.value(facts).pipe(
    byTag("actorEligibilityOnly", () => ACTION_ELIGIBILITY_ISSUES.unavailable),
    byTag(
      "unitFeatureActor",
      () => ACTION_ELIGIBILITY_ISSUES.unitFeatureUnavailable,
    ),
    byTag(
      "bonusAction",
      () => ACTION_ELIGIBILITY_ISSUES.bonusActionUnavailable,
    ),
    byTag(
      "bonusActionSpell",
      () => ACTION_ELIGIBILITY_ISSUES.bonusActionSpellUnavailable,
    ),
    byTag(
      "wildShapeBonusAction",
      () => ACTION_ELIGIBILITY_ISSUES.wildShapeUnavailable,
    ),
    byTag(
      "magicAction",
      () => ACTION_ELIGIBILITY_ISSUES.magicActionUnavailable,
    ),
    byTag(
      "familiarForbiddenActorEligibilityOnly",
      () => ACTION_ELIGIBILITY_ISSUES.unavailable,
    ),
    byTag("standardAction", () => ACTION_ELIGIBILITY_ISSUES.unavailable),
    byTag(
      "familiarForbiddenAttackAction",
      () => ACTION_ELIGIBILITY_ISSUES.unavailable,
    ),
    byTag(
      "familiarForbiddenUnarmedStrike",
      () => ACTION_ELIGIBILITY_ISSUES.unavailable,
    ),
    byTag("escapeGrappleAction", () => ACTION_ELIGIBILITY_ISSUES.unavailable),
    byTag(
      "heldWeaponActivation",
      () => ACTION_ELIGIBILITY_ISSUES.heldWeaponActivationUnavailable,
    ),
    Match.exhaustive,
  );
}

function actionSubjectEligibilityFacts(
  state: BattleState,
  subject: Extract<BattleSubject, { readonly tag: "action" }>,
): Exclude<ActionEligibilityFacts, { readonly tag: "notApplicable" }> {
  const standard = (action: StandardActionKind) =>
    ({ tag: "standardAction", action }) as const;
  const facts = Match.value(subject.action).pipe(
    Match.when(
      "attack",
      () =>
        ({
          tag: "familiarForbiddenAttackAction",
        }) as const,
    ),
    Match.when("dash", () => standard("dash")),
    Match.when("disengage", () => standard("disengage")),
    Match.when("dodge", () => standard("dodge")),
    Match.when("helpAttack", () => standard("help")),
    Match.when("hide", () => standard("hide")),
    Match.when(
      "multiattack",
      () =>
        ({
          tag: "familiarForbiddenAttackAction",
        }) as const,
    ),
    Match.when("ready", () => standard("ready")),
    Match.when("search", () => standard("search")),
    Match.when(
      "grapple",
      () => ({ tag: "familiarForbiddenUnarmedStrike" }) as const,
    ),
    Match.when(
      "shove",
      () => ({ tag: "familiarForbiddenUnarmedStrike" }) as const,
    ),
    Match.when(
      "escapeGrapple",
      () => ({ tag: "escapeGrappleAction" }) as const,
    ),
    Match.when("escapeSpellRestraint", () => standard("utilize")),
    Match.when(
      "shakeAwakeFromStagedCondition",
      () => ({ tag: "actorEligibilityOnly" }) as const,
    ),
    Match.when(
      "shakeAwakeFromAreaControl",
      () => ({ tag: "actorEligibilityOnly" }) as const,
    ),
    Match.exhaustive,
  );
  if (!isLegendaryAttackSubject(state, subject)) {
    return facts;
  }
  return familiarCannotUseActionFacts(facts)
    ? { tag: "familiarForbiddenActorEligibilityOnly" }
    : { tag: "actorEligibilityOnly" };
}
