// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.FAILED_D20_TEST_ADDED_DIE
// Every decision a D20 Test other than an attack roll takes after its roll:
// its rerolls (d20-test-outcome-rerolls.ts), then the dice added to the roll
// the rerolls leave (d20-test-added-dice.ts, ASSUMPTIONS.md A68). A roller
// with a reroll source to decide on is asked for that first; the hole asks
// for the added dice only once every reroll is decided. Each owner that
// checks a saving throw or an ability check before it resolves goes through
// here, so the two stages can't be taken out of order.

import type { D20TestDieMinimumFace } from "./d20-test-die-minimum.ts";
import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";
import type { DifficultyClass } from "@dnd/shared/types";

import type {
  BattleAbilityCheckAddedDieHoleOptions,
  BattleD20TestOutcome,
  BattleD20TestRerollHoleOptions,
  BattleD20TestRollKey,
  BattleSavingThrowAfterRollHoleOptions,
  BattleState,
} from "../battle-state-execution.ts";
import {
  abilityCheckAddedDice,
  abilityCheckHoleWithAddedDieOptions,
  battleStateAfterAbilityCheckAddedDieUses,
  battleStateAfterSavingThrowAddedDieUses,
  rolledOutcomeAddedDice,
  savingThrowHoleWithAddedDieOptions,
  type AbilityCheckAddedDieOptions,
  type AbilityCheckAddedDieUses,
  type D20TestAddedDice,
  type SavingThrowAddedDieOptions,
  type SavingThrowAddedDieUses,
} from "./d20-test-added-dice.ts";
import {
  battleStateAfterD20TestRerollUses,
  battleStateAfterSavingThrowRerollUses,
  d20TestAbilityCheckRerolls,
  d20TestHoleWithRerollOptions,
  d20TestOutcomeRerolls,
  savingThrowHoleWithRerollOptions,
  type D20TestOutcomeRerollOptions,
  type D20TestOutcomeRerolls,
  type D20TestRerollUses,
  type SavingThrowRerollOptions,
  type SavingThrowRerollUses,
} from "./d20-test-outcome-rerolls.ts";
import type { D20TestSpendScope } from "./d20-test-source-spend.ts";
import type { D20TestAbilityCheckValue } from "./d20-test-rolls-that-stand.ts";

/** What a saving throw hole is asked again with: its rerolls, or once they are decided, its added dice. */
export type SavingThrowAfterRollAsk =
  | { readonly stage: "rerolls"; readonly options: SavingThrowRerollOptions }
  | {
      readonly stage: "addedDice";
      readonly options: SavingThrowAddedDieOptions;
    };

/** What an ability check hole is asked again with: its rerolls, or once they are decided, its added dice. */
export type AbilityCheckAfterRollAsk =
  | {
      readonly stage: "rerolls";
      readonly options: D20TestOutcomeRerollOptions;
    }
  | {
      readonly stage: "addedDice";
      readonly options: AbilityCheckAddedDieOptions;
    };

/** What an admitted saving throw's after-roll decisions cost its roller. */
export type SavingThrowAfterRollUses = {
  readonly rerolls: SavingThrowRerollUses;
  readonly addedDice: SavingThrowAddedDieUses;
};

/** What an admitted ability check's after-roll decisions cost its roller. */
export type AbilityCheckAfterRollUses = {
  readonly rerolls: D20TestRerollUses;
  readonly addedDice: AbilityCheckAddedDieUses;
};

/** Why added dice on a roll whose rerolls are still undecided are refused. */
export const D20_TEST_ADDED_DIE_BEFORE_REROLLS_MESSAGE =
  "Dice are added to a D20 Test only once its rerolls are decided.";

/** Where one roll's after-roll decisions stand. */
export type D20TestAfterRoll<Roll, Ask, Uses> =
  | { readonly tag: "decisionsRequired"; readonly ask: Ask }
  | { readonly tag: "invalid"; readonly issue: string }
  | {
      readonly tag: "resolved";
      /** The roll that stands after every reroll and added die. */
      readonly roll: Roll;
      readonly uses: Uses;
    };

/** The roll being checked: where it belongs, and who rolled it for which hole. */
type D20TestAfterRollContext = {
  readonly state: BattleState;
  readonly scope: D20TestSpendScope;
  readonly roll: BattleD20TestRollKey;
};

function afterRollDecisions<
  Roll,
  RerollOptions extends D20TestOutcomeRerollOptions,
  RerollUses extends D20TestRerollUses,
  AddedDieOptions,
  AddedDieUses,
