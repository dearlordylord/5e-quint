import {
  unitId as parseSharedUnitId,
  statBlockId as parseSharedStatBlockId,
} from "@dnd/shared/game-facts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.druid-wild-shape-known-form
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.WILD_SHAPE_FORM_LIFECYCLE
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DRUID-WILD-SHAPE-D20-STAT-PROJECTION druid_wild_shape
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DRUID-WILD-SHAPE-BEAST-SPELLS-CASTING druid_wild_shape
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DRUID-WILD-SHAPE-STAT-BLOCK-MULTI-DAMAGE druid_wild_shape
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DRUID-WILD-SHAPE-STAT-BLOCK-TRAIT-ADVANTAGE druid_wild_shape
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DRUID-WILD-SHAPE-STAT-BLOCK-ATTACK-HIT-RIDERS druid_wild_shape
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DRUID-WILD-SHAPE-STAT-BLOCK-SIZE-GATED-CONDITION-RIDERS druid_wild_shape
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DRUID-WILD-SHAPE-STAT-BLOCK-NON-ATTACK-ACTIONS druid_wild_shape
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import {
  armorClass,
  armorClassDelta,
  defaultArmorClassState,
  defaultUnarmoredArmorClassBase,
  type ArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import { abilityModifier, attackBonus, ClassLevel } from "@dnd/shared/types";
import type { SpellRecord, StatBlockRecord } from "@dnd/surface/surface/types";
import { Schema } from "effect";
import * as Either from "effect/Either";
import { expect, test } from "vitest";
import { resolveReplayContinuationFromState } from "./battle-execution-composition.ts";

type CharacterSeedInput = Parameters<typeof characterSeed>[0];

import {
  activeDruidWildShape,
  spendActiveDruidWildShapeProcedureResources,
} from "./battle-reducer/druid-wild-shape.ts";
import {
  attackInitialTargetHole,
  attackRollFill,
  attackTargetFill,
  battleId,
  battleObjectId,
  battleTablePositionId,
  characterSeed,
  combatantId,
  damageRollFill,
  discoverBattleActCandidates,
  discoverBattleActs,
  endTurn,
  findHole,
  goblinId,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  snapshotBattle,
  spellRecord,
  startBattleSessionRight,
  statBlockCatalog,
  statBlockCreatureInit,
  targetFill,
  testCharacterWeaponAttackForUnit,
  unitLibrary,
  wizardSpellcasting,
} from "./battle-runtime-test-support.ts";
import { admitCharacterWeaponAttackExecutionWeapon } from "./character-weapon-execution-admission.ts";
import {
  activeDruidWildShapeEffect,
  activeDruidWildShapeForm,
  applyBattleHeldWeaponPickup,
  battleStateWithGroundObjects,
  battleAvailableDruidWildShapeKnownForms,
  BattleFillSchema,
  battleShapeShiftedRuntimeState,
  combatantAbilityCheckModifier,
  combatantD20AbilityScore,
  characterEffectiveLoadout,
  combatantHasActiveDruidWildShape,
  combatantIsShapeShifted,
  combatantSavingThrowModifier,
  combatantSkillModifier,
  parseSupportedUnitFeatureProfile,
  revertShapeShiftedCombatantToTrueForm,
  startBattle,
  validateWildShapeEquipmentDispositionFill,
  wildShapeFormActionSurfaceInventory,
  wildShapeLoadoutObjectRefs,
  type BattleCreatureState,
  type BattleFill,
  type BattleHole,
  type BattleState,
  type BattleSubject,
  type CharacterBattleCreatureState,
  type CharacterBattleD20Statistics,
  type CharacterWeaponAttackActionOption,
  type WildShapeEquipmentDispositionChoice,
  type WildShapeLoadoutObjectRef,
} from "./index.ts";
import { canonicalHeldObjectIdsForActor } from "./battle-reducer/turn-end-movement.ts";
import { statBlockProcedurePresentations } from "./stat-block-presentation.ts";
import type { BattleRuntimeSession } from "./battle-runtime-context.ts";
import { DRUID_BEAST_SPELLS_CLASS_LEVEL } from "./unit-feature-support.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";

const druidId = combatantId("wild-shape-druid");
const ratId = "stat_block_rat";
const ridingHorseId = "stat_block_riding_horse";
const lizardId = "stat_block_lizard";
const catId = "stat_block_cat";
const wolfId = "stat_block_wolf";
const spiderId = "stat_block_spider";
const syntheticCoordinatedShapeId = "synthetic_coordinated_shape";
const syntheticProseProneFormId = "synthetic_prose_prone_form";
const syntheticActionSectionFormId = "synthetic_action_section_form";
const packAllyId = combatantId("wild-shape-pack-ally");
const druidGroundPositionId = battleTablePositionId(
  "wild-shape-druid-ground-position",
);
const incapacitatedPackAllyId = combatantId(
  "wild-shape-incapacitated-pack-ally",
);

test("replay rejects a Wild Shape subject bound to an unrelated procedure", () => {
  const state = druidWildShapeBattle();
  const subject = wildShapeSubject(state, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });
  const actor = requireCharacter(state, druidId);
  const unrelatedProcedureRef = actor.origin.execution.procedureBindings.find(
    (binding) => binding.procedureRef !== subject.procedureRef,
  )?.procedureRef;
  if (unrelatedProcedureRef === undefined) {
    throw new Error("Expected an unrelated Druid procedure binding.");
  }

  expect(
    resolveReplayContinuationFromState(
      state,
      {
        kind: "replay",
        subject: { ...subject, procedureRef: unrelatedProcedureRef },
        fills: [],
      },
      "attackHit",
      [],
    ),
  ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
});

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

  const activeActs = discoverBattleActCandidates(assumed.state);
  expect(
    activeActs.some((act) =>
      isAttackActForProcedure(
        act,
        wildShapeStatBlockAttackProcedureRef(assumed.state, "Hooves"),
      ),
    ),
  ).toBe(true);
  expect(
    activeActs.some(
      (act) =>
        act.subject.tag === "actionSpell" ||
        isAttackActForProcedure(
          act,
          trueFormMainAttackProcedureRef(assumed.state),
        ),
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
    discoverBattleActCandidates(reused.state).some((act) =>
      isAttackActForProcedure(
        act,
        wildShapeStatBlockAttackProcedureRef(reused.state, "Scratch"),
      ),
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

test("re-assuming a Wild Shape form preserves its committed Stat Block resources", () => {
  const baseForm = statBlockCatalog.requireStatBlock(ridingHorseId);
  const limitedFormId = "synthetic_limited_wild_shape_form";
  const baseAttack = baseForm.statBlock.actions?.attacks?.[0];
  if (baseAttack === undefined) {
    throw new Error("Expected the Riding Horse attack fixture.");
  }
  const limitedForm: StatBlockRecord = {
    ...baseForm,
    id: parseSharedStatBlockId(limitedFormId),
    name: "Synthetic Limited Wild Shape Form",
    provenance: {
      kind: "synthetic-test",
      section: "synthetic-limited-wild-shape-form",
    },
    statBlock: {
      ...baseForm.statBlock,
      displayName: "Synthetic Limited Wild Shape Form",
      actions: {
        ...baseForm.statBlock.actions,
        attacks: [
          {
            ...baseAttack,
            limitedUse: { kind: "daily", uses: 1 },
          },
        ],
      },
    },
  };
  const initial = druidWildShapeBattle({
    knownForms: druidWildShapeKnownFormsReplacingRidingHorse(limitedForm),
  });
  const assumeSubject = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: limitedFormId,
  });
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(initial, assumeSubject),
  );
  const assumedDruid = requireCharacter(assumed.state, druidId);
  const firstActive = activeDruidWildShape(assumedDruid);
  const limitedBinding =
    firstActive?.admission.execution.procedureBindings.find(
      (binding) => binding.resourcePoolRefs.length > 0,
    );
  const limitedPool = firstActive?.admission.execution.resourcePools.find(
    (pool) => pool.kind === "daily",
  );
  if (
    firstActive === null ||
    limitedBinding === undefined ||
    limitedPool === undefined
  ) {
    throw new Error("Expected the active limited-use form procedure.");
  }
  const spentDruid = spendActiveDruidWildShapeProcedureResources(
    assumedDruid,
    limitedBinding.procedureRef,
  );
  const spentActive = activeDruidWildShape(spentDruid);
  expect(
    spentActive?.admission.execution.resourcePools.find(
      (pool) => pool.resourcePoolRef === limitedPool.resourcePoolRef,
    ),
  ).toMatchObject({ usesRemaining: 0 });

  const spentState: BattleState = {
    ...assumed.state,
    combatants: new Map(assumed.state.combatants).set(druidId, spentDruid),
  };
  const reAssumeTurn = restoreBonusAction(spentState);
  const reAssumeSubject = wildShapeSubject(reAssumeTurn, {
    action: "assumeForm",
    formStatBlockId: limitedFormId,
  });
  const reAssumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(reAssumeTurn, reAssumeSubject),
  );
  const reAssumedActive = activeDruidWildShape(
    requireCharacter(reAssumed.state, druidId),
  );
  expect(reAssumedActive?.admission.execution.scopeRef).toBe(
    firstActive.admission.execution.scopeRef,
  );
  expect(
    reAssumedActive?.admission.execution.resourcePools.find(
      (pool) => pool.resourcePoolRef === limitedPool.resourcePoolRef,
    ),
  ).toMatchObject({ usesRemaining: 0 });
});

