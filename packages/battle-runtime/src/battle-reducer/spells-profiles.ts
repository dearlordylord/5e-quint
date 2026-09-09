// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-created-held-object
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-object-contact-damage
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ongoing-spell-ending
// Spell profile predicates and projections aggregate per-procedure
// `supported*Profile`
// predicates, spell-specific authoring bodies (faerieFire, animalFriendship,
// colorSpray, entangle), targeting/range/cost helpers, shape predicates,
// and equality helpers.
//
// This is a leaf module within the spells subsystem. It depends on spell-effect
// and domain vocabulary plus Surface types; discovery, holes/fills, resolution,
// and turn processing consume it.

// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-flaming-sphere-hazard-ram
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spike-growth-movement-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-web-restraint-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-sleet-storm-area-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-insect-plague-area-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magical-darkness-point-origin
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-levitated-creature
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MAGICAL_DARKNESS_POINT_ORIGIN_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL_ACCESS.MAGIC_INITIATE_CASTING
// UNIT-PROFILE-COVERAGE: runtime-owner battle.spell-access-magic-initiate-casting

import { spellSlotLevel } from "@dnd/shared/types";
import { Match } from "effect";
import {
  type BattleCreatureState,
  type BattleState,
  type SupportedSpellInvocation,
} from "../battle-state-execution.ts";
import type { CharacterBattleSpellcastingState } from "../character-battle-resources.ts";
import {
  admittedSpellToAdmissionSource,
  effectiveCharacterBattleCantrips,
  effectiveCharacterBattlePreparedSpells,
  spellRecordToAdmissionSource,
} from "../character-battle-resources.ts";

export * from "./spells-profiles-attack-damage.ts";

import { admitPersistentArmorEffectInvocationSpellAccess } from "./spell-procedure-profiles/persistent-armor-effect.ts";
import {
  admitRegisteredSpellProcedures,
  admitRegisteredStaticSpellMechanics,
} from "./spell-procedure-profiles/admission-registry.ts";
import type { RegisteredAdmittedStaticSpellMechanics } from "./spell-procedure-profiles/registry.ts";
import { spellProcedureNonEmpty } from "./spell-procedure-profiles/spell-mechanics-admission.ts";
import type { RegisteredSpellProcedureAdmissionIssue } from "./spell-procedure-profiles/registry.ts";
import { spellAdmissionContextFor } from "./spell-procedure-profiles/admission-context.ts";
import { activeOngoingFeaturesPreventSpellInvocation } from "./spells-invocation-guards.ts";
import { characterBattleResourcePoolRefHasUsesRemaining } from "../character-battle-resource-execution.ts";

type AdmittedSpellActsResult =
  | {
      readonly tag: "admitted";
      readonly invocations: readonly SupportedSpellInvocation[];
      readonly staticMechanics: readonly RegisteredAdmittedStaticSpellMechanics[];
    }
  | {
      readonly tag: "rejected";
      readonly issues: readonly [
        RegisteredSpellProcedureAdmissionIssue,
        ...RegisteredSpellProcedureAdmissionIssue[],
      ];
    };

