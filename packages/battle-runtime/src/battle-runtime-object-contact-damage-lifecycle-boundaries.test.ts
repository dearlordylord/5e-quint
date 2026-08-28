// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-object-contact-damage
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.HEAT_METAL_OBJECT_CONTACT_LIFECYCLE

import { describe, expect, test } from "vitest";
import { decodeCreatureImmunityDeclarationSync } from "@dnd/surface/surface/schema";

import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  attackDamageDispositionFill,
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
  statBlockCreature,
  statBlockWithCreatureType,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  savingThrowOutcomeFill,
  bonusSpellAct,
  objectDropResolutionFill,
  spellAct,
  spellManufacturedMetalObjectTargetFill,
  spellObjectContactTargetsFill,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  animalFriendshipUnitId,
  heatMetalUnitId,
  hideousLaughterUnitId,
  orcRelentlessEnduranceUnitId,
  spellCasterId,
  spellTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  battleId,
  battleObjectId,
  combatantId,
  concentrationSavingThrowFill,
  endTurn,
  resolveBattleSubject,
  startBattleSessionRight,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import { ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE } from "./unit-profile-admission.test-support.ts";
import { characterCreature } from "./unit-profile-admission-creature-fixture.test-support.ts";
import { requiredConditionEndAbilityCheckRollMode } from "./battle-reducer/hole-helpers.ts";

const heatMetalObjectId = battleObjectId(
  "object-contact-lifecycle-boundary-metal",
);
const hideousLaughterCasterId = combatantId(
  "object-contact-hideous-laughter-caster",
);
const heatMetalCasterId = combatantId("object-contact-heat-metal-caster");

function fireImmuneHumanoidStatBlock() {
  const base = statBlockWithCreatureType("humanoid");
  return {
    ...base,
    statBlock: {
      ...base.statBlock,
      immunities: decodeCreatureImmunityDeclarationSync({
        damageTypes: ["fire"],
      }),
    },
  };
}

