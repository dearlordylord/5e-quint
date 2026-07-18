import type {
  BattleActDiscoveryCandidate,
  BattleActPresentation,
  BattleState,
  AvailableBattleAct,
} from "./battle-reducer.ts";
import type { BattleUnitRef } from "./battle-init.ts";
import { Match } from "effect";
import type {
  CharacterProcedureBattleSubject,
  CharacterProcedureSelectionSubject,
  SpellInvocationRef,
} from "./battle-subjects.ts";
import { isCharacterProcedureSelectionSubject } from "./battle-subjects.ts";
import { discoverBattleActCandidates } from "./battle-reducer/battle-discovery.ts";
import { battleReducerRouteEventsForDiscoveredAct } from "./battle-reducer/reducer-route.ts";
import { supportedSpellActs } from "./battle-reducer/spells-profiles.ts";
import { supportedSpellInvocationMatchesRef } from "./battle-reducer/spells-invocation-ref.ts";
import {
  BONUS_ACTION_STANDARD_ACTION_PROCEDURE_QUERY,
  CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
  DRUID_WILD_SHAPE_PROCEDURE_QUERY,
  MONK_FOCUS_PROCEDURE_QUERY,
  characterExecutionWithSpellInvocations,
  characterSpellProcedureInvocationRef,
  characterUnitProcedureRefs,
} from "./character-execution.ts";
import type { BattleProcedureExecutionRef, CombatantId } from "./identity.ts";

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
  state: BattleState,
): readonly AvailableBattleAct[] {
  const boundState = battleStateWithCharacterExecutionBindings(state);
  const acts = admitCharacterProcedureDiscoveryActs(
    boundState,
    discoverBattleActCandidates(boundState),
  );
  return acts.map((act) => {
    const routeEvents = battleReducerRouteEventsForDiscoveredAct(
      boundState,
      act,
    );
    return routeEvents === undefined ? act : { ...act, routeEvents };
  });
}

function battleStateWithCharacterExecutionBindings(
  state: BattleState,
): BattleState {
  const combatants = new Map(state.combatants);
  let changed = false;
  for (const [combatantId, combatant] of state.combatants) {
    if (combatant.origin.kind !== "character") continue;
    const execution = characterExecutionWithSpellInvocations(
      combatant.origin.execution,
      supportedSpellActs(combatant, state),
    );
    if (execution === combatant.origin.execution) continue;
    changed = true;
    combatants.set(combatantId, {
      ...combatant,
      origin: { ...combatant.origin, execution },
    });
  }
  return changed ? { ...state, combatants } : state;
}

function characterProcedureRefsForSelection(
  state: BattleState,
  subject: CharacterProcedureSelectionSubject,
): readonly BattleProcedureExecutionRef[] {
  const actor = state.combatants.get(subject.actorId);
  if (actor?.origin.kind !== "character") return [];
  const invocations = supportedSpellActs(actor, state);
  const execution = characterExecutionWithSpellInvocations(
    actor.origin.execution,
    invocations,
  );
  if (
    subject.tag === "actionSpell" ||
    subject.tag === "bonusActionSpell" ||
    subject.tag === "bonusActionDashSpell" ||
    subject.tag === "findFamiliarTouchSpell"
  ) {
    if (subject.procedureRef === undefined) return [];
    const componentWeaponItemId =
      "componentWeaponItemId" in subject
        ? subject.componentWeaponItemId
        : undefined;
    const invocation = invocations.find(
      (candidate) =>
        candidate.sourceProcedureRef === subject.procedureRef &&
        supportedSpellInvocationMatchesRef(candidate, subject.invocation) &&
        (candidate.procedure !== "spellHostedWeaponAttack" ||
          componentWeaponItemId === candidate.componentWeapon.itemId) &&
        (candidate.procedure !== "weaponAttackOverride" ||
          componentWeaponItemId === candidate.attachedWeapon.itemId),
    );
    return invocation === undefined ? [] : [subject.procedureRef];
  }
  if (
    subject.tag === "unitFeature" ||
    subject.tag === "unitFeatureHeldWeaponActivation"
  ) {
    return characterUnitProcedureRefs(
      execution,
      subject.unitId,
      CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
    );
  }
  if (subject.tag === "druidWildShape") {
    return characterUnitProcedureRefs(
      execution,
      subject.unitId,
      DRUID_WILD_SHAPE_PROCEDURE_QUERY,
    );
  }
  if (subject.tag === "bonusActionStandardAction") {
    if ("sourceProcedureRef" in subject) {
      const invocation = invocations.find(
        (candidate) =>
          candidate.sourceProcedureRef === subject.sourceProcedureRef &&
          candidate.procedure === "expeditiousRetreatDash",
      );
      return invocation === undefined ? [] : [subject.sourceProcedureRef];
    }
    const refs = characterUnitProcedureRefs(
      execution,
      subject.sourceUnitId,
      BONUS_ACTION_STANDARD_ACTION_PROCEDURE_QUERY,
    );
    if (refs.length > 0) return refs;
    return refs;
  }
  return characterUnitProcedureRefs(
    execution,
    subject.resourceUnitId,
    MONK_FOCUS_PROCEDURE_QUERY,
  );
}

