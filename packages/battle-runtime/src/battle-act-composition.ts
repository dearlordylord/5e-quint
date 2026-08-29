import type {
  BattleActDiscoveryCandidate,
  BattleActPresentation,
  BattleState,
  CharacterBattleCreatureState,
  AvailableBattleAct,
} from "./battle-state-execution.ts";
import type { AuthoredSelectedSpellInvocation } from "./character-execution-admission.ts";
import type { BattleUnitRef } from "./battle-init.ts";
import { Match, Result } from "effect";
import { isCharacterProcedureBattleSubject } from "./battle-subjects.ts";
import { discoverBattleActCandidates } from "./battle-execution-composition.ts";
import { battleReducerRouteEventsForDiscoveredAct } from "./battle-reducer/reducer-route.ts";
import { supportedSpellInvocationRef } from "./battle-reducer/spells-invocation-ref.ts";
import type { BattleProcedureExecutionRef, CombatantId } from "./identity.ts";
import { spellActiveEffectForExecutionRef } from "./effect-execution-ref.ts";
import { boundAttackExecutionSelectionMatchesOption } from "./battle-action-options.ts";
import {
  attackActionOptionsForActor,
  offHandAttackActionOptionsForActor,
} from "./battle-reducer/attack-damage-apply.ts";
import { attackActionOptionPresentationName } from "./stat-block-presentation.ts";
import { maxFixedCostMovementReplacementDistanceFeet } from "./battle-reducer/fixed-cost-movement-replacement.ts";
import { statBlockProcedurePresentationsForActor } from "./stat-block-presentation.ts";
import type {
  BattleSubject,
  CharacterProcedureBattleSubject,
  SpellInvocationRef,
} from "./battle-subjects.ts";
import type {
  BattleRuntimeContext,
  BattleRuntimeSession,
} from "./battle-runtime-context.ts";
import {
  BONUS_ACTION_STANDARD_ACTION_PROCEDURE_QUERY,
  CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
  DRUID_WILD_SHAPE_PROCEDURE_QUERY,
  MONK_FOCUS_PROCEDURE_QUERY,
  characterSpellProcedure,
  characterSpellProcedureExecution,
  spellInvocationMatchesExecution,
  type BattleSpellProcedureExecution,
} from "./character-execution-admission.ts";
import { characterUnitProcedureRefsForAuthoredSelection } from "./battle-composition-admission.ts";
import { isCharacterBattleCreatureState } from "./battle-reducer/creature-state.ts";
import type { BattleActiveEffect } from "./active-effect/types.ts";
import type {
  RepositionMovableLightManifestationSpellProcedureExecution,
  RepeatSpatialMeleeSpellAttackProxyLiveSpellProcedureExecution,
} from "./procedure-execution/spell-procedure-execution.ts";

const byTag = Match.discriminator("tag");

type IntrinsicBattleSubject = Exclude<
  BattleSubject,
  CharacterProcedureBattleSubject
>;

export function battleActSpellPresentation(
  act: AvailableBattleAct,
): Extract<BattleActPresentation, { readonly kind: "spell" }> | undefined {
  return act.presentation.kind === "spell" ? act.presentation : undefined;
}

export function battleActSpellSlotPresentation(act: AvailableBattleAct):
  | (Extract<BattleActPresentation, { readonly kind: "spell" }> & {
      readonly invocation: Extract<
        SpellInvocationRef,
        { readonly tag: "spellSlot" }
      >;
    })
  | undefined {
  const presentation = battleActSpellPresentation(act);
  if (presentation?.invocation.tag !== "spellSlot") return undefined;
  return { ...presentation, invocation: presentation.invocation };
}

export function battleActUnitPresentation(
  act: AvailableBattleAct,
): Extract<BattleActPresentation, { readonly kind: "unit" }> | undefined {
  return act.presentation.kind === "unit" ? act.presentation : undefined;
}

export function battleActDruidWildShapePresentation(
  act: AvailableBattleAct,
):
  | Extract<BattleActPresentation, { readonly kind: "druidWildShapeForm" }>
  | undefined {
  return act.presentation.kind === "druidWildShapeForm"
    ? act.presentation
    : undefined;
}

export function discoverBattleActs(
  session: BattleRuntimeSession,
): readonly AvailableBattleAct[] {
  return presentBattleActs(session, discoverBattleActCandidates(session.state));
}

export function presentBattleActs(
  session: BattleRuntimeSession,
  candidates: readonly BattleActDiscoveryCandidate[],
): readonly AvailableBattleAct[] {
  const { state, context } = session;
  const acts = admitCharacterProcedureDiscoveryActs(state, context, candidates);
  return battleActsWithReducerRouteEvents(state, acts);
}

export function battleActsWithReducerRouteEvents<
  TAct extends BattleActDiscoveryCandidate,
>(state: BattleState, acts: readonly TAct[]): readonly TAct[] {
  return acts.map((act) => {
    const routeEvents = battleReducerRouteEventsForDiscoveredAct(state, act);
    return routeEvents === undefined ? act : { ...act, routeEvents };
  });
}

export function battleSubjectPresentation(
  session: BattleRuntimeSession,
  subject: BattleSubject,
): BattleActPresentation | undefined {
  if (isCharacterProcedureBattleSubject(subject)) {
    return characterProcedurePresentationJoin(
      session.state,
      session.context,
      subject,
    )?.presentation;
  }
  return intrinsicActPresentation(session.state, session.context, subject)
    ?.presentation;
}