test("derives Wild Shape equipment disposition candidates from selected loadout object refs", () => {
  const selectedLoadout = wildShapeSelectedLoadout();
  expect(wildShapeLoadoutObjectRefs(selectedLoadout)).toEqual([
    {
      kind: "armor",
      objectId: "armor:equipment_leather",
    },
    {
      kind: "shield",
      objectId: "shield:equipment_shield",
    },
    {
      kind: "mainWeapon",
      objectId: "main:weapon_quarterstaff",
    },
    {
      kind: "offHandWeapon",
      objectId: "offhand:weapon_dagger",
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
  if (!("procedureRef" in subject) || subject.action !== "assumeForm") {
    throw new Error("Expected admitted Wild Shape procedure.");
  }

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

  const activeActs = discoverBattleActCandidates(resolved.state);
  expect(
    activeActs.some((act) =>
      isAttackActForProcedure(
        act,
        trueFormMainAttackProcedureRef(resolved.state),
      ),
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
        itemId: battleObjectId("shield:equipment_shield"),
        unitId: parseSharedUnitId("equipment_shield"),
      },
      weapon: {
        itemId: battleObjectId("main:weapon_quarterstaff"),
        unitId: parseSharedUnitId("weapon_quarterstaff"),
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
    discoverBattleActCandidates(resolved.state).some((act) =>
      isAttackActForProcedure(
        act,
        trueFormMainAttackProcedureRef(resolved.state),
      ),
    ),
  ).toBe(false);
});

test("uses a practical worn Wild Shape weapon when form limbs can handle objects", () => {
  const initial = druidWildShapeBattle({
    attack: weakTrueFormLongswordAttack(),
    selectedLoadout: {
      weapon: {
        itemId: battleObjectId("main:weapon_longsword"),
        unitId: parseSharedUnitId("weapon_longsword"),
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

  const activeActs = discoverBattleActCandidates(resolved.state);
  expect(
    activeActs.some((act) =>
      isAttackActForProcedure(
        act,
        wildShapeStatBlockAttackProcedureRef(resolved.state, "Hooves"),
      ),
    ),
  ).toBe(true);
  expect(
    activeActs.some((act) =>
      isAttackActForProcedure(
        act,
        trueFormMainAttackProcedureRef(resolved.state),
      ),
    ),
  ).toBe(true);

  const longswordAct = activeActs.find((act) =>
    isAttackActForProcedure(
      act,
      trueFormMainAttackProcedureRef(resolved.state),
    ),
  );
  if (longswordAct?.subject.tag !== "action") {
    throw new Error("Expected Longsword attack act.");
  }
  const target = findHole(longswordAct.initialHoles, "targetChoice");
  const targetChoice = attackTargetFill(target, druidId, goblinId);
  const needsAttackRoll = resolveBattleSubject({
    state: resolved.state,
    subject: longswordAct.subject,
    fills: [targetChoice],
  });
  if (needsAttackRoll.tag !== "needsHoles") {
    throw new Error("Expected weapon_longsword attack roll hole.");
  }
  const attackRoll = findHole(needsAttackRoll.holes, "attackRoll");
  if (attackRoll.kind !== "attackRoll") {
    throw new Error("Expected weapon_longsword attack roll hole.");
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
    throw new Error("Expected weapon_longsword damage hole.");
  }
  const damage = findHole(needsDamage.holes, "rolledDice");
  if (damage.kind !== "rolledDice") {
    throw new Error("Expected weapon_longsword damage hole.");
  }
  expect(damage.label).toBe("weapon_longsword damage (1d8+3-slashing)");
});

test("keeps worn Wild Shape off-hand weapons in the Light-property Bonus Action lane with form statistics", () => {
  const initial = druidWildShapeBattle({
    attack: weakTrueFormShortswordAttack(),
    offHandAttack: weakTrueFormDaggerAttack(),
    selectedLoadout: {
      weapon: {
        itemId: battleObjectId("main:weapon_shortsword"),
        unitId: parseSharedUnitId("weapon_shortsword"),
        grip: "one_handed",
      },
      offHandWeapon: {
        itemId: battleObjectId("offhand:weapon_dagger"),
        unitId: parseSharedUnitId("weapon_dagger"),
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

  const activeActs = discoverBattleActCandidates(battleReadyState);
  expect(
    activeActs.some((act) =>
      isAttackActForProcedure(
        act,
        trueFormMainAttackProcedureRef(battleReadyState),
      ),
    ),
  ).toBe(true);
  expect(
    activeActs.some(
      (act) =>
        isAttackActForProcedure(
          act,
          trueFormOffHandAttackProcedureRef(battleReadyState),
        ) && act.subject.tag === "action",
    ),
  ).toBe(false);
  expect(
    activeActs.some(
      (act) =>
        isAttackActForProcedure(
          act,
          trueFormOffHandAttackProcedureRef(battleReadyState),
        ) && act.subject.tag === "bonusAction",
    ),
  ).toBe(false);

  const shortswordAct = activeActs.find((act) =>
    isAttackActForProcedure(
      act,
      trueFormMainAttackProcedureRef(battleReadyState),
    ),
  );
  if (shortswordAct?.subject.tag !== "action") {
    throw new Error("Expected Shortsword attack act.");
  }
  const shortswordTarget = findHole(shortswordAct.initialHoles, "targetChoice");
  const shortswordTargetChoice = attackTargetFill(
    shortswordTarget,
    druidId,
    goblinId,
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

  const afterLightActs = discoverBattleActCandidates(afterQualifyingAttack);
  expect(
    afterLightActs.some(
      (act) =>
        isAttackActForProcedure(
          act,
          trueFormOffHandAttackProcedureRef(afterQualifyingAttack),
        ) && act.subject.tag === "action",
    ),
  ).toBe(false);
  const daggerAct = afterLightActs.find(
    (act) =>
      isAttackActForProcedure(
        act,
        trueFormOffHandAttackProcedureRef(afterQualifyingAttack),
      ) && act.subject.tag === "bonusAction",
  );
  if (daggerAct?.subject.tag !== "bonusAction") {
    throw new Error("Expected Dagger off-hand Bonus Action act.");
  }
  const daggerTarget = findHole(daggerAct.initialHoles, "targetChoice");
  const daggerTargetChoice = attackTargetFill(daggerTarget, druidId, goblinId);
  const needsDaggerAttackRoll = resolveBattleSubject({
    state: afterQualifyingAttack,
    subject: daggerAct.subject,
    fills: [daggerTargetChoice],
  });
  if (needsDaggerAttackRoll.tag !== "needsHoles") {
    throw new Error("Expected weapon_dagger attack roll hole.");
  }
  const daggerAttackRoll = findHole(needsDaggerAttackRoll.holes, "attackRoll");
  if (daggerAttackRoll.kind !== "attackRoll") {
    throw new Error("Expected weapon_dagger attack roll hole.");
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
    throw new Error("Expected weapon_dagger damage hole.");
  }
  const damage = findHole(needsDamage.holes, "rolledDice");
  if (damage.kind !== "rolledDice") {
    throw new Error("Expected weapon_dagger damage hole.");
  }
  expect(damage.label).toBe("weapon_dagger damage (1d4-piercing)");
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
        itemId: battleObjectId("main:weapon_longsword"),
        unitId: parseSharedUnitId("weapon_longsword"),
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
    discoverBattleActCandidates(resolved.state).some((act) =>
      isAttackActForProcedure(
        act,
        trueFormMainAttackProcedureRef(resolved.state),
      ),
    ),
  ).toBe(false);
});

test("projects practical worn Wild Shape armor into the effective loadout", () => {
  const initial = druidWildShapeBattle({
    armorClass: heavyArmorClassState(),
    selectedLoadout: {
      armor: {
        itemId: battleObjectId("armor:equipment_chain_mail"),
        unitId: parseSharedUnitId("equipment_chain_mail"),
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
    unarmoredArmorClassBases: {
      shielded: defaultUnarmoredArmorClassBase(),
      unshielded: {
        kind: "ability_sum",
        base: armorClass(13),
        abilityModifiers: ["dex"],
        source: "unarmored_defense",
        sourceUnitId: "synthetic_unshielded_defense",
      },
    },
    selectedLoadout: {
      shield: {
        itemId: battleObjectId("shield:equipment_shield"),
        unitId: parseSharedUnitId("equipment_shield"),
      },
    },
  });
  const subject = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });
  if (!("procedureRef" in subject) || subject.action !== "assumeForm") {
    throw new Error("Expected admitted Wild Shape procedure.");
  }
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
          fallInActorSpace: {
            kind: "actorSpace",
            positionId: druidGroundPositionId,
          },
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
        procedureRef: subject.procedureRef,
        formExecutionRef: subject.formExecutionRef,
      },
    },
  ]);
  expect(
    resolved.state.groundObjects.get(druidId)?.get(shield.objectId),
  ).toEqual({
    positionId: druidGroundPositionId,
    source: {
      kind: "druidWildShape",
      procedureRef: subject.procedureRef,
      formExecutionRef: subject.formExecutionRef,
    },
  });
  expect(Number(snapshotCreature(resolved.snapshot, druidId).armorClass)).toBe(
    11,
  );
  expect(canonicalHeldObjectIdsForActor(resolved.state, druidId)).toEqual([]);
  const otherActor = {
    ...activeDruid,
    combatantId: combatantId("wild-shape-ground-object-collision-peer"),
  };
  const collisionState = {
    ...resolved.state,
    combatants: new Map(resolved.state.combatants).set(
      otherActor.combatantId,
      otherActor,
    ),
  };
  expect(characterEffectiveLoadout(collisionState, otherActor).shield).toEqual(
    activeDruid.origin.selectedLoadout.shield,
  );
  expect(
    battleStateWithGroundObjects(resolved.state, [
      {
        actorId: druidId,
        objectId: shield.objectId,
        positionId: druidGroundPositionId,
        source: {
          kind: "druidWildShape",
          procedureRef: subject.procedureRef,
          formExecutionRef: subject.formExecutionRef,
        },
      },
    ]),
  ).toMatchObject({
    tag: "conflict",
    actorId: druidId,
    objectId: shield.objectId,
  });

  const dismissTurn = restoreBonusAction(resolved.state);
  const reverted = requireResolved(
    resolveDruidWildShape(
      dismissTurn,
      wildShapeSubject(dismissTurn, { action: "dismiss" }),
    ),
  );
  expect(Number(snapshotCreature(reverted.snapshot, druidId).armorClass)).toBe(
    13,
  );
  expect(canonicalHeldObjectIdsForActor(reverted.state, druidId)).toEqual([]);
});

test("does not turn fallen Heavy armor into worn armor through weapon pickup", () => {
  const armorObjectId = battleObjectId("armor:equipment_chain_mail");
  const initial = druidWildShapeBattle({
    armorClass: heavyArmorClassState(),
    selectedLoadout: {
      armor: {
        itemId: armorObjectId,
        unitId: parseSharedUnitId("equipment_chain_mail"),
      },
    },
  });
  const assume = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });
  const needsDisposition = resolveDruidWildShape(initial, assume);
  if (needsDisposition.tag !== "needsHoles") {
    throw new Error("Expected Wild Shape equipment disposition hole.");
  }
  const hole = requireWildShapeEquipmentDispositionHole(needsDisposition.holes);
  const armor = hole.candidates.find(isWildShapeArmorLoadoutObjectRef);
  if (armor === undefined) {
    throw new Error("Expected Heavy armor disposition candidate.");
  }
  const fallen = requireResolved(
    resolveDruidWildShape(initial, assume, [
      wildShapeDispositionFill(hole, [
        {
          item: armor,
          disposition: "falls",
          fallInActorSpace: {
            kind: "actorSpace",
            positionId: druidGroundPositionId,
          },
        },
      ]),
    ]),
  );
  const dismissTurn = restoreBonusAction(fallen.state);
  const reverted = requireResolved(
    resolveDruidWildShape(
      dismissTurn,
      wildShapeSubject(dismissTurn, { action: "dismiss" }),
    ),
  );

  const invalidWeaponPickup = applyBattleHeldWeaponPickup(reverted.state, {
    interaction: {
      actorId: druidId,
      objectId: armorObjectId,
      actorSpace: {
        kind: "actorSpace",
        positionId: druidGroundPositionId,
      },
    },
    loadoutSlot: "mainWeapon",
  });

  expect(invalidWeaponPickup).toMatchObject({
    tag: "invalid",
    reason: "selectedLoadoutMismatch",
  });
  expect(reverted.state.groundObjects.get(druidId)?.has(armorObjectId)).toBe(
    true,
  );
  expect(Number(snapshotCreature(reverted.snapshot, druidId).armorClass)).toBe(
    10,
  );
});

test("does not turn a fallen Shield into a wielded Shield through weapon pickup", () => {
  const shieldObjectId = battleObjectId("shield:equipment_shield");
  const initial = druidWildShapeBattle({
    selectedLoadout: {
      shield: {
        itemId: shieldObjectId,
        unitId: parseSharedUnitId("equipment_shield"),
      },
    },
  });
  const assume = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });
  const needsDisposition = resolveDruidWildShape(initial, assume);
  if (needsDisposition.tag !== "needsHoles") {
    throw new Error("Expected Wild Shape equipment disposition hole.");
  }
  const hole = requireWildShapeEquipmentDispositionHole(needsDisposition.holes);
  const shield = hole.candidates.find(isWildShapeShieldLoadoutObjectRef);
  if (shield === undefined) {
    throw new Error("Expected Shield disposition candidate.");
  }
  const fallen = requireResolved(
    resolveDruidWildShape(initial, assume, [
      wildShapeDispositionFill(hole, [
        {
          item: shield,
          disposition: "falls",
          fallInActorSpace: {
            kind: "actorSpace",
            positionId: druidGroundPositionId,
          },
        },
      ]),
    ]),
  );
  const dismissTurn = restoreBonusAction(fallen.state);
  const reverted = requireResolved(
    resolveDruidWildShape(
      dismissTurn,
      wildShapeSubject(dismissTurn, { action: "dismiss" }),
    ),
  );

  expect(
    applyBattleHeldWeaponPickup(reverted.state, {
      interaction: {
        actorId: druidId,
        objectId: shieldObjectId,
        actorSpace: {
          kind: "actorSpace",
          positionId: druidGroundPositionId,
        },
      },
      loadoutSlot: "mainWeapon",
    }),
  ).toMatchObject({
    tag: "invalid",
    reason: "selectedLoadoutMismatch",
  });
  expect(reverted.state.groundObjects.get(druidId)?.has(shieldObjectId)).toBe(
    true,
  );
});

test("uses the Shield-compatible unarmored base when armor falls but the Shield remains worn", () => {
  const armoredWithShield = {
    ...heavyArmorClassState(),
    bonuses: [
      {
        kind: "shield" as const,
        bonus: armorClassDelta(2),
        handUse: "shield" as const,
        trainingRequired: "shield" as const,
      },
    ],
    armorTraining: new Set(["heavy", "shield"] as const),
    leftHandUse: "shield" as const,
  };
  const shieldCompatibleBase = {
    kind: "ability_sum" as const,
    base: armorClass(13),
    abilityModifiers: ["dex"] as const,
    source: "unarmored_defense" as const,
    sourceUnitId: "synthetic_shield_compatible_unarmored_defense",
  };
  const initial = druidWildShapeBattle({
    armorClass: armoredWithShield,
    unarmoredArmorClassBases: {
      shielded: shieldCompatibleBase,
      unshielded: defaultUnarmoredArmorClassBase(),
    },
    selectedLoadout: {
      armor: {
        itemId: battleObjectId("armor:equipment_chain_mail"),
        unitId: parseSharedUnitId("equipment_chain_mail"),
      },
      shield: {
        itemId: battleObjectId("shield:equipment_shield"),
        unitId: parseSharedUnitId("equipment_shield"),
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
  const hole = requireWildShapeEquipmentDispositionHole(needsDisposition.holes);
  const armor = hole.candidates.find(isWildShapeArmorLoadoutObjectRef);
  const shield = hole.candidates.find(isWildShapeShieldLoadoutObjectRef);
  if (armor === undefined || shield === undefined) {
    throw new Error("Expected armor and Shield disposition candidates.");
  }
  const assumed = requireResolved(
    resolveDruidWildShape(initial, subject, [
      wildShapeDispositionFill(hole, [
        {
          item: armor,
          disposition: "falls",
          fallInActorSpace: {
            kind: "actorSpace",
            positionId: druidGroundPositionId,
          },
        },
        {
          item: shield,
          disposition: "worn",
          practicality: { kind: "practicalToWear" },
        },
      ]),
    ]),
  );
  const dismissTurn = restoreBonusAction(assumed.state);
  const reverted = requireResolved(
    resolveDruidWildShape(
      dismissTurn,
      wildShapeSubject(dismissTurn, { action: "dismiss" }),
    ),
  );

  expect(Number(snapshotCreature(reverted.snapshot, druidId).armorClass)).toBe(
    15,
  );
});

test("rejects invalid Wild Shape equipment disposition choices and converts impossible worn choices to RAW fallback", () => {
  const candidates = wildShapeLoadoutObjectRefs({
    armor: {
      itemId: battleObjectId("armor:equipment_leather"),
      unitId: parseSharedUnitId("equipment_leather"),
    },
    shield: {
      itemId: battleObjectId("shield:equipment_shield"),
      unitId: parseSharedUnitId("equipment_shield"),
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
          {
            item: armor,
            disposition: "falls",
            fallInActorSpace: {
              kind: "actorSpace",
              positionId: druidGroundPositionId,
            },
          },
          { item: armor, disposition: "merges" },
        ],
      },
    }),
  ).toMatchObject({ tag: "invalid" });

  const unknown = {
    kind: "mainWeapon",
    objectId: battleObjectId("main:weapon_synthetic"),
  } as const satisfies WildShapeLoadoutObjectRef;
  expect(
    validateWildShapeEquipmentDispositionFill({
      candidates,
      value: {
        formLimbs: { kind: "canHandleObjects" },
        choices: [
          { item: armor, disposition: "merges" },
          {
            item: unknown,
            disposition: "falls",
            fallInActorSpace: {
              kind: "actorSpace",
              positionId: druidGroundPositionId,
            },
          },
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
              fallback: { disposition: "merges" },
            },
          },
          {
            item: shield,
            disposition: "worn",
            practicality: {
              kind: "notPracticalToWear",
              fallback: {
                disposition: "falls",
                fallInActorSpace: {
                  kind: "actorSpace",
                  positionId: druidGroundPositionId,
                },
              },
            },
          },
        ],
      },
    }),
  ).toEqual({
    tag: "valid",
    dispositions: [
      { item: armor, disposition: "merges" },
      {
        item: shield,
        disposition: "falls",
        fallInActorSpace: {
          kind: "actorSpace",
          positionId: druidGroundPositionId,
        },
      },
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
              fallback: { disposition: "merges" },
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
      itemId: battleObjectId("main:weapon_quarterstaff"),
      unitId: parseSharedUnitId("weapon_quarterstaff"),
      grip: "one_handed",
    },
  });
  if (mainWeapon === undefined) {
    throw new Error("Expected main weapon candidate.");
  }
  // eslint-disable-next-line no-restricted-syntax -- this negative boundary test deliberately constructs a type-forbidden worn weapon
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
  const acts = discoverBattleActCandidates(initial);
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
  const acts = discoverBattleActCandidates(initial);
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
    expect(battleStateInitIssueMessage(result.left)).toBe(
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

test("admits selected Beast forms with multi-component attack damage and typed hit riders", () => {
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
      wolfId,
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
    id: parseSharedStatBlockId("synthetic_untyped_coordinated_shape"),
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
      fills: [attackTargetFill(targetHole, druidId, goblinId)],
    }),
    "attackRoll",
  );
  expect(rollWithoutWitness).not.toMatchObject({ rollMode: "advantage" });

  const rollWithIncapacitatedWitness = requireHole(
    resolveBattleSubject({
      state: assumed.state,
      subject,
      fills: [
        attackTargetFill(targetHole, druidId, goblinId, undefined, [
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
        attackTargetFill(targetHole, druidId, goblinId, undefined, [
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
      syntheticProseProneForm(),
      syntheticActionSectionForm(),
    ],
    profile,
  });

  expect(inventory).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        category: "simpleLiteralAttackSingleDamage",
        exampleStatBlockIds: expect.arrayContaining([ratId, ridingHorseId]),
      }),
      expect.objectContaining({
        category: "multiDamageComponentsOnHit",
        exampleStatBlockIds: expect.arrayContaining([spiderId]),
      }),
      expect.objectContaining({
        category: "attackHitTargetSizeConditionRider",
        exampleStatBlockIds: expect.arrayContaining([wolfId]),
      }),
      expect.objectContaining({
        category: "traitDerivedConditionalAttackRollAdvantage",
        exampleStatBlockIds: expect.arrayContaining([wolfId]),
      }),
      expect.objectContaining({
        category: "attackHitConditionRider",
        exampleStatBlockIds: expect.arrayContaining([
          syntheticProseProneFormId,
        ]),
        closedBoundary: expect.objectContaining({
          owner: expect.stringContaining("condition rider owner"),
          reason: expect.stringContaining(
            "outside the typed target Size Prone payload",
          ),
        }),
      }),
      expect.objectContaining({
        category: "tableOrProseOnlyTrait",
        exampleStatBlockIds: expect.arrayContaining([ratId]),
      }),
      expect.objectContaining({
        category: "statBlockActionMultiattack",
        exampleStatBlockIds: expect.arrayContaining([
          syntheticActionSectionFormId,
        ]),
        closedBoundary: expect.objectContaining({
          owner: expect.stringContaining("Multiattack control owner"),
          reason: expect.stringContaining("actions.multiattacks"),
        }),
      }),
      expect.objectContaining({
        category: "statBlockActionSaveGate",
        exampleStatBlockIds: expect.arrayContaining([
          syntheticActionSectionFormId,
        ]),
        closedBoundary: expect.objectContaining({
          owner: expect.stringContaining("save-gated action procedure owner"),
          reason: expect.stringContaining("actions.saves"),
        }),
      }),
      expect.objectContaining({
        category: "statBlockActionSupport",
        exampleStatBlockIds: expect.arrayContaining([
          syntheticActionSectionFormId,
        ]),
        closedBoundary: expect.objectContaining({
          owner: expect.stringContaining("support-action procedure owner"),
          reason: expect.stringContaining("actions.supports"),
        }),
      }),
      expect.objectContaining({
        category: "statBlockActionOption",
        exampleStatBlockIds: expect.arrayContaining([
          syntheticActionSectionFormId,
        ]),
        closedBoundary: expect.objectContaining({
          owner: expect.stringContaining("action-option procedure owner"),
          reason: expect.stringContaining("generic Utilize"),
        }),
      }),
      expect.objectContaining({
        category: "statBlockSpecialAction",
        exampleStatBlockIds: expect.arrayContaining([
          syntheticActionSectionFormId,
        ]),
        closedBoundary: expect.objectContaining({
          owner: expect.stringContaining("special-action payload"),
          reason: expect.stringContaining("Surface specials"),
        }),
      }),
      expect.objectContaining({
        category: "statBlockBonusActionSection",
        exampleStatBlockIds: expect.arrayContaining([
          syntheticActionSectionFormId,
        ]),
        closedBoundary: expect.objectContaining({
          owner: expect.stringContaining("Bonus Action lifecycle"),
          reason: expect.stringContaining("bonusActions"),
        }),
      }),
      expect.objectContaining({
        category: "statBlockReactionSection",
        exampleStatBlockIds: expect.arrayContaining([
          syntheticActionSectionFormId,
        ]),
        closedBoundary: expect.objectContaining({
          owner: expect.stringContaining("Reaction trigger"),
          reason: expect.stringContaining("Surface reactions"),
        }),
      }),
      expect.objectContaining({
        category: "statBlockLegendaryActionSection",
        exampleStatBlockIds: expect.arrayContaining([
          syntheticActionSectionFormId,
        ]),
        closedBoundary: expect.objectContaining({
          owner: expect.stringContaining("Legendary Action lifecycle"),
          reason: expect.stringContaining("legendaryActions"),
        }),
      }),
    ]),
  );
  const srdEligibleInventory = wildShapeFormActionSurfaceInventory({
    forms: statBlockCatalog.listStatBlocks(),
    profile,
  });
  expect(srdEligibleInventory.map((entry) => entry.category)).not.toEqual(
    expect.arrayContaining([
      "statBlockActionMultiattack",
      "statBlockActionSaveGate",
      "statBlockActionSupport",
      "statBlockActionOption",
      "statBlockSpecialAction",
      "statBlockBonusActionSection",
      "statBlockReactionSection",
      "statBlockLegendaryActionSection",
    ]),
  );
  expect(
    inventory.some(
      (entry) => entry.category === "attackHitForcedMovementRider",
    ),
  ).toBe(false);
});

function syntheticProseProneForm(): StatBlockRecord {
  const base = statBlockCatalog.requireStatBlock(ridingHorseId);
  const hooves = base.statBlock.actions?.attacks?.[0];
  if (hooves === undefined) {
    throw new Error("Expected Riding Horse Hooves fixture.");
  }
  return {
    ...base,
    id: parseSharedStatBlockId(syntheticProseProneFormId),
    name: "Synthetic Prose Prone Form",
    statBlock: {
      ...base.statBlock,
      displayName: "Synthetic Prose Prone Form",
      actions: {
        attacks: [
          {
            ...hooves,
            description:
              "If the target is a Medium or smaller creature, it has the Prone condition.",
            name: "Synthetic Bite",
          },
        ],
      },
    },
  };
}

function syntheticActionSectionForm(): StatBlockRecord {
  const base = statBlockCatalog.requireStatBlock(ridingHorseId);
  const hooves = base.statBlock.actions?.attacks?.[0];
  if (hooves === undefined) {
    throw new Error("Expected Riding Horse Hooves fixture.");
  }
  return {
    ...base,
    id: parseSharedStatBlockId(syntheticActionSectionFormId),
    name: "Synthetic Action Section Form",
    statBlock: {
      ...base.statBlock,
      displayName: "Synthetic Action Section Form",
      actions: {
        attacks: [hooves],
        multiattacks: [
          {
            name: "Synthetic Multiattack",
            dispatches: [
              { name: hooves.name, count: { kind: "literal", value: 1 } },
            ],
          },
        ],
        saves: [
          {
            name: "Synthetic Save Pulse",
            ability: "dex",
            dc: { kind: "fixed", dc: 12 },
            target: { kind: "one_creature_in_range", rangeFeet: 5 },
            onFail: {
              kind: "damage",
              damageType: "bludgeoning",
              amount: {
                kind: "fixed",
                expr: { dice: 0, dieSize: 1, flat: 1 },
              },
            },
            onSuccess: { kind: "half_damage" },
          },
        ],
        supports: [
          {
            name: "Synthetic Self Aid",
            target: "self",
            effect: {
              kind: "heal_hp",
              amount: {
                kind: "fixed",
                expr: { dice: 0, dieSize: 1, flat: 1 },
              },
              target: "self",
            },
          },
        ],
        actionOptions: [
          {
            name: "Synthetic Action Option",
            options: ["disengage", "utilize"],
          },
        ],
        specials: [
          {
            name: "Synthetic Special",
            description:
              "The form attempts a table-adjudicated special action.",
          },
        ],
      },
      bonusActions: {
        actionOptions: [
          {
            name: "Synthetic Quick Option",
            options: ["disengage", "hide"],
          },
        ],
      },
      reactions: {
        specials: [
          {
            name: "Synthetic Response",
            description: "The form responds to a table-supplied trigger.",
          },
        ],
      },
      legendaryActions: {
        uses: 1,
        actions: {
          specials: [
            {
              name: "Synthetic Legendary Move",
              description:
                "The form uses a table-adjudicated legendary action.",
            },
          ],
        },
      },
    },
  };
}

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
  const session = druidWildShapeSession({
    druidLevel: DRUID_BEAST_SPELLS_CLASS_LEVEL - 1,
    preparedSpells: [spellRecord("cure_wounds")],
  });
  const initial = session.state;
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: catId,
      }),
    ),
  );

  expect(
    hasActionSpell(
      battleRuntimeSessionForTest({
        state: assumed.state,
        context: session.context,
      }),
      "cure_wounds",
    ),
  ).toBe(false);
});

