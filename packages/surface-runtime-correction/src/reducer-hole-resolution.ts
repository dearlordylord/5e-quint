import { Either, Match } from "effect";
import { nextInitiative } from "@dnd/shared/initiative-algebra";
import { Hp } from "@dnd/shared/types";
import type { CreatureId } from "@dnd/shared/types";

import { resolveCoreAttackHoles } from "#/reducer-core-attack.ts";
import {
  requireNoMissingHoles,
  requireValidHoleInputs,
} from "#/reducer-hole-refilling.ts";
import { interpretSubject } from "#/reducer-interpretation.ts";
import type { SpellcastingAbilityModifier, State } from "#/reducer-state.ts";
import type { CurrentSliceSupportedActivationPhase } from "#/reducer-support.ts";
import type {
  FilledHoleValue,
  ResolutionInvalid,
  ResolutionRequest,
  ResolutionResult,
  RolledDiceGroup,
  RuntimeHole,
} from "#/reducer-types.ts";
import type {
  DiceAmount,
  DiceExpr,
  EffectAtom,
} from "@dnd/prototype-content-surface/surface/types";
import {
  rolledDiceTotal,
  validateRolledDiceForDiceExpr,
} from "#/runtime-dice.ts";

type HealHpEffect = Extract<EffectAtom, { readonly kind: "heal_hp" }>;

