// Spell discovery (Cluster K). Mechanical extraction from battle-reducer.ts.
// Discovers per-actor SupportedSpellInvocation acts, computes cast-summary
// strings, classifies invocations, and synthesises the optional readied-spell
// variant for each cast act.
//
// Dependencies on profile predicates (cluster O) and hole/fill helpers
// (cluster P) currently round-trip through `../battle-reducer.ts`; they will
// be retargeted after Pass 11/12 land. Likewise `reactionTriggerLabel` and
// `activeOngoingFeaturesPreventSpellcasting` stay in `../battle-reducer.ts`
// pending the dispatcher merge (Pass 19, cycle #25).

import type { SpellRecord } from "@dnd/surface/surface/types";
import type { CombatantId } from "../identity.ts";
import { BATTLE_READIED_SPELL_TRIGGERS } from "../battle-reaction-triggers.ts";
import {
  activeOngoingFeaturesPreventSpellcasting,
  isScalarBuffTargetListInvocation,
  isTargetListSpellInvocation,
  reactionTriggerLabel,
  type BattleActiveEffect,
  type BattleHole,
  type AvailableBattleAct,
  type BattleCreatureState,
  type BattleState,
  type ReadiedSpellInvocation,
  type SupportedSpellInvocation,
  type TargetListSpellInvocation,
} from "../battle-reducer.ts";
import {
  spellActTurnResourceAvailable,
  spellHasAvailableSpend,
  supportedSpellActs,
} from "./spells-profiles.ts";
import { spellAttackSequencePartName } from "./spells-profile-shared.ts";
import { representedMovementSpeedKinds } from "./movement-speed.ts";
import {
  scalarBuffInitialHoles,
  commandOptionChoiceHole,
  saveGatedConditionHasConditionChoice,
  spellAbilityChoiceHole,
  spellConditionChoiceHole,
  spellDamageTypeChoiceHole,
  spellAttackSequencePartObjectTargetHole,
  spellAttackSequencePartTargetHole,
  spellObjectTargetHole,
  spellAreaChoiceHole,
  spellRollModifierAbilityChoiceHole,
  spellRollModifierSkillChoiceHole,
  spellSavingThrowAbility,
  spellSavingThrowOutcomeHole,
  spellTargetAllocationHole,
  spellTargetHole,
  spellTargetListHole,
  spellTeleportDestinationHole,
  thaumaturgyActiveOneMinuteEffectCountHole,
  supportedSpellInvocationMatchesRef,
  supportedSpellInvocationRef,
} from "./spells-holes-fills.ts";
import {
  spellDancingLightsPlacementHole,
  targetListTargetingHasFixedMaximum,
} from "./spells-targeting.ts";
import { dancingLightsFromEffect } from "./spells-active-effects.ts";
import { attackTargetHole } from "./hole-helpers.ts";
import { spellCastReactionFactsHole } from "./spell-cast-reaction-frame.ts";
import {
  counterspellCapableReactors,
  spellCastCanTriggerCounterspell,
  type CounterspellCapableReactor,
} from "./counterspell-reaction-discovery.ts";

