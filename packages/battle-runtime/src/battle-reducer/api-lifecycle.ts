// Public battle lifecycle API and Initial Initiative setup workflow.
// KERNEL-COVERAGE: runtime-owner CHARACTER.LIFECYCLE.LAYER_PROJECTION BATTLE.COMPOSITION.REDUCER_SPINE_CONTRACT BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.initiative-proficiency-and-swap unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.remarkable-athlete unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement spell.creature-type-protection-and-charm spell.invocation-attack-roll-advantage-save spell.invocation-chained-attack-damage spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-condition-save spell.hit-point-restoration spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-weapon-damage-rider spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff

import { optionalProperty } from "../optional-property.ts";
import {
  createScoredInitiativeStack,
  insertAtOrderIndex,
  swapInitialInitiativeScores,
} from "@dnd/shared-algebras/initiative-algebra";
import { isIncapacitated } from "@dnd/shared-algebras/conditions-algebra";
import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";

import { Result } from "effect";

import * as Option from "effect/Option";

import { Match } from "effect";

import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import {
  projectAuthoredStatBlockBattleInit,
  type AuthoredStatBlockBattleInitInput,
  type BattleCreatureAdmissionInit,
  type BattleCreatureInit,
} from "../battle-init.ts";
import {
  battleRuntimeContextFromCharacterAdmission,
  battleRuntimeSessionFromAdmittedContext,
  characterWeaponPresentationSource,
  type BattleRuntimeContext,
  type BattleRuntimeSession,
  type CharacterBattleRuntimeContext,
  type BattleStatBlockPresentationSource,
} from "../battle-runtime-context.ts";

import {
  BattleId,
  CombatantId,
  battleExecutionScopeCursor,
  battleExecutionScopeInitialOrNextOrdinal,
  battleExecutionScopeOrdinal,
} from "../identity.ts";
import type { BattleUnitSupportProfileIssue } from "../unit-feature-support.ts";
import { battleStatBlockProjectionFailureMessage } from "../stat-block-authored-projection.ts";

import {
  characterUnitProcedureBindings,
  characterExecutionWithSpellInvocations,
  bindAuthoredSelectedSpellInvocation,
  characterSpellProcedureExecution,
  spellInvocationMatchesExecution,
} from "../character-execution-admission.ts";
import {
  battleCreatureStateAdmissionFromInit,
  combatantInitiativeInsertionIndex,
  hidePrerequisitesReferenceCombatantsIssues,
  isCharacterBattleCreatureState,
  positiveHpUnconsciousInitIssue,
} from "./creature-state.ts";
import { admittedSpellActs } from "./spells-profiles.ts";

import {
  battleStateInitIssueLeaves,
  battleStateInitIssue,
  battleStateInitIssueMessage,
  battleStateInitIssues,
  duplicateCombatantIdIssue,
} from "./domain-helpers.ts";

import { removeBattleCombatants } from "./combatant-removal.ts";
export { removeBattleCombatants } from "./combatant-removal.ts";

import type {
  BattleCreatureState,
  BattleInitializationIssueFact,
  BattleInitializationIssue,
  BattleInitializationIssueFacts,
  BattleInitializationLeafIssue,
  BattleExecutionScopeAllocation,
  BattleHidePrerequisite,
  BattleState,
  BattleStateInitIssue,
  BattleStateInitLeafIssue,
  CharacterBattleCreatureState,
} from "../battle-state-execution.ts";
import {
  INITIAL_ROUND,
  INITIAL_TURN_RESOURCES,
} from "./battle-runtime-protocol.ts";

function isNonEmptyReadonlyArray<T>(
  values: readonly T[],
): values is ReadonlyNonEmptyArray<T> {
  return values.length > 0;
}

function admissionIssueToInitIssue(
  issue: BattleStateInitLeafIssue | BattleUnitSupportProfileIssue,
): BattleStateInitLeafIssue {
  if (issue.tag === "battleUnitSupportProfileIssue") {
    return { tag: "battleStateInitIssue", message: issue.message };
  }
  return issue;
}

function battleInitializationIssue(
  facts: BattleInitializationIssueFacts,
  message: string,
  ownerPath?: readonly (string | number)[],
): BattleInitializationLeafIssue {
  return {
    tag: "battleStateInitIssue",
    message,
    ...facts,
    ...(ownerPath === undefined ? {} : { ownerPath }),
  };
}

function battleInitializationLeafIssueFromStateIssue(
  issue: BattleStateInitLeafIssue,
  fallbackFacts: BattleInitializationIssueFacts,
  ownerPath?: readonly (string | number)[],
): BattleInitializationLeafIssue {
  if (issue.tag === "statBlockResourceGraphIssue") {
    if (!("combatantId" in fallbackFacts) || ownerPath === undefined) {
      return battleInitializationIssue(
        fallbackFacts,
        battleStateInitIssueMessage(issue),
        ownerPath,
      );
    }
    return {
      tag: issue.tag,
      issues: issue.issues,
      combatantId: fallbackFacts.combatantId,
      ownerPath,
    };
  }
  const resolvedOwnerPath = issue.ownerPath ?? ownerPath;
  if (issue.tag === "weaponLoadoutMismatch") {
    return resolvedOwnerPath === undefined
      ? issue
      : { ...issue, ownerPath: resolvedOwnerPath };
  }
  if ("kind" in issue) {
    return resolvedOwnerPath === undefined
      ? issue
      : { ...issue, ownerPath: resolvedOwnerPath };
  }
  return {
    ...issue,
    ...fallbackFacts,
    ...(resolvedOwnerPath === undefined
      ? {}
      : { ownerPath: resolvedOwnerPath }),
  };
}

function battleInitializationIssueFromLeafIssues(
  issues: ReadonlyNonEmptyArray<BattleInitializationLeafIssue>,
): Result.Result<never, BattleInitializationIssue> {
  const [first, second, ...rest] = issues;
  return second === undefined
    ? Result.fail(first)
    : Result.fail({
        tag: "battleStateInitIssues",
        issues: [first, second, ...rest],
      });
}

function battleInitializationFactsForAdmission(
  combatant: BattleCreatureAdmissionInit,
  issue: BattleStateInitLeafIssue | BattleUnitSupportProfileIssue,
  issueIndex: number,
): BattleInitializationIssueFacts {
  return issue.tag === "battleUnitSupportProfileIssue"
    ? {
        kind: "characterAdmissionInvalid",
        combatantId: combatant.combatantId,
        phase: "executionBindings",
        issueIndex,
      }
    : {
        kind: "runtimeAdmissionInvalid",
        combatantId: combatant.combatantId,
        origin:
          combatant.creatureInit.kind === "character"
            ? "character"
            : "statBlock",
        issueIndex,
      };
}

