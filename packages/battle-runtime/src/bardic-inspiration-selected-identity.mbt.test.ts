import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { resolveBattleSubject } from "./battle-runtime-test-support.ts";
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L1D2-BARDIC-INSPIRATION-SCALING bard_bardic_inspiration
// UNIT-IDENTITY-REPLAY: L1D2-BARDIC-INSPIRATION-SCALING bard_bardic_inspiration doGrantBardicInspirationD12
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
import type { UnitRecord } from "@dnd/surface/surface/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { battleActUnitPresentation } from "./battle-act-composition.ts";

import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import {
  BARDIC_INSPIRATION_GRANT_SUPPORT_PROFILE,
  battleId,
  characterId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  startBattle,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleProcedureExecutionRef,
  type BattleRuntimeSession,
  type BattleState,
} from "./index.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";

type BardicInspirationProjection = {
  readonly bonusActionAvailable: boolean;
  readonly featureUsesRemaining: number;
  readonly targetBardicInspirationDieSize: DamageDieSize | 0;
  readonly lastResult: "init" | "resolved" | "invalid";
};

const bardId = combatantId("bardic-inspiration-selected-identity-bard");
const targetId = combatantId("bardic-inspiration-selected-identity-target");

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Bardic Inspiration selected identity Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Bardic Inspiration selected identity replay",
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
  const session = bardicInspirationBattle();
  const act = findAct(session);
  const subject = act.subject;
  if (subject.tag !== "unitFeature") {
    throw new Error("Bardic Inspiration subject must be a unit feature.");
  }
  expect(
    battleActUnitPresentation(act)?.unitId,
    "Bardic Inspiration presentation must bind unit id",
  ).toBe("bard_bardic_inspiration");
  const target = findHole(act.initialHoles, "targetChoice");
  const result = resolveBattleSubject({
    state: session.state,
    subject,
    fills: [bardicInspirationTargetFill(target, subject.procedureRef)],
  });
  if (result.tag !== "resolved") {
    return { ...initialProjection(), lastResult: "invalid" };
  }
  const resolvedSession = battleRuntimeSessionForTest({
    ...session,
    state: result.state,
  });
  return {
    bonusActionAvailable:
      resolvedSession.state.currentTurnResources.currentHasBonusAction,
    featureUsesRemaining: resourceUsesRemaining(
      resolvedSession,
      "bard_bardic_inspiration",
    ),
    targetBardicInspirationDieSize: bardicInspirationDieSize(
      resolvedSession.state,
    ),
    lastResult: "resolved",
  };
}

function bardicInspirationBattle(): BattleRuntimeSession {
  const result = startBattle({
    battleId: battleId("bardic-inspiration-selected-identity"),
    combatants: [bardicInspirationBard(), targetCreature()],
  });
  if (Either.isLeft(result)) {
    throw new Error(battleStateInitIssueMessage(result.left));
  }
  return result.right;
}

function bardicInspirationBard(): BattleCreatureInit {
  const unit = bardicInspirationUnit();
  return {
    combatantId: bardId,
    displayName: "Bard",
    initiative: initiativeScore(20),
    creatureInit: {
      kind: "character",
      characterId: characterId("bardic-inspiration-selected-identity-bard"),
      characterUnitRefs: [
        {
          unit: unitLibrary.requireUnit(unit.id),
          supportProfiles: [BARDIC_INSPIRATION_GRANT_SUPPORT_PROFILE],
        },
      ],
      classLevels: [{ className: "bard", level: 15 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
      weaponMasteries: [],
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
    creatureInit: {
      kind: "character",
      characterId: characterId("bardic-inspiration-selected-identity-target"),
      characterUnitRefs: [],
      classLevels: [{ className: "fighter", level: 1 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
      weaponMasteries: [],
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

function bardicInspirationTargetFill(
  hole: BattleHole,
  sourceProcedureRef: BattleProcedureExecutionRef,
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
        sourceProcedureRef,
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

function resourceUsesRemaining(
  session: BattleRuntimeSession,
  unitId: string,
): number {
  const bard = session.state.combatants.get(bardId);
  if (bard?.origin.kind !== "character") {
    throw new Error("Expected Bardic Inspiration selected identity Bard.");
  }
  const resourcePoolRef = session.context.characters
    .get(bardId)
    ?.resourceOwnership.find(
      (candidate) => candidate.unit.id === unitId,
    )?.resourcePoolRef;
  const resource = bard.origin.resources.find(
    (candidate) => candidate.resourcePoolRef === resourcePoolRef,
  );
  return Number(resource?.usesRemaining ?? 0);
}

function findAct(session: BattleRuntimeSession) {
  const act = discoverBattleActs(session).find(
    (candidate) =>
      candidate.subject.tag === "unitFeature" &&
      candidate.subject.actorId === bardId &&
      battleActUnitPresentation(candidate)?.unitId ===
        "bard_bardic_inspiration",
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
