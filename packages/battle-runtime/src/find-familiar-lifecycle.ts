// UNIT-PROFILE-COVERAGE: runtime-owner spell.find-familiar-lifecycle
import { spendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { Hp } from "@dnd/shared/types";
import type { StatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import * as Either from "effect/Either";

import type {
  BattleDroppedObjectOutcome,
  BattleResolutionResult,
  BattleState,
} from "./battle-reducer.ts";
import { currentActorId } from "./battle-reducer/creature-state-leaves.ts";
import { snapshotBattle } from "./battle-reducer/dispatcher.ts";
import {
  addBattleCombatant,
  removeBattleCombatants,
} from "./battle-reducer/api-lifecycle.ts";
import type {
  BattleTablePositionId,
  CombatantId,
  InitiativeScore,
} from "./identity.ts";
import { spellId } from "./identity.ts";
import { findPresentFamiliarById } from "./find-familiar-state.ts";
import type {
  FindFamiliarCreatureTypeOverride,
  FindFamiliarCreatureTypeOverrideChoice,
  FindFamiliarFormEligibility,
  FindFamiliarFormSelection,
} from "./find-familiar-forms.ts";
import {
  resolveFindFamiliarForm,
  resolveFindFamiliarSelectedForm,
} from "./find-familiar-forms.ts";

const FIND_FAMILIAR_SPELL_ID = spellId("find_familiar");

export type FindFamiliarPlacement =
  | {
      readonly kind: "unoccupiedSpaceWithinSpellRange";
      readonly positionId?: BattleTablePositionId;
    }
  | {
      readonly kind: "unoccupiedSpaceWithin30Feet";
      readonly positionId?: BattleTablePositionId;
    };

export type FindFamiliarPresentState = {
  readonly status: "present";
  readonly familiarId: CombatantId;
  readonly formSelection: FindFamiliarFormSelection;
  readonly creatureTypeOverride: FindFamiliarCreatureTypeOverride;
  readonly placement: FindFamiliarPlacement;
};

export type FindFamiliarAbsentState = {
  readonly status: "temporarilyDismissed" | "disappearedAtZeroHitPoints";
  readonly formSelection: FindFamiliarFormSelection;
  readonly creatureTypeOverride: FindFamiliarCreatureTypeOverride;
};

export type FindFamiliarState =
  | FindFamiliarPresentState
  | FindFamiliarAbsentState;

type FindFamiliarCombatantRemoval =
  | { readonly tag: "resolved"; readonly state: BattleState }
  | Extract<BattleResolutionResult, { readonly tag: "invalid" }>;

export type FindFamiliarSnapshot =
  | (FindFamiliarPresentState & {
      readonly ownerId: CombatantId;
      readonly initiative: InitiativeScore;
    })
  | (FindFamiliarAbsentState & { readonly ownerId: CombatantId });

export type FindFamiliarOwnerInput = {
  readonly state: BattleState;
  readonly casterId: CombatantId;
};

export type FindFamiliarLifecycleInputBase = FindFamiliarOwnerInput & {
  readonly heldObjectIds?: readonly BattleDroppedObjectOutcome["objectId"][];
};

export type FindFamiliarCastInput = {
  readonly state: BattleState;
  readonly casterId: CombatantId;
  readonly catalog: StatBlockCatalog;
  readonly eligibility: FindFamiliarFormEligibility;
  readonly selection: FindFamiliarFormSelection;
  readonly creatureTypeOverrideChoiceId: FindFamiliarCreatureTypeOverrideChoice["optionId"];
  readonly familiarId: CombatantId;
  readonly initiative: InitiativeScore;
  readonly placement: Extract<
    FindFamiliarPlacement,
    { readonly kind: "unoccupiedSpaceWithinSpellRange" }
  >;
};

export type FindFamiliarReappearanceInput = {
  readonly state: BattleState;
  readonly casterId: CombatantId;
  readonly catalog: StatBlockCatalog;
  readonly eligibility: FindFamiliarFormEligibility;
  readonly familiarId: CombatantId;
  readonly initiative: InitiativeScore;
  readonly placement: Extract<
    FindFamiliarPlacement,
    { readonly kind: "unoccupiedSpaceWithin30Feet" }
  >;
};

export function castFindFamiliar(
  input: FindFamiliarCastInput,
): BattleResolutionResult {
  if (!input.state.combatants.has(input.casterId)) {
    return invalidFindFamiliarResult(
      input.state,
      "missingCombatant",
      "Find Familiar caster is not in this battle.",
    );
  }
  const priorFamiliar = input.state.findFamiliars.get(input.casterId);
  const familiarId =
    priorFamiliar?.status === "present"
      ? priorFamiliar.familiarId
      : input.familiarId;
  const identityIssue = findFamiliarIdentityIssue(
    input.state,
    input.casterId,
    familiarId,
  );
  if (identityIssue !== null) {
    return invalidFindFamiliarResult(input.state, "invalidFill", identityIssue);
  }
  const resolvedForm = resolveFindFamiliarForm({
    catalog: input.catalog,
    eligibility: input.eligibility,
    selection: input.selection,
    creatureTypeOverrideChoiceId: input.creatureTypeOverrideChoiceId,
  });
  if (resolvedForm.tag === "issue") {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      resolvedForm.message,
    );
  }

  const nextFamiliar = {
    status: "present",
    familiarId,
    formSelection: input.selection,
    creatureTypeOverride: resolvedForm.form.creatureTypeOverride,
    placement: input.placement,
  } as const satisfies FindFamiliarPresentState;
  const nextState = withFindFamiliarCombatant({
    state: input.state,
    casterId: input.casterId,
    familiar: nextFamiliar,
    initiative: input.initiative,
    statBlock: familiarStatBlockWithCreatureTypeOverride(resolvedForm.form),
  });
  return nextState.tag === "invalid"
    ? nextState
    : resolvedFindFamiliarResult(nextState.state, []);
}

export function temporarilyDismissFindFamiliar(
  input: FindFamiliarLifecycleInputBase,
): BattleResolutionResult {
  const familiar = input.state.findFamiliars.get(input.casterId);
  if (familiar === undefined) {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      "Find Familiar caster has no familiar to dismiss.",
    );
  }
  if (familiar.status !== "present") {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      "Find Familiar can be temporarily dismissed only while present.",
    );
  }
  const spent = spendFindFamiliarMagicAction(
    input.state,
    input.casterId,
    "Find Familiar temporary dismissal",
  );
  if (spent.tag === "invalid") {
    return spent;
  }
  const nextFamiliar = {
    status: "temporarilyDismissed",
    formSelection: familiar.formSelection,
    creatureTypeOverride: familiar.creatureTypeOverride,
  } as const satisfies FindFamiliarAbsentState;
  const nextState = withoutPresentFindFamiliarCombatant(
    withFindFamiliar(spent.state, input.casterId, nextFamiliar),
    familiar.familiarId,
  );
  if (nextState.tag === "invalid") {
    return nextState;
  }
  return resolvedFindFamiliarResult(
    nextState.state,
    droppedObjectsForFamiliarDisappearance({
      casterId: input.casterId,
      familiarId: familiar.familiarId,
      ...(input.heldObjectIds === undefined
        ? {}
        : { heldObjectIds: input.heldObjectIds }),
    }),
  );
}