export function battleAdmittedSpellPresentations(
  session: BattleRuntimeSession,
): readonly Extract<BattleActPresentation, { readonly kind: "spell" }>[] {
  return [...session.context.characters].flatMap(([actorId, context]) =>
    context.spellPresentationSources.flatMap((source) => {
      const correlated = spellPresentationSourceForProcedure(
        session.state,
        session.context,
        actorId,
        source.procedureRef,
      );
      if (correlated === undefined) return [];
      if (correlated.invocation.procedure === "spawnedCompanionLifecycle") {
        return [];
      }
      const presentation: Extract<
        BattleActPresentation,
        { readonly kind: "spell" }
      > = {
        kind: "spell",
        procedureRef: correlated.procedureRef,
        invocation: supportedSpellInvocationRef(correlated.invocation),
      };
      return [presentation];
    }),
  );
}

function admitCharacterProcedureDiscoveryActs(
  state: BattleState,
  context: BattleRuntimeContext,
  acts: readonly BattleActDiscoveryCandidate[],
): readonly AvailableBattleAct[] {
  const characterIds = new Set<CombatantId>();
  for (const [combatantId, combatant] of state.combatants) {
    if (combatant.origin.kind === "character") characterIds.add(combatantId);
  }
  return acts.flatMap((act) => {
    const subject = act.subject;
    if (!characterIds.has(subject.actorId)) {
      if (isCharacterProcedureBattleSubject(subject)) return [];
      const composed = composeIntrinsicAct(state, context, act, subject);
      return composed === undefined ? [] : [composed];
    }
    if (!isCharacterProcedureBattleSubject(subject)) {
      const composed = composeIntrinsicAct(state, context, act, subject);
      return composed === undefined ? [] : [composed];
    }
    const joined = characterProcedurePresentationJoin(state, context, subject);
    return joined === undefined ? [] : [{ ...act, ...joined, subject }];
  });
}

function composeIntrinsicAct(
  state: BattleState,
  context: BattleRuntimeContext,
  act: BattleActDiscoveryCandidate,
  subject: IntrinsicBattleSubject,
): AvailableBattleAct | undefined {
  const presentation = intrinsicActPresentation(state, context, subject);
  if (presentation === undefined) return undefined;
  return {
    ...act,
    ...presentation,
    subject,
  };
}

function intrinsicActPresentation(
  state: BattleState,
  context: BattleRuntimeContext,
  subject: IntrinsicBattleSubject,
): Pick<AvailableBattleAct, "label" | "summary" | "presentation"> | undefined {
  if (
    subject.tag === "runtimeCommand" &&
    (subject.command === "releaseReadiedSpell" ||
      subject.command === "castTriggeredReactionSpell" ||
      subject.command === "castAttackHitBonusActionSpell")
  ) {
    const spellOwnerId =
      subject.command === "releaseReadiedSpell"
        ? subject.readiedSpellCasterId
        : subject.command === "castTriggeredReactionSpell"
          ? subject.reactorId
          : subject.casterId;
    const source = spellPresentationSourceForProcedure(
      state,
      context,
      spellOwnerId,
      subject.procedureRef,
    );
    if (source === undefined) return undefined;
    if (source.invocation.procedure === "spawnedCompanionLifecycle") {
      return undefined;
    }
    const release = subject.command === "releaseReadiedSpell";
    return {
      label: `${release ? "Release " : "Cast "}${source.invocation.spell.name}`,
      summary: `${release ? "Release" : "Cast"} ${source.invocation.spell.name} with ${release ? "a Reaction" : "the available interrupt"}.`,
      presentation: {
        kind: "spell",
        procedureRef: subject.procedureRef,
        invocation: supportedSpellInvocationRef(source.invocation),
      },
    };
  }
  const presentation = intrinsicSubjectPresentation(state, context, subject);
  if (presentation === undefined) return undefined;
  if (
    presentation.kind === "attack" &&
    ((subject.tag === "action" && subject.action === "attack") ||
      (subject.tag === "bonusAction" && subject.action === "offHandAttack"))
  ) {
    const isOffHandAttack = subject.tag === "bonusAction";
    return {
      label: isOffHandAttack ? "Light Property Bonus Action Attack" : "Attack",
      summary: isOffHandAttack
        ? `Make the Light property Bonus Action attack with ${presentation.name}.`
        : `Take the Attack action with ${presentation.name}.`,
      presentation,
    };
  }
  return {
    ...intrinsicActPresentationText(state, context, subject),
    presentation,
  };
}

