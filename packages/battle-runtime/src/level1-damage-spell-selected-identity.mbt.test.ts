// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt level1-damage-spell-selected-identity burning_hands chromatic_orb ice_knife poison_spray ray_of_sickness sacred_flame sorcerous_burst starry_wisp vicious_mockery
// UNIT-IDENTITY-MBT-REPLAY: level1-damage-spell-selected-identity burning_hands doResolveBurningHandsMixedConeSavingThrows
// UNIT-IDENTITY-MBT-REPLAY: level1-damage-spell-selected-identity chromatic_orb doResolveChromaticOrbDuplicateDamageLeap
// UNIT-IDENTITY-MBT-REPLAY: level1-damage-spell-selected-identity ice_knife doResolveIceKnifeHitAttackDamageAndBurstSavingThrows doResolveIceKnifeMissBurstSavingThrows
// UNIT-IDENTITY-MBT-REPLAY: level1-damage-spell-selected-identity poison_spray doResolvePoisonSpraySpellAttackDamage
// UNIT-IDENTITY-MBT-REPLAY: level1-damage-spell-selected-identity ray_of_sickness doResolveRayOfSicknessSpellAttackDamageAndPoisoned
// UNIT-IDENTITY-MBT-REPLAY: level1-damage-spell-selected-identity sacred_flame doResolveSacredFlameDexteritySavingThrowRadiantDamage
// UNIT-IDENTITY-MBT-REPLAY: level1-damage-spell-selected-identity sorcerous_burst doResolveSorcerousBurstSpellAttackDamage
// UNIT-IDENTITY-MBT-REPLAY: level1-damage-spell-selected-identity starry_wisp doResolveStarryWispObjectSpellAttackDamageAndDimLight
// UNIT-IDENTITY-MBT-REPLAY: level1-damage-spell-selected-identity vicious_mockery doResolveViciousMockeryWisdomSavingThrowPsychicDamageAndNextAttackDisadvantage
import { Either } from "effect";

import {
  armorClass,
  defaultArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import {
  DieRollResult,
  Hp,
  abilityModifier,
  attackBonus,
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
  battleObjectId,
  characterId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  objectInvisibleBenefitDenied,
  resolveBattleSubject,
  snapshotBattle,
  startBattle,
  type AvailableBattleAct,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleObjectDamageDisposition,
  type BattleResolutionResult,
  type BattleRolledDiceFill,
  type BattleState,
  type BattleSubject,
  type CombatantId,
  type SupportedSpellInvocation,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import {
  CHROMATIC_ORB_DAMAGE_TYPES,
  CHROMATIC_ORB_LEAP_RANGE_FEET,
} from "./battle-reducer/domain-constants.ts";
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";

const level1DamageSpellUnitIds = [
  "burning_hands",
  "chromatic_orb",
  "ice_knife",
  "poison_spray",
  "ray_of_sickness",
  "sacred_flame",
  "sorcerous_burst",
  "starry_wisp",
  "vicious_mockery",
] as const;
type Level1DamageSpellUnitId = (typeof level1DamageSpellUnitIds)[number];
const level1DamageSpellSelectedIdentityResults = [
  "init",
  "burningHandsMixedConeSavingThrows",
  "chromaticOrbDuplicateDamageLeap",
  "iceKnifeHitAttackDamageAndBurstSavingThrows",
  "iceKnifeMissBurstSavingThrows",
  "poisonSpraySpellAttackDamage",
  "rayOfSicknessSpellAttackDamageAndPoisoned",
  "sacredFlameDexteritySavingThrowRadiantDamage",
  "sorcerousBurstSpellAttackDamage",
  "starryWispObjectSpellAttackDamageAndDimLight",
  "viciousMockeryWisdomSavingThrowPsychicDamageAndNextAttackDisadvantage",
] as const;
type Level1DamageSpellSelectedIdentityResult =
  (typeof level1DamageSpellSelectedIdentityResults)[number];

type Level1DamageSpellSelectedIdentityProjection = {
  readonly actionAvailable: boolean;
  readonly spellSlotSpentThisTurn: boolean;
  readonly level1SlotsRemaining: number;
  readonly primaryTargetHp: number;
  readonly primaryTargetPoisoned: boolean;
  readonly primaryTargetNextAttackRollDisadvantage: boolean;
  readonly secondaryTargetHp: number;
  readonly lastResult: Level1DamageSpellSelectedIdentityResult;
};
type Level1DamageSpellSelectedIdentityAction =
  | "doResolveBurningHandsMixedConeSavingThrows"
  | "doResolveChromaticOrbDuplicateDamageLeap"
  | "doResolveIceKnifeHitAttackDamageAndBurstSavingThrows"
  | "doResolveIceKnifeMissBurstSavingThrows"
  | "doResolvePoisonSpraySpellAttackDamage"
  | "doResolveRayOfSicknessSpellAttackDamageAndPoisoned"
  | "doResolveSacredFlameDexteritySavingThrowRadiantDamage"
  | "doResolveSorcerousBurstSpellAttackDamage"
  | "doResolveStarryWispObjectSpellAttackDamageAndDimLight"
  | "doResolveViciousMockeryWisdomSavingThrowPsychicDamageAndNextAttackDisadvantage";
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly Level1DamageSpellSelectedIdentityAction[];
  readonly expected: Level1DamageSpellSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "level1-damage-spell-selected-identity";
  readonly unitId: Level1DamageSpellUnitId;
  readonly actions: readonly Level1DamageSpellSelectedIdentityAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
};
type ObjectTargetChoiceFill = Extract<
  BattleFill,
  { readonly kind: "objectTargetChoice" }
>;
type SpellAttackDamageInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "spellAttackDamage" }
>;
type ChainedSpellAttackDamageInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "chainedSpellAttackDamage" }
>;
type SaveGatedDamageInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedDamage" }
>;
type SpellPostDamageRider =
  SpellAttackDamageInvocation["postDamageRiders"][number];
type SpellFailedSavePostDamageRider =
  SaveGatedDamageInvocation["failedSavePostDamageRiders"][number];
type CharacterCreatureInit = Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>;
type CharacterSpellcastingInit = NonNullable<
  CharacterCreatureInit["spellcasting"]
>;
type IceKnifeAttackOutcome =
  | {
      readonly kind: "hit";
      readonly attackRollTotal: number;
      readonly naturalD20: number;
      readonly attackDamageRoll: readonly [number, ...number[]];
    }
  | {
      readonly kind: "miss";
      readonly attackRollTotal: number;
      readonly naturalD20: number;
    };
type Level1DamageSpellInvocationProfile =
  | {
      readonly tag: "cantrip";
      readonly procedure: "saveGatedDamage" | "spellAttackDamage";
    }
  | {
      readonly tag: "spellSlot";
      readonly slotLevel: 1;
      readonly procedure:
        | "attackBurstSaveDamage"
        | "chainedSpellAttackDamage"
        | "saveGatedDamage"
        | "spellAttackDamage";
    };

const level1DamageSpellInvocationProfiles = {
  burning_hands: {
    tag: "spellSlot",
    slotLevel: 1,
    procedure: "saveGatedDamage",
  },
  chromatic_orb: {
    tag: "spellSlot",
    slotLevel: 1,
    procedure: "chainedSpellAttackDamage",
  },
  ice_knife: {
    tag: "spellSlot",
    slotLevel: 1,
    procedure: "attackBurstSaveDamage",
  },
  poison_spray: {
    tag: "cantrip",
    procedure: "spellAttackDamage",
  },
  ray_of_sickness: {
    tag: "spellSlot",
    slotLevel: 1,
    procedure: "spellAttackDamage",
  },
  sacred_flame: {
    tag: "cantrip",
    procedure: "saveGatedDamage",
  },
  sorcerous_burst: {
    tag: "cantrip",
    procedure: "spellAttackDamage",
  },
  starry_wisp: {
    tag: "cantrip",
    procedure: "spellAttackDamage",
  },
  vicious_mockery: {
    tag: "cantrip",
    procedure: "saveGatedDamage",
  },
} as const satisfies Record<
  Level1DamageSpellUnitId,
  Level1DamageSpellInvocationProfile
>;

