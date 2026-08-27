import { battleProcedureExecutionRefForTest } from "./battle-runtime.test-support.ts";
import { characterSpellProcedure } from "./character-execution-admission.ts";
import { resolveBattleSubject } from "./battle-runtime.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L1D2-SORCERER-INNATE-SORCERY sorcerer_innate_sorcery
// UNIT-IDENTITY-REPLAY: L1D2-SORCERER-INNATE-SORCERY sorcerer_innate_sorcery doActivateInnateSorcery doProjectInnateSorcerySpellBenefits doExcludeInnateSorceryNonSorcererSpellBenefits
import { Result } from "effect";
import { expect, it } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  abilityModifier,
  attackBonus,
  Hp,
  movementFeet,
  proficiencyBonus,
} from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";
import {
  buildUnitCatalog,
  classSpellListForSpellcastingClassRecord,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";

import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.test-support.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import {
  activeFeatureSpellSaveDcRouteEvents,
  battleId,
  battleReducerStartRouteEvent,
  characterId,
  combatantId,
  discoverBattleActCandidates,
  initiativeScore,
  spellSaveDcForCaster,
  startBattle,
  type ActiveOngoingFeatureOccurrence,
  type AvailableBattleAct,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleReducerRouteEvent,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.test-support.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";

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

type InnateSorceryOccurrenceProjection = "inactive" | "activeUntilEndOfRound11";
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
const innateSorceryExpiresRound = 11;
const activeInnateSorceryOccurrence = "activeUntilEndOfRound11";
const sorcererId = combatantId("innate-sorcery-selected-identity-sorcerer");
const targetId = combatantId("innate-sorcery-selected-identity-target");
const selectedUnitRuntimeBoundaryIds = new Set<string>();

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Innate Sorcery selected identity Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;

it("observes selected feature qRoute through public reducer events", () => {
  expect(observeInnateSorceryActivationRoute("sorcerer")).toEqual(
    activeFeatureActivationRoute(),
  );
  expect(observeInnateSorcerySpellAttackRoute("sorcerer")).toEqual(
    activeFeatureSpellAttackRollModeRoute(),
  );
  expect(observeInnateSorcerySpellAttackRoute("wizard")).toEqual(
    activeFeatureSpellAttackRollModeRoute(),
  );
});

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
  quintVariantFieldTags: {
    lastResult: FEATURE_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG,
  },
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

it("applies Innate Sorcery only to the class access when a feat grants the same spell", () => {
  const activated = resolveInnateSorcery(
    innateSorceryBattle("sorcerer", true),
  ).state;
  expect(spellAttackRollModeForRayOfFrost(activated, "classSpellcasting")).toBe(
    "advantage",
  );
  expect(spellAttackRollModeForRayOfFrost(activated, "spellAccess")).toBe(
    "none",
  );
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
    innateSorceryProcedureRef(state),
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

function observeInnateSorceryActivationRoute(
  sourceClassName: "sorcerer" | "wizard",
): readonly BattleReducerRouteEvent[] {
  const resolved = resolveInnateSorceryWithRoute(
    innateSorceryBattle(sourceClassName),
  );
  return resolved.route;
}

function observeInnateSorcerySpellAttackRoute(
  sourceClassName: "sorcerer" | "wizard",
): readonly BattleReducerRouteEvent[] {
  const activated = resolveInnateSorceryWithRoute(
    innateSorceryBattle(sourceClassName),
  );
  const spellAct = rayOfFrostActionSpellAct(activated.state);
  const targetResult = resolveBattleSubject({
    state: activated.state,
    subject: spellAct.subject,
    fills: [],
  });
  const target = requireHole(targetResult, "targetChoice");
  const attackRollResult = resolveBattleSubject({
    state: activated.state,
    subject: spellAct.subject,
    fills: [spellTargetFill(target)],
  });
  requireHole(attackRollResult, "attackRoll");
  return [
    ...activated.route,
    ...requireActiveFeatureSpellSaveDcRoute(activated.state),
    ...routeEventsOf(spellAct, "Ray of Frost action Spell act").filter(
      isActiveFeatureSpellAttackRollModeRouteEvent,
    ),
    ...routeEventsOf(attackRollResult, "Ray of Frost target resolution").filter(
      isActiveFeatureSpellAttackRollModeRouteEvent,
    ),
  ];
}

function resolveInnateSorceryWithRoute(state: BattleState): {
  readonly state: BattleState;
  readonly route: readonly BattleReducerRouteEvent[];
} {
  const act = innateSorceryAct(state);
  const resolved = requireResolved(
    resolveBattleSubject({ state, subject: act.subject, fills: [] }),
  );
  return {
    state: resolved.state,
    route: [
      battleReducerStartRouteEvent(),
      ...routeEventsOf(act, "Innate Sorcery Unit Feature act"),
      ...routeEventsOf(resolved, "Innate Sorcery activation resolution"),
    ],
  };
}

function spellAttackRollModeForRayOfFrost(
  state: BattleState,
  castingSourceTag?: "classSpellcasting" | "spellAccess",
): InnateSorcerySpellAttackRollMode {
  const subject = rayOfFrostActionSpellAct(state, castingSourceTag).subject;
  const actor = requireCombatant(state, sorcererId);
  if (actor.origin.kind !== "character") throw new Error("Expected character.");
  const invocation = characterSpellProcedure(
    actor.origin.execution,
    subject.procedureRef,
  );
  if (invocation === undefined) throw new Error("Expected spell invocation.");
  const target = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const attackRoll = requireHole(
    (() => {
      const result = resolveBattleSubject({
        state,
        subject,
        fills: [spellTargetFill(target, invocation.sourceProcedureRef)],
      });
      return result;
    })(),
    "attackRoll",
  );
  return attackRoll.rollMode === "advantage" ||
    attackRoll.rollMode === "disadvantage"
    ? attackRoll.rollMode
    : "none";
}

function innateSorceryBattle(
  sourceClassName: "sorcerer" | "wizard",
  includeFeatAccess = false,
): BattleState {
  const magicInitiateSource = unitLibrary.requireUnit(
    "feat_magic_initiate_wizard",
  );
  const magicInitiateCantrip = unitLibrary.requireUnit("acid_splash");
  const magicInitiateLevelOneSpell = unitLibrary.requireUnit("magic_missile");
  if (
    magicInitiateSource.kind !== "feat" ||
    magicInitiateCantrip.kind !== "spell" ||
    magicInitiateLevelOneSpell.kind !== "spell"
  ) {
    throw new Error("Expected Magic Initiate fixture Units.");
  }
  return startBattleRight({
    battleId: battleId(`innate-sorcery-selected-identity-${sourceClassName}`),
    combatants: [
      characterCombatant({
        combatantId: sorcererId,
        displayName: "Innate Sorcery Sorcerer",
        initiative: 20,
        classLevels:
          sourceClassName === "sorcerer"
            ? [{ className: "sorcerer", level: 1 }]
            : [
                { className: "sorcerer", level: 1 },
                { className: "wizard", level: 1 },
              ],
        resources: [
          innateSorceryResource(),
          ...(includeFeatAccess
            ? [
                {
                  unit: magicInitiateSource,
                  spellAccessFreeCast: {
                    spellId: magicInitiateLevelOneSpell.id,
                    count: 1,
                  },
                  usesRemaining: 1,
                },
              ]
            : []),
        ],
        spellcasting: {
          spellcastingSource: {
            tag: "classSpellcasting",
            className: sourceClassName,
            abilityModifier: 3,
          },
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [spellRecord(rayOfFrostUnitId)],
          preparedSpells: [],
          featurePreparedSpells: [],
          spellAccesses: includeFeatAccess
            ? [
                {
                  source: {
                    tag: "feat",
                    sourceUnit: magicInitiateSource,
                    spellList: wizardSpellListSource(),
                  },
                  spellcastingAbilityModifier: -1,
                  cantrips: [
                    spellRecord(rayOfFrostUnitId),
                    magicInitiateCantrip,
                  ],
                  levelOneSpell: magicInitiateLevelOneSpell,
                },
              ]
            : [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: [],
        },
      }),
      characterCombatant({
        combatantId: targetId,
        displayName: "Innate Sorcery Target",
        initiative: 10,
        classLevels: [{ className: "fighter", level: 1 }],
      }),
    ],
  });
}

function startBattleRight(
  input: Parameters<typeof startBattle>[0],
): BattleState {
  const result = startBattle(input);
  if (Result.isFailure(result)) {
    throw new Error(battleStateInitIssueMessage(result.failure));
  }
  return result.success.state;
}

function characterCombatant(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
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
    creatureInit: {
      kind: "character",
      ammunitionStocks: [],
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: [],
      classLevels: input.classLevels,
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
      weaponMasteries: [],
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

function wizardSpellListSource(): import("./index.ts").CharacterBattleSpellListFact {
  const wizard = unitLibrary.requireUnit("class_wizard");
  if (
    wizard.kind !== "class" ||
    wizard.className !== "wizard" ||
    wizard.spellcasting?.kind !== "wizard_spellcasting_creation"
  ) {
    throw new Error("Expected Wizard spell-list source.");
  }
  return {
    className: wizard.className,
    ...classSpellListForSpellcastingClassRecord(wizard),
  };
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
  const act = discoverBattleActCandidates(state).find(
    (candidate): candidate is UnitFeatureAct =>
      candidate.subject.tag === "unitFeature" &&
      candidate.subject.actorId === sorcererId &&
      candidate.subject.procedureRef === innateSorceryProcedureRef(state),
  );
  if (act === undefined) {
    throw new Error("Expected Innate Sorcery Unit feature act.");
  }
  recordSelectedUnitRuntimeBoundaryId(innateSorceryUnitId);
  return act;
}

function innateSorceryProcedureRef(state: BattleState) {
  const sorcerer = requireCombatant(state, sorcererId);
  if (sorcerer.origin.kind !== "character") {
    throw new Error("Expected Innate Sorcery character.");
  }
  const binding = sorcerer.origin.execution.procedureBindings.find(
    (candidate) =>
      candidate.procedure.kind === "unitFeature" &&
      candidate.procedure.execution.kind === "ongoingFeature" &&
      candidate.procedure.execution.activationTrigger === "bonusAction" &&
      candidate.procedure.execution.spellModifiers.some(
        (modifier) =>
          modifier.sourceClassName === "sorcerer" &&
          modifier.saveDcBonus === 1 &&
          modifier.attackRollMode === "advantage",
      ),
  );
  if (binding === undefined) {
    throw new Error("Expected admitted Innate Sorcery procedure binding.");
  }
  return binding.procedureRef;
}

function rayOfFrostActionSpellAct(
  state: BattleState,
  castingSourceTag?: "classSpellcasting" | "spellAccess",
): AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
} {
  const sorcerer = requireCombatant(state, sorcererId);
  if (sorcerer.origin.kind !== "character") {
    throw new Error("Expected Innate Sorcery character.");
  }
  const execution = sorcerer.origin.execution;
  const act = discoverBattleActCandidates(state).find(
    (
      candidate,
    ): candidate is AvailableBattleAct & {
      readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
    } =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.actorId === sorcererId &&
      characterSpellProcedure(execution, candidate.subject.procedureRef)
        ?.procedure === "spellAttackDamage" &&
      (castingSourceTag === undefined ||
        characterSpellProcedure(execution, candidate.subject.procedureRef)
          ?.spellRuleFacts.castingSource.tag === castingSourceTag),
  );
  if (act === undefined) {
    throw new Error("Expected Ray of Frost action Spell act.");
  }
  return act;
}

function spellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  sourceProcedureRef = battleProcedureExecutionRefForTest(
    String(rayOfFrostUnitId),
  ),
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
        sourceProcedureRef,
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
    (candidate) => "usesRemaining" in candidate,
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

function routeEventsOf(
  source: { readonly routeEvents?: readonly BattleReducerRouteEvent[] },
  label: string,
): readonly BattleReducerRouteEvent[] {
  if (source.routeEvents === undefined) {
    throw new Error(`Expected ${label} route events.`);
  }
  return source.routeEvents;
}

function requireActiveFeatureSpellSaveDcRoute(
  state: BattleState,
): readonly BattleReducerRouteEvent[] {
  const route = activeFeatureSpellSaveDcRouteEvents({
    state,
    casterId: sorcererId,
  });
  if (route === undefined) {
    throw new Error("Expected active feature Spell Save DC route events.");
  }
  return route;
}

function isActiveFeatureSpellAttackRollModeRouteEvent(
  event: BattleReducerRouteEvent,
): boolean {
  return (
    "subject" in event && event.subject === "activeFeatureSpellAttackRollMode"
  );
}

function activeFeatureActivationRoute(): readonly BattleReducerRouteEvent[] {
  return [
    battleReducerStartRouteEvent(),
    {
      kind: "discoverBattleActs",
      subject: "unitFeatureBonusAction",
      holes: [],
      owner: "battleFeatureResource",
    },
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "unitFeatureBonusAction",
      holes: [],
      owner: "battleActionEconomy",
    },
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "unitFeatureBonusAction",
      holes: [],
      owner: "battleFeatureResource",
    },
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "unitFeatureBonusAction",
      holes: [],
      owner: "battleActiveEffect",
    },
  ];
}

function activeFeatureSpellSaveDcRoute(): readonly BattleReducerRouteEvent[] {
  return [
    ...activeFeatureActivationRoute(),
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "activeFeatureSpellSaveDc",
      holes: [],
      owner: "battleActiveEffect",
    },
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "activeFeatureSpellSaveDc",
      holes: [],
      owner: "battleSpellSlotAndActionEconomy",
    },
  ];
}

function activeFeatureSpellAttackRollModeRoute(): readonly BattleReducerRouteEvent[] {
  return [
    ...activeFeatureSpellSaveDcRoute(),
    {
      kind: "discoverBattleActs",
      subject: "activeFeatureSpellAttackRollMode",
      holes: ["targetChoice"],
      owner: "battleSpellSlotAndActionEconomy",
    },
    {
      kind: "resolveBattleSubject",
      subject: "activeFeatureSpellAttackRollMode",
      fill: "targetChoice",
      holes: ["attackRoll"],
      owner: "battleTargetSelection",
    },
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "activeFeatureSpellAttackRollMode",
      holes: ["attackRoll"],
      owner: "battleActiveEffect",
    },
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "activeFeatureSpellAttackRollMode",
      holes: ["attackRoll"],
      owner: "battleSpellAttackProcedure",
    },
  ];
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
