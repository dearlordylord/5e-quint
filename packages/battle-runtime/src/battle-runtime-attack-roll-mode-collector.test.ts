// KERNEL-COVERAGE: parity-witness BATTLE.ATTACK.ROLL_MODE_COLLECTOR
// RAW: .references/srd-5.2.1/rules-glossary.md
// - Grappled, "Attacks Affected.": "You have Disadvantage on attack rolls
//   against any target other than the grappler."
// - Restrained, "Attacks Affected.": "your attack rolls have Disadvantage."
// - Prone, "Attacks Affected.": "An attack roll against you has Advantage if
//   the attacker is within 5 feet of you."
// .references/srd-5.2.1/playing-the-game.md#Advantage/Disadvantage: any
// Advantage plus any Disadvantage cancels to a normal roll.
import { armorClass } from "@dnd/shared-algebras/armor-class-algebra";
import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import {
  difficultyClass,
  Hp,
  movementFeet,
  NonNegativeInteger,
  type Condition,
} from "@dnd/shared/types";
import { describe, expect, test } from "vitest";
import { firstMeleeAttack } from "./attack-roll-spatial.test-support.ts";
import {
  attackRollModeContributions,
  attackRollModeFromContributions,
  type AttackRollModeContext,
} from "./battle-reducer/attack-roll-mode-collector.ts";
import { battleCreatureStateWithKnockOutPreservedConditions } from "./battle-reducer/creature-hit-point-state.ts";
import { attackExecutionSelectionForOption } from "./battle-action-options.ts";
import {
  attackTargetDistanceSpatialFact,
  attackTargetFill,
  battleId,
  battleProcedureExecutionRefForSpellHoleForTest,
  characterSeed,
  fighterAttackSubject,
  fighterId,
  fighterVsGoblinBattle,
  findAct,
  findHole,
  goblinId,
  magicSubject,
  objectTargetFill,
  requireHole,
  resolveBattleSubject,
  skeletonCreatureInit,
  skeletonId,
  spellRecord,
  startBattleSessionRight,
  wizardId,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import type {
  BattleFill,
  BattleGrappleLink,
  BattleState,
} from "./battle-state-execution.ts";
import type { UnitFeatureProcedureExecution } from "./character-execution-admission.ts";
import {
  battleObjectId,
  battleProcedureExecutionCursor,
  battleProcedureExecutionRef,
  combatantId,
  type CombatantId,
} from "./identity.ts";
import { requireCombatant } from "./unit-profile-admission-creature-fixture.test-support.ts";

const objectId = battleObjectId("synthetic_collector_target");

function grappledBy(
  state: BattleState,
  grapplerId: CombatantId,
  targetId: CombatantId,
): BattleState {
  const link: BattleGrappleLink = {
    grapplerId,
    targetId,
    escapeDc: difficultyClass(12),
    reachFeet: movementFeet(5),
    hand: "right",
  };
  return { ...state, grapples: [link] };
}

function withCondition(
  state: BattleState,
  condition: Condition,
  id: CombatantId,
): BattleState {
  const creature = requireCombatant(state, id);
  return {
    ...state,
    combatants: new Map(state.combatants).set(
      id,
      battleCreatureStateWithKnockOutPreservedConditions(
        creature,
        applyCondition(creature.conditions, condition),
      ),
    ),
  };
}

function fighterRollModeAgainstGoblin(state: BattleState) {
  const subject = fighterAttackSubject(state);
  const targetHole = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  return requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [attackTargetFill(targetHole, fighterId, goblinId)],
    }),
    "attackRoll",
  ).rollMode;
}

function fighterRollModeAgainstObject(state: BattleState) {
  const subject = fighterAttackSubject(state);
  const targetHole = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const target = {
    kind: "objectTargetChoice",
    holeId: targetHole.holeId,
    value: objectId,
    spatialFacts: [
      {
        kind: "attackObjectTarget",
        actorId: fighterId,
        objectId,
        range: { kind: "meleeReach" },
        attackerCanSeeObject: true,
        cover: "none",
        armorClass: armorClass(15),
        damageDisposition: { kind: "hitPoints", hitPoints: Hp(30) },
      },
    ],
  } as const satisfies BattleFill;
  return requireHole(
    resolveBattleSubject({ state, subject, fills: [target] }),
    "attackRoll",
  ).rollMode;
}

