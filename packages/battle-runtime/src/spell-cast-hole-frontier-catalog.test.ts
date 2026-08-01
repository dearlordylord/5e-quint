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
  attackRollFill,
  battleId,
  characterSeed,
  fogCloudAreaFill,
  spellTargetAllocationFill,
  startBattleSessionRight,
  statBlockCreatureInit,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import {
  spellCasterId,
  unitLibrary,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  abilityChoiceFill,
  damageTypeChoiceFill,
  flamingSphereAreaFill,
  greaseSavingThrowOutcomeFill,
  gustOfWindLineSavingThrowOutcomeFill,
  knownWillingSpellTargetFill,
  knownWillingSpellTargetListFill,
  savingThrowOutcomeFill,
  sleetStormAreaFill,
  spellConditionChoiceFill,
  spellObjectLightTargetFill,
  spellTargetFill,
  spellTargetListFill,
  spellTouchedObjectTargetFill,
  targetAbilityChoicesFill,
  teleportDestinationFill,
  webAreaFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  combatantId,
  discoverBattleActs,
  resolveBattleSubject,
} from "./unit-profile-admission.test-support.ts";
import { battleAreaId, type BattleFill, type BattleHole } from "./index.ts";

const casterId = spellCasterId;
const firstTargetId = combatantId("spell-hole-frontier-target-one");
const secondTargetId = combatantId("spell-hole-frontier-target-two");
const WIZARD_LEVEL = characterLevel(9);
const WIZARD_CANTRIP_CAPACITY = PositiveInteger(4);
const WIZARD_PREPARED_SPELL_CAPACITY = PositiveInteger(14);
const CATALOG_REPLAY_FRONTIER_LIMIT = PositiveInteger(20);
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

type CatalogSpellPresentation = NonNullable<
  ReturnType<typeof battleActSpellPresentation>
>;
type CatalogSpellProcedure =
  CatalogSpellPresentation["invocation"]["procedure"];
type CatalogSpellId = CatalogSpellPresentation["invocation"]["spellId"];
type CatalogHoleKind = BattleHole["kind"];
type CatalogReplayResult =
  | {
      readonly tag: "resolved";
      readonly frontiers: readonly (readonly CatalogHoleKind[])[];
    }
  | {
      readonly tag: "invalid";
      readonly frontiers: readonly (readonly CatalogHoleKind[])[];
      readonly reason: Extract<
        ReturnType<typeof resolveBattleSubject>,
        { readonly tag: "invalid" }
      >["reason"];
      readonly message: string;
    }
  | {
      readonly tag: "unsupported";
      readonly frontiers: readonly (readonly CatalogHoleKind[])[];
    };

