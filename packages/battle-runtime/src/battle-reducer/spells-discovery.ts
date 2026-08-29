// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-created-held-object
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-object-contact-damage
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spiritual-weapon-attack-proxy
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-governor-quickened
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-damage-type-substitution
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-effective-level-extra-target
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magic-suppression-action-interdiction
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_TRANSMUTED_DAMAGE_TYPE_SUBSTITUTION
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_TWINNED_EFFECTIVE_LEVEL_EXTRA_TARGET
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ANTIMAGIC_FIELD_ACTION_INTERDICTION
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE
// Spell discovery finds per-actor SupportedSpellInvocation acts, computes cast-summary
// strings, classifies invocations, and synthesises the optional readied-spell
// variant for each cast act.
//
// KERNEL-COVERAGE: runtime-owner BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES BATTLE.COMMAND.OPTION_AND_NEXT_TURN
import { Match } from "effect";
import type { CombatantId } from "../identity.ts";
import { BATTLE_READIED_SPELL_TRIGGERS } from "../battle-interrupt-triggers.ts";
import type { CharacterProcedureBattleSubject } from "../battle-subjects.ts";
import {
  spellInvocationIsSpellcasting,
  spellActTurnResourceAvailable,
  spellHasAvailableSpend,
} from "./spell-turn-resources.ts";
import { supportedSpellActs } from "./supported-spell-acts.ts";
import {
  spellProcedureExecutionFor,
  type RegisteredSpellProcedure,
  type SpellProcedureExecutionRegistry,
} from "./spell-procedure-profiles/execution-registry.ts";
import {
  spellInvocationHasReadiedSpellExecutionShape,
  type ReadiedSpellRuntimeLaneInvocation,
} from "./spell-execution-facts.ts";
import { spellCastReactionFactsHole } from "./spell-cast-interrupt-frame.ts";
import {
  combatantInsideActiveAntimagicFieldAura,
  spellInvocationActInterdictedByAntimagicField,
} from "./magic-suppression-action-interdiction.ts";
import {
  spellCastInterruptionReactionCapableReactors,
  spellCastCanTriggerSpellCastInterruption,
  type SpellCastInterruptionCapableReactor,
} from "./spell-cast-interruption-reaction-discovery.ts";
import { turnConstraintSomaticSpellFailureOutcomeHole } from "./save-gated-turn-constraint-facts.ts";
import {
  type BattleActDiscoveryCandidate,
  type BattleCreatureState,
  type BattleExecutableSpellInvocation,
  type BattleHole,
  type BattleState,
  type SupportedSpellInvocation,
} from "../battle-state-execution.ts";
import {
  actorCanOfferQuickenedSpellMetamagic,
  admitSpellMetamagicApplications,
  discoverTransmutedSpellMetamagicSelections,
  discoverTwinnedSpellMetamagicSelections,
  QUICKENED_SPELL_METAMAGIC_SELECTION,
  spellInvocationSupportsQuickenedActionRewrite,
  spellMetamagicApplications,
  twinnedSpellTargetCountInvocation,
} from "./metamagic.ts";
import { spellSubjectTagForInvocation } from "./spell-execution-facts.ts";
import { isTriggeredReactionSpellInvocation } from "./spell-interrupt-procedure-kinds.ts";
import type {
  RuntimeSpellProcedureExecution,
  SpellProcedureExecution,
} from "../character-execution.ts";

