// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-created-held-object
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-object-contact-damage
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spiritual-weapon-attack-proxy
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-governor-quickened
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR
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

// KERNEL-COVERAGE: runtime-owner BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES BATTLE.COMMAND.OPTION_AND_NEXT_TURN
import type { SpellRecord } from "@dnd/surface/surface/types";
import type { CombatantId } from "../identity.ts";
import type { CharacterBattleMetamagicOptionFact } from "../character-battle-resources.ts";
import { BATTLE_READIED_SPELL_TRIGGERS } from "../battle-reaction-triggers.ts";
import {
  activeOngoingFeaturesPreventSpellcasting,
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
  spellInvocationIsSpellcasting,
  spellActTurnResourceAvailable,
  spellHasAvailableSpend,
} from "./spell-turn-resources.ts";
import { supportedSpellActs } from "./spells-profiles.ts";
import { spellAttackSequencePartName } from "./spells-profile-shared.ts";
import {
  carefulSpellProtectedTargetsHole,
  commandOptionChoiceHole,
  heightenedSpellTargetChoiceHole,
  spellDamageTypeChoiceHole,
  spellAttackSequencePartObjectTargetHole,
  spellAttackSequencePartTargetHole,
  spellObjectTargetHole,
  spellAreaChoiceHole,
  spellSavingThrowAbility,
  spellSavingThrowTargeting,
  spellSavingThrowOutcomeHole,
  spellTargetAllocationHole,
  spellTargetHole,
  spellTargetListHole,
  supportedSpellInvocationMatchesRef,
  supportedSpellInvocationRef,
} from "./spells-holes-fills.ts";
import {
  spellDancingLightsPlacementHole,
  spellObjectContactTargetsHole,
  spiritualWeaponForcePositionHole,
  targetListTargetingHasFixedMaximum,
} from "./spells-targeting.ts";
import { spellCreatedHeldObjectHasFreeHand } from "./spell-created-held-object.ts";
import { damageReductionProfile } from "./spell-procedure-profiles/damage-reduction.ts";
import { blurAttackRollDefenseProfile } from "./spell-procedure-profiles/blur-attack-roll-defense.ts";
import { conditionImmunityAndTurnStartTemporaryHitPointsProfile } from "./spell-procedure-profiles/condition-immunity-turn-start-temporary-hit-points.ts";
import { conditionRemovalProtectionProfile } from "./spell-procedure-profiles/condition-removal-protection.ts";
import { creatureSizeChangeProfile } from "./spell-procedure-profiles/creature-size-change.ts";
import { creatureTypeProtectionProfile } from "./spell-procedure-profiles/creature-type-protection.ts";
import { directConditionProfile } from "./spell-procedure-profiles/direct-condition.ts";
import { directConditionRemovalProfile } from "./spell-procedure-profiles/direct-condition-removal.ts";
import { directHitPointRestorationProfile } from "./spell-procedure-profiles/direct-hit-point-restoration.ts";
import { dragonsBreathInitialProfile } from "./spell-procedure-profiles/dragons-breath-initial.ts";
import { expeditiousRetreatDashProfile } from "./spell-procedure-profiles/expeditious-retreat-dash.ts";
import { featherFallMitigationProfile } from "./spell-procedure-profiles/feather-fall-mitigation.ts";
import { heldLightProfile } from "./spell-procedure-profiles/held-light.ts";
import { jumpMovementReplacementProfile } from "./spell-procedure-profiles/jump-movement-replacement.ts";
import { levitatedCreatureProfile } from "./spell-procedure-profiles/levitated-creature.ts";
import { makeStableProfile } from "./spell-procedure-profiles/make-stable.ts";
import { magicWeaponEnhancementProfile } from "./spell-procedure-profiles/magic-weapon-enhancement.ts";
import { markedDamageRiderProfile } from "./spell-procedure-profiles/marked-damage-rider.ts";
import { objectLightProfile } from "./spell-procedure-profiles/object-light.ts";
import { persistentArmorEffectProfile } from "./spell-procedure-profiles/persistent-armor-effect.ts";
import { rollModifierProfile } from "./spell-procedure-profiles/roll-modifier.ts";
import { sanctuaryTargetingInterdictionProfile } from "./spell-procedure-profiles/sanctuary-targeting-interdiction.ts";
import { saveGatedConditionImmunityProfile } from "./spell-procedure-profiles/save-gated-condition-immunity.ts";
import { saveGatedConditionProfile } from "./spell-procedure-profiles/save-gated-condition.ts";
import { saveGatedDamageProfile } from "./spell-procedure-profiles/save-gated-damage.ts";
import { scalarBuffProfile } from "./spell-procedure-profiles/scalar-buff.ts";
import { seeInvisibleObserverSightProfile } from "./spell-procedure-profiles/see-invisible-observer-sight.ts";
import { selfTransformationModeProfile } from "./spell-procedure-profiles/self-transformation-mode.ts";
import { selfTeleportProfile } from "./spell-procedure-profiles/self-teleport.ts";
import { spellHostedWeaponAttackProfile } from "./spell-procedure-profiles/spell-hosted-weapon-attack.ts";
import { thaumaturgyBoomingVoiceProfile } from "./spell-procedure-profiles/thaumaturgy-booming-voice.ts";
import { wardingBondProfile } from "./spell-procedure-profiles/warding-bond.ts";
import { weaponAttackOverrideProfile } from "./spell-procedure-profiles/weapon-attack-override.ts";
import { weaponDamageRiderProfile } from "./spell-procedure-profiles/weapon-damage-rider.ts";
import { dancingLightsFromEffect } from "./spells-active-effects.ts";
import { spellCastReactionFactsHole } from "./spell-cast-reaction-frame.ts";
import {
  counterspellCapableReactors,
  spellCastCanTriggerCounterspell,
  type CounterspellCapableReactor,
} from "./counterspell-reaction-discovery.ts";
import { ongoingSpellTargetChoiceHole } from "./spells-ongoing-spell-ending.ts";
import {
  actorCanOfferQuickenedSpellMetamagic,
  CAREFUL_METAMAGIC_EFFECT_KIND,
  discoverSpellMetamagicSelections,
  HEIGHTENED_METAMAGIC_EFFECT_KIND,
  QUICKENED_SPELL_METAMAGIC_SELECTION,
  spellInvocationSupportsQuickenedActionRewrite,
  spellMetamagicApplications,
  spellMetamagicLabel,
} from "./metamagic.ts";

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
      if (invocation.procedure === "command") {
        const targetHole = spellTargetListHole(state, actorId, invocation);
        if (targetHole.choices.length === 0) {
          return [];
        }
        const baseCastAct = {
          subject: {
            tag: "actionSpell" as const,
            actorId,
            invocation: supportedSpellInvocationRef(invocation),
            mode: { tag: "cast" as const },
          },
          label: invocation.spell.name,
          summary: `${spellActivationInvocationCastSummary(invocation)} Failed targets follow the selected command on their next turns.`,
          initialHoles: [targetHole, commandOptionChoiceHole(invocation)],
        };
        const metamagicCastActs = discoverSpellMetamagicSelections({
          actor,
          invocation,
        }).map((metamagic) => ({
          ...baseCastAct,
          subject: {
            ...baseCastAct.subject,
            metamagic,
          },
          initialHoles: [
            targetHole,
            ...saveMetamagicInitialHoles(
              state,
              actorId,
              invocation,
              spellMetamagicApplications(actor, metamagic),
            ),
            commandOptionChoiceHole(invocation),
          ],
          label: `${invocation.spell.name} (${spellMetamagicLabel(metamagic)})`,
          summary: `${baseCastAct.summary} Cast with ${spellMetamagicLabel(metamagic)}.`,
        }));
        return [baseCastAct, ...metamagicCastActs];
      }
      if (invocation.procedure === "selfTransformationMode") {
        return selfTransformationModeProfile.discoverCastAct(
          state,
          actorId,
          invocation,
        );
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
      if (invocation.procedure === "magicalDarknessPointOrigin") {
        return [
          {
            subject: {
              tag: "actionSpell" as const,
              actorId,
              invocation: supportedSpellInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: `${spellActivationInvocationCastSummary(invocation)} The table supplies the magical Darkness area identity.`,
            initialHoles: [spellAreaChoiceHole(invocation)],
          },
        ];
      }
      if (invocation.procedure === "antimagicFieldOngoingSpellSuppression") {
        return [
          {
            subject: {
              tag: "actionSpell" as const,
              actorId,
              invocation: supportedSpellInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: `${spellActivationInvocationCastSummary(invocation)} The table supplies the antimagic Emanation area identity and affected ongoing spell effects.`,
            initialHoles: [spellAreaChoiceHole(invocation)],
          },
        ];
      }
      if (invocation.procedure === "webRestraintHazard") {
        return [
          {
            subject: {
              tag: "actionSpell" as const,
              actorId,
              invocation: supportedSpellInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: `${spellActivationInvocationCastSummary(invocation)} The table supplies the Web cube area identity.`,
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
      if (invocation.procedure === "spiritualWeaponAttackProxy") {
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
                summary: `${spellActivationInvocationCastSummary(invocation)} The table supplies the spectral force position and target adjacency.`,
                initialHoles: [
                  spiritualWeaponForcePositionHole(invocation),
                  targetHole,
                ],
              },
            ];
      }
      if (invocation.procedure === "spikeGrowthMovementHazard") {
        return [
          {
            subject: {
              tag: "actionSpell" as const,
              actorId,
              invocation: supportedSpellInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: `${spellActivationInvocationCastSummary(invocation)} The table supplies the Spike Growth area identity.`,
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
      if (invocation.procedure === "objectContactDamage") {
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
      if (invocation.procedure === "objectContactDamageRepeat") {
        return [
          {
            subject: {
              tag: "bonusActionSpell" as const,
              actorId,
              invocation: supportedSpellInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: `${invocation.spell.name} damage`,
            summary: spellInvocationCastSummary(invocation),
            initialHoles: [
              spellObjectContactTargetsHole({
                state,
                sourceCombatantId: invocation.activeEffect.sourceCombatantId,
                objectId: invocation.activeEffect.objectId,
                invocation,
                requiresObjectWithinRange: true,
              }),
            ],
          },
        ];
      }
      if (invocation.procedure === "spiritualWeaponRepeatAttack") {
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
                label: `${invocation.spell.name} attack`,
                summary: spellInvocationCastSummary(invocation),
                initialHoles: [
                  spiritualWeaponForcePositionHole(invocation),
                  targetHole,
                ],
              },
            ];
      }
      if (invocation.procedure === "selfTeleport") {
        return selfTeleportProfile.discoverCastAct(state, actorId, invocation);
      }
      if (invocation.procedure === "saveGatedDamage") {
        return saveGatedDamageProfile.discoverCastAct(
          state,
          actorId,
          invocation,
        );
      }
      if (invocation.procedure === "saveGatedCondition") {
        return saveGatedConditionProfile.discoverCastAct(
          state,
          actorId,
          invocation,
        );
      }
      if (invocation.procedure === "saveGatedConditionImmunity") {
        return saveGatedConditionImmunityProfile.discoverCastAct(
          state,
          actorId,
          invocation,
        );
      }
      if (
        invocation.procedure === "saveGatedAttackRollAdvantage" ||
        invocation.procedure === "abilityD20TestRollModeSaveGate" ||
        invocation.procedure === "sleepTargetAdmission" ||
        invocation.procedure === "hideousLaughter" ||
        invocation.procedure === "greaseGroundHazard" ||
        invocation.procedure === "gustOfWindLine"
      ) {
        if (
          invocation.targeting.kind === "singleCombatant" ||
          ((invocation.procedure === "hideousLaughter" ||
            invocation.procedure === "abilityD20TestRollModeSaveGate") &&
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
          const baseCastAct = {
            subject: {
              tag: "actionSpell" as const,
              actorId,
              invocation: supportedSpellInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: `${spellActivationInvocationCastSummary(invocation)} Table-supplied affected targets make ${spellSavingThrowAbility(invocation).toUpperCase()} Saving Throws.`,
            initialHoles: [targetHole],
          };
          const metamagicCastActs = discoverSpellMetamagicSelections({
            actor,
            invocation,
          }).map((metamagic) => ({
            ...baseCastAct,
            subject: {
              ...baseCastAct.subject,
              metamagic,
            },
            initialHoles: [
              targetHole,
              ...saveMetamagicInitialHoles(
                state,
                actorId,
                invocation,
                spellMetamagicApplications(actor, metamagic),
              ),
            ],
            label: `${invocation.spell.name} (${spellMetamagicLabel(metamagic)})`,
            summary: `${baseCastAct.summary} Cast with ${spellMetamagicLabel(metamagic)}.`,
          }));
          const castActs = [baseCastAct, ...metamagicCastActs];
          return invocation.procedure === "greaseGroundHazard" ||
            invocation.procedure === "gustOfWindLine"
            ? castActs
            : [...castActs, ...readiedSpellAct(state, actorId, invocation)];
        }
        const initialHole = spellSavingThrowOutcomeHole(
          state,
          actorId,
          invocation,
        );
        const baseCastAct = {
          subject: {
            tag: "actionSpell" as const,
            actorId,
            invocation: supportedSpellInvocationRef(invocation),
            mode: { tag: "cast" as const },
          },
          label: invocation.spell.name,
          summary: `${spellActivationInvocationCastSummary(invocation)} Table-supplied affected targets make ${spellSavingThrowAbility(invocation).toUpperCase()} Saving Throws.`,
          initialHoles: [initialHole],
        };
        const metamagicCastActs = discoverSpellMetamagicSelections({
          actor,
          invocation,
        }).map((metamagic) => ({
          ...baseCastAct,
          subject: {
            ...baseCastAct.subject,
            metamagic,
          },
          initialHoles: (() => {
            const metamagicApplications = spellMetamagicApplications(
              actor,
              metamagic,
            );
            const metamagicSelectionHoles = saveMetamagicInitialHoles(
              state,
              actorId,
              invocation,
              metamagicApplications,
            );
            return metamagicSelectionHoles.length === 0
              ? [spellSavingThrowOutcomeHole(state, actorId, invocation)]
              : metamagicSelectionHoles;
          })(),
          label: `${invocation.spell.name} (${spellMetamagicLabel(metamagic)})`,
          summary: `${baseCastAct.summary} Cast with ${spellMetamagicLabel(metamagic)}.`,
        }));
        const castActs = [baseCastAct, ...metamagicCastActs];
        return invocation.procedure === "greaseGroundHazard" ||
          invocation.procedure === "gustOfWindLine"
          ? castActs
          : [...castActs, ...readiedSpellAct(state, actorId, invocation)];
      }
      if (invocation.procedure === "rollModifier") {
        return rollModifierProfile.discoverCastAct(state, actorId, invocation);
      }
      if (
        invocation.procedure === "creatureSizeIncrease" ||
        invocation.procedure === "creatureSizeDecrease"
      ) {
        return creatureSizeChangeProfile.discoverCastAct(
          state,
          actorId,
          invocation,
        );
      }
      if (invocation.procedure === "levitatedCreature") {
        return levitatedCreatureProfile.discoverCastAct(
          state,
          actorId,
          invocation,
        );
      }
      if (invocation.procedure === "thaumaturgyBoomingVoice") {
        return thaumaturgyBoomingVoiceProfile.discoverCastAct(
          state,
          actorId,
          invocation,
        );
      }
      if (invocation.procedure === "wardingBond") {
        return wardingBondProfile.discoverCastAct(state, actorId, invocation);
      }
      if (invocation.procedure === "creatureTypeProtection") {
        return creatureTypeProtectionProfile.discoverCastAct(
          state,
          actorId,
          invocation,
        );
      }
      if (invocation.procedure === "blurAttackRollDefense") {
        return blurAttackRollDefenseProfile.discoverCastAct(
          state,
          actorId,
          invocation,
        );
      }
      if (invocation.procedure === "seeInvisibleObserverSight") {
        return seeInvisibleObserverSightProfile.discoverCastAct(
          state,
          actorId,
          invocation,
        );
      }
      if (invocation.procedure === "persistentArmorEffect") {
        return persistentArmorEffectProfile.discoverCastAct(
          state,
          actorId,
          invocation,
        );
      }
      if (invocation.procedure === "conditionRemovalProtection") {
        return conditionRemovalProtectionProfile.discoverCastAct(
          state,
          actorId,
          invocation,
        );
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
        return damageReductionProfile.discoverCastAct(
          state,
          actorId,
          invocation,
        );
      }
      if (invocation.procedure === "makeStable") {
        return makeStableProfile.discoverCastAct(state, actorId, invocation);
      }
      if (invocation.procedure === "heldLight") {
        return heldLightProfile.discoverCastAct(state, actorId, invocation);
      }
      if (invocation.procedure === "spellCreatedHeldObject") {
        if (!spellCreatedHeldObjectHasFreeHand(state, actorId)) {
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
            label: invocation.spell.name,
            summary: spellInvocationCastSummary(invocation),
            initialHoles: [],
          },
        ];
      }
      if (invocation.procedure === "spellCreatedHeldObjectReEvoke") {
        if (!spellCreatedHeldObjectHasFreeHand(state, actorId)) {
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
            label: `${invocation.spell.name} re-evoke`,
            summary: spellInvocationCastSummary(invocation),
            initialHoles: [],
          },
        ];
      }
      if (invocation.procedure === "spellCreatedHeldObjectAttack") {
        const targetHole = spellTargetHole(state, actorId, invocation);
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
                label: `${invocation.spell.name} attack`,
                summary: spellInvocationCastSummary(invocation),
                initialHoles: [targetHole],
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
        return objectLightProfile.discoverCastAct(state, actorId, invocation);
      }
      if (invocation.procedure === "ongoingSpellEnd") {
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
              ongoingSpellTargetChoiceHole(state, actorId, invocation),
            ],
          },
        ];
      }
      if (invocation.procedure === "weaponDamageRider") {
        return weaponDamageRiderProfile.discoverCastAct(
          state,
          actorId,
          invocation,
        );
      }
      if (invocation.procedure === "magicWeaponEnhancement") {
        return magicWeaponEnhancementProfile.discoverCastAct(
          state,
          actorId,
          invocation,
        );
      }
      if (invocation.procedure === "weaponAttackOverride") {
        return weaponAttackOverrideProfile.discoverCastAct(
          state,
          actorId,
          invocation,
        );
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
        return markedDamageRiderProfile.discoverCastAct(
          state,
          actorId,
          invocation,
        );
      }
      if (invocation.procedure === "expeditiousRetreatDash") {
        return expeditiousRetreatDashProfile.discoverCastAct(
          state,
          actorId,
          invocation,
        );
      }
      if (invocation.procedure === "jumpMovementReplacement") {
        return jumpMovementReplacementProfile.discoverCastAct(
          state,
          actorId,
          invocation,
        );
      }
      if (invocation.procedure === "dragonsBreathInitial") {
        return dragonsBreathInitialProfile.discoverCastAct(
          state,
          actorId,
          invocation,
        );
      }
      if (invocation.procedure === "sanctuaryTargetingInterdiction") {
        return sanctuaryTargetingInterdictionProfile.discoverCastAct(
          state,
          actorId,
          invocation,
        );
      }
      if (invocation.procedure === "directConditionRemoval") {
        return directConditionRemovalProfile.discoverCastAct(
          state,
          actorId,
          invocation,
        );
      }
      if (invocation.procedure === "directCondition") {
        return directConditionProfile.discoverCastAct(
          state,
          actorId,
          invocation,
        );
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
        return spellHostedWeaponAttackProfile.discoverCastAct(
          state,
          actorId,
          invocation,
        );
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
      if (invocation.procedure === "scalarBuff") {
        return scalarBuffProfile.discoverCastAct(state, actorId, invocation);
      }
      if (invocation.procedure === "directHitPointRestoration") {
        return directHitPointRestorationProfile.discoverCastAct(
          state,
          actorId,
          invocation,
        );
      }
      if (
        invocation.procedure ===
        "conditionImmunityAndTurnStartTemporaryHitPoints"
      ) {
        return conditionImmunityAndTurnStartTemporaryHitPointsProfile.discoverCastAct(
          state,
          actorId,
          invocation,
        );
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
          : spellTargetHole(state, actorId, invocation);
      const turnResourceAvailableForActionCast =
        naturalTurnResourceAvailable || quickenedTurnResourceAvailable;
      const castActs =
        targetHole.choices.length === 0 || !turnResourceAvailableForActionCast
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

type SaveMetamagicSupportedInvocation = Extract<
  SupportedSpellInvocation,
  {
    readonly procedure:
      | "saveGatedDamage"
      | "saveGatedCondition"
      | "saveGatedConditionImmunity"
      | "saveGatedAttackRollAdvantage"
      | "hideousLaughter"
      | "command"
      | "greaseGroundHazard"
      | "gustOfWindLine";
  }
>;

function saveMetamagicInitialHoles(
  state: BattleState,
  actorId: CombatantId,
  invocation: SupportedSpellInvocation,
  metamagicApplications: readonly CharacterBattleMetamagicOptionFact[],
): readonly BattleHole[] {
  const saveInvocation = saveMetamagicInvocationOrNull(invocation);
  if (saveInvocation === null) {
    return [];
  }
  const targeting = spellSavingThrowTargeting(saveInvocation);
  const holes: BattleHole[] = [];
  if (
    targeting.kind !== "singleCombatant" &&
    metamagicApplications.some(
      (application) => application.effectKind === CAREFUL_METAMAGIC_EFFECT_KIND,
    )
  ) {
    holes.push(
      carefulSpellProtectedTargetsHole(state, actorId, saveInvocation),
    );
  }
  if (
    targeting.kind !== "singleCombatant" &&
    metamagicApplications.some(
      (application) =>
        application.effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
    )
  ) {
    holes.push(heightenedSpellTargetChoiceHole(state, actorId, saveInvocation));
  }
  return holes;
}

function saveMetamagicInvocationOrNull(
  invocation: SupportedSpellInvocation,
): SaveMetamagicSupportedInvocation | null {
  return invocation.procedure === "saveGatedDamage" ||
    invocation.procedure === "saveGatedCondition" ||
    invocation.procedure === "saveGatedConditionImmunity" ||
    invocation.procedure === "saveGatedAttackRollAdvantage" ||
    invocation.procedure === "hideousLaughter" ||
    invocation.procedure === "command" ||
    invocation.procedure === "greaseGroundHazard" ||
    invocation.procedure === "gustOfWindLine"
    ? invocation
    : null;
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
    return heldLightProfile.castSummary(invocation);
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
    return objectLightProfile.castSummary(invocation);
  }
  if (invocation.procedure === "ongoingSpellEnd") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
  }
  if (invocation.procedure === "heldLightHurl") {
    return `Take a Magic action to hurl ${invocation.spell.name}.`;
  }
  if (invocation.procedure === "spellCreatedHeldObject") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
  }
  if (invocation.procedure === "spellCreatedHeldObjectAttack") {
    return `Take a Magic action to attack with ${invocation.spell.name}.`;
  }
  if (invocation.procedure === "spellCreatedHeldObjectReEvoke") {
    return `Re-evoke ${invocation.spell.name} with a Bonus Action.`;
  }
  if (invocation.procedure === "objectContactDamage") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
  }
  if (invocation.procedure === "objectContactDamageRepeat") {
    return `Use a Bonus Action to repeat ${invocation.spell.name} contact damage.`;
  }
  if (invocation.procedure === "spiritualWeaponRepeatAttack") {
    return `Use a Bonus Action to move ${invocation.spell.name}'s force and repeat the attack.`;
  }
  if (invocation.procedure === "repeatedDamageAllocation") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot, allocating ${invocation.targeting.repeatedEffectCount} repeated effects among targets.`;
  }
  if (invocation.procedure === "directHitPointRestoration") {
    return directHitPointRestorationProfile.castSummary(invocation);
  }
  if (invocation.procedure === "scalarBuff") {
    return scalarBuffProfile.castSummary(invocation);
  }
  if (invocation.procedure === "selfTransformationMode") {
    return selfTransformationModeProfile.castSummary(invocation);
  }
  if (invocation.procedure === "rollModifier") {
    return rollModifierProfile.castSummary(invocation);
  }
  if (
    invocation.procedure === "creatureSizeIncrease" ||
    invocation.procedure === "creatureSizeDecrease"
  ) {
    return creatureSizeChangeProfile.castSummary(invocation);
  }
  if (invocation.procedure === "levitatedCreature") {
    return levitatedCreatureProfile.castSummary(invocation);
  }
  if (invocation.procedure === "thaumaturgyBoomingVoice") {
    return thaumaturgyBoomingVoiceProfile.castSummary(invocation);
  }
  if (invocation.procedure === "creatureTypeProtection") {
    return creatureTypeProtectionProfile.castSummary(invocation);
  }
  if (invocation.procedure === "blurAttackRollDefense") {
    return blurAttackRollDefenseProfile.castSummary(invocation);
  }
  if (invocation.procedure === "seeInvisibleObserverSight") {
    return seeInvisibleObserverSightProfile.castSummary(invocation);
  }
  if (invocation.procedure === "mirrorImageHitInterception") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
  }
  if (invocation.procedure === "conditionRemovalProtection") {
    return conditionRemovalProtectionProfile.castSummary(invocation);
  }
  if (invocation.procedure === "directConditionRemoval") {
    return directConditionRemovalProfile.castSummary(invocation);
  }
  if (invocation.procedure === "damageReduction") {
    return damageReductionProfile.castSummary(invocation);
  }
  if (invocation.procedure === "makeStable") {
    return makeStableProfile.castSummary(invocation);
  }
  if (invocation.procedure === "spellHostedWeaponAttack") {
    return spellHostedWeaponAttackProfile.castSummary(invocation);
  }
  if (invocation.procedure === "weaponAttackOverride") {
    return weaponAttackOverrideProfile.castSummary(invocation);
  }
  if (
    invocation.procedure === "conditionImmunityAndTurnStartTemporaryHitPoints"
  ) {
    return conditionImmunityAndTurnStartTemporaryHitPointsProfile.castSummary(
      invocation,
    );
  }
  if (invocation.procedure === "weaponDamageRider") {
    return weaponDamageRiderProfile.castSummary(invocation);
  }
  if (invocation.procedure === "magicWeaponEnhancement") {
    return magicWeaponEnhancementProfile.castSummary(invocation);
  }
  if (invocation.procedure === "wardingBond") {
    return wardingBondProfile.castSummary(invocation);
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
    return markedDamageRiderProfile.castSummary(invocation);
  }
  if (invocation.procedure === "expeditiousRetreatDash") {
    return expeditiousRetreatDashProfile.castSummary(invocation);
  }
  if (invocation.procedure === "jumpMovementReplacement") {
    return jumpMovementReplacementProfile.castSummary(invocation);
  }
  if (invocation.procedure === "dragonsBreathInitial") {
    return dragonsBreathInitialProfile.castSummary(invocation);
  }
  if (invocation.procedure === "sanctuaryTargetingInterdiction") {
    return sanctuaryTargetingInterdictionProfile.castSummary(invocation);
  }
  if (invocation.procedure === "directCondition") {
    return directConditionProfile.castSummary(invocation);
  }
  if (invocation.procedure === "selfTeleport") {
    return selfTeleportProfile.castSummary(invocation);
  }
  if (invocation.procedure === "featherFallMitigation") {
    return featherFallMitigationProfile.castSummary(invocation);
  }
  if (invocation.procedure === "persistentArmorEffect") {
    return persistentArmorEffectProfile.castSummary(invocation);
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
  if (invocation.procedure === "saveGatedDamage") {
    return saveGatedDamageProfile.castSummary(invocation);
  }
  if (invocation.procedure === "saveGatedCondition") {
    return saveGatedConditionProfile.castSummary(invocation);
  }
  if (invocation.procedure === "saveGatedConditionImmunity") {
    return saveGatedConditionImmunityProfile.castSummary(invocation);
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
        | "creatureSizeIncrease"
        | "creatureSizeDecrease"
        | "levitatedCreature"
        | "blurAttackRollDefense"
        | "seeInvisibleObserverSight"
        | "mirrorImageHitInterception"
        | "saveGatedDamage"
        | "saveGatedCondition"
        | "saveGatedConditionImmunity"
        | "saveGatedAttackRollAdvantage"
        | "abilityD20TestRollModeSaveGate"
        | "sleepTargetAdmission"
        | "hideousLaughter"
        | "command"
        | "greaseGroundHazard"
        | "webRestraintHazard"
        | "gustOfWindLine"
        | "fogCloudObscurement"
        | "magicalDarknessPointOrigin"
        | "antimagicFieldOngoingSpellSuppression"
        | "flamingSphere"
        | "spiritualWeaponAttackProxy"
        | "spikeGrowthMovementHazard"
        | "moonbeam"
        | "objectContactDamage"
        | "dancingLightsSeparateCast"
        | "dancingLightsCombinedCast"
        | "selfTransformationMode"
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
  return (
    invocation.procedure !== "directHitPointRestoration" &&
    invocation.procedure !== "heldLight" &&
    invocation.procedure !== "spellCreatedHeldObject" &&
    invocation.procedure !== "spellCreatedHeldObjectAttack" &&
    invocation.procedure !== "spellCreatedHeldObjectReEvoke" &&
    invocation.procedure !== "objectContactDamage" &&
    invocation.procedure !== "objectContactDamageRepeat" &&
    invocation.procedure !== "spiritualWeaponAttackProxy" &&
    invocation.procedure !== "spiritualWeaponRepeatAttack" &&
    invocation.procedure !== "dancingLightsSeparateCast" &&
    invocation.procedure !== "dancingLightsCombinedCast" &&
    invocation.procedure !== "dancingLightsReposition" &&
    invocation.procedure !== "objectLight" &&
    invocation.procedure !== "ongoingSpellEnd" &&
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
    invocation.procedure !== "seeInvisibleObserverSight" &&
    invocation.procedure !== "mirrorImageHitInterception" &&
    invocation.procedure !== "conditionRemovalProtection" &&
    invocation.procedure !== "directConditionRemoval" &&
    invocation.procedure !== "scalarBuff" &&
    invocation.procedure !== "selfTransformationMode" &&
    invocation.procedure !== "weaponDamageRider" &&
    invocation.procedure !== "magicWeaponEnhancement" &&
    invocation.procedure !== "afterHitDamage" &&
    invocation.procedure !== "afterHitSaveGatedCondition" &&
    invocation.procedure !== "afterHitTimedDamageAndSave" &&
    invocation.procedure !== "afterHitDamageAndIllumination" &&
    invocation.procedure !== "markedDamageRider" &&
    invocation.procedure !== "expeditiousRetreatDash" &&
    invocation.procedure !== "jumpMovementReplacement" &&
    invocation.procedure !== "dragonsBreathInitial" &&
    invocation.procedure !== "selfTeleport" &&
    invocation.procedure !== "sanctuaryTargetingInterdiction" &&
    invocation.procedure !== "directCondition" &&
    invocation.procedure !== "saveGatedCondition" &&
    invocation.procedure !== "saveGatedConditionImmunity" &&
    invocation.procedure !== "saveGatedAttackRollAdvantage" &&
    invocation.procedure !== "sleepTargetAdmission" &&
    invocation.procedure !== "hideousLaughter" &&
    invocation.procedure !== "command" &&
    invocation.procedure !== "greaseGroundHazard" &&
    invocation.procedure !== "webRestraintHazard" &&
    invocation.procedure !== "gustOfWindLine" &&
    invocation.procedure !== "fogCloudObscurement" &&
    invocation.procedure !== "magicalDarknessPointOrigin" &&
    invocation.procedure !== "antimagicFieldOngoingSpellSuppression" &&
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
    invocation.procedure === "spellCreatedHeldObject" ||
    invocation.procedure === "spellCreatedHeldObjectAttack" ||
    invocation.procedure === "spellCreatedHeldObjectReEvoke" ||
    invocation.procedure === "objectContactDamage" ||
    invocation.procedure === "objectContactDamageRepeat" ||
    invocation.procedure === "spiritualWeaponAttackProxy" ||
    invocation.procedure === "spiritualWeaponRepeatAttack" ||
    invocation.procedure === "damageReduction" ||
    invocation.procedure === "makeStable" ||
    invocation.procedure === "spellHostedWeaponAttack" ||
    invocation.procedure === "scalarBuff" ||
    invocation.procedure === "selfTransformationMode" ||
    invocation.procedure === "weaponDamageRider" ||
    invocation.procedure === "magicWeaponEnhancement" ||
    invocation.procedure === "weaponAttackOverride" ||
    invocation.procedure === "markedDamageRider" ||
    invocation.procedure === "expeditiousRetreatDash" ||
    invocation.procedure === "jumpMovementReplacement" ||
    invocation.procedure === "dragonsBreathInitial" ||
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
    invocation.procedure === "ongoingSpellEnd" ||
    invocation.procedure === "rollModifier" ||
    invocation.procedure === "creatureTypeProtection" ||
    invocation.procedure === "blurAttackRollDefense" ||
    invocation.procedure === "seeInvisibleObserverSight" ||
    invocation.procedure === "mirrorImageHitInterception" ||
    invocation.procedure === "conditionRemovalProtection" ||
    invocation.procedure === "directConditionRemoval" ||
    invocation.procedure === "attackBurstSaveDamage" ||
    invocation.procedure === "saveGatedCondition" ||
    invocation.procedure === "saveGatedConditionImmunity" ||
    invocation.procedure === "saveGatedAttackRollAdvantage" ||
    invocation.procedure === "sleepTargetAdmission" ||
    invocation.procedure === "hideousLaughter" ||
    invocation.procedure === "command" ||
    invocation.procedure === "greaseGroundHazard" ||
    invocation.procedure === "webRestraintHazard" ||
    invocation.procedure === "gustOfWindLine" ||
    invocation.procedure === "fogCloudObscurement" ||
    invocation.procedure === "magicalDarknessPointOrigin" ||
    invocation.procedure === "antimagicFieldOngoingSpellSuppression" ||
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

export function targetListSpellUsesTargetListHole(
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