function catalogFrontierFills(input: {
  readonly acceptedFills: readonly BattleFill[];
  readonly holes: readonly BattleHole[];
  readonly procedure: CatalogSpellProcedure;
  readonly spellId: CatalogSpellId;
}): readonly BattleFill[] | undefined {
  const fills: BattleFill[] = [];
  const selectedTargetIds = [
    ...new Set(
      input.acceptedFills.flatMap((fill) =>
        fill.kind === "targetChoice"
          ? [fill.value]
          : fill.kind === "spellTargetList"
            ? fill.value.targetIds
            : fill.kind === "spellTargetAllocation"
              ? fill.value.allocations.map((allocation) => allocation.targetId)
              : [],
      ),
    ),
  ];
  const targetChoiceIsAvailable = input.holes.some(
    (hole) => hole.kind === "targetChoice",
  );
  for (const hole of input.holes) {
    if (hole.kind === "targetChoice") {
      const targetId = hole.choices[0] ?? firstTargetId;
      fills.push(
        hole.spellTargetSpatialFactRequest?.requiresKnownWillingTarget === true
          ? knownWillingSpellTargetFill(hole, input.spellId, casterId, targetId)
          : spellTargetFill(hole, input.spellId, casterId, targetId),
      );
      continue;
    }
    if (hole.kind === "objectTargetChoice") {
      if (targetChoiceIsAvailable) continue;
      if (input.procedure !== "objectLight") return undefined;
      fills.push(
        input.spellId === "light"
          ? spellObjectLightTargetFill({
              hole,
              spellId: input.spellId,
              casterId,
            })
          : spellTouchedObjectTargetFill({
              hole,
              spellId: input.spellId,
              casterId,
            }),
      );
      continue;
    }
    if (hole.kind === "spellTargetList") {
      const targetIds = [hole.choices[0] ?? firstTargetId];
      fills.push(
        hole.requiresKnownWillingTargets === true
          ? knownWillingSpellTargetListFill(
              hole,
              casterId,
              input.spellId,
              targetIds,
            )
          : spellTargetListFill(hole, casterId, input.spellId, targetIds),
      );
      continue;
    }
    if (hole.kind === "spellTargetAllocation") {
      fills.push(
        spellTargetAllocationFill(
          hole,
          [
            {
              targetId: hole.choices[0] ?? firstTargetId,
              count: hole.allocationCount,
            },
          ],
          casterId,
        ),
      );
      continue;
    }
    if (hole.kind === "damageTypeChoice") {
      const damageType = hole.choices[0];
      if (damageType === undefined) return undefined;
      fills.push(damageTypeChoiceFill(hole, damageType));
      continue;
    }
    if (hole.kind === "conditionChoice") {
      fills.push(spellConditionChoiceFill(hole, hole.choices[0]));
      continue;
    }
    if (hole.kind === "abilityChoice") {
      const ability = hole.choices[0];
      if (ability === undefined) return undefined;
      fills.push(abilityChoiceFill(hole, ability));
      continue;
    }
    if (hole.kind === "targetAbilityChoices") {
      const ability = hole.choices[0];
      if (ability === undefined) return undefined;
      fills.push(
        targetAbilityChoicesFill(hole, [
          {
            targetId: selectedTargetIds[0] ?? firstTargetId,
            ability,
          },
        ]),
      );
      continue;
    }
    if (hole.kind === "savingThrowOutcome") {
      if ("outcomeTargeting" in hole && hole.outcomeTargeting === "area") {
        const outcomes = [{ targetId: firstTargetId, succeeded: false }];
        const fill =
          input.procedure === "greaseGroundHazard"
            ? greaseSavingThrowOutcomeFill(hole, outcomes)
            : input.procedure === "gustOfWindLine"
              ? gustOfWindLineSavingThrowOutcomeFill(hole, outcomes)
              : undefined;
        if (fill === undefined) return undefined;
        fills.push(fill);
        continue;
      }
      fills.push(
        savingThrowOutcomeFill(
          hole,
          (selectedTargetIds.length === 0
            ? [firstTargetId]
            : selectedTargetIds
          ).map((targetId) => ({ targetId, succeeded: false })),
        ),
      );
      continue;
    }
    if (hole.kind === "attackRoll") {
      fills.push(attackRollFill(hole, { total: 20, naturalD20: 15 }));
      continue;
    }
    if (hole.kind === "rolledDice") return undefined;
    if (hole.kind === "teleportDestination") {
      fills.push(teleportDestinationFill({ hole }));
      continue;
    }
    if (hole.kind === "selfTransformationModeChoice") {
      fills.push({
        kind: "selfTransformationModeChoice",
        holeId: hole.holeId,
        value: hole.choices[0],
      });
      continue;
    }
    if (hole.kind === "spellAreaChoice") {
      const fill =
        input.procedure === "flamingSphere"
          ? flamingSphereAreaFill(hole)
          : input.procedure === "fogCloudObscurement"
            ? fogCloudAreaFill(hole, battleAreaId("catalog-fog-cloud-area"))
            : input.procedure === "sleetStormAreaHazard"
              ? sleetStormAreaFill(hole)
              : input.procedure === "webRestraintHazard"
                ? webAreaFill(hole)
                : undefined;
      if (fill === undefined) return undefined;
      fills.push(fill);
      continue;
    }
    return undefined;
  }
  return fills;
}

function replayCatalogSpellAct(input: {
  readonly act: ReturnType<typeof discoverBattleActs>[number];
  readonly state: ReturnType<typeof startBattleSessionRight>["state"];
}): CatalogReplayResult {
  const presentation = battleActSpellPresentation(input.act);
  if (presentation === undefined) {
    throw new Error("Expected catalog spell presentation.");
  }
  const acceptedFills: BattleFill[] = [];
  const frontiers: (readonly CatalogHoleKind[])[] = [];
  for (
    let replayStep = 0;
    replayStep < CATALOG_REPLAY_FRONTIER_LIMIT;
    replayStep += 1
  ) {
    const result = resolveBattleSubject({
      state: input.state,
      subject: input.act.subject,
      fills: acceptedFills,
    });
    if (result.tag === "resolved") return { tag: "resolved", frontiers };
    if (result.tag === "invalid") {
      return {
        tag: "invalid",
        frontiers,
        reason: result.reason,
        message: result.message,
      };
    }
    frontiers.push(result.holes.map((hole) => hole.kind));
    const nextFills = catalogFrontierFills({
      acceptedFills,
      holes: result.holes,
      procedure: presentation.invocation.procedure,
      spellId: presentation.invocation.spellId,
    });
    if (nextFills === undefined) {
      return { tag: "unsupported", frontiers };
    }
    acceptedFills.push(...nextFills);
  }
  throw new Error(
    `Catalog spell replay exceeded ${CATALOG_REPLAY_FRONTIER_LIMIT} staged hole frontiers.`,
  );
}