const sorcerousBurstDamageTypes = [
  "acid",
  "cold",
  "fire",
  "lightning",
  "poison",
  "psychic",
  "thunder",
] as const satisfies ReadonlyArray<
  Extract<BattleFill, { readonly kind: "damageTypeChoice" }>["value"]
>;

const casterId = combatantId("level1-damage-spell-caster");
const primaryTargetId = combatantId("level1-damage-spell-primary-target");
const secondaryTargetId = combatantId("level1-damage-spell-secondary-target");
const starryWispObjectId = battleObjectId(
  "level1-damage-spell-starry-wisp-object",
);
const starryWispRangeFeet = 60;
const starryWispObjectArmorClass = armorClass(13);
const starryWispObjectHitPoints = Hp(5);
const starryWispObjectDamageRoll = 6;
const starryWispDimLightRadiusFeet = 10;
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Level 1 damage spell selected identity Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

const selectedUnitIdentityReplays = [
  {
    taskId: "level1-damage-spell-selected-identity",
    unitId: "burning_hands",
    actions: ["doResolveBurningHandsMixedConeSavingThrows"],
    sequences: [
      {
        name: "self-origin-cone-dexterity-save-fire-damage",
        actions: ["doResolveBurningHandsMixedConeSavingThrows"],
        expected: expectedProjection({
          actionAvailable: false,
          spellSlotSpentThisTurn: true,
          level1SlotsRemaining: 0,
          primaryTargetHp: 6,
          secondaryTargetHp: 9,
          lastResult: "burningHandsMixedConeSavingThrows",
        }),
      },
    ],
  },
  {
    taskId: "level1-damage-spell-selected-identity",
    unitId: "chromatic_orb",
    actions: ["doResolveChromaticOrbDuplicateDamageLeap"],
    sequences: [
      {
        name: "ranged-spell-attack-selected-fire-damage-and-level-1-leap",
        actions: ["doResolveChromaticOrbDuplicateDamageLeap"],
        expected: expectedProjection({
          actionAvailable: false,
          spellSlotSpentThisTurn: true,
          level1SlotsRemaining: 0,
          primaryTargetHp: 3,
          secondaryTargetHp: 9,
          lastResult: "chromaticOrbDuplicateDamageLeap",
        }),
      },
    ],
  },
  {
    taskId: "level1-damage-spell-selected-identity",
    unitId: "ice_knife",
    actions: [
      "doResolveIceKnifeHitAttackDamageAndBurstSavingThrows",
      "doResolveIceKnifeMissBurstSavingThrows",
    ],
    sequences: [
      {
        name: "hit-piercing-damage-then-primary-origin-burst-save",
        actions: ["doResolveIceKnifeHitAttackDamageAndBurstSavingThrows"],
        expected: expectedProjection({
          actionAvailable: false,
          spellSlotSpentThisTurn: true,
          level1SlotsRemaining: 0,
          primaryTargetHp: 4,
          secondaryTargetHp: 12,
          lastResult: "iceKnifeHitAttackDamageAndBurstSavingThrows",
        }),
      },
      {
        name: "miss-still-projects-primary-origin-burst-save",
        actions: ["doResolveIceKnifeMissBurstSavingThrows"],
        expected: expectedProjection({
          actionAvailable: false,
          spellSlotSpentThisTurn: true,
          level1SlotsRemaining: 0,
          primaryTargetHp: 8,
          secondaryTargetHp: 12,
          lastResult: "iceKnifeMissBurstSavingThrows",
        }),
      },
    ],
  },
  {
    taskId: "level1-damage-spell-selected-identity",
    unitId: "poison_spray",
    actions: ["doResolvePoisonSpraySpellAttackDamage"],
    sequences: [
      {
        name: "cantrip-ranged-spell-attack-poison-damage",
        actions: ["doResolvePoisonSpraySpellAttackDamage"],
        expected: expectedProjection({
          actionAvailable: false,
          spellSlotSpentThisTurn: false,
          level1SlotsRemaining: 1,
          primaryTargetHp: 5,
          secondaryTargetHp: 12,
          lastResult: "poisonSpraySpellAttackDamage",
        }),
      },
    ],
  },
  {
    taskId: "level1-damage-spell-selected-identity",
    unitId: "ray_of_sickness",
    actions: ["doResolveRayOfSicknessSpellAttackDamageAndPoisoned"],
    sequences: [
      {
        name: "ranged-spell-attack-poison-damage-and-poisoned-rider",
        actions: ["doResolveRayOfSicknessSpellAttackDamageAndPoisoned"],
        expected: expectedProjection({
          actionAvailable: false,
          spellSlotSpentThisTurn: true,
          level1SlotsRemaining: 0,
          primaryTargetHp: 5,
          primaryTargetPoisoned: true,
          secondaryTargetHp: 12,
          lastResult: "rayOfSicknessSpellAttackDamageAndPoisoned",
        }),
      },
    ],
  },
  {
    taskId: "level1-damage-spell-selected-identity",
    unitId: "sacred_flame",
    actions: ["doResolveSacredFlameDexteritySavingThrowRadiantDamage"],
    sequences: [
      {
        name: "cantrip-dexterity-saving-throw-radiant-damage",
        actions: ["doResolveSacredFlameDexteritySavingThrowRadiantDamage"],
        expected: expectedProjection({
          actionAvailable: false,
          spellSlotSpentThisTurn: false,
          level1SlotsRemaining: 1,
          primaryTargetHp: 5,
          secondaryTargetHp: 12,
          lastResult: "sacredFlameDexteritySavingThrowRadiantDamage",
        }),
      },
    ],
  },
  {
    taskId: "level1-damage-spell-selected-identity",
    unitId: "sorcerous_burst",
    actions: ["doResolveSorcerousBurstSpellAttackDamage"],
    sequences: [
      {
        name: "cantrip-ranged-spell-attack-selected-thunder-exploding-d8-damage",
        actions: ["doResolveSorcerousBurstSpellAttackDamage"],
        expected: expectedProjection({
          actionAvailable: false,
          spellSlotSpentThisTurn: false,
          level1SlotsRemaining: 1,
          primaryTargetHp: 2,
          secondaryTargetHp: 12,
          lastResult: "sorcerousBurstSpellAttackDamage",
        }),
      },
    ],
  },
  {
    taskId: "level1-damage-spell-selected-identity",
    unitId: "starry_wisp",
    actions: ["doResolveStarryWispObjectSpellAttackDamageAndDimLight"],
    sequences: [
      {
        name: "cantrip-object-ranged-spell-attack-radiant-damage-and-dim-light",
        actions: ["doResolveStarryWispObjectSpellAttackDamageAndDimLight"],
        expected: expectedProjection({
          actionAvailable: false,
          spellSlotSpentThisTurn: false,
          level1SlotsRemaining: 1,
          primaryTargetHp: 12,
          secondaryTargetHp: 12,
          lastResult: "starryWispObjectSpellAttackDamageAndDimLight",
        }),
      },
    ],
  },
  {
    taskId: "level1-damage-spell-selected-identity",
    unitId: "vicious_mockery",
    actions: [
      "doResolveViciousMockeryWisdomSavingThrowPsychicDamageAndNextAttackDisadvantage",
    ],
    sequences: [
      {
        name: "cantrip-wisdom-saving-throw-psychic-damage-and-next-attack-disadvantage",
        actions: [
          "doResolveViciousMockeryWisdomSavingThrowPsychicDamageAndNextAttackDisadvantage",
        ],
        expected: expectedProjection({
          actionAvailable: false,
          spellSlotSpentThisTurn: false,
          level1SlotsRemaining: 1,
          primaryTargetHp: 6,
          primaryTargetNextAttackRollDisadvantage: true,
          secondaryTargetHp: 12,
          lastResult:
            "viciousMockeryWisdomSavingThrowPsychicDamageAndNextAttackDisadvantage",
        }),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

const level1DamageSpellDiscoveries = {
  doResolveBurningHandsMixedConeSavingThrows: () =>
    resolvedProjection(
      "burning_hands",
      resolveBurningHandsMixedConeSavingThrows,
      "burningHandsMixedConeSavingThrows",
    ),
  doResolveChromaticOrbDuplicateDamageLeap: () =>
    resolvedProjection(
      "chromatic_orb",
      resolveChromaticOrbDuplicateDamageLeap,
      "chromaticOrbDuplicateDamageLeap",
    ),
  doResolveIceKnifeHitAttackDamageAndBurstSavingThrows: () =>
    resolvedProjection(
      "ice_knife",
      resolveIceKnifeHitAttackDamageAndBurstSavingThrows,
      "iceKnifeHitAttackDamageAndBurstSavingThrows",
    ),
  doResolveIceKnifeMissBurstSavingThrows: () =>
    resolvedProjection(
      "ice_knife",
      resolveIceKnifeMissBurstSavingThrows,
      "iceKnifeMissBurstSavingThrows",
    ),
  doResolvePoisonSpraySpellAttackDamage: () =>
    resolvedProjection(
      "poison_spray",
      resolvePoisonSpraySpellAttackDamage,
      "poisonSpraySpellAttackDamage",
    ),
  doResolveRayOfSicknessSpellAttackDamageAndPoisoned: () =>
    resolvedProjection(
      "ray_of_sickness",
      resolveRayOfSicknessSpellAttackDamageAndPoisoned,
      "rayOfSicknessSpellAttackDamageAndPoisoned",
    ),
  doResolveSacredFlameDexteritySavingThrowRadiantDamage: () =>
    resolvedProjection(
      "sacred_flame",
      resolveSacredFlameDexteritySavingThrowRadiantDamage,
      "sacredFlameDexteritySavingThrowRadiantDamage",
    ),
  doResolveSorcerousBurstSpellAttackDamage: () =>
    resolvedProjection(
      "sorcerous_burst",
      resolveSorcerousBurstSpellAttackDamage,
      "sorcerousBurstSpellAttackDamage",
    ),
  doResolveStarryWispObjectSpellAttackDamageAndDimLight: () =>
    resolvedProjection(
      "starry_wisp",
      resolveStarryWispObjectSpellAttackDamageAndDimLight,
      "starryWispObjectSpellAttackDamageAndDimLight",
    ),
  doResolveViciousMockeryWisdomSavingThrowPsychicDamageAndNextAttackDisadvantage:
    () =>
      resolvedProjection(
        "vicious_mockery",
        resolveViciousMockeryWisdomSavingThrowPsychicDamageAndNextAttackDisadvantage,
        "viciousMockeryWisdomSavingThrowPsychicDamageAndNextAttackDisadvantage",
      ),
} as const satisfies Record<
  Level1DamageSpellSelectedIdentityAction,
  () => Level1DamageSpellSelectedIdentityProjection
>;

const LEVEL1_DAMAGE_SPELL_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG = {
  Init: "init",
  BurningHandsMixedConeSavingThrows: "burningHandsMixedConeSavingThrows",
  ChromaticOrbDuplicateDamageLeap: "chromaticOrbDuplicateDamageLeap",
  IceKnifeHitAttackDamageAndBurstSavingThrows: "iceKnifeHitAttackDamageAndBurstSavingThrows",
  IceKnifeMissBurstSavingThrows: "iceKnifeMissBurstSavingThrows",
  PoisonSpraySpellAttackDamage: "poisonSpraySpellAttackDamage",
  RayOfSicknessSpellAttackDamageAndPoisoned: "rayOfSicknessSpellAttackDamageAndPoisoned",
  SacredFlameDexteritySavingThrowRadiantDamage: "sacredFlameDexteritySavingThrowRadiantDamage",
  SorcerousBurstSpellAttackDamage: "sorcerousBurstSpellAttackDamage",
  StarryWispObjectSpellAttackDamageAndDimLight: "starryWispObjectSpellAttackDamageAndDimLight",
  ViciousMockeryWisdomSavingThrowPsychicDamageAndNextAttackDisadvantage: "viciousMockeryWisdomSavingThrowPsychicDamageAndNextAttackDisadvantage",
} as const satisfies Readonly<Record<string, Level1DamageSpellSelectedIdentityResult>>;

defineSelectedIdentityWitness({
  describeLabel: "Level 1 damage spell selected identity MBT",
  taskId: "level1-damage-spell-selected-identity",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-level1-damage-spell-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: LEVEL1_DAMAGE_SPELL_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG,
  },
  projectionSchema: {
    actionAvailable: "bool",
    spellSlotSpentThisTurn: "bool",
    level1SlotsRemaining: "int",
    primaryTargetHp: "int",
    primaryTargetPoisoned: "bool",
    primaryTargetNextAttackRollDisadvantage: "bool",
    secondaryTargetHp: "int",
    lastResult: "variant",
  },
  initialProjection: expectedProjection(),
  units: selectedUnitIdentityReplays.map((replay) => ({
    unitId: replay.unitId,
    procedures: replay.sequences.map((sequence) => {
      const actionName = singleReplayAction(
        replay.unitId,
        sequence.name,
        sequence.actions,
      );
      return {
        actionName,
        projectionAfter: sequence.expected,
        discover: level1DamageSpellDiscoveries[actionName],
      };
    }),
  })),
});

function singleReplayAction(
  unitId: Level1DamageSpellUnitId,
  sequenceName: string,
  actions: readonly Level1DamageSpellSelectedIdentityAction[],
): Level1DamageSpellSelectedIdentityAction {
  if (actions.length !== 1 || actions[0] === undefined) {
    throw new Error(
      `Expected single Level 1 damage spell selected identity replay action for ${unitId}:${sequenceName}.`,
    );
  }
  return actions[0];
}

function resolvedProjection(
  unitId: Level1DamageSpellUnitId,
  resolve: (state: BattleState) => BattleResolutionResult,
  lastResult: Exclude<Level1DamageSpellSelectedIdentityResult, "init">,
): Level1DamageSpellSelectedIdentityProjection {
  const result = resolve(level1DamageSpellBattle(srdSpellRecord(unitId)));
  if (result.tag !== "resolved") {
    throw new Error(
      `Expected Level 1 damage spell action to resolve, got ${result.tag}.`,
    );
  }
  return projectLevel1DamageSpellSelectedIdentityState(
    result.state,
    lastResult,
  );
}

function expectedProjection(
  overrides: Partial<Level1DamageSpellSelectedIdentityProjection> = {},
): Level1DamageSpellSelectedIdentityProjection {
  return {
    actionAvailable: true,
    spellSlotSpentThisTurn: false,
    level1SlotsRemaining: 1,
    primaryTargetHp: 12,
    primaryTargetPoisoned: false,
    primaryTargetNextAttackRollDisadvantage: false,
    secondaryTargetHp: 12,
    lastResult: "init",
    ...overrides,
  };
}

function resolveBurningHandsMixedConeSavingThrows(
  state: BattleState,
): BattleResolutionResult {
  const act = actionSpellAct(state, "burning_hands");
  const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
  assertBurningHandsSavingThrowProfile(savingThrow);
  const savingThrowFill = areaSavingThrowOutcomeFill(savingThrow, [
    { targetId: primaryTargetId, succeeded: false },
    { targetId: secondaryTargetId, succeeded: true },
  ]);
  const damage = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [savingThrowFill],
    }),
    "rolledDice",
  );
  assertBurningHandsDamageProfile(damage);
  return resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [savingThrowFill, damageRollFill(damage, [2, 2, 2])],
  });
}

