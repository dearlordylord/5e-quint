// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.druid-wild-shape-known-form
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.WILD_SHAPE_FORM_LIFECYCLE
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DRUID-WILD-SHAPE-D20-STAT-PROJECTION druid_wild_shape
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DRUID-WILD-SHAPE-BEAST-SPELLS-CASTING druid_wild_shape
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DRUID-WILD-SHAPE-STAT-BLOCK-MULTI-DAMAGE druid_wild_shape
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DRUID-WILD-SHAPE-STAT-BLOCK-TRAIT-ADVANTAGE druid_wild_shape
import {
  armorClassDelta,
  defaultArmorClassState,
  type ArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import { abilityModifier, attackBonus, ClassLevel } from "@dnd/shared/types";
import type { SpellRecord, StatBlockRecord } from "@dnd/surface/surface/types";
import { Schema } from "effect";
import * as Either from "effect/Either";
import { expect, test } from "vitest";

import {
  activeDruidWildShapeForm,
  activeDruidWildShapeEffect,
  battleAvailableDruidWildShapeKnownForms,
  battleShapeShiftedRuntimeState,
  BattleFillSchema,
  combatantAbilityCheckModifier,
  combatantD20AbilityScore,
  combatantHasActiveDruidWildShape,
  combatantIsShapeShifted,
  combatantSavingThrowModifier,
  combatantSkillModifier,
  parseSupportedUnitFeatureProfile,
  revertShapeShiftedCombatantToTrueForm,
  startBattle,
  validateWildShapeEquipmentDispositionFill,
  wildShapeLoadoutObjectRefs,
  wildShapeFormActionSurfaceInventory,
  type BattleFill,
  type BattleCreatureState,
  type BattleHole,
  type BattleState,
  type BattleSubject,
  type CharacterBattleD20Statistics,
  type CharacterBattleCreatureState,
  type WildShapeEquipmentDispositionChoice,
  type WildShapeLoadoutObjectRef,
} from "./index.ts";
import {
  battleId,
  battleObjectId,
  characterSeed,
  combatantId,
  discoverBattleActs,
  damageRollFill,
  goblinId,
  attackInitialTargetHole,
  attackRollFill,
  attackTargetFill,
  findHole,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  snapshotBattle,
  spellRecord,
  startBattleRight,
  statBlockCatalog,
  statBlockCreatureInit,
  targetFill,
  unitLibrary,
  wizardSpellcasting,
} from "./battle-runtime-test-support.ts";
import { DRUID_BEAST_SPELLS_CLASS_LEVEL } from "./unit-feature-support.ts";

const druidId = combatantId("wild-shape-druid");
const ratId = "stat_block_rat";
const ridingHorseId = "stat_block_riding_horse";
const lizardId = "stat_block_lizard";
const catId = "stat_block_cat";
const wolfId = "stat_block_wolf";
const spiderId = "stat_block_spider";
const syntheticCoordinatedShapeId = "synthetic_coordinated_shape";
const packAllyId = combatantId("wild-shape-pack-ally");
const incapacitatedPackAllyId = combatantId(
  "wild-shape-incapacitated-pack-ally",
);

test("assumes, reuses, and dismisses a known Beast Wild Shape form", () => {
  const initial = druidWildShapeBattle();
  const assumeRidingHorse = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });

  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(initial, assumeRidingHorse),
  );
  const activeDruid = requireCharacter(assumed.state, druidId);
  const activeForm = activeDruidWildShapeForm(activeDruid);
  expect(activeForm?.id).toBe(ridingHorseId);
  expect(Number(activeDruid.tempHp)).toBe(2);
  expect(druidWildShapeUsesRemaining(activeDruid)).toBe(1);
  expect(assumed.state.currentTurnResources.currentHasBonusAction).toBe(false);

  const activeSnapshot = snapshotCreature(assumed.snapshot, druidId);
  expect(activeSnapshot.size).toBe("large");
  expect(Number(activeSnapshot.armorClass)).toBe(11);
  expect(Number(activeSnapshot.movement.speedFeet)).toBe(60);

  const activeActs = discoverBattleActs(assumed.state);
  expect(
    activeActs.some(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "attack" &&
        act.subject.attackName === "Hooves",
    ),
  ).toBe(true);
  expect(
    activeActs.some(
      (act) =>
        act.subject.tag === "actionSpell" ||
        (act.subject.tag === "action" &&
          act.subject.action === "attack" &&
          act.subject.attackName === "Longsword"),
    ),
  ).toBe(false);

  const nextTurn = restoreBonusAction(assumed.state);
  const assumeCat = wildShapeSubject(nextTurn, {
    action: "assumeForm",
    formStatBlockId: catId,
  });
  const reused = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(nextTurn, assumeCat),
  );
  const reusedDruid = requireCharacter(reused.state, druidId);
  expect(activeDruidWildShapeForm(reusedDruid)?.id).toBe(catId);
  expect(
    discoverBattleActs(reused.state).some(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "attack" &&
        act.subject.attackName === "Scratch",
    ),
  ).toBe(true);
  expect(
    reusedDruid.activeEffects.filter(
      (effect) => effect.kind === "druidWildShapeForm",
    ),
  ).toHaveLength(1);
  expect(druidWildShapeUsesRemaining(reusedDruid)).toBe(0);

  const dismissTurn = restoreBonusAction(reused.state);
  const dismiss = wildShapeSubject(dismissTurn, { action: "dismiss" });
  const dismissed = requireResolved(
    resolveDruidWildShape(dismissTurn, dismiss),
  );
  const dismissedDruid = requireCharacter(dismissed.state, druidId);
  expect(combatantHasActiveDruidWildShape(dismissedDruid)).toBe(false);
  expect(druidWildShapeUsesRemaining(dismissedDruid)).toBe(0);

  const dismissedSnapshot = snapshotCreature(dismissed.snapshot, druidId);
  expect(dismissedSnapshot.size).toBe("medium");
  expect(Number(dismissedSnapshot.movement.speedFeet)).toBe(30);
});

test("derives Wild Shape equipment disposition candidates from selected loadout object refs", () => {
  const selectedLoadout = wildShapeSelectedLoadout();
  expect(wildShapeLoadoutObjectRefs(selectedLoadout)).toEqual([
    {
      kind: "armor",
      objectId: "armor:equipment_leather",
      unitId: "equipment_leather",
    },
    {
      kind: "shield",
      objectId: "shield:equipment_shield",
      unitId: "equipment_shield",
    },
    {
      kind: "mainWeapon",
      objectId: "main:weapon_quarterstaff",
      unitId: "weapon_quarterstaff",
    },
    {
      kind: "offHandWeapon",
      objectId: "offhand:weapon_dagger",
      unitId: "weapon_dagger",
    },
  ]);
  expect(wildShapeLoadoutObjectRefs({})).toEqual([]);
});

test("decodes Wild Shape worn equipment disposition fills for selected loadout objects", () => {
  const decodeFill = Schema.decodeUnknownEither(BattleFillSchema);
  expect(
    Either.isRight(
      decodeFill({
        kind: "wildShapeEquipmentDisposition",
        holeId: "wild-shape-equipment-hole",
        value: {
          formLimbs: { kind: "canHandleObjects" },
          choices: [
            {
              item: {
                kind: "shield",
                objectId: "shield:equipment_shield",
                unitId: "equipment_shield",
              },
              disposition: "worn",
              practicality: { kind: "practicalToWear" },
            },
          ],
        },
      }),
    ),
  ).toBe(true);
  expect(
    Either.isRight(
      decodeFill({
        kind: "wildShapeEquipmentDisposition",
        holeId: "wild-shape-equipment-hole",
        value: {
          formLimbs: { kind: "cannotHandleObjects" },
          choices: [
            {
              item: {
                kind: "mainWeapon",
                objectId: "main:weapon_quarterstaff",
                unitId: "weapon_quarterstaff",
              },
              disposition: "merges",
            },
          ],
        },
      }),
    ),
  ).toBe(true);

  for (const wornWeaponKind of ["mainWeapon", "offHandWeapon"] as const) {
    expect(
      Either.isRight(
        decodeFill({
          kind: "wildShapeEquipmentDisposition",
          holeId: "wild-shape-equipment-hole",
          value: {
            formLimbs: { kind: "canHandleObjects" },
            choices: [
              {
                item: {
                  kind: wornWeaponKind,
                  objectId:
                    wornWeaponKind === "mainWeapon"
                      ? "main:weapon_quarterstaff"
                      : "offhand:weapon_dagger",
                  unitId:
                    wornWeaponKind === "mainWeapon"
                      ? "weapon_quarterstaff"
                      : "weapon_dagger",
                },
                disposition: "worn",
                practicality: { kind: "practicalToWear" },
              },
            ],
          },
        }),
      ),
    ).toBe(true);
  }
});

