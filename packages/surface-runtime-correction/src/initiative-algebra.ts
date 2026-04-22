import * as Either from "effect/Either";
import * as Option from "effect/Option";

import {
  createScoredInitiativeStack,
  currentActing as currentActingValue,
  initiativeOrder as stackOrder,
  insertByInitiative,
  nextInitiative as advanceInitiative,
  removeFromInitiative as removeFromStack,
  type InitiativeEntry,
  type InitiativeStack as SharedInitiativeStack,
  type InitiativeTieDecision,
} from "@dnd/shared/initiative-algebra";
import type { Initiative, Round } from "@dnd/shared/types";

export type { InitiativeEntry, InitiativeTieDecision };

export type InitiativeStack<T> = SharedInitiativeStack<InitiativeEntry<T>>;

export type RoundTicked = boolean;

export const createInitiativeStack = <T>(
  order: readonly [InitiativeEntry<T>, ...InitiativeEntry<T>[]],
  round: Round,
): Either.Either<InitiativeStack<T>, string> =>
  createScoredInitiativeStack(order, round);

export const nextInitiative = <T>(
  stack: InitiativeStack<T>,
): readonly [InitiativeStack<T>, RoundTicked] => advanceInitiative(stack);

export const currentActing = <T>(stack: InitiativeStack<T>): T =>
  currentActingValue(stack).creature;

export const currentActingEntry = <T>(stack: InitiativeStack<T>): InitiativeEntry<T> =>
  currentActingValue(stack);

export const removeFromInitiative = <T>(
  stack: InitiativeStack<T>,
  predicate: (creature: T) => boolean,
): Option.Option<InitiativeStack<T>> =>
  removeFromStack(stack, (entry) => predicate(entry.creature));

export const initiativeOrder = <T>(
  stack: InitiativeStack<T>,
): ReadonlyArray<InitiativeEntry<T>> => stackOrder(stack);

export const insert = <T>(
  stack: InitiativeStack<T>,
  creature: T,
  initiative: Initiative,
  decision?: InitiativeTieDecision<T>,
) => insertByInitiative(stack, creature, initiative, decision);
