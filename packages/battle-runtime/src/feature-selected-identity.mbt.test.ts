// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L1D2-SORCERER-INNATE-SORCERY sorcerer_innate_sorcery
// UNIT-IDENTITY-REPLAY: L1D2-SORCERER-INNATE-SORCERY sorcerer_innate_sorcery doActivateInnateSorcery doProjectInnateSorcerySpellBenefits doExcludeInnateSorceryNonSorcererSpellBenefits
import { Either } from "effect";
import { expect } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  abilityModifier,
  attackBonus,
  Hp,
  movementFeet,
  proficiencyBonus,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { SpellRecord } from "@dnd/surface/surface/types";

import {
  battleCombatantSide,
  battleId,
  cantripSpellInvocationRef,
  characterId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  resolveBattleSubject,
  spellSaveDcForCaster,
  startBattle,
  type ActiveOngoingFeatureOccurrence,
  type AvailableBattleAct,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import { ongoingFeatureSourceKeyForUnit } from "./battle-reducer/creature-state.ts";
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.ts";

type InnateSorcerySpellAttackRollMode = "none" | "advantage" | "disadvantage";
type InnateSorcerySelectedIdentityLastResult =
  | "init"
  | "activated"
  | "spellBenefitsProjected"
  | "nonSorcererExcluded";

const FEATURE_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG = {
  Init: "init",
  Activated: "activated",
  SpellBenefitsProjected: "spellBenefitsProjected",
  NonSorcererExcluded: "nonSorcererExcluded",
} as const;

type InnateSorceryOccurrenceProjection =
  | "inactive"
  | "activeUntilEndOfRound11";
type InnateSorcerySelectedIdentityProjection = {
  readonly bonusActionAvailable: boolean;
  readonly featureUsesRemaining: number;
  readonly innateSorceryOccurrence: InnateSorceryOccurrenceProjection;
  readonly spellSaveDc: number;
  readonly spellAttackRollMode: InnateSorcerySpellAttackRollMode;
  readonly lastResult: InnateSorcerySelectedIdentityLastResult;
};
type UnitFeatureAct = AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "unitFeature" }>;
};
type ResolvedBattleResult = Extract<
  BattleResolutionResult,
  { readonly tag: "resolved" }
>;

const innateSorceryUnitId = "sorcerer_innate_sorcery";
const rayOfFrostUnitId = "ray_of_frost";
const baseSorcererSpellSaveDc = 13;
const innateSorcerySpellSaveDc = 14;
const innateSorceryExpiresRound = 11;
const activeInnateSorceryOccurrence = "activeUntilEndOfRound11";
const sorcererId = combatantId("innate-sorcery-selected-identity-sorcerer");
const targetId = combatantId("innate-sorcery-selected-identity-target");
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");
const innateSorcerySourceKey =
  ongoingFeatureSourceKeyForUnit(innateSorceryUnitId);
const selectedUnitRuntimeBoundaryIds = new Set<string>();

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Innate Sorcery selected identity Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Innate Sorcery selected identity replay",
  taskId: "L1D2-SORCERER-INNATE-SORCERY",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-feature-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: { lastResult: FEATURE_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG },
  projectionSchema: {
    bonusActionAvailable: "bool",
    featureUsesRemaining: "int",
    innateSorceryOccurrence: "str",
    spellSaveDc: "int",
    spellAttackRollMode: "str",
    lastResult: "variant",
  },
  initialProjection: expectedProjection(),
  units: [
    {
      unitId: innateSorceryUnitId,
      procedures: [
        {
          actionName: "doActivateInnateSorcery",
          projectionAfter: expectedProjection({
            bonusActionAvailable: false,
            featureUsesRemaining: 1,
            innateSorceryOccurrence: activeInnateSorceryOccurrence,
            spellSaveDc: innateSorcerySpellSaveDc,
            lastResult: "activated",
          }),
          discover: () =>
            withSelectedUnitBoundaryCheck("doActivateInnateSorcery", () =>
              projectBattleState(
                resolveInnateSorcery(innateSorceryBattle("sorcerer")).state,
                "none",
                "activated",
              ),
            ),
        },
        {
          actionName: "doProjectInnateSorcerySpellBenefits",
          projectionAfter: expectedProjection({
            bonusActionAvailable: false,
            featureUsesRemaining: 1,
            innateSorceryOccurrence: activeInnateSorceryOccurrence,
            spellSaveDc: innateSorcerySpellSaveDc,
            spellAttackRollMode: "advantage",
            lastResult: "spellBenefitsProjected",
          }),
          discover: () =>
            withSelectedUnitBoundaryCheck(
              "doProjectInnateSorcerySpellBenefits",
              () => {
                const activated = resolveInnateSorcery(
                  innateSorceryBattle("sorcerer"),
                ).state;
                return projectBattleState(
                  activated,
                  spellAttackRollModeForRayOfFrost(activated),
                  "spellBenefitsProjected",
                );
              },
            ),
        },
        {
          actionName: "doExcludeInnateSorceryNonSorcererSpellBenefits",
          projectionAfter: expectedProjection({
            bonusActionAvailable: false,
            featureUsesRemaining: 1,
            innateSorceryOccurrence: activeInnateSorceryOccurrence,
            lastResult: "nonSorcererExcluded",
          }),
          discover: () =>
            withSelectedUnitBoundaryCheck(
              "doExcludeInnateSorceryNonSorcererSpellBenefits",
              () => {
                const activated = resolveInnateSorcery(
                  innateSorceryBattle("wizard"),
                ).state;
                return projectBattleState(
                  activated,
                  spellAttackRollModeForRayOfFrost(activated),
                  "nonSorcererExcluded",
                );
              },
            ),
        },
      ],
    },
  ],
});