test("Beast Spells admits no-Material spell invocation while Wild Shape is active", () => {
  const session = druidWildShapeSession({
    druidLevel: DRUID_BEAST_SPELLS_CLASS_LEVEL,
    preparedSpells: [spellRecord("cure_wounds")],
  });
  const initial = session.state;
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: catId,
      }),
    ),
  );

  expect(
    hasActionSpell(
      battleRuntimeSessionForTest({
        state: assumed.state,
        context: session.context,
      }),
      "cure_wounds",
    ),
  ).toBe(true);
});

test("Beast Spells exposes Shillelagh only while its attached weapon remains usable", () => {
  const session = druidWildShapeSession({
    druidLevel: DRUID_BEAST_SPELLS_CLASS_LEVEL,
    cantrips: [spellRecord("shillelagh")],
    attack: weakTrueFormWeaponAttack("weapon_quarterstaff"),
    selectedLoadout: {
      weapon: {
        itemId: battleObjectId("main:weapon_quarterstaff"),
        unitId: parseSharedUnitId("weapon_quarterstaff"),
        grip: "one_handed",
      },
    },
  });
  const preShapeShillelagh = discoverBattleActs(session).find(
    (act) =>
      battleActSpellPresentation(act)?.invocation.spellId === "shillelagh",
  );
  if (preShapeShillelagh?.subject.tag !== "bonusActionSpell") {
    throw new Error("Expected pre-shape Shillelagh act.");
  }
  const subject = wildShapeSubject(session.state, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });
  const needsDisposition = resolveDruidWildShape(session.state, subject);
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
    throw new Error("Expected Quarterstaff disposition candidate.");
  }
  const merged = requireResolved(
    resolveDruidWildShape(session.state, subject, [
      wildShapeDispositionFill(dispositionHole, [
        { item: mainWeapon, disposition: "merges" },
      ]),
    ]),
  );
  const mergedNextTurn = nextDruidTurn(merged.state);

  expect(
    hasSpell(
      battleRuntimeSessionForTest({
        state: mergedNextTurn,
        context: session.context,
      }),
      "shillelagh",
    ),
  ).toBe(false);
  expect(
    resolveBattleSubject({
      state: mergedNextTurn,
      subject: preShapeShillelagh.subject,
      fills: [],
    }),
  ).toMatchObject({
    tag: "invalid",
    reason: "unsupportedSubject",
  });

  const worn = requireResolved(
    resolveDruidWildShape(session.state, subject, [
      wildShapeDispositionFill(dispositionHole, [
        {
          item: mainWeapon,
          disposition: "worn",
          practicality: { kind: "practicalToWear" },
        },
      ]),
    ]),
  );
  const wornNextTurn = nextDruidTurn(worn.state);
  expect(
    hasSpell(
      battleRuntimeSessionForTest({
        state: wornNextTurn,
        context: session.context,
      }),
      "shillelagh",
    ),
  ).toBe(true);
});

