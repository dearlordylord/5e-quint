import { describe, expect, test } from "vitest";
import { Schema } from "effect";
import * as Either from "effect/Either";

import {
  attackRollFill,
  attackDamageDispositionFill,
  battleFrontierInterruptDecisionForState,
  battleId,
  characterSeed,
  combatantId,
  damageRollFillWithGroups,
  discoverBattleActs,
  findHole,
  Hp,
  interruptDecisionFill,
  requireCharacterSpellProcedureRefForTest,
  requireHole,
  resolveBattleInterrupt,
  resolveBattleSubject,
  savingThrowOutcomeFill,
  movementFeet,
  spellRecord,
  spellSlotInvocationRef,
  startBattleSessionRight,
  targetFill,
  testUnarmedStrikeDamageAttack,
  unitLibrary,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import {
  BattleCheckpointFrontierEnvelopeSchema,
  battleCheckpointFrontierEnvelope,
  type AvailableBattleAct,
  type BattleFill,
  type BattleInterruptProcedureChoice,
  type BattleSubject,
} from "./index.ts";

const damagerId = combatantId("attack-reaction-damager");
const casterId = combatantId("attack-reaction-caster");

type AttackAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >;
};

describe("battle runtime: attack reaction coverage", () => {
  test("Hellish Rebuke resolves a zero-hit-point replacement for its attacker", () => {
    const hellishRebuke = spellRecord("hellish_rebuke");
    const session = startBattleSessionRight({
      battleId: battleId("battle-attack-reaction-zero-hp"),
      combatants: [
        characterSeed({
          combatantId: damagerId,
          displayName: "Fragile Orc",
          initiative: 20,
          currentHp: 1,
          maxHp: 20,
          attack: null,
          resources: [
            { unit: unitLibrary.requireUnit("orc_relentless_endurance") },
          ],
          unarmedStrike: testUnarmedStrikeDamageAttack(),
        }),
        characterSeed({
          combatantId: casterId,
          displayName: "Hellish Rebuke caster",
          initiative: 10,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [hellishRebuke],
            spellSlots: [{ spellLevel: 2, count: 1 }],
          }),
        }),
      ],
    });

    const attackAct = discoverBattleActs(session).find(
      (candidate): candidate is AttackAct =>
        candidate.subject.tag === "action" &&
        candidate.subject.action === "attack" &&
        candidate.subject.actorId === damagerId,
    );
    if (attackAct === undefined) {
      throw new Error("Expected the Orc Unarmed Strike attack act.");
    }
    const targetHole = findHole(attackAct.initialHoles, "targetChoice");
    const baseTargetFill = targetFill(targetHole, casterId);
    if (baseTargetFill.kind !== "targetChoice") {
      throw new Error("Expected a target-choice fill.");
    }
    const hellishProcedureRef = requireCharacterSpellProcedureRefForTest(
      session,
      casterId,
      spellSlotInvocationRef("hellish_rebuke", 2, "saveGatedDamage"),
    );
    const targetChoice = {
      ...baseTargetFill,
      spatialFacts: [
        ...(baseTargetFill.spatialFacts ?? []),
        {
          kind: "reactionSpellDamagerVisibleWithinRange" as const,
          reactorId: casterId,
          damageSourceId: damagerId,
          sourceProcedureRef: hellishProcedureRef,
          rangeFeet: movementFeet(60),
        },
      ],
    } satisfies Extract<BattleFill, { readonly kind: "targetChoice" }>;
    const attackRollHole = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject: attackAct.subject,
        fills: [targetChoice],
      }),
      "attackRoll",
    );
    const attackRoll = attackRollFill(attackRollHole, {
      total: 20,
      naturalD20: 15,
    });
    const awaitingReaction = resolveBattleSubject({
      state: session.state,
      subject: attackAct.subject,
      fills: [targetChoice, attackRoll],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Hellish Rebuke after-damage reaction window.");
    }
    const choice = battleFrontierInterruptDecisionForState(
      awaitingReaction.state,
    )?.choices.find(
      (
        candidate,
      ): candidate is Extract<
        BattleInterruptProcedureChoice,
        { readonly kind: "nestedProcedure" }
      > =>
        candidate.kind === "nestedProcedure" &&
        candidate.subject.command === "castTriggeredReactionSpell" &&
        candidate.subject.reactorId === casterId,
    );
    if (
      choice === undefined ||
      choice.subject.tag !== "runtimeCommand" ||
      choice.subject.command !== "castTriggeredReactionSpell"
    ) {
      throw new Error("Expected Hellish Rebuke reaction choice.");
    }
    const encoded = Schema.encodeSync(BattleCheckpointFrontierEnvelopeSchema)(
      battleCheckpointFrontierEnvelope(awaitingReaction.state),
    );
    expect(
      Either.isRight(
        Schema.decodeUnknownEither(BattleCheckpointFrontierEnvelopeSchema)(
          encoded,
        ),
      ),
    ).toBe(true);
    const saveHole = findHole(choice.initialHoles, "savingThrowOutcome");
    const damageHole = findHole(choice.initialHoles, "rolledDice");
    const reactionFills = [
      savingThrowOutcomeFill(saveHole, [
        { targetId: damagerId, succeeded: false },
      ]),
      damageRollFillWithGroups(damageHole, [[3, 3, 3]]),
    ];
    const resolvedReaction = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        findHole(awaitingReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: casterId,
          choice: {
            kind: "castTriggeredReactionSpell",
            procedureRef: choice.subject.procedureRef,
            fills: reactionFills,
          },
        },
      ),
    });
    if (resolvedReaction.tag !== "needsHoles") {
      throw new Error(
        "Expected Hellish Rebuke damage to request zero-hit-point disposition.",
      );
    }
    const dispositionHole = findHole(
      resolvedReaction.holes,
      "attackDamageDisposition",
    );
    const replacement = dispositionHole.choices.find(
      (candidate) => candidate.kind === "zeroHitPointReplacement",
    );
    if (replacement === undefined) {
      throw new Error("Expected Relentless Endurance replacement choice.");
    }
    const resumed = resolveBattleSubject({
      state: resolvedReaction.state,
      subject: choice.subject,
      fills: [
        ...reactionFills,
        attackDamageDispositionFill(dispositionHole, replacement),
      ],
    });
    expect(resumed).toMatchObject({
      tag: "resolved",
    });
    if (resumed.tag !== "resolved") {
      throw new Error("Expected Hellish Rebuke replacement to resolve.");
    }
    expect(resumed.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: damagerId,
          hp: Hp(1),
          reactionAvailable: true,
        }),
        expect.objectContaining({
          combatantId: casterId,
          hp: Hp(8),
          reactionAvailable: false,
        }),
      ]),
    );
  });
});