>(
  rerolls: D20TestOutcomeRerolls<Roll, RerollOptions, RerollUses>,
  /** Whether the fill already carries added-die decisions for this roll. */
  addedDieDecisionsMade: boolean,
  addedDice: (
    roll: Roll,
  ) => D20TestAddedDice<Roll, AddedDieOptions, AddedDieUses>,
): D20TestAfterRoll<
  Roll,
  | { readonly stage: "rerolls"; readonly options: RerollOptions }
  | { readonly stage: "addedDice"; readonly options: AddedDieOptions },
  { readonly rerolls: RerollUses; readonly addedDice: AddedDieUses }
> {
  if (rerolls.tag === "invalid") return rerolls;
  if (rerolls.tag === "decisionsRequired")
    // An added die answers an offer made on the roll the rerolls leave, so
    // it cannot be decided before that roll stands.
    return addedDieDecisionsMade
      ? { tag: "invalid", issue: D20_TEST_ADDED_DIE_BEFORE_REROLLS_MESSAGE }
      : {
          tag: "decisionsRequired",
          ask: { stage: "rerolls", options: rerolls.options },
        };
  const added = addedDice(rerolls.roll);
  if (added.tag === "invalid") return added;
  if (added.tag === "decisionsRequired")
    return {
      tag: "decisionsRequired",
      ask: { stage: "addedDice", options: added.options },
    };
  return {
    tag: "resolved",
    roll: added.roll,
    uses: { rerolls: rerolls.uses, addedDice: added.uses },
  };
}

/**
 * A saving throw's outcome after its after-roll decisions: whether it
 * succeeds, by the table's ruling on the roll that stands.
 */
export function savingThrowAfterRollDecisions<T extends BattleD20TestOutcome>(
  input: D20TestAfterRollContext & { readonly outcome: T },
): D20TestAfterRoll<T, SavingThrowAfterRollAsk, SavingThrowAfterRollUses> {
  return afterRollDecisions(
    d20TestOutcomeRerolls(input),
    input.outcome.d20TestAddedDice !== undefined,
    (outcome) => rolledOutcomeAddedDice({ ...input, outcome }),
  );
}

/** An ability check's value after its after-roll decisions: the total that stands. */
export function abilityCheckAfterRollDecisions(
  input: D20TestAfterRollContext & {
    readonly value: D20TestAbilityCheckValue;
    readonly requiredRollMode: AttackRollMode | undefined;
    readonly dieMinimum: D20TestDieMinimumFace | undefined;
    /** The DC the discovered hole states; undefined without one. */
    readonly dc: DifficultyClass | undefined;
  },
): D20TestAfterRoll<
  D20TestAbilityCheckValue,
  AbilityCheckAfterRollAsk,
  AbilityCheckAfterRollUses
> {
  return afterRollDecisions(
    d20TestAbilityCheckRerolls(input),
    input.value.d20TestAddedDice !== undefined,
    (value) => abilityCheckAddedDice({ ...input, value }),
  );
}

/** Spends what each admitted saving throw's after-roll decisions cost, in order. */
export function battleStateAfterSavingThrowAfterRollUses(
  state: BattleState,
  uses: readonly SavingThrowAfterRollUses[],
): BattleState {
  return uses.reduce(
    (current, use) =>
      battleStateAfterSavingThrowAddedDieUses(
        battleStateAfterSavingThrowRerollUses(current, [use.rerolls]),
        [use.addedDice],
      ),
    state,
  );
}

/** Spends what each admitted ability check's after-roll decisions cost, in order. */
export function battleStateAfterAbilityCheckAfterRollUses(
  state: BattleState,
  uses: readonly AbilityCheckAfterRollUses[],
): BattleState {
  return uses.reduce(
    (current, use) =>
      battleStateAfterAbilityCheckAddedDieUses(
        battleStateAfterD20TestRerollUses(current, [use.rerolls]),
        [use.addedDice],
      ),
    state,
  );
}

/** The saving throw hole asked again with what its roller has to decide next. */
export function savingThrowHoleAskedAfterRoll<
  T extends BattleSavingThrowAfterRollHoleOptions,
>(hole: T, ask: SavingThrowAfterRollAsk): T {
  return ask.stage === "rerolls"
    ? savingThrowHoleWithRerollOptions(hole, ask.options)
    : savingThrowHoleWithAddedDieOptions(hole, ask.options);
}

/** The ability check hole asked again with what its roller has to decide next. */
export function abilityCheckHoleAskedAfterRoll<
  T extends BattleD20TestRerollHoleOptions &
    BattleAbilityCheckAddedDieHoleOptions,
>(hole: T, ask: AbilityCheckAfterRollAsk): T {
  return ask.stage === "rerolls"
    ? d20TestHoleWithRerollOptions(hole, ask.options)
    : abilityCheckHoleWithAddedDieOptions(hole, ask.options);
}