test("fallen Wild Shape weapons stay unavailable after reversion until picked up and held", () => {
  const session = druidWildShapeSession({
    druidLevel: DRUID_BEAST_SPELLS_CLASS_LEVEL,
    cantrips: [spellRecord("shillelagh")],
    attack: weakTrueFormWeaponAttack("weapon_quarterstaff"),
    selectedLoadout: {
      weapon: {
        itemId: battleObjectId("main:weapon_quarterstaff"),
        unitId: parseSharedUnitId("weapon_quarterstaff"),
        grip: "one_handed",
      },
    },
  });
  const shillelagh = discoverBattleActs(session).find(
    (act) =>
      battleActSpellPresentation(act)?.invocation.spellId === "shillelagh",
  );
  if (shillelagh?.subject.tag !== "bonusActionSpell") {
    throw new Error("Expected pre-shape Shillelagh act.");
  }
  const assume = wildShapeSubject(session.state, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });
  const needsDisposition = resolveDruidWildShape(session.state, assume);
  if (needsDisposition.tag !== "needsHoles") {
    throw new Error("Expected Wild Shape equipment disposition hole.");
  }
  const dispositionHole = requireWildShapeEquipmentDispositionHole(
    needsDisposition.holes,
  );
  const quarterstaff = dispositionHole.candidates.find(
    (candidate) => candidate.kind === "mainWeapon",
  );
  if (quarterstaff === undefined) {
    throw new Error("Expected Quarterstaff disposition candidate.");
  }
  const fallen = requireResolved(
    resolveDruidWildShape(session.state, assume, [
      wildShapeDispositionFill(dispositionHole, [
        {
          item: quarterstaff,
          disposition: "falls",
          fallInActorSpace: {
            kind: "actorSpace",
            positionId: druidGroundPositionId,
          },
        },
      ]),
    ]),
  );
  expect(
    applyBattleHeldWeaponPickup(fallen.state, {
      interaction: {
        actorId: druidId,
        objectId: quarterstaff.objectId,
        actorSpace: {
          kind: "actorSpace",
          positionId: druidGroundPositionId,
        },
      },
      loadoutSlot: "mainWeapon",
    }),
  ).toMatchObject({
    tag: "invalid",
    reason: "activeFormPickupUnsupported",
  });
  const dismissTurn = restoreBonusAction(fallen.state);
  const dismissed = requireResolved(
    resolveDruidWildShape(
      dismissTurn,
      wildShapeSubject(dismissTurn, { action: "dismiss" }),
    ),
  );
  const revertedSession = battleRuntimeSessionForTest({
    state: restoreBonusAction(dismissed.state),
    context: session.context,
  });

  expect(hasSpell(revertedSession, "shillelagh")).toBe(false);
  expect(
    discoverBattleActCandidates(revertedSession.state).some((act) =>
      isAttackActForProcedure(
        act,
        trueFormMainAttackProcedureRef(revertedSession.state),
      ),
    ),
  ).toBe(false);
  expect(
    resolveBattleSubject({
      state: revertedSession.state,
      subject: shillelagh.subject,
      fills: [],
    }),
  ).toMatchObject({
    tag: "invalid",
    reason: "unsupportedSubject",
  });

  const pickedUp = applyBattleHeldWeaponPickup(revertedSession.state, {
    interaction: {
      actorId: druidId,
      objectId: quarterstaff.objectId,
      actorSpace: {
        kind: "actorSpace",
        positionId: druidGroundPositionId,
      },
    },
    loadoutSlot: "mainWeapon",
  });
  if (pickedUp.tag !== "applied") {
    throw new Error(pickedUp.message);
  }
  const restoredSession = battleRuntimeSessionForTest({
    state: pickedUp.state,
    context: session.context,
  });
  expect(hasSpell(restoredSession, "shillelagh")).toBe(true);
  expect(
    discoverBattleActCandidates(restoredSession.state).some((act) =>
      isAttackActForProcedure(
        act,
        trueFormMainAttackProcedureRef(restoredSession.state),
      ),
    ),
  ).toBe(true);
});

