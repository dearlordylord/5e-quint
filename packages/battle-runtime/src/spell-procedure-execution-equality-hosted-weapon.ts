import type { SpellHostedWeaponAttackSpellProcedureExecution } from "./character-execution.ts";
import { samePrimitiveSet } from "./mechanical-equality.ts";
import { sameSpellDamageFacts } from "./spell-mechanical-equality.ts";
import {
  sameSpellAccess,
  sameSpellResource,
  sameSpellRuleExecutionFacts,
} from "./spell-procedure-execution-equality.ts";

export function sameSpellHostedWeaponAttackExecution(
  left: SpellHostedWeaponAttackSpellProcedureExecution,
  right: SpellHostedWeaponAttackSpellProcedureExecution,
): boolean {
  const sameBonusDamage =
    left.bonusDamage === null || right.bonusDamage === null
      ? left.bonusDamage === right.bonusDamage
      : sameSpellDamageFacts(left.bonusDamage, right.bonusDamage);
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.componentWeaponObjectId === right.componentWeaponObjectId &&
    left.spellcastingAbilityModifier === right.spellcastingAbilityModifier &&
    left.attackBonus === right.attackBonus &&
    samePrimitiveSet(left.damageTypeChoices, right.damageTypeChoices) &&
    sameBonusDamage
  );
}
