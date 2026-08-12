import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-HEAT-METAL-HOLDING-WEARING-PENALTY heat_metal
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-object-contact-damage
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.HEAT_METAL_OBJECT_CONTACT_LIFECYCLE
import type { DiceAmount, SpellRecord } from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";
import { requiredAttackRollMode } from "./battle-reducer/attack-roll.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import type { BattleActiveEffect } from "./index.ts";
import { requiredAbilityCheckRollMode } from "./battle-reducer/hole-helpers.ts";
import {
  concentrationSavingThrowFill,
  requireCharacterSpellProcedureRefForTest,
} from "./battle-runtime.test-support.ts";
import {
  heatMetalUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
  resolveWeaponAttackMiss,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  bonusSpellAct,
  maybeBonusSpellAct,
  maybeSpellAct,
  objectDropResolutionFill,
  savingThrowOutcomeFill,
  spellAct,
  spellManufacturedMetalObjectTargetFill,
  spellObjectContactTargetsFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  assertBattleSnapshotCodecAcceptsHolesForSubjectForTest,
  battleObjectId,
  breakBattleConcentration,
  elapsedTimeTicks,
  endTurn,
  Hp,
  movementFeet,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./unit-profile-admission.test-support.ts";

const heatMetalDurationTicks = elapsedTimeTicks(10);
type LinearPerLevelDiceAmount = Extract<
  DiceAmount,
  { readonly kind: "linear_per_level" }
>;

describe("TASK11 Heat Metal object-contact damage admission", () => {
  test("heat_metal is admitted as manufactured metal object-contact slot damage", () => {
    const spell = spellRecord(heatMetalUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [
        { spellLevel: 2, count: 1 },
        { spellLevel: 3, count: 1 },
      ],
    });
    const state = session.state;
    const act = spellAct({
      session,
      spellId: heatMetalUnitId,
      slotLevel: 3,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        spellCasterId,
        spellSlotInvocationRef(heatMetalUnitId, 3, "objectContactDamage"),
      ),
      mode: { tag: "cast" },
    });
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "objectTargetChoice",
        label: "Spell object target",
        requiresTableSpatialFact: true,
      }),
    ]);
    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "objectTargetChoice" })],
    });
    const objectFill = spellManufacturedMetalObjectTargetFill({
      hole: requireHole(act.initialHoles, "objectTargetChoice"),
      objectId: battleObjectId("heat-metal-admission-object"),
      spellId: heatMetalUnitId,
      casterId: spellCasterId,
    });
    const needsContactTarget = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [objectFill],
    });
    const contactTarget = requireResultHole(
      needsContactTarget,
      "objectContactTargets",
    );
    if (needsContactTarget.tag !== "needsHoles") {
      throw new Error("Expected Heat Metal contact targets.");
    }
    assertBattleSnapshotCodecAcceptsHolesForSubjectForTest({
      snapshot: needsContactTarget.snapshot,
      subject: act.subject,
      holes: needsContactTarget.holes,
    });
    const damage = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          objectFill,
          spellObjectContactTargetsFill({
            hole: contactTarget,
            targetIds: [spellTargetId],
          }),
        ],
      }),
      "rolledDice",
    );
    expect(damage).toMatchObject({
      label: "Spell damage (3d8-fire)",
    });
  });

  test("support admission rejects Heat Metal shapes that split the spell object hole", () => {
    const spell = heatMetalWithInitialObjectHoleId(
      spellRecord(heatMetalUnitId),
      "synthetic_heat_metal_second_object",
    );
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    expect(
      maybeSpellAct({ session, spellId: heatMetalUnitId }),
    ).toBeUndefined();
  });

  test("support admission rejects Heat Metal damage amount fields outside the runtime projection", () => {
    const spell = spellRecord(heatMetalUnitId);
    const amount = heatMetalObjectContactDamageAmount(spell);
    const unsupportedSpells = [
      heatMetalWithObjectContactDamageAmount(spell, {
        ...amount,
        base: { ...amount.base, flat: 1 },
      }),
      heatMetalWithObjectContactDamageAmount(spell, {
        ...amount,
        base: { ...amount.base, spellcastingMod: true },
      }),
      heatMetalWithObjectContactDamageAmount(spell, {
        ...amount,
        base: { ...amount.base, abilityModifier: "wis" },
      }),
      heatMetalWithObjectContactDamageAmount(spell, {
        ...amount,
        perLevel: { ...amount.perLevel, dieSize: 6 },
      }),
      heatMetalWithObjectContactDamageAmount(spell, {
        ...amount,
        perLevel: { ...amount.perLevel, flat: 1 },
      }),
    ] as const satisfies readonly SpellRecord[];

    for (const unsupportedSpell of unsupportedSpells) {
      const session = spellBattle({
        preparedSpells: [unsupportedSpell],
        spellSlots: [{ spellLevel: 2, count: 1 }],
      });
      expect(
        maybeSpellAct({ session, spellId: heatMetalUnitId }),
      ).toBeUndefined();
    }
  });

  test("support admission rejects Heat Metal holding-or-wearing save shapes outside the runtime projection", () => {
    const spell = spellRecord(heatMetalUnitId);
    const save = heatMetalObjectContactHoldingOrWearingSave(spell);
    const unsupportedSpells = [
      heatMetalWithObjectContactHoldingOrWearingSave(spell, {
        ...save,
        ability: "dex",
      }),
      heatMetalWithObjectContactHoldingOrWearingSave(spell, {
        ...save,
        onFailure: {
          ...save.onFailure,
          fallback: {
            ...save.onFailure.fallback,
            on: ["attack_roll"],
          },
        },
      }),
    ] as const satisfies readonly SpellRecord[];

    for (const unsupportedSpell of unsupportedSpells) {
      const session = spellBattle({
        preparedSpells: [unsupportedSpell],
        spellSlots: [{ spellLevel: 2, count: 1 }],
      });
      expect(
        maybeSpellAct({ session, spellId: heatMetalUnitId }),
      ).toBeUndefined();
    }
  });

  test("initial cast damages contacts, starts the object effect, and rejects slot replay", () => {
    const spell = spellRecord(heatMetalUnitId);
    const objectId = battleObjectId("heat-metal-chain");
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 20,
      targetMaxHp: 20,
    });
    const state = session.state;
    const act = spellAct({
      session,
      spellId: heatMetalUnitId,
      slotLevel: 2,
    });
    const objectTarget = requireHole(act.initialHoles, "objectTargetChoice");
    const objectFill = spellManufacturedMetalObjectTargetFill({
      hole: objectTarget,
      objectId,
      spellId: heatMetalUnitId,
      casterId: spellCasterId,
    });
    const contactTarget = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [objectFill],
      }),
      "objectContactTargets",
    );
    expect(contactTarget).toEqual(
      expect.objectContaining({
        objectContact: {
          sourceCombatantId: spellCasterId,
          sourceProcedureRef: act.subject.procedureRef,
          objectId,
          rangeFeet: movementFeet(60),
          requiresObjectWithinRange: false,
        },
        requiresTableSpatialFact: true,
      }),
    );
    const contactFill = spellObjectContactTargetsFill({
      hole: contactTarget,
      targetIds: [spellTargetId],
    });
    const needsDamage = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [objectFill, contactFill],
    });
    expect(needsDamage).toMatchObject({
      tag: "needsHoles",
      holes: [
        expect.objectContaining({
          kind: "rolledDice",
          label: "Spell damage (2d8-fire)",
        }),
      ],
    });
    if (needsDamage.tag !== "needsHoles") {
      throw new Error("Expected Heat Metal to request its damage roll.");
    }
    expect(needsDamage.holes).toHaveLength(1);
    const damageHole = requireResultHole(needsDamage, "rolledDice");

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        objectFill,
        contactFill,
        damageRollFillWithGroups(requireHole(needsDamage.holes, "rolledDice"), [
          [3, 4],
        ]),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { turn: { actionResources: [] } },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Heat Metal initial damage to resolve.");
    }
    expect(requireCombatant(resolved.state, spellTargetId).hp).toBe(Hp(13));
    const caster = requireCombatant(resolved.state, spellCasterId);
    expect(caster.concentration).toEqual({
      sourceProcedureRef: act.subject.procedureRef,
      effectKind: "spellEffect",
    });
    expect(caster.activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "spellObjectContactDamage",
          sourceProcedureRef: act.subject.procedureRef,
          sourceCombatantId: spellCasterId,
          sourceSpellLevel: 2,
          objectId,
          rangeFeet: movementFeet(60),
          damage: {
            expr: { dice: 2, dieSize: 8 },
            damageType: "fire",
          },
          startedOn: { actorId: spellCasterId, round: 1 },
          expiresAt: {
            kind: "concentration",
            combatantId: spellCasterId,
            durationTicks: heatMetalDurationTicks,
          },
        }),
      ]),
    );
    if (caster.origin.kind !== "character") {
      throw new Error("Expected Heat Metal caster to be a character.");
    }
    expect(caster.origin.spellcasting?.spellSlots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ spellLevel: 2, expended: 1 }),
      ]),
    );
    expect(
      maybeBonusSpellAct({
        session: battleRuntimeSessionForTest({
          state: resolved.state,
          context: session.context,
        }),
        spellId: heatMetalUnitId,
      }),
    ).toBeUndefined();
    expect(
      resolveBattleSubject({
        state: {
          ...resolved.state,
          currentTurnResources: state.currentTurnResources,
        },
        subject: act.subject,
        fills: [
          objectFill,
          contactFill,
          damageRollFillWithGroups(damageHole, [[3, 4]]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Action-time spell act no longer has its required runtime spell resource.",
    });
  });

  test("initial self-contact damage can break the newly started concentration", () => {
    const spell = spellRecord(heatMetalUnitId);
    const objectId = battleObjectId("heat-metal-caster-gauntlet");
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const state = session.state;
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
        state,
        subject: act.subject,
        fills: [objectFill],
      }),
      "objectContactTargets",
    );
    const contactFill = spellObjectContactTargetsFill({
      hole: contactHole,
      targetIds: [spellCasterId],
    });
    const damageHole = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [objectFill, contactFill],
      }),
      "rolledDice",
    );
    const needsConcentration = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        objectFill,
        contactFill,
        damageRollFillWithGroups(damageHole, [[3, 4]]),
      ],
    });
    expect(needsConcentration).toMatchObject({
      tag: "needsHoles",
      holes: [
        expect.objectContaining({
          kind: "concentrationSavingThrow",
          combatantId: spellCasterId,
          damageAmount: 7,
        }),
      ],
    });
    if (needsConcentration.tag !== "needsHoles") {
      throw new Error(
        "Expected Heat Metal self-damage to request Concentration.",
      );
    }
    const concentrationHole = requireHole(
      needsConcentration.holes,
      "concentrationSavingThrow",
    );

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        objectFill,
        contactFill,
        damageRollFillWithGroups(damageHole, [[3, 4]]),
        concentrationSavingThrowFill(concentrationHole, false),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Heat Metal failed Concentration to resolve.");
    }
    const caster = requireCombatant(resolved.state, spellCasterId);
    expect(caster.concentration).toBeNull();
    expect(caster.activeEffects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "spellObjectContactDamage",
          objectId,
        }),
      ]),
    );
    if (caster.origin.kind !== "character") {
      throw new Error("Expected Heat Metal caster to be a character.");
    }
    expect(caster.origin.spellcasting?.spellSlots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ spellLevel: 2, expended: 1 }),
      ]),
    );
  });

  test("self-contact failed no-drop save does not apply the penalty after same-occurrence Concentration breaks", () => {
    const spell = spellRecord(heatMetalUnitId);
    const objectId = battleObjectId("heat-metal-worn-gauntlet");
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const state = session.state;
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
        state,
        subject: act.subject,
        fills: [objectFill],
      }),
      "objectContactTargets",
    );
    const contactFill = spellObjectContactTargetsFill({
      hole: contactHole,
      targetIds: [spellCasterId],
      holdingOrWearing: new Map([[spellCasterId, "wearing"]]),
    });
    const damageHole = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [objectFill, contactFill],
      }),
      "rolledDice",
    );
    const damageFill = damageRollFillWithGroups(damageHole, [[4, 5]]);
    const needsConcentration = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [objectFill, contactFill, damageFill],
    });
    const concentrationHole = requireResultHole(
      needsConcentration,
      "concentrationSavingThrow",
    );
    const concentrationFill = concentrationSavingThrowFill(
      concentrationHole,
      false,
    );
    const needsSave = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [objectFill, contactFill, damageFill, concentrationFill],
    });
    const saveHole = requireResultHole(needsSave, "savingThrowOutcome");
    const failedSaveFill = savingThrowOutcomeFill(saveHole, [
      { targetId: spellCasterId, succeeded: false },
    ]);
    const needsDrop = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        objectFill,
        contactFill,
        damageFill,
        concentrationFill,
        failedSaveFill,
      ],
    });
    const dropHole = requireResultHole(needsDrop, "objectDropResolution");
    if (needsDrop.tag !== "needsHoles") {
      throw new Error("Expected Heat Metal object-drop resolution.");
    }
    assertBattleSnapshotCodecAcceptsHolesForSubjectForTest({
      snapshot: needsDrop.snapshot,
      subject: act.subject,
      holes: needsDrop.holes,
    });

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        objectFill,
        contactFill,
        damageFill,
        concentrationFill,
        failedSaveFill,
        objectDropResolutionFill(dropHole, [
          {
            targetId: spellCasterId,
            capability: { kind: "cannotDrop" },
            result: { kind: "notDropped" },
          },
        ]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Heat Metal self no-drop to resolve.");
    }
    const caster = requireCombatant(resolved.state, spellCasterId);
    expect(caster.concentration).toBeNull();
    expect(caster.activeEffects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "spellObjectContactDamage",
          objectId,
        }),
        expect.objectContaining({
          kind: "selfAttackRollAndAbilityCheckRollMode",
          sourceEffectId: `${spellCasterId}:${heatMetalUnitId}:${objectId}`,
        }),
      ]),
    );
  });

  test("initial cast can select no contact creatures without requesting damage", () => {
    const spell = spellRecord(heatMetalUnitId);
    const objectId = battleObjectId("heat-metal-empty-contact");
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 20,
      targetMaxHp: 20,
    });
    const state = session.state;
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
        state,
        subject: act.subject,
        fills: [objectFill],
      }),
      "objectContactTargets",
    );
    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        objectFill,
        spellObjectContactTargetsFill({ hole: contactHole, targetIds: [] }),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Heat Metal no-contact cast to resolve.");
    }
    expect(requireCombatant(resolved.state, spellTargetId).hp).toBe(Hp(20));
    expect(
      requireCombatant(resolved.state, spellCasterId).activeEffects,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "spellObjectContactDamage",
          objectId,
        }),
      ]),
    );
  });

  test("later-turn Bonus Action repeat requires object range witness and deals stored slot damage", () => {
    const spell = spellRecord(heatMetalUnitId);
    const objectId = battleObjectId("heat-metal-armor");
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      targetHp: 40,
      targetMaxHp: 40,
    });
    const state = session.state;
    const act = spellAct({
      session,
      spellId: heatMetalUnitId,
      slotLevel: 3,
    });
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
    const firstDamage = requireResultHole(
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
      "rolledDice",
    );
    const cast = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        objectFill,
        spellObjectContactTargetsFill({
          hole: contactHole,
          targetIds: [spellTargetId],
        }),
        damageRollFillWithGroups(firstDamage, [[3, 4, 5]]),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Heat Metal cast to resolve.");
    }
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const casterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected target End Turn to resolve.");
    }

    const repeatSession = battleRuntimeSessionForTest({
      state: casterTurn.state,
      context: session.context,
    });
    const repeat = bonusSpellAct({
      session: repeatSession,
      spellId: heatMetalUnitId,
    });
    const repeatPresentation = battleActSpellPresentation(repeat);
    if (repeatPresentation === undefined) {
      throw new Error("Expected Heat Metal repeat presentation.");
    }
    expect({
      ...repeat.subject,
      invocation: battleActSpellPresentation(repeat)?.invocation,
    }).toMatchObject({
      tag: "bonusActionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        repeatSession,
        spellCasterId,
        repeatPresentation.invocation,
      ),
    });
    const repeatContact = requireHole(
      repeat.initialHoles,
      "objectContactTargets",
    );
    expect(repeatContact.objectContact).toEqual({
      sourceCombatantId: spellCasterId,
      sourceProcedureRef: act.subject.procedureRef,
      objectId,
      rangeFeet: movementFeet(60),
      requiresObjectWithinRange: true,
    });
    const repeatFill = spellObjectContactTargetsFill({
      hole: repeatContact,
      targetIds: [spellTargetId],
    });
    expect(
      repeatFill.spatialFacts.some(
        (fact) => fact.kind === "spellObjectWithinSpellRange",
      ),
    ).toBe(true);
    const repeatDamage = requireResultHole(
      resolveBattleSubject({
        state: casterTurn.state,
        subject: repeat.subject,
        fills: [repeatFill],
      }),
      "rolledDice",
    );
    expect(repeatDamage).toMatchObject({
      label: "Spell damage (3d8-fire)",
    });

    const repeated = resolveBattleSubject({
      state: casterTurn.state,
      subject: repeat.subject,
      fills: [repeatFill, damageRollFillWithGroups(repeatDamage, [[1, 2, 3]])],
    });

    expect(repeated).toMatchObject({
      tag: "resolved",
      snapshot: { turn: { bonusActionAvailable: false } },
    });
    if (repeated.tag !== "resolved") {
      throw new Error("Expected Heat Metal repeat damage to resolve.");
    }
    expect(requireCombatant(repeated.state, spellTargetId).hp).toBe(Hp(22));
    expect(
      requireCombatant(repeated.state, spellCasterId).concentration,
    ).toEqual({
      sourceProcedureRef: act.subject.procedureRef,
      effectKind: "spellEffect",
    });
    expect(
      resolveBattleSubject({
        state: repeated.state,
        subject: repeat.subject,
        fills: [
          repeatFill,
          damageRollFillWithGroups(repeatDamage, [[1, 2, 3]]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Bonus Action spell is no longer available for the current actor.",
    });
  });

  test("damaged wearing target that fails the save and cannot drop takes the attack and ability-check penalty until the caster turn starts", () => {
    const spell = spellRecord(heatMetalUnitId);
    const objectId = battleObjectId("heat-metal-worn-breastplate");
    const session = spellBattle({
      targetAttack: zeroAbilityWeaponAttack("weapon_longsword"),
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const state = session.state;
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
        state,
        subject: act.subject,
        fills: [objectFill],
      }),
      "objectContactTargets",
    );
    const contactFill = spellObjectContactTargetsFill({
      hole: contactHole,
      targetIds: [spellTargetId],
      holdingOrWearing: new Map([[spellTargetId, "wearing"]]),
    });
    const damageHole = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [objectFill, contactFill],
      }),
      "rolledDice",
    );
    const needsSave = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        objectFill,
        contactFill,
        damageRollFillWithGroups(damageHole, [[4, 5]]),
      ],
    });
    if (needsSave.tag !== "needsHoles") {
      throw new Error("Expected Heat Metal object-contact save.");
    }
    assertBattleSnapshotCodecAcceptsHolesForSubjectForTest({
      snapshot: needsSave.snapshot,
      subject: act.subject,
      holes: needsSave.holes,
    });
    const saveHole = requireResultHole(needsSave, "savingThrowOutcome");
    expect(saveHole).toMatchObject({
      objectContactSave: {
        sourceCombatantId: spellCasterId,
        sourceProcedureRef: act.subject.procedureRef,
        objectId,
        targetIds: [spellTargetId],
      },
      ability: "con",
      dc: { kind: "caster_spell_save_dc" },
    });
    const failedSaveFill = savingThrowOutcomeFill(saveHole, [
      { targetId: spellTargetId, succeeded: false },
    ]);
    const needsDrop = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        objectFill,
        contactFill,
        damageRollFillWithGroups(damageHole, [[4, 5]]),
        failedSaveFill,
      ],
    });
    const dropHole = requireResultHole(needsDrop, "objectDropResolution");
    expect(dropHole).toMatchObject({
      objectDrop: {
        sourceCombatantId: spellCasterId,
        sourceProcedureRef: act.subject.procedureRef,
        objectId,
        targetIds: [spellTargetId],
      },
    });

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        objectFill,
        contactFill,
        damageRollFillWithGroups(damageHole, [[4, 5]]),
        failedSaveFill,
        objectDropResolutionFill(dropHole, [
          {
            targetId: spellTargetId,
            capability: { kind: "cannotDrop" },
            result: { kind: "notDropped" },
          },
        ]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Heat Metal failed save no-drop to resolve.");
    }
    expect(requireCombatant(resolved.state, spellTargetId).hp).toBe(Hp(21));
    expect(resolved.droppedObjects).toBeUndefined();
    const heatMetalEffect = requireCombatant(
      resolved.state,
      spellCasterId,
    ).activeEffects.find(
      (
        effect,
      ): effect is Extract<
        BattleActiveEffect,
        { readonly kind: "spellObjectContactDamage" }
      > =>
        effect.kind === "spellObjectContactDamage" &&
        effect.objectId === objectId,
    );
    if (heatMetalEffect === undefined) {
      throw new Error("Expected active Heat Metal object effect.");
    }
    expect(
      requireCombatant(resolved.state, spellTargetId).activeEffects,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "selfAttackRollAndAbilityCheckRollMode",
          sourceEffectRef: heatMetalEffect.effectRef,
          sourceProcedureRef: act.subject.procedureRef,
          sourceCombatantId: spellCasterId,
          mode: "disadvantage",
          expiresAt: { kind: "startOfTurn", combatantId: spellCasterId },
        }),
      ]),
    );
    expect(
      requiredAbilityCheckRollMode(resolved.state, spellTargetId, "str"),
    ).toBe("disadvantage");
    expect(
      requiredAbilityCheckRollMode(resolved.state, spellTargetId, "wis"),
    ).toBe("disadvantage");
    expect(
      requiredAttackRollMode(resolved.state, spellTargetId, spellCasterId),
    ).toBe("disadvantage");

    const concentrationBroken = breakBattleConcentration(
      resolved.state,
      spellCasterId,
    );
    expect(
      requireCombatant(concentrationBroken, spellTargetId).activeEffects,
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "selfAttackRollAndAbilityCheckRollMode",
          sourceEffectId: `${spellCasterId}:${heatMetalUnitId}:${objectId}`,
        }),
      ]),
    );

    const targetTurn = endTurn({
      state: resolved.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected Heat Metal caster End Turn to resolve.");
    }
    const { attackRoll, state: afterMiss } = resolveWeaponAttackMiss({
      session: battleRuntimeSessionForTest({
        state: targetTurn.state,
        context: session.context,
      }),
      attackName: "Longsword",
      actorId: spellTargetId,
      targetId: spellCasterId,
    });
    expect(attackRoll).toMatchObject({ rollMode: "disadvantage" });
    expect(
      requiredAttackRollMode(afterMiss, spellTargetId, spellCasterId),
    ).toBe("disadvantage");
    const casterTurn = endTurn({
      state: afterMiss,
      actorId: spellTargetId,
    });
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected Heat Metal target End Turn to resolve.");
    }
    expect(
      requiredAbilityCheckRollMode(casterTurn.state, spellTargetId, "str"),
    ).toBeUndefined();
    expect(
      requiredAttackRollMode(casterTurn.state, spellTargetId, spellCasterId),
    ).toBeUndefined();
  });

  test("damaged holding target that fails the save and can drop emits the dropped-object outcome without the penalty", () => {
    const spell = spellRecord(heatMetalUnitId);
    const objectId = battleObjectId("heat-metal-held-sword");
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const state = session.state;
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
        state,
        subject: act.subject,
        fills: [objectFill],
      }),
      "objectContactTargets",
    );
    const contactFill = spellObjectContactTargetsFill({
      hole: contactHole,
      targetIds: [spellTargetId],
      holdingOrWearing: new Map([[spellTargetId, "holding"]]),
    });
    const damageHole = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [objectFill, contactFill],
      }),
      "rolledDice",
    );
    const saveHole = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          objectFill,
          contactFill,
          damageRollFillWithGroups(damageHole, [[2, 3]]),
        ],
      }),
      "savingThrowOutcome",
    );
    const failedSaveFill = savingThrowOutcomeFill(saveHole, [
      { targetId: spellTargetId, succeeded: false },
    ]);
    const dropHole = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          objectFill,
          contactFill,
          damageRollFillWithGroups(damageHole, [[2, 3]]),
          failedSaveFill,
        ],
      }),
      "objectDropResolution",
    );

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        objectFill,
        contactFill,
        damageRollFillWithGroups(damageHole, [[2, 3]]),
        failedSaveFill,
        objectDropResolutionFill(dropHole, [
          {
            targetId: spellTargetId,
            capability: { kind: "canDrop" },
            result: { kind: "dropped" },
          },
        ]),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      droppedObjects: [
        {
          kind: "objectDropped",
          actorId: spellTargetId,
          objectId,
          source: {
            kind: "spell",
            sourceCombatantId: spellCasterId,
            sourceProcedureRef: act.subject.procedureRef,
          },
        },
      ],
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Heat Metal failed save drop to resolve.");
    }
    expect(
      requiredAttackRollMode(resolved.state, spellTargetId, spellCasterId),
    ).toBeUndefined();
    expect(
      requireCombatant(resolved.state, spellTargetId).activeEffects,
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "selfAttackRollAndAbilityCheckRollMode",
        }),
      ]),
    );
  });

  test("damaged holding-or-wearing target that succeeds the save does not need a drop witness", () => {
    const spell = spellRecord(heatMetalUnitId);
    const objectId = battleObjectId("heat-metal-saved-helmet");
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const state = session.state;
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
        state,
        subject: act.subject,
        fills: [objectFill],
      }),
      "objectContactTargets",
    );
    const contactFill = spellObjectContactTargetsFill({
      hole: contactHole,
      targetIds: [spellTargetId],
      holdingOrWearing: new Map([[spellTargetId, "wearing"]]),
    });
    const damageHole = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [objectFill, contactFill],
      }),
      "rolledDice",
    );
    const saveHole = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          objectFill,
          contactFill,
          damageRollFillWithGroups(damageHole, [[1, 2]]),
        ],
      }),
      "savingThrowOutcome",
    );

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        objectFill,
        contactFill,
        damageRollFillWithGroups(damageHole, [[1, 2]]),
        savingThrowOutcomeFill(saveHole, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Heat Metal successful save to resolve.");
    }
    expect(resolved.droppedObjects).toBeUndefined();
    expect(
      requiredAbilityCheckRollMode(resolved.state, spellTargetId, "str"),
    ).toBeUndefined();
  });
});