function intrinsicSubjectPresentation(
  state: BattleState,
  context: BattleRuntimeContext,
  subject: IntrinsicBattleSubject,
): BattleActPresentation | undefined {
  if (
    subject.tag === "runtimeCommand" &&
    (subject.command === "opportunityAttack" ||
      subject.command === "retaliationAttack")
  ) {
    const attack = attackActionOptionsForActor(state, subject.reactorId).find(
      (candidate) => candidate.procedureRef === subject.procedureRef,
    );
    if (attack === undefined) return undefined;
    const name = attackActionOptionPresentationName(
      state,
      context,
      subject.reactorId,
      attack,
    );
    return Result.isFailure(name)
      ? { kind: "presentationIssue", issue: name.failure }
      : {
          kind: "attack",
          procedureRef: subject.procedureRef,
          name: name.success,
        };
  }
  const attackSubject =
    (subject.tag === "action" && subject.action === "attack") ||
    (subject.tag === "bonusAction" && subject.action === "offHandAttack")
      ? subject
      : undefined;
  if (attackSubject !== undefined) {
    const attackOptions =
      attackSubject.tag === "bonusAction"
        ? offHandAttackActionOptionsForActor(state, attackSubject.actorId)
        : attackActionOptionsForActor(state, attackSubject.actorId);
    const attack = attackOptions.find((candidate) =>
      boundAttackExecutionSelectionMatchesOption(attackSubject, candidate),
    );
    if (attack !== undefined) {
      const name = attackActionOptionPresentationName(
        state,
        context,
        attackSubject.actorId,
        attack,
      );
      if (Result.isFailure(name)) {
        return { kind: "presentationIssue", issue: name.failure };
      }
      return {
        kind: "attack",
        procedureRef: attackSubject.procedureRef,
        name: name.success,
      };
    }
    return undefined;
  }
  return { kind: "intrinsic" };
}

function intrinsicActPresentationText(
  state: BattleState,
  context: BattleRuntimeContext,
  subject: IntrinsicBattleSubject,
): { readonly label: string; readonly summary: string } {
  if (subject.tag === "action" && subject.action === "escapeSpellRestraint") {
    const effect = [...state.combatants.values()].flatMap((combatant) => {
      const candidate = spellActiveEffectForExecutionRef(
        combatant.activeEffects,
        subject.effectRef,
      );
      return candidate === undefined ? [] : [candidate];
    })[0];
    if (effect !== undefined && "sourceProcedureRef" in effect) {
      const source = spellPresentationSourceForProcedure(
        state,
        context,
        effect.sourceCombatantId,
        effect.sourceProcedureRef,
      );
      if (source !== undefined) {
        const invocation = source.invocation;
        const help = subject.actorId !== subject.targetId;
        const label = `${help ? "Help escape" : "Escape"} ${invocation.spell.name}`;
        return {
          label,
          summary: help
            ? `Use an action while within reach of the target to attempt to end ${invocation.spell.name}.`
            : `Use an action to attempt to end ${invocation.spell.name}.`,
        };
      }
    }
  }
  if (subject.tag === "runtimeCommand") {
    const spellCommandPresentation = runtimeSpellCommandPresentationText(
      state,
      context,
      subject,
    );
    if (spellCommandPresentation !== undefined) {
      return spellCommandPresentation;
    }
  }
  if (
    subject.tag === "runtimeCommand" &&
    subject.command === "fixedCostMovementReplacement"
  ) {
    const actor = state.combatants.get(subject.actorId);
    const effect = spellActiveEffectForExecutionRef(
      actor?.activeEffects ?? [],
      subject.effectRef,
    );
    if (effect?.kind === "fixedCostMovementReplacement") {
      return {
        label: "Jump",
        summary: `Spend ${effect.movementCostFeet} feet of Movement to jump up to ${maxFixedCostMovementReplacementDistanceFeet(state, subject.actorId, effect)} feet using table-supplied landing facts.`,
      };
    }
  }
  if (
    (subject.tag === "action" && subject.action === "multiattack") ||
    (subject.tag === "bonusAction" &&
      subject.action === "statBlockActionOption")
  ) {
    const actor = state.combatants.get(subject.actorId);
    if (actor?.origin.kind === "statBlock") {
      const presentation = statBlockProcedurePresentationsForActor(
        state,
        context,
        subject.actorId,
      )?.find((candidate) => candidate.procedureRef === subject.procedureRef);
      if (presentation !== undefined && presentation.kind !== "attack") {
        return {
          label: presentation.label,
          summary: `Use ${presentation.label}.`,
        };
      }
    }
  }
  const label = intrinsicActPresentationLabel(subject);
  return { label, summary: `Use ${label}.` };
}

type RuntimeCommandSubject = Extract<
  IntrinsicBattleSubject,
  { readonly tag: "runtimeCommand" }
>;

type RuntimeSpellCommandPresentation =
  | { readonly kind: "savingThrow" }
  | { readonly kind: "disperse" }
  | { readonly kind: "leaveArea" }
  | { readonly kind: "removeArea" }
  | { readonly kind: "changeDirection" }
  | { readonly kind: "moveArea" }
  | { readonly kind: "ram" }
  | { readonly kind: "endEffect" }
  | { readonly kind: "prefixOperation"; readonly operation: string }
  | { readonly kind: "suffixOperation"; readonly operation: string };

const RUNTIME_SPELL_COMMAND_PRESENTATIONS = new Map<
  RuntimeCommandSubject["command"],
  RuntimeSpellCommandPresentation
