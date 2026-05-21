// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-governor-quickened

import { resourceCount, type ResourceCount } from "@dnd/shared/types";
import * as Either from "effect/Either";
import type {
  BattleCreatureState,
  BattleState,
  SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type {
  BattleSubject,
  SpellMetamagicSelection,
} from "../battle-subjects.ts";
import {
  characterBattleResourceIsPointPool,
  spendCharacterPointPoolResource,
  type CharacterBattleMetamagicEffectKind,
  type CharacterBattleMetamagicOptionFact,
  type CharacterBattlePointPoolResourceState,
} from "../character-battle-resources.ts";
import type { CombatantId } from "../identity.ts";
import {
  combatantHasLevelOnePlusSpellCastThisTurn,
  spellInvocationIsLevelOnePlus,
} from "./spells-profiles.ts";

export const QUICKENED_METAMAGIC_EFFECT_KIND =
  "action_casting_time_to_bonus_action_with_spell_turn_limit" satisfies CharacterBattleMetamagicEffectKind;
export const CAREFUL_METAMAGIC_EFFECT_KIND =
  "saving_throw_protection" satisfies CharacterBattleMetamagicEffectKind;
export const HEIGHTENED_METAMAGIC_EFFECT_KIND =
  "saving_throw_disadvantage" satisfies CharacterBattleMetamagicEffectKind;

export const QUICKENED_SPELL_METAMAGIC_SELECTION = [
  { effectKind: QUICKENED_METAMAGIC_EFFECT_KIND },
] as const satisfies readonly [SpellMetamagicSelection];

export type SpellMetamagicAdmissionIssue = {
  readonly tag: "spellMetamagicAdmissionIssue";
  readonly message: string;
};

export type SpellMetamagicAdmission =
  | {
      readonly tag: "ok";
      readonly applications: readonly CharacterBattleMetamagicOptionFact[];
    }
  | SpellMetamagicAdmissionIssue;

type SpellMetamagicSubject = Extract<
  BattleSubject,
  { readonly tag: "actionSpell" | "bonusActionSpell" }
>;

export function admitSpellMetamagicApplications(input: {
  readonly state: BattleState;
  readonly actor: BattleCreatureState;
  readonly actorId: CombatantId;
  readonly invocation: SupportedSpellInvocation;
  readonly subject: SpellMetamagicSubject;
}): SpellMetamagicAdmission {
  const selections = input.subject.metamagic ?? [];
  if (selections.length === 0) {
    return { tag: "ok", applications: [] };
  }
  if (input.actor.origin.kind !== "character") {
    return metamagicIssue(
      "Metamagic selection requires a character with known Metamagic options.",
    );
  }
  const metamagic = input.actor.origin.metamagic;
  if (metamagic === undefined) {
    return metamagicIssue(
      "Metamagic selection requires a character with known Metamagic options.",
    );
  }
  if (hasDuplicateEffectKinds(selections)) {
    return metamagicIssue(
      "Metamagic selections must not repeat an option effect.",
    );
  }
  const knownApplications: CharacterBattleMetamagicOptionFact[] = [];
  for (const selection of selections) {
    const application = metamagic.knownOptions.find(
      (option) => option.effectKind === selection.effectKind,
    );
    if (application === undefined) {
      return metamagicIssue(
        "Metamagic selection must be one of the actor's known Metamagic options.",
      );
    }
    knownApplications.push(application);
  }
  const quickenedSelected =
    metamagicApplicationsIncludeQuickened(knownApplications);
  const stackingIssue = metamagicStackingIssue(knownApplications);
  if (stackingIssue !== null) {
    return metamagicIssue(stackingIssue);
  }
  const supportIssue = spellMetamagicSupportIssue({
    applications: knownApplications,
    invocation: input.invocation,
    subject: input.subject,
  });
  if (supportIssue !== null) {
    return metamagicIssue(supportIssue);
  }
  if (quickenedSelected) {
    const quickenedIssue = quickenedSpellAdmissionIssue({
      state: input.state,
      actor: input.actor,
      actorId: input.actorId,
      invocation: input.invocation,
      subject: input.subject,
    });
    if (quickenedIssue !== null) {
      return metamagicIssue(quickenedIssue);
    }
  }
  const sorceryPointIssue = metamagicSorceryPointSpendIssue({
    actor: input.actor,
    applications: knownApplications,
  });
  return sorceryPointIssue === null
    ? { tag: "ok", applications: knownApplications }
    : metamagicIssue(sorceryPointIssue);
}

export function metamagicApplicationsIncludeQuickened(
  applications: readonly CharacterBattleMetamagicOptionFact[],
): boolean {
  return applications.some(
    (application) => application.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
  );
}

export function metamagicActionCostOverride(
  applications: readonly CharacterBattleMetamagicOptionFact[],
): "bonusAction" | undefined {
  return metamagicApplicationsIncludeQuickened(applications)
    ? "bonusAction"
    : undefined;
}

export function actorCanOfferQuickenedSpellMetamagic(input: {
  readonly state: BattleState;
  readonly actor: BattleCreatureState;
  readonly actorId: CombatantId;
  readonly invocation: SupportedSpellInvocation;
}): boolean {
  if (input.actor.origin.kind !== "character") {
    return false;
  }
  const quickened = input.actor.origin.metamagic?.knownOptions.find(
    (option) => option.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
  );
  if (quickened === undefined) {
    return false;
  }
  if (!spellInvocationHasMagicActionCastingTime(input.invocation)) {
    return false;
  }
  if (!input.state.currentTurnResources.currentHasBonusAction) {
    return false;
  }
  if (
    spellInvocationIsLevelOnePlus(input.invocation) &&
    combatantHasLevelOnePlusSpellCastThisTurn(
      input.state.currentTurnResources,
      input.actorId,
    )
  ) {
    return false;
  }
  return (
    metamagicSorceryPointSpendIssue({
      actor: input.actor,
      applications: [quickened],
    }) === null
  );
}

export function spellInvocationHasMagicActionCastingTime(
  invocation: SupportedSpellInvocation,
): boolean {
  return (
    !("actionCost" in invocation) || invocation.actionCost === "magicAction"
  );
}

export function spendSpellMetamagicSorceryPoints(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly applications: readonly CharacterBattleMetamagicOptionFact[];
}): Either.Either<BattleState, string> {
  if (input.applications.length === 0) {
    return Either.right(input.state);
  }
  const actor = input.state.combatants.get(input.actorId);
  if (actor?.origin.kind !== "character") {
    return Either.left(
      "Metamagic selection requires a character with known Metamagic options.",
    );
  }
  const metamagic = actor.origin.metamagic;
  if (metamagic === undefined) {
    return Either.left(
      "Metamagic selection requires a character with known Metamagic options.",
    );
  }
  const resource = actor.origin.resources.find(
    (candidate): candidate is CharacterBattlePointPoolResourceState =>
      candidate.unit.id === metamagic.sorceryPointResourceUnitId &&
      characterBattleResourceIsPointPool(candidate),
  );
  if (resource === undefined) {
    return Either.left("Metamagic requires its shared Sorcery Point resource.");
  }
  const spent = spendCharacterPointPoolResource({
    resource,
    points: metamagicSorceryPointCost(input.applications),
  });
  if (Either.isLeft(spent)) {
    return Either.left("Metamagic requires enough unexpended Sorcery Points.");
  }
  return Either.right({
    ...input.state,
    combatants: new Map(input.state.combatants).set(input.actorId, {
      ...actor,
      origin: {
        ...actor.origin,
        resources: actor.origin.resources.map((candidate) =>
          candidate.unit.id === metamagic.sorceryPointResourceUnitId &&
          characterBattleResourceIsPointPool(candidate)
            ? spent.right
            : candidate,
        ),
      },
    }),
  });
}

