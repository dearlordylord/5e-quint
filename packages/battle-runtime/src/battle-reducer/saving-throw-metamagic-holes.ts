import type {
  BattleActDiscoveryCandidate,
  BattleCreatureState,
  BattleExecutableSpellInvocation,
  BattleHole,
  BattleState,
} from "../battle-state-execution.ts";
import type { CharacterBattleMetamagicOptionFact } from "../character-battle-resource-execution.ts";
import type { CombatantId } from "../identity.ts";
import {
  CAREFUL_METAMAGIC_EFFECT_KIND,
  discoverSpellMetamagicSelections,
  HEIGHTENED_METAMAGIC_EFFECT_KIND,
  spellMetamagicApplications,
} from "./metamagic-support.ts";
import {
  carefulSpellProtectedTargetsHole,
  heightenedSpellTargetChoiceHole,
  spellSavingThrowTargeting,
} from "./spells-holes-fills.ts";
import { actionSpellCastCandidate } from "./spell-cast-candidate.ts";
import { spellSavingThrowOutcomeHole } from "./spells-damage-fills.ts";

type SavingThrowInvocation = Parameters<typeof spellSavingThrowTargeting>[0] &
  BattleExecutableSpellInvocation;

export function discoverSavingThrowSpellCastActs(
  state: BattleState,
  actorId: CombatantId,
  invocation: SavingThrowInvocation,
): readonly BattleActDiscoveryCandidate[] {
  const savingThrowHole = spellSavingThrowOutcomeHole(
    state,
    actorId,
    invocation,
  );
  const baseCastAct = actionSpellCastCandidate(
    actorId,
    invocation.sourceProcedureRef,
    [savingThrowHole],
  );
  return [
    baseCastAct,
    ...discoverSavingThrowMetamagicCastActs({
      state,
      actorId,
      actor: state.combatants.get(actorId),
      invocation,
      baseCastAct,
      initialHoles: (applications) =>
        savingThrowMetamagicHolesOr(state, actorId, invocation, applications, [
          savingThrowHole,
        ]),
    }),
  ];
}

export function discoverTargetSavingThrowSpellCastActs(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly actor: BattleCreatureState;
  readonly invocation: SavingThrowInvocation;
  readonly targetHole: BattleHole;
  readonly additionalHoles?: readonly BattleHole[];
}): readonly BattleActDiscoveryCandidate[] {
  const additionalHoles = input.additionalHoles ?? [];
  const baseCastAct = actionSpellCastCandidate(
    input.actorId,
    input.invocation.sourceProcedureRef,
    [input.targetHole, ...additionalHoles],
  );
  return [
    baseCastAct,
    ...discoverSavingThrowMetamagicCastActs({
      ...input,
      baseCastAct,
      initialHoles: (applications) => [
        input.targetHole,
        ...savingThrowMetamagicHoles(
          input.state,
          input.actorId,
          input.invocation,
          applications,
        ),
        ...additionalHoles,
      ],
    }),
  ];
}

export function savingThrowMetamagicHoles(
  state: BattleState,
  actorId: CombatantId,
  invocation: SavingThrowInvocation,
  metamagicApplications: ReadonlyArray<{ readonly effectKind: string }>,
  initialHoles: readonly BattleHole[] = [],
): readonly BattleHole[] {
  const targeting = spellSavingThrowTargeting(invocation);
  const holes = [...initialHoles];

  if (
    targeting.kind !== "singleCombatant" &&
    metamagicApplications.some(
      ({ effectKind }) => effectKind === CAREFUL_METAMAGIC_EFFECT_KIND,
    )
  ) {
    holes.push(carefulSpellProtectedTargetsHole(state, actorId, invocation));
  }
  if (
    targeting.kind !== "singleCombatant" &&
    metamagicApplications.some(
      ({ effectKind }) => effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
    )
  ) {
    holes.push(heightenedSpellTargetChoiceHole(state, actorId, invocation));
  }

  return holes;
}

export function discoverSavingThrowMetamagicCastActs(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly actor: BattleCreatureState | undefined;
  readonly invocation: SavingThrowInvocation;
  readonly baseCastAct: BattleActDiscoveryCandidate;
  readonly initialHoles: (
    applications: readonly CharacterBattleMetamagicOptionFact[],
  ) => readonly BattleHole[];
}): readonly BattleActDiscoveryCandidate[] {
  const actor = input.actor;
  if (actor === undefined) {
    return [];
  }

  return discoverSpellMetamagicSelections({
    actor,
    invocation: input.invocation,
  }).map((metamagic) => {
    const applications = spellMetamagicApplications(actor, metamagic);
    return {
      ...input.baseCastAct,
      subject: { ...input.baseCastAct.subject, metamagic },
      initialHoles: input.initialHoles(applications),
    };
  });
}

export function savingThrowMetamagicHolesOr(
  state: BattleState,
  actorId: CombatantId,
  invocation: SavingThrowInvocation,
  applications: readonly CharacterBattleMetamagicOptionFact[],
  fallbackHoles: readonly BattleHole[],
  additionalHoles: readonly BattleHole[] = [],
): readonly BattleHole[] {
  const holes = savingThrowMetamagicHoles(
    state,
    actorId,
    invocation,
    applications,
    additionalHoles,
  );
  return holes.length === 0 ? fallbackHoles : holes;
}