test("requires and validates Wild Shape equipment disposition fills for selected loadout equipment", () => {
  const initial = druidWildShapeBattle({
    armorClass: shieldArmorClassState({ rightHandUse: "mainWeapon" }),
    selectedLoadout: wildShapeBattleSelectedLoadout(),
  });
  const subject = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });

  const needsDisposition = resolveDruidWildShape(initial, subject);
  if (needsDisposition.tag !== "needsHoles") {
    throw new Error("Expected Wild Shape equipment disposition hole.");
  }
  const dispositionHole = requireWildShapeEquipmentDispositionHole(
    needsDisposition.holes,
  );
  expect(dispositionHole.candidates.map((candidate) => candidate.kind)).toEqual(
    ["armor", "shield", "mainWeapon"],
  );
  expect(druidWildShapeUsesRemaining(requireCharacter(initial, druidId))).toBe(
    2,
  );

  const resolved = requireResolved(
    resolveDruidWildShape(initial, subject, [
      wildShapeDispositionFill(
        dispositionHole,
        dispositionHole.candidates.map((item) => ({
          item,
          disposition: "merges" as const,
        })),
      ),
    ]),
  );
  const activeDruid = requireCharacter(resolved.state, druidId);
  const effect = activeDruidWildShapeEffect(activeDruid);
  expect(effect?.equipmentDisposition).toEqual(
    dispositionHole.candidates.map((item) => ({ item, disposition: "merges" })),
  );
  expect(effect?.formLimbs).toEqual({ kind: "canHandleObjects" });
  expect(druidWildShapeUsesRemaining(activeDruid)).toBe(1);
  expect(Number(snapshotCreature(resolved.snapshot, druidId).armorClass)).toBe(
    11,
  );

  const activeActs = discoverBattleActs(resolved.state);
  expect(
    activeActs.some(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "attack" &&
        act.subject.attackName === "Quarterstaff",
    ),
  ).toBe(false);
});

test("rejects Wild Shape equipment disposition fills from a different form hole", () => {
  const initial = druidWildShapeBattle({
    selectedLoadout: wildShapeBattleSelectedLoadout(),
  });
  const ridingHorseSubject = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });
  const catSubject = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: catId,
  });

  const ridingHorseNeedsDisposition = resolveDruidWildShape(
    initial,
    ridingHorseSubject,
  );
  const catNeedsDisposition = resolveDruidWildShape(initial, catSubject);
  if (
    ridingHorseNeedsDisposition.tag !== "needsHoles" ||
    catNeedsDisposition.tag !== "needsHoles"
  ) {
    throw new Error("Expected Wild Shape equipment disposition holes.");
  }
  const ridingHorseHole = requireWildShapeEquipmentDispositionHole(
    ridingHorseNeedsDisposition.holes,
  );
  const catHole = requireWildShapeEquipmentDispositionHole(
    catNeedsDisposition.holes,
  );

  expect(catHole.holeId).not.toBe(ridingHorseHole.holeId);
  expect(
    resolveDruidWildShape(initial, catSubject, [
      wildShapeDispositionFill(
        ridingHorseHole,
        ridingHorseHole.candidates.map((item) => ({
          item,
          disposition: "merges" as const,
        })),
      ),
    ]),
  ).toMatchObject({
    tag: "invalid",
    reason: "invalidFill",
    message:
      "Druid Wild Shape equipment disposition fill must match the equipment disposition hole.",
  });
});

test("projects practical worn Wild Shape equipment into the effective loadout", () => {
  const initial = druidWildShapeBattle({
    armorClass: shieldArmorClassState({ rightHandUse: "mainWeapon" }),
    selectedLoadout: {
      shield: {
        itemId: "shield:equipment_shield",
        unitId: "equipment_shield",
      },
      weapon: {
        itemId: "main:weapon_quarterstaff",
        unitId: "weapon_quarterstaff",
        grip: "one_handed",
      },
    },
  });
  const subject = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });
  const needsDisposition = resolveDruidWildShape(initial, subject);
  if (needsDisposition.tag !== "needsHoles") {
    throw new Error("Expected Wild Shape equipment disposition hole.");
  }
  const dispositionHole = requireWildShapeEquipmentDispositionHole(
    needsDisposition.holes,
  );
  const shield = dispositionHole.candidates.find(
    (candidate) => candidate.kind === "shield",
  );
  const mainWeapon = dispositionHole.candidates.find(
    (candidate) => candidate.kind === "mainWeapon",
  );
  if (shield === undefined || mainWeapon === undefined) {
    throw new Error("Expected shield and main weapon disposition candidates.");
  }

  const resolved = requireResolved(
    resolveDruidWildShape(initial, subject, [
      wildShapeDispositionFill(dispositionHole, [
        {
          item: shield,
          disposition: "worn",
          practicality: { kind: "practicalToWear" },
        },
        {
          item: mainWeapon,
          disposition: "merges",
        },
      ]),
    ]),
  );
  const activeDruid = requireCharacter(resolved.state, druidId);
  const effect = activeDruidWildShapeEffect(activeDruid);
  expect(effect?.equipmentDisposition).toEqual([
    { item: shield, disposition: "worn" },
    { item: mainWeapon, disposition: "merges" },
  ]);
  expect(Number(snapshotCreature(resolved.snapshot, druidId).armorClass)).toBe(
    13,
  );
  expect(
    discoverBattleActs(resolved.state).some(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "attack" &&
        act.subject.attackName === "Quarterstaff",
    ),
  ).toBe(false);
});

test("uses a practical worn Wild Shape weapon when form limbs can handle objects", () => {
  const initial = druidWildShapeBattle({
    attack: weakTrueFormLongswordAttack(),
    selectedLoadout: {
      weapon: {
        itemId: "main:weapon_longsword",
        unitId: "weapon_longsword",
        grip: "one_handed",
      },
    },
  });
  const subject = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });
  const needsDisposition = resolveDruidWildShape(initial, subject);
  if (needsDisposition.tag !== "needsHoles") {
    throw new Error("Expected Wild Shape equipment disposition hole.");
  }
  const dispositionHole = requireWildShapeEquipmentDispositionHole(
    needsDisposition.holes,
  );
  const mainWeapon = dispositionHole.candidates.find(
    (candidate) => candidate.kind === "mainWeapon",
  );
  if (mainWeapon === undefined) {
    throw new Error("Expected main weapon disposition candidate.");
  }

  const resolved = requireResolved(
    resolveDruidWildShape(initial, subject, [
      wildShapeDispositionFill(dispositionHole, [
        {
          item: mainWeapon,
          disposition: "worn",
          practicality: { kind: "practicalToWear" },
        },
      ]),
    ]),
  );
  const activeDruid = requireCharacter(resolved.state, druidId);
  expect(activeDruidWildShapeEffect(activeDruid)?.equipmentDisposition).toEqual(
    [{ item: mainWeapon, disposition: "worn" }],
  );

  const activeActs = discoverBattleActs(resolved.state);
  expect(
    activeActs.some(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "attack" &&
        act.subject.attackName === "Hooves",
    ),
  ).toBe(true);
  expect(
    activeActs.some(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "attack" &&
        act.subject.attackName === "Longsword",
    ),
  ).toBe(true);

  const longswordAct = activeActs.find(
    (act) =>
      act.subject.tag === "action" &&
      act.subject.action === "attack" &&
      act.subject.attackName === "Longsword",
  );
  if (longswordAct?.subject.tag !== "action") {
    throw new Error("Expected Longsword attack act.");
  }
  const target = findHole(longswordAct.initialHoles, "targetChoice");
  const targetChoice = attackTargetFill(target, druidId, goblinId, "Longsword");
  const needsAttackRoll = resolveBattleSubject({
    state: resolved.state,
    subject: longswordAct.subject,
    fills: [targetChoice],
  });
  if (needsAttackRoll.tag !== "needsHoles") {
    throw new Error("Expected Longsword attack roll hole.");
  }
  const attackRoll = findHole(needsAttackRoll.holes, "attackRoll");
  if (attackRoll.kind !== "attackRoll") {
    throw new Error("Expected Longsword attack roll hole.");
  }
  if (!("attack" in attackRoll)) {
    throw new Error("Expected weapon attack roll hole.");
  }
  expect(Number(attackRoll.attackBonus)).toBe(5);
  expect(attackRoll.attack).toMatchObject({
    kind: "weapon",
    ability: "str",
    abilityModifier: 3,
    attackBonus: 5,
    damageAbilityModifier: 3,
  });

  const needsDamage = resolveBattleSubject({
    state: resolved.state,
    subject: longswordAct.subject,
    fills: [
      targetChoice,
      attackRollFill(attackRoll, { total: 15, naturalD20: 10 }),
    ],
  });
  if (needsDamage.tag !== "needsHoles") {
    throw new Error("Expected Longsword damage hole.");
  }
  const damage = findHole(needsDamage.holes, "rolledDice");
  if (damage.kind !== "rolledDice") {
    throw new Error("Expected Longsword damage hole.");
  }
  expect(damage.label).toBe("Longsword damage (1d8+3-slashing)");
});