function resolveChromaticOrbDuplicateDamageLeap(
  state: BattleState,
): BattleResolutionResult {
  const act = actionSpellAct(state, "chromatic_orb");
  const damageType = requireHole(act.initialHoles, "damageTypeChoice");
  assertChromaticOrbDamageTypeChoiceProfile(damageType);
  const damageTypeChoice = damageTypeChoiceFill(damageType, "fire");
  const primaryTarget = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [damageTypeChoice],
    }),
    "targetChoice",
  );
  assertSinglePrimaryTargetChoiceProfile(primaryTarget, "Chromatic Orb");
  const primaryTargetChoice = spellTargetFill(
    primaryTarget,
    "chromatic_orb",
    primaryTargetId,
  );
  const primaryAttack = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [damageTypeChoice, primaryTargetChoice],
    }),
    "attackRoll",
  );
  assertChromaticOrbAttackRollProfile(primaryAttack);
  const primaryAttackRoll = attackRollFill(primaryAttack, {
    total: 15,
    naturalD20: 10,
  });
  const primaryDamage = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [damageTypeChoice, primaryTargetChoice, primaryAttackRoll],
    }),
    "rolledDice",
  );
  assertChromaticOrbDamageProfile(primaryDamage);
  const primaryDamageRoll = damageRollFill(primaryDamage, [2, 2, 5]);
  const firstStepFills = [
    damageTypeChoice,
    primaryTargetChoice,
    primaryAttackRoll,
    primaryDamageRoll,
  ];
  const leapTarget = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: firstStepFills,
    }),
    "targetChoice",
  );
  assertChromaticOrbLeapTargetProfile(leapTarget);
  const leapTargetChoice = spellLeapTargetFill(
    leapTarget,
    "chromatic_orb",
    primaryTargetId,
    secondaryTargetId,
  );
  const leapAttack = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [...firstStepFills, leapTargetChoice],
    }),
    "attackRoll",
  );
  assertChromaticOrbAttackRollProfile(leapAttack);
  const leapAttackRoll = attackRollFill(leapAttack, {
    total: 15,
    naturalD20: 10,
  });
  const leapDamage = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [...firstStepFills, leapTargetChoice, leapAttackRoll],
    }),
    "rolledDice",
  );
  assertChromaticOrbDamageProfile(leapDamage);
  return resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      ...firstStepFills,
      leapTargetChoice,
      leapAttackRoll,
      damageRollFill(leapDamage, [1, 1, 1]),
    ],
  });
}

