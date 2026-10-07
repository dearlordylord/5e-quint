import { Match } from "effect";
import type { SupportedSpellInvocation } from "./battle-state-execution.ts";
import type { SpellProcedureExecution } from "./procedure-execution/spell-procedure-execution.ts";
import type {
  AuthoredSpellInvocationCastingFacts,
  SpellInvocationCastingFacts,
} from "./procedure-execution/spell-invocation-casting-facts.ts";
import type { SpellDefinitionRuleFacts } from "./procedure-execution/spell-rule-facts.ts";
import {
  isCantripSpellAccess,
  isLeveledSpellAccess,
} from "./procedure-execution/spell-invocation-vocabulary.ts";
export function spellProcedureExecution<
  Invocation extends SupportedSpellInvocation,
>(invocation: Invocation): SpellProcedureExecution<Invocation>;
export function spellProcedureExecution(
  invocation: SupportedSpellInvocation,
): SpellProcedureExecution {
  const execution = Match.value(invocation).pipe(
    Match.discriminatorsExhaustive("procedure")({
      abilityD20TestRollModeSaveGate: (value) => ({
        ability: value.ability,
        actionCost: value.actionCost,
        dc: value.dc,
        failedSaveDamagePenaltyEffect: value.failedSaveDamagePenaltyEffect,
        failedSaveEffect: value.failedSaveEffect,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        successEffect: value.successEffect,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      afterHitDamage: (value) => ({
        actionCost: value.actionCost,
        conditionalBonusDamage: value.conditionalBonusDamage,
        damage: value.damage,
        procedure: value.procedure,
        ...projectCastingFacts(value),
      }),
      afterHitDamageAndIllumination: (value) => ({
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        damage: value.damage,
        illumination: value.illumination,
        procedure: value.procedure,
        ...projectCastingFacts(value),
      }),
      afterHitSaveGatedCondition: (value) => ({
        ability: value.ability,
        actionCost: value.actionCost,
        dc: value.dc,
        effect: value.effect,
        procedure: value.procedure,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      afterHitTimedDamageAndSave: (value) => ({
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        immediateDamage: value.immediateDamage,
        procedure: value.procedure,
        ...projectCastingFacts(value),
      }),
      magicSuppressionEmanation: (value) => ({
        durationTicks: value.durationTicks,
        exceptSources: value.exceptSources,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      attackBurstSaveDamage: (value) => ({
        attackBonus: value.attackBonus,
        attackKind: value.attackKind,
        burst: value.burst,
        damage: value.damage,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      perceptionGatedAttackRollDefense: (value) => ({
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        ...projectCastingFacts(value),
      }),
      chainedSpellAttackDamage: (value) => ({
        attackBonus: value.attackBonus,
        attackKind: value.attackKind,
        damage: value.damage,
        damageTypeChoices: value.damageTypeChoices,
        leapRangeFeet: value.leapRangeFeet,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      chosenDamageResistance: (value) => ({
        actionCost: value.actionCost,
        damageTypeChoices: value.damageTypeChoices,
        expiresAt: value.expiresAt,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      compelledNextTurnBehavior: (value) => ({
        ability: value.ability,
        actionCost: value.actionCost,
        dc: value.dc,
        procedure: value.procedure,
        targeting: value.targeting,
        visibility: value.visibility,
        ...projectCastingFacts(value),
      }),
      conditionImmunityAndTurnStartTemporaryHitPoints: (value) => ({
        actionCost: value.actionCost,
        activeEffects: value.activeEffects,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      conditionRemovalProtection: (value) => ({
        actionCost: value.actionCost,
        procedure: value.procedure,
        protection: value.protection,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      spellCastInterruptionReaction: (value) => ({
        ability: value.ability,
        dc: value.dc,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        triggerComponents: value.triggerComponents,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      creatureSizeDecrease: (value) => ({
        ability: value.ability,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        dc: value.dc,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      creatureSizeIncrease: (value) => ({
        ability: value.ability,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        dc: value.dc,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      creatureTypeProtection: (value) => ({
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      damageReduction: (value) => ({
        actionCost: value.actionCost,
        amount: value.amount,
        damageTypeChoices: value.damageTypeChoices,
        expiresAt: value.expiresAt,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      movableLightManifestation: (value) =>
        Match.value(value).pipe(
          Match.when(
            { operation: "create", form: "combinedMediumForm" },
            (created) => ({
              actionCost: created.actionCost,
              dimRadiusFeet: created.dimRadiusFeet,
              expiresAt: created.expiresAt,
              form: created.form,
              maxMoveFeet: created.maxMoveFeet,
              operation: created.operation,
              procedure: created.procedure,
              rangeFeet: created.rangeFeet,

              spacingFeet: created.spacingFeet,
              ...projectCastingFacts(created),
            }),
          ),
          Match.when(
            { operation: "create", form: "separateLights" },
            (created) => ({
              actionCost: created.actionCost,
              dimRadiusFeet: created.dimRadiusFeet,
              expiresAt: created.expiresAt,
              form: created.form,
              maxMoveFeet: created.maxMoveFeet,
              operation: created.operation,
              procedure: created.procedure,
              rangeFeet: created.rangeFeet,

              spacingFeet: created.spacingFeet,
              ...projectCastingFacts(created),
            }),
          ),
          Match.when({ operation: "reposition" }, (reposition) => ({
            actionCost: reposition.actionCost,
            activeEffectRef: reposition.activeEffectRef,
            maxMoveFeet: reposition.maxMoveFeet,
            operation: reposition.operation,
            procedure: reposition.procedure,
            rangeFeet: reposition.rangeFeet,

            sourceManifestationProcedureRef:
              reposition.sourceManifestationProcedureRef,
            spacingFeet: reposition.spacingFeet,
            ...projectCastingFacts(reposition),
          })),
          Match.exhaustive,
        ),
      directCondition: (value) => ({
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      directConditionRemoval: (value) => ({
        actionCost: value.actionCost,
        conditionChoices: value.conditionChoices,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      directHitPointRestoration: (value) => ({
        actionCost: value.actionCost,
        healing: value.healing,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      grantedAreaSaveDamageAction: (value) => ({
        actionCost: value.actionCost,
        ability: value.ability,
        activeEffect: value.activeEffect,
        coneLengthFeet: value.coneLengthFeet,
        dc: value.dc,
        damageDice: value.damageDice,
        damageDieSize: value.damageDieSize,
        damageTypeChoices: value.damageTypeChoices,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      grantedAlternateActionCost: (value) => ({
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        ...projectCastingFacts(value),
      }),
      fallingCreatureMitigationReaction: (value) => ({
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      persistentAreaSaveDamage: (value) =>
        Match.value(value).pipe(
          Match.when({ lifecycle: { kind: "stationary" } }, (stationary) => ({
            ability: stationary.ability,

            damage: stationary.damage,
            dc: stationary.dc,
            durationTicks: stationary.durationTicks,
            lifecycle: stationary.lifecycle,
            procedure: stationary.procedure,
            rangeFeet: stationary.rangeFeet,

            targeting: stationary.targeting,
            ...projectCastingFacts(stationary),
          })),
          Match.when(
            { lifecycle: { kind: "sourceTurnTranslation" } },
            (translation) => ({
              ability: translation.ability,

              damage: translation.damage,
              dc: translation.dc,
              durationTicks: translation.durationTicks,
              lifecycle: translation.lifecycle,
              procedure: translation.procedure,
              rangeFeet: translation.rangeFeet,

              targeting: translation.targeting,
              ...projectCastingFacts(translation),
            }),
          ),
          Match.when(
            {
              lifecycle: {
                kind: "casterActionReposition",
                collisionDisposition: "stopAndAffectAdjacent",
              },
            },
            (collision) => ({
              ability: collision.ability,

              damage: collision.damage,
              dc: collision.dc,
              durationTicks: collision.durationTicks,
              lifecycle: collision.lifecycle,
              procedure: collision.procedure,
              ramMaxMoveFeet: collision.ramMaxMoveFeet,
              rangeFeet: collision.rangeFeet,

              targeting: collision.targeting,
              ...projectCastingFacts(collision),
            }),
          ),
          Match.when(
            {
              lifecycle: {
                kind: "casterActionReposition",
                collisionDisposition: "ignoreObstacles",
              },
            },
            (directed) => ({
              ability: directed.ability,

              damage: directed.damage,
              dc: directed.dc,
              durationTicks: directed.durationTicks,
              lifecycle: directed.lifecycle,
              procedure: directed.procedure,
              rangeFeet: directed.rangeFeet,
              repositionMaxMoveFeet: directed.repositionMaxMoveFeet,

              targeting: directed.targeting,
              ...projectCastingFacts(directed),
            }),
          ),
          Match.exhaustive,
        ),
      persistentAreaTrait: (value) => ({
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      persistentAreaSaveCondition: (value) => ({
        ability: value.ability,
        dc: value.dc,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      directionalPersistentArea: (value) => ({
        ability: value.ability,
        dc: value.dc,
        durationTicks: value.durationTicks,
        movementCost: value.movementCost,
        procedure: value.procedure,
        pushDistanceFeet: value.pushDistanceFeet,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      compositeTargetBuffWithAftermath: (value) => ({
        actionCost: value.actionCost,
        activeEffects: value.activeEffects,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      heldLight: (value) => ({
        actionCost: value.actionCost,
        expiresAt: value.expiresAt,
        hurl: value.hurl,
        light: value.light,
        procedure: value.procedure,
        ...projectCastingFacts(value),
      }),
      /* v8 ignore start -- @preserve -- Held-light hurl is synthesized from an admitted active effect; it is never an authored character spell invocation at this projection boundary. */
      heldLightHurl: (value) => ({
        attackBonus: value.attackBonus,
        attackKind: value.attackKind,
        damage: value.damage,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        sourceEffectRef: value.sourceEffectRef,
        sourceHeldLightProcedureRef: value.sourceHeldLightProcedureRef,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      saveGatedConditionWithRepeat: (value) => ({
        ability: value.ability,
        actionCost: value.actionCost,
        dc: value.dc,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      /* v8 ignore stop -- @preserve */
      saveGatedAreaControl: (value) => ({
        ability: value.ability,
        actionCost: value.actionCost,
        dc: value.dc,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      fixedCostMovementReplacement: (value) => ({
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      controlledVerticalSuspension: (value) => ({
        ability: value.ability,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        dc: value.dc,
        maxAltitudeChangeFeet: value.maxAltitudeChangeFeet,
        maxInitialRiseFeet: value.maxInitialRiseFeet,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      magicalDarknessPointOrigin: (value) => ({
        dispelledSpellCreatedLightMaxSpellLevel:
          value.dispelledSpellCreatedLightMaxSpellLevel,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      weaponAttackDamageEnhancement: (value) => ({
        actionCost: value.actionCost,
        bonus: value.bonus,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        ...projectCastingFacts(value),
      }),
      makeStable: (value) => ({
        actionCost: value.actionCost,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        ...projectCastingFacts(value),
      }),
      markedDamageRider: (value) =>
        Match.value(value).pipe(
          Match.when({ action: "cast" }, (cast) => {
            return {
              abilityCheckBehavior: cast.abilityCheckBehavior,
              action: cast.action,
              actionCost: cast.actionCost,
              damage: cast.damage,
              expiresAt: cast.expiresAt,
              procedure: cast.procedure,
              rangeFeet: cast.rangeFeet,
              retargetTiming: cast.retargetTiming,
              targeting: cast.targeting,
              ...projectCastingFacts(cast),
            };
          }),
          Match.when({ action: "transfer" }, (transfer) => ({
            action: transfer.action,
            activeEffectRef: transfer.activeEffect.effectRef,
            activeEffectSourceProcedureRef:
              transfer.activeEffect.sourceProcedureRef,
            procedure: transfer.procedure,
          })),
          Match.exhaustive,
        ),
      duplicateHitInterception: (value) => ({
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        ...projectCastingFacts(value),
      }),
      objectContactDamage: (value) => ({
        actionCost: value.actionCost,
        damage: value.damage,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      objectContactDamageRepeat: (value) => ({
        activeEffectRef: value.activeEffect.effectRef,
        activeEffectSourceProcedureRef: value.activeEffect.sourceProcedureRef,
        procedure: value.procedure,
      }),
      objectLight: (value) =>
        Match.value(value).pipe(
          Match.when({ access: isCantripSpellAccess }, (value) => ({
            actionCost: value.actionCost,
            expiresAt: value.expiresAt,
            light: value.light,
            procedure: value.procedure,
            targeting: value.targeting,
            ...projectCastingFacts(value),
          })),
          Match.when({ access: isLeveledSpellAccess }, (value) => ({
            actionCost: value.actionCost,
            expiresAt: value.expiresAt,
            light: value.light,
            procedure: value.procedure,
            targeting: value.targeting,
            ...projectCastingFacts(value),
          })),
          Match.exhaustive,
        ),
      ongoingSpellEnd: (value) => ({
        actionCost: value.actionCost,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        abilityCheckDcBase: value.abilityCheckDcBase,
        ...projectCastingFacts(value),
      }),
      persistentArmorEffect: (value) =>
        Match.value(value).pipe(
          Match.when({ access: isLeveledSpellAccess }, (value) => ({
            activeEffect: value.activeEffect,
            procedure: value.procedure,
            rangeFeet: value.rangeFeet,
            ...projectCastingFacts(value),
          })),
          Match.when({ access: { tag: "armorOfShadows" } }, (value) => ({
            activeEffect: value.activeEffect,
            procedure: value.procedure,
            rangeFeet: value.rangeFeet,
            ...projectCastingFacts(value),
          })),
          Match.exhaustive,
        ),
      repeatedDamageAllocation: (value) => ({
        damage: value.damage,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      rollModifier: (value) =>
        "abilityChoiceApplication" in value
          ? {
              abilityChoiceApplication: value.abilityChoiceApplication,
              abilityChoices: value.abilityChoices,
              actionCost: value.actionCost,
              effect: value.effect,
              procedure: value.procedure,
              rangeFeet: value.rangeFeet,
              saveGate: value.saveGate,
              targeting: value.targeting,
              ...projectCastingFacts(value),
            }
          : {
              abilityChoices: value.abilityChoices,
              actionCost: value.actionCost,
              effect: value.effect,
              procedure: value.procedure,
              rangeFeet: value.rangeFeet,
              saveGate: value.saveGate,
              targeting: value.targeting,
              ...projectCastingFacts(value),
            },
      targetingSaveInterdiction: (value) => ({
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      saveGatedAttackRollAdvantage: (value) => ({
        ability: value.ability,
        dc: value.dc,
        effect: value.effect,
        illumination: value.illumination,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      saveGatedCondition: (value) => ({
        ability: value.ability,
        dc: value.dc,
        effect: value.effect,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        saveRollModeRule: value.saveRollModeRule,
        targetCreatureTypes: value.targetCreatureTypes,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      saveGatedConditionImmunity: (value) => ({
        ability: value.ability,
        actionCost: value.actionCost,
        activeEffects: value.activeEffects,
        dc: value.dc,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targetCreatureTypes: value.targetCreatureTypes,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      saveGatedDamage: (value) =>
        Match.value(value).pipe(
          Match.when({ access: isCantripSpellAccess }, (value) => ({
            ability: value.ability,
            additionalDamageComponents: value.additionalDamageComponents,
            castingTime: value.castingTime,
            damage: value.damage,
            dc: value.dc,
            failedSaveAbilityChoices: value.failedSaveAbilityChoices,
            failedSaveConditionEffects: value.failedSaveConditionEffects,
            failedSavePostDamageRiders: value.failedSavePostDamageRiders,
            postSaveAreaEffect: value.postSaveAreaEffect,
            procedure: value.procedure,
            rangeFeet: value.rangeFeet,
            saveRollModeRule: value.saveRollModeRule,
            successDamage: value.successDamage,
            targeting: value.targeting,
            ...projectCastingFacts(value),
          })),
          Match.when({ access: isLeveledSpellAccess }, (value) => ({
            ability: value.ability,
            additionalDamageComponents: value.additionalDamageComponents,
            castingTime: value.castingTime,
            damage: value.damage,
            dc: value.dc,
            failedSaveAbilityChoices: value.failedSaveAbilityChoices,
            failedSaveConditionEffects: value.failedSaveConditionEffects,
            failedSavePostDamageRiders: value.failedSavePostDamageRiders,
            postSaveAreaEffect: value.postSaveAreaEffect,
            procedure: value.procedure,
            rangeFeet: value.rangeFeet,
            saveRollModeRule: value.saveRollModeRule,
            successDamage: value.successDamage,
            targeting: value.targeting,
            ...projectCastingFacts(value),
          })),
          Match.exhaustive,
        ),
      scalarBuff: (value) => ({
        actionCost: value.actionCost,
        effect: value.effect,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      seeInvisibleObserverSight: (value) => ({
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        ...projectCastingFacts(value),
      }),
      selfTeleport: (value) => ({
        actionCost: value.actionCost,
        maxDistanceFeet: value.maxDistanceFeet,
        procedure: value.procedure,
        ...projectCastingFacts(value),
      }),
      selfTransformationMode: (value) => ({
        actionCost: value.actionCost,
        expiresAt: value.expiresAt,
        modeChoices: value.modeChoices,
        naturalWeaponFacts: value.naturalWeaponFacts,
        procedure: value.procedure,
        ...projectCastingFacts(value),
      }),
      triggeredArmorDefense: (value) => ({
        armorClassBonus: value.armorClassBonus,
        negatesRepeatedDamageAllocation: value.negatesRepeatedDamageAllocation,
        procedure: value.procedure,
        ...projectCastingFacts(value),
      }),
      saveGatedTurnConstraintBundle: (value) => ({
        ability: value.ability,
        actionCost: value.actionCost,
        constraints: value.constraints,
        dc: value.dc,
        durationTicks: value.durationTicks,
        maxTargets: value.maxTargets,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      persistentAreaSaveComposite: (value) => ({
        ability: value.ability,
        dc: value.dc,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      stagedSaveCondition: (value) => ({
        ability: value.ability,
        automaticSuccessPredicates: value.automaticSuccessPredicates,
        dc: value.dc,
        durationTicks: value.durationTicks,
        escapeAction: value.escapeAction,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      spellAttackDamage: (value) =>
        Match.value(value).pipe(
          Match.when({ access: isCantripSpellAccess }, (value) => ({
            attackBonus: value.attackBonus,
            attackKind: value.attackKind,
            damage: value.damage,
            laterDamage: value.laterDamage,
            missDamage: value.missDamage,
            objectHitEffect: value.objectHitEffect,
            postDamageRiders: value.postDamageRiders,
            procedure: value.procedure,
            rangeFeet: value.rangeFeet,
            targeting: value.targeting,
            ...projectCastingFacts(value),
          })),
          Match.when({ access: isLeveledSpellAccess }, (value) => ({
            attackBonus: value.attackBonus,
            attackKind: value.attackKind,
            damage: value.damage,
            laterDamage: value.laterDamage,
            missDamage: value.missDamage,
            objectHitEffect: value.objectHitEffect,
            postDamageRiders: value.postDamageRiders,
            procedure: value.procedure,
            rangeFeet: value.rangeFeet,
            targeting: value.targeting,
            ...projectCastingFacts(value),
          })),
          Match.exhaustive,
        ),
      spellAttackSequence: (value) =>
        Match.value(value).pipe(
          Match.when({ access: isCantripSpellAccess }, (value) => ({
            attackBonus: value.attackBonus,
            attackKind: value.attackKind,
            damage: value.damage,
            procedure: value.procedure,
            rangeFeet: value.rangeFeet,
            targeting: value.targeting,
            ...projectCastingFacts(value),
          })),
          Match.when({ access: isLeveledSpellAccess }, (value) => ({
            attackBonus: value.attackBonus,
            attackKind: value.attackKind,
            damage: value.damage,
            procedure: value.procedure,
            rangeFeet: value.rangeFeet,
            targeting: value.targeting,
            ...projectCastingFacts(value),
          })),
          Match.exhaustive,
        ),
      spellCreatedHeldObject: (value) => ({
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        ...projectCastingFacts(value),
      }),
      /* v8 ignore start -- @preserve -- The held-object attack is synthesized from an admitted active effect; it is never an authored character spell invocation at this projection boundary. */
      spellCreatedHeldObjectAttack: (value) => ({
        sourceEffectRef: value.sourceEffectRef,
        sourceHeldObjectProcedureRef: value.sourceHeldObjectProcedureRef,
        attackBonus: value.attackBonus,
        attackKind: value.attackKind,
        damage: value.damage,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Held-object re-evocation is synthesized from an admitted active effect; it is never an authored character spell invocation at this projection boundary. */
      spellCreatedHeldObjectReEvoke: (value) => ({
        actionCost: value.actionCost,
        sourceEffectRef: value.sourceEffectRef,
        sourceHeldObjectProcedureRef: value.sourceHeldObjectProcedureRef,
        procedure: value.procedure,
        ...projectCastingFacts(value),
      }),
      /* v8 ignore stop -- @preserve */
      spellHostedWeaponAttack: (value) => ({
        actionCost: value.actionCost,
        attackBonus: value.attackBonus,
        bonusDamage: value.bonusDamage,
        componentWeaponObjectId: value.componentWeapon.objectId,
        damageTypeChoices: value.damageTypeChoices,
        procedure: value.procedure,
        spellcastingAbilityModifier: value.spellcastingAbilityModifier,
        ...projectCastingFacts(value),
      }),
      areaMovementDistanceDamage: (value) => ({
        damage: value.damage,
        damagePerFeet: value.damagePerFeet,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
      spatialMeleeSpellAttackProxy: (value) =>
        Match.value(value).pipe(
          Match.when({ operation: "createAndAttack" }, (created) => {
            return {
              actionCost: created.actionCost,
              attackBonus: created.attackBonus,
              attackKind: created.attackKind,
              damage: created.damage,
              durationTicks: created.durationTicks,
              forceReachFeet: created.forceReachFeet,
              operation: created.operation,
              procedure: created.procedure,
              rangeFeet: created.rangeFeet,
              repeatMoveMaxFeet: created.repeatMoveMaxFeet,

              targeting: created.targeting,
              ...projectCastingFacts(created),
            };
          }),
          Match.when({ operation: "repositionAndAttack" }, (repeat) => ({
            activeEffectRef: repeat.activeEffect.effectRef,
            activeEffectSourceProcedureRef:
              repeat.activeEffect.sourceProcedureRef,
            operation: repeat.operation,
            procedure: repeat.procedure,
            repeatTargeting: repeat.repeatTargeting,
          })),
          Match.exhaustive,
        ),
      spawnedCompanionLifecycle: (value) => ({
        casting: value.casting,
        control: value.control,
        formEligibility: value.formEligibility,
        initialPlacement: value.initialPlacement,
        lifecycle: value.lifecycle,
        procedure: value.procedure,
        sharedSensesActionCost: value.sharedSensesActionCost,
        telepathyRangeFeet: value.telepathyRangeFeet,
        touchSpellProxy: value.touchSpellProxy,
      }),
      temporaryAbilityCheckRollMode: (value) => ({
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        selectedMode: value.selectedMode,
        concurrentDurationModeLimit: value.concurrentDurationModeLimit,
        ...projectCastingFacts(value),
      }),
      linkedDefenseResistanceDamageShare: (value) => ({
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        connectionRangeFeet: value.connectionRangeFeet,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        ...projectCastingFacts(value),
      }),
      weaponAttackOverride: (value) => ({
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        attachedWeaponSlot: value.attachedWeaponSlot,
        procedure: value.procedure,
        ...projectCastingFacts(value),
      }),
      weaponDamageRider: (value) => ({
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        ...projectCastingFacts(value),
      }),
      persistentAreaSaveConditionEscape: (value) => ({
        ability: value.ability,
        dc: value.dc,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        targeting: value.targeting,
        ...projectCastingFacts(value),
      }),
    }),
  );
  return execution;
}

type AuthoredCastingInput = AuthoredSpellInvocationCastingFacts<{
  readonly spellDefinitionRuleFacts: SpellDefinitionRuleFacts;
}>;
type ProjectedCastingFacts<Input extends AuthoredCastingInput> =
  Input extends AuthoredCastingInput
    ? {
        readonly spellRuleFacts: Input["spell"]["spellDefinitionRuleFacts"] & {
          readonly castingSource: Input["spell"]["castingSource"];
        };
        readonly access: Input["access"];
        readonly resource: Input["resource"];
      } & (Input extends {
        readonly access: {
          readonly tag: "statBlockCantrip" | "statBlockLeveled";
        };
      }
        ? { readonly actionCost: "magicAction" | "bonusAction" }
        : {})
    : never;
function projectCastingFacts<Input extends AuthoredCastingInput>(
  value: Input,
): ProjectedCastingFacts<Input>;
function projectCastingFacts(
  value: AuthoredCastingInput,
): SpellInvocationCastingFacts {
  return Match.value(value).pipe(
    Match.when({ access: { tag: "classCantrip" } }, (selected) => ({
      access: selected.access,
      resource: selected.resource,
      spellRuleFacts: {
        ...selected.spell.spellDefinitionRuleFacts,
        castingSource: selected.spell.castingSource,
      },
    })),
    Match.when({ access: { tag: "spellAccessCantrip" } }, (selected) => ({
      access: selected.access,
      resource: selected.resource,
      spellRuleFacts: {
        ...selected.spell.spellDefinitionRuleFacts,
        castingSource: selected.spell.castingSource,
      },
    })),
    Match.when(
      { access: { tag: "prepared" }, resource: { tag: "spellSlot" } },
      (selected) => ({
        access: selected.access,
        resource: selected.resource,
        spellRuleFacts: {
          ...selected.spell.spellDefinitionRuleFacts,
          castingSource: selected.spell.castingSource,
        },
      }),
    ),
    Match.when(
      { access: { tag: "prepared" }, resource: { tag: "spellAccessFreeCast" } },
      (selected) => ({
        access: selected.access,
        resource: selected.resource,
        spellRuleFacts: {
          ...selected.spell.spellDefinitionRuleFacts,
          castingSource: selected.spell.castingSource,
        },
      }),
    ),
    Match.when({ access: { tag: "armorOfShadows" } }, (selected) => ({
      access: selected.access,
      resource: selected.resource,
      spellRuleFacts: {
        ...selected.spell.spellDefinitionRuleFacts,
        castingSource: selected.spell.castingSource,
      },
    })),
    Match.when({ access: { tag: "statBlockCantrip" } }, (selected) => ({
      actionCost: selected.spell.castingSource.actionCost,
      access: selected.access,
      resource: selected.resource,
      spellRuleFacts: {
        ...selected.spell.spellDefinitionRuleFacts,
        castingSource: selected.spell.castingSource,
      },
    })),
    Match.when({ access: { tag: "statBlockLeveled" } }, (selected) => ({
      actionCost: selected.spell.castingSource.actionCost,
      access: selected.access,
      resource: selected.resource,
      spellRuleFacts: {
        ...selected.spell.spellDefinitionRuleFacts,
        castingSource: selected.spell.castingSource,
      },
    })),
    Match.when({ access: { tag: "spellEffect" } }, (selected) => ({
      access: selected.access,
      resource: selected.resource,
      spellRuleFacts: {
        ...selected.spell.spellDefinitionRuleFacts,
        castingSource: selected.spell.castingSource,
      },
    })),
    Match.exhaustive,
  );
}