export function admitCharacterProcedureSelectionSubject(
  state: BattleState,
  subject: CharacterProcedureSelectionSubject,
): CharacterProcedureBattleSubject | undefined {
  const [procedureRef] = characterProcedureRefsForSelection(state, subject);
  return procedureRef === undefined
    ? undefined
    : boundCharacterProcedureSubject(state, subject, procedureRef);
}

function admitCharacterProcedureDiscoveryActs(
  state: BattleState,
  acts: readonly BattleActDiscoveryCandidate[],
): readonly AvailableBattleAct[] {
  const characterIds = new Set<CombatantId>();
  for (const [combatantId, combatant] of state.combatants) {
    if (combatant.origin.kind === "character") characterIds.add(combatantId);
  }
  return acts.flatMap((act) => {
    const subject = act.subject;
    if (!characterIds.has(subject.actorId)) {
      return isCharacterProcedureSelectionSubject(subject)
        ? []
        : [{ ...act, subject, presentation: { kind: "intrinsic" } }];
    }
    if (!isCharacterProcedureSelectionSubject(subject)) {
      return [{ ...act, subject, presentation: { kind: "intrinsic" } }];
    }
    return characterProcedureRefsForSelection(state, subject).flatMap(
      (procedureRef): readonly AvailableBattleAct[] => {
        const admittedSubject = boundCharacterProcedureSubject(
          state,
          subject,
          procedureRef,
        );
        return admittedSubject === undefined
          ? []
          : (() => {
              const text = characterProcedurePresentationText(
                state,
                subject,
                procedureRef,
              );
              const presentation = characterProcedurePresentation(
                state,
                subject,
                procedureRef,
              );
              return text === undefined || presentation === undefined
                ? []
                : [
                    {
                      ...act,
                      label: text.label,
                      summary: text.summary,
                      subject: admittedSubject,
                      initialHoles: admissionBoundProcedureHoles(
                        act.initialHoles,
                        procedureRef,
                      ),
                      presentation,
                    },
                  ];
            })();
      },
    );
  });
}

