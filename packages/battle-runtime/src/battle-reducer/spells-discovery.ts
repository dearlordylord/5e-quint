// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-created-held-object
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-object-contact-damage
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spiritual-weapon-attack-proxy
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-governor-quickened
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-damage-type-substitution
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-effective-level-extra-target
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-antimagic-field-action-interdiction
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_TRANSMUTED_DAMAGE_TYPE_SUBSTITUTION
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_TWINNED_EFFECTIVE_LEVEL_EXTRA_TARGET
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ANTIMAGIC_FIELD_ACTION_INTERDICTION
// Spell discovery (Cluster K). Mechanical extraction from battle-reducer.ts.
// Discovers per-actor SupportedSpellInvocation acts, computes cast-summary
// strings, classifies invocations, and synthesises the optional readied-spell
// variant for each cast act.
//
// Dependencies on profile predicates (cluster O) and hole/fill helpers
// (cluster P) currently round-trip through `../battle-reducer.ts`; they will
// be retargeted after Pass 11/12 land. Likewise `interruptTriggerLabel` stays
// in `../battle-reducer.ts` pending the dispatcher merge (Pass 19, cycle #25).

// KERNEL-COVERAGE: runtime-owner BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES BATTLE.COMMAND.OPTION_AND_NEXT_TURN
import type { SpellRecord } from "@dnd/surface/surface/types";
import type { CombatantId } from "../identity.ts";
import { BATTLE_READIED_SPELL_TRIGGERS } from "../battle-interrupt-triggers.ts";
import {
  interruptTriggerLabel,
  type BattleHole,
  type AvailableBattleAct,
  type BattleCreatureState,
  type BattleState,
  type ReadiedSpellInvocation,
  type SupportedSpellInvocation,
  type TargetListSpellInvocation,
} from "../battle-reducer.ts";
import {
  spellInvocationIsSpellcasting,
  spellActTurnResourceAvailable,
  spellHasAvailableSpend,
} from "./spell-turn-resources.ts";
import { supportedSpellActs } from "./spells-profiles.ts";
import {
  supportedSpellInvocationMatchesRef,
  supportedSpellInvocationRef,
} from "./spells-holes-fills.ts";
import { targetListTargetingHasFixedMaximum } from "./spells-targeting.ts";
import {
  registeredSpellProcedureProfile,
  spellProcedureProfileFor,
} from "./spell-procedure-profiles/registry.ts";
import { spellCastReactionFactsHole } from "./spell-cast-interrupt-frame.ts";
import {
  combatantInsideActiveAntimagicFieldAura,
  spellInvocationActInterdictedByAntimagicField,
} from "./antimagic-field-action-interdiction.ts";
import {
  counterspellCapableReactors,
  spellCastCanTriggerCounterspell,
  type CounterspellCapableReactor,
} from "./counterspell-reaction-discovery.ts";
import {
  actorCanOfferQuickenedSpellMetamagic,
  discoverTransmutedSpellMetamagicSelections,
  discoverTwinnedSpellMetamagicSelections,
  QUICKENED_SPELL_METAMAGIC_SELECTION,
  spellMetamagicApplications,
  spellInvocationSupportsQuickenedActionRewrite,
  transmutedSpellMetamagicLabel,
  twinnedSpellTargetCountInvocation,
} from "./metamagic.ts";

type SpellProcedureProfileDiscovery = {
  readonly discoverCastAct: (
    state: BattleState,
    actorId: CombatantId,
    invocation: never,
  ) => readonly AvailableBattleAct[];
};

type SpellProcedureProfileCastSummary = {
  readonly castSummary: (invocation: never) => string;
};

function discoverRegisteredSpellProcedureCastAct(
  profile: SpellProcedureProfileDiscovery,
  state: BattleState,
  actorId: CombatantId,
  invocation: SupportedSpellInvocation,
): readonly AvailableBattleAct[] {
  // Registry lookup preserves the procedure/invocation pairing, but the
  // heterogeneous profile methods erase to a union at this call site.
  return profile.discoverCastAct(state, actorId, invocation as never);
}

function registeredSpellProcedureCastSummary(
  profile: SpellProcedureProfileCastSummary,
  invocation: SupportedSpellInvocation,
): string {
  // Registry lookup preserves the procedure/invocation pairing, but the
  // heterogeneous profile methods erase to a union at this call site.
  return profile.castSummary(invocation as never);
}