function expectedProjection(
  overrides: Partial<InnateSorcerySelectedIdentityProjection> = {},
): InnateSorcerySelectedIdentityProjection {
  return {
    bonusActionAvailable: true,
    featureUsesRemaining: 2,
    innateSorceryOccurrence: "inactive",
    spellSaveDc: baseSorcererSpellSaveDc,
    spellAttackRollMode: "none",
    lastResult: "init",
    ...overrides,
  };
}

function projectBattleState(
  state: BattleState,
  spellAttackRollMode: InnateSorcerySpellAttackRollMode,
  lastResult: InnateSorcerySelectedIdentityLastResult,
): InnateSorcerySelectedIdentityProjection {
  const sorcerer = requireCombatant(state, sorcererId);
  const occurrence = sorcerer.activeOngoingFeatureOccurrences.get(
    innateSorcerySourceKey,
  );
  return {
    bonusActionAvailable: state.currentTurnResources.currentHasBonusAction,
    featureUsesRemaining: innateSorceryUsesRemaining(state),
    innateSorceryOccurrence: innateSorceryOccurrenceProjection(occurrence),
    spellSaveDc: requireSpellSaveDc(state),
    spellAttackRollMode,
    lastResult,
  };
}

function resolveInnateSorcery(state: BattleState): ResolvedBattleResult {
  const act = innateSorceryAct(state);
  return requireResolved(
    resolveBattleSubject({ state, subject: act.subject, fills: [] }),
  );
}

function spellAttackRollModeForRayOfFrost(
  state: BattleState,
): InnateSorcerySpellAttackRollMode {
  const subject: BattleSubject = {
    tag: "actionSpell",
    actorId: sorcererId,
    invocation: cantripSpellInvocationRef(
      rayOfFrostUnitId,
      "spellAttackDamage",
    ),
    mode: { tag: "cast" },
  };
  const target = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const attackRoll = requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [spellTargetFill(target)],
    }),
    "attackRoll",
  );
  return attackRoll.rollMode === "advantage" ||
    attackRoll.rollMode === "disadvantage"
    ? attackRoll.rollMode
    : "none";
}

function innateSorceryBattle(
  sourceClassName: "sorcerer" | "wizard",
): BattleState {
  return startBattleRight({
    battleId: battleId(`innate-sorcery-selected-identity-${sourceClassName}`),
    combatants: [
      characterCombatant({
        combatantId: sorcererId,
        displayName: "Innate Sorcery Sorcerer",
        initiative: 20,
        side: partySide,
        classLevels:
          sourceClassName === "sorcerer"
            ? [{ className: "sorcerer", level: 1 }]
            : [
                { className: "sorcerer", level: 1 },
                { className: "wizard", level: 1 },
              ],
        resources: [innateSorceryResource()],
        spellcasting: {
          sourceClassName,
          spellcastingAbilityModifier: 3,
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [spellRecord(rayOfFrostUnitId)],
          preparedSpells: [],
          featurePreparedSpells: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: [],
        },
      }),
      characterCombatant({
        combatantId: targetId,
        displayName: "Innate Sorcery Target",
        initiative: 10,
        side: oppositionSide,
        classLevels: [{ className: "fighter", level: 1 }],
      }),
    ],
  });
}

function startBattleRight(
  input: Parameters<typeof startBattle>[0],
): BattleState {
  const result = startBattle(input);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function characterCombatant(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly side: typeof partySide | typeof oppositionSide;
  readonly classLevels: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["classLevels"];
  readonly resources?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"];
  readonly spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    side: input.side,
    creatureInit: {
      kind: "character",
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: [],
      classLevels: input.classLevels,
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: {
        kind: "unarmedStrike",
        effect: {
          kind: "damage",
          damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
        },
        attackAbility: "str",
        attackAbilityModifier: abilityModifier(0),
        attackBonus: attackBonus(2),
        damageAbilityModifier: abilityModifier(0),
      },
      ...(input.resources === undefined ? {} : { resources: input.resources }),
      ...(input.spellcasting === undefined
        ? {}
        : { spellcasting: input.spellcasting }),
    },
  };
}

