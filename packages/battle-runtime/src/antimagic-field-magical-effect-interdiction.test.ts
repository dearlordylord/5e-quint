import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  characterBattleFeatureInitForTest,
  resolveBattleSubject,
} from "./battle-runtime.test-support.ts";
import {
  antimagicFieldAuraEffectForTest,
  antimagicFieldAuraMembershipForTest,
  type TestAntimagicFieldAuraMembership,
} from "./antimagic-field.test-support.ts";
import { battleActUnitPresentation } from "./battle-act-composition.ts";
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-antimagic-field-magical-effect-interdiction
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.ANTIMAGIC_FIELD_MAGICAL_EFFECT_INTERDICTION
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
  burningHandsUnitId,
  clericChannelDivinityUnitId,
  clericPreserveLifeUnitId,
  cureWoundsUnitId,
  heatMetalUnitId,
  spellCasterId,
  spellTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  characterCreature,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  bonusSpellAct,
  knownWillingSpellTargetFill,
  savingThrowOutcomeFill,
  spellAct,
  spellManufacturedMetalObjectTargetFill,
  spellObjectContactTargetsFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  battleAreaId,
  battleId,
  battleObjectId,
  battleUnitRefWithSupportProfiles,
  combatantId,
  discoverBattleActs,
  endTurn,
  startBattle,
  type BattleFill,
  type BattleHitPointHealingPoolDistributionHole,
  type BattleRuntimeSession,
  type CombatantId,
} from "./index.ts";
import { battleMagicActionHealingPoolSupportForUnit } from "./unit-feature-support.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";

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
    const session = activeAntimagicAuraSession(
      spellBattle({
        preparedSpells: [spellRecord(cureWoundsUnitId)],
        spellSlots: [{ spellLevel: 1, count: 1 }],
        targetHp: 1,
        targetMaxHp: 20,
      }),
      antimagicFieldAuraMembershipForTest({
        sourceCombatantId: spellTargetId,
        originIncluded: true,
        nonOriginCombatantIds: [],
      }),
    );
    const act = spellAct({
      session,
      spellId: cureWoundsUnitId,
      slotLevel: 1,
    });
    const targetHole = requireHole(act.initialHoles, "targetChoice");

    expect(targetHole.choices).not.toContain(spellTargetId);
    expect(
      magicalEffectTargetsInterdictedByAntimagicField({
        state: session.state,
        source: SPELL_MAGICAL_EFFECT_SOURCE,
        targetIds: [spellTargetId],
      }),
    ).toBe(true);
    expect(
      magicalEffectTargetsInterdictedByAntimagicField({
        state: session.state,
        source: MAGIC_ITEM_MAGICAL_EFFECT_SOURCE,
        targetIds: [spellTargetId],
      }),
    ).toBe(true);
    expect(
      resolveBattleSubject({
        state: session.state,
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
    const session = activeAntimagicAuraSession(
      spellBattle({
        preparedSpells: [spellRecord(burningHandsUnitId)],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      }),
      antimagicFieldAuraMembershipForTest({
        sourceCombatantId: spellTargetId,
        originIncluded: true,
        nonOriginCombatantIds: [],
      }),
    );
    const act = spellAct({
      session,
      spellId: burningHandsUnitId,
      slotLevel: 1,
    });
    const save = requireHole(act.initialHoles, "savingThrowOutcome");

    expect(
      resolveBattleSubject({
        state: session.state,
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
    const session = activeAntimagicAuraSession(
      spellBattle({
        preparedSpells: [spellRecord(heatMetalUnitId)],
        spellSlots: [{ spellLevel: 2, count: 1 }],
        targetHp: 20,
        targetMaxHp: 20,
      }),
      antimagicFieldAuraMembershipForTest({
        sourceCombatantId: spellTargetId,
        originIncluded: true,
        nonOriginCombatantIds: [],
      }),
    );
    const act = spellAct({
      session,
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
        state: session.state,
        subject: act.subject,
        fills: [objectFill],
      }),
      "objectContactTargets",
    );

    expect(contactHole.choices).not.toContain(spellTargetId);
    expect(
      resolveBattleSubject({
        state: session.state,
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
    const initialSession = spellBattle({
      preparedSpells: [spellRecord(heatMetalUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 20,
      targetMaxHp: 20,
    });
    const act = spellAct({
      session: initialSession,
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
        state: initialSession.state,
        subject: act.subject,
        fills: [objectFill],
      }),
      "objectContactTargets",
    );
    const cast = resolveBattleSubject({
      state: initialSession.state,
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
    const session = activeAntimagicAuraSession(
      battleRuntimeSessionForTest({
        ...initialSession,
        state: casterTurn.state,
      }),
      antimagicFieldAuraMembershipForTest({
        sourceCombatantId: spellTargetId,
        originIncluded: true,
        nonOriginCombatantIds: [],
      }),
    );
    const repeat = bonusSpellAct({ session, spellId: heatMetalUnitId });
    const repeatContactHole = requireHole(
      repeat.initialHoles,
      "objectContactTargets",
    );

    expect(repeatContactHole.choices).not.toContain(spellTargetId);
    expect(
      resolveBattleSubject({
        state: session.state,
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
    const session = activeAntimagicAuraSession(
      preserveLifeBattle(),
      antimagicFieldAuraMembershipForTest({
        sourceCombatantId: spellTargetId,
        originIncluded: true,
        nonOriginCombatantIds: [],
      }),
    );
    const act = preserveLifeAct(session);
    const distribution = requireHole(
      act.initialHoles,
      "hitPointHealingDistribution",
    );

    expect(distribution.choices).not.toContain(spellTargetId);
    expect(
      magicalEffectTargetsInterdictedByAntimagicField({
        state: session.state,
        source: OTHER_MAGICAL_EFFECT_SOURCE,
        targetIds: [spellTargetId],
      }),
    ).toBe(true);
    expect(
      resolveBattleSubject({
        state: session.state,
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

function activeAntimagicAuraSession(
  session: BattleRuntimeSession,
  aura: TestAntimagicFieldAuraMembership,
): BattleRuntimeSession {
  const combatants = new Map(session.state.combatants);
  const source = combatants.get(aura.sourceCombatantId);
  if (source === undefined) {
    throw new Error("Antimagic Field test source must be in the battle.");
  }
  combatants.set(aura.sourceCombatantId, {
    ...source,
    activeEffects: [
      ...source.activeEffects,
      antimagicFieldAuraEffectForTest({
        areaId: antimagicFieldAreaId,
        aura,
      }),
    ],
  });
  return battleRuntimeSessionForTest({
    ...session,
    state: { ...session.state, combatants },
  });
}

function preserveLifeBattle(): BattleRuntimeSession {
  const result = startBattle({
    battleId: battleId("antimagic-field-magical-effect-preserve-life"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Life Cleric",
        initiative: 20,
        classLevels: [{ className: "cleric", level: classLevel(3) }],
        currentHp: Hp(20),
        maxHp: Hp(20),
        characterUnitRefs: [preserveLifeUnitRef],
        unitFeatures: [
          characterBattleFeatureInitForTest(preserveLifeUnit, [
            { className: "cleric", level: classLevel(3) },
          ]),
        ],
        resources: [{ unit: channelDivinityUnit, usesRemaining: 2 }],
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        currentHp: Hp(2),
        maxHp: Hp(20),
      }),
      characterCreature({
        combatantId: combatantId("antimagic-magical-effect-other-target"),
        displayName: "Other Target",
        initiative: 9,
        currentHp: Hp(3),
        maxHp: Hp(20),
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(battleStateInitIssueMessage(result.left));
  }
  return result.right;
}

function preserveLifeAct(session: BattleRuntimeSession) {
  const act = discoverBattleActs(session).find(
    (candidate) =>
      candidate.subject.tag === "unitFeature" &&
      candidate.subject.actorId === spellCasterId &&
      battleActUnitPresentation(candidate)?.unitId === clericPreserveLifeUnitId,
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
        sourceProcedureRef: hole.healingPool.sourceProcedureRef,
        rangeFeet: movementFeet(30),
      })),
  };
}

function preserveLifeUnitRefWithSupport() {
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: parseSharedUnitId(clericPreserveLifeUnitId) },
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