export function admittedSpellActs(
  actor: BattleCreatureState,
  state: BattleState,
  spellcasting: CharacterBattleSpellcastingState | undefined,
): AdmittedSpellActsResult {
  if (actor.origin.kind !== "character") {
    return { tag: "admitted", invocations: [], staticMechanics: [] };
  }
  if (spellcasting === undefined) {
    return { tag: "admitted", invocations: [], staticMechanics: [] };
  }
  if (!spellcasting.canCastSpells) {
    return admittedStaticSpellMechanicsWhenCastingBlocked(spellcasting);
  }
  const preparedSpells = effectiveCharacterBattlePreparedSpells(spellcasting);
  const cantrips = effectiveCharacterBattleCantrips(spellcasting);
  const admissionContext = spellAdmissionContextFor(actor, state);
  if (admissionContext === null) {
    return { tag: "admitted", invocations: [], staticMechanics: [] };
  }

  const admittedSpellSources = [...preparedSpells, ...cantrips].map(
    admittedSpellToAdmissionSource,
  );
  const spellcastingSource = spellcasting.spellcastingSource;
  admittedSpellSources.push(
    ...spellcasting.spellAccesses.map(admittedSpellToAdmissionSource),
  );

  const actorResources = actor.origin.resources;
  const profileAdmissions: SupportedSpellInvocation[] = [];
  const staticMechanics: RegisteredAdmittedStaticSpellMechanics[] = [];
  const profileAdmissionIssues: RegisteredSpellProcedureAdmissionIssue[] = [];
  for (const spell of admittedSpellSources) {
    const admission = admitRegisteredSpellProcedures(spell, {
      ...admissionContext,
      castingSource: spell.castingSource,
      spellCastOptions: [
        ...admissionContext.spellCastOptions,
        ...(spell.spellDefinitionRuleFacts.level === 0
          ? []
          : spell.spellAccessFreeCastResourcePoolRefs
              .filter((resourcePoolRef) =>
                characterBattleResourcePoolRefHasUsesRemaining(
                  actorResources,
                  resourcePoolRef,
                ),
              )
              .map((resourcePoolRef) => ({
                spellLevel: spellSlotLevel(
                  spell.spellDefinitionRuleFacts.level,
                ),
                payment: {
                  tag: "spellAccessFreeCast" as const,
                  resourcePoolRef,
                },
              }))),
      ],
    });
    Match.value(admission).pipe(
      Match.discriminatorsExhaustive("tag")({
        notBattleOwned: () => undefined,
        admitted: ({
          invocations,
          staticMechanics: admittedStaticMechanics,
        }) => {
          profileAdmissions.push(...invocations);
          staticMechanics.push(...admittedStaticMechanics);
        },
        rejected: ({ issues }) => profileAdmissionIssues.push(...issues),
      }),
    );
  }
  const ritualAdmissions = spellbookRitualStaticMechanics(
    spellcasting,
    admittedSpellSources,
  );
  staticMechanics.push(...ritualAdmissions.staticMechanics);
  profileAdmissionIssues.push(...ritualAdmissions.issues);
  const nonEmptyProfileAdmissionIssues = spellProcedureNonEmpty(
    profileAdmissionIssues,
  );
  if (nonEmptyProfileAdmissionIssues !== undefined) {
    return { tag: "rejected", issues: nonEmptyProfileAdmissionIssues };
  }
  const admittedInvocations = [
    ...profileAdmissions,
    ...spellcasting.invocationSpellAccesses.flatMap((access) =>
      access.tag === "armorOfShadowsMageArmor" &&
      spellcastingSource.tag === "classSpellcasting"
        ? admitPersistentArmorEffectInvocationSpellAccess(actor.combatantId, {
            spell: {
              ...access.admission.spell,
              spellAccessFreeCastResourcePoolRefs: [],
              castingSource: {
                tag: "classSpellcasting",
                className: spellcastingSource.className,
                abilityModifier: spellcastingSource.abilityModifier,
              },
            },
            executionFacts: access.admission.executionFacts,
          })
        : [],
    ),
  ].filter(
    (invocation) =>
      !activeOngoingFeaturesPreventSpellInvocation(state, actor, invocation),
  );
  return {
    tag: "admitted",
    invocations: admittedInvocations,
    staticMechanics,
  };
}

function admittedStaticSpellMechanicsWhenCastingBlocked(
  spellcasting: CharacterBattleSpellcastingState,
): AdmittedSpellActsResult {
  const ritualAdmissions = spellbookRitualStaticMechanics(spellcasting, []);
  const nonEmptyRitualAdmissionIssues = spellProcedureNonEmpty(
    ritualAdmissions.issues,
  );
  if (nonEmptyRitualAdmissionIssues !== undefined) {
    return {
      tag: "rejected",
      issues: nonEmptyRitualAdmissionIssues,
    };
  }
  return {
    tag: "admitted",
    invocations: [],
    staticMechanics: ritualAdmissions.staticMechanics,
  };
}

function spellbookRitualStaticMechanics(
  spellcasting: CharacterBattleSpellcastingState,
  admittedSpellSources: readonly ReturnType<
    typeof admittedSpellToAdmissionSource
  >[],
): {
  readonly staticMechanics: readonly RegisteredAdmittedStaticSpellMechanics[];
  readonly issues: readonly RegisteredSpellProcedureAdmissionIssue[];
} {
  const staticMechanics: RegisteredAdmittedStaticSpellMechanics[] = [];
  const issues: RegisteredSpellProcedureAdmissionIssue[] = [];
  const spellcastingSource = spellcasting.spellcastingSource;
  if (spellcastingSource.tag !== "classSpellcasting") {
    return { staticMechanics, issues };
  }
  for (const { spell } of spellcasting.spellbookRitualSpellAccesses) {
    if (admittedSpellSources.some((source) => source.id === spell.id)) continue;
    const source = spellRecordToAdmissionSource(spell, {
      tag: "classSpellcasting",
      className: spellcastingSource.className,
      abilityModifier: spellcastingSource.abilityModifier,
    });
    const admission = admitRegisteredStaticSpellMechanics(source);
    Match.value(admission).pipe(
      Match.discriminatorsExhaustive("tag")({
        notBattleOwned: () => undefined,
        admitted: ({ procedures }) => staticMechanics.push(...procedures),
        rejected: ({ issues: rejectedIssues }) =>
          issues.push(...rejectedIssues),
      }),
    );
  }
  return { staticMechanics, issues };
}

export { supportedSpellActs } from "./supported-spell-acts.ts";