test("Beast Spells admits focus-replaceable Material spell invocation while Wild Shape is active", () => {
  const session = druidWildShapeSession({
    druidLevel: DRUID_BEAST_SPELLS_CLASS_LEVEL,
    preparedSpells: [spellRecord("animal_friendship")],
    targetStatBlock: statBlockCatalog.requireStatBlock(catId),
  });
  const initial = session.state;
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: catId,
      }),
    ),
  );

  expect(
    hasActionSpell(
      battleRuntimeSessionForTest({
        state: assumed.state,
        context: session.context,
      }),
      "animal_friendship",
    ),
  ).toBe(true);
});

test("Beast Spells rejects priced or consumed Material spells while Wild Shape is active", () => {
  const session = druidWildShapeSession({
    druidLevel: DRUID_BEAST_SPELLS_CLASS_LEVEL,
    preparedSpells: [
      spellRecord("cure_wounds"),
      spellRecord("continual_flame"),
    ],
    spellSlots: [{ spellLevel: 2, count: 2 }],
  });
  const initial = session.state;
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: catId,
      }),
    ),
  );

  const assumedSession = battleRuntimeSessionForTest({
    state: assumed.state,
    context: session.context,
  });
  expect(hasActionSpell(assumedSession, "cure_wounds")).toBe(true);
  expect(hasActionSpell(assumedSession, "continual_flame")).toBe(false);
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
  readonly unarmoredArmorClassBases?: CharacterSeedInput["unarmoredArmorClassBases"];
  readonly attack?: CharacterSeedInput["attack"];
  readonly offHandAttack?: CharacterSeedInput["offHandAttack"];
  readonly d20Statistics?: CharacterBattleD20Statistics;
  readonly knownForms?: readonly StatBlockRecord[];
  readonly preparedSpells?: readonly SpellRecord[];
  readonly cantrips?: readonly SpellRecord[];
  readonly selectedLoadout?: CharacterBattleCreatureState["origin"]["selectedLoadout"];
  readonly spellSlots?: readonly {
    readonly spellLevel: 1 | 2 | 3 | 4 | 5;
    readonly count: number;
  }[];
  readonly extraCombatants?: readonly ReturnType<typeof characterSeed>[];
  readonly targetStatBlock?: StatBlockRecord;
}): BattleState {
  return druidWildShapeSession(input).state;
}