function resolveIceKnifeHitAttackDamageAndBurstSavingThrows(
  state: BattleState,
): BattleResolutionResult {
  return resolveIceKnifeAttackAndBurstSavingThrows(state, {
    kind: "hit",
    attackRollTotal: 15,
    naturalD20: 10,
    attackDamageRoll: [4],
  });
}

function resolveIceKnifeMissBurstSavingThrows(
  state: BattleState,
): BattleResolutionResult {
  return resolveIceKnifeAttackAndBurstSavingThrows(state, {
    kind: "miss",
    attackRollTotal: 1,
    naturalD20: 1,
  });
}

function resolvePoisonSpraySpellAttackDamage(
  state: BattleState,
): BattleResolutionResult {
  const act = actionSpellAct(state, "poison_spray");
  const target = requireHole(act.initialHoles, "targetChoice");
  assertSinglePrimaryTargetChoiceProfile(target, "Poison Spray");
  const targetChoice = spellTargetFill(target, "poison_spray", primaryTargetId);
  const attack = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetChoice],
    }),
    "attackRoll",
  );
  assertPoisonSprayAttackRollProfile(attack);
  const attackRoll = attackRollFill(attack, {
    total: 15,
    naturalD20: 10,
  });
  const damage = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetChoice, attackRoll],
    }),
    "rolledDice",
  );
  assertPoisonSprayDamageProfile(damage);
  return resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [targetChoice, attackRoll, damageRollFill(damage, [7])],
  });
}

function resolveRayOfSicknessSpellAttackDamageAndPoisoned(
  state: BattleState,
): BattleResolutionResult {
  const act = actionSpellAct(state, "ray_of_sickness");
  const target = requireHole(act.initialHoles, "targetChoice");
  assertSinglePrimaryTargetChoiceProfile(target, "Ray of Sickness");
  const targetChoice = spellTargetFill(
    target,
    "ray_of_sickness",
    primaryTargetId,
  );
  const attack = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetChoice],
    }),
    "attackRoll",
  );
  assertRayOfSicknessAttackRollProfile(attack);
  const attackRoll = attackRollFill(attack, {
    total: 15,
    naturalD20: 10,
  });
  const damage = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetChoice, attackRoll],
    }),
    "rolledDice",
  );
  assertRayOfSicknessDamageProfile(damage);
  return resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [targetChoice, attackRoll, damageRollFill(damage, [3, 4])],
  });
}

function resolveSacredFlameDexteritySavingThrowRadiantDamage(
  state: BattleState,
): BattleResolutionResult {
  const act = actionSpellAct(state, "sacred_flame");
  const target = requireHole(act.initialHoles, "targetChoice");
  assertSinglePrimaryTargetChoiceProfile(target, "Sacred Flame");
  const targetChoice = spellTargetFill(target, "sacred_flame", primaryTargetId);
  const savingThrow = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetChoice],
    }),
    "savingThrowOutcome",
  );
  assertSacredFlameSavingThrowProfile(savingThrow);
  const savingThrowFill = targetSavingThrowOutcomeFill(savingThrow, {
    targetId: primaryTargetId,
    succeeded: false,
  });
  const damage = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetChoice, savingThrowFill],
    }),
    "rolledDice",
  );
  assertSacredFlameDamageProfile(damage);
  return resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [targetChoice, savingThrowFill, damageRollFill(damage, [7])],
  });
}

function resolveSorcerousBurstSpellAttackDamage(
  state: BattleState,
): BattleResolutionResult {
  const act = actionSpellAct(state, "sorcerous_burst");
  const damageType = requireHole(act.initialHoles, "damageTypeChoice");
  assertSorcerousBurstDamageTypeChoiceProfile(damageType);
  const target = requireHole(act.initialHoles, "targetChoice");
  assertSinglePrimaryTargetChoiceProfile(target, "Sorcerous Burst");
  const damageTypeChoice = damageTypeChoiceFill(damageType, "thunder");
  const targetChoice = spellTargetFill(
    target,
    "sorcerous_burst",
    primaryTargetId,
  );
  const attack = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [damageTypeChoice, targetChoice],
    }),
    "attackRoll",
  );
  assertSorcerousBurstAttackRollProfile(attack);
  const attackRoll = attackRollFill(attack, {
    total: 15,
    naturalD20: 10,
  });
  const damage = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [damageTypeChoice, targetChoice, attackRoll],
    }),
    "rolledDice",
  );
  assertSorcerousBurstDamageProfile(damage);
  return resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      damageTypeChoice,
      targetChoice,
      attackRoll,
      damageRollFill(damage, [8, 2]),
    ],
  });
}

function resolveStarryWispObjectSpellAttackDamageAndDimLight(
  state: BattleState,
): BattleResolutionResult {
  const act = actionSpellAct(state, "starry_wisp");
  const objectTarget = requireHole(act.initialHoles, "objectTargetChoice");
  assertStarryWispObjectTargetProfile(objectTarget);
  const objectChoice = starryWispObjectTargetFill(
    objectTarget,
    starryWispObjectId,
    { kind: "hitPoints", hitPoints: starryWispObjectHitPoints },
  );
  const attack = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [objectChoice],
    }),
    "attackRoll",
  );
  assertStarryWispAttackRollProfile(attack);
  const attackRoll = attackRollFill(attack, {
    total: 18,
    naturalD20: 12,
  });
  const damage = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [objectChoice, attackRoll],
    }),
    "rolledDice",
  );
  assertStarryWispDamageProfile(damage);
  const result = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      objectChoice,
      attackRoll,
      damageRollFill(damage, [starryWispObjectDamageRoll]),
    ],
  });
  assertStarryWispObjectResolution(result);
  return result;
}

function resolveViciousMockeryWisdomSavingThrowPsychicDamageAndNextAttackDisadvantage(
  state: BattleState,
): BattleResolutionResult {
  const act = actionSpellAct(state, "vicious_mockery");
  const target = requireHole(act.initialHoles, "targetChoice");
  assertSinglePrimaryTargetChoiceProfile(target, "Vicious Mockery");
  const targetChoice = spellTargetFill(
    target,
    "vicious_mockery",
    primaryTargetId,
  );
  const savingThrow = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetChoice],
    }),
    "savingThrowOutcome",
  );
  assertViciousMockerySavingThrowProfile(savingThrow);
  const savingThrowFill = targetSavingThrowOutcomeFill(savingThrow, {
    targetId: primaryTargetId,
    succeeded: false,
  });
  const damage = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetChoice, savingThrowFill],
    }),
    "rolledDice",
  );
  assertViciousMockeryDamageProfile(damage);
  return resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [targetChoice, savingThrowFill, damageRollFill(damage, [6])],
  });
}