function spellRecord(spellUnitId: typeof rayOfFrostUnitId): SpellRecord {
  const unit = unitLibrary.requireUnit(spellUnitId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected ${spellUnitId} Unit to be a spell.`);
  }
  return unit;
}

function innateSorceryResource(): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"]
>[number] {
  const unit = unitLibrary.requireUnit(innateSorceryUnitId);
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "activation" ||
    !("resource" in unit.mechanics)
  ) {
    throw new Error("Expected Innate Sorcery resource Unit.");
  }
  return { unit };
}

function innateSorceryAct(state: BattleState): UnitFeatureAct {
  const subject: Extract<BattleSubject, { readonly tag: "unitFeature" }> = {
    tag: "unitFeature",
    actorId: sorcererId,
    unitId: recordSelectedUnitRuntimeBoundaryId(innateSorceryUnitId),
  };
  const act = discoverBattleActs(state).find(
    (candidate): candidate is UnitFeatureAct =>
      candidate.subject.tag === "unitFeature" &&
      candidate.subject.actorId === subject.actorId &&
      candidate.subject.unitId === subject.unitId,
  );
  if (act === undefined) {
    throw new Error("Expected Innate Sorcery Unit feature act.");
  }
  return act;
}

function spellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId: sorcererId,
        targetId,
        spellId: rayOfFrostUnitId,
      },
    ],
  };
}

function innateSorceryUsesRemaining(state: BattleState): number {
  const sorcerer = requireCombatant(state, sorcererId);
  if (sorcerer.origin.kind !== "character") {
    throw new Error("Expected Innate Sorcery actor to be a character.");
  }
  const resource = sorcerer.origin.resources.find(
    (candidate) => candidate.unit.id === innateSorceryUnitId,
  );
  if (resource === undefined) {
    throw new Error("Expected Innate Sorcery resource.");
  }
  return Number(resource.usesRemaining);
}

function innateSorceryOccurrenceProjection(
  occurrence: ActiveOngoingFeatureOccurrence | undefined,
): InnateSorceryOccurrenceProjection {
  if (occurrence === undefined) {
    return "inactive";
  }
  if (
    occurrence.kind !== "fixedDuration" ||
    occurrence.expiresAt.kind !== "endOfTurn" ||
    occurrence.expiresAt.round !== innateSorceryExpiresRound
  ) {
    throw new Error("Expected fixed-duration Innate Sorcery occurrence.");
  }
  return activeInnateSorceryOccurrence;
}

function requireSpellSaveDc(state: BattleState): number {
  const dc = spellSaveDcForCaster(state, sorcererId);
  if (dc === null) {
    throw new Error(
      "Expected Innate Sorcery spellcaster to have a Spell Save DC.",
    );
  }
  return Number(dc);
}

function requireCombatant(state: BattleState, combatantId: CombatantId) {
  const combatant = state.combatants.get(combatantId);
  if (combatant === undefined) {
    throw new Error(`Expected combatant ${combatantId}.`);
  }
  return combatant;
}

function requireResolved(result: BattleResolutionResult): ResolvedBattleResult {
  if (result.tag !== "resolved") {
    throw new Error(`Expected resolved result, got ${result.tag}.`);
  }
  return result;
}

function requireHole<TKind extends BattleHole["kind"]>(
  result: BattleResolutionResult,
  kind: TKind,
): Extract<BattleHole, { readonly kind: TKind }> {
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected ${kind} hole, got ${result.tag}.`);
  }
  const hole = result.holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: TKind }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function resetSelectedUnitRuntimeBoundaryIds(): void {
  selectedUnitRuntimeBoundaryIds.clear();
}

function withSelectedUnitBoundaryCheck(
  actionName: string,
  discover: () => InnateSorcerySelectedIdentityProjection,
): InnateSorcerySelectedIdentityProjection {
  resetSelectedUnitRuntimeBoundaryIds();
  const projection = discover();
  expect(
    selectedUnitRuntimeBoundaryIds.has(innateSorceryUnitId),
    `${innateSorceryUnitId}:${actionName} must bind its Unit id`,
  ).toBe(true);
  return projection;
}

function recordSelectedUnitRuntimeBoundaryId<UnitId extends string>(
  unitId: UnitId,
): UnitId {
  selectedUnitRuntimeBoundaryIds.add(unitId);
  return unitId;
}