function fireBoltBattle() {
  return startBattleSessionRight({
    battleId: battleId("battle-collector-fire-bolt-object"),
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
}

function outlinedByWizard(
  session: ReturnType<typeof fireBoltBattle>,
  state: BattleState,
): BattleState {
  const hole = findHole(
    findAct(session, magicSubject("fire_bolt")).initialHoles,
    "objectTargetChoice",
  );
  return {
    ...state,
    objectOutlines: [
      {
        kind: "saveGatedTargetProjectionObject",
        objectId,
        sourceProcedureRef:
          battleProcedureExecutionRefForSpellHoleForTest(hole),
        sourceCombatantId: wizardId,
        expiresAt: { kind: "concentration", combatantId: wizardId },
      },
    ],
  };
}

// A synthetic ongoing feature: Advantage on the wizard's own attack rolls, with
// no ability filter, active until the start of the wizard's next turn.
const selfAttackAdvantageFeature: Extract<
  UnitFeatureProcedureExecution,
  { readonly kind: "ongoingFeature" }
> = {
  kind: "ongoingFeature",
  activationTrigger: "bonusAction",
  spendsUse: false,
  lifecycle: {
    kind: "turnBoundary",
    initialExpiration: "startOfNextTurn",
    earlyEndConditions: [],
    earlyEndArmorCategories: [],
    extensionTriggers: [],
  },
  actionRestrictions: [],
  rollModifiers: [{ mode: "advantage", affects: "selfRoll", on: "attackRoll" }],
  spellModifiers: [],
  damageModifiers: [],
  resistances: [],
};

function withActiveSelfAttackAdvantage(state: BattleState): BattleState {
  const wizard = requireCombatant(state, wizardId);
  if (wizard.origin.kind !== "character") {
    throw new Error("Expected the wizard to be a character.");
  }
  const ordinal = Number(wizard.origin.execution.nextProcedureOrdinal);
  const procedureRef = battleProcedureExecutionRef(
    wizard.origin.execution.scopeRef,
    NonNegativeInteger(ordinal),
  );
  return {
    ...state,
    combatants: new Map(state.combatants).set(wizardId, {
      ...wizard,
      origin: {
        ...wizard.origin,
        execution: {
          ...wizard.origin.execution,
          nextProcedureOrdinal: battleProcedureExecutionCursor(ordinal + 1),
          procedureBindings: [
            ...wizard.origin.execution.procedureBindings,
            {
              procedureRef,
              procedure: {
                kind: "unitFeature",
                source: { kind: "intrinsic" },
                execution: selfAttackAdvantageFeature,
              },
            },
          ],
        },
      },
      activeOngoingFeatureOccurrences: new Map(
        wizard.activeOngoingFeatureOccurrences,
      ).set(procedureRef, {
        kind: "turnBoundary",
        expiresAt: { kind: "startOfTurn", combatantId: wizardId },
      }),
    }),
  };
}

function fireBoltRollModeAgainstObject(
  session: ReturnType<typeof fireBoltBattle>,
  state: BattleState,
  attackerCanSeeObject = true,
) {
  const subject = findAct(session, magicSubject("fire_bolt")).subject;
  const hole = findHole(
    findAct(session, subject).initialHoles,
    "objectTargetChoice",
  );
  const sourceProcedureRef =
    battleProcedureExecutionRefForSpellHoleForTest(hole);
  const fill = objectTargetFill({
    hole,
    objectId,
    distanceFeet: movementFeet(30),
    spatialFacts: [
      {
        kind: "spellObjectTarget",
        casterId: wizardId,
        objectId,
        sourceProcedureRef,
        rangeFeet: movementFeet(120),
        distanceFeet: movementFeet(30),
        armorClass: armorClass(13),
        damageDisposition: { kind: "hitPoints", hitPoints: Hp(5) },
      },
      {
        kind: "rangedAttackEnemyProximity",
        attackerId: wizardId,
        procedureRef: sourceProcedureRef,
        enemies: [],
      },
      {
        kind: "spellObjectTargetSight",
        casterId: wizardId,
        objectId,
        sourceProcedureRef,
        attackerCanSeeObject,
      },
      {
        kind: "spellObjectIgnition",
        casterId: wizardId,
        objectId,
        sourceProcedureRef,
        disposition: { kind: "notFlammable" },
      },
    ],
  });
  return requireHole(
    resolveBattleSubject({ state, subject, fills: [fill] }),
    "attackRoll",
  ).rollMode;
}

describe("attack-roll mode collector: one rule on every route", () => {
  test("a Grappled attacker has Disadvantage against an object with a weapon or a spell", () => {
    const weaponBattle = fighterVsGoblinBattle();
    expect(fighterRollModeAgainstObject(weaponBattle)).toBeUndefined();
    expect(
      fighterRollModeAgainstObject(
        grappledBy(weaponBattle, goblinId, fighterId),
      ),
    ).toBe("disadvantage");

    const session = fireBoltBattle();
    expect(
      fireBoltRollModeAgainstObject(session, session.state),
    ).toBeUndefined();
    expect(
      fireBoltRollModeAgainstObject(
        session,
        grappledBy(session.state, skeletonId, wizardId),
      ),
    ).toBe("disadvantage");
  });

  test("a Grappled attacker has no Disadvantage against its grappler", () => {
    const state = fighterVsGoblinBattle();
    expect(
      fighterRollModeAgainstGoblin(grappledBy(state, goblinId, fighterId)),
    ).toBeUndefined();
  });

  // RAW: rules-glossary.md, Invisible: "your attack rolls have Advantage. If a
  // creature can somehow see you, you don't gain this benefit against that
  // creature." An object can't see the attacker.
  test("a hidden attacker has Advantage against an object", () => {
    const state = fighterVsGoblinBattle();
    const fighter = requireCombatant(state, fighterId);
    const hidden: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(fighterId, {
        ...fighter,
        hidden: { discoveryDc: difficultyClass(16) },
      }),
    };
    expect(fighterRollModeAgainstObject(hidden)).toBe("advantage");
  });

  // RAW: playing-the-game.md, "Unseen Attackers and Targets": "When you make
  // an attack roll against a target you can't see, you have Disadvantage."
  test("a spell attack at an object the caster can't see has Disadvantage", () => {
    const session = fireBoltBattle();
    expect(fireBoltRollModeAgainstObject(session, session.state, false)).toBe(
      "disadvantage",
    );
    expect(
      fireBoltRollModeAgainstObject(session, session.state, true),
    ).toBeUndefined();
  });

  // RAW: playing-the-game.md, "Unseen Attackers and Targets", and the outline's
  // Advantage for an attacker that can see the object.
  test("a spell attack at an outlined object asks for sight, and either answer reaches the roll", () => {
    const session = fireBoltBattle();
    const outlined = outlinedByWizard(session, session.state);
    expect(fireBoltRollModeAgainstObject(session, outlined, true)).toBe(
      "advantage",
    );
    expect(fireBoltRollModeAgainstObject(session, outlined, false)).toBe(
      "disadvantage",
    );
  });

  test("the attacker's ongoing feature reaches a spell attack against an object", () => {
    const session = fireBoltBattle();
    expect(
      fireBoltRollModeAgainstObject(
        session,
        withActiveSelfAttackAdvantage(session.state),
      ),
    ).toBe("advantage");
  });

  test("names each source, and opposite sources cancel", () => {
    const state = withCondition(
      withCondition(fighterVsGoblinBattle(), "restrained", fighterId),
      "prone",
      goblinId,
    );
    const attack = firstMeleeAttack(state, fighterId);
    const context: AttackRollModeContext = {
      attackerId: fighterId,
      target: { kind: "creature", creature: requireCombatant(state, goblinId) },
      means: { kind: "attack", attack, opportunityAttack: false },
      targetSpatialFacts: [
        attackTargetDistanceSpatialFact(
          fighterId,
          goblinId,
          attackExecutionSelectionForOption(attack),
          movementFeet(5),
        ),
      ],
      ranged: { longRange: false, closeCombat: false },
    };
    const contributions = attackRollModeContributions(state, context);

    expect(contributions).toEqual([
      { source: "attackerCondition", mode: "disadvantage" },
      { source: "proneTarget", mode: "advantage" },
    ]);
    expect(attackRollModeFromContributions(contributions)).toBe("normal");
  });

  // RAW: playing-the-game.md, "Unseen Attackers and Targets": "When you make
  // an attack roll against a target you can't see, you have Disadvantage."
  test("an object the attacker can't see gives Disadvantage", () => {
    const state = fighterVsGoblinBattle();
    const attack = firstMeleeAttack(state, fighterId);
    const againstObject = (attackerCanSeeObject: boolean) =>
      attackRollModeContributions(state, {
        attackerId: fighterId,
        target: { kind: "object", objectId, attackerCanSeeObject },
        means: { kind: "attack", attack, opportunityAttack: false },
        targetSpatialFacts: [],
        ranged: { longRange: false, closeCombat: false },
      });

    expect(againstObject(false)).toEqual([
      { source: "attackerCannotSeeTarget", mode: "disadvantage" },
    ]);
    expect(againstObject(true)).toEqual([]);
  });

  test("a creature-only source supplies nothing against an object", () => {
    const state = withCondition(
      fighterVsGoblinBattle(),
      "restrained",
      fighterId,
    );
    const attack = firstMeleeAttack(state, fighterId);
    // Help names its helper only for expiry; the benefit reads the ally and
    // the chosen enemy, so the helper needs no combatant record here.
    const helperId = combatantId("synthetic_collector_helper");
    const helped: BattleState = {
      ...state,
      helpAttacks: [
        {
          helperId,
          allyId: fighterId,
          targetEnemyId: goblinId,
          expiresAt: { kind: "startOfTurn", combatantId: helperId },
        },
      ],
    };

    expect(
      attackRollModeContributions(helped, {
        attackerId: fighterId,
        target: {
          kind: "object",
          objectId,
          attackerCanSeeObject: true,
        },
        means: { kind: "attack", attack, opportunityAttack: false },
        targetSpatialFacts: [],
        ranged: { longRange: false, closeCombat: false },
      }),
    ).toEqual([{ source: "attackerCondition", mode: "disadvantage" }]);
  });
});
