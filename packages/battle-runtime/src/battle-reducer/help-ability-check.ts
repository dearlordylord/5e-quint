// KERNEL-COVERAGE: runtime-owner BATTLE.HELP.ABILITY_CHECK_ASSIST
//
// SRD 5.2.1 Help [Action], "Assist an Ability Check": "Choose one of your
// skill or tool proficiencies and one ally who is near enough for you to
// assist verbally or physically when they make an ability check. That ally
// has Advantage on the next ability check they make with the chosen skill or
// tool. This benefit expires if the ally doesn't use it before the start of
// your next turn. The GM has final say on whether your assistance is
// possible."
//
// The ally is a table decision, and so is whether the helper can assist it;
// the fill carries both. Battle Runtime has no tool proficiency facts and no
// tool ability checks, so the choice is among skill proficiencies.

import type {
  BattleActDiscoveryCandidate,
  BattleFill,
  BattleCreatureState,
  BattleHelpAbilityCheck,
  BattleHelpAbilityCheckDecisionHole,
  BattleOrdinaryNeedsHolesResult,
  BattleResolutionInputForSubject,
  BattleState,
  BattleTerminalResolutionResult,
} from "../battle-state-execution.ts";
import type { BattleSubject } from "../battle-subjects.ts";
import type { CombatantId } from "../identity.ts";
import {
  canSpendAction,
  spendAction,
} from "@dnd/shared-algebras/action-economy-algebra";
import type { Skill } from "@dnd/surface/surface/types";
import { isReadonlyArrayNonEmpty } from "effect/Array";
import * as Result from "effect/Result";
import { snapshotBattle } from "./battle-snapshot.ts";
import {
  HELP_ABILITY_CHECK_HOLE_ID,
  HELP_ABILITY_CHECK_HOLE_INSTANCE,
} from "./battle-runtime-protocol.ts";
import { combatantCanTakeActions } from "./creature-state-execution.ts";
import { combatantSkillProficiencies } from "./druid-wild-shape.ts";
import { helpParticipantChoices } from "./help-attack.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { invalidResult } from "./result-helpers.ts";

/**
 * The Help (Assist an Ability Check) decision hole, or `undefined` when the
 * helper has no skill proficiency or no other live combatant to assist.
 */
function helpAbilityCheckHole(
  state: BattleState,
  helper: BattleCreatureState,
): BattleHelpAbilityCheckDecisionHole | undefined {
  const helperId = helper.combatantId;
  const allyChoices = helpParticipantChoices(state, helperId);
  const skillChoices = combatantSkillProficiencies(helper);
  if (!isReadonlyArrayNonEmpty(allyChoices)) return undefined;
  if (!isReadonlyArrayNonEmpty(skillChoices)) return undefined;
  return {
    kind: "helpAbilityCheckDecision",
    holeInstanceKey: HELP_ABILITY_CHECK_HOLE_INSTANCE,
    holeId: HELP_ABILITY_CHECK_HOLE_ID,
    label: "Help ally with an ability check",
    helperId,
    allyChoices,
    skillChoices,
  };
}

/** The Help (Assist an Ability Check) act, when the current actor can take it. */
export function helpAbilityCheckActCandidates(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
  const helper = state.combatants.get(actorId);
  if (helper === undefined) return [];
  const hole = helpAbilityCheckHole(state, helper);
  return hole !== undefined &&
    combatantCanTakeActions(helper) &&
    canSpendAction(state.currentTurnResources, "help")
    ? [
        {
          subject: { tag: "action", actorId, action: "helpAbilityCheck" },
          initialHoles: [hole],
        },
      ]
    : [];
}

type HelpAbilityCheckResolutionInput = BattleResolutionInputForSubject<
  Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "helpAbilityCheck" }
  >
>;

/**
 * Resolves Help (Assist an Ability Check): spends the Action and records the
 * benefit for the chosen ally and skill until the start of the helper's next
 * turn.
 */
