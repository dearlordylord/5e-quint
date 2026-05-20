// Monk's Focus option execution.
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.monk-focus-battle-options

import { spendActivationResource } from "@dnd/shared-algebras/action-economy-algebra";
import * as Either from "effect/Either";

import type {
  CharacterUnarmedStrikeActionOption,
  SupportedAttackActionOption,
} from "../battle-action-options.ts";
import type {
  AvailableBattleAct,
  BattleCreatureState,
  BattleResolutionResult,
  BattleState,
  BattleTurnResources,
  CharacterBattleCreatureState,
  MonkFocusFlurryOfBlowsStrikeBattleResolutionInput,
  MonkFocusOptionBattleResolutionInput,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";
import type { CharacterBattleResourceState } from "../character-battle-resources.ts";
import {
  resourceHasUsesRemaining,
  spendCharacterResourceUse,
} from "../character-battle-resources.ts";
import {
  battleMonkFocusBattleOptionsSupportForUnit,
  type BattleMonkFocusBattleOptionsSupportProfile,
} from "../unit-feature-support.ts";

import type { MonkFocusFlurryOfBlowsActionResource } from "./battle-runtime-protocol.ts";
import { attackActionOptionsForActor } from "./attack-damage-apply.ts";
import { applyDashToActor, applyDisengage } from "./attack-resolution.ts";
import {
  combatantCanTakeActions,
  isCharacterBattleCreatureState,
} from "./creature-state.ts";
import { attackTargetChoices, attackTargetHole } from "./hole-helpers.ts";
import { representedMovementSpeedKinds } from "./movement-speed.ts";
import { invalidResult } from "./result-helpers.ts";
import { resolveSelectedAttackProcedure } from "./attack-main.ts";
import { snapshotBattle } from "./dispatcher.ts";
import {
  attackActionOptionName,
  clearPendingAttackRollMissToHitReplacementSelection,
} from "./statblock-attacks.ts";

type MonkFocusResourceFact = {
  readonly actor: CharacterBattleCreatureState;
  readonly resource: CharacterBattleResourceState;
  readonly profile: BattleMonkFocusBattleOptionsSupportProfile;
};

export function monkFocusActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  if (!isCharacterBattleCreatureState(actor)) return [];
  if (!combatantCanTakeActions(actor)) return [];

  return [
    ...monkFocusOptionActs(state, actor),
    ...monkFocusFlurryOfBlowsStrikeActs(state, actor),
  ];
}

function monkFocusOptionActs(
  state: BattleState,
  actor: CharacterBattleCreatureState,
): readonly AvailableBattleAct[] {
  if (!state.currentTurnResources.currentHasBonusAction) return [];
  const focus = monkFocusResourceForActor(state, actor.combatantId);
  if (focus === null) return [];
  const acts: AvailableBattleAct[] = [];
  const hasFocusPoint = resourceHasUsesRemaining(focus.resource);
  const unarmedStrike = flurryOfBlowsUnarmedStrikeForActor(
    state,
    actor.combatantId,
  );

  if (hasFocusPoint && unarmedStrike !== undefined) {
    acts.push({
      subject: {
        tag: "monkFocusOption",
        actorId: actor.combatantId,
        resourceUnitId: focus.resource.unit.id,
        option: "flurryOfBlows",
      },
      label: focus.profile.flurryOfBlows.displayName,
      summary:
        "Spend 1 Focus Point and a Bonus Action to make two Unarmed Strikes.",
      initialHoles: [],
    });
  }

  acts.push({
    subject: {
      tag: "monkFocusOption",
      actorId: actor.combatantId,
      resourceUnitId: focus.resource.unit.id,
      option: "patientDefense",
      mode: "freeDisengage",
    },
    label: `${focus.profile.patientDefense.displayName}: Disengage`,
    summary: "Take the Disengage action as a Bonus Action.",
    initialHoles: [],
  });
  if (hasFocusPoint) {
    acts.push({
      subject: {
        tag: "monkFocusOption",
        actorId: actor.combatantId,
        resourceUnitId: focus.resource.unit.id,
        option: "patientDefense",
        mode: "focusDisengageDodge",
      },
      label: `${focus.profile.patientDefense.displayName}: Disengage and Dodge`,
      summary:
        "Spend 1 Focus Point and a Bonus Action to take the Disengage and Dodge actions.",
      initialHoles: [],
    });
  }

  for (const speedKind of representedMovementSpeedKinds(actor)) {
    acts.push({
      subject: {
        tag: "monkFocusOption",
        actorId: actor.combatantId,
        resourceUnitId: focus.resource.unit.id,
        option: "stepOfTheWind",
        mode: "freeDash",
        speedKind,
      },
      label: `${focus.profile.stepOfTheWind.displayName}: Dash`,
      summary: "Take the Dash action as a Bonus Action.",
      initialHoles: [],
    });
    if (hasFocusPoint) {
      acts.push({
        subject: {
          tag: "monkFocusOption",
          actorId: actor.combatantId,
          resourceUnitId: focus.resource.unit.id,
          option: "stepOfTheWind",
          mode: "focusDisengageDash",
          speedKind,
        },
        label: `${focus.profile.stepOfTheWind.displayName}: Disengage and Dash`,
        summary:
          "Spend 1 Focus Point and a Bonus Action to take the Disengage and Dash actions.",
        initialHoles: [],
      });
    }
  }

  return acts;
}

