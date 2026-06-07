// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.find-familiar-lifecycle
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt B22-FIND-FAMILIAR-IDENTITY-WITNESS find_familiar
// UNIT-IDENTITY-MBT-REPLAY: B22-FIND-FAMILIAR-IDENTITY-WITNESS find_familiar doCastFindFamiliar doRecastFindFamiliarReplacement doDismissAndReappearFindFamiliar doDeliverTouchSpellThroughFindFamiliar
import * as path from "node:path";

import {
  DieRollResult,
  abilityModifier,
  proficiencyBonus,
} from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";
import * as Either from "effect/Either";

import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import { ATTACK_TARGET_HOLE_ID } from "./battle-reducer.ts";
import {
  characterCreature,
  requireHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import {
  cureWoundsUnitId,
  healingWordUnitId,
  oppositionSide,
  partySide,
  statBlockCatalog,
  unitLibrary,
} from "./unit-profile-admission-catalog-support.ts";
import {
  battleId,
  combatantId,
  castFindFamiliar,
  deliverTouchSpellThroughFindFamiliar,
  discoverBattleActs,
  findFamiliarCompanionForOwner,
  findFamiliarFormEligibilityForSpell,
  initiativeScore,
  reappearTemporarilyDismissedFindFamiliar,
  startBattle,
  temporarilyDismissFindFamiliar,
  type BattleState,
  type FindFamiliarFormEligibility,
  type BattleCompanionState,
} from "./index.ts";

type FindFamiliarSelectedIdentityProjection = {
  readonly familiarStatus: BattleCompanionState["status"] | "none";
  readonly formId: string;
  readonly familiarCombatantPresent: boolean;
  readonly replacementCombatantPresent: boolean;
  readonly familiarReactionAvailable: boolean;
  readonly ownerActionAvailable: boolean;
  readonly ownerSpellSlotCommitted: boolean;
  readonly targetHp: number;
  readonly lastResult:
    | "init"
    | "cast"
    | "recast"
    | "dismissedAndReappeared"
    | "touchDelivered";
};
const findFamiliarUnitId = "find_familiar";
const casterId = combatantId("find-familiar-selected-caster");
const familiarId = combatantId("find-familiar-selected-companion");
const replacementFamiliarId = combatantId("find-familiar-selected-replacement");
const targetId = combatantId("find-familiar-selected-target");

const findFamiliarSpell = requireSpellRecord(findFamiliarUnitId);
const cureWoundsSpell = requireSpellRecord(cureWoundsUnitId);
const healingWordSpell = requireSpellRecord(healingWordUnitId);
const familiarEligibility = requireFindFamiliarEligibility(
  findFamiliarFormEligibilityForSpell(findFamiliarSpell),
);
const firstTypeOverride = familiarEligibility.creatureTypeOverrideChoices[0];
if (firstTypeOverride === undefined) {
  throw new Error("Expected Find Familiar creature type override choices.");
}

defineSelectedIdentityWitness({
  describeLabel: "Find Familiar selected identity MBT",
  taskId: "B22-FIND-FAMILIAR-IDENTITY-WITNESS",
  specFile: path.resolve(
    import.meta.dirname,
    "../battle-runtime-find-familiar-selected-identity.mbt.qnt",
  ),
  projectionSchema: {
    familiarStatus: "str",
    formId: "str",
    familiarCombatantPresent: "bool",
    replacementCombatantPresent: "bool",
    familiarReactionAvailable: "bool",
    ownerActionAvailable: "bool",
    ownerSpellSlotCommitted: "bool",
    targetHp: "int",
    lastResult: "str",
  },
  initialProjection: expectedFindFamiliarProjection({}),
  units: [
    {
      unitId: findFamiliarUnitId,
      procedures: [
        {
          actionName: "doCastFindFamiliar",
          projectionAfter: expectedFindFamiliarProjection({
            familiarStatus: "present",
            formId: "cat",
            familiarCombatantPresent: true,
            familiarReactionAvailable: true,
            lastResult: "cast",
          }),
          discover: castFindFamiliarProjection,
        },
        {
          actionName: "doRecastFindFamiliarReplacement",
          projectionAfter: expectedFindFamiliarProjection({
            familiarStatus: "present",
            formId: "rat",
            familiarCombatantPresent: true,
            familiarReactionAvailable: true,
            lastResult: "recast",
          }),
          discover: recastFindFamiliarReplacementProjection,
        },
        {
          actionName: "doDismissAndReappearFindFamiliar",
          projectionAfter: expectedFindFamiliarProjection({
            familiarStatus: "present",
            formId: "cat",
            familiarCombatantPresent: true,
            familiarReactionAvailable: true,
            ownerActionAvailable: false,
            lastResult: "dismissedAndReappeared",
          }),
          discover: dismissAndReappearFindFamiliarProjection,
        },
        {
          actionName: "doDeliverTouchSpellThroughFindFamiliar",
          projectionAfter: expectedFindFamiliarProjection({
            familiarStatus: "present",
            formId: "cat",
            familiarCombatantPresent: true,
            familiarReactionAvailable: false,
            ownerActionAvailable: false,
            ownerSpellSlotCommitted: true,
            targetHp: 12,
            lastResult: "touchDelivered",
          }),
          discover: deliverTouchSpellThroughFindFamiliarProjection,
        },
      ],
    },
  ],
});

function castFindFamiliarProjection(): FindFamiliarSelectedIdentityProjection {
  const result = castCatFamiliar(startSpellcasterFixtureBattle());
  if (result.tag !== "resolved") {
    throw new Error(`Expected Find Familiar cast, got ${result.tag}.`);
  }
  return projectBattleCompanionState(result.state, "cast");
}

function recastFindFamiliarReplacementProjection(): FindFamiliarSelectedIdentityProjection {
  const first = castCatFamiliar(startSpellcasterFixtureBattle());
  if (first.tag !== "resolved") {
    throw new Error(`Expected initial Find Familiar cast, got ${first.tag}.`);
  }
  const second = castRatFamiliar(first.state);
  if (second.tag !== "resolved") {
    throw new Error(`Expected Find Familiar recast, got ${second.tag}.`);
  }
  return projectBattleCompanionState(second.state, "recast");
}

function dismissAndReappearFindFamiliarProjection(): FindFamiliarSelectedIdentityProjection {
  const cast = castCatFamiliar(startSpellcasterFixtureBattle());
  if (cast.tag !== "resolved") {
    throw new Error(`Expected Find Familiar cast, got ${cast.tag}.`);
  }
  const dismissed = temporarilyDismissFindFamiliar({
    state: cast.state,
    casterId,
    heldObjectIds: [],
  });
  if (dismissed.tag !== "resolved") {
    throw new Error(
      `Expected Find Familiar temporary dismissal, got ${dismissed.tag}.`,
    );
  }
  const reappeared = reappearTemporarilyDismissedFindFamiliar({
    state: withFreshMagicAction(dismissed.state),
    casterId,
    catalog: statBlockCatalog,
    familiarId,
    initiative: initiativeScore(14),
    placement: { kind: "unoccupiedSpaceWithin30Feet" },
  });
  if (reappeared.tag !== "resolved") {
    throw new Error(
      `Expected Find Familiar reappearance, got ${reappeared.tag}.`,
    );
  }
  return projectBattleCompanionState(
    reappeared.state,
    "dismissedAndReappeared",
  );
}

function deliverTouchSpellThroughFindFamiliarProjection(): FindFamiliarSelectedIdentityProjection {
  const cast = castCatFamiliar(startSpellcasterFixtureBattle());
  if (cast.tag !== "resolved") {
    throw new Error(`Expected Find Familiar cast, got ${cast.tag}.`);
  }
  const cureWoundsAct = discoverBattleActs(cast.state).find(
    (act) =>
      act.subject.tag === "actionSpell" &&
      act.subject.invocation.spellId === cureWoundsUnitId,
  );
  if (cureWoundsAct?.subject.tag !== "actionSpell") {
    throw new Error("Expected Cure Wounds action spell act.");
  }
  const targetFill = {
    kind: "targetChoice" as const,
    holeId: ATTACK_TARGET_HOLE_ID,
    value: targetId,
    spatialFacts: [
      {
        kind: "findFamiliarTouchSpellTarget" as const,
        ownerId: casterId,
        familiarId,
        targetId,
        spellId: cureWoundsUnitId,
      },
    ],
  };
  const awaitingHealingRoll = deliverTouchSpellThroughFindFamiliar({
    state: cast.state,
    subject: cureWoundsAct.subject,
    fills: [targetFill],
    fact: {
      kind: "findFamiliarWithin100FeetOfOwner",
      ownerId: casterId,
      familiarId,
    },
  });
  if (awaitingHealingRoll.tag !== "needsHoles") {
    throw new Error(
      `Expected Find Familiar touch delivery healing roll, got ${awaitingHealingRoll.tag}.`,
    );
  }
  const delivered = deliverTouchSpellThroughFindFamiliar({
    state: cast.state,
    subject: cureWoundsAct.subject,
    fills: [
      targetFill,
      {
        kind: "rolledDice",
        holeId: requireHole(awaitingHealingRoll.holes, "rolledDice").holeId,
        value: [{ results: [DieRollResult(4), DieRollResult(4)] }],
      },
    ],
    fact: {
      kind: "findFamiliarWithin100FeetOfOwner",
      ownerId: casterId,
      familiarId,
    },
  });
  if (delivered.tag !== "resolved") {
    throw new Error(
      `Expected Find Familiar touch delivery, got ${delivered.tag}.`,
    );
  }
  return projectBattleCompanionState(delivered.state, "touchDelivered");
}

function startSpellcasterFixtureBattle(): BattleState {
  const result = startBattle({
    battleId: battleId("find-familiar-selected-identity-test"),
    combatants: [
      characterCreature({
        combatantId: casterId,
        displayName: "Caster",
        initiative: 12,
        side: partySide,
        spellcasting: {
          sourceClassName: "wizard",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [cureWoundsSpell, healingWordSpell],
          featurePreparedSpells: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 2 }],
        },
      }),
      characterCreature({
        combatantId: targetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
        currentHp: 1,
        maxHp: 12,
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function castCatFamiliar(state: BattleState) {
  return castFindFamiliar({
    state,
    casterId,
    catalog: statBlockCatalog,
    eligibility: familiarEligibility,
    selection: {
      tag: "normalNamedForm",
      formId: "cat",
    },
    creatureTypeOverrideChoiceId: firstTypeOverride.optionId,
    familiarId,
    initiative: initiativeScore(18),
    placement: { kind: "unoccupiedSpaceWithinSpellRange" },
  });
}

function castRatFamiliar(state: BattleState) {
  return castFindFamiliar({
    state,
    casterId,
    catalog: statBlockCatalog,
    eligibility: familiarEligibility,
    selection: {
      tag: "normalNamedForm",
      formId: "rat",
    },
    creatureTypeOverrideChoiceId: firstTypeOverride.optionId,
    familiarId: replacementFamiliarId,
    initiative: initiativeScore(15),
    placement: { kind: "unoccupiedSpaceWithinSpellRange" },
  });
}

function withFreshMagicAction(state: BattleState): BattleState {
  return {
    ...state,
    currentTurnResources: {
      ...state.currentTurnResources,
      actionResources: [{ kind: "action", source: "turn" }],
    },
  };
}

function requireSpellRecord(unitId: string): SpellRecord {
  const unit = unitLibrary.requireUnit(unitId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected ${unitId} spell record.`);
  }
  return unit;
}

function requireFindFamiliarEligibility(
  eligibility: FindFamiliarFormEligibility | null,
): FindFamiliarFormEligibility {
  if (eligibility === null) {
    throw new Error("Expected Find Familiar form eligibility.");
  }
  return eligibility;
}

function expectedFindFamiliarProjection(
  input: Partial<FindFamiliarSelectedIdentityProjection>,
): FindFamiliarSelectedIdentityProjection {
  return {
    familiarStatus: "none",
    formId: "none",
    familiarCombatantPresent: false,
    replacementCombatantPresent: false,
    familiarReactionAvailable: false,
    ownerActionAvailable: true,
    ownerSpellSlotCommitted: false,
    targetHp: 1,
    lastResult: "init",
    ...input,
  };
}

function projectBattleCompanionState(
  state: BattleState,
  lastResult: FindFamiliarSelectedIdentityProjection["lastResult"],
): FindFamiliarSelectedIdentityProjection {
  const familiar = findFamiliarCompanionForOwner(state, casterId);
  return {
    familiarStatus: familiar?.status ?? "none",
    formId:
      familiar === null
        ? "none"
        : formSelectionProjection(familiar.formSelection),
    familiarCombatantPresent: state.combatants.has(familiarId),
    replacementCombatantPresent: state.combatants.has(replacementFamiliarId),
    familiarReactionAvailable:
      state.combatants.get(familiarId)?.reactionAvailable ?? false,
    ownerActionAvailable: state.currentTurnResources.actionResources.some(
      (resource) => resource.kind === "action",
    ),
    ownerSpellSlotCommitted:
      state.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed",
      ),
    targetHp: Number(state.combatants.get(targetId)?.hp ?? 0),
    lastResult,
  };
}

function formSelectionProjection(
  selection: BattleCompanionState["formSelection"],
): string {
  if (selection.tag === "challengeRatingZeroBeast")
    return selection.statBlockId;
  return selection.formId;
}
