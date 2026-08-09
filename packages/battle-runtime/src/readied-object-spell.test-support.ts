import {
  armorClass,
  attackInitialTargetHole,
  attackRollFill,
  attackRollHoleAfterTarget,
  battleId,
  battleObjectId,
  battleProcedureExecutionRefForSpellHoleForTest,
  cantripSpellInvocationRef,
  characterSeed,
  damageRollFill,
  damageRollFillWithGroups,
  endTurn,
  findHole,
  Hp,
  interruptDecisionFill,
  movementFeet,
  objectTargetFill,
  reactionChoiceWithSubject,
  requireCharacterSpellProcedureRefForTest,
  requireHole,
  requireNeedsHoles,
  requireResolved,
  resolveBattleInterrupt,
  resolveBattleSubject,
  skeletonCreatureInit,
  skeletonId,
  spellRecord,
  startBattleSessionRight,
  statBlockAttackSubjectForTest,
  targetFill,
  wizardId,
  wizardSpellcasting,
  type BattleFill,
  type BattleSubject,
} from "./battle-runtime.test-support.ts";

type BattleSubjectResolution = ReturnType<typeof resolveBattleSubject>;
type ResolvedBattleResult = Extract<
  BattleSubjectResolution,
  { readonly tag: "resolved" }
>;
type NeedsHolesBattleResult = Extract<
  BattleSubjectResolution,
  { readonly tag: "needsHoles" }
>;
type ReadiedReleaseSubject = Extract<
  BattleSubject,
  {
    readonly tag: "runtimeCommand";
    readonly command: "releaseReadiedSpell";
  }
>;
type ObjectTargetChoiceFill = Extract<
  BattleFill,
  { readonly kind: "objectTargetChoice" }
>;

export type ReadiedFireBoltObjectScenario = {
  readonly skeletonTurn: ResolvedBattleResult;
  readonly awaitingRelease: NeedsHolesBattleResult;
  readonly releaseSubject: ReadiedReleaseSubject;
  readonly releaseStart: NeedsHolesBattleResult;
  readonly objectId: ObjectTargetChoiceFill["value"];
  readonly objectTarget: ObjectTargetChoiceFill;
  readonly resumedAttack: NeedsHolesBattleResult;
  readonly completed: ResolvedBattleResult;
};

/**
 * Runs the public Ready → attack-hit interrupt → object-target release path.
 * Callers own the behavior assertions; this helper only returns the typed
 * protocol facts produced by the shared reducer sequence.
 */
export function resolveReadiedFireBoltObjectScenario(input: {
  readonly battleIdValue: ReturnType<typeof battleId>;
}): ReadiedFireBoltObjectScenario {
  const session = startBattleSessionRight({
    battleId: input.battleIdValue,
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Wizard",
        initiative: 20,
        attack: null,
        classLevel: 5,
        spellcasting: wizardSpellcasting({
          cantrips: [spellRecord("fire_bolt")],
          preparedSpells: [],
        }),
      }),
      skeletonCreatureInit({ initiative: 10 }),
    ],
  });
  const procedureRef = requireCharacterSpellProcedureRefForTest(
    session,
    wizardId,
    cantripSpellInvocationRef("fire_bolt", "spellAttackDamage"),
  );
  const ready = requireResolved(
    resolveBattleSubject({
      state: session.state,
      subject: {
        tag: "actionSpell",
        actorId: wizardId,
        procedureRef,
        mode: { tag: "ready", trigger: "attackHit" },
      },
      fills: [],
    }),
  );
  const skeletonTurn = requireResolved(
    endTurn({ state: ready.state, actorId: wizardId }),
  );
  const attackSubject = statBlockAttackSubjectForTest(
    skeletonTurn.state,
    skeletonId,
    "Shortsword",
    "actions",
  );
  const attackTarget = attackInitialTargetHole(
    skeletonTurn.state,
    attackSubject,
  );
  const attackRoll = attackRollHoleAfterTarget(
    skeletonTurn.state,
    attackTarget,
    attackSubject,
    wizardId,
  );
  const awaitingRelease = requireNeedsHoles(
    resolveBattleSubject({
      state: skeletonTurn.state,
      subject: attackSubject,
      fills: [
        targetFill(attackTarget, wizardId),
        attackRollFill(attackRoll, { total: 20, naturalD20: 15 }),
      ],
    }),
  );
  const pendingInterrupt = awaitingRelease.snapshot.pendingInterrupt;
  if (pendingInterrupt === null) {
    throw new Error("Expected an attack-hit interrupt checkpoint.");
  }
  const releaseChoice = reactionChoiceWithSubject(pendingInterrupt.choices);
  if (
    releaseChoice.subject.tag !== "runtimeCommand" ||
    releaseChoice.subject.command !== "releaseReadiedSpell"
  ) {
    throw new Error("Expected a readied-spell release subject.");
  }
  const releaseSubject = releaseChoice.subject;
  const releaseStart = requireNeedsHoles(
    resolveBattleInterrupt({
      state: awaitingRelease.state,
      fill: interruptDecisionFill(pendingInterrupt.decisionHole, {
        kind: "resolve",
        responderId: wizardId,
        choice: {
          kind: "releaseReadiedSpell",
          readiedSpellCasterId: wizardId,
          procedureRef: releaseSubject.procedureRef,
          fills: [],
        },
      }),
    }),
  );
  const objectHole = findHole(releaseStart.holes, "objectTargetChoice");
  const objectId = battleObjectId("readied-fire-bolt-dummy");
  const objectTarget = objectTargetFill({
    hole: objectHole,
    objectId,
    rangeFeet: movementFeet(120),
    damageDisposition: { kind: "hitPoints", hitPoints: Hp(8) },
    spatialFacts: [
      {
        kind: "spellObjectTarget",
        casterId: wizardId,
        objectId,
        sourceProcedureRef:
          battleProcedureExecutionRefForSpellHoleForTest(objectHole),
        rangeFeet: movementFeet(120),
        armorClass: armorClass(13),
        damageDisposition: { kind: "hitPoints", hitPoints: Hp(8) },
      },
      {
        kind: "spellObjectIgnition",
        casterId: wizardId,
        objectId,
        sourceProcedureRef:
          battleProcedureExecutionRefForSpellHoleForTest(objectHole),
        disposition: { kind: "flammableUnattended" },
      },
    ],
  });
  const objectAttack = requireHole(
    resolveBattleSubject({
      state: releaseStart.state,
      subject: releaseSubject,
      fills: [objectTarget],
    }),
    "attackRoll",
  );
  const objectDamage = requireHole(
    resolveBattleSubject({
      state: releaseStart.state,
      subject: releaseSubject,
      fills: [
        objectTarget,
        attackRollFill(objectAttack, { total: 18, naturalD20: 12 }),
      ],
    }),
    "rolledDice",
  );
  const resumedAttack = requireNeedsHoles(
    resolveBattleSubject({
      state: releaseStart.state,
      subject: releaseSubject,
      fills: [
        objectTarget,
        attackRollFill(objectAttack, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(objectDamage, [[4, 5]]),
      ],
    }),
  );
  const triggeringAttackDamage = findHole(resumedAttack.holes, "rolledDice");
  const completed = requireResolved(
    resolveBattleSubject({
      state: resumedAttack.state,
      subject: attackSubject,
      fills: [damageRollFill(triggeringAttackDamage, 3)],
    }),
  );
  return {
    skeletonTurn,
    awaitingRelease,
    releaseSubject,
    releaseStart,
    objectId,
    objectTarget,
    resumedAttack,
    completed,
  };
}
