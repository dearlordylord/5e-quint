// UNIT-IDENTITY-REPLAY: FEATURE-568 ranger_hunters_lore doResolveMarkedDefenses
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay FEATURE-568 ranger_hunters_lore
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.MARKED_CREATURE_DISCLOSURE
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt table-caller.marked-creature-defenses
// RAW: .references/srd-5.2.1/classes.md:6813-6816; playing-the-game.md:1181-1197.
import { discloseMarkedCreatureDefenses } from "./marked-creature-defenses.ts";
import { markedDefenseEffectLifetime } from "./marked-creature-defenses.test-support.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.test-support.ts";
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.test-support.ts";
import { fighterId, skeletonId } from "./battle-runtime.test-support.ts";

function defenseProjection() {
  const { defended, expired } = markedDefenseEffectLifetime();
  const during = discloseMarkedCreatureDefenses({
    session: defended,
    actorId: fighterId,
    targetId: skeletonId,
  });
  const after = discloseMarkedCreatureDefenses({
    session: expired,
    actorId: fighterId,
    targetId: skeletonId,
  });
  if (during.kind !== "disclosed" || after.kind !== "disclosed")
    throw new Error("Expected own mark retained across prey defense expiry.");
  return {
    activeResistanceDisclosed: during.defenses.resistances.includes("fire"),
    expiredResistanceDisclosed: after.defenses.resistances.includes("fire"),
    activeConditionImmunityDisclosed:
      during.defenses.immunities.conditions.includes("charmed"),
    expiredConditionImmunityDisclosed:
      after.defenses.immunities.conditions.includes("charmed"),
    baseImmunitiesRetained:
      after.defenses.immunities.conditions.includes("poisoned") &&
      after.defenses.immunities.damageTypes.includes("poison"),
    baseVulnerabilityRetained:
      after.defenses.vulnerabilities.includes("bludgeoning"),
  };
}

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Marked creature current defenses selected identity",
  taskId: "FEATURE-568",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-marked-creature-defenses.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  projectionSchema: {
    activeResistanceDisclosed: "bool",
    expiredResistanceDisclosed: "bool",
    activeConditionImmunityDisclosed: "bool",
    expiredConditionImmunityDisclosed: "bool",
    baseImmunitiesRetained: "bool",
    baseVulnerabilityRetained: "bool",
  },
  initialProjection: {
    activeResistanceDisclosed: false,
    expiredResistanceDisclosed: false,
    activeConditionImmunityDisclosed: false,
    expiredConditionImmunityDisclosed: false,
    baseImmunitiesRetained: false,
    baseVulnerabilityRetained: false,
  },
  units: [
    {
      unitId: "ranger_hunters_lore",
      procedures: [
        { actionName: "doResolveMarkedDefenses", discover: defenseProjection },
      ],
    },
  ],
});