test("keeps worn Wild Shape off-hand weapons in the Light-property Bonus Action lane with form statistics", () => {
  const initial = druidWildShapeBattle({
    attack: weakTrueFormShortswordAttack(),
    offHandAttack: weakTrueFormDaggerAttack(),
    selectedLoadout: {
      weapon: {
        itemId: "main:weapon_shortsword",
        unitId: "weapon_shortsword",
        grip: "one_handed",
      },
      offHandWeapon: {
        itemId: "offhand:weapon_dagger",
        unitId: "weapon_dagger",
      },
    },
  });
  const subject = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });
  const needsDisposition = resolveDruidWildShape(initial, subject);
  if (needsDisposition.tag !== "needsHoles") {
    throw new Error("Expected Wild Shape equipment disposition hole.");
  }
  const dispositionHole = requireWildShapeEquipmentDispositionHole(
    needsDisposition.holes,
  );
  const mainWeapon = dispositionHole.candidates.find(
    (candidate) => candidate.kind === "mainWeapon",
  );
  const offHandWeapon = dispositionHole.candidates.find(
    (candidate) => candidate.kind === "offHandWeapon",
  );
  if (mainWeapon === undefined || offHandWeapon === undefined) {
    throw new Error(
      "Expected main and off-hand weapon disposition candidates.",
    );
  }

  const resolved = requireResolved(
    resolveDruidWildShape(initial, subject, [
      wildShapeDispositionFill(dispositionHole, [
        {
          item: mainWeapon,
          disposition: "worn",
          practicality: { kind: "practicalToWear" },
        },
        {
          item: offHandWeapon,
          disposition: "worn",
          practicality: { kind: "practicalToWear" },
        },
      ]),
    ]),
  );
  const battleReadyState = restoreBonusAction(resolved.state);

  const activeActs = discoverBattleActs(battleReadyState);
  expect(
    activeActs.some(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "attack" &&
        act.subject.attackName === "Shortsword",
    ),
  ).toBe(true);
  expect(
    activeActs.some(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "attack" &&
        act.subject.attackName === "Dagger",
    ),
  ).toBe(false);
  expect(
    activeActs.some(
      (act) =>
        act.subject.tag === "bonusAction" &&
        act.subject.action === "offHandAttack" &&
        act.subject.attackName === "Dagger",
    ),
  ).toBe(false);

  const shortswordAct = activeActs.find(
    (act) =>
      act.subject.tag === "action" &&
      act.subject.action === "attack" &&
      act.subject.attackName === "Shortsword",
  );
  if (shortswordAct?.subject.tag !== "action") {
    throw new Error("Expected Shortsword attack act.");
  }
  const shortswordTarget = findHole(shortswordAct.initialHoles, "targetChoice");
  const shortswordTargetChoice = attackTargetFill(
    shortswordTarget,
    druidId,
    goblinId,
    "Shortsword",
  );
  const needsShortswordAttackRoll = resolveBattleSubject({
    state: battleReadyState,
    subject: shortswordAct.subject,
    fills: [shortswordTargetChoice],
  });
  if (needsShortswordAttackRoll.tag !== "needsHoles") {
    throw new Error("Expected Shortsword attack roll hole.");
  }
  const shortswordAttackRoll = findHole(
    needsShortswordAttackRoll.holes,
    "attackRoll",
  );
  const afterQualifyingAttack = requireResolved(
    resolveBattleSubject({
      state: battleReadyState,
      subject: shortswordAct.subject,
      fills: [
        shortswordTargetChoice,
        attackRollFill(shortswordAttackRoll, { total: 1, naturalD20: 1 }),
      ],
    }),
  ).state;

  const afterLightActs = discoverBattleActs(afterQualifyingAttack);
  expect(
    afterLightActs.some(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "attack" &&
        act.subject.attackName === "Dagger",
    ),
  ).toBe(false);
  const daggerAct = afterLightActs.find(
    (act) =>
      act.subject.tag === "bonusAction" &&
      act.subject.action === "offHandAttack" &&
      act.subject.attackName === "Dagger",
  );
  if (daggerAct?.subject.tag !== "bonusAction") {
    throw new Error("Expected Dagger off-hand Bonus Action act.");
  }
  const daggerTarget = findHole(daggerAct.initialHoles, "targetChoice");
  const daggerTargetChoice = attackTargetFill(
    daggerTarget,
    druidId,
    goblinId,
    "Dagger",
  );
  const needsDaggerAttackRoll = resolveBattleSubject({
    state: afterQualifyingAttack,
    subject: daggerAct.subject,
    fills: [daggerTargetChoice],
  });
  if (needsDaggerAttackRoll.tag !== "needsHoles") {
    throw new Error("Expected Dagger attack roll hole.");
  }
  const daggerAttackRoll = findHole(needsDaggerAttackRoll.holes, "attackRoll");
  if (daggerAttackRoll.kind !== "attackRoll") {
    throw new Error("Expected Dagger attack roll hole.");
  }
  if (!("attack" in daggerAttackRoll)) {
    throw new Error("Expected weapon attack roll hole.");
  }
  expect(Number(daggerAttackRoll.attackBonus)).toBe(5);
  expect(daggerAttackRoll.attack).toMatchObject({
    kind: "weapon",
    ability: "str",
    abilityModifier: 3,
    attackBonus: 5,
    damageAbilityModifier: 0,
  });

  const needsDamage = resolveBattleSubject({
    state: afterQualifyingAttack,
    subject: daggerAct.subject,
    fills: [
      daggerTargetChoice,
      attackRollFill(daggerAttackRoll, { total: 15, naturalD20: 10 }),
    ],
  });
  if (needsDamage.tag !== "needsHoles") {
    throw new Error("Expected Dagger damage hole.");
  }
  const damage = findHole(needsDamage.holes, "rolledDice");
  if (damage.kind !== "rolledDice") {
    throw new Error("Expected Dagger damage hole.");
  }
  expect(damage.label).toBe("Dagger damage (1d4-piercing)");
  expect(
    resolveBattleSubject({
      state: afterQualifyingAttack,
      subject: daggerAct.subject,
      fills: [
        daggerTargetChoice,
        attackRollFill(daggerAttackRoll, { total: 15, naturalD20: 10 }),
        damageRollFill(damage, 4),
      ],
    }),
  ).toMatchObject({ tag: "resolved" });
});

test("blocks worn Wild Shape weapon use when form limbs cannot handle objects", () => {
  const initial = druidWildShapeBattle({
    selectedLoadout: {
      weapon: {
        itemId: "main:weapon_longsword",
        unitId: "weapon_longsword",
        grip: "one_handed",
      },
    },
  });
  const subject = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });
  const needsDisposition = resolveDruidWildShape(initial, subject);
  if (needsDisposition.tag !== "needsHoles") {
    throw new Error("Expected Wild Shape equipment disposition hole.");
  }
  const dispositionHole = requireWildShapeEquipmentDispositionHole(
    needsDisposition.holes,
  );
  const mainWeapon = dispositionHole.candidates.find(
    (candidate) => candidate.kind === "mainWeapon",
  );
  if (mainWeapon === undefined) {
    throw new Error("Expected main weapon disposition candidate.");
  }

  const resolved = requireResolved(
    resolveDruidWildShape(initial, subject, [
      wildShapeDispositionFill(
        dispositionHole,
        [
          {
            item: mainWeapon,
            disposition: "worn",
            practicality: { kind: "practicalToWear" },
          },
        ],
        { kind: "cannotHandleObjects" },
      ),
    ]),
  );

  expect(
    discoverBattleActs(resolved.state).some(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "attack" &&
        act.subject.attackName === "Longsword",
    ),
  ).toBe(false);
});