export function battleStateInitIssueFromAdmissionIssues(
  issues: ReadonlyNonEmptyArray<
    BattleStateInitLeafIssue | BattleUnitSupportProfileIssue
  >,
): Result.Result<never, BattleStateInitIssue> {
  const first = admissionIssueToInitIssue(issues[0]);
  if (issues.length === 1) {
    return Result.fail(first);
  }
  const second = admissionIssueToInitIssue(issues[1]);
  const rest = issues.slice(2).map(admissionIssueToInitIssue);
  return battleStateInitIssues(first, second, ...rest);
}

const InitialInitiativeSetupBrand: unique symbol = Symbol(
  "InitialInitiativeSetup",
);
const InitialInitiativeSetupOpen: unique symbol = Symbol(
  "InitialInitiativeSetupOpen",
);
const InitialInitiativeSetupHasConsumedSwap: unique symbol = Symbol(
  "InitialInitiativeSetupHasConsumedSwap",
);
const InitialInitiativeSetupConsumeSwap: unique symbol = Symbol(
  "InitialInitiativeSetupConsumeSwap",
);
const InitialInitiativeSetupFinish: unique symbol = Symbol(
  "InitialInitiativeSetupFinish",
);

class InitialInitiativeSetupWorkflow {
  readonly [InitialInitiativeSetupBrand] = true;
  #state: BattleState;
  readonly #context: BattleRuntimeContext;
  #setupOpen = true;
  readonly #consumedInitiativeSwapSources = new Set<CombatantId>();

  constructor(session: BattleRuntimeSession) {
    this.#state = session.state;
    this.#context = session.context;
  }

  get state(): BattleState {
    return this.#state;
  }

  get [InitialInitiativeSetupOpen](): boolean {
    return this.#setupOpen;
  }

  [InitialInitiativeSetupHasConsumedSwap](sourceId: CombatantId): boolean {
    return this.#consumedInitiativeSwapSources.has(sourceId);
  }

  [InitialInitiativeSetupConsumeSwap](
    sourceId: CombatantId,
    state: BattleState,
  ): void {
    this.#consumedInitiativeSwapSources.add(sourceId);
    this.#state = state;
  }