export function resolveHelpAbilityCheck(
  input: HelpAbilityCheckResolutionInput,
):
  | BattleTerminalResolutionResult
  | BattleOrdinaryNeedsHolesResult<
      readonly [BattleHelpAbilityCheckDecisionHole],
      HelpAbilityCheckResolutionInput["subject"]
    > {
  const helperId = input.subject.actorId;
  const helper = input.state.combatants.get(helperId);
  if (helper === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "The helper is no longer in battle.",
    );
  }
  const hole = helpAbilityCheckHole(input.state, helper);
  if (hole === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Help needs a skill proficiency and another creature to assist.",
    );
  }
  const [decision, ...extraFills] = input.fills;
  if (decision === undefined) {
    return needsHolesResult(input.state, input.subject, [hole]);
  }
  const accepted = acceptedHelpAbilityCheckDecision(hole, decision, extraFills);
  if (Result.isFailure(accepted)) {
    return invalidResult(input.state, "invalidFill", accepted.failure);
  }
  const spent = spendAction(input.state.currentTurnResources, "help");
  /* v8 ignore start -- @preserve -- Defensive internal guard: dispatcher standard-action resource admission rejects an exhausted Action before routing Help here. */
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Help is no longer available.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const nextState: BattleState = {
    ...input.state,
    currentTurnResources: spent.success,
    helpAbilityChecks: [
      ...input.state.helpAbilityChecks,
      {
        helperId,
        allyId: accepted.success.allyId,
        skill: accepted.success.skill,
      },
    ],
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

type HelpAbilityCheckDecisionFill = Extract<
  BattleFill,
  { readonly kind: "helpAbilityCheckDecision" }
>;

/** The admitted decision, or why the fills don't answer the hole. */
function acceptedHelpAbilityCheckDecision(
  hole: BattleHelpAbilityCheckDecisionHole,
  decision: BattleFill,
  extraFills: readonly BattleFill[],
): Result.Result<HelpAbilityCheckDecisionFill, string> {
  if (
    extraFills.length > 0 ||
    decision.kind !== "helpAbilityCheckDecision" ||
    decision.holeId !== HELP_ABILITY_CHECK_HOLE_ID
  ) {
    return Result.fail("Help needs one ally and skill decision.");
  }
  if (
    !hole.allyChoices.includes(decision.allyId) ||
    !hole.skillChoices.includes(decision.skill)
  ) {
    return Result.fail(
      "Help needs another live creature and one of the helper's skill proficiencies.",
    );
  }
  return decision.allyCanBeAssisted
    ? Result.succeed(decision)
    : Result.fail("Help needs an ally near enough for the helper to assist.");
}

/** Whether a Help benefit gives `allyId` Advantage on a check with `skill`. */
export function helpAbilityCheckGrantsAdvantage(
  state: BattleState,
  allyId: CombatantId,
  skill: Skill,
): boolean {
  return state.helpAbilityChecks.some((help) =>
    helpAbilityCheckApplies(help, allyId, skill),
  );
}

/**
 * Uses up every Help benefit for `allyId`'s next ability check with `skill`.
 * Each benefit applies to that next check, so a second helper's benefit is
 * spent by the same check rather than carried to a later one.
 */
export function consumeHelpAbilityChecks(
  state: BattleState,
  allyId: CombatantId,
  skill: Skill,
): BattleState {
  if (!helpAbilityCheckGrantsAdvantage(state, allyId, skill)) return state;
  return {
    ...state,
    helpAbilityChecks: state.helpAbilityChecks.filter(
      (help) => !helpAbilityCheckApplies(help, allyId, skill),
    ),
  };
}

function helpAbilityCheckApplies(
  help: BattleHelpAbilityCheck,
  allyId: CombatantId,
  skill: Skill,
): boolean {
  return help.allyId === allyId && help.skill === skill;
}
