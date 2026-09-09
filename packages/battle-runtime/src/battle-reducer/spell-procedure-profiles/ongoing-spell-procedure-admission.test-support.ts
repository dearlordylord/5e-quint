import { type BattleCreatureState } from "../../battle-state-execution.ts";
import { spellBattle } from "../../unit-profile-admission-spell-battle.test-support.ts";
import { spellCasterId } from "../../unit-profile-admission-catalog.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import type { SpellAdmissionActor } from "./profile.ts";
import type { SpellMechanicsAdmissionSource } from "./spell-mechanics-admission.ts";
import { markedDamageRiderProfile } from "./marked-damage-rider.ts";
import { spatialMeleeSpellAttackProxyProfile } from "./spatial-melee-spell-attack-proxy.ts";
import { spellAttackSequenceProfile } from "./spell-attack-sequence.ts";
import { spellHostedWeaponAttackProfile } from "./spell-hosted-weapon-attack.ts";
import { weaponAttackDamageEnhancementProfile } from "./weapon-attack-enhancement.ts";

export function mechanicsSource(
  spell: ReturnType<typeof spellRecord>,
): SpellMechanicsAdmissionSource {
  const source = spellAdmissionSource(spell);
  return {
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
}

export function mechanicsSourceWithBaseDefinitionFacts(
  base: ReturnType<typeof spellRecord>,
  mechanics: ReturnType<typeof spellRecord>["mechanics"],
): SpellMechanicsAdmissionSource {
  const source = spellAdmissionSource(base);
  return {
    mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
}

export function renamedSpell(
  spell: ReturnType<typeof spellRecord>,
  suffix: string,
): ReturnType<typeof spellRecord> {
  return decodeSpellRecordForTest({
    ...spell,
    id: `synthetic_ongoing_${suffix}`,
    name: `Synthetic Ongoing Procedure ${suffix}`,
    provenance: {
      kind: "synthetic-test",
      section: `synthetic_ongoing_${suffix}`,
    },
  });
}

export function spellAdmissionActor(): SpellAdmissionActor {
  const actor = spellBattle({ preparedSpells: [] }).state.combatants.get(
    spellCasterId,
  );
  if (!isSpellAdmissionActor(actor)) {
    throw new Error("Expected a spellcasting character fixture.");
  }
  return actor;
}

export function isSpellAdmissionActor(
  actor: BattleCreatureState | undefined,
): actor is SpellAdmissionActor {
  return (
    actor?.origin.kind === "character" &&
    actor.origin.spellcasting?.canCastSpells === true
  );
}

export const ONGOING_PROCEDURE_PROFILES = [
  { profile: markedDamageRiderProfile, spellId: "hunters_mark" },
  { profile: markedDamageRiderProfile, spellId: "hex" },
  {
    profile: spatialMeleeSpellAttackProxyProfile,
    spellId: "spiritual_weapon",
  },
  { profile: spellAttackSequenceProfile, spellId: "scorching_ray" },
  { profile: spellAttackSequenceProfile, spellId: "eldritch_blast" },
  { profile: spellHostedWeaponAttackProfile, spellId: "true_strike" },
  {
    profile: weaponAttackDamageEnhancementProfile,
    spellId: "magic_weapon",
  },
] as const;

export function issuesOf(result: {
  readonly tag: string;
  readonly issues?: readonly {
    readonly failedFact: string;
    readonly mechanicsPath: unknown;
  }[];
}) {
  return result.tag === "unsupported"
    ? (result.issues ?? []).map(({ failedFact, mechanicsPath }) => ({
        failedFact,
        mechanicsPath,
      }))
    : [];
}

export function mechanicsSourceFromSource(
  source: ReturnType<typeof spellAdmissionSource>,
): SpellMechanicsAdmissionSource {
  return {
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
}