function metamagicIssue(message: string): SpellMetamagicAdmissionIssue {
  return { tag: "spellMetamagicAdmissionIssue", message };
}

function hasDuplicateEffectKinds(
  selections: readonly SpellMetamagicSelection[],
): boolean {
  return (
    new Set(selections.map((selection) => selection.effectKind)).size !==
    selections.length
  );
}

function metamagicStackingIssue(
  applications: readonly CharacterBattleMetamagicOptionFact[],
): string | null {
  if (applications.length <= 1) {
    return null;
  }
  const hasStackingException = applications.some(
    (application) =>
      application.stackingMode === "can_combine_with_different_metamagic",
  );
  return applications.length === 2 && hasStackingException
    ? null
    : "A spell can use only one Metamagic option unless one selected option explicitly combines with a different Metamagic option.";
}

export function discoverSpellMetamagicSelections(input: {
  readonly actor: BattleCreatureState;
  readonly invocation: SupportedSpellInvocation;
}): readonly (readonly [SpellMetamagicSelection])[] {
  if (
    input.actor.origin.kind !== "character" ||
    input.actor.origin.metamagic === undefined
  ) {
    return [];
  }
  return input.actor.origin.metamagic.knownOptions.flatMap((application) => {
    if (
      application.effectKind !== CAREFUL_METAMAGIC_EFFECT_KIND &&
      application.effectKind !== HEIGHTENED_METAMAGIC_EFFECT_KIND
    ) {
      return [];
    }
    if (
      spellMetamagicSupportIssue({
        applications: [application],
        invocation: input.invocation,
        subject: {
          tag: "actionSpell",
          mode: { tag: "cast" },
        },
      }) !== null
    ) {
      return [];
    }
    return metamagicSorceryPointSpendIssue({
      actor: input.actor,
      applications: [application],
    }) === null
      ? [[{ effectKind: application.effectKind }]]
      : [];
  });
}

