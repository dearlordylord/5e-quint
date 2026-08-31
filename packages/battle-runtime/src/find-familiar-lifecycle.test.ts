import { assertStatBlockForTest } from "@dnd/surface/surface/stat-block-catalog.test-support";
import {
  unitId as parseSharedUnitId,
  statBlockId as parseSharedStatBlockId,
} from "@dnd/shared/game-facts";
import {
  battleRuntimeContextForTest,
  battleRuntimeSessionForTest,
} from "./battle-runtime-session.test-support.ts";
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.companion-lifecycle unit-feature.d20-test-natural-one-reroll
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV84I5 find_familiar
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import {
  familiarMaxHp,
  spawnedCompanionCurrentHitPoints,
  spawnedCompanionIdentityIssue,
  presentSpawnedCompanionHitPoints,
} from "./companion-lifecycle-execution.ts";
import { removeBattleCombatants } from "./battle-reducer/api-lifecycle.ts";
import { Result } from "effect";
import * as Option from "effect/Option";
import { Schema } from "effect";
import { battleStatBlockCombatantSource } from "./stat-block-combatant-admission.ts";
import { projectAuthoredStatBlock } from "./stat-block-authored-projection.ts";
import { describe, expect, test } from "vitest";
import { attackExecutionSelectionForOption } from "./battle-action-options.ts";
import { statBlockAttackActionOptions } from "./stat-block-execution.ts";
import { statBlockAttackDamageSelectionUsesOnlyComponentNotation } from "./stat-block-attack-damage-selection.ts";
import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  applyCondition,
  type ConditionState,
} from "@dnd/shared-algebras/conditions-algebra";
import { srdStatBlockCollection } from "@dnd/surface/surface/stat-block-catalog";
import { buildStatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { StatBlockRecordSchema } from "@dnd/surface/surface/schema";
import {
  spawnedCompanionFormEligibilityForSpell,
  pactOfTheChainSpawnedCompanionFormEligibilityForSpell,
  resolvePactOfTheChainSpawnedCompanionForm,
  type SpawnedCompanionFormEligibility,
} from "@dnd/surface/surface/find-familiar-forms";
import {
  admitCompanionToBattle,
  admitCompanionToBattleRuntime,
  applySpawnedCompanionZeroHitPointDisappearance,
  battleAvailableDruidWildShapeKnownForms,
  wildShapeKnownFormsIssueMessage,
  battleCreaturePresentationDisplayName,
  battleDruidWildShapeKnownFormSupportForUnit,
  battleId,
  battleCheckpointFrontierEnvelope,
  battleObjectId,
  battleUnitSupportProfilesForUnit,
  BattleSnapshotSchema,
  BattleCheckpointFrontierEnvelopeSchema,
  castSpawnedCompanion,
  castRetainedSpawnedCompanionRuntime,
  castWildCompanion,
  characterId,
  combatantId,
  deliverTouchSpellThroughSpawnedCompanion,
  discoverBattleActs,
  emptyBattleRuntimeContext,
  endTurn,
  DRUID_WILD_COMPANION_SPELL_CAST_SUPPORT_PROFILE,
  spawnedCompanionEntryForOwner,
  spawnedCompanionForOwner,
  spawnedCompanionCreatureTypeOverrideForOwner,
  spawnedCompanionTelepathicConnection,
  initiativeScore,
  permanentlyDismissSpawnedCompanion,
  reappearTemporarilyDismissedSpawnedCompanion,
  retainedStoredFormForPresentCompanion,
  resolveBattleRuntimeSubject,
  resolveBattleInterrupt,
  SPELL_CAST_REACTION_FACTS_HOLE_ID,
  shareSpawnedCompanionSenses,
  snapshotBattle,
  startBattle,
  temporarilyDismissSpawnedCompanion,
  type BattleFill,
  type BattleHole,
  type BattleInterruptProcedureChoice,
  type BattleCreatureInit,
  type BattleState,
  type BattleRuntimeSession,
  type PactOfTheChainFamiliarAttackSubject,
} from "./index.ts";
import { battleStatBlockProcedureExecutionRef } from "./identity.ts";
import {
  deliverTouchSpellThroughSpawnedCompanion as deliverTouchSpellThroughSpawnedCompanionWithExecution,
  CompanionLifecycleProcedureExecution,
  resolveAdmittedCompanionReappearanceSubject,
} from "./battle-reducer/companion-lifecycle-procedures.ts";
import { companionRouteForResolution } from "./battle-reducer/companion-routes.ts";
import { admitSpawnedCompanionReappearance } from "./companion-admission.ts";
import { castResolvedSpawnedCompanion } from "./companion-lifecycle.ts";
import { spendSpawnedCompanionTouchDeliveryReaction } from "./companion-communication.ts";
import {
  assertBattleSnapshotCodecRoundTripForTest,
  characterBattleFeatureInitForTest,
  readyDeclarationFillForTest,
  projectedStatBlockRuntimeSource,
  requireCharacterSpellProcedureRefForTest,
  battleFrontierInterruptDecisionForState,
  resolveBattleSubject,
} from "./battle-runtime.test-support.ts";
import {
  spellSlotInvocationRef,
  type BattleInterruptSubject,
} from "./battle-subjects.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import { D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND } from "./battle-state-execution.ts";
import { ATTACK_TARGET_HOLE_ID } from "./battle-reducer/battle-runtime-protocol.ts";
import { battleCreatureStateWithoutKnockOut } from "./battle-reducer/creature-state.ts";
import { applyBattleHitPointDamage } from "./battle-reducer/damage-apply.ts";
import { D20_TEST_NATURAL_ONE_REROLL_UNAVAILABLE_MESSAGE } from "./battle-reducer/d20-test-natural-one-reroll.ts";
import { statBlockProcedurePresentations } from "./stat-block-presentation.ts";
import {
  abilityModifier,
  attackBonus,
  DieRollResult,
  Hp,
  movementFeet,
  NonNegativeInteger,
  proficiencyBonus,
  resourceCount,
  spellSlotLevel,
} from "@dnd/shared/types";
import type { SpellRecord, StatBlockRecord } from "@dnd/surface/surface/types";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";
const casterId = combatantId("caster");
const familiarId = combatantId("caster-familiar");
const otherCombatantId = combatantId("other-combatant");
const enemyId = combatantId("enemy");
const replacementFamiliarId = combatantId("replacement-familiar");
const droppedObjectId = battleObjectId("familiar-pack");

const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});
if (statBlockCatalogResult.tag !== "ok") {
  throw new Error("Expected SRD Stat Block catalog for tests.");
}
const statBlockCatalog = statBlockCatalogResult.catalog;

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Expected SRD Unit catalog for tests.");
}
const unitCatalog = unitCatalogResult.catalog;
const spawnedCompanionSpell = requireSpellRecord("find_familiar");
const cureWoundsSpell = requireSpellRecord("cure_wounds");
const barkskinSpell = requireSpellRecord("barkskin");
const healingWordSpell = requireSpellRecord("healing_word");
const counterspellSpell = requireSpellRecord("counterspell");
const shockingGraspSpell = requireSpellRecord("shocking_grasp");
const shieldSpell = requireSpellRecord("shield");
const druidWildShapeUnit = unitCatalog.requireUnit("druid_wild_shape");
const familiarEligibility: SpawnedCompanionFormEligibility =
  requireSpawnedCompanionEligibility(
    spawnedCompanionFormEligibilityForSpell(spawnedCompanionSpell),
  );
const pactFamiliarEligibility =
  pactOfTheChainSpawnedCompanionFormEligibilityForSpell(spawnedCompanionSpell);
if (pactFamiliarEligibility === null) {
  throw new Error("Expected Pact of the Chain familiar form eligibility.");
}

function requireSpawnedCompanionEligibility(
  eligibility: SpawnedCompanionFormEligibility | null,
): SpawnedCompanionFormEligibility {
  if (eligibility === null) {
    throw new Error("Expected Find Familiar form eligibility.");
  }
  return eligibility;
}

