import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.bardic-inspiration-failed-d20-test unit-feature.innate-sorcery-activation unit-feature.martial-arts-attack-projection unit-feature.weapon-mastery-sap unit-feature.weapon-mastery-topple unit-feature.weapon-mastery-cleave spell.invocation-independent-attack-sequence spell.invocation-condition-save spell.invocation-damage-save-or-attack spell.invocation-fog-cloud-obscurement spell.invocation-grease-ground-hazard spell.invocation-make-stable spell.invocation-marked-damage-rider spell.invocation-sleep-repeat-save-lifecycle spell.invocation-sleep-target-admission spell.invocation-weapon-damage-rider
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV72B bard_bardic_inspiration
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV75B sorcerer_innate_sorcery
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV84C spare_the_dying
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV84D hex
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV84E fog_cloud
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV87C ranger_favored_enemy
import { Schema } from "effect";
import * as Either from "effect/Either";
import * as Option from "effect/Option";
import { expect } from "vitest";

import {
  ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE,
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
  BARDIC_INSPIRATION_GRANT_SUPPORT_PROFILE,
  PACT_OF_THE_CHAIN_FIND_FAMILIAR_INVOCATION_MODE,
  battleBonusActionStandardActionSupportForUnit,
  REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
  WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE,
  SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
  WEAPON_MASTERY_CLEAVE_SUPPORT_PROFILE,
  WEAPON_MASTERY_SAP_SUPPORT_PROFILE,
  WEAPON_MASTERY_TOPPLE_SUPPORT_PROFILE,
  ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE,
  BattleFillSchema,
  BattleHoleSchema,
  BattleSnapshotSchema,
  battleCombatantSide,
  BattleSubjectSchema,
  BATTLE_READIED_SPELL_TRIGGERS,
  addBattleCombatant,
  battleAreaId,
  battleObscurementZones,
  battleDruidWildShapeKnownForms,
  battleReactionRollOrDamageReductionSupportForUnit,
  battleUnitSupportProfilesForUnit,
  battleId,
  battleObjectId,
  armorOfShadowsSpellInvocationRef,
  cantripSpellInvocationRef,
  classFeatureFreeCastSpellInvocationRef,
  breakBattleConcentration,
  characterBattleResourceUsage,
  characterBattleResourceSupportedForUnit,
  characterId,
  concentrationSavingThrowDc,
  combatantId,
  discoverBattleActs,
  endTurn,
  findFamiliarFormEligibilityForSpell,
  initiativeScore,
  KNOCKED_OUT_UNCONSCIOUS,
  objectInvisibleBenefitDenied,
  parseSupportedUnitFeatureProfile,
  resolveBattleSubject,
  resolveBardicInspirationFailedD20Test,
  resolveBattleReaction,
  resolveBattleConcentrationDamage,
  removeBattleCombatants,
  sameBattleSubject,
  snapshotBattle,
  spellSaveDcForCaster,
  spellSlotInvocationRef,
  startBattle,
  pactOfTheChainFindFamiliarFormEligibilityForSpell,
  resolveFailedAbilityCheckResourceBoost,
  resolveFindFamiliarForm,
  resolvePactOfTheChainFindFamiliarForm,
  resolveSuccessfulAbilityCheckReactionReduction,
  type BattleAreaId,
  type BattleFill,
  type BattleHole,
  type BattleHidePrerequisite,
  type BattleReactionFrame,
  type BattleReadiedSpellTrigger,
  type BattleState,
  type BattleSubject,
  type BattleCreatureState,
  type CombatantId,
  type BattleCreatureInit,
  type BattleUnitRef,
  type ActiveOngoingFeatureOccurrence,
  type OngoingFeatureSourceKey,
  type SpellInvocationRef,
} from "./index.ts";
import {
  characterBattleResourceIsUseCount,
  characterBattleResourceIsUnlimited,
  parseCharacterBattleClassLevels,
} from "./character-battle-resources.ts";
import {
  supportedSpellInvocationMatchesRef,
  supportedSpellInvocationRef,
} from "./battle-reducer/spells-invocation-ref.ts";
import { supportedSpellActs } from "./battle-reducer/spells-profiles.ts";
import { applyBattleHitPointDamage } from "./battle-reducer/damage-apply.ts";
import { spellFillSet } from "./battle-reducer/spells-resolve-fill-set.ts";
import { resolveMarkedDamageRiderSpellAct } from "./battle-reducer/spells-resolve-release.ts";
import weaponQuarterstaffInput from "../../surface/content/weapon_quarterstaff.json";
import weaponLongbowInput from "../../surface/content/weapon_longbow.json";
import {
  abilityModifier,
  armorClass,
  defaultArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import type { ConditionState } from "@dnd/shared-algebras/conditions-algebra";
import {
  applyCondition,
  hasCondition,
  removeCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import {
  elapsedTimeTicks,
  elapsedTimeTicksFromHours,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import { tickDurationEffects } from "./battle-reducer/turn-end-movement.ts";
import { combatantCanSee } from "./battle-reducer/creature-state-leaves.ts";
import { requiredAbilityCheckRollMode } from "./battle-reducer/hole-helpers.ts";
import { applyWeaponMasterySapOnHit } from "./battle-reducer/attack-roll.ts";
import {
  holeId,
  holeInstanceKey,
  type AttackRollMode,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  attackBonus,
  abilityModifier as battleAbilityModifier,
  damageAmount,
  difficultyClass,
  DieRollResult,
  Hp,
  movementDeltaFeet,
  movementFeet,
  proficiencyBonus,
  resourceCount,
  type Condition,
} from "@dnd/shared/types";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { isEffectAtom } from "@dnd/surface/surface/types";
import magicMissileInput from "../../surface/content/magic_missile.json";
import mageArmorInput from "../../surface/content/mage_armor.json";
import rayOfFrostInput from "../../surface/content/ray_of_frost.json";
import acidSplashInput from "../../surface/content/acid_splash.json";
import chillTouchInput from "../../surface/content/chill_touch.json";
import eldritchBlastInput from "../../surface/content/eldritch_blast.json";
import poisonSprayInput from "../../surface/content/poison_spray.json";
import sacredFlameInput from "../../surface/content/sacred_flame.json";
import inflictWoundsInput from "../../surface/content/inflict_wounds.json";
import shockingGraspInput from "../../surface/content/shocking_grasp.json";
import guidingBoltInput from "../../surface/content/guiding_bolt.json";
import rayOfSicknessInput from "../../surface/content/ray_of_sickness.json";
import fireBoltInput from "../../surface/content/fire_bolt.json";
import starryWispInput from "../../surface/content/starry_wisp.json";
import viciousMockeryInput from "../../surface/content/vicious_mockery.json";
import burningHandsInput from "../../surface/content/burning_hands.json";
import colorSprayInput from "../../surface/content/color_spray.json";
import iceKnifeInput from "../../surface/content/ice_knife.json";
import greaseInput from "../../surface/content/grease.json";
import fogCloudInput from "../../surface/content/fog_cloud.json";
import huntersMarkInput from "../../surface/content/hunters_mark.json";
import hexInput from "../../surface/content/hex.json";
import findFamiliarInput from "../../surface/content/find_familiar.json";
import healingWordInput from "../../surface/content/healing_word.json";
import spareTheDyingInput from "../../surface/content/spare_the_dying.json";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import type {
  AreaDirectEffectAtom,
  EffectAtom,
  SpellRecord,
  StatBlockRecord,
  UnitRecord,
  WeaponRecord,
} from "@dnd/surface/surface/types";

const execFileAsync = promisify(execFile);

export function startBattleRight(
  input: Parameters<typeof startBattle>[0],
): BattleState {
  const result = startBattle(input);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

export const ROGUE_CUNNING_ACTION_SUPPORT_PROFILE = {
  kind: "alternateActionCost",
  from: {
    kind: "standardAction",
    actions: ["dash", "disengage", "hide"],
  },
  to: { kind: "bonusAction" },
} as const;

export function testBattleCreatureStateWithConditions(
  combatant: BattleState["combatants"] extends ReadonlyMap<
    CombatantId,
    infer Creature
  >
    ? Creature
    : never,
  conditions: ConditionState,
) {
  if (combatant.positiveHpUnconscious !== null) {
    throw new Error("Test fixture must not rewrite Knocked Out conditions.");
  }
  return { ...combatant, conditions, positiveHpUnconscious: null };
}

export function addBattleCombatantRight(
  input: Parameters<typeof addBattleCombatant>[0],
): BattleState {
  const result = addBattleCombatant(input);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

export function removeBattleCombatantsRight(
  input: Parameters<typeof removeBattleCombatants>[0],
): BattleState {
  const result = removeBattleCombatants(input);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

export const partySide = battleCombatantSide("party");
export const oppositionSide = battleCombatantSide("opposition");
const battleRuntimeSelfTestSpecPath = fileURLToPath(
  new URL("../battle-runtime-self-tests.qnt", import.meta.url),
);
export const canonicalBattleRuntimeQntSelfTestTimeoutMs = 300_000;
export const fighterId = combatantId("fighter");
export const goblinId = combatantId("goblin");
export const skeletonId = combatantId("skeleton");
export const wizardId = combatantId("wizard");
export const secondWizardId = combatantId("second-wizard");
export const secondSkeletonId = combatantId("second-skeleton");
export const distantFighterId = combatantId("distant-fighter");
export const longRangeFighterId = combatantId("long-range-fighter");
type BattleFillableHole = Pick<BattleHole, "kind" | "holeId">;
type DamageRollValue = Extract<
  BattleFill,
  { readonly kind: "rolledDice" }
>["value"];
type TestCharacterWeaponAttack = Extract<
  NonNullable<
    Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["attack"]
  >,
  { readonly kind: "weapon" }
>;
const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});

export function requireElapsedHours(hours: number) {
  const parsed = elapsedTimeTicksFromHours(hours);
  if (Either.isLeft(parsed)) {
    throw new Error(`invalid test elapsed hours: ${hours}`);
  }
  return parsed.right;
}

if (unitCatalogResult.tag !== "ok" || statBlockCatalogResult.tag !== "ok") {
  throw new Error("Battle runtime test catalogs must build successfully.");
}

export const unitLibrary = unitCatalogResult.catalog;
export const statBlockCatalog = statBlockCatalogResult.catalog;
const testSpellRecords = new Map(
  [
    magicMissileInput,
    mageArmorInput,
    rayOfFrostInput,
    acidSplashInput,
    chillTouchInput,
    eldritchBlastInput,
    poisonSprayInput,
    sacredFlameInput,
    inflictWoundsInput,
    shockingGraspInput,
    guidingBoltInput,
    rayOfSicknessInput,
    fireBoltInput,
    starryWispInput,
    viciousMockeryInput,
    burningHandsInput,
    colorSprayInput,
    iceKnifeInput,
    greaseInput,
    fogCloudInput,
    huntersMarkInput,
    hexInput,
    healingWordInput,
    spareTheDyingInput,
  ]
    .map((input) => decodeUnitRecordSync(input))
    .flatMap((unit) =>
      unit.kind === "spell"
        ? [[unit.id, unit] satisfies [string, SpellRecord]]
        : [],
    ),
);
const findFamiliarSpellRecord = decodeUnitRecordSync(findFamiliarInput);
if (findFamiliarSpellRecord.kind !== "spell") {
  throw new Error("Find Familiar test input must decode to a spell record.");
}
testSpellRecords.set(findFamiliarSpellRecord.id, findFamiliarSpellRecord);

export function requireResolved(
  result: ReturnType<typeof resolveBattleSubject>,
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
> {
  if (result.tag !== "resolved") {
    throw new Error(`Expected resolved battle result, got ${result.tag}.`);
  }

  return result;
}

export function requireBardicInspirationD20TestResolved(
  result: ReturnType<typeof resolveBardicInspirationFailedD20Test>,
): Extract<
  ReturnType<typeof resolveBardicInspirationFailedD20Test>,
  { readonly tag: "resolved" }
> {
  if (result.tag !== "resolved") {
    throw new Error(`Expected resolved battle result, got ${result.tag}.`);
  }

  return result;
}

export function requireNeedsHoles(
  result: ReturnType<typeof resolveBattleSubject>,
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "needsHoles" }
> {
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected needsHoles battle result, got ${result.tag}.`);
  }

  return result;
}

export function subjectName(
  subject: BattleSubject,
):
  | "attack"
  | "dash"
  | "disengage"
  | "dodge"
  | "helpAttack"
  | "hide"
  | "multiattack"
  | "ready"
  | "search"
  | "grapple"
  | "shove"
  | "escapeGrapple"
  | "escapeSpellRestraint"
  | "shakeAwakeFromSleep"
  | "offHandAttack"
  | "martialArtsUnarmedStrike"
  | "statBlockActionOption"
  | "actionSpell"
  | "bonusActionSpell"
  | "bonusActionDashSpell"
  | "pactOfTheChainFamiliarAttack"
  | "monkFocusOption"
  | "monkFocusFlurryOfBlowsStrike"
  | "unitFeature"
  | "druidWildShape"
  | "endTurn"
  | "move"
  | "standFromProne"
  | "releaseGrapple"
  | "releaseReadiedSpell"
  | "releaseReadiedMovement"
  | "releaseSpellCreatedHeldObject"
  | "castTriggeredReactionSpell"
  | "castAttackHitBonusActionSpell"
  | "opportunityAttack"
  | "greaseGroundHazardSave"
  | "webRestraintSave"
  | "webRestrainedNoLongerInArea"
  | "webAreaRemoved"
  | "gustOfWindLineSave"
  | "gustOfWindLineDirectionChange"
  | "movableZoneSave"
  | "movableZoneReposition"
  | "movableZoneRam"
  | "jumpMovementReplacement"
  | "dragonsBreathExhale"
  | "replaceSelfTransformationMode"
  | "commandGrovel"
  | "commandDrop"
  | "commandApproach"
  | "commandFlee"
  | "disperseFogCloud"
  | "wardingBondSeparation"
  | "protectionRelevantEffectSave"
  | "creatureFalls" {
  if (subject.tag === "action") {
    return subject.action;
  }
  if (subject.tag === "pactOfTheChainFamiliarAttack") {
    return subject.tag;
  }
  if (subject.tag === "bonusAction") {
    return subject.action;
  }
  if (subject.tag === "bonusActionStandardAction") {
    return subject.action;
  }
  if (
    subject.tag === "monkFocusOption" ||
    subject.tag === "monkFocusFlurryOfBlowsStrike"
  ) {
    return subject.tag;
  }
  if (subject.tag === "actionSpell") {
    return "actionSpell";
  }
  if (subject.tag === "bonusActionSpell") {
    return "bonusActionSpell";
  }
  if (subject.tag === "bonusActionDashSpell") {
    return "bonusActionDashSpell";
  }
  if (subject.tag === "unitFeature") {
    return "unitFeature";
  }
  if (subject.tag === "druidWildShape") {
    return "druidWildShape";
  }
  return subject.command;
}

export async function runCanonicalBattleRuntimeQntSelfTests(): Promise<void> {
  const { stdout } = await execFileAsync(
    "pnpm",
    [
      "exec",
      "quint",
      "test",
      "--backend",
      "typescript",
      battleRuntimeSelfTestSpecPath,
      "--match",
      "test_",
    ],
    { encoding: "utf8" },
  );
  expect(stdout).toContain("passing");
}

export function hidePrerequisites(
  entries: readonly (readonly [CombatantId, BattleHidePrerequisite])[],
): ReadonlyMap<CombatantId, BattleHidePrerequisite> {
  return new Map(entries);
}

export function fighterVsGoblinBattle(input?: {
  readonly hidePrerequisites?: ReadonlyMap<CombatantId, BattleHidePrerequisite>;
  readonly characterUnitRefs?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"];
  readonly weaponMasteries?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["weaponMasteries"];
  readonly attack?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"];
}): BattleState {
  return startBattleRight({
    battleId: battleId("battle-attack"),
    combatants: [
      characterSeed({
        initiative: 20,
        ...(input?.characterUnitRefs === undefined
          ? {}
          : { characterUnitRefs: input.characterUnitRefs }),
        ...(input?.weaponMasteries === undefined
          ? {}
          : { weaponMasteries: input.weaponMasteries }),
        ...(input?.attack === undefined ? {} : { attack: input.attack }),
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
    ...(input?.hidePrerequisites === undefined
      ? {}
      : { hidePrerequisites: input.hidePrerequisites }),
  });
}

export function criticalRange19UnitRefs(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"] {
  return [
    {
      unitId: "fighter_improved_critical",
      supportProfiles: [WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE],
    },
  ];
}

export function sneakAttackUnitRefs(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"] {
  return [
    {
      unitId: "rogue_sneak_attack",
      supportProfiles: [ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE],
    },
  ];
}

export function masterySapUnitRefs(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"] {
  return [
    {
      unitId: "mastery_sap",
      supportProfiles: [WEAPON_MASTERY_SAP_SUPPORT_PROFILE],
    },
  ];
}

export function masteryToppleUnitRefs(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"] {
  return [
    {
      unitId: "mastery_topple",
      supportProfiles: [WEAPON_MASTERY_TOPPLE_SUPPORT_PROFILE],
    },
  ];
}

export function masteryCleaveUnitRefs(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"] {
  return [
    {
      unitId: "mastery_cleave",
      supportProfiles: [WEAPON_MASTERY_CLEAVE_SUPPORT_PROFILE],
    },
  ];
}

export function longswordWeaponMasterySelections(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["weaponMasteries"] {
  return [
    {
      weaponUnitId: "weapon_longsword",
    },
  ];
}

export function greataxeWeaponMasterySelections(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["weaponMasteries"] {
  return [
    {
      weaponUnitId: "weapon_greataxe",
    },
  ];
}

export function longbowWeaponMasterySelections(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["weaponMasteries"] {
  return [
    {
      weaponUnitId: "weapon_longbow",
    },
  ];
}

export function quarterstaffWeaponMasterySelections(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["weaponMasteries"] {
  return [
    {
      weaponUnitId: "weapon_quarterstaff",
    },
  ];
}

export function fighterGrapplesGoblin(
  state: BattleState,
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
> {
  const subject: BattleSubject = {
    tag: "action",
    actorId: fighterId,
    action: "grapple",
  };
  const target = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const outcome = requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [targetFill(target, goblinId)],
    }),
    "grappleOutcome",
  );
  return requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [targetFill(target, goblinId), grappleOutcomeFill(outcome, false)],
    }),
  );
}

export function fighterTurnWithReadiedRay(
  trigger: BattleReadiedSpellTrigger,
): BattleState {
  const wizardReady = resolveBattleSubject({
    state: startBattleRight({
      battleId: battleId(`battle-readied-${trigger}`),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 30,
          attack: null,
          spellcasting: wizardSpellcasting(),
        }),
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    }),
    subject: {
      tag: "actionSpell",
      actorId: wizardId,
      invocation: cantripSpellInvocationRef(
        "ray_of_frost",
        "spellAttackDamage",
      ),
      mode: { tag: "ready", trigger },
    },
    fills: [],
  });
  if (wizardReady.tag !== "resolved") {
    throw new Error(`Expected resolved Ready Spell, got ${wizardReady.tag}.`);
  }
  if (wizardReady.state.readiedSpells.get(wizardId) === undefined) {
    throw new Error("Expected Wizard to hold a readied spell.");
  }
  const fighterTurn = endTurn({ state: wizardReady.state, actorId: wizardId });
  if (fighterTurn.tag !== "resolved") {
    throw new Error(`Expected resolved End Turn, got ${fighterTurn.tag}.`);
  }
  return fighterTurn.state;
}

export function fighterTurnWithReadiedRayAndHealer(
  trigger: BattleReadiedSpellTrigger,
): BattleState {
  const wizardReady = resolveBattleSubject({
    state: startBattleRight({
      battleId: battleId(`battle-readied-${trigger}-healing-word`),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 30,
          attack: null,
          spellcasting: wizardSpellcasting(),
        }),
        characterSeed({
          initiative: 20,
          currentHp: 4,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("healing_word")],
          }),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    }),
    subject: {
      tag: "actionSpell",
      actorId: wizardId,
      invocation: cantripSpellInvocationRef(
        "ray_of_frost",
        "spellAttackDamage",
      ),
      mode: { tag: "ready", trigger },
    },
    fills: [],
  });
  if (wizardReady.tag !== "resolved") {
    throw new Error(`Expected resolved Ready Spell, got ${wizardReady.tag}.`);
  }
  const fighterTurn = endTurn({ state: wizardReady.state, actorId: wizardId });
  if (fighterTurn.tag !== "resolved") {
    throw new Error(`Expected resolved End Turn, got ${fighterTurn.tag}.`);
  }
  return fighterTurn.state;
}

export function fighterTurnWithReadiedAcidAndSecondReadiedRay(): BattleState {
  const firstReady = requireResolved(
    resolveBattleSubject({
      state: startBattleRight({
        battleId: battleId("battle-nested-readied-reactions"),
        combatants: [
          characterSeed({
            combatantId: wizardId,
            displayName: "Wizard",
            initiative: 40,
            attack: null,
            spellcasting: wizardSpellcasting(),
          }),
          characterSeed({
            combatantId: secondWizardId,
            displayName: "Second Wizard",
            initiative: 30,
            attack: null,
            spellcasting: wizardSpellcasting(),
          }),
          characterSeed({ initiative: 20 }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
      subject: {
        tag: "actionSpell",
        actorId: wizardId,
        invocation: cantripSpellInvocationRef("acid_splash", "saveGatedDamage"),
        mode: { tag: "ready", trigger: "attackHit" },
      },
      fills: [],
    }),
  ).state;
  const secondWizardTurn = requireResolved(
    endTurn({ state: firstReady, actorId: wizardId }),
  ).state;
  const secondReady = requireResolved(
    resolveBattleSubject({
      state: secondWizardTurn,
      subject: {
        tag: "actionSpell",
        actorId: secondWizardId,
        invocation: cantripSpellInvocationRef(
          "ray_of_frost",
          "spellAttackDamage",
        ),
        mode: { tag: "ready", trigger: "saveFailed" },
      },
      fills: [],
    }),
  ).state;
  return requireResolved(
    endTurn({ state: secondReady, actorId: secondWizardId }),
  ).state;
}

export function wizardTurnWithReadiedRay(
  trigger: BattleReadiedSpellTrigger,
): BattleState {
  const base = wizardVsSkeletonBattle();
  const wizardReady = resolveBattleSubject({
    state: base,
    subject: {
      tag: "actionSpell",
      actorId: wizardId,
      invocation: cantripSpellInvocationRef(
        "ray_of_frost",
        "spellAttackDamage",
      ),
      mode: { tag: "ready", trigger },
    },
    fills: [],
  });
  if (wizardReady.tag !== "resolved") {
    throw new Error(`Expected resolved Ready Spell, got ${wizardReady.tag}.`);
  }
  const readied = wizardReady.state.readiedSpells.get(wizardId);
  const concentratingWizard = wizardReady.state.combatants.get(wizardId);
  if (readied === undefined || concentratingWizard === undefined) {
    throw new Error("Expected Wizard to hold a readied spell.");
  }
  return {
    ...base,
    combatants: new Map(base.combatants).set(wizardId, concentratingWizard),
    readiedSpells: new Map([[wizardId, readied]]),
  };
}

export function goblinTurnBattle(
  input: { readonly fighterHp?: number } = {},
): BattleState {
  const afterFighter = endTurn({
    state: startBattleRight({
      battleId: battleId("battle-goblin-attack"),
      combatants: [
        characterSeed({
          initiative: 20,
          ...(input.fighterHp === undefined
            ? {}
            : { currentHp: input.fighterHp }),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    }),
    actorId: fighterId,
  });
  if (afterFighter.tag !== "resolved") {
    throw new Error(`Expected resolved End Turn, got ${afterFighter.tag}.`);
  }

  return afterFighter.state;
}

export function fighterAttackSubject(
  attackName: string = "Longsword",
): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  return {
    tag: "action",
    actorId: fighterId,
    action: "attack",
    attackName,
  };
}

export function goblinAttackSubject(
  attackName: "Scimitar" | "Shortbow",
): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  return {
    tag: "action",
    actorId: goblinId,
    action: "attack",
    attackName,
  };
}

export function monsterAttackSubject(
  attackName: "Cinder Breath" | "Dread Gaze" | "Tail Swipe",
  statBlockSection: "actions" | "legendaryActions" = "actions",
): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  return {
    tag: "action",
    actorId: goblinId,
    action: "attack",
    attackName,
    ...(statBlockSection === "actions" ? {} : { statBlockSection }),
  };
}

export function attackInitialTargetHole(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  > = fighterAttackSubject(),
): BattleHole {
  return requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [],
    }),
    "targetChoice",
  );
}

export function attackRollHoleAfterTarget(
  state: BattleState,
  targetHole: BattleHole,
  subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  > = fighterAttackSubject(),
  targetId: CombatantId = targetHole.kind === "targetChoice"
    ? (targetHole.choices[0] ?? goblinId)
    : goblinId,
): BattleHole {
  if (targetHole.kind !== "targetChoice") {
    throw new Error("Expected targetChoice hole.");
  }
  return requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        attackTargetFill(
          targetHole,
          subject.actorId,
          targetId,
          subject.attackName,
        ),
      ],
    }),
    "attackRoll",
  );
}

export function attackDamageHoleAfterHit(
  state: BattleState,
  targetHole: BattleHole,
  rollHole: BattleHole,
  attackRoll: {
    readonly total: number;
    readonly naturalD20: number;
    readonly rollMode?: AttackRollMode;
  } = {
    total: 15,
    naturalD20: 10,
  },
  subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  > = fighterAttackSubject(),
  targetId: CombatantId = targetHole.kind === "targetChoice"
    ? (targetHole.choices[0] ?? goblinId)
    : goblinId,
): BattleHole {
  if (targetHole.kind !== "targetChoice") {
    throw new Error("Expected targetChoice hole.");
  }
  return requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        attackTargetFill(
          targetHole,
          subject.actorId,
          targetId,
          subject.attackName,
        ),
        attackRollFill(rollHole, attackRoll),
      ],
    }),
    "rolledDice",
  );
}

export function criticalAttackDamageResult(
  state: BattleState,
  targetId: CombatantId,
): ReturnType<typeof resolveBattleSubject> {
  const targetHole = attackInitialTargetHole(state);
  const rollHole = attackRollHoleAfterTarget(state, targetHole);
  const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole, {
    total: 20,
    naturalD20: 20,
  });

  return resolveBattleSubject({
    state,
    subject: {
      tag: "action",
      actorId: fighterId,
      action: "attack",
      attackName: "Longsword",
    },
    fills: [
      targetFill(targetHole, targetId),
      attackRollFill(rollHole, { total: 20, naturalD20: 20 }),
      damageRollFillWithGroups(damageHole, [[4, 4]]),
    ],
  });
}

export function resolveLongswordHit(
  state: BattleState,
  subject: ReturnType<typeof fighterAttackSubject> = fighterAttackSubject(),
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
> {
  return resolveWeaponHit(state, subject);
}

function resolveWeaponHit(
  state: BattleState,
  subject: ReturnType<typeof fighterAttackSubject>,
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
> {
  const targetHole = attackInitialTargetHole(state, subject);
  const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);
  const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole, {
    total: 15,
    naturalD20: 10,
  });
  return requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFill(damageHole, 1),
      ],
    }),
  );
}

export function resolveLongswordMiss(
  state: BattleState,
  subject: ReturnType<typeof fighterAttackSubject> = fighterAttackSubject(),
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
> {
  const targetHole = attackInitialTargetHole(state, subject);
  const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);
  return requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 1, naturalD20: 1 }),
      ],
    }),
  );
}

export function characterWithDeathSaveCounters(input: {
  readonly combatantId: CombatantId;
  readonly successes: 0 | 1 | 2;
  readonly failures: 0 | 1 | 2;
}): BattleState {
  const state = startBattleRight({
    battleId: battleId("battle-character-start-turn-death-save-counters"),
    combatants: [
      characterSeed({ initiative: 20 }),
      characterSeed({
        combatantId: input.combatantId,
        displayName: "Target Fighter",
        initiative: 10,
        currentHp: 0,
        attack: null,
      }),
    ],
  });
  const combatant = state.combatants.get(input.combatantId);
  if (
    combatant === undefined ||
    combatant.zeroHpLifecycle.policy !== "usesDeathSavingThrows"
  ) {
    throw new Error("Expected target character with death-save lifecycle.");
  }

  return {
    ...state,
    combatants: new Map(state.combatants).set(input.combatantId, {
      ...combatant,
      zeroHpLifecycle: {
        ...combatant.zeroHpLifecycle,
        deathSaves: {
          deathSaves: {
            successes: input.successes,
            failures: input.failures,
          },
          stable: false,
          dead: false,
          hpRegained: false,
        },
      },
    }),
  };
}

export function requireHole(
  result: ReturnType<typeof resolveBattleSubject>,
  kind: BattleHole["kind"],
): BattleHole {
  if (result.tag !== "needsHoles") {
    throw new Error(
      `Expected needsHoles, got ${result.tag}${
        result.tag === "invalid" ? `: ${result.message}` : ""
      }.`,
    );
  }
  const hole = result.holes.find((candidate) => candidate.kind === kind);
  if (hole == null) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

export function findHole(
  holes: readonly BattleHole[],
  kind: BattleHole["kind"],
): BattleHole {
  const hole = holes.find((candidate) => candidate.kind === kind);
  if (hole == null) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

export function findAct(
  state: BattleState,
  subject: BattleSubject,
): ReturnType<typeof discoverBattleActs>[number] {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      JSON.stringify(candidate.subject) === JSON.stringify(subject),
  );
  if (act === undefined) {
    throw new Error(`Expected discovered act ${JSON.stringify(subject)}.`);
  }
  return act;
}

type SleepShakeAwakeSubject = Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "shakeAwakeFromSleep" }
>;

export function sleepShakeAwakeSubject(): SleepShakeAwakeSubject {
  return { tag: "action", actorId: fighterId, action: "shakeAwakeFromSleep" };
}

export function sleepShakeAwakeTargetFill(hole: BattleHole): BattleFill {
  return targetFill(hole, goblinId, [
    {
      kind: "sleepShakeAwakeActorWithin5Feet",
      actorId: fighterId,
      targetId: goblinId,
    },
  ]);
}

export function battleAfterFailedSleepInitialSave(input: {
  readonly battle: string;
  readonly helperInitiative?: number;
  readonly targetConditions?: Parameters<typeof characterSeed>[0]["conditions"];
}): BattleState {
  const battleState = startBattleRight({
    battleId: battleId(input.battle),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Wizard",
        initiative: 20,
        attack: null,
        spellcasting: wizardSpellcasting({
          cantrips: [],
          preparedSpells: [spellRecord("sleep")],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        }),
      }),
      characterSeed({
        combatantId: fighterId,
        displayName: "Helper",
        initiative: input.helperInitiative ?? 15,
      }),
      characterSeed({
        combatantId: goblinId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
        ...(input.targetConditions === undefined
          ? {}
          : { conditions: input.targetConditions }),
      }),
    ],
  });
  const savingThrows = requireHole(
    resolveBattleSubject({
      state: battleState,
      subject: magicSubject("sleep"),
      fills: [],
    }),
    "savingThrowOutcome",
  );
  const slept = requireResolved(
    resolveBattleSubject({
      state: battleState,
      subject: magicSubject("sleep"),
      fills: [
        savingThrowOutcomeFill(savingThrows, [
          { targetId: goblinId, succeeded: false },
        ]),
      ],
    }),
  ).state;
  return requireResolved(endTurn({ state: slept, actorId: wizardId })).state;
}

export function battleAfterGoblinFailedSleepRepeatSave(input: {
  readonly battle: string;
  readonly helperInitiative: number;
  readonly targetConditions?: Parameters<typeof characterSeed>[0]["conditions"];
}): BattleState {
  const goblinTurn = battleAfterFailedSleepInitialSave(input);
  const repeatSave = requireHole(
    endTurn({ state: goblinTurn, actorId: goblinId }),
    "savingThrowOutcome",
  );
  return requireResolved(
    endTurn({
      state: goblinTurn,
      actorId: goblinId,
      fills: [
        savingThrowOutcomeFill(repeatSave, [
          { targetId: goblinId, succeeded: false },
        ]),
      ],
    }),
  ).state;
}

export function shakeAwakeGoblinFromSleep(state: BattleState): BattleState {
  const subject = sleepShakeAwakeSubject();
  const target = findAct(state, subject).initialHoles[0]!;
  return requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [sleepShakeAwakeTargetFill(target)],
    }),
  ).state;
}

export function targetFill(
  hole: BattleHole,
  targetId: CombatantId,
  spatialFacts?: Extract<
    BattleFill,
    { readonly kind: "targetChoice" }
  >["spatialFacts"],
): BattleFill {
  if (hole.kind !== "targetChoice") {
    throw new Error("Expected targetChoice hole.");
  }
  const defaultSpatialFacts =
    hole.requiresTableSpatialFact === true
      ? [
          ...defaultAttackTargetSpatialFacts(targetId),
          ...[wizardId, fighterId].map((casterId) => ({
            kind: "spellTarget" as const,
            casterId,
            targetId,
            spellId: spellIdFromTargetHoleLabel(hole.label),
          })),
          {
            kind: "helpAttackTargetWithin5Feet" as const,
            helperId: fighterId,
            targetEnemyId: targetId,
          },
          {
            kind: "grappleTargetWithinReach" as const,
            grapplerId: fighterId,
            targetId,
          },
          {
            kind: "shoveTargetWithinReach" as const,
            shoverId: fighterId,
            targetId,
          },
          ...[
            combatantId("ally"),
            combatantId("sneak-ally"),
            combatantId("sneak-cancel-ally"),
            combatantId("second-rogue-ally"),
          ].map((allyId) => ({
            kind: "sneakAttackAllyWithin5FeetOfTarget" as const,
            attackerId: targetId === goblinId ? fighterId : goblinId,
            targetId,
            allyId,
          })),
          {
            kind: "sneakAttackAllyWithin5FeetOfTarget" as const,
            attackerId: combatantId("second-rogue"),
            targetId,
            allyId: combatantId("second-rogue-ally"),
          },
        ]
      : [];
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    ...((spatialFacts ?? defaultSpatialFacts).length === 0
      ? {}
      : { spatialFacts: spatialFacts ?? defaultSpatialFacts }),
  };
}

type ObjectTargetChoiceFill = Extract<
  BattleFill,
  { readonly kind: "objectTargetChoice" }
>;
type SpellObjectTargetFact = Extract<
  ObjectTargetChoiceFill["spatialFacts"][number],
  { readonly kind: "spellObjectTarget" }
>;

export function objectTargetFill(input: {
  readonly hole: BattleHole;
  readonly objectId?: ObjectTargetChoiceFill["value"];
  readonly casterId?: CombatantId;
  readonly spellId: string;
  readonly rangeFeet?: SpellObjectTargetFact["rangeFeet"];
  readonly armorClass?: SpellObjectTargetFact["armorClass"];
  readonly damageDisposition?: SpellObjectTargetFact["damageDisposition"];
  readonly spatialFacts?: ObjectTargetChoiceFill["spatialFacts"];
}): ObjectTargetChoiceFill {
  if (input.hole.kind !== "objectTargetChoice") {
    throw new Error("Expected objectTargetChoice hole.");
  }
  const objectId = input.objectId ?? battleObjectId("training-object");
  return {
    kind: "objectTargetChoice",
    holeId: input.hole.holeId,
    value: objectId,
    spatialFacts: input.spatialFacts ?? [
      {
        kind: "spellObjectTarget",
        casterId: input.casterId ?? wizardId,
        objectId,
        spellId: input.spellId,
        rangeFeet: input.rangeFeet ?? movementFeet(60),
        armorClass: input.armorClass ?? armorClass(13),
        damageDisposition: input.damageDisposition ?? {
          kind: "hitPoints",
          hitPoints: Hp(5),
        },
      },
    ],
  };
}

export function spellTargetAllocationFill(
  hole: BattleHole,
  allocations: readonly {
    readonly targetId: CombatantId;
    readonly count: number;
  }[],
  casterId: CombatantId = wizardId,
): BattleFill {
  if (hole.kind !== "spellTargetAllocation") {
    throw new Error("Expected spellTargetAllocation hole.");
  }
  return {
    kind: "spellTargetAllocation",
    holeId: hole.holeId,
    value: { allocations },
    spatialFacts: allocations.map((allocation) => ({
      kind: "spellTarget",
      casterId,
      targetId: allocation.targetId,
      spellId: hole.spell.spell.id,
    })),
  };
}

export function attackTargetFill(
  hole: BattleHole,
  actorId: CombatantId,
  targetId: CombatantId,
  attackName = defaultAttackNameForActor(actorId),
  extraFacts: Extract<
    BattleFill,
    { readonly kind: "targetChoice" }
  >["spatialFacts"] = [],
): BattleFill {
  return targetFill(hole, targetId, [
    attackTargetSpatialFact(actorId, targetId, attackName),
    ...commonSneakAttackSpatialFacts(actorId, targetId),
    ...(extraFacts ?? []),
  ]);
}

export function attackTargetSpatialFact(
  actorId: CombatantId,
  targetId: CombatantId,
  attackName: string,
): NonNullable<
  Extract<BattleFill, { readonly kind: "targetChoice" }>["spatialFacts"]
>[number] {
  return attackName === "Shortbow" || attackName === "Longbow"
    ? {
        kind: "attackTargetInRangedRange" as const,
        actorId,
        targetId,
        attackName,
        rangeBand: "normal" as const,
      }
    : {
        kind: "attackTargetInMeleeReach" as const,
        actorId,
        targetId,
        attackName,
      };
}

function defaultAttackNameForActor(actorId: CombatantId): string {
  if (actorId === goblinId) return "Scimitar";
  if (actorId === skeletonId) return "Shortsword";
  return "Longsword";
}

function defaultAttackTargetSpatialFacts(
  targetId: CombatantId,
): readonly NonNullable<
  Extract<BattleFill, { readonly kind: "targetChoice" }>["spatialFacts"]
>[number][] {
  return [
    attackTargetSpatialFact(fighterId, targetId, "Longsword"),
    attackTargetSpatialFact(fighterId, targetId, "Dagger"),
    attackTargetSpatialFact(fighterId, targetId, "Shortsword"),
    attackTargetSpatialFact(fighterId, targetId, "Flail"),
    attackTargetSpatialFact(fighterId, targetId, "Quarterstaff"),
    attackTargetSpatialFact(fighterId, targetId, "Unarmed Strike"),
    attackTargetSpatialFact(wizardId, targetId, "Longsword"),
    attackTargetSpatialFact(goblinId, targetId, "Scimitar"),
    attackTargetSpatialFact(goblinId, targetId, "Shortbow"),
    attackTargetSpatialFact(goblinId, targetId, "Cinder Breath"),
    attackTargetSpatialFact(goblinId, targetId, "Dread Gaze"),
    attackTargetSpatialFact(goblinId, targetId, "Tail Swipe"),
    attackTargetSpatialFact(skeletonId, targetId, "Shortsword"),
    attackTargetSpatialFact(combatantId("second-rogue"), targetId, "Longsword"),
  ];
}

function commonSneakAttackSpatialFacts(
  attackerId: CombatantId,
  targetId: CombatantId,
): readonly NonNullable<
  Extract<BattleFill, { readonly kind: "targetChoice" }>["spatialFacts"]
>[number][] {
  return [
    combatantId("ally"),
    combatantId("sneak-ally"),
    combatantId("sneak-cancel-ally"),
    combatantId("second-rogue-ally"),
  ].map((allyId) => ({
    kind: "sneakAttackAllyWithin5FeetOfTarget" as const,
    attackerId,
    targetId,
    allyId,
  }));
}

function spellIdFromTargetHoleLabel(label: string | undefined): string {
  if (label?.startsWith("Magic Missile") === true) return "magic_missile";
  if (label?.startsWith("Ray of Frost") === true) return "ray_of_frost";
  if (label?.startsWith("Mage Armor") === true) return "mage_armor";
  if (label?.startsWith("Poison Spray") === true) return "poison_spray";
  if (label?.startsWith("Chill Touch") === true) return "chill_touch";
  if (label?.startsWith("Eldritch Blast") === true) return "eldritch_blast";
  if (label?.startsWith("Fire Bolt") === true) return "fire_bolt";
  if (label?.startsWith("Starry Wisp") === true) return "starry_wisp";
  if (label?.startsWith("Sacred Flame") === true) return "sacred_flame";
  if (label?.startsWith("Inflict Wounds") === true) return "inflict_wounds";
  if (label?.startsWith("Shocking Grasp") === true) return "shocking_grasp";
  if (label?.startsWith("Guiding Bolt") === true) return "guiding_bolt";
  if (label?.startsWith("Ray of Sickness") === true) return "ray_of_sickness";
  if (label?.startsWith("Vicious Mockery") === true) return "vicious_mockery";
  if (label?.startsWith("Ice Knife") === true) return "ice_knife";
  return "";
}

export function abilityCheckFill(hole: BattleHole, total: number): BattleFill {
  if (hole.kind !== "abilityCheck") {
    throw new Error("Expected abilityCheck hole.");
  }
  return {
    kind: "abilityCheck",
    holeId: hole.holeId,
    value: { total },
  };
}

export function attackRollFill(
  hole: BattleHole,
  value: {
    readonly total: number;
    readonly naturalD20: number;
    readonly rollMode?: AttackRollMode;
    readonly activatedOngoingFeatureUnitId?: string;
  },
): BattleFill {
  if (hole.kind !== "attackRoll") {
    throw new Error("Expected attackRoll hole.");
  }
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      total: value.total,
      naturalD20: DieRollResult(value.naturalD20),
      ...(value.rollMode === undefined ? {} : { rollMode: value.rollMode }),
      ...(value.activatedOngoingFeatureUnitId === undefined
        ? {}
        : {
            activatedOngoingFeatureUnitId: value.activatedOngoingFeatureUnitId,
          }),
    },
  };
}

export function unitFeatureDecisionFill(
  hole: BattleHole,
  value: Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>["value"],
): BattleFill {
  if (hole.kind !== "unitFeatureDecision") {
    throw new Error("Expected unitFeatureDecision hole.");
  }
  return {
    kind: "unitFeatureDecision",
    holeId: hole.holeId,
    value,
  };
}

export function deathSavingThrowFill(
  hole: BattleHole,
  roll: number,
): BattleFill {
  if (hole.kind !== "deathSavingThrow") {
    throw new Error("Expected deathSavingThrow hole.");
  }
  return {
    kind: "deathSavingThrow",
    holeId: hole.holeId,
    value: DieRollResult(roll),
  };
}

export function concentrationSavingThrowFill(
  hole: BattleHole,
  succeeded: boolean,
): BattleFill {
  if (hole.kind !== "concentrationSavingThrow") {
    throw new Error("Expected concentrationSavingThrow hole.");
  }
  return {
    kind: "concentrationSavingThrow",
    holeId: hole.holeId,
    value: { succeeded },
  };
}

export function reactionDecisionFill(
  hole: BattleHole,
  value: Extract<BattleFill, { readonly kind: "reactionDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "reactionDecision" }> {
  if (hole.kind !== "reactionDecision") {
    throw new Error("Expected reactionDecision hole.");
  }
  return {
    kind: "reactionDecision",
    holeId: hole.holeId,
    value,
  };
}

export function movementFill(
  hole: BattleHole,
  value: {
    readonly speedKind?: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["speedKind"];
    readonly movementCostFeet: number;
    readonly provokedOpportunityAttacks: readonly {
      readonly reactorId: CombatantId;
      readonly attackName: string;
    }[];
    readonly areaDifficultTerrain?: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["areaDifficultTerrain"];
  },
): Extract<BattleFill, { readonly kind: "movement" }> {
  if (hole.kind !== "movement") {
    throw new Error("Expected movement hole.");
  }
  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      speedKind: value.speedKind ?? "walk",
      movementCostFeet: movementFeet(value.movementCostFeet),
      provokedOpportunityAttacks: value.provokedOpportunityAttacks,
      ...(value.areaDifficultTerrain === undefined
        ? {}
        : { areaDifficultTerrain: value.areaDifficultTerrain }),
    },
  };
}

export function castGroundHazardForMovementTest(
  areaId: BattleAreaId,
): BattleState {
  const battleState = startBattleRight({
    battleId: battleId(`battle-grease-movement-${areaId}`),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Wizard",
        initiative: 20,
        attack: null,
        spellcasting: wizardSpellcasting({
          preparedSpells: [spellRecord("grease")],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        }),
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
  const subject = magicSubject("grease");
  const save = requireHole(
    resolveBattleSubject({ state: battleState, subject, fills: [] }),
    "savingThrowOutcome",
  );
  return requireResolved(
    resolveBattleSubject({
      state: battleState,
      subject,
      fills: [greaseGroundAreaSavingThrowFill(save, areaId)],
    }),
  ).state;
}

export function fogCloudBattle(battleIdValue: string): BattleState {
  return startBattleRight({
    battleId: battleId(battleIdValue),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Wizard",
        initiative: 20,
        attack: testDaggerAttack(),
        spellcasting: wizardSpellcasting({
          preparedSpells: [spellRecord("fog_cloud")],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        }),
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}

export function castFogCloud(
  battleIdValue: string,
  areaId: BattleAreaId,
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
> {
  const state = fogCloudBattle(battleIdValue);
  const subject = magicSubject("fog_cloud");
  const area = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "spellAreaChoice",
  );
  return requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [fogCloudAreaFill(area, areaId)],
    }),
  );
}

export function fogCloudAreaFill(
  hole: BattleHole,
  areaId: BattleAreaId,
): Extract<BattleFill, { readonly kind: "spellAreaChoice" }> {
  if (hole.kind !== "spellAreaChoice") {
    throw new Error("Expected spellAreaChoice hole.");
  }
  return {
    kind: "spellAreaChoice",
    holeId: hole.holeId,
    value: { kind: "fogCloudArea", areaId },
  };
}

function greaseGroundAreaSavingThrowFill(
  hole: BattleHole,
  areaId: BattleAreaId,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  if (hole.kind !== "savingThrowOutcome") {
    throw new Error("Expected savingThrowOutcome hole.");
  }
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        kind: "greaseGroundArea",
        originAnchorId: wizardId,
        affectedTargetIds: [],
        areaId,
      },
      outcomes: [],
    },
  };
}

export function grappleOutcomeFill(
  hole: BattleHole,
  succeeded: boolean,
): Extract<BattleFill, { readonly kind: "grappleOutcome" }> {
  if (hole.kind !== "grappleOutcome") {
    throw new Error("Expected grappleOutcome hole.");
  }
  return {
    kind: "grappleOutcome",
    holeId: hole.holeId,
    value: { succeeded },
  };
}

export function shoveOutcomeFill(
  hole: BattleHole,
  value: Extract<BattleFill, { readonly kind: "shoveOutcome" }>["value"],
): Extract<BattleFill, { readonly kind: "shoveOutcome" }> {
  if (hole.kind !== "shoveOutcome") {
    throw new Error("Expected shoveOutcome hole.");
  }
  return {
    kind: "shoveOutcome",
    holeId: hole.holeId,
    value,
  };
}

export function savingThrowOutcomeFill(
  hole: BattleHole,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  if (hole.kind !== "savingThrowOutcome") {
    throw new Error("Expected savingThrowOutcome hole.");
  }
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value:
      "spell" in hole && hole.spell.targeting.kind !== "singleCombatant"
        ? {
            area: {
              originAnchorId: wizardId,
              affectedTargetIds: outcomes.map((outcome) => outcome.targetId),
            },
            outcomes,
          }
        : { outcomes },
  };
}

export function damageRollFill(
  hole: BattleFillableHole,
  dieResult: number,
): BattleFill {
  return damageRollFillWithGroups(hole, [[dieResult]]);
}

export function damageRollFillWithGroups(
  hole: BattleFillableHole,
  groups: readonly (readonly number[])[],
  selectedAttackDamageRiderUnitIds?: readonly string[],
): BattleFill {
  if (hole.kind !== "rolledDice") {
    throw new Error("Expected rolledDice hole.");
  }
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    ...(selectedAttackDamageRiderUnitIds === undefined
      ? {}
      : { selectedAttackDamageRiderUnitIds }),
    value: rolledDiceGroups(groups),
  };
}

export function attackDamageDispositionHoleAfterDamage(
  state: BattleState,
  targetHole: BattleHole,
  rollHole: BattleHole,
  damageHole: BattleHole,
  targetId: CombatantId,
  damage: number,
): BattleHole {
  return attackDamageDispositionHoleAfterFills(state, fighterAttackSubject(), [
    targetFill(targetHole, targetId),
    attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
    damageRollFill(damageHole, damage),
  ]);
}

export function attackDamageDispositionHoleAfterFills(
  state: BattleState,
  subject: BattleSubject,
  fills: readonly BattleFill[],
): BattleHole {
  return requireHole(
    resolveBattleSubject({ state, subject, fills }),
    "attackDamageDisposition",
  );
}

export function attackDamageDispositionFill(
  hole: BattleHole,
  value: Extract<
    BattleFill,
    { readonly kind: "attackDamageDisposition" }
  >["value"],
): Extract<BattleFill, { readonly kind: "attackDamageDisposition" }> {
  if (hole.kind !== "attackDamageDisposition") {
    throw new Error("Expected attackDamageDisposition hole.");
  }
  return {
    kind: "attackDamageDisposition",
    holeId: hole.holeId,
    value,
  };
}

export function rolledDiceGroups(
  groups: readonly (readonly number[])[],
): DamageRollValue {
  const [firstGroup, ...restGroups] = groups;
  if (firstGroup === undefined) {
    throw new Error("Expected at least one rolled dice group.");
  }

  return [
    rolledDiceGroup(firstGroup),
    ...restGroups.map((group) => rolledDiceGroup(group)),
  ];
}

export function rolledDiceGroup(
  group: readonly number[],
): DamageRollValue[number] {
  const [first, ...rest] = group;
  if (first === undefined) {
    throw new Error("Expected at least one die result.");
  }

  return {
    results: [
      DieRollResult(first),
      ...rest.map((dieResult) => DieRollResult(dieResult)),
    ],
  };
}

export function characterSeed(input: {
  readonly combatantId?: CombatantId;
  readonly displayName?: string;
  readonly initiative: number;
  readonly side?: typeof partySide | typeof oppositionSide;
  readonly classLevel?: number;
  readonly classLevels?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["classLevels"];
  readonly currentHp?: number;
  readonly maxHp?: number;
  readonly tempHp?: number;
  readonly conditions?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["conditions"];
  readonly positiveHpUnconscious?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["positiveHpUnconscious"];
  readonly zeroHpLifecycle?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["zeroHpLifecycle"];
  readonly armorClass?: ReturnType<typeof defaultArmorClassState>;
  readonly selectedLoadout?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["selectedLoadout"];
  readonly weaponMasteries?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["weaponMasteries"];
  readonly attack?:
    | Extract<
        BattleCreatureInit["creatureInit"],
        { readonly kind: "character" }
      >["attack"]
    | null;
  readonly unarmedStrike?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["unarmedStrike"];
  readonly offHandAttack?: TestCharacterWeaponAttack;
  readonly resources?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"];
  readonly metamagic?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["metamagic"];
  readonly unitFeatures?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["unitFeatures"];
  readonly invocationFeatures?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["invocationFeatures"];
  readonly characterUnitRefs?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"];
  readonly druidWildShapeKnownForms?: readonly StatBlockRecord[];
  readonly spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
}): BattleCreatureInit {
  const attack =
    input.attack === undefined ? testLongswordAttack() : input.attack;
  const selectedLoadout =
    input.selectedLoadout ??
    (attack === null
      ? {}
      : {
          weapon: {
            itemId: `main:${attack.weapon.id}`,
            unitId: attack.weapon.id,
            grip: "one_handed" as const,
          },
        });
  const classLevels = input.classLevels ?? [
    {
      className: input.spellcasting?.sourceClassName ?? "fighter",
      level: input.classLevel ?? 1,
    },
  ];
  const druidWildShapeProfile =
    input.druidWildShapeKnownForms === undefined
      ? undefined
      : (input.resources ?? []).flatMap((resource) => {
          const profile = parseSupportedUnitFeatureProfile(
            resource.unit,
            parseCharacterBattleClassLevels(classLevels),
          );
          return profile?.kind === "druidWildShapeKnownForm" ? [profile] : [];
        })[0];
  if (
    input.druidWildShapeKnownForms !== undefined &&
    druidWildShapeProfile === undefined
  ) {
    throw new Error(
      "Test Druid Wild Shape known forms require a support profile.",
    );
  }
  const druidWildShapeKnownForms =
    input.druidWildShapeKnownForms === undefined ||
    druidWildShapeProfile === undefined
      ? undefined
      : battleDruidWildShapeKnownForms({
          forms: input.druidWildShapeKnownForms,
          profile: druidWildShapeProfile,
        });
  if (
    druidWildShapeKnownForms !== undefined &&
    Either.isLeft(druidWildShapeKnownForms)
  ) {
    throw new Error(druidWildShapeKnownForms.left.message);
  }
  const firstDruidWildShapeKnownForm = druidWildShapeKnownForms?.right[0];
  if (
    input.druidWildShapeKnownForms !== undefined &&
    firstDruidWildShapeKnownForm === undefined
  ) {
    throw new Error("Test Druid Wild Shape known forms must be non-empty.");
  }
  const parsedDruidWildShapeKnownForms =
    druidWildShapeKnownForms === undefined
      ? undefined
      : firstDruidWildShapeKnownForm === undefined
        ? undefined
        : ([
            firstDruidWildShapeKnownForm,
            ...druidWildShapeKnownForms.right.slice(1),
          ] as const);
  return {
    combatantId: input.combatantId ?? fighterId,
    displayName: input.displayName ?? "Fighter",
    initiative: initiativeScore(input.initiative),
    side: input.side ?? partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId("fighter-character"),
      characterUnitRefs: input.characterUnitRefs ?? [],
      classLevels,
      armorClass:
        input.armorClass ?? armorClassStateForLoadout(selectedLoadout),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(input.currentHp ?? 12),
      maxHp: Hp(input.maxHp ?? 12),
      tempHp: Hp(input.tempHp ?? 0),
      ...(input.conditions === undefined
        ? {}
        : { conditions: input.conditions }),
      ...(input.positiveHpUnconscious === undefined
        ? {}
        : { positiveHpUnconscious: input.positiveHpUnconscious }),
      ...(input.zeroHpLifecycle === undefined
        ? {}
        : { zeroHpLifecycle: input.zeroHpLifecycle }),
      selectedLoadout,
      ...(input.weaponMasteries === undefined
        ? {}
        : { weaponMasteries: input.weaponMasteries }),
      attack,
      unarmedStrike: input.unarmedStrike ?? testUnarmedStrikeDamageAttack(),
      ...(input.offHandAttack === undefined
        ? {}
        : { offHandAttack: input.offHandAttack }),
      ...(input.unitFeatures === undefined
        ? {}
        : { unitFeatures: input.unitFeatures }),
      ...(input.invocationFeatures === undefined
        ? {}
        : { invocationFeatures: input.invocationFeatures }),
      ...(input.resources === undefined ? {} : { resources: input.resources }),
      ...(input.metamagic === undefined ? {} : { metamagic: input.metamagic }),
      ...(parsedDruidWildShapeKnownForms === undefined
        ? {}
        : { druidWildShapeKnownForms: parsedDruidWildShapeKnownForms }),
      ...(input.spellcasting === undefined
        ? {}
        : { spellcasting: input.spellcasting }),
    },
  };
}

function armorClassStateForLoadout(
  loadout: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["selectedLoadout"],
): ReturnType<typeof defaultArmorClassState> {
  return {
    ...defaultArmorClassState(),
    leftHandUse:
      loadout.shield === undefined
        ? loadout.offHandWeapon === undefined
          ? "free"
          : "offWeapon"
        : "shield",
    rightHandUse: loadout.weapon === undefined ? "free" : "mainWeapon",
  };
}

export function heavyArmorClassState(): ReturnType<
  typeof defaultArmorClassState
> {
  return {
    ...defaultArmorClassState(),
    base: {
      kind: "armor",
      category: "heavy",
      formula: { kind: "heavy_fixed", ac: 16 },
    },
    armorTraining: new Set(["heavy"]),
    rightHandUse: "mainWeapon",
  };
}

export function testLongswordAttack(): TestCharacterWeaponAttack {
  const weapon = unitLibrary.requireUnit("weapon_longsword");
  if (weapon.kind !== "weapon") {
    throw new Error("Expected Longsword weapon Unit.");
  }

  return {
    kind: "weapon",
    weapon,
    ability: "str",
    abilityModifier: battleAbilityModifier(3),
  };
}

export function testUnarmedStrikeDamageAttack(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["unarmedStrike"] {
  return {
    kind: "unarmedStrike",
    effect: {
      kind: "damage",
      damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
    },
    attackAbility: "str",
    attackAbilityModifier: battleAbilityModifier(3),
    attackBonus: attackBonus(5),
    damageAbilityModifier: battleAbilityModifier(3),
  };
}

export function testUnarmedStrikeDieAttack(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["unarmedStrike"] {
  return {
    kind: "unarmedStrike",
    effect: {
      kind: "damage",
      damage: {
        kind: "authoredReplacement",
        sourceUnitId: "test_unarmed_die_profile",
        dice: 1,
        dieSize: 4,
        damageType: "bludgeoning",
      },
    },
    attackAbility: "str",
    attackAbilityModifier: battleAbilityModifier(3),
    attackBonus: attackBonus(5),
    damageAbilityModifier: battleAbilityModifier(3),
  };
}

export function testDaggerAttack(): TestCharacterWeaponAttack {
  const weapon = unitLibrary.requireUnit("weapon_dagger");
  if (weapon.kind !== "weapon") {
    throw new Error("Expected Dagger weapon Unit.");
  }

  return {
    kind: "weapon",
    weapon,
    ability: "str",
    abilityModifier: battleAbilityModifier(3),
  };
}

export function testShortswordAttack(): TestCharacterWeaponAttack {
  const weapon = unitLibrary.requireUnit("weapon_shortsword");
  if (weapon.kind !== "weapon") {
    throw new Error("Expected Shortsword weapon Unit.");
  }

  return {
    kind: "weapon",
    weapon,
    ability: "str",
    abilityModifier: battleAbilityModifier(3),
  };
}

export function testQuarterstaffAttack(): TestCharacterWeaponAttack {
  const weapon = decodeUnitRecordSync(weaponQuarterstaffInput);
  if (weapon.kind !== "weapon") {
    throw new Error("Expected Quarterstaff weapon Unit.");
  }

  return {
    kind: "weapon",
    weapon,
    ability: "str",
    abilityModifier: battleAbilityModifier(3),
  };
}

export function testGreataxeAttack(
  ability = battleAbilityModifier(3),
): TestCharacterWeaponAttack {
  const weapon = unitLibrary.requireUnit("weapon_greataxe");
  if (weapon.kind !== "weapon") {
    throw new Error("Expected Greataxe weapon Unit.");
  }

  return {
    kind: "weapon",
    weapon,
    ability: "str",
    abilityModifier: ability,
  };
}

export function testRangedCleaveLongbowAttack(): TestCharacterWeaponAttack {
  const weapon = decodeUnitRecordSync(weaponLongbowInput);
  if (weapon.kind !== "weapon") {
    throw new Error("Expected Longbow weapon Unit.");
  }

  return {
    kind: "weapon",
    weapon: {
      ...weapon,
      mastery: "cleave",
    } satisfies WeaponRecord,
    ability: "dex",
    abilityModifier: battleAbilityModifier(3),
  };
}

export function testLightHammerAttack(): TestCharacterWeaponAttack {
  const weapon = unitLibrary.requireUnit("weapon_flail");
  if (weapon.kind !== "weapon") {
    throw new Error("Expected Flail weapon Unit.");
  }

  return {
    kind: "weapon",
    weapon,
    ability: "str",
    abilityModifier: battleAbilityModifier(3),
  };
}

export function testPoisonWeaponAttack(): TestCharacterWeaponAttack {
  const base = testLightHammerAttack();
  return {
    ...base,
    weapon: {
      ...base.weapon,
      damage: { ...base.weapon.damage, damageType: "poison" },
    },
  };
}

export function statBlockCreatureInit(input: {
  readonly combatantId?: CombatantId;
  readonly displayName?: string;
  readonly statBlock?: StatBlockRecord;
  readonly initiative: number;
  readonly currentHp?: number;
  readonly tempHp?: number;
}): BattleCreatureInit {
  const statBlock = input.statBlock ?? statBlockRecord();
  if (statBlock.statBlock.hp.kind !== "literal") {
    throw new Error(
      "Battle runtime test Stat Block fixture must use literal HP.",
    );
  }
  const maxHp = statBlock.statBlock.hp.value;
  return {
    combatantId: input.combatantId ?? goblinId,
    displayName: input.displayName ?? statBlock.statBlock.displayName,
    initiative: initiativeScore(input.initiative),
    side: oppositionSide,
    creatureInit: {
      kind: "statBlock",
      statBlock,
      currentHp: Hp(input.currentHp ?? maxHp),
      maxHp: Hp(maxHp),
      tempHp: Hp(input.tempHp ?? 0),
    },
  };
}

export function statBlockRecord(): StatBlockRecord {
  return statBlockCatalog.requireStatBlock("stat_block_goblin_warrior");
}

export function monsterResourceStatBlock(): StatBlockRecord {
  const base = statBlockRecord();
  const scimitar = base.statBlock.actions?.attacks?.find(
    (attack) => attack.name === "Scimitar",
  );
  if (scimitar === undefined) {
    throw new Error("Expected Goblin Warrior Scimitar fixture.");
  }
  return {
    ...base,
    id: "stat_block_resource_test_monster",
    name: "Resource Test Monster",
    statBlock: {
      ...base.statBlock,
      displayName: "Resource Test Monster",
      actions: {
        attacks: [
          {
            ...scimitar,
            name: "Cinder Breath",
            limitedUse: { kind: "recharge", minimumRoll: 5 },
          },
          {
            ...scimitar,
            name: "Dread Gaze",
            limitedUse: { kind: "daily", uses: 1 },
          },
        ],
      },
      legendaryActions: {
        uses: 2,
        actions: {
          attacks: [
            {
              ...scimitar,
              name: "Tail Swipe",
            },
          ],
        },
      },
    },
  };
}

export function monsterResourceStatBlockWithUnsupportedAttackSections(): StatBlockRecord {
  const base = monsterResourceStatBlock();
  const cinderBreath = base.statBlock.actions?.attacks?.find(
    (attack) => attack.name === "Cinder Breath",
  );
  if (cinderBreath === undefined) {
    throw new Error("Expected Cinder Breath fixture.");
  }
  return {
    ...base,
    id: "stat_block_unsupported_attack_sections_test_monster",
    statBlock: {
      ...base.statBlock,
      bonusActions: {
        attacks: [
          {
            ...cinderBreath,
            name: "Swift Bite",
          },
        ],
      },
      reactions: {
        attacks: [
          {
            ...cinderBreath,
            name: "Counter Snap",
          },
        ],
      },
    },
  };
}

export function monsterMultiattackStatBlock(input?: {
  readonly scimitarCount?: number;
  readonly shortbowCount?: number;
  readonly duplicateScimitarAttack?: boolean;
}): StatBlockRecord {
  const base = statBlockRecord();
  const scimitar = base.statBlock.actions?.attacks?.find(
    (attack) => attack.name === "Scimitar",
  );
  const shortbow = base.statBlock.actions?.attacks?.find(
    (attack) => attack.name === "Shortbow",
  );
  if (scimitar === undefined || shortbow === undefined) {
    throw new Error("Expected Goblin Warrior attack fixtures.");
  }
  return {
    ...base,
    id: "stat_block_multiattack_test_monster",
    statBlock: {
      ...base.statBlock,
      displayName: "Multiattack Test Monster",
      actions: {
        ...base.statBlock.actions,
        multiattacks: [
          {
            name: "Multiattack",
            dispatches: [
              {
                name: "Scimitar",
                count: { kind: "literal", value: input?.scimitarCount ?? 2 },
              },
              {
                name: "Shortbow",
                count: { kind: "literal", value: input?.shortbowCount ?? 1 },
              },
            ],
          },
        ],
        attacks:
          input?.duplicateScimitarAttack === true
            ? [scimitar, { ...shortbow, name: "Scimitar" }]
            : [scimitar, shortbow],
      },
    },
  };
}

export function monsterResourceStatBlockWithTwoRechargeActions(): StatBlockRecord {
  const base = monsterResourceStatBlock();
  const cinderBreath = base.statBlock.actions?.attacks?.find(
    (attack) => attack.name === "Cinder Breath",
  );
  if (cinderBreath === undefined) {
    throw new Error("Expected Cinder Breath fixture.");
  }
  return {
    ...base,
    id: "stat_block_two_recharge_test_monster",
    statBlock: {
      ...base.statBlock,
      actions: {
        ...base.statBlock.actions,
        attacks: [
          ...(base.statBlock.actions?.attacks ?? []),
          {
            ...cinderBreath,
            name: "Ash Cloud",
            limitedUse: { kind: "recharge", minimumRoll: 6 },
          },
        ],
      },
    },
  };
}

export function skeletonCreatureInit(input: {
  readonly initiative: number;
}): BattleCreatureInit {
  return {
    combatantId: skeletonId,
    displayName: "Skeleton",
    initiative: initiativeScore(input.initiative),
    side: oppositionSide,
    creatureInit: {
      kind: "statBlock",
      statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
      currentHp: Hp(13),
      maxHp: Hp(13),
      tempHp: Hp(0),
    },
  };
}

export function resistantSkeletonCreatureInit(input: {
  readonly initiative: number;
}): BattleCreatureInit {
  const skeleton = statBlockCatalog.requireStatBlock("stat_block_skeleton");
  const {
    vulnerabilities: _vulnerabilities,
    immunities: _immunities,
    ...statBlockWithoutDamageModifiers
  } = skeleton.statBlock;
  return {
    combatantId: skeletonId,
    displayName: "Slashing Resistant Skeleton",
    initiative: initiativeScore(input.initiative),
    side: oppositionSide,
    creatureInit: {
      kind: "statBlock",
      statBlock: {
        id: "stat_block_slashing_resistant_skeleton",
        kind: "statBlock",
        name: "Slashing Resistant Skeleton",
        challengeRating: skeleton.challengeRating,
        provenance: {
          kind: "xphb",
          section: "battle-runtime test fixture",
        },
        statBlock: {
          ...statBlockWithoutDamageModifiers,
          displayName: "Slashing Resistant Skeleton",
          resistances: { kind: "fixed", damageTypes: ["slashing"] },
        },
      },
      currentHp: Hp(13),
      maxHp: Hp(13),
      tempHp: Hp(0),
    },
  };
}

export function actionSurgeResource(input?: {
  readonly unit?: UnitRecord;
  readonly usesRemaining?: number;
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"]
>[number] {
  const unit = input?.unit ?? unitLibrary.requireUnit("fighter_action_surge");
  if (unit.kind !== "class_feature" || !("resource" in unit.mechanics)) {
    throw new Error("Expected Action Surge resource Unit.");
  }
  return {
    unit,
    ...(input?.usesRemaining === undefined
      ? {}
      : { usesRemaining: input.usesRemaining }),
  };
}

export function resource(input?: {
  readonly unit?: UnitRecord;
  readonly usesRemaining?: number;
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"]
>[number] {
  const unit = input?.unit ?? unitLibrary.requireUnit("fighter_second_wind");
  if (unit.kind !== "class_feature" || !("resource" in unit.mechanics)) {
    throw new Error("Expected Second Wind resource Unit.");
  }
  return {
    unit,
    ...(input?.usesRemaining === undefined
      ? {}
      : { usesRemaining: input.usesRemaining }),
  };
}

export function supportedBattleUnitRef(unit: UnitRecord): BattleUnitRef {
  const profiles = battleUnitSupportProfilesForUnit({ unit });
  if (Either.isLeft(profiles)) {
    throw new Error(profiles.left.message);
  }
  return {
    unitId: unit.id,
    supportProfiles: profiles.right,
  };
}

export function rageResource(input?: {
  readonly usesRemaining?: number;
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"]
>[number] {
  const unit = barbarianRageUnit();
  if (
    unit.mechanics.family !== "activation" ||
    !("resource" in unit.mechanics)
  ) {
    throw new Error("Expected Rage resource Unit.");
  }
  return {
    unit,
    ...(input?.usesRemaining === undefined
      ? {}
      : { usesRemaining: input.usesRemaining }),
  };
}

export function innateSorceryResource(input?: {
  readonly usesRemaining?: number;
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"]
>[number] {
  const unit = unitLibrary.requireUnit("sorcerer_innate_sorcery");
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "activation" ||
    !("resource" in unit.mechanics)
  ) {
    throw new Error("Expected Innate Sorcery resource Unit.");
  }
  return {
    unit,
    ...(input?.usesRemaining === undefined
      ? {}
      : { usesRemaining: input.usesRemaining }),
  };
}

export function rangerFavoredEnemyResource(input?: {
  readonly usesRemaining?: number;
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"]
>[number] {
  const unit = unitLibrary.requireUnit("ranger_favored_enemy");
  if (
    unit.kind !== "class_feature" ||
    unit.className !== "ranger" ||
    unit.mechanics.family !== "passive"
  ) {
    throw new Error("Expected Favored Enemy resource Unit.");
  }
  return {
    unit,
    ...(input?.usesRemaining === undefined
      ? {}
      : { usesRemaining: input.usesRemaining }),
  };
}

export function paladinsSmiteResource(input?: {
  readonly usesRemaining?: number;
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"]
>[number] {
  const unit = unitLibrary.requireUnit("paladin_paladins_smite");
  if (
    unit.kind !== "class_feature" ||
    unit.className !== "paladin" ||
    unit.mechanics.family !== "passive"
  ) {
    throw new Error("Expected Paladin's Smite resource Unit.");
  }
  return {
    unit,
    ...(input?.usesRemaining === undefined
      ? {}
      : { usesRemaining: input.usesRemaining }),
  };
}

export function recklessAttackFeature(): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["unitFeatures"]
>[number] {
  return { unit: barbarianRecklessAttackUnit() };
}

export function sneakAttackFeature(input?: {
  readonly acquiredAtLevel?: number;
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["unitFeatures"]
>[number] {
  return { unit: rogueSneakAttackUnit(input) };
}

function evasionFeature(input?: {
  readonly ability?: "dex" | "con";
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["unitFeatures"]
>[number] {
  return { unit: rogueEvasionUnit(input) };
}

export function reactionModifierUnitRef(
  unitId: string,
): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"]
>[number] {
  return {
    unitId,
    supportProfiles: [REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE],
  };
}

export function reactionModifierUnitRefWithProfile(
  unitId: string,
  profile:
    | typeof REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE
    | typeof ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"]
>[number] {
  return {
    unitId,
    supportProfiles: [profile],
  };
}

export function monkDeflectAttacksFocusResource(input?: {
  readonly usesRemaining?: number;
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"]
>[number] {
  return monksFocusResource(input);
}

export function monksFocusResource(input?: {
  readonly usesRemaining?: number;
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"]
>[number] {
  return {
    unit: unitLibrary.requireUnit("monk_monks_focus"),
    ...(input?.usesRemaining === undefined
      ? {}
      : { usesRemaining: input.usesRemaining }),
  };
}

export function cuttingWordsResource(input?: {
  readonly unit?: Extract<UnitRecord, { readonly kind: "class_feature" }>;
  readonly usesRemaining?: number;
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"]
>[number] {
  return {
    unit: input?.unit ?? cuttingWordsUnit(),
    usesRemaining: input?.usesRemaining ?? 1,
  };
}

export function bardicInspirationUnit(): Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
> {
  const unit = unitLibrary.requireUnit("bard_bardic_inspiration");
  if (unit.kind !== "class_feature") {
    throw new Error("Expected Bardic Inspiration class feature Unit.");
  }
  return unit;
}

export function bardicInspirationSubject(unitId: string): BattleSubject {
  return { tag: "unitFeature", actorId: fighterId, unitId };
}

function bardicInspirationResource(input: {
  readonly charismaModifier: number;
  readonly usesRemaining?: number;
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"]
>[number] {
  return {
    unit: bardicInspirationUnit(),
    capAbilityModifier: battleAbilityModifier(input.charismaModifier),
    ...(input.usesRemaining === undefined
      ? {}
      : { usesRemaining: input.usesRemaining }),
  };
}

export function bardicInspirationBattle(input: {
  readonly bardLevel?: number;
  readonly charismaModifier: number;
  readonly bardHidden?: boolean;
  readonly targetConditions?: readonly Condition[];
}): BattleState {
  const state = startBattleRight({
    battleId: battleId("battle-bardic-inspiration-grant"),
    combatants: [
      characterSeed({
        combatantId: fighterId,
        displayName: "Bard",
        initiative: 20,
        classLevels: [{ className: "bard", level: input.bardLevel ?? 1 }],
        attack: null,
        resources: [
          bardicInspirationResource({
            charismaModifier: input.charismaModifier,
          }),
        ],
        characterUnitRefs: [
          {
            unitId: bardicInspirationUnit().id,
            supportProfiles: [BARDIC_INSPIRATION_GRANT_SUPPORT_PROFILE],
          },
        ],
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
  let combatants: Map<CombatantId, BattleCreatureState> = new Map(
    state.combatants,
  );
  if (input.targetConditions !== undefined) {
    const target = combatants.get(goblinId);
    if (target === undefined) {
      throw new Error("Expected Bardic Inspiration target fixture.");
    }
    if (target.positiveHpUnconscious !== null) {
      throw new Error("Expected conscious Bardic Inspiration target fixture.");
    }
    combatants = combatants.set(goblinId, {
      ...target,
      conditions: input.targetConditions.reduce(
        (conditions, condition) => applyCondition(conditions, condition),
        target.conditions,
      ),
    });
  }
  if (input.bardHidden === true) {
    const bard = combatants.get(fighterId);
    if (bard === undefined) {
      throw new Error("Expected Bard fixture.");
    }
    combatants = combatants.set(fighterId, {
      ...bard,
      hidden: { discoveryDc: difficultyClass(16) },
    });
  }
  return { ...state, combatants };
}

export function bardicInspirationTargetFill(
  hole: BattleHole,
  targetId: CombatantId,
  input?: { readonly canHear?: boolean },
): BattleFill {
  return targetFill(hole, targetId, [
    {
      kind: "bardicInspirationTargetWithinRange",
      bardId: fighterId,
      targetId,
      unitId: bardicInspirationUnit().id,
      rangeFeet: movementFeet(60),
    },
    ...(input?.canHear === true
      ? [
          {
            kind: "bardicInspirationTargetCanHear" as const,
            bardId: fighterId,
            targetId,
            unitId: bardicInspirationUnit().id,
          },
        ]
      : []),
  ]);
}

export function grantBardicInspirationToGoblin(): BattleState {
  const bardicInspiration = bardicInspirationUnit();
  const state = bardicInspirationBattle({ charismaModifier: 3 });
  const subject = bardicInspirationSubject(bardicInspiration.id);
  const target = findHole(findAct(state, subject).initialHoles, "targetChoice");
  return requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [bardicInspirationTargetFill(target, goblinId)],
    }),
  ).state;
}

export function combatantHasBardicInspirationDie(
  state: BattleState,
  actorId: CombatantId,
): boolean {
  return (
    state.combatants
      .get(actorId)
      ?.activeEffects.some(
        (effect) => effect.kind === "bardicInspirationDie",
      ) ?? false
  );
}

export function bardicInspirationStaleTargetHole(): BattleHole {
  const unit = bardicInspirationUnit();
  const protocolId = `battle:unit-feature:${unit.id}:target`;
  return {
    kind: "targetChoice",
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: `${unit.name} target`,
    requiresTableSpatialFact: true,
    choices: [goblinId],
  };
}

export function characterResourceUses(
  state: BattleState,
  actorId: CombatantId,
): readonly unknown[] {
  const actor = state.combatants.get(actorId);
  return actor?.origin.kind === "character"
    ? actor.origin.resources.map((resource) =>
        "usesRemaining" in resource ? resource.usesRemaining : undefined,
      )
    : [];
}

export function goblinAttacksReactionModifierCharacter(input: {
  readonly unit: Extract<UnitRecord, { readonly kind: "class_feature" }>;
  readonly className: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["classLevels"][number]["className"];
  readonly level: number;
  readonly unitId: string;
  readonly armorClass?: ReturnType<typeof defaultArmorClassState>;
  readonly resources?: NonNullable<
    Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["resources"]
  >;
}): BattleState {
  return startBattleRight({
    battleId: battleId(`battle-${input.unitId}`),
    combatants: [
      statBlockCreatureInit({ initiative: 20 }),
      characterSeed({
        combatantId: fighterId,
        displayName: input.unit.name,
        initiative: 10,
        classLevels: [{ className: input.className, level: input.level }],
        attack: null,
        ...(input.armorClass === undefined
          ? {}
          : { armorClass: input.armorClass }),
        ...(input.resources === undefined
          ? {}
          : { resources: input.resources }),
        unitFeatures: [{ unit: input.unit }],
        characterUnitRefs: [reactionModifierUnitRef(input.unitId)],
      }),
    ],
  });
}

export function goblinScimitarHitReactionSetup(state: BattleState): {
  readonly subject: BattleSubject;
  readonly prefixFills: readonly BattleFill[];
  readonly result: ReturnType<typeof resolveBattleSubject>;
} {
  const subject: BattleSubject = {
    tag: "action",
    actorId: goblinId,
    action: "attack",
    attackName: "Scimitar",
  };
  const target = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const attackRoll = requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [targetFill(target, fighterId)],
    }),
    "attackRoll",
  );
  const prefixFills = [
    targetFill(target, fighterId),
    attackRollFill(attackRoll, { total: 20, naturalD20: 15 }),
  ];
  const result = resolveBattleSubject({ state, subject, fills: prefixFills });
  return { subject, prefixFills, result };
}

export function resolveGoblinScimitarHitReduction(input: {
  readonly state: BattleState;
  readonly unitId: string;
  readonly reductionRoll?: number;
  readonly damageRoll: number;
}): ReturnType<typeof resolveBattleSubject> {
  const setup = goblinScimitarHitReactionSetup(input.state);
  if (setup.result.tag !== "needsHoles") {
    throw new Error("Expected attack-hit Reaction window.");
  }
  const choice = reactionModifierChoice(
    setup.result.snapshot.pendingReaction!.choices,
    input.unitId,
    "attackDamageReduction",
  );
  const fills =
    input.reductionRoll === undefined
      ? []
      : [
          {
            kind: "rolledDice" as const,
            holeId: choice.initialHoles[0]!.holeId,
            value: [rolledDiceGroup([input.reductionRoll])] as const,
          },
        ];
  const afterReaction = resolveBattleReaction({
    state: setup.result.state,
    fill: reactionDecisionFill(
      findHole(setup.result.holes, "reactionDecision"),
      {
        kind: "resolve",
        reactorId: fighterId,
        choice: {
          kind: "reactionRollOrDamageReduction",
          unitId: input.unitId,
          modifierKind: "attackDamageReduction",
          fills,
        },
      },
    ),
  });
  if (afterReaction.tag !== "needsHoles") {
    throw new Error("Expected damage roll after hit reduction.");
  }
  const damage = requireHole(afterReaction, "rolledDice");
  const result = resolveBattleSubject({
    state: afterReaction.state,
    subject: setup.subject,
    fills: [
      ...setup.prefixFills,
      {
        kind: "rolledDice",
        holeId: damage.holeId,
        value: [rolledDiceGroup([input.damageRoll])] as const,
      },
    ],
  });
  if (result.tag !== "needsHoles") {
    return result;
  }
  if (
    result.snapshot.pendingReaction === null &&
    !result.holes.some((hole) => hole.kind === "concentrationSavingThrow")
  ) {
    throw new Error("Expected attack-damage Reaction or Concentration window.");
  }
  return result;
}

export function reactionModifierChoice(
  choices: ReadonlyArray<
    NonNullable<
      ReturnType<typeof snapshotBattle>["pendingReaction"]
    >["choices"][number]
  >,
  unitId: string,
  modifierKind:
    | "attackRollReduction"
    | "damageRollReduction"
    | "attackDamageReduction",
) {
  const choice = choices.find(
    (candidate) =>
      candidate.kind === "reactionRollOrDamageReduction" &&
      candidate.choice.unitId === unitId &&
      candidate.choice.kind === modifierKind,
  );
  if (choice?.kind !== "reactionRollOrDamageReduction") {
    throw new Error(
      `Expected ${unitId} ${modifierKind} reaction choice among ${JSON.stringify(
        choices.map((candidate) =>
          candidate.kind === "reactionRollOrDamageReduction"
            ? {
                kind: candidate.kind,
                unitId: candidate.choice.unitId,
                modifierKind: candidate.choice.kind,
              }
            : { kind: candidate.kind },
        ),
      )}.`,
    );
  }
  return choice;
}

export function reactionModifierReductionRollFill(
  choice: ReturnType<typeof reactionModifierChoice>,
  roll: number,
): BattleFill {
  const hole = choice.initialHoles[0];
  if (hole?.kind !== "rolledDice") {
    throw new Error("Expected Reaction modifier roll hole.");
  }
  return damageRollFill(hole, roll);
}

export function reactionChoiceWithSubject(
  choices: ReadonlyArray<
    NonNullable<
      ReturnType<typeof snapshotBattle>["pendingReaction"]
    >["choices"][number]
  >,
) {
  const choice = choices[0];
  if (choice === undefined || !("subject" in choice)) {
    throw new Error("Expected subject-backed reaction choice.");
  }
  return choice;
}

function rogueSneakAttackUnit(input?: {
  readonly acquiredAtLevel?: number;
}): Extract<UnitRecord, { readonly kind: "class_feature" }> {
  return {
    id: "rogue_sneak_attack",
    kind: "class_feature",
    name: "Sneak Attack",
    className: "rogue",
    acquiredAtLevel: input?.acquiredAtLevel ?? 1,
    description:
      "Once per turn, deal extra damage to one creature hit with an eligible attack roll.",
    provenance: {
      kind: "srd-5.2.1",
      section: "Classes/Rogue#Sneak Attack",
    },
    mechanics: {
      family: "on_hit_trigger",
      trigger: {
        kind: "hit_with_attack_roll",
        weaponFilter: "finesse_or_ranged",
        eligibility:
          "advantage_or_non_incapacitated_ally_within_5ft_of_target_without_disadvantage",
      },
      optional: true,
      usageLimit: { kind: "once_per_turn" },
      effect: {
        kind: "add_attack_damage_dice",
        dice: {
          kind: "class_level_table",
          dieSize: 6,
          dice: [
            { atLevel: 1, count: 1 },
            { atLevel: 3, count: 2 },
            { atLevel: 5, count: 3 },
            { atLevel: 7, count: 4 },
            { atLevel: 9, count: 5 },
            { atLevel: 11, count: 6 },
            { atLevel: 13, count: 7 },
            { atLevel: 15, count: 8 },
            { atLevel: 17, count: 9 },
            { atLevel: 19, count: 10 },
          ],
        },
        damageType: "same_as_attack",
      },
    },
  };
}

function rogueEvasionUnit(input?: {
  readonly ability?: "dex" | "con";
}): Extract<UnitRecord, { readonly kind: "class_feature" }> {
  return {
    id: "rogue_evasion",
    kind: "class_feature",
    name: "Evasion",
    className: "rogue",
    acquiredAtLevel: 7,
    description:
      "When a Dexterity Saving Throw would allow half damage, take no damage on success and half damage on failure.",
    provenance: {
      kind: "srd-5.2.1",
      section: "Classes/Rogue#Evasion",
    },
    mechanics: {
      family: "save_damage_replacement",
      trigger: {
        kind: "saving_throw_damage",
        ability: input?.ability ?? "dex",
        successDamage: "half_damage",
      },
      replacement: { onSuccess: "no_damage", onFail: "half_damage" },
      suppressedBy: [{ kind: "condition", condition: "incapacitated" }],
    },
  };
}

export function uncannyDodgeUnit(): Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
> {
  return {
    id: "rogue_uncanny_dodge",
    kind: "class_feature",
    name: "Uncanny Dodge",
    className: "rogue",
    acquiredAtLevel: 5,
    description:
      "Take a Reaction to halve damage from an attack roll that hits you.",
    provenance: {
      kind: "srd-5.2.1",
      section: "Classes/Rogue#Uncanny Dodge",
    },
    mechanics: {
      family: "reaction_roll_or_damage_reduction",
      modifiers: [
        {
          kind: "attack_damage_reduction",
          trigger: {
            kind: "hit_by_attack_roll",
            requiresVisibleAttacker: true,
          },
          reduction: { kind: "half_damage", rounding: "down" },
        },
      ],
    },
  };
}

export function cuttingWordsUnit(): Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
> {
  return {
    id: "bard_cutting_words",
    kind: "class_feature",
    name: "Cutting Words",
    className: "bard",
    acquiredAtLevel: 3,
    description:
      "Take a Reaction and expend Bardic Inspiration to reduce an attack roll or damage roll.",
    provenance: {
      kind: "srd-5.2.1",
      section: "Classes/Bard#Cutting Words",
    },
    mechanics: {
      family: "reaction_roll_or_damage_reduction",
      resource: {
        kind: "use_count",
        cap: { kind: "ability_modifier", ability: "cha" },
      },
      resetCadence: { kind: "long_rest" },
      modifiers: [
        {
          kind: "attack_roll_reduction",
          trigger: {
            kind: "creature_succeeds_attack_roll",
            rangeFeet: 60,
            requiresVisibleCreature: true,
          },
          reduction: { kind: "bardic_inspiration_die" },
        },
        {
          kind: "damage_roll_reduction",
          trigger: {
            kind: "creature_makes_damage_roll",
            rangeFeet: 60,
            requiresVisibleCreature: true,
          },
          reduction: { kind: "bardic_inspiration_die" },
        },
        {
          kind: "ability_check_reduction",
          trigger: {
            kind: "creature_succeeds_ability_check",
            rangeFeet: 60,
            requiresVisibleCreature: true,
          },
          reduction: { kind: "bardic_inspiration_die" },
        },
      ],
    },
  };
}

export function cuttingWordsDamageOnlyUnit(): Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
> {
  const unit = cuttingWordsUnit();
  if (unit.mechanics.family !== "reaction_roll_or_damage_reduction") {
    throw new Error("Expected Cutting Words reaction modifier mechanics.");
  }
  const damageRollModifier = unit.mechanics.modifiers.find(
    (modifier) => modifier.kind === "damage_roll_reduction",
  );
  if (damageRollModifier === undefined) {
    throw new Error("Expected Cutting Words damage-roll modifier.");
  }
  return {
    ...unit,
    id: "bard_cutting_words_damage_test",
    provenance: {
      kind: "xphb",
      section: "structured-input-only",
    },
    mechanics: {
      ...unit.mechanics,
      modifiers: [damageRollModifier],
    },
  };
}

export function cuttingWordsAttackOnlyUnit(): Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
> {
  const unit = cuttingWordsUnit();
  if (unit.mechanics.family !== "reaction_roll_or_damage_reduction") {
    throw new Error("Expected Cutting Words reaction modifier mechanics.");
  }
  const attackRollModifier = unit.mechanics.modifiers.find(
    (modifier) => modifier.kind === "attack_roll_reduction",
  );
  if (attackRollModifier === undefined) {
    throw new Error("Expected Cutting Words attack-roll modifier.");
  }
  return {
    ...unit,
    id: "bard_cutting_words_attack_test",
    provenance: {
      kind: "xphb",
      section: "structured-input-only",
    },
    mechanics: {
      ...unit.mechanics,
      modifiers: [attackRollModifier],
    },
  };
}

export function unsupportedAbilityModifierActivationUnit(): Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
> {
  return {
    id: "ranger_tireless_test",
    kind: "class_feature",
    name: "Tireless Test",
    className: "ranger",
    acquiredAtLevel: 10,
    description:
      "Unsupported ability-modifier activation resource fixture for admission.",
    provenance: {
      kind: "xphb",
      section: "structured-input-only",
    },
    mechanics: {
      family: "activation",
      activationCost: { kind: "standard_action", action: "magic" },
      resource: {
        kind: "use_count",
        cap: { kind: "ability_modifier", ability: "wis" },
      },
      resetCadence: { kind: "long_rest" },
      phases: [
        {
          kind: "direct",
          attachment: { kind: "self" },
          effects: [
            {
              kind: "grant_temp_hp",
              amount: {
                kind: "fixed",
                expr: {
                  dice: 1,
                  dieSize: 8,
                  abilityModifier: "wis",
                },
              },
            },
          ],
        },
      ],
    },
  };
}

export function barbarianRageUnit(): Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
> {
  return {
    id: "barbarian_rage",
    kind: "class_feature",
    name: "Rage",
    className: "barbarian",
    acquiredAtLevel: 1,
    description:
      "Enter a Rage as a Bonus Action, gaining Bludgeoning, Piercing, and Slashing Resistance and bonus damage for Strength weapon or Unarmed Strike attacks.",
    provenance: {
      kind: "srd-5.2.1",
      section: "Classes/Barbarian#Rage",
    },
    mechanics: {
      family: "activation",
      activationCost: { kind: "bonus_action" },
      ongoingFeature: {
        activationTiming: "activation_cost",
        lifecycle: {
          kind: "round_extended",
          initialExpiration: "end_of_next_turn",
          earlyEndConditions: ["incapacitated"],
          earlyEndArmorCategories: ["heavy"],
          extensionTriggers: [
            "attack_roll_against_enemy",
            "bonus_action",
            "enemy_saving_throw",
          ],
          maximumDuration: { unit: "minute", amount: 10 },
        },
        concentrationEffect: "break_and_prevent",
        actionRestrictions: ["spellcasting"],
        levelOverrides: [
          {
            atClassLevel: 15,
            lifecycle: {
              kind: "fixed_duration",
              duration: { unit: "minute", amount: 10 },
              earlyEndConditions: ["unconscious"],
              earlyEndArmorCategories: ["heavy"],
            },
          },
        ],
      },
      resource: {
        kind: "use_count",
        cap: {
          kind: "threshold_tiers",
          axis: "class",
          base: 2,
          tiers: [
            { atLevel: 3, value: 3 },
            { atLevel: 6, value: 4 },
            { atLevel: 12, value: 5 },
            { atLevel: 17, value: 6 },
          ],
        },
      },
      resetCadence: { kind: "partial_short_full_long", shortRestRefill: 1 },
      phases: [
        {
          kind: "direct",
          attachment: { kind: "self" },
          effects: [
            { kind: "grant_resistance", damageType: "bludgeoning" },
            { kind: "grant_resistance", damageType: "piercing" },
            { kind: "grant_resistance", damageType: "slashing" },
            {
              kind: "modify_damage_numeric",
              delta: {
                kind: "threshold_tiers",
                axis: "class",
                base: 2,
                tiers: [
                  { atLevel: 9, value: 3 },
                  { atLevel: 16, value: 4 },
                ],
                sign: "+",
              },
              abilityFilter: ["str"],
            },
          ],
        },
      ],
    },
  };
}

function barbarianRecklessAttackUnit(): Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
> {
  return {
    id: "barbarian_reckless_attack",
    kind: "class_feature",
    name: "Reckless Attack",
    className: "barbarian",
    acquiredAtLevel: 2,
    description:
      "Attack recklessly to gain Advantage on Strength attack rolls while attacks against you also have Advantage.",
    provenance: {
      kind: "srd-5.2.1",
      section: "Classes/Barbarian#Reckless Attack",
    },
    mechanics: {
      family: "activation",
      activationCost: { kind: "free" },
      ongoingFeature: {
        activationTiming: "first_attack_roll",
        lifecycle: {
          kind: "turn_boundary",
          initialExpiration: "start_of_next_turn",
          earlyEndConditions: [],
          earlyEndArmorCategories: [],
        },
        actionRestrictions: [],
      },
      usageLimit: { kind: "once_per_turn" },
      phases: [
        {
          kind: "direct",
          attachment: { kind: "self" },
          effects: [
            {
              kind: "modify_roll_advantage",
              mode: "advantage",
              affects: "self_roll",
              on: ["attack_roll"],
              abilityFilter: ["str"],
            },
            {
              kind: "modify_roll_advantage",
              mode: "advantage",
              affects: "rolls_against_self",
              on: ["attack_roll"],
            },
          ],
        },
      ],
    },
  };
}

export function unsupportedClassRiderResource(
  unitId: string,
  name: string,
): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"]
>[number] {
  const unit = actionSurgeWithAdditionalDirectEffect();
  if (unit.kind !== "class_feature" || !("resource" in unit.mechanics)) {
    throw new Error("Expected class feature resource Unit.");
  }
  return {
    unit: { ...unit, id: unitId, name },
  };
}

export function actionSurgeWithAdditionalDirectEffect(): UnitRecord {
  const unit = unitLibrary.requireUnit("fighter_action_surge");
  if (unit.kind !== "class_feature" || unit.mechanics.family !== "activation") {
    throw new Error("Expected Action Surge activation Unit.");
  }
  const phase = unit.mechanics.phases[0];
  if (phase?.kind !== "direct" || phase.effects === undefined) {
    throw new Error("Expected Action Surge direct phase.");
  }
  return {
    ...unit,
    mechanics: {
      ...unit.mechanics,
      phases: [
        {
          ...phase,
          effects: duplicateRuntimeDirectEffects(phase.effects, "Action Surge"),
        },
      ],
    },
  };
}

export function secondWindWithAdditionalDirectEffect(): UnitRecord {
  const unit = unitLibrary.requireUnit("fighter_second_wind");
  if (unit.kind !== "class_feature" || unit.mechanics.family !== "activation") {
    throw new Error("Expected Second Wind activation Unit.");
  }
  const phase = unit.mechanics.phases[0];
  if (phase?.kind !== "direct" || phase.effects === undefined) {
    throw new Error("Expected Second Wind direct phase.");
  }
  return {
    ...unit,
    mechanics: {
      ...unit.mechanics,
      phases: [
        {
          ...phase,
          effects: duplicateRuntimeDirectEffects(phase.effects, "Second Wind"),
        },
      ],
    },
  };
}

function duplicateRuntimeDirectEffects(
  effects: readonly AreaDirectEffectAtom[],
  unitName: string,
): readonly [EffectAtom, ...EffectAtom[]] {
  const runtimeEffects = effects.flatMap((effect): readonly EffectAtom[] =>
    isEffectAtom(effect) ? [effect] : [],
  );
  const duplicatedEffect = runtimeEffects.at(0);
  if (
    runtimeEffects.length !== effects.length ||
    duplicatedEffect === undefined
  ) {
    throw new Error(`Expected ${unitName} direct EffectAtom phase.`);
  }
  return [duplicatedEffect, ...runtimeEffects];
}

export function wizardVsSkeletonBattle(input?: {
  readonly extraCombatants?: readonly BattleCreatureInit[];
}): BattleState {
  return startBattleRight({
    battleId: battleId("battle-wizard-skeleton"),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Wizard",
        initiative: 20,
        attack: null,
        spellcasting: wizardSpellcasting(),
      }),
      skeletonCreatureInit({ initiative: 10 }),
      ...(input?.extraCombatants ?? []),
    ],
  });
}

export function wizardVsRogueBattle(input: {
  readonly evasion: boolean;
  readonly saveDamageReplacementSupport?: boolean;
  readonly evasionAbility?: "dex" | "con";
}): BattleState {
  const supportEvasion =
    input.evasion && input.saveDamageReplacementSupport !== false;
  return startBattleRight({
    battleId: battleId("battle-wizard-rogue"),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Wizard",
        initiative: 20,
        attack: null,
        spellcasting: wizardSpellcasting({
          cantrips: [dexHalfDamageCantrip()],
          preparedSpells: [],
        }),
      }),
      characterSeed({
        combatantId: fighterId,
        displayName: input.evasion ? "Evasive Rogue" : "Rogue",
        initiative: 10,
        classLevels: [{ className: "rogue", level: 7 }],
        attack: null,
        unitFeatures: input.evasion
          ? [
              input.evasionAbility === undefined
                ? evasionFeature()
                : evasionFeature({ ability: input.evasionAbility }),
            ]
          : [],
        characterUnitRefs: supportEvasion
          ? [
              {
                unitId: "rogue_evasion",
                supportProfiles: [SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE],
              },
            ]
          : [],
      }),
    ],
  });
}

export function wizardSpellcasting(input?: {
  readonly cantrips?: readonly SpellRecord[];
  readonly preparedSpells?: readonly SpellRecord[];
  readonly spellSlots?: readonly {
    readonly spellLevel: 1 | 2 | 3 | 4 | 5;
    readonly count: number;
  }[];
  readonly invocationSpellAccesses?: NonNullable<
    Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["spellcasting"]
  >["invocationSpellAccesses"];
  readonly bookOfShadowsSpellAccesses?: NonNullable<
    Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["spellcasting"]
  >["bookOfShadowsSpellAccesses"];
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"]
> {
  return {
    sourceClassName: "wizard",
    spellcastingAbilityModifier: 3,
    proficiencyBonus: proficiencyBonus(2),
    canCastSpells: true,
    cantrips: input?.cantrips ?? [
      spellRecord("ray_of_frost"),
      spellRecord("acid_splash"),
    ],
    preparedSpells: input?.preparedSpells ?? [spellRecord("magic_missile")],
    featurePreparedSpells: [],
    spellbookRitualSpellAccesses: [],
    ...(input?.bookOfShadowsSpellAccesses === undefined
      ? {}
      : { bookOfShadowsSpellAccesses: input.bookOfShadowsSpellAccesses }),
    invocationSpellAccesses: input?.invocationSpellAccesses ?? [],
    spellSlots: input?.spellSlots ?? [{ spellLevel: 1, count: 2 }],
  };
}

function dexHalfDamageCantrip(): SpellRecord {
  const spell = spellRecord("acid_splash");
  if (spell.mechanics.family !== "activation") {
    throw new Error("Expected Acid Splash activation spell.");
  }
  const phase = spell.mechanics.phases[0];
  if (phase?.kind !== "save_gate") {
    throw new Error("Expected Acid Splash save-gate phase.");
  }
  return {
    ...spell,
    id: "dex_half_cantrip",
    name: "Dex Half Cantrip",
    mechanics: {
      ...spell.mechanics,
      phases: [
        {
          ...phase,
          onSuccess: { kind: "half_damage" },
        },
      ],
    },
  };
}

export function acidSplashWithRadius(radiusFeet: number): SpellRecord {
  const phase = acidSplashInput.mechanics.phases[0];
  if (
    phase?.kind !== "save_gate" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "area" ||
    phase.attachment.value.shape.kind !== "sphere"
  ) {
    throw new Error("Expected Acid Splash point-origin Sphere phase.");
  }
  const decoded = decodeUnitRecordSync({
    ...acidSplashInput,
    mechanics: {
      ...acidSplashInput.mechanics,
      phases: [
        {
          ...phase,
          attachment: {
            ...phase.attachment,
            value: {
              ...phase.attachment.value,
              shape: {
                ...phase.attachment.value.shape,
                radiusFeet,
              },
            },
          },
        },
      ],
    },
  });
  if (decoded.kind !== "spell") {
    throw new Error("Expected Acid Splash spell fixture.");
  }
  return decoded;
}

export function slotAttackDamageSpell(input?: {
  readonly id?: string;
  readonly name?: string;
  readonly axis?: "character" | "slot";
}): SpellRecord {
  const spell = spellRecord("ray_of_frost");
  if (spell.mechanics.family !== "activation") {
    throw new Error("Expected Ray of Frost activation spell.");
  }
  const phase = spell.mechanics.phases[0];
  if (phase?.kind !== "attack_roll") {
    throw new Error("Expected Ray of Frost spell attack phase.");
  }
  const damageEffect = phase.onHit[0];
  if (damageEffect?.kind !== "damage") {
    throw new Error("Expected Ray of Frost damage effect.");
  }
  return {
    ...spell,
    id: input?.id ?? "slot_attack_damage",
    name: input?.name ?? "Slot Attack Damage",
    mechanics: {
      ...spell.mechanics,
      level: 1,
      phases: [
        {
          ...phase,
          onHit: [
            {
              ...damageEffect,
              amount: {
                kind: "linear_per_level",
                axis: input?.axis ?? "slot",
                startingAtLevel: 1,
                base: { dice: 2, dieSize: 8 },
                perLevel: { dice: 1 },
              },
            },
          ],
        },
      ],
    },
  };
}

export function slotSaveDamageSpell(): SpellRecord {
  const spell = spellRecord("acid_splash");
  if (spell.mechanics.family !== "activation") {
    throw new Error("Expected Acid Splash activation spell.");
  }
  const phase = spell.mechanics.phases[0];
  if (phase?.kind !== "save_gate" || phase.onFail.kind !== "damage") {
    throw new Error("Expected Acid Splash save-gate damage phase.");
  }
  return {
    ...spell,
    id: "slot_save_damage",
    name: "Slot Save Damage",
    mechanics: {
      ...spell.mechanics,
      level: 1,
      phases: [
        {
          ...phase,
          onFail: {
            ...phase.onFail,
            amount: {
              kind: "linear_per_level",
              axis: "slot",
              startingAtLevel: 1,
              base: { dice: 2, dieSize: 6 },
              perLevel: { dice: 1 },
            },
          },
        },
      ],
    },
  };
}

export function spellRecord(spellId: SpellRecord["id"]): SpellRecord {
  const unit =
    testSpellRecords.get(spellId) ??
    Option.getOrUndefined(unitLibrary.getUnit(spellId));
  if (unit === undefined) {
    throw new Error(`Expected ${spellId} spell Unit.`);
  }
  if (unit.kind !== "spell") {
    throw new Error(`Expected ${spellId} to be a spell Unit.`);
  }
  return unit;
}

export function magicSubject(
  spellId: SpellRecord["id"] | "dex_half_cantrip",
): BattleSubject {
  const spell =
    spellId === "dex_half_cantrip"
      ? dexHalfDamageCantrip()
      : spellRecord(spellId);
  return {
    tag: "actionSpell",
    actorId: wizardId,
    invocation: testMagicSubjectInvocation(spell),
    mode: { tag: "cast" },
  };
}

function testMagicSubjectInvocation(spell: SpellRecord): SpellInvocationRef {
  const invocationState = startBattleRight({
    battleId: battleId(`battle-test-spell-invocation-${spell.id}`),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Wizard",
        initiative: 20,
        attack: null,
        spellcasting: wizardSpellcasting({
          cantrips: spell.mechanics.level === 0 ? [spell] : [],
          preparedSpells: spell.mechanics.level === 0 ? [] : [spell],
          spellSlots: [
            { spellLevel: testSpellSlotLevelForSpell(spell), count: 1 },
          ],
        }),
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
  const actor = invocationState.combatants.get(wizardId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected test spell invocation actor.");
  }
  const invocations = supportedSpellActs(actor, invocationState).filter(
    (invocation) =>
      invocation.spell.id === spell.id &&
      invocation.procedure !== "shieldReaction",
  );
  if (invocations.length !== 1) {
    throw new Error(
      `Expected one supported test spell invocation for ${spell.id}, got ${invocations.length}.`,
    );
  }
  const invocation = invocations[0];
  if (invocation === undefined) {
    throw new Error(
      `Expected supported test spell invocation for ${spell.id}.`,
    );
  }
  return supportedSpellInvocationRef(invocation);
}

function testSpellSlotLevelForSpell(spell: SpellRecord): 1 | 2 | 3 | 4 | 5 {
  const level = spell.mechanics.level;
  if (level === 1 || level === 2 || level === 3 || level === 4 || level === 5) {
    return level;
  }
  if (level === 0) {
    return 1;
  }
  throw new Error(
    `Unsupported test spell slot level for ${spell.id}: ${level}.`,
  );
}

export function expendedLevelOneSlots(
  result: Extract<
    ReturnType<typeof resolveBattleSubject>,
    { readonly tag: "resolved" }
  >,
  actorId: CombatantId,
): number {
  const actor = result.state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected character spellcaster.");
  }
  return (
    actor.origin.spellcasting?.spellSlots.find((slot) => slot.spellLevel === 1)
      ?.expended ?? 0
  );
}

export {
  abilityModifier,
  applyBattleHitPointDamage,
  applyCondition,
  applyWeaponMasterySapOnHit,
  armorClass,
  armorOfShadowsSpellInvocationRef,
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
  attackBonus,
  BATTLE_READIED_SPELL_TRIGGERS,
  battleAbilityModifier,
  battleAreaId,
  battleBonusActionStandardActionSupportForUnit,
  BattleFillSchema,
  BattleHoleSchema,
  battleId,
  battleObjectId,
  battleObscurementZones,
  battleReactionRollOrDamageReductionSupportForUnit,
  BattleSnapshotSchema,
  BattleSubjectSchema,
  battleUnitSupportProfilesForUnit,
  breakBattleConcentration,
  cantripSpellInvocationRef,
  characterBattleResourceIsUseCount,
  characterBattleResourceIsUnlimited,
  characterBattleResourceSupportedForUnit,
  characterBattleResourceUsage,
  classFeatureFreeCastSpellInvocationRef,
  combatantCanSee,
  combatantId,
  concentrationSavingThrowDc,
  damageAmount,
  decodeUnitRecordSync,
  defaultArmorClassState,
  DieRollResult,
  difficultyClass,
  discoverBattleActs,
  Either,
  elapsedTimeTicks,
  endTurn,
  findFamiliarFormEligibilityForSpell,
  findFamiliarInput,
  hasCondition,
  holeId,
  holeInstanceKey,
  Hp,
  initiativeScore,
  KNOCKED_OUT_UNCONSCIOUS,
  movementDeltaFeet,
  movementFeet,
  objectInvisibleBenefitDenied,
  PACT_OF_THE_CHAIN_FIND_FAMILIAR_INVOCATION_MODE,
  pactOfTheChainFindFamiliarFormEligibilityForSpell,
  removeCondition,
  requiredAbilityCheckRollMode,
  resolveBardicInspirationFailedD20Test,
  resolveBattleConcentrationDamage,
  resolveBattleReaction,
  resolveBattleSubject,
  resolveFailedAbilityCheckResourceBoost,
  resolveFindFamiliarForm,
  resolveMarkedDamageRiderSpellAct,
  resolvePactOfTheChainFindFamiliarForm,
  resolveSuccessfulAbilityCheckReactionReduction,
  resourceCount,
  sameBattleSubject,
  Schema,
  snapshotBattle,
  spellFillSet,
  spellSaveDcForCaster,
  spellSlotInvocationRef,
  startBattle,
  supportedSpellActs,
  supportedSpellInvocationMatchesRef,
  tickDurationEffects,
  ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE,
};

export type {
  ActiveOngoingFeatureOccurrence,
  BattleFill,
  BattleHole,
  BattleReactionFrame,
  BattleReadiedSpellTrigger,
  BattleState,
  BattleSubject,
  CombatantId,
  OngoingFeatureSourceKey,
};
