// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-antimagic-field-magical-effect-interdiction
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.ANTIMAGIC_FIELD_MAGICAL_EFFECT_INTERDICTION
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { classLevel, Hp, movementFeet } from "@dnd/shared/types";
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";

import {
  ANTIMAGIC_FIELD_MAGICAL_EFFECT_INTERDICTION_MESSAGE,
  MAGIC_ITEM_MAGICAL_EFFECT_SOURCE,
  OTHER_MAGICAL_EFFECT_SOURCE,
  SPELL_MAGICAL_EFFECT_SOURCE,
  magicalEffectTargetsInterdictedByAntimagicField,
} from "./battle-reducer/antimagic-field-magical-effect-interdiction.ts";
import {
  antimagicFieldUnitId,
  burningHandsUnitId,
  clericChannelDivinityUnitId,
  clericPreserveLifeUnitId,
  cureWoundsUnitId,
  heatMetalUnitId,
  oppositionSide,
  partySide,
  spellCasterId,
  spellTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog-support.ts";
import {
  characterCreature,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  bonusSpellAct,
  knownWillingSpellTargetFill,
  savingThrowOutcomeFill,
  spellAct,
  spellManufacturedMetalObjectTargetFill,
  spellObjectContactTargetsFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  battleAreaId,
  battleId,
  battleObjectId,
  battleUnitRefWithSupportProfiles,
  combatantId,
  discoverBattleActs,
  endTurn,
  resolveBattleSubject,
  startBattle,
  type BattleActiveEffect,
  type BattleAntimagicFieldAuraMembership,
  type BattleFill,
  type BattleHitPointHealingPoolDistributionHole,
  type BattleState,
  type CombatantId,
} from "./index.ts";
import { battleMagicActionHealingPoolSupportForUnit } from "./unit-feature-support.ts";

const antimagicFieldAreaId = battleAreaId(
  "antimagic-magical-effect-interdiction-area",
);
const preserveLifeUnit = unitLibrary.requireUnit(clericPreserveLifeUnitId);
const channelDivinityUnit = unitLibrary.requireUnit(
  clericChannelDivinityUnitId,
);
const preserveLifeUnitRef = preserveLifeUnitRefWithSupport();

describe("Antimagic Field magical-effect interdiction", () => {
  test("rejects a spell target selected inside the aura", () => {
    const state = activeAntimagicAuraState(
      spellBattle({
        preparedSpells: [spellRecord(cureWoundsUnitId)],
        spellSlots: [{ spellLevel: 1, count: 1 }],
        targetHp: 1,
        targetMaxHp: 20,
      }),
      auraMembership({
        sourceCombatantId: spellTargetId,
        originIncluded: true,
        nonOriginCombatantIds: [],
      }),
    );
    const act = spellAct({ state, spellId: cureWoundsUnitId, slotLevel: 1 });
    const targetHole = requireHole(act.initialHoles, "targetChoice");

    expect(targetHole.choices).not.toContain(spellTargetId);
    expect(
      magicalEffectTargetsInterdictedByAntimagicField({
        state,
        source: SPELL_MAGICAL_EFFECT_SOURCE,
        targetIds: [spellTargetId],
      }),
    ).toBe(true);
    expect(
      magicalEffectTargetsInterdictedByAntimagicField({
        state,
        source: MAGIC_ITEM_MAGICAL_EFFECT_SOURCE,
        targetIds: [spellTargetId],
      }),
    ).toBe(true);
    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          knownWillingSpellTargetFill(
            targetHole,
            cureWoundsUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Spell target must be a combatant within the selected spell's supported range.",
    });
  });

  test("rejects spell area delivery to an affected creature inside the aura", () => {
    const state = activeAntimagicAuraState(
      spellBattle({
        preparedSpells: [spellRecord(burningHandsUnitId)],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      }),
      auraMembership({
        sourceCombatantId: spellTargetId,
        originIncluded: true,
        nonOriginCombatantIds: [],
      }),
    );
    const act = spellAct({ state, spellId: burningHandsUnitId, slotLevel: 1 });
    const save = requireHole(act.initialHoles, "savingThrowOutcome");

    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          savingThrowOutcomeFill(save, [
            { targetId: spellTargetId, succeeded: false },
          ]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: ANTIMAGIC_FIELD_MAGICAL_EFFECT_INTERDICTION_MESSAGE,
    });
  });

  test("rejects object-contact spell delivery to a contact creature inside the aura", () => {
    const objectId = battleObjectId("antimagic-field-heat-metal-chain");
    const state = activeAntimagicAuraState(
      spellBattle({
        preparedSpells: [spellRecord(heatMetalUnitId)],
        spellSlots: [{ spellLevel: 2, count: 1 }],
        targetHp: 20,
        targetMaxHp: 20,
      }),
      auraMembership({
        sourceCombatantId: spellTargetId,
        originIncluded: true,
        nonOriginCombatantIds: [],
      }),
    );
    const act = spellAct({ state, spellId: heatMetalUnitId, slotLevel: 2 });
    const objectFill = spellManufacturedMetalObjectTargetFill({
      hole: requireHole(act.initialHoles, "objectTargetChoice"),
      objectId,
      spellId: heatMetalUnitId,
      casterId: spellCasterId,
    });
    const contactHole = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [objectFill],
      }),
      "objectContactTargets",
    );

    expect(contactHole.choices).not.toContain(spellTargetId);
    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          objectFill,
          spellObjectContactTargetsFill({
            hole: contactHole,
            targetIds: [spellTargetId],
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: ANTIMAGIC_FIELD_MAGICAL_EFFECT_INTERDICTION_MESSAGE,
    });
  });

  test("rejects repeated object-contact spell delivery to a contact creature inside the aura", () => {
    const objectId = battleObjectId("antimagic-field-heat-metal-repeat-chain");
    const initialState = spellBattle({
      preparedSpells: [spellRecord(heatMetalUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 20,
      targetMaxHp: 20,
    });
    const act = spellAct({
      state: initialState,
      spellId: heatMetalUnitId,
      slotLevel: 2,
    });
    const objectFill = spellManufacturedMetalObjectTargetFill({
      hole: requireHole(act.initialHoles, "objectTargetChoice"),
      objectId,
      spellId: heatMetalUnitId,
      casterId: spellCasterId,
    });
    const contactHole = requireResultHole(
      resolveBattleSubject({
        state: initialState,
        subject: act.subject,
        fills: [objectFill],
      }),
      "objectContactTargets",
    );
    const cast = resolveBattleSubject({
      state: initialState,
      subject: act.subject,
      fills: [
        objectFill,
        spellObjectContactTargetsFill({ hole: contactHole, targetIds: [] }),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected no-contact Heat Metal cast to resolve.");
    }
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected Heat Metal caster End Turn to resolve.");
    }
    const casterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected Heat Metal target End Turn to resolve.");
    }
    const state = activeAntimagicAuraState(
      casterTurn.state,
      auraMembership({
        sourceCombatantId: spellTargetId,
        originIncluded: true,
        nonOriginCombatantIds: [],
      }),
    );
    const repeat = bonusSpellAct({ state, spellId: heatMetalUnitId });
    const repeatContactHole = requireHole(
      repeat.initialHoles,
      "objectContactTargets",
    );

    expect(repeatContactHole.choices).not.toContain(spellTargetId);
    expect(
      resolveBattleSubject({
        state,
        subject: repeat.subject,
        fills: [
          spellObjectContactTargetsFill({
            hole: repeatContactHole,
            targetIds: [spellTargetId],
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: ANTIMAGIC_FIELD_MAGICAL_EFFECT_INTERDICTION_MESSAGE,
    });
  });

  test("rejects other magical-effect targets inside the aura without spell identity", () => {
    const state = activeAntimagicAuraState(
      preserveLifeBattle(),
      auraMembership({
        sourceCombatantId: spellTargetId,
        originIncluded: true,
        nonOriginCombatantIds: [],
      }),
    );
    const act = preserveLifeAct(state);
    const distribution = requireHole(
      act.initialHoles,
      "hitPointHealingDistribution",
    );

    expect(distribution.choices).not.toContain(spellTargetId);
    expect(
      magicalEffectTargetsInterdictedByAntimagicField({
        state,
        source: OTHER_MAGICAL_EFFECT_SOURCE,
        targetIds: [spellTargetId],
      }),
    ).toBe(true);
    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          preserveLifeDistributionFill(distribution, [
            { targetId: spellTargetId, hitPoints: 1 },
          ]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: ANTIMAGIC_FIELD_MAGICAL_EFFECT_INTERDICTION_MESSAGE,
    });
  });
});

function activeAntimagicAuraState(
  state: BattleState,
  aura: TestAntimagicFieldAuraMembership,
): BattleState {
  const combatants = new Map(state.combatants);
  const source = combatants.get(aura.sourceCombatantId);
  if (source === undefined) {
    throw new Error("Antimagic Field test source must be in the battle.");
  }
  combatants.set(aura.sourceCombatantId, {
    ...source,
    activeEffects: [...source.activeEffects, antimagicFieldAuraEffect(aura)],
  });
  return {
    ...state,
    combatants,
  };
}

function antimagicFieldAuraEffect(
  aura: TestAntimagicFieldAuraMembership,
): BattleActiveEffect {
  return {
    kind: "antimagicFieldOngoingSpellSuppression",
    sourceSpellId: antimagicFieldUnitId,
    sourceCombatantId: aura.sourceCombatantId,
    areaId: antimagicFieldAreaId,
    auraMembership: aura.membership,
    radiusFeet: movementFeet(10),
    suppressedOngoingSpellEffects: [],
    expiresAt: {
      kind: "concentration",
      combatantId: aura.sourceCombatantId,
      durationTicks: elapsedTimeTicks(600),
    },
  };
}

type TestAntimagicFieldAuraMembership = {
  readonly sourceCombatantId: CombatantId;
  readonly membership: BattleAntimagicFieldAuraMembership;
};

function auraMembership(input: {
  readonly sourceCombatantId: CombatantId;
  readonly originIncluded: boolean;
  readonly nonOriginCombatantIds: readonly CombatantId[];
}): TestAntimagicFieldAuraMembership {
  return {
    sourceCombatantId: input.sourceCombatantId,
    membership: {
      kind: "antimagicFieldAuraMembership",
      originIncluded: input.originIncluded,
      nonOriginCombatantIds: input.nonOriginCombatantIds,
    },
  };
}

function preserveLifeBattle(): BattleState {
  const result = startBattle({
    battleId: battleId("antimagic-field-magical-effect-preserve-life"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Life Cleric",
        initiative: 20,
        side: partySide,
        classLevels: [{ className: "cleric", level: classLevel(3) }],
        currentHp: Hp(20),
        maxHp: Hp(20),
        characterUnitRefs: [preserveLifeUnitRef],
        unitFeatures: [{ unit: preserveLifeUnit }],
        resources: [{ unit: channelDivinityUnit, usesRemaining: 2 }],
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
        currentHp: Hp(2),
        maxHp: Hp(20),
      }),
      characterCreature({
        combatantId: combatantId("antimagic-magical-effect-other-target"),
        displayName: "Other Target",
        initiative: 9,
        side: oppositionSide,
        currentHp: Hp(3),
        maxHp: Hp(20),
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function preserveLifeAct(state: BattleState) {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "unitFeature" &&
      candidate.subject.actorId === spellCasterId &&
      candidate.subject.unitId === clericPreserveLifeUnitId,
  );
  if (act === undefined) {
    throw new Error("Expected Preserve Life act.");
  }
  return act;
}

function preserveLifeDistributionFill(
  hole: BattleHitPointHealingPoolDistributionHole,
  allocations: readonly {
    readonly targetId: CombatantId;
    readonly hitPoints: number;
  }[],
): Extract<BattleFill, { readonly kind: "hitPointHealingDistribution" }> {
  return {
    kind: "hitPointHealingDistribution",
    holeId: hole.holeId,
    value: {
      allocations: allocations.map((allocation) => ({
        targetId: allocation.targetId,
        hitPoints: Hp(allocation.hitPoints),
      })),
    },
    spatialFacts: allocations
      .filter((allocation) => allocation.targetId !== spellCasterId)
      .map((allocation) => ({
        kind: "magicActionHealingPoolTargetWithinRange" as const,
        actorId: spellCasterId,
        targetId: allocation.targetId,
        unitId: clericPreserveLifeUnitId,
        rangeFeet: movementFeet(30),
      })),
  };
}

function preserveLifeUnitRefWithSupport() {
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: clericPreserveLifeUnitId },
    unit: preserveLifeUnit,
    classLevels: [{ className: "cleric", level: classLevel(3) }],
  });
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  const support = battleMagicActionHealingPoolSupportForUnit(preserveLifeUnit);
  if (support === null || support === "unsupported") {
    throw new Error("Expected Preserve Life Magic Action support.");
  }
  expect(unitRef.right.supportProfiles).toContainEqual(support);
  return unitRef.right;
}
