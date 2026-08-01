import {
  canSpendAction,
  canSpendUnarmedStrikeActionResource,
} from "@dnd/shared-algebras/action-economy-algebra";
import type { StandardActionKind } from "@dnd/shared/game-facts";
import { Match } from "effect";
import type { BattleSubject } from "../battle-subjects.ts";
import type {
  BattleState,
  BattleTurnResources,
} from "../battle-state-execution.ts";
import { isPresentFindFamiliarCombatant } from "../find-familiar-state.ts";
import { canSpendEscapeGrappleActionResource } from "./action-resource-kinds.ts";
import {
  combatantCanTakeActions,
  isLegendaryAttackSubject,
} from "./creature-state-execution.ts";

const ACTION_ELIGIBILITY_ISSUES = {
  unavailable: "Attack is no longer available for the current actor.",
  familiarCannotAttack: "Find Familiar familiars can't attack.",
  heldWeaponActivationUnavailable:
    "Attack action feature is no longer available for the current actor.",
} as const;
type BattleSubjectActionEligibilityIssue =
  (typeof ACTION_ELIGIBILITY_ISSUES)[keyof typeof ACTION_ELIGIBILITY_ISSUES];
type ActionEligibilityFacts =
  | { readonly tag: "notApplicable" }
  | { readonly tag: "actorEligibilityOnly" }
  | { readonly tag: "familiarForbiddenActorEligibilityOnly" }
  | { readonly tag: "standardAction"; readonly action: StandardActionKind }
  | { readonly tag: "familiarForbiddenAttackAction" }
  | { readonly tag: "familiarForbiddenUnarmedStrike" }
  | { readonly tag: "escapeGrappleAction" }
  | { readonly tag: "heldWeaponActivation" };

const byTag = Match.discriminator("tag");

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
    return ACTION_ELIGIBILITY_ISSUES.unavailable;
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
      "pactOfTheChainFamiliarAttack",
      () => ({ tag: "standardAction", action: "attack" }) as const,
    ),
    byTag("actionSpell", () => ({ tag: "notApplicable" }) as const),
    byTag("bonusAction", () => ({ tag: "notApplicable" }) as const),
    byTag("bonusActionDashSpell", () => ({ tag: "notApplicable" }) as const),
    byTag("bonusActionSpell", () => ({ tag: "notApplicable" }) as const),
    byTag(
      "bonusActionStandardAction",
      () => ({ tag: "notApplicable" }) as const,
    ),
    byTag("companionLifecycle", () => ({ tag: "notApplicable" }) as const),
    byTag("creatureAttack", () => ({ tag: "notApplicable" }) as const),
    byTag("druidWildShape", () => ({ tag: "notApplicable" }) as const),
    byTag(
      "findFamiliarSharedSenses",
      () => ({ tag: "notApplicable" }) as const,
    ),
    byTag("findFamiliarTouchSpell", () => ({ tag: "notApplicable" }) as const),
    byTag("runtimeCommand", () => ({ tag: "notApplicable" }) as const),
    byTag("unitFeature", () => ({ tag: "notApplicable" }) as const),
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
      "shakeAwakeFromSleep",
      () => ({ tag: "actorEligibilityOnly" }) as const,
    ),
    Match.when(
      "shakeAwakeFromHypnoticPattern",
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