function renderCatalogReplay(result: CatalogReplayResult): string {
  const renderedFrontiers = result.frontiers
    .map((frontier) => `[${frontier.join(", ")}]`)
    .join(" -> ");
  if (result.tag === "resolved") {
    return renderedFrontiers === ""
      ? "resolved"
      : `${renderedFrontiers} -> resolved`;
  }
  if (result.tag === "unsupported") {
    return `${renderedFrontiers} -> unsupported`;
  }
  return `${renderedFrontiers} -> invalid:${result.reason}:${result.message}`;
}

describe("spell cast hole frontier catalog", () => {
  test("catalogs exact first frontiers and canonical replay outcomes across legal level 0-5 Wizard SRD loadouts", () => {
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
    const catalogCasts: {
      readonly act: ReturnType<typeof discoverBattleActs>[number];
      readonly discoveredFrontier: string;
      readonly state: ReturnType<typeof startBattleSessionRight>["state"];
    }[] = [];
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
        catalogCasts.push({
          act,
          discoveredFrontier: procedureAndFrontier,
          state: session.state,
        });
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

    const replays = catalogCasts.map((catalogCast) => ({
      discoveredFrontier: catalogCast.discoveredFrontier,
      result: replayCatalogSpellAct(catalogCast),
    }));
    expect(
      replays
        .filter(({ result }) => result.tag === "invalid")
        .map(({ discoveredFrontier, result }) => ({
          discoveredFrontier,
          result,
        })),
    ).toEqual([]);
    const outcomesByDiscoveredFrontier = new Map<string, Set<string>>();
    for (const { discoveredFrontier, result } of replays) {
      const outcomes = outcomesByDiscoveredFrontier.get(discoveredFrontier);
      const rendered = renderCatalogReplay(result);
      if (outcomes === undefined) {
        outcomesByDiscoveredFrontier.set(
          discoveredFrontier,
          new Set([rendered]),
        );
      } else {
        outcomes.add(rendered);
      }
    }
    const replayOutcomes = [...outcomesByDiscoveredFrontier]
      .map(
        ([discoveredFrontier, outcomes]) =>
          `${discoveredFrontier} => ${[...outcomes].sort().join(" | ")}`,
      )
      .sort();
    expect(replayOutcomes).toMatchInlineSnapshot(`
      [
        "abilityD20TestRollModeSaveGate: [spellTargetList] => [spellTargetList] -> [savingThrowOutcome] -> resolved",
        "attackBurstSaveDamage: [targetChoice] => [targetChoice] -> [attackRoll] -> [rolledDice] -> unsupported",
        "chainedSpellAttackDamage: [damageTypeChoice] => [damageTypeChoice] -> [targetChoice] -> [attackRoll] -> [rolledDice] -> unsupported",
        "chosenDamageResistance: [targetChoice, damageTypeChoice] => [targetChoice] -> [damageTypeChoice] -> resolved",
        "creatureSizeDecrease: [targetChoice] => [targetChoice] -> resolved",
        "creatureSizeIncrease: [targetChoice] => [targetChoice] -> resolved",
        "creatureTypeProtection: [targetChoice] => [targetChoice] -> resolved",
        "dancingLightsCombinedCast: [dancingLightsPlacement] => [dancingLightsPlacement] -> unsupported",
        "dancingLightsSeparateCast: [dancingLightsPlacement] => [dancingLightsPlacement] -> unsupported",
        "directCondition: [spellTargetList] => [spellTargetList] -> resolved",
        "dragonsBreathInitial: [spellTargetList, damageTypeChoice] => [spellTargetList] -> [damageTypeChoice] -> resolved",
        "flamingSphere: [spellAreaChoice] => [spellAreaChoice] -> resolved",
        "fogCloudObscurement: [spellAreaChoice] => [spellAreaChoice] -> resolved",
        "greaseGroundHazard: [savingThrowOutcome] => [savingThrowOutcome] -> resolved",
        "gustOfWindLine: [savingThrowOutcome] => [savingThrowOutcome] -> resolved",
        "hastePositive: [targetChoice] => [targetChoice] -> resolved",
        "hideousLaughter: [spellTargetList] => [spellTargetList] -> [savingThrowOutcome] -> resolved",
        "hypnoticPattern: [savingThrowOutcome] => [savingThrowOutcome] -> unsupported",
        "jumpMovementReplacement: [spellTargetList] => [spellTargetList] -> resolved",
        "levitatedCreature: [targetChoice] => [targetChoice] -> [levitateInitialRise] -> unsupported",
        "magicWeaponEnhancement: [magicWeaponTargetItem] => [magicWeaponTargetItem] -> unsupported",
        "magicalDarknessPointOrigin: [spellAreaChoice] => [spellAreaChoice] -> unsupported",
        "objectLight: [objectTargetChoice] => [objectTargetChoice] -> resolved",
        "ongoingSpellEnd: [ongoingSpellTargetChoice] => [ongoingSpellTargetChoice] -> unsupported",
        "persistentArmorEffect: [targetChoice] => [targetChoice] -> resolved",
        "repeatedDamageAllocation: [spellTargetAllocation] => [spellTargetAllocation] -> [rolledDice] -> unsupported",
        "rollModifier: [spellTargetList, targetAbilityChoices] => [spellTargetList] -> [targetAbilityChoices] -> resolved",
        "rollModifier: [targetChoice, abilityChoice] => [targetChoice] -> [abilityChoice] -> resolved",
        "saveGatedCondition: [savingThrowOutcome] => [savingThrowOutcome] -> unsupported",
        "saveGatedCondition: [spellTargetList, conditionChoice] => [spellTargetList] -> [conditionChoice] -> [savingThrowOutcome] -> resolved",
        "saveGatedCondition: [spellTargetList] => [spellTargetList] -> [savingThrowOutcome] -> resolved",
        "saveGatedDamage: [savingThrowOutcome] => [savingThrowOutcome] -> unsupported",
        "saveGatedDamage: [targetChoice] => [targetChoice] -> [savingThrowOutcome] -> [rolledDice] -> unsupported",
        "scalarBuff: [rolledDice] => [rolledDice] -> unsupported",
        "scalarBuff: [spellTargetList] => [spellTargetList] -> resolved",
        "scalarBuff: [targetChoice] => [targetChoice] -> resolved",
        "selfTeleport: [teleportDestination] => [teleportDestination] -> resolved",
        "selfTransformationMode: [selfTransformationModeChoice] => [selfTransformationModeChoice] -> resolved",
        "sleepTargetAdmission: [savingThrowOutcome] => [savingThrowOutcome] -> unsupported",
        "sleetStormAreaHazard: [spellAreaChoice] => [spellAreaChoice] -> resolved",
        "slowActivePenalties: [savingThrowOutcome] => [savingThrowOutcome] -> unsupported",
        "spellAttackDamage: [targetChoice, objectTargetChoice] => [targetChoice, objectTargetChoice] -> [attackRoll] -> [rolledDice] -> unsupported",
        "spellAttackDamage: [targetChoice] => [targetChoice] -> [attackRoll] -> [interruptDecision] -> unsupported | [targetChoice] -> [attackRoll] -> [rolledDice] -> unsupported",
        "spellAttackSequence: [targetChoice, objectTargetChoice, targetChoice, objectTargetChoice, targetChoice, objectTargetChoice, targetChoice, objectTargetChoice, targetChoice, objectTargetChoice, targetChoice, objectTargetChoice] => [targetChoice, objectTargetChoice] -> [targetChoice, objectTargetChoice] -> [targetChoice, objectTargetChoice] -> [targetChoice, objectTargetChoice] -> [targetChoice, objectTargetChoice] -> [targetChoice, objectTargetChoice] -> [attackRoll] -> [rolledDice] -> unsupported",
        "spellAttackSequence: [targetChoice, objectTargetChoice, targetChoice, objectTargetChoice, targetChoice, objectTargetChoice, targetChoice, objectTargetChoice, targetChoice, objectTargetChoice] => [targetChoice, objectTargetChoice] -> [targetChoice, objectTargetChoice] -> [targetChoice, objectTargetChoice] -> [targetChoice, objectTargetChoice] -> [targetChoice, objectTargetChoice] -> [attackRoll] -> [rolledDice] -> unsupported",
        "spellAttackSequence: [targetChoice, objectTargetChoice, targetChoice, objectTargetChoice, targetChoice, objectTargetChoice, targetChoice, objectTargetChoice] => [targetChoice, objectTargetChoice] -> [targetChoice, objectTargetChoice] -> [targetChoice, objectTargetChoice] -> [targetChoice, objectTargetChoice] -> [attackRoll] -> [rolledDice] -> unsupported",
        "spellAttackSequence: [targetChoice, objectTargetChoice, targetChoice, objectTargetChoice, targetChoice, objectTargetChoice] => [targetChoice, objectTargetChoice] -> [targetChoice, objectTargetChoice] -> [targetChoice, objectTargetChoice] -> [attackRoll] -> [rolledDice] -> unsupported",
        "webRestraintHazard: [spellAreaChoice] => [spellAreaChoice] -> resolved",
      ]
    `);
  });
});
