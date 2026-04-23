import { Either, Match } from "effect";
import { currentActing, nextInitiative } from "@dnd/shared/initiative-algebra";
import type { ActivationPhase, UnitRecord } from '@dnd/prototype-content-surface/surface/types';

import {
  coreAttackDamageHole,
  coreAttackRollHole,
  coreAttackTargetHole,
} from "#/reducer-core-attack-holes.ts";
import { canUseCoreAttack } from "#/reducer-core-acts.ts";
import type { CreatureState, State } from "#/reducer-state.ts";
import { holeId, holeStepKey } from "#/reducer-types.ts";
import type {
  FilledHoleValue,
  ResolutionRequest,
  ResolutionInvalid,
  ResolutionResult,
  Subject,
  RuntimeHoleSet,
} from "#/reducer-types.ts";
import {
  type CurrentSliceSupportedActivationUnit,
  getCurrentSliceSupportedActivationUnit,
} from "#/reducer-support.ts";
import { projectPhaseHoles } from "#/runtime-holes.ts";
import { getOnlyOneStrict } from '@dnd/shared/types';

type ResolutionCheck<A> = Either.Either<A, ResolutionInvalid>;
type ResolutionAdvance<A> = Either.Either<A, ResolutionResult>;
type UnitResolutionRequest = ResolutionRequest & {
  readonly subject: Extract<Subject, { readonly tag: "unit" }>;
};

function invalid(reason: string): ResolutionInvalid {
  return { tag: "invalid", reason };
}

function isTargetChoiceValue(
  value: FilledHoleValue,
): value is Extract<FilledHoleValue, { readonly kind: "targetChoice" }> {
  return value.kind === "targetChoice";
}

function isAttackRollValue(
  value: FilledHoleValue,
): value is Extract<FilledHoleValue, { readonly kind: "attackRoll" }> {
  return value.kind === "attackRoll";
}

function isRolledDiceValue(
  value: FilledHoleValue,
): value is Extract<FilledHoleValue, { readonly kind: "rolledDice" }> {
  return value.kind === "rolledDice";
}

function needsTargetHole(): ResolutionResult {
  return {
    tag: "needsHoles",
    holes: [coreAttackTargetHole()],
  };
}

function needsAttackRollHole(): ResolutionResult {
  return {
    tag: "needsHoles",
    holes: [coreAttackRollHole()],
  };
}

function needsDamageRollHole(): ResolutionResult {
  return {
    tag: "needsHoles",
    holes: [coreAttackDamageHole()],
  };
}

function validateCurrentHoleInputs(
  filledHoleValues: ReadonlyArray<FilledHoleValue>,
  expectedHoles: RuntimeHoleSet,
): ResolutionInvalid | null {
  const expectedById = new Map(
    expectedHoles.map((hole) => [hole.holeId, hole]),
  );
  const seen = new Set<string>();

  for (const value of filledHoleValues) {
    const seenKey = String(value.holeId);
    if (seen.has(seenKey)) {
      return {
        ...invalid(`duplicate filled value for hole ${seenKey}`),
      };
    }
    seen.add(seenKey);

    const expectedHole = expectedById.get(value.holeId);
    if (expectedHole === undefined) {
      return {
        ...invalid(`unexpected filled value for hole ${seenKey}`),
      };
    }

    if (expectedHole.kind !== value.kind) {
      return {
        ...invalid(
          `filled value kind ${value.kind} does not match hole ${seenKey}`,
        ),
      };
    }
  }

  return null;
}

function requireActingRequest(
  state: State,
  request: ResolutionRequest,
): ResolutionCheck<ResolutionRequest> {
  if (request.subject.actorId !== currentActing(state.initiative)) {
    return Either.left(invalid("actor is not currently acting"));
  }

  return Either.right(request);
}

function requireUnitActor(
  state: State,
  actorId: ResolutionRequest["subject"]["actorId"],
): ResolutionCheck<CreatureState> {
  return Either.fromNullable(state.combatants.get(actorId), () =>
    invalid("acting actor not found in combatants"),
  );
}

function requireUnit(
  actor: CreatureState,
  request: UnitResolutionRequest,
): ResolutionCheck<(typeof actor.units)[number]> {
  return Either.fromNullable(
    actor.units.find((candidate) => candidate.id === request.subject.unitId),
    () => invalid(`unit not found: ${request.subject.unitId}`),
  );
}

function advanceCoreAttackHoleResolution(
  state: State,
  filledHoleValues: ReadonlyArray<FilledHoleValue>,
): ResolutionResult {
  if (!canUseCoreAttack(state)) {
    return invalid("no action available for attack");
  }

  const acting = currentActing(state.initiative);

  if (![...state.combatants.keys()].some((id) => id !== acting)) {
    return invalid("no valid attack target");
  }

  const targetChoice = filledHoleValues
    .filter(isTargetChoiceValue)
    .find((value) => value.holeId === holeId("core_attack_target"));

  if (targetChoice === undefined) {
    const targetValidation = validateCurrentHoleInputs(filledHoleValues, [
      coreAttackTargetHole(),
    ]);
    if (targetValidation !== null) {
      return targetValidation;
    }

    return needsTargetHole();
  }

  if (
    targetChoice.value === acting ||
    !state.combatants.has(targetChoice.value)
  ) {
    return invalid("invalid attack target");
  }

  const attackRoll = filledHoleValues
    .filter(isAttackRollValue)
    .find((value) => value.holeId === holeId("core_attack_roll"));

  if (attackRoll === undefined) {
    const attackRollValidation = validateCurrentHoleInputs(filledHoleValues, [
      coreAttackTargetHole(),
      coreAttackRollHole(),
    ]);
    if (attackRollValidation !== null) {
      return attackRollValidation;
    }

    return needsAttackRollHole();
  }

  const damageRoll = filledHoleValues
    .filter(isRolledDiceValue)
    .find((value) => value.holeId === holeId("core_attack_damage"));

  if (damageRoll === undefined) {
    const damageRollValidation = validateCurrentHoleInputs(filledHoleValues, [
      coreAttackTargetHole(),
      coreAttackRollHole(),
      coreAttackDamageHole(),
    ]);
    if (damageRollValidation !== null) {
      return damageRollValidation;
    }

    return needsDamageRollHole();
  }

  const fullValidation = validateCurrentHoleInputs(filledHoleValues, [
    coreAttackTargetHole(),
    coreAttackRollHole(),
    coreAttackDamageHole(),
  ]);
  if (fullValidation !== null) {
    return fullValidation;
  }

  return {
    ...invalid("attack hit adjudication is not implemented yet"),
  };
}