function characterProcedurePresentationText(
  state: BattleState,
  subject: CharacterProcedureSelectionSubject,
  procedureRef: BattleProcedureExecutionRef,
): { readonly label: string; readonly summary: string } | undefined {
  const actor = state.combatants.get(subject.actorId);
  if (actor?.origin.kind !== "character") return undefined;
  if (
    subject.tag === "actionSpell" ||
    subject.tag === "bonusActionSpell" ||
    subject.tag === "bonusActionDashSpell" ||
    subject.tag === "findFamiliarTouchSpell"
  ) {
    const invocation = supportedSpellActs(actor, state).find(
      (candidate) => candidate.sourceProcedureRef === procedureRef,
    );
    if (invocation === undefined) return undefined;
    return {
      label: invocation.spell.name,
      summary: `Use ${invocation.spell.name}.`,
    };
  }
  if (subject.tag === "druidWildShape" && subject.action === "assumeForm") {
    const form = actor.origin.druidWildShapeAvailableForms?.find(
      (candidate) => candidate.statBlock.id === subject.formStatBlockId,
    );
    const unit = actor.origin.characterUnitRefs.find(
      (ref) => ref.unit.id === subject.unitId,
    )?.unit;
    if (form === undefined || unit === undefined) {
      return undefined;
    }
    const label = `${battleUnitPresentationName(unit)}: ${form.statBlock.statBlock.displayName}`;
    return { label, summary: `Use ${label}.` };
  }
  if (
    subject.tag === "bonusActionStandardAction" &&
    "sourceProcedureRef" in subject
  ) {
    const invocation = supportedSpellActs(actor, state).find(
      (candidate) => candidate.sourceProcedureRef === procedureRef,
    );
    if (invocation === undefined) return undefined;
    const actionName = alternateActionPresentationName(subject.action);
    return {
      label: invocation.spell.name,
      summary: `${actionName} as a Bonus Action.`,
    };
  }
  const unitId =
    subject.tag === "unitFeature" ||
    subject.tag === "unitFeatureHeldWeaponActivation" ||
    subject.tag === "druidWildShape"
      ? subject.unitId
      : subject.tag === "bonusActionStandardAction"
        ? "sourceUnitId" in subject
          ? subject.sourceUnitId
          : undefined
        : subject.resourceUnitId;
  if (unitId === undefined) return undefined;
  const unit = actor.origin.characterUnitRefs.find(
    (ref) => ref.unit.id === unitId,
  )?.unit;
  if (unit === undefined) return undefined;
  const name = battleUnitPresentationName(unit);
  if (subject.tag === "bonusActionStandardAction") {
    const actionName = alternateActionPresentationName(subject.action);
    return { label: name, summary: `${actionName} as a Bonus Action.` };
  }
  return { label: name, summary: `Use ${name}.` };
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

function admissionBoundProcedureHoles(
  holes: BattleActDiscoveryCandidate["initialHoles"],
  procedureRef: BattleProcedureExecutionRef,
): BattleActDiscoveryCandidate["initialHoles"] {
  return holes.map((hole) =>
    hole.kind === "targetChoice" &&
    hole.attack === undefined &&
    hole.spellTargetSpatialFactRequest === undefined
      ? { ...hole, procedureRef }
      : hole,
  );
}

function characterProcedurePresentation(
  state: BattleState,
  subject: CharacterProcedureSelectionSubject,
  procedureRef: BattleProcedureExecutionRef,
): BattleActPresentation | undefined {
  if (
    subject.tag === "actionSpell" ||
    subject.tag === "bonusActionSpell" ||
    subject.tag === "bonusActionDashSpell" ||
    subject.tag === "findFamiliarTouchSpell"
  ) {
    return { kind: "spell", procedureRef, invocation: subject.invocation };
  }
  if (
    subject.tag === "unitFeature" ||
    subject.tag === "unitFeatureHeldWeaponActivation"
  ) {
    return { kind: "unit", procedureRef, unitId: subject.unitId };
  }
  if (subject.tag === "druidWildShape") {
    return subject.action === "assumeForm"
      ? {
          kind: "druidWildShapeForm",
          procedureRef,
          unitId: subject.unitId,
          formStatBlockId: subject.formStatBlockId,
        }
      : { kind: "unit", procedureRef, unitId: subject.unitId };
  }
  if (subject.tag === "bonusActionStandardAction") {
    if ("sourceUnitId" in subject) {
      return { kind: "unit", procedureRef, unitId: subject.sourceUnitId };
    }
    const actor = state.combatants.get(subject.actorId);
    if (actor?.origin.kind !== "character") return undefined;
    const invocation = characterSpellProcedureInvocationRef(
      actor.origin.execution,
      procedureRef,
    );
    return invocation === undefined
      ? undefined
      : { kind: "spell", procedureRef, invocation };
  }
  return { kind: "unit", procedureRef, unitId: subject.resourceUnitId };
}

function boundCharacterProcedureSubject(
  state: BattleState,
  subject: CharacterProcedureSelectionSubject,
  procedureRef: BattleProcedureExecutionRef,
): CharacterProcedureBattleSubject | undefined {
  if (
    subject.tag === "actionSpell" ||
    subject.tag === "bonusActionSpell" ||
    subject.tag === "bonusActionDashSpell" ||
    subject.tag === "findFamiliarTouchSpell"
  ) {
    const { invocation: _invocation, ...replaySubject } = subject;
    return { ...replaySubject, procedureRef };
  }
  if (
    subject.tag === "unitFeature" ||
    subject.tag === "unitFeatureHeldWeaponActivation"
  ) {
    const { unitId: _unitId, ...replaySubject } = subject;
    return { ...replaySubject, procedureRef };
  }
  if (subject.tag === "druidWildShape") {
    if (subject.action === "dismiss") {
      const { unitId: _unitId, ...replaySubject } = subject;
      return { ...replaySubject, procedureRef };
    }
    const { unitId: _unitId, formStatBlockId, ...replaySubject } = subject;
    const actor = state.combatants.get(subject.actorId);
    const formExecutionRef =
      actor?.origin.kind === "character"
        ? actor.origin.druidWildShapeAvailableForms?.find(
            (candidate) => candidate.statBlock.id === formStatBlockId,
          )?.execution.scopeRef
        : undefined;
    return formExecutionRef === undefined
      ? undefined
      : { ...replaySubject, procedureRef, formExecutionRef };
  }
  if (subject.tag === "bonusActionStandardAction") {
    if ("sourceProcedureRef" in subject) {
      const { sourceProcedureRef: _sourceProcedureRef, ...replaySubject } =
        subject;
      return { ...replaySubject, procedureRef };
    }
    const { sourceUnitId: _sourceUnitId, ...replaySubject } = subject;
    return { ...replaySubject, procedureRef };
  }
  const { resourceUnitId: _resourceUnitId, ...replaySubject } = subject;
  return { ...replaySubject, procedureRef };
}