>([
  ["persistentAreaSaveConditionSave", { kind: "savingThrow" }],
  ["persistentAreaSaveConditionEscapeSave", { kind: "savingThrow" }],
  ["persistentAreaSaveCompositeSave", { kind: "savingThrow" }],
  ["persistentAreaSaveDamageSave", { kind: "savingThrow" }],
  ["directionalPersistentAreaSave", { kind: "savingThrow" }],
  ["movableZoneSave", { kind: "savingThrow" }],
  ["endPersistentAreaSaveDamageForEnvironment", { kind: "disperse" }],
  ["endPersistentAreaTraitForEnvironment", { kind: "disperse" }],
  ["endPersistentAreaSaveConditionEscapeForDeparture", { kind: "leaveArea" }],
  ["persistentAreaSaveDamageExit", { kind: "leaveArea" }],
  [
    "endPersistentAreaSaveConditionEscapeForAreaRemoval",
    { kind: "removeArea" },
  ],
  ["directionalPersistentAreaDirectionChange", { kind: "changeDirection" }],
  ["movableZoneReposition", { kind: "moveArea" }],
  ["movableZoneRam", { kind: "ram" }],
  ["linkedDefenseResistanceDamageShareSeparation", { kind: "endEffect" }],
  [
    "grantedAreaSaveDamageAction",
    { kind: "prefixOperation", operation: "Exhale" },
  ],
  ["executeCompelledGrovel", { kind: "suffixOperation", operation: "Grovel" }],
  ["executeCompelledDrop", { kind: "suffixOperation", operation: "Drop" }],
  [
    "executeCompelledApproach",
    { kind: "suffixOperation", operation: "Approach" },
  ],
  ["executeCompelledFlee", { kind: "suffixOperation", operation: "Flee" }],
  [
    "controlledVerticalSuspensionAltitudeControl",
    { kind: "suffixOperation", operation: "Altitude Control" },
  ],
]);

function runtimeSpellCommandPresentationText(
  state: BattleState,
  context: BattleRuntimeContext,
  subject: RuntimeCommandSubject,
): { readonly label: string; readonly summary: string } | undefined {
  const presentation = RUNTIME_SPELL_COMMAND_PRESENTATIONS.get(subject.command);
  if (presentation === undefined) return undefined;
  const source = spellPresentationSourceForRuntimeCommand(
    state,
    context,
    subject,
  );
  if (source === undefined) return undefined;
  const spellName = source.invocation.spell.name;
  const label = Match.value(presentation).pipe(
    Match.discriminatorsExhaustive("kind")({
      savingThrow: () => `${spellName} Saving Throw`,
      disperse: () => `Disperse ${spellName}`,
      leaveArea: () => `Leave ${spellName} Area`,
      removeArea: () => `Remove ${spellName} Area`,
      changeDirection: () => `Change ${spellName} Direction`,
      moveArea: () => `Move ${spellName}`,
      ram: () => `Ram with ${spellName}`,
      endEffect: () => `End ${spellName}`,
      prefixOperation: ({ operation }) => `${operation} ${spellName}`,
      suffixOperation: ({ operation }) => `${spellName}: ${operation}`,
    }),
  );
  return { label, summary: `Use ${label}.` };
}

function spellPresentationSourceForRuntimeCommand(
  state: BattleState,
  context: BattleRuntimeContext,
  subject: RuntimeCommandSubject,
) {
  const effect = activeSpellEffectForRuntimeCommand(state, subject);
  if (
    effect === undefined ||
    !("sourceCombatantId" in effect) ||
    !("sourceProcedureRef" in effect)
  ) {
    return undefined;
  }
  return spellPresentationSourceForProcedure(
    state,
    context,
    effect.sourceCombatantId,
    effect.sourceProcedureRef,
  );
}

function activeSpellEffectForRuntimeCommand(
  state: BattleState,
  subject: RuntimeCommandSubject,
): BattleActiveEffect | undefined {
  const effectRef =
    "effectRef" in subject
      ? subject.effectRef
      : "areaMembershipTrigger" in subject
        ? subject.areaMembershipTrigger.effectRef
        : undefined;
  if (effectRef !== undefined) {
    for (const combatant of state.combatants.values()) {
      const effect = spellActiveEffectForExecutionRef(
        combatant.activeEffects,
        effectRef,
      );
      if (effect !== undefined) return effect;
    }
  }
  const areaId =
    "areaId" in subject
      ? subject.areaId
      : "areaMembershipTrigger" in subject
        ? subject.areaMembershipTrigger.areaId
        : undefined;
  if (areaId === undefined) return undefined;
  for (const combatant of state.combatants.values()) {
    const effect = combatant.activeEffects.find(
      (candidate) => "areaId" in candidate && candidate.areaId === areaId,
    );
    if (effect !== undefined) return effect;
  }
  return undefined;
}

const INTRINSIC_ACTION_LABELS = {
  attack: "Attack",
  dash: "Dash",
  disengage: "Disengage",
  dodge: "Dodge",
  helpAttack: "Help",
  hide: "Hide",
  multiattack: "Multiattack",
  ready: "Ready",
  search: "Search",
  grapple: "Unarmed Strike (Grapple)",
  shove: "Unarmed Strike (Shove)",
  escapeGrapple: "Escape Grapple",
  escapeSpellRestraint: "Escape Spell Restraint",
  shakeAwakeFromStagedCondition: "Shake Awake",
  shakeAwakeFromAreaControl: "Shake Awake",
} as const satisfies Record<
  Extract<BattleSubject, { readonly tag: "action" }>["action"],
  string
>;

