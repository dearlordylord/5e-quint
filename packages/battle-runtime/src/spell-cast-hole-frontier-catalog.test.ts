import {
  characterLevel,
  PositiveInteger,
  proficiencyBonusForCharacterLevel,
} from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { classSpellListForClassName } from "@dnd/surface/surface/unit-catalog";
import { describe, expect, test } from "vitest";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import {
  battleId,
  characterSeed,
  startBattleSessionRight,
  statBlockCreatureInit,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import { unitLibrary } from "./unit-profile-admission-catalog.test-support.ts";
import {
  combatantId,
  discoverBattleActs,
  resolveBattleSubject,
} from "./unit-profile-admission.test-support.ts";

const casterId = combatantId("spell-hole-frontier-caster");
const firstTargetId = combatantId("spell-hole-frontier-target-one");
const secondTargetId = combatantId("spell-hole-frontier-target-two");
const WIZARD_LEVEL = characterLevel(9);
const WIZARD_CANTRIP_CAPACITY = PositiveInteger(4);
const WIZARD_PREPARED_SPELL_CAPACITY = PositiveInteger(14);
const WIZARD_SPELL_SLOTS = [
  { spellLevel: 1, count: 4 },
  { spellLevel: 2, count: 3 },
  { spellLevel: 3, count: 3 },
  { spellLevel: 4, count: 3 },
  { spellLevel: 5, count: 1 },
] as const;

function exactCapacityLoadouts<T>(
  values: readonly T[],
  capacity: PositiveInteger,
): readonly (readonly T[])[] {
  if (values.length < capacity) {
    throw new Error(
      `Expected at least ${capacity} values for an exact-capacity loadout.`,
    );
  }
  return Array.from(
    { length: Math.ceil(values.length / capacity) },
    (_, loadoutIndex) => {
      const loadout = values.slice(
        loadoutIndex * capacity,
        (loadoutIndex + 1) * capacity,
      );
      return loadout.length === capacity
        ? loadout
        : [...loadout, ...values.slice(0, capacity - loadout.length)];
    },
  );
}

describe("spell cast hole frontier catalog", () => {
  test("each procedure and discovered hole-kind frontier across legal level 0-5 Wizard SRD loadouts returns its exact first frontier", () => {
    const wizardSpellList = classSpellListForClassName({
      unitLibrary,
      className: "wizard",
    });
    expect(wizardSpellList).toBeDefined();
    if (wizardSpellList === undefined) {
      throw new Error("Expected the SRD Wizard spell list.");
    }
    const wizardCantripIds = new Set(wizardSpellList.cantrips);
    const wizardPreparedSpellIds = new Set(
      wizardSpellList.leveled
        .filter(({ spellLevel }) => spellLevel <= 5)
        .map(({ spellId }) => spellId),
    );
    const wizardSpells = unitLibrary
      .listUnits()
      .filter((unit): unit is SpellRecord => unit.kind === "spell");
    const cantripLoadouts = exactCapacityLoadouts(
      wizardSpells.filter((spell) => wizardCantripIds.has(spell.id)),
      WIZARD_CANTRIP_CAPACITY,
    );
    const preparedSpellLoadouts = exactCapacityLoadouts(
      wizardSpells.filter((spell) => wizardPreparedSpellIds.has(spell.id)),
      WIZARD_PREPARED_SPELL_CAPACITY,
    );
    const loadoutCount = Math.max(
      cantripLoadouts.length,
      preparedSpellLoadouts.length,
    );
    const castByProcedureAndFrontier = new Map<
      string,
      {
        readonly act: ReturnType<typeof discoverBattleActs>[number];
        readonly state: ReturnType<typeof startBattleSessionRight>["state"];
      }
    >();
    for (let loadoutIndex = 0; loadoutIndex < loadoutCount; loadoutIndex += 1) {
      const session = startBattleSessionRight({
        battleId: battleId(`spell-cast-hole-frontier-catalog-${loadoutIndex}`),
        combatants: [
          characterSeed({
            combatantId: casterId,
            displayName: "Catalog caster",
            initiative: 20,
            attack: null,
            classLevels: [{ className: "wizard", level: WIZARD_LEVEL }],
            spellcasting: {
              ...wizardSpellcasting({
                cantrips:
                  cantripLoadouts[loadoutIndex % cantripLoadouts.length],
                preparedSpells:
                  preparedSpellLoadouts[
                    loadoutIndex % preparedSpellLoadouts.length
                  ],
                spellSlots: WIZARD_SPELL_SLOTS,
              }),
              proficiencyBonus: proficiencyBonusForCharacterLevel(WIZARD_LEVEL),
            },
          }),
          statBlockCreatureInit({
            combatantId: firstTargetId,
            displayName: "First catalog target",
            initiative: 10,
          }),
          statBlockCreatureInit({
            combatantId: secondTargetId,
            displayName: "Second catalog target",
            initiative: 5,
          }),
        ],
      });
      for (const act of discoverBattleActs(session)) {
        if (
          (act.subject.tag !== "actionSpell" &&
            act.subject.tag !== "bonusActionSpell") ||
          act.subject.mode.tag !== "cast" ||
          act.initialHoles.length === 0
        ) {
          continue;
        }
        const presentation = battleActSpellPresentation(act);
        if (presentation === undefined) {
          throw new Error("Expected discovered spell presentation.");
        }
        const procedure = presentation.invocation.procedure;
        const discoveredFrontierKinds = act.initialHoles
          .map((hole) => hole.kind)
          .join(", ");
        const procedureAndFrontier = `${procedure}: [${discoveredFrontierKinds}]`;
        if (!castByProcedureAndFrontier.has(procedureAndFrontier)) {
          castByProcedureAndFrontier.set(procedureAndFrontier, {
            act,
            state: session.state,
          });
        }
      }
    }

    const firstFrontiers = [...castByProcedureAndFrontier]
      .map(([discoveredFrontier, { act, state }]) => {
        const result = resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [],
        });
        expect(result, discoveredFrontier).toMatchObject({
          tag: "needsHoles",
        });
        if (result.tag !== "needsHoles") {
          throw new Error(
            `Expected ${discoveredFrontier} to return its hole frontier.`,
          );
        }
        expect(result.holes, discoveredFrontier).toEqual(
          act.initialHoles.slice(0, result.holes.length),
        );
        return `${discoveredFrontier} -> [${result.holes.map((hole) => hole.kind).join(", ")}]`;
      })
      .sort();

    expect(firstFrontiers).toMatchInlineSnapshot(`
      [
        "abilityD20TestRollModeSaveGate: [spellTargetList] -> [spellTargetList]",
        "attackBurstSaveDamage: [targetChoice] -> [targetChoice]",
        "chainedSpellAttackDamage: [damageTypeChoice] -> [damageTypeChoice]",
        "chosenDamageResistance: [targetChoice, damageTypeChoice] -> [targetChoice]",
        "creatureSizeDecrease: [targetChoice] -> [targetChoice]",
        "creatureSizeIncrease: [targetChoice] -> [targetChoice]",
        "creatureTypeProtection: [targetChoice] -> [targetChoice]",
        "dancingLightsCombinedCast: [dancingLightsPlacement] -> [dancingLightsPlacement]",
        "dancingLightsSeparateCast: [dancingLightsPlacement] -> [dancingLightsPlacement]",
        "directCondition: [spellTargetList] -> [spellTargetList]",
        "dragonsBreathInitial: [spellTargetList, damageTypeChoice] -> [spellTargetList]",
        "flamingSphere: [spellAreaChoice] -> [spellAreaChoice]",
        "fogCloudObscurement: [spellAreaChoice] -> [spellAreaChoice]",
        "greaseGroundHazard: [savingThrowOutcome] -> [savingThrowOutcome]",
        "gustOfWindLine: [savingThrowOutcome] -> [savingThrowOutcome]",
        "hastePositive: [targetChoice] -> [targetChoice]",
        "hideousLaughter: [spellTargetList] -> [spellTargetList]",
        "hypnoticPattern: [savingThrowOutcome] -> [savingThrowOutcome]",
        "jumpMovementReplacement: [spellTargetList] -> [spellTargetList]",
        "levitatedCreature: [targetChoice] -> [targetChoice]",
        "magicWeaponEnhancement: [magicWeaponTargetItem] -> [magicWeaponTargetItem]",
        "magicalDarknessPointOrigin: [spellAreaChoice] -> [spellAreaChoice]",
        "objectLight: [objectTargetChoice] -> [objectTargetChoice]",
        "ongoingSpellEnd: [ongoingSpellTargetChoice] -> [ongoingSpellTargetChoice]",
        "persistentArmorEffect: [targetChoice] -> [targetChoice]",
        "repeatedDamageAllocation: [spellTargetAllocation] -> [spellTargetAllocation]",
        "rollModifier: [spellTargetList, targetAbilityChoices] -> [spellTargetList]",
        "rollModifier: [targetChoice, abilityChoice] -> [targetChoice]",
        "saveGatedCondition: [savingThrowOutcome] -> [savingThrowOutcome]",
        "saveGatedCondition: [spellTargetList, conditionChoice] -> [spellTargetList]",
        "saveGatedCondition: [spellTargetList] -> [spellTargetList]",
        "saveGatedDamage: [savingThrowOutcome] -> [savingThrowOutcome]",
        "saveGatedDamage: [targetChoice] -> [targetChoice]",
        "scalarBuff: [rolledDice] -> [rolledDice]",
        "scalarBuff: [spellTargetList] -> [spellTargetList]",
        "scalarBuff: [targetChoice] -> [targetChoice]",
        "selfTeleport: [teleportDestination] -> [teleportDestination]",
        "selfTransformationMode: [selfTransformationModeChoice] -> [selfTransformationModeChoice]",
        "sleepTargetAdmission: [savingThrowOutcome] -> [savingThrowOutcome]",
        "sleetStormAreaHazard: [spellAreaChoice] -> [spellAreaChoice]",
        "slowActivePenalties: [savingThrowOutcome] -> [savingThrowOutcome]",
        "spellAttackDamage: [targetChoice, objectTargetChoice] -> [targetChoice, objectTargetChoice]",
        "spellAttackDamage: [targetChoice] -> [targetChoice]",
        "spellAttackSequence: [targetChoice, objectTargetChoice, targetChoice, objectTargetChoice, targetChoice, objectTargetChoice, targetChoice, objectTargetChoice, targetChoice, objectTargetChoice, targetChoice, objectTargetChoice] -> [targetChoice, objectTargetChoice]",
        "spellAttackSequence: [targetChoice, objectTargetChoice, targetChoice, objectTargetChoice, targetChoice, objectTargetChoice, targetChoice, objectTargetChoice, targetChoice, objectTargetChoice] -> [targetChoice, objectTargetChoice]",
        "spellAttackSequence: [targetChoice, objectTargetChoice, targetChoice, objectTargetChoice, targetChoice, objectTargetChoice, targetChoice, objectTargetChoice] -> [targetChoice, objectTargetChoice]",
        "spellAttackSequence: [targetChoice, objectTargetChoice, targetChoice, objectTargetChoice, targetChoice, objectTargetChoice] -> [targetChoice, objectTargetChoice]",
        "webRestraintHazard: [spellAreaChoice] -> [spellAreaChoice]",
      ]
    `);
  });
});