function discoverRegisteredSpellProcedureCastAct(
  executionRegistry: SpellProcedureExecutionRegistry,
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation,
): readonly BattleActDiscoveryCandidate[] {
  const executionFor = <Procedure extends RegisteredSpellProcedure>(
    procedure: Procedure,
  ) => spellProcedureExecutionFor(executionRegistry, procedure);
  return Match.value(invocation).pipe(
    Match.discriminatorsExhaustive("procedure")({
      damageReduction: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      rollModifier: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      makeStable: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      heldLight: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      heldLightHurl: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      objectLight: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      temporaryAbilityCheckRollMode: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      perceptionGatedAttackRollDefense: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      seeInvisibleObserverSight: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      duplicateHitInterception: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      persistentArmorEffect: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      weaponAttackDamageEnhancement: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      linkedDefenseResistanceDamageShare: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      creatureTypeProtection: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      conditionRemovalProtection: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      chosenDamageResistance: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      compositeTargetBuffWithAftermath: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      directCondition: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      directConditionRemoval: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      conditionImmunityAndTurnStartTemporaryHitPoints: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      creatureSizeIncrease: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      creatureSizeDecrease: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      controlledVerticalSuspension: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      scalarBuff: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      directHitPointRestoration: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      grantedAlternateActionCost: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      fixedCostMovementReplacement: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      /* v8 ignore start -- @preserve -- Triggered Feather Fall invocations are removed by isTriggeredReactionSpellInvocation before ordinary cast-act dispatch. */
      fallingCreatureMitigationReaction: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      /* v8 ignore stop -- @preserve */
      selfTeleport: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      selfTransformationMode: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      grantedAreaSaveDamageAction: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      targetingSaveInterdiction: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      markedDamageRider: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      weaponDamageRider: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      afterHitDamage: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      afterHitSaveGatedCondition: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      afterHitTimedDamageAndSave: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      afterHitDamageAndIllumination: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      weaponAttackOverride: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      spellHostedWeaponAttack: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      saveGatedDamage: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      saveGatedCondition: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      saveGatedConditionImmunity: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      saveGatedAttackRollAdvantage: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      abilityD20TestRollModeSaveGate: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      stagedSaveCondition: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      saveGatedConditionWithRepeat: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      saveGatedAreaControl: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      saveGatedTurnConstraintBundle: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      persistentAreaSaveCondition: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      directionalPersistentArea: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      persistentAreaSaveDamage: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      persistentAreaTrait: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      areaMovementDistanceDamage: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      persistentAreaSaveConditionEscape: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      persistentAreaSaveComposite: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      magicalDarknessPointOrigin: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      magicSuppressionEmanation: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      compelledNextTurnBehavior: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      /* v8 ignore start -- @preserve -- Triggered spell-interruption invocations are removed by isTriggeredReactionSpellInvocation before ordinary cast-act dispatch. */
      spellCastInterruptionReaction: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Shield is removed explicitly before ordinary cast-act dispatch and is discovered only from an attack trigger. */
      triggeredArmorDefense: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      /* v8 ignore stop -- @preserve */
      spellAttackDamage: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      spellAttackSequence: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      spellCreatedHeldObject: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      spellCreatedHeldObjectAttack: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      spellCreatedHeldObjectReEvoke: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      spatialMeleeSpellAttackProxy: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      objectContactDamage: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      objectContactDamageRepeat: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      ongoingSpellEnd: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      chainedSpellAttackDamage: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      attackBurstSaveDamage: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      repeatedDamageAllocation: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
      movableLightManifestation: (value) =>
        executionFor(value.procedure).discoverCastAct(state, actorId, value),
    }),
  );
}

export function discoverSupportedSpellInvocations(
  state: BattleState,
  actorId: CombatantId,
  executionRegistry: SpellProcedureExecutionRegistry,
): readonly BattleActDiscoveryCandidate[] {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    return [];
  }
  const spellcastingPreventedByAntimagicField =
    combatantInsideActiveAntimagicFieldAura(state, actorId);
  const invocations = supportedSpellActs(state, actor);
  const executionInvocations = invocations;
  const interruptionReactors =
    spellCastInterruptionReactionCapableReactors(state);
  const acts = invocations.flatMap(
    (invocation): readonly BattleActDiscoveryCandidate[] => {
      const executionInvocation = invocation;
      if (executionInvocation.procedure === "triggeredArmorDefense") {
        return [];
      }
      if (isTriggeredReactionSpellInvocation(executionInvocation)) {
        return [];
      }
      if (
        spellcastingPreventedByAntimagicField &&
        spellInvocationActInterdictedByAntimagicField(executionInvocation)
      ) {
        return [];
      }
      if (!spellHasAvailableSpend(actor, executionInvocation)) {
        return [];
      }
      if (!spellInvocationCasterPrerequisiteIsMet(actor, executionInvocation)) {
        return [];
      }
      const naturalTurnResourceAvailable = spellActTurnResourceAvailable(
        state.currentTurnResources,
        actorId,
        executionInvocation,
      );
      const quickenedTurnResourceAvailable =
        spellInvocationSupportsQuickenedActionRewrite(executionInvocation) &&
        actorCanOfferQuickenedSpellMetamagic({
          state,
          actor,
          actorId,
          invocation: executionInvocation,
        });
      if (!naturalTurnResourceAvailable && !quickenedTurnResourceAvailable) {
        return [];
      }
      return discoverRegisteredSpellProcedureCastAct(
        executionRegistry,
        state,
        actorId,
        executionInvocation,
      );
    },
  );
  return acts
    .flatMap((act) =>
      spellActWithQuickenedRewrite({
        act,
        state,
        actor,
        actorId,
        invocations: executionInvocations,
        executionRegistry,
      }),
    )
    .flatMap((act) =>
      spellActWithTransmutedDamageType({
        act,
        actor,
        invocations: executionInvocations,
      }),
    )
    .flatMap((act) =>
      spellActWithTwinnedTargetCount({
        act,
        state,
        actor,
        actorId,
        invocations: executionInvocations,
        executionRegistry,
      }),
    )
    .map((act) =>
      spellCastReactionFactsAct(
        state,
        actor,
        actorId,
        executionInvocations,
        interruptionReactors,
        act,
      ),
    );
}