describe("object-contact damage public lifecycle boundaries", () => {
  test("Heat Metal resolves zero fire damage without holding-save or penalty lifecycle", () => {
    const session = spellBattle({
      preparedSpells: [spellRecord(heatMetalUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetStatBlock: fireImmuneHumanoidStatBlock(),
      targetHp: 20,
      targetMaxHp: 20,
    });
    const act = spellAct({
      session,
      spellId: heatMetalUnitId,
      slotLevel: 2,
    });
    const objectFill = spellManufacturedMetalObjectTargetFill({
      hole: requireHole(act.initialHoles, "objectTargetChoice"),
      objectId: heatMetalObjectId,
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
      holdingOrWearing: new Map([[spellTargetId, "wearing"]]),
    });
    const damageHole = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [objectFill, contactFill],
      }),
      "rolledDice",
    );
    const initialTargetHp = requireCombatant(session.state, spellTargetId).hp;

    const resolved = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        objectFill,
        contactFill,
        damageRollFillWithGroups(damageHole, [[8, 8]]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") return;
    expect(requireCombatant(resolved.state, spellTargetId).hp).toBe(
      initialTargetHp,
    );
    expect(
      requireCombatant(resolved.state, spellTargetId).activeEffects,
    ).toEqual([]);
  });

  test("Heat Metal exposes a public zero-Hit-Point replacement disposition", () => {
    const enduranceUnit = unitLibrary.requireUnit(orcRelentlessEnduranceUnitId);
    const session = spellBattle({
      preparedSpells: [spellRecord(heatMetalUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 3,
      targetMaxHp: 12,
      targetResources: [{ unit: enduranceUnit }],
      targetUnitRefs: [
        {
          unit: enduranceUnit,
          supportProfiles: [ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE],
        },
      ],
    });
    const act = spellAct({
      session,
      spellId: heatMetalUnitId,
      slotLevel: 2,
    });
    const objectFill = spellManufacturedMetalObjectTargetFill({
      hole: requireHole(act.initialHoles, "objectTargetChoice"),
      objectId: heatMetalObjectId,
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
    const damageFill = damageRollFillWithGroups(damageHole, [[2, 2]]);
    const needsDisposition = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [objectFill, contactFill, damageFill],
    });
    const disposition = requireResultHole(
      needsDisposition,
      "attackDamageDisposition",
    );
    const replacement = disposition.choices.find(
      (choice) => choice.kind === "zeroHitPointReplacement",
    );
    expect(replacement).toBeDefined();
    if (replacement === undefined) return;
    const resolved = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        objectFill,
        contactFill,
        damageFill,
        attackDamageDispositionFill(disposition, replacement),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") return;
    expect(requireCombatant(resolved.state, spellTargetId).hp).toBe(1);
  });

  test("Heat Metal damage requests and resolves a public Hideous Laughter damage repeat save", () => {
    const session = startBattleSessionRight({
      battleId: battleId("object-contact-hideous-laughter-repeat-save"),
      combatants: [
        characterCreature({
          combatantId: hideousLaughterCasterId,
          displayName: "Hideous Laughter caster",
          initiative: 30,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord(hideousLaughterUnitId)],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterCreature({
          combatantId: heatMetalCasterId,
          displayName: "Heat Metal caster",
          initiative: 20,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord(heatMetalUnitId)],
            spellSlots: [{ spellLevel: 2, count: 1 }],
          }),
        }),
        characterCreature({
          combatantId: spellTargetId,
          displayName: "Laughing target",
          initiative: 10,
          currentHp: 30,
          maxHp: 30,
        }),
      ],
    });
    const laughterAct = spellAct({
      session,
      spellId: hideousLaughterUnitId,
      slotLevel: 1,
    });
    expect(laughterAct.subject.actorId).toBe(hideousLaughterCasterId);
    const targetFill = spellTargetListFill(
      requireHole(laughterAct.initialHoles, "spellTargetList"),
      hideousLaughterCasterId,
      hideousLaughterUnitId,
      [spellTargetId],
    );
    const initialSave = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: laughterAct.subject,
        fills: [targetFill],
      }),
      "savingThrowOutcome",
    );
    const laughed = resolveBattleSubject({
      state: session.state,
      subject: laughterAct.subject,
      fills: [
        targetFill,
        savingThrowOutcomeFill(initialSave, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    expect(laughed).toMatchObject({ tag: "resolved" });
    if (laughed.tag !== "resolved") return;

    const heatCasterTurn = endTurn({
      state: laughed.state,
      actorId: hideousLaughterCasterId,
    });
    expect(heatCasterTurn).toMatchObject({ tag: "resolved" });
    if (heatCasterTurn.tag !== "resolved") return;
    const heatSession = battleRuntimeSessionForTest({
      state: heatCasterTurn.state,
      context: session.context,
    });
    const heatAct = spellAct({
      session: heatSession,
      spellId: heatMetalUnitId,
      slotLevel: 2,
    });
    expect(heatAct.subject.actorId).toBe(heatMetalCasterId);
    const objectFill = spellManufacturedMetalObjectTargetFill({
      hole: requireHole(heatAct.initialHoles, "objectTargetChoice"),
      objectId: heatMetalObjectId,
      spellId: heatMetalUnitId,
      casterId: heatMetalCasterId,
    });
    const contactHole = requireResultHole(
      resolveBattleSubject({
        state: heatCasterTurn.state,
        subject: heatAct.subject,
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
        state: heatCasterTurn.state,
        subject: heatAct.subject,
        fills: [objectFill, contactFill],
      }),
      "rolledDice",
    );
    const damageFill = damageRollFillWithGroups(damageHole, [[4, 4]]);
    const needsLaughterSave = resolveBattleSubject({
      state: heatCasterTurn.state,
      subject: heatAct.subject,
      fills: [objectFill, contactFill, damageFill],
    });
    const laughterSave = requireResultHole(
      needsLaughterSave,
      "savingThrowOutcome",
    );
    expect(laughterSave).toMatchObject({
      hideousLaughterRepeatSave: {
        targetId: spellTargetId,
        trigger: "damage",
      },
      targetRollModes: [{ targetId: spellTargetId, rollMode: "advantage" }],
    });
    const needsObjectSave = resolveBattleSubject({
      state: heatCasterTurn.state,
      subject: heatAct.subject,
      fills: [
        objectFill,
        contactFill,
        damageFill,
        savingThrowOutcomeFill(laughterSave, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    const objectSave = requireResultHole(needsObjectSave, "savingThrowOutcome");
    expect(objectSave).toMatchObject({
      objectContactSave: { targetIds: [spellTargetId] },
    });
    const resolved = resolveBattleSubject({
      state: heatCasterTurn.state,
      subject: heatAct.subject,
      fills: [
        objectFill,
        contactFill,
        damageFill,
        savingThrowOutcomeFill(laughterSave, [
          { targetId: spellTargetId, succeeded: true },
        ]),
        savingThrowOutcomeFill(objectSave, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") return;
    expect(
      requireCombatant(resolved.state, spellTargetId).activeEffects,
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "hideousLaughter" }),
      ]),
    );
  });

  test("a later repeat applies one Heat Metal penalty after the prior penalty expires", () => {
    const session = spellBattle({
      preparedSpells: [spellRecord(heatMetalUnitId)],
      spellSlots: [{ spellLevel: 2, count: 2 }],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const firstAct = spellAct({
      session,
      spellId: heatMetalUnitId,
      slotLevel: 2,
    });
    const firstObjectFill = spellManufacturedMetalObjectTargetFill({
      hole: requireHole(firstAct.initialHoles, "objectTargetChoice"),
      objectId: heatMetalObjectId,
      spellId: heatMetalUnitId,
      casterId: spellCasterId,
    });
    const firstContactHole = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: firstAct.subject,
        fills: [firstObjectFill],
      }),
      "objectContactTargets",
    );
    const firstContactFill = spellObjectContactTargetsFill({
      hole: firstContactHole,
      targetIds: [spellTargetId],
      holdingOrWearing: new Map([[spellTargetId, "holding"]]),
    });
    const firstDamageHole = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: firstAct.subject,
        fills: [firstObjectFill, firstContactFill],
      }),
      "rolledDice",
    );
    const firstDamageFill = damageRollFillWithGroups(firstDamageHole, [[4, 5]]);
    const firstSave = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: firstAct.subject,
        fills: [firstObjectFill, firstContactFill, firstDamageFill],
      }),
      "savingThrowOutcome",
    );
    const firstDrop = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: firstAct.subject,
        fills: [
          firstObjectFill,
          firstContactFill,
          firstDamageFill,
          savingThrowOutcomeFill(firstSave, [
            { targetId: spellTargetId, succeeded: false },
          ]),
        ],
      }),
      "objectDropResolution",
    );
    const firstResolved = resolveBattleSubject({
      state: session.state,
      subject: firstAct.subject,
      fills: [
        firstObjectFill,
        firstContactFill,
        firstDamageFill,
        savingThrowOutcomeFill(firstSave, [
          { targetId: spellTargetId, succeeded: false },
        ]),
        objectDropResolutionFill(firstDrop, [
          {
            targetId: spellTargetId,
            capability: { kind: "cannotDrop" },
            result: { kind: "notDropped" },
          },
        ]),
      ],
    });
    expect(firstResolved).toMatchObject({ tag: "resolved" });
    if (firstResolved.tag !== "resolved") return;
    const firstPenalty = requireCombatant(
      firstResolved.state,
      spellTargetId,
    ).activeEffects.find(
      (effect) => effect.kind === "selfAttackRollAndAbilityCheckRollMode",
    );
    expect(firstPenalty).toBeDefined();
    expect(
      requiredConditionEndAbilityCheckRollMode(
        firstResolved.state,
        spellTargetId,
        "grappled",
      ),
    ).toBe("disadvantage");

    const targetTurn = endTurn({
      state: firstResolved.state,
      actorId: spellCasterId,
    });
    expect(targetTurn).toMatchObject({ tag: "resolved" });
    if (targetTurn.tag !== "resolved") return;
    const casterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    expect(casterTurn).toMatchObject({ tag: "resolved" });
    if (casterTurn.tag !== "resolved") return;
    const repeatSession = battleRuntimeSessionForTest({
      state: casterTurn.state,
      context: session.context,
    });
    const repeatAct = bonusSpellAct({
      session: repeatSession,
      spellId: heatMetalUnitId,
    });
    const repeatContact = requireHole(
      repeatAct.initialHoles,
      "objectContactTargets",
    );
    const repeatContactFill = spellObjectContactTargetsFill({
      hole: repeatContact,
      targetIds: [spellTargetId],
      holdingOrWearing: new Map([[spellTargetId, "holding"]]),
    });
    const repeatDamageHole = requireResultHole(
      resolveBattleSubject({
        state: casterTurn.state,
        subject: repeatAct.subject,
        fills: [repeatContactFill],
      }),
      "rolledDice",
    );
    const repeatDamageFill = damageRollFillWithGroups(repeatDamageHole, [
      [2, 3],
    ]);
    const repeatSave = requireResultHole(
      resolveBattleSubject({
        state: casterTurn.state,
        subject: repeatAct.subject,
        fills: [repeatContactFill, repeatDamageFill],
      }),
      "savingThrowOutcome",
    );
    const repeatDrop = requireResultHole(
      resolveBattleSubject({
        state: casterTurn.state,
        subject: repeatAct.subject,
        fills: [
          repeatContactFill,
          repeatDamageFill,
          savingThrowOutcomeFill(repeatSave, [
            { targetId: spellTargetId, succeeded: false },
          ]),
        ],
      }),
      "objectDropResolution",
    );
    const invalidDrop = resolveBattleSubject({
      state: casterTurn.state,
      subject: repeatAct.subject,
      fills: [
        repeatContactFill,
        repeatDamageFill,
        savingThrowOutcomeFill(repeatSave, [
          { targetId: spellTargetId, succeeded: false },
        ]),
        objectDropResolutionFill(repeatDrop, [
          {
            targetId: spellCasterId,
            capability: { kind: "canDrop" },
            result: { kind: "dropped" },
          },
        ]),
      ],
    });
    expect(invalidDrop).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
    const repeated = resolveBattleSubject({
      state: casterTurn.state,
      subject: repeatAct.subject,
      fills: [
        repeatContactFill,
        repeatDamageFill,
        savingThrowOutcomeFill(repeatSave, [
          { targetId: spellTargetId, succeeded: false },
        ]),
        objectDropResolutionFill(repeatDrop, [
          {
            targetId: spellTargetId,
            capability: { kind: "cannotDrop" },
            result: { kind: "notDropped" },
          },
        ]),
      ],
    });
    expect(repeated).toMatchObject({ tag: "resolved" });
    if (repeated.tag !== "resolved") return;
    const penalties = requireCombatant(
      repeated.state,
      spellTargetId,
    ).activeEffects.filter(
      (effect) => effect.kind === "selfAttackRollAndAbilityCheckRollMode",
    );
    expect(penalties).toHaveLength(1);
    expect(penalties[0]).toMatchObject({
      sourceEffectRef: firstPenalty?.sourceEffectRef,
    });
  });

  test("a second public Heat Metal cast installs its object effect after prior concentration ends", () => {
    const secondObjectId = battleObjectId(
      "object-contact-lifecycle-boundary-metal-second",
    );
    const session = spellBattle({
      preparedSpells: [spellRecord(heatMetalUnitId)],
      spellSlots: [{ spellLevel: 2, count: 2 }],
    });
    const firstAct = spellAct({
      session,
      spellId: heatMetalUnitId,
      slotLevel: 2,
    });
    const firstObjectFill = spellManufacturedMetalObjectTargetFill({
      hole: requireHole(firstAct.initialHoles, "objectTargetChoice"),
      objectId: heatMetalObjectId,
      spellId: heatMetalUnitId,
      casterId: spellCasterId,
    });
    const firstContact = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: firstAct.subject,
        fills: [firstObjectFill],
      }),
      "objectContactTargets",
    );
    const first = resolveBattleSubject({
      state: session.state,
      subject: firstAct.subject,
      fills: [
        firstObjectFill,
        spellObjectContactTargetsFill({ hole: firstContact, targetIds: [] }),
      ],
    });
    expect(first).toMatchObject({ tag: "resolved" });
    if (first.tag !== "resolved") return;
    const firstEffect = requireCombatant(
      first.state,
      spellCasterId,
    ).activeEffects.find(
      (effect) => effect.kind === "spellObjectContactDamage",
    );
    expect(firstEffect).toBeDefined();

    const targetTurn = endTurn({ state: first.state, actorId: spellCasterId });
    expect(targetTurn).toMatchObject({ tag: "resolved" });
    if (targetTurn.tag !== "resolved") return;
    const casterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    expect(casterTurn).toMatchObject({ tag: "resolved" });
    if (casterTurn.tag !== "resolved") return;
    const repeatSession = battleRuntimeSessionForTest({
      state: casterTurn.state,
      context: session.context,
    });
    const secondAct = spellAct({
      session: repeatSession,
      spellId: heatMetalUnitId,
      slotLevel: 2,
    });
    const secondObjectFill = spellManufacturedMetalObjectTargetFill({
      hole: requireHole(secondAct.initialHoles, "objectTargetChoice"),
      objectId: secondObjectId,
      spellId: heatMetalUnitId,
      casterId: spellCasterId,
    });
    const secondContact = requireResultHole(
      resolveBattleSubject({
        state: casterTurn.state,
        subject: secondAct.subject,
        fills: [secondObjectFill],
      }),
      "objectContactTargets",
    );
    const second = resolveBattleSubject({
      state: casterTurn.state,
      subject: secondAct.subject,
      fills: [
        secondObjectFill,
        spellObjectContactTargetsFill({ hole: secondContact, targetIds: [] }),
      ],
    });
    expect(second).toMatchObject({ tag: "resolved" });
    if (second.tag !== "resolved") return;
    const effects = requireCombatant(second.state, spellCasterId).activeEffects;
    expect(
      effects.filter((effect) => effect.kind === "spellObjectContactDamage"),
    ).toHaveLength(1);
    expect(effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "spellObjectContactDamage",
          objectId: secondObjectId,
        }),
      ]),
    );
    expect(
      effects.some(
        (effect) =>
          effect.kind === "spellObjectContactDamage" &&
          effect.effectRef === firstEffect?.effectRef,
      ),
    ).toBe(false);
  });

  test("Heat Metal damage asks for Animal Friendship's public relationship decision", () => {
    const relationshipCasterId = combatantId(
      "object-contact-relationship-caster",
    );
    const damageCasterId = combatantId("object-contact-relationship-damager");
    const session = startBattleSessionRight({
      battleId: battleId("object-contact-relationship-decision"),
      combatants: [
        characterCreature({
          combatantId: relationshipCasterId,
          displayName: "Animal Friendship caster",
          initiative: 30,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord(animalFriendshipUnitId)],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterCreature({
          combatantId: damageCasterId,
          displayName: "Heat Metal caster",
          initiative: 20,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord(heatMetalUnitId)],
            spellSlots: [{ spellLevel: 2, count: 1 }],
          }),
        }),
        statBlockCreature({
          combatantId: spellTargetId,
          statBlock: statBlockWithCreatureType("beast"),
          initiative: 10,
        }),
      ],
    });
    const friendshipAct = spellAct({
      session,
      spellId: animalFriendshipUnitId,
      slotLevel: 1,
    });
    const friendshipTarget = spellTargetListFill(
      requireHole(friendshipAct.initialHoles, "spellTargetList"),
      relationshipCasterId,
      animalFriendshipUnitId,
      [spellTargetId],
    );
    const friendshipSave = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: friendshipAct.subject,
        fills: [friendshipTarget],
      }),
      "savingThrowOutcome",
    );
    const friendship = resolveBattleSubject({
      state: session.state,
      subject: friendshipAct.subject,
      fills: [
        friendshipTarget,
        savingThrowOutcomeFill(friendshipSave, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    expect(friendship).toMatchObject({ tag: "resolved" });
    if (friendship.tag !== "resolved") return;
    const damageCasterTurn = endTurn({
      state: friendship.state,
      actorId: relationshipCasterId,
    });
    expect(damageCasterTurn).toMatchObject({ tag: "resolved" });
    if (damageCasterTurn.tag !== "resolved") return;
    const damageSession = battleRuntimeSessionForTest({
      state: damageCasterTurn.state,
      context: session.context,
    });
    const heatAct = spellAct({
      session: damageSession,
      spellId: heatMetalUnitId,
      slotLevel: 2,
    });
    const objectFill = spellManufacturedMetalObjectTargetFill({
      hole: requireHole(heatAct.initialHoles, "objectTargetChoice"),
      objectId: heatMetalObjectId,
      spellId: heatMetalUnitId,
      casterId: damageCasterId,
    });
    const contactHole = requireResultHole(
      resolveBattleSubject({
        state: damageCasterTurn.state,
        subject: heatAct.subject,
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
        state: damageCasterTurn.state,
        subject: heatAct.subject,
        fills: [objectFill, contactFill],
      }),
      "rolledDice",
    );
    const relationshipNeedsHoles = resolveBattleSubject({
      state: damageCasterTurn.state,
      subject: heatAct.subject,
      fills: [
        objectFill,
        contactFill,
        damageRollFillWithGroups(damageHole, [[4, 4]]),
      ],
    });
    const relationshipHole = requireResultHole(
      relationshipNeedsHoles,
      "damageRelationshipDecisions",
    );
    expect(relationshipHole.questions).toEqual([
      expect.objectContaining({
        kind: "targetDamagedByCasterOrAlly",
        targetId: spellTargetId,
      }),
    ]);
    const [relationshipQuestion, ...remainingRelationshipQuestions] =
      relationshipHole.questions;
    if (relationshipQuestion === undefined) {
      throw new Error("Expected a damage relationship question.");
    }
    const resolved = resolveBattleSubject({
      state: damageCasterTurn.state,
      subject: heatAct.subject,
      fills: [
        objectFill,
        contactFill,
        damageRollFillWithGroups(damageHole, [[4, 4]]),
        {
          kind: "damageRelationshipDecisions",
          holeId: relationshipHole.holeId,
          answers: [
            { questionId: relationshipQuestion.questionId, answer: false },
            ...remainingRelationshipQuestions.map((question) => ({
              questionId: question.questionId,
              answer: false,
            })),
          ],
        },
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
  });

  test("rejects a discovered Heat Metal drop fill from a different public object act", () => {
    const secondObjectId = battleObjectId(
      "object-contact-lifecycle-boundary-metal-drop-mismatch",
    );
    const session = spellBattle({
      preparedSpells: [spellRecord(heatMetalUnitId)],
      spellSlots: [
        { spellLevel: 2, count: 1 },
        { spellLevel: 3, count: 1 },
      ],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const firstAct = spellAct({
      session,
      spellId: heatMetalUnitId,
      slotLevel: 2,
    });
    const secondAct = spellAct({
      session,
      spellId: heatMetalUnitId,
      slotLevel: 3,
    });
    const firstObjectFill = spellManufacturedMetalObjectTargetFill({
      hole: requireHole(firstAct.initialHoles, "objectTargetChoice"),
      objectId: heatMetalObjectId,
      spellId: heatMetalUnitId,
      casterId: spellCasterId,
    });
    const firstContactHole = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: firstAct.subject,
        fills: [firstObjectFill],
      }),
      "objectContactTargets",
    );
    const firstContactFill = spellObjectContactTargetsFill({
      hole: firstContactHole,
      targetIds: [spellTargetId],
      holdingOrWearing: new Map([[spellTargetId, "holding"]]),
    });
    const firstDamageHole = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: firstAct.subject,
        fills: [firstObjectFill, firstContactFill],
      }),
      "rolledDice",
    );
    const firstDamageFill = damageRollFillWithGroups(firstDamageHole, [[4, 5]]);
    const firstSave = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: firstAct.subject,
        fills: [firstObjectFill, firstContactFill, firstDamageFill],
      }),
      "savingThrowOutcome",
    );
    const firstDrop = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: firstAct.subject,
        fills: [
          firstObjectFill,
          firstContactFill,
          firstDamageFill,
          savingThrowOutcomeFill(firstSave, [
            { targetId: spellTargetId, succeeded: false },
          ]),
        ],
      }),
      "objectDropResolution",
    );
    const secondObjectFill = spellManufacturedMetalObjectTargetFill({
      hole: requireHole(secondAct.initialHoles, "objectTargetChoice"),
      objectId: secondObjectId,
      spellId: heatMetalUnitId,
      casterId: spellCasterId,
    });
    const secondContactHole = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: secondAct.subject,
        fills: [secondObjectFill],
      }),
      "objectContactTargets",
    );
    const secondContactFill = spellObjectContactTargetsFill({
      hole: secondContactHole,
      targetIds: [spellTargetId],
      holdingOrWearing: new Map([[spellTargetId, "holding"]]),
    });
    const secondDamageHole = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: secondAct.subject,
        fills: [secondObjectFill, secondContactFill],
      }),
      "rolledDice",
    );
    const secondDamageFill = damageRollFillWithGroups(secondDamageHole, [
      [4, 5, 6],
    ]);
    const secondSave = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: secondAct.subject,
        fills: [secondObjectFill, secondContactFill, secondDamageFill],
      }),
      "savingThrowOutcome",
    );
    const secondDrop = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: secondAct.subject,
        fills: [
          secondObjectFill,
          secondContactFill,
          secondDamageFill,
          savingThrowOutcomeFill(secondSave, [
            { targetId: spellTargetId, succeeded: false },
          ]),
        ],
      }),
      "objectDropResolution",
    );
    const mismatched = resolveBattleSubject({
      state: session.state,
      subject: firstAct.subject,
      fills: [
        firstObjectFill,
        firstContactFill,
        firstDamageFill,
        savingThrowOutcomeFill(firstSave, [
          { targetId: spellTargetId, succeeded: false },
        ]),
        objectDropResolutionFill(secondDrop, [
          {
            targetId: spellTargetId,
            capability: { kind: "cannotDrop" },
            result: { kind: "notDropped" },
          },
        ]),
      ],
    });
    expect(mismatched).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Object drop resolution must use the selected spell object drop hole.",
    });
    expect(firstDrop.holeId).not.toBe(secondDrop.holeId);
  });

  test("self-contact concentration break prevents a failed cannot-drop Heat Metal penalty", () => {
    const session = spellBattle({
      preparedSpells: [spellRecord(heatMetalUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      session,
      spellId: heatMetalUnitId,
      slotLevel: 2,
    });
    const objectFill = spellManufacturedMetalObjectTargetFill({
      hole: requireHole(act.initialHoles, "objectTargetChoice"),
      objectId: battleObjectId("object-contact-lifecycle-boundary-self"),
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
      targetIds: [spellCasterId],
      holdingOrWearing: new Map([[spellCasterId, "wearing"]]),
    });
    const damageHole = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [objectFill, contactFill],
      }),
      "rolledDice",
    );
    const damageFill = damageRollFillWithGroups(damageHole, [[4, 5]]);
    const concentrationHole = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [objectFill, contactFill, damageFill],
      }),
      "concentrationSavingThrow",
    );
    const needsObjectSave = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        objectFill,
        contactFill,
        damageFill,
        concentrationSavingThrowFill(concentrationHole, false),
      ],
    });
    const objectSave = requireResultHole(needsObjectSave, "savingThrowOutcome");
    const dropHole = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [
          objectFill,
          contactFill,
          damageFill,
          concentrationSavingThrowFill(concentrationHole, false),
          savingThrowOutcomeFill(objectSave, [
            { targetId: spellCasterId, succeeded: false },
          ]),
        ],
      }),
      "objectDropResolution",
    );
    const resolved = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        objectFill,
        contactFill,
        damageFill,
        concentrationSavingThrowFill(concentrationHole, false),
        savingThrowOutcomeFill(objectSave, [
          { targetId: spellCasterId, succeeded: false },
        ]),
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
    if (resolved.tag !== "resolved") return;
    const caster = requireCombatant(resolved.state, spellCasterId);
    expect(caster.concentration).toBeNull();
    expect(caster.activeEffects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "spellObjectContactDamage" }),
        expect.objectContaining({
          kind: "selfAttackRollAndAbilityCheckRollMode",
        }),
      ]),
    );
  });
});
