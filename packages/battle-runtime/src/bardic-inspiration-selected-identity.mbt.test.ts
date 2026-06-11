// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1D2-BARDIC-INSPIRATION-SCALING bard_bardic_inspiration
// UNIT-IDENTITY-MBT-REPLAY: L1D2-BARDIC-INSPIRATION-SCALING bard_bardic_inspiration doGrantBardicInspirationD12
import * as Either from "effect/Either";
import { expect } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  abilityModifier,
  attackBonus,
  Hp,
  movementFeet,
  type DamageDieSize,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { UnitRecord } from "@dnd/surface/surface/types";

import {
  BARDIC_INSPIRATION_GRANT_SUPPORT_PROFILE,
  battleId,
  battleCombatantSide,
  characterId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  resolveBattleSubject,
  sameBattleSubject,
  startBattle,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleState,
  type BattleSubject,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";

type BardicInspirationProjection = {
  readonly bonusActionAvailable: boolean;
  readonly featureUsesRemaining: number;
  readonly targetBardicInspirationDieSize: DamageDieSize | 0;
  readonly lastResult: "init" | "resolved" | "invalid";
};

const bardId = combatantId("bardic-inspiration-selected-identity-bard");
const targetId = combatantId("bardic-inspiration-selected-identity-target");
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Bardic Inspiration selected identity Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

defineSelectedIdentityWitness({
  describeLabel: "Bardic Inspiration selected identity MBT",
  taskId: "L1D2-BARDIC-INSPIRATION-SCALING",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "bardic-inspiration-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  projectionSchema: {
    bonusActionAvailable: "bool",
    featureUsesRemaining: "int",
    targetBardicInspirationDieSize: "int",
    lastResult: "str",
  },
  initialProjection: initialProjection(),
  units: [
    {
      unitId: "bard_bardic_inspiration",
      procedures: [
        {
          actionName: "doGrantBardicInspirationD12",
          projectionAfter: {
            bonusActionAvailable: false,
            featureUsesRemaining: 0,
            targetBardicInspirationDieSize: 12,
            lastResult: "resolved",
          },
          discover: () => grantBardicInspirationD12(),
        },
      ],
    },
  ],
});

function initialProjection(): BardicInspirationProjection {
  return {
    bonusActionAvailable: true,
    featureUsesRemaining: 1,
    targetBardicInspirationDieSize: 0,
    lastResult: "init",
  };
}

function grantBardicInspirationD12(): BardicInspirationProjection {
  const state = bardicInspirationBattle();
  const subject = bardicInspirationSubject("bard_bardic_inspiration");
  if (subject.tag !== "unitFeature") {
    throw new Error("Bardic Inspiration subject must be a unit feature.");
  }
  expect(subject.unitId, "Bardic Inspiration subject must bind unit id").toBe(
    "bard_bardic_inspiration",
  );
  const target = findHole(findAct(state, subject).initialHoles, "targetChoice");
  const result = resolveBattleSubject({
    state,
    subject,
    fills: [bardicInspirationTargetFill(target)],
  });
  if (result.tag !== "resolved") {
    return { ...initialProjection(), lastResult: "invalid" };
  }
  return {
    bonusActionAvailable:
      result.state.currentTurnResources.currentHasBonusAction,
    featureUsesRemaining: resourceUsesRemaining(
      result.state,
      "bard_bardic_inspiration",
    ),
    targetBardicInspirationDieSize: bardicInspirationDieSize(result.state),
    lastResult: "resolved",
  };
}

function bardicInspirationBattle(): BattleState {
  const result = startBattle({
    battleId: battleId("bardic-inspiration-selected-identity"),
    combatants: [bardicInspirationBard(), targetCreature()],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function bardicInspirationBard(): BattleCreatureInit {
  const unit = bardicInspirationUnit();
  return {
    combatantId: bardId,
    displayName: "Bard",
    initiative: initiativeScore(20),
    side: partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId("bardic-inspiration-selected-identity-bard"),
      characterUnitRefs: [
        {
          unitId: unit.id,
          supportProfiles: [BARDIC_INSPIRATION_GRANT_SUPPORT_PROFILE],
        },
      ],
      classLevels: [{ className: "bard", level: 15 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: selectedIdentityUnarmedStrike(),
      resources: [
        {
          unit,
          capAbilityModifier: abilityModifier(1),
        },
      ],
    },
  };
}

function targetCreature(): BattleCreatureInit {
  return {
    combatantId: targetId,
    displayName: "Target",
    initiative: initiativeScore(10),
    side: oppositionSide,
    creatureInit: {
      kind: "character",
      characterId: characterId("bardic-inspiration-selected-identity-target"),
      characterUnitRefs: [],
      classLevels: [{ className: "fighter", level: 1 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: selectedIdentityUnarmedStrike(),
    },
  };
}

function selectedIdentityUnarmedStrike(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["unarmedStrike"] {
  return {
    kind: "unarmedStrike",
    effect: {
      kind: "damage",
      damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
    },
    attackAbility: "str",
    attackAbilityModifier: abilityModifier(0),
    attackBonus: attackBonus(2),
    damageAbilityModifier: abilityModifier(0),
  };
}

function bardicInspirationUnit(): Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
> {
  const unit = unitLibrary.requireUnit("bard_bardic_inspiration");
  if (unit.kind !== "class_feature") {
    throw new Error("Expected Bardic Inspiration class feature Unit.");
  }
  return unit;
}

function bardicInspirationSubject(unitId: string): BattleSubject {
  return { tag: "unitFeature", actorId: bardId, unitId };
}

function bardicInspirationTargetFill(
  hole: BattleHole,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "bardicInspirationTargetWithinRange",
        bardId,
        targetId,
        unitId: "bard_bardic_inspiration",
        rangeFeet: movementFeet(60),
      },
    ],
  };
}

function bardicInspirationDieSize(state: BattleState): DamageDieSize | 0 {
  const target = state.combatants.get(targetId);
  const effect = target?.activeEffects.find(
    (candidate) => candidate.kind === "bardicInspirationDie",
  );
  return effect?.kind === "bardicInspirationDie" ? effect.dieSize : 0;
}

function resourceUsesRemaining(state: BattleState, unitId: string): number {
  const bard = state.combatants.get(bardId);
  if (bard?.origin.kind !== "character") {
    throw new Error("Expected Bardic Inspiration selected identity Bard.");
  }
  const resource = bard.origin.resources.find(
    (candidate) => candidate.unit.id === unitId,
  );
  return Number(resource?.usesRemaining ?? 0);
}

function findAct(state: BattleState, subject: BattleSubject) {
  const act = discoverBattleActs(state).find((candidate) =>
    sameBattleSubject(candidate.subject, subject),
  );
  if (act === undefined) {
    throw new Error("Expected Bardic Inspiration selected identity act.");
  }
  return act;
}

function findHole<Kind extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: Kind,
): Extract<BattleHole, { readonly kind: Kind }> {
  const hole = holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: Kind }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(
      `Expected Bardic Inspiration selected identity ${kind} hole.`,
    );
  }
  return hole;
}