function monkFocusFlurryOfBlowsStrikeActs(
  state: BattleState,
  actor: CharacterBattleCreatureState,
): readonly AvailableBattleAct[] {
  const flurryResource = state.currentTurnResources.actionResources.find(
    (resource): resource is MonkFocusFlurryOfBlowsActionResource =>
      isMonkFocusFlurryOfBlowsActionResource(
        resource,
        actor.combatantId,
        undefined,
      ),
  );
  if (flurryResource === undefined) return [];

  const unarmedStrike = flurryOfBlowsUnarmedStrikeForActor(
    state,
    actor.combatantId,
  );
  if (unarmedStrike === undefined) {
    return [];
  }
  const attackName = attackActionOptionName(unarmedStrike);
  return [
    {
      subject: {
        tag: "monkFocusFlurryOfBlowsStrike",
        actorId: actor.combatantId,
        resourceUnitId: flurryResource.sourceUnitId,
        attackName,
      },
      label: "Flurry of Blows Unarmed Strike",
      summary: "Make one Unarmed Strike granted by Flurry of Blows.",
      initialHoles: [attackTargetHole(state, actor.combatantId, unarmedStrike)],
    },
  ];
}

export function resolveMonkFocusOption(
  input: MonkFocusOptionBattleResolutionInput,
): BattleResolutionResult {
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Monk Focus options accept no fills.",
    );
  }
  const focus = monkFocusResourceForActor(input.state, input.subject.actorId);
  if (
    focus === null ||
    focus.resource.unit.id !== input.subject.resourceUnitId
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Monk Focus option requires the shared Focus Point resource.",
    );
  }
  if (!combatantCanTakeActions(focus.actor)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Monk Focus options are no longer available for this actor.",
    );
  }
  if (
    input.subject.option === "flurryOfBlows" &&
    flurryOfBlowsUnarmedStrikeForActor(input.state, input.subject.actorId) ===
      undefined
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Flurry of Blows requires an available Unarmed Strike target.",
    );
  }
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Monk Focus Bonus Action is no longer available.",
    );
  }

  if (input.subject.option === "flurryOfBlows") {
    return resolveFlurryOfBlowsActivation(input, focus, spent.right);
  }
  if (
    input.subject.option === "patientDefense" &&
    input.subject.mode === "freeDisengage"
  ) {
    const nextState = applyDisengage(input.state, spent.right);
    return resolved(nextState);
  }
  if (
    input.subject.option === "patientDefense" &&
    input.subject.mode === "focusDisengageDodge"
  ) {
    return resolvePatientDefenseFocus(input, focus, spent.right);
  }
  if (
    input.subject.option === "stepOfTheWind" &&
    input.subject.mode === "freeDash"
  ) {
    if (
      !representedMovementSpeedKinds(focus.actor).includes(
        input.subject.speedKind,
      )
    ) {
      return invalidResult(
        input.state,
        "unsupportedActOption",
        "Step of the Wind speed kind is not represented for this combatant.",
      );
    }
    const nextState = applyDashToActor(
      input.state,
      focus.actor,
      input.subject.speedKind,
      spent.right,
    );
    return resolved(nextState);
  }
  if (
    input.subject.option === "stepOfTheWind" &&
    input.subject.mode === "focusDisengageDash"
  ) {
    return resolveStepOfTheWindFocus(input, focus, spent.right);
  }
  return invalidResult(
    input.state,
    "unsupportedActOption",
    "Monk Focus option mode is not admitted by the runtime profile.",
  );
}

