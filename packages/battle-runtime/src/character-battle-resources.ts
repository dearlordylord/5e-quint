import {
  AbilityModifier,
  NonNegativeInteger,
  ResourceCount,
  SpellSlotLevel,
  abilityModifier,
  characterLevel,
  proficiencyBonusForCharacterLevel,
  resourceCount,
  spellSlotLevel,
  type ProficiencyBonus,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import { Brand, Match, Result } from "effect";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL_ACCESS.MAGIC_INITIATE_CASTING
// UNIT-PROFILE-COVERAGE: runtime-owner battle.spell-access-magic-initiate-casting
import { zeroHitPointReplacementUnitProfile } from "@dnd/shared-algebras/zero-hit-point-replacement-algebra";
import type {
  ActivationResource,
  ClassFeatureRecord,
  ClassName,
  EffectAtom,
  PointPoolResource,
  SpellRecord,
  SpawnedCreatureMechanics,
  UnitRecord,
} from "@dnd/surface/surface/types";
import {
  spellHasTopLevelRitualTag,
  supportedClassFeatureSpellFreeCastGrantsForUnit,
  topLevelSpellCastingTime,
  type SupportedClassFeatureSpellFreeCastProfile,
} from "@dnd/surface/surface/types";
import {
  type CharacterBattleClassLevel,
  type CharacterBattleClassLevels,
  characterBattleLevel,
} from "./character-class-level.ts";
export {
  parseCharacterBattleClassLevels,
  type CharacterBattleClassLevelsIssue,
} from "./character-class-level.ts";
import {
  battleBardicInspirationGrantSupportForUnit,
  battleReactionRollOrDamageReductionSupportForUnit,
  bonusActionDashTemporaryHitPointsProfileForUnit,
  requireCharacterClassLevel,
  parseSupportedUnitFeatureProfile,
  unitHasAttackActionAreaSaveDamageReplacementResourceShape,
  type BattleUnitSupportProfile,
  type BattleUnitSupportProfileSourceFacts,
  type BattleUnitSupportProfileIssue,
  type BattleUnitSupportSource,
  type SupportedUnitFeatureFacts,
  type SupportedUnitFeatureProfile,
} from "./unit-feature-support.ts";
import {
  pactOfTheChainSpawnedCompanionFormEligibilityForSpell,
  type PactOfTheChainSpawnedCompanionFormEligibility,
} from "@dnd/surface/surface/find-familiar-forms";
import {
  battleResourcePoolExecutionRef,
  battleSpellAccessExecutionRef,
  type BattleCharacterExecutionScopeRef,
  type BattleResourcePoolExecutionRef,
  type BattleSpellAccessExecutionRef,
} from "./identity.ts";
import {
  admitPersistentArmorEffectSpell,
  type PersistentArmorEffectAdmission,
} from "./procedure-admission/persistent-armor-effect-facts.ts";
import {
  admitResourceFeature,
  resourceFeatureExecutionFacts,
  type AdmittedResourceFeature,
  type UnboundResourceFeatureProcedure,
} from "./procedure-admission/resource-feature-admission.ts";
import {
  type CharacterBattleActivationResource,
  type CharacterBattleMetamagicOptionFact,
  type CharacterBattleMetamagicState,
  type CharacterBattleResourceExecutionFacts,
  type CharacterBattleResourceState,
  type LimitedUseCountActivationResource,
  type SupportedPointPoolResource,
  type UnlimitedActivationResource,
} from "./character-battle-resource-execution.ts";
import type { BattleSpellAdmissionSource } from "./battle-state-execution.ts";
import { projectSpellDefinitionRuleFacts } from "./procedure-admission/spell-definition-rule-facts.ts";
import { readMagicInitiateSpellAccessSourceFacts } from "@dnd/surface/surface/character-creation-readers";
export {
  characterBattleResourceIsPointPool,
  characterBattleResourceIsUnlimited,
  characterBattleResourceIsUseCount,
  characterBattleResourceUsage,
  spendCharacterPointPoolResource,
  spendCharacterResourceUse,
  type CharacterBattlePointPoolSpendIssue,
  type CharacterBattlePointPoolResourceState,
  type CharacterBattleMetamagicEffectKind,
  type CharacterBattleMetamagicOptionFact,
  type CharacterBattleMetamagicState,
  type CharacterBattleResourceExecutionFacts,
  type CharacterBattleResourceState,
  type CharacterBattleUseCountResourceState,
  type CharacterBattleUseCountResourceStateBase,
} from "./character-battle-resource-execution.ts";

// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.attack-action-area-save-damage-replacement unit-feature.magic-action-healing-pool
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.metamagic-battle-resource-bridge unit-feature.failed-saving-throw-reroll unit-feature.paladin-sacred-weapon

export { SORCERER_METAMAGIC_EFFECT_KINDS as CHARACTER_BATTLE_METAMAGIC_EFFECT_KINDS } from "@dnd/surface/surface/schema";

export type CharacterBattleUseCountResourceInit = {
  readonly unit: UnitRecord;
  readonly spellAccessFreeCast?: never;
  readonly usesRemaining?: number;
  readonly capAbilityModifier?: AbilityModifier;
  readonly pointsRemaining?: never;
};

export type CharacterBattlePointPoolResourceInit = {
  readonly unit: UnitRecord;
  readonly spellAccessFreeCast?: never;
  readonly pointsRemaining?: number;
  readonly usesRemaining?: never;
  readonly capAbilityModifier?: never;
};

export type CharacterBattleSpellAccessFreeCastResourceInit = {
  readonly unit: UnitRecord;
  readonly spellAccessFreeCast: {
    readonly spellId: SpellRecord["id"];
    readonly count: number;
  };
  readonly usesRemaining: number;
  readonly pointsRemaining?: never;
  readonly capAbilityModifier?: never;
};

export type CharacterBattleResourceInit =
  | CharacterBattleUseCountResourceInit
  | CharacterBattlePointPoolResourceInit
  | CharacterBattleSpellAccessFreeCastResourceInit;

type ProjectedCharacterBattleResourceInitData = {
  readonly tag: "projectedCharacterBattleResource";
  readonly init: Exclude<
    CharacterBattleResourceInit,
    CharacterBattleSpellAccessFreeCastResourceInit
  >;
  readonly procedure: UnboundResourceFeatureProcedure;
};

export type ProjectedCharacterBattleResourceInit =
  ProjectedCharacterBattleResourceInitData &
    Brand.Brand<"ProjectedCharacterBattleResourceInit">;

const ProjectedCharacterBattleResourceInit =
  Brand.nominal<ProjectedCharacterBattleResourceInit>();

export type CharacterBattleResourceFeatureProjection =
  | {
      readonly tag: "projected";
      readonly input: ProjectedCharacterBattleResourceInit;
    }
  | {
      readonly tag: "sourceMismatch";
      readonly message: string;
    };

export function projectCharacterBattleResourceFeature(
  init: Exclude<
    CharacterBattleResourceInit,
    CharacterBattleSpellAccessFreeCastResourceInit
  >,
  feature: AdmittedResourceFeature,
): CharacterBattleResourceFeatureProjection {
  if (init.unit.id !== feature.sourceUnitId) {
    return {
      tag: "sourceMismatch",
      message: `Character battle resource feature source does not match its resource Unit: ${feature.sourceUnitId} != ${init.unit.id}.`,
    };
  }
  return {
    tag: "projected",
    input: ProjectedCharacterBattleResourceInit({
      tag: "projectedCharacterBattleResource",
      init,
      procedure: feature.procedure,
    }),
  };
}

export type CharacterBattleResourceAdmissionInput =
  | CharacterBattleResourceInit
  | ProjectedCharacterBattleResourceInit;

export function characterBattleResourceExecutionFacts(
  input: CharacterBattleResourceAdmissionInput,
): CharacterBattleResourceExecutionFacts {
  if ("tag" in input) {
    return resourceFeatureExecutionFacts(input.procedure);
  }
  if (input.spellAccessFreeCast !== undefined) {
    return {
      kind: "use_count",
      cap: { kind: "fixed", uses: input.spellAccessFreeCast.count },
    };
  }
  return characterBattleResourceForUnit(input.unit);
}

export type CharacterBattleFeatureInit = SupportedUnitFeatureFacts & {
  readonly unit: UnitRecord;
};

export type CharacterBattleResourceProcedureAdmission =
  | {
      readonly tag: "resourceWithoutProcedure";
      readonly resource: CharacterBattleResourceInit;
    }
  | {
      readonly tag: "resourceFeatureProcedure";
      readonly resource: ProjectedCharacterBattleResourceInit;
    }
  | {
      readonly tag: "unitFeatureProcedure";
      readonly resource: CharacterBattleResourceInit;
      readonly facts: SupportedUnitFeatureFacts;
    };

export function admitCharacterBattleResourceProcedures(
  resources: readonly CharacterBattleResourceInit[],
  classLevels: CharacterBattleClassLevels,
  unitRefs: readonly {
    readonly unit: BattleUnitSupportSource;
    readonly supportProfiles: readonly BattleUnitSupportProfile[];
  }[],
): Result.Result<
  readonly CharacterBattleResourceProcedureAdmission[],
  ReadonlyNonEmptyArray<BattleUnitSupportProfileIssue>
> {
  const admissions: CharacterBattleResourceProcedureAdmission[] = [];
  const issues: BattleUnitSupportProfileIssue[] = [];
  for (const resource of resources) {
    if (resource.spellAccessFreeCast !== undefined) {
      admissions.push({ tag: "resourceWithoutProcedure", resource });
      continue;
    }
    Match.value(admitResourceFeature(resource.unit)).pipe(
      Match.discriminatorsExhaustive("tag")({
        notBattleOwned: () => {
          const selectedSourceFacts = selectedResourceProcedureSourceFacts(
            resource,
            unitRefs,
          );
          if (Result.isFailure(selectedSourceFacts)) {
            issues.push(selectedSourceFacts.failure);
            return;
          }
          const profile = parseSupportedUnitFeatureProfile(
            resource.unit,
            classLevels,
            selectedSourceFacts.success,
          );
          admissions.push(
            profile === null
              ? { tag: "resourceWithoutProcedure", resource }
              : {
                  tag: "unitFeatureProcedure",
                  resource,
                  facts: supportedUnitFeatureFacts(profile),
                },
          );
        },
        admitted: (feature) => {
          const projection = projectCharacterBattleResourceFeature(
            resource,
            feature,
          );
          Match.value(projection).pipe(
            Match.discriminatorsExhaustive("tag")({
              projected: ({ input }) =>
                admissions.push({
                  tag: "resourceFeatureProcedure",
                  resource: input,
                }),
              sourceMismatch: ({ message }) =>
                issues.push({
                  tag: "battleUnitSupportProfileIssue",
                  message,
                }),
            }),
          );
        },
        rejected: ({ issues: admissionIssues }) =>
          issues.push(
            ...admissionIssues.map(({ message }) => ({
              tag: "battleUnitSupportProfileIssue" as const,
              message,
            })),
          ),
      }),
    );
  }
  const [firstIssue, ...remainingIssues] = issues;
  return firstIssue === undefined
    ? Result.succeed(admissions)
    : Result.fail([firstIssue, ...remainingIssues]);
}

function supportedUnitFeatureFacts(
  profile: SupportedUnitFeatureProfile,
): SupportedUnitFeatureFacts {
  const { unit: _unit, ...facts } = profile;
  return facts;
}

function selectedResourceProcedureSourceFacts(
  resource: CharacterBattleResourceInit,
  unitRefs: readonly {
    readonly unit: BattleUnitSupportSource;
    readonly supportProfiles: readonly BattleUnitSupportProfile[];
  }[],
): Result.Result<
  BattleUnitSupportProfileSourceFacts | undefined,
  BattleUnitSupportProfileIssue
> {
  const selectedDamageTypes = [
    ...new Set(
      unitRefs.flatMap((unitRef) =>
        unitRef.unit.id === resource.unit.id
          ? unitRef.supportProfiles.flatMap((profile) => {
              if (
                typeof profile !== "object" ||
                profile.kind !== "attackActionAreaSaveDamageReplacement"
              ) {
                return [];
              }
              const damageType = profile.breath.damage.damageType;
              return damageType.kind === "draconicAncestry"
                ? [damageType.value]
                : [];
            })
          : [],
      ),
    ),
  ].sort();
  const [selectedDamageType, conflictingDamageType] = selectedDamageTypes;
  if (selectedDamageType === undefined) return Result.succeed(undefined);
  return conflictingDamageType === undefined
    ? Result.succeed({ draconicAncestryDamageType: selectedDamageType })
    : Result.fail({
        tag: "battleUnitSupportProfileIssue",
        message: `Resource Unit ${resource.unit.id} has conflicting selected Draconic Ancestry damage types: ${selectedDamageTypes.join(", ")}.`,
      });
}

type SorcererMetamagicMechanics = Extract<
  ClassFeatureRecord["mechanics"],
  { readonly family: "metamagic_options" }
>;
export type CharacterBattleMetamagicInit = {
  readonly sorceryPointResourceUnitId: UnitRecord["id"];
  readonly spellUseLimit: SorcererMetamagicMechanics["spellUseLimit"]["kind"];
  readonly knownOptions: readonly CharacterBattleMetamagicOptionFact[];
};

type SpellAccessGrant = Extract<
  EffectAtom,
  { readonly kind: "grant_spell_access" }
>;
export type CompanionReactionInvocationMode = {
  readonly action: "magicAction";
  readonly resource: "noSpellSlot";
};
export const PACT_OF_THE_CHAIN_FIND_FAMILIAR_INVOCATION_MODE = {
  action: "magicAction",
  resource: "noSpellSlot",
} as const satisfies CompanionReactionInvocationMode;
type FamiliarFormCatalog = Extract<
  SpawnedCreatureMechanics["creature"],
  { readonly kind: "familiar_form_catalog" }
>;
type PactOfTheChainSpawnedCompanionSpellRecord = SpellRecord & {
  readonly mechanics: SpawnedCreatureMechanics & {
    readonly creature: FamiliarFormCatalog;
  };
};
type PactOfTheChainSpawnedCompanionSpellProfile = {
  readonly spell: PactOfTheChainSpawnedCompanionSpellRecord;
  readonly eligibleForms: PactOfTheChainSpawnedCompanionFormEligibility;
};
type PactOfTheChainSpawnedCompanionSpellProfileParseResult =
  | {
      readonly tag: "parsed";
      readonly profile: PactOfTheChainSpawnedCompanionSpellProfile;
    }
  | { readonly tag: "missingFamiliarFormCatalog" }
  | { readonly tag: "unsupported" };

/**
 * Composition-owned authored provenance for a mechanical battle resource.
 * This value is deliberately not part of BattleState or its snapshots.
 */
export type CharacterBattleResourceOwnership = {
  readonly resourcePoolRef: BattleResourcePoolExecutionRef;
  readonly unit: UnitRecord;
  readonly purpose:
    | { readonly tag: "unitResource" }
    | {
        readonly tag: "spellAccessFreeCast";
        readonly spellId: SpellRecord["id"];
      };
};

export type CharacterBattleResourceAdmission = {
  readonly states: readonly CharacterBattleResourceState[];
  readonly ownership: readonly CharacterBattleResourceOwnership[];
};

export function admitCharacterBattleResources(
  inits: readonly CharacterBattleResourceAdmissionInput[],
  classLevels: CharacterBattleClassLevels,
  scopeRef: BattleCharacterExecutionScopeRef,
): CharacterBattleResourceAdmission {
  const admitted = inits.map((input, ordinal) => {
    const init = characterBattleResourceInitFromAdmissionInput(input);
    const resourcePoolRef = battleResourcePoolExecutionRef(
      scopeRef,
      NonNegativeInteger(ordinal),
    );
    return {
      state: characterResourceState(input, classLevels, resourcePoolRef),
      ownership: {
        resourcePoolRef,
        unit: init.unit,
        purpose:
          init.spellAccessFreeCast === undefined
            ? { tag: "unitResource" as const }
            : {
                tag: "spellAccessFreeCast" as const,
                spellId: init.spellAccessFreeCast.spellId,
              },
      },
    };
  });
  return {
    states: admitted.map(({ state }) => state),
    ownership: admitted.map(({ ownership }) => ownership),
  };
}

export function characterBattleResourceInitFromAdmissionInput(
  input: CharacterBattleResourceAdmissionInput,
): CharacterBattleResourceInit {
  return "tag" in input ? input.init : input;
}

export type CharacterBattleSpellSlotInit = {
  readonly spellLevel: number;
  readonly count: number;
};

export type CharacterBattleSpellSlotExpenditureInit = {
  readonly spellLevel: number;
  readonly expended: number;
};

export type CharacterBattleFeaturePreparedSpellInit = {
  readonly sourceUnitId: UnitRecord["id"];
  readonly spell: SpellRecord;
};

export type CharacterBattleSpellListFact = {
  readonly className: ClassName;
  readonly cantrips: readonly UnitRecord["id"][];
  readonly leveled: readonly {
    readonly spellId: UnitRecord["id"];
    readonly spellLevel: number;
  }[];
};

export type CharacterBattleSpellAccessInit = {
  readonly source: {
    readonly tag: "feat";
    readonly sourceUnit: Extract<UnitRecord, { readonly kind: "feat" }>;
    readonly spellList: CharacterBattleSpellListFact;
  };
  readonly spellcastingAbilityModifier: number;
  readonly cantrips: readonly [SpellRecord, SpellRecord];
  readonly levelOneSpell: SpellRecord;
};

export type CharacterBattleSpellbookRitualSpellAccessInit = {
  readonly tag: "spellbookRitual";
  readonly spell: SpellRecord;
  readonly featureUnitId: UnitRecord["id"];
};

export type CharacterBattleInvocationSpellAccessInit = {
  readonly tag: "armorOfShadowsMageArmor" | "pactOfTheChainSpawnedCompanion";
  readonly spell: SpellRecord;
};

export type CharacterBattleBookOfShadowsSpellAccessInit = {
  readonly tag: "bookOfShadows";
  readonly bookPresence: CharacterBattleBookOfShadowsPresence;
  readonly cantrips: readonly [SpellRecord, SpellRecord, SpellRecord];
  readonly ritualSpells: readonly [SpellRecord, SpellRecord];
  readonly spellcastingFocus: "book_of_shadows";
};

export type CharacterBattleBookOfShadowsPresence =
  | { readonly tag: "onPerson" }
  | { readonly tag: "notOnPerson" };

export type CharacterBattleInvocationSpellAccessState =
  | {
      readonly tag: "armorOfShadowsMageArmor";
      readonly admission: PersistentArmorEffectAdmission;
    }
  | {
      readonly tag: "pactOfTheChainSpawnedCompanion";
      readonly spell: PactOfTheChainSpawnedCompanionSpellRecord;
      readonly invocationMode: typeof PACT_OF_THE_CHAIN_FIND_FAMILIAR_INVOCATION_MODE;
      readonly eligibleForms: PactOfTheChainSpawnedCompanionFormEligibility;
    };

type CharacterBattleInvocationSpellAccessParseResult =
  | {
      readonly tag: "parsed";
      readonly invocationSpellAccesses: readonly CharacterBattleInvocationSpellAccessState[];
    }
  | {
      readonly tag: "issue";
      readonly message: string;
    };

export type CharacterBattleSpellcastingStateInit = Omit<
  CharacterBattleSpellcastingInit,
  | "bookOfShadowsSpellAccesses"
  | "invocationSpellAccesses"
  | "spellbookRitualSpellAccesses"
> & {
  readonly spellbookRitualSpellAccesses: readonly CharacterBattleSpellbookRitualSpellAccessInit[];
  readonly bookOfShadowsSpellAccesses: readonly CharacterBattleBookOfShadowsSpellAccessInit[];
  readonly invocationSpellAccesses: readonly CharacterBattleInvocationSpellAccessState[];
};

export type CharacterBattleSpellSlotState = {
  readonly spellLevel: SpellSlotLevel;
  readonly count: ResourceCount;
  readonly expended: ResourceCount;
};

export type CharacterBattleAdmittedSpell = {
  readonly spell: SpellRecord;
  readonly castingSource:
    | {
        readonly tag: "classSpellcasting";
        readonly className: ClassName;
        readonly abilityModifier: AbilityModifier;
      }
    | {
        readonly tag: "spellAccess";
        readonly spellAccessRef: BattleSpellAccessExecutionRef;
        readonly abilityModifier: AbilityModifier;
      };
  readonly spellAccessFreeCastResourcePoolRefs: readonly BattleResourcePoolExecutionRef[];
};

type CharacterBattleSpellcastingInitBase = {
  readonly proficiencyBonus: ProficiencyBonus;
  readonly canCastSpells: boolean;
  readonly cantrips: readonly SpellRecord[];
  readonly preparedSpells: readonly SpellRecord[];
  readonly featurePreparedSpells: readonly CharacterBattleFeaturePreparedSpellInit[];
  readonly spellAccesses: readonly CharacterBattleSpellAccessInit[];
  readonly spellbookRitualSpellAccesses: readonly CharacterBattleSpellbookRitualSpellAccessInit[];
  readonly bookOfShadowsSpellAccesses?: readonly CharacterBattleBookOfShadowsSpellAccessInit[];
  readonly invocationSpellAccesses: readonly CharacterBattleInvocationSpellAccessInit[];
  readonly spellSlots: readonly CharacterBattleSpellSlotInit[];
  readonly spellSlotExpenditures?: readonly CharacterBattleSpellSlotExpenditureInit[];
};

export type CharacterBattleSpellcastingInit =
  CharacterBattleSpellcastingInitBase & {
    readonly spellcastingSource:
      | {
          readonly tag: "classSpellcasting";
          readonly className: ClassName;
          readonly abilityModifier: number;
        }
      | { readonly tag: "spellAccessOnly" };
  };

export type CharacterBattleSpellcastingState = Omit<
  CharacterBattleSpellcastingInit,
  | "spellcastingSource"
  | "cantrips"
  | "preparedSpells"
  | "featurePreparedSpells"
  | "spellAccesses"
  | "spellbookRitualSpellAccesses"
  | "bookOfShadowsSpellAccesses"
  | "invocationSpellAccesses"
  | "spellSlots"
  | "spellSlotExpenditures"
> & {
  readonly spellcastingSource:
    | {
        readonly tag: "classSpellcasting";
        readonly className: ClassName;
        readonly abilityModifier: AbilityModifier;
      }
    | { readonly tag: "spellAccessOnly" };
  readonly cantrips: readonly CharacterBattleAdmittedSpell[];
  readonly preparedSpells: readonly CharacterBattleAdmittedSpell[];
  readonly spellAccesses: readonly CharacterBattleAdmittedSpell[];
  readonly spellbookRitualSpellAccesses: readonly CharacterBattleSpellbookRitualSpellAccessInit[];
  readonly bookOfShadowsSpellAccesses: readonly CharacterBattleBookOfShadowsSpellAccessInit[];
  readonly invocationSpellAccesses: readonly CharacterBattleInvocationSpellAccessState[];
  readonly spellSlots: readonly CharacterBattleSpellSlotState[];
};

export type { CharacterBattleSpellcastingExecutionState } from "./character-battle-resource-execution.ts";

export function characterSpellcastingExecutionState(
  state: CharacterBattleSpellcastingState,
): import("./character-battle-resource-execution.ts").CharacterBattleSpellcastingExecutionState {
  const hasPactOfTheChainSpawnedCompanion = state.invocationSpellAccesses.some(
    (access) => access.tag === "pactOfTheChainSpawnedCompanion",
  );
  return {
    spellcastingSource: state.spellcastingSource,
    proficiencyBonus: state.proficiencyBonus,
    canCastSpells: state.canCastSpells,
    spellSlots: state.spellSlots,
    pactOfTheChainSpawnedCompanionInvocationMode:
      hasPactOfTheChainSpawnedCompanion
        ? PACT_OF_THE_CHAIN_FIND_FAMILIAR_INVOCATION_MODE
        : null,
  };
}

export function effectiveCharacterBattleCantrips(
  spellcasting: Pick<
    CharacterBattleSpellcastingState,
    "bookOfShadowsSpellAccesses" | "cantrips" | "spellcastingSource"
  >,
): readonly CharacterBattleAdmittedSpell[] {
  const castingSource = spellcasting.spellcastingSource;
  return distinctAdmittedSpellsById([
    ...spellcasting.cantrips,
    ...bookOfShadowsOnPersonAccesses(spellcasting).flatMap((access) =>
      castingSource.tag === "spellAccessOnly"
        ? []
        : access.cantrips.map(
            (spell): CharacterBattleAdmittedSpell => ({
              spell,
              castingSource: {
                tag: "classSpellcasting",
                className: castingSource.className,
                abilityModifier: castingSource.abilityModifier,
              },
              spellAccessFreeCastResourcePoolRefs: [],
            }),
          ),
    ),
  ]);
}

export function effectiveCharacterBattlePreparedSpells(
  spellcasting: Pick<
    CharacterBattleSpellcastingState,
    "bookOfShadowsSpellAccesses" | "preparedSpells" | "spellcastingSource"
  >,
): readonly CharacterBattleAdmittedSpell[] {
  const castingSource = spellcasting.spellcastingSource;
  return distinctAdmittedSpellsById([
    ...spellcasting.preparedSpells,
    ...bookOfShadowsOnPersonAccesses(spellcasting).flatMap((access) =>
      castingSource.tag === "spellAccessOnly"
        ? []
        : access.ritualSpells.map(
            (spell): CharacterBattleAdmittedSpell => ({
              spell,
              castingSource: {
                tag: "classSpellcasting",
                className: castingSource.className,
                abilityModifier: castingSource.abilityModifier,
              },
              spellAccessFreeCastResourcePoolRefs: [],
            }),
          ),
    ),
  ]);
}

function distinctAdmittedSpellsById(
  spells: readonly CharacterBattleAdmittedSpell[],
): readonly CharacterBattleAdmittedSpell[] {
  const seen = new Set<string>();
  const result: CharacterBattleAdmittedSpell[] = [];
  for (const spell of spells) {
    const key =
      spell.castingSource.tag === "spellAccess"
        ? `${spell.castingSource.spellAccessRef}\u0000${spell.spell.id}`
        : `${spell.castingSource.className}\u0000${spell.spell.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(spell);
  }
  return result;
}

export function admittedSpellToAdmissionSource(
  admitted: CharacterBattleAdmittedSpell,
): BattleSpellAdmissionSource {
  return {
    id: admitted.spell.id,
    name: admitted.spell.name,
    mechanics: admitted.spell.mechanics,
    spellDefinitionRuleFacts: projectSpellDefinitionRuleFacts(
      admitted.spell.mechanics,
    ),
    castingSource: admitted.castingSource,
    spellAccessFreeCastResourcePoolRefs:
      admitted.spellAccessFreeCastResourcePoolRefs,
  };
}

export function spellRecordToAdmissionSource(
  spell: SpellRecord,
  castingSource: CharacterBattleAdmittedSpell["castingSource"],
): BattleSpellAdmissionSource {
  return {
    id: spell.id,
    name: spell.name,
    mechanics: spell.mechanics,
    spellDefinitionRuleFacts: projectSpellDefinitionRuleFacts(spell.mechanics),
    castingSource,
    spellAccessFreeCastResourcePoolRefs: [],
  };
}

function bookOfShadowsOnPersonAccesses(
  spellcasting: Pick<
    CharacterBattleSpellcastingState,
    "bookOfShadowsSpellAccesses"
  >,
): readonly CharacterBattleBookOfShadowsSpellAccessInit[] {
  return spellcasting.bookOfShadowsSpellAccesses.filter(
    (access) => access.bookPresence.tag === "onPerson",
  );
}

/* v8 ignore start -- @preserve -- Malformed ritual-access initialization: admitted spellbook entries are unique, leveled ritual spells carrying their typed spellbook-Ritual facts. */
export function characterBattleSpellbookRitualSpellAccessInitIssue(
  spellbookRitualSpellAccesses: readonly CharacterBattleSpellbookRitualSpellAccessInit[],
): string | null {
  const spellIds = new Set<SpellRecord["id"]>();
  for (const access of spellbookRitualSpellAccesses) {
    if (access.tag !== "spellbookRitual") {
      return "Spellbook Ritual Spell Access must carry spellbook Ritual facts.";
    }
    if (
      access.spell.mechanics.level < 1 ||
      !spellHasTopLevelRitualTag(access.spell)
    ) {
      return "Spellbook Ritual Spell Access must reference ritual-tagged leveled Spell Definitions.";
    }
    if (spellIds.has(access.spell.id)) {
      return "Spellbook Ritual Spell Access spell ids must be unique.";
    }
    spellIds.add(access.spell.id);
  }
  return null;
}
/* v8 ignore stop -- @preserve */

export function parseCharacterBattleInvocationSpellAccesses(
  invocationSpellAccesses: readonly CharacterBattleInvocationSpellAccessInit[],
): CharacterBattleInvocationSpellAccessParseResult {
  const parsed: CharacterBattleInvocationSpellAccessState[] = [];
  for (const access of invocationSpellAccesses) {
    if (access.tag === "armorOfShadowsMageArmor") {
      const admission = admitPersistentArmorEffectSpell(access.spell);
      if (admission === null) {
        return {
          tag: "issue",
          message: "Armor of Shadows Spell Access must grant Mage Armor.",
        };
      }
      parsed.push({
        tag: access.tag,
        admission,
      });
      continue;
    }
    const profileResult = pactOfTheChainSpawnedCompanionSpellProfileForSpell(
      access.spell,
    );
    if (profileResult.tag === "missingFamiliarFormCatalog") {
      return {
        tag: "issue",
        message:
          "Pact of the Chain Find Familiar access requires familiar form catalog references.",
      };
    }
    if (profileResult.tag === "unsupported") {
      return {
        tag: "issue",
        message: "Pact of the Chain Spell Access must grant Find Familiar.",
      };
    }
    const profile = profileResult.profile;
    parsed.push({
      tag: access.tag,
      spell: profile.spell,
      invocationMode: PACT_OF_THE_CHAIN_FIND_FAMILIAR_INVOCATION_MODE,
      eligibleForms: profile.eligibleForms,
    });
  }
  return {
    tag: "parsed",
    invocationSpellAccesses: parsed,
  };
}

export function characterResourceState(
  admissionInput: CharacterBattleResourceAdmissionInput,
  classLevels: CharacterBattleClassLevels,
  resourcePoolRef: BattleResourcePoolExecutionRef,
): CharacterBattleResourceState {
  const initIssue = characterBattleResourceInitIssue(
    admissionInput,
    classLevels,
  );
  /* v8 ignore start -- @preserve -- Resource admission runs this constructor only after the same initialization issue check at the battle boundary. */
  if (initIssue !== null) {
    throw new Error(initIssue);
  }
  /* v8 ignore stop -- @preserve */
  const input = characterBattleResourceInitFromAdmissionInput(admissionInput);
  const resource = characterBattleResourceExecutionFacts(admissionInput);
  const base = { resourcePoolRef };
  if (resource.kind === "point_pool") {
    const defaultPointsRemaining = supportedResourceCapForLevel(
      resource,
      characterBattleResourceLevel(input.unit, classLevels),
      input.capAbilityModifier,
    );
    return {
      ...base,
      resource,
      pointsRemaining:
        input.pointsRemaining === undefined
          ? defaultPointsRemaining
          : resourceCount(input.pointsRemaining),
    };
  }
  const useCountBase = {
    ...base,
    usedThisTurn: false,
  };
  if (activationResourceIsUnlimited(resource)) {
    return { ...useCountBase, resource };
  }
  if (input.usesRemaining !== undefined) {
    return {
      ...useCountBase,
      resource,
      usesRemaining: resourceCount(input.usesRemaining),
    };
  }
  const defaultUsesRemaining = supportedResourceCapForLevel(
    resource,
    characterBattleResourceLevel(input.unit, classLevels),
    input.capAbilityModifier,
  );
  return {
    ...useCountBase,
    resource,
    usesRemaining: defaultUsesRemaining,
  };
}

export function characterBattleResourceMaxUses(input: {
  readonly unit: UnitRecord;
  readonly classLevels: CharacterBattleClassLevels;
  readonly capAbilityModifier?: AbilityModifier;
}): ResourceCount | undefined {
  return characterBattleResourceMaxUsesForExecutionFacts({
    ...input,
    resource: characterBattleResourceForUnit(input.unit),
  });
}

export function characterBattleResourceMaxUsesForExecutionFacts(input: {
  readonly unit: UnitRecord;
  readonly resource: CharacterBattleResourceExecutionFacts;
  readonly classLevels: CharacterBattleClassLevels;
  readonly capAbilityModifier?: AbilityModifier;
}): ResourceCount | undefined {
  const resource = input.resource;
  if (resource.kind === "point_pool") {
    return undefined;
  }
  if (activationResourceIsUnlimited(resource)) {
    return undefined;
  }
  return supportedResourceCapForLevel(
    resource,
    characterBattleResourceLevel(input.unit, input.classLevels),
    input.capAbilityModifier,
  );
}

export function characterBattleResourceMaxPoints(input: {
  readonly unit: UnitRecord;
  readonly classLevels: CharacterBattleClassLevels;
  readonly capAbilityModifier?: AbilityModifier;
}): ResourceCount | undefined {
  return characterBattleResourceMaxPointsForExecutionFacts({
    ...input,
    resource: characterBattleResourceForUnit(input.unit),
  });
}

export function characterBattleResourceMaxPointsForExecutionFacts(input: {
  readonly unit: UnitRecord;
  readonly resource: CharacterBattleResourceExecutionFacts;
  readonly classLevels: CharacterBattleClassLevels;
  readonly capAbilityModifier?: AbilityModifier;
}): ResourceCount | undefined {
  const resource = input.resource;
  if (resource.kind !== "point_pool") {
    return undefined;
  }
  return supportedResourceCapForLevel(
    resource,
    characterBattleResourceLevel(input.unit, input.classLevels),
    input.capAbilityModifier,
  );
}

function characterBattleResourceLevel(
  unit: UnitRecord,
  classLevels: CharacterBattleClassLevels,
): number {
  const unitClassLevel =
    unit.kind === "class_feature"
      ? requireCharacterClassLevel(classLevels, unit.className)
      : undefined;
  return unitClassLevel ?? Number(characterBattleLevel(classLevels));
}

/* v8 ignore start -- @preserve -- Malformed resource initialization: admitted character resources match their Unit-defined pool kind, cap, and nonnegative bounded remaining amount. */
export function characterBattleResourceInitIssue(
  admissionInput: CharacterBattleResourceAdmissionInput,
  classLevels: CharacterBattleClassLevels,
): string | null {
  const input = characterBattleResourceInitFromAdmissionInput(admissionInput);
  if (input.spellAccessFreeCast !== undefined) {
    return spellAccessFreeCastResourceInitIssue(input);
  }
  const resource = characterBattleResourceExecutionFacts(admissionInput);
  return characterBattleResourceStateInitIssue(input, classLevels, resource);
}

function spellAccessFreeCastResourceInitIssue(
  input: CharacterBattleResourceInit & {
    readonly spellAccessFreeCast: NonNullable<
      CharacterBattleResourceInit["spellAccessFreeCast"]
    >;
  },
): string | null {
  return !Number.isInteger(input.spellAccessFreeCast.count) ||
    input.spellAccessFreeCast.count < 1 ||
    !Number.isInteger(input.usesRemaining) ||
    input.usesRemaining < 0 ||
    input.usesRemaining > input.spellAccessFreeCast.count
    ? "Spell Access free-cast battle resource requires bounded positive use-count state."
    : null;
}

function characterBattleResourceStateInitIssue(
  input: CharacterBattleResourceInit,
  classLevels: CharacterBattleClassLevels,
  resource: CharacterBattleResourceExecutionFacts,
): string | null {
  if (
    resource.kind === "point_pool" &&
    (input.usesRemaining !== undefined ||
      input.capAbilityModifier !== undefined)
  ) {
    return "Point-pool character battle resources must not carry use-count state.";
  }
  if (resource.kind !== "point_pool" && input.pointsRemaining !== undefined) {
    return "Use-count character battle resources must not carry point-pool state.";
  }
  return resource.kind === "point_pool"
    ? pointPoolResourceInitIssue(input, classLevels)
    : useCountResourceInitIssue(input, resource);
}

function pointPoolResourceInitIssue(
  input: CharacterBattleResourceInit,
  classLevels: CharacterBattleClassLevels,
): string | null {
  if (input.pointsRemaining === undefined) return null;
  if (!Number.isInteger(input.pointsRemaining) || input.pointsRemaining < 0) {
    return "Point-pool character battle resource remaining points must be a nonnegative integer.";
  }
  const maxPoints = characterBattleResourceMaxPoints({
    unit: input.unit,
    classLevels,
  });
  if (maxPoints === undefined) {
    return "Point-pool character battle resource requires a finite cap.";
  }
  return input.pointsRemaining > maxPoints
    ? "Point-pool character battle resource remaining points must not exceed its maximum."
    : null;
}

function useCountResourceInitIssue(
  input: CharacterBattleResourceInit,
  resource: Extract<
    CharacterBattleResourceExecutionFacts,
    { readonly kind: "use_count" }
  >,
): string | null {
  if (input.pointsRemaining !== undefined) {
    return "Use-count character battle resources must not carry point-pool state.";
  }
  return resource.cap.kind === "ability_modifier" &&
    input.usesRemaining === undefined &&
    input.capAbilityModifier === undefined
    ? "Ability-modifier resource cap requires the projected ability modifier."
    : null;
}
/* v8 ignore stop -- @preserve */

/* v8 ignore start -- @preserve -- Malformed Metamagic initialization: admitted state has unique positive-cost options and references its character-owned Sorcery Point pool. */
export function characterBattleMetamagicInitIssue(input: {
  readonly metamagic: CharacterBattleMetamagicInit | undefined;
  readonly resources: readonly CharacterBattleResourceInit[];
}): string | null {
  if (input.metamagic === undefined) {
    return null;
  }
  if (input.metamagic.knownOptions.length === 0) {
    return "Metamagic battle state requires at least one known option fact.";
  }
  const effectKinds = new Set<
    CharacterBattleMetamagicOptionFact["effectKind"]
  >();
  for (const option of input.metamagic.knownOptions) {
    if (effectKinds.has(option.effectKind)) {
      return "Metamagic battle option facts must not duplicate effect kinds.";
    }
    effectKinds.add(option.effectKind);
    if (
      !Number.isInteger(option.sorceryPointCost) ||
      option.sorceryPointCost <= 0
    ) {
      return "Metamagic battle option facts require positive Sorcery Point costs.";
    }
  }
  const sorceryPointResource = input.resources.find(
    (resource) =>
      resource.unit.id === input.metamagic?.sorceryPointResourceUnitId,
  );
  if (sorceryPointResource === undefined) {
    return "Metamagic battle state requires its shared Sorcery Point resource.";
  }
  const resource = characterBattleResourceForUnitOrNull(
    sorceryPointResource.unit,
  );
  return resource?.kind === "point_pool"
    ? null
    : "Metamagic battle state must reference a point-pool Sorcery Point resource.";
}
/* v8 ignore stop -- @preserve */

export function characterBattleMetamagicState(
  metamagic: CharacterBattleMetamagicInit | undefined,
  resources: readonly CharacterBattleResourceState[],
  ownership: readonly CharacterBattleResourceOwnership[],
): CharacterBattleMetamagicState | undefined {
  if (metamagic === undefined) return undefined;
  const owner = ownership.find(
    (candidate) => candidate.unit.id === metamagic.sorceryPointResourceUnitId,
  );
  const resource = resources.find(
    (candidate) => candidate.resourcePoolRef === owner?.resourcePoolRef,
  );
  return resource === undefined
    ? undefined
    : {
        sorceryPointResourcePoolRef: resource.resourcePoolRef,
        spellUseLimit: metamagic.spellUseLimit,
        knownOptions: metamagic.knownOptions,
      };
}

export function characterBattleResourceForUnit(
  unit: UnitRecord,
): CharacterBattleResourceExecutionFacts {
  const resource = characterBattleResourceForUnitOrNull(unit);
  if (resource === null) {
    throw new Error(
      "Character battle resources must be supported resource Units.",
    );
  }
  return resource;
}

export function characterBattleResourceSupportedForUnit(
  unit: UnitRecord,
): boolean {
  return characterBattleResourceForUnitOrNull(unit) !== null;
}

export function unitIsSupportedClassFeatureSpellFreeCastResource(
  unit: UnitRecord,
): boolean {
  return classFeatureSpellFreeCastResource(unit) !== null;
}

function characterBattleResourceForUnitOrNull(
  unit: UnitRecord,
): CharacterBattleResourceExecutionFacts | null {
  const resourceFeature = admitResourceFeature(unit);
  if (resourceFeature.tag === "rejected") return null;
  if (resourceFeature.tag === "admitted") {
    return resourceFeatureExecutionFacts(resourceFeature.procedure);
  }
  const freeCastResource = classFeatureSpellFreeCastResource(unit);
  if (freeCastResource !== null) {
    return freeCastResource;
  }
  const zeroHitPointReplacement = zeroHitPointReplacementUnitProfile(unit);
  if (zeroHitPointReplacement !== null) {
    return zeroHitPointReplacement.resource;
  }
  const speciesTraitResource = speciesTraitBattleResourceForUnit(unit);
  if (speciesTraitResource !== null) return speciesTraitResource;
  return classFeatureBattleResourceForUnit(unit);
}

function speciesTraitBattleResourceForUnit(
  unit: UnitRecord,
): CharacterBattleResourceExecutionFacts | null {
  if (unit.kind !== "species_trait") return null;
  if (unit.mechanics.family !== "activation") return null;
  if (!speciesTraitHasBattleResourceProfile(unit)) return null;
  const resource = unit.mechanics.resource;
  if (resource === undefined) return null;
  if (!activationResourceIsSupportedByBattleForUnit(unit, resource)) {
    /* v8 ignore start -- @preserve -- Both admitted species-resource profiles require a use-count resource with a proficiency-bonus cap, so this support predicate is established by the profile guards above. */
    return null;
    /* v8 ignore stop -- @preserve */
  }
  return resource;
}

function speciesTraitHasBattleResourceProfile(
  unit: Extract<UnitRecord, { readonly kind: "species_trait" }>,
): boolean {
  return (
    bonusActionDashTemporaryHitPointsProfileForUnit(unit) !== null ||
    unitHasAttackActionAreaSaveDamageReplacementResourceShape(unit)
  );
}

function classFeatureBattleResourceForUnit(
  unit: UnitRecord,
): CharacterBattleResourceExecutionFacts | null {
  if (unit.kind !== "class_feature") return null;
  if (
    unit.mechanics.family === "resource_pool" &&
    pointPoolResourceIsSupportedByBattle(unit.mechanics.resource)
  ) {
    return unit.mechanics.resource;
  }
  if (unit.mechanics.family === "resource_container") {
    return activationResourceIsSupportedByBattleForUnit(
      unit,
      unit.mechanics.resource,
    )
      ? unit.mechanics.resource
      : null;
  }
  return classFeatureActivationResourceForUnit(unit);
}

function classFeatureActivationResourceForUnit(
  unit: Extract<UnitRecord, { readonly kind: "class_feature" }>,
): CharacterBattleResourceExecutionFacts | null {
  if (
    unit.mechanics.family !== "activation" &&
    unit.mechanics.family !== "reaction_roll_or_damage_reduction"
  ) {
    return null;
  }
  if (!("resource" in unit.mechanics)) return null;
  if (unit.mechanics.resource === undefined) return null;
  return activationResourceIsSupportedByBattleForUnit(
    unit,
    unit.mechanics.resource,
  )
    ? unit.mechanics.resource
    : null;
}

function classFeatureSpellFreeCastResource(
  unit: UnitRecord,
): LimitedUseCountActivationResource | null {
  const grants = supportedClassFeatureSpellFreeCastGrantsForUnit(unit);
  const freeCastGrant = grants?.freeCastGrant;
  if (freeCastGrant === undefined) {
    return null;
  }
  return {
    kind: "use_count",
    cap: { kind: "fixed", uses: freeCastGrant.count },
  };
}

export function classFeatureSpellFreeCastProfileForResource(
  resource: CharacterBattleResourceOwnership,
): SupportedClassFeatureSpellFreeCastProfile | null {
  return classFeatureSpellFreeCastProfileForUnit(resource.unit);
}

export function characterResourceIsSpellAccessFreeCastForSpell(
  resource: CharacterBattleResourceOwnership,
  spellId: SpellRecord["id"],
): boolean {
  return (
    classFeatureSpellFreeCastProfileForResource(resource)?.spellId === spellId
  );
}

function classFeatureSpellFreeCastProfileForUnit(
  unit: UnitRecord,
): SupportedClassFeatureSpellFreeCastProfile | null {
  return supportedClassFeatureSpellFreeCastGrantsForUnit(unit)?.profile ?? null;
}

function activationResourceIsUnlimited(
  resource: ActivationResource,
): resource is UnlimitedActivationResource {
  return resource.kind === "use_count" && resource.cap.kind === "unlimited";
}

function activationResourceIsSupportedByBattle(
  resource: ActivationResource,
): resource is CharacterBattleActivationResource {
  return (
    resource.kind === "use_count" &&
    (resource.cap.kind === "fixed" ||
      resource.cap.kind === "proficiency_bonus" ||
      resource.cap.kind === "linear_per_level" ||
      resource.cap.kind === "threshold_tiers" ||
      resource.cap.kind === "ability_modifier" ||
      resource.cap.kind === "unlimited")
  );
}

function activationResourceIsSupportedByBattleForUnit(
  unit: UnitRecord,
  resource: ActivationResource,
): resource is CharacterBattleActivationResource {
  if (!activationResourceIsSupportedByBattle(resource)) {
    return false;
  }
  return (
    resource.cap.kind !== "ability_modifier" ||
    unitHasSupportedAbilityModifierBattleResourceProfile(unit)
  );
}

function pointPoolResourceIsSupportedByBattle(
  resource: PointPoolResource,
): resource is SupportedPointPoolResource {
  return (
    resource.kind === "point_pool" &&
    (resource.cap.kind === "fixed" ||
      resource.cap.kind === "proficiency_bonus" ||
      resource.cap.kind === "linear_per_level" ||
      resource.cap.kind === "threshold_tiers")
  );
}

function unitHasSupportedAbilityModifierBattleResourceProfile(
  unit: UnitRecord,
): boolean {
  if (unit.kind !== "class_feature") {
    return false;
  }
  const reactionSupport =
    battleReactionRollOrDamageReductionSupportForUnit(unit);
  if (reactionSupport !== null && reactionSupport !== "unsupported") {
    return true;
  }
  const bardicInspirationSupport =
    battleBardicInspirationGrantSupportForUnit(unit);
  return (
    bardicInspirationSupport !== null &&
    bardicInspirationSupport !== "unsupported"
  );
}

function admittedSpellWithFreeCastRefs(
  spell: SpellRecord,
  castingSource: CharacterBattleAdmittedSpell["castingSource"],
  resources: readonly CharacterBattleResourceState[],
  resourceOwnership: readonly CharacterBattleResourceOwnership[],
): CharacterBattleAdmittedSpell {
  return {
    spell,
    castingSource,
    spellAccessFreeCastResourcePoolRefs: resourceOwnership.flatMap((owner) => {
      const resource = resources.find(
        (candidate) => candidate.resourcePoolRef === owner.resourcePoolRef,
      );
      return resource !== undefined &&
        ((owner.purpose.tag === "spellAccessFreeCast" &&
          owner.purpose.spellId === spell.id) ||
          characterResourceIsSpellAccessFreeCastForSpell(owner, spell.id))
        ? [resource.resourcePoolRef]
        : [];
    }),
  };
}

export function characterSpellcastingStateInitIssue(
  input: CharacterBattleSpellcastingInit,
  spellAccessUnits: readonly (
    | CharacterBattleResourceInit
    | CharacterBattleFeatureInit
  )[],
  sourceUnits: readonly UnitRecord[],
): string | null {
  const issues = [
    ...spellcastingAccessInitIssues(input, spellAccessUnits, sourceUnits),
    ...spellSlotInitIssues(input),
    ...spellSlotExpenditureInitIssues(input),
    ...featurePreparedSpellAccessInitIssues(input, spellAccessUnits),
  ];
  return issues.length === 0 ? null : [...new Set(issues)].join("; ");
}

function spellcastingAccessInitIssues(
  input: CharacterBattleSpellcastingInit,
  spellAccessUnits: readonly (
    | CharacterBattleResourceInit
    | CharacterBattleFeatureInit
  )[],
  sourceUnits: readonly UnitRecord[],
): readonly string[] {
  const issues: string[] = [];
  if (spellcastingSourceCarriesClassAccess(input)) {
    issues.push(
      "Spell-Access-only casting must not contain class Spell Access.",
    );
  }
  const spellAccessKeys = new Set<string>();
  for (const source of input.spellAccesses) {
    issues.push(
      ...magicInitiateSpellAccessSourceInitIssues(
        source,
        spellAccessUnits,
        sourceUnits,
      ),
      ...spellAccessEntryInitIssues(source, spellAccessKeys),
    );
  }
  return issues;
}

function spellcastingSourceCarriesClassAccess(
  input: CharacterBattleSpellcastingInit,
): boolean {
  return (
    input.spellcastingSource.tag === "spellAccessOnly" &&
    classSpellAccessIsPresent(input)
  );
}

function classSpellAccessIsPresent(
  input: CharacterBattleSpellcastingInit,
): boolean {
  return (
    input.cantrips.length > 0 ||
    input.preparedSpells.length > 0 ||
    input.featurePreparedSpells.length > 0 ||
    input.spellbookRitualSpellAccesses.length > 0 ||
    (input.bookOfShadowsSpellAccesses?.length ?? 0) > 0 ||
    input.invocationSpellAccesses.length > 0
  );
}

function spellAccessEntryInitIssues(
  source: CharacterBattleSpellAccessInit,
  spellAccessKeys: Set<string>,
): readonly string[] {
  const issues: string[] = [];
  for (const access of magicInitiateSpellAccessEntries(source)) {
    const key = `${source.source.sourceUnit.id}\u0000${access.spell.id}`;
    if (spellAccessKeys.has(key)) {
      issues.push("Spell Access source-and-spell keys must be unique.");
    }
    spellAccessKeys.add(key);
    if (spellAccessPreparationHasWrongLevel(access)) {
      issues.push(
        "Spell Access preparation must match the Spell Definition level.",
      );
    }
  }
  return issues;
}

function spellAccessPreparationHasWrongLevel(
  access: ReturnType<typeof magicInitiateSpellAccessEntries>[number],
): boolean {
  return (
    (access.preparation === "learnedCantrip" &&
      access.spell.mechanics.level !== 0) ||
    (access.preparation === "alwaysPrepared" &&
      access.spell.mechanics.level < 1)
  );
}

function spellSlotInitIssues(
  input: CharacterBattleSpellcastingInit,
): readonly string[] {
  const issues: string[] = [];
  const spellSlotLevels = new Set<number>();
  for (const slot of input.spellSlots) {
    if (spellSlotHasInvalidCapacity(slot)) {
      issues.push(
        "Spell Slot level must be 1-9 and count must be a non-negative integer.",
      );
    }
    if (spellSlotLevels.has(slot.spellLevel)) {
      issues.push("Spell Slot levels must be unique.");
    }
    spellSlotLevels.add(slot.spellLevel);
  }
  return issues;
}

function spellSlotHasInvalidCapacity(
  slot: CharacterBattleSpellcastingInit["spellSlots"][number],
): boolean {
  return (
    !Number.isInteger(slot.spellLevel) ||
    slot.spellLevel < 1 ||
    slot.spellLevel > 9 ||
    !Number.isInteger(slot.count) ||
    slot.count < 0
  );
}

function spellSlotExpenditureInitIssues(
  input: CharacterBattleSpellcastingInit,
): readonly string[] {
  const spellSlotExpenditures = input.spellSlotExpenditures;
  if (spellSlotExpenditures === undefined) return [];
  const issues: string[] = [];
  if (spellSlotExpenditures.length !== input.spellSlots.length) {
    issues.push("Spell Slot expenditure state must match slot capacity.");
  }
  const expenditureLevels = new Set<number>();
  for (const expenditure of spellSlotExpenditures) {
    const capacity = input.spellSlots.find(
      (slot) => slot.spellLevel === expenditure.spellLevel,
    );
    if (
      capacity === undefined ||
      expenditureLevels.has(expenditure.spellLevel)
    ) {
      issues.push("Spell Slot expenditure state must match slot capacity.");
      continue;
    }
    expenditureLevels.add(expenditure.spellLevel);
    if (spellSlotExpenditureHasInvalidCount(expenditure, capacity.count)) {
      issues.push(
        "Spell Slot expenditure must be an integer between zero and count.",
      );
    }
  }
  return issues;
}

function spellSlotExpenditureHasInvalidCount(
  expenditure: CharacterBattleSpellSlotExpenditureInit,
  capacity: number,
): boolean {
  return (
    !Number.isInteger(expenditure.expended) ||
    expenditure.expended < 0 ||
    expenditure.expended > capacity
  );
}

function featurePreparedSpellAccessInitIssues(
  input: CharacterBattleSpellcastingInit,
  spellAccessUnits: readonly (
    | CharacterBattleResourceInit
    | CharacterBattleFeatureInit
  )[],
): readonly string[] {
  const issues: string[] = [];
  for (const featureSpell of input.featurePreparedSpells) {
    if (
      !spellAccessUnits.some((source) =>
        unitGrantsPreparedSpellAccess(
          source.unit,
          featureSpell.sourceUnitId,
          featureSpell.spell.id,
        ),
      )
    ) {
      issues.push(
        "Feature-prepared spells must trace to a character Unit grant.",
      );
    }
  }
  return issues;
}

function magicInitiateSpellAccessSourceInitIssues(
  access: CharacterBattleSpellAccessInit,
  spellAccessUnits: readonly (
    | CharacterBattleResourceInit
    | CharacterBattleFeatureInit
  )[],
  sourceUnits: readonly UnitRecord[],
): readonly string[] {
  const source = access.source;
  const facts = readMagicInitiateSpellAccessSourceFacts(source.sourceUnit);
  if (facts.tag !== "readable") {
    return [
      "Feat Spell Access source must carry supported Magic Initiate mechanics.",
    ];
  }
  const entries = magicInitiateSpellAccessEntries(access);
  const issues = magicInitiateSourceInvariantIssues(
    access,
    facts,
    spellAccessUnits,
    sourceUnits,
  );
  const spellList = access.source.spellList;
  for (const access of entries) {
    issues.push(
      ...magicInitiateSpellAccessEntryIssues(
        access,
        spellList,
        spellAccessUnits,
        source.sourceUnit.id,
      ),
    );
  }
  return issues;
}

type ReadableMagicInitiateSourceFacts = Extract<
  ReturnType<typeof readMagicInitiateSpellAccessSourceFacts>,
  { readonly tag: "readable" }
>;

function magicInitiateSourceInvariantIssues(
  access: CharacterBattleSpellAccessInit,
  facts: ReadableMagicInitiateSourceFacts,
  spellAccessUnits: readonly (
    | CharacterBattleResourceInit
    | CharacterBattleFeatureInit
  )[],
  sourceUnits: readonly UnitRecord[],
): string[] {
  const sourceId = access.source.sourceUnit.id;
  const sourceIsOwned =
    sourceUnits.some((unit) => unit.id === sourceId) ||
    spellAccessUnits.some(({ unit }) => unit.id === sourceId);
  const entries = magicInitiateSpellAccessEntries(access);
  const cantripAccesses = entries.filter(
    (entry) => entry.preparation === "learnedCantrip",
  );
  const leveledAccesses = entries.filter(
    (entry) => entry.preparation === "alwaysPrepared",
  );
  const sourceFreeCastResources = spellAccessUnits.filter(
    (candidate): candidate is CharacterBattleSpellAccessFreeCastResourceInit =>
      "spellAccessFreeCast" in candidate &&
      candidate.spellAccessFreeCast !== undefined &&
      candidate.unit.id === sourceId,
  );
  const source = access.source;
  return [
    ...(sourceIsOwned
      ? []
      : ["Feat Spell Access must reference a character source Unit."]),
    ...(source.spellList?.className === facts.value.spellList
      ? []
      : [
          "Magic Initiate Spell Access list source must match its parsed source mechanics.",
        ]),
    ...(cantripsMatchMagicInitiateFacts(cantripAccesses, facts)
      ? []
      : [
          "Magic Initiate Spell Access must contain exactly two distinct cantrips.",
        ]),
    ...(leveledSpellMatchesMagicInitiateFacts(access, leveledAccesses, facts)
      ? []
      : [
          "Magic Initiate Spell Access must contain exactly one level-1 spell.",
        ]),
    ...(freeCastMatchesMagicInitiateFacts(
      sourceFreeCastResources,
      access.levelOneSpell.id,
    )
      ? []
      : [
          "Magic Initiate Spell Access must have exactly one one-use free-cast resource for its level-1 spell.",
        ]),
  ];
}

function cantripsMatchMagicInitiateFacts(
  cantripAccesses: readonly {
    readonly spell: SpellRecord;
    readonly preparation: "learnedCantrip";
  }[],
  facts: ReadableMagicInitiateSourceFacts,
): boolean {
  return (
    cantripAccesses.length === facts.value.selectedCantrips.count &&
    new Set(cantripAccesses.map((access) => access.spell.id)).size ===
      cantripAccesses.length
  );
}

function leveledSpellMatchesMagicInitiateFacts(
  access: CharacterBattleSpellAccessInit,
  leveledAccesses: readonly {
    readonly spell: SpellRecord;
    readonly preparation: "alwaysPrepared";
  }[],
  facts: ReadableMagicInitiateSourceFacts,
): boolean {
  return (
    leveledAccesses.length === facts.value.selectedLevelOneSpell.count &&
    access.levelOneSpell.mechanics.level ===
      facts.value.selectedLevelOneSpell.spellLevel
  );
}

function freeCastMatchesMagicInitiateFacts(
  resources: readonly CharacterBattleSpellAccessFreeCastResourceInit[],
  spellId: SpellRecord["id"],
): boolean {
  return (
    resources.length === 1 &&
    resources[0]?.spellAccessFreeCast.spellId === spellId &&
    resources[0].spellAccessFreeCast.count === 1
  );
}

function magicInitiateSpellAccessEntryIssues(
  access: ReturnType<typeof magicInitiateSpellAccessEntries>[number],
  spellList: CharacterBattleSpellAccessInit["source"]["spellList"],
  spellAccessUnits: readonly (
    | CharacterBattleResourceInit
    | CharacterBattleFeatureInit
  )[],
  sourceUnitId: UnitRecord["id"],
): readonly string[] {
  const isListed = magicInitiateSpellIsListed(access, spellList);
  const matchingFreeCasts = spellAccessUnits.filter(
    (candidate): candidate is CharacterBattleSpellAccessFreeCastResourceInit =>
      "spellAccessFreeCast" in candidate &&
      candidate.spellAccessFreeCast !== undefined &&
      candidate.unit.id === sourceUnitId &&
      candidate.spellAccessFreeCast.spellId === access.spell.id,
  );
  return [
    ...(isListed
      ? []
      : [
          "Magic Initiate Spell Access must reference a spell on its canonical spell list.",
        ]),
    ...magicInitiateFreeCastEntryIssue(access, matchingFreeCasts),
  ];
}

function magicInitiateSpellIsListed(
  access: ReturnType<typeof magicInitiateSpellAccessEntries>[number],
  spellList: CharacterBattleSpellAccessInit["source"]["spellList"],
): boolean {
  if (spellList === undefined) return false;
  return access.preparation === "learnedCantrip"
    ? spellList.cantrips.some((spellId) => spellId === access.spell.id)
    : spellList.leveled.some(
        ({ spellId, spellLevel }) =>
          spellId === access.spell.id &&
          spellLevel === access.spell.mechanics.level,
      );
}

function magicInitiateFreeCastEntryIssue(
  access: ReturnType<typeof magicInitiateSpellAccessEntries>[number],
  matchingFreeCasts: readonly CharacterBattleSpellAccessFreeCastResourceInit[],
): readonly string[] {
  if (access.preparation === "alwaysPrepared") {
    return matchingFreeCasts.length === 1 &&
      matchingFreeCasts[0]?.spellAccessFreeCast.count === 1
      ? []
      : [
          "Magic Initiate Spell Access must correlate with exactly one matching free-cast resource for its leveled spell only.",
        ];
  }
  return matchingFreeCasts.length === 0
    ? []
    : [
        "Magic Initiate cantrip Spell Access must not have a free-cast resource.",
      ];
}

function magicInitiateSpellAccessEntries(
  source: CharacterBattleSpellAccessInit,
): readonly [
  {
    readonly spell: SpellRecord;
    readonly preparation: "learnedCantrip";
  },
  {
    readonly spell: SpellRecord;
    readonly preparation: "learnedCantrip";
  },
  {
    readonly spell: SpellRecord;
    readonly preparation: "alwaysPrepared";
  },
] {
  return [
    { spell: source.cantrips[0], preparation: "learnedCantrip" },
    { spell: source.cantrips[1], preparation: "learnedCantrip" },
    { spell: source.levelOneSpell, preparation: "alwaysPrepared" },
  ];
}

export function characterSpellcastingState(
  input: CharacterBattleSpellcastingStateInit,
  classLevels: readonly CharacterBattleClassLevel[],
  resources: readonly CharacterBattleResourceState[],
  resourceOwnership: readonly CharacterBattleResourceOwnership[],
  scopeRef: BattleCharacterExecutionScopeRef,
): CharacterBattleSpellcastingState {
  const spellcastingSource = input.spellcastingSource;
  const spellSlotExpenditures =
    input.spellSlotExpenditures ??
    input.spellSlots.map((slot) => ({
      spellLevel: slot.spellLevel,
      expended: resourceCount(0),
    }));
  const spellAccessEntries = input.spellAccesses.flatMap((source) =>
    magicInitiateSpellAccessEntries(source).map((access) => ({
      source,
      access,
    })),
  );
  return {
    spellcastingSource:
      spellcastingSource.tag === "spellAccessOnly"
        ? spellcastingSource
        : {
            ...spellcastingSource,
            className: spellcastingSourceClassName(
              spellcastingSource.className,
              classLevels,
            ),
            abilityModifier: abilityModifier(
              spellcastingSource.abilityModifier,
            ),
          },
    proficiencyBonus: input.proficiencyBonus,
    canCastSpells: input.canCastSpells,
    cantrips:
      spellcastingSource.tag === "spellAccessOnly"
        ? []
        : input.cantrips.map((spell) =>
            admittedSpellWithFreeCastRefs(
              spell,
              {
                tag: "classSpellcasting",
                className: spellcastingSource.className,
                abilityModifier: abilityModifier(
                  spellcastingSource.abilityModifier,
                ),
              },
              resources,
              resourceOwnership,
            ),
          ),
    preparedSpells:
      spellcastingSource.tag === "spellAccessOnly"
        ? []
        : preparedSpellsWithFeatureAccess(
            input.preparedSpells,
            input.featurePreparedSpells,
          ).map((spell) =>
            admittedSpellWithFreeCastRefs(
              spell,
              {
                tag: "classSpellcasting",
                className: spellcastingSource.className,
                abilityModifier: abilityModifier(
                  spellcastingSource.abilityModifier,
                ),
              },
              resources,
              resourceOwnership,
            ),
          ),
    spellAccesses: spellAccessEntries.map(({ source, access }, ordinal) => {
      const sourceUnitId = source.source.sourceUnit.id;
      return {
        spell: access.spell,
        castingSource: {
          tag: "spellAccess" as const,
          spellAccessRef: battleSpellAccessExecutionRef(
            scopeRef,
            NonNegativeInteger(ordinal),
          ),
          abilityModifier: abilityModifier(source.spellcastingAbilityModifier),
        },
        spellAccessFreeCastResourcePoolRefs: resourceOwnership.flatMap(
          (owner) =>
            owner.unit.id === sourceUnitId &&
            owner.purpose.tag === "spellAccessFreeCast" &&
            owner.purpose.spellId === access.spell.id
              ? [owner.resourcePoolRef]
              : [],
        ),
      };
    }),
    spellbookRitualSpellAccesses: input.spellbookRitualSpellAccesses,
    bookOfShadowsSpellAccesses: input.bookOfShadowsSpellAccesses,
    invocationSpellAccesses: input.invocationSpellAccesses,
    spellSlots: input.spellSlots.map((slot) => {
      const expenditure = spellSlotExpenditures.find(
        (candidate) => candidate.spellLevel === slot.spellLevel,
      );
      /* v8 ignore start -- @preserve -- The preceding length, membership, and uniqueness checks establish an expenditure for every admitted slot. */
      if (expenditure === undefined) {
        throw new Error(
          "Spell Slot expenditure state must match slot capacity.",
        );
      }
      /* v8 ignore stop -- @preserve */
      return {
        spellLevel: spellSlotLevel(slot.spellLevel),
        count: resourceCount(slot.count),
        expended: resourceCount(expenditure.expended),
      };
    }),
  };
}

function pactOfTheChainSpawnedCompanionSpellProfileForSpell(
  spell: SpellRecord,
): PactOfTheChainSpawnedCompanionSpellProfileParseResult {
  const components = spell.mechanics.components;
  const castingTime = topLevelSpellCastingTime(spell.mechanics);

  if (spell.mechanics.family !== "spawned_creature") {
    return { tag: "unsupported" };
  }
  if (spell.mechanics.creature.kind !== "familiar_form_catalog") {
    return { tag: "missingFamiliarFormCatalog" };
  }
  if (
    spell.mechanics.level !== 1 ||
    castingTime?.kind !== "action" ||
    !("materialCostGp" in components) ||
    !("materialConsumed" in components) ||
    components.materialCostGp !== 10 ||
    components.materialConsumed !== true
  ) {
    return { tag: "unsupported" };
  }
  const eligibleForms =
    pactOfTheChainSpawnedCompanionFormEligibilityForSpell(spell);
  return eligibleForms === null
    ? { tag: "missingFamiliarFormCatalog" }
    : {
        tag: "parsed",
        profile: {
          spell: {
            ...spell,
            mechanics: {
              ...spell.mechanics,
              creature: spell.mechanics.creature,
            },
          },
          eligibleForms,
        },
      };
}

function unitGrantsPreparedSpellAccess(
  unit: UnitRecord,
  sourceUnitId: UnitRecord["id"],
  spellId: SpellRecord["id"],
): boolean {
  return (
    unit.id === sourceUnitId &&
    unit.kind === "class_feature" &&
    unit.mechanics.family === "passive" &&
    unit.mechanics.grants.some(
      (grant): grant is SpellAccessGrant =>
        grant.kind === "grant_spell_access" &&
        grant.mode === "prepared" &&
        grant.spellId === spellId,
    )
  );
}

function preparedSpellsWithFeatureAccess(
  preparedSpells: readonly SpellRecord[],
  featurePreparedSpells: readonly CharacterBattleFeaturePreparedSpellInit[],
): readonly SpellRecord[] {
  return distinctSpellsById([
    ...preparedSpells,
    ...featurePreparedSpells.map((featureSpell) => featureSpell.spell),
  ]);
}

function distinctSpellsById(
  spells: readonly SpellRecord[],
): readonly SpellRecord[] {
  const seenSpellIds = new Set<SpellRecord["id"]>();
  const distinct: SpellRecord[] = [];
  for (const spell of spells) {
    if (!seenSpellIds.has(spell.id)) {
      seenSpellIds.add(spell.id);
      distinct.push(spell);
    }
  }
  return distinct;
}

function spellcastingSourceClassName(
  sourceClassName: ClassName,
  classLevels: readonly CharacterBattleClassLevel[],
): ClassName {
  if (
    classLevels.some((classLevel) => classLevel.className === sourceClassName)
  ) {
    return sourceClassName;
  }
  /* v8 ignore next -- @preserve -- Character spellcasting admission checks the source class against the admitted class-level set before state projection. */
  throw new Error(
    "Battle spellcasting source class must match a character class level.",
  );
}

function supportedResourceCapForLevel(
  resource: LimitedUseCountActivationResource | SupportedPointPoolResource,
  level: number,
  capAbilityModifier: AbilityModifier | undefined,
): ResourceCount {
  if (resource.cap.kind === "fixed") {
    return resourceCount(resource.cap.uses);
  }
  if (resource.cap.kind === "proficiency_bonus") {
    return resourceCount(
      proficiencyBonusForCharacterLevel(characterLevel(level)),
    );
  }
  if (resource.cap.kind === "linear_per_level") {
    return resourceCount(
      resource.cap.base +
        Math.max(0, level - resource.cap.startingAtLevel) *
          resource.cap.perLevel,
    );
  }
  if (resource.cap.kind === "ability_modifier") {
    if (capAbilityModifier === undefined) {
      throw new Error(
        "Ability-modifier resource cap requires the projected ability modifier.",
      );
    }
    return resourceCount(
      Math.max(
        resource.cap.minimum === undefined ? 1 : resource.cap.minimum,
        1,
        Number(abilityModifier(capAbilityModifier)),
      ),
    );
  }

  return resourceCount(
    resource.cap.tiers.reduce(
      (cap, tier) => (level >= tier.atLevel ? tier.value : cap),
      resource.cap.base,
    ),
  );
}
