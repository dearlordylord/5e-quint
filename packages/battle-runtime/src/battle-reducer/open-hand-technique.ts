// Open Hand Technique Flurry of Blows hit riders.
// RAW-COVERAGE: runtime-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.open-hand-technique

import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import { difficultyClass } from "@dnd/shared/types";
import type { UnitRecord } from "@dnd/surface/surface/types";
import { Match } from "effect";

import type {
  BattleFill,
  BattleHole,
  BattleShovePushDisposition,
  BattleShovePushOutcome,
  BattleState,
  BattleUnitFeatureDecisionHole,
  BattleUnitFeatureSavingThrowOutcomeHole,
} from "../battle-reducer.ts";
import type { BattleActiveEffect } from "../active-effect/types.ts";
import type { MonkFocusFlurryOfBlowsStrikeSubject } from "../battle-subjects.ts";
import type { CombatantId } from "../identity.ts";
import type {
  BattleOpenHandTechniqueSupportProfile,
  BattleUnitSupportProfile,
} from "../unit-feature-support.ts";

import { battleCreatureStateWithKnockOutPreservedConditions } from "./creature-state.ts";
import { isMonkFocusFlurryOfBlowsActionResource } from "./monk-focus.ts";
import { combatantProficiencyBonus } from "./movement-speed.ts";
import { scoreModifier } from "./domain-helpers.ts";
import {
  OPEN_HAND_TECHNIQUE_DECISION_CHOICES,
  OPEN_HAND_TECHNIQUE_DECISION_HOLE_ID,
  OPEN_HAND_TECHNIQUE_DECISION_HOLE_INSTANCE,
  OPEN_HAND_TECHNIQUE_SAVE_HOLE_ID,
  OPEN_HAND_TECHNIQUE_SAVE_HOLE_INSTANCE,
  type OpenHandTechniqueDecisionChoice,
} from "./domain-constants.ts";
import {
  savingThrowFlatBonusProjections,
  savingThrowRollModeProjections,
} from "./spells-damage-fills.ts";
import { extendSavingThrowOngoingFeatures } from "./attack-roll.ts";

type OpenHandTechniqueSavingThrowChoice = Extract<
  OpenHandTechniqueDecisionChoice,
  "pushAwayOnFailedSave" | "applyConditionOnFailedSave"
>;

type OpenHandTechniqueFlurryHit = {
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
  readonly subject: MonkFocusFlurryOfBlowsStrikeSubject;
  readonly unitId: UnitRecord["id"];
  readonly profile: BattleOpenHandTechniqueSupportProfile;
};

export type OpenHandTechniqueAfterHitResult =
  | {
      readonly tag: "ok";
      readonly state: BattleState;
      readonly shovePushes: readonly BattleShovePushOutcome[];
    }
  | { readonly tag: "needsHoles"; readonly holes: readonly BattleHole[] }
  | { readonly tag: "invalid"; readonly message: string };

export function openHandTechniqueDecisionHoleForFlurryHit(
  state: BattleState,
  subject: unknown,
  actorId: CombatantId,
  targetId: CombatantId,
): BattleUnitFeatureDecisionHole | null {
  const hit = openHandTechniqueFlurryHit(state, subject, actorId, targetId);
  if (hit === null) return null;
  return {
    kind: "unitFeatureDecision",
    holeId: OPEN_HAND_TECHNIQUE_DECISION_HOLE_ID,
    holeInstanceKey: OPEN_HAND_TECHNIQUE_DECISION_HOLE_INSTANCE,
    label: "Open Hand Technique",
    unitFeature: {
      unitId: hit.unitId,
      label: "Open Hand Technique",
    },
    choices: OPEN_HAND_TECHNIQUE_DECISION_CHOICES,
  };
}