export function discoverSupportedSpellInvocations(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    return [];
  }
  const spellcastingPreventedByAntimagicField =
    combatantInsideActiveAntimagicFieldAura(state, actorId);
  const invocations = supportedSpellActs(actor, state);
  const counterspellReactors = counterspellCapableReactors(state);
  const acts = invocations.flatMap(
    (invocation): readonly AvailableBattleAct[] => {
      if (invocation.procedure === "shieldReaction") {
        return [];
      }
      if (invocation.spell.mechanics.family === "triggered_reaction") {
        return [];
      }
      if (
        spellcastingPreventedByAntimagicField &&
        spellInvocationActInterdictedByAntimagicField(invocation)
      ) {
        return [];
      }
      if (!spellHasAvailableSpend(actor, invocation)) {
        return [];
      }
      if (!spellInvocationCasterPrerequisiteIsMet(actor, invocation)) {
        return [];
      }
      const naturalTurnResourceAvailable = spellActTurnResourceAvailable(
        state.currentTurnResources,
        actorId,
        invocation,
      );
      const quickenedTurnResourceAvailable =
        spellInvocationSupportsQuickenedActionRewrite(invocation) &&
        actorCanOfferQuickenedSpellMetamagic({
          state,
          actor,
          actorId,
          invocation,
        });
      if (!naturalTurnResourceAvailable && !quickenedTurnResourceAvailable) {
        return [];
      }
      const profile = spellProcedureProfileFor(invocation.procedure);
      return discoverRegisteredSpellProcedureCastAct(
        profile,
        state,
        actorId,
        invocation,
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
        invocations,
      }),
    )
    .flatMap((act) =>
      spellActWithTransmutedDamageType({
        act,
        actor,
        invocations,
      }),
    )
    .flatMap((act) =>
      spellActWithTwinnedTargetCount({
        act,
        state,
        actor,
        actorId,
        invocations,
      }),
    )
    .map((act) =>
      spellCastReactionFactsAct(
        actorId,
        invocations,
        counterspellReactors,
        act,
      ),
    );
}

function spellActWithQuickenedRewrite(input: {
  readonly act: AvailableBattleAct;
  readonly state: BattleState;
  readonly actor: BattleCreatureState;
  readonly actorId: CombatantId;
  readonly invocations: readonly SupportedSpellInvocation[];
}): readonly AvailableBattleAct[] {
  const subject = input.act.subject;
  if (subject.tag !== "actionSpell") {
    return [input.act];
  }
  const invocation = input.invocations.find((candidate) =>
    supportedSpellInvocationMatchesRef(candidate, subject.invocation),
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
              invocation: subject.invocation,
              mode: subject.mode,
              metamagic: QUICKENED_SPELL_METAMAGIC_SELECTION,
            },
            label: `${input.act.label} (Quickened Spell)`,
            summary: `Cast ${input.act.label} with Quickened Spell as a Bonus Action.`,
          },
        ]
      : [];
  return [...naturalActs, ...quickenedActs];
}

function spellActWithTransmutedDamageType(input: {
  readonly act: AvailableBattleAct;
  readonly actor: BattleCreatureState;
  readonly invocations: readonly SupportedSpellInvocation[];
}): readonly AvailableBattleAct[] {
  const subject = input.act.subject;
  if (
    subject.tag !== "actionSpell" ||
    subject.mode.tag !== "cast" ||
    subject.metamagic !== undefined
  ) {
    return [input.act];
  }
  const invocation = input.invocations.find((candidate) =>
    supportedSpellInvocationMatchesRef(candidate, subject.invocation),
  );
  if (invocation === undefined) {
    return [input.act];
  }
  const transmutedActs = discoverTransmutedSpellMetamagicSelections({
    actor: input.actor,
    invocation,
  }).map((metamagic) => {
    const label = transmutedSpellMetamagicLabel(metamagic);
    return {
      ...input.act,
      subject: {
        ...subject,
        metamagic,
      },
      label: `${input.act.label} (${label})`,
      summary: `${input.act.summary} Cast with ${label}.`,
    };
  });
  return [input.act, ...transmutedActs];
}