export function permanentlyDismissFindFamiliar(
  input: FindFamiliarOwnerInput,
): BattleResolutionResult {
  const familiar = input.state.findFamiliars.get(input.casterId);
  if (familiar === undefined) {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      "Find Familiar caster has no familiar to dismiss forever.",
    );
  }
  const findFamiliars = new Map(input.state.findFamiliars);
  findFamiliars.delete(input.casterId);
  if (familiar.status !== "present") {
    return resolvedFindFamiliarResult({ ...input.state, findFamiliars }, []);
  }
  const nextState = withoutPresentFindFamiliarCombatant(
    { ...input.state, findFamiliars },
    familiar.familiarId,
  );
  return nextState.tag === "invalid"
    ? nextState
    : resolvedFindFamiliarResult(nextState.state, []);
}

export function reappearTemporarilyDismissedFindFamiliar(
  input: FindFamiliarReappearanceInput,
): BattleResolutionResult {
  const familiar = input.state.findFamiliars.get(input.casterId);
  if (familiar === undefined || familiar.status !== "temporarilyDismissed") {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      "Find Familiar can reappear only from temporary dismissal.",
    );
  }
  const identityIssue = findFamiliarIdentityIssue(
    input.state,
    input.casterId,
    input.familiarId,
  );
  if (identityIssue !== null) {
    return invalidFindFamiliarResult(input.state, "invalidFill", identityIssue);
  }
  const nextFamiliar = {
    status: "present",
    familiarId: input.familiarId,
    formSelection: familiar.formSelection,
    creatureTypeOverride: familiar.creatureTypeOverride,
    placement: input.placement,
  } as const satisfies FindFamiliarPresentState;
  const spent = spendFindFamiliarMagicAction(
    input.state,
    input.casterId,
    "Find Familiar reappearance",
  );
  if (spent.tag === "invalid") {
    return spent;
  }
  const resolvedForm = resolveFindFamiliarSelectedForm({
    catalog: input.catalog,
    eligibility: input.eligibility,
    selection: familiar.formSelection,
    creatureTypeOverride: familiar.creatureTypeOverride,
  });
  if (resolvedForm.tag === "issue") {
    return invalidFindFamiliarResult(
      spent.state,
      "invalidFill",
      resolvedForm.message,
    );
  }
  const nextState = withFindFamiliarCombatant({
    state: spent.state,
    casterId: input.casterId,
    familiar: nextFamiliar,
    initiative: input.initiative,
    statBlock: familiarStatBlockWithCreatureTypeOverride(resolvedForm.form),
  });
  return nextState.tag === "invalid"
    ? nextState
    : resolvedFindFamiliarResult(nextState.state, []);
}