test("projects practical worn Wild Shape armor into the effective loadout", () => {
  const initial = druidWildShapeBattle({
    armorClass: heavyArmorClassState(),
    selectedLoadout: {
      armor: {
        itemId: "armor:equipment_chain_mail",
        unitId: "equipment_chain_mail",
      },
    },
  });
  const subject = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });
  const needsDisposition = resolveDruidWildShape(initial, subject);
  if (needsDisposition.tag !== "needsHoles") {
    throw new Error("Expected Wild Shape equipment disposition hole.");
  }
  const dispositionHole = requireWildShapeEquipmentDispositionHole(
    needsDisposition.holes,
  );
  const armor = dispositionHole.candidates.find(
    (candidate) => candidate.kind === "armor",
  );
  if (armor === undefined) {
    throw new Error("Expected armor disposition candidate.");
  }

  const resolved = requireResolved(
    resolveDruidWildShape(initial, subject, [
      wildShapeDispositionFill(dispositionHole, [
        {
          item: armor,
          disposition: "worn",
          practicality: { kind: "practicalToWear" },
        },
      ]),
    ]),
  );
  const activeDruid = requireCharacter(resolved.state, druidId);
  const effect = activeDruidWildShapeEffect(activeDruid);
  expect(effect?.equipmentDisposition).toEqual([
    { item: armor, disposition: "worn" },
  ]);
  expect(Number(snapshotCreature(resolved.snapshot, druidId).armorClass)).toBe(
    16,
  );
});

test("returns Wild Shape fallen equipment at the explicit object boundary", () => {
  const initial = druidWildShapeBattle({
    selectedLoadout: {
      shield: {
        itemId: "shield:equipment_shield",
        unitId: "equipment_shield",
      },
    },
  });
  const subject = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });
  const needsDisposition = resolveDruidWildShape(initial, subject);
  if (needsDisposition.tag !== "needsHoles") {
    throw new Error("Expected Wild Shape equipment disposition hole.");
  }
  const dispositionHole = requireWildShapeEquipmentDispositionHole(
    needsDisposition.holes,
  );
  const shield = dispositionHole.candidates[0];
  if (shield === undefined) {
    throw new Error("Expected shield disposition candidate.");
  }

  const resolved = requireResolved(
    resolveDruidWildShape(initial, subject, [
      wildShapeDispositionFill(dispositionHole, [
        {
          item: shield,
          disposition: "falls",
        },
      ]),
    ]),
  );
  const activeDruid = requireCharacter(resolved.state, druidId);
  const effect = activeDruidWildShapeEffect(activeDruid);
  expect(effect?.equipmentDisposition).toEqual([]);
  expect(resolved.droppedObjects).toEqual([
    {
      kind: "objectDropped",
      actorId: druidId,
      objectId: shield.objectId,
      source: {
        kind: "druidWildShape",
        sourceUnitId: subject.unitId,
        formStatBlockId: ridingHorseId,
      },
    },
  ]);
  expect(Number(snapshotCreature(resolved.snapshot, druidId).armorClass)).toBe(
    11,
  );
});

test("rejects invalid Wild Shape equipment disposition choices and converts impossible worn choices to RAW fallback", () => {
  const candidates = wildShapeLoadoutObjectRefs({
    armor: {
      itemId: "armor:equipment_leather",
      unitId: "equipment_leather",
    },
    shield: {
      itemId: "shield:equipment_shield",
      unitId: "equipment_shield",
    },
  });
  const armor = candidates.find(isWildShapeArmorLoadoutObjectRef);
  const shield = candidates.find(isWildShapeShieldLoadoutObjectRef);
  if (armor === undefined || shield === undefined) {
    throw new Error("Expected armor and shield candidates.");
  }

  expect(
    validateWildShapeEquipmentDispositionFill({
      candidates,
      value: {
        formLimbs: { kind: "canHandleObjects" },
        choices: [{ item: armor, disposition: "merges" }],
      },
    }),
  ).toMatchObject({ tag: "invalid" });

  expect(
    validateWildShapeEquipmentDispositionFill({
      candidates,
      value: {
        formLimbs: { kind: "canHandleObjects" },
        choices: [
          { item: armor, disposition: "falls" },
          { item: armor, disposition: "merges" },
        ],
      },
    }),
  ).toMatchObject({ tag: "invalid" });

  const unknown = {
    kind: "mainWeapon",
    objectId: battleObjectId("main:weapon_synthetic"),
    unitId: "weapon_synthetic",
  } as const satisfies WildShapeLoadoutObjectRef;
  expect(
    validateWildShapeEquipmentDispositionFill({
      candidates,
      value: {
        formLimbs: { kind: "canHandleObjects" },
        choices: [
          { item: armor, disposition: "merges" },
          { item: unknown, disposition: "falls" },
        ],
      },
    }),
  ).toMatchObject({ tag: "invalid" });

  expect(
    validateWildShapeEquipmentDispositionFill({
      candidates,
      value: {
        formLimbs: { kind: "canHandleObjects" },
        choices: [
          {
            item: armor,
            disposition: "worn",
            practicality: {
              kind: "notPracticalToWear",
              fallback: "merges",
            },
          },
          {
            item: shield,
            disposition: "worn",
            practicality: {
              kind: "notPracticalToWear",
              fallback: "falls",
            },
          },
        ],
      },
    }),
  ).toEqual({
    tag: "valid",
    dispositions: [
      { item: armor, disposition: "merges" },
      { item: shield, disposition: "falls" },
    ],
  });

  expect(
    validateWildShapeEquipmentDispositionFill({
      candidates,
      value: {
        formLimbs: { kind: "cannotHandleObjects" },
        choices: [
          {
            item: armor,
            disposition: "worn",
            practicality: {
              kind: "notPracticalToWear",
              fallback: "merges",
            },
          },
          { item: shield, disposition: "merges" },
        ],
      },
    }),
  ).toEqual({
    tag: "valid",
    dispositions: [
      { item: armor, disposition: "merges" },
      { item: shield, disposition: "merges" },
    ],
  });

  expect(
    validateWildShapeEquipmentDispositionFill({
      candidates: [shield],
      value: {
        formLimbs: { kind: "canHandleObjects" },
        choices: [
          {
            item: shield,
            disposition: "worn",
            practicality: { kind: "practicalToWear" },
          },
        ],
      },
    }),
  ).toEqual({
    tag: "valid",
    dispositions: [{ item: shield, disposition: "worn" }],
  });

  const [mainWeapon] = wildShapeLoadoutObjectRefs({
    weapon: {
      itemId: "main:weapon_quarterstaff",
      unitId: "weapon_quarterstaff",
      grip: "one_handed",
    },
  });
  if (mainWeapon === undefined) {
    throw new Error("Expected main weapon candidate.");
  }
  const practicalWornMainWeapon = {
    item: mainWeapon,
    disposition: "worn",
    practicality: { kind: "practicalToWear" },
  } as unknown as WildShapeEquipmentDispositionChoice;
  expect(
    validateWildShapeEquipmentDispositionFill({
      candidates: [mainWeapon],
      value: {
        formLimbs: { kind: "canHandleObjects" },
        choices: [practicalWornMainWeapon],
      },
    }),
  ).toEqual({
    tag: "valid",
    dispositions: [{ item: mainWeapon, disposition: "worn" }],
  });
});

test("uses Beast Strength for Shove while in Wild Shape", () => {
  const initial = druidWildShapeBattle();
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: ridingHorseId,
      }),
    ),
  );
  const subject: BattleSubject = {
    tag: "action",
    actorId: druidId,
    action: "shove",
  };
  const target = requireHole(
    resolveBattleSubject({ state: assumed.state, subject, fills: [] }),
    "targetChoice",
  );
  const outcome = requireHole(
    resolveBattleSubject({
      state: assumed.state,
      subject,
      fills: [
        targetFill(target, goblinId, [
          {
            kind: "shoveTargetWithinReach",
            shoverId: druidId,
            targetId: goblinId,
          },
        ]),
      ],
    }),
    "shoveOutcome",
  );
  if (outcome.kind !== "shoveOutcome") {
    throw new Error("Expected Shove outcome.");
  }

  expect(outcome.dc).toBe(13);
});