function resolveIceKnifeAttackAndBurstSavingThrows(
  state: BattleState,
  attackOutcome: IceKnifeAttackOutcome,
): BattleResolutionResult {
  const act = actionSpellAct(state, "ice_knife");
  const target = requireHole(act.initialHoles, "targetChoice");
  assertSinglePrimaryTargetChoiceProfile(target, "Ice Knife");
  const targetChoice = spellTargetFill(target, "ice_knife", primaryTargetId);
  const attack = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetChoice],
    }),
    "attackRoll",
  );
  assertIceKnifeAttackRollProfile(attack);
  const attackRoll = attackRollFill(attack, {
    total: attackOutcome.attackRollTotal,
    naturalD20: attackOutcome.naturalD20,
  });

  const attackFills =
    attackOutcome.kind === "hit"
      ? [
          targetChoice,
          attackRoll,
          iceKnifeAttackDamageRollFill(
            state,
            act.subject,
            [targetChoice, attackRoll],
            attackOutcome.attackDamageRoll,
          ),
        ]
      : [targetChoice, attackRoll];
  const savingThrow = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: attackFills,
    }),
    "savingThrowOutcome",
  );
  assertIceKnifeBurstSavingThrowProfile(savingThrow);
  const savingThrowFill = areaSavingThrowOutcomeFill(
    savingThrow,
    [
      { targetId: primaryTargetId, succeeded: false },
      { targetId: secondaryTargetId, succeeded: true },
    ],
    primaryTargetId,
  );
  const burstDamage = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [...attackFills, savingThrowFill],
    }),
    "rolledDice",
  );
  assertIceKnifeBurstDamageProfile(burstDamage);
  return resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      ...attackFills,
      savingThrowFill,
      damageRollFill(burstDamage, [2, 2]),
    ],
  });
}

function iceKnifeAttackDamageRollFill(
  state: BattleState,
  subject: BattleSubject,
  attackFills: readonly BattleFill[],
  results: readonly [number, ...number[]],
): BattleRolledDiceFill {
  const attackDamage = requireResultHole(
    resolveBattleSubject({
      state,
      subject,
      fills: attackFills,
    }),
    "rolledDice",
  );
  assertIceKnifeAttackDamageProfile(attackDamage);
  return damageRollFill(attackDamage, results);
}

function srdSpellRecord(unitId: Level1DamageSpellUnitId): SpellRecord {
  const unit = unitLibrary.requireUnit(unitId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected SRD catalog unit ${unitId} to be a Spell.`);
  }
  return unit;
}

function level1DamageSpellBattle(spell: SpellRecord): BattleState {
  const isCantrip = spell.mechanics.level === 0;
  const result = startBattle({
    battleId: battleId(`level1-damage-spell-selected-identity-${spell.id}`),
    combatants: [
      level1DamageSpellCreature({
        combatantId: casterId,
        displayName: "Level 1 damage spell caster",
        initiative: 20,
        side: partySide,
        className: "wizard",
        spellcasting: {
          sourceClassName: "wizard",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: isCantrip ? [spell] : [],
          preparedSpells: isCantrip ? [] : [spell],
          featurePreparedSpells: [],
          invocationSpellAccesses: [],
          spellbookRitualSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        },
      }),
      level1DamageSpellCreature({
        combatantId: primaryTargetId,
        displayName: "Level 1 damage spell primary target",
        initiative: 10,
        side: oppositionSide,
        className: "fighter",
      }),
      level1DamageSpellCreature({
        combatantId: secondaryTargetId,
        displayName: "Level 1 damage spell secondary target",
        initiative: 8,
        side: oppositionSide,
        className: "fighter",
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function level1DamageSpellCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly side: typeof partySide | typeof oppositionSide;
  readonly className: CharacterCreatureInit["classLevels"][number]["className"];
  readonly spellcasting?: CharacterSpellcastingInit;
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
      classLevels: [{ className: input.className, level: 1 }],
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
      ...(input.spellcasting === undefined
        ? {}
        : { spellcasting: input.spellcasting }),
    },
  };
}

function actionSpellAct(
  state: BattleState,
  spellId: Level1DamageSpellUnitId,
): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      isExpectedLevel1DamageSpellInvocation(
        candidate.subject.invocation,
        spellId,
      ),
  );
  if (act === undefined) {
    throw new Error(`Expected ${spellId} action Spell act.`);
  }
  return act;
}

function isExpectedLevel1DamageSpellInvocation(
  invocation: ActionSpellAct["subject"]["invocation"],
  spellId: Level1DamageSpellUnitId,
): boolean {
  const profile = level1DamageSpellInvocationProfiles[spellId];
  if (invocation.spellId !== spellId) {
    return false;
  }
  if (
    invocation.tag !== profile.tag ||
    invocation.procedure !== profile.procedure
  ) {
    return false;
  }
  if (profile.tag === "spellSlot") {
    return (
      invocation.tag === "spellSlot" &&
      Number(invocation.slotLevel) === profile.slotLevel
    );
  }
  return true;
}

function spellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  spellId: Level1DamageSpellUnitId,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId,
        targetId,
        spellId,
      },
    ],
  };
}

function spellLeapTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  spellId: Level1DamageSpellUnitId,
  previousTargetId: CombatantId,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "spellLeapTargetWithinRange",
        previousTargetId,
        targetId,
        spellId,
        rangeFeet: CHROMATIC_ORB_LEAP_RANGE_FEET,
      },
    ],
  };
}

function starryWispObjectTargetFill(
  hole: Extract<BattleHole, { readonly kind: "objectTargetChoice" }>,
  objectId: ObjectTargetChoiceFill["value"],
  damageDisposition: BattleObjectDamageDisposition,
): ObjectTargetChoiceFill {
  return {
    kind: "objectTargetChoice",
    holeId: hole.holeId,
    value: objectId,
    spatialFacts: [
      {
        kind: "spellObjectTarget",
        casterId,
        objectId,
        spellId: "starry_wisp",
        rangeFeet: movementFeet(starryWispRangeFeet),
        armorClass: starryWispObjectArmorClass,
        damageDisposition,
      },
    ],
  };
}

function attackRollFill(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
  value: {
    readonly total: number;
    readonly naturalD20: number;
  },
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      total: value.total,
      naturalD20: DieRollResult(value.naturalD20),
    },
  };
}

function damageTypeChoiceFill(
  hole: Extract<BattleHole, { readonly kind: "damageTypeChoice" }>,
  value: Extract<BattleFill, { readonly kind: "damageTypeChoice" }>["value"],
): Extract<BattleFill, { readonly kind: "damageTypeChoice" }> {
  return {
    kind: "damageTypeChoice",
    holeId: hole.holeId,
    value,
  };
}

function areaSavingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
  originAnchorId: CombatantId = casterId,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        originAnchorId,
        affectedTargetIds: outcomes.map((outcome) => outcome.targetId),
      },
      outcomes,
    },
  };
}

function targetSavingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcome: {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  },
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      outcomes: [outcome],
    },
  };
}

function damageRollFill(
  hole: Pick<BattleHole, "kind" | "holeId">,
  results: readonly [number, ...number[]],
): BattleRolledDiceFill {
  if (hole.kind !== "rolledDice") {
    throw new Error("Expected rolledDice hole.");
  }
  const [firstRoll, ...restRolls] = results;
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: [
      {
        results: [DieRollResult(firstRoll), ...restRolls.map(DieRollResult)],
      },
    ],
  };
}

function requireResultHole<K extends BattleHole["kind"]>(
  result: BattleResolutionResult,
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected needsHoles result, got ${result.tag}.`);
  }
  return requireHole(result.holes, kind);
}

function requireHole<K extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  const hole = holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function assertBurningHandsSavingThrowProfile(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
): void {
  if (!("spell" in hole)) {
    throw new Error("Expected Burning Hands spell Saving Throw outcome hole.");
  }
  const invocation = hole.spell;
  if (
    invocation.procedure !== "saveGatedDamage" ||
    invocation.spell.id !== "burning_hands" ||
    hole.ability !== "dex" ||
    hole.dc.kind !== "caster_spell_save_dc" ||
    invocation.targeting.kind !== "selfOriginCone" ||
    Number(invocation.targeting.lengthFeet) !== 15 ||
    invocation.damage.expr.dice !== 3 ||
    invocation.damage.expr.dieSize !== 6 ||
    invocation.damage.damageType !== "fire" ||
    invocation.successDamage !== "half" ||
    Number(invocation.rangeFeet) !== 0
  ) {
    throw new Error("Burning Hands Saving Throw profile drifted.");
  }
}

