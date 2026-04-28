import { Either, Match } from "effect";
import { currentActing, nextInitiative } from "@dnd/shared/initiative-algebra";
import { Hp } from "@dnd/shared/types";
import type { CreatureId } from "@dnd/shared/types";

import { resolveCoreAttackHoles } from "#/reducer-core-attack.ts";
import { spendOneAction } from "#/reducer-action-economy.ts";
import {
  attackRollHits,
  attackRollIsCritical,
  attackRollResultIsValid,
} from "#/reducer-attack-roll.ts";
import { currentCreatureArmorClass } from "#/reducer-armor-class.ts";
import { applyHpDamage } from "#/reducer-damage.ts";
import {
  missingHoles,
  requireNoMissingHoles,
  requireValidHoleInputs,
} from "#/reducer-hole-refilling.ts";
import {
  CURRENT_SLICE_ACTIVATION_STEP,
  interpretSubject,
} from "#/reducer-interpretation.ts";
import type { SpellcastingAbilityModifier, State } from "#/reducer-state.ts";
import type {
  CurrentSliceSupportedActivationPhase,
  CurrentSliceSupportedActivationUnit,
  CurrentSliceSupportedDamageAmount,
  CurrentSliceSupportedDamageEffect,
} from "#/reducer-support.ts";
import type {
  AttackRollResult,
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
import { projectAttackRollDamageHoles } from "#/runtime-holes.ts";

type HealHpEffect = Extract<EffectAtom, { readonly kind: "heal_hp" }>;
type CurrentSliceSupportedDirectPhase = Extract<
  CurrentSliceSupportedActivationPhase,
  { readonly kind: "direct" }
>;
type CurrentSliceSupportedDirectEffect =
  CurrentSliceSupportedDirectPhase["effects"][number];
type ActivationResourceCost =
  | { readonly kind: "free" }
  | { readonly kind: "action" }
  | { readonly kind: "bonusAction" };
type SupportedSurfaceActivationResourceKind =
  | "free"
  | "action"
  | "bonus_action";
type SpellSlotIndex = number;

function invalid(reason: string): ResolutionInvalid {
  return { tag: "invalid", reason };
}

function requireOnlyOne<T>(
  values: ReadonlyArray<T>,
  invalidReason: (count: number) => ResolutionInvalid,
): Either.Either<T, ResolutionInvalid> {
  if (values.length !== 1) {
    return Either.left(invalidReason(values.length));
  }

  const [value] = values;
  return Either.right(value);
}

function resolveCoreEndTurn(state: State): ResolutionResult {
  const initiative = nextInitiative(state.initiative);
  const nextActorId = currentActing(initiative);
  const nextActor = state.combatants.get(nextActorId);
  const combatants =
    nextActor === undefined
      ? state.combatants
      : new Map(state.combatants).set(nextActorId, {
          ...nextActor,
          slotExpendedThisTurn: false,
        });

  return {
    tag: "resolved",
    state: {
      ...state,
      initiative,
      combatants,
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

  return requireOnlyOne(attackRollHoles, (count) =>
    invalid(
      `expected exactly one attack-roll hole in current phase, got ${count}`,
    ),
  );
}

function requireAttackRollFill(
  filledHoleValues: ReadonlyArray<FilledHoleValue>,
  holes: ReadonlyArray<RuntimeHole>,
): Either.Either<AttackRollResult, ResolutionInvalid> {
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

    if (!attackRollResultIsValid(value.value)) {
      return yield* Either.left(invalid("invalid attack roll result"));
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

  return requireOnlyOne(targetChoiceHoles, (count) =>
    invalid(
      `expected exactly one target-choice hole in current phase, got ${count}`,
    ),
  );
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

  return requireOnlyOne(rolledDiceHoles, (count) =>
    invalid(
      `expected exactly one rolled-dice hole in current phase, got ${count}`,
    ),
  );
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

function activationResourceCost(
  unit: CurrentSliceSupportedActivationUnit,
): Either.Either<ActivationResourceCost, ResolutionInvalid> {
  const mechanics = unit.mechanics;

  if ("activationCost" in mechanics) {
    if (
      isSupportedSurfaceActivationResourceKind(mechanics.activationCost.kind)
    ) {
      return Either.right(
        activationResourceCostFromSurfaceKind(mechanics.activationCost.kind),
      );
    }

    return Either.left(invalid("unsupported unit activation cost"));
  }

  if ("castingTime" in mechanics) {
    if (isSupportedSurfaceActivationResourceKind(mechanics.castingTime.kind)) {
      return Either.right(
        activationResourceCostFromSurfaceKind(mechanics.castingTime.kind),
      );
    }

    return Either.left(invalid("unsupported unit casting time"));
  }

  return Either.left(invalid("unsupported unit activation cost"));
}

function isSupportedSurfaceActivationResourceKind(
  kind: string,
): kind is SupportedSurfaceActivationResourceKind {
  return kind === "free" || kind === "action" || kind === "bonus_action";
}

function activationResourceCostFromSurfaceKind(
  kind: SupportedSurfaceActivationResourceKind,
): ActivationResourceCost {
  return Match.value(kind).pipe(
    Match.when("free", (): ActivationResourceCost => ({ kind: "free" })),
    Match.when("action", (): ActivationResourceCost => ({ kind: "action" })),
    Match.when(
      "bonus_action",
      (): ActivationResourceCost => ({ kind: "bonusAction" }),
    ),
    Match.exhaustive,
  );
}

function spendActivationCost(
  state: State,
  unit: CurrentSliceSupportedActivationUnit,
): Either.Either<State, ResolutionInvalid> {
  return Either.gen(function* () {
    const cost = yield* activationResourceCost(unit);

    return yield* Match.value(cost).pipe(
      Match.when({ kind: "free" }, () => Either.right(state)),
      Match.when({ kind: "action" }, () =>
        spendOneAction(state, "no action available for unit"),
      ),
      Match.when({ kind: "bonusAction" }, () =>
        Either.left(invalid("unsupported unit activation resource cost")),
      ),
      Match.exhaustive,
    );
  });
}

function baseSpellSlotIndex(
  unit: CurrentSliceSupportedActivationUnit,
): SpellSlotIndex | null {
  if (unit.kind !== "spell" || unit.mechanics.level === 0) {
    return null;
  }

  return unit.mechanics.level - 1;
}

function spendBaseSpellSlot(
  state: State,
  actorId: CreatureId,
  unit: CurrentSliceSupportedActivationUnit,
): Either.Either<State, ResolutionInvalid> {
  const slotIndex = baseSpellSlotIndex(unit);
  if (slotIndex === null) {
    return Either.right(state);
  }

  return Either.gen(function* () {
    const actor = yield* Either.fromNullable(
      state.combatants.get(actorId),
      () => invalid("acting actor not found in combatants"),
    );

    if (actor.slotExpendedThisTurn) {
      return yield* Either.left(
        invalid("spell slot already expended this turn"),
      );
    }

    const availableSlots = actor.spellSlots[slotIndex] ?? 0;

    if (availableSlots <= 0) {
      return yield* Either.left(invalid("no spell slot available for unit"));
    }

    const combatants = new Map(state.combatants);
    combatants.set(actorId, {
      ...actor,
      spellSlots: actor.spellSlots.map((slots, index) =>
        index === slotIndex ? slots - 1 : slots,
      ),
      slotExpendedThisTurn: true,
    });

    return { ...state, combatants };
  });
}

function unitCostPaidState(
  state: State,
  actorId: CreatureId,
  unit: CurrentSliceSupportedActivationUnit,
): Either.Either<State, ResolutionInvalid> {
  return Either.gen(function* () {
    const actionPaidState = yield* spendActivationCost(state, unit);
    return yield* spendBaseSpellSlot(actionPaidState, actorId, unit);
  });
}

function requireUnitCostsAvailable(
  state: State,
  actorId: CreatureId,
  unit: CurrentSliceSupportedActivationUnit,
): Either.Either<void, ResolutionInvalid> {
  return unitCostPaidState(state, actorId, unit).pipe(
    Either.map(() => undefined),
  );
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

function requireSupportedDamageDiceExpr(
  expr: DiceExpr,
): Either.Either<DiceExpr, ResolutionInvalid> {
  if (expr.abilityModifier !== undefined) {
    return Either.left(
      invalid("unsupported damage amount ability modifier field"),
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

function currentSliceDamageBaseExpr(
  amount: CurrentSliceSupportedDamageAmount,
): Either.Either<DiceExpr, ResolutionInvalid> {
  return Match.value(amount).pipe(
    Match.when({ kind: "fixed" }, (fixed) =>
      requireSupportedDamageDiceExpr(fixed.expr),
    ),
    Match.when({ kind: "threshold_tiers" }, (threshold) => {
      // The correction state does not model character level yet. For current
      // Surface execution, cantrip threshold damage resolves at the authored
      // base expression until level projection exists.
      return requireSupportedDamageDiceExpr(threshold.base);
    }),
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

function damageAmountFromRoll(
  effect: CurrentSliceSupportedDamageEffect,
  rolledDice: ReadonlyArray<RolledDiceGroup>,
  isCriticalHit: boolean,
): Either.Either<number, ResolutionInvalid> {
  return Either.gen(function* () {
    const expr = yield* currentSliceDamageBaseExpr(effect.amount);
    const effectiveExpr = isCriticalHit
      ? { ...expr, dice: expr.dice * 2 }
      : expr;
    const diceValidation = validateRolledDiceForDiceExpr(
      rolledDice,
      effectiveExpr,
    );

    if (Either.isLeft(diceValidation)) {
      return yield* Either.left(invalid(diceValidation.left.reason));
    }

    const damageAmount =
      rolledDiceTotal(rolledDice) + (effectiveExpr.flat ?? 0);
    if (damageAmount < 0) {
      return yield* Either.left(invalid("damage amount cannot be negative"));
    }

    return damageAmount;
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
  phase: CurrentSliceSupportedDirectPhase,
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

function requireOnlyDirectEffect(
  effects: ReadonlyArray<CurrentSliceSupportedDirectEffect>,
): Either.Either<CurrentSliceSupportedDirectEffect, ResolutionInvalid> {
  return requireOnlyOne(effects, (count) =>
    invalid(
      `expected exactly one direct effect in current phase, got ${count}`,
    ),
  );
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

function currentSliceTargetArmorClass(
  state: State,
  targetId: CreatureId,
): Either.Either<number, ResolutionInvalid> {
  return Either.fromNullable(state.combatants.get(targetId), () =>
    invalid("invalid attack target"),
  ).pipe(Either.map((target) => Number(currentCreatureArmorClass(target))));
}

// TODO: This is HP mutation only. Surface does not yet model damage-triggered
// reaction windows such as Hellish Rebuke. When added, do not hide that
// protocol inside this helper; introduce a damage-event resolution layer that
// carries source, target, damage type/qualifiers, trigger qualifiers, and return
// frame, then delegates final HP arithmetic to applyHpDamage.
function applyDamage(
  state: State,
  targetId: CreatureId,
  damageAmount: number,
): Either.Either<State, ResolutionInvalid> {
  return Either.gen(function* () {
    const target = yield* Either.fromNullable(
      state.combatants.get(targetId),
      () => invalid("invalid attack target"),
    );

    const damagedTarget = applyHpDamage(target, damageAmount);
    const combatants = new Map(state.combatants);
    combatants.set(targetId, damagedTarget);

    return { ...state, combatants };
  });
}

function resolveFilledActivationPhase(
  state: State,
  actorId: CreatureId,
  unit: CurrentSliceSupportedActivationUnit,
  phase: CurrentSliceSupportedActivationPhase,
  filledHoleValues: ReadonlyArray<FilledHoleValue>,
  currentHoles: ReadonlyArray<RuntimeHole>,
): ResolutionResult {
  return Match.value(phase).pipe(
    Match.when({ kind: "attack_roll" }, (attackRollPhase) =>
      Either.gen(function* () {
        const missingInitialHoles = missingHoles(
          filledHoleValues,
          currentHoles,
        );
        if (missingInitialHoles.length > 0) {
          const initialInputs = requireValidHoleInputs(
            filledHoleValues,
            currentHoles,
          );
          if (Either.isLeft(initialInputs)) {
            return yield* Either.left(initialInputs.left);
          }

          return { tag: "needsHoles" as const, holes: missingInitialHoles };
        }

        const targetId = yield* requireTargetChoiceFill(
          filledHoleValues,
          currentHoles,
        );
        yield* requireValidCreatureTarget(state, actorId, targetId);

        const attackRoll = yield* requireAttackRollFill(
          filledHoleValues,
          currentHoles,
        );

        const targetArmorClass = yield* currentSliceTargetArmorClass(
          state,
          targetId,
        );

        if (!attackRollHits(attackRoll, targetArmorClass)) {
          const validMissInputs = requireValidHoleInputs(
            filledHoleValues,
            currentHoles,
          );
          if (Either.isLeft(validMissInputs)) {
            return yield* Either.left(validMissInputs.left);
          }

          const paidState = yield* unitCostPaidState(state, actorId, unit);
          return { tag: "resolved" as const, state: paidState };
        }

        const damageHoles = projectAttackRollDamageHoles(
          attackRollPhase,
          CURRENT_SLICE_ACTIVATION_STEP,
        );

        const allCurrentHoles = [...currentHoles, ...damageHoles];
        const validInputs = requireValidHoleInputs(
          filledHoleValues,
          allCurrentHoles,
        );
        if (Either.isLeft(validInputs)) {
          return yield* Either.left(validInputs.left);
        }

        const missingDamageHoles = requireNoMissingHoles(
          filledHoleValues,
          allCurrentHoles,
        );
        if (Either.isLeft(missingDamageHoles)) {
          return missingDamageHoles.left;
        }

        const [damageEffect] = attackRollPhase.onHit;
        const rolledDice = yield* requireRolledDiceFill(
          filledHoleValues,
          allCurrentHoles,
        );

        const damageAmount = yield* damageAmountFromRoll(
          damageEffect,
          rolledDice,
          attackRollIsCritical(attackRoll),
        );
        const paidState = yield* unitCostPaidState(state, actorId, unit);
        const nextState = yield* applyDamage(paidState, targetId, damageAmount);

        return { tag: "resolved" as const, state: nextState };
      }).pipe(Either.merge),
    ),
    Match.when({ kind: "save_gate" }, () =>
      invalid("save-gate unit outcome application is not implemented yet"),
    ),
    Match.when({ kind: "direct" }, (directPhase) =>
      Either.gen(function* () {
        const directEffect = yield* requireOnlyDirectEffect(
          directPhase.effects,
        );
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
              const paidState = yield* unitCostPaidState(state, actorId, unit);
              const nextState = yield* applyHealing(
                paidState,
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
          const costsAvailable = requireUnitCostsAvailable(
            state,
            act.subject.actorId,
            act.unit,
          );
          if (Either.isLeft(costsAvailable)) {
            return costsAvailable.left;
          }

          if (act.phase.kind === "attack_roll") {
            return resolveFilledActivationPhase(
              state,
              act.subject.actorId,
              act.unit,
              act.phase,
              request.filledHoleValues,
              act.initialHoles,
            );
          }

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
            act.unit,
            act.phase,
            request.filledHoleValues,
            holes.right,
          );
        }),
        Match.exhaustive,
      ),
  });
}