export function resolveOpenHandTechniqueAfterHit(input: {
  readonly state: BattleState;
  readonly subject: unknown;
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
  readonly decision:
    | Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>
    | undefined;
  readonly savingThrow:
    | Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>
    | undefined;
}): OpenHandTechniqueAfterHitResult {
  const hit = openHandTechniqueFlurryHit(
    input.state,
    input.subject,
    input.actorId,
    input.targetId,
  );
  if (hit === null) {
    return input.decision === undefined && input.savingThrow === undefined
      ? { tag: "ok", state: input.state, shovePushes: [] }
      : {
          tag: "invalid",
          message:
            "Open Hand Technique is only valid for an eligible Flurry of Blows hit.",
        };
  }
  if (input.decision === undefined) {
    const hole = openHandTechniqueDecisionHoleForFlurryHit(
      input.state,
      input.subject,
      input.actorId,
      input.targetId,
    );
    return hole === null
      ? {
          tag: "invalid",
          message:
            "Open Hand Technique decision requires an eligible Flurry of Blows hit.",
        }
      : { tag: "needsHoles", holes: [hole] };
  }
  if (input.decision.holeId !== OPEN_HAND_TECHNIQUE_DECISION_HOLE_ID) {
    return {
      tag: "invalid",
      message: "Open Hand Technique decision uses the wrong hole.",
    };
  }
  if (!isOpenHandTechniqueChoice(input.decision.value)) {
    return {
      tag: "invalid",
      message:
        "Open Hand Technique decision must choose a supported effect or decline.",
    };
  }
  return Match.value(input.decision.value).pipe(
    Match.when("decline", () => {
      if (input.savingThrow !== undefined) {
        return {
          tag: "invalid" as const,
          message:
            "Open Hand Technique Saving Throw is not valid when the rider is declined.",
        };
      }
      return { tag: "ok" as const, state: input.state, shovePushes: [] };
    }),
    Match.when("denyOpportunityAttacks", () => {
      if (input.savingThrow !== undefined) {
        return {
          tag: "invalid" as const,
          message:
            "Open Hand Technique Opportunity Attack denial does not use a Saving Throw outcome.",
        };
      }
      return {
        tag: "ok" as const,
        state: applyOpenHandTechniqueOpportunityAttackDenial(input.state, hit),
        shovePushes: [],
      };
    }),
    Match.when("pushAwayOnFailedSave", () =>
      resolveOpenHandTechniqueSaveChoice(input, hit, "pushAwayOnFailedSave"),
    ),
    Match.when("applyConditionOnFailedSave", () =>
      resolveOpenHandTechniqueSaveChoice(
        input,
        hit,
        "applyConditionOnFailedSave",
      ),
    ),
    Match.exhaustive,
  );
}

function resolveOpenHandTechniqueSaveChoice(
  input: {
    readonly state: BattleState;
    readonly savingThrow:
      | Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>
      | undefined;
  },
  hit: OpenHandTechniqueFlurryHit,
  choice: OpenHandTechniqueSavingThrowChoice,
): OpenHandTechniqueAfterHitResult {
  if (input.savingThrow === undefined) {
    return {
      tag: "needsHoles",
      holes: [openHandTechniqueSavingThrowHole(input.state, hit, choice)],
    };
  }
  if (input.savingThrow.holeId !== OPEN_HAND_TECHNIQUE_SAVE_HOLE_ID) {
    return {
      tag: "invalid",
      message: "Open Hand Technique Saving Throw uses the wrong hole.",
    };
  }
  const outcomes = input.savingThrow.value.outcomes;
  if (outcomes.length !== 1 || outcomes[0]?.targetId !== hit.targetId) {
    return {
      tag: "invalid",
      message:
        "Open Hand Technique Saving Throw must target the attacked creature.",
    };
  }
  const savingThrowState = extendSavingThrowOngoingFeatures(
    input.state,
    hit.actorId,
    [hit.targetId],
  );
  const push = openHandTechniquePush(input.savingThrow);
  if (choice !== "pushAwayOnFailedSave" && push !== undefined) {
    return {
      tag: "invalid",
      message:
        "Open Hand Technique Push disposition is only valid for failed Push saves.",
    };
  }
  if (outcomes[0].succeeded) {
    if (push !== undefined) {
      return {
        tag: "invalid",
        message:
          "Open Hand Technique Push disposition is only valid after a failed save.",
      };
    }
    return { tag: "ok", state: savingThrowState, shovePushes: [] };
  }
  return choice === "pushAwayOnFailedSave"
    ? applyOpenHandTechniquePushAway(savingThrowState, hit, push)
    : applyOpenHandTechniqueApplyProne(savingThrowState, hit);
}

