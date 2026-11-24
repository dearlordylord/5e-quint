import { optionalProperty } from "./optional-property.ts";
// KERNEL-COVERAGE: parity-witness BATTLE.D20_TEST.HEROIC_INSPIRATION_REROLL BATTLE.EQUIPMENT.AMMUNITION_LIFECYCLE BATTLE.ATTACK.THROWN_WEAPON_ATTACK
import { Match } from "effect";
import { expect, test } from "vitest";
import {
  HEROIC_INSPIRATION_AVAILABLE,
  NO_HEROIC_INSPIRATION,
} from "@dnd/shared/game-facts";
import { DieRollResult, movementFeet } from "@dnd/shared/types";
import { endTurn } from "./index.ts";
import {
  attackExecutionSelectionForOption,
  boundAttackExecutionSelectionMatchesOption,
} from "./battle-action-options.ts";
import { battleAmmunitionStock } from "./battle-ammunition.ts";
import { attackActionOptionsForActor } from "./battle-reducer/attack-damage-apply.ts";
import {
  HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
  type BattleHeroicInspirationRerollDecision,
} from "./battle-state-execution.ts";
import {
  admitCharacterWeaponAttackExecutionWeapon,
  attackRollFill,
  attackTargetDistanceSpatialFact,
  battleAbilityModifier,
  battleFrontierInterruptDecisionForState,
  battleId,
  battleObjectId,
  battleTablePositionId,
  cantripSpellInvocationRef,
  characterSeed,
  damageRollFill,
  fighterId,
  goblinId,
  interruptDecisionFill,
  readyDeclarationFillForTest,
  requireCharacterSpellProcedureRefForTest,
  requireHole,
  requireResolved,
  resolveBattleInterrupt,
  resolveBattleSubject,
  resolveReadySpellForTest,
  startBattleSessionRight,
  statBlockCreatureInit,
  targetFill,
  testCharacterD20Statistics,
  testSlingAttack,
  testSlingUnitRef,
  thrownWeaponLandingFactsForTest,
  unitLibrary,
  wizardId,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";

const PARENT_ATTACK_KINDS = ["throw", "ammunition"] as const;
type ParentAttackKind = (typeof PARENT_ATTACK_KINDS)[number];
const landingPosition = battleTablePositionId("accepted-parent-throw-landing");

function parentWeapon(kind: ParentAttackKind) {
  return Match.value(kind).pipe(
    Match.when("throw", () => {
      const spear = unitLibrary.requireUnit("weapon_spear");
      if (spear.kind !== "weapon") throw new Error("Expected SRD Spear.");
      return {
        attack: {
          kind: "weapon" as const,
          ...admitCharacterWeaponAttackExecutionWeapon(
            spear,
            battleObjectId("main:weapon_spear"),
          ),
          ability: "str" as const,
          abilityModifier: battleAbilityModifier(3),
        },
        characterUnitRefs: undefined,
        stocks: [],
        delivery: "thrown" as const,
      };
    }),
    Match.when("ammunition", () => ({
      attack: testSlingAttack(),
      characterUnitRefs: [testSlingUnitRef()],
      stocks: [battleAmmunitionStock("sling_bullet", 20)],
      delivery: undefined,
    })),
    Match.exhaustive,
  );
}

function readyParentAttack(kind: ParentAttackKind) {
  const parent = parentWeapon(kind);
  const session = startBattleSessionRight({
    battleId: battleId(`accepted-${kind}-nested-ready`),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Wizard",
        initiative: 30,
        attack: null,
        heroicInspiration: HEROIC_INSPIRATION_AVAILABLE,
        spellcasting: wizardSpellcasting(),
      }),
      characterSeed({
        initiative: 20,
        attack: parent.attack,
        ...optionalProperty("characterUnitRefs", parent.characterUnitRefs),
        ammunitionStocks: parent.stocks,
        heroicInspiration: HEROIC_INSPIRATION_AVAILABLE,
        d20Statistics: testCharacterD20Statistics({ str: 16, dex: 16 }),
        selectedLoadout: {
          weapon: {
            itemId: parent.attack.weaponObjectId,
            unitId: parent.attack.weapon.weaponUnitId,
            grip: "one_handed",
          },
        },
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
  const wizardReady = requireResolved(
    resolveReadySpellForTest({
      state: session.state,
      actorId: wizardId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        wizardId,
        cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
      ),
      trigger: "attackHit",
    }),
  ).state;
  const fighterTurn = requireResolved(
    endTurn({ state: wizardReady, actorId: wizardId }),
  ).state;
  const attack = attackActionOptionsForActor(fighterTurn, fighterId).find(
    (option) =>
      option.kind === "weapon" &&
      option.weaponDelivery?.kind === parent.delivery,
  );
  if (attack?.kind !== "weapon")
    throw new Error("Expected the chosen parent weapon delivery.");
  const subject = {
    tag: "action" as const,
    actorId: fighterId,
    action: "ready" as const,
  };
  const hole = requireHole(
    resolveBattleSubject({ state: fighterTurn, subject, fills: [] }),
    "readyDeclaration",
  );
  if (hole.kind !== "readyDeclaration")
    throw new Error("Expected Ready declaration.");
  const response = hole.responseChoices.find(
    (choice) =>
      choice.kind === "attack" &&
      boundAttackExecutionSelectionMatchesOption(choice.selection, attack),
  );
  if (response?.kind !== "attack")
    throw new Error("Expected the advertised weapon response.");
  const ready = requireResolved(
    resolveBattleSubject({
      state: fighterTurn,
      subject,
      fills: [
        readyDeclarationFillForTest(
          hole,
          "When the opponent signals",
          response,
        ),
      ],
    }),
  ).state;
  const goblinTurn = requireResolved(
    endTurn({ state: ready, actorId: fighterId }),
  ).state;
  const triggered = resolveBattleSubject({
    state: goblinTurn,
    subject: {
      tag: "runtimeCommand",
      actorId: goblinId,
      command: "reportReadyTrigger",
      readiedActorId: fighterId,
    },
    fills: [],
  });
  if (triggered.tag !== "needsHoles")
    throw new Error("Expected the public Ready trigger.");
  const decision = battleFrontierInterruptDecisionForState(triggered.state);
  const choice = decision?.choices.find(
    (candidate) =>
      candidate.kind === "nestedProcedure" &&
      candidate.subject.command === "releaseReadiedAttack" &&
      candidate.subject.targetId === goblinId,
  );
  if (
    decision == null ||
    choice?.kind !== "nestedProcedure" ||
    choice.subject.command !== "releaseReadiedAttack"
  ) {
    throw new Error("Expected the advertised parent readied attack.");
  }
  const opened = resolveBattleInterrupt({
    state: triggered.state,
    fill: interruptDecisionFill(decision.decisionHole, {
      kind: "resolve",
      responderId: fighterId,
      choice: {
        kind: "releaseReadiedAttack",
        targetId: goblinId,
        procedureRef: choice.subject.procedureRef,
        fills: [],
      },
    }),
  });
  if (opened.tag !== "needsHoles")
    throw new Error("Expected the parent target facts.");
  return { opened, subject: choice.subject, attack };
}

function reroll(
  total: number,
  natural: number,
): BattleHeroicInspirationRerollDecision {
  return {
    kind: "reroll",
    effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
    replacement: {
      total,
      d20TestRoll: { tag: "single", naturalD20: DieRollResult(natural) },
    },
  };
}

test.each(PARENT_ATTACK_KINDS)(
  "a nested inspired spell preserves its readied parent %s exactly once",
  (kind) => {
    const parent = readyParentAttack(kind);
    const targetHole = requireHole(parent.opened, "targetChoice");
    const selection = attackExecutionSelectionForOption(parent.attack);
    const target = targetFill(targetHole, goblinId, [
      attackTargetDistanceSpatialFact(
        fighterId,
        goblinId,
        selection,
        movementFeet(15),
      ),
      {
        kind: "rangedAttackEnemyProximity",
        attackerId: fighterId,
        procedureRef: parent.attack.procedureRef,
        enemies: [],
      },
      ...thrownWeaponLandingFactsForTest(targetHole, [], landingPosition),
    ]);
    const roll = requireHole(
      resolveBattleSubject({
        state: parent.opened.state,
        subject: parent.subject,
        fills: [target],
      }),
      "attackRoll",
    );
    const awaiting = resolveBattleSubject({
      state: parent.opened.state,
      subject: parent.subject,
      fills: [
        target,
        attackRollFill(roll, {
          total: 7,
          naturalD20: 2,
          d20TestRerolls: [reroll(24, 19)],
        }),
      ],
    });
    if (awaiting.tag !== "needsHoles")
      throw new Error("Expected the parent's attack-hit interrupt.");
    Match.value(kind).pipe(
      Match.when("throw", () =>
        expect(
          awaiting.state.groundObjects
            .get(fighterId)
            ?.get(parent.attack.weaponObjectId)?.positionId,
        ).toBe(landingPosition),
      ),
      Match.when("ammunition", () =>
        expect(
          awaiting.state.combatants.get(fighterId)?.ammunitionStocks,
        ).toEqual([battleAmmunitionStock("sling_bullet", 19)]),
      ),
      Match.exhaustive,
    );
    const decision = battleFrontierInterruptDecisionForState(awaiting.state);
    const choice = decision?.choices.find(
      (candidate) =>
        candidate.kind === "nestedProcedure" &&
        candidate.subject.command === "releaseReadiedSpell",
    );
    if (
      decision == null ||
      choice?.kind !== "nestedProcedure" ||
      choice.subject.command !== "releaseReadiedSpell"
    )
      throw new Error("Expected the advertised nested Ray.");
    const opened = resolveBattleInterrupt({
      state: awaiting.state,
      fill: interruptDecisionFill(decision.decisionHole, {
        kind: "resolve",
        responderId: wizardId,
        choice: {
          kind: "releaseReadiedSpell",
          procedureRef: choice.subject.procedureRef,
          fills: [],
        },
      }),
    });
    if (opened.tag !== "needsHoles")
      throw new Error("Expected the nested spell's target.");
    const nestedTarget = targetFill(
      requireHole(opened, "targetChoice"),
      fighterId,
    );
    const nestedRoll = requireHole(
      resolveBattleSubject({
        state: opened.state,
        subject: choice.subject,
        fills: [nestedTarget],
      }),
      "attackRoll",
    );
    const resumed = resolveBattleSubject({
      state: opened.state,
      subject: choice.subject,
      fills: [
        nestedTarget,
        attackRollFill(nestedRoll, {
          total: 7,
          naturalD20: 2,
          d20TestRerolls: [reroll(8, 3)],
        }),
      ],
    });
    const damage = requireHole(resumed, "rolledDice");
    if (resumed.tag !== "needsHoles")
      throw new Error("Expected the parent damage replay to resume.");
    const beforeHp = resumed.state.combatants.get(goblinId)?.hp;
    const completion = resolveBattleSubject({
      state: resumed.state,
      subject: parent.subject,
      fills: [
        target,
        attackRollFill(roll, {
          total: 7,
          naturalD20: 2,
          d20TestRerolls: [reroll(24, 19)],
        }),
        damageRollFill(damage, 1),
      ],
    });
    const completed = requireResolved(completion);
    const afterHp = completed.state.combatants.get(goblinId)?.hp;
    if (beforeHp === undefined || afterHp === undefined)
      throw new Error("Expected the parent target.");
    expect(Number(beforeHp) - Number(afterHp)).toBe(4);
    expect(completed.state.interruptStack).toEqual([]);
    expect(completed.state.subjectResolutionPhase).toEqual({
      kind: "subjectSelection",
    });
    for (const actorId of [fighterId, wizardId]) {
      const actor = completed.state.combatants.get(actorId);
      if (actor?.origin.kind !== "character")
        throw new Error("Expected inspired characters.");
      expect(actor.origin.heroicInspiration).toEqual(NO_HEROIC_INSPIRATION);
    }
    Match.value(kind).pipe(
      Match.when("throw", () => {
        expect(completed.state.groundObjects.get(fighterId)?.size).toBe(1);
        expect(
          completed.state.groundObjects
            .get(fighterId)
            ?.get(parent.attack.weaponObjectId)?.positionId,
        ).toBe(landingPosition);
        expect(completed.droppedObjects).toEqual([
          {
            kind: "objectDropped",
            actorId: fighterId,
            objectId: parent.attack.weaponObjectId,
            source: {
              kind: "thrownWeaponAttack",
              procedureRef: parent.attack.procedureRef,
            },
          },
        ]);
      }),
      Match.when("ammunition", () => {
        expect(
          completed.state.combatants.get(fighterId)?.ammunitionStocks,
        ).toEqual([battleAmmunitionStock("sling_bullet", 19)]);
        expect(completed.droppedObjects ?? []).toEqual([]);
      }),
      Match.exhaustive,
    );
  },
);