function requireSpellRecord(unitId: string): SpellRecord {
  const unit = unitCatalog.requireUnit(unitId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected ${unitId} spell record.`);
  }
  return unit;
}

function halflingLuckUnitRef(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unit = halflingLuckUnit();
  const supportProfiles = battleUnitSupportProfilesForUnit({ unit });
  if (Result.isFailure(supportProfiles)) {
    throw new Error(supportProfiles.failure.message);
  }
  return {
    unit: unitCatalog.requireUnit(unit.id),
    supportProfiles: supportProfiles.success,
  };
}

function halflingLuckUnitFeature(): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["unitFeatures"]
>[number] {
  return characterBattleFeatureInitForTest(halflingLuckUnit());
}

function halflingLuckUnit() {
  return unitCatalog.requireUnit("species_halfling_luck");
}

const firstTypeOverride = familiarEligibility.creatureTypeOverrideChoices[0];
if (firstTypeOverride === undefined) {
  throw new Error("Expected Find Familiar creature type override choices.");
}

type NestedProcedureChoice = Extract<
  BattleInterruptProcedureChoice,
  { readonly kind: "nestedProcedure" }
>;
type TriggeredReactionSpellChoice = NestedProcedureChoice & {
  readonly subject: Extract<
    BattleInterruptSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "castTriggeredReactionSpell";
    }
  >;
};

function isTriggeredReactionSpellChoice(
  choice: BattleInterruptProcedureChoice,
): choice is TriggeredReactionSpellChoice {
  return (
    choice.kind === "nestedProcedure" &&
    choice.subject.tag === "runtimeCommand" &&
    choice.subject.command === "castTriggeredReactionSpell"
  );
}

function druidWildShapeKnownForms() {
  const profile =
    battleDruidWildShapeKnownFormSupportForUnit(druidWildShapeUnit);
  if (profile === null || profile === "unsupported") {
    throw new Error("Expected Druid Wild Shape known-form support profile.");
  }
  const forms = battleAvailableDruidWildShapeKnownForms({
    profile,
    forms: [
      assertStatBlockForTest(
        statBlockCatalog,
        parseSharedStatBlockId("stat_block_rat"),
      ),
      assertStatBlockForTest(
        statBlockCatalog,
        parseSharedStatBlockId("stat_block_riding_horse"),
      ),
      assertStatBlockForTest(
        statBlockCatalog,
        parseSharedStatBlockId("stat_block_lizard"),
      ),
      assertStatBlockForTest(
        statBlockCatalog,
        parseSharedStatBlockId("stat_block_cat"),
      ),
    ],
  });
  if (Result.isFailure(forms)) {
    throw new Error(wildShapeKnownFormsIssueMessage(forms.failure.issues));
  }
  return forms.success;
}

function startFixtureBattle(
  input: {
    readonly extraCombatantId?: typeof otherCombatantId;
    readonly includeEnemy?: boolean;
  } = {},
): BattleState {
  const skeleton = assertStatBlockForTest(
    statBlockCatalog,
    parseSharedStatBlockId("stat_block_skeleton"),
  );
  const maxHp = literalHp(skeleton);
  const result = startBattle({
    battleId: battleId("companion-lifecycle-test"),
    combatants: [
      {
        combatantId: casterId,
        initiative: initiativeScore(12),
        creatureInit: {
          kind: "statBlock",
          source: Result.getOrThrow(
            battleStatBlockCombatantSource(
              projectedStatBlockRuntimeSource(skeleton),
            ),
          ),
          currentHp: maxHp,
          tempHp: Hp(0),
          ammunitionStocks: [
            { ammunition: "arrow" as const, remaining: resourceCount(20) },
          ],
          conditions: [],
          presentation: {
            displayName: "Caster",
            communication: { kind: "none" as const },
            traits: [],
            orderedProcedures: [],
          },
        },
      },
      ...(input.includeEnemy === true
        ? [
            {
              combatantId: enemyId,
              initiative: initiativeScore(10),
              creatureInit: {
                kind: "statBlock" as const,
                source: Result.getOrThrow(
                  battleStatBlockCombatantSource(
                    projectedStatBlockRuntimeSource(skeleton),
                  ),
                ),
                currentHp: maxHp,
                tempHp: Hp(0),
                ammunitionStocks: [
                  {
                    ammunition: "arrow" as const,
                    remaining: resourceCount(20),
                  },
                ],
                conditions: [],
                presentation: {
                  displayName: "Enemy",
                  communication: { kind: "none" as const },
                  traits: [],
                  orderedProcedures: [],
                },
              },
            },
          ]
        : []),
      ...(input.extraCombatantId === undefined
        ? []
        : [
            {
              combatantId: input.extraCombatantId,
              initiative: initiativeScore(10),
              creatureInit: {
                kind: "statBlock" as const,
                source: Result.getOrThrow(
                  battleStatBlockCombatantSource(
                    projectedStatBlockRuntimeSource(skeleton),
                  ),
                ),
                currentHp: maxHp,
                tempHp: Hp(0),
                ammunitionStocks: [
                  {
                    ammunition: "arrow" as const,
                    remaining: resourceCount(20),
                  },
                ],
                conditions: [],
                presentation: {
                  displayName: "Other Combatant",
                  communication: { kind: "none" as const },
                  traits: [],
                  orderedProcedures: [],
                },
              },
            },
          ]),
    ],
  });
  if (Result.isFailure(result)) {
    throw new Error(battleStateInitIssueMessage(result.failure));
  }
  return result.success.state;
}

function startSpellcasterFixtureBattle(
  input: {
    readonly enemyCanCounterspell?: boolean;
    readonly casterSpellProfile?: "druidTouchSpells" | "wizardShockingGrasp";
  } = {},
): BattleRuntimeSession {
  const usesWizardShockingGrasp =
    input.casterSpellProfile === "wizardShockingGrasp";
  const result = startBattle({
    battleId: battleId("companion-communication-test"),
    combatants: [
      characterCreature({
        combatantId: casterId,
        displayName: "Caster",
        initiative: 12,
        className: usesWizardShockingGrasp ? "wizard" : "druid",
        spellcasting: {
          spellcastingSource: {
            tag: "classSpellcasting",
            className: usesWizardShockingGrasp ? "wizard" : "druid",
            abilityModifier: abilityModifier(3),
          },
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: usesWizardShockingGrasp ? [shockingGraspSpell] : [],
          preparedSpells: usesWizardShockingGrasp
            ? []
            : [cureWoundsSpell, healingWordSpell, barkskinSpell],
          featurePreparedSpells: [],
          spellAccesses: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: usesWizardShockingGrasp
            ? []
            : [
                { spellLevel: 1, count: 2 },
                { spellLevel: 2, count: 1 },
              ],
        },
      }),
      characterCreature({
        combatantId: enemyId,
        displayName: "Target",
        initiative: 10,
        currentHp: 1,
        maxHp: 12,
        ...(input.enemyCanCounterspell !== true
          ? {}
          : {
              classLevel: 5,
              spellcasting: {
                spellcastingSource: {
                  tag: "classSpellcasting",
                  className: "wizard",
                  abilityModifier: abilityModifier(3),
                },
                proficiencyBonus: proficiencyBonus(3),
                canCastSpells: true,
                cantrips: [],
                preparedSpells: [counterspellSpell],
                featurePreparedSpells: [],
                spellAccesses: [],
                spellbookRitualSpellAccesses: [],
                invocationSpellAccesses: [],
                spellSlots: [{ spellLevel: 3, count: 1 }],
              },
            }),
      }),
    ],
  });
  if (Result.isFailure(result)) {
    throw new Error(battleStateInitIssueMessage(result.failure));
  }
  return result.success;
}

function startPactWarlockFixtureBattle(
  input: {
    readonly targetHasShield?: boolean;
    readonly ownerCharacterUnitRefs?: Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["characterUnitRefs"];
    readonly ownerCharacterUnitFeatures?: Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["unitFeatures"];
  } = {},
): BattleRuntimeSession {
  const result = startBattle({
    battleId: battleId("companion-reaction-attack-test"),
    combatants: [
      characterCreature({
        combatantId: casterId,
        displayName: "Pact Warlock",
        initiative: 12,
        className: "warlock",
        ...(input.ownerCharacterUnitRefs === undefined
          ? {}
          : { characterUnitRefs: input.ownerCharacterUnitRefs }),
        ...(input.ownerCharacterUnitFeatures === undefined
          ? {}
          : { unitFeatures: input.ownerCharacterUnitFeatures }),
        spellcasting: {
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "warlock",
            abilityModifier: abilityModifier(3),
          },
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [],
          featurePreparedSpells: [],
          spellAccesses: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [
            {
              tag: "pactOfTheChainSpawnedCompanion",
              spell: spawnedCompanionSpell,
            },
          ],
          spellSlots: [],
        },
      }),
      characterCreature({
        combatantId: enemyId,
        displayName: "Target",
        initiative: 10,
        currentHp: 12,
        maxHp: 12,
        ...(input.targetHasShield === true
          ? {
              spellcasting: {
                spellcastingSource: {
                  tag: "classSpellcasting",
                  className: "wizard",
                  abilityModifier: abilityModifier(3),
                },
                proficiencyBonus: proficiencyBonus(2),
                canCastSpells: true,
                cantrips: [],
                preparedSpells: [shieldSpell],
                featurePreparedSpells: [],
                spellAccesses: [],
                spellbookRitualSpellAccesses: [],
                invocationSpellAccesses: [],
                spellSlots: [{ spellLevel: 1, count: 1 }],
              },
            }
          : {}),
      }),
    ],
  });
  if (Result.isFailure(result)) {
    throw new Error(battleStateInitIssueMessage(result.failure));
  }
  return result.success;
}

function startWildCompanionDruidFixtureBattle(input: {
  readonly includeWildCompanionFeature?: boolean;
  readonly includeSecondaryResource?: boolean;
  readonly spellSlots?: readonly {
    readonly spellLevel: number;
    readonly count: number;
  }[];
  readonly wildShapeUsesRemaining?: number;
}): BattleRuntimeSession {
  const result = startBattle({
    battleId: battleId("wild-companion-test"),
    combatants: [
      characterCreature({
        combatantId: casterId,
        displayName: "Druid",
        initiative: 12,
        classLevels: [{ className: "druid", level: 2 }],
        spellcasting: {
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "druid",
            abilityModifier: abilityModifier(3),
          },
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [],
          featurePreparedSpells: [],
          spellAccesses: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: input.spellSlots ?? [],
        },
        characterUnitRefs: [
          { unit: druidWildShapeUnit, supportProfiles: [] },
          ...(input.includeWildCompanionFeature === false
            ? []
            : [
                {
                  unit: unitCatalog.requireUnit("druid_wild_companion"),
                  supportProfiles: [
                    DRUID_WILD_COMPANION_SPELL_CAST_SUPPORT_PROFILE,
                  ] as const,
                },
              ]),
          ...(input.includeSecondaryResource === true
            ? [
                {
                  unit: unitCatalog.requireUnit("orc_adrenaline_rush"),
                  supportProfiles: [],
                },
              ]
            : []),
        ],
        resources: [
          ...(input.wildShapeUsesRemaining === undefined
            ? []
            : [
                {
                  unit: druidWildShapeUnit,
                  usesRemaining: input.wildShapeUsesRemaining,
                },
              ]),
          ...(input.includeSecondaryResource === true
            ? [
                {
                  unit: unitCatalog.requireUnit("orc_adrenaline_rush"),
                  usesRemaining: 1,
                },
              ]
            : []),
        ],
        ...(input.wildShapeUsesRemaining === undefined
          ? {}
          : { druidWildShapeKnownForms: druidWildShapeKnownForms() }),
      }),
    ],
  });
  if (Result.isFailure(result)) {
    throw new Error(battleStateInitIssueMessage(result.failure));
  }
  return result.success;
}

function wildShapeResourcePoolRefForFixture(session: BattleRuntimeSession) {
  const druid = session.state.combatants.get(casterId);
  const ownership = session.context.characters
    .get(casterId)
    ?.resourceOwnership.find(
      (candidate) => candidate.unit.id === "druid_wild_shape",
    );
  const resource =
    druid?.origin.kind === "character" && ownership !== undefined
      ? druid.origin.resources.find(
          (candidate) =>
            candidate.resourcePoolRef === ownership.resourcePoolRef,
        )
      : undefined;
  if (resource === undefined) {
    throw new Error(
      "Wild Companion fixture must own its Wild Shape resource pool.",
    );
  }
  return resource.resourcePoolRef;
}

function startWrongOwnerPactFixtureBattle(): BattleRuntimeSession {
  const result = startBattle({
    battleId: battleId("companion-reaction-attack-wrong-owner-test"),
    combatants: [
      characterCreature({
        combatantId: otherCombatantId,
        displayName: "Other Pact Warlock",
        initiative: 14,
        className: "warlock",
        spellcasting: {
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "warlock",
            abilityModifier: abilityModifier(3),
          },
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [],
          featurePreparedSpells: [],
          spellAccesses: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [
            {
              tag: "pactOfTheChainSpawnedCompanion",
              spell: spawnedCompanionSpell,
            },
          ],
          spellSlots: [],
        },
      }),
      characterCreature({
        combatantId: casterId,
        displayName: "Caster",
        initiative: 12,
      }),
      characterCreature({
        combatantId: enemyId,
        displayName: "Target",
        initiative: 10,
        currentHp: 12,
        maxHp: 12,
      }),
    ],
  });
  if (Result.isFailure(result)) {
    throw new Error(battleStateInitIssueMessage(result.failure));
  }
  return result.success;
}

function startSpawnedCompanionSpellcasterFixtureBattle(): BattleRuntimeSession {
  const result = startBattle({
    battleId: battleId("find-familiar-generic-lifecycle-test"),
    combatants: [
      characterCreature({
        combatantId: casterId,
        displayName: "Caster",
        initiative: 12,
        spellcasting: {
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "wizard",
            abilityModifier: abilityModifier(3),
          },
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [],
          featurePreparedSpells: [],
          spellAccesses: [],
          spellbookRitualSpellAccesses: [
            {
              tag: "spellbookRitual",
              spell: spawnedCompanionSpell,
              featureUnitId: parseSharedUnitId("wizard_ritual_adept"),
            },
          ],
          invocationSpellAccesses: [],
          spellSlots: [],
        },
        characterUnitRefs: [
          {
            unit: unitCatalog.requireUnit("wizard_ritual_adept"),
            supportProfiles: [],
          },
        ],
      }),
    ],
  });
  if (Result.isFailure(result)) {
    throw new Error(battleStateInitIssueMessage(result.failure));
  }
  return result.success;
}

function fixtureBattleState(source: BattleState | BattleRuntimeSession) {
  return "state" in source ? source.state : source;
}

function castCatFamiliar(
  source: BattleState | BattleRuntimeSession,
  id = familiarId,
) {
  const state = fixtureBattleState(source);
  return castSpawnedCompanion({
    state,
    casterId,
    ammunitionStocks: [],
    catalog: statBlockCatalog,
    eligibility: familiarEligibility,
    selection: {
      tag: "normalNamedForm",
      formId: "cat",
    },
    creatureTypeOverrideChoiceId: firstTypeOverride.optionId,
    familiarId: id,
    initiative: initiativeScore(18),
    placement: { kind: "unoccupiedSpaceWithinSpellRange" },
  });
}

function castCatFamiliarAfterCasterTurn(
  source: BattleState | BattleRuntimeSession,
) {
  const state = fixtureBattleState(source);
  return castSpawnedCompanion({
    state,
    casterId,
    ammunitionStocks: [],
    catalog: statBlockCatalog,
    eligibility: familiarEligibility,
    selection: {
      tag: "normalNamedForm",
      formId: "cat",
    },
    creatureTypeOverrideChoiceId: firstTypeOverride.optionId,
    familiarId,
    initiative: initiativeScore(11),
    placement: { kind: "unoccupiedSpaceWithinSpellRange" },
  });
}

function castRatFamiliar(state: BattleState) {
  return castSpawnedCompanion({
    state,
    casterId,
    ammunitionStocks: [],
    catalog: statBlockCatalog,
    eligibility: familiarEligibility,
    selection: {
      tag: "normalNamedForm",
      formId: "rat",
    },
    creatureTypeOverrideChoiceId: firstTypeOverride.optionId,
    familiarId: replacementFamiliarId,
    initiative: initiativeScore(15),
    placement: { kind: "unoccupiedSpaceWithinSpellRange" },
  });
}

function literalHp(statBlock: StatBlockRecord): Hp {
  const hp = statBlock.statBlock.hp;
  if (hp.kind !== "literal") {
    throw new Error("Test Stat Block must use literal HP.");
  }
  return Hp(hp.value);
}

function positiveCompanionHp(value: number) {
  const currentHp = spawnedCompanionCurrentHitPoints(Hp(value));
  if (typeof currentHp === "string") {
    throw new Error(currentHp);
  }
  return currentHp;
}

function withFreshMagicAction(state: BattleState): BattleState {
  return {
    ...state,
    currentTurnResources: {
      ...state.currentTurnResources,
      actionResources: [{ kind: "action", source: "turn" }],
    },
  };
}

function advanceThroughPresentFamiliarToCasterTurn(state: BattleState) {
  const familiarTurn = endTurn({ state, actorId: casterId });
  if (familiarTurn.tag !== "resolved") {
    throw new Error("Expected the caster turn to advance to its familiar.");
  }
  const casterTurn = endTurn({
    state: familiarTurn.state,
    actorId: familiarId,
  });
  if (casterTurn.tag !== "resolved") {
    throw new Error("Expected the familiar turn to advance to its caster.");
  }
  return casterTurn.state;
}

function withFamiliarHitPoints(
  state: BattleState,
  currentHp: Hp,
  tempHp: Hp,
): BattleState {
  if (Number(currentHp) <= 0) {
    throw new Error("Test fixture must keep a present familiar above 0 HP.");
  }
  const familiarEntry = spawnedCompanionEntryForOwner(state, casterId);
  if (familiarEntry?.companion.status !== "present") {
    throw new Error("Expected present familiar.");
  }
  const familiarCombatantId = familiarEntry.companion.combatantId;
  const combatant = state.combatants.get(familiarCombatantId);
  if (combatant === undefined) {
    throw new Error("Expected familiar combatant.");
  }
  if (combatant.positiveHpUnconscious !== null) {
    throw new Error("Test fixture must not rewrite Knocked Out HP.");
  }
  const nextCombatant = {
    ...battleCreatureStateWithoutKnockOut(
      combatant,
      currentHp,
      combatant.conditions,
    ),
    tempHp,
  };
  return {
    ...state,
    combatants: new Map(state.combatants).set(
      familiarCombatantId,
      nextCombatant,
    ),
  };
}

function initialCombatantOrder(
  ...ids: readonly (
    | typeof casterId
    | typeof familiarId
    | typeof replacementFamiliarId
  )[]
): ReadonlyMap<
  typeof casterId | typeof familiarId | typeof replacementFamiliarId,
  number
> {
  return new Map(ids.map((id, index) => [id, index]));
}

function characterCreature(input: {
  readonly combatantId:
    | typeof casterId
    | typeof enemyId
    | typeof otherCombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly className?: "wizard" | "warlock" | "druid";
  readonly classLevel?: number;
  readonly classLevels?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["classLevels"];
  readonly spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
  readonly characterUnitRefs?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"];
  readonly resources?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"];
  readonly druidWildShapeKnownForms?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["druidWildShapeAvailableForms"];
  readonly currentHp?: number;
  readonly maxHp?: number;
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    creatureInit: {
      kind: "character",
      ammunitionStocks: [],
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: input.characterUnitRefs ?? [],
      classLevels: input.classLevels ?? [
        {
          className: input.className ?? "wizard",
          level: input.classLevel ?? 1,
        },
      ],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
      weaponMasteries: [],
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(input.currentHp ?? 12),
      maxHp: Hp(input.maxHp ?? 12),
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
      ...(input.resources === undefined ? {} : { resources: input.resources }),
      ...(input.druidWildShapeKnownForms === undefined
        ? {}
        : { druidWildShapeAvailableForms: input.druidWildShapeKnownForms }),
    },
  };
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

function testBattleCreatureStateWithConditions(
  combatant: BattleState["combatants"] extends ReadonlyMap<
    typeof familiarId,
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

function familiarAttackTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  if (hole.attack === undefined) {
    throw new Error("Expected familiar attack target context.");
  }
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: enemyId,
    spatialFacts: [
      {
        kind: "attackTargetDistance",
        actorId: familiarId,
        targetId: enemyId,
        distanceFeet: movementFeet(5),
        ...hole.attack.selection,
      },
    ],
  };
}

function attackRollFill(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
  value: { readonly total: number; readonly naturalD20: number },
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

function interruptDecisionFill(
  hole: Extract<BattleHole, { readonly kind: "interruptDecision" }>,
  value: Extract<BattleFill, { readonly kind: "interruptDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "interruptDecision" }> {
  return { kind: "interruptDecision", holeId: hole.holeId, value };
}

function damageRollFill(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
  faces: readonly number[],
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  const results = faces.map(DieRollResult);
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: [
      {
        results,
      },
    ],
  };
}

function spawnedCompanionConnectionFill(
  hole: Extract<BattleHole, { readonly kind: "spawnedCompanionConnection" }>,
): Extract<BattleFill, { readonly kind: "spawnedCompanionConnection" }> {
  return {
    kind: "spawnedCompanionConnection",
    holeId: hole.holeId,
    value: { withinRange: true },
  };
}

function spellCastInterruptionReactionTriggerFactsFill(
  session: BattleRuntimeSession,
): Extract<BattleFill, { readonly kind: "targetSpatialFacts" }> {
  return {
    kind: "targetSpatialFacts",
    holeId: SPELL_CAST_REACTION_FACTS_HOLE_ID,
    spatialFacts: [
      {
        kind: "spellCastInterruptionTriggerCasterVisibleWithinRange",
        reactorId: enemyId,
        casterId,
        sourceProcedureRef: requireCharacterSpellProcedureRefForTest(
          session,
          enemyId,
          spellSlotInvocationRef(
            "counterspell",
            3,
            "spellCastInterruptionReaction",
          ),
        ),
        rangeFeet: movementFeet(60),
      },
    ],
  };
}

function heldObjectFactsFill(
  hole: Extract<BattleHole, { readonly kind: "heldObjectFacts" }>,
  objectIds: readonly (typeof droppedObjectId)[] = [],
): Extract<BattleFill, { readonly kind: "heldObjectFacts" }> {
  return {
    kind: "heldObjectFacts",
    holeId: hole.holeId,
    value: { objectIds },
  };
}

function companionReappearancePlacementFill(
  hole: Extract<
    BattleHole,
    { readonly kind: "companionReappearancePlacement" }
  >,
): Extract<BattleFill, { readonly kind: "companionReappearancePlacement" }> {
  return {
    kind: "companionReappearancePlacement",
    holeId: hole.holeId,
    value: { kind: "unoccupiedSpaceWithin30Feet" },
  };
}

function companionReappearanceInitiativeFill(
  hole: Extract<
    BattleHole,
    { readonly kind: "companionReappearanceInitiative" }
  >,
): Extract<BattleFill, { readonly kind: "companionReappearanceInitiative" }> {
  return {
    kind: "companionReappearanceInitiative",
    holeId: hole.holeId,
    value: initiativeScore(14),
  };
}

function pactScratchFilledAttackFills(
  state: BattleState,
): readonly BattleFill[] {
  const subject = pactScratchSubject(state);
  const awaitingTarget = resolveBattleSubject({
    state,
    subject,
    fills: [],
  });
  if (awaitingTarget.tag !== "needsHoles") {
    throw new Error("Expected Pact familiar attack target hole.");
  }
  const target = familiarAttackTargetFill(
    requireHole(awaitingTarget.holes, "targetChoice"),
  );
  const awaitingAttackRoll = resolveBattleSubject({
    state,
    subject,
    fills: [target],
  });
  if (awaitingAttackRoll.tag !== "needsHoles") {
    throw new Error("Expected Pact familiar attack roll hole.");
  }
  const attackRoll = attackRollFill(
    requireHole(awaitingAttackRoll.holes, "attackRoll"),
    {
      naturalD20: 19,
      total: 23,
    },
  );
  const resolved = resolveBattleSubject({
    state,
    subject,
    fills: [target, attackRoll],
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected fixed-damage Pact familiar attack resolution.");
  }
  return [target, attackRoll];
}

function pactScratchSubject(
  state: BattleState,
  actorId = casterId,
  subjectFamiliarId = familiarId,
): PactOfTheChainFamiliarAttackSubject {
  const familiar = state.combatants.get(familiarId);
  if (familiar?.origin.kind !== "statBlock") {
    throw new Error("Expected the committed familiar Stat Block admission.");
  }
  const procedureRef = Result.getOrThrow(
    statBlockProcedurePresentations({
      presentation: Result.getOrThrow(
        projectAuthoredStatBlock(
          assertStatBlockForTest(statBlockCatalog, familiar.origin.statBlockId),
        ),
      ).presentation,
      execution: familiar.origin.execution,
    }),
  ).find(
    (presentation) =>
      presentation.kind === "attack" && presentation.name === "Scratch",
  )?.procedureRef;
  if (procedureRef === undefined) {
    throw new Error("Expected admitted Scratch procedure.");
  }
  const attack = statBlockAttackActionOptions(familiar.origin.execution).find(
    (candidate) => candidate.procedureRef === procedureRef,
  );
  if (attack === undefined) {
    throw new Error("Expected executable Scratch damage selection.");
  }
  return {
    tag: "companionAttack",
    actorId,
    familiarId: subjectFamiliarId,
    ...attackExecutionSelectionForOption(attack),
  };
}

describe("Find Familiar lifecycle", () => {
  test("rejects nonliteral familiar HP before authored projection admission", () => {
    const source = assertStatBlockForTest(
      statBlockCatalog,
      parseSharedStatBlockId("stat_block_cat"),
    );
    const malformed = {
      ...source,
      id: parseSharedStatBlockId("synthetic_nonliteral_familiar_hp"),
      name: "Synthetic Nonliteral Familiar HP",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic-nonliteral-familiar-hp",
      },
      statBlock: {
        ...source.statBlock,
        hp: { kind: "caster_derived", source: "spell_save_dc" },
      },
    };

    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(StatBlockRecordSchema)(malformed),
      ),
    ).toBe(true);
  });

  test("rejects nonliteral familiar Armor Class before authored projection admission", () => {
    const source = assertStatBlockForTest(
      statBlockCatalog,
      parseSharedStatBlockId("stat_block_cat"),
    );
    const malformed = {
      ...source,
      id: parseSharedStatBlockId("synthetic_nonliteral_familiar_ac"),
      name: "Synthetic Nonliteral Familiar Armor Class",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic-nonliteral-familiar-armor-class",
      },
      statBlock: {
        ...source.statBlock,
        ac: {
          ...source.statBlock.ac,
          value: { kind: "caster_derived", source: "spell_save_dc" },
        },
      },
    };

    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(StatBlockRecordSchema)(malformed),
      ),
    ).toBe(true);
  });

  test("retained companion presentation follows admission and recast transitions", () => {
    const initial = startBattle({
      battleId: battleId("retained-companion-presentation"),
      combatants: [
        characterCreature({
          combatantId: casterId,
          displayName: "Wizard",
          initiative: 12,
        }),
      ],
    });
    expect(Result.isSuccess(initial)).toBe(true);
    if (Result.isFailure(initial)) return;

    const session = battleRuntimeSessionForTest({
      state: initial.success.state,
      context: battleRuntimeContextForTest(
        new Map([
          [
            casterId,
            {
              resourceOwnership: [],
              spellPresentationSources: [],
              unitProcedureOwnership: [],
              unitPresentationSources: [],
            },
          ],
        ]),
      ),
    });
    expect(
      castRetainedSpawnedCompanionRuntime({
        session,
        casterId,
        ammunitionStocks: [],
        familiarId,
        catalog: statBlockCatalog,
        eligibility: familiarEligibility,
        selection: { tag: "normalNamedForm", formId: "rat" },
        creatureTypeOverrideChoiceId: firstTypeOverride.optionId,
        initiative: initiativeScore(14),
        placement: { kind: "unoccupiedSpaceWithinSpellRange" },
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Retained companion recast requires a battle-owned authored form selection.",
    });

    const absentPactFamiliarInput = {
      ownerId: casterId,
      identity: {
        tag: "retainedBetweenBattles",
        durableCompanionId: "durable:presentation-sprite",
      },
      protocol: { tag: "attackExceptionFamiliarLikeOneAtATime" },
      catalog: statBlockCatalog,
      formEligibility: {
        formAccess: "pactOfTheChain",
        eligibility: pactFamiliarEligibility,
      },
      manifestation: {
        tag: "disappearedAtZeroHitPoints",
        storedForm: {
          formAccess: "pactOfTheChain",
          formSelection: {
            tag: "pactOfTheChainSpecialForm",
            formId: "sprite",
          },
          resolvedStatBlockId: parseSharedStatBlockId("stat_block_sprite"),
        },
        creatureTypeOverride: "fey",
      },
      initialCombatantOrder: initialCombatantOrder(casterId),
    } satisfies Omit<
      Parameters<typeof admitCompanionToBattleRuntime>[0],
      "session"
    >;
    const admittedAbsentPactFamiliar = admitCompanionToBattleRuntime({
      session,
      ...absentPactFamiliarInput,
    });
    expect(Result.isSuccess(admittedAbsentPactFamiliar)).toBe(true);
    if (Result.isSuccess(admittedAbsentPactFamiliar)) {
      expect(
        admittedAbsentPactFamiliar.success.context.characters.get(casterId),
      ).toMatchObject({
        retainedCompanionSelection: {
          formAccess: "pactOfTheChain",
          selectedForm: {
            tag: "pactOfTheChainSpecialForm",
            formId: "sprite",
          },
        },
      });
    }
    const charactersWithoutOwner = new Map(session.context.characters);
    charactersWithoutOwner.delete(casterId);
    expect(
      admitCompanionToBattleRuntime({
        session: battleRuntimeSessionForTest({
          state: session.state,
          context: battleRuntimeContextForTest(
            charactersWithoutOwner,
            session.context.statBlocks,
          ),
        }),
        ...absentPactFamiliarInput,
      }),
    ).toEqual(
      Result.fail({
        tag: "battleStateInitIssue",
        kind: "companionOwnerRuntimeContextMissing",
        ownerId: casterId,
        message:
          "Retained companion admission owner has no authored runtime context.",
      }),
    );

    let admissionCatalogLookups = 0;
    const admittedFromOneCatalogResolution = admitCompanionToBattleRuntime({
      session,
      ownerId: casterId,
      companionId: familiarId,
      identity: {
        tag: "retainedBetweenBattles",
        durableCompanionId: "durable:single-source-projection",
      },
      protocol: { tag: "ordinaryFamiliarLikeOneAtATime" },
      catalog: {
        ...statBlockCatalog,
        getStatBlock: (statBlockId) => {
          admissionCatalogLookups += 1;
          return statBlockCatalog.getStatBlock(statBlockId);
        },
      },
      formEligibility: {
        formAccess: "spawnedCompanion",
        eligibility: familiarEligibility,
      },
      manifestation: {
        tag: "embodiedOutsideBattle",
        storedForm: {
          formAccess: "spawnedCompanion",
          formSelection: { tag: "normalNamedForm", formId: "cat" },
          resolvedStatBlockId: parseSharedStatBlockId("stat_block_cat"),
        },
        creatureTypeOverride: firstTypeOverride.creatureType,
        hitPoints: {
          currentHp: positiveCompanionHp(1),
          tempHp: Hp(0),
        },
        ammunitionStocks: [],
        initiative: initiativeScore(14),
        placement: { kind: "unoccupiedSpaceWithinSpellRange" },
      },
      initialCombatantOrder: initialCombatantOrder(casterId, familiarId),
    });
    expect(Result.isSuccess(admittedFromOneCatalogResolution)).toBe(true);
    expect(admissionCatalogLookups).toBe(1);

    const admitted = admitCompanionToBattleRuntime({
      session,
      ownerId: casterId,
      companionId: familiarId,
      identity: {
        tag: "retainedBetweenBattles",
        durableCompanionId: "durable:presentation-cat",
      },
      protocol: { tag: "ordinaryFamiliarLikeOneAtATime" },
      catalog: statBlockCatalog,
      formEligibility: {
        formAccess: "spawnedCompanion",
        eligibility: familiarEligibility,
      },
      manifestation: {
        tag: "embodiedOutsideBattle",
        storedForm: {
          formAccess: "spawnedCompanion",
          formSelection: { tag: "normalNamedForm", formId: "cat" },
          resolvedStatBlockId: parseSharedStatBlockId("stat_block_cat"),
        },
        creatureTypeOverride: firstTypeOverride.creatureType,
        hitPoints: {
          currentHp: positiveCompanionHp(1),
          tempHp: Hp(0),
        },
        ammunitionStocks: [],
        initiative: initiativeScore(14),
        placement: { kind: "unoccupiedSpaceWithinSpellRange" },
      },
      initialCombatantOrder: initialCombatantOrder(casterId, familiarId),
    });
    expect(Result.isSuccess(admitted)).toBe(true);
    if (Result.isFailure(admitted)) return;
    expect(admitted.success.context.characters.get(casterId)).toMatchObject({
      retainedCompanionSelection: {
        formAccess: "spawnedCompanion",
        selectedForm: { tag: "normalNamedForm", formId: "cat" },
      },
    });
    expect(admitted.success.context.statBlocks.get(familiarId)).toMatchObject({
      displayName: "Cat",
    });
    expect(
      castRetainedSpawnedCompanionRuntime({
        session: admitted.success,
        casterId,
        ammunitionStocks: [],
        familiarId,
        catalog: statBlockCatalog,
        eligibility: familiarEligibility,
        selection: {
          tag: "challengeRatingZeroBeast",
          statBlockId: parseSharedStatBlockId("stat_block_missing"),
        },
        creatureTypeOverrideChoiceId: firstTypeOverride.optionId,
        initiative: initiativeScore(14),
        placement: { kind: "unoccupiedSpaceWithinSpellRange" },
      }),
    ).toMatchObject({ tag: "invalid" });
    expect(
      castRetainedSpawnedCompanionRuntime({
        session: admitted.success,
        casterId,
        ammunitionStocks: [],
        familiarId: casterId,
        catalog: statBlockCatalog,
        eligibility: familiarEligibility,
        selection: { tag: "normalNamedForm", formId: "rat" },
        creatureTypeOverrideChoiceId: firstTypeOverride.optionId,
        initiative: initiativeScore(14),
        placement: { kind: "unoccupiedSpaceWithinSpellRange" },
      }),
    ).toMatchObject({ tag: "invalid" });

    const recast = castRetainedSpawnedCompanionRuntime({
      session: admitted.success,
      casterId,
      ammunitionStocks: [],
      familiarId,
      catalog: statBlockCatalog,
      eligibility: familiarEligibility,
      selection: { tag: "normalNamedForm", formId: "rat" },
      creatureTypeOverrideChoiceId: firstTypeOverride.optionId,
      initiative: initiativeScore(14),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });
    expect(recast.tag).toBe("resolved");
    if (recast.tag !== "resolved") return;
    expect(recast.session.context.characters.get(casterId)).toMatchObject({
      retainedCompanionSelection: {
        formAccess: "spawnedCompanion",
        selectedForm: { tag: "normalNamedForm", formId: "rat" },
      },
    });
    expect(recast.session.context.statBlocks.get(familiarId)).toMatchObject({
      displayName: "Rat",
    });
  });

  test("casts a familiar as owner-linked companion combatant state", () => {
    const initial = startFixtureBattle();
    expect(
      spawnedCompanionCreatureTypeOverrideForOwner(initial, casterId),
    ).toBeNull();
    const result = castCatFamiliar(initial);

    expect(result.tag).toBe("resolved");
    if (result.tag !== "resolved") return;
    const familiar = spawnedCompanionForOwner(result.state, casterId);
    expect(familiar).toMatchObject({
      status: "present",
      ownerId: casterId,
      formAccess: "spawnedCompanion",
      creatureTypeOverride: firstTypeOverride.creatureType,
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });
    expect(familiar).not.toHaveProperty("resolvedForm");
    if (familiar?.status !== "present") {
      throw new Error("Expected present familiar companion state.");
    }
    expect(
      retainedStoredFormForPresentCompanion({
        state: initial,
        companionId: familiar.combatantId,
        companion: familiar,
      }),
    ).toBe("Present companion Stat Block combatant is missing.");
    expect(result.state.combatants.get(familiarId)).toMatchObject({
      combatantId: familiarId,
      initiative: initiativeScore(18),
      reactionAvailable: true,
      origin: expect.objectContaining({
        kind: "statBlock",
        statBlockId: "stat_block_cat",
        mechanics: expect.objectContaining({
          creatureType: firstTypeOverride.creatureType,
        }),
      }),
    });
    expect(result.state.combatants.get(familiarId)).not.toHaveProperty(
      "displayName",
    );
    expect(result.state.combatants.get(familiarId)).not.toHaveProperty("side");
    expect(result.snapshot.turnOrder).toEqual([familiarId, casterId]);
    expect(
      spawnedCompanionCreatureTypeOverrideForOwner(result.state, casterId),
    ).toBe(firstTypeOverride.creatureType);
    expect(result.snapshot.companions).toMatchObject([
      {
        ownerId: casterId,
      },
    ]);
  });

  test("generic companion admission rejects an absent durable companion id collision", () => {
    const otherOwnerId = combatantId("other-owner");
    const initial = startBattle({
      battleId: battleId("companion-admission-absent-id-collision"),
      combatants: [
        characterCreature({
          combatantId: casterId,
          displayName: "Wizard",
          initiative: 12,
        }),
        characterCreature({
          combatantId: otherOwnerId,
          displayName: "Other Wizard",
          initiative: 11,
        }),
      ],
    });
    expect(Result.isSuccess(initial)).toBe(true);
    if (Result.isFailure(initial)) return;

    const firstAdmission = admitCompanionToBattle({
      state: initial.success.state,
      ownerId: casterId,
      identity: {
        tag: "retainedBetweenBattles",
        durableCompanionId: "durable:first",
      },
      protocol: { tag: "ordinaryFamiliarLikeOneAtATime" },
      catalog: statBlockCatalog,
      formEligibility: {
        formAccess: "spawnedCompanion",
        eligibility: familiarEligibility,
      },
      manifestation: {
        tag: "temporarilyDismissed",
        storedForm: {
          formAccess: "spawnedCompanion",
          formSelection: { tag: "normalNamedForm", formId: "cat" },
          resolvedStatBlockId: parseSharedStatBlockId("stat_block_cat"),
        },
        creatureTypeOverride: "fey",
        reappearanceCombatantId: familiarId,
        ammunitionStocks: [],
        hitPoints: {
          // Cast evidence: Hp(1) is a positive HP literal for this boundary
          // test fixture.
          currentHp: Hp(1) as Parameters<
            typeof admitCompanionToBattle
          >[0]["manifestation"] extends { readonly hitPoints: infer H }
            ? H extends { readonly currentHp: infer C }
              ? C
              : never
            : never,
          tempHp: Hp(0),
        },
      },
      initialCombatantOrder: initialCombatantOrder(casterId, otherOwnerId),
    });
    expect(Result.isSuccess(firstAdmission)).toBe(true);
    if (Result.isFailure(firstAdmission)) return;

    const collision = admitCompanionToBattle({
      state: firstAdmission.success,
      ownerId: otherOwnerId,
      identity: {
        tag: "retainedBetweenBattles",
        durableCompanionId: "durable:first",
      },
      protocol: { tag: "ordinaryFamiliarLikeOneAtATime" },
      catalog: statBlockCatalog,
      formEligibility: {
        formAccess: "spawnedCompanion",
        eligibility: familiarEligibility,
      },
      manifestation: {
        tag: "disappearedAtZeroHitPoints",
        storedForm: {
          formAccess: "spawnedCompanion",
          formSelection: { tag: "normalNamedForm", formId: "owl" },
          resolvedStatBlockId: parseSharedStatBlockId("stat_block_owl"),
        },
        creatureTypeOverride: "fey",
      },
      initialCombatantOrder: initialCombatantOrder(casterId, otherOwnerId),
    });

    expect(Result.isFailure(collision)).toBe(true);
    if (Result.isSuccess(collision)) return;
    expect(collision.failure).toMatchObject({
      tag: "battleStateInitIssue",
      kind: "companionDurableIdentityInUse",
      ownerId: otherOwnerId,
      durableCompanionId: "durable:first",
      existingOwnerId: casterId,
    });
    expect(battleStateInitIssueMessage(collision.failure)).toBe(
      "Companion admission identity is already used by another companion.",
    );
    expect(firstAdmission.success.companions.get(casterId)).toMatchObject({
      ownerId: casterId,
      status: "temporarilyDismissed",
      identity: {
        tag: "retainedBetweenBattles",
        durableCompanionId: "durable:first",
      },
    });
  });

  test("state-only casting rejects a retained familiar transition", () => {
    const initial = startBattle({
      battleId: battleId("retained-familiar-state-only-cast"),
      combatants: [
        characterCreature({
          combatantId: casterId,
          displayName: "Wizard",
          initiative: 12,
        }),
      ],
    });
    expect(Result.isSuccess(initial)).toBe(true);
    if (Result.isFailure(initial)) return;

    const retained = admitCompanionToBattle({
      state: initial.success.state,
      ownerId: casterId,
      identity: {
        tag: "retainedBetweenBattles",
        durableCompanionId: "durable:state-only-recast",
      },
      protocol: { tag: "ordinaryFamiliarLikeOneAtATime" },
      catalog: statBlockCatalog,
      formEligibility: {
        formAccess: "spawnedCompanion",
        eligibility: familiarEligibility,
      },
      manifestation: {
        tag: "disappearedAtZeroHitPoints",
        storedForm: {
          formAccess: "spawnedCompanion",
          formSelection: { tag: "normalNamedForm", formId: "cat" },
          resolvedStatBlockId: parseSharedStatBlockId("stat_block_cat"),
        },
        creatureTypeOverride: "fey",
      },
      initialCombatantOrder: initialCombatantOrder(casterId),
    });
    expect(Result.isSuccess(retained)).toBe(true);
    if (Result.isFailure(retained)) return;

    const recast = castRatFamiliar(retained.success);
    expect(recast).toMatchObject({
      tag: "invalid",
      message:
        "Retained companion recast requires the session-owned authored selection transition.",
    });
    expect(recast.snapshot).toEqual(snapshotBattle(retained.success));
    expect(spawnedCompanionForOwner(retained.success, casterId)).toMatchObject({
      status: "disappearedAtZeroHitPoints",
      identity: {
        tag: "retainedBetweenBattles",
        durableCompanionId: "durable:state-only-recast",
      },
    });
  });

  test("generic companion admission rejects empty durable companion ids", () => {
    const initial = startBattle({
      battleId: battleId("companion-admission-empty-durable-id"),
      combatants: [
        characterCreature({
          combatantId: casterId,
          displayName: "Wizard",
          initiative: 12,
        }),
      ],
    });
    expect(Result.isSuccess(initial)).toBe(true);
    if (Result.isFailure(initial)) return;

    const admitted = admitCompanionToBattle({
      state: initial.success.state,
      ownerId: casterId,
      identity: {
        tag: "retainedBetweenBattles",
        durableCompanionId: "",
      },
      protocol: { tag: "ordinaryFamiliarLikeOneAtATime" },
      catalog: statBlockCatalog,
      formEligibility: {
        formAccess: "spawnedCompanion",
        eligibility: familiarEligibility,
      },
      manifestation: {
        tag: "disappearedAtZeroHitPoints",
        storedForm: {
          formAccess: "spawnedCompanion",
          formSelection: { tag: "normalNamedForm", formId: "cat" },
          resolvedStatBlockId: parseSharedStatBlockId("stat_block_cat"),
        },
        creatureTypeOverride: "fey",
      },
      initialCombatantOrder: initialCombatantOrder(casterId),
    });

    expect(Result.isFailure(admitted)).toBe(true);
    if (Result.isSuccess(admitted)) return;
    expect(admitted.failure).toMatchObject({
      tag: "battleStateInitIssue",
      kind: "companionDurableIdentityMissing",
      ownerId: casterId,
    });
    expect(battleStateInitIssueMessage(admitted.failure)).toBe(
      "Companion admission requires durable id.",
    );
  });

  test("generic companion admission rejects mismatched retained form proof", () => {
    const initial = startBattle({
      battleId: battleId("companion-admission-form-proof-mismatch"),
      combatants: [
        characterCreature({
          combatantId: casterId,
          displayName: "Wizard",
          initiative: 12,
        }),
      ],
    });
    expect(Result.isSuccess(initial)).toBe(true);
    if (Result.isFailure(initial)) return;

    const admitted = admitCompanionToBattle({
      state: initial.success.state,
      ownerId: casterId,
      identity: {
        tag: "retainedBetweenBattles",
        durableCompanionId: "durable:mismatched-proof",
      },
      protocol: { tag: "ordinaryFamiliarLikeOneAtATime" },
      catalog: statBlockCatalog,
      formEligibility: {
        formAccess: "spawnedCompanion",
        eligibility: familiarEligibility,
      },
      manifestation: {
        tag: "disappearedAtZeroHitPoints",
        storedForm: {
          formAccess: "spawnedCompanion",
          formSelection: { tag: "normalNamedForm", formId: "cat" },
          resolvedStatBlockId: parseSharedStatBlockId("stat_block_owl"),
        },
        creatureTypeOverride: "fey",
      },
      initialCombatantOrder: initialCombatantOrder(casterId),
    });

    expect(Result.isFailure(admitted)).toBe(true);
    if (Result.isSuccess(admitted)) return;
    expect(admitted.failure).toMatchObject({
      tag: "battleStateInitIssue",
      kind: "companionFormResolvedStatBlockMismatch",
      formAccess: "spawnedCompanion",
      expectedStatBlockId: parseSharedStatBlockId("stat_block_cat"),
      resolvedStatBlockId: parseSharedStatBlockId("stat_block_owl"),
    });
    expect(battleStateInitIssueMessage(admitted.failure)).toBe(
      "Retained familiar form proof resolved Stat Block mismatch: stat_block_owl.",
    );
  });

  test("generic companion admission rejects forged Challenge Rating 0 Beast proof", () => {
    const initial = startBattle({
      battleId: battleId("companion-admission-forged-cr0-beast"),
      combatants: [
        characterCreature({
          combatantId: casterId,
          displayName: "Wizard",
          initiative: 12,
        }),
      ],
    });
    expect(Result.isSuccess(initial)).toBe(true);
    if (Result.isFailure(initial)) return;

    const admitted = admitCompanionToBattle({
      state: initial.success.state,
      ownerId: casterId,
      identity: {
        tag: "retainedBetweenBattles",
        durableCompanionId: "durable:forged-cr0-beast",
      },
      protocol: { tag: "ordinaryFamiliarLikeOneAtATime" },
      catalog: statBlockCatalog,
      formEligibility: {
        formAccess: "spawnedCompanion",
        eligibility: familiarEligibility,
      },
      manifestation: {
        tag: "disappearedAtZeroHitPoints",
        storedForm: {
          formAccess: "spawnedCompanion",
          formSelection: {
            tag: "challengeRatingZeroBeast",
            statBlockId: parseSharedStatBlockId("stat_block_goblin_warrior"),
          },
          resolvedStatBlockId: parseSharedStatBlockId(
            "stat_block_goblin_warrior",
          ),
        },
        creatureTypeOverride: "fey",
      },
      initialCombatantOrder: initialCombatantOrder(casterId),
    });

    expect(Result.isFailure(admitted)).toBe(true);
    if (Result.isSuccess(admitted)) return;
    expect(admitted.failure).toMatchObject({
      tag: "battleStateInitIssue",
      kind: "companionFormSelectionStatBlockInvalid",
      formAccess: "spawnedCompanion",
      selectedStatBlockId: parseSharedStatBlockId("stat_block_goblin_warrior"),
      expectedCreatureType: "beast",
      expectedChallengeRating: 0,
    });
    expect(battleStateInitIssueMessage(admitted.failure)).toBe(
      "Retained familiar Challenge Rating 0 Beast form must resolve to a CR 0 Beast Stat Block: stat_block_goblin_warrior.",
    );
  });

  test("generic companion admission accepts a retained Challenge Rating 0 Beast proof", () => {
    const initial = startBattle({
      battleId: battleId("companion-admission-cr0-beast"),
      combatants: [
        characterCreature({
          combatantId: casterId,
          displayName: "Wizard",
          initiative: 12,
        }),
      ],
    });
    expect(Result.isSuccess(initial)).toBe(true);
    if (Result.isFailure(initial)) return;

    const admitted = admitCompanionToBattle({
      state: initial.success.state,
      ownerId: casterId,
      identity: {
        tag: "retainedBetweenBattles",
        durableCompanionId: "durable:cr0-rat",
      },
      protocol: { tag: "ordinaryFamiliarLikeOneAtATime" },
      catalog: statBlockCatalog,
      formEligibility: {
        formAccess: "spawnedCompanion",
        eligibility: familiarEligibility,
      },
      manifestation: {
        tag: "disappearedAtZeroHitPoints",
        storedForm: {
          formAccess: "spawnedCompanion",
          formSelection: {
            tag: "challengeRatingZeroBeast",
            statBlockId: parseSharedStatBlockId("stat_block_rat"),
          },
          resolvedStatBlockId: parseSharedStatBlockId("stat_block_rat"),
        },
        creatureTypeOverride: "celestial",
      },
      initialCombatantOrder: initialCombatantOrder(casterId),
    });

    expect(Result.isSuccess(admitted)).toBe(true);
    if (Result.isFailure(admitted)) return;
    expect(spawnedCompanionForOwner(admitted.success, casterId)).toMatchObject({
      status: "disappearedAtZeroHitPoints",
      creatureTypeOverride: "celestial",
      formAccess: "spawnedCompanion",
    });
  });

  test("casts Wild Companion through Find Familiar with fixed Fey type and a spell slot spend", () => {
    const cast = castWildCompanion({
      state: startWildCompanionDruidFixtureBattle({
        spellSlots: [{ spellLevel: 1, count: 1 }],
      }).state,
      casterId,
      ammunitionStocks: [],
      catalog: statBlockCatalog,
      eligibility: familiarEligibility,
      selection: { tag: "normalNamedForm", formId: "cat" },
      spend: { kind: "spellSlot", spellLevel: spellSlotLevel(1) },
      familiarId,
      initiative: initiativeScore(18),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });

    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    expect(spawnedCompanionForOwner(cast.state, casterId)).toMatchObject({
      status: "present",
      ownerId: casterId,
      formAccess: "spawnedCompanion",
      creatureTypeOverride: "fey",
    });
    const companionCombatant = cast.state.combatants.get(familiarId);
    expect(
      companionCombatant?.origin.kind === "statBlock"
        ? companionCombatant.origin.mechanics.creatureType
        : null,
    ).toBe("fey");
    const druid = cast.state.combatants.get(casterId);
    expect(
      druid?.origin.kind === "character"
        ? druid.origin.spellcasting?.spellSlots
        : [],
    ).toEqual([{ spellLevel: 1, count: 1, expended: 1 }]);
  });

  test("casts Wild Companion by spending a Wild Shape use instead of a spell slot", () => {
    const session = startWildCompanionDruidFixtureBattle({
      wildShapeUsesRemaining: 2,
    });
    const wildShapeResourcePoolRef =
      wildShapeResourcePoolRefForFixture(session);
    const cast = castWildCompanion({
      state: session.state,
      casterId,
      ammunitionStocks: [],
      catalog: statBlockCatalog,
      eligibility: familiarEligibility,
      selection: { tag: "normalNamedForm", formId: "owl" },
      spend: {
        kind: "wildShapeUse",
        resourcePoolRef: wildShapeResourcePoolRef,
      },
      familiarId,
      initiative: initiativeScore(18),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });

    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const updatedDruid = cast.state.combatants.get(casterId);
    expect(
      updatedDruid?.origin.kind === "character"
        ? updatedDruid.origin.resources.find(
            (resource) => resource.resourcePoolRef === wildShapeResourcePoolRef,
          )
        : undefined,
    ).toMatchObject({ usesRemaining: 1 });
    expect(spawnedCompanionForOwner(cast.state, casterId)).toMatchObject({
      formAccess: "spawnedCompanion",
      creatureTypeOverride: "fey",
    });
  });

  test("Wild Companion recast keeps its embodied identity and Hit Points while adopting a new form", () => {
    const session = startWildCompanionDruidFixtureBattle({
      wildShapeUsesRemaining: 2,
    });
    const wildShapeResourcePoolRef =
      wildShapeResourcePoolRefForFixture(session);
    const first = castWildCompanion({
      state: session.state,
      casterId,
      ammunitionStocks: [],
      catalog: statBlockCatalog,
      eligibility: familiarEligibility,
      selection: { tag: "normalNamedForm", formId: "owl" },
      spend: {
        kind: "wildShapeUse",
        resourcePoolRef: wildShapeResourcePoolRef,
      },
      familiarId,
      initiative: initiativeScore(18),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });
    expect(first.tag).toBe("resolved");
    if (first.tag !== "resolved") return;
    const wounded = withFamiliarHitPoints(
      advanceThroughPresentFamiliarToCasterTurn(first.state),
      Hp(1),
      Hp(3),
    );
    const recast = castWildCompanion({
      state: wounded,
      casterId,
      ammunitionStocks: [],
      catalog: statBlockCatalog,
      eligibility: familiarEligibility,
      selection: { tag: "normalNamedForm", formId: "rat" },
      spend: {
        kind: "wildShapeUse",
        resourcePoolRef: wildShapeResourcePoolRef,
      },
      familiarId: replacementFamiliarId,
      initiative: initiativeScore(15),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });

    expect(recast.tag).toBe("resolved");
    if (recast.tag !== "resolved") return;
    expect(recast.state.combatants.has(replacementFamiliarId)).toBe(false);
    expect(recast.state.combatants.get(familiarId)).toMatchObject({
      hp: Hp(1),
      tempHp: Hp(3),
      initiative: initiativeScore(15),
      origin: expect.objectContaining({ statBlockId: "stat_block_rat" }),
    });
    expect(spawnedCompanionForOwner(recast.state, casterId)).toMatchObject({
      status: "present",
      combatantId: familiarId,
      identity: { tag: "battleOnly" },
    });
    const druid = recast.state.combatants.get(casterId);
    expect(
      druid?.origin.kind === "character"
        ? druid.origin.resources.find(
            (resource) => resource.resourcePoolRef === wildShapeResourcePoolRef,
          )
        : undefined,
    ).toMatchObject({ usesRemaining: 0 });
  });

  test("Wild Companion recast restores a temporarily dismissed familiar with its retained Hit Points", () => {
    const session = startWildCompanionDruidFixtureBattle({
      wildShapeUsesRemaining: 2,
    });
    const wildShapeResourcePoolRef =
      wildShapeResourcePoolRefForFixture(session);
    const first = castWildCompanion({
      state: session.state,
      casterId,
      ammunitionStocks: [],
      catalog: statBlockCatalog,
      eligibility: familiarEligibility,
      selection: { tag: "normalNamedForm", formId: "cat" },
      spend: {
        kind: "wildShapeUse",
        resourcePoolRef: wildShapeResourcePoolRef,
      },
      familiarId,
      initiative: initiativeScore(18),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });
    expect(first.tag).toBe("resolved");
    if (first.tag !== "resolved") return;
    const wounded = withFamiliarHitPoints(
      advanceThroughPresentFamiliarToCasterTurn(first.state),
      Hp(1),
      Hp(3),
    );
    const dismissed = temporarilyDismissSpawnedCompanion({
      state: wounded,
      casterId,
      heldObjectIds: [],
    });
    expect(dismissed.tag).toBe("resolved");
    if (dismissed.tag !== "resolved") return;
    const recastTurn = endTurn({
      state: dismissed.state,
      actorId: casterId,
    });
    expect(recastTurn.tag).toBe("resolved");
    if (recastTurn.tag !== "resolved") return;

    const recast = castWildCompanion({
      state: recastTurn.state,
      casterId,
      ammunitionStocks: [],
      catalog: statBlockCatalog,
      eligibility: familiarEligibility,
      selection: { tag: "normalNamedForm", formId: "rat" },
      spend: {
        kind: "wildShapeUse",
        resourcePoolRef: wildShapeResourcePoolRef,
      },
      familiarId: replacementFamiliarId,
      initiative: initiativeScore(15),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });

    expect(recast.tag).toBe("resolved");
    if (recast.tag !== "resolved") return;
    expect(recast.state.combatants.get(replacementFamiliarId)).toMatchObject({
      hp: Hp(1),
      tempHp: Hp(3),
      origin: expect.objectContaining({ statBlockId: "stat_block_rat" }),
    });
    expect(recast.state.combatants.has(familiarId)).toBe(false);
  });

  test("reappears a temporarily dismissed Wild Companion without Find Familiar spell access", () => {
    const session = startWildCompanionDruidFixtureBattle({
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const cast = castWildCompanion({
      state: session.state,
      casterId,
      ammunitionStocks: [],
      catalog: statBlockCatalog,
      eligibility: familiarEligibility,
      selection: { tag: "normalNamedForm", formId: "cat" },
      spend: { kind: "spellSlot", spellLevel: spellSlotLevel(1) },
      familiarId,
      initiative: initiativeScore(18),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    const dismissed = temporarilyDismissSpawnedCompanion({
      state: withFreshMagicAction(cast.state),
      casterId,
    });
    expect(dismissed.tag).toBe("resolved");
    if (dismissed.tag !== "resolved") return;

    const reappearanceReadyState = withFreshMagicAction(dismissed.state);
    const reappearanceAct = discoverBattleActs(
      battleRuntimeSessionForTest({
        state: reappearanceReadyState,
        context: session.context,
      }),
    ).find(
      (act) =>
        act.subject.tag === "companionLifecycle" &&
        act.subject.action === "reappear",
    );
    expect(reappearanceAct?.subject.tag).toBe("companionLifecycle");
    if (reappearanceAct?.subject.tag !== "companionLifecycle") return;

    const reappeared = resolveBattleSubject({
      state: reappearanceReadyState,
      subject: reappearanceAct.subject,
      fills: [
        companionReappearancePlacementFill(
          requireHole(
            reappearanceAct.initialHoles,
            "companionReappearancePlacement",
          ),
        ),
        companionReappearanceInitiativeFill(
          requireHole(
            reappearanceAct.initialHoles,
            "companionReappearanceInitiative",
          ),
        ),
      ],
      statBlockCatalog,
    });
    expect(reappeared.tag).toBe("resolved");
    if (reappeared.tag !== "resolved") return;
    expect(spawnedCompanionForOwner(reappeared.state, casterId)).toMatchObject({
      status: "present",
      formAccess: "spawnedCompanion",
      creatureTypeOverride: "fey",
    });
    expect(reappeared.state.combatants.get(familiarId)?.initiative).toBe(
      initiativeScore(14),
    );
  });

  test("rejects Wild Companion without Wild Companion feature access", () => {
    const cast = castWildCompanion({
      state: startWildCompanionDruidFixtureBattle({
        includeWildCompanionFeature: false,
        spellSlots: [{ spellLevel: 1, count: 1 }],
      }).state,
      casterId,
      ammunitionStocks: [],
      catalog: statBlockCatalog,
      eligibility: familiarEligibility,
      selection: { tag: "normalNamedForm", formId: "cat" },
      spend: { kind: "spellSlot", spellLevel: spellSlotLevel(1) },
      familiarId,
      initiative: initiativeScore(18),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });

    expect(cast).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Wild Companion requires the Druid Wild Companion feature.",
    });
  });

  test("keeps one familiar per caster and atomically replaces form on recast", () => {
    const first = castCatFamiliar(startFixtureBattle());
    expect(first.tag).toBe("resolved");
    if (first.tag !== "resolved") return;

    const second = castRatFamiliar(first.state);

    expect(second.tag).toBe("resolved");
    if (second.tag !== "resolved") return;
    expect(second.state.companions).toHaveLength(1);
    expect(second.state.combatants.has(familiarId)).toBe(true);
    expect(second.state.combatants.has(replacementFamiliarId)).toBe(false);
    expect(spawnedCompanionForOwner(second.state, casterId)).toMatchObject({
      status: "present",
      formAccess: "spawnedCompanion",
    });
    expect(second.state.combatants.get(familiarId)).toMatchObject({
      origin: { statBlockId: "stat_block_rat" },
    });
    expect(second.state.combatants.get(familiarId)).not.toHaveProperty(
      "displayName",
    );
  });

  test("preserves familiar hit points when recasting to adopt a new form", () => {
    const first = castCatFamiliar(startFixtureBattle());
    expect(first.tag).toBe("resolved");
    if (first.tag !== "resolved") return;
    const wounded = withFamiliarHitPoints(first.state, Hp(1), Hp(3));

    const second = castRatFamiliar(wounded);

    expect(second.tag).toBe("resolved");
    if (second.tag !== "resolved") return;
    expect(second.state.combatants.get(familiarId)).toMatchObject({
      hp: Hp(1),
      tempHp: Hp(3),
    });
    expect(second.state.combatants.get(familiarId)).not.toHaveProperty(
      "displayName",
    );
  });

  test("rejects familiar identities that collide with ordinary combatants", () => {
    const casterCollision = castCatFamiliar(startFixtureBattle(), casterId);

    expect(casterCollision.tag).toBe("invalid");
    if (casterCollision.tag !== "invalid") return;
    expect(casterCollision.reason).toBe("invalidFill");
    expect(casterCollision.snapshot.companions).toEqual([]);

    const otherCollision = castCatFamiliar(
      startFixtureBattle({ extraCombatantId: otherCombatantId }),
      otherCombatantId,
    );

    expect(otherCollision.tag).toBe("invalid");
    if (otherCollision.tag !== "invalid") return;
    expect(otherCollision.reason).toBe("invalidFill");
    expect(otherCollision.snapshot.companions).toEqual([]);
  });

  test("temporarily dismisses and reappears by Magic-action boundary", () => {
    const cast = castCatFamiliar(startFixtureBattle());
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const wounded = withFamiliarHitPoints(cast.state, Hp(1), Hp(3));

    const dismissed = temporarilyDismissSpawnedCompanion({
      state: wounded,
      casterId,
      heldObjectIds: [droppedObjectId],
    });

    expect(dismissed.tag).toBe("resolved");
    if (dismissed.tag !== "resolved") return;
    expect(dismissed.state.combatants.has(familiarId)).toBe(false);
    expect(dismissed.snapshot.turnOrder).toEqual([casterId]);
    expect(spawnedCompanionForOwner(dismissed.state, casterId)).toMatchObject({
      status: "temporarilyDismissed",
      hitPoints: { currentHp: Hp(1), tempHp: Hp(3) },
    });
    expect(dismissed.state.currentTurnResources.actionResources).toEqual([]);
    expect(dismissed.droppedObjects).toEqual([
      {
        kind: "objectDropped",
        actorId: familiarId,
        objectId: droppedObjectId,
        source: {
          kind: "companionDisappearance",
          ownerId: casterId,
          companionId: familiarId,
        },
      },
    ]);

    const blockedReappearance = reappearTemporarilyDismissedSpawnedCompanion({
      state: dismissed.state,
      casterId,
      catalog: statBlockCatalog,
      initiative: initiativeScore(14),
      placement: { kind: "unoccupiedSpaceWithin30Feet" },
    });
    expect(blockedReappearance.tag).toBe("invalid");
    if (blockedReappearance.tag !== "invalid") return;
    expect(blockedReappearance.reason).toBe("staleSubject");

    const reappeared = reappearTemporarilyDismissedSpawnedCompanion({
      state: withFreshMagicAction(dismissed.state),
      casterId,
      catalog: statBlockCatalog,
      initiative: initiativeScore(14),
      placement: { kind: "unoccupiedSpaceWithin30Feet" },
    });
    expect(reappeared.tag).toBe("resolved");
    if (reappeared.tag !== "resolved") return;
    expect(reappeared.state.currentTurnResources.actionResources).toEqual([]);
    expect(reappeared.state.combatants.get(familiarId)?.initiative).toBe(
      initiativeScore(14),
    );
    expect(reappeared.state.combatants.get(familiarId)).toMatchObject({
      hp: Hp(1),
      tempHp: Hp(3),
    });
    expect(spawnedCompanionForOwner(reappeared.state, casterId)).toMatchObject({
      status: "present",
      placement: { kind: "unoccupiedSpaceWithin30Feet" },
    });
  });

  test("preserves a Pact Skeleton familiar's ammunition through dismissal and reappearance", () => {
    const skeleton = assertStatBlockForTest(
      statBlockCatalog,
      parseSharedStatBlockId("stat_block_skeleton"),
    );
    const skeletonHp = literalHp(skeleton);
    const started = startBattle({
      battleId: battleId("pact-skeleton-ammunition-lifecycle"),
      combatants: [
        {
          combatantId: casterId,
          initiative: initiativeScore(12),
          creatureInit: {
            kind: "statBlock",
            source: Result.getOrThrow(
              battleStatBlockCombatantSource(
                projectedStatBlockRuntimeSource(skeleton),
              ),
            ),
            currentHp: skeletonHp,
            tempHp: Hp(0),
            ammunitionStocks: [
              { ammunition: "arrow", remaining: resourceCount(20) },
            ],
            conditions: [],
            presentation: {
              displayName: "Pact Owner",
              communication: { kind: "none" as const },
              traits: [],
              orderedProcedures: [],
            },
          },
        },
        {
          combatantId: familiarId,
          initiative: initiativeScore(11),
          creatureInit: {
            kind: "statBlock",
            source: Result.getOrThrow(
              battleStatBlockCombatantSource(
                projectedStatBlockRuntimeSource(skeleton),
              ),
            ),
            currentHp: skeletonHp,
            tempHp: Hp(0),
            ammunitionStocks: [
              { ammunition: "arrow", remaining: resourceCount(7) },
            ],
            conditions: [],
            presentation: {
              displayName: "Pact Skeleton Familiar",
              communication: { kind: "none" as const },
              traits: [],
              orderedProcedures: [],
            },
          },
        },
      ],
    });
    expect(Result.isSuccess(started)).toBe(true);
    if (Result.isFailure(started)) return;
    const presentState: BattleState = {
      ...started.success.state,
      companions: new Map([
        [
          casterId,
          {
            status: "present",
            formAccess: "pactOfTheChain",
            combatantId: familiarId,
            ownerId: casterId,
            identity: { tag: "battleOnly" },
            protocol: { tag: "attackExceptionFamiliarLikeOneAtATime" },
            creatureTypeOverride: "fey",
            placement: { kind: "unoccupiedSpaceWithinSpellRange" },
          },
        ],
      ]),
    };

    const dismissed = temporarilyDismissSpawnedCompanion({
      state: presentState,
      casterId,
    });
    expect(dismissed.tag).toBe("resolved");
    if (dismissed.tag !== "resolved") return;
    expect(dismissed.state.companions.get(casterId)).toMatchObject({
      status: "temporarilyDismissed",
      ammunitionStocks: [{ ammunition: "arrow", remaining: resourceCount(7) }],
    });
    assertBattleSnapshotCodecRoundTripForTest(dismissed.snapshot);

    const reappeared = reappearTemporarilyDismissedSpawnedCompanion({
      state: withFreshMagicAction(dismissed.state),
      casterId,
      catalog: statBlockCatalog,
      initiative: initiativeScore(11),
      placement: { kind: "unoccupiedSpaceWithin30Feet" },
    });
    expect(reappeared.tag).toBe("resolved");
    if (reappeared.tag !== "resolved") return;
    expect(
      reappeared.state.combatants.get(familiarId)?.ammunitionStocks,
    ).toEqual([{ ammunition: "arrow", remaining: resourceCount(7) }]);
  });

  test("rejects stale familiar lifecycle transitions at their public boundaries", () => {
    const withoutFamiliar = startFixtureBattle();
    expect(
      resolveBattleSubject({
        state: withoutFamiliar,
        subject: {
          tag: "companionLifecycle",
          actorId: casterId,
          action: "permanentlyDismiss",
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Familiar lifecycle act requires the actor's retained familiar.",
    });
    expect(
      temporarilyDismissSpawnedCompanion({
        state: withoutFamiliar,
        casterId,
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
    expect(
      permanentlyDismissSpawnedCompanion({
        state: withoutFamiliar,
        casterId,
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
    expect(presentSpawnedCompanionHitPoints(withoutFamiliar, undefined)).toBe(
      "Present companion combatant identity is missing.",
    );
    expect(
      presentSpawnedCompanionHitPoints(withoutFamiliar, otherCombatantId),
    ).toBe("Present companion combatant is missing.");
    expect(spawnedCompanionCurrentHitPoints(Hp(0))).toBe(
      "Present companion current HP must be above 0.",
    );

    const cast = castCatFamiliar(withoutFamiliar);
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const catSource = Result.getOrThrow(
      battleStatBlockCombatantSource(
        projectedStatBlockRuntimeSource(
          assertStatBlockForTest(
            statBlockCatalog,
            parseSharedStatBlockId("stat_block_cat"),
          ),
        ),
      ),
    );
    expect(familiarMaxHp(catSource)).toBe(Hp(catSource.statBlock.hp.value));
    expect(
      spawnedCompanionIdentityIssue(cast.state, otherCombatantId, familiarId),
    ).toBe("Companion identity is already owned by another owner.");
    const withoutMagicAction = {
      ...cast.state,
      currentTurnResources: {
        ...cast.state.currentTurnResources,
        actionResources: [],
      },
    };
    expect(
      temporarilyDismissSpawnedCompanion({
        state: withoutMagicAction,
        casterId,
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    expect(
      permanentlyDismissSpawnedCompanion({
        state: withoutMagicAction,
        casterId,
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });

    const nextTurn = endTurn({ state: cast.state, actorId: casterId });
    expect(nextTurn.tag).toBe("resolved");
    if (nextTurn.tag !== "resolved") return;
    expect(
      temporarilyDismissSpawnedCompanion({
        state: nextTurn.state,
        casterId,
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });

    const dismissed = temporarilyDismissSpawnedCompanion({
      state: withFreshMagicAction(cast.state),
      casterId,
    });
    expect(dismissed.tag).toBe("resolved");
    if (dismissed.tag !== "resolved") return;
    expect(
      temporarilyDismissSpawnedCompanion({
        state: withFreshMagicAction(dismissed.state),
        casterId,
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
    expect(
      permanentlyDismissSpawnedCompanion({
        state: withFreshMagicAction(dismissed.state),
        casterId,
      }),
    ).toMatchObject({ tag: "resolved" });
    expect(
      applySpawnedCompanionZeroHitPointDisappearance({
        state: cast.state,
        familiarId: otherCombatantId,
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
  });

  test("rejects retained temporary dismissal with an ordinary reappearance combatant identity", () => {
    const initial = startBattle({
      battleId: battleId("companion-admission-ordinary-reappearance-id"),
      combatants: [
        characterCreature({
          combatantId: casterId,
          displayName: "Wizard",
          initiative: 12,
        }),
        characterCreature({
          combatantId: otherCombatantId,
          displayName: "Other Combatant",
          initiative: 10,
        }),
      ],
    });
    expect(Result.isSuccess(initial)).toBe(true);
    if (Result.isFailure(initial)) return;

    const admitted = admitCompanionToBattle({
      state: initial.success.state,
      ownerId: casterId,
      identity: {
        tag: "retainedBetweenBattles",
        durableCompanionId: "durable:ordinary-reappearance-id",
      },
      protocol: { tag: "ordinaryFamiliarLikeOneAtATime" },
      catalog: statBlockCatalog,
      formEligibility: {
        formAccess: "spawnedCompanion",
        eligibility: familiarEligibility,
      },
      manifestation: {
        tag: "temporarilyDismissed",
        storedForm: {
          formAccess: "spawnedCompanion",
          formSelection: { tag: "normalNamedForm", formId: "cat" },
          resolvedStatBlockId: parseSharedStatBlockId("stat_block_cat"),
        },
        creatureTypeOverride: firstTypeOverride.creatureType,
        reappearanceCombatantId: otherCombatantId,
        ammunitionStocks: [],
        hitPoints: {
          currentHp: Hp(1) as Parameters<
            typeof admitCompanionToBattle
          >[0]["manifestation"] extends { readonly hitPoints: infer H }
            ? H extends { readonly currentHp: infer C }
              ? C
              : never
            : never,
          tempHp: Hp(0),
        },
      },
      initialCombatantOrder: initialCombatantOrder(casterId, otherCombatantId),
    });

    expect(Result.isFailure(admitted)).toBe(true);
    if (Result.isSuccess(admitted)) return;
    expect(battleStateInitIssueMessage(admitted.failure)).toBe(
      "Companion identity must not identify an ordinary combatant.",
    );
  });

  test("permanent dismissal tombstones the familiar and removes its combatant", () => {
    const cast = castCatFamiliar(startFixtureBattle());
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    const dismissed = permanentlyDismissSpawnedCompanion({
      state: withFreshMagicAction(cast.state),
      casterId,
    });

    expect(dismissed.tag).toBe("resolved");
    if (dismissed.tag !== "resolved") return;
    // The record is retained as a dismissedForever tombstone (not deleted) so
    // settlement can clear the owner's durable slot; the combatant is removed
    // and the tombstone is excluded from the snapshot.
    expect(spawnedCompanionForOwner(dismissed.state, casterId)).toMatchObject({
      status: "dismissedForever",
    });
    expect(dismissed.state.combatants.has(familiarId)).toBe(false);
    expect(dismissed.snapshot.companions).toEqual([]);
    expect(dismissed.snapshot.turnOrder).toEqual([casterId]);
    expect(dismissed.droppedObjects).toBeUndefined();
  });

  test("0 HP disappearance records absence and leaves recast state", () => {
    const cast = castCatFamiliar(startFixtureBattle());
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    const disappeared = applySpawnedCompanionZeroHitPointDisappearance({
      state: cast.state,
      familiarId,
      heldObjectIds: [droppedObjectId],
    });

    expect(disappeared.tag).toBe("resolved");
    if (disappeared.tag !== "resolved") return;
    expect(disappeared.state.combatants.has(familiarId)).toBe(false);
    expect(disappeared.snapshot.turnOrder).toEqual([casterId]);
    expect(spawnedCompanionForOwner(disappeared.state, casterId)).toMatchObject(
      {
        status: "disappearedAtZeroHitPoints",
      },
    );
    expect(disappeared.droppedObjects).toHaveLength(1);

    const recast = castRatFamiliar(disappeared.state);
    expect(recast.tag).toBe("resolved");
    if (recast.tag !== "resolved") return;
    expect(spawnedCompanionForOwner(recast.state, casterId)).toMatchObject({
      status: "present",
    });
    const recastEntry = spawnedCompanionEntryForOwner(recast.state, casterId);
    expect(
      recastEntry?.companion.status === "present"
        ? recastEntry.companion.combatantId
        : undefined,
    ).toBe(replacementFamiliarId);
    expect(recast.state.combatants.has(familiarId)).toBe(false);
    expect(recast.state.combatants.has(replacementFamiliarId)).toBe(true);
  });

  test("owns its turn and resources while rejecting ordinary attacks", () => {
    const initial = startFixtureBattle({ includeEnemy: true });
    const cast = castSpawnedCompanion({
      state: initial,
      casterId,
      ammunitionStocks: [],
      catalog: statBlockCatalog,
      eligibility: familiarEligibility,
      selection: {
        tag: "normalNamedForm",
        formId: "cat",
      },
      creatureTypeOverrideChoiceId: firstTypeOverride.optionId,
      familiarId,
      initiative: initiativeScore(11),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    expect(cast.snapshot.currentActorId).toBe(casterId);

    const familiarTurn = resolveBattleSubject({
      state: cast.state,
      subject: { tag: "runtimeCommand", actorId: casterId, command: "endTurn" },
      fills: [],
    });
    expect(familiarTurn.tag).toBe("resolved");
    if (familiarTurn.tag !== "resolved") return;
    expect(familiarTurn.snapshot.currentActorId).toBe(familiarId);
    expect(familiarTurn.snapshot.turn.actionResources).toEqual([
      { kind: "action", source: "turn" },
    ]);
    expect(cast.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: familiarId,
          reactionAvailable: true,
        }),
        expect.objectContaining({
          combatantId: casterId,
          reactionAvailable: true,
        }),
      ]),
    );
    const acts = discoverBattleActs(
      battleRuntimeSessionForTest({
        state: familiarTurn.state,
        context: emptyBattleRuntimeContext(),
      }),
    );
    expect(acts.map((act) => act.subject)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tag: "action", action: "dash" }),
        expect.objectContaining({ tag: "action", action: "dodge" }),
        expect.objectContaining({ tag: "runtimeCommand", command: "endTurn" }),
      ]),
    );
    expect(
      acts.some(
        (act) =>
          act.subject.tag === "action" && act.subject.action === "attack",
      ),
    ).toBe(false);

    const dashSubject = acts.find(
      (act) => act.subject.tag === "action" && act.subject.action === "dash",
    )?.subject;
    expect(dashSubject).toBeDefined();
    if (dashSubject === undefined) return;

    const dash = resolveBattleSubject({
      state: familiarTurn.state,
      subject: dashSubject,
      fills: [],
    });
    expect(dash.tag).toBe("resolved");
    if (dash.tag !== "resolved") return;
    expect(dash.snapshot.currentActorId).toBe(familiarId);
    expect(dash.snapshot.turn.actionResources).toEqual([]);
    expect(
      dash.snapshot.combatants.find(
        (combatant) => combatant.combatantId === casterId,
      )?.reactionAvailable,
    ).toBe(true);
  });

  test("cleans familiar-owned readied state when the familiar leaves battle", () => {
    const cast = castCatFamiliarAfterCasterTurn(startFixtureBattle());
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const familiarTurn = resolveBattleSubject({
      state: cast.state,
      subject: { tag: "runtimeCommand", actorId: casterId, command: "endTurn" },
      fills: [],
    });
    expect(familiarTurn.tag).toBe("resolved");
    if (familiarTurn.tag !== "resolved") return;

    const readySubject = {
      tag: "action" as const,
      actorId: familiarId,
      action: "ready" as const,
    };
    const declaration = resolveBattleSubject({
      state: familiarTurn.state,
      subject: readySubject,
      fills: [],
    });
    expect(declaration.tag).toBe("needsHoles");
    if (declaration.tag !== "needsHoles") return;
    const readied = resolveBattleSubject({
      state: familiarTurn.state,
      subject: readySubject,
      fills: [
        readyDeclarationFillForTest(
          declaration.holes[0]!,
          "the enemy approaches",
          { kind: "movement" },
        ),
      ],
    });
    expect(readied.tag).toBe("resolved");
    if (readied.tag !== "resolved") return;
    expect(readied.state.readiedResponses.has(familiarId)).toBe(true);

    const disappeared = applySpawnedCompanionZeroHitPointDisappearance({
      state: readied.state,
      familiarId,
    });
    expect(disappeared.tag).toBe("resolved");
    if (disappeared.tag !== "resolved") return;
    expect(disappeared.state.combatants.has(familiarId)).toBe(false);
    expect(disappeared.state.readiedResponses.has(familiarId)).toBe(false);
    expect(disappeared.snapshot.readiedResponses.actionsOrMovements).toEqual(
      [],
    );

    const recast = castCatFamiliarAfterCasterTurn(disappeared.state);
    expect(recast.tag).toBe("resolved");
    if (recast.tag !== "resolved") return;
    const secondFamiliarTurn = resolveBattleSubject({
      state: recast.state,
      subject: { tag: "runtimeCommand", actorId: casterId, command: "endTurn" },
      fills: [],
    });
    expect(secondFamiliarTurn.tag).toBe("resolved");
    if (secondFamiliarTurn.tag !== "resolved") return;
    const secondReadyDeclaration = resolveBattleSubject({
      state: secondFamiliarTurn.state,
      subject: readySubject,
      fills: [],
    });
    expect(secondReadyDeclaration.tag).toBe("needsHoles");
    if (secondReadyDeclaration.tag !== "needsHoles") return;
    const readiedAgain = resolveBattleSubject({
      state: secondFamiliarTurn.state,
      subject: readySubject,
      fills: [
        readyDeclarationFillForTest(
          secondReadyDeclaration.holes[0]!,
          "the enemy approaches",
          { kind: "movement" },
        ),
      ],
    });
    expect(readiedAgain.tag).toBe("resolved");
    if (readiedAgain.tag !== "resolved") return;
    expect(readiedAgain.state.readiedResponses.has(familiarId)).toBe(true);

    const casterTurn = resolveBattleSubject({
      state: readiedAgain.state,
      subject: {
        tag: "runtimeCommand",
        actorId: familiarId,
        command: "endTurn",
      },
      fills: [],
    });
    expect(casterTurn.tag).toBe("resolved");
    if (casterTurn.tag !== "resolved") return;

    const dismissed = permanentlyDismissSpawnedCompanion({
      state: casterTurn.state,
      casterId,
    });
    expect(dismissed.tag).toBe("resolved");
    if (dismissed.tag !== "resolved") return;
    expect(dismissed.state.combatants.has(familiarId)).toBe(false);
    expect(dismissed.state.readiedResponses.has(familiarId)).toBe(false);
    expect(dismissed.snapshot.readiedResponses.actionsOrMovements).toEqual([]);
  });

  test("generic combatant removal keeps owner and familiar state together", () => {
    const cast = castCatFamiliar(startFixtureBattle({ includeEnemy: true }));
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    const ownerRemoved = removeBattleCombatants({
      state: cast.state,
      combatantIds: [casterId],
    });
    expect(Result.isSuccess(ownerRemoved)).toBe(true);
    if (Result.isFailure(ownerRemoved)) return;
    expect(ownerRemoved.success.combatants.has(casterId)).toBe(false);
    expect(ownerRemoved.success.combatants.has(familiarId)).toBe(false);
    expect(spawnedCompanionForOwner(ownerRemoved.success, casterId)).toBeNull();
    expect(snapshotBattle(ownerRemoved.success).companions).toEqual([]);

    const recast = castCatFamiliar(startFixtureBattle({ includeEnemy: true }));
    expect(recast.tag).toBe("resolved");
    if (recast.tag !== "resolved") return;
    const familiarRemoved = removeBattleCombatants({
      state: recast.state,
      combatantIds: [familiarId],
    });
    expect(Result.isSuccess(familiarRemoved)).toBe(true);
    if (Result.isFailure(familiarRemoved)) return;
    expect(familiarRemoved.success.combatants.has(casterId)).toBe(true);
    expect(familiarRemoved.success.combatants.has(familiarId)).toBe(false);
    expect(
      spawnedCompanionForOwner(familiarRemoved.success, casterId),
    ).toBeNull();
    expect(snapshotBattle(familiarRemoved.success).companions).toEqual([]);
  });

  test("ordinary damage to 0 HP makes a present familiar disappear", () => {
    const cast = castCatFamiliar(startFixtureBattle({ includeEnemy: true }));
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const familiar = cast.state.combatants.get(familiarId);
    expect(familiar).toBeDefined();
    if (familiar === undefined) return;

    const damaged = applyBattleHitPointDamage({
      saveGatedConditionDamageRepeatSave: { kind: "noRepeatSave" },
      state: cast.state,
      target: familiar,
      damageAmount: Number(familiar.hp),
      deathFailuresAtZeroHp: 1,
    });

    expect(damaged.combatants.has(familiarId)).toBe(false);
    expect(spawnedCompanionForOwner(damaged, casterId)).toMatchObject({
      status: "disappearedAtZeroHitPoints",
      formAccess: "spawnedCompanion",
      resolvedStatBlockId: "stat_block_cat",
      creatureTypeOverride: firstTypeOverride.creatureType,
    });
    const damagedSnapshot = snapshotBattle(damaged);
    expect(damagedSnapshot.companions).toEqual([
      expect.objectContaining({
        ownerId: casterId,
        status: "disappearedAtZeroHitPoints",
      }),
    ]);
    expect(damagedSnapshot.turnOrder).not.toContain(familiarId);
  });

  test("projects 100-foot telepathy without a shared-language requirement", () => {
    const cast = castCatFamiliar(startFixtureBattle());
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    expect(
      spawnedCompanionTelepathicConnection(cast.state, {
        kind: "companionWithinCommunicationRangeOfOwner",
        ownerId: casterId,
        familiarId,
      }),
    ).toEqual({
      ownerId: casterId,
      familiarId,
      rangeFeet: 100,
      sharedLanguageRequired: false,
    });
    expect(
      spawnedCompanionTelepathicConnection(cast.state, {
        kind: "companionWithinCommunicationRangeOfOwner",
        ownerId: casterId,
        familiarId: otherCombatantId,
      }),
    ).toBeNull();
  });

  test("shares familiar senses as a Bonus Action until caster's next turn", () => {
    const cast = castCatFamiliar(startFixtureBattle());
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    const shared = shareSpawnedCompanionSenses({
      state: cast.state,
      casterId,
      fact: {
        kind: "companionWithinCommunicationRangeOfOwner",
        ownerId: casterId,
        familiarId,
      },
    });

    expect(shared.tag).toBe("resolved");
    if (shared.tag !== "resolved") return;
    expect(shared.state.currentTurnResources.currentHasBonusAction).toBe(false);
    const caster = shared.state.combatants.get(casterId);
    const effect = caster?.activeEffects.find(
      (candidate) => candidate.kind === "spawnedCompanionSharedSenses",
    );
    expect(effect).toMatchObject({
      source: {
        kind: "companionSharedSenses",
        ownerId: casterId,
      },
      sourceCombatantId: casterId,
      familiarId,
      canSeeThroughFamiliar: true,
      canHearThroughFamiliar: true,
      expiresAt: { kind: "startOfTurn", combatantId: casterId },
    });
    const familiar = cast.state.combatants.get(familiarId);
    expect(effect?.familiarSenses).toEqual(
      familiar?.origin.kind === "statBlock"
        ? familiar.origin.mechanics.specialSenses
        : [],
    );

    const blocked = shareSpawnedCompanionSenses({
      state: shared.state,
      casterId,
      fact: {
        kind: "companionWithinCommunicationRangeOfOwner",
        ownerId: casterId,
        familiarId,
      },
    });
    expect(blocked.tag).toBe("invalid");
    if (blocked.tag !== "invalid") return;
    expect(blocked.reason).toBe("staleSubject");

    const wrongConnection = shareSpawnedCompanionSenses({
      state: cast.state,
      casterId,
      fact: {
        kind: "companionWithinCommunicationRangeOfOwner",
        ownerId: casterId,
        familiarId: otherCombatantId,
      },
    });
    expect(wrongConnection).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });

    const nextTurn = endTurn({ state: cast.state, actorId: casterId });
    expect(nextTurn.tag).toBe("resolved");
    if (nextTurn.tag !== "resolved") return;
    const outsideCasterTurn = shareSpawnedCompanionSenses({
      state: nextTurn.state,
      casterId,
      fact: {
        kind: "companionWithinCommunicationRangeOfOwner",
        ownerId: casterId,
        familiarId,
      },
    });
    expect(outsideCasterTurn).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
  });

  test("delivers Touch spells through a present familiar and atomically spends its Reaction", () => {
    const session = startSpellcasterFixtureBattle();
    const cast = castCatFamiliar(session);
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const cureWoundsAct = discoverBattleActs(
      battleRuntimeSessionForTest({
        state: cast.state,
        context: session.context,
      }),
    ).find(
      (act) =>
        act.subject.tag === "actionSpell" &&
        battleActSpellPresentation(act)?.invocation.spellId === "cure_wounds",
    );
    expect(cureWoundsAct?.subject.tag).toBe("actionSpell");
    if (cureWoundsAct?.subject.tag !== "actionSpell") return;
    const targetFill = {
      kind: "targetChoice" as const,
      holeId: ATTACK_TARGET_HOLE_ID,
      value: enemyId,
      spatialFacts: [
        {
          kind: "spawnedCompanionTouchSpellTarget" as const,
          ownerId: casterId,
          familiarId,
          targetId: enemyId,
          sourceProcedureRef: cureWoundsAct.subject.procedureRef,
        },
      ],
    };
    const awaitingHealingRoll = deliverTouchSpellThroughSpawnedCompanion({
      state: cast.state,
      subject: cureWoundsAct.subject,
      fills: [targetFill],
      fact: {
        kind: "companionWithinCommunicationRangeOfOwner",
        ownerId: casterId,
        familiarId,
      },
    });
    expect(awaitingHealingRoll.tag).toBe("needsHoles");
    expect(cast.state.combatants.get(familiarId)?.reactionAvailable).toBe(true);
    if (awaitingHealingRoll.tag !== "needsHoles") return;
    expect(
      awaitingHealingRoll.state.combatants.get(familiarId)?.reactionAvailable,
    ).toBe(false);

    const delivered = deliverTouchSpellThroughSpawnedCompanion({
      state: cast.state,
      subject: cureWoundsAct.subject,
      fills: [
        targetFill,
        {
          kind: "rolledDice",
          holeId: awaitingHealingRoll.holes[0]?.holeId ?? ATTACK_TARGET_HOLE_ID,
          value: [{ results: [DieRollResult(4), DieRollResult(4)] }],
        },
      ],
      fact: {
        kind: "companionWithinCommunicationRangeOfOwner",
        ownerId: casterId,
        familiarId,
      },
    });

    expect(delivered.tag).toBe("resolved");
    if (delivered.tag !== "resolved") return;
    expect(delivered.state.combatants.get(familiarId)?.reactionAvailable).toBe(
      false,
    );
    expect(Number(delivered.state.combatants.get(enemyId)?.hp)).toBe(12);
    expect(
      delivered.state.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed",
      ),
    ).toBe(true);
  });

  test("delivers a Bonus Action Touch spell and rejects its stale act after shared senses spends that Bonus Action", () => {
    const session = startSpellcasterFixtureBattle();
    const cast = castCatFamiliar(session);
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const runtimeSession = battleRuntimeSessionForTest({
      state: cast.state,
      context: session.context,
    });
    const acts = discoverBattleActs(runtimeSession);
    const delivery = acts.find(
      (act) =>
        act.subject.tag === "spawnedCompanionTouchSpellProxy" &&
        battleActSpellPresentation(act)?.invocation.spellId === "barkskin",
    );
    const sharedSenses = acts.find(
      (act) => act.subject.tag === "spawnedCompanionSharedSenses",
    );
    expect(delivery?.subject.tag).toBe("spawnedCompanionTouchSpellProxy");
    expect(sharedSenses?.subject.tag).toBe("spawnedCompanionSharedSenses");
    if (
      delivery?.subject.tag !== "spawnedCompanionTouchSpellProxy" ||
      sharedSenses?.subject.tag !== "spawnedCompanionSharedSenses"
    ) {
      return;
    }
    const connection = spawnedCompanionConnectionFill(
      requireHole(delivery.initialHoles, "spawnedCompanionConnection"),
    );
    const targetHole = requireHole(delivery.initialHoles, "targetChoice");
    const target = {
      kind: "targetChoice" as const,
      holeId: targetHole.holeId,
      value: casterId,
      spatialFacts: [
        {
          kind: "spawnedCompanionTouchSpellTarget" as const,
          ownerId: casterId,
          familiarId,
          targetId: casterId,
          sourceProcedureRef: delivery.subject.procedureRef,
        },
        {
          kind: "spellTargetKnownWilling" as const,
          casterId,
          targetId: casterId,
          sourceProcedureRef: delivery.subject.procedureRef,
        },
      ],
    };
    const shared = resolveBattleSubject({
      state: cast.state,
      subject: sharedSenses.subject,
      fills: [
        spawnedCompanionConnectionFill(
          requireHole(sharedSenses.initialHoles, "spawnedCompanionConnection"),
        ),
      ],
    });
    expect(shared.tag).toBe("resolved");
    if (shared.tag !== "resolved") return;
    const casterBeforeSharedSenses = cast.state.combatants.get(casterId);
    const casterAfterSharedSenses = shared.state.combatants.get(casterId);
    expect(
      casterAfterSharedSenses?.activeEffects.find(
        (effect) => effect.kind === "spawnedCompanionSharedSenses",
      ),
    ).toEqual(expect.objectContaining({ effectRef: expect.any(String) }));
    expect(Number(casterAfterSharedSenses?.nextEffectOrdinal)).toBe(
      Number(casterBeforeSharedSenses?.nextEffectOrdinal) + 1,
    );

    const staleDelivery = resolveBattleSubject({
      state: shared.state,
      subject: delivery.subject,
      fills: [connection, target],
    });
    expect(staleDelivery).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
    expect(shared.state.combatants.get(familiarId)?.reactionAvailable).toBe(
      true,
    );

    const delivered = resolveBattleSubject({
      state: cast.state,
      subject: delivery.subject,
      fills: [connection, target],
    });
    expect(delivered).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: casterId, armorClass: 17 }),
        ]),
      },
    });
    if (delivered.tag !== "resolved") return;
    expect(delivered.state.combatants.get(familiarId)?.reactionAvailable).toBe(
      false,
    );
    expect(
      companionRouteForResolution(
        {
          state: cast.state,
          subject: delivery.subject,
          fills: [connection, target],
        },
        delivered,
      ),
    ).toEqual([
      expect.objectContaining({
        subject: "companionTouchDelivery",
        fill: "targetChoice",
        owner: "battleCompanion",
      }),
      expect.objectContaining({
        subject: "companionTouchDelivery",
        owner: "battleActionEconomy",
      }),
    ]);
  });

  test("preserves a spent familiar Reaction across an explicit same-round zero-HP lifecycle edge", () => {
    const session = startSpellcasterFixtureBattle();
    const cast = castCatFamiliar(session);
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const delivery = discoverBattleActs(
      battleRuntimeSessionForTest({
        state: cast.state,
        context: session.context,
      }),
    ).find(
      (act) =>
        act.subject.tag === "spawnedCompanionTouchSpellProxy" &&
        battleActSpellPresentation(act)?.invocation.spellId === "barkskin",
    );
    expect(delivery?.subject.tag).toBe("spawnedCompanionTouchSpellProxy");
    if (delivery?.subject.tag !== "spawnedCompanionTouchSpellProxy") return;
    const connection = spawnedCompanionConnectionFill(
      requireHole(delivery.initialHoles, "spawnedCompanionConnection"),
    );
    const target = {
      kind: "targetChoice" as const,
      holeId: requireHole(delivery.initialHoles, "targetChoice").holeId,
      value: casterId,
      spatialFacts: [
        {
          kind: "spawnedCompanionTouchSpellTarget" as const,
          ownerId: casterId,
          familiarId,
          targetId: casterId,
          sourceProcedureRef: delivery.subject.procedureRef,
        },
        {
          kind: "spellTargetKnownWilling" as const,
          casterId,
          targetId: casterId,
          sourceProcedureRef: delivery.subject.procedureRef,
        },
      ],
    };
    const delivered = resolveBattleSubject({
      state: cast.state,
      subject: delivery.subject,
      fills: [connection, target],
    });
    expect(delivered.tag).toBe("resolved");
    if (delivered.tag !== "resolved") return;
    expect(delivered.state.combatants.get(familiarId)?.reactionAvailable).toBe(
      false,
    );

    const familiar = delivered.state.combatants.get(familiarId);
    expect(familiar).toBeDefined();
    if (familiar === undefined) return;
    const disappeared = applyBattleHitPointDamage({
      saveGatedConditionDamageRepeatSave: { kind: "noRepeatSave" },
      state: delivered.state,
      target: familiar,
      damageAmount: Number(familiar.hp) + 1,
      deathFailuresAtZeroHp: 1,
    });
    expect(spawnedCompanionForOwner(disappeared, casterId)).toMatchObject({
      status: "disappearedAtZeroHitPoints",
      reactionAvailable: false,
    });
    const recast = castCatFamiliar(disappeared);
    expect(recast.tag).toBe("resolved");
    if (recast.tag !== "resolved") return;
    expect(recast.state.combatants.get(familiarId)).toMatchObject({
      reactionAvailable: false,
    });
  });

  test("commits the familiar Reaction through a declined spell-cast interrupt and resumes the wrapper fills", () => {
    const session = startSpellcasterFixtureBattle({
      enemyCanCounterspell: true,
    });
    const cast = castCatFamiliar(session);
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const act = discoverBattleActs(
      battleRuntimeSessionForTest({ ...session, state: cast.state }),
    ).find(
      (candidate) =>
        candidate.subject.tag === "spawnedCompanionTouchSpellProxy" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          "cure_wounds",
    );
    expect(act?.subject.tag).toBe("spawnedCompanionTouchSpellProxy");
    if (act?.subject.tag !== "spawnedCompanionTouchSpellProxy") return;
    const connectionFill = spawnedCompanionConnectionFill(
      requireHole(act.initialHoles, "spawnedCompanionConnection"),
    );
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const targetFill = {
      kind: "targetChoice" as const,
      holeId: targetHole.holeId,
      value: enemyId,
      spatialFacts: [
        {
          kind: "spawnedCompanionTouchSpellTarget" as const,
          ownerId: casterId,
          familiarId,
          targetId: enemyId,
          sourceProcedureRef: act.subject.procedureRef,
        },
      ],
    };
    const spellCastInterruptionReactionFacts =
      spellCastInterruptionReactionTriggerFactsFill(
        battleRuntimeSessionForTest({ ...session, state: cast.state }),
      );
    const originalFills = [
      connectionFill,
      targetFill,
      spellCastInterruptionReactionFacts,
    ];
    const interrupted = resolveBattleSubject({
      state: cast.state,
      subject: act.subject,
      fills: originalFills,
    });
    expect(interrupted).toMatchObject({
      tag: "needsHoles",
      subject: {
        tag: "spawnedCompanionTouchSpellProxy",
      },
    });
    if (interrupted.tag !== "needsHoles") return;
    expect(
      interrupted.state.combatants.get(familiarId)?.reactionAvailable,
    ).toBe(false);

    const resumed = resolveBattleInterrupt({
      state: interrupted.state,
      fill: {
        kind: "interruptDecision",
        holeId: requireHole(interrupted.holes, "interruptDecision").holeId,
        value: { kind: "decline", responderId: enemyId },
      },
    });
    expect(resumed).toMatchObject({
      tag: "needsHoles",
      subject: {
        tag: "spawnedCompanionTouchSpellProxy",
      },
    });
    if (resumed.tag !== "needsHoles") return;
    const completed = resolveBattleSubject({
      state: resumed.state,
      subject: resumed.subject,
      fills: [
        connectionFill,
        targetFill,
        damageRollFill(requireHole(resumed.holes, "rolledDice"), [4, 4]),
      ],
    });
    expect(completed.tag).toBe("resolved");
    if (completed.tag !== "resolved") return;
    expect(completed.state.combatants.get(familiarId)?.reactionAvailable).toBe(
      false,
    );
    expect(Number(completed.state.combatants.get(enemyId)?.hp)).toBe(12);
  });

  test("resumes a familiar-delivered touch attack spell through its wrapper after a spell-cast interrupt", () => {
    const session = startSpellcasterFixtureBattle({
      enemyCanCounterspell: true,
      casterSpellProfile: "wizardShockingGrasp",
    });
    const cast = castCatFamiliar(session);
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const runtimeSession = battleRuntimeSessionForTest({
      ...session,
      state: cast.state,
    });
    const act = discoverBattleActs(runtimeSession).find(
      (candidate) =>
        candidate.subject.tag === "spawnedCompanionTouchSpellProxy" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          "shocking_grasp",
    );
    expect(act?.subject.tag).toBe("spawnedCompanionTouchSpellProxy");
    if (act?.subject.tag !== "spawnedCompanionTouchSpellProxy") return;
    const connectionFill = spawnedCompanionConnectionFill(
      requireHole(act.initialHoles, "spawnedCompanionConnection"),
    );
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const targetFill = {
      kind: "targetChoice" as const,
      holeId: targetHole.holeId,
      value: enemyId,
      spatialFacts: [
        {
          kind: "spawnedCompanionTouchSpellTarget" as const,
          ownerId: casterId,
          familiarId,
          targetId: enemyId,
          sourceProcedureRef: act.subject.procedureRef,
        },
      ],
    };
    const interrupted = resolveBattleSubject({
      state: cast.state,
      subject: act.subject,
      fills: [
        connectionFill,
        targetFill,
        spellCastInterruptionReactionTriggerFactsFill(runtimeSession),
      ],
    });
    expect(interrupted).toMatchObject({
      tag: "needsHoles",
      subject: { tag: "spawnedCompanionTouchSpellProxy" },
    });
    if (interrupted.tag !== "needsHoles") return;
    expect(
      interrupted.state.combatants.get(familiarId)?.reactionAvailable,
    ).toBe(false);
    const resumed = resolveBattleInterrupt({
      state: interrupted.state,
      fill: {
        kind: "interruptDecision",
        holeId: requireHole(interrupted.holes, "interruptDecision").holeId,
        value: { kind: "decline", responderId: enemyId },
      },
    });
    expect(resumed).toMatchObject({
      tag: "needsHoles",
      subject: { tag: "spawnedCompanionTouchSpellProxy" },
    });
    if (resumed.tag !== "needsHoles") return;
    const completed = resolveBattleSubject({
      state: resumed.state,
      subject: resumed.subject,
      fills: [
        connectionFill,
        targetFill,
        attackRollFill(requireHole(resumed.holes, "attackRoll"), {
          total: 1,
          naturalD20: 2,
        }),
      ],
    });
    expect(completed.tag).toBe("resolved");
    if (completed.tag !== "resolved") return;
    expect(completed.state.combatants.get(familiarId)?.reactionAvailable).toBe(
      false,
    );
    expect(Number(completed.state.combatants.get(enemyId)?.hp)).toBe(1);
  });

  test("ordinary spell resolution rejects forged familiar-delivery spatial facts", () => {
    const session = startSpellcasterFixtureBattle();
    const cast = castCatFamiliar(session);
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const cureWoundsAct = discoverBattleActs(
      battleRuntimeSessionForTest({
        state: cast.state,
        context: session.context,
      }),
    ).find(
      (act) =>
        act.subject.tag === "actionSpell" &&
        battleActSpellPresentation(act)?.invocation.spellId === "cure_wounds",
    );
    expect(cureWoundsAct?.subject.tag).toBe("actionSpell");
    if (cureWoundsAct?.subject.tag !== "actionSpell") return;

    const forgedFamiliarDeliveryFill = {
      kind: "targetChoice",
      holeId: ATTACK_TARGET_HOLE_ID,
      value: enemyId,
      spatialFacts: [
        {
          kind: "spawnedCompanionTouchSpellTarget",
          ownerId: casterId,
          familiarId,
          targetId: enemyId,
          sourceProcedureRef: cureWoundsAct.subject.procedureRef,
        },
      ],
    } satisfies Parameters<typeof resolveBattleSubject>[0]["fills"][number];

    const bypass = resolveBattleSubject({
      state: cast.state,
      subject: cureWoundsAct.subject,
      fills: [forgedFamiliarDeliveryFill],
    });

    expect(bypass.tag).toBe("invalid");
    expect(cast.state.combatants.get(familiarId)?.reactionAvailable).toBe(true);
    expect(
      cast.state.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed",
      ),
    ).toBe(false);
  });

  test("rejects non-Touch delivery and unavailable familiar Reactions before casting", () => {
    const session = startSpellcasterFixtureBattle();
    const cast = castCatFamiliar(session);
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const healingWordAct = discoverBattleActs(
      battleRuntimeSessionForTest({
        state: cast.state,
        context: session.context,
      }),
    ).find(
      (act) =>
        act.subject.tag === "bonusActionSpell" &&
        battleActSpellPresentation(act)?.invocation.spellId === "healing_word",
    );
    expect(healingWordAct?.subject.tag).toBe("bonusActionSpell");
    if (healingWordAct?.subject.tag !== "bonusActionSpell") return;

    const nonTouch = deliverTouchSpellThroughSpawnedCompanion({
      state: cast.state,
      subject: healingWordAct.subject,
      fills: [],
      fact: {
        kind: "companionWithinCommunicationRangeOfOwner",
        ownerId: casterId,
        familiarId,
      },
    });
    expect(nonTouch.tag).toBe("invalid");
    expect(
      cast.state.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed",
      ),
    ).toBe(false);
    expect(cast.state.combatants.get(familiarId)?.reactionAvailable).toBe(true);

    const cureWoundsAct = discoverBattleActs(
      battleRuntimeSessionForTest({
        state: cast.state,
        context: session.context,
      }),
    ).find(
      (act) =>
        act.subject.tag === "actionSpell" &&
        battleActSpellPresentation(act)?.invocation.spellId === "cure_wounds",
    );
    expect(cureWoundsAct?.subject.tag).toBe("actionSpell");
    if (cureWoundsAct?.subject.tag !== "actionSpell") return;

    const readiedMode = deliverTouchSpellThroughSpawnedCompanion({
      state: cast.state,
      subject: {
        ...cureWoundsAct.subject,
        mode: { tag: "ready", trigger: "spellCast" },
      },
      fills: [],
      fact: {
        kind: "companionWithinCommunicationRangeOfOwner",
        ownerId: casterId,
        familiarId,
      },
    });
    expect(readiedMode).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
    });

    const wrongConnection = deliverTouchSpellThroughSpawnedCompanion({
      state: cast.state,
      subject: cureWoundsAct.subject,
      fills: [],
      fact: {
        kind: "companionWithinCommunicationRangeOfOwner",
        ownerId: casterId,
        familiarId: otherCombatantId,
      },
    });
    expect(wrongConnection).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
    const withoutReaction = {
      ...cast.state,
      combatants: new Map(cast.state.combatants).set(familiarId, {
        ...cast.state.combatants.get(familiarId)!,
        reactionAvailable: false,
      }),
    };
    const blocked = deliverTouchSpellThroughSpawnedCompanion({
      state: withoutReaction,
      subject: cureWoundsAct.subject,
      fills: [],
      fact: {
        kind: "companionWithinCommunicationRangeOfOwner",
        ownerId: casterId,
        familiarId,
      },
    });
    expect(blocked.tag).toBe("invalid");
    expect(
      withoutReaction.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed",
      ),
    ).toBe(false);
  });

  test("commits the familiar Reaction before applying the delivered Touch spell", () => {
    const session = startSpellcasterFixtureBattle();
    const cast = castCatFamiliar(session);
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const cureWoundsAct = discoverBattleActs(
      battleRuntimeSessionForTest({ ...session, state: cast.state }),
    ).find(
      (act) =>
        act.subject.tag === "actionSpell" &&
        battleActSpellPresentation(act)?.invocation.spellId === "cure_wounds",
    );
    expect(cureWoundsAct?.subject.tag).toBe("actionSpell");
    if (cureWoundsAct?.subject.tag !== "actionSpell") return;
    const targetFill = {
      kind: "targetChoice" as const,
      holeId: ATTACK_TARGET_HOLE_ID,
      value: enemyId,
      spatialFacts: [
        {
          kind: "spawnedCompanionTouchSpellTarget" as const,
          ownerId: casterId,
          familiarId,
          targetId: enemyId,
          sourceProcedureRef: cureWoundsAct.subject.procedureRef,
        },
      ],
    };
    const result = deliverTouchSpellThroughSpawnedCompanionWithExecution(
      {
        state: cast.state,
        subject: cureWoundsAct.subject,
        fills: [targetFill],
        fact: {
          kind: "companionWithinCommunicationRangeOfOwner",
          ownerId: casterId,
          familiarId,
        },
        reactionContinuation: {
          subject: cureWoundsAct.subject,
          fills: [targetFill],
        },
      },
      CompanionLifecycleProcedureExecution.fromResolver((admitted) => {
        expect(
          admitted.state.combatants.get(familiarId)?.reactionAvailable,
        ).toBe(false);
        return {
          tag: "resolved",
          state: admitted.state,
          snapshot: snapshotBattle(admitted.state),
        };
      }),
      "uncommitted",
    );
    expect(result.tag).toBe("resolved");
    if (result.tag !== "resolved") return;
    expect(result.state.combatants.get(familiarId)?.reactionAvailable).toBe(
      false,
    );
  });

  test("discovers and resolves present familiar lifecycle subjects through generic battle acts", () => {
    const session = startSpawnedCompanionSpellcasterFixtureBattle();
    const cast = castCatFamiliar(session);
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    const acts = discoverBattleActs(
      battleRuntimeSessionForTest({
        state: cast.state,
        context: session.context,
      }),
    );
    const temporaryDismiss = acts.find(
      (act) =>
        act.subject.tag === "companionLifecycle" &&
        act.subject.action === "temporarilyDismiss",
    );
    const permanentDismiss = acts.find(
      (act) =>
        act.subject.tag === "companionLifecycle" &&
        act.subject.action === "permanentlyDismiss",
    );
    const shareSenses = acts.find(
      (act) => act.subject.tag === "spawnedCompanionSharedSenses",
    );
    expect(temporaryDismiss?.subject.tag).toBe("companionLifecycle");
    expect(permanentDismiss?.subject.tag).toBe("companionLifecycle");
    expect(shareSenses?.subject.tag).toBe("spawnedCompanionSharedSenses");
    if (
      temporaryDismiss?.subject.tag !== "companionLifecycle" ||
      permanentDismiss?.subject.tag !== "companionLifecycle" ||
      shareSenses?.subject.tag !== "spawnedCompanionSharedSenses"
    ) {
      return;
    }
    const heldObjects = heldObjectFactsFill(
      requireHole(temporaryDismiss.initialHoles, "heldObjectFacts"),
      [droppedObjectId],
    );

    expect(
      resolveBattleSubject({
        state: cast.state,
        subject: temporaryDismiss.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Familiar temporary dismissal requires held-object facts for the familiar.",
    });

    const shared = resolveBattleRuntimeSubject({
      session: battleRuntimeSessionForTest({
        state: cast.state,
        context: session.context,
      }),
      subject: shareSenses.subject,
      fills: [
        spawnedCompanionConnectionFill(
          requireHole(shareSenses.initialHoles, "spawnedCompanionConnection"),
        ),
      ],
    });
    expect(
      resolveBattleSubject({
        state: cast.state,
        subject: shareSenses.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "spawnedCompanionConnection" })],
    });
    expect(shared.tag).toBe("resolved");
    if (shared.tag !== "resolved") return;
    expect(
      shared.session.state.currentTurnResources.currentHasBonusAction,
    ).toBe(false);

    const dismissed = resolveBattleSubject({
      state: cast.state,
      subject: temporaryDismiss.subject,
      fills: [heldObjects],
    });
    expect(dismissed.tag).toBe("resolved");
    if (dismissed.tag !== "resolved") return;
    expect(spawnedCompanionForOwner(dismissed.state, casterId)).toMatchObject({
      status: "temporarilyDismissed",
    });
    expect(dismissed.state.combatants.has(familiarId)).toBe(false);
    expect(dismissed.droppedObjects).toEqual([
      expect.objectContaining({
        actorId: familiarId,
        objectId: droppedObjectId,
      }),
    ]);
    expect(
      resolveBattleSubject({
        state: dismissed.state,
        subject: temporaryDismiss.subject,
        fills: [heldObjects],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Familiar temporary dismissal requires the actor's present familiar.",
    });
    expect(
      discoverBattleActs(
        battleRuntimeSessionForTest({
          state: dismissed.state,
          context: session.context,
        }),
      ).some(
        (act) =>
          act.subject.tag === "companionLifecycle" &&
          act.subject.action === "reappear",
      ),
    ).toBe(false);
    const reappearanceReadyState = withFreshMagicAction(dismissed.state);
    const reappearanceAct = discoverBattleActs(
      battleRuntimeSessionForTest({
        state: reappearanceReadyState,
        context: session.context,
      }),
    ).find(
      (act) =>
        act.subject.tag === "companionLifecycle" &&
        act.subject.action === "reappear",
    );
    expect(reappearanceAct?.subject.tag).toBe("companionLifecycle");
    if (reappearanceAct?.subject.tag !== "companionLifecycle") return;
    const reappearanceSession = battleRuntimeSessionForTest({
      state: reappearanceReadyState,
      context: session.context,
    });
    const admittedReappearance = admitSpawnedCompanionReappearance({
      state: reappearanceReadyState,
      casterId,
      catalog: statBlockCatalog,
    });
    expect(Result.isSuccess(admittedReappearance)).toBe(true);
    if (Result.isFailure(admittedReappearance)) return;
    const mechanicalPlacementFrontier =
      resolveAdmittedCompanionReappearanceSubject({
        fills: [],
        admission: admittedReappearance.success.mechanics,
      });
    expect(mechanicalPlacementFrontier.tag).toBe("needsHoles");
    expect(
      companionRouteForResolution(
        {
          state: reappearanceReadyState,
          subject: reappearanceAct.subject,
          fills: [],
        },
        mechanicalPlacementFrontier,
      ),
    ).toEqual([
      expect.objectContaining({
        subject: "companionLifecycle",
        owner: "battleCompanion",
      }),
    ]);
    expect(
      resolveBattleSubject({
        state: reappearanceReadyState,
        subject: reappearanceAct.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Familiar reappearance is a session-owned admitted operation.",
    });
    const missingCatalog = resolveBattleRuntimeSubject({
      session: reappearanceSession,
      subject: reappearanceAct.subject,
      fills: [],
    });
    expect(missingCatalog).toMatchObject({
      tag: "invalid",
      session: reappearanceSession,
      reason: "invalidFill",
      message: "Familiar reappearance requires a Stat Block catalog.",
    });

    const wrongOwner = resolveBattleRuntimeSubject({
      session: reappearanceSession,
      subject: {
        ...reappearanceAct.subject,
        actorId: otherCombatantId,
      },
      fills: [],
      statBlockCatalog,
    });
    expect(wrongOwner).toMatchObject({
      tag: "invalid",
      session: reappearanceSession,
      reason: "invalidFill",
      message:
        "spawned companion lifecycle can reappear only from temporary dismissal.",
    });

    const awaitingPlacement = resolveBattleRuntimeSubject({
      session: reappearanceSession,
      subject: reappearanceAct.subject,
      fills: [],
      statBlockCatalog,
    });
    expect(awaitingPlacement).toMatchObject({
      tag: "needsHoles",
      envelope: {
        frontier: {
          kind: "holes",
          holes: [
            expect.objectContaining({ kind: "companionReappearancePlacement" }),
          ],
        },
      },
    });
    if (awaitingPlacement.tag !== "needsHoles") return;
    if (awaitingPlacement.envelope.frontier.kind !== "holes") return;
    const placementHole = requireHole(
      awaitingPlacement.envelope.frontier.holes,
      "companionReappearancePlacement",
    );
    const placementFill = companionReappearancePlacementFill(placementHole);

    expect(
      resolveBattleRuntimeSubject({
        session: reappearanceSession,
        subject: reappearanceAct.subject,
        fills: [
          {
            ...placementFill,
            value: { kind: "unoccupiedSpaceWithinSpellRange" },
          },
        ],
        statBlockCatalog,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Familiar reappearance placement must be an unoccupied space within 30 feet.",
    });

    const awaitingInitiative = resolveBattleRuntimeSubject({
      session: reappearanceSession,
      subject: reappearanceAct.subject,
      fills: [placementFill],
      statBlockCatalog,
    });
    expect(awaitingInitiative).toMatchObject({
      tag: "needsHoles",
      envelope: {
        frontier: {
          kind: "holes",
          holes: [
            expect.objectContaining({
              kind: "companionReappearanceInitiative",
            }),
          ],
        },
      },
    });
    if (awaitingInitiative.tag !== "needsHoles") return;
    if (awaitingInitiative.envelope.frontier.kind !== "holes") return;

    const reappeared = resolveBattleRuntimeSubject({
      session: reappearanceSession,
      subject: reappearanceAct.subject,
      fills: [
        placementFill,
        companionReappearanceInitiativeFill(
          requireHole(
            awaitingInitiative.envelope.frontier.holes,
            "companionReappearanceInitiative",
          ),
        ),
      ],
      statBlockCatalog,
    });
    expect(reappeared.tag).toBe("resolved");
    if (reappeared.tag !== "resolved") return;
    expect(
      spawnedCompanionForOwner(reappeared.session.state, casterId),
    ).toMatchObject({
      status: "present",
      placement: { kind: "unoccupiedSpaceWithin30Feet" },
    });
    expect(
      reappeared.session.state.combatants.get(familiarId)?.initiative,
    ).toBe(initiativeScore(14));
    expect(
      reappeared.session.state.combatants.get(familiarId),
    ).not.toHaveProperty("displayName");
    expect(
      reappeared.envelope.checkpoint.combatants.find(
        (combatant) => combatant.combatantId === familiarId,
      ),
    ).not.toHaveProperty("displayName");
    expect(
      battleCreaturePresentationDisplayName(
        reappeared.session.state,
        reappeared.session.context,
        familiarId,
      ),
    ).toBe("Cat");

    const permanentlyDismissed = resolveBattleSubject({
      state: cast.state,
      subject: permanentDismiss.subject,
      fills: [],
    });
    expect(permanentlyDismissed.tag).toBe("resolved");
    if (permanentlyDismissed.tag !== "resolved") return;
    expect(
      spawnedCompanionForOwner(permanentlyDismissed.state, casterId),
    ).toMatchObject({ status: "dismissedForever" });
    expect(permanentlyDismissed.state.combatants.has(familiarId)).toBe(false);
    expect(
      permanentlyDismissed.state.currentTurnResources.actionResources,
    ).toEqual([]);
    expect(permanentlyDismissed.droppedObjects).toBeUndefined();
  });

  test("discovers touch spell delivery as a generic companion act and preserves wrapper continuations", () => {
    const session = startSpellcasterFixtureBattle();
    const cast = castCatFamiliar(session);
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    const acts = discoverBattleActs(
      battleRuntimeSessionForTest({
        state: cast.state,
        context: session.context,
      }),
    );
    expect(
      acts.some(
        (act) =>
          act.subject.tag === "spawnedCompanionTouchSpellProxy" &&
          battleActSpellPresentation(act)?.invocation.spellId ===
            "healing_word",
      ),
    ).toBe(false);
    const delivery = acts.find(
      (act) =>
        act.subject.tag === "spawnedCompanionTouchSpellProxy" &&
        battleActSpellPresentation(act)?.invocation.spellId === "cure_wounds",
    );
    expect(delivery?.subject.tag).toBe("spawnedCompanionTouchSpellProxy");
    if (delivery?.subject.tag !== "spawnedCompanionTouchSpellProxy") return;

    const targetHole = requireHole(delivery.initialHoles, "targetChoice");
    const connection = spawnedCompanionConnectionFill(
      requireHole(delivery.initialHoles, "spawnedCompanionConnection"),
    );
    const untouched = resolveBattleSubject({
      state: cast.state,
      subject: delivery.subject,
      fills: [],
    });
    expect(untouched.tag).toBe("needsHoles");
    expect(
      companionRouteForResolution(
        { state: cast.state, subject: delivery.subject, fills: [] },
        untouched,
      ),
    ).toBeUndefined();
    const connectionOnly = resolveBattleSubject({
      state: cast.state,
      subject: delivery.subject,
      fills: [connection],
    });
    expect(connectionOnly.tag).toBe("needsHoles");
    expect(cast.state.combatants.get(familiarId)?.reactionAvailable).toBe(true);
    if (connectionOnly.tag !== "needsHoles") return;
    expect(
      connectionOnly.holes.some((hole) => hole.kind === "targetChoice"),
    ).toBe(true);
    const casterOnlyTargetFill: Extract<
      BattleFill,
      { readonly kind: "targetChoice" }
    > = {
      kind: "targetChoice",
      holeId: targetHole.holeId,
      value: enemyId,
      spatialFacts: [
        {
          kind: "spellTarget",
          casterId,
          targetId: enemyId,
          sourceProcedureRef: delivery.subject.procedureRef,
        },
      ],
    };
    const targetOnly = resolveBattleSubject({
      state: cast.state,
      subject: delivery.subject,
      fills: [casterOnlyTargetFill],
    });
    expect(targetOnly.tag).toBe("needsHoles");
    expect(cast.state.combatants.get(familiarId)?.reactionAvailable).toBe(true);
    if (targetOnly.tag !== "needsHoles") return;
    expect(
      targetOnly.holes.some(
        (hole) => hole.kind === "spawnedCompanionConnection",
      ),
    ).toBe(true);
    const missingFamiliarTargetFact = resolveBattleSubject({
      state: cast.state,
      subject: delivery.subject,
      fills: [connection, casterOnlyTargetFill],
    });
    expect(missingFamiliarTargetFact).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
    expect(
      resolveBattleSubject({
        state: cast.state,
        subject: delivery.subject,
        fills: [
          connection,
          {
            kind: "targetChoice",
            holeId: targetHole.holeId,
            value: enemyId,
          },
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
    const targetFill: Extract<BattleFill, { readonly kind: "targetChoice" }> = {
      kind: "targetChoice",
      holeId: targetHole.holeId,
      value: enemyId,
      spatialFacts: [
        {
          kind: "spawnedCompanionTouchSpellTarget",
          ownerId: casterId,
          familiarId,
          targetId: enemyId,
          sourceProcedureRef: delivery.subject.procedureRef,
        },
      ],
    };
    const awaitingHealingRoll = resolveBattleSubject({
      state: cast.state,
      subject: delivery.subject,
      fills: [connection, targetFill],
    });
    expect(awaitingHealingRoll.tag).toBe("needsHoles");
    if (awaitingHealingRoll.tag !== "needsHoles") return;
    expect(awaitingHealingRoll.subject).toMatchObject(delivery.subject);
    expect(cast.state.combatants.get(familiarId)?.reactionAvailable).toBe(true);
    expect(
      awaitingHealingRoll.state.combatants.get(familiarId)?.reactionAvailable,
    ).toBe(false);

    const healingRoll = damageRollFill(
      requireHole(awaitingHealingRoll.holes, "rolledDice"),
      [4, 4],
    );
    const delivered = resolveBattleSubject({
      state: cast.state,
      subject: delivery.subject,
      fills: [connection, targetFill, healingRoll],
    });
    expect(delivered.tag).toBe("resolved");
    if (delivered.tag !== "resolved") return;
    expect(delivered.state.combatants.get(familiarId)?.reactionAvailable).toBe(
      false,
    );
    expect(
      companionRouteForResolution(
        {
          state: cast.state,
          subject: delivery.subject,
          fills: [connection, targetFill, healingRoll],
        },
        delivered,
      ),
    ).toEqual([
      expect.objectContaining({
        subject: "companionTouchDelivery",
        fill: "rolledDice",
        owner: "battleSpellSlotAndActionEconomy",
      }),
      expect.objectContaining({
        subject: "companionTouchDelivery",
        owner: "battleActionEconomy",
      }),
    ]);
  });

  test("Pact of the Chain forgoes one owner Attack-action attack for a familiar Reaction attack", () => {
    const session = startPactWarlockFixtureBattle();
    const cast = castCatFamiliarAfterCasterTurn(session);
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    expect(cast.state.currentTurnResources.actionResources).toEqual([
      { kind: "action", source: "turn" },
    ]);
    expect(cast.state.combatants.get(familiarId)?.reactionAvailable).toBe(true);
    expect(
      discoverBattleActs(
        battleRuntimeSessionForTest({
          state: cast.state,
          context: session.context,
        }),
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: pactScratchSubject(cast.state),
          initialHoles: [expect.objectContaining({ kind: "targetChoice" })],
        }),
      ]),
    );

    const subject = pactScratchSubject(cast.state);
    const fills = pactScratchFilledAttackFills(cast.state);
    const resolved = resolveBattleSubject({
      state: cast.state,
      subject,
      fills,
    });
    expect(resolved.tag).toBe("resolved");
    if (resolved.tag !== "resolved") return;
    expect(resolved.state.currentTurnResources.actionResources).toEqual([]);
    expect(resolved.state.combatants.get(familiarId)?.reactionAvailable).toBe(
      false,
    );
    expect(Number(resolved.state.combatants.get(enemyId)?.hp)).toBe(11);
    expect(
      companionRouteForResolution(
        { state: cast.state, subject, fills },
        resolved,
      ),
    ).toEqual([
      expect.objectContaining({
        subject: "companionReactionAttack",
        fill: "attackRoll",
        owner: "battleAttackRoll",
      }),
      expect.objectContaining({
        subject: "companionReactionAttack",
        owner: "battleActionEconomy",
      }),
    ]);
  });

  test("Pact of the Chain familiar attack does not inherit owner natural-1 reroll support", () => {
    const cast = castCatFamiliarAfterCasterTurn(
      startPactWarlockFixtureBattle({
        ownerCharacterUnitRefs: [halflingLuckUnitRef()],
        ownerCharacterUnitFeatures: [halflingLuckUnitFeature()],
      }),
    );
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    const subject = pactScratchSubject(cast.state);
    const awaitingTarget = resolveBattleSubject({
      state: cast.state,
      subject,
      fills: [],
    });
    expect(awaitingTarget.tag).toBe("needsHoles");
    if (awaitingTarget.tag !== "needsHoles") return;
    expect(
      companionRouteForResolution(
        { state: cast.state, subject, fills: [] },
        awaitingTarget,
      ),
    ).toEqual([
      expect.objectContaining({
        kind: "resolveBattleSubjectWithoutFill",
        subject: "companionReactionAttack",
        holes: ["targetChoice"],
        owner: "battleStatBlockAction",
      }),
    ]);
    const target = familiarAttackTargetFill(
      requireHole(awaitingTarget.holes, "targetChoice"),
    );
    const awaitingAttackRoll = resolveBattleSubject({
      state: cast.state,
      subject,
      fills: [target],
    });
    expect(awaitingAttackRoll.tag).toBe("needsHoles");
    if (awaitingAttackRoll.tag !== "needsHoles") return;
    expect(
      companionRouteForResolution(
        { state: cast.state, subject, fills: [target] },
        awaitingAttackRoll,
      ),
    ).toEqual([
      expect.objectContaining({
        subject: "companionReactionAttack",
        fill: "targetChoice",
        holes: ["attackRoll"],
        owner: "battleTargetSelection",
      }),
    ]);
    const attackRoll = requireHole(awaitingAttackRoll.holes, "attackRoll");

    const naturalOneWithoutDecision = resolveBattleSubject({
      state: cast.state,
      subject,
      fills: [target, attackRollFill(attackRoll, { total: 5, naturalD20: 1 })],
    });
    expect(naturalOneWithoutDecision).toMatchObject({ tag: "resolved" });

    const attemptedOwnerReroll = resolveBattleSubject({
      state: cast.state,
      subject,
      fills: [
        target,
        {
          kind: "attackRoll",
          holeId: attackRoll.holeId,
          value: {
            total: 5,
            naturalD20: DieRollResult(1),
            d20TestNaturalOneReroll: {
              kind: "reroll",
              effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
              replacement: {
                total: 18,
                naturalD20: DieRollResult(15),
              },
            },
          },
        },
      ],
    });
    expect(attemptedOwnerReroll).toMatchObject({
      tag: "invalid",
      message: D20_TEST_NATURAL_ONE_REROLL_UNAVAILABLE_MESSAGE,
    });
  });

  test("Pact of the Chain familiar attack resumes through attack-hit reactions with Pact spending", () => {
    const cast = castCatFamiliarAfterCasterTurn(
      startPactWarlockFixtureBattle({ targetHasShield: true }),
    );
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    const subject = pactScratchSubject(cast.state);
    const awaitingTarget = resolveBattleSubject({
      state: cast.state,
      subject,
      fills: [],
    });
    expect(awaitingTarget.tag).toBe("needsHoles");
    if (awaitingTarget.tag !== "needsHoles") return;
    const target = familiarAttackTargetFill(
      requireHole(awaitingTarget.holes, "targetChoice"),
    );
    const awaitingAttackRoll = resolveBattleSubject({
      state: cast.state,
      subject,
      fills: [target],
    });
    expect(awaitingAttackRoll.tag).toBe("needsHoles");
    if (awaitingAttackRoll.tag !== "needsHoles") return;
    const attackRoll = attackRollFill(
      requireHole(awaitingAttackRoll.holes, "attackRoll"),
      { naturalD20: 10, total: 14 },
    );

    const awaitingReaction = resolveBattleSubject({
      state: cast.state,
      subject,
      fills: [target, attackRoll],
    });
    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
    });
    if (awaitingReaction.tag !== "needsHoles") return;
    expect(
      companionRouteForResolution(
        { state: cast.state, subject, fills: [target, attackRoll] },
        awaitingReaction,
      ),
    ).toEqual([
      expect.objectContaining({
        subject: "companionReactionAttack",
        fill: "attackRoll",
        holes: ["interruptDecision"],
        owner: "battleAttackRoll",
      }),
    ]);
    const shieldChoice = battleFrontierInterruptDecisionForState(
      awaitingReaction.state,
    )?.choices.find(isTriggeredReactionSpellChoice);
    expect(shieldChoice).toMatchObject({
      kind: "nestedProcedure",
      subject: {
        tag: "runtimeCommand",
        command: "castTriggeredReactionSpell",
        reactorId: enemyId,
      },
    });
    if (shieldChoice === undefined) {
      throw new Error("Expected Shield Reaction choice.");
    }

    const resolved = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: enemyId,
          choice: {
            kind: "castTriggeredReactionSpell",
            procedureRef: shieldChoice.subject.procedureRef,
            fills: [],
          },
        },
      ),
    });
    expect(resolved).toMatchObject({
      tag: "resolved",
    });
    if (resolved.tag !== "resolved") return;
    expect(resolved.state.currentTurnResources.actionResources).toEqual([]);
    expect(resolved.state.combatants.get(familiarId)?.reactionAvailable).toBe(
      false,
    );
    expect(resolved.state.combatants.get(enemyId)?.reactionAvailable).toBe(
      false,
    );
    expect(Number(resolved.state.combatants.get(enemyId)?.hp)).toBe(12);
  });

  test("Pact of the Chain familiar attack rejects missing owner Attack-action attacks without spending the familiar Reaction", () => {
    const cast = castCatFamiliarAfterCasterTurn(
      startPactWarlockFixtureBattle(),
    );
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const withoutOwnerAttack = {
      ...cast.state,
      currentTurnResources: {
        ...cast.state.currentTurnResources,
        actionResources: [],
      },
    };

    const blocked = resolveBattleSubject({
      state: withoutOwnerAttack,
      subject: pactScratchSubject(withoutOwnerAttack),
      fills: pactScratchFilledAttackFills(cast.state),
    });

    expect(blocked.tag).toBe("invalid");
    if (blocked.tag !== "invalid") return;
    expect(blocked.reason).toBe("staleSubject");
    expect(
      withoutOwnerAttack.combatants.get(familiarId)?.reactionAvailable,
    ).toBe(true);
  });

  test("Pact of the Chain familiar attack uses dispatcher action eligibility and interrupt gates", () => {
    const cast = castCatFamiliarAfterCasterTurn(
      startPactWarlockFixtureBattle(),
    );
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const owner = cast.state.combatants.get(casterId);
    if (owner === undefined) {
      throw new Error("Expected Pact owner combatant.");
    }
    const unableToAct = applyBattleHitPointDamage({
      saveGatedConditionDamageRepeatSave: { kind: "noRepeatSave" },
      state: cast.state,
      target: owner,
      damageAmount: Number(owner.hp),
      deathFailuresAtZeroHp: 1,
    });

    const blockedByActionEligibility = resolveBattleSubject({
      state: unableToAct,
      subject: pactScratchSubject(unableToAct),
      fills: [],
    });
    expect(blockedByActionEligibility).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });

    const shieldCast = castCatFamiliarAfterCasterTurn(
      startPactWarlockFixtureBattle({ targetHasShield: true }),
    );
    expect(shieldCast.tag).toBe("resolved");
    if (shieldCast.tag !== "resolved") return;
    const subject = pactScratchSubject(shieldCast.state);
    const awaitingTarget = resolveBattleSubject({
      state: shieldCast.state,
      subject,
      fills: [],
    });
    if (awaitingTarget.tag !== "needsHoles") {
      throw new Error("Expected Pact attack target hole.");
    }
    const target = familiarAttackTargetFill(
      requireHole(awaitingTarget.holes, "targetChoice"),
    );
    const awaitingAttackRoll = resolveBattleSubject({
      state: shieldCast.state,
      subject,
      fills: [target],
    });
    if (awaitingAttackRoll.tag !== "needsHoles") {
      throw new Error("Expected Pact attack roll hole.");
    }
    const awaitingReaction = resolveBattleSubject({
      state: shieldCast.state,
      subject,
      fills: [
        target,
        attackRollFill(requireHole(awaitingAttackRoll.holes, "attackRoll"), {
          naturalD20: 10,
          total: 14,
        }),
      ],
    });
    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
    });
    if (awaitingReaction.tag !== "needsHoles") return;
    const blockedByInterrupt = resolveBattleSubject({
      state: awaitingReaction.state,
      subject: pactScratchSubject(awaitingReaction.state),
      fills: [],
    });
    expect(blockedByInterrupt).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
    expect(
      awaitingReaction.state.combatants.get(familiarId)?.reactionAvailable,
    ).toBe(true);
  });

  test("Pact of the Chain familiar attack rejects non-Pact owners and unavailable familiar Reactions", () => {
    const nonPactCast = castCatFamiliarAfterCasterTurn(
      startFixtureBattle({ includeEnemy: true }),
    );
    expect(nonPactCast.tag).toBe("resolved");
    if (nonPactCast.tag !== "resolved") return;

    const nonPactAttack = resolveBattleSubject({
      state: nonPactCast.state,
      subject: pactScratchSubject(nonPactCast.state),
      fills: [],
    });
    expect(nonPactAttack.tag).toBe("invalid");
    if (nonPactAttack.tag !== "invalid") return;
    expect(nonPactAttack.reason).toBe("unsupportedActOption");
    expect(
      nonPactCast.state.combatants.get(familiarId)?.reactionAvailable,
    ).toBe(true);

    const pactCast = castCatFamiliarAfterCasterTurn(
      startPactWarlockFixtureBattle(),
    );
    expect(pactCast.tag).toBe("resolved");
    if (pactCast.tag !== "resolved") return;
    const withoutReaction = {
      ...pactCast.state,
      combatants: new Map(pactCast.state.combatants).set(familiarId, {
        ...pactCast.state.combatants.get(familiarId)!,
        reactionAvailable: false,
      }),
    };
    const blocked = resolveBattleSubject({
      state: withoutReaction,
      subject: pactScratchSubject(withoutReaction),
      fills: [],
    });
    expect(blocked.tag).toBe("invalid");
    if (blocked.tag !== "invalid") return;
    expect(blocked.reason).toBe("staleSubject");
    expect(withoutReaction.currentTurnResources.actionResources).toEqual([
      { kind: "action", source: "turn" },
    ]);
  });

  test("Pact familiar fixed damage exposes only the executable static projection", () => {
    const session = startPactWarlockFixtureBattle();
    const cast = castCatFamiliarAfterCasterTurn(session);
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    assertBattleSnapshotCodecRoundTripForTest(snapshotBattle(cast.state));
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(BattleCheckpointFrontierEnvelopeSchema)(
          Schema.encodeSync(BattleCheckpointFrontierEnvelopeSchema)(
            battleCheckpointFrontierEnvelope(cast.state),
          ),
        ),
      ),
    ).toBe(true);
    const caster = cast.state.combatants.get(casterId);
    if (caster?.origin.kind !== "character") {
      throw new Error("Expected the Pact familiar owner character.");
    }
    expect(() =>
      snapshotBattle({
        ...cast.state,
        combatants: new Map(cast.state.combatants).set(familiarId, {
          ...caster,
          combatantId: familiarId,
        }),
      }),
    ).toThrow(
      "Present spawned-companion snapshot requires a Stat Block combatant.",
    );
    const attackActs = discoverBattleActs(
      battleRuntimeSessionForTest({
        state: cast.state,
        context: session.context,
      }),
    ).filter((act) => act.subject.tag === "companionAttack");
    const scratchProcedureRef = pactScratchSubject(cast.state).procedureRef;
    const rolledScratchSubject = attackActs.find(
      (act) =>
        act.subject.tag === "companionAttack" &&
        act.subject.procedureRef === scratchProcedureRef &&
        statBlockAttackDamageSelectionUsesOnlyComponentNotation(
          act.subject.statBlockDamageSelection,
          "rolled",
        ),
    )?.subject;
    const staticSubject = attackActs.find(
      (act) =>
        act.subject.tag === "companionAttack" &&
        act.subject.procedureRef === scratchProcedureRef &&
        statBlockAttackDamageSelectionUsesOnlyComponentNotation(
          act.subject.statBlockDamageSelection,
          "static",
        ),
    )?.subject;
    expect(rolledScratchSubject).toBeUndefined();
    if (staticSubject?.tag !== "companionAttack") {
      throw new Error("Expected the static Pact familiar Scratch act.");
    }
    const resolveHit = (subject: typeof staticSubject) => {
      const awaitingTarget = resolveBattleSubject({
        state: cast.state,
        subject,
        fills: [],
      });
      if (awaitingTarget.tag !== "needsHoles") {
        throw new Error("Expected Pact familiar target choice.");
      }
      const target = familiarAttackTargetFill(
        requireHole(awaitingTarget.holes, "targetChoice"),
      );
      const awaitingRoll = resolveBattleSubject({
        state: cast.state,
        subject,
        fills: [target],
      });
      if (awaitingRoll.tag !== "needsHoles") {
        throw new Error("Expected Pact familiar attack roll.");
      }
      const attackRoll = attackRollFill(
        requireHole(awaitingRoll.holes, "attackRoll"),
        { naturalD20: 10, total: 14 },
      );
      return resolveBattleSubject({
        state: cast.state,
        subject,
        fills: [target, attackRoll],
      });
    };

    expect(resolveHit(staticSubject).tag).toBe("resolved");
  });

  test("Pact familiar attack rejects an unbound procedure ref", () => {
    const cast = castCatFamiliarAfterCasterTurn(
      startPactWarlockFixtureBattle(),
    );
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    const familiar = cast.state.combatants.get(familiarId);
    if (familiar?.origin.kind !== "statBlock") {
      throw new Error("Expected the committed familiar Stat Block admission.");
    }
    const unboundProcedureRef = battleStatBlockProcedureExecutionRef(
      familiar.origin.execution.scopeRef,
      NonNegativeInteger(999),
    );
    expect(
      familiar.origin.execution.procedureBindings.some(
        (binding) => binding.procedureRef === unboundProcedureRef,
      ),
    ).toBe(false);
    const blocked = resolveBattleSubject({
      state: cast.state,
      subject: {
        ...pactScratchSubject(cast.state),
        procedureRef: unboundProcedureRef,
      },
      fills: [],
    });

    expect(blocked).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
    });
  });

  test("Pact of the Chain familiar attack rejects and hides familiars that cannot take Reactions", () => {
    const session = startPactWarlockFixtureBattle();
    const pactCast = castCatFamiliarAfterCasterTurn(session);
    expect(pactCast.tag).toBe("resolved");
    if (pactCast.tag !== "resolved") return;
    const familiar = pactCast.state.combatants.get(familiarId);
    if (familiar === undefined) {
      throw new Error("Expected present familiar combatant.");
    }
    const unableToReact = {
      ...pactCast.state,
      combatants: new Map(pactCast.state.combatants).set(familiarId, {
        ...testBattleCreatureStateWithConditions(
          familiar,
          applyCondition(familiar.conditions, "incapacitated"),
        ),
        reactionAvailable: true,
      }),
    };

    expect(
      discoverBattleActs(
        battleRuntimeSessionForTest({
          state: unableToReact,
          context: session.context,
        }),
      ).some((act) => act.subject.tag === "companionAttack"),
    ).toBe(false);

    const blocked = resolveBattleSubject({
      state: unableToReact,
      subject: pactScratchSubject(unableToReact),
      fills: [],
    });
    expect(blocked).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    expect(unableToReact.currentTurnResources.actionResources).toEqual([
      { kind: "action", source: "turn" },
    ]);
    expect(unableToReact.combatants.get(familiarId)?.reactionAvailable).toBe(
      true,
    );
  });

  test("Pact of the Chain familiar attack rejects familiars owned by another present caster", () => {
    const cast = castCatFamiliarAfterCasterTurn(
      startWrongOwnerPactFixtureBattle(),
    );
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    const wrongOwner = resolveBattleSubject({
      state: cast.state,
      subject: pactScratchSubject(cast.state, otherCombatantId),
      fills: [],
    });

    expect(wrongOwner.tag).toBe("invalid");
    if (wrongOwner.tag !== "invalid") return;
    expect(wrongOwner.reason).toBe("unsupportedActOption");
    expect(cast.state.combatants.get(familiarId)?.reactionAvailable).toBe(true);
  });

  test("snapshot schema encodes and rejects invalid familiar snapshots", () => {
    const cast = castCatFamiliar(startFixtureBattle());
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    const encoded = Schema.encodeSync(BattleSnapshotSchema)(cast.snapshot);
    const encodedFamiliar = encoded.combatants.find(
      (combatant) => combatant.combatantId === familiarId,
    );
    expect(encodedFamiliar).not.toHaveProperty("displayName");
    expect(encoded.companions).toEqual([
      {
        status: "present",
        ownerId: casterId,
        companionId: familiarId,
        identity: { tag: "battleOnly" },
        protocol: { tag: "ordinaryFamiliarLikeOneAtATime" },
        formAccess: "spawnedCompanion",
        resolvedStatBlockId: "stat_block_cat",
        creatureTypeOverride: firstTypeOverride.creatureType,
        initiative: 18,
        placement: { kind: "unoccupiedSpaceWithinSpellRange" },
      },
    ]);

    const decoded = Schema.decodeUnknownResult(BattleSnapshotSchema)(encoded);
    expect(Result.isSuccess(decoded)).toBe(true);
    const authoredNameInMechanicalSnapshot = Schema.decodeUnknownResult(
      BattleSnapshotSchema,
    )({
      ...encoded,
      combatants: encoded.combatants.map((combatant) =>
        combatant.combatantId === familiarId
          ? { ...combatant, displayName: "Cat" }
          : combatant,
      ),
    });
    expect(Result.isFailure(authoredNameInMechanicalSnapshot)).toBe(true);
    const invalid = Schema.decodeUnknownResult(BattleSnapshotSchema)({
      ...encoded,
      companions: [{ status: "present" }],
    });
    expect(Result.isFailure(invalid)).toBe(true);
    const invalidEmptyResolvedStatBlockId = Schema.decodeUnknownResult(
      BattleSnapshotSchema,
    )({
      ...encoded,
      companions: [
        {
          ...encoded.companions[0],
          resolvedStatBlockId: " ",
        },
      ],
    });
    expect(Result.isFailure(invalidEmptyResolvedStatBlockId)).toBe(true);
    const dismissedAtZeroHp = Schema.decodeUnknownResult(BattleSnapshotSchema)({
      ...encoded,
      companions: [
        {
          status: "temporarilyDismissed",
          companionId: familiarId,
          ownerId: casterId,
          identity: { tag: "battleOnly" },
          protocol: { tag: "ordinaryFamiliarLikeOneAtATime" },
          reappearanceCombatantId: familiarId,
          formAccess: "spawnedCompanion",
          resolvedStatBlockId: "stat_block_cat",
          creatureTypeOverride: firstTypeOverride.creatureType,
          hitPoints: { currentHp: 0, tempHp: 0 },
        },
      ],
    });
    expect(Result.isFailure(dismissedAtZeroHp)).toBe(true);
  });

  test("reappearance admission reports missing retained forms", () => {
    const cast = castCatFamiliar(startFixtureBattle());
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const dismissed = temporarilyDismissSpawnedCompanion({
      state: cast.state,
      casterId,
    });
    expect(dismissed.tag).toBe("resolved");
    if (dismissed.tag !== "resolved") return;

    const missing = admitSpawnedCompanionReappearance({
      state: dismissed.state,
      casterId,
      catalog: { getStatBlock: () => Option.none() },
    });
    expect(missing).toEqual(
      Result.fail({
        tag: "companionReappearanceAdmissionIssue",
        message:
          "Retained familiar form Stat Block is missing: stat_block_cat.",
      }),
    );
  });

  test("recasts a permanently dismissed battle-only familiar", () => {
    const cast = castCatFamiliar(startFixtureBattle());
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const dismissed = permanentlyDismissSpawnedCompanion({
      state: withFreshMagicAction(cast.state),
      casterId,
    });
    expect(dismissed.tag).toBe("resolved");
    if (dismissed.tag !== "resolved") return;
    expect(spawnedCompanionForOwner(dismissed.state, casterId)).toMatchObject({
      status: "dismissedForever",
    });
    expect(dismissed.state.combatants.has(familiarId)).toBe(false);

    const recast = castCatFamiliar(dismissed.state);
    expect(recast.tag).toBe("resolved");
    if (recast.tag !== "resolved") return;
    expect(spawnedCompanionForOwner(recast.state, casterId)).toMatchObject({
      status: "present",
      combatantId: familiarId,
    });
  });

  test("embodied companion admission rejects an ordinary combatant identity", () => {
    const initial = startFixtureBattle({ includeEnemy: true });
    const admitted = admitCompanionToBattle({
      state: initial,
      ownerId: casterId,
      companionId: enemyId,
      identity: {
        tag: "retainedBetweenBattles",
        durableCompanionId: "durable:embodied-ordinary-combatant",
      },
      protocol: { tag: "ordinaryFamiliarLikeOneAtATime" },
      catalog: statBlockCatalog,
      formEligibility: {
        formAccess: "spawnedCompanion",
        eligibility: familiarEligibility,
      },
      manifestation: {
        tag: "embodiedOutsideBattle",
        storedForm: {
          formAccess: "spawnedCompanion",
          formSelection: { tag: "normalNamedForm", formId: "cat" },
          resolvedStatBlockId: parseSharedStatBlockId("stat_block_cat"),
        },
        creatureTypeOverride: firstTypeOverride.creatureType,
        hitPoints: { currentHp: positiveCompanionHp(1), tempHp: Hp(0) },
        ammunitionStocks: [],
        initiative: initiativeScore(11),
        placement: { kind: "unoccupiedSpaceWithinSpellRange" },
      },
      initialCombatantOrder: initialCombatantOrder(casterId, enemyId),
    });

    expect(admitted).toEqual(
      Result.fail({
        tag: "battleStateInitIssue",
        kind: "duplicateCombatantId",
        combatantId: enemyId,
        message: "Companion identity must not identify an ordinary combatant.",
      }),
    );
  });

  test("Wild Companion preserves unrelated resources while spending Wild Shape", () => {
    const session = startWildCompanionDruidFixtureBattle({
      wildShapeUsesRemaining: 2,
      includeSecondaryResource: true,
    });
    const wildShapeResourcePoolRef =
      wildShapeResourcePoolRefForFixture(session);
    const cast = castWildCompanion({
      state: session.state,
      casterId,
      ammunitionStocks: [],
      catalog: statBlockCatalog,
      eligibility: familiarEligibility,
      selection: { tag: "normalNamedForm", formId: "owl" },
      spend: {
        kind: "wildShapeUse",
        resourcePoolRef: wildShapeResourcePoolRef,
      },
      familiarId,
      initiative: initiativeScore(18),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });

    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const druid = cast.state.combatants.get(casterId);
    expect(druid?.origin.kind).toBe("character");
    if (druid?.origin.kind !== "character") return;
    const ownership =
      session.context.characters.get(casterId)?.resourceOwnership;
    expect(ownership).toBeDefined();
    if (ownership === undefined) return;
    const wildShapeOwnership = ownership.find(
      (candidate) => candidate.unit.id === "druid_wild_shape",
    );
    const orcOwnership = ownership.find(
      (candidate) => candidate.unit.id === "orc_adrenaline_rush",
    );
    expect(wildShapeOwnership?.resourcePoolRef).toBe(wildShapeResourcePoolRef);
    expect(orcOwnership).toBeDefined();
    if (wildShapeOwnership === undefined || orcOwnership === undefined) return;
    expect(wildShapeOwnership.resourcePoolRef).not.toBe(
      orcOwnership.resourcePoolRef,
    );
    expect(druid.origin.resources).toHaveLength(2);
    expect(druid.origin.resources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourcePoolRef: wildShapeOwnership.resourcePoolRef,
          usesRemaining: 1,
        }),
        expect.objectContaining({
          resourcePoolRef: orcOwnership.resourcePoolRef,
          usesRemaining: 1,
        }),
      ]),
    );
  });

  test("touch delivery rejects a stale committed Reaction and does not spend it twice", () => {
    const session = startSpellcasterFixtureBattle();
    const cast = castCatFamiliar(session);
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const cureWoundsAct = discoverBattleActs(
      battleRuntimeSessionForTest({ ...session, state: cast.state }),
    ).find(
      (act) =>
        act.subject.tag === "actionSpell" &&
        battleActSpellPresentation(act)?.invocation.spellId === "cure_wounds",
    );
    expect(cureWoundsAct?.subject.tag).toBe("actionSpell");
    if (cureWoundsAct?.subject.tag !== "actionSpell") return;
    const targetFill = {
      kind: "targetChoice" as const,
      holeId: ATTACK_TARGET_HOLE_ID,
      value: enemyId,
      spatialFacts: [
        {
          kind: "spawnedCompanionTouchSpellTarget" as const,
          ownerId: casterId,
          familiarId,
          targetId: enemyId,
          sourceProcedureRef: cureWoundsAct.subject.procedureRef,
        },
      ],
    };
    const staleCommitted =
      deliverTouchSpellThroughSpawnedCompanionWithExecution(
        {
          state: cast.state,
          subject: cureWoundsAct.subject,
          fills: [targetFill],
          fact: {
            kind: "companionWithinCommunicationRangeOfOwner",
            ownerId: casterId,
            familiarId,
          },
          reactionContinuation: {
            subject: cureWoundsAct.subject,
            fills: [targetFill],
          },
        },
        CompanionLifecycleProcedureExecution.fromResolver(() => {
          throw new Error(
            "Committed stale delivery must not resolve the spell.",
          );
        }),
        "committed",
      );
    expect(staleCommitted).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Companion touch delivery continuation requires its committed Reaction.",
    });

    const firstDelivery = deliverTouchSpellThroughSpawnedCompanion({
      state: cast.state,
      subject: cureWoundsAct.subject,
      fills: [targetFill],
      fact: {
        kind: "companionWithinCommunicationRangeOfOwner",
        ownerId: casterId,
        familiarId,
      },
    });
    expect(firstDelivery.tag).toBe("needsHoles");
    if (firstDelivery.tag !== "needsHoles") return;
    expect(
      spendSpawnedCompanionTouchDeliveryReaction({
        state: firstDelivery.state,
        familiarId,
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Companion touch delivery requires the familiar's available Reaction at completion.",
    });
  });

  test("touch procedure rejects a resolved spell when its target fill is missing", () => {
    const session = startSpellcasterFixtureBattle();
    const cast = castCatFamiliar(session);
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const cureWoundsAct = discoverBattleActs(
      battleRuntimeSessionForTest({ ...session, state: cast.state }),
    ).find(
      (act) =>
        act.subject.tag === "actionSpell" &&
        battleActSpellPresentation(act)?.invocation.spellId === "cure_wounds",
    );
    expect(cureWoundsAct?.subject.tag).toBe("actionSpell");
    if (cureWoundsAct?.subject.tag !== "actionSpell") return;
    const result = deliverTouchSpellThroughSpawnedCompanionWithExecution(
      {
        state: cast.state,
        subject: cureWoundsAct.subject,
        fills: [],
        fact: {
          kind: "companionWithinCommunicationRangeOfOwner",
          ownerId: casterId,
          familiarId,
        },
        reactionContinuation: {
          subject: cureWoundsAct.subject,
          fills: [],
        },
      },
      CompanionLifecycleProcedureExecution.fromResolver((admitted) => ({
        tag: "resolved",
        state: admitted.state,
        snapshot: snapshotBattle(admitted.state),
      })),
      "uncommitted",
    );
    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Companion touch delivery currently supports exactly one selected target choice.",
    });
  });

  test("companion routes project lifecycle, unsupported, and rolled Pact fills", () => {
    const cast = castCatFamiliar(startFixtureBattle());
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const lifecycleSubject = {
      tag: "companionLifecycle" as const,
      actorId: casterId,
      action: "permanentlyDismiss" as const,
    };
    const dismissed = permanentlyDismissSpawnedCompanion({
      state: withFreshMagicAction(cast.state),
      casterId,
    });
    expect(dismissed.tag).toBe("resolved");
    if (dismissed.tag !== "resolved") return;
    expect(
      companionRouteForResolution(
        { state: cast.state, subject: lifecycleSubject, fills: [] },
        dismissed,
      ),
    ).toEqual([
      expect.objectContaining({
        subject: "companionLifecycle",
        holes: [],
        owner: "battleCompanion",
      }),
    ]);

    const tempCast = castCatFamiliar(startFixtureBattle());
    expect(tempCast.tag).toBe("resolved");
    if (tempCast.tag !== "resolved") return;
    const tempAct = discoverBattleActs(
      battleRuntimeSessionForTest({
        state: tempCast.state,
        context: emptyBattleRuntimeContext(),
      }),
    ).find(
      (act) =>
        act.subject.tag === "companionLifecycle" &&
        act.subject.action === "temporarilyDismiss",
    );
    expect(tempAct?.subject.tag).toBe("companionLifecycle");
    if (tempAct?.subject.tag !== "companionLifecycle") return;
    const heldObjects = heldObjectFactsFill(
      requireHole(tempAct.initialHoles, "heldObjectFacts"),
    );
    const pactCatCast = castCatFamiliarAfterCasterTurn(
      startPactWarlockFixtureBattle(),
    );
    expect(pactCatCast.tag).toBe("resolved");
    if (pactCatCast.tag !== "resolved") return;
    const pactSubject = pactScratchSubject(pactCatCast.state);
    const pactFrontier = resolveBattleSubject({
      state: pactCatCast.state,
      subject: pactSubject,
      fills: [],
    });
    expect(pactFrontier.tag).toBe("needsHoles");
    if (pactFrontier.tag !== "needsHoles") return;
    expect(
      companionRouteForResolution(
        {
          state: pactCatCast.state,
          subject: pactSubject,
          fills: [heldObjects],
        },
        pactFrontier,
      ),
    ).toBeUndefined();

    const pactSession = startPactWarlockFixtureBattle();
    const pactForm = resolvePactOfTheChainSpawnedCompanionForm({
      catalog: statBlockCatalog,
      eligibility: pactFamiliarEligibility,
      selection: { tag: "pactOfTheChainSpecialForm", formId: "imp" },
      creatureTypeOverrideChoiceId: firstTypeOverride.optionId,
    });
    expect(pactForm.tag).toBe("resolved");
    if (pactForm.tag !== "resolved") return;
    const impCast = castResolvedSpawnedCompanion({
      state: pactSession.state,
      casterId,
      familiarId,
      ammunitionStocks: [],
      resolvedForm: pactForm.form,
      retainedTransition: "reject",
      initiative: initiativeScore(11),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });
    expect(impCast.tag).toBe("resolved");
    if (impCast.tag !== "resolved") return;
    const discoveredPactAttack = discoverBattleActs(
      battleRuntimeSessionForTest({
        state: impCast.state,
        context: pactSession.context,
      }),
    ).find(
      (act) =>
        act.subject.tag === "companionAttack" &&
        act.subject.statBlockDamageSelection.length > 0,
    );
    expect(discoveredPactAttack?.subject.tag).toBe("companionAttack");
    if (discoveredPactAttack?.subject.tag !== "companionAttack") {
      return;
    }
    const subject = discoveredPactAttack.subject;
    const awaitingTarget = resolveBattleSubject({
      state: impCast.state,
      subject,
      fills: [],
    });
    expect(awaitingTarget.tag).toBe("needsHoles");
    if (awaitingTarget.tag !== "needsHoles") return;
    const target = familiarAttackTargetFill(
      requireHole(awaitingTarget.holes, "targetChoice"),
    );
    const awaitingAttackRoll = resolveBattleSubject({
      state: impCast.state,
      subject,
      fills: [target],
    });
    expect(awaitingAttackRoll.tag).toBe("needsHoles");
    if (awaitingAttackRoll.tag !== "needsHoles") return;
    const attackRoll = attackRollFill(
      requireHole(awaitingAttackRoll.holes, "attackRoll"),
      { naturalD20: 19, total: 24 },
    );
    const awaitingDamage = resolveBattleSubject({
      state: impCast.state,
      subject,
      fills: [target, attackRoll],
    });
    expect(awaitingDamage.tag).toBe("needsHoles");
    if (awaitingDamage.tag !== "needsHoles") return;
    const damageHole = requireHole(awaitingDamage.holes, "rolledDice");
    const damage = {
      kind: "rolledDice" as const,
      holeId: damageHole.holeId,
      value: [
        { results: [DieRollResult(1)] },
        { results: [DieRollResult(1), DieRollResult(1)] },
      ],
    } satisfies Extract<BattleFill, { readonly kind: "rolledDice" }>;
    const resolved = resolveBattleSubject({
      state: impCast.state,
      subject,
      fills: [target, attackRoll, damage],
    });
    expect(resolved.tag).toBe("resolved");
    if (resolved.tag !== "resolved") return;
    expect(Number(resolved.state.combatants.get(enemyId)?.hp)).toBe(6);
    expect(resolved.state.combatants.get(familiarId)?.reactionAvailable).toBe(
      false,
    );
    expect(resolved.state.currentTurnResources.actionResources).toEqual([]);
    expect(
      companionRouteForResolution(
        { state: impCast.state, subject, fills: [target, attackRoll, damage] },
        resolved,
      ),
    ).toEqual([
      expect.objectContaining({
        subject: "companionReactionAttack",
        fill: "rolledDice",
        owner: "battleHitPoint",
      }),
      expect.objectContaining({
        subject: "companionReactionAttack",
        owner: "battleActionEconomy",
      }),
    ]);
  });

  test("snapshot projects familiar owner and companion identity from companion state", () => {
    const cast = castCatFamiliar(startFixtureBattle());
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const familiarEntry = spawnedCompanionEntryForOwner(cast.state, casterId);
    expect(familiarEntry).not.toBeNull();
    if (familiarEntry === null) return;
    if (familiarEntry.companion.status !== "present") {
      throw new Error("Expected present familiar after cast.");
    }

    expect(snapshotBattle(cast.state).companions).toMatchObject([
      { ownerId: casterId, companionId: familiarEntry.companion.combatantId },
    ]);
  });
});