function spellActWithQuickenedRewrite(input: {
  readonly act: BattleActDiscoveryCandidate;
  readonly state: BattleState;
  readonly actor: BattleCreatureState;
  readonly actorId: CombatantId;
  readonly invocations: readonly BattleExecutableSpellInvocation[];
  readonly executionRegistry: SpellProcedureExecutionRegistry;
}): readonly BattleActDiscoveryCandidate[] {
  const subject = input.act.subject;
  if (subject.tag !== "actionSpell") {
    return [input.act];
  }
  const invocation = input.invocations.find(
    (candidate) => candidate.sourceProcedureRef === subject.procedureRef,
  );
  if (invocation === undefined) {
    return [input.act];
  }
  const naturalActs = spellActTurnResourceAvailable(
    input.state.currentTurnResources,
    input.actorId,
    invocation,
  )
    ? [input.act]
    : [];
  if (subject.mode.tag !== "cast" || subject.metamagic !== undefined) {
    return naturalActs;
  }
  const quickenedActs =
    spellInvocationSupportsQuickenedActionRewrite(invocation) &&
    actorCanOfferQuickenedSpellMetamagic({
      state: input.state,
      actor: input.actor,
      actorId: input.actorId,
      invocation,
    })
      ? [
          {
            ...input.act,
            subject: {
              tag: "bonusActionSpell" as const,
              actorId: input.actorId,
              procedureRef: subject.procedureRef,
              mode: subject.mode,
              metamagic: QUICKENED_SPELL_METAMAGIC_SELECTION,
            },
          },
        ]
      : [];
  return [...naturalActs, ...quickenedActs];
}

function spellActWithTransmutedDamageType(input: {
  readonly act: BattleActDiscoveryCandidate;
  readonly actor: BattleCreatureState;
  readonly invocations: readonly BattleExecutableSpellInvocation[];
}): readonly BattleActDiscoveryCandidate[] {
  const subject = input.act.subject;
  if (
    subject.tag !== "actionSpell" ||
    subject.mode.tag !== "cast" ||
    subject.metamagic !== undefined
  ) {
    return [input.act];
  }
  const invocation = input.invocations.find(
    (candidate) => candidate.sourceProcedureRef === subject.procedureRef,
  );
  if (invocation === undefined) {
    return [input.act];
  }
  const transmutedActs = discoverTransmutedSpellMetamagicSelections({
    actor: input.actor,
    invocation,
  }).map((metamagic) => {
    return {
      ...input.act,
      subject: {
        ...subject,
        metamagic,
      },
    };
  });
  return [input.act, ...transmutedActs];
}

