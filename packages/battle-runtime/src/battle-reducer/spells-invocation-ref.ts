// Spell invocation reference projections extracted from spells-holes-fills.ts.

import { Match } from "effect";
import { spellId } from "../identity.ts";
import {
  type SpellInvocationRef,
  armorOfShadowsSpellInvocationRef,
  classFeatureFreeCastSpellInvocationRef,
  spellEffectInvocationRef,
} from "../battle-subjects.ts";
import {
  isPreparedDamageSpellSource,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";

export function supportedSpellInvocationRef(
  invocation: SupportedSpellInvocation,
): SpellInvocationRef {
  if (invocation.procedure === "afterHitDamage") {
    if (invocation.resource.tag === "classFeatureFreeCast") {
      return classFeatureFreeCastSpellInvocationRef(
        invocation.spell.id,
        invocation.resource.resourceUnitId,
        "afterHitDamage",
      );
    }
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "afterHitDamage",
    };
  }
  if (invocation.procedure === "afterHitSaveGatedCondition") {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "afterHitSaveGatedCondition",
    };
  }
  if (invocation.procedure === "afterHitTimedDamageAndSave") {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "afterHitTimedDamageAndSave",
    };
  }
  if (invocation.procedure === "afterHitDamageAndIllumination") {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "afterHitDamageAndIllumination",
    };
  }
  if (invocation.procedure === "spellHostedWeaponAttack") {
    return {
      tag: "cantrip",
      spellId: spellId(invocation.spell.id),
      procedure: "spellHostedWeaponAttack",
    };
  }
  if (invocation.procedure === "weaponAttackOverride") {
    return {
      tag: "cantrip",
      spellId: spellId(invocation.spell.id),
      procedure: "weaponAttackOverride",
    };
  }
  if (invocation.procedure === "sleepTargetAdmission") {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "sleepTargetAdmission",
    };
  }
  if (invocation.procedure === "hideousLaughter") {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "hideousLaughter",
    };
  }
  if (invocation.procedure === "greaseGroundHazard") {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "greaseGroundHazard",
    };
  }
  if (invocation.procedure === "fogCloudObscurement") {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "fogCloudObscurement",
    };
  }
  if (invocation.procedure === "command") {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "command",
    };
  }
  if (invocation.procedure === "spellAttackSequence") {
    if (invocation.resource.tag === "spellSlot") {
      return {
        tag: "spellSlot",
        spellId: spellId(invocation.spell.id),
        slotLevel: invocation.resource.slotLevel,
        procedure: "spellAttackSequence",
      };
    }
    return {
      tag: "cantrip",
      spellId: spellId(invocation.spell.id),
      procedure: "spellAttackSequence",
    };
  }
  if (invocation.procedure === "expeditiousRetreatDash") {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "expeditiousRetreatDash",
    };
  }
  if (invocation.procedure === "jumpMovementReplacement") {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "jumpMovementReplacement",
    };
  }
  if (invocation.procedure === "selfTeleport") {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "selfTeleport",
    };
  }
  if (invocation.procedure === "featherFallMitigation") {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "featherFallMitigation",
    };
  }
  if (invocation.procedure === "counterspell") {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "counterspell",
    };
  }
  if (invocation.procedure === "sanctuaryTargetingInterdiction") {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "sanctuaryTargetingInterdiction",
    };
  }
  if (invocation.procedure === "objectLight") {
    if (invocation.resource.tag === "spellSlot") {
      return {
        tag: "spellSlot",
        spellId: spellId(invocation.spell.id),
        slotLevel: invocation.resource.slotLevel,
        procedure: "objectLight",
      };
    }
    return {
      tag: "cantrip",
      spellId: spellId(invocation.spell.id),
      procedure: "objectLight",
    };
  }
  if (invocation.procedure === "dancingLightsSeparateCast") {
    return {
      tag: "cantrip",
      spellId: spellId(invocation.spell.id),
      procedure: "dancingLightsSeparateCast",
    };
  }
  if (invocation.procedure === "dancingLightsCombinedCast") {
    return {
      tag: "cantrip",
      spellId: spellId(invocation.spell.id),
      procedure: "dancingLightsCombinedCast",
    };
  }
  if (invocation.procedure === "dancingLightsReposition") {
    return {
      tag: "cantrip",
      spellId: spellId(invocation.spell.id),
      procedure: "dancingLightsReposition",
    };
  }
  if (invocation.procedure === "makeStable") {
    return {
      tag: "cantrip",
      spellId: spellId(invocation.spell.id),
      procedure: "makeStable",
    };
  }
  if (invocation.procedure === "thaumaturgyBoomingVoice") {
    return {
      tag: "cantrip",
      spellId: spellId(invocation.spell.id),
      procedure: "thaumaturgyBoomingVoice",
    };
  }
  if (invocation.procedure === "blurAttackRollDefense") {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "blurAttackRollDefense",
    };
  }
  return Match.value(invocation).pipe(
    Match.when({ procedure: "heldLight" }, (cantrip) => ({
      tag: "cantrip" as const,
      spellId: spellId(cantrip.spell.id),
      procedure: "heldLight" as const,
    })),
    Match.when({ procedure: "damageReduction" }, (cantrip) => ({
      tag: "cantrip" as const,
      spellId: spellId(cantrip.spell.id),
      procedure: "damageReduction" as const,
    })),
    Match.when({ procedure: "repeatedDamageAllocation" }, (slotSpell) => ({
      tag: "spellSlot" as const,
      spellId: spellId(slotSpell.spell.id),
      slotLevel: slotSpell.resource.slotLevel,
      procedure: "repeatedDamageAllocation" as const,
    })),
    Match.when({ procedure: "attackBurstSaveDamage" }, (slotSpell) => ({
      tag: "spellSlot" as const,
      spellId: spellId(slotSpell.spell.id),
      slotLevel: slotSpell.resource.slotLevel,
      procedure: "attackBurstSaveDamage" as const,
    })),
    Match.when({ procedure: "chainedSpellAttackDamage" }, (slotSpell) => ({
      tag: "spellSlot" as const,
      spellId: spellId(slotSpell.spell.id),
      slotLevel: slotSpell.resource.slotLevel,
      procedure: "chainedSpellAttackDamage" as const,
    })),
    Match.when({ procedure: "heldLightHurl" }, damageSpellInvocationRef),
    Match.when({ procedure: "spellAttackDamage" }, damageSpellInvocationRef),
    Match.when({ procedure: "saveGatedDamage" }, damageSpellInvocationRef),
    Match.when({ procedure: "saveGatedCondition" }, (conditionSpell) => ({
      tag: "spellSlot" as const,
      spellId: spellId(conditionSpell.spell.id),
      slotLevel: conditionSpell.resource.slotLevel,
      procedure: "saveGatedCondition" as const,
    })),
    Match.when(
      { procedure: "saveGatedAttackRollAdvantage" },
      (attackRollAdvantageSpell) => ({
        tag: "spellSlot" as const,
        spellId: spellId(attackRollAdvantageSpell.spell.id),
        slotLevel: attackRollAdvantageSpell.resource.slotLevel,
        procedure: "saveGatedAttackRollAdvantage" as const,
      }),
    ),
    Match.when({ procedure: "scalarBuff" }, (buffSpell) => ({
      tag: "spellSlot" as const,
      spellId: spellId(buffSpell.spell.id),
      slotLevel: buffSpell.resource.slotLevel,
      procedure: "scalarBuff" as const,
    })),
    Match.when({ procedure: "rollModifier" }, (modifierSpell) =>
      modifierSpell.resource.tag === "none"
        ? {
            tag: "cantrip" as const,
            spellId: spellId(modifierSpell.spell.id),
            procedure: "rollModifier" as const,
          }
        : {
            tag: "spellSlot" as const,
            spellId: spellId(modifierSpell.spell.id),
            slotLevel: modifierSpell.resource.slotLevel,
            procedure: "rollModifier" as const,
          },
    ),
    Match.when({ procedure: "creatureTypeProtection" }, (protectionSpell) => ({
      tag: "spellSlot" as const,
      spellId: spellId(protectionSpell.spell.id),
      slotLevel: protectionSpell.resource.slotLevel,
      procedure: "creatureTypeProtection" as const,
    })),
    Match.when(
      { procedure: "conditionImmunityAndTurnStartTemporaryHitPoints" },
      (heroism) => ({
        tag: "spellSlot" as const,
        spellId: spellId(heroism.spell.id),
        slotLevel: heroism.resource.slotLevel,
        procedure: "conditionImmunityAndTurnStartTemporaryHitPoints" as const,
      }),
    ),
    Match.when({ procedure: "weaponDamageRider" }, (riderSpell) => ({
      tag: "spellSlot" as const,
      spellId: spellId(riderSpell.spell.id),
      slotLevel: riderSpell.resource.slotLevel,
      procedure: "weaponDamageRider" as const,
    })),
    Match.when({ procedure: "markedDamageRider" }, (riderSpell) =>
      riderSpell.action === "transfer"
        ? spellEffectInvocationRef(
            riderSpell.spell.id,
            riderSpell.activeEffect.sourceCombatantId,
            "markedDamageRiderTransfer",
          )
        : riderSpell.resource.tag === "classFeatureFreeCast"
          ? classFeatureFreeCastSpellInvocationRef(
              riderSpell.spell.id,
              riderSpell.resource.resourceUnitId,
              "markedDamageRider",
            )
          : {
              tag: "spellSlot" as const,
              spellId: spellId(riderSpell.spell.id),
              slotLevel: riderSpell.resource.slotLevel,
              procedure: "markedDamageRider" as const,
            },
    ),
    Match.when({ procedure: "persistentArmorEffect" }, (persistent) =>
      persistent.resource.tag === "none"
        ? armorOfShadowsSpellInvocationRef(persistent.spell.id)
        : {
            tag: "spellSlot" as const,
            spellId: spellId(persistent.spell.id),
            slotLevel: persistent.resource.slotLevel,
            procedure: "persistentArmorEffect" as const,
          },
    ),
    Match.when({ procedure: "shieldReaction" }, (reactionSpell) => ({
      tag: "spellSlot" as const,
      spellId: spellId(reactionSpell.spell.id),
      slotLevel: reactionSpell.resource.slotLevel,
      procedure: "shieldReaction" as const,
    })),
    Match.when({ procedure: "directHitPointRestoration" }, (healing) => ({
      tag: "spellSlot" as const,
      spellId: spellId(healing.spell.id),
      slotLevel: healing.resource.slotLevel,
      procedure: "directHitPointRestoration" as const,
    })),
    Match.exhaustive,
  );
}