export function applyFindFamiliarZeroHitPointDisappearance(input: {
  readonly state: BattleState;
  readonly familiarId: CombatantId;
  readonly heldObjectIds?: readonly BattleDroppedObjectOutcome["objectId"][];
}): BattleResolutionResult {
  const entry = findPresentFamiliarById(input.state, input.familiarId);
  if (entry === null) {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      "Familiar identity is not a present Find Familiar familiar.",
    );
  }
  const nextFamiliar = {
    status: "disappearedAtZeroHitPoints",
    formSelection: entry.familiar.formSelection,
    creatureTypeOverride: entry.familiar.creatureTypeOverride,
  } as const satisfies FindFamiliarAbsentState;
  const nextState = withoutPresentFindFamiliarCombatant(
    withFindFamiliar(input.state, entry.ownerId, nextFamiliar),
    entry.familiar.familiarId,
  );
  if (nextState.tag === "invalid") {
    return nextState;
  }
  return resolvedFindFamiliarResult(
    nextState.state,
    droppedObjectsForFamiliarDisappearance({
      casterId: entry.ownerId,
      familiarId: entry.familiar.familiarId,
      ...(input.heldObjectIds === undefined
        ? {}
        : { heldObjectIds: input.heldObjectIds }),
    }),
  );
}

function withFindFamiliarCombatant(input: {
  readonly state: BattleState;
  readonly casterId: CombatantId;
  readonly familiar: FindFamiliarPresentState;
  readonly initiative: InitiativeScore;
  readonly statBlock: StatBlockRecord;
}):
  | { readonly tag: "resolved"; readonly state: BattleState }
  | Extract<BattleResolutionResult, { readonly tag: "invalid" }> {
  const owner = input.state.combatants.get(input.casterId);
  if (owner === undefined) {
    return invalidFindFamiliarResult(
      input.state,
      "missingCombatant",
      "Find Familiar caster is not in this battle.",
    );
  }
  const priorWithoutFamiliar = withoutPresentFindFamiliarCombatant(
    input.state,
    input.familiar.familiarId,
  );
  if (priorWithoutFamiliar.tag === "invalid") {
    return priorWithoutFamiliar;
  }
  const maxHp = familiarMaxHp(input.statBlock);
  if (typeof maxHp === "string") {
    return invalidFindFamiliarResult(input.state, "invalidFill", maxHp);
  }
  const added = addBattleCombatant({
    state: priorWithoutFamiliar.state,
    combatant: {
      combatantId: input.familiar.familiarId,
      displayName: input.statBlock.statBlock.displayName,
      initiative: input.initiative,
      side: owner.side,
      creatureInit: {
        kind: "statBlock",
        statBlock: input.statBlock,
        currentHp: maxHp,
        maxHp,
        tempHp: Hp(0),
      },
    },
  });
  if (Either.isLeft(added)) {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      added.left.message,
    );
  }
  return {
    tag: "resolved",
    state: withFindFamiliar(added.right, input.casterId, input.familiar),
  };
}