function spellActWithTwinnedTargetCount(input: {
  readonly act: BattleActDiscoveryCandidate;
  readonly state: BattleState;
  readonly actor: BattleCreatureState;
  readonly actorId: CombatantId;
  readonly invocations: readonly BattleExecutableSpellInvocation[];
  readonly executionRegistry: SpellProcedureExecutionRegistry;
}): readonly BattleActDiscoveryCandidate[] {
  const subject = input.act.subject;
  if (
    (subject.tag !== "actionSpell" && subject.tag !== "bonusActionSpell") ||
    subject.mode.tag !== "cast" ||
    subject.metamagic !== undefined
  ) {
    return [input.act];
  }
  const invocation = input.invocations.find(
    (candidate) => candidate.sourceProcedureRef === subject.procedureRef,
  );
  if (invocation === undefined) {
    return [input.act];
  }
  const twinnedActs = discoverTwinnedSpellMetamagicSelections({
    actor: input.actor,
    invocation,
  }).flatMap((metamagic) => {
    const twinnedInvocation = twinnedSpellTargetCountInvocation(
      invocation,
      spellMetamagicApplications(input.actor, metamagic),
    );
    return discoverRegisteredSpellProcedureCastAct(
      input.executionRegistry,
      input.state,
      input.actorId,
      twinnedInvocation,
    )
      .filter((act) => {
        const generatedSubject = act.subject;
        return (
          (generatedSubject.tag === "actionSpell" ||
            generatedSubject.tag === "bonusActionSpell") &&
          generatedSubject.mode.tag === "cast" &&
          generatedSubject.metamagic === undefined
        );
      })
      .map((act) => ({
        ...act,
        subject: {
          ...act.subject,
          metamagic,
        },
      }));
  });
  return [input.act, ...twinnedActs];
}

function spellCastReactionFactsAct(
  state: BattleState,
  actor: BattleCreatureState,
  actorId: CombatantId,
  invocations: readonly BattleExecutableSpellInvocation[],
  interruptionReactors: readonly SpellCastInterruptionCapableReactor[],
  act: BattleActDiscoveryCandidate,
): BattleActDiscoveryCandidate {
  const subject = act.subject;
  if (
    (subject.tag !== "actionSpell" &&
      subject.tag !== "bonusActionSpell" &&
      subject.tag !== "bonusActionDashSpell") ||
    (subject.mode.tag !== "cast" && subject.mode.tag !== "ready")
  ) {
    return act;
  }
  const invocation = invocations.find(
    (candidate) => candidate.sourceProcedureRef === subject.procedureRef,
  );
  return invocation === undefined
    ? act
    : {
        ...act,
        initialHoles: spellCastInitialHoles(
          state,
          actor,
          subject,
          actorId,
          invocation,
          interruptionReactors,
          act.initialHoles,
        ),
      };
}

function spellCastInitialHoles(
  state: BattleState,
  actor: BattleCreatureState,
  subject: Extract<
    CharacterProcedureBattleSubject,
    {
      readonly tag: "actionSpell" | "bonusActionSpell" | "bonusActionDashSpell";
    }
  >,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation,
  interruptionReactors: readonly SpellCastInterruptionCapableReactor[],
  holes: readonly BattleHole[],
): readonly BattleHole[] {
  const metamagicApplications =
    subject.tag === "actionSpell" || subject.tag === "bonusActionSpell"
      ? admittedSpellMetamagicApplications({
          state,
          actor,
          actorId,
          invocation,
          subject,
        })
      : [];
  const turnConstraintHole = turnConstraintSomaticSpellFailureOutcomeHole({
    state,
    actorId,
    invocation,
    metamagicApplications,
  });
  const interruptionHole = spellCastCanTriggerSpellCastInterruption({
    casterId: actorId,
    invocation,
    reactors: interruptionReactors,
  })
    ? spellCastReactionFactsHole({ casterId: actorId, invocation })
    : null;
  return [
    ...holes,
    ...(turnConstraintHole === null ? [] : [turnConstraintHole]),
    ...(interruptionHole === null ? [] : [interruptionHole]),
  ];
}

function admittedSpellMetamagicApplications(input: {
  readonly state: BattleState;
  readonly actor: BattleCreatureState;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation;
  readonly subject: Extract<
    CharacterProcedureBattleSubject,
    { readonly tag: "actionSpell" | "bonusActionSpell" }
  >;
}) {
  const admission = admitSpellMetamagicApplications(input);
  return admission.tag === "ok" ? admission.applications : [];
}

export function spellCastSelectionSubject(
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation,
): Extract<
  CharacterProcedureBattleSubject,
  { readonly tag: "actionSpell" | "bonusActionSpell" }
> {
  return spellSubjectTagForInvocation(invocation) === "actionSpell"
    ? {
        tag: "actionSpell",
        actorId,
        procedureRef: invocation.sourceProcedureRef,
        mode: { tag: "cast" },
      }
    : {
        tag: "bonusActionSpell",
        actorId,
        procedureRef: invocation.sourceProcedureRef,
        mode: { tag: "cast" },
      };
}

