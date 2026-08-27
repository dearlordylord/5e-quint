import { describe, expect, test } from "vitest";
import { abilityModifier } from "@dnd/shared-algebras/armor-class-algebra";
import { proficiencyBonus } from "@dnd/shared/types";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  cantripSpellInvocationRef,
  endTurn,
  resolveBattleInterrupt,
  resolveBattleSubject,
} from "./unit-profile-admission.test-support.ts";
import {
  concentrationSavingThrowFill,
  interruptDecisionFill,
  requireCharacterSpellProcedureRefForTest,
} from "./battle-runtime.test-support.ts";
import {
  damageRollFillWithGroups,
  attackRollFill,
  requireHole,
  requireResultHole,
  requireCombatant,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  bonusSpellAct,
  spellAct,
  spellManufacturedMetalObjectTargetFill,
  spellObjectContactTargetsFill,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  spellBattle,
  spellBattleWithTargetRayOfFrost,
} from "./unit-profile-admission-spell-battle.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  battleAreaId,
  battleObjectId,
  Hp,
} from "./unit-profile-admission.test-support.ts";
import type { BattleFill } from "./index.ts";
import {
  heatMetalUnitId,
  antimagicFieldUnitId,
  rayOfFrostUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";

function initialHeatMetalCast(
  input: {
    readonly targetSpellcasting?: Parameters<
      typeof spellBattle
    >[0]["targetSpellcasting"];
  } = {},
) {
  const spell = spellRecord(heatMetalUnitId);
  const objectId = battleObjectId("object-contact-boundary-object");
  const session = spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 2, count: 1 }],
    targetHp: 30,
    targetMaxHp: 30,
    targetSpellcasting: input.targetSpellcasting,
  });
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
  const contactFill = spellObjectContactTargetsFill({
    hole: contactHole,
    targetIds: [spellTargetId],
  });
  const damageHole = requireResultHole(
    resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [objectFill, contactFill],
    }),
    "rolledDice",
  );
  const cast = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [
      objectFill,
      contactFill,
      damageRollFillWithGroups(damageHole, [[3, 4]]),
    ],
  });
  if (cast.tag !== "resolved") {
    throw new Error(`Expected Heat Metal cast to resolve, got ${cast.tag}.`);
  }
  return { act, cast, contactFill, objectFill, objectId, session };
}