function druidWildShapeSession(input?: {
  readonly druidLevel?: number;
  readonly armorClass?: ArmorClassState;
  readonly unarmoredArmorClassBases?: CharacterSeedInput["unarmoredArmorClassBases"];
  readonly attack?: CharacterSeedInput["attack"];
  readonly offHandAttack?: CharacterSeedInput["offHandAttack"];
  readonly d20Statistics?: CharacterBattleD20Statistics;
  readonly knownForms?: readonly StatBlockRecord[];
  readonly preparedSpells?: readonly SpellRecord[];
  readonly cantrips?: readonly SpellRecord[];
  readonly selectedLoadout?: CharacterBattleCreatureState["origin"]["selectedLoadout"];
  readonly spellSlots?: readonly {
    readonly spellLevel: 1 | 2 | 3 | 4 | 5;
    readonly count: number;
  }[];
  readonly extraCombatants?: readonly ReturnType<typeof characterSeed>[];
  readonly targetStatBlock?: StatBlockRecord;
}): BattleRuntimeSession {
  return startBattleSessionRight({
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
  readonly unarmoredArmorClassBases?: CharacterSeedInput["unarmoredArmorClassBases"];
  readonly attack?: CharacterSeedInput["attack"];
  readonly offHandAttack?: CharacterSeedInput["offHandAttack"];
  readonly d20Statistics?: CharacterBattleD20Statistics;
  readonly knownForms?: readonly StatBlockRecord[];
  readonly preparedSpells?: readonly SpellRecord[];
  readonly cantrips?: readonly SpellRecord[];
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
    ...(input?.unarmoredArmorClassBases === undefined
      ? {}
      : { unarmoredArmorClassBases: input.unarmoredArmorClassBases }),
    attack:
      input?.attack ??
      (input?.selectedLoadout?.weapon === undefined
        ? null
        : testCharacterWeaponAttackForUnit(
            input.selectedLoadout.weapon.unitId,
          )),
    ...(input?.offHandAttack === undefined
      ? {}
      : { offHandAttack: input.offHandAttack }),
    druidWildShapeAvailableForms:
      input?.knownForms ?? druidWildShapeKnownFormsWith(catId),
    selectedLoadout: input?.selectedLoadout ?? {},
    spellcasting: {
      ...wizardSpellcasting({
        cantrips: input?.cantrips ?? [spellRecord("produce_flame")],
        preparedSpells: input?.preparedSpells ?? [spellRecord("cure_wounds")],
        ...(input?.spellSlots === undefined
          ? {}
          : { spellSlots: input.spellSlots }),
      }),
      sourceClassName: "druid",
    },
  });
}