function withoutPresentFindFamiliarCombatant(
  state: BattleState,
  familiarId: CombatantId,
): FindFamiliarCombatantRemoval {
  if (!state.combatants.has(familiarId)) {
    return { tag: "resolved", state };
  }
  const removed = removeBattleCombatants({
    state,
    combatantIds: [familiarId],
  });
  return Either.isLeft(removed)
    ? invalidFindFamiliarResult(state, "invalidFill", removed.left.message)
    : { tag: "resolved", state: removed.right };
}

function familiarStatBlockWithCreatureTypeOverride(input: {
  readonly statBlock: StatBlockRecord;
  readonly creatureTypeOverride: FindFamiliarCreatureTypeOverride;
}): StatBlockRecord {
  return {
    ...input.statBlock,
    statBlock: {
      ...input.statBlock.statBlock,
      creatureType: input.creatureTypeOverride,
    },
  };
}

function familiarMaxHp(statBlock: StatBlockRecord): Hp | string {
  const hp = statBlock.statBlock.hp;
  if (hp.kind !== "literal") {
    return "Find Familiar form Stat Block must use literal HP.";
  }
  return Hp(hp.value);
}

function withFindFamiliar(
  state: BattleState,
  casterId: CombatantId,
  familiar: FindFamiliarState,
): BattleState {
  return {
    ...state,
    findFamiliars: new Map(state.findFamiliars).set(casterId, familiar),
  };
}

function findFamiliarIdentityIssue(
  state: BattleState,
  casterId: CombatantId,
  familiarId: CombatantId,
): string | null {
  if (familiarId === casterId) {
    return "Find Familiar familiar identity must be distinct from its caster.";
  }
  const existing = findPresentFamiliarById(state, familiarId);
  if (existing !== null && existing.ownerId !== casterId) {
    return "Find Familiar familiar identity is already owned by another caster.";
  }
  if (state.combatants.has(familiarId) && existing === null) {
    return "Find Familiar familiar identity must not identify an ordinary combatant.";
  }
  return null;
}

function spendFindFamiliarMagicAction(
  state: BattleState,
  casterId: CombatantId,
  actionLabel: string,
):
  | { readonly tag: "resolved"; readonly state: BattleState }
  | Extract<BattleResolutionResult, { readonly tag: "invalid" }> {
  if (currentActorId(state) !== casterId) {
    return invalidFindFamiliarResult(
      state,
      "staleSubject",
      `${actionLabel} is available only on the caster's turn.`,
    );
  }
  const spent = spendAction(state.currentTurnResources, "magic");
  return Either.isLeft(spent)
    ? invalidFindFamiliarResult(
        state,
        "staleSubject",
        `${actionLabel} requires an available Magic action.`,
      )
    : {
        tag: "resolved",
        state: {
          ...state,
          currentTurnResources: spent.right,
        },
      };
}

function droppedObjectsForFamiliarDisappearance(input: {
  readonly casterId: CombatantId;
  readonly familiarId: CombatantId;
  readonly heldObjectIds?: readonly BattleDroppedObjectOutcome["objectId"][];
}): readonly BattleDroppedObjectOutcome[] {
  const objectIds = input.heldObjectIds ?? [];
  return objectIds.map((objectId) => ({
    kind: "heldObjectDropped",
    actorId: input.familiarId,
    objectId,
    sourceCombatantId: input.casterId,
    sourceSpellId: FIND_FAMILIAR_SPELL_ID,
  }));
}

function resolvedFindFamiliarResult(
  state: BattleState,
  droppedObjects: readonly BattleDroppedObjectOutcome[],
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  return {
    tag: "resolved",
    state,
    snapshot: snapshotBattle(state),
    ...(droppedObjects.length === 0 ? {} : { droppedObjects }),
  };
}

function invalidFindFamiliarResult(
  state: BattleState,
  reason: Extract<
    BattleResolutionResult,
    { readonly tag: "invalid" }
  >["reason"],
  message: string,
): Extract<BattleResolutionResult, { readonly tag: "invalid" }> {
  return {
    tag: "invalid",
    reason,
    message,
    snapshot: snapshotBattle(state),
  };
}
