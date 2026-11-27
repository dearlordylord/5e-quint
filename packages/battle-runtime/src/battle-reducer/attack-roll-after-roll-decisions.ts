// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.FAILED_D20_TEST_ADDED_DIE
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.bardic-inspiration-failed-d20-test
// Every decision an attack roll takes after its roll: its rerolls
// (attack-roll-d20-test-rerolls.ts), then the dice added to the roll the
// rerolls leave while it misses (d20-test-added-dice.ts, ASSUMPTIONS.md A67).
// The engine judges the hit with the target's Armor Class as it stands, so a
// roll that a Reaction later turns into a miss is offered the dice when the
// attack resumes (A69). Each owner of an attack roll goes through here, so the
// two stages can't be taken out of order.

import type {
  BattleAttackRollHole,
  BattleAttackRollResult,
  BattleSpellAttackRollHole,
  BattleState,
} from "../battle-state-execution.ts";
import {
  attackRollD20TestRerolls,
  attackRollHoleWithD20TestRerollOptions,
  type AttackRollD20TestRerollInput,
  type AttackRollD20TestRerollOptions,
  type AttackRollRerollUses,
} from "./attack-roll-d20-test-rerolls.ts";
import {
  attackRollAddedDice,
  battleStateAfterD20TestAddedDieUses,
  d20TestHoleWithAddedDieOptions,
  type D20TestAddedDieOptions,
  type D20TestAddedDieUses,
} from "./d20-test-added-dice.ts";
import {
  afterRollDecisions,
  type D20TestAfterRoll,
} from "./d20-test-after-roll-decisions.ts";
import { battleStateAfterHeroicInspirationReroll } from "./heroic-inspiration-reroll.ts";

/** What an attack roll hole is asked again with: its rerolls, or once they are decided, its added dice. */
export type AttackRollAfterRollAsk =
  | {
      readonly stage: "rerolls";
      readonly options: AttackRollD20TestRerollOptions;
    }
  | {
      readonly stage: "addedDice";
      readonly options: D20TestAddedDieOptions;
    };

/** What an admitted attack roll's after-roll decisions cost its roller. */
export type AttackRollAfterRollUses = {
  readonly rerolls: AttackRollRerollUses;
  readonly addedDice: D20TestAddedDieUses;
};

/** Where an attack roll's after-roll decisions stand. */
export type AttackRollAfterRoll = D20TestAfterRoll<
  BattleAttackRollResult,
  AttackRollAfterRollAsk,
  AttackRollAfterRollUses
>;

/**
 * An attack roll after its after-roll decisions: the roll that stands, which
 * the caller judges against the target. `misses` judges a roll as it stands
 * against the same Armor Class, so the dice are offered only on a miss.
 */
export function attackRollAfterRollDecisions(
  input: AttackRollD20TestRerollInput & {
    readonly misses: (attackRoll: BattleAttackRollResult) => boolean;
  },
): AttackRollAfterRoll {
  return afterRollDecisions(
    attackRollD20TestRerolls(input),
    input.attackRoll.d20TestAddedDice !== undefined,
    (attackRoll) =>
      attackRollAddedDice({
        state: input.state,
        scope: { kind: "subject", subject: input.subject },
        roll: { rollerId: input.attackerId, holeId: input.attackRollHoleId },
        attackRoll,
        misses: input.misses,
      }),
  );
}

/** Spends what an admitted attack roll's after-roll decisions cost. */
export function battleStateAfterAttackRollAfterRollUses(
  state: BattleState,
  uses: AttackRollAfterRollUses,
): BattleState {
  return battleStateAfterD20TestAddedDieUses(
    battleStateAfterHeroicInspirationReroll(
      state,
      uses.rerolls.heroicInspiration,
    ),
    [uses.addedDice],
  );
}

/** The attack roll hole asked again with what its roller has to decide next. */
export function attackRollHoleAskedAfterRoll<
  T extends BattleAttackRollHole | BattleSpellAttackRollHole,
>(hole: T, ask: AttackRollAfterRollAsk): T {
  return ask.stage === "rerolls"
    ? attackRollHoleWithD20TestRerollOptions(hole, ask.options)
    : d20TestHoleWithAddedDieOptions(hole, ask.options);
}