  [InitialInitiativeSetupFinish](): BattleRuntimeSession {
    this.#setupOpen = false;
    return battleRuntimeSessionFromAdmittedContext(this.#state, this.#context);
  }
}

export function battleInitializationIssueLeaves(
  issue: BattleInitializationIssue,
): ReadonlyNonEmptyArray<BattleInitializationLeafIssue> {
  return Match.value(issue).pipe(
    Match.when({ tag: "battleStateInitIssues" }, ({ issues }) => {
      const [firstIssue, ...restIssues] = issues;
      return prependBattleInitializationLeaves(
        battleInitializationIssueLeaves(firstIssue),
        restIssues.flatMap(battleInitializationIssueLeaves),
      );
    }),
    Match.when({ tag: "battleStateInitIssue" }, battleInitializationLeafList),
    Match.when(
      { tag: "statBlockResourceGraphIssue" },
      battleInitializationLeafList,
    ),
    Match.when(
      { tag: "statBlockProjectionFailure" },
      battleInitializationLeafList,
    ),
    Match.when({ tag: "weaponLoadoutMismatch" }, battleInitializationLeafList),
    Match.exhaustive,
  );
}

export function battleInitializationIssueMessage(
  issue: BattleInitializationIssue,
): string {
  return battleInitializationIssueLeaves(issue)
    .map((leaf) =>
      Match.value(leaf).pipe(
        Match.discriminatorsExhaustive("tag")({
          battleStateInitIssue: battleStateInitIssueMessage,
          statBlockResourceGraphIssue: battleStateInitIssueMessage,
          statBlockProjectionFailure: ({ failure }) =>
            battleStatBlockProjectionFailureMessage(failure),
          weaponLoadoutMismatch: battleStateInitIssueMessage,
        }),
      ),
    )
    .join(" ");
}

function battleInitializationLeafList(
  leaf: BattleInitializationLeafIssue,
): ReadonlyNonEmptyArray<BattleInitializationLeafIssue> {
  return [leaf];
}

function prependBattleInitializationLeaves(
  first: ReadonlyNonEmptyArray<BattleInitializationLeafIssue>,
  rest: readonly BattleInitializationLeafIssue[],
): ReadonlyNonEmptyArray<BattleInitializationLeafIssue> {
  const [firstLeaf, ...restLeaves] = first;
  return [firstLeaf, ...restLeaves, ...rest];
}

export function battleInitializationIssueFactFields(
  facts: BattleInitializationIssueFacts,
): BattleInitializationIssueFact {
  return Match.value(facts).pipe(
    Match.discriminatorsExhaustive("kind")({
      emptyRoster: ({ kind }) => ({ reason: kind }),
      duplicateCombatantId: ({ kind, combatantId }) => ({
        reason: kind,
        combatantId,
      }),
      ammunitionStockInvalid: ({ kind, combatantId, ammunition }) => ({
        reason: kind,
        combatantId,
        ammunition,
      }),
      currentHpExceedsMaximum: ({
        kind,
        combatantId,
        currentHp,
        maximumHp,
      }) => ({
        reason: kind,
        combatantId,
        currentHp,
        maximumHp,
      }),
      positiveHpUnconsciousInvalid: ({ kind, combatantId, requirement }) => ({
        reason: kind,
        combatantId,
        requirement,
      }),
      zeroHpLifecycleInvalid: ({ kind, combatantId, requirement }) => ({
        reason: kind,
        combatantId,
        requirement,
      }),
      initialConditionImmune: ({ kind, combatantId, condition }) => ({
        reason: kind,
        combatantId,
        condition,
      }),
      statBlockSourceInvalid: ({ kind, statBlockId, constraint }) => ({
        reason: kind,
        statBlockId,
        constraint,
      }),
      statBlockCombatantInvalid: ({ kind, combatantId, constraint }) => ({
        reason: kind,
        combatantId,
        constraint,
      }),
      characterClassLevelsInvalid: ({ kind, combatantId, issueIndex }) => ({
        reason: kind,
        combatantId,
        issueIndex,
      }),
      characterSupportProjectionInvalid: ({
        kind,
        combatantId,
        issueIndex,
      }) => ({
        reason: kind,
        combatantId,
        issueIndex,
      }),
      characterResourceInvalid: ({ kind, combatantId, issueIndex }) => ({
        reason: kind,
        combatantId,
        issueIndex,
      }),
      characterFeatureInvalid: ({ kind, combatantId, issueIndex }) => ({
        reason: kind,
        combatantId,
        issueIndex,
      }),
      characterSpellcastingInvalid: ({ kind, combatantId, issueIndex }) => ({
        reason: kind,
        combatantId,
        issueIndex,
      }),
      characterAdmissionInvalid: ({
        kind,
        combatantId,
        phase,
        issueIndex,
      }) => ({
        reason: kind,
        combatantId,
        phase,
        issueIndex,
      }),
      executionScopeUnavailable: ({ kind, combatantId }) => ({
        reason: kind,
        combatantId,
      }),
      runtimeContextMissing: ({ kind, combatantId }) => ({
        reason: kind,
        combatantId,
      }),
      weaponPresentationUnavailable: ({
        kind,
        combatantId,
        weaponUnitId,
        availability,
      }) => ({
        reason: kind,
        combatantId,
        weaponUnitId,
        availability,
      }),
      hidePrerequisiteReferencesUnknownCombatant: ({
        kind,
        combatantId,
        referencedCombatantId,
      }) => ({
        reason: kind,
        combatantId,
        referencedCombatantId,
      }),
      hidePrerequisiteSelfReference: ({ kind, combatantId }) => ({
        reason: kind,
        combatantId,
      }),
      initialCombatantOrderMissing: ({ kind, combatantId }) => ({
        reason: kind,
        combatantId,
      }),
      initialInitiativeInvalid: ({ kind, initializationReason }) => ({
        reason: kind,
        initializationReason,
      }),
      runtimeAdmissionInvalid: ({ kind, combatantId, origin, issueIndex }) => ({
        reason: kind,
        combatantId,
        origin,
        issueIndex,
      }),
      companionOwnerMissing: ({ kind, ownerId }) => ({
        reason: kind,
        ownerId,
      }),
      companionDurableIdentityMissing: ({ kind, ownerId }) => ({
        reason: kind,
        ownerId,
      }),
      companionOwnerAlreadyHasCompanion: ({ kind, ownerId }) => ({
        reason: kind,
        ownerId,
      }),
      companionDurableIdentityInUse: ({
        kind,
        ownerId,
        durableCompanionId,
        existingOwnerId,
      }) => ({
        reason: kind,
        ownerId,
        durableCompanionId,
        existingOwnerId,
      }),
      companionManifestationInvalid: ({ kind, ownerId, requirement }) => ({
        reason: kind,
        ownerId,
        requirement,
      }),
      companionFormStatBlockMissing: ({
        kind,
        formAccess,
        resolvedStatBlockId,
      }) => ({
        reason: kind,
        formAccess,
        resolvedStatBlockId,
      }),
      companionFormAccessMismatch: ({
        kind,
        storedFormAccess,
        eligibilityFormAccess,
      }) => ({
        reason: kind,
        storedFormAccess,
        eligibilityFormAccess,
      }),
      companionFormResolvedStatBlockMismatch: ({
        kind,
        formAccess,
        expectedStatBlockId,
        resolvedStatBlockId,
      }) => ({
        reason: kind,
        formAccess,
        expectedStatBlockId,
        resolvedStatBlockId,
      }),
      companionFormSelectionStatBlockMissing: ({
        kind,
        formAccess,
        selectedStatBlockId,
      }) => ({
        reason: kind,
        formAccess,
        selectedStatBlockId,
      }),
      companionFormSelectionStatBlockInvalid: ({
        kind,
        formAccess,
        selectedStatBlockId,
        expectedCreatureType,
        expectedChallengeRating,
      }) => ({
        reason: kind,
        formAccess,
        selectedStatBlockId,
        expectedCreatureType,
        expectedChallengeRating,
      }),
      companionFormSpecialFormUnknown: ({ kind, formAccess, formId }) => ({
        reason: kind,
        formAccess,
        formId,
      }),
      companionFormNormalFormIneligible: ({ kind, formAccess, formId }) => ({
        reason: kind,
        formAccess,
        formId,
      }),
      companionCombatantAdmissionInvalid: ({
        kind,
        ownerId,
        companionCombatantId,
      }) => ({
        reason: kind,
        ownerId,
        companionCombatantId,
      }),
      companionInitialInitiativeInvalid: ({
        kind,
        ownerId,
        companionCombatantId,
        requirement,
      }) => ({
        reason: kind,
        ownerId,
        companionCombatantId,
        requirement,
      }),
      companionOwnerRuntimeContextMissing: ({ kind, ownerId }) => ({
        reason: kind,
        ownerId,
      }),
      companionPresentationStatBlockMissing: ({
        kind,
        companionCombatantId,
        statBlockId,
      }) => ({
        reason: kind,
        companionCombatantId,
        statBlockId,
      }),
      companionPresentationCombatantMissing: ({
        kind,
        companionCombatantId,
        statBlockId,
      }) => ({
        reason: kind,
        companionCombatantId,
        statBlockId,
      }),
    }),
  );
}

export type InitialInitiativeSetup = InitialInitiativeSetupWorkflow;

export type BattleStartInput = {
  readonly battleId: BattleId;
  readonly combatants: readonly BattleCreatureInit[];
  readonly hidePrerequisites?: ReadonlyMap<CombatantId, BattleHidePrerequisite>;
  readonly ownerPathForCombatant?: (
    combatant: BattleCreatureInit,
    index: number,
  ) => readonly (string | number)[];
};

export function startBattleWithInitialInitiativeSetup(
  input: BattleStartInput,
): Result.Result<InitialInitiativeSetup, BattleInitializationIssue> {
  const session = startBattle(input);
  return Result.isFailure(session)
    ? Result.fail(session.failure)
    : Result.succeed(initialInitiativeSetupState(session.success));
}

export function finishInitialInitiativeSetup(
  setup: InitialInitiativeSetup,
): BattleRuntimeSession {
  return setup[InitialInitiativeSetupFinish]();
}

function initialInitiativeSetupState(
  session: BattleRuntimeSession,
): InitialInitiativeSetup {
  return new InitialInitiativeSetupWorkflow(session);
}

export function requiredInitiativeRollModeForCombatant(
  state: BattleState,
  combatantId: CombatantId,
): AttackRollMode | undefined {
  const combatant = state.combatants.get(combatantId);
  if (combatant?.origin.kind !== "character") {
    return undefined;
  }
  const hasRemarkableAthleteAdvantage = characterUnitProcedureBindings(
    combatant.origin.execution,
  ).some(({ procedure }) =>
    Match.value(procedure).pipe(
      Match.discriminatorsExhaustive("kind")({
        unitFeature: ({ execution }) =>
          execution.kind === "remarkableAthlete" &&
          execution.remarkableAthlete.initiative.kind === "rollAdvantage" &&
          execution.remarkableAthlete.initiative.roll === "initiative",
        unitSupportProfile: () => false,
      }),
    ),
  );
  return hasRemarkableAthleteAdvantage ? "advantage" : undefined;
}

type ValidBattleCreatureAdmission = Extract<
  ReturnType<typeof battleCreatureStateAdmissionFromInit>,
  { readonly tag: "admitted" }
>;

type InitialBattleAdmissionAccumulator = {
  readonly initializationIssues: BattleInitializationLeafIssue[];
  readonly seenCombatantIds: Set<CombatantId>;
  readonly combatants: Map<CombatantId, BattleCreatureState>;
  readonly executionScopeCursors: Map<
    CombatantId,
    BattleExecutionScopeAllocation
  >;
  readonly characterContexts: Map<CombatantId, CharacterBattleRuntimeContext>;
  readonly statBlockPresentations: Map<
    CombatantId,
    BattleStatBlockPresentationSource
  >;
};

function initialBattleAdmissionAccumulator(): InitialBattleAdmissionAccumulator {
  return {
    initializationIssues: [],
    seenCombatantIds: new Set(),
    combatants: new Map(),
    executionScopeCursors: new Map(),
    characterContexts: new Map(),
    statBlockPresentations: new Map(),
  };
}

function appendDuplicateCombatantIssue(
  accumulator: InitialBattleAdmissionAccumulator,
  combatant: Pick<BattleCreatureInit, "combatantId">,
  ownerPath: readonly (string | number)[],
): boolean {
  const duplicate = accumulator.seenCombatantIds.has(combatant.combatantId);
  accumulator.seenCombatantIds.add(combatant.combatantId);
  if (!duplicate) return false;
  accumulator.initializationIssues.push(
    duplicateCombatantIdIssue(combatant.combatantId, ownerPath),
  );
  return true;
}

function appendPositiveHpUnconsciousIssue(
  accumulator: InitialBattleAdmissionAccumulator,
  combatant: BattleCreatureAdmissionInit,
  ownerPath: readonly (string | number)[],
): boolean {
  const issue = positiveHpUnconsciousInitIssue(combatant);
  if (issue === null || !Result.isFailure(issue)) return issue !== null;
  accumulator.initializationIssues.push(
    ...battleStateInitIssueLeaves(issue.failure).map((leaf) =>
      battleInitializationLeafIssueFromStateIssue(
        leaf,
        {
          kind: "positiveHpUnconsciousInvalid",
          combatantId: combatant.combatantId,
          requirement: "oneCurrentHp",
        },
        ownerPath,
      ),
    ),
  );
  return true;
}

function appendInvalidBattleCreatureAdmissionIssues(
  accumulator: InitialBattleAdmissionAccumulator,
  combatant: BattleCreatureAdmissionInit,
  admission: ReturnType<typeof battleCreatureStateAdmissionFromInit>,
  ownerPath: readonly (string | number)[],
): admission is ValidBattleCreatureAdmission {
  if (admission.tag !== "invalid") return true;
  accumulator.initializationIssues.push(
    ...admission.issues.map((issue, issueIndex) =>
      battleInitializationLeafIssueFromStateIssue(
        admissionIssueToInitIssue(issue),
        battleInitializationFactsForAdmission(combatant, issue, issueIndex),
        ownerPath,
      ),
    ),
  );
  return false;
}

function recordValidInitialBattleCombatant(input: {
  readonly accumulator: InitialBattleAdmissionAccumulator;
  readonly combatant: BattleCreatureAdmissionInit;
  readonly admission: ValidBattleCreatureAdmission;
  readonly ownerPath: readonly (string | number)[];
}): void {
  const { accumulator, combatant, admission, ownerPath } = input;
  accumulator.combatants.set(combatant.combatantId, admission.creature);
  if (
    "runtimeContext" in admission &&
    combatant.creatureInit.kind === "character" &&
    "displayName" in combatant
  ) {
    accumulator.characterContexts.set(combatant.combatantId, {
      ...admission.runtimeContext,
      displayName: combatant.displayName,
    });
  }
  if ("statBlockPresentation" in admission) {
    accumulator.statBlockPresentations.set(
      combatant.combatantId,
      admission.statBlockPresentation,
    );
  }
  if (admission.nextScopeOrdinal <= 0) {
    accumulator.initializationIssues.push(
      battleInitializationIssue(
        {
          kind: "executionScopeUnavailable",
          combatantId: combatant.combatantId,
        },
        `Combatant ${combatant.combatantId} admission allocated no execution scope.`,
        ownerPath,
      ),
    );
    accumulator.combatants.delete(combatant.combatantId);
    accumulator.characterContexts.delete(combatant.combatantId);
    accumulator.statBlockPresentations.delete(combatant.combatantId);
    return;
  }
  accumulator.executionScopeCursors.set(combatant.combatantId, {
    kind: "active",
    nextScopeOrdinal: battleExecutionScopeCursor(admission.nextScopeOrdinal),
  });
}

function admitInitialBattleCombatant(input: {
  readonly battleId: BattleId;
  readonly combatant: BattleCreatureAdmissionInit;
  readonly index: number;
  readonly ownerPath: readonly (string | number)[];
  readonly accumulator: InitialBattleAdmissionAccumulator;
  readonly duplicate: boolean;
}): void {
  const { accumulator, combatant, duplicate, ownerPath } = input;
  const hasPositiveHpUnconsciousIssue = appendPositiveHpUnconsciousIssue(
    accumulator,
    combatant,
    ownerPath,
  );
  const admission = battleCreatureStateAdmissionFromInit(
    input.battleId,
    combatant,
    battleExecutionScopeOrdinal(0),
  );
  if (
    !appendInvalidBattleCreatureAdmissionIssues(
      accumulator,
      combatant,
      admission,
      ownerPath,
    )
  ) {
    return;
  }
  if (duplicate || hasPositiveHpUnconsciousIssue) return;
  recordValidInitialBattleCombatant({
    accumulator,
    combatant,
    admission,
    ownerPath,
  });
}

function isAuthoredStatBlockBattleInitInput(
  input: BattleCreatureInit,
): input is AuthoredStatBlockBattleInitInput {
  return Match.value(input).pipe(
    Match.when({ statBlock: Match.defined }, () => true),
    Match.when({ creatureInit: Match.defined }, () => false),
    Match.exhaustive,
  );
}

function projectBattleCreatureAdmissionInit(
  input: BattleCreatureInit,
  ownerPath: readonly (string | number)[],
): Result.Result<BattleCreatureAdmissionInit, BattleInitializationLeafIssue> {
  if (!isAuthoredStatBlockBattleInitInput(input)) {
    return Result.succeed(input);
  }
  const projected = projectAuthoredStatBlockBattleInit(input);
  if (Result.isSuccess(projected)) return Result.succeed(projected.success);
  if (projected.failure.tag === "statBlockProjectionFailure") {
    return Result.fail({
      ...projected.failure,
      combatantId: input.combatantId,
      ownerPath,
    });
  }
  return Result.fail(
    battleInitializationLeafIssueFromStateIssue(
      projected.failure,
      {
        kind: "runtimeAdmissionInvalid",
        combatantId: input.combatantId,
        origin: "statBlock",
        issueIndex: 0,
      },
      ownerPath,
    ),
  );
}

function admitInitialBattleCombatants(
  input: BattleStartInput,
): InitialBattleAdmissionAccumulator {
  const accumulator = initialBattleAdmissionAccumulator();
  for (const [index, combatantInput] of input.combatants.entries()) {
    const ownerPath =
      input.ownerPathForCombatant?.(combatantInput, index) ??
      (["initialCombatants", index] as const);
    const duplicate = appendDuplicateCombatantIssue(
      accumulator,
      combatantInput,
      ownerPath,
    );
    const projected = projectBattleCreatureAdmissionInit(
      combatantInput,
      ownerPath,
    );
    if (Result.isFailure(projected)) {
      accumulator.initializationIssues.push(projected.failure);
      continue;
    }
    admitInitialBattleCombatant({
      battleId: input.battleId,
      combatant: projected.success,
      index,
      ownerPath,
      accumulator,
      duplicate,
    });
  }
  return accumulator;
}

function appendInitialHidePrerequisiteIssues(
  input: BattleStartInput,
  accumulator: InitialBattleAdmissionAccumulator,
): void {
  const hidePrerequisiteIssues = hidePrerequisitesReferenceCombatantsIssues(
    input.hidePrerequisites ?? new Map(),
    accumulator.combatants,
  );
  accumulator.initializationIssues.push(
    ...hidePrerequisiteIssues.map(
      ({ kind, combatantId, referencedCombatantId, issue }) =>
        battleInitializationLeafIssueFromStateIssue(
          issue,
          kind === "unknownCombatant"
            ? {
                kind: "hidePrerequisiteReferencesUnknownCombatant",
                combatantId,
                referencedCombatantId: referencedCombatantId ?? combatantId,
              }
            : { kind: "hidePrerequisiteSelfReference", combatantId },
          ownerPathForAdmittedCombatant(input, combatantId),
        ),
    ),
  );
}

function appendInitialInitiativeIssues(
  accumulator: InitialBattleAdmissionAccumulator,
  initiative: Result.Result<BattleState["initiative"], BattleStateInitIssue>,
): void {
  if (accumulator.combatants.size === 0 || Result.isSuccess(initiative)) return;
  accumulator.initializationIssues.push(
    ...battleStateInitIssueLeaves(initiative.failure).map((issue) =>
      battleInitializationLeafIssueFromStateIssue(
        issue,
        {
          kind: "initialInitiativeInvalid",
          initializationReason: "stackConstruction",
        },
        ["battleInitialization", "initiative"],
      ),
    ),
  );
}

function initialBattleState(
  input: BattleStartInput,
  accumulator: InitialBattleAdmissionAccumulator,
): Result.Result<BattleState, BattleInitializationIssue> {
  const initiative = createInitialInitiativeForCombatants({
    combatants: [...accumulator.combatants.values()],
    emptyRosterMessage: "startBattle requires at least one combatant.",
  });
  appendInitialInitiativeIssues(accumulator, initiative);
  if (Result.isFailure(initiative)) {
    if (isNonEmptyReadonlyArray(accumulator.initializationIssues)) {
      return battleInitializationIssueFromLeafIssues(
        accumulator.initializationIssues,
      );
    }
    return Result.fail(
      battleInitializationIssue(
        {
          kind: "initialInitiativeInvalid",
          initializationReason: "emptyRoster",
        },
        initiative.failure.tag === "battleStateInitIssue"
          ? initiative.failure.message
          : "Battle initialization could not create an initiative stack.",
        ["battleInitialization", "initiative"],
      ),
    );
  }
  if (
    accumulator.initializationIssues.length > 0 &&
    accumulator.combatants.size === 0 &&
    isNonEmptyReadonlyArray(accumulator.initializationIssues)
  ) {
    return battleInitializationIssueFromLeafIssues(
      accumulator.initializationIssues,
    );
  }
  return Result.succeed({
    battleId: input.battleId,
    initiative: initiative.success,
    combatants: accumulator.combatants,
    executionScopeCursors: accumulator.executionScopeCursors,
    companions: new Map(),
    groundObjects: new Map(),
    objectOutlines: [],
    lightEmitters: [],
    hidePrerequisites: new Map(input.hidePrerequisites ?? []),
    currentTurnResources: INITIAL_TURN_RESOURCES,
    subjectResolutionPhase: { kind: "subjectSelection" },
    readiedSpells: new Map(),
    readiedResponses: new Map(),
    helpAttacks: [],
    grapples: [],
    interruptStack: [],
    legendaryActionWindow: null,
  });
}

function appendCharacterWeaponPresentationIssues(input: {
  readonly combatant: CharacterBattleCreatureState;
  readonly characterContext: CharacterBattleRuntimeContext;
  readonly ownerPath: readonly (string | number)[];
  readonly initializationIssues: BattleInitializationLeafIssue[];
}): void {
  for (const attack of [
    input.combatant.origin.attack,
    input.combatant.origin.offHandAttack,
  ]) {
    if (attack == null) continue;
    const presentationSource = characterWeaponPresentationSource(
      input.characterContext,
      attack.weapon.weaponUnitId,
    );
    if (Result.isFailure(presentationSource)) {
      input.initializationIssues.push(
        battleInitializationIssue(
          {
            kind: "weaponPresentationUnavailable",
            combatantId: input.combatant.combatantId,
            weaponUnitId: attack.weapon.weaponUnitId,
            availability: presentationSource.failure.reason,
          },
          `Character ${input.combatant.combatantId} weapon ${attack.weapon.weaponUnitId} has ${presentationSource.failure.reason} authored presentation source.`,
          input.ownerPath,
        ),
      );
    }
  }
}

function initializeCharacterBattleExecutions(input: {
  readonly state: BattleState;
  readonly battleInput: BattleStartInput;
  readonly characterContexts: Map<CombatantId, CharacterBattleRuntimeContext>;
  readonly initializationIssues: BattleInitializationLeafIssue[];
}): Map<CombatantId, BattleCreatureState> {
  const combatantsWithCharacterExecutions = new Map(input.state.combatants);
  for (const [combatantId, combatant] of input.state.combatants) {
    if (!isCharacterBattleCreatureState(combatant)) continue;
    const characterContext = input.characterContexts.get(combatantId);
    if (characterContext === undefined) {
      input.initializationIssues.push(
        battleInitializationIssue(
          { kind: "runtimeContextMissing", combatantId },
          `Character ${combatantId} is missing its runtime context.`,
          ownerPathForAdmittedCombatant(input.battleInput, combatantId),
        ),
      );
      continue;
    }
    appendCharacterWeaponPresentationIssues({
      combatant,
      characterContext,
      ownerPath: ownerPathForAdmittedCombatant(input.battleInput, combatantId),
      initializationIssues: input.initializationIssues,
    });
    const spellAdmission = admitCharacterSpellExecution({
      combatant,
      state: input.state,
      runtimeContext: characterContext,
    });
    combatantsWithCharacterExecutions.set(combatantId, spellAdmission.creature);
    input.characterContexts.set(combatantId, spellAdmission.runtimeContext);
  }
  return combatantsWithCharacterExecutions;
}

export function startBattle(
  input: BattleStartInput,
): Result.Result<BattleRuntimeSession, BattleInitializationIssue> {
  if (input.combatants.length === 0) {
    return Result.fail(
      battleInitializationIssue(
        { kind: "emptyRoster" },
        "startBattle requires at least one combatant.",
      ),
    );
  }
  const admission = admitInitialBattleCombatants(input);
  appendInitialHidePrerequisiteIssues(input, admission);
  const state = initialBattleState(input, admission);
  if (Result.isFailure(state)) return Result.fail(state.failure);
  const combatantsWithCharacterExecutions = initializeCharacterBattleExecutions(
    {
      state: state.success,
      battleInput: input,
      characterContexts: admission.characterContexts,
      initializationIssues: admission.initializationIssues,
    },
  );
  if (isNonEmptyReadonlyArray(admission.initializationIssues)) {
    return battleInitializationIssueFromLeafIssues(
      admission.initializationIssues,
    );
  }
  return Result.succeed(
    battleRuntimeSessionFromAdmittedContext(
      {
        ...state.success,
        combatants: combatantsWithCharacterExecutions,
      },
      battleRuntimeContextFromCharacterAdmission(
        admission.characterContexts,
        admission.statBlockPresentations,
      ),
    ),
  );
}

function ownerPathForAdmittedCombatant(
  input: BattleStartInput,
  combatantId: CombatantId,
): readonly (string | number)[] {
  const index = input.combatants.findIndex(
    (candidate) => candidate.combatantId === combatantId,
  );
  const combatant = input.combatants[index];
  return combatant === undefined
    ? (["battleInitialization", "hidePrerequisite"] as const)
    : (input.ownerPathForCombatant?.(combatant, index) ??
        (["initialCombatants", index] as const));
}

type InitialInitiativeCombatant = Pick<
  BattleCreatureState,
  "combatantId" | "initiative"
>;

export function createInitialInitiativeForCombatants(input: {
  readonly combatants: readonly InitialInitiativeCombatant[];
  readonly initialCombatantOrder?: ReadonlyMap<CombatantId, number>;
  readonly emptyRosterMessage: string;
}): Result.Result<BattleState["initiative"], BattleStateInitIssue> {
  if (input.initialCombatantOrder !== undefined) {
    for (const combatant of input.combatants) {
      if (!input.initialCombatantOrder.has(combatant.combatantId)) {
        return battleStateInitIssue(
          "Initial combatant order must include every combatant.",
        );
      }
    }
  }
  const orderedEntries = input.combatants
    .map((combatant, insertionOrder) => ({
      combatant,
      callerOrder:
        input.initialCombatantOrder?.get(combatant.combatantId) ??
        insertionOrder,
    }))
    .sort(
      (left, right) =>
        right.combatant.initiative - left.combatant.initiative ||
        left.callerOrder - right.callerOrder,
    )
    .map(({ combatant }) => ({
      creature: combatant.combatantId,
      initiative: combatant.initiative,
    }));
  if (!isNonEmptyReadonlyArray(orderedEntries)) {
    return battleStateInitIssue(input.emptyRosterMessage);
  }

  const initiative = createScoredInitiativeStack<CombatantId>(
    orderedEntries,
    INITIAL_ROUND,
  );
  return Result.isFailure(initiative)
    ? battleStateInitIssue(initiative.failure)
    : Result.succeed(initiative.success);
}

export type InitiativeSwapCandidateWitness =
  | { readonly tag: "notAlly" }
  | { readonly tag: "unwillingAlly" }
  | { readonly tag: "willingAlly" };

const byInitiativeSwapCandidateWitnessTag = Match.discriminator("tag");

export function applyInitiativeSwap(input: {
  readonly setup: InitialInitiativeSetup;
  readonly sourceId: CombatantId;
  readonly candidateId: CombatantId;
  readonly candidateWitness: InitiativeSwapCandidateWitness;
}): Result.Result<void, BattleStateInitIssue> {
  const state = input.setup.state;
  if (!input.setup[InitialInitiativeSetupOpen]) {
    return battleStateInitIssue(
      "Initial Initiative setup is already complete.",
    );
  }
  if (input.sourceId === input.candidateId) {
    return battleStateInitIssue(
      "Initiative Swap requires a distinct willing ally.",
    );
  }
  if (input.setup[InitialInitiativeSetupHasConsumedSwap](input.sourceId)) {
    return battleStateInitIssue(
      "Initiative Swap source has already used its post-roll swap opportunity.",
    );
  }
  /* v8 ignore start -- @preserve -- An open setup workflow can only change state through Initiative Swap, which preserves the initial empty already-acted collection. */
  if (state.initiative.alreadyActed.length > 0) {
    return battleStateInitIssue(
      "Initiative Swap is only available immediately after rolling Initiative.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const source = state.combatants.get(input.sourceId);
  if (source === undefined) {
    return battleStateInitIssue(
      "Initiative Swap source must be a combatant in this battle.",
    );
  }
  const candidate = state.combatants.get(input.candidateId);
  if (candidate === undefined) {
    return battleStateInitIssue(
      "Initiative Swap candidate must be a combatant in this battle.",
    );
  }
  if (!combatantHasInitiativeProficiencyAndSwap(source)) {
    return battleStateInitIssue(
      "Initiative Swap source lacks an admitted Initiative swap support profile.",
    );
  }
  const candidateIssue = Match.value(input.candidateWitness).pipe(
    byInitiativeSwapCandidateWitnessTag("notAlly", () =>
      battleStateInitIssue(
        "Initiative Swap requires an ally in the same combat.",
      ),
    ),
    byInitiativeSwapCandidateWitnessTag("unwillingAlly", () =>
      battleStateInitIssue("Initiative Swap requires a willing ally."),
    ),
    byInitiativeSwapCandidateWitnessTag("willingAlly", () => null),
    Match.exhaustive,
  );
  if (candidateIssue !== null) {
    return candidateIssue;
  }
  if (
    isIncapacitated(source.conditions) ||
    isIncapacitated(candidate.conditions)
  ) {
    return battleStateInitIssue(
      "Initiative Swap is blocked while either combatant is Incapacitated.",
    );
  }

  const initiative = swapInitialInitiativeScores(
    state.initiative,
    input.sourceId,
    input.candidateId,
  );
  if (Option.isNone(initiative)) {
    return battleStateInitIssue("Initiative Swap could not update Initiative.");
  }

  const combatants = new Map(state.combatants);
  combatants.set(input.sourceId, {
    ...source,
    initiative: candidate.initiative,
  });
  combatants.set(input.candidateId, {
    ...candidate,
    initiative: source.initiative,
  });
  input.setup[InitialInitiativeSetupConsumeSwap](input.sourceId, {
    ...state,
    combatants,
    initiative: initiative.value,
  });
  return Result.succeed(undefined);
}

function combatantHasInitiativeProficiencyAndSwap(
  combatant: BattleCreatureState,
): boolean {
  return (
    combatant.origin.kind === "character" &&
    combatant.origin.execution.procedureBindings.some((binding) => {
      const procedure = binding.procedure;
      return (
        (procedure.kind === "unitFeature" ||
          procedure.kind === "unitSupportProfile") &&
        typeof procedure.execution === "object" &&
        procedure.execution.kind === "initiativeProficiencyAndSwap"
      );
    })
  );
}

type AddBattleCombatantInput = {
  readonly state: BattleState;
  readonly combatant: BattleCreatureInit;
  readonly tieOrderIndex?: number;
  readonly ownerPath?: readonly (string | number)[];
};

type AddProjectedBattleCombatantInput = Omit<
  AddBattleCombatantInput,
  "combatant" | "ownerPath"
> & {
  readonly combatant: BattleCreatureAdmissionInit;
};

function admitCharacterSpellExecution(input: {
  readonly combatant: CharacterBattleCreatureState;
  readonly state: BattleState;
  readonly runtimeContext: CharacterBattleRuntimeContext;
}): {
  readonly creature: CharacterBattleCreatureState;
  readonly runtimeContext: CharacterBattleRuntimeContext;
} {
  const admitted = admittedSpellActs(
    input.combatant,
    input.state,
    input.runtimeContext.spellcastingPresentationSource,
  );
  const execution = characterExecutionWithSpellInvocations(
    input.combatant.origin.execution,
    admitted,
  );
  return {
    creature: {
      ...input.combatant,
      origin: {
        ...input.combatant.origin,
        execution,
      },
    },
    runtimeContext: {
      ...input.runtimeContext,
      spellPresentationSources: execution.procedureBindings.flatMap(
        ({ procedureRef, procedure }) =>
          Match.value(procedure).pipe(
            Match.discriminatorsExhaustive("kind")({
              spellInvocation: () => {
                const storedExecution = characterSpellProcedureExecution(
                  execution,
                  procedureRef,
                );
                const invocation =
                  storedExecution === undefined
                    ? undefined
                    : admitted.find((candidate) =>
                        spellInvocationMatchesExecution(
                          candidate,
                          storedExecution,
                        ),
                      );
                return invocation === undefined
                  ? []
                  : [
                      {
                        procedureRef,
                        invocation: bindAuthoredSelectedSpellInvocation(
                          invocation,
                          procedureRef,
                        ),
                      },
                    ];
              },
              /* v8 ignore next -- @preserve -- Fresh lifecycle admission allocates a new execution, then adds only currently admitted spells, so it cannot contain a retained unavailable spell binding. */
              unavailableSpellInvocation: () => [],
              effectOccurrenceSource: () => [],
              unitFeature: () => [],
              unitSupportProfile: () => [],
            }),
          ),
      ),
    },
  };
}

function statBlockPresentationForAdmission(
  admission: Extract<
    ReturnType<typeof battleCreatureStateAdmissionFromInit>,
    { readonly tag: "admitted" }
  >,
): BattleStatBlockPresentationSource | undefined {
  return "statBlockPresentation" in admission
    ? admission.statBlockPresentation
    : undefined;
}

function admitBattleCombatant(
  input: AddProjectedBattleCombatantInput,
): Result.Result<
  {
    readonly state: BattleState;
    readonly characterContext?: CharacterBattleRuntimeContext;
    readonly statBlockPresentation?: BattleStatBlockPresentationSource;
  },
  BattleStateInitIssue
> {
  if (input.state.combatants.has(input.combatant.combatantId)) {
    return Result.fail(duplicateCombatantIdIssue(input.combatant.combatantId));
  }
  const positiveHpUnconsciousIssue = positiveHpUnconsciousInitIssue(
    input.combatant,
  );
  if (positiveHpUnconsciousIssue !== null) {
    return positiveHpUnconsciousIssue;
  }
  const admission = battleCreatureStateAdmissionFromInit(
    input.state.battleId,
    input.combatant,
    battleExecutionScopeInitialOrNextOrdinal(
      input.state.executionScopeCursors.get(input.combatant.combatantId)
        ?.nextScopeOrdinal,
    ),
  );
  if (admission.tag === "invalid") {
    return battleStateInitIssueFromAdmissionIssues(admission.issues);
  }
  const combatantsWithAdmission = new Map(input.state.combatants).set(
    input.combatant.combatantId,
    admission.creature,
  );
  const stateWithAdmission = {
    ...input.state,
    combatants: combatantsWithAdmission,
  };
  const characterSpellAdmission =
    isCharacterBattleCreatureState(admission.creature) &&
    "runtimeContext" in admission
      ? admitCharacterSpellExecution({
          combatant: admission.creature,
          state: stateWithAdmission,
          runtimeContext: admission.runtimeContext,
        })
      : undefined;
  const admittedCreature =
    characterSpellAdmission?.creature ?? admission.creature;
  const nextCombatants = new Map(input.state.combatants).set(
    input.combatant.combatantId,
    admittedCreature,
  );
  const insertionIndex = combatantInitiativeInsertionIndex(
    input.state,
    input.combatant.initiative,
    input.tieOrderIndex,
  );
  const initiative = insertAtOrderIndex(
    input.state.initiative,
    insertionIndex,
    {
      creature: input.combatant.combatantId,
      initiative: input.combatant.initiative,
    },
  );
  const executionScopeCursors = new Map(input.state.executionScopeCursors);
  if (admission.nextScopeOrdinal <= 0) {
    return battleStateInitIssue(
      `Combatant ${input.combatant.combatantId} admission allocated no execution scope.`,
    );
  }
  executionScopeCursors.set(input.combatant.combatantId, {
    kind: "active",
    nextScopeOrdinal: battleExecutionScopeCursor(admission.nextScopeOrdinal),
  });

  return Result.succeed({
    state: {
      ...input.state,
      initiative,
      combatants: nextCombatants,
      executionScopeCursors,
    },
    ...(characterSpellAdmission === undefined
      ? {}
      : { characterContext: characterSpellAdmission.runtimeContext }),
    ...optionalProperty(
      "statBlockPresentation",
      statBlockPresentationForAdmission(admission),
    ),
  });
}

type PublicBattleCombatantAdmission = {
  readonly state: BattleState;
  readonly combatant: BattleCreatureAdmissionInit;
  readonly characterContext?: CharacterBattleRuntimeContext;
  readonly statBlockPresentation?: BattleStatBlockPresentationSource;
};

function admitPublicBattleCombatant(
  input: AddBattleCombatantInput,
): Result.Result<PublicBattleCombatantAdmission, BattleInitializationIssue> {
  const ownerPath = input.ownerPath ?? (["combatant"] as const);
  const projected = projectBattleCreatureAdmissionInit(
    input.combatant,
    ownerPath,
  );
  if (Result.isFailure(projected)) return Result.fail(projected.failure);
  const admitted = admitBattleCombatant({
    state: input.state,
    combatant: projected.success,
    ...optionalProperty("tieOrderIndex", input.tieOrderIndex),
  });
  if (Result.isSuccess(admitted)) {
    return Result.succeed({
      ...admitted.success,
      combatant: projected.success,
    });
  }
  const [firstStateIssue, ...remainingStateIssues] = battleStateInitIssueLeaves(
    admitted.failure,
  );
  const initializationIssueFor = (
    issue: BattleStateInitLeafIssue,
    issueIndex: number,
  ) =>
    battleInitializationLeafIssueFromStateIssue(
      issue,
      {
        kind: "runtimeAdmissionInvalid",
        combatantId: input.combatant.combatantId,
        origin: isAuthoredStatBlockBattleInitInput(input.combatant)
          ? "statBlock"
          : "character",
        issueIndex,
      },
      ownerPath,
    );
  return battleInitializationIssueFromLeafIssues([
    initializationIssueFor(firstStateIssue, 0),
    ...remainingStateIssues.map((issue, index) =>
      initializationIssueFor(issue, index + 1),
    ),
  ]);
}

export function addBattleCombatant(
  input: AddBattleCombatantInput,
): Result.Result<BattleState, BattleInitializationIssue> {
  const admission = admitPublicBattleCombatant(input);
  return Result.map(admission, ({ state }) => state);
}

export function addBattleRuntimeCombatant(input: {
  readonly session: BattleRuntimeSession;
  readonly combatant: BattleCreatureInit;
  readonly tieOrderIndex?: number;
  readonly ownerPath?: readonly (string | number)[];
}): Result.Result<BattleRuntimeSession, BattleInitializationIssue> {
  const admitted = admitPublicBattleCombatant({
    state: input.session.state,
    combatant: input.combatant,
    ...optionalProperty("tieOrderIndex", input.tieOrderIndex),
    ...optionalProperty("ownerPath", input.ownerPath),
  });
  return Result.map(admitted, (admission) => {
    const characters = new Map(input.session.context.characters);
    if (
      admission.characterContext !== undefined &&
      admission.combatant.creatureInit.kind === "character" &&
      "displayName" in admission.combatant
    ) {
      characters.set(admission.combatant.combatantId, {
        ...admission.characterContext,
        displayName: admission.combatant.displayName,
      });
    }
    const statBlocks = new Map(input.session.context.statBlocks);
    if (admission.statBlockPresentation !== undefined) {
      statBlocks.set(
        admission.combatant.combatantId,
        admission.statBlockPresentation,
      );
    }
    return battleRuntimeSessionFromAdmittedContext(
      admission.state,
      battleRuntimeContextFromCharacterAdmission(characters, statBlocks),
    );
  });
}

export function removeBattleRuntimeCombatants(input: {
  readonly session: BattleRuntimeSession;
  readonly combatantIds: readonly CombatantId[];
}): Result.Result<BattleRuntimeSession, BattleStateInitIssue> {
  return Result.map(
    removeBattleCombatants({
      state: input.session.state,
      combatantIds: input.combatantIds,
    }),
    (state) =>
      battleRuntimeSessionFromAdmittedContext(
        state,
        battleRuntimeContextFromCharacterAdmission(
          new Map(
            [...input.session.context.characters].filter(([combatantId]) =>
              state.combatants.has(combatantId),
            ),
          ),
          new Map(
            [...input.session.context.statBlocks].filter(([combatantId]) =>
              state.combatants.has(combatantId),
            ),
          ),
        ),
      ),
  );
}