const INTRINSIC_RUNTIME_COMMAND_LABELS = {
  endTurn: "End Turn",
  endConcentration: "End Concentration",
  move: "Move",
  standFromProne: "Stand",
  releaseReadiedSpell: "Release Readied Spell",
  releaseReadiedMovement: "Release Readied Movement",
  reportReadyTrigger: "Report Ready Trigger",
  releaseReadiedAction: "Release Readied Action",
  releaseReadiedAttack: "Release Readied Attack",
  castTriggeredReactionSpell: "Cast Reaction Spell",
  castAttackHitBonusActionSpell: "Cast Bonus Action Spell",
  releaseGrapple: "Release Grapple",
  opportunityAttack: "Opportunity Attack",
  retaliationAttack: "Retaliation Attack",
  persistentAreaSaveConditionSave: "Area Saving Throw",
  persistentAreaSaveConditionEscapeSave: "Area Saving Throw",
  persistentAreaSaveCompositeSave: "Area Saving Throw",
  persistentAreaSaveDamageSave: "Area Saving Throw",
  endPersistentAreaSaveDamageForEnvironment: "Disperse Area",
  endPersistentAreaSaveConditionEscapeForDeparture: "Leave Area",
  endPersistentAreaSaveConditionEscapeForAreaRemoval: "Remove Area",
  directionalPersistentAreaSave: "Area Saving Throw",
  directionalPersistentAreaDirectionChange: "Change Area Direction",
  movableZoneSave: "Movable Zone Saving Throw",
  persistentAreaSaveDamageExit: "Leave Area",
  movableZoneReposition: "Move Movable Zone",
  movableZoneRam: "Ram with Movable Zone",
  releaseSpellCreatedHeldObject: "Release spell-created held object",
  protectionRelevantEffectSave: "Protection Saving Throw",
  creatureTypeProtectionConditionAttempt: "Protected Condition Attempt",
  creatureTypeProtectionPossessionAttempt: "Protected Possession Attempt",
  endPersistentAreaTraitForEnvironment: "Disperse Area",
  linkedDefenseResistanceDamageShareSeparation: "End Linked Effect",
  fixedCostMovementReplacement: "Jump",
  grantedAreaSaveDamageAction: "Use Granted Area Effect",
  replaceSelfTransformationMode: "Replace Self Transformation Mode",
  executeCompelledGrovel: "Grovel",
  executeCompelledDrop: "Drop",
  executeCompelledApproach: "Approach",
  executeCompelledFlee: "Flee",
  controlledVerticalSuspensionAltitudeControl: "Altitude Control",
  creatureFalls: "Fall",
} as const satisfies Record<
  Extract<BattleSubject, { readonly tag: "runtimeCommand" }>["command"],
  string
>;

function intrinsicActPresentationLabel(
  subject: IntrinsicBattleSubject,
): string {
  return Match.value(subject).pipe(
    byTag("action", (value) => INTRINSIC_ACTION_LABELS[value.action]),
    byTag(
      "runtimeCommand",
      (value) => INTRINSIC_RUNTIME_COMMAND_LABELS[value.command],
    ),
    byTag("bonusAction", (value) =>
      value.action === "offHandAttack"
        ? "Light Property Bonus Action Attack"
        : value.action === "martialArtsUnarmedStrike"
          ? "Martial Arts Bonus Unarmed Strike"
          : "Bonus Action",
    ),
    byTag("companionLifecycle", (value) =>
      value.action === "reappear"
        ? "Reappear Familiar"
        : value.action === "temporarilyDismiss"
          ? "Dismiss Familiar"
          : "Dismiss Familiar Forever",
    ),
    byTag("spawnedCompanionSharedSenses", () => "Share Familiar Senses"),
    byTag("companionAttack", () => "Pact Familiar Attack"),
    byTag(
      "monkFocusFlurryOfBlowsStrike",
      () => "Flurry of Blows Unarmed Strike",
    ),
    Match.exhaustive,
  );
}