export function discoverSupportedSpellInvocations(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    return [];
  }
  const spellcastingPrevented = activeOngoingFeaturesPreventSpellcasting(actor);
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
      if (spellcastingPrevented && spellInvocationIsSpellcasting(invocation)) {
        return [];
      }
      if (!spellHasAvailableSpend(actor, invocation)) {
        return [];
      }
      if (!spellInvocationCasterPrerequisiteIsMet(actor, invocation)) {
        return [];
      }
      if (
        !spellActTurnResourceAvailable(
          state.currentTurnResources,
          actorId,
          invocation,
        )
      ) {
        return [];
      }
      if (invocation.procedure === "command") {
        const targetHole = spellTargetListHole(state, actorId, invocation);
        return targetHole.choices.length === 0
          ? []
          : [
              {
                subject: {
                  tag: "actionSpell" as const,
                  actorId,
                  invocation: supportedSpellInvocationRef(invocation),
                  mode: { tag: "cast" as const },
                },
                label: invocation.spell.name,
                summary: `${spellActivationInvocationCastSummary(invocation)} Failed targets follow the selected command on their next turns.`,
                initialHoles: [targetHole, commandOptionChoiceHole(invocation)],
              },
            ];
      }
      if (invocation.procedure === "fogCloudObscurement") {
        return [
          {
            subject: {
              tag: "actionSpell" as const,
              actorId,
              invocation: supportedSpellInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: `${spellActivationInvocationCastSummary(invocation)} The table supplies the fog area identity.`,
            initialHoles: [spellAreaChoiceHole(invocation)],
          },
        ];
      }
      if (invocation.procedure === "flamingSphere") {
        return [
          {
            subject: {
              tag: "actionSpell" as const,
              actorId,
              invocation: supportedSpellInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: `${spellActivationInvocationCastSummary(invocation)} The table supplies the sphere area identity.`,
            initialHoles: [spellAreaChoiceHole(invocation)],
          },
        ];
      }
      if (invocation.procedure === "moonbeam") {
        return [
          {
            subject: {
              tag: "actionSpell" as const,
              actorId,
              invocation: supportedSpellInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: `${spellActivationInvocationCastSummary(invocation)} The table supplies the Moonbeam cylinder area identity.`,
            initialHoles: [spellAreaChoiceHole(invocation)],
          },
        ];
      }
      if (invocation.procedure === "selfTeleport") {
        return [
          {
            subject: {
              tag: "bonusActionSpell" as const,
              actorId,
              invocation: supportedSpellInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: spellInvocationCastSummary(invocation),
            initialHoles: [spellTeleportDestinationHole(invocation, actorId)],
          },
        ];
      }
      if (
        invocation.procedure === "saveGatedDamage" ||
        invocation.procedure === "saveGatedCondition" ||
        invocation.procedure === "saveGatedAttackRollAdvantage" ||
        invocation.procedure === "sleepTargetAdmission" ||
        invocation.procedure === "hideousLaughter" ||
        invocation.procedure === "greaseGroundHazard"
      ) {
        if (
          invocation.targeting.kind === "singleCombatant" ||
          ((invocation.procedure === "saveGatedCondition" ||
            invocation.procedure === "hideousLaughter") &&
            invocation.targeting.kind === "targetList")
        ) {
          const targetHole =
            invocation.targeting.kind === "singleCombatant"
              ? spellTargetHole(state, actorId, invocation)
              : isTargetListSpellInvocation(invocation)
                ? spellTargetListHole(state, actorId, invocation)
                : null;
          if (targetHole === null) {
            return [];
          }
          if (targetHole.choices.length === 0) {
            return [];
          }
          const conditionChoiceHoles =
            invocation.procedure === "saveGatedCondition" &&
            saveGatedConditionHasConditionChoice(invocation)
              ? [spellConditionChoiceHole(invocation)]
              : [];
          const castActs = [
            {
              subject: {
                tag: "actionSpell" as const,
                actorId,
                invocation: supportedSpellInvocationRef(invocation),
                mode: { tag: "cast" as const },
              },
              label: invocation.spell.name,
              summary: `${spellActivationInvocationCastSummary(invocation)} Table-supplied affected targets make ${spellSavingThrowAbility(invocation).toUpperCase()} Saving Throws.`,
              initialHoles: [targetHole, ...conditionChoiceHoles],
            },
          ];
          return invocation.procedure === "greaseGroundHazard"
            ? castActs
            : [...castActs, ...readiedSpellAct(state, actorId, invocation)];
        }
        const initialHole = spellSavingThrowOutcomeHole(
          state,
          actorId,
          invocation,
        );
        const conditionChoiceHoles =
          invocation.procedure === "saveGatedCondition" &&
          saveGatedConditionHasConditionChoice(invocation)
            ? [spellConditionChoiceHole(invocation)]
            : [];
        const castActs = [
          {
            subject: {
              tag: "actionSpell" as const,
              actorId,
              invocation: supportedSpellInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: `${spellActivationInvocationCastSummary(invocation)} Table-supplied affected targets make ${spellSavingThrowAbility(invocation).toUpperCase()} Saving Throws.`,
            initialHoles: [initialHole, ...conditionChoiceHoles],
          },
        ];
        return invocation.procedure === "greaseGroundHazard"
          ? castActs
          : [...castActs, ...readiedSpellAct(state, actorId, invocation)];
      }
      if (invocation.procedure === "rollModifier") {
        const targetHole = targetListSpellUsesTargetListHole(invocation)
          ? spellTargetListHole(state, actorId, invocation)
          : spellTargetHole(state, actorId, invocation);
        const initialHoles =
          targetHole.choices.length === 0
            ? []
            : [
                targetHole,
                ...(invocation.skillChoices === null
                  ? []
                  : [spellRollModifierSkillChoiceHole(invocation)]),
                ...(invocation.abilityChoices === null
                  ? []
                  : [spellRollModifierAbilityChoiceHole(invocation)]),
              ];
        const castActs =
          initialHoles.length === 0
            ? []
            : [
                {
                  subject: {
                    tag: "actionSpell" as const,
                    actorId,
                    invocation: supportedSpellInvocationRef(invocation),
                    mode: { tag: "cast" as const },
                  },
                  label: invocation.spell.name,
                  summary: spellInvocationCastSummary(invocation),
                  initialHoles,
                },
              ];
        return castActs;
      }
      if (invocation.procedure === "thaumaturgyBoomingVoice") {
        return [
          {
            subject: {
              tag: "actionSpell" as const,
              actorId,
              invocation: supportedSpellInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: spellInvocationCastSummary(invocation),
            initialHoles: [
              thaumaturgyActiveOneMinuteEffectCountHole(invocation),
            ],
          },
        ];
      }
      if (invocation.procedure === "creatureTypeProtection") {
        const targetHole = spellTargetHole(state, actorId, invocation);
        const castActs =
          targetHole.choices.length === 0
            ? []
            : [
                {
                  subject: {
                    tag: "actionSpell" as const,
                    actorId,
                    invocation: supportedSpellInvocationRef(invocation),
                    mode: { tag: "cast" as const },
                  },
                  label: invocation.spell.name,
                  summary: spellInvocationCastSummary(invocation),
                  initialHoles: [targetHole],
                },
              ];
        return castActs;
      }
      if (invocation.procedure === "blurAttackRollDefense") {
        return [
          {
            subject: {
              tag: "actionSpell" as const,
              actorId,
              invocation: supportedSpellInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: spellInvocationCastSummary(invocation),
            initialHoles: [],
          },
        ];
      }
      if (invocation.procedure === "mirrorImageHitInterception") {
        return [
          {
            subject: {
              tag: "actionSpell" as const,
              actorId,
              invocation: supportedSpellInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: spellInvocationCastSummary(invocation),
            initialHoles: [],
          },
        ];
      }
      if (invocation.procedure === "damageReduction") {
        const targetHole = spellTargetHole(state, actorId, invocation);
        const castActs =
          targetHole.choices.length === 0
            ? []
            : [
                {
                  subject: {
                    tag: "actionSpell" as const,
                    actorId,
                    invocation: supportedSpellInvocationRef(invocation),
                    mode: { tag: "cast" as const },
                  },
                  label: invocation.spell.name,
                  summary: spellInvocationCastSummary(invocation),
                  initialHoles: [
                    targetHole,
                    spellDamageTypeChoiceHole(invocation),
                  ],
                },
              ];
        return castActs;
      }
      if (invocation.procedure === "heldLight") {
        return [
          {
            subject: {
              tag: "bonusActionSpell" as const,
              actorId,
              invocation: supportedSpellInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: spellInvocationCastSummary(invocation),
            initialHoles: [],
          },
        ];
      }
      if (
        invocation.procedure === "dancingLightsSeparateCast" ||
        invocation.procedure === "dancingLightsCombinedCast"
      ) {
        return [
          {
            subject: {
              tag: "actionSpell" as const,
              actorId,
              invocation: supportedSpellInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: spellInvocationCastSummary(invocation),
            initialHoles: [
              spellDancingLightsPlacementHole(invocation, invocation.form, []),
            ],
          },
        ];
      }
      if (invocation.procedure === "dancingLightsReposition") {
        const activeEffect = actor.activeEffects.find(
          (
            effect,
          ): effect is Extract<
            BattleActiveEffect,
            { readonly kind: "dancingLights" }
          > =>
            effect.kind === "dancingLights" &&
            effect.sourceSpellId === invocation.spell.id &&
            effect.sourceCombatantId === actorId,
        );
        if (activeEffect === undefined) {
          return [];
        }
        return [
          {
            subject: {
              tag: "bonusActionSpell" as const,
              actorId,
              invocation: supportedSpellInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: `${invocation.spell.name} movement`,
            summary: spellInvocationCastSummary(invocation),
            initialHoles: [
              spellDancingLightsPlacementHole(
                invocation,
                activeEffect.form,
                dancingLightsFromEffect(activeEffect).map(
                  (light) => light.lightId,
                ),
              ),
            ],
          },
        ];
      }
      if (invocation.procedure === "objectLight") {
        return [
          {
            subject: {
              tag: "actionSpell" as const,
              actorId,
              invocation: supportedSpellInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: spellInvocationCastSummary(invocation),
            initialHoles: [spellObjectTargetHole(invocation)],
          },
        ];
      }
      if (invocation.procedure === "weaponDamageRider") {
        return [
          {
            subject: {
              tag: "bonusActionSpell" as const,
              actorId,
              invocation: supportedSpellInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: spellInvocationCastSummary(invocation),
            initialHoles: [],
          },
        ];
      }
      if (invocation.procedure === "weaponAttackOverride") {
        return [
          {
            subject: {
              tag: "bonusActionSpell" as const,
              actorId,
              invocation: supportedSpellInvocationRef(invocation),
              mode: { tag: "cast" as const },
              componentWeaponItemId: invocation.attachedWeapon.itemId,
            },
            label: `${invocation.spell.name} (${invocation.attachedWeapon.attack.weapon.name})`,
            summary: spellInvocationCastSummary(invocation),
            initialHoles: [],
          },
        ];
      }
      if (
        invocation.procedure === "afterHitDamage" ||
        invocation.procedure === "afterHitSaveGatedCondition" ||
        invocation.procedure === "afterHitTimedDamageAndSave" ||
        invocation.procedure === "afterHitDamageAndIllumination"
      ) {
        return [];
      }
      if (invocation.procedure === "markedDamageRider") {
        const targetHole = spellTargetHole(state, actorId, invocation);
        const initialHoles =
          invocation.action === "cast" &&
          invocation.abilityCheckBehavior.kind === "chosenAbilityDisadvantage"
            ? [targetHole, spellAbilityChoiceHole(invocation)]
            : [targetHole];
        return targetHole.choices.length === 0
          ? []
          : [
              {
                subject: {
                  tag: "bonusActionSpell" as const,
                  actorId,
                  invocation: supportedSpellInvocationRef(invocation),
                  mode: { tag: "cast" as const },
                },
                label: invocation.spell.name,
                summary: spellInvocationCastSummary(invocation),
                initialHoles,
              },
            ];
      }
      if (invocation.procedure === "expeditiousRetreatDash") {
        return representedMovementSpeedKinds(actor).map((speedKind) => ({
          subject: {
            tag: "bonusActionDashSpell" as const,
            actorId,
            invocation: supportedSpellInvocationRef(invocation),
            mode: { tag: "cast" as const },
            speedKind,
          },
          label: invocation.spell.name,
          summary: spellInvocationCastSummary(invocation),
          initialHoles: [],
        }));
      }
      if (
        invocation.procedure === "jumpMovementReplacement" ||
        invocation.procedure === "sanctuaryTargetingInterdiction"
      ) {
        const targetHole = spellTargetListHole(state, actorId, invocation);
        return targetHole.choices.length === 0
          ? []
          : [
              {
                subject: {
                  tag: "bonusActionSpell" as const,
                  actorId,
                  invocation: supportedSpellInvocationRef(invocation),
                  mode: { tag: "cast" as const },
                },
                label: invocation.spell.name,
                summary: spellInvocationCastSummary(invocation),
                initialHoles: [targetHole],
              },
            ];
      }
      if (invocation.procedure === "directConditionRemoval") {
        const targetHole = spellTargetHole(state, actorId, invocation);
        return targetHole.choices.length === 0
          ? []
          : [
              {
                subject: {
                  tag: "bonusActionSpell" as const,
                  actorId,
                  invocation: supportedSpellInvocationRef(invocation),
                  mode: { tag: "cast" as const },
                },
                label: invocation.spell.name,
                summary: spellInvocationCastSummary(invocation),
                initialHoles: [
                  targetHole,
                  spellConditionChoiceHole(invocation),
                ],
              },
            ];
      }
      if (invocation.procedure === "directCondition") {
        const targetHole = spellTargetListHole(state, actorId, invocation);
        return targetHole.choices.length === 0
          ? []
          : [
              {
                subject: {
                  tag: "actionSpell" as const,
                  actorId,
                  invocation: supportedSpellInvocationRef(invocation),
                  mode: { tag: "cast" as const },
                },
                label: invocation.spell.name,
                summary: spellInvocationCastSummary(invocation),
                initialHoles: [targetHole],
              },
            ];
      }
      if (invocation.procedure === "chainedSpellAttackDamage") {
        const castActs = [
          {
            subject: {
              tag: "actionSpell" as const,
              actorId,
              invocation: supportedSpellInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: spellInvocationCastSummary(invocation),
            initialHoles: [spellDamageTypeChoiceHole(invocation)],
          },
        ];
        return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
      }
      if (invocation.procedure === "spellHostedWeaponAttack") {
        const targetHole = attackTargetHole(
          state,
          actorId,
          invocation.componentWeapon.attack,
        );
        const castActs =
          targetHole.choices.length === 0
            ? []
            : [
                {
                  subject: {
                    tag: "actionSpell" as const,
                    actorId,
                    invocation: supportedSpellInvocationRef(invocation),
                    mode: { tag: "cast" as const },
                    componentWeaponItemId: invocation.componentWeapon.itemId,
                  },
                  label: `${invocation.spell.name} (${invocation.componentWeapon.attack.weapon.name})`,
                  summary: spellInvocationCastSummary(invocation),
                  initialHoles: [
                    spellDamageTypeChoiceHole(invocation),
                    targetHole,
                  ],
                },
              ];
        return castActs;
      }
      if (invocation.procedure === "spellAttackSequence") {
        const initialHoles = Array.from(
          { length: invocation.targeting.attackCount },
          (_, partIndex) => [
            spellAttackSequencePartTargetHole(
              state,
              actorId,
              invocation,
              partIndex,
            ),
            spellAttackSequencePartObjectTargetHole(invocation, partIndex),
          ],
        ).flat();
        return [
          {
            subject: {
              tag: "actionSpell" as const,
              actorId,
              invocation: supportedSpellInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: spellInvocationCastSummary(invocation),
            initialHoles,
          },
        ];
      }
      if (
        invocation.procedure === "scalarBuff" &&
        invocation.targeting.kind === "self"
      ) {
        const castActs = [
          {
            subject: {
              tag: spellSubjectTagForInvocation(invocation),
              actorId,
              invocation: supportedSpellInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: spellInvocationCastSummary(invocation),
            initialHoles: scalarBuffInitialHoles(invocation),
          },
        ];
        return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
      }
      if (invocation.procedure === "scalarBuff") {
        if (!isScalarBuffTargetListInvocation(invocation)) {
          return [];
        }
        const targetHole = targetListSpellUsesTargetListHole(invocation)
          ? spellTargetListHole(state, actorId, invocation)
          : spellTargetHole(state, actorId, invocation);
        const castActs =
          targetHole.choices.length === 0
            ? []
            : [
                {
                  subject: {
                    tag: spellSubjectTagForInvocation(invocation),
                    actorId,
                    invocation: supportedSpellInvocationRef(invocation),
                    mode: { tag: "cast" as const },
                  },
                  label: invocation.spell.name,
                  summary: spellInvocationCastSummary(invocation),
                  initialHoles: [targetHole],
                },
              ];
        return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
      }
      if (
        invocation.procedure ===
        "conditionImmunityAndTurnStartTemporaryHitPoints"
      ) {
        const targetHole = targetListSpellUsesTargetListHole(invocation)
          ? spellTargetListHole(state, actorId, invocation)
          : spellTargetHole(state, actorId, invocation);
        const castActs =
          targetHole.choices.length === 0
            ? []
            : [
                {
                  subject: {
                    tag: "actionSpell" as const,
                    actorId,
                    invocation: supportedSpellInvocationRef(invocation),
                    mode: { tag: "cast" as const },
                  },
                  label: invocation.spell.name,
                  summary: spellInvocationCastSummary(invocation),
                  initialHoles: [targetHole],
                },
              ];
        return castActs;
      }
      if (
        (invocation.procedure === "heldLightHurl" ||
          invocation.procedure === "spellAttackDamage") &&
        invocation.targeting.kind === "singleCreatureOrObject"
      ) {
        const targetHole = spellTargetHole(state, actorId, invocation);
        const initialHoles = [
          ...(invocation.procedure === "spellAttackDamage" &&
          invocation.damage.kind === "sorcerousBurstDamageTypeChoice"
            ? [spellDamageTypeChoiceHole(invocation)]
            : []),
          ...(targetHole.choices.length === 0 ? [] : [targetHole]),
          spellObjectTargetHole(invocation),
        ];
        const castActs = [
          {
            subject: {
              tag: spellSubjectTagForInvocation(invocation),
              actorId,
              invocation: supportedSpellInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: spellInvocationCastSummary(invocation),
            initialHoles,
          },
        ];
        return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
      }
      const targetHole =
        invocation.procedure === "repeatedDamageAllocation"
          ? spellTargetAllocationHole(state, actorId, invocation)
          : invocation.procedure === "directHitPointRestoration" &&
              targetListSpellUsesTargetListHole(invocation)
            ? spellTargetListHole(state, actorId, invocation)
            : spellTargetHole(state, actorId, invocation);
      const castActs =
        targetHole.choices.length === 0
          ? []
          : [
              {
                subject: {
                  tag: spellSubjectTagForInvocation(invocation),
                  actorId,
                  invocation: supportedSpellInvocationRef(invocation),
                  mode: { tag: "cast" as const },
                },
                label: invocation.spell.name,
                summary: spellInvocationCastSummary(invocation),
                initialHoles: [targetHole],
              },
            ];
      return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
    },
  );
  return acts.map((act) =>
    spellCastReactionFactsAct(actorId, invocations, counterspellReactors, act),
  );
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
  if (invocation.procedure === "heldLight") {
    return `Cast ${invocation.spell.name} as a cantrip.`;
  }
  if (
    invocation.procedure === "dancingLightsSeparateCast" ||
    invocation.procedure === "dancingLightsCombinedCast"
  ) {
    return `Cast ${invocation.spell.name} as a cantrip.`;
  }
  if (invocation.procedure === "dancingLightsReposition") {
    return `Move ${invocation.spell.name} with a Bonus Action.`;
  }
  if (invocation.procedure === "objectLight") {
    return invocation.resource.tag === "spellSlot"
      ? `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`
      : `Cast ${invocation.spell.name} as a cantrip.`;
  }
  if (invocation.procedure === "heldLightHurl") {
    return `Take a Magic action to hurl ${invocation.spell.name}.`;
  }
  if (invocation.procedure === "repeatedDamageAllocation") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot, allocating ${invocation.targeting.repeatedEffectCount} repeated effects among targets.`;
  }
  if (invocation.procedure === "directHitPointRestoration") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
  }
  if (invocation.procedure === "scalarBuff") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
  }
  if (invocation.procedure === "rollModifier") {
    return invocation.resource.tag === "spellSlot"
      ? `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`
      : `Cast ${invocation.spell.name} as a cantrip.`;
  }
  if (invocation.procedure === "thaumaturgyBoomingVoice") {
    return `Cast ${invocation.spell.name} as a cantrip, using the Booming Voice effect.`;
  }
  if (invocation.procedure === "creatureTypeProtection") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
  }
  if (invocation.procedure === "blurAttackRollDefense") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
  }
  if (invocation.procedure === "mirrorImageHitInterception") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
  }
  if (invocation.procedure === "conditionRemovalProtection") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
  }
  if (invocation.procedure === "directConditionRemoval") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
  }
  if (invocation.procedure === "damageReduction") {
    return `Cast ${invocation.spell.name} as a cantrip.`;
  }
  if (invocation.procedure === "makeStable") {
    return `Cast ${invocation.spell.name} as a cantrip.`;
  }
  if (invocation.procedure === "spellHostedWeaponAttack") {
    return `Cast ${invocation.spell.name} as a cantrip using ${invocation.componentWeapon.attack.weapon.name}.`;
  }
  if (invocation.procedure === "weaponAttackOverride") {
    return `Cast ${invocation.spell.name} as a cantrip on ${invocation.attachedWeapon.attack.weapon.name}.`;
  }
  if (
    invocation.procedure === "conditionImmunityAndTurnStartTemporaryHitPoints"
  ) {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
  }
  if (invocation.procedure === "weaponDamageRider") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
  }
  if (invocation.procedure === "afterHitDamage") {
    return invocation.resource.tag === "classFeatureFreeCast"
      ? `Cast ${invocation.spell.name} using a class feature free cast after a qualifying hit.`
      : `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot after a qualifying hit.`;
  }
  if (invocation.procedure === "afterHitSaveGatedCondition") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot after a qualifying hit.`;
  }
  if (invocation.procedure === "afterHitTimedDamageAndSave") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot after a qualifying hit.`;
  }
  if (invocation.procedure === "afterHitDamageAndIllumination") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot after a qualifying hit.`;
  }
  if (invocation.procedure === "markedDamageRider") {
    if (invocation.action === "transfer") {
      return `Move ${invocation.spell.name} to a new target.`;
    }
    return invocation.resource.tag === "classFeatureFreeCast"
      ? `Cast ${invocation.spell.name} using Favored Enemy.`
      : `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
  }
  if (invocation.procedure === "expeditiousRetreatDash") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot, immediately Dash, and keep Dash available as a Bonus Action while Concentration lasts.`;
  }
  if (invocation.procedure === "jumpMovementReplacement") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
  }
  if (invocation.procedure === "sanctuaryTargetingInterdiction") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
  }
  if (invocation.procedure === "directCondition") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
  }
  if (invocation.procedure === "selfTeleport") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot and teleport to a caller-supplied unoccupied visible destination within ${invocation.maxDistanceFeet} feet.`;
  }
  if (invocation.procedure === "featherFallMitigation") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
  }
  if (invocation.procedure === "persistentArmorEffect") {
    return invocation.resource.tag === "none"
      ? `Cast ${invocation.spell.name} using Armor of Shadows.`
      : `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
  }
  if (invocation.procedure === "shieldReaction") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
  }
  if (invocation.procedure === "counterspell") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
  }
  if (invocation.procedure === "spellAttackDamage") {
    return spellActivationInvocationCastSummary(invocation);
  }
  if (invocation.procedure === "spellAttackSequence") {
    const partName = spellAttackSequencePartName();
    const resource =
      invocation.resource.tag === "spellSlot"
        ? `using a level ${invocation.resource.slotLevel} Spell Slot`
        : "as a cantrip";
    return `Cast ${invocation.spell.name} ${resource}, resolving ${invocation.targeting.attackCount} ${partName}${invocation.targeting.attackCount === 1 ? "" : "s"}.`;
  }
  if (invocation.procedure === "chainedSpellAttackDamage") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
  }
  return spellActivationInvocationCastSummary(invocation);
}

export function spellActivationInvocationCastSummary(
  invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "attackBurstSaveDamage"
        | "spellAttackDamage"
        | "rollModifier"
        | "wardingBond"
        | "thaumaturgyBoomingVoice"
        | "creatureTypeProtection"
        | "blurAttackRollDefense"
        | "mirrorImageHitInterception"
        | "saveGatedDamage"
        | "saveGatedCondition"
        | "saveGatedAttackRollAdvantage"
        | "sleepTargetAdmission"
        | "hideousLaughter"
        | "command"
        | "greaseGroundHazard"
        | "fogCloudObscurement"
        | "flamingSphere"
        | "moonbeam"
        | "dancingLightsSeparateCast"
        | "dancingLightsCombinedCast"
        | "jumpMovementReplacement"
        | "selfTeleport"
        | "sanctuaryTargetingInterdiction"
        | "directCondition"
        | "directConditionRemoval"
        | "featherFallMitigation";
    }
  >,
): string {
  return invocation.resource.tag === "spellSlot"
    ? `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`
    : `Cast ${invocation.spell.name} as a cantrip.`;
}

export function spellSubjectTagForInvocation(
  invocation: SupportedSpellInvocation,
): "actionSpell" | "bonusActionSpell" {
  if (invocation.procedure === "heldLight") {
    return "bonusActionSpell";
  }
  if (invocation.procedure === "dancingLightsReposition") {
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

export function spellInvocationIsSpellcasting(
  invocation: SupportedSpellInvocation,
): boolean {
  return !(
    invocation.procedure === "dancingLightsReposition" ||
    (invocation.procedure === "markedDamageRider" &&
      invocation.action === "transfer")
  );
}

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
  return (
    invocation.procedure !== "directHitPointRestoration" &&
    invocation.procedure !== "heldLight" &&
    invocation.procedure !== "dancingLightsSeparateCast" &&
    invocation.procedure !== "dancingLightsCombinedCast" &&
    invocation.procedure !== "dancingLightsReposition" &&
    invocation.procedure !== "objectLight" &&
    invocation.procedure !== "heldLightHurl" &&
    invocation.procedure !== "spellHostedWeaponAttack" &&
    invocation.procedure !== "weaponAttackOverride" &&
    invocation.procedure !== "damageReduction" &&
    invocation.procedure !== "makeStable" &&
    invocation.procedure !== "persistentArmorEffect" &&
    invocation.procedure !== "rollModifier" &&
    invocation.procedure !== "wardingBond" &&
    invocation.procedure !== "creatureTypeProtection" &&
    invocation.procedure !== "blurAttackRollDefense" &&
    invocation.procedure !== "mirrorImageHitInterception" &&
    invocation.procedure !== "conditionRemovalProtection" &&
    invocation.procedure !== "directConditionRemoval" &&
    invocation.procedure !== "scalarBuff" &&
    invocation.procedure !== "weaponDamageRider" &&
    invocation.procedure !== "afterHitDamage" &&
    invocation.procedure !== "afterHitSaveGatedCondition" &&
    invocation.procedure !== "afterHitTimedDamageAndSave" &&
    invocation.procedure !== "afterHitDamageAndIllumination" &&
    invocation.procedure !== "markedDamageRider" &&
    invocation.procedure !== "expeditiousRetreatDash" &&
    invocation.procedure !== "jumpMovementReplacement" &&
    invocation.procedure !== "selfTeleport" &&
    invocation.procedure !== "sanctuaryTargetingInterdiction" &&
    invocation.procedure !== "directCondition" &&
    invocation.procedure !== "saveGatedCondition" &&
    invocation.procedure !== "saveGatedAttackRollAdvantage" &&
    invocation.procedure !== "sleepTargetAdmission" &&
    invocation.procedure !== "hideousLaughter" &&
    invocation.procedure !== "command" &&
    invocation.procedure !== "greaseGroundHazard" &&
    invocation.procedure !== "fogCloudObscurement" &&
    invocation.procedure !== "flamingSphere" &&
    invocation.procedure !== "spellAttackSequence" &&
    invocation.procedure !== "shieldReaction"
  );
}

export function readiedSpellAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: SupportedSpellInvocation,
): readonly AvailableBattleAct[] {
  if (
    invocation.procedure === "persistentArmorEffect" ||
    invocation.procedure === "directHitPointRestoration" ||
    invocation.procedure === "damageReduction" ||
    invocation.procedure === "makeStable" ||
    invocation.procedure === "spellHostedWeaponAttack" ||
    invocation.procedure === "scalarBuff" ||
    invocation.procedure === "weaponDamageRider" ||
    invocation.procedure === "weaponAttackOverride" ||
    invocation.procedure === "markedDamageRider" ||
    invocation.procedure === "expeditiousRetreatDash" ||
    invocation.procedure === "jumpMovementReplacement" ||
    invocation.procedure === "selfTeleport" ||
    invocation.procedure === "sanctuaryTargetingInterdiction" ||
    invocation.procedure === "directCondition" ||
    invocation.procedure === "afterHitDamage" ||
    invocation.procedure === "spellAttackSequence" ||
    invocation.procedure === "afterHitSaveGatedCondition" ||
    invocation.procedure === "afterHitTimedDamageAndSave" ||
    invocation.procedure === "afterHitDamageAndIllumination" ||
    invocation.procedure === "heldLight" ||
    invocation.procedure === "heldLightHurl" ||
    invocation.procedure === "rollModifier" ||
    invocation.procedure === "creatureTypeProtection" ||
    invocation.procedure === "blurAttackRollDefense" ||
    invocation.procedure === "mirrorImageHitInterception" ||
    invocation.procedure === "conditionRemovalProtection" ||
    invocation.procedure === "directConditionRemoval" ||
    invocation.procedure === "attackBurstSaveDamage" ||
    invocation.procedure === "saveGatedCondition" ||
    invocation.procedure === "saveGatedAttackRollAdvantage" ||
    invocation.procedure === "sleepTargetAdmission" ||
    invocation.procedure === "hideousLaughter" ||
    invocation.procedure === "command" ||
    invocation.procedure === "greaseGroundHazard" ||
    invocation.procedure === "fogCloudObscurement" ||
    invocation.procedure === "flamingSphere" ||
    invocation.procedure === "shieldReaction" ||
    (invocation.procedure === "spellAttackDamage" &&
      invocation.damage.kind === "sorcerousBurstDamageTypeChoice") ||
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
    summary: `Ready ${invocation.spell.name} for ${reactionTriggerLabel(trigger)}; holding the spell requires Concentration until the start of your next turn.`,
    initialHoles: [],
  }));
}

function targetListSpellUsesTargetListHole(
  invocation: TargetListSpellInvocation,
): boolean {
  if (!targetListTargetingHasFixedMaximum(invocation.targeting)) {
    return true;
  }
  return invocation.targeting.maxTargets > 1;
}

// activeOngoingFeaturesPreventSpellcasting also belongs to cluster K but
// remains in `../battle-reducer.ts` until the dispatcher merge resolves
// cycle #25 (turn ↔ spells_discovery).