function resolveCoreEndTurn(state: State): ResolutionResult {
  const initiative = nextInitiative(state.initiative);

  return {
    tag: "resolved",
    state: {
      ...state,
      initiative,
      currentActionsAvailable: 1,
      currentHasBonusAction: true,
      currentHasFreeAction: true,
    },
  };
}

export function resolveSubjectHoles(
  state: State,
  request: ResolutionRequest,
): ResolutionResult {
  const actingRequest = requireActingRequest(state, request);
  if (Either.isLeft(actingRequest)) {
    return actingRequest.left;
  }

  return Match.value(actingRequest.right.subject).pipe(
    Match.when({ tag: "coreAct" }, (subject) =>
      Match.value(subject.act).pipe(
        Match.when("attack", () =>
          advanceCoreAttackHoleResolution(
            state,
            actingRequest.right.filledHoleValues,
          ),
        ),
        Match.when("endTurn", () => resolveCoreEndTurn(state)),
        Match.exhaustive,
      ),
    ),
    Match.when({ tag: "unit" }, (subject) =>
      resolveUnitSubjectHoles(state, {
        ...actingRequest.right,
        subject,
      }),
    ),
    Match.orElse(() => invalid("not implemented")),
  );
}

function requireSupportedUnit(
  unit: UnitRecord,
  request: UnitResolutionRequest,
): ResolutionCheck<CurrentSliceSupportedActivationUnit> {
  return Either.fromOption(getCurrentSliceSupportedActivationUnit(unit), () =>
    invalid(`unsupported unit: ${request.subject.unitId}`),
  );
}

function requireValidHoleInputs(
  filledHoleValues: ReadonlyArray<FilledHoleValue>,
  holes: RuntimeHoleSet,
): ResolutionCheck<RuntimeHoleSet> {
  const validation = validateCurrentHoleInputs(filledHoleValues, holes);
  return validation === null ? Either.right(holes) : Either.left(validation);
}

function missingHoles(
  filledHoleValues: ReadonlyArray<FilledHoleValue>,
  holes: RuntimeHoleSet,
): RuntimeHoleSet {
  const filledHoleIds = new Set(filledHoleValues.map((value) => value.holeId));

  return holes.filter((hole) => !filledHoleIds.has(hole.holeId));
}

function requireNoMissingHoles(
  filledHoleValues: ReadonlyArray<FilledHoleValue>,
  holes: RuntimeHoleSet,
): ResolutionAdvance<RuntimeHoleSet> {
  const holesToAsk = missingHoles(filledHoleValues, holes);
  return holesToAsk.length === 0
    ? Either.right(holes)
    : Either.left({ tag: "needsHoles", holes: holesToAsk });
}

function resolveUnitSubjectHoles(
  state: State,
  request: UnitResolutionRequest,
): ResolutionResult {
  const checked = Either.gen(function* () {
    const actor = yield* requireUnitActor(state, request.subject.actorId);
    const unit = yield* requireUnit(actor, request);
    const supportedUnit = yield* requireSupportedUnit(unit, request);
    const phase = getOnlyOneStrict(supportedUnit.mechanics.phases);
    const holes = yield* requireValidHoleInputs(
      request.filledHoleValues,
      projectPhaseHoles(phase, holeStepKey("activation:0")),
    );
    const filledHoles = yield* requireNoMissingHoles(
      request.filledHoleValues,
      holes,
    );

    return { actor, supportedUnit, filledHoles };
  });

  if (Either.isLeft(checked)) {
    return checked.left;
  }

  return resolveFilledCurrentSliceUnit(checked.right.supportedUnit);
}

// temporary for current slice, will be removed.
function resolveFilledCurrentSliceUnit(
  unit: CurrentSliceSupportedActivationUnit,
): ResolutionResult {
  // Current support gate makes this a one-phase unit; multi-phase replay belongs here later.
  const phase = getOnlyOneStrict(unit.mechanics.phases);
  return resolveFilledActivationPhase(phase);
}

function resolveFilledActivationPhase(phase: ActivationPhase): ResolutionResult {
  return Match.value(phase).pipe(
    Match.when({ kind: "attack_roll" }, () =>
      invalid("attack-roll unit damage application is not implemented yet"),
    ),
    Match.when({ kind: "save_gate" }, () =>
      invalid("save-gate unit outcome application is not implemented yet"),
    ),
    Match.when({ kind: "direct" }, () =>
      invalid("direct unit effect application is not implemented yet"),
    ),
    Match.when({ kind: "ability_check_gate" }, () =>
      invalid("ability-check unit execution is not supported by current slice"),
    ),
    Match.when({ kind: "random_table" }, () =>
      invalid("random-table unit execution is not supported by current slice"),
    ),
    Match.exhaustive,
  );
}