function characterProcedurePresentationJoin(
  state: BattleState,
  context: BattleRuntimeContext,
  subject: CharacterProcedureBattleSubject,
): Pick<AvailableBattleAct, "label" | "summary" | "presentation"> | undefined {
  const actor = state.combatants.get(subject.actorId);
  if (!isCharacterBattleCreatureState(actor)) return undefined;
  const procedureRef = subject.procedureRef;
  if (
    subject.tag === "actionSpell" ||
    subject.tag === "bonusActionSpell" ||
    subject.tag === "bonusActionDashSpell" ||
    subject.tag === "spawnedCompanionTouchSpellProxy"
  ) {
    const invocation = spellPresentationInvocationForProcedure(
      state,
      context,
      actor.combatantId,
      procedureRef,
    );
    if (invocation === undefined) return undefined;
    if (invocation.procedure === "spawnedCompanionLifecycle") return undefined;
    const presentationText = spellProcedurePresentationText(
      state,
      context,
      invocation,
      subject,
    );
    if (presentationText === undefined) return undefined;
    return {
      ...presentationText,
      presentation: {
        kind: "spell",
        procedureRef,
        invocation: supportedSpellInvocationRef(invocation),
      },
    };
  }
  if (subject.tag === "druidWildShape" && subject.action === "assumeForm") {
    const form = actor.origin.druidWildShapeAvailableForms?.find(
      (candidate) => candidate.execution.scopeRef === subject.formExecutionRef,
    );
    const unit = unitForProcedureRef(
      actor,
      context,
      procedureRef,
      DRUID_WILD_SHAPE_PROCEDURE_QUERY,
    );
    if (form === undefined || unit === undefined) {
      return undefined;
    }
    const label = `${battleUnitPresentationName(unit)}: ${form.statBlock.statBlock.displayName}`;
    return {
      label,
      summary: `Use ${label}.`,
      presentation: {
        kind: "druidWildShapeForm",
        procedureRef,
        formExecutionRef: subject.formExecutionRef,
        unitId: unit.id,
        formStatBlockId: form.statBlock.id,
      },
    };
  }
  if (
    subject.tag === "bonusActionStandardAction" &&
    subject.sourceEffectRef !== undefined
  ) {
    const source = spellPresentationSourceForProcedure(
      state,
      context,
      actor.combatantId,
      procedureRef,
    );
    if (source === undefined) return undefined;
    const invocation = source.invocation;
    if (invocation.procedure === "spawnedCompanionLifecycle") return undefined;
    const actionName = alternateActionPresentationName(subject.action);
    return {
      label: invocation.spell.name,
      summary: `${actionName} as a Bonus Action.`,
      presentation: {
        kind: "spell",
        procedureRef,
        invocation: supportedSpellInvocationRef(invocation),
      },
    };
  }
  const query =
    subject.tag === "druidWildShape"
      ? DRUID_WILD_SHAPE_PROCEDURE_QUERY
      : subject.tag === "bonusActionStandardAction"
        ? BONUS_ACTION_STANDARD_ACTION_PROCEDURE_QUERY
        : subject.tag === "monkFocusOption"
          ? MONK_FOCUS_PROCEDURE_QUERY
          : CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY;
  const unit = unitForProcedureRef(actor, context, procedureRef, query);
  if (unit === undefined) return undefined;
  const name = battleUnitPresentationName(unit);
  const presentation: Extract<
    BattleActPresentation,
    { readonly kind: "unit" }
  > = {
    kind: "unit",
    procedureRef,
    unitId: unit.id,
  };
  if (subject.tag === "monkFocusOption") {
    if (subject.option === "flurryOfBlows") {
      return {
        label: `${name}: Flurry of Blows`,
        summary:
          "Spend 1 Focus Point and a Bonus Action to make Unarmed Strikes.",
        presentation,
      };
    }
    if (subject.option === "patientDefense") {
      return subject.mode === "freeDisengage"
        ? {
            label: `${name}: Disengage`,
            summary: "Take the Disengage action as a Bonus Action.",
            presentation,
          }
        : {
            label: `${name}: Disengage and Dodge`,
            summary:
              "Spend 1 Focus Point and a Bonus Action to take the Disengage and Dodge actions.",
            presentation,
          };
    }
    return subject.mode === "freeDash"
      ? {
          label: `${name}: Dash`,
          summary: "Take the Dash action as a Bonus Action.",
          presentation,
        }
      : {
          label: `${name}: Disengage and Dash`,
          summary:
            "Spend 1 Focus Point and a Bonus Action to take the Disengage and Dash actions.",
          presentation,
        };
  }
  if (subject.tag === "bonusActionStandardAction") {
    const actionName = alternateActionPresentationName(subject.action);
    return {
      label: `${name}: ${actionName}`,
      summary: `${actionName} as a Bonus Action.`,
      presentation,
    };
  }
  return { label: name, summary: `Use ${name}.`, presentation };
}

function spellProcedurePresentationText(
  state: BattleState,
  context: BattleRuntimeContext,
  invocation: AuthoredSelectedSpellInvocation,
  subject: Extract<
    CharacterProcedureBattleSubject,
    {
      readonly tag:
        | "actionSpell"
        | "bonusActionSpell"
        | "bonusActionDashSpell"
        | "spawnedCompanionTouchSpellProxy";
    }
  >,
): { readonly label: string; readonly summary: string } | undefined {
  if (subject.tag === "spawnedCompanionTouchSpellProxy") {
    const label = `Familiar Delivery: ${invocation.spell.name}`;
    return {
      label,
      summary: `Deliver ${invocation.spell.name} through the selected familiar.`,
    };
  }
  if (subject.tag === "actionSpell" && subject.mode.tag === "ready") {
    const label = `Ready ${invocation.spell.name}`;
    return {
      label,
      summary: `${label} for ${readiedSpellTriggerPresentationName(subject.mode.trigger)}.`,
    };
  }
  if (
    (invocation.procedure === "spatialMeleeSpellAttackProxy" &&
      invocation.operation === "repositionAndAttack") ||
    invocation.procedure === "spellCreatedHeldObjectAttack"
  ) {
    const label = `${invocation.spell.name} attack`;
    return { label, summary: `Make the ${label}.` };
  }
  if (invocation.procedure === "spellHostedWeaponAttack") {
    const weaponName = attackActionOptionPresentationName(
      state,
      context,
      subject.actorId,
      invocation.componentWeapon.attack,
    );
    if (Result.isFailure(weaponName)) return undefined;
    return {
      label: `${invocation.spell.name} (${weaponName.success})`,
      summary: `Cast ${invocation.spell.name} as a cantrip using ${weaponName.success}.`,
    };
  }
  if (invocation.procedure === "spellCreatedHeldObjectReEvoke") {
    const label = `Re-evoke ${invocation.spell.name}`;
    return { label, summary: `${label}.` };
  }
  if (
    invocation.procedure === "markedDamageRider" &&
    invocation.action === "transfer"
  ) {
    const label = `Transfer ${invocation.spell.name}`;
    return { label, summary: `${label} to a new target.` };
  }
  if (subject.tag === "bonusActionDashSpell") {
    return {
      label: invocation.spell.name,
      summary: `Use ${invocation.spell.name} and Dash.`,
    };
  }
  if (subject.metamagic !== undefined) {
    const metamagic = subject.metamagic
      .map(metamagicSelectionPresentationName)
      .join(" and ");
    return {
      label: `${invocation.spell.name} — ${metamagic}`,
      summary: `Use ${invocation.spell.name} with ${metamagic}.`,
    };
  }
  return {
    label: invocation.spell.name,
    summary: `Use ${invocation.spell.name}.`,
  };
}