function spellMetamagicSupportIssue(input: {
  readonly applications: readonly CharacterBattleMetamagicOptionFact[];
  readonly invocation: SupportedSpellInvocation;
  readonly subject: Pick<SpellMetamagicSubject, "tag" | "mode">;
}): string | null {
  const effectKinds = new Set(
    input.applications.map((option) => option.effectKind),
  );
  if (effectKinds.has(QUICKENED_METAMAGIC_EFFECT_KIND)) {
    return input.applications.every(
      (application) =>
        application.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
    )
      ? null
      : "Selected Metamagic option effect is not supported for this spell procedure.";
  }
  const saveMetamagicOnly =
    effectKinds.size > 0 &&
    [...effectKinds].every(
      (effectKind) =>
        effectKind === CAREFUL_METAMAGIC_EFFECT_KIND ||
        effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
    );
  if (!saveMetamagicOnly) {
    return "Selected Metamagic option effect is not supported for this spell procedure.";
  }
  if (
    input.subject.tag !== "actionSpell" ||
    input.subject.mode.tag !== "cast"
  ) {
    return "Save-affecting Metamagic is supported only for action-time spell casts.";
  }
  if (input.invocation.procedure === "sleepTargetAdmission") {
    return "Save-affecting Metamagic is not supported for Sleep target admission because Sleep uses a two-stage admission and repeat-save lifecycle.";
  }
  if (
    effectKinds.has(HEIGHTENED_METAMAGIC_EFFECT_KIND) &&
    spellInvocationHasRepeatSavingThrowLifecycle(input.invocation)
  ) {
    return "Heightened Spell is not supported for spell procedures with repeat Saving Throws until the selected target is carried through later save holes.";
  }
  if (!spellInvocationSupportsSaveMetamagic(input.invocation)) {
    return "Selected Metamagic option effect is not supported for this spell procedure.";
  }
  return null;
}

function spellInvocationSupportsSaveMetamagic(
  invocation: SupportedSpellInvocation,
): boolean {
  return (
    invocation.procedure === "saveGatedDamage" ||
    invocation.procedure === "saveGatedCondition" ||
    invocation.procedure === "saveGatedConditionImmunity" ||
    invocation.procedure === "saveGatedAttackRollAdvantage" ||
    invocation.procedure === "hideousLaughter" ||
    invocation.procedure === "command" ||
    invocation.procedure === "greaseGroundHazard" ||
    invocation.procedure === "gustOfWindLine"
  );
}

function spellInvocationHasRepeatSavingThrowLifecycle(
  invocation: SupportedSpellInvocation,
): boolean {
  return (
    invocation.procedure === "hideousLaughter" ||
    invocation.procedure === "greaseGroundHazard" ||
    invocation.procedure === "gustOfWindLine" ||
    (invocation.procedure === "saveGatedCondition" &&
      invocation.effect.repeatSave !== null)
  );
}

function quickenedSpellAdmissionIssue(input: {
  readonly state: BattleState;
  readonly actor: BattleCreatureState;
  readonly actorId: CombatantId;
  readonly invocation: SupportedSpellInvocation;
  readonly subject: SpellMetamagicSubject;
}): string | null {
  if (input.subject.tag !== "bonusActionSpell") {
    return "Quickened Spell must use the Bonus Action spell subject.";
  }
  if (!spellInvocationHasMagicActionCastingTime(input.invocation)) {
    return "Quickened Spell can modify only a spell whose casting time is an action.";
  }
  if (
    spellInvocationIsLevelOnePlus(input.invocation) &&
    combatantHasLevelOnePlusSpellCastThisTurn(
      input.state.currentTurnResources,
      input.actorId,
    )
  ) {
    return "Quickened Spell cannot modify a level 1+ spell after this turn has already cast a level 1+ spell.";
  }
  return input.actor.origin.kind === "character" &&
    input.actor.origin.metamagic?.knownOptions.some(
      (option) => option.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
    )
    ? null
    : "Quickened Spell selection requires the actor to know Quickened Spell.";
}

function metamagicSorceryPointSpendIssue(input: {
  readonly actor: BattleCreatureState;
  readonly applications: readonly CharacterBattleMetamagicOptionFact[];
}): string | null {
  if (input.actor.origin.kind !== "character") {
    return "Metamagic selection requires a character with known Metamagic options.";
  }
  const metamagic = input.actor.origin.metamagic;
  if (metamagic === undefined) {
    return "Metamagic selection requires a character with known Metamagic options.";
  }
  const resource = input.actor.origin.resources.find(
    (candidate): candidate is CharacterBattlePointPoolResourceState =>
      candidate.unit.id === metamagic.sorceryPointResourceUnitId &&
      characterBattleResourceIsPointPool(candidate),
  );
  if (resource === undefined) {
    return "Metamagic requires its shared Sorcery Point resource.";
  }
  return Number(resource.pointsRemaining) >=
    Number(metamagicSorceryPointCost(input.applications))
    ? null
    : "Metamagic requires enough unexpended Sorcery Points.";
}

function metamagicSorceryPointCost(
  applications: readonly CharacterBattleMetamagicOptionFact[],
): ResourceCount {
  return resourceCount(
    applications.reduce(
      (total, application) => total + Number(application.sorceryPointCost),
      0,
    ),
  );
}