function hasActionSpell(
  session: BattleRuntimeSession,
  spellId: string,
): boolean {
  return discoverBattleActs(session).some(
    (act) =>
      act.subject.tag === "actionSpell" &&
      battleActSpellPresentation(act)?.invocation.spellId === spellId,
  );
}

function hasSpell(session: BattleRuntimeSession, spellId: string): boolean {
  return discoverBattleActs(session).some(
    (act) => battleActSpellPresentation(act)?.invocation.spellId === spellId,
  );
}

function nextDruidTurn(state: BattleState): BattleState {
  const targetTurn = requireResolved(endTurn({ state, actorId: druidId }));
  return requireResolved(
    endTurn({ state: targetTurn.state, actorId: goblinId }),
  ).state;
}

function weakTrueFormLongswordAttack(): NonNullable<
  CharacterSeedInput["attack"]
> {
  return weakTrueFormWeaponAttack("weapon_longsword");
}

function weakTrueFormShortswordAttack(): NonNullable<
  CharacterSeedInput["attack"]
> {
  return weakTrueFormWeaponAttack("weapon_shortsword");
}

function weakTrueFormDaggerAttack(): NonNullable<
  CharacterSeedInput["offHandAttack"]
> {
  return weakTrueFormWeaponAttack("weapon_dagger");
}