test("projects Beast physical and retained character mental Ability Scores", () => {
  const initial = druidWildShapeBattle({
    d20Statistics: {
      abilityScores: {
        str: 8,
        dex: 8,
        con: 8,
        int: 16,
        wis: 14,
        cha: 12,
      },
      savingThrowProficiencies: [],
      skillProficiencies: [],
      skillExpertise: [],
    },
  });
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: ridingHorseId,
      }),
    ),
  );
  const druid = requireCharacter(assumed.state, druidId);

  expect(combatantD20AbilityScore(druid, "str")).toBe(16);
  expect(combatantD20AbilityScore(druid, "dex")).toBe(13);
  expect(combatantD20AbilityScore(druid, "con")).toBe(12);
  expect(combatantD20AbilityScore(druid, "int")).toBe(16);
  expect(combatantD20AbilityScore(druid, "wis")).toBe(14);
  expect(combatantD20AbilityScore(druid, "cha")).toBe(12);
});

test("projects retained and Beast Skill modifiers while in Wild Shape", () => {
  const ridingHorseWithSkills: StatBlockRecord = {
    ...statBlockCatalog.requireStatBlock(ridingHorseId),
    statBlock: {
      ...statBlockCatalog.requireStatBlock(ridingHorseId).statBlock,
      skillModifiers: [
        { modifier: 5, skill: "perception" },
        { modifier: 4, skill: "stealth" },
      ],
    },
  };
  const initial = druidWildShapeBattle({
    knownForms: druidWildShapeKnownFormsReplacingRidingHorse(
      ridingHorseWithSkills,
    ),
    d20Statistics: {
      abilityScores: {
        str: 8,
        dex: 10,
        con: 10,
        int: 16,
        wis: 14,
        cha: 10,
      },
      savingThrowProficiencies: [],
      skillProficiencies: ["nature", "stealth"],
      skillExpertise: ["stealth"],
    },
  });
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: ridingHorseId,
      }),
    ),
  );
  const druid = requireCharacter(assumed.state, druidId);

  expect(
    combatantAbilityCheckModifier(druid, { ability: "int", skill: "nature" }),
  ).toBe(5);
  expect(combatantSkillModifier(druid, "stealth")).toBe(5);
  expect(combatantSkillModifier(druid, "perception")).toBe(5);
});

test("projects retained and higher Beast Saving Throw modifiers while in Wild Shape", () => {
  const ridingHorseWithSavingThrows: StatBlockRecord = {
    ...statBlockCatalog.requireStatBlock(ridingHorseId),
    statBlock: {
      ...statBlockCatalog.requireStatBlock(ridingHorseId).statBlock,
      savingThrowModifiers: [
        { ability: "dex", modifier: 6 },
        { ability: "wis", modifier: 1 },
      ],
    },
  };
  const initial = druidWildShapeBattle({
    knownForms: druidWildShapeKnownFormsReplacingRidingHorse(
      ridingHorseWithSavingThrows,
    ),
    d20Statistics: {
      abilityScores: {
        str: 8,
        dex: 10,
        con: 10,
        int: 10,
        wis: 14,
        cha: 12,
      },
      savingThrowProficiencies: ["dex", "wis"],
      skillProficiencies: [],
      skillExpertise: [],
    },
  });
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: ridingHorseId,
      }),
    ),
  );
  const druid = requireCharacter(assumed.state, druidId);

  expect(combatantSavingThrowModifier(druid, "dex")).toBe(6);
  expect(combatantSavingThrowModifier(druid, "wis")).toBe(4);
  expect(combatantSavingThrowModifier(druid, "cha")).toBe(1);
});

test("offers one assume-form act for each known Beast form", () => {
  const initial = druidWildShapeBattle();
  const acts = discoverBattleActs(initial);
  expect(
    acts.filter(
      (act) =>
        act.subject.tag === "druidWildShape" &&
        act.subject.action === "assumeForm",
    ),
  ).toHaveLength(4);
});

test("offers no assume-form acts when no Wild Shape forms are battle-available", () => {
  const initial = druidWildShapeBattle({ knownForms: [] });
  const acts = discoverBattleActs(initial);
  expect(
    acts.filter(
      (act) =>
        act.subject.tag === "druidWildShape" &&
        act.subject.action === "assumeForm",
    ),
  ).toEqual([]);
});