function metamagicSelectionPresentationName(
  selection: NonNullable<
    Extract<
      CharacterProcedureBattleSubject,
      { readonly tag: "actionSpell" }
    >["metamagic"]
  >[number],
): string {
  return Match.value(selection).pipe(
    Match.when(
      { effectKind: "saving_throw_protection" },
      () => "Careful Spell",
    ),
    Match.when({ effectKind: "spell_range_increase" }, () => "Distant Spell"),
    Match.when({ effectKind: "damage_dice_reroll" }, () => "Empowered Spell"),
    Match.when(
      { effectKind: "duration_extension_and_concentration_save_advantage" },
      () => "Extended Spell",
    ),
    Match.when(
      { effectKind: "saving_throw_disadvantage" },
      () => "Heightened Spell",
    ),
    Match.when(
      {
        effectKind: "action_casting_time_to_bonus_action_with_spell_turn_limit",
      },
      () => "Quickened Spell",
    ),
    Match.when(
      { effectKind: "missed_spell_attack_reroll" },
      () => "Seeking Spell",
    ),
    Match.when({ effectKind: "component_suppression" }, () => "Subtle Spell"),
    Match.when(
      { effectKind: "damage_type_substitution" },
      ({ targetDamageType }) => `Transmuted Spell (${targetDamageType})`,
    ),
    Match.when(
      { effectKind: "effective_spell_level_increase_for_extra_target" },
      () => "Twinned Spell",
    ),
    Match.exhaustive,
  );
}

function readiedSpellTriggerPresentationName(
  trigger: "attackHit" | "spellCast" | "saveFailed" | "afterDamage",
): string {
  return Match.value(trigger).pipe(
    Match.when("attackHit", () => "an attack hit"),
    Match.when("spellCast", () => "a spell cast"),
    Match.when("saveFailed", () => "a failed save"),
    Match.when("afterDamage", () => "damage"),
    Match.exhaustive,
  );
}

function alternateActionPresentationName(
  action: "dash" | "disengage" | "hide",
): string {
  return Match.value(action).pipe(
    Match.when("dash", () => "Dash"),
    Match.when("disengage", () => "Disengage"),
    Match.when("hide", () => "Hide"),
    Match.exhaustive,
  );
}

function battleUnitPresentationName(unit: BattleUnitRef["unit"]): string {
  return "syntheticLabel" in unit ? unit.syntheticLabel : unit.name;
}

function spellPresentationSourceForProcedure(
  state: BattleState,
  context: BattleRuntimeContext,
  actorId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
) {
  const actor = state.combatants.get(actorId);
  return isCharacterBattleCreatureState(actor)
    ? spellPresentationSourceForCharacter(actor, context, procedureRef)
    : undefined;
}

function spellPresentationSourceForCharacter(
  actor: CharacterBattleCreatureState,
  context: BattleRuntimeContext,
  procedureRef: BattleProcedureExecutionRef,
) {
  const execution = characterSpellProcedureExecution(
    actor.origin.execution,
    procedureRef,
  );
  if (execution === undefined) return undefined;
  const matches = context.characters
    .get(actor.combatantId)
    ?.spellPresentationSources.filter(
      (source) =>
        source.procedureRef === procedureRef &&
        spellInvocationMatchesExecution(source.invocation, execution),
    );
  return matches?.length === 1 ? matches[0] : undefined;
}

export function battleSelectedSpellInvocationForProcedure(
  session: BattleRuntimeSession,
  actorId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
): AuthoredSelectedSpellInvocation | undefined {
  const actor = session.state.combatants.get(actorId);
  if (
    !isCharacterBattleCreatureState(actor) ||
    characterSpellProcedureExecution(actor.origin.execution, procedureRef) ===
      undefined
  ) {
    return undefined;
  }
  return spellPresentationInvocationForProcedure(
    session.state,
    session.context,
    actorId,
    procedureRef,
  );
}

function spellPresentationInvocationForProcedure(
  state: BattleState,
  context: BattleRuntimeContext,
  actorId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
): AuthoredSelectedSpellInvocation | undefined {
  const actor = state.combatants.get(actorId);
  if (!isCharacterBattleCreatureState(actor)) return undefined;
  const direct = spellPresentationSourceForCharacter(
    actor,
    context,
    procedureRef,
  );
  if (direct !== undefined) {
    return { ...direct.invocation, sourceProcedureRef: procedureRef };
  }
  const execution = characterSpellProcedure(
    actor.origin.execution,
    procedureRef,
    actor,
  );
  if (
    execution === undefined ||
    !isDynamicSpellPresentationExecution(execution)
  ) {
    return undefined;
  }
  return dynamicSpellPresentationInvocation(
    actor,
    context,
    procedureRef,
    execution,
  );
}