function heatMetalWithInitialObjectHoleId(
  spell: SpellRecord,
  holeId: string,
): SpellRecord {
  const mechanics = requireHeatMetalOngoingEffectMechanics(spell);
  const initialPhase = mechanics.initialPhase;
  if (initialPhase?.kind !== "direct") {
    throw new Error("Expected Heat Metal to have a direct initial phase.");
  }
  return {
    ...spell,
    mechanics: {
      ...mechanics,
      initialPhase: {
        ...initialPhase,
        attachment: {
          ...initialPhase.attachment,
          holeId,
        },
      },
    },
  } as SpellRecord;
}

function heatMetalWithObjectContactDamageAmount(
  spell: SpellRecord,
  amount: DiceAmount,
): SpellRecord {
  const mechanics = requireHeatMetalOngoingEffectMechanics(spell);
  const initialPhase = mechanics.initialPhase;
  const repeatOperation = mechanics.operations[0];
  if (
    initialPhase?.kind !== "direct" ||
    initialPhase.effects?.[0]?.kind !== "object_contact_damage" ||
    repeatOperation?.effect.kind !== "object_contact_damage"
  ) {
    throw new Error(
      "Expected Heat Metal to have initial and repeat object-contact damage.",
    );
  }
  return {
    ...spell,
    mechanics: {
      ...mechanics,
      initialPhase: {
        ...initialPhase,
        effects: [
          {
            ...initialPhase.effects[0],
            amount,
          },
        ],
      },
      operations: [
        {
          ...repeatOperation,
          effect: {
            ...repeatOperation.effect,
            amount,
          },
        },
      ],
    },
  } as SpellRecord;
}