function resolveFlurryOfBlowsActivation(
  input: MonkFocusOptionBattleResolutionInput,
  focus: MonkFocusResourceFact,
  spentResources: BattleTurnResources,
): BattleResolutionResult {
  if (!resourceHasUsesRemaining(focus.resource)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Flurry of Blows requires an unspent Focus Point.",
    );
  }
  const withSpentFocus = stateWithMonkFocusResource(
    input.state,
    focus.actor,
    spendCharacterResourceUse(focus.resource),
  );
  const nextState = {
    ...withSpentFocus,
    currentTurnResources: {
      ...spentResources,
      actionResources: [
        ...spentResources.actionResources,
        ...Array.from(
          { length: focus.profile.flurryOfBlows.strikeCount },
          (): MonkFocusFlurryOfBlowsActionResource => ({
            kind: "action",
            source: "monkFocusFlurryOfBlows",
            sourceOwnerId: input.subject.actorId,
            sourceUnitId: focus.resource.unit.id,
          }),
        ),
      ],
    },
  };
  return resolved(nextState);
}

function resolvePatientDefenseFocus(
  input: MonkFocusOptionBattleResolutionInput,
  focus: MonkFocusResourceFact,
  spentResources: BattleTurnResources,
): BattleResolutionResult {
  if (!resourceHasUsesRemaining(focus.resource)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Patient Defense requires an unspent Focus Point for Dodge.",
    );
  }
  const withDisengage = applyDisengage(input.state, spentResources);
  const actor = withDisengage.combatants.get(input.subject.actorId);
  if (!isCharacterBattleCreatureState(actor)) {
    return invalidResult(
      input.state,
      "missingCombatant",
      "Patient Defense actor is not in this battle.",
    );
  }
  const dodgingActor = { ...actor, dodging: true };
  const withDodge = {
    ...withDisengage,
    combatants: new Map(withDisengage.combatants).set(
      actor.combatantId,
      dodgingActor,
    ),
  };
  return resolved(
    stateWithMonkFocusResource(
      withDodge,
      dodgingActor,
      spendCharacterResourceUse(focus.resource),
    ),
  );
}

function resolveStepOfTheWindFocus(
  input: MonkFocusOptionBattleResolutionInput,
  focus: MonkFocusResourceFact,
  spentResources: BattleTurnResources,
): BattleResolutionResult {
  if (!resourceHasUsesRemaining(focus.resource)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Step of the Wind requires an unspent Focus Point for Disengage.",
    );
  }
  if (
    input.subject.option !== "stepOfTheWind" ||
    input.subject.mode !== "focusDisengageDash"
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Step of the Wind Focus mode requires a Dash speed kind.",
    );
  }
  if (
    !representedMovementSpeedKinds(focus.actor).includes(
      input.subject.speedKind,
    )
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Step of the Wind speed kind is not represented for this combatant.",
    );
  }
  const withDash = applyDashToActor(
    input.state,
    focus.actor,
    input.subject.speedKind,
    spentResources,
  );
  const withDisengage = applyDisengage(withDash, withDash.currentTurnResources);
  const actor = withDisengage.combatants.get(input.subject.actorId);
  if (!isCharacterBattleCreatureState(actor)) {
    return invalidResult(
      input.state,
      "missingCombatant",
      "Step of the Wind actor is not in this battle.",
    );
  }
  return resolved(
    stateWithMonkFocusResource(
      withDisengage,
      actor,
      spendCharacterResourceUse(focus.resource),
    ),
  );
}

export function resolveMonkFocusFlurryOfBlowsStrike(
  input: MonkFocusFlurryOfBlowsStrikeBattleResolutionInput,
): BattleResolutionResult {
  if (
    !combatantCanTakeActions(input.state.combatants.get(input.subject.actorId))
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Flurry of Blows is no longer available for this actor.",
    );
  }
  if (
    !stateHasMonkFocusFlurryOfBlowsActionResource(
      input.state,
      input.subject.actorId,
      input.subject.resourceUnitId,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Flurry of Blows Unarmed Strike is no longer available.",
    );
  }
  const unarmedStrike = flurryOfBlowsUnarmedStrikeForActor(
    input.state,
    input.subject.actorId,
  );
  if (
    unarmedStrike === undefined ||
    attackActionOptionName(unarmedStrike) !== input.subject.attackName
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Flurry of Blows requires the actor's Unarmed Strike.",
    );
  }
  return resolveSelectedAttackProcedure(
    input,
    unarmedStrike,
    (state, actorId, attack) =>
      spendMonkFocusFlurryOfBlowsActionResource(
        state,
        actorId,
        attack,
        input.subject.resourceUnitId,
      ),
  );
}