test("rejects omitted Wild Shape available-form subset for a direct battle init", () => {
  const result = startBattle({
    battleId: battleId("battle-druid-wild-shape-omitted-forms"),
    combatants: [
      characterSeed({
        combatantId: druidId,
        displayName: "Druid",
        initiative: 20,
        classLevels: [{ className: "druid", level: 2 }],
        resources: [{ unit: unitLibrary.requireUnit("druid_wild_shape") }],
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });

  expect(Either.isLeft(result)).toBe(true);
  if (Either.isLeft(result)) {
    expect(result.left.message).toBe(
      "Druid Wild Shape battle initialization requires an available known-form subset.",
    );
  }
});

test("rejects ineligible known Beast forms before battle initialization", () => {
  const profile = parseSupportedUnitFeatureProfile(
    unitLibrary.requireUnit("druid_wild_shape"),
    [{ className: "druid", level: ClassLevel.make(2) }],
  );
  if (profile?.kind !== "druidWildShapeKnownForm") {
    throw new Error("Expected Druid Wild Shape support profile.");
  }
  const result = battleAvailableDruidWildShapeKnownForms({
    profile,
    forms: [
      statBlockCatalog.requireStatBlock(ratId),
      statBlockCatalog.requireStatBlock(ridingHorseId),
      statBlockCatalog.requireStatBlock(catId),
      statBlockCatalog.requireStatBlock("stat_block_skeleton"),
    ],
  });

  expect(Either.isLeft(result)).toBe(true);
  if (Either.isLeft(result)) {
    expect(result.left.message).toBe(
      "Druid Wild Shape battle forms require eligible Beast Stat Blocks.",
    );
  }
});

test("rejects duplicate supplied Wild Shape form records before battle initialization", () => {
  const profile = parseSupportedUnitFeatureProfile(
    unitLibrary.requireUnit("druid_wild_shape"),
    [{ className: "druid", level: ClassLevel.make(2) }],
  );
  if (profile?.kind !== "druidWildShapeKnownForm") {
    throw new Error("Expected Druid Wild Shape support profile.");
  }
  const result = battleAvailableDruidWildShapeKnownForms({
    profile,
    forms: [
      statBlockCatalog.requireStatBlock(ratId),
      statBlockCatalog.requireStatBlock(ratId),
    ],
  });

  expect(Either.isLeft(result)).toBe(true);
  if (Either.isLeft(result)) {
    expect(result.left.message).toBe(
      "Druid Wild Shape battle initialization requires distinct available known forms.",
    );
  }
});

test("rejects known Beast forms without promoted movement facts", () => {
  const profile = parseSupportedUnitFeatureProfile(
    unitLibrary.requireUnit("druid_wild_shape"),
    [{ className: "druid", level: ClassLevel.make(2) }],
  );
  if (profile?.kind !== "druidWildShapeKnownForm") {
    throw new Error("Expected Druid Wild Shape support profile.");
  }
  const ridingHorse = statBlockCatalog.requireStatBlock(ridingHorseId);
  const noWalkSpeedForm = {
    ...ridingHorse,
    statBlock: {
      ...ridingHorse.statBlock,
      speeds: [
        {
          kind: "swim" as const,
          feet: { kind: "literal" as const, value: 30 },
        },
      ] as const,
    },
  };
  const result = battleAvailableDruidWildShapeKnownForms({
    profile,
    forms: [
      statBlockCatalog.requireStatBlock(ratId),
      noWalkSpeedForm,
      statBlockCatalog.requireStatBlock(lizardId),
      statBlockCatalog.requireStatBlock(catId),
    ],
  });

  expect(Either.isLeft(result)).toBe(true);
  if (Either.isLeft(result)) {
    expect(result.left.message).toBe(
      "Druid Wild Shape battle forms require literal Walk Speed.",
    );
  }
});

test("admits selected Beast forms with multi-component attack damage and filters unsupported riders", () => {
  const profile = parseSupportedUnitFeatureProfile(
    unitLibrary.requireUnit("druid_wild_shape"),
    [{ className: "druid", level: ClassLevel.make(2) }],
  );
  if (profile?.kind !== "druidWildShapeKnownForm") {
    throw new Error("Expected Druid Wild Shape support profile.");
  }
  const result = battleAvailableDruidWildShapeKnownForms({
    profile,
    forms: [
      statBlockCatalog.requireStatBlock(ratId),
      statBlockCatalog.requireStatBlock(ridingHorseId),
      statBlockCatalog.requireStatBlock(spiderId),
      statBlockCatalog.requireStatBlock(wolfId),
    ],
  });

  expect(Either.isRight(result)).toBe(true);
  if (Either.isRight(result)) {
    expect(result.right.map((form) => form.id)).toEqual([
      ratId,
      ridingHorseId,
      spiderId,
    ]);
  }
});

test("filters untyped trait-derived attack-roll advantage from battle-available forms", () => {
  const profile = parseSupportedUnitFeatureProfile(
    unitLibrary.requireUnit("druid_wild_shape"),
    [{ className: "druid", level: ClassLevel.make(2) }],
  );
  if (profile?.kind !== "druidWildShapeKnownForm") {
    throw new Error("Expected Druid Wild Shape support profile.");
  }
  const baseForm = statBlockCatalog.requireStatBlock(ridingHorseId);
  const traitAdvantageForm = {
    ...baseForm,
    id: "synthetic_untyped_coordinated_shape",
    statBlock: {
      ...baseForm.statBlock,
      traits: [
        {
          name: "Coordinated Strike",
          description:
            "The form has Advantage on attack rolls against a creature if an ally is next to the creature.",
        },
      ],
    },
  } satisfies StatBlockRecord;

  const result = battleAvailableDruidWildShapeKnownForms({
    profile,
    forms: [baseForm, traitAdvantageForm],
  });

  expect(Either.isRight(result)).toBe(true);
  if (Either.isRight(result)) {
    expect(result.right.map((form) => form.id)).toEqual([ridingHorseId]);
  }
});

test("admits typed trait-derived attack-roll advantage from battle-available forms", () => {
  const profile = parseSupportedUnitFeatureProfile(
    unitLibrary.requireUnit("druid_wild_shape"),
    [{ className: "druid", level: ClassLevel.make(2) }],
  );
  if (profile?.kind !== "druidWildShapeKnownForm") {
    throw new Error("Expected Druid Wild Shape support profile.");
  }
  const baseForm = statBlockCatalog.requireStatBlock(ridingHorseId);
  const traitAdvantageForm = syntheticCoordinatedShape();

  const result = battleAvailableDruidWildShapeKnownForms({
    profile,
    forms: [baseForm, traitAdvantageForm],
  });

  expect(Either.isRight(result)).toBe(true);
  if (Either.isRight(result)) {
    expect(result.right.map((form) => form.id)).toEqual([
      ridingHorseId,
      syntheticCoordinatedShapeId,
    ]);
  }
});

test("threads typed trait-derived attack-roll advantage through caller spatial witnesses", () => {
  const form = syntheticCoordinatedShape();
  const initial = druidWildShapeBattle({
    knownForms: druidWildShapeKnownFormsReplacingRidingHorse(form),
    extraCombatants: [
      characterSeed({
        combatantId: packAllyId,
        displayName: "Pack Ally",
        initiative: 5,
        attack: null,
      }),
      characterSeed({
        combatantId: incapacitatedPackAllyId,
        displayName: "Incapacitated Pack Ally",
        initiative: 4,
        attack: null,
        conditions: ["incapacitated"],
      }),
    ],
  });
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: syntheticCoordinatedShapeId,
      }),
    ),
  );
  const subject = statBlockAttackSubject(assumed.state, "Hooves");
  const targetHole = attackInitialTargetHole(assumed.state, subject);
  const rollWithoutWitness = requireHole(
    resolveBattleSubject({
      state: assumed.state,
      subject,
      fills: [
        attackTargetFill(targetHole, druidId, goblinId, subject.attackName),
      ],
    }),
    "attackRoll",
  );
  expect(rollWithoutWitness).not.toMatchObject({ rollMode: "advantage" });

  const rollWithIncapacitatedWitness = requireHole(
    resolveBattleSubject({
      state: assumed.state,
      subject,
      fills: [
        attackTargetFill(targetHole, druidId, goblinId, subject.attackName, [
          {
            kind: "attackerAllyWithin5FeetOfTarget",
            attackerId: druidId,
            targetId: goblinId,
            allyId: incapacitatedPackAllyId,
          },
        ]),
      ],
    }),
    "attackRoll",
  );
  expect(rollWithIncapacitatedWitness).not.toMatchObject({
    rollMode: "advantage",
  });

  const rollWithWitness = requireHole(
    resolveBattleSubject({
      state: assumed.state,
      subject,
      fills: [
        attackTargetFill(targetHole, druidId, goblinId, subject.attackName, [
          {
            kind: "attackerAllyWithin5FeetOfTarget",
            attackerId: druidId,
            targetId: goblinId,
            allyId: packAllyId,
          },
        ]),
      ],
    }),
    "attackRoll",
  );
  expect(rollWithWitness).toMatchObject({ rollMode: "advantage" });
});

test("classifies eligible Wild Shape Beast action surfaces without making ids the category owner", () => {
  const profile = parseSupportedUnitFeatureProfile(
    unitLibrary.requireUnit("druid_wild_shape"),
    [{ className: "druid", level: ClassLevel.make(2) }],
  );
  if (profile?.kind !== "druidWildShapeKnownForm") {
    throw new Error("Expected Druid Wild Shape support profile.");
  }
  const inventory = wildShapeFormActionSurfaceInventory({
    forms: [
      ...statBlockCatalog.listStatBlocks(),
      statBlockCatalog.requireStatBlock("stat_block_skeleton"),
    ],
    profile,
  });

  expect(inventory).toEqual(
    expect.arrayContaining([
      {
        category: "simpleLiteralAttackSingleDamage",
        exampleStatBlockIds: expect.arrayContaining([ratId, ridingHorseId]),
      },
      {
        category: "multiDamageComponentsOnHit",
        exampleStatBlockIds: expect.arrayContaining([spiderId]),
      },
      {
        category: "attackHitRider",
        exampleStatBlockIds: expect.arrayContaining([wolfId]),
      },
      {
        category: "traitDerivedConditionalAttackRollAdvantage",
        exampleStatBlockIds: expect.arrayContaining([wolfId]),
      },
      {
        category: "tableOrProseOnlyTrait",
        exampleStatBlockIds: expect.arrayContaining([ratId]),
      },
    ]),
  );
});

test("projects automatic reversion when Wild Shape ends from Incapacitated", () => {
  const initial = druidWildShapeBattle();
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: ridingHorseId,
      }),
    ),
  );
  const activeDruid = requireCharacter(assumed.state, druidId);
  const incapacitatedDruid: BattleCreatureState = {
    ...activeDruid,
    conditions: applyCondition(activeDruid.conditions, "incapacitated"),
    positiveHpUnconscious: null,
  };
  const state: BattleState = {
    ...assumed.state,
    combatants: new Map(assumed.state.combatants).set(
      druidId,
      incapacitatedDruid,
    ),
  };

  expect(combatantHasActiveDruidWildShape(incapacitatedDruid)).toBe(false);
  const snapshot = snapshotCreature(snapshotBattle(state), druidId);
  expect(snapshot.size).toBe("medium");
  expect(Number(snapshot.movement.speedFeet)).toBe(30);
});