function assertBurningHandsDamageProfile(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
): void {
  if (!("spell" in hole) || !("critical" in hole)) {
    throw new Error("Expected Burning Hands spell damage roll hole.");
  }
  const invocation = hole.spell;
  if (
    invocation.procedure !== "saveGatedDamage" ||
    invocation.spell.id !== "burning_hands" ||
    invocation.damage.expr.dice !== 3 ||
    invocation.damage.expr.dieSize !== 6 ||
    invocation.damage.damageType !== "fire" ||
    invocation.successDamage !== "half" ||
    hole.critical
  ) {
    throw new Error("Burning Hands damage profile drifted.");
  }
}

function assertChromaticOrbDamageTypeChoiceProfile(
  hole: Extract<BattleHole, { readonly kind: "damageTypeChoice" }>,
): void {
  assertChromaticOrbInvocationProfile(hole.spell);
  if (!sameStringSet(hole.choices, CHROMATIC_ORB_DAMAGE_TYPES)) {
    throw new Error("Chromatic Orb damage type choice profile drifted.");
  }
}

function assertChromaticOrbAttackRollProfile(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
): void {
  if (!("spell" in hole)) {
    throw new Error("Expected Chromatic Orb spell Attack Roll hole.");
  }
  assertChromaticOrbInvocationProfile(hole.spell);
}

function assertChromaticOrbDamageProfile(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
): void {
  if (!("spell" in hole) || !("critical" in hole)) {
    throw new Error("Expected Chromatic Orb damage roll hole.");
  }
  assertChromaticOrbInvocationProfile(hole.spell);
  if (hole.critical) {
    throw new Error("Chromatic Orb damage profile drifted.");
  }
}

function assertChromaticOrbLeapTargetProfile(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
): void {
  if (
    !hole.choices.includes(secondaryTargetId) ||
    hole.choices.includes(primaryTargetId) ||
    hole.requiresTableSpatialFact !== true
  ) {
    throw new Error("Chromatic Orb leap target profile drifted.");
  }
}

function assertChromaticOrbInvocationProfile(
  invocation: SupportedSpellInvocation,
): asserts invocation is ChainedSpellAttackDamageInvocation {
  if (
    invocation.procedure !== "chainedSpellAttackDamage" ||
    invocation.spell.id !== "chromatic_orb" ||
    invocation.resource.tag !== "spellSlot" ||
    Number(invocation.resource.slotLevel) !== 1 ||
    invocation.targeting.kind !== "singleCombatant" ||
    invocation.attackKind !== "ranged_spell_attack" ||
    invocation.damage.expr.dice !== 3 ||
    invocation.damage.expr.dieSize !== 8 ||
    !sameStringSet(invocation.damageTypeChoices, CHROMATIC_ORB_DAMAGE_TYPES) ||
    Number(invocation.rangeFeet) !== 90 ||
    Number(invocation.leapRangeFeet) !== Number(CHROMATIC_ORB_LEAP_RANGE_FEET)
  ) {
    throw new Error("Chromatic Orb chained spell profile drifted.");
  }
}

function assertIceKnifeAttackRollProfile(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
): void {
  if (!("spell" in hole)) {
    throw new Error("Expected Ice Knife spell Attack Roll hole.");
  }
  const invocation = hole.spell;
  if (
    invocation.procedure !== "attackBurstSaveDamage" ||
    invocation.spell.id !== "ice_knife" ||
    invocation.targeting.kind !== "singleCombatant" ||
    invocation.attackKind !== "ranged_spell_attack" ||
    Number(invocation.rangeFeet) !== 60
  ) {
    throw new Error("Ice Knife Attack Roll profile drifted.");
  }
}

function assertIceKnifeAttackDamageProfile(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
): void {
  if (!("spell" in hole) || !("critical" in hole)) {
    throw new Error("Expected Ice Knife attack damage roll hole.");
  }
  const invocation = hole.spell;
  if (
    invocation.procedure !== "attackBurstSaveDamage" ||
    invocation.spell.id !== "ice_knife" ||
    invocation.damage.expr.dice !== 1 ||
    invocation.damage.expr.dieSize !== 10 ||
    invocation.damage.damageType !== "piercing" ||
    hole.critical
  ) {
    throw new Error("Ice Knife attack damage profile drifted.");
  }
}

function assertIceKnifeBurstSavingThrowProfile(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
): void {
  if (!("spell" in hole)) {
    throw new Error("Expected Ice Knife burst Saving Throw outcome hole.");
  }
  const invocation = hole.spell;
  if (
    invocation.procedure !== "attackBurstSaveDamage" ||
    invocation.spell.id !== "ice_knife" ||
    hole.ability !== "dex" ||
    hole.dc.kind !== "caster_spell_save_dc" ||
    invocation.burst.targeting.kind !== "primaryTargetOriginEmanation" ||
    Number(invocation.burst.targeting.radiusFeet) !== 5 ||
    invocation.burst.damage.expr.dice !== 2 ||
    invocation.burst.damage.expr.dieSize !== 6 ||
    invocation.burst.damage.damageType !== "cold" ||
    invocation.burst.successDamage !== "none"
  ) {
    throw new Error("Ice Knife burst Saving Throw profile drifted.");
  }
}

function assertIceKnifeBurstDamageProfile(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
): void {
  if (!("spell" in hole) || !("critical" in hole)) {
    throw new Error("Expected Ice Knife burst damage roll hole.");
  }
  const invocation = hole.spell;
  if (
    invocation.procedure !== "attackBurstSaveDamage" ||
    invocation.spell.id !== "ice_knife" ||
    invocation.burst.damage.expr.dice !== 2 ||
    invocation.burst.damage.expr.dieSize !== 6 ||
    invocation.burst.damage.damageType !== "cold" ||
    invocation.burst.successDamage !== "none" ||
    hole.critical
  ) {
    throw new Error("Ice Knife burst damage profile drifted.");
  }
}

function assertPoisonSprayAttackRollProfile(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
): void {
  if (!("spell" in hole)) {
    throw new Error("Expected Poison Spray spell Attack Roll hole.");
  }
  const invocation = hole.spell;
  if (
    invocation.procedure !== "spellAttackDamage" ||
    invocation.spell.id !== "poison_spray" ||
    invocation.resource.tag !== "none" ||
    invocation.targeting.kind !== "singleCombatant" ||
    invocation.attackKind !== "ranged_spell_attack" ||
    Number(invocation.rangeFeet) !== 30
  ) {
    throw new Error("Poison Spray Attack Roll profile drifted.");
  }
}

function assertPoisonSprayDamageProfile(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
): void {
  if (!("spell" in hole) || !("critical" in hole)) {
    throw new Error("Expected Poison Spray damage roll hole.");
  }
  const invocation = hole.spell;
  if (
    invocation.procedure !== "spellAttackDamage" ||
    invocation.spell.id !== "poison_spray" ||
    invocation.resource.tag !== "none" ||
    invocation.damage.kind !== "fixedSpellAttackDamage" ||
    invocation.damage.expr.dice !== 1 ||
    invocation.damage.expr.dieSize !== 12 ||
    invocation.damage.damageType !== "poison" ||
    invocation.postDamageRiders.length !== 0 ||
    hole.critical
  ) {
    throw new Error("Poison Spray damage profile drifted.");
  }
}

function assertSinglePrimaryTargetChoiceProfile(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  spellName: string,
): void {
  if (
    !hole.choices.includes(primaryTargetId) ||
    hole.requiresTableSpatialFact !== true
  ) {
    throw new Error(`${spellName} target profile drifted.`);
  }
}