function spellActWithTwinnedTargetCount(input: {
  readonly act: AvailableBattleAct;
  readonly state: BattleState;
  readonly actor: BattleCreatureState;
  readonly actorId: CombatantId;
  readonly invocations: readonly SupportedSpellInvocation[];
}): readonly AvailableBattleAct[] {
  const subject = input.act.subject;
  if (
    (subject.tag !== "actionSpell" && subject.tag !== "bonusActionSpell") ||
    subject.mode.tag !== "cast" ||
    subject.metamagic !== undefined
  ) {
    return [input.act];
  }
  const invocation = input.invocations.find((candidate) =>
    supportedSpellInvocationMatchesRef(candidate, subject.invocation),
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
    const profile = spellProcedureProfileFor(twinnedInvocation.procedure);
    return discoverRegisteredSpellProcedureCastAct(
      profile,
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
        label: `${act.label} (Twinned Spell)`,
        summary: `${act.summary} Cast with Twinned Spell.`,
      }));
  });
  return [input.act, ...twinnedActs];
}

function spellCastReactionFactsAct(
  actorId: CombatantId,
  invocations: readonly SupportedSpellInvocation[],
  counterspellReactors: readonly CounterspellCapableReactor[],
  act: AvailableBattleAct,
): AvailableBattleAct {
  const subject = act.subject;
  if (
    (subject.tag !== "actionSpell" &&
      subject.tag !== "bonusActionSpell" &&
      subject.tag !== "bonusActionDashSpell") ||
    (subject.mode.tag !== "cast" && subject.mode.tag !== "ready")
  ) {
    return act;
  }
  const invocation = invocations.find((candidate) =>
    supportedSpellInvocationMatchesRef(candidate, subject.invocation),
  );
  return invocation === undefined
    ? act
    : {
        ...act,
        initialHoles: spellCastInitialHoles(
          actorId,
          invocation,
          counterspellReactors,
          act.initialHoles,
        ),
      };
}

function spellCastInitialHoles(
  actorId: CombatantId,
  invocation: SupportedSpellInvocation,
  counterspellReactors: readonly CounterspellCapableReactor[],
  holes: readonly BattleHole[],
): readonly BattleHole[] {
  return spellCastCanTriggerCounterspell({
    casterId: actorId,
    invocation,
    reactors: counterspellReactors,
  })
    ? [...holes, spellCastReactionFactsHole({ casterId: actorId, invocation })]
    : holes;
}

export function spellInvocationCastSummary(
  invocation: SupportedSpellInvocation,
): string {
  const profile = spellProcedureProfileFor(invocation.procedure);
  return registeredSpellProcedureCastSummary(profile, invocation);
}

export function spellSubjectTagForInvocation(
  invocation: SupportedSpellInvocation,
): "actionSpell" | "bonusActionSpell" {
  if (invocation.procedure === "heldLight") {
    return "bonusActionSpell";
  }
  if (
    invocation.procedure === "spellCreatedHeldObject" ||
    invocation.procedure === "spellCreatedHeldObjectReEvoke"
  ) {
    return "bonusActionSpell";
  }
  if (invocation.procedure === "dancingLightsReposition") {
    return "bonusActionSpell";
  }
  if (
    invocation.procedure === "objectContactDamageRepeat" ||
    invocation.procedure === "spiritualWeaponAttackProxy" ||
    invocation.procedure === "spiritualWeaponRepeatAttack"
  ) {
    return "bonusActionSpell";
  }
  if (
    invocation.procedure === "directHitPointRestoration" &&
    invocation.actionCost === "bonusAction"
  ) {
    return "bonusActionSpell";
  }
  if (
    invocation.procedure === "scalarBuff" &&
    invocation.actionCost === "bonusAction"
  ) {
    return "bonusActionSpell";
  }
  if (invocation.procedure === "weaponDamageRider") {
    return "bonusActionSpell";
  }
  if (invocation.procedure === "magicWeaponEnhancement") {
    return "bonusActionSpell";
  }
  if (invocation.procedure === "weaponAttackOverride") {
    return "bonusActionSpell";
  }
  if (invocation.procedure === "jumpMovementReplacement") {
    return "bonusActionSpell";
  }
  if (invocation.procedure === "selfTeleport") {
    return "bonusActionSpell";
  }
  if (invocation.procedure === "sanctuaryTargetingInterdiction") {
    return "bonusActionSpell";
  }
  if (invocation.procedure === "directConditionRemoval") {
    return "bonusActionSpell";
  }
  if (
    invocation.procedure === "afterHitDamage" ||
    invocation.procedure === "afterHitTimedDamageAndSave" ||
    invocation.procedure === "afterHitDamageAndIllumination"
  ) {
    return "bonusActionSpell";
  }
  if (invocation.procedure === "markedDamageRider") {
    return "bonusActionSpell";
  }
  return "actionSpell";
}