test("shared shape-shift owner projects and reverts active Wild Shape", () => {
  const initial = druidWildShapeBattle();
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: ridingHorseId,
      }),
    ),
  );
  const shapeShiftedDruid = requireCharacter(assumed.state, druidId);
  expect(combatantIsShapeShifted(shapeShiftedDruid)).toBe(true);
  expect(battleShapeShiftedRuntimeState(shapeShiftedDruid)).toMatchObject({
    kind: "shapeShifted",
    trueForm: { kind: "combatantBaseState" },
    source: { kind: "classFeature" },
    replacementForm: { kind: "runtimeCreatureForm", creatureSize: "large" },
    reversionOwner: { kind: "druidWildShapeActiveEffect" },
  });

  const result = revertShapeShiftedCombatantToTrueForm({
    state: assumed.state,
    combatantId: druidId,
  });
  expect(result.tag).toBe("reverted");
  const revertedState = result.state;

  const revertedDruid = requireCharacter(revertedState, druidId);
  expect(combatantIsShapeShifted(revertedDruid)).toBe(false);
  expect(activeDruidWildShapeForm(revertedDruid)).toBe(null);
  const snapshot = snapshotCreature(snapshotBattle(revertedState), druidId);
  expect(snapshot.size).toBe("medium");
  expect(Number(snapshot.movement.speedFeet)).toBe(30);
});

test("shape-shift reversion reports a missing combatant distinctly", () => {
  const initial = druidWildShapeBattle();
  const missingId = combatantId("missing-shape-shift-combatant");
  const result = revertShapeShiftedCombatantToTrueForm({
    state: initial,
    combatantId: missingId,
  });

  expect(result).toMatchObject({
    tag: "missingCombatant",
    combatantId: missingId,
  });
});

test("Wild Shape blocks spell invocation before Beast Spells", () => {
  const initial = druidWildShapeBattle({
    druidLevel: DRUID_BEAST_SPELLS_CLASS_LEVEL - 1,
    preparedSpells: [spellRecord("cure_wounds")],
  });
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: catId,
      }),
    ),
  );

  expect(hasActionSpell(assumed.state, "cure_wounds")).toBe(false);
});

test("Beast Spells admits no-Material spell invocation while Wild Shape is active", () => {
  const initial = druidWildShapeBattle({
    druidLevel: DRUID_BEAST_SPELLS_CLASS_LEVEL,
    preparedSpells: [spellRecord("cure_wounds")],
  });
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: catId,
      }),
    ),
  );

  expect(hasActionSpell(assumed.state, "cure_wounds")).toBe(true);
});

test("Beast Spells admits focus-replaceable Material spell invocation while Wild Shape is active", () => {
  const initial = druidWildShapeBattle({
    druidLevel: DRUID_BEAST_SPELLS_CLASS_LEVEL,
    preparedSpells: [spellRecord("animal_friendship")],
    targetStatBlock: statBlockCatalog.requireStatBlock(catId),
  });
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: catId,
      }),
    ),
  );

  expect(hasActionSpell(assumed.state, "animal_friendship")).toBe(true);
});

test("Beast Spells rejects priced or consumed Material spells while Wild Shape is active", () => {
  const initial = druidWildShapeBattle({
    druidLevel: DRUID_BEAST_SPELLS_CLASS_LEVEL,
    preparedSpells: [
      spellRecord("cure_wounds"),
      spellRecord("continual_flame"),
    ],
    spellSlots: [{ spellLevel: 2, count: 2 }],
  });
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: catId,
      }),
    ),
  );

  expect(hasActionSpell(assumed.state, "cure_wounds")).toBe(true);
  expect(hasActionSpell(assumed.state, "continual_flame")).toBe(false);
});

test("rounds odd-level duration down through the general division rule", () => {
  const initial = druidWildShapeBattle({ druidLevel: 3 });
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: ridingHorseId,
      }),
    ),
  );
  const effect = activeDruidWildShapeEffect(
    requireCharacter(assumed.state, druidId),
  );
  expect(Number(effect?.expiresAt.durationTicks)).toBe(600);
});

function druidWildShapeBattle(input?: {
  readonly druidLevel?: number;
  readonly armorClass?: ArmorClassState;
  readonly attack?: CharacterBattleCreatureState["origin"]["attack"];
  readonly offHandAttack?: CharacterBattleCreatureState["origin"]["offHandAttack"];
  readonly d20Statistics?: CharacterBattleD20Statistics;
  readonly knownForms?: readonly StatBlockRecord[];
  readonly preparedSpells?: readonly SpellRecord[];
  readonly selectedLoadout?: CharacterBattleCreatureState["origin"]["selectedLoadout"];
  readonly spellSlots?: readonly {
    readonly spellLevel: 1 | 2 | 3 | 4 | 5;
    readonly count: number;
  }[];
  readonly extraCombatants?: readonly ReturnType<typeof characterSeed>[];
  readonly targetStatBlock?: StatBlockRecord;
}): BattleState {
  return startBattleRight({
    battleId: battleId("battle-druid-wild-shape"),
    combatants: [
      druidWildShapeCreatureInit(input),
      statBlockCreatureInit({
        initiative: 10,
        ...(input?.targetStatBlock === undefined
          ? {}
          : { statBlock: input.targetStatBlock }),
      }),
      ...(input?.extraCombatants ?? []),
    ],
  });
}

function druidWildShapeCreatureInit(input?: {
  readonly druidLevel?: number;
  readonly armorClass?: ArmorClassState;
  readonly attack?: CharacterBattleCreatureState["origin"]["attack"];
  readonly offHandAttack?: CharacterBattleCreatureState["origin"]["offHandAttack"];
  readonly d20Statistics?: CharacterBattleD20Statistics;
  readonly knownForms?: readonly StatBlockRecord[];
  readonly preparedSpells?: readonly SpellRecord[];
  readonly selectedLoadout?: CharacterBattleCreatureState["origin"]["selectedLoadout"];
  readonly spellSlots?: readonly {
    readonly spellLevel: 1 | 2 | 3 | 4 | 5;
    readonly count: number;
  }[];
}) {
  return characterSeed({
    combatantId: druidId,
    displayName: "Druid",
    initiative: 20,
    classLevels: [{ className: "druid", level: input?.druidLevel ?? 2 }],
    resources: [{ unit: unitLibrary.requireUnit("druid_wild_shape") }],
    ...(input?.d20Statistics === undefined
      ? {}
      : { d20Statistics: input.d20Statistics }),
    ...(input?.armorClass === undefined
      ? {}
      : { armorClass: input.armorClass }),
    ...(input?.attack === undefined ? {} : { attack: input.attack }),
    ...(input?.offHandAttack === undefined
      ? {}
      : { offHandAttack: input.offHandAttack }),
    druidWildShapeAvailableForms:
      input?.knownForms ?? druidWildShapeKnownFormsWith(catId),
    selectedLoadout: input?.selectedLoadout ?? {},
    spellcasting: {
      ...wizardSpellcasting({
        cantrips: [spellRecord("produce_flame")],
        preparedSpells: input?.preparedSpells ?? [spellRecord("cure_wounds")],
        ...(input?.spellSlots === undefined
          ? {}
          : { spellSlots: input.spellSlots }),
      }),
      sourceClassName: "druid",
    },
  });
}

function hasActionSpell(state: BattleState, spellId: string): boolean {
  return discoverBattleActs(state).some(
    (act) =>
      act.subject.tag === "actionSpell" &&
      act.subject.invocation.spellId === spellId,
  );
}

function weakTrueFormLongswordAttack(): NonNullable<
  CharacterBattleCreatureState["origin"]["attack"]
> {
  return weakTrueFormWeaponAttack("weapon_longsword");
}

function weakTrueFormShortswordAttack(): NonNullable<
  CharacterBattleCreatureState["origin"]["attack"]
> {
  return weakTrueFormWeaponAttack("weapon_shortsword");
}

function weakTrueFormDaggerAttack(): NonNullable<
  CharacterBattleCreatureState["origin"]["offHandAttack"]
> {
  return weakTrueFormWeaponAttack("weapon_dagger");
}

function weakTrueFormWeaponAttack(
  unitId: "weapon_longsword" | "weapon_shortsword" | "weapon_dagger",
): NonNullable<CharacterBattleCreatureState["origin"]["attack"]> {
  const weapon = unitLibrary.requireUnit(unitId);
  if (weapon.kind !== "weapon") {
    throw new Error("Expected weapon Unit.");
  }
  return {
    kind: "weapon",
    weapon,
    ability: "str",
    abilityModifier: abilityModifier(-1),
    attackBonus: attackBonus(1),
    damageAbilityModifier: abilityModifier(-1),
  };
}

function druidWildShapeKnownFormsWith(
  fourthFormId: string,
  fourthForm: StatBlockRecord = statBlockCatalog.requireStatBlock(fourthFormId),
): readonly StatBlockRecord[] {
  return [
    statBlockCatalog.requireStatBlock(ratId),
    statBlockCatalog.requireStatBlock(ridingHorseId),
    statBlockCatalog.requireStatBlock(lizardId),
    fourthForm,
  ];
}