function openHandTechniqueSavingThrowHole(
  state: BattleState,
  hit: OpenHandTechniqueFlurryHit,
  choice: OpenHandTechniqueSavingThrowChoice,
): BattleUnitFeatureSavingThrowOutcomeHole {
  const ability =
    choice === "pushAwayOnFailedSave"
      ? hit.profile.technique.effects.pushAwayOnFailedSave.save.ability
      : hit.profile.technique.effects.applyConditionOnFailedSave.save.ability;
  const actor = state.combatants.get(hit.actorId);
  if (actor === undefined) {
    throw new Error("Open Hand Technique save hole requires an actor.");
  }
  const wisdomModifier =
    actor.origin.kind === "character"
      ? scoreModifier(actor.origin.d20Statistics.abilityScores.wis)
      : 0;
  return {
    kind: "savingThrowOutcome",
    holeId: OPEN_HAND_TECHNIQUE_SAVE_HOLE_ID,
    holeInstanceKey: OPEN_HAND_TECHNIQUE_SAVE_HOLE_INSTANCE,
    label: `Open Hand Technique ${choice === "pushAwayOnFailedSave" ? "Strength" : "Dexterity"} Saving Throw`,
    unitFeature: {
      unitId: hit.unitId,
      label: "Open Hand Technique",
    },
    ability,
    dc: {
      kind: "fixed",
      dc: difficultyClass(
        hit.profile.technique.effectSaveDc.base +
          wisdomModifier +
          combatantProficiencyBonus(actor),
      ),
    },
    targetIds: [hit.targetId],
    targetRollModes: savingThrowRollModeProjections(state, ability).filter(
      (projection) => projection.targetId === hit.targetId,
    ),
    targetFlatBonuses: savingThrowFlatBonusProjections(state, ability).filter(
      (projection) => projection.targetId === hit.targetId,
    ),
  };
}

function applyOpenHandTechniqueOpportunityAttackDenial(
  state: BattleState,
  hit: OpenHandTechniqueFlurryHit,
): BattleState {
  const target = state.combatants.get(hit.targetId);
  if (target === undefined) return state;
  const effect: BattleActiveEffect = {
    kind: "opportunityAttackDenied",
    sourceUnitId: hit.unitId,
    sourceCombatantId: hit.actorId,
    expiresAt: { kind: "startOfTurn", combatantId: hit.targetId },
  };
  return {
    ...state,
    combatants: new Map(state.combatants).set(hit.targetId, {
      ...target,
      activeEffects: [
        ...target.activeEffects.filter(
          (candidate) =>
            !(
              candidate.kind === "opportunityAttackDenied" &&
              "sourceUnitId" in candidate &&
              candidate.sourceUnitId === hit.unitId &&
              candidate.sourceCombatantId === hit.actorId
            ),
        ),
        effect,
      ],
    }),
  };
}

function applyOpenHandTechniquePushAway(
  state: BattleState,
  hit: OpenHandTechniqueFlurryHit,
  push: BattleShovePushOutcome | undefined,
): OpenHandTechniqueAfterHitResult {
  const distanceFeet =
    hit.profile.technique.effects.pushAwayOnFailedSave.distanceFeet;
  if (push === undefined) {
    return {
      tag: "invalid",
      message:
        "Open Hand Technique Push failed save requires caller-supplied push disposition.",
    };
  }
  if (push.targetId !== hit.targetId) {
    return {
      tag: "invalid",
      message:
        "Open Hand Technique Push disposition must target the attacked creature.",
    };
  }
  const validation = validateOpenHandTechniquePushDisposition(
    push.disposition,
    distanceFeet,
  );
  if (validation !== null) {
    return { tag: "invalid", message: validation };
  }
  return { tag: "ok", state, shovePushes: [push] };
}