function heatMetalObjectContactDamageAmount(
  spell: SpellRecord,
): LinearPerLevelDiceAmount {
  const mechanics = requireHeatMetalOngoingEffectMechanics(spell);
  const initialPhase = mechanics.initialPhase;
  const effect =
    initialPhase?.kind === "direct" ? initialPhase.effects?.[0] : null;
  if (
    effect?.kind !== "object_contact_damage" ||
    effect.amount.kind !== "linear_per_level"
  ) {
    throw new Error("Expected Heat Metal object-contact damage amount.");
  }
  return effect.amount;
}

function heatMetalWithObjectContactHoldingOrWearingSave(
  spell: SpellRecord,
  holdingOrWearingSave: unknown,
): SpellRecord {
  const mechanics = requireHeatMetalOngoingEffectMechanics(spell);
  const initialPhase = mechanics.initialPhase;
  const repeatOperation = mechanics.operations[0];
  if (
    initialPhase?.kind !== "direct" ||
    initialPhase.effects?.[0]?.kind !== "object_contact_damage" ||
    repeatOperation?.effect.kind !== "object_contact_damage"
  ) {
    throw new Error(
      "Expected Heat Metal to have initial and repeat object-contact damage.",
    );
  }
  return {
    ...spell,
    mechanics: {
      ...mechanics,
      initialPhase: {
        ...initialPhase,
        effects: [
          {
            ...initialPhase.effects[0],
            holdingOrWearingSave,
          },
        ],
      },
      operations: [
        {
          ...repeatOperation,
          effect: {
            ...repeatOperation.effect,
            holdingOrWearingSave,
          },
        },
      ],
    },
  } as SpellRecord;
}

function heatMetalObjectContactHoldingOrWearingSave(spell: SpellRecord) {
  const mechanics = requireHeatMetalOngoingEffectMechanics(spell);
  const initialPhase = mechanics.initialPhase;
  const effect =
    initialPhase?.kind === "direct" ? initialPhase.effects?.[0] : null;
  if (effect?.kind !== "object_contact_damage") {
    throw new Error("Expected Heat Metal object-contact damage save.");
  }
  return effect.holdingOrWearingSave;
}

function requireHeatMetalOngoingEffectMechanics(
  spell: SpellRecord,
): Extract<SpellRecord["mechanics"], { readonly family: "ongoing_effect" }> {
  if (spell.mechanics.family !== "ongoing_effect") {
    throw new Error("Expected Heat Metal ongoing-effect mechanics.");
  }
  return spell.mechanics;
}