function assertRayOfSicknessAttackRollProfile(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
): void {
  if (!("spell" in hole)) {
    throw new Error("Expected Ray of Sickness spell Attack Roll hole.");
  }
  const invocation = hole.spell;
  if (
    invocation.procedure !== "spellAttackDamage" ||
    invocation.spell.id !== "ray_of_sickness" ||
    invocation.resource.tag !== "spellSlot" ||
    Number(invocation.resource.slotLevel) !== 1 ||
    invocation.targeting.kind !== "singleCombatant" ||
    invocation.attackKind !== "ranged_spell_attack" ||
    Number(invocation.rangeFeet) !== 60
  ) {
    throw new Error("Ray of Sickness Attack Roll profile drifted.");
  }
}

function assertRayOfSicknessDamageProfile(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
): void {
  if (!("spell" in hole) || !("critical" in hole)) {
    throw new Error("Expected Ray of Sickness damage roll hole.");
  }
  const invocation = hole.spell;
  if (
    invocation.procedure !== "spellAttackDamage" ||
    invocation.spell.id !== "ray_of_sickness" ||
    invocation.resource.tag !== "spellSlot" ||
    Number(invocation.resource.slotLevel) !== 1 ||
    invocation.damage.kind !== "fixedSpellAttackDamage" ||
    invocation.damage.expr.dice !== 2 ||
    invocation.damage.expr.dieSize !== 8 ||
    invocation.damage.damageType !== "poison" ||
    hole.critical
  ) {
    throw new Error("Ray of Sickness damage profile drifted.");
  }
  const [postDamageRider] = invocation.postDamageRiders;
  if (
    invocation.postDamageRiders.length !== 1 ||
    postDamageRider === undefined ||
    postDamageRider.kind !== "condition" ||
    postDamageRider.condition !== "poisoned" ||
    postDamageRider.expiresAt !== "endOfCasterNextTurn"
  ) {
    throw new Error("Ray of Sickness post-damage rider profile drifted.");
  }
}

function assertSacredFlameSavingThrowProfile(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
): void {
  if (!("spell" in hole)) {
    throw new Error("Expected Sacred Flame spell Saving Throw outcome hole.");
  }
  const invocation = hole.spell;
  if (
    invocation.procedure !== "saveGatedDamage" ||
    invocation.spell.id !== "sacred_flame" ||
    invocation.resource.tag !== "none" ||
    hole.ability !== "dex" ||
    hole.dc.kind !== "caster_spell_save_dc" ||
    invocation.targeting.kind !== "singleCombatant" ||
    invocation.damage.expr.dice !== 1 ||
    invocation.damage.expr.dieSize !== 8 ||
    invocation.damage.damageType !== "radiant" ||
    invocation.successDamage !== "none" ||
    invocation.failedSavePostDamageRiders.length !== 0 ||
    Number(invocation.rangeFeet) !== 60
  ) {
    throw new Error("Sacred Flame Saving Throw profile drifted.");
  }
}

function assertSacredFlameDamageProfile(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
): void {
  if (!("spell" in hole) || !("critical" in hole)) {
    throw new Error("Expected Sacred Flame spell damage roll hole.");
  }
  const invocation = hole.spell;
  if (
    invocation.procedure !== "saveGatedDamage" ||
    invocation.spell.id !== "sacred_flame" ||
    invocation.resource.tag !== "none" ||
    invocation.damage.expr.dice !== 1 ||
    invocation.damage.expr.dieSize !== 8 ||
    invocation.damage.damageType !== "radiant" ||
    invocation.successDamage !== "none" ||
    invocation.failedSavePostDamageRiders.length !== 0 ||
    hole.critical
  ) {
    throw new Error("Sacred Flame damage profile drifted.");
  }
}

function assertViciousMockerySavingThrowProfile(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
): void {
  if (!("spell" in hole)) {
    throw new Error(
      "Expected Vicious Mockery spell Saving Throw outcome hole.",
    );
  }
  const invocation = hole.spell;
  if (
    invocation.procedure !== "saveGatedDamage" ||
    invocation.spell.id !== "vicious_mockery" ||
    invocation.resource.tag !== "none" ||
    hole.ability !== "wis" ||
    hole.dc.kind !== "caster_spell_save_dc" ||
    invocation.targeting.kind !== "singleCombatant" ||
    invocation.damage.expr.dice !== 1 ||
    invocation.damage.expr.dieSize !== 6 ||
    invocation.damage.damageType !== "psychic" ||
    invocation.successDamage !== "none" ||
    Number(invocation.rangeFeet) !== 60
  ) {
    throw new Error("Vicious Mockery Saving Throw profile drifted.");
  }
  assertViciousMockeryFailedSavePostDamageRiders(
    invocation.failedSavePostDamageRiders,
  );
}

function assertViciousMockeryDamageProfile(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
): void {
  if (!("spell" in hole) || !("critical" in hole)) {
    throw new Error("Expected Vicious Mockery spell damage roll hole.");
  }
  const invocation = hole.spell;
  if (
    invocation.procedure !== "saveGatedDamage" ||
    invocation.spell.id !== "vicious_mockery" ||
    invocation.resource.tag !== "none" ||
    invocation.damage.expr.dice !== 1 ||
    invocation.damage.expr.dieSize !== 6 ||
    invocation.damage.damageType !== "psychic" ||
    invocation.successDamage !== "none" ||
    hole.critical
  ) {
    throw new Error("Vicious Mockery damage profile drifted.");
  }
  assertViciousMockeryFailedSavePostDamageRiders(
    invocation.failedSavePostDamageRiders,
  );
}

function assertViciousMockeryFailedSavePostDamageRiders(
  riders: readonly SpellFailedSavePostDamageRider[],
): void {
  const [rider] = riders;
  if (
    riders.length !== 1 ||
    rider === undefined ||
    rider.kind !== "nextAttackRollByTarget" ||
    rider.mode !== "disadvantage" ||
    rider.expiresAt !== "endOfTargetNextTurn"
  ) {
    throw new Error("Vicious Mockery failed-save rider profile drifted.");
  }
}

function assertSorcerousBurstDamageTypeChoiceProfile(
  hole: Extract<BattleHole, { readonly kind: "damageTypeChoice" }>,
): void {
  const invocation = hole.spell;
  if (
    invocation.procedure !== "spellAttackDamage" ||
    invocation.spell.id !== "sorcerous_burst" ||
    invocation.resource.tag !== "none" ||
    invocation.targeting.kind !== "singleCreatureOrObject" ||
    invocation.attackKind !== "ranged_spell_attack" ||
    invocation.damage.kind !== "sorcerousBurstDamageTypeChoice" ||
    invocation.damage.expr.dice !== 1 ||
    invocation.damage.expr.dieSize !== 8 ||
    invocation.damage.maxDieAdditionalDiceLimit !== 3 ||
    !sameStringSet(hole.choices, sorcerousBurstDamageTypes) ||
    !sameStringSet(
      invocation.damage.damageTypeChoices,
      sorcerousBurstDamageTypes,
    ) ||
    Number(invocation.rangeFeet) !== 120
  ) {
    throw new Error("Sorcerous Burst damage type choice profile drifted.");
  }
}

function assertSorcerousBurstAttackRollProfile(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
): void {
  if (!("spell" in hole)) {
    throw new Error("Expected Sorcerous Burst spell Attack Roll hole.");
  }
  const invocation = hole.spell;
  if (
    invocation.procedure !== "spellAttackDamage" ||
    invocation.spell.id !== "sorcerous_burst" ||
    invocation.resource.tag !== "none" ||
    invocation.targeting.kind !== "singleCreatureOrObject" ||
    invocation.attackKind !== "ranged_spell_attack" ||
    invocation.damage.kind !== "selectedSorcerousBurstDamage" ||
    invocation.damage.expr.dice !== 1 ||
    invocation.damage.expr.dieSize !== 8 ||
    invocation.damage.damageType !== "thunder" ||
    invocation.damage.maxDieAdditionalDiceLimit !== 3 ||
    Number(invocation.rangeFeet) !== 120
  ) {
    throw new Error("Sorcerous Burst Attack Roll profile drifted.");
  }
}