function druidWildShapeKnownFormsReplacingRidingHorse(
  ridingHorse: StatBlockRecord,
): readonly StatBlockRecord[] {
  return [
    statBlockCatalog.requireStatBlock(ratId),
    ridingHorse,
    statBlockCatalog.requireStatBlock(lizardId),
    statBlockCatalog.requireStatBlock(catId),
  ];
}

function syntheticCoordinatedShape(): StatBlockRecord {
  const baseForm = statBlockCatalog.requireStatBlock(ridingHorseId);
  return {
    ...baseForm,
    id: syntheticCoordinatedShapeId,
    name: "Synthetic Coordinated Shape",
    statBlock: {
      ...baseForm.statBlock,
      displayName: "Synthetic Coordinated Shape",
      traits: [
        {
          name: "Coordinated Strike",
          description:
            "The form has Advantage on attack rolls against a creature if a non-incapacitated ally is within 5 feet of the creature.",
          effect: {
            kind: "attack_roll_advantage_when_non_incapacitated_ally_within_5_feet_of_target",
          },
        },
      ],
    },
  } satisfies StatBlockRecord;
}

function statBlockAttackSubject(
  state: BattleState,
  attackName: string,
): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  const subject = discoverBattleActs(state).find(
    (act) =>
      act.subject.tag === "action" &&
      act.subject.action === "attack" &&
      act.subject.actorId === druidId &&
      act.subject.attackName === attackName,
  )?.subject;
  if (
    subject?.tag !== "action" ||
    subject.action !== "attack" ||
    subject.actorId !== druidId
  ) {
    throw new Error("Expected Wild Shape Stat Block attack subject.");
  }
  return subject;
}

function wildShapeSubject(
  state: BattleState,
  input:
    | {
        readonly action: "assumeForm";
        readonly formStatBlockId: string;
      }
    | { readonly action: "dismiss" },
): Extract<BattleSubject, { readonly tag: "druidWildShape" }> {
  const subject = discoverBattleActs(state).find(
    (act) =>
      act.subject.tag === "druidWildShape" &&
      act.subject.action === input.action &&
      (input.action === "dismiss" ||
        (act.subject.action === "assumeForm" &&
          act.subject.formStatBlockId === input.formStatBlockId)),
  )?.subject;
  if (subject?.tag !== "druidWildShape") {
    throw new Error("Expected Druid Wild Shape act.");
  }
  return subject;
}

function resolveDruidWildShape(
  state: BattleState,
  subject: Extract<BattleSubject, { readonly tag: "druidWildShape" }>,
  fills: readonly BattleFill[] = [],
) {
  return resolveBattleSubject({ state, subject, fills });
}

function resolveDruidWildShapeWithoutLoadoutEquipment(
  state: BattleState,
  subject: Extract<BattleSubject, { readonly tag: "druidWildShape" }>,
) {
  const needsDisposition = resolveDruidWildShape(state, subject);
  if (needsDisposition.tag !== "needsHoles") {
    throw new Error("Expected Wild Shape object handling hole.");
  }
  const hole = requireWildShapeEquipmentDispositionHole(needsDisposition.holes);
  expect(hole.candidates).toEqual([]);
  return resolveDruidWildShape(state, subject, [
    wildShapeDispositionFill(hole, []),
  ]);
}

function wildShapeSelectedLoadout(): CharacterBattleCreatureState["origin"]["selectedLoadout"] {
  return {
    armor: {
      itemId: "armor:equipment_leather",
      unitId: "equipment_leather",
    },
    shield: {
      itemId: "shield:equipment_shield",
      unitId: "equipment_shield",
    },
    weapon: {
      itemId: "main:weapon_quarterstaff",
      unitId: "weapon_quarterstaff",
      grip: "two_handed",
    },
    offHandWeapon: {
      itemId: "offhand:weapon_dagger",
      unitId: "weapon_dagger",
    },
  };
}

function wildShapeBattleSelectedLoadout(): CharacterBattleCreatureState["origin"]["selectedLoadout"] {
  return {
    armor: {
      itemId: "armor:equipment_leather",
      unitId: "equipment_leather",
    },
    shield: {
      itemId: "shield:equipment_shield",
      unitId: "equipment_shield",
    },
    weapon: {
      itemId: "main:weapon_quarterstaff",
      unitId: "weapon_quarterstaff",
      grip: "one_handed",
    },
  };
}

function shieldArmorClassState(input?: {
  readonly rightHandUse?: ArmorClassState["rightHandUse"];
}): ArmorClassState {
  return {
    ...defaultArmorClassState(),
    bonuses: [
      {
        kind: "shield",
        bonus: armorClassDelta(2),
        handUse: "shield",
        trainingRequired: "shield",
      },
    ],
    armorTraining: new Set(["shield"]),
    leftHandUse: "shield",
    rightHandUse: input?.rightHandUse ?? "free",
  };
}

function heavyArmorClassState(): ArmorClassState {
  return {
    ...defaultArmorClassState(),
    base: {
      kind: "armor",
      category: "heavy",
      formula: { kind: "heavy_fixed", ac: 16 },
    },
    armorTraining: new Set(["heavy"]),
  };
}

function isWildShapeArmorLoadoutObjectRef(
  item: WildShapeLoadoutObjectRef,
): item is Extract<WildShapeLoadoutObjectRef, { readonly kind: "armor" }> {
  return item.kind === "armor";
}

function isWildShapeShieldLoadoutObjectRef(
  item: WildShapeLoadoutObjectRef,
): item is Extract<WildShapeLoadoutObjectRef, { readonly kind: "shield" }> {
  return item.kind === "shield";
}

function requireWildShapeEquipmentDispositionHole(
  holes: readonly BattleHole[],
): Extract<BattleHole, { readonly kind: "wildShapeEquipmentDisposition" }> {
  const hole = holes.find(
    (
      candidate,
    ): candidate is Extract<
      BattleHole,
      { readonly kind: "wildShapeEquipmentDisposition" }
    > => candidate.kind === "wildShapeEquipmentDisposition",
  );
  if (hole === undefined) {
    throw new Error("Expected Wild Shape equipment disposition hole.");
  }
  return hole;
}

function wildShapeDispositionFill(
  hole: Extract<BattleHole, { readonly kind: "wildShapeEquipmentDisposition" }>,
  choices: readonly WildShapeEquipmentDispositionChoice[],
  formLimbs: Extract<
    BattleFill,
    { readonly kind: "wildShapeEquipmentDisposition" }
  >["value"]["formLimbs"] = { kind: "canHandleObjects" },
): Extract<BattleFill, { readonly kind: "wildShapeEquipmentDisposition" }> {
  return {
    kind: "wildShapeEquipmentDisposition",
    holeId: hole.holeId,
    value: {
      formLimbs,
      choices,
    },
  };
}

function requireCharacter(
  state: BattleState,
  combatantId: typeof druidId,
): CharacterBattleCreatureState {
  const combatant = state.combatants.get(combatantId);
  if (!isCharacterBattleCreatureState(combatant)) {
    throw new Error("Expected Druid character combatant.");
  }
  return combatant;
}

function isCharacterBattleCreatureState(
  combatant: BattleCreatureState | undefined,
): combatant is CharacterBattleCreatureState {
  return combatant?.origin.kind === "character";
}

function druidWildShapeUsesRemaining(
  combatant: CharacterBattleCreatureState,
): number {
  const resource = combatant.origin.resources.find(
    (candidate) => candidate.unit.id === "druid_wild_shape",
  );
  if (resource === undefined || !("usesRemaining" in resource)) {
    throw new Error("Expected Druid Wild Shape resource.");
  }
  return Number(resource.usesRemaining);
}

function restoreBonusAction(state: BattleState): BattleState {
  return {
    ...state,
    currentTurnResources: {
      ...state.currentTurnResources,
      currentHasBonusAction: true,
    },
  };
}

function snapshotCreature(
  snapshot: ReturnType<typeof snapshotBattle>,
  combatantId: typeof druidId,
) {
  const creature = snapshot.combatants.find(
    (candidate) => candidate.combatantId === combatantId,
  );
  if (creature === undefined) {
    throw new Error("Expected Druid snapshot.");
  }
  return creature;
}