function spendMonkFocusFlurryOfBlowsActionResource(
  state: BattleState,
  actorId: CombatantId,
  _attack: SupportedAttackActionOption,
  resourceUnitId: string,
): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  const resourceIndex = state.currentTurnResources.actionResources.findIndex(
    (resource) =>
      isMonkFocusFlurryOfBlowsActionResource(resource, actorId, resourceUnitId),
  );
  if (resourceIndex === -1) {
    return invalidResult(
      state,
      "staleSubject",
      "Flurry of Blows Unarmed Strike is no longer available.",
    );
  }
  const nextState = {
    ...state,
    currentTurnResources: clearPendingAttackRollMissToHitReplacementSelection(
      {
        ...state.currentTurnResources,
        actionResources: state.currentTurnResources.actionResources.filter(
          (_, index) => index !== resourceIndex,
        ),
      },
      actorId,
    ),
  };
  return resolved(nextState);
}

function stateHasMonkFocusFlurryOfBlowsActionResource(
  state: BattleState,
  actorId: CombatantId,
  resourceUnitId: string,
): boolean {
  return state.currentTurnResources.actionResources.some((resource) =>
    isMonkFocusFlurryOfBlowsActionResource(resource, actorId, resourceUnitId),
  );
}

export function isMonkFocusFlurryOfBlowsActionResource(
  resource: BattleTurnResources["actionResources"][number],
  actorId: CombatantId,
  resourceUnitId: string | undefined,
): resource is MonkFocusFlurryOfBlowsActionResource {
  return (
    resource.source === "monkFocusFlurryOfBlows" &&
    resource.sourceOwnerId === actorId &&
    (resourceUnitId === undefined || resource.sourceUnitId === resourceUnitId)
  );
}

function monkFocusResourceForActor(
  state: BattleState,
  actorId: CombatantId,
): MonkFocusResourceFact | null {
  const actor = state.combatants.get(actorId);
  if (!isCharacterBattleCreatureState(actor)) return null;
  for (const resource of actor.origin.resources) {
    const support = battleMonkFocusBattleOptionsSupportForUnit(resource.unit);
    if (support !== null && support !== "unsupported") {
      return { actor, resource, profile: support };
    }
  }
  return null;
}

function unarmedStrikeForActor(
  state: BattleState,
  actorId: CombatantId,
): CharacterUnarmedStrikeActionOption | undefined {
  return attackActionOptionsForActor(state, actorId).find(
    (attack): attack is CharacterUnarmedStrikeActionOption =>
      attack.kind === "unarmedStrike",
  );
}

function flurryOfBlowsUnarmedStrikeForActor(
  state: BattleState,
  actorId: CombatantId,
): CharacterUnarmedStrikeActionOption | undefined {
  const unarmedStrike = unarmedStrikeForActor(state, actorId);
  if (
    unarmedStrike === undefined ||
    attackTargetChoices(state, actorId, unarmedStrike).length === 0
  ) {
    return undefined;
  }
  return unarmedStrike;
}

function stateWithMonkFocusResource(
  state: BattleState,
  actor: CharacterBattleCreatureState,
  resource: CharacterBattleResourceState,
): BattleState {
  const currentActor = state.combatants.get(actor.combatantId);
  if (currentActor?.origin.kind !== "character") return state;
  const nextActor: BattleCreatureState = {
    ...currentActor,
    origin: {
      ...currentActor.origin,
      resources: currentActor.origin.resources.map((candidate) =>
        candidate.unit.id === resource.unit.id ? resource : candidate,
      ),
    },
  };
  return {
    ...state,
    combatants: new Map(state.combatants).set(actor.combatantId, nextActor),
  };
}

function resolved(
  state: BattleState,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  return {
    tag: "resolved",
    state,
    snapshot: snapshotBattle(state),
  };
}