function assertSorcerousBurstDamageProfile(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
): void {
  if (!("spell" in hole) || !("critical" in hole)) {
    throw new Error("Expected Sorcerous Burst damage roll hole.");
  }
  const invocation = hole.spell;
  if (
    invocation.procedure !== "spellAttackDamage" ||
    invocation.spell.id !== "sorcerous_burst" ||
    invocation.resource.tag !== "none" ||
    invocation.damage.kind !== "selectedSorcerousBurstDamage" ||
    invocation.damage.expr.dice !== 1 ||
    invocation.damage.expr.dieSize !== 8 ||
    invocation.damage.damageType !== "thunder" ||
    invocation.damage.maxDieAdditionalDiceLimit !== 3 ||
    invocation.postDamageRiders.length !== 0 ||
    hole.label !== "Sorcerous Burst damage (1d8-thunder)" ||
    hole.critical
  ) {
    throw new Error("Sorcerous Burst damage profile drifted.");
  }
}

function assertStarryWispObjectTargetProfile(
  hole: Extract<BattleHole, { readonly kind: "objectTargetChoice" }>,
): void {
  if (hole.requiresTableSpatialFact !== true) {
    throw new Error("Starry Wisp object target profile drifted.");
  }
}

function assertStarryWispAttackRollProfile(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
): void {
  if (!("spell" in hole)) {
    throw new Error("Expected Starry Wisp spell Attack Roll hole.");
  }
  const invocation = hole.spell;
  if (
    invocation.procedure !== "spellAttackDamage" ||
    invocation.spell.id !== "starry_wisp" ||
    invocation.resource.tag !== "none" ||
    invocation.targeting.kind !== "singleCreatureOrObject" ||
    invocation.attackKind !== "ranged_spell_attack" ||
    invocation.damage.kind !== "fixedSpellAttackDamage" ||
    invocation.damage.expr.dice !== 1 ||
    invocation.damage.expr.dieSize !== 8 ||
    invocation.damage.damageType !== "radiant" ||
    Number(invocation.rangeFeet) !== starryWispRangeFeet
  ) {
    throw new Error("Starry Wisp Attack Roll profile drifted.");
  }
  assertStarryWispPostDamageRiders(invocation.postDamageRiders);
}

function assertStarryWispDamageProfile(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
): void {
  if (!("spell" in hole) || !("critical" in hole)) {
    throw new Error("Expected Starry Wisp damage roll hole.");
  }
  const invocation = hole.spell;
  if (
    invocation.procedure !== "spellAttackDamage" ||
    invocation.spell.id !== "starry_wisp" ||
    invocation.resource.tag !== "none" ||
    invocation.damage.kind !== "fixedSpellAttackDamage" ||
    invocation.damage.expr.dice !== 1 ||
    invocation.damage.expr.dieSize !== 8 ||
    invocation.damage.damageType !== "radiant" ||
    hole.label !== "Starry Wisp damage (1d8-radiant)" ||
    hole.critical
  ) {
    throw new Error("Starry Wisp damage profile drifted.");
  }
  assertStarryWispPostDamageRiders(invocation.postDamageRiders);
}

function assertStarryWispPostDamageRiders(
  riders: readonly SpellPostDamageRider[],
): void {
  const lightRider = riders.find(
    (
      rider,
    ): rider is Extract<
      SpellPostDamageRider,
      { readonly kind: "lightEmission" }
    > => rider.kind === "lightEmission",
  );
  const invisibleRider = riders.find(
    (
      rider,
    ): rider is Extract<
      SpellPostDamageRider,
      { readonly kind: "invisibleBenefitDenied" }
    > => rider.kind === "invisibleBenefitDenied",
  );
  if (
    riders.length !== 2 ||
    lightRider === undefined ||
    lightRider.emission.kind !== "dim" ||
    Number(lightRider.emission.radiusFeet) !== starryWispDimLightRadiusFeet ||
    lightRider.expiresAt !== "endOfCasterNextTurn" ||
    invisibleRider === undefined ||
    invisibleRider.expiresAt !== "endOfCasterNextTurn"
  ) {
    throw new Error("Starry Wisp post-damage rider profile drifted.");
  }
}

function assertStarryWispObjectResolution(
  result: BattleResolutionResult,
): asserts result is Extract<
  BattleResolutionResult,
  { readonly tag: "resolved" }
> {
  if (result.tag !== "resolved") {
    throw new Error(
      `Expected Starry Wisp object spell action to resolve, got ${result.tag}.`,
    );
  }

  const [objectDamage] = result.objectDamages ?? [];
  if (
    result.objectDamages?.length !== 1 ||
    objectDamage === undefined ||
    objectDamage.kind !== "hitPoints" ||
    objectDamage.objectId !== starryWispObjectId ||
    objectDamage.damageType !== "radiant" ||
    Number(objectDamage.rolledDamage) !== starryWispObjectDamageRoll ||
    Number(objectDamage.effectiveDamage) !== starryWispObjectDamageRoll ||
    Number(objectDamage.priorHitPoints) !== Number(starryWispObjectHitPoints) ||
    Number(objectDamage.nextHitPoints) !== 0 ||
    !objectDamage.destroyed
  ) {
    throw new Error("Starry Wisp object damage outcome drifted.");
  }

  const [emitter] = result.state.lightEmitters;
  if (
    result.state.lightEmitters.length !== 1 ||
    emitter === undefined ||
    emitter.kind !== "objectInvisibleRevealLightEmitter" ||
    emitter.sourceSpellId !== "starry_wisp" ||
    emitter.sourceCombatantId !== casterId ||
    emitter.objectId !== starryWispObjectId ||
    emitter.emission.kind !== "dim" ||
    Number(emitter.emission.radiusFeet) !== starryWispDimLightRadiusFeet ||
    emitter.expiresAt.kind !== "endOfTurn" ||
    emitter.expiresAt.combatantId !== casterId ||
    !objectInvisibleBenefitDenied(result.state, starryWispObjectId)
  ) {
    throw new Error("Starry Wisp object Dim Light boundary drifted.");
  }
}

function sameStringSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  const leftValues = new Set(left);
  const rightValues = new Set(right);
  return (
    leftValues.size === left.length &&
    rightValues.size === right.length &&
    left.length === right.length &&
    left.every((value) => rightValues.has(value))
  );
}

function projectLevel1DamageSpellSelectedIdentityState(
  state: BattleState,
  lastResult: Level1DamageSpellSelectedIdentityProjection["lastResult"],
): Level1DamageSpellSelectedIdentityProjection {
  const snapshot = snapshotBattle(state);
  const primaryTarget = snapshot.combatants.find(
    (combatant) => combatant.combatantId === primaryTargetId,
  );
  const secondaryTarget = snapshot.combatants.find(
    (combatant) => combatant.combatantId === secondaryTargetId,
  );
  if (primaryTarget === undefined || secondaryTarget === undefined) {
    throw new Error("Expected Level 1 damage spell selected identity targets.");
  }
  return {
    actionAvailable: snapshot.turn.actionResources.some(
      (resource) => resource.source === "turn",
    ),
    spellSlotSpentThisTurn:
      state.currentTurnResources.spellSlotUsesThisTurn.some((use) => use.kind === "committed"),
    level1SlotsRemaining: level1SlotsRemaining(state, casterId),
    primaryTargetHp: primaryTarget.hp,
    primaryTargetPoisoned: primaryTarget.conditions.includes("poisoned"),
    primaryTargetNextAttackRollDisadvantage:
      primaryTargetHasViciousMockeryNextAttackRollDisadvantage(state),
    secondaryTargetHp: secondaryTarget.hp,
    lastResult,
  };
}

function primaryTargetHasViciousMockeryNextAttackRollDisadvantage(
  state: BattleState,
): boolean {
  return (
    state.combatants
      .get(primaryTargetId)
      ?.activeEffects.some(
        (effect) =>
          effect.kind === "nextAttackRollBySelf" &&
          "sourceSpellId" in effect &&
          effect.sourceSpellId === "vicious_mockery" &&
          effect.sourceCombatantId === casterId &&
          effect.mode === "disadvantage",
      ) === true
  );
}

function level1SlotsRemaining(
  state: BattleState,
  actorId: CombatantId,
): number {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected Level 1 damage spell caster character origin.");
  }
  const slot = actor.origin.spellcasting?.spellSlots.find(
    (candidate) => Number(candidate.spellLevel) === 1,
  );
  return slot === undefined ? 0 : Number(slot.count) - Number(slot.expended);
}