type DynamicSpellPresentationExecution =
  | Extract<
      BattleSpellProcedureExecution,
      { readonly procedure: "heldLightHurl" }
    >
  | (RepositionMovableLightManifestationSpellProcedureExecution & {
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
    })
  | Extract<
      BattleSpellProcedureExecution,
      {
        readonly procedure:
          | "spellCreatedHeldObjectAttack"
          | "spellCreatedHeldObjectReEvoke";
      }
    >
  | (RepeatSpatialMeleeSpellAttackProxyLiveSpellProcedureExecution & {
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
    })
  | Extract<
      BattleSpellProcedureExecution,
      { readonly procedure: "objectContactDamageRepeat" }
    >
  | Extract<
      BattleSpellProcedureExecution,
      { readonly procedure: "markedDamageRider"; readonly action: "transfer" }
    >;

function isDynamicSpellPresentationExecution(
  execution: BattleSpellProcedureExecution,
): execution is DynamicSpellPresentationExecution {
  return (
    execution.procedure === "heldLightHurl" ||
    (execution.procedure === "movableLightManifestation" &&
      execution.operation === "reposition") ||
    execution.procedure === "spellCreatedHeldObjectAttack" ||
    execution.procedure === "spellCreatedHeldObjectReEvoke" ||
    (execution.procedure === "spatialMeleeSpellAttackProxy" &&
      execution.operation === "repositionAndAttack") ||
    execution.procedure === "objectContactDamageRepeat" ||
    (execution.procedure === "markedDamageRider" &&
      execution.action === "transfer")
  );
}

function dynamicSpellPresentationInvocation(
  actor: CharacterBattleCreatureState,
  context: BattleRuntimeContext,
  procedureRef: BattleProcedureExecutionRef,
  execution: DynamicSpellPresentationExecution,
): AuthoredSelectedSpellInvocation | undefined {
  const spell = dynamicSpellPresentationSourceSpell(actor, context, execution);
  return spell === undefined
    ? undefined
    : { ...execution, spell, sourceProcedureRef: procedureRef };
}

function dynamicSpellPresentationSourceSpell(
  actor: CharacterBattleCreatureState,
  context: BattleRuntimeContext,
  execution: DynamicSpellPresentationExecution,
): AuthoredSelectedSpellInvocation["spell"] | undefined {
  return Match.value(execution).pipe(
    Match.discriminatorsExhaustive("procedure")({
      heldLightHurl: (value) =>
        spellPresentationSourceSpell(
          actor,
          context,
          value.sourceHeldLightProcedureRef,
          (source) => source.procedure === "heldLight",
        ),
      movableLightManifestation: (value) =>
        spellPresentationSourceSpell(
          actor,
          context,
          value.sourceManifestationProcedureRef,
          (source) =>
            source.procedure === "movableLightManifestation" &&
            source.operation === "create",
        ),
      spellCreatedHeldObjectAttack: (value) =>
        spellPresentationSourceSpell(
          actor,
          context,
          value.sourceHeldObjectProcedureRef,
          (source) => source.procedure === "spellCreatedHeldObject",
        ),
      spellCreatedHeldObjectReEvoke: (value) =>
        spellPresentationSourceSpell(
          actor,
          context,
          value.sourceHeldObjectProcedureRef,
          (source) => source.procedure === "spellCreatedHeldObject",
        ),
      spatialMeleeSpellAttackProxy: (value) =>
        spellPresentationSourceSpell(
          actor,
          context,
          value.activeEffect.sourceProcedureRef,
          (source) =>
            source.procedure === "spatialMeleeSpellAttackProxy" &&
            source.operation === "createAndAttack",
        ),
      objectContactDamageRepeat: (value) =>
        spellPresentationSourceSpell(
          actor,
          context,
          value.activeEffect.sourceProcedureRef,
          (source) => source.procedure === "objectContactDamage",
        ),
      markedDamageRider: (value) =>
        spellPresentationSourceSpell(
          actor,
          context,
          value.activeEffect.sourceProcedureRef,
          (source) =>
            source.procedure === "markedDamageRider" &&
            source.action === "cast",
        ),
    }),
  );
}

function spellPresentationSourceSpell(
  actor: CharacterBattleCreatureState,
  context: BattleRuntimeContext,
  sourceProcedureRef: BattleProcedureExecutionRef,
  sourceMatches: (source: AuthoredSelectedSpellInvocation) => boolean,
): AuthoredSelectedSpellInvocation["spell"] | undefined {
  const source = spellPresentationSourceForCharacter(
    actor,
    context,
    sourceProcedureRef,
  );
  if (source === undefined || !sourceMatches(source.invocation)) {
    return undefined;
  }
  return source.invocation.spell;
}

function unitForProcedureRef(
  actor: CharacterBattleCreatureState,
  context: BattleRuntimeContext,
  procedureRef: BattleProcedureExecutionRef,
  query:
    | typeof CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY
    | typeof DRUID_WILD_SHAPE_PROCEDURE_QUERY
    | typeof BONUS_ACTION_STANDARD_ACTION_PROCEDURE_QUERY
    | typeof MONK_FOCUS_PROCEDURE_QUERY,
): BattleUnitRef["unit"] | undefined {
  const characterContext = context.characters.get(actor.combatantId);
  if (characterContext === undefined) return undefined;
  const matches = characterContext.unitPresentationSources.filter((candidate) =>
    characterUnitProcedureRefsForAuthoredSelection(
      characterContext,
      actor,
      candidate.unit.id,
      query,
    ).includes(procedureRef),
  );
  return matches.length === 1 ? matches[0]?.unit : undefined;
}