export { spellInvocationIsSpellcasting };

export function spellInvocationCasterPrerequisiteIsMet(
  actor: BattleCreatureState,
  invocation: BattleExecutableSpellInvocation,
): boolean {
  return (
    (invocation.procedure !== "heldLightHurl" ||
      actor.activeEffects.some(
        (effect) =>
          effect.kind === "heldLight" &&
          effect.effectRef === invocation.sourceEffectRef &&
          effect.sourceCombatantId === actor.combatantId,
      )) &&
    (invocation.procedure !== "spellCreatedHeldObjectAttack" ||
      actor.activeEffects.some(
        (effect) =>
          effect.kind === "spellCreatedHeldObject" &&
          effect.effectRef === invocation.sourceEffectRef &&
          effect.sourceProcedureRef ===
            invocation.sourceHeldObjectProcedureRef &&
          effect.sourceCombatantId === actor.combatantId &&
          effect.objectState.kind === "held",
      )) &&
    (invocation.procedure !== "spellCreatedHeldObjectReEvoke" ||
      actor.activeEffects.some(
        (effect) =>
          effect.kind === "spellCreatedHeldObject" &&
          effect.effectRef === invocation.sourceEffectRef &&
          effect.sourceProcedureRef ===
            invocation.sourceHeldObjectProcedureRef &&
          effect.sourceCombatantId === actor.combatantId &&
          effect.objectState.kind === "notHeld",
      )) &&
    (invocation.procedure !== "objectContactDamageRepeat" ||
      actor.activeEffects.some(
        (effect) =>
          effect.kind === "spellObjectContactDamage" &&
          effect.effectRef === invocation.activeEffect.effectRef &&
          effect.sourceCombatantId === actor.combatantId,
      )) &&
    (invocation.procedure !== "spatialMeleeSpellAttackProxy" ||
      invocation.operation !== "repositionAndAttack" ||
      actor.activeEffects.some(
        (effect) =>
          effect.kind === "spatialMeleeSpellAttackProxy" &&
          effect.effectRef === invocation.activeEffect.effectRef &&
          effect.sourceCombatantId === actor.combatantId,
      )) &&
    (invocation.procedure !== "movableLightManifestation" ||
      invocation.operation !== "reposition" ||
      actor.activeEffects.some(
        (effect) =>
          effect.kind === "movableLightManifestation" &&
          effect.effectRef === invocation.activeEffectRef &&
          effect.sourceCombatantId === actor.combatantId,
      ))
  );
}

export function isReadiedSpellInvocation<
  I extends SupportedSpellInvocation | RuntimeSpellProcedureExecution,
>(
  invocation: I,
): invocation is I &
  SpellProcedureExecution<ReadiedSpellRuntimeLaneInvocation> {
  return spellInvocationHasReadiedSpellExecutionShape(invocation);
}

export function readiedSpellAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation,
): readonly BattleActDiscoveryCandidate[] {
  if (
    !isReadiedSpellInvocation(invocation) ||
    state.readiedSpells.has(actorId)
  ) {
    return [];
  }
  return BATTLE_READIED_SPELL_TRIGGERS.map((trigger) => ({
    subject: {
      tag: "actionSpell" as const,
      actorId,
      procedureRef: invocation.sourceProcedureRef,
      mode: { tag: "ready" as const, trigger },
    },
    initialHoles: [],
  }));
}

export function targetListSpellUsesTargetListHole<
  Invocation extends { readonly targeting: { readonly kind: string } },
>(
  invocation: Invocation,
): invocation is Invocation &
  import("../battle-state-execution.ts").TargetListSpellInvocationOf<Invocation> {
  if (
    invocation.targeting.kind !== "targetList" &&
    invocation.targeting.kind !== "pointOriginSphereTargetList" &&
    invocation.targeting.kind !== "selfAndChosenLegalTargets"
  ) {
    return false;
  }
  if (
    !("maxTargets" in invocation.targeting) ||
    typeof invocation.targeting.maxTargets !== "number"
  ) {
    return true;
  }
  return invocation.targeting.maxTargets > 1;
}

// Spell invocation active-feature gates belong to cluster K but remain behind
// the shared spell act admission boundary until the dispatcher merge resolves
// cycle #25 (turn ↔ spells_discovery).