function applyOpenHandTechniqueApplyProne(
  state: BattleState,
  hit: OpenHandTechniqueFlurryHit,
): OpenHandTechniqueAfterHitResult {
  const target = state.combatants.get(hit.targetId);
  if (target === undefined) {
    return {
      tag: "invalid",
      message: "Open Hand Technique Topple target is no longer in this battle.",
    };
  }
  return {
    tag: "ok",
    state: {
      ...state,
      combatants: new Map(state.combatants).set(hit.targetId, {
        ...battleCreatureStateWithKnockOutPreservedConditions(
          target,
          applyCondition(
            target.conditions,
            hit.profile.technique.effects.applyConditionOnFailedSave.condition,
          ),
        ),
      }),
    },
    shovePushes: [],
  };
}

function validateOpenHandTechniquePushDisposition(
  disposition: BattleShovePushDisposition,
  maximumDistanceFeet: BattleShovePushDisposition["distanceFeet"],
): string | null {
  if (disposition.distanceFeet > maximumDistanceFeet) {
    return "Open Hand Technique Push disposition must not exceed the feature's 15-foot maximum.";
  }
  if (disposition.provokesOpportunityAttacks !== false) {
    return "Open Hand Technique Push disposition must not provoke Opportunity Attacks.";
  }
  if (disposition.kind === "pushed") {
    return disposition.destinationId.length === 0
      ? "Open Hand Technique Push destination must be caller-supplied."
      : null;
  }
  return null;
}

function openHandTechniqueFlurryHit(
  state: BattleState,
  subject: unknown,
  actorId: CombatantId,
  targetId: CombatantId,
): OpenHandTechniqueFlurryHit | null {
  if (!isMonkFocusFlurryOfBlowsStrikeSubject(subject)) return null;
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character" || !state.combatants.has(targetId)) {
    return null;
  }
  if (
    !state.currentTurnResources.actionResources.some((resource) =>
      isMonkFocusFlurryOfBlowsActionResource(
        resource,
        actorId,
        subject.resourceUnitId,
      ),
    )
  ) {
    return null;
  }
  const selectedProfile = actor.origin.characterUnitRefs.flatMap((unitRef) =>
    unitRef.supportProfiles.flatMap((supportProfile) =>
      openHandTechniqueSupportProfile(unitRef.unitId, supportProfile),
    ),
  )[0];
  if (selectedProfile === undefined) return null;
  if (
    selectedProfile.profile.technique.trigger.resourceUnitId !==
    subject.resourceUnitId
  ) {
    return null;
  }
  return {
    actorId,
    targetId,
    subject,
    unitId: selectedProfile.unitId,
    profile: selectedProfile.profile,
  };
}

function openHandTechniqueSupportProfile(
  unitId: UnitRecord["id"],
  supportProfile: BattleUnitSupportProfile,
):
  | readonly [
      {
        readonly unitId: UnitRecord["id"];
        readonly profile: BattleOpenHandTechniqueSupportProfile;
      },
    ]
  | readonly [] {
  return typeof supportProfile === "object" &&
    supportProfile.kind === "openHandTechnique"
    ? [{ unitId, profile: supportProfile }]
    : [];
}

function openHandTechniquePush(
  fill: Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>,
): BattleShovePushOutcome | undefined {
  return "openHandTechniquePush" in fill.value
    ? fill.value.openHandTechniquePush
    : undefined;
}

function isMonkFocusFlurryOfBlowsStrikeSubject(
  subject: unknown,
): subject is MonkFocusFlurryOfBlowsStrikeSubject {
  return (
    typeof subject === "object" &&
    subject !== null &&
    "tag" in subject &&
    subject.tag === "monkFocusFlurryOfBlowsStrike"
  );
}

function isOpenHandTechniqueChoice(
  value: Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>["value"],
): value is OpenHandTechniqueDecisionChoice {
  return OPEN_HAND_TECHNIQUE_DECISION_CHOICES.some(
    (choice) => choice === value,
  );
}