function weakTrueFormWeaponAttack(
  unitId:
    | "weapon_longsword"
    | "weapon_shortsword"
    | "weapon_dagger"
    | "weapon_quarterstaff",
): CharacterWeaponAttackActionOption {
  const weapon = unitLibrary.requireUnit(unitId);
  if (weapon.kind !== "weapon") {
    throw new Error("Expected weapon Unit.");
  }
  return {
    kind: "weapon",
    ...admitCharacterWeaponAttackExecutionWeapon(
      weapon,
      battleObjectId(`main:${weapon.id}`),
      [],
    ),
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
    id: parseSharedStatBlockId(syntheticCoordinatedShapeId),
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
  const procedureRef = wildShapeStatBlockAttackProcedureRef(state, attackName);
  const subject = discoverBattleActCandidates(state).find((act) =>
    isAttackActForProcedure(act, procedureRef),
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

type AttackCandidate = ReturnType<typeof discoverBattleActCandidates>[number];
type AttackProcedureRef = Extract<
  BattleSubject,
  | { readonly tag: "action"; readonly action: "attack" }
  | { readonly tag: "bonusAction"; readonly action: "offHandAttack" }
>["procedureRef"];

function isAttackActForProcedure(
  act: AttackCandidate,
  procedureRef: AttackProcedureRef | null,
): boolean {
  return (
    procedureRef !== null &&
    ((act.subject.tag === "action" && act.subject.action === "attack") ||
      (act.subject.tag === "bonusAction" &&
        act.subject.action === "offHandAttack")) &&
    act.subject.procedureRef === procedureRef
  );
}

function wildShapeStatBlockAttackProcedureRef(
  state: BattleState,
  attackName: string,
): AttackProcedureRef | null {
  const active = activeDruidWildShape(requireCharacter(state, druidId));
  if (active === null) return null;
  return (
    statBlockProcedurePresentations(active.admission).find(
      (presentation) =>
        presentation.kind === "attack" && presentation.name === attackName,
    )?.procedureRef ?? null
  );
}

function trueFormMainAttackProcedureRef(
  state: BattleState,
): AttackProcedureRef | null {
  return requireCharacter(state, druidId).origin.attack?.procedureRef ?? null;
}

function trueFormOffHandAttackProcedureRef(
  state: BattleState,
): AttackProcedureRef | null {
  return (
    requireCharacter(state, druidId).origin.offHandAttack?.procedureRef ?? null
  );
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
  const actor = requireCharacter(state, druidId);
  const formExecutionRef =
    input.action === "assumeForm"
      ? actor.origin.druidWildShapeAvailableForms?.find(
          (admission) => admission.statBlock.id === input.formStatBlockId,
        )?.execution.scopeRef
      : undefined;
  const subject = discoverBattleActCandidates(state).find(
    (act) =>
      act.subject.tag === "druidWildShape" &&
      act.subject.action === input.action &&
      (input.action === "dismiss" ||
        (act.subject.action === "assumeForm" &&
          act.subject.formExecutionRef === formExecutionRef)),
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
      itemId: battleObjectId("armor:equipment_leather"),
      unitId: parseSharedUnitId("equipment_leather"),
    },
    shield: {
      itemId: battleObjectId("shield:equipment_shield"),
      unitId: parseSharedUnitId("equipment_shield"),
    },
    weapon: {
      itemId: battleObjectId("main:weapon_quarterstaff"),
      unitId: parseSharedUnitId("weapon_quarterstaff"),
      grip: "two_handed",
    },
    offHandWeapon: {
      itemId: battleObjectId("offhand:weapon_dagger"),
      unitId: parseSharedUnitId("weapon_dagger"),
    },
  };
}

function wildShapeBattleSelectedLoadout(): CharacterBattleCreatureState["origin"]["selectedLoadout"] {
  return {
    armor: {
      itemId: battleObjectId("armor:equipment_leather"),
      unitId: parseSharedUnitId("equipment_leather"),
    },
    shield: {
      itemId: battleObjectId("shield:equipment_shield"),
      unitId: parseSharedUnitId("equipment_shield"),
    },
    weapon: {
      itemId: battleObjectId("main:weapon_quarterstaff"),
      unitId: parseSharedUnitId("weapon_quarterstaff"),
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
  const [resource, ...additionalResources] = combatant.origin.resources;
  if (
    resource === undefined ||
    additionalResources.length > 0 ||
    !("usesRemaining" in resource)
  ) {
    throw new Error("Expected the fixture's sole Wild Shape use resource.");
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