export function damageSpellInvocationRef(
  invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "heldLightHurl"
        | "spellAttackSequence"
        | "spellAttackDamage"
        | "saveGatedDamage";
    }
  >,
): SpellInvocationRef {
  if (
    invocation.procedure !== "heldLightHurl" &&
    isPreparedDamageSpellSource(invocation)
  ) {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: invocation.procedure,
    };
  }
  return {
    tag: "cantrip",
    spellId: spellId(invocation.spell.id),
    procedure: invocation.procedure,
  };
}

export function sameSpellInvocationRef(
  left: SpellInvocationRef,
  right: SpellInvocationRef,
): boolean {
  if (
    left.tag !== right.tag ||
    left.spellId !== right.spellId ||
    left.procedure !== right.procedure
  ) {
    return false;
  }
  if (left.tag === "cantrip" && right.tag === "cantrip") {
    return true;
  }
  if (left.tag === "spellEffect" && right.tag === "spellEffect") {
    return left.sourceCombatantId === right.sourceCombatantId;
  }
  if (
    left.tag === "classFeatureFreeCast" &&
    right.tag === "classFeatureFreeCast"
  ) {
    return left.resourceUnitId === right.resourceUnitId;
  }
  if (left.tag === "armorOfShadows" && right.tag === "armorOfShadows") {
    return true;
  }
  return left.tag === "spellSlot" && right.tag === "spellSlot"
    ? left.slotLevel === right.slotLevel
    : false;
}

export function supportedSpellInvocationMatchesRef(
  invocation: SupportedSpellInvocation,
  ref: SpellInvocationRef,
): boolean {
  return sameSpellInvocationRef(supportedSpellInvocationRef(invocation), ref);
}