export { spellInvocationIsSpellcasting };

export function spellInvocationCasterPrerequisiteIsMet(
  actor: BattleCreatureState,
  invocation: SupportedSpellInvocation,
): boolean {
  return (
    (invocation.procedure !== "heldLightHurl" ||
      actor.activeEffects.some(
        (effect) =>
          effect.kind === "heldLight" &&
          effect.sourceSpellId === invocation.spell.id &&
          effect.sourceCombatantId === actor.combatantId,
      )) &&
    (invocation.procedure !== "spellCreatedHeldObjectAttack" ||
      actor.activeEffects.some(
        (effect) =>
          effect.kind === "spellCreatedHeldObject" &&
          effect.sourceSpellId === invocation.spell.id &&
          effect.sourceCombatantId === actor.combatantId &&
          effect.objectState.kind === "held",
      )) &&
    (invocation.procedure !== "spellCreatedHeldObjectReEvoke" ||
      actor.activeEffects.some(
        (effect) =>
          effect.kind === "spellCreatedHeldObject" &&
          effect.sourceSpellId === invocation.spell.id &&
          effect.sourceCombatantId === actor.combatantId &&
          effect.objectState.kind === "notHeld",
      )) &&
    (invocation.procedure !== "objectContactDamageRepeat" ||
      actor.activeEffects.some(
        (effect) =>
          effect.kind === "spellObjectContactDamage" &&
          effect.effectId === invocation.activeEffect.effectId &&
          effect.sourceSpellId === invocation.spell.id &&
          effect.sourceCombatantId === actor.combatantId,
      )) &&
    (invocation.procedure !== "spiritualWeaponRepeatAttack" ||
      actor.activeEffects.some(
        (effect) =>
          effect.kind === "spiritualWeapon" &&
          effect.sourceSpellId === invocation.spell.id &&
          effect.sourceCombatantId === actor.combatantId,
      )) &&
    (invocation.procedure !== "dancingLightsReposition" ||
      actor.activeEffects.some(
        (effect) =>
          effect.kind === "dancingLights" &&
          effect.sourceSpellId === invocation.spell.id &&
          effect.sourceCombatantId === actor.combatantId,
      ))
  );
}

export function spellRequiresVerbal(spell: SpellRecord): boolean {
  return "components" in spell.mechanics && spell.mechanics.components.v;
}

export function isReadiedSpellInvocation(
  invocation: SupportedSpellInvocation,
): invocation is ReadiedSpellInvocation {
  const profile = registeredSpellProcedureProfile(invocation.procedure);
  return (
    profile?.isReadiedSpellCompatible === true &&
    readiedSpellInvocationHasReleaseReadyShape(invocation)
  );
}

function readiedSpellInvocationHasReleaseReadyShape(
  invocation: SupportedSpellInvocation,
): boolean {
  // A readied spell release replays spellAttackDamage after any damage-type
  // choice has already been selected by the original cast.
  return (
    invocation.procedure !== "spellAttackDamage" ||
    invocation.damage.kind !== "sorcerousBurstDamageTypeChoice"
  );
}

export function readiedSpellAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: SupportedSpellInvocation,
): readonly AvailableBattleAct[] {
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
      invocation: supportedSpellInvocationRef(invocation),
      mode: { tag: "ready" as const, trigger },
    },
    label: `Ready ${invocation.spell.name}`,
    summary: `Ready ${invocation.spell.name} for ${interruptTriggerLabel(trigger)}; holding the spell requires Concentration until the start of your next turn.`,
    initialHoles: [],
  }));
}

export function targetListSpellUsesTargetListHole(
  invocation: TargetListSpellInvocation,
): boolean {
  if (!targetListTargetingHasFixedMaximum(invocation.targeting)) {
    return true;
  }
  return invocation.targeting.maxTargets > 1;
}

// Spell invocation active-feature gates belong to cluster K but remain behind
// the shared spell act admission boundary until the dispatcher merge resolves
// cycle #25 (turn ↔ spells_discovery).