describe("Heat Metal object-contact public entry boundaries", () => {
  test("initial cast exposes the public spell-cast interruption boundary", () => {
    const session = spellBattleWithTargetRayOfFrost({
      preparedSpells: [spellRecord(heatMetalUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const targetTurn = endTurn({
      state: session.state,
      actorId: spellCasterId,
    });
    expect(targetTurn.tag).toBe("resolved");
    if (targetTurn.tag !== "resolved") return;
    const readied = resolveBattleSubject({
      state: targetTurn.state,
      subject: {
        tag: "actionSpell",
        actorId: spellTargetId,
        procedureRef: requireCharacterSpellProcedureRefForTest(
          battleRuntimeSessionForTest({ ...session, state: targetTurn.state }),
          spellTargetId,
          cantripSpellInvocationRef(rayOfFrostUnitId, "spellAttackDamage"),
        ),
        mode: { tag: "ready", trigger: "spellCast" },
      },
      fills: [],
    });
    expect(readied.tag).toBe("resolved");
    if (readied.tag !== "resolved") return;
    const casterTurn = endTurn({
      state: readied.state,
      actorId: spellTargetId,
    });
    expect(casterTurn.tag).toBe("resolved");
    if (casterTurn.tag !== "resolved") return;
    const casterSession = battleRuntimeSessionForTest({
      ...session,
      state: casterTurn.state,
    });
    const act = spellAct({
      session: casterSession,
      spellId: heatMetalUnitId,
      slotLevel: 2,
    });
    const objectFill = spellManufacturedMetalObjectTargetFill({
      hole: requireHole(act.initialHoles, "objectTargetChoice"),
      objectId: battleObjectId("object-contact-boundary-reaction-object"),
      spellId: heatMetalUnitId,
      casterId: spellCasterId,
    });
    const contactHole = requireResultHole(
      resolveBattleSubject({
        state: casterTurn.state,
        subject: act.subject,
        fills: [objectFill],
      }),
      "objectContactTargets",
    );
    const result = resolveBattleSubject({
      state: casterTurn.state,
      subject: act.subject,
      fills: [
        objectFill,
        spellObjectContactTargetsFill({
          hole: contactHole,
          targetIds: [spellTargetId],
        }),
      ],
    });
    expect(result).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "spellCast" }],
    });
    if (result.tag !== "needsHoles") return;
    const pendingInterrupt = result.snapshot.pendingInterrupt;
    expect(pendingInterrupt?.trigger).toBe("spellCast");
    if (pendingInterrupt === null) return;
    const declined = resolveBattleInterrupt({
      state: result.state,
      fill: interruptDecisionFill(pendingInterrupt.decisionHole, {
        kind: "decline",
        responderId: spellTargetId,
      }),
    });
    expect(declined).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "rolledDice", label: "Spell damage (2d8-fire)" }],
    });
  });

  test("repeat requests public contact holes, consumes Bonus Action, and rejects replay or unrelated object fills", () => {
    const { act, cast, session } = initialHeatMetalCast();
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    expect(targetTurn.tag).toBe("resolved");
    if (targetTurn.tag !== "resolved") return;
    const casterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    expect(casterTurn.tag).toBe("resolved");
    if (casterTurn.tag !== "resolved") return;
    const repeatSession = battleRuntimeSessionForTest({
      ...session,
      state: casterTurn.state,
    });
    const repeat = bonusSpellAct({
      session: repeatSession,
      spellId: heatMetalUnitId,
    });
    const missingContact = resolveBattleSubject({
      state: casterTurn.state,
      subject: repeat.subject,
      fills: [],
    });
    expect(missingContact).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "objectContactTargets",
          objectContact: {
            sourceProcedureRef: act.subject.procedureRef,
            requiresObjectWithinRange: true,
          },
        },
      ],
    });
    const contactHole = requireResultHole(
      missingContact,
      "objectContactTargets",
    );
    const contactFill = spellObjectContactTargetsFill({
      hole: contactHole,
      targetIds: [spellTargetId],
    });
    expect(
      contactFill.spatialFacts.some(
        (fact) => fact.kind === "spellObjectWithinSpellRange",
      ),
    ).toBe(true);
    const damageHole = requireResultHole(
      resolveBattleSubject({
        state: casterTurn.state,
        subject: repeat.subject,
        fills: [contactFill],
      }),
      "rolledDice",
    );
    const resolved = resolveBattleSubject({
      state: casterTurn.state,
      subject: repeat.subject,
      fills: [contactFill, damageRollFillWithGroups(damageHole, [[1, 2]])],
    });
    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { turn: { bonusActionQuotaAvailable: false } },
    });
    if (resolved.tag !== "resolved") return;
    expect(requireCombatant(resolved.state, spellTargetId).hp).toBe(Hp(20));
    expect(
      resolveBattleSubject({
        state: resolved.state,
        subject: repeat.subject,
        fills: [contactFill, damageRollFillWithGroups(damageHole, [[1, 2]])],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Bonus Action spell is no longer available for the current actor.",
    });
  });

  test("initial damage exposes the public after-damage interruption boundary", () => {
    const session = spellBattleWithTargetRayOfFrost({
      preparedSpells: [spellRecord(heatMetalUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const targetTurn = endTurn({
      state: session.state,
      actorId: spellCasterId,
    });
    expect(targetTurn.tag).toBe("resolved");
    if (targetTurn.tag !== "resolved") return;
    const readied = resolveBattleSubject({
      state: targetTurn.state,
      subject: {
        tag: "actionSpell",
        actorId: spellTargetId,
        procedureRef: requireCharacterSpellProcedureRefForTest(
          battleRuntimeSessionForTest({ ...session, state: targetTurn.state }),
          spellTargetId,
          cantripSpellInvocationRef(rayOfFrostUnitId, "spellAttackDamage"),
        ),
        mode: { tag: "ready", trigger: "afterDamage" },
      },
      fills: [],
    });
    expect(readied.tag).toBe("resolved");
    if (readied.tag !== "resolved") return;
    const casterTurn = endTurn({
      state: readied.state,
      actorId: spellTargetId,
    });
    expect(casterTurn.tag).toBe("resolved");
    if (casterTurn.tag !== "resolved") return;
    const casterSession = battleRuntimeSessionForTest({
      ...session,
      state: casterTurn.state,
    });
    const act = spellAct({
      session: casterSession,
      spellId: heatMetalUnitId,
      slotLevel: 2,
    });
    const objectFill = spellManufacturedMetalObjectTargetFill({
      hole: requireHole(act.initialHoles, "objectTargetChoice"),
      objectId: battleObjectId("object-contact-boundary-after-damage-object"),
      spellId: heatMetalUnitId,
      casterId: spellCasterId,
    });
    const contactHole = requireResultHole(
      resolveBattleSubject({
        state: casterTurn.state,
        subject: act.subject,
        fills: [objectFill],
      }),
      "objectContactTargets",
    );
    const contactFill = spellObjectContactTargetsFill({
      hole: contactHole,
      targetIds: [spellTargetId],
    });
    const damageHole = requireResultHole(
      resolveBattleSubject({
        state: casterTurn.state,
        subject: act.subject,
        fills: [objectFill, contactFill],
      }),
      "rolledDice",
    );
    const needsConcentration = resolveBattleSubject({
      state: casterTurn.state,
      subject: act.subject,
      fills: [
        objectFill,
        contactFill,
        damageRollFillWithGroups(damageHole, [[3, 4]]),
      ],
    });
    expect(needsConcentration).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "concentrationSavingThrow" }],
    });
    if (needsConcentration.tag !== "needsHoles") return;
    const concentrationHole = requireHole(
      needsConcentration.holes,
      "concentrationSavingThrow",
    );
    const result = resolveBattleSubject({
      state: casterTurn.state,
      subject: act.subject,
      fills: [
        objectFill,
        contactFill,
        damageRollFillWithGroups(damageHole, [[3, 4]]),
        concentrationSavingThrowFill(concentrationHole, true),
      ],
    });
    expect(result).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "afterDamage" }],
    });
  });

  test("suppressed repeat returns the public Antimagic stale-subject boundary", () => {
    const targetSpellcasting: NonNullable<
      Parameters<typeof spellBattle>[0]["targetSpellcasting"]
    > = {
      spellcastingSource: {
        tag: "classSpellcasting",
        className: "wizard",
        abilityModifier: abilityModifier(3),
      },
      proficiencyBonus: proficiencyBonus(2),
      canCastSpells: true,
      cantrips: [],
      preparedSpells: [spellRecord(antimagicFieldUnitId)],
      featurePreparedSpells: [],
      spellAccesses: [],
      spellbookRitualSpellAccesses: [],
      invocationSpellAccesses: [],
      spellSlots: [{ spellLevel: 8, count: 1 }],
    };
    const { cast, session } = initialHeatMetalCast({ targetSpellcasting });
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    expect(targetTurn.tag).toBe("resolved");
    if (targetTurn.tag !== "resolved") return;
    const casterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    expect(casterTurn.tag).toBe("resolved");
    if (casterTurn.tag !== "resolved") return;
    const casterSession = battleRuntimeSessionForTest({
      ...session,
      state: casterTurn.state,
    });
    const repeat = bonusSpellAct({
      session: casterSession,
      spellId: heatMetalUnitId,
    });

    const targetTurnForAntimagic = endTurn({
      state: casterTurn.state,
      actorId: spellCasterId,
    });
    expect(targetTurnForAntimagic.tag).toBe("resolved");
    if (targetTurnForAntimagic.tag !== "resolved") return;
    const antimagicSession = battleRuntimeSessionForTest({
      ...session,
      state: targetTurnForAntimagic.state,
    });
    const antimagicAct = spellAct({
      session: antimagicSession,
      spellId: antimagicFieldUnitId,
      slotLevel: 8,
    });
    const areaHole = requireHole(antimagicAct.initialHoles, "spellAreaChoice");
    const heatMetalEffect = requireCombatant(
      cast.state,
      spellCasterId,
    ).activeEffects.find(
      (effect) => effect.kind === "spellObjectContactDamage",
    );
    if (heatMetalEffect === undefined) {
      throw new Error("Expected the Heat Metal active effect.");
    }
    const areaFill = {
      kind: "spellAreaChoice" as const,
      holeId: areaHole.holeId,
      value: {
        kind: "antimagicFieldSelfEmanation" as const,
        areaId: battleAreaId("object-contact-boundary-antimagic-area"),
        auraMembership: {
          kind: "antimagicFieldAuraMembership" as const,
          originIncluded: true,
          nonOriginCombatantIds: [],
        },
        affectedOngoingSpellEffects: [
          {
            kind: "antimagicFieldAffectedOngoingSpellEffect" as const,
            effect: {
              kind: "spellActiveEffect" as const,
              activeEffectKind: "spellObjectContactDamage" as const,
              effectRef: heatMetalEffect.effectRef,
            },
            sourceKind: "ordinarySpell" as const,
          },
        ],
      },
    } satisfies Extract<BattleFill, { readonly kind: "spellAreaChoice" }>;
    const suppressed = resolveBattleSubject({
      state: targetTurnForAntimagic.state,
      subject: antimagicAct.subject,
      fills: [areaFill],
    });
    expect(suppressed).toMatchObject({ tag: "resolved" });
    if (suppressed.tag !== "resolved") return;
    const casterTurnSuppressed = endTurn({
      state: suppressed.state,
      actorId: spellTargetId,
    });
    expect(casterTurnSuppressed.tag).toBe("resolved");
    if (casterTurnSuppressed.tag !== "resolved") return;
    const staleRepeat = resolveBattleSubject({
      state: casterTurnSuppressed.state,
      subject: repeat.subject,
      fills: [],
    });
    expect(staleRepeat).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Object-contact damage is suppressed by Antimagic Field.",
    });
  });

  test("initial Heat Metal rejects a legitimately discovered unrelated attack-roll fill", () => {
    const session = spellBattle({
      cantrips: [spellRecord(rayOfFrostUnitId)],
      preparedSpells: [spellRecord(heatMetalUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const rayAct = spellAct({
      session,
      spellId: rayOfFrostUnitId,
    });
    const rayTargetHole = requireHole(rayAct.initialHoles, "targetChoice");
    const rayTargetFill = spellTargetFill(
      rayTargetHole,
      rayOfFrostUnitId,
      spellCasterId,
      spellTargetId,
    );
    const rayAttackHole = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: rayAct.subject,
        fills: [rayTargetFill],
      }),
      "attackRoll",
    );
    const unrelatedAttackRoll = attackRollFill(rayAttackHole, {
      total: 20,
      naturalD20: 12,
    });
    const heatAct = spellAct({
      session,
      spellId: heatMetalUnitId,
      slotLevel: 2,
    });
    const objectFill = spellManufacturedMetalObjectTargetFill({
      hole: requireHole(heatAct.initialHoles, "objectTargetChoice"),
      objectId: battleObjectId("object-contact-boundary-unrelated-object"),
      spellId: heatMetalUnitId,
      casterId: spellCasterId,
    });
    const contactHole = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: heatAct.subject,
        fills: [objectFill],
      }),
      "objectContactTargets",
    );
    const result = resolveBattleSubject({
      state: session.state,
      subject: heatAct.subject,
      fills: [
        objectFill,
        spellObjectContactTargetsFill({
          hole: contactHole,
          targetIds: [spellTargetId],
        }),
        unrelatedAttackRoll,
      ],
    });
    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Object-contact damage uses only object target, contact target, damage, and damage lifecycle fills.",
    });
  });
});