function invalid(reason: string): ResolutionInvalid {
  return { tag: "invalid", reason };
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

function currentAttackRollHole(
  holes: ReadonlyArray<RuntimeHole>,
): Either.Either<
  Extract<RuntimeHole, { readonly kind: "attackRoll" }>,
  ResolutionInvalid
> {
  const attackRollHoles = holes.filter(
    (hole): hole is Extract<RuntimeHole, { readonly kind: "attackRoll" }> =>
      hole.kind === "attackRoll",
  );

  if (attackRollHoles.length !== 1) {
    return Either.left(
      invalid(
        `expected exactly one attack-roll hole in current phase, got ${attackRollHoles.length}`,
      ),
    );
  }

  const [attackRollHole] = attackRollHoles;
  return Either.right(attackRollHole);
}

function requireAttackRollFill(
  filledHoleValues: ReadonlyArray<FilledHoleValue>,
  holes: ReadonlyArray<RuntimeHole>,
): Either.Either<number, ResolutionInvalid> {
  return Either.gen(function* () {
    const attackRollHole = yield* currentAttackRollHole(holes);
    const value = yield* Either.fromNullable(
      filledHoleValues.find(
        (candidate) => candidate.holeId === attackRollHole.holeId,
      ),
      () => invalid("missing filled attack roll for current phase"),
    );

    if (value.kind !== "attackRoll") {
      return yield* Either.left(
        invalid(
          `filled value kind ${value.kind} does not match hole ${attackRollHole.holeId}`,
        ),
      );
    }

    return value.value;
  });
}

function currentTargetChoiceHole(
  holes: ReadonlyArray<RuntimeHole>,
): Either.Either<
  Extract<RuntimeHole, { readonly kind: "targetChoice" }>,
  ResolutionInvalid
> {
  const targetChoiceHoles = holes.filter(
    (hole): hole is Extract<RuntimeHole, { readonly kind: "targetChoice" }> =>
      hole.kind === "targetChoice",
  );

  if (targetChoiceHoles.length !== 1) {
    return Either.left(
      invalid(
        `expected exactly one target-choice hole in current phase, got ${targetChoiceHoles.length}`,
      ),
    );
  }

  const [targetChoiceHole] = targetChoiceHoles;
  return Either.right(targetChoiceHole);
}

function currentRolledDiceHole(
  holes: ReadonlyArray<RuntimeHole>,
): Either.Either<
  Extract<RuntimeHole, { readonly kind: "rolledDice" }>,
  ResolutionInvalid
> {
  const rolledDiceHoles = holes.filter(
    (hole): hole is Extract<RuntimeHole, { readonly kind: "rolledDice" }> =>
      hole.kind === "rolledDice",
  );

  if (rolledDiceHoles.length !== 1) {
    return Either.left(
      invalid(
        `expected exactly one rolled-dice hole in current phase, got ${rolledDiceHoles.length}`,
      ),
    );
  }

  const [rolledDiceHole] = rolledDiceHoles;
  return Either.right(rolledDiceHole);
}

function requireTargetChoiceFill(
  filledHoleValues: ReadonlyArray<FilledHoleValue>,
  holes: ReadonlyArray<RuntimeHole>,
): Either.Either<CreatureId, ResolutionInvalid> {
  return Either.gen(function* () {
    const targetChoiceHole = yield* currentTargetChoiceHole(holes);
    const value = yield* Either.fromNullable(
      filledHoleValues.find(
        (candidate) => candidate.holeId === targetChoiceHole.holeId,
      ),
      () => invalid("missing filled target choice for current phase"),
    );

    if (value.kind !== "targetChoice") {
      return yield* Either.left(
        invalid(
          `filled value kind ${value.kind} does not match hole ${targetChoiceHole.holeId}`,
        ),
      );
    }

    return value.value;
  });
}

function requireRolledDiceFill(
  filledHoleValues: ReadonlyArray<FilledHoleValue>,
  holes: ReadonlyArray<RuntimeHole>,
): Either.Either<ReadonlyArray<RolledDiceGroup>, ResolutionInvalid> {
  return Either.gen(function* () {
    const rolledDiceHole = yield* currentRolledDiceHole(holes);
    const value = yield* Either.fromNullable(
      filledHoleValues.find(
        (candidate) => candidate.holeId === rolledDiceHole.holeId,
      ),
      () => invalid("missing filled rolled dice for current phase"),
    );

    if (value.kind !== "rolledDice") {
      return yield* Either.left(
        invalid(
          `filled value kind ${value.kind} does not match hole ${rolledDiceHole.holeId}`,
        ),
      );
    }

    return value.value;
  });
}

function requireValidCreatureTarget(
  state: State,
  actorId: CreatureId,
  targetId: CreatureId,
): Either.Either<CreatureId, ResolutionInvalid> {
  if (targetId === actorId) {
    return Either.left(invalid("invalid attack target"));
  }

  if (!state.combatants.has(targetId)) {
    return Either.left(invalid("invalid attack target"));
  }

  return Either.right(targetId);
}

function requireExistingDirectTarget(
  state: State,
  targetId: CreatureId,
): Either.Either<CreatureId, ResolutionInvalid> {
  if (!state.combatants.has(targetId)) {
    return Either.left(invalid("invalid direct target"));
  }

  return Either.right(targetId);
}

function diceExprStaticBonus(
  expr: DiceExpr,
  casterSpellcastingAbilityModifier: SpellcastingAbilityModifier,
): number {
  return (
    (expr.flat ?? 0) +
    (expr.spellcastingMod === true ? casterSpellcastingAbilityModifier : 0)
  );
}

function hpRegained(amount: number): number {
  return Math.max(0, amount);
}

function requireSupportedHealingDiceExpr(
  expr: DiceExpr,
): Either.Either<DiceExpr, ResolutionInvalid> {
  if (expr.abilityModifier !== undefined) {
    return Either.left(
      invalid("unsupported healing amount ability modifier field"),
    );
  }

  return Either.right(expr);
}

function currentSliceHealingBaseExpr(
  amount: DiceAmount,
): Either.Either<DiceExpr, ResolutionInvalid> {
  return Match.value(amount).pipe(
    Match.when({ kind: "fixed" }, (fixed) =>
      requireSupportedHealingDiceExpr(fixed.expr),
    ),
    Match.when({ kind: "linear_per_level" }, (linear) => {
      if (linear.axis !== "slot" || linear.startingAtLevel !== 1) {
        return Either.left(
          invalid("unsupported healing amount scaling for current slice"),
        );
      }

      // No slot-level hole exists yet, so resolution executes the spell's base
      // slot expression only. Upcast healing needs a later slot-level hole.
      return requireSupportedHealingDiceExpr(linear.base);
    }),
    Match.when({ kind: "threshold_tiers" }, () =>
      Either.left(invalid("unsupported healing threshold tiers")),
    ),
    Match.when({ kind: "resource_spent" }, () =>
      Either.left(invalid("unsupported resource-spent healing amount")),
    ),
    Match.when({ kind: "resource_spent_linear" }, () =>
      Either.left(invalid("unsupported resource-spent healing amount")),
    ),
    Match.when({ kind: "linked" }, () =>
      Either.left(invalid("unsupported linked healing amount")),
    ),
    Match.exhaustive,
  );
}

function healingAmountFromRoll(
  state: State,
  actorId: CreatureId,
  effect: HealHpEffect,
  rolledDice: ReadonlyArray<RolledDiceGroup>,
): Either.Either<number, ResolutionInvalid> {
  return Either.gen(function* () {
    const actor = yield* Either.fromNullable(
      state.combatants.get(actorId),
      () => invalid("acting actor not found in combatants"),
    );
    const baseExpr = yield* currentSliceHealingBaseExpr(effect.amount);

    const diceValidation = validateRolledDiceForDiceExpr(rolledDice, baseExpr);
    if (Either.isLeft(diceValidation)) {
      return yield* Either.left(invalid(diceValidation.left.reason));
    }

    return hpRegained(
      rolledDiceTotal(rolledDice) +
        diceExprStaticBonus(baseExpr, actor.spellcastingAbilityModifier),
    );
  });
}

function healingTargetId(
  actorId: CreatureId,
  effect: HealHpEffect,
  chosenTargetId: CreatureId | null,
): Either.Either<CreatureId, ResolutionInvalid> {
  return Match.value(effect.target).pipe(
    Match.when("self", () => Either.right(actorId)),
    Match.when("target_creature", () =>
      Either.fromNullable(chosenTargetId, () =>
        invalid("missing direct healing target"),
      ),
    ),
    Match.exhaustive,
  );
}

function directAttachmentTargetChoice(
  state: State,
  filledHoleValues: ReadonlyArray<FilledHoleValue>,
  currentHoles: ReadonlyArray<RuntimeHole>,
  phase: Extract<
    CurrentSliceSupportedActivationPhase,
    { readonly kind: "direct" }
  >,
): Either.Either<CreatureId | null, ResolutionInvalid> {
  return Either.gen(function* () {
    if (phase.attachment.kind !== "hole") {
      return null;
    }

    if (phase.attachment.value.kind !== "target") {
      return yield* Either.left(
        invalid(
          "current slice expects target attachment for target-holed direct units",
        ),
      );
    }

    const targetChoice = yield* requireTargetChoiceFill(
      filledHoleValues,
      currentHoles,
    );
    yield* requireExistingDirectTarget(state, targetChoice);
    return targetChoice;
  });
}

function applyHealing(
  state: State,
  targetId: CreatureId,
  healingAmount: number,
): Either.Either<State, ResolutionInvalid> {
  return Either.gen(function* () {
    const target = yield* Either.fromNullable(
      state.combatants.get(targetId),
      () => invalid("invalid direct target"),
    );
    const nextHp = Hp(
      Math.min(Number(target.maxHp), Number(target.hp) + healingAmount),
    );
    const combatants = new Map(state.combatants);
    combatants.set(targetId, { ...target, hp: nextHp });

    return { ...state, combatants };
  });
}

function resolveFilledActivationPhase(
  state: State,
  actorId: CreatureId,
  phase: CurrentSliceSupportedActivationPhase,
  filledHoleValues: ReadonlyArray<FilledHoleValue>,
  currentHoles: ReadonlyArray<RuntimeHole>,
): ResolutionResult {
  return Match.value(phase).pipe(
    Match.when({ kind: "attack_roll" }, (attackRollPhase) =>
      Either.gen(function* () {
        if (attackRollPhase.attachment.kind !== "hole") {
          return yield* Either.left(
            invalid("current slice expects hole-backed attack-roll attachment"),
          );
        }

        if (attackRollPhase.attachment.value.kind !== "target") {
          return yield* Either.left(
            invalid(
              "current slice expects target attachment for attack-roll units",
            ),
          );
        }

        const targetId = yield* requireTargetChoiceFill(
          filledHoleValues,
          currentHoles,
        );
        yield* requireValidCreatureTarget(state, actorId, targetId);
        yield* requireAttackRollFill(filledHoleValues, currentHoles);

        return invalid(
          "attack-roll unit damage application is not implemented yet",
        );
      }).pipe(Either.merge),
    ),
    Match.when({ kind: "save_gate" }, () =>
      invalid("save-gate unit outcome application is not implemented yet"),
    ),
    Match.when({ kind: "direct" }, (directPhase) =>
      Either.gen(function* () {
        const directEffect = directPhase.effects[0];
        const chosenTargetId = yield* directAttachmentTargetChoice(
          state,
          filledHoleValues,
          currentHoles,
          directPhase,
        );

        return yield* Match.value(directEffect).pipe(
          Match.when({ kind: "heal_hp" }, (healHpEffect) =>
            Either.gen(function* () {
              const targetId = yield* healingTargetId(
                actorId,
                healHpEffect,
                chosenTargetId,
              );
              const rolledDice = yield* requireRolledDiceFill(
                filledHoleValues,
                currentHoles,
              );
              const healingAmount = yield* healingAmountFromRoll(
                state,
                actorId,
                healHpEffect,
                rolledDice,
              );
              const nextState = yield* applyHealing(
                state,
                targetId,
                healingAmount,
              );

              return { tag: "resolved" as const, state: nextState };
            }),
          ),
          Match.when({ kind: "grant_extra_action" }, () =>
            Either.right(
              invalid("direct unit effect application is not implemented yet"),
            ),
          ),
          Match.exhaustive,
        );
      }).pipe(Either.merge),
    ),
    Match.exhaustive,
  );
}

export function resolveSubjectHoles(
  state: State,
  request: ResolutionRequest,
): ResolutionResult {
  return Either.match(interpretSubject(state, request.subject), {
    onLeft: (invalidResult) => invalidResult,
    onRight: (interpreted) =>
      Match.value(interpreted).pipe(
        Match.when({ tag: "coreAttack" }, () =>
          resolveCoreAttackHoles(state, request.filledHoleValues),
        ),
        Match.when({ tag: "coreEndTurn" }, () => resolveCoreEndTurn(state)),
        Match.when({ tag: "unit" }, (act) => {
          const holes = requireValidHoleInputs(
            request.filledHoleValues,
            act.initialHoles,
          );
          if (Either.isLeft(holes)) {
            return holes.left;
          }

          const filledHoles = requireNoMissingHoles(
            request.filledHoleValues,
            holes.right,
          );
          if (Either.isLeft(filledHoles)) {
            return filledHoles.left;
          }
          return resolveFilledActivationPhase(
            state,
            act.subject.actorId,
            act.phase,
            request.filledHoleValues,
            holes.right,
          );
        }),
        Match.exhaustive,
      ),
  });
}
